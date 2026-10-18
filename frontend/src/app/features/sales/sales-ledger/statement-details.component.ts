import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { CustomerStatement, CustomerSalesLedgerEntry, CustomerPropertyLedgerSummary } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomButtonComponent
} from '../../../shared/components';

@Component({
  selector: 'app-statement-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/ledger"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Sales Subledger"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Spec 5.8 · Customer Statement Dossier
              </span>
              <span class="text-xs font-mono text-muted-foreground">{{ statement()?.customer_code || 'CUST-' + customerId() }}</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ statement()?.customer_name || 'Loading Statement...' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button
            (click)="exportPdf()"
            [disabled]="isExportingPdf()"
            class="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            {{ isExportingPdf() ? 'Exporting...' : 'Export Statement PDF' }}
          </button>

          <button
            (click)="exportExcel()"
            [disabled]="isExportingExcel()"
            class="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            {{ isExportingExcel() ? 'Downloading...' : 'Export CSV / Excel' }}
          </button>

          <a
            [routerLink]="['/sales/ledger/adjustments/create']"
            [queryParams]="{ customer_id: customerId(), booking_id: selectedBookingId() }"
            class="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            + Record Adjustment
          </a>
        </div>
      </div>

      @if (isLoading()) {
        <div class="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
          <svg class="w-8 h-8 animate-spin mx-auto text-primary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Loading customer sales statement...
        </div>
      } @else if (statement()) {
        <!-- Customer & Multi-Property Overview Header Card -->
        <div class="bg-card border border-border rounded-xl p-5 shadow-xs">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <span class="text-xs text-muted-foreground block">Customer Account</span>
              <strong class="text-foreground text-sm block mt-0.5">{{ statement()?.customer_name }}</strong>
              <span class="text-xs text-muted-foreground">{{ statement()?.customer_phone }}</span>
              <span class="text-xs text-muted-foreground block truncate">{{ statement()?.customer_email || 'No email' }}</span>
            </div>

            <div>
              <span class="text-xs text-muted-foreground block">Mailing / Notice Address</span>
              <span class="text-xs text-foreground block mt-0.5 font-medium">{{ statement()?.address || 'Dhaka, Bangladesh' }}</span>
              <span class="text-xs text-muted-foreground mt-1 block">GL Account: <strong>1200-AR-FLAT-SALES</strong></span>
            </div>

            <div>
              <span class="text-xs text-muted-foreground block">Portfolio Ownership</span>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border">
                  {{ statement()?.total_properties }} Properties
                </span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {{ statement()?.reconciliation_status }}
                </span>
              </div>
              <span class="text-[11px] text-muted-foreground mt-1 block">Consolidated Customer Subledger</span>
            </div>

            <div>
              <span class="text-xs text-muted-foreground block">Statement Timestamp</span>
              <span class="text-xs font-mono font-medium text-foreground block mt-0.5">
                {{ statement()?.generated_at | date:'dd MMM yyyy, hh:mm a' }}
              </span>
              <span class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block font-medium">
                100% GL Subledger Reconciled
              </span>
            </div>
          </div>
        </div>

        <!-- 4 Spec-Defined Financial Totals -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Contract Value</span>
            <div class="text-xl font-bold font-mono text-foreground mt-1">
              ৳{{ formatCurrency(statement()?.total_contract_value || 0) }}
            </div>
            <span class="text-[11px] text-muted-foreground mt-0.5 block">Approved contractual sale price</span>
          </div>

          <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Billed Charges</span>
            <div class="text-xl font-bold font-mono text-primary mt-1">
              ৳{{ formatCurrency(statement()?.total_debits || 0) }}
            </div>
            <span class="text-[11px] text-muted-foreground mt-0.5 block">Contract charges, invoices & fees</span>
          </div>

          <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Receipts Cleared</span>
            <div class="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              ৳{{ formatCurrency(statement()?.total_credits || 0) }}
            </div>
            <span class="text-[11px] text-muted-foreground mt-0.5 block">Cleared booking, down payment & installments</span>
          </div>

          <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Net Balance Due</span>
            <div class="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              ৳{{ formatCurrency(statement()?.net_balance_due || 0) }}
            </div>
            <span class="text-[11px] text-muted-foreground mt-0.5 block">Total outstanding receivable</span>
          </div>
        </div>

        <!-- Spec Overdue Aging Buckets Bar -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-foreground uppercase tracking-wider">Due-Date & Overdue Ageing Analysis</span>
            <span class="text-xs font-mono text-muted-foreground">Spec 5.8 Ageing Engine</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block uppercase">Current / Not Due</span>
              <span class="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                ৳{{ formatCurrency(statement()?.aging_summary?.current_not_due || 0) }}
              </span>
            </div>

            <div class="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
              <span class="text-[10px] text-blue-700 dark:text-blue-400 font-semibold block uppercase">1 - 30 Days</span>
              <span class="text-sm font-mono font-bold text-blue-700 dark:text-blue-400 mt-0.5 block">
                ৳{{ formatCurrency(statement()?.aging_summary?.overdue_1_30 || 0) }}
              </span>
            </div>

            <div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
              <span class="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block uppercase">31 - 60 Days</span>
              <span class="text-sm font-mono font-bold text-amber-700 dark:text-amber-400 mt-0.5 block">
                ৳{{ formatCurrency(statement()?.aging_summary?.overdue_31_60 || 0) }}
              </span>
            </div>

            <div class="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
              <span class="text-[10px] text-orange-700 dark:text-orange-400 font-semibold block uppercase">61 - 90 Days</span>
              <span class="text-sm font-mono font-bold text-orange-700 dark:text-orange-400 mt-0.5 block">
                ৳{{ formatCurrency(statement()?.aging_summary?.overdue_61_90 || 0) }}
              </span>
            </div>

            <div class="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
              <span class="text-[10px] text-rose-700 dark:text-rose-400 font-semibold block uppercase">90+ Days Overdue</span>
              <span class="text-sm font-mono font-bold text-rose-700 dark:text-rose-400 mt-0.5 block">
                ৳{{ formatCurrency(statement()?.aging_summary?.overdue_over_90 || 0) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Multi-Property View Tabs -->
        @if ((statement()?.properties?.length || 0) > 1) {
          <div class="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              (click)="selectPropertyFilter(undefined)"
              class="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0"
              [ngClass]="selectedBookingId() === undefined ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-card border border-border text-foreground hover:bg-secondary'"
            >
              Combined Account (All {{ statement()?.properties?.length }} Properties)
            </button>

            @for (prop of statement()?.properties; track prop.booking_id) {
              <button
                (click)="selectPropertyFilter(prop.booking_id)"
                class="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5"
                [ngClass]="selectedBookingId() === prop.booking_id ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-card border border-border text-foreground hover:bg-secondary'"
              >
                <span>{{ prop.project_name }} &bull; Unit {{ prop.unit_number }}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10">
                  {{ prop.booking_reference_no }}
                </span>
              </button>
            }
          </div>
        }

        <!-- Property Allotment Ledger Cards -->
        <app-card title="Property Portfolio Allocation" subtitle="Breakdown of contract prices, cleared payments, and balances across each allotted property">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (prop of statement()?.properties; track prop.booking_id) {
              <div class="bg-card border border-border rounded-xl p-4 shadow-2xs hover:border-primary/40 transition-colors">
                <div class="flex items-center justify-between pb-2 border-b border-border">
                  <span class="text-xs font-mono font-bold text-primary">{{ prop.booking_reference_no }}</span>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                    {{ prop.status }}
                  </span>
                </div>
                <div class="mt-3 space-y-1.5 text-xs">
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Property:</span>
                    <strong class="text-foreground">{{ prop.project_name }}</strong>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Unit Number:</span>
                    <strong class="text-foreground font-mono">{{ prop.unit_number }}</strong>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Contract Value:</span>
                    <span class="font-mono font-bold text-foreground">৳{{ formatCurrency(prop.contract_value) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Cleared Receipts:</span>
                    <span class="font-mono font-bold text-emerald-600">৳{{ formatCurrency(prop.total_paid) }}</span>
                  </div>
                  <div class="flex justify-between pt-1 border-t border-border">
                    <span class="text-muted-foreground font-bold">Balance Due:</span>
                    <span class="font-mono font-bold text-amber-600">৳{{ formatCurrency(prop.balance_due) }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </app-card>

        <!-- Chronological Sales Subledger Statement Table -->
        <app-card title="Chronological Statement of Account" subtitle="Official transactional debit charges, receipts, and running balance audit trail">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-foreground border-collapse">
              <thead>
                <tr class="border-b border-border bg-secondary/30 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th class="py-3 px-3 w-28">Date</th>
                  <th class="py-3 px-3">Entry No</th>
                  <th class="py-3 px-3">Transaction</th>
                  <th class="py-3 px-4">Description & Instrument Ref</th>
                  <th class="py-3 px-3 text-right">Debit / Charge (৳)</th>
                  <th class="py-3 px-3 text-right">Credit / Receipt (৳)</th>
                  <th class="py-3 px-3 text-right">Running Balance Due (৳)</th>
                  <th class="py-3 px-3 text-center">GL Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (entry of statement()?.entries; track entry.id) {
                  <tr class="hover:bg-secondary/20 transition-colors">
                    <td class="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap">
                      {{ entry.transaction_date | date:'dd MMM yyyy' }}
                    </td>

                    <td class="py-3 px-3 font-mono font-bold text-foreground whitespace-nowrap">
                      {{ entry.entry_number }}
                    </td>

                    <td class="py-3 px-3 whitespace-nowrap">
                      <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        [ngClass]="{
                          'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20': entry.transaction_type === 'CONTRACT_CHARGE' || entry.transaction_type === 'INSTALLMENT_INVOICE',
                          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20': entry.transaction_type === 'BOOKING_MONEY' || entry.transaction_type === 'DOWN_PAYMENT' || entry.transaction_type === 'RECEIPT',
                          'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20': entry.transaction_type === 'CREDIT_NOTE' || entry.transaction_type === 'ADJUSTMENT',
                          'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20': entry.transaction_type === 'REFUND_REVERSAL' || entry.transaction_type === 'LATE_FEE'
                        }">
                        {{ entry.transaction_type.replace('_', ' ') }}
                      </span>
                    </td>

                    <td class="py-3 px-4">
                      <div class="font-bold text-foreground">{{ entry.description }}</div>
                      @if (entry.reference_no) {
                        <span class="text-[10px] font-mono text-muted-foreground block">Ref: {{ entry.reference_no }}</span>
                      }
                      @if (entry.booking_reference_no) {
                        <span class="text-[10px] text-primary block">{{ entry.project_name }} · {{ entry.unit_number }}</span>
                      }
                    </td>

                    <td class="py-3 px-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      @if (entry.debit_amount > 0) {
                        ৳{{ formatCurrency(entry.debit_amount) }}
                      } @else {
                        <span class="text-muted-foreground">—</span>
                      }
                    </td>

                    <td class="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      @if (entry.credit_amount > 0) {
                        ৳{{ formatCurrency(entry.credit_amount) }}
                      } @else {
                        <span class="text-muted-foreground">—</span>
                      }
                    </td>

                    <td class="py-3 px-3 text-right font-mono font-bold whitespace-nowrap"
                      [ngClass]="entry.running_balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'">
                      ৳{{ formatCurrency(entry.running_balance) }}
                    </td>

                    <td class="py-3 px-3 text-center whitespace-nowrap">
                      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        [ngClass]="{
                          'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20': entry.reconciliation_status === 'RECONCILED',
                          'bg-amber-500/10 text-amber-600 border border-amber-500/20': entry.reconciliation_status === 'PENDING_POSTING',
                          'bg-rose-500/10 text-rose-600 border border-rose-500/20': entry.reconciliation_status === 'DISCREPANCY'
                        }">
                        {{ entry.reconciliation_status }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-card>
      }
    </div>
  `
})
export class StatementDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private salesService = inject(SalesService);

  customerId = signal<number>(0);
  selectedBookingId = signal<number | undefined>(undefined);
  statement = signal<CustomerStatement | null>(null);
  isLoading = signal<boolean>(true);
  isExportingPdf = signal<boolean>(false);
  isExportingExcel = signal<boolean>(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.customerId.set(Number(id));
        this.route.queryParamMap.subscribe(qp => {
          const bId = qp.get('booking_id');
          this.selectedBookingId.set(bId ? Number(bId) : undefined);
          this.loadStatement();
        });
      }
    });
  }

  loadStatement(): void {
    this.isLoading.set(true);
    this.salesService.getCustomerStatement(this.customerId(), this.selectedBookingId()).subscribe({
      next: (res) => {
        this.statement.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load customer statement:', err);
        this.isLoading.set(false);
      }
    });
  }

  selectPropertyFilter(bookingId?: number): void {
    this.selectedBookingId.set(bookingId);
    this.loadStatement();
  }

  exportPdf(): void {
    this.isExportingPdf.set(true);
    this.salesService.exportCustomerStatementPdf(this.customerId(), this.selectedBookingId()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Statement_Customer_${this.customerId()}.html`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isExportingPdf.set(false);
      },
      error: (err) => {
        console.error('Failed to export PDF statement:', err);
        this.isExportingPdf.set(false);
        alert('Failed to export statement.');
      }
    });
  }

  exportExcel(): void {
    this.isExportingExcel.set(true);
    this.salesService.exportCustomerStatementExcel(this.customerId(), this.selectedBookingId()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Statement_Customer_${this.customerId()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isExportingExcel.set(false);
      },
      error: (err) => {
        console.error('Failed to export Excel statement:', err);
        this.isExportingExcel.set(false);
        alert('Failed to export CSV statement.');
      }
    });
  }

  formatCurrency(num: number): string {
    return Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
