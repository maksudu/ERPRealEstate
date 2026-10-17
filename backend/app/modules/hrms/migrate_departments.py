import asyncio
from sqlalchemy import text
from app.core.database import engine, Base
import app.modules.hrms.models

async def migrate_department_schema():
    async with engine.begin() as conn:
        cols = [
            ("company_id", "BIGINT NULL DEFAULT 1"),
            ("parent_department_id", "BIGINT NULL"),
            ("branch_id", "BIGINT NULL"),
            ("cost_center_id", "VARCHAR(64) NULL"),
            ("description", "TEXT NULL"),
            ("effective_from", "DATE NULL"),
            ("effective_to", "DATE NULL"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'"),
            ("approval_policies", "JSON NULL")
        ]
        for col_name, col_type in cols:
            try:
                await conn.execute(text(f"ALTER TABLE hr_departments ADD COLUMN {col_name} {col_type};"))
                print(f"[Migration] Added {col_name} to hr_departments")
            except Exception as e:
                print(f"[Migration] Column {col_name} skip/exists: {e}")

        # Fix head_of_dept_id foreign key constraint to reference hr_employees(id) instead of sys_users(id)
        try:
            await conn.execute(text("ALTER TABLE hr_departments DROP FOREIGN KEY hr_departments_ibfk_2;"))
            print("[Migration] Dropped old hr_departments_ibfk_2 (which referenced sys_users)")
        except Exception as e:
            print(f"[Migration] Drop old FK note: {e}")

        # Clean existing head_of_dept_id if pointing to non-existent employee
        await conn.execute(text("UPDATE hr_departments SET head_of_dept_id = NULL WHERE head_of_dept_id NOT IN (SELECT id FROM hr_employees);"))
        try:
            await conn.execute(text("ALTER TABLE hr_departments ADD CONSTRAINT fk_hr_dept_head FOREIGN KEY (head_of_dept_id) REFERENCES hr_employees(id) ON DELETE SET NULL;"))
            print("[Migration] Added fk_hr_dept_head referencing hr_employees(id)")
        except Exception as e:
            print(f"[Migration] Add new FK note: {e}")

        # Ensure all tables created
        await conn.run_sync(Base.metadata.create_all)
        print("[Migration] All schema tables synced!")

if __name__ == "__main__":
    asyncio.run(migrate_department_schema())
