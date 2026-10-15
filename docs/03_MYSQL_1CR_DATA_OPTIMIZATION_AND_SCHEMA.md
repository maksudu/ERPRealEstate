# MySQL 8.0 Architecture & 1 Crore (10M+) Data Scale Optimization

## 1. High-Scale Engineering Principles for 10M+ Records
Handling ~1,00,00,000 (1 crore) records in an enterprise ERP without performance degradation requires a combination of **Table Partitioning**, **Composite Covering Indexes**, **Read-Write Splitting**, **Query Profiling**, and **ProxySQL Connection Pooling**.

---

## 2. Dynamic Lookup System (100% Zero Hardcoded Dropdowns)

As per system specifications, **no dropdown in the application shall be hardcoded**. All dropdown selections across the 80 modules are driven dynamically by the `sys_lookup_categories` and `sys_lookup_items` master tables, cached in Redis with a 24-hour TTL and invalidation triggers on mutation.

```sql
-- 1. Lookup Categories (Defines the group, e.g., 'UNIT_FACING', 'MOUZA_SURVEY_TYPE', 'RAJUK_APPROVAL_STAGE')
CREATE TABLE sys_lookup_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(64) NOT NULL UNIQUE,
    category_name VARCHAR(128) NOT NULL,
    description VARCHAR(255) NULL,
    is_hierarchical BOOLEAN DEFAULT FALSE,
    is_system_locked BOOLEAN DEFAULT FALSE, -- Prevents accidental deletion of critical system categories
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cat_code (category_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Lookup Items (Values rendered inside the searchable dropdowns)
CREATE TABLE sys_lookup_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    item_code VARCHAR(64) NOT NULL,
    item_name_en VARCHAR(191) NOT NULL,
    item_name_bn VARCHAR(191) NOT NULL, -- Full Bangla support
    parent_id BIGINT UNSIGNED NULL,     -- Allows nested cascading dropdowns (e.g. Division -> District -> Thana)
    color_badge VARCHAR(32) NULL,       -- Hex code or CSS badge class (e.g., '#10B981')
    sort_order INT UNSIGNED DEFAULT 0,
    metadata JSON NULL,                 -- Configurable JSON properties for flexible domain attributes
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cat_item (category_id, item_code),
    INDEX idx_cat_active_sort (category_id, is_active, sort_order),
    INDEX idx_parent (parent_id),
    CONSTRAINT fk_lookup_category FOREIGN KEY (category_id) REFERENCES sys_lookup_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_lookup_parent FOREIGN KEY (parent_id) REFERENCES sys_lookup_items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. High-Volume Table Schema with MySQL Range Partitioning (10M+ Scale)

### A. General Ledger Journal Entries (Exceeds 1 Crore Rows)
Financial transactions scale to tens of millions of entries over multiple fiscal years. This table is partitioned by Year using MySQL `RANGE (YEAR(voucher_date))` so queries spanning a specific fiscal year touch only that partition, bypassing 80%+ of the physical data files.

```sql
CREATE TABLE acc_journal_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    voucher_id BIGINT UNSIGNED NOT NULL,
    company_id INT UNSIGNED NOT NULL,
    project_id INT UNSIGNED NOT NULL,
    account_id INT UNSIGNED NOT NULL,
    voucher_date DATE NOT NULL,
    debit_amount DECIMAL(16, 4) NOT NULL DEFAULT 0.0000,
    credit_amount DECIMAL(16, 4) NOT NULL DEFAULT 0.0000,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'BDT',
    exchange_rate DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
    bdt_debit_amount DECIMAL(16, 4) NOT NULL DEFAULT 0.0000,
    bdt_credit_amount DECIMAL(16, 4) NOT NULL DEFAULT 0.0000,
    narration TEXT NULL,
    reconciliation_status ENUM('UNRECONCILED', 'RECONCILED', 'LOCKED') DEFAULT 'UNRECONCILED',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, voucher_date),
    KEY idx_proj_acc_date (project_id, account_id, voucher_date),
    KEY idx_comp_date (company_id, voucher_date),
    KEY idx_voucher (voucher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(voucher_date)) (
    PARTITION p_history VALUES LESS THAN (2024),
    PARTITION p_2024 VALUES LESS THAN (2025),
    PARTITION p_2025 VALUES LESS THAN (2026),
    PARTITION p_2026 VALUES LESS THAN (2027),
    PARTITION p_2027 VALUES LESS THAN (2028),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### B. Audit Trail & Mutation Log Table (Exceeds 2 Crore Rows)
Every insert, update, soft-delete, and status change generates an immutable audit record. Partitioned by `RANGE (UNIX_TIMESTAMP(created_at))` or monthly hash.

```sql
CREATE TABLE sys_audit_trails (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    microservice_name VARCHAR(64) NOT NULL,
    entity_name VARCHAR(64) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    action_type ENUM('CREATE', 'UPDATE', 'SOFT_DELETE', 'APPROVE', 'REJECT', 'STATUS_CHANGE') NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at),
    KEY idx_entity (entity_name, entity_id, created_at),
    KEY idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p_audit_2025 VALUES LESS THAN (2026),
    PARTITION p_audit_2026 VALUES LESS THAN (2027),
    PARTITION p_audit_2027 VALUES LESS THAN (2028),
    PARTITION p_audit_future VALUES LESS THAN MAXVALUE
);
```

### C. Construction Daily Site Logs & Labor Muster Roll (Millions of Rows)
Site engineers, subcontractors, and daily labor records across 20-50 simultaneous projects generate millions of rows.

```sql
CREATE TABLE con_daily_site_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    project_id INT UNSIGNED NOT NULL,
    building_tower_id INT UNSIGNED NOT NULL,
    floor_level_id INT UNSIGNED NULL,
    log_date DATE NOT NULL,
    weather_condition_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup
    work_description TEXT NOT NULL,
    total_workers_onsite INT UNSIGNED NOT NULL DEFAULT 0,
    concrete_casting_volume DECIMAL(12, 2) DEFAULT 0.00, -- in cft or m3
    site_engineer_id BIGINT UNSIGNED NOT NULL,
    status ENUM('DRAFT', 'SUBMITTED', 'VERIFIED_BY_PM', 'REJECTED') DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, log_date),
    KEY idx_proj_date (project_id, log_date),
    KEY idx_engineer (site_engineer_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(log_date)) (
    PARTITION p_con_2024 VALUES LESS THAN (2025),
    PARTITION p_con_2025 VALUES LESS THAN (2026),
    PARTITION p_con_2026 VALUES LESS THAN (2027),
    PARTITION p_con_future VALUES LESS THAN MAXVALUE
);
```

---

## 4. Crucial Indexing & Query Tuning Guidelines (10M+ Scale)

1. **Covering Indexes for Zero-Disk Seek**:
   - For customer installment ledger summaries:
     ```sql
     CREATE INDEX idx_inst_ledger ON sls_customer_installments 
     (booking_id, status, due_date, payable_amount, paid_amount);
     ```
   - When querying `SELECT due_date, payable_amount FROM sls_customer_installments WHERE booking_id = ? AND status = 'DUE'`, MySQL satisfies the query entirely from the B-tree index memory buffer (Index Only Scan), executing in <1ms.

2. **Avoiding Wildcard Leading Searches**:
   - In MySQL, `LIKE '%Mirpur%'` triggers a full table scan.
   - For searching 10M+ records (e.g. searching across Client NID, Plot Dag numbers, or Supplier names), we employ **Full-Text Search (InnoDB FTS)** with N-gram parser:
     ```sql
     ALTER TABLE lnd_dag_records ADD FULLTEXT INDEX fts_mouza_dag (mouza_name, khatian_number, dag_number);
     ```
   - Queries execute using `WHERE MATCH(mouza_name, khatian_number, dag_number) AGAINST (? IN BOOLEAN MODE)` in sub-millisecond time.

3. **Keyset Pagination (Seek Method) Instead of High `OFFSET`**:
   - Never use `OFFSET 500000 LIMIT 20` on a 1 crore row table; MySQL must parse and discard 5,00,000 rows.
   - All ERP infinite-scroll and paginated APIs use **Keyset Pagination**:
     ```sql
     SELECT id, voucher_no, debit, credit FROM acc_journal_entries 
     WHERE project_id = 12 AND id < :last_seen_id 
     ORDER BY id DESC LIMIT 20;
     ```

---

## 5. MySQL Read-Write Splitting & ProxySQL Architecture
```
                  [ FastAPI Microservices Pool ]
                               │
                               ▼
               [ ProxySQL (Port 6033 Load Balancer) ]
               - Query Rule: SELECT ... -> Read Replicas (Hostgroup 20)
               - Query Rule: INSERT/UPDATE/DELETE -> Master (Hostgroup 10)
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
 [ MySQL Master Node ]                 [ MySQL Read Replicas ]
 (InnoDB ACID Writes)                  (Async/Semi-Sync Replication)
 - Handles Bookings, Vouchers          - Handles BI Dashboards, Audits,
 - Transactional Locking                 Customer Aging Reports, Exports
```

- **Connection Pool Configuration (SQLAlchemy 2.0)**:
  - `pool_size = 25`, `max_overflow = 50`, `pool_recycle = 1800` (prevents stale MySQL connection dropouts), `pool_pre_ping = True`.
- **InnoDB Buffer Pool Sizing**:
  - Allocated to **70-80% of total physical RAM** on dedicated database servers (e.g., 64GB RAM server -> 48GB `innodb_buffer_pool_size`).
