from sqlalchemy import Column, BigInteger, Integer, String, Date, Numeric, Boolean, Text, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class HandoverInspection(Base):
    """
    Unit Handover & Key Possession Inspection Record.
    Possession Letter & Key Handover Certificate is legally unlocked ONLY when all financial dues are 100% cleared.
    """
    __tablename__ = "hnd_handover_inspections"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    site_engineer_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False)
    
    inspection_date = Column(Date, nullable=False, default=func.current_date())
    all_financial_dues_cleared = Column(Boolean, nullable=False, default=False)
    
    # Possession and Key Handover Documentation
    possession_letter_number = Column(String(64), unique=True, nullable=True, index=True)
    key_handover_certificate_number = Column(String(64), unique=True, nullable=True, index=True)
    key_sets_count = Column(Integer, nullable=False, default=3) # e.g. 3 complete sets of keys
    possession_handover_date = Column(Date, nullable=True)

    # Joint Inspection Sign-off
    joint_customer_signoff = Column(Boolean, nullable=False, default=False)
    customer_signoff_date = Column(Date, nullable=True)

    # 12-Month DLP Automated Warranty
    warranty_start_date = Column(Date, nullable=True)
    warranty_end_date = Column(Date, nullable=True) # Automatically 365 days from handover
    
    # Status: 'INSPECTION_PENDING', 'SNAGS_REPORTED', 'SNAGS_RECTIFIED', 'POSSESSION_HANDED_OVER'
    status = Column(String(32), nullable=False, default="INSPECTION_PENDING", index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    booking = relationship("Booking")
    unit = relationship("Unit")
    site_engineer = relationship("User", foreign_keys=[site_engineer_id])
    snag_items = relationship("SnagItem", back_populates="inspection", cascade="all, delete-orphan")


class SnagItem(Base):
    """
    Digital Snag List for Joint Pre-Possession Inspection.
    Category (Civil, Paint, Plumbing, Electrical, Joinery, Waterproofing), Location, Photo, Assigned Contractor, Fix Status.
    """
    __tablename__ = "hnd_snag_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    inspection_id = Column(BigInteger, ForeignKey("hnd_handover_inspections.id", ondelete="CASCADE"), nullable=True, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    snag_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. SNG-2026-0001
    category = Column(String(64), nullable=False, index=True) # Civil, Paint, Plumbing, Electrical, Joinery, Waterproofing, Sanitary
    location = Column(String(128), nullable=False) # Master Bed, Kitchen, Bath 1, Balcony, Living Room
    defect_description = Column(Text, nullable=False)
    photo_attachment_url = Column(String(500), nullable=True) # Site photo evidence
    
    severity = Column(String(32), nullable=False, default="MEDIUM") # CRITICAL, HIGH, MEDIUM, LOW
    contractor_name = Column(String(128), nullable=True) # Assigned Subcontractor / Trade Team
    target_fix_date = Column(Date, nullable=True)
    
    # Status: 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'FIXED', 'VERIFIED_CLOSED'
    status = Column(String(32), nullable=False, default="OPEN", index=True)
    fix_date = Column(Date, nullable=True)
    
    verified_by_engineer_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    customer_accepted = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    inspection = relationship("HandoverInspection", back_populates="snag_items")
    unit = relationship("Unit")
    verified_by = relationship("User", foreign_keys=[verified_by_engineer_id])


class DLPTicket(Base):
    """
    Defect Liability Period (DLP) 12-Month Automated Warranty Tickets.
    Structural, Plumbing, Electrical, Waterproofing Defects with SLA Resolution Timers.
    """
    __tablename__ = "hnd_dlp_tickets"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    ticket_code = Column(String(64), unique=True, nullable=True, index=True) # e.g. DLP-2026-0001
    ticket_category = Column(String(64), nullable=False, index=True) # Structural, Plumbing, Electrical, Tiles, Paint, Waterproofing
    defect_severity = Column(String(32), nullable=False, default="MEDIUM") # CRITICAL (24h), HIGH (48h), MEDIUM (72h), LOW (120h)
    issue_description = Column(Text, nullable=False)
    
    reported_date = Column(Date, nullable=False, default=func.current_date())
    rectification_deadline = Column(Date, nullable=False)
    sla_hours = Column(Integer, nullable=False, default=72)
    # SLA Breach Status: 'WITHIN_SLA', 'SLA_BREACHED', 'RESOLVED_ON_TIME'
    sla_breach_status = Column(String(32), nullable=False, default="WITHIN_SLA")
    
    # Warranty validity check (12 months from possession)
    warranty_valid_until = Column(Date, nullable=True)
    is_under_warranty = Column(Boolean, nullable=False, default=True)

    assigned_technician = Column(String(128), nullable=True)
    resolution_cost_bdt = Column(Numeric(12, 2), nullable=False, default=0.00)
    borne_by = Column(String(32), nullable=False, default="DEVELOPER_WARRANTY") # DEVELOPER_WARRANTY, CONTRACTOR_RETENTION, CLIENT_CHARGEABLE
    
    # Status: 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    status = Column(String(32), nullable=False, default="OPEN", index=True)
    rectified_date = Column(Date, nullable=True)
    rectification_notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    unit = relationship("Unit")


class OwnersAssociation(Base):
    """
    Building Owners Association / Flat Owners Welfare Committee (ফ্ল্যাট মালিক কল্যাণ সমিতি).
    Manages sinking fund transfer, common facility handover & monthly service charges.
    """
    __tablename__ = "hnd_owners_associations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    association_name = Column(String(128), nullable=False)
    handover_date = Column(Date, nullable=False)
    sinking_fund_transferred_bdt = Column(Numeric(14, 2), nullable=False, default=0.00)
    monthly_service_charge_per_flat = Column(Numeric(10, 2), nullable=False, default=0.00)
    
    president_name = Column(String(100), nullable=True)
    secretary_name = Column(String(100), nullable=True)
    contact_phone = Column(String(32), nullable=True)
    status = Column(String(32), nullable=False, default="FORMED")

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")


class LeaseAgreement(Base):
    """
    Commercial Space & Shop Rental / Lease Engine.
    Tenant Profile, Lease Terms, Security Deposit Tracking, CAM & Sub-Meter Billing.
    """
    __tablename__ = "rnt_lease_agreements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    lease_reference_no = Column(String(64), unique=True, nullable=True, index=True) # e.g. LSE-2026-001
    
    # Tenant Profile
    tenant_name = Column(String(128), nullable=False)
    tenant_company_name = Column(String(191), nullable=True)
    trade_license_number = Column(String(64), nullable=True)
    tin_bin_number = Column(String(64), nullable=True)
    tenant_nid = Column(String(32), nullable=False)
    tenant_phone = Column(String(32), nullable=True)
    tenant_email = Column(String(128), nullable=True)
    emergency_contact_phone = Column(String(32), nullable=True)
    
    # Commercial Space & Lease Terms
    commercial_space_type = Column(String(64), nullable=False, default="RETAIL_SHOP") # RETAIL_SHOP, OFFICE_SPACE, RESTAURANT, BANK_BOOTH, SHOWROOM
    floor_area_sqft = Column(Numeric(10, 2), nullable=False, default=500.00)
    rent_per_sqft_bdt = Column(Numeric(10, 2), nullable=False, default=90.00)
    monthly_rent_bdt = Column(Numeric(12, 2), nullable=False)
    cam_rate_per_sqft_bdt = Column(Numeric(10, 2), nullable=False, default=15.00)
    
    fitout_grace_period_days = Column(Integer, nullable=False, default=30)
    lease_start_date = Column(Date, nullable=False)
    lease_expiry_date = Column(Date, nullable=False)
    
    # Security Deposit Tracking
    security_deposit_bdt = Column(Numeric(12, 2), nullable=False)
    security_deposit_status = Column(String(32), nullable=False, default="RECEIVED") # PENDING, PARTIALLY_RECEIVED, RECEIVED, REFUNDED
    
    rent_escalation_percent = Column(Numeric(5, 2), nullable=False, default=10.00)
    escalation_frequency_months = Column(Integer, nullable=False, default=12)
    
    # Status: 'ACTIVE', 'PENDING_HANDOVER', 'EXPIRED', 'TERMINATED'
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    unit = relationship("Unit")
    cam_bills = relationship("CAMBill", back_populates="lease", cascade="all, delete-orphan")
    meter_readings = relationship("UtilitySubMeterReading", back_populates="lease", cascade="all, delete-orphan")


class CAMBill(Base):
    """
    Monthly Common Area Maintenance (CAM) Service Charge Billing.
    Billing based on space area, generator backup, sinking fund contribution, and common utilities.
    """
    __tablename__ = "rnt_cam_bills"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    bill_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. CAM-2026-10-001
    lease_id = Column(BigInteger, ForeignKey("rnt_lease_agreements.id", ondelete="CASCADE"), nullable=False, index=True)
    
    bill_month = Column(String(16), nullable=False, index=True) # e.g. "2026-10"
    billing_date = Column(Date, nullable=False, default=func.current_date())
    due_date = Column(Date, nullable=False)
    
    area_sqft = Column(Numeric(10, 2), nullable=False)
    cam_rate_per_sqft = Column(Numeric(10, 2), nullable=False)
    cam_amount = Column(Numeric(12, 2), nullable=False)
    sinking_fund_charge = Column(Numeric(12, 2), nullable=False, default=0.00)
    generator_backup_charge = Column(Numeric(12, 2), nullable=False, default=0.00)
    common_electricity_water = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_bill_amount = Column(Numeric(12, 2), nullable=False)
    
    paid_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    payment_status = Column(String(32), nullable=False, default="UNPAID", index=True) # UNPAID, PARTIALLY_PAID, PAID, OVERDUE
    paid_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    lease = relationship("LeaseAgreement", back_populates="cam_bills")


class UtilitySubMeterReading(Base):
    """
    Commercial Space & Shop Utility Sub-Meter Readings.
    Supports Electricity, Water, Gas, and HVAC BTU Sub-Meters with automatic consumption computation.
    """
    __tablename__ = "rnt_utility_submeter_readings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lease_id = Column(BigInteger, ForeignKey("rnt_lease_agreements.id", ondelete="CASCADE"), nullable=False, index=True)
    
    meter_number = Column(String(64), nullable=False, index=True) # e.g. DESCO-SUB-0402, WASA-SUB-102
    meter_type = Column(String(32), nullable=False, default="ELECTRICITY", index=True) # ELECTRICITY, WATER, GAS, HVAC_BTU
    reading_date = Column(Date, nullable=False, default=func.current_date())
    
    previous_reading = Column(Numeric(12, 2), nullable=False, default=0.00)
    current_reading = Column(Numeric(12, 2), nullable=False)
    units_consumed = Column(Numeric(12, 2), nullable=False) # (current - previous)
    tariff_rate_per_unit = Column(Numeric(8, 2), nullable=False) # e.g. BDT 14.50 / kWh
    subtotal_amount = Column(Numeric(12, 2), nullable=False)
    vat_rate_percent = Column(Numeric(5, 2), nullable=False, default=5.00)
    total_utility_amount = Column(Numeric(12, 2), nullable=False)
    
    billing_status = Column(String(32), nullable=False, default="UNBILLED", index=True) # UNBILLED, BILLED, PAID
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    lease = relationship("LeaseAgreement", back_populates="meter_readings")
