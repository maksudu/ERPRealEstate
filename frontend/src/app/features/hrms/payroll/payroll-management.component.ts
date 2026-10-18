import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CardContainerComponent,
  CustomTabsComponent,
  TabItem,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  StatusBadgeComponent,
  ModalComponent
} from '../../../shared/components';
import { HrmsPayrollService } from '../../../core/services/hrms-payroll.service';
import { HrmsEmployeeService } from '../../../core/services/hrms-employee.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  SalaryComponent,
  SalaryComponentCreate,
  SalaryStructure,
  SalaryStructureCreate,
  EmployeeSalary,
  EmployeeSalaryCreate,
  SalaryRevision,
  SalaryRevisionCreate,
  PayrollPeriod,
  PayrollPeriodCreate,
  PayrollPayslipDetail,
  StaffLoan,
  StaffLoanCreate,
  SalaryAdvance,
  SalaryAdvanceCreate,
  BonusIncentive,
  BonusIncentiveCreate,
  TaxSlab,
  TaxSlabCreate
} from '../../../core/models/hrms-payroll.model';
import { LookupItem } from '../../../core/models/lookup.model';

@Component({
  selector: 'app-payroll-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  templateUrl: './payroll-management.component.html'
})
export class PayrollManagementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  payrollService = inject(HrmsPayrollService);
  employeeService = inject(HrmsEmployeeService);
  lookupService = inject(LookupService);

  // Expose String constructor for template binding
  String = String;

  // Active Tab State
  activeTab = signal<string>('register');
  tabs: TabItem[] = [
    { id: 'register', label: 'Payroll Register & Workflow', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'structures', label: 'Salary Components & Structures', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'assignments', label: 'Employee Salaries & Increments', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'loans_advances', label: 'Staff Loans & Advances', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'bonuses_tax', label: 'Bonuses & NBR Tax Slabs', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'settings', label: 'Dynamic Lookups & Codes', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  // Feedback Notifications
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Dynamic Options
  employeeOptions = signal<{ value: number; label: string; subLabel?: string }[]>([]);
  structureOptions = signal<{ value: number; label: string }[]>([]);
  componentOptions = signal<{ value: number; label: string; subLabel?: string }[]>([]);

  // -------------------------------------------------------------
  // Filter & Pagination States
  // -------------------------------------------------------------
  // Register & Payslips
  registerYearFilter = signal<number>(new Date().getFullYear());
  registerEmployeeFilter = signal<number | null>(null);
  payslipLimit = signal<number>(15);
  payslipOffset = signal<number>(0);

  // Components & Structures
  compTypeFilter = signal<string>('');

  // Assignments & Revisions
  assignmentEmployeeFilter = signal<number | null>(null);
  assignmentLimit = signal<number>(15);
  assignmentOffset = signal<number>(0);
  revisionLimit = signal<number>(15);
  revisionOffset = signal<number>(0);

  // Loans & Advances
  loanStatusFilter = signal<string>('');
  loanLimit = signal<number>(15);
  loanOffset = signal<number>(0);

  // Bonuses
  bonusPeriodFilter = signal<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  bonusLimit = signal<number>(15);
  bonusOffset = signal<number>(0);

  // Settings Dynamic Lookups State
  selectedLookupCategory = signal<string>('HR_PAYROLL_STATUS');
  lookupItems = signal<LookupItem[]>([]);
  isLookupModalOpen = signal<boolean>(false);
  lookupForm = signal<{ id?: number; item_code: string; item_name_en: string; item_name_bn: string; sort_order: number; is_active: boolean }>({
    item_code: '',
    item_name_en: '',
    item_name_bn: '',
    sort_order: 1,
    is_active: true
  });

  // -------------------------------------------------------------
  // Dedicated Modals (Zero forms under tables)
  // -------------------------------------------------------------
  // 1. Create Period Modal
  isPeriodModalOpen = signal<boolean>(false);
  periodForm = signal<PayrollPeriodCreate>({
    period_code: new Date().toISOString().slice(0, 7),
    period_name: 'Monthly Payroll',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    cut_off_date: new Date().toISOString().split('T')[0]
  });

  // 2. Printable Bilingual Payslip Modal
  isPayslipModalOpen = signal<boolean>(false);
  selectedPayslip = signal<PayrollPayslipDetail | null>(null);

  // 3. Salary Component Modal
  isComponentModalOpen = signal<boolean>(false);
  selectedCompId = signal<number | null>(null);
  componentForm = signal<SalaryComponentCreate>({
    component_code: '',
    name_en: '',
    name_bn: '',
    component_type: 'EARNING',
    calculation_type: 'PERCENTAGE_OF_BASIC',
    default_value_or_percent: 0,
    is_taxable: true,
    is_statutory: false,
    sort_order: 10,
    is_active: true
  });

  // 4. Salary Structure Modal
  isStructureModalOpen = signal<boolean>(false);
  structureForm = signal<SalaryStructureCreate>({
    structure_code: '',
    name_en: '',
    description: '',
    is_active: true,
    items: []
  });

  // 5. Assign Salary Modal
  isAssignModalOpen = signal<boolean>(false);
  assignForm = signal<EmployeeSalaryCreate>({
    employee_id: 0,
    structure_id: 0,
    gross_salary: 60000,
    basic_salary: 30000,
    effective_from: new Date().toISOString().split('T')[0],
    is_active: true,
    notes: ''
  });

  // 6. Salary Revision / Increment Modal
  isRevisionModalOpen = signal<boolean>(false);
  revisionForm = signal<SalaryRevisionCreate>({
    employee_id: 0,
    revision_type: 'INCREMENT',
    effective_date: new Date().toISOString().split('T')[0],
    new_gross: 70000,
    remarks: ''
  });

  // 7. Staff Loan Modal
  isLoanModalOpen = signal<boolean>(false);
  loanForm = signal<StaffLoanCreate>({
    employee_id: 0,
    loan_code: 'LN-' + Math.floor(1000 + Math.random() * 9000),
    loan_type: 'EMERGENCY_LOAN',
    principal_amount: 50000,
    interest_rate: 0,
    tenure_months: 10,
    monthly_installment: 5000,
    disbursement_date: new Date().toISOString().split('T')[0],
    start_recovery_period: new Date().toISOString().slice(0, 7)
  });

  // 8. Salary Advance Modal
  isAdvanceModalOpen = signal<boolean>(false);
  advanceForm = signal<SalaryAdvanceCreate>({
    employee_id: 0,
    advance_amount: 15000,
    requested_date: new Date().toISOString().split('T')[0],
    recovery_period: new Date().toISOString().slice(0, 7),
    reason: ''
  });

  // 9. Grant Bonus Modal
  isBonusModalOpen = signal<boolean>(false);
  bonusForm = signal<BonusIncentiveCreate>({
    employee_id: 0,
    bonus_type: 'PERFORMANCE_BONUS',
    period_code: new Date().toISOString().slice(0, 7),
    bonus_amount: 25000,
    is_taxable: true,
    remarks: ''
  });

  // 10. Tax Slab Modal
  isTaxSlabModalOpen = signal<boolean>(false);
  taxSlabForm = signal<TaxSlabCreate>({
    tax_year: '2025-2026',
    slab_name: '',
    min_income: 0,
    max_income: undefined,
    tax_rate_percent: 5,
    gender_applicability: 'ALL',
    display_order: 10,
    is_active: true
  });

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path;
      if (last === 'structures' || last === 'components') {
        this.activeTab.set('structures');
      } else if (last === 'assignments' || last === 'increments' || last === 'arrears') {
        this.activeTab.set('assignments');
      } else if (last === 'allowances' || last === 'deductions') {
        this.activeTab.set('loans_advances');
      } else if (last === 'bonus') {
        this.activeTab.set('bonuses_tax');
      } else {
        this.activeTab.set('register');
      }
      this.refreshCurrentTab();
    });
    this.loadDropdownData();
    this.refreshCurrentTab();
  }

  loadDropdownData(): void {
    // 1. Employees
    this.employeeService.loadEmployees({ all: true }).subscribe({
      next: (res) => {
        const opts = (res.items || []).map(e => ({
          value: e.id,
          label: `${e.first_name} ${e.last_name || ''} (${e.employee_code})`,
          subLabel: e.department_name || e.designation_title
        }));
        this.employeeOptions.set(opts);
      }
    });

    // 2. Salary Structures
    this.payrollService.loadSalaryStructures().subscribe({
      next: (res) => {
        const opts = (res.items || []).map(s => ({
          value: s.id,
          label: `${s.name_en} (${s.structure_code})`
        }));
        this.structureOptions.set(opts);
      }
    });

    // 3. Components
    this.payrollService.loadSalaryComponents().subscribe({
      next: (res) => {
        const opts = (res.items || []).map(c => ({
          value: c.id,
          label: `${c.name_en} (${c.component_code})`,
          subLabel: c.component_type
        }));
        this.componentOptions.set(opts);
      }
    });
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
    this.refreshCurrentTab();
  }

  refreshCurrentTab(): void {
    const tab = this.activeTab();
    if (tab === 'register') {
      this.loadPeriodsAndActivePayslips();
    } else if (tab === 'structures') {
      this.payrollService.loadSalaryComponents({ component_type: this.compTypeFilter() || undefined }).subscribe();
      this.payrollService.loadSalaryStructures().subscribe();
    } else if (tab === 'assignments') {
      this.loadAssignments();
      this.loadRevisions();
    } else if (tab === 'loans_advances') {
      this.loadLoans();
      this.loadAdvances();
    } else if (tab === 'bonuses_tax') {
      this.loadBonuses();
      this.payrollService.loadTaxSlabs().subscribe();
    } else if (tab === 'settings') {
      this.loadLookupItems();
    }
  }

  // -------------------------------------------------------------
  // Tab 1: Payroll Register & Workflow
  // -------------------------------------------------------------
  loadPeriodsAndActivePayslips(): void {
    this.payrollService.loadPayrollPeriods(this.registerYearFilter()).subscribe({
      next: (res) => {
        if (res.items.length > 0) {
          const current = this.payrollService.activePeriod() || res.items[0];
          this.selectPeriod(current);
        }
      }
    });
  }

  selectPeriod(period: PayrollPeriod): void {
    this.payrollService.activePeriod.set(period);
    this.payrollService.loadPayslips(period.id, {
      employee_id: this.registerEmployeeFilter() || undefined,
      limit: this.payslipLimit(),
      offset: this.payslipOffset()
    }).subscribe();
  }

  onPayslipPageChange(delta: number): void {
    const next = this.payslipOffset() + delta * this.payslipLimit();
    if (next >= 0 && next < this.payrollService.totalPayslips()) {
      this.payslipOffset.set(next);
      const cur = this.payrollService.activePeriod();
      if (cur) this.selectPeriod(cur);
    }
  }

  openPeriodModal(): void {
    const nextMonth = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const code = `${year}-${String(nextMonth).padStart(2, '0')}`;
    this.periodForm.set({
      period_code: code,
      period_name: `Payroll ${code}`,
      year: year,
      month: nextMonth,
      start_date: `${year}-${String(nextMonth).padStart(2, '0')}-01`,
      end_date: `${year}-${String(nextMonth).padStart(2, '0')}-28`,
      cut_off_date: `${year}-${String(nextMonth).padStart(2, '0')}-25`
    });
    this.isPeriodModalOpen.set(true);
  }

  submitPeriodCreate(): void {
    const data = this.periodForm();
    if (!data.period_code || !data.period_name) {
      this.showError('Period Code and Name are required.');
      return;
    }
    this.payrollService.createPayrollPeriod(data).subscribe({
      next: () => {
        this.showSuccess(`Payroll period ${data.period_code} created successfully.`);
        this.isPeriodModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to create period.')
    });
  }

  executeWorkflow(action: 'PROCESS' | 'SUBMIT' | 'VERIFY' | 'APPROVE' | 'LOCK' | 'UNLOCK'): void {
    const period = this.payrollService.activePeriod();
    if (!period) return;
    this.payrollService.executePayrollWorkflow(period.id, action).subscribe({
      next: (updated) => {
        this.showSuccess(`Workflow Action '${action}' completed. Status: ${updated.status}.`);
      },
      error: (err) => this.showError(err.error?.detail || `Failed to execute ${action}.`)
    });
  }

  executeDisburse(): void {
    const period = this.payrollService.activePeriod();
    if (!period) return;
    if (!confirm(`Are you sure you want to mark all payslips in ${period.period_code} as disbursed?`)) return;
    this.payrollService.disbursePeriod(period.id).subscribe({
      next: (res) => this.showSuccess(res.message),
      error: (err) => this.showError(err.error?.detail || 'Disbursal failed.')
    });
  }

  viewPayslipModal(slip: PayrollPayslipDetail): void {
    this.selectedPayslip.set(slip);
    this.isPayslipModalOpen.set(true);
  }

  printPayslip(): void {
    window.print();
  }

  // -------------------------------------------------------------
  // Tab 2: Salary Components & Structures
  // -------------------------------------------------------------
  openComponentModal(comp?: SalaryComponent): void {
    if (comp) {
      this.selectedCompId.set(comp.id);
      this.componentForm.set({
        component_code: comp.component_code,
        name_en: comp.name_en,
        name_bn: comp.name_bn || '',
        component_type: comp.component_type,
        calculation_type: comp.calculation_type,
        default_value_or_percent: comp.default_value_or_percent,
        is_taxable: comp.is_taxable,
        is_statutory: comp.is_statutory,
        sort_order: comp.sort_order,
        is_active: comp.is_active
      });
    } else {
      this.selectedCompId.set(null);
      this.componentForm.set({
        component_code: '',
        name_en: '',
        name_bn: '',
        component_type: 'EARNING',
        calculation_type: 'PERCENTAGE_OF_BASIC',
        default_value_or_percent: 0,
        is_taxable: true,
        is_statutory: false,
        sort_order: (this.payrollService.salaryComponents().length + 1) * 10,
        is_active: true
      });
    }
    this.isComponentModalOpen.set(true);
  }

  submitComponentForm(): void {
    const data = this.componentForm();
    if (!data.component_code || !data.name_en) {
      this.showError('Component Code and Name are required.');
      return;
    }
    const editId = this.selectedCompId();
    const req = editId
      ? this.payrollService.updateSalaryComponent(editId, data)
      : this.payrollService.createSalaryComponent(data);

    req.subscribe({
      next: () => {
        this.showSuccess(editId ? 'Component updated.' : 'Component created.');
        this.isComponentModalOpen.set(false);
        this.loadDropdownData();
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to save component.')
    });
  }

  openStructureModal(): void {
    this.structureForm.set({
      structure_code: '',
      name_en: '',
      description: '',
      is_active: true,
      items: [
        { component_id: this.componentOptions()[0]?.value || 1, calculation_type: 'PERCENTAGE_OF_GROSS', value_or_percent: 50 },
        { component_id: this.componentOptions()[1]?.value || 2, calculation_type: 'PERCENTAGE_OF_BASIC', value_or_percent: 50 }
      ]
    });
    this.isStructureModalOpen.set(true);
  }

  submitStructureForm(): void {
    const data = this.structureForm();
    if (!data.structure_code || !data.name_en) {
      this.showError('Structure Code and Name are required.');
      return;
    }
    this.payrollService.createSalaryStructure(data).subscribe({
      next: () => {
        this.showSuccess('Salary Structure created successfully.');
        this.isStructureModalOpen.set(false);
        this.loadDropdownData();
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to create structure.')
    });
  }

  // -------------------------------------------------------------
  // Tab 3: Employee Salaries & Increments
  // -------------------------------------------------------------
  loadAssignments(): void {
    this.payrollService.loadEmployeeSalaries({
      employee_id: this.assignmentEmployeeFilter() || undefined,
      limit: this.assignmentLimit(),
      offset: this.assignmentOffset()
    }).subscribe();
  }

  loadRevisions(): void {
    this.payrollService.loadSalaryRevisions({
      employee_id: this.assignmentEmployeeFilter() || undefined,
      limit: this.revisionLimit(),
      offset: this.revisionOffset()
    }).subscribe();
  }

  openAssignModal(): void {
    this.assignForm.set({
      employee_id: this.employeeOptions()[0]?.value || 0,
      structure_id: this.structureOptions()[0]?.value || 0,
      gross_salary: 60000,
      basic_salary: 30000,
      effective_from: new Date().toISOString().split('T')[0],
      is_active: true,
      notes: ''
    });
    this.isAssignModalOpen.set(true);
  }

  submitAssignSalary(): void {
    const data = this.assignForm();
    if (!data.employee_id || !data.structure_id || data.gross_salary <= 0) {
      this.showError('Employee, Structure, and positive Gross Salary are required.');
      return;
    }
    this.payrollService.assignEmployeeSalary(data).subscribe({
      next: () => {
        this.showSuccess('Salary structure assigned to employee successfully.');
        this.isAssignModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to assign salary.')
    });
  }

  openRevisionModal(): void {
    this.revisionForm.set({
      employee_id: this.employeeOptions()[0]?.value || 0,
      revision_type: 'INCREMENT',
      effective_date: new Date().toISOString().split('T')[0],
      new_gross: 70000,
      remarks: 'Annual merit increment'
    });
    this.isRevisionModalOpen.set(true);
  }

  submitRevision(): void {
    const data = this.revisionForm();
    if (!data.employee_id || data.new_gross <= 0) {
      this.showError('Employee and positive New Gross Salary are required.');
      return;
    }
    this.payrollService.createSalaryRevision(data).subscribe({
      next: (res) => {
        this.showSuccess(`Revision approved: Increment of BDT ${res.increment_amount} (${res.increment_percent}%).`);
        this.isRevisionModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to apply revision.')
    });
  }

  // -------------------------------------------------------------
  // Tab 4: Staff Loans & Advances
  // -------------------------------------------------------------
  loadLoans(): void {
    this.payrollService.loadStaffLoans({
      status: this.loanStatusFilter() || undefined,
      limit: this.loanLimit(),
      offset: this.loanOffset()
    }).subscribe();
  }

  loadAdvances(): void {
    this.payrollService.loadSalaryAdvances().subscribe();
  }

  openLoanModal(): void {
    this.loanForm.set({
      employee_id: this.employeeOptions()[0]?.value || 0,
      loan_code: 'LN-' + Math.floor(1000 + Math.random() * 9000),
      loan_type: 'EMERGENCY_LOAN',
      principal_amount: 50000,
      interest_rate: 0,
      tenure_months: 10,
      monthly_installment: 5000,
      disbursement_date: new Date().toISOString().split('T')[0],
      start_recovery_period: new Date().toISOString().slice(0, 7)
    });
    this.isLoanModalOpen.set(true);
  }

  submitLoanForm(): void {
    const data = this.loanForm();
    if (!data.employee_id || data.principal_amount <= 0) {
      this.showError('Employee and valid positive principal are required.');
      return;
    }
    this.payrollService.createStaffLoan(data).subscribe({
      next: () => {
        this.showSuccess('Staff loan approved and active in payroll ledger.');
        this.isLoanModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to create loan.')
    });
  }

  openAdvanceModal(): void {
    this.advanceForm.set({
      employee_id: this.employeeOptions()[0]?.value || 0,
      advance_amount: 15000,
      requested_date: new Date().toISOString().split('T')[0],
      recovery_period: new Date().toISOString().slice(0, 7),
      reason: 'Urgent family assistance'
    });
    this.isAdvanceModalOpen.set(true);
  }

  submitAdvanceForm(): void {
    const data = this.advanceForm();
    if (!data.employee_id || data.advance_amount <= 0) {
      this.showError('Employee and valid advance amount are required.');
      return;
    }
    this.payrollService.createSalaryAdvance(data).subscribe({
      next: () => {
        this.showSuccess('Salary advance recorded for payroll recovery.');
        this.isAdvanceModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to record advance.')
    });
  }

  // -------------------------------------------------------------
  // Tab 5: Bonuses & Tax Slabs
  // -------------------------------------------------------------
  loadBonuses(): void {
    this.payrollService.loadBonusesIncentives({
      period_code: this.bonusPeriodFilter() || undefined,
      limit: this.bonusLimit(),
      offset: this.bonusOffset()
    }).subscribe();
  }

  openBonusModal(): void {
    this.bonusForm.set({
      employee_id: this.employeeOptions()[0]?.value || 0,
      bonus_type: 'PERFORMANCE_BONUS',
      period_code: this.bonusPeriodFilter() || new Date().toISOString().slice(0, 7),
      bonus_amount: 25000,
      is_taxable: true,
      remarks: 'Project milestone completion incentive'
    });
    this.isBonusModalOpen.set(true);
  }

  submitBonusForm(): void {
    const data = this.bonusForm();
    if (!data.employee_id || data.bonus_amount <= 0) {
      this.showError('Employee and valid positive bonus amount are required.');
      return;
    }
    this.payrollService.createBonusIncentive(data).subscribe({
      next: () => {
        this.showSuccess('Bonus/Incentive granted and ready for payroll calculation.');
        this.isBonusModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to grant bonus.')
    });
  }

  openTaxSlabModal(): void {
    this.taxSlabForm.set({
      tax_year: '2025-2026',
      slab_name: '',
      min_income: 0,
      max_income: undefined,
      tax_rate_percent: 5,
      gender_applicability: 'ALL',
      display_order: 10,
      is_active: true
    });
    this.isTaxSlabModalOpen.set(true);
  }

  submitTaxSlabForm(): void {
    const data = this.taxSlabForm();
    if (!data.slab_name || data.tax_rate_percent < 0) {
      this.showError('Slab name and tax rate are required.');
      return;
    }
    this.payrollService.createTaxSlab(data).subscribe({
      next: () => {
        this.showSuccess('Tax slab rule added.');
        this.isTaxSlabModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to add tax slab.')
    });
  }

  // -------------------------------------------------------------
  // Tab 6: Settings Dynamic Lookups
  // -------------------------------------------------------------
  onLookupCategoryChange(categoryCode: string): void {
    this.selectedLookupCategory.set(categoryCode);
    this.loadLookupItems();
  }

  loadLookupItems(): void {
    this.lookupService.getItems(this.selectedLookupCategory(), true).subscribe({
      next: (items) => this.lookupItems.set(items)
    });
  }

  openLookupItemModal(item?: LookupItem): void {
    if (item) {
      this.lookupForm.set({
        id: item.id,
        item_code: item.item_code,
        item_name_en: item.item_name_en,
        item_name_bn: item.item_name_bn || '',
        sort_order: item.sort_order,
        is_active: item.is_active
      });
    } else {
      this.lookupForm.set({
        item_code: '',
        item_name_en: '',
        item_name_bn: '',
        sort_order: (this.lookupItems().length + 1) * 10,
        is_active: true
      });
    }
    this.isLookupModalOpen.set(true);
  }

  submitLookupForm(): void {
    const data = this.lookupForm();
    if (!data.item_code || !data.item_name_en) {
      this.showError('Item code and English name are required.');
      return;
    }
    this.lookupService.quickCreate(this.selectedLookupCategory(), {
      item_code: data.item_code,
      item_name_en: data.item_name_en,
      item_name_bn: data.item_name_bn || undefined
    }).subscribe({
      next: () => {
        this.showSuccess('Lookup item added dynamically.');
        this.isLookupModalOpen.set(false);
        this.loadLookupItems();
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to save lookup item.')
    });
  }

  // --- Helper Methods for Template Form Updates (No Arrow Functions in HTML) ---
  updatePeriodField<K extends keyof PayrollPeriodCreate>(field: K, value: PayrollPeriodCreate[K]): void {
    this.periodForm.update(f => ({ ...f, [field]: value }));
  }

  updateComponentField<K extends keyof SalaryComponentCreate>(field: K, value: SalaryComponentCreate[K]): void {
    this.componentForm.update(f => ({ ...f, [field]: value }));
  }

  updateStructureField<K extends keyof SalaryStructureCreate>(field: K, value: SalaryStructureCreate[K]): void {
    this.structureForm.update(f => ({ ...f, [field]: value }));
  }

  updateAssignField<K extends keyof EmployeeSalaryCreate>(field: K, value: EmployeeSalaryCreate[K]): void {
    this.assignForm.update(f => ({ ...f, [field]: value }));
  }

  updateRevisionField<K extends keyof SalaryRevisionCreate>(field: K, value: SalaryRevisionCreate[K]): void {
    this.revisionForm.update(f => ({ ...f, [field]: value }));
  }

  updateLoanField<K extends keyof StaffLoanCreate>(field: K, value: StaffLoanCreate[K]): void {
    this.loanForm.update(f => ({ ...f, [field]: value }));
  }

  updateAdvanceField<K extends keyof SalaryAdvanceCreate>(field: K, value: SalaryAdvanceCreate[K]): void {
    this.advanceForm.update(f => ({ ...f, [field]: value }));
  }

  updateBonusField<K extends keyof BonusIncentiveCreate>(field: K, value: BonusIncentiveCreate[K]): void {
    this.bonusForm.update(f => ({ ...f, [field]: value }));
  }

  updateTaxSlabField<K extends keyof TaxSlabCreate>(field: K, value: TaxSlabCreate[K]): void {
    this.taxSlabForm.update(f => ({ ...f, [field]: value }));
  }

  updateLookupField(field: string, value: any): void {
    this.lookupForm.update(f => ({ ...f, [field]: value }));
  }

  // --- Toast Helpers ---
  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    this.errorMessage.set(null);
    setTimeout(() => this.successMessage.set(null), 5000);
  }

  private showError(msg: string): void {
    this.errorMessage.set(msg);
    this.successMessage.set(null);
    setTimeout(() => this.errorMessage.set(null), 7000);
  }
}
