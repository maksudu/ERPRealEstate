import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { LookupService } from '../../../core/services/lookup.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  PaymentVoucher,
  PaymentVoucherKPIs,
  PaymentVoucherWorkflowAction
} from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-payment-vouchers-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  templateUrl: './payment-vouchers-list.component.html'
})
export class PaymentVouchersListComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private lookupService = inject(LookupService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Reactive State
  kpis = signal<PaymentVoucherKPIs | null>(null);
  vouchers = signal<PaymentVoucher[]>([]);
  totalCount = signal<number>(0);
  isLoading = signal<boolean>(false);
  isActionLoading = signal<boolean>(false);

  // Filters & Pagination
  searchQuery = signal<string>('');
  selectedProject = signal<number | null>(null);
  selectedMethod = signal<string>('');
  selectedDebitCategory = signal<string>('');
  selectedStatus = signal<string>('');
  pageSize = signal<number>(20);
  pageOffset = signal<number>(0);

  // Dropdown Options
  projectOptions = signal<SelectOption[]>([]);
  methodOptions = signal<SelectOption[]>([
    { value: 'Bank_Transfer', label: 'Bank Transfer (EFT/BEFTN/RTGS)', subLabel: 'Electronic bank settlement' },
    { value: 'Cheque', label: 'Cheque Payment', subLabel: 'Cheque issue & clearing lifecycle' },
    { value: 'Cash', label: 'Cash Payment', subLabel: 'Imprest Cashbox outflow' },
    { value: 'MFS', label: 'Mobile Financial Services', subLabel: 'bKash / Nagad / Rocket' },
    { value: 'Card', label: 'Corporate Card', subLabel: 'Debit / Credit card outflow' }
  ]);
  categoryOptions = signal<SelectOption[]>([
    { value: 'Expense', label: 'Administrative & Office Expense', subLabel: 'Direct Dr. Expense / Cr. Bank' },
    { value: 'Payable', label: 'Supplier / Subcontractor Payable', subLabel: 'Liquidates AP Bill (No duplicate expense)' },
    { value: 'Asset_CWIP', label: 'Construction CWIP / Fixed Asset', subLabel: 'Capitalizable development outflow' },
    { value: 'Advance', label: 'Advance / Security Deposit', subLabel: 'Supplier advance / prepayments' },
    { value: 'Inventory', label: 'Direct Site Inventory Material', subLabel: 'Stores inventory purchase' }
  ]);
  statusOptions = signal<SelectOption[]>([
    { value: 'Draft', label: 'Draft', subLabel: 'Initiated & editable' },
    { value: 'Submitted', label: 'Submitted', subLabel: 'Awaiting verification' },
    { value: 'Checked', label: 'Checked / Verified', subLabel: 'Internal check cleared' },
    { value: 'Approved', label: 'Approved', subLabel: 'Authorized for disbursement' },
    { value: 'Disbursed', label: 'Disbursed / Paid', subLabel: 'Funds released & GL posted' },
    { value: 'Reconciled', label: 'Reconciled', subLabel: 'Bank/Cheque clearing settled' },
    { value: 'Cancelled', label: 'Cancelled', subLabel: 'Void voucher' }
  ]);

  // Flash Notifications
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDropdownData();
    this.loadKPIs();
    this.loadVouchers();
  }

  loadDropdownData(): void {
    // 1. Load Projects
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        const opts: SelectOption[] = projects.map(p => ({
          value: p.id,
          label: p.project_name,
          subLabel: p.site_address || `Code: ${p.project_code || p.id}`
        }));
        this.projectOptions.set(opts);
      },
      error: () => {}
    });

    // 2. Load Dynamic Lookups if configured in LookupService
    this.lookupService.getItems('PAYMENT_METHOD').subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          this.methodOptions.set(items.map(it => ({
            value: it.item_code,
            label: it.item_name_en,
            subLabel: it.item_name_bn || undefined
          })));
        }
      },
      error: () => {}
    });

    this.lookupService.getItems('PAYMENT_DEBIT_CATEGORY').subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          this.categoryOptions.set(items.map(it => ({
            value: it.item_code,
            label: it.item_name_en,
            subLabel: it.item_name_bn || undefined
          })));
        }
      },
      error: () => {}
    });

    this.lookupService.getItems('PAYMENT_VOUCHER_STATUS').subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          this.statusOptions.set(items.map(it => ({
            value: it.item_code,
            label: it.item_name_en,
            subLabel: it.item_name_bn || undefined
          })));
        }
      },
      error: () => {}
    });
  }

  loadKPIs(): void {
    this.accountsService.getPaymentVoucherKPIs(this.selectedProject() || undefined).subscribe({
      next: (data) => this.kpis.set(data),
      error: (err) => console.error('Failed to load voucher KPIs', err)
    });
  }

  loadVouchers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountsService.getPaymentVouchers({
      project_id: this.selectedProject() || undefined,
      payment_method: this.selectedMethod() || undefined,
      debit_category: this.selectedDebitCategory() || undefined,
      status: this.selectedStatus() || undefined,
      search: this.searchQuery() || undefined,
      limit: this.pageSize(),
      offset: this.pageOffset()
    }).subscribe({
      next: (res) => {
        this.vouchers.set(res.items);
        this.totalCount.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to load payment vouchers register.');
      }
    });
  }

  onSearch(): void {
    this.pageOffset.set(0);
    this.loadVouchers();
  }

  onFilterChange(): void {
    this.pageOffset.set(0);
    this.loadKPIs();
    this.loadVouchers();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedProject.set(null);
    this.selectedMethod.set('');
    this.selectedDebitCategory.set('');
    this.selectedStatus.set('');
    this.pageOffset.set(0);
    this.loadKPIs();
    this.loadVouchers();
  }

  changePage(offset: number): void {
    this.pageOffset.set(offset);
    this.loadVouchers();
  }

  changePageSize(newSize: number): void {
    this.pageSize.set(newSize);
    this.pageOffset.set(0);
    this.loadVouchers();
  }

  // Quick Workflow Transition
  executeQuickAction(voucher: PaymentVoucher, action: string): void {
    const actionLabel = action.toUpperCase();
    if (action === 'cancel' && !confirm(`Are you sure you want to cancel payment voucher ${voucher.voucher_number}?`)) {
      return;
    }

    this.isActionLoading.set(true);
    const payload: PaymentVoucherWorkflowAction = {
      action: action,
      notes: `Quick workflow transition via Payment Register: ${actionLabel}`
    };

    this.accountsService.executePaymentVoucherWorkflow(voucher.id, payload).subscribe({
      next: (updated) => {
        this.isActionLoading.set(false);
        this.successMessage.set(`Voucher ${updated.voucher_number} successfully transitioned to ${updated.status}.`);
        this.loadKPIs();
        this.loadVouchers();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err.error?.detail || `Failed to transition voucher to ${actionLabel}.`);
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      case 'Submitted':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Checked':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Approved':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'Disbursed':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Reconciled':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-300 dark:border-teal-800';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-secondary text-foreground border-border';
    }
  }

  getMethodIcon(method: string): string {
    switch (method) {
      case 'Bank_Transfer':
        return 'ri-bank-line text-blue-600';
      case 'Cheque':
        return 'ri-bill-line text-amber-600';
      case 'Cash':
        return 'ri-money-dollar-box-line text-emerald-600';
      case 'MFS':
        return 'ri-smartphone-line text-pink-600';
      case 'Card':
        return 'ri-bank-card-2-line text-purple-600';
      default:
        return 'ri-exchange-dollar-line text-foreground';
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  }

  get currentPage(): number {
    return Math.floor(this.pageOffset() / this.pageSize()) + 1;
  }
}
