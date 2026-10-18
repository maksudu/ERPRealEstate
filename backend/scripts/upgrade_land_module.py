import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

LOOKUP_CATEGORIES_TO_ENSURE = [
    {
        "category_code": "LANDOWNER_TYPE",
        "category_name": "Landowner / Seller Entity Type",
        "description": "Individual, Joint Co-Owner, Company, Power-of-Attorney Holder",
        "items": [
            {"item_code": "INDIVIDUAL", "item_name_en": "Individual Owner", "item_name_bn": "একক মালিক", "display_order": 1},
            {"item_code": "JOINT_OWNER", "item_name_en": "Joint Co-Owner", "item_name_bn": "যৌথ সহ-মালিক", "display_order": 2},
            {"item_code": "COMPANY", "item_name_en": "Corporate Entity / Company", "item_name_bn": "কোম্পানি / প্রতিষ্ঠান", "display_order": 3},
            {"item_code": "POA_HOLDER", "item_name_en": "Power of Attorney (PoA) Holder", "item_name_bn": "আমমোক্তারনামা গ্রহীতা", "display_order": 4}
        ]
    },
    {
        "category_code": "OWNERSHIP_NATURE",
        "category_name": "Land Ownership Acquisition Nature",
        "description": "Inherited / Warish, Saf-Kabala Purchase, Gift / Heba, Auction",
        "items": [
            {"item_code": "INHERITED", "item_name_en": "Inherited (Paitrik / Warishan)", "item_name_bn": "ওয়ারিশান / পৈতৃক সূত্রে", "display_order": 1},
            {"item_code": "PURCHASED", "item_name_en": "Direct Purchased (Saf-Kabala)", "item_name_bn": "খরিদ / সাফ-কবলা সূত্রে", "display_order": 2},
            {"item_code": "GIFT_HEBA", "item_name_en": "Gift / Heba Bil Ewaz", "item_name_bn": "দান / হেবা বিল এওয়াজ", "display_order": 3},
            {"item_code": "COURT_DECREE", "item_name_en": "Court Decree / Auction Settlement", "item_name_bn": "আদালতের ডিক্রি সূত্রে", "display_order": 4}
        ]
    },
    {
        "category_code": "LANDOWNER_STATUS",
        "category_name": "Landowner Verification Status",
        "description": "Prospect, Under Verification, Active, Blocked, Archived",
        "items": [
            {"item_code": "PROSPECT", "item_name_en": "Prospect / Negotiation", "item_name_bn": "প্রাথমিক প্রস্তাবনা", "display_order": 1},
            {"item_code": "UNDER_VERIFICATION", "item_name_en": "Under Legal & Title Verification", "item_name_bn": "দলিল যাচাই প্রক্রিয়াধীন", "display_order": 2},
            {"item_code": "ACTIVE", "item_name_en": "Active Verified Title Holder", "item_name_bn": "অনুমোদিত ও সক্রিয় মালিক", "display_order": 3},
            {"item_code": "BLOCKED", "item_name_en": "Blocked / Disputed Title", "item_name_bn": "স্থগিত / বিরোধপূর্ণ", "display_order": 4},
            {"item_code": "ARCHIVED", "item_name_en": "Archived Record", "item_name_bn": "আর্কাইভকৃত", "display_order": 5}
        ]
    },
    {
        "category_code": "OPPORTUNITY_SOURCE",
        "category_name": "Land Opportunity Lead Source",
        "description": "Direct Landowner, Enlisted Broker, Channel Agent, Internal Acquisition Team",
        "items": [
            {"item_code": "BROKER", "item_name_en": "Enlisted Land Broker", "item_name_bn": "তালিকাভুক্ত ব্রোকার", "display_order": 1},
            {"item_code": "LANDOWNER", "item_name_en": "Direct Landowner", "item_name_bn": "সরাসরি ভূমির মালিক", "display_order": 2},
            {"item_code": "AGENT", "item_name_en": "Channel Partner / Agent", "item_name_bn": "চ্যানেল এজেন্ট", "display_order": 3},
            {"item_code": "INTERNAL_TEAM", "item_name_en": "Internal Land Scout Team", "item_name_bn": "নিজস্ব স্কাউট দল", "display_order": 4}
        ]
    },
    {
        "category_code": "PROPOSAL_WORKFLOW",
        "category_name": "Land Proposal Stage Workflow",
        "description": "5-Stage Acquisition Workflow from Opportunity to Negotiation",
        "items": [
            {"item_code": "IDENTIFIED", "item_name_en": "1. Opportunity Identified", "item_name_bn": "১. সুযোগ চিহ্নিত", "display_order": 1},
            {"item_code": "SCREENING_INSPECTION", "item_name_en": "2. Initial Screening & Site Inspection", "item_name_bn": "২. প্রাথমিক যাচাই ও পরিদর্শণ", "display_order": 2},
            {"item_code": "FEASIBILITY_VALUATION", "item_name_en": "3. Feasibility & Preliminary Valuation", "item_name_bn": "৩. সম্ভাব্যতা ও মূল্যায়ন", "display_order": 3},
            {"item_code": "MANAGEMENT_APPROVAL", "item_name_en": "4. Management Board Approval", "item_name_bn": "৪. পরিচালনা পর্ষদ অনুমোদন", "display_order": 4},
            {"item_code": "DUE_DILIGENCE_NEGOTIATION", "item_name_en": "5. Due Diligence & Negotiation", "item_name_bn": "৫. চূড়ান্ত চুক্তি ও দরকষাকষি", "display_order": 5},
            {"item_code": "ACQUIRED", "item_name_en": "Acquired / JV Signed", "item_name_bn": "অর্জিত / জেভি স্বাক্ষরিত", "display_order": 6},
            {"item_code": "REJECTED", "item_name_en": "Rejected / Non-Feasible", "item_name_bn": "বাতিলকৃত", "display_order": 7}
        ]
    },
    {
        "category_code": "PARCEL_ACQUISITION_STATUS",
        "category_name": "Land Parcel Acquisition Status",
        "description": "Proposed, Under Review, Approved, Acquired, Rejected",
        "items": [
            {"item_code": "PROPOSED", "item_name_en": "Proposed Parcel", "item_name_bn": "প্রস্তাবিত পার্সেল", "display_order": 1},
            {"item_code": "UNDER_REVIEW", "item_name_en": "Under Legal Review", "item_name_bn": "আইনগত যাচাই চলছে", "display_order": 2},
            {"item_code": "APPROVED", "item_name_en": "Approved for Acquisition", "item_name_bn": "অধিগ্রহণে অনুমোদিত", "display_order": 3},
            {"item_code": "ACQUIRED", "item_name_en": "Acquired & Demarcated", "item_name_bn": "অর্জিত ও সীমানা চিহ্নিত", "display_order": 4}
        ]
    },
    {
        "category_code": "PROPOSED_DEVELOPMENT_TYPE",
        "category_name": "Proposed Development Classification",
        "description": "Residential Luxury, Commercial Tower, Mixed-Use Complex",
        "items": [
            {"item_code": "RESIDENTIAL", "item_name_en": "Luxury Residential Apartments", "item_name_bn": "আবাসিক অ্যাপার্টমেন্ট প্রকল্প", "display_order": 1},
            {"item_code": "COMMERCIAL", "item_name_en": "Commercial Corporate Tower", "item_name_bn": "বাণিজ্যিক টাওয়ার", "display_order": 2},
            {"item_code": "MIXED_USE", "item_name_en": "Mixed-Use Complex (Retail + Living)", "item_name_bn": "মিশ্র ব্যবহার প্রকল্প", "display_order": 3},
            {"item_code": "GATED_COMMUNITY", "item_name_en": "Exclusive Gated Enclave / Villas", "item_name_bn": "গেটেড কমিউনিটি ভিলা", "display_order": 4}
        ]
    }
]

async def upgrade_database():
    print("[1/5] Connecting to database...")
    async with engine.begin() as conn:
        # 1. Update lnd_landowners table
        print("[2/5] Upgrading lnd_landowners table columns...")
        # Check existing columns
        desc = await conn.execute(text("DESCRIBE lnd_landowners"))
        cols = [r[0] for r in desc.fetchall()]

        # Make land_bank_id nullable
        await conn.execute(text("ALTER TABLE lnd_landowners MODIFY land_bank_id BIGINT NULL"))

        if "landowner_code" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN landowner_code VARCHAR(64) NULL AFTER id"))
            await conn.execute(text("CREATE UNIQUE INDEX idx_lnd_landowners_code ON lnd_landowners (landowner_code)"))

        if "father_mother_spouse_name" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN father_mother_spouse_name VARCHAR(191) NULL AFTER full_name_bn"))

        if "present_address" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN present_address TEXT NULL AFTER father_mother_spouse_name"))

        if "permanent_address" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN permanent_address TEXT NULL AFTER present_address"))

        if "passport_number" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN passport_number VARCHAR(64) NULL AFTER nid_number"))

        if "company_reg_number" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN company_reg_number VARCHAR(64) NULL AFTER passport_number"))

        if "email" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN email VARCHAR(128) NULL AFTER phone_number"))

        if "emergency_contact_name" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN emergency_contact_name VARCHAR(128) NULL AFTER email"))

        if "emergency_contact_phone" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN emergency_contact_phone VARCHAR(32) NULL AFTER emergency_contact_name"))

        if "ownership_nature" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN ownership_nature VARCHAR(32) NOT NULL DEFAULT 'INHERITED' AFTER ownership_share_ratio"))

        if "bank_name" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN bank_name VARCHAR(128) NULL AFTER bank_details"))
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN bank_branch VARCHAR(128) NULL AFTER bank_name"))
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN bank_account_no VARCHAR(64) NULL AFTER bank_branch"))
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN bank_routing_no VARCHAR(32) NULL AFTER bank_account_no"))
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN bank_account_holder VARCHAR(128) NULL AFTER bank_routing_no"))

        if "nominee_details" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN nominee_details JSON NULL AFTER bank_account_holder"))

        if "poa_details" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN poa_details JSON NULL AFTER nominee_details"))

        if "supporting_documents" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN supporting_documents JSON NULL AFTER poa_details"))

        if "negotiation_notes" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN negotiation_notes JSON NULL AFTER supporting_documents"))

        if "status" not in cols:
            await conn.execute(text("ALTER TABLE lnd_landowners ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' AFTER negotiation_notes"))
            await conn.execute(text("CREATE INDEX idx_lnd_landowners_status ON lnd_landowners (status)"))

        # Populate landowner_code for existing records if null
        await conn.execute(text("""
            UPDATE lnd_landowners 
            SET landowner_code = CONCAT('LND-OWN-', LPAD(id, 4, '0')) 
            WHERE landowner_code IS NULL
        """))
        print("  [OK] lnd_landowners table updated successfully.")

        # 2. Update lnd_land_banks table for proposals
        print("[3/5] Upgrading lnd_land_banks table columns for opportunity search & feasibility...")
        desc_lb = await conn.execute(text("DESCRIBE lnd_land_banks"))
        cols_lb = [r[0] for r in desc_lb.fetchall()]

        if "opportunity_source" not in cols_lb:
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN opportunity_source VARCHAR(64) NOT NULL DEFAULT 'BROKER' AFTER deal_type"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN source_contact_details VARCHAR(255) NULL AFTER opportunity_source"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN road_access_width_ft DECIMAL(6,2) NOT NULL DEFAULT 40.00 AFTER source_contact_details"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN surrounding_development TEXT NULL AFTER road_access_width_ft"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN proposed_development_type VARCHAR(64) NOT NULL DEFAULT 'RESIDENTIAL' AFTER surrounding_development"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN far_potential DECIMAL(5,2) NOT NULL DEFAULT 4.50 AFTER proposed_development_type"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN max_allowable_floors INT NOT NULL DEFAULT 14 AFTER far_potential"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN ground_coverage_percent DECIMAL(5,2) NOT NULL DEFAULT 50.00 AFTER max_allowable_floors"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN estimated_builtup_sqft DECIMAL(16,2) NOT NULL DEFAULT 0.00 AFTER ground_coverage_percent"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN indicative_cost_total DECIMAL(16,2) NOT NULL DEFAULT 0.00 AFTER estimated_builtup_sqft"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN indicative_cost_per_katha DECIMAL(16,2) NOT NULL DEFAULT 0.00 AFTER indicative_cost_total"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN workflow_stage VARCHAR(64) NOT NULL DEFAULT 'IDENTIFIED' AFTER status"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN preliminary_valuation_notes TEXT NULL AFTER workflow_stage"))
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN feasibility_report_summary JSON NULL AFTER preliminary_valuation_notes"))
            await conn.execute(text("CREATE INDEX idx_lnd_land_banks_wf ON lnd_land_banks (workflow_stage)"))
        print("  [OK] lnd_land_banks table updated successfully.")

        # 3. Create lnd_parcels table
        print("[4/5] Creating lnd_parcels and lnd_landowner_parcel_links tables...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_parcels (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                parcel_id VARCHAR(64) NOT NULL UNIQUE,
                land_bank_id BIGINT NULL,
                project_id BIGINT NULL,
                project_name VARCHAR(191) NOT NULL,
                division VARCHAR(64) NOT NULL DEFAULT 'Dhaka Division',
                district VARCHAR(64) NOT NULL DEFAULT 'Dhaka',
                upazila_thana VARCHAR(128) NOT NULL DEFAULT 'Gulshan',
                mouza_name VARCHAR(128) NOT NULL,
                jl_number VARCHAR(64) NOT NULL,
                khatian_number VARCHAR(64) NOT NULL,
                dag_number VARCHAR(64) NOT NULL,
                land_classification VARCHAR(64) NOT NULL DEFAULT 'RESIDENTIAL',
                total_area_decimal DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                total_area_katha DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                total_area_bigha DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                total_area_sqft DECIMAL(16,2) NOT NULL DEFAULT 0.00,
                acquisition_status VARCHAR(64) NOT NULL DEFAULT 'PROPOSED',
                gps_latitude DECIMAL(10,7) NULL,
                gps_longitude DECIMAL(10,7) NULL,
                boundary_north VARCHAR(255) NULL,
                boundary_south VARCHAR(255) NULL,
                boundary_east VARCHAR(255) NULL,
                boundary_west VARCHAR(255) NULL,
                road_access_width_ft DECIMAL(6,2) NOT NULL DEFAULT 40.00,
                deed_number VARCHAR(128) NULL,
                deed_date DATE NULL,
                source_record_info JSON NULL,
                gis_polygon_data JSON NULL,
                remarks TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_parcel_mouza (mouza_name),
                INDEX idx_parcel_status (acquisition_status),
                INDEX idx_parcel_project (project_id),
                CONSTRAINT fk_parcel_land_bank FOREIGN KEY (land_bank_id) REFERENCES lnd_land_banks (id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_landowner_parcel_links (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                landowner_id BIGINT NOT NULL,
                parcel_id BIGINT NOT NULL,
                ownership_share_percent DECIMAL(6,2) NOT NULL DEFAULT 100.00,
                title_deed_no VARCHAR(128) NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_link_owner (landowner_id),
                INDEX idx_link_parcel (parcel_id),
                CONSTRAINT fk_link_owner FOREIGN KEY (landowner_id) REFERENCES lnd_landowners (id) ON DELETE CASCADE,
                CONSTRAINT fk_link_parcel FOREIGN KEY (parcel_id) REFERENCES lnd_parcels (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("  [OK] lnd_parcels and lnd_landowner_parcel_links created.")

        # 4. Seed dynamic lookup categories & items
        print("[5/5] Seeding dynamic lookup categories and items...")
        for cat in LOOKUP_CATEGORIES_TO_ENSURE:
            cat_exist = await conn.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"),
                {"code": cat["category_code"]}
            )
            cat_row = cat_exist.fetchone()
            if not cat_row:
                cat_ins = await conn.execute(
                    text("""
                        INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active, created_at)
                        VALUES (:code, :name, :desc, 1, NOW())
                    """),
                    {"code": cat["category_code"], "name": cat["category_name"], "desc": cat["description"]}
                )
                cat_id = cat_ins.lastrowid
            else:
                cat_id = cat_row[0]

            for item in cat["items"]:
                item_exist = await conn.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :icode"),
                    {"cid": cat_id, "icode": item["item_code"]}
                )
                if not item_exist.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_active, created_at)
                            VALUES (:cid, :icode, :name_en, :name_bn, :ord, 1, NOW())
                        """),
                        {
                            "cid": cat_id,
                            "icode": item["item_code"],
                            "name_en": item["item_name_en"],
                            "name_bn": item["item_name_bn"],
                            "ord": item["display_order"]
                        }
                    )

        # 5. Seed realistic sample Landowners and Land Parcels if table is empty
        parcels_count = await conn.execute(text("SELECT COUNT(*) FROM lnd_parcels"))
        if parcels_count.scalar() == 0:
            print("  + Seeding realistic Bangladesh Land Parcels and Landowner Linkages...")
            sample_parcels = [
                {
                    "parcel_id": "LND-000125",
                    "project_name": "Twin Tower Luxury Residence",
                    "division": "Dhaka Division",
                    "district": "Dhaka",
                    "upazila_thana": "Gulshan",
                    "mouza_name": "Gulshan North",
                    "jl_number": "JL-204",
                    "khatian_number": "RS-8492 / City-1029",
                    "dag_number": "Dag 4410/4412",
                    "land_classification": "RESIDENTIAL",
                    "total_area_decimal": 20.0000,
                    "total_area_katha": 12.1000,
                    "total_area_bigha": 0.6050,
                    "total_area_sqft": 8712.00,
                    "acquisition_status": "ACQUIRED",
                    "gps_latitude": 23.7924820,
                    "gps_longitude": 90.4078120,
                    "boundary_north": "60ft Gulshan Avenue Road frontage",
                    "boundary_south": "Plot 14 - Holding 34/A (Residential)",
                    "boundary_east": "20ft internal connecting avenue",
                    "boundary_west": "Plot 12 (Vacant boundary-walled plot)",
                    "road_access_width_ft": 60.00,
                    "deed_number": "Saf-Kabala Deed #18420/2025",
                    "deed_date": "2025-08-15",
                    "remarks": "Prime corner plot with double road access. Demarcation pillars installed."
                },
                {
                    "parcel_id": "LND-000126",
                    "project_name": "Grand Emerald Horizon",
                    "division": "Dhaka Division",
                    "district": "Dhaka",
                    "upazila_thana": "Banani",
                    "mouza_name": "Banani Block E",
                    "jl_number": "JL-198",
                    "khatian_number": "BS-4102",
                    "dag_number": "Dag 2190",
                    "land_classification": "COMMERCIAL",
                    "total_area_decimal": 16.5289,
                    "total_area_katha": 10.0000,
                    "total_area_bigha": 0.5000,
                    "total_area_sqft": 7200.00,
                    "acquisition_status": "APPROVED",
                    "gps_latitude": 23.7941000,
                    "gps_longitude": 90.4042000,
                    "boundary_north": "Kamal Ataturk Avenue (80ft)",
                    "boundary_south": "Holding 54 (Commercial bank branch)",
                    "boundary_east": "Plot 18/B (Office building)",
                    "boundary_west": "Road 11 intersection",
                    "road_access_width_ft": 80.00,
                    "deed_number": "Saf-Kabala Deed #22019/2025",
                    "deed_date": "2025-11-20",
                    "remarks": "Commercial FAR approved. Clear chain of title verified through Mutation Parcha."
                },
                {
                    "parcel_id": "LND-000127",
                    "project_name": "Purbachal Green Oasis",
                    "division": "Dhaka Division",
                    "district": "Dhaka",
                    "upazila_thana": "Purbachal",
                    "mouza_name": "Balu River Basin (Sector 14)",
                    "jl_number": "JL-112",
                    "khatian_number": "RS-3319",
                    "dag_number": "Dag 501/502",
                    "land_classification": "MIXED",
                    "total_area_decimal": 50.0000,
                    "total_area_katha": 30.2500,
                    "total_area_bigha": 1.5125,
                    "total_area_sqft": 21780.00,
                    "acquisition_status": "UNDER_REVIEW",
                    "gps_latitude": 23.8291000,
                    "gps_longitude": 90.4852000,
                    "boundary_north": "100ft Purbachal Expressway connector",
                    "boundary_south": "Canal buffer green belt",
                    "boundary_east": "Sector 14 residential community",
                    "boundary_west": "RAJUK designated open recreational park",
                    "road_access_width_ft": 100.00,
                    "deed_number": "Baya Deed #9910/2024",
                    "deed_date": "2024-06-10",
                    "remarks": "Large tract proposal undergoing environmental and RAJUK masterplan review."
                }
            ]

            for p in sample_parcels:
                await conn.execute(
                    text("""
                        INSERT INTO lnd_parcels (
                            parcel_id, project_name, division, district, upazila_thana, mouza_name, jl_number,
                            khatian_number, dag_number, land_classification, total_area_decimal, total_area_katha,
                            total_area_bigha, total_area_sqft, acquisition_status, gps_latitude, gps_longitude,
                            boundary_north, boundary_south, boundary_east, boundary_west, road_access_width_ft,
                            deed_number, deed_date, remarks
                        ) VALUES (
                            :parcel_id, :project_name, :division, :district, :upazila_thana, :mouza_name, :jl_number,
                            :khatian_number, :dag_number, :land_classification, :total_area_decimal, :total_area_katha,
                            :total_area_bigha, :total_area_sqft, :acquisition_status, :gps_latitude, :gps_longitude,
                            :boundary_north, :boundary_south, :boundary_east, :boundary_west, :road_access_width_ft,
                            :deed_number, :deed_date, :remarks
                        )
                    """),
                    p
                )

        # Seed sample centralized Landowners if needed
        lo_count = await conn.execute(text("SELECT COUNT(*) FROM lnd_landowners WHERE landowner_code IS NOT NULL"))
        if lo_count.scalar() <= 4:
            print("  + Enhancing landowner sample records...")
            sample_owners = [
                {
                    "landowner_code": "LND-OWN-0001",
                    "owner_type": "INDIVIDUAL",
                    "full_name_en": "Alhaj Md. Shamsul Haque",
                    "full_name_bn": "আলহাজ্ব মো: শামসুল হক",
                    "father_mother_spouse_name": "Late Abdul Gafur (Father)",
                    "present_address": "House 14, Road 44, Gulshan-2, Dhaka-1212",
                    "permanent_address": "Village: Khilgaon, Thana: Gulshan, District: Dhaka",
                    "nid_number": "19582692019482910",
                    "passport_number": "BE0984125",
                    "phone_number": "01711-209841",
                    "email": "shamsul.haque@gmail.com",
                    "emergency_contact_name": "Tanvir Haque (Son)",
                    "emergency_contact_phone": "01819-445566",
                    "ownership_share_ratio": 0.6000,
                    "ownership_nature": "INHERITED",
                    "bank_name": "Islami Bank Bangladesh PLC",
                    "bank_branch": "Gulshan Branch",
                    "bank_account_no": "2050110290184200",
                    "bank_routing_no": "125261029",
                    "bank_account_holder": "Md. Shamsul Haque",
                    "status": "ACTIVE"
                },
                {
                    "landowner_code": "LND-OWN-0002",
                    "owner_type": "JOINT_OWNER",
                    "full_name_en": "Begum Rowshan Ara",
                    "full_name_bn": "বেগম রওশন আরা",
                    "father_mother_spouse_name": "Md. Shamsul Haque (Spouse)",
                    "present_address": "House 14, Road 44, Gulshan-2, Dhaka-1212",
                    "permanent_address": "Village: Khilgaon, Thana: Gulshan, District: Dhaka",
                    "nid_number": "19632692019482912",
                    "passport_number": "BE0984126",
                    "phone_number": "01712-334455",
                    "email": "rowshan.ara@gmail.com",
                    "emergency_contact_name": "Tanvir Haque (Son)",
                    "emergency_contact_phone": "01819-445566",
                    "ownership_share_ratio": 0.4000,
                    "ownership_nature": "PURCHASED",
                    "bank_name": "City Bank PLC",
                    "bank_branch": "Gulshan Avenue Branch",
                    "bank_account_no": "3102948201940",
                    "bank_routing_no": "085261942",
                    "bank_account_holder": "Rowshan Ara",
                    "status": "ACTIVE"
                },
                {
                    "landowner_code": "LND-OWN-0003",
                    "owner_type": "COMPANY",
                    "full_name_en": "Baraka Properties & Holdings Ltd.",
                    "full_name_bn": "বারাকা প্রোপার্টিজ অ্যান্ড হোল্ডিংস লিঃ",
                    "father_mother_spouse_name": "Managing Director: Engr. Faruk Ahmed",
                    "present_address": "Level 9, Navana Tower, Gulshan-1, Dhaka",
                    "permanent_address": "Navana Tower, Gulshan-1, Dhaka",
                    "nid_number": "TIN: 492019482019",
                    "company_reg_number": "C-109482/2012 (RJSC)",
                    "phone_number": "01912-990011",
                    "email": "legal@barakaholdings.com.bd",
                    "emergency_contact_name": "Engr. Faruk Ahmed (MD)",
                    "emergency_contact_phone": "01715-998877",
                    "ownership_share_ratio": 1.0000,
                    "ownership_nature": "PURCHASED",
                    "bank_name": "BRAC Bank PLC",
                    "bank_branch": "Gulshan Branch",
                    "bank_account_no": "1501209482019001",
                    "bank_routing_no": "060261940",
                    "bank_account_holder": "Baraka Properties & Holdings Ltd.",
                    "status": "ACTIVE"
                },
                {
                    "landowner_code": "LND-OWN-0004",
                    "owner_type": "POA_HOLDER",
                    "full_name_en": "Barrister Tariqul Islam (PoA Signatory)",
                    "full_name_bn": "ব্যারিস্টার তরিকুল ইসলাম (পাওয়ার অব অ্যাটর্নি)",
                    "father_mother_spouse_name": "Late Nurul Islam (Father)",
                    "present_address": "Chamber 402, Supreme Court Bar Building, Dhaka",
                    "permanent_address": "Chamber 402, Supreme Court Bar Building, Dhaka",
                    "nid_number": "19752692019483301",
                    "passport_number": "BC8492019",
                    "phone_number": "01713-889900",
                    "email": "tariqul.law@lexcorp.bd",
                    "emergency_contact_name": "Saifur Rahman (Associate)",
                    "emergency_contact_phone": "01711-009988",
                    "ownership_share_ratio": 1.0000,
                    "ownership_nature": "INHERITED",
                    "bank_name": "Eastern Bank PLC",
                    "bank_branch": "Principal Branch, Dilkusha",
                    "bank_account_no": "1011029482019",
                    "bank_routing_no": "090261029",
                    "bank_account_holder": "Tariqul Islam Law Chamber",
                    "status": "UNDER_VERIFICATION"
                }
            ]

            for o in sample_owners:
                exists = await conn.execute(
                    text("SELECT id FROM lnd_landowners WHERE landowner_code = :code"),
                    {"code": o["landowner_code"]}
                )
                if not exists.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO lnd_landowners (
                                landowner_code, owner_type, full_name_en, full_name_bn, father_mother_spouse_name,
                                present_address, permanent_address, nid_number, passport_number, company_reg_number,
                                phone_number, email, emergency_contact_name, emergency_contact_phone, ownership_share_ratio,
                                ownership_nature, bank_name, bank_branch, bank_account_no, bank_routing_no,
                                bank_account_holder, status
                            ) VALUES (
                                :landowner_code, :owner_type, :full_name_en, :full_name_bn, :father_mother_spouse_name,
                                :present_address, :permanent_address, :nid_number, :passport_number, :company_reg_number,
                                :phone_number, :email, :emergency_contact_name, :emergency_contact_phone, :ownership_share_ratio,
                                :ownership_nature, :bank_name, :bank_branch, :bank_account_no, :bank_routing_no,
                                :bank_account_holder, :status
                            )
                        """),
                        o
                    )

            # Link landowners to parcel LND-000125
            p1_res = await conn.execute(text("SELECT id FROM lnd_parcels WHERE parcel_id = 'LND-000125'"))
            p1_id = p1_res.scalar()
            o1_res = await conn.execute(text("SELECT id FROM lnd_landowners WHERE landowner_code = 'LND-OWN-0001'"))
            o1_id = o1_res.scalar()
            o2_res = await conn.execute(text("SELECT id FROM lnd_landowners WHERE landowner_code = 'LND-OWN-0002'"))
            o2_id = o2_res.scalar()

            if p1_id and o1_id and o2_id:
                link_chk = await conn.execute(text("SELECT id FROM lnd_landowner_parcel_links WHERE parcel_id = :pid"), {"pid": p1_id})
                if not link_chk.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO lnd_landowner_parcel_links (landowner_id, parcel_id, ownership_share_percent, title_deed_no, status)
                            VALUES (:o1, :p1, 60.00, 'Deed #18420/2025', 'ACTIVE'),
                                   (:o2, :p1, 40.00, 'Deed #18420/2025', 'ACTIVE')
                        """),
                        {"o1": o1_id, "o2": o2_id, "p1": p1_id}
                    )

    print("\n[SUCCESS] Land database upgrade and seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(upgrade_database())
