import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import { ProjectNavComponent } from '../project-nav/project-nav.component';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

export interface DailyProgressReport {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  report_date: string;
  site_engineer: string;
  weather_condition: string;
  manpower_count: number;
  key_activities: string;
  concrete_poured_cft: number;
  steel_tied_ton: number;
  qa_cube_samples_taken: number;
  safety_incidents: number;
  overall_site_progress_pct: number;
}

@Component({
  selector: 'app-project-construction-monitoring',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProjectNavComponent,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-5">
      <app-project-nav activeCode="2.10"></app-project-nav>

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Today's Active Sites</p>
          <p class="text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">{{ dprs().length }} Active Projects</p>
          <p class="text-[10px] text-slate-400">Daily DPR Submitted</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Manpower on Site Today</p>
          <p class="text-xl font-bold font-display text-blue-600 dark:text-blue-400 mt-1">{{ totalManpower() }} Craftsmen</p>
          <p class="text-[10px] text-slate-400">Masons, Rod Binders & Labor</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Cumulative Concrete Poured</p>
          <p class="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">{{ totalConcrete() | number:'1.0-0' }} CFT</p>
          <p class="text-[10px] text-slate-400">Quality Tested Cube Crushes</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Safety Compliance Index</p>
          <p class="text-xl font-bold font-display text-purple-600 dark:text-purple-400 mt-1">99.8%</p>
          <p class="text-[10px] text-emerald-500 font-semibold">Zero Lost-Time Incidents</p>
        </div>
      </div>

      <!-- Main Container -->
      <app-card-container
        title="2.10 Construction Progress Monitoring (DPR Engine)"
        subtitle="Daily Progress Reports, site manpower roll, casting volume, and structural quality tracking"
        badge="Site Operations"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Log Daily Progress (DPR)</span>
          </button>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              <tr>
                <th class="px-4 py-3">Report Date & Engineer</th>
                <th class="px-4 py-3">Project Link</th>
                <th class="px-4 py-3">Key Site Activities</th>
                <th class="px-4 py-3">Manpower</th>
                <th class="px-4 py-3">Concrete & Steel</th>
                <th class="px-4 py-3">Cumulative Progress</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (d of dprs(); track d.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    <div class="font-mono text-emerald-600 font-bold">{{ d.report_date }}</div>
                    <div class="text-[11px] text-slate-500">{{ d.site_engineer }}</div>
                    <div class="text-[10px] text-slate-400">Weather: {{ d.weather_condition }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-800 dark:text-slate-200">{{ d.project_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ d.project_code }}</div>
                  </td>
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs">
                    {{ d.key_activities }}
                  </td>
                  <td class="px-4 py-3 font-bold font-mono">
                    {{ d.manpower_count }} Men
                  </td>
                  <td class="px-4 py-3 font-mono">
                    <div>Concrete: <span class="font-bold text-blue-600">{{ d.concrete_poured_cft | number:'1.0-0' }} CFT</span></div>
                    <div>Steel: <span class="font-bold text-slate-800 dark:text-slate-200">{{ d.steel_tied_ton }} TON</span></div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden mb-1">
                      <div class="bg-emerald-500 h-full rounded-full" [style.width.%]="d.overall_site_progress_pct"></div>
                    </div>
                    <span class="text-[10px] font-bold text-emerald-600">{{ d.overall_site_progress_pct }}% Complete</span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="removeDpr(d.id)" class="text-rose-600 hover:text-rose-800 font-semibold text-xs">Remove</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Add DPR Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Log Site Daily Progress Report (DPR)</h2>
            <form [formGroup]="dprForm" (ngSubmit)="saveDpr()" class="space-y-3">
              <div>
                <app-searchable-select
                  label="Select Project"
                  [required]="true"
                  [options]="projectOptions()"
                  formControlName="project_id"
                  placeholder="Select project..."
                  [allowCreateNew]="false"
                ></app-searchable-select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Report Date</label>
                  <input type="date" formControlName="report_date" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Site Engineer Name</label>
                  <input type="text" formControlName="site_engineer" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1">Key Civil Activities Executed Today</label>
                <textarea formControlName="key_activities" rows="2" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"></textarea>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Total Manpower</label>
                  <input type="number" formControlName="manpower_count" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Concrete (CFT)</label>
                  <input type="number" formControlName="concrete_poured_cft" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Site Progress %</label>
                  <input type="number" formControlName="overall_site_progress_pct" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-3">
                <button type="button" (click)="isModalOpen.set(false)" class="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-xs">Submit DPR</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ProjectConstructionMonitoringComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  isModalOpen = signal<boolean>(false);

  dprs = signal<DailyProgressReport[]>([
    {
      id: 1,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      report_date: '2026-03-24',
      site_engineer: 'Engr. Nazmul Hassan',
      weather_condition: 'Sunny (32°C)',
      manpower_count: 65,
      key_activities: 'Level 2 basement retaining wall shuttering and 500W rebar binding. Poured 1,450 CFT C30 concrete.',
      concrete_poured_cft: 1450,
      steel_tied_ton: 12.5,
      qa_cube_samples_taken: 6,
      safety_incidents: 0,
      overall_site_progress_pct: 38
    },
    {
      id: 2,
      project_id: 2,
      project_name: 'Apex Horizon Bay Complex',
      project_code: 'PRJ-2026-002',
      report_date: '2026-03-24',
      site_engineer: 'Engr. Tariqul Islam',
      weather_condition: 'Partly Cloudy (30°C)',
      manpower_count: 48,
      key_activities: 'Cast-in-situ bored pile boring completed for 4 piles at Grid C-D. Slurry de-sanding done.',
      concrete_poured_cft: 850,
      steel_tied_ton: 8.0,
      qa_cube_samples_taken: 3,
      safety_incidents: 0,
      overall_site_progress_pct: 18
    }
  ]);

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `[${p.project_code}] ${p.project_name}`,
      subLabel: `${p.thana_upazila}, ${p.district}`
    }));
  });

  totalManpower = computed(() => this.dprs().reduce((acc, d) => acc + d.manpower_count, 0));
  totalConcrete = computed(() => this.dprs().reduce((acc, d) => acc + d.concrete_poured_cft, 0));

  dprForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    report_date: [new Date().toISOString().split('T')[0], Validators.required],
    site_engineer: ['Engr. Nazmul Hassan', Validators.required],
    weather_condition: ['Sunny'],
    key_activities: ['', Validators.required],
    manpower_count: [50, Validators.required],
    concrete_poured_cft: [1000],
    overall_site_progress_pct: [40]
  });

  ngOnInit(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p || []));
  }

  openAddModal(): void {
    this.dprForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      report_date: new Date().toISOString().split('T')[0],
      site_engineer: 'Engr. Nazmul Hassan',
      weather_condition: 'Sunny (32°C)',
      key_activities: '',
      manpower_count: 55,
      concrete_poured_cft: 1200,
      overall_site_progress_pct: 40
    });
    this.isModalOpen.set(true);
  }

  saveDpr(): void {
    if (this.dprForm.invalid) return;
    const v = this.dprForm.value;
    const proj = this.projects().find(p => p.id === Number(v.project_id));
    const newDpr: DailyProgressReport = {
      id: Date.now(),
      project_id: Number(v.project_id),
      project_name: proj?.project_name || 'Selected Project',
      project_code: proj?.project_code || 'PRJ-2026',
      report_date: v.report_date,
      site_engineer: v.site_engineer,
      weather_condition: v.weather_condition,
      manpower_count: Number(v.manpower_count),
      key_activities: v.key_activities,
      concrete_poured_cft: Number(v.concrete_poured_cft),
      steel_tied_ton: 10.0,
      qa_cube_samples_taken: 4,
      safety_incidents: 0,
      overall_site_progress_pct: Number(v.overall_site_progress_pct)
    };

    this.dprs.update(list => [newDpr, ...list]);
    this.isModalOpen.set(false);
  }

  removeDpr(id: number): void {
    this.dprs.update(list => list.filter(d => d.id !== id));
  }
}
