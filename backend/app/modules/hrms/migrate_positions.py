import asyncio
from decimal import Decimal
from datetime import date
from sqlalchemy import text
from app.core.database import engine, Base, AsyncSessionLocal
import app.modules.construction.models
import app.modules.land.models
import app.modules.projects.models
import app.modules.accounts.models
import app.modules.inventory.models
import app.modules.sales.models
import app.modules.crm.models
import app.modules.lookups.models
import app.modules.auth.models
import app.modules.hrms.models
from app.modules.hrms.models import SalaryGrade, Designation, Position, Department, Employee

async def migrate_and_seed_positions():
    async with engine.begin() as conn:
        print("[Migration] Ensuring columns exist in hr_designations...")
        designation_cols = [
            ("salary_grade_id", "BIGINT NULL"),
            ("employee_level", "VARCHAR(50) NOT NULL DEFAULT 'EXECUTIVE'"),
            ("min_salary", "DECIMAL(12, 2) NOT NULL DEFAULT 15000.00"),
            ("max_salary", "DECIMAL(12, 2) NOT NULL DEFAULT 300000.00"),
            ("description", "TEXT NULL"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT TRUE")
        ]
        for col_name, col_type in designation_cols:
            try:
                await conn.execute(text(f"ALTER TABLE hr_designations ADD COLUMN {col_name} {col_type};"))
                print(f"[Migration] Added {col_name} to hr_designations")
            except Exception as e:
                print(f"[Migration] Column {col_name} exists or skipped: {e}")

        # Ensure all tables created
        await conn.run_sync(Base.metadata.create_all)
        print("[Migration] Tables hr_salary_grades and hr_positions created/verified!")

    # Now seed initial records via AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        # 1. Seed Salary Grades
        existing_grades = (await session.execute(text("SELECT count(*) FROM hr_salary_grades"))).scalar()
        if existing_grades == 0:
            print("[Seeding] Seeding standard Salary Grades & Scales...")
            grades_data = [
                SalaryGrade(
                    grade_code="GRADE-01",
                    grade_name="Grade 1 - Apex Executive / C-Suite",
                    employee_level="C_SUITE",
                    min_salary=Decimal("250000.00"),
                    max_salary=Decimal("500000.00"),
                    default_house_rent_pct=Decimal("50.00"),
                    default_medical_allowance=Decimal("20000.00"),
                    default_conveyance=Decimal("25000.00"),
                    description="Managing Director, CEO, and Board Appointed Executive Directors",
                    is_active=True
                ),
                SalaryGrade(
                    grade_code="GRADE-02",
                    grade_name="Grade 2 - Executive Director / VP",
                    employee_level="DIRECTOR",
                    min_salary=Decimal("180000.00"),
                    max_salary=Decimal("300000.00"),
                    default_house_rent_pct=Decimal("50.00"),
                    default_medical_allowance=Decimal("15000.00"),
                    default_conveyance=Decimal("20000.00"),
                    description="Functional Directors and Division Heads",
                    is_active=True
                ),
                SalaryGrade(
                    grade_code="GRADE-03",
                    grade_name="Grade 3 - Senior Management (Chief / GM)",
                    employee_level="SR_MANAGEMENT",
                    min_salary=Decimal("120000.00"),
                    max_salary=Decimal("220000.00"),
                    default_house_rent_pct=Decimal("50.00"),
                    default_medical_allowance=Decimal("10000.00"),
                    default_conveyance=Decimal("15000.00"),
                    description="General Managers, Chief Engineers, and Head of Functions",
                    is_active=True
                ),
                SalaryGrade(
                    grade_code="GRADE-04",
                    grade_name="Grade 4 - Mid Management / Project Managers",
                    employee_level="MID_MANAGEMENT",
                    min_salary=Decimal("80000.00"),
                    max_salary=Decimal("150000.00"),
                    default_house_rent_pct=Decimal("50.00"),
                    default_medical_allowance=Decimal("8000.00"),
                    default_conveyance=Decimal("10000.00"),
                    description="Project Managers, AGM, Senior Managers",
                    is_active=True
                ),
                SalaryGrade(
                    grade_code="GRADE-05",
                    grade_name="Grade 5 - Senior Engineers / Assistant Managers",
                    employee_level="SITE_ENGINEER",
                    min_salary=Decimal("55000.00"),
                    max_salary=Decimal("95000.00"),
                    default_house_rent_pct=Decimal("50.00"),
                    default_medical_allowance=Decimal("5000.00"),
                    default_conveyance=Decimal("6000.00"),
                    description="Senior Civil Engineers, Structural Engineers, Lead Architects",
                    is_active=True
                ),
                SalaryGrade(
                    grade_code="GRADE-06",
                    grade_name="Grade 6 - Officers & Site Engineers",
                    employee_level="SITE_ENGINEER",
                    min_salary=Decimal("35000.00"),
                    max_salary=Decimal("60000.00"),
                    default_house_rent_pct=Decimal("50.00"),
                    default_medical_allowance=Decimal("4000.00"),
                    default_conveyance=Decimal("4000.00"),
                    description="Site Engineers, Accountants, Sales Executives, Quality Inspectors",
                    is_active=True
                ),
                SalaryGrade(
                    grade_code="GRADE-07",
                    grade_name="Grade 7 - Junior Executives & Supervisors",
                    employee_level="OFFICER",
                    min_salary=Decimal("25000.00"),
                    max_salary=Decimal("40000.00"),
                    default_house_rent_pct=Decimal("50.00"),
                    default_medical_allowance=Decimal("3000.00"),
                    default_conveyance=Decimal("3000.00"),
                    description="Site Supervisors, Surveyors, Junior Accountants, CRM Associates",
                    is_active=True
                ),
                SalaryGrade(
                    grade_code="GRADE-08",
                    grade_name="Grade 8 - Support & Operational Staff",
                    employee_level="SUPPORT_STAFF",
                    min_salary=Decimal("16000.00"),
                    max_salary=Decimal("28000.00"),
                    default_house_rent_pct=Decimal("50.00"),
                    default_medical_allowance=Decimal("2000.00"),
                    default_conveyance=Decimal("2000.00"),
                    description="Office Assistants, Electricians, Drivers, Security Personnel",
                    is_active=True
                )
            ]
            session.add_all(grades_data)
            await session.commit()
            print(f"[Seeding] Seeded {len(grades_data)} Salary Grades!")

        # Fetch departments and grades to map designations
        dept_rows = (await session.execute(text("SELECT id, department_code FROM hr_departments"))).fetchall()
        dept_map = {row[1]: row[0] for row in dept_rows}

        grade_rows = (await session.execute(text("SELECT id, grade_code FROM hr_salary_grades"))).fetchall()
        grade_map = {row[1]: row[0] for row in grade_rows}

        # 2. Seed Designations if missing
        existing_desig_codes = set((await session.execute(text("SELECT designation_code FROM hr_designations"))).scalars().all())
        print(f"[Seeding] Current designations in DB: {len(existing_desig_codes)}")
        if len(existing_desig_codes) < 10 and dept_map:
            civil_dept_id = dept_map.get("ENG-CONST") or dept_map.get("CONST-OPS") or list(dept_map.values())[0]
            fin_dept_id = dept_map.get("FIN-ACCTS") or list(dept_map.values())[0]
            sales_dept_id = dept_map.get("SALES-CRM") or list(dept_map.values())[0]
            mgt_dept_id = dept_map.get("CORP-MD") or list(dept_map.values())[0]
            arch_dept_id = dept_map.get("ARCH-DES") or list(dept_map.values())[0]

            candidate_desigs = [
                ("MD", "Managing Director & CEO", "ব্যবস্থাপনা পরিচালক ও প্রধান নির্বাহী", mgt_dept_id, "GRADE-01", "GRADE_1", "C_SUITE", Decimal("250000"), Decimal("500000"), "Executive Leadership"),
                ("PROJ-DIR", "Project Director - Engineering", "প্রকল্প পরিচালক", civil_dept_id, "GRADE-02", "GRADE_2", "DIRECTOR", Decimal("180000"), Decimal("300000"), "Oversees construction"),
                ("CFO", "Chief Financial Officer", "প্রধান অর্থ কর্মকর্তা", fin_dept_id, "GRADE-02", "GRADE_2", "DIRECTOR", Decimal("180000"), Decimal("300000"), "Head of Finance"),
                ("SR-PM", "Senior Project Manager", "সিনিয়র প্রকল্প ব্যবস্থাপক", civil_dept_id, "GRADE-04", "GRADE_4", "MID_MANAGEMENT", Decimal("90000"), Decimal("160000"), "Site execution"),
                ("SR-CIVIL-ENG", "Senior Civil Engineer", "সিনিয়র সিভিল ইঞ্জিনিয়ার", civil_dept_id, "GRADE-05", "GRADE_5", "SITE_ENGINEER", Decimal("60000"), Decimal("95000"), "Structural RCC"),
                ("SITE-ENG", "Site Engineer - Civil", "সাইট ইঞ্জিনিয়ার - সিভিল", civil_dept_id, "GRADE-06", "GRADE_6", "SITE_ENGINEER", Decimal("35000"), Decimal("55000"), "Daily site supervision"),
                ("LEAD-ARCH", "Lead Architectural Designer", "প্রধান স্থপতি", arch_dept_id, "GRADE-05", "GRADE_5", "SITE_ENGINEER", Decimal("65000"), Decimal("110000"), "Architectural layouts"),
                ("SR-SALES-MGR", "Senior Sales & CRM Manager", "সিনিয়র বিক্রয় ব্যবস্থাপক", sales_dept_id, "GRADE-04", "GRADE_4", "MID_MANAGEMENT", Decimal("80000"), Decimal("140000"), "Apartment booking"),
                ("SR-ACCT", "Senior Accounts Officer", "সিনিয়র হিসাব কর্মকর্তা", fin_dept_id, "GRADE-06", "GRADE_6", "OFFICER", Decimal("40000"), Decimal("65000"), "Vendor billing"),
                ("SITE-SUPV", "Site Supervisor", "সাইট সুপারভাইজার", civil_dept_id, "GRADE-07", "GRADE_7", "OFFICER", Decimal("26000"), Decimal("38000"), "Ground supervision")
            ]
            for code, t_en, t_bn, d_id, g_code, g_lvl, e_lvl, min_s, max_s, desc in candidate_desigs:
                if code not in existing_desig_codes:
                    session.add(Designation(
                        department_id=d_id,
                        designation_code=code,
                        title_en=t_en,
                        title_bn=t_bn,
                        salary_grade_id=grade_map.get(g_code),
                        grade_level=g_lvl,
                        employee_level=e_lvl,
                        min_salary=min_s,
                        max_salary=max_s,
                        description=desc,
                        is_active=True
                    ))
            await session.commit()
            print("[Seeding] Seeded missing Designations!")

        # 3. Seed Positions
        existing_pos_codes = set((await session.execute(text("SELECT position_code FROM hr_positions"))).scalars().all())
        print(f"[Seeding] Current positions in DB: {len(existing_pos_codes)}")
        if len(existing_pos_codes) < 10:
            print("[Seeding] Seeding Sanctioned and Vacant Positions...")
            all_desigs = (await session.execute(text("SELECT id, designation_code, title_en, department_id, salary_grade_id FROM hr_designations"))).fetchall()
            desig_lookup = {r[1]: r for r in all_desigs}
            
            # Fetch employees
            emps = (await session.execute(text("SELECT id, employee_code, first_name, last_name, designation_id FROM hr_employees LIMIT 15"))).fetchall()
            emp_by_id = {e[0]: e for e in emps}
            emp_ids = list(emp_by_id.keys())

            # Fetch projects & branches
            prj_rows = (await session.execute(text("SELECT id, project_name FROM prj_projects LIMIT 5"))).fetchall()
            prj_id_1 = prj_rows[0][0] if prj_rows else None
            prj_id_2 = prj_rows[1][0] if len(prj_rows) > 1 else prj_id_1

            branch_rows = (await session.execute(text("SELECT id FROM hr_branches LIMIT 3"))).fetchall()
            ho_branch_id = branch_rows[0][0] if branch_rows else None

            positions_data = []

            # 1. MD Position
            if "MD" in desig_lookup:
                d = desig_lookup["MD"]
                positions_data.append(Position(
                    position_code="POS-EXEC-001",
                    position_title="Managing Director & Chief Executive",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_branch_id=ho_branch_id,
                    position_type="PERMANENT",
                    status="FILLED" if emp_ids else "APPROVED",
                    budgeted_salary=Decimal("350000.00"),
                    occupied_employee_id=emp_ids[0] if emp_ids else None,
                    approved_date=date(2025, 1, 1),
                    remarks="Apex executive position sanctioned by Board"
                ))

            # 2. Project Director
            pd_key = "PD" if "PD" in desig_lookup else "PROJ-DIR"
            if pd_key in desig_lookup:
                d = desig_lookup[pd_key]
                positions_data.append(Position(
                    position_code="POS-ENG-001",
                    position_title="Project Director (Construction Operations)",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_branch_id=ho_branch_id,
                    position_type="PERMANENT",
                    status="FILLED" if len(emp_ids) > 1 else "APPROVED",
                    budgeted_salary=Decimal("200000.00"),
                    occupied_employee_id=emp_ids[1] if len(emp_ids) > 1 else None,
                    approved_date=date(2025, 1, 1),
                    remarks="Sanctioned for all real estate high-rise projects"
                ))

            # 3. CFO
            if "CFO" in desig_lookup:
                d = desig_lookup["CFO"]
                positions_data.append(Position(
                    position_code="POS-FIN-001",
                    position_title="Chief Financial Officer & Corporate Controller",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_branch_id=ho_branch_id,
                    position_type="PERMANENT",
                    status="FILLED" if len(emp_ids) > 2 else "APPROVED",
                    budgeted_salary=Decimal("190000.00"),
                    occupied_employee_id=emp_ids[2] if len(emp_ids) > 2 else None,
                    approved_date=date(2025, 1, 1),
                    remarks="Financial stewardship and audit governance"
                ))

            # 4. Senior Project Manager
            pm_key = "PM" if "PM" in desig_lookup else "SR-PM"
            if pm_key in desig_lookup:
                d = desig_lookup[pm_key]
                positions_data.append(Position(
                    position_code="POS-PM-001",
                    position_title="Project Manager - Bayview Luxury Residency",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_project_id=prj_id_1,
                    position_type="PROJECT_SITE",
                    status="FILLED" if len(emp_ids) > 3 else "APPROVED",
                    budgeted_salary=Decimal("120000.00"),
                    occupied_employee_id=emp_ids[3] if len(emp_ids) > 3 else None,
                    approved_date=date(2025, 1, 1),
                    remarks="Full site project head with structural responsibility"
                ))

            # 5. Site Engineer - FILLED
            se_key = "SE" if "SE" in desig_lookup else "SR-CIVIL-ENG"
            if se_key in desig_lookup:
                d = desig_lookup[se_key]
                positions_data.append(Position(
                    position_code="POS-CE-001",
                    position_title="Senior Site Engineer - Tower A & B",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_project_id=prj_id_1,
                    position_type="PROJECT_SITE",
                    status="FILLED" if len(emp_ids) > 4 else "APPROVED",
                    budgeted_salary=Decimal("75000.00"),
                    occupied_employee_id=emp_ids[4] if len(emp_ids) > 4 else None,
                    approved_date=date(2025, 1, 1),
                    remarks="Casting, structural reinforcement, concrete testing"
                ))

                # 6. Site Engineer - VACANT 1
                positions_data.append(Position(
                    position_code="POS-SE-VAC-001",
                    position_title="Site Engineer (Civil & Finishing) - Vacancy",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_project_id=prj_id_1,
                    position_type="PROJECT_SITE",
                    status="VACANT",
                    budgeted_salary=Decimal("45000.00"),
                    target_hire_date=date(2026, 11, 15),
                    approved_date=date(2026, 1, 1),
                    remarks="Urgent manpower requisition approved for Tower B facade works"
                ))

                # 7. Site Engineer - VACANT 2
                positions_data.append(Position(
                    position_code="POS-SE-VAC-002",
                    position_title="Site Engineer (MEP & Electrical) - Vacancy",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_project_id=prj_id_2,
                    position_type="PROJECT_SITE",
                    status="VACANT",
                    budgeted_salary=Decimal("48000.00"),
                    target_hire_date=date(2026, 11, 30),
                    approved_date=date(2026, 2, 1),
                    remarks="Under interview screening for electro-mechanical supervision"
                ))

            # 8. QA/QC Materials Inspector
            if "QA_ENG" in desig_lookup:
                d = desig_lookup["QA_ENG"]
                positions_data.append(Position(
                    position_code="POS-QA-001",
                    position_title="QA/QC Materials & Concreting Inspector",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_project_id=prj_id_1,
                    position_type="PROJECT_SITE",
                    status="FILLED" if len(emp_ids) > 5 else "APPROVED",
                    budgeted_salary=Decimal("60000.00"),
                    occupied_employee_id=emp_ids[5] if len(emp_ids) > 5 else None,
                    approved_date=date(2025, 1, 1),
                    remarks="Rebar testing and cube crushing strength verification"
                ))

            # 9. Head of Sales
            if "HEAD_SALES" in desig_lookup:
                d = desig_lookup["HEAD_SALES"]
                positions_data.append(Position(
                    position_code="POS-SALES-001",
                    position_title="Head of Sales & Marketing",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_branch_id=ho_branch_id,
                    position_type="PERMANENT",
                    status="FILLED" if len(emp_ids) > 6 else "APPROVED",
                    budgeted_salary=Decimal("120000.00"),
                    occupied_employee_id=emp_ids[6] if len(emp_ids) > 6 else None,
                    approved_date=date(2025, 1, 1),
                    remarks="Apartment sales closures and customer financing targets"
                ))

            # 10. Senior Sales Officer - VACANT
            sr_sales_key = "SR_SALES" if "SR_SALES" in desig_lookup else "SR-SALES-MGR"
            if sr_sales_key in desig_lookup:
                d = desig_lookup[sr_sales_key]
                positions_data.append(Position(
                    position_code="POS-SALES-VAC-001",
                    position_title="Assistant Sales Manager (Residential Units)",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_branch_id=ho_branch_id,
                    position_type="PERMANENT",
                    status="VACANT",
                    budgeted_salary=Decimal("50000.00"),
                    target_hire_date=date(2026, 12, 1),
                    approved_date=date(2026, 3, 1),
                    remarks="Approved to handle incoming prospects for upcoming launches"
                ))

            # 11. Senior Accounts Officer - FILLED
            sr_acct_key = "SR_ACCT" if "SR_ACCT" in desig_lookup else "SR-ACCT"
            if sr_acct_key in desig_lookup:
                d = desig_lookup[sr_acct_key]
                positions_data.append(Position(
                    position_code="POS-ACCT-001",
                    position_title="Senior Accounts & Billing Officer",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_branch_id=ho_branch_id,
                    position_type="PERMANENT",
                    status="FILLED" if len(emp_ids) > 7 else "APPROVED",
                    budgeted_salary=Decimal("55000.00"),
                    occupied_employee_id=emp_ids[7] if len(emp_ids) > 7 else None,
                    approved_date=date(2025, 1, 1),
                    remarks="Subcontractor billing verification and muster roll payments"
                ))

            # 12. Legal Advocate
            if "LEGAL_ADV" in desig_lookup:
                d = desig_lookup["LEGAL_ADV"]
                positions_data.append(Position(
                    position_code="POS-LEGAL-001",
                    position_title="Senior Legal Officer (Land & Registration)",
                    department_id=d[3],
                    designation_id=d[0],
                    salary_grade_id=d[4],
                    assigned_branch_id=ho_branch_id,
                    position_type="PERMANENT",
                    status="VACANT",
                    budgeted_salary=Decimal("65000.00"),
                    target_hire_date=date(2026, 11, 20),
                    approved_date=date(2026, 2, 15),
                    remarks="Vetting of land title deeds and AC Land Mutation liaison"
                ))


            positions_data = [p for p in positions_data if p.position_code not in existing_pos_codes]
            if positions_data:
                session.add_all(positions_data)
                await session.commit()
                print(f"[Seeding] Successfully seeded {len(positions_data)} Sanctioned Positions (Filled + Vacant)!")


if __name__ == "__main__":
    asyncio.run(migrate_and_seed_positions())
