from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal

# -------------------------------------------------------------
# Dhaka Building Construction Rules 2008 - FAR Calculation Engine
# -------------------------------------------------------------
def calculate_dhaka_far_2008(
    plot_area_sqft: float,
    road_width_feet: float,
    occupancy_type: str = "RESIDENTIAL"
) -> Dict[str, Any]:
    """
    Implements Bangladesh Dhaka Mohanogor Imarat Nirman Bidhimala 2008 (Dhaka Building Construction Rules 2008)
    Table 3 - Permissible FAR & Maximum Ground Coverage (MGC):
    - Plot Size & Connecting Road Width thresholds dictate allowable FAR and MGC %.
    """
    plot_katha = plot_area_sqft / 720.0

    # Dhaka 2008 Rule Matrix for Residential:
    # Road Widths: < 20 ft, 20-30 ft, 30-40 ft, 40-60 ft, > 60 ft
    if road_width_feet < 20:
        base_far = 2.50
        mgc_percent = 60.0
    elif 20 <= road_width_feet < 30:
        if plot_katha <= 5:
            base_far = 3.15
            mgc_percent = 62.5
        elif 5 < plot_katha <= 10:
            base_far = 3.35
            mgc_percent = 60.0
        else:
            base_far = 3.50
            mgc_percent = 57.5
    elif 30 <= road_width_feet < 40:
        if plot_katha <= 5:
            base_far = 3.35
            mgc_percent = 62.5
        elif 5 < plot_katha <= 10:
            base_far = 3.75
            mgc_percent = 57.5
        elif 10 < plot_katha <= 20:
            base_far = 4.00
            mgc_percent = 55.0
        else:
            base_far = 4.25
            mgc_percent = 52.5
    else: # Road width >= 40 ft
        if plot_katha <= 5:
            base_far = 3.50
            mgc_percent = 60.0
        elif 5 < plot_katha <= 10:
            base_far = 4.00
            mgc_percent = 55.0
        elif 10 < plot_katha <= 20:
            base_far = 4.50
            mgc_percent = 52.5
        else:
            base_far = 5.00
            mgc_percent = 50.0

    max_builtup_area = round(plot_area_sqft * base_far, 2)
    max_ground_coverage_sqft = round(plot_area_sqft * (mgc_percent / 100.0), 2)
    # Typical standard saleable efficiency ratio in Dhaka luxury construction is 76% - 82%
    estimated_saleable_area = round(max_builtup_area * 0.78, 2)

    return {
        "plot_area_sqft": plot_area_sqft,
        "plot_katha": round(plot_katha, 3),
        "road_width_feet": road_width_feet,
        "occupancy_type": occupancy_type,
        "permissible_far": base_far,
        "mgc_percent": mgc_percent,
        "max_ground_coverage_sqft": max_ground_coverage_sqft,
        "max_permissible_builtup_sqft": max_builtup_area,
        "estimated_saleable_sqft": estimated_saleable_area,
        "regulatory_code": "Dhaka Mohanogor Imarat Nirman Bidhimala 2008 (RAJUK)"
    }


# -------------------------------------------------------------
# Tower Schemas
# -------------------------------------------------------------
class TowerBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tower_code: str
    tower_name: str
    basement_floors: int = 1
    residential_floors: int = 14
    commercial_floors: int = 0
    total_lifts: int = 2

class TowerCreate(TowerBase):
    pass

class TowerResponse(TowerBase):
    id: int
    project_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Authority Clearance Schemas
# -------------------------------------------------------------
class AuthorityClearanceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    clearance_type_id: str
    application_memo_no: Optional[str] = None
    approved_memo_no: Optional[str] = None
    approval_date: Optional[date] = None
    expiry_date: Optional[date] = None
    status: str = "NOT_APPLIED"
    document_url: Optional[str] = None
    remarks: Optional[str] = None

class AuthorityClearanceCreate(AuthorityClearanceBase):
    project_id: int

class AuthorityClearanceUpdate(BaseModel):
    application_memo_no: Optional[str] = None
    approved_memo_no: Optional[str] = None
    approval_date: Optional[date] = None
    expiry_date: Optional[date] = None
    status: Optional[str] = None
    document_url: Optional[str] = None
    remarks: Optional[str] = None

class AuthorityClearanceResponse(AuthorityClearanceBase):
    id: int
    project_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# BOQ Item Schemas
# -------------------------------------------------------------
class BOQItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item_code: Optional[str] = None
    wbs_node_id: Optional[int] = None
    wbs_phase_id: str
    material_category_id: str
    item_description: str
    unit_of_measure_id: str = "CFT"
    estimated_quantity: float
    estimated_unit_rate: float
    total_estimated_cost: float
    actual_consumed_quantity: float = 0.0
    requisitioned_quantity: float = 0.0
    variation_order_quantity: float = 0.0
    hard_lock_percentage: float = 105.00
    is_locked: bool = False

class BOQItemCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    item_code: Optional[str] = None
    wbs_phase_id: str
    material_category_id: str
    item_description: str
    unit_of_measure_id: str = "CFT"
    estimated_quantity: float
    estimated_unit_rate: float
    actual_consumed_quantity: Optional[float] = 0.0
    requisitioned_quantity: Optional[float] = 0.0
    variation_order_quantity: Optional[float] = 0.0
    hard_lock_percentage: Optional[float] = 105.00

class BOQItemResponse(BOQItemBase):
    id: int
    project_id: int
    tower_id: Optional[int] = None
    allowable_quantity: Optional[float] = None
    variance_percentage: Optional[float] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Drawing Schemas
# -------------------------------------------------------------
class DrawingBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    drawing_category_id: str
    drawing_number: str
    drawing_title: str
    revision_number: str = "R0"
    is_approved_for_construction: bool = False
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    file_url: Optional[str] = None
    revision_notes: Optional[str] = None

class DrawingCreate(BaseModel):
    project_id: int
    drawing_category_id: str
    drawing_number: str
    drawing_title: str
    revision_number: str = "R0"
    is_approved_for_construction: bool = False
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    file_url: Optional[str] = None
    revision_notes: Optional[str] = None

class DrawingResponse(DrawingBase):
    id: int
    project_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Project Master Schemas
# -------------------------------------------------------------
class ProjectBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_code: str
    project_name: str
    development_authority_id: str = "RAJUK"
    far_allocated: float = 3.50
    mgc_percent: float = 50.00
    road_width_feet: float = 40.00
    plot_area_sqft: float = 0.00
    total_builtup_area_sqft: float = 0.00
    total_saleable_area_sqft: float = 0.00
    planned_handover_date: Optional[date] = None
    status: str = "PLANNING"
    description: Optional[str] = None

class ProjectCreate(BaseModel):
    land_bank_id: Optional[int] = None
    project_code: str
    project_name: str
    development_authority_id: str = "RAJUK"
    road_width_feet: float = 40.00
    plot_area_sqft: Optional[float] = None
    planned_handover_date: Optional[date] = None
    status: Optional[str] = "PLANNING"
    description: Optional[str] = None
    towers: Optional[List[TowerCreate]] = []

class ProjectResponse(ProjectBase):
    id: int
    land_bank_id: Optional[int] = None
    towers: List[TowerResponse] = []
    clearances: List[AuthorityClearanceResponse] = []
    boq_items: List[BOQItemResponse] = []
    drawings: List[DrawingResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
