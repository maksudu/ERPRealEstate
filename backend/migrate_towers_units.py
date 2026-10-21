import asyncio
from app.core.database import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        # 1. Update prj_towers
        print("Checking & updating prj_towers...")
        tower_cols = [
            ("building_name", "VARCHAR(128) NULL DEFAULT 'Main Building'"),
            ("land_parcel_id", "BIGINT NULL"),
            ("approved_architectural_plan_ref", "VARCHAR(128) NULL"),
            ("structural_drawing_ref", "VARCHAR(128) NULL"),
            ("electrical_drawing_ref", "VARCHAR(128) NULL"),
            ("plumbing_drawing_ref", "VARCHAR(128) NULL"),
            ("fire_safety_drawing_ref", "VARCHAR(128) NULL"),
            ("staircase_count", "INT NOT NULL DEFAULT 2"),
            ("lobby_corridor_details", "TEXT NULL"),
            ("common_facilities_description", "TEXT NULL"),
            ("rooftop_service_details", "TEXT NULL"),
            ("parking_capacity_cars", "INT NOT NULL DEFAULT 0"),
            ("configuration_stage", "VARCHAR(64) NOT NULL DEFAULT 'APPROVED'")
        ]
        
        # Get existing columns in prj_towers
        res = await conn.execute(text("DESCRIBE prj_towers"))
        existing_towers = [r[0] for r in res.fetchall()]
        
        for col_name, col_def in tower_cols:
            if col_name not in existing_towers:
                print(f"Adding {col_name} to prj_towers...")
                await conn.execute(text(f"ALTER TABLE prj_towers ADD COLUMN {col_name} {col_def}"))

        # 2. Update prj_floors
        print("Checking & updating prj_floors...")
        floor_cols = [
            ("staircase_count", "INT NOT NULL DEFAULT 1"),
            ("lift_count", "INT NOT NULL DEFAULT 2"),
            ("lobby_area_sqft", "NUMERIC(12, 2) NOT NULL DEFAULT 0.00"),
            ("corridor_area_sqft", "NUMERIC(12, 2) NOT NULL DEFAULT 0.00"),
            ("utility_service_details", "TEXT NULL"),
            ("approved_plan_ref", "VARCHAR(128) NULL"),
            ("configuration_stage", "VARCHAR(64) NOT NULL DEFAULT 'APPROVED'")
        ]
        res = await conn.execute(text("DESCRIBE prj_floors"))
        existing_floors = [r[0] for r in res.fetchall()]
        for col_name, col_def in floor_cols:
            if col_name not in existing_floors:
                print(f"Adding {col_name} to prj_floors...")
                await conn.execute(text(f"ALTER TABLE prj_floors ADD COLUMN {col_name} {col_def}"))

        # 3. Update prj_units
        print("Checking & updating prj_units...")
        unit_cols = [
            ("gross_area_sqft", "NUMERIC(10, 2) NOT NULL DEFAULT 0.00"),
            ("balcony_area_sqft", "NUMERIC(10, 2) NOT NULL DEFAULT 0.00"),
            ("parking_bay_count", "INT NOT NULL DEFAULT 1"),
            ("parking_bay_number", "VARCHAR(64) NULL"),
            ("space_type", "VARCHAR(64) NOT NULL DEFAULT 'RESIDENTIAL'"),
            ("approved_plan_reference", "VARCHAR(128) NULL"),
            ("regulatory_approval_memo", "VARCHAR(128) NULL")
        ]
        res = await conn.execute(text("DESCRIBE prj_units"))
        existing_units = [r[0] for r in res.fetchall()]
        for col_name, col_def in unit_cols:
            if col_name not in existing_units:
                print(f"Adding {col_name} to prj_units...")
                await conn.execute(text(f"ALTER TABLE prj_units ADD COLUMN {col_name} {col_def}"))

        # 4. Create prj_design_revisions table
        print("Checking & creating prj_design_revisions...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS prj_design_revisions (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                project_id BIGINT NOT NULL,
                tower_id BIGINT NULL,
                floor_id BIGINT NULL,
                unit_id BIGINT NULL,
                revision_code VARCHAR(64) NOT NULL UNIQUE,
                title VARCHAR(255) NOT NULL,
                revision_type VARCHAR(64) NOT NULL DEFAULT 'ARCHITECTURAL',
                target_level VARCHAR(64) NOT NULL DEFAULT 'UNIT',
                previous_configuration TEXT NULL,
                proposed_configuration TEXT NOT NULL,
                reason_for_change TEXT NOT NULL,
                impact_on_area_sqft NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                impact_on_cost_bdt NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                regulatory_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
                regulatory_authority VARCHAR(64) NULL,
                regulatory_memo_no VARCHAR(128) NULL,
                regulatory_approval_date DATE NULL,
                status VARCHAR(64) NOT NULL DEFAULT 'PROPOSED',
                revised_by VARCHAR(128) NULL,
                approved_by VARCHAR(128) NULL,
                approval_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_rev_project (project_id),
                INDEX idx_rev_tower (tower_id),
                INDEX idx_rev_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
