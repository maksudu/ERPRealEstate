// =====================================================================
// --- Sections 3.1 - 3.20: Salary Structure & Payroll Engine Models ---
// =====================================================================

// --- 3.1 Salary Components ---
export interface SalaryComponent {
  id: number;
  organization_id?: number;
  component_code: string;
  name_en: string;
  name_bn?: string;
  component_type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  calculation_type: 'PERCENTAGE_OF_BASIC' | 'PERCENTAGE_OF_GROSS' | 'FIXED_AMOUNT';
  default_value_or_percent: number;
  is_taxable: boolean;
  is_statutory: boolean;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface SalaryComponentCreate {
  component_code: string;
  name_en: string;
  name_bn?: string;
  component_type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  calculation_type: 'PERCENTAGE_OF_BASIC' | 'PERCENTAGE_OF_GROSS' | 'FIXED_AMOUNT';
  default_value_or_percent: number;
  is_taxable?: boolean;
  is_statutory?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

// --- 3.2 Salary Structure ---
export interface SalaryStructureItem {
  id?: number;
  component_id: number;
  component_code?: string;
  component_name?: string;
  component_type?: string;
  calculation_type: string;
  value_or_percent: number;
}

export interface SalaryStructure {
  id: number;
  organization_id?: number;
  structure_code: string;
  name_en: string;
  description?: string;
  is_active: boolean;
  items_count?: number;
  items?: SalaryStructureItem[];
  created_at?: string;
}

export interface SalaryStructureCreate {
  structure_code: string;
  name_en: string;
  description?: string;
  is_active?: boolean;
  items?: {
    component_id: number;
    calculation_type: string;
    value_or_percent: number;
  }[];
}

// --- 3.3 Employee Salary Assignment ---
export interface EmployeeSalary {
  id: number;
  organization_id?: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  designation_title?: string;
  structure_id: number;
  structure_name?: string;
  gross_salary: number;
  basic_salary: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export interface EmployeeSalaryCreate {
  employee_id: number;
  structure_id: number;
  gross_salary: number;
  basic_salary?: number;
  effective_from: string;
  effective_to?: string;
  is_active?: boolean;
  notes?: string;
}

// --- 3.4 Salary Revision ---
export interface SalaryRevision {
  id: number;
  organization_id?: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  revision_type: 'INCREMENT' | 'PROMOTION' | 'TRANSFER_ADJUSTMENT' | 'MARKET_CORRECTION';
  effective_date: string;
  previous_gross: number;
  new_gross: number;
  increment_amount: number;
  increment_percent: number;
  approved_by?: number;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  created_at?: string;
}

export interface SalaryRevisionCreate {
  employee_id: number;
  revision_type: 'INCREMENT' | 'PROMOTION' | 'TRANSFER_ADJUSTMENT' | 'MARKET_CORRECTION';
  effective_date: string;
  new_gross: number;
  remarks?: string;
}

// --- 3.5 Payroll Period ---
export interface PayrollPeriod {
  id: number;
  organization_id?: number;
  period_code: string; // e.g. 2026-10
  period_name: string; // e.g. October 2026
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  cut_off_date: string;
  status: 'DRAFT' | 'PROCESSING' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'POSTED' | 'LOCKED';
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net_payable: number;
  total_employer_cost: number;
  is_locked: boolean;
  locked_at?: string;
  created_at?: string;
}

export interface PayrollPeriodCreate {
  period_code: string;
  period_name: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  cut_off_date: string;
}

// --- 3.7 - 3.10 & 3.20 Payroll Payslips & Register ---
export interface PayrollPayslipDetail {
  id: number;
  period_id: number;
  period_code?: string;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  designation_title?: string;
  gross_salary: number;
  basic_salary: number;
  house_rent: number;
  medical_allowance: number;
  conveyance_allowance: number;
  other_allowances: number;
  overtime_hours: number;
  overtime_amount: number;
  bonus_amount: number;
  arrears_amount: number;
  total_earnings: number;
  unpaid_leave_days: number;
  unpaid_leave_deduction: number;
  income_tax_deduction: number;
  provident_fund_employee: number;
  provident_fund_employer: number;
  staff_loan_recovery: number;
  salary_advance_recovery: number;
  other_deductions: number;
  total_deductions: number;
  net_salary_payable: number;
  bank_name?: string;
  bank_account_no?: string;
  payment_method: string;
  status: string;
  validation_warnings?: string[];
  is_disbursed: boolean;
}

export interface PayrollPayslipPaginatedResponse {
  items: PayrollPayslipDetail[];
  total: number;
  limit: number;
  offset: number;
  summary_gross: number;
  summary_deductions: number;
  summary_net: number;
}

// --- 3.14 Staff Loan ---
export interface StaffLoan {
  id: number;
  organization_id?: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  loan_code: string;
  loan_type: 'EMERGENCY_LOAN' | 'HOUSING_LOAN' | 'MEDICAL_LOAN';
  principal_amount: number;
  interest_rate: number;
  tenure_months: number;
  monthly_installment: number;
  disbursed_amount: number;
  recovered_amount: number;
  remaining_balance: number;
  disbursement_date: string;
  start_recovery_period: string;
  status: 'ACTIVE' | 'PAID_OFF' | 'WRITTEN_OFF';
  created_at?: string;
}

export interface StaffLoanCreate {
  employee_id: number;
  loan_code: string;
  loan_type?: 'EMERGENCY_LOAN' | 'HOUSING_LOAN' | 'MEDICAL_LOAN';
  principal_amount: number;
  interest_rate?: number;
  tenure_months?: number;
  monthly_installment?: number;
  disbursement_date: string;
  start_recovery_period: string;
}

// --- 3.15 Salary Advance ---
export interface SalaryAdvance {
  id: number;
  organization_id?: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  advance_amount: number;
  requested_date: string;
  recovery_period: string;
  recovered_amount: number;
  status: 'PENDING' | 'APPROVED' | 'RECOVERED' | 'REJECTED';
  reason?: string;
  created_at?: string;
}

export interface SalaryAdvanceCreate {
  employee_id: number;
  advance_amount: number;
  requested_date: string;
  recovery_period: string;
  reason?: string;
}

// --- 3.16 Bonus & Incentives ---
export interface BonusIncentive {
  id: number;
  organization_id?: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  bonus_type: 'EID_UL_FITR' | 'EID_UL_ADHA' | 'PERFORMANCE_BONUS' | 'PROJECT_INCENTIVE';
  period_code: string;
  bonus_amount: number;
  is_taxable: boolean;
  status: string;
  remarks?: string;
  created_at?: string;
}

export interface BonusIncentiveCreate {
  employee_id: number;
  bonus_type?: 'EID_UL_FITR' | 'EID_UL_ADHA' | 'PERFORMANCE_BONUS' | 'PROJECT_INCENTIVE' | string;
  period_code: string;
  bonus_amount: number;
  is_taxable?: boolean;
  remarks?: string;
}

// --- 3.11 Tax Slabs ---
export interface TaxSlab {
  id: number;
  tax_year: string;
  slab_name: string;
  min_income: number;
  max_income?: number;
  tax_rate_percent: number;
  gender_applicability: string;
  display_order: number;
  is_active: boolean;
}

export interface TaxSlabCreate {
  tax_year?: string;
  slab_name: string;
  min_income: number;
  max_income?: number;
  tax_rate_percent: number;
  gender_applicability?: string;
  display_order?: number;
  is_active?: boolean;
}

// --- Generic Paginated Response ---
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// --- 3.12 & 3.13 Benefit & Gratuity Policies ---
export interface BenefitPolicy {
  id: number;
  organization_id?: number;
  policy_code: string;
  policy_type: 'PROVIDENT_FUND' | 'GRATUITY' | 'HEALTH_INSURANCE' | 'GROUP_LIFE' | string;
  policy_name: string;
  eligibility_months: number;
  employee_contribution_pct: number;
  employer_contribution_pct: number;
  vesting_years: number;
  calculation_basis: 'BASIC_SALARY' | 'GROSS_SALARY' | string;
  multiplier_per_year: number;
  is_statutory: boolean;
  is_active: boolean;
  description?: string;
  created_at?: string;
}

export interface BenefitPolicyCreate {
  policy_code: string;
  policy_type: string;
  policy_name: string;
  eligibility_months: number;
  employee_contribution_pct: number;
  employer_contribution_pct: number;
  vesting_years: number;
  calculation_basis: string;
  multiplier_per_year: number;
  is_statutory: boolean;
  is_active: boolean;
  description?: string;
}

// --- 3.17 Payroll Deep Validation ---
export interface PayrollValidationException {
  employee_id: number;
  employee_code?: string;
  employee_name: string;
  department_name?: string;
  issue_type: 'MISSING_BANK_ACCOUNT' | 'NEGATIVE_NET_PAY' | 'UNUSUAL_VARIATION' | 'MISSING_TAX_ID' | string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL' | string;
  description: string;
}

export interface PayrollValidationSummary {
  period_id: number;
  period_code: string;
  total_payslips_checked: number;
  has_blocking_errors: boolean;
  error_count: number;
  warning_count: number;
  exceptions: PayrollValidationException[];
}

