from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import date, datetime
from decimal import Decimal

class FixedAssetBase(BaseModel):
    asset_tag: Optional[str] = None
    asset_name: str
    category: str
    subcategory: Optional[str] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    location: str = "Central Yard / Site"
    custodian_name: Optional[str] = "Site In-charge"
    acquisition_date: date
    acquisition_cost_bdt: Decimal
    salvage_value_bdt: Decimal = Decimal("0.00")
    useful_life_years: Decimal = Decimal("5.00")
    depreciation_method: str = "STRAIGHT_LINE"
    depreciation_rate_percent: Decimal = Decimal("10.00")
    accumulated_depreciation_bdt: Decimal = Decimal("0.00")
    net_book_value_bdt: Optional[Decimal] = None
    status: str = "ACTIVE"
    serial_number: Optional[str] = None
    po_reference: Optional[str] = None
    vendor_name: Optional[str] = None
    gl_account_code: Optional[str] = "1200-FIXED-ASSETS"
    warranty_expiry_date: Optional[date] = None
    insurance_policy_no: Optional[str] = None
    insurance_expiry_date: Optional[date] = None
    notes: Optional[str] = None

class FixedAssetCreate(FixedAssetBase):
    pass

class FixedAssetUpdate(BaseModel):
    asset_name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    location: Optional[str] = None
    custodian_name: Optional[str] = None
    useful_life_years: Optional[Decimal] = None
    depreciation_rate_percent: Optional[Decimal] = None
    status: Optional[str] = None
    warranty_expiry_date: Optional[date] = None
    insurance_expiry_date: Optional[date] = None
    notes: Optional[str] = None

class FixedAssetResponse(FixedAssetBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssetDepreciationResponse(BaseModel):
    id: int
    asset_id: int
    period_month: int
    period_year: int
    fiscal_year: str
    opening_nbv_bdt: Decimal
    depreciation_amount_bdt: Decimal
    accumulated_depreciation_bdt: Decimal
    ending_nbv_bdt: Decimal
    is_posted_gl: bool
    journal_voucher_ref: Optional[str] = None

    class Config:
        from_attributes = True


class AssetTransferCreate(BaseModel):
    asset_id: int
    to_project_id: Optional[int] = None
    to_project_name: Optional[str] = None
    to_location: str
    transfer_date: date
    reason: Optional[str] = None
    transferred_by: Optional[str] = "Site Logistics Officer"
    received_by: Optional[str] = None

class AssetTransferResponse(BaseModel):
    id: int
    transfer_ref: str
    asset_id: int
    asset_name: Optional[str] = None
    from_project_name: Optional[str] = None
    from_location: str
    to_project_name: Optional[str] = None
    to_location: str
    transfer_date: date
    reason: Optional[str] = None
    status: str
    transferred_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssetMaintenanceCreate(BaseModel):
    asset_id: int
    service_date: date
    service_type: str = "PREVENTIVE"
    vendor_name: Optional[str] = None
    description: str
    maintenance_cost_bdt: Decimal
    downtime_hours: Decimal = Decimal("0.00")
    meter_reading: Optional[Decimal] = Decimal("0.00")
    is_scheduled: bool = True
    parts_replaced: Optional[str] = None
    technician_name: Optional[str] = None

class AssetMaintenanceResponse(BaseModel):
    id: int
    maintenance_code: str
    asset_id: int
    asset_name: Optional[str] = None
    service_date: date
    service_type: str
    vendor_name: Optional[str] = None
    description: str
    maintenance_cost_bdt: Decimal
    downtime_hours: Decimal
    meter_reading: Optional[Decimal] = None
    is_scheduled: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssetDisposalCreate(BaseModel):
    asset_id: int
    disposal_date: date
    disposal_type: str = "SALE"
    sale_proceeds_bdt: Decimal
    buyer_name: Optional[str] = None
    reason: Optional[str] = None
    approved_by: Optional[str] = "Managing Director"

class AssetDisposalResponse(BaseModel):
    id: int
    disposal_ref: str
    asset_id: int
    asset_name: Optional[str] = None
    disposal_date: date
    disposal_type: str
    sale_proceeds_bdt: Decimal
    original_cost_bdt: Decimal
    accumulated_depreciation_bdt: Decimal
    nbv_at_disposal_bdt: Decimal
    gain_loss_amount_bdt: Decimal
    buyer_name: Optional[str] = None
    approved_by: Optional[str] = None
    journal_voucher_ref: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssetPhysicalVerificationCreate(BaseModel):
    verification_date: date
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    location: str
    verified_by: str
    total_assets_registered: int
    total_assets_found: int
    condition_status: str = "SATISFACTORY"
    discrepancy_notes: Optional[str] = None
    action_taken: Optional[str] = None

class AssetPhysicalVerificationResponse(BaseModel):
    id: int
    audit_code: str
    verification_date: date
    project_name: Optional[str] = None
    location: str
    verified_by: str
    total_assets_registered: int
    total_assets_found: int
    discrepancy_qty: int
    condition_status: str
    discrepancy_notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssetDashboardSummary(BaseModel):
    total_asset_acquisition_cost_bdt: Decimal
    accumulated_depreciation_bdt: Decimal
    current_net_book_value_bdt: Decimal
    total_active_assets_count: int
    total_additions_this_year_bdt: Decimal
    total_disposals_this_year_bdt: Decimal
    total_maintenance_expenses_bdt: Decimal
    total_equipment_downtime_hours: Decimal
    expiring_warranties_count: int
    expiring_insurance_count: int
    unreconciled_gl_difference_bdt: Decimal
    category_distribution: List[dict]
    monthly_depreciation_trend: List[dict]
    recent_transfers: List[dict]
