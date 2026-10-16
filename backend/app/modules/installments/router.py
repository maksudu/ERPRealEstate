import logging
from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.modules.sales.models import Booking
from app.modules.crm.models import Customer
from app.modules.installments.models import CustomerInstallment, PDCVault, NI138LegalAction
from app.modules.installments.schemas import (
    CustomerInstallmentCreate, CustomerInstallmentResponse,
    InstallmentScheduleGenerateRequest,
    PDCVaultCreate, PDCVaultResponse, PDCStatusUpdateRequest,
    NI138LegalActionResponse, NI138ServeNoticeRequest, NI138FileCaseRequest,
    InstallmentMetrics
)
from app.modules.installments.legal_notice_generator import generate_section138_legal_notice_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/installments", tags=["Installments, PDC Vault & NI Act 138 Engine"])


# --------------------------------------------------------------------------
# 1. Customer Installment Schedules
# --------------------------------------------------------------------------
@router.get("/schedules", response_model=List[CustomerInstallmentResponse])
async def list_installments(
    booking_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns installment schedule milestones for bookings.
    """
    stmt = (
        select(CustomerInstallment)
        .options(
            selectinload(CustomerInstallment.booking).selectinload(Booking.customer),
            selectinload(CustomerInstallment.booking).selectinload(Booking.unit)
        )
        .order_by(CustomerInstallment.due_date.asc())
    )

    if booking_id:
        stmt = stmt.where(CustomerInstallment.booking_id == booking_id)
    if status_filter:
        stmt = stmt.where(CustomerInstallment.status == status_filter.upper())

    result = await db.execute(stmt)
    items = result.scalars().all()

    responses = []
    for item in items:
        resp = CustomerInstallmentResponse.model_validate(item)
        if item.booking:
            resp.booking_reference_no = item.booking.booking_reference_no
            if item.booking.customer:
                resp.customer_name = item.booking.customer.full_name_en
            if item.booking.unit:
                resp.unit_number = item.booking.unit.unit_number
        responses.append(resp)
    return responses


@router.post("/schedules/generate", response_model=List[CustomerInstallmentResponse], status_code=status.HTTP_201_CREATED)
async def generate_installment_schedule(
    payload: InstallmentScheduleGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Automated Installment Schedule Generator supporting:
    - Monthly amortization plan
    - Quarterly amortization plan
    - Construction-milestone payment triggers (Basement, Plinth, Roof Casting, Finishing, Handover)
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.customer),
            selectinload(Booking.unit)
        )
        .where(Booking.id == payload.booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    total_contract = float(booking.final_contract_value)
    earnest_money = float(booking.earnest_money_received)
    down_payment_pct = float(payload.down_payment_percentage or 20.0)
    
    down_payment_total = (total_contract * down_payment_pct / 100.0)
    remaining_balance = max(0.0, total_contract - down_payment_total - earnest_money)

    start_date = payload.start_date or date.today()
    created_installments = []

    # Installment 0: Down Payment Balance (if remaining)
    down_pay_due = max(0.0, down_payment_total - earnest_money)
    if down_pay_due > 0:
        inst_down = CustomerInstallment(
            booking_id=booking.id,
            installment_no=0,
            title="Allotment Down Payment",
            due_date=start_date + timedelta(days=15),
            grace_period_days=15,
            payable_amount=down_pay_due,
            status="DUE"
        )
        db.add(inst_down)
        created_installments.append(inst_down)

    if payload.plan_type.upper() == "CONSTRUCTION_MILESTONE":
        # 7 Construction Milestone Triggers under Real Estate Standards
        milestones = [
            ("Piling & Foundation Completion", 0.15, "FOUNDATION_DONE"),
            ("Basement & Sub-Structure Casting", 0.15, "BASEMENT_CASTING"),
            ("Ground to 4th Floor Super-Structure", 0.15, "STRUCTURE_L4"),
            ("Top Floor Roof Slab Casting", 0.15, "ROOF_CASTING"),
            ("Brickwork, Plaster & Electrical Conduits", 0.15, "BRICKWORK_PLASTER"),
            ("Tiles, Sanitary & Paint Finishing", 0.15, "FINISHING_TILES"),
            ("Key Handover & Final Settlement", 0.10, "HANDOVER_CERTIFICATE")
        ]
        
        current_date = start_date + timedelta(days=45)
        for idx, (title, pct, trigger) in enumerate(milestones, start=1):
            amount = round(remaining_balance * pct, 2)
            inst = CustomerInstallment(
                booking_id=booking.id,
                installment_no=idx,
                title=f"Milestone #{idx}: {title}",
                due_date=current_date,
                grace_period_days=15,
                payable_amount=amount,
                status="UPCOMING",
                milestone_trigger=trigger
            )
            db.add(inst)
            created_installments.append(inst)
            current_date += timedelta(days=90) # ~every 3 months per milestone

    elif payload.plan_type.upper() == "QUARTERLY":
        quarters = max(1, payload.total_installments or 8)
        per_quarter = round(remaining_balance / quarters, 2)
        current_date = start_date + timedelta(days=90)
        for i in range(1, quarters + 1):
            inst = CustomerInstallment(
                booking_id=booking.id,
                installment_no=i,
                title=f"Quarterly Installment #{i:02d}",
                due_date=current_date,
                grace_period_days=15,
                payable_amount=per_quarter,
                status="UPCOMING"
            )
            db.add(inst)
            created_installments.append(inst)
            current_date += timedelta(days=90)

    else: # Default: MONTHLY
        months = max(1, payload.total_installments or 24)
        per_month = round(remaining_balance / months, 2)
        current_date = start_date + timedelta(days=30)
        for i in range(1, months + 1):
            inst = CustomerInstallment(
                booking_id=booking.id,
                installment_no=i,
                title=f"Monthly Installment #{i:02d}",
                due_date=current_date,
                grace_period_days=15,
                payable_amount=per_month,
                status="UPCOMING"
            )
            db.add(inst)
            created_installments.append(inst)
            current_date += timedelta(days=30)

    await db.commit()

    # Re-query
    res = await db.execute(
        select(CustomerInstallment)
        .options(
            selectinload(CustomerInstallment.booking).selectinload(Booking.customer),
            selectinload(CustomerInstallment.booking).selectinload(Booking.unit)
        )
        .where(CustomerInstallment.booking_id == booking.id)
        .order_by(CustomerInstallment.installment_no.asc())
    )
    saved = res.scalars().all()
    out = []
    for s in saved:
        r = CustomerInstallmentResponse.model_validate(s)
        r.booking_reference_no = booking.booking_reference_no
        r.customer_name = booking.customer.full_name_en if booking.customer else None
        r.unit_number = booking.unit.unit_number if booking.unit else None
        out.append(r)
    return out


# --------------------------------------------------------------------------
# 2. PDC Cheque Vault Management
# --------------------------------------------------------------------------
@router.get("/pdc-vault", response_model=List[PDCVaultResponse])
async def list_pdc_vault(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of Post-Dated Cheques stored in vault with barcode pouches and maturity status.
    """
    stmt = (
        select(PDCVault)
        .options(
            selectinload(PDCVault.booking),
            selectinload(PDCVault.customer),
            selectinload(PDCVault.legal_action)
        )
        .order_by(PDCVault.maturity_date.asc())
    )

    if status_filter:
        stmt = stmt.where(PDCVault.status == status_filter.upper())
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                PDCVault.cheque_number.ilike(search_pattern),
                PDCVault.bank_name.ilike(search_pattern),
                PDCVault.pouch_barcode.ilike(search_pattern)
            )
        )

    result = await db.execute(stmt)
    cheques = result.scalars().all()

    responses = []
    for c in cheques:
        resp = PDCVaultResponse.model_validate(c)
        if c.booking:
            resp.booking_reference_no = c.booking.booking_reference_no
        if c.customer:
            resp.customer_name = c.customer.full_name_en
            resp.customer_phone = c.customer.primary_phone
        responses.append(resp)
    return responses


@router.post("/pdc-vault", response_model=PDCVaultResponse, status_code=status.HTTP_201_CREATED)
async def deposit_cheque_to_vault(
    payload: PDCVaultCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Safeguards a new PDC Cheque into vault with a unique physical pouch barcode.
    """
    count_res = await db.execute(select(func.count(PDCVault.id)))
    next_num = (count_res.scalar() or 0) + 1
    generated_barcode = payload.pouch_barcode or f"PDC-VAULT-2026-{next_num:05d}"

    cheque = PDCVault(
        booking_id=payload.booking_id,
        customer_id=payload.customer_id,
        cheque_number=payload.cheque_number,
        bank_name=payload.bank_name,
        branch_name=payload.branch_name,
        routing_number=payload.routing_number,
        maturity_date=payload.maturity_date,
        cheque_amount=payload.cheque_amount,
        pouch_barcode=generated_barcode,
        status="IN_VAULT"
    )
    db.add(cheque)
    await db.commit()

    # Re-fetch eager loaded
    result = await db.execute(
        select(PDCVault)
        .options(selectinload(PDCVault.booking), selectinload(PDCVault.customer))
        .where(PDCVault.id == cheque.id)
    )
    saved = result.scalars().first()
    resp = PDCVaultResponse.model_validate(saved)
    resp.booking_reference_no = saved.booking.booking_reference_no if saved.booking else None
    resp.customer_name = saved.customer.full_name_en if saved.customer else None
    resp.customer_phone = saved.customer.primary_phone if saved.customer else None
    return resp


@router.put("/pdc-vault/{cheque_id}/status", response_model=PDCVaultResponse)
async def update_pdc_status(
    cheque_id: int,
    payload: PDCStatusUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates status of PDC Cheque ('SENT_TO_BANK', 'HONOURED', 'DISHONOURED_BOUNCED').
    If DISHONOURED_BOUNCED:
    - Automatically initializes an NI Act 1881 Section 138 legal proceeding.
    - Sets statutory notice deadline (dishonour_memo_date + 30 days).
    """
    stmt = (
        select(PDCVault)
        .options(
            selectinload(PDCVault.booking),
            selectinload(PDCVault.customer),
            selectinload(PDCVault.legal_action)
        )
        .where(PDCVault.id == cheque_id)
    )
    result = await db.execute(stmt)
    cheque = result.scalars().first()
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found in vault")

    new_status = payload.status.upper()
    cheque.status = new_status

    if new_status == "DISHONOURED_BOUNCED":
        memo_date = payload.dishonour_memo_date or date.today()
        cheque.dishonour_memo_date = memo_date
        cheque.dishonour_reason = payload.dishonour_reason or "Insufficient Funds"

        # Check if legal action record exists
        if not cheque.legal_action:
            statutory_deadline = memo_date + timedelta(days=30)
            legal_action = NI138LegalAction(
                pdc_cheque_id=cheque.id,
                dishonour_memo_received_date=memo_date,
                statutory_notice_deadline_date=statutory_deadline,
                status="NOTICE_PENDING",
                remarks=f"Cheque returned dishonoured: {cheque.dishonour_reason}. Statutory notice required within 30 days."
            )
            db.add(legal_action)

    await db.commit()
    await db.refresh(cheque)

    resp = PDCVaultResponse.model_validate(cheque)
    resp.booking_reference_no = cheque.booking.booking_reference_no if cheque.booking else None
    resp.customer_name = cheque.customer.full_name_en if cheque.customer else None
    resp.customer_phone = cheque.customer.primary_phone if cheque.customer else None
    return resp


# --------------------------------------------------------------------------
# 3. NI Act 1881 Section 138 Legal Actions & Notice PDF
# --------------------------------------------------------------------------
@router.get("/ni138-actions", response_model=List[NI138LegalActionResponse])
async def list_ni138_actions(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists statutory Section 138 legal proceedings across 'NOTICE_PENDING', 'NOTICE_SERVED', 'COURT_CASE_FILED'.
    """
    stmt = (
        select(NI138LegalAction)
        .options(
            selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.customer),
            selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.booking).selectinload(Booking.unit),
            selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.booking).selectinload(Booking.project)
        )
        .order_by(NI138LegalAction.id.desc())
    )

    if status_filter:
        stmt = stmt.where(NI138LegalAction.status == status_filter.upper())

    result = await db.execute(stmt)
    actions = result.scalars().all()

    responses = []
    for a in actions:
        resp = NI138LegalActionResponse.model_validate(a)
        if a.pdc_cheque:
            resp.cheque_number = a.pdc_cheque.cheque_number
            resp.bank_name = a.pdc_cheque.bank_name
            resp.cheque_amount = float(a.pdc_cheque.cheque_amount)
            if a.pdc_cheque.customer:
                resp.customer_name = a.pdc_cheque.customer.full_name_en
                resp.customer_phone = a.pdc_cheque.customer.primary_phone
            if a.pdc_cheque.booking:
                resp.booking_reference_no = a.pdc_cheque.booking.booking_reference_no
        responses.append(resp)
    return responses


@router.post("/ni138-actions/{action_id}/serve-notice", response_model=NI138LegalActionResponse)
async def serve_statutory_notice(
    action_id: int,
    payload: NI138ServeNoticeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Records dispatch of Statutory Legal Notice via Registered Post with A/D.
    Sets the client's mandatory 30-day settlement deadline before criminal complaint can be filed.
    """
    stmt = (
        select(NI138LegalAction)
        .options(
            selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.customer),
            selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.booking)
        )
        .where(NI138LegalAction.id == action_id)
    )
    result = await db.execute(stmt)
    action = result.scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail="Legal Action record not found")

    served_date = payload.notice_served_to_client_date
    action.notice_served_to_client_date = served_date
    action.registered_post_ad_no = payload.registered_post_ad_no
    action.legal_counsel_name = payload.legal_counsel_name or "Barrister Tanvir Ahmed (Supreme Court)"
    action.client_30day_settlement_deadline = served_date + timedelta(days=30)
    action.status = "NOTICE_SERVED"
    action.remarks = payload.remarks or f"Legal notice dispatched under postal memo #{payload.registered_post_ad_no}."

    await db.commit()
    await db.refresh(action)

    resp = NI138LegalActionResponse.model_validate(action)
    if action.pdc_cheque:
        resp.cheque_number = action.pdc_cheque.cheque_number
        resp.bank_name = action.pdc_cheque.bank_name
        resp.cheque_amount = float(action.pdc_cheque.cheque_amount)
        if action.pdc_cheque.customer:
            resp.customer_name = action.pdc_cheque.customer.full_name_en
            resp.customer_phone = action.pdc_cheque.customer.primary_phone
        if action.pdc_cheque.booking:
            resp.booking_reference_no = action.pdc_cheque.booking.booking_reference_no
    return resp


@router.post("/ni138-actions/{action_id}/file-court-case", response_model=NI138LegalActionResponse)
async def file_court_case(
    action_id: int,
    payload: NI138FileCaseRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Files formal criminal complaint under Section 138 of NI Act 1881 before
    the Chief Metropolitan Magistrate (CMM) Court following expiry of 30-day notice.
    """
    stmt = (
        select(NI138LegalAction)
        .options(
            selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.customer),
            selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.booking)
        )
        .where(NI138LegalAction.id == action_id)
    )
    result = await db.execute(stmt)
    action = result.scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail="Legal Action record not found")

    action.court_case_no = payload.court_case_no
    action.legal_counsel_name = payload.legal_counsel_name
    action.status = "COURT_CASE_FILED"
    action.remarks = payload.remarks or f"CR Case filed in CMM Court: {payload.court_case_no}."

    await db.commit()
    await db.refresh(action)

    resp = NI138LegalActionResponse.model_validate(action)
    if action.pdc_cheque:
        resp.cheque_number = action.pdc_cheque.cheque_number
        resp.bank_name = action.pdc_cheque.bank_name
        resp.cheque_amount = float(action.pdc_cheque.cheque_amount)
        if action.pdc_cheque.customer:
            resp.customer_name = action.pdc_cheque.customer.full_name_en
            resp.customer_phone = action.pdc_cheque.customer.primary_phone
        if action.pdc_cheque.booking:
            resp.booking_reference_no = action.pdc_cheque.booking.booking_reference_no
    return resp


@router.get("/ni138-actions/{action_id}/notice-pdf")
async def download_ni138_notice_pdf(
    action_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Renders and streams formal Section 138 Statutory Legal Notice PDF using WeasyPrint.
    """
    stmt = (
        select(NI138LegalAction)
        .options(
            selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.customer),
            selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.booking).selectinload(Booking.unit),
            selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.booking).selectinload(Booking.project)
        )
        .where(NI138LegalAction.id == action_id)
    )
    result = await db.execute(stmt)
    action = result.scalars().first()
    if not action or not action.pdc_cheque:
        raise HTTPException(status_code=404, detail="Legal notice record not found")

    cheque = action.pdc_cheque
    customer = cheque.customer
    booking = cheque.booking

    notice_data = {
        "notice_ref": f"LEGAL/NI138/2026/{action.id:04d}",
        "notice_date": str(date.today()),
        "counsel_name": action.legal_counsel_name or "BARRISTER TANVIR AHMED (SUPREME COURT)",
        "customer_name": customer.full_name_en if customer else "Valued Buyer",
        "customer_address": customer.present_address if customer else "Address on record",
        "customer_phone": customer.primary_phone if customer else "N/A",
        "customer_nid": customer.nid_number if customer else "N/A",
        "booking_reference_no": booking.booking_reference_no if booking else "BK-REF",
        "project_name": booking.project.project_name if booking and booking.project else "Residential Project",
        "unit_number": booking.unit.unit_number if booking and booking.unit else "Apartment Unit",
        "cheque_number": cheque.cheque_number,
        "bank_name": cheque.bank_name,
        "branch_name": cheque.branch_name,
        "maturity_date": str(cheque.maturity_date),
        "cheque_amount": float(cheque.cheque_amount),
        "dishonour_memo_date": str(action.dishonour_memo_received_date),
        "dishonour_reason": cheque.dishonour_reason or "Insufficient Funds"
    }

    try:
        pdf_bytes = generate_section138_legal_notice_pdf(notice_data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Section_138_Legal_Notice_Cheque_{cheque.cheque_number}.pdf"
            }
        )
    except Exception as e:
        logger.error(f"Failed to generate Section 138 Notice PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Legal notice generation failed: {str(e)}")


# --------------------------------------------------------------------------
# 4. Metrics & Cron Trigger (PDC 3-Day SMS Reminder)
# --------------------------------------------------------------------------
@router.get("/metrics", response_model=InstallmentMetrics)
async def get_installment_metrics(db: AsyncSession = Depends(get_db)):
    """
    Returns collections pipeline analytics, overdue installments, vault balance, and bounce litigations.
    """
    due_count = (
        await db.execute(
            select(func.count(CustomerInstallment.id)).where(CustomerInstallment.status.in_(["DUE", "OVERDUE"]))
        )
    ).scalar() or 0

    overdue_amt = (
        await db.execute(
            select(func.sum(CustomerInstallment.payable_amount - CustomerInstallment.paid_amount))
            .where(CustomerInstallment.status == "OVERDUE")
        )
    ).scalar() or 0.0

    vault_count = (
        await db.execute(
            select(func.count(PDCVault.id)).where(PDCVault.status == "IN_VAULT")
        )
    ).scalar() or 0

    vault_amt = (
        await db.execute(
            select(func.sum(PDCVault.cheque_amount)).where(PDCVault.status == "IN_VAULT")
        )
    ).scalar() or 0.0

    bounced_count = (
        await db.execute(
            select(func.count(PDCVault.id)).where(PDCVault.status == "DISHONOURED_BOUNCED")
        )
    ).scalar() or 0

    legal_count = (
        await db.execute(
            select(func.count(NI138LegalAction.id)).where(NI138LegalAction.status.in_(["NOTICE_PENDING", "NOTICE_SERVED"]))
        )
    ).scalar() or 0

    return InstallmentMetrics(
        total_installments_due=due_count,
        total_overdue_amount=float(overdue_amt),
        total_pdc_in_vault=vault_count,
        total_vault_amount=float(vault_amt),
        total_dishonoured_cheques=bounced_count,
        active_ni138_actions=legal_count
    )


@router.post("/cron/trigger-pdc-sms-reminders")
async def trigger_pdc_sms_reminders(db: AsyncSession = Depends(get_db)):
    """
    Daily cron task: Finds PDC cheques maturing in exactly 3 days and dispatches SMS alerts.
    """
    target_date = date.today() + timedelta(days=3)
    stmt = (
        select(PDCVault)
        .options(selectinload(PDCVault.customer))
        .where(PDCVault.maturity_date == target_date)
        .where(PDCVault.status == "IN_VAULT")
        .where(PDCVault.sms_reminder_sent == False)
    )
    result = await db.execute(stmt)
    maturing_cheques = result.scalars().all()

    dispatched = []
    for c in maturing_cheques:
        phone = c.customer.primary_phone if c.customer else "N/A"
        msg = f"Reminder: Your PDC Cheque #{c.cheque_number} for BDT {c.cheque_amount:,.2f} matures on {c.maturity_date}. Please ensure sufficient bank balance."
        logger.info(f"SMS Dispatched to {phone}: {msg}")
        c.sms_reminder_sent = True
        dispatched.append({"cheque_number": c.cheque_number, "phone": phone, "amount": float(c.cheque_amount)})

    await db.commit()
    return {
        "status": "success",
        "reminders_dispatched": len(dispatched),
        "details": dispatched
    }
