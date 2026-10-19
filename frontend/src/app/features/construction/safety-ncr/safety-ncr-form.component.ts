import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Subcontractor, SafetyNCR } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-safety-ncr-form',
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
    <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      <!-- Unified Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/safety-ncr"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Defect Register"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                [ngClass]="ncrForm.get('affects_safety_or_structural')?.value ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'">
                {{ ncrForm.get('affects_safety_or_structural')?.value ? 'Critical Safety / Structural Hazard' : 'Quality Defect & NCR' }}
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'NCR #' + existingNCR()?.ncr_number : 'New Defect Incident' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Defect Lifecycle: ' + (existingNCR()?.defect_title || existingNCR()?.ncr_number) : 'Log Defect & Non-Conformance Report (NCR)' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/safety-ncr"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-xl border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="ncrForm.invalid || isSaving()"
            (clicked)="saveForm()"
          >
            <span class="flex items-center gap-2">
              <i class="ri-save-line" *ngIf="!isSaving()"></i>
              <i class="ri-loader-4-line animate-spin" *ngIf="isSaving()"></i>
              {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Update Defect & CAPA' : 'Issue Defect Notice') }}
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Critical Escalation Warning Alert -->
      <div
        *ngIf="ncrForm.get('affects_safety_or_structural')?.value"
        class="p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div class="flex items-start gap-2.5">
          <i class="ri-alarm-warning-fill text-xl text-red-600 flex-shrink-0 mt-0.5"></i>
          <div>
            <strong class="font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
              Structural Integrity / Life-Safety Escalation Active
            </strong>
            <p class="mt-0.5">
              This defect compromises structural load capacity or safety. Escalation notice will notify Chief Structural Engineer and Project Director.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2" *ngIf="isEditMode() && ncrId()">
          <button
            type="button"
            (click)="escalateToDirector()"
            class="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
          >
            <i class="ri-send-plane-fill"></i> Escalate to Project Director
          </button>
        </div>
      </div>

      <!-- 5-Stage Lifecycle Navigation Indicators -->
      <div class="p-4 rounded-2xl bg-secondary/30 border border-border">
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div class="p-2.5 rounded-xl border bg-card text-center"
            [ngClass]="activeStage() === 'IDENTIFIED' ? 'border-primary ring-1 ring-primary' : 'border-border'">
            <div class="font-mono text-[10px] text-muted-foreground uppercase">Stage 1</div>
            <div class="font-semibold text-foreground mt-0.5">Defect Identified</div>
          </div>
          <div class="p-2.5 rounded-xl border bg-card text-center"
            [ngClass]="activeStage() === 'ASSIGNED' ? 'border-primary ring-1 ring-primary' : 'border-border'">
            <div class="font-mono text-[10px] text-muted-foreground uppercase">Stage 2</div>
            <div class="font-semibold text-foreground mt-0.5">Assigned to Contractor</div>
          </div>
          <div class="p-2.5 rounded-xl border bg-card text-center"
            [ngClass]="activeStage() === 'RECTIFIED' ? 'border-primary ring-1 ring-primary' : 'border-border'">
            <div class="font-mono text-[10px] text-muted-foreground uppercase">Stage 3</div>
            <div class="font-semibold text-foreground mt-0.5">CAPA Rectification</div>
          </div>
          <div class="p-2.5 rounded-xl border bg-card text-center"
            [ngClass]="activeStage() === 'REINSPECTED' ? 'border-primary ring-1 ring-primary' : 'border-border'">
            <div class="font-mono text-[10px] text-muted-foreground uppercase">Stage 4</div>
            <div class="font-semibold text-foreground mt-0.5">Engineer Reinspection</div>
          </div>
          <div class="p-2.5 rounded-xl border bg-card text-center"
            [ngClass]="activeStage() === 'CLOSED' ? 'border-primary ring-1 ring-primary' : 'border-border'">
            <div class="font-mono text-[10px] text-muted-foreground uppercase">Stage 5</div>
            <div class="font-semibold text-foreground mt-0.5">Closure Approval</div>
          </div>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Defect Parameters & Corrective Action (CAPA)"
        subtitle="Record non-conformance observation, responsible trade, corrective and preventive action (CAPA), and closure approval"
      >
        <form [formGroup]="ncrForm" class="flex flex-col gap-6">
          <!-- Row 1: Identification & Project -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-custom-input
              label="Defect Headline / Title *"
              placeholder="e.g. Major Honeycombing at Column C4 Base"
              formControlName="defect_title"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Select Construction Project *"
              [options]="projectOptions"
              formControlName="project_id"
              [allowCreateNew]="false"
              placeholder="Select project..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Assigned Trade Subcontractor"
              [options]="contractorOptions"
              formControlName="assigned_contractor_id"
              [allowCreateNew]="false"
              placeholder="Select responsible contractor..."
            ></app-searchable-select>
          </div>

          <!-- Row 2: Category, Severity & Safety Flag -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Defect Category *"
              categoryCode="DEFECT_CATEGORY"
              formControlName="category"
              [allowCreateNew]="true"
              placeholder="Select category..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Severity Rating *"
              categoryCode="DEFECT_SEVERITY"
              formControlName="severity"
              [allowCreateNew]="true"
              placeholder="Select severity..."
              [required]="true"
            ></app-searchable-select>

            <app-custom-input
              label="Target Closure Deadline *"
              type="date"
              formControlName="rectification_deadline"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Safety/Structural Toggle & Location -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-3.5 rounded-xl bg-secondary/30 border border-border flex items-center gap-3">
              <input
                type="checkbox"
                id="structuralHazardCheck"
                formControlName="affects_safety_or_structural"
                class="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-border"
              />
              <div>
                <label for="structuralHazardCheck" class="text-xs font-bold text-foreground cursor-pointer">
                  Affects Safety or Structural Integrity
                </label>
                <p class="text-[11px] text-muted-foreground">
                  Triggers safety stop-work and engineering escalation
                </p>
              </div>
            </div>

            <app-custom-input
              label="Specific Location / Floor & Grid *"
              placeholder="e.g. Tower B - Floor 04, Grid D-4"
              formControlName="location_details"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Evidence Photo URL"
              placeholder="https://.../defect_evidence.jpg"
              formControlName="photo_url"
            ></app-custom-input>
          </div>

          <!-- Description -->
          <app-custom-textarea
            label="Detailed Defect Observation & Non-Conformance Description *"
            placeholder="Describe the nature of the defect, physical measurements (depth, width, exposure), and technical specifications breached..."
            formControlName="description"
            [rows]="3"
          ></app-custom-textarea>

          <!-- Stage 3: Corrective & Preventive Action (CAPA) -->
          <div class="p-5 rounded-2xl bg-secondary/30 border border-border flex flex-col gap-4">
            <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Stage 3 & 4: Corrective and Preventive Action (CAPA) & Verification
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-textarea
                label="Corrective Action Taken (Physical Rectification)"
                placeholder="e.g. Chipped loose concrete, applied bonding agent, pressure grouted with approved non-shrink repair mortar..."
                formControlName="corrective_action"
                [rows]="3"
              ></app-custom-textarea>

              <app-custom-textarea
                label="Preventive Action (To Prevent Recurrence)"
                placeholder="e.g. Enhanced formwork vibration duration checklist, trained vibrator operators on pour lifts..."
                formControlName="preventive_action"
                [rows]="3"
              ></app-custom-textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-input
                label="Rectification Evidence Photo URL"
                placeholder="https://.../rectified_photo.jpg"
                formControlName="rectification_photo_url"
              ></app-custom-input>

              <app-custom-input
                label="CAPA Submitted By"
                placeholder="e.g. Subcontractor QA Manager"
                formControlName="capa_submitted_by_name"
              ></app-custom-input>
            </div>
          </div>

          <!-- Stage 4 & 5: Reinspection & Closure Approval -->
          <div class="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col gap-4">
            <h3 class="text-xs font-semibold text-primary uppercase tracking-wider">
              Stage 5: Engineer Reinspection & Closure Approval
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-searchable-select
                label="Defect Lifecycle Status *"
                [options]="statusOptions"
                formControlName="status"
                [allowCreateNew]="false"
                placeholder="Select status..."
                [required]="true"
              ></app-searchable-select>

              <app-custom-input
                label="Reinspected By Engineer Name"
                placeholder="e.g. Engr. Tanvir Ahmed"
                formControlName="reinspected_by_name"
              ></app-custom-input>

              <app-searchable-select
                label="Reinspection Verdict"
                [options]="reinspectionVerdictOptions"
                formControlName="reinspection_verdict"
                [allowCreateNew]="false"
                placeholder="Select verdict..."
              ></app-searchable-select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-input
                label="Closure Approved By (Project Manager)"
                placeholder="e.g. Project Director / PM"
                formControlName="closure_approved_by_name"
              ></app-custom-input>

              <app-custom-input
                label="Closure Approval Remarks"
                placeholder="Satisfactory completion confirmed on site"
                formControlName="closure_approval_remarks"
              ></app-custom-input>
            </div>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class SafetyNcrFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  isEditMode = signal<boolean>(false);
  ncrId = signal<number | null>(null);
  existingNCR = signal<SafetyNCR | null>(null);
  isSaving = signal<boolean>(false);
  activeStage = signal<'IDENTIFIED' | 'ASSIGNED' | 'RECTIFIED' | 'REINSPECTED' | 'CLOSED'>('IDENTIFIED');

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  statusOptions = [
    { value: 'Open', label: '1. Open / Defect Identified' },
    { value: 'Assigned', label: '2. Assigned to Contractor for Correction' },
    { value: 'Rectified', label: '3. Rectification & CAPA Submitted' },
    { value: 'Under_Reinspection', label: '4. Under Engineer Reinspection' },
    { value: 'Verified_Closed', label: '5. Verified & Closure Approved' }
  ];

  reinspectionVerdictOptions = [
    { value: 'PASSED', label: 'PASSED - Satisfactory Correction' },
    { value: 'FAILED', label: 'FAILED - Requires Re-work' },
    { value: 'CONDITIONAL', label: 'CONDITIONAL - Minor Punchlist' }
  ];

  ncrForm: FormGroup = this.fb.group({
    defect_title: ['', Validators.required],
    project_id: [null, Validators.required],
    assigned_contractor_id: [null],
    category: ['Structural Defect', Validators.required],
    severity: ['Medium', Validators.required],
    affects_safety_or_structural: [false],
    rectification_deadline: [new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], Validators.required],
    location_details: ['', Validators.required],
    photo_url: [''],
    description: ['', Validators.required],
    corrective_action: [''],
    preventive_action: [''],
    rectification_photo_url: [''],
    capa_submitted_by_name: [''],
    reinspected_by_name: [''],
    reinspection_verdict: ['PASSED'],
    status: ['Open', Validators.required],
    closure_approved_by_name: [''],
    closure_approval_remarks: ['']
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadContractors();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.isEditMode.set(true);
        this.ncrId.set(id);
        this.loadNCR(id);
      }
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projectOptions = projs.map(p => ({
          value: p.id,
          label: `${p.project_name}`
        }));
        if (projs.length && !this.ncrForm.get('project_id')?.value) {
          this.ncrForm.patchValue({ project_id: projs[0].id });
        }
      }
    });
  }

  loadContractors(): void {
    this.constructionService.getContractors().subscribe({
      next: (conts) => {
        this.contractorOptions = [
          { value: null, label: 'Unassigned / General Site Team' },
          ...conts.map(c => ({
            value: c.id,
            label: `${c.company_name} (${c.contractor_code})`
          }))
        ];
      }
    });
  }

  loadNCR(id: number): void {
    this.constructionService.getSafetyNCRById(id).subscribe({
      next: (n) => {
        this.existingNCR.set(n);
        this.ncrForm.patchValue({
          defect_title: n.defect_title || n.category,
          project_id: n.project_id,
          assigned_contractor_id: n.assigned_contractor_id,
          category: n.category,
          severity: n.severity,
          affects_safety_or_structural: Boolean(n.affects_safety_or_structural),
          rectification_deadline: n.rectification_deadline,
          location_details: n.location_details || '',
          photo_url: n.photo_url || '',
          description: n.description || '',
          corrective_action: n.corrective_action || '',
          preventive_action: n.preventive_action || '',
          rectification_photo_url: n.rectification_photo_url || '',
          capa_submitted_by_name: n.capa_submitted_by_name || '',
          reinspected_by_name: n.reinspected_by_name || '',
          reinspection_verdict: n.reinspection_verdict || 'PASSED',
          status: n.status,
          closure_approved_by_name: n.closure_approved_by_name || '',
          closure_approval_remarks: n.closure_approval_remarks || ''
        });

        if (n.status === 'Verified_Closed') {
          this.activeStage.set('CLOSED');
        } else if (n.status === 'Under_Reinspection') {
          this.activeStage.set('REINSPECTED');
        } else if (n.status === 'Rectified') {
          this.activeStage.set('RECTIFIED');
        } else if (n.status === 'Assigned') {
          this.activeStage.set('ASSIGNED');
        } else {
          this.activeStage.set('IDENTIFIED');
        }
      }
    });
  }

  escalateToDirector(): void {
    if (!this.ncrId()) return;
    const confirmEscalation = confirm('Are you sure you want to escalate this critical defect directly to the Project Director and Chief Structural Engineer?');
    if (confirmEscalation) {
      this.constructionService.escalateDefect(this.ncrId()!, {
        escalation_level: 'PROJECT_DIRECTOR',
        escalated_to_name: 'Engr. M. A. Karim (Project Director)'
      }).subscribe({
        next: () => {
          alert('Defect escalated successfully to Project Director and logged in audit register.');
          this.loadNCR(this.ncrId()!);
        }
      });
    }
  }

  saveForm(): void {
    if (this.ncrForm.invalid) {
      this.ncrForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const f = this.ncrForm.value;

    if (this.isEditMode() && this.ncrId()) {
      // If submitting CAPA
      if (f.corrective_action && f.status === 'Rectified') {
        this.constructionService.submitDefectCapa(this.ncrId()!, {
          corrective_action: f.corrective_action,
          preventive_action: f.preventive_action || '',
          capa_submitted_by_name: f.capa_submitted_by_name || 'Subcontractor Rep',
          rectification_photo_url: f.rectification_photo_url || ''
        }).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.router.navigate(['/construction/safety-ncr'], { queryParams: { tab: 'DEFECTS' } });
          },
          error: () => this.isSaving.set(false)
        });
      } else if (f.status === 'Verified_Closed') {
        this.constructionService.approveDefectClosure(this.ncrId()!, {
          closure_approved_by_name: f.closure_approved_by_name || 'Project Manager',
          closure_approval_remarks: f.closure_approval_remarks || 'Cleared'
        }).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.router.navigate(['/construction/safety-ncr'], { queryParams: { tab: 'DEFECTS' } });
          },
          error: () => this.isSaving.set(false)
        });
      } else {
        // General update
        this.constructionService.rectifySafetyNCR(this.ncrId()!, {
          rectification_notes: f.corrective_action || f.description,
          rectification_photo_url: f.rectification_photo_url || ''
        }).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.router.navigate(['/construction/safety-ncr'], { queryParams: { tab: 'DEFECTS' } });
          },
          error: () => this.isSaving.set(false)
        });
      }
    } else {
      const payload = {
        project_id: Number(f.project_id),
        defect_title: f.defect_title,
        assigned_contractor_id: f.assigned_contractor_id ? Number(f.assigned_contractor_id) : null,
        category: f.category,
        severity: f.severity,
        affects_safety_or_structural: Boolean(f.affects_safety_or_structural),
        rectification_deadline: f.rectification_deadline,
        location_details: f.location_details,
        photo_url: f.photo_url || '',
        description: f.description
      };

      this.constructionService.createSafetyNCR(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/safety-ncr'], { queryParams: { tab: 'DEFECTS' } });
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
