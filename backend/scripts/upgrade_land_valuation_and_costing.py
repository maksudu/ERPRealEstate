import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.core.database import engine
from sqlalchemy import text

async def upgrade():
    async with engine.begin() as conn:
        print("1. Creating lnd_land_valuations table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_land_valuations (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                valuation_code VARCHAR(64) NOT NULL UNIQUE,
                parcel_id BIGINT NOT NULL,
                valuation_date DATE NOT NULL,
                valuation_source VARCHAR(64) NOT NULL DEFAULT 'INTERNAL_ESTIMATE',
                assessor_name VARCHAR(191) NOT NULL,
                assessor_company VARCHAR(191) NULL,
                assessor_license_no VARCHAR(100) NULL,
                asking_price_total_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                market_valuation_total_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                govt_mouza_rate_per_decimal_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                govt_mouza_valuation_total_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                recommended_offer_price_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                notes_and_methodology TEXT NULL,
                approval_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
                approved_by VARCHAR(191) NULL,
                approval_date DATE NULL,
                approval_remarks TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_val_parcel_id (parcel_id),
                INDEX idx_val_source (valuation_source),
                INDEX idx_val_status (approval_status),
                CONSTRAINT fk_val_parcel FOREIGN KEY (parcel_id) REFERENCES lnd_parcels(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("lnd_land_valuations table verified/created.")

        print("\n2. Creating lnd_acquisition_costings table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_acquisition_costings (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                costing_code VARCHAR(64) NOT NULL UNIQUE,
                parcel_id BIGINT NOT NULL,
                valuation_id BIGINT NULL,
                costing_date DATE NOT NULL,
                costing_status VARCHAR(32) NOT NULL DEFAULT 'ESTIMATED',
                agreed_purchase_price_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                budget_allocated_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                total_estimated_expenses_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                total_actual_expenses_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                total_estimated_cost_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                total_actual_cost_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                remaining_budget_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                cost_variance_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                cost_variance_percent DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
                cost_per_decimal_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                cost_per_katha_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                cost_per_sqft_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                capitalized_land_cost_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                capitalized_development_cost_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                expensed_acquisition_cost_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                approval_stage VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
                approved_by VARCHAR(191) NULL,
                approved_at TIMESTAMP NULL,
                approval_notes TEXT NULL,
                remarks TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_acq_parcel_id (parcel_id),
                INDEX idx_acq_status (costing_status),
                INDEX idx_acq_approval (approval_stage),
                CONSTRAINT fk_acq_parcel FOREIGN KEY (parcel_id) REFERENCES lnd_parcels(id) ON DELETE CASCADE,
                CONSTRAINT fk_acq_val FOREIGN KEY (valuation_id) REFERENCES lnd_land_valuations(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("lnd_acquisition_costings table verified/created.")

        print("\n3. Creating lnd_acquisition_expense_items table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lnd_acquisition_expense_items (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                costing_id BIGINT NOT NULL,
                expense_category VARCHAR(64) NOT NULL,
                item_description VARCHAR(255) NOT NULL,
                payee_name VARCHAR(191) NULL,
                estimated_amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                actual_amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                variance_amount_bdt DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                payment_status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
                accounting_treatment VARCHAR(32) NOT NULL DEFAULT 'CAPITALIZE_LAND',
                payment_date DATE NULL,
                receipt_voucher_ref VARCHAR(128) NULL,
                supporting_document_url VARCHAR(255) NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_exp_costing_id (costing_id),
                INDEX idx_exp_category (expense_category),
                INDEX idx_exp_status (payment_status),
                CONSTRAINT fk_exp_costing FOREIGN KEY (costing_id) REFERENCES lnd_acquisition_costings(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("lnd_acquisition_expense_items table verified/created.")

        print("\n4. Registering Lookup Categories...")
        categories = [
            ("VALUATION_SOURCE", "Land Valuation Source", "Sources of land valuation and benchmark pricing"),
            ("ACQUISITION_EXPENSE_CATEGORY", "Land Acquisition Expense Category", "Itemized expenses and statutory fees for land acquisition"),
            ("COSTING_STATUS", "Land Acquisition Costing Status", "Workflow states of acquisition costing and budget tracking"),
            ("EXPENSE_ACCOUNTING_TREATMENT", "Expense Accounting Capitalization Policy", "Capitalized vs Expensed accounting treatment"),
            ("VALUATION_APPROVAL_STATUS", "Valuation Approval Status", "Approval states for pre-negotiation valuations")
        ]
        for code, name, desc in categories:
            await conn.execute(text("""
                INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active)
                VALUES (:c, :n, :d, 1)
                ON DUPLICATE KEY UPDATE category_name = :n, description = :d
            """), {"c": code, "n": name, "d": desc})

        # Fetch category map
        res_cats = await conn.execute(text("SELECT id, category_code FROM sys_lookup_categories"))
        cat_map = {r[1]: r[0] for r in res_cats.fetchall()}

        print("\n5. Registering Lookup Items...")
        items_map = {
            "VALUATION_SOURCE": [
                ("GOVT_MOUZA_RATE", "Govt Mouza Rate (সরকারি মৌজা হার)", "সরকারি রেজিস্ট্রি অফিস নির্ধারিত ন্যূনতম মৌজা হার", 1),
                ("BANK_EMPANELLED_VALUER", "Bank Empanelled Valuer (ব্যাংক তালিকাভুক্ত ভ্যালুয়ার)", "তফসিলি ব্যাংকের অনুমোদিত সার্ভে ও ভ্যালুয়েশন রিপোর্ট", 2),
                ("INDEPENDENT_SURVEYOR", "Independent Valuation Surveyor (স্বতন্ত্র সার্ভেয়ার)", "স্বতন্ত্র চার্টার্ড সার্ভেয়ার ও ইঞ্জিনিয়ারিং ফার্ম মূল্যায়ন", 3),
                ("INTERNAL_ESTIMATE", "Internal Feasibility Model (অভ্যন্তরীণ সম্ভাব্যতা)", "কোম্পানির ল্যান্ড অ্যাকুইজিশন কমিটির নিজস্ব মূল্যায়ন", 4),
                ("SELLER_ASKING", "Seller Asking Price (মালিকের প্রত্যাশিত মূল্য)", "জমি বিক্রেতার পক্ষ থেকে প্রাথমিকভাবে চাওয়া প্রস্তাবিত মূল্য", 5)
            ],
            "ACQUISITION_EXPENSE_CATEGORY": [
                ("REGISTRATION_FEES", "Registration & Sub-Registry Fees", "সাব-রেজিস্ট্রি দলিল রেজিস্ট্রি ফি ও স্থানীয় সরকার কর", 1),
                ("STAMP_DUTIES", "Stamp Duty & Capital Gain Tax", "নন-জুডিশিয়াল স্ট্যাম্প শুল্ক ও উৎস কর (Tax/AIT)", 2),
                ("LEGAL_FEES", "Legal & Advocate Vetting Charges", "আইনজীবী ফিস, তল্লাশি ও দলিল ড্রাফটিং খরচ", 3),
                ("SURVEY_EXPENSES", "Survey & Demarcation Expenses", "আমিন/সার্ভেয়ার পরিমাপ ও সীমানা পিলার স্থাপন খরচ", 4),
                ("BROKERAGE_COMMISSION", "Brokerage / Media Commission", "মিডিয়া এজেন্ট ও ব্রোকার কমিশন", 5),
                ("MUTATION_FEES", "Mutation & Land Tax (AC Land/DCR)", "এসিল্যান্ড খারিজ ফি, ডিসিআর ও নামজারি পর্চা খরচ", 6),
                ("COMPENSATION_SETTLEMENT", "Compensation & Eviction Settlement", "দখল উদ্ধার, ক্ষতিপূরণ ও নিষ্পত্তিমূলক অর্থ প্রদান", 7),
                ("OTHER_ACQUISITION_EXPENSES", "Other Acquisition Expenses", "অন্যান্য প্রাসঙ্গিক অধিগ্রহণ ও যোগাযোগ ব্যয়", 8)
            ],
            "COSTING_STATUS": [
                ("ESTIMATED", "Estimated Budget (প্রাক্কলিত বাজেট)", "প্রাথমিক বাজেট ও প্রাক্কলন পর্যায়", 1),
                ("IN_NEGOTIATION", "In Negotiation (দরকষাকষি চলমান)", "মালিকের সাথে মূল্য নির্ধারণ ও দরকষাকষি পর্যায়", 2),
                ("APPROVED", "Management Approved (অনুমোদিত বাজেট)", "ব্যবস্থাপনা পরিচালক বা বোর্ড কর্তৃক অনুমোদিত ব্যয়সীমা", 3),
                ("PARTIALLY_SPENT", "Partially Spent (ব্যয় চলমান)", "বায়না ও রেজিস্ট্রেশন বাবদ ব্যয় শুরু হয়েছে", 4),
                ("FINALIZED_CLOSED", "Finalized & Closed (অধিগ্রহণ সম্পন্ন)", "সম্পূর্ণ অধিগ্রহণ ব্যয় সম্পন্ন ও ব্যালান্স শিটে অন্তর্ভুক্ত", 5)
            ],
            "EXPENSE_ACCOUNTING_TREATMENT": [
                ("CAPITALIZE_LAND", "Capitalize to Freehold Land (জমির মূল্যে অন্তর্ভুক্ত)", "IAS 16 অনুযায়ী জমির স্থায়ী সম্পত্তিমূল্যে সরাসরি মূলধনীকরণ", 1),
                ("CAPITALIZE_PROJECT", "Capitalize to Project WIP (প্রকল্প খরচে অন্তর্ভুক্ত)", "রিয়েল এস্টেট ডেভেলপমেন্ট প্রজেক্টের ওয়ার্ক-ইন-প্রগ্রেস ব্যয়ে মূলধনীকরণ", 2),
                ("EXPENSE_OFF", "Expense to P&L (চলতি প্রশাসনিক ব্যয়)", "চলতি অর্থবছরের প্রফিট অ্যান্ড লসে চার্জ করা", 3)
            ],
            "VALUATION_APPROVAL_STATUS": [
                ("DRAFT", "Draft Valuation", "প্রাথমিক খসড়া রিপোর্ট", 1),
                ("SUBMITTED", "Submitted for Review", "ম্যানেজমেন্ট পর্যালোচনার জন্য জমা", 2),
                ("APPROVED", "Approved Valuation", "অনুমোদিত মূল্যায়ন", 3),
                ("REJECTED", "Rejected / Revise", "সংশোধনের নির্দেশ", 4)
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

        print("\n6. Checking / Seeding Demo Valuation & Costing Data...")
        # Get an active parcel
        res_parcel = await conn.execute(text("SELECT id, project_name, total_area_decimal, total_area_katha, total_area_sqft FROM lnd_parcels ORDER BY id ASC LIMIT 1"))
        parcel = res_parcel.fetchone()
        
        if parcel:
            p_id, p_name, p_dec, p_katha, p_sqft = parcel[0], parcel[1], float(parcel[2] or 20.0), float(parcel[3] or 12.1), float(parcel[4] or 8712.0)
            print(f"Found Target Parcel #{p_id}: {p_name} ({p_dec} Dec / {p_sqft} sqft)")

            # Insert Demo Valuations
            val1_code = f"VAL-{p_id}-MOUZA"
            val2_code = f"VAL-{p_id}-SURVEYOR"
            val3_code = f"VAL-{p_id}-SELLER"

            # 1. Govt Mouza Rate Valuation (e.g. 1,200,000 BDT per decimal)
            mouza_rate = 1200000.00
            mouza_total = p_dec * mouza_rate
            await conn.execute(text("""
                INSERT INTO lnd_land_valuations (
                    valuation_code, parcel_id, valuation_date, valuation_source,
                    assessor_name, assessor_company, assessor_license_no,
                    asking_price_total_bdt, market_valuation_total_bdt,
                    govt_mouza_rate_per_decimal_bdt, govt_mouza_valuation_total_bdt,
                    recommended_offer_price_bdt, notes_and_methodology,
                    approval_status, approved_by, approval_date, approval_remarks
                ) VALUES (
                    :code, :pid, '2026-09-15', 'GOVT_MOUZA_RATE',
                    'Tejgaon Sub-Registry Officer', 'Sub-Registry Valuation Record', 'SR-TEJ-2026',
                    0, :mouza_total, :mouza_rate, :mouza_total,
                    :mouza_total, 'Official sub-registry circle rate for Dhaka mouza class residential plot.',
                    'APPROVED', 'Chief Legal Officer', '2026-09-16', 'Approved for benchmark statutory reference'
                ) ON DUPLICATE KEY UPDATE market_valuation_total_bdt = :mouza_total
            """), {"code": val1_code, "pid": p_id, "mouza_rate": mouza_rate, "mouza_total": mouza_total})

            # 2. Chartered Surveyor Market Valuation (e.g. 1,850,000 BDT per decimal)
            surveyor_market = p_dec * 1850000.00
            offer_rec = p_dec * 1650000.00
            await conn.execute(text("""
                INSERT INTO lnd_land_valuations (
                    valuation_code, parcel_id, valuation_date, valuation_source,
                    assessor_name, assessor_company, assessor_license_no,
                    asking_price_total_bdt, market_valuation_total_bdt,
                    govt_mouza_rate_per_decimal_bdt, govt_mouza_valuation_total_bdt,
                    recommended_offer_price_bdt, notes_and_methodology,
                    approval_status, approved_by, approval_date, approval_remarks
                ) VALUES (
                    :code, :pid, '2026-09-20', 'INDEPENDENT_SURVEYOR',
                    'Engr. Tanvir Ahmed, FIEB', 'Pioneer Surveyors & Valuers Ltd', 'VAL-DHK-4421',
                    40000000.00, :market_total, :mouza_rate, :mouza_total,
                    :offer_rec, 'Comparative sales method based on 3 recent registered deeds in adjacent 60ft road sector.',
                    'APPROVED', 'Managing Director', '2026-09-22', 'Recommended cap: 33,000,000 BDT'
                ) ON DUPLICATE KEY UPDATE market_valuation_total_bdt = :market_total
            """), {"code": val2_code, "pid": p_id, "mouza_rate": mouza_rate, "mouza_total": mouza_total, "market_total": surveyor_market, "offer_rec": offer_rec})

            # 3. Seller Asking Price
            seller_asking = 42000000.00
            await conn.execute(text("""
                INSERT INTO lnd_land_valuations (
                    valuation_code, parcel_id, valuation_date, valuation_source,
                    assessor_name, assessor_company, assessor_license_no,
                    asking_price_total_bdt, market_valuation_total_bdt,
                    govt_mouza_rate_per_decimal_bdt, govt_mouza_valuation_total_bdt,
                    recommended_offer_price_bdt, notes_and_methodology,
                    approval_status
                ) VALUES (
                    :code, :pid, '2026-09-10', 'SELLER_ASKING',
                    'Al-Haj Shamsuddin Ahmed (Co-Owner Representative)', 'Landowner Family', NULL,
                    :asking, :market_total, :mouza_rate, :mouza_total,
                    :offer_rec, 'Initial verbal quote received during landowner negotiation session #1.',
                    'SUBMITTED'
                ) ON DUPLICATE KEY UPDATE asking_price_total_bdt = :asking
            """), {"code": val3_code, "pid": p_id, "asking": seller_asking, "market_total": surveyor_market, "mouza_rate": mouza_rate, "mouza_total": mouza_total, "offer_rec": offer_rec})

            # Get the surveyor valuation ID
            res_v = await conn.execute(text("SELECT id FROM lnd_land_valuations WHERE valuation_code = :code"), {"code": val2_code})
            val_id = res_v.scalar()

            # Insert Master Acquisition Costing
            costing_code = f"ACQ-{p_id}-2026"
            agreed_price = 32000000.00  # 3.2 Crore BDT
            budget = 36000000.00        # 3.6 Crore Budget
            
            # Itemized Expenses:
            # Registration: 2,400,000 (est), 2,350,000 (act)
            # Stamp Duty: 960,000 (est), 960,000 (act)
            # Legal: 250,000 (est), 200,000 (act)
            # Survey: 80,000 (est), 75,000 (act)
            # Brokerage: 640,000 (est), 640,000 (act)
            # Mutation: 120,000 (est), 95,000 (act)
            # Settlement: 450,000 (est), 400,000 (act)
            # Other: 100,000 (est), 80,000 (act)
            est_expenses = 5000000.00
            act_expenses = 4800000.00
            
            total_est_cost = agreed_price + est_expenses # 37,000,000
            total_act_cost = agreed_price + act_expenses # 36,800,000
            rem_budget = budget - total_act_cost         # -800,000 or adjusted
            
            cost_per_dec = total_act_cost / p_dec if p_dec > 0 else 0
            cost_per_katha = total_act_cost / p_katha if p_katha > 0 else 0
            cost_per_sqft = total_act_cost / p_sqft if p_sqft > 0 else 0
            
            cap_land = agreed_price + 2350000.00 + 960000.00 + 95000.00 # Consideration + Reg + Stamp + Mutation
            cap_dev = 75000.00 + 400000.00                               # Survey + Settlement
            exp_acq = 640000.00 + 200000.00 + 80000.00                   # Brokerage + Legal + Other

            await conn.execute(text("""
                INSERT INTO lnd_acquisition_costings (
                    costing_code, parcel_id, valuation_id, costing_date,
                    costing_status, agreed_purchase_price_bdt, budget_allocated_bdt,
                    total_estimated_expenses_bdt, total_actual_expenses_bdt,
                    total_estimated_cost_bdt, total_actual_cost_bdt,
                    remaining_budget_bdt, cost_variance_bdt, cost_variance_percent,
                    cost_per_decimal_bdt, cost_per_katha_bdt, cost_per_sqft_bdt,
                    capitalized_land_cost_bdt, capitalized_development_cost_bdt,
                    expensed_acquisition_cost_bdt, approval_stage, approved_by,
                    approved_at, remarks
                ) VALUES (
                    :code, :pid, :vid, '2026-10-01',
                    'APPROVED', :agreed, :budget,
                    :est_exp, :act_exp,
                    :est_tot, :act_tot,
                    :rem_b, :var_b, -0.54,
                    :cpd, :cpk, :cps,
                    :cl, :cd,
                    :exp, 'BOARD_APPROVED', 'Executive Committee',
                    NOW(), 'Full acquisition budget and 8-item expense schedule approved for parcel execution.'
                ) ON DUPLICATE KEY UPDATE agreed_purchase_price_bdt = :agreed, total_actual_cost_bdt = :act_tot
            """), {
                "code": costing_code, "pid": p_id, "vid": val_id,
                "agreed": agreed_price, "budget": 38000000.00,
                "est_exp": est_expenses, "act_exp": act_expenses,
                "est_tot": total_est_cost, "act_tot": total_act_cost,
                "rem_b": 38000000.00 - total_act_cost, "var_b": total_act_cost - total_est_cost,
                "cpd": cost_per_dec, "cpk": cost_per_katha, "cps": cost_per_sqft,
                "cl": cap_land, "cd": cap_dev, "exp": exp_acq
            })

            # Get costing id
            res_c = await conn.execute(text("SELECT id FROM lnd_acquisition_costings WHERE costing_code = :code"), {"code": costing_code})
            c_id = res_c.scalar()

            # Insert the 8 expense items
            expenses_data = [
                ("REGISTRATION_FEES", "Tejgaon Sub-Registry Registration Duty (7.5%)", "Sub-Registrar Office, Tejgaon", 2400000.00, 2350000.00, "PAID", "CAPITALIZE_LAND", "2026-10-05", "CHQ-REG-2026-091"),
                ("STAMP_DUTIES", "Non-Judicial Stamp Duty & Local Govt Taxes", "Sonali Bank Custom Treasury", 960000.00, 960000.00, "PAID", "CAPITALIZE_LAND", "2026-10-05", "TR-STAMP-4481"),
                ("LEGAL_FEES", "Title Vetting, Deed Drafting & Attestation Fees", "Islam & Associates Legal Chambers", 250000.00, 200000.00, "PAID", "EXPENSE_OFF", "2026-10-03", "INV-LEGAL-772"),
                ("SURVEY_EXPENSES", "Digital Survey, Boundary Fixation & RCC Pillars", "Dhaka Geotech Surveyors", 80000.00, 75000.00, "PAID", "CAPITALIZE_PROJECT", "2026-10-02", "INV-SURV-118"),
                ("BROKERAGE_COMMISSION", "Media & Brokerage Commission (2% Agreed)", "Bengal Property Media Syndicate", 640000.00, 640000.00, "PAID", "EXPENSE_OFF", "2026-10-06", "VOUCHER-BRK-08"),
                ("MUTATION_FEES", "AC Land Mutation Porcha, DCR & Khajna Clearances", "AC Land Office, Circle-1", 120000.00, 95000.00, "PAID", "CAPITALIZE_LAND", "2026-10-08", "DCR-MUT-9941"),
                ("COMPENSATION_SETTLEMENT", "Temporary Shed Eviction & Settlement Agreement", "Occupant Representatives", 450000.00, 400000.00, "PAID", "CAPITALIZE_PROJECT", "2026-10-04", "SETTLE-AGR-02"),
                ("OTHER_ACQUISITION_EXPENSES", "Legal Public Notices (2 Daily Newspapers) & Conveyance", "Daily Ittefaq & Daily Star Ad Dept", 100000.00, 80000.00, "PAID", "EXPENSE_OFF", "2026-10-01", "PUB-NOT-2026")
            ]

            # Clear existing items for clean seed
            await conn.execute(text("DELETE FROM lnd_acquisition_expense_items WHERE costing_id = :cid"), {"cid": c_id})

            for cat, desc, payee, est_a, act_a, status, treat, p_date, v_ref in expenses_data:
                await conn.execute(text("""
                    INSERT INTO lnd_acquisition_expense_items (
                        costing_id, expense_category, item_description, payee_name,
                        estimated_amount_bdt, actual_amount_bdt, variance_amount_bdt,
                        payment_status, accounting_treatment, payment_date, receipt_voucher_ref
                    ) VALUES (
                        :cid, :cat, :desc, :payee,
                        :est, :act, :var,
                        :status, :treat, :p_date, :v_ref
                    )
                """), {
                    "cid": c_id, "cat": cat, "desc": desc, "payee": payee,
                    "est": est_a, "act": act_a, "var": act_a - est_a,
                    "status": status, "treat": treat, "p_date": p_date, "v_ref": v_ref
                })

            print(f"Seeded 8 acquisition expense items for Costing #{costing_code} successfully!")

    print("\nDatabase upgrade and seed for Land Valuation & Costing completed successfully!")

if __name__ == "__main__":
    asyncio.run(upgrade())
