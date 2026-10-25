import asyncio

from app.core.database import engine
from app.modules.hrms.models import RecruitmentRecord


async def migrate_recruitment():
    async with engine.begin() as connection:
        await connection.run_sync(RecruitmentRecord.__table__.create, checkfirst=True)
    print("[Migration] Recruitment records table created or already present.")


if __name__ == "__main__":
    asyncio.run(migrate_recruitment())
