export interface GeneralLedgerRow {
  voucher_date: string;
  voucher_number: string;
  voucher_type: string;
  particulars: string;
  debit: number;
  credit: number;
  running_balance: number;
  project_name?: string;
  cost_center_name?: string;
  cheque_no?: string;
}

export interface GeneralLedgerReportResponse {
  account_id?: number;
  account_code?: string;
  account_name?: string;
  account_type?: string;
  from_date: string;
  to_date: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  total_records: number;
  rows: GeneralLedgerRow[];
}

export interface CashBankBookRow {
  date: string;
  voucher_number: string;
  voucher_type: string;
  description: string;
  payment_mode: string;
  ref_no?: string;
  account_name: string;
  receipt_amount: number;
  payment_amount: number;
  running_balance: number;
  project_name?: string;
}

export interface CashBankBookReportResponse {
  book_type: string;
  from_date: string;
  to_date: string;
  opening_balance: number;
  total_receipts: number;
  total_payments: number;
  closing_balance: number;
  total_records: number;
  rows: CashBankBookRow[];
}

export interface APAgingRow {
  vendor_id?: number;
  vendor_name: string;
  contact_phone?: string;
  total_payable: number;
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  last_payment_date?: string;
  risk_level: string;
}

export interface APAgingReportResponse {
  as_of_date: string;
  total_payable_balance: number;
  total_current: number;
  total_1_30: number;
  total_31_60: number;
  total_61_90: number;
  total_90_plus: number;
  rows: APAgingRow[];
}

export interface ARAgingRow {
  customer_id?: number;
  customer_name: string;
  unit_no?: string;
  project_name?: string;
  total_receivable: number;
  current_not_due: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  overdue_days: number;
  recovery_status: string;
}

export interface ARAgingReportResponse {
  as_of_date: string;
  total_receivable_balance: number;
  total_current: number;
  total_1_30: number;
  total_31_60: number;
  total_61_90: number;
  total_90_plus: number;
  rows: ARAgingRow[];
}

export interface CustomerAdvanceRow {
  id: number;
  customer_name: string;
  project_name?: string;
  unit_no?: string;
  booking_reference?: string;
  booking_money_received: number;
  down_payment_received: number;
  installment_advances: number;
  total_advance_received: number;
  recognized_revenue: number;
  unallocated_liability_balance: number;
  status: string;
  receipt_date?: string;
}

export interface CustomerAdvanceReportResponse {
  total_advances_received: number;
  total_revenue_recognized: number;
  net_customer_liability: number;
  total_records: number;
  rows: CustomerAdvanceRow[];
}

export interface ProjectIncomeExpRow {
  project_id: number;
  project_code: string;
  project_name: string;
  total_revenue: number;
  direct_construction_cost: number;
  land_development_cost: number;
  consultancy_legal_cost: number;
  site_overheads: number;
  total_cost: number;
  gross_surplus: number;
  margin_percentage: number;
}

export interface ProjectIncomeExpReportResponse {
  from_date: string;
  to_date: string;
  grand_total_revenue: number;
  grand_total_expenditure: number;
  grand_net_surplus: number;
  portfolio_margin_percentage: number;
  rows: ProjectIncomeExpRow[];
}

export interface CostToCompleteRow {
  project_id: number;
  project_code: string;
  project_name: string;
  approved_boq_budget: number;
  committed_po_wo_cost: number;
  actual_incurred_cost: number;
  cost_variance: number;
  estimated_cost_to_complete: number;
  estimate_at_completion: number;
  physical_progress_pct: number;
  cost_utilization_pct: number;
  cost_health: string;
}

export interface CostToCompleteReportResponse {
  total_approved_budget: number;
  total_actual_incurred: number;
  total_forecast_eac: number;
  overall_variance: number;
  rows: CostToCompleteRow[];
}

export interface CWIPStatementRow {
  project_id: number;
  project_name: string;
  tower_name?: string;
  work_package: string;
  opening_cwip: number;
  period_additions: number;
  capitalized_to_cogs: number;
  closing_cwip: number;
  last_allocation_date?: string;
}

export interface CWIPStatementReportResponse {
  as_of_date: string;
  total_opening_cwip: number;
  total_additions: number;
  total_capitalized: number;
  total_closing_cwip: number;
  rows: CWIPStatementRow[];
}

export interface LoanScheduleRow {
  loan_id: number;
  facility_name: string;
  lender_name: string;
  facility_type: string;
  sanctioned_amount: number;
  disbursed_amount: number;
  principal_repaid: number;
  principal_outstanding: number;
  interest_rate: number;
  interest_accrued: number;
  interest_paid: number;
  next_due_date?: string;
  current_liability: number;
  non_current_liability: number;
  status: string;
}

export interface LoanScheduleReportResponse {
  total_sanctioned: number;
  total_disbursed: number;
  total_principal_outstanding: number;
  total_interest_accrued: number;
  total_interest_paid: number;
  rows: LoanScheduleRow[];
}

export interface BankReconSummaryRow {
  bank_account_id: number;
  account_code: string;
  bank_name: string;
  statement_date?: string;
  bank_statement_balance: number;
  deposits_in_transit: number;
  outstanding_cheques: number;
  adjusted_bank_balance: number;
  general_ledger_balance: number;
  difference_amount: number;
  status: string;
  is_locked: boolean;
}

export interface BankReconReportResponse {
  as_of_date: string;
  total_statement_balance: number;
  total_gl_balance: number;
  total_deposits_in_transit: number;
  total_outstanding_cheques: number;
  reconciliation_discrepancy: number;
  rows: BankReconSummaryRow[];
}

export interface PartyStatementRow {
  transaction_date: string;
  voucher_number: string;
  voucher_type: string;
  reference_no?: string;
  narration: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface PartyStatementResponse {
  party_type: string;
  party_id: number;
  party_name: string;
  opening_balance: number;
  total_debits: number;
  total_credits: number;
  closing_balance: number;
  from_date: string;
  to_date: string;
  rows: PartyStatementRow[];
}

export interface BudgetVsActualRow {
  cost_center_code: string;
  cost_center_name: string;
  project_name?: string;
  wbs_stage: string;
  budget_allocated: number;
  actual_spent: number;
  variance: number;
  utilization_pct: number;
  status: string;
}

export interface BudgetVsActualReportResponse {
  total_budget_allocated: number;
  total_actual_spent: number;
  total_variance: number;
  rows: BudgetVsActualRow[];
}

export interface VoucherRegisterRow {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  project_name?: string;
  narration: string;
  total_debit: number;
  total_credit: number;
  status: string;
  line_item_count: number;
  prepared_by?: string;
}

export interface VoucherRegisterReportResponse {
  total_vouchers: number;
  total_debit_amount: number;
  total_credit_amount: number;
  rows: VoucherRegisterRow[];
}

export interface ClosingChecklistItem {
  item_id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  pending_count: number;
  impact_amount: number;
  action_route: string;
  is_signed_off: boolean;
}

export interface ClosingChecklistReportResponse {
  fiscal_year: string;
  closing_period: string;
  overall_status: string;
  compliant_items: number;
  total_items: number;
  completion_percentage: number;
  items: ClosingChecklistItem[];
}

export interface AuditTrailRow {
  id: number;
  timestamp: string;
  user_name?: string;
  action_type: string;
  microservice_name: string;
  entity_name: string;
  entity_id?: string;
  description?: string;
  ip_address?: string;
}

export interface AuditTrailReportResponse {
  total_records: number;
  rows: AuditTrailRow[];
}
