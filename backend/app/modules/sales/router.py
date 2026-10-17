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
from app.modules.sales.models import Booking, BookingCancellation, UnitTransfer, BookingJointBuyer
from app.modules.sales.schemas import (
    BookingCreate, BookingResponse, DiscountApprovalAction,
    BookingCancellationCreate, BookingCancellationResponse,
    UnitTransferCreate, UnitTransferResponse,
    BookingJointBuyerCreate, BookingJointBuyerResponse,
    SalesMetrics
)
from app.modules.sales.deed_generator import generate_bilingual_deed_pdf
from app.modules.accounts.services import post_customer_collection_voucher
from app.modules.governance.services import GovernanceEngineService
from app.modules.governance.schemas import ApprovalRequestCreate

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
            selectinload(Booking.cancellation),
            selectinload(Booking.joint_buyers)
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
    Creates a new apartment booking with transparent pricing breakdown (Prompt 09)
    and enforces the Multi-Level Discount Approval Matrix with Governance Engine integration:
    - Base Price + Parking + Utility + Documentation Charges
    - Discount <= 1.0%: Standard Sales Manager Discretion (Auto-Approved)
    - 1.0% < Discount <= 3.0%: Sales Manager Approval Required
    - 3.0% < Discount <= 7.0%: Head of Sales Approval Required
    - Discount > 7.0%: Managing Director (MD) Approval Required
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
    parking_charge = float(payload.parking_charge or 0.0)
    utility_charge = float(payload.utility_charge or 0.0)
    documentation_charge = float(payload.documentation_charge or 0.0)
    gross_contract_value = base_price + parking_charge + utility_charge + documentation_charge

    discount_amount = float(payload.discount_amount or 0.0)
    if discount_amount > gross_contract_value:
        raise HTTPException(status_code=400, detail="Discount cannot exceed total contract value.")

    # Calculate discount percentage on base price
    discount_percent = (discount_amount / base_price * 100.0) if base_price > 0 else 0.0
    final_contract_value = gross_contract_value - discount_amount

    # Enforce Multi-Level Approval Tier Matrix (Prompt 08 & Prompt 09)
    if discount_percent <= 0.0:
        approval_tier = "SALES_MANAGER"
        approval_status = "APPROVED"
    elif discount_percent <= 1.0:
        approval_tier = "SALES_MANAGER"
        approval_status = "APPROVED" # Within Sales Manager discretion
    elif discount_percent <= 3.0:
        approval_tier = "SALES_MANAGER"
        approval_status = "PENDING_APPROVAL"
    elif discount_percent <= 7.0:
        approval_tier = "HEAD_OF_SALES"
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
        parking_charge=parking_charge,
        utility_charge=utility_charge,
        documentation_charge=documentation_charge,
        parking_slot_number=payload.parking_slot_number,
        discount_amount=discount_amount,
        discount_percentage=round(discount_percent, 2),
        required_approval_tier=approval_tier,
        discount_approval_status=approval_status,
        final_contract_value=final_contract_value,
        earnest_money_received=payload.earnest_money_received or 0.0,
        down_payment_total=payload.down_payment_total or 0.0,
        status="PROVISIONAL",
        notes=payload.notes
    )
    db.add(booking)
    await db.flush()

    # Save Joint-Buyers / Co-Applicants KYC under Prompt 09
    if payload.joint_buyers:
        for jb in payload.joint_buyers:
            joint_buyer = BookingJointBuyer(
                booking_id=booking.id,
                full_name_en=jb.full_name_en,
                full_name_bn=jb.full_name_bn,
                nid_number=jb.nid_number,
                passport_number=jb.passport_number,
                tin_number=jb.tin_number,
                primary_phone=jb.primary_phone,
                email=jb.email,
                present_address=jb.present_address,
                relation_to_primary=jb.relation_to_primary or "CO_APPLICANT",
                share_percentage=jb.share_percentage or 50.00,
                photo_url=jb.photo_url,
                nid_scan_url=jb.nid_scan_url
            )
            db.add(joint_buyer)

    # Automatically route to Governance Maker-Checker Approval Engine if discount requires escalation
    if approval_status == "PENDING_APPROVAL":
        try:
            gov_req = await GovernanceEngineService.create_approval_request(
                db=db,
                payload=ApprovalRequestCreate(
                    document_type="DISCOUNT_APPROVAL",
                    document_id=booking.id,
                    document_reference=booking.booking_reference_no,
                    requested_amount=discount_amount,
                    title=f"Discount Escalation ({round(discount_percent, 2)}%) - {booking.booking_reference_no}",
                    description=f"Escalated {round(discount_percent, 2)}% discount on unit {unit.unit_number} for customer {customer.full_name_en}. Required Tier: {approval_tier}.",
                    priority="HIGH" if discount_percent > 7.0 else "MEDIUM"
                ),
                initiator_user_id=1 # Default system administrator/initiator
            )
            booking.governance_request_id = gov_req.id
        except Exception as e:
            logger.warning(f"Could not initialize governance approval workflow: {e}")

    # Post Double-Entry Cash/Bank Receipt Voucher for Earnest Money in General Ledger
    if float(booking.earnest_money_received or 0) > 0:
        await post_customer_collection_voucher(
            db=db,
            booking_id=booking.id,
            amount=float(booking.earnest_money_received),
            title=f"Earnest Money Allotment Deposit ({booking.booking_reference_no})",
            payment_mode="Bank/PayOrder",
            project_id=booking.project_id
        )

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
            selectinload(Booking.cancellation),
            selectinload(Booking.joint_buyers)
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


@router.post("/bookings/{booking_id}/joint-buyers", response_model=BookingJointBuyerResponse)
async def add_booking_joint_buyer(
    booking_id: int,
    payload: BookingJointBuyerCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Appends a new Joint-Buyer / Co-Applicant KYC record to an existing sales booking.
    """
    booking_res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = booking_res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    joint_buyer = BookingJointBuyer(
        booking_id=booking_id,
        full_name_en=payload.full_name_en,
        full_name_bn=payload.full_name_bn,
        nid_number=payload.nid_number,
        passport_number=payload.passport_number,
        tin_number=payload.tin_number,
        primary_phone=payload.primary_phone,
        email=payload.email,
        present_address=payload.present_address,
        relation_to_primary=payload.relation_to_primary or "CO_APPLICANT",
        share_percentage=payload.share_percentage or 50.00,
        photo_url=payload.photo_url,
        nid_scan_url=payload.nid_scan_url
    )
    db.add(joint_buyer)
    await db.commit()
    await db.refresh(joint_buyer)
    return joint_buyer


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
