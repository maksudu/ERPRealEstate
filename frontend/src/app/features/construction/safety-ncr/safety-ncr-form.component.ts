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
    <div class="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      <!-- Unified Top Header with Navigation -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/safety-ncr"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Safety NCR Register"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                QA Non-Conformance & Safety
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isRectifyMode() ? 'NCR #' + existingNCR()?.ncr_number : 'Issue New Report' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isRectifyMode() ? 'Submit Contractor Rectification / Close NCR' : 'Issue Safety / QA Non-Conformance Report (NCR)' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/safety-ncr"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="isRectifyMode() ? rectifyForm.invalid || isSaving() : createForm.invalid || isSaving()"
            (clicked)="saveForm()"
          >
            <span class="flex items-center gap-2">
              @if (isSaving()) {
                Saving...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                {{ isRectifyMode() ? 'Submit Rectification Work' : 'Issue NCR Notice' }}
              }
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Mode 1: Issue New NCR Notice -->
      @if (!isRectifyMode()) {
        <app-card-container
          title="Incident Classification & Violation Details"
          subtitle="Document project, location, category, severity rating, and contractor rectification deadline"
        >
          <form [formGroup]="createForm" class="flex flex-col gap-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-searchable-select
                label="Select Construction Project *"
                [options]="projectOptions"
                formControlName="project_id"
                [allowCreateNew]="false"
                placeholder="Select project..."
              >
              </app-searchable-select>

              <app-searchable-select
                label="Assigned Trade Contractor (Optional)"
                [options]="contractorOptions"
                formControlName="assigned_contractor_id"
                [allowCreateNew]="false"
                placeholder="Select responsible contractor..."
              >
              </app-searchable-select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-searchable-select
                label="Violation Category *"
                [options]="categoryOptions"
                formControlName="category"
                [allowCreateNew]="true"
                categoryCode="SAFETY_CATEGORY"
                placeholder="Select category..."
              >
              </app-searchable-select>

              <app-searchable-select
                label="Risk Severity Level *"
                [options]="severityOptions"
                formControlName="severity"
                [allowCreateNew]="false"
                placeholder="Select severity..."
              >
              </app-searchable-select>

              <app-custom-input
                label="Rectification Deadline *"
                type="date"
                formControlName="rectification_deadline"
              >
              </app-custom-input>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-input
                label="Specific Floor / Unit Location *"
                placeholder="e.g. Tower 2 - 8th Floor Staircase Void"
                formControlName="location_details"
              >
              </app-custom-input>

              <app-custom-input
                label="Violation Evidence Photo (URL)"
                placeholder="https://cdn.erp.com/safety/ncr-01.jpg"
                formControlName="photo_url"
              >
              </app-custom-input>
            </div>

            <app-custom-textarea
              label="Detailed Non-Conformance & Safety Hazard Description *"
              placeholder="State the observed non-conformance (e.g. Unprotected slab perimeter edge without guardrails, honeycombed concrete in column C2, missing PPE...)"
              formControlName="description"
              [rows]="3"
            >
            </app-custom-textarea>

            <div class="pt-6 border-t border-border flex items-center justify-end gap-3">
              <a
                routerLink="/construction/safety-ncr"
                class="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
              >
                Cancel
              </a>
              <app-custom-button
                variant="primary"
                [disabled]="createForm.invalid || isSaving()"
                (clicked)="saveForm()"
              >
                <span>Issue NCR Notice</span>
              </app-custom-button>
            </div>
          </form>
        </app-card-container>
      }

      <!-- Mode 2: Rectify / QA Verification Review -->
      @if (isRectifyMode()) {
        <app-card-container
          title="Contractor Rectification & Corrective Action Report"
          subtitle="Submit photographic evidence and physical corrective actions taken to resolve safety violation"
        >
          <form [formGroup]="rectifyForm" class="flex flex-col gap-6">
            <div class="p-4 rounded-xl border border-border bg-secondary/30 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-foreground">NCR #{{ existingNCR()?.ncr_number }}</span>
                <span class="px-2 py-0.5 rounded font-bold uppercase text-[10px]"
                  [ngClass]="existingNCR()?.severity === 'High' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'">
                  {{ existingNCR()?.severity }} Severity
                </span>
              </div>
              <p class="text-muted-foreground">{{ existingNCR()?.description }}</p>
              <div class="text-[11px] text-muted-foreground">Location: <strong class="text-foreground">{{ existingNCR()?.location_details }}</strong></div>
            </div>

            <app-custom-input
              label="Rectification Photo URL (Proof of Resolution)"
              placeholder="https://cdn.erp.com/safety/rectified-01.jpg"
              formControlName="rectification_photo_url"
            >
            </app-custom-input>

            <app-custom-textarea
              label="Corrective Action Taken & Prevention Notes *"
              placeholder="Explain how the issue was rectified (e.g. Installed double guardrails and toe boards, re-poured non-shrink grout, conducted safety briefing...)"
              formControlName="rectification_notes"
              [rows]="3"
            >
            </app-custom-textarea>

            <div class="pt-6 border-t border-border flex items-center justify-end gap-3">
              <a
                routerLink="/construction/safety-ncr"
                class="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
              >
                Cancel
              </a>
              <app-custom-button
                variant="primary"
                [disabled]="rectifyForm.invalid || isSaving()"
                (clicked)="saveForm()"
              >
                <span>Submit Rectification Work</span>
              </app-custom-button>
            </div>
          </form>
        </app-card-container>
      }
    </div>
  `
})
export class SafetyNcrFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  isRectifyMode = signal<boolean>(false);
  ncrId = signal<number | null>(null);
  existingNCR = signal<SafetyNCR | null>(null);
  isSaving = signal<boolean>(false);

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  categoryOptions = [
    { value: 'Structural Defect', label: 'Structural Defect (Honeycombing, Dimension, Rebar Spacing)' },
    { value: 'PPE Violation', label: 'PPE Non-Compliance (No Helmet, Harness, Safety Boots)' },
    { value: 'Housekeeping', label: 'Site Housekeeping & Debris Obstruction' },
    { value: 'Fall Protection', label: 'Fall Hazard (Edge Protection, Missing Handrails)' },
    { value: 'Scaffolding Safety', label: 'Scaffolding & Shuttering Structural Instability' },
    { value: 'Electrical Hazard', label: 'Electrical Wiring Hazard / Exposed Cables' },
    { value: 'Environmental Violation', label: 'Environmental / Drainage Contamination' }
  ];

  severityOptions = [
    { value: 'Low', label: 'Low Severity (Observation)' },
    { value: 'Medium', label: 'Medium Severity (Warning Notice)' },
    { value: 'High', label: 'High Severity (Work Stoppage / Immediate Hazard)' }
  ];

  createForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    assigned_contractor_id: [null],
    category: ['Structural Defect', Validators.required],
    severity: ['Medium', Validators.required],
    rectification_deadline: [new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], Validators.required],
    location_details: ['', Validators.required],
    photo_url: [''],
    description: ['', Validators.required]
  });

  rectifyForm: FormGroup = this.fb.group({
    rectification_photo_url: [''],
    rectification_notes: ['', Validators.required]
  });

  ngOnInit(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projectOptions = projs.map(p => ({
          value: p.id,
          label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
        }));
      }
    });

    this.constructionService.getContractors().subscribe({
      next: (conts) => {
        this.contractorOptions = [
          { value: null, label: 'Unassigned / General Site' },
          ...conts.map(c => ({
            value: c.id,
            label: `${c.company_name} (${c.contractor_code})`
          }))
        ];
      }
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.isRectifyMode.set(true);
        this.ncrId.set(id);
        this.loadNCR(id);
      }
    }
  }

  loadNCR(id: number): void {
    this.constructionService.getSafetyNCRById(id).subscribe({
      next: (n) => {
        this.existingNCR.set(n);
        this.rectifyForm.patchValue({
          rectification_photo_url: n.rectification_photo_url || '',
          rectification_notes: n.rectification_notes || ''
        });
      }
    });
  }

  saveForm(): void {
    this.isSaving.set(true);

    if (this.isRectifyMode() && this.ncrId()) {
      if (this.rectifyForm.invalid) {
        this.rectifyForm.markAllAsTouched();
        this.isSaving.set(false);
        return;
      }

      const formVal = this.rectifyForm.value;
      this.constructionService.rectifySafetyNCR(this.ncrId()!, {
        rectification_notes: formVal.rectification_notes,
        rectification_photo_url: formVal.rectification_photo_url
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/safety-ncr']);
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      if (this.createForm.invalid) {
        this.createForm.markAllAsTouched();
        this.isSaving.set(false);
        return;
      }

      const formVal = this.createForm.value;
      const payload = {
        project_id: Number(formVal.project_id),
        assigned_contractor_id: formVal.assigned_contractor_id ? Number(formVal.assigned_contractor_id) : null,
        category: formVal.category,
        severity: formVal.severity,
        rectification_deadline: formVal.rectification_deadline,
        location_details: formVal.location_details,
        photo_url: formVal.photo_url || 'assets/images/common/placeholder-ncr.jpg',
        description: formVal.description
      };

      this.constructionService.createSafetyNCR(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/safety-ncr']);
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
