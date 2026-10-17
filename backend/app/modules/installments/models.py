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

    # Automated Surcharge & Alert Dispatch under Prompt 09
    surcharge_percentage = Column(Numeric(5, 2), nullable=False, default=2.00) # 2.0% per month on overdue
    overdue_days = Column(Integer, nullable=False, default=0)
    sms_alert_sent = Column(Boolean, nullable=False, default=False)
    whatsapp_alert_sent = Column(Boolean, nullable=False, default=False)
    last_alert_sent_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking")
    alerts = relationship("InstallmentAlertLog", back_populates="installment", cascade="all, delete-orphan")


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


class InstallmentAlertLog(Base):
    """
    Multi-Channel Installment Reminder & Due Date Dispatch Log.
    Tracks SMS, WhatsApp, and Email alerts dispatched to buyers with delivery status.
    """
    __tablename__ = "sls_installment_alerts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    installment_id = Column(BigInteger, ForeignKey("sls_customer_installments.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(32), nullable=False, default="SMS") # SMS, WHATSAPP, EMAIL
    recipient_phone = Column(String(32), nullable=True)
    recipient_email = Column(String(128), nullable=True)
    message_content = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="SENT") # SENT, DELIVERED, FAILED
    sent_at = Column(TIMESTAMP, server_default=func.now())

    installment = relationship("CustomerInstallment", back_populates="alerts")
    booking = relationship("Booking")
    customer = relationship("Customer")


class MoneyReceipt(Base):
    """
    Auto-Generated Statutory Money Receipt (MR) with QR Code Verification & SMS Confirmation.
    Accommodates multi-mode receipt: Cash, Cheque, Bank Transfer, BEFTN, RTGS, bKash, Nagad.
    """
    __tablename__ = "sls_money_receipts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    mr_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. MR-2026-0001
    receipt_date = Column(Date, nullable=False, index=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Multi-mode payment instrument details
    payment_mode = Column(String(32), nullable=False, default="CASH") # CASH, CHEQUE, BANK_TRANSFER, BEFTN, RTGS, BKASH, NAGAD
    instrument_no = Column(String(64), nullable=True) # Cheque number / Transaction ID / BEFTN reference
    instrument_date = Column(Date, nullable=True)
    bank_name = Column(String(128), nullable=True)
    branch_name = Column(String(128), nullable=True)

    # Financial Waterfall Allocations
    amount_received = Column(Numeric(14, 2), nullable=False)
    late_fee_adjusted = Column(Numeric(14, 2), nullable=False, default=0.00)
    installment_principal_adjusted = Column(Numeric(14, 2), nullable=False, default=0.00)
    excess_advance_amount = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Verification & Confirmation
    qr_verification_token = Column(String(255), unique=True, nullable=False, index=True)
    qr_code_payload = Column(Text, nullable=True)
    sms_confirmation_sent = Column(Boolean, nullable=False, default=False)
    sms_sent_at = Column(TIMESTAMP, nullable=True)
    gl_voucher_id = Column(BigInteger, nullable=True) # Linked to General Ledger voucher

    # Status: 'CLEARED', 'PENDING_CLEARANCE', 'BOUNCED_CANCELLED'
    status = Column(String(32), nullable=False, default="CLEARED", index=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking")
    customer = relationship("Customer")
    allocations = relationship("MoneyReceiptAllocation", back_populates="receipt", cascade="all, delete-orphan")


class MoneyReceiptAllocation(Base):
    """
    Granular Waterfall Adjustment: Maps money receipts to individual installments.
    Strictly applies payment first to late fees/surcharges, then to oldest overdue principal.
    """
    __tablename__ = "sls_money_receipt_allocations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    receipt_id = Column(BigInteger, ForeignKey("sls_money_receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    installment_id = Column(BigInteger, ForeignKey("sls_customer_installments.id", ondelete="CASCADE"), nullable=False, index=True)
    allocated_late_fee = Column(Numeric(14, 2), nullable=False, default=0.00)
    allocated_principal = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_allocated = Column(Numeric(14, 2), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    receipt = relationship("MoneyReceipt", back_populates="allocations")
    installment = relationship("CustomerInstallment")


class TripartiteLoan(Base):
    """
    Tripartite Agreement between Buyer, Developer, and Financial Institution (Bank / NBFI).
    Tracks Bank Sanction Letter, Developer NOC Issuance, and Multi-Tranche Disbursements.
    """
    __tablename__ = "sls_tripartite_loans"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    loan_reference_no = Column(String(64), unique=True, nullable=False, index=True) # e.g. "TRP-DBH-2026-001"
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)

    financial_institution_code = Column(String(64), nullable=False) # e.g. DBH_FINANCE, IDLC, SCB, CITY_BANK, BRAC_BANK
    bank_name = Column(String(128), nullable=False)
    branch_name = Column(String(128), nullable=False)
    sanction_letter_no = Column(String(64), nullable=False)
    sanction_date = Column(Date, nullable=False)
    sanctioned_amount = Column(Numeric(14, 2), nullable=False)
    disbursed_amount_total = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Developer NOC & Tripartite Legal Deed
    developer_noc_ref = Column(String(64), nullable=True) # e.g. "NOC-DEV-2026-4401"
    developer_noc_date = Column(Date, nullable=True)
    noc_status = Column(String(32), nullable=False, default="PENDING") # PENDING, ISSUED, WAIVED
    tripartite_agreement_date = Column(Date, nullable=True)

    # Contact Desk
    bank_officer_name = Column(String(128), nullable=True)
    bank_officer_phone = Column(String(32), nullable=True)
    bank_officer_email = Column(String(128), nullable=True)

    # Status: 'DRAFT', 'SANCTIONED', 'NOC_ISSUED', 'DISBURSING', 'COMPLETED', 'CANCELLED'
    status = Column(String(32), nullable=False, default="SANCTIONED", index=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking")
    customer = relationship("Customer")
    tranches = relationship("LoanTranche", back_populates="loan", cascade="all, delete-orphan", order_by="LoanTranche.tranche_number")


class LoanTranche(Base):
    """
    Tranche Disbursement Tracking linked to Civil Construction Milestones.
    Includes Bank Civil Engineer Inspection Verification & Money Receipt Reconciliation.
    """
    __tablename__ = "sls_loan_tranches"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    loan_id = Column(BigInteger, ForeignKey("sls_tripartite_loans.id", ondelete="CASCADE"), nullable=False, index=True)
    tranche_number = Column(Integer, nullable=False)
    milestone_title = Column(String(191), nullable=False) # e.g. "Plinth Level 20%", "Roof Casting 5th Floor 30%"
    sanctioned_tranche_amount = Column(Numeric(14, 2), nullable=False)

    # Bank Civil Inspection
    bank_inspection_date = Column(Date, nullable=True)
    # Inspection Status: 'PENDING_INSPECTION', 'INSPECTION_PASSED', 'INSPECTION_REJECTED'
    inspection_status = Column(String(32), nullable=False, default="PENDING_INSPECTION")
    inspection_engineer_name = Column(String(128), nullable=True)
    inspection_notes = Column(Text, nullable=True)

    # Disbursement & Settlement
    disbursement_claimed_date = Column(Date, nullable=True)
    disbursed_date = Column(Date, nullable=True)
    disbursed_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    payment_instrument_no = Column(String(64), nullable=True) # Pay Order / BEFTN reference
    receipt_id = Column(BigInteger, ForeignKey("sls_money_receipts.id", ondelete="SET NULL"), nullable=True)

    # Status: 'PENDING', 'INSPECTION_DONE', 'DISBURSED', 'RECONCILED'
    status = Column(String(32), nullable=False, default="PENDING", index=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    loan = relationship("TripartiteLoan", back_populates="tranches")
    receipt = relationship("MoneyReceipt")


