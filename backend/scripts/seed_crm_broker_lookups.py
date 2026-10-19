"""
Seed script for Spec 4.10: Broker and Referral Management dynamic lookups.
Seeds categories and items:
- CRM_BROKER_TYPE
- CRM_BROKER_STATUS
- CRM_COMMISSION_TYPE
- CRM_COMMISSION_MILESTONE
- CRM_COMMISSION_CLAIM_STATUS
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
        "category_code": "CRM_BROKER_TYPE",
        "category_name": "Broker & Partner Entity Type",
        "description": "Classification of referral channel partners (Spec 4.10)",
        "items": [
            ("REAL_ESTATE_AGENCY", "Registered Real Estate Brokerage / Agency", "রিয়েল এস্টেট এজেন্সি", "#3B82F6", 1, True),
            ("FREELANCE_BROKER", "Independent / Freelance Property Agent", "স্বাধীন ব্রোকার", "#10B981", 2, False),
            ("CORPORATE_PARTNER", "Corporate Referral Partner / Bank / FI", "কর্পোরেট পার্টনার", "#8B5CF6", 3, False),
            ("EXISTING_CUSTOMER", "Existing Customer / Ambassador Referral", "বিদ্যমান গ্রাহক রেফারেল", "#F59E0B", 4, False),
            ("INDIVIDUAL_ASSOCIATE", "Individual Associate / Professional Introducer", "ব্যক্তিগত সহযোগী", "#64748B", 5, False)
        ]
    },
    {
        "category_code": "CRM_BROKER_STATUS",
        "category_name": "Broker Master Status",
        "description": "Lifecycle authorization status for brokers (Spec 4.10)",
        "items": [
            ("PROSPECTIVE", "Prospective / Document Vetting", "সম্ভাব্য", "#3B82F6", 1, True),
            ("ACTIVE", "Active / Authorized Partner", "সক্রিয়", "#10B981", 2, False),
            ("SUSPENDED", "Suspended / Compliance Hold", "স্থগিত", "#EF4444", 3, False),
            ("EXPIRED", "Agreement Expired", "মেয়াদোত্তীর্ণ", "#64748B", 4, False)
        ]
    },
    {
        "category_code": "CRM_COMMISSION_TYPE",
        "category_name": "Broker Commission Structure",
        "description": "Commission calculation basis (Spec 4.10)",
        "items": [
            ("PERCENTAGE", "Percentage of Base Property Price (%)", "মূল্যের শতকরা (%)", "#10B981", 1, True),
            ("FIXED_PER_SQFT", "Fixed Amount per SqFt (BDT/sft)", "প্রতি বর্গফুট নির্দিষ্ট টাকা", "#3B82F6", 2, False),
            ("SLAB_TIER", "Tiered Milestone Slab", "ধাপভিত্তিক কমিশন", "#8B5CF6", 3, False),
            ("FLAT_FEE", "Flat Bounty per Booked Unit (BDT)", "এককালীন বুকিং বাউন্টি", "#F59E0B", 4, False)
        ]
    },
    {
        "category_code": "CRM_COMMISSION_MILESTONE",
        "category_name": "Commission Eligibility Milestone",
        "description": "Required booking/collection milestone before payout becomes eligible (Spec 4.10)",
        "items": [
            ("TOKEN_BOOKED", "Token Money Received (Booking Confirmed)", "টোকেন বুকিং নিশ্চিত", "#3B82F6", 1, False),
            ("DOWN_PAYMENT_CLEARED", "20% Down Payment Realized & Cleared", "ডাউন পেমেন্ট ক্লিয়ারেন্স", "#10B981", 2, True),
            ("DEED_REGISTERED", "Sales Deed / Allotment Agreement Signed", "চুক্তিপত্র স্বাক্ষর", "#8B5CF6", 3, False),
            ("FULL_HANDOVER", "Full Payment & Property Handover", "পূর্ণ হস্তান্তর", "#059669", 4, False)
        ]
    },
    {
        "category_code": "CRM_COMMISSION_CLAIM_STATUS",
        "category_name": "Commission Claim Workflow Status",
        "description": "Multi-tier approval and disbursement pipeline (Spec 4.10)",
        "items": [
            ("DRAFT", "Draft Claim (Pre-validation)", "খসড়া দাবি", "#64748B", 1, True),
            ("SUBMITTED", "Submitted for Sales Verification", "যাচাইয়ের জন্য জমা", "#3B82F6", 2, False),
            ("APPROVED_SALES", "Approved by Sales Head", "বিক্রয় অনুমোদন", "#F59E0B", 3, False),
            ("APPROVED_FINANCE", "Approved by Finance & Accounts", "অর্থ বিভাগ অনুমোদন", "#10B981", 4, False),
            ("DISBURSED", "Disbursed / Paid Out", "পরিশোধিত", "#059669", 5, False),
            ("REJECTED", "Rejected / Invalid Milestone", "প্রত্যাখ্যাত", "#EF4444", 6, False)
        ]
    }
]

async def seed_broker_lookups():
    logger.info("Seeding dynamic lookups for Spec 4.10 Broker & Referral Management...")
    async with AsyncSessionLocal() as session:
        for cat_data in LOOKUP_SEEDS:
            cat_code = cat_data["category_code"]
            res = await session.execute(select(LookupCategory).where(LookupCategory.category_code == cat_code))
            cat = res.scalars().first()

            if not cat:
                cat = LookupCategory(
                    category_code=cat_code,
                    category_name=cat_data["category_name"],
                    description=cat_data["description"],
                    is_system_locked=True
                )
                session.add(cat)
                await session.flush()
                logger.info(f"Created category: {cat_code}")

            for code, name, bn_name, color, order, is_default in cat_data["items"]:
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
                        is_active=True
                    )
                    session.add(new_item)
                    logger.info(f"  + Added item: {code} ({name})")

        await session.commit()
    logger.info("Spec 4.10 dynamic lookups seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_broker_lookups())
