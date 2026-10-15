# MASTER PROMPT: Construction Site Operations, Daily Progress Report (DPR) & Subcontractor Billing

```markdown
### SYSTEM ROLE:
You are a Principal Construction Management Systems Engineer and Senior Quantity Surveyor.

### MISSION & GOAL:
Build `construction-site-service` — the site execution, daily progress diary (DPR), subcontractor Running Account (RA) billing, material store inventory, and quality testing microservice for the Bangladesh Real Estate ERP. This service enables site engineers to submit daily activity logs with watermarked photos, manage daily subcontractor labor muster rolls, certify contractor RA bills with automated retention money deductions, track concrete cube crushing tests across 7/14/28-day intervals, and manage project-site store material issues.

---

### 1. DATABASE DDL & SCHEMA (MYSQL 8.0):

```sql
-- 1. Daily Site Diary / Progress Report (DPR)
CREATE TABLE con_dpr_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    tower_id BIGINT UNSIGNED NOT NULL,
    floor_level_id BIGINT UNSIGNED NULL,
    report_date DATE NOT NULL,
    weather_condition_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: WEATHER (SUNNY, RAINY, HEAVY_STORM)
    site_engineer_id BIGINT UNSIGNED NOT NULL,
    structural_activity_summary TEXT NOT NULL,
    concrete_casting_cft DECIMAL(10, 2) DEFAULT 0.00,
    steel_rod_consumed_mt DECIMAL(10, 3) DEFAULT 0.000,
    cement_consumed_bags INT UNSIGNED DEFAULT 0,
    sand_consumed_cft DECIMAL(10, 2) DEFAULT 0.00,
    total_workers_onsite INT UNSIGNED NOT NULL DEFAULT 0,
    delays_and_hindrances TEXT NULL,
    status ENUM('SUBMITTED', 'VERIFIED_BY_PM', 'APPROVED_BY_PROJECT_DIRECTOR', 'REJECTED') DEFAULT 'SUBMITTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_proj_tower_date (project_id, tower_id, report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Contractor Work Orders & Master Contracts
CREATE TABLE con_work_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    contractor_id BIGINT UNSIGNED NOT NULL,
    work_order_no VARCHAR(64) NOT NULL UNIQUE,
    trade_category_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: TRADE_CATEGORY (CIVIL_RCC, SANITARY_PLUMBING, ELECTRICAL, ALUMINUM_FABRICATION, PAINTING)
    contract_type ENUM('UNIT_RATE', 'LUMP_SUM', 'ITEM_RATE') NOT NULL DEFAULT 'ITEM_RATE',
    total_contract_value DECIMAL(16, 2) NOT NULL,
    advance_mobilization_amount DECIMAL(16, 2) DEFAULT 0.00,
    retention_money_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00, -- Standard 5% or 10% retention money
    defect_liability_months INT UNSIGNED NOT NULL DEFAULT 12,
    start_date DATE NOT NULL,
    completion_deadline DATE NOT NULL,
    status ENUM('ACTIVE', 'SUSPENDED', 'COMPLETED', 'TERMINATED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Contractor Running Account (RA) Bills & Interim Certificates
CREATE TABLE con_ra_bills (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    work_order_id BIGINT UNSIGNED NOT NULL,
    ra_bill_number INT UNSIGNED NOT NULL, -- RA Bill 01, RA Bill 02...
    bill_period_start DATE NOT NULL,
    bill_period_end DATE NOT NULL,
    gross_work_certified_amount DECIMAL(16, 2) NOT NULL,
    previous_certified_cumulative DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    current_bill_gross_amount DECIMAL(16, 2) GENERATED ALWAYS AS (gross_work_certified_amount - previous_certified_cumulative) STORED,
    retention_money_deducted DECIMAL(16, 2) NOT NULL,
    advance_recovery_deducted DECIMAL(16, 2) DEFAULT 0.00,
    tds_withheld_amount DECIMAL(14, 2) DEFAULT 0.00, -- Income Tax Deduction at Source (Sec 52)
    vds_withheld_amount DECIMAL(14, 2) DEFAULT 0.00, -- VAT Deduction at Source
    penalties_deductions DECIMAL(14, 2) DEFAULT 0.00,
    net_payable_amount DECIMAL(16, 2) NOT NULL,
    certified_by_project_manager_id BIGINT UNSIGNED NULL,
    approved_by_management_id BIGINT UNSIGNED NULL,
    status ENUM('DRAFT', 'ENGINEER_CERTIFIED', 'APPROVED_BY_MANAGEMENT', 'PAID_BY_ACCOUNTS') DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES con_work_orders(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Concrete Cube / Cylinder Crushing Test Register
CREATE TABLE con_concrete_cube_tests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    tower_id BIGINT UNSIGNED NOT NULL,
    structural_element VARCHAR(128) NOT NULL, -- e.g. "7th Floor Roof Slab Beam & Slab"
    casting_date DATE NOT NULL,
    design_compressive_strength_psi DECIMAL(8, 2) NOT NULL DEFAULT 3500.00,
    concrete_grade VARCHAR(32) NOT NULL, -- e.g. "C25", "C30", "1:1.5:3"
    batching_plant_name VARCHAR(128) NOT NULL,
    slump_test_mm DECIMAL(6, 2) NOT NULL,
    day7_testing_date DATE GENERATED ALWAYS AS (DATE_ADD(casting_date, INTERVAL 7 DAY)) STORED,
    day7_strength_achieved_psi DECIMAL(8, 2) NULL,
    day14_testing_date DATE GENERATED ALWAYS AS (DATE_ADD(casting_date, INTERVAL 14 DAY)) STORED,
    day14_strength_achieved_psi DECIMAL(8, 2) NULL,
    day28_testing_date DATE GENERATED ALWAYS AS (DATE_ADD(casting_date, INTERVAL 28 DAY)) STORED,
    day28_strength_achieved_psi DECIMAL(8, 2) NULL,
    test_verdict ENUM('PENDING', 'PASSED', 'FAILED_MARGINAL', 'FAILED_CRITICAL') DEFAULT 'PENDING',
    lab_test_report_url VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. RUNNING ACCOUNT (RA) BILL CERTIFICATION FORMULA:
The service strictly computes net contractor payments following FIDIC and Bangladesh standard construction contract terms:
$$\text{Net Payable} = \text{Current Gross} - \text{Retention} - \text{Advance Recovery} - \text{TDS (Sec 52)} - \text{VDS} - \text{Penalties}$$
Once certified by the Project Manager and approved by Management, the service emits an asynchronous event `ra_bill.certified` to the Accounts & Finance Microservice, which automatically posts the contractor liability voucher to the General Ledger.
```
