import logging
from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.modules.projects.models import Project, Tower
from app.modules.auth.models import User
from app.modules.construction.models import Subcontractor, DPRReport, LaborMuster, WorkOrder, RABill, ConcreteCubeTest, SafetyNCR
from app.modules.construction.schemas import (
    SubcontractorCreate, SubcontractorResponse,
    DPRReportCreate, DPRReportResponse,
    LaborMusterCreate, LaborMusterResponse,
    WorkOrderCreate, WorkOrderResponse,
    RABillCreate, RABillResponse, RABillApprovalRequest,
    ConstructionMetrics,
    ConcreteCubeTestCreate, ConcreteCubeTestResponse, ConcreteCubeTestRecordUpdate, CubeTestNotificationAlert,
    SafetyNCRCreate, SafetyNCRResponse, SafetyNCRRectify, SafetyNCRVerifyClose
)
from app.modules.accounts.services import post_ra_bill_voucher

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/construction", tags=["Construction Operations, QA & RA Billing"])



# --------------------------------------------------------------------------
# 1. Subcontractors Master
# --------------------------------------------------------------------------
@router.get("/contractors", response_model=List[SubcontractorResponse])
async def list_contractors(db: AsyncSession = Depends(get_db)):
    """
    Returns list of registered trade contractors (Civil, Masonry, Plumbing, etc.).
    """
    result = await db.execute(select(Subcontractor).order_by(Subcontractor.company_name.asc()))
    return result.scalars().all()


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


# --------------------------------------------------------------------------
# 2. Daily Progress Report (DPR) Site Diary
# --------------------------------------------------------------------------
@router.get("/dpr", response_model=List[DPRReportResponse])
async def list_dpr_reports(
    project_id: Optional[int] = None,
    report_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of Daily Progress Reports (DPR) with labor muster roll records.
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


@router.post("/dpr", response_model=DPRReportResponse, status_code=status.HTTP_201_CREATED)
async def create_dpr_report(
    payload: DPRReportCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Logs a new Construction Site Diary Daily Progress Report (DPR) with nested labor muster.
    """
    # Pick first engineer
    user_res = await db.execute(select(User).order_by(User.id.asc()))
    eng = user_res.scalars().first()

    dpr = DPRReport(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        report_date=payload.report_date or date.today(),
        weather_condition_id=payload.weather_condition_id or "SUNNY",
        site_engineer_id=eng.id if eng else None,
        structural_activity_summary=payload.structural_activity_summary,
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
    return resp


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
    db: AsyncSession = Depends(get_db)
):
    """
    Lists Running Account (RA) Bills with statutory deductions and approval statuses.
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


@router.post("/ra-bills", response_model=RABillResponse, status_code=status.HTTP_201_CREATED)
async def create_ra_bill(
    payload: RABillCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits an RA Bill and computes Statutory Deductions via mandatory formula:
    $$\\text{Net Payable} = \\text{Gross Work Certified} - \\text{Retention (5\\%)} - \\text{Advance Recovery} - \\text{TDS (Sec 52)} - \\text{VDS}$$
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
    retention_pct = float(wo.retention_money_percent or 5.0)
    retention_amt = round(gross * (retention_pct / 100.0), 2)
    adv_recovery = float(payload.advance_recovery_deducted or 0.0)

    # Statutory Taxes u/s 52 and VDS
    tds_pct = float(payload.tds_percentage or 5.0) # Income tax Sec 52
    vds_pct = float(payload.vds_percentage or 5.0) # VAT deducted at source
    tds_amt = round(gross * (tds_pct / 100.0), 2)
    vds_amt = round(gross * (vds_pct / 100.0), 2)

    net_payable = round(gross - retention_amt - adv_recovery - tds_amt - vds_amt, 2)

    ra_bill = RABill(
        work_order_id=wo.id,
        ra_bill_number=payload.ra_bill_number,
        bill_date=payload.bill_date or date.today(),
        gross_work_certified_amount=gross,
        retention_money_deducted=retention_amt,
        advance_recovery_deducted=adv_recovery,
        tds_withheld_amount=tds_amt,
        vds_withheld_amount=vds_amt,
        net_payable_amount=net_payable,
        status="VERIFIED_BY_QS",
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
async def approve_ra_bill(
    ra_bill_id: int,
    payload: RABillApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Approves or rejects contractor RA Bill.
    When APPROVED:
    - Automatically emits event to Accounts service creating Contractor Liability Journal Voucher.
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
    if action == "APPROVE":
        bill.status = "ACCOUNTS_VOUCHER_POSTED"
        # Atomically creates balanced double-entry Journal Voucher in acc_vouchers & acc_journal_entries
        voucher_ref = await post_ra_bill_voucher(db=db, bill=bill)
        bill.accounts_journal_voucher_ref = voucher_ref
        logger.info(
            f"Accounts Voucher POSTED: {voucher_ref} "
            f"for Contractor {bill.work_order.contractor.company_name} | Net Payable: BDT {bill.net_payable_amount:,.2f}"
        )
    else:
        bill.status = "REJECTED"

    bill.remarks = f"{bill.remarks or ''} | {payload.approval_notes or ''}".strip(" |")
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
    db: AsyncSession = Depends(get_db)
):
    """
    List concrete cube crushing test records with dynamic verdict tracking.
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
    db: AsyncSession = Depends(get_db)
):
    """
    List site safety Non-Conformance Reports with filter by project, category, or status.
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

