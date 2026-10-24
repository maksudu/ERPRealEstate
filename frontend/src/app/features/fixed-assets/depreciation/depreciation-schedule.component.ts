import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FixedAssetsService, AssetDepreciationScheduleItem } from '../../../core/services/fixed-assets.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-depreciation-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <!-- Top Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Monthly Depreciation Charge</div>
          <div class="mt-2 text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
            ৳ {{ totalMonthlyDep | number:'1.2-2' }}
          </div>
          <div class="mt-1 text-xs text-indigo-600 font-medium">Automatic debit to Account 5210</div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projected Annual Depreciation</div>
          <div class="mt-2 text-2xl font-bold font-display text-amber-600 dark:text-amber-400">
            ৳ {{ totalAnnualDep | number:'1.2-2' }}
          </div>
          <div class="mt-1 text-xs text-slate-500">Fiscal Year {{ selectedFiscalYear }}</div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">GL Posting & Audit Status</div>
          <div class="mt-2 flex items-center gap-2">
            <span class="inline-flex px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              POSTED TO GL
            </span>
          </div>
          <div class="mt-1 text-xs text-slate-500">Voucher: JV-DEP-2025-Q1 (Balanced)</div>
        </div>
      </div>

      <!-- Main Schedule Card -->
      <app-card title="Depreciation Schedule & General Ledger Allocation" subtitle="Detailed month-wise straight line & WDV depreciation schedule for active assets">
        <div card-actions class="flex items-center gap-2">
          <div class="w-44">
            <app-searchable-select
              categoryCode="FISCAL_YEAR"
              label=""
              placeholder="Fiscal Year"
              [(ngModel)]="selectedFiscalYear"
              (ngModelChange)="loadSchedule()"
              [options]="fiscalYearOptions"
              [allowCreateNew]="false"
            />
          </div>
        </div>

        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Asset Tag</th>
                <th class="p-3">Asset Name</th>
                <th class="p-3">Category</th>
                <th class="p-3">Method</th>
                <th class="p-3 text-right">Annual Rate</th>
                <th class="p-3 text-right">Monthly Dep.</th>
                <th class="p-3 text-right">Annual Dep.</th>
                <th class="p-3 text-right">Accumulated</th>
                <th class="p-3 text-right">Net Book Value</th>
                <th class="p-3">GL Account Code</th>
                <th class="p-3 text-center">GL Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="11" class="p-6 text-center text-slate-400">Loading depreciation schedule...</td>
                </tr>
              } @else if (schedule.length === 0) {
                <tr>
                  <td colspan="11" class="p-6 text-center text-slate-400">No active assets scheduled for depreciation.</td>
                </tr>
              } @else {
                @for (item of schedule; track item.asset_id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {{ item.asset_tag }}
                    </td>
                    <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {{ item.asset_name }}
                    </td>
                    <td class="p-3 text-[11px] text-slate-500">{{ item.category }}</td>
                    <td class="p-3 font-mono text-[10px]">{{ item.depreciation_method }}</td>
                    <td class="p-3 text-right font-medium">{{ item.annual_rate_percent }}%</td>
                    <td class="p-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      ৳ {{ item.monthly_depreciation_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      ৳ {{ item.annual_depreciation_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right text-amber-600 font-medium">
                      ৳ {{ item.accumulated_depreciation_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ৳ {{ item.net_book_value_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 font-mono text-[10px] text-slate-500">{{ item.gl_account_code }}</td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                        POSTED
                      </span>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </app-card>
    </div>
  `
})
export class DepreciationScheduleComponent implements OnInit {
  private service = inject(FixedAssetsService);

  schedule: AssetDepreciationScheduleItem[] = [];
  selectedFiscalYear = '2025-2026';
  loading = false;

  fiscalYearOptions: SelectOption[] = [
    { value: '2025-2026', label: 'FY 2025-2026' },
    { value: '2024-2025', label: 'FY 2024-2025' }
  ];

  get totalMonthlyDep(): number {
    return this.schedule.reduce((acc, curr) => acc + curr.monthly_depreciation_bdt, 0);
  }

  get totalAnnualDep(): number {
    return this.schedule.reduce((acc, curr) => acc + curr.annual_depreciation_bdt, 0);
  }

  ngOnInit(): void {
    this.loadSchedule();
  }

  loadSchedule(): void {
    this.loading = true;
    this.service.getDepreciationSchedule(this.selectedFiscalYear).subscribe({
      next: (data) => {
        this.schedule = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load depreciation schedule', err);
        this.loading = false;
      }
    });
  }
}
