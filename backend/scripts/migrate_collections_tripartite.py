"""
Database Migration and Seed Script for PROMPT 10:
Smart Installments, Milestone Schedules, Money Receipts & Tripartite Bank Loan Ledger.

Creates tables:
- sls_money_receipts
- sls_money_receipt_allocations
- sls_tripartite_loans
- sls_loan_tranches

Seeds Lookup Items:
- PAYMENT_MODE (CASH, CHEQUE, BANK_TRANSFER, BEFTN, RTGS, BKASH, NAGAD)
- FINANCIAL_INSTITUTION (DBH_FINANCE, IDLC_FINANCE, SCB, CITY_BANK, BRAC_BANK, MTB, IPDC)
- LOAN_NOC_STATUS (PENDING, ISSUED, WAIVED)
- TRANCHE_INSPECTION_STATUS (PENDING_INSPECTION, INSPECTION_PASSED, INSPECTION_REJECTED)

Seeds sample Money Receipts with Waterfall Allocations & Tripartite Loans with Tranches.
"""

import asyncio
import logging
import os
import sys
import uuid
from decimal import Decimal
from datetime import date, timedelta

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.modules.auth.models
import app.modules.lookups.models
import app.modules.land.models
import app.modules.projects.models
import app.modules.inventory.models
import app.modules.crm.models
import app.modules.sales.models
import app.modules.installments.models
import app.modules.construction.models
import app.modules.procurement.models
import app.modules.accounts.models

from sqlalchemy import text, select
from app.core.database import AsyncSessionLocal, engine
from app.modules.sales.models import Booking
from app.modules.crm.models import Customer
from app.modules.installments.models import CustomerInstallment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_collections_tripartite")

TABLE_DDL = [
    """
    CREATE TABLE IF NOT EXISTS `sls_money_receipts` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `mr_number` VARCHAR(64) NOT NULL,
        `receipt_date` DATE NOT NULL,
        `booking_id` BIGINT NOT NULL,
        `customer_id` BIGINT NOT NULL,
        `payment_mode` VARCHAR(32) NOT NULL DEFAULT 'CASH',
        `instrument_no` VARCHAR(64) NULL,
        `instrument_date` DATE NULL,
        `bank_name` VARCHAR(128) NULL,
        `branch_name` VARCHAR(128) NULL,
        `amount_received` DECIMAL(14, 2) NOT NULL,
        `late_fee_adjusted` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        `installment_principal_adjusted` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        `excess_advance_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        `qr_verification_token` VARCHAR(255) NOT NULL,
        `qr_code_payload` TEXT NULL,
        `sms_confirmation_sent` TINYINT(1) NOT NULL DEFAULT 0,
        `sms_sent_at` TIMESTAMP NULL,
        `gl_voucher_id` BIGINT NULL,
        `status` VARCHAR(32) NOT NULL DEFAULT 'CLEARED',
        `remarks` TEXT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `uq_mr_number` (`mr_number`),
        UNIQUE KEY `uq_mr_qr_token` (`qr_verification_token`),
        KEY `idx_mr_booking` (`booking_id`),
        KEY `idx_mr_customer` (`customer_id`),
        KEY `idx_mr_date` (`receipt_date`),
        KEY `idx_mr_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS `sls_money_receipt_allocations` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `receipt_id` BIGINT NOT NULL,
        `installment_id` BIGINT NOT NULL,
        `allocated_late_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        `allocated_principal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        `total_allocated` DECIMAL(14, 2) NOT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_alloc_receipt` (`receipt_id`),
        KEY `idx_alloc_installment` (`installment_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS `sls_tripartite_loans` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `loan_reference_no` VARCHAR(64) NOT NULL,
        `booking_id` BIGINT NOT NULL,
        `customer_id` BIGINT NOT NULL,
        `financial_institution_code` VARCHAR(64) NOT NULL,
        `bank_name` VARCHAR(128) NOT NULL,
        `branch_name` VARCHAR(128) NOT NULL,
        `sanction_letter_no` VARCHAR(64) NOT NULL,
        `sanction_date` DATE NOT NULL,
        `sanctioned_amount` DECIMAL(14, 2) NOT NULL,
        `disbursed_amount_total` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        `developer_noc_ref` VARCHAR(64) NULL,
        `developer_noc_date` DATE NULL,
        `noc_status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        `tripartite_agreement_date` DATE NULL,
        `bank_officer_name` VARCHAR(128) NULL,
        `bank_officer_phone` VARCHAR(32) NULL,
        `bank_officer_email` VARCHAR(128) NULL,
        `status` VARCHAR(32) NOT NULL DEFAULT 'SANCTIONED',
        `remarks` TEXT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `uq_loan_ref_no` (`loan_reference_no`),
        KEY `idx_loan_booking` (`booking_id`),
        KEY `idx_loan_customer` (`customer_id`),
        KEY `idx_loan_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS `sls_loan_tranches` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `loan_id` BIGINT NOT NULL,
        `tranche_number` INT NOT NULL,
        `milestone_title` VARCHAR(191) NOT NULL,
        `sanctioned_tranche_amount` DECIMAL(14, 2) NOT NULL,
        `bank_inspection_date` DATE NULL,
        `inspection_status` VARCHAR(32) NOT NULL DEFAULT 'PENDING_INSPECTION',
        `inspection_engineer_name` VARCHAR(128) NULL,
        `inspection_notes` TEXT NULL,
        `disbursement_claimed_date` DATE NULL,
        `disbursed_date` DATE NULL,
        `disbursed_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        `payment_instrument_no` VARCHAR(64) NULL,
        `receipt_id` BIGINT NULL,
        `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        `remarks` TEXT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_tranche_loan` (`loan_id`),
        KEY `idx_tranche_receipt` (`receipt_id`),
        KEY `idx_tranche_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

LOOKUP_CATEGORIES = [
    {
        "category_code": "PAYMENT_MODE",
        "category_name": "Customer Collection Payment Modes",
        "description": "Multi-mode receipt instruments for property sales collections",
        "items": [
            ("CASH", "Cash (Central Cashier Vault)", "নগদ টাকা"),
            ("CHEQUE", "Bank Account Cheque", "ব্যাংক চেক"),
            ("BANK_TRANSFER", "Online Bank Transfer (NPSB)", "অনলাইন ব্যাংক ট্রান্সফার"),
            ("BEFTN", "BEFTN Electronic Clearing", "বিইএফটিএন ট্রান্সফার"),
            ("RTGS", "Real-Time Gross Settlement (RTGS)", "আরটিজিএস ট্রান্সফার"),
            ("BKASH", "bKash Merchant Payment", "বিকাশ মার্চেন্ট পেমেন্ট"),
            ("NAGAD", "Nagad Merchant Gateway", "নগদ মার্চেন্ট গেটওয়ে")
        ]
    },
    {
        "category_code": "FINANCIAL_INSTITUTION",
        "category_name": "Bank & NBFI Home Loan Partners",
        "description": "Commercial banks and NBFIs executing tripartite home loan agreements",
        "items": [
            ("DBH_FINANCE", "DBH Finance PLC (Delta Brac)", "ডিবিএইচ ফাইন্যান্স"),
            ("IDLC_FINANCE", "IDLC Finance Limited", "আইডিএলসি ফাইন্যান্স"),
            ("SCB", "Standard Chartered Bank Bangladesh", "স্ট্যান্ডার্ড চার্টার্ড ব্যাংক"),
            ("CITY_BANK", "The City Bank Limited", "দি সিটি ব্যাংক লিমিটেড"),
            ("BRAC_BANK", "BRAC Bank PLC", "ব্র্যাক ব্যাংক"),
            ("MTB", "Mutual Trust Bank Limited", "মিউচুয়াল ট্রাস্ট ব্যাংক"),
            ("IPDC", "IPDC Finance Limited", "আইপিডিসি ফাইন্যান্স"),
            ("EBL", "Eastern Bank Limited", "ইস্টার্ন ব্যাংক লিমিটেড")
        ]
    },
    {
        "category_code": "LOAN_NOC_STATUS",
        "category_name": "Developer NOC Statuses",
        "description": "Status of developer non-objection certificate for tripartite mortgage",
        "items": [
            ("PENDING", "Pending Legal Vetting", "আইনি যাচাই প্রক্রিয়াধীন"),
            ("ISSUED", "NOC Issued & Signed", "এনওসি ইস্যু সম্পন্ন"),
            ("WAIVED", "Bank Security Waived", "এনওসি মওকুফ")
        ]
    },
    {
        "category_code": "TRANCHE_INSPECTION_STATUS",
        "category_name": "Bank Civil Inspection Status",
        "description": "Status of structural milestone verification by bank civil engineer",
        "items": [
            ("PENDING_INSPECTION", "Awaiting Site Inspection", "সাইট পরিদর্শন প্রক্রিয়াধীন"),
            ("INSPECTION_PASSED", "Civil Milestone Verified & Passed", "সিভিল মাইলস্টোন অনুমোদিত"),
            ("INSPECTION_REJECTED", "Inspection Rectification Required", "সংশোধন প্রয়োজন")
        ]
    }
]

async def migrate_and_seed():
    logger.info("🚀 Starting Prompt 10 Migration: Money Receipts & Tripartite Bank Loans...")

    async with AsyncSessionLocal() as session:
        # 1. Execute DDL
        for ddl in TABLE_DDL:
            await session.execute(text(ddl))
        await session.commit()
        logger.info("✅ Created/Verified tables: sls_money_receipts, sls_money_receipt_allocations, sls_tripartite_loans, sls_loan_tranches.")

        # 2. Seed Lookups
        for cat in LOOKUP_CATEGORIES:
            cat_code = cat["category_code"]
            res = await session.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"),
                {"c": cat_code}
            )
            cat_id = res.scalar()
            if not cat_id:
                insert_cat = text("""
                    INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active, created_at, updated_at)
                    VALUES (:c, :n, :d, 1, NOW(), NOW())
                """)
                await session.execute(insert_cat, {"c": cat_code, "n": cat["category_name"], "d": cat["description"]})
                await session.commit()
                res = await session.execute(
                    text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"),
                    {"c": cat_code}
                )
                cat_id = res.scalar()

            for sort_order, (item_code, name_en, name_bn) in enumerate(cat["items"], 1):
                res_item = await session.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :ic"),
                    {"cid": cat_id, "ic": item_code}
                )
                if not res_item.scalar():
                    await session.execute(
                        text("""
                            INSERT INTO sys_lookup_items 
                            (category_id, item_code, item_name_en, item_name_bn, sort_order, is_active, created_at, updated_at)
                            VALUES (:cid, :ic, :en, :bn, :so, 1, NOW(), NOW())
                        """),
                        {"cid": cat_id, "ic": item_code, "en": name_en, "bn": name_bn, "so": sort_order}
                    )
        await session.commit()
        logger.info("✅ Seeded dynamic lookup categories for PAYMENT_MODE, FINANCIAL_INSTITUTION, and LOAN_NOC_STATUS.")

        # 3. Check for existing sample Money Receipts
        res_mr = await session.execute(text("SELECT COUNT(*) FROM sls_money_receipts"))
        mr_count = res_mr.scalar() or 0

        # Query first booking
        b_res = await session.execute(select(Booking).limit(3))
        bookings = b_res.scalars().all()

        if mr_count == 0 and bookings:
            booking = bookings[0]
            # Fetch installments for this booking
            inst_res = await session.execute(
                select(CustomerInstallment)
                .where(CustomerInstallment.booking_id == booking.id)
                .order_by(CustomerInstallment.due_date.asc())
            )
            installments = inst_res.scalars().all()

            # Seed Money Receipt 1: Partial waterfall collection
            mr_token1 = uuid.uuid4().hex
            mr_no1 = f"MR-2026-0001"
            amount1 = Decimal("350000.00")
            late_fee_adj1 = Decimal("5000.00")
            principal_adj1 = Decimal("345000.00")

            ins_mr = text("""
                INSERT INTO sls_money_receipts 
                (mr_number, receipt_date, booking_id, customer_id, payment_mode, instrument_no, instrument_date, bank_name, branch_name,
                 amount_received, late_fee_adjusted, installment_principal_adjusted, excess_advance_amount, qr_verification_token,
                 qr_code_payload, sms_confirmation_sent, sms_sent_at, status, remarks, created_at, updated_at)
                VALUES 
                (:mr_no, :r_date, :b_id, :c_id, 'BANK_TRANSFER', 'NPSB-TRX-994821', :i_date, 'City Bank PLC', 'Gulshan Branch',
                 :amt, :late_fee, :princ, 0.00, :token, :qr_payload, 1, NOW(), 'CLEARED', 'Online Bank Transfer via NPSB portal', NOW(), NOW())
            """)
            await session.execute(ins_mr, {
                "mr_no": mr_no1,
                "r_date": date.today() - timedelta(days=5),
                "b_id": booking.id,
                "c_id": booking.primary_customer_id,
                "i_date": date.today() - timedelta(days=5),
                "amt": amount1,
                "late_fee": late_fee_adj1,
                "princ": principal_adj1,
                "token": mr_token1,
                "qr_payload": f"VERIFIED:MR={mr_no1}|BOOKING={booking.booking_reference_no}|AMOUNT=BDT 350,000|STATUS=CLEARED"
            })
            await session.commit()

            # Get generated MR ID
            res_id = await session.execute(text("SELECT id FROM sls_money_receipts WHERE mr_number = :m"), {"m": mr_no1})
            receipt_id = res_id.scalar()

            # Add allocation if installment exists
            if installments:
                target_inst = installments[0]
                await session.execute(text("""
                    INSERT INTO sls_money_receipt_allocations
                    (receipt_id, installment_id, allocated_late_fee, allocated_principal, total_allocated, created_at)
                    VALUES (:r_id, :i_id, :lf, :pr, :tot, NOW())
                """), {
                    "r_id": receipt_id,
                    "i_id": target_inst.id,
                    "lf": late_fee_adj1,
                    "pr": principal_adj1,
                    "tot": amount1
                })
                # Update target installment
                target_inst.paid_amount = float(target_inst.paid_amount or 0.0) + float(principal_adj1)
                target_inst.late_fee_accrued = max(0.0, float(target_inst.late_fee_accrued or 0.0) - float(late_fee_adj1))
                if target_inst.paid_amount >= float(target_inst.payable_amount):
                    target_inst.status = "PAID"
                else:
                    target_inst.status = "PARTIALLY_PAID"
                await session.commit()

            logger.info("✅ Seeded sample Money Receipt MR-2026-0001 with granular waterfall allocations.")

        # 4. Check for existing sample Tripartite Loans
        res_loan = await session.execute(text("SELECT COUNT(*) FROM sls_tripartite_loans"))
        loan_count = res_loan.scalar() or 0

        if loan_count == 0 and bookings:
            booking = bookings[0]
            loan_ref = f"TRP-DBH-2026-001"
            sanctioned = Decimal("7500000.00")
            disbursed = Decimal("2500000.00")

            ins_loan = text("""
                INSERT INTO sls_tripartite_loans
                (loan_reference_no, booking_id, customer_id, financial_institution_code, bank_name, branch_name,
                 sanction_letter_no, sanction_date, sanctioned_amount, disbursed_amount_total, developer_noc_ref,
                 developer_noc_date, noc_status, tripartite_agreement_date, bank_officer_name, bank_officer_phone,
                 bank_officer_email, status, remarks, created_at, updated_at)
                VALUES
                (:ref, :b_id, :c_id, 'DBH_FINANCE', 'DBH Finance PLC', 'Principal Branch, Dhaka',
                 'DBH/HL/2026/8891', :s_date, :s_amt, :d_amt, 'NOC-DEV-2026-0042',
                 :noc_date, 'ISSUED', :trp_date, 'Kazi Tanvir Hasan', '+8801711223344',
                 'tanvir.hasan@dbhfinance.com', 'DISBURSING', 'Tripartite deed executed; Tranche 1 disbursed', NOW(), NOW())
            """)
            await session.execute(ins_loan, {
                "ref": loan_ref,
                "b_id": booking.id,
                "c_id": booking.primary_customer_id,
                "s_date": date.today() - timedelta(days=60),
                "s_amt": sanctioned,
                "d_amt": disbursed,
                "noc_date": date.today() - timedelta(days=45),
                "trp_date": date.today() - timedelta(days=40)
            })
            await session.commit()

            res_lid = await session.execute(text("SELECT id FROM sls_tripartite_loans WHERE loan_reference_no = :r"), {"r": loan_ref})
            loan_id = res_lid.scalar()

            # Seed 3 Tranches
            tranches_data = [
                (1, "Plinth & Basement Casting (33%)", Decimal("2500000.00"), "INSPECTION_PASSED", "DISBURSED", date.today() - timedelta(days=30), Decimal("2500000.00"), "DBH-PO-88219"),
                (2, "Roof Casting 5th Floor (33%)", Decimal("2500000.00"), "INSPECTION_PASSED", "INSPECTION_DONE", date.today() - timedelta(days=5), Decimal("0.00"), None),
                (3, "Final Handover & Key Allotment (34%)", Decimal("2500000.00"), "PENDING_INSPECTION", "PENDING", None, Decimal("0.00"), None)
            ]

            for t_no, title, amt, insp_status, t_status, d_date, d_amt, inst_no in tranches_data:
                await session.execute(text("""
                    INSERT INTO sls_loan_tranches
                    (loan_id, tranche_number, milestone_title, sanctioned_tranche_amount, bank_inspection_date,
                     inspection_status, inspection_engineer_name, inspection_notes, disbursement_claimed_date,
                     disbursed_date, disbursed_amount, payment_instrument_no, status, remarks, created_at, updated_at)
                    VALUES
                    (:l_id, :t_no, :title, :s_amt, :insp_date, :insp_status, 'Engr. M. A. Rouf',
                     'Site inspected and structural casting depth verified satisfactory as per BNBC 2020.',
                     :claim_date, :disb_date, :disb_amt, :p_inst, :status, 'Civil milestone verification complete', NOW(), NOW())
                """), {
                    "l_id": loan_id,
                    "t_no": t_no,
                    "title": title,
                    "s_amt": amt,
                    "insp_date": date.today() - timedelta(days=10) if insp_status == "INSPECTION_PASSED" else None,
                    "insp_status": insp_status,
                    "claim_date": date.today() - timedelta(days=15) if d_date else None,
                    "disb_date": d_date,
                    "disb_amt": d_amt,
                    "p_inst": inst_no,
                    "status": t_status
                })
            await session.commit()
            logger.info("✅ Seeded sample Tripartite Loan TRP-DBH-2026-001 with 3 construction milestone tranches.")

    logger.info("🎉 Prompt 10 Database Migration & Seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_and_seed())
