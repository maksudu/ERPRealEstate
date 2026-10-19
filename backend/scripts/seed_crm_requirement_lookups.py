"""
Seed dynamic lookup categories for Spec 4.6: Customer Requirements & Budget Tracking.
Run: python backend/scripts/seed_crm_requirement_lookups.py
"""
import os
import sys
import asyncio
import logging

sys.path.insert(0, os.path.abspath("backend"))
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem

REQUIREMENT_LOOKUP_SEEDS = [
    {
        "category_code": "CRM_PROPERTY_TYPE",
        "category_name": "Property Type",
        "description": "Property preference categories (Spec 4.6)",
        "items": [
            ("APARTMENT", "Residential Apartment", "আবাসিক ফ্ল্যাট", "#3B82F6", 1, True),
            ("PENTHOUSE", "Penthouse", "পেন্টহাউস", "#8B5CF6", 2, False),
            ("DUPLEX", "Duplex Apartment", "ডুপ্লেক্স", "#EC4899", 3, False),
            ("COMMERCIAL", "Commercial Office / Shop", "বাণিজ্যিক স্পেস", "#F59E0B", 4, False),
            ("PLOT", "Residential Plot", "আবাসিক প্লট", "#10B981", 5, False),
            ("STUDIO", "Studio Flat", "স্টুডিও ফ্ল্যাট", "#06B6D4", 6, False),
        ],
    },
    {
        "category_code": "CRM_PREFERRED_FLOOR",
        "category_name": "Preferred Floor",
        "description": "Floor preference levels (Spec 4.6)",
        "items": [
            ("ANY", "Any Floor", "যেকোনো তলা", "#64748B", 1, True),
            ("GROUND", "Ground Floor", "গ্রাউন্ড ফ্লোর", "#3B82F6", 2, False),
            ("LOW_FLOOR", "Low Floor (1st - 4th)", "নিচতলা (১ম - ৪র্থ)", "#10B981", 3, False),
            ("MID_FLOOR", "Mid Floor (5th - 9th)", "মধ্যম তলা (৫ম - ৯ম)", "#F59E0B", 4, False),
            ("HIGH_FLOOR", "High Floor (10th+)", "উপরের তলা (১০ম+)", "#8B5CF6", 5, False),
            ("PENTHOUSE_FLOOR", "Top / Penthouse Floor", "টপ / পেন্টহাউস তলা", "#EC4899", 6, False),
        ],
    },
    {
        "category_code": "CRM_FACING",
        "category_name": "Preferred Facing",
        "description": "Orientation / Facing preferences (Spec 4.6)",
        "items": [
            ("ANY", "Any Direction", "যেকোনো দিক", "#64748B", 1, True),
            ("SOUTH_FACING", "South Facing", "দক্ষিণমুখী", "#10B981", 2, False),
            ("EAST_FACING", "East Facing", "পূর্বমুখী", "#3B82F6", 3, False),
            ("SOUTH_EAST", "South-East Corner", "দক্ষিণ-পূর্ব কর্নার", "#8B5CF6", 4, False),
            ("NORTH_FACING", "North Facing", "উত্তরমুখী", "#64748B", 5, False),
            ("WEST_FACING", "West Facing", "পশ্চিমমুখী", "#F59E0B", 6, False),
        ],
    },
    {
        "category_code": "CRM_PURCHASE_TIMELINE",
        "category_name": "Purchase Timeline",
        "description": "Buyer expected purchase timeline (Spec 4.6)",
        "items": [
            ("IMMEDIATE", "Immediate (< 1 Month)", "অবিলম্বে (< ১ মাস)", "#EF4444", 1, True),
            ("WITHIN_3_MONTHS", "Within 3 Months", "৩ মাসের মধ্যে", "#F59E0B", 2, False),
            ("WITHIN_6_MONTHS", "Within 6 Months", "৬ মাসের মধ্যে", "#3B82F6", 3, False),
            ("WITHIN_1_YEAR", "Within 1 Year", "১ বছরের মধ্যে", "#8B5CF6", 4, False),
            ("MORE_THAN_1_YEAR", "Future Investor (> 1 Year)", "ভবিষ্যত বিনিয়োগ (> ১ বছর)", "#64748B", 5, False),
        ],
    },
    {
        "category_code": "CRM_PAYMENT_PREFERENCE",
        "category_name": "Payment Preference",
        "description": "Preferred payment & financing structure (Spec 4.6)",
        "items": [
            ("INSTALLMENTS", "Construction-Linked Installments", "নির্মাণভিত্তিক কিস্তি", "#3B82F6", 1, True),
            ("BANK_FINANCING", "Bank Loan / Home Financing", "ব্যাংক লোন / অর্থায়ন", "#10B981", 2, False),
            ("LUMP_SUM", "Lump-Sum / Cash Down", "এককালীন অর্থপ্রদান", "#F59E0B", 3, False),
            ("CUSTOM_SCHEDULE", "Custom Milestones", "কাস্টম সিডিউল", "#8B5CF6", 4, False),
        ],
    },
    {
        "category_code": "CRM_REQUIREMENT_STATUS",
        "category_name": "Requirement Status",
        "description": "Lifecycle state of customer requirement (Spec 4.6)",
        "items": [
            ("ACTIVE", "Active Searching", "সক্রিয় অনুসন্ধান", "#10B981", 1, True),
            ("MATCHED", "Inventory Matched", "ইউনিট ম্যাচিং হয়েছে", "#3B82F6", 2, False),
            ("FULFILLED", "Unit Booked / Purchased", "বুকিং সম্পন্ন", "#8B5CF6", 3, False),
            ("ON_HOLD", "Temporarily On-Hold", "সাময়িক স্থগিত", "#F59E0B", 4, False),
            ("CLOSED", "Closed / Dropped", "বন্ধ / বাতিল", "#64748B", 5, False),
        ],
    },
    {
        "category_code": "CRM_RECOMMENDATION_STATUS",
        "category_name": "Recommendation Status",
        "description": "Stage of suggested unit for customer (Spec 4.6)",
        "items": [
            ("RECOMMENDED", "Recommended", "প্রস্তাবিত", "#3B82F6", 1, True),
            ("SHORTLISTED", "Shortlisted", "শর্টলিস্টেড", "#8B5CF6", 2, False),
            ("SITE_VISITED", "Site Visited", "সাইট ভিজিট সম্পন্ন", "#F59E0B", 3, False),
            ("ACCEPTED", "Accepted for Booking", "বুকিংয়ের জন্য গৃহীত", "#10B981", 4, False),
            ("REJECTED", "Rejected by Customer", "প্রত্যাখ্যাত", "#EF4444", 5, False),
        ],
    },
    {
        "category_code": "CRM_REJECTION_REASON",
        "category_name": "Unit Rejection Reason",
        "description": "Reason when a suggested inventory is rejected by customer (Spec 4.6)",
        "items": [
            ("PRICE_TOO_HIGH", "Budget Exceeded / Price Too High", "বাজেট বহির্ভূত / মূল্য বেশি", "#EF4444", 1, True),
            ("FLOOR_MISMATCH", "Floor Not Preferred", "পছন্দসই ফ্লোর নয়", "#F59E0B", 2, False),
            ("FACING_MISMATCH", "Facing / Sunlight Concern", "দিক / রোদ সমস্যা", "#F59E0B", 3, False),
            ("LAYOUT_UNSUITABLE", "Layout / Room Size Unsuitable", "লেআউট পছন্দ নয়", "#8B5CF6", 4, False),
            ("LOCATION_CONCERN", "Location / Accessibility Issue", "লোকেশন সমস্যা", "#64748B", 5, False),
            ("LACK_OF_PARKING", "Parking Unavailable / Issue", "পার্কিং সমস্যা", "#64748B", 6, False),
            ("DELAYED_HANDOVER", "Handover Date Too Late", "হস্তান্তর তারিখ বিলম্বিত", "#EC4899", 7, False),
            ("OTHER", "Other Specific Reason", "অন্যান্য কারণ", "#64748B", 8, False),
        ],
    },
]


async def seed_lookups():
    logger.info("Seeding dynamic lookups for Spec 4.6...")
    async with AsyncSessionLocal() as session:
        for seed in REQUIREMENT_LOOKUP_SEEDS:
            res = await session.execute(
                select(LookupCategory).where(LookupCategory.category_code == seed["category_code"])
            )
            cat = res.scalars().first()
            if not cat:
                cat = LookupCategory(
                    category_code=seed["category_code"],
                    category_name=seed["category_name"],
                    description=seed["description"],
                    is_system_locked=True,
                )
                session.add(cat)
                await session.flush()
                logger.info(f"Created category: {cat.category_code}")
            else:
                logger.info(f"Category {cat.category_code} exists.")

            # Seed items
            for code, name, bn_name, color, order, is_default in seed["items"]:
                item_res = await session.execute(
                    select(LookupItem).where(
                        LookupItem.category_id == cat.id,
                        LookupItem.item_code == code
                    )
                )
                existing = item_res.scalars().first()
                if not existing:
                    new_item = LookupItem(
                        category_id=cat.id,
                        item_code=code,
                        item_name_en=name,
                        item_name_bn=bn_name,
                        color_badge=color,
                        sort_order=order,
                        is_default=is_default,
                        is_active=True,
                    )
                    session.add(new_item)
                    logger.info(f"  + Added item: {code} ({name})")
        await session.commit()
    logger.info("Spec 4.6 dynamic lookups seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_lookups())
