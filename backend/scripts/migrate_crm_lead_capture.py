"""
Migration for CRM Lead Capture (4.2) & Assignment (4.3).
Adds new columns to crm_leads and creates crm_lead_assignments,
crm_lead_assignment_rules, crm_lead_import_batches on existing databases.
Fresh databases get tables automatically via Base.metadata.create_all on startup.
Run: python backend/scripts/migrate_crm_lead_capture.py
"""
import os
import sys
import asyncio
import logging

sys.path.insert(0, os.path.abspath("backend"))
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from sqlalchemy import text
from app.core.database import engine

ALTER_STATEMENTS = [
    # New columns on crm_leads (all nullable or with defaults — safe to re-run)
    "ALTER TABLE crm_leads ADD COLUMN lead_code VARCHAR(32) NULL",
    "ALTER TABLE crm_leads ADD COLUMN original_source_id VARCHAR(32) NULL",
    "ALTER TABLE crm_leads ADD COLUMN utm_source VARCHAR(64) NULL",
    "ALTER TABLE crm_leads ADD COLUMN utm_medium VARCHAR(64) NULL",
    "ALTER TABLE crm_leads ADD COLUMN utm_campaign VARCHAR(128) NULL",
    "ALTER TABLE crm_leads ADD COLUMN campaign_id BIGINT NULL",
    "ALTER TABLE crm_leads ADD COLUMN referrer_broker_id BIGINT NULL",
    "ALTER TABLE crm_leads ADD COLUMN referral_customer_id BIGINT NULL",
    "ALTER TABLE crm_leads ADD COLUMN preferred_contact_method VARCHAR(32) NULL DEFAULT 'PHONE'",
    "ALTER TABLE crm_leads ADD COLUMN is_consent_given TINYINT(1) NOT NULL DEFAULT 1",
    "ALTER TABLE crm_leads ADD COLUMN is_opted_out TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE crm_leads ADD COLUMN opt_out_at DATETIME NULL",
    "ALTER TABLE crm_leads ADD COLUMN opt_out_reason VARCHAR(191) NULL",
    "ALTER TABLE crm_leads ADD COLUMN property_type VARCHAR(32) NULL",
    "ALTER TABLE crm_leads ADD COLUMN preferred_location VARCHAR(191) NULL",
    "ALTER TABLE crm_leads ADD COLUMN required_area_sqft DECIMAL(12,2) NULL",
    "ALTER TABLE crm_leads ADD COLUMN bedrooms INT NULL",
    "ALTER TABLE crm_leads ADD COLUMN expected_purchase_date DATE NULL",
    "ALTER TABLE crm_leads ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM'",
    "ALTER TABLE crm_leads ADD COLUMN first_response_deadline DATETIME NULL",
    "ALTER TABLE crm_leads ADD COLUMN first_contacted_at DATETIME NULL",
    "ALTER TABLE crm_leads ADD COLUMN assignment_method VARCHAR(32) NULL",
    "ALTER TABLE crm_leads ADD COLUMN lost_reason VARCHAR(64) NULL",
    "ALTER TABLE crm_leads ADD COLUMN is_duplicate TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE crm_leads ADD COLUMN duplicate_of_lead_id BIGINT NULL",
    # Indexes
    "CREATE INDEX idx_crm_leads_lead_code ON crm_leads (lead_code)",
    "CREATE INDEX idx_crm_leads_original_source ON crm_leads (original_source_id)",
    "CREATE INDEX idx_crm_leads_priority ON crm_leads (priority)",
    "CREATE INDEX idx_crm_leads_created_at ON crm_leads (created_at)",
    "CREATE INDEX idx_crm_leads_campaign ON crm_leads (campaign_name)",
    "CREATE INDEX idx_crm_leads_is_opted_out ON crm_leads (is_opted_out)",
]

CREATE_TABLE_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS crm_lead_assignments (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        lead_id BIGINT NOT NULL,
        assigned_to_id BIGINT NULL,
        assigned_by_id BIGINT NULL,
        previous_rep_id BIGINT NULL,
        assignment_method VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
        assignment_reason VARCHAR(255) NULL,
        response_sla_hours INT NULL DEFAULT 24,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        escalated_at DATETIME NULL,
        escalation_reason VARCHAR(191) NULL,
        assigned_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        released_at DATETIME NULL,
        INDEX idx_crm_la_lead (lead_id),
        INDEX idx_crm_la_assigned_to (assigned_to_id),
        INDEX idx_crm_la_is_active (is_active),
        CONSTRAINT fk_crm_la_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS crm_lead_assignment_rules (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        rule_name VARCHAR(128) NOT NULL,
        method VARCHAR(32) NOT NULL DEFAULT 'ROUND_ROBIN',
        priority_order INT NOT NULL DEFAULT 0,
        conditions TEXT NULL,
        target_sales_rep_ids TEXT NULL,
        sla_hours INT NOT NULL DEFAULT 24,
        escalate_to_manager_id BIGINT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_crm_lar_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS crm_lead_import_batches (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL,
        source_channel VARCHAR(32) NULL DEFAULT 'MANUAL_ENTRY',
        total_rows INT NOT NULL DEFAULT 0,
        success_count INT NOT NULL DEFAULT 0,
        failed_count INT NOT NULL DEFAULT 0,
        duplicate_count INT NOT NULL DEFAULT 0,
        error_log TEXT NULL,
        imported_by_id BIGINT NULL,
        imported_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
]


async def migrate():
    async with engine.begin() as conn:
        for ddl in CREATE_TABLE_STATEMENTS:
            try:
                await conn.execute(text(ddl))
                logger.info("Table ensured.")
            except Exception as e:
                logger.warning(f"Create table skipped/failed: {e}")

        for stmt_sql in ALTER_STATEMENTS:
            try:
                await conn.execute(text(stmt_sql))
                logger.info(f"Applied: {stmt_sql[:80]}...")
            except Exception as e:
                err = str(e).lower()
                if "duplicate column" in err or "duplicate key name" in err or "already exists" in err:
                    logger.info(f"Already exists (skipped): {stmt_sql[:80]}...")
                else:
                    logger.warning(f"Skipped ({e}): {stmt_sql[:80]}...")

    logger.info("CRM lead capture migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate())
