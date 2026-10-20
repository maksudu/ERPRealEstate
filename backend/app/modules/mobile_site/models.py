from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, TIMESTAMP, Text, func
)
from app.core.database import Base


class MobileSiteDpr(Base):
    """
    Daily Progress Report (DPR)
    Work completed, labour count, weather notes, daily activities
    """
    __tablename__ = "mob_site_dpr"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    dpr_code = Column(String(64), unique=True, nullable=False, index=True)
    project_name = Column(String(191), nullable=False, index=True)
    dpr_date = Column(Date, nullable=False, index=True)
    weather_condition = Column(String(64), nullable=False, default="Sunny (32°C)")
    labour_count = Column(Integer, nullable=False, default=45)
    work_completed = Column(Text, nullable=False)
    delays_challenges = Column(Text, nullable=True)
    site_engineer = Column(String(128), nullable=False, default="Engr. Sajjad Hossain")
    status = Column(String(32), nullable=False, default="SUBMITTED", index=True) # DRAFT, SUBMITTED, APPROVED

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSiteTask(Base):
    """
    Task & Milestone Management
    Tasks, milestones, assigned engineers, deadlines & progress
    """
    __tablename__ = "mob_site_tasks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    task_code = Column(String(64), unique=True, nullable=False, index=True)
    task_name = Column(String(191), nullable=False)
    milestone_name = Column(String(191), nullable=False, default="Sub-Structure Casting")
    project_name = Column(String(191), nullable=False, index=True)
    assigned_to = Column(String(128), nullable=False, default="Engr. Tariqul Islam")
    deadline = Column(Date, nullable=False, index=True)
    progress_percentage = Column(Integer, nullable=False, default=0)
    priority = Column(String(32), nullable=False, default="HIGH", index=True) # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(32), nullable=False, default="IN_PROGRESS", index=True) # NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSiteMaterialReq(Base):
    """
    Material Requisition
    Cement, Steel/Rebar, Bricks, Sand, Aggregates
    """
    __tablename__ = "mob_site_material_reqs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    req_code = Column(String(64), unique=True, nullable=False, index=True)
    project_name = Column(String(191), nullable=False, index=True)
    material_name = Column(String(191), nullable=False)
    material_category = Column(String(64), nullable=False, default="CEMENT", index=True) # CEMENT, STEEL, BRICKS, SAND, AGGREGATE
    quantity = Column(Numeric(12, 2), nullable=False)
    unit = Column(String(32), nullable=False, default="Bags") # Bags, Tons, Pcs, Cft
    urgency = Column(String(32), nullable=False, default="NORMAL", index=True) # NORMAL, URGENT, CRITICAL
    required_by_date = Column(Date, nullable=False)
    status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, APPROVED, ISSUED, REJECTED
    requested_by = Column(String(128), nullable=False, default="Engr. Sajjad Hossain")

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSiteMaterialTx(Base):
    """
    Material Receiving & Issue (Store / Site Stock)
    Received materials, consumption and stock transfers
    """
    __tablename__ = "mob_site_material_tx"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tx_code = Column(String(64), unique=True, nullable=False, index=True)
    tx_type = Column(String(32), nullable=False, default="RECEIVED", index=True) # RECEIVED, ISSUED, TRANSFER
    project_name = Column(String(191), nullable=False, index=True)
    material_name = Column(String(191), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False)
    unit = Column(String(32), nullable=False, default="Bags")
    vendor_or_receiver = Column(String(191), nullable=True, default="Seven Rings Cement Ltd.")
    challan_number = Column(String(64), nullable=True)
    vehicle_number = Column(String(64), nullable=True)
    recorded_by = Column(String(128), nullable=False, default="Storekeeper Faruk")
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)


class MobileSitePhotoDoc(Base):
    """
    Site Photo Documentation
    Geotagged progress photos with timestamps & GPS coordinates
    """
    __tablename__ = "mob_site_photo_docs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    photo_code = Column(String(64), unique=True, nullable=False, index=True)
    project_name = Column(String(191), nullable=False, index=True)
    floor_or_location = Column(String(128), nullable=False, default="Roof Slab Casting - Tower Alpha")
    photo_url = Column(String(255), nullable=False)
    gps_latitude = Column(Numeric(10, 6), nullable=False, default=23.792500)
    gps_longitude = Column(Numeric(10, 6), nullable=False, default=90.407800)
    captured_by = Column(String(128), nullable=False, default="Engr. Sajjad Hossain")
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)


class MobileSiteQuality(Base):
    """
    Quality Control & Inspection
    Checklists, defects, corrective actions, cube tests and approvals
    """
    __tablename__ = "mob_site_quality"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    qc_code = Column(String(64), unique=True, nullable=False, index=True)
    project_name = Column(String(191), nullable=False, index=True)
    inspection_item = Column(String(191), nullable=False)
    inspection_category = Column(String(64), nullable=False, default="REBAR_CHECK") # CONCRETE_CUBE, REBAR_CHECK, SHUTTERING, BRICKWORK
    result = Column(String(32), nullable=False, default="PASS", index=True) # PASS, FAIL, CONDITIONAL
    defect_notes = Column(Text, nullable=True)
    corrective_action = Column(Text, nullable=True)
    inspected_by = Column(String(128), nullable=False, default="QC Engineer Rahim")
    status = Column(String(32), nullable=False, default="APPROVED", index=True) # PENDING, APPROVED, RE_INSPECT

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSiteContractor(Base):
    """
    Contractor Management
    Work progress, measurement records and bill verification
    """
    __tablename__ = "mob_site_contractors"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    record_code = Column(String(64), unique=True, nullable=False, index=True)
    project_name = Column(String(191), nullable=False, index=True)
    contractor_name = Column(String(191), nullable=False)
    trade_type = Column(String(64), nullable=False, default="Civil & Formwork") # Civil & Formwork, Plumbing, Electrical, Painting
    work_description = Column(String(255), nullable=False)
    measured_quantity = Column(Numeric(12, 2), nullable=False, default=1250.00)
    unit = Column(String(32), nullable=False, default="Sft")
    verified_bill_amount = Column(Numeric(14, 2), nullable=False, default=450000.00)
    verification_status = Column(String(32), nullable=False, default="VERIFIED", index=True) # PENDING, VERIFIED, REJECTED
    verified_by = Column(String(128), nullable=False, default="Project Manager")

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSiteSafety(Base):
    """
    Safety Management (HSE)
    Site incidents, safety inspections and corrective actions
    """
    __tablename__ = "mob_site_safety"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    incident_code = Column(String(64), unique=True, nullable=False, index=True)
    project_name = Column(String(191), nullable=False, index=True)
    incident_type = Column(String(64), nullable=False, default="PPE_VIOLATION") # PPE_VIOLATION, NEAR_MISS, FIRST_AID, SCAFFOLDING_HAZARD
    severity = Column(String(32), nullable=False, default="MEDIUM", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(Text, nullable=False)
    corrective_action = Column(Text, nullable=False)
    inspector_name = Column(String(128), nullable=False, default="HSE Officer Alam")
    status = Column(String(32), nullable=False, default="RESOLVED", index=True) # OPEN, INVESTIGATING, RESOLVED

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSiteOfflineSync(Base):
    """
    Offline Support & Sync
    Tracks cached mobile site records synced when connectivity returns
    """
    __tablename__ = "mob_site_offline_sync"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    sync_code = Column(String(64), unique=True, nullable=False, index=True)
    payload_type = Column(String(64), nullable=False, index=True) # DPR_ENTRY, PHOTO_UPLOAD, MATERIAL_TX
    device_id = Column(String(64), nullable=False, default="MOBILE-SM-G998B")
    synced_records_count = Column(Integer, nullable=False, default=1)
    status = Column(String(32), nullable=False, default="SYNCED", index=True) # PENDING, SYNCED, FAILED
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
