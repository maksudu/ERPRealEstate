import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectProfitability, ProjectProfitabilityPaginationResponse } from '../../../core/models/project.model';
import { ProjectNavComponent } from '../project-nav/project-nav.component';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-project-profitability-roi',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ProjectNavComponent,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-6">
      <app-project-nav activeCode="2.6"></app-project-nav>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Portfolio Projected Revenue</p>
          <p class="text-xl font-bold font-display text-foreground mt-1">
            ৳{{ (portfolioRevenue() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[10px] text-muted-foreground">Saleable inventory total</p>
        </div>

        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Portfolio Net Profit</p>
          <p class="text-xl font-bold font-display text-emerald-500 mt-1">
            ৳{{ (portfolioNetProfit() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[10px] text-muted-foreground">Recognized - Recognized Expenses</p>
        </div>

        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Average Developer ROI</p>
          <p class="text-xl font-bold font-display text-purple-500 mt-1">
            {{ averageRoi() | number:'1.2-2' }}%
          </p>
          <p class="text-[10px] text-muted-foreground">(Profit / Investment Base) × 100</p>
        </div>

        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Forecast Records</p>
          <p class="text-xl font-bold font-display text-blue-500 mt-1">
            {{ totalRecords() }} Models
          </p>
          <p class="text-[10px] text-muted-foreground">Active & baseline scenarios</p>
        </div>
      </div>

      <!-- Main Container with Filters & Table -->
      <app-card-container
        title="2.6 Estimated Profitability & ROI Performance Matrix"
        subtitle="Evaluates projected returns during feasibility and updates forecasts as construction costs and sales performance change"
        badge="Enterprise ROI Engine"
      >
        <!-- Top Action Bar -->
        <div card-actions class="flex items-center gap-2">
          <a
            routerLink="/projects/profitability-roi/create"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ New ROI Forecast</span>
          </a>
        </div>

        <!-- Filter Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <app-searchable-select
            label="Filter by Project"
            [options]="projectFilterOptions()"
            [searchable]="true"
            [(ngModel)]="selectedProjectId"
            (ngModelChange)="onFilterChange()"
          ></app-searchable-select>

          <app-custom-input
            label="Search Code / Version"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onFilterChange()"
            placeholder="Type code, version or remarks..."
          ></app-custom-input>

          <app-searchable-select
            label="Filter by Status"
            [options]="statusFilterOptions"
            [(ngModel)]="selectedStatus"
            (ngModelChange)="onFilterChange()"
          ></app-searchable-select>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-border bg-card">
          <table class="w-full text-left text-xs divide-y divide-border">
            <thead class="bg-secondary/60 text-muted-foreground font-semibold uppercase text-[11px]">
              <tr>
                <th class="px-4 py-3">Forecast Code & Version</th>
                <th class="px-4 py-3">Project</th>
                <th class="px-4 py-3 text-right">Gross Revenue (BDT)</th>
                <th class="px-4 py-3 text-right">Total Cost (BDT)</th>
                <th class="px-4 py-3 text-right">Net Profit & Margin</th>
                <th class="px-4 py-3 text-center">JV Split</th>
                <th class="px-4 py-3 text-right">Developer ROI</th>
                <th class="px-4 py-3 text-right">Actual Profit</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @if (loading()) {
                <tr>
                  <td colspan="10" class="py-12 text-center text-muted-foreground">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading profitability forecasts from backend...</span>
                    </div>
                  </td>
                </tr>
              } @else if (forecasts().length === 0) {
                <tr>
                  <td colspan="10" class="py-12 text-center text-muted-foreground">
                    No profitability forecasts found matching current criteria.
                  </td>
                </tr>
              } @else {
                @for (f of forecasts(); track f.id) {
                  <tr class="hover:bg-secondary/40 transition-colors">
                    <td class="px-4 py-3.5">
                      <div class="font-bold font-mono text-foreground">{{ f.forecast_code }}</div>
                      <div class="text-[11px] text-muted-foreground">{{ f.version_label }}</div>
                    </td>
                    <td class="px-4 py-3.5">
                      <div class="font-medium text-foreground">{{ f.project_name || 'Project #' + f.project_id }}</div>
                      <div class="text-[10px] font-mono text-muted-foreground">{{ f.project_code }}</div>
                    </td>
                    <td class="px-4 py-3.5 text-right font-mono font-bold text-foreground">
                      ৳{{ (f.total_estimated_revenue / 10000000) | number:'1.2-2' }} Cr
                      <div class="text-[10px] text-muted-foreground font-normal">Apt: ৳{{ (f.apartment_revenue_est / 10000000) | number:'1.2-2' }}Cr</div>
                    </td>
                    <td class="px-4 py-3.5 text-right font-mono font-bold text-amber-500">
                      ৳{{ (f.total_project_cost_est / 10000000) | number:'1.2-2' }} Cr
                    </td>
                    <td class="px-4 py-3.5 text-right">
                      <div class="font-bold font-mono text-emerald-500">
                        ৳{{ (f.estimated_project_profit / 10000000) | number:'1.2-2' }} Cr
                      </div>
                      <div class="text-[10px] text-muted-foreground">{{ f.gross_profit_margin_pct | number:'1.1-1' }}% Margin</div>
                    </td>
                    <td class="px-4 py-3.5 text-center font-mono">
                      <span class="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary border border-border">
                        {{ f.jv_sharing_ratio }}
                      </span>
                      <div class="text-[10px] text-muted-foreground">{{ f.developer_share_pct }}% Dev</div>
                    </td>
                    <td class="px-4 py-3.5 text-right font-mono font-bold text-purple-500">
                      {{ f.roi_pct | number:'1.2-2' }}%
                    </td>
                    <td class="px-4 py-3.5 text-right font-mono">
                      <div class="text-foreground font-semibold">
                        ৳{{ (f.actual_project_profit / 10000000) | number:'1.2-2' }} Cr
                      </div>
                      <div class="text-[10px] text-muted-foreground">ROI: {{ f.actual_roi_pct | number:'1.1-1' }}%</div>
                    </td>
                    <td class="px-4 py-3.5 text-center">
                      <span
                        class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                        [ngClass]="{
                          'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': f.status === 'ACTIVE_FORECAST',
                          'bg-amber-500/10 text-amber-500 border-amber-500/20': f.status === 'DRAFT',
                          'bg-secondary text-muted-foreground border-border': f.status === 'ARCHIVED'
                        }"
                      >
                        {{ f.status }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <a
                          [routerLink]="['/projects/profitability-roi/edit', f.id]"
                          class="px-2 py-1 rounded-md text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
                        >
                          Edit
                        </a>
                        <button
                          (click)="deleteForecast(f)"
                          class="px-2 py-1 rounded-md text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          Delete
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
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing {{ currentOffset() + 1 }} to {{ Math.min(currentOffset() + currentLimit(), totalRecords()) }} of {{ totalRecords() }} forecasts
          </div>
          <div class="flex items-center gap-2">
            <button
              [disabled]="currentOffset() === 0 || loading()"
              (click)="prevPage()"
              class="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-50 hover:bg-secondary transition-colors"
            >
              Previous
            </button>
            <button
              [disabled]="currentOffset() + currentLimit() >= totalRecords() || loading()"
              (click)="nextPage()"
              class="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-50 hover:bg-secondary transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </app-card-container>
    </div>
  `
})
export class ProjectProfitabilityRoiComponent implements OnInit {
  protected Math = Math;
  private projectService = inject(ProjectService);
  private router = inject(Router);

  forecasts = signal<ProjectProfitability[]>([]);
  projects = signal<Project[]>([]);
  loading = signal<boolean>(false);

  // Pagination & Aggregation signals
  totalRecords = signal<number>(0);
  currentLimit = signal<number>(10);
  currentOffset = signal<number>(0);
  portfolioRevenue = signal<number>(0);
  portfolioNetProfit = signal<number>(0);
  averageRoi = signal<number>(0);

  // Filters
  selectedProjectId = signal<number | null>(null);
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('');

  statusFilterOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE_FORECAST', label: 'Active Forecast' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ARCHIVED', label: 'Archived' }
  ];

  projectFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All Projects' },
    ...this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }))
  ]);

  ngOnInit(): void {
    this.loadProjects();
    this.loadForecasts();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data)
    });
  }

  loadForecasts(): void {
    this.loading.set(true);
    const pId = this.selectedProjectId() ? Number(this.selectedProjectId()) : undefined;
    const st = this.selectedStatus() ? this.selectedStatus() : undefined;
    const sq = this.searchQuery() ? this.searchQuery().trim() : undefined;

    this.projectService.getProfitabilityList({
      project_id: pId,
      status: st,
      search: sq,
      limit: this.currentLimit(),
      offset: this.currentOffset()
    }).subscribe({
      next: (res: ProjectProfitabilityPaginationResponse) => {
        this.forecasts.set(res.items);
        this.totalRecords.set(res.total);
        this.portfolioRevenue.set(res.portfolio_projected_revenue_bdt);
        this.portfolioNetProfit.set(res.portfolio_net_profit_bdt);
        this.averageRoi.set(res.average_roi_pct);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onFilterChange(): void {
    this.currentOffset.set(0);
    this.loadForecasts();
  }

  prevPage(): void {
    if (this.currentOffset() > 0) {
      this.currentOffset.update(v => Math.max(0, v - this.currentLimit()));
      this.loadForecasts();
    }
  }

  nextPage(): void {
    if (this.currentOffset() + this.currentLimit() < this.totalRecords()) {
      this.currentOffset.update(v => v + this.currentLimit());
      this.loadForecasts();
    }
  }

  deleteForecast(f: ProjectProfitability): void {
    if (confirm(`Are you sure you want to delete ROI forecast ${f.forecast_code}?`)) {
      this.projectService.deleteProfitability(f.id).subscribe({
        next: () => this.loadForecasts(),
        error: (err) => alert(err.error?.detail || 'Failed to delete forecast.')
      });
    }
  }
}
