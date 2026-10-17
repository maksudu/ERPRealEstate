import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.core.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SHOW TABLES LIKE 'hnd_%'"))
        print("HND tables:", [r[0] for r in res.fetchall()])
        res2 = await conn.execute(text("SHOW TABLES LIKE 'rnt_%'"))
        print("RNT tables:", [r[0] for r in res2.fetchall()])

if __name__ == "__main__":
    asyncio.run(main())
