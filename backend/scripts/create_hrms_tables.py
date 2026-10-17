import asyncio
from app.core.database import engine, Base
import app.modules.hrms.models

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("[DB] HRMS tables verified/created successfully in MySQL!")

if __name__ == "__main__":
    asyncio.run(create_tables())
