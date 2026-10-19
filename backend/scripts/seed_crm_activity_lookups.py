"""
Seed dynamic lookup categories for Specs 4.7, 4.8, 4.9.
Run: python backend/scripts/seed_crm_activity_lookups.py
"""
import os
import sys
import asyncio
import logging

sys.path.insert(0, os.path.abspath("backend"))
import app.main
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem

ACTIVITY_LOOKUP_SEEDS = [
    {
        "category_code": "CRM_ACTIVITY_TYPE",
        "category_name": "Sales Activity Type",
        "description": "Sales interactions, appointments, and inspections (Spec 4.7)",
        "items": [
            ("INITIAL_INTRO_CALL", "Initial Introduction Call", "প্রাথমিক পরিচয় কল", "#3B82F6", 1, True),
            ("FOLLOW_UP_CALL", "Follow-up Phone Call", "ফলো-আপ ফোন কল", "#06B6D4", 2, False),
            ("VIDEO_MEETING", "Video Meeting (Zoom / Meet)", "ভিডিও মিটিং", "#8B5CF6", 3, False),
            ("OFFICE_APPOINTMENT", "Corporate Office Appointment", "অফিস অ্যাপয়েন্টমেন্ট", "#F59E0B", 4, False),
            ("SITE_VISIT", "Project Site Visit", "প্রজেক্ট সাইট ভিজিট", "#10B981", 5, False),
            ("SHOW_APARTMENT_VISIT", "Show-Apartment Walkthrough", "মকআপ ফ্ল্যাট পরিদর্শন", "#EC4899", 6, False),
            ("BROKER_MEETING", "Channel Partner / Broker Meeting", "ব্রোকার মিটিং", "#64748B", 7, False),
            ("PRICE_NEGOTIATION", "Price & Discount Negotiation", "মূল্য ও ডিসকাউন্ট আলোচনা", "#EF4444", 8, False),
            ("DOCUMENT_DISCUSSION", "Deed & Document Discussion", "কাগজপত্র ও চুক্তি আলোচনা", "#F97316", 9, False),
            ("POST_VISIT_FOLLOW_UP", "Post-Visit Follow-up", "ভিজিট-পরবর্তী ফলো-আপ", "#14B8A6", 10, False),
        ],
    },
    {
        "category_code": "CRM_ACTIVITY_STATUS",
        "category_name": "Activity Status",
        "description": "Lifecycle state of scheduled activity (Spec 4.7)",
        "items": [
            ("PLANNED", "Planned / Scheduled", "পরিকল্পিত / নির্ধারিত", "#3B82F6", 1, True),
            ("COMPLETED", "Completed", "সম্পন্ন", "#10B981", 2, False),
            ("RESCHEDULED", "Rescheduled", "পুনঃনির্ধারিত", "#F59E0B", 3, False),
            ("CANCELLED", "Cancelled", "বাতিল", "#64748B", 4, False),
            ("NO_SHOW", "No-Show / Client Absent", "অনুপস্থিত", "#EF4444", 5, False),
        ],
    },
    {
        "category_code": "CRM_TASK_CATEGORY",
        "category_name": "Follow-Up Task Category",
        "description": "Sales sequence stages & task categories (Spec 4.8)",
        "items": [
            ("IMMEDIATE_ACK", "Immediate Acknowledgment (< 15 mins)", "তাৎক্ষণিক প্রাপ্তিস্বীকার", "#EF4444", 1, True),
            ("INITIAL_CONTACT", "Initial Contact Outreach", "প্রাথমিক যোগাযোগ", "#3B82F6", 2, False),
            ("REQUIREMENT_COLLECTION", "Requirement & Budget Collection", "চাহিদা ও বাজেট সংগ্রহ", "#06B6D4", 3, False),
            ("SITE_VISIT_SCHEDULING", "Site-Visit Scheduling", "সাইট ভিজিট নির্ধারণ", "#10B981", 4, False),
            ("POST_VISIT_FOLLOW_UP", "Post-Visit Follow-up & Shortlist", "ভিজিট পরবর্তী ফলো-আপ", "#8B5CF6", 5, False),
            ("QUOTATION_DISCUSSION", "Quotation & Payment Plan Discussion", "কোটেশন ও কিস্তি আলোচনা", "#F59E0B", 6, False),
            ("DECISION_FOLLOW_UP", "Decision & Token Booking Follow-up", "চূড়ান্ত সিদ্ধান্ত ফলো-আপ", "#EC4899", 7, False),
            ("DOCUMENT_COLLECTION", "KYC & Nominee Document Collection", "ডকুমেন্ট সংগ্রহ", "#64748B", 8, False),
            ("GENERAL_FOLLOW_UP", "General Relationship Check-in", "সাধারণ ফলো-আপ", "#64748B", 9, False),
        ],
    },
    {
        "category_code": "CRM_TASK_PRIORITY",
        "category_name": "Task Priority",
        "description": "Task urgency level (Spec 4.8)",
        "items": [
            ("LOW", "Low Priority", "নিম্ন", "#64748B", 1, False),
            ("MEDIUM", "Medium Priority", "মাঝারি", "#3B82F6", 2, True),
            ("HIGH", "High Priority", "উচ্চ", "#F59E0B", 3, False),
            ("URGENT", "Urgent / Escalated", "জরুরি / এসকেলেটেড", "#EF4444", 4, False),
        ],
    },
    {
        "category_code": "CRM_TASK_STATUS",
        "category_name": "Task Status",
        "description": "Follow-up task progress status (Spec 4.8)",
        "items": [
            ("PENDING", "Pending Action", "অপেক্ষমাণ", "#F59E0B", 1, True),
            ("IN_PROGRESS", "In Progress", "চলমান", "#3B82F6", 2, False),
            ("COMPLETED", "Completed", "সম্পন্ন", "#10B981", 3, False),
            ("OVERDUE", "Overdue Missed Follow-up", "বিলম্বিত / মিসড", "#EF4444", 4, False),
            ("CANCELLED", "Cancelled", "বাতিল", "#64748B", 5, False),
        ],
    },
    {
        "category_code": "CRM_COMMUNICATION_CHANNEL",
        "category_name": "Communication Channel",
        "description": "Omnichannel touchpoints (Spec 4.9)",
        "items": [
            ("PHONE_CALL", "Phone Call", "ফোন কল", "#3B82F6", 1, True),
            ("WHATSAPP", "WhatsApp Business", "হোয়াটসঅ্যাপ", "#10B981", 2, False),
            ("SMS", "SMS Alert", "এসএমএস", "#06B6D4", 3, False),
            ("EMAIL", "Email Message", "ইমেইল", "#8B5CF6", 4, False),
            ("OFFICE_MEETING", "In-Person Office Meeting", "অফিস মিটিং", "#F59E0B", 5, False),
            ("SITE_VISIT", "Project Site Visit", "সাইট ভিজিট", "#10B981", 6, False),
            ("WEBSITE_INQUIRY", "Website Inquiry Form", "ওয়েবসাইট ফর্ম", "#EC4899", 7, False),
            ("FACEBOOK_LEAD", "Facebook Lead Gen", "ফেসবুক লিড", "#3B82F6", 8, False),
            ("QUOTATION_SENT", "Quotation / Offer Sent", "কোটেশন প্রেরণ", "#F97316", 9, False),
            ("INTERNAL_NOTE", "Internal Staff Note", "অভ্যন্তরীণ নোট", "#64748B", 10, False),
            ("COMPLAINT_TICKET", "Customer Complaint Ticket", "অভিযোগ টিকিট", "#EF4444", 11, False),
        ],
    },
    {
        "category_code": "CRM_DELIVERY_STATUS",
        "category_name": "Delivery & Contact Status",
        "description": "Message / call transmission status (Spec 4.9)",
        "items": [
            ("DELIVERED", "Delivered", "পৌঁছেছে", "#10B981", 1, True),
            ("SENT", "Sent", "প্রেরিত", "#3B82F6", 2, False),
            ("READ", "Read / Viewed", "পঠিত", "#8B5CF6", 3, False),
            ("CONNECTED", "Call Connected", "কল সংযুক্ত", "#10B981", 4, False),
            ("MISSED", "Missed / No Answer", "উত্তর নেই", "#EF4444", 5, False),
            ("FAILED", "Failed", "ব্যর্থ", "#EF4444", 6, False),
            ("PENDING", "Pending Dispatch", "অপেক্ষমাণ", "#F59E0B", 7, False),
        ],
    },
]


async def seed_activity_lookups():
    logger.info("Seeding dynamic lookups for Specs 4.7, 4.8, 4.9...")
    async with AsyncSessionLocal() as session:
        for seed in ACTIVITY_LOOKUP_SEEDS:
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
    logger.info("Specs 4.7, 4.8, 4.9 dynamic lookups seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_activity_lookups())
