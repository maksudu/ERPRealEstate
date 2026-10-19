import hashlib
import random
from decimal import Decimal
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_, desc, asc, text

from app.core.database import get_db
from app.modules.projects.models import Project, Tower
from app.modules.inventory.models import Unit
from app.modules.crm.models import Customer
from app.modules.sales.models import Booking
from app.modules.installments.models import CustomerInstallment, BookingInstallmentSchedule
from app.modules.accounts.models import (
    ChartOfAccount, Voucher, JournalEntry,
    CustomerAdvanceInstallment, CustomerAdvanceAllocation
)
from app.modules.accounts.schemas import (
    CustomerAdvanceAllocationCreate,
    CustomerAdvanceAllocationResponse,
    CustomerAdvanceInstallmentCreate,
    CustomerAdvanceInstallmentUpdate,
    CustomerAdvanceInstallmentResponse,
    CustomerAdvancePaginationResponse,
    CustomerAdvanceRevenueRecognizeRequest,
    CustomerAdvanceRefundRequest,
    CustomerAdvanceLateChargeAdjustRequest,
    CustomerLiabilityLedgerItem,
    CustomerLiabilityLedgerSummaryResponse,
    ReceivableAgingBucketItem,
    ReceivableAgingReconciliationResponse
)

router = APIRouter(prefix="/customer-advances", tags=["Section 13: Customer Advance & Installment Accounting"])


def _generate_idempotency_hash(source_module: str, source_transaction_id: str, customer_id: int, amount: Decimal) -> str:
    raw = f"{source_module.upper()}:{source_transaction_id.strip()}:{customer_id}:{Decimal(amount):.2f}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def _get_or_create_advance_voucher(
    db: AsyncSession,
    advance: CustomerAdvanceInstallment,
    debit_account_code: str = "1120", # Bank Accounts
    credit_account_code: str = "2120" # Customer Advances (Booking Deposits)
) -> Optional[int]:
    """
    Illustrative Section 13.2 Accounting Treatment:
    Debit: Bank Account (1120) or Cash in Hand (1110)
    Credit: Customer Advances Liability (2120)
    """
    try:
        # Find Debit Account
        stmt_dr = select(ChartOfAccount).where(ChartOfAccount.account_code == debit_account_code)
        res_dr = await db.execute(stmt_dr)
        dr_acc = res_dr.scalar_one_or_none()

        # Find Credit Account (2120: Customer Advances)
        stmt_cr = select(ChartOfAccount).where(ChartOfAccount.account_code == credit_account_code)
        res_cr = await db.execute(stmt_cr)
        cr_acc = res_cr.scalar_one_or_none()

        if not dr_acc or not cr_acc:
            return None

        voucher_no = f"VR-ADV-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
        v = Voucher(
            organization_id=1,
            voucher_number=voucher_no,
            voucher_type="Receipt",
            voucher_date=advance.receipt_date,
            description=f"Auto-Receipt: Customer Advance ({advance.transaction_type}) from {advance.customer_name} for Project {advance.project_name}",
            total_debit=advance.gross_amount,
            total_credit=advance.gross_amount,
            status="Posted",
            project_id=advance.project_id
        )
        db.add(v)
        await db.flush()

        # Journal Line 1: Debit Bank/Cash
        je_dr = JournalEntry(
            voucher_id=v.id,
            account_id=dr_acc.id,
            debit_amount=advance.gross_amount,
            credit_amount=Decimal("0.00"),
            description=f"Debit: Bank/Cash Receipt from {advance.customer_name}"
        )
        # Journal Line 2: Credit Customer Advances Liability
        je_cr = JournalEntry(
            voucher_id=v.id,
            account_id=cr_acc.id,
            debit_amount=Decimal("0.00"),
            credit_amount=advance.gross_amount,
            description=f"Credit: Customer Advances Liability ({advance.advance_number})"
        )
        db.add_all([je_dr, je_cr])
        await db.flush()
        return v.id
    except Exception:
        return None


# ==============================================================================
# 13.1 ADVANCE & INSTALLMENT TRANSACTIONS CRUD
# ==============================================================================

@router.get("/transactions", response_model=CustomerAdvancePaginationResponse)
async def list_customer_advances(
    search: Optional[str] = None,
    project_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    accounting_status: Optional[str] = None,
    revenue_recognition_status: Optional[str] = None,
    payment_mode: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    offset: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    if offset is None:
        calc_offset = (page - 1) * limit
    else:
        calc_offset = offset

    query = select(CustomerAdvanceInstallment).options(
        selectinload(CustomerAdvanceInstallment.allocations)
    )

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                CustomerAdvanceInstallment.advance_number.ilike(s),
                CustomerAdvanceInstallment.customer_name.ilike(s),
                CustomerAdvanceInstallment.project_name.ilike(s),
                CustomerAdvanceInstallment.booking_reference_no.ilike(s),
                CustomerAdvanceInstallment.sale_agreement_no.ilike(s),
                CustomerAdvanceInstallment.source_transaction_id.ilike(s),
                CustomerAdvanceInstallment.instrument_no.ilike(s),
                CustomerAdvanceInstallment.unit_number.ilike(s)
            )
        )

    if project_id:
        query = query.where(CustomerAdvanceInstallment.project_id == project_id)
    if customer_id:
        query = query.where(CustomerAdvanceInstallment.customer_id == customer_id)
    if transaction_type and transaction_type != "ALL":
        query = query.where(CustomerAdvanceInstallment.transaction_type == transaction_type)
    if accounting_status and accounting_status != "ALL":
        query = query.where(CustomerAdvanceInstallment.accounting_status == accounting_status)
    if revenue_recognition_status and revenue_recognition_status != "ALL":
        query = query.where(CustomerAdvanceInstallment.revenue_recognition_status == revenue_recognition_status)
    if payment_mode and payment_mode != "ALL":
        query = query.where(CustomerAdvanceInstallment.payment_mode == payment_mode)

    # Count total
    count_query = select(func.count(CustomerAdvanceInstallment.id))
    if search:
        s = f"%{search.strip()}%"
        count_query = count_query.where(
            or_(
                CustomerAdvanceInstallment.advance_number.ilike(s),
                CustomerAdvanceInstallment.customer_name.ilike(s),
                CustomerAdvanceInstallment.project_name.ilike(s),
                CustomerAdvanceInstallment.booking_reference_no.ilike(s),
                CustomerAdvanceInstallment.sale_agreement_no.ilike(s),
                CustomerAdvanceInstallment.source_transaction_id.ilike(s),
                CustomerAdvanceInstallment.instrument_no.ilike(s),
                CustomerAdvanceInstallment.unit_number.ilike(s)
            )
        )
    if project_id:
        count_query = count_query.where(CustomerAdvanceInstallment.project_id == project_id)
    if customer_id:
        count_query = count_query.where(CustomerAdvanceInstallment.customer_id == customer_id)
    if transaction_type and transaction_type != "ALL":
        count_query = count_query.where(CustomerAdvanceInstallment.transaction_type == transaction_type)
    if accounting_status and accounting_status != "ALL":
        count_query = count_query.where(CustomerAdvanceInstallment.accounting_status == accounting_status)
    if revenue_recognition_status and revenue_recognition_status != "ALL":
        count_query = count_query.where(CustomerAdvanceInstallment.revenue_recognition_status == revenue_recognition_status)
    if payment_mode and payment_mode != "ALL":
        count_query = count_query.where(CustomerAdvanceInstallment.payment_mode == payment_mode)

    total_count = (await db.execute(count_query)).scalar() or 0

    # Summary aggregates
    sum_query = select(
        func.sum(CustomerAdvanceInstallment.gross_amount),
        func.sum(CustomerAdvanceInstallment.unapplied_credit_balance),
        func.sum(CustomerAdvanceInstallment.allocated_amount),
        func.sum(CustomerAdvanceInstallment.revenue_recognized_amount)
    )
    sum_res = (await db.execute(sum_query)).first()
    tot_gross = sum_res[0] or Decimal("0.00")
    tot_unapplied = sum_res[1] or Decimal("0.00")
    tot_allocated = sum_res[2] or Decimal("0.00")
    tot_rev = sum_res[3] or Decimal("0.00")

    query = query.order_by(desc(CustomerAdvanceInstallment.receipt_date), desc(CustomerAdvanceInstallment.id))
    query = query.offset(calc_offset).limit(limit)

    results = (await db.execute(query)).scalars().all()
    total_pages = (total_count + limit - 1) // limit if limit > 0 else 1

    return CustomerAdvancePaginationResponse(
        total=total_count,
        page=page,
        limit=limit,
        offset=calc_offset,
        totalPages=total_pages,
        total_gross_advances=Decimal(str(tot_gross)),
        total_unapplied_credits=Decimal(str(tot_unapplied)),
        total_allocated_installments=Decimal(str(tot_allocated)),
        total_recognized_revenue=Decimal(str(tot_rev)),
        items=results
    )


@router.get("/transactions/{id}", response_model=CustomerAdvanceInstallmentResponse)
async def get_customer_advance(id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(CustomerAdvanceInstallment).options(
        selectinload(CustomerAdvanceInstallment.allocations)
    ).where(CustomerAdvanceInstallment.id == id)
    advance = (await db.execute(stmt)).scalar_one_or_none()
    if not advance:
        raise HTTPException(status_code=404, detail="Customer advance transaction not found")
    return advance


@router.post("/transactions", response_model=CustomerAdvanceInstallmentResponse, status_code=status.HTTP_201_CREATED)
async def create_customer_advance(payload: CustomerAdvanceInstallmentCreate, db: AsyncSession = Depends(get_db)):
    # 1. Critical Idempotency Control: Ensure Booking and Installment modules cannot double-post!
    idempotency_hash = _generate_idempotency_hash(
        payload.source_module,
        payload.source_transaction_id,
        payload.customer_id,
        payload.gross_amount
    )

    stmt_check = select(CustomerAdvanceInstallment).where(CustomerAdvanceInstallment.idempotency_hash == idempotency_hash)
    existing = (await db.execute(stmt_check)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Idempotent Duplicate Blocked: Transaction '{payload.source_transaction_id}' already posted as Advance '{existing.advance_number}'"
        )

    # 2. Enrich names if omitted
    customer_name = payload.customer_name
    if not customer_name:
        cust = (await db.execute(select(Customer).where(Customer.id == payload.customer_id))).scalar_one_or_none()
        customer_name = (getattr(cust, 'full_name_en', None) or getattr(cust, 'name', None)) if cust else f"Customer #{payload.customer_id}"

    project_name = payload.project_name
    if not project_name:
        prj = (await db.execute(select(Project).where(Project.id == payload.project_id))).scalar_one_or_none()
        project_name = (getattr(prj, 'project_name', None) or getattr(prj, 'name', None)) if prj else f"Project #{payload.project_id}"

    unit_number = payload.unit_number
    if not unit_number and payload.unit_id:
        un = (await db.execute(select(Unit).where(Unit.id == payload.unit_id))).scalar_one_or_none()
        unit_number = un.unit_number if un else None

    booking_ref = payload.booking_reference_no
    agreement_no = payload.sale_agreement_no
    if payload.booking_id and not booking_ref:
        bk = (await db.execute(select(Booking).where(Booking.id == payload.booking_id))).scalar_one_or_none()
        if bk:
            booking_ref = bk.booking_reference_no
            agreement_no = agreement_no or getattr(bk, 'agreement_reference_no', f"AGR-{bk.booking_reference_no}")

    # Generate sequential advance number
    code_seq = f"ADV-{payload.receipt_date.strftime('%Y%m')}-{random.randint(1000, 9999)}"

    # Determine initial aging bucket
    days_out = (date.today() - payload.receipt_date).days if date.today() >= payload.receipt_date else 0
    if days_out <= 30:
        bucket = "CURRENT"
    elif days_out <= 60:
        bucket = "1_30_DAYS"
    elif days_out <= 90:
        bucket = "31_60_DAYS"
    elif days_out <= 120:
        bucket = "61_90_DAYS"
    else:
        bucket = "OVER_90_DAYS"

    advance = CustomerAdvanceInstallment(
        advance_number=code_seq,
        source_module=payload.source_module,
        source_transaction_id=payload.source_transaction_id,
        idempotency_hash=idempotency_hash,
        receipt_date=payload.receipt_date,
        transaction_type=payload.transaction_type,
        customer_id=payload.customer_id,
        customer_name=customer_name,
        booking_id=payload.booking_id,
        booking_reference_no=booking_ref,
        sale_agreement_no=agreement_no,
        project_id=payload.project_id,
        project_name=project_name,
        tower_id=payload.tower_id,
        unit_id=payload.unit_id,
        unit_number=unit_number,
        installment_id=payload.installment_id,
        installment_title=payload.installment_title,
        payment_mode=payload.payment_mode,
        bank_account_id=payload.bank_account_id,
        bank_name=payload.bank_name,
        instrument_no=payload.instrument_no,
        instrument_date=payload.instrument_date,
        gross_amount=payload.gross_amount,
        allocated_amount=Decimal("0.00"),
        unapplied_credit_balance=payload.gross_amount,
        revenue_recognized_amount=Decimal("0.00"),
        refunded_amount=Decimal("0.00"),
        forfeiture_amount=Decimal("0.00"),
        late_charges_assessed=Decimal("0.00"),
        late_charges_waived=Decimal("0.00"),
        accounting_status="ADVANCE_RECORDED",
        revenue_recognition_status="UNEARNED_LIABILITY",
        aging_bucket=bucket,
        days_outstanding=max(0, days_out),
        reconciliation_status="RECONCILED",
        notes=payload.notes
    )
    db.add(advance)
    await db.flush()

    # 3. Post Illustrative GL Voucher (Debit Bank/Cash, Credit Customer Advances 2120)
    debit_code = "1110" if payload.payment_mode == "CASH" else "1120"
    v_id = await _get_or_create_advance_voucher(db, advance, debit_account_code=debit_code, credit_account_code="2120")
    if v_id:
        advance.gl_voucher_id = v_id

    # If linked directly to an installment with specific demand, auto-allocate
    if payload.installment_id:
        inst = (await db.execute(select(CustomerInstallment).where(CustomerInstallment.id == payload.installment_id))).scalar_one_or_none()
        if inst:
            alloc_amt = min(payload.gross_amount, inst.balance_due if inst.balance_due > 0 else inst.payable_amount)
            if alloc_amt > 0:
                alloc = CustomerAdvanceAllocation(
                    advance_id=advance.id,
                    installment_id=inst.id,
                    unit_id=advance.unit_id,
                    allocated_amount=alloc_amt,
                    allocation_date=advance.receipt_date,
                    allocation_type="INSTALLMENT_DEMAND",
                    notes=f"Auto-allocated to {inst.title}"
                )
                db.add(alloc)
                advance.allocated_amount += alloc_amt
                advance.unapplied_credit_balance -= alloc_amt
                if advance.unapplied_credit_balance <= Decimal("0.00"):
                    advance.accounting_status = "FULLY_ALLOCATED"
                else:
                    advance.accounting_status = "PARTIALLY_ALLOCATED"

                inst.paid_amount = (inst.paid_amount or Decimal("0.00")) + alloc_amt
                inst.balance_due = max(Decimal("0.00"), inst.payable_amount - inst.paid_amount)
                if inst.balance_due <= Decimal("0.00"):
                    inst.status = "PAID"
                else:
                    inst.status = "PARTIALLY_PAID"

    await db.commit()
    await db.refresh(advance)

    stmt_re = select(CustomerAdvanceInstallment).options(
        selectinload(CustomerAdvanceInstallment.allocations)
    ).where(CustomerAdvanceInstallment.id == advance.id)
    return (await db.execute(stmt_re)).scalar_one()


@router.put("/transactions/{id}", response_model=CustomerAdvanceInstallmentResponse)
async def update_customer_advance(id: int, payload: CustomerAdvanceInstallmentUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(CustomerAdvanceInstallment).options(
        selectinload(CustomerAdvanceInstallment.allocations)
    ).where(CustomerAdvanceInstallment.id == id)
    advance = (await db.execute(stmt)).scalar_one_or_none()
    if not advance:
        raise HTTPException(status_code=404, detail="Customer advance transaction not found")

    if payload.transaction_type:
        advance.transaction_type = payload.transaction_type
    if payload.payment_mode:
        advance.payment_mode = payload.payment_mode
    if payload.bank_account_id is not None:
        advance.bank_account_id = payload.bank_account_id
    if payload.bank_name is not None:
        advance.bank_name = payload.bank_name
    if payload.instrument_no is not None:
        advance.instrument_no = payload.instrument_no
    if payload.instrument_date is not None:
        advance.instrument_date = payload.instrument_date
    if payload.notes is not None:
        advance.notes = payload.notes

    await db.commit()
    await db.refresh(advance)
    return advance


@router.delete("/transactions/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer_advance(id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(CustomerAdvanceInstallment).options(
        selectinload(CustomerAdvanceInstallment.allocations)
    ).where(CustomerAdvanceInstallment.id == id)
    advance = (await db.execute(stmt)).scalar_one_or_none()
    if not advance:
        raise HTTPException(status_code=404, detail="Customer advance transaction not found")

    if advance.revenue_recognized_amount > 0:
        raise HTTPException(status_code=400, detail="Cannot delete advance with recognized revenue under IFRS 15.")

    await db.delete(advance)
    await db.commit()
    return None


# ==============================================================================
# 13.1.4 PAYMENT ALLOCATION BY UNIT & INSTALLMENT
# ==============================================================================

@router.post("/allocate", response_model=CustomerAdvanceAllocationResponse)
async def allocate_customer_advance(payload: CustomerAdvanceAllocationCreate, db: AsyncSession = Depends(get_db)):
    stmt = select(CustomerAdvanceInstallment).where(CustomerAdvanceInstallment.id == payload.advance_id)
    advance = (await db.execute(stmt)).scalar_one_or_none()
    if not advance:
        raise HTTPException(status_code=404, detail="Customer advance transaction not found")

    if payload.allocated_amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Allocated amount must be greater than zero")

    if payload.allocated_amount > advance.unapplied_credit_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Allocation amount (৳{payload.allocated_amount}) exceeds unapplied balance (৳{advance.unapplied_credit_balance})"
        )

    alloc_date = payload.allocation_date or date.today()
    alloc = CustomerAdvanceAllocation(
        advance_id=advance.id,
        installment_id=payload.installment_id,
        unit_id=payload.unit_id or advance.unit_id,
        allocated_amount=payload.allocated_amount,
        allocation_date=alloc_date,
        allocation_type=payload.allocation_type,
        notes=payload.notes
    )
    db.add(alloc)

    advance.allocated_amount += payload.allocated_amount
    advance.unapplied_credit_balance -= payload.allocated_amount
    if advance.unapplied_credit_balance <= Decimal("0.00"):
        advance.accounting_status = "FULLY_ALLOCATED"
    else:
        advance.accounting_status = "PARTIALLY_ALLOCATED"

    # If mapped to installment, update installment balance
    if payload.installment_id:
        inst = (await db.execute(select(CustomerInstallment).where(CustomerInstallment.id == payload.installment_id))).scalar_one_or_none()
        if inst:
            inst.paid_amount = (inst.paid_amount or Decimal("0.00")) + payload.allocated_amount
            inst.balance_due = max(Decimal("0.00"), inst.payable_amount - inst.paid_amount)
            if inst.balance_due <= Decimal("0.00"):
                inst.status = "PAID"
            else:
                inst.status = "PARTIALLY_PAID"

    # Post Clearing Voucher: Debit Customer Advances (2120), Credit Accounts Receivable (1130 or 1020)
    try:
        stmt_cr = select(ChartOfAccount).where(ChartOfAccount.account_code == "1130") # Accounts Receivable
        res_cr = await db.execute(stmt_cr)
        cr_acc = res_cr.scalar_one_or_none()

        stmt_dr = select(ChartOfAccount).where(ChartOfAccount.account_code == "2120") # Customer Advances
        res_dr = await db.execute(stmt_dr)
        dr_acc = res_dr.scalar_one_or_none()

        if cr_acc and dr_acc:
            voucher_no = f"VR-CLR-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
            v = Voucher(
                organization_id=1,
                voucher_number=voucher_no,
                voucher_type="Journal",
                voucher_date=alloc_date,
                description=f"Advance Clearing: Transfer ৳{payload.allocated_amount} from Advances (2120) to AR (1130) for {advance.customer_name}",
                total_debit=payload.allocated_amount,
                total_credit=payload.allocated_amount,
                status="Posted",
                project_id=advance.project_id
            )
            db.add(v)
            await db.flush()

            je_dr = JournalEntry(
                voucher_id=v.id,
                account_id=dr_acc.id,
                debit_amount=payload.allocated_amount,
                credit_amount=Decimal("0.00"),
                description=f"Debit: Customer Advances Liability Cleared"
            )
            je_cr = JournalEntry(
                voucher_id=v.id,
                account_id=cr_acc.id,
                debit_amount=Decimal("0.00"),
                credit_amount=payload.allocated_amount,
                description=f"Credit: Accounts Receivable Cleared against Demand"
            )
            db.add_all([je_dr, je_cr])
            alloc.gl_clearing_voucher_id = v.id
    except Exception:
        pass

    await db.commit()
    await db.refresh(alloc)
    return alloc


# ==============================================================================
# 13.2 REVENUE RECOGNITION TRANSFER (IFRS 15)
# ==============================================================================

@router.post("/recognize-revenue", response_model=CustomerAdvanceInstallmentResponse)
async def recognize_advance_revenue(payload: CustomerAdvanceRevenueRecognizeRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(CustomerAdvanceInstallment).options(
        selectinload(CustomerAdvanceInstallment.allocations)
    ).where(CustomerAdvanceInstallment.id == payload.advance_id)
    advance = (await db.execute(stmt)).scalar_one_or_none()
    if not advance:
        raise HTTPException(status_code=404, detail="Customer advance transaction not found")

    if payload.recognized_amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Recognized amount must be greater than zero")

    rem_unrecognized = advance.gross_amount - advance.revenue_recognized_amount
    if payload.recognized_amount > rem_unrecognized:
        raise HTTPException(
            status_code=400,
            detail=f"Recognized amount (৳{payload.recognized_amount}) exceeds remaining unearned balance (৳{rem_unrecognized})"
        )

    advance.revenue_recognized_amount += payload.recognized_amount
    if advance.revenue_recognized_amount >= advance.gross_amount:
        advance.revenue_recognition_status = "TRANSFERRED_TO_REVENUE"
    else:
        advance.revenue_recognition_status = "POC_ELIGIBLE"

    # Post IFRS 15 Voucher: Debit Customer Advances (2120), Credit Property Sales Revenue (4010)
    try:
        stmt_dr = select(ChartOfAccount).where(ChartOfAccount.account_code == "2120") # Customer Advances
        dr_acc = (await db.execute(stmt_dr)).scalar_one_or_none()

        stmt_cr = select(ChartOfAccount).where(ChartOfAccount.account_code == "4010") # Apartment Sales Revenue
        cr_acc = (await db.execute(stmt_cr)).scalar_one_or_none()

        if dr_acc and cr_acc:
            voucher_no = f"VR-REV-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
            v = Voucher(
                organization_id=1,
                voucher_number=voucher_no,
                voucher_type="Journal",
                voucher_date=date.today(),
                description=f"IFRS 15 Revenue Recognition: ৳{payload.recognized_amount} transferred from Advances to Revenue for {advance.customer_name} ({payload.recognition_policy})",
                total_debit=payload.recognized_amount,
                total_credit=payload.recognized_amount,
                status="Posted",
                project_id=advance.project_id
            )
            db.add(v)
            await db.flush()

            je_dr = JournalEntry(
                voucher_id=v.id,
                account_id=dr_acc.id,
                debit_amount=payload.recognized_amount,
                credit_amount=Decimal("0.00"),
                description=f"Debit: Customer Advances Liability Transferred to Revenue"
            )
            je_cr = JournalEntry(
                voucher_id=v.id,
                account_id=cr_acc.id,
                debit_amount=Decimal("0.00"),
                credit_amount=payload.recognized_amount,
                description=f"Credit: Sales Revenue Recognized ({payload.recognition_policy})"
            )
            db.add_all([je_dr, je_cr])
            advance.revenue_transfer_voucher_id = v.id
    except Exception:
        pass

    await db.commit()
    await db.refresh(advance)
    return advance


# ==============================================================================
# 13.1.7 CANCELLATION & REFUND ACCOUNTING
# ==============================================================================

@router.post("/process-refund", response_model=CustomerAdvanceInstallmentResponse)
async def process_cancellation_refund(payload: CustomerAdvanceRefundRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(CustomerAdvanceInstallment).options(
        selectinload(CustomerAdvanceInstallment.allocations)
    ).where(CustomerAdvanceInstallment.id == payload.advance_id)
    advance = (await db.execute(stmt)).scalar_one_or_none()
    if not advance:
        raise HTTPException(status_code=404, detail="Customer advance transaction not found")

    total_settlement = payload.refund_amount + payload.forfeiture_amount
    if total_settlement > advance.unapplied_credit_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Refund + Forfeiture (৳{total_settlement}) exceeds unapplied balance (৳{advance.unapplied_credit_balance})"
        )

    advance.refunded_amount += payload.refund_amount
    advance.forfeiture_amount += payload.forfeiture_amount
    advance.unapplied_credit_balance -= total_settlement
    advance.accounting_status = "REFUNDED_CANCELLED"

    # Post Cancellation & Refund Voucher
    try:
        stmt_dr = select(ChartOfAccount).where(ChartOfAccount.account_code == "2120") # Customer Advances
        dr_acc = (await db.execute(stmt_dr)).scalar_one_or_none()

        stmt_bank = select(ChartOfAccount).where(ChartOfAccount.account_code == "1120") # Bank
        bank_acc = (await db.execute(stmt_bank)).scalar_one_or_none()

        stmt_forfeit = select(ChartOfAccount).where(ChartOfAccount.account_code == "4040") # Cancellation Forfeiture Income
        forfeit_acc = (await db.execute(stmt_forfeit)).scalar_one_or_none()

        if dr_acc and bank_acc:
            voucher_no = f"VR-RFD-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
            v = Voucher(
                organization_id=1,
                voucher_number=voucher_no,
                voucher_type="Payment",
                voucher_date=date.today(),
                description=f"Booking Cancellation Settlement: Refund ৳{payload.refund_amount}, Forfeiture ৳{payload.forfeiture_amount} for {advance.customer_name}. Reason: {payload.reason}",
                total_debit=total_settlement,
                total_credit=total_settlement,
                status="Posted",
                project_id=advance.project_id
            )
            db.add(v)
            await db.flush()

            # Debit: Customer Advances Liability
            je_dr = JournalEntry(
                voucher_id=v.id,
                account_id=dr_acc.id,
                debit_amount=total_settlement,
                credit_amount=Decimal("0.00"),
                description=f"Debit: Customer Advances Liability Reversed"
            )
            lines = [je_dr]

            # Credit: Bank Account for actual refunded cash
            if payload.refund_amount > Decimal("0.00"):
                je_cr_bank = JournalEntry(
                    voucher_id=v.id,
                    account_id=bank_acc.id,
                    debit_amount=Decimal("0.00"),
                    credit_amount=payload.refund_amount,
                    description=f"Credit: Bank Disbursement to Buyer"
                )
                lines.append(je_cr_bank)

            # Credit: Cancellation Forfeiture Income
            if payload.forfeiture_amount > Decimal("0.00") and forfeit_acc:
                je_cr_forfeit = JournalEntry(
                    voucher_id=v.id,
                    account_id=forfeit_acc.id,
                    debit_amount=Decimal("0.00"),
                    credit_amount=payload.forfeiture_amount,
                    description=f"Credit: Cancellation Earnest Money Forfeited"
                )
                lines.append(je_cr_forfeit)

            db.add_all(lines)
            advance.refund_voucher_id = v.id
    except Exception:
        pass

    await db.commit()
    await db.refresh(advance)
    return advance


# ==============================================================================
# 13.1.6 LATE CHARGES & APPROVED ADJUSTMENTS
# ==============================================================================

@router.post("/adjust-late-charges", response_model=CustomerAdvanceInstallmentResponse)
async def adjust_late_charges(payload: CustomerAdvanceLateChargeAdjustRequest, db: AsyncSession = Depends(get_db)):
    if payload.advance_id:
        stmt = select(CustomerAdvanceInstallment).where(CustomerAdvanceInstallment.id == payload.advance_id)
        advance = (await db.execute(stmt)).scalar_one_or_none()
    else:
        # Find latest advance for this customer & booking
        stmt = select(CustomerAdvanceInstallment).where(
            CustomerAdvanceInstallment.booking_id == payload.booking_id,
            CustomerAdvanceInstallment.customer_id == payload.customer_id
        ).order_by(desc(CustomerAdvanceInstallment.id)).limit(1)
        advance = (await db.execute(stmt)).scalar_one_or_none()

    if not advance:
        raise HTTPException(status_code=404, detail="No active advance account found for this customer and booking")

    if payload.adjustment_type == "LATE_CHARGE_ASSESSMENT":
        advance.late_charges_assessed += payload.amount
    else:
        advance.late_charges_waived += payload.amount

    advance.notes = f"{advance.notes or ''}\n[{date.today()}] {payload.adjustment_type}: ৳{payload.amount}. Reason: {payload.reason} (Ref: {payload.approval_reference or 'MGMT-APPR'})"
    await db.commit()
    await db.refresh(advance)
    return advance


# ==============================================================================
# 13.1.4 CUSTOMER ADVANCE & LIABILITY LEDGER
# ==============================================================================

@router.get("/ledger", response_model=CustomerLiabilityLedgerSummaryResponse)
async def get_customer_liability_ledger(
    search: Optional[str] = None,
    project_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(
        CustomerAdvanceInstallment.customer_id,
        CustomerAdvanceInstallment.customer_name,
        func.count(CustomerAdvanceInstallment.id).label("tx_count"),
        func.sum(CustomerAdvanceInstallment.gross_amount).label("tot_gross"),
        func.sum(CustomerAdvanceInstallment.allocated_amount).label("tot_allocated"),
        func.sum(CustomerAdvanceInstallment.unapplied_credit_balance).label("tot_unapplied"),
        func.sum(CustomerAdvanceInstallment.revenue_recognized_amount).label("tot_revenue"),
        func.sum(CustomerAdvanceInstallment.refunded_amount).label("tot_refunded"),
        func.max(CustomerAdvanceInstallment.receipt_date).label("latest_date")
    ).group_by(
        CustomerAdvanceInstallment.customer_id,
        CustomerAdvanceInstallment.customer_name
    )

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                CustomerAdvanceInstallment.customer_name.ilike(s),
                CustomerAdvanceInstallment.booking_reference_no.ilike(s),
                CustomerAdvanceInstallment.sale_agreement_no.ilike(s)
            )
        )
    if project_id:
        query = query.where(CustomerAdvanceInstallment.project_id == project_id)

    rows = (await db.execute(query)).all()

    # Collect agreements and projects per customer
    items = []
    tot_gross_all = Decimal("0.00")
    tot_unapplied_all = Decimal("0.00")
    tot_rev_all = Decimal("0.00")
    tot_alloc_all = Decimal("0.00")

    for r in rows:
        cid = r[0]
        cname = r[1]
        t_gross = r[3] or Decimal("0.00")
        t_alloc = r[4] or Decimal("0.00")
        t_unapplied = r[5] or Decimal("0.00")
        t_rev = r[6] or Decimal("0.00")
        t_ref = r[7] or Decimal("0.00")
        l_date = r[8]

        tot_gross_all += t_gross
        tot_alloc_all += t_alloc
        tot_unapplied_all += t_unapplied
        tot_rev_all += t_rev

        # Distinct agreements & projects for this customer
        stmt_meta = select(
            CustomerAdvanceInstallment.sale_agreement_no,
            CustomerAdvanceInstallment.project_name
        ).where(CustomerAdvanceInstallment.customer_id == cid).distinct()
        meta_res = (await db.execute(stmt_meta)).all()
        agreements = list(set([m[0] for m in meta_res if m[0]]))
        projects = list(set([m[1] for m in meta_res if m[1]]))

        items.append(CustomerLiabilityLedgerItem(
            customer_id=cid,
            customer_name=cname,
            customer_code=f"CUST-{cid:04d}",
            booking_count=r[2],
            total_advances_received=Decimal(str(t_gross)),
            total_allocated_to_installments=Decimal(str(t_alloc)),
            total_unapplied_credit_balance=Decimal(str(t_unapplied)),
            total_recognized_revenue=Decimal(str(t_rev)),
            total_refunded=Decimal(str(t_ref)),
            latest_receipt_date=l_date,
            sale_agreements=agreements,
            projects=projects
        ))

    return CustomerLiabilityLedgerSummaryResponse(
        total_customers=len(items),
        total_gross_advances=tot_gross_all,
        total_unapplied_credits=tot_unapplied_all,
        total_recognized_revenue=tot_rev_all,
        total_allocated_installments=tot_alloc_all,
        customers=items
    )


# ==============================================================================
# 13.1.10 RECEIVABLE AGING & COLLECTION RECONCILIATION
# ==============================================================================

@router.get("/aging-reconciliation", response_model=ReceivableAgingReconciliationResponse)
async def get_receivable_aging_reconciliation(
    project_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    # Total Unapplied Customer Advances across active contracts
    stmt_adv = select(func.sum(CustomerAdvanceInstallment.unapplied_credit_balance))
    if project_id:
        stmt_adv = stmt_adv.where(CustomerAdvanceInstallment.project_id == project_id)
    tot_unapplied = (await db.execute(stmt_adv)).scalar() or Decimal("0.00")

    # Installment Demands from sls_customer_installments
    stmt_inst = select(CustomerInstallment)
    if project_id:
        stmt_inst = stmt_inst.join(Booking, CustomerInstallment.booking_id == Booking.id).where(Booking.project_id == project_id)
    installments = (await db.execute(stmt_inst)).scalars().all()

    bucket_data = {
        "Current (Not Due)": {"demands": Decimal("0.00"), "count": 0},
        "1-30 Days Overdue": {"demands": Decimal("0.00"), "count": 0},
        "31-60 Days Overdue": {"demands": Decimal("0.00"), "count": 0},
        "61-90 Days Overdue": {"demands": Decimal("0.00"), "count": 0},
        "Over 90 Days Overdue": {"demands": Decimal("0.00"), "count": 0}
    }

    today = date.today()
    total_demands = Decimal("0.00")

    for inst in installments:
        bal = inst.balance_due if inst.balance_due > 0 else (inst.payable_amount - (inst.paid_amount or 0))
        if bal <= 0:
            continue
        total_demands += Decimal(str(bal))

        days_over = (today - inst.due_date).days if inst.due_date and today > inst.due_date else 0
        if days_over <= 0:
            b_key = "Current (Not Due)"
        elif days_over <= 30:
            b_key = "1-30 Days Overdue"
        elif days_over <= 60:
            b_key = "31-60 Days Overdue"
        elif days_over <= 90:
            b_key = "61-90 Days Overdue"
        else:
            b_key = "Over 90 Days Overdue"

        bucket_data[b_key]["demands"] += Decimal(str(bal))
        bucket_data[b_key]["count"] += 1

    # Water-fall coverage by unapplied advances
    rem_coverage = Decimal(str(tot_unapplied))
    bucket_items = []

    for b_name, b_vals in bucket_data.items():
        dem = b_vals["demands"]
        cov = min(rem_coverage, dem)
        rem_coverage -= cov
        net_exp = max(Decimal("0.00"), dem - cov)

        bucket_items.append(ReceivableAgingBucketItem(
            bucket_name=b_name,
            receivable_demand_amount=dem,
            customer_advance_coverage_amount=cov,
            net_exposure_amount=net_exp,
            item_count=b_vals["count"]
        ))

    net_uncovered = max(Decimal("0.00"), total_demands - Decimal(str(tot_unapplied)))
    reconcil_ratio = (Decimal(str(tot_unapplied)) / total_demands * 100) if total_demands > 0 else Decimal("100.00")

    return ReceivableAgingReconciliationResponse(
        total_receivable_demands=total_demands,
        total_unapplied_advances=Decimal(str(tot_unapplied)),
        net_uncovered_receivables=net_uncovered,
        reconciliation_ratio_pct=round(reconcil_ratio, 2),
        buckets=bucket_items,
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )


# ==============================================================================
# DEMO DATA SEEDER FOR SECTION 13
# ==============================================================================

@router.post("/seed-demo-data")
async def seed_customer_advance_demo_data(target_count: int = Query(45, ge=10, le=200), db: AsyncSession = Depends(get_db)):
    """
    Populates comprehensive Section 13 demo records for 20+ projects, linking customers,
    bookings, units, installments, and posting double-entry vouchers.
    """
    projects = (await db.execute(select(Project).limit(30))).scalars().all()
    customers = (await db.execute(select(Customer).limit(50))).scalars().all()
    bookings = (await db.execute(select(Booking).limit(40))).scalars().all()

    if not projects or not customers:
        return {"success": False, "message": "Projects or Customers must be populated first."}

    modes = ["BANK_TRANSFER", "CHEQUE", "CASH", "MFS_BKASH", "MFS_NAGAD"]
    tx_types = [
        "BOOKING_MONEY", "DOWN_PAYMENT", "INSTALLMENT_ADVANCE", "INTERIM_COLLECTION",
        "BOOKING_MONEY", "DOWN_PAYMENT", "INSTALLMENT_ADVANCE"
    ]
    bank_names = [
        "Eastern Bank PLC", "City Bank PLC", "BRAC Bank PLC", "Dutch-Bangla Bank PLC",
        "Standard Chartered Bangladesh", "Mutual Trust Bank PLC", "Islami Bank Bangladesh PLC"
    ]

    created_count = 0
    today = date.today()

    for i in range(target_count):
        prj = random.choice(projects)
        cust = random.choice(customers)
        bk = random.choice(bookings) if bookings else None
        t_type = random.choice(tx_types)
        mode = random.choice(modes)

        if t_type == "BOOKING_MONEY":
            amt = Decimal(random.randint(200000, 1000000))
        elif t_type == "DOWN_PAYMENT":
            amt = Decimal(random.randint(1500000, 5000000))
        else:
            amt = Decimal(random.randint(300000, 1800000))

        days_ago = random.randint(1, 150)
        rx_date = today - timedelta(days=days_ago)
        source_id = f"SRC-TX-{rx_date.strftime('%Y%m')}-{random.randint(10000, 99999)}"

        idemp_hash = _generate_idempotency_hash("BOOKING" if t_type in ["BOOKING_MONEY", "DOWN_PAYMENT"] else "INSTALLMENTS", source_id, cust.id, amt)

        # Check existing
        stmt_e = select(CustomerAdvanceInstallment).where(CustomerAdvanceInstallment.idempotency_hash == idemp_hash)
        if (await db.execute(stmt_e)).scalar_one_or_none():
            continue

        bk_ref = bk.booking_reference_no if bk else f"BK-{prj.id:02d}-{random.randint(100, 999)}"
        agr_ref = getattr(bk, 'agreement_reference_no', f"AGR-{bk_ref}")
        unit_no = f"{random.choice(['A', 'B', 'C', 'D'])}-{random.randint(3, 16)}"

        if days_ago <= 30:
            bucket = "CURRENT"
        elif days_ago <= 60:
            bucket = "1_30_DAYS"
        elif days_ago <= 90:
            bucket = "31_60_DAYS"
        elif days_ago <= 120:
            bucket = "61_90_DAYS"
        else:
            bucket = "OVER_90_DAYS"

        # Determine allocated and recognized portions
        is_allocated = random.choice([True, False, True])
        alloc_amt = Decimal("0.00")
        unapplied = amt
        status_acc = "ADVANCE_RECORDED"
        rev_status = "UNEARNED_LIABILITY"
        rev_amt = Decimal("0.00")

        if is_allocated:
            alloc_amt = amt if random.choice([True, False]) else amt * Decimal("0.60")
            unapplied = amt - alloc_amt
            status_acc = "FULLY_ALLOCATED" if unapplied <= 0 else "PARTIALLY_ALLOCATED"

            if days_ago > 60 and random.choice([True, False]):
                rev_amt = alloc_amt * Decimal("0.80")
                rev_status = "POC_ELIGIBLE" if rev_amt < amt else "TRANSFERRED_TO_REVENUE"

        prj_name = getattr(prj, 'project_name', None) or getattr(prj, 'name', f"Project {prj.id}")
        advance = CustomerAdvanceInstallment(
            advance_number=f"ADV-{rx_date.strftime('%Y%m')}-{random.randint(1000, 9999)}",
            source_module="BOOKING" if t_type in ["BOOKING_MONEY", "DOWN_PAYMENT"] else "INSTALLMENTS",
            source_transaction_id=source_id,
            idempotency_hash=idemp_hash,
            receipt_date=rx_date,
            transaction_type=t_type,
            customer_id=cust.id,
            customer_name=getattr(cust, 'full_name_en', None) or getattr(cust, 'name', f"Customer {cust.id}"),
            booking_id=bk.id if bk else None,
            booking_reference_no=bk_ref,
            sale_agreement_no=agr_ref,
            project_id=prj.id,
            project_name=prj_name,
            tower_id=None,
            unit_id=None,
            unit_number=unit_no,
            installment_id=None,
            installment_title=f"Milestone Installment #{random.randint(1, 12)}",
            payment_mode=mode,
            bank_account_id=3 if mode != "CASH" else None,
            bank_name=random.choice(bank_names) if mode != "CASH" else "Cash Counter - Head Office",
            instrument_no=f"CHQ-{random.randint(100000, 999999)}" if mode == "CHEQUE" else (f"TXN-{random.randint(10000000, 99999999)}" if mode != "CASH" else None),
            instrument_date=rx_date,
            gross_amount=amt,
            allocated_amount=alloc_amt,
            unapplied_credit_balance=unapplied,
            revenue_recognized_amount=rev_amt,
            refunded_amount=Decimal("0.00"),
            forfeiture_amount=Decimal("0.00"),
            late_charges_assessed=Decimal(random.choice([0, 0, 5000, 12500])),
            late_charges_waived=Decimal("0.00"),
            accounting_status=status_acc,
            revenue_recognition_status=rev_status,
            aging_bucket=bucket,
            days_outstanding=days_ago,
            reconciliation_status="RECONCILED",
            notes=f"Customer Advance deposit for {prj_name} - Unit {unit_no}"
        )
        db.add(advance)
        await db.flush()

        # Add allocation line if allocated
        if alloc_amt > Decimal("0.00"):
            alloc = CustomerAdvanceAllocation(
                advance_id=advance.id,
                installment_id=None,
                unit_id=None,
                allocated_amount=alloc_amt,
                allocation_date=rx_date + timedelta(days=2),
                allocation_type="INSTALLMENT_DEMAND",
                notes=f"Demand cleared for agreement {agr_ref}"
            )
            db.add(alloc)

        # Post illustrative voucher
        v_id = await _get_or_create_advance_voucher(
            db,
            advance,
            debit_account_code="1110" if mode == "CASH" else "1120",
            credit_account_code="2120"
        )
        if v_id:
            advance.gl_voucher_id = v_id

        created_count += 1

    await db.commit()
    return {
        "success": True,
        "message": f"Successfully seeded {created_count} Customer Advance & Installment Accounting transactions.",
        "created_count": created_count
    }
