import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import engine
from sqlalchemy import text
import json

async def run_migration():
    print("Connecting to MySQL to verify and upgrade Labor Attendance & Quality Inspection tables...")
    async with engine.begin() as conn:
        res = await conn.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = DATABASE() AND table_name LIKE 'con_%'
            ORDER BY table_name;
        """))
        existing_tables = [r[0] for r in res.fetchall()]
        print("Existing con_ tables:", existing_tables)

        # 1. Individual Worker Registry: con_labor_workers
        print("\n--- 1. Setting up Worker Registry (con_labor_workers) ---")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_labor_workers (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                worker_code VARCHAR(64) UNIQUE NOT NULL,
                worker_name VARCHAR(191) NOT NULL,
                worker_type VARCHAR(64) NOT NULL DEFAULT 'SUBCONTRACTOR_LABOR',
                contractor_id BIGINT,
                trade_category VARCHAR(64) NOT NULL DEFAULT 'CIVIL_MASONRY',
                skill_level VARCHAR(32) NOT NULL DEFAULT 'SKILLED',
                phone_number VARCHAR(32),
                nid_number VARCHAR(64),
                daily_wage_rate DECIMAL(10, 2) NOT NULL DEFAULT 800.00,
                hourly_overtime_rate DECIMAL(10, 2) NOT NULL DEFAULT 120.00,
                emergency_contact VARCHAR(128),
                assigned_project_id BIGINT,
                assigned_wbs_node_id BIGINT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                biometric_id VARCHAR(64),
                photo_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_labor_workers_contractor (contractor_id),
                INDEX idx_labor_workers_trade (trade_category),
                INDEX idx_labor_workers_type (worker_type)
            );
        """))

        # 2. Detailed Daily Attendance & Shift Logs: con_labor_attendance
        print("\n--- 2. Setting up Daily Labor Attendance (con_labor_attendance) ---")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_labor_attendance (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                attendance_date DATE NOT NULL,
                project_id BIGINT NOT NULL,
                tower_id BIGINT,
                wbs_node_id BIGINT,
                worker_id BIGINT,
                contractor_id BIGINT,
                worker_type VARCHAR(64) NOT NULL DEFAULT 'SUBCONTRACTOR_LABOR',
                trade_category VARCHAR(64) NOT NULL DEFAULT 'CIVIL_MASONRY',
                crew_gang_name VARCHAR(128),
                shift_type VARCHAR(32) NOT NULL DEFAULT 'DAY_SHIFT',
                check_in_time TIMESTAMP NULL,
                check_out_time TIMESTAMP NULL,
                hours_worked DECIMAL(5, 2) NOT NULL DEFAULT 8.00,
                overtime_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
                attendance_status VARCHAR(32) NOT NULL DEFAULT 'PRESENT',
                daily_wage DECIMAL(10, 2) NOT NULL DEFAULT 800.00,
                overtime_pay DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                total_earned DECIMAL(12, 2) NOT NULL DEFAULT 800.00,
                
                capture_method VARCHAR(64) NOT NULL DEFAULT 'SUPERVISOR_ENTRY',
                gps_latitude DECIMAL(10, 7),
                gps_longitude DECIMAL(10, 7),
                gps_verified BOOLEAN NOT NULL DEFAULT FALSE,
                photo_verified BOOLEAN NOT NULL DEFAULT FALSE,
                photo_url VARCHAR(255),
                biometric_verified BOOLEAN NOT NULL DEFAULT FALSE,

                supervisor_approval_status VARCHAR(32) NOT NULL DEFAULT 'APPROVED_BY_SUPERVISOR',
                approved_by_user_id BIGINT,
                supervisor_remarks TEXT,
                
                subcontractor_payment_id BIGINT,
                is_billed_paid BOOLEAN NOT NULL DEFAULT FALSE,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_attendance_date (attendance_date),
                INDEX idx_attendance_project (project_id),
                INDEX idx_attendance_contractor (contractor_id),
                INDEX idx_attendance_worker (worker_id),
                INDEX idx_attendance_status (attendance_status)
            );
        """))

        # 3. Subcontractor Payments & Certified Payment Vouchers: con_subcontractor_payments
        print("\n--- 3. Setting up Subcontractor Payment Vouchers (con_subcontractor_payments) ---")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_subcontractor_payments (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                voucher_number VARCHAR(64) UNIQUE NOT NULL,
                project_id BIGINT NOT NULL,
                contractor_id BIGINT,
                payment_category VARCHAR(64) NOT NULL DEFAULT 'CONTRACTOR_INVOICE',
                payment_type VARCHAR(64) NOT NULL DEFAULT 'ATTENDANCE_AND_MEASURED_WORK',
                billing_period_start DATE NOT NULL,
                billing_period_end DATE NOT NULL,
                
                total_mandays_verified DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                measured_work_certified_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                attendance_wage_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                gross_payable_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,

                advance_recovery_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                retention_deduction_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                tds_tax_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                vds_vat_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                other_penalties_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                net_certified_payable DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                paid_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,

                status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
                payment_method VARCHAR(64) DEFAULT 'BANK_TRANSFER',
                bank_reference VARCHAR(128),
                payment_date DATE,
                certified_by_user_id BIGINT,
                remarks TEXT,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_subcon_pay_proj (project_id),
                INDEX idx_subcon_pay_contractor (contractor_id),
                INDEX idx_subcon_pay_status (status)
            );
        """))

        # 4. Quality Inspections & ITP Checklists: con_quality_inspections
        print("\n--- 4. Setting up QA/QC Work-Stage Inspections & ITPs (con_quality_inspections) ---")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_quality_inspections (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                inspection_number VARCHAR(64) UNIQUE NOT NULL,
                project_id BIGINT NOT NULL,
                tower_id BIGINT,
                wbs_node_id BIGINT,
                contractor_id BIGINT,
                
                stage_category VARCHAR(64) NOT NULL DEFAULT 'CONCRETE_CASTING',
                structural_location VARCHAR(191) NOT NULL,
                itp_reference_code VARCHAR(64),
                inspection_request_date DATE NOT NULL,
                scheduled_inspection_date DATE NOT NULL,
                
                checklist_items JSON,
                mandatory_checks_passed BOOLEAN NOT NULL DEFAULT FALSE,
                evidence_photos JSON,
                material_test_cert_url VARCHAR(255),
                lab_test_report_id BIGINT,

                verdict VARCHAR(32) NOT NULL DEFAULT 'PENDING_INSPECTION',
                consultant_engineer_name VARCHAR(128),
                inspector_user_id BIGINT,
                remarks TEXT,
                passed_date TIMESTAMP NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_inspections_project (project_id),
                INDEX idx_inspections_stage (stage_category),
                INDEX idx_inspections_verdict (verdict)
            );
        """))

        # 5. Upgrade con_safety_ncrs to Full Defect Lifecycle
        print("\n--- 5. Upgrading SafetyNCR to Full Defect Lifecycle ---")
        col_checks = [
            ("defect_title", "VARCHAR(191)"),
            ("inspection_id", "BIGINT"),
            ("affects_safety_or_structural", "BOOLEAN DEFAULT FALSE"),
            ("escalation_level", "VARCHAR(64) DEFAULT 'PROJECT_LEVEL'"),
            ("corrective_action", "TEXT"),
            ("preventive_action", "TEXT"),
            ("capa_submitted_at", "TIMESTAMP NULL"),
            ("reinspected_by_user_id", "BIGINT"),
            ("reinspection_date", "DATE"),
            ("reinspection_verdict", "VARCHAR(32)"),
            ("closure_approval_remarks", "TEXT"),
            ("closure_approved_by_user_id", "BIGINT")
        ]
        
        # Check existing columns in con_safety_ncrs
        res_cols = await conn.execute(text("""
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'con_safety_ncrs';
        """))
        existing_cols = {r[0].lower() for r in res_cols.fetchall()}
        for col, col_def in col_checks:
            if col.lower() not in existing_cols:
                try:
                    await conn.execute(text(f"ALTER TABLE con_safety_ncrs ADD COLUMN {col} {col_def};"))
                    print(f"Added column {col} to con_safety_ncrs")
                except Exception as e:
                    print(f"Column add error for {col}: {e}")

        # 6. Seed Lookup Categories & Items
        print("\n--- 6. Seeding Dynamic Lookups ---")
        lookups = {
            "LABOR_TRADE": [
                ("TRADE_MASONRY", "Civil Masonry & Brickwork"),
                ("TRADE_REBAR", "Rebar Fitter & Rod Binder"),
                ("TRADE_CARPENTER", "Shuttering & Formwork Carpenter"),
                ("TRADE_CONCRETE", "Concrete Pouring & Vibrating Labor"),
                ("TRADE_PLUMBER", "Plumbing & Sanitary MEP"),
                ("TRADE_ELECTRICIAN", "Electrical Conduiting & Wiring"),
                ("TRADE_TILES", "Tiles & Marble Mason"),
                ("TRADE_PAINTER", "Painter & Finishing"),
                ("TRADE_EQUIP_OPERATOR", "Heavy Equipment & Crane Operator")
            ],
            "ATTENDANCE_STATUS": [
                ("STATUS_PRESENT", "Full Day Present"),
                ("STATUS_HALF_DAY", "Half Day Present"),
                ("STATUS_ABSENT", "Absent / Unexcused"),
                ("STATUS_ON_LEAVE", "Authorized Leave")
            ],
            "SHIFT_TYPE": [
                ("SHIFT_DAY", "Regular Day Shift (8:00 AM - 5:00 PM)"),
                ("SHIFT_NIGHT", "Night Concreting Shift (8:00 PM - 5:00 AM)"),
                ("SHIFT_EXTENDED", "Extended Shift with 4hr Overtime")
            ],
            "WORKER_TYPE": [
                ("SUBCONTRACTOR_LABOR", "Subcontractor Workforce / Gang"),
                ("DIRECT_HIRE_PAYROLL", "Direct Company Payroll Worker")
            ],
            "SUBCON_PAYMENT_TYPE": [
                ("ATTENDANCE_AND_MEASURED_WORK", "Attendance & Measured Work Certification"),
                ("ADVANCE_DISBURSEMENT", "Mobilization Advance Payment"),
                ("RETENTION_RELEASE", "Final Retention Release (50% / 100%)")
            ],
            "INSPECTION_STAGE": [
                ("STAGE_REINFORCEMENT", "Reinforcement Steel & Cover Block Inspection"),
                ("STAGE_CONCRETE_PREPOUR", "Pre-Pour Concrete & Formwork Inspection"),
                ("STAGE_CONCRETE_POSTPOUR", "Post-Pour Deshuttering & Curing Inspection"),
                ("STAGE_MASONRY", "Masonry & DPC Level Inspection"),
                ("STAGE_WATERPROOFING", "Basement / Roof Waterproofing Ponding Test"),
                ("STAGE_PLUMBING", "Plumbing Hydrostatic Pressure Test"),
                ("STAGE_ELECTRICAL", "Electrical Megger & Insulation Test")
            ],
            "DEFECT_SEVERITY": [
                ("SEV_CRITICAL", "Critical - Structural / Safety Immediate Stop"),
                ("SEV_MAJOR", "Major - Rework Required Before Next Stage"),
                ("SEV_MINOR", "Minor - Aesthetic / Snagging Defect")
            ],
            "DEFECT_CATEGORY": [
                ("CAT_STRUCTURAL", "Structural Defect (Honeycombing / Crack / Cold Joint)"),
                ("CAT_REBAR_COVER", "Rebar Spacing & Clear Cover Inadequacy"),
                ("CAT_WATERPROOF", "Waterproofing Leakage & Dampness"),
                ("CAT_SAFETY_HAZARD", "Site Safety Hazard / Fall Protection Missing"),
                ("CAT_FINISHING", "Finishing Plaster / Tile Hollowness")
            ]
        }

        for cat_code, items in lookups.items():
            cat_res = await conn.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"), {"c": cat_code})
            row = cat_res.scalar_one_or_none()
            if not row:
                cat_ins = await conn.execute(text("""
                    INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active)
                    VALUES (:c, :n, :d, TRUE)
                """), {
                    "c": cat_code,
                    "n": cat_code.replace("_", " ").title(),
                    "d": f"Dynamic lookups for {cat_code.replace('_', ' ').lower()}"
                })
                cat_res2 = await conn.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"), {"c": cat_code})
                cat_id = cat_res2.scalar_one()
            else:
                cat_id = row

            for sort_order, (icode, iname) in enumerate(items, 1):
                item_chk = await conn.execute(text("""
                    SELECT id FROM sys_lookup_items 
                    WHERE category_id = :cat_id AND item_code = :icode
                """), {"cat_id": cat_id, "icode": icode})
                if not item_chk.scalar_one_or_none():
                    await conn.execute(text("""
                        INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_active)
                        VALUES (:cat_id, :icode, :iname, :iname, :sort_order, TRUE)
                    """), {"cat_id": cat_id, "icode": icode, "iname": iname, "sort_order": sort_order})

        print("Lookups successfully verified and seeded.")

        # 7. Seed Initial Worker Records and Quality Inspection if empty
        w_res = await conn.execute(text("SELECT count(*) FROM con_labor_workers"))
        if (w_res.scalar() or 0) == 0:
            print("Seeding sample workforce records...")
            c_res = await conn.execute(text("SELECT id FROM con_contractors LIMIT 1"))
            cid = c_res.scalar_one_or_none()
            p_res = await conn.execute(text("SELECT id FROM prj_projects LIMIT 1"))
            pid = p_res.scalar_one_or_none() or 1

            workers = [
                ("WRK-2026-001", "Md. Karim Ullah", "SUBCONTRACTOR_LABOR", cid, "TRADE_MASONRY", "SKILLED", "01711002233", "1990123456789", 900.00, 130.00, pid),
                ("WRK-2026-002", "Jalal Uddin", "SUBCONTRACTOR_LABOR", cid, "TRADE_REBAR", "SKILLED", "01811223344", "1988987654321", 850.00, 120.00, pid),
                ("WRK-2026-003", "Aminul Islam", "SUBCONTRACTOR_LABOR", cid, "TRADE_CARPENTER", "SKILLED", "01911334455", "1992456789012", 850.00, 120.00, pid),
                ("WRK-2026-004", "Abdur Rahim", "DIRECT_HIRE_PAYROLL", None, "TRADE_EQUIP_OPERATOR", "MASTER_FOREMAN", "01611445566", "1985345678901", 1200.00, 180.00, pid),
                ("WRK-2026-005", "Shafiqul Haque", "SUBCONTRACTOR_LABOR", cid, "TRADE_CONCRETE", "UNSKILLED", "01511556677", "1995789012345", 650.00, 95.00, pid)
            ]
            for w in workers:
                await conn.execute(text("""
                    INSERT INTO con_labor_workers (
                        worker_code, worker_name, worker_type, contractor_id, trade_category,
                        skill_level, phone_number, nid_number, daily_wage_rate, hourly_overtime_rate, assigned_project_id
                    ) VALUES (:c, :n, :wt, :cid, :tc, :sl, :ph, :nid, :dw, :hot, :pid);
                """), {
                    "c": w[0], "n": w[1], "wt": w[2], "cid": w[3], "tc": w[4],
                    "sl": w[5], "ph": w[6], "nid": w[7], "dw": w[8], "hot": w[9], "pid": w[10]
                })

            w_ids = (await conn.execute(text("SELECT id, worker_type, trade_category, contractor_id, daily_wage_rate FROM con_labor_workers"))).fetchall()
            for wid, wtype, trade, c_id, wage in w_ids:
                await conn.execute(text("""
                    INSERT INTO con_labor_attendance (
                        project_id, worker_id, contractor_id, worker_type, trade_category,
                        attendance_date, shift_type, hours_worked, overtime_hours, attendance_status,
                        daily_wage, overtime_pay, total_earned, capture_method, gps_verified, photo_verified, supervisor_approval_status
                    ) VALUES (
                        :pid, :wid, :cid, :wt, :tc,
                        CURRENT_DATE, 'DAY_SHIFT', 8.0, 1.5, 'PRESENT',
                        :wage, 180.0, :wage + 180.0, 'MOBILE_GPS', TRUE, TRUE, 'APPROVED_BY_SUPERVISOR'
                    );
                """), {
                    "pid": pid, "wid": wid, "cid": c_id, "wt": wtype, "tc": trade, "wage": wage
                })

        # Seed sample Quality Inspection if empty
        qi_res = await conn.execute(text("SELECT count(*) FROM con_quality_inspections"))
        if (qi_res.scalar() or 0) == 0:
            print("Seeding sample Quality Inspection & Checklist...")
            p_res = await conn.execute(text("SELECT id FROM prj_projects LIMIT 1"))
            pid = p_res.scalar_one_or_none() or 1
            c_res = await conn.execute(text("SELECT id FROM con_contractors LIMIT 1"))
            cid = c_res.scalar_one_or_none()

            sample_checklists = [
                {"check_item": "Reinforcement rebar size and spacing strictly according to structural drawing", "is_mandatory": True, "result": "PASS", "comments": "Checked Grid A1-D4"},
                {"check_item": "Adequate concrete clear cover blocks placed (min 40mm on sides, 50mm bottom)", "is_mandatory": True, "result": "PASS", "comments": "Cover blocks spaced at 1m c/c"},
                {"check_item": "Lap lengths minimum 50d with staggered splices", "is_mandatory": True, "result": "PASS", "comments": "Staggered 600mm apart"},
                {"check_item": "Electrical conduit pipes tied and plumbing sleeves securely positioned", "is_mandatory": True, "result": "PASS", "comments": "MEP verified"},
                {"check_item": "Formwork joints sealed with foam tape to prevent slurry leakage", "is_mandatory": True, "result": "PASS", "comments": "Sealed properly"},
                {"check_item": "Shuttering oil applied and slab surface cleaned of sawdust/debris", "is_mandatory": True, "result": "PASS", "comments": "Cleaned using air blower"}
            ]

            await conn.execute(text("""
                INSERT INTO con_quality_inspections (
                    inspection_number, project_id, contractor_id, stage_category, structural_location,
                    itp_reference_code, inspection_request_date, scheduled_inspection_date, checklist_items, mandatory_checks_passed,
                    verdict, consultant_engineer_name, remarks, passed_date
                ) VALUES (
                    'WIR-PRJ01-2026-001', :pid, :cid, 'STAGE_REINFORCEMENT', 'Tower 1 - 4th Floor Slab Grid A-D',
                    'ITP-CIV-04', CURRENT_DATE, CURRENT_DATE, :cl, TRUE,
                    'PASSED', 'Engr. Mahbubur Rahman, Lead Structural Consultant', 'Reinforcement tying approved. Concreting permitted tomorrow 9:00 AM.', CURRENT_TIMESTAMP
                );
            """), {"pid": pid, "cid": cid, "cl": json.dumps(sample_checklists)})

        # Seed sample payment voucher if none exist
        pv_res = await conn.execute(text("SELECT count(*) FROM con_subcontractor_payments"))
        if (pv_res.scalar() or 0) == 0:
            p_res = await conn.execute(text("SELECT id FROM prj_projects LIMIT 1"))
            pid = p_res.scalar_one_or_none() or 1
            c_res = await conn.execute(text("SELECT id FROM con_contractors LIMIT 1"))
            cid = c_res.scalar_one_or_none()
            await conn.execute(text("""
                INSERT INTO con_subcontractor_payments (
                    voucher_number, project_id, contractor_id, payment_category, payment_type,
                    billing_period_start, billing_period_end, total_mandays_verified,
                    measured_work_certified_amount, attendance_wage_amount, gross_payable_amount,
                    advance_recovery_amount, retention_deduction_amount, tds_tax_amount, vds_vat_amount,
                    net_certified_payable, paid_amount, status, payment_method, remarks
                ) VALUES (
                    'PV-CON-2026-001', :pid, :cid, 'CONTRACTOR_INVOICE', 'ATTENDANCE_AND_MEASURED_WORK',
                    CURRENT_DATE - INTERVAL 15 DAY, CURRENT_DATE, 120.00,
                    150000.00, 96000.00, 246000.00,
                    20000.00, 12300.00, 12300.00, 18450.00,
                    182950.00, 182950.00, 'POSTED_TO_ACCOUNTS', 'BANK_TRANSFER', 'Fortnightly verified labor attendance and measured slab brickwork.'
                );
            """), {"pid": pid, "cid": cid})

    print("MySQL Database Migration finished successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
