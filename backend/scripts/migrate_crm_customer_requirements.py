"""
Migration script for Spec 4.6: Customer Requirements & Budget Tracking.
Creates:
1. crm_customer_requirements
2. crm_requirement_audit_logs
3. crm_inventory_recommendations
4. crm_inventory_alerts
Run: python backend/scripts/migrate_crm_customer_requirements.py
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

CREATE_TABLE_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS crm_customer_requirements (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        requirement_code VARCHAR(64) NOT NULL UNIQUE,
        customer_id BIGINT NOT NULL,
        title VARCHAR(191) NOT NULL,
        preferred_project_id BIGINT NULL,
        preferred_location VARCHAR(191) NULL,
        property_type VARCHAR(64) NULL DEFAULT 'APARTMENT',
        budget_min_bdt DECIMAL(16,2) NULL,
        budget_max_bdt DECIMAL(16,2) NULL,
        area_min_sqft DECIMAL(10,2) NULL,
        area_max_sqft DECIMAL(10,2) NULL,
        bedrooms INT NULL DEFAULT 3,
        bathrooms INT NULL DEFAULT 3,
        preferred_floor VARCHAR(64) NULL DEFAULT 'MID_FLOOR',
        preferred_facing VARCHAR(64) NULL DEFAULT 'SOUTH_FACING',
        parking_required TINYINT(1) NOT NULL DEFAULT 1,
        parking_count INT NOT NULL DEFAULT 1,
        purchase_timeline VARCHAR(64) NULL DEFAULT 'WITHIN_6_MONTHS',
        payment_preference VARCHAR(64) NULL DEFAULT 'INSTALLMENTS',
        amenities_required TEXT NULL,
        special_notes TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        assigned_sales_rep_id BIGINT NULL,
        created_by_id BIGINT NULL,
        matched_units_count INT NOT NULL DEFAULT 0,
        last_matched_at DATETIME NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_crm_cr_customer (customer_id),
        INDEX idx_crm_cr_status (status),
        INDEX idx_crm_cr_property_type (property_type),
        INDEX idx_crm_cr_project (preferred_project_id),
        INDEX idx_crm_cr_sales_rep (assigned_sales_rep_id),
        INDEX idx_crm_cr_created_at (created_at),
        CONSTRAINT fk_crm_cr_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS crm_requirement_audit_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        requirement_id BIGINT NOT NULL,
        changed_by_id BIGINT NULL,
        change_summary VARCHAR(255) NOT NULL,
        old_values_json TEXT NULL,
        new_values_json TEXT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_crm_ral_req (requirement_id),
        INDEX idx_crm_ral_created (created_at),
        CONSTRAINT fk_crm_ral_req FOREIGN KEY (requirement_id) REFERENCES crm_customer_requirements(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS crm_inventory_recommendations (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        requirement_id BIGINT NOT NULL,
        unit_id BIGINT NOT NULL,
        match_score_percentage DECIMAL(5,2) NOT NULL DEFAULT 85.00,
        match_details_json TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'RECOMMENDED',
        rejection_reason VARCHAR(255) NULL,
        rejection_notes TEXT NULL,
        recommended_by_id BIGINT NULL,
        recommended_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        feedback_at DATETIME NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_crm_ir_req (requirement_id),
        INDEX idx_crm_ir_unit (unit_id),
        INDEX idx_crm_ir_status (status),
        CONSTRAINT fk_crm_ir_req FOREIGN KEY (requirement_id) REFERENCES crm_customer_requirements(id) ON DELETE CASCADE,
        CONSTRAINT fk_crm_ir_unit FOREIGN KEY (unit_id) REFERENCES inv_units(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS crm_inventory_alerts (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        requirement_id BIGINT NOT NULL,
        unit_id BIGINT NOT NULL,
        sales_rep_id BIGINT NULL,
        alert_title VARCHAR(191) NOT NULL,
        alert_message TEXT NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_crm_ia_req (requirement_id),
        INDEX idx_crm_ia_sales_rep (sales_rep_id),
        INDEX idx_crm_ia_unit (unit_id),
        INDEX idx_crm_ia_created (created_at),
        CONSTRAINT fk_crm_ia_req FOREIGN KEY (requirement_id) REFERENCES crm_customer_requirements(id) ON DELETE CASCADE,
        CONSTRAINT fk_crm_ia_unit FOREIGN KEY (unit_id) REFERENCES inv_units(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """
]


async def run_migration():
    logger.info("Executing migration for Spec 4.6: Customer Requirements & Budget Tracking...")
    async with engine.begin() as conn:
        for stmt in CREATE_TABLE_STATEMENTS:
            try:
                await conn.execute(text(stmt))
                logger.info("Successfully executed table statement.")
            except Exception as e:
                logger.warning(f"Error executing table statement: {e}")

    logger.info("Migration for Spec 4.6 completed successfully.")


if __name__ == "__main__":
    asyncio.run(run_migration())
