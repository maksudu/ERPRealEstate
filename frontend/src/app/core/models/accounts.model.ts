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

