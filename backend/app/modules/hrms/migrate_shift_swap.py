import asyncio
from sqlalchemy import text
from app.core.database import engine
from app.modules.hrms.models import ShiftSwapRequest

async def migrate():
    async with engine.begin() as conn:
        # Create table if not exists
        await conn.run_sync(ShiftSwapRequest.__table__.create, checkfirst=True)
        
        # Add shift columns if not exist
        for col_def in [
            "ALTER TABLE hr_shifts ADD COLUMN shift_type VARCHAR(32) NOT NULL DEFAULT 'FIXED'",
            "ALTER TABLE hr_shifts ADD COLUMN is_overtime_eligible TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE hr_shifts ADD COLUMN weekly_off_days VARCHAR(128) DEFAULT 'FRIDAY'",
            "ALTER TABLE hr_leave_applications ADD COLUMN is_half_day TINYINT(1) NOT NULL DEFAULT 0",
            "ALTER TABLE hr_leave_applications ADD COLUMN half_day_session VARCHAR(16) NULL",
            "ALTER TABLE hr_leave_applications MODIFY COLUMN total_days DECIMAL(5,2) NOT NULL DEFAULT 1.00"
        ]:
            try:
                await conn.execute(text(col_def))
            except Exception as e:
                # Column might already exist
                pass

    print("[Migration] Shift swap and leave half-day schema updated successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
