"""
Seed dynamic lookup categories for CRM Lead Qualification (4.4) & Customer Profiles (4.5).
Run: python backend/scripts/seed_crm_qualification_customer_lookups.py
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
        "category_code": "CRM_LEAD_HEALTH",
        "category_name": "Lead Health Grade",
        "description": "5-tier qualification grades — score assists, never auto-rejects (Spec 4.4)",
        "items": [
            ("HOT", "Hot", "গরম", "#EF4444", 1, True),
            ("WARM", "Warm", "উষ্ণ", "#F59E0B", 2, False),
            ("COLD", "Cold", "ঠান্ডা", "#3B82F6", 3, False),
            ("NURTURE", "Nurture", "পোষণ", "#8B5CF6", 4, False),
            ("UNQUALIFIED", "Unqualified", "যোগ্য নয়", "#64748B", 5, False),
        ],
    },
    {
        "category_code": "CRM_CUSTOMER_TYPE",
        "category_name": "Customer Type",
        "description": "Unified customer classification (Spec 4.5)",
        "items": [
            ("INDIVIDUAL", "Individual", "ব্যক্তি", "#3B82F6", 1, True),
            ("COMPANY", "Company", "কোম্পানি", "#8B5CF6", 2, False),
            ("INVESTOR", "Investor", "বিনিয়োগকারী", "#F59E0B", 3, False),
            ("NRB", "NRB", "প্রবাসী", "#06B6D4", 4, False),
            ("OTHER", "Other", "অন্যান্য", "#64748B", 5, False),
        ],
    },
    {
        "category_code": "CRM_LANGUAGE",
        "category_name": "Preferred Language",
        "description": "Customer communication language preference (Spec 4.5)",
        "items": [
            ("BANGLA", "Bangla", "বাংলা", "#10B981", 1, True),
            ("ENGLISH", "English", "ইংরেজি", "#3B82F6", 2, False),
        ],
    },
    {
        "category_code": "CRM_NOMINEE_VERIFICATION",
        "category_name": "Nominee Verification Status",
        "description": "Nominee KYC verification state (Spec 4.5) — not proof of ownership",
        "items": [
            ("PENDING", "Pending", "অপেক্ষমাণ", "#F59E0B", 1, True),
            ("VERIFIED", "Verified", "যাচাইকৃত", "#10B981", 2, False),
            ("REJECTED", "Rejected", "প্রত্যাখ্যাত", "#EF4444", 3, False),
        ],
    },
    {
        "category_code": "CRM_SERVICE_STATUS",
        "category_name": "Service Request Status",
        "description": "Customer service request lifecycle (Spec 4.5)",
        "items": [
            ("OPEN", "Open", "খোলা", "#3B82F6", 1, True),
            ("IN_PROGRESS", "In Progress", "চলমান", "#F59E0B", 2, False),
            ("WAITING_CUSTOMER", "Waiting Customer", "গ্রাহকের অপেক্ষায়", "#8B5CF6", 3, False),
            ("RESOLVED", "Resolved", "সমাধান", "#10B981", 4, False),
            ("CLOSED", "Closed", "বন্ধ", "#64748B", 5, False),
        ],
    },
    {
        "category_code": "CRM_SERVICE_PRIORITY",
        "category_name": "Service Request Priority",
        "description": "Service request urgency (Spec 4.5)",
        "items": [
            ("LOW", "Low", "কম", "#64748B", 1, False),
            ("MEDIUM", "Medium", "মাঝারি", "#3B82F6", 2, True),
            ("HIGH", "High", "উচ্চ", "#F59E0B", 3, False),
            ("URGENT", "Urgent", "জরুরি", "#EF4444", 4, False),
        ],
    },
    {
        "category_code": "CRM_NOMINEE_RELATION",
        "category_name": "Nominee Relation",
        "description": "Nominee relationship to customer (Spec 4.5)",
        "items": [
            ("SPOUSE", "Spouse", "স্বামী/স্ত্রী", "#EC4899", 1, True),
            ("SON", "Son", "ছেলে", "#3B82F6", 2, False),
            ("DAUGHTER", "Daughter", "মেয়ে", "#8B5CF6", 3, False),
            ("FATHER", "Father", "বাবা", "#10B981", 4, False),
            ("MOTHER", "Mother", "মা", "#F59E0B", 5, False),
            ("BROTHER", "Brother", "ভাই", "#06B6D4", 6, False),
            ("SISTER", "Sister", "বোন", "#EC4899", 7, False),
            ("OTHER", "Other", "অন্যান্য", "#64748B", 8, False),
        ],
    },
]


async def seed_lookups():
    async with AsyncSessionLocal() as db:
        for seed in CRM_LOOKUP_SEEDS:
            existing = (
                await db.execute(
                    select(LookupCategory).where(LookupCategory.category_code == seed["category_code"])
                )
            ).scalars().first()

            if existing:
                logger.info(f"Category {seed['category_code']} already exists — skipping.")
                continue

            category = LookupCategory(
                category_code=seed["category_code"],
                category_name=seed["category_name"],
                description=seed.get("description"),
                is_system_locked=True
            )
            db.add(category)
            await db.flush()

            for code, name_en, name_bn, color, order, is_default in seed["items"]:
                item = LookupItem(
                    category_id=category.id,
                    item_code=code,
                    item_name_en=name_en,
                    item_name_bn=name_bn,
                    color_badge=color,
                    sort_order=order,
                    is_default=is_default,
                    is_active=True
                )
                db.add(item)

            logger.info(f"Seeded category {seed['category_code']} with {len(seed['items'])} items.")

        await db.commit()
    logger.info("CRM Qualification & Customer lookup seeding complete.")


if __name__ == "__main__":
    asyncio.run(seed_lookups())
