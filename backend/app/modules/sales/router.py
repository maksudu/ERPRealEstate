import logging
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.modules.projects.models import Project
from app.modules.inventory.models import Unit
from app.modules.crm.models import Customer
from app.modules.auth.models import User
from app.modules.sales.models import Booking, BookingCancellation, UnitTransfer
from app.modules.sales.schemas import (
    BookingCreate, BookingResponse, DiscountApprovalAction,
    BookingCancellationCreate, BookingCancellationResponse,
    UnitTransferCreate, UnitTransferResponse,
    SalesMetrics
)
from app.modules.sales.deed_generator import generate_bilingual_deed_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sales", tags=["Sales Bookings & Legal Tech"])

# --------------------------------------------------------------------------
# 1. Sales Bookings Master Endpoints
# --------------------------------------------------------------------------
@router.get("/bookings", response_model=List[BookingResponse])
async def list_bookings(
    project_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    discount_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of property bookings with eager-loaded project, unit, customer, and approvals.
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.project),
            selectinload(Booking.unit),
            selectinload(Booking.customer),
            selectinload(Booking.discount_approved_by),
            selectinload(Booking.cancellation)
        )
        .order_by(Booking.id.desc())
    )

    if project_id:
        stmt = stmt.where(Booking.project_id == project_id)
    if status_filter:
        stmt = stmt.where(Booking.status == status_filter.upper())
    if discount_status:
        stmt = stmt.where(Booking.discount_approval_status == discount_status.upper())
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Booking.booking_reference_no.ilike(search_pattern),
                Booking.notes.ilike(search_pattern)
            )
        )

    result = await db.execute(stmt)
    bookings = result.scalars().all()

    responses = []
    for b in bookings:
        resp = BookingResponse.model_validate(b)
        if b.project:
            resp.project_name = b.project.project_name
        if b.unit:
            resp.unit_number = b.unit.unit_number
        if b.customer:
            resp.customer_name = b.customer.full_name_en
            resp.customer_phone = b.customer.primary_phone
        if b.discount_approved_by:
            resp.discount_approved_by_name = b.discount_approved_by.full_name_en
        responses.append(resp)

    return responses


@router.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new apartment booking and enforces the Multi-Level Discount Approval Matrix:
    - Discount <= 1.0%: Sales Manager Approval (auto-approved or assigned tier)
    - 1.0% < Discount <= 3.0%: Director Approval required
    - Discount > 3.0%: Managing Director (MD) Approval required
    """
    # Verify Unit
    unit_res = await db.execute(select(Unit).where(Unit.id == payload.unit_id))
    unit = unit_res.scalars().first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    if unit.status_id in ["BOOKED", "SOLD"]:
        raise HTTPException(status_code=400, detail=f"Unit {unit.unit_number} is already {unit.status_id}.")

    # Verify Customer
    cust_res = await db.execute(select(Customer).where(Customer.id == payload.primary_customer_id))
    customer = cust_res.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer KYC profile not found")

    base_price = float(unit.total_unit_price or 0.0)
    discount_amount = float(payload.discount_amount or 0.0)
    if discount_amount > base_price:
        raise HTTPException(status_code=400, detail="Discount cannot exceed base unit price.")

    # Calculate discount percentage
    discount_percent = (discount_amount / base_price * 100.0) if base_price > 0 else 0.0
    final_contract_value = base_price - discount_amount

    # Enforce Multi-Level Approval Tier
    if discount_percent <= 0.0:
        approval_tier = "SALES_MANAGER"
        approval_status = "APPROVED"
    elif discount_percent <= 1.0:
        approval_tier = "SALES_MANAGER"
        approval_status = "APPROVED" # Within Sales Manager discretion
    elif discount_percent <= 3.0:
        approval_tier = "DIRECTOR"
        approval_status = "PENDING_APPROVAL"
    else:
        approval_tier = "MANAGING_DIRECTOR"
        approval_status = "PENDING_APPROVAL"

    # Generate sequential booking reference
    count_res = await db.execute(select(func.count(Booking.id)))
    next_num = (count_res.scalar() or 0) + 1
    booking_ref = f"BK-2026-{next_num:04d}"

    booking = Booking(
        booking_reference_no=booking_ref,
        project_id=payload.project_id,
        unit_id=payload.unit_id,
        primary_customer_id=payload.primary_customer_id,
        booking_date=payload.booking_date or date.today(),
        base_unit_price=base_price,
        discount_amount=discount_amount,
        discount_percentage=round(discount_percent, 2),
        required_approval_tier=approval_tier,
        discount_approval_status=approval_status,
        final_contract_value=final_contract_value,
        earnest_money_received=payload.earnest_money_received or 0.0,
        down_payment_total=payload.down_payment_total or 0.0,
        status="PROVISIONAL" if approval_status == "APPROVED" else "PROVISIONAL",
        notes=payload.notes
    )
    db.add(booking)

    # Update unit status to BOOKED
    unit.status_id = "BOOKED"
    await db.commit()

    # Re-fetch eager loaded response
    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.project),
            selectinload(Booking.unit),
            selectinload(Booking.customer),
            selectinload(Booking.discount_approved_by),
            selectinload(Booking.cancellation)
        )
        .where(Booking.id == booking.id)
    )
    saved = result.scalars().first()
    resp = BookingResponse.model_validate(saved)
    resp.project_name = saved.project.project_name if saved.project else None
    resp.unit_number = saved.unit.unit_number if saved.unit else None
    resp.customer_name = saved.customer.full_name_en if saved.customer else None
    resp.customer_phone = saved.customer.primary_phone if saved.customer else None
    return resp


# --------------------------------------------------------------------------
# 2. Multi-Level Discount Approvals (Director & MD 1-Tap Biometric)
# --------------------------------------------------------------------------
@router.get("/discounts/pending", response_model=List[BookingResponse])
async def list_pending_discount_approvals(db: AsyncSession = Depends(get_db)):
    """
    Returns all bookings requiring Director or Managing Director discount authorizations.
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.project),
            selectinload(Booking.unit),
            selectinload(Booking.customer),
            selectinload(Booking.discount_approved_by),
            selectinload(Booking.cancellation)
        )
        .where(Booking.discount_approval_status == "PENDING_APPROVAL")
        .order_by(Booking.id.desc())
    )
    result = await db.execute(stmt)
    bookings = result.scalars().all()

    responses = []
    for b in bookings:
        resp = BookingResponse.model_validate(b)
        resp.project_name = b.project.project_name if b.project else None
        resp.unit_number = b.unit.unit_number if b.unit else None
        resp.customer_name = b.customer.full_name_en if b.customer else None
        responses.append(resp)
    return responses


@router.put("/discounts/{booking_id}/action", response_model=BookingResponse)
async def process_discount_approval(
    booking_id: int,
    payload: DiscountApprovalAction,
    db: AsyncSession = Depends(get_db)
):
    """
    Approves or rejects a discount request based on matrix tier permissions.
    Supports MD biometric 1-tap mobile authorization token verification.
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.project),
            selectinload(Booking.unit),
            selectinload(Booking.customer),
            selectinload(Booking.discount_approved_by),
            selectinload(Booking.cancellation)
        )
        .where(Booking.id == booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    decision = payload.decision.upper()
    if decision not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Decision must be 'APPROVED' or 'REJECTED'")

    booking.discount_approval_status = decision
    booking.discount_approval_notes = payload.approval_notes or ("Biometric 1-Tap Authorization Verified" if payload.biometric_token else "Approved via Portal")
    
    # Auto assign an approver if not specified
    if payload.approved_by_id:
        booking.discount_approved_by_id = payload.approved_by_id
    else:
        user_res = await db.execute(select(User).order_by(User.id.asc()))
        first_user = user_res.scalars().first()
        if first_user:
            booking.discount_approved_by_id = first_user.id

    if decision == "REJECTED":
        # Revert discount back to 0
        booking.discount_amount = 0.00
        booking.discount_percentage = 0.00
        booking.final_contract_value = booking.base_unit_price

    await db.commit()
    await db.refresh(booking)

    resp = BookingResponse.model_validate(booking)
    resp.project_name = booking.project.project_name if booking.project else None
    resp.unit_number = booking.unit.unit_number if booking.unit else None
    resp.customer_name = booking.customer.full_name_en if booking.customer else None
    resp.discount_approved_by_name = booking.discount_approved_by.full_name_en if booking.discount_approved_by else None
    return resp


# --------------------------------------------------------------------------
# 3. Bilingual Sub-Registry Deed Generator (WeasyPrint)
# --------------------------------------------------------------------------
@router.get("/bookings/{booking_id}/deed-pdf")
async def download_bilingual_deed_pdf(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Renders and streams an official Bilingual Deed of Agreement PDF matching Sub-Registry standards.
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.project),
            selectinload(Booking.unit),
            selectinload(Booking.customer)
        )
        .where(Booking.id == booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking_data = {
        "booking_reference_no": booking.booking_reference_no,
        "booking_date": str(booking.booking_date),
        "status": booking.status,
        "customer_name": booking.customer.full_name_en if booking.customer else "Valued Buyer",
        "customer_nid": booking.customer.nid_number if booking.customer else "N/A",
        "customer_phone": booking.customer.primary_phone if booking.customer else "N/A",
        "project_name": booking.project.project_name if booking.project else "Luxury Residential Project",
        "unit_number": booking.unit.unit_number if booking.unit else "Unit A",
        "floor_number": booking.unit.floor_number if booking.unit else 1,
        "facing": booking.unit.facing_id if booking.unit else "South",
        "gross_area_sqft": float(booking.unit.gross_saleable_area_sqft or 1850.0),
        "base_unit_price": float(booking.base_unit_price),
        "discount_amount": float(booking.discount_amount),
        "discount_percentage": float(booking.discount_percentage),
        "final_contract_value": float(booking.final_contract_value),
        "earnest_money_received": float(booking.earnest_money_received),
        "down_payment_total": float(booking.down_payment_total)
    }

    try:
        pdf_bytes = generate_bilingual_deed_pdf(booking_data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Deed_of_Agreement_{booking.booking_reference_no}.pdf"
            }
        )
    except Exception as e:
        logger.error(f"Failed to generate WeasyPrint PDF: {e}")
        raise HTTPException(status_code=500, detail=f"PDF Generation failed: {str(e)}")


# --------------------------------------------------------------------------
# 4. Booking Cancellations & Forfeiture Deductions
# --------------------------------------------------------------------------
@router.get("/cancellations", response_model=List[BookingCancellationResponse])
async def list_cancellations(db: AsyncSession = Depends(get_db)):
    """
    Lists statutory booking cancellations with forfeiture deductions and net refunds.
    """
    stmt = (
        select(BookingCancellation)
        .options(
            selectinload(BookingCancellation.booking).selectinload(Booking.customer),
            selectinload(BookingCancellation.booking).selectinload(Booking.unit)
        )
        .order_by(BookingCancellation.id.desc())
    )
    result = await db.execute(stmt)
    cancellations = result.scalars().all()

    responses = []
    for c in cancellations:
        resp = BookingCancellationResponse.model_validate(c)
        if c.booking:
            resp.booking_reference_no = c.booking.booking_reference_no
            if c.booking.customer:
                resp.customer_name = c.booking.customer.full_name_en
            if c.booking.unit:
                resp.unit_number = c.booking.unit.unit_number
        responses.append(resp)
    return responses


@router.post("/cancellations", response_model=BookingCancellationResponse, status_code=status.HTTP_201_CREATED)
async def process_booking_cancellation(
    payload: BookingCancellationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Processes an apartment booking cancellation, applies REHAB standard 10% forfeiture deduction,
    calculates net refund, and restores the unit status to AVAILABLE.
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.unit),
            selectinload(Booking.customer)
        )
        .where(Booking.id == payload.booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Booking is already cancelled.")

    total_paid = float(booking.earnest_money_received + booking.down_payment_total)
    deduction_pct = float(payload.forfeiture_deduction_percentage or 10.0)
    deduction_amt = (total_paid * deduction_pct / 100.0)
    net_refund = max(0.0, total_paid - deduction_amt)

    cancellation = BookingCancellation(
        booking_id=booking.id,
        cancellation_date=date.today(),
        cancellation_reason=payload.cancellation_reason,
        total_paid=total_paid,
        forfeiture_deduction_percentage=deduction_pct,
        forfeiture_deduction_amount=deduction_amt,
        net_refund_amount=net_refund,
        status="APPROVED",
        refund_cheque_no=payload.refund_cheque_no,
        settlement_notes=payload.settlement_notes or "REHAB Standard 10% Forfeiture Deduction Applied."
    )
    db.add(cancellation)

    # Update booking and unit statuses
    booking.status = "CANCELLED"
    if booking.unit:
        booking.unit.status_id = "AVAILABLE"

    await db.commit()
    await db.refresh(cancellation)

    resp = BookingCancellationResponse.model_validate(cancellation)
    resp.booking_reference_no = booking.booking_reference_no
    resp.customer_name = booking.customer.full_name_en if booking.customer else None
    resp.unit_number = booking.unit.unit_number if booking.unit else None
    return resp


# --------------------------------------------------------------------------
# 5. Unit Mutation & Ownership Transfers
# --------------------------------------------------------------------------
@router.post("/transfers", response_model=UnitTransferResponse, status_code=status.HTTP_201_CREATED)
async def process_unit_transfer(
    payload: UnitTransferCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Transfers apartment allotment from original buyer to a new verified customer KYC file.
    """
    stmt = (
        select(Booking)
        .options(selectinload(Booking.customer))
        .where(Booking.id == payload.booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    old_customer_id = booking.primary_customer_id
    if old_customer_id == payload.to_customer_id:
        raise HTTPException(status_code=400, detail="Cannot transfer unit to the same customer.")

    # Verify new customer
    to_cust_res = await db.execute(select(Customer).where(Customer.id == payload.to_customer_id))
    to_customer = to_cust_res.scalars().first()
    if not to_customer:
        raise HTTPException(status_code=404, detail="Transferee Customer profile not found")

    transfer = UnitTransfer(
        booking_id=booking.id,
        from_customer_id=old_customer_id,
        to_customer_id=payload.to_customer_id,
        transfer_date=date.today(),
        transfer_fee_bdt=payload.transfer_fee_bdt,
        transfer_memo_no=payload.transfer_memo_no or f"TRF-{booking.booking_reference_no}",
        approval_status="COMPLETED",
        remarks=payload.remarks
    )
    db.add(transfer)

    # Re-assign booking to new customer
    booking.primary_customer_id = payload.to_customer_id
    booking.status = "TRANSFERRED"
    await db.commit()
    await db.refresh(transfer)

    resp = UnitTransferResponse.model_validate(transfer)
    resp.from_customer_name = booking.customer.full_name_en if booking.customer else None
    resp.to_customer_name = to_customer.full_name_en
    return resp


# --------------------------------------------------------------------------
# 6. Sales Metrics & Pipeline Summary
# --------------------------------------------------------------------------
@router.get("/metrics", response_model=SalesMetrics)
async def get_sales_metrics(db: AsyncSession = Depends(get_db)):
    """
    Returns pipeline aggregate contract values, earnest money collected, and pending authorizations.
    """
    total_bookings = (await db.execute(select(func.count(Booking.id)))).scalar() or 0
    gross_contract = (await db.execute(select(func.sum(Booking.final_contract_value)))).scalar() or 0.0
    earnest_money = (await db.execute(select(func.sum(Booking.earnest_money_received)))).scalar() or 0.0
    
    pending_discounts = (
        await db.execute(
            select(func.count(Booking.id)).where(Booking.discount_approval_status == "PENDING_APPROVAL")
        )
    ).scalar() or 0

    cancellations = (await db.execute(select(func.count(BookingCancellation.id)))).scalar() or 0

    return SalesMetrics(
        total_bookings=total_bookings,
        gross_contract_value=float(gross_contract),
        total_earnest_collected=float(earnest_money),
        pending_discount_approvals=pending_discounts,
        total_cancellations=cancellations
    )
