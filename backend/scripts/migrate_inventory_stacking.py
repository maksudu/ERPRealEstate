import asyncio
import json
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from app.core.database import engine

async def migrate_and_seed():
    async with engine.connect() as conn:
        print("[MIGRATE] Checking inv_units table columns...")

        # 1. Check existing columns in inv_units
        res = await conn.execute(text("DESCRIBE inv_units"))
        existing_cols = {r[0] for r in res.fetchall()}

        new_columns = [
            ("bed_count", "INT NOT NULL DEFAULT 3"),
            ("bath_count", "INT NOT NULL DEFAULT 3"),
            ("balcony_count", "INT NOT NULL DEFAULT 2"),
            ("floor_plan_image_url", "VARCHAR(512) NULL"),
            ("render_images_json", "TEXT NULL"),
            ("utility_connection_fee", "DECIMAL(12,2) NOT NULL DEFAULT 250000.00"),
            ("parking_charge", "DECIMAL(12,2) NOT NULL DEFAULT 0.00"),
            ("max_discount_amount", "DECIMAL(12,2) NOT NULL DEFAULT 150000.00"),
            ("is_merged", "TINYINT(1) NOT NULL DEFAULT 0"),
            ("merged_into_unit_id", "BIGINT(20) NULL"),
            ("parent_unit_id", "BIGINT(20) NULL"),
            ("combination_type", "VARCHAR(32) NULL"),
        ]

        for col_name, col_def in new_columns:
            if col_name not in existing_cols:
                print(f"[MIGRATE] Adding column {col_name} to inv_units...")
                await conn.execute(text(f"ALTER TABLE inv_units ADD COLUMN {col_name} {col_def}"))
                await conn.commit()
            else:
                print(f"[OK] Column {col_name} already exists.")

        # 2. Create inv_parking_slots if not exists
        print("[MIGRATE] Ensuring inv_parking_slots table exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS inv_parking_slots (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                project_id BIGINT NOT NULL,
                tower_id BIGINT NULL,
                basement_level VARCHAR(32) NOT NULL DEFAULT 'BASEMENT_1',
                slot_number VARCHAR(32) NOT NULL,
                slot_type VARCHAR(32) NOT NULL DEFAULT 'BASEMENT_1',
                price DECIMAL(14,2) NOT NULL DEFAULT 500000.00,
                status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
                assigned_unit_id BIGINT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_ps_proj (project_id),
                INDEX idx_ps_tower (tower_id),
                INDEX idx_ps_unit (assigned_unit_id),
                INDEX idx_ps_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        await conn.commit()

        # 3. Create inv_unit_combinations if not exists
        print("[MIGRATE] Ensuring inv_unit_combinations table exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS inv_unit_combinations (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                project_id BIGINT NOT NULL,
                tower_id BIGINT NOT NULL,
                operation_type VARCHAR(32) NOT NULL,
                source_unit_ids VARCHAR(255) NOT NULL,
                source_unit_numbers VARCHAR(255) NOT NULL,
                target_unit_ids VARCHAR(255) NOT NULL,
                target_unit_numbers VARCHAR(255) NOT NULL,
                combined_gross_sft DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                combined_price DECIMAL(16,2) NOT NULL DEFAULT 0.00,
                remarks TEXT NULL,
                performed_by_id BIGINT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_uc_proj (project_id),
                INDEX idx_uc_tower (tower_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        await conn.commit()

        # 4. Populate architectural metadata on existing units
        print("[MIGRATE] Updating existing units with architectural specs...")
        await conn.execute(text("""
            UPDATE inv_units
            SET 
                bed_count = CASE 
                    WHEN unit_number LIKE '%A' THEN 4
                    WHEN unit_number LIKE '%B' THEN 3
                    WHEN unit_number LIKE '%C' THEN 3
                    ELSE 3
                END,
                bath_count = CASE 
                    WHEN unit_number LIKE '%A' THEN 4
                    WHEN unit_number LIKE '%B' THEN 3
                    ELSE 3
                END,
                balcony_count = CASE 
                    WHEN unit_number LIKE '%A' THEN 3
                    ELSE 2
                END,
                floor_plan_image_url = 'assets/images/parcels/floorplan_typical.svg',
                utility_connection_fee = 250000.00,
                max_discount_amount = 150000.00
            WHERE bed_count = 3 AND floor_plan_image_url IS NULL;
        """))
        await conn.commit()

        # 5. Seed Higher Floors & Penthouse (Floors 11 to 18) for Tower 1
        print("[SEED] Seeding vertical floor elevation for Tower 1 (Floors 1, 2, 11-18)...")
        # Check if floor 18 exists
        p_res = await conn.execute(text("SELECT id FROM inv_units WHERE tower_id = 1 AND floor_number = 18 LIMIT 1"))
        if not p_res.fetchone():
            now_utc = datetime.now(timezone.utc)
            lock_exp = now_utc + timedelta(minutes=13, seconds=45)

            # Penthouse Floor 18
            await conn.execute(text("""
                INSERT INTO inv_units (
                    project_id, tower_id, floor_number, unit_number, unit_type_id, facing_id,
                    net_carpet_area_sqft, gross_saleable_area_sqft, bed_count, bath_count, balcony_count,
                    base_rate_per_sqft, floor_escalation_rate, facing_premium_rate, effective_rate_per_sqft,
                    total_unit_price, utility_connection_fee, parking_charge, max_discount_amount,
                    status_id, is_landowner_share, floor_plan_image_url,
                    current_locked_by_user_id, current_locked_by_user_name, lock_expires_at
                ) VALUES 
                (
                    1, 1, 18, '18A', 'PENTHOUSE', 'LAKE_VIEW',
                    3850.00, 4600.00, 5, 5, 4,
                    16500.00, 250.00, 1000.00, 17750.00,
                    81650000.00, 350000.00, 1000000.00, 500000.00,
                    'AVAILABLE', 0, 'assets/images/parcels/penthouse_18a.svg',
                    NULL, NULL, NULL
                ),
                (
                    1, 1, 18, '18B', 'PENTHOUSE', 'CORNER',
                    3500.00, 4200.00, 4, 4, 3,
                    16500.00, 250.00, 750.00, 17500.00,
                    73500000.00, 350000.00, 1000000.00, 500000.00,
                    'RESERVED', 0, 'assets/images/parcels/penthouse_18b.svg',
                    2, 'Ashraf Siddique (Director Sales)', :lock_exp
                )
            """), {"lock_exp": lock_exp.strftime('%Y-%m-%d %H:%M:%S')})
            await conn.commit()
            print("[SEED] Seeded Floor 18 Penthouses.")

        # Floors 11-17 Typical
        for fl in range(11, 18):
            chk = await conn.execute(text("SELECT id FROM inv_units WHERE tower_id = 1 AND floor_number = :fl LIMIT 1"), {"fl": fl})
            if not chk.fetchone():
                status_a = "AVAILABLE" if fl not in (12, 15) else ("LANDOWNER_SHARE" if fl == 15 else "BOOKED")
                status_b = "AVAILABLE" if fl != 13 else "RESERVED"
                status_c = "AVAILABLE" if fl != 16 else "RETAINED"
                status_d = "AVAILABLE" if fl != 14 else "BLOCKED"

                locked_uid = 1 if status_b == "RESERVED" else None
                locked_name = "Kazi Orin (Head of Sales)" if status_b == "RESERVED" else None
                locked_exp_val = (datetime.now(timezone.utc) + timedelta(minutes=11, seconds=20)).strftime('%Y-%m-%d %H:%M:%S') if status_b == "RESERVED" else None

                await conn.execute(text(f"""
                    INSERT INTO inv_units (
                        project_id, tower_id, floor_number, unit_number, unit_type_id, facing_id,
                        net_carpet_area_sqft, gross_saleable_area_sqft, bed_count, bath_count, balcony_count,
                        base_rate_per_sqft, floor_escalation_rate, facing_premium_rate, effective_rate_per_sqft,
                        total_unit_price, utility_connection_fee, max_discount_amount,
                        status_id, is_landowner_share, floor_plan_image_url,
                        current_locked_by_user_id, current_locked_by_user_name, lock_expires_at
                    ) VALUES 
                    (1, 1, {fl}, '{fl}A', 'TYPE_4BHK', 'SOUTH', 2650, 3150, 4, 4, 3, 13500, 150, 500, 14150, {3150 * 14150}, 250000, 150000, '{status_a}', {1 if status_a == 'LANDOWNER_SHARE' else 0}, 'assets/images/parcels/floorplan_4bhk.svg', NULL, NULL, NULL),
                    (1, 1, {fl}, '{fl}B', 'TYPE_3BHK', 'LAKE_VIEW', 2050, 2480, 3, 3, 2, 13500, 150, 800, 14450, {2480 * 14450}, 250000, 150000, '{status_b}', 0, 'assets/images/parcels/floorplan_3bhk_lake.svg', {locked_uid or 'NULL'}, {f"'{locked_name}'" if locked_name else 'NULL'}, {f"'{locked_exp_val}'" if locked_exp_val else 'NULL'}),
                    (1, 1, {fl}, '{fl}C', 'TYPE_3BHK', 'NORTH_EAST', 1950, 2350, 3, 3, 2, 13500, 150, 300, 13950, {2350 * 13950}, 250000, 150000, '{status_c}', 0, 'assets/images/parcels/floorplan_3bhk_ne.svg', NULL, NULL, NULL),
                    (1, 1, {fl}, '{fl}D', 'TYPE_3BHK', 'CORNER', 1880, 2250, 3, 3, 2, 13500, 150, 400, 14050, {2250 * 14050}, 250000, 150000, '{status_d}', 0, 'assets/images/parcels/floorplan_3bhk_corner.svg', NULL, NULL, NULL)
                """))
                await conn.commit()
                print(f"[SEED] Seeded Floor {fl} units.")

        # Floor 2 (Podium Club & Commercial Suites)
        chk2 = await conn.execute(text("SELECT id FROM inv_units WHERE tower_id = 1 AND floor_number = 2 LIMIT 1"))
        if not chk2.fetchone():
            await conn.execute(text("""
                INSERT INTO inv_units (
                    project_id, tower_id, floor_number, unit_number, unit_type_id, facing_id,
                    net_carpet_area_sqft, gross_saleable_area_sqft, bed_count, bath_count, balcony_count,
                    base_rate_per_sqft, floor_escalation_rate, facing_premium_rate, effective_rate_per_sqft,
                    total_unit_price, utility_connection_fee, max_discount_amount,
                    status_id, is_landowner_share, floor_plan_image_url
                ) VALUES 
                (1, 1, 2, 'PODIUM-01', 'COMMERCIAL', 'SOUTH', 3200, 3800, 0, 2, 1, 18000, 0, 500, 18500, 70300000, 350000, 200000, 'RETAINED', 0, 'assets/images/parcels/commercial_podium.svg'),
                (1, 1, 2, 'PODIUM-02', 'COMMERCIAL', 'NORTH_EAST', 2900, 3500, 0, 2, 1, 18000, 0, 400, 18400, 64400000, 350000, 200000, 'AVAILABLE', 0, 'assets/images/parcels/commercial_podium.svg')
            """))
            await conn.commit()
            print("[SEED] Seeded Floor 2 (Podium).")

        # Floor 1 (Ground Floor Commercial / Reception)
        chk1 = await conn.execute(text("SELECT id FROM inv_units WHERE tower_id = 1 AND floor_number = 1 LIMIT 1"))
        if not chk1.fetchone():
            await conn.execute(text("""
                INSERT INTO inv_units (
                    project_id, tower_id, floor_number, unit_number, unit_type_id, facing_id,
                    net_carpet_area_sqft, gross_saleable_area_sqft, bed_count, bath_count, balcony_count,
                    base_rate_per_sqft, floor_escalation_rate, facing_premium_rate, effective_rate_per_sqft,
                    total_unit_price, utility_connection_fee, max_discount_amount,
                    status_id, is_landowner_share, floor_plan_image_url
                ) VALUES 
                (1, 1, 1, 'G-01', 'COMMERCIAL', 'SOUTH', 2400, 2900, 0, 2, 0, 22000, 0, 1000, 23000, 66700000, 350000, 200000, 'RETAINED', 0, 'assets/images/parcels/ground_commercial.svg'),
                (1, 1, 1, 'G-02', 'COMMERCIAL', 'ROAD_FACING', 2000, 2450, 0, 1, 0, 22000, 0, 800, 22800, 55860000, 350000, 200000, 'AVAILABLE', 0, 'assets/images/parcels/ground_commercial.svg')
            """))
            await conn.commit()
            print("[SEED] Seeded Floor 1 (Ground Floor).")

        # 6. Seed Parking Slots (B1 & B2)
        print("[SEED] Seeding basement parking slots...")
        ps_cnt = await conn.execute(text("SELECT count(*) FROM inv_parking_slots WHERE project_id = 1"))
        if ps_cnt.scalar() == 0:
            for i in range(1, 11):
                st = "ALLOCATED" if i in (1, 2, 3) else ("BLOCKED" if i == 10 else "AVAILABLE")
                assigned_u = i if st == "ALLOCATED" else None
                await conn.execute(text("""
                    INSERT INTO inv_parking_slots (project_id, tower_id, basement_level, slot_number, slot_type, price, status, assigned_unit_id)
                    VALUES (1, 1, 'BASEMENT_1', :slot_no, :stype, 650000.00, :status, :u_id)
                """), {
                    "slot_no": f"P-B1-{i:02d}",
                    "stype": "VIP_COVERED" if i <= 3 else "BASEMENT_1",
                    "status": st,
                    "u_id": assigned_u
                })
            for j in range(1, 11):
                st = "AVAILABLE" if j > 2 else "ALLOCATED"
                assigned_u = (j + 10) if st == "ALLOCATED" else None
                await conn.execute(text("""
                    INSERT INTO inv_parking_slots (project_id, tower_id, basement_level, slot_number, slot_type, price, status, assigned_unit_id)
                    VALUES (1, 1, 'BASEMENT_2', :slot_no, 'BASEMENT_2', 550000.00, :status, :u_id)
                """), {
                    "slot_no": f"P-B2-{j:02d}",
                    "status": st,
                    "u_id": assigned_u
                })
            await conn.commit()
            print("[SEED] Seeded 20 Basement Parking Slots.")

        print("[SUCCESS] Inventory Stacking migration and seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_and_seed())
