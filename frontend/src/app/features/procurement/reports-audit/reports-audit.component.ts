import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import { CardContainerComponent, SearchableSelectComponent, SelectOption } from '../../../shared/components';

type ReportCategory = 'Procurement' | 'Inventory' | 'Accounts Payable' | 'Governance';
interface ColDef { key: string; label: string; type?: 'text' | 'number' | 'currency' | 'date' | 'badge' | 'days'; }
interface ReportDefinition { id: string; title: string; category: ReportCategory; description: string; columns: ColDef[]; }
interface KpiCard { label: string; value: string | number; sub?: string; color?: string; }

@Component({
  selector: 'app-reports-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, ProcurementNavComponent, CardContainerComponent, SearchableSelectComponent],
  template: `
    <app-procurement-nav title="9.15 Procurement & Inventory Reports" subtitle="Operational, inventory and supplier payable reporting across projects">
      <div actions class="flex flex-wrap items-center gap-2 report-actions">
        <button type="button" (click)="loadReport()" class="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">Refresh</button>
        <button type="button" (click)="downloadExcel()" [disabled]="loading || !filteredRows.length" class="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">⬇ Excel</button>
        <button type="button" (click)="downloadPdf()" [disabled]="loading || !filteredRows.length" class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">🖨 PDF</button>
      </div>
    </app-procurement-nav>

    <!-- Main Layout: Sidebar + Content -->
    <div class="flex gap-4 items-start">

      <!-- ── LEFT SIDEBAR MENU ──────────────────────────────── -->
      <aside class="report-sidebar w-64 shrink-0 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <!-- Sidebar Header -->
        <div class="border-b border-slate-100 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <div class="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Report Navigator</div>
          <div class="mt-1 text-[11px] text-slate-500">{{ totalReportCount }} reports available</div>
        </div>

        <!-- Category Groups -->
        <nav class="py-2">
          @for (cat of categoryMeta; track cat.id) {
            <!-- Category Header (collapsible) -->
            <button type="button"
              (click)="toggleCategory(cat.id)"
              class="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <div class="flex items-center gap-2">
                <span class="text-sm">{{ cat.icon }}</span>
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ cat.label }}</span>
                <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{{ countReports(cat.label) }}</span>
              </div>
              <svg class="w-3.5 h-3.5 text-slate-400 transition-transform"
                [class.rotate-90]="expandedCategories.has(cat.id)"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>

            <!-- Sub-menu items -->
            @if (expandedCategories.has(cat.id)) {
              <div class="pb-1">
                @for (report of getReportsByCategory(cat.label); track report.id) {
                  <button type="button"
                    (click)="selectReport(report.id)"
                    class="w-full text-left px-4 py-2 pl-9 text-[11px] transition-colors border-l-2 flex items-start gap-2"
                    [ngClass]="selectedReportId === report.id
                      ? 'border-amber-500 bg-amber-50 text-amber-700 font-semibold dark:bg-amber-950/40 dark:text-amber-300'
                      : 'border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'">
                    <span class="mt-0.5 shrink-0 text-[9px]">{{ selectedReportId === report.id ? '▶' : '·' }}</span>
                    <span class="leading-tight">{{ report.title }}</span>
                  </button>
                }
              </div>
            }
          }
        </nav>
      </aside>

      <!-- ── RIGHT CONTENT PANEL ────────────────────────────── -->
      <div class="min-w-0 flex-1">

        <!-- Report Header Card -->
        <div class="mb-4 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{{ activeReport.category }}</div>
              <h2 class="mt-0.5 text-base font-bold text-slate-800 dark:text-slate-100">{{ activeReport.title }}</h2>
              <p class="mt-1 text-xs text-slate-500">{{ activeReport.description }}</p>
            </div>
            <input type="search" [(ngModel)]="searchQuery" (ngModelChange)="page = 1"
              placeholder="Filter rows…"
              class="report-filters h-9 rounded-lg border border-slate-200 px-3 text-xs sm:w-64 dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div class="mt-2 text-[11px] text-slate-400">{{ filteredRows.length }} records · Page {{ page }} of {{ totalPages }}</div>
        </div>

        <!-- KPI Summary -->
        @if (!loading && kpis.length) {
          <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            @for (kpi of kpis; track kpi.label) {
              <div class="rounded-xl border border-slate-100 bg-white p-3 shadow-xs dark:border-slate-700 dark:bg-slate-900">
                <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{{ kpi.label }}</div>
                <div class="mt-1 text-xl font-bold" [ngClass]="kpi.color ?? 'text-slate-800 dark:text-slate-100'">{{ kpi.value }}</div>
                @if (kpi.sub) { <div class="text-[10px] text-slate-400">{{ kpi.sub }}</div> }
              </div>
            }
          </div>
        }

        <!-- State messages -->
        @if (errorMessage) {
          <div class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">⚠ {{ errorMessage }}</div>
        }
        @if (loading) {
          <div class="flex items-center justify-center gap-3 rounded-xl border border-slate-100 bg-white py-16 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            <svg class="h-5 w-5 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            Loading {{ activeReport.title }}…
          </div>
        }
        @if (!loading && !errorMessage && rows.length === 0) {
          <div class="rounded-xl border border-slate-100 bg-white py-16 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            No records available for this report.
          </div>
        }

        <!-- Data Table -->
        @if (!loading && filteredRows.length > 0) {
          <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <table class="w-full border-collapse text-left text-xs">
              <thead>
                <tr class="border-b bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  @for (col of activeReport.columns; track col.key) {
                    <th class="whitespace-nowrap px-3 py-3 font-semibold">{{ col.label }}</th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @for (row of pagedRows; track $index) {
                  <tr class="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors">
                    @for (col of activeReport.columns; track col.key) {
                      <td class="max-w-[240px] truncate px-3 py-2.5 text-slate-700 dark:text-slate-200"
                          [title]="displayValue(row[col.key], col.type)">
                        @if (col.type === 'badge') {
                          <span class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            [ngClass]="badgeClass(row[col.key])">{{ row[col.key] ?? '—' }}</span>
                        } @else if (col.type === 'currency') {
                          <span class="font-mono text-slate-700 dark:text-slate-200">{{ row[col.key] != null ? '৳ ' + (row[col.key] | number:'1.0-0') : '—' }}</span>
                        } @else if (col.type === 'days') {
                          <span [ngClass]="daysClass(row[col.key])">{{ row[col.key] != null ? row[col.key] + ' d' : '—' }}</span>
                        } @else {
                          {{ displayValue(row[col.key], col.type) }}
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="report-pagination mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Showing {{ pageStart + 1 }}–{{ pageEnd }} of {{ filteredRows.length }}</span>
            <div class="flex items-center gap-2">
              <button type="button" (click)="changePage(page - 1)" [disabled]="page <= 1"
                class="rounded-lg border px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">‹ Prev</button>
              <span class="font-medium">{{ page }} / {{ totalPages }}</span>
              <button type="button" (click)="changePage(page + 1)" [disabled]="page >= totalPages"
                class="rounded-lg border px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Next ›</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @media print {
      .report-actions, .report-filters, .report-pagination, .report-sidebar, app-procurement-nav { display: none !important; }
      :host { color: #000; }
    }
  `]

})
export class ReportsAuditComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly categories: ReportCategory[] = ['Procurement', 'Inventory', 'Accounts Payable', 'Governance'];

  readonly reports: ReportDefinition[] = [
    // ── PROCUREMENT ──────────────────────────────────────────────────────
    {
      id: 'pr_register', title: 'Purchase Requisition Register', category: 'Procurement',
      description: 'All purchase requisitions with requested quantities, priority and approval status.',
      columns: [
        { key: 'requisition_number', label: 'PR No.' },
        { key: 'project_name', label: 'Project' },
        { key: 'requisition_date', label: 'Date', type: 'date' },
        { key: 'item_description', label: 'Item / Description' },
        { key: 'quantity_requested', label: 'Qty', type: 'number' },
        { key: 'unit', label: 'Unit' },
        { key: 'priority', label: 'Priority', type: 'badge' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'requested_by', label: 'Requested By' },
      ]
    },
    {
      id: 'approval_aging', title: 'Purchase Requisition Approval Aging', category: 'Procurement',
      description: 'Open requisitions pending approval with elapsed age and aging bucket.',
      columns: [
        { key: 'requisition_number', label: 'PR No.' },
        { key: 'project_name', label: 'Project' },
        { key: 'requisition_date', label: 'Submitted', type: 'date' },
        { key: 'item_description', label: 'Item' },
        { key: 'priority', label: 'Priority', type: 'badge' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'approval_age_days', label: 'Age (Days)', type: 'days' },
        { key: 'aging_bucket', label: 'Aging Bucket' },
        { key: 'requested_by', label: 'Requested By' },
      ]
    },
    {
      id: 'rfq_comparison', title: 'RFQ & Supplier Quotation Comparison', category: 'Procurement',
      description: 'Issued RFQs and comparative statements with supplier quotation details.',
      columns: [
        { key: 'record_type', label: 'Type', type: 'badge' },
        { key: 'rfq_number', label: 'RFQ / CS No.' },
        { key: 'project_name', label: 'Project' },
        { key: 'rfq_date', label: 'Date', type: 'date' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'item_description', label: 'Item' },
        { key: 'quoted_price', label: 'Quoted Price', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'vendor_performance', title: 'Approved Supplier & Vendor Performance', category: 'Procurement',
      description: 'Active supplier directory with linked PO and supplier bill activity.',
      columns: [
        { key: 'vendor_code', label: 'Code' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'trade_category', label: 'Category' },
        { key: 'purchase_order_count', label: 'POs', type: 'number' },
        { key: 'purchase_order_value', label: 'PO Value', type: 'currency' },
        { key: 'supplier_bill_count', label: 'Bills', type: 'number' },
        { key: 'on_time_delivery_pct', label: 'On-time %' },
        { key: 'is_active', label: 'Active' },
      ]
    },
    {
      id: 'po_register', title: 'Purchase Order Register', category: 'Procurement',
      description: 'All purchase orders with project, supplier, value and current status.',
      columns: [
        { key: 'po_number', label: 'PO No.' },
        { key: 'project_name', label: 'Project' },
        { key: 'po_date', label: 'Date', type: 'date' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'total_amount', label: 'PO Value', type: 'currency' },
        { key: 'expected_delivery_date', label: 'Expected Delivery', type: 'date' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'prepared_by', label: 'Prepared By' },
      ]
    },
    {
      id: 'outstanding_orders', title: 'Outstanding Order Quantities', category: 'Procurement',
      description: 'Open orders not yet completed or cancelled, with outstanding quantities.',
      columns: [
        { key: 'po_number', label: 'PO No.' },
        { key: 'project_name', label: 'Project' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'total_amount', label: 'PO Value', type: 'currency' },
        { key: 'expected_delivery_date', label: 'Expected Delivery', type: 'date' },
        { key: 'outstanding_quantity', label: 'Outstanding Qty', type: 'number' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'delayed_deliveries', title: 'Delayed Deliveries & Supplier Lead Time', category: 'Procurement',
      description: 'Open orders past expected delivery date with elapsed delay days.',
      columns: [
        { key: 'po_number', label: 'PO No.' },
        { key: 'project_name', label: 'Project' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'po_date', label: 'PO Date', type: 'date' },
        { key: 'expected_delivery_date', label: 'Expected Delivery', type: 'date' },
        { key: 'delay_days', label: 'Delay (Days)', type: 'days' },
        { key: 'total_amount', label: 'PO Value', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'price_variance', title: 'Purchase Price Variance & Procurement Savings', category: 'Procurement',
      description: 'Comparative statements with quote price differences and savings recorded.',
      columns: [
        { key: 'cs_number', label: 'CS No.' },
        { key: 'project_name', label: 'Project' },
        { key: 'cs_date', label: 'Date', type: 'date' },
        { key: 'item_description', label: 'Item' },
        { key: 'lowest_quote', label: 'Lowest Quote', type: 'currency' },
        { key: 'selected_price', label: 'Selected Price', type: 'currency' },
        { key: 'price_variance', label: 'Variance', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'budget_commitments', title: 'Budget versus Procurement Commitments', category: 'Procurement',
      description: 'Purchase order commitments grouped by project.',
      columns: [
        { key: 'project_name', label: 'Project' },
        { key: 'po_number', label: 'PO No.' },
        { key: 'po_date', label: 'PO Date', type: 'date' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'total_amount', label: 'Committed Value', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'emergency_purchases', title: 'Emergency & Non-competitive Purchases', category: 'Procurement',
      description: 'Emergency requisitions and direct/non-competitive purchase orders.',
      columns: [
        { key: 'po_number', label: 'PO / PR No.' },
        { key: 'project_name', label: 'Project' },
        { key: 'po_date', label: 'Date', type: 'date' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'priority', label: 'Priority', type: 'badge' },
        { key: 'procurement_method', label: 'Method' },
        { key: 'total_amount', label: 'Value', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },

    // ── INVENTORY ─────────────────────────────────────────────────────────
    {
      id: 'stock_by_location', title: 'Current Stock by Warehouse, Project & Item', category: 'Inventory',
      description: 'Current store balances and valuation by location and material.',
      columns: [
        { key: 'warehouse_name', label: 'Warehouse' },
        { key: 'project_name', label: 'Project' },
        { key: 'item_code', label: 'Item Code' },
        { key: 'item_name', label: 'Item Name' },
        { key: 'unit', label: 'Unit' },
        { key: 'quantity_on_hand', label: 'Qty on Hand', type: 'number' },
        { key: 'unit_cost', label: 'Unit Cost', type: 'currency' },
        { key: 'total_value', label: 'Total Value', type: 'currency' },
      ]
    },
    {
      id: 'stock_ledger', title: 'Stock Ledger & Movement History', category: 'Inventory',
      description: 'Inventory transaction ledger with receipts, issues, transfers and adjustments.',
      columns: [
        { key: 'transaction_date', label: 'Date', type: 'date' },
        { key: 'transaction_type', label: 'Type', type: 'badge' },
        { key: 'reference_number', label: 'Reference' },
        { key: 'warehouse_name', label: 'Warehouse' },
        { key: 'item_name', label: 'Item' },
        { key: 'quantity_in', label: 'Qty In', type: 'number' },
        { key: 'quantity_out', label: 'Qty Out', type: 'number' },
        { key: 'balance', label: 'Balance', type: 'number' },
        { key: 'unit_cost', label: 'Unit Cost', type: 'currency' },
      ]
    },
    {
      id: 'grn_issue_register', title: 'Goods Receipt & Material Issue Register', category: 'Inventory',
      description: 'Combined GRN and material issue notes across all projects.',
      columns: [
        { key: 'record_type', label: 'Type', type: 'badge' },
        { key: 'document_number', label: 'Document No.' },
        { key: 'project_name', label: 'Project' },
        { key: 'transaction_date', label: 'Date', type: 'date' },
        { key: 'vendor_name', label: 'Supplier / Issued To' },
        { key: 'item_name', label: 'Item' },
        { key: 'quantity', label: 'Qty', type: 'number' },
        { key: 'unit_cost', label: 'Unit Cost', type: 'currency' },
        { key: 'total_value', label: 'Total Value', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'transfer_transit', title: 'Material Transfer & In-transit Report', category: 'Inventory',
      description: 'Stock transfers, dispatch and receiving status across warehouses.',
      columns: [
        { key: 'transfer_number', label: 'Transfer No.' },
        { key: 'transfer_date', label: 'Date', type: 'date' },
        { key: 'from_warehouse', label: 'From Warehouse' },
        { key: 'to_warehouse', label: 'To Warehouse' },
        { key: 'item_name', label: 'Item' },
        { key: 'quantity', label: 'Qty', type: 'number' },
        { key: 'dispatch_date', label: 'Dispatched', type: 'date' },
        { key: 'receive_date', label: 'Received', type: 'date' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'stock_valuation', title: 'Stock Valuation & Reconciliation', category: 'Inventory',
      description: 'Store valuation and period-end stock reconciliation results.',
      columns: [
        { key: 'record_type', label: 'Type', type: 'badge' },
        { key: 'warehouse_name', label: 'Warehouse' },
        { key: 'item_name', label: 'Item' },
        { key: 'book_quantity', label: 'Book Qty', type: 'number' },
        { key: 'physical_quantity', label: 'Physical Qty', type: 'number' },
        { key: 'variance_quantity', label: 'Variance Qty', type: 'number' },
        { key: 'unit_cost', label: 'Unit Cost', type: 'currency' },
        { key: 'total_value', label: 'Total Value', type: 'currency' },
      ]
    },
    {
      id: 'reorder_risk', title: 'Reorder Alerts & Stockout Risk', category: 'Inventory',
      description: 'Items at or below reorder thresholds with stockout risk flag.',
      columns: [
        { key: 'warehouse_name', label: 'Warehouse' },
        { key: 'item_code', label: 'Item Code' },
        { key: 'item_name', label: 'Item' },
        { key: 'quantity_on_hand', label: 'On Hand', type: 'number' },
        { key: 'reorder_level', label: 'Reorder Level', type: 'number' },
        { key: 'shortage', label: 'Shortage', type: 'number' },
        { key: 'unit', label: 'Unit' },
        { key: 'risk_level', label: 'Risk', type: 'badge' },
      ]
    },
    {
      id: 'slow_obsolete', title: 'Slow-moving, Obsolete, Damaged & Quarantined', category: 'Inventory',
      description: 'Stock aging and inventory condition or adjustment details.',
      columns: [
        { key: 'warehouse_name', label: 'Warehouse' },
        { key: 'item_name', label: 'Item' },
        { key: 'condition', label: 'Condition', type: 'badge' },
        { key: 'quantity', label: 'Qty', type: 'number' },
        { key: 'last_movement_date', label: 'Last Movement', type: 'date' },
        { key: 'age_days', label: 'Age (Days)', type: 'days' },
        { key: 'total_value', label: 'Value', type: 'currency' },
        { key: 'remarks', label: 'Remarks' },
      ]
    },
    {
      id: 'physical_variance', title: 'Physical Stock Count Variance', category: 'Inventory',
      description: 'Inventory adjustment records for physical count variance analysis.',
      columns: [
        { key: 'adjustment_number', label: 'Adj. No.' },
        { key: 'adjustment_date', label: 'Date', type: 'date' },
        { key: 'warehouse_name', label: 'Warehouse' },
        { key: 'item_name', label: 'Item' },
        { key: 'book_quantity', label: 'Book Qty', type: 'number' },
        { key: 'physical_quantity', label: 'Physical Qty', type: 'number' },
        { key: 'variance_quantity', label: 'Variance', type: 'number' },
        { key: 'variance_value', label: 'Variance Value', type: 'currency' },
        { key: 'reason', label: 'Reason' },
      ]
    },
    {
      id: 'consumption_boq', title: 'Material Consumption versus BOQ', category: 'Inventory',
      description: 'Project consumption reconciliation against BOQ quantities.',
      columns: [
        { key: 'project_name', label: 'Project' },
        { key: 'item_name', label: 'Item' },
        { key: 'boq_quantity', label: 'BOQ Qty', type: 'number' },
        { key: 'consumed_quantity', label: 'Consumed Qty', type: 'number' },
        { key: 'variance_quantity', label: 'Variance', type: 'number' },
        { key: 'unit', label: 'Unit' },
        { key: 'consumption_pct', label: 'Consumed %' },
      ]
    },
    {
      id: 'project_wastage', title: 'Project Stock & Material Wastage', category: 'Inventory',
      description: 'Project-level consumption reconciliation and recorded wastage.',
      columns: [
        { key: 'project_name', label: 'Project' },
        { key: 'item_name', label: 'Item' },
        { key: 'issued_quantity', label: 'Issued Qty', type: 'number' },
        { key: 'consumed_quantity', label: 'Consumed Qty', type: 'number' },
        { key: 'wastage_quantity', label: 'Wastage Qty', type: 'number' },
        { key: 'wastage_value', label: 'Wastage Value', type: 'currency' },
        { key: 'wastage_pct', label: 'Wastage %' },
        { key: 'unit', label: 'Unit' },
      ]
    },

    // ── ACCOUNTS PAYABLE ──────────────────────────────────────────────────
    {
      id: 'invoice_register', title: 'Supplier Invoice Register', category: 'Accounts Payable',
      description: 'All supplier bills created from purchase and goods receipt activity.',
      columns: [
        { key: 'invoice_number', label: 'Invoice No.' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'invoice_date', label: 'Invoice Date', type: 'date' },
        { key: 'due_date', label: 'Due Date', type: 'date' },
        { key: 'po_number', label: 'PO No.' },
        { key: 'total_amount', label: 'Invoice Amount', type: 'currency' },
        { key: 'paid_amount', label: 'Paid', type: 'currency' },
        { key: 'outstanding_amount', label: 'Outstanding', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'unpaid_overdue', title: 'Unpaid & Overdue Supplier Bills', category: 'Accounts Payable',
      description: 'Unpaid bills and overdue days where invoice due dates are recorded.',
      columns: [
        { key: 'invoice_number', label: 'Invoice No.' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'invoice_date', label: 'Invoice Date', type: 'date' },
        { key: 'due_date', label: 'Due Date', type: 'date' },
        { key: 'total_amount', label: 'Amount', type: 'currency' },
        { key: 'outstanding_amount', label: 'Outstanding', type: 'currency' },
        { key: 'overdue_days', label: 'Overdue (Days)', type: 'days' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'supplier_balances', title: 'Supplier Advances & Outstanding Balances', category: 'Accounts Payable',
      description: 'Supplier bill balances, advances and outstanding amounts.',
      columns: [
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'invoice_number', label: 'Invoice No.' },
        { key: 'invoice_date', label: 'Invoice Date', type: 'date' },
        { key: 'total_amount', label: 'Invoice Amount', type: 'currency' },
        { key: 'supplier_advance', label: 'Advance', type: 'currency' },
        { key: 'paid_amount', label: 'Paid', type: 'currency' },
        { key: 'outstanding_amount', label: 'Outstanding', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'payment_history', title: 'Supplier Payment History', category: 'Accounts Payable',
      description: 'Recorded supplier payment details linked to invoices.',
      columns: [
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'invoice_number', label: 'Invoice No.' },
        { key: 'payment_date', label: 'Payment Date', type: 'date' },
        { key: 'payment_method', label: 'Method' },
        { key: 'paid_amount', label: 'Amount Paid', type: 'currency' },
        { key: 'payment_reference', label: 'Reference' },
      ]
    },
    {
      id: 'grn_discrepancies', title: 'Invoice-to-GRN Discrepancy Report', category: 'Accounts Payable',
      description: 'Goods receipts with invoice matching discrepancies or non-matched status.',
      columns: [
        { key: 'grn_number', label: 'GRN No.' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'grn_date', label: 'GRN Date', type: 'date' },
        { key: 'po_number', label: 'PO No.' },
        { key: 'invoice_number', label: 'Invoice No.' },
        { key: 'grn_value', label: 'GRN Value', type: 'currency' },
        { key: 'invoice_value', label: 'Invoice Value', type: 'currency' },
        { key: 'variance', label: 'Variance', type: 'currency' },
        { key: 'match_status', label: 'Match Status', type: 'badge' },
      ]
    },
    {
      id: 'returns_credit_notes', title: 'Supplier Returns & Credit Notes', category: 'Accounts Payable',
      description: 'Supplier bills and debit/credit note records related to returns.',
      columns: [
        { key: 'invoice_number', label: 'Invoice / Note No.' },
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'invoice_date', label: 'Date', type: 'date' },
        { key: 'transaction_type', label: 'Type', type: 'badge' },
        { key: 'total_amount', label: 'Amount', type: 'currency' },
        { key: 'credit_note_amount', label: 'Credit Note', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ]
    },
    {
      id: 'tax_summary', title: 'VAT, Tax & Withholding Summary', category: 'Accounts Payable',
      description: 'Supplier tax and VAT fields summarized from bill records.',
      columns: [
        { key: 'vendor_name', label: 'Supplier' },
        { key: 'invoice_number', label: 'Invoice No.' },
        { key: 'invoice_date', label: 'Date', type: 'date' },
        { key: 'taxable_amount', label: 'Taxable Amount', type: 'currency' },
        { key: 'vat_amount', label: 'VAT', type: 'currency' },
        { key: 'tax_withheld', label: 'Tax Withheld', type: 'currency' },
        { key: 'total_amount', label: 'Total', type: 'currency' },
      ]
    },

    // ── GOVERNANCE ───────────────────────────────────────────────────────
    {
      id: 'audit_trail', title: 'Procurement Audit Trail', category: 'Governance',
      description: 'Chronological procurement, inventory and accounts payable audit events.',
      columns: [
        { key: 'event_time', label: 'Timestamp', type: 'date' },
        { key: 'module', label: 'Module', type: 'badge' },
        { key: 'action', label: 'Action', type: 'badge' },
        { key: 'document_reference', label: 'Reference' },
        { key: 'performed_by', label: 'User' },
        { key: 'description', label: 'Description' },
      ]
    },
  ];

  selectedCategory: ReportCategory = 'Procurement';
  selectedReportId = 'pr_register';
  reportOptions: SelectOption[] = [];
  rows: any[] = [];
  loading = false;
  errorMessage = '';
  searchQuery = '';
  page = 1;
  pageSize = 25;
  kpis: KpiCard[] = [];

  get activeReport(): ReportDefinition {
    return this.reports.find(r => r.id === this.selectedReportId) ?? this.reports[0];
  }

  get filteredRows(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(row =>
      this.activeReport.columns.some(col =>
        String(row[col.key] ?? '').toLowerCase().includes(q)
      )
    );
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize)); }
  get pageStart(): number { return (this.page - 1) * this.pageSize; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.filteredRows.length); }
  get pagedRows(): any[] { return this.filteredRows.slice(this.pageStart, this.pageStart + this.pageSize); }

  categoryMeta: { id: string; label: ReportCategory; icon: string }[] = [
    { id: 'procurement', label: 'Procurement', icon: '📦' },
    { id: 'inventory', label: 'Inventory', icon: '🏭' },
    { id: 'ap', label: 'Accounts Payable', icon: '💳' },
    { id: 'governance', label: 'Governance', icon: '🛡️' }
  ];

  expandedCategories = new Set<string>(['procurement', 'inventory', 'ap', 'governance']);

  get totalReportCount(): number {
    return this.reports.length;
  }

  toggleCategory(catId: string): void {
    if (this.expandedCategories.has(catId)) {
      this.expandedCategories.delete(catId);
    } else {
      this.expandedCategories.add(catId);
    }
  }

  getReportsByCategory(category: ReportCategory): ReportDefinition[] {
    return this.reports.filter(r => r.category === category);
  }

  selectReport(reportId: string): void {
    this.selectedReportId = reportId;
    const rep = this.reports.find(r => r.id === reportId);
    if (rep) {
      this.selectedCategory = rep.category;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { report: reportId },
      queryParamsHandling: 'merge'
    });
    this.loadReport();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const repId = params['report'] || params['tab'];
      if (repId && this.reports.some(r => r.id === repId)) {
        if (this.selectedReportId !== repId) {
          this.selectedReportId = repId;
          const rep = this.reports.find(r => r.id === repId);
          if (rep) {
            this.selectedCategory = rep.category;
            const meta = this.categoryMeta.find(m => m.label === rep.category);
            if (meta) this.expandedCategories.add(meta.id);
          }
          this.loadReport();
        }
      } else {
        this.loadReport();
      }
    });
    this.updateReportOptions();
  }

  countReports(category: ReportCategory): number { return this.reports.filter(r => r.category === category).length; }

  selectCategory(category: ReportCategory): void {
    this.selectedCategory = category;
    const first = this.reports.find(r => r.category === category);
    if (first) this.selectedReportId = first.id;
    this.updateReportOptions();
    this.loadReport();
  }

  loadReport(): void {
    this.page = 1;
    this.errorMessage = '';
    this.loading = true;
    this.kpis = [];
    this.getReportRequest().subscribe({
      next: result => {
        this.rows = this.prepareRows(result);
        this.kpis = this.buildKpis(this.rows);
        this.loading = false;
      },
      error: err => {
        this.rows = [];
        this.kpis = [];
        this.errorMessage = err?.error?.detail || `Unable to load ${this.activeReport.title.toLowerCase()}.`;
        this.loading = false;
      }
    });
  }

  private updateReportOptions(): void {
    this.reportOptions = this.reports
      .filter(r => r.category === this.selectedCategory)
      .map(r => ({ value: r.id, label: r.title }));
  }

  private getReportRequest(): Observable<any> {
    const limit = 500;
    switch (this.selectedReportId) {
      case 'pr_register': case 'approval_aging':
        return this.procurementService.getRequisitions({ limit });
      case 'rfq_comparison':
        return forkJoin({
          rfqs: this.procurementService.getRFQs().pipe(catchError(() => of([]))),
          comparisons: this.procurementService.getComparativeStatements().pipe(catchError(() => of([])))
        });
      case 'vendor_performance':
        return forkJoin({
          vendors: this.procurementService.getVendors(undefined, undefined, limit).pipe(catchError(() => of([]))),
          orders: this.procurementService.getPurchaseOrders({ limit }).pipe(catchError(() => of([]))),
          bills: this.procurementService.getSupplierBills({ limit }).pipe(catchError(() => of([])))
        });
      case 'po_register': case 'outstanding_orders': case 'delayed_deliveries':
      case 'budget_commitments': case 'emergency_purchases':
        return this.procurementService.getPurchaseOrders({ limit });
      case 'price_variance':
        return this.procurementService.getComparativeStatements();
      case 'stock_by_location':
        return this.procurementService.getStoreValuationSummary();
      case 'stock_ledger':
        return this.procurementService.getInventoryLedger({ limit });
      case 'grn_issue_register':
        return forkJoin({
          receipts: this.procurementService.getGoodsReceipts({ limit }).pipe(catchError(() => of([]))),
          issues: this.procurementService.getMaterialIssues({ limit }).pipe(catchError(() => of([])))
        });
      case 'transfer_transit':
        return this.procurementService.getStockTransfers({ limit });
      case 'stock_valuation':
        return forkJoin({
          valuation: this.procurementService.getStoreValuationSummary().pipe(catchError(() => of([]))),
          reconciliation: this.procurementService.getPeriodEndReconciliation().pipe(catchError(() => of([])))
        });
      case 'reorder_risk':
        return this.procurementService.getReorderAlerts();
      case 'slow_obsolete':
        return this.procurementService.getStockAgingReport();
      case 'physical_variance':
        return this.procurementService.getStockAdjustments({ limit });
      case 'consumption_boq': case 'project_wastage':
        return this.procurementService.getConsumptionReconciliationReport();
      case 'invoice_register': case 'unpaid_overdue': case 'supplier_balances':
      case 'payment_history': case 'returns_credit_notes': case 'tax_summary':
        return this.procurementService.getSupplierBills({ limit });
      case 'grn_discrepancies':
        return this.procurementService.getGoodsReceipts({ limit });
      case 'audit_trail':
        return this.procurementService.getAuditTrail(limit);
      default:
        return this.procurementService.getRequisitions({ limit });
    }
  }

  private prepareRows(result: any): any[] {
    const id = this.selectedReportId;
    const today = new Date();
    let source: any[] = [];

    if (id === 'rfq_comparison') {
      const comparisons: any[] = this.toRows(result?.comparisons);
      const rfqs: any[] = this.toRows(result?.rfqs);
      source = comparisons.length
        ? comparisons.map((r: any) => ({ ...r, record_type: 'Comparative Statement' }))
        : rfqs.map((r: any) => ({ ...r, record_type: 'RFQ' }));
    } else if (id === 'vendor_performance') {
      source = this.toRows(result?.vendors)
        .filter((v: any) => v.is_active)
        .map((v: any) => {
          const orders: any[] = this.toRows(result?.orders).filter((o: any) => o.vendor_id === v.id);
          const bills: any[] = this.toRows(result?.bills).filter((b: any) => b.vendor_id === v.id);
          return {
            vendor_code: v.vendor_code, vendor_name: v.vendor_name, trade_category: v.trade_category,
            is_active: v.is_active ? 'Yes' : 'No',
            purchase_order_count: orders.length,
            purchase_order_value: orders.reduce((s: number, o: any) => s + Number(o.total_amount ?? o.total_value ?? 0), 0),
            supplier_bill_count: bills.length,
            on_time_delivery_pct: v.on_time_delivery_pct ?? '—',
          };
        });
    } else if (id === 'grn_issue_register') {
      const receipts = this.toRows(result?.receipts).map((r: any) => ({
        record_type: 'Goods Receipt',
        document_number: r.grn_number ?? r.receipt_number ?? r.id,
        project_name: r.project_name, transaction_date: r.receipt_date ?? r.grn_date,
        vendor_name: r.vendor_name, item_name: r.item_name ?? r.material_name,
        quantity: r.quantity_received ?? r.quantity, unit_cost: r.unit_cost,
        total_value: r.total_value ?? r.total_amount, status: r.status,
      }));
      const issues = this.toRows(result?.issues).map((r: any) => ({
        record_type: 'Material Issue',
        document_number: r.issue_number ?? r.min_number ?? r.id,
        project_name: r.project_name, transaction_date: r.issue_date,
        vendor_name: r.issued_to ?? r.requested_by, item_name: r.item_name ?? r.material_name,
        quantity: r.quantity_issued ?? r.quantity, unit_cost: r.unit_cost,
        total_value: r.total_value, status: r.status,
      }));
      source = [...receipts, ...issues];
    } else if (id === 'stock_valuation') {
      source = [
        ...this.toRows(result?.valuation).map((r: any) => ({ ...r, record_type: 'Store Valuation' })),
        ...this.toRows(result?.reconciliation).map((r: any) => ({ ...r, record_type: 'Period Reconciliation' }))
      ];
    } else {
      source = this.toRows(result);
    }

    // Per-report transforms
    if (id === 'approval_aging') {
      source = source
        .filter((r: any) => !['APPROVED_FOR_PURCHASE','RFQ_ISSUED','PO_ISSUED','REJECTED','CANCELLED'].includes(String(r.status ?? '').toUpperCase()))
        .map((r: any) => {
          const age = Math.max(0, Math.floor((today.getTime() - new Date(r.requisition_date ?? today).getTime()) / 86400000));
          return { ...r, approval_age_days: age, aging_bucket: age > 14 ? 'Over 14 days' : age > 7 ? '8–14 days' : '0–7 days' };
        });
    } else if (id === 'outstanding_orders') {
      source = source
        .filter((r: any) => !['COMPLETED','CLOSED','CANCELLED'].includes(String(r.status ?? '').toUpperCase()))
        .map((r: any) => ({ ...r, outstanding_quantity: this.outstandingQuantity(r) }));
    } else if (id === 'delayed_deliveries') {
      source = source.map((r: any) => {
        const due = r.expected_delivery_date ?? r.required_delivery_date ?? r.delivery_due_date;
        const days = due ? Math.floor((today.getTime() - new Date(due).getTime()) / 86400000) : 0;
        const done = ['COMPLETED','CLOSED','CANCELLED'].includes(String(r.status ?? '').toUpperCase());
        return { ...r, expected_delivery_date: due ?? null, delay_days: days > 0 && !done ? days : 0 };
      }).filter((r: any) => r.delay_days > 0);
    } else if (id === 'emergency_purchases') {
      source = source.filter((r: any) =>
        ['EMERGENCY','URGENT'].includes(String(r.priority ?? r.purchase_priority ?? '').toUpperCase()) ||
        /direct|single.source|non.competitive/i.test(String(r.procurement_method ?? r.purchase_type ?? ''))
      );
    } else if (id === 'unpaid_overdue') {
      source = source
        .filter((r: any) => !['PAID','SETTLED','CLOSED'].includes(String(r.status ?? '').toUpperCase()))
        .map((r: any) => {
          const due = r.due_date ?? r.invoice_due_date ?? r.payment_due_date;
          return { ...r, due_date: due, outstanding_amount: r.outstanding_amount ?? r.balance_due ?? null,
            overdue_days: due ? Math.max(0, Math.floor((today.getTime() - new Date(due).getTime()) / 86400000)) : null };
        });
    } else if (id === 'supplier_balances') {
      source = source.map((r: any) => ({
        ...r,
        outstanding_amount: r.outstanding_amount ?? r.balance_due ?? r.due_amount ?? null,
        supplier_advance: r.supplier_advance ?? r.advance_amount ?? null,
      }));
    } else if (id === 'payment_history') {
      source = source.flatMap((r: any) =>
        Array.isArray(r.payments)
          ? r.payments.map((p: any) => ({ invoice_number: r.invoice_number, vendor_name: r.vendor_name, ...p }))
          : (r.payment_date || r.paid_amount) ? [{ ...r, paid_amount: r.paid_amount ?? r.amount_paid }] : []
      );
    } else if (id === 'grn_discrepancies') {
      source = source
        .filter((r: any) => /mismatch|discrep|variance|pending/i.test(String(r.match_status ?? r.invoice_match_status ?? '')) || Number(r.invoice_variance ?? r.quantity_variance ?? 0) !== 0)
        .map((r: any) => ({
          ...r,
          grn_number: r.grn_number ?? r.receipt_number, grn_date: r.grn_date ?? r.receipt_date,
          grn_value: r.grn_value ?? r.total_amount, invoice_value: r.invoice_value ?? r.billed_amount,
          variance: Number(r.invoice_variance ?? r.quantity_variance ?? 0),
          match_status: r.match_status ?? r.invoice_match_status ?? 'Pending',
        }));
    } else if (id === 'returns_credit_notes') {
      source = source.filter((r: any) =>
        /return|credit|debit.note/i.test(String(r.transaction_type ?? r.bill_type ?? r.status ?? '')) ||
        Number(r.credit_note_amount ?? r.debit_note_amount ?? 0) !== 0
      );
    } else if (id === 'tax_summary') {
      source = source.map((r: any) => ({
        vendor_name: r.vendor_name, invoice_number: r.invoice_number ?? r.bill_number,
        invoice_date: r.invoice_date ?? r.bill_date,
        taxable_amount: r.taxable_amount ?? r.subtotal ?? null,
        vat_amount: r.vat_amount ?? r.vat ?? null,
        tax_withheld: r.tax_withheld ?? r.withholding_tax ?? null,
        total_amount: r.total_amount,
      }));
    } else if (id === 'price_variance') {
      source = source.map((r: any) => ({
        ...r,
        price_variance: Number(r.price_variance ?? r.saving_amount ?? 0),
        lowest_quote: r.lowest_quote ?? r.min_quote,
        selected_price: r.selected_price ?? r.awarded_price,
      }));
    }

    return source;
  }

  private buildKpis(rows: any[]): KpiCard[] {
    if (!rows.length) return [{ label: 'Total Records', value: rows.length }];
    const id = this.selectedReportId;
    const total = rows.length;
    const sum = (key: string) => rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);
    const cnt = (key: string, val: string) => rows.filter(r => String(r[key] ?? '').toUpperCase() === val.toUpperCase()).length;
    const fmt = (n: number) => n >= 1e7 ? (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? (n / 1e5).toFixed(2) + ' Lakh' : n.toLocaleString('en-BD', { maximumFractionDigits: 0 });

    switch (id) {
      case 'pr_register':
        return [
          { label: 'Total PRs', value: total },
          { label: 'Pending', value: rows.filter(r => /pending|submitted/i.test(r.status ?? '')).length, color: 'text-amber-600' },
          { label: 'Approved', value: rows.filter(r => /approved/i.test(r.status ?? '')).length, color: 'text-emerald-600' },
          { label: 'Rejected', value: rows.filter(r => /rejected|cancelled/i.test(r.status ?? '')).length, color: 'text-rose-600' },
        ];
      case 'approval_aging':
        return [
          { label: 'Pending PRs', value: total, color: 'text-amber-600' },
          { label: 'Over 14 Days', value: rows.filter(r => r.approval_age_days > 14).length, color: 'text-rose-600' },
          { label: 'Avg Age (Days)', value: Math.round(sum('approval_age_days') / total) },
          { label: 'Max Age (Days)', value: Math.max(...rows.map(r => Number(r.approval_age_days ?? 0))), color: 'text-rose-600' },
        ];
      case 'po_register':
        return [
          { label: 'Total POs', value: total },
          { label: 'PO Value', value: '৳ ' + fmt(sum('total_amount')), color: 'text-primary' },
          { label: 'Completed', value: rows.filter(r => /completed|closed/i.test(r.status ?? '')).length, color: 'text-emerald-600' },
          { label: 'Open', value: rows.filter(r => !/(completed|closed|cancelled)/i.test(r.status ?? '')).length, color: 'text-amber-600' },
        ];
      case 'outstanding_orders':
        return [
          { label: 'Outstanding POs', value: total, color: 'text-amber-600' },
          { label: 'Total Value', value: '৳ ' + fmt(sum('total_amount')), color: 'text-primary' },
          { label: 'Suppliers', value: new Set(rows.map(r => r.vendor_name)).size },
          { label: 'Projects', value: new Set(rows.map(r => r.project_name)).size },
        ];
      case 'delayed_deliveries':
        return [
          { label: 'Delayed POs', value: total, color: 'text-rose-600' },
          { label: 'Total Delayed Value', value: '৳ ' + fmt(sum('total_amount')), color: 'text-rose-600' },
          { label: 'Avg Delay (Days)', value: Math.round(sum('delay_days') / total), color: 'text-amber-600' },
          { label: 'Max Delay (Days)', value: Math.max(...rows.map(r => Number(r.delay_days ?? 0))), color: 'text-rose-600' },
        ];
      case 'vendor_performance':
        return [
          { label: 'Active Suppliers', value: total },
          { label: 'Total PO Value', value: '৳ ' + fmt(sum('purchase_order_value')), color: 'text-primary' },
          { label: 'Total Bills', value: sum('supplier_bill_count') },
          { label: 'Categories', value: new Set(rows.map(r => r.trade_category)).size },
        ];
      case 'invoice_register':
        return [
          { label: 'Total Invoices', value: total },
          { label: 'Invoice Value', value: '৳ ' + fmt(sum('total_amount')), color: 'text-primary' },
          { label: 'Paid', value: '৳ ' + fmt(sum('paid_amount')), color: 'text-emerald-600' },
          { label: 'Outstanding', value: '৳ ' + fmt(sum('outstanding_amount')), color: 'text-rose-600' },
        ];
      case 'unpaid_overdue':
        return [
          { label: 'Unpaid Bills', value: total, color: 'text-amber-600' },
          { label: 'Outstanding', value: '৳ ' + fmt(sum('outstanding_amount')), color: 'text-rose-600' },
          { label: 'Overdue Bills', value: rows.filter(r => (r.overdue_days ?? 0) > 0).length, color: 'text-rose-600' },
          { label: 'Max Overdue (Days)', value: Math.max(...rows.map(r => Number(r.overdue_days ?? 0))), color: 'text-rose-600' },
        ];
      case 'supplier_balances':
        return [
          { label: 'Total Bills', value: total },
          { label: 'Total Advance', value: '৳ ' + fmt(sum('supplier_advance')), color: 'text-amber-600' },
          { label: 'Total Outstanding', value: '৳ ' + fmt(sum('outstanding_amount')), color: 'text-rose-600' },
          { label: 'Suppliers', value: new Set(rows.map(r => r.vendor_name)).size },
        ];
      case 'tax_summary':
        return [
          { label: 'Total Invoices', value: total },
          { label: 'Taxable Amount', value: '৳ ' + fmt(sum('taxable_amount')) },
          { label: 'VAT', value: '৳ ' + fmt(sum('vat_amount')), color: 'text-amber-600' },
          { label: 'Tax Withheld', value: '৳ ' + fmt(sum('tax_withheld')), color: 'text-rose-600' },
        ];
      case 'stock_by_location':
        return [
          { label: 'Stock Items', value: total },
          { label: 'Total Value', value: '৳ ' + fmt(sum('total_value')), color: 'text-primary' },
          { label: 'Warehouses', value: new Set(rows.map(r => r.warehouse_name)).size },
          { label: 'Projects', value: new Set(rows.map(r => r.project_name)).size },
        ];
      case 'reorder_risk':
        return [
          { label: 'At Risk Items', value: total, color: 'text-amber-600' },
          { label: 'Zero Stock', value: rows.filter(r => Number(r.quantity_on_hand ?? 0) <= 0).length, color: 'text-rose-600' },
          { label: 'Warehouses', value: new Set(rows.map(r => r.warehouse_name)).size },
          { label: 'Total Shortage', value: fmt(sum('shortage')), color: 'text-rose-600' },
        ];
      default:
        return [{ label: 'Total Records', value: total }];
    }
  }

  private toRows(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    for (const key of ['items', 'rows', 'accounts', 'results', 'data']) {
      if (Array.isArray((data as any)[key])) return (data as any)[key];
    }
    const arrays = Object.entries(data).filter(([, v]) => Array.isArray(v));
    if (arrays.length) return arrays.flatMap(([sec, vals]) => (vals as any[]).map(r => ({ report_section: sec, ...r })));
    return [data];
  }

  private outstandingQuantity(order: any): number | string | null {
    if (order.outstanding_quantity !== undefined) return order.outstanding_quantity;
    const lines = order.items ?? order.lines ?? order.order_items;
    if (!Array.isArray(lines)) return null;
    return lines.reduce((s: number, l: any) =>
      s + Math.max(0, Number(l.quantity ?? l.ordered_quantity ?? 0) - Number(l.received_quantity ?? l.delivered_quantity ?? 0)), 0);
  }

  displayValue(value: any, type?: string): string {
    if (value === null || value === undefined || value === '') return '—';
    if (type === 'date' && value) {
      const d = new Date(value);
      return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-BD');
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  badgeClass(value: any): string {
    const v = String(value ?? '').toUpperCase();
    if (['APPROVED','COMPLETED','PAID','SETTLED','ACTIVE','YES','RECEIVED'].some(s => v.includes(s)))
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
    if (['PENDING','OPEN','OUTSTANDING','DRAFT','PARTIAL','SUBMITTED'].some(s => v.includes(s)))
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    if (['REJECTED','CANCELLED','OVERDUE','MISMATCH','DELAYED','EMERGENCY','URGENT','CRITICAL','QUARANTINE'].some(s => v.includes(s)))
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
    if (['RFQ','ISSUED','GOODS RECEIPT','MATERIAL ISSUE','COMPARATIVE','TRANSFER'].some(s => v.includes(s)))
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  }

  daysClass(value: any): string {
    const n = Number(value ?? 0);
    if (n > 14) return 'font-bold text-rose-600';
    if (n > 7) return 'font-semibold text-amber-600';
    if (n > 0) return 'text-amber-500';
    return 'text-slate-400';
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.page = page;
  }

  downloadExcel(): void {
    if (!this.filteredRows.length) return;
    const exportData = this.filteredRows.map(row =>
      Object.fromEntries(this.activeReport.columns.map(col => [col.label, this.displayValue(row[col.key], col.type)]))
    );
    const sheet = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, this.activeReport.title.slice(0, 31));
    XLSX.writeFile(wb, `procurement-${this.activeReport.id}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  downloadPdf(): void {
    const prev = this.pageSize;
    this.pageSize = Math.max(this.filteredRows.length, 1);
    this.page = 1;
    setTimeout(() => { window.print(); this.pageSize = prev; this.page = 1; });
  }
}
