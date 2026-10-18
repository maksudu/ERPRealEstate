import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.core.database import engine
from sqlalchemy import text

async def upgrade():
    async with engine.begin() as conn:
        print("Checking and upgrading land_deed_documents...")
        
        # Check columns of land_deed_documents
        res = await conn.execute(text("SHOW COLUMNS FROM land_deed_documents"))
        existing_cols = {r[0] for r in res.fetchall()}
        
        alter_statements = []
        if "parcel_id" not in existing_cols:
            alter_statements.append("ADD COLUMN parcel_id BIGINT NULL")
        if "landowner_id" not in existing_cols:
            alter_statements.append("ADD COLUMN landowner_id BIGINT NULL")
        if "doc_title" not in existing_cols:
            alter_statements.append("ADD COLUMN doc_title VARCHAR(255) NULL AFTER doc_number")
        if "document_category" not in existing_cols:
            alter_statements.append("ADD COLUMN document_category VARCHAR(64) NOT NULL DEFAULT 'SALE_DEED' AFTER doc_type")
        if "reference_number" not in existing_cols:
            alter_statements.append("ADD COLUMN reference_number VARCHAR(128) NULL AFTER doc_title")
        if "file_name" not in existing_cols:
            alter_statements.append("ADD COLUMN file_name VARCHAR(255) NULL AFTER file_url")
        if "file_size_bytes" not in existing_cols:
            alter_statements.append("ADD COLUMN file_size_bytes BIGINT NULL AFTER file_name")
        if "mime_type" not in existing_cols:
            alter_statements.append("ADD COLUMN mime_type VARCHAR(64) NULL DEFAULT 'application/pdf' AFTER file_size_bytes")
        if "document_version" not in existing_cols:
            alter_statements.append("ADD COLUMN document_version VARCHAR(32) NOT NULL DEFAULT 'v1.0' AFTER mime_type")
        if "verification_officer" not in existing_cols:
            alter_statements.append("ADD COLUMN verification_officer VARCHAR(128) NULL AFTER verification_status")
        if "verification_date" not in existing_cols:
            alter_statements.append("ADD COLUMN verification_date DATE NULL AFTER verification_officer")
        if "verification_remarks" not in existing_cols:
            alter_statements.append("ADD COLUMN verification_remarks TEXT NULL AFTER verification_date")
        if "is_independently_verified" not in existing_cols:
            alter_statements.append("ADD COLUMN is_independently_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER verification_remarks")
        if "ocr_extracted_data" not in existing_cols:
            alter_statements.append("ADD COLUMN ocr_extracted_data JSON NULL AFTER is_independently_verified")
        if "ocr_status" not in existing_cols:
            alter_statements.append("ADD COLUMN ocr_status VARCHAR(32) NOT NULL DEFAULT 'NOT_EXTRACTED' AFTER ocr_extracted_data")
        if "access_security_level" not in existing_cols:
            alter_statements.append("ADD COLUMN access_security_level VARCHAR(32) NOT NULL DEFAULT 'STANDARD' AFTER ocr_status")
        if "renewal_reminder_days" not in existing_cols:
            alter_statements.append("ADD COLUMN renewal_reminder_days INT NOT NULL DEFAULT 30 AFTER access_security_level")
        if "updated_at" not in existing_cols:
            alter_statements.append("ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")

        if alter_statements:
            sql = f"ALTER TABLE land_deed_documents {', '.join(alter_statements)}"
            print("Executing:", sql)
            await conn.execute(text(sql))
            print("land_deed_documents upgraded successfully!")
        else:
            print("land_deed_documents already has all columns.")

        # Create lnd_measurement_conventions table
        print("Creating lnd_measurement_conventions table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_measurement_conventions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                convention_code VARCHAR(64) UNIQUE NOT NULL,
                convention_name VARCHAR(128) NOT NULL,
                region_district VARCHAR(128) NOT NULL,
                katha_to_sqft DECIMAL(10, 4) NOT NULL DEFAULT 720.0000,
                decimal_to_sqft DECIMAL(10, 4) NOT NULL DEFAULT 435.6000,
                bigha_to_katha DECIMAL(10, 4) NOT NULL DEFAULT 20.0000,
                acre_to_decimal DECIMAL(10, 4) NOT NULL DEFAULT 100.0000,
                kani_to_sqft DECIMAL(12, 4) NULL,
                gonda_to_sqft DECIMAL(12, 4) NULL,
                is_default TINYINT(1) NOT NULL DEFAULT 0,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Seed default conventions if empty
        check_conv = await conn.execute(text("SELECT COUNT(*) FROM lnd_measurement_conventions"))
        if check_conv.scalar() == 0:
            print("Seeding default land measurement conventions...")
            await conn.execute(text("""
                INSERT INTO lnd_measurement_conventions 
                (convention_code, convention_name, region_district, katha_to_sqft, decimal_to_sqft, bigha_to_katha, acre_to_decimal, kani_to_sqft, gonda_to_sqft, is_default, notes)
                VALUES 
                ('DHAKA_STANDARD', 'Dhaka Metropolitan Standard', 'Dhaka, Gazipur, Narayanganj', 720.0000, 435.6000, 20.0000, 100.0000, 17424.0000, 871.2000, 1, 'Standard Bengal Tenancy formula: 1 Katha = 720 Sq Ft, 1 Decimal = 435.60 Sq Ft, 1 Bigha = 20 Katha = 14,400 Sq Ft'),
                ('CHITTAGONG_KANI', 'Chittagong Kani & Gonda System', 'Chattogram, Cox''s Bazar', 720.0000, 435.6000, 20.0000, 100.0000, 17280.0000, 864.0000, 0, 'Traditional Southern Chittagong: 1 Shahi Kani = 40 Decimal (17,424 Sq Ft), 1 Gonda = 871.20 Sq Ft'),
                ('RAJSHAHI_NORTH', 'North Bengal (33 Decimal Bigha)', 'Rajshahi, Bogura, Dinajpur', 718.7400, 435.6000, 20.0000, 100.0000, NULL, NULL, 0, 'Northern Bengal Revenue Standard: 1 Bigha = 33.00 Decimal = 14,374.80 Sq Ft'),
                ('SYLHET_KEDAR', 'Sylhet Kedar Measurement', 'Sylhet, Moulvibazar, Habiganj', 720.0000, 435.6000, 20.0000, 100.0000, 17424.0000, NULL, 0, 'Surma Valley convention: 1 Kedar = 20 Katha = 14,400 Sq Ft');
            """))

        # Seed Lookup Categories for Documents
        print("Seeding document categories in sys_lookup_categories...")
        await conn.execute(text("""
            INSERT IGNORE INTO sys_lookup_categories (category_code, category_name, description, is_active)
            VALUES 
            ('LAND_DOCUMENT_CATEGORY', 'Land Legal Document Categories', 'Statutory and technical land deed categories', 1),
            ('LAND_VERIFICATION_STATUS', 'Document Verification Status', 'Legal verification status lifecycle', 1),
            ('LAND_SECURITY_LEVEL', 'Document Security Access Levels', 'Confidentiality classification for land records', 1),
            ('MEASUREMENT_REGIONS', 'Measurement Convention Regions', 'Bangladesh geographic land survey conventions', 1);
        """))

        # Seed sys_lookup_items
        print("Seeding document items in sys_lookup_items...")
        items_to_seed = [
            # ('LAND_DOCUMENT_CATEGORY', item_code, item_name_en, item_name_bn, sort_order)
            ('LAND_DOCUMENT_CATEGORY', 'SALE_DEED', 'Sale Deed / Conveyance (Saf-Kabala)', 'সাফ-কবলা দলিল', 1),
            ('LAND_DOCUMENT_CATEGORY', 'CHAIN_BAYA_DEED', 'Previous Ownership Chain (Baya Deed)', 'বায়া দলিল ধারাবাহিকতা', 2),
            ('LAND_DOCUMENT_CATEGORY', 'SURVEY_PARCHA', 'Survey Record (CS / SA / RS / BS Parcha)', 'জরিপ খতিয়ান পর্চা', 3),
            ('LAND_DOCUMENT_CATEGORY', 'MUTATION_DCR', 'Mutation Khatian & DCR Receipt (Namjari)', 'নামজারি খতিয়ান ও ডিসিআর', 4),
            ('LAND_DOCUMENT_CATEGORY', 'TAX_DAKHILA', 'Land Development Tax / Dakhila (Khajna)', 'ভূমি উন্নয়ন কর দাখিলা', 5),
            ('LAND_DOCUMENT_CATEGORY', 'BOUNDARY_SURVEY', 'Survey & Demarcation Map', 'সীমানা নির্ধারণী নকশা', 6),
            ('LAND_DOCUMENT_CATEGORY', 'MOUZA_MAP', 'Certified Mouza Map Sheet', 'মৌজা নকশা (Sheet)', 7),
            ('LAND_DOCUMENT_CATEGORY', 'NOC_PERMISSION', 'NOC & Statutory Clearance (RAJUK/CDA/Fire/Env)', 'ছাড়পত্র ও অনুমতিপত্র', 8),
            ('LAND_DOCUMENT_CATEGORY', 'POA_PARTITION_WARIS', 'Power of Attorney / Waris / Partition Deed', 'আমমোক্তারনামা ও বণ্টননামা', 9),
            ('LAND_DOCUMENT_CATEGORY', 'AGREEMENT_PAYMENT_PROOF', 'Registered Agreement & Payment Proof', 'নিবন্ধিত চুক্তিপত্র ও রসিদ', 10),

            # LAND_VERIFICATION_STATUS
            ('LAND_VERIFICATION_STATUS', 'PENDING', 'Pending AC Land & Sub-Registry Search', 'অনুসন্ধান অপেক্ষমান', 1),
            ('LAND_VERIFICATION_STATUS', 'VERIFIED', 'Independently Title-Verified', 'আইনগতভাবে যাচাইকৃত', 2),
            ('LAND_VERIFICATION_STATUS', 'REJECTED', 'Rejected / Title Defect Detected', 'বাতিল / ত্রুটিযুক্ত', 3),
            ('LAND_VERIFICATION_STATUS', 'EXPIRED', 'Expired / Renewal Required', 'মেয়াদোত্তীর্ণ', 4),
            ('LAND_VERIFICATION_STATUS', 'REQUIRES_CLARIFICATION', 'Requires Clarification from Sub-Registry', 'স্পষ্টীকরণ প্রয়োজন', 5),

            # LAND_SECURITY_LEVEL
            ('LAND_SECURITY_LEVEL', 'STANDARD', 'Standard Internal Access', 'সাধারণ অভ্যন্তরীণ', 1),
            ('LAND_SECURITY_LEVEL', 'RESTRICTED', 'Restricted to Legal Team', 'আইনি দল সীমাবদ্ধ', 2),
            ('LAND_SECURITY_LEVEL', 'CONFIDENTIAL_EXECUTIVE', 'Confidential Board Access', 'বোর্ড ও নির্বাহী গোপনীয়', 3),

            # MEASUREMENT_REGIONS
            ('MEASUREMENT_REGIONS', 'DHAKA_METRO', 'Dhaka Metropolitan (720 Sqft/Katha)', 'ঢাকা মেট্রো', 1),
            ('MEASUREMENT_REGIONS', 'CHITTAGONG', 'Chittagong Division (Kani/Gonda)', 'চট্টগ্রাম বিভাগ', 2),
            ('MEASUREMENT_REGIONS', 'NORTH_BENGAL', 'Rajshahi & North Bengal (33 Dec Bigha)', 'উত্তরবঙ্গ', 3),
            ('MEASUREMENT_REGIONS', 'SYLHET', 'Sylhet Division (Kedar)', 'সিলেট বিভাগ', 4)
        ]

        for cat, code, name_en, name_bn, sort in items_to_seed:
            cat_id_res = await conn.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :cat"), {"cat": cat})
            cat_id = cat_id_res.scalar()
            if cat_id:
                await conn.execute(text("""
                    INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_active)
                    VALUES (:cid, :code, :en, :bn, :sort, 1)
                    ON DUPLICATE KEY UPDATE item_name_en = :en, item_name_bn = :bn, sort_order = :sort;
                """), {"cid": cat_id, "code": code, "en": name_en, "bn": name_bn, "sort": sort})

        # Make land_bank_id nullable on land_deed_documents so documents can connect directly to parcels and owners
        await conn.execute(text("ALTER TABLE land_deed_documents MODIFY COLUMN land_bank_id BIGINT NULL"))

        # Seed sample rich legal documents for parcels
        sample_docs = await conn.execute(text("SELECT COUNT(*) FROM land_deed_documents WHERE doc_title IS NOT NULL"))
        if sample_docs.scalar() == 0:
            print("Seeding realistic sample legal documents for land parcels...")
            # Get existing parcel IDs
            parcels_res = await conn.execute(text("SELECT id, parcel_id, land_bank_id FROM lnd_parcels LIMIT 3"))
            parcels = parcels_res.fetchall()
            
            # Get existing land_bank fallback if needed
            lb_res = await conn.execute(text("SELECT id FROM lnd_land_banks LIMIT 1"))
            lb_first = lb_res.scalar()

            # Get existing landowner
            lo_res = await conn.execute(text("SELECT id, full_name_en FROM lnd_landowners LIMIT 1"))
            lo = lo_res.fetchone()
            lo_id = lo[0] if lo else None

            if parcels:
                p1_id, p1_code, p1_lb = parcels[0]
                target_lb = p1_lb if p1_lb is not None else lb_first
                await conn.execute(text("""
                    INSERT INTO land_deed_documents 
                    (land_bank_id, parcel_id, landowner_id, doc_type, document_category, doc_number, doc_title, reference_number, issuing_office, execution_date, expiry_date, is_expired, file_url, file_name, file_size_bytes, mime_type, document_version, verification_status, verification_officer, verification_date, verification_remarks, is_independently_verified, ocr_extracted_data, ocr_status, access_security_level, renewal_reminder_days, notes)
                    VALUES 
                    (:lb, :pid, :lid, 'DEED_BAYA', 'CHAIN_BAYA_DEED', 'DEED-GL-2015-8940', 'Parent Title Deed (Saf-Kabala 2015)', 'SRO-GL-8940/15', 'Gulshan Sub-Registry Office', '2015-04-12', NULL, 0, 'assets/documents/land/deed_8940.pdf', 'deed_baya_8940.pdf', 3450200, 'application/pdf', 'v1.0', 'VERIFIED', 'Advocate Monirul Haque (Senior Legal Counsel)', '2026-02-10', 'Deed verified directly at Gulshan Sub-Registry Office Volume 42. Title chain unbroken from CS to RS.', 1, '{\"deed_number\": \"8940\", \"volume_no\": \"42\", \"recorded_katha\": 20.0, \"seller_name\": \"Late Chowdhury\", \"buyer_name\": \"Alhaj Nurul Islam\"}', 'MANUALLY_CONFIRMED', 'RESTRICTED', 30, 'Saf-Kabala deed duly recorded and indexed in Sub-Registry records.'),
                    (:lb, :pid, :lid, 'MUTATION_PARCHA', 'MUTATION_DCR', 'MUT-2024-5412', 'Mutation Parcha & DCR Case 5412', 'AC-LAND-GL-5412/24', 'AC Land Office, Gulshan Circle', '2024-06-18', NULL, 0, 'assets/documents/land/mutation_5412.pdf', 'mutation_parcha_5412.pdf', 1890000, 'application/pdf', 'v1.0', 'VERIFIED', 'Md. Zahid Hasan (AC Land Surveyor)', '2026-03-01', 'Mutation approved with separate Jote opened in revenue portal (e-Namjari verified).', 1, '{\"khatian_no\": \"1042\", \"case_no\": \"5412/2024\", \"mutated_shotok\": 20.0}', 'MANUALLY_CONFIRMED', 'STANDARD', 30, 'Mutation parcha matching original CS and RS tenancy.'),
                    (:lb, :pid, :lid, 'KHAJNA_TAX', 'TAX_DAKHILA', 'TAX-1431-98210', 'Land Development Tax Dakhila (1431 BS)', 'LD-TAX-GL-98210', 'Union Land Office, Khilkhet', '2025-07-10', '2026-06-30', 0, 'assets/documents/land/tax_dakhila_1431.pdf', 'tax_receipt_1431.pdf', 940000, 'application/pdf', 'v1.0', 'VERIFIED', 'Kazi Mahbub (Revenue Officer)', '2026-01-15', '100% updated tax payment cleared up to 1431 BS without any arrears.', 1, '{\"dakhila_no\": \"98210\", \"fiscal_year\": \"1431 BS\", \"amount_bdt\": 18500}', 'EXTRACTED', 'STANDARD', 45, 'Updated tax receipt cleared through online Land Development Tax portal.')
                """), {"lb": target_lb, "pid": p1_id, "lid": lo_id})
        
        print("Database upgrade complete!")

asyncio.run(upgrade())
