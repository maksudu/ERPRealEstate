import asyncio
import logging
import os
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.abspath("backend"))

from sqlalchemy import text, select, func
from sqlalchemy.orm import selectinload
from app.core.database import engine, Base, AsyncSessionLocal
import app.modules.lookups.models
import app.modules.auth.models
import app.modules.projects.models
import app.modules.construction.models
import app.modules.procurement.models
import app.modules.accounts.models
import app.modules.inventory.models
import app.modules.crm.models
import app.modules.sales.models
import app.modules.installments.models
import app.modules.governance.models

from app.modules.lookups.models import LookupCategory, LookupItem
from app.modules.auth.models import User
from app.modules.projects.models import Project
from app.modules.inventory.models import Unit
from app.modules.crm.models import Lead, LeadActivity, Customer, Nominee
from app.modules.sales.models import Booking, BookingJointBuyer
from app.modules.installments.models import CustomerInstallment, InstallmentAlertLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_crm_sales_engine")

LOOKUP_SEEDS = [
    {
        "category_code": "CRM_LEAD_SOURCE",
        "category_name": "CRM Lead Ingestion Channels",
        "description": "Omnichannel lead sources under Prompt 09",
        "items": [
            {"code": "FACEBOOK_ADS", "name_en": "Facebook Lead Ads Webhook", "name_bn": "ফেসবুক লিড বিজ্ঞাপন", "badge": "#2563EB", "sort": 1, "default": True},
            {"code": "WEB_FORM", "name_en": "Website Contact Inquiry Form", "name_bn": "ওয়েবসাইট অনুসন্ধান ফর্ম", "badge": "#059669", "sort": 2, "default": False},
            {"code": "WALK_IN", "name_en": "Walk-In Corporate Visitor", "name_bn": "সরাসরি ভিজিটর (ওয়াক-ইন)", "badge": "#D97706", "sort": 3, "default": False},
            {"code": "WHATSAPP", "name_en": "WhatsApp Inbound Business Chat", "name_bn": "হোয়াটসঅ্যাপ চ্যাট", "badge": "#10B981", "sort": 4, "default": False},
            {"code": "BROKER", "name_en": "Authorized Real Estate Channel Broker", "name_bn": "অনুমোদিত ব্রোকার", "badge": "#8B5CF6", "sort": 5, "default": False},
            {"code": "REFERRAL", "name_en": "Existing Customer Referral", "name_bn": "গ্রাহক রেফারেল", "badge": "#06B6D4", "sort": 6, "default": False},
        ]
    },
    {
        "category_code": "CRM_LEAD_STAGE",
        "category_name": "Sales Pipeline Stages",
        "description": "Standard 7-stage sales funnel under Prompt 09",
        "items": [
            {"code": "NEW", "name_en": "New Lead", "name_bn": "নতুন লিড", "badge": "#3B82F6", "sort": 1, "default": True},
            {"code": "CONTACTED", "name_en": "Contacted", "name_bn": "যোগাযোগকৃত", "badge": "#F59E0B", "sort": 2, "default": False},
            {"code": "SITE_VISIT_SCHEDULED", "name_en": "Site Visit Scheduled", "name_bn": "সাইট ভিজিট নির্ধারিত", "badge": "#8B5CF6", "sort": 3, "default": False},
            {"code": "SITE_VISIT_COMPLETED", "name_en": "Site Visit Completed", "name_bn": "সাইট ভিজিট সম্পন্ন", "badge": "#10B981", "sort": 4, "default": False},
            {"code": "NEGOTIATION", "name_en": "Negotiation", "name_bn": "দরকষাকষি / খসড়া", "badge": "#EA580C", "sort": 5, "default": False},
            {"code": "TOKEN_BOOKED", "name_en": "Token Booked", "name_bn": "টোকেন বুকড / ফাইনাল", "badge": "#059669", "sort": 6, "default": False},
            {"code": "LOST", "name_en": "Lost / Disqualified", "name_bn": "বাতিল / ড্রপড", "badge": "#64748B", "sort": 7, "default": False},
        ]
    },
    {
        "category_code": "RELATION_TYPE",
        "category_name": "Joint-Buyer & Nominee Relationship",
        "description": "Legal family and business partner relations under REHAB norms",
        "items": [
            {"code": "SPOUSE", "name_en": "Spouse (Husband / Wife)", "name_bn": "স্ত্রী / স্বামী", "badge": "#EC4899", "sort": 1, "default": True},
            {"code": "SON", "name_en": "Son", "name_bn": "পুত্র", "badge": "#3B82F6", "sort": 2, "default": False},
            {"code": "DAUGHTER", "name_en": "Daughter", "name_bn": "কন্যা", "badge": "#8B5CF6", "sort": 3, "default": False},
            {"code": "FATHER", "name_en": "Father", "name_bn": "পিতা", "badge": "#64748B", "sort": 4, "default": False},
            {"code": "MOTHER", "name_en": "Mother", "name_bn": "মাতা", "badge": "#F59E0B", "sort": 5, "default": False},
            {"code": "BROTHER", "name_en": "Brother", "name_bn": "ভাই", "badge": "#0284C7", "sort": 6, "default": False},
            {"code": "BUSINESS_PARTNER", "name_en": "Co-Investor / Business Partner", "name_bn": "ব্যবসায়িক অংশীদার", "badge": "#10B981", "sort": 7, "default": False},
        ]
    },
    {
        "category_code": "INSTALLMENT_PLAN_TYPE",
        "category_name": "Installment Schedule Plans",
        "description": "Milestone and EMI payment schedules under Prompt 09",
        "items": [
            {"code": "CONSTRUCTION_MILESTONE", "name_en": "Milestone-Linked Schedule", "name_bn": "নির্মাণ মাইলফলক ভিত্তিক", "badge": "#10B981", "sort": 1, "default": True},
            {"code": "EQUAL_MONTHLY_EMI", "name_en": "Equal Monthly Installment (EMI)", "name_bn": "সমান মাসিক কিস্তি (ইএমআই)", "badge": "#3B82F6", "sort": 2, "default": False},
            {"code": "QUARTERLY_EMI", "name_en": "Quarterly Installments", "name_bn": "ত্রৈমাসিক কিস্তি", "badge": "#F59E0B", "sort": 3, "default": False},
            {"code": "CUSTOM_MILESTONE", "name_en": "Custom Milestone Allocation", "name_bn": "কাস্টম মাইলফলক বণ্টন", "badge": "#8B5CF6", "sort": 4, "default": False},
        ]
    },
    {
        "category_code": "NOTIFICATION_CHANNEL",
        "category_name": "Governance & Alert Notification Channels",
        "description": "SMS, WhatsApp, Email, and Push notification channels",
        "items": [
            {"code": "SMS", "name_en": "SMS Mobile Gateway (SSL Wireless / Infobip)", "name_bn": "এসএমএস এলার্ট", "badge": "#10B981", "sort": 1, "default": True},
            {"code": "WHATSAPP", "name_en": "WhatsApp Business Cloud API", "name_bn": "হোয়াটসঅ্যাপ মেসেজ", "badge": "#22C55E", "sort": 2, "default": False},
            {"code": "EMAIL", "name_en": "Email Dispatch (SendGrid / AWS SES)", "name_bn": "ইমেইল নোটিফিকেশন", "badge": "#3B82F6", "sort": 3, "default": False},
            {"code": "WEB_PUSH", "name_en": "In-App Real-Time Web Push", "name_bn": "ওয়েব পুশ নোটিফিকেশন", "badge": "#F59E0B", "sort": 4, "default": False},
        ]
    }
]

async def migrate_and_seed():
    logger.info("Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Alter tables to ensure new columns exist if tables pre-existed
        logger.info("Verifying schema columns...")
        try:
            await conn.execute(text("ALTER TABLE sls_bookings ADD COLUMN IF NOT EXISTS parking_charge NUMERIC(14, 2) NOT NULL DEFAULT 0.00;"))
            await conn.execute(text("ALTER TABLE sls_bookings ADD COLUMN IF NOT EXISTS utility_charge NUMERIC(14, 2) NOT NULL DEFAULT 0.00;"))
            await conn.execute(text("ALTER TABLE sls_bookings ADD COLUMN IF NOT EXISTS documentation_charge NUMERIC(14, 2) NOT NULL DEFAULT 0.00;"))
            await conn.execute(text("ALTER TABLE sls_bookings ADD COLUMN IF NOT EXISTS parking_slot_number VARCHAR(64) NULL;"))
            await conn.execute(text("ALTER TABLE sls_bookings ADD COLUMN IF NOT EXISTS governance_request_id BIGINT NULL;"))
        except Exception as e:
            logger.info(f"Booking alter note: {e}")

        try:
            await conn.execute(text("ALTER TABLE sls_customer_installments ADD COLUMN IF NOT EXISTS surcharge_percentage NUMERIC(5, 2) NOT NULL DEFAULT 2.00;"))
            await conn.execute(text("ALTER TABLE sls_customer_installments ADD COLUMN IF NOT EXISTS overdue_days INT NOT NULL DEFAULT 0;"))
            await conn.execute(text("ALTER TABLE sls_customer_installments ADD COLUMN IF NOT EXISTS sms_alert_sent BOOLEAN NOT NULL DEFAULT FALSE;"))
            await conn.execute(text("ALTER TABLE sls_customer_installments ADD COLUMN IF NOT EXISTS whatsapp_alert_sent BOOLEAN NOT NULL DEFAULT FALSE;"))
            await conn.execute(text("ALTER TABLE sls_customer_installments ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMP NULL;"))
        except Exception as e:
            logger.info(f"CustomerInstallment alter note: {e}")

    async with AsyncSessionLocal() as session:
        # Seed Lookup Categories and Items
        for seed_cat in LOOKUP_SEEDS:
            cat_code = seed_cat["category_code"]
            existing = await session.execute(select(LookupCategory).where(LookupCategory.category_code == cat_code))
            cat = existing.scalars().first()
            if not cat:
                cat = LookupCategory(
                    category_code=cat_code,
                    category_name=seed_cat["category_name"],
                    description=seed_cat["description"],
                    is_system_locked=True
                )
                session.add(cat)
                await session.flush()
                logger.info(f"Created lookup category: {cat_code}")

            for it in seed_cat["items"]:
                it_code = it["code"]
                item_exists = await session.execute(
                    select(LookupItem).where(LookupItem.category_id == cat.id, LookupItem.item_code == it_code)
                )
                if not item_exists.scalars().first():
                    new_item = LookupItem(
                        category_id=cat.id,
                        item_code=it_code,
                        item_name_en=it["name_en"],
                        item_name_bn=it["name_bn"],
                        color_badge=it["badge"],
                        sort_order=it["sort"],
                        is_default=it["default"],
                        is_active=True
                    )
                    session.add(new_item)

        await session.commit()
        logger.info("Lookup categories and items seeded successfully.")

        # Seed CRM Leads across Prompt 09 stages if none exist
        user_res = await session.execute(select(User).order_by(User.id.asc()))
        users = user_res.scalars().all()
        user_1 = users[0].id if users else None
        user_2 = users[1].id if len(users) > 1 else user_1

        proj_res = await session.execute(select(Project).order_by(Project.id.asc()))
        projects = proj_res.scalars().all()
        proj_1 = projects[0].id if projects else None
        proj_2 = projects[1].id if len(projects) > 1 else proj_1

        leads_count_res = await session.execute(select(func.count(Lead.id)))
        if (leads_count_res.scalar() or 0) < 5:
            sample_leads = [
                Lead(
                    lead_source_id="FACEBOOK_ADS",
                    campaign_name="FB-Gulshan-Luxury-Q4",
                    lead_name="Barrister Mahbubur Rahman",
                    primary_phone="+8801711998877",
                    email="m.rahman@dhakachamber.org",
                    interested_project_id=proj_1,
                    budget_range_min=25000000.0,
                    budget_range_max=35000000.0,
                    assigned_sales_rep_id=user_1,
                    lead_stage="NEW",
                    lead_score=85,
                    notes="Inquired via Facebook Lead Ads for 3000 sft North-East duplex."
                ),
                Lead(
                    lead_source_id="WEB_FORM",
                    campaign_name="Website-Gulshan-Prelaunch",
                    lead_name="Dr. Farzana Choudhury",
                    primary_phone="+8801819334455",
                    email="farzana.choudhury@evercare.bd",
                    interested_project_id=proj_1,
                    budget_range_min=18000000.0,
                    budget_range_max=24000000.0,
                    assigned_sales_rep_id=user_2,
                    lead_stage="CONTACTED",
                    lead_score=75,
                    notes="Requested floor plan brochure and parking slot pricing."
                ),
                Lead(
                    lead_source_id="WALK_IN",
                    campaign_name="Corporate-HQ-Walkin",
                    lead_name="Engr. Tariqul Anam",
                    primary_phone="+8801912445566",
                    email="tariqul.anam@buet.ac.bd",
                    interested_project_id=proj_2,
                    budget_range_min=14000000.0,
                    budget_range_max=19000000.0,
                    assigned_sales_rep_id=user_1,
                    lead_stage="SITE_VISIT_SCHEDULED",
                    lead_score=80,
                    notes="Site visit scheduled for upcoming Saturday at 11:00 AM."
                ),
                Lead(
                    lead_source_id="WHATSAPP",
                    campaign_name="WhatsApp-Inbound-Direct",
                    lead_name="Mr. Kamal Hossain",
                    primary_phone="+8801730221144",
                    email="kamal.hossain@apexfootwear.com",
                    interested_project_id=proj_1,
                    budget_range_min=22000000.0,
                    budget_range_max=28000000.0,
                    assigned_sales_rep_id=user_2,
                    lead_stage="SITE_VISIT_COMPLETED",
                    lead_score=90,
                    notes="Site visit completed with architect spouse. Shortlisted Unit 7B."
                ),
                Lead(
                    lead_source_id="BROKER",
                    campaign_name="Channel-Partner-Banani",
                    lead_name="Mrs. Sultana Razia",
                    primary_phone="+8801611002233",
                    email="sultana.razia@bproperty.com",
                    interested_project_id=proj_2,
                    budget_range_min=15000000.0,
                    budget_range_max=20000000.0,
                    assigned_sales_rep_id=user_1,
                    lead_stage="NEGOTIATION",
                    lead_score=95,
                    notes="Negotiating 2.5% discount and custom 36-month installment milestone schedule."
                )
            ]
            for l in sample_leads:
                session.add(l)
                await session.flush()
                act = LeadActivity(
                    lead_id=l.id,
                    sales_rep_id=l.assigned_sales_rep_id,
                    activity_type="STAGE_CHANGE",
                    activity_summary=f"Lead moved into pipeline stage {l.lead_stage}.",
                    outcome="PROGRESSION"
                )
                session.add(act)
            await session.commit()
            logger.info("Sample CRM leads seeded across pipeline stages.")

        # Seed realistic Joint Buyer & Pricing breakdown on existing or new Booking
        booking_res = await session.execute(select(Booking).order_by(Booking.id.asc()))
        bookings = booking_res.scalars().all()
        if bookings:
            sample_booking = bookings[0]
            # Ensure pricing breakdown values are filled
            sample_booking.parking_charge = 800000.00
            sample_booking.utility_charge = 450000.00
            sample_booking.documentation_charge = 250000.00
            sample_booking.parking_slot_number = "BASEMENT-1-B04"
            sample_booking.final_contract_value = (
                float(sample_booking.base_unit_price or 15000000.0) +
                800000.00 + 450000.00 + 250000.00 -
                float(sample_booking.discount_amount or 0.0)
            )

            # Check if joint buyer exists
            jb_check = await session.execute(
                select(BookingJointBuyer).where(BookingJointBuyer.booking_id == sample_booking.id)
            )
            if not jb_check.scalars().first():
                joint_buyer = BookingJointBuyer(
                    booking_id=sample_booking.id,
                    full_name_en="Nasreen Sultana Rahman",
                    full_name_bn="নাসরিন সুলতানা রহমান",
                    nid_number="19842692233000045",
                    passport_number="A04882199",
                    tin_number="8832991023",
                    primary_phone="+8801711223399",
                    email="nasreen.rahman@dhakachamber.org",
                    present_address="House 14, Road 7, Block F, Banani, Dhaka-1213",
                    relation_to_primary="SPOUSE",
                    share_percentage=50.00
                )
                session.add(joint_buyer)
                logger.info(f"Added joint buyer to booking {sample_booking.booking_reference_no}")

            await session.commit()

        # Seed sample Installment Alerts and Surcharges on overdue installments
        inst_res = await session.execute(
            select(CustomerInstallment)
            .options(selectinload(CustomerInstallment.booking).selectinload(Booking.customer))
            .where(CustomerInstallment.payable_amount > CustomerInstallment.paid_amount)
        )
        unpaid_insts = inst_res.scalars().all()
        if unpaid_insts:
            overdue_sample = unpaid_insts[0]
            overdue_sample.due_date = date.today() - timedelta(days=45)
            overdue_sample.grace_period_days = 15
            overdue_sample.overdue_days = 30
            overdue_sample.surcharge_percentage = 2.00
            overdue_sample.late_fee_accrued = round(float(overdue_sample.payable_amount) * 0.02, 2)
            overdue_sample.status = "OVERDUE"
            overdue_sample.sms_alert_sent = True
            overdue_sample.whatsapp_alert_sent = True
            overdue_sample.last_alert_sent_at = datetime.utcnow()

            # Create sample alert logs
            sms_log = InstallmentAlertLog(
                installment_id=overdue_sample.id,
                booking_id=overdue_sample.booking_id,
                customer_id=overdue_sample.booking.primary_customer_id if overdue_sample.booking else 1,
                channel="SMS",
                recipient_phone="+8801711998877",
                recipient_email="allottee@dhakachamber.org",
                message_content=(
                    f"Urgent Notice: Dear Allottee, installment #{overdue_sample.installment_no} ({overdue_sample.title}) "
                    f"of BDT {overdue_sample.payable_amount:,.2f} is OVERDUE by 30 days. Late fee accrued: BDT {overdue_sample.late_fee_accrued:,.2f}. "
                    f"Please remit to BlueOceans Real Estate Ltd."
                ),
                status="SENT"
            )
            whatsapp_log = InstallmentAlertLog(
                installment_id=overdue_sample.id,
                booking_id=overdue_sample.booking_id,
                customer_id=overdue_sample.booking.primary_customer_id if overdue_sample.booking else 1,
                channel="WHATSAPP",
                recipient_phone="+8801711998877",
                recipient_email="allottee@dhakachamber.org",
                message_content=(
                    f"Payment Alert: Installment #{overdue_sample.installment_no} is overdue. "
                    f"Direct Pay Link: https://erp.blueoceansbd.com/pay/{overdue_sample.id}"
                ),
                status="DELIVERED"
            )
            session.add(sms_log)
            session.add(whatsapp_log)
            await session.commit()
            logger.info("Seeded sample overdue surcharge and dispatched SMS/WhatsApp alert logs.")

    logger.info("Migration & seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_and_seed())
