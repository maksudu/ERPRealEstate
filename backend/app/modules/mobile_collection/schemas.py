from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Payment
class PaymentCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: str
    customer_phone: str
    project_name: str
    unit_number: str
    booking_number: str
    amount: float = Field(..., gt=0)
    payment_mode: str = "Cash"
    transaction_ref: Optional[str] = None
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    payment_date: str
    collection_officer: str = "Engr. Maksudul"
    verification_notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    payment_mode: Optional[str] = None
    transaction_ref: Optional[str] = None
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    posting_status: Optional[str] = None
    verification_notes: Optional[str] = None
    verified_by: Optional[str] = None


# Customer
class CustomerCreate(BaseModel):
    customer_name: str
    phone: str
    email: Optional[str] = None
    project_name: str
    unit_number: str
    booking_number: str
    total_sales_value: float = 0.0
    total_paid: float = 0.0
    total_due: float = 0.0
    overdue_amount: float = 0.0
    loan_status: str = "NONE"
    collector_assigned: str = "Engr. Maksudul"


class CustomerUpdate(BaseModel):
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    total_sales_value: Optional[float] = None
    total_paid: Optional[float] = None
    total_due: Optional[float] = None
    overdue_amount: Optional[float] = None
    loan_status: Optional[str] = None
    collector_assigned: Optional[str] = None


# Schedule
class ScheduleCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: str
    project_name: str
    unit_number: str
    booking_number: str
    installment_name: str
    due_date: str
    amount: float
    paid_amount: float = 0.0
    status: str = "DUE"
    late_fee: float = 0.0


class ScheduleUpdate(BaseModel):
    amount: Optional[float] = None
    paid_amount: Optional[float] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    late_fee: Optional[float] = None


# Ledger
class LedgerCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: str
    booking_number: str
    tx_date: str
    tx_type: str
    description: str
    debit: float = 0.0
    credit: float = 0.0
    running_balance: float = 0.0
    receipt_ref: Optional[str] = None


# Bank Loan
class BankLoanCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: str
    phone: str
    project_name: str
    unit_number: str
    booking_number: str
    bank_name: str
    sanction_amount: float
    disbursed_amount: float = 0.0
    pending_disbursement: float = 0.0
    sanction_date: Optional[str] = None
    disbursement_status: str = "APPROVED"
    officer_name: str = "Loan Desk"
    remarks: Optional[str] = None


class BankLoanUpdate(BaseModel):
    disbursed_amount: Optional[float] = None
    pending_disbursement: Optional[float] = None
    disbursement_status: Optional[str] = None
    remarks: Optional[str] = None


# Workflow
class WorkflowCreate(BaseModel):
    request_type: str
    customer_name: str
    booking_number: str
    requested_amount: float
    requested_by: str
    notes: Optional[str] = None


class WorkflowUpdate(BaseModel):
    status: str
    approver_name: str
    notes: Optional[str] = None
