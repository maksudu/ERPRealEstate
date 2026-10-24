import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FixedAssetsService } from '../../../core/services/fixed-assets.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-asset-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <!-- Recommended Implementation Rule Banner -->
      <div class="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
        <div class="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0">
          🏢
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h4 class="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider font-display">
              Recommended Integrated Fixed Asset Governance
            </h4>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white">
              ERP INTEGRATED
            </span>
          </div>
          <p class="text-[11px] text-indigo-800 dark:text-indigo-300 mt-1 leading-relaxed">
            <strong>Recommended implementation:</strong> Integrate Fixed Asset Management with Procurement, Inventory, Accounting, HR and Project Management. This enables the company to trace each asset from purchase to final disposal while maintaining accurate financial records and project-wise asset costs.
          </p>
        </div>
      </div>

      <!-- Main Reports Container -->
      <app-card title="Key Reports & Analytics Suite" subtitle="Executive reports for acquisition, depreciation, downtime, warranties, audit discrepancies and GL reconciliation">
        <div card-actions class="flex items-center gap-2 report-actions">
          <button type="button" (click)="downloadExcel()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-2xs transition">Download Excel</button>
          <button
            type="button"
            (click)="printReport()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs transition"
          >
            <span>🖨️</span> Print / Save as PDF
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <app-searchable-select
              categoryCode="ASSET_CATEGORY"
              label="Asset Category Filter"
              placeholder="All Categories"
              [(ngModel)]="selectedCategory"
              (ngModelChange)="onFilterChange()"
              [options]="categoryOptions"
              [allowCreateNew]="false"
            />
          </div>
          <div>
            <app-searchable-select
              categoryCode="PROJECT_LOCATION"
              label="Project Filter"
              placeholder="All Projects"
              [(ngModel)]="selectedProject"
              (ngModelChange)="onFilterChange()"
              [options]="projectOptions"
              [allowCreateNew]="false"
            />
          </div>
        </div>

        <!-- Report Content Rendering -->
        @if (loading) {
          <div class="p-8 text-center text-slate-400 text-xs">Generating report data...</div>
        } @else {
          <!-- 1. Asset Register & Acquisition Cost -->
          @if (activeTab === 'asset_register') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">Asset Tag</th>
                    <th class="p-3">Asset Name</th>
                    <th class="p-3">Category</th>
                    <th class="p-3">Project</th>
                    <th class="p-3">Purchase Date</th>
                    <th class="p-3 text-right">Acquisition Cost</th>
                    <th class="p-3 text-right">Net Book Value</th>
                    <th class="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of pagedRows; track item.id) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td class="p-3 font-mono font-bold text-indigo-600">{{ item.asset_tag }}</td>
                      <td class="p-3 font-medium">{{ item.asset_name }}</td>
                      <td class="p-3 text-slate-500">{{ item.category }}</td>
                      <td class="p-3">{{ item.project_name || 'Central' }}</td>
                      <td class="p-3 text-slate-500">{{ item.purchase_date }}</td>
                      <td class="p-3 text-right font-medium">৳ {{ item.acquisition_cost_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-bold text-emerald-600">৳ {{ item.net_book_value_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-center">
                        <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          {{ item.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 2. Accumulated Depreciation & Net Book Value -->
          @if (activeTab === 'accumulated_depreciation') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">Asset Tag</th>
                    <th class="p-3">Asset Name</th>
                    <th class="p-3 text-right">Acquisition Cost</th>
                    <th class="p-3 text-center">Useful Life</th>
                    <th class="p-3">Method</th>
                    <th class="p-3 text-right">Accumulated Depreciation</th>
                    <th class="p-3 text-right">Current Net Book Value</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of pagedRows; track item.asset_tag) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td class="p-3 font-mono font-bold text-indigo-600">{{ item.asset_tag }}</td>
                      <td class="p-3 font-medium">{{ item.asset_name }}</td>
                      <td class="p-3 text-right font-medium">৳ {{ item.acquisition_cost_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-center">{{ item.useful_life_years }} Yrs</td>
                      <td class="p-3 font-mono text-[10px]">{{ item.depreciation_method }}</td>
                      <td class="p-3 text-right font-medium text-amber-600">৳ {{ item.accumulated_depreciation_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-bold text-emerald-600">৳ {{ item.current_net_book_value_bdt | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 3. Additions and Disposals -->
          @if (activeTab === 'additions_disposals') {
            <div class="space-y-4">
              <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300">Capital Additions This Year</h4>
              <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table class="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                      <th class="p-3">Asset Tag</th>
                      <th class="p-3">Asset Name</th>
                      <th class="p-3">Category</th>
                      <th class="p-3">Purchase Date</th>
                      <th class="p-3 text-right">Acquisition Cost</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    @for (item of pagedRows; track item.id) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="p-3 font-mono font-bold text-indigo-600">{{ item.asset_tag }}</td>
                        <td class="p-3 font-medium">{{ item.asset_name }}</td>
                        <td class="p-3 text-slate-500">{{ item.category }}</td>
                        <td class="p-3">{{ item.purchase_date }}</td>
                        <td class="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          ৳ {{ item.acquisition_cost_bdt | number:'1.2-2' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- 4. Depreciation by Month and Year -->
          @if (activeTab === 'depreciation_schedule') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">Asset Tag</th>
                    <th class="p-3">Asset Name</th>
                    <th class="p-3 text-right">Annual Rate</th>
                    <th class="p-3 text-right">Monthly Depreciation</th>
                    <th class="p-3 text-right">Annual Depreciation</th>
                    <th class="p-3 text-right">Net Book Value</th>
                    <th class="p-3">GL Code</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of pagedRows; track item.asset_id) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-mono font-bold text-indigo-600">{{ item.asset_tag }}</td>
                      <td class="p-3 font-medium">{{ item.asset_name }}</td>
                      <td class="p-3 text-right">{{ item.annual_rate_percent }}%</td>
                      <td class="p-3 text-right font-bold text-indigo-600">৳ {{ item.monthly_depreciation_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-medium">৳ {{ item.annual_depreciation_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-bold text-emerald-600">৳ {{ item.net_book_value_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 font-mono text-[10px] text-slate-500">{{ item.gl_account_code }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 5. Maintenance Expenses & Equipment Downtime -->
          @if (activeTab === 'maintenance_downtime') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">Mnt. Code</th>
                    <th class="p-3">Service Type</th>
                    <th class="p-3">Vendor</th>
                    <th class="p-3">Date</th>
                    <th class="p-3 text-right">Maintenance Cost</th>
                    <th class="p-3 text-right">Downtime (Hours)</th>
                    <th class="p-3">Invoice Ref</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of pagedRows; track item.id) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-mono font-bold text-indigo-600">{{ item.maintenance_code }}</td>
                      <td class="p-3 font-semibold">{{ item.service_type }}</td>
                      <td class="p-3 text-slate-600">{{ item.vendor_name }}</td>
                      <td class="p-3 text-slate-500">{{ item.service_date }}</td>
                      <td class="p-3 text-right font-bold">৳ {{ item.maintenance_cost_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-mono font-bold text-rose-600">{{ item.downtime_hours }}h</td>
                      <td class="p-3 font-mono text-[10px] text-slate-500">{{ item.invoice_ref || 'N/A' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 6. Warranty & Insurance Expiry -->
          @if (activeTab === 'warranty_insurance') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">Asset Tag</th>
                    <th class="p-3">Asset Name</th>
                    <th class="p-3">Warranty Expiry</th>
                    <th class="p-3 text-center">Warranty Status</th>
                    <th class="p-3">Insurance Policy No</th>
                    <th class="p-3">Insurance Expiry</th>
                    <th class="p-3 text-center">Insurance Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of pagedRows; track item.asset_tag) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-mono font-bold text-indigo-600">{{ item.asset_tag }}</td>
                      <td class="p-3 font-medium">{{ item.asset_name }}</td>
                      <td class="p-3">{{ item.warranty_expiry_date || 'N/A' }}</td>
                      <td class="p-3 text-center">
                        <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          {{ item.warranty_status }}
                        </span>
                      </td>
                      <td class="p-3 font-mono text-[11px]">{{ item.insurance_policy_no || 'N/A' }}</td>
                      <td class="p-3">{{ item.insurance_expiry_date || 'N/A' }}</td>
                      <td class="p-3 text-center">
                        <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                          {{ item.insurance_status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 7. Physical Verification Discrepancies -->
          @if (activeTab === 'physical_verification') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">Audit Code</th>
                    <th class="p-3">Site / Project</th>
                    <th class="p-3">Date</th>
                    <th class="p-3 text-center">Registered</th>
                    <th class="p-3 text-center">Found</th>
                    <th class="p-3 text-center">Discrepancy</th>
                    <th class="p-3">Auditor</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of pagedRows; track item.id) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-mono font-bold text-indigo-600">{{ item.audit_code }}</td>
                      <td class="p-3 font-medium">{{ item.project_name || 'Central Facility' }}</td>
                      <td class="p-3 text-slate-500">{{ item.audit_date }}</td>
                      <td class="p-3 text-center font-mono">{{ item.total_assets_registered }}</td>
                      <td class="p-3 text-center font-mono text-emerald-600">{{ item.total_assets_found }}</td>
                      <td class="p-3 text-center font-mono font-bold text-emerald-600">
                        {{ item.discrepancy_qty === 0 ? '0' : item.discrepancy_qty }}
                      </td>
                      <td class="p-3 text-slate-600">{{ item.verified_by || 'Internal Audit' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 8. Asset Transfer History -->
          @if (activeTab === 'transfer_history') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">Ref</th>
                    <th class="p-3">Asset ID</th>
                    <th class="p-3">From Project</th>
                    <th class="p-3">To Project</th>
                    <th class="p-3">Transfer Date</th>
                    <th class="p-3">Transferred By</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of pagedRows; track item.id) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-mono font-bold text-indigo-600">{{ item.transfer_ref }}</td>
                      <td class="p-3 font-mono text-[11px]">AST-{{ item.asset_id }}</td>
                      <td class="p-3">{{ item.from_project_name || 'Central Yard' }}</td>
                      <td class="p-3 font-semibold text-emerald-600">{{ item.to_project_name }}</td>
                      <td class="p-3 text-slate-500">{{ item.transfer_date }}</td>
                      <td class="p-3">{{ item.transferred_by || 'Plant Engineer' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 9. Gain/Loss on Disposal -->
          @if (activeTab === 'gain_loss_disposal') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">Disposal Ref</th>
                    <th class="p-3">Asset ID</th>
                    <th class="p-3">Date</th>
                    <th class="p-3 text-right">NBV at Sale</th>
                    <th class="p-3 text-right">Proceeds</th>
                    <th class="p-3 text-right">Gain / (Loss)</th>
                    <th class="p-3">Buyer</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of pagedRows; track item.id) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-mono font-bold text-indigo-600">{{ item.disposal_ref }}</td>
                      <td class="p-3 font-mono text-[11px]">AST-{{ item.asset_id }}</td>
                      <td class="p-3 text-slate-500">{{ item.disposal_date }}</td>
                      <td class="p-3 text-right">৳ {{ item.nbv_at_disposal_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-bold">৳ {{ item.sale_proceeds_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-bold text-emerald-600">৳ {{ item.gain_loss_amount_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-slate-600">{{ item.buyer_name || 'N/A' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 10. GL Reconciliation -->
          @if (activeTab === 'gl_reconciliation') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">GL Code</th>
                    <th class="p-3">Account Title</th>
                    <th class="p-3 text-right">General Ledger</th>
                    <th class="p-3 text-right">Sub-Ledger</th>
                    <th class="p-3 text-right">Variance</th>
                    <th class="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of pagedRows; track item.gl_account_code) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-mono font-bold text-indigo-600">{{ item.gl_account_code }}</td>
                      <td class="p-3 font-medium">{{ item.gl_account_name }}</td>
                      <td class="p-3 text-right font-medium">৳ {{ item.gl_ledger_balance_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-medium">৳ {{ item.asset_sub_ledger_balance_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-bold text-emerald-600">৳ {{ item.unreconciled_difference_bdt | number:'1.2-2' }}</td>
                      <td class="p-3 text-center">
                        <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          {{ item.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
        @if (activeRows.length > 0) {
          <div class="report-pagination mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
            <span>Showing {{ pageStart + 1 }}–{{ pageEnd }} of {{ activeRows.length }}</span>
            <div class="flex items-center gap-2">
              <span>Rows:</span>
              @for (size of pageSizes; track size) {
                <button type="button" (click)="setPageSize(size)" [class.font-bold]="pageSize === size" [class.text-indigo-700]="pageSize === size" class="rounded px-2 py-1 hover:bg-slate-100">{{ size }}</button>
              }
              <button type="button" (click)="changePage(page - 1)" [disabled]="page <= 1" class="rounded border px-2 py-1 disabled:opacity-40">Previous</button>
              <span>{{ page }} / {{ totalPages }}</span>
              <button type="button" (click)="changePage(page + 1)" [disabled]="page >= totalPages" class="rounded border px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        }
      </app-card>
    </div>
  `,
  styles: [`
    @media print {
      .report-actions, .report-pagination, :host > div > div:first-child { display: none !important; }
      :host { color: #000; }
      app-card { box-shadow: none !important; }
    }
  `]
})
export class AssetReportsComponent implements OnInit {
  private service = inject(FixedAssetsService);
  private route = inject(ActivatedRoute);

  activeTab = 'asset_register';
  selectedCategory = '';
  selectedProject = '';
  reportData: any = null;
  loading = false;
  page = 1;
  pageSize = 10;
  readonly pageSizes = [10, 25, 50];

  get activeRows(): any[] {
    if (this.activeTab === 'depreciation_schedule') return Array.isArray(this.reportData) ? this.reportData : this.reportData?.items ?? [];
    if (this.activeTab === 'additions_disposals') return this.reportData?.additions ?? [];
    if (this.activeTab === 'gl_reconciliation') return this.reportData?.accounts ?? [];
    return this.reportData?.items ?? [];
  }

  get pagedRows(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.activeRows.slice(start, start + this.pageSize);
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.activeRows.length / this.pageSize)); }
  get pageStart(): number { return (this.page - 1) * this.pageSize; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.activeRows.length); }

  categoryOptions: SelectOption[] = [
    { value: 'Heavy Plant & Construction Machinery', label: 'Heavy Plant & Construction Machinery' },
    { value: 'Commercial Vehicles & Transit Mixers', label: 'Commercial Vehicles & Transit Mixers' },
    { value: 'Electrical Power & Generators', label: 'Electrical Power & Generators' },
    { value: 'IT Hardware & Server Cluster', label: 'IT Hardware & Server Cluster' }
  ];

  projectOptions: SelectOption[] = [
    { value: 'Ocean Heights Luxury Tower', label: 'Ocean Heights Luxury Tower' },
    { value: 'BlueOceans Commercial Plaza', label: 'BlueOceans Commercial Plaza' },
    { value: 'Central Plant Yard', label: 'Central Plant Yard' }
  ];

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadReportData();
    });
  }

  loadReportData(): void {
    this.page = 1;
    this.loading = true;
    this.service.getReports(this.activeTab, this.selectedCategory).subscribe({
      next: (data) => {
        this.reportData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load report data', err);
        this.loading = false;
      }
    });
  }

  printReport(): void {
    const previousPageSize = this.pageSize;
    this.pageSize = Math.max(this.activeRows.length, 1);
    this.page = 1;
    setTimeout(() => {
      window.print();
      this.pageSize = previousPageSize;
      this.page = 1;
    });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadReportData();
  }

  setPageSize(size: number): void { this.pageSize = size; this.page = 1; }
  changePage(page: number): void { if (page >= 1 && page <= this.totalPages) this.page = page; }

  downloadExcel(): void {
    const workbook = XLSX.utils.book_new();
    for (const sheet of this.getExportSheets()) {
      const rows = sheet.rows.length ? sheet.rows : [{ message: 'No data available' }];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheet.name.slice(0, 31));
    }
    XLSX.writeFile(workbook, `fixed-assets-${this.activeTab}.xlsx`);
  }

  private getExportSheets(): Array<{ name: string; rows: any[] }> {
    if (this.activeTab === 'depreciation_schedule') return [{ name: 'Depreciation Schedule', rows: this.activeRows }];
    if (this.activeTab === 'additions_disposals') return [
      { name: 'Additions', rows: this.reportData?.additions ?? [] },
      { name: 'Disposals', rows: this.reportData?.disposals ?? [] }
    ];
    if (this.activeTab === 'gl_reconciliation') return [{ name: 'GL Reconciliation', rows: this.activeRows }];
    return [{ name: this.activeTab, rows: this.activeRows }];
  }
}
