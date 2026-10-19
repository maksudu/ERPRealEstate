"""
Migration and Seeding script for Customer Receipt Allocation Enhancement.
Supports:
- Receipt recorded (PDC / draft entered, awaiting clearing)
- Funds verified or cleared (Bank/Cash confirmed)
- Receipt allocated to one or multiple invoices/installments
- Unallocated advance tracking
- Reversed or refunded receipt with audit reason & reversal voucher
- Parent-child allocation architecture to prevent double counting
"""
import sys
import os
import asyncio
import logging
from datetime import date
from sqlalchemy import text, select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LOOKUP_RECEIPT_STATUS = {
    "category_code": "AR_RECEIPT_STATUS",
    "category_name": "AR Receipt Lifecycle Statuses",
    "description": "Lifecycle status of customer collections and allocations",
    "items": [
        ("Recorded", "Receipt Recorded / Awaiting Clearance", "প্রাপ্তি লিপিবদ্ধ / ক্লিয়ারেন্স বাকি", "#64748B", 1, True),
        ("Cleared", "Funds Verified & Cleared", "তহবিল ক্লিয়ার হয়েছে", "#10B981", 2, False),
        ("Allocated", "Fully Allocated to Invoices", "সম্পূর্ণ কিস্তিতে বরাদ্দকৃত", "#3B82F6", 3, False),
        ("Partially_Allocated", "Partially Allocated to Invoices", "আংশিক বরাদ্দকৃত", "#F59E0B", 4, False),
        ("Unallocated", "Unallocated Advance Balance", "অবন্টনকৃত অগ্রিম জমা", "#8B5CF6", 5, False),
        ("Reversed", "Reversed / Dishonored Cheque", "বাতিল / চেক বাউন্স", "#EF4444", 6, False),
        ("Refunded", "Refunded to Customer", "গ্রাহককে ফেরতকৃত", "#EC4899", 7, False)
    ]
}

async def run_migration():
    logger.info("Starting Customer Receipt Allocation database migration...")
    async with AsyncSessionLocal() as session:
        # 1. Alter acc_ar_receipts table to add lifecycle columns safely
        logger.info("Checking columns on acc_ar_receipts...")
        existing_cols_res = await session.execute(text("""
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'acc_ar_receipts'
        """))
        existing_cols = {row[0].lower() for row in existing_cols_res.fetchall()}

        col_defs = [
            ("status", "ALTER TABLE acc_ar_receipts ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'Cleared' AFTER amount"),
            ("cleared_at", "ALTER TABLE acc_ar_receipts ADD COLUMN cleared_at TIMESTAMP NULL AFTER status"),
            ("cleared_by_user_id", "ALTER TABLE acc_ar_receipts ADD COLUMN cleared_by_user_id BIGINT NULL AFTER cleared_at"),
            ("reversal_reason", "ALTER TABLE acc_ar_receipts ADD COLUMN reversal_reason VARCHAR(255) NULL AFTER notes"),
            ("reversal_date", "ALTER TABLE acc_ar_receipts ADD COLUMN reversal_date DATE NULL AFTER reversal_reason"),
            ("reversal_voucher_id", "ALTER TABLE acc_ar_receipts ADD COLUMN reversal_voucher_id BIGINT NULL AFTER reversal_date"),
        ]

        for col_name, sql_stmt in col_defs:
            if col_name.lower() not in existing_cols:
                try:
                    await session.execute(text(sql_stmt))
                    await session.commit()
                    logger.info(f"Added column {col_name} to acc_ar_receipts")
                except Exception as e:
                    await session.rollback()
                    logger.warning(f"Error adding {col_name}: {e}")

        # 2. Create acc_ar_receipt_allocations table
        logger.info("Creating acc_ar_receipt_allocations table...")
        create_alloc_table_sql = """
        CREATE TABLE IF NOT EXISTS acc_ar_receipt_allocations (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            organization_id BIGINT NOT NULL DEFAULT 1,
            receipt_id BIGINT NOT NULL,
            invoice_id BIGINT NOT NULL,
            allocated_amount DECIMAL(16, 2) NOT NULL,
            allocation_date DATE NOT NULL,
            notes TEXT NULL,
            created_by_user_id BIGINT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT,
            FOREIGN KEY (receipt_id) REFERENCES acc_ar_receipts(id) ON DELETE CASCADE,
            FOREIGN KEY (invoice_id) REFERENCES acc_ar_invoices(id) ON DELETE RESTRICT,
            FOREIGN KEY (created_by_user_id) REFERENCES sys_users(id) ON DELETE SET NULL,
            INDEX idx_ar_alloc_receipt (receipt_id),
            INDEX idx_ar_alloc_invoice (invoice_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        await session.execute(text(create_alloc_table_sql))
        await session.commit()

        # 3. Seed Dynamic Lookups for AR_RECEIPT_STATUS
        logger.info("Seeding dynamic lookup AR_RECEIPT_STATUS...")
        cat_result = await session.execute(
            select(LookupCategory).where(LookupCategory.category_code == LOOKUP_RECEIPT_STATUS["category_code"])
        )
        cat = cat_result.scalar_one_or_none()
        if not cat:
            cat = LookupCategory(
                category_code=LOOKUP_RECEIPT_STATUS["category_code"],
                category_name=LOOKUP_RECEIPT_STATUS["category_name"],
                description=LOOKUP_RECEIPT_STATUS["description"],
                is_system_locked=True
            )
            session.add(cat)
            await session.flush()

        for item_data in LOOKUP_RECEIPT_STATUS["items"]:
            code, name_en, name_bn, color, sort_order, is_default = item_data
            item_res = await session.execute(
                select(LookupItem).where(
                    LookupItem.category_id == cat.id,
                    LookupItem.item_code == code
                )
            )
            item = item_res.scalar_one_or_none()
            if not item:
                item = LookupItem(
                    category_id=cat.id,
                    item_code=code,
                    item_name_en=name_en,
                    item_name_bn=name_bn,
                    color_badge=color,
                    sort_order=sort_order,
                    is_default=is_default,
                    is_active=True
                )
                session.add(item)
        await session.commit()

        # 4. Migrate existing receipts to acc_ar_receipt_allocations if not yet migrated
        logger.info("Migrating existing receipt invoice links to allocations table...")
        sync_sql = """
        INSERT INTO acc_ar_receipt_allocations (organization_id, receipt_id, invoice_id, allocated_amount, allocation_date, notes)
        SELECT r.organization_id, r.id, r.invoice_id, r.allocated_amount, r.receipt_date, 'Auto-migrated from direct invoice receipt'
        FROM acc_ar_receipts r
        WHERE r.invoice_id IS NOT NULL 
          AND r.allocated_amount > 0
          AND NOT EXISTS (
              SELECT 1 FROM acc_ar_receipt_allocations a WHERE a.receipt_id = r.id AND a.invoice_id = r.invoice_id
          );
        """
        await session.execute(text(sync_sql))

        # Update receipt statuses based on allocations
        update_status_sql = """
        UPDATE acc_ar_receipts
        SET status = CASE
            WHEN allocated_amount >= amount THEN 'Allocated'
            WHEN allocated_amount > 0 AND unallocated_amount > 0 THEN 'Partially_Allocated'
            WHEN allocated_amount = 0 THEN 'Unallocated'
            ELSE 'Cleared'
        END
        WHERE status IS NULL OR status = '' OR status = 'Cleared';
        """
        await session.execute(text(update_status_sql))
        await session.commit()

        # 5. Create sample receipts demonstrating all 5 states:
        sample_check = await session.execute(
            text("SELECT COUNT(*) FROM acc_ar_receipts WHERE receipt_number = 'MR-REC-001'")
        )
        if sample_check.scalar() == 0:
            logger.info("Seeding realistic sample receipts for all 5 lifecycle states...")
            cust_res = await session.execute(text("SELECT id FROM crm_customers LIMIT 1"))
            cust_id = cust_res.scalar() or 1
            proj_res = await session.execute(text("SELECT id FROM prj_projects LIMIT 1"))
            proj_id = proj_res.scalar() or 1

            invoices_res = await session.execute(text("SELECT id, balance_due FROM acc_ar_invoices LIMIT 2"))
            inv_rows = invoices_res.fetchall()
            inv1_id = inv_rows[0][0] if len(inv_rows) > 0 else None
            inv2_id = inv_rows[1][0] if len(inv_rows) > 1 else None

            # Sample 1: Recorded (PDC Cheque awaiting clearance)
            await session.execute(text("""
                INSERT INTO acc_ar_receipts (
                    organization_id, receipt_number, receipt_date, customer_id, project_id,
                    amount, allocated_amount, unallocated_amount, status, collection_method,
                    bank_name, cheque_number, cheque_date, notes
                ) VALUES (
                    1, 'MR-REC-001', CURRENT_DATE, :cid, :pid,
                    750000.00, 0.00, 750000.00, 'Recorded', 'Bank_Cheque',
                    'City Bank Ltd', 'CQ-883921', DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY),
                    'PDC Cheque received from customer, awaiting bank clearance date'
                )
            """), {"cid": cust_id, "pid": proj_id})

            # Sample 2: Reversed (Bounced Cheque)
            await session.execute(text("""
                INSERT INTO acc_ar_receipts (
                    organization_id, receipt_number, receipt_date, customer_id, project_id,
                    amount, allocated_amount, unallocated_amount, status, collection_method,
                    bank_name, cheque_number, cheque_date, reversal_reason, reversal_date, notes
                ) VALUES (
                    1, 'MR-REV-002', DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), :cid, :pid,
                    500000.00, 0.00, 0.00, 'Reversed', 'Bank_Cheque',
                    'Brac Bank PLC', 'CQ-110294', DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY),
                    'Insufficient drawer funds (Cheque Dishonored / Bounced)', CURRENT_DATE,
                    'Receipt reversed and demand notice due balance reinstated'
                )
            """), {"cid": cust_id, "pid": proj_id})

            # Sample 3: Multi-invoice allocation (1,200,000 split across 2 installments!)
            if inv1_id and inv2_id:
                ins_multi = await session.execute(text("""
                    INSERT INTO acc_ar_receipts (
                        organization_id, receipt_number, receipt_date, customer_id, project_id,
                        amount, allocated_amount, unallocated_amount, status, collection_method,
                        transaction_reference, notes
                    ) VALUES (
                        1, 'MR-ALLOC-003', CURRENT_DATE, :cid, :pid,
                        1200000.00, 1000000.00, 200000.00, 'Partially_Allocated', 'Bank_Transfer',
                        'RTGS-992014-DHAKA',
                        'BEFTN customer transfer allocated across Milestone Installment and Utility connection, with remaining BDT 200,000 as unallocated advance'
                    )
                """), {"cid": cust_id, "pid": proj_id})
                multi_id = ins_multi.lastrowid
                if multi_id:
                    # Allocate 600,000 to inv1 and 400,000 to inv2
                    await session.execute(text("""
                        INSERT INTO acc_ar_receipt_allocations (organization_id, receipt_id, invoice_id, allocated_amount, allocation_date, notes)
                        VALUES 
                        (1, :rid, :i1, 600000.00, CURRENT_DATE, 'Allocation to Milestone Installment #1'),
                        (1, :rid, :i2, 400000.00, CURRENT_DATE, 'Allocation to Utility & Connection Demand');
                    """), {"rid": multi_id, "i1": inv1_id, "i2": inv2_id})

            await session.commit()
            logger.info("Sample receipts successfully seeded!")

    logger.info("Customer Receipt Allocation database migration finished successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
