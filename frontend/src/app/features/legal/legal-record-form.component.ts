import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LegalArea, LegalRecord, LEGAL_AREA_LABELS } from '../../core/models/legal.model';
import { LegalService } from '../../core/services/legal.service';
import { ProjectService } from '../../core/services/project.service';
import { Project } from '../../core/models/project.model';
import { CardContainerComponent, CustomButtonComponent, CustomInputComponent, CustomTextareaComponent, SearchableSelectComponent } from '../../shared/components';
import { LEGAL_RECORD_FIELDS, LegalField } from './legal-record-fields';

@Component({
  selector: 'app-legal-record-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent, CustomButtonComponent, CustomInputComponent, CustomTextareaComponent, SearchableSelectComponent],
  templateUrl: './legal-record-form.component.html'
})
export class LegalRecordFormComponent implements OnInit {
  private legalService = inject(LegalService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  area!: LegalArea;
  recordId: number | null = null;
  fields: LegalField[] = [];
  projectOptions: { value: number; label: string }[] = [];
  data: Record<string, any> = {};
  base: { title: string; reference_no: string; project_id: string | number | null; status: string; due_date: string } = {
    title: '', reference_no: '', project_id: null, status: '', due_date: ''
  };
  isLoading = false;
  isSaving = false;
  isReadOnly = false;
  error = '';
  readonly labels = LEGAL_AREA_LABELS;

  get pageTitle(): string {
    return this.isReadOnly ? 'Record details' : this.recordId ? 'Edit record' : 'New record';
  }

  ngOnInit(): void {
    const areaParam = this.route.snapshot.paramMap.get('area') as LegalArea;
    if (!areaParam || !(areaParam in LEGAL_RECORD_FIELDS)) {
      this.router.navigateByUrl('/legal/dashboard');
      return;
    }
    this.area = areaParam;
    this.projectService.getProjects().subscribe({
      next: (projects: Project[]) => this.projectOptions = projects.map(project => ({ value: project.id, label: project.project_name + " (" + project.project_code + ")" })),
      error: () => this.projectOptions = []
    });
    this.fields = LEGAL_RECORD_FIELDS[this.area];
    if (this.area === 'land_use_clearance') {
      const authorityKeys = new Set(['approval_category', 'authority', 'authority_office', 'land_use_type', 'parcel_reference', 'application_number', 'application_submission_date', 'approval_number', 'issue_date', 'validity_period', 'expiry_date', 'approved_drawings', 'approved_project_parameters', 'amendments', 'responsible_officer', 'application_documents', 'approval_letter_reference', 'drawing_document_references']);
      this.fields.forEach(field => field.section = authorityKeys.has(field.key) ? 'Approval register' : field.key === 'conditions' ? 'Conditions and review' : 'Documented legal review');
    }
    if (this.area === 'approval_condition') {
      const ownershipKeys = new Set(['approval_reference', 'condition_text', 'source_reference', 'responsible_department', 'owner']);
      const evidenceKeys = new Set(['evidence_required', 'evidence_reference', 'verification_reviewer', 'verification_date']);
      this.fields.forEach(field => field.section = ownershipKeys.has(field.key) ? 'Condition and responsibility' : evidenceKeys.has(field.key) ? 'Evidence and verification' : 'Escalation and exceptions');
    }
    if (this.area === 'developer_registration') {
      const registrationKeys = new Set(['legal_entity', 'registration_type', 'registration_authority', 'registration_number', 'issue_date', 'effective_date', 'expiry_date', 'renewal_due_date', 'applicable_territory', 'responsible_department', 'responsible_officer', 'renewal_requirements', 'renewal_supporting_documents', 'application_submission_date', 'application_reference', 'registration_fee_bdt', 'fee_payment_evidence', 'certificate_reference', 'verification_record']);
      const renewalKeys = new Set(['renewal_reminder_intervals', 'reminder_channel_primary', 'reminder_channel_secondary', 'reminder_channel_tertiary', 'escalation_officer', 'auto_assign_renewal_task', 'renewal_task_owner', 'missing_documents', 'renewal_submission_approval_history']);
      this.fields.forEach(field => field.section = registrationKeys.has(field.key) ? 'Registration master' : renewalKeys.has(field.key) ? 'Renewal tracking' : 'Continuing obligations and review');
    }
    if (this.area === 'registered_record') {
      const deedKeys = new Set(['deed_type', 'registration_reference', 'deed_number', 'deed_date', 'registration_office', 'deed_parties', 'parcel_reference', 'mouza', 'jl_number', 'dag_numbers', 'khatian_number', 'transferred_area', 'ownership_share', 'transaction_reference', 'previous_deed_references', 'supporting_document_references', 'legal_review_status', 'discrepancies', 'registration_verified', 'registration_verified_by', 'registration_verified_date', 'registration_verification_reference']);
      const mutationKeys = new Set(['survey_record_type', 'recorded_owners', 'mutation_application_number', 'mutation_application_date', 'land_office', 'mutation_hearing_date', 'mutation_application_status', 'mutation_supporting_evidence', 'mutation_outcome', 'updated_record_reference', 'mutation_follow_up', 'mutation_discrepancies']);
      const taxKeys = new Set(['land_tax_owner', 'tax_period', 'assessment_reference', 'land_tax_amount', 'land_tax_payment_date', 'tax_receipt_reference', 'tax_receipt_evidence', 'confirmed_outstanding_amount', 'tax_reconciliation_status', 'next_tax_reminder_date']);
      this.fields.forEach(field => field.section = field.key === 'record_type' ? 'Record classification' : deedKeys.has(field.key) ? 'Deed and registration' : mutationKeys.has(field.key) ? 'Khatian and mutation' : taxKeys.has(field.key) ? 'Land development tax' : undefined);
    }
    this.recordId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isReadOnly = !!this.recordId && !this.route.snapshot.url.some(segment => segment.path === 'edit');
    this.data = Object.fromEntries(this.fields.map(field => [field.key, field.type === 'checkbox' ? false : '']));
    if (this.area === 'developer_registration') this.data['renewal_reminder_intervals'] = '90, 60, 30, 15, 7';
    if (this.recordId) this.loadRecord();
  }

  private loadRecord(): void {
    this.isLoading = true;
    this.legalService.getRecord(this.recordId!).subscribe({
      next: record => {
        if (record.area !== this.area) {
          this.router.navigate(['/legal/records', record.area, record.id]);
          return;
        }
        this.base = {
          title: record.title,
          reference_no: record.reference_no || '',
          project_id: record.project_id ?? null,
          status: record.status || '',
          due_date: record.due_date || ''
        };
        this.data = { ...this.data, ...(record.data || {}) };
        if (Array.isArray(this.data['conditions'])) {
          this.data['conditions'] = this.data['conditions']
            .map((condition: any) => `${condition.owner || ''} | ${condition.deadline || ''} | ${condition.description || ''}`)
            .join('\n');
        }
        this.isLoading = false;
      },
      error: () => {
        this.error = 'This record could not be loaded. It may have been removed or access is restricted.';
        this.isLoading = false;
      }
    });
  }

  fieldLabel(field: LegalField): string {
    return field.label;
  }

  save(): void {
    if (this.isReadOnly || this.isSaving) return;
    if (!this.base.title.trim()) {
      this.error = 'A record title is required.';
      return;
    }
    const payloadData: Record<string, any> = { ...this.data };
    if (typeof payloadData['conditions'] === 'string') {
      payloadData['conditions'] = payloadData['conditions'].split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string) => {
          const [owner = '', deadline = '', ...description] = line.split('|').map((part: string) => part.trim());
          return { owner, deadline, description: description.join(' | ') };
        });
    }
    this.fields.forEach(field => {
      if (payloadData[field.key] === '') delete payloadData[field.key];
    });
    if (this.area === 'developer_registration') {
      this.base.due_date = payloadData['expiry_date'] || payloadData['renewal_due_date'] || payloadData['review_date'] || '';
    } else if (this.area === 'land_use_clearance') {
      this.base.due_date = payloadData['expiry_date'] || '';
    } else if (this.area === 'noc_correspondence') {
      this.base.due_date = payloadData['response_due_date'] || '';
    }
    const payload: Partial<LegalRecord> = {
      area: this.area,
      title: this.base.title.trim(),
      reference_no: this.base.reference_no.trim() || null,
      project_id: this.base.project_id === '' || this.base.project_id === null ? null : Number(this.base.project_id),
      status: this.base.status || null,
      due_date: this.base.due_date || null,
      data: payloadData
    };
    this.error = '';
    this.isSaving = true;
    const request = this.recordId
      ? this.legalService.updateRecord(this.recordId, payload)
      : this.legalService.createRecord(payload);
    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.router.navigate(['/legal/records', this.area]);
      },
      error: err => {
        this.isSaving = false;
        this.error = err?.error?.detail || 'The record could not be saved.';
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/legal/records', this.area]);
  }

  edit(): void {
    if (this.recordId) this.router.navigate(['/legal/records', this.area, this.recordId, 'edit']);
  }
}
