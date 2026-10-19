import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SHOW TABLES LIKE 'con_%'"))
        tables = [r[0] for r in res.fetchall()]
        print("CON TABLES:", tables)

if __name__ == '__main__':
    asyncio.run(check())
