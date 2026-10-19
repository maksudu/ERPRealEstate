import asyncio
import os
import sys
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def upgrade_dpr_site_reports():
    print("=== Starting DPR and Site Progress Database Upgrade ===")
    async with AsyncSessionLocal() as session:
        # 1. Add columns to con_dpr_reports
        cols_to_add = [
            ("report_number", "VARCHAR(64) NULL"),
            ("client_offline_uuid", "VARCHAR(64) NULL"),
            ("sync_status", "VARCHAR(32) NOT NULL DEFAULT 'SYNCED'"),
            ("conflict_detected", "BOOLEAN NOT NULL DEFAULT 0"),
            ("conflict_notes", "TEXT NULL"),
            ("version_number", "INT NOT NULL DEFAULT 1"),
            ("revision_history", "JSON NULL"),
            ("latitude", "DECIMAL(10, 7) NULL"),
            ("longitude", "DECIMAL(10, 7) NULL"),
            ("gps_accuracy_meters", "DECIMAL(8, 2) NULL"),
            ("location_address", "VARCHAR(255) NULL"),
            ("location_verified", "BOOLEAN NOT NULL DEFAULT 0"),
            ("photo_timestamp", "DATETIME NULL"),
            ("activities_planned", "TEXT NULL"),
            ("activities_completed", "TEXT NULL"),
            ("boq_quantities_completed", "JSON NULL"),
            ("equipment_records", "JSON NULL"),
            ("total_equipment_downtime_hours", "DECIMAL(6, 2) NOT NULL DEFAULT 0.00"),
            ("materials_summary", "JSON NULL"),
            ("material_wastage_notes", "TEXT NULL"),
            ("inspection_requests", "TEXT NULL"),
            ("quality_observations", "TEXT NULL"),
            ("inspection_status", "VARCHAR(32) NOT NULL DEFAULT 'PENDING'"),
            ("site_constraints", "TEXT NULL"),
            ("delay_hours", "DECIMAL(5, 2) NOT NULL DEFAULT 0.00"),
            ("delay_root_cause", "VARCHAR(64) NULL"),
            ("recovery_plan", "TEXT NULL"),
            ("engineer_comments", "TEXT NULL"),
            ("supervisor_approval_status", "VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW'"),
            ("supervisor_comments", "TEXT NULL"),
            ("approved_by_supervisor_id", "BIGINT NULL"),
            ("approval_date", "DATETIME NULL"),
            ("supervisor_signature", "VARCHAR(255) NULL")
        ]

        # Check existing columns
        res = await session.execute(text("DESCRIBE con_dpr_reports;"))
        existing_cols = {row[0] for row in res.fetchall()}

        for col_name, col_type in cols_to_add:
            if col_name not in existing_cols:
                try:
                    stmt = f"ALTER TABLE con_dpr_reports ADD COLUMN {col_name} {col_type};"
                    await session.execute(text(stmt))
                    print(f"Added column: {col_name}")
                except Exception as e:
                    print(f"Error adding {col_name}: {e}")

        # Add indexes
        indexes = [
            ("idx_dpr_report_number", "CREATE INDEX idx_dpr_report_number ON con_dpr_reports(report_number);"),
            ("idx_dpr_offline_uuid", "CREATE INDEX idx_dpr_offline_uuid ON con_dpr_reports(client_offline_uuid);"),
            ("idx_dpr_sync_status", "CREATE INDEX idx_dpr_sync_status ON con_dpr_reports(sync_status);"),
            ("idx_dpr_supervisor_status", "CREATE INDEX idx_dpr_supervisor_status ON con_dpr_reports(supervisor_approval_status);")
        ]
        for idx_name, idx_sql in indexes:
            try:
                await session.execute(text(idx_sql))
                print(f"Index created: {idx_name}")
            except Exception:
                pass # Already exists

        # 2. Seed Lookups
        categories = [
            ("DPR_WEATHER_CONDITION", "DPR Weather Conditions", "Weather conditions recorded on construction site diary"),
            ("DPR_DELAY_CAUSE", "DPR Delay Root Causes", "Standard site delay root cause classifications"),
            ("DPR_INSPECTION_STATUS", "DPR Site Inspection Status", "Quality inspection request verdict on site"),
            ("DPR_SUPERVISOR_STATUS", "DPR Supervisor Approval Status", "Daily progress report workflow approval stages"),
            ("DPR_SYNC_STATUS", "DPR Offline Sync Status", "Mobile offline capture synchronization state")
        ]

        for cat_code, cat_name, desc in categories:
            check = await session.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"), {"c": cat_code})
            cat_row = check.fetchone()
            if not cat_row:
                await session.execute(
                    text("INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active) VALUES (:c, :n, :d, 1)"),
                    {"c": cat_code, "n": cat_name, "d": desc}
                )
                print(f"Seeded category: {cat_code}")
                check2 = await session.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"), {"c": cat_code})
                cat_id = check2.fetchone()[0]
            else:
                cat_id = cat_row[0]

            # Seed Items
            items_map = {
                "DPR_WEATHER_CONDITION": [
                    ("SUNNY", "Sunny / Clear Sky", "রৌদ্রোজ্জ্বল / পরিষ্কার আকাশ", 1),
                    ("OVERCAST", "Overcast / Cloudy", "মেঘলা আকাশ", 2),
                    ("RAIN_LIGHT", "Light Rain / Drizzle", "হালকা বৃষ্টি", 3),
                    ("RAIN_HEAVY", "Heavy Downpour (Work Stoppage)", "ভারী বর্ষণ (কাজ স্থগিত)", 4),
                    ("STORMY", "Thunderstorm / High Wind", "ঝড়ো হাওয়া / বজ্রপাত", 5),
                    ("HUMID_HOT", "Extreme Heat / Humid", "তীব্র গরম / আর্দ্র", 6),
                ],
                "DPR_DELAY_CAUSE": [
                    ("WEATHER_RAIN", "Severe Weather / Rain", "খারাপ আবহাওয়া / বৃষ্টি", 1),
                    ("MATERIAL_SHORTAGE", "Material Shortage / Delivery Delay", "মালামাল ঘাটতি", 2),
                    ("LABOR_ABSENTEEISM", "Labor Shortage / Absenteeism", "শ্রমিক সংকট", 3),
                    ("EQUIPMENT_BREAKDOWN", "Equipment Breakdown / Power Outage", "যন্ত্রপাতি বিকল / বিদ্যুৎ বিভ্রাট", 4),
                    ("DRAWING_REVISION", "Design / Drawing Revision by Consultant", "ড্রয়িং সংশোধন", 5),
                    ("SITE_ACCESS_BLOCKED", "Site Ingress / Logistics Blocked", "সাইট প্রবেশপথ বন্ধ", 6),
                    ("CLIENT_INSPECTION_DELAY", "Delay in Consultant Inspection", "পরামর্শক পরিদর্শন বিলম্ব", 7),
                ],
                "DPR_INSPECTION_STATUS": [
                    ("PENDING", "Pending Engineer Check", "পরিদর্শন অপেক্ষমাণ", 1),
                    ("APPROVED_ON_SITE", "Approved for Casting / Progress", "অনুমোদিত", 2),
                    ("CONDITIONAL_APPROVAL", "Conditional (Minor Rectifications)", "শর্তসাপেক্ষ অনুমোদন", 3),
                    ("REJECTED", "Rejected (Major Defects)", "বাতিল", 4),
                    ("NCR_ISSUED", "Non-Conformance Report (NCR) Issued", "এনসিআর জারিকৃত", 5),
                ],
                "DPR_SUPERVISOR_STATUS": [
                    ("PENDING_REVIEW", "Pending Site Engineer Review", "পর্যালোচনা অপেক্ষমাণ", 1),
                    ("VERIFIED_BY_ENGINEER", "Verified by Field Engineer", "ফিল্ড ইঞ্জিনিয়ার কর্তৃক যাচাইকৃত", 2),
                    ("APPROVED_BY_PM", "Approved by Project Manager", "প্রকল্প ব্যবস্থাপক কর্তৃক অনুমোদিত", 3),
                    ("REJECTED_NEEDS_REVISION", "Returned for Correction", "সংশোধনের জন্য ফেরত", 4),
                ],
                "DPR_SYNC_STATUS": [
                    ("SYNCED", "Cloud Synchronized", "ক্লাউডে সংরক্ষিত", 1),
                    ("OFFLINE_DRAFT", "Offline Mobile Draft", "অফলাইন খসড়া", 2),
                    ("CONFLICT_DETECTED", "Sync Conflict Detected", "দ্বন্দ্ব চিহ্নিত", 3),
                    ("CONFLICT_RESOLVED", "Conflict Resolved / Merged", "দ্বন্দ্ব মীমাংসিত", 4),
                ]
            }

            if cat_code in items_map:
                for item_code, name_en, name_bn, sort_o in items_map[cat_code]:
                    it_chk = await session.execute(
                        text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :ic"),
                        {"cid": cat_id, "ic": item_code}
                    )
                    if not it_chk.fetchone():
                        await session.execute(
                            text("""
                                INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_active)
                                VALUES (:cid, :ic, :en, :bn, :so, 1)
                            """),
                            {"cid": cat_id, "ic": item_code, "en": name_en, "bn": name_bn, "so": sort_o}
                        )

        # 3. Update existing records with default report_number and audit data
        res_existing = await session.execute(text("SELECT id, project_id, report_date FROM con_dpr_reports WHERE report_number IS NULL;"))
        rows = res_existing.fetchall()
        for r_id, p_id, r_date in rows:
            rep_no = f"DPR-PRJ{p_id}-{r_date.strftime('%Y%m%d')}-{r_id:04d}"
            await session.execute(
                text("""
                    UPDATE con_dpr_reports 
                    SET report_number = :rn, 
                        sync_status = 'SYNCED',
                        supervisor_approval_status = 'APPROVED_BY_PM',
                        activities_planned = structural_activity_summary,
                        activities_completed = structural_activity_summary
                    WHERE id = :id
                """),
                {"rn": rep_no, "id": r_id}
            )
        print(f"Backfilled report numbers for {len(rows)} existing DPRs.")

        # 4. Seed operational demonstration DPR with full equipment, offline UUID, GPS, and BOQ measurements
        check_demo = await session.execute(text("SELECT id FROM con_dpr_reports WHERE report_number = 'DPR-2026-DEMO-001';"))
        if not check_demo.fetchone():
            await session.execute(text("""
                INSERT INTO con_dpr_reports (
                    project_id, report_number, report_date, weather_condition_id,
                    structural_activity_summary, floor_unit_location, machinery_deployed,
                    concrete_casting_cft, steel_rod_consumed_mt, cement_consumed_bags, total_workers_onsite,
                    status, sync_status, version_number,
                    latitude, longitude, gps_accuracy_meters, location_address, location_verified,
                    activities_planned, activities_completed,
                    boq_quantities_completed, equipment_records, total_equipment_downtime_hours,
                    materials_summary, inspection_requests, quality_observations, inspection_status,
                    supervisor_approval_status, supervisor_comments
                ) VALUES (
                    1, 'DPR-2026-DEMO-001', CURRENT_DATE(), 'SUNNY',
                    'Tower 1 Level-6 Beam & Slab Casting. Concrete pouring completed for Grid A1-E5.',
                    'Tower 1 - Level 6 Slab', '1x Schwing Stetter 42m Concrete Pump, 2x Tower Crane, 6x Needle Vibrators',
                    3500.00, 14.500, 650, 48,
                    'SUBMITTED', 'SYNCED', 1,
                    23.794900, 90.404300, 4.5, 'Plot 42, Road 11, Banani, Dhaka-1213', 1,
                    'Complete shuttering inspection, rebar binding of slab Level-6, pour 3,500 CFT M25 concrete',
                    '3,500 CFT concrete poured successfully. 6 test cubes sampled for 7/14/28-day crushing tests.',
                    '[{"boq_item_id": 1, "item_code": "BOQ-CIV-001", "item_description": "M25 Ready Mix Concrete in Slabs", "unit": "CFT", "completed_quantity": 3500.0, "unit_rate": 280.0}, {"boq_item_id": 2, "item_code": "BOQ-CIV-002", "item_description": "500W Deformed Rebar Binding", "unit": "MT", "completed_quantity": 14.5, "unit_rate": 105000.0}]',
                    '[{"equipment_name": "Concrete Pump 42m", "qty": 1, "hours_operated": 7.0, "downtime_hours": 0.5, "downtime_reason": "Pipe line unclogging", "status": "OPERATIONAL"}, {"equipment_name": "Tower Crane #1", "qty": 1, "hours_operated": 8.0, "downtime_hours": 0.0, "downtime_reason": "None", "status": "OPERATIONAL"}]',
                    0.50,
                    '[{"material_name": "Ready Mix Concrete M25", "unit": "CFT", "received_qty": 3550, "issued_qty": 3500, "consumed_qty": 3500, "wastage_qty": 50}, {"material_name": "500W High Yield Steel Rebar", "unit": "MT", "received_qty": 15.0, "issued_qty": 14.5, "consumed_qty": 14.5, "wastage_qty": 0.0}]',
                    'Joint Pre-pour Inspection with Consultant Engr. Kabir Ahmed.',
                    'Cover blocks 25mm verified, rebar spacing 125mm c/c verified. Slump measured at 110mm.',
                    'APPROVED_ON_SITE',
                    'APPROVED_BY_PM',
                    'Good quality control observed. Cylinder cube IDs assigned: CUBE-2026-L6-01 to 06.'
                );
            """))
            print("Seeded demo DPR report DPR-2026-DEMO-001.")

        await session.commit()
        print("=== Database Upgrade for DPR Completed Successfully ===")

if __name__ == "__main__":
    asyncio.run(upgrade_dpr_site_reports())
