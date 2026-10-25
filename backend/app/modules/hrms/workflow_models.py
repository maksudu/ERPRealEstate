from sqlalchemy import (
    Column, BigInteger, Integer, String, Numeric, Boolean, Text, JSON, Date, TIMESTAMP, ForeignKey, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class HrmWorkflowMatrixRule(Base):
    """
    Enterprise Approval Matrix Configuration Master.
    Specifies tier levels, financial & duration thresholds, approver designation, SLA, and auto-escalation.
    """
    __tablename__ = "hrm_workflow_matrix_rules"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    rule_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'WFR-MAT-001'
    rule_title = Column(String(191), nullable=False) # e.g. 'Leave Approval Multi-Tier Rule'
    module_category = Column(String(64), nullable=False, index=True) # LEAVE, OVERTIME, ATTENDANCE, RECRUITMENT, SALARY_REVISION, PAYROLL, EXPENSE
    department_name = Column(String(128), nullable=True) # Specific department or null for all
    tier_level = Column(Integer, nullable=False, default=1) # 1, 2, 3, 4
    step_name = Column(String(128), nullable=False) # e.g. 'Department Head Signoff', 'HR Director Approval'
    approver_designation = Column(String(128), nullable=False) # Designation required
    approver_role = Column(String(64), nullable=False, default="DEPT_HEAD") # SYS role code
    approver_user_id = Column(BigInteger, nullable=True)
    approver_name = Column(String(128), nullable=True)
    min_threshold = Column(Numeric(14, 2), nullable=False, default=0.00) # Min amount or days
    max_threshold = Column(Numeric(14, 2), nullable=True) # Null = unbounded
    sla_hours = Column(Integer, nullable=False, default=24)
    auto_escalate = Column(Boolean, nullable=False, default=False)
    is_mandatory = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class HrmWorkflowRequest(Base):
    """
    Live HRMS Workflow Transaction Request.
    Tracks applications across all 10 HR workflow categories through multi-level approvals.
    """
    __tablename__ = "hrm_workflow_requests"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    request_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'WF-2026-901'
    module_category = Column(String(64), nullable=False, index=True) # LEAVE, OVERTIME, ATTENDANCE, RECRUITMENT, SALARY_REVISION, PAYROLL, EXPENSE
    applicant_employee_id = Column(BigInteger, nullable=True)
    applicant_code = Column(String(64), nullable=True)
    applicant_name = Column(String(128), nullable=False)
    department_name = Column(String(128), nullable=False)
    designation = Column(String(128), nullable=False)
    subject = Column(String(255), nullable=False)
    details_json = Column(JSON, nullable=True)
    financial_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    days_count = Column(Numeric(6, 2), nullable=False, default=0.00)
    current_tier = Column(Integer, nullable=False, default=1)
    total_tiers = Column(Integer, nullable=False, default=2)
    current_approver_role = Column(String(64), nullable=True)
    current_approver_name = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, APPROVED, REJECTED, CORRECTION_REQUESTED
    priority = Column(String(32), nullable=False, default="NORMAL") # LOW, NORMAL, HIGH, URGENT
    submission_date = Column(TIMESTAMP, server_default=func.now())
    final_action_date = Column(TIMESTAMP, nullable=True)
    final_action_by = Column(String(128), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    steps = relationship("HrmWorkflowStep", back_populates="request", cascade="all, delete-orphan", order_by="HrmWorkflowStep.tier_level")


class HrmWorkflowStep(Base):
    """
    Individual Tier Approval Steps for a Workflow Request.
    """
    __tablename__ = "hrm_workflow_steps"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    request_id = Column(BigInteger, ForeignKey("hrm_workflow_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    tier_level = Column(Integer, nullable=False)
    step_name = Column(String(128), nullable=False)
    required_role = Column(String(64), nullable=False)
    approver_name = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default="PENDING") # PENDING, APPROVED, REJECTED, SKIPPED
    action_date = Column(TIMESTAMP, nullable=True)
    action_by = Column(String(128), nullable=True)
    comments = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    request = relationship("HrmWorkflowRequest", back_populates="steps")


class HrmWorkflowDelegation(Base):
    """
    Approval Authority Delegation & Proxy Management.
    """
    __tablename__ = "hrm_workflow_delegations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    delegation_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'DEL-2026-001'
    delegator_name = Column(String(128), nullable=False)
    delegator_designation = Column(String(128), nullable=False)
    delegatee_name = Column(String(128), nullable=False)
    delegatee_designation = Column(String(128), nullable=False)
    module_scope = Column(String(64), nullable=False, default="ALL") # ALL, LEAVE, OVERTIME, ATTENDANCE, RECRUITMENT, SALARY_REVISION, PAYROLL, EXPENSE
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class HrmWorkflowAuditLog(Base):
    """
    Immutable Chronological Audit Event Trail.
    """
    __tablename__ = "hrm_workflow_audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    audit_ref = Column(String(64), unique=True, nullable=False, index=True)
    request_number = Column(String(64), nullable=False, index=True)
    event_type = Column(String(64), nullable=False) # SUBMIT, TIER_APPROVED, FULLY_APPROVED, REJECTED, DELEGATED
    actor_name = Column(String(128), nullable=False)
    actor_role = Column(String(64), nullable=False)
    tier_level = Column(Integer, nullable=True)
    comments = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=False, default="127.0.0.1")
    timestamp = Column(TIMESTAMP, server_default=func.now())
