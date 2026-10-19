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

    print("Creating table: acc_cwip_allocations...")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS `acc_cwip_allocations` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `allocation_ref` VARCHAR(64) NOT NULL UNIQUE,
        `allocation_date` DATE NOT NULL,
        `allocation_method` VARCHAR(64) NOT NULL DEFAULT 'DIRECT',
        `cost_category` VARCHAR(64) NOT NULL DEFAULT 'DIRECT_MATERIAL',
        `source_module` VARCHAR(64) NOT NULL DEFAULT 'INVENTORY_MATERIAL_ISSUE',
        `source_transaction_ref` VARCHAR(64) NULL,
        `original_cost_center_id` BIGINT NULL,
        `original_project_id` BIGINT NULL,
        `original_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `target_project_id` BIGINT NOT NULL,
        `target_tower_id` BIGINT NULL,
        `work_package_id` BIGINT NULL,
        `work_package_name` VARCHAR(191) NOT NULL,
        `boq_item_id` BIGINT NULL,
        `boq_item_ref` VARCHAR(128) NULL,
        `allocated_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `allocation_basis_description` TEXT NOT NULL,
        `basis_metric_value` DECIMAL(12, 2) NULL,
        `basis_metric_unit` VARCHAR(32) NULL,
        `cwip_account_id` BIGINT NOT NULL,
        `credit_account_id` BIGINT NOT NULL,
        `gl_voucher_id` BIGINT NULL,
        `is_transferred_to_cogs` TINYINT(1) NOT NULL DEFAULT 0,
        `cogs_transfer_voucher_id` BIGINT NULL,
        `status` VARCHAR(32) NOT NULL DEFAULT 'ALLOCATED',
        `created_by_user_id` BIGINT NULL,
        `notes` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cwip_target_prj (`target_project_id`),
        INDEX idx_cwip_target_tower (`target_tower_id`),
        INDEX idx_cwip_category (`cost_category`),
        INDEX idx_cwip_method (`allocation_method`),
        INDEX idx_cwip_date (`allocation_date`),
        INDEX idx_cwip_status (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    print("Creating table: acc_cwip_material_issues...")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS `acc_cwip_material_issues` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `issue_ref` VARCHAR(64) NOT NULL UNIQUE,
        `issue_date` DATE NOT NULL,
        `project_id` BIGINT NOT NULL,
        `project_name` VARCHAR(191) NULL,
        `tower_id` BIGINT NULL,
        `tower_name` VARCHAR(128) NULL,
        `work_package` VARCHAR(191) NOT NULL,
        `material_code` VARCHAR(64) NOT NULL,
        `material_name` VARCHAR(191) NOT NULL,
        `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        `unit_of_measure` VARCHAR(32) NOT NULL DEFAULT 'BAG',
        `unit_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        `total_cost` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `inventory_account_id` BIGINT NOT NULL,
        `cwip_account_id` BIGINT NOT NULL,
        `gl_voucher_id` BIGINT NULL,
        `requisition_ref` VARCHAR(64) NULL,
        `issued_by` VARCHAR(128) NULL,
        `received_by` VARCHAR(128) NULL,
        `status` VARCHAR(32) NOT NULL DEFAULT 'ISSUED',
        `notes` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mat_prj (`project_id`),
        INDEX idx_mat_date (`issue_date`),
        INDEX idx_mat_code (`material_code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    print("Creating table: acc_cwip_unit_cogs_transfers...")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS `acc_cwip_unit_cogs_transfers` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `transfer_ref` VARCHAR(64) NOT NULL UNIQUE,
        `transfer_date` DATE NOT NULL,
        `project_id` BIGINT NOT NULL,
        `unit_id` BIGINT NULL,
        `unit_number` VARCHAR(64) NOT NULL,
        `customer_name` VARCHAR(191) NULL,
        `sale_agreement_ref` VARCHAR(64) NULL,
        `unit_floor_area_sft` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        `cwip_cost_per_sft` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        `transferred_cogs_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
        `cwip_account_id` BIGINT NOT NULL,
        `cogs_account_id` BIGINT NOT NULL,
        `gl_voucher_id` BIGINT NULL,
        `accounting_policy_basis` TEXT NOT NULL,
        `approved_by` VARCHAR(128) NULL,
        `notes` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cogs_prj (`project_id`),
        INDEX idx_cogs_unit (`unit_id`),
        INDEX idx_cogs_date (`transfer_date`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    print("Seeding dynamic lookups for Section 12...")
    lookups = [
        ('CWIP_ALLOCATION_METHOD', 'DIRECT', 'Direct Project Allocation', 'সরাসরি প্রজেক্ট বরাদ্দ'),
        ('CWIP_ALLOCATION_METHOD', 'QUANTITY_BASED', 'Quantity-Based Measured Allocation', 'পরিমাপকৃত পরিমাণভিত্তিক বরাদ্দ'),
        ('CWIP_ALLOCATION_METHOD', 'AREA_BASED', 'Floor / Saleable Area Ratio Allocation', 'ফ্লোর / বিক্রয়যোগ্য এরিয়া ভিত্তিক বরাদ্দ'),
        ('CWIP_ALLOCATION_METHOD', 'USAGE_BASED', 'Equipment & Resource Log Usage', 'যন্ত্রপাতি ব্যবহার ভিত্তিক বরাদ্দ'),
        ('CWIP_ALLOCATION_METHOD', 'PERCENTAGE', 'Approved Percentage Sharing', 'অনুমোদিত শতকরা হার ভিত্তিক বরাদ্দ'),

        ('CWIP_COST_CATEGORY', 'DIRECT_MATERIAL', 'Direct Construction Materials', 'নির্মাণ কাঁচামাল ব্যয়'),
        ('CWIP_COST_CATEGORY', 'DIRECT_LABOUR', 'Site Labour & Worker Muster', 'সাইট শ্রমিক মজুরি'),
        ('CWIP_COST_CATEGORY', 'CONTRACTOR_CERTIFIED_WORK', 'Subcontractor RA Bill Certified Work', 'কন্ট্রাক্টর বিল প্রত্যয়িত কাজ'),
        ('CWIP_COST_CATEGORY', 'ENGINEERING_CONSULTANCY', 'Architectural, Design & Engineering Fees', 'আর্কিটেকচারাল ও ইঞ্জিনিয়ারিং ফি'),
        ('CWIP_COST_CATEGORY', 'SITE_OVERHEAD', 'Site Office Operations & Utilities', 'সাইট অফিস ও ইউটিলিটি ওভারহেড'),
        ('CWIP_COST_CATEGORY', 'EQUIPMENT_USAGE_DEPRECIATION', 'Crane, Rig & Heavy Equipment Usage', 'ভারী যন্ত্রপাতি ব্যবহার ও অবচয়'),
        ('CWIP_COST_CATEGORY', 'SHARED_PROJECT_COST', 'Common Project Shared Expenses', 'যৌথ প্রজেক্টের আনুপাতিক ব্যয়'),

        ('CWIP_WORK_PACKAGE', 'SUBSTRUCTURE_PILING', 'Substructure, Shore Piling & Earth Excavation', 'পাইলিং ও মাটি খনন প্যাকেজ'),
        ('CWIP_WORK_PACKAGE', 'SUPERSTRUCTURE_RCC', 'Superstructure RCC Casting & Columns', 'সুপারস্ট্রাকচার আরসিসি ঢালাই'),
        ('CWIP_WORK_PACKAGE', 'BRICKWORK_PLASTER', 'Brick Masonry & Internal/External Plaster', 'গাঁথুনি ও প্লাস্টার কাজ'),
        ('CWIP_WORK_PACKAGE', 'PLUMBING_SANITARY', 'Water Supply, Drainage & Sanitary Piping', 'প্লাম্বিং ও স্যানিটারি প্যাকেজ'),
        ('CWIP_WORK_PACKAGE', 'ELECTRICAL_MEP', 'Electrical Conduiting, Cables & Substation', 'বৈদ্যুতিক ও সাবস্টেশন প্যাকেজ'),
        ('CWIP_WORK_PACKAGE', 'LIFT_FIREFIGHTING', 'Passenger Elevators & Fire Safety System', 'লিফট ও ফায়ার ফাইটিং সিস্টেম'),
        ('CWIP_WORK_PACKAGE', 'FINISHING_TILES', 'Floor Tiles, Marble, Paint & Glass', 'টাইলস, পেইন্ট ও ফিনিশিং কাজ'),
        ('CWIP_WORK_PACKAGE', 'CIVIL_EXTERNAL', 'Boundary Wall, Pavement & Landscaping', 'সীমানা প্রাচীর ও ল্যান্ডস্কেপিং')
    ]

    for cat_code, item_code, name_en, name_bn in lookups:
        cur.execute("SELECT id FROM sys_lookup_categories WHERE category_code = %s", (cat_code,))
        row = cur.fetchone()
        if not row:
            cur.execute("""
                INSERT INTO sys_lookup_categories (category_code, category_name, is_system_locked, is_active)
                VALUES (%s, %s, 1, 1)
            """, (cat_code, cat_code.replace('_', ' ').title()))
            cur.execute("SELECT id FROM sys_lookup_categories WHERE category_code = %s", (cat_code,))
            row = cur.fetchone()
        cat_id = row[0]

        cur.execute("SELECT id FROM sys_lookup_items WHERE category_id = %s AND item_code = %s", (cat_id, item_code))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, is_active, sort_order)
                VALUES (%s, %s, %s, %s, 1, 10)
            """, (cat_id, item_code, name_en, name_bn))

    print("Section 12 DB Migration completed successfully!")
    conn.close()

if __name__ == "__main__":
    run_migration()
