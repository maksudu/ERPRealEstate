import asyncio
from datetime import date, timedelta
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.modules.land.models import LandBank
from app.modules.projects.models import Project, Tower, AuthorityClearance, BOQItem, Drawing
from app.modules.projects.schemas import calculate_dhaka_far_2008

async def seed_projects_data():
    print("Starting Projects, Permits, Spatial Towers & BOQ Seeding...")
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        st = select(Project).where(Project.project_code == "PRJ-GULSHAN-AVENUE")
        res = await session.execute(st)
        if res.scalar_one_or_none():
            print("Project demo data already exists. Skipping.")
            return

        # 1. Fetch Land Bank parcel for Gulshan
        lb_st = select(LandBank).where(LandBank.project_code == "PRJ-GULSHAN-AVENUE")
        lb_res = await session.execute(lb_st)
        gulshan_land = lb_res.scalar_one_or_none()

        plot_sqft = float(gulshan_land.total_area_sqft) if gulshan_land else 13320.0
        far_calc = calculate_dhaka_far_2008(plot_area_sqft=plot_sqft, road_width_feet=60.0)

        # Create Project 1: The Grand Emerald Tower (Gulshan-2)
        project_1 = Project(
            land_bank_id=gulshan_land.id if gulshan_land else None,
            project_code="PRJ-GULSHAN-AVENUE",
            project_name="The Grand Emerald Residences & Suites",
            development_authority_id="RAJUK",
            far_allocated=far_calc["permissible_far"],
            mgc_percent=far_calc["mgc_percent"],
            road_width_feet=60.0,
            plot_area_sqft=plot_sqft,
            total_builtup_area_sqft=far_calc["max_permissible_builtup_sqft"],
            total_saleable_area_sqft=far_calc["estimated_saleable_sqft"],
            planned_handover_date=date.today() + timedelta(days=1080),
            status="UNDER_CONSTRUCTION",
            description="Ultra-luxury 2B+G+18 storey residential landmark overlooking Gulshan North Lake."
        )
        session.add(project_1)
        await session.flush()

        # Towers for Project 1
        tower_1 = Tower(
            project_id=project_1.id,
            tower_code="TOWER-A",
            tower_name="Lake-View Signature Tower",
            basement_floors=2,
            residential_floors=18,
            commercial_floors=0,
            total_lifts=3
        )
        session.add(tower_1)
        await session.flush()

        # Authority Clearances (RAJUK, CDA, Fire NOC, Aviation, etc.)
        clearances_1 = [
            AuthorityClearance(
                project_id=project_1.id,
                clearance_type_id="LUC",
                application_memo_no="RAJUK/LUC/2025/908",
                approved_memo_no="RAJUK/LUC/APP/1402",
                approval_date=date.today() - timedelta(days=200),
                expiry_date=date.today() + timedelta(days=800),
                status="APPROVED",
                remarks="Land Use Clearance for Residential Tower validated"
            ),
            AuthorityClearance(
                project_id=project_1.id,
                clearance_type_id="AVIATION_HEIGHT",
                application_memo_no="CAAB/NOC/2025/1102",
                approved_memo_no="CAAB/PERMIT/884",
                approval_date=date.today() - timedelta(days=150),
                expiry_date=date.today() + timedelta(days=900),
                status="APPROVED",
                remarks="Civil Aviation permitted maximum height: 215 ft MSL"
            ),
            AuthorityClearance(
                project_id=project_1.id,
                clearance_type_id="FIRE_NOC",
                application_memo_no="FSCD/DHK/2025/441",
                approved_memo_no="FSCD/NOC/8901",
                approval_date=date.today() - timedelta(days=90),
                expiry_date=date.today() + timedelta(days=275),
                status="APPROVED",
                remarks="Dual fire escape staircases & automatic sprinkler layout certified"
            ),
            AuthorityClearance(
                project_id=project_1.id,
                clearance_type_id="BUILDING_PLAN",
                application_memo_no="RAJUK/BP/2025/7841",
                approved_memo_no="RAJUK/BP/APPR/3309",
                approval_date=date.today() - timedelta(days=45),
                expiry_date=date.today() + timedelta(days=1050),
                status="APPROVED",
                remarks="Full Building Plan & Structural Layout approved by BC Committee"
            ),
            AuthorityClearance(
                project_id=project_1.id,
                clearance_type_id="ENVIRONMENTAL",
                application_memo_no="DOE/ENV/2026/092",
                status="IN_REVIEW",
                remarks="Site inspection completed by Department of Environment"
            ),
            AuthorityClearance(
                project_id=project_1.id,
                clearance_type_id="WASA",
                application_memo_no="DWASA/MODS-5/2026/301",
                status="SUBMITTED",
                remarks="Deep tube-well and drainage connection clearance applied"
            )
        ]
        session.add_all(clearances_1)

        # BOQ Line Items (Rod 500W, Cement, Sand, Stone Chips, Bricks)
        boq_items_1 = [
            BOQItem(
                project_id=project_1.id,
                tower_id=tower_1.id,
                wbs_phase_id="SUB_STRUCTURE",
                material_category_id="REBAR_500W",
                item_description="BSRM / AKS 500W Deformed High-Yield Rebar (16mm to 32mm)",
                unit_of_measure_id="TON",
                estimated_quantity=450.00,
                estimated_unit_rate=98500.00,
                total_estimated_cost=44325000.00,
                actual_consumed_quantity=180.00
            ),
            BOQItem(
                project_id=project_1.id,
                tower_id=tower_1.id,
                wbs_phase_id="SUB_STRUCTURE",
                material_category_id="CEMENT_OPC",
                item_description="Shah / Seven Rings Portland Composite Cement (OPC Grade)",
                unit_of_measure_id="BAG",
                estimated_quantity=18000.00,
                estimated_unit_rate=540.00,
                total_estimated_cost=9720000.00,
                actual_consumed_quantity=7500.00
            ),
            BOQItem(
                project_id=project_1.id,
                tower_id=tower_1.id,
                wbs_phase_id="SUPER_STRUCTURE",
                material_category_id="STONE_CHIPS",
                item_description="Pakur Black Hard Stone Chips (3/4 inch graded)",
                unit_of_measure_id="CFT",
                estimated_quantity=65000.00,
                estimated_unit_rate=225.00,
                total_estimated_cost=14625000.00,
                actual_consumed_quantity=22000.00
            ),
            BOQItem(
                project_id=project_1.id,
                tower_id=tower_1.id,
                wbs_phase_id="SUPER_STRUCTURE",
                material_category_id="SAND_FM_2_5",
                item_description="Sylhet Coarse Sand (FM 2.50 to 2.80)",
                unit_of_measure_id="CFT",
                estimated_quantity=42000.00,
                estimated_unit_rate=65.00,
                total_estimated_cost=2730000.00,
                actual_consumed_quantity=14000.00
            ),
            BOQItem(
                project_id=project_1.id,
                tower_id=tower_1.id,
                wbs_phase_id="BRICK_WORK",
                material_category_id="BRICKS_AUTO",
                item_description="Gas-fired Automatic Solid Clay Bricks (1st Class)",
                unit_of_measure_id="THOUSAND_NOS",
                estimated_quantity=120.00,
                estimated_unit_rate=14500.00,
                total_estimated_cost=1740000.00,
                actual_consumed_quantity=15.00
            )
        ]
        session.add_all(boq_items_1)

        # Drawings with Revision Management (R0 revoked, R1 IFC active)
        drawings_1 = [
            Drawing(
                project_id=project_1.id,
                drawing_category_id="STRUCTURAL",
                drawing_number="STR-COL-001",
                drawing_title="Mat Foundation & Basement Column Layout",
                revision_number="R0",
                is_approved_for_construction=False,
                revision_notes="Superseded by R1 revised column load calculations"
            ),
            Drawing(
                project_id=project_1.id,
                drawing_category_id="STRUCTURAL",
                drawing_number="STR-COL-001",
                drawing_title="Mat Foundation & Basement Column Layout",
                revision_number="R1",
                is_approved_for_construction=True,
                approved_by="Chief Structural Consultant Engr. Shamsul Haque",
                approval_date=date.today() - timedelta(days=20),
                revision_notes="IFC: Issued for Construction approved by Project Director"
            )
        ]
        session.add_all(drawings_1)

        await session.commit()
        print("Project Master, Spatial Towers, Clearances & BOQ seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_projects_data())
