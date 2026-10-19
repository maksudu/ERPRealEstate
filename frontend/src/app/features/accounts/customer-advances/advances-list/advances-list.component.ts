import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CustomerAdvanceAccountingService } from '../../../../core/services/customer-advance-accounting.service';
import { LookupService } from '../../../../core/services/lookup.service';
import { ProjectService } from '../../../../core/services/project.service';
import { CustomerAdvanceInstallment } from '../../../../core/models/customer-advance-accounting.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../../shared/components';
import { CustomerAdvancesNavComponent } from '../customer-advances-nav.component';

@Component({
  selector: 'app-advances-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    CustomerAdvancesNavComponent
  ],
  templateUrl: './advances-list.component.html'
})
export class AdvancesListComponent implements OnInit {
  private service = inject(CustomerAdvanceAccountingService);
  private lookupService = inject(LookupService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // State
  isLoading = signal<boolean>(false);
  advances = signal<CustomerAdvanceInstallment[]>([]);
  totalCount = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  // KPI Metrics
  totalGrossAdvances = signal<number>(0);
  totalUnappliedCredits = signal<number>(0);
  totalAllocatedInstallments = signal<number>(0);
  totalRecognizedRevenue = signal<number>(0);

  // Filters
  searchTerm = '';
  selectedProject: number | null = null;
  selectedTxType: string = 'ALL';
  selectedStatus: string = 'ALL';
  selectedRevStatus: string = 'ALL';

  // Dynamic Lookup Options
  projectOptions = signal<{ label: string; value: number }[]>([]);
  txTypeOptions = signal<{ label: string; value: string }[]>([]);
  statusOptions = signal<{ label: string; value: string }[]>([
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Advance Recorded', value: 'ADVANCE_RECORDED' },
    { label: 'Partially Allocated', value: 'PARTIALLY_ALLOCATED' },
    { label: 'Fully Allocated', value: 'FULLY_ALLOCATED' },
    { label: 'Revenue Recognized', value: 'RECOGNIZED_REVENUE' },
    { label: 'Refunded / Cancelled', value: 'REFUNDED_CANCELLED' }
  ]);
  revStatusOptions = signal<{ label: string; value: string }[]>([
    { label: 'All Revenue Policies', value: 'ALL' },
    { label: 'Unearned Liability', value: 'UNEARNED_LIABILITY' },
    { label: 'POC Eligible', value: 'POC_ELIGIBLE' },
    { label: 'Transferred to Revenue', value: 'TRANSFERRED_TO_REVENUE' }
  ]);

  // Modal States
  showAllocateModal = signal<boolean>(false);
  showRecognizeModal = signal<boolean>(false);
  showRefundModal = signal<boolean>(false);
  selectedAdvance = signal<CustomerAdvanceInstallment | null>(null);

  // Allocation Form
  allocForm = {
    allocated_amount: 0,
    allocation_type: 'INSTALLMENT_DEMAND',
    notes: ''
  };

  // Revenue Recognition Form
  revForm = {
    recognized_amount: 0,
    recognition_policy: 'POC_IFRS15',
    notes: ''
  };

  // Refund Form
  refundForm = {
    refund_amount: 0,
    forfeiture_amount: 0,
    reason: '',
    notes: ''
  };

  ngOnInit(): void {
    this.loadLookups();
    this.loadAdvances();
  }

  loadLookups(): void {
    // Dynamic Projects
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.projectOptions.set([
          { label: 'All 20+ Projects', value: 0 },
          ...list.map((p: any) => ({ label: p.project_name || p.name, value: p.id }))
        ]);
      }
    });

    // Dynamic Transaction Types
    this.lookupService.getItems('ADVANCE_TRANSACTION_TYPE').subscribe({
      next: (items: any[]) => {
        if (items && items.length) {
          this.txTypeOptions.set([
            { label: 'All Transaction Types', value: 'ALL' },
            ...items.map((i: any) => ({ label: i.item_name_en, value: i.item_code }))
          ]);
        } else {
          this.txTypeOptions.set([
            { label: 'All Transaction Types', value: 'ALL' },
            { label: 'Booking Money Receipt', value: 'BOOKING_MONEY' },
            { label: 'Down Payment Accounting', value: 'DOWN_PAYMENT' },
            { label: 'Installment Advance', value: 'INSTALLMENT_ADVANCE' },
            { label: 'Interim Collection', value: 'INTERIM_COLLECTION' },
            { label: 'Late Charge Adjustment', value: 'LATE_CHARGE_ASSESSMENT' }
          ]);
        }
      }
    });
  }

  loadAdvances(): void {
    this.isLoading.set(true);
    this.service.getTransactions({
      search: this.searchTerm,
      project_id: this.selectedProject && this.selectedProject > 0 ? this.selectedProject : undefined,
      transaction_type: this.selectedTxType,
      accounting_status: this.selectedStatus,
      revenue_recognition_status: this.selectedRevStatus,
      page: this.currentPage(),
      limit: this.pageSize()
    }).subscribe({
      next: (res) => {
        this.advances.set(res.items);
        this.totalCount.set(res.total);
        this.totalPages.set(res.totalPages);
        this.totalGrossAdvances.set(Number(res.total_gross_advances));
        this.totalUnappliedCredits.set(Number(res.total_unapplied_credits));
        this.totalAllocatedInstallments.set(Number(res.total_allocated_installments));
        this.totalRecognizedRevenue.set(Number(res.total_recognized_revenue));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadAdvances();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadAdvances();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadAdvances();
    }
  }

  // Modals Trigger
  openAllocateModal(item: CustomerAdvanceInstallment): void {
    this.selectedAdvance.set(item);
    this.allocForm = {
      allocated_amount: Number(item.unapplied_credit_balance),
      allocation_type: 'INSTALLMENT_DEMAND',
      notes: `Allocated to ${item.installment_title || 'Due Demand'}`
    };
    this.showAllocateModal.set(true);
  }

  submitAllocation(): void {
    const adv = this.selectedAdvance();
    if (!adv) return;

    this.service.allocateAdvance({
      advance_id: adv.id,
      installment_id: adv.installment_id,
      unit_id: adv.unit_id,
      allocated_amount: this.allocForm.allocated_amount,
      allocation_type: this.allocForm.allocation_type,
      notes: this.allocForm.notes
    }).subscribe({
      next: () => {
        this.showAllocateModal.set(false);
        this.loadAdvances();
      }
    });
  }

  openRecognizeModal(item: CustomerAdvanceInstallment): void {
    this.selectedAdvance.set(item);
    const rem = Number(item.gross_amount) - Number(item.revenue_recognized_amount);
    this.revForm = {
      recognized_amount: rem,
      recognition_policy: 'POC_IFRS15',
      notes: `IFRS 15 revenue recognized for ${item.customer_name}`
    };
    this.showRecognizeModal.set(true);
  }

  submitRevenueRecognition(): void {
    const adv = this.selectedAdvance();
    if (!adv) return;

    this.service.recognizeRevenue({
      advance_id: adv.id,
      recognized_amount: this.revForm.recognized_amount,
      recognition_policy: this.revForm.recognition_policy,
      notes: this.revForm.notes
    }).subscribe({
      next: () => {
        this.showRecognizeModal.set(false);
        this.loadAdvances();
      }
    });
  }

  openRefundModal(item: CustomerAdvanceInstallment): void {
    this.selectedAdvance.set(item);
    this.refundForm = {
      refund_amount: Number(item.unapplied_credit_balance),
      forfeiture_amount: 0,
      reason: 'Mutual allotment cancellation',
      notes: 'Approved cancellation refund'
    };
    this.showRefundModal.set(true);
  }

  submitRefund(): void {
    const adv = this.selectedAdvance();
    if (!adv) return;

    this.service.processRefund({
      advance_id: adv.id,
      refund_amount: this.refundForm.refund_amount,
      forfeiture_amount: this.refundForm.forfeiture_amount,
      reason: this.refundForm.reason,
      notes: this.refundForm.notes
    }).subscribe({
      next: () => {
        this.showRefundModal.set(false);
        this.loadAdvances();
      }
    });
  }

  deleteAdvance(id: number): void {
    if (confirm('Are you sure you want to delete this customer advance transaction?')) {
      this.service.deleteTransaction(id).subscribe({
        next: () => this.loadAdvances()
      });
    }
  }

  // Format Helpers
  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  getStatusVariant(status: string): 'success' | 'warning' | 'info' | 'danger' | 'neutral' {
    switch (status) {
      case 'FULLY_ALLOCATED':
      case 'TRANSFERRED_TO_REVENUE':
        return 'success';
      case 'PARTIALLY_ALLOCATED':
      case 'POC_ELIGIBLE':
        return 'info';
      case 'ADVANCE_RECORDED':
      case 'UNEARNED_LIABILITY':
        return 'warning';
      case 'REFUNDED_CANCELLED':
        return 'danger';
      default:
        return 'neutral';
    }
  }
}
