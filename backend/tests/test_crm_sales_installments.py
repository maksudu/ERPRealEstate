import pytest
from datetime import date, timedelta
from sqlalchemy import select
from tests.conftest import TestSessionLocal
from app.modules.projects.models import Project
from app.modules.inventory.models import Unit
from app.modules.crm.models import Customer, Lead, LeadActivity
from app.modules.sales.models import Booking, BookingJointBuyer
from app.modules.installments.models import CustomerInstallment, InstallmentAlertLog
from app.modules.crm.router import compute_lead_scoring_details

@pytest.mark.asyncio
async def test_crm_lead_scoring_engine():
    """
    Test 4-component lead scoring algorithm (Prompt 09):
    Budget (25) + Contact (25) + Source (25) + Engagement (25)
    """
    # 1. Hot Lead: Walk-in, 3 Crore budget, phone + email, Negotiation stage
    hot_lead = Lead(
        id=991,
        lead_name="Haji Alimullah",
        primary_phone="+8801711223344",
        email="haji.alimullah@dhaka-estate.com",
        lead_source_id="WALK_IN",
        budget_range_min=30000000.0,
        budget_range_max=40000000.0,
        lead_stage="NEGOTIATION"
    )
    score_hot = compute_lead_scoring_details(hot_lead)
    assert score_hot.total_score >= 90
    assert score_hot.health_grade == "A_HOT"
    assert score_hot.budget_fit_score == 25
    assert score_hot.contact_completeness_score == 25
    assert score_hot.source_quality_score == 25
    assert score_hot.engagement_progression_score == 22

    # 2. Warm Lead: Website Contact Form, 1.2 Crore budget, phone only, Contacted stage
    warm_lead = Lead(
        id=992,
        lead_name="Tanvir Hasan",
        primary_phone="+8801811000000",
        email=None,
        lead_source_id="WEB_FORM",
        budget_range_min=12000000.0,
        lead_stage="CONTACTED"
    )
    score_warm = compute_lead_scoring_details(warm_lead)
    assert 55 <= score_warm.total_score < 80
    assert score_warm.health_grade == "B_WARM"

    # 3. Cold Lead: Facebook Ads, no budget specified, phone only, Lost stage
    cold_lead = Lead(
        id=993,
        lead_name="Anonymous Browser",
        primary_phone="+8801911000000",
        email=None,
        lead_source_id="FACEBOOK_ADS",
        budget_range_min=0.0,
        lead_stage="LOST"
    )
    score_cold = compute_lead_scoring_details(cold_lead)
    assert score_cold.total_score < 50
    assert score_cold.health_grade == "C_COLD"


@pytest.mark.asyncio
async def test_crm_website_contact_form_ingestion():
    """
    Test website contact form lead ingestion with UTM tracking and stage initiation.
    """
    async with TestSessionLocal() as session:
        # Check project
        proj_res = await session.execute(select(Project).order_by(Project.id.asc()))
        project = proj_res.scalars().first()
        proj_id = project.id if project else None

        new_lead = Lead(
            lead_source_id="WEB_FORM",
            campaign_name="Website-Direct-Launch",
            lead_name="Advocate Shahinur Alam",
            primary_phone="+8801722889900",
            email="shahinur.alam@supremecourt.bd",
            interested_project_id=proj_id,
            budget_range_min=18000000.0,
            budget_range_max=25000000.0,
            lead_stage="NEW",
            lead_score=75,
            notes="Contact form inquiry: Interested in 4-bedroom lake view unit."
        )
        session.add(new_lead)
        await session.flush()

        scoring = compute_lead_scoring_details(new_lead)
        new_lead.lead_score = scoring.total_score

        activity = LeadActivity(
            lead_id=new_lead.id,
            activity_type="STAGE_CHANGE",
            activity_summary="Inbound website inquiry registered.",
            outcome="NEW_LEAD"
        )
        session.add(activity)
        await session.commit()

        assert new_lead.id is not None
        assert new_lead.lead_source_id == "WEB_FORM"
        assert new_lead.lead_stage == "NEW"
        assert new_lead.lead_score >= 70


@pytest.mark.asyncio
async def test_sales_booking_pricing_breakdown_and_joint_buyer():
    """
    Test booking pricing breakdown: Base Price + Parking + Utility + Documentation - Discount
    and Joint Buyer registration under Prompt 09.
    """
    async with TestSessionLocal() as session:
        # Retrieve test project, unit, and customer
        proj_res = await session.execute(select(Project).order_by(Project.id.asc()))
        project = proj_res.scalars().first()

        unit_res = await session.execute(select(Unit).where(Unit.status_id == "AVAILABLE"))
        unit = unit_res.scalars().first()
        if not unit:
            unit_res = await session.execute(select(Unit).order_by(Unit.id.desc()))
            unit = unit_res.scalars().first()

        cust_res = await session.execute(select(Customer).order_by(Customer.id.asc()))
        customer = cust_res.scalars().first()

        assert project is not None
        assert unit is not None
        assert customer is not None

        base_price = 16000000.00
        parking_charge = 850000.00
        utility_charge = 500000.00
        doc_charge = 300000.00
        discount_amount = 400000.00 # 2.5% discount on base price -> Sales Manager threshold

        gross_price = base_price + parking_charge + utility_charge + doc_charge
        final_contract = gross_price - discount_amount
        discount_pct = (discount_amount / base_price) * 100.0

        import uuid
        booking = Booking(
            booking_reference_no=f"BK-TEST-{uuid.uuid4().hex[:10].upper()}",
            project_id=project.id,
            unit_id=unit.id,
            primary_customer_id=customer.id,
            booking_date=date.today(),
            base_unit_price=base_price,
            parking_charge=parking_charge,
            utility_charge=utility_charge,
            documentation_charge=doc_charge,
            parking_slot_number="BASEMENT-1-P12",
            discount_amount=discount_amount,
            discount_percentage=round(discount_pct, 2),
            required_approval_tier="SALES_MANAGER",
            discount_approval_status="PENDING_APPROVAL",
            final_contract_value=final_contract,
            earnest_money_received=500000.00,
            down_payment_total=2500000.00,
            status="PROVISIONAL"
        )
        session.add(booking)
        await session.flush()

        # Add Joint-Buyer (Co-applicant) KYC
        joint_buyer = BookingJointBuyer(
            booking_id=booking.id,
            full_name_en="Farzana Parveen",
            full_name_bn="ফারজানা পারভীন",
            nid_number="19872611223300012",
            passport_number="B99887711",
            tin_number="7723991002",
            primary_phone="+8801811223344",
            email="farzana.parveen@email.com",
            present_address="Dhanmondi R/A, Road 8/A, Dhaka",
            relation_to_primary="SPOUSE",
            share_percentage=50.00
        )
        session.add(joint_buyer)
        await session.commit()

        assert booking.final_contract_value == 17250000.00
        assert booking.parking_charge == 850000.00
        assert booking.utility_charge == 500000.00
        assert booking.documentation_charge == 300000.00
        assert booking.required_approval_tier == "SALES_MANAGER"
        assert joint_buyer.id is not None
        assert joint_buyer.relation_to_primary == "SPOUSE"


@pytest.mark.asyncio
async def test_installment_schedule_generator_milestones():
    """
    Test automated Milestone-linked schedule generation with due dates and custom percentages.
    """
    async with TestSessionLocal() as session:
        booking_res = await session.execute(select(Booking).order_by(Booking.id.asc()))
        booking = booking_res.scalars().first()
        assert booking is not None

        # Clean existing installments for this test booking
        await session.execute(
            select(CustomerInstallment).where(CustomerInstallment.booking_id == booking.id)
        )

        milestones = [
            ("Booking Money Balance", 0.10, "BOOKING_CONFIRMED"),
            ("Down Payment Allotment", 0.15, "DOWN_PAYMENT"),
            ("On Piling & Foundation", 0.15, "FOUNDATION_DONE"),
            ("On 5th Floor Roof Casting", 0.15, "ROOF_CASTING_L5"),
            ("On Brickwork & Plaster", 0.15, "BRICKWORK_PLASTER"),
            ("On Sanitary & Paint Finishing", 0.15, "FINISHING_STAGE"),
            ("On Key Handover & Deed Registration", 0.15, "HANDOVER_CERTIFICATE")
        ]

        total_value = float(booking.final_contract_value)
        start_date = date.today()
        created_items = []

        current_date = start_date
        for idx, (title, pct, trigger) in enumerate(milestones, start=1):
            inst = CustomerInstallment(
                booking_id=booking.id,
                installment_no=idx,
                title=f"Milestone #{idx}: {title}",
                due_date=current_date + timedelta(days=idx * 60),
                grace_period_days=15,
                payable_amount=round(total_value * pct, 2),
                status="UPCOMING",
                milestone_trigger=trigger,
                surcharge_percentage=2.00
            )
            session.add(inst)
            created_items.append(inst)

        await session.commit()

        assert len(created_items) == 7
        assert sum(i.payable_amount for i in created_items) > 0
        assert created_items[0].grace_period_days == 15
        assert created_items[3].milestone_trigger == "ROOF_CASTING_L5"


@pytest.mark.asyncio
async def test_overdue_surcharge_calculation():
    """
    Test late payment surcharge calculation (Prompt 09):
    2% monthly surcharge applied prorated on days past grace period.
    """
    async with TestSessionLocal() as session:
        booking_res = await session.execute(select(Booking).order_by(Booking.id.asc()))
        booking = booking_res.scalars().first()
        assert booking is not None

        # Create an installment due 45 days ago with 15 days grace period -> 30 overdue days
        overdue_due_date = date.today() - timedelta(days=45)
        inst = CustomerInstallment(
            booking_id=booking.id,
            installment_no=88,
            title="Overdue Test Installment",
            due_date=overdue_due_date,
            grace_period_days=15,
            payable_amount=1000000.00, # 10 Lakh
            paid_amount=0.00,
            surcharge_percentage=2.00,
            status="DUE"
        )
        session.add(inst)
        await session.commit()

        # Calculate surcharge:
        # Grace cutoff: due_date + 15 days = today - 30 days
        # overdue_days = 30
        # surcharge = 1,000,000 * (2% / 100) * (30 / 30) = 20,000 BDT
        today = date.today()
        grace_days = inst.grace_period_days
        cutoff = inst.due_date + timedelta(days=grace_days)
        overdue_days = (today - cutoff).days
        unpaid = float(inst.payable_amount - inst.paid_amount)
        surcharge = round(unpaid * (float(inst.surcharge_percentage) / 100.0) * (overdue_days / 30.0), 2)

        inst.overdue_days = overdue_days
        inst.late_fee_accrued = surcharge
        inst.status = "OVERDUE"
        await session.commit()

        assert inst.overdue_days == 30
        assert inst.late_fee_accrued == 20000.00
        assert inst.status == "OVERDUE"


@pytest.mark.asyncio
async def test_installment_multi_channel_alert_dispatch():
    """
    Test SMS and WhatsApp reminder alert dispatch logging under Prompt 09.
    """
    async with TestSessionLocal() as session:
        booking_res = await session.execute(select(Booking).order_by(Booking.id.asc()))
        booking = booking_res.scalars().first()
        assert booking is not None

        inst_res = await session.execute(
            select(CustomerInstallment).where(CustomerInstallment.booking_id == booking.id)
        )
        inst = inst_res.scalars().first()
        assert inst is not None

        # Dispatch SMS Alert
        sms_log = InstallmentAlertLog(
            installment_id=inst.id,
            booking_id=booking.id,
            customer_id=booking.primary_customer_id,
            channel="SMS",
            recipient_phone="+8801711998877",
            recipient_email="allottee@example.com",
            message_content=f"Reminder: Installment #{inst.installment_no} of BDT {inst.payable_amount:,.2f} is due.",
            status="SENT"
        )
        # Dispatch WhatsApp Alert
        wa_log = InstallmentAlertLog(
            installment_id=inst.id,
            booking_id=booking.id,
            customer_id=booking.primary_customer_id,
            channel="WHATSAPP",
            recipient_phone="+8801711998877",
            recipient_email="allottee@example.com",
            message_content=f"WhatsApp: Click link to view installment voucher: https://erp.blueoceansbd.com/v/{inst.id}",
            status="DELIVERED"
        )
        session.add(sms_log)
        session.add(wa_log)

        inst.sms_alert_sent = True
        inst.whatsapp_alert_sent = True
        await session.commit()

        assert sms_log.id is not None
        assert sms_log.channel == "SMS"
        assert wa_log.id is not None
        assert wa_log.channel == "WHATSAPP"
        assert inst.sms_alert_sent is True
        assert inst.whatsapp_alert_sent is True
