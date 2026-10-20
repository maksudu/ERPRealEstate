import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetingService } from '../../../core/services/budgeting.service';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({
  selector: 'app-budget-vs-actual',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-5">
      <!-- Section 5 Context Alert -->
      <div class="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <div class="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <h4 class="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
            Budget vs Actual Cost Control Analytics
          </h4>
          <p class="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5 leading-relaxed">
            The figures are illustrative. A positive variance means spending is below budget; it does not necessarily mean the project is profitable or on schedule. Committed costs are shown separately and are not included in actual expenditure.
          </p>
        </div>
      </div>

      <app-card-container
        title="10.0 Budget vs Actual Expenditure & Variance Control"
        subtitle="Compare approved baselines against real certified expenditure and procurement obligations"
        badge="Variance Analysis"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="loadVariance()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Recalculate Variance</span>
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="mb-5 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div>
            <app-searchable-select
              label="Select Project"
              placeholder="Twin Tower Residential Project"
              categoryCode="REAL_ESTATE_PROJECT"
              [allowCreateNew]="true"
              (selectionChange)="onProjectSelected($event)"
            ></app-searchable-select>
          </div>
          <div>
            <app-searchable-select
              label="Select Cost Center"
              placeholder="All Cost Centers"
              categoryCode="COST_CENTER"
              [allowCreateNew]="true"
            ></app-searchable-select>
          </div>
        </div>

        <!-- Table 5 Matching User Prompt Exactly -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-5 py-3.5">Cost Category</th>
                <th class="px-5 py-3.5 font-mono">Budget</th>
                <th class="px-5 py-3.5 font-mono">Actual</th>
                <th class="px-5 py-3.5 font-mono">Committed (POs)</th>
                <th class="px-5 py-3.5">Variance Headroom</th>
                <th class="px-5 py-3.5">Burn Rate (%)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (item of varianceData()?.items; track item.cost_category) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                    {{ item.cost_category }}
                  </td>
                  <td class="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ (item.budget_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-5 py-3.5 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    ৳{{ (item.actual_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-5 py-3.5 font-mono text-blue-600 dark:text-blue-400">
                    ৳{{ (item.committed_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-5 py-3.5">
                    <span
                      class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
                      [ngClass]="item.variance_bdt >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'"
                    >
                      {{ item.variance_status }}
                    </span>
                  </td>
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-2">
                      <div class="w-20 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          class="bg-emerald-600 h-full rounded-full"
                          [style.width.%]="item.consumption_pct"
                        ></div>
                      </div>
                      <span class="font-mono font-semibold">{{ item.consumption_pct }}%</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
            <!-- Total Row Matching Section 5 Total: ৳12.00 Cr / ৳7.20 Cr / ৳4.80 Cr under -->
            @if (varianceData()?.totals; as t) {
              <tfoot class="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs">
                <tr>
                  <td class="px-5 py-3.5 text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    {{ t.cost_category }}
                  </td>
                  <td class="px-5 py-3.5 font-mono text-slate-900 dark:text-slate-100">
                    ৳{{ (t.budget_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-5 py-3.5 font-mono text-amber-600 dark:text-amber-400">
                    ৳{{ (t.actual_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-5 py-3.5 font-mono text-blue-600 dark:text-blue-400">
                    ৳{{ (t.committed_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-5 py-3.5">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {{ t.variance_status }}
                    </span>
                  </td>
                  <td class="px-5 py-3.5 font-mono font-bold text-emerald-600">
                    {{ t.consumption_pct }}% Consumed
                  </td>
                </tr>
              </tfoot>
            }
          </table>
        </div>

        <!-- Automated Controls Checklist Matching Prompt -->
        <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-850">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <span>Active Automated Budget Controls</span>
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2">
              <span class="text-emerald-500 font-bold text-sm">✓</span>
              <div>
                <p class="font-semibold text-slate-800 dark:text-slate-200">Threshold Warnings</p>
                <p class="text-[11px] text-slate-500">Alert triggers when expenditure reaches 80% and 95% of baseline</p>
              </div>
            </div>
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2">
              <span class="text-emerald-500 font-bold text-sm">✓</span>
              <div>
                <p class="font-semibold text-slate-800 dark:text-slate-200">Hard Requisition Locks</p>
                <p class="text-[11px] text-slate-500">Blocks or routes over-budget purchase requisitions for board approval</p>
              </div>
            </div>
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2">
              <span class="text-emerald-500 font-bold text-sm">✓</span>
              <div>
                <p class="font-semibold text-slate-800 dark:text-slate-200">Separated Commitments</p>
                <p class="text-[11px] text-slate-500">Committed POs shown distinct from cash expenditure</p>
              </div>
            </div>
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2">
              <span class="text-emerald-500 font-bold text-sm">✓</span>
              <div>
                <p class="font-semibold text-slate-800 dark:text-slate-200">Cost Overrun Alerts</p>
                <p class="text-[11px] text-slate-500">Instant notification to Executive Management on adverse variances</p>
              </div>
            </div>
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2">
              <span class="text-emerald-500 font-bold text-sm">✓</span>
              <div>
                <p class="font-semibold text-slate-800 dark:text-slate-200">Cost-to-Complete Forecast</p>
                <p class="text-[11px] text-slate-500">Predicts total project cost at completion based on certified run-rate</p>
              </div>
            </div>
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2">
              <span class="text-emerald-500 font-bold text-sm">✓</span>
              <div>
                <p class="font-semibold text-slate-800 dark:text-slate-200">Over-Budget Isolation</p>
                <p class="text-[11px] text-slate-500">Highlights towers, floors and work categories exceeding budget limits</p>
              </div>
            </div>
          </div>
        </div>
      </app-card-container>
    </div>
  `
})
export class BudgetVsActualComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  varianceData = signal<any>(null);

  ngOnInit() {
    this.loadVariance();
  }

  loadVariance(projectId?: number) {
    this.budgetingService.getBudgetVsActual(projectId).subscribe({
      next: (res) => this.varianceData.set(res)
    });
  }

  onProjectSelected(event: any) {
    const pid = event ? Number(event.id || event.value || event) : undefined;
    this.loadVariance(pid);
  }
}
