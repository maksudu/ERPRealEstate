import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import asyncio
from app.core.database import engine
from sqlalchemy import text

DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS acc_project_dimension_configs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        organization_id BIGINT NOT NULL DEFAULT 1,
        account_id BIGINT NULL,
        account_code VARCHAR(32) NULL,
        account_name VARCHAR(191) NULL,
        account_type VARCHAR(32) NULL,
        transaction_type VARCHAR(32) NOT NULL DEFAULT 'ALL',
        is_company_branch_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        is_project_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        is_tower_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
        is_unit_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
        is_department_cost_center_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        is_construction_phase_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
        is_cost_category_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        is_party_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
        is_budget_line_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_dim_cfg_acc (account_id),
        INDEX idx_dim_cfg_txn (transaction_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS acc_project_income_transactions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        organization_id BIGINT NOT NULL DEFAULT 1,
        income_number VARCHAR(64) NOT NULL UNIQUE,
        transaction_date DATE NOT NULL,
        company_name VARCHAR(128) NOT NULL DEFAULT 'Bengal Real Estate Ltd.',
        branch_name VARCHAR(128) NOT NULL DEFAULT 'Head Office - Gulshan',
        project_id BIGINT NOT NULL,
        tower_id BIGINT NULL,
        unit_id BIGINT NULL,
        department_name VARCHAR(128) NOT NULL DEFAULT 'Sales & Revenue',
        cost_center_id BIGINT NULL,
        construction_phase VARCHAR(64) NULL,
        cost_category VARCHAR(64) NOT NULL DEFAULT 'PROPERTY_SALE',
        customer_id BIGINT NULL,
        party_name VARCHAR(191) NULL,
        budget_line_code VARCHAR(64) NULL,
        account_id BIGINT NULL,
        contract_value DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        recognized_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        cash_collected_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        unearned_revenue DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        recognition_policy VARCHAR(64) NOT NULL DEFAULT 'POC_IFRS15',
        payment_method VARCHAR(32) NOT NULL DEFAULT 'Bank_Transfer',
        reference_no VARCHAR(128) NULL,
        voucher_id BIGINT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'POSTED',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_inc_proj (project_id),
        INDEX idx_inc_cat (cost_category),
        INDEX idx_inc_date (transaction_date),
        INDEX idx_inc_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS acc_project_expenditure_transactions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        organization_id BIGINT NOT NULL DEFAULT 1,
        expenditure_number VARCHAR(64) NOT NULL UNIQUE,
        transaction_date DATE NOT NULL,
        company_name VARCHAR(128) NOT NULL DEFAULT 'Bengal Real Estate Ltd.',
        branch_name VARCHAR(128) NOT NULL DEFAULT 'Head Office - Gulshan',
        project_id BIGINT NOT NULL,
        tower_id BIGINT NULL,
        unit_id BIGINT NULL,
        department_name VARCHAR(128) NOT NULL DEFAULT 'Civil Engineering',
        cost_center_id BIGINT NULL,
        construction_phase VARCHAR(64) NULL,
        cost_category VARCHAR(64) NOT NULL DEFAULT 'CIVIL_CONSTRUCTION',
        party_type VARCHAR(32) NOT NULL DEFAULT 'Supplier',
        vendor_id BIGINT NULL,
        contractor_id BIGINT NULL,
        party_name VARCHAR(191) NULL,
        budget_line_code VARCHAR(64) NULL,
        account_id BIGINT NULL,
        gross_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        tax_vat_deducted DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        retention_deducted DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        net_payable_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        paid_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        committed_po_reference VARCHAR(64) NULL,
        expenditure_type VARCHAR(32) NOT NULL DEFAULT 'POSTED_ACTUAL',
        payment_status VARCHAR(32) NOT NULL DEFAULT 'PAID',
        payment_method VARCHAR(32) NOT NULL DEFAULT 'Bank_Transfer',
        reference_no VARCHAR(128) NULL,
        voucher_id BIGINT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'POSTED',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_exp_proj (project_id),
        INDEX idx_exp_cat (cost_category),
        INDEX idx_exp_date (transaction_date),
        INDEX idx_exp_po (committed_po_reference),
        INDEX idx_exp_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

async def init_tables():
    async with engine.begin() as conn:
        for stmt in DDL_STATEMENTS:
            await conn.execute(text(stmt))
    print("Section 11 tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_tables())
