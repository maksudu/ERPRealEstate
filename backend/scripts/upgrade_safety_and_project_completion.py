import asyncio
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import engine
from sqlalchemy import text

async def run_migration():
    print("Connecting to MySQL to execute Safety Incidents & Project Completion migration...")
    async with engine.begin() as conn:
        # 1. Safety Incidents & Investigations
        print("\n--- 1. Creating Table con_safety_incidents ---")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_safety_incidents (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                incident_code VARCHAR(50) NOT NULL UNIQUE,
                incident_title VARCHAR(255) NOT NULL,
                project_id BIGINT NOT NULL,
                contractor_id BIGINT NULL,
                wbs_node_id BIGINT NULL,
                incident_date DATE NOT NULL,
                incident_time VARCHAR(20) NULL,
                exact_location VARCHAR(255) NOT NULL,
                incident_type VARCHAR(60) NOT NULL DEFAULT 'NEAR_MISS',
                severity_level VARCHAR(40) NOT NULL DEFAULT 'MEDIUM',
                injured_person_type VARCHAR(60) NULL DEFAULT 'WORKER',
                injured_person_name VARCHAR(200) NULL,
                injured_worker_id BIGINT NULL,
                injury_nature VARCHAR(255) NULL,
                body_part_affected VARCHAR(100) NULL,
                days_lost_count INT NOT NULL DEFAULT 0,
                property_damage_estimated_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                incident_description TEXT NOT NULL,
                root_cause_analysis TEXT NULL,
                immediate_action_taken TEXT NULL,
                corrective_preventive_action TEXT NULL,
                responsible_person_name VARCHAR(150) NULL,
                capa_due_date DATE NULL,
                investigation_status VARCHAR(50) NOT NULL DEFAULT 'REPORTED',
                investigated_by_user_id BIGINT NULL,
                investigation_date DATE NULL,
                emergency_escalation_notified BOOLEAN NOT NULL DEFAULT FALSE,
                escalated_to_management_at DATETIME NULL,
                is_confidential_medical BOOLEAN NOT NULL DEFAULT FALSE,
                incident_photo_urls JSON NULL,
                police_or_regulatory_report_filed BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_safe_inc_proj (project_id),
                INDEX idx_safe_inc_date (incident_date),
                INDEX idx_safe_inc_type (incident_type),
                INDEX idx_safe_inc_status (investigation_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 2. Safety Inductions & Training Sessions
        print("\n--- 2. Creating Table con_safety_inductions_trainings ---")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_safety_inductions_trainings (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                training_code VARCHAR(50) NOT NULL UNIQUE,
                project_id BIGINT NOT NULL,
                contractor_id BIGINT NULL,
                training_type VARCHAR(60) NOT NULL DEFAULT 'SITE_INDUCTION',
                session_title VARCHAR(255) NOT NULL,
                trainer_name VARCHAR(150) NOT NULL,
                trainer_designation VARCHAR(150) NULL,
                training_date DATE NOT NULL,
                duration_minutes INT NOT NULL DEFAULT 45,
                location_room_zone VARCHAR(200) NULL,
                attendees_count INT NOT NULL DEFAULT 0,
                attendees_list JSON NULL,
                topics_covered TEXT NULL,
                feedback_summary TEXT NULL,
                photo_url VARCHAR(500) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_safe_trn_proj (project_id),
                INDEX idx_safe_trn_date (training_date),
                INDEX idx_safe_trn_type (training_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 3. Permits-To-Work (PTW) for Controlled High-Risk Activities
        print("\n--- 3. Creating Table con_permits_to_work ---")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_permits_to_work (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                permit_number VARCHAR(50) NOT NULL UNIQUE,
                project_id BIGINT NOT NULL,
                contractor_id BIGINT NULL,
                permit_type VARCHAR(60) NOT NULL DEFAULT 'HOT_WORK',
                work_location VARCHAR(255) NOT NULL,
                scope_of_controlled_activity TEXT NOT NULL,
                valid_from_time DATETIME NOT NULL,
                valid_to_time DATETIME NOT NULL,
                hazard_controls_in_place JSON NULL,
                requested_by_supervisor_name VARCHAR(150) NOT NULL,
                request_timestamp DATETIME NOT NULL,
                safety_officer_name VARCHAR(150) NULL,
                safety_officer_verified BOOLEAN NOT NULL DEFAULT FALSE,
                project_manager_approved BOOLEAN NOT NULL DEFAULT FALSE,
                approved_by_name VARCHAR(150) NULL,
                approval_timestamp DATETIME NULL,
                permit_status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
                closure_inspection_notes TEXT NULL,
                closed_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ptw_proj (project_id),
                INDEX idx_ptw_status (permit_status),
                INDEX idx_ptw_valid (valid_from_time, valid_to_time)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 4. Project Completion & Handover Dossier
        print("\n--- 4. Creating Table con_project_completions ---")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_project_completions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                completion_code VARCHAR(50) NOT NULL UNIQUE,
                project_id BIGINT NOT NULL UNIQUE,
                target_handover_date DATE NOT NULL,
                actual_completion_date DATE NULL,
                stage_status VARCHAR(60) NOT NULL DEFAULT 'IN_RECONCILIATION',
                wbs_activities_completion_pct DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
                total_boq_reconciled_items_count INT NOT NULL DEFAULT 0,
                final_reconciled_cost_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                original_budget_cost_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                cost_variance_amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                outstanding_contractor_bills_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                retention_money_locked_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                retention_release_authorized BOOLEAN NOT NULL DEFAULT FALSE,
                materials_store_reconciliation_cleared BOOLEAN NOT NULL DEFAULT FALSE,
                equipment_store_reconciliation_cleared BOOLEAN NOT NULL DEFAULT FALSE,
                open_quality_defects_count INT NOT NULL DEFAULT 0,
                open_safety_incidents_count INT NOT NULL DEFAULT 0,
                as_built_drawings_submitted BOOLEAN NOT NULL DEFAULT FALSE,
                as_built_drawings_ref_url VARCHAR(500) NULL,
                om_manuals_submitted BOOLEAN NOT NULL DEFAULT FALSE,
                om_manuals_ref_url VARCHAR(500) NULL,
                warranties_collected_count INT NOT NULL DEFAULT 0,
                warranties_summary_url VARCHAR(500) NULL,
                mandatory_items_all_cleared BOOLEAN NOT NULL DEFAULT FALSE,
                permitted_punchlist_exceptions JSON NULL,
                taking_over_certificate_url VARCHAR(500) NULL,
                project_manager_signoff BOOLEAN NOT NULL DEFAULT FALSE,
                pm_name VARCHAR(150) NULL,
                pm_signoff_at DATETIME NULL,
                project_director_signoff BOOLEAN NOT NULL DEFAULT FALSE,
                director_name VARCHAR(150) NULL,
                director_signoff_at DATETIME NULL,
                remarks TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_proj_comp_proj (project_id),
                INDEX idx_proj_comp_status (stage_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 5. Punchlist Snags Tracking
        print("\n--- 5. Creating Table con_punchlist_items ---")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_punchlist_items (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                completion_id BIGINT NOT NULL,
                project_id BIGINT NOT NULL,
                item_code VARCHAR(50) NOT NULL UNIQUE,
                category VARCHAR(60) NOT NULL DEFAULT 'Architectural Finishing',
                location_floor_unit VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                photo_url VARCHAR(500) NULL,
                assigned_contractor_id BIGINT NULL,
                contractor_name VARCHAR(200) NULL,
                severity VARCHAR(40) NOT NULL DEFAULT 'MINOR_COSMETIC',
                target_rectification_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
                reinspected_by_name VARCHAR(150) NULL,
                closed_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_punch_comp (completion_id),
                INDEX idx_punch_proj (project_id),
                INDEX idx_punch_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 6. Seed Lookup Categories & Items
        print("\n--- 6. Seeding Dynamic Lookups for Safety & Completion ---")
        lookup_cats = [
            ("INCIDENT_TYPE", "Safety Incident Classifications", "Near miss, first aid, injury, property damage, environmental spill"),
            ("INCIDENT_SEVERITY", "Incident Severity Levels", "Low, Medium, High, Critical / Fatal"),
            ("SAFETY_TRAINING_TYPE", "HSE Training & Induction Types", "Toolbox talks, site inductions, height safety, fire safety"),
            ("PERMIT_TO_WORK_TYPE", "Permit to Work (PTW) Types", "Hot work, height safety, confined space, electrical LOTO"),
            ("PTW_STATUS", "Permit to Work Workflow Statuses", "Requested, Approved & Active, Suspended, Expired, Closed"),
            ("COMPLETION_STAGE", "Project Closeout Stages", "In Reconciliation, Management Review, Substantially Completed, Formally Closed"),
            ("PUNCHLIST_SEVERITY", "Punchlist Severity Ratings", "Minor Cosmetic, Operational Snag, Mandatory Critical"),
            ("PUNCHLIST_CATEGORY", "Punchlist Trade Categories", "Architectural, MEP, Civil, Fire/Safety, Landscaping")
        ]

        for code, name, desc in lookup_cats:
            await conn.execute(text("""
                INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active)
                VALUES (:code, :name, :desc, TRUE)
                ON DUPLICATE KEY UPDATE category_name = VALUES(category_name), description = VALUES(description);
            """), {"code": code, "name": name, "desc": desc})

        lookup_items = [
            ("INCIDENT_TYPE", "NEAR_MISS", "Near-Miss Hazard (No Injury/Damage)", "আসন্ন বিপদ (কোন আঘাত নেই)", 10),
            ("INCIDENT_TYPE", "FIRST_AID", "First-Aid Case (Minor Injury)", "প্রাথমিক চিকিৎসা", 20),
            ("INCIDENT_TYPE", "MEDICAL_TREATMENT", "Medical Treatment Case (Doctor visit)", "চিকিৎসা গ্রহণ আঘাত", 30),
            ("INCIDENT_TYPE", "LOST_TIME_INJURY", "Lost-Time Injury (LTI > 1 Shift)", "কর্মবিরতিজনিত গুরুতর আঘাত", 40),
            ("INCIDENT_TYPE", "PROPERTY_DAMAGE", "Machinery / Material Property Damage", "যন্ত্রপাতি বা মালামালের ক্ষতি", 50),
            ("INCIDENT_TYPE", "ENVIRONMENTAL_SPILL", "Chemical / Fuel Environmental Spill", "পরিবেশ দূষণ বা তেল নিঃসরণ", 60),

            ("INCIDENT_SEVERITY", "LOW", "Low (Negligible impact, immediate return)", "স্বল্প ঝুঁকি", 10),
            ("INCIDENT_SEVERITY", "MEDIUM", "Medium (Moderate injury / localized damage)", "মাঝারি ঝুঁকি", 20),
            ("INCIDENT_SEVERITY", "HIGH", "High (Serious injury / significant damage)", "উচ্চ ঝুঁকি", 30),
            ("INCIDENT_SEVERITY", "CRITICAL", "Critical (Catastrophic / Life threatening)", "চরম ঝুঁকিপূর্ণ", 40),

            ("SAFETY_TRAINING_TYPE", "SITE_INDUCTION", "Site Safety Induction (New Workers)", "সাইট সেফটি পরিচিতি", 10),
            ("SAFETY_TRAINING_TYPE", "TOOLBOX_TALK", "Pre-Shift Daily Toolbox Talk (TBT)", "দৈনিক টুলবক্স আলোচনা", 20),
            ("SAFETY_TRAINING_TYPE", "WORKING_AT_HEIGHT", "Fall Protection & Height Harness Training", "উঁচু স্থানে কাজের নিরাপত্তা", 30),
            ("SAFETY_TRAINING_TYPE", "FIRE_SAFETY", "Fire Prevention & Extinguisher Drill", "অগ্নি নিরাপত্তা মহড়া", 40),
            ("SAFETY_TRAINING_TYPE", "CONFINED_SPACE", "Confined Space & Basement Trench Safety", "বদ্ধ স্থানে কাজের নিরাপত্তা", 50),
            ("SAFETY_TRAINING_TYPE", "ELECTRICAL_SAFETY", "Electrical Isolation & LOTO Procedures", "বৈদ্যুতিক নিরাপত্তা", 60),

            ("PERMIT_TO_WORK_TYPE", "HOT_WORK", "Hot Work Permit (Welding, Gas Cutting)", "হট ওয়ার্ক অনুমতি", 10),
            ("PERMIT_TO_WORK_TYPE", "WORKING_AT_HEIGHT", "Working at Height (> 2.0 meters)", "উঁচুতে কাজের অনুমতি", 20),
            ("PERMIT_TO_WORK_TYPE", "CONFINED_SPACE", "Confined Space Entry (Tanks, Basements)", "বদ্ধ স্থানে প্রবেশের অনুমতি", 30),
            ("PERMIT_TO_WORK_TYPE", "DEEP_EXCAVATION", "Deep Excavation & Trenching (> 1.5m)", "গভীর মাটি খনন অনুমতি", 40),
            ("PERMIT_TO_WORK_TYPE", "ELECTRICAL_ISOLATION", "High Voltage Isolation (LOTO)", "বিদ্যুৎ লাইন আইসোলেশন", 50),
            ("PERMIT_TO_WORK_TYPE", "HEAVY_LIFTING", "Tower Crane Heavy Rigging & Lifting", "ভারী উত্তোলন অনুমতি", 60),

            ("PTW_STATUS", "REQUESTED", "Requested (Pending Site Verification)", "অনুরোধকৃত", 10),
            ("PTW_STATUS", "APPROVED_ACTIVE", "Approved & Active (Clear to Work)", "অনুমোদিত ও সক্রিয়", 20),
            ("PTW_STATUS", "SUSPENDED", "Suspended (Unsafe Conditions / Weather)", "স্থগিত", 30),
            ("PTW_STATUS", "CLOSED_SURRENDERED", "Closed & Surrendered (Activity Complete)", "সম্পন্ন ও বন্ধ", 40),

            ("COMPLETION_STAGE", "IN_RECONCILIATION", "Final Measurement & Cost Reconciliation", "চূড়ান্ত পরিমাপ ও হিসাব", 10),
            ("COMPLETION_STAGE", "MANAGEMENT_REVIEW", "Management & As-Built Review", "ম্যানেজমেন্ট পর্যালোচনা", 20),
            ("COMPLETION_STAGE", "SUBSTANTIALLY_COMPLETED", "Substantially Completed (Taking-Over Issued)", "মৌলিক কাজ সম্পন্ন", 30),
            ("COMPLETION_STAGE", "FORMALLY_CLOSED", "Formally Closed (Full Handover & Release)", "চূড়ান্ত হস্তান্তর সম্পন্ন", 40),

            ("PUNCHLIST_SEVERITY", "MINOR_COSMETIC", "Minor Cosmetic Snag (Paint touch-up, polish)", "সামান্য ত্রুটি", 10),
            ("PUNCHLIST_SEVERITY", "OPERATIONAL", "Operational Snag (Door hinge, tap alignment)", "কার্যকরী ত্রুটি", 20),
            ("PUNCHLIST_SEVERITY", "MANDATORY_CRITICAL", "Mandatory Critical (Handrail missing, leak)", "বাধ্যতামূলক ত্রুটি", 30),

            ("PUNCHLIST_CATEGORY", "ARCHITECTURAL", "Architectural Finishing & Paint", "স্থাপত্য ও ফিনিশিং", 10),
            ("PUNCHLIST_CATEGORY", "MEP", "MEP, Electrical & Sanitary Fixtures", "ইলেকট্রিক্যাল ও প্লাম্বিং", 20),
            ("PUNCHLIST_CATEGORY", "CIVIL", "Civil, Plaster & Waterproofing", "সিভিল ও ওয়াটারপ্রুফিং", 30),
            ("PUNCHLIST_CATEGORY", "FIRE_LIFE_SAFETY", "Fire Detection & Life Safety System", "অগ্নি ও জীবন নিরাপত্তা", 40),
            ("PUNCHLIST_CATEGORY", "LANDSCAPING", "External Paving & Landscaping", "বাহ্যিক ল্যান্ডস্কেপিং", 50)
        ]

        for cat_code, code, name_en, name_bn, order in lookup_items:
            cat_res = await conn.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"), {"c": cat_code})
            row = cat_res.scalar_one_or_none()
            if row:
                cat_id = row
                item_chk = await conn.execute(text("""
                    SELECT id FROM sys_lookup_items WHERE category_id = :cat_id AND item_code = :icode
                """), {"cat_id": cat_id, "icode": code})
                if not item_chk.scalar_one_or_none():
                    await conn.execute(text("""
                        INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_active)
                        VALUES (:cat_id, :icode, :en, :bn, :ord, TRUE)
                    """), {"cat_id": cat_id, "icode": code, "en": name_en, "bn": name_bn, "ord": order})

        # 7. Seed Sample HSE & Completion Records
        print("\n--- 7. Seeding Initial HSE & Completion Records ---")
        # Sample Safety Incident
        await conn.execute(text("""
            INSERT IGNORE INTO con_safety_incidents (
                incident_code, incident_title, project_id, exact_location, incident_date, incident_time,
                incident_type, severity_level, injured_person_type, injured_person_name, injury_nature,
                body_part_affected, days_lost_count, property_damage_estimated_cost, incident_description,
                root_cause_analysis, immediate_action_taken, corrective_preventive_action, responsible_person_name,
                capa_due_date, investigation_status, emergency_escalation_notified, is_confidential_medical
            ) VALUES (
                'INC-2026-0001', 'Loose Timber Shuttering Fell Near Walkway (Near Miss)', 1, 'Tower A - North Perimeter Walkway',
                CURRENT_DATE, '11:15 AM', 'NEAR_MISS', 'MEDIUM', 'NONE', NULL, NULL, NULL, 0, 0.00,
                'During 7th-floor column deshhuttering, an unsecured 4x2 timber batten slipped and plummeted to the ground safety catchment net.',
                'Absence of secondary tethering rope during stripping of high-elevation formwork.',
                'Barricaded the ground perimeter with hazard tape; issued stop-work to deshutting crew.',
                'Tethering lanyards made mandatory for all formwork removal tools; toolbox talk conducted.',
                'Engr. M. A. Karim (Site Safety Officer)', CURRENT_DATE + INTERVAL 2 DAY, 'RESOLVED', FALSE, FALSE
            );
        """))

        # Sample Safety Induction / TBT
        await conn.execute(text("""
            INSERT IGNORE INTO con_safety_inductions_trainings (
                training_code, project_id, training_type, session_title, trainer_name, trainer_designation,
                training_date, duration_minutes, location_room_zone, attendees_count, topics_covered, feedback_summary
            ) VALUES (
                'TRN-2026-0001', 1, 'TOOLBOX_TALK', 'Working at Height & Double Lanyard Harness Protocol',
                'Engr. M. A. Karim', 'Chief HSE Engineer', CURRENT_DATE, 30, 'Site Ground Safety Shed',
                28, '100% tie-off requirement, static lifeline inspection, rejection of damaged webbing.',
                'All 28 scaffolding and rebar workers demonstrated 100% hook lock engagement.'
            );
        """))

        # Sample Permit To Work
        await conn.execute(text("""
            INSERT IGNORE INTO con_permits_to_work (
                permit_number, project_id, permit_type, work_location, scope_of_controlled_activity,
                valid_from_time, valid_to_time, requested_by_supervisor_name, request_timestamp,
                safety_officer_name, safety_officer_verified, project_manager_approved, approved_by_name,
                permit_status
            ) VALUES (
                'PTW-2026-0001', 1, 'HOT_WORK', 'Tower A - 8th Floor Slab Grid C3',
                'Arc welding and cutting of structural steel shear studs and embedment plates.',
                NOW(), NOW() + INTERVAL 8 HOUR, 'Rafiqul Islam (Fabrication Foreman)', NOW(),
                'Engr. M. A. Karim', TRUE, TRUE, 'Engr. Tanvir Ahmed (Project Manager)', 'APPROVED_ACTIVE'
            );
        """))

        # Sample Project Completion Dossier
        await conn.execute(text("""
            INSERT IGNORE INTO con_project_completions (
                completion_code, project_id, target_handover_date, actual_completion_date, stage_status,
                wbs_activities_completion_pct, total_boq_reconciled_items_count, final_reconciled_cost_bdt,
                original_budget_cost_bdt, cost_variance_amount_bdt, outstanding_contractor_bills_amount,
                retention_money_locked_bdt, retention_release_authorized, materials_store_reconciliation_cleared,
                equipment_store_reconciliation_cleared, open_quality_defects_count, open_safety_incidents_count,
                as_built_drawings_submitted, om_manuals_submitted, warranties_collected_count,
                mandatory_items_all_cleared, project_manager_signoff, pm_name, remarks
            ) VALUES (
                'PRJ-COMPL-0001', 1, '2026-11-30', NULL, 'IN_RECONCILIATION',
                98.50, 142, 128500000.00, 125000000.00, 3500000.00, 2450000.00,
                6425000.00, FALSE, TRUE, TRUE, 0, 0,
                TRUE, TRUE, 12, TRUE, TRUE, 'Engr. Tanvir Ahmed',
                'Project entering final snagging and commercial accounts retention release review.'
            );
        """))

        # Sample Punchlist item
        await conn.execute(text("""
            INSERT IGNORE INTO con_punchlist_items (
                completion_id, project_id, item_code, category, location_floor_unit, description,
                severity, target_rectification_date, status, contractor_name
            ) VALUES (
                1, 1, 'PUNCH-2026-001', 'Architectural Finishing', 'Tower A - Floor 02, Apt 2B',
                'Skirting tile grout joint uneven in master bedroom corridor',
                'MINOR_COSMETIC', CURRENT_DATE + INTERVAL 5 DAY, 'OPEN', 'Rahman Tiles & Finishing'
            );
        """))

    print("\nMigration completed successfully with 0 errors!")

if __name__ == '__main__':
    asyncio.run(run_migration())
