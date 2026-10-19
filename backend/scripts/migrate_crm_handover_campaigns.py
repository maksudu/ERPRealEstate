"""
Migration Script for Spec 4.12: Lead-to-Booking Handover
and Spec 4.13: Campaign and Marketing Management.
"""
import sys
import os
import asyncio
import logging
from sqlalchemy import text, inspect

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main
from app.core.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_migration():
    logger.info("Starting safe column and table migration for Spec 4.12 and Spec 4.13...")
    async with engine.begin() as conn:
        # 1. Safely add columns to crm_booking_handovers
        existing_cols = await conn.run_sync(
            lambda c: [col['name'] for col in inspect(c).get_columns('crm_booking_handovers')]
        )
        logger.info(f"Existing columns in crm_booking_handovers: {len(existing_cols)}")

        columns_to_add = [
            ('customer_verified', 'BOOLEAN NOT NULL DEFAULT FALSE'),
            ('verified_phone', 'VARCHAR(32) NULL'),
            ('verified_email', 'VARCHAR(128) NULL'),
            ('unit_number', 'VARCHAR(64) NULL'),
            ('parking_slot', 'VARCHAR(64) NULL'),
            ('unit_size_sqft', 'DECIMAL(10, 2) NULL'),
            ('unit_availability_verified', 'BOOLEAN NOT NULL DEFAULT FALSE'),
            ('approved_base_rate', 'DECIMAL(14, 2) NULL'),
            ('list_price', 'DECIMAL(14, 2) NOT NULL DEFAULT 0.00'),
            ('proposed_price', 'DECIMAL(14, 2) NOT NULL DEFAULT 0.00'),
            ('discount_amount_requested', 'DECIMAL(14, 2) NOT NULL DEFAULT 0.00'),
            ('discount_percentage', 'DECIMAL(5, 2) NOT NULL DEFAULT 0.00'),
            ('discount_approval_reference', 'VARCHAR(64) NULL'),
            ('discount_status', "VARCHAR(32) NOT NULL DEFAULT 'APPROVED'"),
            ('nid_passport_verified', 'BOOLEAN NOT NULL DEFAULT FALSE'),
            ('tin_certificate_verified', 'BOOLEAN NOT NULL DEFAULT FALSE'),
            ('nominee_verified', 'BOOLEAN NOT NULL DEFAULT FALSE'),
            ('power_of_attorney_verified', 'BOOLEAN NOT NULL DEFAULT FALSE'),
            ('kyc_notes', 'TEXT NULL'),
            ('reservation_code', 'VARCHAR(64) NULL'),
            ('booking_reference_number', 'VARCHAR(64) NULL'),
            ('broker_id', 'BIGINT NULL'),
            ('broker_code', 'VARCHAR(64) NULL'),
            ('broker_commission_rate', 'DECIMAL(5, 2) NULL'),
            ('campaign_id', 'BIGINT NULL'),
            ('utm_source', 'VARCHAR(128) NULL'),
            ('utm_campaign', 'VARCHAR(128) NULL'),
            ('token_money_payment_mode', "VARCHAR(32) NULL DEFAULT 'PAY_ORDER'"),
            ('token_transaction_ref', 'VARCHAR(128) NULL'),
            ('token_bank_name', 'VARCHAR(128) NULL'),
            ('token_received_date', 'DATE NULL'),
            ('payment_schedule_triggered', 'BOOLEAN NOT NULL DEFAULT FALSE'),
            ('crm_history_snapshot', 'LONGTEXT NULL'),
            ('transferred_to_sales_at', 'TIMESTAMP NULL')
        ]

        for col_name, col_type in columns_to_add:
            if col_name not in existing_cols:
                logger.info(f"Adding column '{col_name}' to crm_booking_handovers...")
                await conn.execute(text(f"ALTER TABLE crm_booking_handovers ADD COLUMN {col_name} {col_type};"))

        # 2. Create crm_campaigns table (Spec 4.13)
        create_campaigns_table = """
        CREATE TABLE IF NOT EXISTS crm_campaigns (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            campaign_code VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            channel VARCHAR(64) NOT NULL DEFAULT 'FACEBOOK',
            project_id BIGINT NULL,
            target_audience VARCHAR(255) NULL,
            allocated_budget DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
            actual_spend DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
            target_leads INT NOT NULL DEFAULT 0,
            utm_source VARCHAR(128) NULL,
            utm_medium VARCHAR(128) NULL,
            utm_campaign VARCHAR(128) NULL,
            utm_content VARCHAR(128) NULL,
            utm_term VARCHAR(128) NULL,
            tracking_url VARCHAR(512) NULL,
            landing_page_slug VARCHAR(128) NULL,
            campaign_lead_route_rep_id BIGINT NULL,
            start_date DATE NULL,
            end_date DATE NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_cmp_channel (channel),
            INDEX idx_cmp_status (status),
            INDEX idx_cmp_project (project_id),
            INDEX idx_cmp_utm (utm_source, utm_campaign)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        await conn.execute(text(create_campaigns_table))
        logger.info("Checked/Created table: crm_campaigns")

        # 3. Create crm_marketing_touchpoints table (Multi-Touch Attribution)
        create_touchpoints_table = """
        CREATE TABLE IF NOT EXISTS crm_marketing_touchpoints (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            lead_id BIGINT NOT NULL,
            campaign_id BIGINT NULL,
            touchpoint_type VARCHAR(32) NOT NULL DEFAULT 'FIRST_TOUCH',
            channel VARCHAR(64) NOT NULL DEFAULT 'WEBSITE',
            interaction_summary TEXT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_touch_lead (lead_id),
            INDEX idx_touch_campaign (campaign_id),
            INDEX idx_touch_type (touchpoint_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        await conn.execute(text(create_touchpoints_table))
        logger.info("Checked/Created table: crm_marketing_touchpoints")

        # 4. Create crm_suppression_list table (Customer Consent & Suppression)
        create_suppression_table = """
        CREATE TABLE IF NOT EXISTS crm_suppression_list (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(32) NULL,
            email VARCHAR(128) NULL,
            customer_name VARCHAR(255) NULL,
            suppression_reason VARCHAR(64) NOT NULL DEFAULT 'DO_NOT_CALL',
            consent_given_at TIMESTAMP NULL,
            consent_revoked_at TIMESTAMP NULL,
            source_note TEXT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_supp_phone (phone),
            INDEX idx_supp_email (email),
            INDEX idx_supp_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        await conn.execute(text(create_suppression_table))
        logger.info("Checked/Created table: crm_suppression_list")

    logger.info("Spec 4.12 and 4.13 database migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
