from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from typing import Optional, List
from datetime import datetime, date

from app.core.database import get_db
from app.modules.mobile_mgmt.models import (
    MobileMgmtKpi,
    MobileMgmtProject,
    MobileMgmtSalesAnalytics,
    MobileMgmtCashFlow,
    MobileMgmtApproval,
    MobileMgmtProcurement,
    MobileMgmtConstruction,
    MobileMgmtHrOverview,
    MobileMgmtCompliance,
    MobileMgmtReport
)
from app.modules.mobile_mgmt.schemas import (
    ProjectCreate, ProjectUpdate,
    SalesAnalyticsCreate, SalesAnalyticsUpdate,
    CashFlowCreate, CashFlowUpdate,
    ApprovalCreate, ApprovalAction,
    ProcurementCreate, ProcurementUpdate,
    ConstructionCreate, ConstructionUpdate,
    HrOverviewCreate, HrOverviewUpdate,
    ComplianceCreate, ComplianceUpdate,
    ReportCreate
)

router = APIRouter(prefix="/mobile-mgmt", tags=["Mobile Management App"])


# =========================================================================
# 1. Executive Dashboard KPIs
# =========================================================================
@router.get("/dashboard/metrics")
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    await _seed_defaults_if_empty(db)

    # Executive Aggregate totals
    rev_res = await db.execute(select(func.sum(MobileMgmtSalesAnalytics.actual_sales)))
    total_rev = rev_res.scalar() or 542000000.0

    cost_res = await db.execute(select(func.sum(MobileMgmtProject.actual_cost)))
    total_exp = cost_res.scalar() or 348000000.0

    net_prof = total_rev - total_exp
    margin = round((net_prof / total_rev) * 100, 1) if total_rev > 0 else 0

    return {
        "fiscal_period": "FY 2026-27",
        "total_revenue": total_rev,
        "total_expenses": total_exp,
        "net_profit": net_prof,
        "profit_margin_percentage": margin,
        "total_collections": 412500000.0,
        "outstanding_receivables": 129500000.0,
        "active_projects_count": 3,
        "total_workforce": 184,
        "pending_executive_approvals": 5,
        "currency": "BDT",
        "last_synced": datetime.now().isoformat()
    }


# =========================================================================
# 2. Project Performance
# =========================================================================
@router.get("/projects")
async def list_projects(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileMgmtProject)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileMgmtProject.project_name.ilike(s),
                MobileMgmtProject.location.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileMgmtProject.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileMgmtProject.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/projects")
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)):
    p = MobileMgmtProject(**payload.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@router.put("/projects/{project_id}")
async def update_project(project_id: int, payload: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(MobileMgmtProject).where(MobileMgmtProject.id == project_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/projects/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(MobileMgmtProject).where(MobileMgmtProject.id == project_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(p)
    await db.commit()
    return {"message": "Project removed", "id": project_id}


# =========================================================================
# 3. Sales Analytics
# =========================================================================
@router.get("/sales-analytics")
async def list_sales_analytics(
    search: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileMgmtSalesAnalytics)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(MobileMgmtSalesAnalytics.project_name.ilike(s))

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileMgmtSalesAnalytics.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/sales-analytics")
async def create_sales_analytics(payload: SalesAnalyticsCreate, db: AsyncSession = Depends(get_db)):
    s = MobileMgmtSalesAnalytics(**payload.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s


@router.put("/sales-analytics/{id}")
async def update_sales_analytics(id: int, payload: SalesAnalyticsUpdate, db: AsyncSession = Depends(get_db)):
    s = (await db.execute(select(MobileMgmtSalesAnalytics).where(MobileMgmtSalesAnalytics.id == id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    await db.commit()
    await db.refresh(s)
    return s


@router.delete("/sales-analytics/{id}")
async def delete_sales_analytics(id: int, db: AsyncSession = Depends(get_db)):
    s = (await db.execute(select(MobileMgmtSalesAnalytics).where(MobileMgmtSalesAnalytics.id == id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Record not found")
    await db.delete(s)
    await db.commit()
    return {"message": "Record deleted", "id": id}


# =========================================================================
# 4. Cash Flow Monitoring
# =========================================================================
@router.get("/cashflow")
async def list_cashflow(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileMgmtCashFlow)
    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileMgmtCashFlow.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/cashflow")
async def create_cashflow(payload: CashFlowCreate, db: AsyncSession = Depends(get_db)):
    cf = MobileMgmtCashFlow(**payload.model_dump())
    db.add(cf)
    await db.commit()
    await db.refresh(cf)
    return cf


@router.put("/cashflow/{id}")
async def update_cashflow(id: int, payload: CashFlowUpdate, db: AsyncSession = Depends(get_db)):
    cf = (await db.execute(select(MobileMgmtCashFlow).where(MobileMgmtCashFlow.id == id))).scalar_one_or_none()
    if not cf:
        raise HTTPException(status_code=404, detail="Cash flow record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cf, field, value)
    await db.commit()
    await db.refresh(cf)
    return cf


@router.delete("/cashflow/{id}")
async def delete_cashflow(id: int, db: AsyncSession = Depends(get_db)):
    cf = (await db.execute(select(MobileMgmtCashFlow).where(MobileMgmtCashFlow.id == id))).scalar_one_or_none()
    if not cf:
        raise HTTPException(status_code=404, detail="Cash flow record not found")
    await db.delete(cf)
    await db.commit()
    return {"message": "Cash flow record deleted", "id": id}


# =========================================================================
# 5. Executive Approval Center
# =========================================================================
@router.get("/approvals")
async def list_approvals(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileMgmtApproval)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileMgmtApproval.approval_code.ilike(s),
                MobileMgmtApproval.title.ilike(s),
                MobileMgmtApproval.project_name.ilike(s),
                MobileMgmtApproval.requested_by.ilike(s)
            )
        )
    if category and category != "ALL":
        query = query.where(MobileMgmtApproval.request_category == category)
    if status and status != "ALL":
        query = query.where(MobileMgmtApproval.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileMgmtApproval.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/approvals")
async def create_approval(payload: ApprovalCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileMgmtApproval.id)))).scalar() or 0
    code = f"EXEC-APP-2026-{(count + 1):04d}"
    appr = MobileMgmtApproval(
        approval_code=code,
        request_category=payload.request_category,
        title=payload.title,
        project_name=payload.project_name,
        requested_amount=payload.requested_amount,
        requested_by=payload.requested_by,
        priority=payload.priority,
        status="PENDING",
        executive_notes=payload.executive_notes
    )
    db.add(appr)
    await db.commit()
    await db.refresh(appr)
    return appr


@router.put("/approvals/{appr_id}/action")
async def action_approval(appr_id: int, payload: ApprovalAction, db: AsyncSession = Depends(get_db)):
    appr = (await db.execute(select(MobileMgmtApproval).where(MobileMgmtApproval.id == appr_id))).scalar_one_or_none()
    if not appr:
        raise HTTPException(status_code=404, detail="Approval request not found")
    appr.status = payload.status
    if payload.executive_notes:
        appr.executive_notes = payload.executive_notes
    await db.commit()
    await db.refresh(appr)
    return appr


@router.delete("/approvals/{appr_id}")
async def delete_approval(appr_id: int, db: AsyncSession = Depends(get_db)):
    appr = (await db.execute(select(MobileMgmtApproval).where(MobileMgmtApproval.id == appr_id))).scalar_one_or_none()
    if not appr:
        raise HTTPException(status_code=404, detail="Approval not found")
    await db.delete(appr)
    await db.commit()
    return {"message": "Approval removed", "id": appr_id}


# =========================================================================
# 6. Procurement Monitoring
# =========================================================================
@router.get("/procurement")
async def list_procurement(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileMgmtProcurement)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileMgmtProcurement.pr_code.ilike(s),
                MobileMgmtProcurement.material_description.ilike(s),
                MobileMgmtProcurement.project_name.ilike(s),
                MobileMgmtProcurement.vendor_selected.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileMgmtProcurement.po_status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileMgmtProcurement.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/procurement")
async def create_procurement(payload: ProcurementCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileMgmtProcurement.id)))).scalar() or 0
    code = f"PR-MON-2026-{(count + 1):04d}"
    item = MobileMgmtProcurement(
        pr_code=code,
        project_name=payload.project_name,
        material_description=payload.material_description,
        estimated_cost=payload.estimated_cost,
        lowest_quotation_cost=payload.lowest_quotation_cost,
        vendor_selected=payload.vendor_selected,
        po_status=payload.po_status
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/procurement/{id}")
async def update_procurement(id: int, payload: ProcurementUpdate, db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(MobileMgmtProcurement).where(MobileMgmtProcurement.id == id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/procurement/{id}")
async def delete_procurement(id: int, db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(MobileMgmtProcurement).where(MobileMgmtProcurement.id == id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Procurement item removed", "id": id}


# =========================================================================
# 7. Construction Monitoring
# =========================================================================
@router.get("/construction")
async def list_construction(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileMgmtConstruction)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileMgmtConstruction.milestone_code.ilike(s),
                MobileMgmtConstruction.project_name.ilike(s),
                MobileMgmtConstruction.milestone_name.ilike(s),
                MobileMgmtConstruction.contractor_name.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileMgmtConstruction.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileMgmtConstruction.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/construction")
async def create_construction(payload: ConstructionCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileMgmtConstruction.id)))).scalar() or 0
    code = f"C-MON-2026-{(count + 1):04d}"
    item = MobileMgmtConstruction(
        milestone_code=code,
        project_name=payload.project_name,
        milestone_name=payload.milestone_name,
        target_completion_date=payload.target_completion_date,
        delay_days=payload.delay_days,
        contractor_name=payload.contractor_name,
        contractor_performance_score=payload.contractor_performance_score,
        status=payload.status,
        critical_issues=payload.critical_issues
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/construction/{id}")
async def update_construction(id: int, payload: ConstructionUpdate, db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(MobileMgmtConstruction).where(MobileMgmtConstruction.id == id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Construction milestone not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/construction/{id}")
async def delete_construction(id: int, db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(MobileMgmtConstruction).where(MobileMgmtConstruction.id == id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Milestone not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Milestone removed", "id": id}


# =========================================================================
# 8. HR Overview
# =========================================================================
@router.get("/hr-overview")
async def list_hr_overview(
    search: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileMgmtHrOverview)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(MobileMgmtHrOverview.department_name.ilike(s))

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileMgmtHrOverview.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/hr-overview")
async def create_hr_overview(payload: HrOverviewCreate, db: AsyncSession = Depends(get_db)):
    hr = MobileMgmtHrOverview(**payload.model_dump())
    db.add(hr)
    await db.commit()
    await db.refresh(hr)
    return hr


@router.put("/hr-overview/{id}")
async def update_hr_overview(id: int, payload: HrOverviewUpdate, db: AsyncSession = Depends(get_db)):
    hr = (await db.execute(select(MobileMgmtHrOverview).where(MobileMgmtHrOverview.id == id))).scalar_one_or_none()
    if not hr:
        raise HTTPException(status_code=404, detail="HR record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(hr, field, value)
    await db.commit()
    await db.refresh(hr)
    return hr


@router.delete("/hr-overview/{id}")
async def delete_hr_overview(id: int, db: AsyncSession = Depends(get_db)):
    hr = (await db.execute(select(MobileMgmtHrOverview).where(MobileMgmtHrOverview.id == id))).scalar_one_or_none()
    if not hr:
        raise HTTPException(status_code=404, detail="HR record not found")
    await db.delete(hr)
    await db.commit()
    return {"message": "HR record removed", "id": id}


# =========================================================================
# 9. Compliance Alerts
# =========================================================================
@router.get("/compliance")
async def list_compliance(
    search: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileMgmtCompliance)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileMgmtCompliance.alert_code.ilike(s),
                MobileMgmtCompliance.compliance_type.ilike(s),
                MobileMgmtCompliance.authority_name.ilike(s),
                MobileMgmtCompliance.project_name.ilike(s)
            )
        )
    if risk_level and risk_level != "ALL":
        query = query.where(MobileMgmtCompliance.risk_level == risk_level)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(MobileMgmtCompliance.days_remaining).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/compliance")
async def create_compliance(payload: ComplianceCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileMgmtCompliance.id)))).scalar() or 0
    code = f"CMP-ALERT-2026-{(count + 1):04d}"
    item = MobileMgmtCompliance(
        alert_code=code,
        compliance_type=payload.compliance_type,
        authority_name=payload.authority_name,
        project_name=payload.project_name,
        expiry_date=payload.expiry_date,
        days_remaining=payload.days_remaining,
        risk_level=payload.risk_level,
        status=payload.status
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/compliance/{id}")
async def update_compliance(id: int, payload: ComplianceUpdate, db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(MobileMgmtCompliance).where(MobileMgmtCompliance.id == id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Alert not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/compliance/{id}")
async def delete_compliance(id: int, db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(MobileMgmtCompliance).where(MobileMgmtCompliance.id == id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Alert deleted", "id": id}


# =========================================================================
# 10. Reports & Notifications
# =========================================================================
@router.get("/reports")
async def list_reports(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileMgmtReport)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileMgmtReport.report_code.ilike(s),
                MobileMgmtReport.title.ilike(s),
                MobileMgmtReport.category.ilike(s)
            )
        )
    if category and category != "ALL":
        query = query.where(MobileMgmtReport.category == category)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileMgmtReport.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/reports")
async def create_report(payload: ReportCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileMgmtReport.id)))).scalar() or 0
    code = f"REP-EXEC-2026-{(count + 1):04d}"
    rep = MobileMgmtReport(
        report_code=code,
        title=payload.title,
        category=payload.category,
        format=payload.format,
        generation_date=payload.generation_date,
        generated_by=payload.generated_by,
        file_size=payload.file_size,
        download_url=payload.download_url or f"/downloads/{code}.pdf"
    )
    db.add(rep)
    await db.commit()
    await db.refresh(rep)
    return rep


@router.delete("/reports/{id}")
async def delete_report(id: int, db: AsyncSession = Depends(get_db)):
    rep = (await db.execute(select(MobileMgmtReport).where(MobileMgmtReport.id == id))).scalar_one_or_none()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(rep)
    await db.commit()
    return {"message": "Report deleted", "id": id}


# =========================================================================
# 11. Auth Session
# =========================================================================
@router.get("/auth/session")
async def get_mgmt_auth_session():
    return {
        "user_id": 101,
        "username": "managing.director",
        "full_name": "Engr. Maksudul Islam",
        "role_code": "MANAGING_DIRECTOR",
        "role_name": "Managing Director & Board Member",
        "governance_access": "EXECUTIVE_BOARD_LEVEL",
        "permissions": [
            "MGMT_VIEW_DASHBOARD",
            "MGMT_PROJECT_PERFORMANCE",
            "MGMT_SALES_ANALYTICS",
            "MGMT_CASHFLOW_MONITOR",
            "MGMT_APPROVAL_CENTER",
            "MGMT_PROCUREMENT_AUDIT",
            "MGMT_CONSTRUCTION_AUDIT",
            "MGMT_HR_OVERVIEW",
            "MGMT_COMPLIANCE_ALERTS",
            "MGMT_EXECUTIVE_REPORTS"
        ],
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mgmt_executive_token_2026",
        "token_type": "Bearer"
    }


# =========================================================================
# Seeder for demo data
# =========================================================================
async def _seed_defaults_if_empty(db: AsyncSession):
    count = (await db.execute(select(func.count(MobileMgmtProject.id)))).scalar() or 0
    if count > 0:
        return

    # Projects
    projects = [
        MobileMgmtProject(
            project_name="BlueOceans Marina Bay",
            location="Plot #14, Road #11, Banani, Dhaka",
            total_budget=450000000.0,
            actual_cost=210000000.0,
            cost_variance=-15000000.0,
            progress_percentage=68.5,
            estimated_revenue=680000000.0,
            projected_profitability_percentage=33.8,
            status="ON_SCHEDULE"
        ),
        MobileMgmtProject(
            project_name="BlueOceans Skyline",
            location="Block D, Bashundhara R/A, Dhaka",
            total_budget=320000000.0,
            actual_cost=118000000.0,
            cost_variance=8500000.0,
            progress_percentage=42.0,
            estimated_revenue=480000000.0,
            projected_profitability_percentage=31.2,
            status="DELAYED"
        ),
        MobileMgmtProject(
            project_name="BlueOceans Greenfield",
            location="Sector 18, Uttara, Dhaka",
            total_budget=180000000.0,
            actual_cost=20000000.0,
            cost_variance=0.0,
            progress_percentage=18.0,
            estimated_revenue=290000000.0,
            projected_profitability_percentage=37.9,
            status="IN_PROGRESS"
        )
    ]
    db.add_all(projects)

    # Sales Analytics
    sales = [
        MobileMgmtSalesAnalytics(
            project_name="BlueOceans Marina Bay",
            total_units=64,
            booked_units=48,
            available_units=16,
            sales_target=650000000.0,
            actual_sales=510000000.0,
            conversion_rate_percentage=75.0,
            average_price_per_sqft=14500.0
        ),
        MobileMgmtSalesAnalytics(
            project_name="BlueOceans Skyline",
            total_units=48,
            booked_units=28,
            available_units=20,
            sales_target=450000000.0,
            actual_sales=280000000.0,
            conversion_rate_percentage=58.3,
            average_price_per_sqft=11200.0
        ),
        MobileMgmtSalesAnalytics(
            project_name="BlueOceans Greenfield",
            total_units=40,
            booked_units=12,
            available_units=28,
            sales_target=250000000.0,
            actual_sales=78000000.0,
            conversion_rate_percentage=30.0,
            average_price_per_sqft=8500.0
        )
    ]
    db.add_all(sales)

    # Cash Flow
    cashflows = [
        MobileMgmtCashFlow(
            period_month="October 2026",
            receivables_due=42500000.0,
            payables_due=28000000.0,
            net_cash_position=38500000.0,
            projected_collections=36000000.0,
            actual_surplus_deficit=8000000.0
        ),
        MobileMgmtCashFlow(
            period_month="November 2026",
            receivables_due=48000000.0,
            payables_due=31500000.0,
            net_cash_position=41000000.0,
            projected_collections=40000000.0,
            actual_surplus_deficit=8500000.0
        )
    ]
    db.add_all(cashflows)

    # Approvals
    approvals = [
        MobileMgmtApproval(
            approval_code="EXEC-APP-2026-0001",
            request_category="PURCHASE_ORDER",
            title="500 MT BSRM 500W Deformed Steel Bar Procurement",
            project_name="BlueOceans Marina Bay",
            requested_amount=48500000.0,
            requested_by="Engr. Maksudul (Project Director)",
            priority="URGENT",
            status="PENDING",
            executive_notes="Negotiated 4% cash discount below market rate"
        ),
        MobileMgmtApproval(
            approval_code="EXEC-APP-2026-0002",
            request_category="BUDGET_REVISION",
            title="Substructure Piling Depth Extension Revision (Zone C)",
            project_name="BlueOceans Skyline",
            requested_amount=12000000.0,
            requested_by="Planning & BOQ Unit",
            priority="HIGH",
            status="PENDING",
            executive_notes="Geotechnical SPT report mandated deeper bedrock socketing"
        ),
        MobileMgmtApproval(
            approval_code="EXEC-APP-2026-0003",
            request_category="SPECIAL_DISCOUNT",
            title="Duplex Penthouse 7% Special Corporate Client Waiver",
            project_name="BlueOceans Marina Bay",
            requested_amount=3500000.0,
            requested_by="VP of Sales",
            priority="MEDIUM",
            status="APPROVED",
            executive_notes="Full 100% upfront payment within 15 days"
        )
    ]
    db.add_all(approvals)

    # Procurement
    procs = [
        MobileMgmtProcurement(
            pr_code="PR-MON-2026-0001",
            project_name="BlueOceans Marina Bay",
            material_description="Ready-Mix Concrete Grade M-35 (5,000 psi)",
            estimated_cost=24000000.0,
            lowest_quotation_cost=22800000.0,
            vendor_selected="Mir Ready Mix Ltd.",
            po_status="PO_ISSUED"
        ),
        MobileMgmtProcurement(
            pr_code="PR-MON-2026-0002",
            project_name="BlueOceans Skyline",
            material_description="High-Speed Passenger Elevators (Otis 13-person)",
            estimated_cost=36000000.0,
            lowest_quotation_cost=34500000.0,
            vendor_selected="Otis Elevator BD",
            po_status="PENDING_PO"
        )
    ]
    db.add_all(procs)

    # Construction
    consts = [
        MobileMgmtConstruction(
            milestone_code="C-MON-2026-0001",
            project_name="BlueOceans Marina Bay",
            milestone_name="Tower 1: 12th Floor RCC Slab Casting",
            target_completion_date="2026-11-15",
            delay_days=0,
            contractor_name="Unique Builders Ltd.",
            contractor_performance_score=94.5,
            status="ON_TRACK",
            critical_issues="None. Night curing proceeding on schedule"
        ),
        MobileMgmtConstruction(
            milestone_code="C-MON-2026-0002",
            project_name="BlueOceans Skyline",
            milestone_name="Basement 2 Retaining Wall Diaphragm",
            target_completion_date="2026-10-10",
            delay_days=18,
            contractor_name="National Geo Engineering",
            contractor_performance_score=78.0,
            status="DELAYED",
            critical_issues="Groundwater seepage during monsoon heavy rain"
        )
    ]
    db.add_all(consts)

    # HR Overview
    hr = [
        MobileMgmtHrOverview(
            department_name="Civil Engineering & Construction",
            total_headcount=86,
            present_today=82,
            on_leave=4,
            monthly_payroll_cost=3850000.0,
            pending_leave_requests=2
        ),
        MobileMgmtHrOverview(
            department_name="Sales & Customer Service",
            total_headcount=38,
            present_today=36,
            on_leave=2,
            monthly_payroll_cost=2100000.0,
            pending_leave_requests=1
        ),
        MobileMgmtHrOverview(
            department_name="Finance, Accounts & Credit Recovery",
            total_headcount=24,
            present_today=24,
            on_leave=0,
            monthly_payroll_cost=1650000.0,
            pending_leave_requests=0
        )
    ]
    db.add_all(hr)

    # Compliance
    comp = [
        MobileMgmtCompliance(
            alert_code="CMP-ALERT-2026-0001",
            compliance_type="RAJUK_APPROVAL",
            authority_name="RAJUK (Dhaka)",
            project_name="BlueOceans Marina Bay",
            expiry_date="2027-06-30",
            days_remaining=253,
            risk_level="LOW",
            status="ACTIVE"
        ),
        MobileMgmtCompliance(
            alert_code="CMP-ALERT-2026-0002",
            compliance_type="FIRE_LICENSE",
            authority_name="Fire Service & Civil Defence Directorate",
            project_name="BlueOceans Skyline",
            expiry_date="2026-11-20",
            days_remaining=31,
            risk_level="HIGH",
            status="IN_RENEWAL"
        ),
        MobileMgmtCompliance(
            alert_code="CMP-ALERT-2026-0003",
            compliance_type="ENVIRONMENT_CLEARANCE",
            authority_name="Department of Environment (DoE)",
            project_name="BlueOceans Greenfield",
            expiry_date="2026-12-15",
            days_remaining=56,
            risk_level="MEDIUM",
            status="ACTIVE"
        )
    ]
    db.add_all(comp)

    # Reports
    reps = [
        MobileMgmtReport(
            report_code="REP-EXEC-2026-0001",
            title="Q3 FY26 Board Executive Performance Summary",
            category="FINANCIAL",
            format="PDF",
            generation_date="2026-10-15",
            generated_by="Chief Financial Officer",
            file_size="4.2 MB",
            download_url="/downloads/REP-EXEC-2026-0001.pdf"
        ),
        MobileMgmtReport(
            report_code="REP-EXEC-2026-0002",
            title="Construction Progress EVM & S-Curve Audit",
            category="CONSTRUCTION",
            format="PDF",
            generation_date="2026-10-18",
            generated_by="Project Monitoring Unit",
            file_size="6.1 MB",
            download_url="/downloads/REP-EXEC-2026-0002.pdf"
        )
    ]
    db.add_all(reps)

    await db.commit()
