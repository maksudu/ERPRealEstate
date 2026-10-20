from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from app.core.database import Base


class MobileSalesLead(Base):
    """
    Mobile Sales App - Lead Management
    """
    __tablename__ = "mob_sales_leads"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lead_code = Column(String(64), unique=True, nullable=False, index=True)
    lead_name = Column(String(191), nullable=False)
    phone = Column(String(32), nullable=False, index=True)
    email = Column(String(128), nullable=True)
    lead_source = Column(String(64), nullable=False, default="FACEBOOK_ADS", index=True)
    status = Column(String(32), nullable=False, default="NEW", index=True)
    assigned_sales_rep_name = Column(String(128), nullable=True, default="Ashraful Alam")
    assigned_sales_rep_id = Column(BigInteger, nullable=True, index=True)
    interested_project = Column(String(191), nullable=True, default="BlueOceans Marina Bay")
    budget_bdt = Column(Numeric(14, 2), nullable=True, default=25000000.00)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSalesCustomer(Base):
    """
    Mobile Sales App - Customer Profile & Interaction History
    """
    __tablename__ = "mob_sales_customers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    customer_code = Column(String(64), unique=True, nullable=False, index=True)
    full_name = Column(String(191), nullable=False)
    phone = Column(String(32), nullable=False, index=True)
    email = Column(String(128), nullable=True)
    nid_number = Column(String(64), nullable=True, index=True)
    present_address = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    interaction_history = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSalesProperty(Base):
    """
    Mobile Sales App - Projects, Towers, Units & Real-time Availability
    """
    __tablename__ = "mob_sales_properties"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_name = Column(String(191), nullable=False, index=True)
    location = Column(String(191), nullable=False, default="Gulshan-2, Dhaka")
    tower_name = Column(String(64), nullable=False, default="Tower Alpha")
    floor_no = Column(String(32), nullable=False, default="Floor 12")
    unit_number = Column(String(64), nullable=False, index=True)
    size_sqft = Column(Numeric(10, 2), nullable=False, default=2250.00)
    unit_type = Column(String(64), nullable=False, default="4BHK Premium")
    parking_slots = Column(Integer, nullable=False, default=2)
    price_per_sqft = Column(Numeric(12, 2), nullable=False, default=14500.00)
    total_price = Column(Numeric(14, 2), nullable=False, default=32625000.00)
    availability_status = Column(String(32), nullable=False, default="AVAILABLE", index=True)
    apartment_plans_url = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSalesQuotation(Base):
    """
    Mobile Sales App - Price per sqft, unit pricing, discounts & quotation PDF
    """
    __tablename__ = "mob_sales_quotations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    quotation_no = Column(String(64), unique=True, nullable=False, index=True)
    customer_name = Column(String(191), nullable=False)
    customer_phone = Column(String(32), nullable=False)
    project_name = Column(String(191), nullable=False)
    unit_number = Column(String(64), nullable=False)
    size_sqft = Column(Numeric(10, 2), nullable=False, default=2100.00)
    rate_per_sqft = Column(Numeric(12, 2), nullable=False, default=13500.00)
    base_price = Column(Numeric(14, 2), nullable=False, default=28350000.00)
    parking_charge = Column(Numeric(14, 2), nullable=False, default=1000000.00)
    utility_charge = Column(Numeric(14, 2), nullable=False, default=500000.00)
    discount_percent = Column(Numeric(5, 2), nullable=False, default=2.50)
    discount_amount = Column(Numeric(14, 2), nullable=False, default=708750.00)
    net_payable = Column(Numeric(14, 2), nullable=False, default=29141250.00)
    validity_date = Column(Date, nullable=True)
    status = Column(String(32), nullable=False, default="OFFERED", index=True)
    pdf_url = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSalesSiteVisit(Base):
    """
    Mobile Sales App - Appointment scheduling, status & reminders
    """
    __tablename__ = "mob_sales_site_visits"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    visit_code = Column(String(64), unique=True, nullable=False, index=True)
    customer_name = Column(String(191), nullable=False)
    customer_phone = Column(String(32), nullable=False)
    project_name = Column(String(191), nullable=False)
    unit_number = Column(String(64), nullable=True)
    sales_executive = Column(String(128), nullable=False, default="Ashraful Alam")
    scheduled_at = Column(TIMESTAMP, nullable=False, index=True)
    status = Column(String(32), nullable=False, default="SCHEDULED", index=True)
    feedback = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    reminder_sent = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSalesBooking(Base):
    """
    Mobile Sales App - Reservation requests, booking amounts & installment plans
    """
    __tablename__ = "mob_sales_bookings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_no = Column(String(64), unique=True, nullable=False, index=True)
    customer_name = Column(String(191), nullable=False)
    customer_phone = Column(String(32), nullable=False)
    project_name = Column(String(191), nullable=False)
    unit_number = Column(String(64), nullable=False)
    booking_date = Column(Date, nullable=False)
    reservation_status = Column(String(32), nullable=False, default="REQUESTED", index=True)
    booking_amount = Column(Numeric(14, 2), nullable=False, default=1000000.00)
    installment_plan_months = Column(Integer, nullable=False, default=36)
    documents_count = Column(Integer, nullable=False, default=3)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSalesApproval(Base):
    """
    Mobile Sales App - Discount approval, booking approval & cancellation requests
    """
    __tablename__ = "mob_sales_approvals"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    approval_code = Column(String(64), unique=True, nullable=False, index=True)
    request_type = Column(String(64), nullable=False, index=True) # DISCOUNT_APPROVAL, BOOKING_APPROVAL, CANCELLATION_REQUEST
    reference_code = Column(String(64), nullable=False, index=True)
    requested_by = Column(String(128), nullable=False)
    amount_involved = Column(Numeric(14, 2), nullable=False, default=0.00)
    status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, APPROVED, REJECTED
    remarks = Column(Text, nullable=True)
    approved_by = Column(String(128), nullable=True)
    decided_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class MobileSalesNotification(Base):
    """
    Mobile Sales App - Notifications for lead assignments, overdue follow-ups & approval results
    """
    __tablename__ = "mob_sales_notifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    notification_code = Column(String(64), unique=True, nullable=False, index=True)
    title = Column(String(191), nullable=False)
    notification_type = Column(String(64), nullable=False, index=True) # LEAD_ASSIGNMENT, OVERDUE_FOLLOWUP, APPROVAL_RESULT
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    recipient_name = Column(String(128), nullable=False, default="Sales Executive")

    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
