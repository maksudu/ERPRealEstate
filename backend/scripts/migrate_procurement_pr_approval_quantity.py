import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from app.core.database import engine


async def run_migration():
    async with engine.begin() as conn:
        exists = await conn.execute(text("SHOW COLUMNS FROM scm_purchase_requisitions LIKE 'approved_quantity'"))
        if not exists.fetchone():
            await conn.execute(text("ALTER TABLE scm_purchase_requisitions ADD COLUMN approved_quantity DECIMAL(14,4) NULL AFTER requested_quantity"))
        batch = await conn.execute(text("SHOW COLUMNS FROM scm_purchase_requisitions LIKE 'batch_reference'"))
        if not batch.fetchone():
            await conn.execute(text("ALTER TABLE scm_purchase_requisitions ADD COLUMN batch_reference VARCHAR(64) NULL AFTER pr_number"))
            await conn.execute(text("CREATE INDEX idx_scm_pr_batch_reference ON scm_purchase_requisitions (batch_reference)"))


if __name__ == "__main__":
    asyncio.run(run_migration())
