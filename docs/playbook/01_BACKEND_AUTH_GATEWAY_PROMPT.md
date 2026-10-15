# MASTER PROMPT: Core API Gateway, Multi-Tenant Auth & Project-Scoped RBAC Microservice

```markdown
### SYSTEM ROLE:
You are a Principal Security Architect and Enterprise Backend Specialist (Python FastAPI, OAuth2/JWT, MySQL 8.0, Redis).

### MISSION & GOAL:
Build `auth-governance-service` — the central API Gateway, multi-tenant organization hierarchy, JWT authentication, project-scoped Role-Based Access Control (RBAC), and immutable audit logging microservice for the Bangladesh Real Estate ERP. This service ensures multi-company data isolation (Parent Real Estate Group + Subsidiaries), enforces project-level data access restrictions (so site engineers or sales officers only access assigned projects), and captures immutable mutation logs for forensic accounting.

---

### 1. DATABASE DDL & SCHEMA (MYSQL 8.0):

```sql
-- 1. Multi-Company Organization Hierarchy
CREATE TABLE sys_organizations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_code VARCHAR(32) NOT NULL UNIQUE, -- e.g. "ABC_GROUP", "ABC_HOLDINGS", "ABC_BUILDERS"
    legal_name_en VARCHAR(191) NOT NULL,
    legal_name_bn VARCHAR(191) NOT NULL,
    trade_license_number VARCHAR(64) NOT NULL,
    tin_number VARCHAR(32) NOT NULL,
    bin_vat_number VARCHAR(32) NOT NULL, -- 13-digit BIN under VAT Act 2012
    rehab_membership_number VARCHAR(32) NULL, -- REHAB Membership Number
    parent_organization_id INT UNSIGNED NULL, -- Multi-tenant subsidiary tree
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. User Accounts & Identity
CREATE TABLE sys_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(191) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(191) NOT NULL,
    full_name_bn VARCHAR(191) NOT NULL,
    employee_code VARCHAR(32) NULL UNIQUE,
    designation VARCHAR(128) NULL,
    is_group_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    INDEX idx_user_login (email, phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Roles & Permissions Master
CREATE TABLE sys_roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_code VARCHAR(64) NOT NULL UNIQUE, -- e.g., 'PROJECT_DIRECTOR', 'SALES_MANAGER', 'SITE_ENGINEER', 'ACCOUNTS_OFFICER'
    role_name VARCHAR(128) NOT NULL,
    description VARCHAR(255) NULL,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sys_permissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    permission_code VARCHAR(64) NOT NULL UNIQUE, -- e.g., 'land:create', 'sales:approve_discount', 'ra_bill:certify'
    module_name VARCHAR(64) NOT NULL,
    description VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sys_role_permissions (
    role_id INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES sys_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES sys_permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User Role & Project-Scoped Data Access Assignment
-- CRITICAL REQUIREMENT: Controls which specific projects a user has access to!
CREATE TABLE sys_user_project_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    can_view_financials BOOLEAN DEFAULT FALSE, -- Field-level protection for sensitive revenue/costs
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES sys_roles(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_user_proj_role (user_id, project_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Immutable Mutation Audit Trails (Exceeds 2 Crore Rows - Partitioned by Year)
CREATE TABLE sys_audit_trails (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    microservice_name VARCHAR(64) NOT NULL,
    entity_name VARCHAR(64) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    action_type ENUM('CREATE', 'UPDATE', 'SOFT_DELETE', 'APPROVE', 'REJECT', 'STATUS_CHANGE') NOT NULL,
    payload_before JSON NULL,
    payload_after JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at),
    KEY idx_entity (entity_name, entity_id, created_at),
    KEY idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p_2025 VALUES LESS THAN (2026),
    PARTITION p_2026 VALUES LESS THAN (2027),
    PARTITION p_2027 VALUES LESS THAN (2028),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

---

### 2. PROJECT-SCOPED RBAC FASTAPI DEPENDENCY:
```python
from fastapi import Depends, HTTPException, Header, status
from typing import Optional

async def require_project_permission(
    permission_code: str,
    x_project_id: Optional[int] = Header(None, alias="X-Project-Id"),
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # Group Admins have global access
    if current_user.is_group_admin:
        return True

    if not x_project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'X-Project-Id' is mandatory to scope data access."
        )

    # Verify user is assigned to this project with the required permission
    has_perm = await verify_user_project_perm(db, current_user.id, x_project_id, permission_code)
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. You do not hold '{permission_code}' on Project #{x_project_id}."
        )
    return True
```
```
