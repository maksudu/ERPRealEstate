import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectIncomeExpenditureService } from '../../../../core/services/project-income-expenditure.service';
import { MultiProjectProfitabilityReportResponse, ProjectProfitabilityItem } from '../../../../core/models/project-income-expenditure.model';
import { ProjectIncomeExpenditureNavComponent } from '../project-income-expenditure-nav.component';
import {
  CardContainerComponent,
  CustomInputComponent,
  StatusBadgeComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-project-profitability-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProjectIncomeExpenditureNavComponent,
    CardContainerComponent,
    CustomInputComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="space-y-6">
      <app-project-income-expenditure-nav></app-project-income-expenditure-nav>

      <!-- Executive KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Portfolio Recognized Revenue -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recognized Revenue</span>
            <span class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-2">
            ৳{{ (report()?.total_recognized_revenue || 0) / 10000000 | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Cash Realized: ৳{{ (report()?.total_cash_collected || 0) / 10000000 | number:'1.2-2' }} Cr</p>
        </div>

        <!-- 2. Portfolio Actual Cost -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Posted Actual Cost</span>
            <span class="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-red-600 dark:text-red-400 mt-2">
            ৳{{ (report()?.total_actual_cost || 0) / 10000000 | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Approved Budget: ৳{{ (report()?.total_budget || 0) / 10000000 | number:'1.2-2' }} Cr</p>
        </div>

        <!-- 3. Reconciled PO Overlap (Zero Double-Count) -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PO Overlap Reconciled</span>
            <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mt-2">
            ৳{{ (report()?.total_reconciled_overlap || 0) / 10000000 | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Zero Double-Counting (Net Committed: ৳{{ (report()?.total_committed_cost || 0) / 10000000 | number:'1.2-2' }} Cr)
          </p>
        </div>

        <!-- 4. Budget Variance & Margin -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Forecast Margin</span>
            <span class="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-purple-600 dark:text-purple-400 mt-2">
            {{ report()?.overall_forecast_margin_pct || 0 | number:'1.1-1' }}%
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Across {{ report()?.total_projects_count || 0 }} Live Developer Projects</p>
        </div>
      </div>

      <!-- Critical Accounting Policy Banner (Section 11.4 Requirement) -->
      <div class="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div class="text-xs">
          <span class="font-bold text-foreground">Section 11.4 Reconciliation Safeguard:</span>
          <span class="text-muted-foreground ml-1">
            Do not add committed cost to actual cost without reconciling the overlap; otherwise the report will double-count purchase orders that have already been invoiced. The engine above has reconciled
            <strong class="text-foreground">৳{{ (report()?.total_reconciled_overlap || 0) | number:'1.2-2' }} BDT</strong> of invoiced purchase orders.
          </span>
        </div>
      </div>

      <!-- Multi-Project Profitability Table Card -->
      <app-card-container
        title="11.4 Project Profitability & Multi-Project Comparative Statement"
        subtitle="Designed for developers managing 20 or more projects: Budget vs Actual Cost vs Net Committed Orders vs Forecast Margin"
        badge="20+ Projects Portfolio"
      >
        <!-- Card Actions -->
        <div card-actions class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            (click)="seed22Projects()"
            [disabled]="seeding()"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            title="Seed/Refresh 22 Projects with realistic Section 11 dimensions"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
            <span>{{ seeding() ? 'Generating Portfolio...' : 'Seed 22 Projects Demo Portfolio' }}</span>
          </button>

          <button
            type="button"
            (click)="exportToCSV()"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            (click)="loadReport()"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <app-custom-input
              placeholder="Search across all 20+ project names or codes..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              iconPosition="left"
            >
              <svg icon class="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </app-custom-input>
          </div>

          <div class="flex items-center justify-end">
            <span class="text-xs text-muted-foreground">
              Displaying {{ filteredProjects().length }} projects | Generated at: {{ report()?.generated_at }}
            </span>
          </div>
        </div>

        <!-- Multi-Project Data Table -->
        <div class="overflow-x-auto border border-border rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th class="py-3 px-3">#</th>
                <th class="py-3 px-3">Project & Code</th>
                <th class="py-3 px-3 text-right" title="Approved Project Budget">Budget (BDT)</th>
                <th class="py-3 px-3 text-right" title="Posted Cost Transactions">Actual Cost</th>
                <th class="py-3 px-3 text-right" title="Net Committed Orders (Reconciled)">Net Committed</th>
                <th class="py-3 px-3 text-right" title="Actual + Estimated Remaining">Forecast Cost</th>
                <th class="py-3 px-3 text-right" title="Recognized Revenue under policy">Recognized Rev</th>
                <th class="py-3 px-3 text-right" title="Recognized Revenue minus Cost of Sales">Gross Profit</th>
                <th class="py-3 px-3 text-right" title="Actual Cost minus Budget">Budget Variance</th>
                <th class="py-3 px-2 text-center" title="Forecast Margin %">Forecast Margin</th>
                <th class="py-3 px-3" title="Cost Spent vs Budget Progress">Completion</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @if (loading()) {
                <tr>
                  <td colspan="11" class="py-8 text-center text-muted-foreground">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
                      <span>Computing portfolio profitability across projects...</span>
                    </div>
                  </td>
                </tr>
              } @else if (filteredProjects().length === 0) {
                <tr>
                  <td colspan="11" class="py-8 text-center text-muted-foreground">
                    <p class="font-medium">No projects found matching your query.</p>
                    <p class="text-[11px] mt-1">Click "Seed 22 Projects Demo Portfolio" above to populate live projects.</p>
                  </td>
                </tr>
              } @else {
                @for (p of filteredProjects(); track p.project_id; let idx = $index) {
                  <tr class="hover:bg-secondary/20 transition-colors">
                    <td class="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                      {{ idx + 1 }}
                    </td>

                    <td class="py-3 px-3">
                      <div class="font-bold text-foreground">{{ p.project_name }}</div>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="font-mono text-[10px] text-muted-foreground">{{ p.project_code }}</span>
                        <span class="text-[10px] text-muted-foreground">
                          ({{ p.income_count }} Incomes, {{ p.expenditure_count }} Costs)
                        </span>
                      </div>
                    </td>

                    <td class="py-3 px-3 text-right font-mono font-medium text-foreground">
                      ৳{{ p.budget | number:'1.2-2' }}
                    </td>

                    <td class="py-3 px-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                      ৳{{ p.actual_cost | number:'1.2-2' }}
                    </td>

                    <td class="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                      ৳{{ p.committed_cost | number:'1.2-2' }}
                    </td>

                    <td class="py-3 px-3 text-right font-mono text-purple-600 dark:text-purple-400 font-medium">
                      ৳{{ p.forecast_cost | number:'1.2-2' }}
                    </td>

                    <td class="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{{ p.recognized_revenue | number:'1.2-2' }}
                    </td>

                    <td class="py-3 px-3 text-right font-mono font-bold" [ngClass]="p.gross_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                      ৳{{ p.gross_profit | number:'1.2-2' }}
                    </td>

                    <td class="py-3 px-3 text-right font-mono font-medium" [ngClass]="p.budget_variance <= 0 ? 'text-emerald-600' : 'text-rose-600'">
                      ৳{{ p.budget_variance | number:'1.2-2' }}
                    </td>

                    <td class="py-3 px-2 text-center">
                      <span
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
                        [ngClass]="p.forecast_margin_pct >= 20 ? 'bg-emerald-500/10 text-emerald-600' : (p.forecast_margin_pct >= 0 ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600')"
                      >
                        {{ p.forecast_margin_pct | number:'1.1-1' }}%
                      </span>
                    </td>

                    <td class="py-3 px-3 min-w-[120px]">
                      <div class="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
                        <span>Spent</span>
                        <span>{{ p.cost_completion_pct | number:'1.0-0' }}%</span>
                      </div>
                      <div class="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-300"
                          [ngClass]="p.cost_completion_pct > 100 ? 'bg-rose-500' : (p.cost_completion_pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')"
                          [style.width.%]="Math.min(100, p.cost_completion_pct)"
                        ></div>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>

            <!-- Total Portfolio Summary Footer -->
            @if (report() && report()!.projects.length > 0) {
              <tfoot class="bg-secondary/70 font-bold border-t-2 border-border text-foreground">
                <tr>
                  <td colspan="2" class="py-3.5 px-3 uppercase text-[11px] tracking-wider">
                    Total Portfolio ({{ report()!.total_projects_count }} Projects)
                  </td>
                  <td class="py-3.5 px-3 text-right font-mono">
                    ৳{{ report()!.total_budget | number:'1.2-2' }}
                  </td>
                  <td class="py-3.5 px-3 text-right font-mono text-red-600 dark:text-red-400">
                    ৳{{ report()!.total_actual_cost | number:'1.2-2' }}
                  </td>
                  <td class="py-3.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                    ৳{{ report()!.total_committed_cost | number:'1.2-2' }}
                  </td>
                  <td class="py-3.5 px-3 text-right font-mono text-purple-600 dark:text-purple-400">
                    ৳{{ report()!.total_forecast_cost | number:'1.2-2' }}
                  </td>
                  <td class="py-3.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    ৳{{ report()!.total_recognized_revenue | number:'1.2-2' }}
                  </td>
                  <td class="py-3.5 px-3 text-right font-mono" [ngClass]="report()!.total_gross_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                    ৳{{ report()!.total_gross_profit | number:'1.2-2' }}
                  </td>
                  <td class="py-3.5 px-3 text-right font-mono" [ngClass]="report()!.total_budget_variance <= 0 ? 'text-emerald-600' : 'text-rose-600'">
                    ৳{{ report()!.total_budget_variance | number:'1.2-2' }}
                  </td>
                  <td class="py-3.5 px-2 text-center font-mono text-emerald-600">
                    {{ report()!.overall_forecast_margin_pct | number:'1.1-1' }}%
                  </td>
                  <td class="py-3.5 px-3">
                    <span class="text-[10px] text-muted-foreground font-normal">Reconciled Overlap: ৳{{ report()!.total_reconciled_overlap / 10000000 | number:'1.2-2' }} Cr</span>
                  </td>
                </tr>
              </tfoot>
            }
          </table>
        </div>
      </app-card-container>
    </div>
  `
})
export class ProjectProfitabilityReportComponent implements OnInit {
  private service = inject(ProjectIncomeExpenditureService);

  report = signal<MultiProjectProfitabilityReportResponse | null>(null);
  loading = signal<boolean>(false);
  seeding = signal<boolean>(false);
  searchQuery = '';
  Math = Math;

  filteredProjects = signal<ProjectProfitabilityItem[]>([]);

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading.set(true);
    this.service.getProfitabilityReport().subscribe({
      next: (res) => {
        this.report.set(res);
        this.filterProjects(res.projects);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSearchChange(): void {
    if (this.report()) {
      this.filterProjects(this.report()!.projects);
    }
  }

  filterProjects(projects: ProjectProfitabilityItem[]): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredProjects.set(projects);
      return;
    }
    this.filteredProjects.set(
      projects.filter(p =>
        p.project_name.toLowerCase().includes(q) ||
        p.project_code.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
      )
    );
  }

  seed22Projects(): void {
    this.seeding.set(true);
    this.service.seedDemoData(22).subscribe({
      next: () => {
        this.seeding.set(false);
        this.loadReport();
      },
      error: () => this.seeding.set(false)
    });
  }

  exportToCSV(): void {
    const rpt = this.report();
    if (!rpt || rpt.projects.length === 0) return;

    const headers = [
      'Project Code',
      'Project Name',
      'Status',
      'Approved Budget (BDT)',
      'Actual Cost (BDT)',
      'Net Committed (BDT)',
      'Reconciled PO Overlap (BDT)',
      'Forecast Cost (BDT)',
      'Recognized Revenue (BDT)',
      'Cash Collected (BDT)',
      'Gross Profit (BDT)',
      'Budget Variance (BDT)',
      'Forecast Margin %',
      'Cost Completion %'
    ];

    const rows = rpt.projects.map(p => [
      `"${p.project_code}"`,
      `"${p.project_name}"`,
      `"${p.status}"`,
      p.budget,
      p.actual_cost,
      p.committed_cost,
      p.invoiced_po_overlap,
      p.forecast_cost,
      p.recognized_revenue,
      p.cash_collected,
      p.gross_profit,
      p.budget_variance,
      p.forecast_margin_pct,
      p.cost_completion_pct
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Project_Profitability_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
