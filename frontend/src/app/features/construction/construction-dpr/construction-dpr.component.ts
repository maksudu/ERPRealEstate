import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { DPRReport, Subcontractor, ConstructionMetrics } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-dpr',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './construction-dpr.component.html'
})
export class ConstructionDprComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  dprReports = signal<DPRReport[]>([]);
  projects = signal<Project[]>([]);
  contractors = signal<Subcontractor[]>([]);
  metrics = signal<ConstructionMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);

  dprForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    report_date: [new Date().toISOString().split('T')[0], Validators.required],
    weather_condition_id: ['SUNNY', Validators.required],
    structural_activity_summary: ['', Validators.required],
    concrete_casting_cft: [0, [Validators.min(0)]],
    steel_rod_consumed_mt: [0, [Validators.min(0)]],
    cement_consumed_bags: [0, [Validators.min(0)]],
    labor_entries: this.fb.array([])
  });

  weatherOptions = [
    { value: 'SUNNY', label: '☀️ Sunny / Fair Weather' },
    { value: 'OVERCAST', label: '⛅ Overcast / Cloudy' },
    { value: 'RAIN_LIGHT', label: '🌦️ Light Intermittent Rain' },
    { value: 'RAIN_HEAVY', label: '⛈️ Heavy Downpour / Work Stopped' }
  ];

  tradeCategoryOptions = [
    { value: 'Rod-binder', label: 'Rod-binder (রড মিস্ত্রি)' },
    { value: 'Mason', label: 'Mason (রাজমিস্ত্রি)' },
    { value: 'Carpenter', label: 'Shuttering Carpenter (কাঠ মিস্ত্রি)' },
    { value: 'Plumber', label: 'Plumber (প্লাম্বার)' },
    { value: 'Electrician', label: 'Electrician (ইলেকট্রিশিয়ান)' },
    { value: 'Helper', label: 'Helper (লেবার / জোগালী)' }
  ];

  ngOnInit(): void {
    this.loadData();
    this.loadDropdowns();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.constructionService.getDPRReports().subscribe({
      next: (res) => {
        this.dprReports.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.constructionService.getMetrics().subscribe(m => this.metrics.set(m));
  }

  loadDropdowns(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p));
    this.constructionService.getContractors().subscribe(c => this.contractors.set(c));
  }

  get projectOptions() {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }));
  }

  get contractorOptions() {
    return this.contractors().map(c => ({
      value: c.id,
      label: `${c.company_name} (${c.trade_specialization})`
    }));
  }

  get laborArray(): FormArray {
    return this.dprForm.get('labor_entries') as FormArray;
  }

  addLaborRow(): void {
    const row = this.fb.group({
      contractor_id: [this.contractors()[0]?.id || null],
      trade_category: ['Rod-binder', Validators.required],
      worker_count: [10, [Validators.required, Validators.min(1)]],
      daily_wage_rate: [900, [Validators.required, Validators.min(100)]]
    });
    this.laborArray.push(row);
  }

  removeLaborRow(index: number): void {
    this.laborArray.removeAt(index);
  }

  openCreateModal(): void {
    this.dprForm.reset({
      project_id: this.projects()[0]?.id || null,
      report_date: new Date().toISOString().split('T')[0],
      weather_condition_id: 'SUNNY',
      structural_activity_summary: '',
      concrete_casting_cft: 0,
      steel_rod_consumed_mt: 0,
      cement_consumed_bags: 0
    });
    this.laborArray.clear();
    // Default 1 labor muster line
    this.addLaborRow();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitDPR(): void {
    if (this.dprForm.invalid) return;
    this.isSubmitting.set(true);
    this.constructionService.createDPRReport(this.dprForm.value).subscribe({
      next: (created) => {
        this.dprReports.update(list => [created, ...list]);
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadData();
      },
      error: (err) => {
        alert(err?.error?.detail || 'DPR logging failed');
        this.isSubmitting.set(false);
      }
    });
  }
}
