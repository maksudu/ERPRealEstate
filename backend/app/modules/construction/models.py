from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, DateTime, ForeignKey, TIMESTAMP, Text, JSON, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project, Tower
from app.modules.auth.models import User

class WBSNode(Base):
    """
    Work Breakdown Structure (WBS) & Activity Master hierarchy.
    Multi-tier tree: Project -> Tower -> Phase (Substructure, Superstructure, Finishing, MEP) -> Activity (Piling, Mat Casting, Column, Brickwork, Plaster, Tiles).
    Tracks planned vs actual dates, milestones, and physical % progress.
    """
    __tablename__ = "con_wbs_nodes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    parent_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="CASCADE"), nullable=True, index=True)
    
    node_code = Column(String(64), nullable=False, index=True) # e.g. WBS-SUB-01, ACT-PIL-001
    node_name = Column(String(191), nullable=False) # e.g. "Substructure", "Cast-in-situ Piling", "Column Casting L1-L5"
    wbs_tier = Column(String(32), nullable=False, default="ACTIVITY") # PHASE, SUB_PHASE, ACTIVITY, TASK
    phase_category = Column(String(64), nullable=False, default="SUBSTRUCTURE") # SUBSTRUCTURE, SUPERSTRUCTURE, FINISHING, MEP
    activity_type = Column(String(64), nullable=True) # PILING, MAT_CASTING, COLUMN, BEAM_SLAB, BRICKWORK, PLASTER, TILES, MEP
    
    planned_start_date = Column(Date, nullable=False)
    planned_end_date = Column(Date, nullable=False)
    actual_start_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)
    duration_days = Column(Integer, nullable=False, default=1)

    # Quantity & Progress Calculation
    unit_of_measure = Column(String(32), nullable=True, default="SFT") # SFT, CFT, RFT, CUM, SQM, MT, KG, NOS, LS
    planned_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    verified_completed_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    approved_total_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    progress_measurement_method = Column(String(64), nullable=False, default="QUANTITY_DRIVEN") # QUANTITY_DRIVEN, MILESTONE_PERCENTAGE, EFFORT_HOURS, EARNED_VALUE

    progress_percentage = Column(Numeric(5, 2), nullable=False, default=0.00) # 0.00 to 100.00%
    weightage_percentage = Column(Numeric(5, 2), nullable=False, default=10.00) # Weightage within project (EVM weighted progress)
    earned_value = Column(Numeric(16, 2), nullable=False, default=0.00) # EV
    planned_value = Column(Numeric(16, 2), nullable=False, default=0.00) # PV
    status = Column(String(32), nullable=False, default="NOT_STARTED", index=True) # NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED, CRITICAL_PATH, ON_HOLD

    # Baseline & Scheduling
    baseline_start_date = Column(Date, nullable=True)
    baseline_end_date = Column(Date, nullable=True)
    baseline_duration_days = Column(Integer, nullable=True)
    schedule_revision_no = Column(Integer, nullable=False, default=0)
    is_critical_path = Column(Boolean, nullable=False, default=False)
    is_milestone = Column(Boolean, nullable=False, default=False)

    # Precedence & Dependencies
    predecessor_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True)
    dependency_type = Column(String(32), nullable=False, default="FS") # FS, SS, FF, SF
    lag_days = Column(Integer, nullable=False, default=0)

    # Contractor / Team Allocation
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True)
    responsible_engineer = Column(String(128), nullable=True)
    responsible_team = Column(String(128), nullable=True)

    # Delay Tracking & Site Constraints
    delay_days = Column(Integer, nullable=False, default=0)
    delay_reason = Column(String(255), nullable=True)
    corrective_action = Column(Text, nullable=True)
    weather_constraints = Column(Text, nullable=True)
    site_constraints = Column(Text, nullable=True)
    forecasted_end_date = Column(Date, nullable=True)
    variance_days = Column(Integer, nullable=False, default=0)

    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    parent = relationship("WBSNode", remote_side=[id], foreign_keys=[parent_id], back_populates="children")
    children = relationship("WBSNode", foreign_keys=[parent_id], back_populates="parent", lazy="selectin")
    predecessor = relationship("WBSNode", remote_side=[id], foreign_keys=[predecessor_node_id], post_update=True)
    contractor = relationship("Subcontractor")
    boq_items = relationship("BOQItem", back_populates="wbs_node")


class ProjectCalendar(Base):
    """
    Project Master Working Calendar & Shifts.
    Configures working days per week (e.g. 6 days), weekly off days, daily shifts, and official holidays.
    """
    __tablename__ = "con_project_calendars"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    calendar_name = Column(String(128), nullable=False, default="Standard 6-Day Construction Calendar")
    working_days_per_week = Column(Integer, nullable=False, default=6)
    weekly_off_days = Column(JSON, nullable=True) # e.g. ["FRIDAY"]
    working_hours_per_day = Column(Numeric(4, 1), nullable=False, default=8.0)
    shifts = Column(JSON, nullable=True) # list of shifts [{"name": "Day Shift", "start_time": "08:00", "end_time": "17:00"}]
    holidays = Column(JSON, nullable=True) # list of holidays [{"date": "YYYY-MM-DD", "name": "..."}]

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")


class ActivityDependency(Base):
    """
    Precedence relationships between WBS Activities (Finish-to-Start, Start-to-Start, etc.).
    """
    __tablename__ = "con_activity_dependencies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    predecessor_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    dependency_type = Column(String(32), nullable=False, default="FS") # FS, SS, FF, SF
    lag_days = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

    wbs_node = relationship("WBSNode", foreign_keys=[wbs_node_id])
    predecessor = relationship("WBSNode", foreign_keys=[predecessor_node_id])



class VariationOrder(Base):
    """
    Variation Order (VO) approving budget/quantity increases beyond 105% BOQ Hard Budget Lock.
    """
    __tablename__ = "con_variation_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    boq_item_id = Column(BigInteger, ForeignKey("prj_boq_items.id", ondelete="CASCADE"), nullable=False, index=True)
    vo_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. VO-PRJ01-2026-001
    additional_quantity = Column(Numeric(14, 4), nullable=False)
    revised_rate = Column(Numeric(14, 2), nullable=True)
    additional_budget = Column(Numeric(16, 2), nullable=False, default=0.00)
    reason = Column(Text, nullable=False)
    approved_by_pm = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, APPROVED, REJECTED
    approval_date = Column(Date, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    boq_item = relationship("BOQItem", back_populates="variation_orders")


class JointMeasurementSheet(Base):
    """
    Joint Measurement Sheet (JMS) signed by Site Engineer and Subcontractor representative.
    Direct input source for RA Billing Gross Certified amounts.
    """
    __tablename__ = "con_joint_measurements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    work_order_id = Column(BigInteger, ForeignKey("con_work_orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    jms_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. JMS-WO01-004
    measurement_date = Column(Date, nullable=False, default=func.current_date())
    location_floor = Column(String(128), nullable=False) # e.g. Tower 1 - Floor 4 Beam & Slab B4-S4
    trade_item = Column(String(191), nullable=False) # e.g. Shuttering & Scaffolding, Reinforcement Binding
    unit_of_measure = Column(String(32), nullable=False, default="SFT") # SFT, CFT, RFT, TON, NOS
    
    # Dimensions
    measured_length = Column(Numeric(10, 2), nullable=False, default=0.00)
    measured_breadth = Column(Numeric(10, 2), nullable=False, default=0.00)
    measured_depth = Column(Numeric(10, 2), nullable=False, default=0.00)
    measured_quantity = Column(Numeric(14, 4), nullable=False)
    unit_rate = Column(Numeric(14, 2), nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=False) # measured_quantity * unit_rate
    
    verified_by_site_engineer = Column(String(128), nullable=False)
    subcontractor_representative = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="VERIFIED_BY_ENGINEER", index=True) # DRAFT, VERIFIED_BY_ENGINEER, BILLED
    ra_bill_id = Column(BigInteger, ForeignKey("con_ra_bills.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    work_order = relationship("WorkOrder")
    wbs_node = relationship("WBSNode")


class Subcontractor(Base):
    """
    Contractor & Subcontractor Master Registry.
    Maintains registered legal business profile, authorized representatives, trade categories,
    tax/VAT compliance, restricted bank credentials, licenses & insurance, performance ratings,
    manpower/equipment capacity, safety records, and contract timeline.
    """
    __tablename__ = "con_contractors"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    contractor_code = Column(String(32), unique=True, nullable=False, index=True)
    company_name = Column(String(191), nullable=False)
    legal_business_name = Column(String(255), nullable=True)
    trade_specialization = Column(String(64), nullable=False) # e.g. CIVIL_STRUCTURE, ROD_BINDING, SANITARY_PLUMBING
    trade_category = Column(String(64), nullable=False, default="CIVIL_STRUCTURE")
    contractor_type = Column(String(64), nullable=False, default="SUBCONTRACTOR") # MAIN_CONTRACTOR, SUBCONTRACTOR, SPECIALIZED_TRADE, LABOR_SUPPLIER
    parent_contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True)

    # Contact & Authorized Representative
    contact_person = Column(String(128), nullable=False)
    primary_phone = Column(String(32), nullable=False)
    secondary_phone = Column(String(32), nullable=True)
    email = Column(String(128), nullable=True)
    office_address = Column(Text, nullable=True)
    city = Column(String(64), nullable=True, default="Dhaka")
    authorized_rep_name = Column(String(128), nullable=True)
    authorized_rep_designation = Column(String(128), nullable=True)
    authorized_rep_phone = Column(String(32), nullable=True)
    authorized_rep_nid = Column(String(64), nullable=True)

    # Statutory & Tax / VAT details
    tin_number = Column(String(64), nullable=True)
    bin_number = Column(String(64), nullable=True)
    trade_license_number = Column(String(64), nullable=True)
    trade_license_expiry = Column(Date, nullable=True)
    tax_circle = Column(String(64), nullable=True)

    # Bank & Payment Details (Restricted Access)
    bank_name = Column(String(128), nullable=True)
    bank_branch = Column(String(128), nullable=True)
    bank_account_name = Column(String(191), nullable=True)
    bank_account_number = Column(String(64), nullable=True)
    bank_routing_number = Column(String(32), nullable=True)
    payment_terms_days = Column(Integer, nullable=False, default=30)

    # Licenses, Certifications & Insurance
    iso_certification = Column(String(128), nullable=True)
    license_grade = Column(String(64), nullable=True, default="GRADE_A")
    enlistment_category = Column(String(64), nullable=True, default="CATEGORY_1")
    insurance_policy_number = Column(String(64), nullable=True)
    insurance_expiry_date = Column(Date, nullable=True)
    insurance_coverage_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Safety Record & Compliance
    safety_compliant = Column(Boolean, nullable=False, default=True)
    safety_officer_name = Column(String(128), nullable=True)
    safety_incident_count = Column(Integer, nullable=False, default=0)

    # Performance & Experience History
    performance_rating = Column(Numeric(3, 2), nullable=False, default=4.50) # Scale of 0.00 - 5.00
    past_projects_count = Column(Integer, nullable=False, default=0)
    experience_years = Column(Integer, nullable=False, default=5)

    # Capacity, Site Supervisors & Scope Boundaries
    manpower_capacity = Column(Integer, nullable=False, default=50)
    equipment_inventory = Column(Text, nullable=True)
    site_supervisor_name = Column(String(128), nullable=True)
    site_supervisor_phone = Column(String(32), nullable=True)
    scope_boundaries = Column(Text, nullable=True)
    duplicate_billing_protection = Column(Boolean, nullable=False, default=True)

    # Timeline & Workflow Status
    contract_start_date = Column(Date, nullable=True)
    contract_expiry_date = Column(Date, nullable=True)
    onboarding_status = Column(String(32), nullable=False, default="APPROVED") # DRAFT, UNDER_REVIEW, APPROVED, SUSPENDED, BLACKLISTED
    completion_status = Column(String(32), nullable=False, default="ACTIVE") # ACTIVE, ONGOING, COMPLETED, DEFECT_LIABILITY, TERMINATED
    has_active_disputes = Column(Boolean, nullable=False, default=False)
    remarks = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    parent_contractor = relationship("Subcontractor", remote_side=[id], foreign_keys=[parent_contractor_id], backref="subcontractors")
    work_orders = relationship("WorkOrder", back_populates="contractor")
    rates = relationship("ContractorRate", back_populates="contractor", cascade="all, delete-orphan")
    disputes = relationship("ContractorDispute", back_populates="contractor", cascade="all, delete-orphan")


class ContractorRate(Base):
    """
    Subcontract Itemized Approved Rate Card.
    Defines approved trade unit rates and explicit scope boundaries to prevent duplicate measurement or billing.
    """
    __tablename__ = "con_contractor_rates"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    work_order_id = Column(BigInteger, ForeignKey("con_work_orders.id", ondelete="SET NULL"), nullable=True)
    item_code = Column(String(64), nullable=False, index=True)
    trade_item_name = Column(String(191), nullable=False)
    specification = Column(Text, nullable=True)
    unit_of_measure = Column(String(32), nullable=False, default="SFT")
    approved_unit_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    scope_boundary_definition = Column(Text, nullable=True)
    effective_start_date = Column(Date, nullable=False)
    effective_end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    contractor = relationship("Subcontractor", back_populates="rates")
    project = relationship("Project")


class ContractorDispute(Base):
    """
    Subcontractor Disputes, Deductions, Claims & Retention Hold.
    Tracks disputes across measurement, defect liability, wastage overages, and schedule delays.
    """
    __tablename__ = "con_contractor_disputes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    dispute_code = Column(String(64), unique=True, nullable=False, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    work_order_id = Column(BigInteger, ForeignKey("con_work_orders.id", ondelete="SET NULL"), nullable=True)
    
    dispute_category = Column(String(64), nullable=False, default="MEASUREMENT_DISCREPANCY")
    dispute_title = Column(String(191), nullable=False)
    description = Column(Text, nullable=False)
    claimed_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    approved_deduction_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    retention_held_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    status = Column(String(32), nullable=False, default="OPEN", index=True) # OPEN, UNDER_MEDIATION, RESOLVED, DEDUCTED, REJECTED
    resolution_notes = Column(Text, nullable=True)

    raised_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False)
    raised_date = Column(Date, nullable=False, default=func.current_date())
    resolved_date = Column(Date, nullable=True)
    resolved_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    contractor = relationship("Subcontractor", back_populates="disputes")
    project = relationship("Project")
    raised_by = relationship("User", foreign_keys=[raised_by_user_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_user_id])


class DPRReport(Base):
    """
    Daily Progress Report (DPR) site diary recorded by Project Engineers.
    Tracks structural activities, material consumption (CFT concrete, MT rebar, cement bags),
    weather conditions, and headcount.
    """
    __tablename__ = "con_dpr_reports"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    report_date = Column(Date, nullable=False, index=True, default=func.current_date())
    
    # Weather: SUNNY, OVERCAST, RAIN_LIGHT, RAIN_HEAVY, STORMY
    weather_condition_id = Column(String(32), nullable=False, default="SUNNY")
    site_engineer_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    
    structural_activity_summary = Column(Text, nullable=False)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    floor_unit_location = Column(String(191), nullable=True) # e.g. Tower 1 - Floor 4 Beam & Slab B4-S4
    machinery_deployed = Column(String(255), nullable=True) # e.g. 1x Concrete Pump 42m, 2x Tower Cranes, 4x Vibrators
    site_photos = Column(JSON, nullable=True) # JSON array of photos: [{"url": "...", "caption": "..."}]
    safety_incident_logged = Column(Boolean, nullable=False, default=False)
    safety_incident_notes = Column(Text, nullable=True)

    concrete_casting_cft = Column(Numeric(12, 2), nullable=False, default=0.00)
    steel_rod_consumed_mt = Column(Numeric(10, 3), nullable=False, default=0.000)
    cement_consumed_bags = Column(Integer, nullable=False, default=0)
    total_workers_onsite = Column(Integer, nullable=False, default=0)
    
    # Status: DRAFT, SUBMITTED, APPROVED_BY_PM
    status = Column(String(32), nullable=False, default="SUBMITTED", index=True)

    report_number = Column(String(64), nullable=True, index=True)
    client_offline_uuid = Column(String(64), nullable=True, index=True)
    sync_status = Column(String(32), nullable=False, default="SYNCED", index=True) # SYNCED, OFFLINE_DRAFT, CONFLICT_DETECTED, CONFLICT_RESOLVED
    conflict_detected = Column(Boolean, nullable=False, default=False)
    conflict_notes = Column(Text, nullable=True)
    version_number = Column(Integer, nullable=False, default=1)
    revision_history = Column(JSON, nullable=True)

    # Authorized Geo-location & Photo Timestamps
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    gps_accuracy_meters = Column(Numeric(8, 2), nullable=True)
    location_address = Column(String(255), nullable=True)
    location_verified = Column(Boolean, nullable=False, default=False)
    photo_timestamp = Column(TIMESTAMP, nullable=True)

    # Progress & Scope
    activities_planned = Column(Text, nullable=True)
    activities_completed = Column(Text, nullable=True)
    boq_quantities_completed = Column(JSON, nullable=True) # [{"boq_item_id": 1, "item_code": "...", "unit": "...", "completed_quantity": 25.5}]

    # Equipment Tracking & Downtime
    equipment_records = Column(JSON, nullable=True) # [{"equipment_name": "...", "hours_operated": 6.5, "downtime_hours": 1.5, "downtime_reason": "..."}]
    total_equipment_downtime_hours = Column(Numeric(6, 2), nullable=False, default=0.00)

    # Materials Received, Issued & Consumed
    materials_summary = Column(JSON, nullable=True) # [{"material_name": "...", "received_qty": 200, "issued_qty": 150, "consumed_qty": 140, "wastage_qty": 10}]
    material_wastage_notes = Column(Text, nullable=True)

    # Inspection Requests & Quality Observations
    inspection_requests = Column(Text, nullable=True)
    quality_observations = Column(Text, nullable=True)
    inspection_status = Column(String(32), nullable=False, default="PENDING")

    # Site Constraints, Delays & Recovery Plan
    site_constraints = Column(Text, nullable=True)
    delay_hours = Column(Numeric(5, 2), nullable=False, default=0.00)
    delay_root_cause = Column(String(64), nullable=True)
    recovery_plan = Column(Text, nullable=True)

    # Comments & Multi-tier Approvals
    engineer_comments = Column(Text, nullable=True)
    supervisor_approval_status = Column(String(32), nullable=False, default="PENDING_REVIEW", index=True)
    supervisor_comments = Column(Text, nullable=True)
    approved_by_supervisor_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approval_date = Column(TIMESTAMP, nullable=True)
    supervisor_signature = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    tower = relationship("Tower")
    site_engineer = relationship("User", foreign_keys=[site_engineer_id])
    supervisor = relationship("User", foreign_keys=[approved_by_supervisor_id])
    wbs_node = relationship("WBSNode")
    labor_entries = relationship("LaborMuster", back_populates="dpr", cascade="all, delete-orphan")


class LaborMuster(Base):
    """
    Subcontractor Daily Labor Muster Roll recording headcounts and wage allocations per trade.
    """
    __tablename__ = "con_labor_muster"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    dpr_id = Column(BigInteger, ForeignKey("con_dpr_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True)
    
    # Trade: ROD_BINDER, MASON, CARPENTER, PLUMBER, ELECTRICIAN, HELPER
    trade_category = Column(String(64), nullable=False)
    worker_count = Column(Integer, nullable=False, default=1)
    daily_wage_rate = Column(Numeric(10, 2), nullable=False, default=800.00)
    total_wage = Column(Numeric(12, 2), nullable=False) # worker_count * daily_wage_rate

    created_at = Column(TIMESTAMP, server_default=func.now())

    dpr = relationship("DPRReport", back_populates="labor_entries")
    contractor = relationship("Subcontractor")


class WorkOrder(Base):
    """
    Subcontractor & Main Contractor Formal Work Order / Agreement.
    Links approved BOQ line items, tender benchmarks, delegated approval thresholds,
    milestone payment schedules, statutory tax/VAT withholdings, advance recovery rules,
    and contract variations.
    """
    __tablename__ = "con_work_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    work_order_no = Column(String(64), unique=True, nullable=False, index=True) # e.g. "WO-2026-0001"
    contract_reference = Column(String(128), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    tower_name = Column(String(64), nullable=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    wbs_package_name = Column(String(128), nullable=True)

    contract_title = Column(String(191), nullable=True)
    contract_type = Column(String(64), nullable=False) # CIVIL_SUPERSTRUCTURE, SHUTTERING_CARPENTRY, PLUMBING_SANITARY, TILES_MARBLE
    contract_model = Column(String(64), nullable=False, default="ITEM_RATE") # ITEM_RATE, LUMP_SUM, COST_PLUS_PERCENT, PERCENTAGE_RATE, TURNKEY_EPC
    tender_reference = Column(String(128), nullable=True)
    technical_specifications = Column(Text, nullable=True)
    scope_of_work = Column(Text, nullable=True)

    # Financial Values & Budget Controls
    total_contract_value = Column(Numeric(14, 2), nullable=False)
    original_contract_value = Column(Numeric(14, 2), nullable=False, default=0.00)
    approved_variations_value = Column(Numeric(14, 2), nullable=False, default=0.00)
    revised_contract_value = Column(Numeric(14, 2), nullable=False, default=0.00)
    committed_cost = Column(Numeric(14, 2), nullable=False, default=0.00)
    certified_work_value = Column(Numeric(14, 2), nullable=False, default=0.00)
    paid_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Timeline & Delay Tracking
    start_date = Column(Date, nullable=True)
    target_completion_date = Column(Date, nullable=True)
    actual_completion_date = Column(Date, nullable=True)
    delay_days = Column(Integer, nullable=False, default=0)

    # Advance Payment & Recovery
    advance_payment_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    advance_payment_percent = Column(Numeric(5, 2), nullable=False, default=0.00)
    advance_recovery_rule = Column(String(128), nullable=True, default="RECOVER_ACROSS_RUNNING_BILLS")
    advance_recovered_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Retention & Defect Liability
    retention_money_percent = Column(Numeric(5, 2), nullable=False, default=5.00) # Standard 5.0%
    retention_money_held = Column(Numeric(14, 2), nullable=False, default=0.00)
    retention_release_conditions = Column(Text, nullable=True)
    defect_liability_months = Column(Integer, nullable=False, default=12) # Standard 12 Months

    # Performance Security
    performance_security_type = Column(String(64), nullable=True, default="BANK_GUARANTEE")
    performance_security_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    performance_security_expiry = Column(Date, nullable=True)

    # Tax & Statutory Deductions
    tds_section = Column(String(64), nullable=True, default="SECTION_52")
    tds_rate = Column(Numeric(5, 2), nullable=False, default=5.00)
    vds_rate = Column(Numeric(5, 2), nullable=False, default=7.50)

    # Delegated Authority Limit & Budget Headroom Alert
    delegated_approval_limit = Column(Numeric(14, 2), nullable=False, default=50000000.00)
    budget_headroom_alert_percent = Column(Numeric(5, 2), nullable=False, default=95.00)
    budget_alert_triggered = Column(Boolean, nullable=False, default=False)

    # Approval Workflow & Status
    approval_status = Column(String(32), nullable=False, default="APPROVED") # DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, AMENDMENT_PENDING
    approval_level = Column(String(64), nullable=True, default="PROJECT_DIRECTOR")
    approved_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approval_date = Column(Date, nullable=True)
    signed_contract_doc_url = Column(String(255), nullable=True)
    document_attachments = Column(Text, nullable=True) # JSON or comma-separated
    version_number = Column(Integer, nullable=False, default=1)
    amendment_notes = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE", index=True) # ACTIVE, SUBSTANTIALLY_COMPLETED, CLOSED, TERMINATED

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project")
    contractor = relationship("Subcontractor", back_populates="work_orders")
    tower = relationship("Tower")
    wbs_node = relationship("WBSNode")
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    items = relationship("WorkOrderItem", back_populates="work_order", cascade="all, delete-orphan")
    milestones = relationship("WorkOrderMilestone", back_populates="work_order", cascade="all, delete-orphan")
    ra_bills = relationship("RABill", back_populates="work_order", cascade="all, delete-orphan")


class WorkOrderItem(Base):
    """
    Approved BOQ Line Items and contracted item rates linked to the Work Order.
    """
    __tablename__ = "con_work_order_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    work_order_id = Column(BigInteger, ForeignKey("con_work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    boq_item_id = Column(BigInteger, ForeignKey("prj_boq_items.id", ondelete="SET NULL"), nullable=True, index=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    item_code = Column(String(64), nullable=False)
    item_description = Column(String(255), nullable=False)
    specification = Column(Text, nullable=True)
    unit_of_measure = Column(String(32), nullable=False, default="SFT")
    boq_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    contract_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    approved_unit_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    executed_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    remaining_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    remarks = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    work_order = relationship("WorkOrder", back_populates="items")
    boq_item = relationship("BOQItem")
    wbs_node = relationship("WBSNode")


class WorkOrderMilestone(Base):
    """
    Contract Milestone Schedules and weightage-based disbursement criteria.
    """
    __tablename__ = "con_work_order_milestones"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    work_order_id = Column(BigInteger, ForeignKey("con_work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    milestone_code = Column(String(64), nullable=False)
    milestone_title = Column(String(191), nullable=False)
    target_date = Column(Date, nullable=False)
    actual_date = Column(Date, nullable=True)
    weightage_percent = Column(Numeric(5, 2), nullable=False, default=10.00)
    milestone_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    is_critical = Column(Boolean, nullable=False, default=False)
    status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, IN_PROGRESS, ACHIEVED, DELAYED
    verification_notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    work_order = relationship("WorkOrder", back_populates="milestones")


class RABill(Base):
    """
    Running Account (RA) Bill / Contractor Progress Certificate.
    Measurement-based billing with 6-stage verification:
    Contractor Submission -> Site Engineer -> QS Review -> PM Approval -> Accounts Review -> Authorized Payment.
    Enforces Bangladesh Statutory Deduction Formula:
    $$\\text{Net Payable} = \\text{Gross Work Certified} - \\text{Advance Recovery} - \\text{Retention (5\\%)} - \\text{Other Approved Deductions} - \\text{TDS (Sec 52)} - \\text{VDS}$$
    """
    __tablename__ = "con_ra_bills"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    work_order_id = Column(BigInteger, ForeignKey("con_work_orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=True, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="RESTRICT"), nullable=True, index=True)

    ra_bill_number = Column(String(64), nullable=False) # e.g. "RA-2026-0001"
    bill_date = Column(Date, nullable=False, default=func.current_date())
    billing_period_start = Column(Date, nullable=True)
    billing_period_end = Column(Date, nullable=True)

    # Measured Bill Values (Previous, Current, Cumulative)
    previous_certified_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    current_gross_bill_value = Column(Numeric(14, 2), nullable=False, default=0.00)
    gross_work_certified_amount = Column(Numeric(14, 2), nullable=False) # Current certified gross
    cumulative_certified_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Contractual Deductions & Recoveries
    advance_recovery_deducted = Column(Numeric(14, 2), nullable=False, default=0.00)
    retention_percent = Column(Numeric(5, 2), nullable=False, default=5.00) # Standard 5.0%
    retention_money_deducted = Column(Numeric(14, 2), nullable=False, default=0.00)
    material_store_recovery_amount = Column(Numeric(14, 2), nullable=False, default=0.00) # Cement, rebar, fuel store recovery
    penalty_deduction_amount = Column(Numeric(14, 2), nullable=False, default=0.00) # Safety NCR, delay penalties
    other_deductions_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    other_deductions_description = Column(String(255), nullable=True)

    # Statutory Tax & VAT Treatment
    tax_treatment_type = Column(String(64), nullable=False, default="STANDARD_TDS_52")
    tds_rate = Column(Numeric(5, 2), nullable=False, default=5.00) # Income Tax Sec 52
    tds_withheld_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    vat_treatment_type = Column(String(64), nullable=False, default="STANDARD_VDS_7_5")
    vds_rate = Column(Numeric(5, 2), nullable=False, default=7.50) # VAT Withholding
    vds_withheld_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Net Calculation & Payments
    net_payable_amount = Column(Numeric(14, 2), nullable=False) # Current bill net approved
    previous_payments_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    net_payable_balance = Column(Numeric(14, 2), nullable=False, default=0.00) # Outstanding balance

    # 6-Stage Workflow & Multi-Role Signatures
    workflow_stage = Column(String(64), nullable=False, default="CONTRACTOR_SUBMISSION", index=True)
    current_stage_assignee_role = Column(String(64), nullable=True, default="SITE_ENGINEER")
    revision_number = Column(Integer, nullable=False, default=1)
    rejection_reason = Column(Text, nullable=True)
    review_comments = Column(Text, nullable=True)
    approval_signature_chain = Column(JSON, nullable=True)

    # Attachments & Measurements
    measurement_sheet_urls = Column(Text, nullable=True)
    site_photo_urls = Column(Text, nullable=True)

    # Hold, Dispute & Retention Tracking
    is_on_hold = Column(Boolean, nullable=False, default=False, index=True)
    hold_reason = Column(String(255), nullable=True)
    hold_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    dispute_id = Column(BigInteger, ForeignKey("con_contractor_disputes.id", ondelete="SET NULL"), nullable=True)

    retention_release_status = Column(String(32), nullable=False, default="HELD") # HELD, ELIGIBLE, RELEASED
    retention_release_eligible_date = Column(Date, nullable=True)
    retention_release_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Financial Reconciliation & Disbursement
    status = Column(String(32), nullable=False, default="DRAFT", index=True) # DRAFT, VERIFIED, APPROVED, REJECTED, PAID
    payment_status = Column(String(32), nullable=False, default="UNPAID", index=True) # UNPAID, APPROVED_FOR_PAYMENT, PARTIALLY_PAID, PAID, ON_HOLD
    paid_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    payment_date = Column(Date, nullable=True)
    payment_method = Column(String(64), nullable=True, default="BANK_TRANSFER")
    bank_payment_ref = Column(String(128), nullable=True)
    cheque_reference = Column(String(128), nullable=True)
    accounts_journal_voucher_ref = Column(String(64), nullable=True)
    remarks = Column(Text, nullable=True)

    # User Assignments
    created_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    verified_by_engineer_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    verified_by_qs_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approved_by_pm_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    reviewed_by_accounts_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    work_order = relationship("WorkOrder", back_populates="ra_bills")
    project = relationship("Project")
    contractor = relationship("Subcontractor")
    items = relationship("RABillItem", back_populates="ra_bill", cascade="all, delete-orphan")
    hold_by_user = relationship("User", foreign_keys=[hold_by_user_id])
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    verified_by_engineer = relationship("User", foreign_keys=[verified_by_engineer_id])
    verified_by_qs = relationship("User", foreign_keys=[verified_by_qs_id])
    approved_by_pm = relationship("User", foreign_keys=[approved_by_pm_id])
    reviewed_by_accounts = relationship("User", foreign_keys=[reviewed_by_accounts_id])


class RABillItem(Base):
    """
    Itemized progressive measurement line item on a Running Account (RA) Bill.
    Tracks previous certified, current measured, and cumulative executed quantities and amounts.
    $$\\text{Cumulative Quantity} = \\text{Previous Certified Quantity} + \\text{Current Measured Quantity}$$
    """
    __tablename__ = "con_ra_bill_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ra_bill_id = Column(BigInteger, ForeignKey("con_ra_bills.id", ondelete="CASCADE"), nullable=False, index=True)
    work_order_item_id = Column(BigInteger, ForeignKey("con_work_order_items.id", ondelete="SET NULL"), nullable=True)
    boq_item_id = Column(BigInteger, ForeignKey("prj_boq_items.id", ondelete="SET NULL"), nullable=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True)

    item_code = Column(String(64), nullable=False)
    item_description = Column(String(255), nullable=False)
    unit_of_measure = Column(String(32), nullable=False, default="SFT")

    contract_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    contract_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)

    previous_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    current_measured_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    cumulative_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)

    previous_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    current_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    cumulative_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    location_floor = Column(String(128), nullable=True)
    measurement_sheet_ref = Column(String(128), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    ra_bill = relationship("RABill", back_populates="items")
    work_order_item = relationship("WorkOrderItem")
    boq_item = relationship("BOQItem")
    wbs_node = relationship("WBSNode")


class ConcreteCubeTest(Base):
    """
    Concrete Cube Crushing Test Register (Module 40).
    Tracks batching, slump tests, and ASTM/BNBC 7-day, 14-day, and 28-day compressive crushing strength.
    """
    __tablename__ = "con_concrete_cube_tests"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    structural_element = Column(String(128), nullable=False) # e.g. Column C1-C8 L-04, Mat Foundation Zone-B, Shear Wall W2
    casting_date = Column(Date, nullable=False, index=True)
    design_compressive_strength_psi = Column(Integer, nullable=False, default=4000) # e.g. 3500 psi, 4000 psi, 5000 psi
    concrete_grade = Column(String(32), nullable=False, default="M25") # M20, M25, M30, M35
    batching_plant_name = Column(String(128), nullable=False) # e.g. On-site Batching, Ready-Mix Mir Cement, Crown Cement RMC
    slump_test_mm = Column(Integer, nullable=False, default=100) # Slump in mm (e.g. 75 - 125 mm)

    # 7-Day Crushing Test (Target: >= 65-70% of design strength)
    day7_testing_date = Column(Date, nullable=True)
    day7_strength_psi = Column(Integer, nullable=True)

    # 14-Day Crushing Test (Target: >= 85-90% of design strength)
    day14_testing_date = Column(Date, nullable=True)
    day14_strength_psi = Column(Integer, nullable=True)

    # 28-Day Crushing Test (Target: >= 100% of design strength)
    day28_testing_date = Column(Date, nullable=True)
    day28_strength_psi = Column(Integer, nullable=True)

    # Verdict: PENDING, PASSED, FAILED
    test_verdict = Column(String(32), nullable=False, default="PENDING", index=True)
    lab_test_report_url = Column(String(255), nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    tower = relationship("Tower")


class SafetyNCR(Base):
    """
    Non-Conformance Reports (NCR) & Site Safety Violations Register (Module 40).
    Tracks structural defects, honeycombing, cover missing, safety violations, contractor rectification deadlines.
    """
    __tablename__ = "con_safety_ncrs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    ncr_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. NCR-PRJ01-2026-001
    category = Column(String(64), nullable=False) # Structural Defect, Honeycombing, Cover Missing, Safety Violation
    severity = Column(String(32), nullable=False, default="Medium") # Low, Medium, High, Critical
    description = Column(Text, nullable=True)
    location_details = Column(String(191), nullable=True) # e.g. Tower A - Floor 4 Beam B-12
    photo_url = Column(String(255), nullable=True)
    assigned_contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    rectification_deadline = Column(Date, nullable=False)
    status = Column(String(32), nullable=False, default="Open", index=True) # Open, Rectified, Verified_Closed
    rectification_notes = Column(Text, nullable=True)
    rectification_photo_url = Column(String(255), nullable=True)
    closed_date = Column(Date, nullable=True)

    # Defect Tracking, Structural Escalation & CAPA
    defect_title = Column(String(191), nullable=True)
    inspection_id = Column(BigInteger, ForeignKey("con_quality_inspections.id", ondelete="SET NULL"), nullable=True, index=True)
    affects_safety_or_structural = Column(Boolean, nullable=False, default=False)
    escalation_level = Column(String(64), nullable=False, default="PROJECT_LEVEL") # PROJECT_LEVEL, ESCALATED_TO_DIRECTOR
    corrective_action = Column(Text, nullable=True)
    preventive_action = Column(Text, nullable=True)
    capa_submitted_at = Column(TIMESTAMP, nullable=True)
    reinspected_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    reinspection_date = Column(Date, nullable=True)
    reinspection_verdict = Column(String(32), nullable=True) # PASSED, FAILED_REOPEN
    closure_approval_remarks = Column(Text, nullable=True)
    closure_approved_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    contractor = relationship("Subcontractor")
    inspection = relationship("ConstructionQualityInspection", foreign_keys=[inspection_id])
    reinspected_by = relationship("User", foreign_keys=[reinspected_by_user_id])
    closure_approved_by = relationship("User", foreign_keys=[closure_approved_by_user_id])


class SiteMaterialRequisition(Base):
    """
    Site Material Requisition (SMR / MR):
    Connects construction sites with Procurement, Inventory, Warehouse, and Finance.
    Enforces BOQ allowable headroom and real-time store stock availability checks.
    """
    __tablename__ = "con_material_requisitions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    requisition_number = Column(String(64), unique=True, nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    tower_name = Column(String(64), nullable=True)
    floor_number = Column(String(32), nullable=True)
    work_package = Column(String(64), nullable=False, default="CIVIL_STRUCTURE")
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)
    boq_item_id = Column(BigInteger, ForeignKey("prj_boq_items.id", ondelete="SET NULL"), nullable=True, index=True)

    material_code = Column(String(64), nullable=False)
    material_name = Column(String(191), nullable=False)
    specification = Column(Text, nullable=True)
    grade = Column(String(64), nullable=True)
    unit_of_measure = Column(String(32), nullable=False, default="BAG")

    requested_quantity = Column(Numeric(14, 4), nullable=False)
    approved_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    issued_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    returned_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    consumed_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    wastage_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    damage_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    allowed_wastage_percentage = Column(Numeric(5, 2), nullable=False, default=2.50)
    actual_wastage_percentage = Column(Numeric(5, 2), nullable=False, default=0.00)

    stock_balance_at_request = Column(Numeric(14, 4), nullable=False, default=0.0000)
    boq_allocated_quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    boq_previous_consumed = Column(Numeric(14, 4), nullable=False, default=0.0000)
    boq_remaining_headroom = Column(Numeric(14, 4), nullable=False, default=0.0000)

    store_id = Column(BigInteger, ForeignKey("scm_site_stores.id", ondelete="SET NULL"), nullable=True, index=True)
    supplier_name = Column(String(191), nullable=True)
    batch_lot_number = Column(String(64), nullable=True)
    storage_location = Column(String(128), nullable=True)

    requested_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False)
    requisition_date = Column(Date, nullable=False, default=func.current_date())
    required_by_date = Column(Date, nullable=True)
    priority = Column(String(32), nullable=False, default="NORMAL") # LOW, NORMAL, URGENT, CRITICAL

    approved_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approval_date = Column(Date, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    purpose_remarks = Column(Text, nullable=True)

    purchase_requisition_id = Column(BigInteger, ForeignKey("scm_purchase_requisitions.id", ondelete="SET NULL"), nullable=True)
    min_number = Column(String(64), nullable=True)
    received_date = Column(Date, nullable=True)
    received_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    # Status: DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, PO_INITIATED, PARTIALLY_ISSUED, ISSUED, RECEIVED_AT_SITE, CONSUMED, CLOSED
    status = Column(String(32), nullable=False, default="PENDING_APPROVAL", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    tower = relationship("Tower")
    wbs_node = relationship("WBSNode")
    boq_item = relationship("BOQItem")
    material = relationship("MaterialItem")
    store = relationship("SiteStore")
    requested_by = relationship("User", foreign_keys=[requested_by_user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    received_by = relationship("User", foreign_keys=[received_by_user_id])
    consumptions = relationship("MaterialConsumption", back_populates="requisition", cascade="all, delete-orphan")
    returns = relationship("MaterialReturn", back_populates="requisition", cascade="all, delete-orphan")


class MaterialConsumption(Base):
    """
    Site Material Consumption & Wastage Tracking:
    Recorded against WBS activity with allowed vs actual wastage, damage, and variance.
    """
    __tablename__ = "con_material_consumptions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    requisition_id = Column(BigInteger, ForeignKey("con_material_requisitions.id", ondelete="CASCADE"), nullable=False, index=True)
    min_id = Column(BigInteger, ForeignKey("scm_material_issues.id", ondelete="SET NULL"), nullable=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)

    consumption_date = Column(Date, nullable=False, default=func.current_date())
    quantity_consumed = Column(Numeric(14, 4), nullable=False)
    quantity_returned = Column(Numeric(14, 4), nullable=False, default=0.0000)
    quantity_wasted = Column(Numeric(14, 4), nullable=False, default=0.0000)
    quantity_damaged = Column(Numeric(14, 4), nullable=False, default=0.0000)
    unit_of_measure = Column(String(32), nullable=False, default="BAG")
    unit_cost = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_consumption_cost = Column(Numeric(16, 2), nullable=False, default=0.00)
    variance_cost = Column(Numeric(16, 2), nullable=False, default=0.00)

    batch_lot_number = Column(String(64), nullable=True)
    work_location = Column(String(191), nullable=True)
    subcontractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True)
    recorded_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    verification_status = Column(String(32), nullable=False, default="VERIFIED") # VERIFIED, RECONCILED, AUDITED
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    requisition = relationship("SiteMaterialRequisition", back_populates="consumptions")
    project = relationship("Project")
    wbs_node = relationship("WBSNode")
    material = relationship("MaterialItem")
    contractor = relationship("Subcontractor")
    recorded_by = relationship("User")


class MaterialReturn(Base):
    """
    Return-to-Store (RTS):
    Unused or excess materials returned to site store, restoring inventory stock balance.
    """
    __tablename__ = "con_material_returns"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    rts_number = Column(String(64), unique=True, nullable=False, index=True)
    requisition_id = Column(BigInteger, ForeignKey("con_material_requisitions.id", ondelete="CASCADE"), nullable=False, index=True)
    store_id = Column(BigInteger, ForeignKey("scm_site_stores.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)

    return_date = Column(Date, nullable=False, default=func.current_date())
    returned_quantity = Column(Numeric(14, 4), nullable=False)
    unit_of_measure = Column(String(32), nullable=False, default="BAG")
    condition_status = Column(String(32), nullable=False, default="GOOD") # GOOD, PARTIALLY_DAMAGED, SCRAP
    return_reason = Column(String(191), nullable=True) # EXCESS_AFTER_CASTING, SURPLUS_STOCK, OFF_SPEC_MATERIAL, DAMAGED_ON_SITE
    returned_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False)
    accepted_by_storekeeper_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), nullable=False, default="RECEIVED_IN_STORE") # PENDING_RECEIPT, RECEIVED_IN_STORE, REJECTED

    created_at = Column(TIMESTAMP, server_default=func.now())

    requisition = relationship("SiteMaterialRequisition", back_populates="returns")
    store = relationship("SiteStore")
    project = relationship("Project")
    material = relationship("MaterialItem")
    returned_by = relationship("User", foreign_keys=[returned_by_user_id])
    accepted_by = relationship("User", foreign_keys=[accepted_by_storekeeper_id])


class ConstructionQualityInspection(Base):
    """
    Work-Stage Quality Inspections, ITP Checklists & Approvals.
    Supports concrete, reinforcement, masonry, waterproofing, MEP checklists,
    material test certs, and strict pass/fail gating.
    """
    __tablename__ = "con_quality_inspections"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    inspection_number = Column(String(64), unique=True, nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)

    stage_category = Column(String(64), nullable=False, default="CONCRETE_CASTING", index=True)
    structural_location = Column(String(191), nullable=False)
    itp_reference_code = Column(String(64), nullable=True)
    inspection_request_date = Column(Date, nullable=False, default=func.current_date())
    scheduled_inspection_date = Column(Date, nullable=False)

    checklist_items = Column(JSON, nullable=True) # [{"check_item": "...", "is_mandatory": true, "result": "PASS", "comments": "..."}]
    mandatory_checks_passed = Column(Boolean, nullable=False, default=False)
    evidence_photos = Column(JSON, nullable=True) # [{"url": "...", "caption": "...", "timestamp": "..."}]
    material_test_cert_url = Column(String(255), nullable=True)
    lab_test_report_id = Column(BigInteger, nullable=True)

    verdict = Column(String(32), nullable=False, default="PENDING_INSPECTION", index=True) # PENDING_INSPECTION, PASSED, CONDITIONAL_PASS, REJECTED, NCR_ISSUED
    consultant_engineer_name = Column(String(128), nullable=True)
    inspector_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)
    passed_date = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    tower = relationship("Tower")
    wbs_node = relationship("WBSNode")
    contractor = relationship("Subcontractor")
    inspector = relationship("User", foreign_keys=[inspector_user_id])
    defects = relationship("SafetyNCR", foreign_keys="[SafetyNCR.inspection_id]", overlaps="inspection")

QualityInspection = ConstructionQualityInspection


class LaborWorker(Base):
    """
    Central Worker Master Registry.
    Tracks individual worker identity, trade, skill level, daily wage, overtime rate,
    and direct hire payroll vs subcontractor gang assignment.
    """
    __tablename__ = "con_labor_workers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    worker_code = Column(String(64), unique=True, nullable=False, index=True)
    worker_name = Column(String(191), nullable=False)
    worker_type = Column(String(64), nullable=False, default="SUBCONTRACTOR_LABOR", index=True) # SUBCONTRACTOR_LABOR, DIRECT_HIRE_PAYROLL
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    trade_category = Column(String(64), nullable=False, default="CIVIL_MASONRY", index=True)
    skill_level = Column(String(32), nullable=False, default="SKILLED")
    phone_number = Column(String(32), nullable=True)
    nid_number = Column(String(64), nullable=True)
    daily_wage_rate = Column(Numeric(10, 2), nullable=False, default=800.00)
    hourly_overtime_rate = Column(Numeric(10, 2), nullable=False, default=120.00)
    emergency_contact = Column(String(128), nullable=True)
    assigned_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True)
    assigned_wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    biometric_id = Column(String(64), nullable=True)
    photo_url = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    contractor = relationship("Subcontractor")
    assigned_project = relationship("Project", foreign_keys=[assigned_project_id])
    assigned_wbs_node = relationship("WBSNode", foreign_keys=[assigned_wbs_node_id])
    attendance_records = relationship("LaborAttendance", back_populates="worker", cascade="all, delete-orphan")


class LaborAttendance(Base):
    """
    Daily Worker & Crew Attendance Register.
    Captures shift allocation, check-in/out, overtime, GPS location, biometric status,
    and site supervisor approvals with auto wage computation.
    """
    __tablename__ = "con_labor_attendance"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    attendance_date = Column(Date, nullable=False, default=func.current_date(), index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    worker_id = Column(BigInteger, ForeignKey("con_labor_workers.id", ondelete="SET NULL"), nullable=True, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)

    worker_type = Column(String(64), nullable=False, default="SUBCONTRACTOR_LABOR")
    trade_category = Column(String(64), nullable=False, default="CIVIL_MASONRY")
    crew_gang_name = Column(String(128), nullable=True)
    shift_type = Column(String(32), nullable=False, default="DAY_SHIFT") # DAY_SHIFT, NIGHT_SHIFT, EXTENDED_OVERTIME
    check_in_time = Column(TIMESTAMP, nullable=True)
    check_out_time = Column(TIMESTAMP, nullable=True)
    hours_worked = Column(Numeric(5, 2), nullable=False, default=8.00)
    overtime_hours = Column(Numeric(5, 2), nullable=False, default=0.00)
    attendance_status = Column(String(32), nullable=False, default="PRESENT", index=True) # PRESENT, ABSENT, HALF_DAY, ON_LEAVE

    daily_wage = Column(Numeric(10, 2), nullable=False, default=800.00)
    overtime_pay = Column(Numeric(10, 2), nullable=False, default=0.00)
    total_earned = Column(Numeric(12, 2), nullable=False, default=800.00)

    # Capture Methods & Authorizations
    capture_method = Column(String(64), nullable=False, default="SUPERVISOR_ENTRY") # MOBILE_GPS, SUPERVISOR_ENTRY, BIOMETRIC_DEVICE, BATCH_IMPORT
    gps_latitude = Column(Numeric(10, 7), nullable=True)
    gps_longitude = Column(Numeric(10, 7), nullable=True)
    gps_verified = Column(Boolean, nullable=False, default=False)
    photo_verified = Column(Boolean, nullable=False, default=False)
    photo_url = Column(String(255), nullable=True)
    biometric_verified = Column(Boolean, nullable=False, default=False)

    # Supervisor Review
    supervisor_approval_status = Column(String(32), nullable=False, default="APPROVED_BY_SUPERVISOR")
    approved_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    supervisor_remarks = Column(Text, nullable=True)

    # Subcontractor Payment Voucher link
    subcontractor_payment_id = Column(BigInteger, ForeignKey("con_subcontractor_payments.id", ondelete="SET NULL"), nullable=True, index=True)
    is_billed_paid = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    tower = relationship("Tower")
    wbs_node = relationship("WBSNode")
    worker = relationship("LaborWorker", back_populates="attendance_records")
    contractor = relationship("Subcontractor")
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    subcontractor_payment = relationship("SubcontractorPayment", back_populates="attendance_records")


class SubcontractorPayment(Base):
    """
    Subcontractor Certified Payment Vouchers & Direct Payroll Vouchers.
    Validates verified attendance, measured work quantities, contract rates,
    advance recovery, retention deductions (5%), TDS/VDS, and net certified payables.
    """
    __tablename__ = "con_subcontractor_payments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    voucher_number = Column(String(64), unique=True, nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_category = Column(String(64), nullable=False, default="CONTRACTOR_INVOICE") # CONTRACTOR_INVOICE, DIRECT_PAYROLL
    payment_type = Column(String(64), nullable=False, default="ATTENDANCE_AND_MEASURED_WORK")
    billing_period_start = Column(Date, nullable=False)
    billing_period_end = Column(Date, nullable=False)

    total_mandays_verified = Column(Numeric(10, 2), nullable=False, default=0.00)
    measured_work_certified_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    attendance_wage_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    gross_payable_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    advance_recovery_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    retention_deduction_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    tds_tax_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    vds_vat_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    other_penalties_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    net_certified_payable = Column(Numeric(14, 2), nullable=False, default=0.00)
    paid_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    status = Column(String(32), nullable=False, default="DRAFT", index=True) # DRAFT, VERIFIED_BY_QS, APPROVED_BY_PM, POSTED_TO_ACCOUNTS, PAID
    payment_method = Column(String(64), nullable=True, default="BANK_TRANSFER")
    bank_reference = Column(String(128), nullable=True)
    payment_date = Column(Date, nullable=True)
    certified_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    contractor = relationship("Subcontractor")
    certified_by = relationship("User", foreign_keys=[certified_by_user_id])
    attendance_records = relationship("LaborAttendance", back_populates="subcontractor_payment")


class SafetyIncident(Base):
    """
    Health & Safety Incident, Injury, Near-Miss and Property Damage Record.
    Includes root cause analysis (RCA), CAPA assignment, emergency escalation, and privacy/medical confidentiality.
    """
    __tablename__ = "con_safety_incidents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    incident_code = Column(String(50), nullable=False, unique=True, index=True)
    incident_title = Column(String(255), nullable=False)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True)

    incident_date = Column(Date, nullable=False, index=True)
    incident_time = Column(String(20), nullable=True)
    exact_location = Column(String(255), nullable=False)
    incident_type = Column(String(60), nullable=False, default="NEAR_MISS", index=True)
    severity_level = Column(String(40), nullable=False, default="MEDIUM")

    injured_person_type = Column(String(60), nullable=True, default="WORKER")
    injured_person_name = Column(String(200), nullable=True)
    injured_worker_id = Column(BigInteger, ForeignKey("con_labor_workers.id", ondelete="SET NULL"), nullable=True)
    injury_nature = Column(String(255), nullable=True)
    body_part_affected = Column(String(100), nullable=True)
    days_lost_count = Column(Integer, nullable=False, default=0)
    property_damage_estimated_cost = Column(Numeric(14, 2), nullable=False, default=0.00)

    incident_description = Column(Text, nullable=False)
    root_cause_analysis = Column(Text, nullable=True)
    immediate_action_taken = Column(Text, nullable=True)
    corrective_preventive_action = Column(Text, nullable=True)
    responsible_person_name = Column(String(150), nullable=True)
    capa_due_date = Column(Date, nullable=True)

    investigation_status = Column(String(50), nullable=False, default="REPORTED", index=True)
    investigated_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    investigation_date = Column(Date, nullable=True)

    emergency_escalation_notified = Column(Boolean, nullable=False, default=False)
    escalated_to_management_at = Column(DateTime, nullable=True)
    is_confidential_medical = Column(Boolean, nullable=False, default=False)
    incident_photo_urls = Column(JSON, nullable=True)
    police_or_regulatory_report_filed = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    contractor = relationship("Subcontractor")
    injured_worker = relationship("LaborWorker", foreign_keys=[injured_worker_id])
    investigator = relationship("User", foreign_keys=[investigated_by_user_id])


class SafetyTraining(Base):
    """
    Site Safety Induction, Toolbox Talks (TBT), and Specialized Safety Training.
    Tracks attendance, trainer credential, topics, and compliance verification.
    """
    __tablename__ = "con_safety_inductions_trainings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    training_code = Column(String(50), nullable=False, unique=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True)
    training_type = Column(String(60), nullable=False, default="SITE_INDUCTION", index=True)
    session_title = Column(String(255), nullable=False)
    trainer_name = Column(String(150), nullable=False)
    trainer_designation = Column(String(150), nullable=True)
    training_date = Column(Date, nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False, default=45)
    location_room_zone = Column(String(200), nullable=True)
    attendees_count = Column(Integer, nullable=False, default=0)
    attendees_list = Column(JSON, nullable=True)
    topics_covered = Column(Text, nullable=True)
    feedback_summary = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project")
    contractor = relationship("Subcontractor")


class PermitToWork(Base):
    """
    Permit-to-Work (PTW) for controlled hazardous activities (hot work, working at height, confined space, etc.).
    Requires safety officer verification and Project Manager authorization.
    """
    __tablename__ = "con_permits_to_work"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    permit_number = Column(String(50), nullable=False, unique=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True)
    permit_type = Column(String(60), nullable=False, default="HOT_WORK")
    work_location = Column(String(255), nullable=False)
    scope_of_controlled_activity = Column(Text, nullable=False)
    valid_from_time = Column(DateTime, nullable=False)
    valid_to_time = Column(DateTime, nullable=False)
    hazard_controls_in_place = Column(JSON, nullable=True)
    requested_by_supervisor_name = Column(String(150), nullable=False)
    request_timestamp = Column(DateTime, nullable=False, default=func.now())
    safety_officer_name = Column(String(150), nullable=True)
    safety_officer_verified = Column(Boolean, nullable=False, default=False)
    project_manager_approved = Column(Boolean, nullable=False, default=False)
    approved_by_name = Column(String(150), nullable=True)
    approval_timestamp = Column(DateTime, nullable=True)
    permit_status = Column(String(50), nullable=False, default="REQUESTED", index=True)
    closure_inspection_notes = Column(Text, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project")
    contractor = relationship("Subcontractor")


class ProjectCompletion(Base):
    """
    Project Completion Dossier, Final Handover & Taking-Over Clearance.
    Consolidates WBS 100%, final BOQ reconciliation, outstanding bills, retention release,
    as-built drawings, O&M manuals, and management sign-off.
    """
    __tablename__ = "con_project_completions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    completion_code = Column(String(50), nullable=False, unique=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    target_handover_date = Column(Date, nullable=False)
    actual_completion_date = Column(Date, nullable=True)
    stage_status = Column(String(60), nullable=False, default="IN_RECONCILIATION", index=True)
    wbs_activities_completion_pct = Column(Numeric(5, 2), nullable=False, default=100.00)
    total_boq_reconciled_items_count = Column(Integer, nullable=False, default=0)

    final_reconciled_cost_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    original_budget_cost_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    cost_variance_amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)

    outstanding_contractor_bills_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    retention_money_locked_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    retention_release_authorized = Column(Boolean, nullable=False, default=False)

    materials_store_reconciliation_cleared = Column(Boolean, nullable=False, default=False)
    equipment_store_reconciliation_cleared = Column(Boolean, nullable=False, default=False)
    open_quality_defects_count = Column(Integer, nullable=False, default=0)
    open_safety_incidents_count = Column(Integer, nullable=False, default=0)

    as_built_drawings_submitted = Column(Boolean, nullable=False, default=False)
    as_built_drawings_ref_url = Column(String(500), nullable=True)
    om_manuals_submitted = Column(Boolean, nullable=False, default=False)
    om_manuals_ref_url = Column(String(500), nullable=True)
    warranties_collected_count = Column(Integer, nullable=False, default=0)
    warranties_summary_url = Column(String(500), nullable=True)

    mandatory_items_all_cleared = Column(Boolean, nullable=False, default=False)
    permitted_punchlist_exceptions = Column(JSON, nullable=True)
    taking_over_certificate_url = Column(String(500), nullable=True)

    project_manager_signoff = Column(Boolean, nullable=False, default=False)
    pm_name = Column(String(150), nullable=True)
    pm_signoff_at = Column(DateTime, nullable=True)
    project_director_signoff = Column(Boolean, nullable=False, default=False)
    director_name = Column(String(150), nullable=True)
    director_signoff_at = Column(DateTime, nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    punchlist_items = relationship("PunchlistItem", back_populates="completion", cascade="all, delete-orphan")


class PunchlistItem(Base):
    """
    Punchlist & Snags Tracking for project completion.
    Categorizes snags into minor cosmetic, operational, or mandatory critical.
    """
    __tablename__ = "con_punchlist_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    completion_id = Column(BigInteger, ForeignKey("con_project_completions.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    item_code = Column(String(50), nullable=False, unique=True, index=True)
    category = Column(String(60), nullable=False, default="Architectural Finishing")
    location_floor_unit = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    photo_url = Column(String(500), nullable=True)
    assigned_contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True)
    contractor_name = Column(String(200), nullable=True)
    severity = Column(String(40), nullable=False, default="MINOR_COSMETIC")
    target_rectification_date = Column(Date, nullable=False)
    status = Column(String(50), nullable=False, default="OPEN", index=True)
    reinspected_by_name = Column(String(150), nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    completion = relationship("ProjectCompletion", back_populates="punchlist_items")
    project = relationship("Project")
    contractor = relationship("Subcontractor")




