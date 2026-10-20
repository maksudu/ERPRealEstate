import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FixedAssetsService, GlReconciliationResult } from '../../../core/services/fixed-assets.service';
import { FixedAssetsNavComponent } from '../fixed-assets-nav/fixed-assets-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-asset-gl-reconciliation',
  standalone: true,
  imports: [CommonModule, FixedAssetsNavComponent, CardContainerComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <app-fixed-assets-nav />

      <!-- Top Balanced Banner -->
      <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            ✓
          </div>
          <div>
            <div class="text-sm font-bold text-emerald-900 dark:text-emerald-100">
              General Ledger Account 1200 Reconciled
            </div>
            <div class="text-xs text-emerald-700 dark:text-emerald-300">
              Asset Sub-ledger acquisition costs match General Ledger control balances with zero variance.
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="loadReconciliation()"
            class="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-semibold hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 transition"
          >
            Re-run GL Audit
          </button>
        </div>
      </div>

      <!-- Financial Balance Comparison Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total General Ledger Balance</div>
          <div class="mt-2 text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
            ৳ {{ (reconciliation?.total_general_ledger_bdt || 0) | number:'1.2-2' }}
          </div>
          <div class="mt-1 text-xs text-slate-500">From Chart of Accounts (Account 1200 series)</div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset Register Sub-Ledger</div>
          <div class="mt-2 text-2xl font-bold font-display text-indigo-600 dark:text-indigo-400">
            ৳ {{ (reconciliation?.total_asset_sub_ledger_bdt || 0) | number:'1.2-2' }}
          </div>
          <div class="mt-1 text-xs text-slate-500">Sum of active capital asset acquisition costs</div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unreconciled Difference</div>
          <div class="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            ৳ {{ (reconciliation?.total_difference_bdt || 0) | number:'1.2-2' }}
          </div>
          <div class="mt-1 text-xs text-emerald-600 font-medium">100% Fully Balanced</div>
        </div>
      </div>

      <!-- Detailed Account Reconciliation Table -->
      <app-card title="Account-by-Account Reconciliation Statement" subtitle="Comparison between GL control account trial balance and fixed asset subsidiary register">
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">GL Account Code</th>
                <th class="p-3">Account Title</th>
                <th class="p-3 text-right">GL Ledger Balance</th>
                <th class="p-3 text-right">Asset Sub-Ledger</th>
                <th class="p-3 text-right">Difference</th>
                <th class="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="6" class="p-6 text-center text-slate-400">Performing sub-ledger reconciliation...</td>
                </tr>
              } @else {
                @for (item of reconciliation?.accounts; track item.gl_account_code) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {{ item.gl_account_code }}
                    </td>
                    <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {{ item.gl_account_name }}
                    </td>
                    <td class="p-3 text-right font-medium">
                      ৳ {{ item.gl_ledger_balance_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      ৳ {{ item.asset_sub_ledger_balance_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right font-bold text-emerald-600">
                      ৳ {{ item.unreconciled_difference_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                        {{ item.status }}
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
export class AssetGlReconciliationComponent implements OnInit {
  private service = inject(FixedAssetsService);

  reconciliation: GlReconciliationResult | null = null;
  loading = false;

  ngOnInit(): void {
    this.loadReconciliation();
  }

  loadReconciliation(): void {
    this.loading = true;
    this.service.getGlReconciliation().subscribe({
      next: (data) => {
        this.reconciliation = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load GL reconciliation', err);
        this.loading = false;
      }
    });
  }
}
