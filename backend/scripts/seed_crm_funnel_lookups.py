"""
Seed script for Spec 4.11: Sales Funnel and Lead Conversion.
Populates dynamic lookups in LookupCategory/LookupItem and
populates default configurable funnel stages in crm_funnel_stages.
"""
import sys
import os
import asyncio
import logging
from sqlalchemy import select, text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main
from app.core.database import AsyncSessionLocal, engine
from app.modules.lookups.models import LookupCategory, LookupItem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LOOKUP_SEEDS = [
    {
        "category_code": "CRM_FUNNEL_STAGE",
        "category_name": "Sales Funnel Stages",
        "description": "Standard 7-stage sales funnel progression from inquiry to booking (Spec 4.11)",
        "items": [
            ("01_NEW_LEAD", "01 New Lead (Validated)", "নতুন লিড", "#3B82F6", 1, True),
            ("02_CONTACTED", "02 Contacted & Engaged", "যোগাযোগ সম্পন্ন", "#06B6D4", 2, False),
            ("03_QUALIFIED", "03 Qualified Buyer", "যোগ্য ক্রেতা", "#8B5CF6", 3, False),
            ("04_SITE_VISIT", "04 Site Visit / Showroom", "সাইট ভিজিট", "#EC4899", 4, False),
            ("05_NEGOTIATION", "05 Interested / Negotiation", "দরকষাকষি", "#F59E0B", 5, False),
            ("06_QUOTATION", "06 Quotation / Proposal", "প্রস্তাবনা পাঠানো", "#10B981", 6, False),
            ("07_BOOKING", "07 Booking Handover", "বুকিং হস্তান্তর", "#059669", 7, False),
            ("LOST", "Lost / Disqualified", "বাতিল", "#EF4444", 8, False)
        ]
    },
    {
        "category_code": "CRM_LOST_REASON",
        "category_name": "Lead Loss & Disqualification Reasons",
        "description": "Root causes captured when leads or opportunities are marked lost (Spec 4.11)",
        "items": [
            ("BUDGET_MISMATCH", "Budget Mismatch / Unaffordable", "বাজেট অমিল", "#EF4444", 1, True),
            ("LOCATION_UNSUITABLE", "Location / Neighborhood Unsuitable", "অবস্থান অনুপযুক্ত", "#F59E0B", 2, False),
            ("COMPETITOR_CHOSEN", "Chose Competitor Developer", "প্রতিযোগী বেছে নিয়েছে", "#64748B", 3, False),
            ("FINANCING_REJECTED", "Bank Loan / Financing Disapproved", "ঋণ বাতিল", "#DC2626", 4, False),
            ("PURCHASE_DEFERRED", "Postponed Purchase Decision", "ক্রয় স্থগিত", "#8B5CF6", 5, False),
            ("DECISION_MAKER_UNAVAILABLE", "Family / Partner Disagreement", "সিদ্ধান্তহীনতা", "#3B82F6", 6, False),
            ("UNIT_UNAVAILABLE", "Desired Unit / Floor Unavailable", "পছন্দের ফ্ল্যাট নেই", "#10B981", 7, False),
            ("OTHER", "Other Regulatory / Personal Reason", "অন্যান্য কারণ", "#94A3B8", 8, False)
        ]
    },
    {
        "category_code": "CRM_HANDOVER_STATUS",
        "category_name": "Booking Handover Lifecycle Status",
        "description": "Status of commercial handover from sales representative to sales operations (Spec 4.11)",
        "items": [
            ("PENDING_SALES_OPS", "Pending Sales Ops Review", "অপারেশনস পর্যালোচনার অপেক্ষায়", "#F59E0B", 1, True),
            ("ACCEPTED_BY_OPS", "Accepted by Operations", "অপারেশনস দ্বারা গৃহীত", "#3B82F6", 2, False),
            ("BOOKING_CREATED", "Sales Booking Executed", "বিক্রয় বুকিং সম্পন্ন", "#10B981", 3, False),
            ("REJECTED", "Handover Returned / Rejected", "প্রত্যাখ্যাত", "#EF4444", 4, False)
        ]
    }
]

FUNNEL_STAGES_DATA = [
    (
        "01_NEW_LEAD", "New Lead", 1,
        "Inquiry captured and validated across digital, walk-in, broker or campaign channels",
        "Valid phone number & customer identity recorded",
        "First contact attempted by assigned sales rep within SLA",
        1, "#3b82f6"
    ),
    (
        "02_CONTACTED", "Contacted", 2,
        "Initial communication completed and lead engaged",
        "Phone call, WhatsApp, or email interaction established",
        "Customer agrees to discuss property requirements & budget",
        2, "#06b6d4"
    ),
    (
        "03_QUALIFIED", "Qualified", 3,
        "Budget, preferences, and purchase timeline thoroughly assessed",
        "Financing capability, project preference, and decision maker identified",
        "Site visit or physical/virtual presentation scheduled",
        3, "#8b5cf6"
    ),
    (
        "04_SITE_VISIT", "Site Visit / Meeting", 4,
        "Property options evaluated through project site visit or show-apartment walk",
        "Customer attends scheduled site visit or office meeting",
        "Customer feedback captured and units shortlisted",
        4, "#ec4899"
    ),
    (
        "05_NEGOTIATION", "Interested / Negotiation", 5,
        "Unit selection, commercial terms, and price concessions discussed",
        "Specific unit identified with price proposal requested",
        "Commercial concession / discount level agreed and authorized",
        5, "#f59e0b"
    ),
    (
        "06_QUOTATION", "Quotation / Proposal", 6,
        "Official commercial proposal and installment schedule shared with customer",
        "Approved quotation generated and delivered",
        "Customer accepts terms and commits booking advance",
        3, "#10b981"
    ),
    (
        "07_BOOKING", "Booking", 7,
        "Booking accepted and recorded; ready for handover to sales operations",
        "Customer signs booking reservation form and deposits booking money",
        "Handover record submitted to Sales Operations for legal contract execution",
        2, "#059669"
    )
]

async def seed_data():
    logger.info("Seeding Lookups & Configurable Stages for Spec 4.11...")
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
                if not item_res.scalars().first():
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

    # Seed crm_funnel_stages default rows
    async with engine.begin() as conn:
        for sc, sn, so, desc, entry, exit_crit, dwell, col in FUNNEL_STAGES_DATA:
            res_stg = await conn.execute(
                text("SELECT id FROM crm_funnel_stages WHERE stage_code = :sc"),
                {"sc": sc}
            )
            if not res_stg.fetchone():
                await conn.execute(
                    text("""
                    INSERT INTO crm_funnel_stages (
                        stage_code, stage_name, stage_order, description,
                        entry_criteria, exit_criteria, target_dwell_days, color_code,
                        is_system_stage, is_active
                    ) VALUES (
                        :sc, :sn, :so, :desc, :entry, :exit_crit, :dwell, :col, TRUE, TRUE
                    )
                    """),
                    {
                        "sc": sc, "sn": sn, "so": so, "desc": desc,
                        "entry": entry, "exit_crit": exit_crit, "dwell": dwell, "col": col
                    }
                )
                logger.info(f"Created funnel stage: {sn} ({sc})")

    logger.info("Spec 4.11 lookups and default funnel stages seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
