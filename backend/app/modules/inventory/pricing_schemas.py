from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# -------------------------------------------------------------
# Price List Schemas
# -------------------------------------------------------------
class PriceListCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    version_code: str
    title: str
    base_rate_per_sqft: float = 12500.00
    floor_escalation_rate: float = 100.00
    facing_premium_lake: float = 500.00
    facing_premium_south: float = 300.00
    facing_premium_corner: float = 250.00
    facing_premium_road: float = 150.00
    parking_standard_rate: float = 800000.00
    parking_vip_rate: float = 1200000.00
    utility_connection_rate: float = 250000.00
    min_selling_rate_per_sqft: float = 11000.00
    max_discount_pct_exec: float = 3.00
    max_discount_pct_mgr: float = 7.00
    max_discount_pct_dir: float = 15.00
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    status: str = "ACTIVE"
    notes: Optional[str] = None

class PriceListUpdate(BaseModel):
    title: Optional[str] = None
    base_rate_per_sqft: Optional[float] = None
    floor_escalation_rate: Optional[float] = None
    facing_premium_lake: Optional[float] = None
    facing_premium_south: Optional[float] = None
    facing_premium_corner: Optional[float] = None
    facing_premium_road: Optional[float] = None
    parking_standard_rate: Optional[float] = None
    parking_vip_rate: Optional[float] = None
    utility_connection_rate: Optional[float] = None
    min_selling_rate_per_sqft: Optional[float] = None
    max_discount_pct_exec: Optional[float] = None
    max_discount_pct_mgr: Optional[float] = None
    max_discount_pct_dir: Optional[float] = None
    effective_to: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class PriceListResponse(BaseModel):
    id: int
    project_id: int
    tower_id: Optional[int] = None
    project_name: Optional[str] = None
    version_code: str
    title: str
    base_rate_per_sqft: float
    floor_escalation_rate: float
    facing_premium_lake: float
    facing_premium_south: float
    facing_premium_corner: float
    facing_premium_road: float
    parking_standard_rate: float
    parking_vip_rate: float
    utility_connection_rate: float
    min_selling_rate_per_sqft: float
    max_discount_pct_exec: float
    max_discount_pct_mgr: float
    max_discount_pct_dir: float
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    status: str
    approved_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PriceListPagedResponse(BaseModel):
    items: List[PriceListResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Unit Price Override Schemas
# -------------------------------------------------------------
class PriceOverrideCreate(BaseModel):
    price_list_id: Optional[int] = None
    project_id: int
    unit_id: int
    unit_number: str
    customer_name: str
    standard_price: float
    negotiated_price: float
    discount_amount: float
    discount_pct: float
    discount_authority_level: str = "SALES_MANAGER"
    requested_by: str = "Senior Sales Executive"
    justification: str

class PriceOverrideApproval(BaseModel):
    status: str # APPROVED, REJECTED
    approved_by: str
    remarks: Optional[str] = None

class PriceOverrideResponse(BaseModel):
    id: int
    price_list_id: Optional[int] = None
    project_id: int
    unit_id: int
    unit_number: str
    customer_name: str
    standard_price: float
    negotiated_price: float
    discount_amount: float
    discount_pct: float
    discount_authority_level: str
    status: str
    requested_by: str
    approved_by: Optional[str] = None
    justification: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PriceOverridePagedResponse(BaseModel):
    items: List[PriceOverrideResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Price Change Audit Schemas
# -------------------------------------------------------------
class PriceChangeAuditResponse(BaseModel):
    id: int
    price_list_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None
    unit_number: Optional[str] = None
    field_changed: str
    old_value: str
    new_value: str
    changed_by: str
    reason: Optional[str] = None
    effective_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PriceAuditPagedResponse(BaseModel):
    items: List[PriceChangeAuditResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Quotation Schemas
# -------------------------------------------------------------
class QuotationCreate(BaseModel):
    project_id: int
    price_list_id: Optional[int] = None
    unit_id: Optional[int] = None
    unit_code: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    chargeable_area_sqft: float
    rate_per_sqft: float
    base_apartment_price: float
    parking_charge: float = 0.00
    discount_pct: float = 0.00
    discount_amount: float = 0.00
    net_total_price: float
    validity_days: int = 15
    notes: Optional[str] = None
    prepared_by: str = "Sales Officer"

class QuotationResponse(BaseModel):
    id: int
    quotation_number: str
    project_id: int
    price_list_id: Optional[int] = None
    unit_id: Optional[int] = None
    unit_code: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    chargeable_area_sqft: float
    rate_per_sqft: float
    base_apartment_price: float
    parking_charge: float
    discount_pct: float
    discount_amount: float
    net_total_price: float
    valid_until: Optional[datetime] = None
    status: str
    prepared_by: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class QuotationPagedResponse(BaseModel):
    items: List[QuotationResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Calculator Request & Response
# -------------------------------------------------------------
class PricingCalculationRequest(BaseModel):
    chargeable_area_sqft: float = 1500.00
    price_per_sqft: float = 8500.00
    parking_price: float = 800000.00
    discount_pct: float = 0.00
    utility_fee: float = 250000.00

class PricingCalculationResponse(BaseModel):
    chargeable_area_sqft: float
    price_per_sqft: float
    base_apartment_price: float
    parking_price: float
    discount_pct: float
    discount_amount: float
    net_apartment_price: float
    utility_fee: float
    illustrative_total_price: float
