from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import date, datetime
from decimal import Decimal


class PhotoItem(BaseModel):
    url: str
    caption: str
    uploaded_at: Optional[str] = None


class ConstructionUpdateCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    update_title: str
    update_date: Optional[date] = None
    week_number: int = 1
    completion_percentage: float = 0.0
    milestone_phase: str = "SUPER_STRUCTURE"
    engineer_notes: Optional[str] = None
    photos: List[PhotoItem] = []


class ConstructionUpdateResponse(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    tower_id: Optional[int] = None
    tower_name: Optional[str] = None
    update_title: str
    update_date: date
    week_number: int
    completion_percentage: float
    milestone_phase: str
    engineer_notes: Optional[str] = None
    photos: List[PhotoItem] = []
    status: str
    created_at: Optional[datetime] = None


class CustomerUnitSummary(BaseModel):
    booking_id: int
    booking_reference_no: str
    project_id: int
    project_name: str
    project_location: Optional[str] = None
    unit_id: int
    unit_number: str
    floor_number: int
    unit_type: str
    facing: str
    bed_count: int
    bath_count: int
    balcony_count: int
    gross_saleable_area_sqft: float
    net_carpet_area_sqft: float
    parking_bay_number: Optional[str] = None
    floor_plan_image_url: Optional[str] = None
    booking_status: str
    total_contract_value_bdt: float
    total_paid_bdt: float
    outstanding_dues_bdt: float
    construction_progress_percentage: float = 0.0


class CustomerPaymentLedgerItem(BaseModel):
    receipt_id: int
    mr_number: str
    receipt_date: date
    amount_bdt: float
    payment_mode: str
    instrument_no: Optional[str] = None
    bank_name: Optional[str] = None
    status: str
    qr_token: str
    late_fee_adjusted: float = 0.0
    principal_adjusted: float = 0.0


class CustomerInstallmentTimelineItem(BaseModel):
    installment_id: int
    installment_no: int
    title: str
    due_date: date
    payable_amount: float
    paid_amount: float
    late_fee_accrued: float
    outstanding_amount: float
    status: str
    milestone_trigger: Optional[str] = None
    is_current: bool = False


class CustomerServiceTicketCreate(BaseModel):
    booking_id: int
    category: str = "GENERAL_MAINTENANCE"
    title: str
    description: str
    location_in_unit: Optional[str] = None
    urgency: str = "NORMAL" # NORMAL, URGENT, EMERGENCY
    attachment_photo_url: Optional[str] = None


class CustomerServiceTicketUpdate(BaseModel):
    status: Optional[str] = None # SUBMITTED, ACKNOWLEDGED, WORK_IN_PROGRESS, RESOLVED, CLOSED
    resolution_notes: Optional[str] = None
    assigned_engineer_id: Optional[int] = None


class CustomerServiceTicketResponse(BaseModel):
    id: int
    ticket_number: str
    customer_id: int
    customer_name: Optional[str] = None
    booking_id: int
    unit_id: int
    unit_number: Optional[str] = None
    category: str
    title: str
    description: str
    location_in_unit: Optional[str] = None
    urgency: str
    attachment_photo_url: Optional[str] = None
    status: str
    assigned_engineer_id: Optional[int] = None
    assigned_engineer_name: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class OnlinePaymentCheckoutRequest(BaseModel):
    booking_id: int
    installment_id: int
    payment_gateway: str = "BKASH" # BKASH, NAGAD, SSLCOMMERZ, VISA_MASTERCARD, CITY_TOUCH
    payer_mobile: Optional[str] = None


class OnlinePaymentCheckoutResponse(BaseModel):
    transaction_reference: str
    gateway_url: str
    amount_bdt: float
    gateway_fee_bdt: float
    payment_gateway: str
    gateway_status: str


class OnlinePaymentVerificationRequest(BaseModel):
    transaction_reference: str
    gateway_transaction_id: str
    simulated_success: bool = True


class OnlinePaymentVerificationResponse(BaseModel):
    transaction_reference: str
    gateway_status: str
    generated_mr_number: Optional[str] = None
    amount_paid_bdt: float = 0.0
    message: str


class CustomerPortalOverviewResponse(BaseModel):
    customer_id: int
    customer_name: str
    customer_code: str
    primary_phone: str
    email: Optional[str] = None
    unit_summary: Optional[CustomerUnitSummary] = None
    construction_updates: List[ConstructionUpdateResponse] = []
    payment_ledger: List[CustomerPaymentLedgerItem] = []
    upcoming_installments: List[CustomerInstallmentTimelineItem] = []
    active_tickets: List[CustomerServiceTicketResponse] = []
