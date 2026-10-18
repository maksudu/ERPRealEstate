import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import { ProjectNavComponent } from '../project-nav/project-nav.component';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

export interface ChangeOrderRecord {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  variation_number: string;
  variation_title: string;
  originator: string; // CLIENT, ARCHITECT, SITE_ENGINEER, CONSULTANT
  cost_impact_bdt: number;
  schedule_impact_days: number;
  reason_category: string;
  approval_status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  effective_date: string;
}

@Component({
  selector: 'app-project-change-orders',
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
      <app-project-nav activeCode="2.12"></app-project-nav>

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Total Variation Orders</p>
          <p class="text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">{{ variations().length }} VOs</p>
          <p class="text-[10px] text-slate-400">Architectural & Civil Scope Changes</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Approved Cost Impact</p>
          <p class="text-xl font-bold font-display text-amber-600 dark:text-amber-400 mt-1">৳{{ (approvedCostImpact() / 10000000) | number:'1.2-2' }} Cr</p>
          <p class="text-[10px] text-slate-400">Adjusted in Master BOQ</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Schedule Extension Impact</p>
          <p class="text-xl font-bold font-display text-blue-600 dark:text-blue-400 mt-1">+{{ totalDaysImpact() }} Days</p>
          <p class="text-[10px] text-slate-400">Contractual Time Extension</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Approval Rate</p>
          <p class="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">{{ approvalRate() }}%</p>
          <p class="text-[10px] text-slate-400">Sanctioned by Management</p>
        </div>
      </div>

      <!-- Main Container -->
      <app-card-container
        title="2.12 Project Change Orders & Variations Register"
        subtitle="Formal contract amendments, scope variations, architectural alterations, and budget reconciliations"
        badge="Variation Orders"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Raise Variation Order (VO)</span>
          </button>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              <tr>
                <th class="px-4 py-3">VO Number & Title</th>
                <th class="px-4 py-3">Linked Project</th>
                <th class="px-4 py-3">Originator & Reason</th>
                <th class="px-4 py-3">Financial Cost Impact</th>
                <th class="px-4 py-3">Schedule Impact</th>
                <th class="px-4 py-3">Approval Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (v of variations(); track v.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3">
                    <div class="font-bold font-mono text-emerald-600 dark:text-emerald-400">{{ v.variation_number }}</div>
                    <div class="font-semibold text-slate-900 dark:text-slate-100">{{ v.variation_title }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-800 dark:text-slate-200">{{ v.project_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ v.project_code }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-700 dark:text-slate-300">{{ v.originator }}</div>
                    <div class="text-[10px] text-slate-400 uppercase">{{ v.reason_category }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono font-bold" [ngClass]="v.cost_impact_bdt >= 0 ? 'text-amber-600' : 'text-emerald-600'">
                    {{ v.cost_impact_bdt >= 0 ? '+' : '' }}৳{{ v.cost_impact_bdt | number:'1.0-0' }}
                  </td>
                  <td class="px-4 py-3 font-mono">
                    {{ v.schedule_impact_days >= 0 ? '+' : '' }}{{ v.schedule_impact_days }} Days
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200': v.approval_status === 'APPROVED',
                        'bg-blue-50 text-blue-700 border-blue-200': v.approval_status === 'SUBMITTED',
                        'bg-rose-50 text-rose-700 border-rose-200': v.approval_status === 'REJECTED'
                      }"
                    >
                      {{ v.approval_status }}
                    </span>
                    @if (v.approved_by) {
                      <div class="text-[10px] text-slate-400 mt-0.5">{{ v.approved_by }}</div>
                    }
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="toggleApproval(v)" class="text-blue-600 hover:text-blue-800 font-semibold text-xs">
                      {{ v.approval_status === 'APPROVED' ? 'Revoke' : 'Approve' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Raise Variation Order (VO)</h2>
            <form [formGroup]="voForm" (ngSubmit)="saveVariation()" class="space-y-3">
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
                  <label class="block text-xs font-semibold mb-1">VO Number <span class="text-rose-500">*</span></label>
                  <input type="text" formControlName="variation_number" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Originator</label>
                  <select formControlName="originator" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold">
                    <option value="CLIENT_CUSTOMIZATION">Client Customization Request</option>
                    <option value="ARCHITECTURAL_CHANGE">Architectural Plan Revision</option>
                    <option value="SITE_CONDITION">Unforeseen Sub-Surface Soil Condition</option>
                    <option value="STATUTORY_MANDATE">Authority / RAJUK Mandate</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1">Variation Title <span class="text-rose-500">*</span></label>
                <input type="text" formControlName="variation_title" placeholder="e.g. Duplex unit combining Flat 12A & 12B" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Cost Impact (BDT)</label>
                  <input type="number" formControlName="cost_impact_bdt" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Schedule Impact (Days)</label>
                  <input type="number" formControlName="schedule_impact_days" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-3">
                <button type="button" (click)="isModalOpen.set(false)" class="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-xs">Submit VO</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ProjectChangeOrdersComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  isModalOpen = signal<boolean>(false);

  variations = signal<ChangeOrderRecord[]>([
    {
      id: 1,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      variation_number: 'VO-PRJ-2026-001',
      variation_title: 'Duplex Unit Combination of Penthouse 13A & 13B',
      originator: 'CLIENT_CUSTOMIZATION',
      cost_impact_bdt: 4200000,
      schedule_impact_days: 14,
      reason_category: 'ARCHITECTURAL',
      approval_status: 'APPROVED',
      approved_by: 'Executive Director',
      effective_date: '2026-03-01'
    },
    {
      id: 2,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      variation_number: 'VO-PRJ-2026-002',
      variation_title: 'Addition of EV Charging Stations in Basement 1',
      originator: 'ARCHITECTURAL_CHANGE',
      cost_impact_bdt: 2500000,
      schedule_impact_days: 7,
      reason_category: 'MEP_ELECTRICAL',
      approval_status: 'APPROVED',
      approved_by: 'Chief Engineer',
      effective_date: '2026-03-15'
    }
  ]);

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `[${p.project_code}] ${p.project_name}`,
      subLabel: `${p.thana_upazila}, ${p.district}`
    }));
  });

  approvedCostImpact = computed(() => this.variations().filter(v => v.approval_status === 'APPROVED').reduce((acc, v) => acc + v.cost_impact_bdt, 0));
  totalDaysImpact = computed(() => this.variations().reduce((acc, v) => acc + v.schedule_impact_days, 0));
  approvalRate = computed(() => {
    if (!this.variations().length) return 100;
    const app = this.variations().filter(v => v.approval_status === 'APPROVED').length;
    return Math.round((app / this.variations().length) * 100);
  });

  voForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    variation_number: ['VO-PRJ-2026-003', Validators.required],
    variation_title: ['', Validators.required],
    originator: ['CLIENT_CUSTOMIZATION', Validators.required],
    cost_impact_bdt: [1500000],
    schedule_impact_days: [5]
  });

  ngOnInit(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p || []));
  }

  openAddModal(): void {
    this.voForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      variation_number: `VO-PRJ-2026-00${this.variations().length + 1}`,
      variation_title: '',
      originator: 'CLIENT_CUSTOMIZATION',
      cost_impact_bdt: 1500000,
      schedule_impact_days: 7
    });
    this.isModalOpen.set(true);
  }

  saveVariation(): void {
    if (this.voForm.invalid) return;
    const val = this.voForm.value;
    const proj = this.projects().find(p => p.id === Number(val.project_id));
    const newVO: ChangeOrderRecord = {
      id: Date.now(),
      project_id: Number(val.project_id),
      project_name: proj?.project_name || 'Selected Project',
      project_code: proj?.project_code || 'PRJ-2026',
      variation_number: val.variation_number,
      variation_title: val.variation_title,
      originator: val.originator,
      cost_impact_bdt: Number(val.cost_impact_bdt),
      schedule_impact_days: Number(val.schedule_impact_days),
      reason_category: 'CIVIL_STRUCTURAL',
      approval_status: 'SUBMITTED',
      effective_date: new Date().toISOString().split('T')[0]
    };
    this.variations.update(list => [newVO, ...list]);
    this.isModalOpen.set(false);
  }

  toggleApproval(v: ChangeOrderRecord): void {
    const nextStatus = v.approval_status === 'APPROVED' ? 'SUBMITTED' : 'APPROVED';
    this.variations.update(list => list.map(item => item.id === v.id ? { ...item, approval_status: nextStatus } : item));
  }
}
