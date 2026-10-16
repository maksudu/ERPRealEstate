-- =============================================================================
-- BANGLADESH REAL ESTATE ENTERPRISE ERP
-- HIGH-VOLUME 1-CRORE (10M+) TRANSACTIONAL TABLE PARTITIONING MIGRATION SCRIPT
-- Target Engine: MySQL 8.0+ / MariaDB 10.4+ InnoDB
-- =============================================================================

-- Disable foreign key checks during migration
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. TABLE: `acc_journal_entries`
-- Target Volume: 1 Crore (10M+) General Ledger Double-Entry records
-- Partitioning Strategy: RANGE (YEAR(voucher_date))
-- -----------------------------------------------------------------------------

-- 1.1 Ensure table exists with composite primary key (id, voucher_date)
CREATE TABLE IF NOT EXISTS `acc_journal_entries` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `voucher_date` DATE NOT NULL,
  `voucher_id` BIGINT NOT NULL,
  `company_id` BIGINT NULL DEFAULT 1,
  `project_id` BIGINT NULL,
  `account_id` BIGINT NOT NULL,
  `debit_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `credit_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `narration` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`, `voucher_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2 Composite Covering Indexes for 10M+ records
-- Index 1: Covering index for Project Cost Analysis & Ledger Statement drilldowns
CREATE INDEX IF NOT EXISTS `idx_je_proj_acct_date` 
  ON `acc_journal_entries` (`project_id`, `account_id`, `voucher_date`);

-- Index 2: Covering index for Voucher line item lookups & balance validations
CREATE INDEX IF NOT EXISTS `idx_je_voucher_id` 
  ON `acc_journal_entries` (`voucher_id`);

-- Index 3: Covering index for Corporate Multi-entity P&L & Balance Sheet queries
CREATE INDEX IF NOT EXISTS `idx_je_company_voucher_date` 
  ON `acc_journal_entries` (`company_id`, `voucher_date`);

-- 1.3 Apply Native MySQL RANGE (YEAR(voucher_date)) Partitioning
ALTER TABLE `acc_journal_entries`
PARTITION BY RANGE (YEAR(voucher_date)) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p2027 VALUES LESS THAN (2028),
  PARTITION p_max VALUES LESS THAN MAXVALUE
);


-- -----------------------------------------------------------------------------
-- 2. TABLE: `sys_audit_trails`
-- Target Volume: 1 Crore (10M+) System Audit Log records
-- Partitioning Strategy: RANGE (YEAR(created_at))
-- -----------------------------------------------------------------------------

-- 2.1 Composite Covering Indexes for Audit Trails
-- Index 1: Covering index for User Activity Timeline & Compliance queries
CREATE INDEX IF NOT EXISTS `idx_audit_user_created` 
  ON `sys_audit_trails` (`user_id`, `created_at`);

-- Index 2: Covering index for Entity Lifecycle & Mutation history searches
CREATE INDEX IF NOT EXISTS `idx_audit_entity_name_id` 
  ON `sys_audit_trails` (`entity_name`, `entity_id`);

-- 2.2 Apply Native MySQL RANGE (YEAR(created_at)) Partitioning
ALTER TABLE `sys_audit_trails`
PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p2027 VALUES LESS THAN (2028),
  PARTITION p_max VALUES LESS THAN MAXVALUE
);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
