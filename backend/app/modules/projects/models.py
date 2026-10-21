from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, JSON, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class Project(Base):
    """
    Project Master table modeling real estate development projects mapped from acquired land parcels.    """
    __tablename__ = "prj_projects"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="SET NULL"), nullable=True, index=True)
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="SET NULL"), nullable=True, index=True)
    project_code = Column(String(64), unique=True, nullable=False, index=True)
    project_name = Column(String(191), nullable=False)
    project_name_bn = Column(String(191), nullable=True)
    company_name = Column(String(191), nullable=True, default="Apex Properties Ltd.")
    project_type = Column(String(64), nullable=False, default="RESIDENTIAL", index=True) # RESIDENTIAL, COMMERCIAL, MIXED_USE, INDUSTRIAL, LAND_DEVELOPMENT
    project_category = Column(String(64), nullable=False, default="APARTMENT", index=True) # APARTMENT, CONDOMINIUM, SHOPPING_COMPLEX, OFFICE_BUILDING, COMMERCIAL_TOWER, DUPLEX
    project_ownership = Column(String(64), nullable=False, default="OWNED", index=True) # OWNED, JOINT_VENTURE, PARTNERSHIP
    
    # Location
    division = Column(String(64), nullable=False, default="Dhaka", index=True)
    district = Column(String(64), nullable=False, default="Dhaka", index=True)
    thana_upazila = Column(String(64), nullable=False, default="Gulshan", index=True)
    locality = Column(String(191), nullable=True)
    site_address = Column(Text, nullable=True)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    google_maps_url = Column(String(500), nullable=True)
    
    # Ownership & Personnel
    project_manager = Column(String(128), nullable=True)
    project_director = Column(String(128), nullable=True)
    department = Column(String(128), nullable=True, default="Engineering & Civil Projects")
    project_team_structure = Column(JSON, nullable=True)
    site_offices = Column(JSON, nullable=True)
    
    development_authority_id = Column(String(32), nullable=False, default="RAJUK", index=True) # RAJUK, CDA, KDA, RDA
    
    # Land & Floor Area Ratio (FAR)
    total_land_area_katha = Column(Numeric(14, 4), nullable=False, default=0.00)
    total_land_area_decimal = Column(Numeric(14, 4), nullable=False, default=0.00)
    total_land_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    far_allocated = Column(Numeric(6, 2), nullable=False, default=3.50)
    mgc_percent = Column(Numeric(5, 2), nullable=False, default=50.00)
    road_width_feet = Column(Numeric(6, 2), nullable=False, default=40.00)
    plot_area_sqft = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_builtup_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_saleable_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    planned_construction_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Timeline
    project_start_date = Column(Date, nullable=True)
    target_completion_date = Column(Date, nullable=True)
    actual_start_date = Column(Date, nullable=True)
    revised_completion_date = Column(Date, nullable=True)
    project_duration_months = Column(Integer, nullable=False, default=24)
    planned_handover_date = Column(Date, nullable=True)
    
    # Financial & Funding
    project_funding_source = Column(String(128), nullable=False, default="EQUITY_AND_PRE_SALES") # EQUITY, BANK_FINANCE, CUSTOMER_ADVANCES, JOINT_VENTURE, SYNDICATE
    cost_center_code = Column(String(64), nullable=True)
    financial_year = Column(String(32), nullable=False, default="FY 2026-2027", index=True)
    estimated_budget_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    approved_budget_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    target_customer_segment = Column(String(128), nullable=True, default="UPPER_MIDDLE_CLASS")
    project_scope = Column(Text, nullable=True)
    
    # Status & Lifecycle
    # Status: DRAFT, FEASIBILITY, UNDER_REVIEW, APPROVED, PLANNING, UNDER_CONSTRUCTION, ON_HOLD, COMPLETED, CLOSED
    status = Column(String(32), nullable=False, default="PLANNING", index=True)
    approval_status = Column(String(32), nullable=False, default="DRAFT", index=True)
    project_phase = Column(String(64), nullable=False, default="PLANNING", index=True)
    land_parcel_ids = Column(JSON, nullable=True)
    landowner_ids = Column(JSON, nullable=True)
    status_history = Column(JSON, nullable=True)
    project_documents = Column(JSON, nullable=True)
    
    description = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    towers = relationship("Tower", back_populates="project", cascade="all, delete-orphan")
    clearances = relationship("AuthorityClearance", back_populates="project", cascade="all, delete-orphan")
    boq_items = relationship("BOQItem", back_populates="project", cascade="all, delete-orphan")
    drawings = relationship("Drawing", back_populates="project", cascade="all, delete-orphan")
    feasibilities = relationship("ProjectFeasibility", back_populates="project", cascade="all, delete-orphan")
    land_allocations = relationship("ProjectLandAllocation", back_populates="project", cascade="all, delete-orphan")
    floors = relationship("ProjectFloor", back_populates="project", cascade="all, delete-orphan")
    units = relationship("ProjectUnit", back_populates="project", cascade="all, delete-orphan")


class Tower(Base):
    """
    Spatial building tower block / structure within a project (Submodule 2.4).
    """
    __tablename__ = "prj_towers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_code = Column(String(64), nullable=False, index=True) # e.g. 'TOWER-A', 'BLOCK-NORTH'
    tower_name = Column(String(128), nullable=False)
    building_code = Column(String(64), nullable=True) # e.g. 'BLD-TWA'
    building_type = Column(String(64), nullable=False, default="RESIDENTIAL") # RESIDENTIAL, COMMERCIAL, MIXED_USE, SHOPPING_COMPLEX
    total_floors = Column(Integer, nullable=False, default=14)
    basement_floors = Column(Integer, nullable=False, default=1)
    podium_floors = Column(Integer, nullable=False, default=0)
    residential_floors = Column(Integer, nullable=False, default=13)
    commercial_floors = Column(Integer, nullable=False, default=0)
    total_lifts = Column(Integer, nullable=False, default=2)

    approved_height_m = Column(Numeric(8, 2), nullable=True, default=45.00)
    approved_floor_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    structural_system = Column(String(128), nullable=True, default="RCC_FRAME") # RCC_FRAME, POST_TENSIONED_CONCRETE, STEEL_COMPOSITE, SHEAR_WALL
    building_specifications = Column(Text, nullable=True)
    architect_name = Column(String(128), nullable=True)
    consultant_name = Column(String(128), nullable=True)
    contractor_name = Column(String(128), nullable=True)
    planned_construction_start = Column(Date, nullable=True)
    planned_completion_date = Column(Date, nullable=True)
    approval_reference_no = Column(String(128), nullable=True)
    drawing_references = Column(String(255), nullable=True)
    construction_status = Column(String(64), nullable=False, default="PLANNING") # PLANNING, SUBSTRUCTURE, SUPERSTRUCTURE, FINISHING, COMPLETED

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="towers")
    boq_items = relationship("BOQItem", back_populates="tower", cascade="all, delete-orphan")
    floors = relationship("ProjectFloor", back_populates="tower", cascade="all, delete-orphan")
    units = relationship("ProjectUnit", back_populates="tower", cascade="all, delete-orphan")


class ProjectFloor(Base):
    """
    Submodule 2.4 - Floor Configuration inside Tower/Building.
    """
    __tablename__ = "prj_floors"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="CASCADE"), nullable=False, index=True)
    floor_number = Column(Integer, nullable=False, index=True) # e.g. -2, -1, 0, 1, 2...
    display_name = Column(String(64), nullable=False) # e.g. 'Basement 1', 'Ground Floor', '5th Floor'
    floor_type = Column(String(64), nullable=False, default="RESIDENTIAL") # BASEMENT, GROUND, PODIUM, RESIDENTIAL, COMMERCIAL, SERVICE, ROOF
    floor_area_sqft = Column(Numeric(12, 2), nullable=False, default=0.00)
    common_area_sqft = Column(Numeric(12, 2), nullable=False, default=0.00)
    planned_units_count = Column(Integer, nullable=False, default=4)
    construction_status = Column(String(64), nullable=False, default="NOT_STARTED") # NOT_STARTED, PILING, CASTING, MASONRY, FINISHING, COMPLETED
    inspection_status = Column(String(64), nullable=False, default="PENDING") # PENDING, APPROVED, DEFECT_REPORTED
    inspection_history = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="floors")
    tower = relationship("Tower", back_populates="floors")
    units = relationship("ProjectUnit", back_populates="floor", cascade="all, delete-orphan")


class ProjectUnit(Base):
    """
    Submodule 2.4 - Unit / Space Inventory Setup with Area Reconciliations and Ownership Classification.
    """
    __tablename__ = "prj_units"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="CASCADE"), nullable=False, index=True)
    floor_id = Column(BigInteger, ForeignKey("prj_floors.id", ondelete="SET NULL"), nullable=True, index=True)
    floor_number = Column(Integer, nullable=False, index=True)
    unit_code = Column(String(64), nullable=False, index=True) # e.g. 'TWA-05A'
    unit_type = Column(String(64), nullable=False, default="APARTMENT_3BHK") # APARTMENT_2BHK, APARTMENT_3BHK, APARTMENT_4BHK, PENTHOUSE, DUPLEX, SHOP, OFFICE, PARKING_BAY
    bedroom_count = Column(Integer, nullable=False, default=3)
    bathroom_count = Column(Integer, nullable=False, default=3)
    balcony_count = Column(Integer, nullable=False, default=2)
    parking_details = Column(String(128), nullable=True)
    
    saleable_area_sqft = Column(Numeric(10, 2), nullable=False, default=0.00)
    usable_carpet_area_sqft = Column(Numeric(10, 2), nullable=False, default=0.00)
    common_area_allocated_sqft = Column(Numeric(10, 2), nullable=False, default=0.00)
    unit_orientation = Column(String(64), nullable=False, default="SOUTH_FACING") # SOUTH_FACING, NORTH_FACING, LAKE_VIEW, CORNER_PLOT, ROAD_FACING, GARDEN_VIEW
    specifications = Column(Text, nullable=True)
    planned_price_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Ownership Classification
    ownership_classification = Column(String(64), nullable=False, default="DEVELOPER_INVENTORY") # DEVELOPER_INVENTORY, LANDOWNER_ALLOCATION, JV_PARTNER, INVESTOR_RETAINED
    unit_status = Column(String(64), nullable=False, default="AVAILABLE") # PLANNED, AVAILABLE, ALLOCATED, RESERVED, SOLD, UNDER_CONSTRUCTION, HANDED_OVER
    configuration_stage = Column(String(64), nullable=False, default="PLANNED") # PLANNED, AUTHORITY_APPROVED
    approval_schedule_ref = Column(String(128), nullable=True)
    reassignment_authorized = Column(Boolean, nullable=False, default=False)
    reassignment_reason = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="units")
    tower = relationship("Tower", back_populates="units")
    floor = relationship("ProjectFloor", back_populates="units")


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

    # Approval Categories: LAND_USE_PERMIT, BUILDING_PLAN, DRAWING_APPROVAL, FIRE_SAFETY_CLEARANCE, ENVIRONMENTAL_CLEARANCE, UTILITY_SERVICE, CONSTRUCTION_INSPECTION, OCCUPANCY_CERTIFICATE
    approval_category = Column(String(64), nullable=True, default="BUILDING_PLAN")
    submission_date = Column(Date, nullable=True)
    responsible_officer = Column(String(128), nullable=True) # Assigned compliance owner
    next_action = Column(String(255), nullable=True) # Response, resubmission, inspection or renewal

    # Status: DRAFT, NOT_APPLIED, SUBMITTED, QUERY_RAISED, IN_REVIEW, APPROVED, REJECTED, EXPIRED, RENEWAL_PENDING
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
    specification = Column(Text, nullable=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    estimated_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    estimated_unit_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_estimated_cost = Column(Numeric(16, 2), nullable=False, default=0.00)

    # Cost Breakdown Components
    material_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    labour_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    equipment_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    subcontract_rate = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Lifecycle Stage & Tender vs Contract Baselines
    stage = Column(String(64), nullable=False, default="APPROVED_CONTRACT_BOQ", index=True)
    tender_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    tender_unit_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    tender_total_amount = Column(Numeric(16, 2), nullable=False, default=0.00)

    contract_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    contract_unit_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    contract_total_amount = Column(Numeric(16, 2), nullable=False, default=0.00)

    revised_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    revised_unit_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    revised_total_amount = Column(Numeric(16, 2), nullable=False, default=0.00)

    # Actuals & Progress Tracking
    actual_consumed_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    completed_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    remaining_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    requisitioned_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    variation_order_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    actual_cost = Column(Numeric(16, 2), nullable=False, default=0.00)
    cost_variance = Column(Numeric(16, 2), nullable=False, default=0.00)

    # Controls, Approvals & Locks
    hard_lock_percentage = Column(Numeric(5, 2), nullable=False, default=105.00) # 105% ceiling
    is_locked = Column(Boolean, nullable=False, default=False)
    version_no = Column(Integer, nullable=False, default=1)
    approved_by = Column(String(128), nullable=True)
    approval_date = Column(Date, nullable=True)
    rate_analysis_notes = Column(Text, nullable=True)
    supporting_document_url = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="boq_items")
    tower = relationship("Tower", back_populates="boq_items")
    wbs_node = relationship("WBSNode", back_populates="boq_items")
    variation_orders = relationship("VariationOrder", back_populates="boq_item", cascade="all, delete-orphan")


class Drawing(Base):
    """
    Submodule 2.9: Architectural Drawings & Document Management
    Centralized document repository associated with project, tower, floor, construction package, or approval application.
    Supports version history, IFC approvals, obsolescence/superseded status, confidentiality, and download history.
    """
    __tablename__ = "prj_drawings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    approval_clearance_id = Column(BigInteger, ForeignKey("prj_authority_clearances.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Category: CONCEPT_ARCHITECTURAL, STRUCTURAL_CALC, ELECTRICAL_PLUMBING, HVAC_FIRE_SAFETY, SOIL_SURVEY, BOQ_SPECIFICATIONS, CONSTRUCTION_SHOP, AUTHORITY_APPROVED, METHOD_INSPECTION, CONTRACT_VARIATION, AS_BUILT_HANDOVER
    drawing_category_id = Column(String(64), nullable=False, index=True)
    drawing_number = Column(String(64), nullable=False, index=True) # e.g. 'STR-COL-001'
    drawing_title = Column(String(191), nullable=False)
    discipline = Column(String(64), nullable=False, default="ARCHITECTURAL", index=True) # ARCHITECTURAL, STRUCTURAL, ELECTRICAL, PLUMBING, HVAC, FIRE_SAFETY, CIVIL_SURVEY, BOQ_SPEC, CONTRACTUAL
    revision_number = Column(String(16), nullable=False, default="R0") # R0, R1, R2, Rev A...
    
    floor_level = Column(String(64), nullable=True) # e.g. 'Basement 1', 'Ground Floor', 'Typical 1-14', 'Roof Level', 'Site Master'
    construction_package = Column(String(128), nullable=True) # e.g. 'Substructure RCC', 'Superstructure Frame', 'MEP Internal', 'Facade Glazing'
    
    author = Column(String(191), nullable=True) # Architectural / Consulting firm or Chief Drafter
    issue_date = Column(Date, nullable=True)
    
    # Status: DRAFT, UNDER_REVIEW, APPROVED_FOR_CONSTRUCTION, SUPERSEDED, AS_BUILT
    status = Column(String(32), nullable=False, default="DRAFT", index=True)
    is_approved_for_construction = Column(Boolean, nullable=False, default=False, index=True)
    is_superseded = Column(Boolean, nullable=False, default=False, index=True)
    superseded_by_id = Column(BigInteger, nullable=True)
    superseded_date = Column(Date, nullable=True)
    
    approved_by = Column(String(128), nullable=True)
    approval_date = Column(Date, nullable=True)
    
    file_url = Column(String(255), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size_mb = Column(Numeric(8, 2), nullable=True, default=0.0)
    file_type = Column(String(32), nullable=True, default="PDF") # PDF, DWG, DXF, IFC, XLSX, IMG, DOCX
    
    is_confidential = Column(Boolean, nullable=False, default=False, index=True)
    access_role = Column(String(64), nullable=False, default="PROJECT_TEAM") # ALL_ROLES, PROJECT_TEAM, CHIEF_ENGINEER, MANAGEMENT_ONLY
    download_count = Column(Integer, nullable=False, default=0)
    
    revision_notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="drawings")
    tower = relationship("Tower")
    clearance = relationship("AuthorityClearance")
    revisions = relationship("DrawingRevision", back_populates="drawing", cascade="all, delete-orphan")


class DrawingRevision(Base):
    """
    Historical revisions, changes, and audit logs for drawings.
    """
    __tablename__ = "prj_drawing_revisions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    drawing_id = Column(BigInteger, ForeignKey("prj_drawings.id", ondelete="CASCADE"), nullable=False, index=True)
    revision_number = Column(String(16), nullable=False)
    revision_date = Column(Date, nullable=True)
    author = Column(String(191), nullable=True)
    file_url = Column(String(255), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size_mb = Column(Numeric(8, 2), nullable=True, default=0.0)
    action_type = Column(String(64), nullable=False, default="REVISION_UPLOAD") # REVISION_UPLOAD, IFC_APPROVAL, SUPERSEDED, AS_BUILT_SIGN
    change_summary = Column(Text, nullable=True)
    approved_by = Column(String(128), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    drawing = relationship("Drawing", back_populates="revisions")


class ProjectFeasibility(Base):
    """
    2.2 Project Feasibility and Investment Analysis
    Before management approves a development project, the ERP calculates whether the proposed
    development is commercially, technically, and financially viable.
    Distinguishes gross project profit, operating profit, and profit after financing and tax.
    """
    __tablename__ = "prj_feasibilities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    feasibility_code = Column(String(64), unique=True, nullable=False, index=True)
    title = Column(String(191), nullable=False)
    version_label = Column(String(32), nullable=False, default="V1.0")

    # Imported / Estimated Cost Components
    land_acquisition_cost = Column(Numeric(18, 2), nullable=False, default=0.00)
    jv_landowner_cash_consideration = Column(Numeric(18, 2), nullable=False, default=0.00)
    legal_and_vetting_expenses = Column(Numeric(16, 2), nullable=False, default=0.00)
    preliminary_arch_engineering_cost = Column(Numeric(16, 2), nullable=False, default=0.00)
    estimated_construction_cost = Column(Numeric(18, 2), nullable=False, default=0.00)
    infrastructure_and_site_dev = Column(Numeric(16, 2), nullable=False, default=0.00)
    utility_connection_expenses = Column(Numeric(16, 2), nullable=False, default=0.00)
    professional_authority_fees = Column(Numeric(16, 2), nullable=False, default=0.00)
    marketing_and_brokerage_cost = Column(Numeric(16, 2), nullable=False, default=0.00)
    financing_and_interest_cost = Column(Numeric(16, 2), nullable=False, default=0.00)
    contingency_reserve = Column(Numeric(16, 2), nullable=False, default=0.00)

    # Architectural specs & Inventory Estimates
    proposed_building_height_meters = Column(Numeric(8, 2), nullable=False, default=45.00)
    proposed_floor_count = Column(Integer, nullable=False, default=14)
    proposed_unit_count = Column(Integer, nullable=False, default=56)
    apartment_unit_count = Column(Integer, nullable=False, default=40)
    commercial_unit_count = Column(Integer, nullable=False, default=8)
    parking_bay_count = Column(Integer, nullable=False, default=50)
    total_saleable_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_common_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    saleable_efficiency_percent = Column(Numeric(5, 2), nullable=False, default=80.00)

    # JV Allocation Split
    landowner_jv_sharing_ratio = Column(String(32), nullable=False, default="50:50")
    developer_share_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    landowner_share_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)

    # Revenue Components & Estimated Selling Rates
    avg_apartment_rate_sqft = Column(Numeric(12, 2), nullable=False, default=10000.00)
    avg_commercial_rate_sqft = Column(Numeric(12, 2), nullable=False, default=15000.00)
    avg_parking_rate_unit = Column(Numeric(12, 2), nullable=False, default=600000.00)
    estimated_apartment_sales_revenue = Column(Numeric(18, 2), nullable=False, default=0.00)
    estimated_commercial_sales_revenue = Column(Numeric(18, 2), nullable=False, default=0.00)
    estimated_parking_sales_revenue = Column(Numeric(18, 2), nullable=False, default=0.00)
    estimated_other_sales_revenue = Column(Numeric(18, 2), nullable=False, default=0.00)

    # Calculated Financial Outputs (in BDT)
    estimated_gross_revenue = Column(Numeric(18, 2), nullable=False, default=0.00)
    estimated_total_cost = Column(Numeric(18, 2), nullable=False, default=0.00)
    gross_project_profit = Column(Numeric(18, 2), nullable=False, default=0.00)
    operating_profit = Column(Numeric(18, 2), nullable=False, default=0.00)
    net_profit_after_tax = Column(Numeric(18, 2), nullable=False, default=0.00)
    profit_margin_percent = Column(Numeric(6, 2), nullable=False, default=0.00)
    roi_percent = Column(Numeric(6, 2), nullable=False, default=0.00)

    # Break-even Analysis
    break_even_sales_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    break_even_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    break_even_percent = Column(Numeric(5, 2), nullable=False, default=0.00)

    # Timeline & Cash Flow Modeling
    project_duration_months = Column(Integer, nullable=False, default=24)
    expected_start_date = Column(Date, nullable=True)
    expected_handover_date = Column(Date, nullable=True)
    cash_flow_forecast = Column(JSON, nullable=True)
    customer_collection_schedule = Column(JSON, nullable=True)
    scenario_models = Column(JSON, nullable=True)
    sensitivity_analysis = Column(JSON, nullable=True)

    # Workflow, Investment Committee Review & Governance
    status = Column(String(32), nullable=False, default="DRAFT", index=True) # DRAFT, SUBMITTED, APPROVED, REJECTED, RESUBMISSION_REQUIRED
    reviewed_by = Column(String(128), nullable=True)
    review_date = Column(Date, nullable=True)
    review_remarks = Column(Text, nullable=True)
    investment_committee_notes = Column(Text, nullable=True)
    committee_decision = Column(String(64), nullable=False, default="RECOMMENDED") # RECOMMENDED, CONDITIONALLY_APPROVED, REJECTED

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="feasibilities")


class ProjectLandAllocation(Base):
    """
    Submodule 2.3: Project-wise Land and Cost Allocation.
    Connects the Land Acquisition module with individual development projects.
    Links one or more acquired land parcels to a project, tracks allocated land area (Decimal, Katha, Sqft),
    apportions land purchase price, legal fees, registration costs, and related expenses.
    Supports shared parcels and common infrastructure serving multiple projects, transfer history,
    and reconciliation with the land acquisition ledger.
    """
    __tablename__ = "prj_land_allocations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="SET NULL"), nullable=True, index=True)
    allocation_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. PLA-2026-001
    project_name = Column(String(191), nullable=False)
    parcel_identifier = Column(String(191), nullable=False) # e.g. LND-000125 - Mouza Gulshan, Dag 452
    
    # Mathematical Allocated Areas
    allocated_area_decimal = Column(Numeric(14, 4), nullable=False, default=0.0)
    allocated_area_katha = Column(Numeric(14, 4), nullable=False, default=0.0)
    allocated_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.0)
    allocation_percentage = Column(Numeric(6, 2), nullable=False, default=100.0) # Percentage of parcel allocated to this project
    effective_date = Column(Date, nullable=False)

    # Cost Allocation Method: DIRECT_ASSIGNMENT, AREA_PROPORTION, PERCENTAGE, SHARED_INFRASTRUCTURE, CONFIGURED_BASIS
    allocation_method = Column(String(64), nullable=False, default="DIRECT_ASSIGNMENT")
    allocation_basis_notes = Column(Text, nullable=True)

    # Shared Parcel & Common Infrastructure Support
    is_shared_parcel = Column(Boolean, nullable=False, default=False)
    shared_projects_notes = Column(String(255), nullable=True)
    common_infrastructure_scope = Column(String(255), nullable=True) # e.g. Main access road, drainage network, electric substation

    # Cost Components (BDT)
    land_purchase_price = Column(Numeric(16, 2), nullable=False, default=0.0) # e.g. ৳8,00,00,000
    legal_fees = Column(Numeric(14, 2), nullable=False, default=0.0)
    registration_costs = Column(Numeric(14, 2), nullable=False, default=0.0)
    acquisition_related_expenses = Column(Numeric(16, 2), nullable=False, default=0.0) # e.g. ৳50,00,000
    total_allocated_cost = Column(Numeric(16, 2), nullable=False, default=0.0) # e.g. ৳8,50,00,000

    # Revision & Unallocated Balances Tracking
    original_allocated_cost = Column(Numeric(16, 2), nullable=False, default=0.0)
    revised_allocated_cost = Column(Numeric(16, 2), nullable=False, default=0.0)
    unallocated_balance = Column(Numeric(16, 2), nullable=False, default=0.0)
    transfer_history_notes = Column(Text, nullable=True)

    # Reconciliation with Land Acquisition Ledger
    acquisition_ledger_ref = Column(String(64), nullable=True) # e.g. ACQ-LDG-2026-8812
    reconciliation_status = Column(String(32), nullable=False, default="RECONCILED") # RECONCILED, PENDING, DISCREPANCY
    approval_status = Column(String(32), nullable=False, default="APPROVED") # DRAFT, UNDER_REVIEW, APPROVED
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="land_allocations")


class ProjectProfitability(Base):
    """
    Submodule 2.6: Estimated Profitability and ROI.
    Evaluates projected returns during feasibility and updates forecasts as construction costs
    and sales performance change.
    Recommended calculations:
    Project Profit = Recognized Revenue - Recognized Project Expenses
    ROI = (Project Profit / Defined Investment Base) * 100
    """
    __tablename__ = "prj_profitability_forecasts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    forecast_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. PRF-2026-001
    version_label = Column(String(64), nullable=False, default="Base Case V1.0")
    calculation_date = Column(Date, nullable=False, default=func.current_date())

    # Revenue estimates by saleable inventory
    apartment_revenue_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    shop_revenue_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    office_revenue_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    parking_revenue_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    other_revenue_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    total_estimated_revenue = Column(Numeric(18, 2), nullable=False, default=0.00)

    # Landowner and developer shares for Joint Venture
    jv_sharing_ratio = Column(String(32), nullable=False, default="50:50")
    developer_share_pct = Column(Numeric(6, 2), nullable=False, default=50.00)
    landowner_share_pct = Column(Numeric(6, 2), nullable=False, default=50.00)
    developer_revenue_share_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    landowner_revenue_share_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)

    # Cost Estimates
    construction_cost_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    consultant_fee_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    marketing_sales_cost_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    admin_overhead_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    financing_interest_cost_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    contingency_cost_est = Column(Numeric(18, 2), nullable=False, default=0.00)
    total_project_cost_est = Column(Numeric(18, 2), nullable=False, default=0.00)

    # Defined Investment Base & ROI
    defined_investment_base_type = Column(String(64), nullable=False, default="TOTAL_PROJECT_INVESTMENT") # TOTAL_PROJECT_INVESTMENT, EQUITY_INVESTED
    defined_investment_base_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    estimated_project_profit = Column(Numeric(18, 2), nullable=False, default=0.00) # Total Revenue - Total Cost
    gross_profit_margin_pct = Column(Numeric(6, 2), nullable=False, default=0.00)
    breakeven_sales_revenue = Column(Numeric(18, 2), nullable=False, default=0.00)
    breakeven_units_sqft = Column(Numeric(12, 2), nullable=False, default=0.00)
    roi_pct = Column(Numeric(6, 2), nullable=False, default=0.00) # (Profit / Investment Base) * 100

    # Actual vs Estimated (Forecast Updates from committed costs, posted expenses)
    recognized_revenue = Column(Numeric(18, 2), nullable=False, default=0.00)
    recognized_project_expenses = Column(Numeric(18, 2), nullable=False, default=0.00)
    actual_project_profit = Column(Numeric(18, 2), nullable=False, default=0.00) # Recognized Revenue - Recognized Expenses
    actual_roi_pct = Column(Numeric(6, 2), nullable=False, default=0.00)
    committed_costs = Column(Numeric(18, 2), nullable=False, default=0.00)
    posted_expenses = Column(Numeric(18, 2), nullable=False, default=0.00)
    cost_to_complete_forecast = Column(Numeric(18, 2), nullable=False, default=0.00)
    revised_completion_date = Column(Date, nullable=True)

    # Scenario Modeling
    scenario_price_increase_pct = Column(Numeric(6, 2), nullable=False, default=0.00)
    scenario_sales_delay_months = Column(Integer, nullable=False, default=0)
    scenario_cost_overrun_pct = Column(Numeric(6, 2), nullable=False, default=0.00)
    scenario_modeled_profit_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    scenario_modeled_roi_pct = Column(Numeric(6, 2), nullable=False, default=0.00)

    # Expected Collections & Cash Flow Schedule
    collection_schedule_json = Column(JSON, nullable=True)

    status = Column(String(32), nullable=False, default="ACTIVE_FORECAST", index=True) # DRAFT, ACTIVE_FORECAST, ARCHIVED
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")


class ProjectRiskIssue(Base):
    __tablename__ = "prj_risk_issues"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_category = Column(String(64), nullable=False, default="GENERAL")
    risk_title = Column(String(191), nullable=False)
    probability = Column(String(16), nullable=False, default="MEDIUM")
    impact = Column(String(16), nullable=False, default="MODERATE")
    mitigation_strategy = Column(Text, nullable=True)
    assigned_owner = Column(String(128), nullable=True)
    status = Column(String(16), nullable=False, default="OPEN", index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")


class ProjectMilestone(Base):
    """
    Submodule 2.7: Project Timeline and Milestone Tracking.
    Maintains project schedule with dependencies, planned dates, actual dates, assigned personnel,
    and completion percentages.
    Distinguishes physical progress from financial progress (70% budget spent != 70% construction complete).
    """
    __tablename__ = "prj_milestones"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    milestone_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. MLS-01, MLS-08
    milestone_number = Column(Integer, nullable=False, default=1, index=True) # 1 to 15 standard milestones
    milestone_name = Column(String(191), nullable=False)
    standard_milestone_ref = Column(String(128), nullable=True) # e.g. FOUNDATION_AND_PILING
    category = Column(String(64), nullable=False, default="CIVIL_STRUCTURE") # PRE_CONSTRUCTION, CIVIL_STRUCTURE, MEP_FINISHING, COMMISSIONING
    
    # Schedule Tracking
    planned_start_date = Column(Date, nullable=False)
    planned_finish_date = Column(Date, nullable=False)
    baseline_start_date = Column(Date, nullable=True)
    baseline_finish_date = Column(Date, nullable=True)
    actual_start_date = Column(Date, nullable=True)
    actual_finish_date = Column(Date, nullable=True)

    # Responsibility & Resources
    assigned_department = Column(String(128), nullable=True, default="Engineering & Civil Projects")
    contractor_id = Column(BigInteger, nullable=True)
    contractor_name = Column(String(191), nullable=True)
    responsible_person = Column(String(128), nullable=True)
    supervisor_name = Column(String(128), nullable=True)

    # Scheduling & Critical Path
    predecessor_ids = Column(JSON, nullable=True) # List of predecessor milestone IDs
    is_critical_path = Column(Boolean, nullable=False, default=False, index=True)
    weightage_percent = Column(Numeric(6, 2), nullable=False, default=0.00)

    # Progress Distinction: Physical vs Financial
    physical_progress_pct = Column(Numeric(6, 2), nullable=False, default=0.00)
    financial_progress_pct = Column(Numeric(6, 2), nullable=False, default=0.00)

    # Delay Management & Escalation
    delay_days = Column(Integer, nullable=False, default=0)
    delay_reason = Column(Text, nullable=True)
    recovery_plan = Column(Text, nullable=True)
    escalation_level = Column(String(32), nullable=False, default="NONE", index=True) # NONE, LOW, MEDIUM, CRITICAL
    
    # Verification & Evidence
    supervisor_verification = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, VERIFIED, REJECTED
    evidence_attachment_url = Column(String(255), nullable=True)

    status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, IN_PROGRESS, COMPLETED, DELAYED
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")


class ProjectFinancialPerformance(Base):
    """
    Submodule 2.13: Project-wise Profit and Loss & Financial Performance.
    Provides comprehensive financial view integrating Sales (POC Revenue), Accounts Receivable,
    Procurement, Accounts Payable, Payroll, Inventory, and General Ledger.
    
    IMPORTANT ACCOUNTING DISTINCTIONS:
    1. Customer advances are not automatically recognized as revenue (Revenue Recognition / IFRS 15).
    2. Contractor payments are not equivalent to construction expenses (Accrual / IPC certified work basis).
    3. Land cost allocated to sold units vs inventory.
    """
    __tablename__ = "prj_financial_performances"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    cost_center_code = Column(String(64), nullable=False, index=True)
    fiscal_year = Column(String(16), nullable=False, default="2025-26", index=True)
    period_type = Column(String(16), nullable=False, default="CUMULATIVE_TO_DATE", index=True) # MONTHLY, QUARTERLY, ANNUAL, CUMULATIVE_TO_DATE
    period_name = Column(String(64), nullable=False, default="Lifecycle to Date")

    # 1. Revenue Recognition vs Collections
    recognized_revenue = Column(Numeric(18, 2), nullable=False, default=0.00) # POC recognized revenue
    customer_advances_collected = Column(Numeric(18, 2), nullable=False, default=0.00) # Actual cash collected from buyers
    unearned_revenue = Column(Numeric(18, 2), nullable=False, default=0.00) # Advances exceeding POC revenue
    receivables_due = Column(Numeric(18, 2), nullable=False, default=0.00) # Billed/recognized but unpaid

    # 2. Cost of Sales (Direct Costs)
    land_cost_allocated = Column(Numeric(18, 2), nullable=False, default=0.00) # Land cost for sold units
    construction_materials_cost = Column(Numeric(18, 2), nullable=False, default=0.00) # Accrued civil works & materials
    consultants_direct_cost = Column(Numeric(18, 2), nullable=False, default=0.00) # Architecture, vetting, structural
    total_cost_of_sales = Column(Numeric(18, 2), nullable=False, default=0.00)

    # 3. Gross Project Profit
    gross_project_profit = Column(Numeric(18, 2), nullable=False, default=0.00)
    gross_profit_margin_pct = Column(Numeric(6, 2), nullable=False, default=0.00)

    # 4. Operating Expenses & Overhead Breakdown
    allocated_operating_expenses = Column(Numeric(18, 2), nullable=False, default=0.00) # Head office, marketing, site admin
    operating_profit_ebit = Column(Numeric(18, 2), nullable=False, default=0.00)

    # 5. Financing & Bank Loan Treatment
    financing_expenses = Column(Numeric(18, 2), nullable=False, default=0.00) # Bank interest expensed (IAS 23)
    bank_loan_drawn = Column(Numeric(18, 2), nullable=False, default=0.00)
    bank_loan_outstanding = Column(Numeric(18, 2), nullable=False, default=0.00)

    # 6. Bottom-Line Profit Before & After Tax
    profit_before_tax_pbt = Column(Numeric(18, 2), nullable=False, default=0.00)
    estimated_income_tax = Column(Numeric(18, 2), nullable=False, default=0.00)
    net_profit_after_tax = Column(Numeric(18, 2), nullable=False, default=0.00)
    net_profit_margin_pct = Column(Numeric(6, 2), nullable=False, default=0.00)
    roi_percent = Column(Numeric(6, 2), nullable=False, default=0.00)

    # 7. Contractor Payments vs Incurred Expense
    contractor_payments_made = Column(Numeric(18, 2), nullable=False, default=0.00) # Cash disbursed
    contractor_work_certified = Column(Numeric(18, 2), nullable=False, default=0.00) # Certified IPC work done
    outstanding_contractor_payable = Column(Numeric(18, 2), nullable=False, default=0.00) # Retention & unpaid bills

    # 8. Committed Cost & Forecast to Complete (EAC/ETC)
    committed_cost = Column(Numeric(18, 2), nullable=False, default=0.00)
    forecast_cost_to_complete_etc = Column(Numeric(18, 2), nullable=False, default=0.00)
    estimate_at_completion_eac = Column(Numeric(18, 2), nullable=False, default=0.00)
    original_feasibility_profit = Column(Numeric(18, 2), nullable=False, default=0.00)
    variance_from_feasibility = Column(Numeric(18, 2), nullable=False, default=0.00)

    # 9. Joint Venture Sharing (Landowner vs Developer)
    landowner_share_pct = Column(Numeric(5, 2), nullable=False, default=50.00)
    developer_share_pct = Column(Numeric(5, 2), nullable=False, default=50.00)
    landowner_revenue_share = Column(Numeric(18, 2), nullable=False, default=0.00)
    developer_revenue_share = Column(Numeric(18, 2), nullable=False, default=0.00)
    developer_net_pbt = Column(Numeric(18, 2), nullable=False, default=0.00)

    # 10. Status, Audit & Sign-off
    status = Column(String(32), nullable=False, default="PROVISIONAL", index=True) # PROVISIONAL, AUDITED, FINAL_CLOSURE
    prepared_by = Column(String(128), nullable=True)
    approved_by = Column(String(128), nullable=True)
    approval_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
