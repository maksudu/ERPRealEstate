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

    print("1. Checking and updating acc_bank_reconciliation table...")
    cur.execute("DESCRIBE acc_bank_reconciliation;")
    existing_cols = [r[0] for r in cur.fetchall()]

    new_recon_cols = [
        ("recon_reference_no", "VARCHAR(64) NULL"),
        ("period_start_date", "DATE NULL"),
        ("period_end_date", "DATE NULL"),
        ("status", "VARCHAR(32) NOT NULL DEFAULT 'DRAFT'"),
        ("statement_format", "VARCHAR(64) NOT NULL DEFAULT 'EXCEL_STANDARD'"),
        ("mfs_provider", "VARCHAR(64) NULL"),
        ("deposits_in_transit", "DECIMAL(16,2) NOT NULL DEFAULT 0.00"),
        ("outstanding_cheques", "DECIMAL(16,2) NOT NULL DEFAULT 0.00"),
        ("bank_charges_amount", "DECIMAL(16,2) NOT NULL DEFAULT 0.00"),
        ("interest_earned_amount", "DECIMAL(16,2) NOT NULL DEFAULT 0.00"),
        ("direct_credits_amount", "DECIMAL(16,2) NOT NULL DEFAULT 0.00"),
        ("adjusted_bank_balance", "DECIMAL(16,2) NOT NULL DEFAULT 0.00"),
        ("adjusted_book_balance", "DECIMAL(16,2) NOT NULL DEFAULT 0.00"),
        ("approved_by", "VARCHAR(128) NULL"),
        ("locked_at", "DATETIME NULL"),
        ("is_locked", "TINYINT(1) NOT NULL DEFAULT 0")
    ]

    for col_name, col_def in new_recon_cols:
        if col_name not in existing_cols:
            cur.execute(f"ALTER TABLE acc_bank_reconciliation ADD COLUMN `{col_name}` {col_def};")
            print(f"  + Added column acc_bank_reconciliation.{col_name}")

    print("2. Checking and updating acc_bank_statement_items table...")
    cur.execute("DESCRIBE acc_bank_statement_items;")
    existing_item_cols = [r[0] for r in cur.fetchall()]

    new_item_cols = [
        ("item_uid", "VARCHAR(128) NULL"),
        ("exception_type", "VARCHAR(64) NOT NULL DEFAULT 'NONE'"),
        ("split_match_notes", "TEXT NULL"),
        ("adjustment_voucher_id", "BIGINT NULL"),
        ("reconciled_at", "DATETIME NULL"),
        ("is_locked", "TINYINT(1) NOT NULL DEFAULT 0")
    ]

    for col_name, col_def in new_item_cols:
        if col_name not in existing_item_cols:
            cur.execute(f"ALTER TABLE acc_bank_statement_items ADD COLUMN `{col_name}` {col_def};")
            print(f"  + Added column acc_bank_statement_items.{col_name}")

    # Add indexes if not present
    cur.execute("SHOW INDEX FROM acc_bank_reconciliation;")
    recon_indices = [r[2] for r in cur.fetchall()]
    if "idx_acc_br_ref" not in recon_indices:
        try:
            cur.execute("ALTER TABLE acc_bank_reconciliation ADD INDEX idx_acc_br_ref (`recon_reference_no`);")
        except Exception:
            pass
    if "idx_acc_br_status" not in recon_indices:
        try:
            cur.execute("ALTER TABLE acc_bank_reconciliation ADD INDEX idx_acc_br_status (`status`);")
        except Exception:
            pass

    cur.execute("SHOW INDEX FROM acc_bank_statement_items;")
    item_indices = [r[2] for r in cur.fetchall()]
    if "idx_acc_bsi_uid" not in item_indices:
        try:
            cur.execute("ALTER TABLE acc_bank_statement_items ADD INDEX idx_acc_bsi_uid (`item_uid`);")
        except Exception:
            pass
    if "idx_acc_bsi_exception" not in item_indices:
        try:
            cur.execute("ALTER TABLE acc_bank_statement_items ADD INDEX idx_acc_bsi_exception (`exception_type`);")
        except Exception:
            pass

    print("3. Seeding dynamic lookup categories and items...")
    lookups = [
        # BANK_STATEMENT_FORMAT
        ('BANK_STATEMENT_FORMAT', 'EXCEL_STANDARD', 'Excel Standard Spreadsheet (.xlsx)', 'স্ট্যান্ডার্ড এক্সেল স্প্রেডশীট'),
        ('BANK_STATEMENT_FORMAT', 'CSV_GENERIC', 'Generic Bank CSV Export (.csv)', 'জেনেরিক ব্যাংক সিএসভি এক্সপোর্ট'),
        ('BANK_STATEMENT_FORMAT', 'CITY_BANK_PORTAL', 'City Bank CityTouch / Corporate Portal', 'সিটি ব্যাংক সিটিটাচ পোর্টাল'),
        ('BANK_STATEMENT_FORMAT', 'EBL_CONNECT', 'Eastern Bank Limited (EBL Connect)', 'ইস্টার্ন ব্যাংক ইবিএল কানেক্ট'),
        ('BANK_STATEMENT_FORMAT', 'DBBL_NEXUS', 'Dutch-Bangla Bank Corporate Nexus', 'ডাচ-বাংলা ব্যাংক নেক্সাস'),
        ('BANK_STATEMENT_FORMAT', 'SCB_STRAIGHT2BANK', 'Standard Chartered Straight2Bank', 'স্ট্যান্ডার্ড চার্টার্ড ব্যাংক'),
        ('BANK_STATEMENT_FORMAT', 'BRAC_CORP_NET', 'BRAC Bank CorpNet Statement', 'ব্র্যাক ব্যাংক কর্পোরেট নেট'),
        ('BANK_STATEMENT_FORMAT', 'BKASH_MERCHANT_SETTLEMENT', 'bKash Merchant Settlement Batch Report', 'বিকাশ মার্চেন্ট সেটেলমেন্ট ব্যাচ'),
        ('BANK_STATEMENT_FORMAT', 'NAGAD_MERCHANT_BATCH', 'Nagad Merchant Batch Reconciliation CSV', 'নগদ মার্চেন্ট ব্যাচ রিকনসিলিয়েশন'),

        # RECONCILIATION_STATUS
        ('RECONCILIATION_STATUS', 'DRAFT', 'Draft Statement Ingestion', 'খসড়া স্টেটমেন্ট অন্তর্ভুক্তি'),
        ('RECONCILIATION_STATUS', 'AUTO_MATCHED', 'Auto-Matching Completed', 'স্বয়ংক্রিয় ম্যাচিং সম্পন্ন'),
        ('RECONCILIATION_STATUS', 'MANUALLY_REVIEWED', 'Manual Review in Progress', 'ম্যানুয়াল পর্যালোচনাধীন'),
        ('RECONCILIATION_STATUS', 'ADJUSTMENT_PENDING', 'Pending Authorized Adjustment Vouchers', 'সমন্বয় ভাউচার অনুমোদন অপেক্ষমাণ'),
        ('RECONCILIATION_STATUS', 'APPROVED', 'Approved by Finance Controller', 'অর্থ নিয়ন্ত্রক কর্তৃক অনুমোদিত'),
        ('RECONCILIATION_STATUS', 'LOCKED', 'Period Locked (Immutable)', 'পিরিয়ড লকড (অপরিবর্তনযোগ্য)'),

        # RECON_EXCEPTION_TYPE
        ('RECON_EXCEPTION_TYPE', 'NONE', 'Standard Matched Transaction', 'সাধারণ মিলযুক্ত লেনদেন'),
        ('RECON_EXCEPTION_TYPE', 'BANK_CHARGE', 'Bank Charges & Ledger Fees', 'ব্যাংক চার্জ ও লেজার ফি'),
        ('RECON_EXCEPTION_TYPE', 'INTEREST_EARNED', 'Bank Interest / Escrow Profit Earned', 'ব্যাংক সুদ বা লাভ অর্জন'),
        ('RECON_EXCEPTION_TYPE', 'DIRECT_DEPOSIT', 'Direct Customer / Buyer Deposit', 'ক্রেতার সরাসরি ব্যাংক জমা'),
        ('RECON_EXCEPTION_TYPE', 'OUTSTANDING_CHEQUE', 'Outstanding Cheque (Unpresented)', 'বকেয়া চেক (উপস্থাপন বাকি)'),
        ('RECON_EXCEPTION_TYPE', 'DEPOSIT_IN_TRANSIT', 'Deposit in Transit (Uncredited Collection)', 'পথিমধ্যে জমা (জমা বাকি)'),
        ('RECON_EXCEPTION_TYPE', 'UNKNOWN_TRANSACTION', 'Unidentified Statement Credit / Debit', 'অশনাক্তকৃত স্টেটমেন্ট এন্ট্রি'),
        ('RECON_EXCEPTION_TYPE', 'TIMING_DIFFERENCE', 'Clearing House Timing Difference', 'ক্লিয়ারিং হাউজ সময়ের ব্যবধান'),

        # MFS_SETTLEMENT_PROVIDER
        ('MFS_SETTLEMENT_PROVIDER', 'BKASH_MERCHANT', 'bKash Corporate Merchant Gateway', 'বিকাশ কর্পোরেট মার্চেন্ট গেটওয়ে'),
        ('MFS_SETTLEMENT_PROVIDER', 'NAGAD_PAY', 'Nagad Postal Service Digital Wallet', 'নগদ ডিজিটাল ওয়ালেট'),
        ('MFS_SETTLEMENT_PROVIDER', 'ROCKET_DBBL', 'Dutch-Bangla Rocket MFS', 'রকেট মোবাইল ব্যাংকিং'),
        ('MFS_SETTLEMENT_PROVIDER', 'UPAY_UCB', 'Upay (United Commercial Bank)', 'উপায় ডিজিটাল পেমেন্ট'),
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

    print("Section 15 Bank Reconciliation Migration completed successfully!")
    conn.close()

if __name__ == "__main__":
    run_migration()
