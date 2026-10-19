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

    print("Creating table: acc_customer_advance_installments...")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS `acc_customer_advance_installments` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `advance_number` VARCHAR(64) NOT NULL UNIQUE,
        `source_module` VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
        `source_transaction_id` VARCHAR(128) NOT NULL,
        `idempotency_hash` VARCHAR(64) NOT NULL UNIQUE,
        `receipt_date` DATE NOT NULL,
        `transaction_type` VARCHAR(64) NOT NULL DEFAULT 'BOOKING_MONEY',
        `customer_id` BIGINT NOT NULL,
        `customer_name` VARCHAR(191) NOT NULL,
        `booking_id` BIGINT NULL,
        `booking_reference_no` VARCHAR(64) NULL,
        `sale_agreement_no` VARCHAR(64) NULL,
        `project_id` BIGINT NOT NULL,
        `project_name` VARCHAR(191) NOT NULL,
        `tower_id` BIGINT NULL,
        `unit_id` BIGINT NULL,
        `unit_number` VARCHAR(64) NULL,
        `installment_id` BIGINT NULL,
        `installment_title` VARCHAR(191) NULL,
        `payment_mode` VARCHAR(32) NOT NULL DEFAULT 'BANK_TRANSFER',
        `bank_account_id` BIGINT NULL,
        `bank_name` VARCHAR(128) NULL,
        `instrument_no` VARCHAR(64) NULL,
        `instrument_date` DATE NULL,
        `gross_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `allocated_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `unapplied_credit_balance` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `revenue_recognized_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `refunded_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `forfeiture_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `late_charges_assessed` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        `late_charges_waived` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        `accounting_status` VARCHAR(32) NOT NULL DEFAULT 'ADVANCE_RECORDED',
        `revenue_recognition_status` VARCHAR(32) NOT NULL DEFAULT 'UNEARNED_LIABILITY',
        `gl_voucher_id` BIGINT NULL,
        `revenue_transfer_voucher_id` BIGINT NULL,
        `refund_voucher_id` BIGINT NULL,
        `aging_bucket` VARCHAR(32) NOT NULL DEFAULT 'CURRENT',
        `days_outstanding` INT NOT NULL DEFAULT 0,
        `reconciliation_status` VARCHAR(32) NOT NULL DEFAULT 'RECONCILED',
        `notes` TEXT NULL,
        `created_by_user_id` BIGINT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cai_customer (`customer_id`),
        INDEX idx_cai_booking (`booking_id`),
        INDEX idx_cai_project (`project_id`),
        INDEX idx_cai_unit (`unit_id`),
        INDEX idx_cai_status (`accounting_status`),
        INDEX idx_cai_type (`transaction_type`),
        INDEX idx_cai_date (`receipt_date`),
        INDEX idx_cai_source (`source_module`, `source_transaction_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    print("Creating table: acc_customer_advance_allocations...")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS `acc_customer_advance_allocations` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `advance_id` BIGINT NOT NULL,
        `installment_id` BIGINT NULL,
        `unit_id` BIGINT NULL,
        `allocated_amount` DECIMAL(16, 2) NOT NULL,
        `allocation_date` DATE NOT NULL,
        `allocation_type` VARCHAR(32) NOT NULL DEFAULT 'INSTALLMENT_DEMAND',
        `gl_clearing_voucher_id` BIGINT NULL,
        `notes` TEXT NULL,
        `created_by_user_id` BIGINT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_caa_advance FOREIGN KEY (`advance_id`) 
            REFERENCES `acc_customer_advance_installments` (`id`) ON DELETE CASCADE,
        INDEX idx_caa_advance (`advance_id`),
        INDEX idx_caa_installment (`installment_id`),
        INDEX idx_caa_unit (`unit_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    print("Checking and seeding dynamic lookups for Customer Advances...")
    lookups = [
        ('ADVANCE_TRANSACTION_TYPE', 'BOOKING_MONEY', 'Booking Money Receipt', 'বুকিং মানি জমা'),
        ('ADVANCE_TRANSACTION_TYPE', 'DOWN_PAYMENT', 'Down Payment Accounting', 'ডাউন পেমেন্ট গ্রহণ'),
        ('ADVANCE_TRANSACTION_TYPE', 'INSTALLMENT_ADVANCE', 'Installment Demand Advance', 'কিস্তির বিপরীতে অগ্রিম'),
        ('ADVANCE_TRANSACTION_TYPE', 'INTERIM_COLLECTION', 'Interim Milestone Collection', 'অন্তর্বর্তীকালীন কিস্তি সংগ্রহ'),
        ('ADVANCE_TRANSACTION_TYPE', 'LATE_CHARGE_ASSESSMENT', 'Late Surcharge Assessment', 'বিলম্বিত সারচার্জ ধার্য'),
        ('ADVANCE_TRANSACTION_TYPE', 'LATE_CHARGE_WAIVER', 'Approved Late Fee Waiver/Adjustment', 'অনুমোদিত বিলম্ব ফি মওকুফ'),
        ('ADVANCE_TRANSACTION_TYPE', 'CANCELLATION_REFUND', 'Booking Cancellation & Refund', 'বুকিং বাতিল ও অর্থ ফেরত'),
        ('ADVANCE_TRANSACTION_TYPE', 'REVENUE_RECOGNITION_TRANSFER', 'Revenue Recognition Transfer (IFRS 15)', 'রাজস্ব স্বীকৃতি স্থানান্তর'),
        
        ('ADVANCE_PAYMENT_MODE', 'BANK_TRANSFER', 'Electronic Bank Transfer (EFT / RTGS)', 'ব্যাংক ট্রান্সফার'),
        ('ADVANCE_PAYMENT_MODE', 'CHEQUE', 'Cheque / Pay Order Deposit', 'চেক / পে-অর্ডার'),
        ('ADVANCE_PAYMENT_MODE', 'CASH', 'Cash Counter Collection', 'ক্যাশ জমা'),
        ('ADVANCE_PAYMENT_MODE', 'MFS_BKASH', 'bKash Merchant Gateway', 'বিকাশ মার্চেন্ট'),
        ('ADVANCE_PAYMENT_MODE', 'MFS_NAGAD', 'Nagad Business Gateway', 'নগদ বিজনেস'),

        ('ADVANCE_ALLOCATION_TYPE', 'INSTALLMENT_DEMAND', 'Installment Principal Demand', 'কিস্তির মূল ডিমান্ড'),
        ('ADVANCE_ALLOCATION_TYPE', 'LATE_FEE', 'Late Fee Settlement', 'বিলম্ব ফি নিষ্পত্তি'),
        ('ADVANCE_ALLOCATION_TYPE', 'REVENUE_RECOGNITION', 'IFRS 15 Revenue Recognition', 'আইএফআরএস ১৫ রাজস্ব স্বীকৃতি'),
        ('ADVANCE_ALLOCATION_TYPE', 'ADJUSTMENT', 'Contractual Credit Note / Adjustment', 'চুক্তিভিত্তিক ক্রেডিট সমন্বয়')
    ]

    for cat_code, item_code, name_en, name_bn in lookups:
        # Check category
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

        # Check item
        cur.execute("SELECT id FROM sys_lookup_items WHERE category_id = %s AND item_code = %s", (cat_id, item_code))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, is_active, sort_order)
                VALUES (%s, %s, %s, %s, 1, 10)
            """, (cat_id, item_code, name_en, name_bn))

    print("Migration completed successfully!")
    conn.close()

if __name__ == '__main__':
    run_migration()
