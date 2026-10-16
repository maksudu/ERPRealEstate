from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime

# --------------------------------------------------------------------------
# Chart of Accounts Schemas
# --------------------------------------------------------------------------
class ChartOfAccountBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    account_code: str
    account_name_en: str
    account_name_bn: Optional[str] = None
    account_type: str # Asset, Liability, Equity, Revenue, Expense
    is_leaf_account: bool = True
    parent_account_id: Optional[int] = None
    is_active: bool = True

class ChartOfAccountCreate(BaseModel):
    organization_id: Optional[int] = 1
    parent_account_id: Optional[int] = None
    account_code: str
    account_name_en: str
    account_name_bn: Optional[str] = None
    account_type: str
    is_leaf_account: Optional[bool] = True

class ChartOfAccountResponse(ChartOfAccountBase):
    id: int
    organization_id: int
    current_balance: float = 0.00
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Journal Entry & Voucher Schemas
# --------------------------------------------------------------------------
class JournalEntryInput(BaseModel):
    account_id: int
    debit_amount: float = 0.00
    credit_amount: float = 0.00
    project_id: Optional[int] = None
    narration: Optional[str] = None

class JournalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    voucher_id: int
    project_id: Optional[int] = None
    account_id: int
    account_code: Optional[str] = None
    account_name_en: Optional[str] = None
    account_type: Optional[str] = None
    voucher_date: date
    debit_amount: float
    credit_amount: float
    narration: Optional[str] = None

class VoucherBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    voucher_number: str
    voucher_type: str # Journal, Cash_Payment, Cash_Receipt, Bank_Payment, Bank_Receipt, Contra
    voucher_date: date
    narration: str
    total_debit_amount: float
    total_credit_amount: float
    status: str = "Posted"
    project_id: Optional[int] = None

class VoucherCreate(BaseModel):
    project_id: Optional[int] = None
    voucher_type: str # Journal, Cash_Payment, Cash_Receipt, Bank_Payment, Bank_Receipt, Contra
    voucher_date: Optional[date] = None
    narration: str
    entries: List[JournalEntryInput]

class VoucherResponse(VoucherBase):
    id: int
    organization_id: int
    project_name: Optional[str] = None
    created_by_name: Optional[str] = None
    reversal_voucher_id: Optional[int] = None
    entries: List[JournalEntryResponse] = []
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Bank Reconciliation Schemas
# --------------------------------------------------------------------------
class BankReconciliationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bank_account_id: int
    statement_date: date
    statement_balance: float
    book_balance: float
    difference_amount: float
    is_reconciled: bool = False
    reconciliation_notes: Optional[str] = None

class BankReconciliationCreate(BaseModel):
    bank_account_id: int
    statement_date: date
    statement_balance: float
    reconciliation_notes: Optional[str] = None

class BankReconciliationResponse(BankReconciliationBase):
    id: int
    bank_account_name: Optional[str] = None
    bank_account_code: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Real-Time Financial Reports Schemas (Trial Balance, P&L, Balance Sheet)
# --------------------------------------------------------------------------
class TrialBalanceItem(BaseModel):
    account_id: int
    account_code: str
    account_name_en: str
    account_type: str
    total_debit: float
    total_credit: float
    net_debit: float
    net_credit: float

class TrialBalanceReport(BaseModel):
    as_of_date: date
    items: List[TrialBalanceItem]
    grand_total_debit: float
    grand_total_credit: float
    is_balanced: bool

class ProfitLossReport(BaseModel):
    from_date: date
    to_date: date
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    total_revenue: float
    total_expense: float
    net_profit_or_loss: float
    revenue_breakdown: List[TrialBalanceItem]
    expense_breakdown: List[TrialBalanceItem]

class BalanceSheetReport(BaseModel):
    as_of_date: date
    total_assets: float
    total_liabilities: float
    total_equity: float
    net_difference: float # Assets - (Liabilities + Equity), should be 0.00
    asset_breakdown: List[TrialBalanceItem]
    liability_breakdown: List[TrialBalanceItem]
    equity_breakdown: List[TrialBalanceItem]


# -------------------------------------------------------------
# Mushak 6.3 Tax Invoice Schemas (Bangladesh VAT Act 2012)
# -------------------------------------------------------------
class MushakTaxInvoiceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    mushak_challan_number: str
    invoice_date: date
    developer_bin_number: str = "001234567-0101"
    customer_tin_nid: str
    apartment_sqft: float
    taxable_amount: float
    vat_rate_percent: float
    vat_amount: float
    total_amount_collected: float
    pdf_url: Optional[str] = None
    status: str = "ISSUED"

class MushakTaxInvoiceCreate(BaseModel):
    booking_id: int
    taxable_amount: float
    customer_tin_nid: Optional[str] = None
    apartment_type: Optional[str] = "RESIDENTIAL" # RESIDENTIAL, COMMERCIAL

class MushakTaxInvoiceResponse(MushakTaxInvoiceBase):
    id: int
    booking_reference_no: Optional[str] = None
    customer_name: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# TDS / VDS Deduction Schemas
# -------------------------------------------------------------
class TDSDeductionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    voucher_id: Optional[int] = None
    vendor_id: Optional[int] = None
    contractor_id: Optional[int] = None
    deduction_section: str # Sec 52, Sec 52C, Sec 53, Sec 53FF, VDS
    gross_amount: float
    tax_rate_percent: float
    withheld_amount: float
    challan_number: Optional[str] = None
    challan_deposit_date: Optional[date] = None
    status: str = "WITHHELD"

class TDSDeductionCreate(BaseModel):
    voucher_id: Optional[int] = None
    vendor_id: Optional[int] = None
    contractor_id: Optional[int] = None
    deduction_section: str
    gross_amount: float
    tax_rate_percent: float
    challan_number: Optional[str] = None

class TDSDeductionDeposit(BaseModel):
    challan_number: str
    challan_deposit_date: date

class TDSDeductionResponse(TDSDeductionBase):
    id: int
    vendor_name: Optional[str] = None
    contractor_name: Optional[str] = None
    voucher_number: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Sub-Registry Registration Fee & Section 53FF AIT Calculator
# -------------------------------------------------------------
class SubRegistryCalculationRequest(BaseModel):
    deed_value_bdt: float
    apartment_sqft: float
    zone_category: str # GULSHAN_BANANI, DHANMONDI_UTTARA, DHAKA_OTHER, OTHER_DISTRICT
    property_type: Optional[str] = "RESIDENTIAL" # RESIDENTIAL, COMMERCIAL

class SubRegistryCalculationResponse(BaseModel):
    deed_value_bdt: float
    apartment_sqft: float
    apartment_sqm: float
    zone_category: str
    property_type: str
    
    # Statutory Government Fees
    stamp_duty_rate_percent: float = 1.50
    stamp_duty_amount: float
    registration_fee_rate_percent: float = 1.00
    registration_fee_amount: float
    local_govt_tax_rate_percent: float = 2.00
    local_govt_tax_amount: float
    
    # Section 53FF Advance Income Tax (AIT)
    ait_rate_per_sqm_bdt: float
    ait_section_53ff_amount: float
    
    # VAT Act 2012 (if applicable on registration deed)
    vat_rate_percent: float
    vat_amount: float
    
    # Total
    total_statutory_fees_bdt: float
    total_transfer_cost_bdt: float

