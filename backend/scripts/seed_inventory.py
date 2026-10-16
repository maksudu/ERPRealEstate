import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.modules.projects.models import Project, Tower
from app.modules.inventory.models import Unit, ParkingBay
from app.modules.inventory.schemas import calculate_unit_pricing

async def seed_inventory_data():
    print("Starting Property Inventory & Spatial Units Seeding...")
    async with AsyncSessionLocal() as session:
        # Check if units already exist
        unit_st = select(Unit).limit(1)
        res = await session.execute(unit_st)
        if res.scalar_one_or_none():
            print("Inventory units already exist. Skipping seed.")
            return

        # Fetch Project 1 & Tower 1
        p_st = select(Project).where(Project.project_code == "PRJ-GULSHAN-AVENUE")
        p_res = await session.execute(p_st)
        project = p_res.scalar_one_or_none()
        if not project:
            print("Project not found. Run seed_projects first.")
            return

        tw_st = select(Tower).where(Tower.project_id == project.id).limit(1)
        tw_res = await session.execute(tw_st)
        tower = tw_res.scalar_one_or_none()
        if not tower:
            print("Tower not found.")
            return

        # Generate realistic floor matrix (Floors 3 to 10, 4 units per floor: A, B, C, D)
        # 3A, 4A -> Landowner Share (Permanently Locked from Sales)
        units_to_create = []
        unit_configs = [
            {"code": "A", "type": "TYPE_4BHK", "facing": "LAKE_VIEW", "carpet": 2450.0, "gross": 3150.0, "facing_prem": 750.0},
            {"code": "B", "type": "TYPE_3BHK", "facing": "SOUTH_FACING", "carpet": 1950.0, "gross": 2480.0, "facing_prem": 500.0},
            {"code": "C", "type": "TYPE_3BHK", "facing": "CORNER_PLOT", "carpet": 1820.0, "gross": 2350.0, "facing_prem": 400.0},
            {"code": "D", "type": "TYPE_3BHK", "facing": "ROAD_FACING", "carpet": 1780.0, "gross": 2250.0, "facing_prem": 200.0},
        ]

        base_sqft_rate = 14500.00 # Gulshan Avenue luxury base rate 14,500 BDT/sqft

        for floor in range(3, 11):
            floor_esc = float((floor - 3) * 150) # 150 Tk escalation per floor above 3rd
            for u_conf in unit_configs:
                u_num = f"{floor}{u_conf['code']}"
                is_lo = (floor in [3, 4] and u_conf['code'] == 'A')
                status = "LANDOWNER_SHARE" if is_lo else "AVAILABLE"

                pricing = calculate_unit_pricing(
                    gross_sqft=u_conf["gross"],
                    base_rate=base_sqft_rate,
                    floor_escalation=floor_esc,
                    facing_premium=u_conf["facing_prem"]
                )

                unit = Unit(
                    project_id=project.id,
                    tower_id=tower.id,
                    floor_number=floor,
                    unit_number=u_num,
                    unit_type_id=u_conf["type"],
                    facing_id=u_conf["facing"],
                    net_carpet_area_sqft=u_conf["carpet"],
                    gross_saleable_area_sqft=u_conf["gross"],
                    base_rate_per_sqft=base_sqft_rate,
                    floor_escalation_rate=floor_esc,
                    facing_premium_rate=u_conf["facing_prem"],
                    effective_rate_per_sqft=pricing["effective_rate_per_sqft"],
                    total_unit_price=pricing["total_unit_price"],
                    status_id=status,
                    is_landowner_share=is_lo
                )
                units_to_create.append(unit)

        session.add_all(units_to_create)
        await session.flush()

        # Seed Basement Parking Bays
        parking_bays = []
        for i in range(1, 25):
            bay_no = f"P-B1-{i:02d}"
            parking_bays.append(ParkingBay(
                project_id=project.id,
                basement_level="B1",
                bay_number=bay_no,
                parking_type_id="SINGLE_CAR",
                price=600000.00, # 6 Lac BDT
                is_allocated=False
            ))
        session.add_all(parking_bays)

        await session.commit()
        print(f"Created {len(units_to_create)} spatial units and {len(parking_bays)} parking bays successfully!")

if __name__ == "__main__":
    asyncio.run(seed_inventory_data())
