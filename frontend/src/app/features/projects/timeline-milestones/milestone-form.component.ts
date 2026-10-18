import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectMilestone } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-milestone-form',
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
    <div class="space-y-6">
      <!-- Top Navigation & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <a
            routerLink="/projects/timeline-milestones"
            class="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Back to Milestones"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                Submodule 2.7
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Edit Milestone #' + milestoneId() : 'New Milestone Record' }}
              </span>
            </div>
            <h1 class="text-lg font-bold text-foreground font-display mt-0.5">
              {{ isEditMode() ? 'Edit Project Timeline Milestone' : 'Create Project Timeline Milestone' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <a
            routerLink="/projects/timeline-milestones"
            class="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            [variant]="'primary'"
            [loading]="saving()"
            (buttonClick)="saveMilestone()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditMode() ? 'Update Milestone' : 'Save Milestone' }}
          </app-custom-button>
        </div>
      </div>

      <!-- Main Form -->
      <form [formGroup]="form" class="space-y-6">
        <!-- Section 1: Standard Milestone & Identity -->
        <app-card-container
          title="1. Milestone Standard & Project Association"
          subtitle="Map against standard industry milestones 1-15 or configure custom work breakdown stage"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-searchable-select
              label="Select Project"
              [options]="projectOptions()"
              [searchable]="true"
              formControlName="project_id"
              [required]="true"
              (ngModelChange)="onProjectSelected($event)"
            ></app-searchable-select>

            <app-searchable-select
              label="Standard Milestone Template (1-15)"
              [options]="standardMilestoneOptions"
              [searchable]="true"
              formControlName="standard_milestone_ref"
              (ngModelChange)="onStandardMilestoneSelected($event)"
            ></app-searchable-select>

            <app-custom-input
              label="Milestone Code"
              formControlName="milestone_code"
              placeholder="e.g. PRJ-2026-MLS-08"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Sequence Number (1-15)"
              type="number"
              formControlName="milestone_number"
              [required]="true"
            ></app-custom-input>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <app-custom-input
              label="Milestone Full Title / Scope"
              formControlName="milestone_name"
              placeholder="e.g. Foundation and Piling (Cast-in-situ Piles)"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Construction Phase / Category"
              [options]="categoryOptions"
              formControlName="category"
            ></app-searchable-select>
          </div>
        </app-card-container>

        <!-- Section 2: Timeline, Baseline & Actual Dates -->
        <app-card-container
          title="2. Planned, Baseline & Actual Schedule"
          subtitle="Tracks zero-float timeline adherence, schedule variance, and baseline schedule shifts"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Planned Dates -->
            <div class="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-3">
              <span class="text-xs font-bold text-foreground uppercase tracking-wider">Planned Schedule</span>
              <app-custom-input
                label="Planned Start Date"
                type="date"
                formControlName="planned_start_date"
                [required]="true"
              ></app-custom-input>
              <app-custom-input
                label="Planned Finish Date"
                type="date"
                formControlName="planned_finish_date"
                [required]="true"
              ></app-custom-input>
            </div>

            <!-- Baseline Dates -->
            <div class="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-3">
              <span class="text-xs font-bold text-foreground uppercase tracking-wider">Baseline Schedule (Frozen)</span>
              <app-custom-input
                label="Baseline Start Date"
                type="date"
                formControlName="baseline_start_date"
              ></app-custom-input>
              <app-custom-input
                label="Baseline Finish Date"
                type="date"
                formControlName="baseline_finish_date"
              ></app-custom-input>
            </div>

            <!-- Actual Dates -->
            <div class="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-3">
              <span class="text-xs font-bold text-foreground uppercase tracking-wider">Actual Execution</span>
              <app-custom-input
                label="Actual Start Date"
                type="date"
                formControlName="actual_start_date"
              ></app-custom-input>
              <app-custom-input
                label="Actual Completion Date"
                type="date"
                formControlName="actual_finish_date"
              ></app-custom-input>
            </div>
          </div>
        </app-card-container>

        <!-- Section 3: Physical vs Financial Progress & Critical Path -->
        <app-card-container
          title="3. Progress Distinction & Critical Path Modeling"
          subtitle="Strictly separates physical work completed on site from financial budget disbursement"
        >
          <div class="p-3.5 mb-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-500 flex items-start gap-2">
            <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <strong>Rule 2.7 Progress Distinction:</strong> Physical progress tracks verified on-site structural/finishing execution (e.g. 50 cast-in-situ piles poured). Financial progress tracks monetary budget spent (e.g. advance payments to contractors). Spending 70% of budget does not equate to 70% construction progress.
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-custom-input
              label="Physical Construction Progress (%)"
              type="number"
              formControlName="physical_progress_pct"
              placeholder="0 - 100"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Financial Budget Spent (%)"
              type="number"
              formControlName="financial_progress_pct"
              placeholder="0 - 100"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Milestone Weightage (%)"
              type="number"
              formControlName="weightage_percent"
              placeholder="e.g. 12"
            ></app-custom-input>

            <app-searchable-select
              label="Execution Status"
              [options]="statusOptions"
              formControlName="status"
            ></app-searchable-select>
          </div>

          <div class="mt-4 flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20">
            <input
              type="checkbox"
              id="critical_path_cb"
              formControlName="is_critical_path"
              class="w-4 h-4 text-primary rounded border-border focus:ring-primary"
            />
            <label for="critical_path_cb" class="text-xs font-semibold text-foreground cursor-pointer">
              Mark as Critical Path Stage (Zero Float — Any delay here postpones final project handover)
            </label>
          </div>
        </app-card-container>

        <!-- Section 4: Responsibility & Subcontractor Resources -->
        <app-card-container
          title="4. Responsibility & Assigned Resources"
          subtitle="Department, supervising engineer, and assigned contractor details"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-custom-input
              label="Assigned Department"
              formControlName="assigned_department"
              placeholder="e.g. Engineering & Civil Projects"
            ></app-custom-input>

            <app-custom-input
              label="Contractor Name / Consortium"
              formControlName="contractor_name"
              placeholder="e.g. Apex Civil Consortium Ltd."
            ></app-custom-input>

            <app-custom-input
              label="Responsible Person (PIC)"
              formControlName="responsible_person"
              placeholder="e.g. Engr. Ashraful Islam"
            ></app-custom-input>

            <app-custom-input
              label="Supervising Director / Engineer"
              formControlName="supervisor_name"
              placeholder="e.g. Engr. Rezaul Kabir"
            ></app-custom-input>
          </div>
        </app-card-container>

        <!-- Section 5: Delays, Escalations & Recovery Plan -->
        <app-card-container
          title="5. Delay Management, Recovery Plans & Escalation"
          subtitle="Captures variance root-causes, catch-up work schedules, and escalation severity"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <app-custom-input
              label="Delay Variance (Days)"
              type="number"
              formControlName="delay_days"
            ></app-custom-input>

            <app-searchable-select
              label="Escalation Severity Level"
              [options]="escalationOptions"
              formControlName="escalation_level"
            ></app-searchable-select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <app-custom-textarea
              label="Root Cause for Delay"
              formControlName="delay_reason"
              [rows]="2"
              placeholder="Describe material delivery bottlenecks, weather disruptions, or municipal permit holds..."
            ></app-custom-textarea>

            <app-custom-textarea
              label="Corrective Recovery Plan"
              formControlName="recovery_plan"
              [rows]="2"
              placeholder="Specify compensatory night shifts, secondary contractor mobilizations, or accelerated curing..."
            ></app-custom-textarea>
          </div>
        </app-card-container>

        <!-- Section 6: Quality Verification & Evidence -->
        <app-card-container
          title="6. Quality Inspection & Supervisor Verification"
          subtitle="Document proof and QA sign-off before marking milestone as completed"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <app-searchable-select
              label="Supervisor Verification Status"
              [options]="verificationOptions"
              formControlName="supervisor_verification"
            ></app-searchable-select>

            <app-custom-input
              label="Evidence / Inspection Document URL"
              formControlName="evidence_attachment_url"
              placeholder="e.g. https://storage.corp/reports/pile-load-test-01.pdf"
            ></app-custom-input>
          </div>

          <div class="mt-4">
            <app-custom-textarea
              label="General Milestone Notes / Remarks"
              formControlName="remarks"
              [rows]="2"
              placeholder="Log QA inspection references, RA bill tie-ins, and safety compliance items..."
            ></app-custom-textarea>
          </div>
        </app-card-container>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-3 pt-4">
          <a
            routerLink="/projects/timeline-milestones"
            class="px-5 py-2.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            [variant]="'primary'"
            [loading]="saving()"
            (buttonClick)="saveMilestone()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditMode() ? 'Update Milestone' : 'Save Milestone' }}
          </app-custom-button>
        </div>
      </form>
    </div>
  `
})
export class MilestoneFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  milestoneId = signal<number | null>(null);
  saving = signal<boolean>(false);
  projects = signal<Project[]>([]);

  standardMilestoneOptions: SelectOption[] = [
    { value: 'FEASIBILITY_APPROVAL', label: '1. Project Feasibility Approval' },
    { value: 'LAND_ACQUISITION', label: '2. Land Acquisition and Possession' },
    { value: 'ARCHITECTURAL_CONCEPT', label: '3. Architectural Concept Approval' },
    { value: 'AUTHORITY_APPROVAL', label: '4. Authority Submission and Approval' },
    { value: 'DETAILED_ENGINEERING', label: '5. Detailed Engineering Design' },
    { value: 'CONTRACTOR_AWARD', label: '6. Contractor Selection and Contract Award' },
    { value: 'SITE_PREP_EXCAVATION', label: '7. Site Preparation and Excavation' },
    { value: 'FOUNDATION_PILING', label: '8. Foundation and Piling' },
    { value: 'STRUCTURAL_CONSTRUCTION', label: '9. Structural Construction' },
    { value: 'MASONRY_PARTITIONS', label: '10. Masonry and Internal Partitions' },
    { value: 'MEP_INSTALLATIONS', label: '11. Electrical, Plumbing & Mechanical (MEP)' },
    { value: 'PLASTERING_FINISHING', label: '12. Plastering, Flooring & Finishing' },
    { value: 'LIFT_FIRE_UTILITY', label: '13. Lift, Fire-Safety & Utility Installations' },
    { value: 'TESTING_INSPECTIONS', label: '14. Testing, Inspections and Rectification' },
    { value: 'COMPLETION_HANDOVER', label: '15. Completion Documentation & Handover' }
  ];

  categoryOptions: SelectOption[] = [
    { value: 'PRE_CONSTRUCTION', label: 'Pre-Construction & Design' },
    { value: 'REGULATORY', label: 'Regulatory & Approvals' },
    { value: 'PROCUREMENT', label: 'Procurement & Contracting' },
    { value: 'CIVIL_STRUCTURE', label: 'Civil & Structural Works' },
    { value: 'MEP_FINISHING', label: 'MEP & Interior Finishing' },
    { value: 'COMMISSIONING', label: 'Testing & Commissioning' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'DELAYED', label: 'Delayed' }
  ];

  escalationOptions: SelectOption[] = [
    { value: 'NONE', label: 'None (Normal Pace)' },
    { value: 'LOW', label: 'Low (Internal Notice)' },
    { value: 'MEDIUM', label: 'Medium (Department Alert)' },
    { value: 'CRITICAL', label: 'Critical (Board Level Issue)' }
  ];

  verificationOptions: SelectOption[] = [
    { value: 'PENDING', label: 'Pending Verification' },
    { value: 'VERIFIED', label: 'Verified & Signed-off' },
    { value: 'REJECTED', label: 'Rejected / Defect Found' }
  ];

  projectOptions = computed<SelectOption[]>(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }))
  );

  form: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    milestone_code: ['', Validators.required],
    milestone_number: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
    milestone_name: ['', Validators.required],
    standard_milestone_ref: [''],
    category: ['CIVIL_STRUCTURE', Validators.required],
    planned_start_date: ['', Validators.required],
    planned_finish_date: ['', Validators.required],
    baseline_start_date: [''],
    baseline_finish_date: [''],
    actual_start_date: [''],
    actual_finish_date: [''],
    assigned_department: ['Engineering & Civil Projects'],
    contractor_name: [''],
    responsible_person: [''],
    supervisor_name: [''],
    is_critical_path: [false],
    weightage_percent: [0, [Validators.min(0), Validators.max(100)]],
    physical_progress_pct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    financial_progress_pct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    delay_days: [0, Validators.min(0)],
    delay_reason: [''],
    recovery_plan: [''],
    escalation_level: ['NONE'],
    supervisor_verification: ['PENDING'],
    evidence_attachment_url: [''],
    status: ['PENDING', Validators.required],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadProjects();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.milestoneId.set(Number(id));
      this.loadMilestone(Number(id));
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (!this.isEditMode() && data.length > 0 && !this.form.get('project_id')?.value) {
          this.form.patchValue({ project_id: data[0].id });
          this.form.patchValue({ milestone_code: `${data[0].project_code}-MLS-01` });
        }
      }
    });
  }

  onProjectSelected(projectId: any): void {
    const proj = this.projects().find(p => p.id === Number(projectId));
    if (proj && !this.isEditMode()) {
      const num = this.form.get('milestone_number')?.value || 1;
      this.form.patchValue({ milestone_code: `${proj.project_code}-MLS-${String(num).padStart(2, '0')}` });
    }
  }

  onStandardMilestoneSelected(standardRef: any): void {
    const map: Record<string, { num: number; name: string; cat: string; weight: number }> = {
      FEASIBILITY_APPROVAL: { num: 1, name: 'Project Feasibility Approval', cat: 'PRE_CONSTRUCTION', weight: 4.0 },
      LAND_ACQUISITION: { num: 2, name: 'Land Acquisition and Possession', cat: 'PRE_CONSTRUCTION', weight: 8.0 },
      ARCHITECTURAL_CONCEPT: { num: 3, name: 'Architectural Concept Approval', cat: 'PRE_CONSTRUCTION', weight: 5.0 },
      AUTHORITY_APPROVAL: { num: 4, name: 'Authority Submission and Approval', cat: 'REGULATORY', weight: 7.0 },
      DETAILED_ENGINEERING: { num: 5, name: 'Detailed Engineering Design', cat: 'PRE_CONSTRUCTION', weight: 6.0 },
      CONTRACTOR_AWARD: { num: 6, name: 'Contractor Selection and Contract Award', cat: 'PROCUREMENT', weight: 5.0 },
      SITE_PREP_EXCAVATION: { num: 7, name: 'Site Preparation and Excavation', cat: 'CIVIL_STRUCTURE', weight: 6.0 },
      FOUNDATION_PILING: { num: 8, name: 'Foundation and Piling', cat: 'CIVIL_STRUCTURE', weight: 12.0 },
      STRUCTURAL_CONSTRUCTION: { num: 9, name: 'Structural Construction', cat: 'CIVIL_STRUCTURE', weight: 20.0 },
      MASONRY_PARTITIONS: { num: 10, name: 'Masonry and Internal Partitions', cat: 'CIVIL_STRUCTURE', weight: 7.0 },
      MEP_INSTALLATIONS: { num: 11, name: 'Electrical, Plumbing & Mechanical (MEP)', cat: 'MEP_FINISHING', weight: 8.0 },
      PLASTERING_FINISHING: { num: 12, name: 'Plastering, Flooring & Finishing', cat: 'MEP_FINISHING', weight: 7.0 },
      LIFT_FIRE_UTILITY: { num: 13, name: 'Lift, Fire-Safety & Utility Installations', cat: 'MEP_FINISHING', weight: 5.0 },
      TESTING_INSPECTIONS: { num: 14, name: 'Testing, Inspections and Rectification', cat: 'COMMISSIONING', weight: 4.0 },
      COMPLETION_HANDOVER: { num: 15, name: 'Completion Documentation & Handover', cat: 'COMMISSIONING', weight: 2.0 },
    };

    const found = map[standardRef];
    if (found) {
      this.form.patchValue({
        milestone_number: found.num,
        milestone_name: found.name,
        category: found.cat,
        weightage_percent: found.weight
      });

      const pId = this.form.get('project_id')?.value;
      const proj = this.projects().find(p => p.id === Number(pId));
      if (proj) {
        this.form.patchValue({
          milestone_code: `${proj.project_code}-MLS-${String(found.num).padStart(2, '0')}`
        });
      }
    }
  }

  loadMilestone(id: number): void {
    this.projectService.getMilestoneById(id).subscribe({
      next: (m: ProjectMilestone) => {
        this.form.patchValue({
          project_id: m.project_id,
          milestone_code: m.milestone_code,
          milestone_number: m.milestone_number,
          milestone_name: m.milestone_name,
          standard_milestone_ref: m.standard_milestone_ref || '',
          category: m.category,
          planned_start_date: m.planned_start_date ? m.planned_start_date.substring(0, 10) : '',
          planned_finish_date: m.planned_finish_date ? m.planned_finish_date.substring(0, 10) : '',
          baseline_start_date: m.baseline_start_date ? m.baseline_start_date.substring(0, 10) : '',
          baseline_finish_date: m.baseline_finish_date ? m.baseline_finish_date.substring(0, 10) : '',
          actual_start_date: m.actual_start_date ? m.actual_start_date.substring(0, 10) : '',
          actual_finish_date: m.actual_finish_date ? m.actual_finish_date.substring(0, 10) : '',
          assigned_department: m.assigned_department,
          contractor_name: m.contractor_name,
          responsible_person: m.responsible_person,
          supervisor_name: m.supervisor_name,
          is_critical_path: m.is_critical_path,
          weightage_percent: m.weightage_percent,
          physical_progress_pct: m.physical_progress_pct,
          financial_progress_pct: m.financial_progress_pct,
          delay_days: m.delay_days,
          delay_reason: m.delay_reason,
          recovery_plan: m.recovery_plan,
          escalation_level: m.escalation_level,
          supervisor_verification: m.supervisor_verification,
          evidence_attachment_url: m.evidence_attachment_url,
          status: m.status,
          remarks: m.remarks
        });
      }
    });
  }

  saveMilestone(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = { ...this.form.value };
    payload.project_id = Number(payload.project_id);
    payload.milestone_number = Number(payload.milestone_number);
    payload.weightage_percent = Number(payload.weightage_percent || 0);
    payload.physical_progress_pct = Number(payload.physical_progress_pct || 0);
    payload.financial_progress_pct = Number(payload.financial_progress_pct || 0);
    payload.delay_days = Number(payload.delay_days || 0);

    if (this.isEditMode() && this.milestoneId()) {
      this.projectService.updateMilestone(this.milestoneId()!, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects/timeline-milestones']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err.error?.detail || 'Failed to update milestone.');
        }
      });
    } else {
      this.projectService.createMilestone(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects/timeline-milestones']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err.error?.detail || 'Failed to create milestone.');
        }
      });
    }
  }
}
