from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, func
from app.core.database import Base


class MobileCollectionPayment(Base):
    __tablename__ = "mobile_collection_payments"

    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String(50), unique=True, index=True)  # MR-2026-XXXX
    customer_id = Column(Integer, nullable=True)
    customer_name = Column(String(150), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    project_name = Column(String(150), nullable=False)
    unit_number = Column(String(50), nullable=False)
    booking_number = Column(String(50), nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0.0)
    payment_mode = Column(String(50), nullable=False, default="Cash")  # Cash, Cheque, Bank Transfer, Digital Payment
    transaction_ref = Column(String(100), nullable=True)
    cheque_number = Column(String(100), nullable=True)
    bank_name = Column(String(150), nullable=True)
    payment_date = Column(String(30), nullable=False)
    collection_officer = Column(String(100), nullable=False, default="Engr. Maksudul")
    posting_status = Column(String(50), nullable=False, default="PENDING_VERIFICATION")  # PENDING_VERIFICATION, VERIFIED, POSTED, REJECTED
    verification_notes = Column(Text, nullable=True)
    verified_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class MobileCollectionCustomer(Base):
    __tablename__ = "mobile_collection_customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(150), nullable=False, index=True)
    phone = Column(String(50), nullable=False, index=True)
    email = Column(String(100), nullable=True)
    project_name = Column(String(150), nullable=False)
    unit_number = Column(String(50), nullable=False)
    booking_number = Column(String(50), nullable=False, unique=True, index=True)
    total_sales_value = Column(Float, default=0.0)
    total_paid = Column(Float, default=0.0)
    total_due = Column(Float, default=0.0)
    overdue_amount = Column(Float, default=0.0)
    loan_status = Column(String(50), default="NONE")  # NONE, APPLIED, SANCTIONED, DISBURSED
    collector_assigned = Column(String(100), default="Engr. Maksudul")
    created_at = Column(DateTime, server_default=func.now())


class MobileCollectionSchedule(Base):
    __tablename__ = "mobile_collection_schedules"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, nullable=True)
    customer_name = Column(String(150), nullable=False)
    project_name = Column(String(150), nullable=False)
    unit_number = Column(String(50), nullable=False)
    booking_number = Column(String(50), nullable=False, index=True)
    installment_name = Column(String(100), nullable=False)  # Booking Money, Down Payment, Installment #1...
    due_date = Column(String(30), nullable=False)
    amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    status = Column(String(50), default="DUE")  # PAID, PARTIAL, DUE, OVERDUE
    late_fee = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())


class MobileCollectionLedger(Base):
    __tablename__ = "mobile_collection_ledgers"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, nullable=True)
    customer_name = Column(String(150), nullable=False)
    booking_number = Column(String(50), nullable=False, index=True)
    tx_date = Column(String(30), nullable=False)
    tx_type = Column(String(50), nullable=False)  # INVOICE, PAYMENT, ADJUSTMENT, LATE_FEE, REFUND
    description = Column(String(255), nullable=False)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    running_balance = Column(Float, default=0.0)
    receipt_ref = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class MobileCollectionBankLoan(Base):
    __tablename__ = "mobile_collection_bank_loans"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, nullable=True)
    customer_name = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=False)
    project_name = Column(String(150), nullable=False)
    unit_number = Column(String(50), nullable=False)
    booking_number = Column(String(50), nullable=False, index=True)
    bank_name = Column(String(150), nullable=False)
    sanction_amount = Column(Float, default=0.0)
    disbursed_amount = Column(Float, default=0.0)
    pending_disbursement = Column(Float, default=0.0)
    sanction_date = Column(String(30), nullable=True)
    disbursement_status = Column(String(50), default="APPROVED")  # APPROVED, PARTIALLY_DISBURSED, FULLY_DISBURSED, PENDING
    officer_name = Column(String(100), default="Loan Desk")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class MobileCollectionWorkflow(Base):
    __tablename__ = "mobile_collection_workflows"

    id = Column(Integer, primary_key=True, index=True)
    workflow_code = Column(String(50), unique=True, index=True)
    request_type = Column(String(50), nullable=False)  # PAYMENT_VERIFICATION, REFUND, WAIVER, RECEIPT_CANCELLATION
    customer_name = Column(String(150), nullable=False)
    booking_number = Column(String(50), nullable=False)
    requested_amount = Column(Float, default=0.0)
    requested_by = Column(String(100), nullable=False)
    approver_name = Column(String(100), nullable=True)
    status = Column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
