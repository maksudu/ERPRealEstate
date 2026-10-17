from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


class ApprovalPolicyRuleBase(BaseModel):
    tier_level: int = Field(..., ge=1, description="Tier sequence level (1, 2, 3...)")
    tier_name: str = Field(..., max_length=128)
    min_threshold: Decimal = Field(default=Decimal("0.00"), ge=0)
    max_threshold: Optional[Decimal] = None
    required_role: str = Field(..., max_length=64)
    approver_user_id: Optional[int] = None
    is_mandatory: bool = True
    sla_hours: int = Field(default=24, ge=1)
    auto_escalate: bool = False


class ApprovalPolicyRuleCreate(ApprovalPolicyRuleBase):
    pass


class ApprovalPolicyRuleResponse(ApprovalPolicyRuleBase):
    id: int
    policy_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalPolicyBase(BaseModel):
    policy_code: str = Field(..., max_length=64)
    policy_name: str = Field(..., max_length=128)
    document_type: str = Field(..., max_length=64) # DISCOUNT_APPROVAL, PURCHASE_ORDER, BOOKING_CANCELLATION, etc.
    project_id: Optional[int] = None
    description: Optional[str] = None
    is_active: bool = True


class ApprovalPolicyCreate(ApprovalPolicyBase):
    rules: List[ApprovalPolicyRuleCreate] = []


class ApprovalPolicyUpdate(BaseModel):
    policy_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    rules: Optional[List[ApprovalPolicyRuleCreate]] = None


class ApprovalPolicyResponse(ApprovalPolicyBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    rules: List[ApprovalPolicyRuleResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ApprovalActionRequest(BaseModel):
    action: str = Field(..., description="APPROVE, REJECT, or REQUEST_CORRECTION")
    comments: Optional[str] = Field(None, description="Maker-Checker review notes or rejection rationale")
    approver_name: str = Field(default="Authorized Approver", max_length=128)
    ip_address: Optional[str] = Field(default="127.0.0.1", max_length=64)


class ApprovalRequestCreate(BaseModel):
    document_type: str = Field(..., max_length=64) # DISCOUNT_APPROVAL, PURCHASE_ORDER, BOOKING_CANCELLATION, etc.
    document_id: str = Field(..., max_length=64)
    document_reference_no: str = Field(..., max_length=64)
    project_id: Optional[int] = None
    maker_user_name: str = Field(..., max_length=128)
    maker_notes: Optional[str] = None
    financial_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    document_summary: Optional[Dict[str, Any]] = None


class ApprovalStepResponse(BaseModel):
    id: int
    request_id: int
    tier_level: int
    tier_name: str
    required_role: str
    assigned_user_id: Optional[int] = None
    assigned_user_name: Optional[str] = None
    status: str
    action_by_user_id: Optional[int] = None
    action_by_user_name: Optional[str] = None
    action_timestamp: Optional[datetime] = None
    action_ip_address: Optional[str] = None
    comments: Optional[str] = None
    verification_hash: Optional[str] = None
    notification_sent_web: bool = True
    notification_sent_email: bool = False
    notification_sent_mobile: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalAuditLogResponse(BaseModel):
    id: int
    request_id: int
    step_id: Optional[int] = None
    action: str
    performed_by_id: Optional[int] = None
    performed_by_name: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    field_changes: Optional[Dict[str, Any]] = None
    comment: Optional[str] = None
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalRequestResponse(BaseModel):
    id: int
    request_number: str
    document_type: str
    document_id: str
    document_reference_no: str
    project_id: Optional[int] = None
    maker_user_id: Optional[int] = None
    maker_user_name: str
    maker_notes: Optional[str] = None
    financial_amount: Decimal
    total_tiers: int
    current_tier: int
    status: str
    final_action_timestamp: Optional[datetime] = None
    document_summary: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalRequestDetailResponse(ApprovalRequestResponse):
    steps: List[ApprovalStepResponse] = []
    audit_logs: List[ApprovalAuditLogResponse] = []

    model_config = ConfigDict(from_attributes=True)


class GovernanceNotificationResponse(BaseModel):
    id: int
    recipient_user_id: int
    request_id: Optional[int] = None
    channel: str
    title: str
    body: str
    action_url: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GovernanceMetricsResponse(BaseModel):
    total_pending_requests: int
    total_approved_requests: int
    total_rejected_requests: int
    total_correction_requests: int
    average_sla_hours: float
    active_policies_count: int
