import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LegalArea, LegalRecord, LEGAL_AREA_LABELS } from '../../core/models/legal.model';
import { LegalService } from '../../core/services/legal.service';
import { ProjectService } from '../../core/services/project.service';
import { Project } from '../../core/models/project.model';
import { SalesService } from '../../core/services/sales.service';
import { InstallmentService } from '../../core/services/installment.service';
import { CrmService } from '../../core/services/crm.service';
import { Booking, LegalDocumentTemplate, PropertyHandover } from '../../core/models/sales.model';
import { BookingInstallmentSchedule } from '../../core/models/installment.model';
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
  private salesService = inject(SalesService);
  private installmentService = inject(InstallmentService);
  private crmService = inject(CrmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  area!: LegalArea;
  recordId: number | null = null;
  fields: LegalField[] = [];
  projectOptions: { value: number; label: string }[] = [];
  bookingOptions: { value: number; label: string }[] = [];
  installmentScheduleOptions: { value: number; label: string }[] = [];
  handoverOptions: { value: number; label: string }[] = [];
  deedRecordOptions: { value: number; label: string }[] = [];
  saleAgreementOptions: { value: number; label: string }[] = [];
  salesTemplateOptions: { value: number; label: string }[] = [];
  private bookings: Booking[] = [];
  private schedules: BookingInstallmentSchedule[] = [];
  private handovers: PropertyHandover[] = [];
  private salesTemplates: LegalDocumentTemplate[] = [];
  private deedRecords: LegalRecord[] = [];
  private saleAgreementRecords: LegalRecord[] = [];
  data: Record<string, any> = {};
  base: { title: string; reference_no: string; project_id: string | number | null; status: string; due_date: string } = {
    title: '', reference_no: '', project_id: null, status: '', due_date: ''
  };
  isLoading = false;
  isSaving = false;
  isGeneratingDocument = false;
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
    if (this.area === 'sale_transfer') this.loadSaleTransferSources();
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
        if (this.area === 'sale_transfer') {
          this.data['current_version_number'] = this.data['agreement_version_number'] || 1;
          this.data['previous_versions_summary'] = this.formatVersionHistory(this.data['agreement_version_history']);
          const bookingId = Number(this.data['booking_id']);
          if (bookingId) this.salesService.getBooking(bookingId).subscribe({ next: booking => this.loadBookingRelatedOptions(booking) });
        }
        if (this.area === 'litigation_notice') {
          this.data['case_status_history_summary'] = this.formatAuditHistory(this.data['case_status_history'], 'status');
          this.data['legal_hold_history_summary'] = this.formatAuditHistory(this.data['legal_hold_history'], 'hold');
        }
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

  optionsForSource(source?: LegalField['source']): { value: number; label: string }[] {
    switch (source) {
      case 'booking': return this.bookingOptions;
      case 'installment_schedule': return this.installmentScheduleOptions;
      case 'handover': return this.handoverOptions;
      case 'deed_record': return this.deedRecordOptions;
      case 'sale_agreement': return this.saleAgreementOptions;
      case 'sales_template': return this.salesTemplateOptions;
      default: return [];
    }
  }

  onLinkedFieldChange(fieldKey: string, value: unknown): void {
    if (fieldKey === 'booking_id') {
      const bookingId = Number(value);
      if (!bookingId) return;
      this.data['booking_id'] = bookingId;
      this.salesService.getBooking(bookingId).subscribe({
        next: booking => this.applyBooking(booking),
        error: () => this.error = 'The selected booking could not be loaded from Sales.'
      });
      return;
    }

    if (fieldKey === 'payment_schedule_id') {
      const schedule = this.schedules.find(item => item.id === Number(value));
      this.data['payment_schedule_id'] = value ? Number(value) : null;
      this.data['payment_schedule_reference'] = schedule?.schedule_code || '';
      this.data['payment_total_paid_bdt'] = schedule?.total_paid ?? schedule?.total_paid_amount ?? '';
      this.data['payment_balance_bdt'] = schedule?.total_outstanding ?? schedule?.total_balance_due ?? '';
      return;
    }

    if (fieldKey === 'handover_record_id') {
      const handover = this.handovers.find(item => item.id === Number(value));
      this.data['handover_record_id'] = value ? Number(value) : null;
      this.data['handover_status_snapshot'] = handover?.status || '';
      this.data['handover_certificate_reference'] = handover?.handover_certificate_no || handover?.possession_certificate_url || '';
      return;
    }

    if (fieldKey === 'deed_record_id') {
      const deed = this.deedRecords.find(item => item.id === Number(value));
      this.data['deed_record_id'] = value ? Number(value) : null;
      this.data['registration_deed_number'] = deed?.data?.['registered_deed_number'] || deed?.data?.['deed_number'] || deed?.reference_no || '';
      this.data['deed_registration_status'] = deed?.status || '';
      return;
    }

    if (fieldKey === 'source_agreement_record_id') {
      this.data[fieldKey] = value ? Number(value) : null;
      const sourceAgreement = this.saleAgreementRecords.find(item => item.id === Number(value));
      if (sourceAgreement) {
        const linked = sourceAgreement.data || {};
        for (const key of ['booking_id', 'customer_id', 'customer_name', 'customer_reference', 'customer_phone', 'customer_nid', 'co_owner_details', 'booking_reference_no', 'project_reference', 'unit_id', 'unit_number', 'parking_bay_reference', 'agreed_price_bdt']) {
          if (linked[key] !== undefined) this.data[key] = linked[key];
        }
        this.base.project_id = sourceAgreement.project_id ?? null;
        const bookingId = Number(this.data['booking_id']);
        const booking = this.bookings.find(item => item.id === bookingId);
        if (booking) this.loadBookingRelatedOptions(booking);
        else if (bookingId) this.salesService.getBooking(bookingId).subscribe({ next: selectedBooking => this.loadBookingRelatedOptions(selectedBooking) });
      }
      return;
    }

    if (fieldKey === 'template_id') {
      const template = this.salesTemplates.find(item => item.id === Number(value));
      this.data['template_id'] = value ? Number(value) : null;
      this.data['template_version'] = template?.version || '';
      this.data['template_document_type'] = template?.document_type || '';
    }
  }

  openCustomerLedger(): void {
    const bookingId = Number(this.data['booking_id']);
    if (bookingId) this.router.navigate(['/installments/customer-ledger'], { queryParams: { booking_id: bookingId } });
  }

  openGeneratedDocument(): void {
    const documentId = Number(this.data['sales_legal_document_id']);
    if (documentId) this.router.navigate(['/sales/documents', documentId]);
  }

  get agreementVersionHistory(): any[] {
    const history = this.data['agreement_version_history'];
    return Array.isArray(history) ? history : [];
  }

  generateLinkedDocument(): void {
    if (!this.recordId || this.isGeneratingDocument || this.isReadOnly === false) return;
    if (String(this.data['execution_status'] || '').toUpperCase() === 'EXECUTED' || String(this.data['execution_status'] || '').toUpperCase() === 'ARCHIVED') {
      this.error = 'Executed agreements cannot generate a replacement draft. Create a controlled amendment or transfer request.';
      return;
    }
    if (this.data['sales_legal_document_id']) {
      this.router.navigate(['/sales/documents', this.data['sales_legal_document_id']]);
      return;
    }
    const bookingId = Number(this.data['booking_id']);
    const templateId = Number(this.data['template_id']);
    const template = this.salesTemplates.find(item => item.id === templateId && item.is_active);
    if (!bookingId || !template) {
      this.error = 'Choose an ERP booking and an active document template before generation.';
      return;
    }
    this.isGeneratingDocument = true;
    this.error = '';
    this.salesService.generateSalesDocument({
      booking_id: bookingId,
      template_id: templateId,
      document_type: template.document_type,
      custom_title: this.base.title,
      first_party_signatory_name: this.data['developer_signatory_name'] || undefined,
      second_party_signatory_name: this.data['customer_signatory_name'] || this.data['customer_name'] || undefined,
      execution_date: this.data['agreement_date'] || undefined,
      additional_clauses: this.data['handover_terms_reference'] || undefined,
      amendment_reason: this.data['request_summary'] || undefined
    }).subscribe({
      next: document => {
        const documentData = {
          ...this.data,
          sales_legal_document_id: document.id,
          sales_legal_document_number: document.document_number,
          template_version: template.version
        };
        this.legalService.updateRecord(this.recordId!, { data: documentData }).subscribe({
          next: () => {
            this.isGeneratingDocument = false;
            this.router.navigate(['/sales/documents', document.id]);
          },
          error: () => {
            this.isGeneratingDocument = false;
            this.error = `Document ${document.document_number} was generated but could not be linked to this legal record. Open the sales document and record its reference.`;
          }
        });
      },
      error: err => {
        this.isGeneratingDocument = false;
        this.error = err?.error?.detail || 'The document could not be generated from the selected template.';
      }
    });
  }

  private loadSaleTransferSources(): void {
    this.salesService.getBookings({ limit: 250, offset: 0 }).subscribe({
      next: bookings => {
        this.bookings = bookings || [];
        this.bookingOptions = this.bookings.map(booking => ({
          value: booking.id,
          label: `${booking.booking_reference_no} · ${booking.customer_name || 'Customer'} · ${booking.project_name || 'Project'} · ${booking.unit_number || 'Unit'}`
        }));
        const currentBookingId = Number(this.data['booking_id']);
        if (currentBookingId && !this.bookings.some(item => item.id === currentBookingId)) {
          this.salesService.getBooking(currentBookingId).subscribe({
            next: booking => {
              this.bookings = [...this.bookings, booking];
              this.bookingOptions = [...this.bookingOptions, { value: booking.id, label: `${booking.booking_reference_no} · ${booking.customer_name || 'Customer'} · ${booking.project_name || 'Project'} · ${booking.unit_number || 'Unit'}` }];
            }
          });
        }
      },
      error: () => this.error = 'ERP bookings could not be loaded.'
    });
    this.salesService.getDocumentTemplates().subscribe({
      next: templates => {
        this.salesTemplates = (templates || []).filter(template => template.is_active);
        this.salesTemplateOptions = this.salesTemplates.map(template => ({ value: template.id || 0, label: `${template.title_en} · ${template.version} · ${template.document_type}` }));
      }
    });
    this.legalService.listRecords({ area: 'registered_record', limit: 200, offset: 0 }).subscribe({
      next: page => {
        this.deedRecords = page.items || [];
        this.deedRecordOptions = this.deedRecords.map(record => ({ value: record.id, label: `${record.title} · ${record.reference_no || record.data?.['deed_number'] || 'No deed reference'}` }));
      }
    });
    this.legalService.listRecords({ area: 'sale_transfer', limit: 200, offset: 0 }).subscribe({
      next: page => {
        this.saleAgreementRecords = (page.items || []).filter(record =>
          (record.data?.['document_control_type'] || 'AGREEMENT') === 'AGREEMENT' &&
          ['EXECUTED', 'EXECUTED_SIGNED', 'ARCHIVED'].includes(String(record.data?.['execution_status'] || '').toUpperCase())
        );
        this.saleAgreementOptions = this.saleAgreementRecords.map(record => ({ value: record.id, label: `${record.title} · ${record.reference_no || record.data?.['sale_agreement_number'] || `#${record.id}`}` }));
      }
    });
  }

  private applyBooking(booking: Booking): void {
    this.data['booking_id'] = booking.id;
    this.data['customer_id'] = booking.primary_customer_id;
    this.data['customer_reference'] = String(booking.primary_customer_id);
    this.data['customer_name'] = booking.customer_name || '';
    this.data['customer_phone'] = booking.customer_phone || '';
    this.data['booking_reference_no'] = booking.booking_reference_no;
    this.data['project_reference'] = booking.project_name || '';
    this.data['unit_id'] = booking.unit_id;
    this.data['unit_number'] = booking.unit_number || '';
    this.data['parking_bay_reference'] = booking.parking_slot_number || '';
    this.data['agreed_price_bdt'] = booking.final_contract_value;
    this.data['co_owner_details'] = (booking.joint_buyers || []).map(buyer => `${buyer.full_name_en} · ${buyer.primary_phone} · ${buyer.share_percentage}%`).join('\n');
    this.base.project_id = booking.project_id;
    if (booking.primary_customer_id) {
      this.crmService.getCustomer(booking.primary_customer_id).subscribe({
        next: customer => this.data['customer_nid'] = customer.nid_number || customer.passport_number || ''
      });
    }
    this.loadBookingRelatedOptions(booking);
  }

  private loadBookingRelatedOptions(booking: Booking): void {
    this.installmentService.getCustomerLedger(booking.id).subscribe({
      next: ledger => {
        this.data['payment_history_reference'] = `${ledger.transactions?.length || 0} ledger entries · BDT ${ledger.total_paid || 0} received · BDT ${ledger.total_outstanding || 0} outstanding`;
        this.data['payment_total_paid_bdt'] = ledger.total_paid || 0;
        this.data['payment_balance_bdt'] = ledger.total_outstanding || 0;
      },
      error: () => this.data['payment_history_reference'] = 'Open the customer ledger to view receipt history.'
    });
    this.installmentService.getMasterSchedules({ booking_id: booking.id, limit: 100, offset: 0 }).subscribe({
      next: schedules => {
        this.schedules = schedules || [];
        this.installmentScheduleOptions = this.schedules.map(schedule => ({ value: schedule.id, label: `${schedule.schedule_code} · ${schedule.status} · BDT ${schedule.approved_contract_price}` }));
      },
      error: () => this.installmentScheduleOptions = []
    });
    this.salesService.getHandoversPaged({ search: booking.booking_reference_no, limit: 100, offset: 0 }).subscribe({
      next: page => {
        this.handovers = (page.items || []).filter(handover => handover.booking_id === booking.id);
        this.handoverOptions = this.handovers.map(handover => ({ value: handover.id, label: `${handover.handover_tracking_no} · ${handover.status}` }));
      },
      error: () => this.handoverOptions = []
    });
  }

  private formatVersionHistory(history: unknown): string {
    if (!Array.isArray(history)) return '';
    return history.map((item: any) => `Version ${item.version_number || '—'} · ${item.saved_at || 'date not recorded'} · ${item.changed_by || 'user'} · ${item.reference || 'Agreement snapshot'}`).join('\n');
  }

  private formatAuditHistory(history: unknown, kind: 'status' | 'hold'): string {
    if (!Array.isArray(history)) return '';
    return history.map((item: any) => kind === 'status'
      ? `${item.changed_at || 'Date not recorded'} · ${item.changed_by || 'User'} · ${item.from_case_status || item.from_record_status || 'New'} → ${item.to_case_status || item.to_record_status || 'Status updated'} · ${item.to_stage || ''}`
      : `${item.recorded_at || 'Date not recorded'} · ${item.action || 'Hold event'} · ${item.authorized_by || 'Approver not recorded'} · ${item.scope || item.reason || ''}`
    ).join('\n');
  }

  save(): void {
    if (this.isReadOnly || this.isSaving) return;
    if (!this.base.title.trim()) {
      this.error = 'A record title is required.';
      return;
    }
    const payloadData: Record<string, any> = { ...this.data };
    delete payloadData['agreement_version_history'];
    delete payloadData['agreement_version_number'];
    delete payloadData['previous_versions_summary'];
    delete payloadData['current_version_number'];
    delete payloadData['case_status_history'];
    delete payloadData['case_status_history_summary'];
    delete payloadData['legal_hold_history'];
    delete payloadData['legal_hold_history_summary'];
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
    } else if (this.area === 'sale_transfer') {
      this.base.due_date = payloadData['document_control_type'] && payloadData['document_control_type'] !== 'AGREEMENT'
        ? payloadData['request_due_date'] || ''
        : '';
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
