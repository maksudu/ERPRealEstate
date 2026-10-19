import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CWIPAllocationService } from '../../../../core/services/cwip-allocation.service';
import { ProjectService } from '../../../../core/services/project.service';
import {
  CWIPMaterialIssue,
  CWIPMaterialIssueCreatePayload
} from '../../../../core/models/cwip-allocation.model';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { StatusBadgeComponent, StatusVariant } from '../../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-cwip-material-issues',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    StatusBadgeComponent,
    SearchableSelectComponent
  ],
  templateUrl: './cwip-material-issues.component.html'
})
export class CWIPMaterialIssuesComponent implements OnInit {
  private cwipService = inject(CWIPAllocationService);
  private projectService = inject(ProjectService);

  issues: CWIPMaterialIssue[] = [];
  loading: boolean = false;
  total: number = 0;
  limit: number = 10;
  offset: number = 0;
  searchTerm: string = '';
  selectedProjectId: number | null = null;

  projectOptions: SelectOption[] = [];
  towerOptions: SelectOption[] = [];

  // KPI aggregates
  totalCostIssued: number = 0;
  totalIssuesCount: number = 0;

  // New Issue Modal
  showCreateModal: boolean = false;
  submittingIssue: boolean = false;
  modalError: string | null = null;
  modalSuccess: string | null = null;

  newIssue: CWIPMaterialIssueCreatePayload = {
    issue_ref: `MAT-ISS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    issue_date: new Date().toISOString().substring(0, 10),
    project_id: 1,
    project_name: '',
    tower_id: null,
    tower_name: '',
    work_package: 'Superstructure Civil Works',
    material_code: 'MAT-REBAR-16MM',
    material_name: 'BSRM 500W Deformed Steel Bar (16mm)',
    quantity: 15,
    unit_of_measure: 'Ton',
    unit_cost: 98000,
    total_cost: 1470000,
    inventory_account_id: 1150,
    cwip_account_id: 1220,
    requisition_ref: 'MR-2026-042',
    issued_by: 'Engr. Mahfuzul Alam (Site Store)',
    received_by: 'Md. Tareq (Foreman)',
    notes: 'Section 12.3 Material issue to construction work package. Transferred from inventory to CWIP asset.'
  };

  ngOnInit(): void {
    this.loadProjects();
    this.loadIssues();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projectOptions = (projects || []).map(p => ({
          value: p.id,
          label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
        }));
      },
      error: (err) => console.error('Failed to load projects:', err)
    });
  }

  loadIssues(): void {
    this.loading = true;
    this.cwipService.getMaterialIssues({
      search: this.searchTerm || undefined,
      project_id: this.selectedProjectId || undefined,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.issues = res.items || [];
        this.total = res.total;
        this.totalIssuesCount = res.total;
        this.totalCostIssued = this.issues.reduce((acc, curr) => acc + Number(curr.total_cost || 0), 0);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load material issues:', err);
        this.loading = false;
      }
    });
  }

  onProjectFilterChange(projectId: any): void {
    this.selectedProjectId = projectId ? Number(projectId) : null;
    this.offset = 0;
    this.loadIssues();
  }

  onSearch(): void {
    this.offset = 0;
    this.loadIssues();
  }

  openCreateModal(): void {
    this.newIssue = {
      issue_ref: `MAT-ISS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      issue_date: new Date().toISOString().substring(0, 10),
      project_id: this.projectOptions[0]?.value || 1,
      project_name: '',
      tower_id: null,
      tower_name: '',
      work_package: 'Superstructure Civil Works',
      material_code: 'MAT-REBAR-16MM',
      material_name: 'BSRM 500W Deformed Steel Bar (16mm)',
      quantity: 10,
      unit_of_measure: 'Ton',
      unit_cost: 98000,
      total_cost: 980000,
      inventory_account_id: 1150,
      cwip_account_id: 1220,
      requisition_ref: `MR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      issued_by: 'Central Store In-Charge',
      received_by: 'Site Civil Engineer',
      notes: 'Transfer from Raw Material Inventory to Construction CWIP.'
    };
    this.modalError = null;
    this.modalSuccess = null;
    this.onModalProjectChange(this.newIssue.project_id);
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  onModalProjectChange(projectId: any): void {
    const pId = Number(projectId);
    this.newIssue.project_id = pId;
    this.towerOptions = [];
    this.newIssue.tower_id = null;

    if (!pId) return;

    this.projectService.getTowers(pId).subscribe({
      next: (towers) => {
        this.towerOptions = (towers || []).map(t => ({
          value: t.id,
          label: `${t.tower_name} (${(t.residential_floors || 0) + (t.commercial_floors || 0)} Floors)`
        }));
      },
      error: (err) => console.error('Failed to load towers:', err)
    });
  }

  calculateTotalCost(): void {
    const qty = Number(this.newIssue.quantity || 0);
    const cost = Number(this.newIssue.unit_cost || 0);
    this.newIssue.total_cost = Math.round(qty * cost);
  }

  submitMaterialIssue(): void {
    this.modalError = null;
    this.modalSuccess = null;

    if (!this.newIssue.project_id) {
      this.modalError = 'Please select receiving project.';
      return;
    }
    if (!this.newIssue.material_name || !this.newIssue.quantity || this.newIssue.quantity <= 0) {
      this.modalError = 'Valid material name and quantity are required.';
      return;
    }
    if (!this.newIssue.total_cost || this.newIssue.total_cost <= 0) {
      this.modalError = 'Total cost must be greater than zero ৳.';
      return;
    }

    this.submittingIssue = true;
    this.cwipService.createMaterialIssue(this.newIssue).subscribe({
      next: (res) => {
        this.submittingIssue = false;
        this.modalSuccess = `Material issue #${res.issue_ref} recorded with GL Voucher #${res.gl_voucher_id || 'AUTO'}!`;
        setTimeout(() => {
          this.closeCreateModal();
          this.loadIssues();
        }, 1200);
      },
      error: (err) => {
        this.submittingIssue = false;
        this.modalError = err?.error?.detail || 'Failed to record material issue.';
      }
    });
  }

  getStatusVariant(status: string): StatusVariant {
    switch (status) {
      case 'ISSUED':
      case 'POSTED':
        return 'success';
      case 'TRANSFERRED_TO_COGS':
        return 'luxury';
      case 'RETURNED':
        return 'warning';
      default:
        return 'info';
    }
  }

  // Pagination helpers
  get totalPages(): number {
    return Math.ceil(this.total / this.limit) || 1;
  }

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadIssues();
    }
  }

  nextPage(): void {
    if (this.offset + this.limit < this.total) {
      this.offset += this.limit;
      this.loadIssues();
    }
  }

  onLimitChange(limit: number): void {
    this.limit = Number(limit);
    this.offset = 0;
    this.loadIssues();
  }
}
