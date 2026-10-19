"""
Migration script for Spec 4.7, 4.8, 4.9:
- Activity Calendar & Site-Visit Scheduling (4.7)
- Follow-up Tasks & Reminders (4.8)
- Customer Communication History (4.9)
Run: python backend/scripts/migrate_crm_activities_tasks_comms.py
"""
import os
import sys
import asyncio
import logging

sys.path.insert(0, os.path.abspath("backend"))
import app.main
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from sqlalchemy import text
from app.core.database import engine

ALTER_STATEMENTS = [
    # Allow lead_id to be nullable on crm_lead_activities for customer-direct interactions
    "ALTER TABLE crm_lead_activities MODIFY COLUMN lead_id BIGINT NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN activity_code VARCHAR(64) NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN customer_id BIGINT NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN project_id BIGINT NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN unit_id BIGINT NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN title VARCHAR(191) NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN scheduled_start DATETIME NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN scheduled_end DATETIME NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN duration_minutes INT NOT NULL DEFAULT 30",
    "ALTER TABLE crm_lead_activities ADD COLUMN meeting_location VARCHAR(255) NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN agenda TEXT NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'PLANNED'",
    "ALTER TABLE crm_lead_activities ADD COLUMN attendance_status VARCHAR(32) NULL DEFAULT 'PENDING'",
    "ALTER TABLE crm_lead_activities ADD COLUMN shortlisted_units_json TEXT NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN next_action VARCHAR(255) NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN next_follow_up_date DATE NULL",
    "ALTER TABLE crm_lead_activities ADD COLUMN reminder_minutes_before INT NULL DEFAULT 30",
    "ALTER TABLE crm_lead_activities ADD COLUMN is_reminder_sent TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE crm_lead_activities ADD COLUMN escalation_level INT NOT NULL DEFAULT 0",
    "ALTER TABLE crm_lead_activities ADD COLUMN updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    "CREATE INDEX idx_crm_act_customer ON crm_lead_activities (customer_id)",
    "CREATE INDEX idx_crm_act_status ON crm_lead_activities (status)",
    "CREATE INDEX idx_crm_act_type ON crm_lead_activities (activity_type)",
    "CREATE INDEX idx_crm_act_start ON crm_lead_activities (scheduled_start)",
]

CREATE_TABLE_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS crm_follow_up_tasks (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        task_code VARCHAR(64) NOT NULL UNIQUE,
        lead_id BIGINT NULL,
        customer_id BIGINT NULL,
        activity_id BIGINT NULL,
        title VARCHAR(191) NOT NULL,
        description TEXT NULL,
        task_category VARCHAR(64) NOT NULL DEFAULT 'GENERAL_FOLLOW_UP',
        priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
        due_date DATETIME NOT NULL,
        assigned_to_id BIGINT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        completion_outcome VARCHAR(64) NULL,
        completion_notes TEXT NULL,
        completed_at DATETIME NULL,
        completed_by_id BIGINT NULL,
        escalated_to_manager_id BIGINT NULL,
        escalated_at DATETIME NULL,
        reminder_channel VARCHAR(32) NULL DEFAULT 'IN_APP',
        is_automated TINYINT(1) NOT NULL DEFAULT 0,
        consent_checked TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_crm_fut_lead (lead_id),
        INDEX idx_crm_fut_customer (customer_id),
        INDEX idx_crm_fut_assigned (assigned_to_id),
        INDEX idx_crm_fut_due_date (due_date),
        INDEX idx_crm_fut_status (status),
        INDEX idx_crm_fut_category (task_category),
        CONSTRAINT fk_crm_fut_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
        CONSTRAINT fk_crm_fut_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE,
        CONSTRAINT fk_crm_fut_activity FOREIGN KEY (activity_id) REFERENCES crm_lead_activities(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS crm_communication_history (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        communication_code VARCHAR(64) NOT NULL UNIQUE,
        channel VARCHAR(32) NOT NULL DEFAULT 'PHONE_CALL',
        direction VARCHAR(16) NOT NULL DEFAULT 'OUTBOUND',
        lead_id BIGINT NULL,
        customer_id BIGINT NULL,
        user_id BIGINT NULL,
        subject VARCHAR(191) NOT NULL,
        message_body TEXT NOT NULL,
        delivery_status VARCHAR(32) NULL DEFAULT 'DELIVERED',
        is_sensitive TINYINT(1) NOT NULL DEFAULT 0,
        is_automated TINYINT(1) NOT NULL DEFAULT 0,
        resulting_action VARCHAR(255) NULL,
        metadata_json TEXT NULL,
        sent_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_crm_ch_channel (channel),
        INDEX idx_crm_ch_lead (lead_id),
        INDEX idx_crm_ch_customer (customer_id),
        INDEX idx_crm_ch_user (user_id),
        INDEX idx_crm_ch_sent_at (sent_at),
        CONSTRAINT fk_crm_ch_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
        CONSTRAINT fk_crm_ch_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """
]


async def run_migration():
    logger.info("Running migration for Specs 4.7, 4.8, 4.9...")
    async with engine.begin() as conn:
        for stmt in ALTER_STATEMENTS:
            try:
                await conn.execute(text(stmt))
                logger.info(f"ALTER OK: {stmt[:60]}...")
            except Exception as e:
                logger.debug(f"ALTER info: {e}")

        for stmt in CREATE_TABLE_STATEMENTS:
            try:
                await conn.execute(text(stmt))
                logger.info("CREATE TABLE statement executed successfully.")
            except Exception as e:
                logger.warning(f"CREATE TABLE statement error: {e}")

    logger.info("Migration for Specs 4.7, 4.8, 4.9 completed!")


if __name__ == "__main__":
    asyncio.run(run_migration())
