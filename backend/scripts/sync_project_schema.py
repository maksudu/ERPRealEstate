import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy import text
from app.core.database import engine, Base
import app.modules.construction.models
import app.modules.projects.models

async def migrate():
    async with engine.begin() as conn:
        print("Ensuring all new tables exist...")
        await conn.run_sync(Base.metadata.create_all)

        prj_cols = [
            ("company_name", "VARCHAR(191) NULL DEFAULT 'Green Valley Properties Ltd.'"),
            ("project_type", "VARCHAR(64) NULL DEFAULT 'MIXED_USE'"),
            ("project_category", "VARCHAR(64) NULL DEFAULT 'CONDOMINIUM'"),
            ("district", "VARCHAR(64) NULL DEFAULT 'Dhaka'"),
            ("thana_upazila", "VARCHAR(128) NULL DEFAULT 'Gulshan'"),
            ("site_address", "VARCHAR(255) NULL"),
            ("project_manager", "VARCHAR(128) NULL"),
            ("project_director", "VARCHAR(128) NULL"),
            ("department", "VARCHAR(128) NULL"),
            ("total_land_area_katha", "DECIMAL(14, 4) NULL DEFAULT 0.0"),
            ("total_land_area_decimal", "DECIMAL(14, 4) NULL DEFAULT 0.0"),
            ("planned_construction_area_sqft", "DECIMAL(16, 2) NULL DEFAULT 0.0"),
            ("project_duration_months", "INT NULL DEFAULT 36"),
            ("planned_handover_date", "DATE NULL"),
            ("project_funding_source", "VARCHAR(64) NULL DEFAULT 'EQUITY_AND_PRE_SALES'"),
            ("cost_center_code", "VARCHAR(64) NULL DEFAULT 'CC-PRJ-2026-001'"),
            ("target_customer_segment", "VARCHAR(128) NULL DEFAULT 'HIGH_NET_WORTH'"),
            ("project_scope", "TEXT NULL"),
            ("total_land_area_sqft", "DECIMAL(16, 2) NULL DEFAULT 0.0"),
            ("far_allocated", "DECIMAL(6, 2) NULL DEFAULT 3.50"),
            ("mgc_percent", "DECIMAL(5, 2) NULL DEFAULT 50.00"),
            ("road_width_feet", "DECIMAL(6, 2) NULL DEFAULT 40.00"),
            ("plot_area_sqft", "DECIMAL(14, 2) NULL DEFAULT 0.0"),
            ("total_builtup_area_sqft", "DECIMAL(16, 2) NULL DEFAULT 0.0"),
            ("total_saleable_area_sqft", "DECIMAL(16, 2) NULL DEFAULT 0.0"),
            ("actual_start_date", "DATE NULL"),
            ("revised_completion_date", "DATE NULL"),
            ("project_start_date", "DATE NULL"),
            ("target_completion_date", "DATE NULL"),
            ("development_authority_id", "VARCHAR(32) NULL DEFAULT 'RAJUK'"),
            ("land_bank_id", "BIGINT NULL"),
            ("approval_status", "VARCHAR(64) NULL DEFAULT 'APPROVED'"),
            ("land_parcel_ids", "JSON NULL"),
        ]
        for col, spec in prj_cols:
            try:
                await conn.execute(text(f"ALTER TABLE prj_projects ADD COLUMN {col} {spec}"))
                print(f"Added prj_projects.{col}")
            except Exception as e:
                pass

        tower_cols = [
            ("building_code", "VARCHAR(64) NULL"),
            ("building_type", "VARCHAR(64) NULL DEFAULT 'RESIDENTIAL'"),
            ("total_floors", "INT NULL DEFAULT 14"),
            ("podium_floors", "INT NULL DEFAULT 0"),
            ("approved_height_m", "DECIMAL(8, 2) NULL DEFAULT 45.00"),
            ("approved_floor_area_sqft", "DECIMAL(16, 2) NULL DEFAULT 0.0"),
            ("structural_system", "VARCHAR(128) NULL DEFAULT 'RCC_FRAME'"),
            ("building_specifications", "TEXT NULL"),
            ("architect_name", "VARCHAR(128) NULL"),
            ("consultant_name", "VARCHAR(128) NULL"),
            ("contractor_name", "VARCHAR(128) NULL"),
            ("planned_construction_start", "DATE NULL"),
            ("planned_completion_date", "DATE NULL"),
            ("approval_reference_no", "VARCHAR(128) NULL"),
            ("drawing_references", "VARCHAR(255) NULL"),
            ("construction_status", "VARCHAR(64) NULL DEFAULT 'PLANNING'"),
        ]
        for col, spec in tower_cols:
            try:
                await conn.execute(text(f"ALTER TABLE prj_towers ADD COLUMN {col} {spec}"))
                print(f"Added prj_towers.{col}")
            except Exception as e:
                pass

        clearance_cols = [
            ("approval_category", "VARCHAR(64) NULL DEFAULT 'BUILDING_PLAN'"),
            ("submission_date", "DATE NULL"),
            ("responsible_officer", "VARCHAR(128) NULL"),
            ("next_action", "VARCHAR(255) NULL"),
        ]
        for col, spec in clearance_cols:
            try:
                await conn.execute(text(f"ALTER TABLE prj_authority_clearances ADD COLUMN {col} {spec}"))
                print(f"Added prj_authority_clearances.{col}")
            except Exception as e:
                pass

        drawing_cols = [
            ("tower_id", "BIGINT NULL"),
            ("approval_clearance_id", "BIGINT NULL"),
            ("discipline", "VARCHAR(64) NOT NULL DEFAULT 'ARCHITECTURAL'"),
            ("floor_level", "VARCHAR(64) NULL"),
            ("construction_package", "VARCHAR(128) NULL"),
            ("author", "VARCHAR(191) NULL"),
            ("issue_date", "DATE NULL"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'DRAFT'"),
            ("is_superseded", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("superseded_by_id", "BIGINT NULL"),
            ("superseded_date", "DATE NULL"),
            ("file_name", "VARCHAR(255) NULL"),
            ("file_size_mb", "DECIMAL(8, 2) NULL DEFAULT 0.0"),
            ("file_type", "VARCHAR(32) NULL DEFAULT 'PDF'"),
            ("is_confidential", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("access_role", "VARCHAR(64) NOT NULL DEFAULT 'PROJECT_TEAM'"),
            ("download_count", "INT NOT NULL DEFAULT 0"),
        ]
        for col, spec in drawing_cols:
            try:
                await conn.execute(text(f"ALTER TABLE prj_drawings ADD COLUMN {col} {spec}"))
                print(f"Added prj_drawings.{col}")
            except Exception as e:
                pass

        print("Migration & schema sync finished successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
