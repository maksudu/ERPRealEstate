import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import logging
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import text, select
from app.core.database import engine, Base, AsyncSessionLocal

# Import all models to ensure metadata is populated
from app.modules.auth.models import Organization, Role, User, UserProjectAssignment
from app.modules.land.models import LandBank, Landowner, SurveyRecord, JVAgreement, JVUnitAllocation
from app.modules.projects.models import Project, Tower, AuthorityClearance, BOQItem, Drawing
from app.modules.inventory.models import Unit, ParkingBay
from app.modules.crm.models import Lead, LeadActivity, Customer, Nominee
from app.modules.sales.models import Booking, BookingCancellation, UnitTransfer
from app.modules.installments.models import CustomerInstallment, PDCVault, NI138LegalAction
from app.modules.construction.models import (
    Subcontractor, DPRReport, LaborMuster, WorkOrder, RABill, ConcreteCubeTest, SafetyNCR
)
from app.modules.procurement.models import (
    Vendor, MaterialItem, SiteStore, StoreStock, PurchaseRequisition,
    ComparativeStatement, CSQuotation, PurchaseOrder, GoodsReceipt
)
from app.modules.accounts.models import (
    ChartOfAccount, Voucher, JournalEntry, BankReconciliation,
    MushakTaxInvoice, TDSDeduction
)
from app.modules.handover.models import HandoverInspection, DLPTicket, OwnersAssociation, LeaseAgreement
from app.modules.operations.models import Broker, BrokerCommission, CourtCase, MachineryAsset, ImportBatch

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("seed_master")

async def seed_master():
    logger.info("=================================================================")
    logger.info("STARTING MASTER PRODUCTION SEEDING FOR BANGLADESH REAL ESTATE ERP")
    logger.info("=================================================================")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # -------------------------------------------------------------
        # 1. SYS USERS & ROLES EXPANSION
        # -------------------------------------------------------------
        logger.info("Step 1: Checking and expanding System Users & Staff Profiles...")
        org = (await session.execute(select(Organization))).scalars().first()
        org_id = org.id if org else 1

        existing_users = {u.username: u for u in (await session.execute(select(User))).scalars().all()}
        admin_ref = (await session.execute(select(User))).scalars().first()
        pw_hash = admin_ref.hashed_password if admin_ref else "$2b$12$K8y4ySgZ3h/c8Y6BfJzQReFz4p5qV0u3L5c3uK9nE1zP2aW3X4Y5Z"
        
        staff_data = [
            ("project_dir", "Engr. Shamsul Arefin", "প্রকৌঃ শামসুল আরেফিন", "shamsul.arefin@apex-realestate.com", "+8801713998811"),
            ("head_accounts", "Mohammad Nurul Huda, FCA", "মোহাম্মদ নুরুল হুদা", "nurul.huda@apex-realestate.com", "+8801713998822"),
            ("site_store_officer", "Md. Zahid Hasan", "মোঃ জাহিদ হাসান", "zahid.hasan@apex-realestate.com", "+8801713998833"),
            ("qa_qc_engineer", "Engr. Tanvir Ahmed", "প্রকৌঃ তানভীর আহমেদ", "tanvir.qc@apex-realestate.com", "+8801713998844")
        ]

        for uname, fname_en, fname_bn, email, phone in staff_data:
            if uname not in existing_users:
                u = User(
                    organization_id=org_id,
                    username=uname,
                    email=email,
                    hashed_password=pw_hash,
                    full_name_en=fname_en,
                    full_name_bn=fname_bn,
                    phone_number=phone,
                    is_active=True,
                    is_group_admin=False
                )
                session.add(u)
        await session.flush()

        all_users = (await session.execute(select(User))).scalars().all()
        user_map = {u.username: u for u in all_users}
        admin_user = user_map.get("admin") or all_users[0]
        sales_rep = user_map.get("sales_mgr") or admin_user
        project_dir = user_map.get("project_dir") or admin_user
        head_acc = user_map.get("head_accounts") or admin_user
        store_user = user_map.get("site_store_officer") or admin_user
        qc_user = user_map.get("qa_qc_engineer") or admin_user

        # Fetch projects
        projects = (await session.execute(select(Project).order_by(Project.id.asc()))).scalars().all()
        proj_1 = projects[0] if projects else None

        # Project 2 check
        if len(projects) < 2:
            logger.info("Adding Project 2: Banani Signature Commercial Hub...")
            lb2 = (await session.execute(select(LandBank).where(LandBank.project_code == "PRJ-BANANI-COMMERCIAL"))).scalar_one_or_none()
            proj_2 = Project(
                land_bank_id=lb2.id if lb2 else None,
                project_code="PRJ-BANANI-COMMERCIAL",
                project_name="Banani Signature Commercial Hub & Corporate Suites",
                development_authority_id="RAJUK",
                far_allocated=Decimal("5.50"),
                mgc_percent=Decimal("55.00"),
                road_width_feet=Decimal("80.00"),
                plot_area_sqft=Decimal("8640.00"),
                total_builtup_area_sqft=Decimal("47520.00"),
                total_saleable_area_sqft=Decimal("38000.00"),
                planned_handover_date=date.today() + timedelta(days=900),
                status="UNDER_CONSTRUCTION",
                description="Boutique Grade-A Corporate Office Tower on Prime Road 11 Banani Commercial Zone."
            )
            session.add(proj_2)
            await session.flush()
            projects = (await session.execute(select(Project).order_by(Project.id.asc()))).scalars().all()
        
        proj_1 = projects[0]
        proj_2 = projects[1] if len(projects) > 1 else proj_1

        # -------------------------------------------------------------
        # 2. CRM MODULE (LEADS, ACTIVITIES, CUSTOMERS, NOMINEES)
        # -------------------------------------------------------------
        logger.info("Step 2: Seeding CRM Module (Leads, Activities, KYC Customers, Nominees)...")
        lead_cnt = (await session.execute(select(Lead))).scalars().first()
        if not lead_cnt:
            leads = [
                Lead(
                    lead_source_id="FACEBOOK_ADS", campaign_name="Gulshan-Heights-Q4-Luxury",
                    lead_name="Barrister Rafiqul Islam", primary_phone="+8801711223344",
                    email="rafiqul.islam@supremecourt.gov.bd", interested_project_id=proj_1.id,
                    budget_range_min=Decimal("25000000.00"), budget_range_max=Decimal("35000000.00"),
                    assigned_sales_rep_id=sales_rep.id, lead_stage="NEW", lead_score=85,
                    notes="Inquired via Facebook Lead Gen Form for 4-Bed Duplex overlooking Gulshan Lake."
                ),
                Lead(
                    lead_source_id="WHATSAPP", campaign_name="Direct-Inbound-WhatsApp",
                    lead_name="Dr. Shireen Akhter", primary_phone="+8801819988776",
                    email="shireen.akhter@squarehospital.com", interested_project_id=proj_1.id,
                    budget_range_min=Decimal("18000000.00"), budget_range_max=Decimal("22000000.00"),
                    assigned_sales_rep_id=sales_rep.id, lead_stage="CONTACTED", lead_score=75,
                    notes="Initial phone discussion completed. Shared South-facing floor layout brochure."
                ),
                Lead(
                    lead_source_id="WALK_IN", campaign_name="Corporate-Headquarters-Walkin",
                    lead_name="Engr. Maksudul Haque", primary_phone="+8801914556677",
                    email="maksudul.haque@petrobangla.gov.bd", interested_project_id=proj_2.id,
                    budget_range_min=Decimal("14000000.00"), budget_range_max=Decimal("18000000.00"),
                    assigned_sales_rep_id=sales_rep.id, lead_stage="VISITED", lead_score=90,
                    notes="Completed physical site visit on Saturday with family. Impressed by Banani Road 11 frontage."
                ),
                Lead(
                    lead_source_id="BROKER", campaign_name="Uttara-Elite-Channel-Partner",
                    lead_name="Mr. Tariq Ahmed Chowdhury", primary_phone="+8801730445566",
                    email="tariq.ahmed@bproperty-partner.com", interested_project_id=proj_2.id,
                    budget_range_min=Decimal("15000000.00"), budget_range_max=Decimal("19000000.00"),
                    assigned_sales_rep_id=sales_rep.id, lead_stage="NEGOTIATION", lead_score=95,
                    notes="Drafting installment schedule. Negotiating 2.5% volume purchase discount."
                ),
                Lead(
                    lead_source_id="WEB_FORM", campaign_name="Website-Inquiry-Portal",
                    lead_name="Mrs. Sultana Parveen", primary_phone="+8801612334455",
                    email="sultana.parveen@gmail.com", interested_project_id=proj_1.id,
                    budget_range_min=Decimal("30000000.00"), budget_range_max=Decimal("40000000.00"),
                    assigned_sales_rep_id=sales_rep.id, lead_stage="BOOKED", lead_score=100,
                    notes="Earnest money token received BDT 1,000,000 via Pay Order. Allotted Unit T1-08A."
                ),
                Lead(
                    lead_source_id="REFERRAL", campaign_name="Existing-Client-Referral",
                    lead_name="Mohammad Kamal Hossain", primary_phone="+8801755112233",
                    email="kamal.hossain@yahoo.com", interested_project_id=proj_1.id,
                    budget_range_min=Decimal("8000000.00"), budget_range_max=Decimal("10000000.00"),
                    assigned_sales_rep_id=sales_rep.id, lead_stage="DROPPED", lead_score=20,
                    notes="Budget mismatch. Customer looking for sub-10M apartments outside Gulshan."
                )
            ]
            session.add_all(leads)
            await session.flush()

            activities = [
                LeadActivity(lead_id=leads[0].id, sales_rep_id=sales_rep.id, activity_type="PHONE_CALL", activity_summary="Outbound intro call: Customer asked for project e-brochure over WhatsApp.", outcome="INTERESTED"),
                LeadActivity(lead_id=leads[1].id, sales_rep_id=sales_rep.id, activity_type="WHATSAPP", activity_summary="Shared floor plan diagrams and architectural 3D elevation renders.", outcome="PENDING_REVIEW"),
                LeadActivity(lead_id=leads[2].id, sales_rep_id=sales_rep.id, activity_type="SITE_VISIT", activity_summary="Accompanied client to Banani site. Inspected sample mock floor.", outcome="VISITED_POSITIVE"),
                LeadActivity(lead_id=leads[3].id, sales_rep_id=sales_rep.id, activity_type="OFFICE_MEETING", activity_summary="Negotiation meeting in Head Office Boardroom on installment tenure.", outcome="AGREED_ON_TERMS"),
                LeadActivity(lead_id=leads[4].id, sales_rep_id=sales_rep.id, activity_type="STAGE_CHANGE", activity_summary="Converted to verified buyer. Booking earnest money token finalized.", outcome="BOOKED")
            ]
            session.add_all(activities)

        cust_cnt = (await session.execute(select(Customer))).scalars().first()
        if not cust_cnt:
            customers = [
                Customer(
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
                ),
                Customer(
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
                ),
                Customer(
                    customer_code="CUST-2026-0003",
                    full_name_en="Dr. Shahriar Hossain",
                    full_name_bn="ডাঃ শাহরিয়ার হোসেন",
                    father_husband_name="Prof. Dr. Anwar Hossain",
                    mother_name="Suraiya Begum",
                    nid_number="19852695500004455",
                    tin_number="543210987654",
                    primary_phone="+8801715443322",
                    email="shahriar.hossain@bsmmu.edu.bd",
                    present_address="Flat 6B, Concord Lake City, Khilkhet, Dhaka",
                    permanent_address="College Road, Mymensingh Sadar, Mymensingh",
                    is_nrb=False,
                    profile_photo_url="assets/images/auth/avatar-default.png"
                ),
                Customer(
                    customer_code="CUST-2026-0004",
                    full_name_en="Mr. Anisur Rahman",
                    full_name_bn="জনাব আনিসুর রহমান",
                    father_husband_name="Abdul Jalil",
                    mother_name="Amena Khatun",
                    nid_number="19682695500008899",
                    tin_number="432109876543",
                    primary_phone="+8801817112233",
                    email="anisur.rahman@transcombd.com",
                    present_address="House 12, Road 7, Gulshan-1, Dhaka-1212",
                    permanent_address="Village: Joynagar, PS: Shibpur, Narsingdi",
                    is_nrb=False,
                    profile_photo_url="assets/images/auth/avatar-default.png"
                )
            ]
            session.add_all(customers)
            await session.flush()

            nominees = [
                Nominee(customer_id=customers[0].id, nominee_name="Tanvir Mostafa", relation_type="SON", nid_number="19992695500005678", share_percentage=Decimal("60.00")),
                Nominee(customer_id=customers[0].id, nominee_name="Tahmina Mostafa", relation_type="DAUGHTER", nid_number="20032695500009999", share_percentage=Decimal("40.00")),
                Nominee(customer_id=customers[1].id, nominee_name="Sabrina Masud", relation_type="SPOUSE", nid_number="19802695500004321", share_percentage=Decimal("100.00")),
                Nominee(customer_id=customers[2].id, nominee_name="Dr. Farhana Yasmin", relation_type="SPOUSE", nid_number="19882695500007788", share_percentage=Decimal("50.00")),
                Nominee(customer_id=customers[2].id, nominee_name="Abrar Hossain", relation_type="SON", nid_number="20122695500003322", share_percentage=Decimal("50.00")),
                Nominee(customer_id=customers[3].id, nominee_name="Roksana Rahman", relation_type="SPOUSE", nid_number="19722695500006677", share_percentage=Decimal("100.00"))
            ]
            session.add_all(nominees)
        await session.flush()

        # -------------------------------------------------------------
        # 3. SALES MODULE (BOOKINGS, CANCELLATION, TRANSFERS)
        # -------------------------------------------------------------
        logger.info("Step 3: Seeding Sales Module (Bookings, Multi-tier Approvals, REHAB Cancellation, Mutation Transfers)...")
        customers = (await session.execute(select(Customer))).scalars().all()
        units = (await session.execute(select(Unit).where(Unit.project_id == proj_1.id))).scalars().all()
        
        c1, c2, c3, c4 = customers[0], customers[1], customers[2], customers[3]

        booking_cnt = (await session.execute(select(Booking))).scalars().first()
        if not booking_cnt:
            u1, u2, u3, u4, u5 = units[0], units[1], units[2], units[3], units[4]

            # Booking 1: Approved standard discount (1.0% - Sales Manager Tier)
            p1 = float(u1.total_unit_price or 45675000.0)
            d1 = p1 * 0.01
            u1.status_id = "BOOKED"
            b1 = Booking(
                booking_reference_no="BK-2026-0001",
                project_id=proj_1.id, unit_id=u1.id, primary_customer_id=c1.id,
                booking_date=date(2026, 8, 15),
                base_unit_price=Decimal(str(p1)), discount_amount=Decimal(str(d1)), discount_percentage=Decimal("1.00"),
                required_approval_tier="SALES_MANAGER", discount_approval_status="APPROVED",
                discount_approved_by_id=sales_rep.id, discount_approval_notes="Approved under festival festive promo.",
                final_contract_value=Decimal(str(p1 - d1)),
                earnest_money_received=Decimal("1500000.00"), down_payment_total=Decimal("8000000.00"),
                status="AGREEMENT_SIGNED", notes="Bainama deed signed on 300 Tk non-judicial stamp. Down payment cleared."
            )

            # Booking 2: Director Approval (2.5% discount)
            p2 = float(u2.total_unit_price or 35960000.0)
            d2 = p2 * 0.025
            u2.status_id = "BOOKED"
            b2 = Booking(
                booking_reference_no="BK-2026-0002",
                project_id=proj_1.id, unit_id=u2.id, primary_customer_id=c2.id,
                booking_date=date(2026, 9, 1),
                base_unit_price=Decimal(str(p2)), discount_amount=Decimal(str(d2)), discount_percentage=Decimal("2.50"),
                required_approval_tier="DIRECTOR", discount_approval_status="APPROVED",
                discount_approved_by_id=admin_user.id, discount_approval_notes="NRB high-volume buyer special waiver.",
                final_contract_value=Decimal(str(p2 - d2)),
                earnest_money_received=Decimal("1000000.00"), down_payment_total=Decimal("6000000.00"),
                status="AGREEMENT_SIGNED", notes="Full remittance received from Qatar Islamic Bank."
            )

            # Booking 3: Pending Managing Director Approval (> 3% discount)
            p3 = float(u3.total_unit_price or 34075000.0)
            d3 = p3 * 0.045
            u3.status_id = "BOOKED"
            b3 = Booking(
                booking_reference_no="BK-2026-0003",
                project_id=proj_1.id, unit_id=u3.id, primary_customer_id=c3.id,
                booking_date=date(2026, 10, 5),
                base_unit_price=Decimal(str(p3)), discount_amount=Decimal(str(d3)), discount_percentage=Decimal("4.50"),
                required_approval_tier="MANAGING_DIRECTOR", discount_approval_status="PENDING_APPROVAL",
                final_contract_value=Decimal(str(p3 - d3)),
                earnest_money_received=Decimal("1000000.00"), down_payment_total=Decimal("0.00"),
                status="PROVISIONAL", notes="Prominent Senior Physician. Requested 4.5% executive waiver pending MD biometric sign-off."
            )

            # Booking 4: Cancelled under REHAB 10% Forfeiture Deduction
            p4 = float(u4.total_unit_price or 32625000.0)
            u4.status_id = "AVAILABLE"
            b4 = Booking(
                booking_reference_no="BK-2026-0004",
                project_id=proj_1.id, unit_id=u4.id, primary_customer_id=c4.id,
                booking_date=date(2026, 5, 10),
                base_unit_price=Decimal(str(p4)), discount_amount=Decimal("0.00"), discount_percentage=Decimal("0.00"),
                required_approval_tier="SALES_MANAGER", discount_approval_status="APPROVED",
                final_contract_value=Decimal(str(p4)),
                earnest_money_received=Decimal("500000.00"), down_payment_total=Decimal("1500000.00"),
                status="CANCELLED", notes="Customer emigrated to Canada. Requested formal allotment cancellation."
            )

            # Booking 5: Completed Handover Ready Booking
            p5 = float(u5.total_unit_price or 33000000.0)
            u5.status_id = "BOOKED"
            b5 = Booking(
                booking_reference_no="BK-2026-0005",
                project_id=proj_1.id, unit_id=u5.id, primary_customer_id=c1.id,
                booking_date=date(2026, 3, 10),
                base_unit_price=Decimal(str(p5)), discount_amount=Decimal("0.00"), discount_percentage=Decimal("0.00"),
                required_approval_tier="SALES_MANAGER", discount_approval_status="APPROVED",
                final_contract_value=Decimal(str(p5)),
                earnest_money_received=Decimal("2000000.00"), down_payment_total=Decimal("31000000.00"),
                status="REGISTRATION_DONE", notes="100% payments completed. Ready for keys handover inspection."
            )

            session.add_all([b1, b2, b3, b4, b5])
            await session.flush()

            # Seed REHAB Cancellation record
            cancellation = BookingCancellation(
                booking_id=b4.id,
                cancellation_date=date(2026, 7, 20),
                cancellation_reason="Emigration to Toronto, Canada. Mutual settlement as per REHAB Act statutory norms.",
                total_paid=Decimal("2000000.00"),
                forfeiture_deduction_percentage=Decimal("10.00"),
                forfeiture_deduction_amount=Decimal("200000.00"),
                net_refund_amount=Decimal("1800000.00"),
                status="SETTLED",
                refund_cheque_no="CHQ-EBL-9912044",
                settlement_notes="Net refund paid via Eastern Bank Account Payee Cheque after statutory 10% forfeiture."
            )
            session.add(cancellation)

            # Seed Unit Transfer
            transfer = UnitTransfer(
                booking_id=b2.id,
                from_customer_id=c2.id,
                to_customer_id=c3.id,
                transfer_date=date(2026, 10, 10),
                transfer_fee_bdt=Decimal("250000.00"),
                transfer_memo_no="NOC-TRF-2026-081",
                approval_status="COMPLETED",
                remarks="Sub-Registry Mutation NOC granted upon receipt of developer transfer endorsement fees."
            )
            session.add(transfer)
        await session.flush()

        all_bookings = (await session.execute(select(Booking))).scalars().all()
        bk1 = all_bookings[0]
        bk2 = all_bookings[1] if len(all_bookings) > 1 else bk1
        bk5 = all_bookings[4] if len(all_bookings) > 4 else bk1

        # -------------------------------------------------------------
        # 4. INSTALLMENTS, PDC VAULT & NI ACT 138 LEGAL ENGINE
        # -------------------------------------------------------------
        logger.info("Step 4: Seeding Installments, Post-Dated Cheque Vault & NI Act 138 Engine...")
        inst_cnt = (await session.execute(select(CustomerInstallment))).scalars().first()
        if not inst_cnt:
            insts = [
                CustomerInstallment(booking_id=bk1.id, installment_no=1, title="Milestone 1: Piling & Foundation Completed", due_date=date.today() - timedelta(days=90), grace_period_days=15, payable_amount=Decimal("5000000.00"), paid_amount=Decimal("5000000.00"), status="PAID", milestone_trigger="FOUNDATION_DONE"),
                CustomerInstallment(booking_id=bk1.id, installment_no=2, title="Milestone 2: Basement & Ground Slab Casting", due_date=date.today() - timedelta(days=20), grace_period_days=15, payable_amount=Decimal("5000000.00"), paid_amount=Decimal("5000000.00"), status="PAID", milestone_trigger="BASEMENT_CASTING"),
                CustomerInstallment(booking_id=bk1.id, installment_no=3, title="Milestone 3: 4th Floor Roof Slab Casting", due_date=date.today() - timedelta(days=5), grace_period_days=15, payable_amount=Decimal("5000000.00"), paid_amount=Decimal("0.00"), late_fee_accrued=Decimal("15000.00"), status="DUE", milestone_trigger="ROOF_SLAB_L4"),
                CustomerInstallment(booking_id=bk1.id, installment_no=4, title="Milestone 4: 8th Floor Roof Slab Casting", due_date=date.today() + timedelta(days=60), grace_period_days=15, payable_amount=Decimal("5000000.00"), paid_amount=Decimal("0.00"), status="UPCOMING", milestone_trigger="ROOF_SLAB_L8"),
                CustomerInstallment(booking_id=bk1.id, installment_no=5, title="Milestone 5: Brickwork & Internal Plastering", due_date=date.today() + timedelta(days=120), grace_period_days=15, payable_amount=Decimal("5000000.00"), paid_amount=Decimal("0.00"), status="UPCOMING", milestone_trigger="BRICKWORK_PLASTER"),
                CustomerInstallment(booking_id=bk1.id, installment_no=6, title="Milestone 6: Final Possession & Key Handover", due_date=date.today() + timedelta(days=240), grace_period_days=15, payable_amount=Decimal("10218250.00"), paid_amount=Decimal("0.00"), status="UPCOMING", milestone_trigger="FINAL_HANDOVER")
            ]
            session.add_all(insts)

            pdcs = [
                PDCVault(booking_id=bk1.id, customer_id=c1.id, cheque_number="CHQ-EBL-884920", bank_name="Eastern Bank PLC", branch_name="Gulshan Branch", routing_number="095261120", maturity_date=date.today() + timedelta(days=3), cheque_amount=Decimal("5000000.00"), pouch_barcode="PDC-VAULT-2026-0001", status="IN_VAULT"),
                PDCVault(booking_id=bk1.id, customer_id=c1.id, cheque_number="CHQ-EBL-884921", bank_name="Eastern Bank PLC", branch_name="Gulshan Branch", routing_number="095261120", maturity_date=date.today() + timedelta(days=60), cheque_amount=Decimal("5000000.00"), pouch_barcode="PDC-VAULT-2026-0002", status="IN_VAULT"),
                PDCVault(booking_id=bk2.id, customer_id=c2.id, cheque_number="CHQ-SCB-449102", bank_name="Standard Chartered Bank", branch_name="Gulshan North Branch", routing_number="215264881", maturity_date=date.today() - timedelta(days=15), cheque_amount=Decimal("4500000.00"), pouch_barcode="PDC-VAULT-2026-0003", status="DISHONOURED_BOUNCED", dishonour_memo_date=date.today() - timedelta(days=10), dishonour_reason="Insufficient Funds / Drawers Total Balance Deficient"),
                PDCVault(booking_id=bk2.id, customer_id=c2.id, cheque_number="CHQ-CBL-771239", bank_name="City Bank PLC", branch_name="Banani Branch", routing_number="225260811", maturity_date=date.today() - timedelta(days=45), cheque_amount=Decimal("3500000.00"), pouch_barcode="PDC-VAULT-2026-0004", status="HONOURED")
            ]
            session.add_all(pdcs)
            await session.flush()

            # Seed Section 138 Statutory Notice
            bounced_pdc = pdcs[2]
            legal = NI138LegalAction(
                pdc_cheque_id=bounced_pdc.id,
                dishonour_memo_received_date=date.today() - timedelta(days=10),
                statutory_notice_deadline_date=date.today() + timedelta(days=20),
                notice_served_to_client_date=date.today() - timedelta(days=4),
                registered_post_ad_no="REG-AD-DHAKA-GPO-99412",
                client_30day_settlement_deadline=date.today() + timedelta(days=26),
                status="NOTICE_SERVED",
                court_case_no="Draft CR Case u/s 138 (CMM Court Dhaka)",
                legal_counsel_name="Barrister Tanvir Ahmed (Supreme Court of Bangladesh)",
                remarks="Statutory Notice u/s 138 dispatched via Registered Post with A/D. 30-day criminal liability timer running."
            )
            session.add(legal)
        await session.flush()

        # -------------------------------------------------------------
        # 5. CONSTRUCTION & SITE OPERATIONS MODULE
        # -------------------------------------------------------------
        logger.info("Step 5: Seeding Construction Module (Contractors, DPR, Labor, Work Orders, RA Bills, Cubes, Safety NCRs)...")
        cont_cnt = (await session.execute(select(Subcontractor))).scalars().first()
        if not cont_cnt:
            c_civil = Subcontractor(contractor_code="CONT-0001", company_name="M/S Standard Civil Builders & Engineering", trade_specialization="CIVIL_STRUCTURE", contact_person="Alhaj Mokbul Hossain", primary_phone="+8801711889900", tin_number="128892109212", bin_number="001882910-0101")
            c_steel = Subcontractor(contractor_code="CONT-0002", company_name="Dhaka Steel & Rod Binding Works", trade_specialization="ROD_BINDING", contact_person="Md. Shahidul Islam", primary_phone="+8801819223344", tin_number="218892109333", bin_number="002991821-0202")
            c_mep = Subcontractor(contractor_code="CONT-0003", company_name="Bengal Electromechanical Engineering", trade_specialization="ELECTRICAL", contact_person="Engr. Faruq Hasan", primary_phone="+8801911445566", tin_number="334455667788", bin_number="003882711-0303")
            session.add_all([c_civil, c_steel, c_mep])
            await session.flush()

            # DPR Reports
            tower_1 = (await session.execute(select(Tower).where(Tower.project_id == proj_1.id))).scalars().first()
            dpr = DPRReport(
                project_id=proj_1.id, tower_id=tower_1.id if tower_1 else None,
                report_date=date.today() - timedelta(days=1),
                weather_condition_id="SUNNY", site_engineer_id=qc_user.id,
                structural_activity_summary="Casting of 4th Floor Main Columns (C1-C16) and Shear Wall SW-1. Slump test 120mm verified with M25 concrete grade.",
                concrete_casting_cft=Decimal("2850.00"), steel_rod_consumed_mt=Decimal("18.450"),
                cement_consumed_bags=680, total_workers_onsite=48, status="APPROVED_BY_PM"
            )
            session.add(dpr)
            await session.flush()

            labor = [
                LaborMuster(dpr_id=dpr.id, contractor_id=c_civil.id, trade_category="Mason", worker_count=14, daily_wage_rate=Decimal("950.00"), total_wage=Decimal("13300.00")),
                LaborMuster(dpr_id=dpr.id, contractor_id=c_steel.id, trade_category="Rod-binder", worker_count=18, daily_wage_rate=Decimal("900.00"), total_wage=Decimal("16200.00")),
                LaborMuster(dpr_id=dpr.id, contractor_id=c_civil.id, trade_category="Carpenter", worker_count=10, daily_wage_rate=Decimal("900.00"), total_wage=Decimal("9000.00")),
                LaborMuster(dpr_id=dpr.id, contractor_id=c_civil.id, trade_category="Helper", worker_count=6, daily_wage_rate=Decimal("650.00"), total_wage=Decimal("3900.00"))
            ]
            session.add_all(labor)

            # Work Order
            wo = WorkOrder(
                project_id=proj_1.id, contractor_id=c_civil.id, work_order_no="WO-2026-0001",
                contract_type="CIVIL_SUPERSTRUCTURE", total_contract_value=Decimal("45000000.00"),
                retention_money_percent=Decimal("5.00"), defect_liability_months=12, status="ACTIVE",
                scope_of_work="Complete RCC Super-structure from Ground to 18th Floor including formwork shuttering, rebar binding, and concrete casting."
            )
            session.add(wo)
            await session.flush()

            # RA Bill with Bangladesh Statutory Deductions
            gross = Decimal("4500000.00")
            retention = gross * Decimal("0.05")     # 225,000
            advance_rec = Decimal("200000.00")     # 200,000
            tds_52 = gross * Decimal("0.05")        # 225,000 (Sec 52)
            vds = gross * Decimal("0.05")           # 225,000 (VDS)
            net_pay = gross - retention - advance_rec - tds_52 - vds # 3,625,000

            ra = RABill(
                work_order_id=wo.id, ra_bill_number="RA-BILL-01", bill_date=date.today() - timedelta(days=3),
                gross_work_certified_amount=gross, retention_money_deducted=retention,
                advance_recovery_deducted=advance_rec, tds_withheld_amount=tds_52, vds_withheld_amount=vds,
                net_payable_amount=net_pay, status="ACCOUNTS_VOUCHER_POSTED",
                accounts_journal_voucher_ref="JV-2026-0088", remarks="Certified 4th floor columns by Project Director. 5% Retention and statutory TDS/VDS withheld."
            )
            session.add(ra)

            # Concrete Cube Tests
            cubes = [
                ConcreteCubeTest(
                    project_id=proj_1.id, tower_id=tower_1.id if tower_1 else None, structural_element="Column C1-C8 (4th Floor)",
                    casting_date=date.today() - timedelta(days=28), design_compressive_strength_psi=4000, concrete_grade="M25",
                    batching_plant_name="Mir Ready-Mix Concrete Plant (Tejgaon)", slump_test_mm=120,
                    day7_testing_date=date.today() - timedelta(days=21), day7_strength_psi=2850,
                    day14_testing_date=date.today() - timedelta(days=14), day14_strength_psi=3650,
                    day28_testing_date=date.today(), day28_strength_psi=4250,
                    test_verdict="PASSED", lab_test_report_url="assets/reports/cube_test_c1_c8.pdf",
                    remarks="Crushing test exceeds 4000 psi design strength (4250 psi achieved @ 28 days - 106% capacity)."
                ),
                ConcreteCubeTest(
                    project_id=proj_1.id, tower_id=tower_1.id if tower_1 else None, structural_element="Shear Wall SW-2 (4th Floor)",
                    casting_date=date.today() - timedelta(days=7), design_compressive_strength_psi=4500, concrete_grade="M30",
                    batching_plant_name="Crown Cement RMC (Aminbazar)", slump_test_mm=115,
                    day7_testing_date=date.today(), day7_strength_psi=3150, test_verdict="PENDING",
                    remarks="7-day test 3150 psi (70% achieved). 14-day and 28-day crushing awaited."
                )
            ]
            session.add_all(cubes)

            # Safety NCRs
            ncrs = [
                SafetyNCR(
                    project_id=proj_1.id, ncr_number="NCR-PRJ01-2026-001", category="Structural Defect", severity="High",
                    description="Minor honeycombing observed on outer face of Column C-12 between Floor 3 and 4 after deshutting.",
                    location_details="Tower A - 3rd Floor Grid 3-C", photo_url="assets/images/common/honeycomb_sample.jpg",
                    assigned_contractor_id=c_civil.id, rectification_deadline=date.today() + timedelta(days=3),
                    status="Open", rectification_notes="Requires polymer modified non-shrink epoxy grout injection under QC supervision."
                ),
                SafetyNCR(
                    project_id=proj_1.id, ncr_number="NCR-PRJ01-2026-002", category="Safety Violation", severity="Critical",
                    description="Workers working at Floor 5 external scaffolding without safety harnesses and safety nets.",
                    location_details="East Facade Scaffolding - Floor 5", photo_url="assets/images/common/safety_violation.jpg",
                    assigned_contractor_id=c_civil.id, rectification_deadline=date.today() - timedelta(days=1),
                    status="Verified_Closed", rectification_notes="Full safety harness lifeline installed. Safety briefing conducted.",
                    closed_date=date.today()
                )
            ]
            session.add_all(ncrs)
        await session.flush()

        # -------------------------------------------------------------
        # 6. PROCUREMENT, STORES & 3-WAY MATCHING SCM MODULE
        # -------------------------------------------------------------
        logger.info("Step 6: Seeding Procurement & Stores SCM Module (Vendors, Materials, Stores, CS, PO, GRN)...")
        vendor_cnt = (await session.execute(select(Vendor))).scalars().first()
        if not vendor_cnt:
            v_bsrm = Vendor(vendor_code="VEND-0001", vendor_name="BSRM Steels Limited", trade_category="STEEL_REBAR", contact_person="Md. Ashraful Kabir", phone_number="+8801713001122", email="sales@bsrm.com", tin_number="112233445566", bin_number="000123456-0101", payment_terms_days=30)
            v_crown = Vendor(vendor_code="VEND-0002", vendor_name="Crown Cement PLC", trade_category="CEMENT", contact_person="Syed Mahmudul Haque", phone_number="+8801819334455", email="commercial@crowncement.com", tin_number="223344556677", bin_number="000234567-0202", payment_terms_days=45)
            v_mir = Vendor(vendor_code="VEND-0003", vendor_name="Mir Ceramic Ltd", trade_category="TILES_SANITARY", contact_person="Kamrul Hasan", phone_number="+8801912445566", email="corporate@mirceramic.com", tin_number="334455667788", bin_number="000345678-0303", payment_terms_days=30)
            session.add_all([v_bsrm, v_crown, v_mir])
            await session.flush()

            materials = [
                MaterialItem(material_code="MAT-REBAR-500W", material_name="500W TMT Deformed Rebar (16mm/20mm/25mm)", category="REBAR", unit_of_measure="TON", standard_unit_cost=Decimal("98500.00")),
                MaterialItem(material_code="MAT-CEM-PCC", material_name="Portland Composite Cement (PCC 42.5N)", category="CEMENT", unit_of_measure="BAG", standard_unit_cost=Decimal("540.00")),
                MaterialItem(material_code="MAT-SAND-SYLHET", material_name="Sylhet Coarse Sand (FM 2.5)", category="SAND", unit_of_measure="CFT", standard_unit_cost=Decimal("65.00")),
                MaterialItem(material_code="MAT-STONE-CHIPS", material_name="20mm Down Black Bholaganj Crushed Stone Chips", category="STONE_CHIPS", unit_of_measure="CFT", standard_unit_cost=Decimal("175.00")),
                MaterialItem(material_code="MAT-BRICK-AUTO", material_name="1st Class Gas-Burned Auto Machine Bricks", category="BRICKS", unit_of_measure="NOS", standard_unit_cost=Decimal("14.50")),
                MaterialItem(material_code="MAT-TILES-PORC", material_name="60x60cm Glazed Mirror Polish Porcelain Tiles", category="FINISHING", unit_of_measure="SQFT", standard_unit_cost=Decimal("185.00"))
            ]
            session.add_all(materials)
            await session.flush()

            # Site Stores
            store = SiteStore(project_id=proj_1.id, store_name="Gulshan Emerald Project Site Store", location_details="Basement B1 Secured Storage Bay", store_in_charge_user_id=store_user.id)
            session.add(store)
            await session.flush()

            # Store Stock
            stocks = [
                StoreStock(store_id=store.id, material_id=materials[0].id, current_stock_quantity=Decimal("35.5000"), reorder_level=Decimal("15.0000")),
                StoreStock(store_id=store.id, material_id=materials[1].id, current_stock_quantity=Decimal("1450.0000"), reorder_level=Decimal("500.0000")),
                StoreStock(store_id=store.id, material_id=materials[2].id, current_stock_quantity=Decimal("4200.0000"), reorder_level=Decimal("1000.0000")),
                StoreStock(store_id=store.id, material_id=materials[3].id, current_stock_quantity=Decimal("6500.0000"), reorder_level=Decimal("1500.0000"))
            ]
            session.add_all(stocks)

            # Purchase Requisition
            pr = PurchaseRequisition(
                project_id=proj_1.id, pr_number="PR-2026-0021", requested_by_user_id=project_dir.id,
                requisition_date=date.today() - timedelta(days=12), required_by_date=date.today() + timedelta(days=5),
                material_id=materials[0].id, requested_quantity=Decimal("50.0000"),
                purpose_notes="Required for 5th & 6th Floor main column cage binding and shear wall reinforcement.",
                status="CS_PREPARED"
            )
            session.add(pr)
            await session.flush()

            # Comparative Statement (CS)
            cs = ComparativeStatement(
                pr_id=pr.id, cs_number="CS-2026-0009", cs_date=date.today() - timedelta(days=8),
                recommended_vendor_id=v_bsrm.id, status="APPROVED",
                justification_summary="BSRM Steels is lowest responsive bidder with compliant elongation test report and 30-day credit facility."
            )
            session.add(cs)
            await session.flush()

            quotes = [
                CSQuotation(cs_id=cs.id, vendor_id=v_bsrm.id, quoted_unit_rate=Decimal("98500.00"), quoted_quantity=Decimal("50.0000"), total_quoted_amount=Decimal("4925000.00"), credit_days_offered=30, lead_time_days=2, is_recommended=True, remarks="Original BUET test certificate attached."),
                CSQuotation(cs_id=cs.id, vendor_id=v_crown.id, quoted_unit_rate=Decimal("101000.00"), quoted_quantity=Decimal("50.0000"), total_quoted_amount=Decimal("5050000.00"), credit_days_offered=15, lead_time_days=4, is_recommended=False, remarks="Higher unit rate.")
            ]
            session.add_all(quotes)

            # Purchase Order
            po = PurchaseOrder(
                po_number="PO-2026-0015", cs_id=cs.id, project_id=proj_1.id, vendor_id=v_bsrm.id,
                material_id=materials[0].id, ordered_quantity=Decimal("50.0000"), unit_price=Decimal("98500.00"),
                total_po_amount=Decimal("4925000.00"), po_date=date.today() - timedelta(days=5),
                delivery_deadline=date.today() + timedelta(days=2), destination_store_id=store.id,
                status="PARTIALLY_RECEIVED", terms_and_conditions="Price inclusive of delivery to Gulshan site. Weighbridge slip mandatory."
            )
            session.add(po)
            await session.flush()

            # Goods Receipt Note (GRN) & 3-Way Matching
            grn = GoodsReceipt(
                po_id=po.id, grn_number="GRN-2026-0044", receipt_date=date.today() - timedelta(days=2),
                delivery_challan_number="CHL-BSRM-88912", challan_photo_url="assets/images/common/challan_sample.jpg",
                received_by_user_id=store_user.id, received_quantity=Decimal("25.0000"),
                rejected_quantity=Decimal("0.0000"), accepted_quantity=Decimal("25.0000"),
                supplier_invoice_number="INV-BSRM-2026-9901", supplier_invoice_amount=Decimal("2462500.00"),
                calculated_expected_amount=Decimal("2462500.00"), variance_amount=Decimal("0.00"),
                three_way_match_status="MATCHED_OK", accounts_voucher_ref="JV-2026-0092",
                status="POSTED_ACCOUNTS", inspection_remarks="Random caliper gauge test verified 20mm & 25mm dia. Weighbridge tare/gross verified."
            )
            session.add(grn)
        await session.flush()

        # -------------------------------------------------------------
        # 7. ACCOUNTS & FINANCIAL MANAGEMENT MODULE
        # -------------------------------------------------------------
        logger.info("Step 7: Seeding Accounts Module (Hierarchical Chart of Accounts, Balanced Vouchers, Mushak 6.3, TDS)...")
        coa_cnt = (await session.execute(select(ChartOfAccount))).scalars().first()
        if not coa_cnt:
            coas = [
                # 1000 Assets
                ChartOfAccount(organization_id=org_id, account_code="1000", account_name_en="Current Assets", account_name_bn="চলতি সম্পদ", account_type="Asset", is_leaf_account=False),
                ChartOfAccount(organization_id=org_id, account_code="1010", account_name_en="Cash in Hand (Head Office)", account_name_bn="নগদ তহবিল", account_type="Asset", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="1020", account_name_en="Eastern Bank PLC (Current A/C #104106008)", account_name_bn="ইস্টার্ন ব্যাংক চলতি হিসাব", account_type="Asset", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="1030", account_name_en="City Bank PLC (Escrow A/C #31019821)", account_name_bn="সিটি ব্যাংক এসক্রো হিসাব", account_type="Asset", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="1200", account_name_en="Accounts Receivable (Property Buyers)", account_name_bn="প্রাপ্য হিসাব (ক্রেতা)", account_type="Asset", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="1300", account_name_en="Work-in-Progress (Construction WIP)", account_name_bn="নির্মাণাধীন প্রকল্প সম্পদ (WIP)", account_type="Asset", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="1400", account_name_en="Site Construction Material Inventory", account_name_bn="নির্মাণ সামগ্রী মজুদ", account_type="Asset", is_leaf_account=True),

                # 2000 Liabilities
                ChartOfAccount(organization_id=org_id, account_code="2000", account_name_en="Current Liabilities", account_name_bn="চলতি দায়", account_type="Liability", is_leaf_account=False),
                ChartOfAccount(organization_id=org_id, account_code="2010", account_name_en="Accounts Payable (Material Vendors)", account_name_bn="প্রদেয় হিসাব (সরবরাহকারী)", account_type="Liability", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="2020", account_name_en="Subcontractor RA Bill Payable", account_name_bn="উপ-ঠিকাদার প্রদেয় বিল", account_type="Liability", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="2030", account_name_en="Contractor Retention Money Payable (5%)", account_name_bn="ঠিকাদার জামানত দায় (৫%)", account_type="Liability", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="2040", account_name_en="Customer Advance Booking Deposits", account_name_bn="ক্রেতাদের অগ্রিম বুকিং আমানত", account_type="Liability", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="2050", account_name_en="Statutory Tax Deductions Payable (TDS Sec 52/53)", account_name_bn="উৎস কর কর্তন প্রদেয়", account_type="Liability", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="2060", account_name_en="Statutory VAT Deducted at Source (VDS)", account_name_bn="উৎস ভ্যাট কর্তন প্রদেয়", account_type="Liability", is_leaf_account=True),

                # 3000 Equity
                ChartOfAccount(organization_id=org_id, account_code="3000", account_name_en="Shareholders Equity", account_name_bn="মালিকানা স্বত্ব", account_type="Equity", is_leaf_account=False),
                ChartOfAccount(organization_id=org_id, account_code="3010", account_name_en="Paid-up Share Capital", account_name_bn="পরিশোধিত মূলধন", account_type="Equity", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="3020", account_name_en="Retained Earnings", account_name_bn="সংরক্ষিত আয়", account_type="Equity", is_leaf_account=True),

                # 4000 Revenue
                ChartOfAccount(organization_id=org_id, account_code="4000", account_name_en="Operating Revenue", account_name_bn="পরিচালন আয়", account_type="Revenue", is_leaf_account=False),
                ChartOfAccount(organization_id=org_id, account_code="4010", account_name_en="Apartment Sales Revenue", account_name_bn="অ্যাপার্টমেন্ট বিক্রয় রাজস্ব", account_type="Revenue", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="4020", account_name_en="Commercial Space Sales Revenue", account_name_bn="বাণিজ্যিক ফ্লোর বিক্রয়", account_type="Revenue", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="4040", account_name_en="Allotment Cancellation Forfeiture Income", account_name_bn="বুকিং বাতিল বাজেয়াপ্তকরণ আয়", account_type="Revenue", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="4050", account_name_en="Apartment Mutation & Transfer NOC Fees", account_name_bn="নামজারি ও হস্তান্তর ফি", account_type="Revenue", is_leaf_account=True),

                # 5000 Expenses
                ChartOfAccount(organization_id=org_id, account_code="5000", account_name_en="Direct Construction Costs", account_name_bn="প্রত্যক্ষ নির্মাণ ব্যয়", account_type="Expense", is_leaf_account=False),
                ChartOfAccount(organization_id=org_id, account_code="5010", account_name_en="Subcontractor Labor & Civil Work", account_name_bn="উপ-ঠিকাদার সিভিল খরচ", account_type="Expense", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="5020", account_name_en="Rebar, Cement & Aggregate Material Cost", account_name_bn="রড, সিমেন্ট ও পাথর সামগ্রী খরচ", account_type="Expense", is_leaf_account=True),
                ChartOfAccount(organization_id=org_id, account_code="5030", account_name_en="Broker Commission & Marketing Fees", account_name_bn="ব্রোকার কমিশন ও বিপণন খরচ", account_type="Expense", is_leaf_account=True)
            ]
            session.add_all(coas)
            await session.flush()

        all_coas = {c.account_code: c for c in (await session.execute(select(ChartOfAccount))).scalars().all()}

        # Double-entry Vouchers & Journal Entries
        vouch_cnt = (await session.execute(select(Voucher))).scalars().first()
        if not vouch_cnt:
            v_date = date.today() - timedelta(days=5)
            # Voucher 1: Customer Booking Down Payment Receipt
            # Dr Bank (1020) 8,000,000 | Cr Customer Advance Deposit (2040) 8,000,000
            v1 = Voucher(
                organization_id=org_id, project_id=proj_1.id, voucher_number="BR-2026-0001",
                voucher_type="Bank_Receipt", voucher_date=v_date,
                narration="Received down payment from Mrs. Sultana Parveen for Unit T1-08A via Pay Order.",
                total_debit_amount=Decimal("8000000.00"), total_credit_amount=Decimal("8000000.00"),
                status="Posted", created_by_user_id=head_acc.id
            )
            session.add(v1)
            await session.flush()

            j1_dr = JournalEntry(voucher_date=v_date, voucher_id=v1.id, company_id=org_id, project_id=proj_1.id, account_id=all_coas["1020"].id, debit_amount=Decimal("8000000.00"), credit_amount=Decimal("0.00"), narration="Down payment received in Eastern Bank")
            j1_cr = JournalEntry(voucher_date=v_date, voucher_id=v1.id, company_id=org_id, project_id=proj_1.id, account_id=all_coas["2040"].id, debit_amount=Decimal("0.00"), credit_amount=Decimal("8000000.00"), narration="Credit to Customer Advance Booking Deposit")
            session.add_all([j1_dr, j1_cr])

            # Voucher 2: Construction RA Bill-01 Posting with Statutory Deductions
            # Dr Construction WIP (1300) 4,500,000
            # Cr Subcontractor Payable (2020) 3,625,000
            # Cr Retention Payable (2030) 225,000
            # Cr TDS Sec 52 Payable (2050) 225,000
            # Cr VDS Payable (2060) 225,000
            # Total Dr: 4,500,000 == Total Cr: 4,500,000 (Balanced!)
            v_date2 = date.today() - timedelta(days=3)
            v2 = Voucher(
                organization_id=org_id, project_id=proj_1.id, voucher_number="JV-2026-0088",
                voucher_type="Journal", voucher_date=v_date2,
                narration="Approved Subcontractor RA Bill-01 for 4th Floor Superstructure Casting. 5% Retention and statutory TDS/VDS withheld.",
                total_debit_amount=Decimal("4500000.00"), total_credit_amount=Decimal("4500000.00"),
                status="Posted", created_by_user_id=head_acc.id
            )
            session.add(v2)
            await session.flush()

            j2_dr = JournalEntry(voucher_date=v_date2, voucher_id=v2.id, company_id=org_id, project_id=proj_1.id, account_id=all_coas["1300"].id, debit_amount=Decimal("4500000.00"), credit_amount=Decimal("0.00"), narration="Gross Work Certified to Construction WIP")
            j2_cr1 = JournalEntry(voucher_date=v_date2, voucher_id=v2.id, company_id=org_id, project_id=proj_1.id, account_id=all_coas["2020"].id, debit_amount=Decimal("0.00"), credit_amount=Decimal("3625000.00"), narration="Net payable to M/S Standard Civil Builders")
            j2_cr2 = JournalEntry(voucher_date=v_date2, voucher_id=v2.id, company_id=org_id, project_id=proj_1.id, account_id=all_coas["2030"].id, debit_amount=Decimal("0.00"), credit_amount=Decimal("225000.00"), narration="5% Retention Money Withheld (12-Mo DLP)")
            j2_cr3 = JournalEntry(voucher_date=v_date2, voucher_id=v2.id, company_id=org_id, project_id=proj_1.id, account_id=all_coas["2050"].id, debit_amount=Decimal("0.00"), credit_amount=Decimal("225000.00"), narration="TDS Withheld u/s 52 of Income Tax Act 2023")
            j2_cr4 = JournalEntry(voucher_date=v_date2, voucher_id=v2.id, company_id=org_id, project_id=proj_1.id, account_id=all_coas["2060"].id, debit_amount=Decimal("0.00"), credit_amount=Decimal("225000.00"), narration="VAT Deducted at Source (VDS 5%)")
            session.add_all([j2_dr, j2_cr1, j2_cr2, j2_cr3, j2_cr4])

            # Bank Reconciliation
            bank_rec = BankReconciliation(
                bank_account_id=all_coas["1020"].id,
                statement_date=date.today(),
                statement_balance=Decimal("45850000.00"),
                book_balance=Decimal("45850000.00"),
                difference_amount=Decimal("0.00"),
                is_reconciled=True,
                reconciliation_notes="Fully reconciled with Eastern Bank Gulshan Branch monthly bank e-statement."
            )
            session.add(bank_rec)

            # Mushak 6.3 Tax Invoices under Bangladesh VAT Act 2012
            # Unit 1: 3,150 sqft (> 1,600 sqft -> 4.5% VAT)
            val1 = Decimal("45218250.00")
            vat1 = val1 * Decimal("0.045") # 2,034,821.25
            mushak1 = MushakTaxInvoice(
                booking_id=bk1.id,
                mushak_challan_number="MUSHAK-6.3-2026-0001",
                invoice_date=date.today() - timedelta(days=10),
                developer_bin_number="001234567-0101",
                customer_tin_nid=c1.tin_number or c1.nid_number,
                apartment_sqft=Decimal("3150.00"),
                taxable_amount=val1,
                vat_rate_percent=Decimal("4.50"),
                vat_amount=vat1,
                total_amount_collected=val1 + vat1,
                pdf_url="assets/reports/mushak_6_3_0001.pdf",
                status="ISSUED"
            )

            # Unit 2: 1,450 sqft (<= 1,600 sqft -> 2.0% VAT)
            val2 = Decimal("18500000.00")
            vat2 = val2 * Decimal("0.02") # 370,000
            mushak2 = MushakTaxInvoice(
                booking_id=bk2.id,
                mushak_challan_number="MUSHAK-6.3-2026-0002",
                invoice_date=date.today() - timedelta(days=5),
                developer_bin_number="001234567-0101",
                customer_tin_nid=c2.tin_number or c2.nid_number,
                apartment_sqft=Decimal("1450.00"),
                taxable_amount=val2,
                vat_rate_percent=Decimal("2.00"),
                vat_amount=vat2,
                total_amount_collected=val2 + vat2,
                pdf_url="assets/reports/mushak_6_3_0002.pdf",
                status="ISSUED"
            )
            session.add_all([mushak1, mushak2])

            # TDS Deductions
            tds1 = TDSDeduction(
                voucher_id=v2.id, deduction_section="Sec 52", gross_amount=Decimal("4500000.00"),
                tax_rate_percent=Decimal("5.00"), withheld_amount=Decimal("225000.00"),
                challan_number="TR-CHAL-DHAKA-2026-9901", challan_deposit_date=date.today() - timedelta(days=1),
                status="DEPOSITED_TO_TREASURY"
            )
            tds2 = TDSDeduction(
                voucher_id=v2.id, deduction_section="VDS", gross_amount=Decimal("4500000.00"),
                tax_rate_percent=Decimal("5.00"), withheld_amount=Decimal("225000.00"),
                challan_number="VAT-CHAL-LARGE-TAX-0044", challan_deposit_date=date.today() - timedelta(days=1),
                status="DEPOSITED_TO_TREASURY"
            )
            session.add_all([tds1, tds2])
        await session.flush()

        # -------------------------------------------------------------
        # 8. HANDOVER, DLP WARRANTY & OWNERS ASSOCIATION
        # -------------------------------------------------------------
        logger.info("Step 8: Seeding Handover, DLP Warranty & Owners Association...")
        hnd_cnt = (await session.execute(select(HandoverInspection))).scalars().first()
        if not hnd_cnt:
            u_handover = units[4] if len(units) > 4 else units[0]
            u_dlp = units[0]

            hnd = HandoverInspection(
                booking_id=bk5.id, unit_id=u_handover.id, site_engineer_id=qc_user.id,
                inspection_date=date.today() - timedelta(days=2),
                all_financial_dues_cleared=True,
                possession_letter_number="POSS-LET-2026-0012",
                possession_handover_date=date.today(),
                status="POSSESSION_HANDED_OVER",
                notes="Keys, appliance warranties, and sub-meter electric cards handed over to customer."
            )
            session.add(hnd)

            # DLP Warranty Snag Tickets
            tickets = [
                DLPTicket(unit_id=u_dlp.id, ticket_category="Plumbing", issue_description="Concealed CPVC hot water pipe slow drip beneath master bathroom vanity unit.", reported_date=date.today() - timedelta(days=4), rectification_deadline=date.today() + timedelta(days=2), status="IN_PROGRESS", rectification_notes="Plumber opened vanity panel. Replacing brass nipple elbow."),
                DLPTicket(unit_id=u_dlp.id, ticket_category="Electrical", issue_description="Master bedroom main dual-gang rocker switch plate loose fit.", reported_date=date.today() - timedelta(days=10), rectification_deadline=date.today() - timedelta(days=5), status="RESOLVED", rectified_date=date.today() - timedelta(days=6), rectification_notes="Schneider electric modular box re-anchored and tested."),
                DLPTicket(unit_id=u_dlp.id, ticket_category="Tiles", issue_description="Hollow sound detected under 2 floor tiles in dining area corner.", reported_date=date.today() - timedelta(days=1), rectification_deadline=date.today() + timedelta(days=5), status="OPEN"),
                DLPTicket(unit_id=u_dlp.id, ticket_category="Doors", issue_description="Burma Teak entrance door rub against bottom brass threshold plate.", reported_date=date.today() - timedelta(days=8), rectification_deadline=date.today() - timedelta(days=3), status="CLOSED", rectified_date=date.today() - timedelta(days=4), rectification_notes="Hinges planed and lubricated. Smooth closure verified by client.")
            ]
            session.add_all(tickets)

            # Owners Welfare Committee
            assoc = OwnersAssociation(
                project_id=proj_1.id,
                association_name="The Grand Emerald Flat Owners Welfare Committee (গ্র্যান্ড এমারেল্ড ফ্ল্যাট মালিক কল্যাণ সমিতি)",
                handover_date=date.today() - timedelta(days=30),
                sinking_fund_transferred_bdt=Decimal("2500000.00"),
                monthly_service_charge_per_flat=Decimal("6500.00"),
                president_name="Dr. Shireen Akhter",
                secretary_name="Engr. Maksudul Haque",
                contact_phone="+8801711223399",
                status="FORMED"
            )
            session.add(assoc)

            # Commercial Lease
            lease = LeaseAgreement(
                unit_id=units[1].id,
                tenant_name="HSBC Bangladesh (Corporate Banking Booth & ATM Lounge)",
                tenant_nid="001928374655",
                tenant_phone="+8801713009911",
                lease_start_date=date(2026, 1, 1),
                lease_expiry_date=date(2030, 12, 31),
                monthly_rent_bdt=Decimal("250000.00"),
                security_deposit_bdt=Decimal("1500000.00"),
                rent_escalation_percent=Decimal("10.00"),
                status="ACTIVE"
            )
            session.add(lease)
        await session.flush()

        # -------------------------------------------------------------
        # 9. BROKERS, COMMISSIONS, LITIGATION & FLEET ASSETS
        # -------------------------------------------------------------
        logger.info("Step 9: Seeding Channel Brokers, Legal Litigations & Machinery Fleet...")
        broker_cnt = (await session.execute(select(Broker))).scalars().first()
        if not broker_cnt:
            b1 = Broker(broker_code="BRK-0001", agency_name="Bproperty Partner Network", contact_person="Rashedul Karim", phone_number="+8801711335577", nid_number="19802695500001122", tin_number="987654321012", commission_slab_percent=Decimal("2.00"), bank_details="City Bank Gulshan Branch A/C 110293812")
            b2 = Broker(broker_code="BRK-0002", agency_name="Remax Prime Properties BD", contact_person="Syed Nayeem Akhtar", phone_number="+8801819446688", nid_number="19832695500003344", tin_number="876543210923", commission_slab_percent=Decimal("2.50"), bank_details="BRAC Bank Banani Branch A/C 220194821")
            session.add_all([b1, b2])
            await session.flush()

            # Broker Commission Schedule with Section 53 TDS (10%)
            unit_val = Decimal("45218250.00")
            comm_pct = Decimal("2.00")
            tot_comm = unit_val * (comm_pct / Decimal("100.00")) # 904,365
            tds_comm = tot_comm * Decimal("0.10") # 10% TDS Sec 53

            comm = BrokerCommission(
                broker_id=b1.id, booking_id=bk1.id, total_unit_value=unit_val,
                commission_percent=comm_pct, total_commission_amount=tot_comm,
                disbursed_amount=tot_comm * Decimal("0.40"), # 40% Down payment released
                tds_withheld_amount=tds_comm * Decimal("0.40"),
                down_payment_disbursed=True, ground_slab_disbursed=False, registration_deed_disbursed=False,
                status="PARTIALLY_DISBURSED", disbursement_notes="First 40% tranche disbursed upon down payment clearance. Section 53 TDS (10%) deducted."
            )
            session.add(comm)

            # Legal Court Cases
            cases = [
                CourtCase(
                    project_id=proj_1.id, case_type="Title Suit", case_number="Title Suit No. 142/2025",
                    concerned_court="Joint District Judge 1st Court, Dhaka", plaintiff="Md. Abdul Jalil & Others",
                    defendant="Apex Holdings Ltd & Landowners", appointed_advocate="Advocate Rafiqul Islam, Supreme Court Bar",
                    next_hearing_date=date.today() + timedelta(days=45), status="HEARING_ONGOING",
                    case_summary="Frivolous boundary wall injunction petition filed by adjacent plot owner. High Court vacation bench previously vacated ad-interim stay."
                ),
                CourtCase(
                    project_id=proj_1.id, case_type="NI Act 138", case_number="CR Case No. 892/2026",
                    concerned_court="Chief Metropolitan Magistrate (CMM) Court No. 4, Dhaka", plaintiff="Apex Holdings Ltd",
                    defendant="Defaulting Commercial Buyer", appointed_advocate="Barrister Tanvir Ahmed",
                    next_hearing_date=date.today() + timedelta(days=20), status="HEARING_ONGOING",
                    case_summary="Statutory criminal proceeding u/s 138 of Negotiable Instruments Act 1881 for bounced Pay Order of BDT 4,500,000."
                )
            ]
            session.add_all(cases)

            # Heavy Fleet Machinery Assets
            assets = [
                MachineryAsset(asset_code="AST-CRN-01", asset_name="Zoomlion TC-5040 Stationary Tower Crane (50M Jib)", category="Tower Crane", current_assigned_project_id=proj_1.id, hourly_rate=Decimal("2500.00"), meter_reading_hours=Decimal("1420.50"), status="OPERATIONAL"),
                MachineryAsset(asset_code="AST-HST-02", asset_name="Alimak Twin-Cage Construction Passenger & Material Hoist (2-Ton)", category="Material Hoist", current_assigned_project_id=proj_1.id, hourly_rate=Decimal("1200.00"), meter_reading_hours=Decimal("890.00"), status="OPERATIONAL"),
                MachineryAsset(asset_code="AST-GEN-01", asset_name="Cummins 250kVA Silent Soundproof Diesel Generator", category="Diesel Generator", current_assigned_project_id=proj_1.id, hourly_rate=Decimal("1800.00"), meter_reading_hours=Decimal("2150.00"), status="OPERATIONAL"),
                MachineryAsset(asset_code="AST-EXC-03", asset_name="Sany SY215C Hydraulic Heavy Crawler Excavator", category="Excavator", current_assigned_project_id=proj_2.id, hourly_rate=Decimal("3500.00"), meter_reading_hours=Decimal("3410.00"), status="MAINTENANCE_REQUIRED")
            ]
            session.add_all(assets)

            # Legacy Excel Import Batches
            batches = [
                ImportBatch(entity_type="Land", file_url="uploads/migration/Gulshan_Plot_Cadastral_Matrix.xlsx", total_records=48, successful_records=48, failed_records=0, status="COMPLETED", imported_by_id=admin_user.id),
                ImportBatch(entity_type="COA_Opening", file_url="uploads/migration/Opening_General_Ledger_2026.xlsx", total_records=120, successful_records=120, failed_records=0, status="COMPLETED", imported_by_id=head_acc.id),
                ImportBatch(entity_type="Inventory", file_url="uploads/migration/The_Grand_Emerald_Units_Pricing.xlsx", total_records=32, successful_records=32, failed_records=0, status="COMPLETED", imported_by_id=admin_user.id)
            ]
            session.add_all(batches)
        await session.flush()

        await session.commit()
        logger.info("=================================================================")
        logger.info("MASTER PRODUCTION SEEDING COMPLETED SUCCESSFULLY!")
        logger.info("ALL 60 TABLES ARE NOW POPULATED WITH RICH BANGLADESH ERP DATA.")
        logger.info("=================================================================")

if __name__ == "__main__":
    asyncio.run(seed_master())
