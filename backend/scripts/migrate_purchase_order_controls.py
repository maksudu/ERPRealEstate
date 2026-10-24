import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from app.core.database import engine


async def run_migration():
    columns = [
        ("boq_item_id", "BIGINT NULL"),
        ("wbs_node_id", "BIGINT NULL"),
        ("order_type", "VARCHAR(32) NOT NULL DEFAULT 'LOCAL'"),
        ("item_specification", "TEXT NULL"),
        ("discount_amount_bdt", "DECIMAL(14,2) NOT NULL DEFAULT 0"),
        ("tax_amount_bdt", "DECIMAL(14,2) NOT NULL DEFAULT 0"),
        ("payment_terms_days", "INT NOT NULL DEFAULT 30"),
        ("advance_payment_amount_bdt", "DECIMAL(14,2) NOT NULL DEFAULT 0"),
        ("revision_number", "INT NOT NULL DEFAULT 1"),
        ("revision_history", "JSON NULL"),
        ("line_items", "JSON NULL"),
        ("payment_terms", "VARCHAR(255) NULL"),
    ]
    async with engine.begin() as conn:
        for name, definition in columns:
            exists = await conn.execute(text("SHOW COLUMNS FROM scm_purchase_orders LIKE :column"), {"column": name})
            if not exists.fetchone():
                await conn.execute(text(f"ALTER TABLE scm_purchase_orders ADD COLUMN {name} {definition}"))


if __name__ == "__main__":
    asyncio.run(run_migration())
