from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime, date
from decimal import Decimal


# --- 1. Matrix Rule Schemas ---
class HrmWorkflowMatrixRuleBase(BaseModel):
    rule_title: str
    module_category: str # LEAVE, OVERTIME, ATTENDANCE, RECRUITMENT, SALARY_REVISION, PAYROLL, EXPENSE
    department_name: Optional[str] = None
    tier_level: int = 1
    step_name: str
    approver_designation: str
    approver_role: str = "DEPT_HEAD"
    approver_user_id: Optional[int] = None
    approver_name: Optional[str] = None
    min_threshold: Decimal = Decimal("0.00")
    max_threshold: Optional[Decimal] = None
    sla_hours: int = 24
    auto_escalate: bool = False
    is_mandatory: bool = True
    is_active: bool = True


class HrmWorkflowMatrixRuleCreate(HrmWorkflowMatrixRuleBase):
    pass


class HrmWorkflowMatrixRuleUpdate(BaseModel):
    rule_title: Optional[str] = None
    module_category: Optional[str] = None
    department_name: Optional[str] = None
    tier_level: Optional[int] = None
    step_name: Optional[str] = None
    approver_designation: Optional[str] = None
    approver_role: Optional[str] = None
    approver_user_id: Optional[int] = None
    approver_name: Optional[str] = None
    min_threshold: Optional[Decimal] = None
    max_threshold: Optional[Decimal] = None
    sla_hours: Optional[int] = None
    auto_escalate: Optional[bool] = None
    is_mandatory: Optional[bool] = None
    is_active: Optional[bool] = None


class HrmWorkflowMatrixRuleOut(HrmWorkflowMatrixRuleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    rule_code: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# --- 2. Step Schemas ---
class HrmWorkflowStepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tier_level: int
    step_name: str
    required_role: str
    approver_name: Optional[str] = None
    status: str
    action_date: Optional[datetime] = None
    action_by: Optional[str] = None
    comments: Optional[str] = None


# --- 3. Request Schemas ---
class HrmWorkflowRequestBase(BaseModel):
    module_category: str # LEAVE, OVERTIME, ATTENDANCE, RECRUITMENT, SALARY_REVISION, PAYROLL, EXPENSE
    applicant_employee_id: Optional[int] = None
    applicant_code: Optional[str] = None
    applicant_name: str
    department_name: str
    designation: str
    subject: str
    details_json: Optional[Dict[str, Any]] = None
    financial_amount: Decimal = Decimal("0.00")
    days_count: Decimal = Decimal("0.00")
    total_tiers: int = 2
    priority: str = "NORMAL"


class HrmWorkflowRequestCreate(HrmWorkflowRequestBase):
    notes: Optional[str] = None


class HrmWorkflowRequestUpdate(BaseModel):
    subject: Optional[str] = None
    details_json: Optional[Dict[str, Any]] = None
    financial_amount: Optional[Decimal] = None
    days_count: Optional[Decimal] = None
    priority: Optional[str] = None


class HrmWorkflowActionPayload(BaseModel):
    action: str # APPROVE, REJECT, REQUEST_CORRECTION
    comments: Optional[str] = None
    approver_name: Optional[str] = "Current Approver"
    approver_role: Optional[str] = "DEPT_HEAD"


class HrmWorkflowRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    request_number: str
    module_category: str
    applicant_employee_id: Optional[int] = None
    applicant_code: Optional[str] = None
    applicant_name: str
    department_name: str
    designation: str
    subject: str
    details_json: Optional[Dict[str, Any]] = None
    financial_amount: Decimal
    days_count: Decimal
    current_tier: int
    total_tiers: int
    current_approver_role: Optional[str] = None
    current_approver_name: Optional[str] = None
    status: str
    priority: str
    submission_date: Optional[datetime] = None
    final_action_date: Optional[datetime] = None
    final_action_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    steps: Optional[List[HrmWorkflowStepOut]] = []


# --- 4. Delegation Schemas ---
class HrmWorkflowDelegationBase(BaseModel):
    delegator_name: str
    delegator_designation: str
    delegatee_name: str
    delegatee_designation: str
    module_scope: str = "ALL"
    start_date: date
    end_date: date
    reason: Optional[str] = None
    is_active: bool = True


class HrmWorkflowDelegationCreate(HrmWorkflowDelegationBase):
    pass


class HrmWorkflowDelegationUpdate(BaseModel):
    delegator_name: Optional[str] = None
    delegator_designation: Optional[str] = None
    delegatee_name: Optional[str] = None
    delegatee_designation: Optional[str] = None
    module_scope: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None
    is_active: Optional[bool] = None


class HrmWorkflowDelegationOut(HrmWorkflowDelegationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    delegation_code: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# --- 5. Audit Log Schemas ---
class HrmWorkflowAuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    audit_ref: str
    request_number: str
    event_type: str
    actor_name: str
    actor_role: str
    tier_level: Optional[int] = None
    comments: Optional[str] = None
    ip_address: str
    timestamp: Optional[datetime] = None


# --- 6. Generic Paginated Response ---
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    limit: int
    offset: int
