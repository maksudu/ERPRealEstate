"""
Migration and Seeding script for Chart of Accounts (COA) & General Ledger (GL).
Implements:
1. Column extensions for acc_chart_of_accounts: normal_balance, is_control_account,
   requires_project, requires_cost_center, statement_mapping, opening_balance, migration_reference.
2. Dynamic Lookups in sys_lookup_categories and sys_lookup_items:
   - COA_ACCOUNT_GROUP (Assets, Liabilities, Equity, Revenue, Cost of sales, Project expenses, Operating expenses, Finance costs, Other income/expenses)
   - COA_NORMAL_BALANCE (Debit, Credit)
   - COA_STATEMENT_MAPPING (Balance Sheet, Income Statement, Cash Flow)
   - ACC_VOUCHER_TYPE (Journal, Cash_Payment, Cash_Receipt, Bank_Payment, Bank_Receipt, Contra)
   - ACC_VOUCHER_STATUS (Draft, Posted, Reversed)
3. Full standard Real Estate Chart of Accounts hierarchy matching the prompt specification:
   - 1000 ASSETS (1100 Current Assets, 1200 Non-Current Assets...)
   - 2000 LIABILITIES (2100 Current Liabilities, 2200 Non-Current Liabilities...)
   - 3000 EQUITY (3100 Share Capital, 3200 Retained Earnings...)
   - 4000 REVENUE (4100 Property Sales Revenue, 4200 Rental Income...)
   - 5000 COST OF SALES (5100 Cost of Property Sold...)
   - 6000 EXPENSES (6100 Project Expenses, 6200 Admin Expenses, 6300 Selling & Marketing, 6400 Finance Costs, 6500 Depreciation...)
"""
import sys
import os
import asyncio
import logging
from sqlalchemy import text, select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LOOKUP_SEEDS = [
    {
        "category_code": "COA_ACCOUNT_GROUP",
        "category_name": "Chart of Accounts Groups",
        "description": "Standard real estate accounting groups and classifications",
        "items": [
            ("Asset", "Assets", "সম্পদ", "#3B82F6", 1, True),
            ("Liability", "Liabilities", "দায়", "#EF4444", 2, False),
            ("Equity", "Equity", "মালিকানাস্বত্ব", "#8B5CF6", 3, False),
            ("Revenue", "Revenue", "রাজস্ব / আয়", "#10B981", 4, False),
            ("Cost_of_Sales", "Cost of Sales", "বিক্রয়মূল্য / কস্ট অব সেলস", "#F59E0B", 5, False),
            ("Project_Expense", "Project Expenses", "প্রকল্প ও নির্মাণ ব্যয়", "#06B6D4", 6, False),
            ("Operating_Expense", "Operating Expenses", "পরিচালন ব্যয়", "#EC4899", 7, False),
            ("Finance_Cost", "Finance Costs", "অর্থায়ন ও ব্যাংক ব্যয়", "#F97316", 8, False),
            ("Other_Income_Expense", "Other Income/Expenses", "অন্যান্য আয় ও ব্যয়", "#64748B", 9, False)
        ]
    },
    {
        "category_code": "COA_NORMAL_BALANCE",
        "category_name": "Normal Balance Type",
        "description": "Debit or Credit normal account balance designation",
        "items": [
            ("Debit", "Debit (Dr.)", "ডেবিট", "#3B82F6", 1, True),
            ("Credit", "Credit (Cr.)", "ক্রেডিট", "#10B981", 2, False)
        ]
    },
    {
        "category_code": "COA_STATEMENT_MAPPING",
        "category_name": "Financial Statement Mapping",
        "description": "Classification mapping to published financial statements",
        "items": [
            ("Balance Sheet", "Balance Sheet (Statement of Financial Position)", "ব্যালেন্স শিট", "#3B82F6", 1, True),
            ("Income Statement", "Income Statement (Profit & Loss / Comprehensive Income)", "আয় বিবরণী", "#10B981", 2, False),
            ("Cash Flow", "Statement of Cash Flows", "নগদ প্রবাহ বিবরণী", "#F59E0B", 3, False),
            ("Notes to Accounts", "Disclosures & Notes to Accounts", "টীকা ও সংযোজনী", "#64748B", 4, False)
        ]
    },
    {
        "category_code": "ACC_VOUCHER_TYPE",
        "category_name": "General Ledger Voucher Types",
        "description": "Double-entry transaction voucher classifications",
        "items": [
            ("Journal", "Journal Voucher (JV)", "জার্নাল ভাউচার", "#3B82F6", 1, True),
            ("Cash_Payment", "Cash Payment (CP)", "নগদ প্রদান", "#EF4444", 2, False),
            ("Cash_Receipt", "Cash Receipt (CR)", "নগদ গ্রহণ", "#10B981", 3, False),
            ("Bank_Payment", "Bank Payment (BP)", "ব্যাংক প্রদান", "#DC2626", 4, False),
            ("Bank_Receipt", "Bank Receipt (BR)", "ব্যাংক গ্রহণ", "#059669", 5, False),
            ("Contra", "Contra Voucher (CV)", "কন্ট্রা ভাউচার", "#8B5CF6", 6, False)
        ]
    },
    {
        "category_code": "ACC_VOUCHER_STATUS",
        "category_name": "Voucher Safeguard Lifecycle Status",
        "description": "Lifecycle status for double-entry financial vouchers",
        "items": [
            ("Draft", "Draft (Unposted)", "খসড়া", "#F59E0B", 1, False),
            ("Posted", "Posted (Immutable)", "পোস্টেড", "#10B981", 2, True),
            ("Reversed", "Reversed (Opposing Reversal Linked)", "বাতিলকৃত / রিভার্সড", "#EF4444", 3, False)
        ]
    }
]

STANDARD_COA_HIERARCHY = [
    # 1000 ASSETS
    {"code": "1000", "name": "ASSETS", "name_bn": "সম্পদ", "type": "Asset", "level": 1, "parent": None, "is_leaf": False, "norm": "Debit", "stmt": "Balance Sheet"},
    {"code": "1100", "name": "Current Assets", "name_bn": "চলতি সম্পদ", "type": "Asset", "level": 2, "parent": "1000", "is_leaf": False, "norm": "Debit", "stmt": "Balance Sheet"},
    {"code": "1110", "name": "Cash in Hand", "name_bn": "হাতে নগদ", "type": "Asset", "level": 3, "parent": "1100", "is_leaf": True, "norm": "Debit", "stmt": "Balance Sheet"},
    {"code": "1120", "name": "Bank Accounts", "name_bn": "ব্যাংক হিসাব", "type": "Asset", "level": 3, "parent": "1100", "is_leaf": True, "norm": "Debit", "stmt": "Balance Sheet"},
    {"code": "1130", "name": "MFS Accounts (bKash/Nagad)", "name_bn": "এমএফএস হিসাব (বিকাশ/নগদ)", "type": "Asset", "level": 3, "parent": "1100", "is_leaf": True, "norm": "Debit", "stmt": "Balance Sheet"},
    {"code": "1140", "name": "Customer Receivables", "name_bn": "গ্রাহকের নিকট প্রাপ্য", "type": "Asset", "level": 3, "parent": "1100", "is_leaf": True, "norm": "Debit", "stmt": "Balance Sheet"},
    {"code": "1150", "name": "Inventory (Raw Materials & Spares)", "name_bn": "মালামাল মজুদ", "type": "Asset", "level": 3, "parent": "1100", "is_leaf": True, "norm": "Debit", "stmt": "Balance Sheet"},
    {"code": "1160", "name": "Advances to Suppliers & Contractors", "name_bn": "সরবরাহকারী ও ঠিকাদারকে অগ্রিম", "type": "Asset", "level": 3, "parent": "1100", "is_leaf": True, "norm": "Debit", "stmt": "Balance Sheet"},
    
    {"code": "1200", "name": "Non-Current Assets", "name_bn": "দীর্ঘমেয়াদী সম্পদ", "type": "Asset", "level": 2, "parent": "1000", "is_leaf": False, "norm": "Debit", "stmt": "Balance Sheet"},
    {"code": "1210", "name": "Land Held for Development", "name_bn": "উন্নয়নের জন্য জমি", "type": "Asset", "level": 3, "parent": "1200", "is_leaf": True, "norm": "Debit", "stmt": "Balance Sheet"},
    {"code": "1220", "name": "Construction Work in Progress (CWIP)", "name_bn": "নির্মাণাধীন কাজ (সিডব্লিউআইপি)", "type": "Asset", "level": 3, "parent": "1200", "is_leaf": True, "norm": "Debit", "stmt": "Balance Sheet"},
    {"code": "1230", "name": "Property, Plant & Equipment", "name_bn": "স্থাবর সম্পত্তি ও যন্ত্রপাতি", "type": "Asset", "level": 3, "parent": "1200", "is_leaf": True, "norm": "Debit", "stmt": "Balance Sheet"},

    # 2000 LIABILITIES
    {"code": "2000", "name": "LIABILITIES", "name_bn": "দায়", "type": "Liability", "level": 1, "parent": None, "is_leaf": False, "norm": "Credit", "stmt": "Balance Sheet"},
    {"code": "2100", "name": "Current Liabilities", "name_bn": "চলতি দায়", "type": "Liability", "level": 2, "parent": "2000", "is_leaf": False, "norm": "Credit", "stmt": "Balance Sheet"},
    {"code": "2110", "name": "Supplier Payables", "name_bn": "সরবরাহকারীকে প্রদেয়", "type": "Liability", "level": 3, "parent": "2100", "is_leaf": True, "norm": "Credit", "stmt": "Balance Sheet"},
    {"code": "2120", "name": "Customer Advances (Booking Deposits)", "name_bn": "গ্রাহকের অগ্রিম বুকিং জমা", "type": "Liability", "level": 3, "parent": "2100", "is_leaf": True, "norm": "Credit", "stmt": "Balance Sheet"},
    {"code": "2130", "name": "Accrued Expenses & Retention", "name_bn": "বকেয়া খরচ ও রিটেনশন", "type": "Liability", "level": 3, "parent": "2100", "is_leaf": True, "norm": "Credit", "stmt": "Balance Sheet"},
    {"code": "2140", "name": "Current Loan Obligations", "name_bn": "স্বল্পমেয়াদী ঋণ দায়", "type": "Liability", "level": 3, "parent": "2100", "is_leaf": True, "norm": "Credit", "stmt": "Balance Sheet"},
    
    {"code": "2200", "name": "Non-Current Liabilities", "name_bn": "দীর্ঘমেয়াদী দায়", "type": "Liability", "level": 2, "parent": "2000", "is_leaf": False, "norm": "Credit", "stmt": "Balance Sheet"},
    {"code": "2210", "name": "Long-Term Bank Loans", "name_bn": "দীর্ঘমেয়াদী ব্যাংক ঋণ", "type": "Liability", "level": 3, "parent": "2200", "is_leaf": True, "norm": "Credit", "stmt": "Balance Sheet"},

    # 3000 EQUITY
    {"code": "3000", "name": "EQUITY", "name_bn": "মালিকানাস্বত্ব", "type": "Equity", "level": 1, "parent": None, "is_leaf": False, "norm": "Credit", "stmt": "Balance Sheet"},
    {"code": "3100", "name": "Share Capital", "name_bn": "শেয়ার মূলধন", "type": "Equity", "level": 2, "parent": "3000", "is_leaf": True, "norm": "Credit", "stmt": "Balance Sheet"},
    {"code": "3200", "name": "Retained Earnings", "name_bn": "সংরক্ষিত আয়", "type": "Equity", "level": 2, "parent": "3000", "is_leaf": True, "norm": "Credit", "stmt": "Balance Sheet"},

    # 4000 REVENUE
    {"code": "4000", "name": "REVENUE", "name_bn": "রাজস্ব / আয়", "type": "Revenue", "level": 1, "parent": None, "is_leaf": False, "norm": "Credit", "stmt": "Income Statement"},
    {"code": "4100", "name": "Property Sales Revenue", "name_bn": "ফ্ল্যাট / প্লট বিক্রয় আয়", "type": "Revenue", "level": 2, "parent": "4000", "is_leaf": True, "norm": "Credit", "stmt": "Income Statement"},
    {"code": "4200", "name": "Rental Income", "name_bn": "বাণিজ্যিক ভাড়া আয়", "type": "Revenue", "level": 2, "parent": "4000", "is_leaf": True, "norm": "Credit", "stmt": "Income Statement"},
    {"code": "4300", "name": "Service Charge Income", "name_bn": "সার্ভিস চার্জ আয়", "type": "Revenue", "level": 2, "parent": "4000", "is_leaf": True, "norm": "Credit", "stmt": "Income Statement"},
    {"code": "4400", "name": "Other Operating Income", "name_bn": "অন্যান্য পরিচালন আয়", "type": "Revenue", "level": 2, "parent": "4000", "is_leaf": True, "norm": "Credit", "stmt": "Income Statement"},

    # 5000 COST OF SALES
    {"code": "5000", "name": "COST OF SALES", "name_bn": "বিক্রয় সংক্রান্ত ব্যয়", "type": "Cost_of_Sales", "level": 1, "parent": None, "is_leaf": False, "norm": "Debit", "stmt": "Income Statement"},
    {"code": "5100", "name": "Cost of Property Sold (COPS)", "name_bn": "বিক্রিত সম্পত্তির ব্যয়", "type": "Cost_of_Sales", "level": 2, "parent": "5000", "is_leaf": True, "norm": "Debit", "stmt": "Income Statement"},

    # 6000 EXPENSES
    {"code": "6000", "name": "EXPENSES", "name_bn": "খরচ / ব্যয়", "type": "Operating_Expense", "level": 1, "parent": None, "is_leaf": False, "norm": "Debit", "stmt": "Income Statement"},
    {"code": "6100", "name": "Construction and Project Expenses", "name_bn": "নির্মাণ ও প্রকল্প ব্যয়", "type": "Project_Expense", "level": 2, "parent": "6000", "is_leaf": True, "norm": "Debit", "stmt": "Income Statement"},
    {"code": "6200", "name": "Administrative Expenses", "name_bn": "প্রশাসনিক খরচ", "type": "Operating_Expense", "level": 2, "parent": "6000", "is_leaf": True, "norm": "Debit", "stmt": "Income Statement"},
    {"code": "6300", "name": "Selling and Marketing Expenses", "name_bn": "বিক্রয় ও বিপণন খরচ", "type": "Operating_Expense", "level": 2, "parent": "6000", "is_leaf": True, "norm": "Debit", "stmt": "Income Statement"},
    {"code": "6400", "name": "Finance Costs (Interest & Bank Charges)", "name_bn": "অর্থায়ন ও ব্যাংক চার্জ", "type": "Finance_Cost", "level": 2, "parent": "6000", "is_leaf": True, "norm": "Debit", "stmt": "Income Statement"},
    {"code": "6500", "name": "Depreciation and Other Expenses", "name_bn": "অবচয় ও বিবিধ ব্যয়", "type": "Other_Income_Expense", "level": 2, "parent": "6000", "is_leaf": True, "norm": "Debit", "stmt": "Income Statement"}
]


async def run_migration():
    async with AsyncSessionLocal() as session:
        logger.info("1. Verifying and migrating columns for acc_chart_of_accounts...")
        
        # Check existing columns in acc_chart_of_accounts
        cols_res = await session.execute(text(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'acc_chart_of_accounts'"
        ))
        existing_cols = {row[0].lower() for row in cols_res.fetchall()}
        
        col_definitions = [
            ("normal_balance", "VARCHAR(16) NOT NULL DEFAULT 'Debit'"),
            ("is_control_account", "TINYINT(1) NOT NULL DEFAULT 0"),
            ("requires_project", "TINYINT(1) NOT NULL DEFAULT 0"),
            ("requires_cost_center", "TINYINT(1) NOT NULL DEFAULT 0"),
            ("statement_mapping", "VARCHAR(64) NULL DEFAULT 'Balance Sheet'"),
            ("opening_balance", "DECIMAL(16,2) NOT NULL DEFAULT 0.00"),
            ("migration_reference", "VARCHAR(64) NULL")
        ]

        for col_name, col_def in col_definitions:
            if col_name.lower() not in existing_cols:
                logger.info(f"Adding column '{col_name}' to acc_chart_of_accounts...")
                await session.execute(text(f"ALTER TABLE acc_chart_of_accounts ADD COLUMN {col_name} {col_def}"))

        # Check existing columns in acc_vouchers
        voucher_cols_res = await session.execute(text(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'acc_vouchers'"
        ))
        voucher_existing_cols = {row[0].lower() for row in voucher_cols_res.fetchall()}
        
        voucher_col_definitions = [
            ("source_document_type", "VARCHAR(64) NULL"),
            ("source_document_id", "BIGINT NULL"),
            ("posted_at", "TIMESTAMP NULL")
        ]
        for col_name, col_def in voucher_col_definitions:
            if col_name.lower() not in voucher_existing_cols:
                logger.info(f"Adding column '{col_name}' to acc_vouchers...")
                await session.execute(text(f"ALTER TABLE acc_vouchers ADD COLUMN {col_name} {col_def}"))

        await session.commit()
        logger.info("Columns migration completed successfully.")

        # 2. Seed Dynamic Lookups
        logger.info("2. Seeding dynamic lookup categories and items...")
        for cat_data in LOOKUP_SEEDS:
            stmt = select(LookupCategory).where(LookupCategory.category_code == cat_data["category_code"])
            res = await session.execute(stmt)
            category = res.scalar_one_or_none()

            if not category:
                category = LookupCategory(
                    category_code=cat_data["category_code"],
                    category_name=cat_data["category_name"],
                    description=cat_data["description"],
                    is_active=True
                )
                session.add(category)
                await session.flush()
                logger.info(f"Created category: {category.category_code}")
            else:
                category.category_name = cat_data["category_name"]
                category.description = cat_data["description"]

            for code, name_en, name_bn, color, sort_order, is_default in cat_data["items"]:
                stmt_item = select(LookupItem).where(
                    LookupItem.category_id == category.id,
                    LookupItem.item_code == code
                )
                res_item = await session.execute(stmt_item)
                item = res_item.scalar_one_or_none()

                if not item:
                    item = LookupItem(
                        category_id=category.id,
                        item_code=code,
                        item_name_en=name_en,
                        item_name_bn=name_bn,
                        color_badge=color,
                        sort_order=sort_order,
                        is_default=is_default,
                        is_active=True
                    )
                    session.add(item)
                    logger.info(f"  + Added lookup item: {code} -> {name_en}")
                else:
                    item.item_name_en = name_en
                    item.item_name_bn = name_bn
                    item.color_badge = color
                    item.sort_order = sort_order
                    item.is_default = is_default

        await session.commit()
        logger.info("Dynamic lookups seeded.")

        # 3. Seed / Align Chart of Accounts Hierarchy
        logger.info("3. Seeding / updating standard Chart of Accounts hierarchy...")
        code_to_id = {}
        for acc in STANDARD_COA_HIERARCHY:
            parent_id = None
            if acc["parent"]:
                parent_id = code_to_id.get(acc["parent"])
                if not parent_id:
                    p_res = await session.execute(text("SELECT id FROM acc_chart_of_accounts WHERE account_code = :c"), {"c": acc["parent"]})
                    p_row = p_res.fetchone()
                    if p_row:
                        parent_id = p_row[0]

            # Check if account exists
            chk = await session.execute(text("SELECT id FROM acc_chart_of_accounts WHERE account_code = :c"), {"c": acc["code"]})
            existing_row = chk.fetchone()
            if existing_row:
                acc_id = existing_row[0]
                code_to_id[acc["code"]] = acc_id
                # Update account attributes
                await session.execute(text("""
                    UPDATE acc_chart_of_accounts
                    SET account_name_en = :name,
                        account_name_bn = :name_bn,
                        account_type = :type,
                        level = :lvl,
                        parent_account_id = :parent_id,
                        is_leaf_account = :is_leaf,
                        normal_balance = :norm,
                        statement_mapping = :stmt,
                        is_active = 1
                    WHERE id = :id
                """), {
                    "name": acc["name"],
                    "name_bn": acc["name_bn"],
                    "type": acc["type"],
                    "lvl": acc["level"],
                    "parent_id": parent_id,
                    "is_leaf": 1 if acc["is_leaf"] else 0,
                    "norm": acc["norm"],
                    "stmt": acc["stmt"],
                    "id": acc_id
                })
            else:
                ins = await session.execute(text("""
                    INSERT INTO acc_chart_of_accounts 
                    (organization_id, parent_account_id, account_code, account_name_en, account_name_bn,
                     account_type, level, is_group, is_leaf_account, currency, is_reconciliation_account,
                     is_active, normal_balance, is_control_account, requires_project, requires_cost_center,
                     statement_mapping, opening_balance)
                    VALUES 
                    (1, :parent_id, :code, :name, :name_bn,
                     :type, :lvl, :is_grp, :is_leaf, 'BDT', 0,
                     1, :norm, 0, 0, 0, :stmt, 0.00)
                """), {
                    "parent_id": parent_id,
                    "code": acc["code"],
                    "name": acc["name"],
                    "name_bn": acc["name_bn"],
                    "type": acc["type"],
                    "lvl": acc["level"],
                    "is_grp": 0 if acc["is_leaf"] else 1,
                    "is_leaf": 1 if acc["is_leaf"] else 0,
                    "norm": acc["norm"],
                    "stmt": acc["stmt"]
                })
                code_to_id[acc["code"]] = ins.lastrowid
                logger.info(f"  + Created Account: {acc['code']} - {acc['name']}")

        await session.commit()
        logger.info("Chart of accounts hierarchy aligned perfectly!")


if __name__ == "__main__":
    asyncio.run(run_migration())
