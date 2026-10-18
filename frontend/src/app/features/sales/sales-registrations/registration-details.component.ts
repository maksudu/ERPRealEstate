import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import {
  DeedRegistration,
  RegistrationChecklistItem,
  RegistrationLegalIssue,
  DeedRegistrationUpdateChecklist,
  DeedRegistrationScheduleAppointment,
  DeedRegistrationRecordSubmission,
  DeedRegistrationLegalValidation,
  DeedRegistrationLogIssue,
  DeedRegistrationResolveIssue
} from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-registration-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './registration-details.component.html'
})
export class RegistrationDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);

  registrationId = signal<number>(0);
  registration = signal<DeedRegistration | null>(null);
  isLoading = signal<boolean>(true);
  isActionLoading = signal<boolean>(false);
  feedbackMessage = signal<string>('');
  errorMessage = signal<string>('');

  activeTab = signal<'checklist' | 'appointment' | 'submission' | 'issues' | 'financials'>('checklist');

  // Checklist item update modal state
  selectedStepKey = signal<string | null>(null);
  selectedStep = computed<RegistrationChecklistItem | null>(() => {
    const reg = this.registration();
    const key = this.selectedStepKey();
    if (!reg || !reg.checklist_status || !key) return null;
    return reg.checklist_status[key] || null;
  });
  isChecklistModalOpen = signal<boolean>(false);
  stepCompleted = signal<boolean>(false);
  stepVerifiedBy = signal<string>('');
  stepNotes = signal<string>('');
  stepDocumentUrl = signal<string>('');

  // Appointment Modal State
  isAppointmentModalOpen = signal<boolean>(false);
  appointmentDate = signal<string>('');
  appointmentTime = signal<string>('');
  appointmentSubRegistry = signal<string>('');
  appointmentAdvocate = signal<string>('');
  appointmentNotes = signal<string>('');

  // Submission & Balam Modal State
  isSubmissionModalOpen = signal<boolean>(false);
  deedReceiptNumber = signal<string>('');
  registeredDeedNumber = signal<string>('');
  balamBookNo = signal<string>('');
  volumeNo = signal<string>('');
  pageNo = signal<string>('');
  deedDeliveryDate = signal<string>('');
  vaultLocation = signal<string>('');
  submissionNotes = signal<string>('');

  // Legal Validation Modal State
  isValidationModalOpen = signal<boolean>(false);
  validationOfficer = signal<string>('');
  validationStatus = signal<'VALIDATED' | 'REJECTED'>('VALIDATED');
  validationNotes = signal<string>('');

  // Issue Logging Modal State
  isIssueModalOpen = signal<boolean>(false);
  issueTitle = signal<string>('');
  issueDescription = signal<string>('');
  issueSeverity = signal<string>('HIGH');
  issueCorrectiveAction = signal<string>('');

  // Issue Resolution Modal State
  isResolveModalOpen = signal<boolean>(false);
  selectedIssueId = signal<string>('');
  resolutionNotes = signal<string>('');

  severityOptions: SelectOption[] = [
    { label: 'Low — Minor clerical / typographical remark', value: 'LOW' },
    { label: 'Medium — Supporting deed / porcha requires re-attestation', value: 'MEDIUM' },
    { label: 'High — Mutation Porcha or Khajna clearance variance', value: 'HIGH' },
    { label: 'Critical — Title chain impediment or encumbrance flag', value: 'CRITICAL' }
  ];

  subRegistryOptions: SelectOption[] = [
    { label: 'Gulshan Sub-Registry Office', value: 'Gulshan Sub-Registry Office' },
    { label: 'Tejgaon Sub-Registry Office', value: 'Tejgaon Sub-Registry Office' },
    { label: 'Dhanmondi Sub-Registry Office', value: 'Dhanmondi Sub-Registry Office' },
    { label: 'Savar Sub-Registry Office', value: 'Savar Sub-Registry Office' },
    { label: 'Keraniganj Sub-Registry Office', value: 'Keraniganj Sub-Registry Office' },
    { label: 'Mirpur Sub-Registry Office', value: 'Mirpur Sub-Registry Office' },
    { label: 'Uttara Sub-Registry Office', value: 'Uttara Sub-Registry Office' },
    { label: 'Narayanganj Sub-Registry Office', value: 'Narayanganj Sub-Registry Office' },
    { label: 'Chittagong Sadar Sub-Registry Office', value: 'Chittagong Sadar Sub-Registry Office' }
  ];

  // Checklist entries computed array sorted by step_number
  checklistEntries = computed(() => {
    const reg = this.registration();
    if (!reg || !reg.checklist_status) return [];
    const entries = Object.entries(reg.checklist_status).map(([key, item]) => ({
      key,
      ...item
    }));
    return entries.sort((a, b) => (a.step_number || 0) - (b.step_number || 0));
  });

  checklistProgress = computed(() => {
    const items = this.checklistEntries();
    if (items.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = items.filter(i => i.completed).length;
    const total = items.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  });

  openIssues = computed(() => {
    const reg = this.registration();
    if (!reg || !reg.outstanding_issues) return [];
    return reg.outstanding_issues.filter(i => i.status === 'OPEN');
  });

  resolvedIssues = computed(() => {
    const reg = this.registration();
    if (!reg || !reg.outstanding_issues) return [];
    return reg.outstanding_issues.filter(i => i.status === 'RESOLVED');
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.registrationId.set(id);
      this.loadDossier();
    }
  }

  loadDossier(): void {
    this.isLoading.set(true);
    this.salesService.getRegistrationDossier(this.registrationId()).subscribe({
      next: (res: DeedRegistration) => {
        this.registration.set(res);
        this.appointmentSubRegistry.set(res.sub_registry_office || '');
        this.appointmentAdvocate.set(res.conducting_advocate || '');
        this.appointmentDate.set(res.appointment_date || '');
        this.appointmentTime.set(res.appointment_time || '');
        this.deedReceiptNumber.set(res.deed_receipt_number || '');
        this.registeredDeedNumber.set(res.registered_deed_number || '');
        this.balamBookNo.set(res.balam_book_no || '');
        this.volumeNo.set(res.volume_no || '');
        this.pageNo.set(res.page_no || '');
        this.deedDeliveryDate.set(res.deed_delivery_date || '');
        this.vaultLocation.set(res.vault_location || '');
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load deed registration dossier.');
      }
    });
  }

  // --- Checklist Verification Handlers ---
  openChecklistModal(key: string, item: RegistrationChecklistItem): void {
    this.selectedStepKey.set(key);
    this.stepCompleted.set(item.completed);
    this.stepVerifiedBy.set(item.verified_by || 'Legal Advocate');
    this.stepNotes.set(item.notes || '');
    this.stepDocumentUrl.set(item.document_url || '');
    this.isChecklistModalOpen.set(true);
  }

  closeChecklistModal(): void {
    this.isChecklistModalOpen.set(false);
    this.selectedStepKey.set(null);
  }

  saveChecklistStep(): void {
    const key = this.selectedStepKey();
    if (!key) return;

    this.isActionLoading.set(true);
    const payload: DeedRegistrationUpdateChecklist = {
      step_id: key,
      completed: this.stepCompleted(),
      verified_by: this.stepVerifiedBy() || 'Legal Advocate',
      notes: this.stepNotes() || null,
      document_url: this.stepDocumentUrl() || null
    };

    this.salesService.updateRegistrationChecklistItem(this.registrationId(), payload).subscribe({
      next: (res: DeedRegistration) => {
        this.registration.set(res);
        this.isActionLoading.set(false);
        this.closeChecklistModal();
        this.showFeedback('Checklist step verified and synchronized successfully.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to update checklist item.');
      }
    });
  }

  // --- Appointment Handlers ---
  openAppointmentModal(): void {
    const reg = this.registration();
    if (reg) {
      this.appointmentDate.set(reg.appointment_date || '');
      this.appointmentTime.set(reg.appointment_time || '');
      this.appointmentSubRegistry.set(reg.sub_registry_office || '');
      this.appointmentAdvocate.set(reg.conducting_advocate || '');
    }
    this.isAppointmentModalOpen.set(true);
  }

  closeAppointmentModal(): void {
    this.isAppointmentModalOpen.set(false);
  }

  saveAppointment(): void {
    if (!this.appointmentDate()) {
      this.errorMessage.set('Please provide the scheduled appointment date.');
      return;
    }

    this.isActionLoading.set(true);
    const payload: DeedRegistrationScheduleAppointment = {
      appointment_date: this.appointmentDate(),
      appointment_time: this.appointmentTime() || undefined,
      sub_registry_office: this.appointmentSubRegistry() || undefined,
      conducting_advocate: this.appointmentAdvocate() || undefined,
      notes: this.appointmentNotes() || undefined
    };

    this.salesService.scheduleRegistrationAppointment(this.registrationId(), payload).subscribe({
      next: (res: DeedRegistration) => {
        this.registration.set(res);
        this.isActionLoading.set(false);
        this.closeAppointmentModal();
        this.showFeedback('Sub-Registry appointment scheduled successfully.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to schedule appointment.');
      }
    });
  }

  // --- Submission & Balam Reference Handlers ---
  openSubmissionModal(): void {
    const reg = this.registration();
    if (reg) {
      this.deedReceiptNumber.set(reg.deed_receipt_number || '');
      this.registeredDeedNumber.set(reg.registered_deed_number || '');
      this.balamBookNo.set(reg.balam_book_no || '');
      this.volumeNo.set(reg.volume_no || '');
      this.pageNo.set(reg.page_no || '');
      this.deedDeliveryDate.set(reg.deed_delivery_date || '');
      this.vaultLocation.set(reg.vault_location || 'Head Office Legal Vault Box #104');
    }
    this.isSubmissionModalOpen.set(true);
  }

  closeSubmissionModal(): void {
    this.isSubmissionModalOpen.set(false);
  }

  saveSubmission(): void {
    this.isActionLoading.set(true);
    const payload: DeedRegistrationRecordSubmission = {
      deed_receipt_number: this.deedReceiptNumber() || 'SUBMISSION-TOKEN',
      registered_deed_number: this.registeredDeedNumber() || null,
      balam_book_no: this.balamBookNo() || null,
      volume_no: this.volumeNo() || null,
      page_no: this.pageNo() || null,
      deed_delivery_date: this.deedDeliveryDate() || null,
      vault_location: this.vaultLocation() || null,
      status: 'SUBMITTED'
    };

    this.salesService.recordRegistrationSubmission(this.registrationId(), payload).subscribe({
      next: (res: DeedRegistration) => {
        this.registration.set(res);
        this.isActionLoading.set(false);
        this.closeSubmissionModal();
        this.showFeedback('Deed submission and Balam ledger references archived. Booking stage updated.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to record deed submission.');
      }
    });
  }

  // --- Legal Validation Sign-Off Handlers ---
  openValidationModal(): void {
    this.validationOfficer.set(this.registration()?.legal_officer_name || 'Chief Legal Counsel');
    this.validationStatus.set('VALIDATED');
    this.validationNotes.set('All statutory records, title chain deeds, and Sub-Registry seals verified.');
    this.isValidationModalOpen.set(true);
  }

  closeValidationModal(): void {
    this.isValidationModalOpen.set(false);
  }

  saveValidation(): void {
    this.isActionLoading.set(true);
    const payload: DeedRegistrationLegalValidation = {
      validated_by: this.validationOfficer() || 'Chief Legal Counsel',
      decision: this.validationStatus(),
      notes: this.validationNotes() || null
    };

    this.salesService.validateRegistrationLegal(this.registrationId(), payload).subscribe({
      next: (res: DeedRegistration) => {
        this.registration.set(res);
        this.isActionLoading.set(false);
        this.closeValidationModal();
        this.showFeedback('Formal legal validation sign-off recorded.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to record legal validation.');
      }
    });
  }

  // --- Issue Logging Handlers ---
  openIssueModal(): void {
    this.issueTitle.set('');
    this.issueDescription.set('');
    this.issueSeverity.set('HIGH');
    this.issueCorrectiveAction.set('');
    this.isIssueModalOpen.set(true);
  }

  closeIssueModal(): void {
    this.isIssueModalOpen.set(false);
  }

  saveIssue(): void {
    if (!this.issueTitle() || !this.issueDescription()) {
      this.errorMessage.set('Please provide both title and description for the legal impediment.');
      return;
    }

    this.isActionLoading.set(true);
    const payload: DeedRegistrationLogIssue = {
      title: this.issueTitle(),
      description: this.issueDescription(),
      severity: this.issueSeverity(),
      corrective_action: this.issueCorrectiveAction() || null
    };

    this.salesService.logRegistrationLegalIssue(this.registrationId(), payload).subscribe({
      next: (res: DeedRegistration) => {
        this.registration.set(res);
        this.isActionLoading.set(false);
        this.closeIssueModal();
        this.showFeedback('Legal issue and corrective action directive logged.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to log legal issue.');
      }
    });
  }

  // --- Issue Resolution Handlers ---
  openResolveModal(issueId: string): void {
    this.selectedIssueId.set(issueId);
    this.resolutionNotes.set('');
    this.isResolveModalOpen.set(true);
  }

  closeResolveModal(): void {
    this.isResolveModalOpen.set(false);
    this.selectedIssueId.set('');
  }

  saveResolveIssue(): void {
    this.isActionLoading.set(true);
    const payload: DeedRegistrationResolveIssue = {
      issue_id: this.selectedIssueId(),
      resolution_notes: this.resolutionNotes() || 'Corrective action executed and legal clearance confirmed.'
    };

    this.salesService.resolveRegistrationLegalIssue(this.registrationId(), this.selectedIssueId(), payload).subscribe({
      next: (res: DeedRegistration) => {
        this.registration.set(res);
        this.isActionLoading.set(false);
        this.closeResolveModal();
        this.showFeedback('Legal impediment resolved.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to resolve issue.');
      }
    });
  }

  showFeedback(msg: string): void {
    this.feedbackMessage.set(msg);
    setTimeout(() => this.feedbackMessage.set(''), 6000);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'REGISTERED':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'SUBMITTED':
      case 'REGISTRATION_PENDING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'UNDER_LEGAL_REVIEW':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'DOCUMENTS_PENDING':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }

  getSeverityBadgeClass(sev: string): string {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-bold';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 font-semibold';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }
}
