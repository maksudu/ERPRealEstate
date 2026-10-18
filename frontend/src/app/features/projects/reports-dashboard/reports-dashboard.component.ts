import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectPnLAnalyticsResponse } from '../../../core/models/project.model';
import { ProjectNavComponent } from '../project-nav/project-nav.component';
import {
  CardContainerComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-project-reports-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProjectNavComponent,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-6">
      <!-- Project Navigation Bar -->
      <app-project-nav activeCode="2.14"></app-project-nav>

      <!-- Executive KPI Overview Ribbon -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Total Portfolio Recognized Revenue -->
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
            ৳{{ (kpiTotalRevenue() / 10000000) | number:'1.2-2' }} <span class="text-xs font-normal text-muted-foreground">Cr</span>
          </p>
          <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
            IFRS 15 Performance Obligation Realized
          </p>
        </div>

        <!-- 2. Customer Advances Collected -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customer Cash Collections</span>
            <span class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-2">
            ৳{{ (kpiTotalCollections() / 10000000) | number:'1.2-2' }} <span class="text-xs font-normal text-muted-foreground">Cr</span>
          </p>
          <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Gross Bank Inflow & Downpayments
          </p>
        </div>

        <!-- 3. Portfolio Gross Margin -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gross Project Margin</span>
            <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mt-2">
            {{ kpiAvgGrossMargin() | number:'1.1-1' }}%
          </p>
          <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            ৳{{ (kpiTotalGrossProfit() / 10000000) | number:'1.2-2' }} Cr Value Realized
          </p>
        </div>

        <!-- 4. Profit Before Tax (PBT) -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Net Profit Before Tax (PBT)</span>
            <span class="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-purple-600 dark:text-purple-400 mt-2">
            ৳{{ (kpiTotalPBT() / 10000000) | number:'1.2-2' }} <span class="text-xs font-normal text-muted-foreground">Cr</span>
          </p>
          <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Bottom-Line Net Earning Rate
          </p>
        </div>
      </div>

      <!-- Core Financial Intelligence & Report Control Suite -->
      <app-card-container
        title="2.14 Project Reports & Financial BI Intelligence"
        subtitle="Standardized statutory, cost variance, profit & loss, and audit reports with multi-format Excel & PDF export"
        badge="Enterprise BI"
      >
        <!-- Filter Toolbar & Export Actions -->
        <div class="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-xs space-y-4 mb-6">
          <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <!-- Dynamic Searchable Project Select with + Add New -->
              <app-searchable-select
                label="Filter by Project"
                [options]="projectOptions()"
                [value]="selectedProjectId()"
                [placeholder]="'All Projects'"
                [showAddButton]="true"
                (valueChange)="onProjectChange($event)"
                (addNew)="goToProjectCreate()"
              ></app-searchable-select>

              <!-- Dynamic Period Type Select -->
              <app-searchable-select
                label="Period Scope"
                [options]="periodTypeOptions"
                [value]="selectedPeriodType()"
                [placeholder]="'All Period Types'"
                (valueChange)="onPeriodTypeChange($event)"
              ></app-searchable-select>

              <!-- Dynamic Fiscal Year Select -->
              <app-searchable-select
                label="Fiscal Year"
                [options]="fiscalYearOptions"
                [value]="selectedFiscalYear()"
                [placeholder]="'All Fiscal Years'"
                (valueChange)="onFiscalYearChange($event)"
              ></app-searchable-select>
            </div>

            <!-- Export Buttons -->
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                (click)="exportCurrentReportToExcel()"
                class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-2xs"
              >
                <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                <span>Export Excel (.CSV)</span>
              </button>

              <button
                type="button"
                (click)="printOrExportPDF()"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-2xs"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                <span>Print / Export PDF</span>
              </button>
            </div>
          </div>

          <!-- Important Accounting Distinction Banner -->
          <div class="p-3.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
            <svg class="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="space-y-1">
              <p class="font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Core Accounting Distinction (Accrual & POC Recognition Rules)
              </p>
              <p class="leading-relaxed opacity-90 text-[11px]">
                <strong>Customer advances are not automatically recognized as revenue</strong> (recognized only as contract obligations are fulfilled under IFRS 15), and <strong>contractor disbursements are not automatically equivalent to construction expense</strong> (recognized based on certified work-done accruals). This ERP derives reported P&L from audited general ledger entries rather than simple cash-in and cash-out additions.
              </p>
            </div>
          </div>
        </div>

        <!-- 9 Interactive Report Tabs Navigation Strip -->
        <div class="border-b border-border mb-6">
          <div class="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin">
            @for (tab of reportTabs; track tab.id) {
              <button
                type="button"
                (click)="activeReportTab.set(tab.id)"
                [class]="activeReportTab() === tab.id
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60'"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors duration-150"
              >
                <span class="font-mono text-[10px] opacity-75 font-bold">{{ tab.code }}</span>
                <span>{{ tab.label }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="p-12 text-center text-muted-foreground">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p class="text-sm font-medium">Aggregating multi-project financial intelligence...</p>
          </div>
        } @else {

          <!-- ========================================================================= -->
          <!-- REPORT 1: Project-wise Profit and Loss by Month, Quarter, and Year -->
          <!-- ========================================================================= -->
          @if (activeReportTab() === 'pnl-summary') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-foreground">1. Project-wise Profit and Loss Statement</h3>
                <span class="text-xs text-muted-foreground font-mono">By Month, Quarter & Cumulative Year</span>
              </div>
              <div class="overflow-x-auto rounded-xl border border-border shadow-2xs">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th class="py-3 px-4">Project</th>
                      <th class="py-3 px-3">Period</th>
                      <th class="py-3 px-3">Type</th>
                      <th class="py-3 px-3 text-right">Recognized Rev</th>
                      <th class="py-3 px-3 text-right">Land Cost</th>
                      <th class="py-3 px-3 text-right">Construction</th>
                      <th class="py-3 px-3 text-right">Consultants</th>
                      <th class="py-3 px-3 text-right">Total COS</th>
                      <th class="py-3 px-3 text-right font-bold text-foreground">Gross Profit</th>
                      <th class="py-3 px-3 text-right">GM %</th>
                      <th class="py-3 px-3 text-right">SG&A / Fin</th>
                      <th class="py-3 px-3 text-right font-bold text-foreground">PBT</th>
                      <th class="py-3 px-4 text-right font-bold text-foreground">Net %</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (row of analyticsData()?.pnl_summary_table; track row.id) {
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 font-semibold text-foreground">
                          {{ row.project_name }}
                          <span class="block text-[10px] text-muted-foreground font-mono">{{ row.project_code }}</span>
                        </td>
                        <td class="py-3 px-3 whitespace-nowrap">{{ row.period_name }}</td>
                        <td class="py-3 px-3">
                          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            {{ row.period_type }}
                          </span>
                        </td>
                        <td class="py-3 px-3 text-right font-mono font-medium">৳{{ (row.recognized_revenue_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono text-muted-foreground">৳{{ (row.land_cost_allocated_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono text-muted-foreground">৳{{ (row.construction_materials_cost_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono text-muted-foreground">৳{{ (row.consultants_direct_cost_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono">৳{{ (row.total_cost_of_sales_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{{ (row.gross_project_profit_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{{ row.gross_profit_margin_pct }}%</td>
                        <td class="py-3 px-3 text-right font-mono text-muted-foreground">
                          ৳{{ ((row.allocated_operating_expenses_bdt + row.financing_expenses_bdt) / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-primary">
                          ৳{{ (row.profit_before_tax_pbt_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-4 text-right font-semibold text-primary">{{ row.net_profit_margin_pct }}%</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="13" class="py-8 text-center text-muted-foreground">No P&L records found for selected criteria.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- ========================================================================= -->
          <!-- REPORT 2: Budget versus Actual Expenses -->
          <!-- ========================================================================= -->
          @if (activeReportTab() === 'budget-vs-actual') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-foreground">2. Budget versus Actual Expenses Reconciliation</h3>
                <span class="text-xs text-muted-foreground">Approved Cost Baseline vs Realized General Ledger Outlays</span>
              </div>
              <div class="overflow-x-auto rounded-xl border border-border shadow-2xs">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th class="py-3 px-4">Project</th>
                      <th class="py-3 px-3">Period</th>
                      <th class="py-3 px-3">Expense Category</th>
                      <th class="py-3 px-3 text-right">Approved Budget</th>
                      <th class="py-3 px-3 text-right">Actual Expense</th>
                      <th class="py-3 px-3 text-right">Variance</th>
                      <th class="py-3 px-3 text-right">Variance %</th>
                      <th class="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (item of analyticsData()?.budget_vs_actual; track $index) {
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 font-semibold text-foreground">{{ item.project_name }}</td>
                        <td class="py-3 px-3">{{ item.period_name }}</td>
                        <td class="py-3 px-3 font-medium">{{ item.category }}</td>
                        <td class="py-3 px-3 text-right font-mono">৳{{ (item.approved_budget_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono font-semibold">৳{{ (item.actual_expense_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono" [class]="item.variance_bdt >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                          {{ item.variance_bdt >= 0 ? '+' : '' }}৳{{ (item.variance_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-3 text-right font-semibold" [class]="item.variance_pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                          {{ item.variance_pct >= 0 ? '+' : '' }}{{ item.variance_pct }}%
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span [class]="item.status === 'WITHIN_BUDGET' || item.status === 'ON_TRACK'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800'"
                            class="px-2 py-0.5 rounded text-[10px] font-semibold border">
                            {{ item.status }}
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="8" class="py-8 text-center text-muted-foreground">No budget variance records available.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- ========================================================================= -->
          <!-- REPORT 3: Revenue Recognized versus Customer Collections -->
          <!-- ========================================================================= -->
          @if (activeReportTab() === 'revenue-vs-collections') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-foreground">3. Revenue Recognized versus Customer Collections</h3>
                <span class="text-xs text-muted-foreground">IFRS 15 Earned Revenue vs Customer Cash Inflow & Unearned Advances</span>
              </div>
              <div class="overflow-x-auto rounded-xl border border-border shadow-2xs">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th class="py-3 px-4">Project</th>
                      <th class="py-3 px-3">Period</th>
                      <th class="py-3 px-3 text-right">Recognized Revenue (POC)</th>
                      <th class="py-3 px-3 text-right">Customer Collections (Cash)</th>
                      <th class="py-3 px-3 text-right">Unearned Revenue (Liability)</th>
                      <th class="py-3 px-3 text-right">Receivables Due (Asset)</th>
                      <th class="py-3 px-4 text-center">Collection Realization</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (row of analyticsData()?.revenue_vs_collections; track $index) {
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 font-semibold text-foreground">{{ row.project_name }}</td>
                        <td class="py-3 px-3">{{ row.period_name }}</td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-primary">
                          ৳{{ (row.recognized_revenue_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{{ (row.customer_advances_collected_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                          ৳{{ (row.unearned_revenue_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-3 text-right font-mono text-muted-foreground">
                          ৳{{ (row.receivables_due_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-4 text-center font-semibold">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                            {{ row.collection_efficiency_pct }}%
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="7" class="py-8 text-center text-muted-foreground">No collection reconciliation records found.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- ========================================================================= -->
          <!-- REPORT 4: Direct Cost and Allocated Overhead Breakdown -->
          <!-- ========================================================================= -->
          @if (activeReportTab() === 'direct-cost-breakdown') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-foreground">4. Direct Cost and Allocated Overhead Breakdown</h3>
                <span class="text-xs text-muted-foreground">Direct Construction Costs vs Allocated Enterprise SG&A Overheads</span>
              </div>
              <div class="overflow-x-auto rounded-xl border border-border shadow-2xs">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th class="py-3 px-4">Project</th>
                      <th class="py-3 px-3">Period</th>
                      <th class="py-3 px-3 text-right">Land Cost Allocated</th>
                      <th class="py-3 px-3 text-right">Construction & Materials</th>
                      <th class="py-3 px-3 text-right">Consultants & Design</th>
                      <th class="py-3 px-3 text-right">Allocated SG&A Overheads</th>
                      <th class="py-3 px-3 text-right">Financing Cost</th>
                      <th class="py-3 px-4 text-right font-bold text-foreground">Total Outlay</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (row of analyticsData()?.direct_cost_breakdown; track $index) {
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 font-semibold text-foreground">{{ row.project_name }}</td>
                        <td class="py-3 px-3">{{ row.period_name }}</td>
                        <td class="py-3 px-3 text-right font-mono">৳{{ (row.land_cost_allocated_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono font-semibold">৳{{ (row.construction_materials_cost_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono">৳{{ (row.consultants_direct_cost_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono text-purple-600 dark:text-purple-400">৳{{ (row.allocated_overhead_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400">৳{{ (row.financing_cost_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-4 text-right font-mono font-bold text-foreground">
                          ৳{{ (row.total_project_outlay_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="8" class="py-8 text-center text-muted-foreground">No cost breakdown records available.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- ========================================================================= -->
          <!-- REPORT 5: Committed Cost and Forecast Cost to Complete (EAC/ETC) -->
          <!-- ========================================================================= -->
          @if (activeReportTab() === 'committed-vs-forecast') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-foreground">5. Committed Cost and Forecast Cost to Complete (EAC / ETC)</h3>
                <span class="text-xs text-muted-foreground">Incurred Cost + Active Purchase Orders + Estimate to Complete</span>
              </div>
              <div class="overflow-x-auto rounded-xl border border-border shadow-2xs">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th class="py-3 px-4">Project</th>
                      <th class="py-3 px-3">Period</th>
                      <th class="py-3 px-3 text-right">Incurred Cost (ACWP)</th>
                      <th class="py-3 px-3 text-right">Committed POs/Contracts</th>
                      <th class="py-3 px-3 text-right">Estimate to Complete (ETC)</th>
                      <th class="py-3 px-3 text-right font-bold text-foreground">Estimate at Completion (EAC)</th>
                      <th class="py-3 px-4 text-center">Contingency Buffer</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (row of analyticsData()?.committed_vs_forecast; track $index) {
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 font-semibold text-foreground">{{ row.project_name }}</td>
                        <td class="py-3 px-3">{{ row.period_name }}</td>
                        <td class="py-3 px-3 text-right font-mono">৳{{ (row.incurred_cost_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400">৳{{ (row.committed_cost_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400">৳{{ (row.forecast_cost_to_complete_etc_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-foreground">
                          ৳{{ (row.estimate_at_completion_eac_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {{ row.contingency_buffer_pct }}% Safe
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="7" class="py-8 text-center text-muted-foreground">No EAC/ETC forecast records available.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- ========================================================================= -->
          <!-- REPORT 6: Project Margin and Return Metrics -->
          <!-- ========================================================================= -->
          @if (activeReportTab() === 'margin-metrics') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-foreground">6. Project Margin and Return Metrics</h3>
                <span class="text-xs text-muted-foreground">Gross Margin, Operating Margin (EBIT), Net Margin & Return on Cost (ROC)</span>
              </div>
              <div class="overflow-x-auto rounded-xl border border-border shadow-2xs">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th class="py-3 px-4">Project</th>
                      <th class="py-3 px-3">Period</th>
                      <th class="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">Gross Margin %</th>
                      <th class="py-3 px-3 text-right font-bold text-blue-600 dark:text-blue-400">Operating Margin (EBIT) %</th>
                      <th class="py-3 px-3 text-right font-bold text-purple-600 dark:text-purple-400">Net PBT Margin %</th>
                      <th class="py-3 px-4 text-right font-bold text-foreground">Return on Cost (ROC) %</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (row of analyticsData()?.margin_metrics; track $index) {
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 font-semibold text-foreground">{{ row.project_name }}</td>
                        <td class="py-3 px-3">{{ row.period_name }}</td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ row.gross_margin_pct }}%</td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{{ row.operating_margin_pct }}%</td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">{{ row.net_pbt_margin_pct }}%</td>
                        <td class="py-3 px-4 text-right font-mono font-bold text-foreground">{{ row.return_on_cost_pct }}%</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="py-8 text-center text-muted-foreground">No margin metrics found.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- ========================================================================= -->
          <!-- REPORT 7: Tower-wise and Unit-type Profitability -->
          <!-- ========================================================================= -->
          @if (activeReportTab() === 'tower-unit-profitability') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-foreground">7. Tower-wise & Unit-Type Profitability</h3>
                <span class="text-xs text-muted-foreground">Granular Contribution Margin by Residential Wings & Commercial Podiums</span>
              </div>
              <div class="overflow-x-auto rounded-xl border border-border shadow-2xs">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th class="py-3 px-4">Project</th>
                      <th class="py-3 px-3">Tower / Structure</th>
                      <th class="py-3 px-3">Inventory Type</th>
                      <th class="py-3 px-3 text-center">Units (Sold / Total)</th>
                      <th class="py-3 px-3 text-right">Recognized Revenue</th>
                      <th class="py-3 px-3 text-right">Allocated Cost</th>
                      <th class="py-3 px-3 text-right font-bold text-foreground">Gross Profit</th>
                      <th class="py-3 px-3 text-right">Margin %</th>
                      <th class="py-3 px-4 text-right">Avg Rate / Sft</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (row of analyticsData()?.tower_unit_profitability; track $index) {
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 font-semibold text-foreground">{{ row.project_name }}</td>
                        <td class="py-3 px-3 font-medium">{{ row.tower_name }}</td>
                        <td class="py-3 px-3 text-muted-foreground">{{ row.unit_type }}</td>
                        <td class="py-3 px-3 text-center font-mono">
                          <span class="font-bold text-foreground">{{ row.sold_units }}</span> / {{ row.total_units }}
                        </td>
                        <td class="py-3 px-3 text-right font-mono">৳{{ (row.recognized_revenue_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono text-muted-foreground">৳{{ (row.allocated_cost_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{{ (row.gross_profit_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{{ row.gross_margin_pct }}%</td>
                        <td class="py-3 px-4 text-right font-mono text-muted-foreground">৳{{ row.avg_sqft_rate_bdt | number }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="9" class="py-8 text-center text-muted-foreground">No tower profitability data available.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- ========================================================================= -->
          <!-- REPORT 8: Joint Venture Landowner Share and Developer Share -->
          <!-- ========================================================================= -->
          @if (activeReportTab() === 'jv-sharing-summary') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-foreground">8. Joint Venture Landowner Share & Developer Share</h3>
                <span class="text-xs text-muted-foreground">Statutory Revenue Allotment & Developer Realized Net PBT</span>
              </div>
              <div class="overflow-x-auto rounded-xl border border-border shadow-2xs">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th class="py-3 px-4">Project</th>
                      <th class="py-3 px-3">Period</th>
                      <th class="py-3 px-3 text-right">Recognized Project Revenue</th>
                      <th class="py-3 px-3 text-center">JV Ratio (LO / Dev)</th>
                      <th class="py-3 px-3 text-right text-amber-600 dark:text-amber-400">Landowner Revenue Share</th>
                      <th class="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">Developer Revenue Share</th>
                      <th class="py-3 px-4 text-right font-bold text-foreground">Developer Net PBT</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (row of analyticsData()?.jv_sharing_summary; track $index) {
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 font-semibold text-foreground">{{ row.project_name }}</td>
                        <td class="py-3 px-3">{{ row.period_name }}</td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-foreground">৳{{ (row.total_recognized_revenue_bdt / 10000000) | number:'1.2-2' }} Cr</td>
                        <td class="py-3 px-3 text-center font-semibold text-muted-foreground">
                          {{ row.landowner_ratio }} / {{ row.developer_ratio }}
                        </td>
                        <td class="py-3 px-3 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                          ৳{{ (row.landowner_share_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ৳{{ (row.developer_share_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-4 text-right font-mono font-bold text-primary">
                          ৳{{ (row.developer_net_pbt_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="7" class="py-8 text-center text-muted-foreground">No JV sharing records available.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- ========================================================================= -->
          <!-- REPORT 9: Actual Results versus Original Feasibility Estimates -->
          <!-- ========================================================================= -->
          @if (activeReportTab() === 'actual-vs-feasibility') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-foreground">9. Actual Results versus Original Feasibility Estimates</h3>
                <span class="text-xs text-muted-foreground">Commercial Baseline Audit (Feasibility vs Realized General Ledger)</span>
              </div>
              <div class="overflow-x-auto rounded-xl border border-border shadow-2xs">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th class="py-3 px-4">Project</th>
                      <th class="py-3 px-3">Period</th>
                      <th class="py-3 px-3 text-right font-bold text-foreground">Actual Realized PBT</th>
                      <th class="py-3 px-3 text-right">Feasibility Projected PBT</th>
                      <th class="py-3 px-3 text-right">Variance</th>
                      <th class="py-3 px-4 text-center">Performance Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (row of analyticsData()?.actual_vs_feasibility; track $index) {
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 font-semibold text-foreground">{{ row.project_name }}</td>
                        <td class="py-3 px-3">{{ row.period_name }}</td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-primary">
                          ৳{{ (row.actual_pbt_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-3 text-right font-mono text-muted-foreground">
                          ৳{{ (row.feasibility_profit_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-3 text-right font-mono font-semibold" [class]="row.variance_bdt >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                          {{ row.variance_bdt >= 0 ? '+' : '' }}৳{{ (row.variance_bdt / 10000000) | number:'1.2-2' }} Cr
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span [class]="row.performance_status === 'EXCEEDING_PROJECTIONS'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800'"
                            class="px-2 py-0.5 rounded text-[10px] font-semibold border">
                            {{ row.performance_status }}
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="py-8 text-center text-muted-foreground">No feasibility comparison data available.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      </app-card-container>
    </div>
  `
})
export class ProjectReportsDashboardComponent implements OnInit {
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Filter signals
  selectedProjectId = signal<number | null>(null);
  selectedPeriodType = signal<string | null>(null);
  selectedFiscalYear = signal<string | null>(null);

  // Active Report Tab
  activeReportTab = signal<string>('pnl-summary');

  // Loading & Data signals
  isLoading = signal<boolean>(false);
  analyticsData = signal<ProjectPnLAnalyticsResponse | null>(null);
  projects = signal<Project[]>([]);

  // 9 Required Report Tabs
  reportTabs = [
    { id: 'pnl-summary', code: 'RPT-01', label: '1. Project P&L Statement' },
    { id: 'budget-vs-actual', code: 'RPT-02', label: '2. Budget vs Actual' },
    { id: 'revenue-vs-collections', code: 'RPT-03', label: '3. Rev vs Collections' },
    { id: 'direct-cost-breakdown', code: 'RPT-04', label: '4. Direct Cost & Overheads' },
    { id: 'committed-vs-forecast', code: 'RPT-05', label: '5. Committed Cost & EAC' },
    { id: 'margin-metrics', code: 'RPT-06', label: '6. Margin & Return Metrics' },
    { id: 'tower-unit-profitability', code: 'RPT-07', label: '7. Tower & Unit Profitability' },
    { id: 'jv-sharing-summary', code: 'RPT-08', label: '8. JV Sharing Summary' },
    { id: 'actual-vs-feasibility', code: 'RPT-09', label: '9. Actual vs Feasibility' }
  ];

  // Dynamic dropdown options
  periodTypeOptions: SelectOption[] = [
    { label: 'All Period Types', value: '' },
    { label: 'Cumulative (Project-to-Date)', value: 'CUMULATIVE' },
    { label: 'Annual (Full Fiscal Year)', value: 'ANNUAL' },
    { label: 'Quarterly (Q1-Q4)', value: 'QUARTERLY' },
    { label: 'Monthly', value: 'MONTHLY' }
  ];

  fiscalYearOptions: SelectOption[] = [
    { label: 'All Fiscal Years', value: '' },
    { label: 'FY 2025-2026', value: 'FY 2025-2026' },
    { label: 'FY 2024-2025', value: 'FY 2024-2025' },
    { label: 'FY 2023-2024', value: 'FY 2023-2024' }
  ];

  projectOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [{ label: 'All Projects', value: '' }];
    this.projects().forEach(p => {
      list.push({
        label: `${p.project_name} (${p.project_code})`,
        value: p.id
      });
    });
    return list;
  });

  // KPI Computations
  kpiTotalRevenue = computed(() => {
    const table = this.analyticsData()?.pnl_summary_table || [];
    return table.reduce((acc, cur) => acc + (cur.recognized_revenue_bdt || 0), 0);
  });

  kpiTotalCollections = computed(() => {
    const table = this.analyticsData()?.revenue_vs_collections || [];
    return table.reduce((acc, cur) => acc + (cur.customer_advances_collected_bdt || 0), 0);
  });

  kpiTotalGrossProfit = computed(() => {
    const table = this.analyticsData()?.pnl_summary_table || [];
    return table.reduce((acc, cur) => acc + (cur.gross_project_profit_bdt || 0), 0);
  });

  kpiAvgGrossMargin = computed(() => {
    const rev = this.kpiTotalRevenue();
    const gp = this.kpiTotalGrossProfit();
    return rev > 0 ? (gp / rev) * 100 : 0;
  });

  kpiTotalPBT = computed(() => {
    const table = this.analyticsData()?.pnl_summary_table || [];
    return table.reduce((acc, cur) => acc + (cur.profit_before_tax_pbt_bdt || 0), 0);
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadReportAnalytics();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res as any)?.items || [];
        this.projects.set(list);
      },
      error: (err) => console.error('Failed to load projects for reports:', err)
    });
  }

  loadReportAnalytics(): void {
    this.isLoading.set(true);
    const pId = this.selectedProjectId() || undefined;
    const pType = this.selectedPeriodType() || undefined;
    const fy = this.selectedFiscalYear() || undefined;

    this.projectService.getPnLAnalytics({ project_id: pId, period_type: pType, fiscal_year: fy }).subscribe({
      next: (res) => {
        this.analyticsData.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load report analytics:', err);
        this.isLoading.set(false);
      }
    });
  }

  onProjectChange(val: string | number | null): void {
    this.selectedProjectId.set(val ? Number(val) : null);
    this.loadReportAnalytics();
  }

  onPeriodTypeChange(val: string | number | null): void {
    this.selectedPeriodType.set(val ? String(val) : null);
    this.loadReportAnalytics();
  }

  onFiscalYearChange(val: string | number | null): void {
    this.selectedFiscalYear.set(val ? String(val) : null);
    this.loadReportAnalytics();
  }

  goToProjectCreate(): void {
    this.router.navigate(['/projects/create']);
  }

  // Multi-Format Export Options
  exportCurrentReportToExcel(): void {
    const active = this.activeReportTab();
    const data = this.analyticsData();
    if (!data) return;

    let rows: any[] = [];
    let filename = `Report_${active}.csv`;

    switch (active) {
      case 'pnl-summary':
        rows = data.pnl_summary_table || [];
        filename = 'Report_01_Project_PnL_Statement.csv';
        break;
      case 'budget-vs-actual':
        rows = data.budget_vs_actual || [];
        filename = 'Report_02_Budget_vs_Actual_Expenses.csv';
        break;
      case 'revenue-vs-collections':
        rows = data.revenue_vs_collections || [];
        filename = 'Report_03_Revenue_Recognized_vs_Collections.csv';
        break;
      case 'direct-cost-breakdown':
        rows = data.direct_cost_breakdown || [];
        filename = 'Report_04_Direct_Cost_and_Overheads.csv';
        break;
      case 'committed-vs-forecast':
        rows = data.committed_vs_forecast || [];
        filename = 'Report_05_Committed_Cost_and_EAC.csv';
        break;
      case 'margin-metrics':
        rows = data.margin_metrics || [];
        filename = 'Report_06_Project_Margin_and_Return_Metrics.csv';
        break;
      case 'tower-unit-profitability':
        rows = data.tower_unit_profitability || [];
        filename = 'Report_07_Tower_and_Unit_Profitability.csv';
        break;
      case 'jv-sharing-summary':
        rows = data.jv_sharing_summary || [];
        filename = 'Report_08_JV_Landowner_Developer_Sharing.csv';
        break;
      case 'actual-vs-feasibility':
        rows = data.actual_vs_feasibility || [];
        filename = 'Report_09_Actual_vs_Feasibility_Estimates.csv';
        break;
    }

    if (rows.length === 0) {
      alert('No data available to export for the selected report tab.');
      return;
    }

    // Convert JSON rows to CSV
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        headers
          .map(fieldName => {
            const val = row[fieldName] !== null && row[fieldName] !== undefined ? row[fieldName] : '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      )
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printOrExportPDF(): void {
    window.print();
  }
}
