from sqlalchemy import (
    Column, BigInteger, Integer, String, Numeric, Boolean, Text, JSON, ForeignKey, TIMESTAMP, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class ApprovalPolicy(Base):
    """
    Configurable Approval Chain Policy Master (PROMPT 08).
    Defines threshold criteria and approval levels for documents (Discount, PO, Cancellation, RA Bill, MIN, JV).
    """
    __tablename__ = "gov_approval_policies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    policy_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'POL_DISCOUNT_TIER'
    policy_name = Column(String(128), nullable=False)
    document_type = Column(String(64), nullable=False, index=True) # DISCOUNT_APPROVAL, PURCHASE_ORDER, BOOKING_CANCELLATION, CONTRACTOR_RA_BILL, MATERIAL_REQUISITION, JOURNAL_VOUCHER
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    rules = relationship("ApprovalPolicyRule", back_populates="policy", cascade="all, delete-orphan", order_by="ApprovalPolicyRule.tier_level")


class ApprovalPolicyRule(Base):
    """
    Approval Tier Rule within an Approval Policy.
    Specifies financial threshold, required role, SLA, and auto-escalation.
    """
    __tablename__ = "gov_approval_policy_rules"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    policy_id = Column(BigInteger, ForeignKey("gov_approval_policies.id", ondelete="CASCADE"), nullable=False, index=True)
    tier_level = Column(Integer, nullable=False) # 1, 2, 3...
    tier_name = Column(String(128), nullable=False) # e.g. 'Sales Manager Approval', 'Head of Sales Sanction', 'Managing Director Ratification'
    
    # Financial/Percentage Thresholds
    min_threshold = Column(Numeric(14, 2), nullable=False, default=0.00) # Minimum amount or %
    max_threshold = Column(Numeric(14, 2), nullable=True) # Null = Unbounded / Infinity
    
    required_role = Column(String(64), nullable=False) # SALES_MANAGER, HEAD_OF_SALES, MANAGING_DIRECTOR, PROJECT_ENGINEER, PROCUREMENT_HEAD, CHIEF_OPERATING_OFFICER, ACCOUNTS_MANAGER
    approver_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True) # Specific user override
    is_mandatory = Column(Boolean, default=True, nullable=False)
    sla_hours = Column(Integer, default=24, nullable=False)
    auto_escalate = Column(Boolean, default=False, nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

    policy = relationship("ApprovalPolicy", back_populates="rules")
    approver_user = relationship("User")


class ApprovalRequest(Base):
    """
    Runtime Maker-Checker-Authorizer Approval Transaction Instance.
    Tracks document state across tiers with audit timestamps and status transitions.
    """
    __tablename__ = "gov_approval_requests"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    request_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'REQ-2026-0001'
    document_type = Column(String(64), nullable=False, index=True) # DISCOUNT_APPROVAL, PURCHASE_ORDER, BOOKING_CANCELLATION, etc.
    document_id = Column(String(64), nullable=False, index=True) # ID of underlying document
    document_reference_no = Column(String(64), nullable=False) # e.g. 'BK-2026-0089', 'PO-2026-0012'
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    
    maker_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    maker_user_name = Column(String(128), nullable=False)
    maker_notes = Column(Text, nullable=True)
    
    financial_amount = Column(Numeric(14, 2), nullable=False, default=0.00) # Total amount or discount percent
    total_tiers = Column(Integer, nullable=False, default=1)
    current_tier = Column(Integer, nullable=False, default=1)
    
    # Status: 'PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED'
    status = Column(String(32), nullable=False, default="PENDING", index=True)
    final_action_timestamp = Column(TIMESTAMP, nullable=True)
    document_summary = Column(JSON, nullable=True) # Snapshot of key document fields for rapid review

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    maker_user = relationship("User")
    steps = relationship("ApprovalStep", back_populates="request", cascade="all, delete-orphan", order_by="ApprovalStep.tier_level")
    audit_logs = relationship("ApprovalAuditLog", back_populates="request", cascade="all, delete-orphan", order_by="ApprovalAuditLog.timestamp")


class ApprovalStep(Base):
    """
    Individual Tier Review/Approval Step within an Approval Request.
    Includes digital verification stamp, multi-channel notification status, and action comments.
    """
    __tablename__ = "gov_approval_steps"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    request_id = Column(BigInteger, ForeignKey("gov_approval_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    tier_level = Column(Integer, nullable=False) # 1, 2, 3...
    tier_name = Column(String(128), nullable=False)
    required_role = Column(String(64), nullable=False)
    
    assigned_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    assigned_user_name = Column(String(128), nullable=True)
    
    # Status: 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED', 'SKIPPED'
    status = Column(String(32), nullable=False, default="PENDING", index=True)
    action_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    action_by_user_name = Column(String(128), nullable=True)
    action_timestamp = Column(TIMESTAMP, nullable=True)
    action_ip_address = Column(String(64), nullable=True)
    comments = Column(Text, nullable=True)
    verification_hash = Column(String(128), nullable=True) # SHA-256 digital stamp for non-repudiation
    
    # Multi-channel notification delivery indicators
    notification_sent_web = Column(Boolean, default=True, nullable=False)
    notification_sent_email = Column(Boolean, default=False, nullable=False)
    notification_sent_mobile = Column(Boolean, default=False, nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

    request = relationship("ApprovalRequest", back_populates="steps")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])
    action_by_user = relationship("User", foreign_keys=[action_by_user_id])


class ApprovalAuditLog(Base):
    """
    Field-Level Audit Trail for Governance & Approvals.
    Records who created, who reviewed, timestamps, IP addresses, field changes, and comment logs.
    """
    __tablename__ = "gov_approval_audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    request_id = Column(BigInteger, ForeignKey("gov_approval_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    step_id = Column(BigInteger, nullable=True)
    action = Column(String(64), nullable=False) # SUBMITTED, VIEWED, APPROVED, REJECTED, CORRECTION_REQUESTED, ESCALATED
    performed_by_id = Column(BigInteger, nullable=True)
    performed_by_name = Column(String(128), nullable=False)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    field_changes = Column(JSON, nullable=True)
    comment = Column(Text, nullable=True)
    timestamp = Column(TIMESTAMP, server_default=func.now())

    request = relationship("ApprovalRequest", back_populates="audit_logs")


class GovernanceNotification(Base):
    """
    Multi-Channel Notification Dispatch Queue (Web In-App, Mobile Push, Email).
    """
    __tablename__ = "gov_notifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    recipient_user_id = Column(BigInteger, nullable=False, index=True)
    request_id = Column(BigInteger, nullable=True, index=True)
    channel = Column(String(32), nullable=False, default="WEB") # WEB, EMAIL, MOBILE_PUSH
    title = Column(String(191), nullable=False)
    body = Column(Text, nullable=False)
    action_url = Column(String(255), nullable=True)
    status = Column(String(32), nullable=False, default="DELIVERED") # QUEUED, DELIVERED, READ
    created_at = Column(TIMESTAMP, server_default=func.now())
