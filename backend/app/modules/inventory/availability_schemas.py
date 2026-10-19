from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# -------------------------------------------------------------
# Unit Availability & Controlled State Machine Schemas
# -------------------------------------------------------------
VALID_UNIT_STATUSES = [
    "AVAILABLE",
    "RESERVED",
    "BOOKED",
    "SOLD",
    "BLOCKED",
    "LANDOWNER_ALLOCATED",
    "UNDER_CONSTRUCTION",
    "HANDED_OVER",
    "CANCELLED"
]

# State Machine Transition Rules Map
ALLOWED_TRANSITIONS = {
    "AVAILABLE": ["RESERVED", "BOOKED", "BLOCKED", "LANDOWNER_ALLOCATED", "UNDER_CONSTRUCTION"],
    "RESERVED": ["BOOKED", "AVAILABLE", "BLOCKED", "CANCELLED"],
    "BOOKED": ["SOLD", "CANCELLED", "RESERVED", "AVAILABLE"],
    "SOLD": ["HANDED_OVER", "CANCELLED"],
    "CANCELLED": ["AVAILABLE", "BLOCKED"],
    "BLOCKED": ["AVAILABLE"],
    "LANDOWNER_ALLOCATED": ["HANDED_OVER"],
    "UNDER_CONSTRUCTION": ["AVAILABLE", "HANDED_OVER", "BLOCKED"],
    "HANDED_OVER": []
}

class ReservationCreateRequest(BaseModel):
    unit_id: int
    customer_name: str
    customer_phone: str
    customer_nid_passport: Optional[str] = None
    sales_agent_name: str = "Senior Sales Executive"
    duration_minutes: int = Field(15, ge=1, le=4320) # 15 mins to 72 hours
    hold_deposit_amount: float = 0.00
    conditions: Optional[str] = None

class ReservationReleaseRequest(BaseModel):
    reason: str = "Customer did not complete payment within expiry timeline"
    released_by: str = "Sales Operations Manager"

class StatusTransitionRequest(BaseModel):
    unit_id: int
    to_status: str
    transition_type: str = "MANUAL_TRANSITION"
    initiated_by: str = "Sales Officer"
    authorized_by: Optional[str] = None
    reason: Optional[str] = None

class ReservationResponse(BaseModel):
    id: int
    unit_id: int
    unit_number: str
    project_id: int
    customer_name: str
    customer_phone: str
    customer_nid_passport: Optional[str] = None
    sales_agent_name: str
    reservation_token: str
    reserved_at: datetime
    expires_at: datetime
    duration_minutes: int
    remaining_seconds: int = 0
    hold_deposit_amount: float
    conditions: Optional[str] = None
    status: str
    approved_by: Optional[str] = None
    release_reason: Optional[str] = None
    released_at: Optional[datetime] = None
    released_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ReservationPagedResponse(BaseModel):
    items: List[ReservationResponse]
    total: int
    limit: int
    offset: int

class StatusHistoryResponse(BaseModel):
    id: int
    unit_id: int
    unit_number: str
    project_id: int
    from_status: str
    to_status: str
    transition_type: str
    initiated_by: str
    authorized_by: Optional[str] = None
    reason: Optional[str] = None
    transitioned_at: datetime

    class Config:
        from_attributes = True

class StatusHistoryPagedResponse(BaseModel):
    items: List[StatusHistoryResponse]
    total: int
    limit: int
    offset: int

class AvailabilitySummaryResponse(BaseModel):
    total_units: int
    available: int
    reserved: int
    booked: int
    sold: int
    blocked: int
    landowner_allocated: int
    under_construction: int
    handed_over: int
    cancelled: int
