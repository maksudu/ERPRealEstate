import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate_employee_columns():
    async with engine.begin() as conn:
        print("[Migration] Checking and adding extended columns to hr_employees...")
        cols = [
            ("marital_status", "VARCHAR(20) NULL DEFAULT 'SINGLE'"),
            ("emergency_contact_relation", "VARCHAR(50) NULL"),
            ("present_address", "TEXT NULL"),
            ("permanent_address", "TEXT NULL"),
            ("education", "JSON NULL"),
            ("experience", "JSON NULL"),
            ("documents", "JSON NULL"),
            ("system_role", "VARCHAR(50) NULL DEFAULT 'EMPLOYEE'")
        ]
        for col_name, col_type in cols:
            try:
                await conn.execute(text(f"ALTER TABLE hr_employees ADD COLUMN {col_name} {col_type};"))
                print(f"[Migration] Added {col_name} to hr_employees")
            except Exception as e:
                print(f"[Migration] Column {col_name} exists or skipped: {e}")

        print("[Migration] hr_employees schema sync complete!")

if __name__ == "__main__":
    asyncio.run(migrate_employee_columns())
