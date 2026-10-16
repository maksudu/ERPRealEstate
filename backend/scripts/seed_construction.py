import asyncio
import logging
from datetime import date, timedelta
from sqlalchemy.future import select
from app.core.database import engine, Base, AsyncSessionLocal
import app.modules.construction.models
from app.modules.construction.models import Subcontractor, DPRReport, LaborMuster, WorkOrder, RABill
from app.modules.projects.models import Project, Tower
from app.modules.auth.models import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_construction")

async def seed_construction_data():
    logger.info("Initializing database schema for Construction tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if contractors already exist
        check = await session.execute(select(Subcontractor))
        if check.scalars().first():
            logger.info("Construction data already seeded. Skipping.")
            return

        projects = (await session.execute(select(Project).order_by(Project.id.asc()))).scalars().all()
        towers = (await session.execute(select(Tower).order_by(Tower.id.asc()))).scalars().all()
        users = (await session.execute(select(User).order_by(User.id.asc()))).scalars().all()

        if not projects:
            logger.error("Projects not found. Seed them first.")
            return

        proj = projects[0]
        tower = towers[0] if towers else None
        engineer = users[0] if users else None

        # 1. Seed Subcontractors
        c1 = Subcontractor(
            contractor_code="CONT-0001",
            company_name="M/S Standard Civil Builders & Engineering",
            trade_specialization="CIVIL_STRUCTURE",
            contact_person="Alhaj Mokbul Hossain",
            primary_phone="+8801711889900",
            tin_number="128892109212",
            bin_number="001882910-0101"
        )
        c2 = Subcontractor(
            contractor_code="CONT-0002",
            company_name="Dhaka Steel & Rod Binding Works",
            trade_specialization="ROD_BINDING",
            contact_person="Md. Shahidul Islam",
            primary_phone="+8801819223344",
            tin_number="218892109333",
            bin_number="002991821-0202"
        )
        session.add_all([c1, c2])
        await session.flush()

        # 2. Seed DPR Reports & Labor Muster
        dpr1 = DPRReport(
            project_id=proj.id,
            tower_id=tower.id if tower else None,
            report_date=date.today() - timedelta(days=1),
            weather_condition_id="SUNNY",
            site_engineer_id=engineer.id if engineer else None,
            structural_activity_summary="Casting of 4th Floor Main Column (C1-C16) and Shear Wall SW-1. Slump test 120mm verified.",
            concrete_casting_cft=2850.00,
            steel_rod_consumed_mt=18.450,
            cement_consumed_bags=680,
            total_workers_onsite=42,
            status="APPROVED_BY_PM"
        )
        session.add(dpr1)
        await session.flush()

        labor_entries = [
            LaborMuster(dpr_id=dpr1.id, contractor_id=c1.id, trade_category="Mason", worker_count=12, daily_wage_rate=950.00, total_wage=11400.00),
            LaborMuster(dpr_id=dpr1.id, contractor_id=c2.id, trade_category="Rod-binder", worker_count=16, daily_wage_rate=900.00, total_wage=14400.00),
            LaborMuster(dpr_id=dpr1.id, contractor_id=c1.id, trade_category="Carpenter", worker_count=8, daily_wage_rate=900.00, total_wage=7200.00),
            LaborMuster(dpr_id=dpr1.id, contractor_id=c1.id, trade_category="Helper", worker_count=6, daily_wage_rate=650.00, total_wage=3900.00)
        ]
        session.add_all(labor_entries)

        # 3. Seed Work Order with statutory 5% retention and 12-month DLP
        wo1 = WorkOrder(
            project_id=proj.id,
            contractor_id=c1.id,
            work_order_no="WO-2026-0001",
            contract_type="CIVIL_SUPERSTRUCTURE",
            total_contract_value=45000000.00,
            retention_money_percent=5.00,
            defect_liability_months=12,
            status="ACTIVE",
            scope_of_work="Complete RCC Super-structure from Ground to 14th Floor including shuttering, concreting, and deshutting."
        )
        session.add(wo1)
        await session.flush()

        # 4. Seed RA Bill with formula calculation
        gross_certified = 4200000.00
        retention = gross_certified * 0.05 # 210,000 (5%)
        advance_rec = 200000.00
        tds_52 = gross_certified * 0.05 # 210,000 (Sec 52 TDS)
        vds = gross_certified * 0.05 # 210,000 (VDS)
        net_pay = gross_certified - retention - advance_rec - tds_52 - vds # 3,370,000

        ra1 = RABill(
            work_order_id=wo1.id,
            ra_bill_number="RA-BILL-01",
            bill_date=date.today() - timedelta(days=5),
            gross_work_certified_amount=gross_certified,
            retention_money_deducted=retention,
            advance_recovery_deducted=advance_rec,
            tds_withheld_amount=tds_52,
            vds_withheld_amount=vds,
            net_payable_amount=net_pay,
            status="ACCOUNTS_VOUCHER_POSTED",
            accounts_journal_voucher_ref=f"JV-CONT-0001-{date.today().year}",
            remarks="4th Floor slab casting & columns certified by QS. Liability voucher posted."
        )
        session.add(ra1)

        await session.commit()
        logger.info("Successfully seeded Construction Subcontractors, DPR Diary, Labor Muster, Work Orders, and RA Bills!")

if __name__ == "__main__":
    asyncio.run(seed_construction_data())
