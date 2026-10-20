import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectMetaOptions } from '../../../core/models/project.model';
import { ProjectNavComponent } from '../project-nav/project-nav.component';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

export interface LandAllocationRecord {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  land_bank_id: number;
  parcel_number: string;
  mouza_name: string;
  khatian_no: string;
  dag_no: string;
  allocated_area_katha: number;
  allocated_area_sqft: number;
  allocation_ratio_pct: number;
  landowner_jv_split: string;
  mutation_status: 'MUTATED' | 'IN_PROCESS' | 'PENDING';
  possession_date: string;
  remarks: string;
}

@Component({
  selector: 'app-project-land-allocation',
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
      <app-project-nav activeCode="2.3"></app-project-nav>

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Total Allocated Katha</p>
          <p class="text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">{{ totalAllocatedKatha() | number:'1.1-2' }} <span class="text-xs font-normal">Katha</span></p>
          <p class="text-[10px] text-slate-400">Demarcated to active projects</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Allocated Parcels</p>
          <p class="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">{{ allocations().length }}</p>
          <p class="text-[10px] text-slate-400">Linked to Land Bank Master</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Mutated Land Area</p>
          <p class="text-xl font-bold font-display text-blue-600 dark:text-blue-400 mt-1">{{ mutatedKatha() | number:'1.1-2' }} <span class="text-xs font-normal">Katha</span></p>
          <p class="text-[10px] text-slate-400">Mutation Completed in AC Land</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Avg. JV Allocation</p>
          <p class="text-xl font-bold font-display text-purple-600 dark:text-purple-400 mt-1">50:50</p>
          <p class="text-[10px] text-slate-400">Landowner vs Developer</p>
        </div>
      </div>

      <!-- Main Container -->
      <app-card-container
        title="Project-wise Land Allocation Register"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Allocate Land Parcel</span>
          </button>
        </div>

        <!-- Toolbar -->
        <div class="mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div class="relative flex-1">
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Search by Project, Mouza, Khatian or Dag No..."
              class="w-full pl-3 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              <tr>
                <th class="px-4 py-3">Project & Code</th>
                <th class="px-4 py-3">Land Parcel & Mouza</th>
                <th class="px-4 py-3">Khatian / Dag</th>
                <th class="px-4 py-3">Allocated Area</th>
                <th class="px-4 py-3">JV Split</th>
                <th class="px-4 py-3">Mutation</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (a of filteredAllocations(); track a.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    {{ a.project_name }}
                    <div class="text-[10px] text-emerald-600 font-mono">{{ a.project_code }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-800 dark:text-slate-200">{{ a.parcel_number }}</div>
                    <div class="text-[10px] text-slate-400">Mouza: {{ a.mouza_name }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono">
                    Khatian: {{ a.khatian_no }} | Dag: {{ a.dag_no }}
                  </td>
                  <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                    {{ a.allocated_area_katha }} Katha
                    <div class="text-[10px] text-slate-400 font-normal font-mono">({{ a.allocated_area_sqft | number:'1.0-0' }} SqFt)</div>
                  </td>
                  <td class="px-4 py-3 font-bold text-blue-600">
                    {{ a.landowner_jv_split }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      [ngClass]="a.mutation_status === 'MUTATED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60' : 'bg-amber-50 text-amber-700 border-amber-200'">
                      {{ a.mutation_status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="removeAllocation(a.id)" class="text-rose-600 hover:text-rose-800 font-semibold text-xs">Remove</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Allocation Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Allocate Land Parcel to Project</h2>
            <form [formGroup]="allocForm" (ngSubmit)="saveAllocation()" class="space-y-3">
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
                  <label class="block text-xs font-semibold mb-1">Parcel Ref / Number</label>
                  <input type="text" formControlName="parcel_number" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Mouza Name</label>
                  <input type="text" formControlName="mouza_name" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Allocated Katha</label>
                  <input type="number" formControlName="allocated_area_katha" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">JV Sharing Ratio</label>
                  <select formControlName="landowner_jv_split" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <option value="50:50">50:50</option>
                    <option value="40:60">40:60</option>
                    <option value="45:55">45:55</option>
                  </select>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-3">
                <button type="button" (click)="isModalOpen.set(false)" class="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-xs">Save Allocation</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ProjectLandAllocationComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  isModalOpen = signal<boolean>(false);
  searchQuery = signal<string>('');

  allocations = signal<LandAllocationRecord[]>([
    {
      id: 1,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      land_bank_id: 1,
      parcel_number: 'PARCEL-GLS-01',
      mouza_name: 'Gulshan',
      khatian_no: 'RS-4521',
      dag_no: '8910',
      allocated_area_katha: 20.0,
      allocated_area_sqft: 14400,
      allocation_ratio_pct: 100.0,
      landowner_jv_split: '50:50',
      mutation_status: 'MUTATED',
      possession_date: '2026-01-15',
      remarks: 'Full physical possession handed over to civil contractor.'
    },
    {
      id: 2,
      project_id: 2,
      project_name: 'Apex Horizon Bay Complex',
      project_code: 'PRJ-2026-002',
      land_bank_id: 2,
      parcel_number: 'PARCEL-BND-03',
      mouza_name: 'Bashundhara R/A',
      khatian_no: 'BS-1290',
      dag_no: '4502',
      allocated_area_katha: 15.5,
      allocated_area_sqft: 11160,
      allocation_ratio_pct: 100.0,
      landowner_jv_split: '40:60',
      mutation_status: 'IN_PROCESS',
      possession_date: '2026-02-10',
      remarks: 'Demarcation boundary pillars erected.'
    }
  ]);

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `[${p.project_code}] ${p.project_name}`,
      subLabel: `${p.thana_upazila}, ${p.district}`
    }));
  });

  totalAllocatedKatha = computed(() => this.allocations().reduce((acc, a) => acc + a.allocated_area_katha, 0));
  mutatedKatha = computed(() => this.allocations().filter(a => a.mutation_status === 'MUTATED').reduce((acc, a) => acc + a.allocated_area_katha, 0));

  filteredAllocations = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.allocations();
    return this.allocations().filter(a =>
      a.project_name.toLowerCase().includes(q) ||
      a.mouza_name.toLowerCase().includes(q) ||
      a.khatian_no.toLowerCase().includes(q) ||
      a.dag_no.toLowerCase().includes(q)
    );
  });

  allocForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    parcel_number: ['PARCEL-NEW-01', Validators.required],
    mouza_name: ['Gulshan', Validators.required],
    khatian_no: ['RS-1001'],
    dag_no: ['2001'],
    allocated_area_katha: [10.0, Validators.required],
    landowner_jv_split: ['50:50'],
    mutation_status: ['MUTATED']
  });

  ngOnInit(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p || []));
  }

  openAddModal(): void {
    this.allocForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      parcel_number: `PARCEL-GLS-${this.allocations().length + 1}`,
      mouza_name: 'Gulshan',
      khatian_no: 'RS-9081',
      dag_no: '3412',
      allocated_area_katha: 12.5,
      landowner_jv_split: '50:50',
      mutation_status: 'MUTATED'
    });
    this.isModalOpen.set(true);
  }

  saveAllocation(): void {
    if (this.allocForm.invalid) return;
    const v = this.allocForm.value;
    const proj = this.projects().find(p => p.id === Number(v.project_id));
    const newRecord: LandAllocationRecord = {
      id: Date.now(),
      project_id: Number(v.project_id),
      project_name: proj?.project_name || 'Selected Project',
      project_code: proj?.project_code || 'PRJ-2026',
      land_bank_id: 1,
      parcel_number: v.parcel_number,
      mouza_name: v.mouza_name,
      khatian_no: v.khatian_no,
      dag_no: v.dag_no,
      allocated_area_katha: Number(v.allocated_area_katha),
      allocated_area_sqft: Number(v.allocated_area_katha) * 720,
      allocation_ratio_pct: 100.0,
      landowner_jv_split: v.landowner_jv_split,
      mutation_status: v.mutation_status,
      possession_date: new Date().toISOString().split('T')[0],
      remarks: 'Allocated via master setup.'
    };

    this.allocations.update(items => [newRecord, ...items]);
    this.isModalOpen.set(false);
  }

  removeAllocation(id: number): void {
    this.allocations.update(items => items.filter(a => a.id !== id));
  }
}
