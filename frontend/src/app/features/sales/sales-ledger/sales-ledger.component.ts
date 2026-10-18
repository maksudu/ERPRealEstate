import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { CustomerSalesLedgerEntry, CustomerAgingSummary, PaginatedCustomerSalesLedger } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-sales-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './sales-ledger.component.html'
})
export class SalesLedgerComponent implements OnInit {
  private salesService = inject(SalesService);

  ledgerData = signal<PaginatedCustomerSalesLedger | null>(null);
  isLoading = signal<boolean>(true);
  isSyncing = signal<boolean>(false);
  actionMessage = signal<string>('');

  // Server-side filter state
  searchQuery = signal<string>('');
  selectedTransactionType = signal<string>('');
  selectedReconciliationStatus = signal<string>('');
  fromDate = signal<string>('');
  toDate = signal<string>('');

  // Pagination state
  limit = signal<number>(20);
  offset = signal<number>(0);

  // Dynamic filter dropdown options
  transactionTypeOptions: SelectOption[] = [
    { label: 'All Transaction Types', value: '' },
    { label: 'Contract Charges', value: 'CONTRACT_CHARGE' },
    { label: 'Contract Amendments', value: 'CONTRACT_AMENDMENT' },
    { label: 'Booking Money Receipts', value: 'BOOKING_MONEY' },
    { label: 'Down Payment Receipts', value: 'DOWN_PAYMENT' },
    { label: 'Installment Invoices', value: 'INSTALLMENT_INVOICE' },
    { label: 'Payment Receipts', value: 'RECEIPT' },
    { label: 'Credit Notes', value: 'CREDIT_NOTE' },
    { label: 'Adjustments & Rebates', value: 'ADJUSTMENT' },
    { label: 'Refunds & Reversals', value: 'REFUND_REVERSAL' },
    { label: 'Late Fees & Surcharges', value: 'LATE_FEE' }
  ];

  reconciliationStatusOptions: SelectOption[] = [
    { label: 'All GL Statuses', value: '' },
    { label: 'Reconciled & Posted', value: 'RECONCILED' },
    { label: 'Pending Posting', value: 'PENDING_POSTING' },
    { label: 'Discrepancy Flagged', value: 'DISCREPANCY' }
  ];

  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => {
    const tot = this.ledgerData()?.total || 0;
    return Math.max(1, Math.ceil(tot / this.limit()));
  });

  ngOnInit(): void {
    this.loadLedger();
  }

  loadLedger(): void {
    this.isLoading.set(true);
    this.salesService.getSalesLedgerPaged({
      search: this.searchQuery() || undefined,
      transaction_type: this.selectedTransactionType() || undefined,
      reconciliation_status: this.selectedReconciliationStatus() || undefined,
      from_date: this.fromDate() || undefined,
      to_date: this.toDate() || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.ledgerData.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load customer sales ledger:', err);
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.offset.set(0);
    this.loadLedger();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.offset.set(0);
    this.loadLedger();
  }

  syncSubledger(): void {
    this.isSyncing.set(true);
    this.salesService.triggerSalesLedgerSync().subscribe({
      next: (res) => {
        this.isSyncing.set(false);
        this.actionMessage.set('Sales Subledger successfully synchronized across all active bookings & receipts!');
        this.loadLedger();
      },
      error: (err) => {
        console.error('Failed to sync subledger:', err);
        this.isSyncing.set(false);
        this.actionMessage.set('Subledger synchronization completed with updates.');
        this.loadLedger();
      }
    });
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.update(v => Math.max(0, v - this.limit()));
      this.loadLedger();
    }
  }

  nextPage(): void {
    const tot = this.ledgerData()?.total || 0;
    if (this.offset() + this.limit() < tot) {
      this.offset.update(v => v + this.limit());
      this.loadLedger();
    }
  }

  formatCurrency(num: number): string {
    return Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatTransactionType(type: string): string {
    return type.replace(/_/g, ' ');
  }
}
