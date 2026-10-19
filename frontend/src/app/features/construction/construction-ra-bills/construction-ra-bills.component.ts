import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  RABill,
  RABillMetrics,
  RABillFilter,
  RABillWorkflowActionPayload,
  WorkOrder
} from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-ra-bills',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent
  ],
  templateUrl: './construction-ra-bills.component.html'
})
export class ConstructionRaBillsComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private lookupService = inject(LookupService);
  private router = inject(Router);

  // Active Sub-Tab
  currentTab = signal<'BILLS' | 'MEASUREMENTS' | 'WORKFLOW_CHAIN' | 'LEDGER_RETENTION'>('BILLS');

  // Server-Paged Data State
  raBills = signal<RABill[]>([]);
  metrics = signal<RABillMetrics | null>(null);
  projects = signal<Project[]>([]);
  workOrders = signal<WorkOrder[]>([]);
  isLoading = signal<boolean>(false);

  // Filters State
  searchQuery = signal<string>('');
  selectedProjectId = signal<number | null>(null);
  selectedWorkOrderId = signal<number | null>(null);
  selectedWorkflowStage = signal<string>('');
  selectedPaymentStatus = signal<string>('');
  onlyOnHold = signal<boolean>(false);

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  // Selected Bill for Details Slide-over
  selectedBill = signal<RABill | null>(null);
  isDetailModalOpen = signal<boolean>(false);

  // Workflow Action Modal State
  isWorkflowModalOpen = signal<boolean>(false);
  workflowBill = signal<RABill | null>(null);
  workflowAction = signal<string>('VERIFY_ON_SITE');
  workflowActorName = signal<string>('Site Eng. M. Rahman');
  workflowActorRole = signal<string>('SITE_ENGINEER');
  workflowComments = signal<string>('');
  paymentDate = signal<string>(new Date().toISOString().split('T')[0]);
  paymentMethod = signal<string>('BANK_TRANSFER');
  bankPaymentRef = signal<string>('');
  chequeReference = signal<string>('');
  paidAmount = signal<number>(0);
  isExecutingAction = signal<boolean>(false);

  // Delete Modal State
  isDeleteModalOpen = signal<boolean>(false);
  billToDelete = signal<RABill | null>(null);
  isDeleting = signal<boolean>(false);

  projectOptions: { value: any; label: string }[] = [];
  workOrderOptions: { value: any; label: string }[] = [];

  totalPages = computed(() => {
    return Math.ceil(this.totalRecords() / this.pageSize()) || 1;
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadWorkOrders();
    this.loadMetrics();
    this.loadData();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = [
          { value: '', label: 'All Construction Projects' },
          ...projs.map(p => ({ value: p.id, label: p.project_name }))
        ];
      },
      error: () => {}
    });
  }

  loadWorkOrders(): void {
    this.constructionService.getWorkOrdersPaged({ limit: 100 }).subscribe({
      next: (res) => {
        this.workOrders.set(res.items);
        this.workOrderOptions = [
          { value: '', label: 'All Work Orders' },
          ...res.items.map(w => ({ value: w.id, label: `${w.work_order_no} - ${w.contractor_name || 'Contractor'}` }))
        ];
      },
      error: () => {}
    });
  }

  loadMetrics(): void {
    const pId = this.selectedProjectId() || 0;
    this.constructionService.getRABillMetrics(pId).subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();

    const filters: RABillFilter = {
      limit: this.pageSize(),
      offset: offset
    };

    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId()!;
    if (this.selectedWorkOrderId()) filters.work_order_id = this.selectedWorkOrderId()!;
    if (this.selectedWorkflowStage()) filters.workflow_stage = this.selectedWorkflowStage();
    if (this.selectedPaymentStatus()) filters.payment_status = this.selectedPaymentStatus();
    if (this.onlyOnHold()) filters.is_on_hold = true;
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getRABillsPaged(filters).subscribe({
      next: (res) => {
        this.raBills.set(res.items);
        this.totalRecords.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  setTab(tab: 'BILLS' | 'MEASUREMENTS' | 'WORKFLOW_CHAIN' | 'LEDGER_RETENTION'): void {
    this.currentTab.set(tab);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadData();
    this.loadMetrics();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedProjectId.set(null);
    this.selectedWorkOrderId.set(null);
    this.selectedWorkflowStage.set('');
    this.selectedPaymentStatus.set('');
    this.onlyOnHold.set(false);
    this.currentPage.set(1);
    this.loadData();
    this.loadMetrics();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadData();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadData();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadData();
    }
  }

  navigateToCreate(): void {
    this.router.navigate(['/construction/ra-bills/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/construction/ra-bills/edit', id]);
  }

  openDetailModal(bill: RABill): void {
    this.constructionService.getRABillById(bill.id).subscribe({
      next: (fullBill) => {
        this.selectedBill.set(fullBill);
        this.isDetailModalOpen.set(true);
      },
      error: () => {
        this.selectedBill.set(bill);
        this.isDetailModalOpen.set(true);
      }
    });
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedBill.set(null);
  }

  // 6-Stage Workflow Triggers
  openWorkflowModal(bill: RABill, defaultAction?: string): void {
    this.workflowBill.set(bill);
    this.workflowComments.set('');
    this.paidAmount.set(bill.net_payable_balance || bill.net_payable_amount);
    this.bankPaymentRef.set(`FT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

    // Determine default action and actor based on current workflow stage
    if (defaultAction) {
      this.workflowAction.set(defaultAction);
    } else {
      switch (bill.workflow_stage) {
        case 'CONTRACTOR_SUBMISSION':
          this.workflowAction.set('VERIFY_ON_SITE');
          this.workflowActorRole.set('SITE_ENGINEER');
          this.workflowActorName.set('Site Eng. M. Rahman');
          break;
        case 'SITE_ENGINEER_VERIFICATION':
          this.workflowAction.set('REVIEW_QS');
          this.workflowActorRole.set('QUANTITY_SURVEYOR');
          this.workflowActorName.set('Chief QS Anisul Hoque');
          break;
        case 'QS_REVIEW':
          this.workflowAction.set('APPROVE_PM');
          this.workflowActorRole.set('PROJECT_MANAGER');
          this.workflowActorName.set('Engr. Tariq Hasan, PMP');
          break;
        case 'PM_APPROVAL':
          this.workflowAction.set('REVIEW_ACCOUNTS');
          this.workflowActorRole.set('ACCOUNTS_AUDITOR');
          this.workflowActorName.set('Zahid Karim, FCA');
          break;
        case 'ACCOUNTS_REVIEW':
          this.workflowAction.set('AUTHORIZE_PAYMENT');
          this.workflowActorRole.set('FINANCE_DIRECTOR');
          this.workflowActorName.set('Director Finance S. Ahmed');
          break;
        default:
          this.workflowAction.set('VERIFY_ON_SITE');
          this.workflowActorRole.set('SITE_ENGINEER');
          this.workflowActorName.set('Site Engineer');
      }
    }

    this.isWorkflowModalOpen.set(true);
  }

  closeWorkflowModal(): void {
    this.isWorkflowModalOpen.set(false);
    this.workflowBill.set(null);
  }

  executeWorkflow(): void {
    const bill = this.workflowBill();
    if (!bill) return;

    this.isExecutingAction.set(true);
    const payload: RABillWorkflowActionPayload = {
      action: this.workflowAction(),
      actor_name: this.workflowActorName(),
      actor_role: this.workflowActorRole(),
      comments: this.workflowComments(),
      payment_date: this.workflowAction() === 'AUTHORIZE_PAYMENT' ? this.paymentDate() : undefined,
      payment_method: this.workflowAction() === 'AUTHORIZE_PAYMENT' ? this.paymentMethod() : undefined,
      bank_payment_ref: this.workflowAction() === 'AUTHORIZE_PAYMENT' ? this.bankPaymentRef() : undefined,
      cheque_reference: this.workflowAction() === 'AUTHORIZE_PAYMENT' ? this.chequeReference() : undefined,
      paid_amount: this.workflowAction() === 'AUTHORIZE_PAYMENT' ? this.paidAmount() : undefined
    };

    this.constructionService.executeRABillWorkflowAction(bill.id, payload).subscribe({
      next: () => {
        this.isExecutingAction.set(false);
        this.closeWorkflowModal();
        this.loadData();
        this.loadMetrics();
      },
      error: () => this.isExecutingAction.set(false)
    });
  }

  openDeleteModal(bill: RABill): void {
    this.billToDelete.set(bill);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.billToDelete.set(null);
  }

  confirmDelete(): void {
    const bill = this.billToDelete();
    if (!bill) return;

    this.isDeleting.set(true);
    this.constructionService.deleteRABill(bill.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.loadData();
        this.loadMetrics();
      },
      error: () => this.isDeleting.set(false)
    });
  }

  // Workflow Stage Badge Color
  getWorkflowStageBadgeClass(stage: string): string {
    switch (stage) {
      case 'CONTRACTOR_SUBMISSION':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'SITE_ENGINEER_VERIFICATION':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'QS_REVIEW':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'PM_APPROVAL':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'ACCOUNTS_REVIEW':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      case 'AUTHORIZED_PAYMENT':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'REJECTED':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  }

  getPaymentStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'APPROVED_FOR_PAYMENT':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      case 'PARTIALLY_PAID':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      case 'ON_HOLD':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }
}
