from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project
from app.modules.auth.models import User

class Lead(Base):
    """
    Omnichannel CRM Lead model capturing leads from Facebook Ads Webhook,
    WhatsApp, Website Inquiries, Brokers, and Walk-ins.
    """
    __tablename__ = "crm_leads"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, nullable=True, index=True)
    # Lead Source: FACEBOOK_ADS, WEB_FORM, WHATSAPP, WALK_IN, BROKER
    lead_source_id = Column(String(32), nullable=False, default="FACEBOOK_ADS", index=True)
    campaign_name = Column(String(128), nullable=True)
    lead_name = Column(String(191), nullable=False)
    primary_phone = Column(String(32), nullable=False, index=True)
    email = Column(String(128), nullable=True)
    interested_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    budget_range_min = Column(Numeric(14, 2), nullable=True)
    budget_range_max = Column(Numeric(14, 2), nullable=True)
    assigned_sales_rep_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Kanban Stage: NEW, CONTACTED, VISITED, NEGOTIATION, BOOKED, DROPPED
    lead_stage = Column(String(32), nullable=False, default="NEW", index=True)
    lead_score = Column(Integer, nullable=False, default=50) # 0 to 100 Lead Health
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    interested_project = relationship("Project")
    assigned_sales_rep = relationship("User")
    activities = relationship("LeadActivity", back_populates="lead", cascade="all, delete-orphan")


class LeadActivity(Base):
    """
    Call logs, site visit schedules, WhatsApp conversation notes, and follow-ups.
    """
    __tablename__ = "crm_lead_activities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    sales_rep_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    # Type: PHONE_CALL, SITE_VISIT, WHATSAPP, OFFICE_MEETING, STAGE_CHANGE
    activity_type = Column(String(32), nullable=False, default="PHONE_CALL")
    activity_summary = Column(String(255), nullable=False)
    scheduled_at = Column(TIMESTAMP, nullable=True)
    completed_at = Column(TIMESTAMP, nullable=True)
    outcome = Column(String(64), nullable=True) # INTERESTED, BUSY, RESCHEDULED, VISITED_POSITIVE

    created_at = Column(TIMESTAMP, server_default=func.now())

    lead = relationship("Lead", back_populates="activities")


class Customer(Base):
    """
    Verified Customer profile with statutory KYC under Bangladesh Real Estate Act & Anti-Money Laundering (AML).
    """
    __tablename__ = "crm_customers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    customer_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'CUST-2026-0041'
    full_name_en = Column(String(191), nullable=False)
    full_name_bn = Column(String(191), nullable=True)
    father_husband_name = Column(String(191), nullable=True)
    mother_name = Column(String(191), nullable=True)
    nid_number = Column(String(64), unique=True, nullable=True, index=True)
    tin_number = Column(String(64), nullable=True)
    primary_phone = Column(String(32), nullable=False, index=True)
    email = Column(String(128), nullable=True)
    present_address = Column(Text, nullable=True)
    permanent_address = Column(Text, nullable=True)
    is_nrb = Column(Boolean, nullable=False, default=False, index=True) # Non-Resident Bangladeshi
    passport_number = Column(String(64), nullable=True)
    
    # Document Scans
    profile_photo_url = Column(String(255), nullable=True)
    nid_scan_front_url = Column(String(255), nullable=True)
    nid_scan_back_url = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    nominees = relationship("Nominee", back_populates="customer", cascade="all, delete-orphan")


class Nominee(Base):
    """
    Nominee details registered for property inheritance & allotment under statutory deeds.
    """
    __tablename__ = "crm_nominees"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="CASCADE"), nullable=False, index=True)
    nominee_name = Column(String(191), nullable=False)
    relation_type = Column("relation_type", String(64), nullable=False) # SPOUSE, SON, DAUGHTER, FATHER, MOTHER
    nid_number = Column(String(64), nullable=True)
    share_percentage = Column(Numeric(5, 2), nullable=False, default=100.00) # e.g. 50.00%
    photo_url = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    customer = relationship("Customer", back_populates="nominees")
