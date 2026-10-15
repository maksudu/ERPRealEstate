-- Bangladesh Real Estate ERP - Authentication, Multi-Tenant Hierarchy, RBAC & Partitioned Audit Schema
-- Optimized for MySQL 8.0+ / 2 Crore+ (20M+) Audit Scalability

USE erp_realestate_db;

-- 1. Multi-Tenant Organization Hierarchy
CREATE TABLE IF NOT EXISTS sys_organizations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_code VARCHAR(32) NOT NULL UNIQUE,
    legal_name_en VARCHAR(191) NOT NULL,
    legal_name_bn VARCHAR(191) NOT NULL,
    tin_number VARCHAR(64) NULL,
    bin_vat_number VARCHAR(64) NULL,
    rehab_membership_number VARCHAR(64) NULL,
    parent_organization_id BIGINT UNSIGNED NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_org_parent (parent_organization_id),
    CONSTRAINT fk_org_parent FOREIGN KEY (parent_organization_id) REFERENCES sys_organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. System RBAC Roles
CREATE TABLE IF NOT EXISTS sys_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_code VARCHAR(64) NOT NULL UNIQUE,
    role_name VARCHAR(128) NOT NULL,
    description VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. System Users
CREATE TABLE IF NOT EXISTS sys_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT UNSIGNED NOT NULL,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(191) NOT NULL UNIQUE,
    phone_number VARCHAR(32) NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(128) NOT NULL,
    full_name_bn VARCHAR(128) NOT NULL,
    is_group_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_org (organization_id),
    CONSTRAINT fk_user_org FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Project-Scoped User Assignments (Enforces X-Project-Id RBAC)
CREATE TABLE IF NOT EXISTS sys_user_project_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    role_code VARCHAR(64) NOT NULL,
    can_view_financials BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_project (user_id, project_id),
    INDEX idx_assignment_user (user_id),
    INDEX idx_assignment_proj (project_id),
    CONSTRAINT fk_assignment_user FOREIGN KEY (user_id) REFERENCES sys_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Range-Partitioned Audit Trails (Scales for 2 Crore+ Records)
CREATE TABLE IF NOT EXISTS sys_audit_trails (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    microservice_name VARCHAR(64) NOT NULL,
    entity_name VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NULL,
    action_type ENUM('CREATE', 'UPDATE', 'DELETE', 'CUSTOM') NOT NULL,
    payload_before JSON NULL,
    payload_after JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_entity (entity_name, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p_2024 VALUES LESS THAN (2025),
    PARTITION p_2025 VALUES LESS THAN (2026),
    PARTITION p_2026 VALUES LESS THAN (2027),
    PARTITION p_2027 VALUES LESS THAN (2028),
    PARTITION p_2028 VALUES LESS THAN (2029),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
