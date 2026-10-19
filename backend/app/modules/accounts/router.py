import logging
import hashlib
from decimal import Decimal
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
from app.modules.crm.models import Customer
from app.modules.inventory.models import Unit
from app.modules.accounts.models import (
    ChartOfAccount, Voucher, JournalEntry, BankReconciliation,
    MushakTaxInvoice, TDSDeduction, CostCenter, FiscalYear,
    PDCVault, CWIPCapitalization, IFRS15RevenueRecognition,
    BankStatementItem, APInvoice, APPayment, APAdjustment,
    ARInvoice, ARReceipt, ARReceiptAllocation, ARAdjustment,
    CashBox, PettyCashVoucher, BankAccount, BankTransaction, MFSProvider, MFSTransaction,
    PaymentVoucher
)
from app.modules.accounts.schemas import (
    ChartOfAccountCreate, ChartOfAccountUpdate, ChartOfAccountResponse, ChartOfAccountTreeNode,
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
    BankStatementAutoMatchRequest, BankReconciliationFullResponse,
    GeneralLedgerInquiryResponse, GeneralLedgerLineItem,
    APInvoiceCreate, APInvoiceUpdate, APInvoiceResponse,
    APPaymentCreate, APPaymentResponse,
    APAdjustmentCreate, APAdjustmentResponse,
    APSummaryKPIsResponse, APSupplierStatementResponse, APSupplierLedgerStatementItem,
    ARReceiptCreate, ARReceiptResponse, ARReceiptSummaryKPIs,
    ARReceiptAllocationBase, ARReceiptAllocationCreate, ARMultiAllocationRequest,
    ARReceiptClearVerifyRequest, ARReceiptReverseRequest, ARReceiptRefundRequest,
    ARAdjustmentCreate, ARAdjustmentResponse,
    ARInvoiceCreate, ARInvoiceUpdate, ARInvoiceResponse, ARSummaryKPIsResponse,
    ARCustomerStatementItem, ARCustomerStatementResponse,
    ARAgingAnalysisItem, ARAgingReportResponse,
    MaterialIssueToConstructionRequest, MaterialIssueToConstructionResponse,
    CashBoxCreate, CashBoxUpdate, CashBoxResponse,
    PettyCashVoucherCreate, PettyCashVoucherResponse,
    CashCountAuditRequest, CashTransferRequest,
    BankAccountCreate, BankAccountUpdate, BankAccountResponse,
    BankTransactionCreate, BankTransactionResponse,
    BankTransferRequest, ChequeLeafItem,
    MFSProviderCreate, MFSProviderUpdate, MFSProviderResponse,
    MFSTransactionCreate, MFSTransactionResponse,
    MFSCallbackSimulationRequest, CashBankPositionKPIsResponse,
    PaymentVoucherCreate, PaymentVoucherUpdate, PaymentVoucherWorkflowAction,
    PaymentVoucherResponse, PaymentVoucherKPIsResponse
)
from app.modules.accounts.mushak_generator import generate_mushak_63_pdf
from app.modules.accounts.services import (
    post_vat_mushak_revenue_voucher, build_hierarchical_coa_tree,
    get_cost_center_variances, get_project_cwip_summary,
    post_cwip_capitalization, post_ifrs15_revenue_recognition,
    update_pdc_vault_status, auto_match_bank_statement,
    post_double_entry_voucher, get_default_organization_id, get_or_create_account
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
    parent_account_id: Optional[int] = Query(None),
    is_leaf_account: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(250, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List hierarchical Chart of Accounts with live ledger balances, search and filtering.
    """
    stmt = select(ChartOfAccount).order_by(ChartOfAccount.account_code.asc())
    if account_type:
        stmt = stmt.where(ChartOfAccount.account_type == account_type)
    if parent_account_id is not None:
        stmt = stmt.where(ChartOfAccount.parent_account_id == parent_account_id)
    if is_leaf_account is not None:
        stmt = stmt.where(ChartOfAccount.is_leaf_account == is_leaf_account)
    if search:
        s_pat = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                ChartOfAccount.account_code.ilike(s_pat),
                ChartOfAccount.account_name_en.ilike(s_pat),
                ChartOfAccount.account_name_bn.ilike(s_pat)
            )
        )

    result = await db.execute(stmt.offset(offset).limit(limit))
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
        norm = getattr(acc, "normal_balance", "Debit") or "Debit"
        if norm == "Debit" or acc.account_type in ["Asset", "Expense", "Project_Expense", "Cost_of_Sales", "Operating_Expense", "Finance_Cost"]:
            balance = round(dr - cr, 2)
        else:
            balance = round(cr - dr, 2)

        resp = ChartOfAccountResponse.model_validate(acc)
        resp.current_balance = balance
        resp_list.append(resp)

    return resp_list


@router.get("/coa/{account_id}", response_model=ChartOfAccountResponse)
async def get_chart_of_account_by_id(
    account_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ChartOfAccount).where(ChartOfAccount.id == account_id)
    acc = (await db.execute(stmt)).scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail=f"Account with ID {account_id} not found.")

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
    norm = getattr(acc, "normal_balance", "Debit") or "Debit"
    balance = round(dr - cr, 2) if norm == "Debit" else round(cr - dr, 2)

    resp = ChartOfAccountResponse.model_validate(acc)
    resp.current_balance = balance
    return resp


@router.post("/coa", response_model=ChartOfAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_chart_of_account(
    payload: ChartOfAccountCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new head of account under the Chart of Accounts.
    """
    code_clean = payload.account_code.strip()
    existing = await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == code_clean))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Account code {code_clean} already exists.")

    parent = None
    level = 1
    if payload.parent_account_id:
        parent = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.id == payload.parent_account_id))).scalar_one_or_none()
        if parent:
            level = min(parent.level + 1, 5)

    acc = ChartOfAccount(
        organization_id=payload.organization_id or 1,
        parent_account_id=payload.parent_account_id,
        account_code=code_clean,
        account_name_en=payload.account_name_en.strip(),
        account_name_bn=payload.account_name_bn.strip() if payload.account_name_bn else None,
        account_type=payload.account_type,
        level=level,
        is_group=not payload.is_leaf_account,
        is_leaf_account=payload.is_leaf_account if payload.is_leaf_account is not None else True,
        currency=payload.currency or "BDT",
        is_reconciliation_account=payload.is_reconciliation_account or False,
        is_active=payload.is_active if payload.is_active is not None else True,
        normal_balance=payload.normal_balance or ("Debit" if payload.account_type in ["Asset", "Expense", "Project_Expense", "Cost_of_Sales", "Operating_Expense", "Finance_Cost"] else "Credit"),
        is_control_account=payload.is_control_account or False,
        requires_project=payload.requires_project or False,
        requires_cost_center=payload.requires_cost_center or False,
        statement_mapping=payload.statement_mapping or "Balance Sheet",
        opening_balance=payload.opening_balance or 0.00,
        migration_reference=payload.migration_reference
    )
    db.add(acc)
    await db.commit()
    await db.refresh(acc)

    resp = ChartOfAccountResponse.model_validate(acc)
    resp.current_balance = float(acc.opening_balance or 0.00)
    return resp


@router.put("/coa/{account_id}", response_model=ChartOfAccountResponse)
async def update_chart_of_account(
    account_id: int,
    payload: ChartOfAccountUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ChartOfAccount).where(ChartOfAccount.id == account_id)
    acc = (await db.execute(stmt)).scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail=f"Account with ID {account_id} not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(acc, field, value)

    await db.commit()
    await db.refresh(acc)

    resp = ChartOfAccountResponse.model_validate(acc)
    return resp


# --------------------------------------------------------------------------
# 2. Vouchers & Double-Entry Journal Engine (Financial Safeguard: Sum(Dr) == Sum(Cr))
# --------------------------------------------------------------------------
@router.get("/vouchers", response_model=List[VoucherResponse])
async def list_vouchers(
    voucher_type: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List Double-Entry Vouchers with journal entry rows. Supports pagination, date range, and search.
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
    if date_from:
        stmt = stmt.where(Voucher.voucher_date >= date_from)
    if date_to:
        stmt = stmt.where(Voucher.voucher_date <= date_to)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Voucher.voucher_number.ilike(search_pattern),
                Voucher.narration.ilike(search_pattern)
            )
        )

    result = await db.execute(stmt.offset(offset).limit(limit))
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
                cheque_no=e.cheque_no,
                cheque_date=e.cheque_date,
                bill_reference=e.bill_reference,
                narration=e.narration
            )
            entry_responses.append(entry_resp)
        resp.entries = entry_responses
        resp_list.append(resp)

    return resp_list


@router.get("/vouchers/{voucher_id}", response_model=VoucherResponse)
async def get_voucher_by_id(voucher_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve single voucher with full journal audit trail and line entries.
    """
    stmt = (
        select(Voucher)
        .options(
            selectinload(Voucher.project),
            selectinload(Voucher.created_by),
            selectinload(Voucher.entries).selectinload(JournalEntry.account)
        )
        .where(Voucher.id == voucher_id)
    )
    v = (await db.execute(stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail=f"Voucher #{voucher_id} not found.")

    resp = VoucherResponse.model_validate(v)
    resp.project_name = v.project.project_name if v.project else "Corporate / General"
    resp.created_by_name = v.created_by.full_name_en if v.created_by else "System"
    resp.entries = [
        JournalEntryResponse(
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
            cheque_no=e.cheque_no,
            cheque_date=e.cheque_date,
            bill_reference=e.bill_reference,
            narration=e.narration
        ) for e in v.entries
    ]
    return resp


# --------------------------------------------------------------------------
# 3. General Ledger (GL) Inquiry & Account Statements
# --------------------------------------------------------------------------
@router.get("/ledger", response_model=GeneralLedgerInquiryResponse)
async def get_general_ledger_inquiry(
    account_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    General Ledger (GL) Inquiry and Account Statement.
    Calculates historical opening balance, transaction debit/credits, running balance, and closing balance.
    """
    if not account_id:
        def_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.is_leaf_account == True).order_by(ChartOfAccount.account_code.asc()).limit(1))).scalar_one_or_none()
        if not def_acc:
            raise HTTPException(status_code=404, detail="No active accounts found in Chart of Accounts.")
        account = def_acc
    else:
        account = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.id == account_id))).scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=404, detail=f"Account with ID {account_id} not found.")

    normal_balance = getattr(account, "normal_balance", "Debit") or "Debit"
    initial_opening = float(getattr(account, "opening_balance", 0.0) or 0.0)

    # 1. Calculate historical opening balance up to date_from
    prior_debit = 0.0
    prior_credit = 0.0
    if date_from:
        prior_stmt = (
            select(
                func.coalesce(func.sum(JournalEntry.debit_amount), 0.0),
                func.coalesce(func.sum(JournalEntry.credit_amount), 0.0)
            )
            .join(Voucher, Voucher.id == JournalEntry.voucher_id)
            .where(
                JournalEntry.account_id == account.id,
                Voucher.status == "Posted",
                JournalEntry.voucher_date < date_from
            )
        )
        if project_id:
            prior_stmt = prior_stmt.where(JournalEntry.project_id == project_id)
        p_res = (await db.execute(prior_stmt)).one()
        prior_debit = float(p_res[0])
        prior_credit = float(p_res[1])

    if normal_balance == "Debit":
        opening_balance = initial_opening + (prior_debit - prior_credit)
    else:
        opening_balance = initial_opening + (prior_credit - prior_debit)

    # 2. Query period lines with pagination
    base_stmt = (
        select(JournalEntry)
        .join(Voucher, Voucher.id == JournalEntry.voucher_id)
        .options(
            selectinload(JournalEntry.voucher),
            selectinload(JournalEntry.project),
            selectinload(JournalEntry.cost_center)
        )
        .where(
            JournalEntry.account_id == account.id,
            Voucher.status == "Posted"
        )
    )
    if project_id:
        base_stmt = base_stmt.where(JournalEntry.project_id == project_id)
    if date_from:
        base_stmt = base_stmt.where(JournalEntry.voucher_date >= date_from)
    if date_to:
        base_stmt = base_stmt.where(JournalEntry.voucher_date <= date_to)
    if search:
        s_pat = f"%{search.strip()}%"
        base_stmt = base_stmt.where(
            or_(
                JournalEntry.narration.ilike(s_pat),
                JournalEntry.cheque_no.ilike(s_pat),
                JournalEntry.bill_reference.ilike(s_pat),
                Voucher.voucher_number.ilike(s_pat)
            )
        )

    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total_items = (await db.execute(count_stmt)).scalar() or 0

    stmt = base_stmt.order_by(JournalEntry.voucher_date.asc(), JournalEntry.id.asc()).offset(offset).limit(limit)
    entries = (await db.execute(stmt)).scalars().all()

    running = opening_balance
    total_dr = 0.0
    total_cr = 0.0
    items: List[GeneralLedgerLineItem] = []

    for e in entries:
        dr = float(e.debit_amount or 0.0)
        cr = float(e.credit_amount or 0.0)
        total_dr += dr
        total_cr += cr

        if normal_balance == "Debit":
            running += (dr - cr)
        else:
            running += (cr - dr)

        items.append(GeneralLedgerLineItem(
            journal_entry_id=e.id,
            voucher_id=e.voucher_id,
            voucher_number=e.voucher.voucher_number if e.voucher else f"VCH-{e.voucher_id}",
            voucher_type=e.voucher.voucher_type if e.voucher else "Journal",
            voucher_date=e.voucher_date,
            narration=e.narration or (e.voucher.narration if e.voucher else ""),
            project_id=e.project_id,
            project_name=e.project.project_name if e.project else None,
            cost_center_id=e.cost_center_id,
            cost_center_name=e.cost_center.name if e.cost_center else None,
            cheque_no=e.cheque_no,
            cheque_date=e.cheque_date,
            bill_reference=e.bill_reference,
            debit_amount=dr,
            credit_amount=cr,
            running_balance=round(running, 2)
        ))

    closing_balance = round(running, 2)

    project_name = None
    if project_id:
        p_obj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
        project_name = p_obj.project_name if p_obj else f"Project #{project_id}"

    return GeneralLedgerInquiryResponse(
        account_id=account.id,
        account_code=account.account_code,
        account_name_en=account.account_name_en,
        account_name_bn=account.account_name_bn,
        account_type=account.account_type,
        normal_balance=normal_balance,
        currency=account.currency or "BDT",
        statement_mapping=getattr(account, "statement_mapping", "Balance Sheet"),
        project_name=project_name,
        date_from=date_from,
        date_to=date_to,
        opening_balance=round(opening_balance, 2),
        total_debit=round(total_dr, 2),
        total_credit=round(total_cr, 2),
        closing_balance=closing_balance,
        total_items=total_items,
        limit=limit,
        offset=offset,
        items=items,
        entries=items
    )


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


# --------------------------------------------------------------------------
# 14. Accounts Payable (AP) & Supplier/Contractor Bill Management
# --------------------------------------------------------------------------

@router.get("/payables/kpis", response_model=APSummaryKPIsResponse)
async def get_ap_summary_kpis(
    project_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns high-level AP overview KPIs (Total payables, balance due, overdue volume).
    """
    stmt = select(APInvoice)
    if project_id:
        stmt = stmt.where(APInvoice.project_id == project_id)
    
    invoices = (await db.execute(stmt)).scalars().all()
    today = date.today()

    total_gross = sum(float(inv.gross_amount or 0.0) for inv in invoices)
    total_net = sum(float(inv.net_payable_amount or 0.0) for inv in invoices)
    total_paid = sum(float(inv.paid_amount or 0.0) for inv in invoices)
    total_balance = sum(float(inv.balance_due or 0.0) for inv in invoices if inv.status != "Cancelled")
    
    overdue_invoices = [inv for inv in invoices if inv.due_date < today and inv.balance_due > 0 and inv.status not in ["Paid", "Cancelled"]]
    total_overdue = sum(float(inv.balance_due or 0.0) for inv in overdue_invoices)
    pending_appr = sum(1 for inv in invoices if inv.status in ["Draft", "Pending_Verification"])

    return APSummaryKPIsResponse(
        total_invoices_count=len(invoices),
        total_gross_amount=round(total_gross, 2),
        total_net_payable=round(total_net, 2),
        total_paid_amount=round(total_paid, 2),
        total_balance_due=round(total_balance, 2),
        total_overdue_amount=round(total_overdue, 2),
        overdue_count=len(overdue_invoices),
        pending_approval_count=pending_appr
    )


@router.get("/payables", response_model=List[APInvoiceResponse])
async def get_ap_invoices(
    search: Optional[str] = None,
    invoice_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    project_id: Optional[int] = None,
    vendor_id: Optional[int] = None,
    contractor_id: Optional[int] = None,
    due_date_from: Optional[date] = None,
    due_date_to: Optional[date] = None,
    is_overdue: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Paginated AP invoices register with dimensions and 3-way matching status.
    """
    stmt = (
        select(APInvoice)
        .options(
            selectinload(APInvoice.project),
            selectinload(APInvoice.vendor),
            selectinload(APInvoice.contractor),
            selectinload(APInvoice.cost_center),
            selectinload(APInvoice.expense_account),
            selectinload(APInvoice.liability_account),
            selectinload(APInvoice.voucher),
            selectinload(APInvoice.approved_by),
            selectinload(APInvoice.payments),
            selectinload(APInvoice.adjustments)
        )
    )

    if invoice_type:
        stmt = stmt.where(APInvoice.invoice_type == invoice_type)
    if status_filter:
        stmt = stmt.where(APInvoice.status == status_filter)
    if project_id:
        stmt = stmt.where(APInvoice.project_id == project_id)
    if vendor_id:
        stmt = stmt.where(APInvoice.vendor_id == vendor_id)
    if contractor_id:
        stmt = stmt.where(APInvoice.contractor_id == contractor_id)
    if due_date_from:
        stmt = stmt.where(APInvoice.due_date >= due_date_from)
    if due_date_to:
        stmt = stmt.where(APInvoice.due_date <= due_date_to)
    if is_overdue:
        stmt = stmt.where(
            APInvoice.due_date < date.today(),
            APInvoice.balance_due > 0,
            APInvoice.status.notin_(["Paid", "Cancelled"])
        )

    if search:
        s_pat = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                APInvoice.invoice_number.ilike(s_pat),
                APInvoice.payee_name.ilike(s_pat),
                APInvoice.description.ilike(s_pat)
            )
        )

    stmt = stmt.order_by(APInvoice.due_date.asc(), APInvoice.id.desc()).offset(offset).limit(limit)
    invoices = (await db.execute(stmt)).scalars().all()

    resp_list: List[APInvoiceResponse] = []
    for inv in invoices:
        resp = APInvoiceResponse.model_validate(inv)
        resp.project_name = inv.project.project_name if inv.project else "Corporate / General"
        resp.vendor_name = inv.vendor.vendor_name if inv.vendor else None
        resp.contractor_name = inv.contractor.company_name if inv.contractor else None
        resp.cost_center_name = inv.cost_center.name if inv.cost_center else None
        resp.expense_account_name = inv.expense_account.account_name_en if inv.expense_account else None
        resp.liability_account_name = inv.liability_account.account_name_en if inv.liability_account else None
        resp.voucher_number = inv.voucher.voucher_number if inv.voucher else None
        resp.approved_by_name = inv.approved_by.full_name_en if inv.approved_by else None
        resp_list.append(resp)

    return resp_list


@router.get("/payables/{invoice_id}", response_model=APInvoiceResponse)
async def get_ap_invoice_by_id(
    invoice_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get full single AP invoice with 3-way matching details, payments, and adjustments.
    """
    stmt = (
        select(APInvoice)
        .options(
            selectinload(APInvoice.project),
            selectinload(APInvoice.vendor),
            selectinload(APInvoice.contractor),
            selectinload(APInvoice.cost_center),
            selectinload(APInvoice.expense_account),
            selectinload(APInvoice.liability_account),
            selectinload(APInvoice.voucher),
            selectinload(APInvoice.approved_by),
            selectinload(APInvoice.payments),
            selectinload(APInvoice.adjustments)
        )
        .where(APInvoice.id == invoice_id)
    )
    inv = (await db.execute(stmt)).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail=f"AP Invoice #{invoice_id} not found.")

    resp = APInvoiceResponse.model_validate(inv)
    resp.project_name = inv.project.project_name if inv.project else "Corporate / General"
    resp.vendor_name = inv.vendor.vendor_name if inv.vendor else None
    resp.contractor_name = inv.contractor.company_name if inv.contractor else None
    resp.cost_center_name = inv.cost_center.name if inv.cost_center else None
    resp.expense_account_name = inv.expense_account.account_name_en if inv.expense_account else None
    resp.liability_account_name = inv.liability_account.account_name_en if inv.liability_account else None
    resp.voucher_number = inv.voucher.voucher_number if inv.voucher else None
    resp.approved_by_name = inv.approved_by.full_name_en if inv.approved_by else None
    return resp


@router.post("/payables", response_model=APInvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_ap_invoice(
    payload: APInvoiceCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new Accounts Payable invoice or contractor bill.
    ENFORCES:
    1. Duplicate Invoice Detection: rejects duplicate invoice_number for the same vendor/payee.
    2. Automatic net calculation: gross - (TDS + VDS + retention + other deductions).
    3. Optional GL accrual voucher on approval.
    """
    inv_num_clean = payload.invoice_number.strip()

    # 1. Duplicate Invoice Detection
    dup_stmt = select(APInvoice).where(
        APInvoice.invoice_number.ilike(inv_num_clean),
        or_(
            APInvoice.vendor_id == payload.vendor_id if payload.vendor_id else False,
            APInvoice.contractor_id == payload.contractor_id if payload.contractor_id else False,
            APInvoice.payee_name.ilike(payload.payee_name.strip())
        )
    )
    existing = (await db.execute(dup_stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"DUPLICATE INVOICE DETECTED: Invoice '{inv_num_clean}' has already been registered on {existing.invoice_date} (ID #{existing.id}) for '{payload.payee_name}'."
        )

    # 2. Financial calculation
    gross = float(payload.gross_amount)
    tds = float(payload.tax_withholding_tds or 0.0)
    vds = float(payload.vat_withholding_vds or 0.0)
    retention = float(payload.retention_amount or 0.0)
    other = float(payload.other_deductions or 0.0)
    net_payable = round(gross - (tds + vds + retention + other), 2)
    if net_payable < 0:
        raise HTTPException(status_code=400, detail="Total deductions cannot exceed gross invoice amount.")

    inv_date = payload.invoice_date or date.today()
    status_val = "Approved" if payload.auto_approve else "Draft"
    match_val = "MATCHED_OK" if payload.po_id or payload.grn_id else "NOT_APPLICABLE"

    invoice = APInvoice(
        invoice_number=inv_num_clean,
        invoice_type=payload.invoice_type,
        invoice_date=inv_date,
        due_date=payload.due_date,
        vendor_id=payload.vendor_id,
        contractor_id=payload.contractor_id,
        payee_name=payload.payee_name.strip(),
        project_id=payload.project_id,
        cost_center_id=payload.cost_center_id,
        expense_account_id=payload.expense_account_id,
        liability_account_id=payload.liability_account_id,
        po_id=payload.po_id,
        grn_id=payload.grn_id,
        ra_bill_id=payload.ra_bill_id,
        gross_amount=gross,
        tax_withholding_tds=tds,
        vat_withholding_vds=vds,
        retention_amount=retention,
        other_deductions=other,
        net_payable_amount=net_payable,
        paid_amount=0.00,
        balance_due=net_payable,
        three_way_match_status=match_val,
        status=status_val,
        description=payload.description.strip() if payload.description else None,
        approved_at=datetime.now() if payload.auto_approve else None
    )
    db.add(invoice)
    await db.flush()

    # If auto-approved, post double-entry GL accrual voucher
    if payload.auto_approve:
        exp_id = payload.expense_account_id
        if not exp_id:
            # Fallback to standard project expense or COGS head (6100 or 5100)
            def_exp = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["6100", "5100", "1220"])).limit(1))).scalar_one_or_none()
            exp_id = def_exp.id if def_exp else 1

        liab_id = payload.liability_account_id
        if not liab_id:
            # Fallback to Supplier Payables head (2110)
            def_liab = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["2110", "2000"])).limit(1))).scalar_one_or_none()
            liab_id = def_liab.id if def_liab else 2

        v_num = f"JV-AP-{invoice.id:04d}-{date.today().strftime('%Y%m')}"
        v = Voucher(
            organization_id=1,
            project_id=payload.project_id,
            voucher_number=v_num,
            voucher_type="Journal",
            voucher_date=inv_date,
            narration=f"AP Accrual for Invoice {inv_num_clean} ({payload.payee_name})",
            total_debit_amount=gross,
            total_credit_amount=gross,
            status="Posted",
            source_document_type="Supplier_Bill",
            source_document_id=invoice.id,
            posted_at=datetime.now()
        )
        db.add(v)
        await db.flush()

        # Debit Expense/CWIP, Credit Payables (+ Credit TDS/VDS if applicable)
        e1 = JournalEntry(
            voucher_id=v.id,
            voucher_date=inv_date,
            project_id=payload.project_id,
            cost_center_id=payload.cost_center_id,
            account_id=exp_id,
            debit_amount=gross,
            credit_amount=0.00,
            bill_reference=inv_num_clean,
            narration=f"Expense accrual: {payload.payee_name}"
        )
        e2 = JournalEntry(
            voucher_id=v.id,
            voucher_date=inv_date,
            project_id=payload.project_id,
            cost_center_id=payload.cost_center_id,
            account_id=liab_id,
            debit_amount=0.00,
            credit_amount=net_payable,
            bill_reference=inv_num_clean,
            narration=f"Payable recognized: {payload.payee_name}"
        )
        db.add_all([e1, e2])

        # If TDS/VDS deducted, record liability lines
        tax_total = tds + vds + retention + other
        if tax_total > 0:
            tax_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "2130").limit(1))).scalar_one_or_none()
            tax_acc_id = tax_acc.id if tax_acc else liab_id
            e3 = JournalEntry(
                voucher_id=v.id,
                voucher_date=inv_date,
                project_id=payload.project_id,
                cost_center_id=payload.cost_center_id,
                account_id=tax_acc_id,
                debit_amount=0.00,
                credit_amount=round(tax_total, 2),
                bill_reference=inv_num_clean,
                narration=f"Statutory withholding TDS/VDS/Retention: {payload.payee_name}"
            )
            db.add(e3)

        invoice.voucher_id = v.id

    await db.commit()
    await db.refresh(invoice)
    return await get_ap_invoice_by_id(invoice.id, db)


@router.put("/payables/{invoice_id}", response_model=APInvoiceResponse)
async def update_ap_invoice(
    invoice_id: int,
    payload: APInvoiceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update editable fields of an AP invoice.
    """
    inv = await db.get(APInvoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"AP Invoice #{invoice_id} not found.")

    if payload.due_date is not None:
        inv.due_date = payload.due_date
    if payload.description is not None:
        inv.description = payload.description.strip()
    if payload.status is not None:
        inv.status = payload.status

    # Recalculate deductions if modified
    recalc = False
    if payload.tax_withholding_tds is not None:
        inv.tax_withholding_tds = payload.tax_withholding_tds
        recalc = True
    if payload.vat_withholding_vds is not None:
        inv.vat_withholding_vds = payload.vat_withholding_vds
        recalc = True
    if payload.retention_amount is not None:
        inv.retention_amount = payload.retention_amount
        recalc = True
    if payload.other_deductions is not None:
        inv.other_deductions = payload.other_deductions
        recalc = True

    if recalc:
        gross = float(inv.gross_amount)
        ded = float(inv.tax_withholding_tds) + float(inv.vat_withholding_vds) + float(inv.retention_amount) + float(inv.other_deductions)
        inv.net_payable_amount = round(gross - ded, 2)
        inv.balance_due = round(inv.net_payable_amount - float(inv.paid_amount), 2)

    await db.commit()
    return await get_ap_invoice_by_id(invoice_id, db)


@router.post("/payables/{invoice_id}/approve", response_model=APInvoiceResponse)
async def approve_ap_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Approve an AP invoice and commit the GL accrual journal voucher.
    """
    inv = await db.get(APInvoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"AP Invoice #{invoice_id} not found.")

    inv.status = "Approved"
    inv.approved_at = datetime.now()
    inv.three_way_match_status = "MATCHED_OK"

    # Post GL voucher if not already posted
    if not inv.voucher_id:
        exp_id = inv.expense_account_id
        if not exp_id:
            def_exp = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["6100", "5100", "1220"])).limit(1))).scalar_one_or_none()
            exp_id = def_exp.id if def_exp else 1

        liab_id = inv.liability_account_id
        if not liab_id:
            def_liab = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["2110", "2000"])).limit(1))).scalar_one_or_none()
            liab_id = def_liab.id if def_liab else 2

        gross = float(inv.gross_amount)
        net_payable = float(inv.net_payable_amount)
        v_num = f"JV-AP-{inv.id:04d}-{date.today().strftime('%Y%m')}"

        v = Voucher(
            organization_id=1,
            project_id=inv.project_id,
            voucher_number=v_num,
            voucher_type="Journal",
            voucher_date=inv.invoice_date,
            narration=f"AP Accrual for Invoice {inv.invoice_number} ({inv.payee_name})",
            total_debit_amount=gross,
            total_credit_amount=gross,
            status="Posted",
            source_document_type="Supplier_Bill",
            source_document_id=inv.id,
            posted_at=datetime.now()
        )
        db.add(v)
        await db.flush()

        e1 = JournalEntry(
            voucher_id=v.id,
            voucher_date=inv.invoice_date,
            project_id=inv.project_id,
            cost_center_id=inv.cost_center_id,
            account_id=exp_id,
            debit_amount=gross,
            credit_amount=0.00,
            bill_reference=inv.invoice_number,
            narration=f"Expense: {inv.payee_name}"
        )
        e2 = JournalEntry(
            voucher_id=v.id,
            voucher_date=inv.invoice_date,
            project_id=inv.project_id,
            cost_center_id=inv.cost_center_id,
            account_id=liab_id,
            debit_amount=0.00,
            credit_amount=net_payable,
            bill_reference=inv.invoice_number,
            narration=f"Supplier Payable: {inv.payee_name}"
        )
        db.add_all([e1, e2])

        tax_total = round(gross - net_payable, 2)
        if tax_total > 0:
            tax_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "2130").limit(1))).scalar_one_or_none()
            tax_acc_id = tax_acc.id if tax_acc else liab_id
            e3 = JournalEntry(
                voucher_id=v.id,
                voucher_date=inv.invoice_date,
                project_id=inv.project_id,
                cost_center_id=inv.cost_center_id,
                account_id=tax_acc_id,
                debit_amount=0.00,
                credit_amount=tax_total,
                bill_reference=inv.invoice_number,
                narration=f"Withholding Tax/Retention: {inv.payee_name}"
            )
            db.add(e3)

        inv.voucher_id = v.id

    await db.commit()
    return await get_ap_invoice_by_id(invoice_id, db)


@router.post("/payables/{invoice_id}/payments", response_model=APPaymentResponse, status_code=status.HTTP_201_CREATED)
async def record_ap_payment(
    invoice_id: int,
    payload: APPaymentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Disburse partial or full payment against an AP invoice.
    Updates balance_due and automatically posts a GL Bank/Cash Payment Voucher.
    """
    inv = await db.get(APInvoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"AP Invoice #{invoice_id} not found.")

    if inv.status in ["Draft", "Cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot record payment against a Draft or Cancelled invoice. Please approve first.")

    pay_amt = float(payload.amount)
    if pay_amt <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    cur_bal = float(inv.balance_due)
    if pay_amt > cur_bal + 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Disbursement of ৳ {pay_amt:,.2f} exceeds remaining balance due of ৳ {cur_bal:,.2f}."
        )

    # 1. Generate Payment Number
    pay_num = f"PAY-{datetime.now().strftime('%Y%m')}-{invoice_id:04d}-{int(datetime.now().timestamp()) % 1000:03d}"
    pay_date = payload.payment_date or date.today()

    # 2. Select Bank or Cash Account
    bank_id = payload.bank_account_id
    if not bank_id:
        def_bank = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "1120").limit(1))).scalar_one_or_none()
        bank_id = def_bank.id if def_bank else 1

    liab_id = inv.liability_account_id
    if not liab_id:
        def_liab = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "2110").limit(1))).scalar_one_or_none()
        liab_id = def_liab.id if def_liab else 2

    # 3. Post GL Payment Voucher (BP or CP)
    v_type = "Cash_Payment" if payload.payment_method == "Cash" else "Bank_Payment"
    v_prefix = "CP" if v_type == "Cash_Payment" else "BP"
    v_num = f"{v_prefix}-{datetime.now().strftime('%Y%m')}-{pay_num[-6:]}"

    v = Voucher(
        organization_id=1,
        project_id=inv.project_id,
        voucher_number=v_num,
        voucher_type=v_type,
        voucher_date=pay_date,
        narration=f"Disbursement to {inv.payee_name} against Inv #{inv.invoice_number} ({payload.payment_method})",
        total_debit_amount=pay_amt,
        total_credit_amount=pay_amt,
        status="Posted",
        source_document_type="AP_Payment",
        source_document_id=invoice_id,
        posted_at=datetime.now()
    )
    db.add(v)
    await db.flush()

    # Double-entry lines: Debit Supplier Payables, Credit Bank/Cash
    e1 = JournalEntry(
        voucher_id=v.id,
        voucher_date=pay_date,
        project_id=inv.project_id,
        cost_center_id=inv.cost_center_id,
        account_id=liab_id,
        debit_amount=pay_amt,
        credit_amount=0.00,
        cheque_no=payload.cheque_number,
        cheque_date=payload.cheque_date,
        bill_reference=inv.invoice_number,
        narration=f"Payment settlement: {inv.payee_name}"
    )
    e2 = JournalEntry(
        voucher_id=v.id,
        voucher_date=pay_date,
        project_id=inv.project_id,
        cost_center_id=inv.cost_center_id,
        account_id=bank_id,
        debit_amount=0.00,
        credit_amount=pay_amt,
        cheque_no=payload.cheque_number,
        cheque_date=payload.cheque_date,
        bill_reference=inv.invoice_number,
        narration=f"Disbursement via {payload.payment_method}"
    )
    db.add_all([e1, e2])

    # 4. Create APPayment Record
    payment = APPayment(
        organization_id=1,
        invoice_id=inv.id,
        payment_number=pay_num,
        payment_date=pay_date,
        amount=pay_amt,
        payment_method=payload.payment_method,
        bank_account_id=bank_id,
        cheque_number=payload.cheque_number,
        cheque_date=payload.cheque_date,
        transaction_reference=payload.transaction_reference,
        voucher_id=v.id,
        notes=payload.notes
    )
    db.add(payment)

    # 5. Update Invoice status & balance
    inv.paid_amount = round(float(inv.paid_amount) + pay_amt, 2)
    inv.balance_due = round(float(inv.net_payable_amount) - float(inv.paid_amount), 2)
    if inv.balance_due <= 0.009:
        inv.balance_due = 0.00
        inv.status = "Paid"
    else:
        inv.status = "Partially_Paid"

    await db.commit()
    await db.refresh(payment)
    return APPaymentResponse.model_validate(payment)


@router.post("/payables/{invoice_id}/adjustments", response_model=APAdjustmentResponse, status_code=status.HTTP_201_CREATED)
async def record_ap_adjustment(
    invoice_id: int,
    payload: APAdjustmentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Record Debit Note or Credit Note against an AP invoice.
    Debit Note reduces payable balance; Credit Note increases payable balance.
    """
    inv = await db.get(APInvoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"AP Invoice #{invoice_id} not found.")

    adj_amt = float(payload.amount)
    if adj_amt <= 0:
        raise HTTPException(status_code=400, detail="Adjustment amount must be positive.")

    adj_num = f"ADJ-{payload.adjustment_type[:2].upper()}-{datetime.now().strftime('%Y%m')}-{invoice_id:04d}-{int(datetime.now().timestamp()) % 1000:03d}"
    adj_date = payload.adjustment_date or date.today()

    adj = APAdjustment(
        organization_id=1,
        invoice_id=inv.id,
        vendor_id=inv.vendor_id,
        contractor_id=inv.contractor_id,
        adjustment_number=adj_num,
        adjustment_type=payload.adjustment_type,
        adjustment_date=adj_date,
        amount=adj_amt,
        reason=payload.reason.strip()
    )
    db.add(adj)

    # Adjust invoice net and balance
    if payload.adjustment_type in ["Debit_Note", "Retention_Holdback", "TDS_VDS_Tax"]:
        inv.net_payable_amount = round(float(inv.net_payable_amount) - adj_amt, 2)
    else: # Credit_Note
        inv.net_payable_amount = round(float(inv.net_payable_amount) + adj_amt, 2)

    inv.balance_due = round(float(inv.net_payable_amount) - float(inv.paid_amount), 2)
    if inv.balance_due <= 0:
        inv.status = "Paid"

    await db.commit()
    await db.refresh(adj)
    return APAdjustmentResponse.model_validate(adj)


@router.get("/payables/ledger/statement", response_model=APSupplierStatementResponse)
async def get_ap_supplier_statement(
    vendor_id: Optional[int] = None,
    contractor_id: Optional[int] = None,
    payee_name: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Supplier & Contractor Statement: Invoices, disbursements, adjustments with running payable balance.
    """
    if not vendor_id and not contractor_id and not payee_name:
        # Default to first vendor with invoices
        first_inv = (await db.execute(select(APInvoice).where(APInvoice.vendor_id.isnot(None)).limit(1))).scalar_one_or_none()
        if first_inv:
            vendor_id = first_inv.vendor_id
        else:
            raise HTTPException(status_code=400, detail="Please specify vendor_id, contractor_id, or payee_name.")

    target_name = payee_name or "Payee"
    payee_type = "Vendor" if vendor_id else ("Contractor" if contractor_id else "Other")

    if vendor_id:
        v_obj = await db.get(Vendor, vendor_id)
        if v_obj:
            target_name = v_obj.vendor_name
    elif contractor_id:
        c_obj = await db.get(Subcontractor, contractor_id)
        if c_obj:
            target_name = c_obj.company_name

    # Fetch all invoices for payee
    inv_stmt = select(APInvoice).options(selectinload(APInvoice.project))
    if vendor_id:
        inv_stmt = inv_stmt.where(APInvoice.vendor_id == vendor_id)
    elif contractor_id:
        inv_stmt = inv_stmt.where(APInvoice.contractor_id == contractor_id)
    else:
        inv_stmt = inv_stmt.where(APInvoice.payee_name.ilike(f"%{payee_name}%"))

    invoices = (await db.execute(inv_stmt)).scalars().all()
    inv_ids = [inv.id for inv in invoices]

    payments: List[APPayment] = []
    adjustments: List[APAdjustment] = []

    if inv_ids:
        pay_stmt = select(APPayment).where(APPayment.invoice_id.in_(inv_ids)).order_by(APPayment.payment_date.asc())
        payments = (await db.execute(pay_stmt)).scalars().all()

        adj_stmt = select(APAdjustment).where(APAdjustment.invoice_id.in_(inv_ids)).order_by(APAdjustment.adjustment_date.asc())
        adjustments = (await db.execute(adj_stmt)).scalars().all()

    # Combine timeline events
    timeline = []
    for inv in invoices:
        timeline.append({
            "date": inv.invoice_date,
            "type": "Invoice",
            "ref": inv.invoice_number,
            "desc": f"Bill/Invoice: {inv.description or inv.invoice_type}",
            "project": inv.project.project_name if inv.project else "Corporate",
            "debit": 0.0,
            "credit": float(inv.net_payable_amount)
        })

    for p in payments:
        timeline.append({
            "date": p.payment_date,
            "type": "Payment",
            "ref": p.payment_number,
            "desc": f"Disbursement via {p.payment_method} ({p.cheque_number or p.transaction_reference or 'EFT'})",
            "project": "Corporate Payment",
            "debit": float(p.amount),
            "credit": 0.0
        })

    for a in adjustments:
        is_dr = a.adjustment_type in ["Debit_Note", "Retention_Holdback", "TDS_VDS_Tax"]
        timeline.append({
            "date": a.adjustment_date,
            "type": a.adjustment_type,
            "ref": a.adjustment_number,
            "desc": f"Adjustment: {a.reason}",
            "project": "Accounting Adjustment",
            "debit": float(a.amount) if is_dr else 0.0,
            "credit": 0.0 if is_dr else float(a.amount)
        })

    # Sort chronologically
    timeline.sort(key=lambda x: x["date"])

    running = 0.0
    items: List[APSupplierLedgerStatementItem] = []
    tot_inv = 0.0
    tot_disb = 0.0

    for ev in timeline:
        if date_from and ev["date"] < date_from:
            running += (ev["credit"] - ev["debit"])
            continue
        if date_to and ev["date"] > date_to:
            continue

        running += (ev["credit"] - ev["debit"])
        tot_inv += ev["credit"]
        tot_disb += ev["debit"]

        items.append(APSupplierLedgerStatementItem(
            transaction_date=ev["date"],
            transaction_type=ev["type"],
            reference_number=ev["ref"],
            description=ev["desc"],
            project_name=ev["project"],
            debit_disbursement=round(ev["debit"], 2),
            credit_payable=round(ev["credit"], 2),
            running_payable_balance=round(running, 2)
        ))

    return APSupplierStatementResponse(
        payee_type=payee_type,
        payee_id=vendor_id or contractor_id,
        payee_name=target_name,
        date_from=date_from,
        date_to=date_to,
        opening_balance=0.00,
        total_invoiced=round(tot_inv, 2),
        total_disbursed=round(tot_disb, 2),
        closing_balance=round(running, 2),
        items=items
    )


# --------------------------------------------------------------------------
# 6. Material Issue from Inventory to Construction CWIP (User Refinement)
# --------------------------------------------------------------------------
@router.post("/payables/inventory/issue-to-construction", response_model=MaterialIssueToConstructionResponse, status_code=status.HTTP_201_CREATED)
async def issue_material_to_construction(
    payload: MaterialIssueToConstructionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Transfers construction material cost from Project Inventory (1400/1150)
    to Capital Work-in-Progress (CWIP 1220) upon issuance to site construction.
    Avoids immediate premature expensing while materials remain in inventory.
    """
    proj = await db.get(Project, payload.project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project #{payload.project_id} not found.")

    amt = float(payload.amount)
    if amt <= 0:
        raise HTTPException(status_code=400, detail="Issue amount must be greater than zero.")

    # Determine Inventory Asset account (Default 1400 or 1150)
    inv_acc_id = payload.material_inventory_account_id
    if not inv_acc_id:
        def_inv = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["1400", "1150"])).limit(1))).scalar_one_or_none()
        inv_acc_id = def_inv.id if def_inv else 1

    # Determine CWIP account (Default 1220)
    cwip_acc_id = payload.cwip_account_id
    if not cwip_acc_id:
        def_cwip = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["1220", "1200"])).limit(1))).scalar_one_or_none()
        cwip_acc_id = def_cwip.id if def_cwip else 1

    inv_acc = await db.get(ChartOfAccount, inv_acc_id)
    cwip_acc = await db.get(ChartOfAccount, cwip_acc_id)

    issue_date = payload.issue_date or date.today()
    v_num = f"JV-MAT-ISSUE-{datetime.now().strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"

    v = Voucher(
        organization_id=1,
        project_id=payload.project_id,
        voucher_number=v_num,
        voucher_type="Journal",
        voucher_date=issue_date,
        narration=f"Materials Issued to Construction: {payload.materials_description} (Project: {proj.project_name})",
        total_debit_amount=amt,
        total_credit_amount=amt,
        status="Posted",
        source_document_type="Material_Issue_Slip",
        source_document_id=payload.project_id,
        posted_at=datetime.now()
    )
    db.add(v)
    await db.flush()

    e1 = JournalEntry(
        voucher_id=v.id,
        voucher_date=issue_date,
        project_id=payload.project_id,
        account_id=cwip_acc_id,
        debit_amount=amt,
        credit_amount=0.00,
        bill_reference=payload.issue_slip_number or "STORE-ISSUE",
        narration=f"CWIP addition: {payload.materials_description}"
    )
    e2 = JournalEntry(
        voucher_id=v.id,
        voucher_date=issue_date,
        project_id=payload.project_id,
        account_id=inv_acc_id,
        debit_amount=0.00,
        credit_amount=amt,
        bill_reference=payload.issue_slip_number or "STORE-ISSUE",
        narration=f"Inventory transfer out: {payload.materials_description}"
    )
    db.add_all([e1, e2])
    await db.commit()

    return MaterialIssueToConstructionResponse(
        voucher_id=v.id,
        voucher_number=v.voucher_number,
        project_id=payload.project_id,
        project_name=proj.project_name,
        issued_amount=amt,
        from_account=inv_acc.account_name_en if inv_acc else "Project Inventory",
        to_account=cwip_acc.account_name_en if cwip_acc else "Capital Work-in-Progress",
        narration=v.narration,
        posted_at=v.posted_at
    )


# --------------------------------------------------------------------------
# 7. Accounts Receivable (AR) & Customer Demand Notices
# --------------------------------------------------------------------------

@router.get("/receivables/kpis", response_model=ARSummaryKPIsResponse)
async def get_ar_summary_kpis(
    project_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Real-Time Accounts Receivable Executive KPIs:
    Gross demand, net receivables, collections, unallocated advance cash, overdue balances.
    """
    stmt = select(ARInvoice)
    if project_id:
        stmt = stmt.where(ARInvoice.project_id == project_id)
    if customer_id:
        stmt = stmt.where(ARInvoice.customer_id == customer_id)

    invoices = (await db.execute(stmt)).scalars().all()

    tot_gross = 0.0
    tot_net = 0.0
    tot_coll = 0.0
    tot_bal = 0.0
    tot_overdue = 0.0
    overdue_cnt = 0
    disputed_cnt = 0
    today = date.today()

    for inv in invoices:
        tot_gross += float(inv.gross_amount)
        tot_net += float(inv.net_receivable_amount)
        tot_coll += float(inv.collected_amount)
        tot_bal += float(inv.balance_due)

        if inv.status in ["Disputed"] or inv.collection_followup_status in ["Disputed"]:
            disputed_cnt += 1

        if inv.due_date < today and float(inv.balance_due) > 0 and inv.status not in ["Cancelled", "Collected"]:
            tot_overdue += float(inv.balance_due)
            overdue_cnt += 1

    # Unallocated cash advance receipts
    rcpt_stmt = select(func.coalesce(func.sum(ARReceipt.unallocated_amount), 0.0))
    if customer_id:
        rcpt_stmt = rcpt_stmt.where(ARReceipt.customer_id == customer_id)
    if project_id:
        rcpt_stmt = rcpt_stmt.where(ARReceipt.project_id == project_id)

    tot_unalloc = float((await db.execute(rcpt_stmt)).scalar() or 0.0)

    return ARSummaryKPIsResponse(
        total_invoices_count=len(invoices),
        total_gross_demand=round(tot_gross, 2),
        total_net_receivable=round(tot_net, 2),
        total_collected_amount=round(tot_coll, 2),
        total_balance_due=round(tot_bal, 2),
        total_unallocated_cash=round(tot_unalloc, 2),
        total_overdue_amount=round(tot_overdue, 2),
        overdue_count=overdue_cnt,
        disputed_count=disputed_cnt
    )


@router.get("/receivables", response_model=List[ARInvoiceResponse])
async def list_ar_invoices(
    search: Optional[str] = None,
    invoice_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    project_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    due_date_from: Optional[date] = None,
    due_date_to: Optional[date] = None,
    is_overdue: Optional[bool] = None,
    aging_bucket: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Paginated list of customer demand notices & invoices with aging filters.
    """
    stmt = (
        select(ARInvoice)
        .options(
            selectinload(ARInvoice.project),
            selectinload(ARInvoice.unit),
            selectinload(ARInvoice.customer),
            selectinload(ARInvoice.receivable_account),
            selectinload(ARInvoice.revenue_account),
            selectinload(ARInvoice.voucher),
            selectinload(ARInvoice.receipts),
            selectinload(ARInvoice.adjustments)
        )
    )

    if invoice_type:
        stmt = stmt.where(ARInvoice.invoice_type == invoice_type)
    if status_filter:
        stmt = stmt.where(ARInvoice.status == status_filter)
    if project_id:
        stmt = stmt.where(ARInvoice.project_id == project_id)
    if customer_id:
        stmt = stmt.where(ARInvoice.customer_id == customer_id)
    if due_date_from:
        stmt = stmt.where(ARInvoice.due_date >= due_date_from)
    if due_date_to:
        stmt = stmt.where(ARInvoice.due_date <= due_date_to)

    today = date.today()
    if is_overdue:
        stmt = stmt.where(
            ARInvoice.due_date < today,
            ARInvoice.balance_due > 0,
            ARInvoice.status.notin_(["Collected", "Cancelled"])
        )

    if aging_bucket:
        if aging_bucket == "Not yet due":
            stmt = stmt.where(ARInvoice.due_date >= today)
        elif aging_bucket == "1-30 days":
            stmt = stmt.where(ARInvoice.due_date < today, ARInvoice.due_date >= today - timedelta(days=30))
        elif aging_bucket == "31-60 days":
            stmt = stmt.where(ARInvoice.due_date < today - timedelta(days=30), ARInvoice.due_date >= today - timedelta(days=60))
        elif aging_bucket == "61-90 days":
            stmt = stmt.where(ARInvoice.due_date < today - timedelta(days=60), ARInvoice.due_date >= today - timedelta(days=90))
        elif aging_bucket == "Over 90 days":
            stmt = stmt.where(ARInvoice.due_date < today - timedelta(days=90))

    if search:
        s_pat = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                ARInvoice.invoice_number.ilike(s_pat),
                ARInvoice.customer_name.ilike(s_pat),
                ARInvoice.description.ilike(s_pat)
            )
        )

    stmt = stmt.order_by(ARInvoice.due_date.asc(), ARInvoice.id.desc()).offset(offset).limit(limit)
    invoices = (await db.execute(stmt)).scalars().all()

    resp_list: List[ARInvoiceResponse] = []
    for inv in invoices:
        resp = ARInvoiceResponse.model_validate(inv)
        if inv.project:
            resp.project_name = inv.project.project_name
        if inv.unit:
            resp.unit_number = inv.unit.unit_number
        if inv.receivable_account:
            resp.receivable_account_name = f"{inv.receivable_account.account_code} - {inv.receivable_account.account_name_en}"
        if inv.revenue_account:
            resp.revenue_account_name = f"{inv.revenue_account.account_code} - {inv.revenue_account.account_name_en}"
        if inv.voucher:
            resp.voucher_number = inv.voucher.voucher_number
        resp_list.append(resp)

    return resp_list


@router.get("/receivables/{invoice_id}", response_model=ARInvoiceResponse)
async def get_ar_invoice_by_id(
    invoice_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve single demand notice by ID with receipts and adjustments.
    """
    stmt = (
        select(ARInvoice)
        .options(
            selectinload(ARInvoice.project),
            selectinload(ARInvoice.unit),
            selectinload(ARInvoice.customer),
            selectinload(ARInvoice.receivable_account),
            selectinload(ARInvoice.revenue_account),
            selectinload(ARInvoice.voucher),
            selectinload(ARInvoice.receipts),
            selectinload(ARInvoice.adjustments)
        )
        .where(ARInvoice.id == invoice_id)
    )
    inv = (await db.execute(stmt)).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail=f"AR Invoice/Demand Notice #{invoice_id} not found.")

    resp = ARInvoiceResponse.model_validate(inv)
    if inv.project:
        resp.project_name = inv.project.project_name
    if inv.unit:
        resp.unit_number = inv.unit.unit_number
    if inv.receivable_account:
        resp.receivable_account_name = f"{inv.receivable_account.account_code} - {inv.receivable_account.account_name_en}"
    if inv.revenue_account:
        resp.revenue_account_name = f"{inv.revenue_account.account_code} - {inv.revenue_account.account_name_en}"
    if inv.voucher:
        resp.voucher_number = inv.voucher.voucher_number
    return resp


@router.post("/receivables", response_model=ARInvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_ar_invoice(
    payload: ARInvoiceCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new Sales Demand Notice / Milestone Invoice.
    Automatically posts a GL Billing Journal Voucher (Debit: AR 1130, Credit: Revenue 4100 / Advances 2140).
    """
    # Check duplicate
    dup_stmt = select(ARInvoice).where(ARInvoice.invoice_number == payload.invoice_number.strip())
    existing = (await db.execute(dup_stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Demand Notice / Invoice number '{payload.invoice_number}' already registered."
        )

    gross = float(payload.gross_amount)
    late_fee = float(payload.late_fee_amount or 0.0)
    disc = float(payload.discount_amount or 0.0)
    net_val = round(gross + late_fee - disc, 2)

    # Determine default COA accounts
    rec_acc_id = payload.receivable_account_id
    if not rec_acc_id:
        def_rec = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["1130", "1100"])).limit(1))).scalar_one_or_none()
        rec_acc_id = def_rec.id if def_rec else 1

    rev_acc_id = payload.revenue_account_id
    if not rev_acc_id:
        def_rev = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["4100", "2140", "4000"])).limit(1))).scalar_one_or_none()
        rev_acc_id = def_rev.id if def_rev else 4

    # Post GL Billing Voucher
    v_num = f"JV-AR-BILL-{payload.invoice_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"
    v = Voucher(
        organization_id=1,
        project_id=payload.project_id,
        voucher_number=v_num,
        voucher_type="Journal",
        voucher_date=payload.invoice_date,
        narration=f"Demand Notice {payload.invoice_number} ({payload.customer_name})",
        total_debit_amount=net_val,
        total_credit_amount=net_val,
        status="Posted",
        source_document_type="Demand_Notice",
        posted_at=datetime.now()
    )
    db.add(v)
    await db.flush()

    e1 = JournalEntry(
        voucher_id=v.id,
        voucher_date=payload.invoice_date,
        project_id=payload.project_id,
        account_id=rec_acc_id,
        debit_amount=net_val,
        credit_amount=0.00,
        bill_reference=payload.invoice_number,
        narration=f"Receivable from: {payload.customer_name}"
    )
    e2 = JournalEntry(
        voucher_id=v.id,
        voucher_date=payload.invoice_date,
        project_id=payload.project_id,
        account_id=rev_acc_id,
        debit_amount=0.00,
        credit_amount=net_val,
        bill_reference=payload.invoice_number,
        narration=f"Revenue/Billing recognized: {payload.description or payload.invoice_type}"
    )
    db.add_all([e1, e2])

    inv = ARInvoice(
        organization_id=1,
        invoice_number=payload.invoice_number.strip(),
        invoice_type=payload.invoice_type,
        invoice_date=payload.invoice_date,
        due_date=payload.due_date,
        customer_id=payload.customer_id,
        customer_name=payload.customer_name.strip(),
        booking_id=payload.booking_id,
        project_id=payload.project_id,
        unit_id=payload.unit_id,
        receivable_account_id=rec_acc_id,
        revenue_account_id=rev_acc_id,
        gross_amount=gross,
        late_fee_amount=late_fee,
        discount_amount=disc,
        net_receivable_amount=net_val,
        collected_amount=0.00,
        balance_due=net_val,
        status="Issued",
        collection_followup_status="Not_Contacted",
        description=payload.description,
        voucher_id=v.id
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)

    return await get_ar_invoice_by_id(inv.id, db)


@router.put("/receivables/{invoice_id}", response_model=ARInvoiceResponse)
async def update_ar_invoice(
    invoice_id: int,
    payload: ARInvoiceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update due date, followup status, dispute notes, or late fees on demand notice.
    """
    inv = await db.get(ARInvoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"AR Invoice #{invoice_id} not found.")

    if payload.due_date:
        inv.due_date = payload.due_date
    if payload.status:
        inv.status = payload.status
    if payload.collection_followup_status:
        inv.collection_followup_status = payload.collection_followup_status
    if payload.followup_notes is not None:
        inv.followup_notes = payload.followup_notes
    if payload.description is not None:
        inv.description = payload.description

    if payload.late_fee_amount is not None or payload.discount_amount is not None:
        if payload.late_fee_amount is not None:
            inv.late_fee_amount = payload.late_fee_amount
        if payload.discount_amount is not None:
            inv.discount_amount = payload.discount_amount
        inv.net_receivable_amount = round(float(inv.gross_amount) + float(inv.late_fee_amount) - float(inv.discount_amount), 2)
        inv.balance_due = round(float(inv.net_receivable_amount) - float(inv.collected_amount), 2)

    await db.commit()
    return await get_ar_invoice_by_id(invoice_id, db)


@router.post("/receivables/{invoice_id}/receipts", response_model=ARReceiptResponse, status_code=status.HTTP_201_CREATED)
async def record_ar_receipt(
    invoice_id: int,
    payload: ARReceiptCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Record customer payment collection against a demand notice.
    Allocates collection to invoice, updates balance, and posts GL Receipt Voucher (Debit Bank/Cash, Credit AR).
    """
    inv = await db.get(ARInvoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"AR Invoice #{invoice_id} not found.")

    amt = float(payload.amount)
    if amt <= 0:
        raise HTTPException(status_code=400, detail="Receipt amount must be positive.")

    rcpt_date = payload.receipt_date or date.today()
    rcpt_num = f"MR-{rcpt_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"

    # Determine Bank/Cash account (Default 1110 or 1120)
    bank_id = payload.bank_account_id
    if not bank_id:
        def_bank = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["1110", "1120", "1000"])).limit(1))).scalar_one_or_none()
        bank_id = def_bank.id if def_bank else 1

    rec_acc_id = inv.receivable_account_id or 1

    # Post GL Receipt Voucher (BR / CR)
    v_type = "Receipt"
    v_num = f"BR-COL-{rcpt_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"

    v = Voucher(
        organization_id=1,
        project_id=inv.project_id,
        voucher_number=v_num,
        voucher_type=v_type,
        voucher_date=rcpt_date,
        narration=f"Collection for {inv.invoice_number} from {inv.customer_name} via {payload.collection_method}",
        total_debit_amount=amt,
        total_credit_amount=amt,
        status="Posted",
        source_document_type="Money_Receipt",
        posted_at=datetime.now()
    )
    db.add(v)
    await db.flush()

    e1 = JournalEntry(
        voucher_id=v.id,
        voucher_date=rcpt_date,
        project_id=inv.project_id,
        account_id=bank_id,
        debit_amount=amt,
        credit_amount=0.00,
        cheque_no=payload.cheque_number,
        cheque_date=payload.cheque_date,
        bill_reference=inv.invoice_number,
        narration=f"Collection deposit: {payload.bank_name or payload.collection_method}"
    )
    e2 = JournalEntry(
        voucher_id=v.id,
        voucher_date=rcpt_date,
        project_id=inv.project_id,
        account_id=rec_acc_id,
        debit_amount=0.00,
        credit_amount=amt,
        bill_reference=inv.invoice_number,
        narration=f"AR clearing for: {inv.customer_name}"
    )
    db.add_all([e1, e2])

    # Create ARReceipt
    rcpt = ARReceipt(
        organization_id=1,
        receipt_number=rcpt_num,
        receipt_date=rcpt_date,
        invoice_id=inv.id,
        customer_id=inv.customer_id or payload.customer_id,
        booking_id=inv.booking_id,
        project_id=inv.project_id,
        amount=amt,
        allocated_amount=amt,
        unallocated_amount=0.00,
        collection_method=payload.collection_method,
        bank_account_id=bank_id,
        bank_name=payload.bank_name,
        cheque_number=payload.cheque_number,
        cheque_date=payload.cheque_date,
        transaction_reference=payload.transaction_reference,
        voucher_id=v.id,
        notes=payload.notes
    )
    db.add(rcpt)

    # Update Invoice
    inv.collected_amount = round(float(inv.collected_amount) + amt, 2)
    inv.balance_due = round(float(inv.net_receivable_amount) - float(inv.collected_amount), 2)
    if inv.balance_due <= 0.009:
        inv.balance_due = 0.00
        inv.status = "Collected"
    else:
        inv.status = "Partially_Collected"

    await db.commit()
    await db.refresh(rcpt)
    resp = ARReceiptResponse.model_validate(rcpt)
    resp.customer_name = inv.customer_name
    return resp


@router.post("/receivables/unallocated-receipts", response_model=ARReceiptResponse, status_code=status.HTTP_201_CREATED)
async def record_unallocated_receipt(
    payload: ARReceiptCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Record unallocated advance receipt cash from customer.
    Debit: Bank/Cash (1110), Credit: Customer Advances Liability (2140).
    Enables unallocated cash tracking as required.
    """
    cust = await db.get(Customer, payload.customer_id)
    if not cust:
        raise HTTPException(status_code=404, detail=f"Customer #{payload.customer_id} not found.")

    amt = float(payload.amount)
    if amt <= 0:
        raise HTTPException(status_code=400, detail="Receipt amount must be positive.")

    rcpt_date = payload.receipt_date or date.today()
    rcpt_num = f"MR-ADV-{rcpt_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"

    bank_id = payload.bank_account_id
    if not bank_id:
        def_bank = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["1110", "1120"])).limit(1))).scalar_one_or_none()
        bank_id = def_bank.id if def_bank else 1

    # Customer Advance Liability Account (2140)
    adv_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "2140").limit(1))).scalar_one_or_none()
    adv_acc_id = adv_acc.id if adv_acc else 2

    # Post GL Receipt Voucher
    v_num = f"BR-ADV-{rcpt_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"
    v = Voucher(
        organization_id=1,
        project_id=payload.project_id,
        voucher_number=v_num,
        voucher_type="Receipt",
        voucher_date=rcpt_date,
        narration=f"Unallocated Advance Receipt from {cust.full_name_en} via {payload.collection_method}",
        total_debit_amount=amt,
        total_credit_amount=amt,
        status="Posted",
        source_document_type="Money_Receipt",
        posted_at=datetime.now()
    )
    db.add(v)
    await db.flush()

    e1 = JournalEntry(
        voucher_id=v.id,
        voucher_date=rcpt_date,
        project_id=payload.project_id,
        account_id=bank_id,
        debit_amount=amt,
        credit_amount=0.00,
        cheque_no=payload.cheque_number,
        cheque_date=payload.cheque_date,
        narration=f"Advance collection deposit: {cust.full_name_en}"
    )
    e2 = JournalEntry(
        voucher_id=v.id,
        voucher_date=rcpt_date,
        project_id=payload.project_id,
        account_id=adv_acc_id,
        debit_amount=0.00,
        credit_amount=amt,
        narration=f"Unallocated Customer Advance Liability: {cust.full_name_en}"
    )
    db.add_all([e1, e2])

    rcpt = ARReceipt(
        organization_id=1,
        receipt_number=rcpt_num,
        receipt_date=rcpt_date,
        invoice_id=None,
        customer_id=payload.customer_id,
        booking_id=payload.booking_id,
        project_id=payload.project_id,
        amount=amt,
        allocated_amount=0.00,
        unallocated_amount=amt,
        collection_method=payload.collection_method,
        bank_account_id=bank_id,
        bank_name=payload.bank_name,
        cheque_number=payload.cheque_number,
        cheque_date=payload.cheque_date,
        transaction_reference=payload.transaction_reference,
        voucher_id=v.id,
        notes=payload.notes
    )
    db.add(rcpt)
    await db.commit()
    await db.refresh(rcpt)

    resp = ARReceiptResponse.model_validate(rcpt)
    resp.customer_name = cust.full_name_en
    return resp


@router.post("/receivables/{invoice_id}/adjustments", response_model=ARAdjustmentResponse, status_code=status.HTTP_201_CREATED)
async def record_ar_adjustment(
    invoice_id: int,
    payload: ARAdjustmentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Record Credit Note, Late Fee Waiver, or Dispute Adjustment against receivable invoice.
    """
    inv = await db.get(ARInvoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"AR Invoice #{invoice_id} not found.")

    amt = float(payload.amount)
    if amt <= 0:
        raise HTTPException(status_code=400, detail="Adjustment amount must be positive.")

    adj_num = f"ADJ-AR-{payload.adjustment_type[:2].upper()}-{datetime.now().strftime('%Y%m')}-{int(datetime.now().timestamp()) % 1000:03d}"
    adj_date = payload.adjustment_date or date.today()

    adj = ARAdjustment(
        organization_id=1,
        invoice_id=inv.id,
        customer_id=inv.customer_id or payload.customer_id,
        adjustment_number=adj_num,
        adjustment_type=payload.adjustment_type,
        adjustment_date=adj_date,
        amount=amt,
        reason=payload.reason.strip()
    )
    db.add(adj)

    # Adjust invoice balance
    if payload.adjustment_type in ["Credit_Note", "Late_Fee_Waiver", "Dispute_Settlement", "Write_Off"]:
        inv.net_receivable_amount = round(float(inv.net_receivable_amount) - amt, 2)
    else: # Debit_Note_Penalty
        inv.net_receivable_amount = round(float(inv.net_receivable_amount) + amt, 2)

    inv.balance_due = round(float(inv.net_receivable_amount) - float(inv.collected_amount), 2)
    if inv.balance_due <= 0:
        inv.status = "Collected"

    await db.commit()
    await db.refresh(adj)
    return ARAdjustmentResponse.model_validate(adj)


@router.get("/receivables/customer/statement", response_model=ARCustomerStatementResponse)
async def get_ar_customer_statement(
    customer_id: Optional[int] = None,
    customer_name: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Customer Statement of Account:
    Chronological timeline of demand notices (debit), collections (credit), adjustments, and running receivable balance.
    """
    if not customer_id and not customer_name:
        first_inv = (await db.execute(select(ARInvoice).where(ARInvoice.customer_id.isnot(None)).limit(1))).scalar_one_or_none()
        if first_inv:
            customer_id = first_inv.customer_id
        else:
            raise HTTPException(status_code=400, detail="Please specify customer_id or customer_name.")

    target_name = customer_name or "Valued Customer"
    if customer_id:
        c_obj = await db.get(Customer, customer_id)
        if c_obj:
            target_name = c_obj.full_name_en

    # Fetch all invoices for customer
    inv_stmt = select(ARInvoice).options(selectinload(ARInvoice.project), selectinload(ARInvoice.unit))
    if customer_id:
        inv_stmt = inv_stmt.where(ARInvoice.customer_id == customer_id)
    else:
        inv_stmt = inv_stmt.where(ARInvoice.customer_name.ilike(f"%{customer_name}%"))

    invoices = (await db.execute(inv_stmt)).scalars().all()
    inv_ids = [inv.id for inv in invoices]

    # Fetch all receipts
    rcpt_stmt = select(ARReceipt).where(ARReceipt.customer_id == customer_id) if customer_id else select(ARReceipt).where(ARReceipt.invoice_id.in_(inv_ids))
    receipts = (await db.execute(rcpt_stmt)).scalars().all()

    # Fetch adjustments
    adj_stmt = select(ARAdjustment).where(ARAdjustment.customer_id == customer_id) if customer_id else select(ARAdjustment).where(ARAdjustment.invoice_id.in_(inv_ids))
    adjustments = (await db.execute(adj_stmt)).scalars().all()

    timeline = []
    for inv in invoices:
        timeline.append({
            "date": inv.invoice_date,
            "type": "Demand_Notice",
            "ref": inv.invoice_number,
            "desc": f"Demand: {inv.description or inv.invoice_type}",
            "project": inv.project.project_name if inv.project else "Property Sale",
            "unit": inv.unit.unit_number if inv.unit else None,
            "debit": float(inv.net_receivable_amount),
            "credit": 0.0
        })

    tot_unalloc = 0.0
    for r in receipts:
        tot_unalloc += float(r.unallocated_amount)
        timeline.append({
            "date": r.receipt_date,
            "type": "Money_Receipt",
            "ref": r.receipt_number,
            "desc": f"Collection via {r.collection_method} ({r.cheque_number or r.transaction_reference or 'Deposit'})",
            "project": "Receipt Deposit",
            "unit": None,
            "debit": 0.0,
            "credit": float(r.amount)
        })

    for a in adjustments:
        is_cr = a.adjustment_type in ["Credit_Note", "Late_Fee_Waiver", "Dispute_Settlement", "Write_Off"]
        timeline.append({
            "date": a.adjustment_date,
            "type": a.adjustment_type,
            "ref": a.adjustment_number,
            "desc": f"Adjustment: {a.reason}",
            "project": "Accounting Adjustment",
            "unit": None,
            "debit": 0.0 if is_cr else float(a.amount),
            "credit": float(a.amount) if is_cr else 0.0
        })

    timeline.sort(key=lambda x: x["date"])

    running = 0.0
    tot_dem = 0.0
    tot_col = 0.0
    items: List[ARCustomerStatementItem] = []

    for ev in timeline:
        if date_from and ev["date"] < date_from:
            running += (ev["debit"] - ev["credit"])
            continue
        if date_to and ev["date"] > date_to:
            continue

        running += (ev["debit"] - ev["credit"])
        tot_dem += ev["debit"]
        tot_col += ev["credit"]

        items.append(ARCustomerStatementItem(
            transaction_date=ev["date"],
            transaction_type=ev["type"],
            reference_number=ev["ref"],
            description=ev["desc"],
            project_name=ev["project"],
            unit_number=ev["unit"],
            debit_demand=round(ev["debit"], 2),
            credit_collection=round(ev["credit"], 2),
            running_receivable_balance=round(running, 2)
        ))

    return ARCustomerStatementResponse(
        customer_id=customer_id,
        customer_name=target_name,
        date_from=date_from,
        date_to=date_to,
        opening_balance=0.00,
        total_demanded=round(tot_dem, 2),
        total_collected=round(tot_col, 2),
        total_unallocated_advance=round(tot_unalloc, 2),
        net_closing_receivable=round(running, 2),
        items=items
    )


@router.get("/receivables/reports/aging", response_model=ARAgingReportResponse)
async def get_ar_aging_report(
    as_of_date: Optional[date] = None,
    project_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    invoice_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Accounts Receivable Aging Report calculated from actual due date and outstanding amount:
    - Not yet due (due_date >= as_of_date)
    - 1–30 days (1 to 30 days overdue)
    - 31–60 days (31 to 60 days overdue)
    - 61–90 days (61 to 90 days overdue)
    - Over 90 days (91+ days overdue)
    Filters: project, customer, invoice_type.
    """
    ref_date = as_of_date or date.today()

    stmt = (
        select(ARInvoice)
        .options(
            selectinload(ARInvoice.project),
            selectinload(ARInvoice.unit)
        )
        .where(
            ARInvoice.balance_due > 0,
            ARInvoice.status.notin_(["Collected", "Cancelled"])
        )
    )

    if project_id:
        stmt = stmt.where(ARInvoice.project_id == project_id)
    if customer_id:
        stmt = stmt.where(ARInvoice.customer_id == customer_id)
    if invoice_type:
        stmt = stmt.where(ARInvoice.invoice_type == invoice_type)

    stmt = stmt.order_by(ARInvoice.due_date.asc())
    invoices = (await db.execute(stmt)).scalars().all()

    not_yet_amt, not_yet_cnt = 0.0, 0
    d1_30_amt, d1_30_cnt = 0.0, 0
    d31_60_amt, d31_60_cnt = 0.0, 0
    d61_90_amt, d61_90_cnt = 0.0, 0
    over_90_amt, over_90_cnt = 0.0, 0
    total_bal = 0.0

    items: List[ARAgingAnalysisItem] = []

    for inv in invoices:
        bal = float(inv.balance_due)
        total_bal += bal
        diff_days = (ref_date - inv.due_date).days

        if diff_days <= 0:
            bucket = "Not yet due"
            not_yet_amt += bal
            not_yet_cnt += 1
        elif diff_days <= 30:
            bucket = "1-30 days"
            d1_30_amt += bal
            d1_30_cnt += 1
        elif diff_days <= 60:
            bucket = "31-60 days"
            d31_60_amt += bal
            d31_60_cnt += 1
        elif diff_days <= 90:
            bucket = "61-90 days"
            d61_90_amt += bal
            d61_90_cnt += 1
        else:
            bucket = "Over 90 days"
            over_90_amt += bal
            over_90_cnt += 1

        items.append(ARAgingAnalysisItem(
            invoice_id=inv.id,
            invoice_number=inv.invoice_number,
            invoice_type=inv.invoice_type,
            customer_name=inv.customer_name,
            project_name=inv.project.project_name if inv.project else "Corporate",
            unit_number=inv.unit.unit_number if inv.unit else None,
            due_date=inv.due_date,
            days_overdue=max(diff_days, 0),
            net_receivable_amount=float(inv.net_receivable_amount),
            collected_amount=float(inv.collected_amount),
            balance_due=bal,
            aging_bucket=bucket,
            collection_followup_status=inv.collection_followup_status
        ))

    return ARAgingReportResponse(
        as_of_date=ref_date,
        total_receivable_balance=round(total_bal, 2),
        not_yet_due_amount=round(not_yet_amt, 2),
        not_yet_due_count=not_yet_cnt,
        days_1_to_30_amount=round(d1_30_amt, 2),
        days_1_to_30_count=d1_30_cnt,
        days_31_to_60_amount=round(d31_60_amt, 2),
        days_31_to_60_count=d31_60_cnt,
        days_61_to_90_amount=round(d61_90_amt, 2),
        days_61_to_90_count=d61_90_cnt,
        over_90_days_amount=round(over_90_amt, 2),
        over_90_days_count=over_90_cnt,
        items=items
    )


# ==============================================================================
# 8. Customer Receipt Allocation & Lifecycle Management
# ==============================================================================

@router.get("/receivables/receipts/kpis", response_model=ARReceiptSummaryKPIs)
async def get_receipt_summary_kpis(
    project_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns summary KPIs for customer receipts strictly aggregating from acc_ar_receipts.
    Prevents double-counting when single receipts are allocated across multiple invoices.
    """
    stmt = select(ARReceipt)
    if project_id:
        stmt = stmt.where(ARReceipt.project_id == project_id)
    if customer_id:
        stmt = stmt.where(ARReceipt.customer_id == customer_id)

    receipts = (await db.execute(stmt)).scalars().all()

    total_cnt = 0
    total_amt = 0.0
    cleared_amt = 0.0
    allocated_amt = 0.0
    unallocated_amt = 0.0
    recorded_amt = 0.0
    reversed_amt = 0.0

    for r in receipts:
        amt = float(r.amount or 0.0)
        alloc = float(r.allocated_amount or 0.0)
        unalloc = float(r.unallocated_amount or 0.0)

        if r.status == "Reversed":
            reversed_amt += amt
        else:
            total_cnt += 1
            total_amt += amt
            allocated_amt += alloc
            unallocated_amt += unalloc

            if r.status in ("Cleared", "Allocated", "Partially_Allocated", "Unallocated"):
                cleared_amt += amt
            elif r.status == "Recorded":
                recorded_amt += amt

    return ARReceiptSummaryKPIs(
        total_receipts_count=total_cnt,
        total_receipts_amount=round(total_amt, 2),
        total_cleared_amount=round(cleared_amt, 2),
        total_allocated_amount=round(allocated_amt, 2),
        total_unallocated_advance=round(unallocated_amt, 2),
        total_recorded_pending=round(recorded_amt, 2),
        total_reversed_amount=round(reversed_amt, 2)
    )


@router.get("/receivables/receipts", response_model=List[ARReceiptResponse])
async def list_customer_receipts(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    collection_method: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Paginated list of customer money receipts with allocations and lifecycle statuses.
    """
    stmt = (
        select(ARReceipt)
        .options(
            selectinload(ARReceipt.customer),
            selectinload(ARReceipt.project),
            selectinload(ARReceipt.bank_account),
            selectinload(ARReceipt.voucher),
            selectinload(ARReceipt.reversal_voucher),
            selectinload(ARReceipt.allocations).selectinload(ARReceiptAllocation.invoice)
        )
        .order_by(ARReceipt.receipt_date.desc(), ARReceipt.id.desc())
    )

    if customer_id:
        stmt = stmt.where(ARReceipt.customer_id == customer_id)
    if project_id:
        stmt = stmt.where(ARReceipt.project_id == project_id)
    if status_filter:
        stmt = stmt.where(ARReceipt.status == status_filter)
    if collection_method:
        stmt = stmt.where(ARReceipt.collection_method == collection_method)
    if date_from:
        stmt = stmt.where(ARReceipt.receipt_date >= date_from)
    if date_to:
        stmt = stmt.where(ARReceipt.receipt_date <= date_to)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                ARReceipt.receipt_number.ilike(s),
                ARReceipt.cheque_number.ilike(s),
                ARReceipt.transaction_reference.ilike(s),
                ARReceipt.notes.ilike(s)
            )
        )

    stmt = stmt.limit(limit).offset(offset)
    receipts = (await db.execute(stmt)).scalars().all()

    res: List[ARReceiptResponse] = []
    for r in receipts:
        resp = ARReceiptResponse.model_validate(r)
        resp.customer_name = r.customer.full_name_en if r.customer else None
        resp.customer_phone = r.customer.phone if r.customer else None
        resp.project_name = r.project.project_name if r.project else None
        resp.bank_account_name = f"{r.bank_account.account_code} - {r.bank_account.account_name_en}" if r.bank_account else r.bank_name
        resp.voucher_number = r.voucher.voucher_number if r.voucher else None
        resp.reversal_voucher_number = r.reversal_voucher.voucher_number if r.reversal_voucher else None

        # Build allocations list
        alloc_items = []
        for a in r.allocations:
            alloc_items.append(ARReceiptAllocationBase(
                id=a.id,
                receipt_id=a.receipt_id,
                invoice_id=a.invoice_id,
                invoice_number=a.invoice.invoice_number if a.invoice else None,
                invoice_type=a.invoice.invoice_type if a.invoice else None,
                milestone_title=a.invoice.milestone_title if a.invoice else None,
                allocated_amount=float(a.allocated_amount),
                allocation_date=a.allocation_date,
                notes=a.notes,
                created_at=a.created_at
            ))
        resp.allocations = alloc_items
        res.append(resp)

    return res


@router.get("/receivables/receipts/{receipt_id}", response_model=ARReceiptResponse)
async def get_customer_receipt_details(
    receipt_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get full details of a specific money receipt, including its allocation breakdown.
    """
    stmt = (
        select(ARReceipt)
        .options(
            selectinload(ARReceipt.customer),
            selectinload(ARReceipt.project),
            selectinload(ARReceipt.bank_account),
            selectinload(ARReceipt.voucher),
            selectinload(ARReceipt.reversal_voucher),
            selectinload(ARReceipt.allocations).selectinload(ARReceiptAllocation.invoice)
        )
        .where(ARReceipt.id == receipt_id)
    )
    r = (await db.execute(stmt)).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail=f"Money Receipt #{receipt_id} not found.")

    resp = ARReceiptResponse.model_validate(r)
    resp.customer_name = r.customer.full_name_en if r.customer else None
    resp.customer_phone = r.customer.phone if r.customer else None
    resp.project_name = r.project.project_name if r.project else None
    resp.bank_account_name = f"{r.bank_account.account_code} - {r.bank_account.account_name_en}" if r.bank_account else r.bank_name
    resp.voucher_number = r.voucher.voucher_number if r.voucher else None
    resp.reversal_voucher_number = r.reversal_voucher.voucher_number if r.reversal_voucher else None

    alloc_items = []
    for a in r.allocations:
        alloc_items.append(ARReceiptAllocationBase(
            id=a.id,
            receipt_id=a.receipt_id,
            invoice_id=a.invoice_id,
            invoice_number=a.invoice.invoice_number if a.invoice else None,
            invoice_type=a.invoice.invoice_type if a.invoice else None,
            milestone_title=a.invoice.milestone_title if a.invoice else None,
            allocated_amount=float(a.allocated_amount),
            allocation_date=a.allocation_date,
            notes=a.notes,
            created_at=a.created_at
        ))
    resp.allocations = alloc_items
    return resp


@router.post("/receivables/receipts", response_model=ARReceiptResponse, status_code=status.HTTP_201_CREATED)
async def create_customer_receipt(
    payload: ARReceiptCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new customer money receipt.
    Supports:
    - Status 'Recorded' (PDC cheque / slip awaiting clearance; no GL voucher posted yet)
    - Status 'Cleared' (Bank Transfer / Cash / Cleared Cheque) -> Posts GL Receipt Voucher
    - Immediate multi-invoice allocation or pure unallocated advance.
    """
    cust = await db.get(Customer, payload.customer_id)
    if not cust:
        raise HTTPException(status_code=404, detail=f"Customer #{payload.customer_id} not found.")

    amt = round(float(payload.amount), 2)
    if amt <= 0:
        raise HTTPException(status_code=400, detail="Receipt amount must be greater than zero.")

    rcpt_date = payload.receipt_date or date.today()
    rcpt_num = f"MR-{rcpt_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"

    rcpt_status = payload.status or "Cleared"
    if rcpt_status not in ("Recorded", "Cleared"):
        rcpt_status = "Cleared"

    # Validate allocations if provided
    total_alloc = 0.0
    if payload.allocations:
        for a in payload.allocations:
            alloc_amt = round(float(a.allocated_amount), 2)
            if alloc_amt <= 0:
                raise HTTPException(status_code=400, detail="Allocated amount must be greater than zero.")
            total_alloc += alloc_amt
        if total_alloc > amt:
            raise HTTPException(
                status_code=400,
                detail=f"Total allocated amount (৳ {total_alloc:,.2f}) cannot exceed receipt amount (৳ {amt:,.2f})."
            )

    unallocated = round(amt - total_alloc, 2)

    voucher_id = None
    bank_id = payload.bank_account_id
    if rcpt_status == "Cleared":
        if not bank_id:
            def_bank = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["1110", "1120"])).limit(1))).scalar_one_or_none()
            bank_id = def_bank.id if def_bank else 1

        ar_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "1130").limit(1))).scalar_one_or_none()
        ar_acc_id = ar_acc.id if ar_acc else 1

        adv_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "2140").limit(1))).scalar_one_or_none()
        adv_acc_id = adv_acc.id if adv_acc else 2

        v_num = f"BR-{rcpt_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"
        v = Voucher(
            organization_id=1,
            project_id=payload.project_id,
            voucher_number=v_num,
            voucher_type="Receipt",
            voucher_date=rcpt_date,
            narration=f"Customer Collection MR #{rcpt_num} from {cust.full_name_en} via {payload.collection_method}",
            total_debit_amount=amt,
            total_credit_amount=amt,
            status="Posted",
            source_document_type="Money_Receipt",
            posted_at=datetime.now()
        )
        db.add(v)
        await db.flush()
        voucher_id = v.id

        # Debit Bank/Cash
        e_debit = JournalEntry(
            voucher_id=v.id,
            voucher_date=rcpt_date,
            project_id=payload.project_id,
            account_id=bank_id,
            debit_amount=amt,
            credit_amount=0.00,
            cheque_no=payload.cheque_number,
            cheque_date=payload.cheque_date,
            narration=f"Collection deposit: {cust.full_name_en}"
        )
        db.add(e_debit)

        # Credit AR (for allocated portion)
        if total_alloc > 0:
            e_credit_ar = JournalEntry(
                voucher_id=v.id,
                voucher_date=rcpt_date,
                project_id=payload.project_id,
                account_id=ar_acc_id,
                debit_amount=0.00,
                credit_amount=total_alloc,
                narration=f"AR Collection credit: {cust.full_name_en}"
            )
            db.add(e_credit_ar)

        # Credit Customer Advance (for unallocated portion)
        if unallocated > 0:
            e_credit_adv = JournalEntry(
                voucher_id=v.id,
                voucher_date=rcpt_date,
                project_id=payload.project_id,
                account_id=adv_acc_id,
                debit_amount=0.00,
                credit_amount=unallocated,
                narration=f"Customer Advance Liability: {cust.full_name_en}"
            )
            db.add(e_credit_adv)

    # Determine initial receipt status
    final_status = rcpt_status
    if rcpt_status == "Cleared":
        if total_alloc >= amt:
            final_status = "Allocated"
        elif total_alloc > 0 and unallocated > 0:
            final_status = "Partially_Allocated"
        else:
            final_status = "Unallocated"

    rcpt = ARReceipt(
        organization_id=1,
        receipt_number=rcpt_num,
        receipt_date=rcpt_date,
        invoice_id=payload.allocations[0].invoice_id if (payload.allocations and len(payload.allocations) == 1) else payload.invoice_id,
        customer_id=payload.customer_id,
        booking_id=payload.booking_id,
        project_id=payload.project_id,
        amount=amt,
        status=final_status,
        cleared_at=datetime.now() if rcpt_status == "Cleared" else None,
        allocated_amount=total_alloc,
        unallocated_amount=unallocated,
        collection_method=payload.collection_method,
        bank_account_id=bank_id,
        bank_name=payload.bank_name,
        cheque_number=payload.cheque_number,
        cheque_date=payload.cheque_date,
        transaction_reference=payload.transaction_reference,
        voucher_id=voucher_id,
        notes=payload.notes
    )
    db.add(rcpt)
    await db.flush()

    # Process allocations if present
    if payload.allocations:
        for alloc in payload.allocations:
            alloc_amt = round(float(alloc.allocated_amount), 2)
            inv = await db.get(ARInvoice, alloc.invoice_id)
            if inv:
                # Add allocation line
                alloc_row = ARReceiptAllocation(
                    organization_id=1,
                    receipt_id=rcpt.id,
                    invoice_id=inv.id,
                    allocated_amount=alloc_amt,
                    allocation_date=rcpt_date,
                    notes=alloc.notes or f"Allocation from MR #{rcpt_num}"
                )
                db.add(alloc_row)

                # Update invoice balances
                inv.collected_amount = round(float(inv.collected_amount) + alloc_amt, 2)
                inv.balance_due = round(float(inv.net_receivable_amount) - float(inv.collected_amount), 2)
                if inv.balance_due <= 0.009:
                    inv.balance_due = 0.00
                    inv.status = "Collected"
                else:
                    inv.status = "Partially_Collected"

    await db.commit()
    await db.refresh(rcpt)

    return await get_customer_receipt_details(rcpt.id, db)


@router.post("/receivables/receipts/{receipt_id}/verify-clear", response_model=ARReceiptResponse)
async def verify_and_clear_receipt(
    receipt_id: int,
    payload: ARReceiptClearVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies and clears funds for a 'Recorded' money receipt (e.g. cheque clearance or bank deposit).
    Posts the GL Receipt Voucher and updates status to Cleared, Allocated, or Unallocated.
    """
    stmt = (
        select(ARReceipt)
        .options(
            selectinload(ARReceipt.customer),
            selectinload(ARReceipt.allocations)
        )
        .where(ARReceipt.id == receipt_id)
    )
    rcpt = (await db.execute(stmt)).scalar_one_or_none()
    if not rcpt:
        raise HTTPException(status_code=404, detail=f"Money Receipt #{receipt_id} not found.")

    if rcpt.status not in ("Recorded", "Draft"):
        raise HTTPException(
            status_code=400,
            detail=f"Receipt #{rcpt.receipt_number} is already in '{rcpt.status}' state."
        )

    clr_date = payload.cleared_date or date.today()
    bank_id = payload.bank_account_id or rcpt.bank_account_id
    if not bank_id:
        def_bank = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["1110", "1120"])).limit(1))).scalar_one_or_none()
        bank_id = def_bank.id if def_bank else 1

    amt = float(rcpt.amount)
    alloc = float(rcpt.allocated_amount)
    unalloc = float(rcpt.unallocated_amount)

    ar_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "1130").limit(1))).scalar_one_or_none()
    ar_acc_id = ar_acc.id if ar_acc else 1

    adv_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "2140").limit(1))).scalar_one_or_none()
    adv_acc_id = adv_acc.id if adv_acc else 2

    # Post GL Receipt Voucher
    v_num = f"BR-{clr_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"
    v = Voucher(
        organization_id=1,
        project_id=rcpt.project_id,
        voucher_number=v_num,
        voucher_type="Receipt",
        voucher_date=clr_date,
        narration=f"Cleared Customer Receipt MR #{rcpt.receipt_number} ({rcpt.customer.full_name_en if rcpt.customer else 'Customer'})",
        total_debit_amount=amt,
        total_credit_amount=amt,
        status="Posted",
        source_document_type="Money_Receipt",
        posted_at=datetime.now()
    )
    db.add(v)
    await db.flush()

    # Debit Bank
    db.add(JournalEntry(
        voucher_id=v.id,
        voucher_date=clr_date,
        project_id=rcpt.project_id,
        account_id=bank_id,
        debit_amount=amt,
        credit_amount=0.00,
        cheque_no=rcpt.cheque_number,
        cheque_date=rcpt.cheque_date,
        narration=f"Receipt funds cleared: {rcpt.receipt_number}"
    ))

    # Credit AR for allocated portion
    if alloc > 0:
        db.add(JournalEntry(
            voucher_id=v.id,
            voucher_date=clr_date,
            project_id=rcpt.project_id,
            account_id=ar_acc_id,
            debit_amount=0.00,
            credit_amount=alloc,
            narration=f"AR clearing credit: {rcpt.receipt_number}"
        ))

    # Credit Customer Advance for unallocated portion
    if unalloc > 0:
        db.add(JournalEntry(
            voucher_id=v.id,
            voucher_date=clr_date,
            project_id=rcpt.project_id,
            account_id=adv_acc_id,
            debit_amount=0.00,
            credit_amount=unalloc,
            narration=f"Customer Advance Liability: {rcpt.receipt_number}"
        ))

    # Update receipt
    rcpt.cleared_at = datetime.now()
    rcpt.bank_account_id = bank_id
    rcpt.voucher_id = v.id
    if payload.transaction_reference:
        rcpt.transaction_reference = payload.transaction_reference
    if payload.notes:
        rcpt.notes = f"{rcpt.notes or ''} [Cleared: {payload.notes}]"

    if alloc >= amt:
        rcpt.status = "Allocated"
    elif alloc > 0:
        rcpt.status = "Partially_Allocated"
    else:
        rcpt.status = "Unallocated"

    await db.commit()
    return await get_customer_receipt_details(rcpt.id, db)


@router.post("/receivables/receipts/{receipt_id}/allocate", response_model=ARReceiptResponse)
async def allocate_receipt_to_invoices(
    receipt_id: int,
    payload: ARMultiAllocationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Allocates an unallocated or partially allocated receipt across one or more customer invoices.
    Prevents double counting by creating distinct allocation lines and generating an Advance Clearing JV.
    """
    stmt = (
        select(ARReceipt)
        .options(
            selectinload(ARReceipt.customer),
            selectinload(ARReceipt.allocations)
        )
        .where(ARReceipt.id == receipt_id)
    )
    rcpt = (await db.execute(stmt)).scalar_one_or_none()
    if not rcpt:
        raise HTTPException(status_code=404, detail=f"Money Receipt #{receipt_id} not found.")

    if rcpt.status in ("Reversed", "Refunded"):
        raise HTTPException(status_code=400, detail=f"Cannot allocate a '{rcpt.status}' receipt.")

    if rcpt.status == "Recorded":
        raise HTTPException(status_code=400, detail="Please verify and clear receipt funds before allocating.")

    current_unallocated = float(rcpt.unallocated_amount)
    if current_unallocated <= 0.009:
        raise HTTPException(status_code=400, detail=f"Receipt #{rcpt.receipt_number} has no unallocated balance remaining.")

    alloc_date = payload.allocation_date or date.today()
    total_requested_alloc = sum(round(float(a.allocated_amount), 2) for a in payload.allocations)

    if total_requested_alloc > current_unallocated + 0.009:
        raise HTTPException(
            status_code=400,
            detail=f"Requested allocation (৳ {total_requested_alloc:,.2f}) exceeds available unallocated balance (৳ {current_unallocated:,.2f})."
        )

    # Post Advance Clearing Journal Voucher: Debit Customer Advances (2140), Credit AR (1130)
    ar_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "1130").limit(1))).scalar_one_or_none()
    ar_acc_id = ar_acc.id if ar_acc else 1

    adv_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "2140").limit(1))).scalar_one_or_none()
    adv_acc_id = adv_acc.id if adv_acc else 2

    v_num = f"JV-ALC-{alloc_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"
    v = Voucher(
        organization_id=1,
        project_id=rcpt.project_id,
        voucher_number=v_num,
        voucher_type="Journal",
        voucher_date=alloc_date,
        narration=f"Advance Allocation Clearing: MR #{rcpt.receipt_number} to Invoices",
        total_debit_amount=total_requested_alloc,
        total_credit_amount=total_requested_alloc,
        status="Posted",
        source_document_type="Receipt_Allocation",
        posted_at=datetime.now()
    )
    db.add(v)
    await db.flush()

    # Debit Customer Advances Liability (2140)
    db.add(JournalEntry(
        voucher_id=v.id,
        voucher_date=alloc_date,
        project_id=rcpt.project_id,
        account_id=adv_acc_id,
        debit_amount=total_requested_alloc,
        credit_amount=0.00,
        narration=f"Clear Customer Advance: MR #{rcpt.receipt_number}"
    ))

    # Credit Accounts Receivable (1130)
    db.add(JournalEntry(
        voucher_id=v.id,
        voucher_date=alloc_date,
        project_id=rcpt.project_id,
        account_id=ar_acc_id,
        debit_amount=0.00,
        credit_amount=total_requested_alloc,
        narration=f"Allocate to Customer Receivables: MR #{rcpt.receipt_number}"
    ))

    # Apply allocations to each invoice
    for item in payload.allocations:
        item_amt = round(float(item.allocated_amount), 2)
        inv = await db.get(ARInvoice, item.invoice_id)
        if not inv:
            raise HTTPException(status_code=404, detail=f"Invoice #{item.invoice_id} not found.")

        alloc_row = ARReceiptAllocation(
            organization_id=1,
            receipt_id=rcpt.id,
            invoice_id=inv.id,
            allocated_amount=item_amt,
            allocation_date=alloc_date,
            notes=item.notes or f"Allocated from advance MR #{rcpt.receipt_number}"
        )
        db.add(alloc_row)

        inv.collected_amount = round(float(inv.collected_amount) + item_amt, 2)
        inv.balance_due = round(float(inv.net_receivable_amount) - float(inv.collected_amount), 2)
        if inv.balance_due <= 0.009:
            inv.balance_due = 0.00
            inv.status = "Collected"
        else:
            inv.status = "Partially_Collected"

    # Update receipt balances and status
    rcpt.allocated_amount = round(float(rcpt.allocated_amount) + total_requested_alloc, 2)
    rcpt.unallocated_amount = round(float(rcpt.unallocated_amount) - total_requested_alloc, 2)

    if rcpt.unallocated_amount <= 0.009:
        rcpt.unallocated_amount = 0.00
        rcpt.status = "Allocated"
    else:
        rcpt.status = "Partially_Allocated"

    await db.commit()
    return await get_customer_receipt_details(rcpt.id, db)


@router.post("/receivables/receipts/{receipt_id}/reverse", response_model=ARReceiptResponse)
async def reverse_customer_receipt(
    receipt_id: int,
    payload: ARReceiptReverseRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Reverses a money receipt (e.g. bounced cheque, dishonored pay order, or duplicate entry).
    Rolls back all invoice allocations, reinstates invoice balance due, and posts a Reversal JV.
    """
    stmt = (
        select(ARReceipt)
        .options(
            selectinload(ARReceipt.customer),
            selectinload(ARReceipt.bank_account),
            selectinload(ARReceipt.allocations).selectinload(ARReceiptAllocation.invoice)
        )
        .where(ARReceipt.id == receipt_id)
    )
    rcpt = (await db.execute(stmt)).scalar_one_or_none()
    if not rcpt:
        raise HTTPException(status_code=404, detail=f"Money Receipt #{receipt_id} not found.")

    if rcpt.status == "Reversed":
        raise HTTPException(status_code=400, detail="Receipt is already reversed.")

    rev_date = payload.reversal_date or date.today()
    amt = float(rcpt.amount)
    alloc = float(rcpt.allocated_amount)
    unalloc = float(rcpt.unallocated_amount)

    # Roll back each allocated invoice
    for a in rcpt.allocations:
        inv = a.invoice
        if inv:
            inv.collected_amount = max(round(float(inv.collected_amount) - float(a.allocated_amount), 2), 0.00)
            inv.balance_due = round(float(inv.net_receivable_amount) - float(inv.collected_amount), 2)
            if inv.collected_amount <= 0.009:
                inv.status = "Issued"
            else:
                inv.status = "Partially_Collected"

    # Post Reversal Voucher if original voucher existed
    reversal_voucher_id = None
    if rcpt.voucher_id:
        v_num = f"JV-REV-{rev_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"
        v = Voucher(
            organization_id=1,
            project_id=rcpt.project_id,
            voucher_number=v_num,
            voucher_type="Journal",
            voucher_date=rev_date,
            narration=f"REVERSAL of MR #{rcpt.receipt_number}. Reason: {payload.reversal_reason}",
            total_debit_amount=amt,
            total_credit_amount=amt,
            status="Posted",
            source_document_type="Receipt_Reversal",
            posted_at=datetime.now()
        )
        db.add(v)
        await db.flush()
        reversal_voucher_id = v.id

        bank_id = rcpt.bank_account_id
        if not bank_id:
            def_bank = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["1110", "1120"])).limit(1))).scalar_one_or_none()
            bank_id = def_bank.id if def_bank else 1

        ar_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "1130").limit(1))).scalar_one_or_none()
        ar_acc_id = ar_acc.id if ar_acc else 1

        adv_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "2140").limit(1))).scalar_one_or_none()
        adv_acc_id = adv_acc.id if adv_acc else 2

        # Reverse entries: Credit Bank/Cash, Debit AR / Customer Advances
        db.add(JournalEntry(
            voucher_id=v.id,
            voucher_date=rev_date,
            project_id=rcpt.project_id,
            account_id=bank_id,
            debit_amount=0.00,
            credit_amount=amt,
            narration=f"Reversal credit bank: MR #{rcpt.receipt_number}"
        ))

        if alloc > 0:
            db.add(JournalEntry(
                voucher_id=v.id,
                voucher_date=rev_date,
                project_id=rcpt.project_id,
                account_id=ar_acc_id,
                debit_amount=alloc,
                credit_amount=0.00,
                narration=f"Reversal reinstate AR: MR #{rcpt.receipt_number}"
            ))

        if unalloc > 0:
            db.add(JournalEntry(
                voucher_id=v.id,
                voucher_date=rev_date,
                project_id=rcpt.project_id,
                account_id=adv_acc_id,
                debit_amount=unalloc,
                credit_amount=0.00,
                narration=f"Reversal remove Customer Advance: MR #{rcpt.receipt_number}"
            ))

    rcpt.status = "Reversed"
    rcpt.reversal_reason = payload.reversal_reason
    rcpt.reversal_date = rev_date
    rcpt.reversal_voucher_id = reversal_voucher_id
    rcpt.unallocated_amount = 0.00
    if payload.notes:
        rcpt.notes = f"{rcpt.notes or ''} [Reversed: {payload.notes}]"

    await db.commit()
    return await get_customer_receipt_details(rcpt.id, db)


@router.post("/receivables/receipts/{receipt_id}/refund", response_model=ARReceiptResponse)
async def refund_customer_receipt(
    receipt_id: int,
    payload: ARReceiptRefundRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Refunds unallocated advance cash back to customer (e.g. booking cancellation or excess payment).
    Posts GL Payment Voucher (Debit Customer Advances 2140, Credit Bank 1110).
    """
    stmt = (
        select(ARReceipt)
        .options(selectinload(ARReceipt.customer))
        .where(ARReceipt.id == receipt_id)
    )
    rcpt = (await db.execute(stmt)).scalar_one_or_none()
    if not rcpt:
        raise HTTPException(status_code=404, detail=f"Money Receipt #{receipt_id} not found.")

    current_unalloc = float(rcpt.unallocated_amount)
    ref_amt = round(float(payload.refund_amount), 2)
    if ref_amt <= 0 or ref_amt > current_unalloc + 0.009:
        raise HTTPException(
            status_code=400,
            detail=f"Refund amount (৳ {ref_amt:,.2f}) must be between ৳ 0.01 and unallocated balance (৳ {current_unalloc:,.2f})."
        )

    ref_date = payload.refund_date or date.today()
    bank_id = payload.bank_account_id or rcpt.bank_account_id
    if not bank_id:
        def_bank = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code.in_(["1110", "1120"])).limit(1))).scalar_one_or_none()
        bank_id = def_bank.id if def_bank else 1

    adv_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == "2140").limit(1))).scalar_one_or_none()
    adv_acc_id = adv_acc.id if adv_acc else 2

    # Post Payment Voucher for Refund
    v_num = f"BP-REF-{ref_date.strftime('%Y%m')}-{int(datetime.now().timestamp()) % 10000:04d}"
    v = Voucher(
        organization_id=1,
        project_id=rcpt.project_id,
        voucher_number=v_num,
        voucher_type="Payment",
        voucher_date=ref_date,
        narration=f"Customer Advance Refund: MR #{rcpt.receipt_number}. Reason: {payload.refund_reason}",
        total_debit_amount=ref_amt,
        total_credit_amount=ref_amt,
        status="Posted",
        source_document_type="Customer_Refund",
        posted_at=datetime.now()
    )
    db.add(v)
    await db.flush()

    # Debit Customer Advances Liability (2140)
    db.add(JournalEntry(
        voucher_id=v.id,
        voucher_date=ref_date,
        project_id=rcpt.project_id,
        account_id=adv_acc_id,
        debit_amount=ref_amt,
        credit_amount=0.00,
        narration=f"Advance Refund to Customer: {rcpt.customer.full_name_en if rcpt.customer else 'Customer'}"
    ))

    # Credit Bank (1110)
    db.add(JournalEntry(
        voucher_id=v.id,
        voucher_date=ref_date,
        project_id=rcpt.project_id,
        account_id=bank_id,
        debit_amount=0.00,
        credit_amount=ref_amt,
        cheque_no=payload.cheque_or_ref,
        narration=f"Disbursement of refund: MR #{rcpt.receipt_number}"
    ))

    rcpt.unallocated_amount = round(current_unalloc - ref_amt, 2)
    if rcpt.unallocated_amount <= 0.009:
        rcpt.unallocated_amount = 0.00
        rcpt.status = "Refunded" if rcpt.allocated_amount <= 0.009 else "Allocated"

    rcpt.notes = f"{rcpt.notes or ''} [Refunded ৳ {ref_amt:,.2f} on {ref_date}: {payload.refund_reason}]"

    await db.commit()
    return await get_customer_receipt_details(rcpt.id, db)


@router.get("/receivables/customers/{customer_id}/unallocated-receipts", response_model=List[ARReceiptResponse])
async def get_customer_unallocated_receipts(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all receipts with available unallocated cash for a specific customer.
    Used by allocation wizards and demand notices.
    """
    stmt = (
        select(ARReceipt)
        .options(
            selectinload(ARReceipt.customer),
            selectinload(ARReceipt.project),
            selectinload(ARReceipt.allocations).selectinload(ARReceiptAllocation.invoice)
        )
        .where(
            ARReceipt.customer_id == customer_id,
            ARReceipt.unallocated_amount > 0.009,
            ARReceipt.status.in_(["Cleared", "Unallocated", "Partially_Allocated"])
        )
        .order_by(ARReceipt.receipt_date.asc())
    )
    receipts = (await db.execute(stmt)).scalars().all()

    res = []
    for r in receipts:
        resp = ARReceiptResponse.model_validate(r)
        resp.customer_name = r.customer.full_name_en if r.customer else None
        resp.project_name = r.project.project_name if r.project else None
        res.append(resp)
    return res


@router.get("/receivables/customers/{customer_id}/outstanding-invoices", response_model=List[ARInvoiceResponse])
async def get_customer_outstanding_invoices(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all outstanding unpaid/partially paid demand notices for a customer to allocate against.
    """
    stmt = (
        select(ARInvoice)
        .options(
            selectinload(ARInvoice.customer),
            selectinload(ARInvoice.project),
            selectinload(ARInvoice.unit)
        )
        .where(
            ARInvoice.customer_id == customer_id,
            ARInvoice.balance_due > 0.009,
            ARInvoice.status.notin_(["Cancelled", "Written_Off"])
        )
        .order_by(ARInvoice.due_date.asc())
    )
    invoices = (await db.execute(stmt)).scalars().all()

    res = []
    for inv in invoices:
        resp = ARInvoiceResponse.model_validate(inv)
        resp.customer_name = inv.customer.full_name_en if inv.customer else None
        resp.project_name = inv.project.project_name if inv.project else None
        resp.unit_number = inv.unit.unit_number if inv.unit else None
        res.append(resp)
    return res


# --------------------------------------------------------------------------
# 16. Cash, Bank & Mobile Financial Services (MFS) Engines
# --------------------------------------------------------------------------

def mask_bank_account_no(acc_num: str) -> str:
    cleaned = acc_num.strip()
    if len(cleaned) <= 4:
        return f"****{cleaned}"
    return f"{'*' * (len(cleaned) - 4)}{cleaned[-4:]}"

def hash_bank_account_no(acc_num: str) -> str:
    return hashlib.sha256(f"BlueOceans_Bank_{acc_num.strip()}".encode('utf-8')).hexdigest()


# --------------------------------------------------------------------------
# A. Executive Cash & Bank Position KPIs Cockpit
# --------------------------------------------------------------------------
@router.get("/cash-bank/position-kpis", response_model=CashBankPositionKPIsResponse)
async def get_cash_bank_position_kpis(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns executive-level real-time liquidity position across:
    - Office/site cash boxes and petty cash imprest funds
    - Bank accounts (Corporate, Escrow, SND, Current, Savings)
    - Mobile Financial Services (bKash, Nagad, Rocket) daily collections and gateway fee expense
    """
    # 1. Cash Boxes
    cb_stmt = select(CashBox).options(selectinload(CashBox.project))
    if project_id:
        cb_stmt = cb_stmt.where(CashBox.project_id == project_id)
    cashboxes = (await db.execute(cb_stmt)).scalars().all()
    
    total_cash = sum(float(cb.current_balance or 0.0) for cb in cashboxes)
    imprest_alerts = sum(1 for cb in cashboxes if float(cb.current_balance or 0.0) <= float(cb.replenishment_threshold or 0.0))

    cash_positions = [
        {
            "id": cb.id,
            "box_code": cb.box_code,
            "box_name": cb.box_name,
            "cashbox_type": cb.cashbox_type,
            "project_name": cb.project.project_name if cb.project else "Head Office",
            "current_balance": float(cb.current_balance or 0.0),
            "imprest_limit": float(cb.imprest_limit or 0.0),
            "replenishment_threshold": float(cb.replenishment_threshold or 0.0),
            "needs_replenishment": float(cb.current_balance or 0.0) <= float(cb.replenishment_threshold or 0.0),
            "status": cb.status
        }
        for cb in cashboxes
    ]

    # 2. Bank Accounts
    ba_stmt = select(BankAccount).options(selectinload(BankAccount.project))
    if project_id:
        ba_stmt = ba_stmt.where(BankAccount.project_id == project_id)
    banks = (await db.execute(ba_stmt)).scalars().all()

    total_bank = sum(float(ba.current_balance or 0.0) for ba in banks if ba.is_active)

    bank_positions = [
        {
            "id": ba.id,
            "bank_name": ba.bank_name,
            "branch_name": ba.branch_name,
            "account_name": ba.account_name,
            "account_number_masked": ba.account_number_masked,
            "routing_number": ba.routing_number,
            "account_type": ba.account_type,
            "project_name": ba.project.project_name if ba.project else "Central Holding",
            "current_balance": float(ba.current_balance or 0.0),
            "is_escrow": ba.is_escrow,
            "is_active": ba.is_active
        }
        for ba in banks
    ]

    # 3. MFS Providers & Today's Volume
    mfs_stmt = select(MFSProvider).where(MFSProvider.is_active == True)
    providers = (await db.execute(mfs_stmt)).scalars().all()

    today = date.today()
    today_trx_stmt = select(MFSTransaction).where(
        MFSTransaction.created_at >= datetime.combine(today, datetime.min.time())
    )
    if project_id:
        today_trx_stmt = today_trx_stmt.where(MFSTransaction.project_id == project_id)
    today_trxs = (await db.execute(today_trx_stmt)).scalars().all()

    total_mfs_gross = sum(float(t.gross_amount or 0.0) for t in today_trxs if t.status == "Success")
    total_mfs_fees = sum(float(t.fee_deducted or 0.0) for t in today_trxs if t.status == "Success")
    total_mfs_net = sum(float(t.net_settlement_amount or 0.0) for t in today_trxs if t.status == "Success")

    mfs_positions = [
        {
            "id": p.id,
            "provider_code": p.provider_code,
            "provider_name": p.provider_name,
            "merchant_number": p.merchant_number,
            "fee_percentage": float(p.fee_percentage or 0.0),
            "account_type": p.account_type,
            "daily_limit": float(p.daily_limit or 0.0)
        }
        for p in providers
    ]

    return CashBankPositionKPIsResponse(
        total_liquid_funds=round(total_cash + total_bank, 2),
        total_cashbox_balance=round(total_cash, 2),
        total_bank_balance=round(total_bank, 2),
        total_mfs_gross_today=round(total_mfs_gross, 2),
        total_mfs_net_today=round(total_mfs_net, 2),
        total_mfs_fees_today=round(total_mfs_fees, 2),
        active_cashboxes_count=len(cashboxes),
        active_bank_accounts_count=len(banks),
        active_mfs_providers_count=len(providers),
        imprest_alert_count=imprest_alerts,
        bank_positions=bank_positions,
        cash_positions=cash_positions,
        mfs_positions=mfs_positions
    )


# --------------------------------------------------------------------------
# B. Cash Management (Multiple Cashboxes & Site Funds)
# --------------------------------------------------------------------------
@router.get("/cash/boxes", response_model=List[CashBoxResponse])
async def list_cash_boxes(
    project_id: Optional[int] = Query(None),
    cashbox_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List multiple physical cashboxes and project site imprest funds.
    """
    stmt = (
        select(CashBox)
        .options(
            selectinload(CashBox.project),
            selectinload(CashBox.account),
            selectinload(CashBox.custodian),
            selectinload(CashBox.vouchers)
        )
    )
    if project_id:
        stmt = stmt.where(CashBox.project_id == project_id)
    if cashbox_type:
        stmt = stmt.where(CashBox.cashbox_type == cashbox_type)
    if status_filter:
        stmt = stmt.where(CashBox.status == status_filter)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(or_(CashBox.box_code.ilike(s), CashBox.box_name.ilike(s)))

    stmt = stmt.order_by(CashBox.id.asc()).offset(offset).limit(limit)
    records = (await db.execute(stmt)).scalars().all()

    resp_list = []
    for cb in records:
        r = CashBoxResponse.model_validate(cb)
        r.project_name = cb.project.project_name if cb.project else "Head Office / Corporate"
        r.account_code = cb.account.account_code if cb.account else "1110"
        r.account_name = cb.account.account_name_en if cb.account else "Cash in Hand"
        r.custodian_name = cb.custodian.full_name_en if cb.custodian else "Finance Officer"
        r.needs_replenishment = float(cb.current_balance or 0.0) <= float(cb.replenishment_threshold or 0.0)
        resp_list.append(r)
    return resp_list


@router.get("/cash/boxes/{box_id}", response_model=CashBoxResponse)
async def get_cash_box_details(
    box_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get single cashbox details and recent vouchers.
    """
    stmt = (
        select(CashBox)
        .options(
            selectinload(CashBox.project),
            selectinload(CashBox.account),
            selectinload(CashBox.custodian),
            selectinload(CashBox.vouchers).selectinload(PettyCashVoucher.project),
            selectinload(CashBox.vouchers).selectinload(PettyCashVoucher.expense_account),
            selectinload(CashBox.vouchers).selectinload(PettyCashVoucher.cost_center),
            selectinload(CashBox.vouchers).selectinload(PettyCashVoucher.gl_voucher)
        )
        .where(CashBox.id == box_id)
    )
    cb = (await db.execute(stmt)).scalar_one_or_none()
    if not cb:
        raise HTTPException(status_code=404, detail=f"Cash box #{box_id} not found.")

    r = CashBoxResponse.model_validate(cb)
    r.project_name = cb.project.project_name if cb.project else "Head Office / Corporate"
    r.account_code = cb.account.account_code if cb.account else "1110"
    r.account_name = cb.account.account_name_en if cb.account else "Cash in Hand"
    r.custodian_name = cb.custodian.full_name_en if cb.custodian else "Finance Officer"
    r.needs_replenishment = float(cb.current_balance or 0.0) <= float(cb.replenishment_threshold or 0.0)

    voucher_list = []
    for v in cb.vouchers[-20:]:
        vr = PettyCashVoucherResponse.model_validate(v)
        vr.cash_box_name = cb.box_name
        vr.project_name = v.project.project_name if v.project else None
        vr.expense_account_name = v.expense_account.account_name_en if v.expense_account else None
        vr.cost_center_name = v.cost_center.name if v.cost_center else None
        vr.gl_voucher_number = v.gl_voucher.voucher_number if v.gl_voucher else None
        voucher_list.append(vr)
    r.vouchers = voucher_list
    return r


@router.post("/cash/boxes", response_model=CashBoxResponse, status_code=status.HTTP_201_CREATED)
async def create_cash_box(
    payload: CashBoxCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new physical cashbox or project site imprest fund.
    """
    code_clean = payload.box_code.strip().upper()
    existing = (await db.execute(select(CashBox).where(CashBox.box_code == code_clean))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail=f"Cashbox code '{code_clean}' already exists.")

    org_id = await get_default_organization_id(db)

    # Link or auto-create corresponding Chart of Account leaf
    acc_id = payload.account_id
    if not acc_id:
        acc = await get_or_create_account(
            db=db,
            organization_id=org_id,
            account_code=f"1115-{code_clean[-4:]}",
            account_name_en=f"Cash Box - {payload.box_name}",
            account_type="Asset"
        )
        acc_id = acc.id

    cb = CashBox(
        organization_id=org_id,
        box_code=code_clean,
        box_name=payload.box_name.strip(),
        cashbox_type=payload.cashbox_type,
        project_id=payload.project_id,
        account_id=acc_id,
        custodian_user_id=payload.custodian_user_id,
        imprest_limit=Decimal(str(payload.imprest_limit)),
        replenishment_threshold=Decimal(str(payload.replenishment_threshold)),
        current_balance=Decimal(str(payload.current_balance or 0.0)),
        status=payload.status or "Active",
        notes=payload.notes
    )
    db.add(cb)
    await db.commit()
    await db.refresh(cb)
    return await get_cash_box_details(cb.id, db)


@router.put("/cash/boxes/{box_id}", response_model=CashBoxResponse)
async def update_cash_box(
    box_id: int,
    payload: CashBoxUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update cashbox configuration (imprest limit, threshold, custodian, status).
    """
    cb = (await db.execute(select(CashBox).where(CashBox.id == box_id))).scalar_one_or_none()
    if not cb:
        raise HTTPException(status_code=404, detail="Cashbox not found.")

    if payload.box_name is not None:
        cb.box_name = payload.box_name.strip()
    if payload.cashbox_type is not None:
        cb.cashbox_type = payload.cashbox_type
    if payload.project_id is not None:
        cb.project_id = payload.project_id
    if payload.custodian_user_id is not None:
        cb.custodian_user_id = payload.custodian_user_id
    if payload.imprest_limit is not None:
        cb.imprest_limit = Decimal(str(payload.imprest_limit))
    if payload.replenishment_threshold is not None:
        cb.replenishment_threshold = Decimal(str(payload.replenishment_threshold))
    if payload.status is not None:
        cb.status = payload.status
    if payload.notes is not None:
        cb.notes = payload.notes

    await db.commit()
    await db.refresh(cb)
    return await get_cash_box_details(cb.id, db)


@router.get("/cash/vouchers", response_model=List[PettyCashVoucherResponse])
async def list_petty_cash_vouchers(
    cash_box_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    transaction_type: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List petty cash vouchers, expense claims, and physical cash audit entries.
    """
    stmt = (
        select(PettyCashVoucher)
        .options(
            selectinload(PettyCashVoucher.cash_box),
            selectinload(PettyCashVoucher.project),
            selectinload(PettyCashVoucher.expense_account),
            selectinload(PettyCashVoucher.cost_center),
            selectinload(PettyCashVoucher.gl_voucher)
        )
    )
    if cash_box_id:
        stmt = stmt.where(PettyCashVoucher.cash_box_id == cash_box_id)
    if project_id:
        stmt = stmt.where(PettyCashVoucher.project_id == project_id)
    if transaction_type:
        stmt = stmt.where(PettyCashVoucher.transaction_type == transaction_type)
    if date_from:
        stmt = stmt.where(PettyCashVoucher.transaction_date >= date_from)
    if date_to:
        stmt = stmt.where(PettyCashVoucher.transaction_date <= date_to)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                PettyCashVoucher.voucher_number.ilike(s),
                PettyCashVoucher.payee_name.ilike(s),
                PettyCashVoucher.purpose.ilike(s)
            )
        )

    stmt = stmt.order_by(PettyCashVoucher.transaction_date.desc(), PettyCashVoucher.id.desc()).offset(offset).limit(limit)
    records = (await db.execute(stmt)).scalars().all()

    resp_list = []
    for v in records:
        r = PettyCashVoucherResponse.model_validate(v)
        r.cash_box_name = v.cash_box.box_name if v.cash_box else None
        r.project_name = v.project.project_name if v.project else None
        r.expense_account_name = v.expense_account.account_name_en if v.expense_account else None
        r.cost_center_name = v.cost_center.name if v.cost_center else None
        r.gl_voucher_number = v.gl_voucher.voucher_number if v.gl_voucher else None
        resp_list.append(r)
    return resp_list


@router.post("/cash/vouchers", response_model=PettyCashVoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_petty_cash_voucher(
    payload: PettyCashVoucherCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Disburse cash or record an imprest expense claim:
    - Verifies cashbox has sufficient balance for disbursement.
    - Decrements cashbox balance (or increments on receipt/replenish).
    - Posts automated balanced Double-Entry GL Voucher:
      * Debit: Expense Account (e.g. 5200 Site Administrative & Travel)
      * Credit: Cash Box Account (e.g. 1115 Project Site Petty Cash)
    """
    cb = (await db.execute(select(CashBox).where(CashBox.id == payload.cash_box_id))).scalar_one_or_none()
    if not cb:
        raise HTTPException(status_code=404, detail="Cash box not found.")

    amount = Decimal(str(payload.amount))
    if amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Voucher amount must be positive.")

    curr_bal = Decimal(str(cb.current_balance or 0.0))
    is_disbursement = payload.transaction_type in ["Disbursement", "Fund_Transfer"]

    if is_disbursement and curr_bal < amount:
        raise HTTPException(
            status_code=400,
            detail=f"INSUFFICIENT CASH FUNDS: Box '{cb.box_name}' current balance is ৳ {curr_bal:,.2f}, cannot disburse ৳ {amount:,.2f}."
        )

    # Generate sequential voucher number
    cnt = (await db.execute(select(func.count(PettyCashVoucher.id)))).scalar() or 0
    t_date = payload.transaction_date or date.today()
    v_number = f"PCV-{t_date.year}-{cnt + 1:04d}"

    org_id = await get_default_organization_id(db)

    # Double-entry GL voucher posting
    box_acc = await get_or_create_account(
        db=db,
        organization_id=org_id,
        account_code="1115",
        account_name_en=f"Petty Cash Fund - {cb.box_name}",
        account_type="Asset"
    )

    exp_acc_id = payload.expense_account_id
    if not exp_acc_id:
        default_exp = await get_or_create_account(
            db=db,
            organization_id=org_id,
            account_code="5200",
            account_name_en="Office & Site Administrative Expenses",
            account_type="Expense"
        )
        exp_acc_id = default_exp.id
        exp_acc_code = "5200"
        exp_acc_name = "Office & Site Administrative Expenses"
    else:
        exp_row = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.id == exp_acc_id))).scalar_one()
        exp_acc_code = exp_row.account_code
        exp_acc_name = exp_row.account_name_en

    if is_disbursement:
        lines = [
            {
                "account_code": exp_acc_code,
                "account_name_en": exp_acc_name,
                "account_type": "Expense",
                "debit": amount,
                "credit": Decimal("0.00"),
                "narration": f"{payload.purpose} (Paid to: {payload.payee_name})"
            },
            {
                "account_code": box_acc.account_code,
                "account_name_en": box_acc.account_name_en,
                "account_type": "Asset",
                "debit": Decimal("0.00"),
                "credit": amount,
                "narration": f"Cash disbursement from {cb.box_name} ({v_number})"
            }
        ]
        cb.current_balance = curr_bal - amount
    else: # Receipt or Imprest replenishment
        lines = [
            {
                "account_code": box_acc.account_code,
                "account_name_en": box_acc.account_name_en,
                "account_type": "Asset",
                "debit": amount,
                "credit": Decimal("0.00"),
                "narration": f"Cash received / imprest replenishment into {cb.box_name}"
            },
            {
                "account_code": "1110",
                "account_name_en": "Main Cash / Bank Fund",
                "account_type": "Asset",
                "debit": Decimal("0.00"),
                "credit": amount,
                "narration": f"Source fund for {cb.box_name} ({v_number})"
            }
        ]
        cb.current_balance = curr_bal + amount

    gl_v = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=payload.project_id or cb.project_id,
        voucher_type="Cash_Payment" if is_disbursement else "Cash_Receipt",
        narration=f"Petty cash voucher {v_number}: {payload.purpose}",
        line_entries=lines
    )

    voucher = PettyCashVoucher(
        organization_id=org_id,
        voucher_number=v_number,
        cash_box_id=cb.id,
        project_id=payload.project_id or cb.project_id,
        transaction_date=t_date,
        transaction_type=payload.transaction_type,
        amount=amount,
        payee_name=payload.payee_name.strip(),
        expense_account_id=exp_acc_id,
        cost_center_id=payload.cost_center_id,
        purpose=payload.purpose.strip(),
        supporting_receipt_ref=payload.supporting_receipt_ref,
        gl_voucher_id=gl_v.id,
        status="Approved"
    )
    db.add(voucher)
    await db.commit()
    await db.refresh(voucher)

    # Return with validated relationships
    stmt = (
        select(PettyCashVoucher)
        .options(
            selectinload(PettyCashVoucher.cash_box),
            selectinload(PettyCashVoucher.project),
            selectinload(PettyCashVoucher.expense_account),
            selectinload(PettyCashVoucher.cost_center),
            selectinload(PettyCashVoucher.gl_voucher)
        )
        .where(PettyCashVoucher.id == voucher.id)
    )
    v_loaded = (await db.execute(stmt)).scalar_one()
    resp = PettyCashVoucherResponse.model_validate(v_loaded)
    resp.cash_box_name = v_loaded.cash_box.box_name if v_loaded.cash_box else None
    resp.project_name = v_loaded.project.project_name if v_loaded.project else None
    resp.expense_account_name = v_loaded.expense_account.account_name_en if v_loaded.expense_account else None
    resp.cost_center_name = v_loaded.cost_center.name if v_loaded.cost_center else None
    resp.gl_voucher_number = v_loaded.gl_voucher.voucher_number if v_loaded.gl_voucher else None
    return resp


@router.post("/cash/audit-count", response_model=PettyCashVoucherResponse)
async def perform_cash_count_audit(
    payload: CashCountAuditRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Perform periodic or day-end physical cash count and closing balance audit:
    - Calculates variance = Physical Count - System Book Balance.
    - If Variance < 0 (Shortage):
      * Debit: 5330 - Cash Shortage Expense
      * Credit: Cash Box Asset Account
    - If Variance > 0 (Overage):
      * Debit: Cash Box Asset Account
      * Credit: 4250 - Miscellaneous Income / Cash Overage
    - Adjusts cashbox book balance to match the actual verified physical cash count.
    """
    cb = (await db.execute(select(CashBox).where(CashBox.id == payload.cash_box_id))).scalar_one_or_none()
    if not cb:
        raise HTTPException(status_code=404, detail="Cash box not found.")

    system_bal = Decimal(str(cb.current_balance or 0.0))
    physical_count = Decimal(str(payload.physical_count_amount))
    variance = physical_count - system_bal

    t_date = payload.audit_date or date.today()
    cnt = (await db.execute(select(func.count(PettyCashVoucher.id)))).scalar() or 0
    v_number = f"AUDIT-CB-{t_date.year}-{cnt + 1:04d}"

    org_id = await get_default_organization_id(db)
    gl_v_id = None

    if payload.auto_post_adjustment_gl and abs(variance) > Decimal("0.009"):
        box_acc = await get_or_create_account(
            db=db,
            organization_id=org_id,
            account_code="1115",
            account_name_en=f"Petty Cash Fund - {cb.box_name}",
            account_type="Asset"
        )
        if variance < Decimal("0.00"): # Shortage
            shortage_amt = abs(variance)
            shortage_acc = await get_or_create_account(
                db=db,
                organization_id=org_id,
                account_code="5330",
                account_name_en="Cash Shortage Expense",
                account_type="Expense"
            )
            lines = [
                {
                    "account_code": shortage_acc.account_code,
                    "account_name_en": shortage_acc.account_name_en,
                    "account_type": "Expense",
                    "debit": shortage_amt,
                    "credit": Decimal("0.00"),
                    "narration": f"Physical cash shortage on audit of {cb.box_name}"
                },
                {
                    "account_code": box_acc.account_code,
                    "account_name_en": box_acc.account_name_en,
                    "account_type": "Asset",
                    "debit": Decimal("0.00"),
                    "credit": shortage_amt,
                    "narration": f"Cash box adjustment for shortage ({v_number})"
                }
            ]
        else: # Overage
            overage_amt = variance
            overage_acc = await get_or_create_account(
                db=db,
                organization_id=org_id,
                account_code="4250",
                account_name_en="Cash Overage & Miscellaneous Income",
                account_type="Revenue"
            )
            lines = [
                {
                    "account_code": box_acc.account_code,
                    "account_name_en": box_acc.account_name_en,
                    "account_type": "Asset",
                    "debit": overage_amt,
                    "credit": Decimal("0.00"),
                    "narration": f"Cash box adjustment for excess count ({v_number})"
                },
                {
                    "account_code": overage_acc.account_code,
                    "account_name_en": overage_acc.account_name_en,
                    "account_type": "Revenue",
                    "debit": Decimal("0.00"),
                    "credit": overage_amt,
                    "narration": f"Physical cash overage on audit of {cb.box_name}"
                }
            ]

        gl_voucher = await post_double_entry_voucher(
            db=db,
            organization_id=org_id,
            project_id=cb.project_id,
            voucher_type="Journal",
            narration=f"Cash audit count variance adjustment ({v_number}): {payload.purpose}",
            line_entries=lines
        )
        gl_v_id = gl_voucher.id

    # Update cash box current balance to match physical audit
    cb.current_balance = physical_count

    voucher = PettyCashVoucher(
        organization_id=org_id,
        voucher_number=v_number,
        cash_box_id=cb.id,
        project_id=cb.project_id,
        transaction_date=t_date,
        transaction_type="Cash_Audit_Count",
        amount=physical_count,
        payee_name=f"Audit Count - {cb.box_name}",
        purpose=f"{payload.purpose} (System: ৳ {system_bal:,.2f}, Physical: ৳ {physical_count:,.2f}, Variance: ৳ {variance:,.2f})",
        supporting_receipt_ref=payload.supporting_receipt_ref,
        cash_count_system=system_bal,
        cash_count_physical=physical_count,
        variance_amount=variance,
        gl_voucher_id=gl_v_id,
        status="Approved"
    )
    db.add(voucher)
    await db.commit()
    await db.refresh(voucher)

    stmt = (
        select(PettyCashVoucher)
        .options(
            selectinload(PettyCashVoucher.cash_box),
            selectinload(PettyCashVoucher.project),
            selectinload(PettyCashVoucher.expense_account),
            selectinload(PettyCashVoucher.cost_center),
            selectinload(PettyCashVoucher.gl_voucher)
        )
        .where(PettyCashVoucher.id == voucher.id)
    )
    v_loaded = (await db.execute(stmt)).scalar_one()
    resp = PettyCashVoucherResponse.model_validate(v_loaded)
    resp.cash_box_name = v_loaded.cash_box.box_name if v_loaded.cash_box else None
    resp.project_name = v_loaded.project.project_name if v_loaded.project else None
    resp.gl_voucher_number = v_loaded.gl_voucher.voucher_number if v_loaded.gl_voucher else None
    return resp


@router.post("/cash/transfer", response_model=PettyCashVoucherResponse)
async def transfer_cash_between_funds(
    payload: CashTransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Cash transfer between authorized funds (e.g., Central Cash to Project Site Imprest):
    - Verifies source cash box balance.
    - Decrements from_cash_box, increments to_cash_box.
    - Posts automated Contra GL voucher (CV):
      * Debit: Destination Cash Box Asset Account
      * Credit: Source Cash Box Asset Account
    """
    if payload.from_cash_box_id == payload.to_cash_box_id:
        raise HTTPException(status_code=400, detail="Source and destination cash boxes cannot be identical.")

    amount = Decimal(str(payload.amount))
    if amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Transfer amount must be positive.")

    from_cb = (await db.execute(select(CashBox).where(CashBox.id == payload.from_cash_box_id))).scalar_one_or_none()
    to_cb = (await db.execute(select(CashBox).where(CashBox.id == payload.to_cash_box_id))).scalar_one_or_none()

    if not from_cb or not to_cb:
        raise HTTPException(status_code=404, detail="Source or destination cash box not found.")

    from_bal = Decimal(str(from_cb.current_balance or 0.0))
    if from_bal < amount:
        raise HTTPException(
            status_code=400,
            detail=f"INSUFFICIENT BALANCE: Source box '{from_cb.box_name}' has ৳ {from_bal:,.2f}, cannot transfer ৳ {amount:,.2f}."
        )

    t_date = payload.transfer_date or date.today()
    cnt = (await db.execute(select(func.count(PettyCashVoucher.id)))).scalar() or 0
    v_number = f"TRF-CASH-{t_date.year}-{cnt + 1:04d}"

    org_id = await get_default_organization_id(db)

    # Post Contra GL voucher
    from_acc = await get_or_create_account(
        db=db,
        organization_id=org_id,
        account_code=f"1115-{from_cb.box_code[-4:]}",
        account_name_en=f"Cash Box - {from_cb.box_name}",
        account_type="Asset"
    )
    to_acc = await get_or_create_account(
        db=db,
        organization_id=org_id,
        account_code=f"1115-{to_cb.box_code[-4:]}",
        account_name_en=f"Cash Box - {to_cb.box_name}",
        account_type="Asset"
    )

    lines = [
        {
            "account_code": to_acc.account_code,
            "account_name_en": to_acc.account_name_en,
            "account_type": "Asset",
            "debit": amount,
            "credit": Decimal("0.00"),
            "narration": f"Contra Cash transfer received from {from_cb.box_name} ({v_number})"
        },
        {
            "account_code": from_acc.account_code,
            "account_name_en": from_acc.account_name_en,
            "account_type": "Asset",
            "debit": Decimal("0.00"),
            "credit": amount,
            "narration": f"Contra Cash transfer disbursed to {to_cb.box_name} ({v_number})"
        }
    ]

    gl_voucher = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=to_cb.project_id,
        voucher_type="Contra",
        narration=f"Cash transfer {v_number}: from {from_cb.box_name} to {to_cb.box_name} ({payload.particulars})",
        line_entries=lines
    )

    from_cb.current_balance = from_bal - amount
    to_cb.current_balance = Decimal(str(to_cb.current_balance or 0.0)) + amount

    voucher = PettyCashVoucher(
        organization_id=org_id,
        voucher_number=v_number,
        cash_box_id=from_cb.id,
        project_id=to_cb.project_id,
        transaction_date=t_date,
        transaction_type="Fund_Transfer",
        amount=amount,
        payee_name=to_cb.box_name,
        purpose=f"Cash transfer to {to_cb.box_name}: {payload.particulars}",
        supporting_receipt_ref=payload.reference_number,
        gl_voucher_id=gl_voucher.id,
        status="Approved"
    )
    db.add(voucher)
    await db.commit()
    await db.refresh(voucher)

    stmt = (
        select(PettyCashVoucher)
        .options(
            selectinload(PettyCashVoucher.cash_box),
            selectinload(PettyCashVoucher.project),
            selectinload(PettyCashVoucher.gl_voucher)
        )
        .where(PettyCashVoucher.id == voucher.id)
    )
    v_loaded = (await db.execute(stmt)).scalar_one()
    resp = PettyCashVoucherResponse.model_validate(v_loaded)
    resp.cash_box_name = v_loaded.cash_box.box_name if v_loaded.cash_box else None
    resp.project_name = v_loaded.project.project_name if v_loaded.project else None
    resp.gl_voucher_number = v_loaded.gl_voucher.voucher_number if v_loaded.gl_voucher else None
    return resp


# --------------------------------------------------------------------------
# C. Bank Management (Multiple Bank Accounts, Masking & Cheque Tracker)
# --------------------------------------------------------------------------
@router.get("/bank/accounts", response_model=List[BankAccountResponse])
async def list_bank_accounts(
    project_id: Optional[int] = Query(None),
    account_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List bank accounts with masked account numbers, routing, and cheque book metrics.
    """
    stmt = (
        select(BankAccount)
        .options(
            selectinload(BankAccount.project),
            selectinload(BankAccount.account),
            selectinload(BankAccount.transactions)
        )
    )
    if project_id:
        stmt = stmt.where(BankAccount.project_id == project_id)
    if account_type:
        stmt = stmt.where(BankAccount.account_type == account_type)
    if is_active is not None:
        stmt = stmt.where(BankAccount.is_active == is_active)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                BankAccount.bank_name.ilike(s),
                BankAccount.branch_name.ilike(s),
                BankAccount.account_name.ilike(s),
                BankAccount.routing_number.ilike(s)
            )
        )

    stmt = stmt.order_by(BankAccount.id.asc()).offset(offset).limit(limit)
    records = (await db.execute(stmt)).scalars().all()

    resp_list = []
    for ba in records:
        r = BankAccountResponse.model_validate(ba)
        r.project_name = ba.project.project_name if ba.project else "Central Corporate"
        r.gl_account_code = ba.account.account_code if ba.account else "1110"
        r.gl_account_name = ba.account.account_name_en if ba.account else "Bank Accounts"

        # Calculate Cheque Book Metrics
        if ba.active_cheque_start and ba.active_cheque_end:
            total_leaves = (ba.active_cheque_end - ba.active_cheque_start) + 1
            used = (ba.last_used_cheque_no - ba.active_cheque_start + 1) if ba.last_used_cheque_no and ba.last_used_cheque_no >= ba.active_cheque_start else 0
            available = max(0, total_leaves - used)
            r.total_cheques_configured = total_leaves
            r.cheques_used_count = used
            r.cheques_available_count = available

        resp_list.append(r)
    return resp_list


@router.get("/bank/accounts/{account_id}", response_model=BankAccountResponse)
async def get_bank_account_details(
    account_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get full bank account details including masked number, routing, and recent transactions.
    """
    stmt = (
        select(BankAccount)
        .options(
            selectinload(BankAccount.project),
            selectinload(BankAccount.account),
            selectinload(BankAccount.transactions).selectinload(BankTransaction.contra_account),
            selectinload(BankAccount.transactions).selectinload(BankTransaction.gl_voucher)
        )
        .where(BankAccount.id == account_id)
    )
    ba = (await db.execute(stmt)).scalar_one_or_none()
    if not ba:
        raise HTTPException(status_code=404, detail=f"Bank account #{account_id} not found.")

    r = BankAccountResponse.model_validate(ba)
    r.project_name = ba.project.project_name if ba.project else "Central Corporate"
    r.gl_account_code = ba.account.account_code if ba.account else "1110"
    r.gl_account_name = ba.account.account_name_en if ba.account else "Bank Accounts"

    if ba.active_cheque_start and ba.active_cheque_end:
        total_leaves = (ba.active_cheque_end - ba.active_cheque_start) + 1
        used = (ba.last_used_cheque_no - ba.active_cheque_start + 1) if ba.last_used_cheque_no and ba.last_used_cheque_no >= ba.active_cheque_start else 0
        r.total_cheques_configured = total_leaves
        r.cheques_used_count = used
        r.cheques_available_count = max(0, total_leaves - used)

    tx_list = []
    for tx in ba.transactions[-25:]:
        tr = BankTransactionResponse.model_validate(tx)
        tr.bank_name = ba.bank_name
        tr.account_number_masked = ba.account_number_masked
        tr.contra_account_name = tx.contra_account.account_name_en if tx.contra_account else None
        tr.gl_voucher_number = tx.gl_voucher.voucher_number if tx.gl_voucher else None
        tx_list.append(tr)
    r.transactions = tx_list
    return r


@router.post("/bank/accounts", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_account(
    payload: BankAccountCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new bank account:
    - Enforces security policy: raw account number is hashed into `account_number_encrypted`
      and safely displayed as `account_number_masked` (e.g. `******23001`).
    """
    masked = mask_bank_account_no(payload.account_number)
    enc = hash_bank_account_no(payload.account_number)

    org_id = await get_default_organization_id(db)

    acc_id = payload.account_id
    if not acc_id:
        acc = await get_or_create_account(
            db=db,
            organization_id=org_id,
            account_code=f"1110-{payload.routing_number[-4:]}",
            account_name_en=f"{payload.bank_name} - {masked}",
            account_type="Asset"
        )
        acc_id = acc.id

    op_bal = Decimal(str(payload.opening_balance or 0.0))
    ba = BankAccount(
        organization_id=org_id,
        project_id=payload.project_id,
        bank_name=payload.bank_name.strip(),
        branch_name=payload.branch_name.strip(),
        account_name=payload.account_name.strip(),
        account_number_encrypted=enc,
        account_number_masked=masked,
        routing_number=payload.routing_number.strip(),
        swift_code=payload.swift_code.strip() if payload.swift_code else None,
        account_type=payload.account_type,
        currency=payload.currency or "BDT",
        account_id=acc_id,
        opening_balance=op_bal,
        current_balance=op_bal,
        is_escrow=payload.is_escrow,
        cheque_prefix=payload.cheque_prefix or "CQ-",
        active_cheque_start=payload.active_cheque_start,
        active_cheque_end=payload.active_cheque_end,
        notes=payload.notes
    )
    db.add(ba)
    await db.commit()
    await db.refresh(ba)
    return await get_bank_account_details(ba.id, db)


@router.put("/bank/accounts/{account_id}", response_model=BankAccountResponse)
async def update_bank_account(
    account_id: int,
    payload: BankAccountUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update bank account details and active cheque leaf series.
    """
    ba = (await db.execute(select(BankAccount).where(BankAccount.id == account_id))).scalar_one_or_none()
    if not ba:
        raise HTTPException(status_code=404, detail="Bank account not found.")

    if payload.bank_name is not None:
        ba.bank_name = payload.bank_name.strip()
    if payload.branch_name is not None:
        ba.branch_name = payload.branch_name.strip()
    if payload.account_name is not None:
        ba.account_name = payload.account_name.strip()
    if payload.routing_number is not None:
        ba.routing_number = payload.routing_number.strip()
    if payload.swift_code is not None:
        ba.swift_code = payload.swift_code.strip()
    if payload.account_type is not None:
        ba.account_type = payload.account_type
    if payload.is_escrow is not None:
        ba.is_escrow = payload.is_escrow
    if payload.is_active is not None:
        ba.is_active = payload.is_active
    if payload.cheque_prefix is not None:
        ba.cheque_prefix = payload.cheque_prefix.strip()
    if payload.active_cheque_start is not None:
        ba.active_cheque_start = payload.active_cheque_start
    if payload.active_cheque_end is not None:
        ba.active_cheque_end = payload.active_cheque_end
    if payload.notes is not None:
        ba.notes = payload.notes

    await db.commit()
    await db.refresh(ba)
    return await get_bank_account_details(ba.id, db)


@router.get("/bank/transactions", response_model=List[BankTransactionResponse])
async def list_bank_transactions(
    bank_account_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    transaction_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    is_reconciled: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List bank deposits, withdrawals, cheques issued, bank charges, and interest items.
    """
    stmt = (
        select(BankTransaction)
        .options(
            selectinload(BankTransaction.bank_account),
            selectinload(BankTransaction.project),
            selectinload(BankTransaction.contra_account),
            selectinload(BankTransaction.gl_voucher)
        )
    )
    if bank_account_id:
        stmt = stmt.where(BankTransaction.bank_account_id == bank_account_id)
    if project_id:
        stmt = stmt.where(BankTransaction.project_id == project_id)
    if transaction_type:
        stmt = stmt.where(BankTransaction.transaction_type == transaction_type)
    if status_filter:
        stmt = stmt.where(BankTransaction.status == status_filter)
    if is_reconciled is not None:
        stmt = stmt.where(BankTransaction.is_reconciled == is_reconciled)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                BankTransaction.particulars.ilike(s),
                BankTransaction.cheque_number.ilike(s),
                BankTransaction.reference_number.ilike(s)
            )
        )

    stmt = stmt.order_by(BankTransaction.transaction_date.desc(), BankTransaction.id.desc()).offset(offset).limit(limit)
    records = (await db.execute(stmt)).scalars().all()

    resp_list = []
    for tx in records:
        r = BankTransactionResponse.model_validate(tx)
        r.bank_name = tx.bank_account.bank_name if tx.bank_account else None
        r.account_number_masked = tx.bank_account.account_number_masked if tx.bank_account else None
        r.project_name = tx.project.project_name if tx.project else None
        r.contra_account_name = tx.contra_account.account_name_en if tx.contra_account else None
        r.gl_voucher_number = tx.gl_voucher.voucher_number if tx.gl_voucher else None
        resp_list.append(r)
    return resp_list


@router.post("/bank/transactions", response_model=BankTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_transaction(
    payload: BankTransactionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Record bank deposit, withdrawal, cheque issue, bank charges, or interest income:
    - Increments or decrements bank account current_balance.
    - If cheque_number is issued, updates last_used_cheque_no.
    - Automatically posts double-entry GL voucher:
      * Deposit: Debit Bank / Credit Contra Account
      * Withdrawal: Debit Contra / Credit Bank
      * Bank Charges: Debit Bank Charges Expense (5310) / Credit Bank
      * Interest: Debit Bank / Credit Interest Income (4210)
    """
    ba = (await db.execute(select(BankAccount).where(BankAccount.id == payload.bank_account_id))).scalar_one_or_none()
    if not ba:
        raise HTTPException(status_code=404, detail="Bank account not found.")

    amount = Decimal(str(payload.amount))
    if amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Transaction amount must be positive.")

    curr_bal = Decimal(str(ba.current_balance or 0.0))
    is_outflow = payload.transaction_type in ["Withdrawal", "Cheque_Issue", "Bank_Charge", "Transfer"]

    if is_outflow and curr_bal < amount:
        raise HTTPException(
            status_code=400,
            detail=f"INSUFFICIENT BANK BALANCE: Account '{ba.bank_name} ({ba.account_number_masked})' has ৳ {curr_bal:,.2f}, cannot process ৳ {amount:,.2f}."
        )

    t_date = payload.transaction_date or date.today()
    org_id = await get_default_organization_id(db)

    bank_acc = await get_or_create_account(
        db=db,
        organization_id=org_id,
        account_code="1110",
        account_name_en=f"{ba.bank_name} - {ba.account_number_masked}",
        account_type="Asset"
    )

    # Determine contra lines based on transaction type
    if payload.transaction_type == "Bank_Charge":
        charge_acc = await get_or_create_account(
            db=db, organization_id=org_id,
            account_code="5310", account_name_en="Bank Charges & Excise Duty", account_type="Expense"
        )
        lines = [
            {"account_code": charge_acc.account_code, "account_name_en": charge_acc.account_name_en, "account_type": "Expense", "debit": amount, "credit": Decimal("0.00"), "narration": payload.particulars},
            {"account_code": bank_acc.account_code, "account_name_en": bank_acc.account_name_en, "account_type": "Asset", "debit": Decimal("0.00"), "credit": amount, "narration": f"Bank charges deducted from {ba.bank_name}"}
        ]
        ba.current_balance = curr_bal - amount
        v_type = "Bank_Payment"
    elif payload.transaction_type == "Interest_Income":
        int_acc = await get_or_create_account(
            db=db, organization_id=org_id,
            account_code="4210", account_name_en="Bank Interest & SND Income", account_type="Revenue"
        )
        lines = [
            {"account_code": bank_acc.account_code, "account_name_en": bank_acc.account_name_en, "account_type": "Asset", "debit": amount, "credit": Decimal("0.00"), "narration": f"Interest credited into {ba.bank_name}"},
            {"account_code": int_acc.account_code, "account_name_en": int_acc.account_name_en, "account_type": "Revenue", "debit": Decimal("0.00"), "credit": amount, "narration": payload.particulars}
        ]
        ba.current_balance = curr_bal + amount
        v_type = "Bank_Receipt"
    elif is_outflow:
        contra_acc_code = "2100"
        contra_acc_name = "Accounts Payable / Disbursed Payee"
        if payload.contra_account_id:
            c_row = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.id == payload.contra_account_id))).scalar_one()
            contra_acc_code = c_row.account_code
            contra_acc_name = c_row.account_name_en

        lines = [
            {"account_code": contra_acc_code, "account_name_en": contra_acc_name, "account_type": "Liability", "debit": amount, "credit": Decimal("0.00"), "narration": payload.particulars},
            {"account_code": bank_acc.account_code, "account_name_en": bank_acc.account_name_en, "account_type": "Asset", "debit": Decimal("0.00"), "credit": amount, "narration": f"Disbursement from {ba.bank_name} ({payload.cheque_number or ''})"}
        ]
        ba.current_balance = curr_bal - amount
        v_type = "Bank_Payment"
    else: # Inflow / Deposit
        contra_acc_code = "1130"
        contra_acc_name = "Customer Accounts Receivable"
        if payload.contra_account_id:
            c_row = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.id == payload.contra_account_id))).scalar_one()
            contra_acc_code = c_row.account_code
            contra_acc_name = c_row.account_name_en

        lines = [
            {"account_code": bank_acc.account_code, "account_name_en": bank_acc.account_name_en, "account_type": "Asset", "debit": amount, "credit": Decimal("0.00"), "narration": f"Deposit credited into {ba.bank_name}"},
            {"account_code": contra_acc_code, "account_name_en": contra_acc_name, "account_type": "Asset", "debit": Decimal("0.00"), "credit": amount, "narration": payload.particulars}
        ]
        ba.current_balance = curr_bal + amount
        v_type = "Bank_Receipt"

    gl_v = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=payload.project_id or ba.project_id,
        voucher_type=v_type,
        narration=f"Bank transaction ({payload.transaction_type}): {payload.particulars}",
        line_entries=lines
    )

    # Track cheque usage
    if payload.cheque_number:
        try:
            num_part = int(''.join(filter(str.isdigit, payload.cheque_number)))
            if not ba.last_used_cheque_no or num_part > ba.last_used_cheque_no:
                ba.last_used_cheque_no = num_part
        except ValueError:
            pass

    tx = BankTransaction(
        organization_id=org_id,
        bank_account_id=ba.id,
        project_id=payload.project_id or ba.project_id,
        transaction_date=t_date,
        transaction_type=payload.transaction_type,
        amount=amount,
        cheque_number=payload.cheque_number,
        cheque_date=payload.cheque_date,
        cheque_status=payload.cheque_status or ("Issued" if payload.cheque_number else None),
        contra_account_id=payload.contra_account_id,
        reference_number=payload.reference_number,
        particulars=payload.particulars.strip(),
        gl_voucher_id=gl_v.id,
        is_reconciled=False,
        status="Cleared"
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)

    stmt = (
        select(BankTransaction)
        .options(
            selectinload(BankTransaction.bank_account),
            selectinload(BankTransaction.project),
            selectinload(BankTransaction.contra_account),
            selectinload(BankTransaction.gl_voucher)
        )
        .where(BankTransaction.id == tx.id)
    )
    t_loaded = (await db.execute(stmt)).scalar_one()
    resp = BankTransactionResponse.model_validate(t_loaded)
    resp.bank_name = t_loaded.bank_account.bank_name if t_loaded.bank_account else None
    resp.account_number_masked = t_loaded.bank_account.account_number_masked if t_loaded.bank_account else None
    resp.project_name = t_loaded.project.project_name if t_loaded.project else None
    resp.contra_account_name = t_loaded.contra_account.account_name_en if t_loaded.contra_account else None
    resp.gl_voucher_number = t_loaded.gl_voucher.voucher_number if t_loaded.gl_voucher else None
    return resp


@router.post("/bank/transfer", response_model=BankTransactionResponse)
async def transfer_between_banks(
    payload: BankTransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Inter-bank funds transfer (Contra):
    - Transfers money between two corporate bank accounts.
    - Decrements source bank, increments destination bank.
    - Posts Contra GL Voucher (CV):
      * Debit: Destination Bank Account
      * Credit: Source Bank Account
    """
    if payload.from_bank_account_id == payload.to_bank_account_id:
        raise HTTPException(status_code=400, detail="Source and destination bank accounts cannot be identical.")

    amount = Decimal(str(payload.amount))
    if amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Transfer amount must be positive.")

    from_ba = (await db.execute(select(BankAccount).where(BankAccount.id == payload.from_bank_account_id))).scalar_one_or_none()
    to_ba = (await db.execute(select(BankAccount).where(BankAccount.id == payload.to_bank_account_id))).scalar_one_or_none()

    if not from_ba or not to_ba:
        raise HTTPException(status_code=404, detail="Source or destination bank account not found.")

    from_bal = Decimal(str(from_ba.current_balance or 0.0))
    if from_bal < amount:
        raise HTTPException(
            status_code=400,
            detail=f"INSUFFICIENT BALANCE: Source bank '{from_ba.bank_name}' has ৳ {from_bal:,.2f}, cannot transfer ৳ {amount:,.2f}."
        )

    t_date = payload.transfer_date or date.today()
    org_id = await get_default_organization_id(db)

    from_acc = await get_or_create_account(
        db=db, organization_id=org_id,
        account_code="1110", account_name_en=f"{from_ba.bank_name} - {from_ba.account_number_masked}", account_type="Asset"
    )
    to_acc = await get_or_create_account(
        db=db, organization_id=org_id,
        account_code="1110", account_name_en=f"{to_ba.bank_name} - {to_ba.account_number_masked}", account_type="Asset"
    )

    lines = [
        {
            "account_code": to_acc.account_code,
            "account_name_en": to_acc.account_name_en,
            "account_type": "Asset",
            "debit": amount,
            "credit": Decimal("0.00"),
            "narration": f"Inter-bank transfer received from {from_ba.bank_name} ({from_ba.account_number_masked})"
        },
        {
            "account_code": from_acc.account_code,
            "account_name_en": from_acc.account_name_en,
            "account_type": "Asset",
            "debit": Decimal("0.00"),
            "credit": amount,
            "narration": f"Inter-bank transfer remitted to {to_ba.bank_name} ({to_ba.account_number_masked})"
        }
    ]

    gl_voucher = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=to_ba.project_id,
        voucher_type="Contra",
        narration=f"Inter-bank transfer: {from_ba.bank_name} to {to_ba.bank_name} ({payload.particulars})",
        line_entries=lines
    )

    from_ba.current_balance = from_bal - amount
    to_ba.current_balance = Decimal(str(to_ba.current_balance or 0.0)) + amount

    tx = BankTransaction(
        organization_id=org_id,
        bank_account_id=from_ba.id,
        project_id=to_ba.project_id,
        transaction_date=t_date,
        transaction_type="Transfer",
        amount=amount,
        cheque_number=payload.cheque_number,
        reference_number=payload.reference_number,
        particulars=f"Bank transfer to {to_ba.bank_name}: {payload.particulars}",
        gl_voucher_id=gl_voucher.id,
        is_reconciled=False,
        status="Cleared"
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)

    stmt = (
        select(BankTransaction)
        .options(
            selectinload(BankTransaction.bank_account),
            selectinload(BankTransaction.project),
            selectinload(BankTransaction.gl_voucher)
        )
        .where(BankTransaction.id == tx.id)
    )
    t_loaded = (await db.execute(stmt)).scalar_one()
    resp = BankTransactionResponse.model_validate(t_loaded)
    resp.bank_name = t_loaded.bank_account.bank_name if t_loaded.bank_account else None
    resp.account_number_masked = t_loaded.bank_account.account_number_masked if t_loaded.bank_account else None
    resp.gl_voucher_number = t_loaded.gl_voucher.voucher_number if t_loaded.gl_voucher else None
    return resp


@router.get("/bank/cheque-book/{account_id}", response_model=List[ChequeLeafItem])
async def get_cheque_book_register(
    account_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns full register of cheque leaves for the bank account's active cheque book range:
    - Lists each leaf (e.g. CQ-1001 to CQ-1100).
    - Status: Available, Issued, Cleared, Bounced, Void.
    - Linked transaction date, amount, and payee/particulars.
    """
    ba = (await db.execute(select(BankAccount).where(BankAccount.id == account_id))).scalar_one_or_none()
    if not ba:
        raise HTTPException(status_code=404, detail="Bank account not found.")

    if not ba.active_cheque_start or not ba.active_cheque_end:
        return []

    prefix = ba.cheque_prefix or "CQ-"
    start_no = int(ba.active_cheque_start)
    end_no = int(ba.active_cheque_end)

    # Fetch all bank transactions for this account with a cheque number
    tx_stmt = select(BankTransaction).where(
        BankTransaction.bank_account_id == account_id,
        BankTransaction.cheque_number.isnot(None)
    )
    transactions = (await db.execute(tx_stmt)).scalars().all()

    # Map transactions by cheque leaf string
    tx_map = {}
    for tx in transactions:
        tx_map[tx.cheque_number.strip().upper()] = tx

    leaves: List[ChequeLeafItem] = []
    for num in range(start_no, min(end_no + 1, start_no + 100)): # Max 100 leaves view
        leaf_code = f"{prefix}{num}"
        matched_tx = tx_map.get(leaf_code.upper())

        if matched_tx:
            leaves.append(ChequeLeafItem(
                leaf_number=leaf_code,
                status=matched_tx.cheque_status or "Issued",
                transaction_id=matched_tx.id,
                transaction_date=matched_tx.transaction_date,
                amount=float(matched_tx.amount or 0.0),
                payee_or_particulars=matched_tx.particulars
            ))
        else:
            leaves.append(ChequeLeafItem(
                leaf_number=leaf_code,
                status="Available",
                transaction_id=None,
                transaction_date=None,
                amount=None,
                payee_or_particulars=None
            ))

    return leaves


# --------------------------------------------------------------------------
# D. Mobile Financial Services (MFS: bKash, Nagad, Rocket, Upay)
# --------------------------------------------------------------------------
@router.get("/mfs/providers", response_model=List[MFSProviderResponse])
async def list_mfs_providers(
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List configured MFS payment providers (bKash, Nagad, Rocket) with gateway fee rates and transaction volumes.
    """
    stmt = (
        select(MFSProvider)
        .options(
            selectinload(MFSProvider.settlement_bank_account),
            selectinload(MFSProvider.fee_expense_account),
            selectinload(MFSProvider.wallet_gl_account),
            selectinload(MFSProvider.transactions)
        )
    )
    if is_active is not None:
        stmt = stmt.where(MFSProvider.is_active == is_active)

    providers = (await db.execute(stmt)).scalars().all()

    resp_list = []
    for p in providers:
        r = MFSProviderResponse.model_validate(p)
        r.settlement_bank_name = p.settlement_bank_account.bank_name if p.settlement_bank_account else None
        r.settlement_bank_account_masked = p.settlement_bank_account.account_number_masked if p.settlement_bank_account else None
        r.fee_expense_account_name = p.fee_expense_account.account_name_en if p.fee_expense_account else "MFS Gateway Processing Fees"
        r.wallet_gl_account_name = p.wallet_gl_account.account_name_en if p.wallet_gl_account else "Digital Payment Clearing Account"
        r.total_transactions_count = len(p.transactions)
        r.total_gross_volume = sum(float(t.gross_amount or 0.0) for t in p.transactions if t.status == "Success")
        resp_list.append(r)
    return resp_list


@router.post("/mfs/providers", response_model=MFSProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_mfs_provider(
    payload: MFSProviderCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Configure a new MFS Provider / Merchant Wallet account.
    """
    p_code = payload.provider_code.strip().upper()
    existing = (await db.execute(select(MFSProvider).where(MFSProvider.provider_code == p_code))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail=f"MFS Provider '{p_code}' already exists.")

    org_id = await get_default_organization_id(db)

    # Auto-link GL accounts if not provided
    fee_acc_id = payload.fee_expense_account_id
    if not fee_acc_id:
        f_acc = await get_or_create_account(
            db=db, organization_id=org_id,
            account_code="5320", account_name_en="MFS & Payment Gateway Processing Fees", account_type="Expense"
        )
        fee_acc_id = f_acc.id

    wallet_acc_id = payload.wallet_gl_account_id
    if not wallet_acc_id:
        w_acc = await get_or_create_account(
            db=db, organization_id=org_id,
            account_code="1125", account_name_en="Digital Wallet & MFS Clearing Fund", account_type="Asset"
        )
        wallet_acc_id = w_acc.id

    provider = MFSProvider(
        organization_id=org_id,
        provider_code=p_code,
        provider_name=payload.provider_name.strip(),
        merchant_number=payload.merchant_number.strip(),
        account_type=payload.account_type or "Merchant_Wallet",
        fee_percentage=Decimal(str(payload.fee_percentage or 1.50)),
        fee_flat_charge=Decimal(str(payload.fee_flat_charge or 0.0)),
        settlement_bank_account_id=payload.settlement_bank_account_id,
        fee_expense_account_id=fee_acc_id,
        wallet_gl_account_id=wallet_acc_id,
        daily_limit=Decimal(str(payload.daily_limit or 5000000.0)),
        is_active=True,
        notes=payload.notes
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)

    stmt = (
        select(MFSProvider)
        .options(
            selectinload(MFSProvider.settlement_bank_account),
            selectinload(MFSProvider.fee_expense_account),
            selectinload(MFSProvider.wallet_gl_account),
            selectinload(MFSProvider.transactions)
        )
        .where(MFSProvider.id == provider.id)
    )
    p_loaded = (await db.execute(stmt)).scalar_one()
    resp = MFSProviderResponse.model_validate(p_loaded)
    resp.settlement_bank_name = p_loaded.settlement_bank_account.bank_name if p_loaded.settlement_bank_account else None
    resp.settlement_bank_account_masked = p_loaded.settlement_bank_account.account_number_masked if p_loaded.settlement_bank_account else None
    resp.fee_expense_account_name = p_loaded.fee_expense_account.account_name_en if p_loaded.fee_expense_account else None
    resp.wallet_gl_account_name = p_loaded.wallet_gl_account.account_name_en if p_loaded.wallet_gl_account else None
    return resp


@router.put("/mfs/providers/{provider_id}", response_model=MFSProviderResponse)
async def update_mfs_provider(
    provider_id: int,
    payload: MFSProviderUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update MFS provider configuration (fee percentage, settlement bank, daily limit, status).
    """
    p = (await db.execute(select(MFSProvider).where(MFSProvider.id == provider_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="MFS Provider not found.")

    if payload.provider_name is not None:
        p.provider_name = payload.provider_name.strip()
    if payload.merchant_number is not None:
        p.merchant_number = payload.merchant_number.strip()
    if payload.account_type is not None:
        p.account_type = payload.account_type
    if payload.fee_percentage is not None:
        p.fee_percentage = Decimal(str(payload.fee_percentage))
    if payload.fee_flat_charge is not None:
        p.fee_flat_charge = Decimal(str(payload.fee_flat_charge))
    if payload.settlement_bank_account_id is not None:
        p.settlement_bank_account_id = payload.settlement_bank_account_id
    if payload.daily_limit is not None:
        p.daily_limit = Decimal(str(payload.daily_limit))
    if payload.is_active is not None:
        p.is_active = payload.is_active
    if payload.notes is not None:
        p.notes = payload.notes

    await db.commit()
    await db.refresh(p)

    stmt = (
        select(MFSProvider)
        .options(
            selectinload(MFSProvider.settlement_bank_account),
            selectinload(MFSProvider.fee_expense_account),
            selectinload(MFSProvider.wallet_gl_account),
            selectinload(MFSProvider.transactions)
        )
        .where(MFSProvider.id == p.id)
    )
    p_loaded = (await db.execute(stmt)).scalar_one()
    resp = MFSProviderResponse.model_validate(p_loaded)
    resp.settlement_bank_name = p_loaded.settlement_bank_account.bank_name if p_loaded.settlement_bank_account else None
    resp.settlement_bank_account_masked = p_loaded.settlement_bank_account.account_number_masked if p_loaded.settlement_bank_account else None
    resp.fee_expense_account_name = p_loaded.fee_expense_account.account_name_en if p_loaded.fee_expense_account else None
    resp.wallet_gl_account_name = p_loaded.wallet_gl_account.account_name_en if p_loaded.wallet_gl_account else None
    return resp


@router.get("/mfs/transactions", response_model=List[MFSTransactionResponse])
async def list_mfs_transactions(
    mfs_provider_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    settlement_batch_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List MFS payment transactions with gross collection, gateway fee deduction, and net settlement breakdown.
    """
    stmt = (
        select(MFSTransaction)
        .options(
            selectinload(MFSTransaction.provider),
            selectinload(MFSTransaction.project),
            selectinload(MFSTransaction.customer),
            selectinload(MFSTransaction.invoice),
            selectinload(MFSTransaction.gl_voucher)
        )
    )
    if mfs_provider_id:
        stmt = stmt.where(MFSTransaction.mfs_provider_id == mfs_provider_id)
    if project_id:
        stmt = stmt.where(MFSTransaction.project_id == project_id)
    if status_filter:
        stmt = stmt.where(MFSTransaction.status == status_filter)
    if settlement_batch_id:
        stmt = stmt.where(MFSTransaction.settlement_batch_id == settlement_batch_id)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                MFSTransaction.transaction_id.ilike(s),
                MFSTransaction.customer_phone.ilike(s),
                MFSTransaction.payment_reference.ilike(s)
            )
        )

    stmt = stmt.order_by(MFSTransaction.id.desc()).offset(offset).limit(limit)
    records = (await db.execute(stmt)).scalars().all()

    resp_list = []
    for tx in records:
        r = MFSTransactionResponse.model_validate(tx)
        r.provider_code = tx.provider.provider_code if tx.provider else None
        r.provider_name = tx.provider.provider_name if tx.provider else None
        r.project_name = tx.project.project_name if tx.project else None
        r.customer_name = tx.customer.full_name_en if tx.customer else None
        r.invoice_number = tx.invoice.invoice_number if tx.invoice else None
        r.gl_voucher_number = tx.gl_voucher.voucher_number if tx.gl_voucher else None
        resp_list.append(r)
    return resp_list


@router.post("/mfs/transactions", response_model=MFSTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_mfs_transaction(
    payload: MFSTransactionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Process an MFS transaction with automated fee calculation and double-entry accounting:
    
    EXACT USER ACCOUNTING FORMULA:
    If customer pays ৳100,000 via MFS provider (e.g. bKash) and provider deducts ৳1,500 fee:
      * Credit: Customer Receivables / AR (1130) = ৳100,000
      * Debit:  MFS Gateway Processing Fee Expense (5320) = ৳1,500
      * Debit:  Net Bank/Wallet Settlement = ৳98,500
      * Total Debits = ৳100,000 | Total Credits = ৳100,000 (Exact Balanced Double-Entry)
      
    ENFORCES:
    - Duplicate Callback Prevention: Rejects any transaction if (mfs_provider_id, transaction_id) already exists.
    """
    provider = (await db.execute(select(MFSProvider).where(MFSProvider.id == payload.mfs_provider_id))).scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="MFS Provider not found.")

    trx_id_clean = payload.transaction_id.strip()

    # 1. Duplicate Callback Prevention
    dup_stmt = select(MFSTransaction).where(
        MFSTransaction.mfs_provider_id == provider.id,
        MFSTransaction.transaction_id.ilike(trx_id_clean)
    )
    existing = (await db.execute(dup_stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"DUPLICATE TRANSACTION REJECTED: TrxID '{trx_id_clean}' has already been processed on {existing.created_at} (Internal ID #{existing.id})."
        )

    # 2. Calculation of Gross, Fee & Net Settlement
    gross = Decimal(str(payload.gross_amount))
    if gross <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Transaction gross amount must be positive.")

    if payload.fee_deducted is not None:
        fee = Decimal(str(payload.fee_deducted))
    else:
        fee_pct = Decimal(str(provider.fee_percentage or 1.50))
        flat_fee = Decimal(str(provider.fee_flat_charge or 0.0))
        fee = ((gross * fee_pct / Decimal("100.0")) + flat_fee).quantize(Decimal("0.01"))

    net_settlement = gross - fee
    if net_settlement < Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Gateway fee cannot exceed transaction gross amount.")

    org_id = await get_default_organization_id(db)

    # 3. Post Double-Entry GL Voucher
    settlement_acc_code = "1110"
    settlement_acc_name = "Corporate Bank Account"
    if provider.settlement_bank_account_id:
        ba_row = (await db.execute(select(BankAccount).where(BankAccount.id == provider.settlement_bank_account_id))).scalar_one_or_none()
        if ba_row:
            settlement_acc_name = f"{ba_row.bank_name} - {ba_row.account_number_masked}"
            # Increment settlement bank current balance
            ba_row.current_balance = Decimal(str(ba_row.current_balance or 0.0)) + net_settlement

    lines = [
        # Debit: Net Bank / Settlement Account (৳98,500)
        {
            "account_code": settlement_acc_code,
            "account_name_en": settlement_acc_name,
            "account_type": "Asset",
            "debit": net_settlement,
            "credit": Decimal("0.00"),
            "narration": f"Net settlement via {provider.provider_code} (TrxID: {trx_id_clean})"
        },
        # Debit: Gateway Fee Expense (৳1,500)
        {
            "account_code": "5320",
            "account_name_en": "MFS Gateway Processing Fees",
            "account_type": "Expense",
            "debit": fee,
            "credit": Decimal("0.00"),
            "narration": f"Gateway processing fee deducted by {provider.provider_name} on TrxID: {trx_id_clean}"
        },
        # Credit: Customer Accounts Receivable / Settlement (৳100,000)
        {
            "account_code": "1130",
            "account_name_en": "Customer Accounts Receivable",
            "account_type": "Asset",
            "debit": Decimal("0.00"),
            "credit": gross,
            "narration": f"Customer collection settlement via {provider.provider_code} (Phone: {payload.customer_phone})"
        }
    ]

    gl_voucher = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=payload.project_id,
        voucher_type="Bank_Receipt",
        narration=f"MFS collection TrxID {trx_id_clean} via {provider.provider_name}: Gross ৳ {gross:,.2f}, Fee ৳ {fee:,.2f}, Net ৳ {net_settlement:,.2f}",
        line_entries=lines
    )

    s_date = payload.settlement_date or date.today()
    s_batch = payload.settlement_batch_id or f"BATCH-{s_date.strftime('%Y%m%d')}-{provider.provider_code}"

    tx = MFSTransaction(
        organization_id=org_id,
        mfs_provider_id=provider.id,
        project_id=payload.project_id,
        customer_id=payload.customer_id,
        invoice_id=payload.invoice_id,
        transaction_id=trx_id_clean,
        payment_reference=payload.payment_reference,
        customer_phone=payload.customer_phone.strip(),
        gross_amount=gross,
        fee_deducted=fee,
        net_settlement_amount=net_settlement,
        settlement_batch_id=s_batch,
        settlement_date=s_date,
        status="Success",
        gl_voucher_id=gl_voucher.id
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)

    stmt = (
        select(MFSTransaction)
        .options(
            selectinload(MFSTransaction.provider),
            selectinload(MFSTransaction.project),
            selectinload(MFSTransaction.customer),
            selectinload(MFSTransaction.invoice),
            selectinload(MFSTransaction.gl_voucher)
        )
        .where(MFSTransaction.id == tx.id)
    )
    tx_loaded = (await db.execute(stmt)).scalar_one()
    resp = MFSTransactionResponse.model_validate(tx_loaded)
    resp.provider_code = tx_loaded.provider.provider_code if tx_loaded.provider else None
    resp.provider_name = tx_loaded.provider.provider_name if tx_loaded.provider else None
    resp.project_name = tx_loaded.project.project_name if tx_loaded.project else None
    resp.customer_name = tx_loaded.customer.full_name_en if tx_loaded.customer else None
    resp.invoice_number = tx_loaded.invoice.invoice_number if tx_loaded.invoice else None
    resp.gl_voucher_number = tx_loaded.gl_voucher.voucher_number if tx_loaded.gl_voucher else None
    return resp


@router.post("/mfs/simulate-callback", response_model=MFSTransactionResponse)
async def simulate_mfs_payment_callback(
    payload: MFSCallbackSimulationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook simulation for bKash, Nagad, or Rocket gateway payment callbacks:
    - Finds provider by provider_code.
    - Executes full transaction pipeline with duplicate verification and double-entry voucher generation.
    """
    p_code = payload.provider_code.strip().upper()
    provider = (await db.execute(select(MFSProvider).where(MFSProvider.provider_code == p_code))).scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail=f"MFS Provider '{p_code}' not found.")

    tx_req = MFSTransactionCreate(
        mfs_provider_id=provider.id,
        project_id=payload.project_id,
        customer_id=payload.customer_id,
        invoice_id=payload.invoice_id,
        transaction_id=payload.transaction_id,
        payment_reference=payload.payment_reference,
        customer_phone=payload.customer_phone,
        gross_amount=payload.gross_amount
    )
    return await create_mfs_transaction(payload=tx_req, db=db)


# --------------------------------------------------------------------------
# 9. Payment Vouchers (Approved Cash, Bank, MFS & Multi-Method Outgoing Payments)
# --------------------------------------------------------------------------

def _format_payment_voucher_response(pv: PaymentVoucher) -> PaymentVoucherResponse:
    vendor_name = pv.vendor.vendor_name if pv.vendor else None
    cashbox = pv.cash_box
    bank = pv.bank_account
    mfs = pv.mfs_provider
    is_cheque = (pv.payment_method or "").lower() in ("cheque", "bank_cheque")
    cheque_clearing = pv.settlement_date if (is_cheque and pv.cheque_status == "Cleared" and pv.settlement_date) else None
    bank_settle = pv.settlement_date if (not is_cheque and pv.settlement_date) else None
    return PaymentVoucherResponse(
        id=pv.id,
        organization_id=pv.organization_id,
        branch_name=pv.branch_name,
        voucher_number=pv.voucher_number,
        voucher_date=pv.voucher_date,
        project_id=pv.project_id,
        project_name=pv.project.project_name if pv.project else None,
        payee_type=pv.payee_type,
        payee_vendor_id=pv.vendor_id,
        payee_vendor_name=vendor_name,
        payee_name_direct=pv.payee_name,
        effective_payee_name=pv.payee_name or vendor_name,
        payment_method=pv.payment_method,
        source_cashbox_id=pv.cash_box_id,
        source_cashbox_name=cashbox.box_name if cashbox else None,
        source_bank_account_id=pv.bank_account_id,
        source_bank_account_name=bank.bank_name if bank else None,
        source_mfs_provider_id=pv.mfs_provider_id,
        source_mfs_provider_name=mfs.provider_name if mfs else None,
        cheque_number=pv.cheque_number,
        cheque_date=pv.cheque_date,
        cheque_clearing_date=cheque_clearing,
        cheque_status=pv.cheque_status,
        settlement_reference=pv.settlement_reference,
        bank_settlement_date=bank_settle,
        settlement_status=pv.settlement_status,
        settlement_date=pv.settlement_date,
        amount=Decimal(str(pv.amount)),
        currency=pv.currency or "BDT",
        debit_category=pv.debit_category,
        debit_account_id=pv.debit_account_id,
        debit_account_code=pv.debit_account.account_code if pv.debit_account else None,
        debit_account_name=pv.debit_account.account_name_en if pv.debit_account else None,
        credit_account_id=pv.credit_account_id,
        credit_account_code=pv.credit_account.account_code if pv.credit_account else None,
        credit_account_name=pv.credit_account.account_name_en if pv.credit_account else None,
        cost_center_id=pv.cost_center_id,
        cost_center_name=pv.cost_center.name if pv.cost_center else None,
        ap_invoice_id=pv.ap_invoice_id,
        ap_invoice_number=pv.ap_invoice.invoice_number if pv.ap_invoice else None,
        supporting_invoice_ref=pv.supporting_invoice_ref,
        purpose=pv.purpose,
        narration=pv.narration,
        attachment_url=pv.attachments_url,
        prepared_by_id=pv.prepared_by_user_id,
        prepared_by_name=pv.prepared_by.full_name_en if pv.prepared_by else None,
        prepared_at=pv.prepared_at,
        checked_by_id=pv.checked_by_user_id,
        checked_by_name=pv.checked_by.full_name_en if pv.checked_by else None,
        checked_at=pv.checked_at,
        checked_remarks=pv.checked_remarks,
        approved_by_id=pv.approved_by_user_id,
        approved_by_name=pv.approved_by.full_name_en if pv.approved_by else None,
        approved_at=pv.approved_at,
        approved_remarks=pv.approved_remarks,
        disbursed_by_id=pv.disbursed_by_user_id,
        disbursed_by_name=pv.disbursed_by.full_name_en if pv.disbursed_by else None,
        disbursed_at=pv.disbursed_at,
        status=pv.status,
        gl_voucher_id=pv.gl_voucher_id,
        gl_voucher_number=pv.gl_voucher.voucher_number if pv.gl_voucher else None,
        is_reconciled=bool(pv.is_reconciled),
        reconciled_at=pv.reconciled_at,
        created_at=pv.created_at,
        updated_at=pv.updated_at
    )


def _pv_eager_query():
    return (
        select(PaymentVoucher)
        .options(
            selectinload(PaymentVoucher.project),
            selectinload(PaymentVoucher.vendor),
            selectinload(PaymentVoucher.cash_box),
            selectinload(PaymentVoucher.bank_account),
            selectinload(PaymentVoucher.mfs_provider),
            selectinload(PaymentVoucher.debit_account),
            selectinload(PaymentVoucher.credit_account),
            selectinload(PaymentVoucher.cost_center),
            selectinload(PaymentVoucher.ap_invoice),
            selectinload(PaymentVoucher.gl_voucher),
            selectinload(PaymentVoucher.prepared_by),
            selectinload(PaymentVoucher.checked_by),
            selectinload(PaymentVoucher.approved_by),
            selectinload(PaymentVoucher.disbursed_by)
        )
    )


@router.get("/payment-vouchers/kpis", response_model=PaymentVoucherKPIsResponse)
async def get_payment_voucher_kpis(
    project_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns executive KPIs for Payment Vouchers:
    - Status counts: draft, pending approval, approved, disbursed, reconciled
    - Disbursed vs Pending amounts (BDT)
    - Cheques currently in clearing
    """
    base_query = select(PaymentVoucher)
    if project_id:
        base_query = base_query.where(PaymentVoucher.project_id == project_id)

    res = await db.execute(base_query)
    all_vouchers = res.scalars().all()

    total_cnt = len(all_vouchers)
    draft_cnt = sum(1 for v in all_vouchers if v.status == 'Draft')
    pending_appr_cnt = sum(1 for v in all_vouchers if v.status in ('Submitted', 'Checked'))
    approved_cnt = sum(1 for v in all_vouchers if v.status == 'Approved')
    disbursed_cnt = sum(1 for v in all_vouchers if v.status == 'Disbursed')
    reconciled_cnt = sum(1 for v in all_vouchers if v.status == 'Reconciled')

    amt_disbursed = sum(
        (Decimal(str(v.amount)) for v in all_vouchers
         if v.status in ('Disbursed', 'Reconciled')),
        Decimal("0")
    )
    amt_pending = sum(
        (Decimal(str(v.amount)) for v in all_vouchers
         if v.status in ('Draft', 'Submitted', 'Checked', 'Approved')),
        Decimal("0")
    )
    cheques_clearing = sum(
        1 for v in all_vouchers
        if v.payment_method == 'Cheque' and v.cheque_status in ('Issued', 'Presented', 'Pending')
    )

    return PaymentVoucherKPIsResponse(
        total_vouchers=total_cnt,
        draft_vouchers=draft_cnt,
        pending_approval_vouchers=pending_appr_cnt,
        approved_vouchers=approved_cnt,
        disbursed_vouchers=disbursed_cnt,
        reconciled_vouchers=reconciled_cnt,
        total_amount_disbursed=float(amt_disbursed.quantize(Decimal("0.01"))),
        total_amount_pending=float(amt_pending.quantize(Decimal("0.01"))),
        cheques_in_clearing=cheques_clearing
    )


@router.get("/payment-vouchers")
async def list_payment_vouchers(
    project_id: Optional[int] = None,
    payment_method: Optional[str] = None,
    debit_category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Paginated Payment Voucher register with search, project, method, category and status filtering.
    """
    stmt = _pv_eager_query()

    if project_id:
        stmt = stmt.where(PaymentVoucher.project_id == project_id)
    if payment_method:
        stmt = stmt.where(PaymentVoucher.payment_method == payment_method)
    if debit_category:
        stmt = stmt.where(PaymentVoucher.debit_category == debit_category)
    if status:
        stmt = stmt.where(PaymentVoucher.status == status)
    if search:
        search_filter = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                PaymentVoucher.voucher_number.ilike(search_filter),
                PaymentVoucher.payee_name.ilike(search_filter),
                PaymentVoucher.purpose.ilike(search_filter),
                PaymentVoucher.cheque_number.ilike(search_filter),
                PaymentVoucher.settlement_reference.ilike(search_filter),
                PaymentVoucher.supporting_invoice_ref.ilike(search_filter)
            )
        )

    # Get total count
    count_stmt = select(func.count(PaymentVoucher.id))
    if project_id:
        count_stmt = count_stmt.where(PaymentVoucher.project_id == project_id)
    if payment_method:
        count_stmt = count_stmt.where(PaymentVoucher.payment_method == payment_method)
    if debit_category:
        count_stmt = count_stmt.where(PaymentVoucher.debit_category == debit_category)
    if status:
        count_stmt = count_stmt.where(PaymentVoucher.status == status)
    if search:
        search_filter = f"%{search.strip()}%"
        count_stmt = count_stmt.where(
            or_(
                PaymentVoucher.voucher_number.ilike(search_filter),
                PaymentVoucher.payee_name.ilike(search_filter),
                PaymentVoucher.purpose.ilike(search_filter),
                PaymentVoucher.cheque_number.ilike(search_filter),
                PaymentVoucher.settlement_reference.ilike(search_filter),
                PaymentVoucher.supporting_invoice_ref.ilike(search_filter)
            )
        )

    total_records = (await db.execute(count_stmt)).scalar() or 0

    # Execute paginated query
    stmt = stmt.order_by(PaymentVoucher.id.desc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()

    return {
        "total": total_records,
        "items": [_format_payment_voucher_response(pv) for pv in records]
    }


@router.get("/payment-vouchers/{voucher_id}", response_model=PaymentVoucherResponse)
async def get_payment_voucher(
    voucher_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Returns single Payment Voucher with full relations and workflow history."""
    stmt = _pv_eager_query().where(PaymentVoucher.id == voucher_id)
    pv = (await db.execute(stmt)).scalar_one_or_none()
    if not pv:
        raise HTTPException(status_code=404, detail="Payment Voucher not found.")
    return _format_payment_voucher_response(pv)


@router.post("/payment-vouchers", response_model=PaymentVoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_voucher(
    payload: PaymentVoucherCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new Payment Voucher in Draft or Submitted state.
    Strict Financial Safeguards:
    - Auto-generates sequential voucher number PV-YYYY-XXXX.
    - Validates source fund existence (Cashbox, Bank Account, MFS).
    - If Payable settlement: links to AP Invoice and sets debit account to 2100 (Supplier Payables)
      to prevent duplicate expense recognition.
    - Verifies debit & credit accounts exist in COA.
    """
    org_id = await get_default_organization_id(db)

    # 1. Resolve Credit Account (Source Account)
    credit_account_id = payload.credit_account_id
    if not credit_account_id:
        if payload.payment_method == "Cash":
            if not payload.source_cashbox_id:
                raise HTTPException(status_code=400, detail="source_cashbox_id required for Cash payments.")
            cbox = (await db.execute(select(CashBox).where(CashBox.id == payload.source_cashbox_id))).scalar_one_or_none()
            if not cbox:
                raise HTTPException(status_code=404, detail="Selected cashbox not found.")
            if cbox.account_id:
                credit_account_id = cbox.account_id
            else:
                c_acc = await get_or_create_account(db, org_id, "1100", "Cash in Hand", "Asset")
                credit_account_id = c_acc.id

        elif payload.payment_method in ("Bank_Transfer", "Cheque", "Bank_Cheque", "Card", "Pay_Order"):
            if not payload.source_bank_account_id:
                raise HTTPException(status_code=400, detail="source_bank_account_id required for Bank/Cheque payments.")
            bank = (await db.execute(select(BankAccount).where(BankAccount.id == payload.source_bank_account_id))).scalar_one_or_none()
            if not bank:
                raise HTTPException(status_code=404, detail="Selected bank account not found.")
            if bank.account_id:
                credit_account_id = bank.account_id
            else:
                b_acc = await get_or_create_account(db, org_id, "1110", "Bank Accounts", "Asset")
                credit_account_id = b_acc.id

        elif payload.payment_method == "MFS":
            if not payload.source_mfs_provider_id:
                raise HTTPException(status_code=400, detail="source_mfs_provider_id required for MFS payments.")
            mfs = (await db.execute(select(MFSProvider).where(MFSProvider.id == payload.source_mfs_provider_id))).scalar_one_or_none()
            if not mfs:
                raise HTTPException(status_code=404, detail="Selected MFS provider not found.")
            if mfs.wallet_gl_account_id:
                credit_account_id = mfs.wallet_gl_account_id
            else:
                m_acc = await get_or_create_account(db, org_id, "1120", "MFS Wallets", "Asset")
                credit_account_id = m_acc.id
        else:
            def_acc = await get_or_create_account(db, org_id, "1110", "Bank Accounts", "Asset")
            credit_account_id = def_acc.id

    # 2. Resolve Debit Account
    debit_account_id = payload.debit_account_id
    if payload.debit_category == "Payable":
        # Liquidate payable (prevent duplicate expense)
        if payload.ap_invoice_id:
            ap_inv = (await db.execute(select(APInvoice).where(APInvoice.id == payload.ap_invoice_id))).scalar_one_or_none()
            if not ap_inv:
                raise HTTPException(status_code=404, detail="Referenced AP Invoice not found.")
            if not debit_account_id:
                debit_acc = await get_or_create_account(db, org_id, "2100", "Accounts Payable (Vendors)", "Liability")
                debit_account_id = debit_acc.id
        else:
            if not debit_account_id:
                debit_acc = await get_or_create_account(db, org_id, "2100", "Accounts Payable (Vendors)", "Liability")
                debit_account_id = debit_acc.id
    elif not debit_account_id:
        if payload.debit_category == "Expense":
            exp_acc = await get_or_create_account(db, org_id, "5200", "Administrative & Office Expenses", "Expense")
            debit_account_id = exp_acc.id
        elif payload.debit_category == "Asset_CWIP":
            cwip_acc = await get_or_create_account(db, org_id, "1500", "Construction Work-in-Progress (CWIP)", "Asset")
            debit_account_id = cwip_acc.id
        else:
            adv_acc = await get_or_create_account(db, org_id, "1300", "Advances & Prepayments", "Asset")
            debit_account_id = adv_acc.id

    # 3. Generate Sequential Voucher Number
    year = date.today().year
    count_res = await db.execute(select(func.count(PaymentVoucher.id)))
    next_num = (count_res.scalar() or 0) + 1
    voucher_number = f"PV-{year}-{next_num:04d}"

    payee_name = (payload.payee_name_direct or "").strip()
    if not payee_name and payload.payee_vendor_id:
        vend = (await db.execute(select(Vendor).where(Vendor.id == payload.payee_vendor_id))).scalar_one_or_none()
        payee_name = vend.vendor_name if vend else ""
    if not payee_name:
        payee_name = "Payee"

    if payload.payment_method == "Cash":
        source_type = "Cash_Box"
    elif payload.payment_method == "MFS":
        source_type = "MFS_Wallet"
    else:
        source_type = "Bank_Account"

    pv = PaymentVoucher(
        organization_id=org_id,
        branch_name=payload.branch_name or "Head Office Branch",
        voucher_number=voucher_number,
        voucher_date=payload.voucher_date or date.today(),
        project_id=payload.project_id,
        payee_type=payload.payee_type,
        vendor_id=payload.payee_vendor_id,
        payee_name=payee_name,
        payment_method=payload.payment_method,
        source_type=source_type,
        cash_box_id=payload.source_cashbox_id,
        bank_account_id=payload.source_bank_account_id,
        mfs_provider_id=payload.source_mfs_provider_id,
        cheque_number=payload.cheque_number,
        cheque_date=payload.cheque_date,
        cheque_status="Prepared" if payload.payment_method == "Cheque" else None,
        settlement_reference=payload.settlement_reference,
        amount=payload.amount,
        currency=payload.currency or "BDT",
        debit_category=payload.debit_category,
        debit_account_id=debit_account_id,
        credit_account_id=credit_account_id,
        cost_center_id=payload.cost_center_id,
        ap_invoice_id=payload.ap_invoice_id,
        supporting_invoice_ref=payload.supporting_invoice_ref,
        purpose=payload.purpose or "Payment Voucher",
        narration=payload.narration,
        attachments_url=payload.attachment_url,
        prepared_by_user_id=1,  # Default system/admin user
        prepared_at=datetime.utcnow(),
        status="Submitted" if payload.auto_submit else "Draft"
    )
    db.add(pv)
    await db.commit()
    await db.refresh(pv)

    # Re-query with eager relationships
    stmt = _pv_eager_query().where(PaymentVoucher.id == pv.id)
    pv_loaded = (await db.execute(stmt)).scalar_one()
    return _format_payment_voucher_response(pv_loaded)


@router.put("/payment-vouchers/{voucher_id}", response_model=PaymentVoucherResponse)
async def update_payment_voucher(
    voucher_id: int,
    payload: PaymentVoucherUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Updates an unapproved Payment Voucher in Draft or Submitted status."""
    stmt = _pv_eager_query().where(PaymentVoucher.id == voucher_id)
    pv = (await db.execute(stmt)).scalar_one_or_none()
    if not pv:
        raise HTTPException(status_code=404, detail="Payment Voucher not found.")

    if pv.status not in ("Draft", "Submitted"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit voucher in '{pv.status}' status. Only Draft or Submitted vouchers can be edited."
        )

    _pv_field_map = {
        "payee_vendor_id": "vendor_id",
        "payee_name_direct": "payee_name",
        "source_cashbox_id": "cash_box_id",
        "source_bank_account_id": "bank_account_id",
        "source_mfs_provider_id": "mfs_provider_id",
        "attachment_url": "attachments_url",
    }
    update_data = payload.model_dump(exclude_unset=True)
    if "payee_name_direct" in update_data and not (update_data["payee_name_direct"] or "").strip():
        vid = update_data.get("payee_vendor_id", pv.vendor_id)
        vend = None
        if vid:
            vend = (await db.execute(select(Vendor).where(Vendor.id == vid))).scalar_one_or_none()
        if vend:
            update_data["payee_name_direct"] = vend.vendor_name
        else:
            update_data.pop("payee_name_direct")
    for field, val in update_data.items():
        setattr(pv, _pv_field_map.get(field, field), val)

    pv.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(pv)

    stmt_re = _pv_eager_query().where(PaymentVoucher.id == pv.id)
    pv_loaded = (await db.execute(stmt_re)).scalar_one()
    return _format_payment_voucher_response(pv_loaded)


@router.post("/payment-vouchers/{voucher_id}/workflow", response_model=PaymentVoucherResponse)
async def execute_payment_voucher_workflow(
    voucher_id: int,
    payload: PaymentVoucherWorkflowAction,
    db: AsyncSession = Depends(get_db)
):
    """
    Executes a multi-tier Payment Voucher workflow state transition:
    Draft -> Submitted -> Checked -> Approved -> Posted/Disbursed -> Reconciled

    When action == 'disburse' (or 'post'):
    - Verifies voucher was previously Approved.
    - Generates balanced Double-Entry GL Voucher (BP/CP/MP).
    - Debits Expense/CWIP or Payables; Credits Cashbox or Bank account.
    - If Payable settlement: updates AP Invoice paid_amount to prevent duplicate expense.
    - Sets status to 'Disbursed' and records timestamp.
    """
    stmt = _pv_eager_query().where(PaymentVoucher.id == voucher_id)
    pv = (await db.execute(stmt)).scalar_one_or_none()
    if not pv:
        raise HTTPException(status_code=404, detail="Payment Voucher not found.")

    act = payload.action.strip().lower()
    now = datetime.utcnow()
    remarks = payload.remarks or payload.notes

    if act == "submit":
        if pv.status != "Draft":
            raise HTTPException(status_code=400, detail="Only Draft vouchers can be submitted.")
        pv.status = "Submitted"

    elif act == "check":
        if pv.status != "Submitted":
            raise HTTPException(status_code=400, detail="Only Submitted vouchers can be verified/checked.")
        pv.status = "Checked"
        pv.checked_by_user_id = 1
        pv.checked_at = now
        if remarks:
            pv.checked_remarks = remarks

    elif act == "approve":
        if pv.status not in ("Submitted", "Checked"):
            raise HTTPException(status_code=400, detail="Only Submitted or Checked vouchers can be Approved.")
        pv.status = "Approved"
        pv.approved_by_user_id = 1
        pv.approved_at = now
        if remarks:
            pv.approved_remarks = remarks

    elif act in ("disburse", "post"):
        if pv.status not in ("Approved", "Checked", "Submitted"):
            raise HTTPException(status_code=400, detail=f"Cannot disburse voucher in status '{pv.status}'.")

        # Create balanced Double-Entry Voucher in GL
        v_type = "Cash_Payment" if pv.payment_method == "Cash" else "Bank_Payment"
        payee_label = pv.payee_name or (pv.vendor.vendor_name if pv.vendor else "Payee")
        narration_text = (
            pv.narration or
            f"Payment to {payee_label} for {pv.purpose or pv.debit_category} [Voucher: {pv.voucher_number}]"
        )

        debit_acc = pv.debit_account
        credit_acc = pv.credit_account
        if not debit_acc or not credit_acc:
            raise HTTPException(status_code=400, detail="Debit/Credit accounts are not configured on this voucher.")

        line_entries = [
            {
                "account_code": debit_acc.account_code,
                "account_name_en": debit_acc.account_name_en,
                "account_type": debit_acc.account_type,
                "debit": pv.amount,
                "credit": Decimal("0.00")
            },
            {
                "account_code": credit_acc.account_code,
                "account_name_en": credit_acc.account_name_en,
                "account_type": credit_acc.account_type,
                "debit": Decimal("0.00"),
                "credit": pv.amount
            }
        ]

        gl_voucher = await post_double_entry_voucher(
            db=db,
            organization_id=pv.organization_id,
            project_id=pv.project_id,
            voucher_type=v_type,
            narration=narration_text,
            line_entries=line_entries,
            user_id=1
        )

        pv.gl_voucher_id = gl_voucher.id
        pv.status = "Disbursed"
        pv.disbursed_by_user_id = 1
        pv.disbursed_at = now

        if payload.settlement_reference:
            pv.settlement_reference = payload.settlement_reference
            if (pv.payment_method or "").lower() not in ("cheque", "bank_cheque"):
                pv.settlement_date = payload.settlement_date or date.today()
                pv.settlement_status = "Settled"

        if pv.payment_method == "Cheque":
            pv.cheque_status = payload.cheque_status or "Issued"

        # Update AP Invoice if liquidating an Accounts Payable
        if pv.debit_category == "Payable" and pv.ap_invoice_id:
            ap_inv = (await db.execute(select(APInvoice).where(APInvoice.id == pv.ap_invoice_id))).scalar_one_or_none()
            if ap_inv:
                current_paid = Decimal(str(ap_inv.paid_amount or "0.00"))
                new_paid = current_paid + Decimal(str(pv.amount))
                ap_inv.paid_amount = new_paid
                total_due = Decimal(str(ap_inv.net_payable_amount or "0.00"))
                if new_paid >= total_due:
                    ap_inv.status = "Paid"
                else:
                    ap_inv.status = "Partially_Paid"

    elif act == "reconcile":
        if pv.status not in ("Disbursed", "Approved"):
            raise HTTPException(status_code=400, detail="Only Disbursed vouchers can be reconciled.")
        pv.status = "Reconciled"
        pv.is_reconciled = True
        pv.reconciled_at = now
        pv.settlement_date = payload.settlement_date or date.today()
        pv.settlement_status = "Settled"
        if pv.payment_method == "Cheque":
            pv.cheque_status = "Cleared"
        if payload.settlement_reference:
            pv.settlement_reference = payload.settlement_reference

    elif act == "cancel":
        if pv.status in ("Disbursed", "Reconciled"):
            raise HTTPException(status_code=400, detail="Cannot cancel an already disbursed/reconciled payment voucher.")
        pv.status = "Cancelled"

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported workflow action: '{payload.action}'.")

    pv.updated_at = now
    await db.commit()
    await db.refresh(pv)

    stmt_re = _pv_eager_query().where(PaymentVoucher.id == pv.id)
    pv_loaded = (await db.execute(stmt_re)).scalar_one()
    return _format_payment_voucher_response(pv_loaded)


# Mount Section 11: Project-wise Income & Expenditure Router
from app.modules.accounts.project_income_expenditure_router import router as project_income_expenditure_router
router.include_router(project_income_expenditure_router)

# Mount Section 13: Customer Advance & Installment Accounting Router
from app.modules.accounts.customer_advance_accounting_router import router as customer_advance_accounting_router
router.include_router(customer_advance_accounting_router)

# Mount Section 14: Loans, Interest & Financing Router
from app.modules.accounts.loans_financing_router import router as loans_financing_router
router.include_router(loans_financing_router)

# Mount Section 12: Construction Cost Allocation & Work in Progress (CWIP) Router
from app.modules.accounts.construction_cwip_router import router as construction_cwip_router
router.include_router(construction_cwip_router)

# Mount Section 15: Bank Reconciliation & MFS Settlement Router
from app.modules.accounts.bank_reconciliation_router import router as bank_reconciliation_router
router.include_router(bank_reconciliation_router)

# Mount Financial & Operational Reports Suite Router (15 Reports)
from app.modules.accounts.financial_reports_router import router as financial_reports_router
router.include_router(financial_reports_router)

# Mount Executive Financial Dashboard across 20+ Projects
from app.modules.accounts.financial_dashboard_router import router as financial_dashboard_router
router.include_router(financial_dashboard_router)

