export interface BookingJointBuyer {
  id?: number;
  booking_id?: number;
  full_name_en: string;
  full_name_bn?: string | null;
  nid_number?: string | null;
  passport_number?: string | null;
  tin_number?: string | null;
  primary_phone: string;
  email?: string | null;
  present_address?: string | null;
  relation_to_primary: string; // SPOUSE, SON, DAUGHTER, BROTHER, SISTER, BUSINESS_PARTNER
  share_percentage: number;
  photo_url?: string | null;
  nid_scan_url?: string | null;
  created_at?: string;
}

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
  parking_charge: number;
  utility_charge: number;
  documentation_charge: number;
  parking_slot_number?: string | null;
  discount_amount: number;
  discount_percentage: number;
  required_approval_tier: 'SALES_MANAGER' | 'DIRECTOR' | 'HEAD_OF_SALES' | 'MANAGING_DIRECTOR' | string;
  discount_approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  discount_approved_by_id?: number | null;
  discount_approved_by_name?: string | null;
  discount_approval_notes?: string | null;
  governance_request_id?: number | null;
  final_contract_value: number;
  earnest_money_received: number;
  down_payment_total: number;
  status: 'PROVISIONAL' | 'AGREEMENT_SIGNED' | 'REGISTRATION_DONE' | 'CANCELLED' | 'TRANSFERRED';
  notes?: string | null;
  joint_buyers?: BookingJointBuyer[];
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
