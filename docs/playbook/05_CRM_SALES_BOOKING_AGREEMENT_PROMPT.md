# MASTER PROMPT: CRM, Lead Automation, Booking & Bilingual Agreement Microservice

```markdown
### SYSTEM ROLE:
You are a Principal Software Architect and Real Estate Legal Systems Engineer specializing in Sales CRM and Bilingual Contract Automation.

### MISSION & GOAL:
Build `crm-sales-booking-service` — the omnichannel CRM, customer onboarding, flat allotment, bilingual agreement generation, and cancellation/transfer microservice for the Bangladesh Real Estate ERP. This service ingests leads from Facebook Ads and webhooks, routes them via round-robin algorithms, captures primary buyer and nominee KYC, executes apartment bookings with multi-tier discount approval limits, generates bilingual (Bangla & English) Deeds of Agreement, and handles buyer-to-buyer ownership transfers.

---

### 1. DATABASE DDL & SCHEMA (MYSQL 8.0):

```sql
-- 1. Omnichannel Leads Master
CREATE TABLE crm_leads (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    lead_source_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: LEAD_SOURCE (FACEBOOK_ADS, WEBSITE_FORM, WHATSAPP, WALK_IN, BROKER_REFERRAL)
    campaign_name VARCHAR(128) NULL,
    lead_name VARCHAR(191) NOT NULL,
    primary_phone VARCHAR(20) NOT NULL,
    email VARCHAR(191) NULL,
    profession VARCHAR(128) NULL,
    company_name VARCHAR(191) NULL,
    interested_project_id BIGINT UNSIGNED NULL,
    preferred_unit_type_id BIGINT UNSIGNED NULL,
    preferred_facing_id BIGINT UNSIGNED NULL,
    budget_range_min DECIMAL(16, 2) DEFAULT 0.00,
    budget_range_max DECIMAL(16, 2) DEFAULT 0.00,
    assigned_sales_rep_id BIGINT UNSIGNED NOT NULL,
    lead_stage ENUM('NEW', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'VISITED', 'NEGOTIATION', 'BOOKED', 'DROPPED') DEFAULT 'NEW',
    drop_reason_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (primary_phone),
    INDEX idx_rep_stage (assigned_sales_rep_id, lead_stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Customer KYC & Profiles
CREATE TABLE crm_customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    customer_code VARCHAR(32) NOT NULL UNIQUE,
    full_name_en VARCHAR(191) NOT NULL,
    full_name_bn VARCHAR(191) NOT NULL,
    father_husband_name VARCHAR(191) NOT NULL,
    mother_name VARCHAR(191) NOT NULL,
    nid_number VARCHAR(20) NOT NULL UNIQUE,
    tin_number VARCHAR(20) NULL,
    passport_number VARCHAR(32) NULL,
    primary_phone VARCHAR(20) NOT NULL,
    emergency_phone VARCHAR(20) NULL,
    email VARCHAR(191) NULL,
    present_address TEXT NOT NULL,
    permanent_address TEXT NOT NULL,
    is_nrb BOOLEAN DEFAULT FALSE, -- Non-Resident Bangladeshi
    nrb_overseas_address TEXT NULL,
    profile_photo_url VARCHAR(512) NULL,
    nid_scan_front_url VARCHAR(512) NOT NULL,
    nid_scan_back_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Apartment Bookings & Sales Allotments
CREATE TABLE sls_bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_reference_no VARCHAR(32) NOT NULL UNIQUE,
    project_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    primary_customer_id BIGINT UNSIGNED NOT NULL,
    sales_rep_id BIGINT UNSIGNED NOT NULL,
    broker_id BIGINT UNSIGNED NULL,
    booking_date DATE NOT NULL,
    base_unit_price DECIMAL(16, 2) NOT NULL,
    floor_facing_premium DECIMAL(16, 2) DEFAULT 0.00,
    parking_price DECIMAL(16, 2) DEFAULT 0.00,
    utility_charges DECIMAL(16, 2) DEFAULT 0.00,
    discount_amount DECIMAL(16, 2) DEFAULT 0.00,
    discount_approval_status ENUM('NOT_REQUESTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') DEFAULT 'NOT_REQUESTED',
    discount_approved_by_user_id BIGINT UNSIGNED NULL,
    final_contract_value DECIMAL(16, 2) NOT NULL, -- Final agreed deed value
    earnest_money_received DECIMAL(16, 2) NOT NULL,
    down_payment_total DECIMAL(16, 2) NOT NULL,
    status ENUM('PROVISIONAL_BOOKED', 'CONFIRMED_AGREEMENT_SIGNED', 'REGISTRATION_DONE', 'CANCELLED', 'TRANSFERRED') DEFAULT 'PROVISIONAL_BOOKED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES inv_units(id) ON DELETE RESTRICT,
    FOREIGN KEY (primary_customer_id) REFERENCES crm_customers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. MULTI-LEVEL DISCOUNT APPROVAL MATRIX:
The service strictly enforces authorization thresholds before a sales rep can apply discounts to the base price:
- **Discount $\le 1.0\%$**: Auto-approved by General Sales Manager.
- **$1.0\% < \text{Discount} \le 3.0\%$**: Requires Director (Marketing/Sales) Approval.
- **$\text{Discount} > 3.0\%$**: Requires Managing Director (MD) Biometric 1-Tap Mobile Approval.

---

### 3. BILINGUAL DEED OF AGREEMENT ENGINE (WEASYPRINT / JINJA2):
The service renders official bilingual contracts matching the statutory format required in Bangladesh Sub-Registry offices:
- Clauses for: Handover date, structural defect liability (12 months), utility connection terms, delay compensation (৳৫/- per sq ft monthly), and customer default forfeiture (10% deduction of total contract price).
- Compiles into PDF with digital timestamp and barcode.
```
