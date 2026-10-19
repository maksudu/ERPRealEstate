import asyncio
import json
from datetime import date, timedelta
from sqlalchemy import text, select
from app.core.database import engine, AsyncSessionLocal
import app.modules.land.models
import app.modules.auth.models
from app.modules.projects.models import Project
import app.modules.construction.models

async def upgrade_and_seed_wbs_scheduling():
    print(">>> Starting WBS and Activity Scheduling migration and lookup seeding...")
    async with engine.begin() as conn:
        # 1. Add missing columns to con_wbs_nodes table if they don't exist
        print("1. Checking and updating columns on con_wbs_nodes...")
        
        # Helper to check if column exists
        async def add_column_if_missing(table_name, col_name, col_def):
            check_sql = text("""
                SELECT COUNT(*) FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = :tbl 
                AND COLUMN_NAME = :col
            """)
            res = await conn.execute(check_sql, {"tbl": table_name, "col": col_name})
            if (res.scalar() or 0) == 0:
                print(f"   -> Adding column {col_name} to {table_name}")
                await conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_def}"))
            else:
                print(f"   -- Column {col_name} already exists on {table_name}")

        await add_column_if_missing("con_wbs_nodes", "duration_days", "INT NOT NULL DEFAULT 1")
        await add_column_if_missing("con_wbs_nodes", "unit_of_measure", "VARCHAR(32) NULL DEFAULT 'SFT'")
        await add_column_if_missing("con_wbs_nodes", "planned_quantity", "DECIMAL(14,4) NOT NULL DEFAULT 0.0000")
        await add_column_if_missing("con_wbs_nodes", "verified_completed_quantity", "DECIMAL(14,4) NOT NULL DEFAULT 0.0000")
        await add_column_if_missing("con_wbs_nodes", "approved_total_quantity", "DECIMAL(14,4) NOT NULL DEFAULT 0.0000")
        await add_column_if_missing("con_wbs_nodes", "progress_measurement_method", "VARCHAR(64) NOT NULL DEFAULT 'QUANTITY_DRIVEN'")
        await add_column_if_missing("con_wbs_nodes", "earned_value", "DECIMAL(16,2) NOT NULL DEFAULT 0.00")
        await add_column_if_missing("con_wbs_nodes", "planned_value", "DECIMAL(16,2) NOT NULL DEFAULT 0.00")
        await add_column_if_missing("con_wbs_nodes", "baseline_start_date", "DATE NULL")
        await add_column_if_missing("con_wbs_nodes", "baseline_end_date", "DATE NULL")
        await add_column_if_missing("con_wbs_nodes", "baseline_duration_days", "INT NULL")
        await add_column_if_missing("con_wbs_nodes", "schedule_revision_no", "INT NOT NULL DEFAULT 0")
        await add_column_if_missing("con_wbs_nodes", "is_critical_path", "TINYINT(1) NOT NULL DEFAULT 0")
        await add_column_if_missing("con_wbs_nodes", "is_milestone", "TINYINT(1) NOT NULL DEFAULT 0")
        await add_column_if_missing("con_wbs_nodes", "predecessor_node_id", "BIGINT NULL")
        await add_column_if_missing("con_wbs_nodes", "dependency_type", "VARCHAR(32) NOT NULL DEFAULT 'FS'")
        await add_column_if_missing("con_wbs_nodes", "lag_days", "INT NOT NULL DEFAULT 0")
        await add_column_if_missing("con_wbs_nodes", "contractor_id", "BIGINT NULL")
        await add_column_if_missing("con_wbs_nodes", "responsible_team", "VARCHAR(128) NULL")
        await add_column_if_missing("con_wbs_nodes", "delay_days", "INT NOT NULL DEFAULT 0")
        await add_column_if_missing("con_wbs_nodes", "delay_reason", "VARCHAR(255) NULL")
        await add_column_if_missing("con_wbs_nodes", "corrective_action", "TEXT NULL")
        await add_column_if_missing("con_wbs_nodes", "weather_constraints", "TEXT NULL")
        await add_column_if_missing("con_wbs_nodes", "site_constraints", "TEXT NULL")
        await add_column_if_missing("con_wbs_nodes", "forecasted_end_date", "DATE NULL")
        await add_column_if_missing("con_wbs_nodes", "variance_days", "INT NOT NULL DEFAULT 0")

        # 2. Create Project Calendar table
        print("2. Checking/creating con_project_calendars table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_project_calendars (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                project_id BIGINT NOT NULL UNIQUE,
                calendar_name VARCHAR(128) NOT NULL DEFAULT 'Standard 6-Day Construction Calendar',
                working_days_per_week INT NOT NULL DEFAULT 6,
                weekly_off_days JSON NULL,
                working_hours_per_day DECIMAL(4,1) NOT NULL DEFAULT 8.0,
                shifts JSON NULL,
                holidays JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))

        # 3. Create Activity Dependencies table
        print("3. Checking/creating con_activity_dependencies table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS con_activity_dependencies (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                wbs_node_id BIGINT NOT NULL,
                predecessor_node_id BIGINT NOT NULL,
                dependency_type VARCHAR(32) NOT NULL DEFAULT 'FS',
                lag_days INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_act_dep_node (wbs_node_id),
                INDEX idx_act_dep_pred (predecessor_node_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))

        # 4. Seed Dynamic Lookup Categories & Items
        print("4. Seeding dynamic lookup categories and items for WBS & Scheduling...")
        
        lookup_data = [
            {
                "code": "WBS_TIER",
                "name": "WBS Hierarchy Tiers",
                "desc": "Levels of Work Breakdown Structure hierarchy",
                "items": [
                    {"code": "PHASE", "en": "Phase (Work Package Level 1)", "bn": "পর্যায় (লেভেল ১)", "badge": "#3B82F6", "order": 1},
                    {"code": "SUB_PHASE", "en": "Sub-Phase (Work Package Level 2)", "bn": "উপ-পর্যায় (লেভেল ২)", "badge": "#6366F1", "order": 2},
                    {"code": "ACTIVITY", "en": "Activity (Execution Deliverable)", "bn": "কার্যক্রম (ডেলিভারেবল)", "badge": "#10B981", "order": 3},
                    {"code": "TASK", "en": "Task (Measurable Sub-task)", "bn": "টাস্ক (পরিমাপযোগ্য কাজ)", "badge": "#06B6D4", "order": 4},
                    {"code": "MILESTONE", "en": "Milestone (Key Deliverable Gate)", "bn": "মাইলফলক (প্রধান লক্ষ্য)", "badge": "#F59E0B", "order": 5}
                ]
            },
            {
                "code": "WBS_PHASE",
                "name": "Construction WBS Master Phases",
                "desc": "Primary construction phases for real estate development",
                "items": [
                    {"code": "SITE_PREPARATION", "en": "1. Site Preparation", "bn": "১. সাইট প্রস্তুতি", "badge": "#8B5CF6", "order": 1},
                    {"code": "FOUNDATION_STRUCTURE", "en": "2. Foundation & Structure", "bn": "২. ভিত্তি ও কাঠামো", "badge": "#3B82F6", "order": 2},
                    {"code": "MASONRY_FINISHING", "en": "3. Masonry & Finishing", "bn": "৩. গাঁথুনি ও ফিনিশিং", "badge": "#EC4899", "order": 3},
                    {"code": "MEP_WORKS", "en": "4. MEP Works", "bn": "৪. এমইপি (ইলেকট্রিক্যাল, প্লাম্বিং)", "badge": "#F59E0B", "order": 4},
                    {"code": "EXTERNAL_WORKS", "en": "5. External Works", "bn": "৫. বহিঃস্থ উন্নয়ন ও ল্যান্ডস্কেপিং", "badge": "#10B981", "order": 5}
                ]
            },
            {
                "code": "ACTIVITY_TYPE",
                "name": "Construction Activity Types",
                "desc": "Specific civil, structural, finishing, and MEP activities",
                "items": [
                    {"code": "SITE_CLEARANCE", "en": "Site Clearance & Grubbing", "bn": "সাইট পরিষ্কারকরণ", "badge": "#64748B", "order": 1},
                    {"code": "EXCAVATION", "en": "Bulk Earthwork & Excavation", "bn": "মাটি খনন ও ডিসপোজাল", "badge": "#78716C", "order": 2},
                    {"code": "EARTHWORK_DISPOSAL", "en": "Earthwork & Disposal", "bn": "মাটি অপসারণ", "badge": "#78716C", "order": 3},
                    {"code": "PILING_PILE_CAPS", "en": "Piling & Pile Caps", "bn": "পাইলিং ও পাইল ক্যাপ", "badge": "#3B82F6", "order": 4},
                    {"code": "RAFT_FOOTING", "en": "Raft / Mat Foundation Casting", "bn": "রাফট / ম্যাট ঢালাই", "badge": "#2563EB", "order": 5},
                    {"code": "COLUMNS_BEAMS_SLABS", "en": "Columns, Beams & Slabs", "bn": "কলাম, বিম ও ছাদ ঢালাই", "badge": "#1D4ED8", "order": 6},
                    {"code": "BRICKWORK_PLASTER", "en": "Brickwork & Wall Plastering", "bn": "ইটের গাঁথুনি ও প্লাস্টার", "badge": "#D97706", "order": 7},
                    {"code": "FLOOR_WALL_FINISHES", "en": "Floor & Wall Tile Finishes", "bn": "মেঝে ও দেয়াল টাইলস", "badge": "#B45309", "order": 8},
                    {"code": "PAINTING_FIXTURES", "en": "Painting, False Ceiling & Fixtures", "bn": "রং ও সিলিং ফিটিংস", "badge": "#EC4899", "order": 9},
                    {"code": "ELECTRICAL_INSTALLATION", "en": "Electrical Conduit & Cabling", "bn": "বৈদ্যুতিক ওয়্যারিং ও সাবস্টেশন", "badge": "#EAB308", "order": 10},
                    {"code": "PLUMBING_DRAINAGE", "en": "Plumbing, Drainage & Sanitary", "bn": "প্লাম্বিং ও নিষ্কাশন ব্যবস্থা", "badge": "#06B6D4", "order": 11},
                    {"code": "FIRE_SAFETY_LIFT", "en": "Fire Safety & Lift Coordination", "bn": "অগ্নি নিরাপত্তা ও লিফট স্থাপন", "badge": "#EF4444", "order": 12},
                    {"code": "ROADS_PAVING", "en": "Internal Roads & Paving", "bn": "অভ্যন্তরীণ রাস্তা ও পেভিং", "badge": "#475569", "order": 13},
                    {"code": "BOUNDARY_WALL", "en": "Boundary Wall & Main Gate", "bn": "সীমানা প্রাচীর ও গেট", "badge": "#64748B", "order": 14},
                    {"code": "LANDSCAPING_UTILITIES", "en": "Landscaping, Drainage & Utilities", "bn": "ল্যান্ডস্কেপিং ও ড্রেনেজ", "badge": "#10B981", "order": 15}
                ]
            },
            {
                "code": "UNIT_OF_MEASUREMENT",
                "name": "Units of Measurement (UOM)",
                "desc": "Standard engineering and construction units of measurement",
                "items": [
                    {"code": "CFT", "en": "Cubic Feet (CFT)", "bn": "ঘনফুট (সিএফটি)", "badge": "#3B82F6", "order": 1},
                    {"code": "SFT", "en": "Square Feet (SFT)", "bn": "বর্গফুট (এসএফটি)", "badge": "#10B981", "order": 2},
                    {"code": "RFT", "en": "Running Feet (RFT)", "bn": "রানিং ফুট (আরএফটি)", "badge": "#6366F1", "order": 3},
                    {"code": "CUM", "en": "Cubic Meter (m³)", "bn": "ঘনমিটার (কিউমিক)", "badge": "#06B6D4", "order": 4},
                    {"code": "SQM", "en": "Square Meter (m²)", "bn": "বর্গমিটার", "badge": "#8B5CF6", "order": 5},
                    {"code": "MT", "en": "Metric Ton (MT)", "bn": "মেট্রিক টন", "badge": "#F59E0B", "order": 6},
                    {"code": "KG", "en": "Kilogram (KG)", "bn": "কেজি", "badge": "#EAB308", "order": 7},
                    {"code": "BAGS", "en": "Bags (50 KG)", "bn": "ব্যাগ (৫০ কেজি)", "badge": "#64748B", "order": 8},
                    {"code": "NOS", "en": "Numbers / Units (NOS)", "bn": "সংখ্যা (টি)", "badge": "#14B8A6", "order": 9},
                    {"code": "LS", "en": "Lump Sum (LS)", "bn": "এককালীন (লাম্প সাম)", "badge": "#9333EA", "order": 10}
                ]
            },
            {
                "code": "PROGRESS_METHOD",
                "name": "Progress Measurement Methods",
                "desc": "Methods used to compute physical and scheduled progress",
                "items": [
                    {"code": "QUANTITY_DRIVEN", "en": "Quantity-Driven (Verified / Approved)", "bn": "পরিমাণভিত্তিক (যাচাইকৃত / অনুমোদিত)", "badge": "#10B981", "order": 1},
                    {"code": "MILESTONE_PERCENTAGE", "en": "Milestone Percentage Step Gate", "bn": "মাইলফলক শতকরা হার", "badge": "#3B82F6", "order": 2},
                    {"code": "EFFORT_HOURS", "en": "Effort / Labor Man-Hours", "bn": "শ্রমঘণ্টা ভিত্তিক", "badge": "#F59E0B", "order": 3},
                    {"code": "EARNED_VALUE", "en": "Earned Value Management (EVM)", "bn": "আর্নড ভ্যালু মেথড (ইভিএম)", "badge": "#8B5CF6", "order": 4}
                ]
            },
            {
                "code": "DEPENDENCY_TYPE",
                "name": "Activity Dependency Relationships",
                "desc": "Standard CPM network precedence diagramming relationships",
                "items": [
                    {"code": "FS", "en": "Finish-to-Start (FS)", "bn": "শেষ থেকে শুরু (এফএস)", "badge": "#3B82F6", "order": 1},
                    {"code": "SS", "en": "Start-to-Start (SS)", "bn": "শুরু থেকে শুরু (এসএস)", "badge": "#10B981", "order": 2},
                    {"code": "FF", "en": "Finish-to-Finish (FF)", "bn": "শেষ থেকে শেষ (এফএফ)", "badge": "#F59E0B", "order": 3},
                    {"code": "SF", "en": "Start-to-Finish (SF)", "bn": "শুরু থেকে শেষ (এসএফ)", "badge": "#EF4444", "order": 4}
                ]
            },
            {
                "code": "DELAY_REASON",
                "name": "Delay Reason Classifications",
                "desc": "Root causes for construction activity schedule variance",
                "items": [
                    {"code": "WEATHER_MONSOON", "en": "Inclement Weather / Heavy Monsoon", "bn": "ভারী বৃষ্টিপাত ও বর্ষাকালীন বিঘ্ন", "badge": "#06B6D4", "order": 1},
                    {"code": "MATERIAL_SHORTAGE", "en": "Material Supply Chain Delay / Rebar Shortage", "bn": "কাঁচামাল সংকট বা সরবরাহ বিলম্ব", "badge": "#EF4444", "order": 2},
                    {"code": "DESIGN_REVISION", "en": "Architectural / Structural Design Revision", "bn": "ডিজাইন বা ড্রয়িং সংশোধন", "badge": "#8B5CF6", "order": 3},
                    {"code": "LABOR_SHORTAGE", "en": "Subcontractor / Skilled Gang Shortage", "bn": "দক্ষ শ্রমিকের অভাব", "badge": "#F59E0B", "order": 4},
                    {"code": "REGULATORY_PERMIT", "en": "RAJUK / Municipal Clearance Pending", "bn": "অনুমোদন বা নকশা ছাড়পত্র বিলম্ব", "badge": "#EC4899", "order": 5},
                    {"code": "SITE_ACCESS_UTILITY", "en": "Site Access / Utility Line Shifting", "bn": "সাইট এক্সেস বা ইউটিলিটি স্থানান্তর", "badge": "#64748B", "order": 6}
                ]
            },
            {
                "code": "WORK_SHIFT",
                "name": "Site Work Shifts",
                "desc": "Working hours and shifts for site operations",
                "items": [
                    {"code": "DAY_SHIFT", "en": "Regular Day Shift (08:00 AM - 05:00 PM)", "bn": "সাধারণ ডে শিফট (সকাল ৮টা - বিকাল ৫টা)", "badge": "#10B981", "order": 1},
                    {"code": "EXTENDED_SHIFT", "en": "Extended Shift (08:00 AM - 08:00 PM)", "bn": "বর্ধিত শিফট (সকাল ৮টা - রাত ৮টা)", "badge": "#3B82F6", "order": 2},
                    {"code": "NIGHT_CASTING", "en": "Night Concrete Casting (08:00 PM - 05:00 AM)", "bn": "নাইট কাস্টিং শিফট (রাত ৮টা - ভোর ৫টা)", "badge": "#6366F1", "order": 3}
                ]
            },
            {
                "code": "ACTIVITY_STATUS",
                "name": "Activity Scheduling Status",
                "desc": "Operational status of WBS activity execution",
                "items": [
                    {"code": "NOT_STARTED", "en": "Not Started", "bn": "শুরু হয়নি", "badge": "#64748B", "order": 1},
                    {"code": "IN_PROGRESS", "en": "In Progress", "bn": "চলমান", "badge": "#3B82F6", "order": 2},
                    {"code": "COMPLETED", "en": "Completed", "bn": "সম্পন্ন", "badge": "#10B981", "order": 3},
                    {"code": "DELAYED", "en": "Delayed / Behind Schedule", "bn": "বিলম্বিত", "badge": "#EF4444", "order": 4},
                    {"code": "CRITICAL_PATH", "en": "Critical Path (Zero Float)", "bn": "ক্রিটিকাল পাথ", "badge": "#DC2626", "order": 5},
                    {"code": "ON_HOLD", "en": "On Hold / Suspended", "bn": "স্থগিত", "badge": "#F59E0B", "order": 6}
                ]
            }
        ]

        for cat in lookup_data:
            cat_check = await conn.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"),
                {"c": cat["code"]}
            )
            cat_row = cat_check.fetchone()
            if not cat_row:
                ins_cat = await conn.execute(
                    text("""
                        INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active, created_at, updated_at)
                        VALUES (:code, :name, :desc, 1, NOW(), NOW())
                    """),
                    {"code": cat["code"], "name": cat["name"], "desc": cat["desc"]}
                )
                category_id = ins_cat.lastrowid
                print(f"   + Created lookup category: {cat['code']} (ID: {category_id})")
            else:
                category_id = cat_row[0]

            for it in cat["items"]:
                it_check = await conn.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :icode"),
                    {"cid": category_id, "icode": it["code"]}
                )
                if not it_check.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO sys_lookup_items 
                            (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_active, created_at, updated_at)
                            VALUES (:cid, :icode, :en, :bn, :badge, :s_order, 1, NOW(), NOW())
                        """),
                        {
                            "cid": category_id,
                            "icode": it["code"],
                            "en": it["en"],
                            "bn": it["bn"],
                            "badge": it["badge"],
                            "s_order": it["order"]
                        }
                    )
                    print(f"     * Added item: {it['code']} -> {it['en']}")

    # 5. Seed Example WBS Hierarchy for "Residential Tower A"
    print("5. Checking and seeding Residential Tower A with example WBS hierarchy...")
    async with AsyncSessionLocal() as session:
        # Find or create "Residential Tower A" project
        proj_res = await session.execute(
            select(Project).where(Project.project_name.ilike("%Residential Tower A%")).limit(1)
        )
        project = proj_res.scalar_one_or_none()
        if not project:
            # Check if project 1 exists to clone baseline params
            p1_res = await session.execute(select(Project).where(Project.id == 1))
            p1 = p1_res.scalar_one_or_none()
            
            project = Project(
                project_code="PRJ-RTA-01",
                project_name="Residential Tower A",
                development_authority_id="RAJUK",
                far_allocated=p1.far_allocated if p1 else 4.25,
                mgc_percent=p1.mgc_percent if p1 else 55.0,
                road_width_feet=60.0,
                plot_area_sqft=25000.0,
                total_builtup_area_sqft=185000.0,
                total_saleable_area_sqft=150000.0,
                planned_handover_date=date.today() + timedelta(days=720),
                status="UNDER_CONSTRUCTION",
                description="Ultra-modern 25-Storied Residential Tower A with Dual Basements & Smart Automation"
            )
            session.add(project)
            await session.flush()
            print(f"   Created project: Residential Tower A (ID: {project.id})")
        else:
            print(f"   Found project: {project.project_name} (ID: {project.id})")
        
        project_id = project.id

        # Setup Project Calendar
        cal_check = await session.execute(
            text("SELECT id FROM con_project_calendars WHERE project_id = :pid"),
            {"pid": project_id}
        )
        if not cal_check.fetchone():
            shifts = json.dumps([
                {"name": "Regular Day Shift", "start_time": "08:00", "end_time": "17:00", "is_default": True},
                {"name": "Night Concrete Casting", "start_time": "20:00", "end_time": "05:00", "is_default": False}
            ])
            holidays = json.dumps([
                {"date": "2026-02-21", "name": "International Mother Language Day"},
                {"date": "2026-03-26", "name": "Independence Day"},
                {"date": "2026-04-14", "name": "Bengali New Year (Pohela Boishakh)"},
                {"date": "2026-05-01", "name": "May Day"}
            ])
            await session.execute(
                text("""
                    INSERT INTO con_project_calendars 
                    (project_id, calendar_name, working_days_per_week, weekly_off_days, working_hours_per_day, shifts, holidays, created_at, updated_at)
                    VALUES (:pid, 'Standard 6-Day Construction Calendar', 6, '["FRIDAY"]', 8.0, :shifts, :holidays, NOW(), NOW())
                """),
                {"pid": project_id, "shifts": shifts, "holidays": holidays}
            )
            await session.commit()
            print("   + Created Project Calendar for project ID", project_id)

        # Check existing WBS count for this project
        wbs_count_res = await session.execute(
            text("SELECT COUNT(*) FROM con_wbs_nodes WHERE project_id = :pid"),
            {"pid": project_id}
        )
        wbs_count = wbs_count_res.scalar() or 0
        if wbs_count < 10:
            print(f"   Populating 5 primary phases and activities as requested by user...")
            today = date.today()
            
            # WBS Structure requested:
            # 1. Site Preparation
            #    - Site clearance
            #    - Excavation
            #    - Earthwork and disposal
            # 2. Foundation & Structure
            #    - Piling and pile caps
            #    - Raft or footing
            #    - Columns, beams and slabs
            # 3. Masonry & Finishing
            #    - Brickwork and plaster
            #    - Floor and wall finishes
            #    - Painting and fixtures
            # 4. MEP Works
            #    - Electrical installation
            #    - Plumbing and drainage
            #    - Fire safety and lift coordination
            # 5. External Works
            #    - Roads and paving
            #    - Boundary wall
            #    - Landscaping and utilities

            hierarchy = [
                {
                    "tier": "PHASE",
                    "code": "WBS-01-SP",
                    "name": "1. Site Preparation",
                    "phase": "SITE_PREPARATION",
                    "start": today - timedelta(days=90),
                    "end": today - timedelta(days=50),
                    "weight": 10.0,
                    "progress": 100.0,
                    "status": "COMPLETED",
                    "children": [
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-SP-01",
                            "name": "Site Clearance & Grubbing",
                            "activity_type": "SITE_CLEARANCE",
                            "uom": "SFT",
                            "planned_qty": 45000.0,
                            "approved_qty": 45000.0,
                            "verified_qty": 45000.0,
                            "start": today - timedelta(days=90),
                            "end": today - timedelta(days=78),
                            "duration": 12,
                            "weight": 3.0,
                            "progress": 100.0,
                            "status": "COMPLETED",
                            "engineer": "Engr. Tanvir Ahmed",
                            "team": "Earthwork Team 1",
                            "critical": False,
                            "dep_type": "FS"
                        },
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-SP-02",
                            "name": "Basement Excavation",
                            "activity_type": "EXCAVATION",
                            "uom": "CFT",
                            "planned_qty": 280000.0,
                            "approved_qty": 280000.0,
                            "verified_qty": 280000.0,
                            "start": today - timedelta(days=77),
                            "end": today - timedelta(days=60),
                            "duration": 17,
                            "weight": 4.0,
                            "progress": 100.0,
                            "status": "COMPLETED",
                            "engineer": "Engr. Tanvir Ahmed",
                            "team": "Heavy Machinery Squad",
                            "critical": True,
                            "dep_type": "FS"
                        },
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-SP-03",
                            "name": "Earthwork and disposal",
                            "activity_type": "EARTHWORK_DISPOSAL",
                            "uom": "CFT",
                            "planned_qty": 240000.0,
                            "approved_qty": 240000.0,
                            "verified_qty": 240000.0,
                            "start": today - timedelta(days=70),
                            "end": today - timedelta(days=50),
                            "duration": 20,
                            "weight": 3.0,
                            "progress": 100.0,
                            "status": "COMPLETED",
                            "engineer": "Engr. Tanvir Ahmed",
                            "team": "Haulage Contractor",
                            "critical": False,
                            "dep_type": "SS"
                        }
                    ]
                },
                {
                    "tier": "PHASE",
                    "code": "WBS-02-FS",
                    "name": "2. Foundation & Structure",
                    "phase": "FOUNDATION_STRUCTURE",
                    "start": today - timedelta(days=50),
                    "end": today + timedelta(days=120),
                    "weight": 45.0,
                    "progress": 58.5,
                    "status": "IN_PROGRESS",
                    "children": [
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-FS-01",
                            "name": "Piling and pile caps",
                            "activity_type": "PILING_PILE_CAPS",
                            "uom": "RFT",
                            "planned_qty": 18500.0,
                            "approved_qty": 18500.0,
                            "verified_qty": 18500.0,
                            "start": today - timedelta(days=50),
                            "end": today - timedelta(days=15),
                            "duration": 35,
                            "weight": 15.0,
                            "progress": 100.0,
                            "status": "COMPLETED",
                            "engineer": "Engr. Maksudul Hasan",
                            "team": "Deep Foundation Gang",
                            "critical": True,
                            "dep_type": "FS"
                        },
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-FS-02",
                            "name": "Raft or footing",
                            "activity_type": "RAFT_FOOTING",
                            "uom": "CFT",
                            "planned_qty": 65000.0,
                            "approved_qty": 65000.0,
                            "verified_qty": 65000.0,
                            "start": today - timedelta(days=14),
                            "end": today + timedelta(days=5),
                            "duration": 20,
                            "weight": 12.0,
                            "progress": 100.0,
                            "status": "COMPLETED",
                            "engineer": "Engr. Maksudul Hasan",
                            "team": "RCC Casting Gang A",
                            "critical": True,
                            "dep_type": "FS"
                        },
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-FS-03",
                            "name": "Columns, beams and slabs (L1-L15)",
                            "activity_type": "COLUMNS_BEAMS_SLABS",
                            "uom": "CFT",
                            "planned_qty": 320000.0,
                            "approved_qty": 320000.0,
                            "verified_qty": 96000.0, # 30% complete
                            "start": today + timedelta(days=6),
                            "end": today + timedelta(days=120),
                            "duration": 114,
                            "weight": 18.0,
                            "progress": 30.0,
                            "status": "IN_PROGRESS",
                            "engineer": "Engr. Maksudul Hasan",
                            "team": "Superstructure Gang",
                            "critical": True,
                            "dep_type": "FS"
                        }
                    ]
                },
                {
                    "tier": "PHASE",
                    "code": "WBS-03-MF",
                    "name": "3. Masonry & Finishing",
                    "phase": "MASONRY_FINISHING",
                    "start": today + timedelta(days=40),
                    "end": today + timedelta(days=200),
                    "weight": 20.0,
                    "progress": 0.0,
                    "status": "NOT_STARTED",
                    "children": [
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-MF-01",
                            "name": "Brickwork and plaster",
                            "activity_type": "BRICKWORK_PLASTER",
                            "uom": "SFT",
                            "planned_qty": 180000.0,
                            "approved_qty": 180000.0,
                            "verified_qty": 0.0,
                            "start": today + timedelta(days=40),
                            "end": today + timedelta(days=120),
                            "duration": 80,
                            "weight": 8.0,
                            "progress": 0.0,
                            "status": "NOT_STARTED",
                            "engineer": "Engr. K. Rahman",
                            "team": "Masonry Contractors",
                            "critical": False,
                            "dep_type": "FS"
                        },
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-MF-02",
                            "name": "Floor and wall finishes",
                            "activity_type": "FLOOR_WALL_FINISHES",
                            "uom": "SFT",
                            "planned_qty": 140000.0,
                            "approved_qty": 140000.0,
                            "verified_qty": 0.0,
                            "start": today + timedelta(days=100),
                            "end": today + timedelta(days=170),
                            "duration": 70,
                            "weight": 7.0,
                            "progress": 0.0,
                            "status": "NOT_STARTED",
                            "engineer": "Engr. K. Rahman",
                            "team": "Tiles & Marble Squad",
                            "critical": False,
                            "dep_type": "FS"
                        },
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-MF-03",
                            "name": "Painting and fixtures",
                            "activity_type": "PAINTING_FIXTURES",
                            "uom": "SFT",
                            "planned_qty": 210000.0,
                            "approved_qty": 210000.0,
                            "verified_qty": 0.0,
                            "start": today + timedelta(days=140),
                            "end": today + timedelta(days=200),
                            "duration": 60,
                            "weight": 5.0,
                            "progress": 0.0,
                            "status": "NOT_STARTED",
                            "engineer": "Engr. K. Rahman",
                            "team": "Finishing Artisans",
                            "critical": False,
                            "dep_type": "FS"
                        }
                    ]
                },
                {
                    "tier": "PHASE",
                    "code": "WBS-04-MEP",
                    "name": "4. MEP Works",
                    "phase": "MEP_WORKS",
                    "start": today + timedelta(days=30),
                    "end": today + timedelta(days=180),
                    "weight": 15.0,
                    "progress": 0.0,
                    "status": "NOT_STARTED",
                    "children": [
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-MEP-01",
                            "name": "Electrical installation",
                            "activity_type": "ELECTRICAL_INSTALLATION",
                            "uom": "LS",
                            "planned_qty": 1.0,
                            "approved_qty": 1.0,
                            "verified_qty": 0.0,
                            "start": today + timedelta(days=30),
                            "end": today + timedelta(days=160),
                            "duration": 130,
                            "weight": 6.0,
                            "progress": 0.0,
                            "status": "NOT_STARTED",
                            "engineer": "Engr. Shahedul Islam",
                            "team": "MEP Electrical Team",
                            "critical": False,
                            "dep_type": "SS"
                        },
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-MEP-02",
                            "name": "Plumbing and drainage",
                            "activity_type": "PLUMBING_DRAINAGE",
                            "uom": "LS",
                            "planned_qty": 1.0,
                            "approved_qty": 1.0,
                            "verified_qty": 0.0,
                            "start": today + timedelta(days=35),
                            "end": today + timedelta(days=150),
                            "duration": 115,
                            "weight": 5.0,
                            "progress": 0.0,
                            "status": "NOT_STARTED",
                            "engineer": "Engr. Shahedul Islam",
                            "team": "Sanitary & Plumbing Gang",
                            "critical": False,
                            "dep_type": "SS"
                        },
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-MEP-03",
                            "name": "Fire safety and lift coordination",
                            "activity_type": "FIRE_SAFETY_LIFT",
                            "uom": "NOS",
                            "planned_qty": 4.0, # 4 passenger/fire lifts
                            "approved_qty": 4.0,
                            "verified_qty": 0.0,
                            "start": today + timedelta(days=80),
                            "end": today + timedelta(days=180),
                            "duration": 100,
                            "weight": 4.0,
                            "progress": 0.0,
                            "status": "NOT_STARTED",
                            "engineer": "Engr. Shahedul Islam",
                            "team": "Specialist Lift Vendors",
                            "critical": True,
                            "dep_type": "FS"
                        }
                    ]
                },
                {
                    "tier": "PHASE",
                    "code": "WBS-05-EW",
                    "name": "5. External Works",
                    "phase": "EXTERNAL_WORKS",
                    "start": today + timedelta(days=150),
                    "end": today + timedelta(days=240),
                    "weight": 10.0,
                    "progress": 0.0,
                    "status": "NOT_STARTED",
                    "children": [
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-EW-01",
                            "name": "Roads and paving",
                            "activity_type": "ROADS_PAVING",
                            "uom": "SFT",
                            "planned_qty": 35000.0,
                            "approved_qty": 35000.0,
                            "verified_qty": 0.0,
                            "start": today + timedelta(days=150),
                            "end": today + timedelta(days=210),
                            "duration": 60,
                            "weight": 4.0,
                            "progress": 0.0,
                            "status": "NOT_STARTED",
                            "engineer": "Engr. Tanvir Ahmed",
                            "team": "Paving Gang",
                            "critical": False,
                            "dep_type": "FS"
                        },
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-EW-02",
                            "name": "Boundary wall",
                            "activity_type": "BOUNDARY_WALL",
                            "uom": "RFT",
                            "planned_qty": 1200.0,
                            "approved_qty": 1200.0,
                            "verified_qty": 0.0,
                            "start": today + timedelta(days=160),
                            "end": today + timedelta(days=200),
                            "duration": 40,
                            "weight": 3.0,
                            "progress": 0.0,
                            "status": "NOT_STARTED",
                            "engineer": "Engr. Tanvir Ahmed",
                            "team": "Masonry Contractors",
                            "critical": False,
                            "dep_type": "FS"
                        },
                        {
                            "tier": "ACTIVITY",
                            "code": "ACT-EW-03",
                            "name": "Landscaping and utilities",
                            "activity_type": "LANDSCAPING_UTILITIES",
                            "uom": "LS",
                            "planned_qty": 1.0,
                            "approved_qty": 1.0,
                            "verified_qty": 0.0,
                            "start": today + timedelta(days=190),
                            "end": today + timedelta(days=240),
                            "duration": 50,
                            "weight": 3.0,
                            "progress": 0.0,
                            "status": "NOT_STARTED",
                            "engineer": "Engr. Tanvir Ahmed",
                            "team": "Landscape & Utility Team",
                            "critical": False,
                            "dep_type": "FS"
                        }
                    ]
                }
            ]

            prev_activity_id = None
            for p in hierarchy:
                # Insert Phase Parent
                ins_phase = await session.execute(
                    text("""
                        INSERT INTO con_wbs_nodes 
                        (project_id, parent_id, node_code, node_name, wbs_tier, phase_category, planned_start_date, planned_end_date, 
                         baseline_start_date, baseline_end_date, baseline_duration_days, duration_days, progress_percentage, 
                         weightage_percentage, status, progress_measurement_method, created_at, updated_at)
                        VALUES (:pid, NULL, :code, :name, :tier, :phase, :start, :end, :b_start, :b_end, :b_dur, :dur, :prog, :wt, :status, 'EARNED_VALUE', NOW(), NOW())
                    """),
                    {
                        "pid": project_id,
                        "code": p["code"],
                        "name": p["name"],
                        "tier": p["tier"],
                        "phase": p["phase"],
                        "start": p["start"],
                        "end": p["end"],
                        "b_start": p["start"],
                        "b_end": p["end"],
                        "b_dur": (p["end"] - p["start"]).days,
                        "dur": (p["end"] - p["start"]).days,
                        "prog": p["progress"],
                        "wt": p["weight"],
                        "status": p["status"]
                    }
                )
                phase_id = ins_phase.lastrowid
                print(f"   -> Inserted Phase: {p['name']} (ID: {phase_id})")

                for act in p["children"]:
                    # Progress calculation for quantity-driven
                    calc_prog = act["progress"]
                    if act["approved_qty"] > 0:
                        calc_prog = round((act["verified_qty"] / act["approved_qty"]) * 100.0, 2)

                    ins_act = await session.execute(
                        text("""
                            INSERT INTO con_wbs_nodes 
                            (project_id, parent_id, node_code, node_name, wbs_tier, phase_category, activity_type,
                             unit_of_measure, planned_quantity, approved_total_quantity, verified_completed_quantity,
                             planned_start_date, planned_end_date, baseline_start_date, baseline_end_date, baseline_duration_days,
                             duration_days, progress_percentage, weightage_percentage, status, progress_measurement_method,
                             responsible_engineer, responsible_team, is_critical_path, predecessor_node_id, dependency_type,
                             created_at, updated_at)
                            VALUES 
                            (:pid, :parent_id, :code, :name, :tier, :phase, :act_type,
                             :uom, :p_qty, :app_qty, :v_qty,
                             :start, :end, :b_start, :b_end, :b_dur,
                             :dur, :prog, :wt, :status, 'QUANTITY_DRIVEN',
                             :engr, :team, :crit, :pred_id, :dep_type,
                             NOW(), NOW())
                        """),
                        {
                            "pid": project_id,
                            "parent_id": phase_id,
                            "code": act["code"],
                            "name": act["name"],
                            "tier": act["tier"],
                            "phase": p["phase"],
                            "act_type": act["activity_type"],
                            "uom": act["uom"],
                            "p_qty": act["planned_qty"],
                            "app_qty": act["approved_qty"],
                            "v_qty": act["verified_qty"],
                            "start": act["start"],
                            "end": act["end"],
                            "b_start": act["start"],
                            "b_end": act["end"],
                            "b_dur": act["duration"],
                            "dur": act["duration"],
                            "prog": calc_prog,
                            "wt": act["weight"],
                            "status": act["status"],
                            "engr": act["engineer"],
                            "team": act["team"],
                            "crit": 1 if act["critical"] else 0,
                            "pred_id": prev_activity_id,
                            "dep_type": act["dep_type"]
                        }
                    )
                    act_id = ins_act.lastrowid
                    if prev_activity_id:
                        await session.execute(
                            text("""
                                INSERT INTO con_activity_dependencies (wbs_node_id, predecessor_node_id, dependency_type, lag_days, created_at)
                                VALUES (:wbs_id, :pred_id, :dep_type, 0, NOW())
                            """),
                            {"wbs_id": act_id, "pred_id": prev_activity_id, "dep_type": act["dep_type"]}
                        )
                    prev_activity_id = act_id
                    print(f"      - Inserted Activity: {act['code']} | {act['name']} ({calc_prog}%)")

            await session.commit()
            print(">>> Example WBS Hierarchy seeded successfully!")
        else:
            print(">>> WBS nodes already present in database.")

if __name__ == "__main__":
    asyncio.run(upgrade_and_seed_wbs_scheduling())
