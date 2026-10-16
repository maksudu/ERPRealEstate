import asyncio
import logging
from datetime import date, timedelta
from sqlalchemy.future import select
from app.core.database import engine, Base, AsyncSessionLocal
import app.modules.installments.models
from app.modules.installments.models import CustomerInstallment, PDCVault, NI138LegalAction
from app.modules.sales.models import Booking
from app.modules.crm.models import Customer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_installments")

async def seed_installments_data():
    logger.info("Initializing database schema for Installment tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if installments already exist
        check = await session.execute(select(CustomerInstallment))
        if check.scalars().first():
            logger.info("Installment data already seeded. Skipping.")
            return

        bookings = (await session.execute(select(Booking).order_by(Booking.id.asc()))).scalars().all()
        customers = (await session.execute(select(Customer).order_by(Customer.id.asc()))).scalars().all()

        if not bookings or not customers:
            logger.error("Bookings or Customers not found. Seed them first.")
            return

        b1 = bookings[0]
        b2 = bookings[1] if len(bookings) > 1 else b1
        c1 = customers[0]
        c2 = customers[1] if len(customers) > 1 else c1

        # 1. Seed Customer Installments for Booking 1 (Construction Milestone Triggers)
        installments = [
            CustomerInstallment(
                booking_id=b1.id,
                installment_no=1,
                title="Milestone #01: Piling & Foundation Completion",
                due_date=date.today() - timedelta(days=60),
                grace_period_days=15,
                payable_amount=5000000.00,
                paid_amount=5000000.00,
                status="PAID",
                milestone_trigger="FOUNDATION_DONE"
            ),
            CustomerInstallment(
                booking_id=b1.id,
                installment_no=2,
                title="Milestone #02: Basement & Sub-Structure Casting",
                due_date=date.today() - timedelta(days=10),
                grace_period_days=15,
                payable_amount=5000000.00,
                paid_amount=0.00,
                late_fee_accrued=25000.00,
                status="DUE",
                milestone_trigger="BASEMENT_CASTING"
            ),
            CustomerInstallment(
                booking_id=b1.id,
                installment_no=3,
                title="Milestone #03: 4th Floor Roof Slab Casting",
                due_date=date.today() + timedelta(days=45),
                grace_period_days=15,
                payable_amount=5000000.00,
                paid_amount=0.00,
                status="UPCOMING",
                milestone_trigger="STRUCTURE_L4"
            ),
            CustomerInstallment(
                booking_id=b1.id,
                installment_no=4,
                title="Milestone #04: Brickwork & Internal Plastering",
                due_date=date.today() + timedelta(days=120),
                grace_period_days=15,
                payable_amount=5000000.00,
                paid_amount=0.00,
                status="UPCOMING",
                milestone_trigger="BRICKWORK_PLASTER"
            )
        ]
        session.add_all(installments)
        await session.flush()

        # 2. Seed PDC Cheque Vault Records
        pdc1 = PDCVault(
            booking_id=b1.id,
            customer_id=c1.id,
            cheque_number="CHQ-EB-994821",
            bank_name="Eastern Bank PLC",
            branch_name="Gulshan Branch",
            routing_number="095261120",
            maturity_date=date.today() + timedelta(days=3), # Target for 3-day SMS reminder cron
            cheque_amount=5000000.00,
            pouch_barcode="PDC-VAULT-2026-00001",
            status="IN_VAULT"
        )

        pdc2 = PDCVault(
            booking_id=b1.id,
            customer_id=c1.id,
            cheque_number="CHQ-EB-994822",
            bank_name="Eastern Bank PLC",
            branch_name="Gulshan Branch",
            routing_number="095261120",
            maturity_date=date.today() + timedelta(days=45),
            cheque_amount=5000000.00,
            pouch_barcode="PDC-VAULT-2026-00002",
            status="IN_VAULT"
        )

        # Cheque 3: Bounced / Dishonoured Cheque trigger for NI Act 138 Action
        pdc_bounced = PDCVault(
            booking_id=b2.id,
            customer_id=c2.id,
            cheque_number="CHQ-SCB-441198",
            bank_name="Standard Chartered Bank",
            branch_name="Uttara Branch",
            routing_number="215264881",
            maturity_date=date.today() - timedelta(days=15),
            cheque_amount=3500000.00,
            pouch_barcode="PDC-VAULT-2026-00003",
            status="DISHONOURED_BOUNCED",
            dishonour_memo_date=date.today() - timedelta(days=10),
            dishonour_reason="Insufficient Funds"
        )
        session.add_all([pdc1, pdc2, pdc_bounced])
        await session.flush()

        # 3. Seed Section 138 Statutory Legal Action for the Bounced Cheque
        legal_action = NI138LegalAction(
            pdc_cheque_id=pdc_bounced.id,
            dishonour_memo_received_date=date.today() - timedelta(days=10),
            statutory_notice_deadline_date=date.today() + timedelta(days=20), # 30 days from memo
            notice_served_to_client_date=date.today() - timedelta(days=4),
            registered_post_ad_no="REG-AD-DHAKA-GPO-88219",
            client_30day_settlement_deadline=date.today() + timedelta(days=26), # 30 days from notice served
            status="NOTICE_SERVED",
            legal_counsel_name="Barrister Tanvir Ahmed (Supreme Court)",
            remarks="Statutory Notice u/s 138 dispatched via Registered Post with A/D. Settlement deadline active."
        )
        session.add(legal_action)

        await session.commit()
        logger.info("Successfully seeded Customer Installments, PDC Vault, and Section 138 Litigation records!")

if __name__ == "__main__":
    asyncio.run(seed_installments_data())
