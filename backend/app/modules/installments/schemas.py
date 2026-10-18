from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime

# -------------------------------------------------------------
# Customer Installment Schemas
# -------------------------------------------------------------
class CustomerInstallmentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    schedule_id: Optional[int] = None
    installment_no: int
    installment_type: str = "MONTHLY_INSTALLMENT"
    title: str
    percentage: Optional[float] = None
    fixed_amount: Optional[float] = None
    due_date: date
    grace_period_days: int = 15
    payable_amount: float
    paid_amount: float = 0.00
    late_fee_accrued: float = 0.00
    
    invoice_date: Optional[date] = None
    invoice_number: Optional[str] = None
    amount_billed: float = 0.00
    balance_due: float = 0.00
    
    schedule_version: str = "v1.0"
    amendment_reference: Optional[str] = None
    reminder_status: str = "SCHEDULED"
    
    surcharge_percentage: float = 2.00
    overdue_days: int = 0
    sms_alert_sent: bool = False
    whatsapp_alert_sent: bool = False
    last_alert_sent_at: Optional[datetime] = None
    status: str = "UPCOMING"
    milestone_trigger: Optional[str] = None
    notes: Optional[str] = None

class CustomerInstallmentCreate(BaseModel):
    booking_id: int
    schedule_id: Optional[int] = None
    installment_no: int
    installment_type: Optional[str] = "MONTHLY_INSTALLMENT"
    title: str
    percentage: Optional[float] = None
    fixed_amount: Optional[float] = None
    due_date: date
    grace_period_days: Optional[int] = 15
    payable_amount: float
    milestone_trigger: Optional[str] = None
    notes: Optional[str] = None

class MilestoneItemConfig(BaseModel):
    title: str
    percentage: float # e.g. 10.0 for 10%
    installment_type: Optional[str] = "CONSTRUCTION_MILESTONE"
    milestone_trigger: Optional[str] = None
    due_date: Optional[date] = None

class InstallmentSchedulePreviewItem(BaseModel):
    installment_no: int
    installment_type: str
    title: str
    percentage: Optional[float] = None
    due_date: date
    grace_period_days: int
    payable_amount: float
    is_rounding_adjusted: bool = False
    rounding_adjustment: float = 0.00
    milestone_trigger: Optional[str] = None

class InstallmentSchedulePreviewRequest(BaseModel):
    booking_id: int
    plan_type: str = "MONTHLY" # 'MONTHLY', 'QUARTERLY', 'CONSTRUCTION_MILESTONE', 'CUSTOM'
    total_installments: Optional[int] = 36
    down_payment_percentage: Optional[float] = 15.00
    start_date: Optional[date] = None
    grace_period_days: Optional[int] = 15
    custom_milestones: Optional[List[MilestoneItemConfig]] = None

class InstallmentSchedulePreviewResponse(BaseModel):
    booking_id: int
    booking_reference_no: str
    customer_name: str
    project_name: str
    unit_number: str
    approved_contract_price: float
    booking_money_amount: float
    down_payment_percentage: float
    down_payment_amount: float
    net_down_payment_due: float
    installment_balance_amount: float
    total_installment_count: int
    regular_installment_amount: float
    rounding_adjustment_amount: float
    rounding_adjusted_installment_no: int
    calculated_total_sum: float
    discrepancy_amount: float
    is_validated: bool
    installments: List[InstallmentSchedulePreviewItem]

class InstallmentScheduleGenerateRequest(BaseModel):
    booking_id: int
    agreement_reference_no: Optional[str] = None
    plan_type: str = "MONTHLY" # 'MONTHLY', 'QUARTERLY', 'CONSTRUCTION_MILESTONE', 'CUSTOM'
    total_installments: Optional[int] = 36
    start_date: Optional[date] = None
    down_payment_percentage: Optional[float] = 15.00
    grace_period_days: Optional[int] = 15
    custom_milestones: Optional[List[MilestoneItemConfig]] = None
    notes: Optional[str] = None

class InstallmentScheduleAmendRequest(BaseModel):
    amendment_reason: str
    amendment_reference: Optional[str] = None
    plan_type: str = "MONTHLY"
    total_installments: Optional[int] = 36
    down_payment_percentage: Optional[float] = 15.00
    start_date: Optional[date] = None
    grace_period_days: Optional[int] = 15
    custom_milestones: Optional[List[MilestoneItemConfig]] = None
    notes: Optional[str] = None

class BookingInstallmentScheduleBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    schedule_code: str
    booking_id: int
    customer_id: int
    agreement_reference_no: Optional[str] = None
    version: str = "v1.0"
    plan_type: str = "MONTHLY"
    approved_contract_price: float
    booking_money_amount: float = 0.00
    down_payment_percentage: float = 15.00
    down_payment_amount: float = 0.00
    installment_balance_amount: float
    total_installment_count: int
    regular_installment_amount: float
    rounding_adjustment_amount: float = 0.00
    rounding_adjusted_installment_no: int = 1
    start_date: date
    grace_period_days: int = 15
    late_surcharge_rate_monthly: float = 2.00
    status: str = "ACTIVE"
    amendment_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class BookingInstallmentScheduleResponse(BookingInstallmentScheduleBase):
    booking_reference_no: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    total_paid_amount: float = 0.00
    total_balance_due: float = 0.00
    total_overdue_amount: float = 0.00
    installments: Optional[List['CustomerInstallmentResponse']] = None

class PaginatedInstallmentSchedulesResponse(BaseModel):
    items: List[BookingInstallmentScheduleResponse]
    total: int
    limit: int
    offset: int

class InstallmentInvoiceGenerateRequest(BaseModel):
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None

class InstallmentInvoiceResponse(BaseModel):
    installment_id: int
    invoice_number: str
    invoice_date: date
    booking_reference_no: str
    customer_name: str
    amount_billed: float
    balance_due: float
    due_date: date
    status: str

class InstallmentPaymentRequest(BaseModel):
    payment_amount: float
    payment_mode: str = "Cash" # 'Cash', 'Cheque', 'bKash', 'Nagad', 'Bank_Transfer'
    money_receipt_no: Optional[str] = None
    remarks: Optional[str] = None

class InstallmentSurchargeCalculateRequest(BaseModel):
    surcharge_percentage_monthly: Optional[float] = 2.00 # standard 2% per 30-day overdue

class InstallmentAlertDispatchRequest(BaseModel):
    installment_ids: List[int]
    channels: List[str] = ["SMS", "WHATSAPP"]
    custom_message: Optional[str] = None

class InstallmentAlertLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    installment_id: int
    booking_id: int
    customer_id: int
    channel: str
    recipient_phone: Optional[str] = None
    recipient_email: Optional[str] = None
    message_content: str
    status: str
    sent_at: Optional[datetime] = None

class CustomerInstallmentResponse(CustomerInstallmentBase):
    id: int
    booking_reference_no: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    unit_number: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# PDC Vault Schemas
# -------------------------------------------------------------
class PDCVaultBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    customer_id: int
    cheque_number: str
    bank_name: str
    branch_name: str
    routing_number: Optional[str] = None
    maturity_date: date
    cheque_amount: float
    pouch_barcode: str
    status: str = "IN_VAULT"
    dishonour_memo_date: Optional[date] = None
    dishonour_reason: Optional[str] = None
    sms_reminder_sent: bool = False

class PDCVaultCreate(BaseModel):
    booking_id: int
    customer_id: int
    cheque_number: str
    bank_name: str
    branch_name: str
    routing_number: Optional[str] = None
    maturity_date: date
    cheque_amount: float
    pouch_barcode: Optional[str] = None

class PDCStatusUpdateRequest(BaseModel):
    status: str # 'IN_VAULT', 'SENT_TO_BANK', 'HONOURED', 'DISHONOURED_BOUNCED'
    dishonour_memo_date: Optional[date] = None
    dishonour_reason: Optional[str] = None

class PDCVaultResponse(PDCVaultBase):
    id: int
    booking_reference_no: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# NI Act 138 Legal Action Schemas
# -------------------------------------------------------------
class NI138LegalActionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pdc_cheque_id: int
    dishonour_memo_received_date: date
    statutory_notice_deadline_date: date
    notice_served_to_client_date: Optional[date] = None
    registered_post_ad_no: Optional[str] = None
    client_30day_settlement_deadline: Optional[date] = None
    status: str = "NOTICE_PENDING"
    court_case_no: Optional[str] = None
    legal_counsel_name: Optional[str] = None
    remarks: Optional[str] = None

class NI138ServeNoticeRequest(BaseModel):
    notice_served_to_client_date: date
    registered_post_ad_no: str
    legal_counsel_name: Optional[str] = None
    remarks: Optional[str] = None

class NI138FileCaseRequest(BaseModel):
    court_case_no: str
    legal_counsel_name: str
    remarks: Optional[str] = None

class NI138LegalActionResponse(NI138LegalActionBase):
    id: int
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    cheque_amount: Optional[float] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    booking_reference_no: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Vault & Collection Metrics
# -------------------------------------------------------------
class InstallmentMetrics(BaseModel):
    total_installments_due: int
    total_overdue_amount: float
    total_pdc_in_vault: int
    total_vault_amount: float
    total_dishonoured_cheques: int
    active_ni138_actions: int
    total_money_receipts_count: Optional[int] = 0
    total_money_receipts_amount: Optional[float] = 0.00
    total_tripartite_loans_count: Optional[int] = 0
    total_tripartite_disbursed_amount: Optional[float] = 0.00


# -------------------------------------------------------------
# Money Receipt (MR) Schemas (Prompt 10)
# -------------------------------------------------------------
class MoneyReceiptCreate(BaseModel):
    booking_id: int
    receipt_date: date
    payment_mode: str = "CASH" # 'CASH', 'CHEQUE', 'BANK_TRANSFER', 'BEFTN', 'RTGS', 'BKASH', 'NAGAD'
    instrument_no: Optional[str] = None
    instrument_date: Optional[date] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    amount_received: float
    remarks: Optional[str] = None
    send_sms_notification: bool = True

class MoneyReceiptAllocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    receipt_id: int
    installment_id: int
    installment_no: Optional[int] = None
    installment_title: Optional[str] = None
    allocated_late_fee: float
    allocated_principal: float
    total_allocated: float
    created_at: Optional[datetime] = None

class MoneyReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mr_number: str
    receipt_date: date
    booking_id: int
    booking_reference_no: Optional[str] = None
    customer_id: int
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    unit_number: Optional[str] = None
    project_name: Optional[str] = None
    payment_mode: str
    instrument_no: Optional[str] = None
    instrument_date: Optional[date] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    amount_received: float
    late_fee_adjusted: float
    installment_principal_adjusted: float
    excess_advance_amount: float
    qr_verification_token: str
    qr_code_payload: Optional[str] = None
    sms_confirmation_sent: bool
    sms_sent_at: Optional[datetime] = None
    gl_voucher_id: Optional[int] = None
    status: str
    remarks: Optional[str] = None
    allocations: List[MoneyReceiptAllocationResponse] = []
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Bank Home Loan Tripartite Schemas (Prompt 10)
# -------------------------------------------------------------
class LoanTrancheCreate(BaseModel):
    tranche_number: int
    milestone_title: str
    sanctioned_tranche_amount: float
    remarks: Optional[str] = None

class LoanTrancheInspectionRequest(BaseModel):
    bank_inspection_date: date
    inspection_status: str = "INSPECTION_PASSED" # 'INSPECTION_PASSED', 'INSPECTION_REJECTED'
    inspection_engineer_name: Optional[str] = None
    inspection_notes: Optional[str] = None

class LoanTrancheDisburseRequest(BaseModel):
    disbursed_date: date
    disbursed_amount: float
    payment_mode: str = "BANK_TRANSFER" # 'BANK_TRANSFER', 'CHEQUE', 'BEFTN', 'RTGS'
    payment_instrument_no: str
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    remarks: Optional[str] = None

class LoanTrancheResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    loan_id: int
    tranche_number: int
    milestone_title: str
    sanctioned_tranche_amount: float
    bank_inspection_date: Optional[date] = None
    inspection_status: str
    inspection_engineer_name: Optional[str] = None
    inspection_notes: Optional[str] = None
    disbursement_claimed_date: Optional[date] = None
    disbursed_date: Optional[date] = None
    disbursed_amount: float
    payment_instrument_no: Optional[str] = None
    receipt_id: Optional[int] = None
    mr_number: Optional[str] = None
    status: str
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None

class TripartiteLoanCreate(BaseModel):
    booking_id: int
    financial_institution_code: str # DBH_FINANCE, IDLC, SCB, CITY_BANK, BRAC_BANK
    bank_name: str
    branch_name: str
    sanction_letter_no: str
    sanction_date: date
    sanctioned_amount: float
    developer_noc_ref: Optional[str] = None
    developer_noc_date: Optional[date] = None
    noc_status: Optional[str] = "PENDING"
    tripartite_agreement_date: Optional[date] = None
    bank_officer_name: Optional[str] = None
    bank_officer_phone: Optional[str] = None
    bank_officer_email: Optional[str] = None
    remarks: Optional[str] = None
    tranches: Optional[List[LoanTrancheCreate]] = None

class TripartiteLoanNOCRequest(BaseModel):
    developer_noc_ref: str
    developer_noc_date: date
    remarks: Optional[str] = None

class TripartiteLoanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    loan_reference_no: str
    booking_id: int
    booking_reference_no: Optional[str] = None
    customer_id: int
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    unit_number: Optional[str] = None
    project_name: Optional[str] = None
    financial_institution_code: str
    bank_name: str
    branch_name: str
    sanction_letter_no: str
    sanction_date: date
    sanctioned_amount: float
    disbursed_amount_total: float
    developer_noc_ref: Optional[str] = None
    developer_noc_date: Optional[date] = None
    noc_status: str
    tripartite_agreement_date: Optional[date] = None
    bank_officer_name: Optional[str] = None
    bank_officer_phone: Optional[str] = None
    bank_officer_email: Optional[str] = None
    status: str
    remarks: Optional[str] = None
    tranches: List[LoanTrancheResponse] = []
    created_at: Optional[datetime] = None

