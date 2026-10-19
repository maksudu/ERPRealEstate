import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import asyncio
from app.core.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SHOW TABLES"))
        tables = [r[0] for r in res.fetchall()]
        print("Vendor/Contractor/Customer tables:", [t for t in tables if any(k in t.lower() for k in ["supp", "vend", "contract", "cust", "prj_project", "branch", "org"])])

if __name__ == "__main__":
    asyncio.run(main())
