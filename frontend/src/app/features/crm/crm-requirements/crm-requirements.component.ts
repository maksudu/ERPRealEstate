import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService, RequirementFilters } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { CustomerRequirement, InventoryAlert } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-crm-requirements',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './crm-requirements.component.html'
})
export class CrmRequirementsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // Dynamic Lookup Category Codes (Spec 4.6 & Rule 1)
  readonly LOOKUP = {
    propertyType: 'CRM_PROPERTY_TYPE',
    preferredFloor: 'CRM_PREFERRED_FLOOR',
    facing: 'CRM_FACING',
    purchaseTimeline: 'CRM_PURCHASE_TIMELINE',
    paymentPreference: 'CRM_PAYMENT_PREFERENCE',
    requirementStatus: 'CRM_REQUIREMENT_STATUS',
    rejectionReason: 'CRM_REJECTION_REASON'
  };

  // State Signals
  requirements = this.crmService.requirementsTable;
  total = this.crmService.requirementsTotal;
  limit = this.crmService.requirementsLimit;
  offset = this.crmService.requirementsOffset;
  isLoading = this.crmService.isLoadingRequirements;

  // Projects & Sales Reps options
  projects = signal<Project[]>([]);
  salesReps = signal<{ id: number; full_name_en: string }[]>([]);

  // Delete modal state
  deleteModalOpen = signal(false);
  deleteTarget = signal<CustomerRequirement | null>(null);
  isDeleting = signal(false);

  // Inventory Alerts modal state
  alertsModalOpen = signal(false);
  alerts = signal<InventoryAlert[]>([]);
  isLoadingAlerts = signal(false);
  unreadAlertsCount = computed(() => this.alerts().filter(a => !a.is_read).length);

  // Filter Form
  filterForm: FormGroup = this.fb.group({
    search: [''],
    project_id: ['ALL'],
    property_type: ['ALL'],
    status: ['ALL'],
    sales_rep_id: ['ALL'],
    sort_by: ['created_at_desc']
  });

  // Computed Pagination Metrics
  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
  fromRow = computed(() => (this.total() === 0 ? 0 : this.offset() + 1));
  toRow = computed(() => Math.min(this.offset() + this.limit(), this.total()));

  // Status Metrics Ribbon
  activeCount = computed(() => this.requirements().filter(r => r.status === 'ACTIVE').length);
  matchedCount = computed(() => this.requirements().filter(r => r.status === 'MATCHED').length);
  fulfilledCount = computed(() => this.requirements().filter(r => r.status === 'FULFILLED').length);
  onHoldCount = computed(() => this.requirements().filter(r => r.status === 'ON_HOLD').length);

  projectOptions = computed(() => [
    { value: 'ALL', label: 'All Projects' },
    ...this.projects().map(p => ({ value: String(p.id), label: p.project_name }))
  ]);

  salesRepOptions = computed(() => [
    { value: 'ALL', label: 'All Sales Reps' },
    ...this.salesReps().map(s => ({ value: String(s.id), label: s.full_name_en }))
  ]);

  readonly sortOptions = [
    { value: 'created_at_desc', label: 'Newest First' },
    { value: 'created_at_asc', label: 'Oldest First' },
    { value: 'budget_desc', label: 'Highest Budget' },
    { value: 'budget_asc', label: 'Lowest Budget' }
  ];

  ngOnInit(): void {
    this.loadProjects();
    this.loadSalesReps();
    this.loadAlerts();
    this.loadData();

    // Auto-search on filter changes
    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.offset.set(0);
      this.loadData();
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs || []),
      error: () => this.projects.set([])
    });
  }

  loadSalesReps(): void {
    this.crmService.getSalesReps().subscribe({
      next: (reps) => this.salesReps.set(reps || []),
      error: () => this.salesReps.set([])
    });
  }

  loadAlerts(): void {
    this.isLoadingAlerts.set(true);
    this.crmService.getInventoryAlerts(undefined, 50, 0).subscribe({
      next: (items) => {
        this.alerts.set(items || []);
        this.isLoadingAlerts.set(false);
      },
      error: () => this.isLoadingAlerts.set(false)
    });
  }

  private buildFilters(): RequirementFilters {
    const v = this.filterForm.value;
    return {
      search: v.search || undefined,
      project_id: v.project_id && v.project_id !== 'ALL' ? Number(v.project_id) : undefined,
      property_type: v.property_type && v.property_type !== 'ALL' ? v.property_type : undefined,
      status: v.status && v.status !== 'ALL' ? v.status : undefined,
      sales_rep_id: v.sales_rep_id && v.sales_rep_id !== 'ALL' ? Number(v.sales_rep_id) : undefined,
      sort_by: v.sort_by || 'created_at_desc',
      limit: this.limit(),
      offset: this.offset()
    };
  }

  loadData(): void {
    this.crmService.loadRequirements(this.buildFilters()).subscribe();
  }

  refresh(): void {
    this.loadAlerts();
    this.loadData();
  }

  setPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.offset.set((clamped - 1) * this.limit());
    this.loadData();
  }

  quickFilterStatus(status: string): void {
    const current = this.filterForm.get('status')?.value;
    this.filterForm.patchValue({
      status: current === status ? 'ALL' : status
    });
  }

  // Navigation
  goToCreate(): void {
    this.router.navigate(['/crm/requirements/new']);
  }

  goToDetail(id: number): void {
    this.router.navigate(['/crm/requirements', id]);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/crm/requirements', id, 'edit']);
  }

  // Delete modal
  confirmDelete(req: CustomerRequirement): void {
    this.deleteTarget.set(req);
    this.deleteModalOpen.set(true);
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.isDeleting.set(true);
    this.crmService.deleteRequirement(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.deleteModalOpen.set(false);
        this.deleteTarget.set(null);
        this.loadData();
      },
      error: () => {
        this.isDeleting.set(false);
      }
    });
  }

  // Alerts
  openAlertsModal(): void {
    this.alertsModalOpen.set(true);
  }

  markAlertRead(alert: InventoryAlert): void {
    if (alert.is_read) return;
    this.crmService.markAlertRead(alert.id).subscribe({
      next: () => {
        alert.is_read = true;
        this.alerts.set([...this.alerts()]);
      }
    });
  }

  formatBdt(val: number | null | undefined): string {
    if (val === null || val === undefined) return '—';
    if (val >= 10000000) {
      return `৳${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `৳${(val / 100000).toFixed(2)} Lakh`;
    }
    return `৳${val.toLocaleString('en-US')}`;
  }
}
