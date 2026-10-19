"""
Migration and Seeding script for Accounts Receivable (AR) Module.
Creates tables:
1. acc_ar_invoices: Demand notices, installment invoices, service charges, commercial rentals
2. acc_ar_receipts: Money receipts, bank transfers, cheques, unallocated cash tracking
3. acc_ar_adjustments: Credit notes, late fee waivers, penalty debits, dispute write-offs

Seeds dynamic lookups:
- AR_INVOICE_TYPE
- AR_INVOICE_STATUS
- AR_COLLECTION_METHOD
- AR_ADJUSTMENT_TYPE
- AR_FOLLOWUP_STATUS

Seeds initial sample AR customer invoices, installment demands, and receipts across aging buckets.
"""
import sys
import os
import asyncio
import logging
from datetime import date, timedelta
from sqlalchemy import text, select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LOOKUP_SEEDS = [
    {
        "category_code": "AR_INVOICE_TYPE",
        "category_name": "Accounts Receivable Demand Types",
        "description": "Categories of receivable demand notices and customer invoices",
        "items": [
            ("Installment_Demand", "Construction Milestone Installment", "নির্মাণ কিস্তি দাবি", "#3B82F6", 1, True),
            ("Booking_Money", "Booking Money & Initial Token", "বুকিং মানি দাবি", "#10B981", 2, False),
            ("Down_Payment", "Allotted Down Payment Demand", "ডাউন পেমেন্ট দাবি", "#8B5CF6", 3, False),
            ("Utility_Connection", "Utility, Gas & Electricity Connection", "ইউটিলিটি ও বিদ্যুৎ সংযোগ বিল", "#F59E0B", 4, False),
            ("Service_Charge", "Building Maintenance & Service Charge", "সার্ভিস ও রক্ষণাবেক্ষণ চার্জ", "#06B6D4", 5, False),
            ("Rental_Commercial", "Commercial Unit / Retail Space Rental", "বাণিজ্যিক স্পেস ভাড়া বিল", "#EC4899", 6, False),
            ("Late_Charge", "Contractual Late Fee / Interest Penalty", "চুক্তিভিত্তিক বিলম্ব চার্জ", "#EF4444", 7, False),
            ("Other", "Other Customer Receivables", "অন্যান্য প্রাপ্য বিল", "#64748B", 8, False)
        ]
    },
    {
        "category_code": "AR_INVOICE_STATUS",
        "category_name": "AR Demand Notice Statuses",
        "description": "Lifecycle stages of receivable demand notices",
        "items": [
            ("Draft", "Draft Demand Notice", "খসড়া নোটিশ", "#64748B", 1, True),
            ("Issued", "Issued & Sent to Customer", "প্রেরিত নোটিশ", "#3B82F6", 2, False),
            ("Partially_Collected", "Partially Collected", "আংশিক আদায়কৃত", "#F59E0B", 3, False),
            ("Collected", "Fully Collected & Settled", "সম্পূর্ণ আদায়কৃত", "#10B981", 4, False),
            ("Disputed", "Disputed by Buyer", "বিতর্কিত বিল", "#EC4899", 5, False),
            ("Written_Off", "Bad Debt Written Off", "অনাদায়ী অবলোপন", "#EF4444", 6, False),
            ("Cancelled", "Cancelled / Void", "বাতিলকৃত", "#94A3B8", 7, False)
        ]
    },
    {
        "category_code": "AR_COLLECTION_METHOD",
        "category_name": "AR Collection Methods",
        "description": "Payment instrument for customer receipts",
        "items": [
            ("Bank_Transfer", "Bank Transfer (BEFTN / RTGS / NPSB)", "ব্যাংক ট্রান্সফার", "#3B82F6", 1, True),
            ("Bank_Cheque", "Account Payee Cheque / Clearing", "চেক / ক্লিয়ারিং", "#10B981", 2, False),
            ("Pay_Order", "Bank Pay Order / Banker's Cheque", "ব্যাংক পে-অর্ডার", "#8B5CF6", 3, False),
            ("Cash", "Cash Deposit Receipt", "নগদ জমা", "#F59E0B", 4, False),
            ("Card_POS", "Credit / Debit Card POS", "কার্ড পস", "#06B6D4", 5, False),
            ("Digital_Wallet", "MFS (bKash / Nagad / Upay)", "ডিজিটাল ওয়ালেট / বিকাশ", "#EC4899", 6, False)
        ]
    },
    {
        "category_code": "AR_ADJUSTMENT_TYPE",
        "category_name": "AR Adjustment & Note Types",
        "description": "Credit and debit notes for receivable balances",
        "items": [
            ("Credit_Note", "Credit Note (Discount / Reduction)", "ক্রেডিট নোট (ছাড়)", "#10B981", 1, True),
            ("Late_Fee_Waiver", "Late Fee / Interest Penalty Waiver", "বিলম্ব ফি মওকুফ", "#3B82F6", 2, False),
            ("Debit_Note_Penalty", "Debit Note (Additional Surcharge)", "ডেবিট নোট (অতিরিক্ত চার্জ)", "#F59E0B", 3, False),
            ("Dispute_Settlement", "Dispute Resolution Adjustment", "বিরোধ নিষ্পত্তি সমন্বয়", "#8B5CF6", 4, False),
            ("Write_Off", "Bad Debt Write-Off", "অবলোপন", "#EF4444", 5, False)
        ]
    },
    {
        "category_code": "AR_FOLLOWUP_STATUS",
        "category_name": "AR Collection Follow-up Statuses",
        "description": "Follow-up tracking stages for overdue collections",
        "items": [
            ("Not_Contacted", "Not Yet Contacted", "যোগাযোগ করা হয়নি", "#64748B", 1, True),
            ("Reminder_Sent", "Reminder SMS / Email Sent", "স্মারক পাঠানো হয়েছে", "#3B82F6", 2, False),
            ("Promise_To_Pay", "Promise to Pay (PTP)", "পরিশোধের প্রতিশ্রুতি", "#F59E0B", 3, False),
            ("Cheque_In_Hand", "Cheque In Vault / Awaiting Date", "চেক জমা আছে", "#8B5CF6", 4, False),
            ("Disputed", "Under Customer Dispute", "গ্রাহক বিরোধাধীন", "#EC4899", 5, False),
            ("Legal_Notice", "Legal Notice Dispatched", "আইনি নোটিশ প্রেরিত", "#EF4444", 6, False)
        ]
    }
]

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS acc_ar_invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    invoice_number VARCHAR(64) NOT NULL UNIQUE,
    invoice_type VARCHAR(32) NOT NULL DEFAULT 'Installment_Demand',
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    customer_id BIGINT NULL,
    customer_name VARCHAR(128) NOT NULL,
    booking_id BIGINT NULL,
    project_id BIGINT NULL,
    unit_id BIGINT NULL,
    receivable_account_id BIGINT NULL,
    revenue_account_id BIGINT NULL,
    gross_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    late_fee_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    net_receivable_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    collected_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    balance_due DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'Issued',
    collection_followup_status VARCHAR(64) NOT NULL DEFAULT 'Not_Contacted',
    followup_notes TEXT NULL,
    description TEXT NULL,
    voucher_id BIGINT NULL,
    created_by_user_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ar_inv_num (invoice_number),
    INDEX idx_ar_inv_date (invoice_date),
    INDEX idx_ar_due_date (due_date),
    INDEX idx_ar_cust_id (customer_id),
    INDEX idx_ar_status (status),
    INDEX idx_ar_proj_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acc_ar_receipts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    receipt_number VARCHAR(64) NOT NULL UNIQUE,
    receipt_date DATE NOT NULL,
    invoice_id BIGINT NULL,
    customer_id BIGINT NOT NULL,
    booking_id BIGINT NULL,
    project_id BIGINT NULL,
    amount DECIMAL(16, 2) NOT NULL,
    allocated_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    unallocated_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    collection_method VARCHAR(32) NOT NULL DEFAULT 'Bank_Transfer',
    bank_account_id BIGINT NULL,
    bank_name VARCHAR(128) NULL,
    cheque_number VARCHAR(64) NULL,
    cheque_date DATE NULL,
    transaction_reference VARCHAR(128) NULL,
    voucher_id BIGINT NULL,
    notes TEXT NULL,
    created_by_user_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ar_rcpt_num (receipt_number),
    INDEX idx_ar_rcpt_date (receipt_date),
    INDEX idx_ar_rcpt_cust (customer_id),
    INDEX idx_ar_rcpt_inv (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acc_ar_adjustments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL DEFAULT 1,
    adjustment_number VARCHAR(64) NOT NULL UNIQUE,
    adjustment_type VARCHAR(32) NOT NULL DEFAULT 'Credit_Note',
    adjustment_date DATE NOT NULL,
    invoice_id BIGINT NULL,
    customer_id BIGINT NOT NULL,
    amount DECIMAL(16, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    voucher_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ar_adj_num (adjustment_number),
    INDEX idx_ar_adj_cust (customer_id),
    INDEX idx_ar_adj_inv (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""


async def run_migration():
    async with AsyncSessionLocal() as session:
        logger.info("Step 1: Creating Accounts Receivable (AR) tables...")
        for stmt in CREATE_TABLES_SQL.strip().split(";"):
            clean_stmt = stmt.strip()
            if clean_stmt:
                await session.execute(text(clean_stmt))
        await session.commit()
        logger.info("AR tables created successfully.")

        logger.info("Step 2: Seeding dynamic lookups for Accounts Receivable...")
        for group in LOOKUP_SEEDS:
            cat_code = group["category_code"]
            existing_cat = (await session.execute(
                select(LookupCategory).where(LookupCategory.category_code == cat_code)
            )).scalar_one_or_none()

            if not existing_cat:
                cat = LookupCategory(
                    category_code=cat_code,
                    category_name=group["category_name"],
                    description=group["description"],
                    is_system_locked=True
                )
                session.add(cat)
                await session.flush()
                cat_id = cat.id
            else:
                cat_id = existing_cat.id

            for item_code, label_en, label_bn, color, order, is_def in group["items"]:
                existing_item = (await session.execute(
                    select(LookupItem).where(
                        LookupItem.category_id == cat_id,
                        LookupItem.item_code == item_code
                    )
                )).scalar_one_or_none()

                if not existing_item:
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
        logger.info("Dynamic lookups for AR seeded.")

        logger.info("Step 3: Checking existing customers and projects for sample data...")
        cust_row = (await session.execute(text("SELECT id, full_name_en FROM crm_customers LIMIT 3"))).fetchall()
        proj_row = (await session.execute(text("SELECT id, project_name FROM prj_projects LIMIT 3"))).fetchall()
        ar_acc = (await session.execute(text("SELECT id FROM acc_chart_of_accounts WHERE account_code = '1130' LIMIT 1"))).scalar() or 1
        rev_acc = (await session.execute(text("SELECT id FROM acc_chart_of_accounts WHERE account_code IN ('4100', '2140') LIMIT 1"))).scalar() or 4
        bank_acc = (await session.execute(text("SELECT id FROM acc_chart_of_accounts WHERE account_code = '1110' LIMIT 1"))).scalar() or 1

        cust1_id = cust_row[0][0] if cust_row else 1
        cust1_name = cust_row[0][1] if cust_row else "Engr. Tanvir Ahmed"
        cust2_id = cust_row[1][0] if len(cust_row) > 1 else cust1_id
        cust2_name = cust_row[1][1] if len(cust_row) > 1 else "Mrs. Farhana Yasmin"
        
        proj1_id = proj_row[0][0] if proj_row else 1
        proj2_id = proj_row[1][0] if len(proj_row) > 1 else proj1_id

        # Check if invoices already exist
        existing_count = (await session.execute(text("SELECT COUNT(*) FROM acc_ar_invoices"))).scalar()
        if existing_count == 0:
            logger.info("Seeding realistic AR demand notices across aging buckets...")
            today = date.today()

            # 1. Current / Not Yet Due (Due in 15 days)
            inv1_num = f"DN-{today.year}-001"
            await session.execute(text("""
                INSERT INTO acc_ar_invoices (
                    organization_id, invoice_number, invoice_type, invoice_date, due_date,
                    customer_id, customer_name, project_id, receivable_account_id, revenue_account_id,
                    gross_amount, late_fee_amount, discount_amount, net_receivable_amount,
                    collected_amount, balance_due, status, collection_followup_status,
                    description
                ) VALUES (
                    1, :num, 'Installment_Demand', :inv_date, :due_date,
                    :cust_id, :cust_name, :proj_id, :ar_acc, :rev_acc,
                    750000.00, 0.00, 0.00, 750000.00,
                    0.00, 750000.00, 'Issued', 'Not_Contacted',
                    '5th Casting Milestone Installment for Apt #7B'
                )
            """), {
                "num": inv1_num, "inv_date": today - timedelta(days=10),
                "due_date": today + timedelta(days=20), "cust_id": cust1_id,
                "cust_name": cust1_name, "proj_id": proj1_id,
                "ar_acc": ar_acc, "rev_acc": rev_acc
            })

            # 2. 1-30 Days Overdue (Due 14 days ago) - Partially Collected
            inv2_num = f"DN-{today.year}-002"
            res2 = await session.execute(text("""
                INSERT INTO acc_ar_invoices (
                    organization_id, invoice_number, invoice_type, invoice_date, due_date,
                    customer_id, customer_name, project_id, receivable_account_id, revenue_account_id,
                    gross_amount, late_fee_amount, discount_amount, net_receivable_amount,
                    collected_amount, balance_due, status, collection_followup_status,
                    description
                ) VALUES (
                    1, :num, 'Down_Payment', :inv_date, :due_date,
                    :cust_id, :cust_name, :proj_id, :ar_acc, :rev_acc,
                    1500000.00, 0.00, 0.00, 1500000.00,
                    1000000.00, 500000.00, 'Partially_Collected', 'Promise_To_Pay',
                    'Down Payment for Lakeview Heights Flat 4A'
                )
            """), {
                "num": inv2_num, "inv_date": today - timedelta(days=40),
                "due_date": today - timedelta(days=14), "cust_id": cust2_id,
                "cust_name": cust2_name, "proj_id": proj2_id,
                "ar_acc": ar_acc, "rev_acc": rev_acc
            })
            inv2_id = res2.lastrowid

            # Seed money receipt for inv2 partial collection
            await session.execute(text("""
                INSERT INTO acc_ar_receipts (
                    organization_id, receipt_number, receipt_date, invoice_id,
                    customer_id, project_id, amount, allocated_amount, unallocated_amount,
                    collection_method, bank_account_id, bank_name, cheque_number,
                    transaction_reference, notes
                ) VALUES (
                    1, :rcpt_num, :rcpt_date, :inv_id,
                    :cust_id, :proj_id, 1000000.00, 1000000.00, 0.00,
                    'Bank_Transfer', :bank_id, 'Eastern Bank Ltd', NULL,
                    'BEFTN-EBL-884920', 'Partial down payment collection'
                )
            """), {
                "rcpt_num": f"MR-{today.year}-001",
                "rcpt_date": today - timedelta(days=10),
                "inv_id": inv2_id,
                "cust_id": cust2_id,
                "proj_id": proj2_id,
                "bank_id": bank_acc
            })

            # 3. 31-60 Days Overdue (Due 45 days ago)
            inv3_num = f"DN-{today.year}-003"
            await session.execute(text("""
                INSERT INTO acc_ar_invoices (
                    organization_id, invoice_number, invoice_type, invoice_date, due_date,
                    customer_id, customer_name, project_id, receivable_account_id, revenue_account_id,
                    gross_amount, late_fee_amount, discount_amount, net_receivable_amount,
                    collected_amount, balance_due, status, collection_followup_status,
                    description
                ) VALUES (
                    1, :num, 'Installment_Demand', :inv_date, :due_date,
                    :cust_id, :cust_name, :proj_id, :ar_acc, :rev_acc,
                    600000.00, 15000.00, 0.00, 615000.00,
                    0.00, 615000.00, 'Issued', 'Reminder_Sent',
                    '3rd Floor Slab Casting Installment with 2.5% Late Charge'
                )
            """), {
                "num": inv3_num, "inv_date": today - timedelta(days=75),
                "due_date": today - timedelta(days=45), "cust_id": cust1_id,
                "cust_name": cust1_name, "proj_id": proj1_id,
                "ar_acc": ar_acc, "rev_acc": rev_acc
            })

            # 4. 61-90 Days Overdue (Due 75 days ago)
            inv4_num = f"DN-{today.year}-004"
            await session.execute(text("""
                INSERT INTO acc_ar_invoices (
                    organization_id, invoice_number, invoice_type, invoice_date, due_date,
                    customer_id, customer_name, project_id, receivable_account_id, revenue_account_id,
                    gross_amount, late_fee_amount, discount_amount, net_receivable_amount,
                    collected_amount, balance_due, status, collection_followup_status,
                    description
                ) VALUES (
                    1, :num, 'Utility_Connection', :inv_date, :due_date,
                    :cust_id, :cust_name, :proj_id, :ar_acc, :rev_acc,
                    250000.00, 5000.00, 0.00, 255000.00,
                    0.00, 255000.00, 'Issued', 'Cheque_In_Hand',
                    'DESCO / WASA utility substation connection fee'
                )
            """), {
                "num": inv4_num, "inv_date": today - timedelta(days=105),
                "due_date": today - timedelta(days=75), "cust_id": cust2_id,
                "cust_name": cust2_name, "proj_id": proj2_id,
                "ar_acc": ar_acc, "rev_acc": rev_acc
            })

            # 5. Over 90 Days Overdue (Due 110 days ago) - Disputed
            inv5_num = f"DN-{today.year}-005"
            await session.execute(text("""
                INSERT INTO acc_ar_invoices (
                    organization_id, invoice_number, invoice_type, invoice_date, due_date,
                    customer_id, customer_name, project_id, receivable_account_id, revenue_account_id,
                    gross_amount, late_fee_amount, discount_amount, net_receivable_amount,
                    collected_amount, balance_due, status, collection_followup_status,
                    description
                ) VALUES (
                    1, :num, 'Rental_Commercial', :inv_date, :due_date,
                    :cust_id, :cust_name, :proj_id, :ar_acc, :rev_acc,
                    350000.00, 20000.00, 0.00, 370000.00,
                    0.00, 370000.00, 'Disputed', 'Legal_Notice',
                    'Commercial Atrium Floor 1 Lease Rental - Notice Served'
                )
            """), {
                "num": inv5_num, "inv_date": today - timedelta(days=140),
                "due_date": today - timedelta(days=110), "cust_id": cust1_id,
                "cust_name": cust1_name, "proj_id": proj1_id,
                "ar_acc": ar_acc, "rev_acc": rev_acc
            })

            # 6. Unallocated Cash Advance Receipt (৳300,000 unallocated advance from customer)
            await session.execute(text("""
                INSERT INTO acc_ar_receipts (
                    organization_id, receipt_number, receipt_date, invoice_id,
                    customer_id, project_id, amount, allocated_amount, unallocated_amount,
                    collection_method, bank_account_id, bank_name, cheque_number,
                    transaction_reference, notes
                ) VALUES (
                    1, :rcpt_num, :rcpt_date, NULL,
                    :cust_id, :proj_id, 300000.00, 0.00, 300000.00,
                    'Bank_Cheque', :bank_id, 'BRAC Bank Ltd', 'CHQ-890123',
                    'CHQ-CLR-7719', 'Unallocated customer advance cash pending milestone demand notice'
                )
            """), {
                "rcpt_num": f"MR-{today.year}-002",
                "rcpt_date": today - timedelta(days=5),
                "cust_id": cust1_id,
                "proj_id": proj1_id,
                "bank_id": bank_acc
            })

            await session.commit()
            logger.info("Sample AR records across all 5 aging buckets and unallocated cash seeded successfully.")
        else:
            logger.info(f"Existing AR records found: {existing_count}. Skipping seed.")


if __name__ == "__main__":
    asyncio.run(run_migration())
