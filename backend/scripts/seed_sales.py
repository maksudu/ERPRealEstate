import asyncio
import logging
from datetime import date
from sqlalchemy.future import select
from app.core.database import engine, Base, AsyncSessionLocal
import app.modules.sales.models
from app.modules.sales.models import Booking, BookingCancellation, UnitTransfer
from app.modules.projects.models import Project
from app.modules.inventory.models import Unit
from app.modules.crm.models import Customer
from app.modules.auth.models import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_sales")

async def seed_sales_data():
    logger.info("Initializing database schema for Sales tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if bookings exist
        check = await session.execute(select(Booking))
        if check.scalars().first():
            logger.info("Sales bookings data already seeded. Skipping.")
            return

        # Fetch required dependencies
        projects = (await session.execute(select(Project).order_by(Project.id.asc()))).scalars().all()
        units = (await session.execute(select(Unit).order_by(Unit.id.asc()))).scalars().all()
        customers = (await session.execute(select(Customer).order_by(Customer.id.asc()))).scalars().all()
        users = (await session.execute(select(User).order_by(User.id.asc()))).scalars().all()

        if not projects or not units or not customers:
            logger.error("Required Projects, Units, or Customers not found. Seed them first.")
            return

        proj = projects[0]
        cust_1 = customers[0]
        cust_2 = customers[1] if len(customers) > 1 else customers[0]
        user_admin = users[0] if users else None

        logger.info(f"Using Project: {proj.project_name}, Customers: {cust_1.full_name_en}, Units: {len(units)}")

        # Booking 1: Standard Booking with <= 1% discount (Sales Manager Tier - Approved)
        unit_1 = units[0]
        base_1 = float(unit_1.total_unit_price or 15000000.0)
        disc_1 = base_1 * 0.01 # 1.0% discount
        final_1 = base_1 - disc_1
        unit_1.status_id = "BOOKED"

        booking_1 = Booking(
            booking_reference_no="BK-2026-0001",
            project_id=proj.id,
            unit_id=unit_1.id,
            primary_customer_id=cust_1.id,
            booking_date=date(2026, 9, 15),
            base_unit_price=base_1,
            discount_amount=disc_1,
            discount_percentage=1.00,
            required_approval_tier="SALES_MANAGER",
            discount_approval_status="APPROVED",
            discount_approved_by_id=user_admin.id if user_admin else None,
            discount_approval_notes="Approved under Sales Manager standard festival discount policy.",
            final_contract_value=final_1,
            earnest_money_received=1000000.00,
            down_payment_total=2500000.00,
            status="AGREEMENT_SIGNED",
            notes="Agreement executed on non-judicial stamp. Down payment received."
        )

        # Booking 2: High Discount > 1% and <= 3% (Director Tier - Pending Approval)
        unit_2 = units[1] if len(units) > 1 else unit_1
        base_2 = float(unit_2.total_unit_price or 18000000.0)
        disc_2 = base_2 * 0.025 # 2.5% discount
        final_2 = base_2 - disc_2
        unit_2.status_id = "BOOKED"

        booking_2 = Booking(
            booking_reference_no="BK-2026-0002",
            project_id=proj.id,
            unit_id=unit_2.id,
            primary_customer_id=cust_2.id,
            booking_date=date(2026, 10, 1),
            base_unit_price=base_2,
            discount_amount=disc_2,
            discount_percentage=2.50,
            required_approval_tier="DIRECTOR",
            discount_approval_status="PENDING_APPROVAL",
            final_contract_value=final_2,
            earnest_money_received=500000.00,
            down_payment_total=0.00,
            status="PROVISIONAL",
            notes="High net-worth corporate executive requesting 2.5% volume purchase discount."
        )

        # Booking 3: Exceptional Discount > 3% (Managing Director Tier - Pending MD Biometric Approval)
        unit_3 = units[2] if len(units) > 2 else unit_1
        base_3 = float(unit_3.total_unit_price or 22000000.0)
        disc_3 = base_3 * 0.045 # 4.5% discount
        final_3 = base_3 - disc_3
        unit_3.status_id = "BOOKED"

        booking_3 = Booking(
            booking_reference_no="BK-2026-0003",
            project_id=proj.id,
            unit_id=unit_3.id,
            primary_customer_id=cust_1.id,
            booking_date=date(2026, 10, 8),
            base_unit_price=base_3,
            discount_amount=disc_3,
            discount_percentage=4.50,
            required_approval_tier="MANAGING_DIRECTOR",
            discount_approval_status="PENDING_APPROVAL",
            final_contract_value=final_3,
            earnest_money_received=1500000.00,
            down_payment_total=0.00,
            status="PROVISIONAL",
            notes="Duplex penthouse unit booking. Requires MD 1-Tap Biometric Approval."
        )

        # Booking 4: Cancelled Booking with REHAB 10% Forfeiture Deduction
        unit_4 = units[3] if len(units) > 3 else unit_1
        base_4 = float(unit_4.total_unit_price or 14000000.0)
        unit_4.status_id = "AVAILABLE" # Restored to available upon cancellation

        booking_4 = Booking(
            booking_reference_no="BK-2026-0004",
            project_id=proj.id,
            unit_id=unit_4.id,
            primary_customer_id=cust_2.id,
            booking_date=date(2026, 8, 10),
            base_unit_price=base_4,
            discount_amount=0.00,
            discount_percentage=0.00,
            required_approval_tier="SALES_MANAGER",
            discount_approval_status="APPROVED",
            final_contract_value=base_4,
            earnest_money_received=500000.00,
            down_payment_total=1000000.00, # Total paid = 1,500,000
            status="CANCELLED",
            notes="Applicant relocation abroad. Requested full cancellation under REHAB Act."
        )
        session.add_all([booking_1, booking_2, booking_3, booking_4])
        await session.flush()

        # Seed Cancellation Record
        cancellation = BookingCancellation(
            booking_id=booking_4.id,
            cancellation_date=date(2026, 9, 20),
            cancellation_reason="Personal relocation abroad. Unable to service construction milestone installments.",
            total_paid=1500000.00,
            forfeiture_deduction_percentage=10.00,
            forfeiture_deduction_amount=150000.00,
            net_refund_amount=1350000.00,
            status="APPROVED",
            refund_cheque_no="CHQ-SCB-8839210",
            settlement_notes="Account Payee Cheque issued after statutory 10% deduction."
        )
        session.add(cancellation)

        await session.commit()
        logger.info("Successfully seeded Sales Bookings, Discount tiers, and Cancellation records!")

if __name__ == "__main__":
    asyncio.run(seed_sales_data())
