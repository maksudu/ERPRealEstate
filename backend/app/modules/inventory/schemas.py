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
    base_rate_per_sqft: float = 12500.00
    floor_escalation_rate: float = 0.00
    facing_premium_rate: float = 0.00
    effective_rate_per_sqft: float = 12500.00
    total_unit_price: float = 0.00
    status_id: str = "AVAILABLE"
    is_landowner_share: bool = False
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
    base_rate_per_sqft: float = 12500.00
    floor_escalation_rate: float = 0.00
    facing_premium_rate: float = 0.00
    status_id: Optional[str] = "AVAILABLE"
    is_landowner_share: Optional[bool] = False

class UnitResponse(UnitBase):
    id: int
    project_id: int
    tower_id: int
    lock_remaining_seconds: Optional[int] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Parking Bay Schemas
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


# -------------------------------------------------------------
# Real-Time Lock Request & Status Schemas
# -------------------------------------------------------------
class UnitLockRequest(BaseModel):
    user_id: Optional[int] = 1
    user_name: Optional[str] = "Sales Agent"

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
