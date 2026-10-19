import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Subcontractor, SafetyTraining } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-safety-training-form',
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
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {{ trainingForm.get('training_type')?.value || 'SITE_INDUCTION' }}
              </span>
              <span class="text-xs font-mono text-muted-foreground">
                {{ isEditMode() ? 'Session #' + existingTraining()?.training_code : 'New Safety Training Log' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Training: ' + existingTraining()?.session_title : 'Log Site Safety Induction or Toolbox Talk (TBT)' }}
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
            [disabled]="trainingForm.invalid || isSaving()"
            (clicked)="saveForm()"
          >
            <i class="ri-user-voice-line mr-1"></i>
            {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Update Training' : 'Log Training Session') }}
          </app-custom-button>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Training Session Parameters & Audience"
        subtitle="Record worker safety induction, daily toolbox talk topics, and attendees count"
      >
        <form [formGroup]="trainingForm" class="flex flex-col gap-6">
          <!-- Row 1: Code, Title, Date -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <app-custom-input
              label="Session Reference Code *"
              placeholder="e.g. TRN-2026-001"
              formControlName="training_code"
              [required]="true"
            ></app-custom-input>

            <div class="sm:col-span-2">
              <app-custom-input
                label="Session Title *"
                placeholder="e.g. Scaffolding Fall Arrest & PPE Compliance Talk"
                formControlName="session_title"
                [required]="true"
              ></app-custom-input>
            </div>

            <app-custom-input
              label="Date of Training *"
              type="date"
              formControlName="training_date"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Row 2: Project, Contractor, Training Type -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Project *"
              [options]="projectOptions"
              formControlName="project_id"
              [allowCreateNew]="false"
              placeholder="Select project..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Participating Contractor"
              [options]="contractorOptions"
              formControlName="contractor_id"
              [allowCreateNew]="false"
              placeholder="Select contractor..."
            ></app-searchable-select>

            <app-searchable-select
              label="Training / Induction Category *"
              categoryCode="SAFETY_TRAINING_TYPE"
              formControlName="training_type"
              [allowCreateNew]="true"
              placeholder="Select training type..."
              [required]="true"
            ></app-searchable-select>
          </div>

          <!-- Row 3: Trainer & Venue -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <app-custom-input
              label="Trainer / Speaker Name *"
              placeholder="e.g. Engr. Tanvir Ahmed"
              formControlName="trainer_name"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Trainer Designation"
              placeholder="e.g. Lead HSE Specialist"
              formControlName="trainer_designation"
            ></app-custom-input>

            <app-custom-input
              label="Duration (Minutes) *"
              type="number"
              formControlName="duration_minutes"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Location / Zone"
              placeholder="e.g. Site Muster Ground / Tower A Base"
              formControlName="location_room_zone"
            ></app-custom-input>
          </div>

          <!-- Row 4: Attendees -->
          <div class="p-4 rounded-2xl bg-secondary/30 border border-border flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <i class="ri-team-line text-primary"></i> Attendance Count & Verification
              </h4>
              <div class="w-48">
                <app-custom-input
                  label="Total Workers Present *"
                  type="number"
                  formControlName="attendees_count"
                  [required]="true"
                ></app-custom-input>
              </div>
            </div>
          </div>

          <!-- Topics Covered & Feedback -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-textarea
              label="Key Topics Covered *"
              placeholder="1. Hard hat, boots & hi-vis jacket mandatory rule&#10;2. 100% tie-off above 6 feet&#10;3. Emergency evacuation assembly point..."
              formControlName="topics_covered"
              [rows]="4"
              [required]="true"
            ></app-custom-textarea>

            <app-custom-textarea
              label="Feedback & Worker Engagement Summary"
              placeholder="Worker comprehension evaluated, questions answered regarding harness inspection, certificates logged..."
              formControlName="feedback_summary"
              [rows]="4"
            ></app-custom-textarea>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class SafetyTrainingFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal<boolean>(false);
  trainingId = signal<number | null>(null);
  existingTraining = signal<SafetyTraining | null>(null);
  isSaving = signal<boolean>(false);

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  trainingForm: FormGroup = this.fb.group({
    training_code: ['', Validators.required],
    project_id: [null, Validators.required],
    contractor_id: [null],
    training_type: ['SITE_INDUCTION', Validators.required],
    session_title: ['', Validators.required],
    trainer_name: ['', Validators.required],
    trainer_designation: ['HSE Officer'],
    training_date: [new Date().toISOString().substring(0, 10), Validators.required],
    duration_minutes: [45, Validators.required],
    location_room_zone: ['Site Muster Point'],
    attendees_count: [15, Validators.required],
    topics_covered: ['', Validators.required],
    feedback_summary: ['']
  });

  ngOnInit(): void {
    this.loadDropdowns();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.trainingId.set(Number(id));
      this.isEditMode.set(true);
      this.loadTraining(Number(id));
    } else {
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.trainingForm.patchValue({
        training_code: `TRN-2026-${rand}`
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

  loadTraining(id: number): void {
    this.constructionService.getSafetyTrainingById(id).subscribe({
      next: (trn) => {
        this.existingTraining.set(trn);
        this.trainingForm.patchValue({
          training_code: trn.training_code,
          project_id: trn.project_id,
          contractor_id: trn.contractor_id,
          training_type: trn.training_type,
          session_title: trn.session_title,
          trainer_name: trn.trainer_name,
          trainer_designation: trn.trainer_designation,
          training_date: trn.training_date,
          duration_minutes: trn.duration_minutes,
          location_room_zone: trn.location_room_zone,
          attendees_count: trn.attendees_count,
          topics_covered: trn.topics_covered,
          feedback_summary: trn.feedback_summary
        });
      }
    });
  }

  saveForm(): void {
    if (this.trainingForm.invalid) return;
    this.isSaving.set(true);
    const formVal = this.trainingForm.getRawValue();

    this.constructionService.createSafetyTraining(formVal).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/construction/safety-ncr']);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
