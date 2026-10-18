"""
Migration for CRM Lead Qualification (4.4) & Customer/Nominee Profiles (4.5).
Adds new columns to crm_leads / crm_customers / crm_nominees and creates
crm_lead_qualifications + crm_customer_service_requests on existing databases.
Fresh databases get tables automatically via Base.metadata.create_all on startup.
Safe to re-run: errors on duplicate columns are ignored.
Run: python backend/scripts/migrate_crm_qualification_customers.py
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
    # --- Spec 4.4: Lead Qualification columns on crm_leads ---
    "ALTER TABLE crm_leads ADD COLUMN health_grade VARCHAR(16) NULL",
    "ALTER TABLE crm_leads ADD COLUMN manual_score_override INT NULL",
    "ALTER TABLE crm_leads ADD COLUMN qualification_reasons TEXT NULL",
    "ALTER TABLE crm_leads ADD COLUMN financing_ready TINYINT(1) NULL",
    "ALTER TABLE crm_leads ADD COLUMN decision_maker_available TINYINT(1) NULL",
    "ALTER TABLE crm_leads ADD COLUMN last_scored_at DATETIME NULL",
    "ALTER TABLE crm_leads ADD COLUMN qualified_by_id BIGINT NULL",
    "ALTER TABLE crm_leads ADD COLUMN qualified_at DATETIME NULL",
    "CREATE INDEX idx_crm_leads_health_grade ON crm_leads (health_grade)",

    # --- Spec 4.5: Customer profile enrichment on crm_customers ---
    "ALTER TABLE crm_customers ADD COLUMN secondary_phone VARCHAR(32) NULL",
    "ALTER TABLE crm_customers ADD COLUMN customer_type VARCHAR(32) NULL DEFAULT 'INDIVIDUAL'",
    "ALTER TABLE crm_customers ADD COLUMN preferred_language VARCHAR(16) NULL DEFAULT 'BANGLA'",
    "ALTER TABLE crm_customers ADD COLUMN preferred_contact_method VARCHAR(32) NULL DEFAULT 'PHONE'",
    "ALTER TABLE crm_customers ADD COLUMN relationship_manager_id BIGINT NULL",
    "ALTER TABLE crm_customers ADD COLUMN is_consent_given TINYINT(1) NOT NULL DEFAULT 1",
    "ALTER TABLE crm_customers ADD COLUMN is_opted_out TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE crm_customers ADD COLUMN opt_out_at DATETIME NULL",
    "ALTER TABLE crm_customers ADD COLUMN opt_out_reason VARCHAR(191) NULL",
    "ALTER TABLE crm_customers ADD COLUMN nid_scan_front_url VARCHAR(255) NULL",
    "ALTER TABLE crm_customers ADD COLUMN nid_scan_back_url VARCHAR(255) NULL",
    "ALTER TABLE crm_customers ADD COLUMN merged_into_id BIGINT NULL",
    "ALTER TABLE crm_customers ADD COLUMN merged_at DATETIME NULL",
    "ALTER TABLE crm_customers ADD COLUMN merged_by_id BIGINT NULL",
    "CREATE INDEX idx_crm_customers_customer_type ON crm_customers (customer_type)",
    "CREATE INDEX idx_crm_customers_is_opted_out ON crm_customers (is_opted_out)",

    # --- Spec 4.5: Nominee enrichment on crm_nominees ---
    "ALTER TABLE crm_nominees ADD COLUMN phone VARCHAR(32) NULL",
    "ALTER TABLE crm_nominees ADD COLUMN email VARCHAR(128) NULL",
    "ALTER TABLE crm_nominees ADD COLUMN address TEXT NULL",
    "ALTER TABLE crm_nominees ADD COLUMN nid_front_url VARCHAR(255) NULL",
    "ALTER TABLE crm_nominees ADD COLUMN nid_back_url VARCHAR(255) NULL",
    "ALTER TABLE crm_nominees ADD COLUMN effective_from DATE NULL",
    "ALTER TABLE crm_nominees ADD COLUMN effective_to DATE NULL",
    "ALTER TABLE crm_nominees ADD COLUMN verification_status VARCHAR(16) NULL DEFAULT 'PENDING'",
    "ALTER TABLE crm_nominees ADD COLUMN verified_by_id BIGINT NULL",
    "ALTER TABLE crm_nominees ADD COLUMN verified_at DATETIME NULL",
    "ALTER TABLE crm_nominees ADD COLUMN notes TEXT NULL",
    "ALTER TABLE crm_nominees ADD COLUMN previous_share_percentage DECIMAL(5,2) NULL",
    "ALTER TABLE crm_nominees ADD COLUMN share_changed_at DATETIME NULL",
    "ALTER TABLE crm_nominees ADD COLUMN share_changed_by_id BIGINT NULL",
    "CREATE INDEX idx_crm_nominees_verification ON crm_nominees (verification_status)",
]

CREATE_TABLE_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS crm_lead_qualifications (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        lead_id BIGINT NOT NULL,
        total_score INT NOT NULL DEFAULT 0,
        health_grade VARCHAR(16) NOT NULL,
        budget_fit_score INT NOT NULL DEFAULT 0,
        contact_completeness_score INT NOT NULL DEFAULT 0,
        source_quality_score INT NOT NULL DEFAULT 0,
        engagement_progression_score INT NOT NULL DEFAULT 0,
        timeline_fit_score INT NOT NULL DEFAULT 0,
        financing_score INT NOT NULL DEFAULT 0,
        qualification_reasons TEXT NULL,
        recommended_action VARCHAR(255) NULL,
        engagement_flags TEXT NULL,
        computed_by VARCHAR(16) NOT NULL DEFAULT 'SYSTEM',
        computed_by_id BIGINT NULL,
        computed_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_crm_lq_lead (lead_id),
        INDEX idx_crm_lq_computed_at (computed_at),
        INDEX idx_crm_lq_health (health_grade),
        CONSTRAINT fk_crm_lq_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS crm_customer_service_requests (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        customer_id BIGINT NOT NULL,
        request_type VARCHAR(16) NOT NULL DEFAULT 'SERVICE',
        title VARCHAR(191) NOT NULL,
        description TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        priority VARCHAR(16) NULL DEFAULT 'MEDIUM',
        assigned_to_id BIGINT NULL,
        resolution_notes TEXT NULL,
        resolved_at DATETIME NULL,
        related_booking_id BIGINT NULL,
        related_unit_id BIGINT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_crm_csr_customer (customer_id),
        INDEX idx_crm_csr_status (status),
        INDEX idx_crm_csr_type (request_type),
        INDEX idx_crm_csr_created (created_at),
        CONSTRAINT fk_crm_csr_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
]


async def run_migration():
    async with engine.begin() as conn:
        for stmt in CREATE_TABLE_STATEMENTS:
            await conn.execute(text(stmt))
            logger.info("Ensured table exists.")

        for stmt in ALTER_STATEMENTS:
            try:
                await conn.execute(text(stmt))
                logger.info(f"Applied: {stmt[:90]}...")
            except Exception as e:
                msg = str(e).lower()
                if "duplicate column" in msg or "duplicate key name" in msg:
                    logger.info(f"Skipped (already exists): {stmt[:90]}...")
                else:
                    logger.warning(f"Failed ({e}): {stmt[:90]}...")

    logger.info("CRM Qualification (4.4) & Customer Profiles (4.5) migration complete.")


if __name__ == "__main__":
    asyncio.run(run_migration())
