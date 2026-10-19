export interface BankStatementRowInput {
  item_uid?: string;
  transaction_date: string;
  reference_no?: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  exception_type?: string;
}

export interface BankStatementItemDetail {
  id: number;
  reconciliation_id: number;
  item_uid?: string;
  transaction_date: string;
  reference_no?: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  match_status: string; // MATCHED, UNMATCHED, DISCREPANCY, SPLIT_MATCHED
  matched_voucher_id?: number;
  matched_voucher_number?: string;
  exception_type: string; // NONE, BANK_CHARGE, INTEREST_EARNED, DIRECT_DEPOSIT, OUTSTANDING_CHEQUE, DEPOSIT_IN_TRANSIT, UNKNOWN_TRANSACTION
  split_match_notes?: string;
  adjustment_voucher_id?: number;
  reconciled_at?: string;
  is_locked: boolean;
}

export interface BankReconciliationDetail {
  id: number;
  recon_reference_no: string;
  bank_account_id: number;
  bank_account_name?: string;
  bank_account_code?: string;
  period_start_date?: string;
  period_end_date?: string;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  difference_amount: number;
  status: string; // DRAFT, AUTO_MATCHED, MANUALLY_REVIEWED, ADJUSTMENT_PENDING, APPROVED, LOCKED
  statement_format: string;
  mfs_provider?: string;
  deposits_in_transit: number;
  outstanding_cheques: number;
  bank_charges_amount: number;
  interest_earned_amount: number;
  direct_credits_amount: number;
  adjusted_bank_balance: number;
  adjusted_book_balance: number;
  is_reconciled: boolean;
  reconciliation_notes?: string;
  approved_by?: string;
  locked_at?: string;
  is_locked: boolean;
  matched_count: number;
  unmatched_count: number;
  items: BankStatementItemDetail[];
  created_at?: string;
  updated_at?: string;
}

export interface BankReconciliationListResponse {
  total: number;
  page: number;
  limit: number;
  offset: number;
  total_pages: number;
  items: BankReconciliationDetail[];
}

export interface BankReconciliationCreateRequest {
  bank_account_id: number;
  recon_reference_no?: string;
  period_start_date?: string;
  period_end_date?: string;
  statement_date: string;
  statement_balance: number;
  statement_format: string;
  mfs_provider?: string;
  reconciliation_notes?: string;
  rows: BankStatementRowInput[];
}

export interface ManualMatchRequest {
  statement_item_id: number;
  voucher_id: number;
  notes?: string;
}

export interface SplitMatchRequest {
  statement_item_id: number;
  voucher_ids: number[];
  notes?: string;
}

export interface PrepareAdjustmentJournalRequest {
  statement_item_id: number;
  adjustment_type: string;
  contra_account_id: number;
  narration: string;
}

export interface ApproveLockPeriodRequest {
  reconciliation_id: number;
  approved_by: string;
  lock_notes?: string;
}

export interface BRSItemEntry {
  reference_no: string;
  transaction_date: string;
  description: string;
  amount: number;
}

export interface BankReconciliationStatementReport {
  reconciliation_id: number;
  recon_reference_no: string;
  bank_account_name: string;
  bank_account_code: string;
  statement_date: string;
  period_coverage: string;
  currency: string;
  balance_as_per_bank_statement: number;
  add_deposits_in_transit: number;
  deposits_in_transit_list: BRSItemEntry[];
  less_outstanding_cheques: number;
  outstanding_cheques_list: BRSItemEntry[];
  add_interest_earned: number;
  less_bank_charges: number;
  net_adjusted_bank_balance: number;
  general_ledger_book_balance: number;
  unreconciled_difference: number;
  reconciliation_health: string; // FULLY_BALANCED, PENDING_ADJUSTMENT, VARIANCE_DETECTED
  is_period_locked: boolean;
  approved_by?: string;
}

export interface BankReconciliationKPIs {
  total_reconciliations_count: number;
  active_in_progress_count: number;
  total_locked_periods_count: number;
  total_statement_value: number;
  total_unmatched_value: number;
  total_mfs_batches_reconciled: number;
  avg_reconciliation_time_days: number;
}
