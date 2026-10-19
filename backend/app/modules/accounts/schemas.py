from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

# --------------------------------------------------------------------------
# Chart of Accounts Schemas
# --------------------------------------------------------------------------
class ChartOfAccountBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    account_code: str
    account_name_en: str
    account_name_bn: Optional[str] = None
    account_type: str # Asset, Liability, Equity, Revenue, Cost_of_Sales, Project_Expense, Operating_Expense, Finance_Cost, Other_Income_Expense
    is_leaf_account: bool = True
    parent_account_id: Optional[int] = None
    currency: str = "BDT"
    is_reconciliation_account: bool = False
    is_active: bool = True
    normal_balance: str = "Debit" # Debit or Credit
    is_control_account: bool = False
    requires_project: bool = False
    requires_cost_center: bool = False
    statement_mapping: Optional[str] = "Balance Sheet"
    opening_balance: float = 0.00
    migration_reference: Optional[str] = None

class ChartOfAccountCreate(BaseModel):
    organization_id: Optional[int] = 1
    parent_account_id: Optional[int] = None
    account_code: str
    account_name_en: str
    account_name_bn: Optional[str] = None
    account_type: str
    is_leaf_account: Optional[bool] = True
    currency: Optional[str] = "BDT"
    is_reconciliation_account: Optional[bool] = False
    is_active: Optional[bool] = True
    normal_balance: Optional[str] = "Debit"
    is_control_account: Optional[bool] = False
    requires_project: Optional[bool] = False
    requires_cost_center: Optional[bool] = False
    statement_mapping: Optional[str] = "Balance Sheet"
    opening_balance: Optional[float] = 0.00
    migration_reference: Optional[str] = None

class ChartOfAccountUpdate(BaseModel):
    parent_account_id: Optional[int] = None
    account_name_en: Optional[str] = None
    account_name_bn: Optional[str] = None
    account_type: Optional[str] = None
    is_leaf_account: Optional[bool] = None
    currency: Optional[str] = None
    is_reconciliation_account: Optional[bool] = None
    is_active: Optional[bool] = None
    normal_balance: Optional[str] = None
    is_control_account: Optional[bool] = None
    requires_project: Optional[bool] = None
    requires_cost_center: Optional[bool] = None
    statement_mapping: Optional[str] = None
    opening_balance: Optional[float] = None
    migration_reference: Optional[str] = None

class ChartOfAccountResponse(ChartOfAccountBase):
    id: int
    organization_id: int
    level: int = 5
    is_group: bool = False
    current_balance: float = 0.00
    created_at: Optional[datetime] = None

class ChartOfAccountTreeNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    account_code: str
    account_name_en: str
    account_name_bn: Optional[str] = None
    account_type: str
    level: int = 5
    is_group: bool = False
    is_leaf_account: bool = True
    currency: str = "BDT"
    is_reconciliation_account: bool = False
    is_active: bool = True
    normal_balance: str = "Debit"
    is_control_account: bool = False
    requires_project: bool = False
    requires_cost_center: bool = False
    statement_mapping: Optional[str] = "Balance Sheet"
    opening_balance: float = 0.00
    migration_reference: Optional[str] = None
    parent_account_id: Optional[int] = None
    current_balance: float = 0.00
    children: List["ChartOfAccountTreeNode"] = []

class FiscalYearBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    year_name: str
    start_date: date
    end_date: date
    is_closed: bool = False

class FiscalYearCreate(FiscalYearBase):
    pass

class FiscalYearResponse(FiscalYearBase):
    id: int
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Journal Entry & Voucher Schemas
# --------------------------------------------------------------------------
class JournalEntryInput(BaseModel):
    account_id: int
    debit_amount: float = 0.00
    credit_amount: float = 0.00
    project_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    bill_reference: Optional[str] = None
    narration: Optional[str] = None

class JournalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    voucher_id: int
    project_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    cost_center_name: Optional[str] = None
    account_id: int
    account_code: Optional[str] = None
    account_name_en: Optional[str] = None
    account_type: Optional[str] = None
    voucher_date: date
    debit_amount: float
    credit_amount: float
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    bill_reference: Optional[str] = None
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
    source_document_type: Optional[str] = None
    source_document_id: Optional[int] = None
    posted_at: Optional[datetime] = None

class VoucherCreate(BaseModel):
    project_id: Optional[int] = None
    voucher_type: str # Journal, Cash_Payment, Cash_Receipt, Bank_Payment, Bank_Receipt, Contra
    voucher_date: Optional[date] = None
    narration: str
    source_document_type: Optional[str] = None
    source_document_id: Optional[int] = None
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


# -------------------------------------------------------------
# Multi-Project Cost Centers Schemas
# -------------------------------------------------------------
class CostCenterBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    project_id: int
    tower_id: Optional[int] = None
    cost_center_code: str
    name: str
    wbs_stage: str = "SUPERSTRUCTURE"
    budget_allocated: float = 0.00
    is_active: bool = True

class CostCenterCreate(CostCenterBase):
    pass

class CostCenterResponse(CostCenterBase):
    id: int
    actual_spent: float = 0.00
    project_name: Optional[str] = None
    tower_name: Optional[str] = None
    variance_bdt: Optional[float] = 0.00
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# PDC Cheque Vault Schemas
# -------------------------------------------------------------
class PDCVaultBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    project_id: int
    booking_id: Optional[int] = None
    cheque_no: str
    bank_name: str
    branch_name: Optional[str] = None
    drawer_name: str
    cheque_date: date
    amount: float
    status: str = "IN_VAULT" # IN_VAULT, DEPOSITED, CLEARED, BOUNCED

class PDCVaultCreate(PDCVaultBase):
    pass

class PDCStatusUpdate(BaseModel):
    status: str # DEPOSITED, CLEARED, BOUNCED
    bounce_reason: Optional[str] = None
    bank_account_id: Optional[int] = None # For clearance entry

class PDCVaultResponse(PDCVaultBase):
    id: int
    deposit_date: Optional[date] = None
    clearance_date: Optional[date] = None
    bounce_date: Optional[date] = None
    bounce_reason: Optional[str] = None
    legal_notice_sent: bool = False
    voucher_id: Optional[int] = None
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# CWIP Capitalization & IFRS-15 Revenue Recognition
# -------------------------------------------------------------
class CWIPCapitalizeRequest(BaseModel):
    project_id: int
    cost_center_id: Optional[int] = None
    capitalized_amount: float
    completion_percentage: float = 100.00
    cwip_account_id: int
    cogs_account_id: int
    remarks: Optional[str] = None

class CWIPSummaryResponse(BaseModel):
    project_id: int
    project_name: str
    total_accumulated_cwip: float
    total_capitalized_cogs: float
    active_cwip_balance: float
    cost_centers: List[dict]

class IFRS15RecognizeRequest(BaseModel):
    project_id: int
    booking_id: int
    recognized_amount: float
    recognition_method: str = "POINT_IN_TIME_HANDOVER" # POC_OVER_TIME, POINT_IN_TIME_HANDOVER
    advance_liability_account_id: int
    revenue_account_id: int
    remarks: Optional[str] = None

class IFRS15Response(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    booking_id: int
    recognition_date: date
    recognized_amount: float
    recognition_method: str
    voucher_id: Optional[int] = None
    remarks: Optional[str] = None


# -------------------------------------------------------------
# Smart Bank Statement Auto-Matching Schemas
# -------------------------------------------------------------
class BankStatementRow(BaseModel):
    transaction_date: date
    reference_no: Optional[str] = None
    description: str
    debit_amount: float = 0.00
    credit_amount: float = 0.00

class BankStatementAutoMatchRequest(BaseModel):
    bank_account_id: int
    statement_date: date
    statement_balance: float
    rows: List[BankStatementRow]

class BankStatementItemOut(BaseModel):
    id: Optional[int] = None
    transaction_date: date
    reference_no: Optional[str] = None
    description: str
    debit_amount: float
    credit_amount: float
    match_status: str # MATCHED, UNMATCHED, DISCREPANCY
    matched_voucher_number: Optional[str] = None

class BankReconciliationFullResponse(BaseModel):
    reconciliation_id: int
    bank_account_id: int
    statement_date: date
    statement_balance: float
    book_balance: float
    difference_amount: float
    is_reconciled: bool
    matched_count: int
    unmatched_count: int
    items: List[BankStatementItemOut]


# -------------------------------------------------------------
# General Ledger (GL) Inquiry Schemas
# -------------------------------------------------------------
class GeneralLedgerLineItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    journal_entry_id: int
    voucher_id: int
    voucher_number: str
    voucher_type: str
    voucher_date: date
    narration: str
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    cost_center_id: Optional[int] = None
    cost_center_name: Optional[str] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    bill_reference: Optional[str] = None
    debit_amount: float
    credit_amount: float
    running_balance: float

class GeneralLedgerInquiryResponse(BaseModel):
    account_id: int
    account_code: str
    account_name_en: str
    account_name_bn: Optional[str] = None
    account_type: str
    normal_balance: str
    currency: str = "BDT"
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    opening_balance: float
    total_debit: float
    total_credit: float
    closing_balance: float
    total_items: int
    limit: int
    offset: int
    statement_mapping: Optional[str] = None
    project_name: Optional[str] = None
    items: List[GeneralLedgerLineItem] = []
    entries: List[GeneralLedgerLineItem] = []


# --------------------------------------------------------------------------
# Accounts Payable (AP) Schemas
# --------------------------------------------------------------------------

class APPaymentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    amount: float
    payment_date: Optional[date] = None
    payment_method: str = "Bank_Transfer"
    bank_account_id: Optional[int] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None

class APPaymentCreate(APPaymentBase):
    pass

class APPaymentResponse(APPaymentBase):
    id: int
    invoice_id: int
    payment_number: str
    voucher_id: Optional[int] = None
    created_at: Optional[datetime] = None

class APAdjustmentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    adjustment_type: str = "Debit_Note"
    adjustment_date: Optional[date] = None
    amount: float
    reason: str
    invoice_id: Optional[int] = None
    vendor_id: Optional[int] = None
    contractor_id: Optional[int] = None

class APAdjustmentCreate(APAdjustmentBase):
    pass

class APAdjustmentResponse(APAdjustmentBase):
    id: int
    adjustment_number: str
    voucher_id: Optional[int] = None
    created_at: Optional[datetime] = None

class APInvoiceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    invoice_number: str
    invoice_type: str = "Supplier_Material"
    invoice_date: date
    due_date: date
    vendor_id: Optional[int] = None
    contractor_id: Optional[int] = None
    payee_name: str
    project_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    expense_account_id: Optional[int] = None
    liability_account_id: Optional[int] = None
    po_id: Optional[int] = None
    grn_id: Optional[int] = None
    ra_bill_id: Optional[int] = None
    gross_amount: float
    tax_withholding_tds: float = 0.00
    vat_withholding_vds: float = 0.00
    retention_amount: float = 0.00
    other_deductions: float = 0.00
    net_payable_amount: float
    three_way_match_status: str = "NOT_APPLICABLE"
    status: str = "Draft"
    description: Optional[str] = None

class APInvoiceCreate(BaseModel):
    invoice_number: str
    invoice_type: str = "Supplier_Material"
    invoice_date: Optional[date] = None
    due_date: date
    vendor_id: Optional[int] = None
    contractor_id: Optional[int] = None
    payee_name: str
    project_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    expense_account_id: Optional[int] = None
    liability_account_id: Optional[int] = None
    po_id: Optional[int] = None
    grn_id: Optional[int] = None
    ra_bill_id: Optional[int] = None
    gross_amount: float
    tax_withholding_tds: float = 0.00
    vat_withholding_vds: float = 0.00
    retention_amount: float = 0.00
    other_deductions: float = 0.00
    description: Optional[str] = None
    auto_approve: bool = False

class APInvoiceUpdate(BaseModel):
    due_date: Optional[date] = None
    status: Optional[str] = None
    description: Optional[str] = None
    tax_withholding_tds: Optional[float] = None
    vat_withholding_vds: Optional[float] = None
    retention_amount: Optional[float] = None
    other_deductions: Optional[float] = None

class APInvoiceResponse(APInvoiceBase):
    id: int
    paid_amount: float = 0.00
    balance_due: float = 0.00
    project_name: Optional[str] = None
    vendor_name: Optional[str] = None
    contractor_name: Optional[str] = None
    cost_center_name: Optional[str] = None
    expense_account_name: Optional[str] = None
    liability_account_name: Optional[str] = None
    voucher_id: Optional[int] = None
    voucher_number: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    payments: List[APPaymentResponse] = []
    adjustments: List[APAdjustmentResponse] = []

class APSummaryKPIsResponse(BaseModel):
    total_invoices_count: int
    total_gross_amount: float
    total_net_payable: float
    total_paid_amount: float
    total_balance_due: float
    total_overdue_amount: float
    overdue_count: int
    pending_approval_count: int

class APSupplierLedgerStatementItem(BaseModel):
    transaction_date: date
    transaction_type: str
    reference_number: str
    description: str
    project_name: Optional[str] = None
    debit_disbursement: float
    credit_payable: float
    running_payable_balance: float

class APSupplierStatementResponse(BaseModel):
    payee_type: str
    payee_id: Optional[int] = None
    payee_name: str
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    opening_balance: float
    total_invoiced: float
    total_disbursed: float
    closing_balance: float
    items: List[APSupplierLedgerStatementItem] = []


# --------------------------------------------------------------------------
# Accounts Receivable (AR) Schemas
# --------------------------------------------------------------------------

class ARReceiptAllocationBase(BaseModel):
    id: Optional[int] = None
    receipt_id: int
    invoice_id: int
    invoice_number: Optional[str] = None
    invoice_type: Optional[str] = None
    milestone_title: Optional[str] = None
    allocated_amount: float
    allocation_date: date
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ARReceiptAllocationCreate(BaseModel):
    invoice_id: int
    allocated_amount: float
    notes: Optional[str] = None

class ARMultiAllocationRequest(BaseModel):
    allocation_date: Optional[date] = None
    allocations: List[ARReceiptAllocationCreate]

class ARReceiptClearVerifyRequest(BaseModel):
    cleared_date: Optional[date] = None
    bank_account_id: Optional[int] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None

class ARReceiptReverseRequest(BaseModel):
    reversal_reason: str
    reversal_date: Optional[date] = None
    notes: Optional[str] = None

class ARReceiptRefundRequest(BaseModel):
    refund_amount: float
    bank_account_id: Optional[int] = None
    refund_reason: str
    refund_date: Optional[date] = None
    cheque_or_ref: Optional[str] = None

class ARReceiptBase(BaseModel):
    receipt_number: str
    receipt_date: date
    invoice_id: Optional[int] = None
    customer_id: int
    booking_id: Optional[int] = None
    project_id: Optional[int] = None
    amount: float
    status: str = "Cleared" # Recorded, Cleared, Allocated, Partially_Allocated, Unallocated, Reversed, Refunded
    cleared_at: Optional[datetime] = None
    cleared_by_user_id: Optional[int] = None
    allocated_amount: float = 0.00
    unallocated_amount: float = 0.00
    collection_method: str = "Bank_Transfer"
    bank_account_id: Optional[int] = None
    bank_name: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    reversal_reason: Optional[str] = None
    reversal_date: Optional[date] = None
    reversal_voucher_id: Optional[int] = None

class ARReceiptCreate(BaseModel):
    invoice_id: Optional[int] = None
    customer_id: int
    booking_id: Optional[int] = None
    project_id: Optional[int] = None
    receipt_date: Optional[date] = None
    amount: float
    status: Optional[str] = "Cleared" # Recorded (PDC/awaiting clearance) or Cleared
    collection_method: str = "Bank_Transfer"
    bank_account_id: Optional[int] = None
    bank_name: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    # Optional multi-invoice allocation at creation time:
    allocations: Optional[List[ARReceiptAllocationCreate]] = None

class ARReceiptResponse(ARReceiptBase):
    id: int
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    project_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    voucher_id: Optional[int] = None
    voucher_number: Optional[str] = None
    reversal_voucher_number: Optional[str] = None
    created_at: Optional[datetime] = None
    allocations: List[ARReceiptAllocationBase] = []
    model_config = ConfigDict(from_attributes=True)

class ARReceiptSummaryKPIs(BaseModel):
    total_receipts_count: int
    total_receipts_amount: float
    total_cleared_amount: float
    total_allocated_amount: float
    total_unallocated_advance: float
    total_recorded_pending: float
    total_reversed_amount: float

class ARAdjustmentBase(BaseModel):
    adjustment_number: str
    adjustment_type: str = "Credit_Note"
    adjustment_date: date
    customer_id: int
    invoice_id: Optional[int] = None
    amount: float
    reason: str

class ARAdjustmentCreate(BaseModel):
    adjustment_type: str = "Credit_Note"
    adjustment_date: Optional[date] = None
    customer_id: int
    invoice_id: Optional[int] = None
    amount: float
    reason: str

class ARAdjustmentResponse(ARAdjustmentBase):
    id: int
    voucher_id: Optional[int] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ARInvoiceBase(BaseModel):
    invoice_number: str
    invoice_type: str = "Installment_Demand"
    invoice_date: date
    due_date: date
    customer_id: Optional[int] = None
    customer_name: str
    booking_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None
    receivable_account_id: Optional[int] = None
    revenue_account_id: Optional[int] = None
    gross_amount: float
    late_fee_amount: float = 0.00
    discount_amount: float = 0.00
    net_receivable_amount: float
    collected_amount: float = 0.00
    balance_due: float
    status: str = "Issued"
    collection_followup_status: str = "Not_Contacted"
    followup_notes: Optional[str] = None
    description: Optional[str] = None

class ARInvoiceCreate(BaseModel):
    invoice_number: str
    invoice_type: str = "Installment_Demand"
    invoice_date: date
    due_date: date
    customer_id: Optional[int] = None
    customer_name: str
    booking_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None
    receivable_account_id: Optional[int] = None
    revenue_account_id: Optional[int] = None
    gross_amount: float
    late_fee_amount: float = 0.00
    discount_amount: float = 0.00
    description: Optional[str] = None

class ARInvoiceUpdate(BaseModel):
    due_date: Optional[date] = None
    status: Optional[str] = None
    collection_followup_status: Optional[str] = None
    followup_notes: Optional[str] = None
    description: Optional[str] = None
    late_fee_amount: Optional[float] = None
    discount_amount: Optional[float] = None

class ARInvoiceResponse(ARInvoiceBase):
    id: int
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    receivable_account_name: Optional[str] = None
    revenue_account_name: Optional[str] = None
    voucher_id: Optional[int] = None
    voucher_number: Optional[str] = None
    receipts: List[ARReceiptResponse] = []
    adjustments: List[ARAdjustmentResponse] = []
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ARSummaryKPIsResponse(BaseModel):
    total_invoices_count: int
    total_gross_demand: float
    total_net_receivable: float
    total_collected_amount: float
    total_balance_due: float
    total_unallocated_cash: float
    total_overdue_amount: float
    overdue_count: int
    disputed_count: int


class ARCustomerStatementItem(BaseModel):
    transaction_date: date
    transaction_type: str
    reference_number: str
    description: str
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    debit_demand: float
    credit_collection: float
    running_receivable_balance: float

class ARCustomerStatementResponse(BaseModel):
    customer_id: Optional[int] = None
    customer_name: str
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    opening_balance: float
    total_demanded: float
    total_collected: float
    total_unallocated_advance: float
    net_closing_receivable: float
    items: List[ARCustomerStatementItem] = []


class ARAgingAnalysisItem(BaseModel):
    invoice_id: int
    invoice_number: str
    invoice_type: str
    customer_name: str
    project_name: str
    unit_number: Optional[str] = None
    due_date: date
    days_overdue: int
    net_receivable_amount: float
    collected_amount: float
    balance_due: float
    aging_bucket: str # "Not yet due", "1-30 days", "31-60 days", "61-90 days", "Over 90 days"
    collection_followup_status: str

class ARAgingReportResponse(BaseModel):
    as_of_date: date
    total_receivable_balance: float
    not_yet_due_amount: float
    not_yet_due_count: int
    days_1_to_30_amount: float
    days_1_to_30_count: int
    days_31_to_60_amount: float
    days_31_to_60_count: int
    days_61_to_90_amount: float
    days_61_to_90_count: int
    over_90_days_amount: float
    over_90_days_count: int
    items: List[ARAgingAnalysisItem] = []


class MaterialIssueToConstructionRequest(BaseModel):
    project_id: int
    material_inventory_account_id: Optional[int] = None
    cwip_account_id: Optional[int] = None
    amount: float
    issue_date: Optional[date] = None
    materials_description: str
    issue_slip_number: Optional[str] = None

class MaterialIssueToConstructionResponse(BaseModel):
    voucher_id: int
    voucher_number: str
    project_id: int
    project_name: str
    issued_amount: float
    from_account: str
    to_account: str
    narration: str
    posted_at: datetime


# --------------------------------------------------------------------------
# Cash, Bank & Mobile Financial Services (MFS) Schemas
# --------------------------------------------------------------------------

class CashBoxBase(BaseModel):
    box_code: str
    box_name: str
    cashbox_type: str = "Head_Office" # Head_Office, Project_Site_Imprest, Petty_Cash, Sales_Pavilion
    project_id: Optional[int] = None
    account_id: Optional[int] = None
    custodian_user_id: Optional[int] = None
    imprest_limit: float = 50000.00
    replenishment_threshold: float = 10000.00
    current_balance: float = 0.00
    status: str = "Active"
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CashBoxCreate(BaseModel):
    box_code: str
    box_name: str
    cashbox_type: str = "Head_Office"
    project_id: Optional[int] = None
    account_id: Optional[int] = None
    custodian_user_id: Optional[int] = None
    imprest_limit: float = 50000.00
    replenishment_threshold: float = 10000.00
    current_balance: float = 0.00
    status: str = "Active"
    notes: Optional[str] = None

class CashBoxUpdate(BaseModel):
    box_name: Optional[str] = None
    cashbox_type: Optional[str] = None
    project_id: Optional[int] = None
    custodian_user_id: Optional[int] = None
    imprest_limit: Optional[float] = None
    replenishment_threshold: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class PettyCashVoucherBase(BaseModel):
    voucher_number: str
    cash_box_id: int
    project_id: Optional[int] = None
    transaction_date: date
    transaction_type: str = "Disbursement" # Disbursement, Receipt, Imprest_Replenish, Fund_Transfer, Cash_Audit_Count
    amount: float
    payee_name: str
    expense_account_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    purpose: str
    supporting_receipt_ref: Optional[str] = None
    cash_count_system: Optional[float] = None
    cash_count_physical: Optional[float] = None
    variance_amount: Optional[float] = 0.00
    status: str = "Approved"
    model_config = ConfigDict(from_attributes=True)

class PettyCashVoucherCreate(BaseModel):
    cash_box_id: int
    project_id: Optional[int] = None
    transaction_date: Optional[date] = None
    transaction_type: str = "Disbursement"
    amount: float
    payee_name: str
    expense_account_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    purpose: str
    supporting_receipt_ref: Optional[str] = None

class CashCountAuditRequest(BaseModel):
    cash_box_id: int
    audit_date: Optional[date] = None
    physical_count_amount: float
    supporting_receipt_ref: Optional[str] = None
    purpose: Optional[str] = "Physical cash count closing balance audit"
    auto_post_adjustment_gl: bool = True

class CashTransferRequest(BaseModel):
    from_cash_box_id: int
    to_cash_box_id: int
    amount: float
    transfer_date: Optional[date] = None
    particulars: str = "Inter-fund cash transfer"
    reference_number: Optional[str] = None

class PettyCashVoucherResponse(PettyCashVoucherBase):
    id: int
    cash_box_name: Optional[str] = None
    project_name: Optional[str] = None
    expense_account_name: Optional[str] = None
    cost_center_name: Optional[str] = None
    gl_voucher_id: Optional[int] = None
    gl_voucher_number: Optional[str] = None
    created_at: Optional[datetime] = None

class CashBoxResponse(CashBoxBase):
    id: int
    project_name: Optional[str] = None
    account_code: Optional[str] = None
    account_name: Optional[str] = None
    custodian_name: Optional[str] = None
    needs_replenishment: bool = False
    vouchers: List[PettyCashVoucherResponse] = []
    created_at: Optional[datetime] = None


class BankAccountBase(BaseModel):
    bank_name: str
    branch_name: str
    account_name: str
    account_number_masked: str
    routing_number: str
    swift_code: Optional[str] = None
    account_type: str = "Current_Account" # Current_Account, Savings_Account, Escrow_Account, SND_Account, Fixed_Deposit
    currency: str = "BDT"
    project_id: Optional[int] = None
    account_id: Optional[int] = None
    opening_balance: float = 0.00
    current_balance: float = 0.00
    is_escrow: bool = False
    is_active: bool = True
    cheque_prefix: Optional[str] = "CQ-"
    active_cheque_start: Optional[int] = None
    active_cheque_end: Optional[int] = None
    last_used_cheque_no: Optional[int] = None
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class BankAccountCreate(BaseModel):
    bank_name: str
    branch_name: str
    account_name: str
    account_number: str # Raw number; backend will encrypt and store masked
    routing_number: str
    swift_code: Optional[str] = None
    account_type: str = "Current_Account"
    currency: str = "BDT"
    project_id: Optional[int] = None
    account_id: Optional[int] = None
    opening_balance: float = 0.00
    is_escrow: bool = False
    cheque_prefix: Optional[str] = "CQ-"
    active_cheque_start: Optional[int] = None
    active_cheque_end: Optional[int] = None
    notes: Optional[str] = None

class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_name: Optional[str] = None
    routing_number: Optional[str] = None
    swift_code: Optional[str] = None
    account_type: Optional[str] = None
    is_escrow: Optional[bool] = None
    is_active: Optional[bool] = None
    cheque_prefix: Optional[str] = None
    active_cheque_start: Optional[int] = None
    active_cheque_end: Optional[int] = None
    notes: Optional[str] = None

class BankTransactionBase(BaseModel):
    bank_account_id: int
    project_id: Optional[int] = None
    transaction_date: date
    transaction_type: str = "Deposit" # Deposit, Withdrawal, Transfer, Cheque_Issue, Bank_Charge, Interest_Income
    amount: float
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    cheque_status: Optional[str] = None # Issued, Presented, Cleared, Bounced, Void
    contra_account_id: Optional[int] = None
    reference_number: Optional[str] = None
    particulars: str
    is_reconciled: bool = False
    status: str = "Cleared"
    model_config = ConfigDict(from_attributes=True)

class BankTransactionCreate(BaseModel):
    bank_account_id: int
    project_id: Optional[int] = None
    transaction_date: Optional[date] = None
    transaction_type: str = "Deposit"
    amount: float
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    cheque_status: Optional[str] = None
    contra_account_id: Optional[int] = None
    reference_number: Optional[str] = None
    particulars: str

class BankTransferRequest(BaseModel):
    from_bank_account_id: int
    to_bank_account_id: int
    amount: float
    transfer_date: Optional[date] = None
    cheque_number: Optional[str] = None
    particulars: str = "Inter-bank funds transfer"
    reference_number: Optional[str] = None

class BankTransactionResponse(BankTransactionBase):
    id: int
    bank_name: Optional[str] = None
    account_number_masked: Optional[str] = None
    project_name: Optional[str] = None
    contra_account_name: Optional[str] = None
    gl_voucher_id: Optional[int] = None
    gl_voucher_number: Optional[str] = None
    created_at: Optional[datetime] = None

class ChequeLeafItem(BaseModel):
    leaf_number: str
    status: str # Available, Issued, Cleared, Bounced, Void
    transaction_id: Optional[int] = None
    transaction_date: Optional[date] = None
    amount: Optional[float] = None
    payee_or_particulars: Optional[str] = None

class BankAccountResponse(BankAccountBase):
    id: int
    project_name: Optional[str] = None
    gl_account_code: Optional[str] = None
    gl_account_name: Optional[str] = None
    total_cheques_configured: int = 0
    cheques_used_count: int = 0
    cheques_available_count: int = 0
    transactions: List[BankTransactionResponse] = []
    created_at: Optional[datetime] = None


class MFSProviderBase(BaseModel):
    provider_code: str # BKASH, NAGAD, ROCKET, UPAY
    provider_name: str
    merchant_number: str
    account_type: str = "Merchant_Wallet"
    fee_percentage: float = 1.500
    fee_flat_charge: float = 0.00
    settlement_bank_account_id: Optional[int] = None
    fee_expense_account_id: Optional[int] = None
    wallet_gl_account_id: Optional[int] = None
    daily_limit: float = 5000000.00
    is_active: bool = True
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class MFSProviderCreate(BaseModel):
    provider_code: str
    provider_name: str
    merchant_number: str
    account_type: str = "Merchant_Wallet"
    fee_percentage: float = 1.500
    fee_flat_charge: float = 0.00
    settlement_bank_account_id: Optional[int] = None
    fee_expense_account_id: Optional[int] = None
    wallet_gl_account_id: Optional[int] = None
    daily_limit: float = 5000000.00
    notes: Optional[str] = None

class MFSProviderUpdate(BaseModel):
    provider_name: Optional[str] = None
    merchant_number: Optional[str] = None
    account_type: Optional[str] = None
    fee_percentage: Optional[float] = None
    fee_flat_charge: Optional[float] = None
    settlement_bank_account_id: Optional[int] = None
    daily_limit: Optional[float] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class MFSProviderResponse(MFSProviderBase):
    id: int
    settlement_bank_name: Optional[str] = None
    settlement_bank_account_masked: Optional[str] = None
    fee_expense_account_name: Optional[str] = None
    wallet_gl_account_name: Optional[str] = None
    total_transactions_count: int = 0
    total_gross_volume: float = 0.00
    created_at: Optional[datetime] = None

class MFSTransactionBase(BaseModel):
    mfs_provider_id: int
    project_id: Optional[int] = None
    customer_id: Optional[int] = None
    invoice_id: Optional[int] = None
    transaction_id: str
    payment_reference: Optional[str] = None
    customer_phone: str
    gross_amount: float
    fee_deducted: float = 0.00
    net_settlement_amount: float
    settlement_batch_id: Optional[str] = None
    settlement_date: Optional[date] = None
    status: str = "Success" # Success, Pending, Failed, Refunded, Reversed
    model_config = ConfigDict(from_attributes=True)

class MFSTransactionCreate(BaseModel):
    mfs_provider_id: int
    project_id: Optional[int] = None
    customer_id: Optional[int] = None
    invoice_id: Optional[int] = None
    transaction_id: str
    payment_reference: Optional[str] = None
    customer_phone: str
    gross_amount: float
    fee_deducted: Optional[float] = None # Calculated automatically if not passed
    settlement_batch_id: Optional[str] = None
    settlement_date: Optional[date] = None

class MFSCallbackSimulationRequest(BaseModel):
    provider_code: str # BKASH, NAGAD, ROCKET
    transaction_id: str
    customer_phone: str
    gross_amount: float
    payment_reference: Optional[str] = None
    project_id: Optional[int] = None
    customer_id: Optional[int] = None
    invoice_id: Optional[int] = None

class MFSTransactionResponse(MFSTransactionBase):
    id: int
    provider_code: Optional[str] = None
    provider_name: Optional[str] = None
    project_name: Optional[str] = None
    customer_name: Optional[str] = None
    invoice_number: Optional[str] = None
    gl_voucher_id: Optional[int] = None
    gl_voucher_number: Optional[str] = None
    created_at: Optional[datetime] = None

class CashBankPositionKPIsResponse(BaseModel):
    total_liquid_funds: float
    total_cashbox_balance: float
    total_bank_balance: float
    total_mfs_gross_today: float
    total_mfs_net_today: float
    total_mfs_fees_today: float
    active_cashboxes_count: int
    active_bank_accounts_count: int
    active_mfs_providers_count: int
    imprest_alert_count: int # Cashboxes below threshold
    bank_positions: List[dict] = []
    cash_positions: List[dict] = []
    mfs_positions: List[dict] = []


# --------------------------------------------------------------------------
# Section 8: Payment Voucher Schemas
# --------------------------------------------------------------------------

class PaymentVoucherBase(BaseModel):
    branch_name: str = "Head Office Branch"
    project_id: Optional[int] = None
    voucher_date: date
    payee_type: str = "Supplier" # Supplier, Subcontractor, Landowner, Employee, Utility, Other
    payee_name: str
    vendor_id: Optional[int] = None
    contractor_id: Optional[int] = None
    landowner_id: Optional[int] = None
    employee_id: Optional[int] = None
    payment_method: str = "Bank_Transfer" # Bank_Transfer, Bank_Cheque, Cash, MFS, Pay_Order
    source_type: str = "Bank_Account" # Bank_Account, Cash_Box, MFS_Wallet
    bank_account_id: Optional[int] = None
    cash_box_id: Optional[int] = None
    mfs_provider_id: Optional[int] = None
    amount: float
    currency: str = "BDT"
    debit_category: str = "Expense" # Expense, Payable, Asset_CWIP, Inventory, Advance
    debit_account_id: int
    credit_account_id: int
    cost_center_id: Optional[int] = None
    ap_invoice_id: Optional[int] = None
    supporting_invoice_ref: Optional[str] = None
    purpose: str
    narration: Optional[str] = None
    attachments_url: Optional[str] = None
    status: str = "Draft" # Draft, Submitted, Checked, Approved, Posted, Disbursed, Reconciled, Cancelled
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    cheque_status: Optional[str] = None # Prepared, Issued, Cleared, Bounced, Void
    settlement_status: str = "Pending_Settlement" # Pending_Settlement, Settled, Failed
    settlement_date: Optional[date] = None
    is_reconciled: bool = False
    model_config = ConfigDict(from_attributes=True)

class PaymentVoucherCreate(BaseModel):
    branch_name: Optional[str] = "Head Office Branch"
    project_id: Optional[int] = None
    voucher_date: Optional[date] = None
    payee_type: str = "Supplier"
    payee_name: str
    vendor_id: Optional[int] = None
    contractor_id: Optional[int] = None
    landowner_id: Optional[int] = None
    employee_id: Optional[int] = None
    payment_method: str = "Bank_Transfer"
    source_type: str = "Bank_Account"
    bank_account_id: Optional[int] = None
    cash_box_id: Optional[int] = None
    mfs_provider_id: Optional[int] = None
    amount: float
    currency: Optional[str] = "BDT"
    debit_category: str = "Expense" # Expense, Payable, Asset_CWIP, Inventory, Advance
    debit_account_id: Optional[int] = None # Auto-selected if debit_category is Payable / Office Expense
    credit_account_id: Optional[int] = None # Auto-selected from bank_account_id or cash_box_id
    cost_center_id: Optional[int] = None
    ap_invoice_id: Optional[int] = None # When debiting a payable (avoids duplicate expense!)
    supporting_invoice_ref: Optional[str] = None
    purpose: str
    narration: Optional[str] = None
    attachments_url: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    auto_submit: bool = False

class PaymentVoucherUpdate(BaseModel):
    branch_name: Optional[str] = None
    project_id: Optional[int] = None
    payee_name: Optional[str] = None
    payment_method: Optional[str] = None
    bank_account_id: Optional[int] = None
    cash_box_id: Optional[int] = None
    mfs_provider_id: Optional[int] = None
    amount: Optional[float] = None
    debit_category: Optional[str] = None
    debit_account_id: Optional[int] = None
    credit_account_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    supporting_invoice_ref: Optional[str] = None
    purpose: Optional[str] = None
    narration: Optional[str] = None
    attachments_url: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None

class PaymentVoucherWorkflowAction(BaseModel):
    action: str # submit, check, approve, post, disburse, reconcile, cancel
    remarks: Optional[str] = None
    cheque_status: Optional[str] = None # Issued, Cleared, Bounced
    settlement_date: Optional[date] = None

class PaymentVoucherResponse(PaymentVoucherBase):
    id: int
    voucher_number: str
    project_name: Optional[str] = None
    debit_account_code: Optional[str] = None
    debit_account_name: Optional[str] = None
    credit_account_code: Optional[str] = None
    credit_account_name: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_masked: Optional[str] = None
    cash_box_name: Optional[str] = None
    mfs_provider_name: Optional[str] = None
    ap_invoice_number: Optional[str] = None
    cost_center_name: Optional[str] = None
    prepared_by_name: Optional[str] = None
    prepared_at: Optional[datetime] = None
    checked_by_name: Optional[str] = None
    checked_at: Optional[datetime] = None
    checked_remarks: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_remarks: Optional[str] = None
    disbursed_by_name: Optional[str] = None
    disbursed_at: Optional[datetime] = None
    gl_voucher_id: Optional[int] = None
    gl_voucher_number: Optional[str] = None
    created_at: Optional[datetime] = None

class PaymentVoucherKPIsResponse(BaseModel):
    total_vouchers_count: int
    total_disbursed_amount: float
    total_pending_amount: float
    draft_count: int
    submitted_count: int
    checked_count: int
    approved_pending_disbursement_count: int
    disbursed_paid_count: int
    reconciled_count: int


# ==============================================================================
# SECTION 11: PROJECT-WISE INCOME & EXPENDITURE SCHEMAS
# ==============================================================================

# 11.1 Project Financial Dimensions Configuration
class ProjectFinancialDimensionConfigBase(BaseModel):
    account_id: Optional[int] = None
    account_code: Optional[str] = None
    account_name: Optional[str] = None
    account_type: Optional[str] = None
    transaction_type: str = "ALL"
    is_company_branch_mandatory: bool = True
    is_project_mandatory: bool = True
    is_tower_mandatory: bool = False
    is_unit_mandatory: bool = False
    is_department_cost_center_mandatory: bool = True
    is_construction_phase_mandatory: bool = False
    is_cost_category_mandatory: bool = True
    is_party_mandatory: bool = False
    is_budget_line_mandatory: bool = False
    notes: Optional[str] = None
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)

class ProjectFinancialDimensionConfigCreate(ProjectFinancialDimensionConfigBase):
    pass

class ProjectFinancialDimensionConfigUpdate(ProjectFinancialDimensionConfigBase):
    pass

class ProjectFinancialDimensionConfigResponse(ProjectFinancialDimensionConfigBase):
    id: int
    organization_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProjectFinancialDimensionConfigPaginationResponse(BaseModel):
    items: List[ProjectFinancialDimensionConfigResponse]
    total: int
    limit: int
    offset: int


# 11.2 Project Income Schemas
class ProjectIncomeTransactionBase(BaseModel):
    transaction_date: date
    company_name: str = "Bengal Real Estate Ltd."
    branch_name: str = "Head Office - Gulshan"
    project_id: int
    tower_id: Optional[int] = None
    unit_id: Optional[int] = None
    department_name: str = "Sales & Revenue"
    cost_center_id: Optional[int] = None
    construction_phase: Optional[str] = None
    cost_category: str = "PROPERTY_SALE"
    customer_id: Optional[int] = None
    party_name: Optional[str] = None
    budget_line_code: Optional[str] = None
    account_id: Optional[int] = None
    contract_value: Decimal = Decimal("0.00")
    recognized_amount: Decimal = Decimal("0.00")
    cash_collected_amount: Decimal = Decimal("0.00")
    unearned_revenue: Decimal = Decimal("0.00")
    recognition_policy: str = "POC_IFRS15"
    payment_method: str = "Bank_Transfer"
    reference_no: Optional[str] = None
    status: str = "POSTED"
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ProjectIncomeTransactionCreate(ProjectIncomeTransactionBase):
    pass

class ProjectIncomeTransactionUpdate(ProjectIncomeTransactionBase):
    pass

class ProjectIncomeTransactionResponse(ProjectIncomeTransactionBase):
    id: int
    organization_id: int
    income_number: str
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    tower_name: Optional[str] = None
    unit_number: Optional[str] = None
    cost_center_name: Optional[str] = None
    customer_name: Optional[str] = None
    account_name: Optional[str] = None
    voucher_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProjectIncomePaginationResponse(BaseModel):
    items: List[ProjectIncomeTransactionResponse]
    total: int
    limit: int
    offset: int
    total_recognized_amount: Decimal
    total_collected_amount: Decimal
    total_unearned_revenue: Decimal


# 11.3 Project Expenditure Schemas
class ProjectExpenditureTransactionBase(BaseModel):
    transaction_date: date
    company_name: str = "Bengal Real Estate Ltd."
    branch_name: str = "Head Office - Gulshan"
    project_id: int
    tower_id: Optional[int] = None
    unit_id: Optional[int] = None
    department_name: str = "Civil Engineering"
    cost_center_id: Optional[int] = None
    construction_phase: Optional[str] = None
    cost_category: str = "CIVIL_CONSTRUCTION"
    party_type: str = "Supplier"
    vendor_id: Optional[int] = None
    contractor_id: Optional[int] = None
    party_name: Optional[str] = None
    budget_line_code: Optional[str] = None
    account_id: Optional[int] = None
    gross_amount: Decimal = Decimal("0.00")
    tax_vat_deducted: Decimal = Decimal("0.00")
    retention_deducted: Decimal = Decimal("0.00")
    net_payable_amount: Decimal = Decimal("0.00")
    paid_amount: Decimal = Decimal("0.00")
    committed_po_reference: Optional[str] = None
    expenditure_type: str = "POSTED_ACTUAL"
    payment_status: str = "PAID"
    payment_method: str = "Bank_Transfer"
    reference_no: Optional[str] = None
    status: str = "POSTED"
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ProjectExpenditureTransactionCreate(ProjectExpenditureTransactionBase):
    pass

class ProjectExpenditureTransactionUpdate(ProjectExpenditureTransactionBase):
    pass

class ProjectExpenditureTransactionResponse(ProjectExpenditureTransactionBase):
    id: int
    organization_id: int
    expenditure_number: str
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    tower_name: Optional[str] = None
    unit_number: Optional[str] = None
    cost_center_name: Optional[str] = None
    party_display_name: Optional[str] = None
    account_name: Optional[str] = None
    voucher_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProjectExpenditurePaginationResponse(BaseModel):
    items: List[ProjectExpenditureTransactionResponse]
    total: int
    limit: int
    offset: int
    total_gross_amount: Decimal
    total_tax_vat_deducted: Decimal
    total_net_payable: Decimal
    total_paid_amount: Decimal


# 11.4 Project Profitability & Multi-Project Comparative Report Schemas
class ProjectProfitabilityItem(BaseModel):
    project_id: int
    project_code: str
    project_name: str
    status: str
    budget: Decimal
    actual_cost: Decimal
    committed_cost: Decimal
    invoiced_po_overlap: Decimal
    forecast_cost: Decimal
    recognized_revenue: Decimal
    cash_collected: Decimal
    gross_profit: Decimal
    budget_variance: Decimal
    forecast_margin_pct: Decimal
    gross_margin_pct: Decimal
    cost_completion_pct: Decimal
    income_count: int
    expenditure_count: int
    notes: Optional[str] = None

class MultiProjectProfitabilityReportResponse(BaseModel):
    projects: List[ProjectProfitabilityItem]
    total_budget: Decimal
    total_actual_cost: Decimal
    total_committed_cost: Decimal
    total_reconciled_overlap: Decimal
    total_forecast_cost: Decimal
    total_recognized_revenue: Decimal
    total_cash_collected: Decimal
    total_gross_profit: Decimal
    total_budget_variance: Decimal
    overall_gross_margin_pct: Decimal
    overall_forecast_margin_pct: Decimal
    total_projects_count: int
    generated_at: str


# ==============================================================================
# SECTION 13: CUSTOMER ADVANCE & INSTALLMENT ACCOUNTING SCHEMAS (13.1 & 13.2)
# ==============================================================================

class CustomerAdvanceAllocationBase(BaseModel):
    installment_id: Optional[int] = None
    unit_id: Optional[int] = None
    allocated_amount: Decimal
    allocation_date: Optional[date] = None
    allocation_type: str = "INSTALLMENT_DEMAND" # INSTALLMENT_DEMAND, LATE_FEE, REVENUE_RECOGNITION, ADJUSTMENT
    notes: Optional[str] = None

class CustomerAdvanceAllocationCreate(CustomerAdvanceAllocationBase):
    advance_id: int

class CustomerAdvanceAllocationResponse(CustomerAdvanceAllocationBase):
    id: int
    advance_id: int
    gl_clearing_voucher_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CustomerAdvanceInstallmentBase(BaseModel):
    source_module: str = "MANUAL" # BOOKING, SALES, INSTALLMENTS, COLLECTIONS, MANUAL
    source_transaction_id: str
    receipt_date: date
    transaction_type: str = "BOOKING_MONEY" # BOOKING_MONEY, DOWN_PAYMENT, INSTALLMENT_ADVANCE, INTERIM_COLLECTION, etc.
    customer_id: int
    customer_name: Optional[str] = None
    booking_id: Optional[int] = None
    booking_reference_no: Optional[str] = None
    sale_agreement_no: Optional[str] = None
    project_id: int
    project_name: Optional[str] = None
    tower_id: Optional[int] = None
    unit_id: Optional[int] = None
    unit_number: Optional[str] = None
    installment_id: Optional[int] = None
    installment_title: Optional[str] = None
    payment_mode: str = "BANK_TRANSFER"
    bank_account_id: Optional[int] = None
    bank_name: Optional[str] = None
    instrument_no: Optional[str] = None
    instrument_date: Optional[date] = None
    gross_amount: Decimal
    notes: Optional[str] = None

class CustomerAdvanceInstallmentCreate(CustomerAdvanceInstallmentBase):
    pass

class CustomerAdvanceInstallmentUpdate(BaseModel):
    transaction_type: Optional[str] = None
    payment_mode: Optional[str] = None
    bank_account_id: Optional[int] = None
    bank_name: Optional[str] = None
    instrument_no: Optional[str] = None
    instrument_date: Optional[date] = None
    notes: Optional[str] = None

class CustomerAdvanceInstallmentResponse(BaseModel):
    id: int
    advance_number: str
    source_module: str
    source_transaction_id: str
    idempotency_hash: str
    receipt_date: date
    transaction_type: str
    customer_id: int
    customer_name: str
    booking_id: Optional[int] = None
    booking_reference_no: Optional[str] = None
    sale_agreement_no: Optional[str] = None
    project_id: int
    project_name: str
    tower_id: Optional[int] = None
    unit_id: Optional[int] = None
    unit_number: Optional[str] = None
    installment_id: Optional[int] = None
    installment_title: Optional[str] = None
    payment_mode: str
    bank_account_id: Optional[int] = None
    bank_name: Optional[str] = None
    instrument_no: Optional[str] = None
    instrument_date: Optional[date] = None
    gross_amount: Decimal
    allocated_amount: Decimal
    unapplied_credit_balance: Decimal
    revenue_recognized_amount: Decimal
    refunded_amount: Decimal
    forfeiture_amount: Decimal
    late_charges_assessed: Decimal
    late_charges_waived: Decimal
    accounting_status: str
    revenue_recognition_status: str
    gl_voucher_id: Optional[int] = None
    revenue_transfer_voucher_id: Optional[int] = None
    refund_voucher_id: Optional[int] = None
    aging_bucket: str
    days_outstanding: int
    reconciliation_status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    allocations: List[CustomerAdvanceAllocationResponse] = []

    class Config:
        from_attributes = True

class CustomerAdvancePaginationResponse(BaseModel):
    total: int
    page: int
    limit: int
    offset: int
    totalPages: int
    total_gross_advances: Decimal
    total_unapplied_credits: Decimal
    total_allocated_installments: Decimal
    total_recognized_revenue: Decimal
    items: List[CustomerAdvanceInstallmentResponse]

class CustomerAdvanceRevenueRecognizeRequest(BaseModel):
    advance_id: int
    recognized_amount: Decimal
    recognition_policy: str = "POC_IFRS15" # POC_IFRS15, MILESTONE_DEED, HANDOVER_POSSESSION
    revenue_account_id: Optional[int] = None
    notes: Optional[str] = None

class CustomerAdvanceRefundRequest(BaseModel):
    advance_id: int
    refund_amount: Decimal
    forfeiture_amount: Decimal = Decimal("0.00")
    forfeiture_account_id: Optional[int] = None # e.g. 4040 Cancellation Income
    refund_mode: str = "BANK_TRANSFER"
    bank_account_id: Optional[int] = None
    reason: str
    notes: Optional[str] = None

class CustomerAdvanceLateChargeAdjustRequest(BaseModel):
    advance_id: Optional[int] = None
    booking_id: int
    customer_id: int
    adjustment_type: str = "LATE_CHARGE_WAIVER" # LATE_CHARGE_ASSESSMENT, LATE_CHARGE_WAIVER
    amount: Decimal
    approved_by: Optional[str] = None
    approval_reference: Optional[str] = None
    reason: str

class CustomerLiabilityLedgerItem(BaseModel):
    customer_id: int
    customer_name: str
    customer_code: Optional[str] = None
    phone: Optional[str] = None
    booking_count: int
    total_advances_received: Decimal
    total_allocated_to_installments: Decimal
    total_unapplied_credit_balance: Decimal
    total_recognized_revenue: Decimal
    total_refunded: Decimal
    latest_receipt_date: Optional[date] = None
    sale_agreements: List[str] = []
    projects: List[str] = []

class CustomerLiabilityLedgerSummaryResponse(BaseModel):
    total_customers: int
    total_gross_advances: Decimal
    total_unapplied_credits: Decimal
    total_recognized_revenue: Decimal
    total_allocated_installments: Decimal
    customers: List[CustomerLiabilityLedgerItem]

class ReceivableAgingBucketItem(BaseModel):
    bucket_name: str # Current, 1-30 Days, 31-60 Days, 61-90 Days, Over 90 Days
    receivable_demand_amount: Decimal
    customer_advance_coverage_amount: Decimal
    net_exposure_amount: Decimal
    item_count: int

class ReceivableAgingReconciliationResponse(BaseModel):
    total_receivable_demands: Decimal
    total_unapplied_advances: Decimal
    net_uncovered_receivables: Decimal
    reconciliation_ratio_pct: Decimal
    buckets: List[ReceivableAgingBucketItem]
    generated_at: str


# --------------------------------------------------------------------------
# Section 14: Loans, Interest & Financing Schemas
# --------------------------------------------------------------------------

class LoanBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    loan_reference_no: str
    facility_type: str = "PROJECT_TERM_LOAN"
    lender_name: str
    lender_branch: Optional[str] = None
    lender_account_no: Optional[str] = None
    sanction_letter_ref: Optional[str] = None
    sanction_date: date
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    approved_facility_amount: Decimal = Decimal("0.00")
    tenure_months: int = 36
    start_date: date
    maturity_date: date
    repayment_frequency: str = "MONTHLY"
    interest_rate_type: str = "FLOATING_SMART_SPREAD"
    interest_rate_pct: Decimal = Decimal("11.50")
    smart_spread_pct: Decimal = Decimal("3.50")
    calculation_method: str = "REDUCING_BALANCE"
    security_collateral_description: Optional[str] = None
    mortgage_deed_no: Optional[str] = None
    covenants_conditions: Optional[str] = None
    next_repayment_date: Optional[date] = None
    status: str = "ACTIVE"
    is_eligible_for_ias23: bool = True
    notes: Optional[str] = None

class LoanCreate(LoanBase):
    pass

class LoanUpdate(BaseModel):
    facility_type: Optional[str] = None
    lender_name: Optional[str] = None
    lender_branch: Optional[str] = None
    lender_account_no: Optional[str] = None
    sanction_letter_ref: Optional[str] = None
    sanction_date: Optional[date] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    approved_facility_amount: Optional[Decimal] = None
    tenure_months: Optional[int] = None
    start_date: Optional[date] = None
    maturity_date: Optional[date] = None
    repayment_frequency: Optional[str] = None
    interest_rate_type: Optional[str] = None
    interest_rate_pct: Optional[Decimal] = None
    smart_spread_pct: Optional[Decimal] = None
    calculation_method: Optional[str] = None
    security_collateral_description: Optional[str] = None
    mortgage_deed_no: Optional[str] = None
    covenants_conditions: Optional[str] = None
    next_repayment_date: Optional[date] = None
    status: Optional[str] = None
    is_eligible_for_ias23: Optional[bool] = None
    notes: Optional[str] = None

class LoanDisbursementItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    disbursement_ref: str
    loan_id: int
    disbursement_date: date
    gross_amount: Decimal
    processing_fee_deducted: Decimal
    net_received_in_bank: Decimal
    company_bank_account_id: Optional[int] = None
    company_bank_name: Optional[str] = None
    gl_voucher_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

class LoanRepaymentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    payment_ref: str
    loan_id: int
    payment_date: date
    total_amount_paid: Decimal
    principal_component: Decimal
    interest_component: Decimal
    fee_or_penalty_component: Decimal
    bank_account_id: Optional[int] = None
    gl_voucher_id: Optional[int] = None
    lender_statement_ref: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

class LoanInterestAccrualItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    accrual_ref: str
    loan_id: int
    period_start: date
    period_end: date
    calculation_basis_balance: Decimal
    applied_rate_pct: Decimal
    interest_accrued_amount: Decimal
    is_capitalized_to_cwip: bool
    cwip_capitalization_voucher_id: Optional[int] = None
    gl_accrual_voucher_id: Optional[int] = None
    supporting_lender_statement: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

class LoanResponse(LoanBase):
    id: int
    total_disbursed_amount: Decimal
    total_principal_repaid: Decimal
    principal_outstanding: Decimal
    current_portion_outstanding: Decimal
    non_current_portion: Decimal
    total_interest_accrued: Decimal
    total_interest_paid: Decimal
    total_interest_capitalized_cwip: Decimal
    processing_fees_paid: Decimal
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    disbursements: List[LoanDisbursementItem] = []
    repayments: List[LoanRepaymentItem] = []
    interest_accruals: List[LoanInterestAccrualItem] = []

class LoanListResponse(BaseModel):
    total: int
    page: int
    limit: int
    offset: int
    total_pages: int
    items: List[LoanResponse]

class LoanDisbursementCreate(BaseModel):
    disbursement_date: date
    gross_amount: Decimal
    processing_fee_deducted: Decimal = Decimal("0.00")
    company_bank_account_id: Optional[int] = None # Bank Account ID (COA 1120)
    company_bank_name: Optional[str] = None
    notes: Optional[str] = None

class LoanRepaymentCreate(BaseModel):
    payment_date: date
    total_amount_paid: Decimal
    principal_component: Decimal
    interest_component: Decimal
    fee_or_penalty_component: Decimal = Decimal("0.00")
    bank_account_id: Optional[int] = None
    lender_statement_ref: Optional[str] = None
    notes: Optional[str] = None

class LoanInterestAccrualCreate(BaseModel):
    period_start: date
    period_end: date
    calculation_basis_balance: Decimal
    applied_rate_pct: Decimal
    interest_accrued_amount: Decimal
    supporting_lender_statement: Optional[str] = None
    notes: Optional[str] = None

class LoanIAS23CapitalizeRequest(BaseModel):
    accrual_id: int
    capitalization_date: date
    cwip_account_id: Optional[int] = None # Default COA 1220 (Construction WIP)
    eligible_amount: Decimal
    accounting_policy_justification: str
    approved_by: Optional[str] = None
    notes: Optional[str] = None

class LoanPortfolioKPIsResponse(BaseModel):
    total_facilities_count: int
    active_loans_count: int
    total_approved_limit: Decimal
    total_disbursed: Decimal
    total_principal_repaid: Decimal
    total_principal_outstanding: Decimal
    current_portion_liability: Decimal
    non_current_portion_liability: Decimal
    total_interest_accrued: Decimal
    total_interest_paid: Decimal
    total_interest_capitalized_cwip: Decimal
    total_processing_fees: Decimal
    utilization_pct: Decimal
    repayment_pct: Decimal


# --------------------------------------------------------------------------
# Section 12: Construction Cost Allocation & Work in Progress (WIP) Schemas
# --------------------------------------------------------------------------

class CWIPAllocationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    allocation_ref: str
    allocation_date: date
    allocation_method: str = "DIRECT" # DIRECT, QUANTITY_BASED, AREA_BASED, USAGE_BASED, PERCENTAGE
    cost_category: str = "DIRECT_MATERIAL" # DIRECT_MATERIAL, DIRECT_LABOUR, CONTRACTOR_CERTIFIED_WORK, etc.
    source_module: str = "INVENTORY_MATERIAL_ISSUE"
    source_transaction_ref: Optional[str] = None
    original_cost_center_id: Optional[int] = None
    original_project_id: Optional[int] = None
    original_amount: Decimal = Decimal("0.00")
    target_project_id: int
    target_tower_id: Optional[int] = None
    work_package_id: Optional[int] = None
    work_package_name: str
    boq_item_id: Optional[int] = None
    boq_item_ref: Optional[str] = None
    allocated_amount: Decimal = Decimal("0.00")
    allocation_basis_description: str
    basis_metric_value: Optional[Decimal] = None
    basis_metric_unit: Optional[str] = None
    cwip_account_id: int = 30 # Default 1220
    credit_account_id: int = 40 # Default 1150 Inventory or 2130
    status: str = "ALLOCATED"
    notes: Optional[str] = None

class CWIPAllocationCreate(CWIPAllocationBase):
    pass

class CWIPAllocationResponse(CWIPAllocationBase):
    id: int
    gl_voucher_id: Optional[int] = None
    is_transferred_to_cogs: bool = False
    cogs_transfer_voucher_id: Optional[int] = None
    target_project_name: Optional[str] = None
    target_tower_name: Optional[str] = None
    original_project_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class CWIPAllocationListResponse(BaseModel):
    total: int
    page: int
    limit: int
    offset: int
    total_pages: int
    items: List[CWIPAllocationResponse]

class CWIPMaterialIssueBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    issue_ref: str
    issue_date: date
    project_id: int
    project_name: Optional[str] = None
    tower_id: Optional[int] = None
    tower_name: Optional[str] = None
    work_package: str
    material_code: str
    material_name: str
    quantity: Decimal
    unit_of_measure: str = "BAG"
    unit_cost: Decimal
    total_cost: Decimal
    inventory_account_id: int = 40 # COA 1150
    cwip_account_id: int = 30 # COA 1220
    requisition_ref: Optional[str] = None
    issued_by: Optional[str] = None
    received_by: Optional[str] = None
    notes: Optional[str] = None

class CWIPMaterialIssueCreate(CWIPMaterialIssueBase):
    pass

class CWIPMaterialIssueResponse(CWIPMaterialIssueBase):
    id: int
    gl_voucher_id: Optional[int] = None
    status: str
    created_at: Optional[datetime] = None

class CWIPMaterialIssueListResponse(BaseModel):
    total: int
    page: int
    limit: int
    offset: int
    total_pages: int
    items: List[CWIPMaterialIssueResponse]

class CWIPUnitCOGSTransferCreate(BaseModel):
    transfer_date: date
    project_id: int
    unit_id: Optional[int] = None
    unit_number: str
    customer_name: Optional[str] = None
    sale_agreement_ref: Optional[str] = None
    unit_floor_area_sft: Decimal
    cwip_cost_per_sft: Decimal
    transferred_cogs_amount: Decimal
    cwip_account_id: int = 30 # 1220 CWIP
    cogs_account_id: int = 27 # 5100 COPS
    accounting_policy_basis: str
    approved_by: Optional[str] = None
    notes: Optional[str] = None

class CWIPUnitCOGSTransferResponse(CWIPUnitCOGSTransferCreate):
    id: int
    transfer_ref: str
    gl_voucher_id: Optional[int] = None
    created_at: Optional[datetime] = None

class CWIPBudgetVsActualItem(BaseModel):
    project_id: int
    project_name: str
    district: str
    work_packages_count: int
    boq_approved_budget: Decimal
    actual_cwip_accumulated: Decimal
    materials_issued_cost: Decimal
    labour_and_contractor_cost: Decimal
    overhead_and_consultancy_cost: Decimal
    variance_amount: Decimal # Budget - Actual
    variance_pct: Decimal
    completion_percentage: Decimal
    cost_to_complete_forecast: Decimal
    estimate_at_completion: Decimal # Actual + Cost to Complete
    wip_aging_status: str # On Track, Minor Overrun, Critical

class CWIPBudgetTrackingResponse(BaseModel):
    total_projects: int
    portfolio_budget: Decimal
    portfolio_actual_cwip: Decimal
    portfolio_variance: Decimal
    portfolio_cost_to_complete: Decimal
    portfolio_completion_avg_pct: Decimal
    projects: List[CWIPBudgetVsActualItem]

class CWIPPortfolioSummaryKPIs(BaseModel):
    total_allocations_count: int
    total_allocated_cwip: Decimal
    total_material_issues_count: Decimal
    total_material_issues_cost: Decimal
    total_cogs_transferred: Decimal
    budget_utilization_pct: Decimal


# ==============================================================================
# SECTION 15: Bank Reconciliation & MFS Settlement Schemas
# ==============================================================================
class BankStatementRowInput(BaseModel):
    item_uid: Optional[str] = None
    transaction_date: date
    reference_no: Optional[str] = None
    description: str
    debit_amount: Decimal = Decimal("0.00")
    credit_amount: Decimal = Decimal("0.00")
    exception_type: Optional[str] = "NONE"


class BankStatementItemDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reconciliation_id: int
    item_uid: Optional[str] = None
    transaction_date: date
    reference_no: Optional[str] = None
    description: str
    debit_amount: Decimal
    credit_amount: Decimal
    match_status: str # MATCHED, UNMATCHED, DISCREPANCY, SPLIT_MATCHED
    matched_voucher_id: Optional[int] = None
    matched_voucher_number: Optional[str] = None
    exception_type: str # NONE, BANK_CHARGE, INTEREST_EARNED, DIRECT_DEPOSIT, etc.
    split_match_notes: Optional[str] = None
    adjustment_voucher_id: Optional[int] = None
    reconciled_at: Optional[datetime] = None
    is_locked: bool = False


class BankReconciliationDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recon_reference_no: Optional[str] = None
    bank_account_id: int
    bank_account_name: Optional[str] = None
    bank_account_code: Optional[str] = None
    period_start_date: Optional[date] = None
    period_end_date: Optional[date] = None
    statement_date: date
    statement_balance: Decimal
    book_balance: Decimal
    difference_amount: Decimal
    status: str
    statement_format: str
    mfs_provider: Optional[str] = None
    deposits_in_transit: Decimal
    outstanding_cheques: Decimal
    bank_charges_amount: Decimal
    interest_earned_amount: Decimal
    direct_credits_amount: Decimal
    adjusted_bank_balance: Decimal
    adjusted_book_balance: Decimal
    is_reconciled: bool
    reconciliation_notes: Optional[str] = None
    approved_by: Optional[str] = None
    locked_at: Optional[datetime] = None
    is_locked: bool = False
    matched_count: int = 0
    unmatched_count: int = 0
    items: List[BankStatementItemDetail] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BankReconciliationListResponse(BaseModel):
    total: int
    page: int
    limit: int
    offset: int
    total_pages: int
    items: List[BankReconciliationDetailResponse]


class BankReconciliationCreateRequest(BaseModel):
    bank_account_id: int
    recon_reference_no: Optional[str] = None
    period_start_date: Optional[date] = None
    period_end_date: Optional[date] = None
    statement_date: date
    statement_balance: Decimal
    statement_format: str = "EXCEL_STANDARD"
    mfs_provider: Optional[str] = None
    reconciliation_notes: Optional[str] = None
    rows: List[BankStatementRowInput] = []


class ManualMatchRequest(BaseModel):
    statement_item_id: int
    voucher_id: int
    notes: Optional[str] = None


class SplitMatchRequest(BaseModel):
    statement_item_id: int
    voucher_ids: List[int]
    notes: Optional[str] = None


class PrepareAdjustmentJournalRequest(BaseModel):
    statement_item_id: int
    adjustment_type: str # BANK_CHARGE, INTEREST_EARNED, DIRECT_DEPOSIT, UNKNOWN_TRANSACTION
    contra_account_id: int
    narration: str


class ApproveLockPeriodRequest(BaseModel):
    reconciliation_id: int
    approved_by: str
    lock_notes: Optional[str] = None


class BRSItemEntry(BaseModel):
    reference_no: str
    transaction_date: date
    description: str
    amount: Decimal


class BankReconciliationStatementReport(BaseModel):
    reconciliation_id: int
    recon_reference_no: str
    bank_account_name: str
    bank_account_code: str
    statement_date: date
    period_coverage: str
    currency: str = "BDT (৳)"
    
    balance_as_per_bank_statement: Decimal
    add_deposits_in_transit: Decimal
    deposits_in_transit_list: List[BRSItemEntry] = []
    less_outstanding_cheques: Decimal
    outstanding_cheques_list: List[BRSItemEntry] = []
    add_interest_earned: Decimal
    less_bank_charges: Decimal
    net_adjusted_bank_balance: Decimal
    
    general_ledger_book_balance: Decimal
    unreconciled_difference: Decimal
    reconciliation_health: str # FULLY_BALANCED, PENDING_ADJUSTMENT, VARIANCE_DETECTED
    is_period_locked: bool
    approved_by: Optional[str] = None


class BankReconciliationKPIs(BaseModel):
    total_reconciliations_count: int
    active_in_progress_count: int
    total_locked_periods_count: int
    total_statement_value: Decimal
    total_unmatched_value: Decimal
    total_mfs_batches_reconciled: int
    avg_reconciliation_time_days: Decimal
