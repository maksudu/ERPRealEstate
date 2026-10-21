import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, AuthorityClearance } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-approval-form',
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
            routerLink="/projects/regulatory-approvals"
            class="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Back to Approvals Vault"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                Submodule 2.8
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Edit Permit #' + clearanceId() : 'New Authority Clearance' }}
              </span>
            </div>
            <h1 class="text-lg font-bold text-foreground font-display mt-0.5">
              {{ isEditMode() ? 'Edit Statutory Regulatory Approval' : 'Record Statutory Regulatory Approval & Sanction' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <a
            routerLink="/projects/regulatory-approvals"
            class="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            [variant]="'primary'"
            [loading]="saving()"
            (buttonClick)="saveClearance()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditMode() ? 'Update Approval Record' : 'Save Approval Record' }}
          </app-custom-button>
        </div>
      </div>

      <!-- Critical Regulatory Notice -->
      <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-start gap-2.5">
        <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <strong>Regulatory Compliance Protocol (Bangladesh Jurisdiction):</strong>
          Bangladesh National Building Code 2020 (BNBC 2020) and other authority-specific requirements vary by jurisdiction and clearance type; confirm applicability with the competent authority. Submitting an application does NOT constitute approval. Construction teams must only build against currently authorized, version-controlled drawing sets.
        </div>
      </div>

      <!-- Main Form -->
      <form [formGroup]="form" class="space-y-6">
        <!-- Section 1: Authority & Scope Association -->
        <app-card-container
          title="1. Authority & Approval Scope"
          subtitle="Configure competent jurisdiction (RAJUK, CDA, KDA, RDA, FSCD, DoE, CAAB, WASA) and sanction category"
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
              label="Competent Regulatory Authority"
              [options]="authorityOptions"
              [searchable]="true"
              formControlName="authority_name"
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Approval Category"
              [options]="categoryOptions"
              formControlName="approval_category"
            ></app-searchable-select>

            <app-searchable-select
              label="Specific Clearance Type"
              [options]="clearanceTypeOptions"
              formControlName="clearance_type_id"
              [required]="true"
              (ngModelChange)="onClearanceTypeSelected($event)"
            ></app-searchable-select>
          </div>

          <div *ngIf="selectedProjectAuthority()" class="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            Project jurisdiction: <strong class="text-foreground">{{ selectedProjectAuthority() }}</strong>.
            Authority is suggested by clearance type; confirm the competent authority and applicability for this project.
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <app-custom-input
              label="Internal Reference ID"
              formControlName="reference_no"
              placeholder="e.g. CLR-2026-RAJUK-BP-01"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Official Regulatory Status"
              [options]="statusOptions"
              formControlName="status"
              [required]="true"
            ></app-searchable-select>
          </div>
        </app-card-container>

        <!-- Section 2: Application, Sanction Memos & Dates -->
        <app-card-container
          title="2. Submissions, Official Memos & Validity Schedule"
          subtitle="Authority submission numbers, official sanction gazettes, and renewal timelines"
        >
          <div *ngIf="requiresApprovalEvidence()" class="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            APPROVED requires an official approval memo number, approval date, and an official approval document URL.
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Submission Column -->
            <div class="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-3">
              <span class="text-xs font-bold text-foreground uppercase tracking-wider">Application Tracking</span>
              <app-custom-input
                label="Authority Application / Memo No"
                formControlName="application_memo_no"
                placeholder="e.g. RAJUK/BP/2026/1029"
              ></app-custom-input>
              <app-custom-input
                label="Submission Date"
                type="date"
                formControlName="submission_date"
              ></app-custom-input>
            </div>

            <!-- Approval Column -->
            <div class="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-3">
              <span class="text-xs font-bold text-foreground uppercase tracking-wider">Official Sanction Memo</span>
              <app-custom-input
                label="Approved Sanction Memo No"
                formControlName="approved_memo_no"
                [required]="requiresApprovalEvidence()"
                placeholder="e.g. RAJUK/SANCTION/8812"
              ></app-custom-input>
              <app-custom-input
                label="Approval / Sanction Date"
                type="date"
                formControlName="approval_date"
                [required]="requiresApprovalEvidence()"
              ></app-custom-input>
            </div>

            <!-- Expiry & Renewal Column -->
            <div class="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-3">
              <span class="text-xs font-bold text-foreground uppercase tracking-wider">Validity & Expiry Monitoring</span>
              <app-custom-input
                label="Expiry Date (If Applicable)"
                type="date"
                formControlName="expiry_date"
              ></app-custom-input>
              <div class="grid grid-cols-2 gap-2">
                <app-custom-input
                  label="Validity (Months)"
                  type="number"
                  formControlName="validity_months"
                ></app-custom-input>
                <app-custom-input
                  label="Reminder (Days)"
                  type="number"
                  formControlName="renewal_reminder_days"
                ></app-custom-input>
              </div>
            </div>
          </div>
        </app-card-container>

        <!-- Section 3: Statutory Specifications & Sanctioned Parameters -->
        <app-card-container
          title="3. Statutory Sanction Attributes & Fees"
          subtitle="Permitted building height, sanctioned floors configuration, and government renewal fees"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-custom-input
              label="Sanctioned Floors Configuration"
              formControlName="sanctioned_floors"
              placeholder="e.g. 2 Basement + Ground + 14 Floors"
            ></app-custom-input>

            <app-custom-input
              label="Sanctioned Height (Meters - CAAB)"
              type="number"
              formControlName="sanctioned_height_m"
              placeholder="e.g. 45.00"
            ></app-custom-input>

            <app-custom-input
              label="Renewal / Sanction Fee (BDT)"
              type="number"
              formControlName="renewal_fee_bdt"
              placeholder="e.g. 250000"
            ></app-custom-input>

            <app-searchable-select
              label="Renewal Alert Status"
              [options]="renewalStatusOptions"
              formControlName="renewal_alert_status"
            ></app-searchable-select>
          </div>
        </app-card-container>

        <!-- Section 4: Responsibility, Contact Officers & Next Action -->
        <app-card-container
          title="4. Compliance Responsibility & Next Actionable Step"
          subtitle="Assigned in-house compliance officer, authority desk official, and next mandatory action"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <app-custom-input
              label="Assigned Compliance Officer (In-House)"
              formControlName="responsible_officer"
              placeholder="e.g. Town Planner S. Rahman"
            ></app-custom-input>

            <app-custom-input
              label="Authority Contact Officer Name"
              formControlName="contact_officer_name"
              placeholder="e.g. Authorised Officer Zone-4"
            ></app-custom-input>

            <app-custom-input
              label="Authority Contact Officer Phone"
              formControlName="contact_officer_phone"
              placeholder="e.g. +880 1711-000000"
            ></app-custom-input>
          </div>

          <div class="mt-4">
            <app-custom-input
              label="Next Mandatory Action / Follow-up Step"
              formControlName="next_action"
              placeholder="e.g. Plinth casting site inspection checklist required before 2nd floor slab pouring..."
            ></app-custom-input>
          </div>
        </app-card-container>

        <!-- Section 5: Documents, Evidence & Conditions Remarks -->
        <app-card-container
          title="5. Submission Package, Authorized Drawings & Conditions"
          subtitle="Document URLs for submission dossier, sanctioned architectural set, and statutory conditions"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <app-custom-input
              label="Official Approval Document URL"
              formControlName="document_url"
              [required]="requiresApprovalEvidence()"
              placeholder="e.g. https://storage.corp/approvals/rajuk-sanction-8812.pdf"
            ></app-custom-input>

            <app-custom-textarea
              label="Approval Conditions & Legal Remarks"
              formControlName="remarks"
              [rows]="3"
              placeholder="Record mandatory conditions attached to permit (e.g. 5m front setback, dedicated 500 KVA substation space, dual exit fire stairs)..."
            ></app-custom-textarea>
          </div>
        </app-card-container>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-3 pt-4">
          <a
            routerLink="/projects/regulatory-approvals"
            class="px-5 py-2.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            [variant]="'primary'"
            [loading]="saving()"
            (buttonClick)="saveClearance()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditMode() ? 'Update Regulatory Approval' : 'Save Regulatory Approval' }}
          </app-custom-button>
        </div>
      </form>
    </div>
  `
})
export class ApprovalFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  clearanceId = signal<number | null>(null);
  saving = signal<boolean>(false);
  projects = signal<Project[]>([]);

  authorityOptions: SelectOption[] = [
    { value: 'RAJUK', label: 'RAJUK (Rajdhani Unnayan Kartripakkha - Dhaka)' },
    { value: 'CDA', label: 'CDA (Chittagong Development Authority)' },
    { value: 'KDA', label: 'KDA (Khulna Development Authority)' },
    { value: 'RDA', label: 'RDA (Rajshahi Development Authority)' },
    { value: 'FSCD', label: 'FSCD (Fire Service and Civil Defence)' },
    { value: 'DoE', label: 'DoE (Department of Environment)' },
    { value: 'CAAB', label: 'CAAB (Civil Aviation Authority of Bangladesh)' },
    { value: 'WASA', label: 'Dhaka WASA / Water & Sewerage' },
    { value: 'DESCO_DPDC', label: 'DESCO / DPDC Electric Utility' },
    { value: 'TITAS_GAS', label: 'Titas Gas Transmission & Distribution' }
  ];

  categoryOptions: SelectOption[] = [
    { value: 'LAND_USE_PERMIT', label: 'Land-Use & Development Permission (LUC)' },
    { value: 'BUILDING_PLAN', label: 'Building Plan Approval' },
    { value: 'DRAWING_APPROVAL', label: 'Architectural & Structural Drawing Approvals' },
    { value: 'FIRE_SAFETY_CLEARANCE', label: 'Fire-Safety Clearances & NOC' },
    { value: 'ENVIRONMENTAL_CLEARANCE', label: 'Environmental Clearance (ECC)' },
    { value: 'UTILITY_SERVICE', label: 'Utility & Service Connections (WASA/DPDC)' },
    { value: 'CONSTRUCTION_INSPECTION', label: 'Construction-Stage Inspections' },
    { value: 'OCCUPANCY_CERTIFICATE', label: 'Occupancy & Completion Certificate (OC)' }
  ];

  clearanceTypeOptions: SelectOption[] = [
    { value: 'LUC', label: 'LUC — Land Use Clearance' },
    { value: 'BUILDING_PLAN', label: 'Building Plan Sanction' },
    { value: 'FIRE_NOC', label: 'Fire Safety NOC' },
    { value: 'AVIATION_HEIGHT', label: 'Aviation Height Sanction (CAAB)' },
    { value: 'ENVIRONMENTAL', label: 'DoE Environmental Clearance' },
    { value: 'WASA', label: 'WASA Sewerage & Water Sanction' },
    { value: 'DESCO_DPDC', label: 'DESCO/DPDC Substation Space & Load' },
    { value: 'CONSTRUCTION_INSPECTION', label: 'Construction Stage Inspection' },
    { value: 'OCCUPANCY_CERT', label: 'Occupancy Certificate (OC)' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'DRAFT', label: 'Draft / Preparation' },
    { value: 'NOT_APPLIED', label: 'Not Applied' },
    { value: 'SUBMITTED', label: 'Submitted to Authority' },
    { value: 'QUERY_RAISED', label: 'Query Raised / Modification Required' },
    { value: 'IN_REVIEW', label: 'Under Authority Review' },
    { value: 'APPROVED', label: 'Approved & Sanctioned' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'EXPIRED', label: 'Expired (Renewal Needed)' },
    { value: 'RENEWAL_PENDING', label: 'Renewal Application Pending' }
  ];

  renewalStatusOptions: SelectOption[] = [
    { value: 'VALID', label: 'Valid & Active' },
    { value: 'EXPIRING_SOON', label: 'Expiring Soon (Within 30 Days)' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'RENEWAL_SUBMITTED', label: 'Renewal Submitted' }
  ];

  projectOptions = computed<SelectOption[]>(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }))
  );

  form: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    reference_no: ['', Validators.required],
    clearance_type_id: ['BUILDING_PLAN', Validators.required],
    approval_category: ['BUILDING_PLAN'],
    authority_name: ['RAJUK', Validators.required],
    application_memo_no: [''],
    approved_memo_no: [''],
    submission_date: [''],
    approval_date: [''],
    expiry_date: [''],
    validity_months: [12],
    renewal_reminder_days: [30],
    renewal_fee_bdt: [0],
    renewal_alert_status: ['VALID'],
    sanctioned_floors: [''],
    sanctioned_height_m: [null],
    responsible_officer: [''],
    contact_officer_name: [''],
    contact_officer_phone: [''],
    next_action: [''],
    status: ['SUBMITTED', Validators.required],
    document_url: [''],
    remarks: ['']
  });

  ngOnInit(): void {
    this.form.get('status')?.valueChanges.subscribe(() => this.updateApprovalEvidenceValidators());
    this.updateApprovalEvidenceValidators();
    this.loadProjects();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.clearanceId.set(Number(id));
      this.loadClearance(Number(id));
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (!this.isEditMode() && data.length > 0 && !this.form.get('project_id')?.value) {
          this.form.patchValue({ project_id: data[0].id }, { emitEvent: false });
          this.form.patchValue({ reference_no: `CLR-${data[0].project_code}-BP-01` });
          this.applyRecommendedAuthority(data[0], this.form.get('clearance_type_id')?.value);
        }
      }
    });
  }

  onProjectSelected(projectId: any): void {
    const proj = this.projects().find(p => p.id === Number(projectId));
    if (proj) {
      this.applyRecommendedAuthority(proj, this.form.get('clearance_type_id')?.value);
    }
    if (proj && !this.isEditMode()) {
      const type = this.form.get('clearance_type_id')?.value || 'PERMIT';
      this.form.patchValue({ reference_no: `CLR-${proj.project_code}-${type}-01` });
    }
  }

  onClearanceTypeSelected(clearanceTypeId: string): void {
    const project = this.projects().find(p => p.id === Number(this.form.get('project_id')?.value));
    if (project) {
      this.applyRecommendedAuthority(project, clearanceTypeId);
    }
  }

  selectedProjectAuthority(): string {
    const project = this.projects().find(p => p.id === Number(this.form.get('project_id')?.value));
    if (!project?.development_authority_id) return '';
    const authority = project.development_authority_id.toUpperCase();
    return this.authorityOptions.find(option => option.value === authority)?.label || authority;
  }

  requiresApprovalEvidence(): boolean {
    return this.form.get('status')?.value === 'APPROVED';
  }

  private applyRecommendedAuthority(project: Project, clearanceTypeId: string): void {
    const projectAuthority = (project.development_authority_id || 'RAJUK').toUpperCase();
    const authorityByType: Record<string, string> = {
      LUC: projectAuthority,
      BUILDING_PLAN: projectAuthority,
      DRAWING_APPROVAL: projectAuthority,
      CONSTRUCTION_INSPECTION: projectAuthority,
      OCCUPANCY_CERT: projectAuthority,
      FIRE_NOC: 'FSCD',
      AVIATION_HEIGHT: 'CAAB',
      ENVIRONMENTAL: 'DoE',
      WASA: 'WASA',
      DESCO_DPDC: 'DESCO_DPDC'
    };
    this.form.patchValue({
      authority_name: authorityByType[clearanceTypeId] || projectAuthority
    }, { emitEvent: false });
  }

  private updateApprovalEvidenceValidators(): void {
    const required = this.requiresApprovalEvidence();
    ['approved_memo_no', 'approval_date', 'document_url'].forEach(fieldName => {
      const control = this.form.get(fieldName);
      if (!control) return;
      if (required) {
        const validators = [Validators.required];
        if (fieldName === 'document_url') {
          validators.push(Validators.pattern(/^https?:\/\/\S+$/i));
        }
        control.setValidators(validators);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  loadClearance(id: number): void {
    this.projectService.getClearanceById(id).subscribe({
      next: (c: AuthorityClearance) => {
        this.form.patchValue({
          project_id: c.project_id,
          reference_no: c.reference_no,
          clearance_type_id: c.clearance_type_id,
          approval_category: c.approval_category || 'BUILDING_PLAN',
          authority_name: c.authority_name,
          application_memo_no: c.application_memo_no,
          approved_memo_no: c.approved_memo_no,
          submission_date: c.submission_date ? c.submission_date.substring(0, 10) : '',
          approval_date: c.approval_date ? c.approval_date.substring(0, 10) : '',
          expiry_date: c.expiry_date ? c.expiry_date.substring(0, 10) : '',
          validity_months: c.validity_months || 12,
          renewal_reminder_days: c.renewal_reminder_days || 30,
          renewal_fee_bdt: c.renewal_fee_bdt || 0,
          renewal_alert_status: c.renewal_alert_status || 'VALID',
          sanctioned_floors: c.sanctioned_floors,
          sanctioned_height_m: c.sanctioned_height_m,
          responsible_officer: c.responsible_officer,
          contact_officer_name: c.contact_officer_name,
          contact_officer_phone: c.contact_officer_phone,
          next_action: c.next_action,
          status: c.status,
          document_url: c.document_url,
          remarks: c.remarks
        }, { emitEvent: false });
        this.updateApprovalEvidenceValidators();
      }
    });
  }

  saveClearance(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = { ...this.form.value };
    payload.project_id = Number(payload.project_id);
    payload.validity_months = Number(payload.validity_months || 12);
    payload.renewal_reminder_days = Number(payload.renewal_reminder_days || 30);
    payload.renewal_fee_bdt = Number(payload.renewal_fee_bdt || 0);
    payload.sanctioned_height_m = payload.sanctioned_height_m ? Number(payload.sanctioned_height_m) : null;

    if (this.isEditMode() && this.clearanceId()) {
      this.projectService.updateClearance(this.clearanceId()!, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects/regulatory-approvals']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err.error?.detail || 'Failed to update clearance record.');
        }
      });
    } else {
      this.projectService.createClearance(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects/regulatory-approvals']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err.error?.detail || 'Failed to record clearance.');
        }
      });
    }
  }
}
