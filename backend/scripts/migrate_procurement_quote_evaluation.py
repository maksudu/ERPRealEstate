import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from app.core.database import engine


async def run_migration():
    columns = {
        "scm_comparative_statements": [
            ("committee_recommendation", "TEXT NULL"),
            ("committee_decision_notes", "TEXT NULL"),
            ("committee_decided_at", "TIMESTAMP NULL"),
            ("award_allocations", "JSON NULL"),
        ],
        "scm_cs_quotations": [
            ("technical_specification", "TEXT NULL"),
            ("country_of_origin", "VARCHAR(100) NULL"),
            ("warranty_months", "INT NULL"),
            ("quotation_valid_until", "DATE NULL"),
            ("delivery_charge_bdt", "DECIMAL(14,2) NOT NULL DEFAULT 0"),
            ("discount_amount_bdt", "DECIMAL(14,2) NOT NULL DEFAULT 0"),
            ("vat_amount_bdt", "DECIMAL(14,2) NOT NULL DEFAULT 0"),
            ("other_tax_amount_bdt", "DECIMAL(14,2) NOT NULL DEFAULT 0"),
            ("commercial_evaluation", "VARCHAR(32) NOT NULL DEFAULT 'PENDING'"),
            ("revision_number", "INT NOT NULL DEFAULT 1"),
            ("previous_quotation_id", "BIGINT NULL"),
            ("is_current", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("negotiation_history", "TEXT NULL"),
        ],
    }
    async with engine.begin() as conn:
        for table, table_columns in columns.items():
            for name, definition in table_columns:
                exists = await conn.execute(text(f"SHOW COLUMNS FROM {table} LIKE :column"), {"column": name})
                if not exists.fetchone():
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {definition}"))
        fk = await conn.execute(text("""SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scm_cs_quotations'
            AND COLUMN_NAME = 'previous_quotation_id' AND REFERENCED_TABLE_NAME = 'scm_cs_quotations'"""))
        if not fk.fetchone():
            await conn.execute(text("ALTER TABLE scm_cs_quotations ADD CONSTRAINT fk_cs_quote_previous FOREIGN KEY (previous_quotation_id) REFERENCES scm_cs_quotations(id) ON DELETE SET NULL"))


if __name__ == "__main__":
    asyncio.run(run_migration())
