from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class Project(Base):
    """
    Project Master table modeling real estate development projects mapped from acquired land parcels.
    """
    __tablename__ = "prj_projects"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="SET NULL"), nullable=True, index=True)
    project_code = Column(String(64), unique=True, nullable=False, index=True)
    project_name = Column(String(191), nullable=False)
    development_authority_id = Column(String(32), nullable=False, default="RAJUK", index=True) # RAJUK, CDA, KDA, RDA
    
    # FAR (Floor Area Ratio) & Built-up / Saleable Space
    far_allocated = Column(Numeric(6, 2), nullable=False, default=3.50) # e.g. 4.25 FAR
    mgc_percent = Column(Numeric(5, 2), nullable=False, default=50.00) # Maximum Ground Coverage %
    road_width_feet = Column(Numeric(6, 2), nullable=False, default=40.00)
    plot_area_sqft = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_builtup_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_saleable_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    planned_handover_date = Column(Date, nullable=True)
    # Status: PLANNING, PERMIT_PENDING, UNDER_CONSTRUCTION, HANDOVER_PHASE, COMPLETED
    status = Column(String(32), nullable=False, default="PLANNING", index=True)
    
    description = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    towers = relationship("Tower", back_populates="project", cascade="all, delete-orphan")
    clearances = relationship("AuthorityClearance", back_populates="project", cascade="all, delete-orphan")
    boq_items = relationship("BOQItem", back_populates="project", cascade="all, delete-orphan")
    drawings = relationship("Drawing", back_populates="project", cascade="all, delete-orphan")


class Tower(Base):
    """
    Spatial building tower block / structure within a project.
    """
    __tablename__ = "prj_towers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_code = Column(String(64), nullable=False) # e.g. 'TOWER-A', 'BLOCK-NORTH'
    tower_name = Column(String(128), nullable=False)
    basement_floors = Column(Integer, nullable=False, default=1)
    residential_floors = Column(Integer, nullable=False, default=14) # G + 13
    commercial_floors = Column(Integer, nullable=False, default=0)
    total_lifts = Column(Integer, nullable=False, default=2)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="towers")
    boq_items = relationship("BOQItem", back_populates="tower", cascade="all, delete-orphan")


class AuthorityClearance(Base):
    """
    Statutory government permissions & NOC clearances (RAJUK, CDA, Fire Service, Civil Aviation, etc.)
    """
    __tablename__ = "prj_authority_clearances"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    # Clearance types: LUC (Land Use Clearance), BUILDING_PLAN, FIRE_NOC, AVIATION_HEIGHT, ENVIRONMENTAL, WASA, DESCO_DPDC, OCCUPANCY_CERT
    clearance_type_id = Column(String(64), nullable=False, index=True)
    authority_name = Column(String(64), nullable=False, default="RAJUK", index=True) # RAJUK, CDA, KDA, RDA, DoE, FSCD, CAAB, WASA, DESCO_DPDC, TITAS_GAS
    reference_no = Column(String(64), nullable=True, index=True) # e.g. CLR-2026-RAJUK-01
    application_memo_no = Column(String(128), nullable=True)
    approved_memo_no = Column(String(128), nullable=True)
    approval_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    validity_months = Column(Integer, default=12)
    renewal_reminder_days = Column(Integer, default=30)
    renewal_fee_bdt = Column(Numeric(14, 2), default=0.00)
    renewal_alert_status = Column(String(32), default="VALID", index=True) # VALID, EXPIRING_SOON, EXPIRED, RENEWAL_SUBMITTED
    
    # Specific statutory approval attributes
    sanctioned_floors = Column(String(64), nullable=True) # e.g., 2 Basement + Ground + 14 Floors
    sanctioned_height_m = Column(Numeric(8, 2), nullable=True) # Height in meters (CAAB)
    contact_officer_name = Column(String(128), nullable=True)
    contact_officer_phone = Column(String(64), nullable=True)

    # Status: NOT_APPLIED, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, EXPIRED, RENEWAL_PENDING
    status = Column(String(32), nullable=False, default="NOT_APPLIED", index=True)
    document_url = Column(String(255), nullable=True)
    remarks = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="clearances")
    conditions = relationship("AuthorityClearanceCondition", back_populates="clearance", cascade="all, delete-orphan")


class AuthorityClearanceCondition(Base):
    """
    Checklist of mandatory sanction conditions imposed by approval authorities (RAJUK/CDA/DoE/Fire).
    """
    __tablename__ = "prj_clearance_conditions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    clearance_id = Column(BigInteger, ForeignKey("prj_authority_clearances.id", ondelete="CASCADE"), nullable=False, index=True)
    condition_code = Column(String(32), nullable=False) # e.g. COND-01
    condition_title = Column(String(255), nullable=False)
    condition_category = Column(String(64), nullable=False, default="STATUTORY_MANDATE", index=True) # ARCHITECTURAL_SETBACK, FIRE_SAFETY, ENVIRONMENTAL_ETP, STRUCTURAL_INTEGRITY, ELECTRICAL_SUBSTATION
    mandatory_level = Column(String(32), nullable=False, default="CRITICAL") # CRITICAL, MANDATORY, ADVISORY
    compliance_status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, IN_PROGRESS, COMPLIED, WAIVED
    compliance_date = Column(Date, nullable=True)
    verified_by_officer = Column(String(128), nullable=True)
    evidence_doc_url = Column(String(255), nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    clearance = relationship("AuthorityClearance", back_populates="conditions")


class BOQItem(Base):
    """
    Bill of Quantities (BOQ) estimation line item specifying civil material requirements, rates & consumption.
    """
    __tablename__ = "prj_boq_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    # WBS Phase: SUB_STRUCTURE, PILING, SUPER_STRUCTURE, BRICK_WORK, FINISHING, MEP
    wbs_phase_id = Column(String(64), nullable=False, index=True)
    # Material Categories: REBAR_500W, CEMENT_OPC, SAND_FM_2_5, STONE_CHIPS, BRICKS_AUTO, CERAMIC_TILES
    material_category_id = Column(String(64), nullable=False, index=True)
    item_description = Column(String(255), nullable=False)
    # Unit of Measure: TON, BAG, CFT, THOUSAND_NOS, SQFT
    unit_of_measure_id = Column(String(32), nullable=False, default="CFT")
    
    item_code = Column(String(64), nullable=True, index=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    estimated_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    estimated_unit_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_estimated_cost = Column(Numeric(16, 2), nullable=False, default=0.00)
    actual_consumed_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    requisitioned_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    variation_order_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    hard_lock_percentage = Column(Numeric(5, 2), nullable=False, default=105.00) # 105% ceiling
    is_locked = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="boq_items")
    tower = relationship("Tower", back_populates="boq_items")
    wbs_node = relationship("WBSNode", back_populates="boq_items")
    variation_orders = relationship("VariationOrder", back_populates="boq_item", cascade="all, delete-orphan")


class Drawing(Base):
    """
    Architectural, Structural, MEP, and Approval Drawings.
    CRITICAL RULE:
    When a new revision is marked as Approved / Issued for Construction (IFC),
    all older revisions under the same drawing_number are automatically revoked.
    """
    __tablename__ = "prj_drawings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    # Category: ARCHITECTURAL, STRUCTURAL, ELECTRICAL_PLUMBING, FIRE_FIGHTING, RAJUK_APPROVAL
    drawing_category_id = Column(String(64), nullable=False, index=True)
    drawing_number = Column(String(64), nullable=False, index=True) # e.g. 'STR-COL-001'
    drawing_title = Column(String(191), nullable=False)
    revision_number = Column(String(16), nullable=False, default="R0") # R0, R1, R2...
    is_approved_for_construction = Column(Boolean, nullable=False, default=False, index=True)
    approved_by = Column(String(128), nullable=True)
    approval_date = Column(Date, nullable=True)
    file_url = Column(String(255), nullable=True)
    revision_notes = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="drawings")
