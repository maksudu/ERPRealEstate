from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project, Tower

class Unit(Base):
    """
    Real estate unit / flat inventory model with dynamic rate card, orientation premiums,
    and distributed booking lock state.
    """
    __tablename__ = "inv_units"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="CASCADE"), nullable=False, index=True)
    floor_number = Column(Integer, nullable=False, index=True) # e.g. 1, 2, 3...
    unit_number = Column(String(32), nullable=False, index=True) # e.g. '3A', '3B', '12C'
    
    # Types: TYPE_3BHK, TYPE_4BHK, PENTHOUSE, DUPLEX, STUDIO
    unit_type_id = Column(String(32), nullable=False, default="TYPE_3BHK", index=True)
    # Facing / Orientation: SOUTH_FACING, NORTH_FACING, LAKE_VIEW, CORNER_PLOT, ROAD_FACING
    facing_id = Column(String(32), nullable=False, default="SOUTH_FACING", index=True)
    
    # Architectural Specifications
    bed_count = Column(Integer, nullable=False, default=3)
    bath_count = Column(Integer, nullable=False, default=3)
    balcony_count = Column(Integer, nullable=False, default=2)
    floor_plan_image_url = Column(String(512), nullable=True)
    render_images_json = Column(Text, nullable=True) # JSON array of 3D interior render URLs

    # Area Measurements
    net_carpet_area_sqft = Column(Numeric(10, 2), nullable=False, default=0.00)
    gross_saleable_area_sqft = Column(Numeric(10, 2), nullable=False, default=0.00)
    
    # Dynamic Rate Card Pricing Components:
    base_rate_per_sqft = Column(Numeric(12, 2), nullable=False, default=12500.00)
    floor_escalation_rate = Column(Numeric(10, 2), nullable=False, default=0.00) # e.g. 100 Tk per floor
    facing_premium_rate = Column(Numeric(10, 2), nullable=False, default=0.00) # e.g. 500 Tk for Lake View / South
    effective_rate_per_sqft = Column(Numeric(12, 2), nullable=False, default=12500.00)
    total_unit_price = Column(Numeric(16, 2), nullable=False, default=0.00)

    # Additional Pricing Parameters
    utility_connection_fee = Column(Numeric(12, 2), nullable=False, default=250000.00)
    parking_charge = Column(Numeric(12, 2), nullable=False, default=0.00)
    max_discount_amount = Column(Numeric(12, 2), nullable=False, default=150000.00)
    
    # Unit Status: AVAILABLE, RESERVED, ON_HOLD, BOOKED, SOLD, LANDOWNER_SHARE, RETAINED, BLOCKED
    status_id = Column(String(32), nullable=False, default="AVAILABLE", index=True)
    is_landowner_share = Column(Boolean, nullable=False, default=False, index=True)

    # Unit Combination & Subdivision
    is_merged = Column(Boolean, nullable=False, default=False, index=True)
    merged_into_unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True)
    parent_unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True)
    combination_type = Column(String(32), nullable=True) # DUPLEX, COMBINED_APARTMENT, COMMERCIAL_SPLIT
    
    # Real-Time Distributed Locking Tracker (Syncs with 15-Minute Redis Mutex)
    current_locked_by_user_id = Column(BigInteger, nullable=True)
    current_locked_by_user_name = Column(String(128), nullable=True)
    lock_expires_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project")
    tower = relationship("Tower")
    parking_bays = relationship("ParkingBay", back_populates="allocated_unit")
    parking_slots = relationship("ParkingSlot", back_populates="assigned_unit")

    # Property Aliases for PROMPT 03 compatibility
    @property
    def gross_sft(self):
        return self.gross_saleable_area_sqft

    @property
    def net_carpet_sft(self):
        return self.net_carpet_area_sqft

    @property
    def unit_type(self):
        return self.unit_type_id

    @property
    def facing(self):
        return self.facing_id

    @property
    def base_price_per_sft(self):
        return self.base_rate_per_sqft

    @property
    def floor_rise_rate(self):
        return self.floor_escalation_rate

    @property
    def facing_premium(self):
        return self.facing_premium_rate

    @property
    def total_base_price(self):
        return self.total_unit_price

    @property
    def status(self):
        return self.status_id

    @status.setter
    def status(self, value):
        self.status_id = value

    @property
    def locked_by_user_id(self):
        return self.current_locked_by_user_id

    @property
    def locked_until_timestamp(self):
        return self.lock_expires_at


class ParkingBay(Base):
    """
    Dedicated or standalone car parking bays in basement levels.
    """
    __tablename__ = "inv_parking_bays"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    basement_level = Column(String(16), nullable=False, default="B1") # B1, B2, GROUND
    bay_number = Column(String(32), nullable=False, index=True) # e.g. 'P-B1-01', 'P-B2-14'
    # Parking Types: SINGLE_CAR, TANDEM_DOUBLE, VIP_COVERED
    parking_type_id = Column(String(32), nullable=False, default="SINGLE_CAR")
    price = Column(Numeric(14, 2), nullable=False, default=500000.00) # e.g. 5 Lac BDT
    
    is_allocated = Column(Boolean, nullable=False, default=False, index=True)
    allocated_to_unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    allocated_unit = relationship("Unit", back_populates="parking_bays")


class ParkingSlot(Base):
    """
    Parking bays and ancillary facility inventory records under Spec 3.7.
    Tracks cars, motorcycles, storage rooms, rooftop facilities, and signage.
    """
    __tablename__ = "inv_parking_slots"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Facility Classification: SEPARATELY_SALEABLE vs COMMON_FACILITY
    facility_category = Column(String(32), nullable=False, default="SEPARATELY_SALEABLE", index=True)
    # Types: STANDARD_CAR, VIP_COVERED, MOTORCYCLE, STORAGE_ROOM, ROOFTOP_FACILITY, COMMERCIAL_SIGNAGE, ANCILLARY_SPACE
    facility_type = Column(String(32), nullable=False, default="STANDARD_CAR", index=True)
    slot_type = Column(String(32), nullable=False, default="BASEMENT_1") # Backwards compatibility alias
    
    # Physical Location
    basement_level = Column(String(32), nullable=False, default="BASEMENT_1") # BASEMENT_1, BASEMENT_2, BASEMENT_3, GROUND_FLOOR, PODIUM, ROOFTOP
    slot_number = Column(String(32), nullable=False, index=True) # e.g. 'P-B1-01', 'STR-B2-04'
    size_sqft = Column(Numeric(10, 2), nullable=False, default=135.00) # Standard car parking ~135 sqft
    
    # Commercial & Allocation details
    price = Column(Numeric(14, 2), nullable=False, default=800000.00)
    # Status: AVAILABLE, RESERVED, ALLOCATED, BLOCKED
    status = Column(String(32), nullable=False, default="AVAILABLE", index=True)
    assigned_unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Ownership & Allocation Authority: DEVELOPER_SALE, LANDOWNER_ENTITLEMENT, TENANT_ALLOCATION
    allocation_type = Column(String(32), nullable=False, default="DEVELOPER_SALE")
    contract_reference = Column(String(64), nullable=True) # e.g. CNT-2026-0042
    allocated_customer_name = Column(String(128), nullable=True)
    allows_shared_entitlement = Column(Boolean, nullable=False, default=False)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    tower = relationship("Tower")
    assigned_unit = relationship("Unit", back_populates="parking_slots")


class FacilityTransferLog(Base):
    """
    Formal audit trail for reassignments or transfers of parking bays and facilities.
    """
    __tablename__ = "inv_facility_transfers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    facility_id = Column(BigInteger, ForeignKey("inv_parking_slots.id", ondelete="CASCADE"), nullable=False, index=True)
    slot_number = Column(String(32), nullable=False)
    from_unit_id = Column(BigInteger, nullable=True)
    from_unit_number = Column(String(32), nullable=True)
    to_unit_id = Column(BigInteger, nullable=False)
    to_unit_number = Column(String(32), nullable=False)
    from_customer = Column(String(128), nullable=True)
    to_customer = Column(String(128), nullable=False)
    transfer_reason = Column(Text, nullable=False)
    approved_by = Column(String(128), nullable=False, default="Head of Sales & Legal")
    transferred_at = Column(TIMESTAMP, server_default=func.now())


class UnitCombinationLog(Base):
    """
    Audit log for unit subdivision & combination operations with regulatory approvals under Spec 3.8.
    """
    __tablename__ = "inv_unit_combinations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="CASCADE"), nullable=False, index=True)
    operation_type = Column(String(32), nullable=False) # MERGE, SPLIT
    source_unit_ids = Column(String(255), nullable=False) # e.g. "12,13"
    source_unit_numbers = Column(String(255), nullable=False) # e.g. "10A, 10B"
    target_unit_ids = Column(String(255), nullable=False) # e.g. "45"
    target_unit_numbers = Column(String(255), nullable=False) # e.g. "DUPLEX-10AB"
    combined_gross_sft = Column(Numeric(10, 2), nullable=False, default=0.00)
    combined_price = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Statutory & Governance Approvals (Spec 3.8)
    technical_approval_by = Column(String(128), nullable=True, default="Chief Structural Engineer")
    commercial_approval_by = Column(String(128), nullable=True, default="Director Sales")
    legal_approval_by = Column(String(128), nullable=True, default="Legal Counsel")
    regulatory_approval_ref = Column(String(128), nullable=True) # e.g. RAJUK Plan Ref #RAJUK/DEV/2026/892
    drawing_attachment_url = Column(String(512), nullable=True)
    measurement_reconciliation_notes = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="APPROVED") # APPROVED, PENDING_LEGAL, REJECTED
    
    remarks = Column(Text, nullable=True)
    performed_by_id = Column(BigInteger, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class PriceList(Base):
    """
    Centralized project master price lists with versioning, orientation premiums,
    and discount authorization limits under Spec 3.5.
    """
    __tablename__ = "inv_price_lists"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="CASCADE"), nullable=True, index=True)
    version_code = Column(String(32), nullable=False, index=True) # e.g. PL-GL-2026-V1
    title = Column(String(128), nullable=False) # e.g. Gulshan Lakeview Launch Rate Card
    
    # Rate components (BDT)
    base_rate_per_sqft = Column(Numeric(12, 2), nullable=False, default=12500.00)
    floor_escalation_rate = Column(Numeric(10, 2), nullable=False, default=100.00) # per floor escalation
    facing_premium_lake = Column(Numeric(10, 2), nullable=False, default=500.00)
    facing_premium_south = Column(Numeric(10, 2), nullable=False, default=300.00)
    facing_premium_corner = Column(Numeric(10, 2), nullable=False, default=250.00)
    facing_premium_road = Column(Numeric(10, 2), nullable=False, default=150.00)
    
    # Parking & Additional Facility prices
    parking_standard_rate = Column(Numeric(14, 2), nullable=False, default=800000.00)
    parking_vip_rate = Column(Numeric(14, 2), nullable=False, default=1200000.00)
    utility_connection_rate = Column(Numeric(14, 2), nullable=False, default=250000.00)
    
    # Floor limit & Governance
    min_selling_rate_per_sqft = Column(Numeric(12, 2), nullable=False, default=11000.00)
    max_discount_pct_exec = Column(Numeric(5, 2), nullable=False, default=3.00)
    max_discount_pct_mgr = Column(Numeric(5, 2), nullable=False, default=7.00)
    max_discount_pct_dir = Column(Numeric(5, 2), nullable=False, default=15.00)
    
    # Validity & Status
    effective_from = Column(TIMESTAMP, nullable=False, server_default=func.now())
    effective_to = Column(TIMESTAMP, nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE", index=True) # ACTIVE, DRAFT, APPROVED, ARCHIVED
    approved_by = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")


class PriceOverride(Base):
    """
    Unit-specific negotiated price with role-based discount authority and approval workflow.
    """
    __tablename__ = "inv_price_overrides"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    price_list_id = Column(BigInteger, ForeignKey("inv_price_lists.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_number = Column(String(32), nullable=False, index=True)
    customer_name = Column(String(128), nullable=False)
    
    standard_price = Column(Numeric(16, 2), nullable=False, default=0.00)
    negotiated_price = Column(Numeric(16, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    discount_pct = Column(Numeric(5, 2), nullable=False, default=0.00)
    discount_authority_level = Column(String(32), nullable=False, default="SALES_MANAGER") # SALES_EXECUTIVE, SALES_MANAGER, MANAGING_DIRECTOR, BOARD
    
    status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, APPROVED, REJECTED
    requested_by = Column(String(128), nullable=False, default="Sales Executive")
    approved_by = Column(String(128), nullable=True)
    justification = Column(Text, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    unit = relationship("Unit")
    project = relationship("Project")


class PriceChangeAudit(Base):
    """
    Historical price records and price change audit logs.
    """
    __tablename__ = "inv_price_change_audits"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    price_list_id = Column(BigInteger, nullable=True, index=True)
    project_id = Column(BigInteger, nullable=True, index=True)
    unit_id = Column(BigInteger, nullable=True, index=True)
    unit_number = Column(String(32), nullable=True)
    field_changed = Column(String(64), nullable=False) # BASE_RATE, EFFECTIVE_RATE, TOTAL_PRICE, PROMOTIONAL_DISCOUNT
    old_value = Column(String(64), nullable=False)
    new_value = Column(String(64), nullable=False)
    changed_by = Column(String(128), nullable=False, default="System Administrator")
    reason = Column(Text, nullable=True)
    effective_date = Column(TIMESTAMP, server_default=func.now())
    created_at = Column(TIMESTAMP, server_default=func.now())


class Quotation(Base):
    """
    Formal pricing quotation generated from authorized price lists with itemized breakdowns.
    """
    __tablename__ = "inv_quotations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    quotation_number = Column(String(32), nullable=False, unique=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    price_list_id = Column(BigInteger, ForeignKey("inv_price_lists.id", ondelete="SET NULL"), nullable=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True)
    unit_code = Column(String(32), nullable=True)
    
    customer_name = Column(String(128), nullable=False)
    customer_phone = Column(String(32), nullable=False)
    customer_email = Column(String(128), nullable=True)
    
    chargeable_area_sqft = Column(Numeric(10, 2), nullable=False, default=1500.00)
    rate_per_sqft = Column(Numeric(12, 2), nullable=False, default=8500.00)
    base_apartment_price = Column(Numeric(16, 2), nullable=False, default=12750000.00)
    parking_charge = Column(Numeric(14, 2), nullable=False, default=800000.00)
    discount_pct = Column(Numeric(5, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    net_total_price = Column(Numeric(16, 2), nullable=False, default=13550000.00)
    
    valid_until = Column(TIMESTAMP, nullable=False)
    status = Column(String(32), nullable=False, default="ISSUED", index=True) # DRAFT, ISSUED, ACCEPTED, EXPIRED
    prepared_by = Column(String(128), nullable=False, default="Sales Officer")
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class UnitReservation(Base):
    """
    Temporary unit reservations and holds with statutory concurrency controls,
    deposit tracking, expiry timelines, and cancellation authorizations.
    """
    __tablename__ = "inv_unit_reservations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_number = Column(String(32), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    customer_name = Column(String(128), nullable=False)
    customer_phone = Column(String(32), nullable=False)
    customer_nid_passport = Column(String(64), nullable=True)
    sales_agent_id = Column(BigInteger, nullable=True)
    sales_agent_name = Column(String(128), nullable=False, default="Sales Executive")
    
    reservation_token = Column(String(64), nullable=False, unique=True, index=True)
    reserved_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    expires_at = Column(TIMESTAMP, nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False, default=15) # 15 mins for Mutex, or up to 4320 mins (72h) for formal hold
    hold_deposit_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    conditions = Column(Text, nullable=True)
    
    # Status: ACTIVE_HOLD, CONFIRMED_BOOKING, RELEASED, EXPIRED, CANCELLED
    status = Column(String(32), nullable=False, default="ACTIVE_HOLD", index=True)
    approved_by = Column(String(128), nullable=True)
    release_reason = Column(Text, nullable=True)
    released_at = Column(TIMESTAMP, nullable=True)
    released_by = Column(String(128), nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    unit = relationship("Unit")
    project = relationship("Project")


class UnitStatusHistory(Base):
    """
    Immutable state machine transition audit trail recording every availability change.
    """
    __tablename__ = "inv_unit_status_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_number = Column(String(32), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    from_status = Column(String(32), nullable=False)
    to_status = Column(String(32), nullable=False)
    transition_type = Column(String(64), nullable=False) # RESERVATION_HOLD, BOOKING_ACCEPTED, CONTRACT_SIGNED, AUTO_RELEASE_EXPIRED, AUTHORIZED_RELEASE, CANCELLATION, BLOCK_RESTRICTION
    
    initiated_by = Column(String(128), nullable=False, default="System")
    authorized_by = Column(String(128), nullable=True)
    reason = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    
    transitioned_at = Column(TIMESTAMP, nullable=False, server_default=func.now())


class PropertyDocument(Base):
    """
    Spec 3.6: Floor plans, property images, architectural specifications and engineering documents
    with object storage references, versioning, superseded historical tracking and visibility controls.
    """
    __tablename__ = "inv_property_documents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    floor_number = Column(Integer, nullable=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)

    # Document & Media Category
    # PROJECT_BROCHURE, APPROVED_FLOOR_PLAN, TOWER_LAYOUT, FLOOR_LAYOUT, INDIVIDUAL_UNIT_PLAN,
    # UNIT_PHOTOGRAPH, SAMPLE_INTERIOR_IMAGE, ARCHITECTURAL_SPEC, ENGINEERING_SPEC,
    # AREA_MEASUREMENT_SHEET, FINISHING_FIXTURE_SCHEDULE, PARKING_LAYOUT, APPROVAL_CERTIFICATE
    document_type = Column(String(64), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    file_url = Column(String(512), nullable=False)
    thumbnail_url = Column(String(512), nullable=True)
    file_size_kb = Column(Integer, nullable=False, default=0)
    file_extension = Column(String(16), nullable=False, default=".pdf")
    mime_type = Column(String(64), nullable=False, default="application/pdf")

    # Versioning & Revision History (Superseded floor plans kept for historical reference)
    version_tag = Column(String(32), nullable=False, default="v1.0")
    is_superseded = Column(Boolean, nullable=False, default=False, index=True)
    superseded_by_id = Column(BigInteger, nullable=True)
    superseded_at = Column(TIMESTAMP, nullable=True)

    # Access Control: PUBLIC_SALES_PORTAL, INTERNAL_SALES_AGENT, RESTRICTED_CONFIDENTIAL
    visibility = Column(String(32), nullable=False, default="RESTRICTED_CONFIDENTIAL", index=True)

    # Approval Status: PENDING, APPROVED, REJECTED
    approval_status = Column(String(32), nullable=False, default="PENDING", index=True)
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)

    uploader_id = Column(BigInteger, nullable=True)
    uploader_name = Column(String(128), nullable=False, default="System User")
    tags = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())



