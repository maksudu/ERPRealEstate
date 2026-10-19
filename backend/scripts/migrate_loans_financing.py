import pymysql

def run_migration():
    conn = pymysql.connect(
        host='127.0.0.1',
        port=3308,
        user='root',
        password='Sohel@1234',
        database='ERPRealEstate',
        autocommit=True
    )
    cur = conn.cursor()

    print("Creating table: acc_loans...")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS `acc_loans` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `loan_reference_no` VARCHAR(64) NOT NULL UNIQUE,
        `facility_type` VARCHAR(64) NOT NULL DEFAULT 'PROJECT_TERM_LOAN',
        `lender_name` VARCHAR(191) NOT NULL,
        `lender_branch` VARCHAR(191) NULL,
        `lender_account_no` VARCHAR(64) NULL,
        `sanction_letter_ref` VARCHAR(128) NULL,
        `sanction_date` DATE NOT NULL,
        `project_id` BIGINT NULL,
        `project_name` VARCHAR(191) NULL,
        `approved_facility_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `total_disbursed_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `total_principal_repaid` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `principal_outstanding` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `current_portion_outstanding` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `non_current_portion` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `tenure_months` INT NOT NULL DEFAULT 36,
        `start_date` DATE NOT NULL,
        `maturity_date` DATE NOT NULL,
        `repayment_frequency` VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
        `interest_rate_type` VARCHAR(32) NOT NULL DEFAULT 'FLOATING_SMART_SPREAD',
        `interest_rate_pct` DECIMAL(6, 2) NOT NULL DEFAULT 11.50,
        `smart_spread_pct` DECIMAL(6, 2) NOT NULL DEFAULT 3.50,
        `calculation_method` VARCHAR(32) NOT NULL DEFAULT 'REDUCING_BALANCE',
        `total_interest_accrued` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `total_interest_paid` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `total_interest_capitalized_cwip` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `processing_fees_paid` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `security_collateral_description` TEXT NULL,
        `mortgage_deed_no` VARCHAR(128) NULL,
        `covenants_conditions` TEXT NULL,
        `next_repayment_date` DATE NULL,
        `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        `is_eligible_for_ias23` TINYINT(1) NOT NULL DEFAULT 1,
        `notes` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_loan_project (`project_id`),
        INDEX idx_loan_status (`status`),
        INDEX idx_loan_facility (`facility_type`),
        INDEX idx_loan_lender (`lender_name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    print("Creating table: acc_loan_disbursements...")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS `acc_loan_disbursements` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `disbursement_ref` VARCHAR(64) NOT NULL UNIQUE,
        `loan_id` BIGINT NOT NULL,
        `disbursement_date` DATE NOT NULL,
        `gross_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `processing_fee_deducted` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `net_received_in_bank` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `company_bank_account_id` BIGINT NULL,
        `company_bank_name` VARCHAR(128) NULL,
        `gl_voucher_id` BIGINT NULL,
        `notes` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ldsb_loan FOREIGN KEY (`loan_id`) 
            REFERENCES `acc_loans` (`id`) ON DELETE CASCADE,
        INDEX idx_ldsb_loan (`loan_id`),
        INDEX idx_ldsb_date (`disbursement_date`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    print("Creating table: acc_loan_repayments...")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS `acc_loan_repayments` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `payment_ref` VARCHAR(64) NOT NULL UNIQUE,
        `loan_id` BIGINT NOT NULL,
        `payment_date` DATE NOT NULL,
        `total_amount_paid` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `principal_component` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `interest_component` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `fee_or_penalty_component` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `bank_account_id` BIGINT NULL,
        `gl_voucher_id` BIGINT NULL,
        `lender_statement_ref` VARCHAR(128) NULL,
        `notes` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_lrp_loan FOREIGN KEY (`loan_id`) 
            REFERENCES `acc_loans` (`id`) ON DELETE CASCADE,
        INDEX idx_lrp_loan (`loan_id`),
        INDEX idx_lrp_date (`payment_date`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    print("Creating table: acc_loan_interest_accruals...")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS `acc_loan_interest_accruals` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `accrual_ref` VARCHAR(64) NOT NULL UNIQUE,
        `loan_id` BIGINT NOT NULL,
        `period_start` DATE NOT NULL,
        `period_end` DATE NOT NULL,
        `calculation_basis_balance` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `applied_rate_pct` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
        `interest_accrued_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `is_capitalized_to_cwip` TINYINT(1) NOT NULL DEFAULT 0,
        `cwip_capitalization_voucher_id` BIGINT NULL,
        `gl_accrual_voucher_id` BIGINT NULL,
        `supporting_lender_statement` VARCHAR(191) NULL,
        `status` VARCHAR(32) NOT NULL DEFAULT 'ACCRUED',
        `notes` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_lia_loan FOREIGN KEY (`loan_id`) 
            REFERENCES `acc_loans` (`id`) ON DELETE CASCADE,
        INDEX idx_lia_loan (`loan_id`),
        INDEX idx_lia_status (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    print("Seeding dynamic lookups for Section 14...")
    lookups = [
        ('LOAN_FACILITY_TYPE', 'PROJECT_TERM_LOAN', 'Project Construction Term Loan', 'প্রজেক্ট টার্ম লোন'),
        ('LOAN_FACILITY_TYPE', 'CONSTRUCTION_SYNDICATION', 'Multi-Bank Syndicated Facility', 'সিন্ডিকেটেড লোন'),
        ('LOAN_FACILITY_TYPE', 'OVERDRAFT_SOD', 'Secured Overdraft (SOD) / CC Facility', 'সিকিউর্ড ওভারড্রাফট (SOD)'),
        ('LOAN_FACILITY_TYPE', 'LEASE_FINANCING', 'Equipment Lease Financing', 'ইকুইপমেন্ট লিজ ফাইন্যান্সিং'),
        ('LOAN_FACILITY_TYPE', 'COMMERCIAL_PAPER_SUKUK', 'Islamic Sukuk / Commercial Paper', 'ইসলামিক সুকুক / বন্ড'),
        ('LOAN_FACILITY_TYPE', 'BRIDGE_FINANCING', 'Bridge Financing / Short-Term Loan', 'ব্রিজ ফাইন্যান্সিং'),

        ('LOAN_REPAYMENT_FREQ', 'MONTHLY', 'Monthly EMI / Installment', 'মাসিক কিস্তি'),
        ('LOAN_REPAYMENT_FREQ', 'QUARTERLY', 'Quarterly Principal & Interest', 'ত্রৈমাসিক কিস্তি'),
        ('LOAN_REPAYMENT_FREQ', 'SEMI_ANNUALLY', 'Semi-Annual Repayment', 'ষান্মাসিক কিস্তি'),
        ('LOAN_REPAYMENT_FREQ', 'BULLET_BALLOON', 'Bullet / Balloon Repayment at Maturity', 'বুলেট / ব্যালুন পেমেন্ট'),

        ('LOAN_INTEREST_CALC', 'REDUCING_BALANCE', 'Monthly Reducing Balance Method', 'ক্রমহ্রাসমান ব্যালেন্স পদ্ধতি'),
        ('LOAN_INTEREST_CALC', 'FLAT_SIMPLE_365', 'Actual/365 Day-Count Convention', 'একচুয়াল/৩৬৫ দিন গণনা'),
        ('LOAN_INTEREST_CALC', 'SIMPLE_360', '30/360 Banking Convention', '৩০/৩৬০ ব্যাংকিং গণনা'),

        ('LOAN_COLLATERAL_TYPE', 'REGISTERED_MORTGAGE', 'First Registered Mortgage on Project Land', 'জমির রেজিস্টার্ড মর্টগেজ'),
        ('LOAN_COLLATERAL_TYPE', 'HYPOTHECATION', 'Hypothecation of Plant, Machinery & Stock', 'যন্ত্রপাতি ও স্টকের হাইপোথিকেশন'),
        ('LOAN_COLLATERAL_TYPE', 'ESCROW_LIEN', 'Lien on Project Revenue Escrow Account', 'প্রজেক্ট এসক্রো একাউন্টে লিয়েন'),
        ('LOAN_COLLATERAL_TYPE', 'PERSONAL_GUARANTEE', 'Personal Guarantee of Board Directors', 'পরিচালকদের ব্যক্তিগত গ্যারান্টি')
    ]

    for cat_code, item_code, name_en, name_bn in lookups:
        cur.execute("SELECT id FROM sys_lookup_categories WHERE category_code = %s", (cat_code,))
        row = cur.fetchone()
        if not row:
            cur.execute("""
                INSERT INTO sys_lookup_categories (category_code, category_name, is_system_locked, is_active)
                VALUES (%s, %s, 1, 1)
            """, (cat_code, cat_code.replace('_', ' ').title()))
            cat_id = cur.lastrowid
        else:
            cat_id = row[0]

        cur.execute("SELECT id FROM sys_lookup_items WHERE category_id = %s AND item_code = %s", (cat_id, item_code))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, is_active, sort_order)
                VALUES (%s, %s, %s, %s, 1, 10)
            """, (cat_id, item_code, name_en, name_bn))

    print("Section 14 Migration completed successfully!")
    conn.close()

if __name__ == '__main__':
    run_migration()
