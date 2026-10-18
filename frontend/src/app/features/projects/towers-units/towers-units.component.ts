import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project, Tower } from '../../../core/models/project.model';
import { ProjectNavComponent } from '../project-nav/project-nav.component';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

export interface TowerBlockDetail {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  tower_code: string;
  tower_name: string;
  basement_floors: number;
  residential_floors: number;
  commercial_floors: number;
  total_units: number;
  total_lifts: number;
  fire_escape_stairs: number;
  structural_system: string;
  status: 'DESIGN' | 'FOUNDATION' | 'UNDER_CONSTRUCTION' | 'COMPLETED';
}

@Component({
  selector: 'app-project-towers-units',
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
      <app-project-nav activeCode="2.4"></app-project-nav>

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Configured Towers</p>
          <p class="text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">{{ towers().length }} <span class="text-xs font-normal">Blocks</span></p>
          <p class="text-[10px] text-slate-400">Across All Active Projects</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Total Residential Units</p>
          <p class="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">{{ totalUnits() }} <span class="text-xs font-normal">Apartments</span></p>
          <p class="text-[10px] text-slate-400">Configured in Stacking Plan</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Basement Parking Levels</p>
          <p class="text-xl font-bold font-display text-blue-600 dark:text-blue-400 mt-1">{{ totalBasements() }} <span class="text-xs font-normal">Levels</span></p>
          <p class="text-[10px] text-slate-400">Semi-Basement & Deep Raft</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">High-Speed Lifts</p>
          <p class="text-xl font-bold font-display text-purple-600 dark:text-purple-400 mt-1">{{ totalLifts() }} <span class="text-xs font-normal">Passenger & Fire Lifts</span></p>
          <p class="text-[10px] text-slate-400">BNBC 2020 Compliance</p>
        </div>
      </div>

      <!-- Main Container -->
      <app-card-container
        title="2.4 Building, Tower, Floor & Unit Setup"
        subtitle="Structural block hierarchy, floor configurations, vertical transit systems, and unit count specifications"
        badge="BIM & Spatial Structure"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Configure New Tower</span>
          </button>
        </div>

        <!-- Filter Toolbar -->
        <div class="mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div class="relative flex-1">
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Search by Tower Name, Code, Project..."
              class="w-full pl-3 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              <tr>
                <th class="px-4 py-3">Tower Block & Code</th>
                <th class="px-4 py-3">Linked Project</th>
                <th class="px-4 py-3">Floor Matrix (B + G + Res + Com)</th>
                <th class="px-4 py-3">Unit Capacity</th>
                <th class="px-4 py-3">Vertical Circulation</th>
                <th class="px-4 py-3">Construction Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (t of filteredTowers(); track t.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ t.tower_name }}</div>
                    <span class="font-mono text-[10px] text-emerald-600 font-semibold">{{ t.tower_code }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-800 dark:text-slate-200">{{ t.project_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ t.project_code }}</div>
                  </td>
                  <td class="px-4 py-3 font-medium">
                    <span class="text-blue-600 font-bold">{{ t.basement_floors }}B</span> + 
                    <span class="text-slate-800 dark:text-slate-200 font-bold">G</span> + 
                    <span class="text-emerald-600 font-bold">{{ t.residential_floors }} Floors</span>
                    @if (t.commercial_floors > 0) {
                      + <span class="text-purple-600 font-bold">{{ t.commercial_floors }} Com</span>
                    }
                  </td>
                  <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                    {{ t.total_units }} Units
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ t.total_lifts }} Lifts | {{ t.fire_escape_stairs }} Stairs</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ t.structural_system }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200': t.status === 'COMPLETED',
                        'bg-blue-50 text-blue-700 border-blue-200': t.status === 'UNDER_CONSTRUCTION',
                        'bg-amber-50 text-amber-700 border-amber-200': t.status === 'FOUNDATION' || t.status === 'DESIGN'
                      }"
                    >
                      {{ t.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="removeTower(t.id)" class="text-rose-600 hover:text-rose-800 font-semibold text-xs">Remove</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Tower Setup Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Setup Tower / Building Block</h2>
            <form [formGroup]="towerForm" (ngSubmit)="saveTower()" class="space-y-3">
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
                  <label class="block text-xs font-semibold mb-1">Tower Code <span class="text-rose-500">*</span></label>
                  <input type="text" formControlName="tower_code" placeholder="e.g. TOWER-A" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Tower Name <span class="text-rose-500">*</span></label>
                  <input type="text" formControlName="tower_name" placeholder="e.g. North Wing Prestige Tower" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Basements</label>
                  <input type="number" formControlName="basement_floors" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Residential Floors</label>
                  <input type="number" formControlName="residential_floors" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Commercial Floors</label>
                  <input type="number" formControlName="commercial_floors" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Total Unit Capacity</label>
                  <input type="number" formControlName="total_units" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Total Lifts</label>
                  <input type="number" formControlName="total_lifts" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-3">
                <button type="button" (click)="isModalOpen.set(false)" class="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-xs">Save Tower</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ProjectTowersUnitsComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  isModalOpen = signal<boolean>(false);
  searchQuery = signal<string>('');

  towers = signal<TowerBlockDetail[]>([
    {
      id: 1,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      tower_code: 'TOWER-A',
      tower_name: 'Tower Alpha (Luxury Residential)',
      basement_floors: 2,
      residential_floors: 14,
      commercial_floors: 0,
      total_units: 56,
      total_lifts: 3,
      fire_escape_stairs: 2,
      structural_system: 'RCC Shear Wall (BNBC 2020)',
      status: 'UNDER_CONSTRUCTION'
    },
    {
      id: 2,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      tower_code: 'TOWER-B',
      tower_name: 'Tower Beta (Commercial Suites)',
      basement_floors: 2,
      residential_floors: 10,
      commercial_floors: 4,
      total_units: 48,
      total_lifts: 3,
      fire_escape_stairs: 2,
      structural_system: 'Post-Tensioned Flat Plate',
      status: 'FOUNDATION'
    }
  ]);

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `[${p.project_code}] ${p.project_name}`,
      subLabel: `${p.thana_upazila}, ${p.district}`
    }));
  });

  totalUnits = computed(() => this.towers().reduce((acc, t) => acc + t.total_units, 0));
  totalBasements = computed(() => this.towers().reduce((acc, t) => acc + t.basement_floors, 0));
  totalLifts = computed(() => this.towers().reduce((acc, t) => acc + t.total_lifts, 0));

  filteredTowers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.towers();
    return this.towers().filter(t => 
      t.tower_name.toLowerCase().includes(q) ||
      t.tower_code.toLowerCase().includes(q) ||
      t.project_name.toLowerCase().includes(q)
    );
  });

  towerForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    tower_code: ['TOWER-C', Validators.required],
    tower_name: ['Tower Gamma', Validators.required],
    basement_floors: [2],
    residential_floors: [14],
    commercial_floors: [0],
    total_units: [56],
    total_lifts: [2]
  });

  ngOnInit(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p || []));
  }

  openAddModal(): void {
    this.towerForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      tower_code: `TOWER-${String.fromCharCode(65 + this.towers().length)}`,
      tower_name: `Tower ${String.fromCharCode(65 + this.towers().length)}`,
      basement_floors: 2,
      residential_floors: 14,
      commercial_floors: 0,
      total_units: 56,
      total_lifts: 2
    });
    this.isModalOpen.set(true);
  }

  saveTower(): void {
    if (this.towerForm.invalid) return;
    const v = this.towerForm.value;
    const proj = this.projects().find(p => p.id === Number(v.project_id));
    const newTower: TowerBlockDetail = {
      id: Date.now(),
      project_id: Number(v.project_id),
      project_name: proj?.project_name || 'Selected Project',
      project_code: proj?.project_code || 'PRJ-2026',
      tower_code: v.tower_code,
      tower_name: v.tower_name,
      basement_floors: Number(v.basement_floors),
      residential_floors: Number(v.residential_floors),
      commercial_floors: Number(v.commercial_floors),
      total_units: Number(v.total_units),
      total_lifts: Number(v.total_lifts),
      fire_escape_stairs: 2,
      structural_system: 'RCC Frame (BNBC 2020)',
      status: 'DESIGN'
    };

    this.towers.update(items => [newTower, ...items]);
    this.isModalOpen.set(false);
  }

  removeTower(id: number): void {
    this.towers.update(items => items.filter(t => t.id !== id));
  }
}
