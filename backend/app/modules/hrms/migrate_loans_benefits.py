import asyncio
import os
import sys
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from app.core.database import AsyncSessionLocal

LOOKUP_SEEDS = [
    ("HR_LOAN_TYPE", "Employee Loan Types", [
        ("WELFARE_LOAN", "Staff Welfare Loan", "কল্যাণমূলক ঋণ", "#10B981"),
        ("MOTORCYCLE_LOAN", "Motorcycle / Conveyance Loan", "মোটরসাইকেল ঋণ", "#3B82F6"),
        ("HOUSING_LOAN", "Staff Housing & Construction Loan", "গৃহনির্মাণ ঋণ", "#6366F1"),
        ("EMERGENCY_MEDICAL_LOAN", "Emergency Medical Loan", "জরুরি চিকিৎসা ঋণ", "#EF4444"),
        ("EDUCATION_LOAN", "Higher Education / Certification Loan", "উচ্চশিক্ষা ঋণ", "#F59E0B")
    ]),
    ("HR_BENEFIT_POLICY_TYPE", "Corporate Benefits Policy Types", [
        ("PROVIDENT_FUND", "Recognized Contributory Provident Fund (CPF)", "ভবিষ্য তহবিল (পিএফ)", "#10B981"),
        ("GRATUITY", "Statutory Gratuity Benefit Fund", "আনুতোষিক (গ্র্যাচুইটি)", "#3B82F6"),
        ("HEALTH_INSURANCE", "Corporate Health & Hospitalization Cover", "স্বাস্থ্য বীমা সুবিধা", "#06B6D4"),
        ("GROUP_LIFE", "Group Term Life Insurance", "গ্রুপ জীবন বীমা", "#8B5CF6"),
        ("FESTIVAL_BONUS", "Statutory Eid / Festival Bonus Policy", "উৎসব বোনাস নীতিমালা", "#F59E0B")
    ]),
    ("HR_LOAN_STATUS", "Loan & Advance Statuses", [
        ("PENDING", "Pending Approval", "অনুমোদনের অপেক্ষায়", "#F59E0B"),
        ("APPROVED", "Approved for Disbursal", "অনুমোদিত", "#10B981"),
        ("ACTIVE", "Disbursed / Active Repayment", "সক্রিয় পরিশোধাধীন", "#3B82F6"),
        ("PAID_OFF", "Fully Settled & Closed", "সম্পূর্ণ পরিশোধিত", "#059669"),
        ("REJECTED", "Application Rejected", "প্রত্যাখ্যাত", "#EF4444")
    ]),
    ("HR_PAYMENT_METHOD", "Disbursement Payment Methods", [
        ("BANK_TRANSFER", "BEFTN / NPSB Direct Bank Transfer", "ব্যাংক ট্রান্সফার", "#3B82F6"),
        ("CHEQUE", "Account Payee Cheque", "একাউন্ট পেয়ি চেক", "#10B981"),
        ("MFS_BKASH", "bKash Corporate Payroll Disbursal", "বিকাশ পেরোল", "#EC4899"),
        ("MFS_NAGAD", "Nagad Corporate Disbursal", "নগদ পেরোল", "#F97316"),
        ("CASH", "Corporate Site Cash Voucher", "নগদ অর্থ", "#64748B")
    ])
]


async def migrate():
    async with AsyncSessionLocal() as session:
        print("[MIGRATE] Seeding Loans & Benefits Lookups...")
        for cat_code, cat_name, items in LOOKUP_SEEDS:
            res = await session.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"),
                {"code": cat_code}
            )
            cat_row = res.fetchone()
            if not cat_row:
                await session.execute(
                    text("""
                        INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active, created_at, updated_at)
                        VALUES (:code, :name, :name, 1, NOW(), NOW())
                    """),
                    {"code": cat_code, "name": cat_name}
                )
                await session.commit()
                res = await session.execute(
                    text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"),
                    {"code": cat_code}
                )
                cat_row = res.fetchone()
            
            cat_id = cat_row[0]
            for order_idx, (val, lbl_en, lbl_bn, color) in enumerate(items, 1):
                exist_item = await session.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cat_id AND item_code = :val"),
                    {"cat_id": cat_id, "val": val}
                )
                if not exist_item.fetchone():
                    await session.execute(
                        text("""
                            INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_active, created_at, updated_at)
                            VALUES (:cat_id, :val, :en, :bn, :color, :ord, 1, NOW(), NOW())
                        """),
                        {"cat_id": cat_id, "val": val, "en": lbl_en, "bn": lbl_bn, "color": color, "ord": order_idx}
                    )
            await session.commit()
            print(f"[LOOKUP] Seeded {cat_code}")

        # Check and seed sample Benefit Policies if empty
        bp_cnt = await session.execute(text("SELECT COUNT(id) FROM hr_benefit_policies"))
        if (bp_cnt.scalar() or 0) == 0:
            print("[MIGRATE] Seeding sample Benefit Policies...")
            sample_policies = [
                ("POL-CPF-001", "PROVIDENT_FUND", "Apex Recognized Contributory Provident Fund 2026", 6, 8.33, 8.33, 3.0, "BASIC_SALARY", 1.0, 1, 1, "Mandatory 8.33% employee & employer contribution under BD Labour Act"),
                ("POL-GRAT-001", "GRATUITY", "Apex Corporate Employee Gratuity Scheme", 60, 0.00, 0.00, 5.0, "BASIC_SALARY", 1.0, 1, 1, "30 days basic salary for each completed year of service beyond 5 years"),
                ("POL-HLTH-001", "HEALTH_INSURANCE", "Executive Hospitalization & Critical Illness Cover", 3, 0.00, 0.00, 0.0, "GROSS_SALARY", 1.0, 0, 1, "Annual ৳ 350,000 in-patient hospitalization limit for employee and spouse"),
                ("POL-LIFE-001", "GROUP_LIFE", "Apex Group Term Life Insurance Coverage", 1, 0.00, 0.00, 0.0, "GROSS_SALARY", 24.0, 1, 1, "24 months gross salary death/permanent disability benefit under Delta Life")
            ]
            for p_code, p_type, p_name, elig, emp_pct, empr_pct, vest, basis, mult, stat, act, desc in sample_policies:
                await session.execute(
                    text("""
                        INSERT INTO hr_benefit_policies (organization_id, policy_code, policy_type, policy_name, eligibility_months, employee_contribution_pct, employer_contribution_pct, vesting_years, calculation_basis, multiplier_per_year, is_statutory, is_active, description, created_at, updated_at)
                        VALUES (1, :p_code, :p_type, :p_name, :elig, :emp_pct, :empr_pct, :vest, :basis, :mult, :stat, :act, :desc, NOW(), NOW())
                    """),
                    {
                        "p_code": p_code, "p_type": p_type, "p_name": p_name, "elig": elig,
                        "emp_pct": emp_pct, "empr_pct": empr_pct, "vest": vest, "basis": basis,
                        "mult": mult, "stat": stat, "act": act, "desc": desc
                    }
                )
            await session.commit()
            print("[MIGRATE] Seeded 4 benefit policies.")

        # Check and seed sample Staff Loans if empty
        sl_cnt = await session.execute(text("SELECT COUNT(id) FROM hr_staff_loans"))
        if (sl_cnt.scalar() or 0) < 4:
            print("[MIGRATE] Seeding sample Staff Loans...")
            emp_res = await session.execute(text("SELECT id FROM hr_employees LIMIT 5"))
            emp_ids = [r[0] for r in emp_res.fetchall()]
            e1 = emp_ids[0] if emp_ids else 21
            e2 = emp_ids[1] if len(emp_ids) > 1 else 22
            e3 = emp_ids[2] if len(emp_ids) > 2 else 23

            sample_loans = [
                (1, e1, "LN-2026-012", "MOTORCYCLE_LOAN", 120000.00, 0.00, 12, 10000.00, 120000.00, 60000.00, 60000.00, "2026-04-01", "2026-05", "ACTIVE"),
                (1, e2, "LN-2026-015", "WELFARE_LOAN", 250000.00, 5.00, 24, 11458.33, 250000.00, 50000.00, 200000.00, "2026-06-01", "2026-07", "ACTIVE"),
                (1, e3, "LN-2026-019", "HOUSING_LOAN", 500000.00, 6.00, 36, 15277.78, 500000.00, 0.00, 500000.00, "2026-10-01", "2026-11", "PENDING")
            ]
            for org, emp, code, l_type, princ, rate, tenure, inst, disb, rec, rem, disb_dt, rec_per, st in sample_loans:
                await session.execute(
                    text("""
                        INSERT INTO hr_staff_loans (organization_id, employee_id, loan_code, loan_type, principal_amount, interest_rate, tenure_months, monthly_installment, disbursed_amount, recovered_amount, remaining_balance, disbursement_date, start_recovery_period, status, created_at, updated_at)
                        VALUES (:org, :emp, :code, :l_type, :princ, :rate, :tenure, :inst, :disb, :rec, :rem, :disb_dt, :rec_per, :st, NOW(), NOW())
                    """),
                    {
                        "org": org, "emp": emp, "code": code, "l_type": l_type, "princ": princ,
                        "rate": rate, "tenure": tenure, "inst": inst, "disb": disb, "rec": rec,
                        "rem": rem, "disb_dt": disb_dt, "rec_per": rec_per, "st": st
                    }
                )
            await session.commit()
            print("[MIGRATE] Seeded sample staff loans.")

        # Check and seed sample Salary Advances if empty
        sa_cnt = await session.execute(text("SELECT COUNT(id) FROM hr_salary_advances"))
        if (sa_cnt.scalar() or 0) < 3:
            print("[MIGRATE] Seeding sample Salary Advances...")
            emp_res = await session.execute(text("SELECT id FROM hr_employees LIMIT 5"))
            emp_ids = [r[0] for r in emp_res.fetchall()]
            e1 = emp_ids[0] if emp_ids else 21
            e2 = emp_ids[1] if len(emp_ids) > 1 else 22

            sample_adv = [
                (1, e1, 35000.00, "2026-10-10", "2026-10", 0.00, "APPROVED", "Durga Puja & Eid Festival Advance against Oct payroll"),
                (1, e2, 25000.00, "2026-10-14", "2026-10", 0.00, "PENDING", "Emergency family medical checkup advance")
            ]
            for org, emp, amt, req_dt, rec_per, rec_amt, st, reason in sample_adv:
                await session.execute(
                    text("""
                        INSERT INTO hr_salary_advances (organization_id, employee_id, advance_amount, requested_date, recovery_period, recovered_amount, status, reason, created_at, updated_at)
                        VALUES (:org, :emp, :amt, :req_dt, :rec_per, :rec_amt, :st, :reason, NOW(), NOW())
                    """),
                    {
                        "org": org, "emp": emp, "amt": amt, "req_dt": req_dt,
                        "rec_per": rec_per, "rec_amt": rec_amt, "st": st, "reason": reason
                    }
                )
            await session.commit()
            print("[MIGRATE] Seeded sample salary advances.")

    print("[MIGRATE] Completed Loans & Benefits migration successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
