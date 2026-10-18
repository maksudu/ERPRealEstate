from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project
from app.modules.auth.models import User


class Lead(Base):
    """
    Omnichannel CRM Lead model (Spec 4.2) capturing leads from Website, Facebook Ads,
    WhatsApp, Phone, Walk-in, Broker, Referral, Exhibition, Email, Campaigns, and Manual entry.
    Original source is always preserved even when ownership changes (Spec 4.2).
    """
    __tablename__ = "crm_leads"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, nullable=True, index=True)
    lead_code = Column(String(32), unique=True, nullable=True, index=True)  # e.g. LEAD-2026-00001

    # --- 4.2 Source & Attribution ---
    lead_source_id = Column(String(32), nullable=False, default="MANUAL_ENTRY", index=True)
    original_source_id = Column(String(32), nullable=True, index=True)  # preserved forever
    campaign_name = Column(String(128), nullable=True, index=True)
    campaign_id = Column(BigInteger, nullable=True, index=True)
    utm_source = Column(String(64), nullable=True)
    utm_medium = Column(String(64), nullable=True)
    utm_campaign = Column(String(128), nullable=True)
    referrer_broker_id = Column(BigInteger, nullable=True, index=True)
    referral_customer_id = Column(BigInteger, nullable=True, index=True)

    # --- Contact Fields ---
    lead_name = Column(String(191), nullable=False)
    primary_phone = Column(String(32), nullable=False, index=True)
    email = Column(String(128), nullable=True)
    preferred_contact_method = Column(String(32), nullable=True, default="PHONE")

    # Consent & Opt-out (Spec 4.2)
    is_consent_given = Column(Boolean, nullable=False, default=True)
    is_opted_out = Column(Boolean, nullable=False, default=False, index=True)
    opt_out_at = Column(TIMESTAMP, nullable=True)
    opt_out_reason = Column(String(191), nullable=True)

    # --- 4.2 Requirement Fields ---
    interested_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    property_type = Column(String(32), nullable=True)
    preferred_location = Column(String(191), nullable=True)
    required_area_sqft = Column(Numeric(12, 2), nullable=True)
    bedrooms = Column(Integer, nullable=True)
    expected_purchase_date = Column(Date, nullable=True)
    budget_range_min = Column(Numeric(14, 2), nullable=True)
    budget_range_max = Column(Numeric(14, 2), nullable=True)

    # --- 4.3 Assignment ---
    assigned_sales_rep_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)
    priority = Column(String(16), nullable=False, default="MEDIUM", index=True)
    first_response_deadline = Column(TIMESTAMP, nullable=True)
    first_contacted_at = Column(TIMESTAMP, nullable=True)
    assignment_method = Column(String(32), nullable=True)

    # --- Pipeline ---
    lead_stage = Column(String(32), nullable=False, default="NEW", index=True)
    lead_score = Column(Integer, nullable=False, default=50)
    lost_reason = Column(String(64), nullable=True)
    is_duplicate = Column(Boolean, nullable=False, default=False)
    duplicate_of_lead_id = Column(BigInteger, nullable=True)
    notes = Column(Text, nullable=True)

    # --- 4.4 Qualification & Scoring ---
    # Health grade (dynamic lookup CRM_LEAD_HEALTH): HOT, WARM, COLD, UNQUALIFIED, NURTURE
    health_grade = Column(String(16), nullable=True, index=True)
    # Manual override score (0-100) set by authorized staff; null = system-computed
    manual_score_override = Column(Integer, nullable=True)
    # Editable qualification reasons (comma-separated or free text)
    qualification_reasons = Column(Text, nullable=True)
    # Qualification flags
    financing_ready = Column(Boolean, nullable=True)  # null = not provided
    decision_maker_available = Column(Boolean, nullable=True)  # null = not provided
    # Timestamp of last score computation
    last_scored_at = Column(TIMESTAMP, nullable=True)
    # Who last manually qualified/overrode
    qualified_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    qualified_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    interested_project = relationship("Project")
    assigned_sales_rep = relationship("User", foreign_keys=[assigned_sales_rep_id])
    qualified_by = relationship("User", foreign_keys=[qualified_by_id])
    activities = relationship("LeadActivity", back_populates="lead", cascade="all, delete-orphan")
    assignments = relationship("LeadAssignment", back_populates="lead", cascade="all, delete-orphan", foreign_keys="LeadAssignment.lead_id")
    qualifications = relationship("LeadQualification", back_populates="lead", cascade="all, delete-orphan")


class LeadQualification(Base):
    """
    Score history & qualification audit trail (Spec 4.4).
    Each row is one scoring event (system or manual) with full breakdown and reasons.
    Score assists sales; never auto-rejects. Reasons visible & editable by authorized staff.
    """
    __tablename__ = "crm_lead_qualifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    total_score = Column(Integer, nullable=False, default=0)
    # Grade (dynamic lookup CRM_LEAD_HEALTH): HOT, WARM, COLD, UNQUALIFIED, NURTURE
    health_grade = Column(String(16), nullable=False, index=True)
    # Sub-scores (each out of max points)
    budget_fit_score = Column(Integer, nullable=False, default=0)
    contact_completeness_score = Column(Integer, nullable=False, default=0)
    source_quality_score = Column(Integer, nullable=False, default=0)
    engagement_progression_score = Column(Integer, nullable=False, default=0)
    timeline_fit_score = Column(Integer, nullable=False, default=0)  # expected purchase timeline
    financing_score = Column(Integer, nullable=False, default=0)  # financing readiness
    # Qualification reasons (comma-separated or free text)
    qualification_reasons = Column(Text, nullable=True)
    recommended_action = Column(String(255), nullable=True)
    # COMPLETED_MEETING, SITE_VISIT, DECISION_MAKER etc. engagement flags as JSON
    engagement_flags = Column(Text, nullable=True)
    # MANUAL = authorized staff override; SYSTEM = auto-computed
    computed_by = Column(String(16), nullable=False, default="SYSTEM")  # SYSTEM, MANUAL
    computed_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    computed_at = Column(TIMESTAMP, server_default=func.now(), index=True)

    lead = relationship("Lead", back_populates="qualifications")
    computed_by_user = relationship("User", foreign_keys=[computed_by_id])


class LeadAssignment(Base):
    """
    Complete assignment history for a lead (Spec 4.3). Preserves previous owners.
    """
    __tablename__ = "crm_lead_assignments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    previous_rep_id = Column(BigInteger, nullable=True)
    assignment_method = Column(String(32), nullable=False, default="MANUAL")
    assignment_reason = Column(String(255), nullable=True)
    response_sla_hours = Column(Integer, nullable=True, default=24)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    escalated_at = Column(TIMESTAMP, nullable=True)
    escalation_reason = Column(String(191), nullable=True)
    assigned_at = Column(TIMESTAMP, server_default=func.now())
    released_at = Column(TIMESTAMP, nullable=True)

    lead = relationship("Lead", back_populates="assignments", foreign_keys=[lead_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])


class LeadAssignmentRule(Base):
    """
    Configurable automatic lead distribution rules (Spec 4.3).
    """
    __tablename__ = "crm_lead_assignment_rules"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    rule_name = Column(String(128), nullable=False)
    method = Column(String(32), nullable=False, default="ROUND_ROBIN")
    priority_order = Column(Integer, nullable=False, default=0)
    conditions = Column(Text, nullable=True)
    target_sales_rep_ids = Column(Text, nullable=True)
    sla_hours = Column(Integer, nullable=False, default=24)
    escalate_to_manager_id = Column(BigInteger, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class LeadImportBatch(Base):
    """
    Import history for Excel/CSV lead uploads (Spec 4.2).
    """
    __tablename__ = "crm_lead_import_batches"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    source_channel = Column(String(32), nullable=True, default="MANUAL_ENTRY")
    total_rows = Column(Integer, nullable=False, default=0)
    success_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    duplicate_count = Column(Integer, nullable=False, default=0)
    error_log = Column(Text, nullable=True)
    imported_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    imported_at = Column(TIMESTAMP, server_default=func.now())


class LeadActivity(Base):
    """
    Call logs, site visit schedules, WhatsApp conversation notes, and follow-ups.
    """
    __tablename__ = "crm_lead_activities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    sales_rep_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    activity_type = Column(String(32), nullable=False, default="PHONE_CALL")
    activity_summary = Column(String(255), nullable=False)
    scheduled_at = Column(TIMESTAMP, nullable=True)
    completed_at = Column(TIMESTAMP, nullable=True)
    outcome = Column(String(64), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    lead = relationship("Lead", back_populates="activities")


class Customer(Base):
    """
    Unified customer profile (Spec 4.5) linked to multiple inquiries, projects,
    bookings, and transactions. KYC under Bangladesh Real Estate Act & AML.
    """
    __tablename__ = "crm_customers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    customer_code = Column(String(64), unique=True, nullable=False, index=True)
    full_name_en = Column(String(191), nullable=False)
    full_name_bn = Column(String(191), nullable=True)
    father_husband_name = Column(String(191), nullable=True)
    mother_name = Column(String(191), nullable=True)
    nid_number = Column(String(64), unique=True, nullable=True, index=True)
    tin_number = Column(String(64), nullable=True)
    primary_phone = Column(String(32), nullable=False, index=True)
    secondary_phone = Column(String(32), nullable=True)
    email = Column(String(128), nullable=True)
    present_address = Column(Text, nullable=True)
    permanent_address = Column(Text, nullable=True)
    is_nrb = Column(Boolean, nullable=False, default=False, index=True)
    passport_number = Column(String(64), nullable=True)

    # --- 4.5 Profile enrichment ---
    # Customer type (dynamic lookup CRM_CUSTOMER_TYPE): INDIVIDUAL, COMPANY, INVESTOR, OTHER
    customer_type = Column(String(32), nullable=True, default="INDIVIDUAL", index=True)
    # Preferred communication language (dynamic lookup CRM_LANGUAGE): BANGLA, ENGLISH
    preferred_language = Column(String(16), nullable=True, default="BANGLA")
    # Preferred contact method (dynamic lookup CRM_CONTACT_METHOD): PHONE, EMAIL, WHATSAPP
    preferred_contact_method = Column(String(32), nullable=True, default="PHONE")
    # Relationship manager (sales rep / account manager)
    relationship_manager_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)
    # Consent & communication preferences (Spec 4.5)
    is_consent_given = Column(Boolean, nullable=False, default=True)
    is_opted_out = Column(Boolean, nullable=False, default=False, index=True)
    opt_out_at = Column(TIMESTAMP, nullable=True)
    opt_out_reason = Column(String(191), nullable=True)

    profile_photo_url = Column(String(255), nullable=True)
    nid_scan_front_url = Column(String(255), nullable=True)
    nid_scan_back_url = Column(String(255), nullable=True)

    # Merge audit (Spec 4.5 duplicate merge)
    merged_into_id = Column(BigInteger, nullable=True)  # if this record was merged into another
    merged_at = Column(TIMESTAMP, nullable=True)
    merged_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    relationship_manager = relationship("User", foreign_keys=[relationship_manager_id])
    nominees = relationship("Nominee", back_populates="customer", cascade="all, delete-orphan")
    service_requests = relationship("CustomerServiceRequest", back_populates="customer", cascade="all, delete-orphan")


class Nominee(Base):
    """
    Nominee details (Spec 4.5) for property inheritance & allotment under statutory deeds.
    Collected only for defined business/contractual purpose; restricted access.
    NOT proof of legal ownership — legally required nomination docs are separate.
    """
    __tablename__ = "crm_nominees"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="CASCADE"), nullable=False, index=True)
    nominee_name = Column(String(191), nullable=False)
    relation_type = Column("relation_type", String(64), nullable=False)
    nid_number = Column(String(64), nullable=True)
    share_percentage = Column(Numeric(5, 2), nullable=False, default=100.00)
    photo_url = Column(String(255), nullable=True)

    # --- 4.5 Nominee enrichment ---
    phone = Column(String(32), nullable=True)
    email = Column(String(128), nullable=True)
    address = Column(Text, nullable=True)
    nid_front_url = Column(String(255), nullable=True)
    nid_back_url = Column(String(255), nullable=True)
    # Effective dates
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    # Verification (dynamic lookup CRM_NOMINEE_VERIFICATION): PENDING, VERIFIED, REJECTED
    verification_status = Column(String(16), nullable=True, default="PENDING", index=True)
    verified_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(TIMESTAMP, nullable=True)
    notes = Column(Text, nullable=True)
    # Change history tracking
    previous_share_percentage = Column(Numeric(5, 2), nullable=True)
    share_changed_at = Column(TIMESTAMP, nullable=True)
    share_changed_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", back_populates="nominees")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    share_changed_by = relationship("User", foreign_keys=[share_changed_by_id])


class CustomerServiceRequest(Base):
    """
    Customer service requests & complaints (Spec 4.5).
    Tracks post-sale and pre-sale service issues linked to the unified customer profile.
    """
    __tablename__ = "crm_customer_service_requests"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="CASCADE"), nullable=False, index=True)
    # SERVICE = general service request; COMPLAINT = formal complaint
    request_type = Column(String(16), nullable=False, default="SERVICE", index=True)
    title = Column(String(191), nullable=False)
    description = Column(Text, nullable=True)
    # Status (dynamic lookup CRM_SERVICE_STATUS): OPEN, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED
    status = Column(String(32), nullable=False, default="OPEN", index=True)
    # Priority (dynamic lookup CRM_SERVICE_PRIORITY): LOW, MEDIUM, HIGH, URGENT
    priority = Column(String(16), nullable=True, default="MEDIUM")
    assigned_to_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    # Resolution
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(TIMESTAMP, nullable=True)
    # Related booking / unit if any
    related_booking_id = Column(BigInteger, nullable=True)
    related_unit_id = Column(BigInteger, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", back_populates="service_requests")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
