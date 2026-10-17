import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import logging
from datetime import date, timedelta
from decimal import Decimal
import random

from sqlalchemy import select, func, text
from app.core.database import engine, Base, AsyncSessionLocal

# Import all models to ensure metadata is populated and FKs resolved
from app.modules.auth.models import Organization, Role, User, UserProjectAssignment
from app.modules.land.models import LandBank, Landowner, SurveyRecord, JVAgreement, JVUnitAllocation
from app.modules.projects.models import Project, Tower, AuthorityClearance, BOQItem, Drawing
from app.modules.inventory.models import Unit, ParkingBay
from app.modules.crm.models import Lead, LeadActivity, Customer, Nominee
from app.modules.sales.models import Booking, BookingCancellation, UnitTransfer
from app.modules.installments.models import CustomerInstallment, PDCVault, NI138LegalAction
from app.modules.construction.models import Subcontractor, DPRReport, LaborMuster, WorkOrder, RABill, ConcreteCubeTest, SafetyNCR
from app.modules.procurement.models import Vendor, MaterialItem, SiteStore, StoreStock, PurchaseRequisition, ComparativeStatement, CSQuotation, PurchaseOrder, GoodsReceipt
from app.modules.accounts.models import ChartOfAccount, Voucher, JournalEntry, BankReconciliation, MushakTaxInvoice, TDSDeduction
from app.modules.handover.models import HandoverInspection, DLPTicket, OwnersAssociation, LeaseAgreement
from app.modules.operations.models import Broker, BrokerCommission, CourtCase, MachineryAsset, ImportBatch

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("seed_dashboard_portfolio")

# Comprehensive List of 24 High-Profile Projects across Dhaka & Chattogram
PORTFOLIO_PROJECTS = [
    {"code": "PRJ-GLS-001", "name": "The Grand Emerald Residences & Suites", "loc": "Gulshan-2, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 4.5, "budget_cr": 14.5, "spent_cr": 8.2, "units": 60, "ontrack": True, "comp_pct": 68},
    {"code": "PRJ-BNI-002", "name": "Banani Signature Commercial Hub", "loc": "Road 11, Banani, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 5.5, "budget_cr": 22.0, "spent_cr": 12.8, "units": 72, "ontrack": True, "comp_pct": 58},
    {"code": "PRJ-DHN-003", "name": "Dhanmondi Lakeview Horizon Towers", "loc": "Road 27, Dhanmondi, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 4.2, "budget_cr": 11.5, "spent_cr": 6.8, "units": 54, "ontrack": True, "comp_pct": 62},
    {"code": "PRJ-UTT-004", "name": "Uttara Sector-7 Sky Crest", "loc": "Sector 7, Uttara, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 3.8, "budget_cr": 9.2, "spent_cr": 5.1, "units": 48, "ontrack": True, "comp_pct": 55},
    {"code": "PRJ-BSH-005", "name": "Bashundhara Diplomatic Enclave", "loc": "Block I, Bashundhara R/A", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 4.0, "budget_cr": 13.0, "spent_cr": 7.5, "units": 64, "ontrack": True, "comp_pct": 60},
    {"code": "PRJ-BRD-006", "name": "Baridhara Ambassadorial Villa", "loc": "Baridhara DOHS, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 3.2, "budget_cr": 16.0, "spent_cr": 9.4, "units": 36, "ontrack": True, "comp_pct": 72},
    {"code": "PRJ-MIR-007", "name": "Mirpur Metro Heights Tower", "loc": "Mirpur-10 Circle, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 4.0, "budget_cr": 8.5, "spent_cr": 5.9, "units": 56, "ontrack": False, "comp_pct": 42},
    {"code": "PRJ-MHN-008", "name": "Mohakhali South Avenue Square", "loc": "Mohakhali C/A, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 5.0, "budget_cr": 15.5, "spent_cr": 8.9, "units": 60, "ontrack": True, "comp_pct": 65},
    {"code": "PRJ-CTG-009", "name": "Chattogram GEC Bay Vista", "loc": "GEC Circle, Chattogram", "auth": "CDA", "status": "UNDER_CONSTRUCTION", "far": 4.2, "budget_cr": 12.0, "spent_cr": 7.1, "units": 52, "ontrack": True, "comp_pct": 52},
    {"code": "PRJ-CTG-010", "name": "Agrabad Commercial Gateway", "loc": "Agrabad C/A, Chattogram", "auth": "CDA", "status": "UNDER_CONSTRUCTION", "far": 6.0, "budget_cr": 18.0, "spent_cr": 11.2, "units": 70, "ontrack": True, "comp_pct": 64},
    {"code": "PRJ-SYL-011", "name": "Sylhet Oasis Valley Heights", "loc": "Subidbazar, Sylhet", "auth": "RDA", "status": "UNDER_CONSTRUCTION", "far": 3.5, "budget_cr": 7.5, "spent_cr": 3.9, "units": 40, "ontrack": True, "comp_pct": 50},
    {"code": "PRJ-KHN-012", "name": "Khulna Shibbari Central Trade Center", "loc": "Shibbari Circle, Khulna", "auth": "KDA", "status": "UNDER_CONSTRUCTION", "far": 4.0, "budget_cr": 6.8, "spent_cr": 4.5, "units": 38, "ontrack": False, "comp_pct": 40},
    {"code": "PRJ-GLS-013", "name": "Gulshan Avenue Royal Palm", "loc": "Gulshan-1, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 4.8, "budget_cr": 14.0, "spent_cr": 7.8, "units": 50, "ontrack": True, "comp_pct": 66},
    {"code": "PRJ-BNI-014", "name": "Banani Lakefront Luxury Lofts", "loc": "Road 23, Banani, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 4.0, "budget_cr": 12.5, "spent_cr": 6.2, "units": 44, "ontrack": True, "comp_pct": 56},
    {"code": "PRJ-DHN-015", "name": "Dhanmondi Satmasjid Point", "loc": "Satmasjid Road, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 4.5, "budget_cr": 10.5, "spent_cr": 7.4, "units": 48, "ontrack": False, "comp_pct": 48},
    {"code": "PRJ-UTT-016", "name": "Uttara Third Phase Urban City", "loc": "Sector 18, Uttara, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 3.5, "budget_cr": 9.0, "spent_cr": 4.8, "units": 55, "ontrack": True, "comp_pct": 53},
    {"code": "PRJ-PBD-017", "name": "Purbachal Sector-4 Eco Sanctuary", "loc": "Sector 4, Purbachal Smart City", "auth": "RAJUK", "status": "PLANNING", "far": 3.0, "budget_cr": 8.0, "spent_cr": 1.2, "units": 65, "ontrack": True, "comp_pct": 15},
    {"code": "PRJ-PBD-018", "name": "Purbachal Central Boulevard", "loc": "Sector 17, Purbachal Smart City", "auth": "RAJUK", "status": "PLANNING", "far": 4.0, "budget_cr": 10.0, "spent_cr": 1.5, "units": 70, "ontrack": True, "comp_pct": 18},
    {"code": "PRJ-TEJ-019", "name": "Tejgaon Commercial Tech Park", "loc": "Tejgaon I/A, Dhaka", "auth": "RAJUK", "status": "PERMIT_PENDING", "far": 5.5, "budget_cr": 20.0, "spent_cr": 2.8, "units": 80, "ontrack": True, "comp_pct": 20},
    {"code": "PRJ-PAN-020", "name": "Panthapath Prime Tower", "loc": "Panthapath, Green Road, Dhaka", "auth": "RAJUK", "status": "UNDER_CONSTRUCTION", "far": 4.8, "budget_cr": 11.0, "spent_cr": 5.8, "units": 45, "ontrack": True, "comp_pct": 61},
    {"code": "PRJ-LAL-021", "name": "Lalmatia Classical Residence", "loc": "Block B, Lalmatia, Dhaka", "auth": "RAJUK", "status": "HANDOVER_PHASE", "far": 3.5, "budget_cr": 7.0, "spent_cr": 6.8, "units": 32, "ontrack": True, "comp_pct": 95},
    {"code": "PRJ-SHR-022", "name": "Sher-e-Bangla Nagar Gardenia", "loc": "Agargaon Link Road, Dhaka", "auth": "RAJUK", "status": "HANDOVER_PHASE", "far": 3.8, "budget_cr": 8.0, "spent_cr": 7.6, "units": 38, "ontrack": True, "comp_pct": 92},
    {"code": "PRJ-MOT-023", "name": "Motijheel Financial Skyline", "loc": "Motijheel C/A, Dhaka", "auth": "RAJUK", "status": "COMPLETED", "far": 6.5, "budget_cr": 25.0, "spent_cr": 24.2, "units": 75, "ontrack": True, "comp_pct": 100},
    {"code": "PRJ-ESK-024", "name": "New Eskaton Heritage Heights", "loc": "New Eskaton Road, Dhaka", "auth": "RAJUK", "status": "COMPLETED", "far": 3.8, "budget_cr": 9.5, "spent_cr": 9.2, "units": 42, "ontrack": True, "comp_pct": 100},
]

# Defaulters from uploaded design mockups & prominent buyers
DEFAULTERS_SEED = [
    {"name": "Esther Howard", "units": "1003", "phone": "+8801711002233", "overdue": 200000.0, "days": 432, "status": "LEGAL_NOTICE_SENT"},
    {"name": "Lucas Grozman", "units": "201, 1004", "phone": "+8801819556677", "overdue": 23000.0, "days": 14, "status": "FIRST_REMINDER"},
    {"name": "Dianne Russell", "units": "103", "phone": "+8801914223344", "overdue": 1000000.0, "days": 320, "status": "FINAL_WARNING"},
    {"name": "Annette Black", "units": "502", "phone": "+8801712998877", "overdue": 300000.0, "days": 180, "status": "CALL_SCHEDULED"},
    {"name": "Barrister Rafiqul Islam", "units": "1201, 1202", "phone": "+8801711223344", "overdue": 4500000.0, "days": 95, "status": "SECOND_REMINDER"},
    {"name": "Dr. Shireen Akhter", "units": "804", "phone": "+8801819988776", "overdue": 1500000.0, "days": 45, "status": "SMS_SENT"},
    {"name": "Engr. Maksudul Haque", "units": "602", "phone": "+8801914556677", "overdue": 850000.0, "days": 28, "status": "PAYMENT_PROMISED"},
]

async def seed_portfolio():
    logger.info("Initializing Enterprise Real Estate Dashboard Portfolio Seeder...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Fetch organization
        org = (await session.execute(select(Organization))).scalars().first()
        org_id = org.id if org else 1

        admin_user = (await session.execute(select(User))).scalars().first()
        admin_id = admin_user.id if admin_user else 1

        # 2. Check existing projects
        existing_projects = {p.project_code: p for p in (await session.execute(select(Project))).scalars().all()}
        logger.info(f"Currently found {len(existing_projects)} existing projects in database.")

        project_objs = []
        for pdata in PORTFOLIO_PROJECTS:
            if pdata["code"] in existing_projects:
                proj = existing_projects[pdata["code"]]
                # update status/planned details
                proj.status = pdata["status"]
                proj.description = f"Prime development at {pdata['loc']}. FAR {pdata['far']}. Investment BDT {pdata['budget_cr']} Cr."
                project_objs.append(proj)
            else:
                proj = Project(
                    project_code=pdata["code"],
                    project_name=pdata["name"],
                    development_authority_id=pdata["auth"],
                    far_allocated=Decimal(str(pdata["far"])),
                    mgc_percent=Decimal("50.00"),
                    road_width_feet=Decimal("60.00"),
                    plot_area_sqft=Decimal("15000.00"),
                    total_builtup_area_sqft=Decimal(str(pdata["units"] * 1500)),
                    total_saleable_area_sqft=Decimal(str(pdata["units"] * 1250)),
                    planned_handover_date=date.today() + timedelta(days=random.randint(180, 900)),
                    status=pdata["status"],
                    description=f"Prime development at {pdata['loc']}. Approved by {pdata['auth']}. FAR: {pdata['far']}."
                )
                session.add(proj)
                await session.flush()
                project_objs.append(proj)

        await session.flush()
        logger.info(f"Total projects in portfolio: {len(project_objs)}")

        # 3. Ensure each project has at least 1 tower
        towers = []
        for proj in project_objs:
            existing_tower = (await session.execute(select(Tower).where(Tower.project_id == proj.id))).scalars().first()
            if not existing_tower:
                t = Tower(
                    project_id=proj.id,
                    tower_code=f"TWR-{proj.project_code.split('-')[-1]}",
                    tower_name=f"{proj.project_name} - Main Tower",
                    basement_floors=2,
                    residential_floors=14,
                    commercial_floors=2,
                    total_lifts=3
                )
                session.add(t)
                await session.flush()
                towers.append(t)
            else:
                towers.append(existing_tower)

        # 4. Units Generation up to 1,240 total units
        existing_unit_count = (await session.execute(select(func.count(Unit.id)))).scalar() or 0
        logger.info(f"Existing unit count: {existing_unit_count}")
        
        target_total_units = 1240
        units_needed = max(0, target_total_units - existing_unit_count)
        
        unit_types = ["TYPE_2BHK", "TYPE_3BHK", "TYPE_4BHK", "PENTHOUSE", "COMMERCIAL", "STUDIO"]
        type_distribution = ["TYPE_3BHK"] * 5 + ["TYPE_2BHK"] * 3 + ["TYPE_4BHK"] * 2 + ["COMMERCIAL"] * 1 + ["PENTHOUSE"] * 1
        facings = ["SOUTH_FACING", "NORTH_FACING", "LAKE_VIEW", "CORNER_PLOT", "ROAD_FACING"]

        if units_needed > 0:
            logger.info(f"Seeding {units_needed} units across portfolio to reach target 1,240 units...")
            units_per_proj = units_needed // len(project_objs) + 1
            added_count = 0

            for idx, proj in enumerate(project_objs):
                tower = towers[idx] if idx < len(towers) else towers[0]
                # determine how many units to add to this project
                num_to_add = min(units_per_proj, target_total_units - (existing_unit_count + added_count))
                if num_to_add <= 0:
                    break

                for u_i in range(1, num_to_add + 1):
                    floor = (u_i % 14) + 1
                    unit_char = chr(65 + (u_i % 6))
                    unit_num = f"{floor}{unit_char}"
                    u_type = random.choice(type_distribution)
                    facing = random.choice(facings)

                    sqft = Decimal(random.choice([1250, 1450, 1680, 2150, 2450, 3100]))
                    base_rate = Decimal(random.choice([11500, 13500, 16000, 18500, 22000]))
                    total_price = sqft * base_rate

                    # Target portfolio distribution:
                    # ~720 Sold, ~440 Available, 45 Reserved, 35 Booked
                    rand_val = random.random()
                    if rand_val < 0.58:
                        status_id = "SOLD"
                    elif rand_val < 0.90:
                        status_id = "AVAILABLE"
                    elif rand_val < 0.95:
                        status_id = "RESERVED"
                    else:
                        status_id = "BOOKED"

                    u = Unit(
                        project_id=proj.id,
                        tower_id=tower.id,
                        floor_number=floor,
                        unit_number=unit_num,
                        unit_type_id=u_type,
                        facing_id=facing,
                        net_carpet_area_sqft=sqft * Decimal("0.85"),
                        gross_saleable_area_sqft=sqft,
                        base_rate_per_sqft=base_rate,
                        floor_escalation_rate=Decimal("100.00"),
                        facing_premium_rate=Decimal("250.00"),
                        effective_rate_per_sqft=base_rate,
                        total_unit_price=total_price,
                        status_id=status_id,
                        is_landowner_share=(u_i % 8 == 0)
                    )
                    session.add(u)
                    added_count += 1

            await session.flush()
            logger.info(f"Added {added_count} units.")

        # 5. Customers & Bookings to match Contracted Sales Value ~185.0 Cr
        all_units = (await session.execute(select(Unit))).scalars().all()
        sold_and_booked_units = [u for u in all_units if u.status_id in ("SOLD", "BOOKED")]
        logger.info(f"Total Sold/Booked units in portfolio: {len(sold_and_booked_units)}")

        # Ensure seed customers exist
        existing_customers = (await session.execute(select(Customer))).scalars().all()
        customer_map = {c.full_name_en: c for c in existing_customers}
        
        for d in DEFAULTERS_SEED:
            if d["name"] not in customer_map:
                cust = Customer(
                    customer_code=f"CUST-{random.randint(1000, 9999)}",
                    full_name_en=d["name"],
                    full_name_bn=d["name"],
                    primary_phone=d["phone"],
                    email=f"{d['name'].lower().replace(' ', '.')}@example.com",
                    nid_number=f"19{random.randint(10000000, 99999999)}"
                )
                session.add(cust)
                await session.flush()
                customer_map[d["name"]] = cust

        all_customers = list(customer_map.values())

        # Check existing bookings
        existing_booking_count = (await session.execute(select(func.count(Booking.id)))).scalar() or 0
        logger.info(f"Existing bookings: {existing_booking_count}")

        if existing_booking_count < len(sold_and_booked_units):
            logger.info("Creating contract bookings for sold units...")
            booked_unit_ids = set((await session.execute(select(Booking.unit_id))).scalars().all())

            # Seed specific defaulters on specific units first
            for idx, d in enumerate(DEFAULTERS_SEED):
                cust = customer_map[d["name"]]
                target_unit = next((u for u in sold_and_booked_units if u.id not in booked_unit_ids), None)
                if target_unit:
                    b_ref = f"BK-2026-{9000 + idx}"
                    booking = Booking(
                        booking_reference_no=b_ref,
                        project_id=target_unit.project_id,
                        unit_id=target_unit.id,
                        primary_customer_id=cust.id,
                        booking_date=date.today() - timedelta(days=d["days"] + 60),
                        base_unit_price=target_unit.total_unit_price,
                        discount_amount=Decimal("0.00"),
                        discount_percentage=Decimal("0.00"),
                        required_approval_tier="SALES_MANAGER",
                        discount_approval_status="APPROVED",
                        final_contract_value=target_unit.total_unit_price,
                        earnest_money_received=Decimal("1000000.00"),
                        down_payment_total=Decimal("3000000.00"),
                        status="AGREEMENT_SIGNED"
                    )
                    session.add(booking)
                    await session.flush()
                    booked_unit_ids.add(target_unit.id)

                    # Create past-due installment for this defaulter
                    inst = CustomerInstallment(
                        booking_id=booking.id,
                        installment_no=1,
                        title="Milestone Installment (Past Due)",
                        due_date=date.today() - timedelta(days=d["days"]),
                        grace_period_days=15,
                        payable_amount=Decimal(str(d["overdue"])),
                        paid_amount=Decimal("0.00"),
                        late_fee_accrued=Decimal(str(d["overdue"] * 0.05)),
                        status="OVERDUE",
                        milestone_trigger="ROOF_CASTING"
                    )
                    session.add(inst)

            # Create remaining bookings
            bk_counter = 1000
            for u in sold_and_booked_units:
                if u.id not in booked_unit_ids:
                    cust = random.choice(all_customers)
                    bk_ref = f"BK-2026-{bk_counter}"
                    bk_counter += 1
                    
                    booking = Booking(
                        booking_reference_no=bk_ref,
                        project_id=u.project_id,
                        unit_id=u.id,
                        primary_customer_id=cust.id,
                        booking_date=date.today() - timedelta(days=random.randint(30, 360)),
                        base_unit_price=u.total_unit_price,
                        discount_amount=Decimal("100000.00"),
                        discount_percentage=Decimal("0.50"),
                        required_approval_tier="SALES_MANAGER",
                        discount_approval_status="APPROVED",
                        final_contract_value=u.total_unit_price - Decimal("100000.00"),
                        earnest_money_received=Decimal("1000000.00"),
                        down_payment_total=Decimal("2500000.00"),
                        status="AGREEMENT_SIGNED"
                    )
                    session.add(booking)
                    await session.flush()
                    booked_unit_ids.add(u.id)

                    # Create a paid installment and an upcoming/due installment
                    inst_paid = CustomerInstallment(
                        booking_id=booking.id,
                        installment_no=1,
                        title="Earnest Money & Booking Token",
                        due_date=booking.booking_date,
                        grace_period_days=15,
                        payable_amount=Decimal("1000000.00"),
                        paid_amount=Decimal("1000000.00"),
                        status="PAID"
                    )
                    session.add(inst_paid)

                    inst_upcoming = CustomerInstallment(
                        booking_id=booking.id,
                        installment_no=2,
                        title="Sub-Structure Casting Milestone",
                        due_date=date.today() + timedelta(days=random.randint(15, 90)),
                        grace_period_days=15,
                        payable_amount=Decimal("2000000.00"),
                        paid_amount=Decimal("0.00"),
                        status="UPCOMING"
                    )
                    session.add(inst_upcoming)

            await session.flush()
            logger.info("Bookings and installments seeded successfully.")

        # 6. Ensure BOQ items exist for project completion calculation
        for proj in project_objs:
            existing_boq = (await session.execute(select(BOQItem).where(BOQItem.project_id == proj.id))).scalars().first()
            if not existing_boq:
                # Find target completion pct from PORTFOLIO_PROJECTS
                match_p = next((p for p in PORTFOLIO_PROJECTS if p["code"] == proj.project_code), None)
                comp_pct = match_p["comp_pct"] if match_p else 55
                total_qty = Decimal("1000.00")
                done_qty = Decimal(str(total_qty * Decimal(comp_pct) / Decimal(100)))

                boq = BOQItem(
                    project_id=proj.id,
                    wbs_phase_id="SUPER_STRUCTURE",
                    material_category_id="REBAR_500W",
                    item_description="Main structural grade 500W deformed rebar work",
                    unit_of_measure_id="TON",
                    estimated_quantity=total_qty,
                    estimated_unit_rate=Decimal("98000.00"),
                    total_estimated_cost=total_qty * Decimal("98000.00"),
                    actual_consumed_quantity=done_qty
                )
                session.add(boq)

        # 7. Ensure posted expense vouchers exist for Actual Project Cost
        existing_vouchers = (await session.execute(select(Voucher))).scalars().all()
        if len(existing_vouchers) < len(project_objs):
            logger.info("Seeding project cost vouchers in general ledger...")
            for idx, proj in enumerate(project_objs):
                match_p = next((p for p in PORTFOLIO_PROJECTS if p["code"] == proj.project_code), None)
                spent_cr = match_p["spent_cr"] if match_p else 4.0
                v_num = f"VCH-EXP-{proj.project_code}-{random.randint(100, 999)}"
                v = Voucher(
                    organization_id=org_id,
                    project_id=proj.id,
                    voucher_number=v_num,
                    voucher_type="Cash_Payment",
                    voucher_date=date.today() - timedelta(days=random.randint(10, 120)),
                    narration=f"Civil construction, contractor billing and materials for {proj.project_name}",
                    total_debit_amount=Decimal(str(spent_cr * 10000000)),
                    total_credit_amount=Decimal(str(spent_cr * 10000000)),
                    status="Posted",
                    created_by_user_id=admin_id
                )
                session.add(v)

        await session.commit()
        logger.info("Portfolio database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_portfolio())
