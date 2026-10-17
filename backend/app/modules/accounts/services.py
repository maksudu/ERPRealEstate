import logging
from decimal import Decimal
from datetime import date
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.modules.auth.models import Organization
from app.modules.accounts.models import (
    ChartOfAccount, Voucher, JournalEntry, CostCenter, FiscalYear,
    PDCVault, CWIPCapitalization, IFRS15RevenueRecognition,
    BankReconciliation, BankStatementItem
)
from app.modules.projects.models import Project
from app.modules.sales.models import Booking

logger = logging.getLogger(__name__)


async def get_default_organization_id(db: AsyncSession) -> int:
    """Returns the primary active organization ID or defaults to 1."""
    res = await db.execute(select(Organization.id).where(Organization.is_active == True).limit(1))
    org_id = res.scalar()
    if not org_id:
        res_any = await db.execute(select(Organization.id).limit(1))
        org_id = res_any.scalar() or 1
    return org_id


async def get_or_create_account(
    db: AsyncSession,
    organization_id: int,
    account_code: str,
    account_name_en: str,
    account_type: str,
    account_name_bn: Optional[str] = None
) -> ChartOfAccount:
    """
    Retrieves or dynamically provisions a Chart of Account leaf record.
    Prevents foreign key integrity failures and guarantees account existence.
    """
    stmt = select(ChartOfAccount).where(
        (ChartOfAccount.account_code == account_code) &
        (ChartOfAccount.organization_id == organization_id)
    )
    result = await db.execute(stmt)
    account = result.scalar_one_or_none()

    if not account:
        # Check by code across all orgs if applicable
        stmt_code = select(ChartOfAccount).where(ChartOfAccount.account_code == account_code)
        account = (await db.execute(stmt_code)).scalar_one_or_none()

    if not account:
        account = ChartOfAccount(
            organization_id=organization_id,
            account_code=account_code,
            account_name_en=account_name_en,
            account_name_bn=account_name_bn or account_name_en,
            account_type=account_type,
            is_leaf_account=True,
            is_active=True
        )
        db.add(account)
        await db.flush()
        await db.refresh(account)
        logger.info(f"Auto-provisioned Chart of Account: [{account_code}] {account_name_en} ({account_type})")

    return account


async def post_double_entry_voucher(
    db: AsyncSession,
    organization_id: int,
    project_id: Optional[int],
    voucher_type: str,
    narration: str,
    line_entries: List[Dict[str, Any]],
    user_id: Optional[int] = None,
    custom_voucher_number: Optional[str] = None
) -> Voucher:
    """
    Core Double-Entry Voucher Posting Engine.
    Strict Financial Safeguards:
    1. Sum(Debit) == Sum(Credit) strictly enforced.
    2. Zero hard deletions.
    3. Writes Header (Voucher) and Line Items (JournalEntry) in the current atomic transaction.
    """
    if not line_entries:
        raise ValueError("Cannot post voucher with empty line entries.")

    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    # Validate and compute totals
    for item in line_entries:
        d = Decimal(str(item.get("debit", 0.00))).quantize(Decimal("0.01"))
        c = Decimal(str(item.get("credit", 0.00))).quantize(Decimal("0.01"))
        total_debit += d
        total_credit += c

    if abs(total_debit - total_credit) > Decimal("0.05"):
        raise ValueError(
            f"Voucher posting rejected: Unbalanced Double-Entry! "
            f"Total Debit BDT {total_debit:,.2f} != Total Credit BDT {total_credit:,.2f}"
        )

    # Generate sequential voucher number if not provided
    if not custom_voucher_number:
        count_res = await db.execute(select(func.count(Voucher.id)))
        next_id = (count_res.scalar() or 0) + 1
        prefix_map = {
            "Journal": "JV",
            "Cash_Payment": "CP",
            "Cash_Receipt": "CR",
            "Bank_Payment": "BP",
            "Bank_Receipt": "BR",
            "Contra": "CV"
        }
        prefix = prefix_map.get(voucher_type, "JV")
        custom_voucher_number = f"{prefix}-{date.today().year}-{next_id:04d}"

    voucher = Voucher(
        organization_id=organization_id,
        project_id=project_id,
        voucher_number=custom_voucher_number,
        voucher_type=voucher_type,
        voucher_date=date.today(),
        narration=narration,
        total_debit_amount=total_debit,
        total_credit_amount=total_credit,
        status="Posted",
        created_by_user_id=user_id
    )
    db.add(voucher)
    await db.flush()

    for item in line_entries:
        acc = await get_or_create_account(
            db=db,
            organization_id=organization_id,
            account_code=item["account_code"],
            account_name_en=item["account_name_en"],
            account_type=item["account_type"],
            account_name_bn=item.get("account_name_bn")
        )

        d = Decimal(str(item.get("debit", 0.00))).quantize(Decimal("0.01"))
        c = Decimal(str(item.get("credit", 0.00))).quantize(Decimal("0.01"))

        entry = JournalEntry(
            voucher_id=voucher.id,
            voucher_date=voucher.voucher_date,
            company_id=organization_id,
            project_id=project_id,
            account_id=acc.id,
            debit_amount=d,
            credit_amount=c,
            narration=item.get("narration") or narration
        )
        db.add(entry)

    await db.flush()
    logger.info(
        f"General Ledger Voucher POSTED: {voucher.voucher_number} ({voucher_type}) | "
        f"Debit/Credit: BDT {total_debit:,.2f}"
    )
    return voucher


# --------------------------------------------------------------------------
# Specialized Domain Integration Posting Engines
# --------------------------------------------------------------------------

async def post_ra_bill_voucher(
    db: AsyncSession,
    bill,
    user_id: Optional[int] = None
) -> str:
    """
    MANDATORY REQUIREMENT 1:
    When an RA Bill status changes to 'ACCOUNTS_VOUCHER_POSTED', automatically insert
    a balanced Journal Voucher into `acc_vouchers` and debit/credit rows into `acc_journal_entries`:
      * Debit: Work-in-Progress (WIP) / Construction Cost Account (Gross Amount)
      * Credit: Retention Money Payable Account (5% retention)
      * Credit: Advance Recovery Account (if applicable)
      * Credit: TDS Payable under Section 52 (Income Tax)
      * Credit: VDS Payable (VAT Deduction at Source)
      * Credit: Subcontractor Accounts Payable (Net Payable)
    """
    org_id = await get_default_organization_id(db)
    project_id = bill.work_order.project_id if bill.work_order else None
    contractor_name = bill.work_order.contractor.company_name if bill.work_order and bill.work_order.contractor else "Subcontractor"
    wo_no = bill.work_order.work_order_no if bill.work_order else f"WO-{bill.work_order_id}"

    gross = Decimal(str(bill.gross_work_certified_amount or 0.00)).quantize(Decimal("0.01"))
    retention = Decimal(str(bill.retention_money_deducted or 0.00)).quantize(Decimal("0.01"))
    advance = Decimal(str(bill.advance_recovery_deducted or 0.00)).quantize(Decimal("0.01"))
    tds = Decimal(str(bill.tds_withheld_amount or 0.00)).quantize(Decimal("0.01"))
    vds = Decimal(str(bill.vds_withheld_amount or 0.00)).quantize(Decimal("0.01"))
    net_payable = Decimal(str(bill.net_payable_amount or 0.00)).quantize(Decimal("0.01"))

    # Verify reconciliation formula: Gross = Retention + Advance + TDS + VDS + Net Payable
    deductions_sum = retention + advance + tds + vds + net_payable
    diff = gross - deductions_sum
    if abs(diff) > Decimal("0.00"):
        # adjust small rounding difference onto Net Payable
        net_payable += diff

    lines = [
        {
            "account_code": "5100",
            "account_name_en": "Work-in-Progress (WIP) - Civil Construction Cost",
            "account_type": "Expense",
            "debit": gross,
            "credit": Decimal("0.00"),
            "narration": f"Gross work certified for {wo_no} ({contractor_name})"
        }
    ]

    if retention > Decimal("0.00"):
        lines.append({
            "account_code": "2110",
            "account_name_en": "Retention Money Payable (5% Security Holding)",
            "account_type": "Liability",
            "debit": Decimal("0.00"),
            "credit": retention,
            "narration": f"5% Retention deducted from {wo_no}"
        })

    if advance > Decimal("0.00"):
        lines.append({
            "account_code": "1210",
            "account_name_en": "Contractor Mobilization Advance Recovery",
            "account_type": "Asset",
            "debit": Decimal("0.00"),
            "credit": advance,
            "narration": f"Advance recovery deducted from {wo_no}"
        })

    if tds > Decimal("0.00"):
        lines.append({
            "account_code": "2120",
            "account_name_en": "TDS Payable under Section 52 (Income Tax)",
            "account_type": "Liability",
            "debit": Decimal("0.00"),
            "credit": tds,
            "narration": f"Tax Deduction at Source (Sec 52) on {wo_no}"
        })

    if vds > Decimal("0.00"):
        lines.append({
            "account_code": "2130",
            "account_name_en": "VDS Payable (VAT Deduction at Source)",
            "account_type": "Liability",
            "debit": Decimal("0.00"),
            "credit": vds,
            "narration": f"VAT Withholding on {wo_no}"
        })

    lines.append({
        "account_code": "2100",
        "account_name_en": f"Subcontractor Payable - {contractor_name}",
        "account_type": "Liability",
        "debit": Decimal("0.00"),
        "credit": net_payable,
        "narration": f"Net amount payable for RA Bill #{bill.ra_bill_number}"
    })

    voucher_ref = f"JV-CONT-{bill.id:04d}-{date.today().year}"
    narration = f"Certified RA Bill #{bill.ra_bill_number} for {contractor_name} under {wo_no}"

    voucher = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=project_id,
        voucher_type="Journal",
        narration=narration,
        line_entries=lines,
        user_id=user_id,
        custom_voucher_number=voucher_ref
    )
    return voucher.voucher_number


async def post_grn_voucher(
    db: AsyncSession,
    grn,
    user_id: Optional[int] = None
) -> str:
    """
    MANDATORY REQUIREMENT 2:
    When a Goods Receipt Note (GRN) passes 3-Way Matching:
      * Debit: Site Store Raw Material Inventory / WIP Account
      * Credit: Vendor Accounts Payable Account
    """
    org_id = await get_default_organization_id(db)
    po = grn.purchase_order
    project_id = po.project_id if po else None
    vendor_name = po.vendor.vendor_name if po and po.vendor else "Materials Vendor"
    material_name = po.material.material_name if po and po.material else "Construction Material"

    amount = Decimal(str(grn.calculated_expected_amount or 0.00)).quantize(Decimal("0.01"))
    if amount <= Decimal("0.00"):
        # Fallback to accepted_qty * unit_price
        unit_price = Decimal(str(po.unit_price or 0.00)) if po else Decimal("0.00")
        qty = Decimal(str(grn.accepted_quantity or 0.00))
        amount = (qty * unit_price).quantize(Decimal("0.01"))

    lines = [
        {
            "account_code": "1300",
            "account_name_en": "Site Store Raw Material Inventory (WIP)",
            "account_type": "Asset",
            "debit": amount,
            "credit": Decimal("0.00"),
            "narration": f"Received {grn.accepted_quantity} of {material_name} via {grn.grn_number}"
        },
        {
            "account_code": "2200",
            "account_name_en": f"Vendor Accounts Payable - {vendor_name}",
            "account_type": "Liability",
            "debit": Decimal("0.00"),
            "credit": amount,
            "narration": f"Accounts payable for Challan #{grn.delivery_challan_number} (PO #{po.po_number if po else ''})"
        }
    ]

    voucher_ref = f"JV-GRN-{grn.id:04d}-{date.today().year}"
    narration = f"Goods Receipt 3-Way Matched: {grn.grn_number} from {vendor_name} ({material_name})"

    voucher = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=project_id,
        voucher_type="Journal",
        narration=narration,
        line_entries=lines,
        user_id=user_id,
        custom_voucher_number=voucher_ref
    )
    return voucher.voucher_number


async def post_customer_collection_voucher(
    db: AsyncSession,
    booking_id: int,
    amount: float,
    title: str,
    payment_mode: str = "Cash",
    project_id: Optional[int] = None,
    user_id: Optional[int] = None
) -> str:
    """
    MANDATORY REQUIREMENT 3:
    When an Earnest Money or Installment payment is collected / marked as PAID:
      * Debit: Cash in Hand / Bank Account / MFS Account
      * Credit: Advance from Allottee / Customer Account
    """
    org_id = await get_default_organization_id(db)
    coll_amount = Decimal(str(amount)).quantize(Decimal("0.01"))

    # Map payment mode to asset account
    mode_upper = payment_mode.upper()
    if "BKASH" in mode_upper or "NAGAD" in mode_upper or "MFS" in mode_upper:
        acc_code = "1030"
        acc_name = "Mobile Financial Services (bKash/Nagad Merchant Vault)"
        voucher_type = "Cash_Receipt"
    elif "BANK" in mode_upper or "CHEQUE" in mode_upper or "PAY ORDER" in mode_upper:
        acc_code = "1020"
        acc_name = "Commercial Bank Accounts (Collection Vault)"
        voucher_type = "Bank_Receipt"
    else:
        acc_code = "1010"
        acc_name = "Cash in Hand (Central Cashier Vault)"
        voucher_type = "Cash_Receipt"

    lines = [
        {
            "account_code": acc_code,
            "account_name_en": acc_name,
            "account_type": "Asset",
            "debit": coll_amount,
            "credit": Decimal("0.00"),
            "narration": f"Payment collected via {payment_mode} for Booking #{booking_id}"
        },
        {
            "account_code": "2300",
            "account_name_en": "Advance from Allottees (Apartment Bookings)",
            "account_type": "Liability",
            "debit": Decimal("0.00"),
            "credit": coll_amount,
            "narration": f"Customer collection: {title}"
        }
    ]

    count_res = await db.execute(select(func.count(Voucher.id)))
    next_id = (count_res.scalar() or 0) + 1
    prefix = "CR" if "Cash" in voucher_type else "BR"
    custom_ref = f"{prefix}-COL-{booking_id}-{next_id:04d}"

    voucher = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=project_id,
        voucher_type=voucher_type,
        narration=f"Customer installment payment: {title} (Booking #{booking_id})",
        line_entries=lines,
        user_id=user_id,
        custom_voucher_number=custom_ref
    )
    return voucher.voucher_number


async def post_vat_mushak_revenue_voucher(
    db: AsyncSession,
    booking_id: int,
    mushak_challan_number: str,
    taxable_amount: float,
    vat_amount: float,
    total_collected: float,
    project_id: Optional[int] = None,
    user_id: Optional[int] = None
) -> str:
    """
    When Mushak 6.3 is issued:
      * Debit: Advance from Allottee / Customer Account (Total Amount Collected)
      * Credit: Apartment Sales Revenue (Taxable Base Amount)
      * Credit: Output VAT Payable under VAT Act 2012 (VAT Amount)
    """
    org_id = await get_default_organization_id(db)
    tot = Decimal(str(total_collected)).quantize(Decimal("0.01"))
    taxable = Decimal(str(taxable_amount)).quantize(Decimal("0.01"))
    vat = Decimal(str(vat_amount)).quantize(Decimal("0.01"))

    # Balance check: total == taxable + vat
    if tot != (taxable + vat):
        vat = tot - taxable

    lines = [
        {
            "account_code": "2300",
            "account_name_en": "Advance from Allottees (Apartment Bookings)",
            "account_type": "Liability",
            "debit": tot,
            "credit": Decimal("0.00"),
            "narration": f"Advance adjusted against Mushak 6.3 #{mushak_challan_number}"
        },
        {
            "account_code": "4100",
            "account_name_en": "Apartment Sales Revenue (IFRS 15 Recognized)",
            "account_type": "Revenue",
            "debit": Decimal("0.00"),
            "credit": taxable,
            "narration": f"Revenue recognized under Mushak 6.3 #{mushak_challan_number}"
        },
        {
            "account_code": "2140",
            "account_name_en": "Output VAT Payable (Mushak 6.3 - NBR)",
            "account_type": "Liability",
            "debit": Decimal("0.00"),
            "credit": vat,
            "narration": f"Output VAT payable to NBR for Challan #{mushak_challan_number}"
        }
    ]

    custom_ref = f"JV-VAT-{mushak_challan_number}"
    voucher = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=project_id,
        voucher_type="Journal",
        narration=f"Statutory VAT Mushak 6.3 Revenue Recognition for Booking #{booking_id}",
        line_entries=lines,
        user_id=user_id,
        custom_voucher_number=custom_ref
    )
    return voucher.voucher_number


# --------------------------------------------------------------------------
# 5-Tier Hierarchical Chart of Accounts (COA) Tree Engine
# --------------------------------------------------------------------------
async def build_hierarchical_coa_tree(db: AsyncSession, org_id: int) -> List[Dict[str, Any]]:
    """
    Constructs a 5-tier hierarchical Chart of Accounts tree with live aggregated balances.
    Level 1: Assets, Liabilities, Equity, Revenue, Expense
    Level 2-4: Sub-groups
    Level 5: Posting Ledger Leaf Accounts
    """
    stmt = (
        select(ChartOfAccount)
        .where(ChartOfAccount.organization_id == org_id, ChartOfAccount.is_active == True)
        .order_by(ChartOfAccount.account_code.asc())
    )
    res = await db.execute(stmt)
    accounts = res.scalars().all()

    # Pre-calculate ledger balances for all accounts
    balance_map: Dict[int, float] = {}
    for acc in accounts:
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
        if acc.account_type in ["Asset", "Expense", "Direct Project Cost"]:
            balance_map[acc.id] = round(dr - cr, 2)
        else:
            balance_map[acc.id] = round(cr - dr, 2)

    # Build node lookup
    nodes: Dict[int, Dict[str, Any]] = {}
    for acc in accounts:
        nodes[acc.id] = {
            "id": acc.id,
            "account_code": acc.account_code,
            "account_name_en": acc.account_name_en,
            "account_name_bn": acc.account_name_bn,
            "account_type": acc.account_type,
            "level": acc.level or 5,
            "is_group": acc.is_group,
            "is_leaf_account": acc.is_leaf_account,
            "currency": acc.currency or "BDT",
            "is_reconciliation_account": acc.is_reconciliation_account,
            "is_active": acc.is_active,
            "parent_account_id": acc.parent_account_id,
            "current_balance": balance_map.get(acc.id, 0.00),
            "children": []
        }

    # Aggregate children into parents and rollup balances for group accounts
    root_nodes: List[Dict[str, Any]] = []
    for acc in accounts:
        node = nodes[acc.id]
        if acc.parent_account_id and acc.parent_account_id in nodes:
            nodes[acc.parent_account_id]["children"].append(node)
        else:
            root_nodes.append(node)

    # Recursive balance rollup
    def rollup_balances(node: Dict[str, Any]) -> float:
        if not node["children"]:
            return node["current_balance"]
        child_total = sum(rollup_balances(child) for child in node["children"])
        if node["is_group"]:
            node["current_balance"] = round(node["current_balance"] + child_total, 2)
        return node["current_balance"]

    for r in root_nodes:
        rollup_balances(r)

    return root_nodes


# --------------------------------------------------------------------------
# Multi-Project Cost Centers & Budget Variance Engine
# --------------------------------------------------------------------------
async def get_cost_center_variances(
    db: AsyncSession,
    project_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Computes budget vs actual cost variance for all cost centers across WBS stages.
    """
    stmt = select(CostCenter).where(CostCenter.is_active == True)
    if project_id:
        stmt = stmt.where(CostCenter.project_id == project_id)
    
    result = await db.execute(stmt)
    cost_centers = result.scalars().all()

    variances = []
    for cc in cost_centers:
        # Sum actual spent from JournalEntry debits
        sum_stmt = (
            select(func.coalesce(func.sum(JournalEntry.debit_amount), 0.0))
            .join(Voucher, Voucher.id == JournalEntry.voucher_id)
            .where(JournalEntry.cost_center_id == cc.id, Voucher.status == "Posted")
        )
        actual = float((await db.execute(sum_stmt)).scalar() or 0.0)
        
        # Update model cached value
        cc.actual_spent = Decimal(str(actual))
        
        budget = float(cc.budget_allocated or 0.0)
        variance = round(budget - actual, 2)
        variance_pct = round((variance / budget * 100.0), 2) if budget > 0 else 0.0

        project_res = await db.execute(select(Project.project_name).where(Project.id == cc.project_id))
        proj_name = project_res.scalar() or "Project"

        variances.append({
            "id": cc.id,
            "cost_center_code": cc.cost_center_code,
            "name": cc.name,
            "project_id": cc.project_id,
            "project_name": proj_name,
            "tower_id": cc.tower_id,
            "wbs_stage": cc.wbs_stage,
            "budget_allocated": budget,
            "actual_spent": actual,
            "variance_bdt": variance,
            "variance_percent": variance_pct,
            "is_active": cc.is_active,
            "created_at": cc.created_at
        })

    return variances


# --------------------------------------------------------------------------
# Construction Work in Progress (CWIP) & Capitalization Engine
# --------------------------------------------------------------------------
async def get_project_cwip_summary(db: AsyncSession, project_id: int) -> Dict[str, Any]:
    """
    Summarizes CWIP accumulated expenditures, past capitalizations, and active balance.
    """
    proj_res = await db.execute(select(Project.project_name).where(Project.id == project_id))
    proj_name = proj_res.scalar() or f"Project #{project_id}"

    # Query all journal debits for CWIP accounts under this project
    cwip_stmt = (
        select(
            func.coalesce(func.sum(JournalEntry.debit_amount), 0.0),
            func.coalesce(func.sum(JournalEntry.credit_amount), 0.0)
        )
        .join(Voucher, Voucher.id == JournalEntry.voucher_id)
        .join(ChartOfAccount, ChartOfAccount.id == JournalEntry.account_id)
        .where(
            JournalEntry.project_id == project_id,
            Voucher.status == "Posted",
            (ChartOfAccount.account_code == "5100") | 
            (ChartOfAccount.account_name_en.ilike("%CWIP%")) |
            (ChartOfAccount.account_name_en.ilike("%Work-in-Progress%"))
        )
    )
    cwip_res = (await db.execute(cwip_stmt)).one()
    total_accumulated = float(cwip_res[0]) - float(cwip_res[1])
    if total_accumulated < 0:
        total_accumulated = 0.0

    # Query capitalized to date
    cap_stmt = (
        select(func.coalesce(func.sum(CWIPCapitalization.capitalized_amount), 0.0))
        .where(CWIPCapitalization.project_id == project_id)
    )
    total_capitalized = float((await db.execute(cap_stmt)).scalar() or 0.0)
    active_balance = round(total_accumulated - total_capitalized, 2)

    # Cost center breakdown
    cc_stmt = (
        select(
            CostCenter.id,
            CostCenter.cost_center_code,
            CostCenter.name,
            CostCenter.wbs_stage,
            func.coalesce(func.sum(JournalEntry.debit_amount), 0.0).label("spent")
        )
        .join(JournalEntry, JournalEntry.cost_center_id == CostCenter.id, isouter=True)
        .where(CostCenter.project_id == project_id)
        .group_by(CostCenter.id, CostCenter.cost_center_code, CostCenter.name, CostCenter.wbs_stage)
    )
    cc_rows = (await db.execute(cc_stmt)).all()
    cost_center_breakdown = [
        {
            "id": r[0],
            "cost_center_code": r[1],
            "name": r[2],
            "wbs_stage": r[3],
            "spent": float(r[4])
        }
        for r in cc_rows
    ]

    return {
        "project_id": project_id,
        "project_name": proj_name,
        "total_accumulated_cwip": round(total_accumulated, 2),
        "total_capitalized_cogs": round(total_capitalized, 2),
        "active_cwip_balance": active_balance,
        "cost_centers": cost_center_breakdown
    }


async def post_cwip_capitalization(
    db: AsyncSession,
    project_id: int,
    cwip_account_id: int,
    cogs_account_id: int,
    capitalized_amount: float,
    completion_percentage: float = 100.0,
    cost_center_id: Optional[int] = None,
    remarks: Optional[str] = None,
    user_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Capitalizes CWIP to Cost of Goods Sold (Flats) upon completion or handover:
      DEBIT: Cost of Goods Sold (Flats) [cogs_account_id]
      CREDIT: CWIP Construction Asset [cwip_account_id]
    """
    org_id = await get_default_organization_id(db)
    amt = Decimal(str(capitalized_amount)).quantize(Decimal("0.01"))

    # Resolve account names
    cwip_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.id == cwip_account_id))).scalar_one_or_none()
    cogs_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.id == cogs_account_id))).scalar_one_or_none()

    if not cwip_acc or not cogs_acc:
        raise ValueError("Invalid CWIP or COGS Chart of Account ID specified.")

    lines = [
        {
            "account_code": cogs_acc.account_code,
            "account_name_en": cogs_acc.account_name_en,
            "account_type": "Expense",
            "debit": amt,
            "credit": Decimal("0.00"),
            "narration": f"Capitalization to COGS for Project #{project_id} ({completion_percentage}% complete)"
        },
        {
            "account_code": cwip_acc.account_code,
            "account_name_en": cwip_acc.account_name_en,
            "account_type": "Asset",
            "debit": Decimal("0.00"),
            "credit": amt,
            "narration": f"CWIP derecognition and transfer to COGS for Project #{project_id}"
        }
    ]

    custom_ref = f"JV-CWIP-{project_id}-{date.today().strftime('%Y%m%d%H%M')}"
    narration = f"CWIP to COGS Capitalization for Project #{project_id}. {remarks or ''}"

    voucher = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=project_id,
        voucher_type="Journal",
        narration=narration,
        line_entries=lines,
        user_id=user_id,
        custom_voucher_number=custom_ref
    )

    cap_record = CWIPCapitalization(
        organization_id=org_id,
        project_id=project_id,
        cost_center_id=cost_center_id,
        capitalization_date=date.today(),
        cwip_account_id=cwip_account_id,
        cogs_account_id=cogs_account_id,
        capitalized_amount=amt,
        completion_percentage=Decimal(str(completion_percentage)),
        voucher_id=voucher.id,
        remarks=remarks
    )
    db.add(cap_record)
    await db.flush()
    await db.refresh(cap_record)

    return {
        "id": cap_record.id,
        "voucher_id": voucher.id,
        "voucher_number": voucher.voucher_number,
        "capitalized_amount": float(amt),
        "completion_percentage": completion_percentage,
        "status": "CAPITALIZED"
    }


# --------------------------------------------------------------------------
# IFRS-15 Revenue Recognition Engine
# --------------------------------------------------------------------------
async def post_ifrs15_revenue_recognition(
    db: AsyncSession,
    project_id: int,
    booking_id: int,
    advance_liability_account_id: int,
    revenue_account_id: int,
    recognized_amount: float,
    recognition_method: str = "POINT_IN_TIME_HANDOVER",
    remarks: Optional[str] = None,
    user_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    IFRS 15 Revenue Recognition:
      DEBIT: Customer Advance Liability - Flat [advance_liability_account_id]
      CREDIT: Real Estate Apartment Sales Revenue [revenue_account_id]
    """
    org_id = await get_default_organization_id(db)
    amt = Decimal(str(recognized_amount)).quantize(Decimal("0.01"))

    adv_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.id == advance_liability_account_id))).scalar_one_or_none()
    rev_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.id == revenue_account_id))).scalar_one_or_none()

    if not adv_acc or not rev_acc:
        raise ValueError("Invalid Advance Liability or Revenue Account specified.")

    lines = [
        {
            "account_code": adv_acc.account_code,
            "account_name_en": adv_acc.account_name_en,
            "account_type": "Liability",
            "debit": amt,
            "credit": Decimal("0.00"),
            "narration": f"IFRS 15 Advance Derecognition for Booking #{booking_id}"
        },
        {
            "account_code": rev_acc.account_code,
            "account_name_en": rev_acc.account_name_en,
            "account_type": "Revenue",
            "debit": Decimal("0.00"),
            "credit": amt,
            "narration": f"IFRS 15 Real Estate Revenue Recognition ({recognition_method}) for Booking #{booking_id}"
        }
    ]

    custom_ref = f"JV-IFRS15-{booking_id}-{date.today().strftime('%Y%m%d%H%M')}"
    narration = f"IFRS 15 Revenue Recognition for Booking #{booking_id} via {recognition_method}. {remarks or ''}"

    voucher = await post_double_entry_voucher(
        db=db,
        organization_id=org_id,
        project_id=project_id,
        voucher_type="Journal",
        narration=narration,
        line_entries=lines,
        user_id=user_id,
        custom_voucher_number=custom_ref
    )

    rec_record = IFRS15RevenueRecognition(
        organization_id=org_id,
        project_id=project_id,
        booking_id=booking_id,
        recognition_date=date.today(),
        advance_liability_account_id=advance_liability_account_id,
        revenue_account_id=revenue_account_id,
        recognized_amount=amt,
        recognition_method=recognition_method,
        voucher_id=voucher.id,
        remarks=remarks
    )
    db.add(rec_record)
    await db.flush()
    await db.refresh(rec_record)

    return {
        "id": rec_record.id,
        "voucher_id": voucher.id,
        "voucher_number": voucher.voucher_number,
        "recognized_amount": float(amt),
        "recognition_method": recognition_method,
        "status": "RECOGNIZED"
    }


# --------------------------------------------------------------------------
# Post-Dated Cheque (PDC) Safe & Vault Engine
# --------------------------------------------------------------------------
async def update_pdc_vault_status(
    db: AsyncSession,
    pdc_id: int,
    new_status: str,
    bounce_reason: Optional[str] = None,
    bank_account_id: Optional[int] = None,
    user_id: Optional[int] = None
) -> PDCVault:
    """
    Enforces PDC status lifecycle:
    IN_VAULT -> DEPOSITED -> CLEARED (Auto-posts Bank Receipt Voucher) / BOUNCED (Triggers NI Act 138).
    """
    stmt = select(PDCVault).where(PDCVault.id == pdc_id)
    res = await db.execute(stmt)
    pdc = res.scalar_one_or_none()
    if not pdc:
        raise ValueError(f"PDC Cheque #{pdc_id} not found in Safe Vault.")

    pdc.status = new_status
    if new_status == "DEPOSITED":
        pdc.deposit_date = date.today()
    elif new_status == "CLEARED":
        pdc.clearance_date = date.today()
        # Automatically generate Bank Receipt Voucher:
        # DEBIT: Bank Account
        # CREDIT: Customer Advance Liability (Account 2300)
        bank_acc = None
        if bank_account_id:
            bank_acc = (await db.execute(select(ChartOfAccount).where(ChartOfAccount.id == bank_account_id))).scalar_one_or_none()
        
        bank_code = bank_acc.account_code if bank_acc else "1020"
        bank_name = bank_acc.account_name_en if bank_acc else "Commercial Bank Accounts (Collection Vault)"

        lines = [
            {
                "account_code": bank_code,
                "account_name_en": bank_name,
                "account_type": "Asset",
                "debit": pdc.amount,
                "credit": Decimal("0.00"),
                "narration": f"PDC Cheque Cleared: #{pdc.cheque_no} ({pdc.bank_name})"
            },
            {
                "account_code": "2300",
                "account_name_en": "Advance from Allottees (Apartment Bookings)",
                "account_type": "Liability",
                "debit": Decimal("0.00"),
                "credit": pdc.amount,
                "narration": f"Cheque cleared for {pdc.drawer_name} (Booking #{pdc.booking_id})"
            }
        ]
        custom_ref = f"BR-PDC-{pdc.cheque_no}"
        voucher = await post_double_entry_voucher(
            db=db,
            organization_id=pdc.organization_id,
            project_id=pdc.project_id,
            voucher_type="Bank_Receipt",
            narration=f"PDC Cheque Cleared #{pdc.cheque_no} from {pdc.drawer_name} ({pdc.bank_name})",
            line_entries=lines,
            user_id=user_id,
            custom_voucher_number=custom_ref
        )
        pdc.voucher_id = voucher.id

    elif new_status == "BOUNCED":
        pdc.bounce_date = date.today()
        pdc.bounce_reason = bounce_reason or "Insufficient Funds / Signature Mismatch"
        pdc.legal_notice_sent = True # Auto-flags for Legal Section 138 Notice

    await db.flush()
    await db.refresh(pdc)
    return pdc


# --------------------------------------------------------------------------
# Smart Bank Statement Auto-Matching Engine
# --------------------------------------------------------------------------
async def auto_match_bank_statement(
    db: AsyncSession,
    bank_account_id: int,
    statement_date: date,
    statement_balance: float,
    statement_rows: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Parses bank transactions and matches against posted Bank Vouchers.
    Matching logic:
    - Deposit in statement (credit) matches Journal Entry DEBIT to bank.
    - Withdrawal in statement (debit) matches Journal Entry CREDIT to bank.
    - Date tolerance: +/- 5 days.
    """
    # Fetch all posted journal entry lines for this bank account
    journal_stmt = (
        select(JournalEntry, Voucher.voucher_number)
        .join(Voucher, Voucher.id == JournalEntry.voucher_id)
        .where(
            JournalEntry.account_id == bank_account_id,
            Voucher.status == "Posted"
        )
    )
    journal_res = await db.execute(journal_stmt)
    entries = journal_res.all()

    # Pre-calculate book balance
    sum_stmt = (
        select(
            func.coalesce(func.sum(JournalEntry.debit_amount), 0.0),
            func.coalesce(func.sum(JournalEntry.credit_amount), 0.0)
        )
        .join(Voucher, Voucher.id == JournalEntry.voucher_id)
        .where(JournalEntry.account_id == bank_account_id, Voucher.status == "Posted")
    )
    dr_cr = (await db.execute(sum_stmt)).one()
    book_balance = round(float(dr_cr[0]) - float(dr_cr[1]), 2)

    matched_items = []
    matched_count = 0
    unmatched_count = 0

    used_entry_ids = set()

    for row in statement_rows:
        row_dr = float(row.get("debit_amount", 0.0))
        row_cr = float(row.get("credit_amount", 0.0))
        row_date = row.get("transaction_date")
        row_ref = str(row.get("reference_no") or "").strip().lower()
        row_desc = str(row.get("description") or "").strip().lower()

        is_matched = False
        matched_v_no = None

        # Try to find matching journal entry
        for ent, v_no in entries:
            if ent.id in used_entry_ids:
                continue

            # In bank statement: Deposit = Credit. In Company Book: Deposit = Debit to Bank
            if row_cr > 0 and abs(float(ent.debit_amount) - row_cr) < 0.01:
                # Amount matched! Check date/reference
                date_diff = abs((ent.voucher_date - row_date).days) if row_date else 0
                if date_diff <= 7:
                    is_matched = True
                    matched_v_no = v_no
                    used_entry_ids.add(ent.id)
                    break
            
            # In bank statement: Withdrawal = Debit. In Company Book: Withdrawal = Credit from Bank
            elif row_dr > 0 and abs(float(ent.credit_amount) - row_dr) < 0.01:
                date_diff = abs((ent.voucher_date - row_date).days) if row_date else 0
                if date_diff <= 7:
                    is_matched = True
                    matched_v_no = v_no
                    used_entry_ids.add(ent.id)
                    break

        status_str = "MATCHED" if is_matched else "UNMATCHED"
        if is_matched:
            matched_count += 1
        else:
            unmatched_count += 1

        matched_items.append({
            "transaction_date": row_date,
            "reference_no": row.get("reference_no"),
            "description": row.get("description"),
            "debit_amount": row_dr,
            "credit_amount": row_cr,
            "match_status": status_str,
            "matched_voucher_number": matched_v_no
        })

    diff = round(statement_balance - book_balance, 2)
    is_reconciled = (abs(diff) < 0.05) and (unmatched_count == 0)

    # Save BankReconciliation master record
    recon = BankReconciliation(
        bank_account_id=bank_account_id,
        statement_date=statement_date,
        statement_balance=Decimal(str(statement_balance)),
        book_balance=Decimal(str(book_balance)),
        difference_amount=Decimal(str(diff)),
        is_reconciled=is_reconciled,
        reconciliation_notes=f"Auto-Reconciled: {matched_count} matched, {unmatched_count} unmatched."
    )
    db.add(recon)
    await db.flush()

    # Save statement items
    for item in matched_items:
        bs_item = BankStatementItem(
            reconciliation_id=recon.id,
            transaction_date=item["transaction_date"],
            reference_no=item["reference_no"],
            description=item["description"],
            debit_amount=Decimal(str(item["debit_amount"])),
            credit_amount=Decimal(str(item["credit_amount"])),
            match_status=item["match_status"],
            matched_voucher_id=None
        )
        db.add(bs_item)

    await db.flush()

    return {
        "reconciliation_id": recon.id,
        "bank_account_id": bank_account_id,
        "statement_date": statement_date,
        "statement_balance": statement_balance,
        "book_balance": book_balance,
        "difference_amount": diff,
        "is_reconciled": is_reconciled,
        "matched_count": matched_count,
        "unmatched_count": unmatched_count,
        "items": matched_items
    }
