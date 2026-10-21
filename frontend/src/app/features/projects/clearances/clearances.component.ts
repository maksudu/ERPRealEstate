import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project, AuthorityClearance } from '../../../core/models/project.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomButtonComponent 
} from '../../../shared/components';

@Component({
  selector: 'app-project-clearances',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent
  ],
  templateUrl: './clearances.component.html'
})
export class ClearancesComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  clearances = signal<AuthorityClearance[]>([]);
  selectedProjectId = signal<number | null>(null);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  saveError = signal<string>('');
  isEditModalOpen = signal<boolean>(false);
  selectedClearance = signal<AuthorityClearance | null>(null);

  editForm: FormGroup = this.fb.group({
    status: ['NOT_APPLIED', Validators.required],
    application_memo_no: [''],
    approved_memo_no: [''],
    approval_date: [''],
    document_url: [''],
    approval_evidence_verified: [false],
    expiry_date: [''],
    remarks: ['']
  });

  ngOnInit(): void {
    this.editForm.get('status')?.valueChanges.subscribe(() => {
      this.saveError.set('');
      this.updateApprovalEvidenceValidators();
    });
    this.updateApprovalEvidenceValidators();
    this.loadProjects();
    this.loadClearances();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (data.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(data[0].id);
          this.loadClearances();
        }
      }
    });
  }

  loadClearances(): void {
    this.isLoading.set(true);
    const pId = this.selectedProjectId();
    this.projectService.getClearances(pId ? { project_id: pId } : undefined).subscribe({
      next: (data) => {
        this.clearances.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onProjectFilterChange(event: any): void {
    const val = event.target.value ? Number(event.target.value) : null;
    this.selectedProjectId.set(val);
    this.loadClearances();
  }

  openEditModal(cl: AuthorityClearance): void {
    this.selectedClearance.set(cl);
    this.editForm.patchValue({
      status: cl.status,
      application_memo_no: cl.application_memo_no || '',
      approved_memo_no: cl.approved_memo_no || '',
      approval_date: cl.approval_date || '',
      document_url: cl.document_url || '',
      approval_evidence_verified: cl.approval_evidence_verified ?? false,
      expiry_date: cl.expiry_date || '',
      remarks: cl.remarks || ''
    });
    this.saveError.set('');
    this.updateApprovalEvidenceValidators();
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedClearance.set(null);
    this.saveError.set('');
  }

  requiresApprovalEvidence(): boolean {
    return this.editForm.get('status')?.value === 'APPROVED';
  }

  isUnverifiedApproval(clearance: AuthorityClearance): boolean {
    return clearance.status === 'APPROVED' && clearance.approval_evidence_verified !== true;
  }

  private updateApprovalEvidenceValidators(): void {
    const required = this.requiresApprovalEvidence();
    ['approved_memo_no', 'approval_date', 'document_url', 'approval_evidence_verified'].forEach(fieldName => {
      const control = this.editForm.get(fieldName);
      if (!control) return;
      if (required) {
        const validators = fieldName === 'approval_evidence_verified'
          ? [Validators.requiredTrue]
          : [Validators.required];
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

  submitUpdate(): void {
    const cl = this.selectedClearance();
    if (!cl) return;

    this.saveError.set('');
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      if (this.requiresApprovalEvidence()) {
        this.saveError.set('APPROVED requires an approval memo number, approval date, official document URL, and checked verification attestation.');
      }
      return;
    }

    this.isSubmitting.set(true);
    const f = this.editForm.value;
    const payload = {
      status: f.status,
      application_memo_no: f.application_memo_no || null,
      approved_memo_no: f.approved_memo_no || null,
      approval_date: f.approval_date || null,
      document_url: f.document_url || null,
      approval_evidence_verified: f.approval_evidence_verified === true,
      expiry_date: f.expiry_date || null,
      remarks: f.remarks || null
    };

    this.projectService.updateClearance(cl.id, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeEditModal();
        this.loadClearances();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.saveError.set(this.apiErrorMessage(err));
      }
    });
  }

  private apiErrorMessage(err: any): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (detail !== undefined) return JSON.stringify(detail);
    return 'The clearance could not be updated. Check the fields and try again.';
  }

  getClearanceLabel(type: string): string {
    const map: Record<string, string> = {
      LUC: 'Land Use Clearance (LUC)',
      BUILDING_PLAN: 'RAJUK / CDA Building Plan Approval',
      FIRE_NOC: 'Fire Service & Civil Defence NOC',
      AVIATION_HEIGHT: 'Civil Aviation Height Clearance',
      ENVIRONMENTAL: 'Department of Environment Clearance',
      WASA: 'Water & Sewerage Authority (WASA) NOC'
    };
    return map[type] || type;
  }
}
