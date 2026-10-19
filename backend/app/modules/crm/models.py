from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project
from app.modules.auth.models import User
from app.modules.inventory.models import Unit


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
    Call, meeting and site-visit scheduling (Spec 4.7).
    Activity calendar for sales interactions, appointments, and site inspections.
    """
    __tablename__ = "crm_lead_activities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    activity_code = Column(String(64), unique=True, nullable=True, index=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=True, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)
    sales_rep_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)

    activity_type = Column(String(64), nullable=False, default="FOLLOW_UP_CALL", index=True)
    title = Column(String(191), nullable=True)
    activity_summary = Column(String(255), nullable=False)
    scheduled_at = Column(TIMESTAMP, nullable=True)
    scheduled_start = Column(TIMESTAMP, nullable=True, index=True)
    scheduled_end = Column(TIMESTAMP, nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=30)
    meeting_location = Column(String(255), nullable=True)
    agenda = Column(Text, nullable=True)

    status = Column(String(32), nullable=False, default="PLANNED", index=True)
    attendance_status = Column(String(32), nullable=True, default="PENDING")
    completed_at = Column(TIMESTAMP, nullable=True)
    outcome = Column(String(255), nullable=True)
    shortlisted_units_json = Column(Text, nullable=True)
    next_action = Column(String(255), nullable=True)
    next_follow_up_date = Column(Date, nullable=True)
    reminder_minutes_before = Column(Integer, nullable=True, default=30)
    is_reminder_sent = Column(Boolean, nullable=False, default=False)
    escalation_level = Column(Integer, nullable=False, default=0)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    lead = relationship("Lead", back_populates="activities")
    customer = relationship("Customer")
    project = relationship("Project", foreign_keys=[project_id])
    unit = relationship("Unit", foreign_keys=[unit_id])
    sales_rep = relationship("User", foreign_keys=[sales_rep_id])


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
    requirements = relationship("CustomerRequirement", back_populates="customer", cascade="all, delete-orphan")


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


# =====================================================================
# Spec 4.6: Customer Requirements & Budget Tracking
# =====================================================================

class CustomerRequirement(Base):
    """
    Customer requirements & budget tracking (Spec 4.6).
    Captures property preferences, budget boundaries, and desired specifications.
    Supports multiple requirement profiles per customer.
    Keeps requirements separate from confirmed contractual terms.
    """
    __tablename__ = "crm_customer_requirements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    requirement_code = Column(String(64), unique=True, nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(191), nullable=False)

    # Preferences & Parameters
    preferred_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    preferred_location = Column(String(191), nullable=True)
    property_type = Column(String(64), nullable=True, default="APARTMENT", index=True)  # CRM_PROPERTY_TYPE lookup
    budget_min_bdt = Column(Numeric(16, 2), nullable=True)
    budget_max_bdt = Column(Numeric(16, 2), nullable=True)
    area_min_sqft = Column(Numeric(10, 2), nullable=True)
    area_max_sqft = Column(Numeric(10, 2), nullable=True)
    bedrooms = Column(Integer, nullable=True, default=3)
    bathrooms = Column(Integer, nullable=True, default=3)
    preferred_floor = Column(String(64), nullable=True, default="MID_FLOOR")  # CRM_PREFERRED_FLOOR lookup
    preferred_facing = Column(String(64), nullable=True, default="SOUTH_FACING")  # CRM_FACING lookup
    parking_required = Column(Boolean, nullable=False, default=True)
    parking_count = Column(Integer, nullable=False, default=1)
    purchase_timeline = Column(String(64), nullable=True, default="WITHIN_6_MONTHS")  # CRM_PURCHASE_TIMELINE lookup
    payment_preference = Column(String(64), nullable=True, default="INSTALLMENTS")  # CRM_PAYMENT_PREFERENCE lookup
    amenities_required = Column(Text, nullable=True)
    special_notes = Column(Text, nullable=True)

    # Status & Assignment
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)  # CRM_REQUIREMENT_STATUS: ACTIVE, MATCHED, FULFILLED, ON_HOLD, CLOSED
    assigned_sales_rep_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    matched_units_count = Column(Integer, nullable=False, default=0)
    last_matched_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", back_populates="requirements")
    preferred_project = relationship("Project", foreign_keys=[preferred_project_id])
    assigned_sales_rep = relationship("User", foreign_keys=[assigned_sales_rep_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    recommendations = relationship("InventoryRecommendation", back_populates="requirement", cascade="all, delete-orphan")
    audit_logs = relationship("RequirementAuditLog", back_populates="requirement", cascade="all, delete-orphan")
    alerts = relationship("InventoryAlert", back_populates="requirement", cascade="all, delete-orphan")


class RequirementAuditLog(Base):
    """
    Tracks changes in budget, area, floor, or preferences for customer requirements (Spec 4.6).
    """
    __tablename__ = "crm_requirement_audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    requirement_id = Column(BigInteger, ForeignKey("crm_customer_requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    change_summary = Column(String(255), nullable=False)
    old_values_json = Column(Text, nullable=True)
    new_values_json = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    requirement = relationship("CustomerRequirement", back_populates="audit_logs")
    changed_by = relationship("User", foreign_keys=[changed_by_id])


class InventoryRecommendation(Base):
    """
    Unit recommendations against customer requirements with match score & rejection tracking (Spec 4.6).
    """
    __tablename__ = "crm_inventory_recommendations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    requirement_id = Column(BigInteger, ForeignKey("crm_customer_requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="CASCADE"), nullable=False, index=True)
    match_score_percentage = Column(Numeric(5, 2), nullable=False, default=85.00)
    match_details_json = Column(Text, nullable=True)
    # Status: RECOMMENDED, SHORTLISTED, SITE_VISITED, ACCEPTED, REJECTED
    status = Column(String(32), nullable=False, default="RECOMMENDED", index=True)
    # Rejection reason from dynamic lookup CRM_REJECTION_REASON
    rejection_reason = Column(String(255), nullable=True)
    rejection_notes = Column(Text, nullable=True)
    recommended_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    recommended_at = Column(TIMESTAMP, server_default=func.now())
    feedback_at = Column(TIMESTAMP, nullable=True)

    requirement = relationship("CustomerRequirement", back_populates="recommendations")
    unit = relationship("Unit", foreign_keys=[unit_id])
    recommended_by = relationship("User", foreign_keys=[recommended_by_id])


class InventoryAlert(Base):
    """
    Alerts sales representatives when matching inventory becomes available (Spec 4.6).
    """
    __tablename__ = "crm_inventory_alerts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    requirement_id = Column(BigInteger, ForeignKey("crm_customer_requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="CASCADE"), nullable=False, index=True)
    sales_rep_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)
    alert_title = Column(String(191), nullable=False)
    alert_message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)

    requirement = relationship("CustomerRequirement", back_populates="alerts")
    unit = relationship("Unit", foreign_keys=[unit_id])
    sales_rep = relationship("User", foreign_keys=[sales_rep_id])


# =====================================================================
# Spec 4.8: Follow-up Tasks and Reminders
# =====================================================================

class FollowUpTask(Base):
    """
    Follow-up tasks, daily salesperson to-do lists, and escalation tracking (Spec 4.8).
    """
    __tablename__ = "crm_follow_up_tasks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    task_code = Column(String(64), unique=True, nullable=False, index=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=True, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="CASCADE"), nullable=True, index=True)
    activity_id = Column(BigInteger, ForeignKey("crm_lead_activities.id", ondelete="SET NULL"), nullable=True, index=True)

    title = Column(String(191), nullable=False)
    description = Column(Text, nullable=True)
    task_category = Column(String(64), nullable=False, default="GENERAL_FOLLOW_UP", index=True)  # CRM_TASK_CATEGORY
    priority = Column(String(16), nullable=False, default="MEDIUM", index=True)  # CRM_TASK_PRIORITY: LOW, MEDIUM, HIGH, URGENT
    due_date = Column(TIMESTAMP, nullable=False, index=True)
    assigned_to_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="PENDING", index=True)  # CRM_TASK_STATUS: PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED

    completion_outcome = Column(String(64), nullable=True)
    completion_notes = Column(Text, nullable=True)
    completed_at = Column(TIMESTAMP, nullable=True)
    completed_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    escalated_to_manager_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    escalated_at = Column(TIMESTAMP, nullable=True)
    reminder_channel = Column(String(32), nullable=True, default="IN_APP")
    is_automated = Column(Boolean, nullable=False, default=False)
    consent_checked = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    lead = relationship("Lead")
    customer = relationship("Customer")
    activity = relationship("LeadActivity")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    completed_by = relationship("User", foreign_keys=[completed_by_id])
    escalated_to_manager = relationship("User", foreign_keys=[escalated_to_manager_id])


# =====================================================================
# Spec 4.9: Customer Communication History
# =====================================================================

class CommunicationHistory(Base):
    """
    Unified omnichannel timeline of customer interactions across authorized channels (Spec 4.9).
    Captures phone calls, WhatsApp, SMS, emails, site-visit outcomes, Facebook leads, quotations, internal notes.
    """
    __tablename__ = "crm_communication_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    communication_code = Column(String(64), unique=True, nullable=False, index=True)
    channel = Column(String(32), nullable=False, default="PHONE_CALL", index=True)  # CRM_COMMUNICATION_CHANNEL
    direction = Column(String(16), nullable=False, default="OUTBOUND")  # INBOUND, OUTBOUND, INTERNAL
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=True, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)

    subject = Column(String(191), nullable=False)
    message_body = Column(Text, nullable=False)
    delivery_status = Column(String(32), nullable=True, default="DELIVERED", index=True)  # CRM_DELIVERY_STATUS
    is_sensitive = Column(Boolean, nullable=False, default=False)
    is_automated = Column(Boolean, nullable=False, default=False)
    resulting_action = Column(String(255), nullable=True)
    metadata_json = Column(Text, nullable=True)

    sent_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    lead = relationship("Lead")
    customer = relationship("Customer")
    user = relationship("User", foreign_keys=[user_id])


# =====================================================================
# Spec 4.10: Broker and Referral Management Models
# =====================================================================

class CrmBroker(Base):
    """
    Master registry for external brokers, property agents, referral partners,
    and customer referral programs (Spec 4.10).
    """
    __tablename__ = "crm_brokers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    broker_code = Column(String(64), unique=True, nullable=False, index=True)
    broker_name = Column(String(191), nullable=False)
    broker_type = Column(String(32), nullable=False, default="COMPANY")  # CRM_BROKER_TYPE
    contact_person = Column(String(191), nullable=True)
    primary_phone = Column(String(32), nullable=False, index=True)
    secondary_phone = Column(String(32), nullable=True)
    email = Column(String(128), nullable=True)
    office_address = Column(Text, nullable=True)
    service_area = Column(String(191), nullable=True)
    preferred_projects_json = Column(Text, nullable=True)

    referral_code = Column(String(32), unique=True, nullable=False, index=True)
    referral_link = Column(String(255), nullable=True)

    license_number = Column(String(64), nullable=True)
    tin_number = Column(String(64), nullable=True)
    bin_vat_number = Column(String(64), nullable=True)
    agreement_number = Column(String(64), nullable=True)
    agreement_signed_date = Column(Date, nullable=True)
    agreement_valid_from = Column(Date, nullable=True)
    agreement_valid_to = Column(Date, nullable=True)

    commission_type = Column(String(32), nullable=False, default="PERCENTAGE")  # CRM_COMMISSION_TYPE
    commission_rate = Column(Numeric(5, 2), nullable=False, default=1.50)
    eligibility_conditions = Column(Text, nullable=True)
    required_milestone = Column(String(64), nullable=False, default="DOWN_PAYMENT_CLEARED")  # CRM_COMMISSION_MILESTONE

    bank_name = Column(String(128), nullable=True)
    bank_branch = Column(String(128), nullable=True)
    bank_account_name = Column(String(191), nullable=True)
    bank_account_number = Column(String(64), nullable=True)
    routing_number = Column(String(32), nullable=True)
    mobile_wallet_number = Column(String(32), nullable=True)

    trade_license_url = Column(String(255), nullable=True)
    tin_cert_url = Column(String(255), nullable=True)
    agreement_doc_url = Column(String(255), nullable=True)

    status = Column(String(32), nullable=False, default="PROSPECTIVE", index=True)  # CRM_BROKER_STATUS
    total_leads_count = Column(Integer, nullable=False, default=0)
    total_bookings_count = Column(Integer, nullable=False, default=0)
    total_sales_value = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_commission_earned = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_commission_paid = Column(Numeric(14, 2), nullable=False, default=0.00)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    claims = relationship("BrokerCommissionClaim", back_populates="broker", cascade="all, delete-orphan")


Broker = CrmBroker


class BrokerCommissionClaim(Base):
    """
    Tracks lead qualification, booking, agreement, and payment milestones;
    calculates commissions under approved rules, and routes through finance (Spec 4.10).
    """
    __tablename__ = "crm_broker_commission_claims"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    claim_code = Column(String(64), unique=True, nullable=False, index=True)
    broker_id = Column(BigInteger, ForeignKey("crm_brokers.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="SET NULL"), nullable=True, index=True)
    booking_id = Column(BigInteger, nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)

    referral_date = Column(Date, nullable=False)
    source_evidence = Column(String(255), nullable=True)
    unit_sale_value = Column(Numeric(14, 2), nullable=False, default=0.00)
    commission_rate_percentage = Column(Numeric(5, 2), nullable=False, default=1.50)
    calculated_commission_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    tds_tax_deduction_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    net_payable_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    milestone_achieved = Column(String(64), nullable=False, default="BOOKING_CONFIRMED")
    is_milestone_verified = Column(Boolean, nullable=False, default=False)
    milestone_verified_at = Column(TIMESTAMP, nullable=True)
    milestone_verified_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    claim_status = Column(String(32), nullable=False, default="DRAFT", index=True)  # CRM_COMMISSION_CLAIM_STATUS
    sales_approval_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    sales_approved_at = Column(TIMESTAMP, nullable=True)
    finance_approval_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    finance_approved_at = Column(TIMESTAMP, nullable=True)
    disbursement_reference = Column(String(128), nullable=True)
    disbursed_at = Column(TIMESTAMP, nullable=True)
    rejection_reason = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    broker = relationship("CrmBroker", back_populates="claims")
    lead = relationship("Lead")
    customer = relationship("Customer")
    project = relationship("Project")
    unit = relationship("Unit")
    milestone_verified_by = relationship("User", foreign_keys=[milestone_verified_by_id])
    sales_approval_by = relationship("User", foreign_keys=[sales_approval_by_id])
    finance_approval_by = relationship("User", foreign_keys=[finance_approval_by_id])


# =====================================================================
# Spec 4.11: Sales Funnel and Lead Conversion Models
# =====================================================================

class FunnelStage(Base):
    """
    Configurable sales funnel stages with defined entry/exit criteria
    and target dwell days (Spec 4.11).
    """
    __tablename__ = "crm_funnel_stages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    stage_code = Column(String(32), unique=True, nullable=False, index=True)
    stage_name = Column(String(64), nullable=False)
    stage_order = Column(Integer, nullable=False, default=1, index=True)
    description = Column(Text, nullable=True)
    entry_criteria = Column(Text, nullable=True)
    exit_criteria = Column(Text, nullable=True)
    target_dwell_days = Column(Integer, nullable=False, default=3)
    color_code = Column(String(16), nullable=False, default="#3b82f6")
    is_system_stage = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class LeadStageTransition(Base):
    """
    Detailed audit log of lead progression across funnel stages with dwell time (Spec 4.11).
    """
    __tablename__ = "crm_lead_stage_transitions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    from_stage = Column(String(32), nullable=True)
    to_stage = Column(String(32), nullable=False, index=True)
    transition_date = Column(TIMESTAMP, server_default=func.now(), index=True)
    dwell_time_hours = Column(Numeric(10, 2), nullable=False, default=0.00)
    transition_notes = Column(Text, nullable=True)
    transitioned_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    lead = relationship("Lead")
    transitioned_by = relationship("User", foreign_keys=[transitioned_by_id])


class Opportunity(Base):
    """
    Customer deal opportunity linked to a project, unit, estimated value,
    confidence probability, and expected close date (Spec 4.11).
    """
    __tablename__ = "crm_opportunities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    opportunity_code = Column(String(64), unique=True, nullable=False, index=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)

    title = Column(String(191), nullable=False)
    stage = Column(String(32), nullable=False, default="QUALIFIED", index=True)  # CRM_FUNNEL_STAGE
    estimated_deal_value = Column(Numeric(14, 2), nullable=False, default=0.00)
    confidence_probability_pct = Column(Integer, nullable=False, default=50)
    expected_close_date = Column(Date, nullable=True)
    actual_close_date = Column(Date, nullable=True)
    assigned_sales_rep_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)

    loss_reason = Column(String(64), nullable=True)
    loss_notes = Column(Text, nullable=True)

    is_reopened = Column(Boolean, nullable=False, default=False)
    reopened_at = Column(TIMESTAMP, nullable=True)
    reopened_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    reopen_notes = Column(Text, nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    lead = relationship("Lead")
    customer = relationship("Customer")
    project = relationship("Project")
    unit = relationship("Unit")
    assigned_sales_rep = relationship("User", foreign_keys=[assigned_sales_rep_id])
    reopened_by = relationship("User", foreign_keys=[reopened_by_id])
    handovers = relationship("BookingHandover", back_populates="opportunity", cascade="all, delete-orphan")


class BookingHandover(Base):
    """
    Formal sales-to-operations booking handover dossier (Spec 4.11 & 4.12).
    Bridges CRM negotiation to Sales Contract Execution (Module 5.1).
    Implements full 10-step verification workflow.
    """
    __tablename__ = "crm_booking_handovers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    handover_code = Column(String(64), unique=True, nullable=False, index=True)
    opportunity_id = Column(BigInteger, ForeignKey("crm_opportunities.id", ondelete="SET NULL"), nullable=True, index=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="SET NULL"), nullable=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True)

    # 1. Customer Contact Verification
    customer_verified = Column(Boolean, nullable=False, default=False)
    verified_phone = Column(String(32), nullable=True)
    verified_email = Column(String(128), nullable=True)

    # 2 & 3. Unit Selection & Availability
    unit_number = Column(String(64), nullable=True)
    parking_slot = Column(String(64), nullable=True)
    unit_size_sqft = Column(Numeric(10, 2), nullable=True)
    unit_availability_verified = Column(Boolean, nullable=False, default=False)
    approved_base_rate = Column(Numeric(14, 2), nullable=True)

    # 4. Pricing & Discount Request
    list_price = Column(Numeric(14, 2), nullable=False, default=0.00)
    proposed_price = Column(Numeric(14, 2), nullable=False, default=0.00)
    agreed_price = Column(Numeric(14, 2), nullable=False, default=0.00)
    discount_amount_requested = Column(Numeric(14, 2), nullable=False, default=0.00)
    discount_percentage = Column(Numeric(5, 2), nullable=False, default=0.00)
    discount_approval_reference = Column(String(64), nullable=True)
    discount_status = Column(String(32), nullable=False, default="APPROVED")

    # 5. Customer Identification & KYC
    nid_passport_verified = Column(Boolean, nullable=False, default=False)
    tin_certificate_verified = Column(Boolean, nullable=False, default=False)
    nominee_verified = Column(Boolean, nullable=False, default=False)
    power_of_attorney_verified = Column(Boolean, nullable=False, default=False)
    kyc_notes = Column(Text, nullable=True)

    # 6 & 7. Booking & Reservation Reference
    reservation_code = Column(String(64), nullable=True)
    booking_reference_number = Column(String(64), nullable=True)
    status = Column(String(32), nullable=False, default="PENDING_SALES_OPS", index=True)  # CRM_HANDOVER_STATUS

    # 8. Broker Attribution & Source Campaign Transfer
    broker_id = Column(BigInteger, nullable=True)
    broker_code = Column(String(64), nullable=True)
    broker_commission_rate = Column(Numeric(5, 2), nullable=True)
    campaign_id = Column(BigInteger, nullable=True)
    utm_source = Column(String(128), nullable=True)
    utm_campaign = Column(String(128), nullable=True)

    # 9. Payment Terms & Accounting Workflow
    booking_money_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    payment_plan_preference = Column(String(64), nullable=True, default="INSTALLMENTS")
    token_money_payment_mode = Column(String(32), nullable=True, default="PAY_ORDER")
    token_transaction_ref = Column(String(128), nullable=True)
    token_bank_name = Column(String(128), nullable=True)
    token_received_date = Column(Date, nullable=True)
    payment_schedule_triggered = Column(Boolean, nullable=False, default=False)

    # 10. Audit Notes & CRM History Preservation
    special_conditions = Column(Text, nullable=True)
    handover_notes = Column(Text, nullable=True)
    crm_history_snapshot = Column(Text, nullable=True)
    transferred_to_sales_at = Column(TIMESTAMP, nullable=True)

    sales_rep_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    accepted_by_ops_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    accepted_at = Column(TIMESTAMP, nullable=True)
    sales_booking_id = Column(BigInteger, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    opportunity = relationship("Opportunity", back_populates="handovers")
    customer = relationship("Customer")
    sales_rep = relationship("User", foreign_keys=[sales_rep_id])
    accepted_by_ops = relationship("User", foreign_keys=[accepted_by_ops_id])


class Campaign(Base):
    """
    Marketing Campaign Management (Spec 4.13).
    Tracks campaign creation, budgets, UTM tracking, CPL, CPQL, and revenue attribution.
    """
    __tablename__ = "crm_campaigns"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    campaign_code = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    channel = Column(String(64), nullable=False, default="FACEBOOK", index=True)  # CRM_CAMPAIGN_CHANNEL
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    target_audience = Column(String(255), nullable=True)

    allocated_budget = Column(Numeric(14, 2), nullable=False, default=0.00)
    actual_spend = Column(Numeric(14, 2), nullable=False, default=0.00)
    target_leads = Column(Integer, nullable=False, default=0)

    # UTM Parameters & Tracking Links
    utm_source = Column(String(128), nullable=True)
    utm_medium = Column(String(128), nullable=True)
    utm_campaign = Column(String(128), nullable=True)
    utm_content = Column(String(128), nullable=True)
    utm_term = Column(String(128), nullable=True)
    tracking_url = Column(String(512), nullable=True)
    landing_page_slug = Column(String(128), nullable=True)

    # Campaign-specific Lead Routing
    campaign_lead_route_rep_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)  # CRM_CAMPAIGN_STATUS
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    lead_route_rep = relationship("User", foreign_keys=[campaign_lead_route_rep_id])
    touchpoints = relationship("MarketingTouchpoint", back_populates="campaign", cascade="all, delete-orphan")


class MarketingTouchpoint(Base):
    """
    Multi-touch marketing touchpoints tracking (Spec 4.13).
    Preserves original source and tracks intermediate touchpoints before conversion.
    """
    __tablename__ = "crm_marketing_touchpoints"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    campaign_id = Column(BigInteger, ForeignKey("crm_campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    touchpoint_type = Column(String(32), nullable=False, default="FIRST_TOUCH", index=True)  # CRM_TOUCHPOINT_TYPE
    channel = Column(String(64), nullable=False, default="WEBSITE")
    interaction_summary = Column(Text, nullable=True)
    recorded_at = Column(TIMESTAMP, server_default=func.now())
    created_at = Column(TIMESTAMP, server_default=func.now())

    lead = relationship("Lead")
    campaign = relationship("Campaign", back_populates="touchpoints")


class SuppressionEntry(Base):
    """
    Customer Consent and Suppression Lists (Spec 4.13).
    Enforces DNC (Do Not Call), Opt-outs, and Privacy suppression.
    """
    __tablename__ = "crm_suppression_list"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    phone = Column(String(32), nullable=True, index=True)
    email = Column(String(128), nullable=True, index=True)
    customer_name = Column(String(255), nullable=True)
    suppression_reason = Column(String(64), nullable=False, default="DO_NOT_CALL")  # CRM_SUPPRESSION_REASON
    consent_given_at = Column(TIMESTAMP, nullable=True)
    consent_revoked_at = Column(TIMESTAMP, nullable=True)
    source_note = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())



