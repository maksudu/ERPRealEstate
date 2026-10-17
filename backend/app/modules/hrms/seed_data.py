import asyncio
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.modules.hrms.models import (
    Department, Designation, Employee, SiteLabourContractor,
    LabourMusterRoll, Attendance
)
from app.modules.projects.models import Project


async def seed_hrms_data():
    async with AsyncSessionLocal() as db:
        print("[HRMS] Seeding Tier-1 Enterprise HRMS & Construction Site Labour Data...")

        # 1. Departments
        dept_data = [
            ("MGMT", "Executive Management", "নির্বাহী ব্যবস্থাপনা"),
            ("ENG", "Civil Engineering & Construction", "সিভিল ইঞ্জিনিয়ারিং ও নির্মাণ"),
            ("ARCH", "Architecture & Structural Design", "স্থাপত্য ও স্ট্রাকচারাল ডিজাইন"),
            ("SALES", "Sales, CRM & Customer Experience", "বিক্রয় ও গ্রাহক সেবা"),
            ("ACCT", "Finance, Accounts & Audit", "অর্থ, হিসাব ও নিরীক্ষা"),
            ("LAND", "Land Bank & Legal Affairs", "ভূমি ব্যাংক ও আইন বিষয়ক"),
            ("SITE", "Site Operations & Quality Control", "সাইট পরিচালনা ও মান নিয়ন্ত্রণ")
        ]

        depts = {}
        for code, en, bn in dept_data:
            q = select(Department).where(Department.department_code == code)
            res = await db.execute(q)
            existing = res.scalar_one_or_none()
            if not existing:
                dept = Department(
                    organization_id=1,
                    department_code=code,
                    name_en=en,
                    name_bn=bn,
                    is_active=True
                )
                db.add(dept)
                await db.flush()
                depts[code] = dept
            else:
                depts[code] = existing

        # 2. Designations
        desig_data = [
            ("MGMT", "MD", "Managing Director", "ব্যবস্থাপনা পরিচালক", "GRADE_1", 250000, 450000),
            ("MGMT", "COO", "Chief Operating Officer", "প্রধান পরিচালনা কর্মকর্তা", "GRADE_1", 200000, 350000),
            ("ENG", "PD", "Project Director", "প্রকল্প পরিচালক", "GRADE_2", 150000, 250000),
            ("ENG", "SPE", "Senior Project Engineer", "সিনিয়র প্রকল্প প্রকৌশলী", "GRADE_3", 90000, 160000),
            ("ENG", "SCE", "Site Civil Engineer", "সাইট সিভিল প্রকৌশলী", "GRADE_4", 50000, 95000),
            ("ENG", "QAQC", "Quality & Safety Engineer", "কোয়ালিটি ও সেফটি ইঞ্জিনিয়ার", "GRADE_4", 45000, 85000),
            ("ARCH", "LARCH", "Lead Architect", "প্রধান স্থপতি", "GRADE_2", 120000, 220000),
            ("ARCH", "STE", "Structural Design Engineer", "স্ট্রাকচারাল ডিজাইন প্রকৌশলী", "GRADE_3", 80000, 140000),
            ("SALES", "HOS", "Head of Sales & Marketing", "বিক্রয় প্রধান", "GRADE_2", 130000, 240000),
            ("SALES", "SM", "Senior Sales Manager", "সিনিয়র বিক্রয় ব্যবস্থাপক", "GRADE_3", 70000, 120000),
            ("SALES", "SRE", "Sales Relationship Executive", "বিক্রয় নির্বাহী", "GRADE_5", 35000, 60000),
            ("ACCT", "CFO", "Chief Financial Officer", "প্রধান অর্থ কর্মকর্তা", "GRADE_1", 180000, 320000),
            ("ACCT", "SACCT", "Senior Manager Accounts", "সিনিয়র হিসাব ব্যবস্থাপক", "GRADE_3", 75000, 130000),
            ("ACCT", "ACCT", "Project Cost Accountant", "প্রকল্প কস্ট একাউন্ট্যান্ট", "GRADE_4", 45000, 80000),
            ("LAND", "LEG", "Senior Legal Advisor", "আইনি উপদেষ্টা", "GRADE_2", 110000, 200000),
            ("LAND", "LNDO", "Land Acquisition Officer", "ভূমি অধিগ্রহণ কর্মকর্তা", "GRADE_4", 40000, 75000),
            ("SITE", "SFM", "Senior Site Foreman", "প্রধান সাইট ফোরম্যান", "GRADE_5", 32000, 55000),
            ("SITE", "SURV", "Senior Land Surveyor", "প্রধান সার্ভেয়ার", "GRADE_5", 30000, 50000)
        ]

        desigs = {}
        for dept_code, d_code, en, bn, grade, s_min, s_max in desig_data:
            q = select(Designation).where(Designation.designation_code == d_code)
            res = await db.execute(q)
            existing = res.scalar_one_or_none()
            if not existing and dept_code in depts:
                desig = Designation(
                    organization_id=1,
                    department_id=depts[dept_code].id,
                    designation_code=d_code,
                    title_en=en,
                    title_bn=bn,
                    grade_level=grade,
                    min_salary=Decimal(str(s_min)),
                    max_salary=Decimal(str(s_max)),
                    is_active=True
                )
                db.add(desig)
                await db.flush()
                desigs[d_code] = desig
            elif existing:
                desigs[d_code] = existing

        # Fetch projects if available
        proj_q = select(Project).limit(5)
        proj_res = await db.execute(proj_q)
        projects = proj_res.scalars().all()
        p1_id = projects[0].id if len(projects) > 0 else None
        p2_id = projects[1].id if len(projects) > 1 else None

        # 3. 20 Realistic Real Estate Employees (Corporate + Site Staff)
        raw_employees = [
            # Corporate Management & Finance
            ("EMP-1001", "Kazi", "Fahimul Islam", "fahim@bengalre.com", "+8801711000001", "MALE", "PERMANENT", "CORPORATE", "MGMT", "MD", 280000, 140000, 28000, 15000, 0, 5000, None),
            ("EMP-1002", "Barrister", "Asaduzzaman", "legal@bengalre.com", "+8801711000002", "MALE", "PERMANENT", "CORPORATE", "LAND", "LEG", 140000, 70000, 14000, 10000, 0, 4000, None),
            ("EMP-1003", "Masud", "Rana FCA", "cfo@bengalre.com", "+8801711000003", "MALE", "PERMANENT", "CORPORATE", "ACCT", "CFO", 200000, 100000, 20000, 12000, 0, 4500, None),
            ("EMP-1004", "Farhana", "Akter ACA", "farhana@bengalre.com", "+8801711000004", "FEMALE", "PERMANENT", "CORPORATE", "ACCT", "SACCT", 85000, 42500, 8500, 6000, 0, 3000, None),
            ("EMP-1005", "Mahmudul", "Hasan", "mahmud.acct@bengalre.com", "+8801711000005", "MALE", "PERMANENT", "CORPORATE", "ACCT", "ACCT", 50000, 25000, 5000, 4000, 0, 2000, None),
            
            # Architecture & Design
            ("EMP-1006", "Ar. Shafiqul", "Alam", "shafiq.arch@bengalre.com", "+8801711000006", "MALE", "PERMANENT", "CORPORATE", "ARCH", "LARCH", 130000, 65000, 13000, 8000, 0, 3500, None),
            ("EMP-1007", "Engr. Nabila", "Sultana", "nabila.str@bengalre.com", "+8801711000007", "FEMALE", "PERMANENT", "CORPORATE", "ARCH", "STE", 90000, 45000, 9000, 6000, 0, 2500, None),

            # Sales & Marketing
            ("EMP-1008", "Syed", "Kamrul Hassan", "kamrul.sales@bengalre.com", "+8801711000008", "MALE", "PERMANENT", "CORPORATE", "SALES", "HOS", 150000, 75000, 15000, 10000, 0, 5000, None),
            ("EMP-1009", "Zahid", "Hossain", "zahid.sales@bengalre.com", "+8801711000009", "MALE", "PERMANENT", "CORPORATE", "SALES", "SM", 75000, 37500, 7500, 5000, 0, 3000, None),
            ("EMP-1010", "Sadia", "Afrin", "sadia.sales@bengalre.com", "+8801711000010", "FEMALE", "PERMANENT", "CORPORATE", "SALES", "SRE", 40000, 20000, 4000, 4000, 0, 2000, None),
            ("EMP-1011", "Riaz", "Uddin", "riaz.sales@bengalre.com", "+8801711000011", "MALE", "PROBATION", "CORPORATE", "SALES", "SRE", 38000, 19000, 3800, 4000, 0, 2000, None),

            # Site Engineering & Construction (Multi-Project Assigned)
            ("EMP-1012", "Engr. Tanvir", "Ahmed PEng", "tanvir.pd@bengalre.com", "+8801711000012", "MALE", "PERMANENT", "SITE_ENGINEERING", "ENG", "PD", 160000, 80000, 16000, 10000, 15000, 4000, p1_id),
            ("EMP-1013", "Engr. Shahriar", "Kabir", "shahriar.eng@bengalre.com", "+8801711000013", "MALE", "PERMANENT", "SITE_ENGINEERING", "ENG", "SPE", 100000, 50000, 10000, 8000, 12000, 3000, p1_id),
            ("EMP-1014", "Engr. Mostafa", "Kamal", "mostafa.civil@bengalre.com", "+8801711000014", "MALE", "PERMANENT", "SITE_ENGINEERING", "ENG", "SCE", 60000, 30000, 6000, 5000, 8000, 2500, p1_id),
            ("EMP-1015", "Engr. Nazmul", "Huda", "nazmul.qa@bengalre.com", "+8801711000015", "MALE", "PERMANENT", "SITE_ENGINEERING", "ENG", "QAQC", 55000, 27500, 5500, 5000, 7500, 2000, p1_id),
            ("EMP-1016", "Engr. Ariful", "Islam", "ariful.civil@bengalre.com", "+8801711000016", "MALE", "PERMANENT", "SITE_ENGINEERING", "ENG", "SCE", 58000, 29000, 5800, 5000, 8000, 2500, p2_id),
            ("EMP-1017", "Alauddin", "Miah", "alauddin.foreman@bengalre.com", "+8801711000017", "MALE", "PERMANENT", "SITE_SUPERVISION", "SITE", "SFM", 35000, 17500, 3500, 3000, 5000, 1500, p1_id),
            ("EMP-1018", "Mokbul", "Hossain", "mokbul.foreman@bengalre.com", "+8801711000018", "MALE", "PERMANENT", "SITE_SUPERVISION", "SITE", "SFM", 34000, 17000, 3400, 3000, 5000, 1500, p2_id),
            ("EMP-1019", "Abdul", "Kuddus", "kuddus.survey@bengalre.com", "+8801711000019", "MALE", "PERMANENT", "SITE_SUPERVISION", "SITE", "SURV", 32000, 16000, 3200, 3000, 4000, 1200, p1_id),
            ("EMP-1020", "Anisur", "Rahman", "anis.land@bengalre.com", "+8801711000020", "MALE", "PERMANENT", "CORPORATE", "LAND", "LNDO", 45000, 22500, 4500, 4000, 0, 2000, None)
        ]

        saved_employees = []
        for code, fn, ln, email, phone, gender, emp_type, category, d_code, des_code, b, hr, med, conv, haz, mob, proj_id in raw_employees:
            q = select(Employee).where(Employee.employee_code == code)
            res = await db.execute(q)
            emp = res.scalar_one_or_none()
            if not emp and d_code in depts and des_code in desigs:
                emp = Employee(
                    organization_id=1,
                    employee_code=code,
                    first_name=fn,
                    last_name=ln,
                    official_email=email,
                    phone=phone,
                    gender=gender,
                    joining_date=date(2023, 1, 15),
                    probation_months=6,
                    employment_type=emp_type,
                    workforce_category=category,
                    status="ACTIVE",
                    department_id=depts[d_code].id,
                    designation_id=desigs[des_code].id,
                    assigned_project_id=proj_id,
                    basic_salary=Decimal(str(b)),
                    house_rent_allowance=Decimal(str(hr)),
                    medical_allowance=Decimal(str(med)),
                    conveyance_allowance=Decimal(str(conv)),
                    site_hazard_allowance=Decimal(str(haz)),
                    mobile_allowance=Decimal(str(mob)),
                    is_pf_eligible=True,
                    is_tax_eligible=True,
                    bank_account_no=f"1051200{code.split('-')[1]}",
                    bank_name="City Bank PLC",
                    bank_branch="Gulshan Avenue Branch"
                )
                db.add(emp)
                await db.flush()
            if emp:
                saved_employees.append(emp)

        # 4. 5 Site Labour Contractors
        contractor_data = [
            ("Padma Rod Binders & Rebar Engineering", "TL-2024-8812", "Md. Jalal Uddin", "+8801819001122", "ROD_BINDING", 850.00),
            ("Bengal Shuttering & Scaffolding Works", "TL-2023-4199", "Haji Nurul Islam", "+8801819003344", "CARPENTRY_SHUTTERING", 900.00),
            ("Jamuna Masonry & Bricklaying Builders", "TL-2025-1021", "Sobhan Ali", "+8801819005566", "MASONRY_CIVIL", 800.00),
            ("Meghna Plumbing & Sanitary Contractors", "TL-2024-5541", "Engr. Delowar Hossain", "+8801819007788", "PLUMBING_SANITARY", 850.00),
            ("Karnafuli Tiles, Marble & Finishing Works", "TL-2024-9918", "Mizanur Rahman", "+8801819009900", "TILES_FINISHING", 950.00)
        ]

        saved_contractors = []
        for cname, tl, cp, cphone, spec, rate in contractor_data:
            q = select(SiteLabourContractor).where(SiteLabourContractor.company_name == cname)
            res = await db.execute(q)
            con = res.scalar_one_or_none()
            if not con:
                con = SiteLabourContractor(
                    organization_id=1,
                    company_name=cname,
                    trade_license=tl,
                    contact_person=cp,
                    phone=cphone,
                    trade_specialization=spec,
                    daily_rate_default=Decimal(str(rate)),
                    is_active=True
                )
                db.add(con)
                await db.flush()
            if con:
                saved_contractors.append(con)

        # 5. Today's Attendance logs for all 20 employees
        today = date.today()
        for i, emp in enumerate(saved_employees):
            att_q = select(Attendance).where(
                Attendance.employee_id == emp.id,
                Attendance.punch_date == today
            )
            existing_att = (await db.execute(att_q)).scalar_one_or_none()
            if not existing_att:
                is_late = (i % 6 == 0)
                clock_in_time = datetime(today.year, today.month, today.day, 9, 45 if is_late else 15)
                clock_out_time = datetime(today.year, today.month, today.day, 18, 30)

                att = Attendance(
                    organization_id=1,
                    employee_id=emp.id,
                    punch_date=today,
                    clock_in=clock_in_time,
                    clock_out=clock_out_time,
                    late_minutes=15 if is_late else 0,
                    status="LATE" if is_late else "PRESENT",
                    source="BIOMETRIC_DEVICE" if emp.workforce_category == "CORPORATE" else "GPS_MOBILE",
                    geofence_lat=Decimal("23.7925000"),
                    geofence_lng=Decimal("90.4078000"),
                    remarks="Gulshan Corporate Office Punch" if emp.workforce_category == "CORPORATE" else "Site Geofence Punch"
                )
                db.add(att)

        # 6. Daily Site Labour Muster Roll Records
        if p1_id and saved_contractors:
            for skill, hc, ot in [
                ("ROD_BINDER", 18, 2.0),
                ("CARPENTER", 14, 1.5),
                ("MASON", 12, 0.0),
                ("HELPER", 22, 2.0)
            ]:
                roll_q = select(LabourMusterRoll).where(
                    LabourMusterRoll.project_id == p1_id,
                    LabourMusterRoll.muster_date == today,
                    LabourMusterRoll.skill_type == skill
                )
                if not (await db.execute(roll_q)).scalar_one_or_none():
                    hr_rate = Decimal("100.00")
                    ot_rate = Decimal("150.00")
                    base_amt = Decimal(hc) * Decimal("8.00") * hr_rate
                    ot_amt = Decimal(hc) * Decimal(str(ot)) * ot_rate

                    roll = LabourMusterRoll(
                        organization_id=1,
                        project_id=p1_id,
                        contractor_id=saved_contractors[0].id,
                        muster_date=today,
                        shift="DAY",
                        skill_type=skill,
                        headcount=hc,
                        standard_hours=Decimal("8.00"),
                        overtime_hours=Decimal(str(ot)),
                        hourly_rate=hr_rate,
                        overtime_rate=ot_rate,
                        total_amount=base_amt + ot_amt,
                        approval_status="APPROVED",
                        remarks=f"Floor slab casting labor gang - Tower A"
                    )
                    db.add(roll)

        await db.commit()
        print("[HRMS] Enterprise HRMS & Construction Site Labour Seeding Complete!")


if __name__ == "__main__":
    asyncio.run(seed_hrms_data())
