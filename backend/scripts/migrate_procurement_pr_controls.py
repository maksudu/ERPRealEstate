import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from app.core.database import engine


async def run_migration():
    async with engine.begin() as conn:
        additions = {
            "scm_vendors": [
                ("business_address", "ALTER TABLE scm_vendors ADD COLUMN business_address TEXT NULL AFTER email"),
                ("business_registration_number", "ALTER TABLE scm_vendors ADD COLUMN business_registration_number VARCHAR(64) NULL AFTER business_address"),
                ("trade_license_number", "ALTER TABLE scm_vendors ADD COLUMN trade_license_number VARCHAR(64) NULL AFTER business_registration_number"),
                ("trade_license_expiry_date", "ALTER TABLE scm_vendors ADD COLUMN trade_license_expiry_date DATE NULL AFTER trade_license_number"),
                ("supplied_categories", "ALTER TABLE scm_vendors ADD COLUMN supplied_categories JSON NULL AFTER bin_number"),
                ("document_refs", "ALTER TABLE scm_vendors ADD COLUMN document_refs JSON NULL AFTER supplied_categories"),
                ("authorized_representatives", "ALTER TABLE scm_vendors ADD COLUMN authorized_representatives JSON NULL AFTER document_refs"),
                ("references", "ALTER TABLE scm_vendors ADD COLUMN `references` JSON NULL AFTER authorized_representatives"),
                ("bank_name", "ALTER TABLE scm_vendors ADD COLUMN bank_name VARCHAR(128) NULL AFTER `references`"),
                ("bank_account_name", "ALTER TABLE scm_vendors ADD COLUMN bank_account_name VARCHAR(128) NULL AFTER bank_name"),
                ("bank_account_number", "ALTER TABLE scm_vendors ADD COLUMN bank_account_number VARCHAR(128) NULL AFTER bank_account_name"),
                ("bank_branch", "ALTER TABLE scm_vendors ADD COLUMN bank_branch VARCHAR(128) NULL AFTER bank_account_number"),
                ("credit_limit_bdt", "ALTER TABLE scm_vendors ADD COLUMN credit_limit_bdt DECIMAL(16,2) NOT NULL DEFAULT 0.00 AFTER bank_branch"),
                ("currency", "ALTER TABLE scm_vendors ADD COLUMN currency VARCHAR(8) NOT NULL DEFAULT 'BDT' AFTER credit_limit_bdt"),
                ("approval_status", "ALTER TABLE scm_vendors ADD COLUMN approval_status VARCHAR(40) NOT NULL DEFAULT 'APPROVED' AFTER payment_terms_days"),
                ("approval_notes", "ALTER TABLE scm_vendors ADD COLUMN approval_notes TEXT NULL AFTER approval_status"),
                ("performance_score", "ALTER TABLE scm_vendors ADD COLUMN performance_score DECIMAL(5,2) NULL AFTER approval_notes"),
                ("late_delivery_count", "ALTER TABLE scm_vendors ADD COLUMN late_delivery_count INT NOT NULL DEFAULT 0 AFTER performance_score"),
                ("rejected_delivery_count", "ALTER TABLE scm_vendors ADD COLUMN rejected_delivery_count INT NOT NULL DEFAULT 0 AFTER late_delivery_count"),
                ("quality_complaint_count", "ALTER TABLE scm_vendors ADD COLUMN quality_complaint_count INT NOT NULL DEFAULT 0 AFTER rejected_delivery_count"),
                ("non_conformance_count", "ALTER TABLE scm_vendors ADD COLUMN non_conformance_count INT NOT NULL DEFAULT 0 AFTER quality_complaint_count"),
                ("suspension_reason", "ALTER TABLE scm_vendors ADD COLUMN suspension_reason TEXT NULL AFTER non_conformance_count"),
            ],
            "scm_store_stock": [
                ("reserved_quantity", "ALTER TABLE scm_store_stock ADD COLUMN reserved_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000 AFTER current_stock_quantity"),
            ],
            "scm_purchase_requisitions": [
                ("priority", "ALTER TABLE scm_purchase_requisitions ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL' AFTER floor_number"),
                ("department", "ALTER TABLE scm_purchase_requisitions ADD COLUMN department VARCHAR(128) NULL AFTER priority"),
                ("destination_store_id", "ALTER TABLE scm_purchase_requisitions ADD COLUMN destination_store_id BIGINT NULL AFTER department"),
                ("delivery_location", "ALTER TABLE scm_purchase_requisitions ADD COLUMN delivery_location VARCHAR(191) NULL AFTER destination_store_id"),
                ("attachment_refs", "ALTER TABLE scm_purchase_requisitions ADD COLUMN attachment_refs JSON NULL AFTER delivery_location"),
            ],
        }
        for table, columns in additions.items():
            for column, ddl in columns:
                exists = await conn.execute(text(f"SHOW COLUMNS FROM {table} LIKE :column"), {"column": column})
                if not exists.fetchone():
                    await conn.execute(text(ddl))
        fk = await conn.execute(text("""SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scm_purchase_requisitions'
            AND COLUMN_NAME = 'destination_store_id' AND REFERENCED_TABLE_NAME = 'scm_site_stores'"""))
        if not fk.fetchone():
            await conn.execute(text("ALTER TABLE scm_purchase_requisitions ADD INDEX idx_pr_destination_store (destination_store_id)"))
            await conn.execute(text("ALTER TABLE scm_purchase_requisitions ADD CONSTRAINT fk_pr_destination_store FOREIGN KEY (destination_store_id) REFERENCES scm_site_stores(id) ON DELETE SET NULL"))
        await conn.execute(text("""CREATE TABLE IF NOT EXISTS scm_pr_workflow_events (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            pr_id BIGINT NOT NULL,
            action VARCHAR(32) NOT NULL,
            from_status VARCHAR(32) NULL,
            to_status VARCHAR(32) NOT NULL,
            notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_pr_event_pr_created (pr_id, created_at),
            CONSTRAINT fk_pr_event_pr FOREIGN KEY (pr_id) REFERENCES scm_purchase_requisitions(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"""))
        await conn.execute(text("""CREATE TABLE IF NOT EXISTS scm_vendor_approval_events (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            vendor_id BIGINT NOT NULL,
            actor_user_id BIGINT NULL,
            action VARCHAR(40) NOT NULL,
            from_status VARCHAR(40) NULL,
            to_status VARCHAR(40) NOT NULL,
            notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_vendor_event_vendor_created (vendor_id, created_at),
            CONSTRAINT fk_vendor_event_vendor FOREIGN KEY (vendor_id) REFERENCES scm_vendors(id) ON DELETE CASCADE,
            CONSTRAINT fk_vendor_event_actor FOREIGN KEY (actor_user_id) REFERENCES sys_users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"""))
        event_actor = await conn.execute(text("SHOW COLUMNS FROM scm_vendor_approval_events LIKE 'actor_user_id'"))
        if not event_actor.fetchone():
            await conn.execute(text("ALTER TABLE scm_vendor_approval_events ADD COLUMN actor_user_id BIGINT NULL AFTER vendor_id"))
            await conn.execute(text("ALTER TABLE scm_vendor_approval_events ADD CONSTRAINT fk_vendor_event_actor FOREIGN KEY (actor_user_id) REFERENCES sys_users(id) ON DELETE SET NULL"))


if __name__ == "__main__":
    asyncio.run(run_migration())
