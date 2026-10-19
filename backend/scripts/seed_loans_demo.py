import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.database import AsyncSessionLocal

from app.modules.accounts.loans_financing_router import seed_loan_demo_data

async def main():
    async with AsyncSessionLocal() as db:
        res = await seed_loan_demo_data(db)
        print("Seed result:", res)


if __name__ == "__main__":
    asyncio.run(main())
