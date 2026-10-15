# MASTER PROMPT: Enterprise Accounts, Bangladesh VAT & Statutory Tax Microservice

```markdown
### SYSTEM ROLE:
You are a Principal Financial Systems Architect and Chartered Accountant (FCA) specializing in Real Estate Double-Entry Accounting and Bangladesh NBR Tax Compliance.

### MISSION & GOAL:
Build `accounts-finance-tax-service` — the double-entry General Ledger, Cash/Bank/MFS management, Bangladesh VAT (VAT Act 2012), Tax Deduction at Source (TDS/VDS), and Sub-Registry AIT (Sec 53FF & 53H) calculation microservice for the Bangladesh Real Estate ERP. This service maintains multi-company balanced ledgers, auto-posts journal vouchers from upstream operational events, generates official Mushak 6.3 Tax Invoices, and prepares real-time Trial Balances, Project Profit & Loss, and Balance Sheets.

---

### 1. DATABASE DDL & SCHEMA (MYSQL 8.0 - RANGE PARTITIONED):

```sql
-- 1. Chart of Accounts (COA)
CREATE TABLE acc_chart_of_accounts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    account_code VARCHAR(32) NOT NULL UNIQUE, -- e.g. "10101-CASH", "20101-ACCOUNTS-PAYABLE", "40101-FLAT-SALES"
    account_name_en VARCHAR(191) NOT NULL,
    account_name_bn VARCHAR(191) NOT NULL,
    account_type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE') NOT NULL,
    parent_account_id BIGINT UNSIGNED NULL,
    is_leaf_account BOOLEAN DEFAULT TRUE, -- Only leaf accounts accept direct journal postings
    is_reconciliation_account BOOLEAN DEFAULT FALSE, -- For Bank / Cash / MFS
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_account_id) REFERENCES acc_chart_of_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Financial Vouchers (Header)
CREATE TABLE acc_vouchers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    voucher_number VARCHAR(32) NOT NULL UNIQUE, -- e.g. "JV-2026-0042", "CRV-2026-0105", "CPV-2026-0089"
    voucher_type ENUM('JOURNAL', 'CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'CONTRA') NOT NULL,
    voucher_date DATE NOT NULL,
    narration TEXT NOT NULL,
    total_debit_amount DECIMAL(16, 2) NOT NULL,
    total_credit_amount DECIMAL(16, 2) NOT NULL,
    prepared_by_user_id BIGINT UNSIGNED NOT NULL,
    approved_by_user_id BIGINT UNSIGNED NULL,
    status ENUM('DRAFT', 'POSTED', 'REVERSED') DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_proj_date (project_id, voucher_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. General Ledger Journal Entries (Exceeds 1 Crore Rows - Range Partitioned by Year)
CREATE TABLE acc_journal_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    voucher_id BIGINT UNSIGNED NOT NULL,
    organization_id INT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    voucher_date DATE NOT NULL,
    debit_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    credit_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'BDT',
    narration TEXT NULL,
    reconciliation_status ENUM('UNRECONCILED', 'RECONCILED') DEFAULT 'UNRECONCILED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, voucher_date),
    KEY idx_account_date (account_id, voucher_date),
    KEY idx_proj_acc (project_id, account_id),
    KEY idx_voucher (voucher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(voucher_date)) (
    PARTITION p_2024 VALUES LESS THAN (2025),
    PARTITION p_2025 VALUES LESS THAN (2026),
    PARTITION p_2026 VALUES LESS THAN (2027),
    PARTITION p_2027 VALUES LESS THAN (2028),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 4. Bangladesh VAT & Mushak 6.3 Tax Invoices
CREATE TABLE acc_mushak_tax_invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    installment_receipt_id BIGINT UNSIGNED NOT NULL,
    mushak_challan_number VARCHAR(64) NOT NULL UNIQUE, -- e.g. "MUSHAK-6.3-2026-00812"
    invoice_date DATE NOT NULL,
    developer_bin_number VARCHAR(32) NOT NULL,
    customer_tin_nid VARCHAR(32) NOT NULL,
    customer_name VARCHAR(191) NOT NULL,
    apartment_sqft DECIMAL(10, 2) NOT NULL,
    taxable_amount DECIMAL(16, 2) NOT NULL,
    vat_rate_percent DECIMAL(5, 2) NOT NULL, -- 2.0% (<=1600 sqft) or 4.5% (>1600 sqft)
    vat_amount DECIMAL(14, 2) NOT NULL,
    total_amount_collected DECIMAL(16, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. BANGLADESH SUB-REGISTRY COST & AIT ESTIMATOR:
A dedicated calculation endpoint provides real-time estimation of official registration expenses for buyers:
```python
def calculate_sub_registry_costs(deed_value: float, sqft: float, location_tier: str) -> dict:
    stamp_duty = deed_value * 0.015 # 1.5%
    registration_fee = deed_value * 0.010 # 1.0%
    local_govt_tax = deed_value * 0.020 # 2.0% (City Corporation)
    
    # Advance Income Tax (AIT) under Section 53FF of Income Tax Act 2023:
    sqm = sqft / 10.7639
    ait_rate_per_sqm = {
        "GULSHAN_BANANI_BARIDHARA": 4000.0,
        "DHANMONDI_UTTARA_MOHAKHALI": 3000.0,
        "OTHER_DHAKA_CITY_CORP": 1500.0,
        "MUNICIPALITY_AREAS": 800.0
    }.get(location_tier, 1500.0)
    
    ait_amount = sqm * ait_rate_per_sqm
    total_registration_cost = stamp_duty + registration_fee + local_govt_tax + ait_amount
    
    return {
        "deed_value_bdt": deed_value,
        "stamp_duty_bdt": round(stamp_duty, 2),
        "registration_fee_bdt": round(registration_fee, 2),
        "local_govt_tax_bdt": round(local_govt_tax, 2),
        "ait_sec53ff_bdt": round(ait_amount, 2),
        "total_estimated_sub_registry_cost_bdt": round(total_registration_cost, 2)
    }
```

---

### 3. IMMUTABILITY & AUDIT COMPLIANCE:
- Financial records are append-only. **Zero hard deletions** on `acc_vouchers` or `acc_journal_entries`.
- Errors must be corrected exclusively via **Reversal Journal Vouchers** (Contras), maintaining a 100% auditable accounting trail.
```
