import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.core.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SHOW TABLES LIKE 'scm_%'"))
        print("Existing SCM tables:", [r[0] for r in res.fetchall()])

if __name__ == "__main__":
    asyncio.run(main())
