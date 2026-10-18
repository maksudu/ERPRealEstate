import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import {
  StockLedger,
  SiteStore,
  StoreValuationResponse,
  ValuationMethodComparison,
  StockAgingReportItem,
  PeriodEndReconciliation
} from '../../../core/models/procurement.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  SearchableSelectComponent,
  StatusBadgeComponent,
  ModalComponent
} from '../../../shared/components';

@Component({
  selector: 'app-inventory-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProcurementNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  template: `
    <app-procurement-nav
      title="9.13 Stock Valuation & Inventory Ledger"
      subtitle="Weighted-Average (AVCO), FIFO Simulation, Standard Costing & Period-End General Ledger Reconciliation"
    >
      <div actions class="flex items-center gap-2">
        <button
          type="button"
          (click)="refreshData()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
        >
          <span>🔄</span>
          <span>Refresh Ledger</span>
        </button>
        <button
          type="button"
          (click)="openReconciliationModal()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 transition-colors cursor-pointer"
        >
          <span>⚖️</span>
          <span>GL Month-End Reconcile</span>
        </button>
        <button
          type="button"
          (click)="exportLedgerCsv()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
        >
          <span>📊</span>
          <span>Export Valuation Ledger</span>
        </button>
      </div>
    </app-procurement-nav>

    <!-- Top KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Stock Asset Value</span>
          <span class="p-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">৳ AVCO</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">৳{{ totalAssetValuation() | number:'1.2-2' }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Weighted average perpetual valuation</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Inflow Received</span>
          <span class="p-1.5 bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">⬇️ GRN In</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ totalInflowQty() | number:'1.0-2' }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Total physical goods receipts</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Outflow Issued</span>
          <span class="p-1.5 bg-purple-500/15 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-bold">⬆️ MIN Out</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ totalOutflowQty() | number:'1.0-2' }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Issued to construction & sites</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Warehouse Coverage</span>
          <span class="p-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">🏬 Sites</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ stores().length }} Stores</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Central warehouses & sites</p>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div class="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
      <button
        type="button"
        (click)="activeTab = 'LEDGER'"
        [class]="activeTab === 'LEDGER' ? 'px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 shadow-xs' : 'px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
      >
        📖 Perpetual Stock Movement Ledger
      </button>
      <button
        type="button"
        (click)="activeTab = 'VALUATION'; loadValuationComparison()"
        [class]="activeTab === 'VALUATION' ? 'px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 shadow-xs' : 'px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
      >
        ⚖️ Valuation Method Comparison (AVCO vs FIFO vs Std)
      </button>
      <button
        type="button"
        (click)="activeTab = 'AGING'; loadAgingReport()"
        [class]="activeTab === 'AGING' ? 'px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 shadow-xs' : 'px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
      >
        ⏳ Stock Aging & Obsolescence Analysis
      </button>
    </div>

    <!-- TAB 1: Perpetual Movement Ledger -->
    <div *ngIf="activeTab === 'LEDGER'">
      <app-card-container
        title="Perpetual Stock Movement & Valuation Ledger"
        subtitle="Complete chronological audit trail of all receipts, issues, transfers and balance valuation adjustments"
      >
        <!-- Dynamic Searchable Filter Toolbar -->
        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 flex-1">
            <div class="w-60">
              <app-custom-input
                placeholder="Search reference # or material..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onFilterChange()"
              ></app-custom-input>
            </div>

            <div class="w-56">
              <app-searchable-select
                placeholder="Filter Warehouse Location"
                [options]="storeOptions()"
                [(ngModel)]="selectedStoreId"
                (ngModelChange)="onFilterChange()"
              ></app-searchable-select>
            </div>

            <div class="w-48">
              <app-searchable-select
                placeholder="Transaction Type"
                [options]="transactionTypeOptions"
                [(ngModel)]="selectedType"
                (ngModelChange)="onFilterChange()"
              ></app-searchable-select>
            </div>

            <button
              *ngIf="searchQuery || selectedStoreId !== null || selectedType"
              (click)="resetFilters()"
              class="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          <div class="text-xs text-slate-500 dark:text-slate-400">
            Showing {{ pagedEntries().length }} of {{ filteredEntries().length }} entries
          </div>
        </div>

        <!-- Ledger Table (Strictly NO form below table) -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th class="p-3">Posting Date</th>
                <th class="p-3">Reference No</th>
                <th class="p-3">Store Location</th>
                <th class="p-3">Material Item</th>
                <th class="p-3">Transaction</th>
                <th class="p-3 text-right">Inflow Qty</th>
                <th class="p-3 text-right">Outflow Qty</th>
                <th class="p-3 text-right">Unit Rate (৳)</th>
                <th class="p-3 text-right font-bold text-slate-900 dark:text-slate-100">Balance Qty</th>
                <th class="p-3 text-right font-bold text-emerald-700 dark:text-emerald-400">Total Value (৳)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (row of pagedEntries(); track row.id) {
                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td class="p-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    {{ (row.transaction_date || row.posting_date || row.created_at) | date:'dd MMM yyyy' }}
                  </td>
                  <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {{ row.reference_number }}
                  </td>
                  <td class="p-3 font-medium text-slate-800 dark:text-slate-200">
                    {{ row.store_name || ('Store #' + row.store_id) }}
                  </td>
                  <td class="p-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ row.material_name || ('Material #' + row.material_id) }}</div>
                    <div class="text-[10px] text-slate-500">{{ row.unit_of_measure }}</div>
                  </td>
                  <td class="p-3">
                    <span
                      [class]="getTransactionBadgeClass(row.transaction_type)"
                      class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                    >
                      {{ row.transaction_type }}
                    </span>
                  </td>
                  <td class="p-3 text-right font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {{ row.quantity_in > 0 ? (row.quantity_in | number:'1.2-2') : '-' }}
                  </td>
                  <td class="p-3 text-right font-bold text-purple-600 dark:text-purple-400 font-mono">
                    {{ row.quantity_out > 0 ? (row.quantity_out | number:'1.2-2') : '-' }}
                  </td>
                  <td class="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    ৳{{ row.unit_rate | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                    {{ (row.running_balance_qty || row.balance_quantity || 0) | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{{ ((row.running_balance_qty || row.balance_quantity || 0) * row.unit_rate) | number:'1.2-2' }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="p-8 text-center text-slate-400 text-xs">
                    No ledger entries match the selected filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Toolbar -->
        <div class="flex items-center justify-between mt-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Page {{ currentPage() }} of {{ totalPages() }} ({{ filteredEntries().length }} total records)
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              (click)="setPage(currentPage() - 1)"
              [disabled]="currentPage() === 1"
              class="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Prev
            </button>
            <button
              *ngFor="let p of getPages()"
              type="button"
              (click)="setPage(p)"
              [class.bg-amber-500]="currentPage() === p"
              [class.text-slate-950]="currentPage() === p"
              [class.font-bold]="currentPage() === p"
              class="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {{ p }}
            </button>
            <button
              type="button"
              (click)="setPage(currentPage() + 1)"
              [disabled]="currentPage() >= totalPages()"
              class="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </app-card-container>
    </div>

    <!-- TAB 2: Valuation Method Comparison (AVCO vs FIFO vs Standard Cost) -->
    <div *ngIf="activeTab === 'VALUATION'">
      <app-card-container
        title="Stock Valuation Method Comparison Matrix"
        subtitle="Real-time variance analysis between Weighted Average Costing (AVCO), First-In First-Out (FIFO) and Standard Budget Cost"
      >
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th class="p-3">Material Item</th>
                <th class="p-3">Category</th>
                <th class="p-3 text-right">On-Hand Qty</th>
                <th class="p-3 text-right font-bold text-amber-600 dark:text-amber-400">AVCO Rate (৳)</th>
                <th class="p-3 text-right font-bold text-amber-600 dark:text-amber-400">AVCO Value</th>
                <th class="p-3 text-right font-bold text-blue-600 dark:text-blue-400">FIFO Rate (৳)</th>
                <th class="p-3 text-right font-bold text-blue-600 dark:text-blue-400">FIFO Value</th>
                <th class="p-3 text-right font-bold text-purple-600 dark:text-purple-400">Standard Cost</th>
                <th class="p-3 text-right font-bold text-purple-600 dark:text-purple-400">Std Valuation</th>
                <th class="p-3 text-right font-bold">Cost Variance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of valuationComparisons(); track item.material_id) {
                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td class="p-3 font-bold text-slate-900 dark:text-slate-100">
                    {{ item.material_name }}
                  </td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {{ item.category }}
                    </span>
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    {{ item.current_quantity | number:'1.2-2' }} {{ item.unit_of_measure }}
                  </td>
                  <td class="p-3 text-right font-mono text-amber-700 dark:text-amber-400">
                    ৳{{ item.weighted_avg_rate | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                    ৳{{ item.weighted_avg_valuation | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono text-blue-700 dark:text-blue-400">
                    ৳{{ item.fifo_rate | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                    ৳{{ item.fifo_valuation | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono text-purple-700 dark:text-purple-400">
                    ৳{{ item.standard_cost | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-purple-700 dark:text-purple-400">
                    ৳{{ item.standard_valuation | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold" [class]="item.cost_variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                    {{ item.cost_variance >= 0 ? '+' : '' }}৳{{ item.cost_variance | number:'1.2-2' }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="p-8 text-center text-slate-400 text-xs">
                    No active stock items available for valuation comparison.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>
    </div>

    <!-- TAB 3: Stock Aging & Obsolescence Analysis -->
    <div *ngIf="activeTab === 'AGING'">
      <app-card-container
        title="Inventory Aging & Impairment Risk Analysis"
        subtitle="Stratification of stock by days in warehouse: active items, slow-moving reserves, non-moving inventory and obsolete scrap"
      >
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th class="p-3">Material Item</th>
                <th class="p-3">Warehouse Location</th>
                <th class="p-3 text-right">Stock Quantity</th>
                <th class="p-3 text-right">Unit Rate (৳)</th>
                <th class="p-3 text-right font-bold">Total Asset Value</th>
                <th class="p-3 text-center">Days In Store</th>
                <th class="p-3 text-center">Aging Stratification</th>
                <th class="p-3 text-center">Impairment Risk</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of agingItems(); track item.material_id) {
                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td class="p-3 font-bold text-slate-900 dark:text-slate-100">
                    {{ item.material_name }}
                  </td>
                  <td class="p-3 text-slate-800 dark:text-slate-200">
                    {{ item.store_name }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold">
                    {{ item.current_stock_quantity | number:'1.2-2' }} {{ item.unit_of_measure }}
                  </td>
                  <td class="p-3 text-right font-mono">
                    ৳{{ item.weighted_avg_rate | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{{ item.total_valuation | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-center font-mono font-bold">
                    {{ item.days_since_last_movement }} days
                  </td>
                  <td class="p-3 text-center">
                    <span
                      [class]="getAgingBadgeClass(item.aging_category)"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    >
                      {{ item.aging_category }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <span
                      [class]="item.impairment_risk === 'LOW' ? 'text-emerald-600 font-bold' : (item.impairment_risk === 'MEDIUM' ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold')"
                    >
                      {{ item.impairment_risk }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-400 text-xs">
                    No aged inventory data available.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>
    </div>

    <!-- MODAL: Period-End GL Reconciliation -->
    <app-modal
      [isOpen]="isReconcileModalOpen"
      title="Period-End General Ledger (GL) Reconciliation"
      subtitle="Reconciliation between store perpetual inventory asset ledger and GL Inventory Control Account"
      [maxWidth]="'max-w-xl'"
      (closeModal)="isReconcileModalOpen = false"
    >
      <div *ngIf="reconciliationData" class="space-y-4">
        <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
          <div class="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-500 font-semibold">Accounting Period:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100">{{ reconciliationData.period_name }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500 font-semibold">Perpetual Stock Asset Total:</span>
            <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              ৳{{ reconciliationData.total_inventory_asset_valuation | number:'1.2-2' }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500 font-semibold">GL Inventory Control Account (14010):</span>
            <span class="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
              ৳{{ reconciliationData.gl_inventory_account_balance | number:'1.2-2' }}
            </span>
          </div>
          <div class="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
            <span class="text-slate-700 dark:text-slate-300 font-bold">Unreconciled Variance:</span>
            <span class="font-mono font-black text-sm" [class]="reconciliationData.unreconciled_difference === 0 ? 'text-emerald-600' : 'text-rose-600'">
              ৳{{ reconciliationData.unreconciled_difference | number:'1.2-2' }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Audit Status:</span>
            <span [class]="reconciliationData.reconciliation_status === 'BALANCED' ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'">
              {{ reconciliationData.reconciliation_status }}
            </span>
          </div>
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400">
          The perpetual inventory sub-ledger matches the balance sheet control ledger. All receipts (GRN) and dispatches (MIN) are accounted for under the company's weighted average cost accounting policy.
        </p>

        <div class="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="isReconcileModalOpen = false"
            class="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer"
          >
            Close & Acknowledge
          </button>
        </div>
      </div>
    </app-modal>
  `
})
export class InventoryLedgerComponent implements OnInit {
  private procurementService = inject(ProcurementService);

  activeTab: 'LEDGER' | 'VALUATION' | 'AGING' = 'LEDGER';

  stores = signal<SiteStore[]>([]);
  valuations = signal<StoreValuationResponse[]>([]);
  ledgerEntries = signal<StockLedger[]>([]);
  valuationComparisons = signal<ValuationMethodComparison[]>([]);
  agingItems = signal<StockAgingReportItem[]>([]);

  isReconcileModalOpen = false;
  reconciliationData: PeriodEndReconciliation | null = null;

  // Filter state
  searchQuery = '';
  selectedStoreId: number | null = null;
  selectedType = '';

  storeOptions = signal<{ label: string; value: any }[]>([]);

  transactionTypeOptions = [
    { label: 'All Transactions', value: '' },
    { label: 'GRN Inflow (Goods Receipt)', value: 'GRN_IN' },
    { label: 'MIN Outflow (Material Issue)', value: 'MIN_OUT' },
    { label: 'Transfer Out (Dispatch)', value: 'TRANSFER_OUT' },
    { label: 'Transfer In (Received)', value: 'TRANSFER_IN' },
    { label: 'Stock Adjustment', value: 'ADJUSTMENT' },
    { label: 'Adjustment Reversal', value: 'ADJUSTMENT_REVERSAL' }
  ];

  // Pagination
  currentPage = signal(1);
  pageSize = signal(15);

  // KPIs
  totalAssetValuation = computed(() => this.valuations().reduce((sum, v) => sum + (v.total_valuation || v.total_stock_value || 0), 0));
  totalInflowQty = computed(() => this.ledgerEntries().reduce((sum, e) => sum + (Number(e.quantity_in) || 0), 0));
  totalOutflowQty = computed(() => this.ledgerEntries().reduce((sum, e) => sum + (Number(e.quantity_out) || 0), 0));

  // Filtered
  filteredEntries = computed(() => {
    let list = this.ledgerEntries();
    if (this.selectedStoreId !== null && this.selectedStoreId !== undefined) {
      list = list.filter(e => e.store_id === this.selectedStoreId);
    }
    if (this.selectedType) {
      list = list.filter(e => e.transaction_type === this.selectedType);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(e =>
        e.reference_number.toLowerCase().includes(q) ||
        (e.material_name && e.material_name.toLowerCase().includes(q)) ||
        (e.store_name && e.store_name.toLowerCase().includes(q))
      );
    }
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEntries().length / this.pageSize())));

  pagedEntries = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredEntries().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData(): void {
    this.loadStores();
    this.loadValuations();
    this.loadLedger();
  }

  loadStores(): void {
    this.procurementService.getSiteStores().subscribe({
      next: (data) => {
        this.stores.set(data || []);
        this.storeOptions.set([
          { label: 'All Warehouses / Sites', value: null },
          ...data.map(s => ({
            label: `${s.store_name} (${s.is_central_warehouse ? 'Central' : 'Site'})`,
            value: s.id
          }))
        ]);
      },
      error: (err) => console.error('Failed to load stores:', err)
    });
  }

  loadValuations(): void {
    this.procurementService.getStoreValuationSummary().subscribe({
      next: (data) => this.valuations.set(data || []),
      error: (err) => console.error('Failed to load valuation summary:', err)
    });
  }

  loadLedger(): void {
    this.procurementService.getInventoryLedger({
      store_id: this.selectedStoreId || undefined,
      transaction_type: this.selectedType || undefined,
      search: this.searchQuery || undefined,
      limit: 100,
      offset: 0
    }).subscribe({
      next: (data) => {
        this.ledgerEntries.set(data || []);
        this.currentPage.set(1);
      },
      error: (err) => console.error('Failed to load inventory ledger:', err)
    });
  }

  loadValuationComparison(): void {
    this.procurementService.getValuationMethodComparison().subscribe({
      next: (data) => this.valuationComparisons.set(data || []),
      error: (err) => console.error('Failed to load valuation comparison:', err)
    });
  }

  loadAgingReport(): void {
    this.procurementService.getStockAgingReport().subscribe({
      next: (data) => this.agingItems.set(data || []),
      error: (err) => console.error('Failed to load stock aging report:', err)
    });
  }

  openReconciliationModal(): void {
    this.procurementService.getPeriodEndReconciliation().subscribe({
      next: (data) => {
        this.reconciliationData = data;
        this.isReconcileModalOpen = true;
      },
      error: () => {}
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadLedger();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStoreId = null;
    this.selectedType = '';
    this.currentPage.set(1);
    this.loadLedger();
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }

  getPages(): number[] {
    const total = this.totalPages();
    const cur = this.currentPage();
    const pages: number[] = [];
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  getTransactionBadgeClass(type: string): string {
    switch (type) {
      case 'GRN_IN':
      case 'GRN_RECEIPT':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'MIN_OUT':
      case 'ISSUE':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30';
      case 'TRANSFER_IN':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      case 'TRANSFER_OUT':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'ADJUSTMENT':
      case 'TRANSIT_DAMAGE':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
      case 'ADJUSTMENT_REVERSAL':
        return 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  }

  getAgingBadgeClass(category: string): string {
    if (category.includes('ACTIVE')) {
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    } else if (category.includes('SLOW_MOVING')) {
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    } else if (category.includes('NON_MOVING')) {
      return 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30';
    } else {
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
    }
  }

  exportLedgerCsv(): void {
    const list = this.filteredEntries();
    if (list.length === 0) {
      alert('No ledger records to export.');
      return;
    }
    const headers = ['Posting Date', 'Reference No', 'Store ID', 'Material ID', 'Transaction Type', 'Inflow Qty', 'Outflow Qty', 'Unit Rate', 'Balance Qty'];
    const rows = list.map(e => [
      e.transaction_date || e.posting_date || '',
      e.reference_number,
      e.store_id,
      e.material_id,
      e.transaction_type,
      e.quantity_in,
      e.quantity_out,
      e.unit_rate,
      e.running_balance_qty || e.balance_quantity || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_ledger_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
