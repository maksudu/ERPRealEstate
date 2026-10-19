import asyncio
from sqlalchemy import text
from app.core.database import engine

UPGRADE_DDL = [
    """
    CREATE TABLE IF NOT EXISTS con_material_requisitions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        requisition_number VARCHAR(64) NOT NULL UNIQUE,
        project_id BIGINT NOT NULL,
        tower_id BIGINT NULL,
        tower_name VARCHAR(64) NULL,
        floor_number VARCHAR(32) NULL,
        work_package VARCHAR(64) NOT NULL DEFAULT 'CIVIL_STRUCTURE',
        wbs_node_id BIGINT NULL,
        material_id BIGINT NOT NULL,
        boq_item_id BIGINT NULL,
        material_code VARCHAR(64) NOT NULL,
        material_name VARCHAR(191) NOT NULL,
        specification TEXT NULL,
        grade VARCHAR(64) NULL,
        unit_of_measure VARCHAR(32) NOT NULL DEFAULT 'BAG',
        requested_quantity DECIMAL(14, 4) NOT NULL,
        approved_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        issued_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        returned_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        consumed_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        wastage_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        damage_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        allowed_wastage_percentage DECIMAL(5, 2) NOT NULL DEFAULT 2.50,
        actual_wastage_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        stock_balance_at_request DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        boq_allocated_quantity DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        boq_previous_consumed DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        boq_remaining_headroom DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        store_id BIGINT NULL,
        supplier_name VARCHAR(191) NULL,
        batch_lot_number VARCHAR(64) NULL,
        storage_location VARCHAR(128) NULL,
        requested_by_user_id BIGINT NOT NULL,
        requisition_date DATE NOT NULL,
        required_by_date DATE NULL,
        priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
        approved_by_user_id BIGINT NULL,
        approval_date DATE NULL,
        rejection_reason TEXT NULL,
        purpose_remarks TEXT NULL,
        purchase_requisition_id BIGINT NULL,
        min_number VARCHAR(64) NULL,
        received_date DATE NULL,
        received_by_user_id BIGINT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_smr_project (project_id),
        INDEX idx_smr_wbs (wbs_node_id),
        INDEX idx_smr_boq (boq_item_id),
        INDEX idx_smr_material (material_id),
        INDEX idx_smr_store (store_id),
        INDEX idx_smr_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS con_material_consumptions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        requisition_id BIGINT NOT NULL,
        min_id BIGINT NULL,
        project_id BIGINT NOT NULL,
        wbs_node_id BIGINT NULL,
        material_id BIGINT NOT NULL,
        consumption_date DATE NOT NULL,
        quantity_consumed DECIMAL(14, 4) NOT NULL,
        quantity_returned DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        quantity_wasted DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        quantity_damaged DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
        unit_of_measure VARCHAR(32) NOT NULL DEFAULT 'BAG',
        unit_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        total_consumption_cost DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        variance_cost DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        batch_lot_number VARCHAR(64) NULL,
        work_location VARCHAR(191) NULL,
        subcontractor_id BIGINT NULL,
        recorded_by_user_id BIGINT NULL,
        verification_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED',
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cmc_req (requisition_id),
        INDEX idx_cmc_prj (project_id),
        INDEX idx_cmc_wbs (wbs_node_id),
        INDEX idx_cmc_mat (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS con_material_returns (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        rts_number VARCHAR(64) NOT NULL UNIQUE,
        requisition_id BIGINT NOT NULL,
        store_id BIGINT NOT NULL,
        project_id BIGINT NOT NULL,
        material_id BIGINT NOT NULL,
        return_date DATE NOT NULL,
        returned_quantity DECIMAL(14, 4) NOT NULL,
        unit_of_measure VARCHAR(32) NOT NULL DEFAULT 'BAG',
        condition_status VARCHAR(32) NOT NULL DEFAULT 'GOOD',
        return_reason VARCHAR(191) NULL,
        returned_by_user_id BIGINT NOT NULL,
        accepted_by_storekeeper_id BIGINT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED_IN_STORE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cmr_req (requisition_id),
        INDEX idx_cmr_store (store_id),
        INDEX idx_cmr_prj (project_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

LOOKUP_CATEGORIES = [
    {
        "code": "MATERIAL_WORK_PACKAGE",
        "name": "Material Work Packages",
        "desc": "Civil, structural, masonry, finishing and MEP work packages",
        "items": [
            {"code": "CIVIL_STRUCTURE", "en": "Civil Substructure & Superstructure", "bn": "সিভিল ও অবকাঠামো", "color": "#3B82F6"},
            {"code": "MASONRY_BRICKWORK", "en": "Masonry & Auto Brickwork", "bn": "গাঁথুনি ও ব্রিকওয়ার্ক", "color": "#EF4444"},
            {"code": "PLASTER_FINISHING", "en": "Plastering & Surface Finishing", "bn": "প্লাস্টার ও ফিনিশিং", "color": "#8B5CF6"},
            {"code": "TILES_FLOORING", "en": "Floor Tiles & Wall Cladding", "bn": "টাইলস ও ফ্লোরিং", "color": "#EC4899"},
            {"code": "PLUMBING_SANITARY", "en": "Plumbing & Sanitary Piping", "bn": "প্লাম্বিং ও স্যানিটারি", "color": "#06B6D4"},
            {"code": "ELECTRICAL_MEP", "en": "Electrical Conduit, Cables & MEP", "bn": "ইলেকট্রিক্যাল ও এমইপি", "color": "#F59E0B"},
            {"code": "PAINTING", "en": "Exterior & Interior Painting", "bn": "রং ও ডেকোরেশন", "color": "#84CC16"}
        ]
    },
    {
        "code": "REQUISITION_PRIORITY",
        "name": "Requisition Priority Levels",
        "desc": "Priority classification for site material indents",
        "items": [
            {"code": "LOW", "en": "Low Priority (Buffer Stock)", "bn": "কম জরুরি (বাফার স্টক)", "color": "#64748B"},
            {"code": "NORMAL", "en": "Normal Operational Schedule", "bn": "সাধারণ শিডিউল", "color": "#3B82F6"},
            {"code": "URGENT", "en": "Urgent (Required within 24h)", "bn": "জরুরি (২৪ ঘণ্টার মধ্যে)", "color": "#F59E0B"},
            {"code": "CRITICAL", "en": "Critical (Casting Stoppage Risk)", "bn": "চরম সংকটপূর্ণ (কাস্টিং ঝুঁকি)", "color": "#EF4444"}
        ]
    },
    {
        "code": "REQUISITION_STATUS",
        "name": "Material Requisition Lifecycle Statuses",
        "desc": "Lifecycle states from site indent to store issue and consumption",
        "items": [
            {"code": "DRAFT", "en": "Draft Requisition", "bn": "খসড়া রিকুইজিশন", "color": "#94A3B8"},
            {"code": "PENDING_APPROVAL", "en": "Pending PM Review & Approval", "bn": "পিএম পর্যালোচনার অপেক্ষায়", "color": "#F59E0B"},
            {"code": "APPROVED", "en": "Approved by Project Manager", "bn": "পিএম কর্তৃক অনুমোদিত", "color": "#10B981"},
            {"code": "REJECTED", "en": "Rejected", "bn": "প্রত্যাখ্যাত", "color": "#EF4444"},
            {"code": "PO_INITIATED", "en": "Procurement PO Initiated (Shortage)", "bn": "ক্রয়াদেশ প্রক্রিয়াকরণ", "color": "#8B5CF6"},
            {"code": "PARTIALLY_ISSUED", "en": "Partially Issued from Store", "bn": "আংশিক প্রদানকৃত", "color": "#06B6D4"},
            {"code": "ISSUED", "en": "Fully Issued (MIN Logged)", "bn": "সম্পূর্ণ প্রদানকৃত", "color": "#3B82F6"},
            {"code": "RECEIVED_AT_SITE", "en": "Confirmed Received at Site", "bn": "সাইটে গ্রহণ নিশ্চিত", "color": "#10B981"},
            {"code": "CONSUMED", "en": "Consumed & Reconciled against WBS", "bn": "কাজে ব্যবহার সম্পন্ন", "color": "#059669"},
            {"code": "CLOSED", "en": "Fully Reconciled & Closed", "bn": "সম্পূর্ণ সমাপ্ত", "color": "#475569"}
        ]
    },
    {
        "code": "RETURN_REASON",
        "name": "Material Return Reasons",
        "desc": "Site surplus, damage or off-spec material return classifications",
        "items": [
            {"code": "EXCESS_AFTER_CASTING", "en": "Surplus Left After Slab/Column Casting", "bn": "কাস্টিং পরবর্তী অতিরিক্ত", "color": "#3B82F6"},
            {"code": "SURPLUS_STOCK", "en": "General Site Surplus", "bn": "সাইট উদ্বৃত্ত স্টক", "color": "#10B981"},
            {"code": "OFF_SPEC_MATERIAL", "en": "Off-Specification or Wrong Grade Delivered", "bn": "ভুল গ্রেড / অফ-স্পেক", "color": "#EF4444"},
            {"code": "DAMAGED_ON_SITE", "en": "Weather or Mechanical Damage on Site", "bn": "সাইটে ক্ষতিগ্রস্ত", "color": "#F59E0B"},
            {"code": "PROJECT_COMPLETED", "en": "Package/Work Finished Return", "bn": "কাজ সমাপ্তি পরবর্তী ফেরত", "color": "#8B5CF6"}
        ]
    },
    {
        "code": "RETURN_CONDITION",
        "name": "Return Material Conditions",
        "desc": "Physical condition of returned materials",
        "items": [
            {"code": "GOOD", "en": "Good (Reusable Prime Stock)", "bn": "ভালো (পুনর্ব্যবহারযোগ্য)", "color": "#10B981"},
            {"code": "PARTIALLY_DAMAGED", "en": "Partially Damaged (Usable for Minor Works)", "bn": "আংশিক ক্ষতিগ্রস্ত", "color": "#F59E0B"},
            {"code": "SCRAP", "en": "Scrap / Unusable Defective", "bn": "স্ক্র্যাপ / বাতিল", "color": "#EF4444"}
        ]
    }
]

SEED_SAMPLE_REQUISITIONS = [
    {
        "id": 1,
        "req_no": "MR-2026-001",
        "project_id": 1,
        "tower_id": 1,
        "tower_name": "Residential Tower A",
        "floor": "5th Floor",
        "package": "CIVIL_STRUCTURE",
        "wbs_id": 1,
        "mat_id": 1,
        "boq_id": 1,
        "code": "MAT-REBAR-500W",
        "name": "500W TMT Deformed Rebar (16mm/20mm/25mm)",
        "spec": "High strength deformed steel rebar for L5 beam & slab reinforcement binding",
        "grade": "500W Grade 60",
        "uom": "TON",
        "req_qty": 12.5000,
        "app_qty": 12.5000,
        "iss_qty": 12.5000,
        "ret_qty": 0.5000,
        "con_qty": 11.7500,
        "wast_qty": 0.2500,
        "dam_qty": 0.0000,
        "allow_wast": 2.50,
        "act_wast": 2.08,
        "stock_bal": 45.0000,
        "boq_alloc": 50.0000,
        "boq_prev": 15.0000,
        "boq_head": 37.5000,
        "store_id": 1,
        "supplier": "BSRM Steels Ltd",
        "batch": "BATCH-BSRM-500W-2026-08",
        "loc": "Yard-A Steel Stacking Bay",
        "user_id": 1,
        "req_date": "2026-10-10",
        "need_date": "2026-10-12",
        "priority": "URGENT",
        "app_user_id": 1,
        "app_date": "2026-10-10",
        "remarks": "Casting of Level 5 beam and slab structure",
        "min": "MIN-2026-001",
        "rec_date": "2026-10-11",
        "rec_user_id": 1,
        "status": "CONSUMED"
    },
    {
        "id": 2,
        "req_no": "MR-2026-002",
        "project_id": 1,
        "tower_id": 1,
        "tower_name": "Residential Tower A",
        "floor": "5th Floor",
        "package": "CIVIL_STRUCTURE",
        "wbs_id": 1,
        "mat_id": 2,
        "boq_id": 2,
        "code": "MAT-CEM-PCC",
        "name": "Portland Composite Cement (PCC 42.5N)",
        "spec": "Ready for 4000 PSI concrete batching for 5th floor column casting",
        "grade": "PCC 42.5N",
        "uom": "BAG",
        "req_qty": 450.0000,
        "app_qty": 450.0000,
        "iss_qty": 450.0000,
        "ret_qty": 0.0000,
        "con_qty": 438.0000,
        "wast_qty": 12.0000,
        "dam_qty": 0.0000,
        "allow_wast": 3.00,
        "act_wast": 2.67,
        "stock_bal": 1200.0000,
        "boq_alloc": 2500.0000,
        "boq_prev": 800.0000,
        "boq_head": 1825.0000,
        "store_id": 1,
        "supplier": "Shah Cement Industries Ltd",
        "batch": "LOT-SHAH-OCT-2026",
        "loc": "Shed-1 Cement Warehouse",
        "user_id": 1,
        "req_date": "2026-10-12",
        "need_date": "2026-10-14",
        "priority": "NORMAL",
        "app_user_id": 1,
        "app_date": "2026-10-12",
        "remarks": "5th Floor Column Casting & Beam Joint Grouting",
        "min": "MIN-2026-002",
        "rec_date": "2026-10-13",
        "rec_user_id": 1,
        "status": "CONSUMED"
    },
    {
        "id": 3,
        "req_no": "MR-2026-003",
        "project_id": 1,
        "tower_id": 1,
        "tower_name": "Residential Tower A",
        "floor": "3rd Floor",
        "package": "MASONRY_BRICKWORK",
        "wbs_id": 1,
        "mat_id": 5,
        "boq_id": 3,
        "code": "MAT-BRICK-AUTO",
        "name": "1st Class Gas-Burned Auto Machine Bricks",
        "spec": "Exterior perimeter and internal partition 125mm wall masonry",
        "grade": "1st Class Auto",
        "uom": "NOS",
        "req_qty": 15000.0000,
        "app_qty": 15000.0000,
        "iss_qty": 10000.0000,
        "ret_qty": 0.0000,
        "con_qty": 0.0000,
        "wast_qty": 0.0000,
        "dam_qty": 0.0000,
        "allow_wast": 2.00,
        "act_wast": 0.00,
        "stock_bal": 8000.0000,
        "boq_alloc": 80000.0000,
        "boq_prev": 25000.0000,
        "boq_head": 59000.0000,
        "store_id": 1,
        "supplier": "Mir Ceramic & Bricks Ltd",
        "batch": "PALLET-MIR-2026-09",
        "loc": "Ground Floor Brick Stacking Area",
        "user_id": 1,
        "req_date": "2026-10-16",
        "need_date": "2026-10-19",
        "priority": "CRITICAL",
        "app_user_id": 1,
        "app_date": "2026-10-16",
        "remarks": "3rd Floor internal partition masonry work. Store stock 8000 NOS dispatched, balance scheduled next delivery.",
        "min": "MIN-2026-003",
        "rec_date": "2026-10-17",
        "rec_user_id": 1,
        "status": "PARTIALLY_ISSUED"
    },
    {
        "id": 4,
        "req_no": "MR-2026-004",
        "project_id": 1,
        "tower_id": 1,
        "tower_name": "Residential Tower A",
        "floor": "4th Floor",
        "package": "TILES_FLOORING",
        "wbs_id": 1,
        "mat_id": 6,
        "boq_id": None,
        "code": "MAT-TILES-PORC",
        "name": "60x60cm Glazed Mirror Polish Porcelain Tiles",
        "spec": "Mirror polish vitrified tiles for 4th floor living and bedroom flooring",
        "grade": "AAA Mirror Polish",
        "uom": "SQFT",
        "req_qty": 5000.0000,
        "app_qty": 0.0000,
        "iss_qty": 0.0000,
        "ret_qty": 0.0000,
        "con_qty": 0.0000,
        "wast_qty": 0.0000,
        "dam_qty": 0.0000,
        "allow_wast": 5.00,
        "act_wast": 0.00,
        "stock_bal": 300.0000,
        "boq_alloc": 15000.0000,
        "boq_prev": 0.0000,
        "boq_head": 15750.0000,
        "store_id": 1,
        "supplier": "RAK Ceramics BD Ltd",
        "batch": None,
        "loc": "Central Finishing Store",
        "user_id": 1,
        "req_date": "2026-10-18",
        "need_date": "2026-10-22",
        "priority": "NORMAL",
        "app_user_id": None,
        "app_date": None,
        "remarks": "4th floor unit finishes. Store stock is insufficient (300 SQFT vs 5000 SQFT needed). Need PR.",
        "min": None,
        "rec_date": None,
        "rec_user_id": None,
        "status": "PENDING_APPROVAL"
    }
]

async def run_upgrade():
    async with engine.begin() as conn:
        print("1. Creating material requisition tables...")
        for ddl in UPGRADE_DDL:
            await conn.execute(text(ddl))
        print("   -> Tables created successfully.")

        print("2. Seeding lookup categories & items...")
        for cat in LOOKUP_CATEGORIES:
            c_check = await conn.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"),
                {"c": cat["code"]}
            )
            cat_row = c_check.fetchone()
            if not cat_row:
                ins = await conn.execute(
                    text("""
                        INSERT INTO sys_lookup_categories (category_code, category_name, description, is_hierarchical, is_system_locked, is_active)
                        VALUES (:code, :name, :desc, 0, 1, 1)
                    """),
                    {"code": cat["code"], "name": cat["name"], "desc": cat["desc"]}
                )
                cat_id = ins.lastrowid
                print(f"   -> Created lookup category: {cat['code']} (ID: {cat_id})")
            else:
                cat_id = cat_row[0]

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
                            "color": item["color"],
                            "sort": idx + 1
                        }
                    )
        print("   -> Lookups seeded successfully.")

        print("3. Seeding operational material requisition records...")
        for r in SEED_SAMPLE_REQUISITIONS:
            exists = await conn.execute(
                text("SELECT id FROM con_material_requisitions WHERE requisition_number = :rn"),
                {"rn": r["req_no"]}
            )
            if not exists.fetchone():
                await conn.execute(
                    text("""
                        INSERT INTO con_material_requisitions (
                            requisition_number, project_id, tower_id, tower_name, floor_number,
                            work_package, wbs_node_id, material_id, boq_item_id,
                            material_code, material_name, specification, grade, unit_of_measure,
                            requested_quantity, approved_quantity, issued_quantity, returned_quantity, consumed_quantity,
                            wastage_quantity, damage_quantity, allowed_wastage_percentage, actual_wastage_percentage,
                            stock_balance_at_request, boq_allocated_quantity, boq_previous_consumed, boq_remaining_headroom,
                            store_id, supplier_name, batch_lot_number, storage_location,
                            requested_by_user_id, requisition_date, required_by_date, priority,
                            approved_by_user_id, approval_date, purpose_remarks,
                            min_number, received_date, received_by_user_id, status
                        ) VALUES (
                            :req_no, :project_id, :tower_id, :tower_name, :floor,
                            :package, :wbs_id, :mat_id, :boq_id,
                            :code, :name, :spec, :grade, :uom,
                            :req_qty, :app_qty, :iss_qty, :ret_qty, :con_qty,
                            :wast_qty, :dam_qty, :allow_wast, :act_wast,
                            :stock_bal, :boq_alloc, :boq_prev, :boq_head,
                            :store_id, :supplier, :batch, :loc,
                            :user_id, :req_date, :need_date, :priority,
                            :app_user_id, :app_date, :remarks,
                            :min, :rec_date, :rec_user_id, :status
                        )
                    """),
                    r
                )
                print(f"   -> Seeded requisition {r['req_no']}")

        # Seed sample consumption record if not exists
        c_check = await conn.execute(text("SELECT id FROM con_material_consumptions WHERE requisition_id = 1"))
        if not c_check.fetchone():
            await conn.execute(
                text("""
                    INSERT INTO con_material_consumptions (
                        requisition_id, min_id, project_id, wbs_node_id, material_id,
                        consumption_date, quantity_consumed, quantity_returned, quantity_wasted, quantity_damaged,
                        unit_of_measure, unit_cost, total_consumption_cost, variance_cost,
                        batch_lot_number, work_location, subcontractor_id, recorded_by_user_id,
                        verification_status, remarks
                    ) VALUES (
                        1, NULL, 1, 1, 1,
                        '2026-10-14', 11.7500, 0.5000, 0.2500, 0.0000,
                        'TON', 98500.00, 1157375.00, 24625.00,
                        'BATCH-BSRM-500W-2026-08', 'Residential Tower A - 5th Floor Slab & Beams', 1, 1,
                        'VERIFIED', 'Reinforcement binding verified prior to casting. 0.5 TON return delivered to site store.'
                    )
                """)
            )
            print("   -> Seeded sample material consumption record")

        # Seed sample return to store record if not exists
        r_check = await conn.execute(text("SELECT id FROM con_material_returns WHERE rts_number = 'RTS-2026-001'"))
        if not r_check.fetchone():
            await conn.execute(
                text("""
                    INSERT INTO con_material_returns (
                        rts_number, requisition_id, store_id, project_id, material_id,
                        return_date, returned_quantity, unit_of_measure, condition_status,
                        return_reason, returned_by_user_id, accepted_by_storekeeper_id, status
                    ) VALUES (
                        'RTS-2026-001', 1, 1, 1, 1,
                        '2026-10-15', 0.5000, 'TON', 'GOOD',
                        'EXCESS_AFTER_CASTING', 1, 1, 'RECEIVED_IN_STORE'
                    )
                """)
            )
            print("   -> Seeded sample return-to-store record")

    print("\nDatabase upgrade completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_upgrade())
