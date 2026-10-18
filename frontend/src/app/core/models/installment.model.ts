export interface CustomMilestoneItem {
  title: string;
  percentage: number;
  installment_type?: string;
  milestone_trigger?: string;
  due_date?: string;
}

export interface CustomerInstallment {
  id: number;
  booking_id: number;
  schedule_id?: number | null;
  booking_reference_no?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  unit_number?: string | null;
  installment_no: number;
  installment_type?: string;
  title: string;
  percentage?: number | null;
  fixed_amount?: number | null;
  due_date: string;
  grace_period_days: number;
  payable_amount: number;
  paid_amount: number;
  late_fee_accrued: number;
  
  invoice_date?: string | null;
  invoice_number?: string | null;
  amount_billed?: number;
  balance_due?: number;
  
  schedule_version?: string;
  amendment_reference?: string | null;
  reminder_status?: string;
  notes?: string | null;
  
  surcharge_percentage: number;
  overdue_days: number;
  sms_alert_sent: boolean;
  whatsapp_alert_sent: boolean;
  last_alert_sent_at?: string | null;
  status: 'UPCOMING' | 'DUE' | 'PAID' | 'OVERDUE' | 'SCHEDULED' | 'INVOICED' | 'PARTIALLY_PAID' | string;
  milestone_trigger?: string | null;
  created_at?: string;
}

export interface BookingInstallmentSchedule {
  id: number;
  schedule_code: string;
  booking_id: number;
  customer_id: number;
  booking_reference_no?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  project_name?: string | null;
  unit_number?: string | null;
  agreement_reference_no?: string | null;
  version: string;
  plan_type: string;
  approved_contract_price: number;
  contract_price?: number;
  booking_money_amount: number;
  earnest_money_credited?: number;
  down_payment_percentage: number;
  down_payment_amount: number;
  net_down_payment_amount?: number;
  installment_balance_amount: number;
  installment_balance?: number;
  total_installment_count: number;
  total_installments?: number;
  regular_installment_amount: number;
  rounding_adjustment_amount: number;
  rounding_adjusted_installment_no: number;
  start_date: string;
  grace_period_days: number;
  late_surcharge_rate_monthly: number;
  status: 'ACTIVE' | 'DRAFT' | 'SUPERSEDED_AMENDED' | 'COMPLETED' | 'TERMINATED' | string;
  amendment_reason?: string | null;
  notes?: string | null;
  total_billed?: number;
  total_paid?: number;
  total_outstanding?: number;
  total_paid_amount?: number;
  total_balance_due?: number;
  total_overdue_amount?: number;
  installments?: CustomerInstallment[];
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedInstallmentSchedules {
  items: BookingInstallmentSchedule[];
  total: number;
  limit: number;
  offset: number;
}

export interface InstallmentSchedulePreviewItem {
  installment_no: number;
  installment_type: string;
  title: string;
  percentage?: number | null;
  due_date: string;
  grace_period_days: number;
  payable_amount: number;
  is_rounding_adjusted: boolean;
  rounding_adjustment: number;
  milestone_trigger?: string | null;
}

export interface InstallmentSchedulePreviewResponse {
  booking_id: number;
  booking_reference_no: string;
  customer_name: string;
  project_name: string;
  unit_number: string;
  approved_contract_price: number;
  booking_money_amount: number;
  down_payment_percentage: number;
  down_payment_amount: number;
  net_down_payment_due: number;
  installment_balance_amount: number;
  total_installment_count: number;
  regular_installment_amount: number;
  rounding_adjustment_amount: number;
  rounding_adjusted_installment_no: number;
  calculated_total_sum: number;
  discrepancy_amount: number;
  is_validated: boolean;
  exact_sum_matches?: boolean;
  total_contract_price?: number;
  installments: InstallmentSchedulePreviewItem[];
}

export interface InstallmentInvoiceResponse {
  installment_id: number;
  invoice_number: string;
  invoice_date: string;
  booking_reference_no: string;
  customer_name: string;
  amount_billed: number;
  balance_due: number;
  due_date: string;
  status: string;
}

export interface InstallmentAlertLog {
  id: number;
  installment_id: number;
  booking_id: number;
  customer_id: number;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  recipient_phone?: string | null;
  recipient_email?: string | null;
  message_content: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  sent_at: string;
}

export interface PDCVaultItem {
  id: number;
  booking_id: number;
  booking_reference_no?: string | null;
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  cheque_number: string;
  bank_name: string;
  branch_name: string;
  routing_number?: string | null;
  maturity_date: string;
  cheque_amount: number;
  pouch_barcode: string;
  status: 'IN_VAULT' | 'SENT_TO_BANK' | 'HONOURED' | 'DISHONOURED_BOUNCED';
  dishonour_memo_date?: string | null;
  dishonour_reason?: string | null;
  sms_reminder_sent: boolean;
  created_at?: string;
}

export interface NI138LegalAction {
  id: number;
  pdc_cheque_id: number;
  cheque_number?: string | null;
  bank_name?: string | null;
  cheque_amount?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  booking_reference_no?: string | null;
  dishonour_memo_received_date: string;
  statutory_notice_deadline_date: string;
  notice_served_to_client_date?: string | null;
  registered_post_ad_no?: string | null;
  client_30day_settlement_deadline?: string | null;
  status: 'NOTICE_PENDING' | 'NOTICE_SERVED' | 'SETTLED' | 'COURT_CASE_FILED';
  court_case_no?: string | null;
  legal_counsel_name?: string | null;
  remarks?: string | null;
  created_at?: string;
}

export interface InstallmentMetrics {
  total_installments_due: number;
  total_overdue_amount: number;
  total_pdc_in_vault: number;
  total_vault_amount: number;
  total_dishonoured_cheques: number;
  active_ni138_actions: number;
  total_money_receipts_count?: number;
  total_money_receipts_amount?: number;
  total_tripartite_loans_count?: number;
  total_tripartite_disbursed_amount?: number;
}

export interface MoneyReceiptAllocation {
  id?: number;
  receipt_id?: number;
  installment_id: number;
  installment_no?: number | null;
  installment_title?: string | null;
  allocated_late_fee: number;
  allocated_principal: number;
  total_allocated: number;
  created_at?: string;
}

export interface MoneyReceipt {
  id: number;
  mr_number: string;
  receipt_date: string;
  booking_id: number;
  booking_reference_no?: string | null;
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  unit_number?: string | null;
  project_name?: string | null;
  payment_mode: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'BEFTN' | 'RTGS' | 'BKASH' | 'NAGAD' | string;
  instrument_no?: string | null;
  instrument_date?: string | null;
  bank_name?: string | null;
  branch_name?: string | null;
  amount_received: number;
  late_fee_adjusted: number;
  installment_principal_adjusted: number;
  excess_advance_amount: number;
  qr_verification_token: string;
  qr_code_payload?: string | null;
  sms_confirmation_sent: boolean;
  sms_sent_at?: string | null;
  gl_voucher_id?: number | null;
  status: 'CLEARED' | 'PENDING_CLEARANCE' | 'BOUNCED_CANCELLED' | string;
  remarks?: string | null;
  allocations?: MoneyReceiptAllocation[];
  created_at?: string;
}

export interface LoanTranche {
  id: number;
  loan_id: number;
  tranche_number: number;
  milestone_title: string;
  sanctioned_tranche_amount: number;
  bank_inspection_date?: string | null;
  inspection_status: 'PENDING_INSPECTION' | 'INSPECTION_PASSED' | 'INSPECTION_REJECTED' | string;
  inspection_engineer_name?: string | null;
  inspection_notes?: string | null;
  disbursement_claimed_date?: string | null;
  disbursed_date?: string | null;
  disbursed_amount: number;
  payment_instrument_no?: string | null;
  receipt_id?: number | null;
  mr_number?: string | null;
  status: 'PENDING' | 'INSPECTION_DONE' | 'DISBURSED' | 'RECONCILED' | string;
  remarks?: string | null;
  created_at?: string;
}

export interface TripartiteLoan {
  id: number;
  loan_reference_no: string;
  booking_id: number;
  booking_reference_no?: string | null;
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  unit_number?: string | null;
  project_name?: string | null;
  financial_institution_code: string;
  bank_name: string;
  branch_name: string;
  sanction_letter_no: string;
  sanction_date: string;
  sanctioned_amount: number;
  disbursed_amount_total: number;
  developer_noc_ref?: string | null;
  developer_noc_date?: string | null;
  noc_status: 'PENDING' | 'ISSUED' | 'WAIVED' | string;
  tripartite_agreement_date?: string | null;
  bank_officer_name?: string | null;
  bank_officer_phone?: string | null;
  bank_officer_email?: string | null;
  status: 'DRAFT' | 'SANCTIONED' | 'NOC_ISSUED' | 'DISBURSING' | 'COMPLETED' | 'CANCELLED' | string;
  remarks?: string | null;
  tranches?: LoanTranche[];
  created_at?: string;
}

