from sqlalchemy import Column, BigInteger, Integer, String, Date, Numeric, Boolean, Text, ForeignKey, TIMESTAMP, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.modules.projects.models import Project, Tower
from app.modules.inventory.models import Unit
from app.modules.sales.models import Booking
from app.modules.crm.models import Customer
from app.modules.installments.models import CustomerInstallment, MoneyReceipt
from app.modules.auth.models import User


class ConstructionProgressUpdate(Base):
    """
    Weekly site progress updates and photo gallery entries for building transparency.
    Site engineers log progress % and photo galleries accessible directly by flat owners.
    """
    __tablename__ = "portal_construction_updates"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    update_title = Column(String(191), nullable=False) # e.g. "9th Floor Roof Casting & Electrical Conduit Laying"
    update_date = Column(Date, nullable=False, default=func.current_date(), index=True)
    week_number = Column(Integer, nullable=False, default=1) # e.g. Week 42
    completion_percentage = Column(Numeric(5, 2), nullable=False, default=0.00) # e.g. 68.50%
    milestone_phase = Column(String(64), nullable=False, default="SUPER_STRUCTURE") # SUB_STRUCTURE, SUPER_STRUCTURE, BRICK_WORK, FINISHING, EXTERIOR_FACADE
    engineer_notes = Column(Text, nullable=True)
    
    # Photo gallery array: [{"url": "...", "caption": "North elevation concrete pour", "uploaded_at": "..."}]
    photos_json = Column(JSON, nullable=True)

    posted_by_engineer_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), nullable=False, default="PUBLISHED", index=True) # PUBLISHED, DRAFT

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project")
    tower = relationship("Tower")
    engineer = relationship("User")


class CustomerServiceTicket(Base):
    """
    Flat owner snag, maintenance, and support requests.
    Enables buyers to log defects, attach photos, and monitor SLA resolution in real-time.
    """
    __tablename__ = "portal_service_tickets"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ticket_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. "TKT-2026-0042"
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Category: CIVIL_STRUCTURE, PAINT_FINISH, PLUMBING_SANITARY, ELECTRICAL_FIXTURES, TILES_FLOORING, DOORS_WINDOWS, WATERPROOFING, GENERAL_MAINTENANCE
    category = Column(String(64), nullable=False, default="GENERAL_MAINTENANCE", index=True)
    title = Column(String(191), nullable=False)
    description = Column(Text, nullable=False)
    location_in_unit = Column(String(128), nullable=True) # e.g. "Master Bathroom ceiling", "Kitchen sink drain"
    
    # Urgency: NORMAL, URGENT, EMERGENCY
    urgency = Column(String(32), nullable=False, default="NORMAL", index=True)
    attachment_photo_url = Column(String(512), nullable=True)
    
    # Status: SUBMITTED, ACKNOWLEDGED, ASSIGNED_TO_ENGINEER, WORK_IN_PROGRESS, RESOLVED, CLOSED
    status = Column(String(32), nullable=False, default="SUBMITTED", index=True)
    assigned_engineer_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    customer = relationship("Customer")
    booking = relationship("Booking")
    unit = relationship("Unit")
    assigned_engineer = relationship("User")


class OnlinePaymentIntent(Base):
    """
    Digital payment checkout session and gateway reconciliation for flat owner installments.
    Integrates bKash, Nagad, SSLCommerz, and Bank Gateway transfers.
    """
    __tablename__ = "portal_online_payments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    transaction_reference = Column(String(64), unique=True, nullable=False, index=True) # e.g. "TXN-BKASH-2026-99120"
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    installment_id = Column(BigInteger, ForeignKey("sls_customer_installments.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Gateway: BKASH, NAGAD, SSLCOMMERZ, VISA_MASTERCARD, CITY_TOUCH
    payment_gateway = Column(String(32), nullable=False, default="BKASH", index=True)
    amount_bdt = Column(Numeric(14, 2), nullable=False)
    gateway_fee_bdt = Column(Numeric(10, 2), nullable=False, default=0.00)
    gateway_transaction_id = Column(String(128), nullable=True, index=True)
    payer_mobile = Column(String(32), nullable=True)
    
    # Status: INITIATED, SUCCESS, FAILED, CANCELLED
    gateway_status = Column(String(32), nullable=False, default="INITIATED", index=True)
    generated_money_receipt_id = Column(BigInteger, ForeignKey("sls_money_receipts.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    booking = relationship("Booking")
    installment = relationship("CustomerInstallment")
    customer = relationship("Customer")
    money_receipt = relationship("MoneyReceipt")
