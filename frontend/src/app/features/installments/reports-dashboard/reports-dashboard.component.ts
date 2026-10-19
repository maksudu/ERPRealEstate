import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { InstallmentReportsSummary } from '../../../core/models/installment.model';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';

@Component({
  selector: 'app-installment-reports-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent
  ],
  template: `
    <div class="space-y-4">
      <app-card-container
        title="12. Installment & Collection Reports & Executive Cockpit"
        subtitle="Real-time macro analytics: collection summary, overdue recovery metrics, 6-month cashflow forecast, and downloadable statutory reports"
        badge="Submodule 12"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button
            variant="outline"
            size="sm"
            (btnClick)="printReports()"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Print Executive Summary
          </app-button>
        </div>

        @if (isLoading()) {
          <div class="text-center py-12 text-slate-500">
            <div class="inline-flex items-center gap-2">
              <svg class="animate-spin h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span class="text-sm font-semibold">Aggregating real-time financial collection analytics...</span>
            </div>
          </div>
        } @else {
          <!-- Macro KPI Strip -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Realized Collection</span>
              <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                ৳{{ (stats()?.total_collected || 0) | number:'1.2-2' }}
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                Efficiency: <span class="font-bold text-emerald-600">{{ stats()?.collection_efficiency_percent }}%</span>
              </div>
            </div>

            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Billed Milestones</span>
              <div class="text-xl font-bold text-slate-900 dark:text-white mt-1">
                ৳{{ (stats()?.total_billed || 0) | number:'1.2-2' }}
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                Paid: ৳{{ (stats()?.total_paid || 0) | number:'1.0-0' }}
              </div>
            </div>

            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Overdue Arrears</span>
              <div class="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                ৳{{ (stats()?.total_overdue || 0) | number:'1.2-2' }}
              </div>
              <div class="text-[11px] text-rose-500 mt-0.5">Requires Recovery Officer Action</div>
            </div>

            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Due This Current Month</span>
              <div class="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                ৳{{ (stats()?.due_this_month || 0) | number:'1.2-2' }}
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">Upcoming Pipeline</div>
            </div>
          </div>

          <!-- Payment Channel Breakdown & Cashflow Forecast -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <!-- Channel Breakdown Card -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3">Collection by Payment Mode / Instrument</h3>
              <div class="space-y-3">
                <!-- Bank Transfer -->
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-medium text-slate-700 dark:text-slate-300">Bank Transfer / BEFTN / RTGS</span>
                    <span class="font-bold text-slate-900 dark:text-white">৳{{ (stats()?.bank_collected || 0) | number:'1.2-2' }}</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" [style.width.%]="getPercent(stats()?.bank_collected)"></div>
                  </div>
                </div>

                <!-- Cheque / PDC -->
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-medium text-slate-700 dark:text-slate-300">Cheque / Pay Order Realization</span>
                    <span class="font-bold text-slate-900 dark:text-white">৳{{ (stats()?.cheque_collected || 0) | number:'1.2-2' }}</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div class="bg-emerald-600 h-2 rounded-full" [style.width.%]="getPercent(stats()?.cheque_collected)"></div>
                  </div>
                </div>

                <!-- Cash -->
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-medium text-slate-700 dark:text-slate-300">Direct Cash Counter Receipt</span>
                    <span class="font-bold text-slate-900 dark:text-white">৳{{ (stats()?.cash_collected || 0) | number:'1.2-2' }}</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div class="bg-amber-600 h-2 rounded-full" [style.width.%]="getPercent(stats()?.cash_collected)"></div>
                  </div>
                </div>

                <!-- Digital MFS -->
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-medium text-slate-700 dark:text-slate-300">Digital MFS (bKash / Nagad)</span>
                    <span class="font-bold text-slate-900 dark:text-white">৳{{ (stats()?.digital_collected || 0) | number:'1.2-2' }}</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div class="bg-pink-600 h-2 rounded-full" [style.width.%]="getPercent(stats()?.digital_collected)"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 6-Month Forecast Card -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3">6-Month Projected Collection Forecast</h3>
              <div class="space-y-3">
                @for (fc of stats()?.monthly_forecast; track fc.month) {
                  <div>
                    <div class="flex items-center justify-between text-xs mb-1">
                      <span class="font-medium text-slate-700 dark:text-slate-300">{{ fc.month }}</span>
                      <span class="font-bold text-emerald-600 dark:text-emerald-400">৳{{ fc.expected_amount | number:'1.2-2' }}</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div class="bg-emerald-500 h-2 rounded-full" [style.width.%]="Math.min(100, (fc.expected_amount / ((stats()?.total_billed || 1) / 3)) * 100)"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Report Quick Action Links -->
          <div class="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              Statutory Bangladesh Real Estate Financial Reports
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <a
                routerLink="/installments/collections"
                class="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-750 hover:border-emerald-500 transition-all flex items-center justify-between group"
              >
                <div>
                  <div class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">Collection Summary Report</div>
                  <div class="text-[11px] text-slate-500">Daily, monthly & instrument realization</div>
                </div>
                <svg class="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>

              <a
                routerLink="/installments/due-overdue"
                class="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-750 hover:border-emerald-500 transition-all flex items-center justify-between group"
              >
                <div>
                  <div class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">Overdue Aging Report</div>
                  <div class="text-[11px] text-slate-500">1-30, 31-60, 61-90, 90+ days aging</div>
                </div>
                <svg class="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>

              <a
                routerLink="/installments/customer-ledger"
                class="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-750 hover:border-emerald-500 transition-all flex items-center justify-between group"
              >
                <div>
                  <div class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">Customer Outstanding Ledger</div>
                  <div class="text-[11px] text-slate-500">Buyer-wise statement & balance tracking</div>
                </div>
                <svg class="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>

              <a
                routerLink="/installments/payment-setup"
                class="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-750 hover:border-emerald-500 transition-all flex items-center justify-between group"
              >
                <div>
                  <div class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">Payment Plan Audit Report</div>
                  <div class="text-[11px] text-slate-500">Approved vs custom schedule variances</div>
                </div>
                <svg class="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>

              <a
                routerLink="/installments/cheques"
                class="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-750 hover:border-emerald-500 transition-all flex items-center justify-between group"
              >
                <div>
                  <div class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">PDC Safe Register & Bounced Cheques</div>
                  <div class="text-[11px] text-slate-500">Dishonour tracking & NI Act 138 actions</div>
                </div>
                <svg class="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>

              <a
                routerLink="/installments/down-payment"
                class="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-750 hover:border-emerald-500 transition-all flex items-center justify-between group"
              >
                <div>
                  <div class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">Down Payment Recovery Report</div>
                  <div class="text-[11px] text-slate-500">Allotment balance & booking adjustments</div>
                </div>
                <svg class="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </div>
        }
      </app-card-container>
    </div>
  `
})
export class InstallmentReportsDashboardComponent implements OnInit {
  private installmentService = inject(InstallmentService);

  stats = signal<InstallmentReportsSummary | null>(null);
  isLoading = signal<boolean>(false);
  Math = Math;

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading.set(true);
    this.installmentService.getReportsSummary().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  getPercent(amount?: number): number {
    const total = this.stats()?.total_collected || 1;
    return Math.min(100, Math.round(((amount || 0) / total) * 100));
  }

  printReports(): void {
    window.print();
  }
}
