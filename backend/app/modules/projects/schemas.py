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
    building_code: Optional[str] = None
    building_type: str = "RESIDENTIAL" # RESIDENTIAL, COMMERCIAL, MIXED_USE, SHOPPING_COMPLEX
    total_floors: int = 14
    basement_floors: int = 1
    podium_floors: int = 0
    residential_floors: int = 13
    commercial_floors: int = 0
    total_lifts: int = 2

    approved_height_m: Optional[float] = 45.00
    approved_floor_area_sqft: float = 0.00
    structural_system: Optional[str] = "RCC_FRAME"
    building_specifications: Optional[str] = None
    architect_name: Optional[str] = None
    consultant_name: Optional[str] = None
    contractor_name: Optional[str] = None
    planned_construction_start: Optional[date] = None
    planned_completion_date: Optional[date] = None
    approval_reference_no: Optional[str] = None
    drawing_references: Optional[str] = None
    construction_status: str = "PLANNING"

class TowerCreate(TowerBase):
    project_id: Optional[int] = None

class TowerUpdate(BaseModel):
    tower_code: Optional[str] = None
    tower_name: Optional[str] = None
    building_code: Optional[str] = None
    building_type: Optional[str] = None
    total_floors: Optional[int] = None
    basement_floors: Optional[int] = None
    podium_floors: Optional[int] = None
    residential_floors: Optional[int] = None
    commercial_floors: Optional[int] = None
    total_lifts: Optional[int] = None
    approved_height_m: Optional[float] = None
    approved_floor_area_sqft: Optional[float] = None
    structural_system: Optional[str] = None
    building_specifications: Optional[str] = None
    architect_name: Optional[str] = None
    consultant_name: Optional[str] = None
    contractor_name: Optional[str] = None
    planned_construction_start: Optional[date] = None
    planned_completion_date: Optional[date] = None
    approval_reference_no: Optional[str] = None
    drawing_references: Optional[str] = None
    construction_status: Optional[str] = None

class TowerResponse(TowerBase):
    id: int
    project_id: int
    floor_count: Optional[int] = 0
    unit_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class TowerPageResponse(BaseModel):
    items: List[TowerResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Floor Schemas (Submodule 2.4)
# -------------------------------------------------------------
class FloorBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    floor_number: int
    display_name: str
    floor_type: str = "RESIDENTIAL"
    floor_area_sqft: float = 0.00
    common_area_sqft: float = 0.00
    planned_units_count: int = 4
    construction_status: str = "NOT_STARTED"
    inspection_status: str = "PENDING"
    inspection_history: Optional[str] = None

class FloorCreate(FloorBase):
    project_id: int
    tower_id: int

class FloorUpdate(BaseModel):
    floor_number: Optional[int] = None
    display_name: Optional[str] = None
    floor_type: Optional[str] = None
    floor_area_sqft: Optional[float] = None
    common_area_sqft: Optional[float] = None
    planned_units_count: Optional[int] = None
    construction_status: Optional[str] = None
    inspection_status: Optional[str] = None
    inspection_history: Optional[str] = None

class FloorResponse(FloorBase):
    id: int
    project_id: int
    tower_id: int
    unit_count: Optional[int] = 0
    tower_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class FloorPageResponse(BaseModel):
    items: List[FloorResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Project Unit Schemas (Submodule 2.4)
# -------------------------------------------------------------
class ProjectUnitBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    unit_code: str
    floor_number: int
    unit_type: str = "APARTMENT_3BHK"
    bedroom_count: int = 3
    bathroom_count: int = 3
    balcony_count: int = 2
    parking_details: Optional[str] = None
    
    saleable_area_sqft: float = 0.00
    usable_carpet_area_sqft: float = 0.00
    common_area_allocated_sqft: float = 0.00
    unit_orientation: str = "SOUTH_FACING"
    specifications: Optional[str] = None
    planned_price_bdt: float = 0.00
    
    ownership_classification: str = "DEVELOPER_INVENTORY"
    unit_status: str = "AVAILABLE"
    configuration_stage: str = "PLANNED"
    approval_schedule_ref: Optional[str] = None
    reassignment_authorized: bool = False
    reassignment_reason: Optional[str] = None

class ProjectUnitCreate(ProjectUnitBase):
    project_id: int
    tower_id: int
    floor_id: Optional[int] = None

class ProjectUnitUpdate(BaseModel):
    unit_code: Optional[str] = None
    floor_number: Optional[int] = None
    unit_type: Optional[str] = None
    bedroom_count: Optional[int] = None
    bathroom_count: Optional[int] = None
    balcony_count: Optional[int] = None
    parking_details: Optional[str] = None
    saleable_area_sqft: Optional[float] = None
    usable_carpet_area_sqft: Optional[float] = None
    common_area_allocated_sqft: Optional[float] = None
    unit_orientation: Optional[str] = None
    specifications: Optional[str] = None
    planned_price_bdt: Optional[float] = None
    ownership_classification: Optional[str] = None
    unit_status: Optional[str] = None
    configuration_stage: Optional[str] = None
    approval_schedule_ref: Optional[str] = None
    reassignment_authorized: Optional[bool] = None
    reassignment_reason: Optional[str] = None

class ProjectUnitResponse(ProjectUnitBase):
    id: int
    project_id: int
    tower_id: int
    floor_id: Optional[int] = None
    tower_name: Optional[str] = None
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProjectUnitPageResponse(BaseModel):
    items: List[ProjectUnitResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Project Hierarchy Tree Schemas (2.4)
# -------------------------------------------------------------
class TreeUnitNode(BaseModel):
    id: int
    unit_code: str
    unit_type: str
    saleable_area_sqft: float
    usable_carpet_area_sqft: float
    planned_price_bdt: float
    ownership_classification: str
    unit_status: str
    configuration_stage: str

class TreeFloorNode(BaseModel):
    id: int
    floor_number: int
    display_name: str
    floor_type: str
    floor_area_sqft: float
    construction_status: str
    units: List[TreeUnitNode] = []

class TreeTowerNode(BaseModel):
    id: int
    tower_code: str
    tower_name: str
    building_type: str
    total_floors: int
    construction_status: str
    floors: List[TreeFloorNode] = []

class ProjectHierarchyTreeResponse(BaseModel):
    project_id: int
    project_name: str
    project_code: str
    total_towers: int
    total_floors: int
    total_units: int
    total_saleable_sqft: float
    total_developer_units: int
    total_landowner_units: int
    towers: List[TreeTowerNode] = []


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
    specification: Optional[str] = None
    wbs_node_id: Optional[int] = None
    wbs_phase_id: str
    material_category_id: str
    item_description: str
    unit_of_measure_id: str = "CFT"
    
    # Cost Breakdown Components
    estimated_quantity: float = 0.0
    estimated_unit_rate: float = 0.0
    total_estimated_cost: float = 0.0
    material_rate: float = 0.0
    labour_rate: float = 0.0
    equipment_rate: float = 0.0
    subcontract_rate: float = 0.0

    # Lifecycle Stage & Baselines
    stage: str = "APPROVED_CONTRACT_BOQ"

    tender_quantity: float = 0.0
    tender_unit_rate: float = 0.0
    tender_total_amount: float = 0.0

    contract_quantity: float = 0.0
    contract_unit_rate: float = 0.0
    contract_total_amount: float = 0.0

    revised_quantity: float = 0.0
    revised_unit_rate: float = 0.0
    revised_total_amount: float = 0.0

    # Actuals & Progress Tracking
    actual_consumed_quantity: float = 0.0
    completed_quantity: float = 0.0
    remaining_quantity: float = 0.0
    requisitioned_quantity: float = 0.0
    variation_order_quantity: float = 0.0
    actual_cost: float = 0.0
    cost_variance: float = 0.0

    # Controls & Approvals
    hard_lock_percentage: float = 105.00
    is_locked: bool = False
    version_no: int = 1
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    rate_analysis_notes: Optional[str] = None
    supporting_document_url: Optional[str] = None

class BOQItemCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    item_code: Optional[str] = None
    specification: Optional[str] = None
    wbs_phase_id: str
    material_category_id: str
    item_description: str
    unit_of_measure_id: str = "CFT"

    estimated_quantity: float
    estimated_unit_rate: float
    
    material_rate: Optional[float] = 0.0
    labour_rate: Optional[float] = 0.0
    equipment_rate: Optional[float] = 0.0
    subcontract_rate: Optional[float] = 0.0

    stage: Optional[str] = "APPROVED_CONTRACT_BOQ"

    tender_quantity: Optional[float] = None
    tender_unit_rate: Optional[float] = None
    contract_quantity: Optional[float] = None
    contract_unit_rate: Optional[float] = None

    actual_consumed_quantity: Optional[float] = 0.0
    completed_quantity: Optional[float] = 0.0
    hard_lock_percentage: Optional[float] = 105.00
    is_locked: Optional[bool] = False
    version_no: Optional[int] = 1
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    rate_analysis_notes: Optional[str] = None
    supporting_document_url: Optional[str] = None

class BOQItemUpdate(BaseModel):
    tower_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    item_code: Optional[str] = None
    specification: Optional[str] = None
    wbs_phase_id: Optional[str] = None
    material_category_id: Optional[str] = None
    item_description: Optional[str] = None
    unit_of_measure_id: Optional[str] = None

    estimated_quantity: Optional[float] = None
    estimated_unit_rate: Optional[float] = None
    
    material_rate: Optional[float] = None
    labour_rate: Optional[float] = None
    equipment_rate: Optional[float] = None
    subcontract_rate: Optional[float] = None

    stage: Optional[str] = None

    tender_quantity: Optional[float] = None
    tender_unit_rate: Optional[float] = None
    contract_quantity: Optional[float] = None
    contract_unit_rate: Optional[float] = None
    revised_quantity: Optional[float] = None
    revised_unit_rate: Optional[float] = None

    actual_consumed_quantity: Optional[float] = None
    completed_quantity: Optional[float] = None
    hard_lock_percentage: Optional[float] = None
    is_locked: Optional[bool] = None
    version_no: Optional[int] = None
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    rate_analysis_notes: Optional[str] = None
    supporting_document_url: Optional[str] = None

class BOQItemResponse(BOQItemBase):
    id: int
    project_id: int
    tower_id: Optional[int] = None
    project_name: Optional[str] = None
    tower_name: Optional[str] = None
    wbs_node_code: Optional[str] = None
    wbs_node_name: Optional[str] = None
    allowable_quantity: Optional[float] = None
    variance_percentage: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class BOQItemListResponse(BaseModel):
    items: List[BOQItemResponse]
    total: int
    limit: int
    offset: int

class BOQMetricsResponse(BaseModel):
    project_id: int
    project_name: str
    total_boq_items: int
    total_estimated_amount: float
    total_contract_amount: float
    total_tender_amount: float
    total_actual_cost: float
    total_requisitioned_amount: float
    total_variation_amount: float
    total_locked_items: int
    total_hard_locked_items: int
    cost_variance_amount: float
    cost_variance_percentage: float
    component_breakdown: Dict[str, float]


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
    project_name_bn: Optional[str] = None
    company_name: Optional[str] = "Apex Properties Ltd."
    project_type: str = "RESIDENTIAL"
    project_category: str = "APARTMENT"
    project_ownership: str = "OWNED"
    
    division: str = "Dhaka"
    district: str = "Dhaka"
    thana_upazila: str = "Gulshan"
    locality: Optional[str] = None
    site_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_url: Optional[str] = None
    
    project_manager: Optional[str] = None
    project_director: Optional[str] = None
    department: Optional[str] = "Engineering & Civil Projects"
    project_team_structure: Optional[Dict[str, Any]] = None
    site_offices: Optional[List[Dict[str, Any]]] = None
    development_authority_id: str = "RAJUK"
    
    total_land_area_katha: float = 0.00
    total_land_area_decimal: float = 0.00
    total_land_area_sqft: float = 0.00
    far_allocated: float = 3.50
    mgc_percent: float = 50.00
    road_width_feet: float = 40.00
    plot_area_sqft: float = 0.00
    total_builtup_area_sqft: float = 0.00
    total_saleable_area_sqft: float = 0.00
    planned_construction_area_sqft: float = 0.00
    
    project_start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    revised_completion_date: Optional[date] = None
    project_duration_months: int = 24
    planned_handover_date: Optional[date] = None
    
    project_funding_source: str = "EQUITY_AND_PRE_SALES"
    cost_center_code: Optional[str] = None
    financial_year: str = "FY 2026-2027"
    estimated_budget_bdt: float = 0.00
    approved_budget_bdt: float = 0.00
    target_customer_segment: Optional[str] = "UPPER_MIDDLE_CLASS"
    project_scope: Optional[str] = None
    
    status: str = "PLANNING"
    approval_status: str = "DRAFT"
    project_phase: str = "PLANNING"
    land_parcel_ids: Optional[List[int]] = None
    landowner_ids: Optional[List[int]] = None
    status_history: Optional[List[Dict[str, Any]]] = None
    project_documents: Optional[List[Dict[str, Any]]] = None
    description: Optional[str] = None

class ProjectCreate(BaseModel):
    land_bank_id: Optional[int] = None
    parcel_id: Optional[int] = None
    project_code: str
    project_name: str
    project_name_bn: Optional[str] = None
    company_name: Optional[str] = "Apex Properties Ltd."
    project_type: Optional[str] = "RESIDENTIAL"
    project_category: Optional[str] = "APARTMENT"
    project_ownership: Optional[str] = "OWNED"
    
    division: Optional[str] = "Dhaka"
    district: Optional[str] = "Dhaka"
    thana_upazila: Optional[str] = "Gulshan"
    locality: Optional[str] = None
    site_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_url: Optional[str] = None
    
    project_manager: Optional[str] = None
    project_director: Optional[str] = None
    department: Optional[str] = "Engineering & Civil Projects"
    project_team_structure: Optional[Dict[str, Any]] = None
    site_offices: Optional[List[Dict[str, Any]]] = None
    development_authority_id: Optional[str] = "RAJUK"
    
    total_land_area_katha: Optional[float] = 0.00
    total_land_area_decimal: Optional[float] = 0.00
    total_land_area_sqft: Optional[float] = 0.00
    far_allocated: Optional[float] = 3.50
    mgc_percent: Optional[float] = 50.00
    road_width_feet: Optional[float] = 40.00
    plot_area_sqft: Optional[float] = None
    total_builtup_area_sqft: Optional[float] = 0.00
    total_saleable_area_sqft: Optional[float] = 0.00
    planned_construction_area_sqft: Optional[float] = 0.00
    
    project_start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    revised_completion_date: Optional[date] = None
    project_duration_months: Optional[int] = 24
    planned_handover_date: Optional[date] = None
    
    project_funding_source: Optional[str] = "EQUITY_AND_PRE_SALES"
    cost_center_code: Optional[str] = None
    financial_year: Optional[str] = "FY 2026-2027"
    estimated_budget_bdt: Optional[float] = 0.00
    approved_budget_bdt: Optional[float] = 0.00
    target_customer_segment: Optional[str] = "UPPER_MIDDLE_CLASS"
    project_scope: Optional[str] = None
    
    status: Optional[str] = "PLANNING"
    approval_status: Optional[str] = "DRAFT"
    project_phase: Optional[str] = "PLANNING"
    land_parcel_ids: Optional[List[int]] = None
    landowner_ids: Optional[List[int]] = None
    status_history: Optional[List[Dict[str, Any]]] = None
    project_documents: Optional[List[Dict[str, Any]]] = None
    description: Optional[str] = None
    towers: Optional[List[TowerCreate]] = []

class ProjectUpdate(BaseModel):
    land_bank_id: Optional[int] = None
    parcel_id: Optional[int] = None
    project_name: Optional[str] = None
    project_name_bn: Optional[str] = None
    company_name: Optional[str] = None
    project_type: Optional[str] = None
    project_category: Optional[str] = None
    project_ownership: Optional[str] = None
    
    division: Optional[str] = None
    district: Optional[str] = None
    thana_upazila: Optional[str] = None
    locality: Optional[str] = None
    site_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_url: Optional[str] = None
    
    project_manager: Optional[str] = None
    project_director: Optional[str] = None
    department: Optional[str] = None
    project_team_structure: Optional[Dict[str, Any]] = None
    site_offices: Optional[List[Dict[str, Any]]] = None
    development_authority_id: Optional[str] = None
    
    total_land_area_katha: Optional[float] = None
    total_land_area_decimal: Optional[float] = None
    total_land_area_sqft: Optional[float] = None
    far_allocated: Optional[float] = None
    mgc_percent: Optional[float] = None
    road_width_feet: Optional[float] = None
    plot_area_sqft: Optional[float] = None
    total_builtup_area_sqft: Optional[float] = None
    total_saleable_area_sqft: Optional[float] = None
    planned_construction_area_sqft: Optional[float] = None
    
    project_start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    revised_completion_date: Optional[date] = None
    project_duration_months: Optional[int] = None
    planned_handover_date: Optional[date] = None
    
    project_funding_source: Optional[str] = None
    cost_center_code: Optional[str] = None
    financial_year: Optional[str] = None
    estimated_budget_bdt: Optional[float] = None
    approved_budget_bdt: Optional[float] = None
    target_customer_segment: Optional[str] = None
    project_scope: Optional[str] = None
    status: Optional[str] = None
    approval_status: Optional[str] = None
    project_phase: Optional[str] = None
    land_parcel_ids: Optional[List[int]] = None
    landowner_ids: Optional[List[int]] = None
    status_history: Optional[List[Dict[str, Any]]] = None
    project_documents: Optional[List[Dict[str, Any]]] = None
    description: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    land_bank_id: Optional[int] = None
    parcel_id: Optional[int] = None
    towers: List[TowerResponse] = []
    clearances: List[AuthorityClearanceResponse] = []
    boq_items: List[BOQItemResponse] = []
    drawings: List[DrawingResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# -------------------------------------------------------------
# Project Feasibility & Investment Analysis Schemas
# -------------------------------------------------------------
class ProjectFeasibilityBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feasibility_code: str
    title: str
    version_label: str = "V1.0"
    
    land_acquisition_cost: float = 0.00
    jv_landowner_cash_consideration: float = 0.00
    legal_and_vetting_expenses: float = 0.00
    preliminary_arch_engineering_cost: float = 0.00
    estimated_construction_cost: float = 0.00
    infrastructure_and_site_dev: float = 0.00
    utility_connection_expenses: float = 0.00
    professional_authority_fees: float = 0.00
    marketing_and_brokerage_cost: float = 0.00
    financing_and_interest_cost: float = 0.00
    contingency_reserve: float = 0.00
    
    proposed_building_height_meters: float = 45.00
    proposed_floor_count: int = 14
    proposed_unit_count: int = 56
    apartment_unit_count: int = 40
    commercial_unit_count: int = 8
    parking_bay_count: int = 50
    total_saleable_area_sqft: float = 0.00
    total_common_area_sqft: float = 0.00
    saleable_efficiency_percent: float = 80.00
    
    landowner_jv_sharing_ratio: str = "50:50"
    developer_share_sqft: float = 0.00
    landowner_share_sqft: float = 0.00
    
    avg_apartment_rate_sqft: float = 10000.00
    avg_commercial_rate_sqft: float = 15000.00
    avg_parking_rate_unit: float = 600000.00
    estimated_apartment_sales_revenue: float = 0.00
    estimated_commercial_sales_revenue: float = 0.00
    estimated_parking_sales_revenue: float = 0.00
    estimated_other_sales_revenue: float = 0.00
    
    estimated_gross_revenue: float = 0.00
    estimated_total_cost: float = 0.00
    gross_project_profit: float = 0.00
    operating_profit: float = 0.00
    net_profit_after_tax: float = 0.00
    profit_margin_percent: float = 0.00
    roi_percent: float = 0.00
    
    break_even_sales_bdt: float = 0.00
    break_even_sqft: float = 0.00
    break_even_percent: float = 0.00
    
    project_duration_months: int = 24
    expected_start_date: Optional[date] = None
    expected_handover_date: Optional[date] = None
    cash_flow_forecast: Optional[List[Dict[str, Any]]] = None
    customer_collection_schedule: Optional[List[Dict[str, Any]]] = None
    scenario_models: Optional[Dict[str, Any]] = None
    sensitivity_analysis: Optional[Dict[str, Any]] = None
    
    status: str = "DRAFT"
    reviewed_by: Optional[str] = None
    review_date: Optional[date] = None
    review_remarks: Optional[str] = None
    investment_committee_notes: Optional[str] = None
    committee_decision: Optional[str] = "RECOMMENDED"

class ProjectFeasibilityCreate(BaseModel):
    project_id: int
    feasibility_code: str
    title: str
    version_label: Optional[str] = "V1.0"
    
    land_acquisition_cost: Optional[float] = 0.00
    jv_landowner_cash_consideration: Optional[float] = 0.00
    legal_and_vetting_expenses: Optional[float] = 0.00
    preliminary_arch_engineering_cost: Optional[float] = 0.00
    estimated_construction_cost: Optional[float] = 0.00
    infrastructure_and_site_dev: Optional[float] = 0.00
    utility_connection_expenses: Optional[float] = 0.00
    professional_authority_fees: Optional[float] = 0.00
    marketing_and_brokerage_cost: Optional[float] = 0.00
    financing_and_interest_cost: Optional[float] = 0.00
    contingency_reserve: Optional[float] = 0.00
    
    proposed_building_height_meters: Optional[float] = 45.00
    proposed_floor_count: Optional[int] = 14
    proposed_unit_count: Optional[int] = 56
    apartment_unit_count: Optional[int] = 40
    commercial_unit_count: Optional[int] = 8
    parking_bay_count: Optional[int] = 50
    total_saleable_area_sqft: Optional[float] = 0.00
    total_common_area_sqft: Optional[float] = 0.00
    saleable_efficiency_percent: Optional[float] = 80.00
    
    landowner_jv_sharing_ratio: Optional[str] = "50:50"
    
    avg_apartment_rate_sqft: Optional[float] = 10000.00
    avg_commercial_rate_sqft: Optional[float] = 15000.00
    avg_parking_rate_unit: Optional[float] = 600000.00
    estimated_apartment_sales_revenue: Optional[float] = 0.00
    estimated_commercial_sales_revenue: Optional[float] = 0.00
    estimated_parking_sales_revenue: Optional[float] = 0.00
    estimated_other_sales_revenue: Optional[float] = 0.00
    
    project_duration_months: Optional[int] = 24
    expected_start_date: Optional[date] = None
    expected_handover_date: Optional[date] = None
    
    status: Optional[str] = "DRAFT"
    review_remarks: Optional[str] = None
    investment_committee_notes: Optional[str] = None
    committee_decision: Optional[str] = "RECOMMENDED"

class ProjectFeasibilityResponse(ProjectFeasibilityBase):
    id: int
    project_id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class FeasibilitySimulationRequest(BaseModel):
    land_acquisition_cost: float = 0.00
    jv_landowner_cash_consideration: float = 0.00
    legal_and_vetting_expenses: float = 0.00
    preliminary_arch_engineering_cost: float = 0.00
    estimated_construction_cost: float = 0.00
    infrastructure_and_site_dev: float = 0.00
    utility_connection_expenses: float = 0.00
    professional_authority_fees: float = 0.00
    marketing_and_brokerage_cost: float = 0.00
    financing_and_interest_cost: float = 0.00
    contingency_reserve: float = 0.00
    
    proposed_unit_count: int = 56
    apartment_unit_count: int = 40
    commercial_unit_count: int = 8
    parking_bay_count: int = 50
    total_saleable_area_sqft: float = 0.00
    total_common_area_sqft: float = 0.00
    
    avg_apartment_rate_sqft: float = 10000.00
    avg_commercial_rate_sqft: float = 15000.00
    avg_parking_rate_unit: float = 600000.00
    estimated_apartment_sales_revenue: float = 0.00
    estimated_commercial_sales_revenue: float = 0.00
    estimated_parking_sales_revenue: float = 0.00
    estimated_other_sales_revenue: float = 0.00
    
    landowner_jv_split_pct: float = 50.00
    tax_rate_percent: float = 15.00


# -------------------------------------------------------------
# 2.3 Project-wise Land and Cost Allocation Schemas
# -------------------------------------------------------------
class ProjectLandAllocationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    parcel_id: Optional[int] = None
    allocation_code: str
    project_name: str
    parcel_identifier: str
    
    allocated_area_decimal: float = 0.00
    allocated_area_katha: float = 0.00
    allocated_area_sqft: float = 0.00
    allocation_percentage: float = 100.00
    effective_date: date

    allocation_method: str = "DIRECT_ASSIGNMENT" # DIRECT_ASSIGNMENT, AREA_PROPORTION, PERCENTAGE, SHARED_INFRASTRUCTURE, CONFIGURED_BASIS
    allocation_basis_notes: Optional[str] = None

    is_shared_parcel: bool = False
    shared_projects_notes: Optional[str] = None
    common_infrastructure_scope: Optional[str] = None

    land_purchase_price: float = 0.00
    legal_fees: float = 0.00
    registration_costs: float = 0.00
    acquisition_related_expenses: float = 0.00
    total_allocated_cost: float = 0.00

    original_allocated_cost: float = 0.00
    revised_allocated_cost: float = 0.00
    unallocated_balance: float = 0.00
    transfer_history_notes: Optional[str] = None

    acquisition_ledger_ref: Optional[str] = None
    reconciliation_status: str = "RECONCILED" # RECONCILED, PENDING, DISCREPANCY
    approval_status: str = "APPROVED" # DRAFT, UNDER_REVIEW, APPROVED
    remarks: Optional[str] = None

class ProjectLandAllocationCreate(ProjectLandAllocationBase):
    pass

class ProjectLandAllocationUpdate(BaseModel):
    project_id: Optional[int] = None
    parcel_id: Optional[int] = None
    project_name: Optional[str] = None
    parcel_identifier: Optional[str] = None
    allocated_area_decimal: Optional[float] = None
    allocated_area_katha: Optional[float] = None
    allocated_area_sqft: Optional[float] = None
    allocation_percentage: Optional[float] = None
    effective_date: Optional[date] = None
    allocation_method: Optional[str] = None
    allocation_basis_notes: Optional[str] = None
    is_shared_parcel: Optional[bool] = None
    shared_projects_notes: Optional[str] = None
    common_infrastructure_scope: Optional[str] = None
    land_purchase_price: Optional[float] = None
    legal_fees: Optional[float] = None
    registration_costs: Optional[float] = None
    acquisition_related_expenses: Optional[float] = None
    total_allocated_cost: Optional[float] = None
    original_allocated_cost: Optional[float] = None
    revised_allocated_cost: Optional[float] = None
    unallocated_balance: Optional[float] = None
    transfer_history_notes: Optional[str] = None
    acquisition_ledger_ref: Optional[str] = None
    reconciliation_status: Optional[str] = None
    approval_status: Optional[str] = None
    remarks: Optional[str] = None

class ProjectLandAllocationResponse(ProjectLandAllocationBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProjectLandAllocationPaginationResponse(BaseModel):
    items: List[ProjectLandAllocationResponse]
    total: int
    skip: int
    limit: int
    offset: int = 0
    total_allocated_cost_bdt: float = 0.00
    total_allocated_katha: float = 0.00
    total_allocated_decimal: float = 0.00
    shared_parcels_count: int = 0

class LandAllocationReconciliationSummary(BaseModel):
    total_land_acquisitions_bdt: float
    total_allocated_to_projects_bdt: float
    unallocated_land_bank_bdt: float
    total_parcels_allocated: int
    reconciled_count: int
    pending_reconciliation_count: int


# -------------------------------------------------------------
# 2.6 Estimated Profitability and ROI Schemas
# -------------------------------------------------------------
class ProjectProfitabilityBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    forecast_code: str
    version_label: str = "Base Case V1.0"
    calculation_date: Optional[date] = None

    # Revenue estimates by saleable inventory
    apartment_revenue_est: float = 0.00
    shop_revenue_est: float = 0.00
    office_revenue_est: float = 0.00
    parking_revenue_est: float = 0.00
    other_revenue_est: float = 0.00
    total_estimated_revenue: float = 0.00

    # Landowner and developer shares for Joint Venture
    jv_sharing_ratio: str = "50:50"
    developer_share_pct: float = 50.00
    landowner_share_pct: float = 50.00
    developer_revenue_share_bdt: float = 0.00
    landowner_revenue_share_bdt: float = 0.00

    # Cost Estimates
    construction_cost_est: float = 0.00
    consultant_fee_est: float = 0.00
    marketing_sales_cost_est: float = 0.00
    admin_overhead_est: float = 0.00
    financing_interest_cost_est: float = 0.00
    contingency_cost_est: float = 0.00
    total_project_cost_est: float = 0.00

    # Defined Investment Base & ROI
    defined_investment_base_type: str = "TOTAL_PROJECT_INVESTMENT" # TOTAL_PROJECT_INVESTMENT, EQUITY_INVESTED
    defined_investment_base_bdt: float = 0.00
    estimated_project_profit: float = 0.00
    gross_profit_margin_pct: float = 0.00
    breakeven_sales_revenue: float = 0.00
    breakeven_units_sqft: float = 0.00
    roi_pct: float = 0.00

    # Actual vs Estimated (Forecast Updates from committed costs, posted expenses)
    recognized_revenue: float = 0.00
    recognized_project_expenses: float = 0.00
    actual_project_profit: float = 0.00
    actual_roi_pct: float = 0.00
    committed_costs: float = 0.00
    posted_expenses: float = 0.00
    cost_to_complete_forecast: float = 0.00
    revised_completion_date: Optional[date] = None

    # Scenario Modeling
    scenario_price_increase_pct: float = 0.00
    scenario_sales_delay_months: int = 0
    scenario_cost_overrun_pct: float = 0.00
    scenario_modeled_profit_bdt: float = 0.00
    scenario_modeled_roi_pct: float = 0.00

    # Expected Collections & Cash Flow Schedule
    collection_schedule_json: Optional[Any] = None

    status: str = "ACTIVE_FORECAST"
    remarks: Optional[str] = None


class ProjectProfitabilityCreate(ProjectProfitabilityBase):
    pass


class ProjectProfitabilityUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    version_label: Optional[str] = None
    calculation_date: Optional[date] = None
    apartment_revenue_est: Optional[float] = None
    shop_revenue_est: Optional[float] = None
    office_revenue_est: Optional[float] = None
    parking_revenue_est: Optional[float] = None
    other_revenue_est: Optional[float] = None
    total_estimated_revenue: Optional[float] = None
    jv_sharing_ratio: Optional[str] = None
    developer_share_pct: Optional[float] = None
    landowner_share_pct: Optional[float] = None
    developer_revenue_share_bdt: Optional[float] = None
    landowner_revenue_share_bdt: Optional[float] = None
    construction_cost_est: Optional[float] = None
    consultant_fee_est: Optional[float] = None
    marketing_sales_cost_est: Optional[float] = None
    admin_overhead_est: Optional[float] = None
    financing_interest_cost_est: Optional[float] = None
    contingency_cost_est: Optional[float] = None
    total_project_cost_est: Optional[float] = None
    defined_investment_base_type: Optional[str] = None
    defined_investment_base_bdt: Optional[float] = None
    estimated_project_profit: Optional[float] = None
    gross_profit_margin_pct: Optional[float] = None
    breakeven_sales_revenue: Optional[float] = None
    breakeven_units_sqft: Optional[float] = None
    roi_pct: Optional[float] = None
    recognized_revenue: Optional[float] = None
    recognized_project_expenses: Optional[float] = None
    actual_project_profit: Optional[float] = None
    actual_roi_pct: Optional[float] = None
    committed_costs: Optional[float] = None
    posted_expenses: Optional[float] = None
    cost_to_complete_forecast: Optional[float] = None
    revised_completion_date: Optional[date] = None
    scenario_price_increase_pct: Optional[float] = None
    scenario_sales_delay_months: Optional[int] = None
    scenario_cost_overrun_pct: Optional[float] = None
    scenario_modeled_profit_bdt: Optional[float] = None
    scenario_modeled_roi_pct: Optional[float] = None
    collection_schedule_json: Optional[Any] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class ProjectProfitabilityResponse(ProjectProfitabilityBase):
    id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProjectProfitabilityPaginationResponse(BaseModel):
    items: List[ProjectProfitabilityResponse]
    total: int
    limit: int
    offset: int
    portfolio_projected_revenue_bdt: float = 0.00
    portfolio_net_profit_bdt: float = 0.00
    average_roi_pct: float = 0.00


class ProfitabilitySimulationRequest(BaseModel):
    total_revenue_bdt: float
    total_cost_bdt: float
    defined_investment_base_bdt: float
    price_increase_pct: float = 0.00
    sales_delay_months: int = 0
    cost_overrun_pct: float = 0.00


class ProfitabilitySimulationResponse(BaseModel):
    base_profit_bdt: float
    base_roi_pct: float
    modeled_revenue_bdt: float
    modeled_cost_bdt: float
    modeled_profit_bdt: float
    modeled_roi_pct: float
    modeled_margin_pct: float
    breakeven_revenue_bdt: float


# -------------------------------------------------------------
# 2.7 Project Timeline and Milestone Tracking Schemas
# -------------------------------------------------------------
class ProjectMilestoneBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    milestone_code: str
    milestone_number: int = 1
    milestone_name: str
    standard_milestone_ref: Optional[str] = None
    category: str = "CIVIL_STRUCTURE"

    planned_start_date: date
    planned_finish_date: date
    baseline_start_date: Optional[date] = None
    baseline_finish_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_finish_date: Optional[date] = None

    assigned_department: Optional[str] = "Engineering & Civil Projects"
    contractor_id: Optional[int] = None
    contractor_name: Optional[str] = None
    responsible_person: Optional[str] = None
    supervisor_name: Optional[str] = None

    predecessor_ids: Optional[List[int]] = None
    is_critical_path: bool = False
    weightage_percent: float = 0.00

    physical_progress_pct: float = 0.00
    financial_progress_pct: float = 0.00

    delay_days: int = 0
    delay_reason: Optional[str] = None
    recovery_plan: Optional[str] = None
    escalation_level: str = "NONE"

    supervisor_verification: str = "PENDING"
    evidence_attachment_url: Optional[str] = None

    status: str = "PENDING"
    remarks: Optional[str] = None


class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass


class ProjectMilestoneUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    milestone_number: Optional[int] = None
    milestone_name: Optional[str] = None
    standard_milestone_ref: Optional[str] = None
    category: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_finish_date: Optional[date] = None
    baseline_start_date: Optional[date] = None
    baseline_finish_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_finish_date: Optional[date] = None
    assigned_department: Optional[str] = None
    contractor_id: Optional[int] = None
    contractor_name: Optional[str] = None
    responsible_person: Optional[str] = None
    supervisor_name: Optional[str] = None
    predecessor_ids: Optional[List[int]] = None
    is_critical_path: Optional[bool] = None
    weightage_percent: Optional[float] = None
    physical_progress_pct: Optional[float] = None
    financial_progress_pct: Optional[float] = None
    delay_days: Optional[int] = None
    delay_reason: Optional[str] = None
    recovery_plan: Optional[str] = None
    escalation_level: Optional[str] = None
    supervisor_verification: Optional[str] = None
    evidence_attachment_url: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class ProjectMilestoneResponse(ProjectMilestoneBase):
    id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProjectMilestonePaginationResponse(BaseModel):
    items: List[ProjectMilestoneResponse]
    total: int
    limit: int
    offset: int
    completed_count: int = 0
    critical_path_count: int = 0
    overall_physical_progress_pct: float = 0.00
    overall_financial_progress_pct: float = 0.00


# -------------------------------------------------------------
# 2.8 Regulatory Approvals & Compliance Schemas
# -------------------------------------------------------------
class AuthorityClearanceConditionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    condition_code: str
    condition_title: str
    condition_category: str = "STATUTORY_MANDATE"
    mandatory_level: str = "CRITICAL"
    compliance_status: str = "PENDING"
    compliance_date: Optional[date] = None
    verified_by_officer: Optional[str] = None
    evidence_doc_url: Optional[str] = None
    remarks: Optional[str] = None


class AuthorityClearanceConditionCreate(AuthorityClearanceConditionBase):
    clearance_id: int


class AuthorityClearanceConditionResponse(AuthorityClearanceConditionBase):
    id: int
    clearance_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AuthorityClearanceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    reference_no: Optional[str] = None
    clearance_type_id: str # LUC, BUILDING_PLAN, FIRE_NOC, AVIATION_HEIGHT, ENVIRONMENTAL, WASA, DESCO_DPDC, OCCUPANCY_CERT
    approval_category: Optional[str] = "BUILDING_PLAN" # LAND_USE_PERMIT, BUILDING_PLAN, DRAWING_APPROVAL, FIRE_SAFETY_CLEARANCE, ENVIRONMENTAL_CLEARANCE, UTILITY_SERVICE, CONSTRUCTION_INSPECTION, OCCUPANCY_CERTIFICATE
    authority_name: str = "RAJUK" # RAJUK, CDA, KDA, RDA, DoE, FSCD, CAAB, WASA, DESCO_DPDC, TITAS_GAS
    application_memo_no: Optional[str] = None
    approved_memo_no: Optional[str] = None
    submission_date: Optional[date] = None
    approval_date: Optional[date] = None
    expiry_date: Optional[date] = None
    validity_months: int = 12
    renewal_reminder_days: int = 30
    renewal_fee_bdt: float = 0.00
    renewal_alert_status: str = "VALID"
    sanctioned_floors: Optional[str] = None
    sanctioned_height_m: Optional[float] = None
    responsible_officer: Optional[str] = None
    contact_officer_name: Optional[str] = None
    contact_officer_phone: Optional[str] = None
    next_action: Optional[str] = None
    status: str = "NOT_APPLIED" # DRAFT, NOT_APPLIED, SUBMITTED, QUERY_RAISED, IN_REVIEW, APPROVED, REJECTED, EXPIRED, RENEWAL_PENDING
    document_url: Optional[str] = None
    remarks: Optional[str] = None


class AuthorityClearanceCreate(AuthorityClearanceBase):
    pass


class AuthorityClearanceUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reference_no: Optional[str] = None
    clearance_type_id: Optional[str] = None
    approval_category: Optional[str] = None
    authority_name: Optional[str] = None
    application_memo_no: Optional[str] = None
    approved_memo_no: Optional[str] = None
    submission_date: Optional[date] = None
    approval_date: Optional[date] = None
    expiry_date: Optional[date] = None
    validity_months: Optional[int] = None
    renewal_reminder_days: Optional[int] = None
    renewal_fee_bdt: Optional[float] = None
    renewal_alert_status: Optional[str] = None
    sanctioned_floors: Optional[str] = None
    sanctioned_height_m: Optional[float] = None
    responsible_officer: Optional[str] = None
    contact_officer_name: Optional[str] = None
    contact_officer_phone: Optional[str] = None
    next_action: Optional[str] = None
    status: Optional[str] = None
    document_url: Optional[str] = None
    remarks: Optional[str] = None


class AuthorityClearanceResponse(AuthorityClearanceBase):
    id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    conditions: Optional[List[AuthorityClearanceConditionResponse]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AuthorityClearancePaginationResponse(BaseModel):
    items: List[AuthorityClearanceResponse]
    total: int
    limit: int
    offset: int
    approved_count: int = 0
    submitted_count: int = 0
    expired_count: int = 0
    compliance_adherence_pct: float = 100.0

# =============================================================================
# Submodule 2.9: Architectural Drawings & Document Management Schemas
# =============================================================================
class DrawingRevisionBase(BaseModel):
    revision_number: str
    revision_date: Optional[date] = None
    author: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_mb: Optional[float] = 0.0
    action_type: str = "REVISION_UPLOAD"
    change_summary: Optional[str] = None
    approved_by: Optional[str] = None


class DrawingRevisionCreate(DrawingRevisionBase):
    pass


class DrawingRevisionResponse(DrawingRevisionBase):
    id: int
    drawing_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DrawingBase(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    approval_clearance_id: Optional[int] = None
    drawing_category_id: str = "CONSTRUCTION_SHOP"
    drawing_number: str
    drawing_title: str
    discipline: str = "ARCHITECTURAL"
    revision_number: str = "R0"
    floor_level: Optional[str] = None
    construction_package: Optional[str] = None
    author: Optional[str] = None
    issue_date: Optional[date] = None
    status: str = "DRAFT"
    is_approved_for_construction: bool = False
    is_superseded: bool = False
    superseded_by_id: Optional[int] = None
    superseded_date: Optional[date] = None
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_mb: Optional[float] = 0.0
    file_type: Optional[str] = "PDF"
    is_confidential: bool = False
    access_role: str = "PROJECT_TEAM"
    download_count: int = 0
    revision_notes: Optional[str] = None


class DrawingCreate(DrawingBase):
    pass


class DrawingUpdate(BaseModel):
    tower_id: Optional[int] = None
    approval_clearance_id: Optional[int] = None
    drawing_category_id: Optional[str] = None
    drawing_number: Optional[str] = None
    drawing_title: Optional[str] = None
    discipline: Optional[str] = None
    revision_number: Optional[str] = None
    floor_level: Optional[str] = None
    construction_package: Optional[str] = None
    author: Optional[str] = None
    issue_date: Optional[date] = None
    status: Optional[str] = None
    is_approved_for_construction: Optional[bool] = None
    is_superseded: Optional[bool] = None
    superseded_by_id: Optional[int] = None
    superseded_date: Optional[date] = None
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_mb: Optional[float] = None
    file_type: Optional[str] = None
    is_confidential: Optional[bool] = None
    access_role: Optional[str] = None
    download_count: Optional[int] = None
    revision_notes: Optional[str] = None


class DrawingResponse(DrawingBase):
    id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    tower_name: Optional[str] = None
    clearance_memo: Optional[str] = None
    revisions: Optional[List[DrawingRevisionResponse]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DrawingPaginationResponse(BaseModel):
    items: List[DrawingResponse]
    total: int
    limit: int
    offset: int
    ifc_count: int = 0
    under_review_count: int = 0
    superseded_count: int = 0
    confidential_count: int = 0


# =============================================================================
# Submodule 2.13: Project-wise Profit & Loss (Financial Performance) Schemas
# =============================================================================
class ProjectFinancialPerformanceBase(BaseModel):
    project_id: int
    cost_center_code: str
    fiscal_year: str = "2025-26"
    period_type: str = "CUMULATIVE_TO_DATE" # MONTHLY, QUARTERLY, ANNUAL, CUMULATIVE_TO_DATE
    period_name: str = "Lifecycle to Date"

    # Revenue
    recognized_revenue: float = 0.0 # POC recognized revenue
    customer_advances_collected: float = 0.0
    unearned_revenue: float = 0.0
    receivables_due: float = 0.0

    # Direct Costs
    land_cost_allocated: float = 0.0
    construction_materials_cost: float = 0.0
    consultants_direct_cost: float = 0.0
    total_cost_of_sales: float = 0.0

    # Gross Profit
    gross_project_profit: float = 0.0
    gross_profit_margin_pct: float = 0.0

    # Operating & Overheads
    allocated_operating_expenses: float = 0.0
    operating_profit_ebit: float = 0.0

    # Financing
    financing_expenses: float = 0.0
    bank_loan_drawn: float = 0.0
    bank_loan_outstanding: float = 0.0

    # Bottom-Line
    profit_before_tax_pbt: float = 0.0
    estimated_income_tax: float = 0.0
    net_profit_after_tax: float = 0.0
    net_profit_margin_pct: float = 0.0
    roi_percent: float = 0.0

    # Cash vs Accruals
    contractor_payments_made: float = 0.0
    contractor_work_certified: float = 0.0
    outstanding_contractor_payable: float = 0.0

    # Committed & Forecast
    committed_cost: float = 0.0
    forecast_cost_to_complete_etc: float = 0.0
    estimate_at_completion_eac: float = 0.0
    original_feasibility_profit: float = 0.0
    variance_from_feasibility: float = 0.0

    # JV Sharing
    landowner_share_pct: float = 50.00
    developer_share_pct: float = 50.00
    landowner_revenue_share: float = 0.0
    developer_revenue_share: float = 0.0
    developer_net_pbt: float = 0.0

    status: str = "PROVISIONAL"
    prepared_by: Optional[str] = None
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    notes: Optional[str] = None


class ProjectFinancialPerformanceCreate(ProjectFinancialPerformanceBase):
    pass


class ProjectFinancialPerformanceUpdate(BaseModel):
    cost_center_code: Optional[str] = None
    fiscal_year: Optional[str] = None
    period_type: Optional[str] = None
    period_name: Optional[str] = None
    recognized_revenue: Optional[float] = None
    customer_advances_collected: Optional[float] = None
    unearned_revenue: Optional[float] = None
    receivables_due: Optional[float] = None
    land_cost_allocated: Optional[float] = None
    construction_materials_cost: Optional[float] = None
    consultants_direct_cost: Optional[float] = None
    total_cost_of_sales: Optional[float] = None
    gross_project_profit: Optional[float] = None
    gross_profit_margin_pct: Optional[float] = None
    allocated_operating_expenses: Optional[float] = None
    operating_profit_ebit: Optional[float] = None
    financing_expenses: Optional[float] = None
    bank_loan_drawn: Optional[float] = None
    bank_loan_outstanding: Optional[float] = None
    profit_before_tax_pbt: Optional[float] = None
    estimated_income_tax: Optional[float] = None
    net_profit_after_tax: Optional[float] = None
    net_profit_margin_pct: Optional[float] = None
    roi_percent: Optional[float] = None
    contractor_payments_made: Optional[float] = None
    contractor_work_certified: Optional[float] = None
    outstanding_contractor_payable: Optional[float] = None
    committed_cost: Optional[float] = None
    forecast_cost_to_complete_etc: Optional[float] = None
    estimate_at_completion_eac: Optional[float] = None
    original_feasibility_profit: Optional[float] = None
    variance_from_feasibility: Optional[float] = None
    landowner_share_pct: Optional[float] = None
    developer_share_pct: Optional[float] = None
    landowner_revenue_share: Optional[float] = None
    developer_revenue_share: Optional[float] = None
    developer_net_pbt: Optional[float] = None
    status: Optional[str] = None
    prepared_by: Optional[str] = None
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    notes: Optional[str] = None


class ProjectFinancialPerformanceResponse(ProjectFinancialPerformanceBase):
    id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectFinancialPerformancePaginationResponse(BaseModel):
    items: List[ProjectFinancialPerformanceResponse]
    total: int
    limit: int
    offset: int
    total_recognized_revenue: float = 0.0
    total_customer_collections: float = 0.0
    total_gross_profit: float = 0.0
    total_pbt: float = 0.0
    avg_gross_margin_pct: float = 0.0
    avg_pbt_margin_pct: float = 0.0


class ProjectRiskIssueBase(BaseModel):
    project_id: int
    risk_category: str = "GENERAL"
    risk_title: str
    probability: str = "MEDIUM"
    impact: str = "MODERATE"
    mitigation_strategy: Optional[str] = None
    assigned_owner: Optional[str] = None
    status: str = "OPEN"


class ProjectRiskIssueCreate(ProjectRiskIssueBase):
    pass


class ProjectRiskIssueUpdate(BaseModel):
    project_id: Optional[int] = None
    risk_category: Optional[str] = None
    risk_title: Optional[str] = None
    probability: Optional[str] = None
    impact: Optional[str] = None
    mitigation_strategy: Optional[str] = None
    assigned_owner: Optional[str] = None
    status: Optional[str] = None


class ProjectRiskIssueResponse(ProjectRiskIssueBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProjectRiskIssuePage(BaseModel):
    items: List[ProjectRiskIssueResponse]
    total: int
    limit: int
    offset: int
