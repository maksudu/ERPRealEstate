import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectFinancialPerformance, ProjectFinancialPerformancePaginationResponse } from '../../../core/models/project.model';
import { ProjectNavComponent } from '../project-nav/project-nav.component';
import {
  CardContainerComponent,
  SearchableSelectComponent,
  CustomInputComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-project-financial-performance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ProjectNavComponent,
    CardContainerComponent,
    SearchableSelectComponent,
    CustomInputComponent
  ],
  template: `
    <div class="space-y-6">
      <!-- Project Navigation Strip -->
      <app-project-nav activeCode="2.13"></app-project-nav>

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Recognized Project Revenue -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recognized Revenue (POC)</span>
            <span class="p-1.5 rounded-lg bg-primary/10 text-primary">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-foreground mt-2">
            ৳{{ (totalRecognizedRev() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
            IFRS 15 Performance Obligation Realized
          </p>
        </div>

        <!-- 2. Customer Advances Collected -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customer Cash Inflow</span>
            <span class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-2">
            ৳{{ (totalCollections() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Cash Advances & Installments Realized</p>
        </div>

        <!-- 3. Gross Project Profit -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gross Project Profit</span>
            <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mt-2">
            ৳{{ (totalGrossProfit() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Avg Margin: {{ avgGrossMargin() | number:'1.1-1' }}%</p>
        </div>

        <!-- 4. Profit Before Tax (PBT) -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Profit Before Tax (PBT)</span>
            <span class="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-purple-600 dark:text-purple-400 mt-2">
            ৳{{ (totalPBT() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">EBIT minus Debt Financing Expenses</p>
        </div>
      </div>

      <!-- Main Financial P&L Card Container -->
      <app-card-container
        title="2.13 Project-wise Profit & Loss Financial Statement"
        subtitle="Multi-period financial view integrating Sales, Accounts Receivable, Procurement, Accounts Payable, Payroll, and General Ledger"
        badge="General Ledger Integrated"
      >
        <!-- Top Action Buttons -->
        <div card-actions class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="prePopulateSamplePnL()"
            [disabled]="seeding()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            title="Pre-populate illustrative statement (৳50 Cr Revenue, ৳10 Cr Land, ৳18 Cr Const, ৳3 Cr Consultants, ৳19 Cr Gross, ৳2 Cr Overheads, ৳1.5 Cr Interest = ৳15.5 Cr PBT)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
            <span>{{ seeding() ? 'Generating...' : 'Seed Illustrative P&L (৳50 Cr / ৳15.5 Cr PBT)' }}</span>
          </button>

          <!-- Export Excel -->
          <button
            type="button"
            (click)="exportToExcel()"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span>Export Excel</span>
          </button>

          <!-- Export PDF -->
          <button
            type="button"
            (click)="exportToPDF()"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <svg class="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            <span>Print / PDF</span>
          </button>

          <!-- Add P&L Period Button -->
          <a
            routerLink="/projects/financial-performance/create"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Record Financial P&L Period</span>
          </a>
        </div>

        <!-- Filter Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl bg-secondary/30 border border-border mb-5">
          <!-- Project Filter -->
          <div>
            <app-searchable-select
              label="Development Project"
              [options]="projectFilterOptions()"
              [searchable]="true"
              [(ngModel)]="selectedProjectId"
              (selectionChange)="onFilterChange()"
              placeholder="All Projects"
            ></app-searchable-select>
          </div>

          <!-- Fiscal Year Filter -->
          <div>
            <app-searchable-select
              label="Fiscal Year"
              [options]="fiscalYearFilterOptions"
              [(ngModel)]="selectedFiscalYear"
              (selectionChange)="onFilterChange()"
              placeholder="All Years"
            ></app-searchable-select>
          </div>

          <!-- Period Type Filter -->
          <div>
            <app-searchable-select
              label="Period Type"
              [options]="periodTypeFilterOptions"
              [(ngModel)]="selectedPeriodType"
              (selectionChange)="onFilterChange()"
              placeholder="All Period Types"
            ></app-searchable-select>
          </div>

          <!-- Status Filter -->
          <div>
            <app-searchable-select
              label="Audit Status"
              [options]="statusFilterOptions"
              [(ngModel)]="selectedStatus"
              (selectionChange)="onFilterChange()"
              placeholder="All Statuses"
            ></app-searchable-select>
          </div>

          <!-- Search Query -->
          <div>
            <app-custom-input
              label="Search Statement"
              placeholder="Cost center, notes, officer..."
              [(ngModel)]="searchTerm"
              (input)="onSearchInput()"
            ></app-custom-input>
          </div>
        </div>

        <!-- Enterprise Financial Statement Table -->
        <div class="overflow-x-auto rounded-xl border border-border">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-secondary/60 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3">Period & Cost Center</th>
                <th class="px-4 py-3">Recognized Revenue (POC)</th>
                <th class="px-4 py-3">Cost of Sales (Direct Costs)</th>
                <th class="px-4 py-3">Gross Project Profit</th>
                <th class="px-4 py-3">Operating Overheads</th>
                <th class="px-4 py-3">Financing Interest</th>
                <th class="px-4 py-3">Profit Before Tax (PBT)</th>
                <th class="px-4 py-3">Cash vs Accrual</th>
                <th class="px-4 py-3">Audit Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border text-foreground">
              @if (loading()) {
                <tr>
                  <td colspan="10" class="px-4 py-12 text-center text-muted-foreground">
                    <div class="flex items-center justify-center gap-2">
                      <svg class="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Loading project-wise profit & loss statements...</span>
                    </div>
                  </td>
                </tr>
              } @else if (records().length === 0) {
                <tr>
                  <td colspan="10" class="px-4 py-12 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2">
                      <svg class="w-8 h-8 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                      </svg>
                      <p class="font-medium text-foreground">No financial performance records found.</p>
                      <p class="text-xs text-muted-foreground">Click "Seed Illustrative P&L" or "Record Financial P&L Period" to create statements.</p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (r of records(); track r.id) {
                  <tr class="hover:bg-secondary/30 transition-colors">
                    <!-- 1. Period & Cost Center -->
                    <td class="px-4 py-3">
                      <div class="font-bold text-foreground font-display">{{ r.period_name }}</div>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="font-mono text-[10px] text-primary font-bold">{{ r.cost_center_code }}</span>
                        <span class="text-border">|</span>
                        <span class="text-[10px] text-muted-foreground">{{ r.fiscal_year }}</span>
                        <span class="text-border">|</span>
                        <span class="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded bg-secondary text-foreground">
                          {{ r.period_type }}
                        </span>
                      </div>
                      <div class="text-[10px] text-muted-foreground mt-0.5">{{ r.project_name }}</div>
                    </td>

                    <!-- 2. Recognized Revenue -->
                    <td class="px-4 py-3 font-mono">
                      <div class="font-bold text-foreground text-sm">
                        ৳{{ (r.recognized_revenue / 10000000) | number:'1.2-2' }} Cr
                      </div>
                      <div class="text-[10px] text-emerald-600 font-sans">
                        Collected: ৳{{ (r.customer_advances_collected / 10000000) | number:'1.2-2' }} Cr
                      </div>
                    </td>

                    <!-- 3. Cost of Sales Breakdown -->
                    <td class="px-4 py-3 font-mono text-[11px]">
                      <div class="font-bold text-amber-600">
                        Total: ৳{{ (r.total_cost_of_sales / 10000000) | number:'1.2-2' }} Cr
                      </div>
                      <div class="text-[10px] text-muted-foreground font-sans mt-0.5 space-y-0.5">
                        <div>Land: ৳{{ (r.land_cost_allocated / 10000000) | number:'1.2-2' }} Cr</div>
                        <div>Const: ৳{{ (r.construction_materials_cost / 10000000) | number:'1.2-2' }} Cr</div>
                        <div>Consult: ৳{{ (r.consultants_direct_cost / 10000000) | number:'1.2-2' }} Cr</div>
                      </div>
                    </td>

                    <!-- 4. Gross Project Profit -->
                    <td class="px-4 py-3 font-mono">
                      <div class="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ৳{{ (r.gross_project_profit / 10000000) | number:'1.2-2' }} Cr
                      </div>
                      <span class="inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-sans mt-0.5">
                        {{ r.gross_profit_margin_pct | number:'1.1-1' }}% Margin
                      </span>
                    </td>

                    <!-- 5. Operating Overheads -->
                    <td class="px-4 py-3 font-mono text-[11px]">
                      <div class="font-bold text-foreground">
                        ৳{{ (r.allocated_operating_expenses / 10000000) | number:'1.2-2' }} Cr
                      </div>
                      <div class="text-[10px] text-muted-foreground font-sans">
                        EBIT: ৳{{ (r.operating_profit_ebit / 10000000) | number:'1.2-2' }} Cr
                      </div>
                    </td>

                    <!-- 6. Financing Interest -->
                    <td class="px-4 py-3 font-mono text-[11px]">
                      <div class="font-semibold text-rose-500">
                        ৳{{ (r.financing_expenses / 10000000) | number:'1.2-2' }} Cr
                      </div>
                      <div class="text-[10px] text-muted-foreground font-sans">
                        Debt: ৳{{ (r.bank_loan_outstanding / 10000000) | number:'1.2-2' }} Cr
                      </div>
                    </td>

                    <!-- 7. Profit Before Tax (PBT) -->
                    <td class="px-4 py-3 font-mono">
                      <div class="font-bold text-blue-600 dark:text-blue-400 text-sm">
                        ৳{{ (r.profit_before_tax_pbt / 10000000) | number:'1.2-2' }} Cr
                      </div>
                      <div class="text-[10px] text-muted-foreground font-sans">
                        Dev Share: ৳{{ (r.developer_net_pbt / 10000000) | number:'1.2-2' }} Cr
                      </div>
                    </td>

                    <!-- 8. Cash vs Accrual -->
                    <td class="px-4 py-3 font-mono text-[10px] space-y-0.5">
                      <div>
                        <span class="text-muted-foreground font-sans">Certified:</span>
                        ৳{{ (r.contractor_work_certified / 10000000) | number:'1.2-2' }} Cr
                      </div>
                      <div>
                        <span class="text-muted-foreground font-sans">Disbursed:</span>
                        ৳{{ (r.contractor_payments_made / 10000000) | number:'1.2-2' }} Cr
                      </div>
                      <div class="text-amber-600 font-sans">
                        Payable: ৳{{ (r.outstanding_contractor_payable / 10000000) | number:'1.2-2' }} Cr
                      </div>
                    </td>

                    <!-- 9. Audit Status -->
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                        [ngClass]="getStatusBadgeClass(r.status)"
                      >
                        <span class="w-1.5 h-1.5 rounded-full" [ngClass]="getStatusDotClass(r.status)"></span>
                        {{ r.status }}
                      </span>
                    </td>

                    <!-- 10. Actions -->
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <a
                          [routerLink]="['/projects/financial-performance/edit', r.id]"
                          class="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-primary transition-colors"
                          title="Edit Statement & Reconciliations"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                          </svg>
                        </a>
                        <button
                          type="button"
                          (click)="deleteRecord(r)"
                          class="p-1.5 rounded-lg border border-border bg-secondary hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                          title="Delete Statement Period"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 text-xs text-muted-foreground pt-4 border-t border-border">
          <div class="flex items-center gap-2">
            <span>Showing {{ paginationStart() }} to {{ paginationEnd() }} of {{ totalCount() }} P&L periods</span>
            <span class="text-border">|</span>
            <label class="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                [(ngModel)]="limit"
                (ngModelChange)="onLimitChange()"
                class="px-2 py-1 rounded-md border border-border bg-card text-foreground font-medium"
              >
                <option [ngValue]="10">10</option>
                <option [ngValue]="25">25</option>
                <option [ngValue]="50">50</option>
              </select>
            </label>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="prevPage()"
              [disabled]="offset() === 0 || loading()"
              class="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-40"
            >
              Previous
            </button>
            <span class="px-2 font-mono font-semibold text-foreground">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="offset() + limit >= totalCount() || loading()"
              class="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </app-card-container>

      <!-- Accounting Disclaimer & Methodology Info Box -->
      <div class="p-4 rounded-xl bg-card border border-border flex items-start gap-3 shadow-2xs">
        <div class="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="text-xs space-y-1">
          <h4 class="font-bold text-foreground">Important Accounting Distinction: Integrated Revenue & Expense Rules</h4>
          <p class="text-muted-foreground leading-relaxed">
            Customer advances are not automatically recognized as revenue, and contractor payments are not automatically equivalent to construction expense. The ERP derives reported P&L from integrated accounting rules (IFRS 15 percentage of completion and accrued IPC work certifications) rather than simply adding cash receipts and subtracting cash payments.
          </p>
        </div>
      </div>
    </div>
  `
})
export class ProjectFinancialPerformanceComponent implements OnInit {
  private projectService = inject(ProjectService);

  // Data signals
  records = signal<ProjectFinancialPerformance[]>([]);
  projects = signal<Project[]>([]);
  loading = signal<boolean>(false);
  seeding = signal<boolean>(false);

  // Aggregation signals
  totalCount = signal<number>(0);
  totalRecognizedRev = signal<number>(0);
  totalCollections = signal<number>(0);
  totalGrossProfit = signal<number>(0);
  totalPBT = signal<number>(0);
  avgGrossMargin = signal<number>(0);
  avgPBTMargin = signal<number>(0);

  // Pagination
  limit = 10;
  offset = signal<number>(0);

  // Filters
  selectedProjectId: any = null;
  selectedFiscalYear: string = '';
  selectedPeriodType: string = '';
  selectedStatus: string = '';
  searchTerm: string = '';

  fiscalYearFilterOptions: SelectOption[] = [
    { value: '', label: 'All Fiscal Years' },
    { value: '2025-26', label: 'FY 2025-26' },
    { value: '2024-25', label: 'FY 2024-25' },
    { value: '2026-27', label: 'FY 2026-27' }
  ];

  periodTypeFilterOptions: SelectOption[] = [
    { value: '', label: 'All Period Types' },
    { value: 'CUMULATIVE_TO_DATE', label: 'Cumulative Lifecycle' },
    { value: 'ANNUAL', label: 'Annual Statements' },
    { value: 'QUARTERLY', label: 'Quarterly Statements' },
    { value: 'MONTHLY', label: 'Monthly Statements' }
  ];

  statusFilterOptions: SelectOption[] = [
    { value: '', label: 'All Audit Statuses' },
    { value: 'AUDITED', label: 'Audited' },
    { value: 'PROVISIONAL', label: 'Provisional' },
    { value: 'FINAL_CLOSURE', label: 'Final Closure' }
  ];

  projectFilterOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [{ value: null, label: 'All Development Projects' }];
    this.projects().forEach(p => {
      list.push({
        value: p.id,
        label: `${p.project_name} (${p.project_code})`
      });
    });
    return list;
  });

  currentPage = computed(() => Math.floor(this.offset() / this.limit) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.limit)));
  paginationStart = computed(() => (this.totalCount() === 0 ? 0 : this.offset() + 1));
  paginationEnd = computed(() => Math.min(this.offset() + this.limit, this.totalCount()));

  ngOnInit(): void {
    this.loadProjects();
    this.loadRecords();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data || [])
    });
  }

  loadRecords(): void {
    this.loading.set(true);
    const params: any = {
      limit: this.limit,
      offset: this.offset()
    };

    if (this.selectedProjectId) params.project_id = Number(this.selectedProjectId);
    if (this.selectedFiscalYear) params.fiscal_year = this.selectedFiscalYear;
    if (this.selectedPeriodType) params.period_type = this.selectedPeriodType;
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.searchTerm && this.searchTerm.trim()) params.search = this.searchTerm.trim();

    this.projectService.getFinancialPerformances(params).subscribe({
      next: (resp: ProjectFinancialPerformancePaginationResponse) => {
        this.loading.set(false);
        if (resp && resp.items !== undefined) {
          this.records.set(resp.items || []);
          this.totalCount.set(resp.total || 0);
          this.totalRecognizedRev.set(resp.total_recognized_revenue || 0);
          this.totalCollections.set(resp.total_customer_collections || 0);
          this.totalGrossProfit.set(resp.total_gross_profit || 0);
          this.totalPBT.set(resp.total_pbt || 0);
          this.avgGrossMargin.set(resp.avg_gross_margin_pct || 0);
          this.avgPBTMargin.set(resp.avg_pbt_margin_pct || 0);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.offset.set(0);
    this.loadRecords();
  }

  onSearchInput(): void {
    this.offset.set(0);
    this.loadRecords();
  }

  onLimitChange(): void {
    this.offset.set(0);
    this.loadRecords();
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.update(val => Math.max(0, val - this.limit));
      this.loadRecords();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit < this.totalCount()) {
      this.offset.update(val => val + this.limit);
      this.loadRecords();
    }
  }

  prePopulateSamplePnL(): void {
    let pId = this.selectedProjectId ? Number(this.selectedProjectId) : null;
    if (!pId && this.projects().length > 0) {
      pId = this.projects()[0].id;
    }

    if (!pId) {
      alert('Please select or create a project first to seed illustrative P&L statements.');
      return;
    }

    if (!confirm('Seed realistic illustrative P&L statements (৳50 Cr Revenue, ৳10 Cr Land, ৳18 Cr Const, ৳3 Cr Consultants, ৳19 Cr Gross Profit, ৳2 Cr Overheads, ৳1.5 Cr Financing = ৳15.5 Cr PBT) for this project?')) {
      return;
    }

    this.seeding.set(true);
    this.projectService.seedSamplePnL(pId).subscribe({
      next: () => {
        this.seeding.set(false);
        this.loadRecords();
      },
      error: (err) => {
        this.seeding.set(false);
        alert(err.error?.detail || 'Failed to seed sample P&L.');
      }
    });
  }

  deleteRecord(r: ProjectFinancialPerformance): void {
    if (!confirm(`Are you sure you want to delete P&L statement "${r.period_name}"?`)) {
      return;
    }

    this.projectService.deleteFinancialPerformance(r.id).subscribe({
      next: () => {
        this.loadRecords();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to delete record.');
      }
    });
  }

  exportToExcel(): void {
    const csvRows: string[] = [];
    csvRows.push(['Period', 'Cost Center', 'Fiscal Year', 'Recognized Revenue (BDT)', 'Land Cost (BDT)', 'Construction (BDT)', 'Consultants (BDT)', 'Total Cost of Sales (BDT)', 'Gross Profit (BDT)', 'Operating Expenses (BDT)', 'Financing Expenses (BDT)', 'Profit Before Tax (BDT)', 'Audit Status'].join(','));

    this.records().forEach(r => {
      csvRows.push([
        `"${r.period_name}"`,
        `"${r.cost_center_code}"`,
        `"${r.fiscal_year}"`,
        r.recognized_revenue,
        r.land_cost_allocated,
        r.construction_materials_cost,
        r.consultants_direct_cost,
        r.total_cost_of_sales,
        r.gross_project_profit,
        r.allocated_operating_expenses,
        r.financing_expenses,
        r.profit_before_tax_pbt,
        `"${r.status}"`
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_Profit_And_Loss_Statement_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportToPDF(): void {
    window.print();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'AUDITED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'PROVISIONAL':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'FINAL_CLOSURE':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'AUDITED':
        return 'bg-emerald-500';
      case 'PROVISIONAL':
        return 'bg-blue-500';
      case 'FINAL_CLOSURE':
        return 'bg-purple-500';
      default:
        return 'bg-muted-foreground';
    }
  }
}
