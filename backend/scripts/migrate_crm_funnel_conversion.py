"""
Migration Script for Spec 4.11: Sales Funnel and Lead Conversion.
Creates tables:
- crm_funnel_stages: Configurable funnel stages with entry/exit criteria & target dwell days.
- crm_lead_stage_transitions: Detailed audit trail of lead stage movements and time spent (dwell time).
- crm_opportunities: Deals created when a qualified lead expresses interest in specific units/projects.
- crm_booking_handovers: Formal sales-to-operations handover records when booking is agreed.
"""
import sys
import os
import asyncio
import logging
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main  # Ensure all SQLAlchemy models are registered
from app.core.database import AsyncSessionLocal, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_migration():
    logger.info("Running migration for Spec 4.11: Sales Funnel and Lead Conversion...")
    async with engine.begin() as conn:
        # 1. Create crm_funnel_stages table
        create_stages_table = """
        CREATE TABLE IF NOT EXISTS crm_funnel_stages (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            stage_code VARCHAR(32) NOT NULL UNIQUE,
            stage_name VARCHAR(64) NOT NULL,
            stage_order INT NOT NULL DEFAULT 1,
            description TEXT NULL,
            entry_criteria TEXT NULL,
            exit_criteria TEXT NULL,
            target_dwell_days INT NOT NULL DEFAULT 3,
            color_code VARCHAR(16) NOT NULL DEFAULT '#3b82f6',
            is_system_stage BOOLEAN NOT NULL DEFAULT TRUE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_stage_order (stage_order),
            INDEX idx_stage_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        await conn.execute(text(create_stages_table))
        logger.info("Checked/Created table: crm_funnel_stages")

        # 2. Create crm_lead_stage_transitions table
        create_transitions_table = """
        CREATE TABLE IF NOT EXISTS crm_lead_stage_transitions (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            lead_id BIGINT NOT NULL,
            from_stage VARCHAR(32) NULL,
            to_stage VARCHAR(32) NOT NULL,
            transition_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            dwell_time_hours DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            transition_notes TEXT NULL,
            transitioned_by_id BIGINT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_trans_lead_id (lead_id),
            INDEX idx_trans_to_stage (to_stage),
            INDEX idx_trans_date (transition_date),
            CONSTRAINT fk_trans_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
            CONSTRAINT fk_trans_user FOREIGN KEY (transitioned_by_id) REFERENCES sys_users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        await conn.execute(text(create_transitions_table))
        logger.info("Checked/Created table: crm_lead_stage_transitions")

        # 3. Create crm_opportunities table
        create_opportunities_table = """
        CREATE TABLE IF NOT EXISTS crm_opportunities (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            opportunity_code VARCHAR(64) NOT NULL UNIQUE,
            lead_id BIGINT NULL,
            customer_id BIGINT NULL,
            project_id BIGINT NULL,
            unit_id BIGINT NULL,
            title VARCHAR(191) NOT NULL,
            stage VARCHAR(32) NOT NULL DEFAULT 'QUALIFIED',
            estimated_deal_value DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
            confidence_probability_pct INT NOT NULL DEFAULT 50,
            expected_close_date DATE NULL,
            actual_close_date DATE NULL,
            assigned_sales_rep_id BIGINT NULL,
            loss_reason VARCHAR(64) NULL,
            loss_notes TEXT NULL,
            is_reopened BOOLEAN NOT NULL DEFAULT FALSE,
            reopened_at TIMESTAMP NULL,
            reopened_by_id BIGINT NULL,
            reopen_notes TEXT NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_opp_lead (lead_id),
            INDEX idx_opp_customer (customer_id),
            INDEX idx_opp_project (project_id),
            INDEX idx_opp_stage (stage),
            INDEX idx_opp_sales_rep (assigned_sales_rep_id),
            CONSTRAINT fk_opp_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL,
            CONSTRAINT fk_opp_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE SET NULL,
            CONSTRAINT fk_opp_project FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE SET NULL,
            CONSTRAINT fk_opp_unit FOREIGN KEY (unit_id) REFERENCES prj_units(id) ON DELETE SET NULL,
            CONSTRAINT fk_opp_sales_rep FOREIGN KEY (assigned_sales_rep_id) REFERENCES sys_users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        await conn.execute(text(create_opportunities_table))
        logger.info("Checked/Created table: crm_opportunities")

        # 4. Create crm_booking_handovers table
        create_handovers_table = """
        CREATE TABLE IF NOT EXISTS crm_booking_handovers (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            handover_code VARCHAR(64) NOT NULL UNIQUE,
            opportunity_id BIGINT NULL,
            lead_id BIGINT NULL,
            customer_id BIGINT NULL,
            project_id BIGINT NULL,
            unit_id BIGINT NULL,
            agreed_price DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
            booking_money_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
            payment_plan_preference VARCHAR(64) NULL DEFAULT 'INSTALLMENTS',
            special_conditions TEXT NULL,
            handover_notes TEXT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'PENDING_SALES_OPS',
            sales_rep_id BIGINT NULL,
            accepted_by_ops_id BIGINT NULL,
            accepted_at TIMESTAMP NULL,
            sales_booking_id BIGINT NULL,
            rejection_reason TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_hnd_opp (opportunity_id),
            INDEX idx_hnd_customer (customer_id),
            INDEX idx_hnd_status (status),
            CONSTRAINT fk_hnd_opp FOREIGN KEY (opportunity_id) REFERENCES crm_opportunities(id) ON DELETE SET NULL,
            CONSTRAINT fk_hnd_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE SET NULL,
            CONSTRAINT fk_hnd_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES sys_users(id) ON DELETE SET NULL,
            CONSTRAINT fk_hnd_ops_user FOREIGN KEY (accepted_by_ops_id) REFERENCES sys_users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        await conn.execute(text(create_handovers_table))
        logger.info("Checked/Created table: crm_booking_handovers")

    logger.info("Spec 4.11 database migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
