import asyncio
import sys
import os
from datetime import date, datetime
from decimal import Decimal

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS hr_salary_components (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        component_code VARCHAR(50) NOT NULL,
        name_en VARCHAR(150) NOT NULL,
        name_bn VARCHAR(150) NULL,
        component_type VARCHAR(32) NOT NULL DEFAULT 'EARNING', -- EARNING, DEDUCTION, EMPLOYER_CONTRIBUTION
        calculation_type VARCHAR(32) NOT NULL DEFAULT 'PERCENTAGE_OF_BASIC', -- PERCENTAGE_OF_BASIC, PERCENTAGE_OF_GROSS, FIXED_AMOUNT
        default_value_or_percent DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
        is_statutory BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INT NOT NULL DEFAULT 10,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sc_org (organization_id),
        UNIQUE KEY uq_sc_code_org (organization_id, component_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_salary_structures (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        structure_code VARCHAR(50) NOT NULL,
        name_en VARCHAR(150) NOT NULL,
        description TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ss_org (organization_id),
        UNIQUE KEY uq_ss_code_org (organization_id, structure_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_salary_structure_items (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        structure_id BIGINT NOT NULL,
        component_id BIGINT NOT NULL,
        calculation_type VARCHAR(32) NOT NULL DEFAULT 'PERCENTAGE_OF_BASIC',
        value_or_percent DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        INDEX idx_ssi_struct (structure_id),
        INDEX idx_ssi_comp (component_id),
        CONSTRAINT fk_ssi_struct FOREIGN KEY (structure_id) REFERENCES hr_salary_structures(id) ON DELETE CASCADE,
        CONSTRAINT fk_ssi_comp FOREIGN KEY (component_id) REFERENCES hr_salary_components(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_employee_salaries (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        employee_id BIGINT NOT NULL,
        structure_id BIGINT NOT NULL,
        gross_salary DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        basic_salary DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_es_org (organization_id),
        INDEX idx_es_emp (employee_id),
        INDEX idx_es_struct (structure_id),
        CONSTRAINT fk_es_struct FOREIGN KEY (structure_id) REFERENCES hr_salary_structures(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_salary_revisions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        employee_id BIGINT NOT NULL,
        revision_type VARCHAR(32) NOT NULL DEFAULT 'INCREMENT', -- INCREMENT, PROMOTION, TRANSFER_ADJUSTMENT, MARKET_CORRECTION
        effective_date DATE NOT NULL,
        previous_gross DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        new_gross DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        increment_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        increment_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        approved_by BIGINT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'APPROVED', -- DRAFT, APPROVED, REJECTED
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sr_org (organization_id),
        INDEX idx_sr_emp (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_payroll_periods (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        period_code VARCHAR(30) NOT NULL, -- e.g. 2026-10
        period_name VARCHAR(100) NOT NULL, -- October 2026
        year INT NOT NULL,
        month INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        cut_off_date DATE NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PROCESSING, SUBMITTED, VERIFIED, APPROVED, POSTED, LOCKED
        total_employees INT NOT NULL DEFAULT 0,
        total_gross DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        total_deductions DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        total_net_payable DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        total_employer_cost DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        prepared_by BIGINT NULL,
        prepared_at TIMESTAMP NULL,
        verified_by BIGINT NULL,
        verified_at TIMESTAMP NULL,
        approved_by BIGINT NULL,
        approved_at TIMESTAMP NULL,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        locked_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pp_org (organization_id),
        UNIQUE KEY uq_pp_code_org (organization_id, period_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_payroll_payslips (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        period_id BIGINT NOT NULL,
        employee_id BIGINT NOT NULL,
        gross_salary DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        basic_salary DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        house_rent DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        medical_allowance DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        conveyance_allowance DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        other_allowances DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        overtime_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
        overtime_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        bonus_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        arrears_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        total_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        unpaid_leave_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        unpaid_leave_deduction DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        income_tax_deduction DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        provident_fund_employee DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        provident_fund_employer DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        staff_loan_recovery DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        salary_advance_recovery DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        other_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        total_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        net_salary_payable DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        bank_name VARCHAR(100) NULL,
        bank_account_no VARCHAR(50) NULL,
        payment_method VARCHAR(32) NOT NULL DEFAULT 'BANK_TRANSFER',
        status VARCHAR(20) NOT NULL DEFAULT 'CALCULATED',
        validation_warnings JSON NULL,
        is_disbursed BOOLEAN NOT NULL DEFAULT FALSE,
        disbursed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ps_org (organization_id),
        INDEX idx_ps_period (period_id),
        INDEX idx_ps_emp (employee_id),
        UNIQUE KEY uq_ps_period_emp (period_id, employee_id),
        CONSTRAINT fk_ps_period FOREIGN KEY (period_id) REFERENCES hr_payroll_periods(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_staff_loans (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        employee_id BIGINT NOT NULL,
        loan_code VARCHAR(50) NOT NULL,
        loan_type VARCHAR(32) NOT NULL DEFAULT 'EMERGENCY_LOAN', -- EMERGENCY_LOAN, HOUSING_LOAN, MEDICAL_LOAN
        principal_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        tenure_months INT NOT NULL DEFAULT 12,
        monthly_installment DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        disbursed_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        recovered_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        remaining_balance DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        disbursement_date DATE NOT NULL,
        start_recovery_period VARCHAR(20) NOT NULL, -- e.g. 2026-10
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PAID_OFF, WRITTEN_OFF
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sl_org (organization_id),
        INDEX idx_sl_emp (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_salary_advances (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        employee_id BIGINT NOT NULL,
        advance_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        requested_date DATE NOT NULL,
        recovery_period VARCHAR(20) NOT NULL, -- e.g. 2026-10
        recovered_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(20) NOT NULL DEFAULT 'APPROVED', -- PENDING, APPROVED, RECOVERED, REJECTED
        reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sa_org (organization_id),
        INDEX idx_sa_emp (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_bonuses_incentives (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        employee_id BIGINT NOT NULL,
        bonus_type VARCHAR(32) NOT NULL DEFAULT 'PERFORMANCE_BONUS', -- EID_UL_FITR, EID_UL_ADHA, PERFORMANCE_BONUS, PROJECT_INCENTIVE
        period_code VARCHAR(20) NOT NULL, -- e.g. 2026-10
        bonus_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
        status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bi_org (organization_id),
        INDEX idx_bi_emp (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_tax_slabs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        tax_year VARCHAR(30) NOT NULL DEFAULT '2025-2026',
        slab_name VARCHAR(100) NOT NULL,
        min_income DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        max_income DECIMAL(14, 2) NULL, -- NULL represents above / highest bracket
        tax_rate_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        gender_applicability VARCHAR(20) NOT NULL DEFAULT 'ALL',
        display_order INT NOT NULL DEFAULT 10,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        INDEX idx_ts_year (tax_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

async def run_migration():
    print("Connecting to database and running Salary Structure & Payroll Engine migration...")
    async with AsyncSessionLocal() as session:
        for stmt in DDL_STATEMENTS:
            await session.execute(text(stmt))
        await session.commit()
        print("All DDL tables created successfully!")

        # 1. Seed Salary Components
        comp_count_res = await session.execute(text("SELECT COUNT(*) FROM hr_salary_components"))
        if comp_count_res.scalar() == 0:
            print("Seeding statutory Bangladesh salary components...")
            components = [
                ("BASIC", "Basic Salary", "মূল বেতন", "EARNING", "PERCENTAGE_OF_GROSS", 50.00, True, True, 10),
                ("HOUSE_RENT", "House Rent Allowance", "বাড়ি ভাড়া ভাতা", "EARNING", "PERCENTAGE_OF_BASIC", 50.00, False, True, 20),
                ("MEDICAL", "Medical Allowance", "চিকিৎসা ভাতা", "EARNING", "PERCENTAGE_OF_BASIC", 20.00, False, True, 30),
                ("CONVEYANCE", "Conveyance Allowance", "যাতায়াত ভাতা", "EARNING", "PERCENTAGE_OF_BASIC", 10.00, False, True, 40),
                ("SITE_HAZARD", "Project Site Hazard Allowance", "সাইট ঝুঁকি ভাতা", "EARNING", "FIXED_AMOUNT", 5000.00, True, False, 50),
                ("MOBILE", "Mobile & Internet Allowance", "মোবাইল ও ইন্টারনেট ভাতা", "EARNING", "FIXED_AMOUNT", 1500.00, True, False, 60),
                ("PF_DEDUCTION", "Provident Fund (Employee 10%)", "ভবিষ্য তহবিল কর্তন", "DEDUCTION", "PERCENTAGE_OF_BASIC", 10.00, False, True, 70),
                ("TAX_TDS", "Income Tax Withholding (TDS)", "আয়কর কর্তন", "DEDUCTION", "PERCENTAGE_OF_GROSS", 5.00, False, True, 80),
                ("PF_EMPLOYER", "Provident Fund (Employer Match 10%)", "ভবিষ্য তহবিল নিয়োগকর্তা অংশ", "EMPLOYER_CONTRIBUTION", "PERCENTAGE_OF_BASIC", 10.00, False, True, 90),
            ]
            for c in components:
                await session.execute(text("""
                    INSERT INTO hr_salary_components (
                        organization_id, component_code, name_en, name_bn, component_type, calculation_type,
                        default_value_or_percent, is_taxable, is_statutory, sort_order, is_active
                    ) VALUES (
                        1, :code, :name_en, :name_bn, :ctype, :calctype, :val, :tax, :stat, :so, TRUE
                    )
                """), {
                    "code": c[0], "name_en": c[1], "name_bn": c[2], "ctype": c[3],
                    "calctype": c[4], "val": c[5], "tax": c[6], "stat": c[7], "so": c[8]
                })
            await session.commit()
            print("Salary components seeded.")

        # 2. Seed Salary Structures
        struct_count_res = await session.execute(text("SELECT COUNT(*) FROM hr_salary_structures"))
        if struct_count_res.scalar() == 0:
            print("Seeding standard salary structures...")
            await session.execute(text("""
                INSERT INTO hr_salary_structures (organization_id, structure_code, name_en, description, is_active)
                VALUES
                (1, 'CORP_EXEC', 'Corporate Executive Salary Structure', 'Standard 50% Basic, 25% House Rent, 10% Medical, 10% Conveyance, 5% Mobile', TRUE),
                (1, 'SITE_ENGG', 'Project Site Engineering Structure', 'Basic + House Rent + Site Hazard Allowance + Mobile', TRUE),
                (1, 'LABOUR_SKILLED', 'Skilled Daily/Weekly Construction Structure', 'Muster roll & statutory daily wage model', TRUE)
            """))
            await session.commit()

            # Attach items to CORP_EXEC
            struct_id_res = await session.execute(text("SELECT id FROM hr_salary_structures WHERE structure_code = 'CORP_EXEC'"))
            struct_id = struct_id_res.scalar()
            if struct_id:
                comps = await session.execute(text("SELECT id, component_code, calculation_type, default_value_or_percent FROM hr_salary_components WHERE organization_id = 1"))
                for comp in comps.fetchall():
                    await session.execute(text("""
                        INSERT INTO hr_salary_structure_items (structure_id, component_id, calculation_type, value_or_percent)
                        VALUES (:sid, :cid, :ctype, :val)
                    """), {
                        "sid": struct_id, "cid": comp.id, "ctype": comp.calculation_type, "val": comp.default_value_or_percent
                    })
                await session.commit()
            print("Salary structures seeded.")

        # 3. Seed Employee Salary Assignments if empty
        es_count = await session.execute(text("SELECT COUNT(*) FROM hr_employee_salaries"))
        if es_count.scalar() == 0:
            print("Assigning default salary structures to active employees...")
            struct_res = await session.execute(text("SELECT id FROM hr_salary_structures WHERE structure_code = 'CORP_EXEC' LIMIT 1"))
            sid = struct_res.scalar() or 1
            emps_res = await session.execute(text("SELECT id, basic_salary FROM hr_employees WHERE status = 'ACTIVE' OR status IS NULL"))
            emps = emps_res.fetchall()
            for emp in emps:
                gross = Decimal(emp.basic_salary or 50000) * Decimal('1.6')
                basic = Decimal(emp.basic_salary or 50000)
                await session.execute(text("""
                    INSERT INTO hr_employee_salaries (
                        organization_id, employee_id, structure_id, gross_salary, basic_salary,
                        effective_from, is_active, notes
                    ) VALUES (
                        1, :eid, :sid, :gross, :basic, '2026-01-01', TRUE, 'Initial corporate package assignment'
                    )
                """), {"eid": emp.id, "sid": sid, "gross": gross, "basic": basic})
            await session.commit()
            print(f"Assigned salary structure to {len(emps)} employees.")

        # 4. Seed Tax Slabs (NBR Bangladesh 2025-2026)
        tax_slabs_count = await session.execute(text("SELECT COUNT(*) FROM hr_tax_slabs"))
        if tax_slabs_count.scalar() == 0:
            print("Seeding NBR Bangladesh Tax Slabs...")
            slabs = [
                ("First Tk. 3,50,000 (Tax Free)", Decimal("0.00"), Decimal("350000.00"), Decimal("0.00"), "MALE", 10),
                ("Next Tk. 1,00,000", Decimal("350000.00"), Decimal("450000.00"), Decimal("5.00"), "ALL", 20),
                ("Next Tk. 4,00,000", Decimal("450000.00"), Decimal("850000.00"), Decimal("10.00"), "ALL", 30),
                ("Next Tk. 5,00,000", Decimal("850000.00"), Decimal("1350000.00"), Decimal("15.00"), "ALL", 40),
                ("Next Tk. 5,00,000", Decimal("1350000.00"), Decimal("1850000.00"), Decimal("20.00"), "ALL", 50),
                ("Remaining Balance above Tk. 18,50,000", Decimal("1850000.00"), None, Decimal("25.00"), "ALL", 60),
            ]
            for s in slabs:
                await session.execute(text("""
                    INSERT INTO hr_tax_slabs (tax_year, slab_name, min_income, max_income, tax_rate_percent, gender_applicability, display_order, is_active)
                    VALUES ('2025-2026', :name, :min_inc, :max_inc, :rate, :gender, :d_order, TRUE)
                """), {
                    "name": s[0], "min_inc": s[1], "max_inc": s[2], "rate": s[3], "gender": s[4], "d_order": s[5]
                })
            await session.commit()
            print("Tax slabs seeded.")

        # 5. Seed Payroll Period for 2026-10
        pp_count = await session.execute(text("SELECT COUNT(*) FROM hr_payroll_periods WHERE period_code = '2026-10'"))
        if pp_count.scalar() == 0:
            print("Creating standard Payroll Period 2026-10...")
            await session.execute(text("""
                INSERT INTO hr_payroll_periods (
                    organization_id, period_code, period_name, year, month,
                    start_date, end_date, cut_off_date, status, total_employees,
                    total_gross, total_deductions, total_net_payable, total_employer_cost,
                    prepared_by, prepared_at, is_locked
                ) VALUES (
                    1, '2026-10', 'October 2026', 2026, 10,
                    '2026-10-01', '2026-10-31', '2026-10-25', 'DRAFT', 0,
                    0.00, 0.00, 0.00, 0.00,
                    1, CURRENT_TIMESTAMP, FALSE
                )
            """))
            await session.commit()
            print("Payroll period 2026-10 created.")

        # 6. Seed Dynamic Lookup Categories for Salary & Payroll
        lookup_cats = [
            ("HR_SALARY_COMPONENT_TYPE", "Salary Component Type", [
                ("EARNING", "Earning / Allowance", "আয় / ভাতা", 10),
                ("DEDUCTION", "Statutory / Voluntary Deduction", "কর্তন", 20),
                ("EMPLOYER_CONTRIBUTION", "Employer Contribution", "নিয়োগকর্তার অংশ", 30),
            ]),
            ("HR_SALARY_REVISION_TYPE", "Salary Revision Reason", [
                ("INCREMENT", "Annual Merit Increment", "বার্ষিক ইনক্রিমেন্ট", 10),
                ("PROMOTION", "Promotional Upgrade", "পদোন্নতি সমন্বয়", 20),
                ("TRANSFER_ADJUSTMENT", "Location / Site Transfer Adjustment", "বদলি সমন্বয়", 30),
                ("MARKET_CORRECTION", "Market Alignment Correction", "বাজার সমন্বয়", 40),
            ]),
            ("HR_PAYROLL_STATUS", "Payroll Period Lifecycle Status", [
                ("DRAFT", "Draft Period Open", "খসড়া উন্মুক্ত", 10),
                ("PROCESSING", "Calculating Inputs & Attendance", "হিসাব প্রক্রিয়াধীন", 20),
                ("SUBMITTED", "Submitted by Maker", "জমা দেওয়া হয়েছে", 30),
                ("VERIFIED", "Verified by Checker", "যাচাইকৃত", 40),
                ("APPROVED", "Approved by Management", "অনুমোদিত", 50),
                ("POSTED", "Posted to Accounts GL", "জেনারেল লেজারে পোস্টকৃত", 60),
                ("LOCKED", "Locked / Closed", "লক বা বন্ধ", 70),
            ]),
            ("HR_STAFF_LOAN_TYPE", "Staff Loan Categories", [
                ("EMERGENCY_LOAN", "Emergency Distress Loan", "জরুরী ঋণ", 10),
                ("HOUSING_LOAN", "Company Housing Loan", "আবাসন ঋণ", 20),
                ("MEDICAL_LOAN", "Medical Treatment Loan", "চিকিৎসা ঋণ", 30),
            ]),
            ("HR_BONUS_TYPE", "Bonus & Incentive Categories", [
                ("EID_UL_FITR", "Festival Bonus (Eid-ul-Fitr)", "ঈদুল ফিতর বোনাস", 10),
                ("EID_UL_ADHA", "Festival Bonus (Eid-ul-Adha)", "ঈদুল আযহা বোনাস", 20),
                ("PERFORMANCE_BONUS", "Annual Performance Incentive", "পারফরম্যান্স বোনাস", 30),
                ("PROJECT_INCENTIVE", "Site Handover Milestone Incentive", "প্রকল্প মাইলফলক প্রণোদনা", 40),
            ])
        ]

        for cat_code, cat_name, items in lookup_cats:
            cat_res = await session.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"), {"c": cat_code})
            row = cat_res.first()
            if not row:
                await session.execute(text("""
                    INSERT INTO sys_lookup_categories (category_code, category_name, is_hierarchical, is_system_locked, is_active)
                    VALUES (:c, :n, FALSE, TRUE, TRUE)
                """), {"c": cat_code, "n": cat_name})
                await session.commit()
                cat_res = await session.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"), {"c": cat_code})
                cat_id = cat_res.scalar()
            else:
                cat_id = row[0]

            for item_code, name_en, name_bn, sort_order in items:
                item_res = await session.execute(text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :code"), {"cid": cat_id, "code": item_code})
                if not item_res.first():
                    await session.execute(text("""
                        INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_active)
                        VALUES (:cid, :code, :en, :bn, :so, TRUE)
                    """), {"cid": cat_id, "code": item_code, "en": name_en, "bn": name_bn, "so": sort_order})
            await session.commit()

        print("All lookups successfully configured.")

if __name__ == "__main__":
    asyncio.run(run_migration())
