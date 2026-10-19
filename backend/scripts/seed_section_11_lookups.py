import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import asyncio
from app.core.database import engine
from sqlalchemy import text

LOOKUP_SEEDS = [
    {
        "category_code": "INCOME_TYPE",
        "category_name": "Project Income Types",
        "description": "Section 11.2 Project revenue and income recognition categories",
        "items": [
            ("PROPERTY_SALE", "Property-Sale Income (Approved Policy)", "সম্পত্তি বিক্রয় আয় (অনুমোদিত নীতিমালা)", "#10B981"),
            ("RENTAL_INCOME", "Rental Income", "ভাড়া বাবদ আয়", "#3B82F6"),
            ("SERVICE_INCOME", "Service & Maintenance Income", "সার্ভিস ও রক্ষণাবেক্ষণ আয়", "#06B6D4"),
            ("PARKING_CONTRACTUAL", "Parking & Other Contractual Income", "পার্কিং ও অন্যান্য চুক্তিভিত্তিক আয়", "#8B5CF6"),
            ("OTHER_PROJECT_INCOME", "Other Project-Related Income", "অন্যান্য প্রকল্প সংশ্লিষ্ট আয়", "#64748B"),
        ]
    },
    {
        "category_code": "EXPENDITURE_CATEGORY",
        "category_name": "Project Expenditure Categories",
        "description": "Section 11.3 Project cost and expenditure classification",
        "items": [
            ("LAND_ACQUISITION", "Land Acquisition & Eligible Costs", "জমি অধিগ্রহণ ও তৎসংশ্লিষ্ট খরচ", "#D97706"),
            ("DESIGN_CONSULTANCY", "Design, Consultancy & Engineering", "ডিজাইন, পরামর্শক ও ইঞ্জিনিয়ারিং", "#6366F1"),
            ("SITE_PREPARATION", "Site Preparation & Earthworks", "সাইট প্রস্তুতি ও মাটি কাটার কাজ", "#78350F"),
            ("CIVIL_CONSTRUCTION", "Civil Construction", "সিভিল নির্মাণ কাজ", "#DC2626"),
            ("MEP_WORKS", "Electrical, Plumbing & Mechanical (MEP)", "বৈদ্যুতিক, প্লাম্বিং ও মেকানিক্যাল কাজ", "#0284C7"),
            ("FINISHING_MATERIALS_LABOUR", "Finishing Materials & Labour", "ফিনিশিং সামগ্রী ও শ্রম খরচ", "#EC4899"),
            ("CONTRACTOR_BILLS", "Contractor Bills & Certified IPC", "কন্ট্রাক্টর বিল ও সার্টিফাইড আইপিসি", "#84CC16"),
            ("EQUIPMENT_SITE_OPS", "Equipment & Site Operations", "যন্ত্রপাতি ও সাইট পরিচালনা ব্যয়", "#14B8A6"),
            ("APPROVAL_PROFESSIONAL_FEES", "Approval & Professional Fees", "অনুমোদন ও পেশাদার ফি (রাজউক/অন্যান্য)", "#A855F7"),
            ("SALES_MARKETING", "Sales & Marketing Costs", "বিক্রয় ও বিপণন খরচ", "#F97316"),
            ("FINANCING_COSTS", "Financing Costs (IAS 23 Eligible)", "অর্থায়ন ও ব্যাংক সুদ ব্যয় (আইএএস ২৩)", "#B91C1C"),
            ("ALLOCATED_OVERHEADS", "Allocated Overheads", "বন্টনকৃত প্রশাসনিক ওভারহেড", "#475569"),
        ]
    },
    {
        "category_code": "CONSTRUCTION_PHASE",
        "category_name": "Construction Phase & Work Packages",
        "description": "Section 11.1 Work packages and structural phases",
        "items": [
            ("LAND_DEV", "Land Development & Boundary", "ভূমি উন্নয়ন ও সীমানা প্রাচীর", "#D97706"),
            ("PILING_FOUNDATION", "Piling & Deep Foundation", "পাইলিং ও গভীর ভিত্তি", "#475569"),
            ("SUBSTRUCTURE", "Substructure & Basement", "সাবস্ট্রাকচার ও বেসমেন্ট", "#64748B"),
            ("SUPERSTRUCTURE", "Superstructure RCC Frame", "সুপারস্ট্রাকচার আরসিসি কাঠামো", "#2563EB"),
            ("BRICK_PLASTER", "Brickwork & Internal Plaster", "গাঁথুনি ও অভ্যন্তরীণ প্লাস্টার", "#EA580C"),
            ("MEP_ROUGHIN", "MEP Rough-in & Conduit Works", "এমইপি পাইপিং ও ওয়্যারিং", "#0D9488"),
            ("FINISHING", "Finishing, Tiles & Painting", "ফিনিশিং, টাইলস ও পেইন্টিং", "#16A34A"),
            ("EXTERNAL_WORKS", "External Infrastructure & Landscaping", "বাহ্যিক অবকাঠামো ও ল্যান্ডস্কেপিং", "#059669"),
            ("COMMISSIONING", "Testing, Commissioning & Handover", "টেস্টিং, কমিশনিং ও হস্তান্তর", "#9333EA"),
        ]
    },
    {
        "category_code": "RECOGNITION_POLICY",
        "category_name": "Revenue Recognition Policy",
        "description": "Section 11.2 Revenue accounting recognition methods",
        "items": [
            ("POC_IFRS15", "Percentage of Completion (IFRS 15)", "কাজের অগ্রগতি ভিত্তিক স্বীকৃতি (আইএফআরএস ১৫)", "#10B981"),
            ("MILESTONE_INVOICE", "Milestone Based Invoicing", "মাইলস্টোন ভিত্তিক ইনভয়েস", "#3B82F6"),
            ("IMMEDIATE_CASH", "Immediate / Cash Realization", "তাৎক্ষণিক / নগদ আদায়", "#F59E0B"),
            ("RENTAL_ACCRUAL", "Rental Accrual Method", "ভাড়া বকেয়া পদ্ধতি", "#8B5CF6"),
        ]
    },
    {
        "category_code": "COMPANY_BRANCH",
        "category_name": "Company & Operating Branches",
        "description": "Section 11.1 Company and branch dimension",
        "items": [
            ("HO_GULSHAN", "Head Office - Gulshan, Dhaka", "প্রধান কার্যালয় - গুলশান, ঢাকা", "#1E293B"),
            ("BANANI_HUB", "Banani Corporate Sales Hub", "বনানী করপোরেট সেলস হাব", "#334155"),
            ("DHANMONDI_OFFICE", "Dhanmondi Regional Center", "ধানমন্ডি আঞ্চলিক কেন্দ্র", "#0F766E"),
            ("UTTARA_DESK", "Uttara Project Site Desk", "উত্তরা প্রকল্প সাইট ডেস্ক", "#4338CA"),
            ("CHATTOGRAM_BRANCH", "Chattogram Agrabad Branch", "চট্টগ্রাম আগ্রাবাদ শাখা", "#7C2D12"),
        ]
    },
    {
        "category_code": "BUDGET_LINE",
        "category_name": "Project Budget Lines",
        "description": "Section 11.1 Budget line master code",
        "items": [
            ("BL_CIVIL_01", "BL-CIVIL-01 (Civil Materials & Rebar)", "বিএল-সিভিল-০১ (সিভিল উপাদান ও রড)", "#EF4444"),
            ("BL_MEP_01", "BL-MEP-01 (MEP Fixtures & Piping)", "বিএল-এমইপি-০১ (ইলেকট্রিক্যাল ও প্লাম্বিং)", "#06B6D4"),
            ("BL_FINISH_01", "BL-FINISH-01 (Architectural Finishing)", "বিএল-ফিনিশ-০১ (আর্কিটেকচারাল ফিনিশিং)", "#10B981"),
            ("BL_LAND_01", "BL-LAND-01 (Land & Mutation Fees)", "বিএল-ল্যান্ড-০১ (জমি ও নামজারি ফি)", "#F59E0B"),
            ("BL_PERMIT_01", "BL-PERMIT-01 (RAJUK/Statutory Permits)", "বিএল-পারমিট-০১ (রাজউক ও সরকারি অনুমোদন)", "#8B5CF6"),
            ("BL_MKT_01", "BL-MKT-01 (Sales, Media & Campaigns)", "বিএল-মার্কেট-০১ (মার্কেটিং ও বিজ্ঞাপন)", "#EC4899"),
            ("BL_MGMT_01", "BL-MGMT-01 (Allocated Admin Overhead)", "বিএল-এমজিএমটি-০১ (প্রশাসনিক ওভারহেড)", "#64748B"),
        ]
    },
    {
        "category_code": "TRANSACTION_TYPE",
        "category_name": "Financial Transaction Types",
        "description": "Section 11.1 Transaction type for mandatory dimension rules",
        "items": [
            ("ALL", "All Transaction Types", "সকল লেনদেন ধরন", "#1E293B"),
            ("VOUCHER", "General Ledger Voucher", "সাধারণ জাবেদা ভাউচার", "#2563EB"),
            ("DIRECT_INCOME", "Direct Project Income", "সরাসরি প্রকল্প আয়", "#16A34A"),
            ("DIRECT_EXPENSE", "Direct Project Expenditure", "সরাসরি প্রকল্প ব্যয়", "#DC2626"),
            ("BILL", "Contractor / Supplier Bill", "ঠিকাদার / সরবরাহকারী বিল", "#EA580C"),
            ("INVOICE", "Customer Sales Invoice", "গ্রাহক বিক্রয় চালান", "#0891B2"),
            ("PAYMENT", "Payment Voucher (Outflow)", "পেমেন্ট ভাউচার (আউটফ্লো)", "#9333EA"),
            ("RECEIPT", "Receipt Voucher (Inflow)", "মানি রসিদ (ইনফ্লো)", "#059669"),
        ]
    }
]

async def seed_lookups():
    async with engine.begin() as conn:
        for cat in LOOKUP_SEEDS:
            # Check if category exists
            res = await conn.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"),
                {"c": cat["category_code"]}
            )
            row = res.fetchone()
            if not row:
                res = await conn.execute(
                    text("""
                        INSERT INTO sys_lookup_categories (category_code, category_name, description, is_hierarchical, is_system_locked, is_active)
                        VALUES (:c, :n, :d, 0, 0, 1)
                    """),
                    {"c": cat["category_code"], "n": cat["category_name"], "d": cat["description"]}
                )
                cat_id = res.lastrowid
            else:
                cat_id = row[0]
            
            # Seed items
            for idx, (code, name_en, name_bn, color) in enumerate(cat["items"]):
                item_res = await conn.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :code"),
                    {"cid": cat_id, "code": code}
                )
                if not item_res.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_default, is_active)
                            VALUES (:cid, :code, :name_en, :name_bn, :color, :sort, :is_def, 1)
                        """),
                        {
                            "cid": cat_id,
                            "code": code,
                            "name_en": name_en,
                            "name_bn": name_bn,
                            "color": color,
                            "sort": idx + 1,
                            "is_def": 1 if idx == 0 else 0
                        }
                    )
    print("Section 11 lookups seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_lookups())
