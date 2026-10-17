import logging
from datetime import date, datetime
from typing import List, Optional
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.modules.projects.models import Project
from app.modules.auth.models import Organization, User
from app.modules.sales.models import Booking
from app.modules.procurement.models import Vendor
from app.modules.construction.models import Subcontractor
from app.modules.accounts.models import (
    ChartOfAccount, Voucher, JournalEntry, BankReconciliation,
    MushakTaxInvoice, TDSDeduction, CostCenter, FiscalYear,
    PDCVault, CWIPCapitalization, IFRS15RevenueRecognition,
    BankStatementItem
)
from app.modules.accounts.schemas import (
    ChartOfAccountCreate, ChartOfAccountResponse, ChartOfAccountTreeNode,
    VoucherCreate, VoucherResponse, JournalEntryResponse,
    BankReconciliationCreate, BankReconciliationResponse,
    TrialBalanceReport, TrialBalanceItem,
    ProfitLossReport, BalanceSheetReport,
    MushakTaxInvoiceCreate, MushakTaxInvoiceResponse,
    TDSDeductionCreate, TDSDeductionResponse, TDSDeductionDeposit,
    SubRegistryCalculationRequest, SubRegistryCalculationResponse,
    FiscalYearBase, FiscalYearCreate, FiscalYearResponse,
    CostCenterBase, CostCenterCreate, CostCenterResponse,
    PDCVaultBase, PDCVaultCreate, PDCStatusUpdate, PDCVaultResponse,
    CWIPCapitalizeRequest, CWIPSummaryResponse,
    IFRS15RecognizeRequest, IFRS15Response,
    BankStatementAutoMatchRequest, BankReconciliationFullResponse
)
from app.modules.accounts.mushak_generator import generate_mushak_63_pdf
from app.modules.accounts.services import (
    post_vat_mushak_revenue_voucher, build_hierarchical_coa_tree,
    get_cost_center_variances, get_project_cwip_summary,
    post_cwip_capitalization, post_ifrs15_revenue_recognition,
    update_pdc_vault_status, auto_match_bank_statement
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/accounts", tags=["Double-Entry Accounts, VAT & NBR Compliance"])



# --------------------------------------------------------------------------
# 1. Chart of Accounts (COA)
# --------------------------------------------------------------------------
@router.get("/coa/hierarchy", response_model=List[ChartOfAccountTreeNode])
async def get_chart_of_accounts_hierarchy(
    organization_id: int = Query(1),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the full 5-tier hierarchical Chart of Accounts tree with recursive aggregated balances.
    """
    tree = await build_hierarchical_coa_tree(db=db, org_id=organization_id)
    return tree


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
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List Double-Entry Vouchers with journal entry rows. Supports search by voucher number or narration.
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
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Voucher.voucher_number.ilike(search_pattern),
                Voucher.narration.ilike(search_pattern)
            )
        )

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


# --------------------------------------------------------------------------
# 5. Bangladesh VAT & Mushak 6.3 Tax Invoices (VAT Act 2012)
# --------------------------------------------------------------------------
@router.get("/vat-mushak", response_model=List[MushakTaxInvoiceResponse])
async def list_mushak_invoices(
    booking_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List issued statutory Mushak 6.3 Tax Invoices.
    """
    stmt = (
        select(MushakTaxInvoice)
        .options(
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.project),
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.customer),
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.unit)
        )
        .order_by(MushakTaxInvoice.id.desc())
    )
    if booking_id:
        stmt = stmt.where(MushakTaxInvoice.booking_id == booking_id)

    result = await db.execute(stmt)
    invoices = result.scalars().all()

    resp_list: List[MushakTaxInvoiceResponse] = []
    for inv in invoices:
        resp = MushakTaxInvoiceResponse.model_validate(inv)
        if inv.booking:
            resp.booking_reference_no = inv.booking.booking_reference_no
            resp.customer_name = inv.booking.customer.full_name_en if inv.booking.customer else None
            resp.project_name = inv.booking.project.project_name if inv.booking.project else None
            resp.unit_number = inv.booking.unit.unit_number if inv.booking.unit else None
        resp_list.append(resp)

    return resp_list


@router.post("/vat-mushak", response_model=MushakTaxInvoiceResponse, status_code=status.HTTP_201_CREATED)
async def generate_mushak_invoice(
    payload: MushakTaxInvoiceCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate statutory Mushak 6.3 Tax Invoice under Bangladesh VAT Act 2012:
    - Residential <= 1,600 sq ft: 2.0% VAT
    - Residential > 1,600 sq ft: 4.5% VAT
    - Commercial properties: 7.5% VAT
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.project),
            selectinload(Booking.customer),
            selectinload(Booking.unit)
        )
        .where(Booking.id == payload.booking_id)
    )
    res = await db.execute(stmt)
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    sqft = float(booking.unit.gross_saleable_area_sqft) if (booking.unit and booking.unit.gross_saleable_area_sqft) else 1500.0

    # Apply Bangladesh VAT Act 2012 Rules
    apt_type = payload.apartment_type or "RESIDENTIAL"
    if apt_type == "COMMERCIAL":
        vat_rate = 7.50
    elif sqft <= 1600.00:
        vat_rate = 2.00
    else:
        vat_rate = 4.50

    taxable = float(payload.taxable_amount)
    vat_amt = round(taxable * (vat_rate / 100.0), 2)
    tot_collected = round(taxable + vat_amt, 2)

    count = (await db.execute(select(func.count(MushakTaxInvoice.id)))).scalar() or 0
    challan_no = f"MUSHAK-6.3-{date.today().year}-{count + 1:05d}"

    cust_tin_nid = payload.customer_tin_nid or (
        f"TIN: {booking.customer.tin_number}" if (booking.customer and booking.customer.tin_number)
        else (f"NID: {booking.customer.nid_number}" if (booking.customer and booking.customer.nid_number) else "NID: 19852691234567890")
    )

    inv = MushakTaxInvoice(
        booking_id=booking.id,
        mushak_challan_number=challan_no,
        invoice_date=date.today(),
        developer_bin_number="001234567-0101",
        customer_tin_nid=cust_tin_nid,
        apartment_sqft=sqft,
        taxable_amount=taxable,
        vat_rate_percent=vat_rate,
        vat_amount=vat_amt,
        total_amount_collected=tot_collected,
        pdf_url=f"/api/v1/accounts/vat-mushak/{count + 1}/pdf",
        status="ISSUED"
    )
    db.add(inv)
    await db.flush()

    # Post automated VAT liability & revenue recognition journal voucher
    # Debit: Advance from Customer | Credit: Revenue & Output VAT Payable
    await post_vat_mushak_revenue_voucher(
        db=db,
        booking_id=booking.id,
        mushak_challan_number=challan_no,
        taxable_amount=float(taxable),
        vat_amount=float(vat_amt),
        total_collected=float(tot_collected),
        project_id=booking.project_id if booking else None
    )

    await db.commit()
    await db.refresh(inv)
    resp = MushakTaxInvoiceResponse.model_validate(inv)
    resp.booking_reference_no = booking.booking_reference_no
    resp.customer_name = booking.primary_customer.full_name_en if booking.primary_customer else None
    resp.project_name = booking.project.project_name if booking.project else None
    resp.unit_number = booking.unit.unit_number if booking.unit else None
    return resp


@router.get("/vat-mushak/{invoice_id}/pdf")
async def download_mushak_pdf(invoice_id: int, db: AsyncSession = Depends(get_db)):
    """
    Generates and downloads NBR Form Mushak-6.3 PDF.
    """
    stmt = (
        select(MushakTaxInvoice)
        .options(
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.project),
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.primary_customer),
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.unit)
        )
        .where(MushakTaxInvoice.id == invoice_id)
    )
    res = await db.execute(stmt)
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Mushak invoice not found.")

    invoice_data = {
        "mushak_challan_number": inv.mushak_challan_number,
        "invoice_date": inv.invoice_date.strftime("%d/%m/%Y"),
        "developer_company_name": "Maksudu Real Estate & Construction Ltd.",
        "developer_bin_number": inv.developer_bin_number,
        "customer_name": inv.booking.primary_customer.full_name_en if (inv.booking and inv.booking.primary_customer) else "Valued Client",
        "customer_tin_nid": inv.customer_tin_nid,
        "project_name": inv.booking.project.project_name if (inv.booking and inv.booking.project) else "Real Estate Project",
        "unit_number": inv.booking.unit.unit_number if (inv.booking and inv.booking.unit) else "5B",
        "apartment_sqft": float(inv.apartment_sqft),
        "taxable_amount": float(inv.taxable_amount),
        "vat_rate_percent": float(inv.vat_rate_percent),
        "vat_amount": float(inv.vat_amount),
        "total_amount_collected": float(inv.total_amount_collected)
    }

    pdf_bytes = generate_mushak_63_pdf(invoice_data)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={inv.mushak_challan_number}.pdf"}
    )


# --------------------------------------------------------------------------
# 6. TDS & VDS Tax Withholding Register (Income Tax Act 2023)
# --------------------------------------------------------------------------
@router.get("/tax-withholding", response_model=List[TDSDeductionResponse])
async def list_tds_deductions(
    section_filter: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List TDS/VDS deductions withheld from contractors, vendors, and suppliers.
    """
    stmt = (
        select(TDSDeduction)
        .options(
            selectinload(TDSDeduction.vendor),
            selectinload(TDSDeduction.contractor),
            selectinload(TDSDeduction.voucher)
        )
        .order_by(TDSDeduction.id.desc())
    )
    if section_filter:
        stmt = stmt.where(TDSDeduction.deduction_section == section_filter)
    if status_filter:
        stmt = stmt.where(TDSDeduction.status == status_filter)

    result = await db.execute(stmt)
    records = result.scalars().all()

    resp_list: List[TDSDeductionResponse] = []
    for r in records:
        resp = TDSDeductionResponse.model_validate(r)
        resp.vendor_name = r.vendor.vendor_name if r.vendor else None
        resp.contractor_name = r.contractor.company_name if r.contractor else None
        resp.voucher_number = r.voucher.voucher_number if r.voucher else None
        resp_list.append(resp)
    return resp_list


@router.post("/tax-withholding", response_model=TDSDeductionResponse, status_code=status.HTTP_201_CREATED)
async def create_tds_deduction(
    payload: TDSDeductionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Log a TDS or VDS deduction at source.
    """
    gross = float(payload.gross_amount)
    rate = float(payload.tax_rate_percent)
    withheld = round(gross * (rate / 100.0), 2)

    tds = TDSDeduction(
        voucher_id=payload.voucher_id,
        vendor_id=payload.vendor_id,
        contractor_id=payload.contractor_id,
        deduction_section=payload.deduction_section,
        gross_amount=gross,
        tax_rate_percent=rate,
        withheld_amount=withheld,
        challan_number=payload.challan_number,
        status="WITHHELD"
    )
    db.add(tds)
    await db.commit()
    await db.refresh(tds)

    stmt = (
        select(TDSDeduction)
        .options(selectinload(TDSDeduction.vendor), selectinload(TDSDeduction.contractor), selectinload(TDSDeduction.voucher))
        .where(TDSDeduction.id == tds.id)
    )
    res = await db.execute(stmt)
    tds = res.scalar_one()

    resp = TDSDeductionResponse.model_validate(tds)
    resp.vendor_name = tds.vendor.vendor_name if tds.vendor else None
    resp.contractor_name = tds.contractor.company_name if tds.contractor else None
    resp.voucher_number = tds.voucher.voucher_number if tds.voucher else None
    return resp


@router.patch("/tax-withholding/{tds_id}/deposit", response_model=TDSDeductionResponse)
async def deposit_tds_to_treasury(
    tds_id: int,
    payload: TDSDeductionDeposit,
    db: AsyncSession = Depends(get_db)
):
    """
    Record Bangladesh Bank Treasury Challan deposit for withheld tax.
    """
    stmt = (
        select(TDSDeduction)
        .options(selectinload(TDSDeduction.vendor), selectinload(TDSDeduction.contractor), selectinload(TDSDeduction.voucher))
        .where(TDSDeduction.id == tds_id)
    )
    res = await db.execute(stmt)
    tds = res.scalar_one_or_none()
    if not tds:
        raise HTTPException(status_code=404, detail="TDS record not found.")

    tds.challan_number = payload.challan_number
    tds.challan_deposit_date = payload.challan_deposit_date
    tds.status = "DEPOSITED_TO_TREASURY"
    await db.commit()
    await db.refresh(tds)

    resp = TDSDeductionResponse.model_validate(tds)
    resp.vendor_name = tds.vendor.vendor_name if tds.vendor else None
    resp.contractor_name = tds.contractor.company_name if tds.contractor else None
    resp.voucher_number = tds.voucher.voucher_number if tds.voucher else None
    return resp


# --------------------------------------------------------------------------
# 7. Sub-Registry Registration Fee & Section 53FF AIT Calculator
# --------------------------------------------------------------------------
@router.post("/sub-registry-calc", response_model=SubRegistryCalculationResponse)
async def calculate_sub_registry_fees(payload: SubRegistryCalculationRequest):
    """
    Calculates statutory Bangladesh Sub-Registry deed transfer expenses:
    - Stamp Duty: 1.5%
    - Registration Fee: 1.0%
    - Local Govt Tax: 2.0% (City Corporation / Cantonment / Pourashava)
    - Section 53FF Advance Income Tax (AIT) by location zone:
      * Gulshan, Banani, Baridhara, Motijheel: ৳4,000 / sq metre
      * Dhanmondi, DOHS, Lalmatia, Uttara, Bashundhara: ৳3,000 / sq metre
      * Other Dhaka City Corporation: ৳2,000 / sq metre
      * Other Pourashava / Districts: ৳1,500 / sq metre
    - Bangladesh VAT Act 2012:
      * Residential <= 1,600 sqft: 2.0%
      * Residential > 1,600 sqft: 4.5%
      * Commercial: 7.5%
    """
    deed_val = float(payload.deed_value_bdt)
    sqft = float(payload.apartment_sqft)
    sqm = round(sqft / 10.7639, 2) # 1 sq metre = 10.7639 sqft

    stamp_duty = round(deed_val * 0.015, 2)
    reg_fee = round(deed_val * 0.010, 2)
    local_tax = round(deed_val * 0.020, 2)

    # Section 53FF AIT Rates
    zone_rates = {
        "GULSHAN_BANANI": 4000.0,
        "DHANMONDI_UTTARA": 3000.0,
        "DHAKA_OTHER": 2000.0,
        "OTHER_DISTRICT": 1500.0
    }
    rate_per_sqm = zone_rates.get(payload.zone_category, 2000.0)
    ait_53ff = round(sqm * rate_per_sqm, 2)

    # VAT Act 2012
    prop_type = payload.property_type or "RESIDENTIAL"
    if prop_type == "COMMERCIAL":
        vat_rate = 7.50
    elif sqft <= 1600.0:
        vat_rate = 2.00
    else:
        vat_rate = 4.50

    vat_amt = round(deed_val * (vat_rate / 100.0), 2)
    total_statutory = round(stamp_duty + reg_fee + local_tax + ait_53ff + vat_amt, 2)
    total_cost = round(deed_val + total_statutory, 2)

    return SubRegistryCalculationResponse(
        deed_value_bdt=deed_val,
        apartment_sqft=sqft,
        apartment_sqm=sqm,
        zone_category=payload.zone_category,
        property_type=prop_type,
        stamp_duty_rate_percent=1.50,
        stamp_duty_amount=stamp_duty,
        registration_fee_rate_percent=1.00,
        registration_fee_amount=reg_fee,
        local_govt_tax_rate_percent=2.00,
        local_govt_tax_amount=local_tax,
        ait_rate_per_sqm_bdt=rate_per_sqm,
        ait_section_53ff_amount=ait_53ff,
        vat_rate_percent=vat_rate,
        vat_amount=vat_amt,
        total_statutory_fees_bdt=total_statutory,
        total_transfer_cost_bdt=total_cost
    )


# --------------------------------------------------------------------------
# 8. Multi-Project Cost Centers & Variance Report
# --------------------------------------------------------------------------
@router.get("/cost-centers", response_model=List[CostCenterResponse])
async def list_cost_centers(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List construction cost centers with project details and live spent variance.
    """
    variances = await get_cost_center_variances(db=db, project_id=project_id)
    return variances


@router.post("/cost-centers", response_model=CostCenterResponse, status_code=status.HTTP_201_CREATED)
async def create_cost_center(
    payload: CostCenterCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new multi-dimensional cost center linked to Project and Tower.
    """
    existing = await db.execute(select(CostCenter).where(CostCenter.cost_center_code == payload.cost_center_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Cost center code {payload.cost_center_code} already exists.")

    cc = CostCenter(
        organization_id=1,
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        cost_center_code=payload.cost_center_code,
        name=payload.name,
        wbs_stage=payload.wbs_stage,
        budget_allocated=payload.budget_allocated,
        actual_spent=0.00,
        is_active=payload.is_active
    )
    db.add(cc)
    await db.commit()
    await db.refresh(cc)

    proj_name = None
    if cc.project_id:
        p_res = await db.execute(select(Project.project_name).where(Project.id == cc.project_id))
        proj_name = p_res.scalar()

    resp = CostCenterResponse.model_validate(cc)
    resp.project_name = proj_name
    resp.variance_bdt = float(cc.budget_allocated)
    return resp


@router.get("/cost-centers/variance")
async def get_cost_center_variance_report(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Detailed Budgeted vs Actual Cost Variance Report across WBS stages.
    """
    variances = await get_cost_center_variances(db=db, project_id=project_id)
    total_budget = sum(v["budget_allocated"] for v in variances)
    total_spent = sum(v["actual_spent"] for v in variances)
    net_variance = round(total_budget - total_spent, 2)
    variance_pct = round((net_variance / total_budget * 100.0), 2) if total_budget > 0 else 0.0

    return {
        "project_id": project_id,
        "total_budget_allocated": total_budget,
        "total_actual_spent": total_spent,
        "net_variance_bdt": net_variance,
        "variance_percent": variance_pct,
        "cost_centers": variances
    }


# --------------------------------------------------------------------------
# 9. Fiscal Years Management
# --------------------------------------------------------------------------
@router.get("/fiscal-years", response_model=List[FiscalYearResponse])
async def list_fiscal_years(db: AsyncSession = Depends(get_db)):
    """
    List company financial years.
    """
    res = await db.execute(select(FiscalYear).order_by(FiscalYear.start_date.desc()))
    return res.scalars().all()


@router.post("/fiscal-years", response_model=FiscalYearResponse, status_code=status.HTTP_201_CREATED)
async def create_fiscal_year(
    payload: FiscalYearCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new financial fiscal year.
    """
    existing = await db.execute(select(FiscalYear).where(FiscalYear.year_name == payload.year_name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Fiscal year {payload.year_name} already exists.")

    fy = FiscalYear(
        organization_id=1,
        year_name=payload.year_name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_closed=payload.is_closed
    )
    db.add(fy)
    await db.commit()
    await db.refresh(fy)
    return fy


@router.patch("/fiscal-years/{id}/close", response_model=FiscalYearResponse)
async def close_fiscal_year(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Close a fiscal year for audit lock.
    """
    fy = (await db.execute(select(FiscalYear).where(FiscalYear.id == id))).scalar_one_or_none()
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found.")
    fy.is_closed = True
    await db.commit()
    await db.refresh(fy)
    return fy


# --------------------------------------------------------------------------
# 10. Construction Work In Progress (CWIP) Engine
# --------------------------------------------------------------------------
@router.get("/cwip/summary", response_model=CWIPSummaryResponse)
async def get_cwip_summary(
    project_id: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve project CWIP accumulated expenditure, capitalized COGS, and active balance.
    """
    summary = await get_project_cwip_summary(db=db, project_id=project_id)
    return summary


@router.post("/cwip/capitalize")
async def capitalize_cwip(
    payload: CWIPCapitalizeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Capitalize CWIP construction costs to Cost of Goods Sold (Flats) upon completion / possession.
      DEBIT: Cost of Goods Sold (Flats)
      CREDIT: CWIP Construction Asset
    """
    try:
        result = await post_cwip_capitalization(
            db=db,
            project_id=payload.project_id,
            cwip_account_id=payload.cwip_account_id,
            cogs_account_id=payload.cogs_account_id,
            capitalized_amount=payload.capitalized_amount,
            completion_percentage=payload.completion_percentage,
            cost_center_id=payload.cost_center_id,
            remarks=payload.remarks
        )
        await db.commit()
        return result
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# --------------------------------------------------------------------------
# 11. IFRS-15 Revenue Recognition Engine
# --------------------------------------------------------------------------
@router.post("/ifrs15/recognize")
async def recognize_revenue_ifrs15(
    payload: IFRS15RecognizeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    IFRS 15 Revenue Recognition upon Flat Handover or POC Progress:
      DEBIT: Customer Advance Liability - Flat
      CREDIT: Real Estate Apartment Sales Revenue
    """
    try:
        result = await post_ifrs15_revenue_recognition(
            db=db,
            project_id=payload.project_id,
            booking_id=payload.booking_id,
            advance_liability_account_id=payload.advance_liability_account_id,
            revenue_account_id=payload.revenue_account_id,
            recognized_amount=payload.recognized_amount,
            recognition_method=payload.recognition_method,
            remarks=payload.remarks
        )
        await db.commit()
        return result
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# --------------------------------------------------------------------------
# 12. Post-Dated Cheque (PDC) Vault & Kanban Lifecycle
# --------------------------------------------------------------------------
@router.get("/pdc", response_model=List[PDCVaultResponse])
async def list_pdc_vault(
    project_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve Post-Dated Cheques in Vault, Deposited, Cleared, or Bounced.
    """
    stmt = (
        select(PDCVault)
        .options(selectinload(PDCVault.project))
        .order_by(PDCVault.cheque_date.asc())
    )
    if project_id:
        stmt = stmt.where(PDCVault.project_id == project_id)
    if status:
        stmt = stmt.where(PDCVault.status == status)

    result = await db.execute(stmt)
    pdcs = result.scalars().all()

    resp_list = []
    for p in pdcs:
        r = PDCVaultResponse.model_validate(p)
        r.project_name = p.project.project_name if p.project else None
        resp_list.append(r)
    return resp_list


@router.post("/pdc", response_model=PDCVaultResponse, status_code=status.HTTP_201_CREATED)
async def create_pdc(
    payload: PDCVaultCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new customer post-dated cheque into Safe Vault.
    """
    pdc = PDCVault(
        organization_id=1,
        project_id=payload.project_id,
        booking_id=payload.booking_id,
        cheque_no=payload.cheque_no,
        bank_name=payload.bank_name,
        branch_name=payload.branch_name,
        drawer_name=payload.drawer_name,
        cheque_date=payload.cheque_date,
        amount=payload.amount,
        status="IN_VAULT"
    )
    db.add(pdc)
    await db.commit()
    await db.refresh(pdc)

    p_res = await db.execute(select(Project.project_name).where(Project.id == pdc.project_id))
    proj_name = p_res.scalar()

    r = PDCVaultResponse.model_validate(pdc)
    r.project_name = proj_name
    return r


@router.patch("/pdc/{id}/status", response_model=PDCVaultResponse)
async def update_pdc_status_route(
    id: int,
    payload: PDCStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Transitions PDC lifecycle:
    IN_VAULT -> DEPOSITED -> CLEARED (Auto-posts Bank Receipt) / BOUNCED (flags legal notice).
    """
    try:
        pdc = await update_pdc_vault_status(
            db=db,
            pdc_id=id,
            new_status=payload.status,
            bounce_reason=payload.bounce_reason,
            bank_account_id=payload.bank_account_id
        )
        await db.commit()
        await db.refresh(pdc)

        p_res = await db.execute(select(Project.project_name).where(Project.id == pdc.project_id))
        proj_name = p_res.scalar()

        r = PDCVaultResponse.model_validate(pdc)
        r.project_name = proj_name
        return r
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# --------------------------------------------------------------------------
# 13. Smart Bank Statement Auto-Matching & Reconciliation
# --------------------------------------------------------------------------
@router.post("/bank-reconciliation/auto-match", response_model=BankReconciliationFullResponse)
async def auto_match_bank_statement_route(
    payload: BankStatementAutoMatchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Parses bank transaction statement rows and auto-matches against posted vouchers.
    """
    rows_data = [row.model_dump() for row in payload.rows]
    result = await auto_match_bank_statement(
        db=db,
        bank_account_id=payload.bank_account_id,
        statement_date=payload.statement_date,
        statement_balance=payload.statement_balance,
        statement_rows=rows_data
    )
    await db.commit()
    return result

