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
from app.modules.projects.models import Project
from app.modules.accounts.models import (
    ChartOfAccount, Voucher, JournalEntry,
    Loan, LoanDisbursement, LoanRepayment, LoanInterestAccrual
)
from app.modules.accounts.schemas import (
    LoanCreate,
    LoanUpdate,
    LoanResponse,
    LoanListResponse,
    LoanDisbursementCreate,
    LoanDisbursementItem,
    LoanRepaymentCreate,
    LoanRepaymentItem,
    LoanInterestAccrualCreate,
    LoanInterestAccrualItem,
    LoanIAS23CapitalizeRequest,
    LoanPortfolioKPIsResponse
)

router = APIRouter(prefix="/loans", tags=["Section 14: Loans, Interest & Financing"])


async def _create_gl_voucher(
    db: AsyncSession,
    voucher_type: str,
    voucher_date: date,
    reference_no: str,
    narration: str,
    project_id: Optional[int],
    entries: List[dict] # [{"account_code": str, "debit": Decimal, "credit": Decimal, "description": str}]
) -> Optional[int]:
    """Helper to generate double-entry General Ledger vouchers."""
    try:
        # Check if voucher already exists for reference
        stmt_check = select(Voucher).where(Voucher.voucher_number == reference_no)
        res_check = await db.execute(stmt_check)
        existing = res_check.scalar_one_or_none()
        if existing:
            return existing.id

        total_dr = sum(e["debit"] for e in entries)
        total_cr = sum(e["credit"] for e in entries)

        voucher = Voucher(
            organization_id=1,
            voucher_number=reference_no,
            voucher_type="Journal" if voucher_type.upper() == "JOURNAL" else "Bank_Payment",
            voucher_date=voucher_date,
            total_debit_amount=total_dr,
            total_credit_amount=total_cr,
            narration=narration,
            status="Posted",
            project_id=project_id,
            posted_at=datetime.utcnow()
        )
        db.add(voucher)
        await db.flush()

        for idx, ent in enumerate(entries, start=1):
            stmt_acc = select(ChartOfAccount).where(ChartOfAccount.account_code == ent["account_code"])
            res_acc = await db.execute(stmt_acc)
            acc = res_acc.scalar_one_or_none()
            if not acc:
                # Fallback to root or first account if specific code not found
                stmt_acc2 = select(ChartOfAccount).limit(1)
                res_acc2 = await db.execute(stmt_acc2)
                acc = res_acc2.scalar_one_or_none()

            journal_entry = JournalEntry(
                voucher_id=voucher.id,
                voucher_date=voucher_date,
                company_id=1,
                account_id=acc.id if acc else 1,
                debit_amount=ent["debit"],
                credit_amount=ent["credit"],
                narration=ent.get("description", narration)[:250],
                project_id=project_id
            )
            db.add(journal_entry)

        await db.flush()
        return voucher.id
    except Exception as e:
        print(f"Error creating GL Voucher: {e}")
        return None


async def _recalculate_loan_balances(db: AsyncSession, loan_id: int):
    """Calculates current vs non-current portions and outstanding principal safely using async queries."""
    # Sum disbursements
    disb_stmt = select(
        func.coalesce(func.sum(LoanDisbursement.gross_amount), Decimal("0.00")),
        func.coalesce(func.sum(LoanDisbursement.processing_fee_deducted), Decimal("0.00"))
    ).where(LoanDisbursement.loan_id == loan_id)
    disb_res = await db.execute(disb_stmt)
    disbursed, fees = disb_res.one()

    # Sum repayments
    rep_stmt = select(
        func.coalesce(func.sum(LoanRepayment.principal_component), Decimal("0.00")),
        func.coalesce(func.sum(LoanRepayment.interest_component), Decimal("0.00"))
    ).where(LoanRepayment.loan_id == loan_id)
    rep_res = await db.execute(rep_stmt)
    principal_paid, interest_paid = rep_res.one()

    # Sum accruals
    acc_stmt = select(
        func.coalesce(func.sum(LoanInterestAccrual.interest_accrued_amount), Decimal("0.00"))
    ).where(LoanInterestAccrual.loan_id == loan_id)
    acc_res = await db.execute(acc_stmt)
    interest_accrued = acc_res.scalar() or Decimal("0.00")

    # Sum capitalized CWIP
    cap_stmt = select(
        func.coalesce(func.sum(LoanInterestAccrual.interest_accrued_amount), Decimal("0.00"))
    ).where(LoanInterestAccrual.loan_id == loan_id, LoanInterestAccrual.is_capitalized_to_cwip == True)
    cap_res = await db.execute(cap_stmt)
    capitalized_cwip = cap_res.scalar() or Decimal("0.00")

    loan_stmt = select(Loan).where(Loan.id == loan_id)
    loan_res = await db.execute(loan_stmt)
    loan = loan_res.scalar_one_or_none()
    if not loan:
        return

    disbursed_dec = Decimal(disbursed)
    principal_paid_dec = Decimal(principal_paid)
    outstanding = max(Decimal("0.00"), disbursed_dec - principal_paid_dec)
    
    if loan.tenure_months and loan.tenure_months > 0:
        monthly_rate = disbursed_dec / Decimal(loan.tenure_months)
        current_12m = min(outstanding, monthly_rate * Decimal(12))
        non_current = max(Decimal("0.00"), outstanding - current_12m)
    else:
        current_12m = outstanding
        non_current = Decimal("0.00")

    loan.total_disbursed_amount = disbursed
    loan.total_principal_repaid = principal_paid
    loan.principal_outstanding = outstanding
    loan.current_portion_outstanding = current_12m
    loan.non_current_portion = non_current
    loan.total_interest_accrued = interest_accrued
    loan.total_interest_paid = interest_paid
    loan.total_interest_capitalized_cwip = capitalized_cwip
    loan.processing_fees_paid = fees
    await db.flush()



@router.get("/summary/kpis", response_model=LoanPortfolioKPIsResponse)
async def get_loan_portfolio_kpis(db: AsyncSession = Depends(get_db)):
    """Summary metrics of entire debt/loan portfolio."""
    stmt = select(Loan)
    res = await db.execute(stmt)
    loans = res.scalars().all()

    total_facilities = len(loans)
    active_loans = len([l for l in loans if l.status == "ACTIVE"])
    total_approved = sum(Decimal(l.approved_facility_amount or 0) for l in loans)
    total_disbursed = sum(Decimal(l.total_disbursed_amount or 0) for l in loans)
    total_repaid = sum(Decimal(l.total_principal_repaid or 0) for l in loans)
    total_outstanding = sum(Decimal(l.principal_outstanding or 0) for l in loans)
    current_portion = sum(Decimal(l.current_portion_outstanding or 0) for l in loans)
    non_current_portion = sum(Decimal(l.non_current_portion or 0) for l in loans)
    total_accrued = sum(Decimal(l.total_interest_accrued or 0) for l in loans)
    total_interest_paid = sum(Decimal(l.total_interest_paid or 0) for l in loans)
    total_cwip_cap = sum(Decimal(l.total_interest_capitalized_cwip or 0) for l in loans)
    total_fees = sum(Decimal(l.processing_fees_paid or 0) for l in loans)

    utilization_pct = (total_disbursed / total_approved * 100) if total_approved > 0 else Decimal(0)
    repayment_pct = (total_repaid / total_disbursed * 100) if total_disbursed > 0 else Decimal(0)

    return LoanPortfolioKPIsResponse(
        total_facilities_count=total_facilities,
        active_loans_count=active_loans,
        total_approved_limit=total_approved,
        total_disbursed=total_disbursed,
        total_principal_repaid=total_repaid,
        total_principal_outstanding=total_outstanding,
        current_portion_liability=current_portion,
        non_current_portion_liability=non_current_portion,
        total_interest_accrued=total_accrued,
        total_interest_paid=total_interest_paid,
        total_interest_capitalized_cwip=total_cwip_cap,
        total_processing_fees=total_fees,
        utilization_pct=round(utilization_pct, 2),
        repayment_pct=round(repayment_pct, 2)
    )


@router.get("", response_model=LoanListResponse)
async def list_loans(
    search: Optional[str] = None,
    status: Optional[str] = None,
    facility_type: Optional[str] = None,
    project_id: Optional[int] = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List all loans with paging, filtering, and eager-loaded relations."""
    stmt = select(Loan).options(
        selectinload(Loan.disbursements),
        selectinload(Loan.repayments),
        selectinload(Loan.interest_accruals)
    )

    if search:
        search_fmt = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Loan.loan_reference_no.ilike(search_fmt),
                Loan.lender_name.ilike(search_fmt),
                Loan.project_name.ilike(search_fmt),
                Loan.sanction_letter_ref.ilike(search_fmt)
            )
        )
    if status:
        stmt = stmt.where(Loan.status == status)
    if facility_type:
        stmt = stmt.where(Loan.facility_type == facility_type)
    if project_id:
        stmt = stmt.where(Loan.project_id == project_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(desc(Loan.id)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    items = res.scalars().all()

    page = (offset // limit) + 1
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return LoanListResponse(
        total=total,
        page=page,
        limit=limit,
        offset=offset,
        total_pages=total_pages,
        items=items
    )


@router.get("/{loan_id}", response_model=LoanResponse)
async def get_loan_detail(loan_id: int, db: AsyncSession = Depends(get_db)):
    """Get single loan facility by ID."""
    stmt = select(Loan).where(Loan.id == loan_id).options(
        selectinload(Loan.disbursements),
        selectinload(Loan.repayments),
        selectinload(Loan.interest_accruals)
    )
    res = await db.execute(stmt)
    loan = res.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan facility not found")
    return loan


@router.post("", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
async def create_loan(payload: LoanCreate, db: AsyncSession = Depends(get_db)):
    """Create a new loan facility."""
    stmt_check = select(Loan).where(Loan.loan_reference_no == payload.loan_reference_no)
    res_check = await db.execute(stmt_check)
    if res_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Loan reference number already exists")

    # If project_id is given but project_name is missing, resolve it
    project_name = payload.project_name
    if payload.project_id and not project_name:
        p_stmt = select(Project).where(Project.id == payload.project_id)
        p_res = await db.execute(p_stmt)
        p = p_res.scalar_one_or_none()
        if p:
            project_name = p.project_name


    loan_data = payload.model_dump()
    loan_data["project_name"] = project_name

    loan = Loan(**loan_data)
    db.add(loan)
    await db.flush()
    await _recalculate_loan_balances(db, loan.id)
    await db.commit()
    await db.refresh(loan)

    # Return refreshed with relationships
    return await get_loan_detail(loan.id, db)


@router.put("/{loan_id}", response_model=LoanResponse)
async def update_loan(loan_id: int, payload: LoanUpdate, db: AsyncSession = Depends(get_db)):
    """Update loan details."""
    stmt = select(Loan).where(Loan.id == loan_id).options(
        selectinload(Loan.disbursements),
        selectinload(Loan.repayments),
        selectinload(Loan.interest_accruals)
    )
    res = await db.execute(stmt)
    loan = res.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan facility not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "project_id" in update_data and update_data["project_id"] and not update_data.get("project_name"):
        p_stmt = select(Project).where(Project.id == update_data["project_id"])
        p_res = await db.execute(p_stmt)
        p = p_res.scalar_one_or_none()
        if p:
            update_data["project_name"] = p.project_name


    for key, value in update_data.items():
        setattr(loan, key, value)

    await _recalculate_loan_balances(db, loan.id)
    await db.commit()
    return await get_loan_detail(loan.id, db)


@router.delete("/{loan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_loan(loan_id: int, db: AsyncSession = Depends(get_db)):
    """Delete loan facility."""
    stmt = select(Loan).where(Loan.id == loan_id)
    res = await db.execute(stmt)
    loan = res.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan facility not found")

    await db.delete(loan)
    await db.commit()
    return None


@router.post("/{loan_id}/disbursements", response_model=LoanDisbursementItem, status_code=status.HTTP_201_CREATED)
async def record_loan_disbursement(
    loan_id: int,
    payload: LoanDisbursementCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    14.2 Loan Disbursement Accounting
    Debit: Bank Account (1120)
    Debit: Finance Charges (6400) (if processing fee deducted)
    Credit: Bank Loan Payable (2140 Current / 2210 Long-Term)
    """
    stmt = select(Loan).where(Loan.id == loan_id).options(
        selectinload(Loan.disbursements),
        selectinload(Loan.repayments),
        selectinload(Loan.interest_accruals)
    )
    res = await db.execute(stmt)
    loan = res.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan facility not found")

    gross = Decimal(payload.gross_amount)
    fee = Decimal(payload.processing_fee_deducted or 0)
    net_bank = gross - fee

    count_disb = len(loan.disbursements) + 1
    disb_ref = f"LDSB-{loan.loan_reference_no}-{count_disb:02d}"

    # Determine liability account based on tenure:
    # <= 12 months is Current Loan Obligations (2140), > 12 months is Long-Term Bank Loans (2210)
    liability_account_code = "2140" if loan.tenure_months <= 12 else "2210"

    gl_entries = [
        {
            "account_code": "1120", # Bank Account
            "debit": net_bank,
            "credit": Decimal("0.00"),
            "description": f"Loan Disbursement received from {loan.lender_name} ({loan.loan_reference_no})"
        }
    ]
    if fee > 0:
        gl_entries.append({
            "account_code": "6400", # Finance Costs / Processing Fee
            "debit": fee,
            "credit": Decimal("0.00"),
            "description": f"Loan Processing Fee / Upfront Bank Charges for {loan.loan_reference_no}"
        })
    gl_entries.append({
        "account_code": liability_account_code, # Bank Loan Payable
        "debit": Decimal("0.00"),
        "credit": gross,
        "description": f"Bank Loan Obligation for {loan.loan_reference_no} ({loan.facility_type})"
    })

    voucher_id = await _create_gl_voucher(
        db=db,
        voucher_type="JOURNAL",
        voucher_date=payload.disbursement_date,
        reference_no=disb_ref,
        narration=f"Disbursement tranche under facility {loan.loan_reference_no} from {loan.lender_name}. Gross: ৳{gross:,.2f}",
        project_id=loan.project_id,
        entries=gl_entries
    )

    disbursement = LoanDisbursement(
        disbursement_ref=disb_ref,
        loan_id=loan.id,
        disbursement_date=payload.disbursement_date,
        gross_amount=gross,
        processing_fee_deducted=fee,
        net_received_in_bank=net_bank,
        company_bank_account_id=payload.company_bank_account_id,
        company_bank_name=payload.company_bank_name or "Sonali Bank PLC (Corporate)",
        gl_voucher_id=voucher_id,
        notes=payload.notes
    )
    db.add(disbursement)
    await db.flush()

    loan.processing_fees_paid = Decimal(loan.processing_fees_paid or 0) + fee
    await _recalculate_loan_balances(db, loan.id)
    await db.commit()
    await db.refresh(disbursement)
    return disbursement


@router.post("/{loan_id}/repayments", response_model=LoanRepaymentItem, status_code=status.HTTP_201_CREATED)
async def record_loan_repayment(
    loan_id: int,
    payload: LoanRepaymentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    14.3 Loan Repayment Accounting
    Waterfall allocation: Principal, Interest, Fees/Penalties.
    Debit: Bank Loan Payable (2140 / 2210) [Principal Component]
    Debit: Finance Costs (6400) / Interest Payable (2130) [Interest Component]
    Debit: Finance Costs (6400) [Penalty/Fee Component]
    Credit: Bank Account (1120) [Total Paid]
    """
    stmt = select(Loan).where(Loan.id == loan_id).options(
        selectinload(Loan.disbursements),
        selectinload(Loan.repayments),
        selectinload(Loan.interest_accruals)
    )
    res = await db.execute(stmt)
    loan = res.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan facility not found")

    principal = Decimal(payload.principal_component)
    interest = Decimal(payload.interest_component)
    fee_pen = Decimal(payload.fee_or_penalty_component or 0)
    total_paid = Decimal(payload.total_amount_paid)

    count_rep = len(loan.repayments) + 1
    pmt_ref = f"LREP-{loan.loan_reference_no}-{count_rep:02d}"

    liability_code = "2140" if loan.tenure_months <= 12 else "2210"

    gl_entries = []
    if principal > 0:
        gl_entries.append({
            "account_code": liability_code,
            "debit": principal,
            "credit": Decimal("0.00"),
            "description": f"Principal Repayment on {loan.loan_reference_no}"
        })
    if interest > 0:
        gl_entries.append({
            "account_code": "6400", # Finance Cost
            "debit": interest,
            "credit": Decimal("0.00"),
            "description": f"Interest Service Payment on {loan.loan_reference_no}"
        })
    if fee_pen > 0:
        gl_entries.append({
            "account_code": "6400", # Bank Charges / Penalties
            "debit": fee_pen,
            "credit": Decimal("0.00"),
            "description": f"Late Fee / Penal Interest on {loan.loan_reference_no}"
        })
    gl_entries.append({
        "account_code": "1120", # Bank Account
        "debit": Decimal("0.00"),
        "credit": total_paid,
        "description": f"Bank Debit for Loan Repayment {loan.loan_reference_no}"
    })

    voucher_id = await _create_gl_voucher(
        db=db,
        voucher_type="PAYMENT",
        voucher_date=payload.payment_date,
        reference_no=pmt_ref,
        narration=f"Installment/Repayment on loan {loan.loan_reference_no}. Principal: ৳{principal:,.2f}, Interest: ৳{interest:,.2f}",
        project_id=loan.project_id,
        entries=gl_entries
    )

    repayment = LoanRepayment(
        payment_ref=pmt_ref,
        loan_id=loan.id,
        payment_date=payload.payment_date,
        total_amount_paid=total_paid,
        principal_component=principal,
        interest_component=interest,
        fee_or_penalty_component=fee_pen,
        bank_account_id=payload.bank_account_id,
        gl_voucher_id=voucher_id,
        lender_statement_ref=payload.lender_statement_ref,
        notes=payload.notes
    )
    db.add(repayment)
    await db.flush()

    await _recalculate_loan_balances(db, loan.id)
    await db.commit()
    await db.refresh(repayment)
    return repayment


@router.post("/{loan_id}/accrue-interest", response_model=LoanInterestAccrualItem, status_code=status.HTTP_201_CREATED)
async def record_interest_accrual(
    loan_id: int,
    payload: LoanInterestAccrualCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    14.3 Interest Accrual Accounting
    Debit: Finance Costs (6400)
    Credit: Accrued Expenses / Interest Payable (2130)
    """
    stmt = select(Loan).where(Loan.id == loan_id).options(
        selectinload(Loan.disbursements),
        selectinload(Loan.repayments),
        selectinload(Loan.interest_accruals)
    )
    res = await db.execute(stmt)
    loan = res.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan facility not found")

    amount = Decimal(payload.interest_accrued_amount)
    count_acc = len(loan.interest_accruals) + 1
    acc_ref = f"LACC-{loan.loan_reference_no}-{count_acc:02d}"

    gl_entries = [
        {
            "account_code": "6400", # Finance Cost
            "debit": amount,
            "credit": Decimal("0.00"),
            "description": f"Interest Accrual for {loan.loan_reference_no} ({payload.period_start} to {payload.period_end})"
        },
        {
            "account_code": "2130", # Accrued Expenses / Interest Payable
            "debit": Decimal("0.00"),
            "credit": amount,
            "description": f"Accrued Interest Payable to {loan.lender_name}"
        }
    ]

    voucher_id = await _create_gl_voucher(
        db=db,
        voucher_type="JOURNAL",
        voucher_date=payload.period_end,
        reference_no=acc_ref,
        narration=f"Monthly interest accrual for {loan.loan_reference_no} @ {payload.applied_rate_pct}% on ৳{payload.calculation_basis_balance:,.2f}",
        project_id=loan.project_id,
        entries=gl_entries
    )

    accrual = LoanInterestAccrual(
        accrual_ref=acc_ref,
        loan_id=loan.id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        calculation_basis_balance=payload.calculation_basis_balance,
        applied_rate_pct=payload.applied_rate_pct,
        interest_accrued_amount=amount,
        is_capitalized_to_cwip=False,
        gl_accrual_voucher_id=voucher_id,
        supporting_lender_statement=payload.supporting_lender_statement,
        status="ACCRUED",
        notes=payload.notes
    )
    db.add(accrual)
    await db.flush()

    await _recalculate_loan_balances(db, loan.id)
    await db.commit()
    await db.refresh(accrual)
    return accrual


@router.post("/{loan_id}/capitalize-ias23")
async def capitalize_borrowing_costs_ias23(
    loan_id: int,
    payload: LoanIAS23CapitalizeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    14.3 IAS 23 Borrowing Costs Capitalization
    "Do not automatically capitalize every loan-interest charge into construction WIP.
    Eligibility depends on the applicable accounting framework, the qualifying asset,
    and the company's documented accounting policy."
    
    Accounting Entry when Approved:
    Debit: Construction Work in Progress (CWIP) (1220)
    Credit: Finance Costs (6400)
    """
    stmt = select(Loan).where(Loan.id == loan_id).options(
        selectinload(Loan.disbursements),
        selectinload(Loan.repayments),
        selectinload(Loan.interest_accruals)
    )
    res = await db.execute(stmt)
    loan = res.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan facility not found")

    if not loan.is_eligible_for_ias23:
        raise HTTPException(
            status_code=400,
            detail="This loan is marked as not eligible for IAS 23 Borrowing Cost Capitalization under company policy"
        )

    stmt_acc = select(LoanInterestAccrual).where(
        LoanInterestAccrual.id == payload.accrual_id,
        LoanInterestAccrual.loan_id == loan.id
    )
    res_acc = await db.execute(stmt_acc)
    accrual = res_acc.scalar_one_or_none()
    if not accrual:
        raise HTTPException(status_code=404, detail="Interest accrual record not found")

    if accrual.is_capitalized_to_cwip:
        raise HTTPException(status_code=400, detail="This interest accrual is already capitalized to CWIP")

    cap_amount = Decimal(payload.eligible_amount)
    if cap_amount > Decimal(accrual.interest_accrued_amount):
        raise HTTPException(status_code=400, detail="Capitalized amount cannot exceed accrued interest amount")

    cwip_ref = f"IAS23-{accrual.accrual_ref}"

    gl_entries = [
        {
            "account_code": "1220", # Construction Work in Progress (CWIP)
            "debit": cap_amount,
            "credit": Decimal("0.00"),
            "description": f"IAS 23 Qualifying Borrowing Cost Capitalization - {loan.project_name or loan.loan_reference_no}"
        },
        {
            "account_code": "6400", # Reclassify from Finance Cost Expense
            "debit": Decimal("0.00"),
            "credit": cap_amount,
            "description": f"Reclassification of borrowing cost into Asset CWIP per policy"
        }
    ]

    voucher_id = await _create_gl_voucher(
        db=db,
        voucher_type="JOURNAL",
        voucher_date=payload.capitalization_date,
        reference_no=cwip_ref,
        narration=f"IAS 23 Borrowing Cost Capitalization into CWIP (1220). Policy justification: {payload.accounting_policy_justification}. Approved by: {payload.approved_by or 'CFO / Audit Committee'}",
        project_id=loan.project_id,
        entries=gl_entries
    )

    accrual.is_capitalized_to_cwip = True
    accrual.cwip_capitalization_voucher_id = voucher_id
    accrual.status = "CAPITALIZED_CWIP"
    if payload.notes:
        accrual.notes = f"{accrual.notes or ''}\n[IAS 23 Approval]: {payload.accounting_policy_justification}"

    await _recalculate_loan_balances(db, loan.id)
    await db.commit()

    return {
        "success": True,
        "message": f"৳{cap_amount:,.2f} successfully capitalized to CWIP (1220) under IAS 23",
        "voucher_id": voucher_id,
        "capitalization_reference": cwip_ref,
        "loan_total_capitalized": loan.total_interest_capitalized_cwip
    }


@router.post("/seed-demo-data")
async def seed_loan_demo_data(db: AsyncSession = Depends(get_db)):
    """Seed comprehensive commercial and project loans across the 22 projects."""
    p_stmt = select(Project).limit(22)
    p_res = await db.execute(p_stmt)
    projects = p_res.scalars().all()

    lenders = [
        ("Eastern Bank PLC", "Corporate Branch, Dilkusha, Dhaka", "EBL-TERM-88492"),
        ("BRAC Bank PLC", "Gulshan Corporate Branch, Dhaka", "BBL-CONS-55910"),
        ("The City Bank PLC", "Principal Branch, Motijheel, Dhaka", "CBL-SOD-22849"),
        ("Dutch-Bangla Bank PLC", "Corporate Banking Division, Dhaka", "DBBL-SYND-77182"),
        ("United Commercial Bank PLC", "Mohakhali Branch, Dhaka", "UCB-TERM-33948"),
        ("IDLC Finance PLC", "Corporate Office, Gulshan, Dhaka", "IDLC-LEASE-44912"),
        ("IPDC Finance PLC", "Corporate Branch, Banani, Dhaka", "IPDC-TERM-11928"),
        ("Standard Chartered Bank Bangladesh", "North Branch, Gulshan-2, Dhaka", "SCB-CRE-99201")
    ]

    facility_types = [
        "PROJECT_TERM_LOAN",
        "CONSTRUCTION_SYNDICATION",
        "OVERDRAFT_SOD",
        "LEASE_FINANCING",
        "COMMERCIAL_PAPER_SUKUK",
        "BRIDGE_FINANCING"
    ]

    repayment_freqs = ["MONTHLY", "QUARTERLY", "SEMI_ANNUALLY"]

    seeded_loans = []

    for idx, (lender_name, branch, acc_prefix) in enumerate(lenders):
        prj = projects[idx % len(projects)] if projects else None
        loan_ref = f"FAC-{2024}-{101 + idx:03d}"

        # Check existing
        stmt_e = select(Loan).where(Loan.loan_reference_no == loan_ref)
        res_e = await db.execute(stmt_e)
        if res_e.scalar_one_or_none():
            continue

        approved_amount = Decimal(random.choice([15000000, 25000000, 50000000, 75000000, 100000000]))
        disbursed_tranche1 = approved_amount * Decimal(random.choice([0.5, 0.7, 0.85, 1.0]))
        fee_amt = disbursed_tranche1 * Decimal("0.01") # 1% processing fee
        interest_rate = Decimal(str(random.choice([10.50, 11.25, 11.75, 12.00, 12.50])))
        smart_spread = Decimal("3.50")
        tenure = random.choice([36, 48, 60, 84])
        start_dt = date(2024, random.choice([1, 2, 3]), random.choice([1, 10, 15]))
        mat_dt = start_dt + timedelta(days=tenure * 30)

        loan = Loan(
            loan_reference_no=loan_ref,
            facility_type=facility_types[idx % len(facility_types)],
            lender_name=lender_name,
            lender_branch=branch,
            lender_account_no=f"{acc_prefix}-{random.randint(1000, 9999)}",
            sanction_letter_ref=f"SANC/{loan_ref}/{start_dt.year}",
            sanction_date=start_dt - timedelta(days=15),
            project_id=prj.id if prj else None,
            project_name=prj.project_name if prj else "Prime Commercial Tower",
            approved_facility_amount=approved_amount,

            total_disbursed_amount=Decimal("0.00"),
            total_principal_repaid=Decimal("0.00"),
            principal_outstanding=Decimal("0.00"),
            current_portion_outstanding=Decimal("0.00"),
            non_current_portion=Decimal("0.00"),
            tenure_months=tenure,
            start_date=start_dt,
            maturity_date=mat_dt,
            repayment_frequency=repayment_freqs[idx % len(repayment_freqs)],
            interest_rate_type="FLOATING_SMART_SPREAD",
            interest_rate_pct=interest_rate,
            smart_spread_pct=smart_spread,
            calculation_method="REDUCING_BALANCE",
            processing_fees_paid=Decimal("0.00"),
            security_collateral_description="First charge by way of registered mortgage over project land (0.75 Acres) and hypothecation over construction machinery & receivables.",
            mortgage_deed_no=f"MORT-REG-{random.randint(10000, 99999)}/2024",
            covenants_conditions="Maintain minimum DSCR of 1.35x. Debt/Equity ratio not to exceed 65:35 during construction phase. Submission of quarterly audited WIP certification by third-party surveyor.",
            next_repayment_date=date.today() + timedelta(days=15),
            status="ACTIVE",
            is_eligible_for_ias23=True,
            notes="Financing facility structured under central bank SMART floating benchmark."
        )
        db.add(loan)
        await db.flush()

        # Add Disbursement 1 (The 14.2 example: Bank disburses into bank account)
        disb_voucher_id = await _create_gl_voucher(
            db=db,
            voucher_type="JOURNAL",
            voucher_date=start_dt,
            reference_no=f"LDSB-{loan_ref}-01",
            narration=f"Disbursement of ৳{disbursed_tranche1:,.2f} under {loan_ref} from {lender_name}",
            project_id=loan.project_id,
            entries=[
                {"account_code": "1120", "debit": disbursed_tranche1 - fee_amt, "credit": Decimal("0.00"), "description": f"Loan Disbursement deposited in Sonali Bank Corporate Account"},
                {"account_code": "6400", "debit": fee_amt, "credit": Decimal("0.00"), "description": "1% Bank upfront arrangement and appraisal fees"},
                {"account_code": "2210" if tenure > 12 else "2140", "debit": Decimal("0.00"), "credit": disbursed_tranche1, "description": f"Facility Obligation - {loan_ref}"}
            ]
        )
        disb = LoanDisbursement(
            disbursement_ref=f"LDSB-{loan_ref}-01",
            loan_id=loan.id,
            disbursement_date=start_dt,
            gross_amount=disbursed_tranche1,
            processing_fee_deducted=fee_amt,
            net_received_in_bank=disbursed_tranche1 - fee_amt,
            company_bank_account_id=1,
            company_bank_name="Sonali Bank PLC (Corporate)",
            gl_voucher_id=disb_voucher_id,
            notes="Initial mobilization and foundation excavation tranche."
        )
        db.add(disb)
        loan.processing_fees_paid += fee_amt
        await db.flush()

        # Add Repayment 1 & 2
        rep_principal = (disbursed_tranche1 / Decimal(tenure)) * Decimal("1.0")
        rep_interest = (disbursed_tranche1 * (interest_rate / Decimal(100))) / Decimal("12")
        total_emi = rep_principal + rep_interest

        pmt_dt1 = start_dt + timedelta(days=30)
        rep_vouch1 = await _create_gl_voucher(
            db=db,
            voucher_type="PAYMENT",
            voucher_date=pmt_dt1,
            reference_no=f"LREP-{loan_ref}-01",
            narration=f"Installment payment 01 for {loan_ref}",
            project_id=loan.project_id,
            entries=[
                {"account_code": "2210" if tenure > 12 else "2140", "debit": rep_principal, "credit": Decimal("0.00"), "description": "Principal repayment"},
                {"account_code": "6400", "debit": rep_interest, "credit": Decimal("0.00"), "description": "Interest expense service"},
                {"account_code": "1120", "debit": Decimal("0.00"), "credit": total_emi, "description": "EFT debit from project account"}
            ]
        )
        rep1 = LoanRepayment(
            payment_ref=f"LREP-{loan_ref}-01",
            loan_id=loan.id,
            payment_date=pmt_dt1,
            total_amount_paid=total_emi,
            principal_component=rep_principal,
            interest_component=rep_interest,
            fee_or_penalty_component=Decimal("0.00"),
            bank_account_id=1,
            gl_voucher_id=rep_vouch1,
            lender_statement_ref=f"BANK-STMT-{loan_ref}-M1",
            notes="First monthly reducing balance repayment installment."
        )
        db.add(rep1)
        await db.flush()

        # Add Interest Accrual 1
        accrual_voucher = await _create_gl_voucher(
            db=db,
            voucher_type="JOURNAL",
            voucher_date=pmt_dt1,
            reference_no=f"LACC-{loan_ref}-01",
            narration=f"Month 1 Interest accrual on {loan_ref}",
            project_id=loan.project_id,
            entries=[
                {"account_code": "6400", "debit": rep_interest, "credit": Decimal("0.00"), "description": "Monthly accrued borrowing costs"},
                {"account_code": "2130", "debit": Decimal("0.00"), "credit": rep_interest, "description": "Accrued interest payable"}
            ]
        )
        accrual1 = LoanInterestAccrual(
            accrual_ref=f"LACC-{loan_ref}-01",
            loan_id=loan.id,
            period_start=start_dt,
            period_end=pmt_dt1,
            calculation_basis_balance=disbursed_tranche1,
            applied_rate_pct=interest_rate,
            interest_accrued_amount=rep_interest,
            is_capitalized_to_cwip=False,
            gl_accrual_voucher_id=accrual_voucher,
            supporting_lender_statement=f"INT-CERT-{loan_ref}-2024Q1",
            status="ACCRUED",
            notes="Accrued per reducing balance method."
        )
        db.add(accrual1)
        await db.flush()

        # For qualifying real estate project loans, capitalize Month 1 interest into CWIP (IAS 23)
        if idx % 2 == 0:
            cwip_vouch = await _create_gl_voucher(
                db=db,
                voucher_type="JOURNAL",
                voucher_date=pmt_dt1,
                reference_no=f"IAS23-{accrual1.accrual_ref}",
                narration=f"IAS 23 Borrowing Cost Capitalization into CWIP (1220) for {loan.project_name}",
                project_id=loan.project_id,
                entries=[
                    {"account_code": "1220", "debit": rep_interest, "credit": Decimal("0.00"), "description": f"Borrowing cost capitalized into qualifying asset {loan.project_name}"},
                    {"account_code": "6400", "debit": Decimal("0.00"), "credit": rep_interest, "description": "Credit borrowing cost out of P&L expense into CWIP"}
                ]
            )
            accrual1.is_capitalized_to_cwip = True
            accrual1.cwip_capitalization_voucher_id = cwip_vouch
            accrual1.status = "CAPITALIZED_CWIP"

        await _recalculate_loan_balances(db, loan.id)
        seeded_loans.append(loan.loan_reference_no)

    await db.commit()
    return {
        "success": True,
        "message": f"Successfully seeded {len(seeded_loans)} loan facilities with disbursements, repayments, accruals, and GL vouchers.",
        "seeded_facilities": seeded_loans
    }
