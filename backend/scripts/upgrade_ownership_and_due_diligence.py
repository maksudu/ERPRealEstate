import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.core.database import engine
from sqlalchemy import text

async def upgrade():
    async with engine.begin() as conn:
        print("Checking and upgrading lnd_landowner_parcel_links...")
        
        # Check columns of lnd_landowner_parcel_links
        res = await conn.execute(text("SHOW COLUMNS FROM lnd_landowner_parcel_links"))
        existing_cols = {r[0] for r in res.fetchall()}
        
        alter_statements = []
        if "ownership_source" not in existing_cols:
            alter_statements.append("ADD COLUMN ownership_source VARCHAR(64) NOT NULL DEFAULT 'PURCHASE' AFTER ownership_share_percent")
        if "equivalent_area_decimal" not in existing_cols:
            alter_statements.append("ADD COLUMN equivalent_area_decimal DECIMAL(14, 4) NOT NULL DEFAULT 0.00 AFTER ownership_source")
        if "equivalent_area_katha" not in existing_cols:
            alter_statements.append("ADD COLUMN equivalent_area_katha DECIMAL(14, 4) NOT NULL DEFAULT 0.00 AFTER equivalent_area_decimal")
        if "equivalent_area_sqft" not in existing_cols:
            alter_statements.append("ADD COLUMN equivalent_area_sqft DECIMAL(16, 2) NOT NULL DEFAULT 0.00 AFTER equivalent_area_katha")
        if "proposed_sale_price_bdt" not in existing_cols:
            alter_statements.append("ADD COLUMN proposed_sale_price_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00 AFTER equivalent_area_sqft")
        if "development_share_percent" not in existing_cols:
            alter_statements.append("ADD COLUMN development_share_percent DECIMAL(6, 2) NOT NULL DEFAULT 0.00 AFTER proposed_sale_price_bdt")
        if "consent_status" not in existing_cols:
            alter_statements.append("ADD COLUMN consent_status VARCHAR(32) NOT NULL DEFAULT 'CONSENT_GRANTED' AFTER development_share_percent")
        if "has_poa" not in existing_cols:
            alter_statements.append("ADD COLUMN has_poa TINYINT(1) NOT NULL DEFAULT 0 AFTER consent_status")
        if "poa_holder_name" not in existing_cols:
            alter_statements.append("ADD COLUMN poa_holder_name VARCHAR(191) NULL AFTER has_poa")
        if "witness_details" not in existing_cols:
            alter_statements.append("ADD COLUMN witness_details JSON NULL AFTER poa_holder_name")
        if "dispute_remarks" not in existing_cols:
            alter_statements.append("ADD COLUMN dispute_remarks TEXT NULL AFTER witness_details")
        if "is_share_verified" not in existing_cols:
            alter_statements.append("ADD COLUMN is_share_verified TINYINT(1) NOT NULL DEFAULT 1 AFTER dispute_remarks")
        if "updated_at" not in existing_cols:
            alter_statements.append("ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")

        if alter_statements:
            sql = f"ALTER TABLE lnd_landowner_parcel_links {', '.join(alter_statements)}"
            print("Executing:", sql)
            await conn.execute(text(sql))
            print("lnd_landowner_parcel_links upgraded successfully!")
        else:
            print("lnd_landowner_parcel_links already up to date.")

        print("\nChecking and upgrading lnd_jv_agreements...")
        res_jv = await conn.execute(text("SHOW COLUMNS FROM lnd_jv_agreements"))
        existing_jv_cols = {r[0] for r in res_jv.fetchall()}

        alter_jv_statements = []
        if "parcel_id" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN parcel_id BIGINT NULL AFTER land_bank_id")
        if "agreement_type" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN agreement_type VARCHAR(64) NOT NULL DEFAULT 'JOINT_VENTURE_DEVELOPMENT' AFTER agreement_deed_no")
        if "registration_deed_no" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN registration_deed_no VARCHAR(128) NULL AFTER agreement_type")
        if "registration_office" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN registration_office VARCHAR(191) NULL AFTER registration_deed_no")
        if "registration_date" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN registration_date DATE NULL AFTER registration_office")
        if "witness_count" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN witness_count INT NOT NULL DEFAULT 2 AFTER registration_date")
        if "obligations_developer" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN obligations_developer TEXT NULL AFTER witness_count")
        if "obligations_landowner" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN obligations_landowner TEXT NULL AFTER obligations_developer")
        if "special_conditions" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN special_conditions TEXT NULL AFTER obligations_landowner")
        if "amendment_number" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN amendment_number INT NOT NULL DEFAULT 0 AFTER special_conditions")
        if "termination_conditions" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN termination_conditions TEXT NULL AFTER amendment_number")
        if "missing_consents_flag" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN missing_consents_flag TINYINT(1) NOT NULL DEFAULT 0 AFTER termination_conditions")
        if "allocated_flats_count" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN allocated_flats_count INT NOT NULL DEFAULT 0 AFTER missing_consents_flag")
        if "allocated_shops_count" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN allocated_shops_count INT NOT NULL DEFAULT 0 AFTER allocated_flats_count")
        if "allocated_car_parks_count" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN allocated_car_parks_count INT NOT NULL DEFAULT 0 AFTER allocated_shops_count")
        if "allocated_cash_bdt" not in existing_jv_cols:
            alter_jv_statements.append("ADD COLUMN allocated_cash_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00 AFTER allocated_car_parks_count")

        if alter_jv_statements:
            sql_jv = f"ALTER TABLE lnd_jv_agreements {', '.join(alter_jv_statements)}"
            print("Executing:", sql_jv)
            await conn.execute(text(sql_jv))
            print("lnd_jv_agreements upgraded successfully!")
        else:
            print("lnd_jv_agreements already up to date.")

        print("\nCreating lnd_legal_due_diligence table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_legal_due_diligence (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                diligence_code VARCHAR(64) UNIQUE NOT NULL,
                parcel_id BIGINT NOT NULL,
                lead_legal_counsel VARCHAR(191) NOT NULL,
                law_firm_name VARCHAR(191) NULL,
                overall_risk_level VARCHAR(32) NOT NULL DEFAULT 'LOW',
                clearance_status VARCHAR(64) NOT NULL DEFAULT 'UNDER_REVIEW',
                acquisition_blocked TINYINT(1) NOT NULL DEFAULT 0,
                exception_approved_by VARCHAR(191) NULL,
                exception_reason TEXT NULL,
                summary_legal_opinion TEXT NULL,
                title_search_period_years INT NOT NULL DEFAULT 30,
                sub_registry_office_searched VARCHAR(191) NULL,
                encumbrance_certificate_no VARCHAR(128) NULL,
                non_encumbrance_certificate_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_ldd_parcel (parcel_id),
                INDEX idx_ldd_status (clearance_status),
                INDEX idx_ldd_risk (overall_risk_level)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        print("Creating lnd_due_diligence_items table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_due_diligence_items (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                due_diligence_id BIGINT NOT NULL,
                check_category VARCHAR(64) NOT NULL,
                check_title VARCHAR(255) NOT NULL,
                responsible_officer VARCHAR(191) NOT NULL,
                verification_date DATE NOT NULL,
                risk_level VARCHAR(32) NOT NULL DEFAULT 'LOW',
                decision VARCHAR(64) NOT NULL DEFAULT 'PASSED',
                evidence_documents VARCHAR(255) NULL,
                remarks TEXT NULL,
                is_blocking TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_dd_item_diligence (due_diligence_id),
                INDEX idx_dd_item_risk (risk_level),
                INDEX idx_dd_item_decision (decision)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Seed Lookup Categories and Items
        print("\nSeeding lookup categories and items...")
        lookup_cats = [
            ("OWNERSHIP_SOURCE", "Land Ownership Source", "Method of acquiring title (inheritance, purchase, etc.)"),
            ("AGREEMENT_TYPE", "Landowner & Developer Agreement Type", "Joint venture, outright purchase, PoA, etc."),
            ("CONSENT_STATUS", "Landowner Consent & Signature Status", "Consent verified, pending, or disputed"),
            ("DUE_DILIGENCE_RISK_LEVEL", "Legal Due Diligence Risk Level", "Low, Medium, High, Critical"),
            ("CLEARANCE_DECISION", "Acquisition Clearance Decision", "Cleared, Conditional, Blocked, Under Review")
        ]

        for code, name, desc in lookup_cats:
            await conn.execute(text("""
                INSERT IGNORE INTO sys_lookup_categories (category_code, category_name, description, is_active)
                VALUES (:code, :name, :desc, 1);
            """), {"code": code, "name": name, "desc": desc})

        # Fetch category IDs
        res_cat = await conn.execute(text("SELECT id, category_code FROM sys_lookup_categories WHERE category_code IN ('OWNERSHIP_SOURCE', 'AGREEMENT_TYPE', 'CONSENT_STATUS', 'DUE_DILIGENCE_RISK_LEVEL', 'CLEARANCE_DECISION')"))
        cat_map = {r[1]: r[0] for r in res_cat.fetchall()}

        items_to_seed = [
            # OWNERSHIP_SOURCE
            ("OWNERSHIP_SOURCE", "PURCHASE", "Purchased (ক্রয়সূত্রে)", "ক্রয়সূত্রে", 1),
            ("OWNERSHIP_SOURCE", "INHERITANCE", "Inherited / Waris (ওয়ারিশসূত্রে)", "ওয়ারিশসূত্রে", 2),
            ("OWNERSHIP_SOURCE", "PARTITION_DEED", "Partition Deed (বণ্টননামা)", "বণ্টননামা", 3),
            ("OWNERSHIP_SOURCE", "GIFT_HEBA", "Gift / Heba Deed (দান/হেবানামা)", "দান/হেবানামা", 4),
            ("OWNERSHIP_SOURCE", "COURT_DECREE", "Court Decree (আদালতের ডিক্রি)", "আদালতের ডিক্রি", 5),
            ("OWNERSHIP_SOURCE", "TRANSFER", "Transfer & Settlement (হস্তান্তর)", "হস্তান্তর ও লিজ", 6),

            # AGREEMENT_TYPE
            ("AGREEMENT_TYPE", "JOINT_VENTURE_DEVELOPMENT", "Joint Venture Development Agreement", "যৌথ উন্নয়ন চুক্তি", 1),
            ("AGREEMENT_TYPE", "OUTRIGHT_PURCHASE_AGREEMENT", "Outright Land Purchase Agreement", "এককালীন জমি ক্রয় চুক্তি", 2),
            ("AGREEMENT_TYPE", "POWER_OF_ATTORNEY_AGREEMENT", "Registered Irrevocable General PoA", "আমমোক্তারনামা চুক্তি", 3),
            ("AGREEMENT_TYPE", "SUPPLEMENTARY_AMENDMENT", "Supplementary / Amending Agreement", "সম্পূরক সংশোধনী চুক্তি", 4),
            ("AGREEMENT_TYPE", "PARTITION_SETTLEMENT", "Co-Owners Partition Settlement", "পারস্পরিক বণ্টন আপসনামা", 5),

            # CONSENT_STATUS
            ("CONSENT_STATUS", "CONSENT_GRANTED", "Consent Granted & Verified", "সম্মতি অনুমোদিত ও যাচাইকৃত", 1),
            ("CONSENT_STATUS", "CONSENT_PENDING", "Pending Signatures / NRI Absent", "স্বাক্ষর অপেক্ষমান", 2),
            ("CONSENT_STATUS", "DISPUTED", "Ownership Disputed / Injunction Risk", "বিতর্কিত / আপত্তি", 3),
            ("CONSENT_STATUS", "REFUSED", "Consent Refused", "সম্মতি প্রত্যাখ্যাত", 4),
            ("CONSENT_STATUS", "LEGAL_NOTICE", "Legal Notice Issued", "আইনি নোটিশ জারিকৃত", 5),

            # DUE_DILIGENCE_RISK_LEVEL
            ("DUE_DILIGENCE_RISK_LEVEL", "LOW", "Low Risk (Clean Title)", "স্বল্প ঝুঁকি (নিষ্কলঙ্ক স্বত্ব)", 1),
            ("DUE_DILIGENCE_RISK_LEVEL", "MEDIUM", "Medium Risk (Resolvable Condition)", "মাঝারি ঝুঁকি (শর্তসাপেক্ষ)", 2),
            ("DUE_DILIGENCE_RISK_LEVEL", "HIGH", "High Risk (Requires Board Exception)", "উচ্চ ঝুঁকি (বোর্ড অনুমোদন আবশ্যক)", 3),
            ("DUE_DILIGENCE_RISK_LEVEL", "CRITICAL", "Critical Risk (Title Blocked)", "সংকটপূর্ণ ঝুঁকি (ক্রয় স্থগিত)", 4),

            # CLEARANCE_DECISION
            ("CLEARANCE_DECISION", "CLEARED", "Cleared for Acquisition", "ক্রয়ের জন্য চূড়ান্ত অনুমোদিত", 1),
            ("CLEARANCE_DECISION", "CONDITIONAL_CLEARANCE", "Conditional Clearance", "শর্তসাপেক্ষ ছাড়পত্র", 2),
            ("CLEARANCE_DECISION", "BLOCKED", "Blocked - Title Defect", "স্থগিত - স্বত্ব ত্রুটি", 3),
            ("CLEARANCE_DECISION", "UNDER_REVIEW", "Under Legal Review", "আইনি যাচাইাধীন", 4),
        ]

        for cat_code, code, name_en, name_bn, sort in items_to_seed:
            cat_id = cat_map.get(cat_code)
            if cat_id:
                await conn.execute(text("""
                    INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_active)
                    VALUES (:cid, :code, :en, :bn, :sort, 1)
                    ON DUPLICATE KEY UPDATE item_name_en = :en, item_name_bn = :bn, sort_order = :sort;
                """), {"cid": cat_id, "code": code, "en": name_en, "bn": name_bn, "sort": sort})

        # Check existing parcels and landowners to seed Joint Ownership demo
        print("\nSeeding joint ownership links for 20-decimal demo parcel...")
        res_p = await conn.execute(text("SELECT id, project_name, total_area_decimal FROM lnd_parcels LIMIT 2"))
        parcels = res_p.fetchall()
        
        res_o = await conn.execute(text("SELECT id, full_name_en FROM lnd_landowners LIMIT 4"))
        owners = res_o.fetchall()

        if parcels and len(owners) >= 3:
            p_id = parcels[0][0]
            # Update parcel total area to 20 decimals if desired or use actual
            p_area = float(parcels[0][2]) or 20.0
            
            # Seed 3 co-owners for parcel 1: 50%, 30%, 20%
            shares = [
                (owners[0][0], 50.0, 'INHERITANCE', p_area * 0.50, p_area * 0.50 * 0.605, p_area * 0.50 * 435.6, 'CONSENT_GRANTED', 1),
                (owners[1][0], 30.0, 'INHERITANCE', p_area * 0.30, p_area * 0.30 * 0.605, p_area * 0.30 * 435.6, 'CONSENT_GRANTED', 1),
                (owners[2][0], 20.0, 'PURCHASE',    p_area * 0.20, p_area * 0.20 * 0.605, p_area * 0.20 * 435.6, 'CONSENT_PENDING', 0)
            ]

            # Clear existing links for this demo parcel
            await conn.execute(text("DELETE FROM lnd_landowner_parcel_links WHERE parcel_id = :p_id"), {"p_id": p_id})
            
            for o_id, share, source, dec, katha, sqft, consent, verified in shares:
                await conn.execute(text("""
                    INSERT INTO lnd_landowner_parcel_links (
                        landowner_id, parcel_id, ownership_share_percent, ownership_source,
                        equivalent_area_decimal, equivalent_area_katha, equivalent_area_sqft,
                        proposed_sale_price_bdt, development_share_percent, consent_status,
                        is_share_verified, status
                    ) VALUES (
                        :o_id, :p_id, :share, :source,
                        :dec, :katha, :sqft,
                        :dec * 3500000, :share * 0.5, :consent,
                        :verified, 'ACTIVE'
                    )
                """), {
                    "o_id": o_id, "p_id": p_id, "share": share, "source": source,
                    "dec": dec, "katha": katha, "sqft": sqft, "consent": consent, "verified": verified
                })
            print("Joint ownership co-sharers seeded successfully for parcel", p_id)

            # Seed Legal Due Diligence record for parcel 1
            print("Seeding legal due diligence audit for parcel", p_id)
            res_dd = await conn.execute(text("SELECT id FROM lnd_legal_due_diligence WHERE parcel_id = :p_id"), {"p_id": p_id})
            dd_row = res_dd.fetchone()
            
            if not dd_row:
                await conn.execute(text("""
                    INSERT INTO lnd_legal_due_diligence (
                        diligence_code, parcel_id, lead_legal_counsel, law_firm_name,
                        overall_risk_level, clearance_status, acquisition_blocked,
                        summary_legal_opinion, title_search_period_years,
                        sub_registry_office_searched, encumbrance_certificate_no,
                        non_encumbrance_certificate_date
                    ) VALUES (
                        'LDD-2026-001', :p_id, 'Advocate Rafiqul Islam, Senior Advocate, Supreme Court',
                        'Islam & Associates Law Chambers, Dhaka',
                        'LOW', 'CLEARED', 0,
                        'Title search spanning 30 years from CS, SA, RS to City/BS reveals uninterrupted and marketable title. Mutation completed in AC Land Gulshan Circle. Non-encumbrance certificate obtained from Sub-Registry.',
                        30, 'Gulshan Sub-Registry Office', 'NEC-2026-894', '2026-02-15'
                    )
                """), {"p_id": p_id})
                
                res_new_dd = await conn.execute(text("SELECT id FROM lnd_legal_due_diligence WHERE parcel_id = :p_id"), {"p_id": p_id})
                new_dd_id = res_new_dd.fetchone()[0]

                # 10 Statutory Checklist Items
                checklist_items = [
                    ("CHAIN_OF_TITLE", "Chain of Title (25-30 Year Baya Deeds Verification)", "Advocate Shamsul Haque", "2026-02-10", "LOW", "PASSED", "CS Khatian 42 to BRS Saf-Kabala verified in Sub-Registry Book 1.", 0),
                    ("SURVEY_DEED_MATCH", "Deed vs Khatian vs Dag Area Reconciliation", "Engr. Mahmudul Hasan (Surveyor)", "2026-02-11", "LOW", "PASSED", "Field boundary matches RS Dag 4120 and mouza sheet perfectly.", 0),
                    ("MUTATION_TAX", "Mutation & Dakhila Receipts (Khajna Paid to Date)", "Advocate Tanvir Ahmed", "2026-02-12", "LOW", "PASSED", "Namjari Case 1120/2022 confirmed with 1431 BS Khajna Dakhila.", 0),
                    ("MORTGAGE_LIENS_ENCUMBRANCE", "Mortgage, Liens, Bank Charges & CIB Search", "Advocate Rafiqul Islam", "2026-02-12", "LOW", "PASSED", "No registered mortgage or Artha Rin Adalat attachment in Sub-Registry Book 2.", 0),
                    ("PENDING_LITIGATION_DISPUTES", "Pending Litigation, Title Suits & Injunction Check", "Advocate Kamrul Islam", "2026-02-13", "LOW", "PASSED", "No pending civil or miscellaneous title suits in Joint District Judge Courts.", 0),
                    ("OWNERSHIP_INHERITANCE_CONSENT", "Inheritance Succession & Co-Sharers Consent Audit", "Advocate Shamsul Haque", "2026-02-13", "MEDIUM", "CONDITIONAL", "Owner C power of attorney execution pending embassy attestation.", 0),
                    ("POSSESSION_ENCROACHMENT_BOUNDARY", "Physical Possession & Demarcation Boundary Vetting", "Major (Retd.) Tariqul Islam", "2026-02-14", "LOW", "PASSED", "Clear boundary wall erected, zero encroachment or road setback disputes.", 0),
                    ("LAND_USE_RESTRICTIONS_RAJUK", "RAJUK / CDA Master Plan & Wetland Clearance", "Ar. Nasreen Akhter (Planner)", "2026-02-14", "LOW", "PASSED", "Zoned Residential in DAP 2022-2035; not situated in flood-flow zone.", 0),
                    ("EVIDENCE_CLEARANCE", "Statutory Clearances (NOC, Environment, Fire)", "Advocate Tanvir Ahmed", "2026-02-15", "LOW", "PASSED", "Civil Aviation 150ft height clearance and preliminary NOC verified.", 0),
                    ("LEGAL_CLEARANCE_OPINION", "Final Legal Title Certificate & Clearance Opinion", "Advocate Rafiqul Islam", "2026-02-15", "LOW", "PASSED", "Unconditional legal clearance issued for acquisition agreement.", 0)
                ]

                for cat, title, officer, vdate, risk, dec, remarks, blk in checklist_items:
                    await conn.execute(text("""
                        INSERT INTO lnd_due_diligence_items (
                            due_diligence_id, check_category, check_title, responsible_officer,
                            verification_date, risk_level, decision, remarks, is_blocking
                        ) VALUES (
                            :dd_id, :cat, :title, :officer,
                            :vdate, :risk, :dec, :remarks, :blk
                        )
                    """), {
                        "dd_id": new_dd_id, "cat": cat, "title": title, "officer": officer,
                        "vdate": vdate, "risk": risk, "dec": dec, "remarks": remarks, "blk": blk
                    })
                print("10 Legal due diligence checklist items seeded successfully!")

    print("\nDatabase upgrade and seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(upgrade())
