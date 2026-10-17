import asyncio
import sys
import os
from datetime import time, date, datetime, timedelta
from decimal import Decimal

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS hr_leave_types (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        leave_type_code VARCHAR(50) NOT NULL,
        name_en VARCHAR(100) NOT NULL,
        name_bn VARCHAR(150) NULL,
        is_paid BOOLEAN NOT NULL DEFAULT TRUE,
        color_code VARCHAR(30) NOT NULL DEFAULT '#3b82f6',
        description VARCHAR(255) NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lt_org (organization_id),
        UNIQUE KEY uq_lt_code_org (organization_id, leave_type_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_leave_policies (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        leave_type_id BIGINT NOT NULL,
        policy_name VARCHAR(150) NOT NULL,
        annual_entitlement_days DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
        accrual_frequency VARCHAR(32) NOT NULL DEFAULT 'YEARLY', -- YEARLY, MONTHLY, PRO_RATA
        max_carry_forward_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        carry_forward_expiry_months INT NOT NULL DEFAULT 12,
        encashment_allowed BOOLEAN NOT NULL DEFAULT FALSE,
        max_encashment_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        min_service_days_required INT NOT NULL DEFAULT 90,
        gender_applicability VARCHAR(20) NOT NULL DEFAULT 'ALL', -- ALL, MALE, FEMALE
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lp_org (organization_id),
        INDEX idx_lp_lt (leave_type_id),
        CONSTRAINT fk_lp_lt FOREIGN KEY (leave_type_id) REFERENCES hr_leave_types(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_leave_balances (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        employee_id BIGINT NOT NULL,
        leave_type_id BIGINT NOT NULL,
        year INT NOT NULL DEFAULT 2026,
        opening_balance DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        carried_forward DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        accrued_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        used_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        pending_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        available_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        encashed_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lb_org (organization_id),
        INDEX idx_lb_emp (employee_id),
        INDEX idx_lb_lt (leave_type_id),
        UNIQUE KEY uq_lb_emp_lt_yr (organization_id, employee_id, leave_type_id, year),
        CONSTRAINT fk_lb_emp FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE,
        CONSTRAINT fk_lb_lt FOREIGN KEY (leave_type_id) REFERENCES hr_leave_types(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_overtime_requests (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        employee_id BIGINT NOT NULL,
        project_id BIGINT NULL,
        ot_date DATE NOT NULL,
        ot_type VARCHAR(32) NOT NULL DEFAULT 'NORMAL_OT', -- NORMAL_OT, WEEKEND_OT, HOLIDAY_OT
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        requested_hours DECIMAL(5, 2) NOT NULL DEFAULT 2.00,
        task_description TEXT NOT NULL,
        
        attendance_id BIGINT NULL,
        verified_hours DECIMAL(5, 2) NULL,
        verifier_id BIGINT NULL,
        verifier_remarks VARCHAR(255) NULL,
        verified_at TIMESTAMP NULL,
        
        approved_hours DECIMAL(5, 2) NULL,
        approver_id BIGINT NULL,
        approver_remarks VARCHAR(255) NULL,
        approved_at TIMESTAMP NULL,
        rate_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.50,
        calculated_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        
        is_payroll_processed BOOLEAN NOT NULL DEFAULT FALSE,
        payroll_run_id BIGINT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, VERIFIED, APPROVED, REJECTED, PAID_IN_PAYROLL
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ot_org (organization_id),
        INDEX idx_ot_emp (employee_id),
        INDEX idx_ot_date (ot_date),
        INDEX idx_ot_status (status),
        CONSTRAINT fk_ot_emp FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_payroll_inputs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL DEFAULT 1,
        employee_id BIGINT NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        payroll_run_id BIGINT NULL,
        approved_overtime_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
        overtime_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        unpaid_leave_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        deduction_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        source_reference VARCHAR(100) NULL,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pi_org (organization_id),
        INDEX idx_pi_emp (employee_id),
        INDEX idx_pi_period (year, month),
        CONSTRAINT fk_pi_emp FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

ALTER_LEAVE_APPLICATIONS = [
    ("leave_type_id", "BIGINT NULL"),
    ("manager_approver_id", "BIGINT NULL"),
    ("manager_remarks", "VARCHAR(255) NULL"),
    ("manager_action_at", "TIMESTAMP NULL"),
    ("hr_approver_id", "BIGINT NULL"),
    ("hr_remarks", "VARCHAR(255) NULL"),
    ("hr_action_at", "TIMESTAMP NULL"),
    ("emergency_contact", "VARCHAR(64) NULL"),
    ("is_paid", "BOOLEAN NOT NULL DEFAULT TRUE")
]

async def migrate_and_seed():
    async with AsyncSessionLocal() as session:
        print("1. Creating Leave & Overtime Tables...")
        for ddl in DDL_STATEMENTS:
            await session.execute(text(ddl))
        await session.commit()
        print("-> Tables created successfully.")

        print("2. Checking/Altering hr_leave_applications columns...")
        res = await session.execute(text("SHOW COLUMNS FROM hr_leave_applications"))
        existing_cols = {row[0] for row in res.fetchall()}

        for col_name, col_def in ALTER_LEAVE_APPLICATIONS:
            if col_name not in existing_cols:
                alter_sql = f"ALTER TABLE hr_leave_applications ADD COLUMN {col_name} {col_def};"
                print(f"Adding column: {col_name}")
                await session.execute(text(alter_sql))
        await session.commit()
        print("-> hr_leave_applications columns verified.")

        print("3. Seeding Leave Types & Policies...")
        # Check existing leave types
        res = await session.execute(text("SELECT id, leave_type_code FROM hr_leave_types WHERE organization_id = 1"))
        existing_types = {row[1]: row[0] for row in res.fetchall()}

        leave_type_data = [
            ("ANNUAL", "Annual / Earned Leave", "অর্জিত ছুটি", True, "#059669", "Bangladesh Labour Act 2006 statutory earned leave (1 day per 18 days worked)", 18.00, 10.00, 12, True, 10.00, 365, "ALL"),
            ("CASUAL", "Casual Leave", "নৈমিত্তিক ছুটি", True, "#2563eb", "Urgent personal affairs and unforeseen circumstances (10 days/year)", 10.00, 0.00, 0, False, 0.00, 30, "ALL"),
            ("SICK", "Medical / Sick Leave", "চিকিৎসা ছুটি", True, "#d97706", "Medical illness supported by registered practitioner certificate (14 days/year)", 14.00, 0.00, 0, False, 0.00, 0, "ALL"),
            ("MATERNITY", "Maternity Leave", "মাতৃত্বকালীন ছুটি", True, "#ec4899", "Maternity benefit for female employees under Labour Act (16 weeks / 112 days)", 112.00, 0.00, 0, False, 0.00, 180, "FEMALE"),
            ("PATERNITY", "Paternity Leave", "পিতৃত্বকালীন ছুটি", True, "#6366f1", "Company policy for male employees upon child birth (5 days)", 5.00, 0.00, 0, False, 0.00, 180, "MALE"),
            ("COMPENSATORY", "Compensatory Off", "ক্ষতিপূরণমূলক ছুটি", True, "#8b5cf6", "Leave granted in lieu of working on designated weekly holiday or project milestone", 10.00, 5.00, 3, False, 0.00, 0, "ALL"),
            ("UNPAID", "Loss of Pay (LWP)", "অবৈতনিক ছুটি", False, "#64748b", "Approved absence without pay subject to management sanction", 30.00, 0.00, 0, False, 0.00, 0, "ALL")
        ]

        type_ids = {}
        for code, name_en, name_bn, is_paid, color, desc, entitlement, carry_fwd, expiry_mo, encash, encash_max, min_days, gender in leave_type_data:
            if code not in existing_types:
                await session.execute(text("""
                    INSERT INTO hr_leave_types (organization_id, leave_type_code, name_en, name_bn, is_paid, color_code, description, is_active)
                    VALUES (1, :code, :name_en, :name_bn, :is_paid, :color, :desc, TRUE)
                """), {"code": code, "name_en": name_en, "name_bn": name_bn, "is_paid": is_paid, "color": color, "desc": desc})
                await session.commit()
                
                # Fetch inserted id
                res = await session.execute(text("SELECT id FROM hr_leave_types WHERE organization_id = 1 AND leave_type_code = :code"), {"code": code})
                lt_id = res.scalar_one()
                type_ids[code] = lt_id

                # Create policy
                await session.execute(text("""
                    INSERT INTO hr_leave_policies (
                        organization_id, leave_type_id, policy_name, annual_entitlement_days,
                        accrual_frequency, max_carry_forward_days, carry_forward_expiry_months,
                        encashment_allowed, max_encashment_days, min_service_days_required,
                        gender_applicability, is_active
                    ) VALUES (
                        1, :lt_id, :p_name, :entitlement, 'YEARLY', :carry_fwd, :expiry_mo,
                        :encash, :encash_max, :min_days, :gender, TRUE
                    )
                """), {
                    "lt_id": lt_id,
                    "p_name": f"{name_en} Standard Policy 2026",
                    "entitlement": entitlement,
                    "carry_fwd": carry_fwd,
                    "expiry_mo": expiry_mo,
                    "encash": encash,
                    "encash_max": encash_max,
                    "min_days": min_days,
                    "gender": gender
                })
                await session.commit()
            else:
                type_ids[code] = existing_types[code]

        print("-> Leave Types and Policies ready.")

        print("4. Seeding Opening Leave Balances for all active employees (Year 2026)...")
        emp_res = await session.execute(text("SELECT id, gender FROM hr_employees WHERE organization_id = 1"))
        employees = emp_res.fetchall()

        for emp in employees:
            emp_id = emp[0]
            emp_gender = (emp[1] or "MALE").upper()

            for code, lt_id in type_ids.items():
                if code == "MATERNITY" and emp_gender != "FEMALE":
                    continue
                if code == "PATERNITY" and emp_gender != "MALE":
                    continue
                if code == "UNPAID":
                    continue

                # Check if balance exists
                bal_chk = await session.execute(text("""
                    SELECT id FROM hr_leave_balances 
                    WHERE organization_id = 1 AND employee_id = :emp_id AND leave_type_id = :lt_id AND year = 2026
                """), {"emp_id": emp_id, "lt_id": lt_id})
                
                if not bal_chk.scalar_one_or_none():
                    entitlement = 18.00 if code == "ANNUAL" else (10.00 if code == "CASUAL" else 14.00)
                    carried = 4.00 if code == "ANNUAL" else 0.00
                    opening = entitlement
                    avail = opening + carried
                    
                    await session.execute(text("""
                        INSERT INTO hr_leave_balances (
                            organization_id, employee_id, leave_type_id, year,
                            opening_balance, carried_forward, accrued_days, used_days, pending_days, available_days
                        ) VALUES (
                            1, :emp_id, :lt_id, 2026, :opening, :carried, :opening, 0.00, 0.00, :avail
                        )
                    """), {
                        "emp_id": emp_id,
                        "lt_id": lt_id,
                        "opening": opening,
                        "carried": carried,
                        "avail": avail
                    })
        await session.commit()
        print("-> Opening Leave Balances seeded for 2026.")

        print("5. Seeding Sample Overtime Requests & Payroll Inputs...")
        # Check overtime requests
        ot_res = await session.execute(text("SELECT count(*) FROM hr_overtime_requests WHERE organization_id = 1"))
        ot_count = ot_res.scalar_one()

        if ot_count == 0 and len(employees) > 0:
            emp1 = employees[0][0]
            today = date.today()
            yesterday = today - timedelta(days=1)

            # Sample verified and approved overtime
            await session.execute(text("""
                INSERT INTO hr_overtime_requests (
                    organization_id, employee_id, ot_date, ot_type, start_time, end_time,
                    requested_hours, task_description, verified_hours, verifier_remarks, verified_at,
                    approved_hours, approver_remarks, approved_at, rate_multiplier, calculated_amount,
                    status
                ) VALUES (
                    1, :emp_id, :ot_date, 'NORMAL_OT', '18:00:00', '21:00:00',
                    3.00, 'Urgent structural concrete pouring supervision at Block A',
                    3.00, 'Punches verified from biometric gate terminal', NOW(),
                    3.00, 'Approved for payroll processing', NOW(), 1.50, 1350.00,
                    'APPROVED'
                )
            """), {"emp_id": emp1, "ot_date": yesterday})

            # Sample submitted overtime pending verification
            if len(employees) > 1:
                emp2 = employees[1][0]
                await session.execute(text("""
                    INSERT INTO hr_overtime_requests (
                        organization_id, employee_id, ot_date, ot_type, start_time, end_time,
                        requested_hours, task_description, rate_multiplier, calculated_amount,
                        status
                    ) VALUES (
                        1, :emp_id, :ot_date, 'WEEKEND_OT', '10:00:00', '15:00:00',
                        5.00, 'Emergency generator maintenance and electrical load testing', 2.00, 2500.00,
                        'SUBMITTED'
                    )
                """), {"emp_id": emp2, "ot_date": today})

            # Seed Payroll Input record
            await session.execute(text("""
                INSERT INTO hr_payroll_inputs (
                    organization_id, employee_id, month, year, approved_overtime_hours,
                    overtime_amount, unpaid_leave_days, deduction_amount, source_reference, is_locked
                ) VALUES (
                    1, :emp_id, :month, :year, 3.00, 1350.00, 0.00, 0.00, 'OCT_2026_APPROVED_OT', FALSE
                )
            """), {"emp_id": emp1, "month": today.month, "year": today.year})

            await session.commit()
            print("-> Sample Overtime and Payroll Inputs seeded.")

        print("6. Seeding Dynamic Lookups for Leave & Overtime...")
        lookup_cats = [
            ("HR_LEAVE_STATUS", "HRMS Leave Application Status", [
                ("PENDING_MANAGER", "Pending Manager Recommendation", "ম্যানেজার সুপারিশের অপেক্ষায়"),
                ("PENDING_HR", "Pending HR Approval", "এইচআর অনুমোদনের অপেক্ষায়"),
                ("APPROVED", "Approved", "অনুমোদিত"),
                ("REJECTED", "Rejected", "বাতিল"),
                ("CANCELLED", "Cancelled", "প্রত্যাহারকৃত")
            ]),
            ("HR_OVERTIME_TYPE", "HRMS Overtime Category Type", [
                ("NORMAL_OT", "Standard Workday Overtime (1.5x)", "কর্মদিবসের ওভারটাইম (১.৫ গুণ)"),
                ("WEEKEND_OT", "Weekend Overtime (2.0x)", "সাপ্তাহিক ছুটির ওভারটাইম (২.০ গুণ)"),
                ("HOLIDAY_OT", "Public Holiday Overtime (2.0x)", "সরকারি ছুটির ওভারটাইম (২.০ গুণ)")
            ]),
            ("HR_OVERTIME_STATUS", "HRMS Overtime Request Status", [
                ("SUBMITTED", "Submitted", "দাখিলকৃত"),
                ("VERIFIED", "Verified by Supervisor", "সুপারভাইজার দ্বারা যাচাইকৃত"),
                ("APPROVED", "Approved by Project Manager", "প্রকল্প ব্যবস্থাপক দ্বারা অনুমোদিত"),
                ("REJECTED", "Rejected", "প্রত্যাখ্যাত"),
                ("PAID_IN_PAYROLL", "Integrated into Payroll", "বেতনে অন্তর্ভুক্ত")
            ]),
            ("HR_LEAVE_ACCRUAL_FREQUENCY", "Leave Accrual Frequency", [
                ("YEARLY", "Annual Upfront Credit", "বার্ষিক অগ্রিম জমা"),
                ("MONTHLY", "Monthly Accrual (1.5 days/mo)", "মাসিক জমা"),
                ("PRO_RATA", "Pro-Rata Service Basis", "আনুপাতিক জমা")
            ])
        ]

        for cat_code, cat_name, items in lookup_cats:
            # Check category
            cat_res = await session.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"), {"code": cat_code})
            cat_row = cat_res.fetchone()
            if not cat_row:
                await session.execute(text("""
                    INSERT INTO sys_lookup_categories (category_code, category_name, description, is_hierarchical, is_system_locked, is_active)
                    VALUES (:code, :name, :name, FALSE, FALSE, TRUE)
                """), {"code": cat_code, "name": cat_name})
                await session.commit()
                cat_res = await session.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"), {"code": cat_code})
                cat_id = cat_res.scalar_one()
            else:
                cat_id = cat_row[0]

            for item_code, name_en, name_bn in items:
                item_chk = await session.execute(text("""
                    SELECT id FROM sys_lookup_items WHERE category_id = :cat_id AND item_code = :code
                """), {"cat_id": cat_id, "code": item_code})
                if not item_chk.fetchone():
                    await session.execute(text("""
                        INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_default, is_active)
                        VALUES (:cat_id, :code, :name_en, :name_bn, 1, FALSE, TRUE)
                    """), {"cat_id": cat_id, "code": item_code, "name_en": name_en, "name_bn": name_bn})
        await session.commit()
        print("-> Dynamic Lookups for Leave & Overtime seeded successfully.")

    print("\n========================================================")
    print("MIGRATION & SEEDING FOR SECTIONS 2.11 - 2.20 COMPLETED!")
    print("========================================================")

if __name__ == "__main__":
    asyncio.run(migrate_and_seed())
