from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, Time, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project
from app.modules.procurement.models import Vendor
from app.modules.construction.models import Subcontractor
from app.modules.accounts.models import Voucher, MushakTaxInvoice, TDSDeduction


class TaxWithholdingRule(Base):
    """
    Configurable Statutory Withholding Rules under Income Tax Act 2023 & VAT Act 2012.
    Ensures ZERO hardcoded rates.
    """
    __tablename__ = "tax_withholding_rules"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    rule_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. "SEC_89_CONTRACTOR_TIER_1", "VDS_SAND_STONE"
    rule_type = Column(String(32), nullable=False, index=True) # "TDS", "VDS"
    tax_section = Column(String(64), nullable=False, index=True) # "Section 89 (Old 52)", "Section 86 (Old 52AA)", "VAT Act 2012 SRO"
    category_name = Column(String(128), nullable=False) # e.g. "Civil Works Contractor", "Consultancy & Architecture", "Sand & Aggregates"
    
    min_bill_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    max_bill_amount = Column(Numeric(14, 2), nullable=True) # NULL means no upper limit
    
    rate_with_tin = Column(Numeric(5, 2), nullable=False) # e.g. 5.00%
    rate_without_tin = Column(Numeric(5, 2), nullable=False) # e.g. 7.50% (50% penalty or statutory higher rate)
    
    is_active = Column(Boolean, nullable=False, default=True)
    description = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class TaxZoneRate(Base):
    """
    Section 53FF Advance Income Tax (AIT) Zone Matrix & Sub-Registry Valuation Rates.
    """
    __tablename__ = "tax_zone_rates"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    zone_code = Column(String(64), unique=True, nullable=False, index=True) # "GULSHAN_BANANI", "DHANMONDI_UTTARA", "PURBACHAL_OTHER"
    zone_name = Column(String(128), nullable=False)
    city_authority = Column(String(64), nullable=False) # RAJUK, CDA, KDA, RDA, POURASHAVA, CANTONMENT
    
    # Rate per Square Metre
    rate_per_sqm_residential = Column(Numeric(10, 2), nullable=False) # e.g. 4000.00
    rate_per_sqm_commercial = Column(Numeric(10, 2), nullable=False) # e.g. 8000.00
    
    # Equivalent approx Rate per Sqft (for user display)
    rate_per_sft_residential = Column(Numeric(10, 2), nullable=False) # ~ 371.60
    rate_per_sft_commercial = Column(Numeric(10, 2), nullable=False)
    
    is_active = Column(Boolean, nullable=False, default=True)
    description = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class Mushak65Challan(Base):
    """
    Statutory Form Mushak 6.5 (পণ্য স্থানান্তর চালানপত্র - মূসক-৬.৫).
    Used for transferring construction goods/materials between sites, central warehouse, or to/from subcontractors.
    """
    __tablename__ = "tax_mushak_65_challans"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    challan_number = Column(String(64), unique=True, nullable=False, index=True) # "MUSHAK-6.5-2026-0001"
    issue_date = Column(Date, nullable=False, default=func.current_date())
    issue_time = Column(String(16), nullable=False, default="10:00 AM")
    
    origin_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    destination_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=True, index=True)
    subcontractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Transport details
    transport_vehicle_type = Column(String(64), nullable=False, default="TRUCK") # TRUCK, PICKUP, COVERED_VAN, TRAILER
    vehicle_number = Column(String(64), nullable=False) # e.g. "DHAKA METRO-TA-11-8921"
    driver_name = Column(String(128), nullable=False)
    driver_phone = Column(String(32), nullable=False)
    
    # Items payload: list of {item_name, specification, quantity, unit, unit_value, total_value}
    items_json = Column(Text, nullable=False)
    total_declared_value = Column(Numeric(14, 2), nullable=False)
    
    # Purpose: INTERNAL_TRANSFER, SUBCONTRACTOR_FABRICATION, RETURN_EXCESS
    purpose = Column(String(64), nullable=False, default="INTERNAL_TRANSFER")
    status = Column(String(32), nullable=False, default="ISSUED") # ISSUED, IN_TRANSIT, RECEIVED
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    origin_project = relationship("Project", foreign_keys=[origin_project_id])
    destination_project = relationship("Project", foreign_keys=[destination_project_id])
    subcontractor = relationship("Subcontractor")


class TaxTreasuryChallan(Base):
    """
    Statutory Treasury Deposit Challan (TR-6 / A-Challan) for NBR.
    Code: 1-1141-XXXX-XXXX
    """
    __tablename__ = "tax_treasury_challans"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    challan_no = Column(String(64), unique=True, nullable=False, index=True)
    deposit_date = Column(Date, nullable=False, default=func.current_date())
    bank_name = Column(String(128), nullable=False, default="Sonali Bank PLC")
    branch_name = Column(String(128), nullable=False, default="Local Office Branch, Dhaka")
    
    economic_code = Column(String(64), nullable=False) # "1-1141-0010-0111" (VAT) or "1-1141-0020-0101" (TDS)
    tax_type = Column(String(32), nullable=False) # "VAT", "TDS", "AIT_53FF"
    total_deposit_amount = Column(Numeric(14, 2), nullable=False)
    
    status = Column(String(32), nullable=False, default="DEPOSITED")
    challan_slip_url = Column(String(255), nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
