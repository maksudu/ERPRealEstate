from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime

# -------------------------------------------------------------
# Customer Installment Schemas
# -------------------------------------------------------------
class CustomerInstallmentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    installment_no: int
    title: str
    due_date: date
    grace_period_days: int = 15
    payable_amount: float
    paid_amount: float = 0.00
    late_fee_accrued: float = 0.00
    surcharge_percentage: float = 2.00
    overdue_days: int = 0
    sms_alert_sent: bool = False
    whatsapp_alert_sent: bool = False
    last_alert_sent_at: Optional[datetime] = None
    status: str = "UPCOMING"
    milestone_trigger: Optional[str] = None

class CustomerInstallmentCreate(BaseModel):
    booking_id: int
    installment_no: int
    title: str
    due_date: date
    grace_period_days: Optional[int] = 15
    payable_amount: float
    milestone_trigger: Optional[str] = None

class MilestoneItemConfig(BaseModel):
    title: str
    percentage: float # e.g. 10.0 for 10%
    milestone_trigger: Optional[str] = None

class InstallmentScheduleGenerateRequest(BaseModel):
    booking_id: int
    plan_type: str # 'MONTHLY', 'QUARTERLY', 'CONSTRUCTION_MILESTONE', 'CUSTOM_MILESTONE'
    total_installments: Optional[int] = 24
    start_date: Optional[date] = None
    down_payment_percentage: Optional[float] = 20.00
    grace_period_days: Optional[int] = 15
    custom_milestones: Optional[List[MilestoneItemConfig]] = None

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
