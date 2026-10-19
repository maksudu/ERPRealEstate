import asyncio
import json
from datetime import date
from sqlalchemy import text, select
from app.core.database import engine, AsyncSessionLocal
import app.modules.land.models
import app.modules.auth.models
from app.modules.projects.models import Project, Tower, BOQItem
from app.modules.construction.models import WBSNode

async def upgrade_and_seed_boq_management():
    print(">>> Starting BOQ Management schema upgrade and lookup seeding...")
    async with engine.begin() as conn:
        print("1. Checking and updating columns on prj_boq_items...")
        
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

        # Add new comprehensive BOQ fields
        await add_column_if_missing("prj_boq_items", "specification", "TEXT NULL")
        await add_column_if_missing("prj_boq_items", "material_rate", "DECIMAL(14,2) NOT NULL DEFAULT 0.00")
        await add_column_if_missing("prj_boq_items", "labour_rate", "DECIMAL(14,2) NOT NULL DEFAULT 0.00")
        await add_column_if_missing("prj_boq_items", "equipment_rate", "DECIMAL(14,2) NOT NULL DEFAULT 0.00")
        await add_column_if_missing("prj_boq_items", "subcontract_rate", "DECIMAL(14,2) NOT NULL DEFAULT 0.00")
        
        await add_column_if_missing("prj_boq_items", "stage", "VARCHAR(64) NOT NULL DEFAULT 'APPROVED_CONTRACT_BOQ'")
        await add_column_if_missing("prj_boq_items", "tender_quantity", "DECIMAL(14,4) NOT NULL DEFAULT 0.0000")
        await add_column_if_missing("prj_boq_items", "tender_unit_rate", "DECIMAL(14,2) NOT NULL DEFAULT 0.00")
        await add_column_if_missing("prj_boq_items", "tender_total_amount", "DECIMAL(16,2) NOT NULL DEFAULT 0.00")
        
        await add_column_if_missing("prj_boq_items", "contract_quantity", "DECIMAL(14,4) NOT NULL DEFAULT 0.0000")
        await add_column_if_missing("prj_boq_items", "contract_unit_rate", "DECIMAL(14,2) NOT NULL DEFAULT 0.00")
        await add_column_if_missing("prj_boq_items", "contract_total_amount", "DECIMAL(16,2) NOT NULL DEFAULT 0.00")
        
        await add_column_if_missing("prj_boq_items", "revised_quantity", "DECIMAL(14,4) NOT NULL DEFAULT 0.0000")
        await add_column_if_missing("prj_boq_items", "revised_unit_rate", "DECIMAL(14,2) NOT NULL DEFAULT 0.00")
        await add_column_if_missing("prj_boq_items", "revised_total_amount", "DECIMAL(16,2) NOT NULL DEFAULT 0.00")
        
        await add_column_if_missing("prj_boq_items", "completed_quantity", "DECIMAL(14,4) NOT NULL DEFAULT 0.0000")
        await add_column_if_missing("prj_boq_items", "remaining_quantity", "DECIMAL(14,4) NOT NULL DEFAULT 0.0000")
        await add_column_if_missing("prj_boq_items", "actual_cost", "DECIMAL(16,2) NOT NULL DEFAULT 0.00")
        await add_column_if_missing("prj_boq_items", "cost_variance", "DECIMAL(16,2) NOT NULL DEFAULT 0.00")
        
        await add_column_if_missing("prj_boq_items", "version_no", "INT NOT NULL DEFAULT 1")
        await add_column_if_missing("prj_boq_items", "approved_by", "VARCHAR(128) NULL")
        await add_column_if_missing("prj_boq_items", "approval_date", "DATE NULL")
        await add_column_if_missing("prj_boq_items", "rate_analysis_notes", "TEXT NULL")
        await add_column_if_missing("prj_boq_items", "supporting_document_url", "VARCHAR(255) NULL")

        # 2. Seed Dynamic Lookup Categories & Items for BOQ
        print("2. Seeding dynamic lookup categories and items for BOQ...")
        lookup_data = [
            {
                "code": "BOQ_STAGE",
                "name": "BOQ Workflow Lifecycle Stages",
                "desc": "Lifecycle approval states for Bill of Quantities",
                "items": [
                    {"code": "TENDER_BOQ", "en": "Tender BOQ (Pre-Award)", "bn": "দরপত্র বিওকিউ", "color": "#6366F1"},
                    {"code": "APPROVED_CONTRACT_BOQ", "en": "Approved Contract BOQ", "bn": "অনুমোদিত চুক্তি বিওকিউ", "color": "#10B981"},
                    {"code": "REVISED_BOQ", "en": "Revised Working BOQ (VO Adjusted)", "bn": "সংশোধিত কার্যনির্বাহী বিওকিউ", "color": "#F59E0B"},
                    {"code": "ARCHIVED", "en": "Archived / Superseded", "bn": "আর্কাইভকৃত বিওকিউ", "color": "#64748B"}
                ]
            },
            {
                "code": "BOQ_ITEM_CATEGORY",
                "name": "BOQ Material & Trade Categories",
                "desc": "Trade and material classification for BOQ items",
                "items": [
                    {"code": "REBAR_STEEL", "en": "Reinforcement Steel (500W TMT)", "bn": "রড / রিইনফোর্সমেন্ট স্টিল", "color": "#3B82F6"},
                    {"code": "READYMIX_CONCRETE", "en": "Ready-Mix & Site Concrete", "bn": "রেডিমিক্স ও সাইট কংক্রিট", "color": "#10B981"},
                    {"code": "BRICK_MASONRY", "en": "Brickwork & Auto Bricks", "bn": "ইটের গাঁথুনি ও অটো ব্রিকস", "color": "#EF4444"},
                    {"code": "CEMENT_MORTAR", "en": "Cement & Plastering Mortar", "bn": "সিমেন্ট ও প্লাস্টার মশলা", "color": "#8B5CF6"},
                    {"code": "COARSE_AGGREGATE", "en": "Stone Chips & Shingles", "bn": "পাথরের খোয়া ও চিপস", "color": "#06B6D4"},
                    {"code": "FINE_SAND", "en": "Sylhet & Local Sand (FM 1.5 - 2.5)", "bn": "সিলেট ও লোকাল বালু", "color": "#F59E0B"},
                    {"code": "STRUCTURAL_STEEL", "en": "Structural Steel & MS Profiles", "bn": "স্ট্রাকচারাল স্টিল ও এমএস প্রোফাইল", "color": "#0D9488"},
                    {"code": "TILES_MARBLE", "en": "Floor & Wall Ceramic Tiles / Marble", "bn": "টাইলস ও মার্বেল", "color": "#EC4899"},
                    {"code": "PLUMBING_PIPE", "en": "Plumbing uPVC & CPVC Pipes & Fittings", "bn": "প্লাম্বিং পাইপ ও ফিটিংস", "color": "#64748B"},
                    {"code": "ELECTRICAL_CABLE", "en": "Electrical Cables, Conduits & Switchboards", "bn": "ইলেকট্রিক্যাল তার ও কনডুইট", "color": "#EAB308"},
                    {"code": "PAINT_FINISH", "en": "Interior & Exterior Paints & Distemper", "bn": "রং ও ফিনিশিং", "color": "#84CC16"}
                ]
            },
            {
                "code": "BOQ_COMPONENT_TYPE",
                "name": "BOQ Rate Analysis Components",
                "desc": "Cost component breakdown for rate analysis",
                "items": [
                    {"code": "MATERIAL", "en": "Material Supply Component", "bn": "মালামাল সরবরাহ খরচ", "color": "#3B82F6"},
                    {"code": "LABOUR", "en": "Direct Labour Component", "bn": "শ্রমিক ও লেবার খরচ", "color": "#10B981"},
                    {"code": "EQUIPMENT", "en": "Equipment & Machinery Component", "bn": "যন্ত্রপাতি ও ইকুইপমেন্ট খরচ", "color": "#F59E0B"},
                    {"code": "SUBCONTRACT", "en": "Specialized Trade Subcontract Component", "bn": "সাবকন্ট্রাক্টর খরচ", "color": "#8B5CF6"}
                ]
            }
        ]

        for cat in lookup_data:
            c_code = cat["code"]
            c_name = cat["name"]
            c_desc = cat["desc"]
            
            c_check = await conn.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"),
                {"c": c_code}
            )
            cat_row = c_check.fetchone()
            if not cat_row:
                ins = await conn.execute(
                    text("""
                        INSERT INTO sys_lookup_categories (category_code, category_name, description, is_hierarchical)
                        VALUES (:code, :name, :desc, 0)
                    """),
                    {"code": c_code, "name": c_name, "desc": c_desc}
                )
                cat_id = ins.lastrowid
                print(f"   -> Created lookup category: {c_code} (ID: {cat_id})")
            else:
                cat_id = cat_row[0]

            # Insert Items
            for idx, item in enumerate(cat["items"]):
                i_check = await conn.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :code"),
                    {"cid": cat_id, "code": item["code"]}
                )
                if not i_check.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO sys_lookup_items 
                            (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_default, is_active)
                            VALUES (:cid, :code, :en, :bn, :color, :sort, 0, 1)
                        """),
                        {
                            "cid": cat_id,
                            "code": item["code"],
                            "en": item["en"],
                            "bn": item["bn"],
                            "color": item.get("color", "#10B981"),
                            "sort": idx
                        }
                    )
                    print(f"      + Seeded item: {item['code']} -> {item['en']}")

        # Ensure UNIT_OF_MEASURE has kg, m3, m2, running metre, piece, lump sum
        uom_cat = (await conn.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = 'UNIT_OF_MEASURE'"))).fetchone()
        if uom_cat:
            uom_cat_id = uom_cat[0]
            extra_uoms = [
                {"code": "KG", "en": "Kilogram (kg)", "bn": "কেজি"},
                {"code": "MT", "en": "Metric Ton (MT)", "bn": "মেট্রিক টন"},
                {"code": "CUM", "en": "Cubic Metre (m³)", "bn": "ঘনমিটার (m³)"},
                {"code": "SQM", "en": "Square Metre (m²)", "bn": "বর্গমিটার (m²)"},
                {"code": "RFT", "en": "Running Metre / Foot (RFT)", "bn": "রানিং মিটার / ফুট"},
                {"code": "NOS", "en": "Piece / Number (Nos)", "bn": "সংখ্যা / পিছ"},
                {"code": "LS", "en": "Lump Sum (LS)", "bn": "এককালীন / থোক"}
            ]
            for idx, u in enumerate(extra_uoms):
                u_check = await conn.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :code"),
                    {"cid": uom_cat_id, "code": u["code"]}
                )
                if not u_check.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_default, is_active)
                            VALUES (:cid, :code, :en, :bn, '#3B82F6', :sort, 0, 1)
                        """),
                        {"cid": uom_cat_id, "code": u["code"], "en": u["en"], "bn": u["bn"], "sort": 50 + idx}
                    )

    # 3. Seed Example BOQ Items for Residential Tower A
    print("3. Checking and seeding user example BOQ items for Residential Tower A...")
    async with AsyncSessionLocal() as session:
        proj = (await session.execute(select(Project).where(Project.project_name.ilike("%Residential Tower A%")))).scalars().first()
        if not proj:
            proj = (await session.execute(select(Project).order_by(Project.id.asc()))).scalars().first()

        if proj:
            print(f"   Target project: {proj.project_name} (ID: {proj.id})")
            
            # Find or get a tower
            tower = (await session.execute(select(Tower).where(Tower.project_id == proj.id))).scalars().first()
            tower_id = tower.id if tower else None

            # Find WBS Nodes for linking
            wbs_steel = (await session.execute(select(WBSNode).where(WBSNode.project_id == proj.id, WBSNode.node_code.ilike("%PIL%")))).scalars().first()
            wbs_concrete = (await session.execute(select(WBSNode).where(WBSNode.project_id == proj.id, WBSNode.node_code.ilike("%MAT%")))).scalars().first()
            wbs_brick = (await session.execute(select(WBSNode).where(WBSNode.project_id == proj.id, WBSNode.node_code.ilike("%BRK%")))).scalars().first()

            example_items = [
                {
                    "item_code": "BOQ-STL-001",
                    "item_description": "Reinforcement Steel (500W Deformed Bar)",
                    "specification": "500W grade high-strength deformed rebar conforming to BSTI BDS ISO 6935-2 and ASTM A615. Cold bent and tied with 20-gauge annealed GI wire.",
                    "material_category_id": "REBAR_STEEL",
                    "wbs_phase_id": "FOUNDATION_STRUCTURE",
                    "wbs_node_id": wbs_steel.id if wbs_steel else None,
                    "unit_of_measure_id": "KG",
                    "estimated_quantity": 50000.0,
                    "estimated_unit_rate": 100.0,
                    "total_estimated_cost": 5000000.0,
                    "material_rate": 85.00,
                    "labour_rate": 10.00,
                    "equipment_rate": 3.00,
                    "subcontract_rate": 2.00,
                    "tender_quantity": 50000.0,
                    "tender_unit_rate": 98.00,
                    "tender_total_amount": 4900000.0,
                    "contract_quantity": 50000.0,
                    "contract_unit_rate": 100.0,
                    "contract_total_amount": 5000000.0,
                    "revised_quantity": 50000.0,
                    "revised_unit_rate": 100.0,
                    "revised_total_amount": 5000000.0,
                    "actual_consumed_quantity": 28500.0,
                    "completed_quantity": 28000.0,
                    "remaining_quantity": 22000.0,
                    "requisitioned_quantity": 30000.0,
                    "actual_cost": 2850000.0,
                    "cost_variance": -2150000.0,
                    "hard_lock_percentage": 105.00,
                    "is_locked": True,
                    "version_no": 1,
                    "stage": "APPROVED_CONTRACT_BOQ",
                    "approved_by": "Engr. Mainul Hossain, Chief Consultant",
                    "approval_date": date(2026, 1, 15),
                    "rate_analysis_notes": "BSRM 500W factory rate @ BDT 85/kg + cutting/bending labour @ BDT 10/kg + lifting crane & bending machine @ BDT 3/kg + trade subcontractor margin @ BDT 2/kg = BDT 100/kg."
                },
                {
                    "item_code": "BOQ-CON-002",
                    "item_description": "Cast-In-Situ Ready-Mix Concrete (C-30 / 4000 PSI)",
                    "specification": "Design mix 4000 PSI (28 days cylinder compressive strength) using OPC cement, Sylhet sand FM 2.5, graded stone chips (20mm down) and MasterGlenium superplasticizer.",
                    "material_category_id": "READYMIX_CONCRETE",
                    "wbs_phase_id": "FOUNDATION_STRUCTURE",
                    "wbs_node_id": wbs_concrete.id if wbs_concrete else None,
                    "unit_of_measure_id": "CUM",
                    "estimated_quantity": 500.0,
                    "estimated_unit_rate": 8000.0,
                    "total_estimated_cost": 4000000.0,
                    "material_rate": 6500.00,
                    "labour_rate": 800.00,
                    "equipment_rate": 500.00,
                    "subcontract_rate": 200.00,
                    "tender_quantity": 500.0,
                    "tender_unit_rate": 7800.0,
                    "tender_total_amount": 3900000.0,
                    "contract_quantity": 500.0,
                    "contract_unit_rate": 8000.0,
                    "contract_total_amount": 4000000.0,
                    "revised_quantity": 500.0,
                    "revised_unit_rate": 8000.0,
                    "revised_total_amount": 4000000.0,
                    "actual_consumed_quantity": 210.0,
                    "completed_quantity": 210.0,
                    "remaining_quantity": 290.0,
                    "requisitioned_quantity": 220.0,
                    "actual_cost": 1680000.0,
                    "cost_variance": -2320000.0,
                    "hard_lock_percentage": 105.00,
                    "is_locked": True,
                    "version_no": 1,
                    "stage": "APPROVED_CONTRACT_BOQ",
                    "approved_by": "Engr. Mainul Hossain, Chief Consultant",
                    "approval_date": date(2026, 1, 15),
                    "rate_analysis_notes": "RMC supply delivered to site @ BDT 6,500/m³ + concrete pump & placing gang @ BDT 800/m³ + needle vibrator & cube test equipment @ BDT 500/m³ + testing and pouring contractor @ BDT 200/m³ = BDT 8,000/m³."
                },
                {
                    "item_code": "BOQ-BRK-003",
                    "item_description": "Brickwork & Auto Machine-Made Bricks (125mm Wall)",
                    "specification": "First class auto gas-burned bricks in 1:4 cement-sand mortar including raking out joints to 12mm depth, scaffolding, water curing for 14 continuous days.",
                    "material_category_id": "BRICK_MASONRY",
                    "wbs_phase_id": "MASONRY_FINISHING",
                    "wbs_node_id": wbs_brick.id if wbs_brick else None,
                    "unit_of_measure_id": "SQM",
                    "estimated_quantity": 2000.0,
                    "estimated_unit_rate": 1000.0,
                    "total_estimated_cost": 2000000.0,
                    "material_rate": 700.00,
                    "labour_rate": 250.00,
                    "equipment_rate": 30.00,
                    "subcontract_rate": 20.00,
                    "tender_quantity": 2000.0,
                    "tender_unit_rate": 950.0,
                    "tender_total_amount": 1900000.0,
                    "contract_quantity": 2000.0,
                    "contract_unit_rate": 1000.0,
                    "contract_total_amount": 2000000.0,
                    "revised_quantity": 2000.0,
                    "revised_unit_rate": 1000.0,
                    "revised_total_amount": 2000000.0,
                    "actual_consumed_quantity": 450.0,
                    "completed_quantity": 400.0,
                    "remaining_quantity": 1600.0,
                    "requisitioned_quantity": 500.0,
                    "actual_cost": 450000.0,
                    "cost_variance": -1550000.0,
                    "hard_lock_percentage": 105.00,
                    "is_locked": True,
                    "version_no": 1,
                    "stage": "APPROVED_CONTRACT_BOQ",
                    "approved_by": "Engr. Mainul Hossain, Chief Consultant",
                    "approval_date": date(2026, 1, 15),
                    "rate_analysis_notes": "60 nos auto bricks + 0.35 bag cement + 2.5 cft sand @ BDT 700/m² + mason and helper labour @ BDT 250/m² + mixer machine and scaffolding @ BDT 30/m² + contractor overhead @ BDT 20/m² = BDT 1,000/m²."
                }
            ]

            for item_data in example_items:
                existing = (await session.execute(
                    select(BOQItem).where(BOQItem.project_id == proj.id, BOQItem.item_code == item_data["item_code"])
                )).scalars().first()

                if not existing:
                    boq = BOQItem(
                        project_id=proj.id,
                        tower_id=tower_id,
                        **item_data
                    )
                    session.add(boq)
                    print(f"      + Added sample BOQ Item: {item_data['item_code']} - {item_data['item_description']}")
                else:
                    # Update with new breakdown fields
                    for k, v in item_data.items():
                        setattr(existing, k, v)
                    print(f"      ~ Updated sample BOQ Item: {item_data['item_code']}")

            await session.commit()
    print(">>> BOQ Management migration and seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(upgrade_and_seed_boq_management())
