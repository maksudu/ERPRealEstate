"""
Migration Script for Spec 4.10: Broker and Referral Management.
Creates tables:
- crm_brokers: Master registry for brokers, agents, and referral partners.
- crm_broker_commission_claims: Commission tracking, milestone calculation, and finance routing.
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
    logger.info("Running migration for Spec 4.10: Broker and Referral Management...")
    async with engine.begin() as conn:
        # 1. Create crm_brokers table
        create_brokers_table = """
        CREATE TABLE IF NOT EXISTS crm_brokers (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            broker_code VARCHAR(64) NOT NULL UNIQUE,
            broker_name VARCHAR(191) NOT NULL,
            broker_type VARCHAR(32) NOT NULL DEFAULT 'COMPANY',
            contact_person VARCHAR(191) NULL,
            primary_phone VARCHAR(32) NOT NULL,
            secondary_phone VARCHAR(32) NULL,
            email VARCHAR(128) NULL,
            office_address TEXT NULL,
            service_area VARCHAR(191) NULL,
            preferred_projects_json TEXT NULL,
            referral_code VARCHAR(32) NOT NULL UNIQUE,
            referral_link VARCHAR(255) NULL,
            license_number VARCHAR(64) NULL,
            tin_number VARCHAR(64) NULL,
            bin_vat_number VARCHAR(64) NULL,
            agreement_number VARCHAR(64) NULL,
            agreement_signed_date DATE NULL,
            agreement_valid_from DATE NULL,
            agreement_valid_to DATE NULL,
            commission_type VARCHAR(32) NOT NULL DEFAULT 'PERCENTAGE',
            commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 1.50,
            eligibility_conditions TEXT NULL,
            required_milestone VARCHAR(64) NOT NULL DEFAULT 'DOWN_PAYMENT_CLEARED',
            bank_name VARCHAR(128) NULL,
            bank_branch VARCHAR(128) NULL,
            bank_account_name VARCHAR(191) NULL,
            bank_account_number VARCHAR(64) NULL,
            routing_number VARCHAR(32) NULL,
            mobile_wallet_number VARCHAR(32) NULL,
            trade_license_url VARCHAR(255) NULL,
            tin_cert_url VARCHAR(255) NULL,
            agreement_doc_url VARCHAR(255) NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'PROSPECTIVE',
            total_leads_count INT NOT NULL DEFAULT 0,
            total_bookings_count INT NOT NULL DEFAULT 0,
            total_sales_value DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
            total_commission_earned DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
            total_commission_paid DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_crm_broker_status (status),
            INDEX idx_crm_broker_code (broker_code),
            INDEX idx_crm_broker_ref (referral_code),
            INDEX idx_crm_broker_phone (primary_phone)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        await conn.execute(text(create_brokers_table))
        logger.info("Table crm_brokers verified/created successfully.")

        # 2. Create crm_broker_commission_claims table
        create_claims_table = """
        CREATE TABLE IF NOT EXISTS crm_broker_commission_claims (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            claim_code VARCHAR(64) NOT NULL UNIQUE,
            broker_id BIGINT NOT NULL,
            lead_id BIGINT NULL,
            customer_id BIGINT NULL,
            booking_id BIGINT NULL,
            project_id BIGINT NULL,
            unit_id BIGINT NULL,
            referral_date DATE NOT NULL,
            source_evidence VARCHAR(255) NULL,
            unit_sale_value DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
            commission_rate_percentage DECIMAL(5, 2) NOT NULL DEFAULT 1.50,
            calculated_commission_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
            tds_tax_deduction_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
            net_payable_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
            milestone_achieved VARCHAR(64) NOT NULL DEFAULT 'BOOKING_CONFIRMED',
            is_milestone_verified BOOLEAN NOT NULL DEFAULT FALSE,
            milestone_verified_at DATETIME NULL,
            milestone_verified_by_id BIGINT NULL,
            claim_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
            sales_approval_by_id BIGINT NULL,
            sales_approved_at DATETIME NULL,
            finance_approval_by_id BIGINT NULL,
            finance_approved_at DATETIME NULL,
            disbursement_reference VARCHAR(128) NULL,
            disbursed_at DATETIME NULL,
            rejection_reason VARCHAR(255) NULL,
            notes TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_claim_broker (broker_id),
            INDEX idx_claim_status (claim_status),
            INDEX idx_claim_lead (lead_id),
            INDEX idx_claim_customer (customer_id),
            INDEX idx_claim_booking (booking_id),
            INDEX idx_claim_project (project_id),
            CONSTRAINT fk_claim_broker FOREIGN KEY (broker_id) REFERENCES crm_brokers(id) ON DELETE CASCADE,
            CONSTRAINT fk_claim_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL,
            CONSTRAINT fk_claim_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE SET NULL,
            CONSTRAINT fk_claim_project FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE SET NULL,
            CONSTRAINT fk_claim_unit FOREIGN KEY (unit_id) REFERENCES inv_units(id) ON DELETE SET NULL,
            CONSTRAINT fk_claim_milestone_verifier FOREIGN KEY (milestone_verified_by_id) REFERENCES sys_users(id) ON DELETE SET NULL,
            CONSTRAINT fk_claim_sales_approver FOREIGN KEY (sales_approval_by_id) REFERENCES sys_users(id) ON DELETE SET NULL,
            CONSTRAINT fk_claim_finance_approver FOREIGN KEY (finance_approval_by_id) REFERENCES sys_users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        await conn.execute(text(create_claims_table))
        logger.info("Table crm_broker_commission_claims verified/created successfully.")

    logger.info("Migration for Spec 4.10 completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
