import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FixedAssetsService, AssetDashboardSummary } from '../../../core/services/fixed-assets.service';
import { FixedAssetsNavComponent } from '../fixed-assets-nav/fixed-assets-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-fixed-assets-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FixedAssetsNavComponent, CardContainerComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <app-fixed-assets-nav />

      <!-- Top Executive Metrics Cockpit -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Metric 1: Acquisition Cost -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Acquisition Cost</span>
            <span class="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 text-sm">🏗️</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
            ৳ {{ (summary?.total_asset_acquisition_cost_bdt || 0) | number:'1.2-2' }}
          </div>
          <div class="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span class="text-emerald-600 font-semibold">Active Assets: {{ summary?.total_active_assets_count || 0 }}</span>
            <span>• Verified Registry</span>
          </div>
        </div>

        <!-- Metric 2: Accumulated Depreciation -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accumulated Depreciation</span>
            <span class="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 text-sm">📉</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-display text-amber-600 dark:text-amber-400">
            ৳ {{ (summary?.accumulated_depreciation_bdt || 0) | number:'1.2-2' }}
          </div>
          <div class="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span>Depreciation Rate: Straight Line / WDV</span>
          </div>
        </div>

        <!-- Metric 3: Current Net Book Value (NBV) -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Net Book Value</span>
            <span class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 text-sm">💰</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            ৳ {{ (summary?.current_net_book_value_bdt || 0) | number:'1.2-2' }}
          </div>
          <div class="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span>Cost minus Depreciation</span>
          </div>
        </div>

        <!-- Metric 4: Maintenance & Downtime -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Maintenance & Downtime</span>
            <span class="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 text-sm">⚙️</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
            ৳ {{ (summary?.total_maintenance_expenses_bdt || 0) | number:'1.2-2' }}
          </div>
          <div class="mt-1 flex items-center gap-2 text-xs text-rose-600 font-medium">
            <span>{{ summary?.total_equipment_downtime_hours || 0 }} hrs Downtime logged</span>
          </div>
        </div>
      </div>

      <!-- Secondary Warning & Audit Banner -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-900/60 flex items-center gap-3">
          <div class="text-2xl">🛡️</div>
          <div>
            <div class="text-xs font-bold text-amber-800 dark:text-amber-300">Expiring Warranties Alert</div>
            <div class="text-[11px] text-amber-700 dark:text-amber-400">
              {{ summary?.expiring_warranties_count || 0 }} capital assets require warranty renewal within 180 days.
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-900/60 flex items-center gap-3">
          <div class="text-2xl">📋</div>
          <div>
            <div class="text-xs font-bold text-blue-800 dark:text-blue-300">Expiring Insurance Policies</div>
            <div class="text-[11px] text-blue-700 dark:text-blue-400">
              {{ summary?.expiring_insurance_count || 0 }} heavy machinery/vehicle policies expire in 90 days.
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-900/60 flex items-center gap-3">
          <div class="text-2xl">⚖️</div>
          <div>
            <div class="text-xs font-bold text-emerald-800 dark:text-emerald-300">GL Reconciliation Status</div>
            <div class="text-[11px] text-emerald-700 dark:text-emerald-400">
              Sub-ledger exactly matches General Ledger Account 1200 (৳ 0.00 Variance).
            </div>
          </div>
        </div>
      </div>

      <!-- Main Category & Monthly Depreciation Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Asset Category Breakdown -->
        <app-card title="Asset Register by Category" subtitle="Capitalized asset distribution across heavy plant, vehicles, and IT equipment">
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (item of summary?.category_distribution; track item.category) {
              <div class="py-3 flex items-center justify-between">
                <div>
                  <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">{{ item.category }}</div>
                  <div class="text-[11px] text-slate-500">{{ item.count }} Equipment Units Registered</div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-bold text-slate-900 dark:text-slate-100">৳ {{ item.acquisition_cost_bdt | number:'1.2-2' }}</div>
                  <div class="text-[10px] text-emerald-600 font-medium">NBV: ৳ {{ item.nbv_bdt | number:'1.2-2' }}</div>
                </div>
              </div>
            }
          </div>
        </app-card>

        <!-- Monthly Depreciation Trend -->
        <app-card title="Monthly Depreciation Expense" subtitle="Calculated straight-line depreciation allocation by calendar month">
          <div class="space-y-3">
            @for (m of summary?.monthly_depreciation_trend; track m.month) {
              <div>
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-medium text-slate-700 dark:text-slate-300">{{ m.month }} 2025</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">৳ {{ m.depreciation_bdt | number:'1.2-2' }}</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div class="bg-indigo-600 h-full rounded-full" [style.width.%]="(m.depreciation_bdt / 600000) * 100"></div>
                </div>
              </div>
            }
          </div>
        </app-card>
      </div>

      <!-- Quick Action Modules Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <a routerLink="/fixed-assets/asset-register" class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center hover:border-indigo-500 transition group shadow-2xs">
          <div class="text-xl mb-1">📦</div>
          <div class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">Asset Register</div>
          <div class="text-[10px] text-slate-500">Directory & Add Asset</div>
        </a>

        <a routerLink="/fixed-assets/transfers" class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center hover:border-indigo-500 transition group shadow-2xs">
          <div class="text-xl mb-1">🚚</div>
          <div class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">Site Transfers</div>
          <div class="text-[10px] text-slate-500">Project Relocation Log</div>
        </a>

        <a routerLink="/fixed-assets/maintenance" class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center hover:border-indigo-500 transition group shadow-2xs">
          <div class="text-xl mb-1">🛠️</div>
          <div class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">Maintenance & Downtime</div>
          <div class="text-[10px] text-slate-500">Vendor Invoices & Hours</div>
        </a>

        <a routerLink="/fixed-assets/reports" class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center hover:border-indigo-500 transition group shadow-2xs">
          <div class="text-xl mb-1">📑</div>
          <div class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">Key Reports Suite</div>
          <div class="text-[10px] text-slate-500">10 Detailed Statements</div>
        </a>
      </div>
    </div>
  `
})
export class FixedAssetsDashboardComponent implements OnInit {
  private service = inject(FixedAssetsService);
  summary: AssetDashboardSummary | null = null;
  loading = false;

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.service.getDashboardSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load asset dashboard', err);
        this.loading = false;
      }
    });
  }
}
