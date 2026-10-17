import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService, MusterRollItem, Contractor } from '../hrms.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface ProjectOption {
  id: number;
  project_name: string;
  project_code: string;
}

@Component({
  selector: 'app-muster-roll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './muster-roll.component.html'
})
export class MusterRollComponent implements OnInit {
  hrmsService = inject(HrmsService);
  private http = inject(HttpClient);

  selectedProjectId = signal<number>(1);
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  projects = signal<ProjectOption[]>([]);

  // Batch Entry Rows for Today's Muster Roll
  batchRows = signal<Array<{
    contractor_id: number;
    skill_type: string;
    headcount: number;
    standard_hours: number;
    overtime_hours: number;
    hourly_rate: number;
    overtime_rate: number;
    remarks: string;
  }>>([
    { contractor_id: 1, skill_type: 'ROD_BINDER', headcount: 15, standard_hours: 8, overtime_hours: 2, hourly_rate: 100, overtime_rate: 150, remarks: 'Tower A 5th floor beam fabrication' },
    { contractor_id: 2, skill_type: 'CARPENTER', headcount: 12, standard_hours: 8, overtime_hours: 1.5, hourly_rate: 110, overtime_rate: 165, remarks: 'Column shuttering and propping' },
    { contractor_id: 3, skill_type: 'MASON', headcount: 8, standard_hours: 8, overtime_hours: 0, hourly_rate: 100, overtime_rate: 150, remarks: 'Basement brickwork' },
    { contractor_id: 1, skill_type: 'HELPER', headcount: 20, standard_hours: 8, overtime_hours: 2, hourly_rate: 75, overtime_rate: 110, remarks: 'Concrete handling & rebar shifting' }
  ]);

  isSubmitting = signal<boolean>(false);
  successMessage = signal<string>('');

  // Computed summary metrics
  totalHeadcount = computed(() => {
    return this.batchRows().reduce((sum, r) => sum + Number(r.headcount || 0), 0);
  });

  totalStandardCost = computed(() => {
    return this.batchRows().reduce((sum, r) => sum + (Number(r.headcount || 0) * Number(r.standard_hours || 0) * Number(r.hourly_rate || 0)), 0);
  });

  totalOvertimeCost = computed(() => {
    return this.batchRows().reduce((sum, r) => sum + (Number(r.headcount || 0) * Number(r.overtime_hours || 0) * Number(r.overtime_rate || 0)), 0);
  });

  totalDailyWage = computed(() => {
    return this.totalStandardCost() + this.totalOvertimeCost();
  });

  ngOnInit() {
    this.loadProjects();
    this.hrmsService.loadContractors().subscribe((cons) => {
      if (cons.length > 0) {
        // assign valid contractor ids
        this.batchRows.update(rows => rows.map(r => ({ ...r, contractor_id: cons[0].id })));
      }
    });
    this.refreshHistory();
  }

  loadProjects() {
    this.http.get<any[]>(`${environment.apiUrl}/projects/`).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.projects.set(res.map(p => ({ id: p.id, project_name: p.project_name, project_code: p.project_code })));
          this.selectedProjectId.set(res[0].id);
          this.refreshHistory();
        }
      },
      error: () => {
        // Fallback demo projects
        this.projects.set([
          { id: 1, project_name: 'Bay Twin Towers', project_code: 'PRJ-BAY-01' },
          { id: 2, project_name: 'Gulshan Lake Heights', project_code: 'PRJ-GLS-02' }
        ]);
      }
    });
  }

  refreshHistory() {
    this.hrmsService.loadMusterRoll(this.selectedProjectId(), this.selectedDate()).subscribe();
  }

  addRow() {
    const cons = this.hrmsService.contractors();
    const conId = cons.length > 0 ? cons[0].id : 1;
    this.batchRows.update(rows => [
      ...rows,
      { contractor_id: conId, skill_type: 'HELPER', headcount: 5, standard_hours: 8, overtime_hours: 0, hourly_rate: 80, overtime_rate: 120, remarks: '' }
    ]);
  }

  removeRow(index: number) {
    this.batchRows.update(rows => rows.filter((_, i) => i !== index));
  }

  getRowTotal(row: any): number {
    const base = Number(row.headcount || 0) * Number(row.standard_hours || 0) * Number(row.hourly_rate || 0);
    const ot = Number(row.headcount || 0) * Number(row.overtime_hours || 0) * Number(row.overtime_rate || 0);
    return base + ot;
  }

  submitMusterRoll() {
    const rows = this.batchRows();
    if (rows.length === 0) return;

    this.isSubmitting.set(true);
    this.successMessage.set('');

    const items: MusterRollItem[] = rows.map(r => ({
      project_id: this.selectedProjectId(),
      contractor_id: r.contractor_id,
      muster_date: this.selectedDate(),
      shift: 'DAY',
      skill_type: r.skill_type,
      headcount: Number(r.headcount),
      standard_hours: Number(r.standard_hours),
      overtime_hours: Number(r.overtime_hours),
      hourly_rate: Number(r.hourly_rate),
      overtime_rate: Number(r.overtime_rate),
      remarks: r.remarks
    }));

    this.hrmsService.createMusterBatch(items).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(`Successfully recorded ${res.records_created} muster roll labor allocations (Total: BDT ${this.totalDailyWage().toLocaleString()})!`);
        this.refreshHistory();
        this.hrmsService.loadStats().subscribe();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || 'Failed to submit muster roll.');
      }
    });
  }
}
