import logging
from datetime import date, datetime
from io import BytesIO
from typing import List, Optional
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
    HandoverInspection, DLPTicket, OwnersAssociation, LeaseAgreement
)
from app.modules.handover.schemas import (
    HandoverInspectionCreate, HandoverExecution, HandoverInspectionResponse,
    DLPTicketCreate, DLPTicketUpdate, DLPTicketResponse,
    OwnersAssociationCreate, OwnersAssociationResponse,
    LeaseAgreementCreate, LeaseAgreementResponse
)
from app.modules.handover.possession_generator import generate_possession_letter_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/handover", tags=["Handover, DLP & Property Operations"])


# --------------------------------------------------------------------------
# 1. Handover Inspections & Key Possession
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
            selectinload(HandoverInspection.site_engineer)
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
            resp.customer_name = r.booking.customer.full_name_en if r.booking.customer else None
            resp.project_name = r.booking.project.project_name if r.booking.project else None
        if r.unit:
            resp.unit_number = r.unit.unit_number
        if r.site_engineer:
            resp.site_engineer_name = r.site_engineer.full_name_en
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
            selectinload(HandoverInspection.site_engineer)
        )
        .where(HandoverInspection.id == insp.id)
    )
    res = await db.execute(stmt)
    insp = res.scalar_one()

    resp = HandoverInspectionResponse.model_validate(insp)
    if insp.booking:
        resp.customer_name = insp.booking.customer.full_name_en if insp.booking.customer else None
        resp.project_name = insp.booking.project.project_name if insp.booking.project else None
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

    if not insp.all_financial_dues_cleared:
        raise HTTPException(
            status_code=400,
            detail="Cannot execute possession handover! Accounts clearance is pending. All financial dues must be settled."
        )

    count = (await db.execute(select(func.count(HandoverInspection.id)))).scalar() or 0
    insp.possession_letter_number = f"POSS-{date.today().year}-{count + 1:04d}"
    insp.possession_handover_date = payload.possession_handover_date
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
        resp.customer_name = insp.booking.customer.full_name_en if insp.booking.customer else None
        resp.project_name = insp.booking.project.project_name if insp.booking.project else None
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
        "developer_name": "BANGLADESH REAL ESTATE LTD.",
        "possession_letter_number": insp.possession_letter_number,
        "possession_handover_date": insp.possession_handover_date.strftime("%d %B %Y") if insp.possession_handover_date else str(date.today()),
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
# 2. Defect Liability Period (DLP) 12-Month Snagging Warranty Tickets
# --------------------------------------------------------------------------
@router.get("/dlp-tickets", response_model=List[DLPTicketResponse])
async def list_dlp_tickets(
    unit_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    category_filter: Optional[str] = Query(None),
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

    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list: List[DLPTicketResponse] = []
    for r in records:
        resp = DLPTicketResponse.model_validate(r)
        if r.unit:
            resp.unit_number = r.unit.unit_number
            if r.unit.project:
                resp.project_name = r.unit.project.project_name
        resp_list.append(resp)
    return resp_list


@router.post("/dlp-tickets", response_model=DLPTicketResponse, status_code=status.HTTP_201_CREATED)
async def create_dlp_ticket(
    payload: DLPTicketCreate,
    db: AsyncSession = Depends(get_db)
):
    ticket = DLPTicket(
        unit_id=payload.unit_id,
        ticket_category=payload.ticket_category,
        issue_description=payload.issue_description,
        reported_date=payload.reported_date or date.today(),
        rectification_deadline=payload.rectification_deadline,
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
    if payload.status in ["RESOLVED", "CLOSED"]:
        ticket.rectified_date = payload.rectified_date or date.today()

    await db.commit()
    await db.refresh(ticket)

    resp = DLPTicketResponse.model_validate(ticket)
    if ticket.unit:
        resp.unit_number = ticket.unit.unit_number
        if ticket.unit.project:
            resp.project_name = ticket.unit.project.project_name
    return resp


# --------------------------------------------------------------------------
# 3. Flat Owners Association (ফ্ল্যাট মালিক কল্যাণ সমিতি)
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


# --------------------------------------------------------------------------
# 4. Rental Lease Agreements
# --------------------------------------------------------------------------
@router.get("/leases", response_model=List[LeaseAgreementResponse])
async def list_lease_agreements(
    unit_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(LeaseAgreement)
        .options(selectinload(LeaseAgreement.unit).selectinload(Unit.project))
        .order_by(LeaseAgreement.id.desc())
    )
    if unit_id:
        stmt = stmt.where(LeaseAgreement.unit_id == unit_id)

    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list: List[LeaseAgreementResponse] = []
    for r in records:
        resp = LeaseAgreementResponse.model_validate(r)
        if r.unit:
            resp.unit_number = r.unit.unit_number
            if r.unit.project:
                resp.project_name = r.unit.project.project_name
        resp_list.append(resp)
    return resp_list


@router.post("/leases", response_model=LeaseAgreementResponse, status_code=status.HTTP_201_CREATED)
async def create_lease_agreement(
    payload: LeaseAgreementCreate,
    db: AsyncSession = Depends(get_db)
):
    lease = LeaseAgreement(
        unit_id=payload.unit_id,
        tenant_name=payload.tenant_name,
        tenant_nid=payload.tenant_nid,
        tenant_phone=payload.tenant_phone,
        lease_start_date=payload.lease_start_date,
        lease_expiry_date=payload.lease_expiry_date,
        monthly_rent_bdt=payload.monthly_rent_bdt,
        security_deposit_bdt=payload.security_deposit_bdt,
        rent_escalation_percent=payload.rent_escalation_percent,
        status=payload.status or "ACTIVE"
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
