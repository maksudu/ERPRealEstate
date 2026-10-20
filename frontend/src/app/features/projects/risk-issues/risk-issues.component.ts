import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

export interface ProjectRisk {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  risk_category: string;
  risk_title: string;
  probability: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'MINOR' | 'MODERATE' | 'CRITICAL';
  mitigation_strategy: string;
  assigned_owner: string;
  status: 'OPEN' | 'MITIGATED' | 'CLOSED';
}

@Component({
  selector: 'app-project-risk-issues',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-5">

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Total Logged Risks</p>
          <p class="text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">{{ risks().length }} Risks</p>
          <p class="text-[10px] text-slate-400">Statutory, Price & Technical</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Critical Impact Risks</p>
          <p class="text-xl font-bold font-display text-rose-600 dark:text-rose-400 mt-1">{{ criticalCount() }}</p>
          <p class="text-[10px] text-slate-400">Executive Priority Review</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Mitigated Risks</p>
          <p class="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">{{ mitigatedCount() }}</p>
          <p class="text-[10px] text-slate-400">Contingency Applied</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Open Active Issues</p>
          <p class="text-xl font-bold font-display text-amber-600 dark:text-amber-400 mt-1">{{ openCount() }}</p>
          <p class="text-[10px] text-slate-400">Requires PM Intervention</p>
        </div>
      </div>

      <!-- Main Container -->
      <app-card-container
        title="2.11 Project Risk & Issue Management Matrix"
        subtitle="Probability-impact matrix, statutory delay risk register, and mitigation action tracking"
        badge="Risk Governance"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Log Risk / Issue</span>
          </button>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              <tr>
                <th class="px-4 py-3">Risk Title & Category</th>
                <th class="px-4 py-3">Linked Project</th>
                <th class="px-4 py-3">Severity (Prob × Impact)</th>
                <th class="px-4 py-3">Mitigation Strategy</th>
                <th class="px-4 py-3">Owner</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (r of risks(); track r.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    {{ r.risk_title }}
                    <div class="text-[10px] text-slate-400 font-normal uppercase">{{ r.risk_category }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-800 dark:text-slate-200">{{ r.project_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ r.project_code }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5">
                      <span class="inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold"
                        [ngClass]="r.impact === 'CRITICAL' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'">
                        {{ r.impact }}
                      </span>
                      <span class="text-[10px] text-slate-400 font-mono">({{ r.probability }} Prob)</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs">
                    {{ r.mitigation_strategy }}
                  </td>
                  <td class="px-4 py-3 font-medium">
                    {{ r.assigned_owner }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200': r.status === 'MITIGATED' || r.status === 'CLOSED',
                        'bg-rose-50 text-rose-700 border-rose-200': r.status === 'OPEN'
                      }"
                    >
                      {{ r.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="toggleRiskStatus(r)" class="text-blue-600 hover:text-blue-800 font-semibold text-xs">Update</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Add Risk Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Log Project Risk / Technical Issue</h2>
            <form [formGroup]="riskForm" (ngSubmit)="saveRisk()" class="space-y-3">
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
                  <label class="block text-xs font-semibold mb-1">Risk Category</label>
                  <select formControlName="risk_category" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold">
                    <option value="STATUTORY_APPROVAL">Statutory & Permitting Delay</option>
                    <option value="PRICE_ESCALATION">Material Price Inflation (Rebar/Cement)</option>
                    <option value="GEOTECHNICAL_SOIL">Geotechnical / Soil Failure</option>
                    <option value="CONTRACTOR_DEFAULT">Contractor Non-Performance</option>
                    <option value="COMMUNITY_OBJECTION">Neighbor / Community Objection</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Impact Level</label>
                  <select formControlName="impact" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold">
                    <option value="CRITICAL">Critical (High Cost/Delay)</option>
                    <option value="MODERATE">Moderate Impact</option>
                    <option value="MINOR">Minor Advisory</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1">Risk Title <span class="text-rose-500">*</span></label>
                <input type="text" formControlName="risk_title" placeholder="e.g. Delay in Fire NOC clearance memo" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1">Mitigation Strategy <span class="text-rose-500">*</span></label>
                <textarea formControlName="mitigation_strategy" rows="2" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"></textarea>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Assigned Owner</label>
                  <input type="text" formControlName="assigned_owner" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Status</label>
                  <select formControlName="status" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold">
                    <option value="OPEN">Open</option>
                    <option value="MITIGATED">Mitigated</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-3">
                <button type="button" (click)="isModalOpen.set(false)" class="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-xs">Log Risk</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ProjectRiskIssuesComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  isModalOpen = signal<boolean>(false);

  risks = signal<ProjectRisk[]>([
    {
      id: 1,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      risk_category: 'STATUTORY_APPROVAL',
      risk_title: 'CAAB Height Sanction Renewal Buffer',
      probability: 'MEDIUM',
      impact: 'CRITICAL',
      mitigation_strategy: 'Applied 60 days before expiry; liaison officer appointed to CAAB engineering cell.',
      assigned_owner: 'Mustafizur Rahman (Director Planning)',
      status: 'MITIGATED'
    },
    {
      id: 2,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      risk_category: 'PRICE_ESCALATION',
      risk_title: 'Deformed Rebar Global Price Spike',
      probability: 'HIGH',
      impact: 'MODERATE',
      mitigation_strategy: 'Locked 300 TON forward bulk purchase contract with BSRM Steel at ৳98,000/TON ceiling.',
      assigned_owner: 'Procurement Head',
      status: 'MITIGATED'
    },
    {
      id: 3,
      project_id: 2,
      project_name: 'Apex Horizon Bay Complex',
      project_code: 'PRJ-2026-002',
      risk_category: 'GEOTECHNICAL_SOIL',
      risk_title: 'High Underground Water Table during Basement De-watering',
      probability: 'HIGH',
      impact: 'CRITICAL',
      mitigation_strategy: 'Deploying continuous deep tube-well de-watering and secant pile cutoff wall.',
      assigned_owner: 'Engr. Tariqul Islam',
      status: 'OPEN'
    }
  ]);

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `[${p.project_code}] ${p.project_name}`,
      subLabel: `${p.thana_upazila}, ${p.district}`
    }));
  });

  criticalCount = computed(() => this.risks().filter(r => r.impact === 'CRITICAL').length);
  mitigatedCount = computed(() => this.risks().filter(r => r.status === 'MITIGATED' || r.status === 'CLOSED').length);
  openCount = computed(() => this.risks().filter(r => r.status === 'OPEN').length);

  riskForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    risk_category: ['STATUTORY_APPROVAL', Validators.required],
    risk_title: ['', Validators.required],
    impact: ['CRITICAL'],
    probability: ['MEDIUM'],
    mitigation_strategy: ['', Validators.required],
    assigned_owner: ['Project Manager', Validators.required],
    status: ['OPEN']
  });

  ngOnInit(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p || []));
  }

  openAddModal(): void {
    this.riskForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      risk_category: 'STATUTORY_APPROVAL',
      risk_title: '',
      impact: 'CRITICAL',
      probability: 'MEDIUM',
      mitigation_strategy: '',
      assigned_owner: 'Lead Civil Engineer',
      status: 'OPEN'
    });
    this.isModalOpen.set(true);
  }

  saveRisk(): void {
    if (this.riskForm.invalid) return;
    const v = this.riskForm.value;
    const proj = this.projects().find(p => p.id === Number(v.project_id));
    const newR: ProjectRisk = {
      id: Date.now(),
      project_id: Number(v.project_id),
      project_name: proj?.project_name || 'Selected Project',
      project_code: proj?.project_code || 'PRJ-2026',
      risk_category: v.risk_category,
      risk_title: v.risk_title,
      probability: v.probability,
      impact: v.impact,
      mitigation_strategy: v.mitigation_strategy,
      assigned_owner: v.assigned_owner,
      status: v.status
    };
    this.risks.update(list => [newR, ...list]);
    this.isModalOpen.set(false);
  }

  toggleRiskStatus(r: ProjectRisk): void {
    const nextStatus = r.status === 'OPEN' ? 'MITIGATED' : (r.status === 'MITIGATED' ? 'CLOSED' : 'OPEN');
    this.risks.update(list => list.map(item => item.id === r.id ? { ...item, status: nextStatus } : item));
  }
}
