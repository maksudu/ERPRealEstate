from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime

# -------------------------------------------------------------
# Unit Transfer Schemas
# -------------------------------------------------------------
class UnitTransferBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    from_customer_id: int
    to_customer_id: int
    transfer_date: Optional[date] = None
    transfer_fee_bdt: float = 50000.00
    transfer_memo_no: Optional[str] = None
    approval_status: str = "COMPLETED"
    remarks: Optional[str] = None

class UnitTransferCreate(BaseModel):
    booking_id: int
    to_customer_id: int
    transfer_fee_bdt: float = 50000.00
    transfer_memo_no: Optional[str] = None
    remarks: Optional[str] = None

class UnitTransferResponse(UnitTransferBase):
    id: int
    from_customer_name: Optional[str] = None
    to_customer_name: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Booking Cancellation Schemas
# -------------------------------------------------------------
class BookingCancellationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    cancellation_date: Optional[date] = None
    cancellation_reason: str
    total_paid: float
    forfeiture_deduction_percentage: float = 10.00
    forfeiture_deduction_amount: float
    net_refund_amount: float
    status: str = "REQUESTED"
    refund_cheque_no: Optional[str] = None
    settlement_notes: Optional[str] = None

class BookingCancellationCreate(BaseModel):
    booking_id: int
    cancellation_reason: str
    forfeiture_deduction_percentage: Optional[float] = 10.00
    refund_cheque_no: Optional[str] = None
    settlement_notes: Optional[str] = None

class BookingCancellationResponse(BookingCancellationBase):
    id: int
    booking_reference_no: Optional[str] = None
    customer_name: Optional[str] = None
    unit_number: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Sales Booking Schemas
# -------------------------------------------------------------
class BookingBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_reference_no: str
    project_id: int
    unit_id: int
    primary_customer_id: int
    booking_date: date
    base_unit_price: float
    discount_amount: float = 0.00
    discount_percentage: float = 0.00
    required_approval_tier: str = "SALES_MANAGER"
    discount_approval_status: str = "APPROVED"
    discount_approved_by_id: Optional[int] = None
    discount_approval_notes: Optional[str] = None
    final_contract_value: float
    earnest_money_received: float = 0.00
    down_payment_total: float = 0.00
    status: str = "PROVISIONAL"
    notes: Optional[str] = None

class BookingCreate(BaseModel):
    project_id: int
    unit_id: int
    primary_customer_id: int
    booking_date: Optional[date] = None
    discount_amount: Optional[float] = 0.00
    earnest_money_received: Optional[float] = 500000.00
    down_payment_total: Optional[float] = 0.00
    notes: Optional[str] = None

class DiscountApprovalAction(BaseModel):
    decision: str # 'APPROVED', 'REJECTED'
    approved_by_id: Optional[int] = None
    approval_notes: Optional[str] = None
    biometric_token: Optional[str] = None # For MD mobile 1-tap biometric auth

class BookingResponse(BookingBase):
    id: int
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    discount_approved_by_name: Optional[str] = None
    cancellation: Optional[BookingCancellationResponse] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Sales Summary & Pipeline Metrics
# -------------------------------------------------------------
class SalesMetrics(BaseModel):
    total_bookings: int
    gross_contract_value: float
    total_earnest_collected: float
    pending_discount_approvals: int
    total_cancellations: int
