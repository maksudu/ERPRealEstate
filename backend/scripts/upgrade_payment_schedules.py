import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.core.database import engine
from sqlalchemy import text

async def upgrade():
    async with engine.begin() as conn:
        print("1. Creating lnd_land_payment_schedules table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_land_payment_schedules (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                schedule_code VARCHAR(64) NOT NULL UNIQUE,
                parcel_id BIGINT NOT NULL,
                acquisition_costing_id BIGINT NULL,
                negotiation_id BIGINT NULL,
                jv_agreement_id BIGINT NULL,
                landowner_id BIGINT NULL,
                installment_number INT NOT NULL DEFAULT 1,
                installment_title VARCHAR(191) NOT NULL,
                payment_type VARCHAR(64) NOT NULL DEFAULT 'ADVANCE_PAYMENT',
                due_date DATE NOT NULL,
                due_amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                paid_amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                outstanding_amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                payment_method VARCHAR(64) NOT NULL DEFAULT 'BANK_TRANSFER',
                beneficiary_name VARCHAR(191) NULL,
                beneficiary_bank_name VARCHAR(191) NULL,
                beneficiary_bank_branch VARCHAR(191) NULL,
                beneficiary_account_no VARCHAR(64) NULL,
                beneficiary_routing_no VARCHAR(64) NULL,
                transaction_reference VARCHAR(128) NULL,
                approval_status VARCHAR(64) NOT NULL DEFAULT 'DRAFT',
                approved_by VARCHAR(191) NULL,
                approved_at TIMESTAMP NULL,
                approved_variation_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                approval_notes TEXT NULL,
                accounting_voucher_no VARCHAR(64) NULL,
                gl_account_code VARCHAR(64) NULL DEFAULT '1120-LAND-ACQ-CAPEX',
                is_overdue TINYINT(1) NOT NULL DEFAULT 0,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_lps_parcel (parcel_id),
                INDEX idx_lps_negotiation (negotiation_id),
                INDEX idx_lps_owner (landowner_id),
                INDEX idx_lps_status (approval_status),
                INDEX idx_lps_duedate (due_date),
                CONSTRAINT fk_lps_parcel FOREIGN KEY (parcel_id) REFERENCES lnd_parcels(id) ON DELETE CASCADE,
                CONSTRAINT fk_lps_owner FOREIGN KEY (landowner_id) REFERENCES lnd_landowners(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("lnd_land_payment_schedules table verified/created.")

        print("\n2. Creating lnd_land_payment_transactions table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_land_payment_transactions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                schedule_id BIGINT NOT NULL,
                transaction_code VARCHAR(64) NOT NULL UNIQUE,
                transaction_date DATE NOT NULL,
                amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                payment_method VARCHAR(64) NOT NULL DEFAULT 'BANK_TRANSFER',
                bank_name VARCHAR(191) NULL,
                account_no VARCHAR(64) NULL,
                instrument_no VARCHAR(64) NULL,
                accounting_voucher_no VARCHAR(64) NULL,
                is_reversal TINYINT(1) NOT NULL DEFAULT 0,
                reversal_reason TEXT NULL,
                reversed_transaction_id BIGINT NULL,
                posted_by VARCHAR(191) NOT NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_lpt_schedule (schedule_id),
                CONSTRAINT fk_lpt_schedule FOREIGN KEY (schedule_id) REFERENCES lnd_land_payment_schedules(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("lnd_land_payment_transactions table verified/created.")

        # 3. Lookup categories & items
        print("\n3. Seeding Lookup Categories & Items for Land Payment Schedules...")
        categories = [
            ("LAND_PAYMENT_TYPE", "Land Acquisition Payment Types", [
                ("BOOKING_DEPOSIT", "Booking / Earnest-Money Deposit", "বুকিং / আর্নেস্ট মানি ডিপোজিট"),
                ("ADVANCE_PAYMENT", "Advance / Bayna Payment", "অগ্রিম / বায়না চুক্তি পেমেন্ট"),
                ("INSTALLMENT_PAYMENT", "Milestone Installment Payment", "কিস্তি পেমেন্ট"),
                ("REGISTRATION_PAYMENT", "Registration-Stage Payment", "রেজিস্ট্রেশনকালীন পেমেন্ট"),
                ("OWNER_SETTLEMENT", "Owner-Wise Settlement", "মালিকভিত্তিক নিষ্পত্তি"),
                ("FINAL_SETTLEMENT", "Final Settlement Payment", "চূড়ান্ত নিষ্পত্তি পেমেন্ট"),
                ("REFUND_ADJUSTMENT", "Refund / Variation Adjustment", "ফেরত বা সমন্বয়")
            ]),
            ("LAND_PAYMENT_METHOD", "Land Acquisition Payment Methods", [
                ("BANK_TRANSFER", "Bank Transfer (BEFTN / RTGS / EFT)", "ব্যাংক ট্রান্সফার (BEFTN/RTGS)"),
                ("CHEQUE", "Account Payee Cheque", "একাউন্ট পেয়ি চেক"),
                ("PAY_ORDER", "Bank Pay Order / Demand Draft", "ব্যাংক পে-অর্ডার"),
                ("CASH_APPROVED", "Approved Treasury Cash Voucher", "অনুমোদিত ক্যাশ ভাউচার")
            ]),
            ("LAND_PAYMENT_STATUS", "Payment Schedule Approval & Settlement Status", [
                ("DRAFT", "Draft Schedule", "খসড়া তফসিল"),
                ("PENDING_APPROVAL", "Pending Treasury Approval", "অনুমোদনাধীন"),
                ("APPROVED_FOR_PAYMENT", "Approved for Payment", "পরিশোধের জন্য অনুমোদিত"),
                ("POSTED_PAID", "Posted & Paid (GL Vouchered)", "পরিশোধিত ও অ্যাকাউন্টিং পোস্ট করা"),
                ("REJECTED", "Payment Rejected", "প্রত্যাখ্যাত"),
                ("REVERSED", "Payment Reversed / Corrected", "সংশোধিত / বাতিল")
            ])
        ]

        for cat_code, cat_name, items in categories:
            res = await conn.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"),
                {"c": cat_code}
            )
            cat_row = res.fetchone()
            if not cat_row:
                await conn.execute(
                    text("""
                        INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active)
                        VALUES (:c, :n, :n, 1)
                    """),
                    {"c": cat_code, "n": cat_name}
                )
                res = await conn.execute(
                    text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"),
                    {"c": cat_code}
                )
                cat_row = res.fetchone()

            cat_id = cat_row[0]

            for item_code, item_en, item_bn in items:
                it_res = await conn.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :icode"),
                    {"cid": cat_id, "icode": item_code}
                )
                if not it_res.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, is_active)
                            VALUES (:cid, :icode, :ien, :ibn, 1)
                        """),
                        {"cid": cat_id, "icode": item_code, "ien": item_en, "ibn": item_bn}
                    )

        print("Lookup categories and items seeded successfully.")

        # 4. Check parcels and seed demo schedules if none exist
        parcel_res = await conn.execute(text("SELECT id FROM lnd_parcels LIMIT 1"))
        p_row = parcel_res.fetchone()
        if p_row:
            parcel_id = p_row[0]
            owner_res = await conn.execute(text("SELECT id, full_name_en, bank_name, bank_branch, bank_account_no, bank_routing_no FROM lnd_landowners LIMIT 1"))
            owner_row = owner_res.fetchone()
            owner_id = owner_row[0] if owner_row else None
            b_name = owner_row[1] if owner_row else "Primary Beneficiary"
            b_bank = owner_row[2] if owner_row and owner_row[2] else "Dutch-Bangla Bank PLC"
            b_branch = owner_row[3] if owner_row and owner_row[3] else "Gulshan Branch, Dhaka"
            b_acc = owner_row[4] if owner_row and owner_row[4] else "115.120.98421"
            b_route = owner_row[5] if owner_row and owner_row[5] else "090271822"

            neg_res = await conn.execute(text("SELECT id FROM lnd_land_negotiations WHERE parcel_id = :pid LIMIT 1"), {"pid": parcel_id})
            neg_row = neg_res.fetchone()
            neg_id = neg_row[0] if neg_row else None

            sched_count_res = await conn.execute(text("SELECT COUNT(*) FROM lnd_land_payment_schedules WHERE parcel_id = :pid"), {"pid": parcel_id})
            if sched_count_res.scalar() == 0:
                print(f"\n4. Seeding standard 4-stage payment schedule for Parcel #{parcel_id}...")
                schedules_data = [
                    (
                        f"LPS-{parcel_id}-01",
                        1,
                        "Installment 1: Earnest-Money & Bayna Booking Deposit",
                        "BOOKING_DEPOSIT",
                        "2026-08-15",
                        5000000.00,
                        5000000.00,
                        0.00,
                        "BANK_TRANSFER",
                        "POSTED_PAID",
                        "EFT-DBBL-2026-981",
                        "PV-LAND-2026-0104",
                        "Chief Treasury Officer",
                        "Disbursed upon signing formal Bayna-nama before Sub-Registrar."
                    ),
                    (
                        f"LPS-{parcel_id}-02",
                        2,
                        "Installment 2: Title Chain & Mutation Verification",
                        "ADVANCE_PAYMENT",
                        "2026-09-30",
                        15000000.00,
                        15000000.00,
                        0.00,
                        "PAY_ORDER",
                        "POSTED_PAID",
                        "PO-EBL-8871029",
                        "PV-LAND-2026-0158",
                        "Finance Director",
                        "Released upon delivery of certified mutation porcha and 25-year non-encumbrance certificate."
                    ),
                    (
                        f"LPS-{parcel_id}-03",
                        3,
                        "Installment 3: Physical Eviction & Demarcation Settlement",
                        "INSTALLMENT_PAYMENT",
                        "2026-10-15",
                        10000000.00,
                        0.00,
                        10000000.00,
                        "BANK_TRANSFER",
                        "APPROVED_FOR_PAYMENT",
                        "PENDING-BEFTN",
                        None,
                        "Board Approval #BR-99",
                        "Boundary wall pillars erected. Ready for final treasury disbursement."
                    ),
                    (
                        f"LPS-{parcel_id}-04",
                        4,
                        "Installment 4: Final Sub-Registry & Execution Settlement",
                        "FINAL_SETTLEMENT",
                        "2026-11-30",
                        20000000.00,
                        0.00,
                        20000000.00,
                        "BANK_TRANSFER",
                        "PENDING_APPROVAL",
                        None,
                        None,
                        None,
                        "Scheduled on date of final kabala execution before Sub-Registrar."
                    )
                ]

                for code, num, title, ptype, duedate, due, paid, out, method, status, ref, voucher, app_by, note in schedules_data:
                    res_ins = await conn.execute(text("""
                        INSERT INTO lnd_land_payment_schedules (
                            schedule_code, parcel_id, negotiation_id, landowner_id, installment_number,
                            installment_title, payment_type, due_date, due_amount_bdt, paid_amount_bdt,
                            outstanding_amount_bdt, payment_method, beneficiary_name, beneficiary_bank_name,
                            beneficiary_bank_branch, beneficiary_account_no, beneficiary_routing_no,
                            transaction_reference, approval_status, approved_by, approved_at,
                            accounting_voucher_no, notes, is_overdue
                        ) VALUES (
                            :code, :pid, :nid, :oid, :num,
                            :title, :ptype, :duedate, :due, :paid,
                            :out, :method, :bname, :bbank,
                            :bbranch, :bacc, :broute,
                            :ref, :status, :app_by, NOW(),
                            :voucher, :note, 0
                        )
                    """), {
                        "code": code, "pid": parcel_id, "nid": neg_id, "oid": owner_id, "num": num,
                        "title": title, "ptype": ptype, "duedate": duedate, "due": due, "paid": paid,
                        "out": out, "method": method, "bname": b_name, "bbank": b_bank,
                        "bbranch": b_branch, "bacc": b_acc, "broute": b_route,
                        "ref": ref, "status": status, "app_by": app_by, "voucher": voucher, "note": note
                    })
                    sched_id = res_ins.lastrowid

                    # For paid installments, create an auditable transaction
                    if paid > 0:
                        await conn.execute(text("""
                            INSERT INTO lnd_land_payment_transactions (
                                schedule_id, transaction_code, transaction_date, amount_bdt,
                                payment_method, bank_name, account_no, instrument_no,
                                accounting_voucher_no, is_reversal, posted_by, notes
                            ) VALUES (
                                :sid, :tcode, :tdate, :amt,
                                :method, :bank, :acc, :inst,
                                :voucher, 0, 'Senior Treasury Officer', :notes
                            )
                        """), {
                            "sid": sched_id,
                            "tcode": f"TXN-{code}",
                            "tdate": duedate,
                            "amt": paid,
                            "method": method,
                            "bank": b_bank,
                            "acc": b_acc,
                            "inst": ref,
                            "voucher": voucher,
                            "notes": f"Settlement posted to GL against voucher {voucher}"
                        })
                print("Seeded standard payment schedules and transaction records.")

    print("\nUpgrade completed successfully.")

if __name__ == "__main__":
    asyncio.run(upgrade())
