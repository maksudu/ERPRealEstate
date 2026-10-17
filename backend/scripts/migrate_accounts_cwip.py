import pymysql

def run_migration_on_db(dbname):
    conn = pymysql.connect(
        host="localhost",
        user="erp_user",
        password="erp_secure_password",
        database=dbname,
        autocommit=True
    )
    cur = conn.cursor()
    print(f"--- Running migration on {dbname} ---")

    # 1. Add missing columns to acc_journal_entries
    columns_to_add_je = [
        ("cost_center_id", "BIGINT NULL"),
        ("cheque_no", "VARCHAR(64) NULL"),
        ("cheque_date", "DATE NULL"),
        ("bill_reference", "VARCHAR(64) NULL"),
    ]
    for col, col_type in columns_to_add_je:
        try:
            cur.execute(f"ALTER TABLE acc_journal_entries ADD COLUMN {col} {col_type}")
            print(f"[OK] Added {col} to acc_journal_entries")
        except Exception as e:
            if "Duplicate column" in str(e) or "1060" in str(e):
                pass
            else:
                print(f"[NOTE] {col}: {e}")

    # 2. Add missing columns to acc_chart_of_accounts
    columns_to_add_coa = [
        ("level", "INT NOT NULL DEFAULT 5"),
        ("is_group", "TINYINT(1) NOT NULL DEFAULT 0"),
        ("currency", "VARCHAR(8) NOT NULL DEFAULT 'BDT'"),
        ("is_reconciliation_account", "TINYINT(1) NOT NULL DEFAULT 0"),
    ]
    for col, col_type in columns_to_add_coa:
        try:
            cur.execute(f"ALTER TABLE acc_chart_of_accounts ADD COLUMN {col} {col_type}")
            print(f"[OK] Added {col} to acc_chart_of_accounts")
        except Exception as e:
            if "Duplicate column" in str(e) or "1060" in str(e):
                pass
            else:
                print(f"[NOTE] {col}: {e}")

    # 3. Create acc_cost_centers
    cur.execute("""
    CREATE TABLE IF NOT EXISTS acc_cost_centers (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        project_id BIGINT NOT NULL,
        tower_id BIGINT NULL,
        cost_center_code VARCHAR(32) NOT NULL UNIQUE,
        name VARCHAR(128) NOT NULL,
        wbs_stage VARCHAR(32) NOT NULL DEFAULT 'SUPERSTRUCTURE',
        budget_allocated DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        actual_spent DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cc_proj (project_id),
        INDEX idx_cc_wbs (wbs_stage)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    print("[OK] acc_cost_centers table verified.")

    # 4. Create acc_fiscal_years
    cur.execute("""
    CREATE TABLE IF NOT EXISTS acc_fiscal_years (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        year_name VARCHAR(32) NOT NULL UNIQUE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_closed TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    print("[OK] acc_fiscal_years table verified.")

    # 5. Create acc_pdc_vault
    cur.execute("""
    CREATE TABLE IF NOT EXISTS acc_pdc_vault (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        project_id BIGINT NOT NULL,
        booking_id BIGINT NULL,
        cheque_no VARCHAR(64) NOT NULL,
        bank_name VARCHAR(128) NOT NULL,
        branch_name VARCHAR(128) NULL,
        drawer_name VARCHAR(128) NOT NULL,
        cheque_date DATE NOT NULL,
        amount DECIMAL(14, 2) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'IN_VAULT',
        deposit_date DATE NULL,
        clearance_date DATE NULL,
        bounce_date DATE NULL,
        bounce_reason VARCHAR(255) NULL,
        legal_notice_sent TINYINT(1) NOT NULL DEFAULT 0,
        voucher_id BIGINT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pdc_status (status),
        INDEX idx_pdc_chq (cheque_no),
        INDEX idx_pdc_date (cheque_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    print("[OK] acc_pdc_vault table verified.")

    # 6. Create acc_cwip_capitalizations
    cur.execute("""
    CREATE TABLE IF NOT EXISTS acc_cwip_capitalizations (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        project_id BIGINT NOT NULL,
        cost_center_id BIGINT NULL,
        capitalization_date DATE NOT NULL,
        cwip_account_id BIGINT NOT NULL,
        cogs_account_id BIGINT NOT NULL,
        capitalized_amount DECIMAL(16, 2) NOT NULL,
        completion_percentage DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
        voucher_id BIGINT NULL,
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cwip_proj (project_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    print("[OK] acc_cwip_capitalizations table verified.")

    # 7. Create acc_revenue_recognitions
    cur.execute("""
    CREATE TABLE IF NOT EXISTS acc_revenue_recognitions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        project_id BIGINT NOT NULL,
        booking_id BIGINT NOT NULL,
        recognition_date DATE NOT NULL,
        advance_liability_account_id BIGINT NOT NULL,
        revenue_account_id BIGINT NOT NULL,
        recognized_amount DECIMAL(14, 2) NOT NULL,
        recognition_method VARCHAR(32) NOT NULL DEFAULT 'POINT_IN_TIME_HANDOVER',
        voucher_id BIGINT NULL,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rev_proj (project_id),
        INDEX idx_rev_book (booking_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    print("[OK] acc_revenue_recognitions table verified.")

    # 8. Create acc_bank_statement_items
    cur.execute("""
    CREATE TABLE IF NOT EXISTS acc_bank_statement_items (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        reconciliation_id BIGINT NOT NULL,
        transaction_date DATE NOT NULL,
        reference_no VARCHAR(64) NULL,
        description VARCHAR(255) NOT NULL,
        debit_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        credit_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        is_matched TINYINT(1) NOT NULL DEFAULT 0,
        matched_voucher_number VARCHAR(64) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_recon_id (reconciliation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    print("[OK] acc_bank_statement_items table verified.")

    print("[SUCCESS] All CFO-grade Accounts schema tables & columns synced!")
    conn.close()

if __name__ == "__main__":
    for db in ["ERPRealEstate", "erp_realestate_db"]:
        try:
            run_migration_on_db(db)
        except Exception as e:
            print(f"Error on {db}: {e}")
