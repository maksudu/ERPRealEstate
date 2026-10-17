import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import select, text
from app.core.database import engine, AsyncSessionLocal

# Models
from app.modules.auth.models import Organization, User
from app.modules.projects.models import Project, Tower
from app.modules.hrms.models import (
    Department, Designation, Employee, SiteLabourContractor,
    LabourMusterRoll, Attendance, LeaveApplication, PayrollRun, Payslip
)
from app.modules.accounts.models import (
    CostCenter, FiscalYear, CWIPCapitalization, IFRS15RevenueRecognition, BankStatementItem, ChartOfAccount
)
from app.modules.bi.models import ExecutiveSnapshot, ProjectProfitabilityForecast

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_demo")

async def seed_hrms_and_executive():
    logger.info("=================================================================")
    logger.info("SEEDING HRMS, CWIP & EXECUTIVE DEMO DATA FOR CLIENT PRESENTATION")
    logger.info("=================================================================")

    async with AsyncSessionLocal() as session:
        # Check Organization
        org = (await session.execute(select(Organization))).scalars().first()
        org_id = org.id if org else 1

        users = (await session.execute(select(User))).scalars().all()
        admin_user = users[0] if users else None

        projects = (await session.execute(select(Project))).scalars().all()
        proj_1 = projects[0] if projects else None
        proj_2 = projects[1] if len(projects) > 1 else proj_1

        towers = (await session.execute(select(Tower))).scalars().all()
        tower_1 = towers[0] if towers else None

        # -------------------------------------------------------------
        # 1. HR DEPARTMENTS
        # -------------------------------------------------------------
        dept_data = [
            ("MGMT", "Executive Management", "নির্বাহী ব্যবস্থাপনা"),
            ("FIN", "Finance, Accounts & Tax", "অর্থ, হিসাব ও কর"),
            ("ENG", "Civil & Structural Engineering", "সিভিল ও স্ট্রাকচারাল ইঞ্জিনিয়ারিং"),
            ("ARCH", "Architecture & Planning", "স্থাপত্য ও নগর পরিকল্পনা"),
            ("SALES", "Sales, CRM & Marketing", "বিক্রয়, সিআরএম ও বিপণন"),
            ("SITE_OPS", "Site Operations & Safety", "সাইট অপারেশনস ও নিরাপত্তা"),
            ("LEGAL", "Legal, Land & Compliance", "আইন, ভূমি ও কমপ্লায়েন্স")
        ]

        existing_depts = {d.department_code: d for d in (await session.execute(select(Department))).scalars().all()}
        dept_map = {}

        for code, name_en, name_bn in dept_data:
            if code in existing_depts:
                dept_map[code] = existing_depts[code]
            else:
                dept = Department(
                    organization_id=org_id,
                    department_code=code,
                    name_en=name_en,
                    name_bn=name_bn,
                    head_of_dept_id=admin_user.id if admin_user else None,
                    is_active=True
                )
                session.add(dept)
                await session.flush()
                dept_map[code] = dept
        logger.info(f"Seeded {len(dept_map)} HR Departments.")

        # -------------------------------------------------------------
        # 2. HR DESIGNATIONS
        # -------------------------------------------------------------
        desig_data = [
            ("MD", "Managing Director & CEO", "ম্যানেজিং ডিরেক্টর", "MGMT", "GRADE_1", 350000),
            ("CFO", "Chief Financial Officer, FCA", "প্রধান অর্থ কর্মকর্তা", "FIN", "GRADE_1", 250000),
            ("PD", "Project Director", "প্রকল্প পরিচালক", "ENG", "GRADE_2", 200000),
            ("PM", "Senior Project Manager", "সিনিয়র প্রজেক্ট ম্যানেজার", "ENG", "GRADE_3", 150000),
            ("SE", "Senior Site Engineer (Civil)", "সাইট ইঞ্জিনিয়ার", "SITE_OPS", "GRADE_4", 80000),
            ("QA_ENG", "QA/QC Materials Inspector", "মান নিয়ন্ত্রণ প্রকৌশলী", "SITE_OPS", "GRADE_4", 75000),
            ("HEAD_SALES", "Head of Sales & Marketing", "বিক্রয় প্রধান", "SALES", "GRADE_2", 180000),
            ("SR_SALES", "Senior Relationship Manager", "সিনিয়র রিলেশনশিপ ম্যানেজার", "SALES", "GRADE_4", 65000),
            ("LEGAL_ADV", "Chief Legal Counsel & Advocate", "প্রধান আইন উপদেষ্টা", "LEGAL", "GRADE_3", 140000),
            ("SR_ACCT", "Senior Tax & Accounts Officer", "সিনিয়র হিসাব কর্মকর্তা", "FIN", "GRADE_4", 70000)
        ]

        existing_desigs = {d.designation_code: d for d in (await session.execute(select(Designation))).scalars().all()}
        desig_map = {}

        for code, title_en, title_bn, dept_code, grade, salary in desig_data:
            if code in existing_desigs:
                desig_map[code] = existing_desigs[code]
            else:
                d = Designation(
                    organization_id=org_id,
                    department_id=dept_map[dept_code].id,
                    designation_code=code,
                    title_en=title_en,
                    title_bn=title_bn,
                    grade_level=grade,
                    min_salary=Decimal(str(salary * 0.7)),
                    max_salary=Decimal(str(salary * 1.5)),
                    is_active=True
                )
                session.add(d)
                await session.flush()
                desig_map[code] = d
        logger.info(f"Seeded {len(desig_map)} HR Designations.")

        # -------------------------------------------------------------
        # 3. HR EMPLOYEES
        # -------------------------------------------------------------
        existing_emps = {e.employee_code: e for e in (await session.execute(select(Employee))).scalars().all()}
        
        emp_records = [
            ("EMP-1001", "Kazi", "Anisur Rahman", "anisur.kazi@apex-realestate.com", "+8801711001122", "MALE", "1975-06-12", "19752692589000121", "248911029182", "MGMT", "MD", "PERMANENT", "CORPORATE", 350000, "City Bank Ltd", "1102394857001", None),
            ("EMP-1002", "Mohammad", "Nurul Huda", "nurul.huda@apex-realestate.com", "+8801713998822", "MALE", "1980-03-22", "19802692589000145", "182938491029", "FIN", "CFO", "PERMANENT", "CORPORATE", 250000, "Standard Chartered Bank", "01192837401", None),
            ("EMP-1003", "Engr. Shamsul", "Arefin", "shamsul.arefin@apex-realestate.com", "+8801713998811", "MALE", "1982-11-15", "19822692589000188", "192837461928", "ENG", "PD", "PERMANENT", "SITE_ENGINEERING", 200000, "Eastern Bank Ltd", "1041060029384", proj_1.id if proj_1 else None),
            ("EMP-1004", "Engr. Kamal", "Hossain", "kamal.engineer@apex-realestate.com", "+8801819283746", "MALE", "1988-08-19", "19882692589000210", "283746192837", "SITE_OPS", "SE", "PERMANENT", "SITE_ENGINEERING", 85000, "Dutch-Bangla Bank Ltd", "1151010092837", proj_1.id if proj_1 else None),
            ("EMP-1005", "Engr. Tanvir", "Ahmed", "tanvir.qc@apex-realestate.com", "+8801713998844", "MALE", "1990-04-10", "19902692589000301", "384729102938", "SITE_OPS", "QA_ENG", "PERMANENT", "SITE_SUPERVISION", 75000, "BRAC Bank Ltd", "1501200938472", proj_1.id if proj_1 else None),
            ("EMP-1006", "Syed", "Mahmud Hasan", "mahmud.sales@apex-realestate.com", "+8801911223344", "MALE", "1984-09-05", "19842692589000412", "472819203948", "SALES", "HEAD_SALES", "PERMANENT", "CORPORATE", 180000, "Mutual Trust Bank Ltd", "1029384756102", None),
            ("EMP-1007", "Nusrat", "Jahan", "nusrat.sales@apex-realestate.com", "+8801722334455", "FEMALE", "1992-12-01", "19922692589000551", "563728192039", "SALES", "SR_SALES", "PERMANENT", "CORPORATE", 65000, "City Bank Ltd", "1103948572019", None),
            ("EMP-1008", "Advocate Tariqul", "Islam", "tariqul.legal@apex-realestate.com", "+8801811556677", "MALE", "1978-01-25", "19782692589000623", "674829102938", "LEGAL", "LEGAL_ADV", "PERMANENT", "CORPORATE", 140000, "Prime Bank Ltd", "2104958372019", None),
            ("EMP-1009", "Md. Maksud", "Alam, ACA", "maksud.acct@apex-realestate.com", "+8801711889900", "MALE", "1989-07-14", "19892692589000781", "785930291827", "FIN", "SR_ACCT", "PERMANENT", "CORPORATE", 70000, "Dhaka Bank Ltd", "1019283746192", None),
            ("EMP-1010", "Engr. Farhana", "Rahman", "farhana.pm@apex-realestate.com", "+8801611223344", "FEMALE", "1987-03-30", "19872692589000892", "896041382910", "ENG", "PM", "PERMANENT", "SITE_ENGINEERING", 150000, "Standard Chartered Bank", "01183749201", proj_2.id if proj_2 else None)
        ]

        seeded_employees = []
        for code, fn, ln, email, phone, gender, dob, nid, tin, dcode, descode, emptype, wfcat, basic_total, bank, acc, prjid in emp_records:
            if code not in existing_emps:
                basic_val = Decimal(str(basic_total * 0.55))
                hrent_val = Decimal(str(basic_total * 0.25))
                med_val = Decimal(str(basic_total * 0.10))
                conv_val = Decimal(str(basic_total * 0.10))
                emp = Employee(
                    organization_id=org_id,
                    employee_code=code,
                    first_name=fn,
                    last_name=ln,
                    official_email=email,
                    phone=phone,
                    gender=gender,
                    date_of_birth=date.fromisoformat(dob),
                    nid_number=nid,
                    tin_number=tin,
                    joining_date=date(2023, 1, 1),
                    confirmation_date=date(2023, 7, 1),
                    probation_months=6,
                    employment_type=emptype,
                    workforce_category=wfcat,
                    status="ACTIVE",
                    department_id=dept_map[dcode].id,
                    designation_id=desig_map[descode].id,
                    assigned_project_id=prjid,
                    bank_account_no=acc,
                    bank_name=bank,
                    basic_salary=basic_val,
                    house_rent_allowance=hrent_val,
                    medical_allowance=med_val,
                    conveyance_allowance=conv_val,
                    is_pf_eligible=True,
                    is_tax_eligible=True
                )
                session.add(emp)
                await session.flush()
                seeded_employees.append(emp)
            else:
                seeded_employees.append(existing_emps[code])
        logger.info(f"Seeded {len(seeded_employees)} Full-time Employees.")

        # -------------------------------------------------------------
        # 4. SITE LABOUR CONTRACTORS & MUSTER ROLL
        # -------------------------------------------------------------
        contractors = (await session.execute(select(SiteLabourContractor))).scalars().all()
        if not contractors:
            c1 = SiteLabourContractor(
                organization_id=org_id,
                company_name="Desh Bangla Construction Labour Consortium",
                trade_license="TRAD/DNCC/028471/2024",
                contact_person="Alhaj Mokbul Hossain",
                phone="+8801715882233",
                tax_nid="392817492019",
                trade_specialization="ROD_BINDING",
                daily_rate_default=Decimal("950.00"),
                is_active=True
            )
            c2 = SiteLabourContractor(
                organization_id=org_id,
                company_name="Bengal Finishing & Masonry Guild",
                trade_license="TRAD/DSCC/019283/2024",
                contact_person="Md. Shahidul Islam",
                phone="+8801819776655",
                tax_nid="482910394857",
                trade_specialization="MASON",
                daily_rate_default=Decimal("1100.00"),
                is_active=True
            )
            session.add_all([c1, c2])
            await session.flush()
            contractors = [c1, c2]
            logger.info("Seeded 2 Site Labour Contractors.")

        # Muster Roll Entries
        musters = (await session.execute(select(LabourMusterRoll))).scalars().all()
        if not musters and proj_1:
            today = date.today()
            for day_offset in range(7):
                mdate = today - timedelta(days=day_offset)
                m1 = LabourMusterRoll(
                    organization_id=org_id,
                    project_id=proj_1.id,
                    tower_id=tower_1.id if tower_1 else None,
                    contractor_id=contractors[0].id,
                    muster_date=mdate,
                    shift="DAY",
                    skill_type="ROD_BINDER",
                    headcount=24,
                    standard_hours=Decimal("8.0"),
                    hourly_rate=Decimal("118.75"),
                    overtime_hours=Decimal("2.0"),
                    overtime_rate=Decimal("178.12"),
                    total_amount=Decimal("27100.00"),
                    approval_status="APPROVED",
                    remarks="Mat reinforcement tying and column cage fabrication for Level 4"
                )
                m2 = LabourMusterRoll(
                    organization_id=org_id,
                    project_id=proj_1.id,
                    tower_id=tower_1.id if tower_1 else None,
                    contractor_id=contractors[1].id,
                    muster_date=mdate,
                    shift="DAY",
                    skill_type="MASON",
                    headcount=16,
                    standard_hours=Decimal("8.0"),
                    hourly_rate=Decimal("137.50"),
                    overtime_hours=Decimal("1.0"),
                    overtime_rate=Decimal("206.25"),
                    total_amount=Decimal("19800.00"),
                    approval_status="APPROVED",
                    remarks="Exterior 10-inch solid brick masonry work on Level 3"
                )
                session.add_all([m1, m2])
            await session.flush()
            logger.info("Seeded 14 Muster Roll daily attendance records.")

        # -------------------------------------------------------------
        # 5. ATTENDANCE & BIOMETRIC LOGS
        # -------------------------------------------------------------
        existing_att = (await session.execute(select(Attendance))).scalars().first()
        if not existing_att:
            today = date.today()
            for emp in seeded_employees:
                for day_offset in range(5):
                    pdate = today - timedelta(days=day_offset)
                    att = Attendance(
                        organization_id=org_id,
                        employee_id=emp.id,
                        punch_date=pdate,
                        clock_in=datetime.strptime(f"{pdate} 09:12:00", "%Y-%m-%d %H:%M:%S"),
                        clock_out=datetime.strptime(f"{pdate} 18:05:00", "%Y-%m-%d %H:%M:%S"),
                        status="PRESENT",
                        source="BIOMETRIC_DEVICE",
                        late_minutes=12 if day_offset == 1 else 0,
                        remarks="Normal punch logged"
                    )
                    session.add(att)
            await session.flush()
            logger.info("Seeded 50 employee attendance punch records.")

        # -------------------------------------------------------------
        # 6. PAYROLL RUNS & PAYSLIPS
        # -------------------------------------------------------------
        existing_payroll = (await session.execute(select(PayrollRun))).scalars().first()
        if not existing_payroll:
            cur_month = date.today().month
            cur_year = date.today().year
            
            total_gross = sum(e.basic_salary + e.house_rent_allowance + e.medical_allowance + e.conveyance_allowance for e in seeded_employees)
            total_pf = sum(e.basic_salary * Decimal("0.0833") for e in seeded_employees)
            total_tax = sum(total_gross * Decimal("0.05") for e in seeded_employees)
            total_net = total_gross - (total_pf + total_tax)

            pr = PayrollRun(
                organization_id=org_id,
                month=cur_month,
                year=cur_year,
                total_gross=total_gross,
                total_deductions=total_pf + total_tax,
                total_net=total_net,
                disbursement_date=date.today(),
                status="DISBURSED",
                approved_by_id=admin_user.id if admin_user else None
            )
            session.add(pr)
            await session.flush()

            for emp in seeded_employees:
                gross = emp.basic_salary + emp.house_rent_allowance + emp.medical_allowance + emp.conveyance_allowance
                pf = emp.basic_salary * Decimal("0.0833")
                tax = gross * Decimal("0.05")
                net = gross - (pf + tax)

                ps = Payslip(
                    payroll_run_id=pr.id,
                    employee_id=emp.id,
                    basic_salary=emp.basic_salary,
                    house_rent=emp.house_rent_allowance,
                    medical=emp.medical_allowance,
                    conveyance=emp.conveyance_allowance,
                    gross_earnings=gross,
                    pf_deduction=pf,
                    tax_tds_deduction=tax,
                    total_deductions=pf + tax,
                    net_payable=net,
                    payment_status="PAID"
                )
                session.add(ps)
            await session.flush()
            logger.info("Seeded Monthly Payroll Run with 10 payslips.")

        # -------------------------------------------------------------
        # 7. CWIP CAPITALIZATION & COST CENTERS
        # -------------------------------------------------------------
        existing_fisc = (await session.execute(select(FiscalYear))).scalars().first()
        if not existing_fisc:
            fy1 = FiscalYear(
                organization_id=org_id,
                year_name="FY-2025-2026",
                start_date=date(2025, 7, 1),
                end_date=date(2026, 6, 30),
                is_closed=False
            )
            session.add(fy1)
            await session.flush()

        # Cost Centers
        existing_cc = (await session.execute(select(CostCenter))).scalars().all()
        if len(existing_cc) < 3 and proj_1:
            cc1 = CostCenter(
                organization_id=org_id,
                project_id=proj_1.id,
                tower_id=tower_1.id if tower_1 else None,
                cost_center_code="CC-GRD-SUB",
                name="Grand Emerald: Substructure & Deep Foundation Piling",
                wbs_stage="SUBSTRUCTURE"
            )
            cc2 = CostCenter(
                organization_id=org_id,
                project_id=proj_1.id,
                tower_id=tower_1.id if tower_1 else None,
                cost_center_code="CC-GRD-SUP",
                name="Grand Emerald: Superstructure RCC Frame Level 1-14",
                wbs_stage="SUPERSTRUCTURE"
            )
            cc3 = CostCenter(
                organization_id=org_id,
                project_id=proj_1.id,
                tower_id=tower_1.id if tower_1 else None,
                cost_center_code="CC-GRD-FIN",
                name="Grand Emerald: Architectural Finishing & Façade",
                wbs_stage="FINISHING"
            )
            session.add_all([cc1, cc2, cc3])
            await session.flush()
            logger.info("Seeded 3 Multi-Project Cost Centers.")

        # CWIP Capitalizations
        existing_cwip = (await session.execute(select(CWIPCapitalization))).scalars().first()
        coa_cwip = (await session.execute(select(ChartOfAccount).where(ChartOfAccount.account_type == "CWIP"))).scalars().first()
        coa_cogs = (await session.execute(select(ChartOfAccount).where(ChartOfAccount.account_type == "Expense"))).scalars().first()
        coa_assets = (await session.execute(select(ChartOfAccount).where(ChartOfAccount.account_type == "Asset"))).scalars().first()

        cwip_acc_id = coa_cwip.id if coa_cwip else (coa_assets.id if coa_assets else 1)
        cogs_acc_id = coa_cogs.id if coa_cogs else (coa_assets.id if coa_assets else 1)

        if not existing_cwip and proj_1:
            cwip1 = CWIPCapitalization(
                organization_id=org_id,
                project_id=proj_1.id,
                capitalization_date=date(2026, 3, 1),
                cwip_account_id=cwip_acc_id,
                cogs_account_id=cogs_acc_id,
                capitalized_amount=Decimal("45000000.00"),
                completion_percentage=Decimal("100.00"),
                remarks="Substructure & basement piling successfully capitalized"
            )
            session.add(cwip1)
            await session.flush()
            logger.info("Seeded CWIP Capitalization record.")

        # -------------------------------------------------------------
        # 8. BI EXECUTIVE SNAPSHOTS
        # -------------------------------------------------------------
        existing_snap = (await session.execute(select(ExecutiveSnapshot))).scalars().first()
        if not existing_snap:
            snap1 = ExecutiveSnapshot(
                snapshot_date=date.today(),
                total_portfolio_asset_value=Decimal("8500000000.00"), # 850 Crore BDT
                total_sold_inventory_value=Decimal("5400000000.00"),  # 540 Crore BDT
                total_unsold_inventory_value=Decimal("3100000000.00"), # 310 Crore BDT
                units_sold_count=48,
                units_unsold_count=19,
                cash_runway_90d_inflow=Decimal("420000000.00"),
                cash_runway_90d_outflow=Decimal("280000000.00"),
                net_cash_runway_90d=Decimal("140000000.00"),
                cash_runway_180d_inflow=Decimal("850000000.00"),
                cash_runway_180d_outflow=Decimal("560000000.00"),
                net_cash_runway_180d=Decimal("290000000.00"),
                average_sales_velocity_days=Decimal("42.50"),
                overall_spi=Decimal("1.04"),
                overall_cpi=Decimal("1.08")
            )
            session.add(snap1)
            await session.flush()
            logger.info("Seeded Executive BI Snapshot for Board.")

        await session.commit()

    logger.info("=================================================================")
    logger.info("ALL DEMO DATA PREPARATION COMPLETED SUCCESSFULLY FOR TOMORROW's CLIENT DEMO!")
    logger.info("=================================================================")

if __name__ == "__main__":
    asyncio.run(seed_hrms_and_executive())
