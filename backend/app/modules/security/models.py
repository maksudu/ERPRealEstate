from sqlalchemy import (
    Column, BigInteger, Integer, String, Numeric, Boolean, Text, JSON, TIMESTAMP, DateTime, func
)
from app.core.database import Base


class SecurityUserAccount(Base):
    """
    Comprehensive User Profile & Lifecycle Management (Section 2).
    Tracks employee identity, account status, branch/department, reporting manager, and contact.
    """
    __tablename__ = "sec_user_accounts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_code = Column(String(32), unique=True, nullable=False, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(191), unique=True, nullable=False, index=True)
    full_name_en = Column(String(128), nullable=False)
    full_name_bn = Column(String(128), nullable=True)
    phone_number = Column(String(32), nullable=True)
    employee_id = Column(String(64), nullable=True, index=True)
    
    company_name = Column(String(128), default="BlueOceans Holdings Ltd.")
    branch_name = Column(String(128), default="Dhaka Head Office")
    department_name = Column(String(128), default="Engineering & Site Operations")
    designation = Column(String(128), default="Project Executive")
    reporting_manager = Column(String(128), nullable=True)
    
    primary_role = Column(String(64), nullable=False, default="Project Manager")
    assigned_roles = Column(JSON, default=list) # List of role codes
    
    # Lifecycle: DRAFT, INVITATION_PENDING, ACTIVE, TEMPORARILY_LOCKED, SUSPENDED, INACTIVE, EXPIRED, TERMINATED
    account_status = Column(String(32), nullable=False, default="ACTIVE", index=True)
    activation_date = Column(TIMESTAMP, server_default=func.now())
    expiry_date = Column(TIMESTAMP, nullable=True)
    
    preferred_language = Column(String(10), default="en") # 'en' or 'bn'
    is_mfa_enabled = Column(Boolean, default=False)
    failed_login_count = Column(Integer, default=0)
    last_login_at = Column(TIMESTAMP, nullable=True)
    last_login_ip = Column(String(45), nullable=True)
    profile_photo_url = Column(String(255), nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class SecurityRoleMaster(Base):
    """
    Role Master & Templates (Section 3).
    Pre-configured with 25 standard Real Estate ERP roles.
    """
    __tablename__ = "sec_roles_master"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    role_code = Column(String(64), unique=True, nullable=False, index=True)
    role_name = Column(String(128), nullable=False)
    department = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    is_system_role = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    valid_until = Column(TIMESTAMP, nullable=True)
    assigned_users_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())


class SecurityRolePermissionMatrix(Base):
    """
    Module, Page, Action, Field and Scope-level Permissions (Sections 4 & 5).
    """
    __tablename__ = "sec_role_permissions_matrix"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    role_code = Column(String(64), nullable=False, index=True)
    module_code = Column(String(64), nullable=False, index=True)
    module_name = Column(String(128), nullable=False)
    
    # Action flags
    can_view = Column(Boolean, default=True)
    can_create = Column(Boolean, default=False)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_approve = Column(Boolean, default=False)
    can_export = Column(Boolean, default=False)
    can_print = Column(Boolean, default=False)
    
    # Scope: OWN, ASSIGNED, DEPARTMENT, PROJECT, BRANCH, COMPANY, ALL
    data_scope = Column(String(32), default="PROJECT")
    
    # Sensitive field restrictions (JSON list of restricted fields)
    restricted_fields = Column(JSON, default=list)
    created_at = Column(TIMESTAMP, server_default=func.now())


class SecurityUserProjectScope(Base):
    """
    Project, Tower, Floor and Property Level Access Restriction (Section 6).
    """
    __tablename__ = "sec_user_project_scopes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    user_name = Column(String(128), nullable=False)
    project_id = Column(BigInteger, nullable=False, index=True)
    project_name = Column(String(128), nullable=False)
    tower_names = Column(JSON, default=list) # e.g. ["Tower A", "Tower B"]
    
    can_view_financials = Column(Boolean, default=False)
    can_view_customers = Column(Boolean, default=True)
    access_expiry_date = Column(TIMESTAMP, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class SecurityWorkflowRule(Base):
    """
    Maker-Checker-Approver Separation of Duties Matrix (Section 7).
    """
    __tablename__ = "sec_workflow_rules"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    module_name = Column(String(128), nullable=False, index=True)
    maker_role = Column(String(64), nullable=False)
    checker_role = Column(String(64), nullable=False)
    approver_role = Column(String(64), nullable=False)
    threshold_limit_bdt = Column(Numeric(14, 2), default=0.00)
    prevent_self_approval = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class SecurityPolicyConfig(Base):
    """
    Global Authentication & Password Policies (Section 8).
    """
    __tablename__ = "sec_global_policies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    policy_name = Column(String(128), default="Default Corporate Security Policy")
    min_password_length = Column(Integer, default=8)
    require_special_char = Column(Boolean, default=True)
    require_numbers = Column(Boolean, default=True)
    require_uppercase = Column(Boolean, default=True)
    max_failed_attempts = Column(Integer, default=5)
    lockout_duration_minutes = Column(Integer, default=30)
    session_idle_timeout_minutes = Column(Integer, default=60)
    enforce_mfa_roles = Column(JSON, default=lambda: ["SUPER_ADMIN", "FINANCE_MANAGER", "MANAGING_DIRECTOR"])
    ip_allowlist_enabled = Column(Boolean, default=False)
    allowed_ip_ranges = Column(Text, default="192.168.1.0/24, 103.145.0.0/16")
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class SecurityApiKeyMaster(Base):
    """
    API, OAuth & Service Account Integration Security (Section 9).
    """
    __tablename__ = "sec_api_keys_master"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    app_name = Column(String(128), nullable=False)
    client_id = Column(String(64), unique=True, nullable=False, index=True)
    api_key_masked = Column(String(64), nullable=False)
    allowed_scopes = Column(JSON, default=list) # e.g. ["read:inventory", "write:crm"]
    rate_limit_per_minute = Column(Integer, default=120)
    is_active = Column(Boolean, default=True)
    expires_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class SecurityMobileAppPolicy(Base):
    """
    Mobile App Access Security (Section 10).
    """
    __tablename__ = "sec_mobile_policies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    app_name = Column(String(64), nullable=False) # Sales App, Site App, Collection App, Management App
    min_supported_version = Column(String(16), default="2.1.0")
    allow_offline_cache = Column(Boolean, default=True)
    require_biometrics = Column(Boolean, default=True)
    restrict_document_download = Column(Boolean, default=True)
    session_lifetime_hours = Column(Integer, default=72)
    is_active = Column(Boolean, default=True)
    updated_at = Column(TIMESTAMP, server_default=func.now())


class SecurityAuditLogEntry(Base):
    """
    Tamper-Resistant Audit Trail & Activity Logs (Section 11).
    """
    __tablename__ = "sec_audit_trail_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    audit_ref = Column(String(64), unique=True, nullable=False, index=True)
    user_name = Column(String(128), nullable=False, index=True)
    event_type = Column(String(64), nullable=False, index=True) # LOGIN, LOGOUT, CREATE, UPDATE, DELETE, APPROVE, EXPORT
    module_name = Column(String(64), nullable=False, index=True)
    record_ref = Column(String(128), nullable=True)
    ip_address = Column(String(45), nullable=True)
    device_session = Column(String(128), nullable=True)
    result_status = Column(String(32), default="SUCCESS") # SUCCESS, DENIED, FAILED
    reason_notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)


class SecurityActiveSession(Base):
    """
    Session & Device Management (Section 12).
    """
    __tablename__ = "sec_active_sessions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    username = Column(String(64), nullable=False, index=True)
    device_name = Column(String(128), nullable=False)
    browser = Column(String(64), nullable=False)
    ip_address = Column(String(45), nullable=False)
    location = Column(String(128), default="Dhaka, Bangladesh")
    status = Column(String(32), default="ACTIVE") # ACTIVE, REVOKED, EXPIRED
    login_at = Column(TIMESTAMP, server_default=func.now())
    last_activity_at = Column(TIMESTAMP, server_default=func.now())


class SecurityIncidentLog(Base):
    """
    Security Monitoring, Failed Logins & Alerts (Section 13).
    """
    __tablename__ = "sec_incident_alerts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    incident_code = Column(String(64), unique=True, nullable=False, index=True)
    severity = Column(String(32), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    incident_type = Column(String(64), nullable=False) # FAILED_LOGIN_SPIKE, PRIVILEGE_ESCALATION, EXPORT_ANOMALY
    source_ip = Column(String(45), nullable=True)
    affected_user = Column(String(64), nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String(32), default="OPEN") # OPEN, UNDER_INVESTIGATION, RESOLVED
    created_at = Column(TIMESTAMP, server_default=func.now())


class SecurityAccessReviewCycle(Base):
    """
    User Access Certification & Review (Section 15).
    """
    __tablename__ = "sec_access_review_cycles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    review_code = Column(String(64), unique=True, nullable=False, index=True)
    cycle_name = Column(String(128), nullable=False)
    department = Column(String(128), nullable=False)
    reviewer_name = Column(String(128), nullable=False)
    total_users_reviewed = Column(Integer, default=0)
    certified_count = Column(Integer, default=0)
    revoked_count = Column(Integer, default=0)
    status = Column(String(32), default="COMPLETED") # IN_PROGRESS, COMPLETED
    review_date = Column(TIMESTAMP, server_default=func.now())
