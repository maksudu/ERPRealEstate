import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Subcontractor, LaborWorker, LaborAttendance } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-labor-muster-form',
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
            title="Back to Labor Muster"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Attendance & Shift Allocation
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Attendance #' + attendanceId() : 'Log Daily / Gang Attendance' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Update Attendance & Shift Record' : 'Log Worker Attendance & Wage Certification' }}
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
            [disabled]="attendanceForm.invalid || isSaving()"
            (clicked)="saveAttendance()"
          >
            <span class="flex items-center gap-2">
              <i class="ri-check-line" *ngIf="!isSaving()"></i>
              <i class="ri-loader-4-line animate-spin" *ngIf="isSaving()"></i>
              {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Update Attendance' : 'Save Attendance Log') }}
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Main Form Container -->
      <app-card-container
        title="Site Shift Allocation & Check-In Verification"
        subtitle="GPS authorization, biometric match, overtime tracking, and supervisor approval"
      >
        <form [formGroup]="attendanceForm" class="flex flex-col gap-6">
          <!-- Row 1: Worker & Project -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Select Worker *"
              [options]="workerOptions"
              formControlName="worker_id"
              [allowCreateNew]="false"
              placeholder="Search worker by name / code..."
              [required]="true"
              (valueChange)="onWorkerSelected($event)"
            ></app-searchable-select>

            <app-searchable-select
              label="Assigned Construction Project *"
              [options]="projectOptions"
              formControlName="project_id"
              [allowCreateNew]="false"
              placeholder="Select project..."
              [required]="true"
            ></app-searchable-select>

            <app-custom-input
              label="Attendance Date *"
              type="date"
              formControlName="attendance_date"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Row 2: Shift, Status & Manday -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <app-searchable-select
              label="Shift Allocation *"
              categoryCode="SHIFT_TYPE"
              formControlName="shift_type"
              [allowCreateNew]="true"
              placeholder="Select shift..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Attendance Status *"
              categoryCode="ATTENDANCE_STATUS"
              formControlName="attendance_status"
              [allowCreateNew]="true"
              placeholder="Select status..."
              [required]="true"
              (valueChange)="onStatusChanged($event)"
            ></app-searchable-select>

            <app-custom-input
              label="Manday Fraction (1.0 = Full Day) *"
              type="number"
              placeholder="1.0"
              formControlName="manday_fraction"
              [required]="true"
              (change)="calculateWageEarned()"
            ></app-custom-input>

            <app-custom-input
              label="Overtime Hours (OT)"
              type="number"
              placeholder="0"
              formControlName="overtime_hours"
              (change)="calculateWageEarned()"
            ></app-custom-input>
          </div>

          <!-- Row 3: Check-in / Check-out & Wage Preview -->
          <div class="p-4 rounded-xl bg-secondary/30 border border-border">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Check-In Time"
                type="time"
                formControlName="check_in_time"
              ></app-custom-input>

              <app-custom-input
                label="Check-Out Time"
                type="time"
                formControlName="check_out_time"
              ></app-custom-input>

              <div class="flex flex-col justify-end">
                <span class="text-xs text-muted-foreground">Computed Wage for Shift</span>
                <span class="text-2xl font-bold font-mono text-primary mt-1">
                  ৳{{ totalWageEarned() | number:'1.2-2' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Row 4: Verification Method & GPS Capture -->
          <div class="p-4 rounded-xl bg-secondary/20 border border-border flex flex-col gap-4">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Verification Method & Site Authorization
                </h4>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Authorized mobile GPS, biometric timestamp, or supervisor muster entry
                </p>
              </div>

              <button
                type="button"
                (click)="captureGpsLocation()"
                class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium border border-primary/20 flex items-center gap-1.5 transition-colors"
              >
                <i class="ri-map-pin-user-line text-sm"></i>
                Capture Device GPS Coordinates
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Attendance Method"
                placeholder="MOBILE_APP_GPS, BIOMETRIC_DEVICE, SUPERVISOR_GANG"
                formControlName="attendance_method"
              ></app-custom-input>

              <app-custom-input
                label="GPS Latitude"
                formControlName="gps_latitude"
                placeholder="e.g. 23.780887"
              ></app-custom-input>

              <app-custom-input
                label="GPS Longitude"
                formControlName="gps_longitude"
                placeholder="e.g. 90.419253"
              ></app-custom-input>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-input
                label="Verification Photo URL / Snapshot"
                placeholder="https://.../attendance_face.jpg"
                formControlName="verification_photo_url"
              ></app-custom-input>

              <div class="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="biometricCheck"
                  formControlName="biometric_verified"
                  class="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
                <label for="biometricCheck" class="text-xs font-medium text-foreground cursor-pointer">
                  Biometric Fingerprint / Face Match Confirmed
                </label>
              </div>
            </div>
          </div>

          <!-- Row 5: Supervisor Approval -->
          <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                id="supervisorApproveCheck"
                formControlName="supervisor_approved"
                class="w-5 h-5 rounded text-primary focus:ring-primary border-border"
              />
              <div>
                <label for="supervisorApproveCheck" class="text-sm font-semibold text-foreground cursor-pointer">
                  Site Supervisor Sign-Off & Verification
                </label>
                <p class="text-xs text-muted-foreground">
                  Certifies that the worker completed designated shift activities on site
                </p>
              </div>
            </div>

            <div class="w-full sm:w-64">
              <app-custom-input
                label="Supervisor Name"
                formControlName="supervisor_name"
                placeholder="e.g. Engr. Kamal Hossain"
              ></app-custom-input>
            </div>
          </div>

          <app-custom-textarea
            label="Site Notes / Shift Activity Details"
            placeholder="Record assigned floor, beam casting activity, or reason for early departure..."
            formControlName="remarks"
            [rows]="2"
          ></app-custom-textarea>
        </form>
      </app-card-container>
    </div>
  `
})
export class LaborMusterFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  attendanceId = signal<number | null>(null);
  isEditMode = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  totalWageEarned = signal<number>(850);

  workerOptions: { value: any; label: string; daily_rate?: number; ot_rate?: number }[] = [];
  projectOptions: { value: any; label: string }[] = [];
  selectedWorkerRates = { daily: 850, ot: 110 };

  attendanceForm: FormGroup = this.fb.group({
    worker_id: [null, Validators.required],
    project_id: [null, Validators.required],
    attendance_date: [new Date().toISOString().split('T')[0], Validators.required],
    shift_type: ['DAY', Validators.required],
    attendance_status: ['PRESENT', Validators.required],
    manday_fraction: [1.0, [Validators.required, Validators.min(0)]],
    overtime_hours: [0, [Validators.required, Validators.min(0)]],
    check_in_time: ['08:00'],
    check_out_time: ['17:00'],
    attendance_method: ['MOBILE_APP_GPS'],
    gps_latitude: [''],
    gps_longitude: [''],
    verification_photo_url: [''],
    biometric_verified: [false],
    supervisor_approved: [true],
    supervisor_name: ['Engr. Kamal Hossain'],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadWorkers();
    this.loadProjects();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.attendanceId.set(Number(id));
      this.isEditMode.set(true);
      // If editing existing attendance
    }
  }

  loadWorkers(): void {
    this.constructionService.getWorkersPaged({ limit: 100 }).subscribe({
      next: (res) => {
        this.workerOptions = res.items.map(w => ({
          value: w.id,
          label: `${w.worker_name} (${w.worker_code} - ${w.trade_category})`,
          daily_rate: w.daily_wage_rate,
          ot_rate: w.hourly_overtime_rate
        }));
        if (res.items.length && !this.attendanceForm.get('worker_id')?.value) {
          const first = res.items[0];
          this.attendanceForm.patchValue({ worker_id: first.id });
          this.selectedWorkerRates = { daily: first.daily_wage_rate, ot: first.hourly_overtime_rate };
          this.calculateWageEarned();
        }
      }
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projectOptions = projs.map(p => ({ value: p.id, label: p.project_name }));
        if (projs.length && !this.attendanceForm.get('project_id')?.value) {
          this.attendanceForm.patchValue({ project_id: projs[0].id });
        }
      }
    });
  }

  onWorkerSelected(workerId: any): void {
    const selected = this.workerOptions.find(w => w.value === Number(workerId));
    if (selected) {
      this.selectedWorkerRates = {
        daily: selected.daily_rate || 850,
        ot: selected.ot_rate || 110
      };
      this.calculateWageEarned();
    }
  }

  onStatusChanged(status: any): void {
    const s = String(status || '').toUpperCase();
    if (s === 'ABSENT') {
      this.attendanceForm.patchValue({ manday_fraction: 0, overtime_hours: 0 });
    } else if (s === 'HALF_DAY') {
      this.attendanceForm.patchValue({ manday_fraction: 0.5 });
    } else if (s === 'PRESENT') {
      this.attendanceForm.patchValue({ manday_fraction: 1.0 });
    }
    this.calculateWageEarned();
  }

  calculateWageEarned(): void {
    const frac = Number(this.attendanceForm.get('manday_fraction')?.value) || 0;
    const ot = Number(this.attendanceForm.get('overtime_hours')?.value) || 0;
    const total = (frac * this.selectedWorkerRates.daily) + (ot * this.selectedWorkerRates.ot);
    this.totalWageEarned.set(Math.round(total));
  }

  captureGpsLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.attendanceForm.patchValue({
            gps_latitude: pos.coords.latitude.toFixed(6),
            gps_longitude: pos.coords.longitude.toFixed(6),
            attendance_method: 'MOBILE_APP_GPS'
          });
        },
        (err) => {
          alert('Unable to capture GPS: ' + err.message);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  saveAttendance(): void {
    if (this.attendanceForm.invalid) return;

    this.isSaving.set(true);
    const f = this.attendanceForm.value;
    const payload: Partial<LaborAttendance> = {
      worker_id: Number(f.worker_id),
      project_id: Number(f.project_id),
      attendance_date: f.attendance_date,
      shift_type: f.shift_type,
      attendance_status: f.attendance_status,
      manday_fraction: Number(f.manday_fraction),
      overtime_hours: Number(f.overtime_hours),
      check_in_time: f.check_in_time || null,
      check_out_time: f.check_out_time || null,
      attendance_method: f.attendance_method,
      gps_latitude: f.gps_latitude ? Number(f.gps_latitude) : null,
      gps_longitude: f.gps_longitude ? Number(f.gps_longitude) : null,
      verification_photo_url: f.verification_photo_url || null,
      biometric_verified: Boolean(f.biometric_verified),
      supervisor_approved: Boolean(f.supervisor_approved),
      supervisor_name: f.supervisor_name || null,
      remarks: f.remarks || null
    };

    this.constructionService.recordAttendance(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/construction/labor-muster'], { queryParams: { tab: 'ATTENDANCE' } });
      },
      error: () => this.isSaving.set(false)
    });
  }
}
