import sys
import os
import logging
import pymysql
from urllib.parse import urlparse

# Add parent directory to path to allow importing app.core.config
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mysql_partition_dba")

def get_db_connection_params():
    """
    Parses SQLAlchemy async MySQL connection string into PyMySQL connection parameters.
    """
    # e.g. mysql+aiomysql://erp_user:erp_secure_password@localhost:3306/ERPRealEstate
    db_url = settings.DATABASE_URL
    if "+aiomysql" in db_url:
        db_url = db_url.replace("+aiomysql", "")
    if "+pymysql" in db_url:
        db_url = db_url.replace("+pymysql", "")
        
    parsed = urlparse(db_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 3306,
        "user": parsed.username or "erp_user",
        "password": parsed.password or "erp_secure_password",
        "database": parsed.path.lstrip("/") or "ERPRealEstate",
        "charset": "utf8mb4",
        "autocommit": True
    }

def is_table_partitioned(cursor, db_name: str, table_name: str) -> bool:
    """
    Checks if a table is already partitioned in MySQL/MariaDB.
    """
    query = """
        SELECT COUNT(1) 
        FROM INFORMATION_SCHEMA.PARTITIONS 
        WHERE TABLE_SCHEMA = %s 
          AND TABLE_NAME = %s 
          AND PARTITION_NAME IS NOT NULL
    """
    cursor.execute(query, (db_name, table_name))
    count = cursor.fetchone()[0]
    return count > 0

def get_table_row_count(cursor, table_name: str) -> int:
    try:
        cursor.execute(f"SELECT COUNT(1) FROM `{table_name}`")
        return cursor.fetchone()[0]
    except Exception:
        return 0

def drop_foreign_keys_on_table(cursor, db_name: str, table_name: str):
    """
    MySQL 8.0 does not support foreign keys on partitioned tables.
    Finds and drops any existing foreign key constraints on the table while retaining indexes.
    """
    fk_query = """
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME = %s
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    """
    cursor.execute(fk_query, (db_name, table_name))
    fks = [row[0] for row in cursor.fetchall()]
    for fk in fks:
        logger.info(f"  Dropping blocking Foreign Key '{fk}' on '{table_name}'...")
        cursor.execute(f"ALTER TABLE `{table_name}` DROP FOREIGN KEY `{fk}`")
    if fks:
        logger.info(f"  Dropped {len(fks)} Foreign Key constraints on '{table_name}'.")

def index_exists(cursor, db_name: str, table_name: str, index_name: str) -> bool:
    query = """
        SELECT COUNT(1)
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME = %s
          AND INDEX_NAME = %s
    """
    cursor.execute(query, (db_name, table_name, index_name))
    return cursor.fetchone()[0] > 0

def column_exists(cursor, db_name: str, table_name: str, column_name: str) -> bool:
    query = """
        SELECT COUNT(1)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME = %s
          AND COLUMN_NAME = %s
    """
    cursor.execute(query, (db_name, table_name, column_name))
    return cursor.fetchone()[0] > 0

def partition_journal_entries(cursor, db_name: str):
    """
    Applies MySQL RANGE (YEAR(voucher_date)) partitioning to acc_journal_entries.
    """
    table_name = "acc_journal_entries"
    logger.info(f"=================================================================")
    logger.info(f"1. Migrating Table: `{table_name}` for 1-Crore (10M+) Transactions")
    logger.info(f"=================================================================")

    cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
    exists = cursor.fetchone()

    if not exists:
        logger.info(f"  Table `{table_name}` does not exist yet. Creating pre-partitioned table directly...")
        create_sql = f"""
        CREATE TABLE `{table_name}` (
          `id` BIGINT NOT NULL AUTO_INCREMENT,
          `voucher_date` DATE NOT NULL,
          `voucher_id` BIGINT NOT NULL,
          `company_id` BIGINT NULL DEFAULT 1,
          `project_id` BIGINT NULL,
          `account_id` BIGINT NOT NULL,
          `debit_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
          `credit_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
          `narration` VARCHAR(255) NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`, `voucher_date`),
          KEY `idx_je_proj_acct_date` (`project_id`, `account_id`, `voucher_date`),
          KEY `idx_je_voucher_id` (`voucher_id`),
          KEY `idx_je_company_voucher_date` (`company_id`, `voucher_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        PARTITION BY RANGE (YEAR(voucher_date)) (
          PARTITION p2023 VALUES LESS THAN (2024),
          PARTITION p2024 VALUES LESS THAN (2025),
          PARTITION p2025 VALUES LESS THAN (2026),
          PARTITION p2026 VALUES LESS THAN (2027),
          PARTITION p2027 VALUES LESS THAN (2028),
          PARTITION p_max VALUES LESS THAN MAXVALUE
        );
        """
        cursor.execute(create_sql)
        logger.info(f"  Successfully created `{table_name}` with RANGE (YEAR(voucher_date)) partitioning!")
        return

    # Table exists - safely partition without losing existing rows
    initial_rows = get_table_row_count(cursor, table_name)
    logger.info(f"  Existing `{table_name}` detected with {initial_rows:,} records.")

    # 1. Ensure company_id exists
    if not column_exists(cursor, db_name, table_name, "company_id"):
        logger.info(f"  Adding `company_id` column to `{table_name}`...")
        cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `company_id` BIGINT NULL DEFAULT 1 AFTER `voucher_id`")

    # 2. Drop any foreign keys blocking partitioning
    drop_foreign_keys_on_table(cursor, db_name, table_name)

    # 3. Check if already partitioned
    if is_table_partitioned(cursor, db_name, table_name):
        logger.info(f"  `{table_name}` is ALREADY partitioned. Verifying covering indexes...")
    else:
        # 4. Ensure composite primary key includes voucher_date
        logger.info(f"  Updating Primary Key to composite (`id`, `voucher_date`)...")
        cursor.execute(f"ALTER TABLE `{table_name}` MODIFY `id` BIGINT NOT NULL")
        cursor.execute(f"ALTER TABLE `{table_name}` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `voucher_date`)")
        cursor.execute(f"ALTER TABLE `{table_name}` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT")

        # 5. Apply Partitioning
        logger.info(f"  Applying MySQL RANGE (YEAR(voucher_date)) partitioning on `{table_name}`...")
        partition_sql = f"""
        ALTER TABLE `{table_name}`
        PARTITION BY RANGE (YEAR(voucher_date)) (
          PARTITION p2023 VALUES LESS THAN (2024),
          PARTITION p2024 VALUES LESS THAN (2025),
          PARTITION p2025 VALUES LESS THAN (2026),
          PARTITION p2026 VALUES LESS THAN (2027),
          PARTITION p2027 VALUES LESS THAN (2028),
          PARTITION p_max VALUES LESS THAN MAXVALUE
        )
        """
        cursor.execute(partition_sql)
        logger.info(f"  Partitioning applied successfully!")

    # 6. Apply composite covering indexes
    indexes = [
        ("idx_je_proj_acct_date", "(`project_id`, `account_id`, `voucher_date`)"),
        ("idx_je_voucher_id", "(`voucher_id`)"),
        ("idx_je_company_voucher_date", "(`company_id`, `voucher_date`)")
    ]
    for idx_name, idx_cols in indexes:
        if not index_exists(cursor, db_name, table_name, idx_name):
            logger.info(f"  Creating index `{idx_name}` on {idx_cols}...")
            cursor.execute(f"CREATE INDEX `{idx_name}` ON `{table_name}` {idx_cols}")
        else:
            logger.info(f"  Index `{idx_name}` already exists.")

    final_rows = get_table_row_count(cursor, table_name)
    assert final_rows == initial_rows, f"Data loss detected! Initial: {initial_rows}, Final: {final_rows}"
    logger.info(f"  Data integrity verified: {final_rows:,} records preserved.")

def partition_audit_trails(cursor, db_name: str):
    """
    Applies MySQL RANGE (YEAR(created_at)) partitioning to sys_audit_trails.
    """
    table_name = "sys_audit_trails"
    logger.info(f"=================================================================")
    logger.info(f"2. Migrating Table: `{table_name}` for 1-Crore (10M+) Audit Logs")
    logger.info(f"=================================================================")

    cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
    exists = cursor.fetchone()

    if not exists:
        logger.info(f"  Table `{table_name}` does not exist yet. Creating pre-partitioned table...")
        create_sql = f"""
        CREATE TABLE `{table_name}` (
          `id` BIGINT NOT NULL AUTO_INCREMENT,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `user_id` BIGINT DEFAULT NULL,
          `ip_address` VARCHAR(45) DEFAULT NULL,
          `microservice_name` VARCHAR(64) NOT NULL,
          `entity_name` VARCHAR(64) NOT NULL,
          `entity_id` VARCHAR(64) DEFAULT NULL,
          `action_type` ENUM('CREATE','UPDATE','DELETE','CUSTOM') NOT NULL,
          `payload_before` LONGTEXT DEFAULT NULL,
          `payload_after` LONGTEXT DEFAULT NULL,
          PRIMARY KEY (`id`, `created_at`),
          KEY `idx_audit_user_created` (`user_id`, `created_at`),
          KEY `idx_audit_entity_name_id` (`entity_name`, `entity_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        PARTITION BY RANGE (YEAR(created_at)) (
          PARTITION p2023 VALUES LESS THAN (2024),
          PARTITION p2024 VALUES LESS THAN (2025),
          PARTITION p2025 VALUES LESS THAN (2026),
          PARTITION p2026 VALUES LESS THAN (2027),
          PARTITION p2027 VALUES LESS THAN (2028),
          PARTITION p_max VALUES LESS THAN MAXVALUE
        );
        """
        cursor.execute(create_sql)
        logger.info(f"  Successfully created `{table_name}` with RANGE (YEAR(created_at)) partitioning!")
        return

    initial_rows = get_table_row_count(cursor, table_name)
    logger.info(f"  Existing `{table_name}` detected with {initial_rows:,} records.")

    drop_foreign_keys_on_table(cursor, db_name, table_name)

    if is_table_partitioned(cursor, db_name, table_name):
        logger.info(f"  `{table_name}` is ALREADY partitioned. Verifying covering indexes...")
    else:
        logger.info(f"  Applying MySQL RANGE (YEAR(created_at)) partitioning on `{table_name}`...")
        partition_sql = f"""
        ALTER TABLE `{table_name}`
        PARTITION BY RANGE (YEAR(created_at)) (
          PARTITION p2023 VALUES LESS THAN (2024),
          PARTITION p2024 VALUES LESS THAN (2025),
          PARTITION p2025 VALUES LESS THAN (2026),
          PARTITION p2026 VALUES LESS THAN (2027),
          PARTITION p2027 VALUES LESS THAN (2028),
          PARTITION p_max VALUES LESS THAN MAXVALUE
        )
        """
        cursor.execute(partition_sql)
        logger.info(f"  Partitioning applied successfully!")

    # Apply composite covering indexes
    indexes = [
        ("idx_audit_user_created", "(`user_id`, `created_at`)"),
        ("idx_audit_entity_name_id", "(`entity_name`, `entity_id`)")
    ]
    for idx_name, idx_cols in indexes:
        if not index_exists(cursor, db_name, table_name, idx_name):
            logger.info(f"  Creating index `{idx_name}` on {idx_cols}...")
            cursor.execute(f"CREATE INDEX `{idx_name}` ON `{table_name}` {idx_cols}")
        else:
            logger.info(f"  Index `{idx_name}` already exists.")

    final_rows = get_table_row_count(cursor, table_name)
    assert final_rows == initial_rows, f"Data loss detected! Initial: {initial_rows}, Final: {final_rows}"
    logger.info(f"  Data integrity verified: {final_rows:,} records preserved.")

def print_partition_report(cursor, db_name: str):
    """
    Generates a DBA Partition Status & Health Report.
    """
    query = """
        SELECT 
            TABLE_NAME, 
            PARTITION_NAME, 
            PARTITION_METHOD, 
            PARTITION_EXPRESSION, 
            PARTITION_DESCRIPTION, 
            TABLE_ROWS, 
            ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
            ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb
        FROM INFORMATION_SCHEMA.PARTITIONS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME IN ('acc_journal_entries', 'sys_audit_trails')
          AND PARTITION_NAME IS NOT NULL
        ORDER BY TABLE_NAME, PARTITION_ORDINAL_POSITION
    """
    cursor.execute(query, (db_name,))
    partitions = cursor.fetchall()

    logger.info("\n" + "=" * 90)
    logger.info("  MYSQL 8.0 1-CRORE PARTITIONING HEALTH & VERIFICATION REPORT")
    logger.info("=" * 90)
    logger.info(f"{'TABLE NAME':<22} | {'PARTITION':<10} | {'METHOD':<10} | {'EXPR':<18} | {'LESS THAN':<10} | {'ROWS':<6} | {'DATA MB':<8}")
    logger.info("-" * 90)
    for p in partitions:
        t_name, p_name, method, expr, desc, rows, d_mb, i_mb = p
        logger.info(f"{t_name:<22} | {p_name:<10} | {method or 'N/A':<10} | {expr or 'N/A':<18} | {desc or 'N/A':<10} | {rows or 0:<6} | {d_mb or 0:<8}")
    logger.info("=" * 90)


def main():
    params = get_db_connection_params()
    logger.info(f"Connecting to MySQL database '{params['database']}' at {params['host']}:{params['port']} as '{params['user']}'...")

    conn = pymysql.connect(**params)
    try:
        with conn.cursor() as cursor:
            # 1. Partition acc_journal_entries
            partition_journal_entries(cursor, params["database"])

            # 2. Partition sys_audit_trails
            partition_audit_trails(cursor, params["database"])

            # 3. Print Report
            print_partition_report(cursor, params["database"])

            logger.info("🎉 ALL 1-CRORE MYSQL TABLE PARTITIONS & COVERING INDEXES COMMITTED SUCCESSFULLY!")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
