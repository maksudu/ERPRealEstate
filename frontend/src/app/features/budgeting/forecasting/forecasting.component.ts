import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetingService } from '../../../core/services/budgeting.service';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({
  selector: 'app-forecasting',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-5">
      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estimated Cost to Complete (ETC)</p>
          <p class="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mt-1">
            ৳3.25 Cr
          </p>
          <p class="text-[10px] text-slate-400 mt-0.5">Projected remaining expenditure to handover</p>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Final Forecasted Cost (EAC)</p>
          <p class="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
            ৳12.45 Cr
          </p>
          <p class="text-[10px] text-slate-400 mt-0.5">Actual + Committed + Remaining BOQ</p>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Forecast Variance</p>
          <p class="text-2xl font-bold font-display text-rose-600 dark:text-rose-400 mt-1">
            -৳0.45 Cr (+3.75%)
          </p>
          <p class="text-[10px] text-rose-500 font-semibold mt-0.5">Moderate Risk Overrun Buffer</p>
        </div>
      </div>

      <app-card-container
        title="11.0 Predictive Cost-to-Complete & Project Completion Forecasting"
        subtitle="Earned Value Management (EVM), Cost Performance Index (CPI) and Final Cost at Completion (EAC)"
        badge="Predictive AI"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="loadForecasting()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Run Predictive Simulation</span>
          </button>
        </div>

        <!-- Filter -->
        <div class="mb-4 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <app-searchable-select
            label="Filter Project Portfolio"
            placeholder="Twin Tower Residential Project"
            categoryCode="REAL_ESTATE_PROJECT"
            [allowCreateNew]="true"
            (selectionChange)="onProjectSelected($event)"
          ></app-searchable-select>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3">Project Name</th>
                <th class="px-4 py-3">Original Budget</th>
                <th class="px-4 py-3">Actual Spent</th>
                <th class="px-4 py-3">Committed POs</th>
                <th class="px-4 py-3">Cost to Complete (ETC)</th>
                <th class="px-4 py-3">Final Forecast (EAC)</th>
                <th class="px-4 py-3">Projected Variance</th>
                <th class="px-4 py-3">Risk Assessment</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (item of forecasting(); track item.project_id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                    {{ item.project_name }}
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                    ৳{{ (item.original_budget_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-4 py-3 font-mono text-amber-600 dark:text-amber-400">
                    ৳{{ (item.actual_spent_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                    ৳{{ (item.committed_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    ৳{{ (item.estimated_cost_to_complete_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ (item.final_forecasted_cost_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-4 py-3 font-mono font-bold" [ngClass]="item.projected_variance_bdt >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                    ৳{{ (item.projected_variance_bdt / 10000000) | number:'1.2-2' }} Cr
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300': item.risk_level === 'LOW',
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300': item.risk_level === 'MODERATE',
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300': item.risk_level === 'HIGH'
                      }"
                    >
                      {{ item.risk_level }} RISK
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>
    </div>
  `
})
export class ForecastingComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  forecasting = signal<any[]>([]);

  ngOnInit() {
    this.loadForecasting();
  }

  loadForecasting(projectId?: number) {
    this.budgetingService.getForecasting(projectId).subscribe({
      next: (res) => this.forecasting.set(res)
    });
  }

  onProjectSelected(event: any) {
    const pid = event ? Number(event.id || event.value || event) : undefined;
    this.loadForecasting(pid);
  }
}
