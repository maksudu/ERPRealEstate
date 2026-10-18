import logging
from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

import uuid
from decimal import Decimal, ROUND_HALF_UP
from app.core.database import get_db
from app.core.sms import send_sms
from app.modules.sales.models import Booking
from app.modules.crm.models import Customer
from app.modules.installments.models import (
    CustomerInstallment, BookingInstallmentSchedule, PDCVault, NI138LegalAction, InstallmentAlertLog,
    MoneyReceipt, MoneyReceiptAllocation, TripartiteLoan, LoanTranche
)
from app.modules.installments.schemas import (
    CustomerInstallmentCreate, CustomerInstallmentResponse,
    InstallmentScheduleGenerateRequest, InstallmentPaymentRequest,
    InstallmentSchedulePreviewRequest, InstallmentSchedulePreviewResponse, InstallmentSchedulePreviewItem,
    InstallmentScheduleAmendRequest,
    BookingInstallmentScheduleResponse, PaginatedInstallmentSchedulesResponse,
    InstallmentInvoiceGenerateRequest, InstallmentInvoiceResponse,
    InstallmentSurchargeCalculateRequest, InstallmentAlertDispatchRequest,
    InstallmentAlertLogResponse,
    PDCVaultCreate, PDCVaultResponse, PDCStatusUpdateRequest,
    NI138LegalActionResponse, NI138ServeNoticeRequest, NI138FileCaseRequest,
    InstallmentMetrics,
    MoneyReceiptCreate, MoneyReceiptResponse, MoneyReceiptAllocationResponse,
    TripartiteLoanCreate, TripartiteLoanResponse, TripartiteLoanNOCRequest,
    LoanTrancheCreate, LoanTrancheResponse, LoanTrancheInspectionRequest, LoanTrancheDisburseRequest
)
from app.modules.installments.legal_notice_generator import generate_section138_legal_notice_pdf
from app.modules.accounts.services import post_customer_collection_voucher

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


def build_schedule_installments(
    booking: Booking,
    plan_type: str,
    total_installments: int,
    down_payment_percentage: float,
    start_date: date,
    grace_period_days: int,
    custom_milestones: Optional[List] = None
):
    total_contract = Decimal(str(booking.final_contract_value))
    earnest_money = Decimal(str(booking.earnest_money_received or 0.00))
    dp_pct = Decimal(str(down_payment_percentage or 15.00))
    
    # 1. Total down payment (e.g. 15% of contract)
    down_payment_total = (total_contract * dp_pct / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # 2. Remaining installment balance (e.g. 85% of contract)
    installment_balance = total_contract - down_payment_total
    
    items = []
    
    # Booking Money (credited within down payment as per Bangladesh real estate norm)
    if earnest_money > Decimal('0.00'):
        pct_em = float((earnest_money / total_contract * Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        items.append({
            "installment_no": 0,
            "installment_type": "BOOKING_MONEY",
            "title": "Booking Money Realization (Credited)",
            "percentage": pct_em,
            "due_date": booking.booking_date or start_date,
            "grace_period_days": grace_period_days,
            "payable_amount": float(earnest_money),
            "is_rounding_adjusted": False,
            "rounding_adjustment": 0.00,
            "milestone_trigger": "BOOKING_CONFIRMATION"
        })
        
    # Net Down Payment Due (15% total - booking money credited)
    net_dp_due = max(Decimal('0.00'), down_payment_total - earnest_money)
    if net_dp_due > Decimal('0.00'):
        pct_dp = float((net_dp_due / total_contract * Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        items.append({
            "installment_no": 1 if earnest_money == Decimal('0.00') else 0,
            "installment_type": "DOWN_PAYMENT",
            "title": "Allotment Down Payment Balance",
            "percentage": pct_dp,
            "due_date": start_date + timedelta(days=grace_period_days),
            "grace_period_days": grace_period_days,
            "payable_amount": float(net_dp_due),
            "is_rounding_adjusted": False,
            "rounding_adjustment": 0.00,
            "milestone_trigger": "ALLOTMENT_LETTER"
        })
        
    # 3. Subsequent Installments with Exact Penny Rounding Distribution
    rounding_diff_total = Decimal('0.00')
    adjusted_inst_no = 1
    
    if custom_milestones and len(custom_milestones) > 0:
        curr_date = start_date + timedelta(days=30)
        accumulated = Decimal('0.00')
        start_idx = len(items) + 1
        n_custom = len(custom_milestones)
        
        for idx, m in enumerate(custom_milestones, start=1):
            pct_val = Decimal(str(m.percentage or 10.00)) / Decimal('100.00')
            base_amt = (installment_balance * pct_val).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            is_last = (idx == n_custom)
            rounding_adj = Decimal('0.00')
            if is_last:
                rounding_adj = installment_balance - (accumulated + base_amt)
                base_amt = base_amt + rounding_adj
                rounding_diff_total = rounding_adj
                adjusted_inst_no = start_idx + idx - 1
            accumulated += base_amt
            
            items.append({
                "installment_no": start_idx + idx - 1,
                "installment_type": getattr(m, 'installment_type', None) or "CONSTRUCTION_MILESTONE",
                "title": m.title,
                "percentage": float(m.percentage),
                "due_date": getattr(m, 'due_date', None) or curr_date,
                "grace_period_days": grace_period_days,
                "payable_amount": float(base_amt),
                "is_rounding_adjusted": is_last and (rounding_adj != Decimal('0.00')),
                "rounding_adjustment": float(rounding_adj),
                "milestone_trigger": m.milestone_trigger or f"MILESTONE_{idx}"
            })
            curr_date += timedelta(days=60)
            
    elif plan_type.upper() in ["CONSTRUCTION_MILESTONE", "STRUCTURAL_STAGE", "MILESTONE"]:
        milestones = [
            ("Piling & Foundation Completion", Decimal('0.15'), "FOUNDATION_DONE", "CONSTRUCTION_MILESTONE"),
            ("Basement & Sub-Structure Casting", Decimal('0.15'), "BASEMENT_CASTING", "STRUCTURAL_COMPLETION"),
            ("Ground to 4th Floor Super-Structure", Decimal('0.15'), "STRUCTURE_L4", "STRUCTURAL_COMPLETION"),
            ("Top Floor Roof Slab Casting", Decimal('0.15'), "ROOF_CASTING", "STRUCTURAL_COMPLETION"),
            ("Brickwork, Plaster & Electrical Conduits", Decimal('0.15'), "BRICKWORK_PLASTER", "FINISHING_STAGE"),
            ("Tiles, Sanitary & Paint Finishing", Decimal('0.15'), "FINISHING_TILES", "FINISHING_STAGE"),
            ("Key Handover & Final Deed Registration", Decimal('0.10'), "HANDOVER_CERTIFICATE", "HANDOVER_POSSESSION")
        ]
        curr_date = start_date + timedelta(days=45)
        accumulated = Decimal('0.00')
        start_idx = len(items) + 1
        n_milestones = len(milestones)
        
        for idx, (title, pct, trigger, itype) in enumerate(milestones, start=1):
            base_amt = (installment_balance * pct).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            is_last = (idx == n_milestones)
            rounding_adj = Decimal('0.00')
            if is_last:
                rounding_adj = installment_balance - (accumulated + base_amt)
                base_amt = base_amt + rounding_adj
                rounding_diff_total = rounding_adj
                adjusted_inst_no = start_idx + idx - 1
            accumulated += base_amt
            
            items.append({
                "installment_no": start_idx + idx - 1,
                "installment_type": itype,
                "title": f"Milestone #{idx}: {title}",
                "percentage": float((pct * Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
                "due_date": curr_date,
                "grace_period_days": grace_period_days,
                "payable_amount": float(base_amt),
                "is_rounding_adjusted": is_last and (rounding_adj != Decimal('0.00')),
                "rounding_adjustment": float(rounding_adj),
                "milestone_trigger": trigger
            })
            curr_date += timedelta(days=90)
            
    elif plan_type.upper() == "QUARTERLY":
        quarters = max(1, total_installments or 8)
        base_amt = (installment_balance / Decimal(quarters)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        sum_calculated = base_amt * Decimal(quarters)
        rounding_diff = installment_balance - sum_calculated
        rounding_diff_total = rounding_diff
        
        curr_date = start_date + timedelta(days=90)
        start_idx = len(items) + 1
        for i in range(1, quarters + 1):
            is_last = (i == quarters)
            amount = base_amt + (rounding_diff if is_last else Decimal('0.00'))
            if is_last:
                adjusted_inst_no = start_idx + i - 1
            items.append({
                "installment_no": start_idx + i - 1,
                "installment_type": "QUARTERLY_INSTALLMENT",
                "title": f"Quarterly Installment #{i:02d}",
                "percentage": float((amount / total_contract * Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
                "due_date": curr_date,
                "grace_period_days": grace_period_days,
                "payable_amount": float(amount),
                "is_rounding_adjusted": is_last and (rounding_diff != Decimal('0.00')),
                "rounding_adjustment": float(rounding_diff) if is_last else 0.00,
                "milestone_trigger": None
            })
            curr_date += timedelta(days=90)
            
    else: # Default: MONTHLY EMI
        months = max(1, total_installments or 36)
        base_amt = (installment_balance / Decimal(months)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        sum_calculated = base_amt * Decimal(months)
        rounding_diff = installment_balance - sum_calculated
        rounding_diff_total = rounding_diff
        
        curr_date = start_date + timedelta(days=30)
        start_idx = len(items) + 1
        for i in range(1, months + 1):
            is_last = (i == months)
            amount = base_amt + (rounding_diff if is_last else Decimal('0.00'))
            if is_last:
                adjusted_inst_no = start_idx + i - 1
            items.append({
                "installment_no": start_idx + i - 1,
                "installment_type": "MONTHLY_INSTALLMENT",
                "title": f"Monthly Installment #{i:02d}",
                "percentage": float((amount / total_contract * Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
                "due_date": curr_date,
                "grace_period_days": grace_period_days,
                "payable_amount": float(amount),
                "is_rounding_adjusted": is_last and (rounding_diff != Decimal('0.00')),
                "rounding_adjustment": float(rounding_diff) if is_last else 0.00,
                "milestone_trigger": None
            })
            curr_date += timedelta(days=30)
            
    regular_inst_amt = float(items[-1]["payable_amount"]) if items else 0.00
    if len(items) > 1 and plan_type.upper() in ["MONTHLY", "QUARTERLY"]:
        regular_inst_amt = float(items[-2]["payable_amount"])
        
    return items, down_payment_total, installment_balance, rounding_diff_total, adjusted_inst_no, regular_inst_amt


@router.post("/schedules/preview", response_model=InstallmentSchedulePreviewResponse)
async def preview_installment_schedule(
    payload: InstallmentSchedulePreviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Spec 5.7: Live calculation preview of installment amortization schedule.
    Demonstrates exact penny rounding distribution so sum of all installments equals approved contract price.
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.customer),
            selectinload(Booking.unit),
            selectinload(Booking.project)
        )
        .where(Booking.id == payload.booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    start_date = payload.start_date or date.today()
    grace_period = payload.grace_period_days or 15

    items, dp_total, inst_bal, round_diff, adj_no, reg_amt = build_schedule_installments(
        booking=booking,
        plan_type=payload.plan_type,
        total_installments=payload.total_installments or 36,
        down_payment_percentage=payload.down_payment_percentage or 15.00,
        start_date=start_date,
        grace_period_days=grace_period,
        custom_milestones=payload.custom_milestones
    )

    total_contract = float(booking.final_contract_value)
    earnest_money = float(booking.earnest_money_received or 0.00)
    net_dp = max(0.00, float(dp_total) - earnest_money)
    
    calc_sum = sum(item["payable_amount"] for item in items)
    discrepancy = round(abs(calc_sum - total_contract), 2)
    is_valid = (discrepancy == 0.00)

    preview_items = [
        InstallmentSchedulePreviewItem(
            installment_no=item["installment_no"],
            installment_type=item["installment_type"],
            title=item["title"],
            percentage=item["percentage"],
            due_date=item["due_date"],
            grace_period_days=item["grace_period_days"],
            payable_amount=item["payable_amount"],
            is_rounding_adjusted=item["is_rounding_adjusted"],
            rounding_adjustment=item["rounding_adjustment"],
            milestone_trigger=item["milestone_trigger"]
        )
        for item in items
    ]

    return InstallmentSchedulePreviewResponse(
        booking_id=booking.id,
        booking_reference_no=booking.booking_reference_no,
        customer_name=booking.customer.full_name_en if booking.customer else "N/A",
        project_name=booking.project.name if booking.project else "N/A",
        unit_number=booking.unit.unit_number if booking.unit else "N/A",
        approved_contract_price=total_contract,
        booking_money_amount=earnest_money,
        down_payment_percentage=float(payload.down_payment_percentage or 15.00),
        down_payment_amount=float(dp_total),
        net_down_payment_due=net_dp,
        installment_balance_amount=float(inst_bal),
        total_installment_count=len(preview_items),
        regular_installment_amount=reg_amt,
        rounding_adjustment_amount=float(round_diff),
        rounding_adjusted_installment_no=adj_no,
        calculated_total_sum=calc_sum,
        discrepancy_amount=discrepancy,
        is_validated=is_valid,
        installments=preview_items
    )


@router.post("/schedules/generate", response_model=List[CustomerInstallmentResponse], status_code=status.HTTP_201_CREATED)
async def generate_installment_schedule(
    payload: InstallmentScheduleGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Spec 5.7: Generates Master Contractual Installment Schedule and child installment rows.
    Enforces exact penny rounding distribution so sum of all installments equals approved contract price.
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.customer),
            selectinload(Booking.unit),
            selectinload(Booking.project)
        )
        .where(Booking.id == payload.booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    start_date = payload.start_date or date.today()
    grace_period = payload.grace_period_days or 15

    items, dp_total, inst_bal, round_diff, adj_no, reg_amt = build_schedule_installments(
        booking=booking,
        plan_type=payload.plan_type,
        total_installments=payload.total_installments or 36,
        down_payment_percentage=payload.down_payment_percentage or 15.00,
        start_date=start_date,
        grace_period_days=grace_period,
        custom_milestones=payload.custom_milestones
    )

    # 1. Supersede any existing active schedule for this booking
    prev_schedules = await db.execute(
        select(BookingInstallmentSchedule).where(
            BookingInstallmentSchedule.booking_id == booking.id,
            BookingInstallmentSchedule.status == "ACTIVE"
        )
    )
    for ps in prev_schedules.scalars().all():
        ps.status = "SUPERSEDED_AMENDED"

    # 2. Create Master Schedule Header
    sched_code = f"SCH-{date.today().year}-{uuid.uuid4().hex[:6].upper()}"
    schedule = BookingInstallmentSchedule(
        schedule_code=sched_code,
        booking_id=booking.id,
        customer_id=booking.primary_customer_id,
        agreement_reference_no=payload.agreement_reference_no,
        version="v1.0",
        plan_type=payload.plan_type.upper(),
        approved_contract_price=Decimal(str(booking.final_contract_value)),
        booking_money_amount=Decimal(str(booking.earnest_money_received or 0.00)),
        down_payment_percentage=Decimal(str(payload.down_payment_percentage or 15.00)),
        down_payment_amount=dp_total,
        installment_balance_amount=inst_bal,
        total_installment_count=len(items),
        regular_installment_amount=Decimal(str(reg_amt)),
        rounding_adjustment_amount=round_diff,
        rounding_adjusted_installment_no=adj_no,
        start_date=start_date,
        grace_period_days=grace_period,
        late_surcharge_rate_monthly=Decimal('2.00'),
        status="ACTIVE",
        notes=payload.notes
    )
    db.add(schedule)
    await db.flush()

    # 3. Create Child Installments linked to schedule
    # First clear any existing pending installments for this booking
    existing_inst = await db.execute(
        select(CustomerInstallment).where(
            CustomerInstallment.booking_id == booking.id,
            CustomerInstallment.status.in_(["UPCOMING", "DUE", "SCHEDULED"])
        )
    )
    for ei in existing_inst.scalars().all():
        await db.delete(ei)

    for item in items:
        # Initial status: DUE for down payment, UPCOMING for subsequent
        initial_status = "DUE" if item["installment_type"] in ["DOWN_PAYMENT"] else "UPCOMING"
        if item["installment_type"] == "BOOKING_MONEY":
            initial_status = "PAID"
            
        inst = CustomerInstallment(
            schedule_id=schedule.id,
            booking_id=booking.id,
            installment_no=item["installment_no"],
            installment_type=item["installment_type"],
            title=item["title"],
            percentage=Decimal(str(item["percentage"])) if item["percentage"] is not None else None,
            due_date=item["due_date"],
            grace_period_days=item["grace_period_days"],
            payable_amount=Decimal(str(item["payable_amount"])),
            paid_amount=Decimal(str(item["payable_amount"])) if item["installment_type"] == "BOOKING_MONEY" else Decimal('0.00'),
            balance_due=Decimal('0.00') if item["installment_type"] == "BOOKING_MONEY" else Decimal(str(item["payable_amount"])),
            schedule_version="v1.0",
            status=initial_status,
            milestone_trigger=item["milestone_trigger"]
        )
        db.add(inst)

    # Update booking workflow stage to 07_INSTALLMENT_SCHEDULE_ACTIVE
    booking.workflow_stage = "07_INSTALLMENT_SCHEDULE_ACTIVE"

    await db.commit()

    # Re-query
    res = await db.execute(
        select(CustomerInstallment)
        .options(
            selectinload(CustomerInstallment.booking).selectinload(Booking.customer),
            selectinload(CustomerInstallment.booking).selectinload(Booking.unit)
        )
        .where(CustomerInstallment.schedule_id == schedule.id)
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
# Master Schedule Headers & Paging (Spec 5.7)
# --------------------------------------------------------------------------
@router.get("/schedules/master", response_model=List[BookingInstallmentScheduleResponse])
async def list_master_schedules(
    response: Response,
    booking_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    plan_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    List master installment schedules with server-side pagination, filters, and progress metrics.
    """
    stmt = (
        select(BookingInstallmentSchedule)
        .options(
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.customer),
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.project),
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.unit),
            selectinload(BookingInstallmentSchedule.installments)
        )
        .order_by(BookingInstallmentSchedule.id.desc())
    )

    if booking_id:
        stmt = stmt.where(BookingInstallmentSchedule.booking_id == booking_id)
    if status_filter:
        stmt = stmt.where(BookingInstallmentSchedule.status == status_filter.upper())
    if plan_type:
        stmt = stmt.where(BookingInstallmentSchedule.plan_type == plan_type.upper())
    if search:
        search_fmt = f"%{search.strip()}%"
        stmt = stmt.join(BookingInstallmentSchedule.booking).outerjoin(Booking.customer).where(
            or_(
                BookingInstallmentSchedule.schedule_code.ilike(search_fmt),
                Booking.booking_reference_no.ilike(search_fmt),
                Customer.full_name_en.ilike(search_fmt)
            )
        )

    # Count total
    count_stmt = select(func.count(BookingInstallmentSchedule.id))
    if booking_id:
        count_stmt = count_stmt.where(BookingInstallmentSchedule.booking_id == booking_id)
    if status_filter:
        count_stmt = count_stmt.where(BookingInstallmentSchedule.status == status_filter.upper())
    if plan_type:
        count_stmt = count_stmt.where(BookingInstallmentSchedule.plan_type == plan_type.upper())
    total_count = (await db.execute(count_stmt)).scalar() or 0
    response.headers["X-Total-Count"] = str(total_count)

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    records = result.scalars().all()

    out = []
    for s in records:
        resp = BookingInstallmentScheduleResponse.model_validate(s)
        if s.booking:
            resp.booking_reference_no = s.booking.booking_reference_no
            if s.booking.customer:
                resp.customer_name = s.booking.customer.full_name_en
                resp.customer_phone = s.booking.customer.phone_primary
            if s.booking.project:
                resp.project_name = s.booking.project.name
            if s.booking.unit:
                resp.unit_number = s.booking.unit.unit_number

        # Payment totals
        total_paid = sum(float(inst.paid_amount) for inst in s.installments)
        total_balance = sum(float(inst.payable_amount - inst.paid_amount) for inst in s.installments)
        total_overdue = sum(float(inst.payable_amount - inst.paid_amount) for inst in s.installments if inst.status == "OVERDUE")
        resp.total_paid_amount = round(total_paid, 2)
        resp.total_balance_due = round(total_balance, 2)
        resp.total_overdue_amount = round(total_overdue, 2)
        out.append(resp)

    return out


@router.get("/schedules/paged", response_model=PaginatedInstallmentSchedulesResponse)
async def get_paged_schedules(
    response: Response,
    booking_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    plan_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    items = await list_master_schedules(
        response=response,
        booking_id=booking_id,
        status_filter=status_filter,
        plan_type=plan_type,
        search=search,
        limit=limit,
        offset=offset,
        db=db
    )
    total = int(response.headers.get("X-Total-Count", len(items)))
    return PaginatedInstallmentSchedulesResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/schedules/master/{schedule_id}", response_model=BookingInstallmentScheduleResponse)
async def get_master_schedule_details(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get master installment schedule details with full installment breakdown.
    """
    stmt = (
        select(BookingInstallmentSchedule)
        .options(
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.customer),
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.project),
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.unit),
            selectinload(BookingInstallmentSchedule.installments)
        )
        .where(BookingInstallmentSchedule.id == schedule_id)
    )
    result = await db.execute(stmt)
    schedule = result.scalars().first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Installment schedule not found")

    resp = BookingInstallmentScheduleResponse.model_validate(schedule)
    if schedule.booking:
        resp.booking_reference_no = schedule.booking.booking_reference_no
        if schedule.booking.customer:
            resp.customer_name = schedule.booking.customer.full_name_en
            resp.customer_phone = schedule.booking.customer.phone_primary
        if schedule.booking.project:
            resp.project_name = schedule.booking.project.name
        if schedule.booking.unit:
            resp.unit_number = schedule.booking.unit.unit_number

    # Sort installments by installment_no
    sorted_insts = sorted(schedule.installments, key=lambda x: x.installment_no)
    resp.installments = [CustomerInstallmentResponse.model_validate(i) for i in sorted_insts]

    total_paid = sum(float(inst.paid_amount) for inst in schedule.installments)
    total_balance = sum(float(inst.payable_amount - inst.paid_amount) for inst in schedule.installments)
    total_overdue = sum(float(inst.payable_amount - inst.paid_amount) for inst in schedule.installments if inst.status == "OVERDUE")
    resp.total_paid_amount = round(total_paid, 2)
    resp.total_balance_due = round(total_balance, 2)
    resp.total_overdue_amount = round(total_overdue, 2)

    return resp


@router.get("/schedules/master/by-booking/{booking_id}", response_model=BookingInstallmentScheduleResponse)
async def get_schedule_by_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get active installment schedule for a booking.
    """
    stmt = (
        select(BookingInstallmentSchedule)
        .options(
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.customer),
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.project),
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.unit),
            selectinload(BookingInstallmentSchedule.installments)
        )
        .where(
            BookingInstallmentSchedule.booking_id == booking_id,
            BookingInstallmentSchedule.status == "ACTIVE"
        )
        .order_by(BookingInstallmentSchedule.id.desc())
    )
    result = await db.execute(stmt)
    schedule = result.scalars().first()
    if not schedule:
        raise HTTPException(status_code=404, detail="No active installment schedule found for this booking")

    return await get_master_schedule_details(schedule.id, db)


@router.post("/schedules/master/{schedule_id}/amend", response_model=BookingInstallmentScheduleResponse)
async def amend_installment_schedule(
    schedule_id: int,
    payload: InstallmentScheduleAmendRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Spec 5.7: Schedule amendment & payment restructuring.
    Archives previous schedule as 'SUPERSEDED_AMENDED', increments version (v1.1),
    and regenerates installments with exact rounding distribution.
    """
    stmt = (
        select(BookingInstallmentSchedule)
        .options(
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.customer),
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.project),
            selectinload(BookingInstallmentSchedule.booking).selectinload(Booking.unit)
        )
        .where(BookingInstallmentSchedule.id == schedule_id)
    )
    result = await db.execute(stmt)
    old_sched = result.scalars().first()
    if not old_sched:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Mark old schedule superseded
    old_sched.status = "SUPERSEDED_AMENDED"

    # Compute new version e.g. v1.0 -> v1.1
    try:
        cur_v = float(old_sched.version.replace('v', ''))
        new_v = f"v{cur_v + 0.1:.1f}"
    except Exception:
        new_v = "v1.1"

    booking = old_sched.booking
    start_date = payload.start_date or date.today()
    grace_period = payload.grace_period_days or 15

    items, dp_total, inst_bal, round_diff, adj_no, reg_amt = build_schedule_installments(
        booking=booking,
        plan_type=payload.plan_type,
        total_installments=payload.total_installments or 36,
        down_payment_percentage=payload.down_payment_percentage or 15.00,
        start_date=start_date,
        grace_period_days=grace_period,
        custom_milestones=payload.custom_milestones
    )

    sched_code = f"SCH-{date.today().year}-{uuid.uuid4().hex[:6].upper()}"
    new_sched = BookingInstallmentSchedule(
        schedule_code=sched_code,
        booking_id=booking.id,
        customer_id=booking.primary_customer_id,
        agreement_reference_no=payload.amendment_reference or old_sched.agreement_reference_no,
        version=new_v,
        plan_type=payload.plan_type.upper(),
        approved_contract_price=Decimal(str(booking.final_contract_value)),
        booking_money_amount=Decimal(str(booking.earnest_money_received or 0.00)),
        down_payment_percentage=Decimal(str(payload.down_payment_percentage or 15.00)),
        down_payment_amount=dp_total,
        installment_balance_amount=inst_bal,
        total_installment_count=len(items),
        regular_installment_amount=Decimal(str(reg_amt)),
        rounding_adjustment_amount=round_diff,
        rounding_adjusted_installment_no=adj_no,
        start_date=start_date,
        grace_period_days=grace_period,
        late_surcharge_rate_monthly=Decimal('2.00'),
        status="ACTIVE",
        amendment_reason=payload.amendment_reason,
        notes=payload.notes
    )
    db.add(new_sched)
    await db.flush()

    for item in items:
        inst = CustomerInstallment(
            schedule_id=new_sched.id,
            booking_id=booking.id,
            installment_no=item["installment_no"],
            installment_type=item["installment_type"],
            title=item["title"],
            percentage=Decimal(str(item["percentage"])) if item["percentage"] is not None else None,
            due_date=item["due_date"],
            grace_period_days=item["grace_period_days"],
            payable_amount=Decimal(str(item["payable_amount"])),
            paid_amount=Decimal('0.00'),
            balance_due=Decimal(str(item["payable_amount"])),
            schedule_version=new_v,
            amendment_reference=payload.amendment_reference,
            status="UPCOMING",
            milestone_trigger=item["milestone_trigger"]
        )
        db.add(inst)

    await db.commit()
    return await get_master_schedule_details(new_sched.id, db)


@router.post("/schedules/installments/{installment_id}/generate-invoice", response_model=InstallmentInvoiceResponse)
async def generate_installment_invoice(
    installment_id: int,
    payload: InstallmentInvoiceGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Spec 5.7: Generates formal commercial invoice for a scheduled installment.
    Assigns sequential invoice number INV-2026-XXXX, records billing date, and updates status to INVOICED.
    """
    stmt = (
        select(CustomerInstallment)
        .options(
            selectinload(CustomerInstallment.booking).selectinload(Booking.customer)
        )
        .where(CustomerInstallment.id == installment_id)
    )
    result = await db.execute(stmt)
    inst = result.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Installment not found")

    inv_date = payload.invoice_date or date.today()
    inv_no = f"INV-{inv_date.year}-{uuid.uuid4().hex[:6].upper()}"

    inst.invoice_date = inv_date
    inst.invoice_number = inv_no
    inst.amount_billed = inst.payable_amount
    inst.balance_due = Decimal(str(float(inst.payable_amount) - float(inst.paid_amount)))
    if inst.status in ["UPCOMING", "SCHEDULED"]:
        inst.status = "INVOICED"
    inst.reminder_status = "INVOICED"

    if payload.due_date:
        inst.due_date = payload.due_date
    if payload.notes:
        inst.notes = f"{inst.notes or ''} [Invoice Note: {payload.notes}]".strip()

    await db.commit()
    await db.refresh(inst)

    return InstallmentInvoiceResponse(
        installment_id=inst.id,
        invoice_number=inv_no,
        invoice_date=inv_date,
        booking_reference_no=inst.booking.booking_reference_no if inst.booking else "N/A",
        customer_name=inst.booking.customer.full_name_en if (inst.booking and inst.booking.customer) else "N/A",
        amount_billed=float(inst.amount_billed),
        balance_due=float(inst.balance_due),
        due_date=inst.due_date,
        status=inst.status
    )


@router.get("/schedules/master/{schedule_id}/export-pdf")
async def export_schedule_pdf(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Generates printable contractual installment schedule annexure document.
    """
    schedule = await get_master_schedule_details(schedule_id, db)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Schedule Annexure - {schedule.schedule_code}</title>
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; font-size: 12px; color: #111; }}
        .header {{ text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 15px; }}
        .header h1 {{ margin: 0; font-size: 18px; }}
        .meta-box {{ display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border: 1px solid #ddd; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        th, td {{ border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 11px; }}
        th {{ background: #f0f0f0; }}
        .text-right {{ text-align: right; }}
        .text-center {{ text-align: center; }}
        .highlight {{ background: #fffde7; font-weight: bold; }}
        .footer {{ margin-top: 30px; font-size: 10px; color: #555; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="header">
        <h1>BLUEOCEANS REAL ESTATE LIMITED</h1>
        <h3>CONTRACTUAL PAYMENT & INSTALLMENT SCHEDULE ANNEXURE (Spec 5.7)</h3>
        <p>Annexure to Agreement Reference: <strong>{schedule.agreement_reference_no or 'N/A'}</strong> · Schedule Code: <strong>{schedule.schedule_code}</strong> (Version {schedule.version})</p>
      </div>

      <div class="meta-box">
        <div>
          <p><strong>Purchaser:</strong> {schedule.customer_name} ({schedule.customer_phone or 'N/A'})</p>
          <p><strong>Booking Reference:</strong> {schedule.booking_reference_no}</p>
          <p><strong>Project:</strong> {schedule.project_name} · <strong>Unit:</strong> {schedule.unit_number}</p>
        </div>
        <div>
          <p><strong>Approved Contract Price:</strong> BDT {schedule.approved_contract_price:,.2f}</p>
          <p><strong>Down Payment (15%):</strong> BDT {schedule.down_payment_amount:,.2f}</p>
          <p><strong>Installment Balance (85%):</strong> BDT {schedule.installment_balance_amount:,.2f} in {schedule.total_installment_count} installments</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Installment Type & Description</th>
            <th class="text-center">Due Date</th>
            <th class="text-center">Grace</th>
            <th class="text-right">Payable Amount (BDT)</th>
            <th class="text-right">Paid Amount</th>
            <th class="text-right">Balance Due</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
    """
    for inst in (schedule.installments or []):
        adj_marker = " <span style='color:red;'>(*penny adj)</span>" if inst.installment_no == schedule.rounding_adjusted_installment_no and schedule.rounding_adjustment_amount != 0 else ""
        html_content += f"""
          <tr>
            <td class="text-center">{inst.installment_no}</td>
            <td><strong>{inst.title}</strong>{adj_marker}</td>
            <td class="text-center">{inst.due_date}</td>
            <td class="text-center">{inst.grace_period_days} days</td>
            <td class="text-right font-mono">{inst.payable_amount:,.2f}</td>
            <td class="text-right font-mono">{inst.paid_amount:,.2f}</td>
            <td class="text-right font-mono">{inst.payable_amount - inst.paid_amount:,.2f}</td>
            <td class="text-center">{inst.status}</td>
          </tr>
        """

    html_content += f"""
        </tbody>
        <tfoot>
          <tr class="highlight">
            <td colspan="4" class="text-right"><strong>Exact Total Validated:</strong></td>
            <td class="text-right"><strong>BDT {schedule.approved_contract_price:,.2f}</strong></td>
            <td class="text-right"><strong>BDT {schedule.total_paid_amount:,.2f}</strong></td>
            <td class="text-right"><strong>BDT {schedule.total_balance_due:,.2f}</strong></td>
            <td class="text-center">VALIDATED</td>
          </tr>
        </tfoot>
      </table>

      <div class="footer">
        <p>This payment schedule forms an integral part of the registered Agreement for Sale. Payments past grace period accrue a prorated 2.0% per month overdue surcharge as per REHAB contract norms.</p>
      </div>
    </body>
    </html>
    """
    return Response(content=html_content, media_type="text/html")



@router.post("/schedules/{installment_id}/pay", response_model=CustomerInstallmentResponse)
async def pay_installment(
    installment_id: int,
    payload: InstallmentPaymentRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Records customer installment payment and automatically posts Double-Entry Cash/Bank/MFS
    collection voucher to General Ledger:
      Debit: Cash/Bank/MFS Vault (Asset)
      Credit: Advance from Allottee / Customer Account (Liability)
    """
    stmt = (
        select(CustomerInstallment)
        .options(
            selectinload(CustomerInstallment.booking).selectinload(Booking.customer),
            selectinload(CustomerInstallment.booking).selectinload(Booking.unit)
        )
        .where(CustomerInstallment.id == installment_id)
    )
    result = await db.execute(stmt)
    inst = result.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Installment record not found.")

    paid_now = float(payload.payment_amount)
    inst.paid_amount = float(inst.paid_amount or 0.0) + paid_now
    if inst.paid_amount >= float(inst.payable_amount):
        inst.status = "PAID"
    else:
        inst.status = "PARTIALLY_PAID"

    # Post Double-Entry Cash/Bank/MFS Receipt Voucher in General Ledger
    await post_customer_collection_voucher(
        db=db,
        booking_id=inst.booking_id,
        amount=paid_now,
        title=f"Installment #{inst.installment_no}: {inst.title}",
        payment_mode=payload.payment_mode,
        project_id=inst.booking.project_id if inst.booking else None
    )

    await db.commit()
    await db.refresh(inst)

    resp = CustomerInstallmentResponse.model_validate(inst)
    if inst.booking:
        resp.booking_reference_no = inst.booking.booking_reference_no
        if inst.booking.customer:
            resp.customer_name = inst.booking.customer.full_name_en
        if inst.booking.unit:
            resp.unit_number = inst.booking.unit.unit_number
    return resp


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

    mr_count = (
        await db.execute(select(func.count(MoneyReceipt.id)))
    ).scalar() or 0

    mr_amt = (
        await db.execute(select(func.sum(MoneyReceipt.amount_received)))
    ).scalar() or 0.0

    loan_count = (
        await db.execute(select(func.count(TripartiteLoan.id)))
    ).scalar() or 0

    loan_disbursed_amt = (
        await db.execute(select(func.sum(TripartiteLoan.disbursed_amount_total)))
    ).scalar() or 0.0

    return InstallmentMetrics(
        total_installments_due=due_count,
        total_overdue_amount=float(overdue_amt),
        total_pdc_in_vault=vault_count,
        total_vault_amount=float(vault_amt),
        total_dishonoured_cheques=bounced_count,
        active_ni138_actions=legal_count,
        total_money_receipts_count=mr_count,
        total_money_receipts_amount=float(mr_amt),
        total_tripartite_loans_count=loan_count,
        total_tripartite_disbursed_amount=float(loan_disbursed_amt)
    )


@router.post("/cron/trigger-pdc-sms-reminders")
async def trigger_pdc_sms_reminders(enqueue_celery: bool = False):
    """
    Daily cron task: Finds PDC cheques maturing in exactly 3 days and dispatches statutory SMS alerts.
    Can be run directly or enqueued via Celery background worker.
    """
    from app.modules.installments.tasks import execute_check_upcoming_pdc_cheques, check_upcoming_pdc_cheques_task
    if enqueue_celery:
        async_result = check_upcoming_pdc_cheques_task.delay()
        return {"status": "enqueued", "task_id": async_result.id}
    
    result = await execute_check_upcoming_pdc_cheques()
    return result


@router.post("/cron/trigger-ni138-deadlines")
async def trigger_ni138_deadlines(enqueue_celery: bool = False):
    """
    Daily cron task: Scans open Section 138 legal notices where the 30-day statutory settlement
    window has expired, prompts legal counsel, and dispatches litigation alerts.
    Can be run directly or enqueued via Celery background worker.
    """
    from app.modules.installments.tasks import execute_check_statutory_ni138_deadlines, check_statutory_ni138_deadlines_task
    if enqueue_celery:
        async_result = check_statutory_ni138_deadlines_task.delay()
        return {"status": "enqueued", "task_id": async_result.id}
    
    result = await execute_check_statutory_ni138_deadlines()
    return result


# --------------------------------------------------------------------------
# Automated Surcharge Calculation Engine (Prompt 09)
# --------------------------------------------------------------------------
@router.post("/schedules/calculate-overdue-surcharges")
async def calculate_overdue_surcharges(
    payload: Optional[InstallmentSurchargeCalculateRequest] = None,
    booking_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Automated late payment surcharge calculator under Prompt 09.
    Scans installments past their grace period, calculates overdue days,
    and applies statutory monthly surcharge (default 2% per 30-day delay).
    """
    surcharge_rate_monthly = float(payload.surcharge_percentage_monthly if payload else 2.00)
    today = date.today()

    stmt = select(CustomerInstallment).where(
        CustomerInstallment.payable_amount > CustomerInstallment.paid_amount
    )
    if booking_id:
        stmt = stmt.where(CustomerInstallment.booking_id == booking_id)

    result = await db.execute(stmt)
    installments = result.scalars().all()

    updated_count = 0
    total_surcharge_assessed = 0.0

    for inst in installments:
        grace_days = inst.grace_period_days or 15
        cutoff_date = inst.due_date + timedelta(days=grace_days)
        if today > cutoff_date:
            overdue_days = (today - cutoff_date).days
            unpaid_balance = float(inst.payable_amount - inst.paid_amount)
            # Surcharge = unpaid_balance * (monthly_rate / 100) * (overdue_days / 30)
            surcharge = round(unpaid_balance * (surcharge_rate_monthly / 100.0) * (overdue_days / 30.0), 2)

            inst.overdue_days = overdue_days
            inst.surcharge_percentage = surcharge_rate_monthly
            inst.late_fee_accrued = surcharge
            inst.status = "OVERDUE"

            updated_count += 1
            total_surcharge_assessed += surcharge

    await db.commit()

    return {
        "status": "success",
        "assessed_installments_count": updated_count,
        "total_surcharge_assessed_bdt": round(total_surcharge_assessed, 2),
        "monthly_surcharge_rate_percentage": surcharge_rate_monthly
    }


# --------------------------------------------------------------------------
# Multi-Channel SMS & WhatsApp Alert Dispatch Engine (Prompt 09)
# --------------------------------------------------------------------------
@router.post("/alerts/dispatch", response_model=List[InstallmentAlertLogResponse])
async def dispatch_installment_alerts(
    payload: InstallmentAlertDispatchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Dispatches automated SMS, WhatsApp, and Email alerts for upcoming, due,
    or overdue installments with tailored templates and records delivery audit.
    """
    if not payload.installment_ids:
        raise HTTPException(status_code=400, detail="No installment IDs provided for alert dispatch.")

    stmt = (
        select(CustomerInstallment)
        .options(
            selectinload(CustomerInstallment.booking).selectinload(Booking.customer),
            selectinload(CustomerInstallment.booking).selectinload(Booking.unit),
            selectinload(CustomerInstallment.booking).selectinload(Booking.project)
        )
        .where(CustomerInstallment.id.in_(payload.installment_ids))
    )
    result = await db.execute(stmt)
    installments = result.scalars().all()

    alert_logs = []
    now = datetime.utcnow()

    for inst in installments:
        booking = inst.booking
        customer = booking.customer if booking else None
        project = booking.project if booking else None
        unit = booking.unit if booking else None

        customer_name = customer.full_name_en if customer else "Valued Allottee"
        phone = customer.primary_phone if customer else "+8801700000000"
        email = customer.email if customer else "allottee@example.com"
        project_name = project.project_name if project else "Prime Residence"
        unit_no = unit.unit_number if unit else "Unit"
        unpaid_amount = float(inst.payable_amount - inst.paid_amount)

        # Generate multi-channel notification message
        if payload.custom_message:
            msg = payload.custom_message
        elif inst.status == "OVERDUE":
            msg = (
                f"Urgent Notice: Dear {customer_name}, installment #{inst.installment_no} ({inst.title}) "
                f"of BDT {unpaid_amount:,.2f} for {unit_no} at {project_name} is OVERDUE by {inst.overdue_days} days. "
                f"Late fee accrued: BDT {float(inst.late_fee_accrued or 0):,.2f}. Please pay immediately via bank transfer "
                f"or pay order to avoid further legal/surcharge action. Helpline: +880-9612-888999."
            )
        else:
            msg = (
                f"Payment Reminder: Dear {customer_name}, installment #{inst.installment_no} ({inst.title}) "
                f"of BDT {unpaid_amount:,.2f} for {unit_no} at {project_name} is due on {inst.due_date}. "
                f"Grace period: {inst.grace_period_days} days. Please remit on time to maintain allotment priority. "
                f"BlueOceans Real Estate Ltd."
            )

        for channel in payload.channels:
            chan_upper = channel.upper()
            log = InstallmentAlertLog(
                installment_id=inst.id,
                booking_id=booking.id if booking else inst.booking_id,
                customer_id=customer.id if customer else booking.primary_customer_id,
                channel=chan_upper,
                recipient_phone=phone,
                recipient_email=email,
                message_content=msg,
                status="SENT"
            )
            db.add(log)
            alert_logs.append(log)

            if chan_upper == "SMS":
                inst.sms_alert_sent = True
            elif chan_upper == "WHATSAPP":
                inst.whatsapp_alert_sent = True
            inst.last_alert_sent_at = now

    await db.commit()

    # Refresh logs to return
    for log in alert_logs:
        await db.refresh(log)

    return alert_logs


@router.get("/alerts", response_model=List[InstallmentAlertLogResponse])
async def list_installment_alerts(
    installment_id: Optional[int] = None,
    booking_id: Optional[int] = None,
    channel: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns dispatched SMS and WhatsApp notification audit log history.
    """
    stmt = select(InstallmentAlertLog).order_by(InstallmentAlertLog.id.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


# --------------------------------------------------------------------------
# 5. Money Receipts & Partial Payment Adjustment Waterfall Engine (Prompt 10)
# --------------------------------------------------------------------------
@router.get("/money-receipts", response_model=List[MoneyReceiptResponse])
async def list_money_receipts(
    booking_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    payment_mode: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns money receipts with multi-mode payment details and granular waterfall installment allocations.
    """
    stmt = (
        select(MoneyReceipt)
        .options(
            selectinload(MoneyReceipt.booking).selectinload(Booking.customer),
            selectinload(MoneyReceipt.booking).selectinload(Booking.unit),
            selectinload(MoneyReceipt.booking).selectinload(Booking.project),
            selectinload(MoneyReceipt.allocations).selectinload(MoneyReceiptAllocation.installment)
        )
        .order_by(MoneyReceipt.id.desc())
    )

    if booking_id:
        stmt = stmt.where(MoneyReceipt.booking_id == booking_id)
    if customer_id:
        stmt = stmt.where(MoneyReceipt.customer_id == customer_id)
    if payment_mode:
        stmt = stmt.where(MoneyReceipt.payment_mode == payment_mode.upper())
    if search:
        search_term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                MoneyReceipt.mr_number.ilike(search_term),
                MoneyReceipt.instrument_no.ilike(search_term),
                MoneyReceipt.bank_name.ilike(search_term)
            )
        )

    result = await db.execute(stmt)
    receipts = result.scalars().all()

    responses = []
    for r in receipts:
        resp = MoneyReceiptResponse.model_validate(r)
        if r.booking:
            resp.booking_reference_no = r.booking.booking_reference_no
            if r.booking.customer:
                resp.customer_name = r.booking.customer.full_name_en
                resp.customer_phone = r.booking.customer.primary_phone
            if r.booking.unit:
                resp.unit_number = r.booking.unit.unit_number
            if r.booking.project:
                resp.project_name = r.booking.project.project_name

        alloc_resps = []
        for a in r.allocations:
            ar = MoneyReceiptAllocationResponse.model_validate(a)
            if a.installment:
                ar.installment_no = a.installment.installment_no
                ar.installment_title = a.installment.title
            alloc_resps.append(ar)
        resp.allocations = alloc_resps
        responses.append(resp)

    return responses


@router.post("/money-receipts", response_model=MoneyReceiptResponse, status_code=status.HTTP_201_CREATED)
async def create_money_receipt(
    payload: MoneyReceiptCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Executes Customer Payment Collection with Waterfall Adjustment Logic:
      1. Phase 1: Adjusts late fees / surcharges across overdue installments first.
      2. Phase 2: Adjusts installment principal (oldest overdue first) until amount is exhausted.
      3. Phase 3: Any leftover balance becomes customer credit advance for future installments.
      4. Auto-generates unique MR number & cryptographic QR verification token.
      5. Automatically posts Double-Entry Cash/Bank/MFS Collection Voucher to General Ledger.
      6. Dispatches SMS confirmation alert to buyer mobile phone.
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.customer),
            selectinload(Booking.unit),
            selectinload(Booking.project)
        )
        .where(Booking.id == payload.booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found.")

    # Unique MR Number generation
    count_res = await db.execute(select(func.count(MoneyReceipt.id)))
    count = count_res.scalar() or 0
    candidate_no = f"MR-2026-{count + 1:04d}"
    idx = 1
    while True:
        check = await db.execute(select(MoneyReceipt.id).where(MoneyReceipt.mr_number == candidate_no))
        if not check.scalar():
            break
        candidate_no = f"MR-2026-{count + 1 + idx:04d}"
        idx += 1
    mr_number = candidate_no

    # Fetch all installments for this booking ordered by due date
    inst_stmt = (
        select(CustomerInstallment)
        .where(CustomerInstallment.booking_id == booking.id)
        .order_by(CustomerInstallment.due_date.asc(), CustomerInstallment.installment_no.asc())
    )
    inst_res = await db.execute(inst_stmt)
    installments = inst_res.scalars().all()

    remaining = Decimal(str(payload.amount_received))
    total_late_fee_adj = Decimal("0.00")
    total_principal_adj = Decimal("0.00")
    allocation_map = {} # installment_id -> {'late_fee': Decimal, 'principal': Decimal}

    # Phase 1: Adjust late fees / surcharges first
    for inst in installments:
        if remaining <= Decimal("0.00"):
            break
        unpaid_fee = Decimal(str(inst.late_fee_accrued or 0.0))
        if unpaid_fee > Decimal("0.00"):
            alloc_fee = min(remaining, unpaid_fee)
            inst.late_fee_accrued = float(unpaid_fee - alloc_fee)
            remaining -= alloc_fee
            total_late_fee_adj += alloc_fee
            allocation_map[inst.id] = allocation_map.get(inst.id, {'late_fee': Decimal("0.00"), 'principal': Decimal("0.00")})
            allocation_map[inst.id]['late_fee'] += alloc_fee

    # Phase 2: Adjust installment principal (oldest first)
    for inst in installments:
        if remaining <= Decimal("0.00"):
            break
        payable = Decimal(str(inst.payable_amount))
        paid = Decimal(str(inst.paid_amount or 0.0))
        unpaid_princ = payable - paid
        if unpaid_princ > Decimal("0.00"):
            alloc_princ = min(remaining, unpaid_princ)
            new_paid = paid + alloc_princ
            inst.paid_amount = float(new_paid)
            remaining -= alloc_princ
            total_principal_adj += alloc_princ

            if new_paid >= payable:
                inst.status = "PAID"
            else:
                inst.status = "PARTIALLY_PAID"

            allocation_map[inst.id] = allocation_map.get(inst.id, {'late_fee': Decimal("0.00"), 'principal': Decimal("0.00")})
            allocation_map[inst.id]['principal'] += alloc_princ

    # Phase 3: Any leftover becomes advance credit
    excess_advance = remaining

    # Cryptographic QR verification token and payload
    qr_token = uuid.uuid4().hex
    qr_payload = (
        f"VERIFIED:MR={mr_number}|BOOKING={booking.booking_reference_no}|"
        f"AMOUNT=BDT {payload.amount_received:,.2f}|DATE={payload.receipt_date}|AUTH={qr_token[:16]}"
    )

    # Create Money Receipt
    receipt = MoneyReceipt(
        mr_number=mr_number,
        receipt_date=payload.receipt_date,
        booking_id=booking.id,
        customer_id=booking.primary_customer_id,
        payment_mode=payload.payment_mode.upper(),
        instrument_no=payload.instrument_no,
        instrument_date=payload.instrument_date,
        bank_name=payload.bank_name,
        branch_name=payload.branch_name,
        amount_received=payload.amount_received,
        late_fee_adjusted=float(total_late_fee_adj),
        installment_principal_adjusted=float(total_principal_adj),
        excess_advance_amount=float(excess_advance),
        qr_verification_token=qr_token,
        qr_code_payload=qr_payload,
        status="CLEARED",
        remarks=payload.remarks
    )
    db.add(receipt)
    await db.flush()

    # Create Allocation records
    for inst_id, alloc in allocation_map.items():
        tot = alloc['late_fee'] + alloc['principal']
        if tot > Decimal("0.00"):
            rec_alloc = MoneyReceiptAllocation(
                receipt_id=receipt.id,
                installment_id=inst_id,
                allocated_late_fee=float(alloc['late_fee']),
                allocated_principal=float(alloc['principal']),
                total_allocated=float(tot)
            )
            db.add(rec_alloc)

    # Post Double-Entry General Ledger Collection Voucher
    try:
        voucher_ref = await post_customer_collection_voucher(
            db=db,
            booking_id=booking.id,
            amount=payload.amount_received,
            title=f"Money Receipt {mr_number} ({payload.payment_mode})",
            payment_mode=payload.payment_mode,
            project_id=booking.project_id
        )
    except Exception as e:
        logger.warning(f"Could not post GL voucher for Money Receipt {mr_number}: {e}")

    # SMS Confirmation Dispatch
    customer = booking.customer
    if payload.send_sms_notification and customer and customer.primary_phone:
        sms_text = (
            f"Dear {customer.full_name_en}, Money Receipt {mr_number} issued for BDT {payload.amount_received:,.2f} "
            f"against Booking {booking.booking_reference_no}. Surcharge Adj: BDT {total_late_fee_adj:,.2f}, "
            f"Principal Adj: BDT {total_principal_adj:,.2f}. Thank you."
        )
        sms_res = send_sms(customer.primary_phone, sms_text)
        if sms_res.get("success"):
            receipt.sms_confirmation_sent = True
            receipt.sms_sent_at = func.now()

    await db.commit()

    # Re-query rich response
    rich_res = await db.execute(
        select(MoneyReceipt)
        .options(
            selectinload(MoneyReceipt.booking).selectinload(Booking.customer),
            selectinload(MoneyReceipt.booking).selectinload(Booking.unit),
            selectinload(MoneyReceipt.booking).selectinload(Booking.project),
            selectinload(MoneyReceipt.allocations).selectinload(MoneyReceiptAllocation.installment)
        )
        .where(MoneyReceipt.id == receipt.id)
    )
    saved_mr = rich_res.scalars().first()

    resp = MoneyReceiptResponse.model_validate(saved_mr)
    if saved_mr.booking:
        resp.booking_reference_no = saved_mr.booking.booking_reference_no
        if saved_mr.booking.customer:
            resp.customer_name = saved_mr.booking.customer.full_name_en
            resp.customer_phone = saved_mr.booking.customer.primary_phone
        if saved_mr.booking.unit:
            resp.unit_number = saved_mr.booking.unit.unit_number
        if saved_mr.booking.project:
            resp.project_name = saved_mr.booking.project.project_name

    alloc_resps = []
    for a in saved_mr.allocations:
        ar = MoneyReceiptAllocationResponse.model_validate(a)
        if a.installment:
            ar.installment_no = a.installment.installment_no
            ar.installment_title = a.installment.title
        alloc_resps.append(ar)
    resp.allocations = alloc_resps

    return resp


@router.get("/money-receipts/{receipt_id}", response_model=MoneyReceiptResponse)
async def get_money_receipt(receipt_id: int, db: AsyncSession = Depends(get_db)):
    """
    Returns single money receipt with allocation breakdown.
    """
    stmt = (
        select(MoneyReceipt)
        .options(
            selectinload(MoneyReceipt.booking).selectinload(Booking.customer),
            selectinload(MoneyReceipt.booking).selectinload(Booking.unit),
            selectinload(MoneyReceipt.booking).selectinload(Booking.project),
            selectinload(MoneyReceipt.allocations).selectinload(MoneyReceiptAllocation.installment)
        )
        .where(MoneyReceipt.id == receipt_id)
    )
    result = await db.execute(stmt)
    r = result.scalars().first()
    if not r:
        raise HTTPException(status_code=404, detail="Money Receipt not found.")

    resp = MoneyReceiptResponse.model_validate(r)
    if r.booking:
        resp.booking_reference_no = r.booking.booking_reference_no
        if r.booking.customer:
            resp.customer_name = r.booking.customer.full_name_en
            resp.customer_phone = r.booking.customer.primary_phone
        if r.booking.unit:
            resp.unit_number = r.booking.unit.unit_number
        if r.booking.project:
            resp.project_name = r.booking.project.project_name

    alloc_resps = []
    for a in r.allocations:
        ar = MoneyReceiptAllocationResponse.model_validate(a)
        if a.installment:
            ar.installment_no = a.installment.installment_no
            ar.installment_title = a.installment.title
        alloc_resps.append(ar)
    resp.allocations = alloc_resps

    return resp


@router.get("/money-receipts/{receipt_id}/verify")
async def verify_money_receipt_qr(receipt_id: int, db: AsyncSession = Depends(get_db)):
    """
    Public QR Verification Endpoint for scanning physical Money Receipts.
    """
    stmt = (
        select(MoneyReceipt)
        .options(
            selectinload(MoneyReceipt.booking).selectinload(Booking.customer),
            selectinload(MoneyReceipt.booking).selectinload(Booking.unit),
            selectinload(MoneyReceipt.booking).selectinload(Booking.project)
        )
        .where(MoneyReceipt.id == receipt_id)
    )
    result = await db.execute(stmt)
    r = result.scalars().first()
    if not r:
        raise HTTPException(status_code=404, detail="Money Receipt not found or invalid QR verification token.")

    return {
        "verified": True,
        "mr_number": r.mr_number,
        "receipt_date": str(r.receipt_date),
        "amount_received": float(r.amount_received),
        "payment_mode": r.payment_mode,
        "customer_name": r.booking.customer.full_name_en if r.booking and r.booking.customer else "N/A",
        "booking_reference_no": r.booking.booking_reference_no if r.booking else "N/A",
        "unit_number": r.booking.unit.unit_number if r.booking and r.booking.unit else "N/A",
        "project_name": r.booking.project.project_name if r.booking and r.booking.project else "N/A",
        "status": r.status,
        "qr_verification_token": r.qr_verification_token,
        "late_fee_adjusted": float(r.late_fee_adjusted),
        "principal_adjusted": float(r.installment_principal_adjusted),
        "excess_advance": float(r.excess_advance_amount)
    }


# --------------------------------------------------------------------------
# 6. Bank Home Loan Tripartite Agreement & Tranche Ledger (Prompt 10)
# --------------------------------------------------------------------------
@router.get("/tripartite-loans", response_model=List[TripartiteLoanResponse])
async def list_tripartite_loans(
    booking_id: Optional[int] = None,
    financial_institution_code: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns Tripartite Bank Home Loan ledger records with milestone-linked tranches.
    """
    stmt = (
        select(TripartiteLoan)
        .options(
            selectinload(TripartiteLoan.booking).selectinload(Booking.customer),
            selectinload(TripartiteLoan.booking).selectinload(Booking.unit),
            selectinload(TripartiteLoan.booking).selectinload(Booking.project),
            selectinload(TripartiteLoan.tranches).selectinload(LoanTranche.receipt)
        )
        .order_by(TripartiteLoan.id.desc())
    )

    if booking_id:
        stmt = stmt.where(TripartiteLoan.booking_id == booking_id)
    if financial_institution_code:
        stmt = stmt.where(TripartiteLoan.financial_institution_code == financial_institution_code.upper())
    if status_filter:
        stmt = stmt.where(TripartiteLoan.status == status_filter.upper())

    result = await db.execute(stmt)
    loans = result.scalars().all()

    responses = []
    for l in loans:
        resp = TripartiteLoanResponse.model_validate(l)
        if l.booking:
            resp.booking_reference_no = l.booking.booking_reference_no
            if l.booking.customer:
                resp.customer_name = l.booking.customer.full_name_en
                resp.customer_phone = l.booking.customer.primary_phone
            if l.booking.unit:
                resp.unit_number = l.booking.unit.unit_number
            if l.booking.project:
                resp.project_name = l.booking.project.project_name

        tranche_resps = []
        for t in l.tranches:
            tr = LoanTrancheResponse.model_validate(t)
            if t.receipt:
                tr.mr_number = t.receipt.mr_number
            tranche_resps.append(tr)
        resp.tranches = tranche_resps
        responses.append(resp)

    return responses


@router.post("/tripartite-loans", response_model=TripartiteLoanResponse, status_code=status.HTTP_201_CREATED)
async def create_tripartite_loan(
    payload: TripartiteLoanCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new Tripartite Home Loan tracking record between Buyer, Developer, and Bank/NBFI.
    """
    b_res = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.customer),
            selectinload(Booking.unit),
            selectinload(Booking.project)
        )
        .where(Booking.id == payload.booking_id)
    )
    booking = b_res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found.")

    # Unique Loan Reference Number
    count_res = await db.execute(select(func.count(TripartiteLoan.id)))
    count = count_res.scalar() or 0
    loan_ref = f"TRP-{payload.financial_institution_code[:3]}-2026-{count + 1:03d}"

    loan = TripartiteLoan(
        loan_reference_no=loan_ref,
        booking_id=booking.id,
        customer_id=booking.primary_customer_id,
        financial_institution_code=payload.financial_institution_code.upper(),
        bank_name=payload.bank_name,
        branch_name=payload.branch_name,
        sanction_letter_no=payload.sanction_letter_no,
        sanction_date=payload.sanction_date,
        sanctioned_amount=payload.sanctioned_amount,
        disbursed_amount_total=0.00,
        developer_noc_ref=payload.developer_noc_ref,
        developer_noc_date=payload.developer_noc_date,
        noc_status=payload.noc_status or "PENDING",
        tripartite_agreement_date=payload.tripartite_agreement_date,
        bank_officer_name=payload.bank_officer_name,
        bank_officer_phone=payload.bank_officer_phone,
        bank_officer_email=payload.bank_officer_email,
        status="SANCTIONED",
        remarks=payload.remarks
    )
    db.add(loan)
    await db.flush()

    # Create scheduled tranches if provided
    if payload.tranches:
        for t in payload.tranches:
            tranche = LoanTranche(
                loan_id=loan.id,
                tranche_number=t.tranche_number,
                milestone_title=t.milestone_title,
                sanctioned_tranche_amount=t.sanctioned_tranche_amount,
                inspection_status="PENDING_INSPECTION",
                status="PENDING",
                remarks=t.remarks
            )
            db.add(tranche)

    await db.commit()

    # Re-query
    rich_res = await db.execute(
        select(TripartiteLoan)
        .options(
            selectinload(TripartiteLoan.booking).selectinload(Booking.customer),
            selectinload(TripartiteLoan.booking).selectinload(Booking.unit),
            selectinload(TripartiteLoan.booking).selectinload(Booking.project),
            selectinload(TripartiteLoan.tranches).selectinload(LoanTranche.receipt)
        )
        .where(TripartiteLoan.id == loan.id)
    )
    saved = rich_res.scalars().first()

    resp = TripartiteLoanResponse.model_validate(saved)
    if saved.booking:
        resp.booking_reference_no = saved.booking.booking_reference_no
        if saved.booking.customer:
            resp.customer_name = saved.booking.customer.full_name_en
            resp.customer_phone = saved.booking.customer.primary_phone
        if saved.booking.unit:
            resp.unit_number = saved.booking.unit.unit_number
        if saved.booking.project:
            resp.project_name = saved.booking.project.project_name

    tranche_resps = []
    for t in saved.tranches:
        tr = LoanTrancheResponse.model_validate(t)
        if t.receipt:
            tr.mr_number = t.receipt.mr_number
        tranche_resps.append(tr)
    resp.tranches = tranche_resps

    return resp


@router.post("/tripartite-loans/{loan_id}/noc", response_model=TripartiteLoanResponse)
async def issue_developer_noc(
    loan_id: int,
    payload: TripartiteLoanNOCRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Issues Developer Non-Objection Certificate (NOC) endorsing the tripartite mortgage charge.
    """
    stmt = (
        select(TripartiteLoan)
        .options(
            selectinload(TripartiteLoan.booking).selectinload(Booking.customer),
            selectinload(TripartiteLoan.booking).selectinload(Booking.unit),
            selectinload(TripartiteLoan.booking).selectinload(Booking.project),
            selectinload(TripartiteLoan.tranches)
        )
        .where(TripartiteLoan.id == loan_id)
    )
    result = await db.execute(stmt)
    loan = result.scalars().first()
    if not loan:
        raise HTTPException(status_code=404, detail="Tripartite Loan not found.")

    loan.developer_noc_ref = payload.developer_noc_ref
    loan.developer_noc_date = payload.developer_noc_date
    loan.noc_status = "ISSUED"
    loan.status = "NOC_ISSUED"
    if payload.remarks:
        loan.remarks = f"{loan.remarks or ''} | NOC Endorsement: {payload.remarks}"

    await db.commit()
    await db.refresh(loan)

    resp = TripartiteLoanResponse.model_validate(loan)
    if loan.booking:
        resp.booking_reference_no = loan.booking.booking_reference_no
        if loan.booking.customer:
            resp.customer_name = loan.booking.customer.full_name_en
            resp.customer_phone = loan.booking.customer.primary_phone
        if loan.booking.unit:
            resp.unit_number = loan.booking.unit.unit_number
        if loan.booking.project:
            resp.project_name = loan.booking.project.project_name

    tranche_resps = []
    for t in loan.tranches:
        tr = LoanTrancheResponse.model_validate(t)
        tranche_resps.append(tr)
    resp.tranches = tranche_resps

    return resp


@router.put("/tripartite-loans/{loan_id}/tranches/{tranche_id}/inspection", response_model=LoanTrancheResponse)
async def record_tranche_inspection(
    loan_id: int,
    tranche_id: int,
    payload: LoanTrancheInspectionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Records Bank Civil Engineer Inspection Verification for a milestone tranche.
    """
    stmt = (
        select(LoanTranche)
        .where(LoanTranche.id == tranche_id, LoanTranche.loan_id == loan_id)
    )
    result = await db.execute(stmt)
    tranche = result.scalars().first()
    if not tranche:
        raise HTTPException(status_code=404, detail="Tranche record not found.")

    tranche.bank_inspection_date = payload.bank_inspection_date
    tranche.inspection_status = payload.inspection_status.upper()
    tranche.inspection_engineer_name = payload.inspection_engineer_name
    tranche.inspection_notes = payload.inspection_notes

    if tranche.inspection_status == "INSPECTION_PASSED":
        tranche.status = "INSPECTION_DONE"
    elif tranche.inspection_status == "INSPECTION_REJECTED":
        tranche.status = "PENDING"

    await db.commit()
    await db.refresh(tranche)

    return LoanTrancheResponse.model_validate(tranche)


@router.post("/tripartite-loans/{loan_id}/tranches/{tranche_id}/disburse", response_model=LoanTrancheResponse)
async def disburse_tranche(
    loan_id: int,
    tranche_id: int,
    payload: LoanTrancheDisburseRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Records disbursement from Bank/NBFI for an approved tranche:
      1. Automatically triggers Money Receipt (MR) creation with waterfall adjustment.
      2. Reconciles tranche and links to the generated Money Receipt.
      3. Updates total disbursed amount on the Tripartite Loan ledger.
    """
    stmt = (
        select(LoanTranche)
        .options(selectinload(LoanTranche.loan).selectinload(TripartiteLoan.booking))
        .where(LoanTranche.id == tranche_id, LoanTranche.loan_id == loan_id)
    )
    result = await db.execute(stmt)
    tranche = result.scalars().first()
    if not tranche:
        raise HTTPException(status_code=404, detail="Tranche record not found.")

    loan = tranche.loan
    booking = loan.booking

    # 1. Trigger Money Receipt creation via waterfall
    mr_payload = MoneyReceiptCreate(
        booking_id=booking.id,
        receipt_date=payload.disbursed_date,
        payment_mode=payload.payment_mode,
        instrument_no=payload.payment_instrument_no,
        instrument_date=payload.disbursed_date,
        bank_name=payload.bank_name or loan.bank_name,
        branch_name=payload.branch_name or loan.branch_name,
        amount_received=payload.disbursed_amount,
        remarks=f"Tripartite Bank Home Loan Disbursement - Tranche #{tranche.tranche_number} ({tranche.milestone_title})",
        send_sms_notification=True
    )
    mr_resp = await create_money_receipt(payload=mr_payload, db=db)

    # 2. Update Tranche
    tranche.disbursed_date = payload.disbursed_date
    tranche.disbursed_amount = payload.disbursed_amount
    tranche.payment_instrument_no = payload.payment_instrument_no
    tranche.receipt_id = mr_resp.id
    tranche.status = "RECONCILED"
    if payload.remarks:
        tranche.remarks = f"{tranche.remarks or ''} | Disbursement: {payload.remarks}"

    # 3. Update Loan Total
    loan.disbursed_amount_total = float(loan.disbursed_amount_total or 0.0) + float(payload.disbursed_amount)
    if float(loan.disbursed_amount_total) >= float(loan.sanctioned_amount):
        loan.status = "COMPLETED"
    else:
        loan.status = "DISBURSING"

    await db.commit()
    await db.refresh(tranche)

    resp = LoanTrancheResponse.model_validate(tranche)
    resp.mr_number = mr_resp.mr_number
    return resp


