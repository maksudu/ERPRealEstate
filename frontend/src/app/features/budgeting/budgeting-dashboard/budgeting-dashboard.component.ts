import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetingService } from '../../../core/services/budgeting.service';
import { BudgetingNavComponent } from '../budgeting-nav/budgeting-nav.component';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({
  selector: 'app-budgeting-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BudgetingNavComponent,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-5">
      <app-budgeting-nav activeCode="1.0"></app-budgeting-nav>

      <!-- KPI Overview Cards Matching Bangladesh Real Estate Standards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Approved Budget</p>
          <p class="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
            ৳{{ (summary()?.approved_budget_bdt / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[10px] text-slate-400 mt-0.5">Total locked baseline for projects</p>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actual Expenditure</p>
          <p class="text-2xl font-bold font-display text-amber-600 dark:text-amber-400 mt-1">
            ৳{{ (summary()?.actual_expenditure_bdt / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[10px] text-slate-400 mt-0.5">Certified bills & paid expenses</p>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Committed Costs</p>
          <p class="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mt-1">
            ৳{{ (summary()?.committed_costs_bdt / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[10px] text-slate-400 mt-0.5">Active Purchase Orders & contracts</p>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available Budget</p>
          <p class="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">
            ৳{{ (summary()?.available_budget_bdt / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[10px] text-emerald-500 font-medium mt-0.5">Remaining uncommitted headroom</p>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Consumed by Actuals</p>
          <p class="text-2xl font-bold font-display text-purple-600 dark:text-purple-400 mt-1">
            {{ summary()?.budget_consumed_pct }}%
          </p>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              [ngClass]="summary()?.budget_consumed_pct > 80 ? 'bg-rose-500' : 'bg-purple-500'"
              [style.width.%]="summary()?.budget_consumed_pct"
            ></div>
          </div>
        </div>
      </div>

      <!-- Main Cockpit Section -->
      <app-card-container
        title="1.0 Budgeting & Cost Control Cockpit"
        subtitle="Cross-project expenditure monitoring, commitment verification and baseline budget variance"
        badge="Executive Cockpit"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="refreshData()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Sync Live</span>
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div>
            <app-searchable-select
              label="Filter by Project"
              placeholder="All Projects..."
              categoryCode="REAL_ESTATE_PROJECT"
              (selectionChange)="onProjectSelected($event)"
              [allowCreateNew]="true"
            ></app-searchable-select>
          </div>
          <div>
            <app-searchable-select
              label="Cost Center"
              placeholder="All Cost Centers..."
              categoryCode="COST_CENTER"
              [allowCreateNew]="true"
            ></app-searchable-select>
          </div>
          <div>
            <app-searchable-select
              label="Fiscal Year"
              placeholder="2025-2026"
              categoryCode="FISCAL_YEAR"
              [allowCreateNew]="true"
            ></app-searchable-select>
          </div>
        </div>

        <!-- Category Wise Variance & Progress -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <!-- Cost Category Breakdown -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
              <span>Category-Wise Budget Utilization</span>
              <span class="text-[10px] text-slate-400 font-normal">Amounts in Lakh (BDT)</span>
            </h3>

            <div class="space-y-3">
              @for (cat of summary()?.category_breakdown; track cat.category) {
                <div class="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-semibold text-slate-800 dark:text-slate-200">{{ cat.category }}</span>
                    <span class="font-mono text-slate-600 dark:text-slate-400">
                      ৳{{ (cat.actual_bdt / 100000) | number:'1.1-1' }}L / ৳{{ (cat.budget_bdt / 100000) | number:'1.1-1' }}L
                      <span class="text-[11px] font-semibold text-emerald-600 ml-1">({{ cat.consumption_pct }}%)</span>
                    </span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      class="bg-amber-500 h-full rounded-l-full"
                      [style.width.%]="cat.consumption_pct"
                      title="Actual Spent"
                    ></div>
                    <div
                      class="bg-blue-400 h-full opacity-60"
                      [style.width.%]="(cat.committed_bdt / (cat.budget_bdt || 1)) * 100"
                      title="Committed POs"
                    ></div>
                  </div>
                  <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>Variance Headroom: ৳{{ (cat.variance_bdt / 100000) | number:'1.1-1' }} Lakh</span>
                    <span>Committed: ৳{{ (cat.committed_bdt / 100000) | number:'1.1-1' }} Lakh</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Monthly Trend Simulation -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                <span>Monthly Budget vs Actual Burn Rate</span>
                <span class="text-[10px] text-slate-400 font-normal">Last 6 Months (BDT)</span>
              </h3>
              
              <div class="grid grid-cols-6 gap-2 h-44 items-end pt-6 px-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                @for (m of summary()?.monthly_trend; track m.month) {
                  <div class="flex flex-col items-center gap-1.5 h-full justify-end">
                    <div class="w-full flex items-end justify-center gap-1 h-32">
                      <div
                        class="w-3.5 bg-slate-200 dark:bg-slate-700 rounded-t"
                        [style.height.%]="(m.budget / 16000000) * 100"
                        title="Budget: ৳{{ m.budget }}"
                      ></div>
                      <div
                        class="w-3.5 bg-emerald-600 rounded-t"
                        [style.height.%]="(m.actual / 16000000) * 100"
                        title="Actual: ৳{{ m.actual }}"
                      ></div>
                    </div>
                    <span class="text-[10px] font-medium text-slate-500 font-mono">{{ m.month }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="flex items-center justify-center gap-6 pt-3 text-xs text-slate-600 dark:text-slate-400">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded bg-slate-300 dark:bg-slate-700"></span>
                <span>Planned Budget Burn</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded bg-emerald-600"></span>
                <span>Actual Certified Burn</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Project Wise Summary Table -->
        <div class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div class="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Project Development Budget Portfolios
            </h4>
            <span class="text-[11px] text-slate-500">Committed costs shown separately from actual expenditure</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3">Project Name & Code</th>
                  <th class="px-4 py-3">Approved Budget</th>
                  <th class="px-4 py-3">Actual Expenditure</th>
                  <th class="px-4 py-3">Committed Costs</th>
                  <th class="px-4 py-3">Available Budget</th>
                  <th class="px-4 py-3">Utilization</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                @for (p of summary()?.project_summaries; track p.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {{ p.project_name }}
                      <span class="block text-[10px] text-slate-400 font-mono font-normal">{{ p.project_code }}</span>
                    </td>
                    <td class="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      ৳{{ (p.approved_budget / 10000000) | number:'1.2-2' }} Cr
                    </td>
                    <td class="px-4 py-3 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      ৳{{ (p.actual_spent / 10000000) | number:'1.2-2' }} Cr
                    </td>
                    <td class="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                      ৳{{ (p.committed_cost / 10000000) | number:'1.2-2' }} Cr
                    </td>
                    <td class="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ৳{{ (p.available_budget / 10000000) | number:'1.2-2' }} Cr
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div class="bg-purple-600 h-full rounded-full" [style.width.%]="p.consumption_pct"></div>
                        </div>
                        <span class="text-[11px] font-semibold">{{ p.consumption_pct }}%</span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </app-card-container>
    </div>
  `
})
export class BudgetingDashboardComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  summary = signal<any>(null);

  ngOnInit() {
    this.refreshData();
  }

  refreshData(projectId?: number) {
    this.budgetingService.getDashboardSummary(projectId).subscribe({
      next: (data) => this.summary.set(data),
      error: (err) => console.error('Failed to load budget summary', err)
    });
  }

  onProjectSelected(event: any) {
    const pid = event ? Number(event.id || event.value || event) : undefined;
    this.refreshData(pid);
  }
}
