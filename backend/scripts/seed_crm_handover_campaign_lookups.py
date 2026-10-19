"""
Seed Lookups and Initial Campaigns for Spec 4.12 & 4.13.
Ensures Rule 1 (Zero hardcoded dropdowns, dynamic lookup categories).
"""
import sys
import os
import asyncio
import logging
from sqlalchemy import select
from datetime import date, datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.main
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem
from app.modules.crm.models import Campaign, MarketingTouchpoint, SuppressionEntry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LOOKUP_SEEDS = [
    {
        "category_code": "CRM_CAMPAIGN_CHANNEL",
        "category_name": "CRM Campaign Marketing Channels",
        "description": "Marketing channels for digital, offline, and exhibition campaigns",
        "items": [
            {"item_code": "FACEBOOK", "item_label": "Facebook & Instagram Ads", "sort_order": 1},
            {"item_code": "GOOGLE_ADS", "item_label": "Google Search & Display Ads", "sort_order": 2},
            {"item_code": "WEBSITE", "item_label": "Website Direct & SEO Landing Pages", "sort_order": 3},
            {"item_code": "EMAIL", "item_label": "Email Newsletter Campaigns", "sort_order": 4},
            {"item_code": "SMS", "item_label": "SMS Broadcast & Push", "sort_order": 5},
            {"item_code": "EXHIBITION", "item_label": "Real Estate Expo & Property Fairs", "sort_order": 6},
            {"item_code": "BILLBOARD", "item_label": "Outdoor Billboards & Print Media", "sort_order": 7},
            {"item_code": "BROKER_NETWORK", "item_label": "Broker & Channel Partner Network", "sort_order": 8},
            {"item_code": "WALK_IN", "item_label": "Sales Gallery Walk-in", "sort_order": 9}
        ]
    },
    {
        "category_code": "CRM_CAMPAIGN_STATUS",
        "category_name": "CRM Campaign Status",
        "description": "Lifecycle states of marketing campaigns",
        "items": [
            {"item_code": "PLANNING", "item_label": "Planning & Budget Approval", "sort_order": 1},
            {"item_code": "ACTIVE", "item_label": "Active & Live", "sort_order": 2},
            {"item_code": "PAUSED", "item_label": "Paused / Under Optimization", "sort_order": 3},
            {"item_code": "COMPLETED", "item_label": "Completed & Concluded", "sort_order": 4},
            {"item_code": "CANCELLED", "item_label": "Cancelled", "sort_order": 5}
        ]
    },
    {
        "category_code": "CRM_SUPPRESSION_REASON",
        "category_name": "CRM Lead & Buyer Suppression Reasons",
        "description": "Reasons for adding customer contacts to suppression / do-not-call lists",
        "items": [
            {"item_code": "DO_NOT_CALL", "item_label": "Do Not Call (DNC) Request", "sort_order": 1},
            {"item_code": "OPT_OUT", "item_label": "Customer Explicit Unsubscribe / Opt-Out", "sort_order": 2},
            {"item_code": "DUPLICATE_SPAM", "item_label": "Duplicate / Junk Number", "sort_order": 3},
            {"item_code": "PRIVACY_REQUEST", "item_label": "Personal Data Erasure Request", "sort_order": 4},
            {"item_code": "UNRESPONSIVE", "item_label": "Unresponsive After 10+ Attempts", "sort_order": 5}
        ]
    },
    {
        "category_code": "CRM_TOUCHPOINT_TYPE",
        "category_name": "CRM Marketing Touchpoint Types",
        "description": "Multi-touch attribution stages for buyer acquisition",
        "items": [
            {"item_code": "FIRST_TOUCH", "item_label": "First Touch (Initial Acquisition)", "sort_order": 1},
            {"item_code": "NURTURE", "item_label": "Nurture Touch (Mid-Funnel Retargeting)", "sort_order": 2},
            {"item_code": "LAST_TOUCH", "item_label": "Last Touch (Pre-Conversion)", "sort_order": 3},
            {"item_code": "CONVERSION", "item_label": "Conversion Touch (Booking Milestone)", "sort_order": 4}
        ]
    },
    {
        "category_code": "CRM_HANDOVER_DISCOUNT_STATUS",
        "category_name": "CRM Handover Discount Status",
        "description": "Approval status of price discounts requested at handover",
        "items": [
            {"item_code": "PENDING", "item_label": "Pending Director Approval", "sort_order": 1},
            {"item_code": "APPROVED", "item_label": "Approved by Sales Management", "sort_order": 2},
            {"item_code": "WAIVED", "item_label": "Waived Under Festival Promotion", "sort_order": 3},
            {"item_code": "REJECTED", "item_label": "Rejected (Full Tariff Applies)", "sort_order": 4}
        ]
    }
]

INITIAL_CAMPAIGNS = [
    {
        "campaign_code": "CMP-2026-001",
        "name": "Luxury Gulshan Penthouse & Duplex Launch",
        "channel": "FACEBOOK",
        "target_audience": "High Net-Worth Individuals (HNWI), NRB Investors, Corporate Executives",
        "allocated_budget": 500000.00,
        "actual_spend": 320000.00,
        "target_leads": 250,
        "utm_source": "facebook",
        "utm_medium": "paid_social",
        "utm_campaign": "fb_luxury_gulshan_2026",
        "utm_content": "video_walkthrough_penthouse",
        "tracking_url": "https://blueoceansbd.com/projects/gulshan-pinnacle?utm_source=facebook&utm_medium=paid_social&utm_campaign=fb_luxury_gulshan_2026",
        "landing_page_slug": "gulshan-pinnacle",
        "status": "ACTIVE",
        "start_date": date(2026, 1, 1),
        "end_date": date(2026, 12, 31),
        "notes": "Targeting premium 4BHK and penthouses with 3 basement car parkings."
    },
    {
        "campaign_code": "CMP-2026-002",
        "name": "Dhanmondi Lakefront Residences Digital Drive",
        "channel": "GOOGLE_ADS",
        "target_audience": "Families, Doctors, University Professors, Dhanmondi Natives",
        "allocated_budget": 350000.00,
        "actual_spend": 210000.00,
        "target_leads": 180,
        "utm_source": "google_ads",
        "utm_medium": "search",
        "utm_campaign": "gads_dhanmondi_lake_2026",
        "utm_content": "lakeview_flats_dhaka",
        "tracking_url": "https://blueoceansbd.com/projects/dhanmondi-lake?utm_source=google_ads&utm_medium=search&utm_campaign=gads_dhanmondi_lake_2026",
        "landing_page_slug": "dhanmondi-lake",
        "status": "ACTIVE",
        "start_date": date(2026, 2, 1),
        "end_date": date(2026, 11, 30),
        "notes": "Focused on Google Search intent for 'flat for sale dhanmondi'."
    },
    {
        "campaign_code": "CMP-2026-003",
        "name": "REHAB Winter Fair & Exhibition 2026",
        "channel": "EXHIBITION",
        "target_audience": "Walk-in buyers, Fair attendees, NRB diaspora visitors",
        "allocated_budget": 800000.00,
        "actual_spend": 750000.00,
        "target_leads": 400,
        "utm_source": "exhibition",
        "utm_medium": "offline_event",
        "utm_campaign": "rehab_winter_fair_2026",
        "tracking_url": "https://blueoceansbd.com/fair?utm_source=exhibition&utm_medium=offline_event&utm_campaign=rehab_winter_fair_2026",
        "landing_page_slug": "fair",
        "status": "COMPLETED",
        "start_date": date(2026, 1, 10),
        "end_date": date(2026, 1, 18),
        "notes": "Stall #B14-B16 at BICC Agargaon. Collected 380 paper inquiries & digital card scans."
    },
    {
        "campaign_code": "CMP-2026-004",
        "name": "NRB London & Dubai Roadshow 2026",
        "channel": "EMAIL",
        "target_audience": "Non-Resident Bangladeshis in UK, UAE, USA, Canada",
        "allocated_budget": 600000.00,
        "actual_spend": 450000.00,
        "target_leads": 200,
        "utm_source": "email_newsletter",
        "utm_medium": "email",
        "utm_campaign": "nrb_roadshow_2026",
        "tracking_url": "https://blueoceansbd.com/nrb-investors?utm_source=email_newsletter&utm_medium=email&utm_campaign=nrb_roadshow_2026",
        "landing_page_slug": "nrb-investors",
        "status": "ACTIVE",
        "start_date": date(2026, 3, 1),
        "end_date": date(2026, 12, 15),
        "notes": "NRB direct foreign currency repatriation with bank remittance incentive."
    }
]

async def seed():
    async with AsyncSessionLocal() as session:
        logger.info("Seeding Lookups for Spec 4.12 & 4.13...")
        for cat_data in LOOKUP_SEEDS:
            cat_code = cat_data["category_code"]
            q = await session.execute(select(LookupCategory).where(LookupCategory.category_code == cat_code))
            category = q.scalar_one_or_none()
            if not category:
                category = LookupCategory(
                    category_code=cat_code,
                    category_name=cat_data["category_name"],
                    description=cat_data["description"],
                    is_system_locked=True
                )
                session.add(category)
                await session.flush()
                logger.info(f"Created category: {cat_code}")

            for item_data in cat_data["items"]:
                iq = await session.execute(
                    select(LookupItem).where(
                        LookupItem.category_id == category.id,
                        LookupItem.item_code == item_data["item_code"]
                    )
                )
                existing_item = iq.scalar_one_or_none()
                if not existing_item:
                    new_item = LookupItem(
                        category_id=category.id,
                        item_code=item_data["item_code"],
                        item_name_en=item_data["item_label"],
                        item_name_bn=item_data["item_label"],
                        sort_order=item_data["sort_order"],
                        is_active=True
                    )
                    session.add(new_item)
                    logger.info(f"Added lookup item: {cat_code} -> {item_data['item_code']}")

        # Seed Initial Campaigns
        logger.info("Seeding initial marketing campaigns...")
        for camp_data in INITIAL_CAMPAIGNS:
            cq = await session.execute(select(Campaign).where(Campaign.campaign_code == camp_data["campaign_code"]))
            existing_camp = cq.scalar_one_or_none()
            if not existing_camp:
                camp = Campaign(**camp_data)
                session.add(camp)
                logger.info(f"Created campaign: {camp_data['campaign_code']} - {camp_data['name']}")

        # Seed initial suppression entry
        sq = await session.execute(select(SuppressionEntry).where(SuppressionEntry.phone == "+8801700000000"))
        if not sq.scalar_one_or_none():
            supp = SuppressionEntry(
                phone="+8801700000000",
                email="dnc_sample@blueoceansbd.com",
                customer_name="Sample DNC Contact",
                suppression_reason="DO_NOT_CALL",
                source_note="Customer requested exclusion from telemarketing campaigns on 15 Jan 2026",
                is_active=True
            )
            session.add(supp)

        await session.commit()
        logger.info("Lookup and Campaign seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
