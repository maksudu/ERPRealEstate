import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy import text, inspect
from app.core.database import engine

WORK_ORDER_COLUMNS = [
    ("contract_reference", "VARCHAR(128) NULL"),
    ("tower_id", "BIGINT NULL"),
    ("tower_name", "VARCHAR(64) NULL"),
    ("wbs_node_id", "BIGINT NULL"),
    ("wbs_package_name", "VARCHAR(128) NULL"),
    ("contract_title", "VARCHAR(191) NULL"),
    ("contract_model", "VARCHAR(64) NOT NULL DEFAULT 'ITEM_RATE'"),
    ("tender_reference", "VARCHAR(128) NULL"),
    ("technical_specifications", "TEXT NULL"),
    ("original_contract_value", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("approved_variations_value", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("revised_contract_value", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("committed_cost", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("certified_work_value", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("paid_amount", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("start_date", "DATE NULL"),
    ("target_completion_date", "DATE NULL"),
    ("actual_completion_date", "DATE NULL"),
    ("delay_days", "INT NOT NULL DEFAULT 0"),
    ("advance_payment_amount", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("advance_payment_percent", "DECIMAL(5, 2) NOT NULL DEFAULT 0.00"),
    ("advance_recovery_rule", "VARCHAR(128) NULL DEFAULT 'RECOVER_ACROSS_RUNNING_BILLS'"),
    ("advance_recovered_amount", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("retention_release_conditions", "TEXT NULL"),
    ("retention_money_held", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("performance_security_type", "VARCHAR(64) NULL DEFAULT 'BANK_GUARANTEE'"),
    ("performance_security_amount", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("performance_security_expiry", "DATE NULL"),
    ("tds_section", "VARCHAR(64) NULL DEFAULT 'SECTION_52'"),
    ("tds_rate", "DECIMAL(5, 2) NOT NULL DEFAULT 5.00"),
    ("vds_rate", "DECIMAL(5, 2) NOT NULL DEFAULT 7.50"),
    ("delegated_approval_limit", "DECIMAL(14, 2) NOT NULL DEFAULT 50000000.00"),
    ("budget_headroom_alert_percent", "DECIMAL(5, 2) NOT NULL DEFAULT 95.00"),
    ("budget_alert_triggered", "TINYINT(1) NOT NULL DEFAULT 0"),
    ("approval_status", "VARCHAR(32) NOT NULL DEFAULT 'APPROVED'"),
    ("approval_level", "VARCHAR(64) NULL DEFAULT 'PROJECT_DIRECTOR'"),
    ("approved_by_user_id", "BIGINT NULL"),
    ("approval_date", "DATE NULL"),
    ("signed_contract_doc_url", "VARCHAR(255) NULL"),
    ("document_attachments", "TEXT NULL"),
    ("version_number", "INT NOT NULL DEFAULT 1"),
    ("amendment_notes", "TEXT NULL")
]

TABLES_DDL = [
    # 1. Line Items Table (Approved BOQ Quantities & Rates)
    """
    CREATE TABLE IF NOT EXISTS con_work_order_items (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        work_order_id BIGINT NOT NULL,
        boq_item_id BIGINT NULL,
        wbs_node_id BIGINT NULL,
        item_code VARCHAR(64) NOT NULL,
        item_description VARCHAR(255) NOT NULL,
        specification TEXT NULL,
        unit_of_measure VARCHAR(32) NOT NULL DEFAULT 'SFT',
        boq_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        contract_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        approved_unit_rate DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        executed_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        remaining_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cwoi_order (work_order_id),
        INDEX idx_cwoi_boq (boq_item_id),
        INDEX idx_cwoi_wbs (wbs_node_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    # 2. Work Order Milestone Schedules
    """
    CREATE TABLE IF NOT EXISTS con_work_order_milestones (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        work_order_id BIGINT NOT NULL,
        milestone_code VARCHAR(64) NOT NULL,
        milestone_title VARCHAR(191) NOT NULL,
        target_date DATE NOT NULL,
        actual_date DATE NULL,
        weightage_percent DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
        milestone_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        is_critical TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        verification_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cwom_order (work_order_id),
        INDEX idx_cwom_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

LOOKUP_CATEGORIES = [
    ("WORK_ORDER_CONTRACT_MODEL", "Contract Model", "Contract pricing and delivery structure (Item Rate, Lump Sum, Cost Plus, Turnkey)"),
    ("WORK_ORDER_STATUS", "Work Order Execution Status", "Active, Ongoing, Substantially Completed, Closed, Terminated"),
    ("WORK_ORDER_APPROVAL_LEVEL", "Delegated Approval Authority", "Authority tier required for contract execution"),
    ("PERFORMANCE_SECURITY_TYPE", "Performance Security Instrument", "Bank Guarantee, Security Deposit, Pay Order, Cheque"),
    ("ADVANCE_RECOVERY_RULE", "Advance Payment Recovery Method", "Rules for amortizing mobilization advances against RA bills")
]

LOOKUP_ITEMS = [
    # WORK_ORDER_CONTRACT_MODEL
    ("WORK_ORDER_CONTRACT_MODEL", "ITEM_RATE", "Unit Item Rate (BOQ Billable)", "Measurement based on Joint Measurement Sheet & BOQ rates", 1),
    ("WORK_ORDER_CONTRACT_MODEL", "LUMP_SUM", "Lump Sum Fixed Price", "Fixed contract sum with milestone stage disbursements", 2),
    ("WORK_ORDER_CONTRACT_MODEL", "COST_PLUS_PERCENT", "Cost Plus Fee / Percentage", "Actual labor & material cost reimbursement plus agreed profit margin", 3),
    ("WORK_ORDER_CONTRACT_MODEL", "PERCENTAGE_RATE", "Percentage Above / Below BOQ Schedule", "Tender premium or discount applied uniformly across standard schedule of rates", 4),
    ("WORK_ORDER_CONTRACT_MODEL", "TURNKEY_EPC", "Turnkey Design-Build / EPC", "Single-point design, procurement and construction responsibility", 5),

    # WORK_ORDER_STATUS
    ("WORK_ORDER_STATUS", "DRAFT", "Draft Agreement", "Pending formal engineering & pricing review", 1),
    ("WORK_ORDER_STATUS", "PENDING_APPROVAL", "Pending Management Approval", "Submitted to delegated authority for financial limit check", 2),
    ("WORK_ORDER_STATUS", "ACTIVE", "Active Contract", "Signed and mobilized for site execution", 3),
    ("WORK_ORDER_STATUS", "SUBSTANTIALLY_COMPLETED", "Substantially Completed", "Physical completion achieved, pending punchlist & DLP", 4),
    ("WORK_ORDER_STATUS", "CLOSED", "Fully Closed & Reconciled", "Final RA bill settled, retention released after 12M DLP", 5),
    ("WORK_ORDER_STATUS", "TERMINATED", "Terminated", "Contract closed early due to default or mutual agreement", 6),

    # WORK_ORDER_APPROVAL_LEVEL
    ("WORK_ORDER_APPROVAL_LEVEL", "PROJECT_ENGINEER", "Site Project Engineer (Up to BDT 500,000)", "Minor emergency trade repairs", 1),
    ("WORK_ORDER_APPROVAL_LEVEL", "PROJECT_MANAGER", "Project Manager (Up to BDT 5,000,000)", "Standard trade and finishing packages", 2),
    ("WORK_ORDER_APPROVAL_LEVEL", "PROJECT_DIRECTOR", "Project Director (Up to BDT 25,000,000)", "Major structural and MEP packages", 3),
    ("WORK_ORDER_APPROVAL_LEVEL", "MANAGING_DIRECTOR", "Managing Director / Board (Above BDT 25,000,000)", "Turnkey, prime structural and high-value contracts", 4),

    # PERFORMANCE_SECURITY_TYPE
    ("PERFORMANCE_SECURITY_TYPE", "BANK_GUARANTEE", "Irrevocable Bank Guarantee (BG)", "10% unconditional scheduled bank guarantee", 1),
    ("PERFORMANCE_SECURITY_TYPE", "SECURITY_DEPOSIT", "Cash Security Deposit", "Direct deposit held in escrow account", 2),
    ("PERFORMANCE_SECURITY_TYPE", "PAY_ORDER", "Banker Pay Order", "Non-revocable banker's draft", 3),
    ("PERFORMANCE_SECURITY_TYPE", "PDC_CHEQUE", "Post-Dated Security Cheque", "Commercial security instrument with legal undertaking", 4),

    # ADVANCE_RECOVERY_RULE
    ("ADVANCE_RECOVERY_RULE", "RECOVER_ACROSS_RUNNING_BILLS", "Pro-rata 10% Deduction per RA Bill", "Deducts 10% gross certified value from each bill until fully amortized", 1),
    ("ADVANCE_RECOVERY_RULE", "RECOVER_AFTER_50_PERCENT", "Recover After 50% Work Progress", "Deductions commence after half of contract value is certified", 2),
    ("ADVANCE_RECOVERY_RULE", "LUMP_SUM_FINAL_BILL", "Deduct from Final Certificate", "Single lump-sum recovery on final bill", 3)
]

SEED_WORK_ORDERS = [
    {
        "work_order_no": "WO-2026-0001",
        "contract_reference": "CONT-REF-2025/GBH-STR-01",
        "project_id": 1,
        "contractor_id": 1,
        "tower_id": 1,
        "tower_name": "Residential Tower A",
        "wbs_node_id": 1,
        "wbs_package_name": "Substructure & RCC Superstructure",
        "contract_title": "Superstructure RCC Columns, Beams & Slabs Package (Ground to L25)",
        "contract_type": "CIVIL_SUPERSTRUCTURE",
        "contract_model": "ITEM_RATE",
        "tender_reference": "TND-2025-GBH-008",
        "technical_specifications": "Reinforced concrete casting C30/37 (4500 psi cylinder strength), 500W deformed rebar BBS fabrication and heavy formwork staging conforming to BNBC 2020.",
        "total_contract_value": 45000000.00,
        "original_contract_value": 45000000.00,
        "approved_variations_value": 0.00,
        "revised_contract_value": 45000000.00,
        "committed_cost": 45000000.00,
        "certified_work_value": 18250000.00,
        "paid_amount": 16425000.00,
        "retention_money_percent": 5.00,
        "retention_money_held": 912500.00,
        "retention_release_conditions": "50% of retention released upon Substantial Physical Completion; remaining 50% released after 12-month Defect Liability Period (DLP) audit.",
        "defect_liability_months": 12,
        "start_date": "2025-06-01",
        "target_completion_date": "2027-12-31",
        "delay_days": 0,
        "advance_payment_amount": 4500000.00,
        "advance_payment_percent": 10.00,
        "advance_recovery_rule": "RECOVER_ACROSS_RUNNING_BILLS",
        "advance_recovered_amount": 1825000.00,
        "performance_security_type": "BANK_GUARANTEE",
        "performance_security_amount": 4500000.00,
        "performance_security_expiry": "2028-06-30",
        "tds_section": "SECTION_52",
        "tds_rate": 5.00,
        "vds_rate": 7.50,
        "delegated_approval_limit": 60000000.00,
        "budget_headroom_alert_percent": 95.00,
        "budget_alert_triggered": 0,
        "approval_status": "APPROVED",
        "approval_level": "MANAGING_DIRECTOR",
        "approved_by_user_id": 1,
        "approval_date": "2025-05-25",
        "version_number": 1,
        "status": "ACTIVE",
        "scope_of_work": "Turnkey civil structural execution from mat foundation through roof parapet of Tower A. Includes concrete pumping gang, vibrators, and 14-day pond curing."
    },
    {
        "work_order_no": "WO-2026-0002",
        "contract_reference": "CONT-REF-2025/GBH-SHT-02",
        "project_id": 1,
        "contractor_id": 2,
        "tower_id": 1,
        "tower_name": "Residential Tower A",
        "wbs_node_id": 1,
        "wbs_package_name": "Formwork & Scaffolding",
        "contract_title": "DOKA Marine Plywood Formwork & Heavy Shuttering Staging",
        "contract_type": "SHUTTERING_CARPENTRY",
        "contract_model": "ITEM_RATE",
        "tender_reference": "TND-2025-GBH-012",
        "technical_specifications": "18mm film-faced marine ply with DOKA H20 timber beams and Cuplock heavy steel staging certified for 350mm thick transfer plate.",
        "total_contract_value": 14200000.00,
        "original_contract_value": 14200000.00,
        "approved_variations_value": 0.00,
        "revised_contract_value": 14200000.00,
        "committed_cost": 14200000.00,
        "certified_work_value": 4800000.00,
        "paid_amount": 4320000.00,
        "retention_money_percent": 5.00,
        "retention_money_held": 240000.00,
        "retention_release_conditions": "100% released 60 days following roof slab de-shuttering and surface deflection clearance.",
        "defect_liability_months": 6,
        "start_date": "2025-08-01",
        "target_completion_date": "2027-08-31",
        "delay_days": 0,
        "advance_payment_amount": 1420000.00,
        "advance_payment_percent": 10.00,
        "advance_recovery_rule": "RECOVER_ACROSS_RUNNING_BILLS",
        "advance_recovered_amount": 480000.00,
        "performance_security_type": "BANK_GUARANTEE",
        "performance_security_amount": 1420000.00,
        "performance_security_expiry": "2027-11-30",
        "tds_section": "SECTION_52",
        "tds_rate": 5.00,
        "vds_rate": 7.50,
        "delegated_approval_limit": 25000000.00,
        "budget_headroom_alert_percent": 95.00,
        "budget_alert_triggered": 0,
        "approval_status": "APPROVED",
        "approval_level": "PROJECT_DIRECTOR",
        "approved_by_user_id": 1,
        "approval_date": "2025-07-28",
        "version_number": 1,
        "status": "ACTIVE",
        "scope_of_work": "Erection, alignment, de-shuttering and refurbishing of formwork panels across 25 storeys."
    },
    {
        "work_order_no": "WO-2026-0003",
        "contract_reference": "CONT-REF-2025/GBH-RBD-03",
        "project_id": 1,
        "contractor_id": 3,
        "tower_id": 1,
        "tower_name": "Residential Tower A",
        "wbs_node_id": 1,
        "wbs_package_name": "Rebar Reinforcement Binding",
        "contract_title": "High-Yield 500W Deformed Rebar BBS Fabrication & Binding Package",
        "contract_type": "ROD_BINDING",
        "contract_model": "ITEM_RATE",
        "tender_reference": "TND-2025-GBH-014",
        "technical_specifications": "Bar bending schedule cutting, bending, crane hoisting and 18-gauge GI wire binding. 2.50% statutory scrap ceiling.",
        "total_contract_value": 8500000.00,
        "original_contract_value": 8500000.00,
        "approved_variations_value": 0.00,
        "revised_contract_value": 8500000.00,
        "committed_cost": 8500000.00,
        "certified_work_value": 2900000.00,
        "paid_amount": 2610000.00,
        "retention_money_percent": 5.00,
        "retention_money_held": 145000.00,
        "retention_release_conditions": "100% release upon completion of final floor rebar binding reconciliation and scrap audit.",
        "defect_liability_months": 6,
        "start_date": "2025-07-15",
        "target_completion_date": "2027-06-30",
        "delay_days": 0,
        "advance_payment_amount": 850000.00,
        "advance_payment_percent": 10.00,
        "advance_recovery_rule": "RECOVER_ACROSS_RUNNING_BILLS",
        "advance_recovered_amount": 290000.00,
        "performance_security_type": "PAY_ORDER",
        "performance_security_amount": 850000.00,
        "performance_security_expiry": "2027-09-30",
        "tds_section": "SECTION_52",
        "tds_rate": 5.00,
        "vds_rate": 7.50,
        "delegated_approval_limit": 15000000.00,
        "budget_headroom_alert_percent": 95.00,
        "budget_alert_triggered": 0,
        "approval_status": "APPROVED",
        "approval_level": "PROJECT_DIRECTOR",
        "approved_by_user_id": 1,
        "approval_date": "2025-07-10",
        "version_number": 1,
        "status": "ACTIVE",
        "scope_of_work": "Complete rebar binding of foundations, columns, shear walls, beams and two-way slabs."
    }
]

SEED_WORK_ORDER_ITEMS = [
    # WO 1 Items
    {
        "work_order_id": 1,
        "boq_item_id": 1,
        "wbs_node_id": 1,
        "item_code": "BOQ-STR-001",
        "item_description": "Superstructure Ready-Mix Concrete Casting (C30/37)",
        "specification": "Batching, pumping, placing, vibrating and curing of 4500 psi concrete.",
        "unit_of_measure": "CFT",
        "boq_quantity": 450000.0000,
        "contract_quantity": 450000.0000,
        "approved_unit_rate": 28.50,
        "total_amount": 12825000.00,
        "executed_quantity": 182500.0000,
        "remaining_quantity": 267500.0000,
        "remarks": "In progress up to 5th floor"
    },
    {
        "work_order_id": 1,
        "boq_item_id": 1,
        "wbs_node_id": 1,
        "item_code": "BOQ-STR-002",
        "item_description": "Mass Concrete Pouring for 3-Level Basement Mat Foundation",
        "specification": "Chilled temperature controlled pour with continuous 36-hour pumping crew.",
        "unit_of_measure": "CFT",
        "boq_quantity": 380000.0000,
        "contract_quantity": 380000.0000,
        "approved_unit_rate": 32.00,
        "total_amount": 12160000.00,
        "executed_quantity": 380000.0000,
        "remaining_quantity": 0.0000,
        "remarks": "Mat casting 100% completed and cured"
    },
    # WO 2 Items
    {
        "work_order_id": 2,
        "boq_item_id": 1,
        "wbs_node_id": 1,
        "item_code": "BOQ-SHT-001",
        "item_description": "Marine Plywood Shuttering for Slab & Beam Soffits",
        "specification": "18mm film-faced marine ply on DOKA H20 timber beams.",
        "unit_of_measure": "SFT",
        "boq_quantity": 350000.0000,
        "contract_quantity": 350000.0000,
        "approved_unit_rate": 24.00,
        "total_amount": 8400000.00,
        "executed_quantity": 120000.0000,
        "remaining_quantity": 230000.0000,
        "remarks": "Formwork active on Level 5"
    },
    # WO 3 Items
    {
        "work_order_id": 3,
        "boq_item_id": 1,
        "wbs_node_id": 1,
        "item_code": "BOQ-RBD-001",
        "item_description": "500W Deformed Rebar Cutting, Bending & Binding",
        "specification": "BBS compliant 8mm-32mm rebar wire tying.",
        "unit_of_measure": "KG",
        "boq_quantity": 1200000.0000,
        "contract_quantity": 1200000.0000,
        "approved_unit_rate": 4.80,
        "total_amount": 5760000.00,
        "executed_quantity": 410000.0000,
        "remaining_quantity": 790000.0000,
        "remarks": "Rebar binding completed up to Level 5 slab"
    }
]

SEED_WORK_ORDER_MILESTONES = [
    {
        "work_order_id": 1,
        "milestone_code": "MS-01",
        "milestone_title": "Basement Mat Foundation Pour & Curing Completion",
        "target_date": "2025-10-31",
        "actual_date": "2025-10-28",
        "weightage_percent": 25.00,
        "milestone_amount": 11250000.00,
        "is_critical": 1,
        "status": "ACHIEVED",
        "verification_notes": "Cube test cylinder strengths achieved 4850 psi at 28 days."
    },
    {
        "work_order_id": 1,
        "milestone_code": "MS-02",
        "milestone_title": "Ground Floor to 5th Floor RCC Superstructure",
        "target_date": "2026-04-30",
        "actual_date": "2026-04-15",
        "weightage_percent": 20.00,
        "milestone_amount": 9000000.00,
        "is_critical": 1,
        "status": "ACHIEVED",
        "verification_notes": "L5 slab successfully casted and inspected."
    },
    {
        "work_order_id": 1,
        "milestone_code": "MS-03",
        "milestone_title": "6th Floor to 15th Floor RCC Superstructure",
        "target_date": "2026-12-31",
        "actual_date": None,
        "weightage_percent": 25.00,
        "milestone_amount": 11250000.00,
        "is_critical": 1,
        "status": "IN_PROGRESS",
        "verification_notes": "Currently preparing Level 6 columns and formwork staging."
    },
    {
        "work_order_id": 1,
        "milestone_code": "MS-04",
        "milestone_title": "16th Floor to 25th Floor & Roof Top Parapet",
        "target_date": "2027-10-31",
        "actual_date": None,
        "weightage_percent": 30.00,
        "milestone_amount": 13500000.00,
        "is_critical": 1,
        "status": "PENDING",
        "verification_notes": "Scheduled for 2027."
    }
]

async def run_upgrade():
    print("=== Upgrading Work Orders & Contract Management Database ===")
    async with engine.begin() as conn:
        # Check existing columns on con_work_orders
        existing_cols = await conn.run_sync(lambda sync_conn: [c["name"] for c in inspect(sync_conn).get_columns("con_work_orders")])
        for col_name, col_def in WORK_ORDER_COLUMNS:
            if col_name not in existing_cols:
                try:
                    await conn.execute(text(f"ALTER TABLE con_work_orders ADD COLUMN {col_name} {col_def}"))
                    print(f"Added column {col_name} to con_work_orders")
                except Exception as e:
                    print(f"Column notice for {col_name}: {e}")

        # Execute DDL for con_work_order_items & con_work_order_milestones
        for ddl in TABLES_DDL:
            try:
                await conn.execute(text(ddl))
                print("DDL table executed successfully.")
            except Exception as e:
                print(f"DDL notice (may already exist): {e}")

        # Seed Lookup Categories
        for code, name, desc in LOOKUP_CATEGORIES:
            await conn.execute(text("""
                INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active)
                VALUES (:code, :name, :desc, 1)
                ON DUPLICATE KEY UPDATE category_name = :name, description = :desc
            """), {"code": code, "name": name, "desc": desc})

        # Seed Lookup Items
        for cat_code, item_code, item_name, desc, sort_ord in LOOKUP_ITEMS:
            res = await conn.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"), {"c": cat_code})
            row = res.fetchone()
            if row:
                cat_id = row[0]
                chk = await conn.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :icode"),
                    {"cid": cat_id, "icode": item_code}
                )
                if not chk.fetchone():
                    await conn.execute(text("""
                        INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_default, is_active)
                        VALUES (:cid, :icode, :iname, :iname, '#3B82F6', :sort_ord, 0, 1)
                    """), {"cid": cat_id, "icode": item_code, "iname": item_name, "sort_ord": sort_ord})

        # Seed Work Orders
        for wo in SEED_WORK_ORDERS:
            chk = await conn.execute(text("SELECT id FROM con_work_orders WHERE work_order_no = :no"), {"no": wo["work_order_no"]})
            existing = chk.fetchone()
            if not existing:
                await conn.execute(text("""
                    INSERT INTO con_work_orders (
                        work_order_no, contract_reference, project_id, contractor_id, tower_id, tower_name,
                        wbs_node_id, wbs_package_name, contract_title, contract_type, contract_model,
                        tender_reference, technical_specifications, total_contract_value, original_contract_value,
                        approved_variations_value, revised_contract_value, committed_cost, certified_work_value,
                        paid_amount, retention_money_percent, retention_money_held, retention_release_conditions,
                        defect_liability_months, start_date, target_completion_date, delay_days,
                        advance_payment_amount, advance_payment_percent, advance_recovery_rule, advance_recovered_amount,
                        performance_security_type, performance_security_amount, performance_security_expiry,
                        tds_section, tds_rate, vds_rate, delegated_approval_limit, budget_headroom_alert_percent,
                        budget_alert_triggered, approval_status, approval_level, approved_by_user_id, approval_date,
                        version_number, status, scope_of_work
                    ) VALUES (
                        :work_order_no, :contract_reference, :project_id, :contractor_id, :tower_id, :tower_name,
                        :wbs_node_id, :wbs_package_name, :contract_title, :contract_type, :contract_model,
                        :tender_reference, :technical_specifications, :total_contract_value, :original_contract_value,
                        :approved_variations_value, :revised_contract_value, :committed_cost, :certified_work_value,
                        :paid_amount, :retention_money_percent, :retention_money_held, :retention_release_conditions,
                        :defect_liability_months, :start_date, :target_completion_date, :delay_days,
                        :advance_payment_amount, :advance_payment_percent, :advance_recovery_rule, :advance_recovered_amount,
                        :performance_security_type, :performance_security_amount, :performance_security_expiry,
                        :tds_section, :tds_rate, :vds_rate, :delegated_approval_limit, :budget_headroom_alert_percent,
                        :budget_alert_triggered, :approval_status, :approval_level, :approved_by_user_id, :approval_date,
                        :version_number, :status, :scope_of_work
                    )
                """), wo)
                print(f"Seeded work order: {wo['work_order_no']}")
            else:
                wo_id = existing[0]
                update_dict = dict(wo)
                update_dict["wo_id"] = wo_id
                await conn.execute(text("""
                    UPDATE con_work_orders SET
                        contract_reference = :contract_reference,
                        tower_id = :tower_id,
                        tower_name = :tower_name,
                        wbs_node_id = :wbs_node_id,
                        wbs_package_name = :wbs_package_name,
                        contract_title = :contract_title,
                        contract_model = :contract_model,
                        tender_reference = :tender_reference,
                        technical_specifications = :technical_specifications,
                        original_contract_value = :original_contract_value,
                        approved_variations_value = :approved_variations_value,
                        revised_contract_value = :revised_contract_value,
                        committed_cost = :committed_cost,
                        certified_work_value = :certified_work_value,
                        paid_amount = :paid_amount,
                        retention_money_percent = :retention_money_percent,
                        retention_money_held = :retention_money_held,
                        retention_release_conditions = :retention_release_conditions,
                        defect_liability_months = :defect_liability_months,
                        start_date = :start_date,
                        target_completion_date = :target_completion_date,
                        delay_days = :delay_days,
                        advance_payment_amount = :advance_payment_amount,
                        advance_payment_percent = :advance_payment_percent,
                        advance_recovery_rule = :advance_recovery_rule,
                        advance_recovered_amount = :advance_recovered_amount,
                        performance_security_type = :performance_security_type,
                        performance_security_amount = :performance_security_amount,
                        performance_security_expiry = :performance_security_expiry,
                        tds_section = :tds_section,
                        tds_rate = :tds_rate,
                        vds_rate = :vds_rate,
                        delegated_approval_limit = :delegated_approval_limit,
                        budget_headroom_alert_percent = :budget_headroom_alert_percent,
                        budget_alert_triggered = :budget_alert_triggered,
                        approval_status = :approval_status,
                        approval_level = :approval_level,
                        approved_by_user_id = :approved_by_user_id,
                        approval_date = :approval_date,
                        version_number = :version_number,
                        status = :status,
                        scope_of_work = :scope_of_work
                    WHERE id = :wo_id
                """), update_dict)
                print(f"Updated work order: {wo['work_order_no']}")

        # Seed Items
        for item in SEED_WORK_ORDER_ITEMS:
            chk = await conn.execute(
                text("SELECT id FROM con_work_order_items WHERE work_order_id = :wid AND item_code = :c"),
                {"wid": item["work_order_id"], "c": item["item_code"]}
            )
            if not chk.fetchone():
                await conn.execute(text("""
                    INSERT INTO con_work_order_items (
                        work_order_id, boq_item_id, wbs_node_id, item_code, item_description,
                        specification, unit_of_measure, boq_quantity, contract_quantity,
                        approved_unit_rate, total_amount, executed_quantity, remaining_quantity, remarks
                    ) VALUES (
                        :work_order_id, :boq_item_id, :wbs_node_id, :item_code, :item_description,
                        :specification, :unit_of_measure, :boq_quantity, :contract_quantity,
                        :approved_unit_rate, :total_amount, :executed_quantity, :remaining_quantity, :remarks
                    )
                """), item)
                print(f"Seeded work order item: {item['item_code']}")

        # Seed Milestones
        for ms in SEED_WORK_ORDER_MILESTONES:
            chk = await conn.execute(
                text("SELECT id FROM con_work_order_milestones WHERE work_order_id = :wid AND milestone_code = :c"),
                {"wid": ms["work_order_id"], "c": ms["milestone_code"]}
            )
            if not chk.fetchone():
                await conn.execute(text("""
                    INSERT INTO con_work_order_milestones (
                        work_order_id, milestone_code, milestone_title, target_date, actual_date,
                        weightage_percent, milestone_amount, is_critical, status, verification_notes
                    ) VALUES (
                        :work_order_id, :milestone_code, :milestone_title, :target_date, :actual_date,
                        :weightage_percent, :milestone_amount, :is_critical, :status, :verification_notes
                    )
                """), ms)
                print(f"Seeded milestone: {ms['milestone_code']}")

    print("=== Work Order & Contract Management Upgrade Complete ===")

if __name__ == "__main__":
    asyncio.run(run_upgrade())
