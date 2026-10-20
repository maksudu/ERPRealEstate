import asyncio
import app.main
from app.core.database import AsyncSessionLocal
from app.modules.projects.models import Project, Tower
from app.modules.inventory.models import Unit
from sqlalchemy import select

async def seed():
    async with AsyncSessionLocal() as s:
        # Check or create PRJ-001
        res = await s.execute(select(Project).where(Project.project_code == 'PRJ-001'))
        p1 = res.scalar_one_or_none()
        if not p1:
            p1 = Project(
                project_code='PRJ-001',
                project_name='Green Valley Residence',
                project_category='Residential',
                status='IN_PROGRESS',
                district='Dhaka',
                thana_upazila='Gulshan',
                site_address='Road 11, Block D, Gulshan-1, Dhaka'
            )
            s.add(p1)
            await s.flush()
        
        # Check or create PRJ-002
        res = await s.execute(select(Project).where(Project.project_code == 'PRJ-002'))
        p2 = res.scalar_one_or_none()
        if not p2:
            p2 = Project(
                project_code='PRJ-002',
                project_name='Blue Commercial Centre',
                project_category='Commercial',
                status='IN_PROGRESS',
                district='Dhaka',
                thana_upazila='Banani',
                site_address='Kamal Ataturk Avenue, Banani, Dhaka'
            )
            s.add(p2)
            await s.flush()

        # Check or create PRJ-003
        res = await s.execute(select(Project).where(Project.project_code == 'PRJ-003'))
        p3 = res.scalar_one_or_none()
        if not p3:
            p3 = Project(
                project_code='PRJ-003',
                project_name='Lake View Heights',
                project_category='Luxury Residential',
                status='COMPLETED',
                district='Dhaka',
                thana_upazila='Dhanmondi',
                site_address='Road 32, Dhanmondi Lakefront, Dhaka'
            )
            s.add(p3)
            await s.flush()

        # Towers for P1
        res = await s.execute(select(Tower).where(Tower.project_id == p1.id, Tower.tower_name == 'Tower A'))
        t1_a = res.scalar_one_or_none()
        if not t1_a:
            t1_a = Tower(project_id=p1.id, tower_code='TWA', tower_name='Tower A', total_floors=15)
            s.add(t1_a)
            await s.flush()

        res = await s.execute(select(Tower).where(Tower.project_id == p1.id, Tower.tower_name == 'Tower B'))
        t1_b = res.scalar_one_or_none()
        if not t1_b:
            t1_b = Tower(project_id=p1.id, tower_code='TWB', tower_name='Tower B', total_floors=12)
            s.add(t1_b)
            await s.flush()

        # Tower for P2
        res = await s.execute(select(Tower).where(Tower.project_id == p2.id, Tower.tower_name == 'Commercial Tower'))
        t2_c = res.scalar_one_or_none()
        if not t2_c:
            t2_c = Tower(project_id=p2.id, tower_code='CTW', tower_name='Commercial Tower', total_floors=20)
            s.add(t2_c)
            await s.flush()

        # Tower for P3
        res = await s.execute(select(Tower).where(Tower.project_id == p3.id, Tower.tower_name == 'Tower A'))
        t3_a = res.scalar_one_or_none()
        if not t3_a:
            t3_a = Tower(project_id=p3.id, tower_code='TWA3', tower_name='Tower A', total_floors=18)
            s.add(t3_a)
            await s.flush()

        # 6 Sample Units
        sample_units = [
            {
                'unit_number': 'A-801',
                'project_id': p1.id,
                'tower_id': t1_a.id,
                'floor_number': 8,
                'unit_type_id': 'Apartment',
                'facing_id': 'South facing',
                'bed_count': 3,
                'bath_count': 3,
                'balcony_count': 2,
                'net_carpet_area_sqft': 1220.00,
                'gross_saleable_area_sqft': 1450.00,
                'base_rate_per_sqft': 8500.00,
                'floor_escalation_rate': 0.00,
                'facing_premium_rate': 0.00,
                'effective_rate_per_sqft': 8500.00,
                'total_unit_price': 12325000.00,
                'parking_charge': 500000.00,
                'status_id': 'Available',
            },
            {
                'unit_number': 'A-802',
                'project_id': p1.id,
                'tower_id': t1_a.id,
                'floor_number': 8,
                'unit_type_id': 'Apartment',
                'facing_id': 'East facing',
                'bed_count': 3,
                'bath_count': 2,
                'balcony_count': 2,
                'net_carpet_area_sqft': 1050.00,
                'gross_saleable_area_sqft': 1250.00,
                'base_rate_per_sqft': 8200.00,
                'floor_escalation_rate': 0.00,
                'facing_premium_rate': 0.00,
                'effective_rate_per_sqft': 8200.00,
                'total_unit_price': 10250000.00,
                'parking_charge': 500000.00,
                'status_id': 'Reserved',
            },
            {
                'unit_number': 'B-502',
                'project_id': p1.id,
                'tower_id': t1_b.id,
                'floor_number': 5,
                'unit_type_id': 'Apartment',
                'facing_id': 'North facing',
                'bed_count': 2,
                'bath_count': 2,
                'balcony_count': 1,
                'net_carpet_area_sqft': 920.00,
                'gross_saleable_area_sqft': 1100.00,
                'base_rate_per_sqft': 7800.00,
                'floor_escalation_rate': 0.00,
                'facing_premium_rate': 0.00,
                'effective_rate_per_sqft': 7800.00,
                'total_unit_price': 8580000.00,
                'parking_charge': 0.00,
                'status_id': 'Booked',
            },
            {
                'unit_number': 'C-305',
                'project_id': p2.id,
                'tower_id': t2_c.id,
                'floor_number': 3,
                'unit_type_id': 'Commercial Unit',
                'facing_id': 'West facing',
                'bed_count': 0,
                'bath_count': 1,
                'balcony_count': 0,
                'net_carpet_area_sqft': 780.00,
                'gross_saleable_area_sqft': 900.00,
                'base_rate_per_sqft': 12500.00,
                'floor_escalation_rate': 0.00,
                'facing_premium_rate': 0.00,
                'effective_rate_per_sqft': 12500.00,
                'total_unit_price': 11250000.00,
                'parking_charge': 600000.00,
                'status_id': 'Available',
            },
            {
                'unit_number': 'S-104',
                'project_id': p2.id,
                'tower_id': t2_c.id,
                'floor_number': 1,
                'unit_type_id': 'Shop',
                'facing_id': 'South facing',
                'bed_count': 0,
                'bath_count': 1,
                'balcony_count': 0,
                'net_carpet_area_sqft': 480.00,
                'gross_saleable_area_sqft': 550.00,
                'base_rate_per_sqft': 15000.00,
                'floor_escalation_rate': 0.00,
                'facing_premium_rate': 0.00,
                'effective_rate_per_sqft': 15000.00,
                'total_unit_price': 8250000.00,
                'parking_charge': 0.00,
                'status_id': 'Sold',
            },
            {
                'unit_number': 'A-1202',
                'project_id': p3.id,
                'tower_id': t3_a.id,
                'floor_number': 12,
                'unit_type_id': 'Apartment',
                'facing_id': 'South facing',
                'bed_count': 4,
                'bath_count': 4,
                'balcony_count': 3,
                'net_carpet_area_sqft': 1550.00,
                'gross_saleable_area_sqft': 1800.00,
                'base_rate_per_sqft': 9800.00,
                'floor_escalation_rate': 0.00,
                'facing_premium_rate': 0.00,
                'effective_rate_per_sqft': 9800.00,
                'total_unit_price': 17640000.00,
                'parking_charge': 600000.00,
                'status_id': 'Handed Over',
            }
        ]

        for u_data in sample_units:
            res = await s.execute(select(Unit).where(Unit.project_id == u_data['project_id'], Unit.unit_number == u_data['unit_number']))
            existing = res.scalar_one_or_none()
            if not existing:
                u = Unit(**u_data)
                s.add(u)
        
        await s.commit()
        print('Sample units seeded successfully!')

if __name__ == '__main__':
    asyncio.run(seed())
