import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import {
  SiteMaterialRequisition,
  MaterialConsumption,
  MaterialReturn,
  MaterialRequisitionMetrics,
  SiteMaterialRequisitionFilter
} from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-material-requisitions',
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
  templateUrl: './construction-material-requisitions.component.html'
})
export class ConstructionMaterialRequisitionsComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private router = inject(Router);

  // Active Tab
  currentTab = signal<'REQUISITIONS' | 'ISSUES' | 'CONSUMPTION' | 'RETURNS'>('REQUISITIONS');

  // Data signals
  requisitions = signal<SiteMaterialRequisition[]>([]);
  consumptions = signal<MaterialConsumption[]>([]);
  returns = signal<MaterialReturn[]>([]);
  metrics = signal<MaterialRequisitionMetrics>({
    total_requisitions: 0,
    pending_approvals: 0,
    approved_in_progress: 0,
    total_issued_count: 0,
    total_consumed_records: 0,
    total_return_records: 0,
    total_consumption_value: 0,
    total_wasted_value: 0,
    total_returned_value: 0
  });

  // Loading & Pagination
  isLoading = signal<boolean>(false);
  totalRecords = signal<number>(0);
  pageSize = signal<number>(10);
  currentPage = signal<number>(1);

  // Filters
  searchQuery = signal<string>('');
  selectedWorkPackage = signal<string>('');
  selectedStatus = signal<string>('');
  selectedPriority = signal<string>('');
  selectedProjectId = signal<number>(1);

  // Modal State
  isApproveModalOpen = signal<boolean>(false);
  isIssueModalOpen = signal<boolean>(false);
  isReceiveModalOpen = signal<boolean>(false);
  isConsumeModalOpen = signal<boolean>(false);
  isReturnModalOpen = signal<boolean>(false);
  selectedReq = signal<SiteMaterialRequisition | null>(null);

  // Modal Forms Data
  approveQty = signal<number>(0);
  rejectionReason = signal<string>('');
  triggerPR = signal<boolean>(true);

  issueQty = signal<number>(0);
  issueBatch = signal<string>('');
  issueNotes = signal<string>('');

  receiveQty = signal<number>(0);
  receiveRemarks = signal<string>('');

  consumeQty = signal<number>(0);
  wasteQty = signal<number>(0);
  damageQty = signal<number>(0);
  consumeRemarks = signal<string>('');
  workLocation = signal<string>('');

  returnQty = signal<number>(0);
  returnCondition = signal<string>('GOOD');
  returnReason = signal<string>('EXCESS_AFTER_CASTING');

  ngOnInit(): void {
    this.loadData();
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.constructionService.getMaterialRequisitionMetrics(this.selectedProjectId()).subscribe({
      next: (m: MaterialRequisitionMetrics) => this.metrics.set(m),
      error: () => {}
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();

    if (this.currentTab() === 'REQUISITIONS' || this.currentTab() === 'ISSUES') {
      const filters: SiteMaterialRequisitionFilter = {
        project_id: this.selectedProjectId(),
        limit: this.pageSize(),
        offset: offset
      };
      if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();
      if (this.selectedWorkPackage()) filters.work_package = this.selectedWorkPackage();
      if (this.selectedStatus()) filters.status = this.selectedStatus();
      if (this.selectedPriority()) filters.priority = this.selectedPriority();

      this.constructionService.getMaterialRequisitionsPaged(filters).subscribe({
        next: res => {
          this.requisitions.set(res.items);
          this.totalRecords.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    } else if (this.currentTab() === 'CONSUMPTION') {
      this.constructionService.getMaterialConsumptionsPaged({
        project_id: this.selectedProjectId(),
        limit: this.pageSize(),
        offset: offset
      }).subscribe({
        next: res => {
          this.consumptions.set(res.items);
          this.totalRecords.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    } else {
      this.constructionService.getMaterialReturnsPaged({
        project_id: this.selectedProjectId(),
        limit: this.pageSize(),
        offset: offset
      }).subscribe({
        next: res => {
          this.returns.set(res.items);
          this.totalRecords.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  changeTab(tab: 'REQUISITIONS' | 'ISSUES' | 'CONSUMPTION' | 'RETURNS'): void {
    this.currentTab.set(tab);
    this.currentPage.set(1);
    this.loadData();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadData();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedWorkPackage.set('');
    this.selectedStatus.set('');
    this.selectedPriority.set('');
    this.currentPage.set(1);
    this.loadData();
  }

  nextPage(): void {
    if (this.currentPage() * this.pageSize() < this.totalRecords()) {
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
    this.router.navigate(['/construction/material-requisitions/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/construction/material-requisitions/edit', id]);
  }

  deleteRequisition(id: number): void {
    if (confirm('Are you sure you want to delete this material requisition?')) {
      this.constructionService.deleteMaterialRequisition(id).subscribe({
        next: () => {
          this.loadData();
          this.loadMetrics();
        },
        error: err => alert(err.error?.detail || 'Failed to delete requisition')
      });
    }
  }

  // --- Modal Openers ---
  openApproveModal(r: SiteMaterialRequisition): void {
    this.selectedReq.set(r);
    this.approveQty.set(r.requested_quantity);
    this.rejectionReason.set('');
    this.triggerPR.set((r.stock_shortage || 0) > 0);
    this.isApproveModalOpen.set(true);
  }

  submitApproval(action: 'APPROVE' | 'REJECT'): void {
    if (!this.selectedReq()) return;
    this.constructionService.approveMaterialRequisition(this.selectedReq()!.id, {
      action,
      approved_quantity: this.approveQty(),
      rejection_reason: this.rejectionReason(),
      create_purchase_requisition_for_shortage: this.triggerPR()
    }).subscribe({
      next: () => {
        this.isApproveModalOpen.set(false);
        this.loadData();
        this.loadMetrics();
      },
      error: err => alert(err.error?.detail || 'Approval action failed')
    });
  }

  openIssueModal(r: SiteMaterialRequisition): void {
    this.selectedReq.set(r);
    const balanceToIssue = Math.max(0, (r.approved_quantity || r.requested_quantity) - (r.issued_quantity || 0));
    this.issueQty.set(balanceToIssue);
    this.issueBatch.set(r.batch_lot_number || '');
    this.issueNotes.set('');
    this.isIssueModalOpen.set(true);
  }

  submitIssue(): void {
    if (!this.selectedReq()) return;
    this.constructionService.issueMaterialRequisition(this.selectedReq()!.id, {
      issued_quantity: this.issueQty(),
      batch_lot_number: this.issueBatch(),
      notes: this.issueNotes()
    }).subscribe({
      next: () => {
        this.isIssueModalOpen.set(false);
        this.loadData();
        this.loadMetrics();
      },
      error: err => alert(err.error?.detail || 'Store issue failed')
    });
  }

  openReceiveModal(r: SiteMaterialRequisition): void {
    this.selectedReq.set(r);
    this.receiveQty.set(r.issued_quantity || r.requested_quantity);
    this.receiveRemarks.set('');
    this.isReceiveModalOpen.set(true);
  }

  submitReceive(): void {
    if (!this.selectedReq()) return;
    this.constructionService.receiveMaterialRequisition(this.selectedReq()!.id, {
      received_quantity: this.receiveQty(),
      remarks: this.receiveRemarks()
    }).subscribe({
      next: () => {
        this.isReceiveModalOpen.set(false);
        this.loadData();
        this.loadMetrics();
      },
      error: err => alert(err.error?.detail || 'Confirmation failed')
    });
  }

  openConsumeModal(r: SiteMaterialRequisition): void {
    this.selectedReq.set(r);
    const pendingCon = Math.max(0, (r.issued_quantity || r.requested_quantity) - (r.consumed_quantity || 0));
    this.consumeQty.set(pendingCon);
    this.wasteQty.set(0);
    this.damageQty.set(0);
    this.consumeRemarks.set('');
    this.workLocation.set(`${r.tower_name || ''} ${r.floor_number || ''}`.trim());
    this.isConsumeModalOpen.set(true);
  }

  submitConsumption(): void {
    if (!this.selectedReq()) return;
    this.constructionService.recordMaterialConsumption(this.selectedReq()!.id, {
      quantity_consumed: this.consumeQty(),
      quantity_wasted: this.wasteQty(),
      quantity_damaged: this.damageQty(),
      work_location: this.workLocation(),
      remarks: this.consumeRemarks()
    }).subscribe({
      next: () => {
        this.isConsumeModalOpen.set(false);
        this.loadData();
        this.loadMetrics();
      },
      error: err => alert(err.error?.detail || 'Consumption logging failed')
    });
  }

  openReturnModal(r: SiteMaterialRequisition): void {
    this.selectedReq.set(r);
    this.returnQty.set(0);
    this.returnCondition.set('GOOD');
    this.returnReason.set('EXCESS_AFTER_CASTING');
    this.isReturnModalOpen.set(true);
  }

  submitReturn(): void {
    if (!this.selectedReq()) return;
    this.constructionService.returnMaterialToStore(this.selectedReq()!.id, {
      store_id: this.selectedReq()!.store_id || 1,
      returned_quantity: this.returnQty(),
      condition_status: this.returnCondition(),
      return_reason: this.returnReason()
    }).subscribe({
      next: () => {
        this.isReturnModalOpen.set(false);
        this.loadData();
        this.loadMetrics();
      },
      error: err => alert(err.error?.detail || 'Return-to-store failed')
    });
  }

  // --- Helpers for badges ---
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'bg-secondary text-secondary-foreground border-border';
      case 'PENDING_APPROVAL':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'APPROVED':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'PO_INITIATED':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'PARTIALLY_ISSUED':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'ISSUED':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'RECEIVED_AT_SITE':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'CONSUMED':
      case 'CLOSED':
        return 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/20';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold';
      case 'URGENT':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20 font-semibold';
      case 'NORMAL':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }
}
