from sqlalchemy import Column, BigInteger, Integer, String, Date, Numeric, Boolean, Text, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Broker(Base):
    """
    Real Estate Broker & Channel Partner Profile (Module 22).
    """
    __tablename__ = "sls_brokers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    broker_code = Column(String(32), unique=True, nullable=False, index=True)
    agency_name = Column(String(128), nullable=False)
    contact_person = Column(String(128), nullable=False)
    phone_number = Column(String(32), nullable=False)
    nid_number = Column(String(32), nullable=True)
    tin_number = Column(String(32), nullable=True)
    commission_slab_percent = Column(Numeric(5, 2), nullable=False, default=2.00)
    bank_details = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    commissions = relationship("BrokerCommission", back_populates="broker", cascade="all, delete-orphan")


class BrokerCommission(Base):
    """
    Broker Commission Accrual and Staged Release Schedule (Module 22).
    Statutory Release Rules:
    - 40% on Down Payment cleared
    - 40% on Ground Slab casting milestone
    - 20% on Registration Deed execution
    - TDS Withheld under Section 53 of Bangladesh Income Tax Act (10%).
    """
    __tablename__ = "sls_broker_commissions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    broker_id = Column(BigInteger, ForeignKey("sls_brokers.id", ondelete="RESTRICT"), nullable=False, index=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    total_unit_value = Column(Numeric(14, 2), nullable=False)
    commission_percent = Column(Numeric(5, 2), nullable=False)
    total_commission_amount = Column(Numeric(14, 2), nullable=False)
    disbursed_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    tds_withheld_amount = Column(Numeric(14, 2), nullable=False, default=0.00) # Section 53 (10%)

    # Staged Tranches
    down_payment_disbursed = Column(Boolean, nullable=False, default=False) # 40%
    ground_slab_disbursed = Column(Boolean, nullable=False, default=False)  # 40%
    registration_deed_disbursed = Column(Boolean, nullable=False, default=False) # 20%

    # Status: 'CALCULATED', 'PARTIALLY_DISBURSED', 'FULLY_DISBURSED'
    status = Column(String(32), nullable=False, default="CALCULATED", index=True)
    disbursement_notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    broker = relationship("Broker", back_populates="commissions")
    booking = relationship("Booking")


class CourtCase(Base):
    """
    Legal Case & Court Litigation Tracking (Module 46).
    Types: Title Suit, Injunction, NI Act 138 (Cheque Bounce), Land Dispute.
    """
    __tablename__ = "leg_court_cases"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    
    case_type = Column(String(64), nullable=False, index=True) # Title Suit, Injunction, NI Act 138, Land Dispute
    case_number = Column(String(64), nullable=False, index=True)
    concerned_court = Column(String(128), nullable=False) # e.g., Joint District Judge 1st Court Dhaka
    plaintiff = Column(String(128), nullable=False)
    defendant = Column(String(128), nullable=False)
    appointed_advocate = Column(String(128), nullable=False)
    
    next_hearing_date = Column(Date, nullable=True)
    status = Column(String(32), nullable=False, default="HEARING_ONGOING", index=True) # FILED, HEARING_ONGOING, STAY_ORDER_GRANTED, DISPOSED, DECREE_FAVORABLE
    case_summary = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")


class MachineryAsset(Base):
    """
    Heavy Equipment & Plant Fleet Operations (Module 55).
    Categories: Tower Crane, Concrete Mixer, Material Hoist, Diesel Generator, Excavator, Batching Plant.
    """
    __tablename__ = "ast_machinery_assets"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_code = Column(String(32), unique=True, nullable=False, index=True)
    asset_name = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    current_assigned_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    
    hourly_rate = Column(Numeric(10, 2), nullable=False, default=1500.00)
    meter_reading_hours = Column(Numeric(10, 2), nullable=False, default=0.00)
    status = Column(String(32), nullable=False, default="OPERATIONAL", index=True) # OPERATIONAL, MAINTENANCE_REQUIRED, UNDER_REPAIR, IDLE_IN_YARD

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    current_project = relationship("Project")


class ImportBatch(Base):
    """
    Legacy Data Migration & Bulk Excel Import Batch (Modules 62, 72).
    Entities: Land, COA_Opening, Inventory, Installments.
    """
    __tablename__ = "mig_import_batches"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    entity_type = Column(String(64), nullable=False, index=True) # Land, COA_Opening, Inventory, Installments
    file_url = Column(String(256), nullable=False)
    total_records = Column(Integer, nullable=False, default=0)
    successful_records = Column(Integer, nullable=False, default=0)
    failed_records = Column(Integer, nullable=False, default=0)
    
    status = Column(String(32), nullable=False, default="COMPLETED", index=True) # PENDING, PROCESSING, COMPLETED, FAILED_ROLLED_BACK
    error_log = Column(Text, nullable=True)
    imported_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    imported_by = relationship("User")
