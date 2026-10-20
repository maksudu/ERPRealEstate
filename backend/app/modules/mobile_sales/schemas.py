from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, date
from decimal import Decimal


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    limit: int
    offset: int


# Lead Schemas
class LeadCreate(BaseModel):
    lead_name: str
    phone: str
    email: Optional[str] = None
    lead_source: str = "FACEBOOK_ADS"
    status: str = "NEW"
    assigned_sales_rep_name: Optional[str] = "Ashraful Alam"
    interested_project: Optional[str] = "BlueOceans Marina Bay"
    budget_bdt: Optional[Decimal] = Decimal("25000000.00")
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    lead_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    lead_source: Optional[str] = None
    status: Optional[str] = None
    assigned_sales_rep_name: Optional[str] = None
    interested_project: Optional[str] = None
    budget_bdt: Optional[Decimal] = None
    notes: Optional[str] = None


# Customer Schemas
class CustomerCreate(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    nid_number: Optional[str] = None
    present_address: Optional[str] = None
    requirements: Optional[str] = None
    interaction_history: Optional[str] = None
    status: str = "ACTIVE"


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    nid_number: Optional[str] = None
    present_address: Optional[str] = None
    requirements: Optional[str] = None
    interaction_history: Optional[str] = None
    status: Optional[str] = None


# Property Schemas
class PropertyCreate(BaseModel):
    project_name: str
    location: str = "Gulshan-2, Dhaka"
    tower_name: str = "Tower Alpha"
    floor_no: str = "Floor 12"
    unit_number: str
    size_sqft: Decimal = Decimal("2250.00")
    unit_type: str = "4BHK Premium"
    parking_slots: int = 2
    price_per_sqft: Decimal = Decimal("14500.00")
    total_price: Decimal = Decimal("32625000.00")
    availability_status: str = "AVAILABLE"
    apartment_plans_url: Optional[str] = None


class PropertyUpdate(BaseModel):
    project_name: Optional[str] = None
    location: Optional[str] = None
    tower_name: Optional[str] = None
    floor_no: Optional[str] = None
    unit_number: Optional[str] = None
    size_sqft: Optional[Decimal] = None
    unit_type: Optional[str] = None
    parking_slots: Optional[int] = None
    price_per_sqft: Optional[Decimal] = None
    total_price: Optional[Decimal] = None
    availability_status: Optional[str] = None
    apartment_plans_url: Optional[str] = None


# Quotation Schemas
class QuotationCreate(BaseModel):
    customer_name: str
    customer_phone: str
    project_name: str
    unit_number: str
    size_sqft: Decimal = Decimal("2100.00")
    rate_per_sqft: Decimal = Decimal("13500.00")
    base_price: Optional[Decimal] = None
    parking_charge: Decimal = Decimal("1000000.00")
    utility_charge: Decimal = Decimal("500000.00")
    discount_percent: Decimal = Decimal("2.50")
    validity_date: Optional[date] = None
    status: str = "OFFERED"


class QuotationUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    size_sqft: Optional[Decimal] = None
    rate_per_sqft: Optional[Decimal] = None
    parking_charge: Optional[Decimal] = None
    utility_charge: Optional[Decimal] = None
    discount_percent: Optional[Decimal] = None
    status: Optional[str] = None


# Site Visit Schemas
class SiteVisitCreate(BaseModel):
    customer_name: str
    customer_phone: str
    project_name: str
    unit_number: Optional[str] = None
    sales_executive: str = "Ashraful Alam"
    scheduled_at: datetime
    status: str = "SCHEDULED"
    feedback: Optional[str] = None
    follow_up_date: Optional[date] = None


class SiteVisitUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    sales_executive: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None
    feedback: Optional[str] = None
    follow_up_date: Optional[date] = None


# Booking Schemas
class BookingCreate(BaseModel):
    customer_name: str
    customer_phone: str
    project_name: str
    unit_number: str
    booking_date: date
    reservation_status: str = "REQUESTED"
    booking_amount: Decimal = Decimal("1000000.00")
    installment_plan_months: int = 36
    documents_count: int = 3
    notes: Optional[str] = None


class BookingUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    reservation_status: Optional[str] = None
    booking_amount: Optional[Decimal] = None
    installment_plan_months: Optional[int] = None
    notes: Optional[str] = None


# Approval Schemas
class ApprovalCreate(BaseModel):
    request_type: str
    reference_code: str
    requested_by: str
    amount_involved: Decimal = Decimal("0.00")
    status: str = "PENDING"
    remarks: Optional[str] = None


class ApprovalUpdate(BaseModel):
    status: str
    remarks: Optional[str] = None
    approved_by: Optional[str] = "Sales Director"


# Notification Schemas
class NotificationCreate(BaseModel):
    title: str
    notification_type: str
    message: str
    recipient_name: str = "Sales Executive"
    is_read: bool = False
