from sqlalchemy import Column, BigInteger, String, Date, Numeric, Boolean, Text, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class HandoverInspection(Base):
    """
    Unit Handover & Key Possession Inspection Record.
    Possession Letter is legally unlocked ONLY when all financial dues are 100% cleared.
    """
    __tablename__ = "hnd_handover_inspections"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    site_engineer_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False)
    
    inspection_date = Column(Date, nullable=False, default=func.current_date())
    all_financial_dues_cleared = Column(Boolean, nullable=False, default=False)
    
    possession_letter_number = Column(String(64), unique=True, nullable=True, index=True)
    possession_handover_date = Column(Date, nullable=True)
    
    # Status: 'INSPECTION_PENDING', 'SNAGS_REPORTED', 'SNAGS_RECTIFIED', 'POSSESSION_HANDED_OVER'
    status = Column(String(32), nullable=False, default="INSPECTION_PENDING", index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    booking = relationship("Booking")
    unit = relationship("Unit")
    site_engineer = relationship("User")


class DLPTicket(Base):
    """
    Defect Liability Period (DLP) 12-Month Warranty Snagging & Service Tickets.
    Categories: Plumbing, Electrical, Tiles, Paint, Doors, Waterproofing.
    """
    __tablename__ = "hnd_dlp_tickets"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    ticket_category = Column(String(64), nullable=False) # Plumbing, Electrical, Tiles, Paint, Doors, Waterproofing
    issue_description = Column(Text, nullable=False)
    reported_date = Column(Date, nullable=False, default=func.current_date())
    rectification_deadline = Column(Date, nullable=False)
    
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
    Commercial & Residential Rental Lease Agreements.
    Escalation rate, security deposit and validity periods.
    """
    __tablename__ = "rnt_lease_agreements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    tenant_name = Column(String(128), nullable=False)
    tenant_nid = Column(String(32), nullable=False)
    tenant_phone = Column(String(32), nullable=True)
    
    lease_start_date = Column(Date, nullable=False)
    lease_expiry_date = Column(Date, nullable=False)
    monthly_rent_bdt = Column(Numeric(12, 2), nullable=False)
    security_deposit_bdt = Column(Numeric(12, 2), nullable=False)
    rent_escalation_percent = Column(Numeric(5, 2), nullable=False, default=10.00)
    
    status = Column(String(32), nullable=False, default="ACTIVE") # ACTIVE, EXPIRED, TERMINATED

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    unit = relationship("Unit")
