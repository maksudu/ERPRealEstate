import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Subcontractor, LaborWorker } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-worker-form',
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
            routerLink="/construction/labor-muster"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Workforce Management"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Workforce Management
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Worker #' + workerId() : 'New Worker Registration' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Edit Worker Profile & Rates' : 'Onboard Construction Worker' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/labor-muster"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-xl border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="workerForm.invalid || isSaving()"
            (clicked)="saveWorker()"
          >
            <span class="flex items-center gap-2">
              <i class="ri-save-line" *ngIf="!isSaving()"></i>
              <i class="ri-loader-4-line animate-spin" *ngIf="isSaving()"></i>
              {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Update Worker' : 'Register Worker') }}
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Main Form Container -->
      <app-card-container
        title="Worker Credentials & Wage Agreement"
        subtitle="Specify direct employment, subcontracted trade, NID verification, and approved rate structure"
      >
        <form [formGroup]="workerForm" class="flex flex-col gap-6">
          <!-- Row 1: Identification -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-custom-input
              label="Worker Code / Badge ID *"
              placeholder="e.g. WRK-2026-088"
              formControlName="worker_code"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Full Name *"
              placeholder="e.g. Mohammad Rafiqul Islam"
              formControlName="worker_name"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Worker Employment Type *"
              categoryCode="WORKER_TYPE"
              formControlName="worker_type"
              [allowCreateNew]="true"
              placeholder="Select worker type..."
              [required]="true"
            ></app-searchable-select>
          </div>

          <!-- Row 2: Trade & Contractor -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Trade Specialization *"
              categoryCode="LABOR_TRADE"
              formControlName="trade_category"
              [allowCreateNew]="true"
              placeholder="Select or add trade..."
              [required]="true"
            ></app-searchable-select>

            <app-custom-input
              label="Skill Classification *"
              placeholder="e.g. Skilled Mason, Helper, Head Mistry"
              formControlName="skill_level"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Associated Subcontractor / Gang"
              [options]="contractorOptions"
              formControlName="contractor_id"
              [allowCreateNew]="false"
              placeholder="Independent / Select Subcontractor..."
            ></app-searchable-select>
          </div>

          <!-- Row 3: Rates & Compensation -->
          <div class="p-4 rounded-xl bg-secondary/30 border border-border">
            <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Wage & Overtime Structure (BDT)
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Daily Wage Rate (8-Hour Shift) *"
                type="number"
                placeholder="e.g. 850"
                formControlName="daily_wage_rate"
                [required]="true"
                (change)="calculateHourlyOtRate()"
              ></app-custom-input>

              <app-custom-input
                label="Hourly Overtime Rate (BDT/Hour) *"
                type="number"
                placeholder="e.g. 110"
                formControlName="hourly_overtime_rate"
                [required]="true"
              ></app-custom-input>

              <app-searchable-select
                label="Default Deployed Project"
                [options]="projectOptions"
                formControlName="assigned_project_id"
                [allowCreateNew]="false"
                placeholder="Assign primary project..."
              ></app-searchable-select>
            </div>
          </div>

          <!-- Row 4: Contact & Verification -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-custom-input
              label="National ID (NID) / Smart Card"
              placeholder="e.g. 19902692518000123"
              formControlName="nid_number"
            ></app-custom-input>

            <app-custom-input
              label="Primary Contact Phone"
              placeholder="e.g. +8801711000000"
              formControlName="phone_number"
            ></app-custom-input>

            <app-custom-input
              label="Emergency Contact & Kin Name"
              placeholder="e.g. Brother: +8801811000000"
              formControlName="emergency_contact"
            ></app-custom-input>
          </div>

          <!-- Row 5: Photo URL & Status -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-input
              label="Profile Photo / Verification Image URL"
              placeholder="https://.../photo.jpg"
              formControlName="photo_url"
            ></app-custom-input>

            <div class="flex flex-col justify-center gap-1.5 p-3 rounded-xl bg-secondary/20 border border-border">
              <label class="text-xs font-medium text-foreground">Worker Status</label>
              <div class="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  formControlName="is_active"
                  class="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
                <label for="isActiveCheck" class="text-sm text-foreground cursor-pointer">
                  Active & Available for Site Shift Allocation
                </label>
              </div>
            </div>
          </div>

          <!-- Remarks -->
          <app-custom-textarea
            label="Additional Notes / Gang Allocation History"
            placeholder="Record medical fitness, previous projects, or safety orientations..."
            formControlName="notes"
            [rows]="3"
          ></app-custom-textarea>
        </form>
      </app-card-container>
    </div>
  `
})
export class WorkerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  workerId = signal<number | null>(null);
  isEditMode = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  contractorOptions: { value: any; label: string }[] = [];
  projectOptions: { value: any; label: string }[] = [];

  workerForm: FormGroup = this.fb.group({
    worker_code: ['', Validators.required],
    worker_name: ['', Validators.required],
    worker_type: ['SUBCON_LABOR', Validators.required],
    contractor_id: [null],
    trade_category: ['MASONRY', Validators.required],
    skill_level: ['Skilled', Validators.required],
    daily_wage_rate: [850, [Validators.required, Validators.min(0)]],
    hourly_overtime_rate: [110, [Validators.required, Validators.min(0)]],
    nid_number: [''],
    phone_number: [''],
    emergency_contact: [''],
    assigned_project_id: [null],
    photo_url: [''],
    is_active: [true],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadContractors();
    this.loadProjects();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.workerId.set(Number(id));
      this.isEditMode.set(true);
      this.loadWorkerDetails(Number(id));
    } else {
      // Auto-generate code
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.workerForm.patchValue({
        worker_code: `WRK-2026-${rand}`
      });
    }
  }

  loadContractors(): void {
    this.constructionService.getContractors().subscribe({
      next: (contractors) => {
        this.contractorOptions = [
          { value: null, label: 'No Contractor (Directly Employed)' },
          ...contractors.map(c => ({
            value: c.id,
            label: `${c.company_name} (${c.contractor_code})`
          }))
        ];
      }
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projectOptions = [
          { value: null, label: 'Unassigned / Multi-Project' },
          ...projects.map(p => ({
            value: p.id,
            label: p.project_name
          }))
        ];
      }
    });
  }

  loadWorkerDetails(id: number): void {
    this.constructionService.getWorkerById(id).subscribe({
      next: (w) => {
        this.workerForm.patchValue({
          worker_code: w.worker_code,
          worker_name: w.worker_name,
          worker_type: w.worker_type,
          contractor_id: w.contractor_id,
          trade_category: w.trade_category,
          skill_level: w.skill_level,
          daily_wage_rate: w.daily_wage_rate,
          hourly_overtime_rate: w.hourly_overtime_rate,
          nid_number: w.nid_number || '',
          phone_number: w.phone_number || '',
          emergency_contact: w.emergency_contact || '',
          assigned_project_id: w.assigned_project_id,
          photo_url: w.photo_url || '',
          is_active: w.is_active,
          notes: w.notes || ''
        });
      }
    });
  }

  calculateHourlyOtRate(): void {
    const dailyWage = Number(this.workerForm.get('daily_wage_rate')?.value) || 0;
    if (dailyWage > 0 && !this.workerForm.get('hourly_overtime_rate')?.value) {
      // Default: (daily / 8) * 1.25 OT multiplier
      const ot = Math.round((dailyWage / 8) * 1.25);
      this.workerForm.patchValue({ hourly_overtime_rate: ot });
    }
  }

  saveWorker(): void {
    if (this.workerForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.workerForm.value;
    const payload: Partial<LaborWorker> = {
      worker_code: formVal.worker_code,
      worker_name: formVal.worker_name,
      worker_type: formVal.worker_type,
      contractor_id: formVal.contractor_id ? Number(formVal.contractor_id) : null,
      trade_category: formVal.trade_category,
      skill_level: formVal.skill_level,
      daily_wage_rate: Number(formVal.daily_wage_rate),
      hourly_overtime_rate: Number(formVal.hourly_overtime_rate),
      nid_number: formVal.nid_number || null,
      phone_number: formVal.phone_number || null,
      emergency_contact: formVal.emergency_contact || null,
      assigned_project_id: formVal.assigned_project_id ? Number(formVal.assigned_project_id) : null,
      photo_url: formVal.photo_url || null,
      is_active: Boolean(formVal.is_active),
      notes: formVal.notes || null
    };

    if (this.isEditMode() && this.workerId()) {
      this.constructionService.updateWorker(this.workerId()!, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/labor-muster'], { queryParams: { tab: 'WORKERS' } });
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.constructionService.createWorker(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/labor-muster'], { queryParams: { tab: 'WORKERS' } });
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
