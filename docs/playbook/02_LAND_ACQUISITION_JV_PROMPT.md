# MASTER PROMPT: Land Acquisition, Joint Venture (JV) & Survey Records Microservice

```markdown
### SYSTEM ROLE:
You are a Principal Software Architect and Domain Expert in Bangladesh Land Laws, Land Survey Systems (CS, SA, RS, BS), and Real Estate Joint Venture (JV) Operations.

### MISSION & GOAL:
Build the production-ready `land-jv-service` — a mission-critical FastAPI microservice for the Bangladesh Real Estate ERP. This service manages prospective land acquisitions, legal heirship and landowner profiles, historic survey khatians (CS, SA, RS, BS/City Survey), mouza and dag boundary mapping, regional mathematical conversions (Decimal, Katha, Bigha, Acre), Joint Venture (JV) landowner-developer share allocation matrices, and sub-registry legal due diligence.

---

### 1. TECHNICAL STACK & ARCHITECTURE:
- **Framework**: Python 3.12+ with FastAPI (Async/Await)
- **Database**: MySQL 8.0 with InnoDB Engine & Spatial Extensions
- **ORM**: Async SQLAlchemy 2.0 with `asyncmy` driver
- **Validation**: Pydantic v2
- **Caching**: Redis 7.0 for frequently searched Mouza/Dag records
- **Document Management**: MinIO S3 integration for scanned deeds, mutation khatians, and DCR receipts

---

### 2. COMPLETE DATABASE DDL & SCHEMA (MYSQL 8.0):

```sql
-- 1. Land Bank & Prospective Acquisition Projects
CREATE TABLE lnd_land_banks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    project_code VARCHAR(32) NOT NULL UNIQUE,
    proposal_title VARCHAR(255) NOT NULL,
    division_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: GEO_DIVISION
    district_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: GEO_DISTRICT
    upazila_thana_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: GEO_THANA
    mouza_name VARCHAR(128) NOT NULL,
    jl_number VARCHAR(32) NOT NULL,
    total_proposed_area_katha DECIMAL(12, 4) NOT NULL,
    total_proposed_area_decimal DECIMAL(12, 4) NOT NULL,
    total_proposed_area_sqft DECIMAL(14, 2) NOT NULL,
    deal_type ENUM('OUTRIGHT_PURCHASE', 'JOINT_VENTURE', 'LEASEHOLD') NOT NULL DEFAULT 'JOINT_VENTURE',
    status ENUM('PROPOSAL', 'LEGAL_VERIFICATION', 'NEGOTIATION', 'JV_AGREEMENT_SIGNED', 'REGISTRATION_COMPLETE', 'REJECTED') DEFAULT 'PROPOSAL',
    acquisition_budget DECIMAL(16, 2) DEFAULT 0.00,
    agreed_deal_amount DECIMAL(16, 2) DEFAULT 0.00,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mouza_jl (mouza_name, jl_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Landowners & Legal Heirs Directory
CREATE TABLE lnd_landowners (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    land_bank_id BIGINT UNSIGNED NOT NULL,
    owner_type ENUM('PRIMARY_OWNER', 'CO_OWNER', 'LEGAL_HEIR', 'POA_HOLDER') DEFAULT 'PRIMARY_OWNER',
    full_name_en VARCHAR(191) NOT NULL,
    full_name_bn VARCHAR(191) NOT NULL,
    father_husband_name VARCHAR(191) NOT NULL,
    mother_name VARCHAR(191) NULL,
    nid_number VARCHAR(20) NOT NULL,
    tin_number VARCHAR(20) NULL,
    contact_phone VARCHAR(20) NOT NULL,
    present_address TEXT NOT NULL,
    permanent_address TEXT NOT NULL,
    ownership_share_ratio DECIMAL(7, 4) NOT NULL DEFAULT 1.0000, -- e.g., 0.5000 = 50% share
    bank_account_title VARCHAR(191) NULL,
    bank_account_number VARCHAR(64) NULL,
    bank_name VARCHAR(128) NULL,
    bank_branch VARCHAR(128) NULL,
    routing_number VARCHAR(32) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (land_bank_id) REFERENCES lnd_land_banks(id) ON DELETE CASCADE,
    INDEX idx_nid (nid_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Historic Survey Records (CS, SA, RS, BS / City Survey)
CREATE TABLE lnd_survey_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    land_bank_id BIGINT UNSIGNED NOT NULL,
    survey_type_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: LAND_SURVEY_TYPE (CS, SA, RS, BS, MUTATION)
    khatian_number VARCHAR(64) NOT NULL,
    recorded_tenant_name VARCHAR(191) NOT NULL, -- পরচায় উল্লিখিত প্রজার নাম
    dag_number VARCHAR(64) NOT NULL,
    land_class_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: LAND_CLASS (নাল, ভিটি, চালা, ডোবা, বাণিজ্যিক)
    recorded_area_decimal DECIMAL(10, 4) NOT NULL,
    recorded_area_katha DECIMAL(10, 4) NOT NULL,
    share_of_tenant DECIMAL(7, 4) NOT NULL DEFAULT 1.0000, -- ১৬ আনা বা অংশে হিসাব
    chain_remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (land_bank_id) REFERENCES lnd_land_banks(id) ON DELETE CASCADE,
    INDEX idx_khatian_dag (khatian_number, dag_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Joint Venture (JV) Ratio & Sharing Agreement
CREATE TABLE lnd_jv_agreements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    land_bank_id BIGINT UNSIGNED NOT NULL UNIQUE,
    agreement_deed_no VARCHAR(64) NOT NULL,
    deed_registration_date DATE NOT NULL,
    sub_registry_office VARCHAR(128) NOT NULL,
    poa_deed_no VARCHAR(64) NOT NULL, -- Power of Attorney Deed
    poa_registration_date DATE NOT NULL,
    landowner_share_percent DECIMAL(5, 2) NOT NULL, -- e.g., 50.00%
    developer_share_percent DECIMAL(5, 2) NOT NULL, -- e.g., 50.00%
    signing_money_total DECIMAL(16, 2) DEFAULT 0.00, -- ডেভেলপার কর্তৃক সাইনিং মানি
    signing_money_paid DECIMAL(16, 2) DEFAULT 0.00,
    estimated_construction_tenure_months INT UNSIGNED NOT NULL DEFAULT 36,
    grace_period_months INT UNSIGNED DEFAULT 6,
    delay_compensation_per_sqft_monthly DECIMAL(8, 2) DEFAULT 0.00,
    status ENUM('ACTIVE', 'AMENDED', 'COMPLETED', 'DISPUTED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (land_bank_id) REFERENCES lnd_land_banks(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Landowner Unit Allocation Matrix (Prevents selling owner share!)
CREATE TABLE lnd_jv_unit_allocations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    jv_agreement_id BIGINT UNSIGNED NOT NULL,
    landowner_id BIGINT UNSIGNED NOT NULL,
    floor_level VARCHAR(32) NOT NULL,
    unit_identifier VARCHAR(32) NOT NULL, -- e.g. "Apartment 4A"
    carpet_area_sqft DECIMAL(10, 2) NOT NULL,
    parking_bay_number VARCHAR(32) NULL,
    allocation_type ENUM('LANDOWNER_UNIT', 'DEVELOPER_UNIT') NOT NULL,
    is_locked_for_sales BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jv_agreement_id) REFERENCES lnd_jv_agreements(id) ON DELETE CASCADE,
    FOREIGN KEY (landowner_id) REFERENCES lnd_landowners(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_unit_alloc (jv_agreement_id, unit_identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3. BANGLADESH MATHEMATICAL AREA CONVERSION ENGINE:
Implement a deterministic conversion utility ensuring district-level precision:
```python
class BDLandConversionEngine:
    STANDARD_RATIOS = {
        "SQFT_PER_DECIMAL": 435.60,
        "SQFT_PER_KATHA": 720.00,
        "KATHA_PER_BIGHA": 20.00,
        "DECIMAL_PER_ACRE": 100.00
    }

    @staticmethod
    def calculate_all(sqft: float) -> dict:
        decimal_val = sqft / 435.60
        katha_val = sqft / 720.00
        bigha_val = katha_val / 20.00
        acre_val = sqft / 43560.00
        return {
            "sqft": round(sqft, 2),
            "decimal": round(decimal_val, 4),
            "katha": round(katha_val, 4),
            "bigha": round(bigha_val, 4),
            "acre": round(acre_val, 4),
            "formatted_summary_bn": f"{round(katha_val, 2)} কাঠা ({round(decimal_val, 2)} শতাংশ)"
        }
```

---

### 4. CORE REST API ENDPOINTS:
- `GET /api/v1/land/proposals` (Filters: status, district, division; with keyset pagination).
- `POST /api/v1/land/proposals` (Creates new land acquisition file).
- `POST /api/v1/land/proposals/{id}/landowners` (Attaches landowner/heir with NID & share ratio).
- `POST /api/v1/land/proposals/{id}/surveys` (Records CS/SA/RS/BS khatian & dag details).
- `POST /api/v1/land/proposals/{id}/jv-agreement` (Creates JV terms, signing money schedule, and share split).
- `POST /api/v1/land/jv-agreements/{id}/allocate-units` (Allocates specific units to Landowner; emits `land.unit_allocated` event to lock units from Sales Inventory).
- `GET /api/v1/land/proposals/{id}/chain-of-ownership` (Generates sequential deed chain report).

---

### 5. BUSINESS RULES & CRITICAL SAFEGUARDS:
1. **Ownership Ratio Sum Validation**: The sum of `ownership_share_ratio` across all landowners of a land bank must equal `1.0000` (100% / ১৬ আনা).
2. **Permanent Sales Lock on Landowner Units**: Any apartment designated as `allocation_type = 'LANDOWNER_UNIT'` must be permanently locked in the Unit Inventory table. The sales engine must strictly reject any booking attempts for landowner units.
3. **Mutation & DCR Verification**: Before advancing status to `REGISTRATION_COMPLETE`, the system requires verified scans of: Registered Deed, Mutation Khatian (নামজারি), DCR, and up-to-date Land Development Tax Receipt (দাখিলা).
```
