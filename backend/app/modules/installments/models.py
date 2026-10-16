from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.sales.models import Booking
from app.modules.crm.models import Customer

class CustomerInstallment(Base):
    """
    Installment Schedule milestones for property buyers.
    Supports monthly, quarterly, and construction-milestone payment triggers with late fee accrual.
    """
    __tablename__ = "sls_customer_installments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    installment_no = Column(Integer, nullable=False)
    title = Column(String(191), nullable=False) # e.g. "Down Payment", "1st Floor Roof Casting", "Installment #04"
    due_date = Column(Date, nullable=False, index=True)
    grace_period_days = Column(Integer, nullable=False, default=15)
    payable_amount = Column(Numeric(14, 2), nullable=False)
    paid_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    late_fee_accrued = Column(Numeric(14, 2), nullable=False, default=0.00)
    # Status: 'UPCOMING', 'DUE', 'PAID', 'OVERDUE'
    status = Column(String(32), nullable=False, default="UPCOMING", index=True)
    milestone_trigger = Column(String(128), nullable=True) # e.g. "ROOF_CASTING_L4", "PLASTER_WORK"

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking")


class PDCVault(Base):
    """
    Post-Dated Cheque (PDC) Vault & Safe Deposit System.
    Physical barcode pouch tracking, bank clearing pipeline, and bounce/dishonour records.
    """
    __tablename__ = "sls_pdc_vault"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    cheque_number = Column(String(64), nullable=False, index=True)
    bank_name = Column(String(128), nullable=False)
    branch_name = Column(String(128), nullable=False)
    routing_number = Column(String(32), nullable=True)
    maturity_date = Column(Date, nullable=False, index=True)
    cheque_amount = Column(Numeric(14, 2), nullable=False)
    pouch_barcode = Column(String(64), unique=True, nullable=False, index=True) # e.g. "PDC-VAULT-2026-9921"
    
    # Status: 'IN_VAULT', 'SENT_TO_BANK', 'HONOURED', 'DISHONOURED_BOUNCED'
    status = Column(String(32), nullable=False, default="IN_VAULT", index=True)
    dishonour_memo_date = Column(Date, nullable=True)
    dishonour_reason = Column(String(255), nullable=True) # e.g. "Insufficient Funds", "Signature Differs"
    sms_reminder_sent = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking")
    customer = relationship("Customer")
    legal_action = relationship("NI138LegalAction", back_populates="pdc_cheque", uselist=False, cascade="all, delete-orphan")


class NI138LegalAction(Base):
    """
    Negotiable Instruments Act 1881 Section 138 Statutory Litigation Engine.
    Automates 30-day statutory legal notice generation, delivery tracking (Registered Post with A/D),
    30-day settlement window, and Chief Metropolitan Magistrate (CMM) court case filing.
    """
    __tablename__ = "sls_ni138_legal_actions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pdc_cheque_id = Column(BigInteger, ForeignKey("sls_pdc_vault.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    dishonour_memo_received_date = Column(Date, nullable=False)
    
    # Under Section 138, notice must be dispatched within 30 days of receiving bank dishonour memo
    statutory_notice_deadline_date = Column(Date, nullable=False)
    notice_served_to_client_date = Column(Date, nullable=True)
    registered_post_ad_no = Column(String(64), nullable=True) # e.g. "REG-AD-DHAKA-GPO-4482"
    
    # 30 days from date of notice receipt by client to pay before criminal liability attaches
    client_30day_settlement_deadline = Column(Date, nullable=True)
    
    # Status: 'NOTICE_PENDING', 'NOTICE_SERVED', 'SETTLED', 'COURT_CASE_FILED'
    status = Column(String(32), nullable=False, default="NOTICE_PENDING", index=True)
    court_case_no = Column(String(64), nullable=True) # e.g. "CR Case No. 892/2026 (CMM Court, Dhaka)"
    legal_counsel_name = Column(String(128), nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    pdc_cheque = relationship("PDCVault", back_populates="legal_action")
