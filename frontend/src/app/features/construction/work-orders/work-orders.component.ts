import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import {
  WorkOrder,
  WorkOrderItem,
  WorkOrderMilestone,
  WorkOrderMetrics,
  WorkOrderFilter,
  Subcontractor
} from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-work-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './work-orders.component.html'
})
export class WorkOrdersComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Tab State
  currentTab = signal<'ORDERS' | 'BOQ_ITEMS' | 'MILESTONES' | 'STATUTORY'>('ORDERS');

  // Loading & State
  isLoading = signal<boolean>(false);
  workOrders = signal<WorkOrder[]>([]);
  totalOrders = signal<number>(0);
  metrics = signal<WorkOrderMetrics | null>(null);

  // Filter options
  projectOptions = signal<SelectOption[]>([]);
  contractorOptions = signal<SelectOption[]>([]);

  // Filter criteria
  selectedProjectId = signal<number | undefined>(undefined);
  selectedContractorId = signal<number | undefined>(undefined);
  selectedContractType = signal<string>('');
  selectedApprovalStatus = signal<string>('');
  selectedStatus = signal<string>('');
  searchQuery = signal<string>('');

  // Server Pagination
  limit = signal<number>(10);
  offset = signal<number>(0);

  // Detail Modal / Slide-over
  selectedOrderForDetail = signal<WorkOrder | null>(null);
  showDetailModal = signal<boolean>(false);

  // Milestone Add Modal
  showMilestoneModal = signal<boolean>(false);
  targetOrderForMilestone = signal<WorkOrder | null>(null);
  newMilestone: Partial<WorkOrderMilestone> = {
    milestone_code: '',
    milestone_title: '',
    target_date: '',
    weightage_percent: 10,
    milestone_amount: 0,
    is_critical: false,
    status: 'PENDING',
    verification_notes: ''
  };

  // Delete Confirmation Modal
  showDeleteModal = signal<boolean>(false);
  orderToDelete = signal<WorkOrder | null>(null);
  deleteErrorMessage = signal<string>('');

  contractTypeOptions: SelectOption[] = [
    { value: '', label: 'All Trade Types' },
    { value: 'CIVIL_SUPERSTRUCTURE', label: 'Civil Superstructure' },
    { value: 'SHUTTERING_CARPENTRY', label: 'Shuttering & Carpentry' },
    { value: 'ROD_BINDING_STEEL', label: 'Rod Binding & Rebar' },
    { value: 'PLUMBING_SANITARY', label: 'Sanitary & Plumbing' },
    { value: 'ELECTRICAL_CONDUITING', label: 'Electrical Wiring' },
    { value: 'MASONRY_PLASTER', label: 'Brick Masonry & Plaster' },
    { value: 'TILES_MARBLE', label: 'Tiles & Marble' }
  ];

  approvalStatusOptions: SelectOption[] = [
    { value: '', label: 'All Approval Statuses' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'EXCEEDS_DELEGATED_LIMIT', label: 'Exceeds Delegated Limit' },
    { value: 'REJECTED', label: 'Rejected' }
  ];

  statusOptions: SelectOption[] = [
    { value: '', label: 'All Lifecycle Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SUBSTANTIALLY_COMPLETED', label: 'Substantially Completed' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'TERMINATED', label: 'Terminated' }
  ];

  ngOnInit(): void {
    this.loadFiltersData();
    this.loadMetrics();
    this.loadWorkOrders();
  }

  loadFiltersData(): void {
    this.projectService.getProjects().subscribe({
      next: (projects: Project[]) => {
        const opts: SelectOption[] = [
          { value: undefined, label: 'All Construction Projects' },
          ...(projects || []).map((p: Project) => ({
            value: p.id,
            label: `${p.project_name} (${p.project_code || 'PRJ'})`
          }))
        ];
        this.projectOptions.set(opts);
      },
      error: () => {}
    });

    this.constructionService.getContractors({ limit: 100 }).subscribe({
      next: (contractors: Subcontractor[]) => {
        const opts: SelectOption[] = [
          { value: undefined, label: 'All Contractors' },
          ...(contractors || []).map(c => ({
            value: c.id,
            label: `${c.company_name} [${c.contractor_code}]`
          }))
        ];
        this.contractorOptions.set(opts);
      },
      error: () => {}
    });
  }

  loadMetrics(): void {
    const pId = this.selectedProjectId() || 0;
    this.constructionService.getWorkOrderMetrics(pId).subscribe({
      next: (m: WorkOrderMetrics) => {
        this.metrics.set(m);
      },
      error: () => {}
    });
  }

  loadWorkOrders(): void {
    this.isLoading.set(true);
    const filter: WorkOrderFilter = {
      project_id: this.selectedProjectId(),
      contractor_id: this.selectedContractorId(),
      contract_type: this.selectedContractType() || undefined,
      approval_status: this.selectedApprovalStatus() || undefined,
      status: this.selectedStatus() || undefined,
      search: this.searchQuery() || undefined,
      limit: this.limit(),
      offset: this.offset()
    };

    this.constructionService.getWorkOrdersPaged(filter).subscribe({
      next: (res) => {
        this.workOrders.set(res.items || []);
        this.totalOrders.set(res.total || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.offset.set(0);
    this.loadWorkOrders();
  }

  onProjectFilterChange(pId: any): void {
    this.selectedProjectId.set(pId === '' || pId === null ? undefined : Number(pId));
    this.offset.set(0);
    this.loadMetrics();
    this.loadWorkOrders();
  }

  onContractorFilterChange(cId: any): void {
    this.selectedContractorId.set(cId === '' || cId === null ? undefined : Number(cId));
    this.offset.set(0);
    this.loadWorkOrders();
  }

  onContractTypeFilterChange(type: any): void {
    this.selectedContractType.set(type || '');
    this.offset.set(0);
    this.loadWorkOrders();
  }

  onApprovalStatusFilterChange(status: any): void {
    this.selectedApprovalStatus.set(status || '');
    this.offset.set(0);
    this.loadWorkOrders();
  }

  onStatusFilterChange(status: any): void {
    this.selectedStatus.set(status || '');
    this.offset.set(0);
    this.loadWorkOrders();
  }

  setTab(tab: 'ORDERS' | 'BOQ_ITEMS' | 'MILESTONES' | 'STATUTORY'): void {
    this.currentTab.set(tab);
  }

  prevPage(): void {
    if (this.offset() >= this.limit()) {
      this.offset.set(this.offset() - this.limit());
      this.loadWorkOrders();
    }
  }

  totalPages(): number {
    return Math.ceil(this.totalOrders() / this.limit()) || 1;
  }

  nextPage(): void {
    if (this.offset() + this.limit() < this.totalOrders()) {
      this.offset.set(this.offset() + this.limit());
      this.loadWorkOrders();
    }
  }

  viewOrderDetail(order: WorkOrder): void {
    this.selectedOrderForDetail.set(order);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedOrderForDetail.set(null);
  }

  openMilestoneModal(order: WorkOrder): void {
    this.targetOrderForMilestone.set(order);
    const code = `MS-0${(order.milestones?.length || 0) + 1}`;
    this.newMilestone = {
      milestone_code: code,
      milestone_title: '',
      target_date: '',
      weightage_percent: 10,
      milestone_amount: 0,
      is_critical: false,
      status: 'PENDING',
      verification_notes: ''
    };
    this.showMilestoneModal.set(true);
  }

  closeMilestoneModal(): void {
    this.showMilestoneModal.set(false);
    this.targetOrderForMilestone.set(null);
  }

  saveMilestone(): void {
    const order = this.targetOrderForMilestone();
    if (!order || !order.id || !this.newMilestone.milestone_title || !this.newMilestone.target_date) {
      return;
    }

    this.constructionService.addWorkOrderMilestone(order.id, this.newMilestone).subscribe({
      next: () => {
        this.closeMilestoneModal();
        this.loadWorkOrders();
      },
      error: () => {}
    });
  }

  confirmDelete(order: WorkOrder): void {
    this.orderToDelete.set(order);
    this.deleteErrorMessage.set('');
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.orderToDelete.set(null);
    this.deleteErrorMessage.set('');
  }

  executeDelete(): void {
    const order = this.orderToDelete();
    if (!order || !order.id) return;

    this.constructionService.deleteWorkOrder(order.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadMetrics();
        this.loadWorkOrders();
      },
      error: (err) => {
        const msg = err.error?.detail || 'Failed to delete work order';
        this.deleteErrorMessage.set(msg);
      }
    });
  }

  // Flattened BOQ line items across all loaded work orders
  allLoadedItems(): { order: WorkOrder; item: WorkOrderItem }[] {
    const res: { order: WorkOrder; item: WorkOrderItem }[] = [];
    for (const wo of this.workOrders()) {
      if (wo.items) {
        for (const itm of wo.items) {
          res.push({ order: wo, item: itm });
        }
      }
    }
    return res;
  }

  // Flattened Milestones across all loaded work orders
  allLoadedMilestones(): { order: WorkOrder; milestone: WorkOrderMilestone }[] {
    const res: { order: WorkOrder; milestone: WorkOrderMilestone }[] = [];
    for (const wo of this.workOrders()) {
      if (wo.milestones) {
        for (const ms of wo.milestones) {
          res.push({ order: wo, milestone: ms });
        }
      }
    }
    return res;
  }
}
