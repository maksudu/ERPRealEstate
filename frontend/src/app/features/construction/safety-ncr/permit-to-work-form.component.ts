import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Subcontractor, PermitToWork } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-permit-to-work-form',
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
            title="Back to HSE Dashboard"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                [ngClass]="ptwForm.get('permit_status')?.value === 'APPROVED_ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'">
                {{ ptwForm.get('permit_status')?.value || 'REQUESTED' }}
              </span>
              <span class="text-xs font-mono text-muted-foreground">
                {{ isEditMode() ? 'Permit #' + existingPtw()?.permit_number : 'New PTW Request' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Permit to Work: ' + existingPtw()?.permit_number : 'Issue Permit to Work (PTW) for Controlled Activity' }}
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
            [disabled]="ptwForm.invalid || isSaving()"
            (clicked)="saveForm()"
          >
            <i class="ri-shield-check-line mr-1"></i>
            {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Update Permit' : 'Issue Permit Request') }}
          </app-custom-button>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Permit Identification & High-Risk Activity Scope"
        subtitle="Specify hazardous work boundary, schedule duration, and required precautions"
      >
        <form [formGroup]="ptwForm" class="flex flex-col gap-6">
          <!-- Row 1: Number, Project, Contractor -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-custom-input
              label="Permit Number *"
              placeholder="e.g. PTW-2026-001"
              formControlName="permit_number"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Project *"
              [options]="projectOptions"
              formControlName="project_id"
              [allowCreateNew]="false"
              placeholder="Select project..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Assigned Contractor"
              [options]="contractorOptions"
              formControlName="contractor_id"
              [allowCreateNew]="false"
              placeholder="Select contractor..."
            ></app-searchable-select>
          </div>

          <!-- Row 2: Permit Type, Location, Supervisor -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Controlled Activity Type *"
              categoryCode="PERMIT_TO_WORK_TYPE"
              formControlName="permit_type"
              [allowCreateNew]="true"
              placeholder="Select PTW type..."
              [required]="true"
            ></app-searchable-select>

            <app-custom-input
              label="Exact Work Location *"
              placeholder="e.g. Tower A Basement-2 Pump Room"
              formControlName="work_location"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Requested By Supervisor *"
              placeholder="e.g. Engr. Shafiqul Alam (Site Engr)"
              formControlName="requested_by_supervisor_name"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Row 3: Timestamps -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-input
              label="Permit Valid From *"
              type="datetime-local"
              formControlName="valid_from_time"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Permit Valid To *"
              type="datetime-local"
              formControlName="valid_to_time"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Controlled Activity Scope -->
          <app-custom-textarea
            label="Scope of Controlled Hazardous Activity *"
            placeholder="Specify hot work welding, oxygen cylinder storage, height above 2 meters, excavation shoring, or electrical lockout/tagout..."
            formControlName="scope_of_controlled_activity"
            [rows]="3"
            [required]="true"
          ></app-custom-textarea>

          <!-- Hazard Controls & Precaution Checklist -->
          <div class="p-4 rounded-2xl bg-secondary/30 border border-border flex flex-col gap-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <i class="ri-checkbox-multiple-line text-primary"></i> Pre-Job Hazard Controls & PPE Verification
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label class="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card cursor-pointer">
                <input type="checkbox" [(ngModel)]="hazardControls.fire_extinguisher_ready" [ngModelOptions]="{standalone: true}" class="rounded text-primary" />
                <span>Fire Extinguisher & Fire Watch Posted</span>
              </label>

              <label class="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card cursor-pointer">
                <input type="checkbox" [(ngModel)]="hazardControls.safety_harness_anchored" [ngModelOptions]="{standalone: true}" class="rounded text-primary" />
                <span>Full-Body Harness & Lifeline Anchored</span>
              </label>

              <label class="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card cursor-pointer">
                <input type="checkbox" [(ngModel)]="hazardControls.gas_detection_tested" [ngModelOptions]="{standalone: true}" class="rounded text-primary" />
                <span>Atmospheric Gas Test Cleared (O2/CO)</span>
              </label>

              <label class="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card cursor-pointer">
                <input type="checkbox" [(ngModel)]="hazardControls.loto_electrical_isolated" [ngModelOptions]="{standalone: true}" class="rounded text-primary" />
                <span>Lockout / Tagout (LOTO) Verified</span>
              </label>

              <label class="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card cursor-pointer">
                <input type="checkbox" [(ngModel)]="hazardControls.barricades_warning_signs" [ngModelOptions]="{standalone: true}" class="rounded text-primary" />
                <span>Safety Barricades & Signage Installed</span>
              </label>

              <label class="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card cursor-pointer">
                <input type="checkbox" [(ngModel)]="hazardControls.certified_operators_only" [ngModelOptions]="{standalone: true}" class="rounded text-primary" />
                <span>Competent & Certified Workmen Only</span>
              </label>
            </div>
          </div>

          <!-- Dual Sign-off & Verification Section -->
          <div class="p-4 rounded-2xl bg-secondary/20 border border-border flex flex-col gap-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Safety Clearance & Management Sign-Off</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-3.5 rounded-xl border border-border bg-card flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-foreground">Safety Officer Verification</span>
                  <input type="checkbox" formControlName="safety_officer_verified" class="w-4 h-4 rounded text-primary" />
                </div>
                <app-custom-input
                  label="Safety Officer Name"
                  placeholder="e.g. Md. Tariqul Islam (HSE Officer)"
                  formControlName="safety_officer_name"
                ></app-custom-input>
              </div>

              <div class="p-3.5 rounded-xl border border-border bg-card flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-foreground">Project Manager Approval</span>
                  <input type="checkbox" formControlName="project_manager_approved" class="w-4 h-4 rounded text-primary" />
                </div>
                <app-custom-input
                  label="Approved By (PM Name)"
                  placeholder="e.g. Engr. Tanvir Ahmed (Project Manager)"
                  formControlName="approved_by_name"
                ></app-custom-input>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-searchable-select
                label="Permit Lifecycle Status"
                categoryCode="PTW_STATUS"
                formControlName="permit_status"
                [allowCreateNew]="true"
                placeholder="Select status..."
              ></app-searchable-select>

              <app-custom-input
                label="Closeout Inspection Notes"
                placeholder="e.g. Activity completed, area cleaned, hot work cool-down verified"
                formControlName="closure_inspection_notes"
              ></app-custom-input>
            </div>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class PermitToWorkFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal<boolean>(false);
  ptwId = signal<number | null>(null);
  existingPtw = signal<PermitToWork | null>(null);
  isSaving = signal<boolean>(false);

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  hazardControls: any = {
    fire_extinguisher_ready: true,
    safety_harness_anchored: false,
    gas_detection_tested: false,
    loto_electrical_isolated: false,
    barricades_warning_signs: true,
    certified_operators_only: true
  };

  ptwForm: FormGroup = this.fb.group({
    permit_number: ['', Validators.required],
    project_id: [null, Validators.required],
    contractor_id: [null],
    permit_type: ['HOT_WORK', Validators.required],
    work_location: ['', Validators.required],
    scope_of_controlled_activity: ['', Validators.required],
    valid_from_time: [new Date().toISOString().substring(0, 16), Validators.required],
    valid_to_time: [new Date(Date.now() + 8 * 3600 * 1000).toISOString().substring(0, 16), Validators.required],
    requested_by_supervisor_name: ['', Validators.required],
    safety_officer_name: [''],
    safety_officer_verified: [false],
    project_manager_approved: [false],
    approved_by_name: [''],
    permit_status: ['REQUESTED'],
    closure_inspection_notes: ['']
  });

  ngOnInit(): void {
    this.loadDropdowns();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.ptwId.set(Number(id));
      this.isEditMode.set(true);
      this.loadPtw(Number(id));
    } else {
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.ptwForm.patchValue({
        permit_number: `PTW-2026-${rand}`
      });
    }
  }

  loadDropdowns(): void {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res.data || [];
        this.projectOptions = list.map((p: Project) => ({
          value: p.id,
          label: p.project_name
        }));
      }
    });

    this.constructionService.getContractorsPaged({ limit: 100 }).subscribe({
      next: (res: any) => {
        this.contractorOptions = (res.items || []).map((c: Subcontractor) => ({
          value: c.id,
          label: c.company_name || c.contractor_code
        }));
      }
    });
  }

  loadPtw(id: number): void {
    this.constructionService.getPermitToWorkById(id).subscribe({
      next: (ptw) => {
        this.existingPtw.set(ptw);
        if (ptw.hazard_controls_in_place) {
          this.hazardControls = { ...this.hazardControls, ...ptw.hazard_controls_in_place };
        }
        this.ptwForm.patchValue({
          permit_number: ptw.permit_number,
          project_id: ptw.project_id,
          contractor_id: ptw.contractor_id,
          permit_type: ptw.permit_type,
          work_location: ptw.work_location,
          scope_of_controlled_activity: ptw.scope_of_controlled_activity,
          valid_from_time: ptw.valid_from_time?.substring(0, 16),
          valid_to_time: ptw.valid_to_time?.substring(0, 16),
          requested_by_supervisor_name: ptw.requested_by_supervisor_name,
          safety_officer_name: ptw.safety_officer_name,
          safety_officer_verified: ptw.safety_officer_verified,
          project_manager_approved: ptw.project_manager_approved,
          approved_by_name: ptw.approved_by_name,
          permit_status: ptw.permit_status,
          closure_inspection_notes: ptw.closure_inspection_notes
        });
      }
    });
  }

  saveForm(): void {
    if (this.ptwForm.invalid) return;
    this.isSaving.set(true);
    const formVal = {
      ...this.ptwForm.getRawValue(),
      hazard_controls_in_place: this.hazardControls
    };

    if (this.isEditMode() && this.ptwId()) {
      this.constructionService.approvePermitToWork(this.ptwId()!, formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/safety-ncr']);
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.constructionService.createPermitToWork(formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/safety-ncr']);
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
