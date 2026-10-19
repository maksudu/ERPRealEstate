import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Subcontractor, SafetyIncident } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-safety-incident-form',
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
                [ngClass]="incidentForm.get('severity_level')?.value === 'CRITICAL' || incidentForm.get('severity_level')?.value === 'HIGH' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'">
                {{ incidentForm.get('severity_level')?.value || 'MEDIUM' }} Severity
              </span>
              <span class="text-xs font-mono text-muted-foreground">
                {{ isEditMode() ? 'Incident #' + existingIncident()?.incident_code : 'New Safety Incident Log' }}
              </span>
              <span *ngIf="incidentForm.get('is_confidential_medical')?.value" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1">
                <i class="ri-lock-2-line"></i> Confidential Medical Record
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? (existingIncident()?.incident_title || existingIncident()?.incident_code) : 'Report Safety Incident, Near-Miss or Damage' }}
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
            [disabled]="incidentForm.invalid || isSaving()"
            (clicked)="saveForm()"
          >
            <i class="ri-save-line mr-1"></i>
            {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Update Incident' : 'Save & Log Incident') }}
          </app-custom-button>
        </div>
      </div>

      <!-- Quick Escalation Notice if Critical/Escalated -->
      <div *ngIf="incidentForm.get('emergency_escalation_notified')?.value" class="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="p-2 rounded-xl bg-red-500/20 text-red-600 mt-0.5">
            <i class="ri-alarm-warning-line text-lg"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-red-600">Emergency Management Escalation Triggered</h4>
            <p class="text-xs text-red-600/80 mt-0.5">
              Project Director, Head of HSE, and Site Medical Emergency Team have received automatic SMS/Email dispatch alerts.
            </p>
          </div>
        </div>
        <button
          type="button"
          (click)="triggerEmergencyEscalation()"
          class="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors shrink-0"
        >
          <i class="ri-broadcast-line"></i> Re-Send Escalation
        </button>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Incident Identification & Site Classification"
        subtitle="Capture event timeline, contractor involvement, hazard severity, and injury impact"
      >
        <form [formGroup]="incidentForm" class="flex flex-col gap-6">
          <!-- Row 1: Code, Title, Date & Time -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <app-custom-input
              label="Incident Reference Code *"
              placeholder="e.g. INC-2026-001"
              formControlName="incident_code"
              [required]="true"
            ></app-custom-input>

            <div class="sm:col-span-2">
              <app-custom-input
                label="Incident Headline / Title *"
                placeholder="e.g. Scaffolding Plank Slippage during Plastering"
                formControlName="incident_title"
                [required]="true"
              ></app-custom-input>
            </div>

            <app-custom-input
              label="Date of Incident *"
              type="date"
              formControlName="incident_date"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Row 2: Project, Contractor, Time & Location -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <app-searchable-select
              label="Project *"
              [options]="projectOptions"
              formControlName="project_id"
              [allowCreateNew]="false"
              placeholder="Select project..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Involved Subcontractor"
              [options]="contractorOptions"
              formControlName="contractor_id"
              [allowCreateNew]="false"
              placeholder="Select contractor..."
            ></app-searchable-select>

            <app-custom-input
              label="Time of Incident"
              placeholder="e.g. 14:30"
              formControlName="incident_time"
            ></app-custom-input>

            <app-custom-input
              label="Exact Site Location *"
              placeholder="e.g. Tower A, 8th Floor West Wing"
              formControlName="exact_location"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Row 3: Incident Type & Severity (Dynamic Lookup Driven) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Incident Classification Type *"
              categoryCode="INCIDENT_TYPE"
              formControlName="incident_type"
              [allowCreateNew]="true"
              placeholder="Select incident type..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Severity Classification *"
              categoryCode="INCIDENT_SEVERITY"
              formControlName="severity_level"
              [allowCreateNew]="true"
              placeholder="Select severity level..."
              [required]="true"
            ></app-searchable-select>

            <div class="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-secondary/20 mt-6">
              <input
                type="checkbox"
                id="confidential_medical"
                formControlName="is_confidential_medical"
                class="w-4 h-4 rounded text-primary focus:ring-primary border-border"
              />
              <label for="confidential_medical" class="text-xs font-semibold text-foreground cursor-pointer select-none">
                Confidential Medical Record
                <span class="block text-[10px] font-normal text-muted-foreground">Restricts public viewing of sensitive injury/health data</span>
              </label>
            </div>
          </div>

          <!-- Row 4: Injured Person & Property Damage -->
          <div class="p-4 rounded-2xl bg-secondary/20 border border-border flex flex-col gap-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personnel Injury & Damage Assessment</h4>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <app-custom-input
                label="Injured Person Name"
                placeholder="e.g. Md. Rafiqul Islam"
                formControlName="injured_person_name"
              ></app-custom-input>

              <app-custom-input
                label="Nature of Injury"
                placeholder="e.g. First-degree burn / Laceration"
                formControlName="injury_nature"
              ></app-custom-input>

              <app-custom-input
                label="Affected Body Part"
                placeholder="e.g. Left Forearm"
                formControlName="body_part_affected"
              ></app-custom-input>

              <div class="grid grid-cols-2 gap-2">
                <app-custom-input
                  label="Days Lost (LTI)"
                  type="number"
                  formControlName="days_lost_count"
                ></app-custom-input>

                <app-custom-input
                  label="Damage Est. (৳)"
                  type="number"
                  formControlName="property_damage_estimated_cost"
                ></app-custom-input>
              </div>
            </div>
          </div>

          <!-- Incident Description -->
          <app-custom-textarea
            label="Detailed Incident Description *"
            placeholder="Describe sequence of events leading to the occurrence, site conditions, equipment involved, and immediate aftermath..."
            formControlName="incident_description"
            [rows]="3"
            [required]="true"
          ></app-custom-textarea>

          <app-custom-textarea
            label="Immediate Action Taken"
            placeholder="e.g. Work immediately halted, first aid administered on site, transferred to local clinic..."
            formControlName="immediate_action_taken"
            [rows]="2"
          ></app-custom-textarea>

          <!-- Investigation & CAPA Resolution Section -->
          <div class="p-4 rounded-2xl bg-secondary/30 border border-border flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <i class="ri-microscope-line text-primary"></i> Root Cause Analysis (RCA) & Corrective Action (CAPA)
              </h4>
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary border border-border">
                Status: {{ incidentForm.get('investigation_status')?.value || 'REPORTED' }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-textarea
                label="Root Cause Analysis (RCA)"
                placeholder="Analyze human factor, machinery failure, lack of PPE, or procedural breakdown..."
                formControlName="root_cause_analysis"
                [rows]="3"
              ></app-custom-textarea>

              <app-custom-textarea
                label="Corrective & Preventive Action (CAPA)"
                placeholder="Mandatory steps required to eliminate recurrence..."
                formControlName="corrective_preventive_action"
                [rows]="3"
              ></app-custom-textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Responsible Person for CAPA"
                placeholder="e.g. Engr. Asadullah (Site In-charge)"
                formControlName="responsible_person_name"
              ></app-custom-input>

              <app-custom-input
                label="CAPA Completion Due Date"
                type="date"
                formControlName="capa_due_date"
              ></app-custom-input>

              <app-searchable-select
                label="Investigation Lifecycle Status"
                [options]="investigationStatusOptions"
                formControlName="investigation_status"
                [allowCreateNew]="false"
                placeholder="Select status..."
              ></app-searchable-select>
            </div>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class SafetyIncidentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal<boolean>(false);
  incidentId = signal<number | null>(null);
  existingIncident = signal<SafetyIncident | null>(null);
  isSaving = signal<boolean>(false);

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  investigationStatusOptions = [
    { value: 'REPORTED', label: 'Reported / Initial Assessment' },
    { value: 'UNDER_INVESTIGATION', label: 'Under Safety Investigation' },
    { value: 'CAPA_ASSIGNED', label: 'CAPA Assigned & In Progress' },
    { value: 'RESOLVED', label: 'CAPA Implemented & Resolved' },
    { value: 'CLOSED', label: 'Verified & Formally Closed' }
  ];

  incidentForm: FormGroup = this.fb.group({
    incident_code: ['', Validators.required],
    incident_title: ['', Validators.required],
    project_id: [null, Validators.required],
    contractor_id: [null],
    incident_date: [new Date().toISOString().substring(0, 10), Validators.required],
    incident_time: ['10:00'],
    exact_location: ['', Validators.required],
    incident_type: ['NEAR_MISS', Validators.required],
    severity_level: ['MEDIUM', Validators.required],
    is_confidential_medical: [false],
    injured_person_name: [''],
    injury_nature: [''],
    body_part_affected: [''],
    days_lost_count: [0],
    property_damage_estimated_cost: [0],
    incident_description: ['', Validators.required],
    immediate_action_taken: [''],
    root_cause_analysis: [''],
    corrective_preventive_action: [''],
    responsible_person_name: [''],
    capa_due_date: [''],
    investigation_status: ['REPORTED'],
    emergency_escalation_notified: [false]
  });

  ngOnInit(): void {
    this.loadDropdowns();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.incidentId.set(Number(id));
      this.isEditMode.set(true);
      this.loadIncident(Number(id));
    } else {
      // Auto generate reference code
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.incidentForm.patchValue({
        incident_code: `INC-2026-${rand}`
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

  loadIncident(id: number): void {
    this.constructionService.getSafetyIncidentById(id).subscribe({
      next: (inc) => {
        this.existingIncident.set(inc);
        this.incidentForm.patchValue({
          incident_code: inc.incident_code,
          incident_title: inc.incident_title,
          project_id: inc.project_id,
          contractor_id: inc.contractor_id,
          incident_date: inc.incident_date,
          incident_time: inc.incident_time,
          exact_location: inc.exact_location,
          incident_type: inc.incident_type,
          severity_level: inc.severity_level,
          is_confidential_medical: inc.is_confidential_medical,
          injured_person_name: inc.injured_person_name,
          injury_nature: inc.injury_nature,
          body_part_affected: inc.body_part_affected,
          days_lost_count: inc.days_lost_count,
          property_damage_estimated_cost: inc.property_damage_estimated_cost,
          incident_description: inc.incident_description,
          immediate_action_taken: inc.immediate_action_taken,
          root_cause_analysis: inc.root_cause_analysis,
          corrective_preventive_action: inc.corrective_preventive_action,
          responsible_person_name: inc.responsible_person_name,
          capa_due_date: inc.capa_due_date,
          investigation_status: inc.investigation_status,
          emergency_escalation_notified: inc.emergency_escalation_notified
        });
      }
    });
  }

  triggerEmergencyEscalation(): void {
    if (!this.incidentId()) return;
    this.constructionService.escalateSafetyIncident(this.incidentId()!, {
      notification_recipients: ['director@blueoceans.com', 'hse-lead@blueoceans.com'],
      escalation_severity: this.incidentForm.get('severity_level')?.value || 'HIGH',
      remarks: 'Automated high-priority safety escalation triggered from site console.'
    }).subscribe({
      next: () => {
        this.incidentForm.patchValue({ emergency_escalation_notified: true });
      }
    });
  }

  saveForm(): void {
    if (this.incidentForm.invalid) return;
    this.isSaving.set(true);
    const formVal = this.incidentForm.getRawValue();

    if (this.isEditMode() && this.incidentId()) {
      this.constructionService.updateSafetyIncident(this.incidentId()!, formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/safety-ncr']);
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.constructionService.createSafetyIncident(formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/safety-ncr']);
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
