from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# -------------------------------------------------------------
# Pricing Formula Engine
# Total Price = Gross Sqft * (Base Rate + Floor Escalation + Facing Premium)
# -------------------------------------------------------------
def calculate_unit_pricing(
    gross_sqft: float,
    base_rate: float,
    floor_escalation: float = 0.0,
    facing_premium: float = 0.0
) -> Dict[str, float]:
    effective_rate = round(base_rate + floor_escalation + facing_premium, 2)
    total_price = round(gross_sqft * effective_rate, 2)
    return {
        "effective_rate_per_sqft": effective_rate,
        "total_unit_price": total_price
    }


# -------------------------------------------------------------
# Unit Schemas
# -------------------------------------------------------------
class UnitBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    floor_number: int
    unit_number: str
    unit_type_id: str = "TYPE_3BHK"
    facing_id: str = "SOUTH_FACING"
    net_carpet_area_sqft: float
    gross_saleable_area_sqft: float
    bed_count: int = 3
    bath_count: int = 3
    balcony_count: int = 2
    floor_plan_image_url: Optional[str] = None
    render_images_json: Optional[str] = None
    base_rate_per_sqft: float = 12500.00
    floor_escalation_rate: float = 0.00
    facing_premium_rate: float = 0.00
    effective_rate_per_sqft: float = 12500.00
    total_unit_price: float = 0.00
    utility_connection_fee: float = 250000.00
    parking_charge: float = 0.00
    max_discount_amount: float = 150000.00
    status_id: str = "AVAILABLE"
    is_landowner_share: bool = False
    is_merged: bool = False
    merged_into_unit_id: Optional[int] = None
    parent_unit_id: Optional[int] = None
    combination_type: Optional[str] = None
    current_locked_by_user_id: Optional[int] = None
    current_locked_by_user_name: Optional[str] = None
    lock_expires_at: Optional[datetime] = None

class UnitCreate(BaseModel):
    project_id: int
    tower_id: int
    floor_number: int
    unit_number: str
    unit_type_id: str = "TYPE_3BHK"
    facing_id: str = "SOUTH_FACING"
    net_carpet_area_sqft: float
    gross_saleable_area_sqft: float
    bed_count: int = 3
    bath_count: int = 3
    balcony_count: int = 2
    floor_plan_image_url: Optional[str] = None
    base_rate_per_sqft: float = 12500.00
    floor_escalation_rate: float = 0.00
    facing_premium_rate: float = 0.00
    utility_connection_fee: float = 250000.00
    parking_charge: float = 0.00
    max_discount_amount: float = 150000.00
    status_id: Optional[str] = "AVAILABLE"
    is_landowner_share: Optional[bool] = False

class UnitResponse(UnitBase):
    id: int
    project_id: int
    tower_id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    tower_name: Optional[str] = None
    lock_remaining_seconds: Optional[int] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 2D Tower Stacking Architectural Elevation Schemas
# -------------------------------------------------------------
class UnitTileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    tower_id: int
    floor_number: int
    unit_number: str
    unit_type: str
    facing: str
    gross_sft: float
    net_carpet_sft: float
    bed_count: int
    bath_count: int
    balcony_count: int
    base_price_per_sft: float
    floor_rise_rate: float
    facing_premium: float
    total_base_price: float
    utility_connection_fee: float
    parking_charge: float
    max_discount_amount: float
    status: str
    color_code: str
    status_label: str
    lock_remaining_seconds: int = 0
    locked_by_user_name: Optional[str] = None
    floor_plan_image_url: Optional[str] = None
    is_merged: bool = False
    combination_type: Optional[str] = None


class StackingFloorNode(BaseModel):
    floor_number: int
    floor_name: str
    floor_type: str # PENTHOUSE, TYPICAL, PODIUM, GROUND, BASEMENT
    total_units: int
    available_count: int
    reserved_count: int
    sold_count: int
    landowner_count: int
    retained_count: int
    blocked_count: int
    units: List[UnitTileResponse]


class StackingSummary(BaseModel):
    total_units: int
    available: int
    reserved: int
    sold: int
    landowner: int
    retained: int
    blocked: int
    total_saleable_sqft: float
    total_inventory_value: float


class TowerStackingResponse(BaseModel):
    project_id: int
    project_name: str
    tower_id: int
    tower_name: str
    total_floors: int
    residential_floors: int
    basement_floors: int
    floors: List[StackingFloorNode]
    summary: StackingSummary


# -------------------------------------------------------------
# Dynamic Price Calculator Sheet Schema
# -------------------------------------------------------------
class PriceBreakdownResponse(BaseModel):
    unit_id: int
    unit_number: str
    unit_type: str
    facing: str
    gross_sft: float
    net_carpet_sft: float
    base_rate_per_sft: float
    base_cost: float
    floor_number: int
    floor_rise_rate: float
    floor_rise_cost: float
    facing_premium_rate: float
    facing_premium_cost: float
    parking_charge: float
    utility_connection_fee: float
    subtotal: float
    max_discount_amount: float
    min_allowed_price: float
    net_effective_price: float
    is_landowner_share: bool
    status: str


# -------------------------------------------------------------
# Unit Combination & Subdivision Schemas
# -------------------------------------------------------------
class UnitMergeRequest(BaseModel):
    project_id: int
    tower_id: int
    floor_number: int
    source_unit_ids: List[int]
    new_unit_number: str
    unit_type: str = "DUPLEX"
    facing: str = "SOUTH"
    bed_count: int = 5
    bath_count: int = 5
    balcony_count: int = 4
    remarks: Optional[str] = None

class SubdivisionItem(BaseModel):
    unit_number: str
    gross_sft: float
    net_carpet_sft: float
    unit_type: str = "COMMERCIAL"
    facing: str = "ROAD_FACING"
    bed_count: int = 0
    bath_count: int = 1
    balcony_count: int = 0

class UnitSplitRequest(BaseModel):
    unit_id: int
    subdivisions: List[SubdivisionItem]
    remarks: Optional[str] = None


# -------------------------------------------------------------
# Parking Slot & Bay Schemas
# -------------------------------------------------------------
class ParkingBayBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    basement_level: str = "B1"
    bay_number: str
    parking_type_id: str = "SINGLE_CAR"
    price: float = 500000.00
    is_allocated: bool = False
    allocated_to_unit_id: Optional[int] = None

class ParkingBayCreate(BaseModel):
    project_id: int
    basement_level: str = "B1"
    bay_number: str
    parking_type_id: str = "SINGLE_CAR"
    price: float = 500000.00

class ParkingBayResponse(ParkingBayBase):
    id: int
    project_id: int
    created_at: Optional[datetime] = None


class ParkingSlotBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    tower_id: Optional[int] = None
    basement_level: str = "BASEMENT_1"
    slot_number: str
    slot_type: str = "BASEMENT_1"
    price: float = 500000.00
    status: str = "AVAILABLE"
    assigned_unit_id: Optional[int] = None

class ParkingSlotCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    basement_level: str = "BASEMENT_1"
    slot_number: str
    slot_type: str = "BASEMENT_1"
    price: float = 500000.00

class ParkingSlotResponse(ParkingSlotBase):
    id: int
    assigned_unit_number: Optional[str] = None
    created_at: Optional[datetime] = None

class ParkingSlotAssignRequest(BaseModel):
    slot_id: int
    unit_id: int


# -------------------------------------------------------------
# Real-Time Lock Request & Status Schemas
# -------------------------------------------------------------
class UnitLockRequest(BaseModel):
    user_id: Optional[int] = 1
    user_name: Optional[str] = "Sales Agent"
    duration_minutes: Optional[int] = 15

class UnitLockResponse(BaseModel):
    success: bool
    unit_id: int
    unit_number: str
    status: str
    locked_by_user_id: int
    locked_by_user_name: str
    lock_duration_seconds: int = 900 # 15 Minutes
    expires_at: datetime
    message: str

class UnitConflictResponse(BaseModel):
    detail: str
    unit_id: int
    currently_locked_by: Optional[str] = None
    remaining_seconds: int


class UnitUpdate(BaseModel):
    floor_number: Optional[int] = None
    unit_number: Optional[str] = None
    unit_type_id: Optional[str] = None
    facing_id: Optional[str] = None
    net_carpet_area_sqft: Optional[float] = None
    gross_saleable_area_sqft: Optional[float] = None
    bed_count: Optional[int] = None
    bath_count: Optional[int] = None
    balcony_count: Optional[int] = None
    floor_plan_image_url: Optional[str] = None
    base_rate_per_sqft: Optional[float] = None
    floor_escalation_rate: Optional[float] = None
    facing_premium_rate: Optional[float] = None
    utility_connection_fee: Optional[float] = None
    parking_charge: Optional[float] = None
    max_discount_amount: Optional[float] = None
    status_id: Optional[str] = None
    is_landowner_share: Optional[bool] = None


class UnitPagedResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[UnitResponse]


class InventoryDashboardResponse(BaseModel):
    total_units: int
    available_units: int
    reserved_units: int
    booked_sold_units: int
    blocked_units: int
    landowner_units: int
    developer_units: int
    
    total_saleable_area_sqft: float
    remaining_saleable_area_sqft: float
    booked_sold_area_sqft: float
    
    estimated_total_value: float
    remaining_inventory_value: float
    booked_sold_value: float
    average_rate_per_sqft: float
    
    total_parking_slots: int
    available_parking_slots: int
    allocated_parking_slots: int
    
    property_type_breakdown: List[Dict[str, Any]]
    project_breakdown: List[Dict[str, Any]]
    floor_breakdown: List[Dict[str, Any]]
    reservation_alerts: List[Dict[str, Any]]


class BulkUnitCreateRequest(BaseModel):
    project_id: int
    tower_id: int
    start_floor: int
    end_floor: int
    units_per_floor: int
    unit_prefix: str = "FLAT" # e.g. 'A', 'B' -> 1A, 1B
    unit_type_id: str = "TYPE_3BHK"
    facing_id: str = "SOUTH_FACING"
    net_carpet_area_sqft: float = 1450.00
    gross_saleable_area_sqft: float = 1850.00
    base_rate_per_sqft: float = 12500.00
    floor_escalation_rate: float = 100.00
    facing_premium_rate: float = 0.00
    is_landowner_share_pattern: Optional[str] = None # e.g. "EVEN_FLOORS"
