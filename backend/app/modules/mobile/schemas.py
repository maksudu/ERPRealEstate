"""
Mobile Sales App request schemas.
No new DB models — all payloads map onto existing CRM / Inventory / Sales / Governance models.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# ---------------- Leads ----------------
class MobileLeadCreate(BaseModel):
    lead_name: str = Field(..., min_length=2, max_length=191)
    primary_phone: str = Field(..., min_length=6, max_length=32)
    email: Optional[str] = None
    lead_source_id: str = "MANUAL_ENTRY"
    campaign_name: Optional[str] = None
    interested_project_id: Optional[int] = None
    property_type: Optional[str] = None
    preferred_location: Optional[str] = None
    required_area_sqft: Optional[Decimal] = None
    bedrooms: Optional[int] = None
    budget_range_min: Optional[Decimal] = None
    budget_range_max: Optional[Decimal] = None
    expected_purchase_date: Optional[date] = None
    priority: str = "MEDIUM"
    assigned_sales_rep_id: Optional[int] = None
    notes: Optional[str] = None


class MobileLeadUpdate(BaseModel):
    lead_name: Optional[str] = None
    primary_phone: Optional[str] = None
    email: Optional[str] = None
    lead_source_id: Optional[str] = None
    interested_project_id: Optional[int] = None
    property_type: Optional[str] = None
    preferred_location: Optional[str] = None
    required_area_sqft: Optional[Decimal] = None
    bedrooms: Optional[int] = None
    budget_range_min: Optional[Decimal] = None
    budget_range_max: Optional[Decimal] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class MobileLeadStatusUpdate(BaseModel):
    lead_stage: str
    lost_reason: Optional[str] = None
    notes: Optional[str] = None


class MobileLeadAssign(BaseModel):
    sales_rep_id: int
    reason: Optional[str] = None


# ---------------- Customers ----------------
class MobileCustomerCreate(BaseModel):
    full_name_en: str = Field(..., min_length=2, max_length=191)
    full_name_bn: Optional[str] = None
    primary_phone: str = Field(..., min_length=6, max_length=32)
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    customer_type: Optional[str] = "INDIVIDUAL"
    preferred_contact_method: Optional[str] = "PHONE"
    is_nrb: bool = False
    passport_number: Optional[str] = None


class MobileCustomerUpdate(BaseModel):
    full_name_en: Optional[str] = None
    full_name_bn: Optional[str] = None
    primary_phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    customer_type: Optional[str] = None
    preferred_contact_method: Optional[str] = None


class MobileRequirementCreate(BaseModel):
    title: str = "Primary Requirement"
    preferred_project_id: Optional[int] = None
    preferred_location: Optional[str] = None
    property_type: Optional[str] = "APARTMENT"
    budget_min_bdt: Optional[Decimal] = None
    budget_max_bdt: Optional[Decimal] = None
    area_min_sqft: Optional[Decimal] = None
    area_max_sqft: Optional[Decimal] = None
    bedrooms: Optional[int] = 3
    bathrooms: Optional[int] = 3
    preferred_floor: Optional[str] = None
    preferred_facing: Optional[str] = None
    parking_required: bool = True
    purchase_timeline: Optional[str] = None
    payment_preference: Optional[str] = None
    special_notes: Optional[str] = None


class MobileInteractionCreate(BaseModel):
    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    channel: str = "PHONE_CALL"
    direction: str = "OUTBOUND"
    subject: str = Field(..., min_length=2, max_length=191)
    message_body: str = Field(..., min_length=1)
    resulting_action: Optional[str] = None


# ---------------- Quotation ----------------
class MobileQuotationCreate(BaseModel):
    unit_id: int
    customer_name: str = Field(..., min_length=2, max_length=128)
    customer_phone: str = Field(..., min_length=6, max_length=32)
    customer_email: Optional[str] = None
    rate_per_sqft: Optional[Decimal] = None
    parking_charge: Optional[Decimal] = None
    discount_pct: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    valid_days: int = Field(15, ge=1, le=180)
    notes: Optional[str] = None


# ---------------- Site Visit & Follow-up ----------------
class MobileSiteVisitCreate(BaseModel):
    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    project_id: int
    unit_id: Optional[int] = None
    scheduled_start: datetime
    duration_minutes: int = 60
    meeting_location: Optional[str] = None
    agenda: Optional[str] = None
    reminder_minutes_before: int = 60


class MobileSiteVisitUpdate(BaseModel):
    status: str  # PLANNED, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED
    scheduled_start: Optional[datetime] = None
    outcome: Optional[str] = None
    next_action: Optional[str] = None
    next_follow_up_date: Optional[date] = None


class MobileFollowUpCreate(BaseModel):
    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    title: str = Field(..., min_length=2, max_length=191)
    description: Optional[str] = None
    task_category: str = "GENERAL_FOLLOW_UP"
    priority: str = "MEDIUM"
    due_date: datetime
    assigned_to_id: Optional[int] = None


class MobileFollowUpComplete(BaseModel):
    completion_outcome: Optional[str] = "COMPLETED"
    completion_notes: Optional[str] = None


# ---------------- Booking ----------------
class MobileBookingCreate(BaseModel):
    unit_id: int
    customer_id: int
    discount_amount: Decimal = Field(Decimal("0"), ge=0)
    parking_charge: Optional[Decimal] = None
    parking_slot_number: Optional[str] = None
    utility_charge: Optional[Decimal] = None
    documentation_charge: Decimal = Field(Decimal("0"), ge=0)
    earnest_money_received: Decimal = Field(Decimal("0"), ge=0)
    booking_money_pct: Decimal = Field(Decimal("5"), ge=0, le=100)
    down_payment_pct: Decimal = Field(Decimal("15"), ge=0, le=100)
    plan_type: str = "MONTHLY"  # MONTHLY | QUARTERLY
    installment_count: int = Field(24, ge=1, le=120)
    installment_start_date: Optional[date] = None
    discount_justification: Optional[str] = None
    notes: Optional[str] = None


class MobileBookingCancel(BaseModel):
    cancellation_category: str = "BUYER_RELOCATION"
    cancellation_reason: str = Field(..., min_length=3)


# ---------------- Approvals ----------------
class MobileApprovalAction(BaseModel):
    action: str = Field(..., description="APPROVE | REJECT | REQUEST_CORRECTION")
    comments: Optional[str] = None
