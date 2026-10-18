from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime

# Spec 5.9 and 5.10 Schemas below
# -------------------------------------------------------------
# Spec 5.9: Booking Cancellation & Refund Schemas
# -------------------------------------------------------------
class BookingCancellationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    cancellation_code: Optional[str] = None
    cancellation_date: Optional[date] = None
    cancellation_category: str = "BUYER_DEFAULT"
    cancellation_reason: str
    total_paid: float
    deduction_type: str = "REHAB_STATUTORY"
    forfeiture_deduction_percentage: float = 10.00
    forfeiture_deduction_amount: float
    service_charge_amount: float = 0.00
    net_refund_amount: float
    amount_refunded_so_far: float = 0.00
    status: str = "REQUESTED"
    
    legal_approval_status: str = "PENDING"
    legal_approved_by: Optional[str] = None
    legal_approval_date: Optional[datetime] = None
    legal_notes: Optional[str] = None
    sales_approval_status: str = "PENDING"
    sales_approved_by: Optional[str] = None
    sales_approval_date: Optional[datetime] = None
    finance_approval_status: str = "PENDING"
    finance_approved_by: Optional[str] = None
    finance_approval_date: Optional[datetime] = None

    refund_payment_mode: str = "BANK_TRANSFER"
    refund_bank_name: Optional[str] = None
    refund_account_name: Optional[str] = None
    refund_account_number: Optional[str] = None
    refund_routing_number: Optional[str] = None
    refund_cheque_no: Optional[str] = None
    refund_payment_reference: Optional[str] = None
    refund_disbursed_date: Optional[date] = None
    
    customer_notified: bool = False
    customer_notified_at: Optional[datetime] = None
    inventory_reverted: bool = False
    gl_voucher_reference: Optional[str] = None
    settlement_notes: Optional[str] = None


class BookingCancellationCreate(BaseModel):
    booking_id: int
    cancellation_category: Optional[str] = "BUYER_DEFAULT"
    cancellation_reason: str
    deduction_type: Optional[str] = "REHAB_STATUTORY"
    forfeiture_deduction_percentage: Optional[float] = 10.00
    service_charge_amount: Optional[float] = 0.00
    refund_payment_mode: Optional[str] = "BANK_TRANSFER"
    refund_bank_name: Optional[str] = None
    refund_account_name: Optional[str] = None
    refund_account_number: Optional[str] = None
    refund_routing_number: Optional[str] = None
    settlement_notes: Optional[str] = None


class BookingCancellationApprovalAction(BaseModel):
    tier: str # 'LEGAL', 'SALES', 'FINANCE'
    decision: str # 'APPROVED', 'REJECTED'
    approved_by: str
    notes: Optional[str] = None


class BookingCancellationDisburseRefund(BaseModel):
    refund_payment_reference: str
    refund_payment_mode: Optional[str] = "BANK_TRANSFER"
    amount_to_disburse: float
    refund_disbursed_date: Optional[date] = None
    revert_inventory: bool = True
    notes: Optional[str] = None


class BookingCancellationResponse(BookingCancellationBase):
    id: int
    booking_reference_no: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_code: Optional[str] = None
    unit_number: Optional[str] = None
    project_name: Optional[str] = None
    final_contract_value: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PaginatedBookingCancellationsResponse(BaseModel):
    items: List[BookingCancellationResponse]
    total: int
    limit: int
    offset: int
    total_paid_all: float = 0.00
    total_deductions_all: float = 0.00
    total_refunds_all: float = 0.00


# -------------------------------------------------------------
# Spec 5.10: Property Transfer & Buyer Change Schemas
# -------------------------------------------------------------
class UnitTransferBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transfer_number: Optional[str] = None
    booking_id: int
    from_customer_id: int
    to_customer_id: Optional[int] = None
    transfer_type: str = "FULL_BUYER_SUBSTITUTION"
    transfer_date: Optional[date] = None
    
    co_buyer_name: Optional[str] = None
    co_buyer_nid: Optional[str] = None
    co_buyer_phone: Optional[str] = None
    co_buyer_relation: Optional[str] = None
    previous_share_percent: float = 100.00
    new_share_percent: float = 100.00

    outstanding_balance_at_transfer: float = 0.00
    is_dues_cleared: bool = True

    transfer_fee_percentage: float = 1.00
    transfer_fee_bdt: float = 0.00
    transfer_fee_receipt_no: Optional[str] = None
    is_fee_paid: bool = False
    
    noc_document_url: Optional[str] = None
    sale_permission_url: Optional[str] = None
    affidavit_document_url: Optional[str] = None

    approval_status: str = "PENDING_COMPLIANCE"
    legal_approved_by: Optional[str] = None
    management_approved_by: Optional[str] = None
    approval_date: Optional[datetime] = None

    revised_agreement_reference: Optional[str] = None
    transfer_effective_date: Optional[date] = None
    remarks: Optional[str] = None


class UnitTransferCreate(BaseModel):
    booking_id: int
    transfer_type: str = "FULL_BUYER_SUBSTITUTION"
    to_customer_id: Optional[int] = None
    co_buyer_name: Optional[str] = None
    co_buyer_nid: Optional[str] = None
    co_buyer_phone: Optional[str] = None
    co_buyer_relation: Optional[str] = None
    previous_share_percent: Optional[float] = 100.00
    new_share_percent: Optional[float] = 100.00
    transfer_fee_percentage: Optional[float] = 1.00
    noc_document_url: Optional[str] = None
    sale_permission_url: Optional[str] = None
    affidavit_document_url: Optional[str] = None
    remarks: Optional[str] = None


class UnitTransferApprovalAction(BaseModel):
    decision: str # 'LEGAL_APPROVED', 'MANAGEMENT_APPROVED', 'EXECUTED_COMPLETED', 'REJECTED'
    approved_by: str
    transfer_fee_receipt_no: Optional[str] = None
    revised_agreement_reference: Optional[str] = None
    notes: Optional[str] = None


class UnitTransferResponse(UnitTransferBase):
    id: int
    booking_reference_no: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    from_customer_name: Optional[str] = None
    from_customer_phone: Optional[str] = None
    to_customer_name: Optional[str] = None
    to_customer_phone: Optional[str] = None
    final_contract_value: Optional[float] = None
    total_paid_preserved: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PaginatedUnitTransfersResponse(BaseModel):
    items: List[UnitTransferResponse]
    total: int
    limit: int
    offset: int
    total_transfer_fees: float = 0.00
    total_completed_transfers: int = 0


# -------------------------------------------------------------
# Joint Buyer KYC Schemas
# -------------------------------------------------------------
class BookingJointBuyerBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name_en: str
    full_name_bn: Optional[str] = None
    nid_number: Optional[str] = None
    passport_number: Optional[str] = None
    tin_number: Optional[str] = None
    primary_phone: str
    email: Optional[str] = None
    present_address: Optional[str] = None
    relation_to_primary: str = "CO_APPLICANT"
    share_percentage: float = 50.00
    photo_url: Optional[str] = None
    nid_scan_url: Optional[str] = None

class BookingJointBuyerCreate(BookingJointBuyerBase):
    pass

class BookingJointBuyerResponse(BookingJointBuyerBase):
    id: int
    booking_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Nominee KYC Schemas (Spec 5.3)
# -------------------------------------------------------------
class BookingNomineeBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str
    relation_to_buyer: str # SPOUSE, SON, DAUGHTER, BROTHER, SISTER, FATHER, MOTHER, OTHER
    contact_phone: str
    email: Optional[str] = None
    nid_or_passport: Optional[str] = None
    nomination_percentage: float = 100.00
    effective_date: Optional[date] = None
    supporting_document_url: Optional[str] = None
    approval_status: str = "APPROVED"
    notes: Optional[str] = None

class BookingNomineeCreate(BookingNomineeBase):
    pass

class BookingNomineeResponse(BookingNomineeBase):
    id: int
    booking_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# -------------------------------------------------------------
# Sales Booking Schemas
# -------------------------------------------------------------
class BookingBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_reference_no: str
    project_id: int
    unit_id: int
    primary_customer_id: int
    booking_date: date
    base_unit_price: float
    parking_charge: float = 0.00
    utility_charge: float = 0.00
    documentation_charge: float = 0.00
    parking_slot_number: Optional[str] = None
    discount_amount: float = 0.00
    discount_percentage: float = 0.00
    required_approval_tier: str = "SALES_MANAGER"
    discount_approval_status: str = "APPROVED"
    discount_approved_by_id: Optional[int] = None
    discount_approval_notes: Optional[str] = None
    governance_request_id: Optional[int] = None
    final_contract_value: float
    earnest_money_received: float = 0.00
    down_payment_total: float = 0.00
    booking_money_target: Optional[float] = None
    down_payment_target: Optional[float] = None
    down_payment_received: float = 0.00
    down_payment_due_date: Optional[date] = None
    down_payment_status: str = "PENDING"
    reservation_expiry_date: Optional[date] = None
    sales_rep_name: Optional[str] = None
    workflow_stage: str = "05_BOOKING_CONFIRMED"
    status: str = "PROVISIONAL"
    notes: Optional[str] = None

class BookingCreate(BaseModel):
    project_id: int
    unit_id: int
    primary_customer_id: int
    booking_date: Optional[date] = None
    parking_charge: Optional[float] = 0.00
    utility_charge: Optional[float] = 0.00
    documentation_charge: Optional[float] = 0.00
    parking_slot_number: Optional[str] = None
    discount_amount: Optional[float] = 0.00
    earnest_money_received: Optional[float] = 500000.00
    down_payment_total: Optional[float] = 0.00
    reservation_expiry_date: Optional[date] = None
    sales_rep_name: Optional[str] = None
    workflow_stage: Optional[str] = "05_BOOKING_CONFIRMED"
    status: Optional[str] = "PROVISIONAL"
    notes: Optional[str] = None
    joint_buyers: Optional[List[BookingJointBuyerCreate]] = []
    nominees: Optional[List[BookingNomineeCreate]] = []

class BookingUpdate(BaseModel):
    project_id: Optional[int] = None
    unit_id: Optional[int] = None
    primary_customer_id: Optional[int] = None
    booking_date: Optional[date] = None
    parking_charge: Optional[float] = None
    utility_charge: Optional[float] = None
    documentation_charge: Optional[float] = None
    parking_slot_number: Optional[str] = None
    discount_amount: Optional[float] = None
    earnest_money_received: Optional[float] = None
    down_payment_total: Optional[float] = None
    reservation_expiry_date: Optional[date] = None
    sales_rep_name: Optional[str] = None
    workflow_stage: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class DiscountApprovalAction(BaseModel):
    decision: str # 'APPROVED', 'REJECTED'
    approved_by_id: Optional[int] = None
    approval_notes: Optional[str] = None
    biometric_token: Optional[str] = None # For MD mobile 1-tap biometric auth

class BookingResponse(BookingBase):
    id: int
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    discount_approved_by_name: Optional[str] = None
    joint_buyers: List[BookingJointBuyerResponse] = []
    nominees: List[BookingNomineeResponse] = []
    cancellation: Optional[BookingCancellationResponse] = None
    created_at: Optional[datetime] = None

class PaginatedBookingsResponse(BaseModel):
    items: List[BookingResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Sales Summary & Pipeline Metrics (Spec 5.1)
# -------------------------------------------------------------
class SalesMetrics(BaseModel):
    total_bookings: int
    confirmed_bookings: int = 86
    active_reservations: int = 24
    outstanding_receivables: float = 85000000.00
    agreements_pending: int = 12
    signed_contract_value: float = 0.00
    cash_collected: float = 0.00
    recognized_revenue: float = 0.00
    gross_contract_value: float
    total_earnest_collected: float
    pending_discount_approvals: int
    total_cancellations: int


# -------------------------------------------------------------
# Price Negotiation & Discount Policy Schemas (Spec 5.4)
# -------------------------------------------------------------
class DiscountLimitPolicyBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: Optional[int] = None
    role_name: str # 'SALES_REPRESENTATIVE', 'SALES_MANAGER', 'HEAD_OF_SALES', 'MANAGING_DIRECTOR'
    max_discount_percentage: float
    max_discount_amount: Optional[float] = None
    requires_justification: bool = True
    requires_attachment: bool = False
    is_active: bool = True

class DiscountLimitPolicyCreate(DiscountLimitPolicyBase):
    pass

class DiscountLimitPolicyResponse(DiscountLimitPolicyBase):
    id: int
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None


class PriceNegotiationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    proposal_reference_no: str
    booking_id: Optional[int] = None
    project_id: int
    unit_id: int
    customer_id: int
    submitted_by_rep_name: str
    base_unit_price: float
    chargeable_area_sqft: Optional[float] = None
    price_per_sqft: Optional[float] = None
    floor_facing_premium: float = 0.00
    parking_facility_charge: float = 0.00
    utility_other_fees: float = 0.00
    gross_list_price: float
    requested_discount_amount: float = 0.00
    requested_discount_percentage: float = 0.00
    proposed_final_price: float
    justification_reason: str
    supporting_document_url: Optional[str] = None
    required_approval_tier: str = "SALES_MANAGER"
    status: str = "PENDING_REVIEW"
    approved_by_id: Optional[int] = None
    approved_by_name: Optional[str] = None
    decision_date: Optional[datetime] = None
    approval_comments: Optional[str] = None
    approved_discount_amount: Optional[float] = None
    approved_final_price: Optional[float] = None

class PriceNegotiationCreate(BaseModel):
    booking_id: Optional[int] = None
    project_id: int
    unit_id: int
    customer_id: int
    submitted_by_rep_name: str = "Sales Representative"
    base_unit_price: float
    chargeable_area_sqft: Optional[float] = None
    price_per_sqft: Optional[float] = None
    floor_facing_premium: Optional[float] = 0.00
    parking_facility_charge: Optional[float] = 0.00
    utility_other_fees: Optional[float] = 0.00
    requested_discount_amount: float = 0.00
    justification_reason: str
    supporting_document_url: Optional[str] = None

class PriceNegotiationReviewAction(BaseModel):
    decision: str # 'APPROVED' or 'REJECTED'
    approved_by_name: Optional[str] = None
    approval_comments: Optional[str] = None
    approved_discount_amount: Optional[float] = None
    biometric_token: Optional[str] = None

class PriceNegotiationResponse(PriceNegotiationBase):
    id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    unit_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PaginatedPriceNegotiationsResponse(BaseModel):
    items: List[PriceNegotiationResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Booking Money & Down Payment Collections (Spec 5.5)
# -------------------------------------------------------------
class BookingPaymentCollectionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    customer_id: int
    collection_type: str = "BOOKING_MONEY" # 'BOOKING_MONEY', 'DOWN_PAYMENT', 'PARTIAL_DOWN_PAYMENT', 'ADVANCE_INSTALLMENT'
    amount: float
    payment_date: date
    payment_mode: str = "BANK_TRANSFER" # 'CASH', 'CHEQUE', 'BANK_TRANSFER', 'BEFTN', 'RTGS', 'BKASH', 'NAGAD', 'CARD'
    instrument_number: Optional[str] = None
    instrument_date: Optional[date] = None
    drawn_bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    deposited_account_name: Optional[str] = None
    transaction_reference: Optional[str] = None
    remarks: Optional[str] = None

class BookingPaymentCollectionCreate(BookingPaymentCollectionBase):
    send_sms_notification: bool = True

class BookingPaymentClearanceAction(BaseModel):
    clearance_status: str # 'CLEARED' or 'DISHONOURED'
    clearance_date: Optional[date] = None
    dishonour_reason: Optional[str] = None
    deposited_account_name: Optional[str] = None

class BookingPaymentReversalAction(BaseModel):
    reversal_reason: str
    requested_by: str = "Finance Officer"

class BookingPaymentReversalApprovalAction(BaseModel):
    decision: str # 'APPROVED' or 'REJECTED'
    approved_by: str = "Authorized CFO / Managing Director"
    comments: Optional[str] = None

class BookingPaymentReconciliationAction(BaseModel):
    reconciliation_date: date
    deposited_account_name: str
    gl_voucher_reference: Optional[str] = None

class BookingPaymentResponse(BookingPaymentCollectionBase):
    id: int
    receipt_number: str
    booking_reference_no: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    unit_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_code: Optional[str] = None
    
    # Financial context & Spec 5.5 calculation
    approved_contract_price: Optional[float] = None
    booking_money_target: Optional[float] = None
    down_payment_target: Optional[float] = None
    total_down_payment_cleared: Optional[float] = None
    remaining_balance_after_dp: Optional[float] = None
    net_down_payment_due: Optional[float] = None

    # Clearance & Reversal Status
    is_cleared_cash: bool
    clearance_status: str
    clearance_date: Optional[date] = None
    dishonour_reason: Optional[str] = None
    reversal_status: str
    reversal_reason: Optional[str] = None
    reversal_requested_by: Optional[str] = None
    reversal_approved_by: Optional[str] = None
    reversal_date: Optional[datetime] = None
    bank_reconciliation_status: str
    reconciliation_date: Optional[date] = None
    gl_voucher_reference: Optional[str] = None
    sms_sent: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PaginatedBookingPaymentsResponse(BaseModel):
    items: List[BookingPaymentResponse]
    total: int
    limit: int
    offset: int

class OutstandingPaymentNoticeResponse(BaseModel):
    booking_id: int
    booking_reference_no: str
    project_name: str
    unit_number: str
    customer_id: int
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    final_contract_value: float
    booking_money_target: float
    booking_money_received: float
    down_payment_target: float
    down_payment_received: float
    net_down_payment_due: float
    remaining_balance: float
    due_date: Optional[date] = None
    days_overdue: int = 0
    status: str


# -------------------------------------------------------------
# Sales Agreement & Deed Document Preparation (Spec 5.6)
# -------------------------------------------------------------
class LegalDocumentTemplateBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    template_code: str
    document_type: str
    title_en: str
    title_bn: Optional[str] = None
    header_branding_html: Optional[str] = None
    content_template: str
    footer_legal_disclaimer: Optional[str] = None
    version: str = "v1.0"
    is_active: bool = True

class LegalDocumentTemplateCreate(LegalDocumentTemplateBase):
    pass

class LegalDocumentTemplateResponse(LegalDocumentTemplateBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SalesLegalDocumentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    customer_id: int
    template_id: Optional[int] = None
    document_type: str
    title: str
    version: str = "v1.0"
    rendered_content: str
    merge_data_json: Optional[dict] = None
    legal_review_status: str = "DRAFT"
    legal_reviewed_by: Optional[str] = None
    legal_review_date: Optional[datetime] = None
    legal_review_notes: Optional[str] = None
    first_party_signed: bool = False
    first_party_signed_at: Optional[date] = None
    first_party_signatory_name: Optional[str] = None
    second_party_signed: bool = False
    second_party_signed_at: Optional[date] = None
    second_party_signatory_name: Optional[str] = None
    witness_1_name: Optional[str] = None
    witness_2_name: Optional[str] = None
    execution_date: Optional[date] = None
    checklist_status_json: Optional[dict] = None
    amendment_reason: Optional[str] = None
    audit_trail_json: Optional[list] = None

class SalesLegalDocumentGenerateRequest(BaseModel):
    booking_id: int
    document_type: str # One of the 13 Spec 5.6 types
    template_id: Optional[int] = None
    custom_title: Optional[str] = None
    additional_clauses: Optional[str] = None
    amendment_reason: Optional[str] = None
    first_party_signatory_name: Optional[str] = "Managing Director, Blueoceans Holdings Ltd."
    second_party_signatory_name: Optional[str] = None
    witness_1_name: Optional[str] = None
    witness_2_name: Optional[str] = None
    execution_date: Optional[date] = None

class SalesLegalDocumentReviewAction(BaseModel):
    decision: str # 'LEGAL_APPROVED', 'REJECTED', 'AMENDED'
    reviewed_by: str = "Advocate Imran Hossain (Head of Legal & Registration)"
    notes: Optional[str] = None

class SalesLegalDocumentSignAction(BaseModel):
    party: str # 'FIRST_PARTY', 'SECOND_PARTY', 'BOTH'
    first_party_signatory_name: Optional[str] = None
    second_party_signatory_name: Optional[str] = None
    witness_1_name: Optional[str] = None
    witness_2_name: Optional[str] = None
    execution_date: Optional[date] = None

class SalesLegalDocumentChecklistUpdate(BaseModel):
    checklist_status_json: dict

class SalesLegalDocumentResponse(SalesLegalDocumentBase):
    id: int
    document_number: str
    booking_reference_no: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    unit_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_code: Optional[str] = None
    final_contract_value: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PaginatedSalesLegalDocumentsResponse(BaseModel):
    items: List[SalesLegalDocumentResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Customer-wise Sales Ledger & Statement Schemas (Spec 5.8)
# -------------------------------------------------------------
class CustomerSalesLedgerEntryBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    entry_number: str
    customer_id: int
    booking_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None
    transaction_date: date
    transaction_type: str
    description: str
    reference_no: Optional[str] = None
    debit_amount: float = 0.00
    credit_amount: float = 0.00
    running_balance: float = 0.00
    due_date: Optional[date] = None
    days_overdue: int = 0
    ageing_bucket: str = "CURRENT"
    payment_mode: Optional[str] = None
    gl_account_code: str = "1200-AR-FLAT-SALES"
    gl_voucher_reference: Optional[str] = None
    reconciliation_status: str = "RECONCILED"
    reconciled_at: Optional[datetime] = None
    notes: Optional[str] = None


class CustomerSalesLedgerEntryResponse(CustomerSalesLedgerEntryBase):
    id: int
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_code: Optional[str] = None
    booking_reference_no: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CustomerAgingSummary(BaseModel):
    total_balance_due: float = 0.00
    current_not_due: float = 0.00
    overdue_1_30: float = 0.00
    overdue_31_60: float = 0.00
    overdue_61_90: float = 0.00
    overdue_over_90: float = 0.00


class CustomerPropertyLedgerSummary(BaseModel):
    booking_id: int
    booking_reference_no: str
    project_name: str
    unit_number: str
    contract_value: float
    total_paid: float
    balance_due: float
    status: str


class CustomerStatementResponse(BaseModel):
    customer_id: int
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    customer_code: Optional[str] = None
    address: Optional[str] = None
    total_properties: int = 1
    total_contract_value: float = 0.00
    total_debits: float = 0.00
    total_credits: float = 0.00
    net_balance_due: float = 0.00
    aging_summary: CustomerAgingSummary
    properties: List[CustomerPropertyLedgerSummary] = []
    entries: List[CustomerSalesLedgerEntryResponse] = []
    reconciliation_status: str = "RECONCILED"
    generated_at: datetime = Field(default_factory=datetime.now)


class PaginatedCustomerSalesLedgerResponse(BaseModel):
    items: List[CustomerSalesLedgerEntryResponse]
    total: int
    limit: int
    offset: int
    total_debits: float = 0.00
    total_credits: float = 0.00
    net_balance_due: float = 0.00
    aging_summary: CustomerAgingSummary


class CustomerLedgerAdjustmentCreate(BaseModel):
    customer_id: int
    booking_id: int
    adjustment_type: str # 'CREDIT_NOTE', 'DEBIT_NOTE', 'GOODWILL_DISCOUNT', 'INTEREST_WAIVER', 'UTILITY_RECONCILIATION', 'LEGAL_RECONCILIATION'
    amount: float
    adjustment_date: Optional[date] = None
    reason: str
    supporting_document_url: Optional[str] = None
    gl_account_code: Optional[str] = "1200-AR-FLAT-SALES"
    gl_voucher_reference: Optional[str] = None


class CustomerLedgerAdjustmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    adjustment_number: str
    customer_id: int
    customer_name: Optional[str] = None
    booking_id: int
    booking_reference_no: Optional[str] = None
    adjustment_type: str
    amount: float
    adjustment_date: date
    reason: str
    approval_status: str
    gl_account_code: str
    gl_voucher_reference: Optional[str] = None
    created_at: Optional[datetime] = None


class PaginatedLedgerAdjustmentsResponse(BaseModel):
    items: List[CustomerLedgerAdjustmentResponse]
    total: int
    limit: int
    offset: int


# ==============================================================================
# Spec 5.11: Registration & Deed Tracking Schemas
# ==============================================================================

class RegistrationChecklistTemplateBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    template_code: str
    template_name: str
    description: Optional[str] = None
    property_type: str = "RESIDENTIAL_APARTMENT"
    checklist_schema: List[dict]
    is_active: bool = True

class RegistrationChecklistTemplateCreate(RegistrationChecklistTemplateBase):
    pass

class RegistrationChecklistTemplateResponse(RegistrationChecklistTemplateBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DeedRegistrationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    registration_tracking_no: Optional[str] = None
    booking_id: int
    customer_id: int
    project_id: int
    unit_id: int
    template_id: Optional[int] = None

    deed_type: str = "SALE_DEED_SAF_KABALA"
    sub_registry_office: str = "Gulshan Sub-Registry Office"
    conducting_advocate: Optional[str] = None
    status: str = "NOT_STARTED"

    checklist_status: Optional[dict] = None

    total_registration_costs: float = 0.00
    stamp_duty_amount: float = 0.00
    registration_fee_amount: float = 0.00
    ait_tax_amount: float = 0.00
    local_gov_tax_amount: float = 0.00
    is_fees_cleared: bool = False

    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    deed_receipt_number: Optional[str] = None
    registered_deed_number: Optional[str] = None
    balam_book_no: Optional[str] = None
    volume_no: Optional[str] = None
    page_no: Optional[str] = None
    deed_delivery_date: Optional[date] = None
    vault_location: Optional[str] = None

    legal_officer_name: Optional[str] = None
    legal_validation_status: str = "PENDING"
    legal_validation_date: Optional[datetime] = None
    legal_validation_notes: Optional[str] = None

    outstanding_issues: Optional[List[dict]] = None
    remarks: Optional[str] = None


class DeedRegistrationCreate(BaseModel):
    booking_id: int
    template_id: Optional[int] = None
    deed_type: Optional[str] = "SALE_DEED_SAF_KABALA"
    sub_registry_office: Optional[str] = "Gulshan Sub-Registry Office"
    conducting_advocate: Optional[str] = None
    total_registration_costs: Optional[float] = 0.00
    stamp_duty_amount: Optional[float] = 0.00
    registration_fee_amount: Optional[float] = 0.00
    ait_tax_amount: Optional[float] = 0.00
    local_gov_tax_amount: Optional[float] = 0.00
    remarks: Optional[str] = None


class DeedRegistrationUpdateChecklist(BaseModel):
    step_id: str
    completed: bool
    notes: Optional[str] = None
    document_url: Optional[str] = None
    verified_by: Optional[str] = "Legal Officer"


class DeedRegistrationScheduleAppointment(BaseModel):
    appointment_date: date
    appointment_time: Optional[str] = "11:00 AM"
    sub_registry_office: Optional[str] = None
    conducting_advocate: Optional[str] = None
    notes: Optional[str] = None


class DeedRegistrationRecordSubmission(BaseModel):
    deed_receipt_number: str
    registered_deed_number: Optional[str] = None
    balam_book_no: Optional[str] = None
    volume_no: Optional[str] = None
    page_no: Optional[str] = None
    status: Optional[str] = "SUBMITTED"
    deed_delivery_date: Optional[date] = None
    vault_location: Optional[str] = None


class DeedRegistrationLegalValidation(BaseModel):
    decision: str # 'VALIDATED', 'REJECTED'
    validated_by: str
    notes: Optional[str] = None


class DeedRegistrationLogIssue(BaseModel):
    title: str
    description: str
    severity: Optional[str] = "MEDIUM" # LOW, MEDIUM, HIGH, CRITICAL
    corrective_action: Optional[str] = None


class DeedRegistrationResolveIssue(BaseModel):
    issue_id: str
    resolution_notes: str


class DeedRegistrationResponse(DeedRegistrationBase):
    id: int
    booking_reference_no: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    unit_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    final_contract_value: Optional[float] = None
    template_name: Optional[str] = None
    template_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PaginatedDeedRegistrationsResponse(BaseModel):
    items: List[DeedRegistrationResponse]
    total: int
    limit: int
    offset: int
    total_registered_count: int = 0
    total_in_progress_count: int = 0
    total_costs_all: float = 0.00


# -------------------------------------------------------------
# Spec 5.12 Property Handover Management Schemas
# -------------------------------------------------------------
class PropertyHandoverBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    handover_tracking_no: str
    booking_id: int
    customer_id: int
    project_id: int
    unit_id: int

    responsible_staff_name: Optional[str] = None
    responsible_engineer_name: Optional[str] = None

    status: str = "NOT_STARTED"
    contractual_completion_status: str = "PENDING"
    financial_clearance_status: str = "PENDING"
    legal_registration_status: str = "PENDING"
    physical_possession_status: str = "NOT_TAKEN"

    prerequisites_checklist: Optional[List[dict]] = None
    inspection_checklist: Optional[List[dict]] = None

    electricity_meter_no: Optional[str] = None
    electricity_meter_reading: Optional[str] = None
    electricity_provider: Optional[str] = "DESCO"

    gas_meter_no: Optional[str] = None
    gas_meter_reading: Optional[str] = None
    gas_provider: Optional[str] = "TITAS_GAS"

    water_meter_no: Optional[str] = None
    water_meter_reading: Optional[str] = None
    water_consumer_id: Optional[str] = "DWASA"

    keys_issued_json: Optional[dict] = None
    warranty_documents_json: Optional[dict] = None
    snag_items: Optional[List[dict]] = None

    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None

    handover_certificate_no: Optional[str] = None
    handover_date: Optional[date] = None
    customer_acknowledged: bool = False
    customer_acknowledgment_date: Optional[date] = None
    customer_declaration_notes: Optional[str] = None
    possession_certificate_url: Optional[str] = None
    dlp_end_date: Optional[date] = None
    remarks: Optional[str] = None


class PropertyHandoverCreate(BaseModel):
    booking_id: int
    responsible_staff_name: Optional[str] = None
    responsible_engineer_name: Optional[str] = None
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = "11:00 AM"
    remarks: Optional[str] = None


class PropertyHandoverUpdatePrerequisites(BaseModel):
    prerequisites_checklist: List[dict]
    contractual_completion_status: Optional[str] = None
    financial_clearance_status: Optional[str] = None
    legal_registration_status: Optional[str] = None


class PropertyHandoverUpdateInspection(BaseModel):
    inspection_checklist: List[dict]


class PropertyHandoverUpdateUtilities(BaseModel):
    electricity_meter_no: Optional[str] = None
    electricity_meter_reading: Optional[str] = None
    electricity_provider: Optional[str] = "DESCO"

    gas_meter_no: Optional[str] = None
    gas_meter_reading: Optional[str] = None
    gas_provider: Optional[str] = "TITAS_GAS"

    water_meter_no: Optional[str] = None
    water_meter_reading: Optional[str] = None
    water_consumer_id: Optional[str] = "DWASA"


class PropertyHandoverIssueKeys(BaseModel):
    main_door_keys: int = 3
    bedroom_keys: int = 6
    bathroom_keys: int = 3
    mailbox_key: int = 2
    rfid_access_cards: int = 2
    parking_rfid_tags: int = 1
    receiver_name: Optional[str] = None
    notes: Optional[str] = None


class PropertyHandoverUpdateWarranties(BaseModel):
    lift_warranty: bool = True
    generator_warranty: bool = True
    sanitary_warranty: bool = True
    electrical_warranty: bool = True
    structural_warranty: bool = True
    dlp_months: int = 12
    warranty_provider_notes: Optional[str] = None


class PropertyHandoverLogSnag(BaseModel):
    item_name: str
    room_location: str
    defect_description: str
    severity: Optional[str] = "MINOR"
    target_rectification_date: Optional[date] = None


class PropertyHandoverResolveSnag(BaseModel):
    snag_id: str
    rectification_notes: str


class PropertyHandoverScheduleAppointment(BaseModel):
    appointment_date: date
    appointment_time: Optional[str] = "11:00 AM"
    responsible_staff_name: Optional[str] = None
    responsible_engineer_name: Optional[str] = None
    remarks: Optional[str] = None


class PropertyHandoverExecutePossession(BaseModel):
    handover_date: date
    customer_acknowledged: bool = True
    customer_declaration_notes: Optional[str] = None
    possession_certificate_url: Optional[str] = None
    dlp_months: Optional[int] = 12
    remarks: Optional[str] = None


class PropertyHandoverResponse(PropertyHandoverBase):
    id: int
    booking_reference_no: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    unit_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    final_contract_value: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PaginatedPropertyHandoversResponse(BaseModel):
    items: List[PropertyHandoverResponse]
    total: int
    limit: int
    offset: int
    total_handed_over_count: int = 0
    total_snagging_count: int = 0
    total_scheduled_count: int = 0


# -------------------------------------------------------------
# Property & Sales Portfolio Intelligence Report Schemas
# -------------------------------------------------------------
class PropertyReportItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    unit_id: int
    unit_number: str
    floor_number: int
    project_id: int
    project_name: str
    project_code: str
    unit_type: str
    facing: str
    area_sft: float
    bed_count: int
    bath_count: int
    inventory_status: str

    booking_id: Optional[int] = None
    booking_reference_no: Optional[str] = None
    workflow_stage: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

    list_price: float = 0.00
    contract_value: Optional[float] = None
    amount_collected: float = 0.00
    balance_due: float = 0.00
    collection_percentage: float = 0.00

    deed_status: Optional[str] = None
    deed_number: Optional[str] = None
    handover_status: Optional[str] = None
    possession_status: Optional[str] = None
    handover_date: Optional[date] = None
    handover_certificate_no: Optional[str] = None


class PropertyReportResponse(BaseModel):
    items: List[PropertyReportItem]
    total: int
    limit: int
    offset: int
    page: int = 1
    total_pages: int = 1

    total_units: int = 0
    total_portfolio_value: float = 0.00
    total_collected_amount: float = 0.00
    total_outstanding_amount: float = 0.00
    total_handed_over_count: int = 0
    total_available_count: int = 0
    total_booked_count: int = 0
    kpis: Optional[Dict[str, Any]] = None








