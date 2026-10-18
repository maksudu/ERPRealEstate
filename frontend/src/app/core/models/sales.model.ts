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

export interface BookingNominee {
  id?: number;
  booking_id?: number;
  full_name: string;
  relation_to_buyer: string;
  contact_phone: string;
  email?: string | null;
  nid_or_passport?: string | null;
  nomination_percentage: number;
  effective_date?: string | null;
  supporting_document_url?: string | null;
  approval_status?: string;
  notes?: string | null;
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
  customer_email?: string | null;
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
  booking_money_target?: number | null;
  down_payment_target?: number | null;
  down_payment_received?: number;
  down_payment_due_date?: string | null;
  down_payment_status?: 'PENDING' | 'PARTIAL' | 'COMPLETED' | string;
  reservation_expiry_date?: string | null;
  sales_rep_name?: string | null;
  workflow_stage: string;
  status: 'PROVISIONAL' | 'AGREEMENT_SIGNED' | 'REGISTRATION_DONE' | 'CANCELLED' | 'TRANSFERRED' | string;
  notes?: string | null;
  joint_buyers?: BookingJointBuyer[];
  nominees?: BookingNominee[];
  cancellation?: BookingCancellation | null;
  created_at?: string;
}

export interface BookingCancellation {
  id: number;
  booking_id: number;
  cancellation_code?: string | null;
  cancellation_date?: string | null;
  cancellation_category: string;
  cancellation_reason: string;
  total_paid: number;
  deduction_type: string;
  forfeiture_deduction_percentage: number;
  forfeiture_deduction_amount: number;
  service_charge_amount: number;
  net_refund_amount: number;
  amount_refunded_so_far: number;
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'REJECTED' | string;
  
  // 3-Tier Approvals
  legal_approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  legal_approved_by?: string | null;
  legal_approval_date?: string | null;
  legal_notes?: string | null;
  sales_approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  sales_approved_by?: string | null;
  sales_approval_date?: string | null;
  finance_approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  finance_approved_by?: string | null;
  finance_approval_date?: string | null;

  // Refund Payment Controls
  refund_payment_mode: string;
  refund_bank_name?: string | null;
  refund_account_name?: string | null;
  refund_account_number?: string | null;
  refund_routing_number?: string | null;
  refund_cheque_no?: string | null;
  refund_payment_reference?: string | null;
  refund_disbursed_date?: string | null;

  customer_notified: boolean;
  customer_notified_at?: string | null;
  inventory_reverted: boolean;
  gl_voucher_reference?: string | null;
  settlement_notes?: string | null;

  // Eager fields
  booking_reference_no?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_code?: string | null;
  unit_number?: string | null;
  project_name?: string | null;
  final_contract_value?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface BookingCancellationCreate {
  booking_id: number;
  cancellation_category?: string;
  cancellation_reason: string;
  deduction_type?: string;
  forfeiture_deduction_percentage?: number;
  service_charge_amount?: number;
  refund_payment_mode?: string;
  refund_bank_name?: string | null;
  refund_account_name?: string | null;
  refund_account_number?: string | null;
  refund_routing_number?: string | null;
  settlement_notes?: string | null;
}

export interface BookingCancellationApprovalAction {
  tier: 'LEGAL' | 'SALES' | 'FINANCE';
  decision: 'APPROVED' | 'REJECTED';
  approved_by: string;
  notes?: string;
}

export interface BookingCancellationDisburseRefund {
  refund_payment_reference: string;
  refund_payment_mode?: string;
  amount_to_disburse: number;
  refund_disbursed_date?: string;
  revert_inventory?: boolean;
  notes?: string;
}

export interface PaginatedBookingCancellations {
  items: BookingCancellation[];
  total: number;
  limit: number;
  offset: number;
  total_paid_all: number;
  total_deductions_all: number;
  total_refunds_all: number;
}

export interface UnitTransfer {
  id: number;
  transfer_number: string;
  booking_id: number;
  from_customer_id: number;
  to_customer_id?: number | null;
  transfer_type: 'FULL_BUYER_SUBSTITUTION' | 'ADD_CO_BUYER' | 'REMOVE_CO_BUYER' | 'SHARE_AMENDMENT' | string;
  transfer_date?: string | null;
  
  co_buyer_name?: string | null;
  co_buyer_nid?: string | null;
  co_buyer_phone?: string | null;
  co_buyer_relation?: string | null;
  previous_share_percent: number;
  new_share_percent: number;

  outstanding_balance_at_transfer: number;
  is_dues_cleared: boolean;

  transfer_fee_percentage: number;
  transfer_fee_bdt: number;
  transfer_fee_receipt_no?: string | null;
  is_fee_paid: boolean;
  
  noc_document_url?: string | null;
  sale_permission_url?: string | null;
  affidavit_document_url?: string | null;

  approval_status: 'PENDING_COMPLIANCE' | 'LEGAL_APPROVED' | 'MANAGEMENT_APPROVED' | 'EXECUTED_COMPLETED' | 'REJECTED' | string;
  legal_approved_by?: string | null;
  management_approved_by?: string | null;
  approval_date?: string | null;

  revised_agreement_reference?: string | null;
  transfer_effective_date?: string | null;
  remarks?: string | null;

  // Eager joins
  booking_reference_no?: string | null;
  project_name?: string | null;
  unit_number?: string | null;
  from_customer_name?: string | null;
  from_customer_phone?: string | null;
  to_customer_name?: string | null;
  to_customer_phone?: string | null;
  final_contract_value?: number | null;
  total_paid_preserved?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface UnitTransferCreate {
  booking_id: number;
  transfer_type: string;
  to_customer_id?: number | null;
  co_buyer_name?: string | null;
  co_buyer_nid?: string | null;
  co_buyer_phone?: string | null;
  co_buyer_relation?: string | null;
  previous_share_percent?: number;
  new_share_percent?: number;
  transfer_fee_percentage?: number;
  noc_document_url?: string | null;
  sale_permission_url?: string | null;
  affidavit_document_url?: string | null;
  remarks?: string | null;
}

export interface UnitTransferApprovalAction {
  decision: 'LEGAL_APPROVED' | 'MANAGEMENT_APPROVED' | 'EXECUTED_COMPLETED' | 'REJECTED' | string;
  approved_by: string;
  transfer_fee_receipt_no?: string | null;
  revised_agreement_reference?: string | null;
  notes?: string | null;
}

export interface PaginatedUnitTransfers {
  items: UnitTransfer[];
  total: number;
  limit: number;
  offset: number;
  total_transfer_fees: number;
  total_completed_transfers: number;
}

export interface SalesMetrics {
  total_bookings: number;
  confirmed_bookings: number;
  active_reservations: number;
  outstanding_receivables: number;
  agreements_pending: number;
  signed_contract_value: number;
  cash_collected: number;
  recognized_revenue: number;
  gross_contract_value: number;
  total_earnest_collected: number;
  pending_discount_approvals: number;
  total_cancellations: number;
}

export interface DiscountLimitPolicy {
  id?: number;
  project_id?: number | null;
  project_name?: string | null;
  role_name: string;
  max_discount_percentage: number;
  max_discount_amount?: number | null;
  requires_justification: boolean;
  requires_attachment: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface PriceNegotiationProposal {
  id?: number;
  proposal_reference_no?: string;
  booking_id?: number | null;
  project_id: number;
  project_name?: string | null;
  project_code?: string | null;
  unit_id: number;
  unit_number?: string | null;
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_code?: string | null;
  submitted_by_rep_name: string;
  base_unit_price: number;
  chargeable_area_sqft?: number | null;
  price_per_sqft?: number | null;
  floor_facing_premium: number;
  parking_facility_charge: number;
  utility_other_fees: number;
  gross_list_price: number;
  requested_discount_amount: number;
  requested_discount_percentage: number;
  proposed_final_price: number;
  justification_reason: string;
  supporting_document_url?: string | null;
  required_approval_tier: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | string;
  approved_by_id?: number | null;
  approved_by_name?: string | null;
  decision_date?: string | null;
  approval_comments?: string | null;
  approved_discount_amount?: number | null;
  approved_final_price?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface BookingPaymentCollection {
  id?: number;
  receipt_number?: string;
  booking_id: number;
  booking_reference_no?: string | null;
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_code?: string | null;
  project_name?: string | null;
  project_code?: string | null;
  unit_number?: string | null;
  collection_type: 'BOOKING_MONEY' | 'DOWN_PAYMENT' | 'PARTIAL_DOWN_PAYMENT' | 'ADVANCE_INSTALLMENT' | string;
  amount: number;
  payment_date: string;
  payment_mode: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'BEFTN' | 'RTGS' | 'BKASH' | 'NAGAD' | 'CARD' | string;
  instrument_number?: string | null;
  instrument_date?: string | null;
  drawn_bank_name?: string | null;
  branch_name?: string | null;
  deposited_account_name?: string | null;
  transaction_reference?: string | null;
  
  // Spec 5.5 Calculation Fields
  approved_contract_price?: number | null;
  booking_money_target?: number | null;
  down_payment_target?: number | null;
  total_down_payment_cleared?: number | null;
  remaining_balance_after_dp?: number | null;
  net_down_payment_due?: number | null;

  // Accounting Control: Clearance & Cash Recognition
  is_cleared_cash: boolean;
  clearance_status: 'CLEARED' | 'PENDING_CLEARANCE' | 'DISHONOURED' | string;
  clearance_date?: string | null;
  dishonour_reason?: string | null;

  // Reversals & Refunds
  reversal_status: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | string;
  reversal_reason?: string | null;
  reversal_requested_by?: string | null;
  reversal_approved_by?: string | null;
  reversal_date?: string | null;

  // Bank Reconciliation & Accounting
  bank_reconciliation_status: 'UNRECONCILED' | 'RECONCILED' | string;
  reconciliation_date?: string | null;
  gl_voucher_reference?: string | null;
  sms_sent?: boolean;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OutstandingPaymentNotice {
  booking_id: number;
  booking_reference_no: string;
  project_name: string;
  unit_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  final_contract_value: number;
  booking_money_target: number;
  booking_money_received: number;
  down_payment_target: number;
  down_payment_received: number;
  net_down_payment_due: number;
  remaining_balance: number;
  due_date?: string | null;
  days_overdue: number;
  status: 'OVERDUE' | 'PARTIAL' | 'PENDING' | string;
}

export interface LegalDocumentTemplate {
  id?: number;
  template_code: string;
  document_type: string;
  title_en: string;
  title_bn?: string | null;
  header_branding_html?: string | null;
  content_template: string;
  footer_legal_disclaimer?: string | null;
  version: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SalesLegalDocument {
  id?: number;
  document_number: string;
  booking_id: number;
  booking_reference_no?: string | null;
  booking_number?: string | null;
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_code?: string | null;
  project_name?: string | null;
  project_code?: string | null;
  unit_number?: string | null;
  final_contract_value?: number | null;
  template_id?: number | null;
  template_code?: string | null;
  document_type: string;
  title: string;
  version: string;
  rendered_content: string;
  merge_data_json?: any;
  legal_review_status: 'DRAFT' | 'PENDING_LEGAL_REVIEW' | 'LEGAL_APPROVED' | 'EXECUTED_SIGNED' | 'REJECTED' | 'AMENDED' | string;
  legal_status?: string | null;
  legal_reviewed_by?: string | null;
  reviewed_by?: string | null;
  legal_review_date?: string | null;
  legal_review_notes?: string | null;
  first_party_signed: boolean;
  first_party_signed_at?: string | null;
  first_party_signatory_name?: string | null;
  second_party_signed: boolean;
  second_party_signed_at?: string | null;
  second_party_signatory_name?: string | null;
  witness_1_name?: string | null;
  witness_2_name?: string | null;
  execution_date?: string | null;
  checklist_status_json?: {
    buyer_nid_verified?: boolean;
    buyer_tin_certificate?: boolean;
    passport_photos_attached?: boolean;
    booking_money_cleared?: boolean;
    down_payment_cleared?: boolean;
    title_deed_searched?: boolean;
    rajuk_approval_verified?: boolean;
    stamp_duty_paid?: boolean;
    sub_registry_token_issued?: boolean;
    [key: string]: boolean | undefined;
  };
  deed_preparation_checklist?: any;
  amendment_reason?: string | null;
  audit_trail_json?: Array<{
    action: string;
    actor: string;
    timestamp: string;
    notes?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedSalesLegalDocuments {
  items: SalesLegalDocument[];
  total: number;
  limit: number;
  offset: number;
}

// -------------------------------------------------------------
// Spec 5.8: Customer-wise Sales Ledger & Statement Interfaces
// -------------------------------------------------------------
export interface CustomerSalesLedgerEntry {
  id: number;
  entry_number: string;
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_code?: string | null;
  booking_id?: number | null;
  booking_reference_no?: string | null;
  project_id?: number | null;
  project_name?: string | null;
  unit_id?: number | null;
  unit_number?: string | null;
  transaction_date: string;
  transaction_type: string;
  description: string;
  reference_no?: string | null;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  due_date?: string | null;
  days_overdue: number;
  ageing_bucket: string;
  payment_mode?: string | null;
  gl_account_code: string;
  gl_voucher_reference?: string | null;
  reconciliation_status: string;
  reconciled_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerAgingSummary {
  total_balance_due: number;
  current_not_due: number;
  overdue_1_30: number;
  overdue_31_60: number;
  overdue_61_90: number;
  overdue_over_90: number;
}

export interface CustomerPropertyLedgerSummary {
  booking_id: number;
  booking_reference_no: string;
  project_name: string;
  unit_number: string;
  contract_value: number;
  total_paid: number;
  balance_due: number;
  status: string;
}

export interface CustomerStatement {
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_code?: string | null;
  address?: string | null;
  total_properties: number;
  total_contract_value: number;
  total_debits: number;
  total_credits: number;
  net_balance_due: number;
  aging_summary: CustomerAgingSummary;
  properties: CustomerPropertyLedgerSummary[];
  entries: CustomerSalesLedgerEntry[];
  reconciliation_status: string;
  generated_at: string;
}

export interface PaginatedCustomerSalesLedger {
  items: CustomerSalesLedgerEntry[];
  total: number;
  limit: number;
  offset: number;
  total_debits: number;
  total_credits: number;
  net_balance_due: number;
  aging_summary: CustomerAgingSummary;
}

export interface CustomerLedgerAdjustment {
  id: number;
  adjustment_number: string;
  customer_id: number;
  customer_name?: string | null;
  booking_id: number;
  booking_reference_no?: string | null;
  adjustment_type: string;
  amount: number;
  adjustment_date: string;
  reason: string;
  approval_status: string;
  gl_account_code: string;
  gl_voucher_reference?: string | null;
  created_at?: string;
}

export interface CustomerLedgerAdjustmentCreate {
  customer_id: number;
  booking_id: number;
  adjustment_type: string;
  amount: number;
  adjustment_date?: string | null;
  reason: string;
  supporting_document_url?: string | null;
  gl_account_code?: string | null;
  gl_voucher_reference?: string | null;
}

export interface PaginatedLedgerAdjustments {
  items: CustomerLedgerAdjustment[];
  total: number;
  limit: number;
  offset: number;
}

// Spec 5.11 Registration & Deed Tracking
export interface RegistrationChecklistItem {
  step_number: number;
  title: string;
  description: string;
  mandatory: boolean;
  required_docs: string[];
  completed: boolean;
  verified_by?: string | null;
  completion_date?: string | null;
  notes?: string | null;
  document_url?: string | null;
}

export interface RegistrationChecklistTemplate {
  id: number;
  template_code: string;
  template_name: string;
  description?: string | null;
  property_type: string;
  checklist_schema: any[];
  is_active: boolean;
}

export interface RegistrationLegalIssue {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  corrective_action?: string | null;
  status: 'OPEN' | 'RESOLVED' | string;
  logged_at: string;
  resolved_at?: string | null;
  resolution_notes?: string | null;
}

export interface DeedRegistration {
  id: number;
  registration_tracking_no: string;
  booking_id: number;
  customer_id: number;
  project_id: number;
  unit_id: number;
  template_id?: number | null;

  deed_type: string;
  sub_registry_office: string;
  conducting_advocate?: string | null;
  status: 'NOT_STARTED' | 'DOCUMENTS_PENDING' | 'UNDER_LEGAL_REVIEW' | 'DRAFT_PREPARED' | 'SUBMITTED' | 'REGISTRATION_PENDING' | 'REGISTERED' | 'COMPLETED' | string;

  checklist_status?: Record<string, RegistrationChecklistItem> | null;

  total_registration_costs: number;
  stamp_duty_amount: number;
  registration_fee_amount: number;
  ait_tax_amount: number;
  local_gov_tax_amount: number;
  is_fees_cleared: boolean;

  appointment_date?: string | null;
  appointment_time?: string | null;
  deed_receipt_number?: string | null;
  registered_deed_number?: string | null;
  balam_book_no?: string | null;
  volume_no?: string | null;
  page_no?: string | null;
  deed_delivery_date?: string | null;
  vault_location?: string | null;

  legal_officer_name?: string | null;
  legal_validation_status: 'PENDING' | 'VALIDATED' | 'REJECTED' | string;
  legal_validation_date?: string | null;
  legal_validation_notes?: string | null;

  outstanding_issues?: RegistrationLegalIssue[] | null;
  remarks?: string | null;

  // Joined Eager Fields
  booking_reference_no?: string | null;
  project_name?: string | null;
  project_code?: string | null;
  unit_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  final_contract_value?: number | null;
  template_name?: string | null;
  template_code?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeedRegistrationCreate {
  booking_id: number;
  template_id?: number | null;
  deed_type?: string;
  sub_registry_office?: string;
  conducting_advocate?: string | null;
  total_registration_costs?: number;
  stamp_duty_amount?: number;
  registration_fee_amount?: number;
  ait_tax_amount?: number;
  local_gov_tax_amount?: number;
  remarks?: string | null;
}

export interface DeedRegistrationUpdateChecklist {
  step_id: string;
  completed: boolean;
  notes?: string | null;
  document_url?: string | null;
  verified_by?: string | null;
}

export interface DeedRegistrationScheduleAppointment {
  appointment_date: string;
  appointment_time?: string;
  sub_registry_office?: string;
  conducting_advocate?: string | null;
  notes?: string | null;
}

export interface DeedRegistrationRecordSubmission {
  deed_receipt_number: string;
  registered_deed_number?: string | null;
  balam_book_no?: string | null;
  volume_no?: string | null;
  page_no?: string | null;
  status?: string;
  deed_delivery_date?: string | null;
  vault_location?: string | null;
}

export interface DeedRegistrationLegalValidation {
  decision: 'VALIDATED' | 'REJECTED' | string;
  validated_by: string;
  notes?: string | null;
}

export interface DeedRegistrationLogIssue {
  title: string;
  description: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  corrective_action?: string | null;
}

export interface DeedRegistrationResolveIssue {
  issue_id: string;
  resolution_notes: string;
}

export interface PaginatedDeedRegistrations {
  items: DeedRegistration[];
  total: number;
  limit: number;
  offset: number;
  total_registered_count: number;
  total_in_progress_count: number;
  total_costs_all: number;
}

// Spec 5.12 Property Handover Management
export interface HandoverPrerequisiteItem {
  step_number: number;
  title: string;
  description: string;
  completed: boolean;
  verified_by?: string | null;
  completion_date?: string | null;
  notes?: string | null;
}

export interface HandoverInspectionItem {
  item: string;
  location: string;
  status: 'PENDING' | 'PASSED' | 'DEFECT_NOTED' | string;
  remarks?: string | null;
}

export interface HandoverKeysIssued {
  main_door_keys: number;
  bedroom_keys: number;
  bathroom_keys: number;
  mailbox_key: number;
  rfid_access_cards: number;
  parking_rfid_tags: number;
  receiver_name?: string | null;
  notes?: string | null;
}

export interface HandoverWarranties {
  lift_warranty: boolean;
  generator_warranty: boolean;
  sanitary_warranty: boolean;
  electrical_warranty: boolean;
  structural_warranty: boolean;
  dlp_months: number;
  warranty_provider_notes?: string | null;
}

export interface HandoverSnagItem {
  id: string;
  item_name: string;
  room_location: string;
  defect_description: string;
  severity: 'COSMETIC' | 'MINOR' | 'MAJOR' | 'CRITICAL' | string;
  status: 'OPEN' | 'RESOLVED' | string;
  logged_at: string;
  target_rectification_date?: string | null;
  rectified_at?: string | null;
  rectification_notes?: string | null;
}

export interface PropertyHandover {
  id: number;
  handover_tracking_no: string;
  booking_id: number;
  customer_id: number;
  project_id: number;
  unit_id: number;

  responsible_staff_name?: string | null;
  responsible_engineer_name?: string | null;

  status: 'NOT_STARTED' | 'PREREQUISITES_IN_REVIEW' | 'INSPECTION_SCHEDULED' | 'SNAGGING_IN_PROGRESS' | 'RECTIFICATION_PENDING' | 'READY_FOR_HANDOVER' | 'POSSESSION_HANDED_OVER' | 'COMPLETED' | string;
  contractual_completion_status: 'PENDING' | 'VERIFIED' | 'WAIVED' | string;
  financial_clearance_status: 'PENDING' | 'CLEARED' | 'OUTSTANDING_DUES' | string;
  legal_registration_status: 'PENDING' | 'REGISTERED' | 'DEED_PENDING' | string;
  physical_possession_status: 'NOT_TAKEN' | 'CONDITIONAL_FITOUT' | 'FULL_PHYSICAL_POSSESSION' | string;

  prerequisites_checklist?: HandoverPrerequisiteItem[] | null;
  inspection_checklist?: HandoverInspectionItem[] | null;

  electricity_meter_no?: string | null;
  electricity_meter_reading?: string | null;
  electricity_provider?: string | null;

  gas_meter_no?: string | null;
  gas_meter_reading?: string | null;
  gas_provider?: string | null;

  water_meter_no?: string | null;
  water_meter_reading?: string | null;
  water_consumer_id?: string | null;

  keys_issued_json?: HandoverKeysIssued | null;
  warranty_documents_json?: HandoverWarranties | null;
  snag_items?: HandoverSnagItem[] | null;

  appointment_date?: string | null;
  appointment_time?: string | null;

  handover_certificate_no?: string | null;
  handover_date?: string | null;
  customer_acknowledged: boolean;
  customer_acknowledgment_date?: string | null;
  customer_declaration_notes?: string | null;
  possession_certificate_url?: string | null;
  dlp_end_date?: string | null;
  remarks?: string | null;

  booking_reference_no?: string | null;
  project_name?: string | null;
  project_code?: string | null;
  unit_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  final_contract_value?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyHandoverCreate {
  booking_id: number;
  responsible_staff_name?: string | null;
  responsible_engineer_name?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  remarks?: string | null;
}

export interface PropertyHandoverUpdatePrerequisites {
  prerequisites_checklist: HandoverPrerequisiteItem[];
  contractual_completion_status?: string;
  financial_clearance_status?: string;
  legal_registration_status?: string;
}

export interface PropertyHandoverUpdateInspection {
  inspection_checklist: HandoverInspectionItem[];
}

export interface PropertyHandoverUpdateUtilities {
  electricity_meter_no?: string | null;
  electricity_meter_reading?: string | null;
  electricity_provider?: string | null;
  gas_meter_no?: string | null;
  gas_meter_reading?: string | null;
  gas_provider?: string | null;
  water_meter_no?: string | null;
  water_meter_reading?: string | null;
  water_consumer_id?: string | null;
}

export interface PropertyHandoverIssueKeys {
  main_door_keys: number;
  bedroom_keys: number;
  bathroom_keys: number;
  mailbox_key: number;
  rfid_access_cards: number;
  parking_rfid_tags: number;
  receiver_name?: string | null;
  notes?: string | null;
}

export interface PropertyHandoverUpdateWarranties {
  lift_warranty: boolean;
  generator_warranty: boolean;
  sanitary_warranty: boolean;
  electrical_warranty: boolean;
  structural_warranty: boolean;
  dlp_months: number;
  warranty_provider_notes?: string | null;
}

export interface PropertyHandoverLogSnag {
  item_name: string;
  room_location: string;
  defect_description: string;
  severity?: 'COSMETIC' | 'MINOR' | 'MAJOR' | 'CRITICAL' | string;
  target_rectification_date?: string | null;
}

export interface PropertyHandoverResolveSnag {
  snag_id: string;
  rectification_notes: string;
}

export interface PropertyHandoverScheduleAppointment {
  appointment_date: string;
  appointment_time?: string;
  responsible_staff_name?: string | null;
  responsible_engineer_name?: string | null;
  remarks?: string | null;
}

export interface PropertyHandoverExecutePossession {
  handover_date: string;
  customer_acknowledged: boolean;
  customer_declaration_notes?: string | null;
  possession_certificate_url?: string | null;
  dlp_months?: number;
  remarks?: string | null;
}

export interface PaginatedPropertyHandovers {
  items: PropertyHandover[];
  total: number;
  limit: number;
  offset: number;
  total_handed_over_count: number;
  total_snagging_count: number;
  total_scheduled_count: number;
}

export interface PropertyReportItem {
  unit_id: number;
  unit_number: string;
  floor_number: number;
  project_id: number;
  project_name: string;
  project_code: string;
  unit_type: string;
  facing: string;
  area_sft: number;
  bed_count: number;
  bath_count: number;
  inventory_status: string;

  booking_id?: number | null;
  booking_reference_no?: string | null;
  workflow_stage?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;

  list_price: number;
  contract_value?: number | null;
  amount_collected: number;
  balance_due: number;
  collection_percentage: number;

  deed_status?: string | null;
  deed_number?: string | null;
  handover_status?: string | null;
  possession_status?: string | null;
  handover_date?: string | null;
  handover_certificate_no?: string | null;
}

export interface PropertyReportKPIs {
  total_units: number;
  total_portfolio_value: number;
  total_contract_value: number;
  total_collected_amount: number;
  total_outstanding_amount: number;
  total_handed_over_count: number;
  total_available_count: number;
  total_booked_count: number;
  overall_collection_rate: number;
  handover_completion_rate: number;
}

export interface PropertyReportResponse {
  items: PropertyReportItem[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  total_pages: number;

  total_units: number;
  total_portfolio_value: number;
  total_collected_amount: number;
  total_outstanding_amount: number;
  total_handed_over_count: number;
  total_available_count: number;
  total_booked_count: number;
  kpis?: PropertyReportKPIs;
}

export interface PropertyReportFilterParams {
  search?: string;
  project_id?: number;
  unit_type?: string;
  inventory_status?: string;
  workflow_stage?: string;
  possession_status?: string;
  facing?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  limit?: number;
  offset?: number;
}







