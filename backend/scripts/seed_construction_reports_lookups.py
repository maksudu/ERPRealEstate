"""
Seed script for Construction Management Reports Lookups.
Populates dynamic lookups in LookupCategory/LookupItem for:
1. CONSTRUCTION_REPORT_CATEGORY (Categories of construction reports)
2. CONSTRUCTION_REPORT_TYPE (The 14 standard management reports)
3. CONSTRUCTION_REPORT_STATUS (KPI health & compliance statuses)
"""
import sys
import os
import asyncio
import logging
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LOOKUP_SEEDS = [
    {
        "category_code": "CONSTRUCTION_REPORT_CATEGORY",
        "category_name": "Construction Report Categories",
        "description": "Functional domain groupings for construction executive reports",
        "items": [
            ("ALL", "All 14 Reports", "সকল ১৪টি রিপোর্ট", "#3B82F6", 1, True),
            ("Progress & Schedule", "Progress & Schedule", "অগ্রগতি ও সময়সূচী", "#10B981", 2, False),
            ("Cost & Budget Control", "Cost & Budget Control", "ব্যয় ও বাজেট নিয়ন্ত্রণ", "#F59E0B", 3, False),
            ("Materials & Store", "Materials & Store", "নির্মাণ সামগ্রী ও গুদাম", "#06B6D4", 4, False),
            ("Contractor & Contracts", "Contractor & Contracts", "ঠিকাদার ও চুক্তি", "#8B5CF6", 5, False),
            ("Billing & Payments", "Billing & Payments", "বিলিং ও পরিশোধ", "#EC4899", 6, False),
            ("Workforce & Site Ops", "Workforce & Site Ops", "শ্রমিক উপস্থিতি ও কর্মদক্ষতা", "#6366F1", 7, False),
            ("Quality & Safety", "Quality & Safety", "গুণগত মান ও নিরাপত্তা", "#EF4444", 8, False),
            ("Closeout & Handover", "Closeout & Handover", "সমাপ্তি ও হস্তান্তর", "#14B8A6", 9, False)
        ]
    },
    {
        "category_code": "CONSTRUCTION_REPORT_TYPE",
        "category_name": "Standard Construction Reports (14 Reports)",
        "description": "The 14 standard management reports for construction operations",
        "items": [
            ("PROJECT_PROGRESS", "1. Project-Wise Construction Progress", "প্রকল্পভিত্তিক নির্মাণ অগ্রগতি", "#3B82F6", 1, True),
            ("WBS_DELAY", "2. WBS Activity & Critical-Path Delay Report", "WBS কার্যক্রম ও বিলম্ব রিপোর্ট", "#EF4444", 2, False),
            ("BOQ_VS_ACTUAL", "3. BOQ vs Actual Quantity & Cost", "BOQ বনাম প্রকৃত পরিমাণ ও ব্যয়", "#10B981", 3, False),
            ("BUDGET_COMMITTED_ACTUAL", "4. Budget vs Committed Cost vs Actual Expenditure", "বাজেট বনাম প্রতিশ্রুতি বনাম প্রকৃত ব্যয়", "#F59E0B", 4, False),
            ("MATERIAL_CONSUMPTION", "5. Material Requirement, Consumption & Wastage", "মালামাল চাহিদা, ব্যবহার ও অপচয়", "#06B6D4", 5, False),
            ("CONTRACTOR_WORK_ORDER", "6. Contractor Work Order & Contract Balance", "ঠিকাদার ওয়ার্ক অর্ডার ও চুক্তি ব্যালেন্স", "#8B5CF6", 6, False),
            ("BILL_CERTIFICATION_AGEING", "7. Contractor Bill Certification & Payment Ageing", "বিল সার্টিফিকেশন ও বকেয়া বয়সসীমা", "#EC4899", 7, False),
            ("ADVANCE_RETENTION_LIABILITY", "8. Advance, Retention & Outstanding Contractor Liability", "অগ্রিম, রিটেনশন ও ঠিকাদারের দায়", "#F97316", 8, False),
            ("LABOUR_PRODUCTIVITY", "9. Labour Attendance & Productivity", "শ্রমিক উপস্থিতি ও উৎপাদনশীলতা", "#6366F1", 9, False),
            ("QUALITY_NCR_CLOSURE", "10. Quality Inspection, NCR & Defect Closure", "মান পরিদর্শন, NCR ও ত্রুটি সমাধান", "#14B8A6", 10, False),
            ("SAFETY_INCIDENTS_CAPA", "11. Safety Incidents & Corrective Actions", "নিরাপত্তা দুর্ঘটনা ও প্রতিকারমূলক ব্যবস্থা", "#DC2626", 11, False),
            ("COMPLETION_CHECKLIST", "12. Project Completion & Outstanding-Work Checklist", "প্রকল্প সমাপ্তি ও অবশিষ্ট কাজের তালিকা", "#059669", 12, False),
            ("EAC_COST_VARIANCE", "13. Estimated Cost at Completion (EAC) & Cost Variance", "সমাপ্তিতে সম্ভাব্য মোট ব্যয় ও তারতম্য", "#7C3AED", 13, False),
            ("CONSTRUCTION_WIP_ALLOCATION", "14. Project-Wise Construction WIP & Cost Allocation", "নির্মাণাধীন কাজ (WIP) ও ব্যয় বণ্টন", "#0284C7", 14, False)
        ]
    },
    {
        "category_code": "CONSTRUCTION_REPORT_STATUS",
        "category_name": "Construction Operations Statuses",
        "description": "Standard status indicators for construction management reports",
        "items": [
            ("ON_TRACK", "On Track / Healthy", "সময়মতো চলছে", "#10B981", 1, True),
            ("DELAYED", "Delayed / Critical", "বিলম্বিত", "#EF4444", 2, False),
            ("MINOR_SLIPPAGE", "Minor Slippage", "সামান্য বিলম্ব", "#F59E0B", 3, False),
            ("EFFICIENT", "Efficient / Within Norm", "পরিমিত অপচয়", "#10B981", 4, False),
            ("EXCESS_WASTAGE", "Excess Wastage", "অতিরিক্ত অপচয়", "#DC2626", 5, False),
            ("POSTED_TO_BALANCE_SHEET", "Capitalized / Posted to Balance Sheet", "ব্যালেন্স শিটে মূলধনীকৃত", "#3B82F6", 6, False)
        ]
    }
]


async def seed_construction_reports_lookups():
    async with AsyncSessionLocal() as session:
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
                logger.info(f"Existing category: {category.category_code}")

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
                    logger.info(f"  + Added item: {code} -> {name_en}")
                else:
                    item.item_name_en = name_en
                    item.item_name_bn = name_bn
                    item.color_badge = color
                    item.sort_order = sort_order
                    item.is_default = is_default

        await session.commit()
        logger.info("Successfully seeded construction reports lookups!")


if __name__ == "__main__":
    asyncio.run(seed_construction_reports_lookups())
