from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, JSON, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class FixedAsset(Base):
    """
    Fixed Asset Master Record (Integrated with Procurement, Accounting, HR, Inventory and Projects)
    """
    __tablename__ = "ast_fixed_assets"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_tag = Column(String(64), unique=True, nullable=False, index=True)
    asset_name = Column(String(191), nullable=False)
    category = Column(String(128), nullable=False, index=True) # Heavy Machinery, Plant & Equipment, Vehicles, Office Furniture, IT & Computers, Electrical Assets
    subcategory = Column(String(128), nullable=True)
    
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    project_name = Column(String(191), nullable=True)
    location = Column(String(191), nullable=False, default="Central Yard / Site")
    custodian_name = Column(String(128), nullable=True, default="Site In-charge")
    
    acquisition_date = Column(Date, nullable=False)
    acquisition_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    salvage_value_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    useful_life_years = Column(Numeric(5, 2), nullable=False, default=5.00)
    depreciation_method = Column(String(64), nullable=False, default="STRAIGHT_LINE") # STRAIGHT_LINE, WDV_REDUCING_BALANCE
    depreciation_rate_percent = Column(Numeric(5, 2), nullable=False, default=10.00)
    
    accumulated_depreciation_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    net_book_value_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    
    status = Column(String(64), nullable=False, default="ACTIVE", index=True) # ACTIVE, UNDER_MAINTENANCE, TRANSFERRED, DISPOSED, RETIRED
    serial_number = Column(String(128), nullable=True)
    po_reference = Column(String(128), nullable=True)
    vendor_name = Column(String(191), nullable=True)
    gl_account_code = Column(String(64), nullable=True, default="1200-FIXED-ASSETS")
    
    warranty_expiry_date = Column(Date, nullable=True)
    insurance_policy_no = Column(String(128), nullable=True)
    insurance_expiry_date = Column(Date, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    depreciations = relationship("AssetDepreciation", back_populates="asset", cascade="all, delete-orphan")
    transfers = relationship("AssetTransfer", back_populates="asset", cascade="all, delete-orphan")
    maintenances = relationship("AssetMaintenance", back_populates="asset", cascade="all, delete-orphan")


class AssetDepreciation(Base):
    """
    Monthly/Annual Depreciation Schedule and Journal Posting
    """
    __tablename__ = "ast_asset_depreciations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("ast_fixed_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    period_month = Column(Integer, nullable=False) # 1-12
    period_year = Column(Integer, nullable=False) # e.g. 2025, 2026
    fiscal_year = Column(String(32), nullable=False, default="2025-2026")
    
    opening_nbv_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    depreciation_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    accumulated_depreciation_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    ending_nbv_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    
    is_posted_gl = Column(Boolean, default=False)
    journal_voucher_ref = Column(String(128), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    asset = relationship("FixedAsset", back_populates="depreciations")


class AssetTransfer(Base):
    """
    Inter-project, Yard and Site Transfer History
    """
    __tablename__ = "ast_asset_transfers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    transfer_ref = Column(String(64), unique=True, nullable=False, index=True)
    asset_id = Column(BigInteger, ForeignKey("ast_fixed_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    
    from_project_id = Column(BigInteger, nullable=True)
    from_project_name = Column(String(191), nullable=True)
    from_location = Column(String(191), nullable=False)
    
    to_project_id = Column(BigInteger, nullable=True)
    to_project_name = Column(String(191), nullable=True)
    to_location = Column(String(191), nullable=False)
    
    transfer_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    transferred_by = Column(String(128), nullable=True)
    received_by = Column(String(128), nullable=True)
    status = Column(String(64), nullable=False, default="COMPLETED") # PENDING, IN_TRANSIT, COMPLETED
    created_at = Column(TIMESTAMP, server_default=func.now())

    asset = relationship("FixedAsset", back_populates="transfers")


class AssetMaintenance(Base):
    """
    Maintenance Expenses, Breakdown Logging and Equipment Downtime
    """
    __tablename__ = "ast_asset_maintenances"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    maintenance_code = Column(String(64), unique=True, nullable=False, index=True)
    asset_id = Column(BigInteger, ForeignKey("ast_fixed_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    
    service_date = Column(Date, nullable=False)
    service_type = Column(String(64), nullable=False, default="PREVENTIVE") # PREVENTIVE, BREAKDOWN, OVERHAUL, INSPECTION
    vendor_name = Column(String(191), nullable=True)
    description = Column(Text, nullable=False)
    
    maintenance_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    downtime_hours = Column(Numeric(8, 2), nullable=False, default=0.00)
    meter_reading = Column(Numeric(10, 2), nullable=True, default=0.00)
    
    is_scheduled = Column(Boolean, default=True)
    voucher_ref = Column(String(128), nullable=True)
    parts_replaced = Column(Text, nullable=True)
    technician_name = Column(String(128), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    asset = relationship("FixedAsset", back_populates="maintenances")


class AssetDisposal(Base):
    """
    Asset Disposals, Scrap, Write-offs and Gain/Loss calculation
    """
    __tablename__ = "ast_asset_disposals"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    disposal_ref = Column(String(64), unique=True, nullable=False, index=True)
    asset_id = Column(BigInteger, ForeignKey("ast_fixed_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    
    disposal_date = Column(Date, nullable=False)
    disposal_type = Column(String(64), nullable=False, default="SALE") # SALE, SCRAP, DONATION, WRITE_OFF, THEFT
    sale_proceeds_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    original_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    accumulated_depreciation_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    nbv_at_disposal_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    gain_loss_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00) # Proceeds - NBV
    
    buyer_name = Column(String(191), nullable=True)
    reason = Column(Text, nullable=True)
    approved_by = Column(String(128), nullable=True)
    journal_voucher_ref = Column(String(128), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class AssetPhysicalVerification(Base):
    """
    Physical Verification, Site Audits & Discrepancies
    """
    __tablename__ = "ast_physical_verifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    audit_code = Column(String(64), unique=True, nullable=False, index=True)
    verification_date = Column(Date, nullable=False)
    project_id = Column(BigInteger, nullable=True)
    project_name = Column(String(191), nullable=True)
    location = Column(String(191), nullable=False)
    verified_by = Column(String(128), nullable=False)
    
    total_assets_registered = Column(Integer, nullable=False, default=0)
    total_assets_found = Column(Integer, nullable=False, default=0)
    discrepancy_qty = Column(Integer, nullable=False, default=0) # Registered - Found
    condition_status = Column(String(64), nullable=False, default="SATISFACTORY") # SATISFACTORY, REPAIR_NEEDED, CRITICAL_DAMAGE, MISSING
    
    discrepancy_notes = Column(Text, nullable=True)
    action_taken = Column(String(191), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
