import { Component, OnInit, OnDestroy, inject, signal, Input } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  SelectOption,
  StatusBadgeComponent,
} from '../../../shared/components';
import { LookupService } from '../../../core/services/lookup.service';
import {
  SeparationService,
  SeparationSectionType,
  EmployeeSeparationRecord,
  EmployeeSeparationPayload,
} from './separation.service';

export interface SeparationSectionConfig {
  type: SeparationSectionType;
  title: string;
  eyebrow: string;
  description: string;
  actionLabel: string;
}

export const SEPARATION_CONFIG: Record<SeparationSectionType, SeparationSectionConfig> = {
  resignations: {
    type: 'resignations',
    title: 'Resignation Requests',
    eyebrow: '10.1 / VOLUNTARY RESIGNATIONS',
    description: 'Formal employee resignation submissions, supervisory acceptance, and transition schedules.',
    actionLabel: 'Submit Resignation',
  },
  'notice-periods': {
    type: 'notice-periods',
    title: 'Notice Period Tracking',
    eyebrow: '10.2 / COMPLIANCE & TRANSITION',
    description: 'Contractual notice duration compliance, early release buyout waiver audits, and handover calendar.',
    actionLabel: 'Log Notice Details',
  },
  terminations: {
    type: 'terminations',
    title: 'Statutory Terminations & Layoffs',
    eyebrow: '10.3 / STATUTORY DISMISSALS',
    description: 'Bangladesh Labour Act 2006 compliant employer termination notices, severance justification, and legal signoffs.',
    actionLabel: 'Initiate Termination',
  },
  'exit-interviews': {
    type: 'exit-interviews',
    title: 'Exit Interviews & Feedback',
    eyebrow: '10.4 / PEOPLE ANALYTICS',
    description: 'Confidential exit interview feedback, organizational turnover cause analysis, and retention learning.',
    actionLabel: 'Record Exit Interview',
  },
  'asset-clearances': {
    type: 'asset-clearances',
    title: 'Asset & Hardware Clearance',
    eyebrow: '10.5 / PROPERTY CLEARANCE',
    description: 'Physical handover and verification of laptops, keys, safety gear, project documents, and corporate vehicles.',
    actionLabel: 'Add Asset Clearance',
  },
  'dept-clearances': {
    type: 'dept-clearances',
    title: 'Departmental Clearances',
    eyebrow: '10.6 / FUNCTIONAL SIGNOFFS',
    description: 'Multi-departmental signoffs from IT, Site Operations, Accounts, Legal, and HR administration.',
    actionLabel: 'Record Dept Clearance',
  },
  'loan-settlements': {
    type: 'loan-settlements',
    title: 'Outstanding Loan Settlements',
    eyebrow: '10.7 / RECOVERY AUDIT',
    description: 'Verification of pending company emergency loans, housing advances, and salary advance deductions.',
    actionLabel: 'Log Loan Settlement',
  },
  'leave-settlements': {
    type: 'leave-settlements',
    title: 'Earned Leave Encashment Settlement',
    eyebrow: '10.8 / STATUTORY ENCASHMENT',
    description: 'Calculation of unspent earned annual leave encashment balances under statutory company policy.',
    actionLabel: 'Compute Leave Encashment',
  },
  'final-salaries': {
    type: 'final-salaries',
    title: 'Final Salary & Gratuity Calculation',
    eyebrow: '10.9 / FULL & FINAL (FnF)',
    description: 'Pro-rata final month salary calculation, employer PF contribution release, and gratuity computation.',
    actionLabel: 'Calculate Final Salary',
  },
  'settlement-approvals': {
    type: 'settlement-approvals',
    title: 'Final Settlement Approvals',
    eyebrow: '10.10 / AUDIT & DISBURSAL',
    description: 'Internal audit verification, Finance Controller clearance, and managing director settlement signoff.',
    actionLabel: 'Submit for FnF Approval',
  },
  'experience-certificates': {
    type: 'experience-certificates',
    title: 'Experience & Release Certificates',
    eyebrow: '10.11 / FORMAL DOCUMENTATION',
    description: 'Issuance and archival of official experience certificates, release deeds, and service conduct letters.',
    actionLabel: 'Issue Certificate',
  },
};

@Component({
  selector: 'app-separation-workspace',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './separation-pages.component.html',
  styleUrls: ['./separation-pages.component.css'],
})
export class SeparationWorkspaceComponent implements OnInit, OnDestroy {
  @Input() sectionType: SeparationSectionType = 'resignations';

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private separationService = inject(SeparationService);
  private lookupService = inject(LookupService);
  private sub = new Subscription();

  readonly Math = Math;

  // View Mode: list, new, edit
  mode: 'list' | 'new' | 'edit' = 'list';
  editId: number | null = null;

  // Data & State
  records = signal<EmployeeSeparationRecord[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  employees = signal<SelectOption[]>([]);

  // Pure API-driven dropdown datasets
  statusFilterOptions: SelectOption[] = [{ value: '', label: 'All Statuses' }];
  separationTypeOptions: SelectOption[] = [];
  clearanceStatusOptions: SelectOption[] = [];
  approvalStatusOptions: SelectOption[] = [];
  recordStatusOptions: SelectOption[] = [];

  // Filter & Pagination
  search = '';
  statusFilter = '';
  limit = 15;
  offset = 0;

  // Feedback Notifications
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // Form Model
  form: EmployeeSeparationPayload = this.defaultPayload();

  get config(): SeparationSectionConfig {
    return SEPARATION_CONFIG[this.sectionType] || SEPARATION_CONFIG['resignations'];
  }

  ngOnInit(): void {
    this.sub.add(
      this.route.url.subscribe(() => {
        const fullUrl = this.router.url;
        if (fullUrl.endsWith('/new')) {
          this.mode = 'new';
          this.form = this.defaultPayload();
        } else if (fullUrl.includes('/edit/')) {
          this.mode = 'edit';
          const id = Number(this.route.snapshot.paramMap.get('id'));
          if (id) {
            this.editId = id;
            this.loadEditRecord(id);
          }
        } else {
          this.mode = 'list';
          this.fetchRecords();
        }
      })
    );

    // Load purely dynamic API dropdowns
    this.loadEmployees();
    this.loadLookups();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadEmployees(): void {
    this.sub.add(
      this.separationService.getEmployees().subscribe({
        next: res => {
          const opts: SelectOption[] = (res.items || []).map(e => ({
            value: e.id,
            label: `${e.first_name} ${e.last_name || ''}`.trim(),
            subLabel: `${e.employee_code} · ${e.department?.name_en || 'General'}`,
          }));
          this.employees.set(opts);
        },
      })
    );
  }

  loadLookups(): void {
    // 1. Separation Statuses via API
    this.sub.add(
      this.lookupService.getItems('HR_SEPARATION_RECORD_STATUS').subscribe({
        next: items => {
          if (items && items.length > 0) {
            const mapped = items.map(i => ({
              value: i.item_code,
              label: i.item_name_en,
              subLabel: i.item_name_bn,
            }));
            this.recordStatusOptions = mapped;
            this.statusFilterOptions = [{ value: '', label: 'All Statuses' }, ...mapped];
          }
        },
      })
    );

    // 2. Separation Types via API
    this.sub.add(
      this.lookupService.getItems('HR_SEPARATION_TYPE').subscribe({
        next: items => {
          if (items && items.length > 0) {
            this.separationTypeOptions = items.map(i => ({
              value: i.item_code,
              label: i.item_name_en,
              subLabel: i.item_name_bn,
            }));
          }
        },
      })
    );

    // 3. Clearance Statuses via API
    this.sub.add(
      this.lookupService.getItems('HR_CLEARANCE_STATUS').subscribe({
        next: items => {
          if (items && items.length > 0) {
            this.clearanceStatusOptions = items.map(i => ({
              value: i.item_code,
              label: i.item_name_en,
              subLabel: i.item_name_bn,
            }));
          }
        },
      })
    );

    // 4. Approval Statuses via API
    this.sub.add(
      this.lookupService.getItems('HR_SEPARATION_APPROVAL_STATUS').subscribe({
        next: items => {
          if (items && items.length > 0) {
            this.approvalStatusOptions = items.map(i => ({
              value: i.item_code,
              label: i.item_name_en,
              subLabel: i.item_name_bn,
            }));
          }
        },
      })
    );
  }

  fetchRecords(): void {
    this.loading.set(true);
    this.sub.add(
      this.separationService
        .listSeparations({
          section_type: this.sectionType,
          search: this.search || undefined,
          status: this.statusFilter || undefined,
          limit: this.limit,
          offset: this.offset,
        })
        .subscribe({
          next: res => {
            this.records.set(res.items);
            this.total.set(res.total);
            this.loading.set(false);
          },
          error: err => {
            this.loading.set(false);
            this.errorMsg.set(err.error?.detail || 'Failed to load separation records.');
          },
        })
    );
  }

  loadEditRecord(id: number): void {
    this.loading.set(true);
    this.sub.add(
      this.separationService.getSeparation(id).subscribe({
        next: r => {
          this.form = {
            employee_id: r.employee_id,
            separation_ref: r.separation_ref,
            section_type: r.section_type,
            submission_date: r.submission_date,
            notice_start_date: r.notice_start_date,
            notice_end_date: r.notice_end_date,
            notice_days: r.notice_days,
            last_working_day: r.last_working_day,
            separation_type: r.separation_type,
            reason: r.reason,
            exit_interview_notes: r.exit_interview_notes,
            asset_clearance_status: r.asset_clearance_status,
            dept_clearance_status: r.dept_clearance_status,
            final_salary_amount: Number(r.final_salary_amount),
            leave_encashment_amount: Number(r.leave_encashment_amount),
            gratuity_amount: Number(r.gratuity_amount),
            provident_fund_settlement: Number(r.provident_fund_settlement),
            loan_deduction: Number(r.loan_deduction),
            other_deductions: Number(r.other_deductions),
            approval_status: r.approval_status,
            certificate_number: r.certificate_number,
            certificate_issued: r.certificate_issued,
            certificate_issue_date: r.certificate_issue_date,
            status: r.status,
            notes: r.notes,
          };
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMsg.set('Record not found.');
        },
      })
    );
  }

  saveRecord(): void {
    this.errorMsg.set(null);
    this.successMsg.set(null);

    if (!this.form.employee_id) {
      this.errorMsg.set('Please select an employee.');
      return;
    }

    this.form.section_type = this.sectionType;

    if (this.mode === 'edit' && this.editId) {
      this.sub.add(
        this.separationService.updateSeparation(this.editId, this.form).subscribe({
          next: () => {
            this.successMsg.set('Separation record updated successfully!');
            setTimeout(() => this.navigateList(), 900);
          },
          error: err => this.errorMsg.set(err.error?.detail || 'Update failed.'),
        })
      );
    } else {
      this.sub.add(
        this.separationService.createSeparation(this.form).subscribe({
          next: () => {
            this.successMsg.set('Separation record created successfully!');
            setTimeout(() => this.navigateList(), 900);
          },
          error: err => this.errorMsg.set(err.error?.detail || 'Creation failed.'),
        })
      );
    }
  }

  deleteRecord(id: number): void {
    if (!confirm('Are you sure you want to permanently delete this separation record?')) return;
    this.sub.add(
      this.separationService.deleteSeparation(id).subscribe({
        next: () => {
          this.successMsg.set('Record deleted successfully.');
          this.fetchRecords();
        },
        error: err => this.errorMsg.set(err.error?.detail || 'Delete failed.'),
      })
    );
  }

  applyFilter(): void {
    this.offset = 0;
    this.fetchRecords();
  }

  clearSearch(): void {
    this.search = '';
    this.offset = 0;
    this.fetchRecords();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.total()) {
      this.offset += this.limit;
      this.fetchRecords();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.fetchRecords();
    }
  }

  navigateNew(): void {
    this.router.navigate([`/hrms/separation/${this.sectionType}/new`]);
  }

  navigateList(): void {
    this.router.navigate([`/hrms/separation/${this.sectionType}`]);
  }

  navigateEdit(id: number): void {
    this.router.navigate([`/hrms/separation/${this.sectionType}/edit/${id}`]);
  }

  calculateNetPay(): number {
    return (
      (Number(this.form.final_salary_amount) || 0) +
      (Number(this.form.leave_encashment_amount) || 0) +
      (Number(this.form.gratuity_amount) || 0) +
      (Number(this.form.provident_fund_settlement) || 0) -
      (Number(this.form.loan_deduction) || 0) -
      (Number(this.form.other_deductions) || 0)
    );
  }

  defaultPayload(): EmployeeSeparationPayload {
    return {
      employee_id: 0,
      section_type: this.sectionType,
      submission_date: new Date().toISOString().split('T')[0],
      notice_days: 30,
      separation_type: 'RESIGNATION',
      asset_clearance_status: 'PENDING',
      dept_clearance_status: 'PENDING',
      final_salary_amount: 0,
      leave_encashment_amount: 0,
      gratuity_amount: 0,
      provident_fund_settlement: 0,
      loan_deduction: 0,
      other_deductions: 0,
      approval_status: 'PENDING',
      certificate_issued: false,
      status: 'ACTIVE',
    };
  }
}

// -------------------------------------------------------------------------
// Standalone Page Components for all 11 Sub-routes in app.routes.ts
// -------------------------------------------------------------------------
@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'resignations'"></app-separation-workspace>`,
})
export class SeparationResignationsComponent {}

@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'notice-periods'"></app-separation-workspace>`,
})
export class SeparationNoticePeriodsComponent {}

@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'terminations'"></app-separation-workspace>`,
})
export class SeparationTerminationsComponent {}

@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'exit-interviews'"></app-separation-workspace>`,
})
export class SeparationExitInterviewsComponent {}

@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'asset-clearances'"></app-separation-workspace>`,
})
export class SeparationAssetClearancesComponent {}

@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'dept-clearances'"></app-separation-workspace>`,
})
export class SeparationDeptClearancesComponent {}

@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'loan-settlements'"></app-separation-workspace>`,
})
export class SeparationLoanSettlementsComponent {}

@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'leave-settlements'"></app-separation-workspace>`,
})
export class SeparationLeaveSettlementsComponent {}

@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'final-salaries'"></app-separation-workspace>`,
})
export class SeparationFinalSalariesComponent {}

@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'settlement-approvals'"></app-separation-workspace>`,
})
export class SeparationSettlementApprovalsComponent {}

@Component({
  standalone: true,
  imports: [SeparationWorkspaceComponent],
  template: `<app-separation-workspace [sectionType]="'experience-certificates'"></app-separation-workspace>`,
})
export class SeparationExperienceCertificatesComponent {}
