import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import { WBSNode, Subcontractor } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-wbs-node-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      <!-- Unified Top Header with Navigation -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/wbs-boq"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to WBS & BOQ Master"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Work Breakdown Structure (WBS)
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Edit Activity Node #' + nodeId() : 'New Activity Node' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Edit WBS Activity & Schedule' : 'Create WBS Milestone & Activity Node' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            (click)="fillExampleData()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer shadow-2xs"
            title="Load realistic Bangladesh construction demo data"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span>Example Data</span>
          </button>

          <a
            routerLink="/construction/wbs-boq"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="wbsForm.invalid || isSaving()"
            (clicked)="saveWBSNode()"
          >
            <span class="flex items-center gap-2">
              @if (isSaving()) {
                Saving...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                {{ isEditMode() ? 'Update Activity Node' : 'Save WBS Node' }}
              }
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Feedback Notifications -->
      @if (feedbackMsg()) {
        <div role="status" class="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between shadow-xs">
          <span class="flex items-center gap-2">
            <span>✨</span>
            <span>{{ feedbackMsg() }}</span>
          </span>
          <button type="button" (click)="feedbackMsg.set('')" class="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      }

      @if (errorMsg()) {
        <div role="alert" class="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center justify-between shadow-xs">
          <span>{{ errorMsg() }}</span>
          <button type="button" (click)="errorMsg.set('')" class="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      }

      <!-- Form Tabs Strip -->
      <div class="flex items-center gap-1.5 p-1.5 rounded-2xl bg-secondary/60 border border-border overflow-x-auto scrollbar-none">
        @for (tab of formTabs; track tab.id) {
          <button
            type="button"
            (click)="activeTab.set(tab.id)"
            [class]="activeTab() === tab.id
              ? 'bg-card text-foreground font-bold shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground font-medium hover:bg-card/50'"
            class="px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </button>
        }
      </div>

      <!-- Main Standalone Form Card -->
      <form [formGroup]="wbsForm" (ngSubmit)="saveWBSNode()" class="flex flex-col gap-6">

        <!-- Section 1: Hierarchy & Identification -->
        @if (activeTab() === 'hierarchy' || activeTab() === 'all') {
          <app-card-container
            title="1. Hierarchy, Classification & Identity"
            subtitle="Define project tier, parent node, dynamic phase category, and activity code"
          >
            <div class="flex flex-col gap-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <app-searchable-select
                  label="Construction Project *"
                  [options]="projectOptions"
                  formControlName="project_id"
                  [allowCreateNew]="false"
                  placeholder="Select project..."
                >
                </app-searchable-select>

                <app-searchable-select
                  label="Parent WBS Node (Hierarchical)"
                  [options]="parentOptions"
                  formControlName="parent_id"
                  [allowCreateNew]="false"
                  placeholder="Select parent package/phase (optional)..."
                >
                </app-searchable-select>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <app-custom-input
                  label="Activity / Node Code *"
                  placeholder="e.g. WBS-SITE-01.02"
                  formControlName="node_code"
                >
                </app-custom-input>

                <app-searchable-select
                  label="WBS Hierarchy Tier *"
                  categoryCode="WBS_TIER"
                  [allowCreateNew]="true"
                  formControlName="wbs_tier"
                  placeholder="Select or add tier..."
                >
                </app-searchable-select>

                <app-searchable-select
                  label="Phase Category *"
                  categoryCode="CONSTRUCTION_PHASE"
                  [allowCreateNew]="true"
                  formControlName="phase_category"
                  placeholder="Select or add phase..."
                >
                </app-searchable-select>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <app-custom-input
                  label="Activity / Deliverable Name *"
                  placeholder="e.g. Excavation and Soil Disposal"
                  formControlName="node_name"
                >
                </app-custom-input>

                <app-custom-input
                  label="Activity Specific Type"
                  placeholder="e.g. Bulk Excavation / Deep Piling"
                  formControlName="activity_type"
                >
                </app-custom-input>
              </div>
            </div>
          </app-card-container>
        }

        <!-- Section 2: Timeline, Duration & Baseline Schedule -->
        @if (activeTab() === 'schedule' || activeTab() === 'all') {
          <app-card-container
            title="2. Planned Timeline, Duration & Baseline Revision"
            subtitle="Schedule planned dates, task duration, critical-path status, and milestone flags"
          >
            <div class="flex flex-col gap-5">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Planned Start Date *"
                type="date"
                formControlName="planned_start_date"
              >
              </app-custom-input>

              <app-custom-input
                label="Planned End Date *"
                type="date"
                formControlName="planned_end_date"
              >
              </app-custom-input>

              <app-custom-input
                label="Duration (Working Days) *"
                type="number"
                min="1"
                placeholder="10"
                formControlName="duration_days"
              >
              </app-custom-input>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Baseline Start Date"
                type="date"
                formControlName="baseline_start_date"
              >
              </app-custom-input>

              <app-custom-input
                label="Baseline End Date"
                type="date"
                formControlName="baseline_end_date"
              >
              </app-custom-input>

              <app-custom-input
                label="Baseline Duration (Days)"
                type="number"
                min="1"
                placeholder="10"
                formControlName="baseline_duration_days"
              >
              </app-custom-input>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-secondary/30">
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  formControlName="is_critical_path"
                  class="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 border-border"
                />
                <div>
                  <span class="text-xs font-bold text-foreground block">Critical Path Activity (CPM)</span>
                  <span class="text-[11px] text-muted-foreground block">Any delay on this task directly extends project completion date</span>
                </div>
              </label>

              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  formControlName="is_milestone"
                  class="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-border"
                />
                <div>
                  <span class="text-xs font-bold text-foreground block">Major Deliverable / Key Milestone</span>
                  <span class="text-[11px] text-muted-foreground block">Zero-duration progress milestone for executive dashboards</span>
                </div>
              </label>
            </div>
            </div>
          </app-card-container>
        }

        <!-- Section 3: Quantity-Based Progress & Earned Value (EVM) -->
        @if (activeTab() === 'quantities' || activeTab() === 'all') {
          <app-card-container
            title="3. Quantity-Driven Progress & Earned Value (EVM)"
            subtitle="Configure unit of measure, planned/verified quantities, activity weightage, and status"
          >
            <div class="flex flex-col gap-5">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <app-searchable-select
                  label="Progress Measurement Method *"
                  categoryCode="PROGRESS_MEASURE_METHOD"
                  [allowCreateNew]="true"
                  formControlName="progress_measurement_method"
                  placeholder="Select method..."
                >
                </app-searchable-select>

                <app-searchable-select
                  label="Unit of Measure (UOM) *"
                  categoryCode="UNIT_OF_MEASURE"
                  [allowCreateNew]="true"
                  formControlName="unit_of_measure"
                  placeholder="Select or add UOM..."
                >
                </app-searchable-select>

                <app-searchable-select
                  label="Current Activity Status *"
                  categoryCode="WBS_ACTIVITY_STATUS"
                  [allowCreateNew]="true"
                  formControlName="status"
                  placeholder="Select status..."
                >
                </app-searchable-select>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <app-custom-input
                  label="Planned Quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1000.00"
                  formControlName="planned_quantity"
                >
                </app-custom-input>

                <app-custom-input
                  label="Approved Total Quantity *"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1000.00"
                  formControlName="approved_total_quantity"
                >
                </app-custom-input>

                <app-custom-input
                  label="Verified Completed Quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  formControlName="verified_completed_quantity"
                >
                </app-custom-input>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <app-custom-input
                  label="Progress Percentage (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0.0"
                  formControlName="progress_percentage"
                >
                </app-custom-input>

                <app-custom-input
                  label="Weightage in Project (%) *"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="5.0"
                  formControlName="weightage_percentage"
                >
                </app-custom-input>

                <app-custom-input
                  label="Schedule Revision No."
                  type="number"
                  min="0"
                  placeholder="0"
                  formControlName="schedule_revision_no"
                >
                </app-custom-input>
              </div>
            </div>
          </app-card-container>
        }

        <!-- Section 4, 5 & 6: Dependencies, Resources, Delays -->
        @if (activeTab() === 'dependencies' || activeTab() === 'all') {
          <div class="flex flex-col gap-6">
            <!-- Section 4: Activity Dependencies & CPM Relationships -->
            <app-card-container
              title="4. Activity Dependencies & Network Predecessors"
              subtitle="Link preceding activities with Finish-to-Start (FS), Start-to-Start (SS), and Lag Days"
            >
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <app-searchable-select
                  label="Predecessor Activity Node"
                  [options]="predecessorOptions"
                  formControlName="predecessor_node_id"
                  [allowCreateNew]="false"
                  placeholder="Select preceding task..."
                >
                </app-searchable-select>

                <app-searchable-select
                  label="Dependency Relationship *"
                  categoryCode="DEPENDENCY_TYPE"
                  [allowCreateNew]="true"
                  formControlName="dependency_type"
                  placeholder="Select dependency type..."
                >
                </app-searchable-select>

                <app-custom-input
                  label="Lag / Lead Time (Days)"
                  type="number"
                  placeholder="0"
                  formControlName="lag_days"
                >
                </app-custom-input>
              </div>
            </app-card-container>

            <!-- Section 5: Resource Allocation & Responsible Team -->
            <app-card-container
              title="5. Contractor, Engineer & Team Allocation"
              subtitle="Assign trade subcontractor, site resident engineer, and responsible execution unit"
            >
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <app-searchable-select
                  label="Assigned Trade Subcontractor"
                  [options]="contractorOptions"
                  formControlName="contractor_id"
                  [allowCreateNew]="false"
                  placeholder="Select subcontractor..."
                >
                </app-searchable-select>

                <app-custom-input
                  label="Responsible Project Engineer"
                  placeholder="e.g. Engr. Tanvir Ahmed, RE"
                  formControlName="responsible_engineer"
                >
                </app-custom-input>

                <app-custom-input
                  label="Responsible Team / Work Crew"
                  placeholder="e.g. Structural Steel Crew B"
                  formControlName="responsible_team"
                >
                </app-custom-input>
              </div>
            </app-card-container>

            <!-- Section 6: Delay Tracking & Site Constraints -->
            <app-card-container
              title="6. Delay Tracking, Weather & Site Constraints"
              subtitle="Log delay days, dynamic delay reason, site constraints, and corrective action plans"
            >
              <div class="flex flex-col gap-5">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <app-custom-input
                    label="Delay Days"
                    type="number"
                    min="0"
                    placeholder="0"
                    formControlName="delay_days"
                  >
                  </app-custom-input>

                  <app-searchable-select
                    label="Delay Reason Category"
                    categoryCode="DELAY_REASON"
                    [allowCreateNew]="true"
                    formControlName="delay_reason"
                    placeholder="Select or add delay reason..."
                  >
                  </app-searchable-select>

                  <app-custom-input
                    label="Forecasted Completion Date"
                    type="date"
                    formControlName="forecasted_end_date"
                  >
                  </app-custom-input>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <app-custom-textarea
                    label="Weather & Site Constraints"
                    placeholder="e.g. Heavy monsoon downpour, low water level, groundwater pump maintenance..."
                    formControlName="weather_constraints"
                    [rows]="2"
                  >
                  </app-custom-textarea>

                  <app-custom-textarea
                    label="Corrective Action Plan"
                    placeholder="e.g. Deployed 2 additional dewatering pumps, added night shift for reinforcement..."
                    formControlName="corrective_action"
                    [rows]="2"
                  >
                  </app-custom-textarea>
                </div>

                <app-custom-textarea
                  label="Engineering Remarks & Quality Checkpoints"
                  placeholder="Drawing references, test certificates, cube strength milestones, structural inspector sign-offs..."
                  formControlName="remarks"
                  [rows]="2"
                >
                </app-custom-textarea>
              </div>
            </app-card-container>
          </div>
        }

        <!-- Bottom Step Navigation & Action Bar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
          <div class="flex items-center gap-2">
            @if (activeTab() !== 'all' && activeTab() !== 'hierarchy') {
              <button
                type="button"
                (click)="goToPrevTab()"
                class="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                <span>Previous Step</span>
              </button>
            }
            @if (activeTab() !== 'all' && activeTab() !== 'dependencies') {
              <button
                type="button"
                (click)="goToNextTab()"
                class="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Next Step</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            }
          </div>

          <div class="flex items-center gap-3">
            <a
              routerLink="/construction/wbs-boq"
              class="px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-xl border border-border transition-colors"
            >
              Cancel
            </a>
            <app-custom-button
              variant="primary"
              [disabled]="wbsForm.invalid || isSaving()"
              (clicked)="saveWBSNode()"
            >
              <span class="flex items-center gap-2">
                @if (isSaving()) {
                  Saving...
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ isEditMode() ? 'Save Changes' : 'Create WBS Activity Node' }}
                }
              </span>
            </app-custom-button>
          </div>
        </div>
      </form>
    </div>
  `
})
export class WbsNodeFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  isSaving = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  nodeId = signal<number | null>(null);

  activeTab = signal<string>('hierarchy');
  feedbackMsg = signal<string>('');
  errorMsg = signal<string>('');

  readonly formTabs = [
    { id: 'hierarchy', label: '1. Hierarchy & Identity', icon: '🏛️' },
    { id: 'schedule', label: '2. Timeline & Schedule', icon: '📅' },
    { id: 'quantities', label: '3. Scope & Quantities', icon: '📊' },
    { id: 'dependencies', label: '4. Dependencies & Site Logs', icon: '🔗' },
    { id: 'all', label: 'All Sections', icon: '📋' }
  ];

  private readonly tabOrder = ['hierarchy', 'schedule', 'quantities', 'dependencies'];

  goToNextTab(): void {
    const currentIndex = this.tabOrder.indexOf(this.activeTab());
    if (currentIndex >= 0 && currentIndex < this.tabOrder.length - 1) {
      this.activeTab.set(this.tabOrder[currentIndex + 1]);
    }
  }

  goToPrevTab(): void {
    const currentIndex = this.tabOrder.indexOf(this.activeTab());
    if (currentIndex > 0) {
      this.activeTab.set(this.tabOrder[currentIndex - 1]);
    }
  }

  fillExampleData(): void {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 21 * 86400000).toISOString().split('T')[0];

    const currentProjectId = this.wbsForm.get('project_id')?.value || (this.projectOptions.length > 0 ? this.projectOptions[0].value : null);
    const contractorId = this.contractorOptions.length > 1 ? this.contractorOptions[1].value : null;
    const parentId = this.parentOptions.length > 1 ? this.parentOptions[1].value : null;

    this.wbsForm.patchValue({
      project_id: currentProjectId,
      parent_id: parentId,
      node_code: 'WBS-STR-02.01',
      node_name: 'Column Casting & Reinforcement (2nd Floor)',
      wbs_tier: 'ACTIVITY',
      phase_category: 'SUPERSTRUCTURE',
      activity_type: 'RCC Framing & Concrete Placement',

      planned_start_date: startDate,
      planned_end_date: endDate,
      duration_days: 21,

      baseline_start_date: startDate,
      baseline_end_date: endDate,
      baseline_duration_days: 21,
      is_critical_path: true,
      is_milestone: false,

      unit_of_measure: 'CFT',
      planned_quantity: 1800.0,
      approved_total_quantity: 1800.0,
      verified_completed_quantity: 450.0,
      progress_measurement_method: 'QUANTITY_DRIVEN',
      progress_percentage: 25.0,
      weightage_percentage: 7.5,
      status: 'IN_PROGRESS',
      schedule_revision_no: 1,

      dependency_type: 'FS',
      lag_days: 2,

      contractor_id: contractorId,
      responsible_engineer: 'Engr. Tanvir Ahmed, RE (Structural)',
      responsible_team: 'Civil Structural Crew B',

      delay_days: 0,
      delay_reason: null,
      forecasted_end_date: endDate,
      weather_constraints: 'Normal dry-weather construction window.',
      corrective_action: 'Concrete batch plant calibrated and backup vibrators staged.',
      remarks: 'Conforming to BNBC 2020 standards and BDS 500W rebar placement criteria.'
    });

    this.recalcDuration();
    this.recalcQuantityProgress();
    this.feedbackMsg.set('✨ Example WBS activity data loaded for Superstructure RCC column casting.');
    setTimeout(() => this.feedbackMsg.set(''), 5000);
  }

  projectOptions: { value: any; label: string }[] = [];
  parentOptions: { value: any; label: string }[] = [];
  predecessorOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  wbsForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    parent_id: [null],
    node_code: ['', Validators.required],
    node_name: ['', Validators.required],
    wbs_tier: ['ACTIVITY', Validators.required],
    phase_category: ['SITE_PREPARATION', Validators.required],
    activity_type: [''],

    planned_start_date: [new Date().toISOString().split('T')[0], Validators.required],
    planned_end_date: [new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], Validators.required],
    duration_days: [14, [Validators.required, Validators.min(1)]],

    baseline_start_date: [null],
    baseline_end_date: [null],
    baseline_duration_days: [null],
    is_critical_path: [false],
    is_milestone: [false],

    unit_of_measure: ['SFT', Validators.required],
    planned_quantity: [0.0],
    approved_total_quantity: [0.0],
    verified_completed_quantity: [0.0],
    progress_measurement_method: ['QUANTITY_DRIVEN', Validators.required],
    progress_percentage: [0.0, [Validators.min(0), Validators.max(100)]],
    weightage_percentage: [5.0, [Validators.required, Validators.min(0), Validators.max(100)]],
    status: ['NOT_STARTED', Validators.required],
    schedule_revision_no: [0],

    predecessor_node_id: [null],
    dependency_type: ['FS'],
    lag_days: [0],

    contractor_id: [null],
    responsible_engineer: [''],
    responsible_team: [''],

    delay_days: [0],
    delay_reason: [null],
    forecasted_end_date: [null],
    weather_constraints: [''],
    corrective_action: [''],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadContractors();

    // Calculate duration whenever dates change
    this.wbsForm.get('planned_start_date')?.valueChanges.subscribe(() => this.recalcDuration());
    this.wbsForm.get('planned_end_date')?.valueChanges.subscribe(() => this.recalcDuration());

    // Auto-calculate progress percentage when quantities change
    this.wbsForm.get('verified_completed_quantity')?.valueChanges.subscribe(() => this.recalcQuantityProgress());
    this.wbsForm.get('approved_total_quantity')?.valueChanges.subscribe(() => this.recalcQuantityProgress());

    // Check if Edit mode
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.nodeId.set(id);
      this.isEditMode.set(true);
      this.loadNodeDetails(id);
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projectOptions = projs.map(p => ({
          value: p.id,
          label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
        }));

        if (!this.isEditMode() && projs.length > 0) {
          const firstId = projs[0].id;
          this.wbsForm.patchValue({ project_id: firstId });
          this.loadProjectNodes(firstId);
        }
      }
    });

    this.wbsForm.get('project_id')?.valueChanges.subscribe((pId) => {
      if (pId) {
        this.loadProjectNodes(Number(pId));
      }
    });
  }

  loadContractors(): void {
    this.constructionService.getContractors().subscribe({
      next: (subcons) => {
        this.contractorOptions = [
          { value: null, label: 'None / In-House Team' },
          ...subcons.map(s => ({
            value: s.id,
            label: `${s.company_name} (${s.trade_specialization})`
          }))
        ];
      }
    });
  }

  loadProjectNodes(projectId: number): void {
    this.constructionService.getWBSNodes({ project_id: projectId }).subscribe({
      next: (nodes) => {
        const currentId = this.nodeId();
        const availableNodes = currentId ? nodes.filter(n => n.id !== currentId) : nodes;

        this.parentOptions = [
          { value: null, label: 'None (Root Level Work Package)' },
          ...availableNodes.map(n => ({
            value: n.id,
            label: `${n.node_code} - ${n.node_name} (${n.wbs_tier})`
          }))
        ];

        this.predecessorOptions = [
          { value: null, label: 'None (No Predecessor Dependency)' },
          ...availableNodes.map(n => ({
            value: n.id,
            label: `${n.node_code} - ${n.node_name}`
          }))
        ];
      }
    });
  }

  loadNodeDetails(id: number): void {
    this.constructionService.getWBSNodeById(id).subscribe({
      next: (node) => {
        this.wbsForm.patchValue({
          project_id: node.project_id,
          parent_id: node.parent_id,
          node_code: node.node_code,
          node_name: node.node_name,
          wbs_tier: node.wbs_tier,
          phase_category: node.phase_category,
          activity_type: node.activity_type || '',

          planned_start_date: node.planned_start_date,
          planned_end_date: node.planned_end_date,
          duration_days: node.duration_days || 1,

          baseline_start_date: node.baseline_start_date,
          baseline_end_date: node.baseline_end_date,
          baseline_duration_days: node.baseline_duration_days,
          is_critical_path: Boolean(node.is_critical_path),
          is_milestone: Boolean(node.is_milestone),

          unit_of_measure: node.unit_of_measure || 'SFT',
          planned_quantity: node.planned_quantity || 0.0,
          approved_total_quantity: node.approved_total_quantity || 0.0,
          verified_completed_quantity: node.verified_completed_quantity || 0.0,
          progress_measurement_method: node.progress_measurement_method || 'QUANTITY_DRIVEN',
          progress_percentage: node.progress_percentage || 0.0,
          weightage_percentage: node.weightage_percentage || 5.0,
          status: node.status || 'NOT_STARTED',
          schedule_revision_no: node.schedule_revision_no || 0,

          predecessor_node_id: node.predecessor_node_id,
          dependency_type: node.dependency_type || 'FS',
          lag_days: node.lag_days || 0,

          contractor_id: node.contractor_id,
          responsible_engineer: node.responsible_engineer || '',
          responsible_team: node.responsible_team || '',

          delay_days: node.delay_days || 0,
          delay_reason: node.delay_reason,
          forecasted_end_date: node.forecasted_end_date,
          weather_constraints: node.weather_constraints || '',
          corrective_action: node.corrective_action || '',
          remarks: node.remarks || ''
        });

        if (node.project_id) {
          this.loadProjectNodes(node.project_id);
        }
      }
    });
  }

  recalcDuration(): void {
    const s = this.wbsForm.get('planned_start_date')?.value;
    const e = this.wbsForm.get('planned_end_date')?.value;
    if (s && e) {
      const start = new Date(s).getTime();
      const end = new Date(e).getTime();
      const diff = Math.max(1, Math.round((end - start) / (1000 * 3600 * 24)));
      this.wbsForm.patchValue({ duration_days: diff }, { emitEvent: false });
    }
  }

  recalcQuantityProgress(): void {
    const method = this.wbsForm.get('progress_measurement_method')?.value;
    if (method === 'QUANTITY_DRIVEN') {
      const approved = Number(this.wbsForm.get('approved_total_quantity')?.value) || 0;
      const verified = Number(this.wbsForm.get('verified_completed_quantity')?.value) || 0;
      if (approved > 0) {
        const pct = Math.min(100.0, Math.round((verified / approved) * 1000) / 10);
        this.wbsForm.patchValue({ progress_percentage: pct }, { emitEvent: false });
      }
    }
  }

  saveWBSNode(): void {
    if (this.wbsForm.invalid) {
      this.wbsForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.wbsForm.value;

    const payload = {
      project_id: Number(formVal.project_id),
      parent_id: formVal.parent_id ? Number(formVal.parent_id) : null,
      node_code: formVal.node_code,
      node_name: formVal.node_name,
      wbs_tier: formVal.wbs_tier,
      phase_category: formVal.phase_category,
      activity_type: formVal.activity_type || null,

      planned_start_date: formVal.planned_start_date,
      planned_end_date: formVal.planned_end_date,
      duration_days: Number(formVal.duration_days) || 1,

      baseline_start_date: formVal.baseline_start_date || null,
      baseline_end_date: formVal.baseline_end_date || null,
      baseline_duration_days: formVal.baseline_duration_days ? Number(formVal.baseline_duration_days) : null,
      is_critical_path: Boolean(formVal.is_critical_path),
      is_milestone: Boolean(formVal.is_milestone),

      unit_of_measure: formVal.unit_of_measure || 'SFT',
      planned_quantity: Number(formVal.planned_quantity) || 0.0,
      approved_total_quantity: Number(formVal.approved_total_quantity) || 0.0,
      verified_completed_quantity: Number(formVal.verified_completed_quantity) || 0.0,
      progress_measurement_method: formVal.progress_measurement_method || 'QUANTITY_DRIVEN',
      progress_percentage: Number(formVal.progress_percentage) || 0.0,
      weightage_percentage: Number(formVal.weightage_percentage) || 5.0,
      status: formVal.status || 'NOT_STARTED',
      schedule_revision_no: Number(formVal.schedule_revision_no) || 0,

      predecessor_node_id: formVal.predecessor_node_id ? Number(formVal.predecessor_node_id) : null,
      dependency_type: formVal.dependency_type || 'FS',
      lag_days: Number(formVal.lag_days) || 0,

      contractor_id: formVal.contractor_id ? Number(formVal.contractor_id) : null,
      responsible_engineer: formVal.responsible_engineer || null,
      responsible_team: formVal.responsible_team || null,

      delay_days: Number(formVal.delay_days) || 0,
      delay_reason: formVal.delay_reason || null,
      forecasted_end_date: formVal.forecasted_end_date || null,
      weather_constraints: formVal.weather_constraints || null,
      corrective_action: formVal.corrective_action || null,
      remarks: formVal.remarks || null
    };

    const currentId = this.nodeId();
    if (this.isEditMode() && currentId) {
      this.constructionService.updateWBSNode(currentId, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/wbs-boq']);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMsg.set(err?.error?.detail || 'Failed to update WBS node.');
        }
      });
    } else {
      this.constructionService.createWBSNode(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/wbs-boq']);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMsg.set(err?.error?.detail || 'Failed to create WBS node.');
        }
      });
    }
  }
}
