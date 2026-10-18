import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.core.database import engine
from sqlalchemy import text

async def upgrade():
    async with engine.begin() as conn:
        print("1. Creating lnd_land_negotiations table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_land_negotiations (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                negotiation_code VARCHAR(64) NOT NULL UNIQUE,
                parcel_id BIGINT NOT NULL,
                landowner_id BIGINT NULL,
                negotiation_title VARCHAR(191) NOT NULL,
                negotiation_stage VARCHAR(64) NOT NULL DEFAULT 'INITIAL_OFFER',
                initial_asking_price_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                developer_target_price_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                current_offer_amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                current_counteroffer_amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                final_agreed_amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                consideration_type VARCHAR(64) NOT NULL DEFAULT 'CASH_PURCHASE',
                proposed_advance_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                installment_terms_summary TEXT NULL,
                non_cash_consideration_details TEXT NULL,
                conditions_precedent TEXT NULL,
                negotiation_start_date DATE NOT NULL,
                target_closing_deadline DATE NOT NULL,
                agreement_execution_date DATE NULL,
                agreement_expiry_date DATE NULL,
                agreement_status VARCHAR(64) NOT NULL DEFAULT 'DRAFTING',
                is_delayed TINYINT(1) NOT NULL DEFAULT 0,
                delay_reason TEXT NULL,
                terms_approved_by VARCHAR(191) NULL,
                terms_approved_at TIMESTAMP NULL,
                approval_notes TEXT NULL,
                current_version INT NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_neg_parcel (parcel_id),
                INDEX idx_neg_owner (landowner_id),
                INDEX idx_neg_stage (negotiation_stage),
                INDEX idx_neg_agree_status (agreement_status),
                CONSTRAINT fk_neg_parcel FOREIGN KEY (parcel_id) REFERENCES lnd_parcels(id) ON DELETE CASCADE,
                CONSTRAINT fk_neg_owner FOREIGN KEY (landowner_id) REFERENCES lnd_landowners(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("lnd_land_negotiations table verified/created.")

        print("\n2. Creating lnd_negotiation_meetings table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_negotiation_meetings (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                negotiation_id BIGINT NOT NULL,
                meeting_date DATE NOT NULL,
                meeting_venue VARCHAR(191) NULL,
                developer_attendees VARCHAR(255) NOT NULL,
                landowner_attendees VARCHAR(255) NOT NULL,
                discussion_minutes TEXT NOT NULL,
                follow_up_tasks TEXT NULL,
                next_meeting_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_meet_neg_id (negotiation_id),
                CONSTRAINT fk_meet_neg FOREIGN KEY (negotiation_id) REFERENCES lnd_land_negotiations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("lnd_negotiation_meetings table verified/created.")

        print("\n3. Creating lnd_negotiation_term_versions table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_negotiation_term_versions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                negotiation_id BIGINT NOT NULL,
                version_number INT NOT NULL,
                offered_by_party VARCHAR(32) NOT NULL DEFAULT 'DEVELOPER',
                proposed_price_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                proposed_advance_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                proposed_timeline_days INT NULL,
                revision_summary TEXT NOT NULL,
                created_by_officer VARCHAR(191) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ver_neg_id (negotiation_id),
                CONSTRAINT fk_ver_neg FOREIGN KEY (negotiation_id) REFERENCES lnd_land_negotiations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("lnd_negotiation_term_versions table verified/created.")

        print("\n4. Registering Lookup Categories...")
        categories = [
            ("NEGOTIATION_STAGE", "Landowner Negotiation Stage", "Commercial negotiation workflow stages"),
            ("CONSIDERATION_TYPE", "Acquisition Consideration Structure", "Cash, Joint Venture, or Hybrid consideration type"),
            ("AGREEMENT_WORKFLOW_STATUS", "Legal Agreement Workflow Status", "Contract drafting, vetting, review and execution states")
        ]
        for code, name, desc in categories:
            await conn.execute(text("""
                INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active)
                VALUES (:c, :n, :d, 1)
                ON DUPLICATE KEY UPDATE category_name = :n, description = :d
            """), {"c": code, "n": name, "d": desc})

        res_cats = await conn.execute(text("SELECT id, category_code FROM sys_lookup_categories"))
        cat_map = {r[1]: r[0] for r in res_cats.fetchall()}

        print("\n5. Registering Lookup Items...")
        items_map = {
            "NEGOTIATION_STAGE": [
                ("INITIAL_OFFER", "Initial Offer (প্রাথমিক প্রস্তাব)", "প্রথম প্রস্তাব পেশ করা হয়েছে", 1),
                ("COUNTER_OFFER_RECEIVED", "Counteroffer Received (পাল্টা প্রস্তাব প্রাপ্ত)", "জমির মালিকের নিকট থেকে পাল্টা মূল্য প্রস্তাব", 2),
                ("ACTIVE_BARGAINING", "Active Bargaining (দরকষাকষি চলমান)", "মূল্য ও শর্তাবলি নিয়ে একাধিক বৈঠক চলমান", 3),
                ("FINAL_TERMS_AGREED", "Final Terms Agreed (চূড়ান্ত শর্তাবলি ঐক্যমত)", "উভয় পক্ষ নীতিগতভাবে মূল্য ও কিস্তিতে সম্মত", 4),
                ("LEGAL_DRAFTING", "Deed Drafting & Vetting (দলিল ড্রাফটিং)", "বায়নাবত্র বা চুক্তিনামা আইনি ড্রাফটিং পর্যায়", 5),
                ("COMMERCIAL_APPROVED", "Commercial Approved (অনুমোদিত শর্তাবলি)", "ব্যবস্থাপনা পরিচালক বা বোর্ড কর্তৃক অনুমোদিত", 6),
                ("AGREEMENT_EXECUTED", "Agreement Executed (চুক্তি স্বাক্ষরিত)", "রেজিস্ট্রিকৃত বায়না বা চুক্তিপত্র সম্পাদিত", 7),
                ("STALLED_DELAYED", "Stalled / Delayed (বিলম্বিত/স্থগিত)", "মালিকের আপত্তির কারণে দরকষাকষি থমকে আছে", 8),
                ("TERMINATED", "Negotiation Terminated (বাতিল/ব্যর্থ)", "অধিগ্রহণ দরকষাকষি আনুষ্ঠানিকভাবে সমাপ্ত", 9)
            ],
            "CONSIDERATION_TYPE": [
                ("CASH_PURCHASE", "Outright Cash Purchase (এককালীন নগদ ক্রয়)", "সম্পূর্ণ নগদ বা কিস্তিতে সরাসরি জমি ক্রয়", 1),
                ("JV_DEVELOPMENT_SHARE", "JV In-Kind Allocation (জেভি ফ্ল্যাট/দোকান হিস্যা)", "বিনির্মাণ চুক্তি অনুযায়ী জমির মালিককে আনুপাতিক ফ্ল্যাট প্রদান", 2),
                ("HYBRID_CASH_AND_ALLOCATION", "Hybrid Cash & Allocation (নগদ অর্থ ও ইউনিট মিশ্রিত)", "অগ্রিম সাইনিং মানি ও বাকি মূল্য ফ্ল্যাটে সমন্বয়", 3)
            ],
            "AGREEMENT_WORKFLOW_STATUS": [
                ("DRAFTING", "Drafting in Progress (খসড়া প্রণয়ন)", "প্রাথমিক চুক্তিনামার খসড়া প্রস্তুত", 1),
                ("LEGAL_VETTING", "Legal & Chamber Vetting (আইনি মতামত)", "সুপ্রিম কোর্টের অ্যাডভোকেট দ্বারা ধারা যাচাই", 2),
                ("MANAGEMENT_REVIEW", "Management Review (ম্যানেজমেন্ট পর্যালোচনা)", "সি-লেভেল বাণিজ্যিক পর্যালোচনা", 3),
                ("READY_FOR_EXECUTION", "Ready for Execution (স্বাক্ষরের জন্য প্রস্তুত)", "স্ট্যাম্প প্রিন্ট ও স্বাক্ষর প্রস্তুত", 4),
                ("EXECUTED_REGISTERED", "Executed & Registered (সম্পাদিত ও রেজিস্ট্রিকৃত)", "সাব-রেজিস্ট্রি অফিসে নিবন্ধিত", 5),
                ("EXPIRED", "Agreement Expired (মেয়াদোত্তীর্ণ)", "চুক্তির নির্ধারিত সময়সীমা পার হয়ে গেছে", 6),
                ("TERMINATED", "Terminated (চুক্তি বাতিল)", "শর্ত ভঙ্গের কারণে চুক্তি বাতিল", 7)
            ]
        }

        for cat, items in items_map.items():
            cat_id = cat_map.get(cat)
            if not cat_id:
                continue
            for code, name_en, name_bn, sort_o in items:
                await conn.execute(text("""
                    INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_active)
                    VALUES (:cid, :code, :en, :bn, :s, 1)
                    ON DUPLICATE KEY UPDATE item_name_en = :en, item_name_bn = :bn, sort_order = :s
                """), {"cid": cat_id, "code": code, "en": name_en, "bn": name_bn, "s": sort_o})

        print("\n6. Checking / Seeding Demo Negotiation Dossier...")
        # Get target parcel and primary owner
        p_res = await conn.execute(text("SELECT id, project_name FROM lnd_parcels LIMIT 1"))
        parcel = p_res.fetchone()
        o_res = await conn.execute(text("SELECT id, full_name_en FROM lnd_landowners LIMIT 1"))
        owner = o_res.fetchone()

        if parcel and owner:
            p_id, p_name = parcel[0], parcel[1]
            o_id, o_name = owner[0], owner[1]
            neg_code = f"NEG-{p_id}-01"
            print(f"Seeding demo negotiation #{neg_code} for Parcel #{p_id} ({p_name}) with Owner #{o_id} ({o_name})")

            await conn.execute(text("""
                INSERT INTO lnd_land_negotiations (
                    negotiation_code, parcel_id, landowner_id, negotiation_title,
                    negotiation_stage, initial_asking_price_bdt, developer_target_price_bdt,
                    current_offer_amount_bdt, current_counteroffer_amount_bdt,
                    final_agreed_amount_bdt, consideration_type, proposed_advance_bdt,
                    installment_terms_summary, non_cash_consideration_details,
                    conditions_precedent, negotiation_start_date, target_closing_deadline,
                    agreement_execution_date, agreement_expiry_date, agreement_status,
                    is_delayed, delay_reason, terms_approved_by, terms_approved_at,
                    approval_notes, current_version
                ) VALUES (
                    :code, :pid, :oid, 'Commercial Acquisition of Twin Tower Core Sector Plot',
                    'FINAL_TERMS_AGREED', 42000000.00, 31000000.00,
                    32000000.00, 33500000.00,
                    32000000.00, 'HYBRID_CASH_AND_ALLOCATION', 5000000.00,
                    'Tranche 1: 5M Signing advance; Tranche 2: 15M on registered Bayna; Tranche 3: 12M on final mutation & vacant possession.',
                    'Landowner allocated 2 Luxury Apartments (Type-A, 2,150 sft each) and 2 Basement Parking Bays on 4th floor.',
                    '1. Certified copy of Warishan Sanad from Dhaka South City Corporation Ward 19. 2. Registered partition deed among 3 co-owners.',
                    '2026-09-01', '2026-11-15', NULL, '2027-11-14', 'LEGAL_VETTING',
                    0, NULL, 'Chief Executive Officer', NOW(),
                    'Approved at 32M BDT ceiling inclusive of 2 units residential allocation.', 3
                ) ON DUPLICATE KEY UPDATE final_agreed_amount_bdt = 32000000.00, current_version = 3
            """), {"code": neg_code, "pid": p_id, "oid": o_id})

            # Get negotiation ID
            res_n = await conn.execute(text("SELECT id FROM lnd_land_negotiations WHERE negotiation_code = :code"), {"code": neg_code})
            neg_id = res_n.scalar()

            # Seed 2 Meeting Minutes
            await conn.execute(text("DELETE FROM lnd_negotiation_meetings WHERE negotiation_id = :nid"), {"nid": neg_id})
            await conn.execute(text("""
                INSERT INTO lnd_negotiation_meetings (
                    negotiation_id, meeting_date, meeting_venue,
                    developer_attendees, landowner_attendees, discussion_minutes,
                    follow_up_tasks, next_meeting_date
                ) VALUES 
                (:nid, '2026-09-05', 'Developer Corporate Head Office, Gulshan-2',
                 'Managing Director, Head of Land Bank, Legal Counsel',
                 'Al-Haj Shamsuddin Ahmed (Co-Owner), Adv. Enamul Kabir (Family Counsel)',
                 'First formal meeting. Seller demanded 42M BDT in cash. Developer counteroffered 28M BDT with immediate 3M signing money.',
                 '1. Obtain mouza circle rate. 2. Verify warishan shares and family consent.', '2026-09-18'),
                (:nid, '2026-09-18', 'Pan Pacific Sonargaon Boardroom',
                 'Chief Commercial Officer, Head of Land Acquisition',
                 'All 3 Co-Owners (Owner A, Owner B, Owner C) & Nominees',
                 'Consensus reached on 32M BDT total consideration + 2 residential apartments allocation. Agreement on 30-day timeline for partition deed execution.',
                 'Draft bilingual Deed of Agreement and initiate Sub-Registry title search.', '2026-10-02')
            """), {"nid": neg_id})

            # Seed 3 Term Revisions (Version History)
            await conn.execute(text("DELETE FROM lnd_negotiation_term_versions WHERE negotiation_id = :nid"), {"nid": neg_id})
            await conn.execute(text("""
                INSERT INTO lnd_negotiation_term_versions (
                    negotiation_id, version_number, offered_by_party,
                    proposed_price_bdt, proposed_advance_bdt, proposed_timeline_days,
                    revision_summary, created_by_officer
                ) VALUES 
                (:nid, 1, 'LANDOWNER', 42000000.00, 10000000.00, 30, 'Initial asking price quoted by seller family.', 'Head of Land Acquisition'),
                (:nid, 2, 'DEVELOPER', 28000000.00, 3000000.00, 60, 'First formal developer counteroffer based on mouza rate and feasibility.', 'Land Acquisition Manager'),
                (:nid, 3, 'DEVELOPER', 32000000.00, 5000000.00, 45, 'Final agreed compromise: 32M BDT cash + 2 residential apartments allocation.', 'Chief Executive Officer')
            """), {"nid": neg_id})

            print(f"Seeded meetings and 3-version history for Negotiation #{neg_code} successfully!")

    print("\nDatabase upgrade for Module 2.9 Landowner Negotiation & Agreements completed successfully!")

if __name__ == "__main__":
    asyncio.run(upgrade())
