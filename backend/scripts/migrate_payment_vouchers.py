"""
Database Migration and Seeding Script for Payment Vouchers.
Section 8: Payment Vouchers
8.1 Payment voucher fields
8.2 Payment voucher workflow (Draft -> Submitted -> Checked -> Approved -> Posted -> Disbursed -> Reconciled)
8.3 Office expense paid by bank example (Direct Expense vs Payable Settlement)
"""
import sys
import os
import asyncio
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import text, select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS acc_payment_vouchers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    branch_name VARCHAR(128) NOT NULL DEFAULT 'Head Office Branch',
    project_id BIGINT NULL,
    voucher_number VARCHAR(64) NOT NULL UNIQUE,
    voucher_date DATE NOT NULL,
    payee_type VARCHAR(32) NOT NULL DEFAULT 'Supplier',
    payee_name VARCHAR(128) NOT NULL,
    vendor_id BIGINT NULL,
    contractor_id BIGINT NULL,
    landowner_id BIGINT NULL,
    employee_id BIGINT NULL,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'Bank_Transfer',
    source_type VARCHAR(32) NOT NULL DEFAULT 'Bank_Account',
    bank_account_id BIGINT NULL,
    cash_box_id BIGINT NULL,
    mfs_provider_id BIGINT NULL,
    amount DECIMAL(16, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
    debit_category VARCHAR(32) NOT NULL DEFAULT 'Expense',
    debit_account_id BIGINT NOT NULL,
    credit_account_id BIGINT NOT NULL,
    cost_center_id BIGINT NULL,
    ap_invoice_id BIGINT NULL,
    supporting_invoice_ref VARCHAR(128) NULL,
    purpose TEXT NOT NULL,
    narration TEXT NULL,
    attachments_url TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Draft',
    cheque_number VARCHAR(64) NULL,
    cheque_date DATE NULL,
    cheque_status VARCHAR(32) NULL,
    settlement_status VARCHAR(32) NOT NULL DEFAULT 'Pending_Settlement',
    settlement_date DATE NULL,
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    reconciled_at TIMESTAMP NULL,
    prepared_by_user_id BIGINT NULL,
    prepared_at TIMESTAMP NULL,
    checked_by_user_id BIGINT NULL,
    checked_at TIMESTAMP NULL,
    checked_remarks TEXT NULL,
    approved_by_user_id BIGINT NULL,
    approved_at TIMESTAMP NULL,
    approved_remarks TEXT NULL,
    disbursed_by_user_id BIGINT NULL,
    disbursed_at TIMESTAMP NULL,
    gl_voucher_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE SET NULL,
    FOREIGN KEY (vendor_id) REFERENCES scm_vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (contractor_id) REFERENCES con_contractors(id) ON DELETE SET NULL,
    FOREIGN KEY (bank_account_id) REFERENCES acc_bank_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (cash_box_id) REFERENCES acc_cash_boxes(id) ON DELETE SET NULL,
    FOREIGN KEY (mfs_provider_id) REFERENCES acc_mfs_providers(id) ON DELETE SET NULL,
    FOREIGN KEY (debit_account_id) REFERENCES acc_chart_of_accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (credit_account_id) REFERENCES acc_chart_of_accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (cost_center_id) REFERENCES acc_cost_centers(id) ON DELETE SET NULL,
    FOREIGN KEY (ap_invoice_id) REFERENCES acc_ap_invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (gl_voucher_id) REFERENCES acc_vouchers(id) ON DELETE SET NULL,
    FOREIGN KEY (prepared_by_user_id) REFERENCES sys_users(id) ON DELETE SET NULL,
    FOREIGN KEY (checked_by_user_id) REFERENCES sys_users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_user_id) REFERENCES sys_users(id) ON DELETE SET NULL,
    FOREIGN KEY (disbursed_by_user_id) REFERENCES sys_users(id) ON DELETE SET NULL,
    INDEX idx_pv_num (voucher_number),
    INDEX idx_pv_date (voucher_date),
    INDEX idx_pv_status (status),
    INDEX idx_pv_method (payment_method),
    INDEX idx_pv_payee (payee_name),
    INDEX idx_pv_debit_cat (debit_category),
    INDEX idx_pv_bank (bank_account_id),
    INDEX idx_pv_box (cash_box_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

LOOKUP_SEEDS = [
    {
        "category_code": "PAYMENT_VOUCHER_STATUS",
        "category_name": "Payment Voucher Workflow Statuses",
        "description": "Workflow lifecycle states: Draft -> Submitted -> Checked -> Approved -> Posted -> Disbursed -> Reconciled",
        "items": [
            ("Draft", "Draft (In Preparation)", 1),
            ("Submitted", "Submitted for Verification", 2),
            ("Checked", "Checked by Accounts Officer", 3),
            ("Approved", "Approved by Management", 4),
            ("Posted", "Posted to General Ledger", 5),
            ("Disbursed", "Disbursed / Paid (Instrument Issued)", 6),
            ("Reconciled", "Reconciled with Bank Statement", 7),
            ("Cancelled", "Cancelled / Void", 8)
        ]
    },
    {
        "category_code": "PAYMENT_METHOD",
        "category_name": "Payment Voucher Outgoing Methods",
        "description": "Payment instrument methods for outgoing disbursements",
        "items": [
            ("Bank_Transfer", "BEFTN / RTGS / Corporate Bank Transfer", 1),
            ("Bank_Cheque", "Account Payee Cheque", 2),
            ("Cash", "Cash in Hand / Imprest", 3),
            ("MFS", "Mobile Financial Service (bKash/Nagad)", 4),
            ("Pay_Order", "Bank Pay Order", 5)
        ]
    },
    {
        "category_code": "PAYMENT_DEBIT_CATEGORY",
        "category_name": "Payment Voucher Debit Categories",
        "description": "Debit target classification preventing duplicate expense recognition",
        "items": [
            ("Expense", "Direct Operational / Office Expense", 1),
            ("Payable", "Accounts Payable Settlement (Liquidate AP Bill)", 2),
            ("Asset_CWIP", "Capital Work-in-Progress (Project Construction)", 3),
            ("Inventory", "Material Inventory Acquisition", 4),
            ("Advance", "Supplier / Contractor Advance", 5)
        ]
    },
    {
        "category_code": "PAYEE_TYPE",
        "category_name": "Payment Voucher Payee Types",
        "description": "Categories of beneficiaries and payees",
        "items": [
            ("Supplier", "Material & Hardware Supplier", 1),
            ("Subcontractor", "Civil / MEP / Finishing Contractor", 2),
            ("Landowner", "Landowner Advance / Revenue Share", 3),
            ("Employee", "Staff Salary / Expense Reimbursement", 4),
            ("Utility", "DESCO / WASA / Titas Gas / Internet", 5),
            ("Other", "General Vendor / Regulatory Body", 6)
        ]
    },
    {
        "category_code": "CHEQUE_LIFECYCLE_STATUS",
        "category_name": "Cheque Payment Lifecycle Statuses",
        "description": "Lifecycle tracking for outgoing cheque payments",
        "items": [
            ("Prepared", "Cheque Leaf Prepared / Printed", 1),
            ("Issued", "Cheque Issued / Handed over to Payee", 2),
            ("Presented", "Presented at Clearing House", 3),
            ("Cleared", "Cleared / Debited from Bank Account", 4),
            ("Bounced", "Cheque Bounced / Dishonoured", 5),
            ("Void", "Cheque Cancelled / Void Leaf", 6)
        ]
    }
]

async def migrate_payment_vouchers():
    logger.info("Starting Payment Vouchers Database Migration...")
    async with AsyncSessionLocal() as session:
        # 1. Create Table
        logger.info("Step 1: Creating acc_payment_vouchers table...")
        await session.execute(text(CREATE_TABLE_SQL))
        await session.commit()

        # 2. Seed Dynamic Lookups
        logger.info("Step 2: Seeding payment voucher dynamic lookups...")
        for cat in LOOKUP_SEEDS:
            stmt = select(LookupCategory).where(LookupCategory.category_code == cat["category_code"])
            existing_cat = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_cat:
                category = LookupCategory(
                    category_code=cat["category_code"],
                    category_name=cat["category_name"],
                    description=cat["description"],
                    is_system_locked=True
                )
                session.add(category)
                await session.flush()
                cat_id = category.id
            else:
                cat_id = existing_cat.id

            for item_code, item_name, sort_order in cat["items"]:
                item_stmt = select(LookupItem).where(
                    LookupItem.category_id == cat_id,
                    LookupItem.item_code == item_code
                )
                existing_item = (await session.execute(item_stmt)).scalar_one_or_none()
                if not existing_item:
                    new_item = LookupItem(
                        category_id=cat_id,
                        item_code=item_code,
                        item_name_en=item_name,
                        item_name_bn=item_name,
                        sort_order=sort_order,
                        is_active=True
                    )
                    session.add(new_item)
        await session.commit()

        # 3. Ensure GL Accounts exist
        # 5200: Office Expense / Administrative Expense
        # 1110: Corporate Bank Account
        # 2100: Supplier Payables
        logger.info("Step 3: Ensuring GL Accounts (5200 Office Expense, 2100 Payables, 1110 Bank)...")
        from app.modules.accounts.models import ChartOfAccount, BankAccount, CashBox
        
        async def ensure_account(code, name, acc_type):
            res = (await session.execute(select(ChartOfAccount).where(ChartOfAccount.account_code == code))).scalar_one_or_none()
            if not res:
                acc = ChartOfAccount(
                    organization_id=1,
                    account_code=code,
                    account_name_en=name,
                    account_name_bn=name,
                    account_type=acc_type,
                    is_leaf_account=True,
                    is_active=True
                )
                session.add(acc)
                await session.flush()
                return acc
            return res

        acc_office_exp = await ensure_account("5200", "Office & Administrative Expenses", "Expense")
        acc_bank = await ensure_account("1110", "Dutch-Bangla Bank Corporate Account", "Asset")
        acc_payable = await ensure_account("2100", "Supplier & Contractor Payables", "Liability")
        await session.commit()

        # 4. Fetch Bank Account and Cash Box for linking
        bank_res = (await session.execute(select(BankAccount).limit(1))).scalar_one_or_none()
        bank_id = bank_res.id if bank_res else None

        cashbox_res = (await session.execute(select(CashBox).limit(1))).scalar_one_or_none()
        cashbox_id = cashbox_res.id if cashbox_res else None

        # 5. Seed User's Exact Examples:
        # Example 1: Office Expense Paid by Bank (৳25,000)
        # Direct Expense: Debit Office Expense (5200) = ৳25,000, Credit Bank (1110) = ৳25,000
        logger.info("Step 4: Seeding Example 1 - Direct Office Expense ৳25,000 paid by Bank...")
        from app.modules.accounts.models import Voucher, JournalEntry

        existing_pv1 = (await session.execute(text("SELECT id FROM acc_payment_vouchers WHERE voucher_number = 'PV-2026-0001'"))).scalar_one_or_none()
        if not existing_pv1:
            # Post Double Entry GL Voucher
            gl_v1 = Voucher(
                organization_id=1,
                voucher_number="BP-2026-0025",
                voucher_type="Bank_Payment",
                voucher_date=date.today(),
                narration="Office utility and supplies expense paid directly via Corporate Bank Account",
                total_debit_amount=Decimal("25000.00"),
                total_credit_amount=Decimal("25000.00"),
                status="Posted"
            )
            session.add(gl_v1)
            await session.flush()

            # Debit: Office Expense (5200) ৳25,000
            session.add(JournalEntry(
                voucher_id=gl_v1.id,
                voucher_date=gl_v1.voucher_date,
                account_id=acc_office_exp.id,
                debit_amount=Decimal("25000.00"),
                credit_amount=Decimal("0.00"),
                narration="Office administration expenses - March"
            ))
            # Credit: Bank Account (1110) ৳25,000
            session.add(JournalEntry(
                voucher_id=gl_v1.id,
                voucher_date=gl_v1.voucher_date,
                account_id=acc_bank.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("25000.00"),
                narration="Paid via Bank Account"
            ))

            await session.execute(text("""
            INSERT INTO acc_payment_vouchers (
                organization_id, branch_name, voucher_number, voucher_date,
                payee_type, payee_name, payment_method, source_type,
                bank_account_id, amount, currency, debit_category,
                debit_account_id, credit_account_id, purpose, narration,
                status, settlement_status, settlement_date, is_reconciled,
                prepared_at, checked_at, approved_at, disbursed_at, gl_voucher_id
            ) VALUES (
                1, 'Head Office Corporate', 'PV-2026-0001', CURRENT_DATE,
                'Utility', 'Dhaka Office Supplies & Logistics', 'Bank_Transfer', 'Bank_Account',
                :bank_id, 25000.00, 'BDT', 'Expense',
                :debit_acc_id, :credit_acc_id,
                'Monthly head office stationery, printer cartridges and administrative supplies',
                'Approved by Executive Director. Paid directly via Corporate Bank Account.',
                'Disbursed', 'Settled', CURRENT_DATE, TRUE,
                NOW(), NOW(), NOW(), NOW(), :gl_v_id
            )
            """), {
                "bank_id": bank_id,
                "debit_acc_id": acc_office_exp.id,
                "credit_acc_id": acc_bank.id,
                "gl_v_id": gl_v1.id
            })
            await session.commit()
            logger.info("Example 1 (Direct Expense ৳25,000) seeded successfully!")

        # Example 2: Payable Liquidation Paid by Bank (Prevents Double Expense)
        # Debit: Supplier Payables (2100) = ৳150,000, Credit: Bank Account (1110) = ৳150,000
        logger.info("Step 5: Seeding Example 2 - Supplier Payable Settlement (Liquidates AP, prevents double expense)...")
        existing_pv2 = (await session.execute(text("SELECT id FROM acc_payment_vouchers WHERE voucher_number = 'PV-2026-0002'"))).scalar_one_or_none()
        if not existing_pv2:
            gl_v2 = Voucher(
                organization_id=1,
                voucher_number="BP-2026-0026",
                voucher_type="Bank_Payment",
                voucher_date=date.today() - timedelta(days=2),
                narration="Payment against approved supplier invoice: Liquidate Payable without double expense",
                total_debit_amount=Decimal("150000.00"),
                total_credit_amount=Decimal("150000.00"),
                status="Posted"
            )
            session.add(gl_v2)
            await session.flush()

            # Debit: Supplier Payables (2100) ৳150,000
            session.add(JournalEntry(
                voucher_id=gl_v2.id,
                voucher_date=gl_v2.voucher_date,
                account_id=acc_payable.id,
                debit_amount=Decimal("150000.00"),
                credit_amount=Decimal("0.00"),
                narration="Debit Supplier Payables - Liquidate AP Bill"
            ))
            # Credit: Bank Account (1110) ৳150,000
            session.add(JournalEntry(
                voucher_id=gl_v2.id,
                voucher_date=gl_v2.voucher_date,
                account_id=acc_bank.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("150000.00"),
                narration="Disbursed via Account Payee Cheque # CQ-1005"
            ))

            await session.execute(text("""
            INSERT INTO acc_payment_vouchers (
                organization_id, branch_name, voucher_number, voucher_date,
                payee_type, payee_name, payment_method, source_type,
                bank_account_id, amount, currency, debit_category,
                debit_account_id, credit_account_id, supporting_invoice_ref,
                purpose, narration, status, cheque_number, cheque_date,
                cheque_status, settlement_status, settlement_date, is_reconciled,
                prepared_at, checked_at, approved_at, disbursed_at, gl_voucher_id
            ) VALUES (
                1, 'Head Office Corporate', 'PV-2026-0002', CURRENT_DATE - INTERVAL 2 DAY,
                'Supplier', 'BSRM Steels Limited', 'Bank_Cheque', 'Bank_Account',
                :bank_id, 150000.00, 'BDT', 'Payable',
                :debit_acc_id, :credit_acc_id, 'INV-BSRM-8890',
                'Settlement of 500W Grade Deformed Rebar invoice - Liquidates Accounts Payable (Prevents duplicate expense recognition)',
                'Cheque issued under signature authority. Cleared in automated NPSC clearing.',
                'Disbursed', 'CQ-1005', CURRENT_DATE - INTERVAL 2 DAY,
                'Cleared', 'Settled', CURRENT_DATE - INTERVAL 1 DAY, TRUE,
                NOW(), NOW(), NOW(), NOW(), :gl_v_id
            )
            """), {
                "bank_id": bank_id,
                "debit_acc_id": acc_payable.id,
                "credit_acc_id": acc_bank.id,
                "gl_v_id": gl_v2.id
            })
            await session.commit()
            logger.info("Example 2 (Payable Settlement ৳150,000) seeded successfully!")

        logger.info("Payment Vouchers Database Migration & Seeding Finished Successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_payment_vouchers())
