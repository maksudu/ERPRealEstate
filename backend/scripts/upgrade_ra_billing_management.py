import asyncio
import json
from decimal import Decimal
from datetime import date, timedelta
from sqlalchemy import text, inspect
from app.core.database import engine

async def upgrade_ra_billing():
    print("=================================================================")
    print("UPGRADING DATABASE: CONTRACTOR BILLS & PAYMENT CERTIFICATION (RA)")
    print("=================================================================")

    async with engine.begin() as conn:
        # 1. Inspect existing columns in con_ra_bills
        existing_cols = await conn.run_sync(lambda sync_conn: [c["name"] for c in inspect(sync_conn).get_columns("con_ra_bills")])
        print(f"Existing columns in con_ra_bills: {len(existing_cols)}")

        new_columns = [
            ("project_id", "BIGINT NULL"),
            ("contractor_id", "BIGINT NULL"),
            ("previous_certified_amount", "DECIMAL(14,2) NOT NULL DEFAULT 0.00"),
            ("current_gross_bill_value", "DECIMAL(14,2) NOT NULL DEFAULT 0.00"),
            ("cumulative_certified_amount", "DECIMAL(14,2) NOT NULL DEFAULT 0.00"),
            ("previous_payments_amount", "DECIMAL(14,2) NOT NULL DEFAULT 0.00"),
            ("net_payable_balance", "DECIMAL(14,2) NOT NULL DEFAULT 0.00"),
            ("other_deductions_amount", "DECIMAL(14,2) NOT NULL DEFAULT 0.00"),
            ("other_deductions_description", "VARCHAR(255) NULL"),
            ("penalty_deduction_amount", "DECIMAL(14,2) NOT NULL DEFAULT 0.00"),
            ("tax_treatment_type", "VARCHAR(64) NOT NULL DEFAULT 'STANDARD_TDS_52'"),
            ("vat_treatment_type", "VARCHAR(64) NOT NULL DEFAULT 'STANDARD_VDS_7_5'"),
            ("workflow_stage", "VARCHAR(64) NOT NULL DEFAULT 'CONTRACTOR_SUBMISSION'"),
            ("current_stage_assignee_role", "VARCHAR(64) NULL DEFAULT 'SITE_ENGINEER'"),
            ("revision_number", "INT NOT NULL DEFAULT 1"),
            ("rejection_reason", "TEXT NULL"),
            ("review_comments", "TEXT NULL"),
            ("measurement_sheet_urls", "TEXT NULL"),
            ("site_photo_urls", "TEXT NULL"),
            ("is_on_hold", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("hold_reason", "VARCHAR(255) NULL"),
            ("hold_by_user_id", "BIGINT NULL"),
            ("dispute_id", "BIGINT NULL"),
            ("retention_release_status", "VARCHAR(32) NOT NULL DEFAULT 'HELD'"),
            ("retention_release_eligible_date", "DATE NULL"),
            ("retention_release_amount", "DECIMAL(14,2) NOT NULL DEFAULT 0.00"),
            ("payment_status", "VARCHAR(32) NOT NULL DEFAULT 'UNPAID'"),
            ("paid_amount", "DECIMAL(14,2) NOT NULL DEFAULT 0.00"),
            ("payment_date", "DATE NULL"),
            ("payment_method", "VARCHAR(64) NULL DEFAULT 'BANK_TRANSFER'"),
            ("bank_payment_ref", "VARCHAR(128) NULL"),
            ("cheque_reference", "VARCHAR(128) NULL"),
            ("created_by_user_id", "BIGINT NULL"),
            ("verified_by_engineer_id", "BIGINT NULL"),
            ("verified_by_qs_id", "BIGINT NULL"),
            ("approved_by_pm_id", "BIGINT NULL"),
            ("reviewed_by_accounts_id", "BIGINT NULL")
        ]

        for col_name, col_def in new_columns:
            if col_name not in existing_cols:
                await conn.execute(text(f"ALTER TABLE con_ra_bills ADD COLUMN {col_name} {col_def}"))
                print(f"Added column {col_name} to con_ra_bills")

        # 2. Create table con_ra_bill_items for itemized measurement breakdown
        print("Checking con_ra_bill_items table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_ra_bill_items (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                ra_bill_id BIGINT NOT NULL,
                work_order_item_id BIGINT NULL,
                boq_item_id BIGINT NULL,
                wbs_node_id BIGINT NULL,
                item_code VARCHAR(64) NOT NULL,
                item_description VARCHAR(255) NOT NULL,
                unit_of_measure VARCHAR(32) NOT NULL DEFAULT 'SFT',
                contract_rate DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                contract_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                previous_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                current_measured_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                cumulative_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                previous_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                current_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                cumulative_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                location_floor VARCHAR(128) NULL,
                measurement_sheet_ref VARCHAR(128) NULL,
                remarks TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ra_items_bill (ra_bill_id),
                CONSTRAINT fk_ra_items_bill FOREIGN KEY (ra_bill_id) REFERENCES con_ra_bills (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("Table con_ra_bill_items verified.")

        # 3. Seed Lookup Categories & Items
        lookup_categories = [
            ("RA_BILL_WORKFLOW_STAGE", "RA Bill Workflow Approval Stages", "CONSTRUCTION"),
            ("RA_BILL_PAYMENT_STATUS", "Contractor Bill Payment Status", "CONSTRUCTION"),
            ("RA_BILL_TAX_TREATMENT", "Contract Tax Treatment Modes (NBR Sec 52)", "ACCOUNTS"),
            ("RA_BILL_VAT_TREATMENT", "Contract VAT Treatment Modes", "ACCOUNTS"),
            ("RA_BILL_PAYMENT_METHOD", "Payment Disbursement Instruments", "ACCOUNTS")
        ]

        for code, name, mod in lookup_categories:
            chk = await conn.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"), {"c": code})
            cat_id = chk.scalar()
            if not cat_id:
                ins = await conn.execute(text("""
                    INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active)
                    VALUES (:c, :n, :m, 1)
                """), {"c": code, "n": name, "m": mod})
                cat_id = ins.lastrowid
                print(f"Created lookup category: {code}")

            # Seed items
            items_by_cat = {
                "RA_BILL_WORKFLOW_STAGE": [
                    ("CONTRACTOR_SUBMISSION", "1. Contractor Bill Submission", 10),
                    ("SITE_ENGINEER_VERIFICATION", "2. Site Engineer Verification", 20),
                    ("QS_REVIEW", "3. Quantity Surveyor Rate & BOQ Review", 30),
                    ("PM_APPROVAL", "4. Project Manager Scope & Quality Approval", 40),
                    ("ACCOUNTS_REVIEW", "5. Accounts Tax/VAT & Deduction Review", 50),
                    ("AUTHORIZED_PAYMENT", "6. Authorized Payment Disbursed", 60),
                    ("REVISED_PENDING_RESUBMISSION", "Revision Required (Sent to Contractor)", 70),
                    ("REJECTED", "Rejected", 80)
                ],
                "RA_BILL_PAYMENT_STATUS": [
                    ("UNPAID", "Unpaid / Pending Approval", 10),
                    ("APPROVED_FOR_PAYMENT", "Approved for Payment Posting", 20),
                    ("PARTIALLY_PAID", "Partially Paid", 30),
                    ("PAID", "Fully Disbursed & Reconciled", 40),
                    ("ON_HOLD", "Disputed / On Hold", 50)
                ],
                "RA_BILL_TAX_TREATMENT": [
                    ("STANDARD_TDS_52", "Standard TDS Section 52 (5.0%)", 10),
                    ("REDUCED_TDS_SEC_52_CERT", "Reduced Rate per NBR Tax Exemption Cert (3.0%)", 20),
                    ("TIN_NON_COMPLIANT_7_5", "Higher Rate for Missing TIN/Return (7.5%)", 30),
                    ("TAX_EXEMPT_GOVT_BOND", "Tax Exempt Project", 40)
                ],
                "RA_BILL_VAT_TREATMENT": [
                    ("STANDARD_VDS_7_5", "Standard Construction VDS (7.5%)", 10),
                    ("VDS_WITHHOLDING_5_0", "Material Composite VDS (5.0%)", 20),
                    ("FULL_15_PERCENT_STANDARD", "Standard Commercial Rate (15.0%)", 30),
                    ("ZERO_RATED_EXPORT_EPZ", "Zero Rated / Special Economic Zone", 40)
                ],
                "RA_BILL_PAYMENT_METHOD": [
                    ("BANK_TRANSFER", "Bank Electronic Transfer (BEFTN / RTGS)", 10),
                    ("ACCOUNT_PAYEE_CHEQUE", "Account Payee Cheque", 20),
                    ("LETTER_OF_CREDIT", "Local LC / Escrow Disbursement", 30),
                    ("CASH_SECURITY_ADJUSTMENT", "Direct Adjustment against Advance/Security", 40)
                ]
            }

            for icode, iname, disp in items_by_cat.get(code, []):
                item_chk = await conn.execute(text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :ic"), {"cid": cat_id, "ic": icode})
                if not item_chk.scalar():
                    await conn.execute(text("""
                        INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_default, is_active)
                        VALUES (:cid, :ic, :in, :in, '#3B82F6', :d, 0, 1)
                    """), {"cid": cat_id, "ic": icode, "in": iname, "d": disp})
                    print(f"  Added lookup item: {icode}")

        # 4. Check Work Orders and Seed Operational RA Bills
        wo_rows = (await conn.execute(text("SELECT id, work_order_no, project_id, contractor_id, total_contract_value, retention_money_percent, tds_rate, vds_rate FROM con_work_orders ORDER BY id LIMIT 3"))).fetchall()

        if wo_rows:
            wo1 = wo_rows[0]
            print(f"Linking seed RA bills to Work Order {wo1[1]} (ID: {wo1[0]})...")

            # Check existing RA bills
            ra_chk = await conn.execute(text("SELECT id FROM con_ra_bills WHERE work_order_id = :wid"), {"wid": wo1[0]})
            existing_ras = ra_chk.fetchall()

            sample_bills = [
                {
                    "ra_bill_number": "RA-2026-0001",
                    "work_order_id": wo1[0],
                    "project_id": wo1[2],
                    "contractor_id": wo1[3],
                    "bill_date": date(2026, 2, 28),
                    "billing_period_start": date(2026, 2, 1),
                    "billing_period_end": date(2026, 2, 28),
                    "previous_certified_amount": Decimal("0.00"),
                    "gross_work_certified_amount": Decimal("12500000.00"),
                    "current_gross_bill_value": Decimal("12500000.00"),
                    "cumulative_certified_amount": Decimal("12500000.00"),
                    "advance_recovery_deducted": Decimal("1250000.00"), # 10%
                    "retention_percent": Decimal("5.00"),
                    "retention_money_deducted": Decimal("625000.00"), # 5%
                    "material_store_recovery_amount": Decimal("250000.00"), # Rebar/cement issue
                    "penalty_deduction_amount": Decimal("0.00"),
                    "other_deductions_amount": Decimal("250000.00"),
                    "other_deductions_description": "Store issued diesel & testing laboratory charges",
                    "tds_rate": Decimal("5.00"),
                    "tds_withheld_amount": Decimal("625000.00"),
                    "vds_rate": Decimal("7.50"),
                    "vds_withheld_amount": Decimal("937500.00"),
                    "previous_payments_amount": Decimal("0.00"),
                    "net_payable_amount": Decimal("8812500.00"), # 12.5M - 1.25M - 625k - 250k - 625k - 937.5k = 8,812,500
                    "net_payable_balance": Decimal("0.00"), # Fully paid
                    "workflow_stage": "AUTHORIZED_PAYMENT",
                    "current_stage_assignee_role": "FINANCE_DISBURSEMENT",
                    "status": "APPROVED",
                    "payment_status": "PAID",
                    "paid_amount": Decimal("8812500.00"),
                    "payment_date": date(2026, 3, 5),
                    "payment_method": "BANK_TRANSFER",
                    "bank_payment_ref": "BEFTN-SCB-2026-99120",
                    "accounts_journal_voucher_ref": "JV-2026-03-088",
                    "remarks": "RA Bill 01 certified for Mat foundation and Substructure R.C.C. casting.",
                    "approval_signature_chain": json.dumps([
                        {"role": "SITE_ENGINEER", "name": "Engr. Tanvir Ahmed", "action": "VERIFIED_ON_SITE", "date": "2026-03-01"},
                        {"role": "QUANTITY_SURVEYOR", "name": "Engr. Rezaul Karim", "action": "RATES_BOQ_CHECKED", "date": "2026-03-02"},
                        {"role": "PROJECT_MANAGER", "name": "Engr. Shamsul Huda", "action": "SCOPE_APPROVED", "date": "2026-03-03"},
                        {"role": "ACCOUNTS_REVIEW", "name": "Farhan Kabir, FCA", "action": "TAX_VAT_POSTED", "date": "2026-03-04"},
                        {"role": "FINANCE_DIRECTOR", "name": "Director Finance", "action": "PAYMENT_AUTHORIZED", "date": "2026-03-05"}
                    ]),
                    "items": [
                        {
                            "item_code": "BOQ-STR-01",
                            "item_description": "Mat Foundation R.C.C. Concrete Cast-in-situ (4000 PSI)",
                            "unit_of_measure": "CFT",
                            "contract_rate": Decimal("480.00"),
                            "contract_quantity": Decimal("45000.0000"),
                            "previous_quantity": Decimal("0.0000"),
                            "current_measured_quantity": Decimal("15000.0000"),
                            "cumulative_quantity": Decimal("15000.0000"),
                            "previous_amount": Decimal("0.00"),
                            "current_amount": Decimal("7200000.00"),
                            "cumulative_amount": Decimal("7200000.00"),
                            "location_floor": "Basement 2 Mat Foundation",
                            "measurement_sheet_ref": "JMS-2026-01-B2"
                        },
                        {
                            "item_code": "BOQ-STR-02",
                            "item_description": "High Strength Rebar Fabrication & Binding 60/72.5 Grade",
                            "unit_of_measure": "KG",
                            "contract_rate": Decimal("110.00"),
                            "contract_quantity": Decimal("180000.0000"),
                            "previous_quantity": Decimal("0.0000"),
                            "current_measured_quantity": Decimal("48000.0000"),
                            "cumulative_quantity": Decimal("48000.0000"),
                            "previous_amount": Decimal("0.00"),
                            "current_amount": Decimal("5280000.00"),
                            "cumulative_amount": Decimal("5280000.00"),
                            "location_floor": "Basement 2 Bottom & Top Mesh",
                            "measurement_sheet_ref": "JMS-2026-02-B2"
                        }
                    ]
                },
                {
                    "ra_bill_number": "RA-2026-0002",
                    "work_order_id": wo1[0],
                    "project_id": wo1[2],
                    "contractor_id": wo1[3],
                    "bill_date": date(2026, 3, 31),
                    "billing_period_start": date(2026, 3, 1),
                    "billing_period_end": date(2026, 3, 31),
                    "previous_certified_amount": Decimal("12500000.00"),
                    "gross_work_certified_amount": Decimal("13450000.00"),
                    "current_gross_bill_value": Decimal("13450000.00"),
                    "cumulative_certified_amount": Decimal("25950000.00"),
                    "advance_recovery_deducted": Decimal("1345000.00"), # 10%
                    "retention_percent": Decimal("5.00"),
                    "retention_money_deducted": Decimal("672500.00"), # 5%
                    "material_store_recovery_amount": Decimal("180000.00"),
                    "penalty_deduction_amount": Decimal("0.00"),
                    "other_deductions_amount": Decimal("180000.00"),
                    "other_deductions_description": "Safety audit compliance deductions",
                    "tds_rate": Decimal("5.00"),
                    "tds_withheld_amount": Decimal("672500.00"),
                    "vds_rate": Decimal("7.50"),
                    "vds_withheld_amount": Decimal("1008750.00"),
                    "previous_payments_amount": Decimal("8812500.00"),
                    "net_payable_amount": Decimal("9571250.00"), # 13.45M - 1.345M - 672.5k - 180k - 672.5k - 1008.75k = 9,571,250
                    "net_payable_balance": Decimal("9571250.00"), # Pending disbursement
                    "workflow_stage": "ACCOUNTS_REVIEW",
                    "current_stage_assignee_role": "CHIEF_ACCOUNTANT",
                    "status": "APPROVED",
                    "payment_status": "APPROVED_FOR_PAYMENT",
                    "paid_amount": Decimal("0.00"),
                    "payment_date": None,
                    "payment_method": "BANK_TRANSFER",
                    "bank_payment_ref": None,
                    "accounts_journal_voucher_ref": "JV-2026-04-012",
                    "remarks": "RA Bill 02 for Basement 1 and Ground Floor shear walls & columns casting.",
                    "approval_signature_chain": json.dumps([
                        {"role": "SITE_ENGINEER", "name": "Engr. Tanvir Ahmed", "action": "VERIFIED_ON_SITE", "date": "2026-04-02"},
                        {"role": "QUANTITY_SURVEYOR", "name": "Engr. Rezaul Karim", "action": "RATES_BOQ_CHECKED", "date": "2026-04-03"},
                        {"role": "PROJECT_MANAGER", "name": "Engr. Shamsul Huda", "action": "SCOPE_APPROVED", "date": "2026-04-04"}
                    ]),
                    "items": [
                        {
                            "item_code": "BOQ-STR-01",
                            "item_description": "Mat Foundation R.C.C. Concrete Cast-in-situ (4000 PSI)",
                            "unit_of_measure": "CFT",
                            "contract_rate": Decimal("480.00"),
                            "contract_quantity": Decimal("45000.0000"),
                            "previous_quantity": Decimal("15000.0000"),
                            "current_measured_quantity": Decimal("16000.0000"),
                            "cumulative_quantity": Decimal("31000.0000"),
                            "previous_amount": Decimal("7200000.00"),
                            "current_amount": Decimal("7680000.00"),
                            "cumulative_amount": Decimal("14880000.00"),
                            "location_floor": "Basement 1 Retaining Walls",
                            "measurement_sheet_ref": "JMS-2026-03-B1"
                        },
                        {
                            "item_code": "BOQ-STR-02",
                            "item_description": "High Strength Rebar Fabrication & Binding 60/72.5 Grade",
                            "unit_of_measure": "KG",
                            "contract_rate": Decimal("110.00"),
                            "contract_quantity": Decimal("180000.0000"),
                            "previous_quantity": Decimal("48000.0000"),
                            "current_measured_quantity": Decimal("52454.5454"),
                            "cumulative_quantity": Decimal("100454.5454"),
                            "previous_amount": Decimal("5280000.00"),
                            "current_amount": Decimal("5770000.00"),
                            "cumulative_amount": Decimal("11050000.00"),
                            "location_floor": "Basement 1 Columns & Slabs",
                            "measurement_sheet_ref": "JMS-2026-04-B1"
                        }
                    ]
                }
            ]

            for bill in sample_bills:
                chk = await conn.execute(text("SELECT id FROM con_ra_bills WHERE ra_bill_number = :no"), {"no": bill["ra_bill_number"]})
                bill_id = chk.scalar()
                items = bill.pop("items", [])

                if not bill_id:
                    ins_cols = ", ".join(bill.keys())
                    ins_vals = ", ".join([f":{k}" for k in bill.keys()])
                    res = await conn.execute(text(f"INSERT INTO con_ra_bills ({ins_cols}) VALUES ({ins_vals})"), bill)
                    bill_id = res.lastrowid
                    print(f"Created seed RA Bill: {bill['ra_bill_number']} (ID: {bill_id})")
                else:
                    upd_clause = ", ".join([f"{k} = :{k}" for k in bill.keys()])
                    await conn.execute(text(f"UPDATE con_ra_bills SET {upd_clause} WHERE id = :id"), {**bill, "id": bill_id})
                    print(f"Updated seed RA Bill: {bill['ra_bill_number']} (ID: {bill_id})")

                # Insert items
                await conn.execute(text("DELETE FROM con_ra_bill_items WHERE ra_bill_id = :bid"), {"bid": bill_id})
                for itm in items:
                    itm["ra_bill_id"] = bill_id
                    icols = ", ".join(itm.keys())
                    ivals = ", ".join([f":{k}" for k in itm.keys()])
                    await conn.execute(text(f"INSERT INTO con_ra_bill_items ({icols}) VALUES ({ivals})"), itm)
                print(f"  Inserted {len(items)} measurement items for {bill['ra_bill_number']}")

    print("=================================================================")
    print("RA BILLING DATABASE UPGRADE & SEEDING COMPLETED SUCCESSFULLY")
    print("=================================================================")

if __name__ == "__main__":
    asyncio.run(upgrade_ra_billing())
