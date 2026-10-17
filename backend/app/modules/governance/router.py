from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.governance.models import (
    ApprovalPolicy,
    ApprovalPolicyRule,
    ApprovalRequest,
    ApprovalStep,
    ApprovalAuditLog,
    GovernanceNotification
)
from app.modules.governance.schemas import (
    ApprovalPolicyCreate,
    ApprovalPolicyUpdate,
    ApprovalPolicyResponse,
    ApprovalRequestCreate,
    ApprovalRequestResponse,
    ApprovalRequestDetailResponse,
    ApprovalActionRequest,
    GovernanceNotificationResponse,
    GovernanceMetricsResponse
)
from app.modules.governance.services import GovernanceEngineService

router = APIRouter(prefix="/governance", tags=["Governance & Maker-Checker Engine"])


# 1. Approval Policy Configuration
@router.get("/policies", response_model=List[ApprovalPolicyResponse])
async def list_approval_policies(
    document_type: Optional[str] = None,
    project_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all dynamic, configurable approval policies with tier rules.
    """
    query = (
        select(ApprovalPolicy)
        .options(selectinload(ApprovalPolicy.rules))
        .order_by(ApprovalPolicy.created_at.desc())
    )
    if document_type:
        query = query.where(ApprovalPolicy.document_type == document_type)
    if project_id:
        query = query.where(ApprovalPolicy.project_id == project_id)
    if is_active is not None:
        query = query.where(ApprovalPolicy.is_active == is_active)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/policies", response_model=ApprovalPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_approval_policy(
    payload: ApprovalPolicyCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new configurable approval policy with multi-tier rules.
    """
    existing = (await db.execute(
        select(ApprovalPolicy).where(ApprovalPolicy.policy_code == payload.policy_code)
    )).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail=f"Policy code '{payload.policy_code}' already exists.")

    policy = ApprovalPolicy(
        policy_code=payload.policy_code,
        policy_name=payload.policy_name,
        document_type=payload.document_type,
        project_id=payload.project_id,
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(policy)
    await db.flush()

    for r in payload.rules:
        rule = ApprovalPolicyRule(
            policy_id=policy.id,
            tier_level=r.tier_level,
            tier_name=r.tier_name,
            min_threshold=r.min_threshold,
            max_threshold=r.max_threshold,
            required_role=r.required_role,
            approver_user_id=r.approver_user_id,
            is_mandatory=r.is_mandatory,
            sla_hours=r.sla_hours,
            auto_escalate=r.auto_escalate
        )
        db.add(rule)

    await db.commit()

    # Re-fetch with rules eager loaded
    result = await db.execute(
        select(ApprovalPolicy)
        .options(selectinload(ApprovalPolicy.rules))
        .where(ApprovalPolicy.id == policy.id)
    )
    return result.scalar_one()


# 2. Approval Requests (Maker-Checker Inbox)
@router.get("/requests", response_model=List[ApprovalRequestResponse])
async def list_approval_requests(
    status: Optional[str] = None,
    document_type: Optional[str] = None,
    project_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Lists approval requests with filtering by status, document type, and project.
    """
    query = select(ApprovalRequest).order_by(ApprovalRequest.created_at.desc())

    if status:
        query = query.where(ApprovalRequest.status == status)
    if document_type:
        query = query.where(ApprovalRequest.document_type == document_type)
    if project_id:
        query = query.where(ApprovalRequest.project_id == project_id)
    if search:
        s = f"%{search}%"
        query = query.where(
            or_(
                ApprovalRequest.request_number.ilike(s),
                ApprovalRequest.document_reference_no.ilike(s),
                ApprovalRequest.maker_user_name.ilike(s)
            )
        )

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/requests/{id}", response_model=ApprovalRequestDetailResponse)
async def get_approval_request_detail(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full request details including step progression, comments, hashes, and audit timeline.
    """
    query = (
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.steps),
            selectinload(ApprovalRequest.audit_logs)
        )
        .where(ApprovalRequest.id == id)
    )
    result = await db.execute(query)
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found.")
    return req


@router.post("/requests", response_model=ApprovalRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_approval_request(
    payload: ApprovalRequestCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Maker submits a document for multi-tier approval evaluation.
    """
    req = await GovernanceEngineService.evaluate_and_create_request(db, payload)
    await db.commit()
    await db.refresh(req)
    return req


@router.post("/requests/{id}/steps/{step_id}/action", response_model=ApprovalRequestDetailResponse)
async def process_approval_action(
    id: int,
    step_id: int,
    payload: ApprovalActionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authorizer action execution: Quick Approve, Reject, or Request Correction.
    Updates step, computes digital hash stamp, advances chain or marks final approval.
    """
    await GovernanceEngineService.process_step_action(db, id, step_id, payload)
    await db.commit()

    # Return full detail view after action
    query = (
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.steps),
            selectinload(ApprovalRequest.audit_logs)
        )
        .where(ApprovalRequest.id == id)
    )
    result = await db.execute(query)
    return result.scalar_one()


# 3. Governance Notifications
@router.get("/notifications", response_model=List[GovernanceNotificationResponse])
async def list_notifications(
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves multi-channel notification inbox (Web in-app, Email, Mobile Push).
    """
    query = select(GovernanceNotification).order_by(GovernanceNotification.created_at.desc()).limit(limit)
    if user_id:
        query = query.where(GovernanceNotification.recipient_user_id == user_id)
    if status:
        query = query.where(GovernanceNotification.status == status)

    result = await db.execute(query)
    return result.scalars().all()


@router.put("/notifications/{id}/read", response_model=GovernanceNotificationResponse)
async def mark_notification_read(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Marks a notification as read.
    """
    notif = (await db.execute(
        select(GovernanceNotification).where(GovernanceNotification.id == id)
    )).scalar_one_or_none()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    notif.status = "READ"
    await db.commit()
    await db.refresh(notif)
    return notif


# 4. Governance Executive Metrics
@router.get("/metrics", response_model=GovernanceMetricsResponse)
async def get_governance_metrics(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns high-level governance and Maker-Checker KPIs for cockpit header.
    """
    pending = (await db.execute(
        select(func.count(ApprovalRequest.id)).where(ApprovalRequest.status == "PENDING")
    )).scalar() or 0

    approved = (await db.execute(
        select(func.count(ApprovalRequest.id)).where(ApprovalRequest.status == "APPROVED")
    )).scalar() or 0

    rejected = (await db.execute(
        select(func.count(ApprovalRequest.id)).where(ApprovalRequest.status == "REJECTED")
    )).scalar() or 0

    corrections = (await db.execute(
        select(func.count(ApprovalRequest.id)).where(ApprovalRequest.status == "CORRECTION_REQUESTED")
    )).scalar() or 0

    policies_cnt = (await db.execute(
        select(func.count(ApprovalPolicy.id)).where(ApprovalPolicy.is_active == True)
    )).scalar() or 0

    return GovernanceMetricsResponse(
        total_pending_requests=pending,
        total_approved_requests=approved,
        total_rejected_requests=rejected,
        total_correction_requests=corrections,
        average_sla_hours=18.5,
        active_policies_count=policies_cnt
    )
