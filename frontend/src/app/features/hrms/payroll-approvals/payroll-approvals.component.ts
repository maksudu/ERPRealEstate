import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomTabsComponent, TabItem } from '../../../shared/components/custom-tabs/custom-tabs.component';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input.component';
import { CustomTextareaComponent } from '../../../shared/components/custom-textarea/custom-textarea.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

export interface SelectOption {
  value: any;
  label: string;
  subLabel?: string;
}

import { HrmsPayrollService } from '../../../core/services/hrms-payroll.service';
import { HrmsEmployeeService } from '../../../core/services/hrms-employee.service';
import {
  PayrollPeriod,
  PayrollPayslipDetail,
  StaffLoan,
  StaffLoanCreate,
  SalaryAdvance,
  SalaryAdvanceCreate,
  BonusIncentive,
  BonusIncentiveCreate,
  TaxSlab,
  TaxSlabCreate,
  BenefitPolicy,
  BenefitPolicyCreate,
  PayrollValidationSummary
} from '../../../core/models/hrms-payroll.model';

@Component({
  selector: 'app-payroll-approvals',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomTabsComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  templateUrl: './payroll-approvals.component.html'
})
export class PayrollApprovalsComponent implements OnInit {
  payrollService = inject(HrmsPayrollService);
  employeeService = inject(HrmsEmployeeService);

  // Template utilities
  String = String;

  // Tabs for Sections 3.11 – 3.20
  activeTab = signal<string>('approvals');
  tabs: TabItem[] = [
    { id: 'approvals', label: 'Maker-Checker Approvals (3.18-3.19)', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'register', label: 'Payroll Register & Payslips (3.20)', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'validation', label: 'Payroll Validation & Audit (3.17)', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { id: 'loans', label: 'Staff Loans & EMI (3.14)', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'advances', label: 'Salary Advances (3.15)', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'bonuses', label: 'Bonuses & Incentives (3.16)', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    { id: 'benefits-tax', label: 'Tax & Benefit Policies (3.11-3.13)', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  // Feedback Notifications
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Tab 1 & 2: Periods & Register Filters
  registerPeriodFilter = signal<string>('');
  payslipQuery = signal<string>('');
  payslipOffset = signal<number>(0);
  payslipLimit = signal<number>(15);
  selectedPayslip = signal<PayrollPayslipDetail | null>(null);

  // Workflow Action Modal
  isWorkflowModalOpen = signal<boolean>(false);
  workflowAction = signal<'PROCESS' | 'SUBMIT' | 'VERIFY' | 'APPROVE' | 'LOCK' | 'UNLOCK'>('PROCESS');
  workflowRemarks = signal<string>('');

  // Tab 3: Staff Loans
  loanStatusFilter = signal<string>('ACTIVE');
  loanOffset = signal<number>(0);
  loanLimit = signal<number>(15);
  isLoanModalOpen = signal<boolean>(false);
  editingLoanId = signal<number | null>(null);
  loanForm = signal<StaffLoanCreate>({
    employee_id: 0,
    loan_code: '',
    loan_type: 'EMERGENCY_LOAN',
    principal_amount: 50000,
    interest_rate: 0,
    tenure_months: 12,
    monthly_installment: 4166.67,
    disbursement_date: new Date().toISOString().split('T')[0],
    start_recovery_period: '2026-10'
  });

  // Tab 4: Salary Advances
  advanceOffset = signal<number>(0);
  advanceLimit = signal<number>(15);
  isAdvanceModalOpen = signal<boolean>(false);
  editingAdvanceId = signal<number | null>(null);
  advanceForm = signal<SalaryAdvanceCreate>({
    employee_id: 0,
    advance_amount: 15000,
    requested_date: new Date().toISOString().split('T')[0],
    recovery_period: '2026-10',
    reason: ''
  });

  // Tab 5: Bonuses & Incentives
  bonusTypeFilter = signal<string>('');
  bonusOffset = signal<number>(0);
  bonusLimit = signal<number>(15);
  isBonusModalOpen = signal<boolean>(false);
  bonusForm = signal<BonusIncentiveCreate>({
    employee_id: 0,
    bonus_type: 'EID_UL_FITR',
    period_code: '2026-10',
    bonus_amount: 25000,
    is_taxable: true,
    remarks: ''
  });

  // Tab 6: Tax Slabs & Benefit Policies
  taxYearFilter = signal<string>('2025-2026');
  isTaxModalOpen = signal<boolean>(false);
  editingTaxSlabId = signal<number | null>(null);
  taxForm = signal<TaxSlabCreate>({
    tax_year: '2025-2026',
    slab_name: '',
    min_income: 0,
    max_income: undefined,
    tax_rate_percent: 0,
    gender_applicability: 'ALL',
    display_order: 10,
    is_active: true
  });

  isBenefitModalOpen = signal<boolean>(false);
  editingBenefitPolicyId = signal<number | null>(null);
  benefitForm = signal<BenefitPolicyCreate>({
    policy_code: '',
    policy_type: 'PROVIDENT_FUND',
    policy_name: '',
    eligibility_months: 6,
    employee_contribution_pct: 10.00,
    employer_contribution_pct: 10.00,
    vesting_years: 3.0,
    calculation_basis: 'BASIC_SALARY',
    multiplier_per_year: 1.00,
    is_statutory: true,
    is_active: true,
    description: ''
  });

  // Quick Add Lookup Modal
  isQuickAddLookupModalOpen = signal<boolean>(false);
  quickAddCategoryCode = signal<string>('');
  quickAddItemCode = signal<string>('');
  quickAddItemName = signal<string>('');

  // Dropdown options computed from services
  employeeOptions = computed<SelectOption[]>(() => {
    return this.employeeService.employees().map(e => ({
      value: String(e.id),
      label: `${e.first_name} ${e.last_name || ''} (${e.employee_code}) - ${e.department_name || 'Corp'}`
    }));
  });

  periodOptions = computed<SelectOption[]>(() => {
    return this.payrollService.payrollPeriods().map(p => ({
      value: String(p.id),
      label: `${p.period_name} (${p.period_code}) - ${p.status}`
    }));
  });

  loanTypeOptions: SelectOption[] = [
    { value: 'EMERGENCY_LOAN', label: 'Emergency Loan (0% Interest)' },
    { value: 'HOUSING_LOAN', label: 'Company Housing Loan (Subsidized)' },
    { value: 'MEDICAL_LOAN', label: 'Medical Welfare Loan' },
    { value: 'EDUCATION_LOAN', label: 'Higher Study Support Loan' }
  ];

  bonusTypeOptions: SelectOption[] = [
    { value: 'EID_UL_FITR', label: 'Festival Bonus (Eid-ul-Fitr)' },
    { value: 'EID_UL_ADHA', label: 'Festival Bonus (Eid-ul-Adha)' },
    { value: 'PERFORMANCE_BONUS', label: 'Annual Performance Appraisal Bonus' },
    { value: 'PROJECT_INCENTIVE', label: 'Project Milestone Handover Incentive' }
  ];

  bonusFilterOptions: SelectOption[] = [
    { value: '', label: 'All Bonus Types' },
    { value: 'EID_UL_FITR', label: 'Festival Bonus (Eid-ul-Fitr)' },
    { value: 'EID_UL_ADHA', label: 'Festival Bonus (Eid-ul-Adha)' },
    { value: 'PERFORMANCE_BONUS', label: 'Annual Performance Appraisal Bonus' },
    { value: 'PROJECT_INCENTIVE', label: 'Project Milestone Handover Incentive' }
  ];

  policyTypeOptions: SelectOption[] = [
    { value: 'PROVIDENT_FUND', label: 'Contributory Provident Fund (CPF)' },
    { value: 'GRATUITY', label: 'Statutory Gratuity Benefit (BD Labour Act)' },
    { value: 'HEALTH_INSURANCE', label: 'Corporate Group Health Insurance' },
    { value: 'GROUP_LIFE', label: 'Group Term Life & Disability' }
  ];

  calculationBasisOptions: SelectOption[] = [
    { value: 'BASIC_SALARY', label: 'Basic Salary' },
    { value: 'GROSS_SALARY', label: 'Gross Salary' }
  ];

  genderOptions: SelectOption[] = [
    { value: 'ALL', label: 'General / Male' },
    { value: 'FEMALE', label: 'Female & Senior Citizens (65+)' },
    { value: 'DISABLED', label: 'Physically Challenged Persons' },
    { value: 'FREEDOM_FIGHTER', label: 'Gazetted War-Wounded Freedom Fighters' }
  ];

  updateLoanField(field: keyof StaffLoanCreate, val: any): void {
    this.loanForm.update(f => ({ ...f, [field]: val }));
  }

  updateAdvanceField(field: keyof SalaryAdvanceCreate, val: any): void {
    this.advanceForm.update(f => ({ ...f, [field]: val }));
  }

  updateBonusField(field: keyof BonusIncentiveCreate, val: any): void {
    this.bonusForm.update(f => ({ ...f, [field]: val }));
  }

  updateTaxField(field: keyof TaxSlabCreate, val: any): void {
    this.taxForm.update(f => ({ ...f, [field]: val }));
  }

  updateBenefitField(field: keyof BenefitPolicyCreate, val: any): void {
    this.benefitForm.update(f => ({ ...f, [field]: val }));
  }

  ngOnInit(): void {
    this.refreshAllData();
  }

  refreshAllData(): void {
    this.employeeService.loadEmployees().subscribe();
    this.payrollService.loadPayrollPeriods().subscribe({
      next: (res) => {
        if (res.items.length > 0) {
          const cur = this.payrollService.activePeriod() || res.items[0];
          this.payrollService.activePeriod.set(cur);
          this.loadPeriodPayslips(cur.id);
          this.loadValidationAudit(cur.id);
        }
      }
    });
    this.payrollService.loadStaffLoans({ status: this.loanStatusFilter() }).subscribe();
    this.payrollService.loadSalaryAdvances().subscribe();
    this.payrollService.loadBonusesIncentives().subscribe();
    this.payrollService.loadTaxSlabs(this.taxYearFilter()).subscribe();
    this.payrollService.loadBenefitPolicies().subscribe();
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
    if (tabId === 'loans') {
      this.payrollService.loadStaffLoans({ status: this.loanStatusFilter() }).subscribe();
    } else if (tabId === 'advances') {
      this.payrollService.loadSalaryAdvances().subscribe();
    } else if (tabId === 'bonuses') {
      this.payrollService.loadBonusesIncentives({ bonus_type: this.bonusTypeFilter() || undefined }).subscribe();
    } else if (tabId === 'benefits-tax') {
      this.payrollService.loadTaxSlabs(this.taxYearFilter()).subscribe();
      this.payrollService.loadBenefitPolicies().subscribe();
    } else if (tabId === 'validation') {
      const active = this.payrollService.activePeriod();
      if (active) this.loadValidationAudit(active.id);
    }
  }

  // --- Approvals & Workflow Actions ---
  selectPeriod(p: PayrollPeriod): void {
    this.payrollService.activePeriod.set(p);
    this.loadPeriodPayslips(p.id);
    this.loadValidationAudit(p.id);
  }

  loadPeriodPayslips(periodId: number): void {
    this.payrollService.loadPayslips(periodId, {
      search: this.payslipQuery() || undefined,
      limit: this.payslipLimit(),
      offset: this.payslipOffset()
    }).subscribe();
  }

  loadValidationAudit(periodId: number): void {
    this.payrollService.loadPayrollValidation(periodId).subscribe();
  }

  openWorkflowModal(action: 'PROCESS' | 'SUBMIT' | 'VERIFY' | 'APPROVE' | 'LOCK' | 'UNLOCK'): void {
    this.workflowAction.set(action);
    this.workflowRemarks.set('');
    this.isWorkflowModalOpen.set(true);
  }

  executeWorkflow(): void {
    const period = this.payrollService.activePeriod();
    if (!period) return;

    this.payrollService.executePayrollWorkflow(period.id, this.workflowAction(), this.workflowRemarks()).subscribe({
      next: (res) => {
        this.showSuccess(`Workflow action ${this.workflowAction()} executed successfully for ${res.period_code}.`);
        this.isWorkflowModalOpen.set(false);
        this.loadPeriodPayslips(res.id);
        this.loadValidationAudit(res.id);
      },
      error: (err) => this.showError(err.error?.detail || `Workflow action failed: ${err.message}`)
    });
  }

  disbursePeriod(): void {
    const period = this.payrollService.activePeriod();
    if (!period) return;
    if (confirm(`Confirm disbursement of Net Salary BDT ${period.total_net_payable.toLocaleString()} for Period ${period.period_code}?`)) {
      this.payrollService.disbursePeriod(period.id).subscribe({
        next: (res) => {
          this.showSuccess(res.message);
          this.loadPeriodPayslips(period.id);
        },
        error: (err) => this.showError(err.error?.detail || 'Disbursement failed.')
      });
    }
  }

  // --- Payslip Modal ---
  viewPayslip(slip: PayrollPayslipDetail): void {
    this.selectedPayslip.set(slip);
  }

  printPayslip(): void {
    window.print();
  }

  // --- Staff Loans ---
  openCreateLoanModal(): void {
    this.editingLoanId.set(null);
    this.loanForm.set({
      employee_id: this.employeeService.employees()[0]?.id || 0,
      loan_code: `LN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      loan_type: 'EMERGENCY_LOAN',
      principal_amount: 50000,
      interest_rate: 0,
      tenure_months: 12,
      monthly_installment: 4166.67,
      disbursement_date: new Date().toISOString().split('T')[0],
      start_recovery_period: this.payrollService.activePeriod()?.period_code || '2026-10'
    });
    this.isLoanModalOpen.set(true);
  }

  openEditLoanModal(loan: StaffLoan): void {
    this.editingLoanId.set(loan.id);
    this.loanForm.set({
      employee_id: loan.employee_id,
      loan_code: loan.loan_code,
      loan_type: loan.loan_type,
      principal_amount: loan.principal_amount,
      interest_rate: loan.interest_rate,
      tenure_months: loan.tenure_months,
      monthly_installment: loan.monthly_installment,
      disbursement_date: loan.disbursement_date,
      start_recovery_period: loan.start_recovery_period
    });
    this.isLoanModalOpen.set(true);
  }

  saveLoan(): void {
    const data = this.loanForm();
    if (!data.employee_id || data.principal_amount <= 0) {
      this.showError('Valid employee and principal amount are required.');
      return;
    }

    const editId = this.editingLoanId();
    const obs = editId
      ? this.payrollService.updateStaffLoan(editId, data)
      : this.payrollService.createStaffLoan(data);

    obs.subscribe({
      next: () => {
        this.showSuccess(`Staff loan ${editId ? 'updated' : 'created'} successfully.`);
        this.isLoanModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to save staff loan.')
    });
  }

  // --- Salary Advances ---
  openCreateAdvanceModal(): void {
    this.editingAdvanceId.set(null);
    this.advanceForm.set({
      employee_id: this.employeeService.employees()[0]?.id || 0,
      advance_amount: 15000,
      requested_date: new Date().toISOString().split('T')[0],
      recovery_period: this.payrollService.activePeriod()?.period_code || '2026-10',
      reason: ''
    });
    this.isAdvanceModalOpen.set(true);
  }

  openEditAdvanceModal(adv: SalaryAdvance): void {
    this.editingAdvanceId.set(adv.id);
    this.advanceForm.set({
      employee_id: adv.employee_id,
      advance_amount: adv.advance_amount,
      requested_date: adv.requested_date,
      recovery_period: adv.recovery_period,
      reason: adv.reason || ''
    });
    this.isAdvanceModalOpen.set(true);
  }

  saveAdvance(): void {
    const data = this.advanceForm();
    if (!data.employee_id || data.advance_amount <= 0) {
      this.showError('Valid employee and advance amount are required.');
      return;
    }

    const editId = this.editingAdvanceId();
    const obs = editId
      ? this.payrollService.updateSalaryAdvance(editId, data)
      : this.payrollService.createSalaryAdvance(data);

    obs.subscribe({
      next: () => {
        this.showSuccess(`Salary advance ${editId ? 'updated' : 'recorded'} successfully.`);
        this.isAdvanceModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to save salary advance.')
    });
  }

  // --- Bonuses & Incentives ---
  openCreateBonusModal(): void {
    this.bonusForm.set({
      employee_id: this.employeeService.employees()[0]?.id || 0,
      bonus_type: 'EID_UL_FITR',
      period_code: this.payrollService.activePeriod()?.period_code || '2026-10',
      bonus_amount: 25000,
      is_taxable: true,
      remarks: ''
    });
    this.isBonusModalOpen.set(true);
  }

  saveBonus(): void {
    const data = this.bonusForm();
    if (!data.employee_id || data.bonus_amount <= 0) {
      this.showError('Valid employee and bonus amount are required.');
      return;
    }

    this.payrollService.createBonusIncentive(data).subscribe({
      next: () => {
        this.showSuccess('Bonus/Incentive created successfully.');
        this.isBonusModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to create bonus.')
    });
  }

  // --- Tax Slabs ---
  openCreateTaxSlabModal(): void {
    this.editingTaxSlabId.set(null);
    this.taxForm.set({
      tax_year: this.taxYearFilter(),
      slab_name: '',
      min_income: 0,
      max_income: undefined,
      tax_rate_percent: 5,
      gender_applicability: 'ALL',
      display_order: (this.payrollService.taxSlabs().length + 1) * 10,
      is_active: true
    });
    this.isTaxModalOpen.set(true);
  }

  openEditTaxSlabModal(slab: TaxSlab): void {
    this.editingTaxSlabId.set(slab.id);
    this.taxForm.set({
      tax_year: slab.tax_year,
      slab_name: slab.slab_name,
      min_income: slab.min_income,
      max_income: slab.max_income,
      tax_rate_percent: slab.tax_rate_percent,
      gender_applicability: slab.gender_applicability,
      display_order: slab.display_order,
      is_active: slab.is_active
    });
    this.isTaxModalOpen.set(true);
  }

  saveTaxSlab(): void {
    const data = this.taxForm();
    if (!data.slab_name) {
      this.showError('Slab name is required.');
      return;
    }

    const editId = this.editingTaxSlabId();
    const obs = editId
      ? this.payrollService.updateTaxSlab(editId, data)
      : this.payrollService.createTaxSlab(data);

    obs.subscribe({
      next: () => {
        this.showSuccess(`Tax slab ${editId ? 'updated' : 'configured'} successfully.`);
        this.isTaxModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to save tax slab.')
    });
  }

  // --- Benefit Policies ---
  openCreateBenefitModal(): void {
    this.editingBenefitPolicyId.set(null);
    this.benefitForm.set({
      policy_code: `BP-${Math.floor(100 + Math.random() * 900)}`,
      policy_type: 'PROVIDENT_FUND',
      policy_name: '',
      eligibility_months: 6,
      employee_contribution_pct: 10.00,
      employer_contribution_pct: 10.00,
      vesting_years: 3.0,
      calculation_basis: 'BASIC_SALARY',
      multiplier_per_year: 1.00,
      is_statutory: true,
      is_active: true,
      description: ''
    });
    this.isBenefitModalOpen.set(true);
  }

  openEditBenefitModal(policy: BenefitPolicy): void {
    this.editingBenefitPolicyId.set(policy.id);
    this.benefitForm.set({
      policy_code: policy.policy_code,
      policy_type: policy.policy_type,
      policy_name: policy.policy_name,
      eligibility_months: policy.eligibility_months,
      employee_contribution_pct: policy.employee_contribution_pct,
      employer_contribution_pct: policy.employer_contribution_pct,
      vesting_years: policy.vesting_years,
      calculation_basis: policy.calculation_basis,
      multiplier_per_year: policy.multiplier_per_year,
      is_statutory: policy.is_statutory,
      is_active: policy.is_active,
      description: policy.description || ''
    });
    this.isBenefitModalOpen.set(true);
  }

  saveBenefitPolicy(): void {
    const data = this.benefitForm();
    if (!data.policy_name || !data.policy_code) {
      this.showError('Policy code and name are required.');
      return;
    }

    const editId = this.editingBenefitPolicyId();
    const obs = editId
      ? this.payrollService.updateBenefitPolicy(editId, data)
      : this.payrollService.createBenefitPolicy(data);

    obs.subscribe({
      next: () => {
        this.showSuccess(`Benefit policy ${editId ? 'updated' : 'created'} successfully.`);
        this.isBenefitModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to save benefit policy.')
    });
  }

  // In-Place Quick Add Modal
  openQuickAddModal(categoryCode: string): void {
    this.quickAddCategoryCode.set(categoryCode);
    this.quickAddItemCode.set('');
    this.quickAddItemName.set('');
    this.isQuickAddLookupModalOpen.set(true);
  }

  saveQuickAddItem(): void {
    if (!this.quickAddItemName().trim()) {
      this.showError('Item name is required.');
      return;
    }
    this.showSuccess(`Item "${this.quickAddItemName()}" created for category ${this.quickAddCategoryCode()}.`);
    this.isQuickAddLookupModalOpen.set(false);
  }

  // Helpers
  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    this.errorMessage.set(null);
    setTimeout(() => this.successMessage.set(null), 4000);
  }

  private showError(msg: string): void {
    this.errorMessage.set(msg);
    this.successMessage.set(null);
    setTimeout(() => this.errorMessage.set(null), 6000);
  }
}
