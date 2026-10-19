export interface CustomerAdvanceAllocation {
  id: number;
  advance_id: number;
  installment_id?: number | null;
  unit_id?: number | null;
  allocated_amount: number;
  allocation_date: string;
  allocation_type: string; // INSTALLMENT_DEMAND, LATE_FEE, REVENUE_RECOGNITION, ADJUSTMENT
  gl_clearing_voucher_id?: number | null;
  notes?: string | null;
  created_at?: string;
}

export interface CustomerAdvanceInstallment {
  id: number;
  advance_number: string;
  source_module: string;
  source_transaction_id: string;
  idempotency_hash: string;
  receipt_date: string;
  transaction_type: string;
  customer_id: number;
  customer_name: string;
  booking_id?: number | null;
  booking_reference_no?: string | null;
  sale_agreement_no?: string | null;
  project_id: number;
  project_name: string;
  tower_id?: number | null;
  unit_id?: number | null;
  unit_number?: string | null;
  installment_id?: number | null;
  installment_title?: string | null;
  payment_mode: string;
  bank_account_id?: number | null;
  bank_name?: string | null;
  instrument_no?: string | null;
  instrument_date?: string | null;
  gross_amount: number;
  allocated_amount: number;
  unapplied_credit_balance: number;
  revenue_recognized_amount: number;
  refunded_amount: number;
  forfeiture_amount: number;
  late_charges_assessed: number;
  late_charges_waived: number;
  accounting_status: string; // ADVANCE_RECORDED, PARTIALLY_ALLOCATED, FULLY_ALLOCATED, RECOGNIZED_REVENUE, REFUNDED_CANCELLED
  revenue_recognition_status: string; // UNEARNED_LIABILITY, POC_ELIGIBLE, TRANSFERRED_TO_REVENUE
  gl_voucher_id?: number | null;
  revenue_transfer_voucher_id?: number | null;
  refund_voucher_id?: number | null;
  aging_bucket: string;
  days_outstanding: number;
  reconciliation_status: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  allocations?: CustomerAdvanceAllocation[];
}

export interface CustomerAdvancePaginationResponse {
  total: number;
  page: number;
  limit: number;
  offset: number;
  totalPages: number;
  total_gross_advances: number;
  total_unapplied_credits: number;
  total_allocated_installments: number;
  total_recognized_revenue: number;
  items: CustomerAdvanceInstallment[];
}

export interface CustomerLiabilityLedgerItem {
  customer_id: number;
  customer_name: string;
  customer_code?: string | null;
  phone?: string | null;
  booking_count: number;
  total_advances_received: number;
  total_allocated_to_installments: number;
  total_unapplied_credit_balance: number;
  total_recognized_revenue: number;
  total_refunded: number;
  latest_receipt_date?: string | null;
  sale_agreements: string[];
  projects: string[];
}

export interface CustomerLiabilityLedgerSummaryResponse {
  total_customers: number;
  total_gross_advances: number;
  total_unapplied_credits: number;
  total_recognized_revenue: number;
  total_allocated_installments: number;
  customers: CustomerLiabilityLedgerItem[];
}

export interface ReceivableAgingBucketItem {
  bucket_name: string;
  receivable_demand_amount: number;
  customer_advance_coverage_amount: number;
  net_exposure_amount: number;
  item_count: number;
}

export interface ReceivableAgingReconciliationResponse {
  total_receivable_demands: number;
  total_unapplied_advances: number;
  net_uncovered_receivables: number;
  reconciliation_ratio_pct: number;
  buckets: ReceivableAgingBucketItem[];
  generated_at: string;
}
