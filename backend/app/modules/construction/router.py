import logging
from typing import List, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_, desc

from app.core.database import get_db
from app.modules.projects.models import Project, Tower, BOQItem
from app.modules.projects.schemas import BOQItemResponse
from app.modules.auth.models import User
from app.modules.construction.models import (
    Subcontractor, DPRReport, LaborMuster, WorkOrder, RABill,
    ConcreteCubeTest, SafetyNCR, WBSNode, VariationOrder, JointMeasurementSheet
)
from app.modules.construction.schemas import (
    SubcontractorCreate, SubcontractorResponse,
    DPRReportCreate, DPRReportResponse,
    LaborMusterCreate, LaborMusterResponse,
    WorkOrderCreate, WorkOrderResponse,
    RABillCreate, RABillResponse, RABillApprovalRequest,
    ConstructionMetrics,
    ConcreteCubeTestCreate, ConcreteCubeTestResponse, ConcreteCubeTestRecordUpdate, CubeTestNotificationAlert,
    SafetyNCRCreate, SafetyNCRResponse, SafetyNCRRectify, SafetyNCRVerifyClose,
    WBSNodeCreate, WBSNodeResponse, WBSNodeUpdateProgress,
    VariationOrderCreate, VariationOrderResponse, VariationOrderApprove,
    JointMeasurementSheetCreate, JointMeasurementSheetResponse,
    BOQRequisitionCheckRequest, BOQRequisitionCheckResponse
)
from app.modules.accounts.services import post_ra_bill_voucher

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/construction", tags=["Construction Operations, QA & RA Billing"])



# --------------------------------------------------------------------------
# 1. Subcontractors Master
# --------------------------------------------------------------------------
@router.get("/contractors", response_model=List[SubcontractorResponse])
async def list_contractors(
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns paginated list of registered trade contractors (Civil, Masonry, Plumbing, etc.).
    """
    stmt = select(Subcontractor).order_by(Subcontractor.company_name.asc())
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(or_(
            Subcontractor.company_name.ilike(s),
            Subcontractor.contractor_code.ilike(s),
            Subcontractor.trade_specialization.ilike(s),
            Subcontractor.contact_person.ilike(s)
        ))
    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/contractors/{contractor_id}", response_model=SubcontractorResponse)
async def get_contractor(contractor_id: int, db: AsyncSession = Depends(get_db)):
    """Fetches a single subcontractor by ID."""
    res = await db.execute(select(Subcontractor).where(Subcontractor.id == contractor_id))
    contractor = res.scalar_one_or_none()
    if not contractor:
        raise HTTPException(status_code=404, detail="Subcontractor not found")
    return contractor


@router.post("/contractors", response_model=SubcontractorResponse, status_code=status.HTTP_201_CREATED)
async def create_contractor(
    payload: SubcontractorCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new trade subcontractor.
    """
    count_res = await db.execute(select(func.count(Subcontractor.id)))
    next_num = (count_res.scalar() or 0) + 1
    code = f"CONT-{next_num:04d}"

    contractor = Subcontractor(
        contractor_code=code,
        company_name=payload.company_name,
        trade_specialization=payload.trade_specialization,
        contact_person=payload.contact_person,
        primary_phone=payload.primary_phone,
        tin_number=payload.tin_number,
        bin_number=payload.bin_number
    )
    db.add(contractor)
    await db.commit()
    await db.refresh(contractor)
    return contractor


@router.put("/contractors/{contractor_id}", response_model=SubcontractorResponse)
async def update_contractor(
    contractor_id: int,
    payload: SubcontractorCreate,
    db: AsyncSession = Depends(get_db)
):
    """Updates an existing trade subcontractor."""
    res = await db.execute(select(Subcontractor).where(Subcontractor.id == contractor_id))
    contractor = res.scalar_one_or_none()
    if not contractor:
        raise HTTPException(status_code=404, detail="Subcontractor not found")

    contractor.company_name = payload.company_name
    contractor.trade_specialization = payload.trade_specialization
    contractor.contact_person = payload.contact_person
    contractor.primary_phone = payload.primary_phone
    contractor.tin_number = payload.tin_number
    contractor.bin_number = payload.bin_number

    await db.commit()
    await db.refresh(contractor)
    return contractor


# --------------------------------------------------------------------------
# 2. Daily Progress Report (DPR) Site Diary
# --------------------------------------------------------------------------
@router.get("/dpr", response_model=List[DPRReportResponse])
async def list_dpr_reports(
    project_id: Optional[int] = None,
    report_date: Optional[date] = None,
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of Daily Progress Reports (DPR) with labor muster roll records, supports pagination and search.
    """
    stmt = (
        select(DPRReport)
        .options(
            selectinload(DPRReport.project),
            selectinload(DPRReport.tower),
            selectinload(DPRReport.site_engineer),
            selectinload(DPRReport.labor_entries).selectinload(LaborMuster.contractor)
        )
        .order_by(DPRReport.report_date.desc(), DPRReport.id.desc())
    )

    if project_id:
        stmt = stmt.where(DPRReport.project_id == project_id)
    if report_date:
        stmt = stmt.where(DPRReport.report_date == report_date)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(or_(
            DPRReport.structural_activity_summary.ilike(s),
            DPRReport.floor_unit_location.ilike(s),
            DPRReport.machinery_deployed.ilike(s)
        ))

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    reports = result.scalars().all()

    responses = []
    for rep in reports:
        resp = DPRReportResponse.model_validate(rep)
        resp.project_name = rep.project.project_name if rep.project else None
        resp.tower_name = rep.tower.tower_name if rep.tower else None
        resp.site_engineer_name = rep.site_engineer.full_name_en if rep.site_engineer else None
        
        # Map labor entries
        labor_list = []
        for lab in rep.labor_entries:
            lr = LaborMusterResponse.model_validate(lab)
            lr.contractor_name = lab.contractor.company_name if lab.contractor else None
            labor_list.append(lr)
        resp.labor_entries = labor_list
        responses.append(resp)

    return responses


@router.get("/dpr/{dpr_id}", response_model=DPRReportResponse)
async def get_dpr_report(dpr_id: int, db: AsyncSession = Depends(get_db)):
    """Fetches a single DPR report with all labor entries and site data."""
    stmt = (
        select(DPRReport)
        .options(
            selectinload(DPRReport.project),
            selectinload(DPRReport.tower),
            selectinload(DPRReport.site_engineer),
            selectinload(DPRReport.labor_entries).selectinload(LaborMuster.contractor)
        )
        .where(DPRReport.id == dpr_id)
    )
    res = await db.execute(stmt)
    saved = res.scalars().first()
    if not saved:
        raise HTTPException(status_code=404, detail="DPR report not found")

    resp = DPRReportResponse.model_validate(saved)
    resp.project_name = saved.project.project_name if saved.project else None
    resp.tower_name = saved.tower.tower_name if saved.tower else None
    resp.site_engineer_name = saved.site_engineer.full_name_en if saved.site_engineer else None
    labor_list = []
    for lab in saved.labor_entries:
        lr = LaborMusterResponse.model_validate(lab)
        lr.contractor_name = lab.contractor.company_name if lab.contractor else None
        labor_list.append(lr)
    resp.labor_entries = labor_list
    return resp


@router.post("/dpr", response_model=DPRReportResponse, status_code=status.HTTP_201_CREATED)
async def create_dpr_report(
    payload: DPRReportCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Logs a new Construction Site Diary Daily Progress Report (DPR) with nested labor muster.
    """
    user_res = await db.execute(select(User).order_by(User.id.asc()))
    eng = user_res.scalars().first()

    dpr = DPRReport(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        wbs_node_id=payload.wbs_node_id,
        report_date=payload.report_date or date.today(),
        weather_condition_id=payload.weather_condition_id or "SUNNY",
        site_engineer_id=eng.id if eng else None,
        structural_activity_summary=payload.structural_activity_summary,
        floor_unit_location=payload.floor_unit_location,
        machinery_deployed=payload.machinery_deployed,
        site_photos=payload.site_photos or [],
        safety_incident_logged=bool(payload.safety_incident_logged),
        safety_incident_notes=payload.safety_incident_notes,
        concrete_casting_cft=payload.concrete_casting_cft or 0.0,
        steel_rod_consumed_mt=payload.steel_rod_consumed_mt or 0.0,
        cement_consumed_bags=payload.cement_consumed_bags or 0,
        total_workers_onsite=payload.total_workers_onsite or 0,
        status="SUBMITTED"
    )
    db.add(dpr)
    await db.flush()

    total_headcount = 0
    if payload.labor_entries:
        for lab in payload.labor_entries:
            rate = lab.daily_wage_rate or 800.00
            tot_wage = lab.worker_count * rate
            total_headcount += lab.worker_count
            entry = LaborMuster(
                dpr_id=dpr.id,
                contractor_id=lab.contractor_id,
                trade_category=lab.trade_category,
                worker_count=lab.worker_count,
                daily_wage_rate=rate,
                total_wage=tot_wage
            )
            db.add(entry)
        dpr.total_workers_onsite = total_headcount

    await db.commit()

    # Re-fetch eager loaded response
    res = await db.execute(
        select(DPRReport)
        .options(
            selectinload(DPRReport.project),
            selectinload(DPRReport.tower),
            selectinload(DPRReport.site_engineer),
            selectinload(DPRReport.labor_entries).selectinload(LaborMuster.contractor)
        )
        .where(DPRReport.id == dpr.id)
    )
    saved = res.scalars().first()
    resp = DPRReportResponse.model_validate(saved)
    resp.project_name = saved.project.project_name if saved.project else None
    resp.tower_name = saved.tower.tower_name if saved.tower else None
    resp.site_engineer_name = saved.site_engineer.full_name_en if saved.site_engineer else None
    labor_list = []
    for lab in saved.labor_entries:
        lr = LaborMusterResponse.model_validate(lab)
        lr.contractor_name = lab.contractor.company_name if lab.contractor else None
        labor_list.append(lr)
    resp.labor_entries = labor_list
    return resp


@router.put("/dpr/{dpr_id}", response_model=DPRReportResponse)
async def update_dpr_report(
    dpr_id: int,
    payload: DPRReportCreate,
    db: AsyncSession = Depends(get_db)
):
    """Updates an existing DPR report and replaces its labor muster roll."""
    stmt = select(DPRReport).where(DPRReport.id == dpr_id)
    res = await db.execute(stmt)
    dpr = res.scalar_one_or_none()
    if not dpr:
        raise HTTPException(status_code=404, detail="DPR report not found")

    dpr.project_id = payload.project_id
    dpr.tower_id = payload.tower_id
    dpr.wbs_node_id = payload.wbs_node_id
    if payload.report_date:
        dpr.report_date = payload.report_date
    dpr.weather_condition_id = payload.weather_condition_id or "SUNNY"
    dpr.structural_activity_summary = payload.structural_activity_summary
    dpr.floor_unit_location = payload.floor_unit_location
    dpr.machinery_deployed = payload.machinery_deployed
    dpr.site_photos = payload.site_photos or []
    dpr.safety_incident_logged = bool(payload.safety_incident_logged)
    dpr.safety_incident_notes = payload.safety_incident_notes
    dpr.concrete_casting_cft = payload.concrete_casting_cft or 0.0
    dpr.steel_rod_consumed_mt = payload.steel_rod_consumed_mt or 0.0
    dpr.cement_consumed_bags = payload.cement_consumed_bags or 0

    # Delete existing labor entries and replace
    await db.execute(delete(LaborMuster).where(LaborMuster.dpr_id == dpr.id))
    total_headcount = 0
    if payload.labor_entries:
        for lab in payload.labor_entries:
            rate = lab.daily_wage_rate or 800.00
            tot_wage = lab.worker_count * rate
            total_headcount += lab.worker_count
            entry = LaborMuster(
                dpr_id=dpr.id,
                contractor_id=lab.contractor_id,
                trade_category=lab.trade_category,
                worker_count=lab.worker_count,
                daily_wage_rate=rate,
                total_wage=tot_wage
            )
            db.add(entry)
    dpr.total_workers_onsite = total_headcount

    await db.commit()

    # Re-fetch eager loaded response
    res = await db.execute(
        select(DPRReport)
        .options(
            selectinload(DPRReport.project),
            selectinload(DPRReport.tower),
            selectinload(DPRReport.site_engineer),
            selectinload(DPRReport.labor_entries).selectinload(LaborMuster.contractor)
        )
        .where(DPRReport.id == dpr.id)
    )
    saved = res.scalars().first()
    resp = DPRReportResponse.model_validate(saved)
    resp.project_name = saved.project.project_name if saved.project else None
    resp.tower_name = saved.tower.tower_name if saved.tower else None
    resp.site_engineer_name = saved.site_engineer.full_name_en if saved.site_engineer else None
    labor_list = []
    for lab in saved.labor_entries:
        lr = LaborMusterResponse.model_validate(lab)
        lr.contractor_name = lab.contractor.company_name if lab.contractor else None
        labor_list.append(lr)
    resp.labor_entries = labor_list
    return resp


@router.delete("/dpr/{dpr_id}")
async def delete_dpr_report(dpr_id: int, db: AsyncSession = Depends(get_db)):
    """Deletes a DPR report and cascading labor muster records."""
    stmt = select(DPRReport).where(DPRReport.id == dpr_id)
    res = await db.execute(stmt)
    dpr = res.scalar_one_or_none()
    if not dpr:
        raise HTTPException(status_code=404, detail="DPR report not found")
    await db.delete(dpr)
    await db.commit()
    return {"message": "DPR report deleted successfully"}


# --------------------------------------------------------------------------
# 2.1 Subcontractor Labor Muster Roll Standalone CRUD
# --------------------------------------------------------------------------
@router.get("/labor-muster", response_model=List[LaborMusterResponse])
async def list_labor_muster(
    dpr_id: Optional[int] = Query(None),
    contractor_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists Subcontractor Labor Muster Roll entries with pagination and contractor details.
    """
    stmt = (
        select(LaborMuster)
        .options(selectinload(LaborMuster.contractor))
        .order_by(LaborMuster.id.desc())
    )
    if dpr_id:
        stmt = stmt.where(LaborMuster.dpr_id == dpr_id)
    if contractor_id:
        stmt = stmt.where(LaborMuster.contractor_id == contractor_id)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(LaborMuster.trade_category.ilike(s))

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    entries = result.scalars().all()

    responses = []
    for e in entries:
        resp = LaborMusterResponse.model_validate(e)
        resp.contractor_name = e.contractor.company_name if e.contractor else None
        responses.append(resp)
    return responses


@router.get("/labor-muster/{labor_id}", response_model=LaborMusterResponse)
async def get_labor_muster(labor_id: int, db: AsyncSession = Depends(get_db)):
    """Fetches a single labor muster roll record."""
    stmt = select(LaborMuster).options(selectinload(LaborMuster.contractor)).where(LaborMuster.id == labor_id)
    res = await db.execute(stmt)
    entry = res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Labor muster record not found")
    resp = LaborMusterResponse.model_validate(entry)
    resp.contractor_name = entry.contractor.company_name if entry.contractor else None
    return resp


@router.post("/labor-muster", response_model=LaborMusterResponse, status_code=status.HTTP_201_CREATED)
async def create_labor_muster(
    payload: LaborMusterCreate,
    db: AsyncSession = Depends(get_db)
):
    """Creates a new labor muster record."""
    rate = payload.daily_wage_rate or 800.00
    tot_wage = payload.worker_count * rate
    entry = LaborMuster(
        dpr_id=payload.dpr_id,
        contractor_id=payload.contractor_id,
        trade_category=payload.trade_category,
        worker_count=payload.worker_count,
        daily_wage_rate=rate,
        total_wage=tot_wage
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    res = await db.execute(select(LaborMuster).options(selectinload(LaborMuster.contractor)).where(LaborMuster.id == entry.id))
    saved = res.scalar_one()
    resp = LaborMusterResponse.model_validate(saved)
    resp.contractor_name = saved.contractor.company_name if saved.contractor else None
    return resp


@router.put("/labor-muster/{labor_id}", response_model=LaborMusterResponse)
async def update_labor_muster(
    labor_id: int,
    payload: LaborMusterCreate,
    db: AsyncSession = Depends(get_db)
):
    """Updates an existing labor muster record."""
    res = await db.execute(select(LaborMuster).where(LaborMuster.id == labor_id))
    entry = res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Labor muster record not found")

    entry.dpr_id = payload.dpr_id
    entry.contractor_id = payload.contractor_id
    entry.trade_category = payload.trade_category
    entry.worker_count = payload.worker_count
    entry.daily_wage_rate = payload.daily_wage_rate or 800.00
    entry.total_wage = entry.worker_count * entry.daily_wage_rate

    await db.commit()
    await db.refresh(entry)

    res2 = await db.execute(select(LaborMuster).options(selectinload(LaborMuster.contractor)).where(LaborMuster.id == entry.id))
    saved = res2.scalar_one()
    resp = LaborMusterResponse.model_validate(saved)
    resp.contractor_name = saved.contractor.company_name if saved.contractor else None
    return resp


@router.delete("/labor-muster/{labor_id}")
async def delete_labor_muster(labor_id: int, db: AsyncSession = Depends(get_db)):
    """Deletes a labor muster record."""
    res = await db.execute(select(LaborMuster).where(LaborMuster.id == labor_id))
    entry = res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Labor muster record not found")
    await db.delete(entry)
    await db.commit()
    return {"message": "Labor muster record deleted successfully"}


# --------------------------------------------------------------------------
# 3. Subcontractor Work Orders Master
# --------------------------------------------------------------------------
@router.get("/work-orders", response_model=List[WorkOrderResponse])
async def list_work_orders(
    project_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of formal Subcontractor Work Orders with 5% retention policies.
    """
    stmt = (
        select(WorkOrder)
        .options(
            selectinload(WorkOrder.project),
            selectinload(WorkOrder.contractor)
        )
        .order_by(WorkOrder.id.desc())
    )
    if project_id:
        stmt = stmt.where(WorkOrder.project_id == project_id)

    result = await db.execute(stmt)
    wos = result.scalars().all()

    responses = []
    for w in wos:
        resp = WorkOrderResponse.model_validate(w)
        resp.project_name = w.project.project_name if w.project else None
        resp.contractor_name = w.contractor.company_name if w.contractor else None
        responses.append(resp)
    return responses


@router.post("/work-orders", response_model=WorkOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_work_order(
    payload: WorkOrderCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new formal Subcontractor Work Order / Service Contract.
    """
    count_res = await db.execute(select(func.count(WorkOrder.id)))
    next_num = (count_res.scalar() or 0) + 1
    wo_no = f"WO-2026-{next_num:04d}"

    wo = WorkOrder(
        project_id=payload.project_id,
        contractor_id=payload.contractor_id,
        work_order_no=wo_no,
        contract_type=payload.contract_type,
        total_contract_value=payload.total_contract_value,
        retention_money_percent=payload.retention_money_percent or 5.00,
        defect_liability_months=payload.defect_liability_months or 12,
        status="ACTIVE",
        scope_of_work=payload.scope_of_work
    )
    db.add(wo)
    await db.commit()

    result = await db.execute(
        select(WorkOrder)
        .options(selectinload(WorkOrder.project), selectinload(WorkOrder.contractor))
        .where(WorkOrder.id == wo.id)
    )
    saved = result.scalars().first()
    resp = WorkOrderResponse.model_validate(saved)
    resp.project_name = saved.project.project_name if saved.project else None
    resp.contractor_name = saved.contractor.company_name if saved.contractor else None
    return resp


# --------------------------------------------------------------------------
# 4. Contractor RA Billing & Statutory Net Payable Calculation
# --------------------------------------------------------------------------
@router.get("/ra-bills", response_model=List[RABillResponse])
async def list_ra_bills(
    work_order_id: Optional[int] = None,
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists Running Account (RA) Bills with statutory deductions and approval statuses, supports pagination and search.
    """
    stmt = (
        select(RABill)
        .options(
            selectinload(RABill.work_order).selectinload(WorkOrder.project),
            selectinload(RABill.work_order).selectinload(WorkOrder.contractor)
        )
        .order_by(RABill.id.desc())
    )
    if work_order_id:
        stmt = stmt.where(RABill.work_order_id == work_order_id)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(or_(
            RABill.ra_bill_number.ilike(s),
            RABill.status.ilike(s),
            RABill.remarks.ilike(s)
        ))

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    bills = result.scalars().all()

    responses = []
    for b in bills:
        resp = RABillResponse.model_validate(b)
        if b.work_order:
            resp.work_order_no = b.work_order.work_order_no
            if b.work_order.project:
                resp.project_name = b.work_order.project.project_name
            if b.work_order.contractor:
                resp.contractor_name = b.work_order.contractor.company_name
        responses.append(resp)
    return responses


@router.get("/ra-bills/{ra_bill_id}", response_model=RABillResponse)
async def get_ra_bill(ra_bill_id: int, db: AsyncSession = Depends(get_db)):
    """Fetches a single RA bill with work order and approval chain."""
    stmt = (
        select(RABill)
        .options(
            selectinload(RABill.work_order).selectinload(WorkOrder.project),
            selectinload(RABill.work_order).selectinload(WorkOrder.contractor)
        )
        .where(RABill.id == ra_bill_id)
    )
    res = await db.execute(stmt)
    bill = res.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="RA Bill not found")

    resp = RABillResponse.model_validate(bill)
    if bill.work_order:
        resp.work_order_no = bill.work_order.work_order_no
        if bill.work_order.project:
            resp.project_name = bill.work_order.project.project_name
        if bill.work_order.contractor:
            resp.contractor_name = bill.work_order.contractor.company_name
    return resp


@router.post("/ra-bills", response_model=RABillResponse, status_code=status.HTTP_201_CREATED)
async def create_ra_bill(
    payload: RABillCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits an RA Bill and computes Statutory Deductions via mandatory formula:
    Net Payable = Gross Work Certified - Retention (5-10%) - Advance Recovery - Store Recovery - TDS (Sec 52) - VDS
    """
    wo_res = await db.execute(
        select(WorkOrder)
        .options(selectinload(WorkOrder.project), selectinload(WorkOrder.contractor))
        .where(WorkOrder.id == payload.work_order_id)
    )
    wo = wo_res.scalars().first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")

    gross = float(payload.gross_work_certified_amount)
    retention_pct = float(payload.retention_percent if payload.retention_percent is not None else (wo.retention_money_percent or 5.0))
    retention_amt = round(gross * (retention_pct / 100.0), 2)
    adv_recovery = float(payload.advance_recovery_deducted or 0.0)
    store_recovery = float(payload.material_store_recovery_amount or 0.0)

    # Statutory Taxes u/s 52 and VDS
    tds_pct = float(payload.tds_rate if payload.tds_rate is not None else 5.0)
    vds_pct = float(payload.vds_rate if payload.vds_rate is not None else 5.0)
    tds_amt = round(gross * (tds_pct / 100.0), 2)
    vds_amt = round(gross * (vds_pct / 100.0), 2)

    net_payable = round(gross - retention_amt - adv_recovery - store_recovery - tds_amt - vds_amt, 2)

    initial_chain = [
        {
            "role": "SITE_ENGINEER",
            "title": "Site Engineer",
            "status": "VERIFIED",
            "signed_by": "Engr. Tanvir Ahmed",
            "signed_at": datetime.now().isoformat(),
            "notes": "Verified joint measurement sheet & physical progress."
        },
        {
            "role": "QUANTITY_SURVEYOR",
            "title": "Quantity Surveyor (QS)",
            "status": "PENDING",
            "signed_by": None,
            "signed_at": None,
            "notes": None
        },
        {
            "role": "PROJECT_DIRECTOR",
            "title": "Project Director",
            "status": "PENDING",
            "signed_by": None,
            "signed_at": None,
            "notes": None
        },
        {
            "role": "ACCOUNTS",
            "title": "Head of Accounts",
            "status": "PENDING",
            "signed_by": None,
            "signed_at": None,
            "notes": None
        }
    ]

    ra_bill = RABill(
        work_order_id=wo.id,
        ra_bill_number=payload.ra_bill_number,
        bill_date=payload.bill_date or date.today(),
        billing_period_start=payload.billing_period_start,
        billing_period_end=payload.billing_period_end,
        gross_work_certified_amount=gross,
        retention_percent=retention_pct,
        retention_money_deducted=retention_amt,
        advance_recovery_deducted=adv_recovery,
        material_store_recovery_amount=store_recovery,
        tds_rate=tds_pct,
        tds_withheld_amount=tds_amt,
        vds_rate=vds_pct,
        vds_withheld_amount=vds_amt,
        net_payable_amount=net_payable,
        approval_signature_chain=initial_chain,
        status="VERIFIED_BY_ENGINEER",
        remarks=payload.remarks
    )
    db.add(ra_bill)
    await db.commit()

    result = await db.execute(
        select(RABill)
        .options(
            selectinload(RABill.work_order).selectinload(WorkOrder.project),
            selectinload(RABill.work_order).selectinload(WorkOrder.contractor)
        )
        .where(RABill.id == ra_bill.id)
    )
    saved = result.scalars().first()
    resp = RABillResponse.model_validate(saved)
    resp.work_order_no = saved.work_order.work_order_no
    resp.project_name = saved.work_order.project.project_name if saved.work_order.project else None
    resp.contractor_name = saved.work_order.contractor.company_name if saved.work_order.contractor else None
    return resp


@router.put("/ra-bills/{ra_bill_id}/approval", response_model=RABillResponse)
@router.post("/ra-bills/{ra_bill_id}/sign", response_model=RABillResponse)
async def approve_or_sign_ra_bill(
    ra_bill_id: int,
    payload: RABillApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Subcontractor RA Billing Engine digital signature & approval chain:
    Site Engineer -> Quantity Surveyor -> Project Director -> Accounts
    When ACCOUNTS approves:
    - Automatically emits double-entry Journal Voucher to Accounts module.
    """
    stmt = (
        select(RABill)
        .options(
            selectinload(RABill.work_order).selectinload(WorkOrder.project),
            selectinload(RABill.work_order).selectinload(WorkOrder.contractor)
        )
        .where(RABill.id == ra_bill_id)
    )
    result = await db.execute(stmt)
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="RA Bill not found")

    action = payload.action.upper()
    role = (payload.role or "ACCOUNTS").upper()
    chain = list(bill.approval_signature_chain or [])
    updated = False
    for step in chain:
        if step.get("role") == role:
            step["status"] = "APPROVED" if action in ["APPROVE", "VERIFY"] else "REJECTED"
            step["signed_by"] = payload.signatory_name
            step["signed_at"] = datetime.now().isoformat()
            step["notes"] = payload.approval_notes
            updated = True
            break
    if not updated:
        chain.append({
            "role": role,
            "title": role.replace("_", " ").title(),
            "status": "APPROVED" if action in ["APPROVE", "VERIFY"] else "REJECTED",
            "signed_by": payload.signatory_name,
            "signed_at": datetime.now().isoformat(),
            "notes": payload.approval_notes
        })
    bill.approval_signature_chain = chain

    if action in ["APPROVE", "VERIFY"]:
        if role == "QUANTITY_SURVEYOR":
            bill.status = "VERIFIED_BY_QS"
        elif role == "PROJECT_DIRECTOR":
            bill.status = "APPROVED_BY_PD"
        elif role in ["ACCOUNTS", "HEAD_OF_ACCOUNTS"]:
            bill.status = "ACCOUNTS_VOUCHER_POSTED"
            voucher_ref = await post_ra_bill_voucher(db=db, bill=bill)
            bill.accounts_journal_voucher_ref = voucher_ref
            logger.info(
                f"Accounts Voucher POSTED: {voucher_ref} "
                f"for Contractor {bill.work_order.contractor.company_name} | Net Payable: BDT {bill.net_payable_amount:,.2f}"
            )
        elif role == "SITE_ENGINEER":
            bill.status = "VERIFIED_BY_ENGINEER"
        else:
            bill.status = "APPROVED"
    else:
        bill.status = "REJECTED"

    bill.remarks = f"{bill.remarks or ''} | [{role}: {payload.approval_notes or action}]".strip(" |")
    await db.commit()
    await db.refresh(bill)

    resp = RABillResponse.model_validate(bill)
    resp.work_order_no = bill.work_order.work_order_no
    resp.project_name = bill.work_order.project.project_name if bill.work_order.project else None
    resp.contractor_name = bill.work_order.contractor.company_name if bill.work_order.contractor else None
    return resp


# --------------------------------------------------------------------------
# 5. Construction Operations Metrics
# --------------------------------------------------------------------------
@router.get("/metrics", response_model=ConstructionMetrics)
async def get_construction_metrics(db: AsyncSession = Depends(get_db)):
    """
    Returns site operations aggregates: cumulative concrete poured, rebar, work orders, and billing certifications.
    """
    dpr_count = (await db.execute(select(func.count(DPRReport.id)))).scalar() or 0
    concrete = (await db.execute(select(func.sum(DPRReport.concrete_casting_cft)))).scalar() or 0.0
    rebar = (await db.execute(select(func.sum(DPRReport.steel_rod_consumed_mt)))).scalar() or 0.0

    wo_count = (
        await db.execute(select(func.count(WorkOrder.id)).where(WorkOrder.status == "ACTIVE"))
    ).scalar() or 0

    ra_count = (
        await db.execute(select(func.count(RABill.id)).where(RABill.status.in_(["VERIFIED_BY_QS", "ACCOUNTS_VOUCHER_POSTED"])))
    ).scalar() or 0

    net_payable = (
        await db.execute(
            select(func.sum(RABill.net_payable_amount)).where(RABill.status.in_(["VERIFIED_BY_QS", "ACCOUNTS_VOUCHER_POSTED"]))
        )
    ).scalar() or 0.0

    return ConstructionMetrics(
        total_dpr_logged=dpr_count,
        cumulative_concrete_cft=float(concrete),
        cumulative_rebar_mt=float(rebar),
        total_active_work_orders=wo_count,
        total_ra_bills_certified=ra_count,
        total_net_payable_certified=float(net_payable)
    )


# --------------------------------------------------------------------------
# 6. Concrete Cube Crushing Test Registers (Module 40)
# --------------------------------------------------------------------------
@router.get("/cube-tests", response_model=List[ConcreteCubeTestResponse])
async def list_concrete_cube_tests(
    project_id: Optional[int] = Query(None),
    verdict: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List concrete cube crushing test records with dynamic verdict tracking, pagination and search.
    """
    stmt = (
        select(ConcreteCubeTest)
        .options(selectinload(ConcreteCubeTest.project), selectinload(ConcreteCubeTest.tower))
        .order_by(ConcreteCubeTest.casting_date.desc(), ConcreteCubeTest.id.desc())
    )
    if project_id:
        stmt = stmt.where(ConcreteCubeTest.project_id == project_id)
    if verdict:
        stmt = stmt.where(ConcreteCubeTest.test_verdict == verdict)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(or_(
            ConcreteCubeTest.structural_element.ilike(s),
            ConcreteCubeTest.batching_plant_name.ilike(s),
            ConcreteCubeTest.concrete_grade.ilike(s)
        ))

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    records = result.scalars().all()

    today = date.today()
    response_list: List[ConcreteCubeTestResponse] = []
    for test in records:
        resp = ConcreteCubeTestResponse.model_validate(test)
        resp.project_name = test.project.project_name if test.project else None
        resp.tower_name = test.tower.tower_name if test.tower else "All Towers"

        # Determine Day 7 Status
        if test.day7_strength_psi is not None:
            resp.day7_status = "COMPLETED"
        elif test.day7_testing_date and test.day7_testing_date <= today:
            resp.day7_status = "DUE"
        else:
            resp.day7_status = "UPCOMING"

        # Determine Day 14 Status
        if test.day14_strength_psi is not None:
            resp.day14_status = "COMPLETED"
        elif test.day14_testing_date and test.day14_testing_date <= today:
            resp.day14_status = "DUE"
        else:
            resp.day14_status = "UPCOMING"

        # Determine Day 28 Status
        if test.day28_strength_psi is not None:
            resp.day28_status = "COMPLETED"
        elif test.day28_testing_date and test.day28_testing_date <= today:
            resp.day28_status = "DUE"
        else:
            resp.day28_status = "UPCOMING"

        response_list.append(resp)

    return response_list


@router.get("/cube-tests/{test_id}", response_model=ConcreteCubeTestResponse)
async def get_concrete_cube_test(test_id: int, db: AsyncSession = Depends(get_db)):
    """Fetches a single concrete cube test record by ID."""
    stmt = (
        select(ConcreteCubeTest)
        .options(selectinload(ConcreteCubeTest.project), selectinload(ConcreteCubeTest.tower))
        .where(ConcreteCubeTest.id == test_id)
    )
    res = await db.execute(stmt)
    test = res.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Cube test record not found")

    today = date.today()
    resp = ConcreteCubeTestResponse.model_validate(test)
    resp.project_name = test.project.project_name if test.project else None
    resp.tower_name = test.tower.tower_name if test.tower else "All Towers"
    resp.day7_status = "COMPLETED" if test.day7_strength_psi is not None else ("DUE" if test.day7_testing_date and test.day7_testing_date <= today else "UPCOMING")
    resp.day14_status = "COMPLETED" if test.day14_strength_psi is not None else ("DUE" if test.day14_testing_date and test.day14_testing_date <= today else "UPCOMING")
    resp.day28_status = "COMPLETED" if test.day28_strength_psi is not None else ("DUE" if test.day28_testing_date and test.day28_testing_date <= today else "UPCOMING")
    return resp


@router.post("/cube-tests", response_model=ConcreteCubeTestResponse, status_code=status.HTTP_201_CREATED)
async def create_concrete_cube_test(
    payload: ConcreteCubeTestCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new Concrete Cube Casting Sample.
    Automatically schedules Day 7, Day 14, and Day 28 test calendar dates from casting_date.
    """
    proj = await db.get(Project, payload.project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")

    casting_d = payload.casting_date
    day7_d = casting_d + timedelta(days=7)
    day14_d = casting_d + timedelta(days=14)
    day28_d = casting_d + timedelta(days=28)

    cube_test = ConcreteCubeTest(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        structural_element=payload.structural_element,
        casting_date=casting_d,
        design_compressive_strength_psi=payload.design_compressive_strength_psi or 4000,
        concrete_grade=payload.concrete_grade or "M25",
        batching_plant_name=payload.batching_plant_name or "Ready-Mix Batching Plant",
        slump_test_mm=payload.slump_test_mm or 100,
        day7_testing_date=day7_d,
        day14_testing_date=day14_d,
        day28_testing_date=day28_d,
        test_verdict="PENDING",
        remarks=payload.remarks
    )
    db.add(cube_test)
    await db.commit()
    await db.refresh(cube_test)

    # Reload relationships
    stmt = (
        select(ConcreteCubeTest)
        .options(selectinload(ConcreteCubeTest.project), selectinload(ConcreteCubeTest.tower))
        .where(ConcreteCubeTest.id == cube_test.id)
    )
    res = await db.execute(stmt)
    cube_test = res.scalar_one()

    resp = ConcreteCubeTestResponse.model_validate(cube_test)
    resp.project_name = cube_test.project.project_name if cube_test.project else None
    resp.tower_name = cube_test.tower.tower_name if cube_test.tower else "All Towers"
    resp.day7_status = "UPCOMING"
    resp.day14_status = "UPCOMING"
    resp.day28_status = "UPCOMING"
    return resp


@router.patch("/cube-tests/{test_id}/record", response_model=ConcreteCubeTestResponse)
async def update_cube_test_strength(
    test_id: int,
    payload: ConcreteCubeTestRecordUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Records crushing test readings for Day 7, Day 14, or Day 28.
    Automatically computes test verdict against design strength:
    - If Day 28 >= Design Strength -> PASSED
    - If Day 28 completed and < 85% Design Strength -> FAILED
    """
    stmt = (
        select(ConcreteCubeTest)
        .options(selectinload(ConcreteCubeTest.project), selectinload(ConcreteCubeTest.tower))
        .where(ConcreteCubeTest.id == test_id)
    )
    res = await db.execute(stmt)
    test = res.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Cube test record not found.")

    if payload.day7_strength_psi is not None:
        test.day7_strength_psi = payload.day7_strength_psi
    if payload.day14_strength_psi is not None:
        test.day14_strength_psi = payload.day14_strength_psi
    if payload.day28_strength_psi is not None:
        test.day28_strength_psi = payload.day28_strength_psi
    if payload.lab_test_report_url is not None:
        test.lab_test_report_url = payload.lab_test_report_url
    if payload.remarks is not None:
        test.remarks = payload.remarks

    # Verdict evaluation logic
    design_str = test.design_compressive_strength_psi or 4000
    if test.day28_strength_psi is not None:
        if test.day28_strength_psi >= design_str:
            test.test_verdict = "PASSED"
        else:
            test.test_verdict = "FAILED"
    elif test.day7_strength_psi is not None:
        # Day 7 standard is ~65-70% of 28 day strength
        if test.day7_strength_psi < int(design_str * 0.55):
            test.test_verdict = "WARNING_LOW_STRENGTH"
        else:
            test.test_verdict = "PENDING_DAY28"

    await db.commit()
    await db.refresh(test)

    today = date.today()
    resp = ConcreteCubeTestResponse.model_validate(test)
    resp.project_name = test.project.project_name if test.project else None
    resp.tower_name = test.tower.tower_name if test.tower else "All Towers"
    resp.day7_status = "COMPLETED" if test.day7_strength_psi is not None else ("DUE" if test.day7_testing_date and test.day7_testing_date <= today else "UPCOMING")
    resp.day14_status = "COMPLETED" if test.day14_strength_psi is not None else ("DUE" if test.day14_testing_date and test.day14_testing_date <= today else "UPCOMING")
    resp.day28_status = "COMPLETED" if test.day28_strength_psi is not None else ("DUE" if test.day28_testing_date and test.day28_testing_date <= today else "UPCOMING")
    return resp


@router.get("/cube-tests/alerts", response_model=List[CubeTestNotificationAlert])
async def get_cube_crushing_alerts(db: AsyncSession = Depends(get_db)):
    """
    Automated notification engine alerting site engineers on Day 7, Day 14, and Day 28 crushing tests:
    - Finds tests due today, overdue, or due within the next 48 hours without recorded strength values.
    """
    today = date.today()
    target_window = today + timedelta(days=2)

    # Fetch active tests that are not yet marked PASSED or FAILED
    stmt = (
        select(ConcreteCubeTest)
        .options(selectinload(ConcreteCubeTest.project))
        .where(ConcreteCubeTest.test_verdict.notin_(["PASSED", "FAILED"]))
        .order_by(ConcreteCubeTest.casting_date.asc())
    )
    result = await db.execute(stmt)
    tests = result.scalars().all()

    alerts: List[CubeTestNotificationAlert] = []

    for t in tests:
        proj_name = t.project.project_name if t.project else f"Project #{t.project_id}"

        # Check Day 7
        if t.day7_strength_psi is None and t.day7_testing_date and t.day7_testing_date <= target_window:
            diff = (t.day7_testing_date - today).days
            lvl = "OVERDUE" if diff < 0 else ("TODAY" if diff == 0 else "UPCOMING_48H")
            alerts.append(CubeTestNotificationAlert(
                test_id=t.id,
                project_id=t.project_id,
                project_name=proj_name,
                structural_element=t.structural_element,
                casting_date=t.casting_date,
                test_milestone="Day 7",
                scheduled_test_date=t.day7_testing_date,
                days_remaining=diff,
                alert_level=lvl,
                design_strength_psi=t.design_compressive_strength_psi
            ))

        # Check Day 14
        if t.day14_strength_psi is None and t.day14_testing_date and t.day14_testing_date <= target_window:
            diff = (t.day14_testing_date - today).days
            lvl = "OVERDUE" if diff < 0 else ("TODAY" if diff == 0 else "UPCOMING_48H")
            alerts.append(CubeTestNotificationAlert(
                test_id=t.id,
                project_id=t.project_id,
                project_name=proj_name,
                structural_element=t.structural_element,
                casting_date=t.casting_date,
                test_milestone="Day 14",
                scheduled_test_date=t.day14_testing_date,
                days_remaining=diff,
                alert_level=lvl,
                design_strength_psi=t.design_compressive_strength_psi
            ))

        # Check Day 28
        if t.day28_strength_psi is None and t.day28_testing_date and t.day28_testing_date <= target_window:
            diff = (t.day28_testing_date - today).days
            lvl = "OVERDUE" if diff < 0 else ("TODAY" if diff == 0 else "UPCOMING_48H")
            alerts.append(CubeTestNotificationAlert(
                test_id=t.id,
                project_id=t.project_id,
                project_name=proj_name,
                structural_element=t.structural_element,
                casting_date=t.casting_date,
                test_milestone="Day 28",
                scheduled_test_date=t.day28_testing_date,
                days_remaining=diff,
                alert_level=lvl,
                design_strength_psi=t.design_compressive_strength_psi
            ))

    alerts.sort(key=lambda x: (x.days_remaining, x.test_milestone))
    return alerts


# --------------------------------------------------------------------------
# 7. Non-Conformance Reports (NCR) & Site Safety Register (Module 40)
# --------------------------------------------------------------------------
@router.get("/safety-ncrs", response_model=List[SafetyNCRResponse])
async def list_safety_ncrs(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    category_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List site safety Non-Conformance Reports with filter by project, category, or status, with pagination and search.
    """
    stmt = (
        select(SafetyNCR)
        .options(selectinload(SafetyNCR.project), selectinload(SafetyNCR.contractor))
        .order_by(SafetyNCR.id.desc())
    )
    if project_id:
        stmt = stmt.where(SafetyNCR.project_id == project_id)
    if status_filter:
        stmt = stmt.where(SafetyNCR.status == status_filter)
    if category_filter:
        stmt = stmt.where(SafetyNCR.category == category_filter)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(or_(
            SafetyNCR.ncr_number.ilike(s),
            SafetyNCR.description.ilike(s),
            SafetyNCR.location_details.ilike(s)
        ))

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    records = result.scalars().all()

    today = date.today()
    response_list: List[SafetyNCRResponse] = []
    for ncr in records:
        resp = SafetyNCRResponse.model_validate(ncr)
        resp.project_name = ncr.project.project_name if ncr.project else None
        resp.contractor_name = ncr.contractor.company_name if ncr.contractor else "Unassigned / General"
        resp.is_overdue = (ncr.status == "Open" and ncr.rectification_deadline < today)
        response_list.append(resp)

    return response_list


@router.get("/safety-ncrs/{ncr_id}", response_model=SafetyNCRResponse)
async def get_safety_ncr(ncr_id: int, db: AsyncSession = Depends(get_db)):
    """Fetches a single Safety NCR record by ID."""
    stmt = (
        select(SafetyNCR)
        .options(selectinload(SafetyNCR.project), selectinload(SafetyNCR.contractor))
        .where(SafetyNCR.id == ncr_id)
    )
    res = await db.execute(stmt)
    ncr = res.scalar_one_or_none()
    if not ncr:
        raise HTTPException(status_code=404, detail="Safety NCR record not found")

    today = date.today()
    resp = SafetyNCRResponse.model_validate(ncr)
    resp.project_name = ncr.project.project_name if ncr.project else None
    resp.contractor_name = ncr.contractor.company_name if ncr.contractor else "Unassigned / General"
    resp.is_overdue = (ncr.status == "Open" and ncr.rectification_deadline < today)
    return resp


@router.post("/safety-ncrs", response_model=SafetyNCRResponse, status_code=status.HTTP_201_CREATED)
async def create_safety_ncr(
    payload: SafetyNCRCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Issue a new Site Safety / QA Non-Conformance Report (NCR).
    Auto-generates sequential NCR number e.g. NCR-PRJ01-2026-004.
    """
    proj = await db.get(Project, payload.project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")

    count = (await db.execute(select(func.count(SafetyNCR.id)).where(SafetyNCR.project_id == payload.project_id))).scalar() or 0
    seq = count + 1
    proj_code = proj.project_code if proj.project_code else f"PRJ{proj.id:02d}"
    ncr_no = f"NCR-{proj_code}-{date.today().year}-{seq:03d}"

    ncr = SafetyNCR(
        project_id=payload.project_id,
        ncr_number=ncr_no,
        category=payload.category,
        severity=payload.severity or "Medium",
        description=payload.description,
        location_details=payload.location_details,
        photo_url=payload.photo_url or "assets/images/common/placeholder-ncr.jpg",
        assigned_contractor_id=payload.assigned_contractor_id,
        rectification_deadline=payload.rectification_deadline,
        status="Open"
    )
    db.add(ncr)
    await db.commit()
    await db.refresh(ncr)

    stmt = (
        select(SafetyNCR)
        .options(selectinload(SafetyNCR.project), selectinload(SafetyNCR.contractor))
        .where(SafetyNCR.id == ncr.id)
    )
    res = await db.execute(stmt)
    ncr = res.scalar_one()

    resp = SafetyNCRResponse.model_validate(ncr)
    resp.project_name = ncr.project.project_name if ncr.project else None
    resp.contractor_name = ncr.contractor.company_name if ncr.contractor else "Unassigned / General"
    resp.is_overdue = False
    return resp


@router.patch("/safety-ncrs/{ncr_id}/rectify", response_model=SafetyNCRResponse)
async def rectify_safety_ncr(
    ncr_id: int,
    payload: SafetyNCRRectify,
    db: AsyncSession = Depends(get_db)
):
    """
    Contractor submits rectification work for a flagged NCR item.
    Status transitions to 'Rectified' pending QA verification.
    """
    stmt = (
        select(SafetyNCR)
        .options(selectinload(SafetyNCR.project), selectinload(SafetyNCR.contractor))
        .where(SafetyNCR.id == ncr_id)
    )
    res = await db.execute(stmt)
    ncr = res.scalar_one_or_none()
    if not ncr:
        raise HTTPException(status_code=404, detail="NCR record not found.")

    ncr.status = "Rectified"
    ncr.rectification_notes = payload.rectification_notes
    if payload.rectification_photo_url:
        ncr.rectification_photo_url = payload.rectification_photo_url

    await db.commit()
    await db.refresh(ncr)

    resp = SafetyNCRResponse.model_validate(ncr)
    resp.project_name = ncr.project.project_name if ncr.project else None
    resp.contractor_name = ncr.contractor.company_name if ncr.contractor else "Unassigned / General"
    resp.is_overdue = False
    return resp


@router.patch("/safety-ncrs/{ncr_id}/verify", response_model=SafetyNCRResponse)
async def verify_close_safety_ncr(
    ncr_id: int,
    payload: SafetyNCRVerifyClose,
    db: AsyncSession = Depends(get_db)
):
    """
    QA / Site Safety Engineer inspects rectified item and either marks 'Verified_Closed' or reopens.
    """
    stmt = (
        select(SafetyNCR)
        .options(selectinload(SafetyNCR.project), selectinload(SafetyNCR.contractor))
        .where(SafetyNCR.id == ncr_id)
    )
    res = await db.execute(stmt)
    ncr = res.scalar_one_or_none()
    if not ncr:
        raise HTTPException(status_code=404, detail="NCR record not found.")

    if payload.verdict == "VERIFIED_CLOSED":
        ncr.status = "Verified_Closed"
        ncr.closed_date = date.today()
    else:
        ncr.status = "Open"

    if payload.verification_notes:
        existing_notes = ncr.rectification_notes or ""
        ncr.rectification_notes = f"{existing_notes}\n[QA Verdict: {payload.verdict} - {payload.verification_notes}]"

    await db.commit()
    await db.refresh(ncr)

    resp = SafetyNCRResponse.model_validate(ncr)
    resp.project_name = ncr.project.project_name if ncr.project else None
    resp.contractor_name = ncr.contractor.company_name if ncr.contractor else "Unassigned / General"
    resp.is_overdue = (ncr.status == "Open" and ncr.rectification_deadline < date.today())
    return resp


# --------------------------------------------------------------------------
# 8. Work Breakdown Structure (WBS) & Activity Master Tree
# --------------------------------------------------------------------------
def _to_wbs_response(n: WBSNode) -> WBSNodeResponse:
    return WBSNodeResponse(
        id=n.id,
        project_id=n.project_id,
        tower_id=n.tower_id,
        parent_id=n.parent_id,
        node_code=n.node_code,
        node_name=n.node_name,
        wbs_tier=n.wbs_tier,
        phase_category=n.phase_category,
        activity_type=n.activity_type,
        planned_start_date=n.planned_start_date,
        planned_end_date=n.planned_end_date,
        actual_start_date=n.actual_start_date,
        actual_end_date=n.actual_end_date,
        progress_percentage=float(n.progress_percentage or 0.0),
        weightage_percentage=float(n.weightage_percentage or 0.0),
        status=n.status,
        responsible_engineer=n.responsible_engineer,
        remarks=n.remarks,
        created_at=n.created_at,
        children=[]
    )


@router.get("/wbs", response_model=List[WBSNodeResponse])
async def list_wbs_nodes(
    project_id: Optional[int] = Query(None),
    tower_id: Optional[int] = Query(None),
    parent_id: Optional[int] = Query(None),
    as_tree: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of WBS nodes. If as_tree=True, returns root nodes with nested child nodes.
    """
    stmt = select(WBSNode).order_by(WBSNode.id.asc())
    if project_id:
        stmt = stmt.where(WBSNode.project_id == project_id)
    if tower_id:
        stmt = stmt.where(WBSNode.tower_id == tower_id)
    if not as_tree and parent_id is not None:
        stmt = stmt.where(WBSNode.parent_id == parent_id)

    res = await db.execute(stmt)
    nodes = res.scalars().all()

    if as_tree:
        node_dict = {n.id: _to_wbs_response(n) for n in nodes}
        roots = []
        for n in nodes:
            resp_node = node_dict[n.id]
            if n.parent_id and n.parent_id in node_dict:
                node_dict[n.parent_id].children.append(resp_node)
            elif n.parent_id is None:
                roots.append(resp_node)
        return roots

    return [_to_wbs_response(n) for n in nodes]


@router.post("/wbs", response_model=WBSNodeResponse, status_code=status.HTTP_201_CREATED)
async def create_wbs_node(
    payload: WBSNodeCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new WBS hierarchy node (Phase, Sub-Phase, Activity, or Task).
    """
    node = WBSNode(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        parent_id=payload.parent_id,
        node_code=payload.node_code,
        node_name=payload.node_name,
        wbs_tier=payload.wbs_tier or "ACTIVITY",
        phase_category=payload.phase_category or "SUBSTRUCTURE",
        activity_type=payload.activity_type,
        planned_start_date=payload.planned_start_date,
        planned_end_date=payload.planned_end_date,
        weightage_percentage=payload.weightage_percentage or 10.00,
        progress_percentage=0.00,
        status="NOT_STARTED",
        responsible_engineer=payload.responsible_engineer,
        remarks=payload.remarks
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return _to_wbs_response(node)


@router.put("/wbs/{wbs_id}/progress", response_model=WBSNodeResponse)
async def update_wbs_progress(
    wbs_id: int,
    payload: WBSNodeUpdateProgress,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates milestone completion percentage and dates for a WBS Activity.
    """
    res = await db.execute(select(WBSNode).where(WBSNode.id == wbs_id))
    node = res.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="WBS Node not found")

    node.progress_percentage = payload.progress_percentage
    if payload.actual_start_date:
        node.actual_start_date = payload.actual_start_date
    elif node.progress_percentage > 0 and not node.actual_start_date:
        node.actual_start_date = date.today()

    if payload.actual_end_date:
        node.actual_end_date = payload.actual_end_date
    elif node.progress_percentage >= 100.0:
        node.actual_end_date = date.today()
        node.status = "COMPLETED"

    if payload.status:
        node.status = payload.status
    elif node.progress_percentage >= 100.0:
        node.status = "COMPLETED"
    elif node.progress_percentage > 0:
        node.status = "IN_PROGRESS"

    if payload.remarks:
        node.remarks = f"{node.remarks or ''} | {payload.remarks}".strip(" |")

    await db.commit()
    await db.refresh(node)
    return _to_wbs_response(node)


# --------------------------------------------------------------------------
# 9. BOQ Dynamic Variance Control & Hard Budget Locks
# --------------------------------------------------------------------------
@router.get("/boq/budget-locks", response_model=List[BOQItemResponse])
async def list_boq_budget_locks(
    project_id: Optional[int] = Query(None),
    tower_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists BOQ items with Hard Budget Lock threshold (105%), requisitioned vs allowable quantities, and lock flags.
    """
    stmt = select(BOQItem).order_by(BOQItem.id.asc())
    if project_id:
        stmt = stmt.where(BOQItem.project_id == project_id)
    if tower_id:
        stmt = stmt.where(BOQItem.tower_id == tower_id)

    res = await db.execute(stmt)
    items = res.scalars().all()

    result = []
    for item in items:
        est = float(item.estimated_quantity or 0.0)
        vo_qty = float(item.variation_order_quantity or 0.0)
        lock_pct = float(item.hard_lock_percentage or 105.0)
        allowable = round((est * (lock_pct / 100.0)) + vo_qty, 4)
        req = float(item.requisitioned_quantity or 0.0)
        variance = round(((req - est) / est * 100.0), 2) if est > 0 else 0.0

        resp = BOQItemResponse.model_validate(item)
        resp.allowable_quantity = allowable
        resp.variance_percentage = variance
        result.append(resp)
    return result


@router.post("/boq/check-budget-lock", response_model=BOQRequisitionCheckResponse)
async def check_boq_budget_lock(
    payload: BOQRequisitionCheckRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Pre-flight budget lock validation: determines whether a material requisition exceeds 105% of BOQ.
    """
    res = await db.execute(select(BOQItem).where(BOQItem.id == payload.boq_item_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="BOQ Item not found")

    est = float(item.estimated_quantity or 0.0)
    vo_qty = float(item.variation_order_quantity or 0.0)
    lock_pct = float(item.hard_lock_percentage or 105.0)
    allowable = round((est * (lock_pct / 100.0)) + vo_qty, 4)
    already_req = float(item.requisitioned_quantity or 0.0)
    remaining = max(0.0, round(allowable - already_req, 4))
    requested = float(payload.requested_quantity)

    lock_triggered = (already_req + requested) > allowable

    if lock_triggered:
        excess = round((already_req + requested) - allowable, 4)
        msg = (
            f"HARD BUDGET LOCK TRIGGERED: Requisition of {requested:,.2f} {item.unit_of_measure_id} "
            f"exceeds 105% ceiling by {excess:,.2f} {item.unit_of_measure_id}. "
            f"Requires an approved Variation Order (VO)."
        )
    else:
        msg = f"Requisition within 105% budget limit. Remaining headroom: {remaining - requested:,.2f} {item.unit_of_measure_id}."

    return BOQRequisitionCheckResponse(
        boq_item_id=item.id,
        item_description=item.item_description,
        estimated_quantity=est,
        variation_order_quantity=vo_qty,
        allowable_ceiling_105=allowable,
        already_requisitioned_quantity=already_req,
        remaining_allowable_quantity=remaining,
        requested_quantity=requested,
        is_hard_locked=item.is_locked,
        budget_lock_triggered=lock_triggered,
        message=msg
    )


@router.post("/boq/requisition", response_model=BOQItemResponse)
async def process_boq_requisition(
    payload: BOQRequisitionCheckRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Processes site material requisition enforcing Hard Budget Lock rule.
    If requisition exceeds 105% of BOQ quantity without approved Variation Order (VO), it is rejected with HTTP 400.
    """
    res = await db.execute(select(BOQItem).where(BOQItem.id == payload.boq_item_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="BOQ Item not found")

    est = float(item.estimated_quantity or 0.0)
    vo_qty = float(item.variation_order_quantity or 0.0)
    lock_pct = float(item.hard_lock_percentage or 105.0)
    allowable = round((est * (lock_pct / 100.0)) + vo_qty, 4)
    already_req = float(item.requisitioned_quantity or 0.0)
    requested = float(payload.requested_quantity)

    if (already_req + requested) > allowable or item.is_locked:
        excess = round((already_req + requested) - allowable, 4)
        item.is_locked = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"HARD BUDGET LOCK ENFORCED: Site cannot requisition material exceeding 105% of BOQ quantity. "
                f"Requested: {requested:,.2f}, Ceiling: {allowable:,.2f}, Excess: {excess:,.2f} {item.unit_of_measure_id}. "
                f"Please obtain an approved Variation Order (VO) to unlock headroom."
            )
        )

    # Allow requisition
    item.requisitioned_quantity = round(already_req + requested, 4)
    if item.requisitioned_quantity >= allowable:
        item.is_locked = True
    await db.commit()
    await db.refresh(item)

    resp = BOQItemResponse.model_validate(item)
    resp.allowable_quantity = allowable
    resp.variance_percentage = round(((float(item.requisitioned_quantity) - est) / est * 100.0), 2) if est > 0 else 0.0
    return resp


@router.get("/boq/variation-orders", response_model=List[VariationOrderResponse])
async def list_variation_orders(
    project_id: Optional[int] = Query(None),
    boq_item_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(VariationOrder).order_by(VariationOrder.id.desc())
    if project_id:
        stmt = stmt.where(VariationOrder.project_id == project_id)
    if boq_item_id:
        stmt = stmt.where(VariationOrder.boq_item_id == boq_item_id)
    if status:
        stmt = stmt.where(VariationOrder.status == status.upper())

    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/boq/variation-orders", response_model=VariationOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_variation_order(
    payload: VariationOrderCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a Variation Order (VO) to release additional budget/quantity for a locked BOQ item.
    """
    res = await db.execute(select(BOQItem).where(BOQItem.id == payload.boq_item_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="BOQ Item not found")

    count_res = await db.execute(select(func.count(VariationOrder.id)))
    next_num = (count_res.scalar() or 0) + 1
    vo_number = f"VO-PRJ{payload.project_id:02d}-{datetime.now().year}-{next_num:03d}"

    rate = float(payload.revised_rate if payload.revised_rate is not None else item.estimated_unit_rate)
    budget = round(float(payload.additional_quantity) * rate, 2)

    vo = VariationOrder(
        project_id=payload.project_id,
        boq_item_id=payload.boq_item_id,
        vo_number=vo_number,
        additional_quantity=payload.additional_quantity,
        revised_rate=rate,
        additional_budget=budget,
        reason=payload.reason,
        status="PENDING"
    )
    db.add(vo)
    await db.commit()
    await db.refresh(vo)
    return vo


@router.put("/boq/variation-orders/{vo_id}/approve", response_model=VariationOrderResponse)
async def approve_variation_order(
    vo_id: int,
    payload: VariationOrderApprove,
    db: AsyncSession = Depends(get_db)
):
    """
    Approves or rejects a Variation Order.
    When APPROVED, automatically increments the BOQ item's variation_order_quantity and unlocks the hard lock.
    """
    res = await db.execute(
        select(VariationOrder)
        .options(selectinload(VariationOrder.boq_item))
        .where(VariationOrder.id == vo_id)
    )
    vo = res.scalar_one_or_none()
    if not vo:
        raise HTTPException(status_code=404, detail="Variation Order not found")

    action = payload.status.upper()
    if action == "APPROVED":
        vo.status = "APPROVED"
        vo.approved_by_pm = payload.approved_by_pm
        vo.approval_date = date.today()
        # Unlock BOQ headroom!
        if vo.boq_item:
            vo.boq_item.variation_order_quantity = round(
                float(vo.boq_item.variation_order_quantity or 0.0) + float(vo.additional_quantity), 4
            )
            vo.boq_item.is_locked = False
    else:
        vo.status = "REJECTED"

    await db.commit()
    await db.refresh(vo)
    return vo


# --------------------------------------------------------------------------
# 10. Joint Measurement Sheet (JMS) Engine
# --------------------------------------------------------------------------
@router.get("/jms", response_model=List[JointMeasurementSheetResponse])
async def list_joint_measurements(
    work_order_id: Optional[int] = Query(None),
    wbs_node_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(JointMeasurementSheet).order_by(JointMeasurementSheet.id.desc())
    if work_order_id:
        stmt = stmt.where(JointMeasurementSheet.work_order_id == work_order_id)
    if wbs_node_id:
        stmt = stmt.where(JointMeasurementSheet.wbs_node_id == wbs_node_id)

    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/jms", response_model=JointMeasurementSheetResponse, status_code=status.HTTP_201_CREATED)
async def create_joint_measurement(
    payload: JointMeasurementSheetCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Records a Joint Measurement Sheet (JMS) signed by Site Engineer and Contractor.
    Computes measured quantity via dimensions (Length x Breadth x Depth) if provided.
    """
    qty = float(payload.measured_quantity)
    l = float(payload.measured_length or 0.0)
    b = float(payload.measured_breadth or 0.0)
    d = float(payload.measured_depth or 0.0)
    if qty <= 0.0 and (l * b > 0.0):
        depth_mult = d if d > 0.0 else 1.0
        qty = round(l * b * depth_mult, 4)

    total = round(qty * float(payload.unit_rate), 2)

    jms = JointMeasurementSheet(
        work_order_id=payload.work_order_id,
        wbs_node_id=payload.wbs_node_id,
        jms_number=payload.jms_number,
        measurement_date=payload.measurement_date or date.today(),
        location_floor=payload.location_floor,
        trade_item=payload.trade_item,
        unit_of_measure=payload.unit_of_measure or "SFT",
        measured_length=l,
        measured_breadth=b,
        measured_depth=d,
        measured_quantity=qty,
        unit_rate=payload.unit_rate,
        total_amount=total,
        verified_by_site_engineer=payload.verified_by_site_engineer,
        subcontractor_representative=payload.subcontractor_representative,
        status="VERIFIED_BY_ENGINEER"
    )
    db.add(jms)
    await db.commit()
    await db.refresh(jms)
    return jms

