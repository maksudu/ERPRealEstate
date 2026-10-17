import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LegalService } from '../../../core/services/legal.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  AuthorityClearance,
  ClearanceCondition,
  ClearanceRenewalCalendarItem,
  CourtCase,
  CourtCaseDocument,
  CourtCaseHearing,
  LegalComplianceMetrics
} from '../../../core/models/legal.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-compliance-vault',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './compliance-vault.component.html'
})
export class ComplianceVaultComponent implements OnInit {
  private legalService = inject(LegalService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Active Tab
  activeTab = signal<'PERMITS' | 'RENEWAL_CALENDAR' | 'LITIGATION_CASES' | 'SAFE_VAULT'>('PERMITS');

  // Loading & Data Signals
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  metrics = signal<LegalComplianceMetrics | null>(null);
  projects = signal<Project[]>([]);
  permits = signal<AuthorityClearance[]>([]);
  renewalCalendar = signal<ClearanceRenewalCalendarItem[]>([]);
  cases = signal<CourtCase[]>([]);

  // Selected entities for deep view & drawers
  selectedPermitForConditions = signal<AuthorityClearance | null>(null);
  selectedCaseForVault = signal<CourtCase | null>(null);

  // Filters
  filterProjectId = signal<number | null>(null);
  filterAuthority = signal<string>('ALL');
  filterClearanceType = signal<string>('ALL');
  filterPermitStatus = signal<string>('ALL');
  filterCaseType = signal<string>('ALL');
  filterStayOrderOnly = signal<boolean | null>(null);
  searchQuery = signal<string>('');

  // Modals state
  isPermitModalOpen = signal<boolean>(false);
  isConditionModalOpen = signal<boolean>(false);
  isCaseModalOpen = signal<boolean>(false);
  isDocModalOpen = signal<boolean>(false);
  isHearingModalOpen = signal<boolean>(false);

  // Reactive Forms
  permitForm!: FormGroup;
  conditionForm!: FormGroup;
  caseForm!: FormGroup;
  docForm!: FormGroup;
  hearingForm!: FormGroup;

  // Options
  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }));
  });

  caseSelectOptions = computed(() => {
    return this.cases().map(c => ({
      value: c.id,
      label: `${c.case_number} - ${c.concerned_court}`
    }));
  });

  filteredPermits = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.permits().filter(p => {
      const matchSearch = !q ||
        (p.reference_no?.toLowerCase().includes(q)) ||
        (p.approved_memo_no?.toLowerCase().includes(q)) ||
        (p.project_name?.toLowerCase().includes(q)) ||
        (p.authority_name.toLowerCase().includes(q));
      return matchSearch;
    });
  });

  filteredCases = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.cases().filter(c => {
      const matchSearch = !q ||
        (c.case_number.toLowerCase().includes(q)) ||
        (c.concerned_court.toLowerCase().includes(q)) ||
        (c.plaintiff.toLowerCase().includes(q)) ||
        (c.defendant.toLowerCase().includes(q)) ||
        (c.appointed_advocate.toLowerCase().includes(q)) ||
        (c.land_mouza?.toLowerCase().includes(q));
      return matchSearch;
    });
  });

  ngOnInit(): void {
    this.initForms();
    this.loadInitialData();
  }

  private initForms(): void {
    this.permitForm = this.fb.group({
      id: [null],
      project_id: [null, Validators.required],
      authority_name: ['RAJUK', Validators.required],
      clearance_type_id: ['BUILDING_PLAN', Validators.required],
      reference_no: [''],
      application_memo_no: [''],
      approved_memo_no: [''],
      approval_date: [''],
      expiry_date: [''],
      validity_months: [12, [Validators.min(1)]],
      renewal_reminder_days: [30, [Validators.min(1)]],
      renewal_fee_bdt: [0, [Validators.min(0)]],
      sanctioned_floors: [''],
      sanctioned_height_m: [null],
      contact_officer_name: [''],
      contact_officer_phone: [''],
      status: ['APPROVED', Validators.required],
      document_url: [''],
      remarks: ['']
    });

    this.conditionForm = this.fb.group({
      condition_code: ['', Validators.required],
      condition_title: ['', Validators.required],
      condition_category: ['ARCHITECTURAL_SETBACK', Validators.required],
      mandatory_level: ['CRITICAL', Validators.required],
      compliance_status: ['PENDING', Validators.required],
      compliance_date: [''],
      verified_by_officer: [''],
      evidence_doc_url: [''],
      remarks: ['']
    });

    this.caseForm = this.fb.group({
      id: [null],
      project_id: [null],
      case_type: ['Title Suit', Validators.required],
      case_number: ['', Validators.required],
      concerned_court: ['Joint District Judge 1st Court, Dhaka', Validators.required],
      legal_act_section: ['Specific Relief Act 1877 Sec 42'],
      dispute_category: ['LAND_TITLE_DISPUTE', Validators.required],
      land_mouza: [''],
      cs_rs_bs_plot_no: [''],
      disputed_area_decimals: [0, [Validators.min(0)]],
      plaintiff: ['', Validators.required],
      defendant: ['', Validators.required],
      appointed_advocate: ['', Validators.required],
      advocate_chamber: [''],
      advocate_contact_phone: [''],
      advocate_email: [''],
      is_interim_stay_active: [false],
      stay_order_details: [''],
      stay_order_granted_date: [''],
      stay_order_valid_until: [''],
      estimated_risk_level: ['MEDIUM', Validators.required],
      financial_claim_bdt: [0, [Validators.min(0)]],
      next_hearing_date: [''],
      status: ['HEARING_ONGOING', Validators.required],
      decree_outcome: [''],
      case_summary: ['']
    });

    this.docForm = this.fb.group({
      document_code: ['', Validators.required],
      document_category: ['CERTIFIED_LAND_TITLE', Validators.required],
      document_title: ['', Validators.required],
      certified_copy_no: [''],
      issue_or_filing_date: [''],
      issuing_authority_or_court: [''],
      file_url: ['/static/uploads/legal_vault/certified_doc.pdf', Validators.required],
      file_size_kb: [1024],
      uploaded_by_name: ['Legal Compliance Team'],
      is_confidential: [true],
      summary_notes: ['']
    });

    this.hearingForm = this.fb.group({
      hearing_date: [new Date().toISOString().substring(0, 10), Validators.required],
      presiding_judge: [''],
      court_bench: [''],
      summary_of_proceedings: ['', Validators.required],
      order_passed: ['ADJOURNED', Validators.required],
      next_hearing_date: [''],
      attended_advocate: [''],
      action_items: ['']
    });
  }

  loadInitialData(): void {
    this.isLoading.set(true);

    // 1. Load Projects
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        if (projs.length > 0 && !this.permitForm.get('project_id')?.value) {
          this.permitForm.patchValue({ project_id: projs[0].id });
        }
      }
    });

    // 2. Load Metrics
    this.legalService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m)
    });

    // 3. Load Permits
    this.loadPermits();

    // 4. Load Renewal Calendar
    this.legalService.getRenewalCalendar().subscribe({
      next: (cal) => this.renewalCalendar.set(cal)
    });

    // 5. Load Cases
    this.loadCases();
  }

  loadPermits(): void {
    this.legalService.getPermits({
      project_id: this.filterProjectId() || undefined,
      authority_name: this.filterAuthority(),
      clearance_type: this.filterClearanceType(),
      status_filter: this.filterPermitStatus()
    }).subscribe({
      next: (data) => {
        this.permits.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadCases(): void {
    this.legalService.getCases({
      project_id: this.filterProjectId() || undefined,
      case_type: this.filterCaseType(),
      is_stay_active: this.filterStayOrderOnly() !== null ? this.filterStayOrderOnly()! : undefined
    }).subscribe({
      next: (data) => {
        this.cases.set(data);
        if (data.length > 0 && !this.selectedCaseForVault()) {
          this.selectedCaseForVault.set(data[0]);
        }
      }
    });
  }

  setActiveTab(tab: 'PERMITS' | 'RENEWAL_CALENDAR' | 'LITIGATION_CASES' | 'SAFE_VAULT'): void {
    this.activeTab.set(tab);
    if (tab === 'RENEWAL_CALENDAR') {
      this.legalService.getRenewalCalendar().subscribe(cal => this.renewalCalendar.set(cal));
    }
  }

  // --- Modal Openers & Actions ---
  openCreatePermitModal(): void {
    this.permitForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      authority_name: 'RAJUK',
      clearance_type_id: 'BUILDING_PLAN',
      validity_months: 12,
      renewal_reminder_days: 30,
      renewal_fee_bdt: 0,
      status: 'APPROVED'
    });
    this.isPermitModalOpen.set(true);
  }

  openEditPermitModal(cl: AuthorityClearance): void {
    this.permitForm.patchValue({
      id: cl.id,
      project_id: cl.project_id,
      authority_name: cl.authority_name,
      clearance_type_id: cl.clearance_type_id,
      reference_no: cl.reference_no,
      application_memo_no: cl.application_memo_no,
      approved_memo_no: cl.approved_memo_no,
      approval_date: cl.approval_date,
      expiry_date: cl.expiry_date,
      validity_months: cl.validity_months,
      renewal_reminder_days: cl.renewal_reminder_days,
      renewal_fee_bdt: cl.renewal_fee_bdt,
      sanctioned_floors: cl.sanctioned_floors,
      sanctioned_height_m: cl.sanctioned_height_m,
      contact_officer_name: cl.contact_officer_name,
      contact_officer_phone: cl.contact_officer_phone,
      status: cl.status,
      document_url: cl.document_url,
      remarks: cl.remarks
    });
    this.isPermitModalOpen.set(true);
  }

  submitPermit(): void {
    if (this.permitForm.invalid) return;
    this.isSubmitting.set(true);
    const val = this.permitForm.value;

    if (val.id) {
      this.legalService.updatePermit(val.id, val).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isPermitModalOpen.set(false);
          this.loadPermits();
          this.legalService.getMetrics().subscribe(m => this.metrics.set(m));
        },
        error: () => this.isSubmitting.set(false)
      });
    } else {
      this.legalService.createPermit(val).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isPermitModalOpen.set(false);
          this.loadPermits();
          this.legalService.getMetrics().subscribe(m => this.metrics.set(m));
        },
        error: () => this.isSubmitting.set(false)
      });
    }
  }

  openConditionsDrawer(cl: AuthorityClearance): void {
    this.selectedPermitForConditions.set(cl);
  }

  closeConditionsDrawer(): void {
    this.selectedPermitForConditions.set(null);
  }

  openAddConditionModal(): void {
    const cl = this.selectedPermitForConditions();
    if (!cl) return;
    const nextCode = `COND-${(cl.conditions?.length || 0) + 1}`.padStart(7, '0');
    this.conditionForm.reset({
      condition_code: nextCode,
      condition_category: 'ARCHITECTURAL_SETBACK',
      mandatory_level: 'CRITICAL',
      compliance_status: 'PENDING'
    });
    this.isConditionModalOpen.set(true);
  }

  submitCondition(): void {
    const cl = this.selectedPermitForConditions();
    if (!cl || this.conditionForm.invalid) return;
    this.isSubmitting.set(true);

    this.legalService.addPermitCondition(cl.id, this.conditionForm.value).subscribe({
      next: (newCond) => {
        this.isSubmitting.set(false);
        this.isConditionModalOpen.set(false);
        // Refresh local conditions list
        this.legalService.getPermitConditions(cl.id).subscribe({
          next: (conds) => {
            const updated = { ...cl, conditions: conds, conditions_count: conds.length };
            this.selectedPermitForConditions.set(updated);
            this.loadPermits();
          }
        });
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  toggleConditionCompliance(cond: ClearanceCondition): void {
    const nextStatus = cond.compliance_status === 'COMPLIED' ? 'PENDING' : 'COMPLIED';
    this.legalService.updatePermitCondition(cond.id, {
      compliance_status: nextStatus,
      compliance_date: nextStatus === 'COMPLIED' ? new Date().toISOString().substring(0, 10) : undefined
    }).subscribe({
      next: () => {
        const cl = this.selectedPermitForConditions();
        if (cl) {
          this.legalService.getPermitConditions(cl.id).subscribe(conds => {
            this.selectedPermitForConditions.set({ ...cl, conditions: conds });
            this.loadPermits();
            this.legalService.getMetrics().subscribe(m => this.metrics.set(m));
          });
        }
      }
    });
  }

  // --- Court Cases & Dispute Actions ---
  openCreateCaseModal(): void {
    this.caseForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      case_type: 'Title Suit',
      concerned_court: 'Joint District Judge 1st Court, Dhaka',
      legal_act_section: 'Specific Relief Act 1877 Sec 42',
      dispute_category: 'LAND_TITLE_DISPUTE',
      disputed_area_decimals: 0,
      is_interim_stay_active: false,
      estimated_risk_level: 'MEDIUM',
      financial_claim_bdt: 0,
      status: 'HEARING_ONGOING'
    });
    this.isCaseModalOpen.set(true);
  }

  openEditCaseModal(c: CourtCase): void {
    this.caseForm.patchValue({
      id: c.id,
      project_id: c.project_id,
      case_type: c.case_type,
      case_number: c.case_number,
      concerned_court: c.concerned_court,
      legal_act_section: c.legal_act_section,
      dispute_category: c.dispute_category,
      land_mouza: c.land_mouza,
      cs_rs_bs_plot_no: c.cs_rs_bs_plot_no,
      disputed_area_decimals: c.disputed_area_decimals,
      plaintiff: c.plaintiff,
      defendant: c.defendant,
      appointed_advocate: c.appointed_advocate,
      advocate_chamber: c.advocate_chamber,
      advocate_contact_phone: c.advocate_contact_phone,
      advocate_email: c.advocate_email,
      is_interim_stay_active: c.is_interim_stay_active,
      stay_order_details: c.stay_order_details,
      stay_order_granted_date: c.stay_order_granted_date,
      stay_order_valid_until: c.stay_order_valid_until,
      estimated_risk_level: c.estimated_risk_level,
      financial_claim_bdt: c.financial_claim_bdt,
      next_hearing_date: c.next_hearing_date,
      status: c.status,
      decree_outcome: c.decree_outcome,
      case_summary: c.case_summary
    });
    this.isCaseModalOpen.set(true);
  }

  submitCase(): void {
    if (this.caseForm.invalid) return;
    this.isSubmitting.set(true);
    const val = this.caseForm.value;

    if (val.id) {
      this.legalService.updateCase(val.id, val).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isCaseModalOpen.set(false);
          this.loadCases();
          this.legalService.getMetrics().subscribe(m => this.metrics.set(m));
        },
        error: () => this.isSubmitting.set(false)
      });
    } else {
      this.legalService.createCase(val).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isCaseModalOpen.set(false);
          this.loadCases();
          this.legalService.getMetrics().subscribe(m => this.metrics.set(m));
        },
        error: () => this.isSubmitting.set(false)
      });
    }
  }

  selectCaseForVault(c: CourtCase): void {
    this.selectedCaseForVault.set(c);
    this.activeTab.set('SAFE_VAULT');
  }

  onCaseSelectChange(caseId: number): void {
    const found = this.cases().find(c => c.id === Number(caseId));
    if (found) {
      this.selectedCaseForVault.set(found);
    }
  }

  openUploadDocModal(): void {
    const c = this.selectedCaseForVault();
    if (!c) return;
    const nextCode = `DOC-SAFE-${(c.documents?.length || 0) + 1}`.padStart(11, '0');
    this.docForm.reset({
      document_code: nextCode,
      document_category: 'CERTIFIED_LAND_TITLE',
      file_url: '/static/uploads/legal_vault/certified_doc.pdf',
      file_size_kb: 1024,
      uploaded_by_name: 'Corporate Legal Vault',
      is_confidential: true
    });
    this.isDocModalOpen.set(true);
  }

  submitDocument(): void {
    const c = this.selectedCaseForVault();
    if (!c || this.docForm.invalid) return;
    this.isSubmitting.set(true);

    this.legalService.uploadCaseDocument(c.id, this.docForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isDocModalOpen.set(false);
        // Refresh case details
        this.legalService.getCase(c.id).subscribe(refreshed => {
          this.selectedCaseForVault.set(refreshed);
          this.loadCases();
        });
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  openRecordHearingModal(): void {
    const c = this.selectedCaseForVault();
    if (!c) return;
    this.hearingForm.reset({
      hearing_date: new Date().toISOString().substring(0, 10),
      order_passed: 'ADJOURNED',
      attended_advocate: c.appointed_advocate
    });
    this.isHearingModalOpen.set(true);
  }

  submitHearing(): void {
    const c = this.selectedCaseForVault();
    if (!c || this.hearingForm.invalid) return;
    this.isSubmitting.set(true);

    this.legalService.recordCaseHearing(c.id, this.hearingForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isHearingModalOpen.set(false);
        // Refresh case details
        this.legalService.getCase(c.id).subscribe(refreshed => {
          this.selectedCaseForVault.set(refreshed);
          this.loadCases();
        });
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(amount);
  }
}
