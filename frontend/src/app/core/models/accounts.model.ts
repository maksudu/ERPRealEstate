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
