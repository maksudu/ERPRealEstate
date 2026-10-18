"""
Seed dynamic lookup categories for CRM Lead Capture (4.2) & Assignment (4.3).
Run: python backend/scripts/seed_crm_lead_capture_lookups.py
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

CRM_LOOKUP_SEEDS = [
    {
        "category_code": "CRM_LEAD_SOURCE",
        "category_name": "CRM Lead Source",
        "description": "Omnichannel lead capture sources (Spec 4.2)",
        "items": [
            ("WEBSITE_FORM", "Website Form", "ওয়েবসাইট ফর্ম", "#3B82F6", 1, True),
            ("FACEBOOK_ADS", "Facebook Ads", "ফেসবুক বিজ্ঞাপন", "#1877F2", 2, False),
            ("PHONE_CALL", "Phone Call", "ফোন কল", "#10B981", 3, False),
            ("WHATSAPP", "WhatsApp", "হোয়াটসঅ্যাপ", "#22C55E", 4, False),
            ("WALK_IN", "Walk-in", "ওয়াক-ইন", "#F59E0B", 5, False),
            ("BROKER", "Broker / Agent", "ব্রোকার / এজেন্ট", "#8B5CF6", 6, False),
            ("REFERRAL", "Customer Referral", "গ্রাহক রেফারেল", "#06B6D4", 7, False),
            ("EXHIBITION", "Exhibition / Event", "প্রদর্শনী / ইভেন্ট", "#EC4899", 8, False),
            ("EMAIL", "Email Inquiry", "ইমেইল অনুসন্ধান", "#64748B", 9, False),
            ("DIGITAL_CAMPAIGN", "Digital Campaign", "ডিজিটাল ক্যাম্পেইন", "#EF4444", 10, False),
            ("MANUAL_ENTRY", "Manual Entry", "ম্যানুয়াল এন্ট্রি", "#475569", 11, False),
        ],
    },
    {
        "category_code": "CRM_CONTACT_METHOD",
        "category_name": "Preferred Contact Method",
        "description": "Consented communication preference (Spec 4.2)",
        "items": [
            ("PHONE", "Phone Call", "ফোন", "#10B981", 1, True),
            ("EMAIL", "Email", "ইমেইল", "#3B82F6", 2, False),
            ("WHATSAPP", "WhatsApp", "হোয়াটসঅ্যাপ", "#22C55E", 3, False),
            ("NONE", "No Preference", "পছন্দ নেই", "#64748B", 4, False),
        ],
    },
    {
        "category_code": "CRM_PROPERTY_TYPE",
        "category_name": "Property Type",
        "description": "Interested property categories (Spec 4.2)",
        "items": [
            ("APARTMENT", "Apartment / Flat", "অ্যাপার্টমেন্ট / ফ্ল্যাট", "#3B82F6", 1, True),
            ("DUPLEX", "Duplex", "ডুপ্লেক্স", "#8B5CF6", 2, False),
            ("PENTHOUSE", "Penthouse", "পেন্টহাউস", "#F59E0B", 3, False),
            ("SHOP", "Shop / Retail", "দোকান / রিটেইল", "#EC4899", 4, False),
            ("OFFICE", "Office Space", "অফিস স্পেস", "#06B6D4", 5, False),
            ("COMMERCIAL_SPACE", "Commercial Space", "কমার্শিয়াল স্পেস", "#EF4444", 6, False),
            ("SHOPHOUSE", "Shop-house", "শপ-হাউস", "#10B981", 7, False),
            ("LAND", "Land / Plot", "জমি / প্লট", "#64748B", 8, False),
        ],
    },
    {
        "category_code": "CRM_LEAD_PRIORITY",
        "category_name": "Lead Priority",
        "description": "Lead priority for SLA & escalation (Spec 4.3)",
        "items": [
            ("LOW", "Low", "কম", "#64748B", 1, False),
            ("MEDIUM", "Medium", "মাঝারি", "#3B82F6", 2, True),
            ("HIGH", "High", "উচ্চ", "#F59E0B", 3, False),
            ("URGENT", "Urgent", "জরুরি", "#EF4444", 4, False),
        ],
    },
    {
        "category_code": "CRM_ASSIGNMENT_METHOD",
        "category_name": "Assignment Method",
        "description": "Lead distribution / assignment strategies (Spec 4.3)",
        "items": [
            ("MANUAL", "Manual Assignment", "ম্যানুয়াল বরাদ্দ", "#64748B", 1, True),
            ("ROUND_ROBIN", "Round-Robin", "রাউন্ড-রবিন", "#3B82F6", 2, False),
            ("PROJECT_WISE", "Project-wise", "প্রজেক্ট অনুযায়ী", "#8B5CF6", 3, False),
            ("LOCATION_WISE", "Location-wise", "এলাকা অনুযায়ী", "#06B6D4", 4, False),
            ("PROPERTY_TYPE_SPECIALIST", "Property-type Specialist", "প্রপার্টি টাইপ বিশেষজ্ঞ", "#EC4899", 5, False),
            ("WORKLOAD_BALANCED", "Workload Balanced", "ওয়ার্কলোড ব্যালান্সড", "#10B981", 6, False),
            ("CAMPAIGN_SPECIFIC", "Campaign-specific", "ক্যাম্পেইন-নির্দিষ্ট", "#F59E0B", 7, False),
            ("BROKER_ROUTED", "Broker Routed", "ব্রোকার রাউটিং", "#8B5CF6", 8, False),
        ],
    },
    {
        "category_code": "CRM_LOST_REASON",
        "category_name": "Lost / Dropped Reason",
        "description": "Reasons for lost or dropped leads (Spec 4.11)",
        "items": [
            ("BUDGET_MISMATCH", "Budget Mismatch", "বাজেট মিলে না", "#EF4444", 1, False),
            ("LOCATION_MISMATCH", "Location Mismatch", "এলাকা মিলে না", "#F59E0B", 2, False),
            ("UNIT_UNAVAILABLE", "Unit Unavailable", "ইউনিট নেই", "#8B5CF6", 3, False),
            ("CHOSE_COMPETITOR", "Chose Competitor", "প্রতিযোগী বেছে নিয়েছে", "#64748B", 4, False),
            ("NO_RESPONSE", "No Response", "সাড়া পাওয়া যায়নি", "#94A3B8", 5, False),
            ("DEFERRED_PURCHASE", "Deferred Purchase", "কেনা পিছিয়েছে", "#3B82F6", 6, False),
            ("FINANCE_ISSUE", "Finance / Loan Issue", "আর্থিক / লোন সমস্যা", "#EC4899", 7, False),
            ("OTHER", "Other", "অন্যান্য", "#64748B", 8, False),
        ],
    },
    {
        "category_code": "CRM_LEAD_STAGE",
        "category_name": "CRM Lead Stage",
        "description": "Sales funnel pipeline stages (Spec 4.11)",
        "items": [
            ("NEW", "New", "নতুন", "#3B82F6", 1, True),
            ("CONTACTED", "Contacted", "যোগাযোগ করা হয়েছে", "#06B6D4", 2, False),
            ("QUALIFIED", "Qualified", "যোগ্য", "#8B5CF6", 3, False),
            ("SITE_VISIT_SCHEDULED", "Site Visit Scheduled", "সাইট ভিজিট নির্ধারিত", "#F59E0B", 4, False),
            ("SITE_VISIT_COMPLETED", "Site Visit Completed", "সাইট ভিজিট সম্পন্ন", "#10B981", 5, False),
            ("VISITED", "Visited", "পরিদর্শন করেছে", "#10B981", 6, False),
            ("NEGOTIATION", "Negotiation", "আলোচনা", "#EAB308", 7, False),
            ("TOKEN_BOOKED", "Token Booked", "টোকেন বুকড", "#22C55E", 8, False),
            ("BOOKED", "Booked", "বুকড", "#16A34A", 9, False),
            ("LOST", "Lost", "হারানো", "#EF4444", 10, False),
            ("DROPPED", "Dropped", "বাতিল", "#64748B", 11, False),
        ],
    },
]


async def seed():
    async with AsyncSessionLocal() as session:
        for cat_data in CRM_LOOKUP_SEEDS:
            stmt = select(LookupCategory).where(LookupCategory.category_code == cat_data["category_code"])
            res = await session.execute(stmt)
            category = res.scalar_one_or_none()
            if not category:
                category = LookupCategory(
                    category_code=cat_data["category_code"],
                    category_name=cat_data["category_name"],
                    description=cat_data["description"],
                    is_system_locked=True,
                    is_active=True,
                )
                session.add(category)
                await session.flush()
                logger.info(f"Created lookup category: {cat_data['category_code']}")
            else:
                logger.info(f"Lookup category already exists: {cat_data['category_code']}")

            for code, name_en, name_bn, badge, sort, is_default in cat_data["items"]:
                item_res = await session.execute(
                    select(LookupItem).where(
                        LookupItem.category_id == category.id,
                        LookupItem.item_code == code,
                    )
                )
                if item_res.scalars().first():
                    continue
                session.add(LookupItem(
                    category_id=category.id,
                    item_code=code,
                    item_name_en=name_en,
                    item_name_bn=name_bn,
                    color_badge=badge,
                    sort_order=sort,
                    is_default=is_default,
                    is_active=True,
                ))
                logger.info(f"  + item {code}")

        await session.commit()
        logger.info("CRM lead capture lookup seeding complete.")


if __name__ == "__main__":
    asyncio.run(seed())
