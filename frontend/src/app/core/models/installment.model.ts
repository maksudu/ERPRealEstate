export interface CustomMilestoneItem {
  title: string;
  percentage: number;
  milestone_trigger?: string;
}

export interface CustomerInstallment {
  id: number;
  booking_id: number;
  booking_reference_no?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  unit_number?: string | null;
  installment_no: number;
  title: string;
  due_date: string;
  grace_period_days: number;
  payable_amount: number;
  paid_amount: number;
  late_fee_accrued: number;
  surcharge_percentage: number;
  overdue_days: number;
  sms_alert_sent: boolean;
  whatsapp_alert_sent: boolean;
  last_alert_sent_at?: string | null;
  status: 'UPCOMING' | 'DUE' | 'PAID' | 'OVERDUE';
  milestone_trigger?: string | null;
  created_at?: string;
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
}
