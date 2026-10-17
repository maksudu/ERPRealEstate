export interface PhotoItem {
  url: string;
  caption: string;
  uploaded_at?: string;
}

export interface ConstructionUpdate {
  id: number;
  project_id: number;
  project_name?: string;
  tower_id?: number;
  tower_name?: string;
  update_title: string;
  update_date: string;
  week_number: number;
  completion_percentage: number;
  milestone_phase: string;
  engineer_notes?: string;
  photos: PhotoItem[];
  status: string;
  created_at?: string;
}

export interface CustomerUnitSummary {
  booking_id: number;
  booking_reference_no: string;
  project_id: number;
  project_name: string;
  project_location?: string;
  unit_id: number;
  unit_number: string;
  floor_number: number;
  unit_type: string;
  facing: string;
  bed_count: number;
  bath_count: number;
  balcony_count: number;
  gross_saleable_area_sqft: number;
  net_carpet_area_sqft: number;
  parking_bay_number?: string;
  floor_plan_image_url?: string;
  booking_status: string;
  total_contract_value_bdt: number;
  total_paid_bdt: number;
  outstanding_dues_bdt: number;
  construction_progress_percentage: number;
}

export interface CustomerPaymentLedgerItem {
  receipt_id: number;
  mr_number: string;
  receipt_date: string;
  amount_bdt: number;
  payment_mode: string;
  instrument_no?: string;
  bank_name?: string;
  status: string;
  qr_token: string;
  late_fee_adjusted: number;
  principal_adjusted: number;
}

export interface CustomerInstallmentTimelineItem {
  installment_id: number;
  installment_no: number;
  title: string;
  due_date: string;
  payable_amount: number;
  paid_amount: number;
  late_fee_accrued: number;
  outstanding_amount: number;
  status: string;
  milestone_trigger?: string;
  is_current: boolean;
}

export interface CustomerServiceTicket {
  id: number;
  ticket_number: string;
  customer_id: number;
  customer_name?: string;
  booking_id: number;
  unit_id: number;
  unit_number?: string;
  category: string;
  title: string;
  description: string;
  location_in_unit?: string;
  urgency: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  attachment_photo_url?: string;
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'ASSIGNED_TO_ENGINEER' | 'WORK_IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assigned_engineer_id?: number;
  assigned_engineer_name?: string;
  resolution_notes?: string;
  resolved_at?: string;
  created_at?: string;
}

export interface OnlinePaymentCheckoutResponse {
  transaction_reference: string;
  gateway_url: string;
  amount_bdt: number;
  gateway_fee_bdt: number;
  payment_gateway: string;
  gateway_status: string;
}

export interface OnlinePaymentVerificationResponse {
  transaction_reference: string;
  gateway_status: string;
  generated_mr_number?: string;
  amount_paid_bdt: number;
  message: string;
}

export interface CustomerPortalOverview {
  customer_id: number;
  customer_name: string;
  customer_code: string;
  primary_phone: string;
  email?: string;
  unit_summary?: CustomerUnitSummary;
  construction_updates: ConstructionUpdate[];
  payment_ledger: CustomerPaymentLedgerItem[];
  upcoming_installments: CustomerInstallmentTimelineItem[];
  active_tickets: CustomerServiceTicket[];
}
