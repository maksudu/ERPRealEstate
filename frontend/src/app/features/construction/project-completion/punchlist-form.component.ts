import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Subcontractor, PunchlistItem, ProjectCompletion } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-punchlist-form',
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
      <!-- Unified Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/project-completion"
            [queryParams]="{ tab: 'PUNCHLIST' }"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Snag Register"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                [ngClass]="punchlistForm.get('severity')?.value === 'MANDATORY_CRITICAL' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'">
                {{ punchlistForm.get('severity')?.value || 'MINOR_COSMETIC' }}
              </span>
              <span class="text-xs font-mono text-muted-foreground">
                {{ isEditMode() ? 'Snag #' + existingSnag()?.item_code : 'New Punchlist Snag' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Snag Item: ' + existingSnag()?.item_code : 'Log Punchlist Defect / Pre-Handover Snag' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/project-completion"
            [queryParams]="{ tab: 'PUNCHLIST' }"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-xl border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="punchlistForm.invalid || isSaving()"
            (clicked)="saveForm()"
          >
            <i class="ri-save-line mr-1"></i>
            {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Update Snag' : 'Save Snag Item') }}
          </app-custom-button>
        </div>
      </div>

      <!-- Mandatory Gating Warning if Critical -->
      <div *ngIf="punchlistForm.get('severity')?.value === 'MANDATORY_CRITICAL'" class="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
        <i class="ri-alert-fill text-red-600 text-lg mt-0.5"></i>
        <div>
          <h4 class="text-xs font-bold text-red-600 uppercase">Mandatory Critical Gating Item</h4>
          <p class="text-xs text-red-600/80 mt-0.5">
            This item is classified as critical to life, fire, or structural safety. The system will strictly prevent Taking-Over and Final Completion certification until this snag is verified closed.
          </p>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Snag Item Parameters & Trade Assignment"
        subtitle="Identify defect location, category, responsible trade subcontractor, and target rectification date"
      >
        <form [formGroup]="punchlistForm" class="flex flex-col gap-6">
          <!-- Row 1: Code, Completion Dossier, Project -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-custom-input
              label="Snag Item Code *"
              placeholder="e.g. SNG-2026-001"
              formControlName="item_code"
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
              label="Completion Closeout Dossier *"
              [options]="completionOptions"
              formControlName="completion_id"
              [allowCreateNew]="false"
              placeholder="Select dossier..."
              [required]="true"
            ></app-searchable-select>
          </div>

          <!-- Row 2: Category, Severity, Location -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Snag Category *"
              categoryCode="PUNCHLIST_CATEGORY"
              formControlName="category"
              [allowCreateNew]="true"
              placeholder="Select category..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Severity Gating Level *"
              categoryCode="PUNCHLIST_SEVERITY"
              formControlName="severity"
              [allowCreateNew]="true"
              placeholder="Select severity..."
              [required]="true"
            ></app-searchable-select>

            <app-custom-input
              label="Location / Floor / Unit *"
              placeholder="e.g. Unit 8B Master Bedroom Window"
              formControlName="location_floor_unit"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Snag Description -->
          <app-custom-textarea
            label="Detailed Snag Observation / Defect *"
            placeholder="e.g. Weather silicone seal gap on exterior aluminum framing causing draft, paint touch-up required on skirtings..."
            formControlName="description"
            [rows]="3"
            [required]="true"
          ></app-custom-textarea>

          <!-- Row 3: Contractor, Target Date, Status -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Assigned Contractor / Trade"
              [options]="contractorOptions"
              formControlName="assigned_contractor_id"
              [allowCreateNew]="false"
              placeholder="Select contractor..."
            ></app-searchable-select>

            <app-custom-input
              label="Target Rectification Date *"
              type="date"
              formControlName="target_rectification_date"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Inspection / Rectification Status"
              [options]="statusOptions"
              formControlName="status"
              [allowCreateNew]="false"
              placeholder="Select status..."
            ></app-searchable-select>
          </div>

          <!-- Row 4: Reinspected By -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-input
              label="Reinspected & Closed By (Engineer Name)"
              placeholder="e.g. Engr. Tanvir Ahmed (QA/QC)"
              formControlName="reinspected_by_name"
            ></app-custom-input>

            <app-custom-input
              label="Rectification Photo URL / Proof"
              placeholder="e.g. /vault/photos/snag-rectified-8b.jpg"
              formControlName="photo_url"
            ></app-custom-input>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class PunchlistFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal<boolean>(false);
  snagId = signal<number | null>(null);
  existingSnag = signal<PunchlistItem | null>(null);
  isSaving = signal<boolean>(false);

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];
  completionOptions: { value: any; label: string }[] = [];

  statusOptions = [
    { value: 'OPEN', label: 'Open (Pending Rectification)' },
    { value: 'RECTIFIED_PENDING_INSPECTION', label: 'Rectified (Pending QA Re-Inspection)' },
    { value: 'VERIFIED_CLOSED', label: 'Verified Closed & Accepted' }
  ];

  punchlistForm: FormGroup = this.fb.group({
    item_code: ['', Validators.required],
    project_id: [null, Validators.required],
    completion_id: [null, Validators.required],
    category: ['Architectural Finishing', Validators.required],
    location_floor_unit: ['', Validators.required],
    description: ['', Validators.required],
    severity: ['MINOR_COSMETIC', Validators.required],
    assigned_contractor_id: [null],
    target_rectification_date: [new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10), Validators.required],
    status: ['OPEN', Validators.required],
    reinspected_by_name: [''],
    photo_url: ['']
  });

  ngOnInit(): void {
    this.loadDropdowns();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.snagId.set(Number(id));
      this.isEditMode.set(true);
      this.loadSnag(Number(id));
    } else {
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.punchlistForm.patchValue({
        item_code: `SNG-2026-${rand}`
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

    this.constructionService.getProjectCompletionsPaged({ limit: 50 }).subscribe({
      next: (res) => {
        this.completionOptions = (res.items || []).map((c: ProjectCompletion) => ({
          value: c.id,
          label: `${c.completion_code} - ${c.project_name || 'Project Closeout'}`
        }));
        if (!this.punchlistForm.get('completion_id')?.value && res.items.length > 0) {
          this.punchlistForm.patchValue({
            completion_id: res.items[0].id,
            project_id: res.items[0].project_id
          });
        }
      }
    });
  }

  loadSnag(id: number): void {
    this.constructionService.getPunchlistItemById(id).subscribe({
      next: (snag) => {
        this.existingSnag.set(snag);
        this.punchlistForm.patchValue({
          item_code: snag.item_code,
          project_id: snag.project_id,
          completion_id: snag.completion_id,
          category: snag.category,
          location_floor_unit: snag.location_floor_unit,
          description: snag.description,
          severity: snag.severity,
          assigned_contractor_id: snag.assigned_contractor_id,
          target_rectification_date: snag.target_rectification_date,
          status: snag.status,
          reinspected_by_name: snag.reinspected_by_name,
          photo_url: snag.photo_url
        });
      }
    });
  }

  saveForm(): void {
    if (this.punchlistForm.invalid) return;
    this.isSaving.set(true);
    const formVal = this.punchlistForm.getRawValue();

    if (this.isEditMode() && this.snagId()) {
      this.constructionService.updatePunchlistItem(this.snagId()!, formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/project-completion'], { queryParams: { tab: 'PUNCHLIST' } });
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.constructionService.createPunchlistItem(formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/project-completion'], { queryParams: { tab: 'PUNCHLIST' } });
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
