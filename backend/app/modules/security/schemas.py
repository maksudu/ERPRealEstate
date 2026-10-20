from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime
from decimal import Decimal


class SecurityUserCreate(BaseModel):
    username: str
    email: str
    full_name_en: str
    full_name_bn: Optional[str] = None
    phone_number: Optional[str] = None
    employee_id: Optional[str] = None
    company_name: Optional[str] = "BlueOceans Holdings Ltd."
    branch_name: Optional[str] = "Dhaka Head Office"
    department_name: Optional[str] = "Engineering & Site Operations"
    designation: Optional[str] = "Project Executive"
    reporting_manager: Optional[str] = None
    primary_role: Optional[str] = "Project Manager"
    assigned_roles: Optional[List[str]] = []
    account_status: Optional[str] = "ACTIVE"
    preferred_language: Optional[str] = "en"


class SecurityUserUpdate(BaseModel):
    full_name_en: Optional[str] = None
    full_name_bn: Optional[str] = None
    phone_number: Optional[str] = None
    department_name: Optional[str] = None
    designation: Optional[str] = None
    reporting_manager: Optional[str] = None
    primary_role: Optional[str] = None
    assigned_roles: Optional[List[str]] = None
    account_status: Optional[str] = None
    is_mfa_enabled: Optional[bool] = None


class SecurityUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_code: str
    username: str
    email: str
    full_name_en: str
    full_name_bn: Optional[str] = None
    phone_number: Optional[str] = None
    employee_id: Optional[str] = None
    company_name: str
    branch_name: str
    department_name: str
    designation: str
    reporting_manager: Optional[str] = None
    primary_role: str
    assigned_roles: Optional[List[str]] = []
    account_status: str
    preferred_language: str
    is_mfa_enabled: bool
    failed_login_count: int
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class SecurityRoleCreate(BaseModel):
    role_code: str
    role_name: str
    department: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = True


class SecurityRoleUpdate(BaseModel):
    role_name: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class SecurityRoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role_code: str
    role_name: str
    department: Optional[str] = None
    description: Optional[str] = None
    is_system_role: bool
    is_active: bool
    assigned_users_count: int
    created_at: Optional[datetime] = None


class SecurityRolePermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role_code: str
    module_code: str
    module_name: str
    can_view: bool
    can_create: bool
    can_edit: bool
    can_delete: bool
    can_approve: bool
    can_export: bool
    can_print: bool
    data_scope: str
    restricted_fields: Optional[List[str]] = []


class SecurityRolePermissionUpdate(BaseModel):
    can_view: Optional[bool] = None
    can_create: Optional[bool] = None
    can_edit: Optional[bool] = None
    can_delete: Optional[bool] = None
    can_approve: Optional[bool] = None
    can_export: Optional[bool] = None
    can_print: Optional[bool] = None
    data_scope: Optional[str] = None


class SecurityUserProjectScopeCreate(BaseModel):
    user_id: int
    user_name: str
    project_id: int
    project_name: str
    tower_names: Optional[List[str]] = []
    can_view_financials: Optional[bool] = False
    can_view_customers: Optional[bool] = True


class SecurityUserProjectScopeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    project_id: int
    project_name: str
    tower_names: Optional[List[str]] = []
    can_view_financials: bool
    can_view_customers: bool
    is_active: bool
    created_at: Optional[datetime] = None


class SecurityWorkflowRuleCreate(BaseModel):
    module_name: str
    maker_role: str
    checker_role: str
    approver_role: str
    threshold_limit_bdt: Optional[Decimal] = Decimal("0.00")
    prevent_self_approval: Optional[bool] = True


class SecurityWorkflowRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    module_name: str
    maker_role: str
    checker_role: str
    approver_role: str
    threshold_limit_bdt: float
    prevent_self_approval: bool
    is_active: bool


class SecurityPolicyConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    policy_name: str
    min_password_length: int
    require_special_char: bool
    require_numbers: bool
    require_uppercase: bool
    max_failed_attempts: int
    lockout_duration_minutes: int
    session_idle_timeout_minutes: int
    enforce_mfa_roles: Optional[List[str]] = []
    ip_allowlist_enabled: bool
    allowed_ip_ranges: str


class SecurityApiKeyCreate(BaseModel):
    app_name: str
    allowed_scopes: Optional[List[str]] = []
    rate_limit_per_minute: Optional[int] = 120


class SecurityApiKeyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    app_name: str
    client_id: str
    api_key_masked: str
    allowed_scopes: Optional[List[str]] = []
    rate_limit_per_minute: int
    is_active: bool
    created_at: Optional[datetime] = None


class SecurityMobileAppPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    app_name: str
    min_supported_version: str
    allow_offline_cache: bool
    require_biometrics: bool
    restrict_document_download: bool
    session_lifetime_hours: int
    is_active: bool


class SecurityAuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    audit_ref: str
    user_name: str
    event_type: str
    module_name: str
    record_ref: Optional[str] = None
    ip_address: Optional[str] = None
    device_session: Optional[str] = None
    result_status: str
    reason_notes: Optional[str] = None
    created_at: Optional[datetime] = None


class SecurityActiveSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str
    username: str
    device_name: str
    browser: str
    ip_address: str
    location: str
    status: str
    login_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None


class SecurityIncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_code: str
    severity: str
    incident_type: str
    source_ip: Optional[str] = None
    affected_user: Optional[str] = None
    description: str
    status: str
    created_at: Optional[datetime] = None


class SecurityAccessReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    review_code: str
    cycle_name: str
    department: str
    reviewer_name: str
    total_users_reviewed: int
    certified_count: int
    revoked_count: int
    status: str
    review_date: Optional[datetime] = None


class SecurityDashboardSummary(BaseModel):
    total_users_count: int
    active_users_count: int
    suspended_users_count: int
    inactive_users_count: int
    total_roles_count: int
    failed_logins_today: int
    active_sessions_count: int
    open_security_incidents: int
    pending_access_reviews: int
    mfa_enabled_percent: float
    recent_role_changes: List[Dict[str, Any]]
    logins_by_role: List[Dict[str, Any]]
