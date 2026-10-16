import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check_tables():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SHOW TABLES"))
        tables = [r[0] for r in res.fetchall()]
        print(f"Total Tables in DB: {len(tables)}")
        for t in sorted(tables):
            try:
                cnt = await session.execute(text(f"SELECT COUNT(*) FROM `{t}`"))
                print(f"{t}: {cnt.scalar()}")
            except Exception as e:
                print(f"{t}: ERROR {e}")

if __name__ == "__main__":
    asyncio.run(check_tables())
