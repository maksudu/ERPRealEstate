import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { ProjectService } from '../../../core/services/project.service';
import { BookingPaymentCollection, OutstandingPaymentNotice } from '../../../core/models/sales.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-sales-collections',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  templateUrl: './sales-collections.component.html'
})
export class SalesCollectionsComponent implements OnInit {
  protected readonly Math = Math;
  private salesService = inject(SalesService);
  private projectService = inject(ProjectService);

  // Active Tab
  activeTab = signal<'LEDGER' | 'CHEQUES' | 'NOTICES'>('LEDGER');

  // Collections State
  collections = signal<BookingPaymentCollection[]>([]);
  totalCollections = signal<number>(0);
  isLoading = signal<boolean>(false);

  // Outstanding Notices State
  notices = signal<OutstandingPaymentNotice[]>([]);
  isLoadingNotices = signal<boolean>(false);

  // Filter State
  searchTerm = signal<string>('');
  selectedMode = signal<string>('');
  selectedClearance = signal<string>('');
  selectedType = signal<string>('');
  limit = signal<number>(10);
  offset = signal<number>(0);

  // Notification status toast
  alertSentMessage = signal<string | null>(null);

  // Options
  paymentModeOptions = [
    { label: 'All Modes', value: '' },
    { label: 'Online Bank Transfer (NPSB/EFT)', value: 'BANK_TRANSFER' },
    { label: 'Bank Cheque (A/C Payee)', value: 'CHEQUE' },
    { label: 'Cash (Cashier Vault)', value: 'CASH' },
    { label: 'BEFTN Electronic Clearing', value: 'BEFTN' },
    { label: 'RTGS Settlement', value: 'RTGS' },
    { label: 'bKash Merchant', value: 'BKASH' },
    { label: 'Nagad Gateway', value: 'NAGAD' }
  ];

  clearanceOptions = [
    { label: 'All Realization Statuses', value: '' },
    { label: 'Cleared Cash', value: 'CLEARED' },
    { label: 'Pending Bank Clearance', value: 'PENDING_CLEARANCE' },
    { label: 'Dishonoured / Bounced', value: 'DISHONOURED' }
  ];

  collectionTypeOptions = [
    { label: 'All Collection Types', value: '' },
    { label: 'Booking Money', value: 'BOOKING_MONEY' },
    { label: 'Down Payment', value: 'DOWN_PAYMENT' },
    { label: 'Partial Down Payment', value: 'PARTIAL_DOWN_PAYMENT' },
    { label: 'Advance Installment', value: 'ADVANCE_INSTALLMENT' }
  ];

  // Calculated Metrics
  totalClearedAmount = signal<number>(0);
  pendingChequeCount = signal<number>(0);
  pendingChequeAmount = signal<number>(0);
  dishonouredCount = signal<number>(0);

  ngOnInit(): void {
    this.loadCollections();
    this.loadNotices();
  }

  loadCollections(): void {
    this.isLoading.set(true);
    this.salesService.getBookingCollections({
      search: this.searchTerm() || undefined,
      payment_mode: this.selectedMode() || undefined,
      clearance_status: this.selectedClearance() || undefined,
      collection_type: this.selectedType() || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        const list = res || [];
        this.collections.set(list);
        this.totalCollections.set(this.offset() + list.length + (list.length === this.limit() ? this.limit() : 0));
        this.isLoading.set(false);

        // Compute KPI Summary Metrics
        let cleared = 0;
        let pendingCnt = 0;
        let pendingAmt = 0;
        let dishonoured = 0;

        for (const c of list) {
          const amt = Number(c.amount) || 0;
          if (c.clearance_status === 'CLEARED') {
            cleared += amt;
          } else if (c.clearance_status === 'PENDING_CLEARANCE') {
            pendingCnt++;
            pendingAmt += amt;
          } else if (c.clearance_status === 'DISHONOURED') {
            dishonoured++;
          }
        }

        this.totalClearedAmount.set(cleared);
        this.pendingChequeCount.set(pendingCnt);
        this.pendingChequeAmount.set(pendingAmt);
        this.dishonouredCount.set(dishonoured);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadNotices(): void {
    this.isLoadingNotices.set(true);
    this.salesService.getOutstandingNotices().subscribe({
      next: (res) => {
        this.notices.set(res || []);
        this.isLoadingNotices.set(false);
      },
      error: () => this.isLoadingNotices.set(false)
    });
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.offset.set(0);
    this.loadCollections();
  }

  onModeFilter(mode: string): void {
    this.selectedMode.set(mode);
    this.offset.set(0);
    this.loadCollections();
  }

  onClearanceFilter(status: string): void {
    this.selectedClearance.set(status);
    this.offset.set(0);
    this.loadCollections();
  }

  onTypeFilter(type: string): void {
    this.selectedType.set(type);
    this.offset.set(0);
    this.loadCollections();
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.set(Math.max(0, this.offset() - this.limit()));
      this.loadCollections();
    }
  }

  nextPage(): void {
    if (this.collections().length === this.limit()) {
      this.offset.set(this.offset() + this.limit());
      this.loadCollections();
    }
  }

  pendingCheques(): BookingPaymentCollection[] {
    return this.collections().filter((c) => c.clearance_status === 'PENDING_CLEARANCE');
  }

  quickClearCheque(col: BookingPaymentCollection): void {
    if (!col.id) return;
    if (confirm(`Confirm realization of Cheque ${col.receipt_number} (BDT ${col.amount})?`)) {
      this.salesService.updateCollectionClearance(col.id, {
        clearance_status: 'CLEARED',
        clearance_date: new Date().toISOString().split('T')[0]
      }).subscribe({
        next: () => this.loadCollections(),
        error: (err) => alert(err?.error?.detail || 'Failed to clear cheque.')
      });
    }
  }

  sendReminderAlert(notice: OutstandingPaymentNotice): void {
    this.salesService.sendOutstandingPaymentAlert(notice.booking_id).subscribe({
      next: (res) => {
        this.alertSentMessage.set(`SMS payment reminder dispatched to ${notice.customer_name} (${notice.customer_phone}) for BDT ${notice.net_down_payment_due.toLocaleString()}!`);
        setTimeout(() => this.alertSentMessage.set(null), 5000);
      },
      error: (err) => alert(err?.error?.detail || 'Failed to dispatch reminder.')
    });
  }
}
