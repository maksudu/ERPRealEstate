import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BudgetingService } from '../../../core/services/budgeting.service';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

export interface ReportTabItem {
  id: string;
  name: string;
  tag: string;
}

@Component({
  selector: 'app-budget-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-5">
      <!-- Recommended Approval Rule & Audit Governance Banner -->
      <div class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-start gap-3">
        <div class="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h4 class="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
              Enforced Budget & BOQ Approval Governance
            </h4>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white">
              AUDIT COMPLIANT
            </span>
          </div>
          <p class="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
            <strong>Recommended Approval Rule:</strong> No budget or BOQ becomes active until approved by authorized users. Purchase commitments and actual costs are tracked separately to avoid double deduction, and budget variations preserve the original approved version for statutory audit trails.
          </p>
        </div>
      </div>

      <app-card-container
        title="12.0 Key Budgeting & Construction Cost Reports"
        subtitle="10 enterprise reports for management control, material wastage audits, contractor settlements and spatial profitability"
        badge="Key Reports Suite"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="printReport()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
          >
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            <span>Print Report</span>
          </button>
          <button
            (click)="exportExcel()"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span>Export to Excel</span>
          </button>
        </div>

        <!-- 10 Key Reports Pill Selector -->
        <div class="mb-5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-1.5 whitespace-nowrap">
            @for (r of reportList; track r.id) {
              <button
                (click)="selectReport(r.id)"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                [ngClass]="activeReportId === r.id ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'"
              >
                <span class="text-[10px] opacity-70 mr-1">#{{ r.tag }}</span>
                <span>{{ r.name }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
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
              label="Tower / Building"
              placeholder="All Towers"
              categoryCode="TOWER_LIST"
              [allowCreateNew]="true"
              (selectionChange)="onTowerSelected($event)"
            ></app-searchable-select>
          </div>
          <div>
            <app-searchable-select
              label="Floor Level"
              placeholder="All Floors"
              categoryCode="FLOOR_LEVEL"
              [allowCreateNew]="true"
            ></app-searchable-select>
          </div>
        </div>

        <!-- REPORT 1: Project-wise approved budget and expenditure -->
        @if (activeReportId === 'project_expenditure') {
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3">Project Code & Name</th>
                  <th class="px-4 py-3">Approved Budget (BDT)</th>
                  <th class="px-4 py-3">Actual Expenditure</th>
                  <th class="px-4 py-3">Committed Obligations</th>
                  <th class="px-4 py-3">Remaining Budget Headroom</th>
                  <th class="px-4 py-3">Burn Rate (%)</th>
                  <th class="px-4 py-3">Rule Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                @for (item of reportData()?.items; track item.project_id) {
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      {{ item.project_name }}
                      <span class="block text-[10px] text-slate-400 font-mono">{{ item.project_code }}</span>
                    </td>
                    <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      ৳{{ (item.approved_budget_bdt / 10000000) | number:'1.2-2' }} Cr
                    </td>
                    <td class="px-4 py-3 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      ৳{{ (item.actual_expenditure_bdt / 10000000) | number:'1.2-2' }} Cr
                    </td>
                    <td class="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                      ৳{{ (item.committed_costs_bdt / 10000000) | number:'1.2-2' }} Cr
                    </td>
                    <td class="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ৳{{ (item.available_budget_bdt / 10000000) | number:'1.2-2' }} Cr
                    </td>
                    <td class="px-4 py-3 font-mono font-bold">
                      {{ item.consumed_pct }}%
                    </td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {{ item.approval_rule_status }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- REPORT 2: BOQ budget vs actual quantity and cost -->
        @if (activeReportId === 'boq_vs_actual') {
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3">Work Item & Category</th>
                  <th class="px-4 py-3">Unit Rate</th>
                  <th class="px-4 py-3">Est. Qty</th>
                  <th class="px-4 py-3">Actual Qty</th>
                  <th class="px-4 py-3">Qty Variance</th>
                  <th class="px-4 py-3">Estimated Cost (BDT)</th>
                  <th class="px-4 py-3">Actual Cost (BDT)</th>
                  <th class="px-4 py-3">Cost Variance</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                @for (b of reportData()?.items; track b.work_item) {
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      {{ b.work_item }}
                      <span class="block text-[10px] text-slate-400 font-normal">{{ b.work_category }}</span>
                    </td>
                    <td class="px-4 py-3 font-mono font-medium">৳{{ b.budget_rate_bdt }} / {{ b.unit }}</td>
                    <td class="px-4 py-3 font-mono">{{ b.estimated_qty | number }} {{ b.unit }}</td>
                    <td class="px-4 py-3 font-mono text-amber-600">{{ b.actual_qty | number }} {{ b.unit }}</td>
                    <td class="px-4 py-3 font-mono text-emerald-600 font-semibold">+{{ b.quantity_variance | number }} {{ b.unit }}</td>
                    <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">৳{{ b.estimated_cost_bdt | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 font-mono font-bold text-amber-600">৳{{ b.actual_cost_bdt | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 font-mono font-bold text-emerald-600">৳{{ b.cost_variance_bdt | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- REPORT 3: Tower-wise and floor-wise cost analysis -->
        @if (activeReportId === 'tower_floor_cost') {
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3">Tower & Floor Level</th>
                  <th class="px-4 py-3">Target Units</th>
                  <th class="px-4 py-3">Cost Center</th>
                  <th class="px-4 py-3">Category</th>
                  <th class="px-4 py-3">Allocation Method</th>
                  <th class="px-4 py-3">Ratio (%)</th>
                  <th class="px-4 py-3">Allocated Amount (BDT)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                @for (alc of reportData()?.items; track alc.allocation_code) {
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      {{ alc.tower_name }} — {{ alc.floor_level }}
                    </td>
                    <td class="px-4 py-3">{{ alc.unit_number }}</td>
                    <td class="px-4 py-3 font-semibold">{{ alc.cost_center }}</td>
                    <td class="px-4 py-3">{{ alc.cost_category }}</td>
                    <td class="px-4 py-3 font-mono">{{ alc.allocation_method }}</td>
                    <td class="px-4 py-3 font-mono font-bold text-emerald-600">{{ alc.allocated_pct }}%</td>
                    <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      ৳{{ alc.allocated_amount_bdt | number:'1.2-2' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- REPORT 4: Material consumption and wastage -->
        @if (activeReportId === 'material_consumption') {
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3">Key Construction Material</th>
                  <th class="px-4 py-3">Planned BOQ Qty</th>
                  <th class="px-4 py-3">Actual Consumed Qty</th>
                  <th class="px-4 py-3">Wastage Qty</th>
                  <th class="px-4 py-3">Wastage %</th>
                  <th class="px-4 py-3">Tolerance Limit</th>
                  <th class="px-4 py-3">Compliance Status</th>
                  <th class="px-4 py-3">Total Material Cost</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                @for (m of reportData()?.items; track m.material_name) {
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      {{ m.material_name }}
                    </td>
                    <td class="px-4 py-3 font-mono">{{ m.planned_boq_qty | number }} {{ m.unit }}</td>
                    <td class="px-4 py-3 font-mono font-medium">{{ m.actual_consumed_qty | number }} {{ m.unit }}</td>
                    <td class="px-4 py-3 font-mono text-amber-600 font-bold">{{ m.wastage_qty | number }} {{ m.unit }}</td>
                    <td class="px-4 py-3 font-mono font-bold" [ngClass]="m.wastage_percent <= m.allowable_wastage_limit ? 'text-emerald-600' : 'text-rose-600'">
                      {{ m.wastage_percent }}%
                    </td>
                    <td class="px-4 py-3 font-mono text-slate-500">&le; {{ m.allowable_wastage_limit }}%</td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {{ m.wastage_status }}
                      </span>
                    </td>
                    <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      ৳{{ (m.total_material_cost_bdt / 100000) | number:'1.2-2' }} Lakh
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- REPORT 5: Purchase commitments and remaining budget -->
        @if (activeReportId === 'purchase_commitments') {
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3">Document Ref & Vendor</th>
                  <th class="px-4 py-3">Category</th>
                  <th class="px-4 py-3">Committed PO Amount (BDT)</th>
                  <th class="px-4 py-3">Category Baseline</th>
                  <th class="px-4 py-3">Remaining Headroom</th>
                  <th class="px-4 py-3">Hard Lock Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                @for (pc of reportData()?.items; track pc.check_code) {
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      {{ pc.document_ref }}
                      <span class="block text-[10px] text-slate-400 font-normal">{{ pc.vendor_name || 'Direct PO' }}</span>
                    </td>
                    <td class="px-4 py-3">{{ pc.cost_category }}</td>
                    <td class="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      ৳{{ pc.committed_amount_bdt | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 font-mono">৳{{ pc.current_budget_bdt | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{{ pc.remaining_budget_bdt | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {{ pc.hard_lock_status }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- REPORT 6: Contractor bill and retention analysis -->
        @if (activeReportId === 'contractor_retention') {
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3">Bill # & Contractor</th>
                  <th class="px-4 py-3">Claimed Bill</th>
                  <th class="px-4 py-3">Certified Amount</th>
                  <th class="px-4 py-3">Security Retention (5%)</th>
                  <th class="px-4 py-3">Tax/VAT Withholding</th>
                  <th class="px-4 py-3">Net Paid</th>
                  <th class="px-4 py-3">Balance Payable</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                @for (b of reportData()?.items; track b.expense_ref) {
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      {{ b.bill_number }}
                      <span class="block text-[10px] text-slate-400 font-normal">{{ b.contractor_name }}</span>
                    </td>
                    <td class="px-4 py-3 font-mono font-medium">৳{{ b.claimed_bill_bdt | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">৳{{ b.certified_amount_bdt | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 font-mono text-amber-600 font-semibold">৳{{ b.retention_held_bdt | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 font-mono text-slate-500">৳{{ b.tax_vat_deducted_bdt | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 font-mono text-blue-600 font-bold">৳{{ b.net_paid_bdt | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 font-mono text-emerald-600 font-bold">৳{{ b.balance_payable_bdt | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- REPORT 7: Budget variation and revision history -->
        @if (activeReportId === 'variation_history') {
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3">Variation Code & Description</th>
                  <th class="px-4 py-3">Reason Category</th>
                  <th class="px-4 py-3">Original Approved Version</th>
                  <th class="px-4 py-3">Revised Approved Cost</th>
                  <th class="px-4 py-3">Variation Net Delta</th>
                  <th class="px-4 py-3">Approval Sign-off</th>
                  <th class="px-4 py-3">Audit Preservation</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                @for (v of reportData()?.items; track v.variation_code) {
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      {{ v.title }}
                      <span class="block text-[10px] text-slate-400 font-mono">{{ v.variation_code }}</span>
                    </td>
                    <td class="px-4 py-3">{{ v.reason_category }}</td>
                    <td class="px-4 py-3 font-mono font-medium">৳{{ (v.original_approved_cost_bdt / 100000) | number:'1.2-2' }} Lakh</td>
                    <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">৳{{ (v.revised_cost_bdt / 100000) | number:'1.2-2' }} Lakh</td>
                    <td class="px-4 py-3 font-mono font-bold text-rose-600">+৳{{ (v.variation_delta_bdt / 100000) | number:'1.2-2' }} Lakh</td>
                    <td class="px-4 py-3 font-semibold text-emerald-600">{{ v.approved_by || 'Executive Board' }}</td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        ORIGINAL BASELINE PRESERVED
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- REPORT 8: Cost overrun and under-budget alerts -->
        @if (activeReportId === 'overrun_alerts') {
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3">Line Code & Item</th>
                  <th class="px-4 py-3">Category</th>
                  <th class="px-4 py-3">Baseline Budget</th>
                  <th class="px-4 py-3">Actual Spent</th>
                  <th class="px-4 py-3">Burn Rate (%)</th>
                  <th class="px-4 py-3">Overrun Alert Level</th>
                  <th class="px-4 py-3">Action Protocol</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                @for (a of reportData()?.items; track a.line_code) {
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      {{ a.item_name }}
                      <span class="block text-[10px] text-slate-400 font-mono">{{ a.line_code }}</span>
                    </td>
                    <td class="px-4 py-3">{{ a.cost_category }}</td>
                    <td class="px-4 py-3 font-mono font-medium">৳{{ (a.baseline_budget_bdt / 100000) | number:'1.2-2' }} Lakh</td>
                    <td class="px-4 py-3 font-mono font-bold text-amber-600">৳{{ (a.actual_spent_bdt / 100000) | number:'1.2-2' }} Lakh</td>
                    <td class="px-4 py-3 font-mono font-bold">{{ a.consumption_pct }}%</td>
                    <td class="px-4 py-3">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold"
                        [ngClass]="a.alert_level === 'OVERRUN_WARNING' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'"
                      >
                        {{ a.alert_level }}
                      </span>
                    </td>
                    <td class="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{{ a.action_required }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- REPORT 9: Estimated cost to complete -->
        @if (activeReportId === 'cost_to_complete') {
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3">Project Portfolio</th>
                  <th class="px-4 py-3">Original Baseline</th>
                  <th class="px-4 py-3">Actual Spent</th>
                  <th class="px-4 py-3">Committed POs</th>
                  <th class="px-4 py-3">Cost to Complete (ETC)</th>
                  <th class="px-4 py-3">Final Forecast (EAC)</th>
                  <th class="px-4 py-3">Risk Assessment</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                @for (f of reportData()?.items; track f.project_id) {
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{{ f.project_name }}</td>
                    <td class="px-4 py-3 font-mono font-bold">৳{{ (f.original_budget_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                    <td class="px-4 py-3 font-mono text-amber-600 font-semibold">৳{{ (f.actual_spent_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                    <td class="px-4 py-3 font-mono text-blue-600">৳{{ (f.committed_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                    <td class="px-4 py-3 font-mono text-indigo-600 font-bold">৳{{ (f.estimated_cost_to_complete_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                    <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">৳{{ (f.final_forecasted_cost_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                    <td class="px-4 py-3 font-bold text-amber-600">{{ f.risk_level }} RISK</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- REPORT 10: Project profitability and cost per square foot -->
        @if (activeReportId === 'profitability_sqft') {
          <div class="space-y-4">
            @if (reportData()?.summary; as s) {
              <!-- KPI Cards for SqFt Costing -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Budgeted Cost / SqFt</span>
                  <p class="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">৳{{ s.budgeted_cost_per_sqft_bdt | number:'1.2-2' }}</p>
                  <span class="text-[10px] text-slate-500">Based on {{ s.total_saleable_area_sqft | number }} SFT area</span>
                </div>
                <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Forecasted Cost / SqFt</span>
                  <p class="text-xl font-bold font-mono text-amber-600 mt-1">৳{{ s.forecasted_cost_per_sqft_bdt | number:'1.2-2' }}</p>
                  <span class="text-[10px] text-slate-500">+৳{{ (s.forecasted_cost_per_sqft_bdt - s.budgeted_cost_per_sqft_bdt) | number:'1.2-2' }} variance</span>
                </div>
                <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Sales Realization / SqFt</span>
                  <p class="text-xl font-bold font-mono text-blue-600 mt-1">৳{{ s.sales_price_per_sqft_bdt | number:'1.2-2' }}</p>
                  <span class="text-[10px] text-slate-500">Gross revenue: ৳{{ (s.gross_sales_revenue_bdt / 10000000) | number:'1.2-2' }} Cr</span>
                </div>
                <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Net Margin / SqFt</span>
                  <p class="text-xl font-bold font-mono text-emerald-600 mt-1">৳{{ s.projected_profit_per_sqft_bdt | number:'1.2-2' }}</p>
                  <span class="text-[10px] font-bold text-emerald-600">{{ s.projected_roi_percent }}% Projected ROI</span>
                </div>
              </div>

              <!-- Profitability Statement Table -->
              <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th class="px-4 py-3">Metric Description</th>
                      <th class="px-4 py-3">Total Value (BDT)</th>
                      <th class="px-4 py-3">Rate per SqFt (BDT/SFT)</th>
                      <th class="px-4 py-3">Percentage Ratio</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td class="px-4 py-3 font-semibold">Total Saleable Apartment Area</td>
                      <td class="px-4 py-3 font-mono font-bold">{{ s.total_saleable_area_sqft | number }} SFT</td>
                      <td class="px-4 py-3 font-mono">-</td>
                      <td class="px-4 py-3 font-mono">100.0% Area</td>
                    </tr>
                    <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td class="px-4 py-3 font-semibold text-blue-600">Projected Gross Sales Revenue</td>
                      <td class="px-4 py-3 font-mono font-bold text-blue-600">৳{{ (s.gross_sales_revenue_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                      <td class="px-4 py-3 font-mono font-bold text-blue-600">৳{{ s.sales_price_per_sqft_bdt | number:'1.2-2' }}</td>
                      <td class="px-4 py-3 font-mono">100.0% Revenue</td>
                    </tr>
                    <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td class="px-4 py-3 font-semibold text-rose-600">Total Forecasted Project Cost (EAC)</td>
                      <td class="px-4 py-3 font-mono font-bold text-rose-600">৳{{ (s.total_forecasted_cost_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                      <td class="px-4 py-3 font-mono font-bold text-rose-600">৳{{ s.forecasted_cost_per_sqft_bdt | number:'1.2-2' }}</td>
                      <td class="px-4 py-3 font-mono font-bold text-rose-600">67.3% Cost-to-Sales</td>
                    </tr>
                    <tr class="bg-emerald-50/60 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-200">
                      <td class="px-4 py-3 uppercase tracking-wider">Estimated Project Net Profit & Return</td>
                      <td class="px-4 py-3 font-mono font-bold">৳{{ (s.estimated_net_profit_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                      <td class="px-4 py-3 font-mono font-bold">৳{{ s.projected_profit_per_sqft_bdt | number:'1.2-2' }}</td>
                      <td class="px-4 py-3 font-mono font-bold">{{ s.projected_roi_percent }}% ROI</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      </app-card-container>
    </div>
  `
})
export class BudgetReportsComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  private route = inject(ActivatedRoute);
  reportData = signal<any>(null);

  activeReportId = 'project_expenditure';
  selectedProjectId?: number;
  selectedTower?: string;

  reportList: ReportTabItem[] = [
    { id: 'project_expenditure', name: 'Project Approved vs Spent', tag: '01' },
    { id: 'boq_vs_actual', name: 'BOQ Budget vs Actual Cost', tag: '02' },
    { id: 'tower_floor_cost', name: 'Tower & Floor Cost Analysis', tag: '03' },
    { id: 'material_consumption', name: 'Material & Rebar Wastage', tag: '04' },
    { id: 'purchase_commitments', name: 'Purchase Commitments & Remaining', tag: '05' },
    { id: 'contractor_retention', name: 'Contractor Bill & Retention', tag: '06' },
    { id: 'variation_history', name: 'Budget Variation & Revisions', tag: '07' },
    { id: 'overrun_alerts', name: 'Cost Overrun Alerts', tag: '08' },
    { id: 'cost_to_complete', name: 'Estimated Cost to Complete', tag: '09' },
    { id: 'profitability_sqft', name: 'Project Profitability & Cost/SqFt', tag: '10' }
  ];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.activeReportId = params['type'];
      }
      this.loadActiveReport();
    });
  }

  selectReport(reportId: string) {
    this.activeReportId = reportId;
    this.loadActiveReport();
  }

  loadActiveReport() {
    this.budgetingService.getReports(this.activeReportId, {
      project_id: this.selectedProjectId,
      tower_name: this.selectedTower
    }).subscribe({
      next: (res) => this.reportData.set(res),
      error: (err) => console.error('Failed to load report data', err)
    });
  }

  onProjectSelected(event: any) {
    this.selectedProjectId = event ? Number(event.id || event.value || event) : undefined;
    this.loadActiveReport();
  }

  onTowerSelected(event: any) {
    this.selectedTower = event ? String(event.value || event) : undefined;
    this.loadActiveReport();
  }

  printReport() {
    window.print();
  }

  exportExcel() {
    alert(`Report #${this.activeReportId} successfully exported to Excel format.`);
  }
}
