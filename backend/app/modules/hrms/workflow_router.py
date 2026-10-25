from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

from app.core.database import get_db, Base, engine
from app.modules.hrms.workflow_models import (
    HrmWorkflowMatrixRule,
    HrmWorkflowRequest,
    HrmWorkflowStep,
    HrmWorkflowDelegation,
    HrmWorkflowAuditLog
)
from app.modules.hrms.workflow_schemas import (
    HrmWorkflowMatrixRuleCreate,
    HrmWorkflowMatrixRuleUpdate,
    HrmWorkflowMatrixRuleOut,
    HrmWorkflowRequestCreate,
    HrmWorkflowRequestUpdate,
    HrmWorkflowRequestOut,
    HrmWorkflowActionPayload,
    HrmWorkflowDelegationCreate,
    HrmWorkflowDelegationUpdate,
    HrmWorkflowDelegationOut,
    HrmWorkflowAuditLogOut,
    PaginatedResponse
)

router = APIRouter(prefix="/workflow", tags=["HRMS Workflow & Approvals"])


async def seed_workflow_data_if_empty(db: AsyncSession):
    # Auto-create tables if they don't exist yet
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Check matrix rules
    r_count = (await db.execute(select(func.count(HrmWorkflowMatrixRule.id)))).scalar() or 0
    if r_count == 0:
        rules = [
            HrmWorkflowMatrixRule(
                rule_code="WFR-MAT-001",
                rule_title="Earned & Medical Leave Multi-Tier Rule",
                module_category="LEAVE",
                department_name=None,
                tier_level=1,
                step_name="Department Head Signoff",
                approver_designation="Department Head",
                approver_role="DEPT_HEAD",
                min_threshold=Decimal("1.0"),
                max_threshold=Decimal("3.0"),
                sla_hours=24,
                auto_escalate=False,
                is_mandatory=True,
                is_active=True
            ),
            HrmWorkflowMatrixRule(
                rule_code="WFR-MAT-002",
                rule_title="Long Leave & Medical Board Approval",
                module_category="LEAVE",
                department_name=None,
                tier_level=2,
                step_name="HR Director Approval",
                approver_designation="HR Director",
                approver_role="HR_HEAD",
                min_threshold=Decimal("4.0"),
                max_threshold=None,
                sla_hours=48,
                auto_escalate=True,
                is_mandatory=True,
                is_active=True
            ),
            HrmWorkflowMatrixRule(
                rule_code="WFR-MAT-003",
                rule_title="Site Engineer Overtime Verification",
                module_category="OVERTIME",
                department_name="Civil Project Site #4",
                tier_level=1,
                step_name="Site Project Manager Verification",
                approver_designation="Project Manager",
                approver_role="PROJECT_MGR",
                min_threshold=Decimal("1.0"),
                max_threshold=Decimal("15.0"),
                sla_hours=24,
                auto_escalate=False,
                is_mandatory=True,
                is_active=True
            ),
            HrmWorkflowMatrixRule(
                rule_code="WFR-MAT-004",
                rule_title="Executive Overtime & Allowance Authorization",
                module_category="OVERTIME",
                department_name=None,
                tier_level=2,
                step_name="Operations Director Sanction",
                approver_designation="Operations Director",
                approver_role="DIRECTOR",
                min_threshold=Decimal("16.0"),
                max_threshold=None,
                sla_hours=48,
                auto_escalate=True,
                is_mandatory=True,
                is_active=True
            ),
            HrmWorkflowMatrixRule(
                rule_code="WFR-MAT-005",
                rule_title="Missing Punch & Biometric Correction",
                module_category="ATTENDANCE",
                department_name=None,
                tier_level=1,
                step_name="Supervisor Regularization",
                approver_designation="Assistant Manager",
                approver_role="DEPT_HEAD",
                min_threshold=Decimal("1.0"),
                max_threshold=Decimal("5.0"),
                sla_hours=24,
                auto_escalate=False,
                is_mandatory=True,
                is_active=True
            ),
            HrmWorkflowMatrixRule(
                rule_code="WFR-MAT-006",
                rule_title="Manpower Requisition & Offer Sanction",
                module_category="RECRUITMENT",
                department_name=None,
                tier_level=1,
                step_name="COO Sanction",
                approver_designation="Chief Operating Officer",
                approver_role="COO",
                min_threshold=Decimal("0.0"),
                max_threshold=None,
                sla_hours=48,
                auto_escalate=False,
                is_mandatory=True,
                is_active=True
            ),
            HrmWorkflowMatrixRule(
                rule_code="WFR-MAT-007",
                rule_title="Promotional & Grade Salary Revision",
                module_category="SALARY_REVISION",
                department_name=None,
                tier_level=1,
                step_name="Managing Director Ratification",
                approver_designation="Managing Director",
                approver_role="MD",
                min_threshold=Decimal("0.0"),
                max_threshold=None,
                sla_hours=72,
                auto_escalate=False,
                is_mandatory=True,
                is_active=True
            ),
            HrmWorkflowMatrixRule(
                rule_code="WFR-MAT-008",
                rule_title="Monthly Payroll 4-Tier Batch Lock",
                module_category="PAYROLL",
                department_name="Human Resources",
                tier_level=1,
                step_name="Internal Audit Signoff",
                approver_designation="Internal Auditor",
                approver_role="AUDITOR",
                min_threshold=Decimal("0.0"),
                max_threshold=None,
                sla_hours=24,
                auto_escalate=False,
                is_mandatory=True,
                is_active=True
            ),
            HrmWorkflowMatrixRule(
                rule_code="WFR-MAT-009",
                rule_title="Expense & Site Claim Approval",
                module_category="EXPENSE",
                department_name=None,
                tier_level=1,
                step_name="Finance Manager Verification",
                approver_designation="Finance Manager",
                approver_role="FIN_MGR",
                min_threshold=Decimal("0.0"),
                max_threshold=Decimal("50000.0"),
                sla_hours=24,
                auto_escalate=False,
                is_mandatory=True,
                is_active=True
            )
        ]
        db.add_all(rules)
        await db.commit()

    # Check workflow requests
    q_count = (await db.execute(select(func.count(HrmWorkflowRequest.id)))).scalar() or 0
    if q_count == 0:
        req1 = HrmWorkflowRequest(
            request_number="WF-2026-901",
            module_category="OVERTIME",
            applicant_name="Engr. Kamal Hossain",
            department_name="Civil Project Site #4",
            designation="Site Engineer",
            subject="Site Concrete Casting Overtime Claim (12 hrs)",
            details_json={"hours": 12, "project": "BlueOceans Tower 1", "date": "2026-10-16"},
            financial_amount=Decimal("14400.00"),
            days_count=Decimal("1.5"),
            current_tier=1,
            total_tiers=2,
            current_approver_role="PROJECT_MGR",
            current_approver_name="Engr. Tareq Hasan",
            status="PENDING",
            priority="HIGH"
        )
        req2 = HrmWorkflowRequest(
            request_number="WF-2026-902",
            module_category="LEAVE",
            applicant_name="Sumaiya Akter",
            department_name="Accounts & Finance",
            designation="Senior Accountant",
            subject="Earned Leave (4 Days) for Medical Treatment",
            details_json={"leave_type": "EARNED_LEAVE", "start": "2026-10-20", "end": "2026-10-24"},
            financial_amount=Decimal("0.00"),
            days_count=Decimal("4.0"),
            current_tier=2,
            total_tiers=2,
            current_approver_role="HR_HEAD",
            current_approver_name="Farhana Ahmed",
            status="APPROVED",
            priority="NORMAL",
            final_action_date=datetime.utcnow(),
            final_action_by="Farhana Ahmed"
        )
        req3 = HrmWorkflowRequest(
            request_number="WF-2026-903",
            module_category="PAYROLL",
            applicant_name="HR Operations Team",
            department_name="Human Resources",
            designation="Payroll Officer",
            subject="October 2026 Monthly Payroll Batch (৳ 8,500,000)",
            details_json={"period": "2026-10", "headcount": 142},
            financial_amount=Decimal("8500000.00"),
            days_count=Decimal("30.0"),
            current_tier=1,
            total_tiers=3,
            current_approver_role="AUDITOR",
            current_approver_name="Internal Audit Board",
            status="PENDING",
            priority="URGENT"
        )
        req4 = HrmWorkflowRequest(
            request_number="WF-2026-904",
            module_category="ATTENDANCE",
            applicant_name="Mahmudur Rahman",
            department_name="Electrical & MEP",
            designation="MEP Supervisor",
            subject="Biometric Missing Punch Regularization (Out-punch missing)",
            details_json={"date": "2026-10-18", "type": "MISSING_OUT_PUNCH"},
            financial_amount=Decimal("0.00"),
            days_count=Decimal("1.0"),
            current_tier=1,
            total_tiers=1,
            current_approver_role="DEPT_HEAD",
            current_approver_name="Head of Engineering",
            status="APPROVED",
            priority="NORMAL",
            final_action_date=datetime.utcnow(),
            final_action_by="Head of Engineering"
        )
        req5 = HrmWorkflowRequest(
            request_number="WF-2026-905",
            module_category="RECRUITMENT",
            applicant_name="Talent Acquisition Lead",
            department_name="Human Resources",
            designation="HR Manager",
            subject="Manpower Requisition: 2 Senior Structural Engineers",
            details_json={"project": "Marina Bay Suites", "openings": 2, "budget_bdt": 240000},
            financial_amount=Decimal("240000.00"),
            days_count=Decimal("0.0"),
            current_tier=1,
            total_tiers=2,
            current_approver_role="COO",
            current_approver_name="Chief Operating Officer",
            status="PENDING",
            priority="HIGH"
        )
        req6 = HrmWorkflowRequest(
            request_number="WF-2026-906",
            module_category="SALARY_REVISION",
            applicant_name="HR Compensation Lead",
            department_name="Human Resources",
            designation="HR Manager",
            subject="Annual Appraisal Salary Revision for Project Operations (12 Staff)",
            details_json={"total_increment_pct": 12.5, "effective_from": "2026-11-01"},
            financial_amount=Decimal("185000.00"),
            days_count=Decimal("0.0"),
            current_tier=1,
            total_tiers=2,
            current_approver_role="MD",
            current_approver_name="Managing Director",
            status="PENDING",
            priority="NORMAL"
        )
        req7 = HrmWorkflowRequest(
            request_number="WF-2026-907",
            module_category="EXPENSE",
            applicant_name="Tariqul Islam",
            department_name="Project Office",
            designation="Project Director",
            subject="Site Boundary Dispute Legal Consultation & Survey Expense Claim",
            details_json={"expense_type": "SITE_LEGAL_SURVEY", "receipts_attached": 4},
            financial_amount=Decimal("38500.00"),
            days_count=Decimal("0.0"),
            current_tier=1,
            total_tiers=1,
            current_approver_role="FIN_MGR",
            current_approver_name="Finance Manager",
            status="PENDING",
            priority="NORMAL"
        )
        db.add_all([req1, req2, req3, req4, req5, req6, req7])
        await db.commit()

        # Add steps for req1
        step1 = HrmWorkflowStep(
            request_id=req1.id,
            tier_level=1,
            step_name="Project Manager Verification",
            required_role="PROJECT_MGR",
            approver_name="Engr. Tareq Hasan",
            status="PENDING"
        )
        step2 = HrmWorkflowStep(
            request_id=req1.id,
            tier_level=2,
            step_name="Operations Director Sanction",
            required_role="DIRECTOR",
            approver_name="Operations Director",
            status="PENDING"
        )
        db.add_all([step1, step2])

        # Add delegation
        del1 = HrmWorkflowDelegation(
            delegation_code="DEL-2026-001",
            delegator_name="Engr. Tareq Hasan",
            delegator_designation="Project Manager",
            delegatee_name="Engr. A. K. Azad",
            delegatee_designation="Senior Site Engineer",
            module_scope="OVERTIME",
            start_date=date(2026, 10, 15),
            end_date=date(2026, 10, 30),
            reason="Overseas structural equipment inspection tour",
            is_active=True
        )
        db.add(del1)

        # Add audit logs
        log1 = HrmWorkflowAuditLog(
            audit_ref="AUD-WF-001",
            request_number="WF-2026-902",
            event_type="SUBMIT",
            actor_name="Sumaiya Akter",
            actor_role="APPLICANT",
            tier_level=1,
            comments="Leave application submitted with medical prescription attached"
        )
        log2 = HrmWorkflowAuditLog(
            audit_ref="AUD-WF-002",
            request_number="WF-2026-902",
            event_type="FULLY_APPROVED",
            actor_name="Farhana Ahmed",
            actor_role="HR_HEAD",
            tier_level=2,
            comments="Leave verified and approved as per Bangladesh Labour Law sick leave quota"
        )
        db.add_all([log1, log2])
        await db.commit()


# =========================================================================
# 1. Approval Matrix Rules CRUD
# =========================================================================
@router.get("/matrix", response_model=PaginatedResponse)
async def list_matrix_rules(
    search: Optional[str] = None,
    category: Optional[str] = None,
    department: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_workflow_data_if_empty(db)
    q = select(HrmWorkflowMatrixRule)
    if category and category != "ALL":
        q = q.where(HrmWorkflowMatrixRule.module_category == category)
    if department and department != "ALL":
        q = q.where(HrmWorkflowMatrixRule.department_name == department)
    if search:
        s = f"%{search}%"
        q = q.where(
            or_(
                HrmWorkflowMatrixRule.rule_code.ilike(s),
                HrmWorkflowMatrixRule.rule_title.ilike(s),
                HrmWorkflowMatrixRule.approver_designation.ilike(s),
                HrmWorkflowMatrixRule.step_name.ilike(s)
            )
        )

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(HrmWorkflowMatrixRule.module_category, HrmWorkflowMatrixRule.tier_level).limit(limit).offset(offset)
    items = (await db.execute(q)).scalars().all()
    out_items = [HrmWorkflowMatrixRuleOut.model_validate(r).model_dump() for r in items]
    return PaginatedResponse(items=out_items, total=total, limit=limit, offset=offset)


@router.get("/matrix/{id}", response_model=HrmWorkflowMatrixRuleOut)
async def get_matrix_rule(id: int, db: AsyncSession = Depends(get_db)):
    rule = await db.get(HrmWorkflowMatrixRule, id)
    if not rule:
        raise HTTPException(status_code=404, detail="Matrix rule not found")
    return rule


@router.post("/matrix", response_model=HrmWorkflowMatrixRuleOut, status_code=status.HTTP_201_CREATED)
async def create_matrix_rule(payload: HrmWorkflowMatrixRuleCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    count = (await db.execute(select(func.count(HrmWorkflowMatrixRule.id)))).scalar() or 0
    data["rule_code"] = f"WFR-MAT-{count + 1:03d}"
    rule = HrmWorkflowMatrixRule(**data)
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.put("/matrix/{id}", response_model=HrmWorkflowMatrixRuleOut)
async def update_matrix_rule(id: int, payload: HrmWorkflowMatrixRuleUpdate, db: AsyncSession = Depends(get_db)):
    rule = await db.get(HrmWorkflowMatrixRule, id)
    if not rule:
        raise HTTPException(status_code=404, detail="Matrix rule not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(rule, k, v)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/matrix/{id}")
async def delete_matrix_rule(id: int, db: AsyncSession = Depends(get_db)):
    rule = await db.get(HrmWorkflowMatrixRule, id)
    if not rule:
        raise HTTPException(status_code=404, detail="Matrix rule not found")
    await db.delete(rule)
    await db.commit()
    return {"status": "SUCCESS", "message": f"Matrix rule {rule.rule_code} deleted successfully."}


# =========================================================================
# 2. Workflow Requests & Approvals
# =========================================================================
@router.get("/requests", response_model=PaginatedResponse)
async def list_workflow_requests(
    category: Optional[str] = None, # LEAVE, OVERTIME, ATTENDANCE, RECRUITMENT, SALARY_REVISION, PAYROLL, EXPENSE
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_workflow_data_if_empty(db)
    q = select(HrmWorkflowRequest).options(selectinload(HrmWorkflowRequest.steps))
    if category and category != "ALL":
        q = q.where(HrmWorkflowRequest.module_category == category)
    if status_filter and status_filter != "ALL":
        q = q.where(HrmWorkflowRequest.status == status_filter)
    if search:
        s = f"%{search}%"
        q = q.where(
            or_(
                HrmWorkflowRequest.request_number.ilike(s),
                HrmWorkflowRequest.applicant_name.ilike(s),
                HrmWorkflowRequest.subject.ilike(s),
                HrmWorkflowRequest.department_name.ilike(s)
            )
        )

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(desc(HrmWorkflowRequest.id)).limit(limit).offset(offset)
    items = (await db.execute(q)).scalars().all()
    out_items = [HrmWorkflowRequestOut.model_validate(r).model_dump() for r in items]
    return PaginatedResponse(items=out_items, total=total, limit=limit, offset=offset)


@router.get("/requests/{id}", response_model=HrmWorkflowRequestOut)
async def get_workflow_request(id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(HrmWorkflowRequest).options(selectinload(HrmWorkflowRequest.steps)).where(HrmWorkflowRequest.id == id)
    res = await db.execute(stmt)
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Workflow request not found")
    return req


@router.post("/requests", response_model=HrmWorkflowRequestOut, status_code=status.HTTP_201_CREATED)
async def create_workflow_request(payload: HrmWorkflowRequestCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    notes = data.pop("notes", None)
    count = (await db.execute(select(func.count(HrmWorkflowRequest.id)))).scalar() or 0
    data["request_number"] = f"WF-2026-{count + 901:03d}"
    data["current_tier"] = 1
    data["status"] = "PENDING"

    req = HrmWorkflowRequest(**data)
    db.add(req)
    await db.commit()
    await db.refresh(req)

    # Automatically create steps based on matrix rules for this category
    rule_stmt = select(HrmWorkflowMatrixRule).where(
        HrmWorkflowMatrixRule.module_category == req.module_category,
        HrmWorkflowMatrixRule.is_active == True
    ).order_by(HrmWorkflowMatrixRule.tier_level)
    matched_rules = (await db.execute(rule_stmt)).scalars().all()

    if matched_rules:
        req.total_tiers = len(matched_rules)
        for rule in matched_rules:
            step = HrmWorkflowStep(
                request_id=req.id,
                tier_level=rule.tier_level,
                step_name=rule.step_name,
                required_role=rule.approver_role,
                approver_name=rule.approver_designation,
                status="PENDING"
            )
            db.add(step)
        req.current_approver_role = matched_rules[0].approver_role
        req.current_approver_name = matched_rules[0].approver_designation
    else:
        req.total_tiers = 1
        step = HrmWorkflowStep(
            request_id=req.id,
            tier_level=1,
            step_name=f"{req.module_category} Approval",
            required_role="DEPT_HEAD",
            approver_name="Department Head",
            status="PENDING"
        )
        db.add(step)
        req.current_approver_role = "DEPT_HEAD"
        req.current_approver_name = "Department Head"

    # Add audit log
    audit = HrmWorkflowAuditLog(
        audit_ref=f"AUD-{req.request_number}-01",
        request_number=req.request_number,
        event_type="SUBMIT",
        actor_name=req.applicant_name,
        actor_role="APPLICANT",
        tier_level=1,
        comments=notes or f"Application submitted for {req.subject}"
    )
    db.add(audit)
    await db.commit()
    await db.refresh(req)

    # Reload with steps
    stmt = select(HrmWorkflowRequest).options(selectinload(HrmWorkflowRequest.steps)).where(HrmWorkflowRequest.id == req.id)
    return (await db.execute(stmt)).scalars().first()


@router.put("/requests/{id}", response_model=HrmWorkflowRequestOut)
async def update_workflow_request(id: int, payload: HrmWorkflowRequestUpdate, db: AsyncSession = Depends(get_db)):
    req = await db.get(HrmWorkflowRequest, id)
    if not req:
        raise HTTPException(status_code=404, detail="Workflow request not found")
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="Cannot edit a request that is already processed")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(req, k, v)
    await db.commit()
    await db.refresh(req)
    stmt = select(HrmWorkflowRequest).options(selectinload(HrmWorkflowRequest.steps)).where(HrmWorkflowRequest.id == req.id)
    return (await db.execute(stmt)).scalars().first()


@router.post("/requests/{id}/action", response_model=HrmWorkflowRequestOut)
async def process_workflow_action(id: int, payload: HrmWorkflowActionPayload, db: AsyncSession = Depends(get_db)):
    stmt = select(HrmWorkflowRequest).options(selectinload(HrmWorkflowRequest.steps)).where(HrmWorkflowRequest.id == id)
    res = await db.execute(stmt)
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Workflow request not found")
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Request is already in '{req.status}' state")

    current_tier = req.current_tier
    # Find step for current tier
    current_step = next((s for s in req.steps if s.tier_level == current_tier and s.status == "PENDING"), None)

    if payload.action == "APPROVE":
        if current_step:
            current_step.status = "APPROVED"
            current_step.action_date = datetime.utcnow()
            current_step.action_by = payload.approver_name
            current_step.comments = payload.comments

        # Check if next tier exists
        next_step = next((s for s in req.steps if s.tier_level == current_tier + 1), None)
        if next_step:
            req.current_tier += 1
            req.current_approver_role = next_step.required_role
            req.current_approver_name = next_step.approver_name or next_step.required_role
            audit_event = "TIER_APPROVED"
        else:
            req.status = "APPROVED"
            req.final_action_date = datetime.utcnow()
            req.final_action_by = payload.approver_name
            audit_event = "FULLY_APPROVED"

    elif payload.action == "REJECT":
        if current_step:
            current_step.status = "REJECTED"
            current_step.action_date = datetime.utcnow()
            current_step.action_by = payload.approver_name
            current_step.comments = payload.comments
        req.status = "REJECTED"
        req.rejection_reason = payload.comments or "Rejected by reviewer"
        req.final_action_date = datetime.utcnow()
        req.final_action_by = payload.approver_name
        audit_event = "REJECTED"

    elif payload.action == "REQUEST_CORRECTION":
        req.status = "CORRECTION_REQUESTED"
        req.rejection_reason = payload.comments or "Additional information required"
        audit_event = "CORRECTION_REQUESTED"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action '{payload.action}'")

    audit = HrmWorkflowAuditLog(
        audit_ref=f"AUD-{req.request_number}-{int(datetime.utcnow().timestamp()) % 10000:04d}",
        request_number=req.request_number,
        event_type=audit_event,
        actor_name=payload.approver_name or "Authorized Approver",
        actor_role=payload.approver_role or "REVIEWER",
        tier_level=current_tier,
        comments=payload.comments or f"Workflow {payload.action}"
    )
    db.add(audit)
    await db.commit()
    await db.refresh(req)

    stmt = select(HrmWorkflowRequest).options(selectinload(HrmWorkflowRequest.steps)).where(HrmWorkflowRequest.id == req.id)
    return (await db.execute(stmt)).scalars().first()


# =========================================================================
# 3. Delegations CRUD
# =========================================================================
@router.get("/delegations", response_model=PaginatedResponse)
async def list_delegations(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_workflow_data_if_empty(db)
    q = select(HrmWorkflowDelegation)
    if search:
        s = f"%{search}%"
        q = q.where(
            or_(
                HrmWorkflowDelegation.delegation_code.ilike(s),
                HrmWorkflowDelegation.delegator_name.ilike(s),
                HrmWorkflowDelegation.delegatee_name.ilike(s)
            )
        )
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(desc(HrmWorkflowDelegation.id)).limit(limit).offset(offset)
    items = (await db.execute(q)).scalars().all()
    out_items = [HrmWorkflowDelegationOut.model_validate(d).model_dump() for d in items]
    return PaginatedResponse(items=out_items, total=total, limit=limit, offset=offset)


@router.get("/delegations/{id}", response_model=HrmWorkflowDelegationOut)
async def get_delegation(id: int, db: AsyncSession = Depends(get_db)):
    d = await db.get(HrmWorkflowDelegation, id)
    if not d:
        raise HTTPException(status_code=404, detail="Delegation record not found")
    return d


@router.post("/delegations", response_model=HrmWorkflowDelegationOut, status_code=status.HTTP_201_CREATED)
async def create_delegation(payload: HrmWorkflowDelegationCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    count = (await db.execute(select(func.count(HrmWorkflowDelegation.id)))).scalar() or 0
    data["delegation_code"] = f"DEL-2026-{count + 1:03d}"
    delg = HrmWorkflowDelegation(**data)
    db.add(delg)
    await db.commit()
    await db.refresh(delg)
    return delg


@router.put("/delegations/{id}", response_model=HrmWorkflowDelegationOut)
async def update_delegation(id: int, payload: HrmWorkflowDelegationUpdate, db: AsyncSession = Depends(get_db)):
    delg = await db.get(HrmWorkflowDelegation, id)
    if not delg:
        raise HTTPException(status_code=404, detail="Delegation record not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(delg, k, v)
    await db.commit()
    await db.refresh(delg)
    return delg


@router.delete("/delegations/{id}")
async def delete_delegation(id: int, db: AsyncSession = Depends(get_db)):
    delg = await db.get(HrmWorkflowDelegation, id)
    if not delg:
        raise HTTPException(status_code=404, detail="Delegation record not found")
    await db.delete(delg)
    await db.commit()
    return {"status": "SUCCESS", "message": f"Delegation {delg.delegation_code} deleted successfully."}


# =========================================================================
# 4. History / Audit Logs
# =========================================================================
@router.get("/history", response_model=PaginatedResponse)
async def list_audit_history(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_workflow_data_if_empty(db)
    q = select(HrmWorkflowAuditLog)
    if search:
        s = f"%{search}%"
        q = q.where(
            or_(
                HrmWorkflowAuditLog.request_number.ilike(s),
                HrmWorkflowAuditLog.actor_name.ilike(s),
                HrmWorkflowAuditLog.event_type.ilike(s),
                HrmWorkflowAuditLog.comments.ilike(s)
            )
        )
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(desc(HrmWorkflowAuditLog.id)).limit(limit).offset(offset)
    items = (await db.execute(q)).scalars().all()
    out_items = [HrmWorkflowAuditLogOut.model_validate(l).model_dump() for l in items]
    return PaginatedResponse(items=out_items, total=total, limit=limit, offset=offset)


# =========================================================================
# 5. Metadata for Dynamic Searchable Dropdowns
# =========================================================================
@router.get("/metadata")
async def get_workflow_metadata(db: AsyncSession = Depends(get_db)):
    return {
        "categories": [
            {"value": "LEAVE", "label": "Leave Approval"},
            {"value": "OVERTIME", "label": "Overtime Signoff"},
            {"value": "ATTENDANCE", "label": "Attendance Regularization"},
            {"value": "RECRUITMENT", "label": "Recruitment & Offer"},
            {"value": "SALARY_REVISION", "label": "Salary Revision"},
            {"value": "PAYROLL", "label": "Payroll Final Approval"},
            {"value": "EXPENSE", "label": "Expense & Claim"}
        ],
        "statuses": [
            {"value": "ALL", "label": "All Statuses"},
            {"value": "PENDING", "label": "Pending Approval"},
            {"value": "APPROVED", "label": "Approved / Cleared"},
            {"value": "REJECTED", "label": "Rejected"},
            {"value": "CORRECTION_REQUESTED", "label": "Correction Requested"}
        ],
        "roles": [
            {"value": "DEPT_HEAD", "label": "Department Head"},
            {"value": "PROJECT_MGR", "label": "Project Manager"},
            {"value": "HR_HEAD", "label": "HR Director / Head"},
            {"value": "FIN_MGR", "label": "Finance Manager"},
            {"value": "AUDITOR", "label": "Internal Auditor"},
            {"value": "COO", "label": "Chief Operating Officer"},
            {"value": "DIRECTOR", "label": "Director of Operations"},
            {"value": "MD", "label": "Managing Director"}
        ],
        "departments": [
            {"value": "Engineering & Site Operations", "label": "Engineering & Site Operations"},
            {"value": "Civil Project Site #4", "label": "Civil Project Site #4"},
            {"value": "Electrical & MEP", "label": "Electrical & MEP"},
            {"value": "Accounts & Finance", "label": "Accounts & Finance"},
            {"value": "Human Resources", "label": "Human Resources"},
            {"value": "Sales & Marketing", "label": "Sales & Marketing"},
            {"value": "Procurement & Supply Chain", "label": "Procurement & Supply Chain"}
        ],
        "designations": [
            {"value": "Managing Director", "label": "Managing Director"},
            {"value": "Chief Operating Officer", "label": "Chief Operating Officer"},
            {"value": "Project Director", "label": "Project Director"},
            {"value": "Project Manager", "label": "Project Manager"},
            {"value": "Site Engineer", "label": "Site Engineer"},
            {"value": "HR Manager", "label": "HR Manager"},
            {"value": "Finance Manager", "label": "Finance Manager"},
            {"value": "Senior Accountant", "label": "Senior Accountant"},
            {"value": "Internal Auditor", "label": "Internal Auditor"}
        ],
        "priorities": [
            {"value": "LOW", "label": "Low"},
            {"value": "NORMAL", "label": "Normal"},
            {"value": "HIGH", "label": "High"},
            {"value": "URGENT", "label": "Urgent"}
        ]
    }
