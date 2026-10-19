export interface ChartOfAccount {
  id: number;
  organization_id: number;
  parent_account_id?: number | null;
  account_code: string;
  account_name_en: string;
  account_name_bn?: string | null;
  account_type: string;
  level?: number;
  is_group?: boolean;
  is_leaf_account: boolean;
  currency?: string;
  is_reconciliation_account?: boolean;
  is_active: boolean;
  normal_balance?: 'Debit' | 'Credit';
  is_control_account?: boolean;
  requires_project?: boolean;
  requires_cost_center?: boolean;
  statement_mapping?: string;
  opening_balance?: number;
  migration_reference?: string | null;
  current_balance: number;
  created_at?: string;
}

export interface JournalEntry {
  id?: number;
  voucher_id?: number;
  project_id?: number | null;
  cost_center_id?: number | null;
  cost_center_name?: string | null;
  account_id: number;
  account_code?: string | null;
  account_name_en?: string | null;
  account_type?: string | null;
  voucher_date?: string;
  debit_amount: number;
  credit_amount: number;
  cheque_no?: string | null;
  cheque_date?: string | null;
  bill_reference?: string | null;
  narration?: string | null;
}

export interface Voucher {
  id: number;
  organization_id: number;
  project_id?: number | null;
  project_name?: string | null;
  voucher_number: string;
  voucher_type: 'Journal' | 'Cash_Payment' | 'Cash_Receipt' | 'Bank_Payment' | 'Bank_Receipt' | 'Contra' | string;
  voucher_date: string;
  narration: string;
  total_debit_amount: number;
  total_credit_amount: number;
  status: 'Draft' | 'Posted' | 'Reversed' | string;
  created_by_name?: string | null;
  reversal_voucher_id?: number | null;
  source_document_type?: string | null;
  source_document_id?: number | null;
  posted_at?: string | null;
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

export interface GeneralLedgerLineItem {
  journal_entry_id: number;
  voucher_id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  narration: string;
  project_id?: number | null;
  project_name?: string | null;
  cost_center_id?: number | null;
  cost_center_name?: string | null;
  cheque_no?: string | null;
  cheque_date?: string | null;
  bill_reference?: string | null;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
}

export interface GeneralLedgerInquiryResponse {
  account_id: number;
  account_code: string;
  account_name_en: string;
  account_name_bn?: string | null;
  account_type: string;
  normal_balance: string;
  currency: string;
  statement_mapping?: string | null;
  project_name?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  total_items: number;
  limit: number;
  offset: number;
  items: GeneralLedgerLineItem[];
  entries?: GeneralLedgerLineItem[];
}

// --------------------------------------------------------------------------
// Accounts Payable (AP) Interfaces
// --------------------------------------------------------------------------

export interface APPayment {
  id: number;
  invoice_id: number;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  bank_account_id?: number | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  transaction_reference?: string | null;
  voucher_id?: number | null;
  notes?: string | null;
  created_at?: string;
}

export interface APAdjustment {
  id: number;
  adjustment_number: string;
  adjustment_type: string;
  adjustment_date: string;
  amount: number;
  reason: string;
  invoice_id?: number | null;
  vendor_id?: number | null;
  contractor_id?: number | null;
  voucher_id?: number | null;
  created_at?: string;
}

export interface APInvoice {
  id: number;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  due_date: string;
  vendor_id?: number | null;
  contractor_id?: number | null;
  payee_name: string;
  project_id?: number | null;
  cost_center_id?: number | null;
  expense_account_id?: number | null;
  liability_account_id?: number | null;
  po_id?: number | null;
  grn_id?: number | null;
  ra_bill_id?: number | null;
  gross_amount: number;
  tax_withholding_tds: number;
  vat_withholding_vds: number;
  retention_amount: number;
  other_deductions: number;
  net_payable_amount: number;
  paid_amount: number;
  balance_due: number;
  three_way_match_status: string;
  status: string;
  description?: string | null;
  project_name?: string | null;
  vendor_name?: string | null;
  contractor_name?: string | null;
  cost_center_name?: string | null;
  expense_account_name?: string | null;
  liability_account_name?: string | null;
  voucher_id?: number | null;
  voucher_number?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  created_at?: string;
  payments?: APPayment[];
  adjustments?: APAdjustment[];
}

export interface APSummaryKPIs {
  total_invoices_count: number;
  total_gross_amount: number;
  total_net_payable: number;
  total_paid_amount: number;
  total_balance_due: number;
  total_overdue_amount: number;
  overdue_count: number;
  pending_approval_count: number;
}

export interface APSupplierLedgerStatementItem {
  transaction_date: string;
  transaction_type: string;
  reference_number: string;
  description: string;
  project_name?: string | null;
  debit_disbursement: number;
  credit_payable: number;
  running_payable_balance: number;
}

export interface APSupplierStatement {
  payee_type: string;
  payee_id?: number | null;
  payee_name: string;
  date_from?: string | null;
  date_to?: string | null;
  opening_balance: number;
  total_invoiced: number;
  total_disbursed: number;
  closing_balance: number;
  items: APSupplierLedgerStatementItem[];
}

// --------------------------------------------------------------------------
// Accounts Receivable (AR) Interfaces
// --------------------------------------------------------------------------

export interface ARReceipt {
  id: number;
  receipt_number: string;
  receipt_date: string;
  invoice_id?: number | null;
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  booking_id?: number | null;
  project_id?: number | null;
  project_name?: string | null;
  amount: number;
  status: string; // Recorded, Cleared, Allocated, Partially_Allocated, Unallocated, Reversed, Refunded
  cleared_at?: string | null;
  cleared_by_name?: string | null;
  allocated_amount: number;
  unallocated_amount: number;
  collection_method: string;
  bank_account_id?: number | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  transaction_reference?: string | null;
  voucher_id?: number | null;
  voucher_number?: string | null;
  reversal_reason?: string | null;
  reversal_date?: string | null;
  reversal_voucher_number?: string | null;
  notes?: string | null;
  allocations?: ARReceiptAllocation[];
  created_at?: string;
}

export interface ARReceiptAllocation {
  id?: number;
  receipt_id: number;
  invoice_id: number;
  invoice_number?: string | null;
  invoice_type?: string | null;
  milestone_title?: string | null;
  allocated_amount: number;
  allocation_date: string;
  notes?: string | null;
  created_at?: string;
}

export interface ARReceiptAllocationCreate {
  invoice_id: number;
  allocated_amount: number;
  notes?: string | null;
}

export interface ARMultiAllocationRequest {
  allocation_date?: string | null;
  allocations: ARReceiptAllocationCreate[];
}

export interface ARReceiptClearVerifyRequest {
  cleared_date?: string | null;
  bank_account_id?: number | null;
  transaction_reference?: string | null;
  notes?: string | null;
}

export interface ARReceiptReverseRequest {
  reversal_reason: string;
  reversal_date?: string | null;
  notes?: string | null;
}

export interface ARReceiptRefundRequest {
  refund_amount: number;
  bank_account_id?: number | null;
  refund_reason: string;
  refund_date?: string | null;
  cheque_or_ref?: string | null;
}

export interface ARReceiptSummaryKPIs {
  total_receipts_count: number;
  total_receipts_amount: number;
  total_cleared_amount: number;
  total_allocated_amount: number;
  total_unallocated_advance: number;
  total_recorded_pending: number;
  total_reversed_amount: number;
}

export interface ARAdjustment {
  id: number;
  adjustment_number: string;
  adjustment_type: string;
  adjustment_date: string;
  customer_id: number;
  invoice_id?: number | null;
  amount: number;
  reason: string;
  voucher_id?: number | null;
  created_at?: string;
}

export interface ARInvoice {
  id: number;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  due_date: string;
  customer_id?: number | null;
  customer_name: string;
  booking_id?: number | null;
  project_id?: number | null;
  unit_id?: number | null;
  receivable_account_id?: number | null;
  revenue_account_id?: number | null;
  gross_amount: number;
  late_fee_amount: number;
  discount_amount: number;
  net_receivable_amount: number;
  collected_amount: number;
  balance_due: number;
  status: string;
  collection_followup_status: string;
  followup_notes?: string | null;
  description?: string | null;
  project_name?: string | null;
  unit_number?: string | null;
  receivable_account_name?: string | null;
  revenue_account_name?: string | null;
  voucher_id?: number | null;
  voucher_number?: string | null;
  receipts?: ARReceipt[];
  adjustments?: ARAdjustment[];
  created_at?: string;
}

export interface ARSummaryKPIs {
  total_invoices_count: number;
  total_gross_demand: number;
  total_net_receivable: number;
  total_collected_amount: number;
  total_balance_due: number;
  total_unallocated_cash: number;
  total_overdue_amount: number;
  overdue_count: number;
  disputed_count: number;
}

export interface ARCustomerStatementItem {
  transaction_date: string;
  transaction_type: string;
  reference_number: string;
  description: string;
  project_name?: string | null;
  unit_number?: string | null;
  debit_demand: number;
  credit_collection: number;
  running_receivable_balance: number;
}

export interface ARCustomerStatement {
  customer_id?: number | null;
  customer_name: string;
  date_from?: string | null;
  date_to?: string | null;
  opening_balance: number;
  total_demanded: number;
  total_collected: number;
  total_unallocated_advance: number;
  net_closing_receivable: number;
  items: ARCustomerStatementItem[];
}

export interface ARAgingAnalysisItem {
  invoice_id: number;
  invoice_number: string;
  invoice_type: string;
  customer_name: string;
  project_name: string;
  unit_number?: string | null;
  due_date: string;
  days_overdue: number;
  net_receivable_amount: number;
  collected_amount: number;
  balance_due: number;
  aging_bucket: string;
  collection_followup_status: string;
}

export interface ARAgingReport {
  as_of_date: string;
  total_receivable_balance: number;
  not_yet_due_amount: number;
  not_yet_due_count: number;
  days_1_to_30_amount: number;
  days_1_to_30_count: number;
  days_31_to_60_amount: number;
  days_31_to_60_count: number;
  days_61_to_90_amount: number;
  days_61_to_90_count: number;
  over_90_days_amount: number;
  over_90_days_count: number;
  items: ARAgingAnalysisItem[];
}

export interface MaterialIssueToConstructionRequest {
  project_id: number;
  material_inventory_account_id?: number | null;
  cwip_account_id?: number | null;
  amount: number;
  issue_date?: string | null;
  materials_description: string;
  issue_slip_number?: string | null;
}

export interface MaterialIssueToConstructionResponse {
  voucher_id: number;
  voucher_number: string;
  project_id: number;
  project_name: string;
  issued_amount: number;
  from_account: string;
  to_account: string;
  narration: string;
  posted_at: string;
}

// --------------------------------------------------------------------------
// Cash, Bank & Mobile Financial Services (MFS) Interfaces
// --------------------------------------------------------------------------

export interface CashBox {
  id: number;
  box_code: string;
  box_name: string;
  cashbox_type: string; // Head_Office, Project_Site_Imprest, Petty_Cash, Sales_Pavilion
  project_id?: number | null;
  project_name?: string | null;
  account_id?: number | null;
  account_code?: string | null;
  account_name?: string | null;
  custodian_user_id?: number | null;
  custodian_name?: string | null;
  imprest_limit: number;
  replenishment_threshold: number;
  current_balance: number;
  needs_replenishment: boolean;
  status: string;
  notes?: string | null;
  vouchers?: PettyCashVoucher[];
  created_at?: string;
}

export interface PettyCashVoucher {
  id: number;
  voucher_number: string;
  cash_box_id: number;
  cash_box_name?: string | null;
  project_id?: number | null;
  project_name?: string | null;
  transaction_date: string;
  transaction_type: string; // Disbursement, Receipt, Imprest_Replenish, Fund_Transfer, Cash_Audit_Count
  amount: number;
  payee_name: string;
  expense_account_id?: number | null;
  expense_account_name?: string | null;
  cost_center_id?: number | null;
  cost_center_name?: string | null;
  purpose: string;
  supporting_receipt_ref?: string | null;
  cash_count_system?: number | null;
  cash_count_physical?: number | null;
  variance_amount?: number | null;
  gl_voucher_id?: number | null;
  gl_voucher_number?: string | null;
  status: string;
  created_at?: string;
}

export interface CashCountAuditRequest {
  cash_box_id: number;
  audit_date?: string | null;
  physical_count_amount: number;
  supporting_receipt_ref?: string | null;
  purpose?: string | null;
  auto_post_adjustment_gl?: boolean;
}

export interface CashTransferRequest {
  from_cash_box_id: number;
  to_cash_box_id: number;
  amount: number;
  transfer_date?: string | null;
  particulars?: string;
  reference_number?: string | null;
}

export interface BankAccount {
  id: number;
  bank_name: string;
  branch_name: string;
  account_name: string;
  account_number?: string;
  account_number_masked: string;
  routing_number: string;
  swift_code?: string | null;
  account_type: string; // Current_Account, Savings_Account, Escrow_Account, SND_Account, Fixed_Deposit
  currency: string;
  project_id?: number | null;
  project_name?: string | null;
  account_id?: number | null;
  gl_account_code?: string | null;
  gl_account_name?: string | null;
  opening_balance: number;
  current_balance: number;
  is_escrow: boolean;
  is_active: boolean;
  cheque_prefix?: string | null;
  active_cheque_start?: number | null;
  active_cheque_end?: number | null;
  last_used_cheque_no?: number | null;
  total_cheques_configured?: number;
  cheques_used_count?: number;
  cheques_available_count?: number;
  notes?: string | null;
  transactions?: BankTransaction[];
  created_at?: string;
}

export interface BankTransaction {
  id: number;
  bank_account_id: number;
  bank_name?: string | null;
  account_number_masked?: string | null;
  project_id?: number | null;
  project_name?: string | null;
  transaction_date: string;
  transaction_type: string; // Deposit, Withdrawal, Transfer, Cheque_Issue, Bank_Charge, Interest_Income
  amount: number;
  cheque_number?: string | null;
  cheque_date?: string | null;
  cheque_status?: string | null; // Issued, Presented, Cleared, Bounced, Void
  contra_account_id?: number | null;
  contra_account_name?: string | null;
  reference_number?: string | null;
  particulars: string;
  gl_voucher_id?: number | null;
  gl_voucher_number?: string | null;
  is_reconciled: boolean;
  status: string;
  created_at?: string;
}

export interface BankTransferRequest {
  from_bank_account_id: number;
  to_bank_account_id: number;
  amount: number;
  transfer_date?: string | null;
  cheque_number?: string | null;
  particulars?: string;
  reference_number?: string | null;
}

export interface ChequeLeafItem {
  leaf_number: string;
  status: string; // Available, Issued, Cleared, Bounced, Void
  transaction_id?: number | null;
  transaction_date?: string | null;
  amount?: number | null;
  payee_or_particulars?: string | null;
}

export interface MFSProvider {
  id: number;
  provider_code: string; // BKASH, NAGAD, ROCKET, UPAY
  provider_name: string;
  merchant_number: string;
  account_type: string; // Merchant_Wallet
  fee_percentage: number;
  fee_flat_charge: number;
  settlement_bank_account_id?: number | null;
  settlement_bank_name?: string | null;
  settlement_bank_account_masked?: string | null;
  fee_expense_account_id?: number | null;
  fee_expense_account_name?: string | null;
  wallet_gl_account_id?: number | null;
  wallet_gl_account_name?: string | null;
  daily_limit: number;
  is_active: boolean;
  total_transactions_count?: number;
  total_gross_volume?: number;
  notes?: string | null;
  created_at?: string;
}

export interface MFSTransaction {
  id: number;
  mfs_provider_id: number;
  provider_code?: string | null;
  provider_name?: string | null;
  project_id?: number | null;
  project_name?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  invoice_id?: number | null;
  invoice_number?: string | null;
  transaction_id: string;
  payment_reference?: string | null;
  customer_phone: string;
  gross_amount: number;
  fee_deducted: number;
  net_settlement_amount: number;
  settlement_batch_id?: string | null;
  settlement_date?: string | null;
  status: string; // Success, Pending, Failed, Refunded, Reversed
  callback_payload?: string | null;
  gl_voucher_id?: number | null;
  gl_voucher_number?: string | null;
  created_at?: string;
}

export interface MFSCallbackSimulationRequest {
  provider_code: string;
  transaction_id: string;
  customer_phone: string;
  gross_amount: number;
  payment_reference?: string | null;
  project_id?: number | null;
  customer_id?: number | null;
  invoice_id?: number | null;
}

export interface CashBankPositionKPIs {
  total_liquid_funds: number;
  total_cashbox_balance: number;
  total_bank_balance: number;
  total_mfs_gross_today: number;
  total_mfs_net_today: number;
  total_mfs_fees_today: number;
  active_cashboxes_count: number;
  active_bank_accounts_count: number;
  active_mfs_providers_count: number;
  imprest_alert_count: number;
  bank_positions: any[];
  cash_positions: any[];
  mfs_positions: any[];
}

export interface PaymentVoucher {
  id: number;
  organization_id: number;
  voucher_number: string;
  voucher_date: string;
  project_id?: number | null;
  project_name?: string | null;
  payee_type: string;
  payee_vendor_id?: number | null;
  payee_vendor_name?: string | null;
  payee_name_direct?: string | null;
  effective_payee_name?: string | null;
  payment_method: string;
  source_cashbox_id?: number | null;
  source_cashbox_name?: string | null;
  source_bank_account_id?: number | null;
  source_bank_account_name?: string | null;
  source_mfs_provider_id?: number | null;
  source_mfs_provider_name?: string | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  cheque_clearing_date?: string | null;
  cheque_status?: string | null;
  settlement_reference?: string | null;
  bank_settlement_date?: string | null;
  amount: number;
  currency: string;
  debit_category: string;
  debit_account_id: number;
  debit_account_code?: string | null;
  debit_account_name?: string | null;
  credit_account_id: number;
  credit_account_code?: string | null;
  credit_account_name?: string | null;
  ap_invoice_id?: number | null;
  ap_invoice_number?: string | null;
  supporting_invoice_ref?: string | null;
  purpose?: string | null;
  narration?: string | null;
  attachment_url?: string | null;
  prepared_by_id?: number | null;
  prepared_by_name?: string | null;
  prepared_at?: string | null;
  checked_by_id?: number | null;
  checked_by_name?: string | null;
  checked_at?: string | null;
  approved_by_id?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  disbursed_by_id?: number | null;
  disbursed_by_name?: string | null;
  disbursed_at?: string | null;
  status: string;
  gl_voucher_id?: number | null;
  gl_voucher_number?: string | null;
  is_reconciled: boolean;
  reconciled_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentVoucherWorkflowAction {
  action: 'submit' | 'check' | 'approve' | 'post' | 'disburse' | 'reconcile' | 'cancel' | string;
  notes?: string;
  cheque_status?: string;
  settlement_reference?: string;
}

export interface PaymentVoucherKPIs {
  total_vouchers: number;
  draft_vouchers: number;
  pending_approval_vouchers: number;
  approved_vouchers: number;
  disbursed_vouchers: number;
  reconciled_vouchers: number;
  total_amount_disbursed: number;
  total_amount_pending: number;
  cheques_in_clearing: number;
}

