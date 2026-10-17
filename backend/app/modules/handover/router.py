import logging
from datetime import date, datetime, timedelta
from io import BytesIO
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from app.core.database import get_db
from app.modules.sales.models import Booking
from app.modules.inventory.models import Unit
from app.modules.projects.models import Project
from app.modules.auth.models import User
from app.modules.handover.models import (
    HandoverInspection, SnagItem, DLPTicket, OwnersAssociation, LeaseAgreement, CAMBill, UtilitySubMeterReading
)
from app.modules.handover.schemas import (
    SnagItemCreate, SnagItemUpdate, SnagItemResponse,
    HandoverInspectionCreate, HandoverExecution, HandoverInspectionResponse,
    DLPTicketCreate, DLPTicketUpdate, DLPTicketResponse,
    OwnersAssociationCreate, OwnersAssociationResponse,
    LeaseAgreementCreate, LeaseAgreementResponse,
    CAMBillCreate, CAMBillPayment, CAMBillResponse,
    UtilitySubMeterReadingCreate, UtilitySubMeterReadingResponse,
    HandoverDashboardMetrics
)
from app.modules.handover.possession_generator import generate_possession_letter_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/handover", tags=["Handover, DLP & Property Operations"])


# --------------------------------------------------------------------------
# 0. KPI Dashboard Metrics
# --------------------------------------------------------------------------
@router.get("/metrics", response_model=HandoverDashboardMetrics)
async def get_handover_metrics(db: AsyncSession = Depends(get_db)):
    """Aggregate KPIs for Handover, Snags, 12-Month DLP Warranty, and Commercial Leasing."""
    total_inspections = (await db.execute(select(func.count(HandoverInspection.id)))).scalar() or 0
    possession_done = (await db.execute(
        select(func.count(HandoverInspection.id)).where(HandoverInspection.status == "POSSESSION_HANDED_OVER")
    )).scalar() or 0
    inspection_pending = (await db.execute(
        select(func.count(HandoverInspection.id)).where(HandoverInspection.status.in_(["INSPECTION_PENDING", "SNAGS_REPORTED"]))
    )).scalar() or 0

    total_snags = (await db.execute(select(func.count(SnagItem.id)))).scalar() or 0
    open_snags = (await db.execute(
        select(func.count(SnagItem.id)).where(SnagItem.status.in_(["OPEN", "ASSIGNED", "IN_PROGRESS"]))
    )).scalar() or 0
    fixed_snags = (await db.execute(
        select(func.count(SnagItem.id)).where(SnagItem.status.in_(["FIXED", "VERIFIED_CLOSED"]))
    )).scalar() or 0

    total_dlp = (await db.execute(select(func.count(DLPTicket.id)))).scalar() or 0
    active_dlp = (await db.execute(
        select(func.count(DLPTicket.id)).where(DLPTicket.status.in_(["OPEN", "IN_PROGRESS"]))
    )).scalar() or 0
    critical_dlp = (await db.execute(
        select(func.count(DLPTicket.id)).where(
            DLPTicket.defect_severity == "CRITICAL",
            DLPTicket.status.in_(["OPEN", "IN_PROGRESS"])
        )
    )).scalar() or 0

    active_leases = (await db.execute(
        select(func.count(LeaseAgreement.id)).where(LeaseAgreement.status == "ACTIVE")
    )).scalar() or 0
    
    rent_sum = (await db.execute(
        select(func.sum(LeaseAgreement.monthly_rent_bdt)).where(LeaseAgreement.status == "ACTIVE")
    )).scalar() or 0.0

    cam_sum = (await db.execute(select(func.sum(CAMBill.total_bill_amount)))).scalar() or 0.0
    unpaid_cam = (await db.execute(
        select(func.count(CAMBill.id)).where(CAMBill.payment_status.in_(["UNPAID", "OVERDUE"]))
    )).scalar() or 0

    return HandoverDashboardMetrics(
        total_inspections_count=total_inspections,
        possession_handed_over_count=possession_done,
        inspection_pending_count=inspection_pending,
        total_snags_reported=total_snags,
        open_snags_count=open_snags,
        fixed_snags_count=fixed_snags,
        total_dlp_tickets_count=total_dlp,
        active_dlp_tickets_count=active_dlp,
        critical_dlp_count=critical_dlp,
        active_commercial_leases_count=active_leases,
        total_monthly_rent_receivable=float(rent_sum),
        total_cam_billed_amount=float(cam_sum),
        unpaid_cam_bills_count=unpaid_cam
    )


# --------------------------------------------------------------------------
# 1. Digital Snag List Endpoints
# --------------------------------------------------------------------------
@router.get("/snags", response_model=List[SnagItemResponse])
async def list_snags(
    inspection_id: Optional[int] = Query(None),
    unit_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List pre-handover digital snag items filterable by category, room, status, and severity."""
    stmt = (
        select(SnagItem)
        .options(
            selectinload(SnagItem.unit).selectinload(Unit.project),
            selectinload(SnagItem.verified_by)
        )
        .order_by(SnagItem.id.desc())
    )
    if inspection_id:
        stmt = stmt.where(SnagItem.inspection_id == inspection_id)
    if unit_id:
        stmt = stmt.where(SnagItem.unit_id == unit_id)
    if category:
        stmt = stmt.where(SnagItem.category == category)
    if status_filter:
        stmt = stmt.where(SnagItem.status == status_filter)
    if severity:
        stmt = stmt.where(SnagItem.severity == severity)

    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list: List[SnagItemResponse] = []
    for s in records:
        resp = SnagItemResponse.model_validate(s)
        if s.unit:
            resp.unit_number = s.unit.unit_number
            if s.unit.project:
                resp.project_name = s.unit.project.project_name
        if s.verified_by:
            resp.verified_by_engineer_name = s.verified_by.full_name_en
        resp_list.append(resp)
    return resp_list


@router.post("/snags", response_model=SnagItemResponse, status_code=status.HTTP_201_CREATED)
async def create_snag_item(
    payload: SnagItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """Log a digital snag defect during joint pre-handover inspection."""
    count = (await db.execute(select(func.count(SnagItem.id)))).scalar() or 0
    idx = count + 1
    while True:
        code_candidate = f"SNG-{date.today().year}-{idx:04d}"
        exists = (await db.execute(select(SnagItem.id).where(SnagItem.snag_code == code_candidate))).scalar_one_or_none()
        if not exists:
            snag_code = code_candidate
            break
        idx += 1

    # Compute target fix date based on severity if not provided
    sla_days = 1 if payload.severity == "CRITICAL" else (2 if payload.severity == "HIGH" else (3 if payload.severity == "MEDIUM" else 5))
    target_date = payload.target_fix_date or (date.today() + timedelta(days=sla_days))

    snag = SnagItem(
        inspection_id=payload.inspection_id,
        unit_id=payload.unit_id,
        snag_code=snag_code,
        category=payload.category,
        location=payload.location,
        defect_description=payload.defect_description,
        photo_attachment_url=payload.photo_attachment_url,
        severity=payload.severity,
        contractor_name=payload.contractor_name,
        target_fix_date=target_date,
        status="ASSIGNED" if payload.contractor_name else "OPEN",
        customer_accepted=False
    )
    db.add(snag)

    # If linked to an inspection, update inspection status
    if payload.inspection_id:
        insp = await db.get(HandoverInspection, payload.inspection_id)
        if insp and insp.status == "INSPECTION_PENDING":
            insp.status = "SNAGS_REPORTED"

    await db.commit()
    await db.refresh(snag)

    # Reload with relationships
    stmt = (
        select(SnagItem)
        .options(
            selectinload(SnagItem.unit).selectinload(Unit.project),
            selectinload(SnagItem.verified_by)
        )
        .where(SnagItem.id == snag.id)
    )
    res = await db.execute(stmt)
    snag = res.scalar_one()

    resp = SnagItemResponse.model_validate(snag)
    if snag.unit:
        resp.unit_number = snag.unit.unit_number
        if snag.unit.project:
            resp.project_name = snag.unit.project.project_name
    return resp


@router.patch("/snags/{snag_id}", response_model=SnagItemResponse)
async def update_snag_status(
    snag_id: int,
    payload: SnagItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update snag status, contractor rectification, site engineer verification, and customer sign-off."""
    stmt = (
        select(SnagItem)
        .options(
            selectinload(SnagItem.unit).selectinload(Unit.project),
            selectinload(SnagItem.verified_by)
        )
        .where(SnagItem.id == snag_id)
    )
    res = await db.execute(stmt)
    snag = res.scalar_one_or_none()
    if not snag:
        raise HTTPException(status_code=404, detail="Snag item not found.")

    snag.status = payload.status
    if payload.fix_date:
        snag.fix_date = payload.fix_date
    elif payload.status in ["FIXED", "VERIFIED_CLOSED"] and not snag.fix_date:
        snag.fix_date = date.today()

    if payload.contractor_name:
        snag.contractor_name = payload.contractor_name
    if payload.verified_by_engineer_id:
        snag.verified_by_engineer_id = payload.verified_by_engineer_id
    if payload.verification_notes:
        snag.verification_notes = payload.verification_notes
    if payload.customer_accepted is not None:
        snag.customer_accepted = payload.customer_accepted

    await db.commit()
    await db.refresh(snag)

    resp = SnagItemResponse.model_validate(snag)
    if snag.unit:
        resp.unit_number = snag.unit.unit_number
        if snag.unit.project:
            resp.project_name = snag.unit.project.project_name
    if snag.verified_by:
        resp.verified_by_engineer_name = snag.verified_by.full_name_en
    return resp


# --------------------------------------------------------------------------
# 2. Handover Inspections & Key Possession
# --------------------------------------------------------------------------
@router.get("/inspections", response_model=List[HandoverInspectionResponse])
async def list_inspections(
    booking_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(HandoverInspection)
        .options(
            selectinload(HandoverInspection.booking).selectinload(Booking.project),
            selectinload(HandoverInspection.booking).selectinload(Booking.customer),
            selectinload(HandoverInspection.unit),
            selectinload(HandoverInspection.site_engineer),
            selectinload(HandoverInspection.snag_items)
        )
        .order_by(HandoverInspection.id.desc())
    )
    if booking_id:
        stmt = stmt.where(HandoverInspection.booking_id == booking_id)
    if status_filter:
        stmt = stmt.where(HandoverInspection.status == status_filter)

    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list: List[HandoverInspectionResponse] = []
    for r in records:
        resp = HandoverInspectionResponse.model_validate(r)
        if r.booking:
            if r.booking.customer:
                resp.customer_name = r.booking.customer.full_name_en
                resp.customer_phone = r.booking.customer.primary_phone
            if r.booking.project:
                resp.project_name = r.booking.project.project_name
        if r.unit:
            resp.unit_number = r.unit.unit_number
        if r.site_engineer:
            resp.site_engineer_name = r.site_engineer.full_name_en
        
        snags = r.snag_items or []
        resp.open_snags_count = len([s for s in snags if s.status in ["OPEN", "ASSIGNED", "IN_PROGRESS"]])
        resp.resolved_snags_count = len([s for s in snags if s.status in ["FIXED", "VERIFIED_CLOSED"]])
        resp_list.append(resp)
    return resp_list


@router.post("/inspections", response_model=HandoverInspectionResponse, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    payload: HandoverInspectionCreate,
    db: AsyncSession = Depends(get_db)
):
    insp = HandoverInspection(
        booking_id=payload.booking_id,
        unit_id=payload.unit_id,
        site_engineer_id=payload.site_engineer_id,
        inspection_date=payload.inspection_date or date.today(),
        all_financial_dues_cleared=payload.all_financial_dues_cleared,
        key_sets_count=payload.key_sets_count,
        status="INSPECTION_PENDING",
        notes=payload.notes
    )
    db.add(insp)
    await db.commit()
    await db.refresh(insp)

    stmt = (
        select(HandoverInspection)
        .options(
            selectinload(HandoverInspection.booking).selectinload(Booking.project),
            selectinload(HandoverInspection.booking).selectinload(Booking.customer),
            selectinload(HandoverInspection.unit),
            selectinload(HandoverInspection.site_engineer),
            selectinload(HandoverInspection.snag_items)
        )
        .where(HandoverInspection.id == insp.id)
    )
    res = await db.execute(stmt)
    insp = res.scalar_one()

    resp = HandoverInspectionResponse.model_validate(insp)
    if insp.booking:
        if insp.booking.customer:
            resp.customer_name = insp.booking.customer.full_name_en
            resp.customer_phone = insp.booking.customer.primary_phone
        if insp.booking.project:
            resp.project_name = insp.booking.project.project_name
    if insp.unit:
        resp.unit_number = insp.unit.unit_number
    if insp.site_engineer:
        resp.site_engineer_name = insp.site_engineer.full_name_en
    return resp


@router.patch("/inspections/{inspection_id}/handover", response_model=HandoverInspectionResponse)
async def execute_possession_handover(
    inspection_id: int,
    payload: HandoverExecution,
    db: AsyncSession = Depends(get_db)
):
    """
    Executes Key Possession Handover:
    1. Verifies 100% financial dues clearance.
    2. Generates official Possession Letter Number and Key Handover Certificate Number.
    3. Activates statutory 12-Month Defect Liability Period (DLP) Warranty.
    4. Marks Unit as 'HandedOver'.
    """
    stmt = (
        select(HandoverInspection)
        .options(
            selectinload(HandoverInspection.booking).selectinload(Booking.project),
            selectinload(HandoverInspection.booking).selectinload(Booking.customer),
            selectinload(HandoverInspection.unit),
            selectinload(HandoverInspection.site_engineer),
            selectinload(HandoverInspection.snag_items)
        )
        .where(HandoverInspection.id == inspection_id)
    )
    res = await db.execute(stmt)
    insp = res.scalar_one_or_none()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found.")

    if not insp.all_financial_dues_cleared:
        raise HTTPException(
            status_code=400,
            detail="Cannot execute possession handover! Accounts clearance is pending. All financial dues must be 100% settled."
        )

    count = (await db.execute(select(func.count(HandoverInspection.id)))).scalar() or 0
    idx = count + 1
    while True:
        poss_no = f"POSS-{date.today().year}-{idx:04d}"
        key_no = f"KEY-{date.today().year}-{idx:04d}"
        exists = (await db.execute(select(HandoverInspection.id).where(HandoverInspection.possession_letter_number == poss_no))).scalar_one_or_none()
        if not exists:
            break
        idx += 1

    handover_date = payload.possession_handover_date
    warranty_end = handover_date + timedelta(days=365)

    insp.possession_letter_number = poss_no
    insp.key_handover_certificate_number = key_no
    insp.key_sets_count = payload.key_sets_count
    insp.possession_handover_date = handover_date
    insp.joint_customer_signoff = payload.joint_customer_signoff
    insp.customer_signoff_date = handover_date if payload.joint_customer_signoff else None
    insp.warranty_start_date = handover_date
    insp.warranty_end_date = warranty_end
    insp.status = "POSSESSION_HANDED_OVER"
    if payload.notes:
        insp.notes = f"{insp.notes or ''} | {payload.notes}".strip(" |")

    # Update unit status
    if insp.unit:
        insp.unit.status = "HandedOver"

    await db.commit()
    await db.refresh(insp)

    resp = HandoverInspectionResponse.model_validate(insp)
    if insp.booking:
        if insp.booking.customer:
            resp.customer_name = insp.booking.customer.full_name_en
            resp.customer_phone = insp.booking.customer.primary_phone
        if insp.booking.project:
            resp.project_name = insp.booking.project.project_name
    if insp.unit:
        resp.unit_number = insp.unit.unit_number
    if insp.site_engineer:
        resp.site_engineer_name = insp.site_engineer.full_name_en
    return resp


@router.get("/inspections/{inspection_id}/possession-letter")
async def download_possession_letter_pdf(
    inspection_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(HandoverInspection)
        .options(
            selectinload(HandoverInspection.booking).selectinload(Booking.project),
            selectinload(HandoverInspection.booking).selectinload(Booking.customer),
            selectinload(HandoverInspection.unit),
            selectinload(HandoverInspection.site_engineer)
        )
        .where(HandoverInspection.id == inspection_id)
    )
    res = await db.execute(stmt)
    insp = res.scalar_one_or_none()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found.")

    if not insp.possession_letter_number:
        raise HTTPException(status_code=400, detail="Possession handover has not been executed yet.")

    data = {
        "developer_name": "BLUE OCEANS REAL ESTATE LTD.",
        "possession_letter_number": insp.possession_letter_number,
        "key_handover_certificate_number": insp.key_handover_certificate_number or "KEY-2026-0001",
        "key_sets_count": insp.key_sets_count or 3,
        "possession_handover_date": insp.possession_handover_date.strftime("%d %B %Y") if insp.possession_handover_date else str(date.today()),
        "warranty_start_date": insp.warranty_start_date.strftime("%d %B %Y") if insp.warranty_start_date else str(date.today()),
        "warranty_end_date": insp.warranty_end_date.strftime("%d %B %Y") if insp.warranty_end_date else str(date.today() + timedelta(days=365)),
        "project_name": insp.booking.project.project_name if (insp.booking and insp.booking.project) else "Prime Residency",
        "unit_number": insp.unit.unit_number if insp.unit else "N/A",
        "unit_size_sqft": float(insp.unit.gross_saleable_area_sqft) if (insp.unit and insp.unit.gross_saleable_area_sqft) else "1550",
        "customer_name": insp.booking.customer.full_name_en if (insp.booking and insp.booking.customer) else "Valued Allottee",
        "customer_nid": insp.booking.customer.nid_number if (insp.booking and insp.booking.customer) else "19852691234567890",
        "booking_reference_no": insp.booking.booking_reference_no if insp.booking else "BK-2026-001",
        "site_engineer_name": insp.site_engineer.full_name_en if insp.site_engineer else "Engr. Site Manager"
    }

    pdf_bytes = generate_possession_letter_pdf(data)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={insp.possession_letter_number}.pdf"}
    )


# --------------------------------------------------------------------------
# 3. Defect Liability Period (DLP) 12-Month Warranty Tickets
# --------------------------------------------------------------------------
@router.get("/dlp-tickets", response_model=List[DLPTicketResponse])
async def list_dlp_tickets(
    unit_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    category_filter: Optional[str] = Query(None),
    severity_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(DLPTicket)
        .options(selectinload(DLPTicket.unit).selectinload(Unit.project))
        .order_by(DLPTicket.id.desc())
    )
    if unit_id:
        stmt = stmt.where(DLPTicket.unit_id == unit_id)
    if status_filter:
        stmt = stmt.where(DLPTicket.status == status_filter)
    if category_filter:
        stmt = stmt.where(DLPTicket.ticket_category == category_filter)
    if severity_filter:
        stmt = stmt.where(DLPTicket.defect_severity == severity_filter)

    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list: List[DLPTicketResponse] = []
    today = date.today()
    for r in records:
        resp = DLPTicketResponse.model_validate(r)
        if r.unit:
            resp.unit_number = r.unit.unit_number
            if r.unit.project:
                resp.project_name = r.unit.project.project_name
        
        # Check live SLA breach status if still open
        if r.status in ["OPEN", "IN_PROGRESS"] and r.rectification_deadline < today:
            resp.sla_breach_status = "SLA_BREACHED"
        resp_list.append(resp)
    return resp_list


@router.post("/dlp-tickets", response_model=DLPTicketResponse, status_code=status.HTTP_201_CREATED)
async def create_dlp_ticket(
    payload: DLPTicketCreate,
    db: AsyncSession = Depends(get_db)
):
    """Raise a defect under 12-Month DLP Warranty with SLA resolution timer."""
    count = (await db.execute(select(func.count(DLPTicket.id)))).scalar() or 0
    idx = count + 1
    while True:
        candidate = f"DLP-{date.today().year}-{idx:04d}"
        exists = (await db.execute(select(DLPTicket.id).where(DLPTicket.ticket_code == candidate))).scalar_one_or_none()
        if not exists:
            ticket_code = candidate
            break
        idx += 1

    # Default SLA hours by severity: Critical=24h (1d), High=48h (2d), Medium=72h (3d), Low=120h (5d)
    sla_hours = payload.sla_hours or (24 if payload.defect_severity == "CRITICAL" else (48 if payload.defect_severity == "HIGH" else (72 if payload.defect_severity == "MEDIUM" else 120)))
    days = sla_hours // 24 or 1
    reported_d = payload.reported_date or date.today()
    deadline = payload.rectification_deadline or (reported_d + timedelta(days=days))

    # Check 12-month warranty from unit handover inspection
    insp_res = await db.execute(
        select(HandoverInspection)
        .where(
            HandoverInspection.unit_id == payload.unit_id,
            HandoverInspection.status == "POSSESSION_HANDED_OVER"
        )
        .order_by(HandoverInspection.id.desc())
        .limit(1)
    )
    insp = insp_res.scalar_one_or_none()
    warranty_valid_until = insp.warranty_end_date if insp else (reported_d + timedelta(days=365))
    is_under_warranty = True if (warranty_valid_until and warranty_valid_until >= reported_d) else False

    ticket = DLPTicket(
        unit_id=payload.unit_id,
        ticket_code=ticket_code,
        ticket_category=payload.ticket_category,
        defect_severity=payload.defect_severity,
        issue_description=payload.issue_description,
        reported_date=reported_d,
        rectification_deadline=deadline,
        sla_hours=sla_hours,
        sla_breach_status="WITHIN_SLA",
        warranty_valid_until=warranty_valid_until,
        is_under_warranty=is_under_warranty,
        assigned_technician=payload.assigned_technician,
        borne_by=payload.borne_by,
        status="OPEN"
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    stmt = (
        select(DLPTicket)
        .options(selectinload(DLPTicket.unit).selectinload(Unit.project))
        .where(DLPTicket.id == ticket.id)
    )
    res = await db.execute(stmt)
    ticket = res.scalar_one()

    resp = DLPTicketResponse.model_validate(ticket)
    if ticket.unit:
        resp.unit_number = ticket.unit.unit_number
        if ticket.unit.project:
            resp.project_name = ticket.unit.project.project_name
    return resp


@router.patch("/dlp-tickets/{ticket_id}/status", response_model=DLPTicketResponse)
async def update_dlp_ticket_status(
    ticket_id: int,
    payload: DLPTicketUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(DLPTicket)
        .options(selectinload(DLPTicket.unit).selectinload(Unit.project))
        .where(DLPTicket.id == ticket_id)
    )
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="DLP Ticket not found.")

    ticket.status = payload.status
    if payload.rectification_notes:
        ticket.rectification_notes = payload.rectification_notes
    if payload.resolution_cost_bdt is not None:
        ticket.resolution_cost_bdt = Decimal(str(payload.resolution_cost_bdt))

    if payload.status in ["RESOLVED", "CLOSED"]:
        rectified_d = payload.rectified_date or date.today()
        ticket.rectified_date = rectified_d
        if rectified_d <= ticket.rectification_deadline:
            ticket.sla_breach_status = "RESOLVED_ON_TIME"
        else:
            ticket.sla_breach_status = "SLA_BREACHED"

    await db.commit()
    await db.refresh(ticket)

    resp = DLPTicketResponse.model_validate(ticket)
    if ticket.unit:
        resp.unit_number = ticket.unit.unit_number
        if ticket.unit.project:
            resp.project_name = ticket.unit.project.project_name
    return resp


# --------------------------------------------------------------------------
# 4. Commercial Space & Shop Rental / Lease Engine
# --------------------------------------------------------------------------
@router.get("/leases", response_model=List[LeaseAgreementResponse])
async def list_lease_agreements(
    unit_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    space_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(LeaseAgreement)
        .options(
            selectinload(LeaseAgreement.unit).selectinload(Unit.project),
            selectinload(LeaseAgreement.cam_bills)
        )
        .order_by(LeaseAgreement.id.desc())
    )
    if unit_id:
        stmt = stmt.where(LeaseAgreement.unit_id == unit_id)
    if status_filter:
        stmt = stmt.where(LeaseAgreement.status == status_filter)
    if space_type:
        stmt = stmt.where(LeaseAgreement.commercial_space_type == space_type)

    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list: List[LeaseAgreementResponse] = []
    for r in records:
        resp = LeaseAgreementResponse.model_validate(r)
        if r.unit:
            resp.unit_number = r.unit.unit_number
            if r.unit.project:
                resp.project_name = r.unit.project.project_name
        bills = r.cam_bills or []
        resp.total_cam_billed_bdt = sum(float(b.total_bill_amount) for b in bills)
        resp_list.append(resp)
    return resp_list


@router.post("/leases", response_model=LeaseAgreementResponse, status_code=status.HTTP_201_CREATED)
async def create_lease_agreement(
    payload: LeaseAgreementCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register commercial shop / office lease with tenant profile, terms, security deposit, and CAM rate."""
    count = (await db.execute(select(func.count(LeaseAgreement.id)))).scalar() or 0
    idx = count + 1
    while True:
        candidate = f"LSE-{date.today().year}-{idx:03d}"
        exists = (await db.execute(select(LeaseAgreement.id).where(LeaseAgreement.lease_reference_no == candidate))).scalar_one_or_none()
        if not exists:
            lease_ref = candidate
            break
        idx += 1

    # Auto-calculate monthly rent if not explicitly provided: floor_area * rent_per_sqft
    monthly_rent = payload.monthly_rent_bdt or round(float(payload.floor_area_sqft) * float(payload.rent_per_sqft_bdt), 2)

    lease = LeaseAgreement(
        unit_id=payload.unit_id,
        lease_reference_no=lease_ref,
        tenant_name=payload.tenant_name,
        tenant_company_name=payload.tenant_company_name,
        trade_license_number=payload.trade_license_number,
        tin_bin_number=payload.tin_bin_number,
        tenant_nid=payload.tenant_nid,
        tenant_phone=payload.tenant_phone,
        tenant_email=payload.tenant_email,
        emergency_contact_phone=payload.emergency_contact_phone,
        commercial_space_type=payload.commercial_space_type,
        floor_area_sqft=Decimal(str(payload.floor_area_sqft)),
        rent_per_sqft_bdt=Decimal(str(payload.rent_per_sqft_bdt)),
        monthly_rent_bdt=Decimal(str(monthly_rent)),
        cam_rate_per_sqft_bdt=Decimal(str(payload.cam_rate_per_sqft_bdt)),
        fitout_grace_period_days=payload.fitout_grace_period_days,
        lease_start_date=payload.lease_start_date,
        lease_expiry_date=payload.lease_expiry_date,
        security_deposit_bdt=Decimal(str(payload.security_deposit_bdt)),
        security_deposit_status=payload.security_deposit_status,
        rent_escalation_percent=Decimal(str(payload.rent_escalation_percent)),
        escalation_frequency_months=payload.escalation_frequency_months,
        status="ACTIVE",
        remarks=payload.remarks
    )
    db.add(lease)
    await db.commit()
    await db.refresh(lease)

    stmt = (
        select(LeaseAgreement)
        .options(selectinload(LeaseAgreement.unit).selectinload(Unit.project))
        .where(LeaseAgreement.id == lease.id)
    )
    res = await db.execute(stmt)
    lease = res.scalar_one()

    resp = LeaseAgreementResponse.model_validate(lease)
    if lease.unit:
        resp.unit_number = lease.unit.unit_number
        if lease.unit.project:
            resp.project_name = lease.unit.project.project_name
    return resp


# --------------------------------------------------------------------------
# 5. Monthly CAM (Common Area Maintenance) Service Charge Billing
# --------------------------------------------------------------------------
@router.get("/cam-bills", response_model=List[CAMBillResponse])
async def list_cam_bills(
    lease_id: Optional[int] = Query(None),
    bill_month: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(CAMBill)
        .options(
            selectinload(CAMBill.lease).selectinload(LeaseAgreement.unit).selectinload(Unit.project)
        )
        .order_by(CAMBill.id.desc())
    )
    if lease_id:
        stmt = stmt.where(CAMBill.lease_id == lease_id)
    if bill_month:
        stmt = stmt.where(CAMBill.bill_month == bill_month)
    if payment_status:
        stmt = stmt.where(CAMBill.payment_status == payment_status)

    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list: List[CAMBillResponse] = []
    for b in records:
        resp = CAMBillResponse.model_validate(b)
        if b.lease:
            resp.tenant_name = b.lease.tenant_name
            resp.tenant_company_name = b.lease.tenant_company_name
            if b.lease.unit:
                resp.unit_number = b.lease.unit.unit_number
                if b.lease.unit.project:
                    resp.project_name = b.lease.unit.project.project_name
        resp_list.append(resp)
    return resp_list


@router.post("/cam-bills", response_model=CAMBillResponse, status_code=status.HTTP_201_CREATED)
async def generate_cam_bill(
    payload: CAMBillCreate,
    db: AsyncSession = Depends(get_db)
):
    """Generates monthly Common Area Maintenance (CAM) service charge bill for a leased unit."""
    lease = await db.get(LeaseAgreement, payload.lease_id)
    if not lease:
        raise HTTPException(status_code=404, detail="Lease agreement not found.")

    count = (await db.execute(select(func.count(CAMBill.id)))).scalar() or 0
    bill_no = f"CAM-{payload.bill_month.replace('-', '')}-{count + 1:03d}"

    area = float(lease.floor_area_sqft)
    cam_rate = float(lease.cam_rate_per_sqft_bdt)
    cam_amount = round(area * cam_rate, 2)
    sinking = float(payload.sinking_fund_charge)
    gen = float(payload.generator_backup_charge)
    common_elec = float(payload.common_electricity_water)
    total = round(cam_amount + sinking + gen + common_elec, 2)

    due_date = payload.due_date or (date.today() + timedelta(days=15))

    bill = CAMBill(
        bill_number=bill_no,
        lease_id=payload.lease_id,
        bill_month=payload.bill_month,
        billing_date=date.today(),
        due_date=due_date,
        area_sqft=Decimal(str(area)),
        cam_rate_per_sqft=Decimal(str(cam_rate)),
        cam_amount=Decimal(str(cam_amount)),
        sinking_fund_charge=Decimal(str(sinking)),
        generator_backup_charge=Decimal(str(gen)),
        common_electricity_water=Decimal(str(common_elec)),
        total_bill_amount=Decimal(str(total)),
        paid_amount=Decimal("0.00"),
        payment_status="UNPAID",
        remarks=payload.remarks
    )
    db.add(bill)
    await db.commit()
    await db.refresh(bill)

    stmt = (
        select(CAMBill)
        .options(
            selectinload(CAMBill.lease).selectinload(LeaseAgreement.unit).selectinload(Unit.project)
        )
        .where(CAMBill.id == bill.id)
    )
    res = await db.execute(stmt)
    bill = res.scalar_one()

    resp = CAMBillResponse.model_validate(bill)
    if bill.lease:
        resp.tenant_name = bill.lease.tenant_name
        resp.tenant_company_name = bill.lease.tenant_company_name
        if bill.lease.unit:
            resp.unit_number = bill.lease.unit.unit_number
            if bill.lease.unit.project:
                resp.project_name = bill.lease.unit.project.project_name
    return resp


@router.post("/cam-bills/{bill_id}/pay", response_model=CAMBillResponse)
async def record_cam_bill_payment(
    bill_id: int,
    payload: CAMBillPayment,
    db: AsyncSession = Depends(get_db)
):
    """Record tenant payment against monthly CAM bill."""
    stmt = (
        select(CAMBill)
        .options(
            selectinload(CAMBill.lease).selectinload(LeaseAgreement.unit).selectinload(Unit.project)
        )
        .where(CAMBill.id == bill_id)
    )
    res = await db.execute(stmt)
    bill = res.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="CAM Bill not found.")

    new_paid = float(bill.paid_amount) + float(payload.paid_amount)
    bill.paid_amount = Decimal(str(new_paid))
    bill.paid_date = payload.paid_date or date.today()

    if new_paid >= float(bill.total_bill_amount):
        bill.payment_status = "PAID"
    elif new_paid > 0:
        bill.payment_status = "PARTIALLY_PAID"

    if payload.remarks:
        bill.remarks = f"{bill.remarks or ''} | Paid BDT {payload.paid_amount} via {payload.payment_mode}".strip(" |")

    await db.commit()
    await db.refresh(bill)

    resp = CAMBillResponse.model_validate(bill)
    if bill.lease:
        resp.tenant_name = bill.lease.tenant_name
        resp.tenant_company_name = bill.lease.tenant_company_name
        if bill.lease.unit:
            resp.unit_number = bill.lease.unit.unit_number
            if bill.lease.unit.project:
                resp.project_name = bill.lease.unit.project.project_name
    return resp


# --------------------------------------------------------------------------
# 6. Commercial Space Utility Sub-Meter Readings
# --------------------------------------------------------------------------
@router.get("/utility-readings", response_model=List[UtilitySubMeterReadingResponse])
async def list_utility_readings(
    lease_id: Optional[int] = Query(None),
    meter_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(UtilitySubMeterReading)
        .options(
            selectinload(UtilitySubMeterReading.lease).selectinload(LeaseAgreement.unit)
        )
        .order_by(UtilitySubMeterReading.id.desc())
    )
    if lease_id:
        stmt = stmt.where(UtilitySubMeterReading.lease_id == lease_id)
    if meter_type:
        stmt = stmt.where(UtilitySubMeterReading.meter_type == meter_type)

    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list: List[UtilitySubMeterReadingResponse] = []
    for r in records:
        resp = UtilitySubMeterReadingResponse.model_validate(r)
        if r.lease:
            resp.tenant_name = r.lease.tenant_name
            resp.tenant_company_name = r.lease.tenant_company_name
            if r.lease.unit:
                resp.unit_number = r.lease.unit.unit_number
        resp_list.append(resp)
    return resp_list


@router.post("/utility-readings", response_model=UtilitySubMeterReadingResponse, status_code=status.HTTP_201_CREATED)
async def record_utility_submeter_reading(
    payload: UtilitySubMeterReadingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Record sub-meter reading entry with automatic units consumed, subtotal, and VAT calculation."""
    if payload.current_reading < payload.previous_reading:
        raise HTTPException(
            status_code=400,
            detail="Current meter reading cannot be lower than previous reading!"
        )

    consumed = round(payload.current_reading - payload.previous_reading, 2)
    subtotal = round(consumed * payload.tariff_rate_per_unit, 2)
    vat_amt = round(subtotal * (payload.vat_rate_percent / 100.0), 2)
    total = round(subtotal + vat_amt, 2)

    reading = UtilitySubMeterReading(
        lease_id=payload.lease_id,
        meter_number=payload.meter_number,
        meter_type=payload.meter_type,
        reading_date=payload.reading_date or date.today(),
        previous_reading=Decimal(str(payload.previous_reading)),
        current_reading=Decimal(str(payload.current_reading)),
        units_consumed=Decimal(str(consumed)),
        tariff_rate_per_unit=Decimal(str(payload.tariff_rate_per_unit)),
        subtotal_amount=Decimal(str(subtotal)),
        vat_rate_percent=Decimal(str(payload.vat_rate_percent)),
        total_utility_amount=Decimal(str(total)),
        billing_status="BILLED",
        remarks=payload.remarks
    )
    db.add(reading)
    await db.commit()
    await db.refresh(reading)

    stmt = (
        select(UtilitySubMeterReading)
        .options(selectinload(UtilitySubMeterReading.lease).selectinload(LeaseAgreement.unit))
        .where(UtilitySubMeterReading.id == reading.id)
    )
    res = await db.execute(stmt)
    reading = res.scalar_one()

    resp = UtilitySubMeterReadingResponse.model_validate(reading)
    if reading.lease:
        resp.tenant_name = reading.lease.tenant_name
        resp.tenant_company_name = reading.lease.tenant_company_name
        if reading.lease.unit:
            resp.unit_number = reading.lease.unit.unit_number
    return resp


# --------------------------------------------------------------------------
# 7. Flat Owners Association
# --------------------------------------------------------------------------
@router.get("/associations", response_model=List[OwnersAssociationResponse])
async def list_owners_associations(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(OwnersAssociation)
        .options(selectinload(OwnersAssociation.project))
        .order_by(OwnersAssociation.id.desc())
    )
    if project_id:
        stmt = stmt.where(OwnersAssociation.project_id == project_id)

    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list: List[OwnersAssociationResponse] = []
    for r in records:
        resp = OwnersAssociationResponse.model_validate(r)
        if r.project:
            resp.project_name = r.project.project_name
        resp_list.append(resp)
    return resp_list


@router.post("/associations", response_model=OwnersAssociationResponse, status_code=status.HTTP_201_CREATED)
async def create_owners_association(
    payload: OwnersAssociationCreate,
    db: AsyncSession = Depends(get_db)
):
    assoc = OwnersAssociation(
        project_id=payload.project_id,
        association_name=payload.association_name,
        handover_date=payload.handover_date,
        sinking_fund_transferred_bdt=payload.sinking_fund_transferred_bdt,
        monthly_service_charge_per_flat=payload.monthly_service_charge_per_flat,
        president_name=payload.president_name,
        secretary_name=payload.secretary_name,
        contact_phone=payload.contact_phone,
        status=payload.status or "FORMED"
    )
    db.add(assoc)
    await db.commit()
    await db.refresh(assoc)

    stmt = (
        select(OwnersAssociation)
        .options(selectinload(OwnersAssociation.project))
        .where(OwnersAssociation.id == assoc.id)
    )
    res = await db.execute(stmt)
    assoc = res.scalar_one()

    resp = OwnersAssociationResponse.model_validate(assoc)
    if assoc.project:
        resp.project_name = assoc.project.project_name
    return resp
