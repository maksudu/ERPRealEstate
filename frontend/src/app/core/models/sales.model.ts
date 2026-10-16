export interface Booking {
  id: number;
  booking_reference_no: string;
  project_id: number;
  project_name?: string | null;
  unit_id: number;
  unit_number?: string | null;
  primary_customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  booking_date: string;
  base_unit_price: number;
  discount_amount: number;
  discount_percentage: number;
  required_approval_tier: 'SALES_MANAGER' | 'DIRECTOR' | 'MANAGING_DIRECTOR';
  discount_approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  discount_approved_by_id?: number | null;
  discount_approved_by_name?: string | null;
  discount_approval_notes?: string | null;
  final_contract_value: number;
  earnest_money_received: number;
  down_payment_total: number;
  status: 'PROVISIONAL' | 'AGREEMENT_SIGNED' | 'REGISTRATION_DONE' | 'CANCELLED' | 'TRANSFERRED';
  notes?: string | null;
  cancellation?: BookingCancellation | null;
  created_at?: string;
}

export interface BookingCancellation {
  id: number;
  booking_id: number;
  booking_reference_no?: string | null;
  customer_name?: string | null;
  unit_number?: string | null;
  cancellation_date?: string | null;
  cancellation_reason: string;
  total_paid: number;
  forfeiture_deduction_percentage: number;
  forfeiture_deduction_amount: number;
  net_refund_amount: number;
  status: 'REQUESTED' | 'APPROVED' | 'REFUNDED' | 'SETTLED';
  refund_cheque_no?: string | null;
  settlement_notes?: string | null;
  created_at?: string;
}

export interface UnitTransfer {
  id: number;
  booking_id: number;
  from_customer_id: number;
  from_customer_name?: string | null;
  to_customer_id: number;
  to_customer_name?: string | null;
  transfer_date?: string | null;
  transfer_fee_bdt: number;
  transfer_memo_no?: string | null;
  approval_status: string;
  remarks?: string | null;
  created_at?: string;
}

export interface SalesMetrics {
  total_bookings: number;
  gross_contract_value: number;
  total_earnest_collected: number;
  pending_discount_approvals: number;
  total_cancellations: number;
}
