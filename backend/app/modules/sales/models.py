from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project
from app.modules.inventory.models import Unit
from app.modules.crm.models import Customer
from app.modules.auth.models import User

class Booking(Base):
    """
    Sales Booking Master record for apartment, commercial, and parking units.
    Tracks contract value, earnest money, multi-level discount approvals, and statutory statuses.
    """
    __tablename__ = "sls_bookings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_reference_no = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'BK-2026-0089'
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    primary_customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    booking_date = Column(Date, nullable=False, default=func.current_date())
    
    # Financial Terms
    base_unit_price = Column(Numeric(14, 2), nullable=False) # Undiscounted list price
    discount_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    discount_percentage = Column(Numeric(5, 2), nullable=False, default=0.00)
    
    # Required Approval Tier: 'SALES_MANAGER' (<= 1%), 'DIRECTOR' (<= 3%), 'MANAGING_DIRECTOR' (> 3%)
    required_approval_tier = Column(String(64), nullable=False, default="SALES_MANAGER")
    # Status: 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'
    discount_approval_status = Column(String(32), nullable=False, default="APPROVED")
    discount_approved_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    discount_approval_notes = Column(Text, nullable=True)

    final_contract_value = Column(Numeric(14, 2), nullable=False) # base_price - discount
    earnest_money_received = Column(Numeric(14, 2), nullable=False, default=0.00)
    down_payment_total = Column(Numeric(14, 2), nullable=False, default=0.00)
    
    # Lifecycle: 'PROVISIONAL', 'AGREEMENT_SIGNED', 'REGISTRATION_DONE', 'CANCELLED', 'TRANSFERRED'
    status = Column(String(32), nullable=False, default="PROVISIONAL", index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project")
    unit = relationship("Unit")
    customer = relationship("Customer")
    discount_approved_by = relationship("User")
    cancellation = relationship("BookingCancellation", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    transfers = relationship("UnitTransfer", back_populates="booking", cascade="all, delete-orphan")


class BookingCancellation(Base):
    """
    Statutory Apartment Allotment Cancellation under Bangladesh Real Estate Act (REHAB statutory norms).
    Enforces deduction/forfeiture rules and net refund schedules.
    """
    __tablename__ = "sls_booking_cancellations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    cancellation_date = Column(Date, nullable=False, default=func.current_date())
    cancellation_reason = Column(Text, nullable=False)
    
    total_paid = Column(Numeric(14, 2), nullable=False, default=0.00) # Cumulative collections to date
    forfeiture_deduction_percentage = Column(Numeric(5, 2), nullable=False, default=10.00) # REHAB statutory standard deduction
    forfeiture_deduction_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    net_refund_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    
    # Status: 'REQUESTED', 'APPROVED', 'REFUNDED', 'SETTLED'
    status = Column(String(32), nullable=False, default="REQUESTED", index=True)
    refund_cheque_no = Column(String(64), nullable=True)
    settlement_notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking", back_populates="cancellation")


class UnitTransfer(Base):
    """
    Sub-Registry Apartment Mutation & Ownership Transfer between buyers.
    """
    __tablename__ = "sls_unit_transfers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    from_customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False)
    to_customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False)
    transfer_date = Column(Date, nullable=False, default=func.current_date())
    
    transfer_fee_bdt = Column(Numeric(14, 2), nullable=False, default=0.00) # Developer transfer NOC charges
    transfer_memo_no = Column(String(64), nullable=True)
    approval_status = Column(String(32), nullable=False, default="COMPLETED")
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    booking = relationship("Booking", back_populates="transfers")
    from_customer = relationship("Customer", foreign_keys=[from_customer_id])
    to_customer = relationship("Customer", foreign_keys=[to_customer_id])
