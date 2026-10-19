export interface LoanDisbursement {
  id: number;
  disbursement_ref: string;
  loan_id: number;
  disbursement_date: string;
  gross_amount: number;
  processing_fee_deducted: number;
  net_received_in_bank: number;
  company_bank_account_id?: number;
  company_bank_name?: string;
  gl_voucher_id?: number;
  notes?: string;
  created_at?: string;
}

export interface LoanRepayment {
  id: number;
  payment_ref: string;
  loan_id: number;
  payment_date: string;
  total_amount_paid: number;
  principal_component: number;
  interest_component: number;
  fee_or_penalty_component: number;
  bank_account_id?: number;
  gl_voucher_id?: number;
  lender_statement_ref?: string;
  notes?: string;
  created_at?: string;
}

export interface LoanInterestAccrual {
  id: number;
  accrual_ref: string;
  loan_id: number;
  period_start: string;
  period_end: string;
  calculation_basis_balance: number;
  applied_rate_pct: number;
  interest_accrued_amount: number;
  is_capitalized_to_cwip: boolean;
  cwip_capitalization_voucher_id?: number;
  gl_accrual_voucher_id?: number;
  supporting_lender_statement?: string;
  status: string; // ACCRUED, CAPITALIZED_CWIP, RECONCILED, DISPUTED
  notes?: string;
  created_at?: string;
}

export interface Loan {
  id: number;
  loan_reference_no: string;
  facility_type: string; // PROJECT_TERM_LOAN, CONSTRUCTION_SYNDICATION, OVERDRAFT_SOD, LEASE_FINANCING, COMMERCIAL_PAPER_SUKUK, BRIDGE_FINANCING
  lender_name: string;
  lender_branch?: string;
  lender_account_no?: string;
  sanction_letter_ref?: string;
  sanction_date: string;
  project_id?: number;
  project_name?: string;
  approved_facility_amount: number;
  total_disbursed_amount: number;
  total_principal_repaid: number;
  principal_outstanding: number;
  current_portion_outstanding: number;
  non_current_portion: number;
  tenure_months: number;
  start_date: string;
  maturity_date: string;
  repayment_frequency: string; // MONTHLY, QUARTERLY, SEMI_ANNUALLY, BULLET_BALLOON
  interest_rate_type: string; // FLOATING_SMART_SPREAD, FIXED_RATE
  interest_rate_pct: number;
  smart_spread_pct: number;
  calculation_method: string; // REDUCING_BALANCE, FLAT_SIMPLE_365, SIMPLE_360
  total_interest_accrued: number;
  total_interest_paid: number;
  total_interest_capitalized_cwip: number;
  processing_fees_paid: number;
  security_collateral_description?: string;
  mortgage_deed_no?: string;
  covenants_conditions?: string;
  next_repayment_date?: string;
  status: string; // ACTIVE, MATURED, CLOSED, RESTRUCTURED
  is_eligible_for_ias23: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  disbursements?: LoanDisbursement[];
  repayments?: LoanRepayment[];
  interest_accruals?: LoanInterestAccrual[];
}

export interface LoanListResponse {
  total: number;
  page: number;
  limit: number;
  offset: number;
  total_pages: number;
  items: Loan[];
}

export interface LoanPortfolioKPIs {
  total_facilities_count: number;
  active_loans_count: number;
  total_approved_limit: number;
  total_disbursed: number;
  total_principal_repaid: number;
  total_principal_outstanding: number;
  current_portion_liability: number;
  non_current_portion_liability: number;
  total_interest_accrued: number;
  total_interest_paid: number;
  total_interest_capitalized_cwip: number;
  total_processing_fees: number;
  utilization_pct: number;
  repayment_pct: number;
}

export interface LoanCreatePayload {
  loan_reference_no: string;
  facility_type: string;
  lender_name: string;
  lender_branch?: string;
  lender_account_no?: string;
  sanction_letter_ref?: string;
  sanction_date: string;
  project_id?: number | null;
  project_name?: string;
  approved_facility_amount: number;
  tenure_months: number;
  start_date: string;
  maturity_date: string;
  repayment_frequency: string;
  interest_rate_type: string;
  interest_rate_pct: number;
  smart_spread_pct: number;
  calculation_method: string;
  security_collateral_description?: string;
  mortgage_deed_no?: string;
  covenants_conditions?: string;
  next_repayment_date?: string;
  status?: string;
  is_eligible_for_ias23?: boolean;
  notes?: string;
}

export interface LoanDisbursementCreatePayload {
  disbursement_date: string;
  gross_amount: number;
  processing_fee_deducted?: number;
  company_bank_account_id?: number;
  company_bank_name?: string;
  notes?: string;
}

export interface LoanRepaymentCreatePayload {
  payment_date: string;
  total_amount_paid: number;
  principal_component: number;
  interest_component: number;
  fee_or_penalty_component?: number;
  bank_account_id?: number;
  lender_statement_ref?: string;
  notes?: string;
}

export interface LoanInterestAccrualCreatePayload {
  period_start: string;
  period_end: string;
  calculation_basis_balance: number;
  applied_rate_pct: number;
  interest_accrued_amount: number;
  supporting_lender_statement?: string;
  notes?: string;
}

export interface LoanIAS23CapitalizePayload {
  accrual_id: number;
  capitalization_date: string;
  cwip_account_id?: number;
  eligible_amount: number;
  accounting_policy_justification: string;
  approved_by?: string;
  notes?: string;
}
