"""
Migration and Seeding script for Cash, Bank & Mobile Financial Services (MFS) Module.
Creates tables:
1. acc_cash_boxes: Multiple cashboxes and office/site funds
2. acc_petty_cash_vouchers: Petty cash disbursements, expense claims, cash counts & shortages
3. acc_bank_accounts: Multiple bank accounts with masked account numbers, routing info, and cheque books
4. acc_bank_transactions: Bank deposits, withdrawals, transfers, cheques, bank charges, and interest
5. acc_mfs_providers: Configurable MFS providers (bKash, Nagad, Rocket, Upay)
6. acc_mfs_transactions: MFS gross collections, provider fee deductions, net bank settlement, batching, and reversals

Seeds dynamic lookups:
- CASHBOX_TYPE
- CASH_TRANSACTION_TYPE
- BANK_ACCOUNT_TYPE
- BANK_TRANSACTION_TYPE
- MFS_PROVIDER_CODE
- MFS_ACCOUNT_TYPE
- MFS_TRANSACTION_STATUS

Seeds initial sample cashboxes, bank accounts, MFS setups, and the user's specific ৳100,000 MFS transaction example.
"""
import sys
import os
import asyncio
import logging
from datetime import date, datetime, timedelta
from sqlalchemy import text, select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS acc_cash_boxes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    box_code VARCHAR(32) NOT NULL UNIQUE,
    box_name VARCHAR(128) NOT NULL,
    cashbox_type VARCHAR(32) NOT NULL DEFAULT 'Head_Office',
    project_id BIGINT NULL,
    account_id BIGINT NULL,
    custodian_user_id BIGINT NULL,
    imprest_limit DECIMAL(16, 2) NOT NULL DEFAULT 50000.00,
    replenishment_threshold DECIMAL(16, 2) NOT NULL DEFAULT 10000.00,
    current_balance DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE SET NULL,
    FOREIGN KEY (account_id) REFERENCES acc_chart_of_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (custodian_user_id) REFERENCES sys_users(id) ON DELETE SET NULL,
    INDEX idx_cb_code (box_code),
    INDEX idx_cb_type (cashbox_type),
    INDEX idx_cb_proj (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acc_petty_cash_vouchers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    voucher_number VARCHAR(64) NOT NULL UNIQUE,
    cash_box_id BIGINT NOT NULL,
    project_id BIGINT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(32) NOT NULL DEFAULT 'Disbursement',
    amount DECIMAL(16, 2) NOT NULL,
    payee_name VARCHAR(128) NOT NULL,
    expense_account_id BIGINT NULL,
    cost_center_id BIGINT NULL,
    purpose TEXT NOT NULL,
    supporting_receipt_ref VARCHAR(128) NULL,
    cash_count_system DECIMAL(16, 2) NULL,
    cash_count_physical DECIMAL(16, 2) NULL,
    variance_amount DECIMAL(16, 2) NULL DEFAULT 0.00,
    gl_voucher_id BIGINT NULL,
    approved_by_user_id BIGINT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (cash_box_id) REFERENCES acc_cash_boxes(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE SET NULL,
    FOREIGN KEY (expense_account_id) REFERENCES acc_chart_of_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (cost_center_id) REFERENCES acc_cost_centers(id) ON DELETE SET NULL,
    FOREIGN KEY (gl_voucher_id) REFERENCES acc_vouchers(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_user_id) REFERENCES sys_users(id) ON DELETE SET NULL,
    INDEX idx_pcv_num (voucher_number),
    INDEX idx_pcv_box (cash_box_id),
    INDEX idx_pcv_date (transaction_date),
    INDEX idx_pcv_type (transaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acc_bank_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    project_id BIGINT NULL,
    bank_name VARCHAR(128) NOT NULL,
    branch_name VARCHAR(128) NOT NULL,
    account_name VARCHAR(128) NOT NULL,
    account_number_encrypted VARCHAR(255) NOT NULL,
    account_number_masked VARCHAR(64) NOT NULL,
    routing_number VARCHAR(32) NOT NULL,
    swift_code VARCHAR(32) NULL,
    account_type VARCHAR(32) NOT NULL DEFAULT 'Current_Account',
    currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
    account_id BIGINT NULL,
    opening_balance DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    current_balance DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    is_escrow BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    cheque_prefix VARCHAR(16) NULL,
    active_cheque_start BIGINT NULL,
    active_cheque_end BIGINT NULL,
    last_used_cheque_no BIGINT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE SET NULL,
    FOREIGN KEY (account_id) REFERENCES acc_chart_of_accounts(id) ON DELETE SET NULL,
    INDEX idx_ba_bank (bank_name),
    INDEX idx_ba_proj (project_id),
    INDEX idx_ba_type (account_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acc_bank_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    bank_account_id BIGINT NOT NULL,
    project_id BIGINT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(32) NOT NULL DEFAULT 'Deposit',
    amount DECIMAL(16, 2) NOT NULL,
    cheque_number VARCHAR(64) NULL,
    cheque_date DATE NULL,
    cheque_status VARCHAR(32) NULL,
    contra_account_id BIGINT NULL,
    reference_number VARCHAR(128) NULL,
    particulars TEXT NOT NULL,
    gl_voucher_id BIGINT NULL,
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'Cleared',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (bank_account_id) REFERENCES acc_bank_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE SET NULL,
    FOREIGN KEY (contra_account_id) REFERENCES acc_chart_of_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (gl_voucher_id) REFERENCES acc_vouchers(id) ON DELETE SET NULL,
    INDEX idx_bt_bank (bank_account_id),
    INDEX idx_bt_date (transaction_date),
    INDEX idx_bt_type (transaction_type),
    INDEX idx_bt_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acc_mfs_providers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    provider_code VARCHAR(32) NOT NULL UNIQUE,
    provider_name VARCHAR(64) NOT NULL,
    merchant_number VARCHAR(32) NOT NULL,
    account_type VARCHAR(32) NOT NULL DEFAULT 'Merchant_Wallet',
    fee_percentage DECIMAL(6, 3) NOT NULL DEFAULT 1.500,
    fee_flat_charge DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    settlement_bank_account_id BIGINT NULL,
    fee_expense_account_id BIGINT NULL,
    wallet_gl_account_id BIGINT NULL,
    daily_limit DECIMAL(16, 2) NOT NULL DEFAULT 5000000.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (settlement_bank_account_id) REFERENCES acc_bank_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (fee_expense_account_id) REFERENCES acc_chart_of_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (wallet_gl_account_id) REFERENCES acc_chart_of_accounts(id) ON DELETE SET NULL,
    INDEX idx_mfs_code (provider_code),
    INDEX idx_mfs_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acc_mfs_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    mfs_provider_id BIGINT NOT NULL,
    project_id BIGINT NULL,
    customer_id BIGINT NULL,
    invoice_id BIGINT NULL,
    transaction_id VARCHAR(128) NOT NULL,
    payment_reference VARCHAR(128) NULL,
    customer_phone VARCHAR(32) NOT NULL,
    gross_amount DECIMAL(16, 2) NOT NULL,
    fee_deducted DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    net_settlement_amount DECIMAL(16, 2) NOT NULL,
    settlement_batch_id VARCHAR(64) NULL,
    settlement_date DATE NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Success',
    callback_payload TEXT NULL,
    gl_voucher_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (mfs_provider_id) REFERENCES acc_mfs_providers(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE SET NULL,
    FOREIGN KEY (invoice_id) REFERENCES acc_ar_invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (gl_voucher_id) REFERENCES acc_vouchers(id) ON DELETE SET NULL,
    UNIQUE KEY uq_mfs_provider_trx (mfs_provider_id, transaction_id),
    INDEX idx_mt_trx (transaction_id),
    INDEX idx_mt_status (status),
    INDEX idx_mt_batch (settlement_batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

LOOKUP_SEEDS = [
    {
        "category_code": "CASHBOX_TYPE",
        "category_name": "Cash Box & Fund Types",
        "description": "Categories of cash holding funds and site boxes",
        "items": [
            ("Head_Office", "Head Office Central Cash", "প্রধান কার্যালয় কেন্দ্রীয় ক্যাশ", "#3B82F6", 1, True),
            ("Project_Site_Imprest", "Project Site Imprest Fund", "প্রকল্প সাইট ইমপ্রেস ফান্ড", "#10B981", 2, False),
            ("Petty_Cash", "Petty Cash Box", "পেটি ক্যাশ বক্স", "#8B5CF6", 3, False),
            ("Sales_Booth", "Sales Pavilion / Customer Booth", "সেলস প্যাভিলিয়ন ক্যাশ", "#F59E0B", 4, False),
            ("Regional_Office", "Regional Hub Cash Fund", "আঞ্চলিক কার্যালয় ফান্ড", "#06B6D4", 5, False)
        ]
    },
    {
        "category_code": "CASH_TRANSACTION_TYPE",
        "category_name": "Cash Transaction Types",
        "description": "Types of cash disbursements, replenishment and audits",
        "items": [
            ("Disbursement", "Petty Cash Expense Claim", "খরচ ভাউচার", "#EF4444", 1, True),
            ("Replenishment", "Fund Replenishment / Bank Cash Withdrawal", "তহবিল পুনঃপূরণ", "#10B981", 2, False),
            ("Transfer_Contra", "Fund Transfer Between Boxes", "তহবিল স্থানান্তর (কন্ট্রা)", "#3B82F6", 3, False),
            ("Shortage_Adjustment", "Physical Cash Shortage", "ক্যাশ ঘাটতি সমন্বয়", "#F59E0B", 4, False),
            ("Overage_Adjustment", "Physical Cash Overage", "ক্যাশ অতিরিক্ত সমন্বয়", "#8B5CF6", 5, False)
        ]
    },
    {
        "category_code": "BANK_ACCOUNT_TYPE",
        "category_name": "Bank Account Types",
        "description": "Types of commercial and escrow bank accounts",
        "items": [
            ("Current_Account", "Current Deposit (CD)", "চলতি হিসাব", "#3B82F6", 1, True),
            ("Savings_Account", "Savings Deposit (SB)", "সঞ্চয়ী হিসাব", "#10B981", 2, False),
            ("Escrow_Account", "Project Escrow Trust Account", "প্রকল্প এসক্রো হিসাব", "#8B5CF6", 3, False),
            ("SND_Account", "Special Notice Deposit (SND)", "বিশেষ নোটিশ জমা", "#F59E0B", 4, False),
            ("Fixed_Deposit_FDR", "Fixed Deposit Receipt (FDR)", "মেয়াদি আমানত", "#EC4899", 5, False)
        ]
    },
    {
        "category_code": "BANK_TRANSACTION_TYPE",
        "category_name": "Bank Transaction Types",
        "description": "Commercial bank transactions and service charges",
        "items": [
            ("Deposit", "Direct Bank Deposit", "ব্যাংক জমা", "#10B981", 1, True),
            ("Withdrawal", "Cash Withdrawal", "নগদ উত্তোলন", "#F59E0B", 2, False),
            ("Transfer_Contra", "Inter-Account Transfer (Contra)", "আন্তঃব্যাংক স্থানান্তর", "#3B82F6", 3, False),
            ("Cheque_Issued", "Cheque Disbursement / Issued", "চেক প্রদান", "#8B5CF6", 4, False),
            ("Cheque_Received", "Customer Cheque Clearing", "চেক জমা ও ক্লিয়ারিং", "#06B6D4", 5, False),
            ("Bank_Charges", "Bank Service Charge / Excise Duty", "ব্যাংক চার্জ ও আবগারি শুল্ক", "#EF4444", 6, False),
            ("Interest_Credit", "Bank Interest / Profit Earned", "ব্যাংক সুদ / মুনাফা প্রাপ্তি", "#10B981", 7, False)
        ]
    },
    {
        "category_code": "MFS_PROVIDER_CODE",
        "category_name": "MFS Gateway Providers",
        "description": "Configurable mobile financial service providers",
        "items": [
            ("BKASH", "bKash Merchant Payment", "বিকাশ মার্চেন্ট পেমেন্ট", "#E2136E", 1, True),
            ("NAGAD", "Nagad Business Gateway", "নগদ মার্চেন্ট গেটওয়ে", "#F7941E", 2, False),
            ("ROCKET", "DBBL Rocket Payment", "রকেট পেমেন্ট", "#8C3494", 3, False),
            ("UPAY", "Upay (UCB Fintech)", "উপায় ফিনটেক", "#00A651", 4, False)
        ]
    },
    {
        "category_code": "MFS_ACCOUNT_TYPE",
        "category_name": "MFS Wallet Types",
        "description": "Classification of MFS accounts",
        "items": [
            ("Merchant_Wallet", "Direct Merchant Account (API)", "মার্চেন্ট গেটওয়ে", "#3B82F6", 1, True),
            ("Agent_Wallet", "Corporate Agent Wallet", "এজেন্ট ওয়ালেট", "#10B981", 2, False),
            ("Personal_Retail", "Retail Personal Account", "পার্সোনাল অ্যাকাউন্ট", "#F59E0B", 3, False)
        ]
    },
    {
        "category_code": "MFS_TRANSACTION_STATUS",
        "category_name": "MFS Transaction Statuses",
        "description": "Lifecycle statuses of digital mobile collections",
        "items": [
            ("Initiated", "Payment Initiated / Pending Callback", "প্রক্রিয়াধীন", "#64748B", 1, True),
            ("Success", "Payment Verified & Succeeded", "সফল পেমেন্ট", "#10B981", 2, False),
            ("Settled", "Net Funds Settled to Bank", "ব্যাংকে নিষ্পত্তি হয়েছে", "#3B82F6", 3, False),
            ("Failed", "Transaction Failed / Cancelled", "ব্যর্থ লেনদেন", "#EF4444", 4, False),
            ("Reversed", "Transaction Reversed / Chargeback", "বাতিল / রিভার্সাল", "#F59E0B", 5, False),
            ("Refunded", "Refunded to Customer", "গ্রাহককে ফেরত", "#EC4899", 6, False)
        ]
    }
]

async def run_migration():
    logger.info("Starting Cash, Bank & MFS database migration...")
    async with AsyncSessionLocal() as session:
        # Step 1: Create Tables
        logger.info("Step 1: Creating database tables...")
        for stmt in CREATE_TABLES_SQL.strip().split(";"):
            clean_stmt = stmt.strip()
            if clean_stmt:
                try:
                    await session.execute(text(clean_stmt))
                    await session.commit()
                except Exception as e:
                    await session.rollback()
                    logger.warning(f"Notice on statement: {e}")

        # Step 2: Seed Lookups
        logger.info("Step 2: Seeding dynamic lookups...")
        for group in LOOKUP_SEEDS:
            cat_code = group["category_code"]
            cat_res = await session.execute(
                select(LookupCategory).where(LookupCategory.category_code == cat_code)
            )
            cat = cat_res.scalar_one_or_none()
            if not cat:
                cat = LookupCategory(
                    category_code=cat_code,
                    category_name=group["category_name"],
                    description=group["description"],
                    is_system_locked=True
                )
                session.add(cat)
                await session.flush()
            cat_id = cat.id

            for item_code, label_en, label_bn, color, order, is_def in group["items"]:
                item_res = await session.execute(
                    select(LookupItem).where(
                        LookupItem.category_id == cat_id,
                        LookupItem.item_code == item_code
                    )
                )
                item = item_res.scalar_one_or_none()
                if not item:
                    item = LookupItem(
                        category_id=cat_id,
                        item_code=item_code,
                        item_name_en=label_en,
                        item_name_bn=label_bn,
                        color_badge=color,
                        sort_order=order,
                        is_default=is_def,
                        is_active=True
                    )
                    session.add(item)
        await session.commit()

        # Step 3: Ensure General Ledger Accounts exist for MFS Fees, Petty Cash, and Bank
        logger.info("Step 3: Ensuring GL accounts exist for MFS Gateway Fees (5320) & Site Cash...")
        # Check Account 5320 (MFS Gateway & Processing Fees)
        acc_fee = (await session.execute(text("SELECT id FROM acc_chart_of_accounts WHERE account_code = '5320'"))).scalar()
        if not acc_fee:
            await session.execute(text("""
                INSERT INTO acc_chart_of_accounts (
                    organization_id, account_code, account_name_en, account_name_bn,
                    account_type, level, is_group, is_leaf_account, currency, normal_balance, is_active
                ) VALUES (
                    1, '5320', 'MFS Gateway & Online Processing Fees', 'এমএফএস ও ডিজিটাল পেমেন্ট গেটওয়ে চার্জ',
                    'Expense', 5, 0, 1, 'BDT', 'Debit', 1
                )
            """))
            await session.commit()

        # Check Account 1115 (Project Site Petty Cash & Imprest)
        acc_site_cash = (await session.execute(text("SELECT id FROM acc_chart_of_accounts WHERE account_code = '1115'"))).scalar()
        if not acc_site_cash:
            await session.execute(text("""
                INSERT INTO acc_chart_of_accounts (
                    organization_id, account_code, account_name_en, account_name_bn,
                    account_type, level, is_group, is_leaf_account, currency, normal_balance, is_active
                ) VALUES (
                    1, '1115', 'Project Site Petty Cash & Imprest Funds', 'প্রকল্প সাইট পেটি ক্যাশ ও ইমপ্রেস ফান্ড',
                    'Asset', 5, 0, 1, 'BDT', 'Debit', 1
                )
            """))
            await session.commit()

        # Step 4: Seed Sample Cashboxes
        logger.info("Step 4: Seeding sample cashboxes...")
        cb_count = (await session.execute(text("SELECT COUNT(*) FROM acc_cash_boxes"))).scalar()
        if cb_count == 0:
            proj_id = (await session.execute(text("SELECT id FROM prj_projects LIMIT 1"))).scalar()
            await session.execute(text("""
                INSERT INTO acc_cash_boxes (
                    organization_id, box_code, box_name, cashbox_type, project_id,
                    imprest_limit, replenishment_threshold, current_balance, status, notes
                ) VALUES 
                (1, 'CB-HO-01', 'Head Office Central Cash Box', 'Head_Office', NULL, 200000.00, 50000.00, 145000.00, 'Active', 'Central corporate cash vault in Dhaka HQ'),
                (1, 'CB-SITE-TWA', 'Tower A Site Imprest Fund', 'Project_Site_Imprest', :pid, 50000.00, 15000.00, 32500.00, 'Active', 'Site civil works daily petty expenses fund'),
                (1, 'CB-PAV-01', 'Sales Pavilion Cash Register', 'Sales_Booth', :pid, 30000.00, 10000.00, 18000.00, 'Active', 'Customer booking token money reception counter')
            """), {"pid": proj_id})
            await session.commit()

        # Step 5: Seed Sample Bank Accounts with Masked Numbers & Cheque Books
        logger.info("Step 5: Seeding sample bank accounts...")
        ba_count = (await session.execute(text("SELECT COUNT(*) FROM acc_bank_accounts"))).scalar()
        if ba_count == 0:
            proj_id = (await session.execute(text("SELECT id FROM prj_projects LIMIT 1"))).scalar()
            await session.execute(text("""
                INSERT INTO acc_bank_accounts (
                    organization_id, project_id, bank_name, branch_name, account_name,
                    account_number_encrypted, account_number_masked, routing_number, swift_code,
                    account_type, currency, opening_balance, current_balance, is_escrow, is_active,
                    cheque_prefix, active_cheque_start, active_cheque_end, last_used_cheque_no, notes
                ) VALUES 
                (1, NULL, 'Dutch-Bangla Bank PLC', 'Gulshan Branch, Dhaka', 'BlueOceans Real Estate Ltd',
                 'ENC_DBBL_991823001', '******23001', '090271891', 'DBBLBDDH',
                 'Current_Account', 'BDT', 5000000.00, 8450000.00, 0, 1,
                 'CQ-DBBL-', 1001, 1100, 1024, 'Main operational disbursement current account'),
                (1, :pid, 'City Bank PLC', 'Principal Branch, Motijheel', 'BlueOceans Tower A Escrow Trust',
                 'ENC_CBL_772019482', '******9482', '225270144', 'CIBLBDDH',
                 'Escrow_Account', 'BDT', 10000000.00, 14200000.00, 1, 1,
                 'CQ-CITY-', 5001, 5100, 5012, 'Project customer collection Escrow account under RAJUK compliance'),
                (1, NULL, 'BRAC Bank PLC', 'Banani Branch, Dhaka', 'BlueOceans Operational SND Fund',
                 'ENC_BBL_551029481', '******9481', '060271299', 'BRAKBDDH',
                 'SND_Account', 'BDT', 2500000.00, 3120000.00, 0, 1,
                 'CQ-BBL-', 2001, 2100, 2005, 'Special notice deposit account earning interest yield')
            """), {"pid": proj_id})
            await session.commit()

        # Step 6: Seed Configurable MFS Providers (bKash, Nagad, Rocket)
        logger.info("Step 6: Seeding MFS providers...")
        mfs_count = (await session.execute(text("SELECT COUNT(*) FROM acc_mfs_providers"))).scalar()
        if mfs_count == 0:
            dbbl_ba_id = (await session.execute(text("SELECT id FROM acc_bank_accounts WHERE bank_name LIKE '%Dutch-Bangla%' LIMIT 1"))).scalar()
            await session.execute(text("""
                INSERT INTO acc_mfs_providers (
                    organization_id, provider_code, provider_name, merchant_number, account_type,
                    fee_percentage, fee_flat_charge, settlement_bank_account_id, is_active, notes
                ) VALUES 
                (1, 'BKASH', 'bKash Merchant Payment Gateway', '01700998811', 'Merchant_Wallet', 1.500, 0.00, :bid, 1, 'bKash online checkout & dynamic QR merchant collection (1.5% fee)'),
                (1, 'NAGAD', 'Nagad Business Gateway', '01900112233', 'Merchant_Wallet', 1.200, 0.00, :bid, 1, 'Nagad digital payment gateway with daily T+1 settlement (1.2% fee)'),
                (1, 'ROCKET', 'DBBL Rocket Corporate Channel', '01800554422', 'Agent_Wallet', 1.000, 0.00, :bid, 1, 'Direct Dutch-Bangla Rocket payment channel')
            """), {"bid": dbbl_ba_id})
            await session.commit()

        # Step 7: Seed User's Exact Specified ৳100,000 MFS Transaction Example with ৳1,500 Fee and ৳98,500 Settlement
        logger.info("Step 7: Seeding user's exact MFS transaction example...")
        tx_check = (await session.execute(text("SELECT COUNT(*) FROM acc_mfs_transactions WHERE transaction_id = 'BL-TX-2026-001'"))).scalar()
        if tx_check == 0:
            bkash_id = (await session.execute(text("SELECT id FROM acc_mfs_providers WHERE provider_code = 'BKASH' LIMIT 1"))).scalar()
            cust_id = (await session.execute(text("SELECT id FROM crm_customers LIMIT 1"))).scalar()
            proj_id = (await session.execute(text("SELECT id FROM prj_projects LIMIT 1"))).scalar()
            inv_id = (await session.execute(text("SELECT id FROM acc_ar_invoices LIMIT 1"))).scalar()

            # Create the 3-line GL Voucher for the MFS Settlement:
            # - Net Settlement Bank (1110/1120): ৳98,500 (Debit)
            # - MFS Processing Fee Expense (5320): ৳1,500 (Debit)
            # - Customer Receivables / Settlement (1130): ৳100,000 (Credit)
            v_res = await session.execute(text("""
                INSERT INTO acc_vouchers (
                    organization_id, project_id, voucher_number, voucher_type, voucher_date,
                    narration, total_debit_amount, total_credit_amount, status, source_document_type
                ) VALUES (
                    1, :pid, 'BR-MFS-2026-001', 'Bank_Receipt', CURRENT_DATE,
                    'bKash Customer Settlement: Gross BDT 100,000, Gateway Fee BDT 1,500, Net Settlement BDT 98,500',
                    100000.00, 100000.00, 'Posted', 'MFS_Collection'
                )
            """), {"pid": proj_id})
            v_id = v_res.lastrowid

            # Post Journal Entries
            # 1. Debit Bank (98,500)
            bank_acc_id = (await session.execute(text("SELECT id FROM acc_chart_of_accounts WHERE account_code IN ('1110', '1120') LIMIT 1"))).scalar() or 1
            fee_acc_id = (await session.execute(text("SELECT id FROM acc_chart_of_accounts WHERE account_code = '5320' LIMIT 1"))).scalar() or 1
            ar_acc_id = (await session.execute(text("SELECT id FROM acc_chart_of_accounts WHERE account_code = '1130' LIMIT 1"))).scalar() or 1

            await session.execute(text("""
                INSERT INTO acc_journal_entries (voucher_id, voucher_date, project_id, account_id, debit_amount, credit_amount, narration)
                VALUES 
                (:vid, CURRENT_DATE, :pid, :bid, 98500.00, 0.00, 'Net bank settlement from bKash (TrxID: BL-TX-2026-001)'),
                (:vid, CURRENT_DATE, :pid, :fid, 1500.00, 0.00, 'bKash merchant processing fee (1.5%) on BDT 100,000 collection'),
                (:vid, CURRENT_DATE, :pid, :aid, 0.00, 100000.00, 'Customer settlement credit: TrxID BL-TX-2026-001')
            """), {"vid": v_id, "pid": proj_id, "bid": bank_acc_id, "fid": fee_acc_id, "aid": ar_acc_id})

            # Record MFS Transaction row
            await session.execute(text("""
                INSERT INTO acc_mfs_transactions (
                    organization_id, mfs_provider_id, project_id, customer_id, invoice_id,
                    transaction_id, payment_reference, customer_phone, gross_amount, fee_deducted,
                    net_settlement_amount, settlement_batch_id, settlement_date, status, gl_voucher_id
                ) VALUES (
                    1, :mpid, :pid, :cid, :iid,
                    'BL-TX-2026-001', 'BOOK-TWA-102', '01711223344', 100000.00, 1500.00,
                    98500.00, 'SETTLE-20260415-01', CURRENT_DATE, 'Settled', :vid
                )
            """), {
                "mpid": bkash_id, "pid": proj_id, "cid": cust_id, "iid": inv_id, "vid": v_id
            })

            # Also seed a petty cash voucher showing physical cash count with shortage reporting
            cb_site_id = (await session.execute(text("SELECT id FROM acc_cash_boxes WHERE box_code = 'CB-SITE-TWA' LIMIT 1"))).scalar()
            if cb_site_id:
                await session.execute(text("""
                    INSERT INTO acc_petty_cash_vouchers (
                        organization_id, voucher_number, cash_box_id, project_id, transaction_date,
                        transaction_type, amount, payee_name, purpose, supporting_receipt_ref,
                        cash_count_system, cash_count_physical, variance_amount, status
                    ) VALUES (
                        1, 'PCV-2026-001', :cbid, :pid, CURRENT_DATE,
                        'Shortage_Adjustment', 500.00, 'Site Custodian Audit',
                        'Daily physical cash count discrepancy reconciliation. System balance ৳33,000, physical cash ৳32,500.',
                        'AUDIT-REC-001', 33000.00, 32500.00, -500.00, 'Approved'
                    )
                """), {"cbid": cb_site_id, "pid": proj_id})

            await session.commit()
            logger.info("Sample MFS transaction & petty cash audit seeded successfully!")

    logger.info("Cash, Bank & MFS database migration finished successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
