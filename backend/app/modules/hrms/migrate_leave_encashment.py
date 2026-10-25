import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from sqlalchemy import text

from app.core.database import AsyncSessionLocal


CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS hr_leave_encashments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    organization_id BIGINT NOT NULL,
    employee_id BIGINT NOT NULL,
    leave_type_id BIGINT NOT NULL,
    balance_id BIGINT NOT NULL,
    year INT NOT NULL,
    days DECIMAL(5, 2) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    approved_at TIMESTAMP NULL,
    archived_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hle_org (organization_id),
    INDEX idx_hle_employee (employee_id),
    INDEX idx_hle_leave_type (leave_type_id),
    INDEX idx_hle_balance (balance_id),
    INDEX idx_hle_year (year),
    INDEX idx_hle_status (status),
    CONSTRAINT fk_hle_org FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hle_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hle_leave_type FOREIGN KEY (leave_type_id) REFERENCES hr_leave_types(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hle_balance FOREIGN KEY (balance_id) REFERENCES hr_leave_balances(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""


async def migrate():
    async with AsyncSessionLocal() as session:
        await session.execute(text(CREATE_TABLE))
        await session.commit()
        print("hr_leave_encashments table created or already exists.")


if __name__ == "__main__":
    asyncio.run(migrate())
