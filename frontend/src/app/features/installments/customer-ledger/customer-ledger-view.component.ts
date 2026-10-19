import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { CustomerLedgerSummary } from '../../../core/models/installment.model';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-customer-ledger-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InstallmentsNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-4">
      <app-installments-nav />

      <app-card-container
        title="10. Customer Financial Ledger & Statement"
        subtitle="Chronological statement of installment dues, money receipts, adjustments, running balance, and downloadable BDT statements"
        badge="Submodule 10"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button
            variant="outline"
            size="sm"
            (btnClick)="printStatement()"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Print BDT Statement
          </app-button>
        </div>

        <!-- Customer / Booking Searchable Selector -->
        <div class="p-4 mb-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Apartment Buyer / Booking Allotment <span class="text-rose-500">*</span>
            </label>
            <app-searchable-select
              categoryCode="BOOKING_APPLICATIONS"
              placeholder="Search by customer name, phone, or booking reference..."
              [allowCreateNew]="true"
              [(ngModel)]="selectedBookingId"
              (selectionChange)="onBookingSelected()"
            />
          </div>

          <div>
            <app-button variant="primary" size="md" [fullWidth]="true" (btnClick)="loadLedger()">
              Fetch Ledger
            </app-button>
          </div>
        </div>

        @if (isLoading()) {
          <div class="text-center py-12 text-slate-500">
            <div class="inline-flex items-center gap-2">
              <svg class="animate-spin h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span class="text-sm font-semibold">Generating customer financial statement...</span>
            </div>
          </div>
        } @else if (ledger()) {
          <!-- Customer Profile & Balance Summary Strip -->
          <div id="printable-statement" class="space-y-4">
            <div class="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <span class="text-[11px] text-slate-500 uppercase tracking-wider block">Customer Information</span>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{{ ledger()?.customer_name }}</h3>
                <p class="text-xs text-slate-600 dark:text-slate-400">{{ ledger()?.customer_phone }}</p>
                <p class="text-[11px] text-slate-500">{{ ledger()?.customer_email }}</p>
              </div>

              <div>
                <span class="text-[11px] text-slate-500 uppercase tracking-wider block">Property / Allotment</span>
                <h3 class="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{{ ledger()?.project_name }}</h3>
                <p class="text-xs text-slate-700 dark:text-slate-300 font-semibold">Unit: {{ ledger()?.unit_number }}</p>
                <p class="text-[11px] font-mono text-slate-500">Booking: {{ ledger()?.booking_reference_no }}</p>
              </div>

              <div>
                <span class="text-[11px] text-slate-500 uppercase tracking-wider block">Agreed Sale Price</span>
                <div class="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  ৳{{ (ledger()?.agreed_sale_price || 0) | number:'1.2-2' }}
                </div>
                <div class="text-[11px] text-slate-500">
                  Total Billed: ৳{{ (ledger()?.total_billed || 0) | number:'1.2-2' }}
                </div>
              </div>

              <div class="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-750">
                <span class="text-[11px] text-slate-500 uppercase tracking-wider block">Outstanding Balance</span>
                <div class="text-lg font-bold" [ngClass]="(ledger()?.total_outstanding || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'">
                  ৳{{ (ledger()?.total_outstanding || 0) | number:'1.2-2' }}
                </div>
                <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Advance Credited: ৳{{ (ledger()?.total_advance_balance || 0) | number:'1.2-2' }}
                </div>
              </div>
            </div>

            <!-- Chronological Transaction Waterfall Table -->
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                <thead class="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th class="px-4 py-3 text-center">Posting Date</th>
                    <th class="px-4 py-3 text-left">Transaction Type</th>
                    <th class="px-4 py-3 text-left">Reference No</th>
                    <th class="px-4 py-3 text-left">Description / Particulars</th>
                    <th class="px-4 py-3 text-right">Debit (Due ৳)</th>
                    <th class="px-4 py-3 text-right">Credit (Paid ৳)</th>
                    <th class="px-4 py-3 text-right font-bold">Running Balance (৳)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  @if (ledger()?.transactions?.length === 0) {
                    <tr>
                      <td colspan="7" class="text-center py-8 text-slate-500">
                        No transactions recorded for this allotment.
                      </td>
                    </tr>
                  } @else {
                    @for (tx of ledger()?.transactions; track $index) {
                      <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td class="px-4 py-3 text-center text-slate-600 dark:text-slate-400 font-mono">
                          {{ tx.transaction_date }}
                        </td>
                        <td class="px-4 py-3">
                          <span
                            class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold"
                            [ngClass]="tx.debit_amount > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'"
                          >
                            {{ tx.transaction_type }}
                          </span>
                        </td>
                        <td class="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">
                          {{ tx.reference_no }}
                        </td>
                        <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {{ tx.description }}
                        </td>
                        <td class="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                          {{ tx.debit_amount > 0 ? '৳' + (tx.debit_amount | number:'1.2-2') : '—' }}
                        </td>
                        <td class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {{ tx.credit_amount > 0 ? '৳' + (tx.credit_amount | number:'1.2-2') : '—' }}
                        </td>
                        <td class="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                          ৳{{ tx.running_balance | number:'1.2-2' }}
                        </td>
                      </tr>
                    }
                  }
                </tbody>
                <tfoot class="bg-slate-100/80 dark:bg-slate-850 font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colspan="4" class="px-4 py-3 text-right uppercase tracking-wider text-xs">Total Net Realized</td>
                    <td class="px-4 py-3 text-right text-amber-600 dark:text-amber-400">৳{{ (ledger()?.total_billed || 0) | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">৳{{ (ledger()?.total_paid || 0) | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 text-right text-base" [ngClass]="(ledger()?.total_outstanding || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'">
                      ৳{{ (ledger()?.total_outstanding || 0) | number:'1.2-2' }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        } @else {
          <div class="text-center py-12 text-slate-400 bg-slate-50/50 dark:bg-slate-850/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <svg class="w-12 h-12 mx-auto text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="font-medium text-slate-600 dark:text-slate-300">No Customer Selected</p>
            <p class="text-xs text-slate-400 mt-1">Select a booking application from the searchable dropdown above to review customer statements.</p>
          </div>
        }
      </app-card-container>
    </div>
  `
})
export class CustomerLedgerViewComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private route = inject(ActivatedRoute);

  selectedBookingId: any = null;
  ledger = signal<CustomerLedgerSummary | null>(null);
  isLoading = signal<boolean>(false);

  ngOnInit(): void {
    const qBooking = this.route.snapshot.queryParamMap.get('booking_id');
    if (qBooking) {
      this.selectedBookingId = Number(qBooking);
      this.loadLedger();
    }
  }

  onBookingSelected(): void {
    if (this.selectedBookingId) {
      this.loadLedger();
    }
  }

  loadLedger(): void {
    if (!this.selectedBookingId) {
      alert('Please select a booking allotment');
      return;
    }
    this.isLoading.set(true);
    this.installmentService.getCustomerLedger(Number(this.selectedBookingId)).subscribe({
      next: (data) => {
        this.ledger.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        alert('Failed to load customer statement: ' + (err.error?.detail || err.message));
      }
    });
  }

  printStatement(): void {
    window.print();
  }
}
