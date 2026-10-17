export interface ChartOfAccount {
  id: number;
  organization_id: number;
  parent_account_id?: number | null;
  account_code: string;
  account_name_en: string;
  account_name_bn?: string | null;
  account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  is_leaf_account: boolean;
  is_active: boolean;
  current_balance: number;
  created_at?: string;
}

export interface JournalEntry {
  id?: number;
  voucher_id?: number;
  project_id?: number | null;
  account_id: number;
  account_code?: string | null;
  account_name_en?: string | null;
  account_type?: string | null;
  voucher_date?: string;
  debit_amount: number;
  credit_amount: number;
  narration?: string | null;
}

export interface Voucher {
  id: number;
  organization_id: number;
  project_id?: number | null;
  project_name?: string | null;
  voucher_number: string;
  voucher_type: 'Journal' | 'Cash_Payment' | 'Cash_Receipt' | 'Bank_Payment' | 'Bank_Receipt' | 'Contra';
  voucher_date: string;
  narration: string;
  total_debit_amount: number;
  total_credit_amount: number;
  status: 'Draft' | 'Posted' | 'Reversed';
  created_by_name?: string | null;
  reversal_voucher_id?: number | null;
  entries: JournalEntry[];
  created_at?: string;
}

export interface BankReconciliation {
  id: number;
  bank_account_id: number;
  bank_account_name?: string | null;
  bank_account_code?: string | null;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  difference_amount: number;
  is_reconciled: boolean;
  reconciliation_notes?: string | null;
  created_at?: string;
}

export interface TrialBalanceItem {
  account_id: number;
  account_code: string;
  account_name_en: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  net_debit: number;
  net_credit: number;
}

export interface TrialBalanceReport {
  as_of_date: string;
  items: TrialBalanceItem[];
  grand_total_debit: number;
  grand_total_credit: number;
  is_balanced: boolean;
}

export interface ProfitLossReport {
  from_date: string;
  to_date: string;
  project_id?: number | null;
  project_name?: string | null;
  total_revenue: number;
  total_expense: number;
  net_profit_or_loss: number;
  revenue_breakdown: TrialBalanceItem[];
  expense_breakdown: TrialBalanceItem[];
}

export interface BalanceSheetReport {
  as_of_date: string;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  net_difference: number;
  asset_breakdown: TrialBalanceItem[];
  liability_breakdown: TrialBalanceItem[];
  equity_breakdown: TrialBalanceItem[];
}

export interface MushakTaxInvoice {
  id: number;
  booking_id: number;
  booking_reference_no?: string | null;
  customer_name?: string | null;
  project_name?: string | null;
  unit_number?: string | null;
  mushak_challan_number: string;
  invoice_date: string;
  developer_bin_number: string;
  customer_tin_nid: string;
  apartment_sqft: number;
  taxable_amount: number;
  vat_rate_percent: number;
  vat_amount: number;
  total_amount_collected: number;
  pdf_url?: string | null;
  status: string;
  created_at?: string;
}

export interface TDSDeduction {
  id: number;
  voucher_id?: number | null;
  voucher_number?: string | null;
  vendor_id?: number | null;
  vendor_name?: string | null;
  contractor_id?: number | null;
  contractor_name?: string | null;
  deduction_section: string;
  gross_amount: number;
  tax_rate_percent: number;
  withheld_amount: number;
  challan_number?: string | null;
  challan_deposit_date?: string | null;
  status: 'WITHHELD' | 'DEPOSITED_TO_TREASURY';
  created_at?: string;
}

export interface SubRegistryCalculationRequest {
  deed_value_bdt: number;
  apartment_sqft: number;
  zone_category: string;
  property_type?: string;
}

export interface SubRegistryCalculationResponse {
  deed_value_bdt: number;
  apartment_sqft: number;
  apartment_sqm: number;
  zone_category: string;
  property_type: string;
  stamp_duty_rate_percent: number;
  stamp_duty_amount: number;
  registration_fee_rate_percent: number;
  registration_fee_amount: number;
  local_govt_tax_rate_percent: number;
  local_govt_tax_amount: number;
  ait_rate_per_sqm_bdt: number;
  ait_section_53ff_amount: number;
  vat_rate_percent: number;
  vat_amount: number;
  total_statutory_fees_bdt: number;
  total_transfer_cost_bdt: number;
}

export interface ChartOfAccountTreeNode {
  id: number;
  account_code: string;
  account_name_en: string;
  account_name_bn?: string | null;
  account_type: string;
  level: number;
  is_group: boolean;
  is_leaf_account: boolean;
  currency: string;
  is_reconciliation_account: boolean;
  is_active: boolean;
  parent_account_id?: number | null;
  current_balance: number;
  children?: ChartOfAccountTreeNode[];
  expanded?: boolean;
}

export interface CostCenter {
  id: number;
  project_id: number;
  tower_id?: number | null;
  cost_center_code: string;
  name: string;
  wbs_stage: 'SUBSTRUCTURE' | 'SUPERSTRUCTURE' | 'FINISHING' | 'MEP' | 'EXTERNAL_WORKS' | 'GENERAL_OVERHEAD';
  budget_allocated: number;
  actual_spent: number;
  variance_bdt?: number;
  variance_percent?: number;
  project_name?: string | null;
  tower_name?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface FiscalYear {
  id: number;
  year_name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  created_at?: string;
}

export interface PDCVaultCheque {
  id: number;
  project_id: number;
  project_name?: string | null;
  booking_id?: number | null;
  cheque_no: string;
  bank_name: string;
  branch_name?: string | null;
  drawer_name: string;
  cheque_date: string;
  amount: number;
  status: 'IN_VAULT' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED';
  deposit_date?: string | null;
  clearance_date?: string | null;
  bounce_date?: string | null;
  bounce_reason?: string | null;
  legal_notice_sent: boolean;
  voucher_id?: number | null;
  created_at?: string;
}

export interface CWIPSummary {
  project_id: number;
  project_name: string;
  total_accumulated_cwip: number;
  total_capitalized_cogs: number;
  active_cwip_balance: number;
  cost_centers: {
    id: number;
    cost_center_code: string;
    name: string;
    wbs_stage: string;
    spent: number;
  }[];
}

export interface CWIPCapitalizeRequest {
  project_id: number;
  cost_center_id?: number | null;
  capitalized_amount: number;
  completion_percentage: number;
  cwip_account_id: number;
  cogs_account_id: number;
  remarks?: string | null;
}

export interface IFRS15RecognizeRequest {
  project_id: number;
  booking_id: number;
  recognized_amount: number;
  recognition_method: 'POC_OVER_TIME' | 'POINT_IN_TIME_HANDOVER';
  advance_liability_account_id: number;
  revenue_account_id: number;
  remarks?: string | null;
}

export interface BankStatementRow {
  transaction_date: string;
  reference_no?: string | null;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

export interface BankStatementAutoMatchItem {
  transaction_date: string;
  reference_no?: string | null;
  description: string;
  debit_amount: number;
  credit_amount: number;
  match_status: 'MATCHED' | 'UNMATCHED' | 'DISCREPANCY';
  matched_voucher_number?: string | null;
}

export interface BankReconciliationFullResponse {
  reconciliation_id: number;
  bank_account_id: number;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  difference_amount: number;
  is_reconciled: boolean;
  matched_count: number;
  unmatched_count: number;
  items: BankStatementAutoMatchItem[];
}

