import asyncio
import logging
from sqlalchemy import text
from app.core.database import engine, Base
import app.modules.crm.models
from app.modules.crm.models import Lead, LeadActivity, Customer, Nominee
from app.modules.projects.models import Project
from app.modules.auth.models import User
from sqlalchemy.future import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_crm")

async def seed_crm_data():
    logger.info("Initializing database schema for CRM tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        # Check if leads exist
        lead_check = await session.execute(select(Lead))
        if lead_check.scalars().first():
            logger.info("CRM data already seeded. Skipping.")
            return

        # Fetch projects and sales reps for foreign keys
        proj_res = await session.execute(select(Project).order_by(Project.id.asc()))
        projects = proj_res.scalars().all()
        proj_1 = projects[0].id if len(projects) > 0 else None
        proj_2 = projects[1].id if len(projects) > 1 else proj_1

        user_res = await session.execute(select(User).order_by(User.id.asc()))
        users = user_res.scalars().all()
        user_1 = users[0].id if len(users) > 0 else None
        user_2 = users[1].id if len(users) > 1 else user_1

        logger.info(f"Using Project IDs: {proj_1}, {proj_2}; Sales Rep IDs: {user_1}, {user_2}")

        # 1. Seed CRM Leads across stages
        sample_leads = [
            Lead(
                lead_source_id="FACEBOOK_ADS",
                campaign_name="Gulshan-Heights-Q4-Luxury",
                lead_name="Barrister Rafiqul Islam",
                primary_phone="+8801711223344",
                email="rafiqul.islam@supremecourt.gov.bd",
                interested_project_id=proj_1,
                budget_range_min=25000000.00,
                budget_range_max=35000000.00,
                assigned_sales_rep_id=user_1,
                lead_stage="NEW",
                lead_score=85,
                notes="Inquired via Facebook Lead Gen Form for 4-Bed Duplex."
            ),
            Lead(
                lead_source_id="WHATSAPP",
                campaign_name="Direct-Inbound-WhatsApp",
                lead_name="Dr. Shireen Akhter",
                primary_phone="+8801819988776",
                email="shireen.akhter@squarehospital.com",
                interested_project_id=proj_1,
                budget_range_min=18000000.00,
                budget_range_max=22000000.00,
                assigned_sales_rep_id=user_2,
                lead_stage="CONTACTED",
                lead_score=75,
                notes="Initial phone discussion done. Requested South-facing floor layout brochure."
            ),
            Lead(
                lead_source_id="WALK_IN",
                campaign_name="Corporate-Headquarters-Walkin",
                lead_name="Engr. Maksudul Haque",
                primary_phone="+8801914556677",
                email="maksudul.haque@petrobangla.gov.bd",
                interested_project_id=proj_2,
                budget_range_min=14000000.00,
                budget_range_max=18000000.00,
                assigned_sales_rep_id=user_1,
                lead_stage="VISITED",
                lead_score=90,
                notes="Completed physical site visit on Saturday with family. Very interested in Floor 8 Unit A."
            ),
            Lead(
                lead_source_id="BROKER",
                campaign_name="Uttara-Elite-Channel-Partner",
                lead_name="Mr. Tariq Ahmed",
                primary_phone="+8801730445566",
                email="tariq.ahmed@bproperty-partner.com",
                interested_project_id=proj_2,
                budget_range_min=15000000.00,
                budget_range_max=19000000.00,
                assigned_sales_rep_id=user_2,
                lead_stage="NEGOTIATION",
                lead_score=95,
                notes="Drafting payment schedule. Negotiating 5% cash payment discount."
            ),
            Lead(
                lead_source_id="WEB_FORM",
                campaign_name="Website-Inquiry-Portal",
                lead_name="Mrs. Sultana Parveen",
                primary_phone="+8801612334455",
                email="sultana.parveen@gmail.com",
                interested_project_id=proj_1,
                budget_range_min=30000000.00,
                budget_range_max=40000000.00,
                assigned_sales_rep_id=user_1,
                lead_stage="BOOKED",
                lead_score=100,
                notes="Token advance received BDT 1,000,000 via Pay Order. Allotted Unit T1-12A."
            ),
            Lead(
                lead_source_id="FACEBOOK_ADS",
                campaign_name="Gulshan-Heights-Q4-Luxury",
                lead_name="Mohammad Kamal Hossain",
                primary_phone="+8801755112233",
                email="kamal.hossain@yahoo.com",
                interested_project_id=proj_1,
                budget_range_min=8000000.00,
                budget_range_max=10000000.00,
                assigned_sales_rep_id=user_2,
                lead_stage="DROPPED",
                lead_score=20,
                notes="Budget mismatch. Customer looking for sub-10M apartments outside Gulshan."
            )
        ]

        session.add_all(sample_leads)
        await session.flush()

        # 2. Add sample activities to the leads
        activities = [
            LeadActivity(
                lead_id=sample_leads[0].id,
                sales_rep_id=user_1,
                activity_type="PHONE_CALL",
                activity_summary="Outbound intro call: Customer asked for project e-brochure over WhatsApp.",
                outcome="INTERESTED"
            ),
            LeadActivity(
                lead_id=sample_leads[1].id,
                sales_rep_id=user_2,
                activity_type="WHATSAPP",
                activity_summary="Shared floor plan diagrams and elevation renders.",
                outcome="PENDING_REVIEW"
            ),
            LeadActivity(
                lead_id=sample_leads[2].id,
                sales_rep_id=user_1,
                activity_type="SITE_VISIT",
                activity_summary="Accompanied client to Uttara Sector 3 site. Inspected sample show flat.",
                outcome="VISITED_POSITIVE"
            ),
            LeadActivity(
                lead_id=sample_leads[3].id,
                sales_rep_id=user_2,
                activity_type="OFFICE_MEETING",
                activity_summary="Negotiation meeting in Head Office Boardroom on installment tenure.",
                outcome="AGREED_ON_TERMS"
            ),
            LeadActivity(
                lead_id=sample_leads[4].id,
                sales_rep_id=user_1,
                activity_type="STAGE_CHANGE",
                activity_summary="Converted to verified buyer. Booking token finalized.",
                outcome="BOOKED"
            )
        ]
        session.add_all(activities)

        # 3. Seed KYC Customer Profiles and Nominees
        customer_1 = Customer(
            customer_code="CUST-2026-0001",
            full_name_en="Mrs. Sultana Parveen",
            full_name_bn="মোসাঃ সুলতানা পারভীন",
            father_husband_name="Late Golam Mostafa",
            mother_name="Begum Rokeya Banu",
            nid_number="19822695500001234",
            tin_number="789012345678",
            primary_phone="+8801612334455",
            email="sultana.parveen@gmail.com",
            present_address="House 42, Road 11, Block D, Banani, Dhaka-1213",
            permanent_address="Village: Alipur, PO: Faridpur Sadar, District: Faridpur",
            is_nrb=False,
            profile_photo_url="assets/images/auth/avatar-default.png"
        )
        session.add(customer_1)
        await session.flush()

        nominee_1 = Nominee(
            customer_id=customer_1.id,
            nominee_name="Tanvir Mostafa",
            relation_type="SON",
            nid_number="19992695500005678",
            share_percentage=60.00
        )
        nominee_2 = Nominee(
            customer_id=customer_1.id,
            nominee_name="Tahmina Mostafa",
            relation_type="DAUGHTER",
            nid_number="20032695500009999",
            share_percentage=40.00
        )
        session.add_all([nominee_1, nominee_2])

        customer_2 = Customer(
            customer_code="CUST-2026-0002",
            full_name_en="Engr. Kazi Masudul Alam",
            full_name_bn="প্রকৌঃ কাজী মাসুদুল আলম",
            father_husband_name="Kazi Shamsul Alam",
            mother_name="Nazma Begum",
            nid_number="19752695500009876",
            tin_number="654321098765",
            primary_phone="+8801713009988",
            email="masudul.alam@exxonmobil.com",
            present_address="Al-Reem Tower, Corniche, Doha, Qatar",
            permanent_address="House 15, Road 4, Sector 7, Uttara, Dhaka-1230",
            is_nrb=True,
            passport_number="BW0982341",
            profile_photo_url="assets/images/auth/avatar-default.png"
        )
        session.add(customer_2)
        await session.flush()

        nominee_3 = Nominee(
            customer_id=customer_2.id,
            nominee_name="Sabrina Masud",
            relation_type="SPOUSE",
            nid_number="19802695500004321",
            share_percentage=100.00
        )
        session.add(nominee_3)

        await session.commit()
        logger.info("Successfully seeded CRM leads, activities, customers, and nominee records!")

if __name__ == "__main__":
    asyncio.run(seed_crm_data())
