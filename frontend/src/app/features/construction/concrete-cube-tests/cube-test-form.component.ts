import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { ConcreteCubeTest } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-cube-test-form',
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
            routerLink="/construction/cube-tests"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Concrete Cube Register"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                QA & Material Testing
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isRecordMode() ? 'Recording Test Readings #' + testId() : 'New Casting Sample' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isRecordMode() ? 'Record Concrete Crushing Strength (Day 7 / 14 / 28)' : 'Log Concrete Cube Casting Sample' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/cube-tests"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="isRecordMode() ? recordForm.invalid || isSaving() : createForm.invalid || isSaving()"
            (clicked)="saveForm()"
          >
            <span class="flex items-center gap-2">
              @if (isSaving()) {
                Saving...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                {{ isRecordMode() ? 'Save Test Readings' : 'Register Casting Sample' }}
              }
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Mode 1: Log New Casting Sample -->
      @if (!isRecordMode()) {
        <app-card-container
          title="Concrete Mix & Structural Element Information"
          subtitle="Record casting date, design strength (PSI), slump test, and batching plant source"
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

              <app-custom-input
                label="Structural Element Sampled *"
                placeholder="e.g. 5th Floor Slab Beam Grid A-C"
                formControlName="structural_element"
              >
              </app-custom-input>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Casting Date *"
                type="date"
                formControlName="casting_date"
              >
              </app-custom-input>

              <app-custom-input
                label="Design Strength (PSI) *"
                type="number"
                min="1000"
                placeholder="4000"
                formControlName="design_compressive_strength_psi"
              >
              </app-custom-input>

              <app-searchable-select
                label="Concrete Grade *"
                [options]="gradeOptions"
                formControlName="concrete_grade"
                [allowCreateNew]="true"
                categoryCode="CONCRETE_GRADE"
                placeholder="Select grade..."
              >
              </app-searchable-select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-input
                label="Ready-Mix Batching Plant Name *"
                placeholder="e.g. Mir Ready-Mix Plant Unit 2"
                formControlName="batching_plant_name"
              >
              </app-custom-input>

              <app-custom-input
                label="Slump Test Reading (mm) *"
                type="number"
                min="0"
                placeholder="100"
                formControlName="slump_test_mm"
              >
              </app-custom-input>
            </div>

            <app-custom-textarea
              label="Quality Check Notes & Remarks"
              placeholder="Record truck transit time, admixture details, temperature..."
              formControlName="remarks"
              [rows]="3"
            >
            </app-custom-textarea>

            <div class="pt-6 border-t border-border flex items-center justify-end gap-3">
              <a
                routerLink="/construction/cube-tests"
                class="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
              >
                Cancel
              </a>
              <app-custom-button
                variant="primary"
                [disabled]="createForm.invalid || isSaving()"
                (clicked)="saveForm()"
              >
                <span>Register Casting Sample</span>
              </app-custom-button>
            </div>
          </form>
        </app-card-container>
      }

      <!-- Mode 2: Record Crushing Test Readings -->
      @if (isRecordMode()) {
        <app-card-container
          title="Crushing Machine Readings & Verdict Evaluation"
          subtitle="Enter crushing strength (PSI) for Day 7, Day 14, and Day 28 against target design strength"
        >
          <form [formGroup]="recordForm" class="flex flex-col gap-6">
            <div class="p-4 rounded-xl border border-border bg-secondary/30 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span class="text-muted-foreground block text-[10px]">Structural Element:</span>
                <span class="font-bold text-foreground">{{ existingTest()?.structural_element }}</span>
              </div>
              <div>
                <span class="text-muted-foreground block text-[10px]">Casting Date:</span>
                <span class="font-bold text-foreground">{{ existingTest()?.casting_date }}</span>
              </div>
              <div>
                <span class="text-muted-foreground block text-[10px]">Design Strength:</span>
                <span class="font-bold text-primary">{{ existingTest()?.design_compressive_strength_psi }} PSI</span>
              </div>
              <div>
                <span class="text-muted-foreground block text-[10px]">Batching Plant:</span>
                <span class="font-bold text-foreground truncate block">{{ existingTest()?.batching_plant_name }}</span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Day 7 Crushing Strength (PSI)"
                type="number"
                min="0"
                placeholder="e.g. 2800"
                formControlName="day7_strength_psi"
              >
              </app-custom-input>

              <app-custom-input
                label="Day 14 Crushing Strength (PSI)"
                type="number"
                min="0"
                placeholder="e.g. 3500"
                formControlName="day14_strength_psi"
              >
              </app-custom-input>

              <app-custom-input
                label="Day 28 Crushing Strength (PSI)"
                type="number"
                min="0"
                placeholder="e.g. 4200"
                formControlName="day28_strength_psi"
              >
              </app-custom-input>
            </div>

            <app-custom-input
              label="Laboratory Test Certificate Link (URL / PDF)"
              placeholder="https://cdn.erp.com/lab-reports/cube-test-01.pdf"
              formControlName="lab_test_report_url"
            >
            </app-custom-input>

            <app-custom-textarea
              label="Testing Engineer Remarks"
              placeholder="Record testing conditions, type of fracture (conical, shear), machine calibration details..."
              formControlName="remarks"
              [rows]="3"
            >
            </app-custom-textarea>

            <div class="pt-6 border-t border-border flex items-center justify-end gap-3">
              <a
                routerLink="/construction/cube-tests"
                class="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
              >
                Cancel
              </a>
              <app-custom-button
                variant="primary"
                [disabled]="recordForm.invalid || isSaving()"
                (clicked)="saveForm()"
              >
                <span>Save Test Readings</span>
              </app-custom-button>
            </div>
          </form>
        </app-card-container>
      }
    </div>
  `
})
export class CubeTestFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  isRecordMode = signal<boolean>(false);
  testId = signal<number | null>(null);
  existingTest = signal<ConcreteCubeTest | null>(null);
  isSaving = signal<boolean>(false);

  projectOptions: { value: any; label: string }[] = [];

  gradeOptions = [
    { value: 'M15', label: 'M15 (Lean Concrete / Blinding)' },
    { value: 'M20', label: 'M20 (PCC & Nominal Mix)' },
    { value: 'M25', label: 'M25 (Standard Structural RCC)' },
    { value: 'M30', label: 'M30 (High-Grade Columns & Slabs)' },
    { value: 'M35', label: 'M35 (High-Rise Foundation & Raft)' },
    { value: 'M40', label: 'M40 (Prestressed / Heavy Civil Infrastructure)' }
  ];

  createForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    structural_element: ['', Validators.required],
    casting_date: [new Date().toISOString().split('T')[0], Validators.required],
    design_compressive_strength_psi: [4000, [Validators.required, Validators.min(1000)]],
    concrete_grade: ['M25', Validators.required],
    batching_plant_name: ['Ready-Mix Batching Plant', Validators.required],
    slump_test_mm: [100, [Validators.required, Validators.min(0)]],
    remarks: ['']
  });

  recordForm: FormGroup = this.fb.group({
    day7_strength_psi: [null],
    day14_strength_psi: [null],
    day28_strength_psi: [null],
    lab_test_report_url: [''],
    remarks: ['']
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

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.isRecordMode.set(true);
        this.testId.set(id);
        this.loadTest(id);
      }
    }
  }

  loadTest(id: number): void {
    this.constructionService.getCubeTestById(id).subscribe({
      next: (t) => {
        this.existingTest.set(t);
        this.recordForm.patchValue({
          day7_strength_psi: t.day7_strength_psi,
          day14_strength_psi: t.day14_strength_psi,
          day28_strength_psi: t.day28_strength_psi,
          lab_test_report_url: t.lab_test_report_url,
          remarks: t.remarks
        });
      }
    });
  }

  saveForm(): void {
    this.isSaving.set(true);

    if (this.isRecordMode() && this.testId()) {
      const val = this.recordForm.value;
      const payload = {
        day7_strength_psi: val.day7_strength_psi ? Number(val.day7_strength_psi) : null,
        day14_strength_psi: val.day14_strength_psi ? Number(val.day14_strength_psi) : null,
        day28_strength_psi: val.day28_strength_psi ? Number(val.day28_strength_psi) : null,
        lab_test_report_url: val.lab_test_report_url,
        remarks: val.remarks
      };

      this.constructionService.recordCubeTestStrength(this.testId()!, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/cube-tests']);
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
        structural_element: formVal.structural_element,
        casting_date: formVal.casting_date,
        design_compressive_strength_psi: Number(formVal.design_compressive_strength_psi),
        concrete_grade: formVal.concrete_grade,
        batching_plant_name: formVal.batching_plant_name,
        slump_test_mm: Number(formVal.slump_test_mm),
        remarks: formVal.remarks
      };

      this.constructionService.createCubeTest(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/cube-tests']);
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
