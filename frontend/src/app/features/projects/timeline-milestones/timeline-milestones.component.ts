import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectMilestone, ProjectMilestonePaginationResponse } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-project-timeline-milestones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-6">

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tracked Milestones</p>
          <p class="text-xl font-bold font-display text-foreground mt-1">{{ totalRecords() }} Stages</p>
          <p class="text-[10px] text-muted-foreground">From Feasibility to Handover</p>
        </div>

        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completed Stages</p>
          <p class="text-xl font-bold font-display text-emerald-500 mt-1">{{ completedCount() }} Signed-off</p>
          <p class="text-[10px] text-muted-foreground">Quality QA verified</p>
        </div>

        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Critical Path Stages</p>
          <p class="text-xl font-bold font-display text-rose-500 mt-1">{{ criticalPathCount() }} Stages</p>
          <p class="text-[10px] text-muted-foreground">Zero-float schedule items</p>
        </div>

        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Physical vs Financial</p>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-foreground">Rule 2.7</span>
          </div>
          <div class="mt-2 space-y-1.5">
            <div>
              <div class="flex justify-between text-[11px] font-medium text-foreground">
                <span>Physical Progress:</span>
                <span class="font-bold text-emerald-500 font-mono">{{ overallPhysicalProgress() }}%</span>
              </div>
              <div class="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-0.5">
                <div class="bg-emerald-500 h-full rounded-full transition-all" [style.width.%]="overallPhysicalProgress()"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-[11px] font-medium text-muted-foreground">
                <span>Financial Spent:</span>
                <span class="font-bold text-blue-500 font-mono">{{ overallFinancialProgress() }}%</span>
              </div>
              <div class="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-0.5">
                <div class="bg-blue-500 h-full rounded-full transition-all" [style.width.%]="overallFinancialProgress()"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Table & Gantt View Card -->
      <app-card-container
        title="Project Timeline & Milestone Tracking">
        <!-- Top Action Bar -->
        <div card-actions class="flex flex-wrap items-center gap-2">
          <!-- View Toggle Button -->
          <div class="inline-flex rounded-lg border border-border bg-secondary p-0.5 text-xs">
            <button
              (click)="activeView.set('table')"
              class="px-2.5 py-1 rounded-md font-medium transition-colors"
              [ngClass]="activeView() === 'table' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'"
            >
              Table View
            </button>
            <button
              (click)="activeView.set('gantt')"
              class="px-2.5 py-1 rounded-md font-medium transition-colors"
              [ngClass]="activeView() === 'gantt' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'"
            >
              Timeline / Gantt View
            </button>
          </div>

          <button
            (click)="generateStandardMilestones()"
            [disabled]="generating()"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-card hover:bg-secondary text-foreground transition-colors shadow-xs"
            title="Auto-generate the 15 standard industry milestones"
          >
            <svg class="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>{{ generating() ? 'Generating...' : 'Auto-Fill 15 Standards' }}</span>
          </button>

          <a
            routerLink="/projects/timeline-milestones/create"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Add Milestone</span>
          </a>
        </div>

        <!-- Filter Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <app-searchable-select
            label="Filter by Project"
            [options]="projectFilterOptions()"
            [searchable]="true"
            [(ngModel)]="selectedProjectId"
            (ngModelChange)="onFilterChange()"
          ></app-searchable-select>

          <app-custom-input
            label="Search Milestone / Personnel"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onFilterChange()"
            placeholder="Type milestone, code, contractor..."
          ></app-custom-input>

          <app-searchable-select
            label="Filter by Status"
            [options]="statusFilterOptions"
            [(ngModel)]="selectedStatus"
            (ngModelChange)="onFilterChange()"
          ></app-searchable-select>

          <app-searchable-select
            label="Critical Path Filter"
            [options]="criticalPathFilterOptions"
            [(ngModel)]="selectedCriticalPath"
            (ngModelChange)="onFilterChange()"
          ></app-searchable-select>
        </div>

        <!-- View 1: Data Table View -->
        @if (activeView() === 'table') {
          <div class="overflow-x-auto rounded-xl border border-border bg-card">
            <table class="w-full text-left text-xs divide-y divide-border">
              <thead class="bg-secondary/60 text-muted-foreground font-semibold uppercase text-[11px]">
                <tr>
                  <th class="px-4 py-3 w-12 text-center">#</th>
                  <th class="px-4 py-3">Milestone Scope & Code</th>
                  <th class="px-4 py-3">Project Link</th>
                  <th class="px-4 py-3">Schedule (Planned vs Actual)</th>
                  <th class="px-4 py-3 text-right">Weight</th>
                  <th class="px-4 py-3">Physical vs Financial</th>
                  <th class="px-4 py-3">Assigned Team / Contractor</th>
                  <th class="px-4 py-3 text-center">Status</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @if (loading()) {
                  <tr>
                    <td colspan="9" class="py-12 text-center text-muted-foreground">
                      <div class="flex items-center justify-center gap-2">
                        <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading milestones schedule from backend...</span>
                      </div>
                    </td>
                  </tr>
                } @else if (milestones().length === 0) {
                  <tr>
                    <td colspan="9" class="py-12 text-center text-muted-foreground">
                      No milestones found. Click "Auto-Fill 15 Standards" or "+ Add Milestone" to start scheduling.
                    </td>
                  </tr>
                } @else {
                  @for (m of milestones(); track m.id) {
                    <tr class="hover:bg-secondary/40 transition-colors">
                      <td class="px-4 py-3.5 text-center font-mono font-bold text-muted-foreground">
                        {{ m.milestone_number }}
                      </td>
                      <td class="px-4 py-3.5">
                        <div class="font-bold text-foreground flex items-center gap-1.5">
                          @if (m.is_critical_path) {
                            <span class="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Critical Path Stage (Zero Float)"></span>
                          }
                          <span>{{ m.milestone_name }}</span>
                        </div>
                        <div class="text-[10px] font-mono text-muted-foreground">{{ m.milestone_code }} • {{ m.category }}</div>
                      </td>
                      <td class="px-4 py-3.5">
                        <div class="font-medium text-foreground">{{ m.project_name || 'Project #' + m.project_id }}</div>
                        <div class="text-[10px] font-mono text-muted-foreground">{{ m.project_code }}</div>
                      </td>
                      <td class="px-4 py-3.5 font-mono text-[11px]">
                        <div>{{ m.planned_start_date }} to {{ m.planned_finish_date }}</div>
                        @if (m.actual_finish_date) {
                          <div class="text-emerald-500 font-semibold text-[10px]">Actual Finish: {{ m.actual_finish_date }}</div>
                        } @else if (m.delay_days > 0) {
                          <div class="text-rose-500 text-[10px]">Delay: +{{ m.delay_days }} Days</div>
                        }
                      </td>
                      <td class="px-4 py-3.5 text-right font-mono font-bold text-foreground">
                        {{ m.weightage_percent }}%
                      </td>
                      <td class="px-4 py-3.5">
                        <div class="space-y-1 w-36">
                          <div>
                            <div class="flex justify-between text-[10px]">
                              <span class="text-muted-foreground">Physical:</span>
                              <span class="font-bold text-emerald-500">{{ m.physical_progress_pct }}%</span>
                            </div>
                            <div class="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                              <div class="bg-emerald-500 h-full rounded-full" [style.width.%]="m.physical_progress_pct"></div>
                            </div>
                          </div>
                          <div>
                            <div class="flex justify-between text-[10px]">
                              <span class="text-muted-foreground">Budget:</span>
                              <span class="font-bold text-blue-500">{{ m.financial_progress_pct }}%</span>
                            </div>
                            <div class="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                              <div class="bg-blue-500 h-full rounded-full" [style.width.%]="m.financial_progress_pct"></div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3.5 text-foreground">
                        <div class="font-medium text-[11px]">{{ m.responsible_person || m.assigned_department }}</div>
                        <div class="text-[10px] text-muted-foreground truncate max-w-xs">{{ m.contractor_name || 'In-House Civil Team' }}</div>
                      </td>
                      <td class="px-4 py-3.5 text-center">
                        <span
                          class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase"
                          [ngClass]="{
                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': m.status === 'COMPLETED',
                            'bg-blue-500/10 text-blue-500 border-blue-500/20': m.status === 'IN_PROGRESS',
                            'bg-amber-500/10 text-amber-500 border-amber-500/20': m.status === 'PENDING',
                            'bg-rose-500/10 text-rose-500 border-rose-500/20': m.status === 'DELAYED'
                          }"
                        >
                          {{ m.status }}
                        </span>
                      </td>
                      <td class="px-4 py-3.5 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <a
                            [routerLink]="['/projects/timeline-milestones/edit', m.id]"
                            class="px-2 py-1 rounded-md text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
                          >
                            Edit
                          </a>
                          <button
                            (click)="deleteMilestone(m)"
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
        }

        <!-- View 2: Visual Timeline / Gantt Progress Bars -->
        @if (activeView() === 'gantt') {
          <div class="p-4 rounded-xl border border-border bg-card space-y-4">
            <div class="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-3">
              <span class="font-semibold uppercase tracking-wider">Project Timeline Visualization (Gantt Representation)</span>
              <div class="flex items-center gap-4">
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> In Progress</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Critical Path</span>
              </div>
            </div>

            <div class="space-y-3">
              @for (m of milestones(); track m.id) {
                <div class="p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2">
                      <span class="w-6 h-6 rounded-md bg-secondary text-foreground text-xs font-mono font-bold flex items-center justify-center border border-border">
                        {{ m.milestone_number }}
                      </span>
                      <span class="font-bold text-sm text-foreground">{{ m.milestone_name }}</span>
                      @if (m.is_critical_path) {
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">Critical Path</span>
                      }
                    </div>

                    <div class="flex items-center gap-3 text-xs font-mono">
                      <span class="text-muted-foreground">{{ m.planned_start_date }} → {{ m.planned_finish_date }}</span>
                      <span class="font-bold text-emerald-500">{{ m.physical_progress_pct }}% Done</span>
                    </div>
                  </div>

                  <!-- Visual Progress Gantt Bar -->
                  <div class="w-full bg-secondary h-3 rounded-full overflow-hidden p-0.5 border border-border">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      [ngClass]="{
                        'bg-emerald-500': m.status === 'COMPLETED',
                        'bg-blue-500': m.status === 'IN_PROGRESS',
                        'bg-amber-500': m.status === 'PENDING',
                        'bg-rose-500': m.status === 'DELAYED'
                      }"
                      [style.width.%]="m.physical_progress_pct || 2"
                    ></div>
                  </div>

                  <div class="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Assigned: {{ m.responsible_person || m.assigned_department }}</span>
                    <span>Budget Spent: {{ m.financial_progress_pct }}%</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Pagination Controls -->
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing {{ currentOffset() + 1 }} to {{ Math.min(currentOffset() + currentLimit(), totalRecords()) }} of {{ totalRecords() }} milestones
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
export class ProjectTimelineMilestonesComponent implements OnInit {
  protected Math = Math;
  private projectService = inject(ProjectService);
  private router = inject(Router);

  milestones = signal<ProjectMilestone[]>([]);
  projects = signal<Project[]>([]);
  loading = signal<boolean>(false);
  generating = signal<boolean>(false);
  activeView = signal<'table' | 'gantt'>('table');

  // Aggregation & Pagination Signals
  totalRecords = signal<number>(0);
  currentLimit = signal<number>(15);
  currentOffset = signal<number>(0);
  completedCount = signal<number>(0);
  criticalPathCount = signal<number>(0);
  overallPhysicalProgress = signal<number>(0);
  overallFinancialProgress = signal<number>(0);

  // Filters
  selectedProjectId = signal<number | null>(null);
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('');
  selectedCriticalPath = signal<string>('');

  statusFilterOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'DELAYED', label: 'Delayed' }
  ];

  criticalPathFilterOptions: SelectOption[] = [
    { value: '', label: 'All Milestones' },
    { value: 'true', label: 'Critical Path Only' }
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
    this.loadMilestones();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data)
    });
  }

  loadMilestones(): void {
    this.loading.set(true);
    const pId = this.selectedProjectId() ? Number(this.selectedProjectId()) : undefined;
    const st = this.selectedStatus() ? this.selectedStatus() : undefined;
    const sq = this.searchQuery() ? this.searchQuery().trim() : undefined;
    const cp = this.selectedCriticalPath() === 'true' ? true : undefined;

    this.projectService.getMilestones({
      project_id: pId,
      status: st,
      search: sq,
      critical_path_only: cp,
      limit: this.currentLimit(),
      offset: this.currentOffset()
    }).subscribe({
      next: (res: ProjectMilestonePaginationResponse) => {
        this.milestones.set(res.items);
        this.totalRecords.set(res.total);
        this.completedCount.set(res.completed_count);
        this.criticalPathCount.set(res.critical_path_count);
        this.overallPhysicalProgress.set(res.overall_physical_progress_pct);
        this.overallFinancialProgress.set(res.overall_financial_progress_pct);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onFilterChange(): void {
    this.currentOffset.set(0);
    this.loadMilestones();
  }

  prevPage(): void {
    if (this.currentOffset() > 0) {
      this.currentOffset.update(v => Math.max(0, v - this.currentLimit()));
      this.loadMilestones();
    }
  }

  nextPage(): void {
    if (this.currentOffset() + this.currentLimit() < this.totalRecords()) {
      this.currentOffset.update(v => v + this.currentLimit());
      this.loadMilestones();
    }
  }

  generateStandardMilestones(): void {
    const pId = this.selectedProjectId() || (this.projects().length > 0 ? this.projects()[0].id : null);
    if (!pId) {
      alert('Please select a project first.');
      return;
    }

    this.generating.set(true);
    this.projectService.generateStandard15Milestones(Number(pId)).subscribe({
      next: (res) => {
        this.generating.set(false);
        alert(res.message || 'Milestones generated successfully.');
        this.loadMilestones();
      },
      error: (err) => {
        this.generating.set(false);
        alert(err.error?.detail || 'Failed to auto-generate milestones.');
      }
    });
  }

  deleteMilestone(m: ProjectMilestone): void {
    if (confirm(`Are you sure you want to delete milestone: ${m.milestone_name}?`)) {
      this.projectService.deleteMilestone(m.id).subscribe({
        next: () => this.loadMilestones(),
        error: (err) => alert(err.error?.detail || 'Failed to delete milestone.')
      });
    }
  }
}
