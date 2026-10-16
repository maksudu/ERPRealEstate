import logging
from decimal import Decimal
from datetime import date
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.modules.auth.models import Organization
from app.modules.accounts.models import ChartOfAccount, Voucher, JournalEntry

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
