"""
Migration and Seeding script for Accounts Payable (AP) Module.
Creates tables:
1. acc_ap_invoices: Supplier invoices, contractor bills, professional fees, utilities
2. acc_ap_payments: Disbursement records, cheque/bank refs, GL payment voucher links
3. acc_ap_adjustments: Debit notes, credit notes, discounts, penalties

Seeds dynamic lookups:
- AP_INVOICE_TYPE
- AP_INVOICE_STATUS
- AP_PAYMENT_METHOD
- AP_ADJUSTMENT_TYPE

Seeds initial sample AP records with 3-way matching and contractor bills.
"""
import sys
import os
import asyncio
import logging
from sqlalchemy import text, select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LOOKUP_SEEDS = [
    {
        "category_code": "AP_INVOICE_TYPE",
        "category_name": "Accounts Payable Invoice Types",
        "description": "Categories of payable invoices and contractor bills",
        "items": [
            ("Supplier_Material", "Supplier Material Invoice (3-Way Match)", "সরবরাহকারী কাঁচামাল বিল", "#3B82F6", 1, True),
            ("Contractor_RA", "Construction Contractor RA Bill", "নির্মাণ ঠিকাদার বিল", "#F59E0B", 2, False),
            ("Professional_Fee", "Professional & Consultancy Fees", "পেশাদার ও পরামর্শক ফি", "#8B5CF6", 3, False),
            ("Utility_Admin", "Utility, Rent & Office Admin", "ইউটিলিটি ও অফিস বিল", "#06B6D4", 4, False),
            ("Other", "Other Payables", "অন্যান্য প্রদেয় বিল", "#64748B", 5, False)
        ]
    },
    {
        "category_code": "AP_INVOICE_STATUS",
        "category_name": "AP Invoice Workflow Statuses",
        "description": "Lifecycle stages of accounts payable invoices",
        "items": [
            ("Draft", "Draft Registered", "খসড়া বিল", "#64748B", 1, True),
            ("Pending_Verification", "Pending 3-Way Match / QC Verification", "যাচাইকরণ অপেক্ষমাণ", "#F59E0B", 2, False),
            ("Approved", "Approved for Payment", "অনুমোদিত", "#10B981", 3, False),
            ("Partially_Paid", "Partially Paid", "আংশিক পরিশোধিত", "#3B82F6", 4, False),
            ("Paid", "Fully Paid & Settled", "পরিশোধিত", "#059669", 5, False),
            ("Cancelled", "Cancelled / Disputed", "বাতিলকৃত / বিতর্কিত", "#EF4444", 6, False)
        ]
    },
    {
        "category_code": "AP_PAYMENT_METHOD",
        "category_name": "AP Disbursement Methods",
        "description": "Payment instrument for vendor and contractor disbursements",
        "items": [
            ("Bank_Transfer", "Bank Transfer (BEFTN / RTGS / EFT)", "ব্যাংক ট্রান্সফার", "#3B82F6", 1, True),
            ("Bank_Cheque", "Account Payee Cheque", "একাউন্ট পেই চেক", "#10B981", 2, False),
            ("Cash", "Petty Cash Voucher", "নগদ পরিশোধ", "#F59E0B", 3, False),
            ("Pay_Order", "Bank Pay Order", "ব্যাংক পে-অর্ডার", "#8B5CF6", 4, False)
        ]
    },
    {
        "category_code": "AP_ADJUSTMENT_TYPE",
        "category_name": "AP Supplier Adjustment Types",
        "description": "Debit notes, credit notes, penalties and rebate adjustments",
        "items": [
            ("Debit_Note", "Debit Note (Material Return / Penalty)", "ডেবিট নোট", "#EF4444", 1, True),
            ("Credit_Note", "Credit Note (Vendor Rebate / Rate Adjustment)", "ক্রেডিট নোট", "#10B981", 2, False),
            ("Retention_Holdback", "Contractor Retention Holdback", "জামানত কর্তন", "#F59E0B", 3, False),
            ("TDS_VDS_Tax", "Statutory TDS / VDS Withholding", "উৎস কর কর্তন", "#8B5CF6", 4, False)
        ]
    }
]

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS acc_ap_invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    invoice_number VARCHAR(64) NOT NULL,
    invoice_type VARCHAR(32) NOT NULL DEFAULT 'Supplier_Material',
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    vendor_id BIGINT NULL,
    contractor_id BIGINT NULL,
    payee_name VARCHAR(191) NOT NULL,
    project_id BIGINT NULL,
    cost_center_id BIGINT NULL,
    expense_account_id BIGINT NULL,
    liability_account_id BIGINT NULL,
    po_id BIGINT NULL,
    grn_id BIGINT NULL,
    ra_bill_id BIGINT NULL,
    gross_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    tax_withholding_tds NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    vat_withholding_vds NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    retention_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    other_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_payable_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    three_way_match_status VARCHAR(32) NOT NULL DEFAULT 'NOT_APPLICABLE',
    status VARCHAR(32) NOT NULL DEFAULT 'Draft',
    description TEXT NULL,
    voucher_id BIGINT NULL,
    approved_by_user_id BIGINT NULL,
    approved_at TIMESTAMP NULL,
    created_by_user_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ap_invoices_type (invoice_type),
    KEY idx_ap_invoices_status (status),
    KEY idx_ap_invoices_vendor (vendor_id),
    KEY idx_ap_invoices_contractor (contractor_id),
    KEY idx_ap_invoices_due_date (due_date),
    KEY idx_ap_invoices_project (project_id),
    CONSTRAINT uq_vendor_invoice_number UNIQUE (vendor_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS acc_ap_payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    invoice_id BIGINT NOT NULL,
    payment_number VARCHAR(64) NOT NULL UNIQUE,
    payment_date DATE NOT NULL,
    amount NUMERIC(16, 2) NOT NULL,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'Bank_Transfer',
    bank_account_id BIGINT NULL,
    cheque_number VARCHAR(64) NULL,
    cheque_date DATE NULL,
    transaction_reference VARCHAR(128) NULL,
    voucher_id BIGINT NULL,
    notes TEXT NULL,
    created_by_user_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ap_payments_invoice (invoice_id),
    KEY idx_ap_payments_date (payment_date)
);

CREATE TABLE IF NOT EXISTS acc_ap_adjustments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    invoice_id BIGINT NULL,
    vendor_id BIGINT NULL,
    contractor_id BIGINT NULL,
    adjustment_number VARCHAR(64) NOT NULL UNIQUE,
    adjustment_type VARCHAR(32) NOT NULL DEFAULT 'Debit_Note',
    adjustment_date DATE NOT NULL,
    amount NUMERIC(16, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    voucher_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

async def run_migration():
    async with AsyncSessionLocal() as db:
        logger.info("1. Creating Accounts Payable tables...")
        # Check and create tables
        for statement in CREATE_TABLES_SQL.strip().split(";"):
            sql = statement.strip()
            if sql:
                await db.execute(text(sql))
        await db.commit()
        logger.info("   -> AP tables ready.")

        logger.info("2. Seeding AP Lookup Categories...")
        for cat_data in LOOKUP_SEEDS:
            stmt = select(LookupCategory).where(LookupCategory.category_code == cat_data["category_code"])
            existing_cat = (await db.execute(stmt)).scalar_one_or_none()
            if not existing_cat:
                cat = LookupCategory(
                    category_code=cat_data["category_code"],
                    category_name=cat_data["category_name"],
                    description=cat_data["description"],
                    is_system_locked=True,
                    is_active=True
                )
                db.add(cat)
                await db.flush()
                cat_id = cat.id
                logger.info(f"   Created category: {cat_data['category_code']}")
            else:
                cat_id = existing_cat.id

            # Seed items
            for item_code, item_name_en, item_name_bn, color, sort_order, is_default in cat_data["items"]:
                item_stmt = select(LookupItem).where(
                    LookupItem.category_id == cat_id,
                    LookupItem.item_code == item_code
                )
                existing_item = (await db.execute(item_stmt)).scalar_one_or_none()
                if not existing_item:
                    item = LookupItem(
                        category_id=cat_id,
                        item_code=item_code,
                        item_name_en=item_name_en,
                        item_name_bn=item_name_bn,
                        color_badge=color,
                        sort_order=sort_order,
                        is_default=is_default,
                        is_active=True
                    )
                    db.add(item)
                    logger.info(f"     -> Added item: {item_code}")

        await db.commit()

        logger.info("3. Seeding Sample AP Invoices if table is empty...")
        count_res = await db.execute(text("SELECT COUNT(*) FROM acc_ap_invoices"))
        count = count_res.scalar() or 0
        if count == 0:
            # Look up available vendor, contractor, project, accounts
            vendor_res = await db.execute(text("SELECT id, vendor_name FROM scm_vendors LIMIT 2"))
            vendors = vendor_res.fetchall()

            contractor_res = await db.execute(text("SELECT id, company_name FROM con_contractors LIMIT 2"))
            contractors = contractor_res.fetchall()

            proj_res = await db.execute(text("SELECT id FROM prj_projects LIMIT 2"))
            projects = proj_res.fetchall()

            acc_res = await db.execute(text("SELECT id, account_code FROM acc_chart_of_accounts WHERE account_code IN ('2110', '5100', '6100', '1120')"))
            acc_map = {r[1]: r[0] for r in acc_res.fetchall()}

            v_id1 = vendors[0][0] if vendors else None
            v_name1 = vendors[0][1] if vendors else "BSRM Steels Ltd."
            v_id2 = vendors[1][0] if len(vendors) > 1 else v_id1
            v_name2 = vendors[1][1] if len(vendors) > 1 else "Bashundhara Cement Mills"

            c_id1 = contractors[0][0] if contractors else None
            c_name1 = contractors[0][1] if contractors else "Apex Civil Engineering Builders"

            p_id1 = projects[0][0] if projects else None
            p_id2 = projects[1][0] if len(projects) > 1 else p_id1

            exp_acc = acc_map.get('6100') or acc_map.get('5100') or 1
            liab_acc = acc_map.get('2110') or 1
            bank_acc = acc_map.get('1120') or 1

            sample_invoices = [
                (
                    "INV-BSRM-88201", "Supplier_Material", "2026-03-01", "2026-03-31",
                    v_id1, None, v_name1, p_id1, None, exp_acc, liab_acc,
                    2450000.00, 73500.00, 122500.00, 0.00, 0.00, 2254000.00, 2254000.00, 0.00,
                    "MATCHED_OK", "Paid", "500W Deformed Rebar supply for foundation raft. Fully 3-way matched with PO-2026-001 and GRN-2026-001."
                ),
                (
                    "INV-CEM-99410", "Supplier_Material", "2026-03-15", "2026-04-15",
                    v_id2, None, v_name2, p_id1, None, exp_acc, liab_acc,
                    1380000.00, 41400.00, 69000.00, 0.00, 0.00, 1269600.00, 600000.00, 669600.00,
                    "MATCHED_OK", "Partially_Paid", "Portland Composite Cement (PCC) 2,000 Bags. Partial disbursement made."
                ),
                (
                    "BILL-RA-APEX-04", "Contractor_RA", "2026-03-20", "2026-04-10",
                    None, c_id1, c_name1, p_id1, None, exp_acc, liab_acc,
                    4800000.00, 240000.00, 360000.00, 240000.00, 50000.00, 3910000.00, 0.00, 3910000.00,
                    "MATCHED_OK", "Approved", "Substructure 5th Floor Slab RCC Casting RA Bill. Certified by Project Engineer."
                ),
                (
                    "INV-ARCH-2026-03", "Professional_Fee", "2026-02-28", "2026-03-28",
                    None, None, "Studio Morph Design Architects", p_id2, None, exp_acc, liab_acc,
                    850000.00, 85000.00, 0.00, 0.00, 0.00, 765000.00, 0.00, 765000.00,
                    "NOT_APPLICABLE", "Approved", "Architectural Working Drawings & MEP Consultant Retainer (Overdue)."
                ),
                (
                    "INV-DESCO-MAR-26", "Utility_Admin", "2026-03-25", "2026-04-05",
                    None, None, "Dhaka Electric Supply Co. (DESCO)", p_id1, None, exp_acc, liab_acc,
                    145000.00, 0.00, 0.00, 0.00, 0.00, 145000.00, 145000.00, 0.00,
                    "NOT_APPLICABLE", "Paid", "Site High-Tension Substation Electrical Power consumption bill."
                )
            ]

            for inv in sample_invoices:
                await db.execute(text("""
                    INSERT INTO acc_ap_invoices (
                        invoice_number, invoice_type, invoice_date, due_date,
                        vendor_id, contractor_id, payee_name, project_id, cost_center_id,
                        expense_account_id, liability_account_id,
                        gross_amount, tax_withholding_tds, vat_withholding_vds,
                        retention_amount, other_deductions, net_payable_amount,
                        paid_amount, balance_due, three_way_match_status, status, description
                    ) VALUES (
                        :inv_no, :inv_type, :inv_date, :due_date,
                        :v_id, :c_id, :payee, :p_id, :cc_id,
                        :exp_acc, :liab_acc,
                        :gross, :tds, :vds,
                        :ret, :other_ded, :net,
                        :paid, :bal, :match_stat, :status, :desc
                    )
                """), {
                    "inv_no": inv[0], "inv_type": inv[1], "inv_date": inv[2], "due_date": inv[3],
                    "v_id": inv[4], "c_id": inv[5], "payee": inv[6], "p_id": inv[7], "cc_id": inv[8],
                    "exp_acc": inv[9], "liab_acc": inv[10],
                    "gross": inv[11], "tds": inv[12], "vds": inv[13],
                    "ret": inv[14], "other_ded": inv[15], "net": inv[16],
                    "paid": inv[17], "bal": inv[18], "match_stat": inv[19], "status": inv[20], "desc": inv[21]
                })

            await db.commit()
            logger.info(f"   -> Seeded {len(sample_invoices)} realistic AP invoices.")

            # Seed a payment for the first invoice
            inv_first_res = await db.execute(text("SELECT id FROM acc_ap_invoices WHERE invoice_number = 'INV-BSRM-88201'"))
            first_id = inv_first_res.scalar()
            if first_id:
                await db.execute(text("""
                    INSERT INTO acc_ap_payments (
                        invoice_id, payment_number, payment_date, amount, payment_method,
                        bank_account_id, cheque_number, transaction_reference, notes
                    ) VALUES (
                        :inv_id, 'PAY-2026-0001', '2026-03-28', 2254000.00, 'Bank_Transfer',
                        :bank_id, 'EFT-8839210', 'EBL-CORP-TXN-0982', 'Full settlement for foundation rebar supply'
                    )
                """), {"inv_id": first_id, "bank_id": bank_acc})
                await db.commit()
                logger.info("   -> Seeded sample payment PAY-2026-0001.")

        logger.info("AP Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
