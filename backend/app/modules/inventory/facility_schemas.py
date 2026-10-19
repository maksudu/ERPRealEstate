from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# -------------------------------------------------------------
# Parking & Additional Facility Schemas (Spec 3.7)
# -------------------------------------------------------------
class FacilityCreateRequest(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    facility_category: str = "SEPARATELY_SALEABLE" # SEPARATELY_SALEABLE, COMMON_FACILITY
    facility_type: str = "STANDARD_CAR" # STANDARD_CAR, VIP_COVERED, MOTORCYCLE, STORAGE_ROOM, ROOFTOP_FACILITY, COMMERCIAL_SIGNAGE, ANCILLARY_SPACE
    basement_level: str = "BASEMENT_1" # BASEMENT_1, BASEMENT_2, BASEMENT_3, GROUND_FLOOR, PODIUM, ROOFTOP
    slot_number: str
    size_sqft: float = 135.00
    price: float = 800000.00
    status: str = "AVAILABLE" # AVAILABLE, RESERVED, ALLOCATED, BLOCKED
    assigned_unit_id: Optional[int] = None
    allocation_type: str = "DEVELOPER_SALE" # DEVELOPER_SALE, LANDOWNER_ENTITLEMENT, TENANT_ALLOCATION
    contract_reference: Optional[str] = None
    allocated_customer_name: Optional[str] = None
    allows_shared_entitlement: bool = False

class FacilityUpdateRequest(BaseModel):
    facility_category: Optional[str] = None
    facility_type: Optional[str] = None
    basement_level: Optional[str] = None
    slot_number: Optional[str] = None
    size_sqft: Optional[float] = None
    price: Optional[float] = None
    status: Optional[str] = None
    allocation_type: Optional[str] = None
    contract_reference: Optional[str] = None
    allocated_customer_name: Optional[str] = None
    allows_shared_entitlement: Optional[bool] = None

class FacilityAssignRequest(BaseModel):
    unit_id: int
    customer_name: str
    contract_reference: Optional[str] = None
    allocation_type: str = "DEVELOPER_SALE"

class FacilityTransferRequest(BaseModel):
    facility_id: int
    to_unit_id: int
    to_unit_number: str
    to_customer: str
    transfer_reason: str
    approved_by: str = "Head of Sales & Legal"

class FacilityResponse(BaseModel):
    id: int
    project_id: int
    tower_id: Optional[int] = None
    facility_category: str
    facility_type: str
    basement_level: str
    slot_number: str
    size_sqft: float
    price: float
    status: str
    assigned_unit_id: Optional[int] = None
    assigned_unit_number: Optional[str] = None
    allocation_type: str
    contract_reference: Optional[str] = None
    allocated_customer_name: Optional[str] = None
    allows_shared_entitlement: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FacilityPagedResponse(BaseModel):
    items: List[FacilityResponse]
    total: int
    limit: int
    offset: int

class FacilityTransferResponse(BaseModel):
    id: int
    facility_id: int
    slot_number: str
    from_unit_id: Optional[int] = None
    from_unit_number: Optional[str] = None
    to_unit_id: int
    to_unit_number: str
    from_customer: Optional[str] = None
    to_customer: str
    transfer_reason: str
    approved_by: str
    transferred_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FacilitySummaryResponse(BaseModel):
    total_facilities: int
    available_count: int
    allocated_count: int
    reserved_count: int
    blocked_count: int
    total_car_parking: int
    total_motorcycle: int
    total_storage_rooms: int
    total_rooftop_facilities: int
    landowner_quota: int
    developer_quota: int


# -------------------------------------------------------------
# Unit Combination & Subdivision Schemas (Spec 3.8)
# -------------------------------------------------------------
class ProposedUnitMergeRequest(BaseModel):
    project_id: int
    tower_id: int
    floor_number: int
    source_unit_ids: List[int]
    new_unit_number: str
    unit_type: str = "DUPLEX"
    facing: str = "SOUTH_FACING"
    bed_count: int = 5
    bath_count: int = 5
    balcony_count: int = 4
    technical_approval_by: str = "Chief Structural Engineer"
    commercial_approval_by: str = "Director Sales"
    legal_approval_by: str = "Head of Legal"
    regulatory_approval_ref: Optional[str] = "RAJUK/DEV/2026/892"
    remarks: Optional[str] = None

class SubdividedUnitItem(BaseModel):
    unit_number: str
    unit_type: str = "COMMERCIAL_SHOP"
    facing: str = "ROAD_FACING"
    gross_sft: float
    net_carpet_sft: float
    bed_count: int = 0
    bath_count: int = 1
    balcony_count: int = 0

class ProposedUnitSplitRequest(BaseModel):
    parent_unit_id: int
    subdivisions: List[SubdividedUnitItem]
    technical_approval_by: str = "Chief Structural Engineer"
    commercial_approval_by: str = "Director Sales"
    legal_approval_by: str = "Head of Legal"
    regulatory_approval_ref: Optional[str] = "RAJUK/SPLIT/2026/104"
    measurement_reconciliation_notes: Optional[str] = "Reconciled with 0.5% standard corridor partition variance"
    remarks: Optional[str] = None

class CombinationLogResponse(BaseModel):
    id: int
    project_id: int
    tower_id: int
    operation_type: str
    source_unit_ids: str
    source_unit_numbers: str
    target_unit_ids: str
    target_unit_numbers: str
    combined_gross_sft: float
    combined_price: float
    technical_approval_by: Optional[str] = None
    commercial_approval_by: Optional[str] = None
    legal_approval_by: Optional[str] = None
    regulatory_approval_ref: Optional[str] = None
    drawing_attachment_url: Optional[str] = None
    measurement_reconciliation_notes: Optional[str] = None
    status: str
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CombinationLogPagedResponse(BaseModel):
    items: List[CombinationLogResponse]
    total: int
    limit: int
    offset: int
