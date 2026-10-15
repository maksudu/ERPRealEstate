from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime

class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or Email address")
    password: str = Field(..., min_length=6)

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserProjectAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    role_code: str
    can_view_financials: bool

class OrganizationSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_code: str
    legal_name_en: str
    legal_name_bn: str
    tin_number: Optional[str] = None
    bin_vat_number: Optional[str] = None
    rehab_membership_number: Optional[str] = None

class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    username: str
    email: str
    phone_number: Optional[str] = None
    full_name_en: str
    full_name_bn: str
    is_group_admin: bool
    is_active: bool
    organization: Optional[OrganizationSummaryResponse] = None
    project_assignments: List[UserProjectAssignmentResponse] = []

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfileResponse

class ProjectScopeContext(BaseModel):
    """Returned by require_project_scope security dependency to downstream controllers"""
    user_id: int
    username: str
    project_id: int
    role_code: str
    can_view_financials: bool
    is_group_admin: bool

class AuditTrailCreate(BaseModel):
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    microservice_name: str
    entity_name: str
    entity_id: Optional[str] = None
    action_type: str
    payload_before: Optional[Dict[str, Any]] = None
    payload_after: Optional[Dict[str, Any]] = None
