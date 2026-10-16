import logging
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.modules.projects.models import Project
from app.modules.auth.models import Organization, User
from app.modules.accounts.models import (
    ChartOfAccount, Voucher, JournalEntry, BankReconciliation
)
from app.modules.accounts.schemas import (
    ChartOfAccountCreate, ChartOfAccountResponse,
    VoucherCreate, VoucherResponse, JournalEntryResponse,
    BankReconciliationCreate, BankReconciliationResponse,
    TrialBalanceReport, TrialBalanceItem,
    ProfitLossReport, BalanceSheetReport
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/accounts", tags=["Double-Entry Accounts, General Ledger & Financial Reports"])


# --------------------------------------------------------------------------
# 1. Chart of Accounts (COA)
# --------------------------------------------------------------------------
@router.get("/coa", response_model=List[ChartOfAccountResponse])
async def list_chart_of_accounts(
    account_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List hierarchical Chart of Accounts with live ledger balances.
    """
    stmt = select(ChartOfAccount).order_by(ChartOfAccount.account_code.asc())
    if account_type:
        stmt = stmt.where(ChartOfAccount.account_type == account_type)

    result = await db.execute(stmt)
    accounts = result.scalars().all()

    resp_list: List[ChartOfAccountResponse] = []
    for acc in accounts:
        # Calculate ledger balance for leaf accounts
        sum_stmt = (
            select(
                func.coalesce(func.sum(JournalEntry.debit_amount), 0.0),
                func.coalesce(func.sum(JournalEntry.credit_amount), 0.0)
            )
            .join(Voucher, Voucher.id == JournalEntry.voucher_id)
            .where(JournalEntry.account_id == acc.id, Voucher.status == "Posted")
        )
        totals = (await db.execute(sum_stmt)).one()
        dr, cr = float(totals[0]), float(totals[1])
        
        # Asset / Expense normal balance: Debit - Credit. Liability / Equity / Revenue: Credit - Debit.
        if acc.account_type in ["Asset", "Expense"]:
            balance = round(dr - cr, 2)
        else:
            balance = round(cr - dr, 2)

        resp = ChartOfAccountResponse.model_validate(acc)
        resp.current_balance = balance
        resp_list.append(resp)

    return resp_list


@router.post("/coa", response_model=ChartOfAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_chart_of_account(
    payload: ChartOfAccountCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new head of account under the Chart of Accounts.
    """
    existing = await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == payload.account_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Account code {payload.account_code} already exists.")

    acc = ChartOfAccount(
        organization_id=payload.organization_id or 1,
        parent_account_id=payload.parent_account_id,
        account_code=payload.account_code,
        account_name_en=payload.account_name_en,
        account_name_bn=payload.account_name_bn,
        account_type=payload.account_type,
        is_leaf_account=payload.is_leaf_account if payload.is_leaf_account is not None else True
    )
    db.add(acc)
    await db.commit()
    await db.refresh(acc)

    resp = ChartOfAccountResponse.model_validate(acc)
    resp.current_balance = 0.00
    return resp


# --------------------------------------------------------------------------
# 2. Vouchers & Double-Entry Journal Engine (Financial Safeguard: Sum(Dr) == Sum(Cr))
# --------------------------------------------------------------------------
@router.get("/vouchers", response_model=List[VoucherResponse])
async def list_vouchers(
    voucher_type: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List Double-Entry Vouchers with journal entry rows.
    """
    stmt = (
        select(Voucher)
        .options(
            selectinload(Voucher.project),
            selectinload(Voucher.created_by),
            selectinload(Voucher.entries).selectinload(JournalEntry.account)
        )
        .order_by(Voucher.voucher_date.desc(), Voucher.id.desc())
    )
    if voucher_type:
        stmt = stmt.where(Voucher.voucher_type == voucher_type)
    if project_id:
        stmt = stmt.where(Voucher.project_id == project_id)
    if status_filter:
        stmt = stmt.where(Voucher.status == status_filter)

    result = await db.execute(stmt)
    vouchers = result.scalars().all()

    resp_list: List[VoucherResponse] = []
    for v in vouchers:
        resp = VoucherResponse.model_validate(v)
        resp.project_name = v.project.project_name if v.project else "Corporate / General"
        resp.created_by_name = v.created_by.full_name_en if v.created_by else "System"

        entry_responses = []
        for e in v.entries:
            entry_resp = JournalEntryResponse(
                id=e.id,
                voucher_id=e.voucher_id,
                project_id=e.project_id,
                account_id=e.account_id,
                account_code=e.account.account_code if e.account else None,
                account_name_en=e.account.account_name_en if e.account else None,
                account_type=e.account.account_type if e.account else None,
                voucher_date=e.voucher_date,
                debit_amount=float(e.debit_amount),
                credit_amount=float(e.credit_amount),
                narration=e.narration
            )
            entry_responses.append(entry_resp)
        resp.entries = entry_responses
        resp_list.append(resp)

    return resp_list


@router.post("/vouchers", response_model=VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_voucher(
    payload: VoucherCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Post a new double-entry voucher.
    FINANCIAL SAFEGUARDS:
    1. Strictly enforces: Sum(Debit) == Sum(Credit).
    2. Minimum 2 line entries.
    3. Status defaults to 'Posted'. Zero hard deletions allowed.
    """
    if len(payload.entries) < 2:
        raise HTTPException(status_code=400, detail="A double-entry voucher must contain at least 2 entry lines.")

    total_debit = round(sum(float(e.debit_amount or 0.0) for e in payload.entries), 2)
    total_credit = round(sum(float(e.credit_amount or 0.0) for e in payload.entries), 2)

    if total_debit <= 0.00 or total_credit <= 0.00:
        raise HTTPException(status_code=400, detail="Total voucher amount must be greater than zero.")

    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Double-entry balance violation! Total Debit (৳{total_debit:,.2f}) does not equal Total Credit (৳{total_credit:,.2f}). Difference: ৳{abs(total_debit - total_credit):,.2f}."
        )

    v_date = payload.voucher_date or date.today()
    v_prefix_map = {
        "Journal": "JV",
        "Cash_Payment": "CP",
        "Cash_Receipt": "CR",
        "Bank_Payment": "BP",
        "Bank_Receipt": "BR",
        "Contra": "CV"
    }
    pfx = v_prefix_map.get(payload.voucher_type, "JV")
    count = (await db.execute(select(func.count(Voucher.id)))).scalar() or 0
    voucher_no = f"{pfx}-{v_date.year}-{count + 1:05d}"

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    voucher = Voucher(
        organization_id=1,
        project_id=payload.project_id,
        voucher_number=voucher_no,
        voucher_type=payload.voucher_type,
        voucher_date=v_date,
        narration=payload.narration,
        total_debit_amount=total_debit,
        total_credit_amount=total_credit,
        status="Posted",
        created_by_user_id=user_id
    )
    db.add(voucher)
    await db.commit()
    await db.refresh(voucher)

    for e in payload.entries:
        db.add(JournalEntry(
            voucher_id=voucher.id,
            project_id=e.project_id or payload.project_id,
            account_id=e.account_id,
            voucher_date=v_date,
            debit_amount=e.debit_amount or 0.00,
            credit_amount=e.credit_amount or 0.00,
            narration=e.narration or payload.narration
        ))
    await db.commit()

    # Reload voucher with relationships
    stmt = (
        select(Voucher)
        .options(
            selectinload(Voucher.project),
            selectinload(Voucher.created_by),
            selectinload(Voucher.entries).selectinload(JournalEntry.account)
        )
        .where(Voucher.id == voucher.id)
    )
    res = await db.execute(stmt)
    voucher = res.scalar_one()

    resp = VoucherResponse.model_validate(voucher)
    resp.project_name = voucher.project.project_name if voucher.project else "Corporate / General"
    resp.created_by_name = voucher.created_by.full_name_en if voucher.created_by else "System"
    resp.entries = [
        JournalEntryResponse(
            id=entry.id,
            voucher_id=entry.voucher_id,
            project_id=entry.project_id,
            account_id=entry.account_id,
            account_code=entry.account.account_code if entry.account else None,
            account_name_en=entry.account.account_name_en if entry.account else None,
            account_type=entry.account.account_type if entry.account else None,
            voucher_date=entry.voucher_date,
            debit_amount=float(entry.debit_amount),
            credit_amount=float(entry.credit_amount),
            narration=entry.narration
        ) for entry in voucher.entries
    ]
    return resp


@router.post("/vouchers/{voucher_id}/reverse", response_model=VoucherResponse)
async def reverse_voucher(voucher_id: int, db: AsyncSession = Depends(get_db)):
    """
    FINANCIAL SAFEGUARD: Zero hard deletions.
    Creates an exact opposing Reversal Voucher and marks the original as 'Reversed'.
    """
    stmt = (
        select(Voucher)
        .options(selectinload(Voucher.entries))
        .where(Voucher.id == voucher_id)
    )
    res = await db.execute(stmt)
    orig = res.scalar_one_or_none()
    if not orig:
        raise HTTPException(status_code=404, detail="Voucher not found.")
    if orig.status == "Reversed":
        raise HTTPException(status_code=400, detail="Voucher is already reversed.")

    rev_date = date.today()
    rev_count = (await db.execute(select(func.count(Voucher.id)))).scalar() or 0
    rev_no = f"REV-{rev_date.year}-{rev_count + 1:05d}"

    rev_voucher = Voucher(
        organization_id=orig.organization_id,
        project_id=orig.project_id,
        voucher_number=rev_no,
        voucher_type=orig.voucher_type,
        voucher_date=rev_date,
        narration=f"Reversal of {orig.voucher_number}: {orig.narration}",
        total_debit_amount=orig.total_credit_amount,
        total_credit_amount=orig.total_debit_amount,
        status="Posted",
        created_by_user_id=orig.created_by_user_id
    )
    db.add(rev_voucher)
    await db.commit()
    await db.refresh(rev_voucher)

    # Invert debits and credits
    for entry in orig.entries:
        db.add(JournalEntry(
            voucher_id=rev_voucher.id,
            project_id=entry.project_id,
            account_id=entry.account_id,
            voucher_date=rev_date,
            debit_amount=entry.credit_amount,
            credit_amount=entry.debit_amount,
            narration=f"Reversal of entry #{entry.id}"
        ))

    orig.status = "Reversed"
    orig.reversal_voucher_id = rev_voucher.id
    await db.commit()

    # Reload reversal voucher
    reload_stmt = (
        select(Voucher)
        .options(
            selectinload(Voucher.project),
            selectinload(Voucher.created_by),
            selectinload(Voucher.entries).selectinload(JournalEntry.account)
        )
        .where(Voucher.id == rev_voucher.id)
    )
    rev_res = await db.execute(reload_stmt)
    rev_voucher = rev_res.scalar_one()

    resp = VoucherResponse.model_validate(rev_voucher)
    resp.project_name = rev_voucher.project.project_name if rev_voucher.project else "Corporate / General"
    resp.created_by_name = rev_voucher.created_by.full_name_en if rev_voucher.created_by else "System"
    return resp


# --------------------------------------------------------------------------
# 3. Bank & MFS Reconciliation (Module 44)
# --------------------------------------------------------------------------
@router.get("/bank-reconciliation", response_model=List[BankReconciliationResponse])
async def list_bank_reconciliations(db: AsyncSession = Depends(get_db)):
    """
    List bank & MFS statement reconciliation audits.
    """
    stmt = (
        select(BankReconciliation)
        .options(selectinload(BankReconciliation.bank_account))
        .order_by(BankReconciliation.statement_date.desc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    resp_list: List[BankReconciliationResponse] = []
    for r in records:
        resp = BankReconciliationResponse.model_validate(r)
        if r.bank_account:
            resp.bank_account_name = r.bank_account.account_name_en
            resp.bank_account_code = r.bank_account.account_code
        resp_list.append(resp)
    return resp_list


@router.post("/bank-reconciliation", response_model=BankReconciliationResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_reconciliation(
    payload: BankReconciliationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Audit Bank Statement balance against Book Balance.
    """
    acc = await db.get(ChartOfAccount, payload.bank_account_id)
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found.")

    # Compute current book balance
    sum_stmt = (
        select(
            func.coalesce(func.sum(JournalEntry.debit_amount), 0.0),
            func.coalesce(func.sum(JournalEntry.credit_amount), 0.0)
        )
        .join(Voucher, Voucher.id == JournalEntry.voucher_id)
        .where(
            JournalEntry.account_id == acc.id,
            Voucher.status == "Posted",
            JournalEntry.voucher_date <= payload.statement_date
        )
    )
    totals = (await db.execute(sum_stmt)).one()
    dr, cr = float(totals[0]), float(totals[1])
    book_bal = round(dr - cr, 2)

    diff = round(float(payload.statement_balance) - book_bal, 2)
    reconciled = (abs(diff) < 0.01)

    rec = BankReconciliation(
        bank_account_id=payload.bank_account_id,
        statement_date=payload.statement_date,
        statement_balance=payload.statement_balance,
        book_balance=book_bal,
        difference_amount=diff,
        is_reconciled=reconciled,
        reconciliation_notes=payload.reconciliation_notes or ("Cleanly reconciled with 0 variance." if reconciled else f"Discrepancy of ৳{diff:,.2f} pending clearing.")
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)

    resp = BankReconciliationResponse.model_validate(rec)
    resp.bank_account_name = acc.account_name_en
    resp.bank_account_code = acc.account_code
    return resp


# --------------------------------------------------------------------------
# 4. Real-Time Financial Reports (Trial Balance, P&L, Balance Sheet)
# --------------------------------------------------------------------------
@router.get("/reports/trial-balance", response_model=TrialBalanceReport)
async def get_trial_balance(
    as_of_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Real-Time Trial Balance report verifying Double-Entry integrity: Sum(Debit) == Sum(Credit).
    """
    target_date = as_of_date or date.today()

    stmt = (
        select(
            ChartOfAccount.id,
            ChartOfAccount.account_code,
            ChartOfAccount.account_name_en,
            ChartOfAccount.account_type,
            func.coalesce(func.sum(JournalEntry.debit_amount), 0.0).label("tot_dr"),
            func.coalesce(func.sum(JournalEntry.credit_amount), 0.0).label("tot_cr")
        )
        .join(JournalEntry, JournalEntry.account_id == ChartOfAccount.id)
        .join(Voucher, Voucher.id == JournalEntry.voucher_id)
        .where(Voucher.status == "Posted", JournalEntry.voucher_date <= target_date)
        .group_by(ChartOfAccount.id, ChartOfAccount.account_code, ChartOfAccount.account_name_en, ChartOfAccount.account_type)
        .order_by(ChartOfAccount.account_code.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    items: List[TrialBalanceItem] = []
    grand_dr = 0.0
    grand_cr = 0.0

    for r in rows:
        dr = round(float(r.tot_dr), 2)
        cr = round(float(r.tot_cr), 2)
        grand_dr += dr
        grand_cr += cr

        net_dr = max(0.0, round(dr - cr, 2)) if r.account_type in ["Asset", "Expense"] else 0.0
        net_cr = max(0.0, round(cr - dr, 2)) if r.account_type in ["Liability", "Equity", "Revenue"] else 0.0

        items.append(TrialBalanceItem(
            account_id=r.id,
            account_code=r.account_code,
            account_name_en=r.account_name_en,
            account_type=r.account_type,
            total_debit=dr,
            total_credit=cr,
            net_debit=net_dr,
            net_credit=net_cr
        ))

    balanced = abs(grand_dr - grand_cr) <= 0.01

    return TrialBalanceReport(
        as_of_date=target_date,
        items=items,
        grand_total_debit=round(grand_dr, 2),
        grand_total_credit=round(grand_cr, 2),
        is_balanced=balanced
    )


@router.get("/reports/profit-loss", response_model=ProfitLossReport)
async def get_profit_loss(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Project-wise or Corporate Profit & Loss (P&L) Statement.
    """
    t_end = to_date or date.today()
    t_start = from_date or date(t_end.year, 1, 1)

    stmt = (
        select(
            ChartOfAccount.id,
            ChartOfAccount.account_code,
            ChartOfAccount.account_name_en,
            ChartOfAccount.account_type,
            func.coalesce(func.sum(JournalEntry.debit_amount), 0.0).label("tot_dr"),
            func.coalesce(func.sum(JournalEntry.credit_amount), 0.0).label("tot_cr")
        )
        .join(JournalEntry, JournalEntry.account_id == ChartOfAccount.id)
        .join(Voucher, Voucher.id == JournalEntry.voucher_id)
        .where(
            Voucher.status == "Posted",
            JournalEntry.voucher_date >= t_start,
            JournalEntry.voucher_date <= t_end,
            ChartOfAccount.account_type.in_(["Revenue", "Expense"])
        )
    )
    if project_id:
        stmt = stmt.where(JournalEntry.project_id == project_id)

    stmt = stmt.group_by(
        ChartOfAccount.id, ChartOfAccount.account_code, ChartOfAccount.account_name_en, ChartOfAccount.account_type
    ).order_by(ChartOfAccount.account_code.asc())

    rows = (await db.execute(stmt)).all()

    rev_list: List[TrialBalanceItem] = []
    exp_list: List[TrialBalanceItem] = []
    tot_rev = 0.0
    tot_exp = 0.0

    for r in rows:
        dr = round(float(r.tot_dr), 2)
        cr = round(float(r.tot_cr), 2)
        if r.account_type == "Revenue":
            net = round(cr - dr, 2)
            tot_rev += net
            rev_list.append(TrialBalanceItem(
                account_id=r.id, account_code=r.account_code, account_name_en=r.account_name_en,
                account_type="Revenue", total_debit=dr, total_credit=cr, net_debit=0.0, net_credit=net
            ))
        else:
            net = round(dr - cr, 2)
            tot_exp += net
            exp_list.append(TrialBalanceItem(
                account_id=r.id, account_code=r.account_code, account_name_en=r.account_name_en,
                account_type="Expense", total_debit=dr, total_credit=cr, net_debit=net, net_credit=0.0
            ))

    p_name = None
    if project_id:
        p = await db.get(Project, project_id)
        p_name = p.project_name if p else None

    return ProfitLossReport(
        from_date=t_start,
        to_date=t_end,
        project_id=project_id,
        project_name=p_name or "All Projects (Consolidated)",
        total_revenue=round(tot_rev, 2),
        total_expense=round(tot_exp, 2),
        net_profit_or_loss=round(tot_rev - tot_exp, 2),
        revenue_breakdown=rev_list,
        expense_breakdown=exp_list
    )


@router.get("/reports/balance-sheet", response_model=BalanceSheetReport)
async def get_balance_sheet(
    as_of_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Standard Corporate Balance Sheet (Assets = Liabilities + Equity).
    """
    target_date = as_of_date or date.today()

    stmt = (
        select(
            ChartOfAccount.id,
            ChartOfAccount.account_code,
            ChartOfAccount.account_name_en,
            ChartOfAccount.account_type,
            func.coalesce(func.sum(JournalEntry.debit_amount), 0.0).label("tot_dr"),
            func.coalesce(func.sum(JournalEntry.credit_amount), 0.0).label("tot_cr")
        )
        .join(JournalEntry, JournalEntry.account_id == ChartOfAccount.id)
        .join(Voucher, Voucher.id == JournalEntry.voucher_id)
        .where(
            Voucher.status == "Posted",
            JournalEntry.voucher_date <= target_date,
            ChartOfAccount.account_type.in_(["Asset", "Liability", "Equity"])
        )
        .group_by(ChartOfAccount.id, ChartOfAccount.account_code, ChartOfAccount.account_name_en, ChartOfAccount.account_type)
        .order_by(ChartOfAccount.account_code.asc())
    )
    rows = (await db.execute(stmt)).all()

    assets: List[TrialBalanceItem] = []
    liabs: List[TrialBalanceItem] = []
    equities: List[TrialBalanceItem] = []

    tot_assets = 0.0
    tot_liabs = 0.0
    tot_equity = 0.0

    for r in rows:
        dr = round(float(r.tot_dr), 2)
        cr = round(float(r.tot_cr), 2)
        if r.account_type == "Asset":
            net = round(dr - cr, 2)
            tot_assets += net
            assets.append(TrialBalanceItem(
                account_id=r.id, account_code=r.account_code, account_name_en=r.account_name_en,
                account_type="Asset", total_debit=dr, total_credit=cr, net_debit=net, net_credit=0.0
            ))
        elif r.account_type == "Liability":
            net = round(cr - dr, 2)
            tot_liabs += net
            liabs.append(TrialBalanceItem(
                account_id=r.id, account_code=r.account_code, account_name_en=r.account_name_en,
                account_type="Liability", total_debit=dr, total_credit=cr, net_debit=0.0, net_credit=net
            ))
        else:
            net = round(cr - dr, 2)
            tot_equity += net
            equities.append(TrialBalanceItem(
                account_id=r.id, account_code=r.account_code, account_name_en=r.account_name_en,
                account_type="Equity", total_debit=dr, total_credit=cr, net_debit=0.0, net_credit=net
            ))

    return BalanceSheetReport(
        as_of_date=target_date,
        total_assets=round(tot_assets, 2),
        total_liabilities=round(tot_liabs, 2),
        total_equity=round(tot_equity, 2),
        net_difference=round(tot_assets - (tot_liabs + tot_equity), 2),
        asset_breakdown=assets,
        liability_breakdown=liabs,
        equity_breakdown=equities
    )
