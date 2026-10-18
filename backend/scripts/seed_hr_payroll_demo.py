"""
Enterprise Demo Data Seeder for HRMS & Payroll
Inserts:
- 100 Employees with authentic Bangladeshi profiles, banking details, NID, TIN, and full compensation packages
- Shifts and Shift Assignments (General, Site Morning, Site Evening, Site Night)
- 30-day realistic Attendance logs (~2,500 punches) with biometrics, mobile GPS geofencing, overtime, and late flags
- Leave types, leave balances for all 100 employees, and sample leave applications
- Salary structures, component assignments, and salary revision history
- 3 Payroll periods (August, September, October 2026) with ~200+ detailed payslips, PF & Tax TDS deductions
- Staff loans, salary advances, and bonus incentives
"""

import sys
import os
import random
from datetime import date, datetime, timedelta, time
from decimal import Decimal

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


BANGLADESHI_FIRST_NAMES_MALE = [
    "Kazi", "Mohammad", "Md.", "Syed", "Tanvir", "Shamsul", "Kamal", "Tariqul", "Mahmud", "Farhan",
    "Ashraful", "Naimur", "Saifuddin", "Maksud", "Zubair", "Rezaul", "Habibur", "Anwar", "Mizanur", "Jahangir",
    "Sultan", "Nasir", "Golam", "Shahadat", "Delwar", "Arifur", "Mamun", "Sazzad", "Towhidul", "Imran",
    "Sohail", "Rabiul", "Monirul", "Sharif", "Enamul", "Faisal", "Wahid", "Mustafizur", "Al-Amin", "Rashed"
]

BANGLADESHI_FIRST_NAMES_FEMALE = [
    "Nusrat", "Farhana", "Tasnim", "Sharmin", "Sabrina", "Rumana", "Nafisa", "Afroza", "Jannatul", "Samira",
    "Mehnaz", "Sadia", "Tahmina", "Mahmuda", "Razia", "Shirin", "Sultana", "Faria", "Lubna", "Nasrin"
]

BANGLADESHI_LAST_NAMES = [
    "Rahman", "Islam", "Hossain", "Ahmed", "Hasan", "Chowdhury", "Khan", "Alam", "Karim", "Uddin",
    "Sarker", "Bhuiyan", "Sikder", "Miah", "Khandakar", "Mazumder", "Tarafdar", "Talukder", "Munshi", "Dewan",
    "Mallick", "Gazi", "Pramanik", "Hawlader", "Patwary", "Akter", "Begum", "Ferdous", "Arefin", "Kibria"
]

BANKS = [
    ("Dutch-Bangla Bank Ltd", "Gulshan Branch", "090271829"),
    ("BRAC Bank Ltd", "Banani Branch", "060261938"),
    ("The City Bank Ltd", "Principal Branch, Motijheel", "225271890"),
    ("Eastern Bank Ltd", "Dhanmondi Branch", "095261728"),
    ("Standard Chartered Bank", "Gulshan-2 North Branch", "215261899"),
    ("Islami Bank Bangladesh Ltd", "Kawran Bazar Branch", "125271982"),
    ("Mutual Trust Bank Ltd", "Panthapath Branch", "145261928"),
    ("Dhaka Bank Ltd", "Uttara Branch", "085271923"),
    ("Prime Bank Ltd", "Mohakhali Branch", "175271890")
]

DEPARTMENTS_CONFIG = [
    ("MGMT", "Executive Management", "নির্বাহী ব্যবস্থাপনা"),
    ("CIVIL", "Civil & Structural Engineering", "সিভিল ও স্ট্রাকচারাল ইঞ্জিনিয়ারিং"),
    ("ARCH", "Architecture & Planning", "স্থাপত্য ও নগর পরিকল্পনা"),
    ("SALES", "Sales, CRM & Marketing", "বিক্রয়, সিআরএম ও বিপণন"),
    ("FIN", "Finance, Accounts & Audit", "অর্থ, হিসাব ও নিরীক্ষা"),
    ("LEGAL", "Land Bank & Legal Affairs", "ভূমি ব্যাংক ও আইন বিষয়ক"),
    ("SITE", "Site Operations & Safety", "সাইট পরিচালনা ও নিরাপত্তা"),
    ("SCM", "Procurement & Supply Chain", "সংগ্রহ ও সাপ্লাই চেইন"),
    ("IT", "IT, ERP & Infrastructure", "আইটি, ইআরপি ও প্রযুক্তি"),
    ("HR", "Human Resources & Admin", "মানবসম্পদ ও প্রশাসন")
]

DESIGNATIONS_CONFIG = [
    # code, title_en, title_bn, dept_code, grade, base_salary
    ("MD", "Managing Director & CEO", "ব্যবস্থাপনা পরিচালক", "MGMT", "GRADE_1", 450000),
    ("COO", "Chief Operating Officer", "প্রধান পরিচালনা কর্মকর্তা", "MGMT", "GRADE_1", 350000),
    ("CFO", "Chief Financial Officer, FCA", "প্রধান অর্থ কর্মকর্তা", "FIN", "GRADE_1", 300000),
    ("PD", "Project Director (Civil)", "প্রকল্প পরিচালক", "CIVIL", "GRADE_2", 220000),
    ("HEAD_SALES", "Head of Sales & CRM", "বিক্রয় প্রধান", "SALES", "GRADE_2", 200000),
    ("HEAD_LEGAL", "Chief Legal Advisor & Advocate", "আইনি উপদেষ্টা", "LEGAL", "GRADE_2", 190000),
    ("HEAD_HR", "Head of Human Resources", "মানবসম্পদ প্রধান", "HR", "GRADE_2", 180000),
    ("CHIEF_ARCH", "Chief Architect & Urban Planner", "প্রধান স্থপতি", "ARCH", "GRADE_2", 200000),
    ("SR_PM", "Senior Project Manager", "সিনিয়র প্রজেক্ট ম্যানেজার", "CIVIL", "GRADE_3", 150000),
    ("SR_ARCH", "Senior Structural Architect", "সিনিয়র স্থপতি", "ARCH", "GRADE_3", 130000),
    ("SR_ACCT", "Senior Manager Accounts & Tax", "সিনিয়র হিসাব ব্যবস্থাপক", "FIN", "GRADE_3", 120000),
    ("SCM_MGR", "Procurement Manager", "সংগ্রহ ব্যবস্থাপক", "SCM", "GRADE_3", 115000),
    ("IT_MGR", "Senior ERP & DevOps Engineer", "সিনিয়র ইআরপি প্রকৌশলী", "IT", "GRADE_3", 125000),
    ("SITE_ENG", "Site Civil Engineer", "সাইট সিভিল প্রকৌশলী", "SITE", "GRADE_4", 75000),
    ("QA_ENG", "Quality & Safety Engineer", "মান নিয়ন্ত্রণ প্রকৌশলী", "SITE", "GRADE_4", 70000),
    ("SALES_MGR", "Senior Sales Manager", "সিনিয়র বিক্রয় ব্যবস্থাপক", "SALES", "GRADE_4", 80000),
    ("LEGAL_OFF", "Land Documentation Officer", "ভূমি কর্মকর্তা", "LEGAL", "GRADE_4", 65000),
    ("HR_OFF", "Senior HR Generalist", "সিনিয়র এইচআর কর্মকর্তা", "HR", "GRADE_4", 60000),
    ("ACCT_OFF", "Project Cost Accountant", "কস্ট একাউন্ট্যান্ট", "FIN", "GRADE_4", 55000),
    ("SALES_EXEC", "Sales Relationship Executive", "বিক্রয় নির্বাহী", "SALES", "GRADE_5", 42000),
    ("SITE_SUPV", "Site Construction Supervisor", "সাইট সুপারভাইজার", "SITE", "GRADE_5", 38000),
    ("LAND_SURV", "Senior Land Surveyor", "প্রধান সার্ভেয়ার", "LEGAL", "GRADE_5", 40000),
    ("SCM_EXEC", "Procurement Officer", "সংগ্রহ কর্মকর্তা", "SCM", "GRADE_5", 38000),
    ("IT_EXEC", "IT Support Specialist", "আইটি সাপোর্ট বিশেষজ্ঞ", "IT", "GRADE_5", 35000),
    ("HR_EXEC", "HR & Payroll Coordinator", "এইচআর সমন্বয়কারী", "HR", "GRADE_5", 36000),
    ("FOREMAN", "Structural Site Foreman", "সাইট ফোরম্যান", "SITE", "GRADE_6", 30000),
    ("FRONT_DESK", "Executive Front Desk Officer", "ফ্রন্ট ডেস্ক কর্মকর্তা", "HR", "GRADE_6", 28000)
]


async def seed_hrms_payroll_demo():
    print("=======================================================================")
    print("[HRMS] SEEDING 100 EMPLOYEES, SHIFTS, ATTENDANCE & PAYROLL DEMO DATA")
    print("=======================================================================")

    async with AsyncSessionLocal() as session:
        # 1. Organization & Project references
        org_res = await session.execute(text("SELECT id FROM sys_organizations LIMIT 1"))
        org_id = org_res.scalar() or 1

        company_res = await session.execute(text("SELECT id FROM hr_companies LIMIT 1"))
        company_id = company_res.scalar() or 1

        branch_res = await session.execute(text("SELECT id FROM hr_branches LIMIT 1"))
        branch_id = branch_res.scalar() or 1

        projects_res = await session.execute(text("SELECT id FROM prj_projects LIMIT 5"))
        project_rows = projects_res.fetchall()
        project_ids = [p[0] for p in project_rows] if project_rows else [1]

        # -------------------------------------------------------------
        # 2. Departments
        # -------------------------------------------------------------
        print("\n[INFO] Checking & Seeding Departments...")
        dept_ids = {}
        for code, en, bn in DEPARTMENTS_CONFIG:
            res = await session.execute(text("SELECT id FROM hr_departments WHERE department_code = :c"), {"c": code})
            row = res.fetchone()
            if row:
                dept_ids[code] = row[0]
            else:
                ins = await session.execute(
                    text("""
                        INSERT INTO hr_departments (organization_id, department_code, name_en, name_bn, is_active, created_at)
                        VALUES (:org, :code, :en, :bn, 1, NOW())
                    """),
                    {"org": org_id, "code": code, "en": en, "bn": bn}
                )
                dept_ids[code] = ins.lastrowid
        print(f"   [OK] {len(dept_ids)} Departments ready.")

        # -------------------------------------------------------------
        # 3. Designations
        # -------------------------------------------------------------
        print("\n[INFO] Checking & Seeding Designations...")
        desig_ids = {}
        for dcode, title_en, title_bn, dept_code, grade, salary in DESIGNATIONS_CONFIG:
            res = await session.execute(text("SELECT id FROM hr_designations WHERE designation_code = :c"), {"c": dcode})
            row = res.fetchone()
            if row:
                desig_ids[dcode] = row[0]
            else:
                ins = await session.execute(
                    text("""
                        INSERT INTO hr_designations (organization_id, department_id, designation_code, title_en, title_bn, grade_level, min_salary, max_salary, is_active, created_at)
                        VALUES (:org, :dept, :code, :en, :bn, :grade, :min_s, :max_s, 1, NOW())
                    """),
                    {
                        "org": org_id, "dept": dept_ids.get(dept_code, 1), "code": dcode,
                        "en": title_en, "bn": title_bn, "grade": grade,
                        "min_s": salary * 0.75, "max_s": salary * 1.4
                    }
                )
                desig_ids[dcode] = ins.lastrowid
        print(f"   [OK] {len(desig_ids)} Designations ready.")

        # -------------------------------------------------------------
        # 4. Shifts
        # -------------------------------------------------------------
        print("\n[INFO] Checking & Seeding Shifts...")
        shifts_config = [
            ("REG_GEN", "Corporate General Shift", "09:00:00", "18:00:00", "13:00:00", "14:00:00", 60, 15, 0),
            ("SITE_MORN", "Site Construction Morning Shift", "07:00:00", "15:30:00", "12:00:00", "13:00:00", 60, 15, 0),
            ("SITE_EVE", "Site Construction Evening Shift", "15:00:00", "23:30:00", "19:00:00", "20:00:00", 60, 15, 0),
            ("SITE_NIGHT", "Night Concreting & Pouring Shift", "23:00:00", "07:30:00", "03:00:00", "04:00:00", 60, 15, 1)
        ]
        shift_ids = {}
        for scode, sname, st, et, bst, bet, bdur, grace, is_night in shifts_config:
            res = await session.execute(text("SELECT id FROM hr_shifts WHERE shift_code = :c AND organization_id = :org"), {"c": scode, "org": org_id})
            row = res.fetchone()
            if row:
                shift_ids[scode] = row[0]
            else:
                ins = await session.execute(
                    text("""
                        INSERT INTO hr_shifts (organization_id, shift_name, shift_code, start_time, end_time, break_start_time, break_end_time, break_duration_minutes, grace_period_minutes, is_night_shift, is_active, created_at)
                        VALUES (:org, :name, :code, :st, :et, :bst, :bet, :bdur, :grace, :is_night, 1, NOW())
                    """),
                    {"org": org_id, "name": sname, "code": scode, "st": st, "et": et, "bst": bst, "bet": bet, "bdur": bdur, "grace": grace, "is_night": is_night}
                )
                shift_ids[scode] = ins.lastrowid
        print(f"   [OK] {len(shift_ids)} Shifts ready.")

        # -------------------------------------------------------------
        # 5. Salary Components & Structures
        # -------------------------------------------------------------
        print("\n[INFO] Checking & Seeding Salary Structures & Components...")
        components = [
            ("BASIC", "Basic Salary", "মূল বেতন", "EARNING", "PERCENTAGE_OF_BASIC", 100, 1, 1),
            ("HRENT", "House Rent Allowance", "বাড়ি ভাড়া ভাতা", "EARNING", "PERCENTAGE_OF_BASIC", 50, 1, 2),
            ("MED", "Medical Allowance", "চিকিৎসা ভাতা", "EARNING", "PERCENTAGE_OF_BASIC", 10, 0, 3),
            ("CONV", "Conveyance Allowance", "যাতায়াত ভাতা", "EARNING", "PERCENTAGE_OF_BASIC", 10, 0, 4),
            ("SITE_HAZ", "Site Hardship & Hazard Allowance", "সাইট হ্যাজার্ড ভাতা", "EARNING", "FIXED_AMOUNT", 5000, 1, 5),
            ("MOBILE", "Mobile & Data Allowance", "মোবাইল ও ডাটা ভাতা", "EARNING", "FIXED_AMOUNT", 2000, 0, 6),
            ("PF_EMP", "Provident Fund (Employee)", "ভবিষ্য তহবিল কর্তন", "DEDUCTION", "PERCENTAGE_OF_BASIC", 8.33, 0, 10),
            ("TAX_TDS", "Income Tax Withholding (TDS)", "আয়কর উৎস কর্তন", "DEDUCTION", "PERCENTAGE_OF_GROSS", 5, 1, 11)
        ]
        comp_ids = {}
        for ccode, name_en, name_bn, ctype, calctype, defval, taxable, sort_o in components:
            res = await session.execute(text("SELECT id FROM hr_salary_components WHERE component_code = :c AND organization_id = :org"), {"c": ccode, "org": org_id})
            row = res.fetchone()
            if row:
                comp_ids[ccode] = row[0]
            else:
                ins = await session.execute(
                    text("""
                        INSERT INTO hr_salary_components (organization_id, component_code, name_en, name_bn, component_type, calculation_type, default_value_or_percent, is_taxable, sort_order, is_active, created_at)
                        VALUES (:org, :code, :en, :bn, :ctype, :calctype, :defval, :taxable, :sort_o, 1, NOW())
                    """),
                    {"org": org_id, "code": ccode, "en": name_en, "bn": name_bn, "ctype": ctype, "calctype": calctype, "defval": defval, "taxable": taxable, "sort_o": sort_o}
                )
                comp_ids[ccode] = ins.lastrowid

        # Salary Structure
        struct_res = await session.execute(text("SELECT id FROM hr_salary_structures WHERE structure_code = 'CORP_STD' AND organization_id = :org"), {"org": org_id})
        struct_row = struct_res.fetchone()
        if struct_row:
            struct_id = struct_row[0]
        else:
            ins = await session.execute(
                text("""
                    INSERT INTO hr_salary_structures (organization_id, structure_code, name_en, description, is_active, created_at)
                    VALUES (:org, 'CORP_STD', 'Bangladesh Standard Corporate Real Estate Package', '50% Basic, 25% H-Rent, 10% Med, 10% Conv + 8.33% PF & Tax TDS', 1, NOW())
                """),
                {"org": org_id}
            )
            struct_id = ins.lastrowid
        print(f"   [OK] Salary Structure ID: {struct_id} ready.")

        # -------------------------------------------------------------
        # 6. Seed 100 Employees
        # -------------------------------------------------------------
        print("\n[INFO] Seeding 100 Employees...")
        existing_emp_res = await session.execute(text("SELECT employee_code, id FROM hr_employees"))
        existing_emps = {r[0]: r[1] for r in existing_emp_res.fetchall()}

        emp_ids = []
        designation_keys = list(desig_ids.keys())

        # Generate target 100 employees
        random.seed(42)  # Deterministic seed for consistency
        for i in range(1, 101):
            emp_code = f"BRE-{1000 + i}"

            if emp_code in existing_emps:
                emp_ids.append(existing_emps[emp_code])
                continue

            # Pick profile
            is_female = (i % 4 == 0)
            if is_female:
                first_name = random.choice(BANGLADESHI_FIRST_NAMES_FEMALE)
                gender = "FEMALE"
            else:
                first_name = random.choice(BANGLADESHI_FIRST_NAMES_MALE)
                gender = "MALE"
            last_name = random.choice(BANGLADESHI_LAST_NAMES)

            # Assign designation & department
            desig_key = designation_keys[(i - 1) % len(designation_keys)]
            desig_info = next(d for d in DESIGNATIONS_CONFIG if d[0] == desig_key)
            dcode = desig_info[3]
            base_sal = desig_info[5]
            # Vary salary slightly +/- 10%
            variation = random.uniform(0.9, 1.1)
            gross_sal = round(base_sal * variation, -2)

            # Package breakdown
            basic_sal = round(gross_sal * 0.52, 2)
            hrent_sal = round(gross_sal * 0.26, 2)
            med_sal = round(gross_sal * 0.11, 2)
            conv_sal = round(gross_sal * 0.11, 2)

            # Category
            is_site = dcode in ["SITE", "CIVIL"]
            hazard_sal = 5000.00 if is_site else 0.00
            mobile_sal = 2000.00 if dcode in ["SALES", "MGMT", "SITE"] else 1000.00
            wf_cat = "SITE_ENGINEERING" if is_site else ("SALES_FIELD" if dcode == "SALES" else "CORPORATE")
            assigned_prj = random.choice(project_ids) if is_site else None

            bank_info = random.choice(BANKS)
            acc_num = f"{random.randint(100, 999)}{random.randint(10000000, 99999999)}"
            nid_num = f"{random.randint(1975, 2000)}{random.randint(10000000000, 99999999999)}"
            tin_num = f"{random.randint(100000000000, 999999999999)}"
            phone = f"+8801{random.choice([3, 4, 5, 6, 7, 8, 9])}{random.randint(10000000, 99999999)}"
            email = f"{first_name.lower().replace('.', '').replace(' ', '')}.{last_name.lower()}@blueoceans-re.com"

            joining_offset = random.randint(180, 1200)
            join_date = date.today() - timedelta(days=joining_offset)
            confirm_date = join_date + timedelta(days=180)
            dob_year = random.randint(1975, 1999)
            dob = date(dob_year, random.randint(1, 12), random.randint(1, 28))

            status = "ACTIVE"
            if i in [95, 96]:
                status = "PROBATION"
                confirm_date = None
            elif i == 97:
                status = "ON_LEAVE"
            elif i == 98:
                status = "NOTICE_PERIOD"

            ins = await session.execute(
                text("""
                    INSERT INTO hr_employees (
                        organization_id, company_id, branch_id, employee_code, first_name, last_name, official_email,
                        phone, gender, date_of_birth, nid_number, tin_number, blood_group, marital_status,
                        joining_date, confirmation_date, probation_months, employment_type, workforce_category, status,
                        department_id, designation_id, assigned_project_id, bank_account_no, bank_name, bank_branch, routing_no,
                        basic_salary, house_rent_allowance, medical_allowance, conveyance_allowance, site_hazard_allowance, mobile_allowance,
                        is_pf_eligible, is_tax_eligible, created_at
                    ) VALUES (
                        :org, :comp, :branch, :code, :fn, :ln, :email,
                        :phone, :gender, :dob, :nid, :tin, :blood, :marital,
                        :join, :confirm, 6, 'PERMANENT', :wf, :status,
                        :dept, :desig, :prjid, :acc, :bank, :bank_branch, :routing,
                        :basic, :hrent, :med, :conv, :hazard, :mobile,
                        1, 1, NOW()
                    )
                """),
                {
                    "org": org_id, "comp": company_id, "branch": branch_id, "code": emp_code, "fn": first_name, "ln": last_name,
                    "email": email, "phone": phone, "gender": gender, "dob": dob, "nid": nid_num, "tin": tin_num,
                    "blood": random.choice(["A+", "B+", "O+", "AB+", "O-", "A-"]), "marital": "MARRIED" if i % 2 == 0 else "SINGLE",
                    "join": join_date, "confirm": confirm_date, "wf": wf_cat, "status": status,
                    "dept": dept_ids.get(dcode, 1), "desig": desig_ids.get(desig_key, 1), "prjid": assigned_prj,
                    "acc": acc_num, "bank": bank_info[0], "bank_branch": bank_info[1], "routing": bank_info[2],
                    "basic": basic_sal, "hrent": hrent_sal, "med": med_sal, "conv": conv_sal, "hazard": hazard_sal, "mobile": mobile_sal
                }
            )
            emp_ids.append(ins.lastrowid)

        await session.commit()
        print(f"   [OK] {len(emp_ids)} Total Employees in system now.")

        # -------------------------------------------------------------
        # 7. Shift Assignments
        # -------------------------------------------------------------
        print("\n[INFO] Seeding Shift Assignments for all 100 Employees...")
        for idx, eid in enumerate(emp_ids):
            # Check existing assignment
            chk = await session.execute(text("SELECT id FROM hr_shift_assignments WHERE employee_id = :eid"), {"eid": eid})
            if not chk.fetchone():
                if idx % 10 in [3, 4, 5]:
                    s_id = shift_ids.get("SITE_MORN", 1)
                elif idx % 10 in [6, 7]:
                    s_id = shift_ids.get("SITE_EVE", 1)
                elif idx % 10 == 8:
                    s_id = shift_ids.get("SITE_NIGHT", 1)
                else:
                    s_id = shift_ids.get("REG_GEN", 1)

                await session.execute(
                    text("""
                        INSERT INTO hr_shift_assignments (organization_id, shift_id, assignment_type, employee_id, effective_from, is_active, created_at)
                        VALUES (:org, :sid, 'EMPLOYEE', :eid, '2026-01-01', 1, NOW())
                    """),
                    {"org": org_id, "sid": s_id, "eid": eid}
                )
        await session.commit()
        print("   [OK] Shift assignments verified.")

        # -------------------------------------------------------------
        # 8. Biometric Attendance (Past 30 Days)
        # -------------------------------------------------------------
        print("\n[INFO] Seeding 30-Day Attendance Logs for all 100 Employees...")
        today = date.today()
        attendance_batch = []
        punch_count = 0

        # Check existing attendance count
        cnt_res = await session.execute(text("SELECT COUNT(*) FROM hr_attendance"))
        existing_att_count = cnt_res.scalar() or 0

        if existing_att_count < 500:
            for day_offset in range(30):
                pdate = today - timedelta(days=day_offset)
                is_friday = (pdate.weekday() == 4) # Friday is weekend in Bangladesh

                for idx, eid in enumerate(emp_ids):
                    if is_friday:
                        status = "WEEKEND"
                        cin = None
                        cout = None
                        late = 0
                        whours = Decimal("0.0")
                        ot = Decimal("0.0")
                    else:
                        rand_val = random.random()
                        if rand_val < 0.05:
                            status = "ON_LEAVE"
                            cin = None
                            cout = None
                            late = 0
                            whours = Decimal("0.0")
                            ot = Decimal("0.0")
                        elif rand_val < 0.08:
                            status = "ABSENT"
                            cin = None
                            cout = None
                            late = 0
                            whours = Decimal("0.0")
                            ot = Decimal("0.0")
                        else:
                            is_late = (rand_val < 0.22)
                            late_mins = random.randint(10, 45) if is_late else 0
                            status = "LATE" if is_late else "PRESENT"

                            in_hour = 9 if not is_late else 9
                            in_min = random.randint(0, 14) if not is_late else late_mins
                            cin = datetime.combine(pdate, time(in_hour, in_min, 0))

                            # Overtime for site engineers
                            has_ot = (idx % 4 == 0)
                            ot_hours = Decimal(str(random.choice([1.0, 1.5, 2.0]))) if has_ot else Decimal("0.0")
                            out_hour = 18 + int(ot_hours)
                            out_min = random.randint(0, 30)
                            cout = datetime.combine(pdate, time(min(out_hour, 23), out_min, 0))

                            whours = Decimal("8.0") + ot_hours
                            ot = ot_hours

                    attendance_batch.append({
                        "org": org_id, "eid": eid, "pdate": pdate, "cin": cin, "cout": cout,
                        "late": late if is_friday else late_mins if status == "LATE" else 0,
                        "early": 0, "status": status, "src": random.choice(["BIOMETRIC_DEVICE", "MOBILE_APP_GEO", "RFID_GATE"]),
                        "whours": whours, "ot": ot, "shift_id": shift_ids.get("REG_GEN", 1)
                    })
                    punch_count += 1

                    if len(attendance_batch) >= 500:
                        await session.execute(
                            text("""
                                INSERT INTO hr_attendance (
                                    organization_id, employee_id, punch_date, clock_in, clock_out,
                                    late_minutes, early_leaving_minutes, status, source, working_hours, overtime_hours, shift_id,
                                    is_missing_punch, is_anomaly, is_geofence_verified, created_at
                                ) VALUES (
                                    :org, :eid, :pdate, :cin, :cout,
                                    :late, :early, :status, :src, :whours, :ot, :shift_id,
                                    0, 0, 1, NOW()
                                )
                            """),
                            attendance_batch
                        )
                        attendance_batch = []

            if attendance_batch:
                await session.execute(
                    text("""
                        INSERT INTO hr_attendance (
                            organization_id, employee_id, punch_date, clock_in, clock_out,
                            late_minutes, early_leaving_minutes, status, source, working_hours, overtime_hours, shift_id,
                            is_missing_punch, is_anomaly, is_geofence_verified, created_at
                        ) VALUES (
                            :org, :eid, :pdate, :cin, :cout,
                            :late, :early, :status, :src, :whours, :ot, :shift_id,
                            0, 0, 1, NOW()
                        )
                    """),
                    attendance_batch
                )
            await session.commit()
            print(f"   [OK] Seeded {punch_count} Attendance records across 30 days.")
        else:
            print(f"   [OK] Attendance already populated ({existing_att_count} records).")

        # -------------------------------------------------------------
        # 9. Leave Types & Allocations
        # -------------------------------------------------------------
        print("\n[INFO] Checking & Seeding Leave Types & Employee Balances...")
        leave_types_cfg = [
            ("CL", "Casual Leave", "নৈমিত্তিক ছুটি", 1, "#3B82F6"),
            ("SL", "Sick Leave", "অসুস্থতাজনিত ছুটি", 1, "#EF4444"),
            ("AL", "Earned / Annual Leave", "অর্জিত ছুটি", 1, "#10B981"),
            ("ML", "Maternity / Paternity Leave", "মাতৃত্বকালীন ছুটি", 1, "#8B5CF6")
        ]
        ltype_ids = {}
        for lcode, lname, lbn, paid, color in leave_types_cfg:
            res = await session.execute(text("SELECT id FROM hr_leave_types WHERE leave_type_code = :c AND organization_id = :org"), {"c": lcode, "org": org_id})
            row = res.fetchone()
            if row:
                ltype_ids[lcode] = row[0]
            else:
                ins = await session.execute(
                    text("""
                        INSERT INTO hr_leave_types (organization_id, leave_type_code, name_en, name_bn, is_paid, color_code, is_active, created_at)
                        VALUES (:org, :c, :n, :bn, :p, :color, 1, NOW())
                    """),
                    {"org": org_id, "c": lcode, "n": lname, "bn": lbn, "p": paid, "color": color}
                )
                ltype_ids[lcode] = ins.lastrowid

        # Allocations for current year
        year = date.today().year
        bal_ins = 0
        for eid in emp_ids:
            for lcode, days in [("CL", 10), ("SL", 14), ("AL", 18)]:
                lt_id = ltype_ids.get(lcode)
                chk = await session.execute(text("SELECT id FROM hr_leave_balances WHERE employee_id = :eid AND leave_type_id = :lt AND year = :yr"), {"eid": eid, "lt": lt_id, "yr": year})
                if not chk.fetchone():
                    used = random.randint(0, 4)
                    avail = days - used
                    await session.execute(
                        text("""
                            INSERT INTO hr_leave_balances (organization_id, employee_id, leave_type_id, year, opening_balance, carried_forward, accrued_days, used_days, available_days, created_at)
                            VALUES (:org, :eid, :lt, :yr, :days, 0, :days, :used, :avail, NOW())
                        """),
                        {"org": org_id, "eid": eid, "lt": lt_id, "yr": year, "days": days, "used": used, "avail": avail}
                    )
                    bal_ins += 1
        await session.commit()
        print(f"   [OK] Leave balances seeded for {len(emp_ids)} employees.")

        # -------------------------------------------------------------
        # 10. Payroll Periods & Payslips
        # -------------------------------------------------------------
        print("\n[INFO] Checking & Seeding Payroll Periods & Payslips...")
        periods = [
            ("2026-08", "Payroll - August 2026", 2026, 8, date(2026, 8, 1), date(2026, 8, 31), "LOCKED", True),
            ("2026-09", "Payroll - September 2026", 2026, 9, date(2026, 9, 1), date(2026, 9, 30), "LOCKED", True),
            ("2026-10", "Payroll - October 2026 (Active)", 2026, 10, date(2026, 10, 1), date(2026, 10, 31), "PROCESSING", False)
        ]

        # Fetch all employee salary details
        emp_records_res = await session.execute(text("SELECT id, basic_salary, house_rent_allowance, medical_allowance, conveyance_allowance, site_hazard_allowance, mobile_allowance, bank_name, bank_account_no FROM hr_employees"))
        emp_salary_map = {r[0]: (r[1], r[2], r[3], r[4], r[5] or Decimal("0.0"), r[6] or Decimal("0.0"), r[7] or "Dutch-Bangla Bank Ltd", r[8] or "1234567890") for r in emp_records_res.fetchall()}

        for pcode, pname, pyr, pmo, sdate, edate, status, is_locked in periods:
            res = await session.execute(text("SELECT id FROM hr_payroll_periods WHERE period_code = :c AND organization_id = :org"), {"c": pcode, "org": org_id})
            row = res.fetchone()
            if row:
                period_id = row[0]
            else:
                total_gross = sum(s[0] + s[1] + s[2] + s[3] + s[4] + s[5] for s in emp_salary_map.values())
                total_pf = sum(s[0] * Decimal("0.0833") for s in emp_salary_map.values())
                total_tax = sum((s[0] + s[1] + s[2] + s[3] + s[4] + s[5]) * Decimal("0.05") for s in emp_salary_map.values())
                total_ded = total_pf + total_tax
                total_net = total_gross - total_ded

                ins = await session.execute(
                    text("""
                        INSERT INTO hr_payroll_periods (
                            organization_id, period_code, period_name, year, month, start_date, end_date, cut_off_date,
                            status, total_employees, total_gross, total_deductions, total_net_payable, total_employer_cost,
                            prepared_by, verified_by, approved_by, is_locked, created_at
                        ) VALUES (
                            :org, :code, :name, :yr, :mo, :sd, :ed, :ed,
                            :status, :emp_cnt, :gross, :ded, :net, :gross,
                            1, 1, 1, :is_lock, NOW()
                        )
                    """),
                    {
                        "org": org_id, "code": pcode, "name": pname, "yr": pyr, "mo": pmo, "sd": sdate, "ed": edate,
                        "status": status, "emp_cnt": len(emp_salary_map), "gross": total_gross, "ded": total_ded,
                        "net": total_net, "is_lock": 1 if is_locked else 0
                    }
                )
                period_id = ins.lastrowid

            # Ensure matching hr_payroll_runs row exists
            prun_res = await session.execute(text("SELECT id FROM hr_payroll_runs WHERE month = :mo AND year = :yr AND organization_id = :org"), {"mo": pmo, "yr": pyr, "org": org_id})
            prun_row = prun_res.fetchone()
            if prun_row:
                payroll_run_id = prun_row[0]
            else:
                ins_prun = await session.execute(
                    text("""
                        INSERT INTO hr_payroll_runs (
                            organization_id, month, year, total_gross, total_deductions, total_net,
                            disbursement_date, status, created_at
                        ) VALUES (
                            :org, :mo, :yr, :gross, :ded, :net,
                            :disb_date, :status, NOW()
                        )
                    """),
                    {
                        "org": org_id, "mo": pmo, "yr": pyr, "gross": total_gross, "ded": total_ded, "net": total_net,
                        "disb_date": edate if is_locked else None, "status": "DISBURSED" if is_locked else "DRAFT"
                    }
                )
                payroll_run_id = ins_prun.lastrowid

            # Seed payslips for this period in hr_payslips and hr_payroll_payslips
            payslips_cnt_res = await session.execute(text("SELECT COUNT(*) FROM hr_payroll_payslips WHERE period_id = :pid"), {"pid": period_id})
            if (payslips_cnt_res.scalar() or 0) == 0:
                print(f"   Creating 100 Payslips for period {pcode}...")
                for eid, (basic, hrent, med, conv, hazard, mobile, bank_name, bank_acc) in emp_salary_map.items():
                    gross = basic + hrent + med + conv + hazard + mobile
                    pf = round(basic * Decimal("0.0833"), 2)
                    tax = round(gross * Decimal("0.05"), 2)
                    tot_ded = pf + tax
                    net = gross - tot_ded

                    # hr_payroll_payslips
                    await session.execute(
                        text("""
                            INSERT INTO hr_payroll_payslips (
                                organization_id, period_id, employee_id, gross_salary, basic_salary,
                                house_rent, medical_allowance, conveyance_allowance, other_allowances,
                                total_earnings, income_tax_deduction, provident_fund_employee, provident_fund_employer,
                                staff_loan_recovery, salary_advance_recovery, other_deductions,
                                total_deductions, net_salary_payable, bank_name, bank_account_no,
                                payment_method, status, is_disbursed, created_at
                            ) VALUES (
                                :org, :pid, :eid, :gross, :basic,
                                :hrent, :med, :conv, :other,
                                :gross, :tax, :pf, :pf,
                                0, 0, 0,
                                :tot_ded, :net, :bname, :bacc,
                                'BANK_TRANSFER', :pstatus, :is_disb, NOW()
                            )
                        """),
                        {
                            "org": org_id, "pid": period_id, "eid": eid, "gross": gross, "basic": basic,
                            "hrent": hrent, "med": med, "conv": conv, "other": hazard + mobile,
                            "pf": pf, "tax": tax, "tot_ded": tot_ded, "net": net,
                            "bname": bank_name, "bacc": bank_acc,
                            "pstatus": "APPROVED" if is_locked else "GENERATED",
                            "is_disb": 1 if is_locked else 0
                        }
                    )

                    # Also seed hr_payslips for backward compatibility
                    await session.execute(
                        text("""
                            INSERT INTO hr_payslips (
                                payroll_run_id, employee_id, basic_salary, house_rent, medical,
                                conveyance, site_hazard_allowance, mobile_allowance,
                                overtime_hours, overtime_amount, sales_commission, festival_bonus,
                                gross_earnings, pf_deduction, tax_tds_deduction, advance_salary_deduction, loan_emi_deduction,
                                total_deductions, net_payable, payment_status, created_at
                            ) VALUES (
                                :rid, :eid, :basic, :hrent, :med,
                                :conv, :hazard, :mobile,
                                0, 0, 0, 0,
                                :gross, :pf, :tax, 0, 0,
                                :tot_ded, :net, :pay_status, NOW()
                            )
                        """),
                        {
                            "rid": payroll_run_id, "eid": eid, "basic": basic, "hrent": hrent, "med": med,
                            "conv": conv, "hazard": hazard, "mobile": mobile, "gross": gross,
                            "pf": pf, "tax": tax, "tot_ded": tot_ded, "net": net,
                            "pay_status": "PAID" if is_locked else "PENDING"
                        }
                    )
        await session.commit()
        print("   [OK] All payroll periods and detailed payslips seeded.")

        # -------------------------------------------------------------
        # 11. Staff Loans & Salary Advances
        # -------------------------------------------------------------
        print("\n[INFO] Seeding Staff Loans & Salary Advances...")
        loans_cnt = (await session.execute(text("SELECT COUNT(*) FROM hr_staff_loans"))).scalar() or 0
        if loans_cnt < 5:
            sample_loan_emps = emp_ids[5:15]
            for idx, eid in enumerate(sample_loan_emps):
                lcode = f"LN-2026-{idx+1:03d}"
                ltype = "HOUSE_BUILDING" if idx % 2 == 0 else "EMERGENCY_LOAN"
                principal = Decimal(str(random.choice([50000, 100000, 150000, 250000])))
                tenure = 12 if principal <= 100000 else 24
                emi = round(principal / tenure, 2)
                recovered = emi * Decimal(str(random.randint(1, 5)))
                rem = principal - recovered

                await session.execute(
                    text("""
                        INSERT INTO hr_staff_loans (
                            organization_id, employee_id, loan_code, loan_type, principal_amount,
                            interest_rate, tenure_months, monthly_installment, disbursed_amount,
                            recovered_amount, remaining_balance, disbursement_date, start_recovery_period,
                            status, created_at
                        ) VALUES (
                            :org, :eid, :code, :ltype, :prin,
                            0, :tenure, :emi, :prin,
                            :rec, :rem, '2026-03-15', '2026-04',
                            'ACTIVE', NOW()
                        )
                    """),
                    {
                        "org": org_id, "eid": eid, "code": lcode, "ltype": ltype, "prin": principal,
                        "tenure": tenure, "emi": emi, "rec": recovered, "rem": rem
                    }
                )
            print("   [OK] Seeded 10 Staff Loans with amortization balance.")

        # Salary Advances
        adv_cnt = (await session.execute(text("SELECT COUNT(*) FROM hr_salary_advances"))).scalar() or 0
        if adv_cnt < 5:
            sample_adv_emps = emp_ids[20:30]
            for idx, eid in enumerate(sample_adv_emps):
                amt = Decimal(str(random.choice([15000, 20000, 25000, 30000])))
                await session.execute(
                    text("""
                        INSERT INTO hr_salary_advances (
                            organization_id, employee_id, advance_amount, requested_date,
                            recovery_period, recovered_amount, status, reason, created_at
                        ) VALUES (
                            :org, :eid, :amt, '2026-10-05',
                            '2026-10', 0, 'APPROVED', 'Family emergency and medical expense', NOW()
                        )
                    """),
                    {"org": org_id, "eid": eid, "amt": amt}
                )
            print("   [OK] Seeded 10 Salary Advances for October 2026.")

        await session.commit()

        print("\n=======================================================================")
        print("[SUCCESS] HR & PAYROLL DEMO DATA SEEDING COMPLETE!")
        emp_total = (await session.execute(text("SELECT COUNT(*) FROM hr_employees"))).scalar()
        att_total = (await session.execute(text("SELECT COUNT(*) FROM hr_attendance"))).scalar()
        shift_total = (await session.execute(text("SELECT COUNT(*) FROM hr_shifts"))).scalar()
        payslip_total = (await session.execute(text("SELECT COUNT(*) FROM hr_payroll_payslips"))).scalar()
        loan_total = (await session.execute(text("SELECT COUNT(*) FROM hr_staff_loans"))).scalar()
        print(f"[SUMMARY]:")
        print(f"   * Total Employees: {emp_total}")
        print(f"   * Total Shifts: {shift_total}")
        print(f"   * Total Attendance Records: {att_total}")
        print(f"   * Total Payslips: {payslip_total}")
        print(f"   * Total Staff Loans: {loan_total}")
        print("=======================================================================")


if __name__ == "__main__":
    asyncio.run(seed_hrms_payroll_demo())
