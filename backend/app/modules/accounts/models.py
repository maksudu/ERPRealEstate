from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, DateTime, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project, Tower
from app.modules.auth.models import Organization, User
from app.modules.sales.models import Booking
from app.modules.procurement.models import Vendor
from app.modules.construction.models import Subcontractor
from app.modules.crm.models import Customer
from app.modules.inventory.models import Unit
from app.modules.installments.models import CustomerInstallment



class ChartOfAccount(Base):
    """
    Tier-1 5-Level Hierarchical Chart of Accounts (COA) Tree.
    - Level 1: Assets, Liabilities, Equity, Revenue, Direct Project Cost, Administrative Expenses
    - Level 2-4: Sub-groups (e.g. Current Assets -> Cash & Bank -> Escrow Accounts, CWIP -> Project Alpha)
    - Level 5: Posting Ledger Accounts
    """
    __tablename__ = "acc_chart_of_accounts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    parent_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    account_code = Column(String(32), unique=True, nullable=False, index=True) # e.g. 1000, 1010, 1010-01
    account_name_en = Column(String(191), nullable=False)
    account_name_bn = Column(String(191), nullable=True)
    account_type = Column(String(32), nullable=False, index=True) # Asset, Liability, Equity, Revenue, Expense, CWIP
    level = Column(Integer, nullable=False, default=5) # 1 to 5
    is_group = Column(Boolean, nullable=False, default=False)
    is_leaf_account = Column(Boolean, nullable=False, default=True)
    currency = Column(String(8), nullable=False, default="BDT")
    is_reconciliation_account = Column(Boolean, nullable=False, default=False) # True for Bank & Escrow Accounts
    is_active = Column(Boolean, nullable=False, default=True)
    normal_balance = Column(String(16), nullable=False, default="Debit") # Debit or Credit
    is_control_account = Column(Boolean, nullable=False, default=False)
    requires_project = Column(Boolean, nullable=False, default=False)
    requires_cost_center = Column(Boolean, nullable=False, default=False)
    statement_mapping = Column(String(64), nullable=True, default="Balance Sheet") # Balance Sheet, Income Statement, Cash Flow
    opening_balance = Column(Numeric(16, 2), nullable=False, default=0.00)
    migration_reference = Column(String(64), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    parent_account = relationship("ChartOfAccount", remote_side=[id])
    journal_entries = relationship("JournalEntry", back_populates="account")


class CostCenter(Base):
    """
    Multi-Project Construction Cost Centers & WBS Dimensions.
    Enables deep tracking of material and labour costs per Project, Tower, and WBS Stage.
    """
    __tablename__ = "acc_cost_centers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    
    cost_center_code = Column(String(32), unique=True, nullable=False, index=True) # e.g. CC-BAY-T1-SUB
    name = Column(String(128), nullable=False)
    # WBS Stage: SUBSTRUCTURE, SUPERSTRUCTURE, FINISHING, MEP, EXTERNAL_WORKS, GENERAL_OVERHEAD
    wbs_stage = Column(String(32), nullable=False, default="SUPERSTRUCTURE", index=True)
    
    budget_allocated = Column(Numeric(14, 2), nullable=False, default=0.00)
    actual_spent = Column(Numeric(14, 2), nullable=False, default=0.00)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project")
    tower = relationship("Tower")


class FiscalYear(Base):
    """
    Corporate Financial Years (e.g. FY 2025-2026).
    """
    __tablename__ = "acc_fiscal_years"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    year_name = Column(String(32), nullable=False, unique=True) # e.g. "FY 2025-2026"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_closed = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())


class Voucher(Base):
    """
    Financial Vouchers Master.
    `acc_vouchers`: id, organization_id, project_id, voucher_number,
    voucher_type (Journal, Cash_Payment, Cash_Receipt, Bank_Payment, Bank_Receipt, Contra),
    voucher_date, narration, total_debit_amount, total_credit_amount, status (Draft, Posted, Reversed).
    """
    __tablename__ = "acc_vouchers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    voucher_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. JV-2026-0001, CP-2026-0001
    voucher_type = Column(String(32), nullable=False, index=True) # Journal, Cash_Payment, Cash_Receipt, Bank_Payment, Bank_Receipt, Contra
    voucher_date = Column(Date, nullable=False, index=True, default=func.current_date())
    narration = Column(Text, nullable=False)
    total_debit_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_credit_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Financial Safeguard Status: Draft, Posted, Reversed
    status = Column(String(32), nullable=False, default="Posted", index=True)
    created_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    reversal_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    source_document_type = Column(String(64), nullable=True)
    source_document_id = Column(BigInteger, nullable=True)
    posted_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    project = relationship("Project")
    created_by = relationship("User")
    entries = relationship("JournalEntry", back_populates="voucher", cascade="all, delete-orphan")


class JournalEntry(Base):
    """
    Double-entry multi-dimensional line item.
    Includes project, cost center, cheque reference, and bill reference.
    """
    __tablename__ = "acc_journal_entries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    voucher_date = Column(Date, primary_key=True, nullable=False, index=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(BigInteger, nullable=True, index=True, default=1)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    cost_center_id = Column(BigInteger, ForeignKey("acc_cost_centers.id", ondelete="SET NULL"), nullable=True, index=True)
    account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    debit_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    credit_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    cheque_no = Column(String(64), nullable=True)
    cheque_date = Column(Date, nullable=True)
    bill_reference = Column(String(64), nullable=True)
    narration = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    voucher = relationship("Voucher", back_populates="entries")
    project = relationship("Project")
    cost_center = relationship("CostCenter")
    account = relationship("ChartOfAccount", back_populates="journal_entries")


class AccPDCVault(Base):
    """
    Post-Dated Cheque (PDC) Vault & Safe Management.
    Enforces status workflow: IN_VAULT -> DEPOSITED -> CLEARED / BOUNCED.
    When bounced, auto-triggers legal action notice under Section 138 of NI Act.
    """
    __tablename__ = "acc_pdc_vault"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="SET NULL"), nullable=True, index=True)
    
    cheque_no = Column(String(64), nullable=False, index=True)
    bank_name = Column(String(128), nullable=False)
    branch_name = Column(String(128), nullable=True)
    drawer_name = Column(String(128), nullable=False) # Customer / Drawer Name
    cheque_date = Column(Date, nullable=False, index=True) # Maturity date
    amount = Column(Numeric(14, 2), nullable=False)
    
    # Status: IN_VAULT, DEPOSITED, CLEARED, BOUNCED, RETURNED_TO_CLIENT
    status = Column(String(32), nullable=False, default="IN_VAULT", index=True)
    deposit_date = Column(Date, nullable=True)
    clearance_date = Column(Date, nullable=True)
    bounce_date = Column(Date, nullable=True)
    bounce_reason = Column(String(255), nullable=True)
    legal_notice_sent = Column(Boolean, nullable=False, default=False)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    booking = relationship("Booking")
    voucher = relationship("Voucher")


PDCVault = AccPDCVault


class CWIPCapitalization(Base):
    """
    Capital Work In Progress (CWIP) to Fixed Asset / Inventory Capitalization.
    Real Estate lifecycle: Accumulate construction cost in CWIP -> Capitalize to Cost of Goods Sold upon completion.
    """
    __tablename__ = "acc_cwip_capitalizations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    cost_center_id = Column(BigInteger, ForeignKey("acc_cost_centers.id", ondelete="SET NULL"), nullable=True)
    
    capitalization_date = Column(Date, nullable=False, default=func.current_date())
    cwip_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    cogs_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    
    capitalized_amount = Column(Numeric(16, 2), nullable=False)
    completion_percentage = Column(Numeric(5, 2), nullable=False, default=100.00)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project")
    cost_center = relationship("CostCenter")
    cwip_account = relationship("ChartOfAccount", foreign_keys=[cwip_account_id])
    cogs_account = relationship("ChartOfAccount", foreign_keys=[cogs_account_id])
    voucher = relationship("Voucher")


class IFRS15RevenueRecognition(Base):
    """
    IFRS 15 Revenue Recognition Engine (Over Time via POC or Point in Time upon Handover).
    DEBIT: Customer Advance Liability
    CREDIT: Real Estate Sales Revenue
    """
    __tablename__ = "acc_revenue_recognitions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    recognition_date = Column(Date, nullable=False, default=func.current_date())
    advance_liability_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    revenue_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    
    recognized_amount = Column(Numeric(14, 2), nullable=False)
    # Method: POC_OVER_TIME, POINT_IN_TIME_HANDOVER
    recognition_method = Column(String(32), nullable=False, default="POINT_IN_TIME_HANDOVER")
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project")
    booking = relationship("Booking")
    voucher = relationship("Voucher")


class BankReconciliation(Base):
    """
    Bank / MFS (bKash/Nagad Merchant) Account Statement Reconciliation.
    `acc_bank_reconciliation`: id, bank_account_id, statement_date, statement_balance,
    book_balance, difference_amount, is_reconciled.
    """
    __tablename__ = "acc_bank_reconciliation"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    recon_reference_no = Column(String(64), nullable=True, index=True)
    bank_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False, index=True)
    period_start_date = Column(Date, nullable=True)
    period_end_date = Column(Date, nullable=True)
    statement_date = Column(Date, nullable=False, index=True)
    statement_balance = Column(Numeric(16, 2), nullable=False)
    book_balance = Column(Numeric(16, 2), nullable=False)
    difference_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Status: DRAFT, AUTO_MATCHED, MANUALLY_REVIEWED, ADJUSTMENT_PENDING, APPROVED, LOCKED
    status = Column(String(32), nullable=False, default="DRAFT", index=True)
    statement_format = Column(String(64), nullable=False, default="EXCEL_STANDARD")
    mfs_provider = Column(String(64), nullable=True)
    
    # BRS Reconciliation Components
    deposits_in_transit = Column(Numeric(16, 2), nullable=False, default=0.00)
    outstanding_cheques = Column(Numeric(16, 2), nullable=False, default=0.00)
    bank_charges_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    interest_earned_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    direct_credits_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    adjusted_bank_balance = Column(Numeric(16, 2), nullable=False, default=0.00)
    adjusted_book_balance = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    is_reconciled = Column(Boolean, nullable=False, default=False)
    reconciliation_notes = Column(Text, nullable=True)
    approved_by = Column(String(128), nullable=True)
    locked_at = Column(DateTime, nullable=True)
    is_locked = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    bank_account = relationship("ChartOfAccount")
    statement_items = relationship("BankStatementItem", back_populates="reconciliation", cascade="all, delete-orphan")


class BankStatementItem(Base):
    """
    Individual parsed lines from Bank Statement (CSV/Excel upload) for automated matching.
    """
    __tablename__ = "acc_bank_statement_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    reconciliation_id = Column(BigInteger, ForeignKey("acc_bank_reconciliation.id", ondelete="CASCADE"), nullable=False, index=True)
    item_uid = Column(String(128), nullable=True, index=True)
    transaction_date = Column(Date, nullable=False)
    reference_no = Column(String(64), nullable=True, index=True)
    description = Column(String(255), nullable=False)
    debit_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    credit_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    
    # Matching: MATCHED, UNMATCHED, DISCREPANCY, SPLIT_MATCHED
    match_status = Column(String(32), nullable=False, default="UNMATCHED", index=True)
    matched_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    matched_voucher_number = Column(String(64), nullable=True)
    
    # Section 15.1 & 15.3 Controls
    exception_type = Column(String(64), nullable=False, default="NONE", index=True)
    split_match_notes = Column(Text, nullable=True)
    adjustment_voucher_id = Column(BigInteger, nullable=True)
    reconciled_at = Column(DateTime, nullable=True)
    is_locked = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

    reconciliation = relationship("BankReconciliation", back_populates="statement_items")
    matched_voucher = relationship("Voucher")


class MushakTaxInvoice(Base):
    """
    Statutory Mushak 6.3 Tax Invoice under Bangladesh VAT Act 2012.
    """
    __tablename__ = "acc_mushak_tax_invoices"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    mushak_challan_number = Column(String(64), unique=True, nullable=False, index=True)
    invoice_date = Column(Date, nullable=False, default=func.current_date())
    developer_bin_number = Column(String(32), nullable=False, default="001234567-0101")
    customer_tin_nid = Column(String(64), nullable=False)
    apartment_sqft = Column(Numeric(10, 2), nullable=False)
    taxable_amount = Column(Numeric(14, 2), nullable=False)
    vat_rate_percent = Column(Numeric(5, 2), nullable=False)
    vat_amount = Column(Numeric(14, 2), nullable=False)
    total_amount_collected = Column(Numeric(14, 2), nullable=False)
    pdf_url = Column(String(255), nullable=True)
    status = Column(String(32), nullable=False, default="ISSUED")

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking")


class TDSDeduction(Base):
    """
    Tax Deduction at Source (TDS/VDS) under Income Tax Act 2023 & VAT Act 2012.
    """
    __tablename__ = "acc_tds_deductions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True, index=True)
    vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="SET NULL"), nullable=True, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    deduction_section = Column(String(64), nullable=False, index=True)
    gross_amount = Column(Numeric(14, 2), nullable=False)
    tax_rate_percent = Column(Numeric(5, 2), nullable=False)
    withheld_amount = Column(Numeric(14, 2), nullable=False)
    challan_number = Column(String(64), nullable=True)
    challan_deposit_date = Column(Date, nullable=True)
    status = Column(String(32), nullable=False, default="WITHHELD")

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    voucher = relationship("Voucher")
    vendor = relationship("Vendor")
    contractor = relationship("Subcontractor")


class APInvoice(Base):
    """
    Accounts Payable Invoice & Contractor Bill Master.
    Supports 3-way matching for procurement, work order verification for construction,
    tax withholding (TDS/VDS), retention, and duplicate invoice detection.
    """
    __tablename__ = "acc_ap_invoices"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    invoice_number = Column(String(64), nullable=False, index=True) # Vendor's invoice number
    invoice_type = Column(String(32), nullable=False, default="Supplier_Material", index=True) # Supplier_Material, Contractor_RA, Professional_Fee, Utility_Admin, Other
    invoice_date = Column(Date, nullable=False, default=func.current_date())
    due_date = Column(Date, nullable=False, index=True)
    vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="SET NULL"), nullable=True, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    payee_name = Column(String(191), nullable=False)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    cost_center_id = Column(BigInteger, ForeignKey("acc_cost_centers.id", ondelete="SET NULL"), nullable=True, index=True)
    expense_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    liability_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    po_id = Column(BigInteger, nullable=True)
    grn_id = Column(BigInteger, nullable=True)
    ra_bill_id = Column(BigInteger, nullable=True)
    
    # Financials
    gross_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    tax_withholding_tds = Column(Numeric(14, 2), nullable=False, default=0.00)
    vat_withholding_vds = Column(Numeric(14, 2), nullable=False, default=0.00)
    retention_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    other_deductions = Column(Numeric(14, 2), nullable=False, default=0.00)
    net_payable_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    paid_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    balance_due = Column(Numeric(16, 2), nullable=False, default=0.00)

    # 3-Way Match & Lifecycle
    three_way_match_status = Column(String(32), nullable=False, default="NOT_APPLICABLE", index=True) # NOT_APPLICABLE, PENDING, MATCHED_OK, VARIANCE_FLAGGED
    status = Column(String(32), nullable=False, default="Draft", index=True) # Draft, Pending_Verification, Approved, Partially_Paid, Paid, Cancelled
    description = Column(Text, nullable=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    approved_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    created_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    vendor = relationship("Vendor")
    contractor = relationship("Subcontractor")
    project = relationship("Project")
    cost_center = relationship("CostCenter")
    expense_account = relationship("ChartOfAccount", foreign_keys=[expense_account_id])
    liability_account = relationship("ChartOfAccount", foreign_keys=[liability_account_id])
    voucher = relationship("Voucher", foreign_keys=[voucher_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    payments = relationship("APPayment", back_populates="invoice", cascade="all, delete-orphan")
    adjustments = relationship("APAdjustment", back_populates="invoice")


class APPayment(Base):
    """
    Accounts Payable Payment Disbursements.
    Records cheque, BEFTN, cash, or pay order disbursements with GL payment voucher link.
    """
    __tablename__ = "acc_ap_payments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    invoice_id = Column(BigInteger, ForeignKey("acc_ap_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_number = Column(String(64), unique=True, nullable=False, index=True)
    payment_date = Column(Date, nullable=False, default=func.current_date(), index=True)
    amount = Column(Numeric(16, 2), nullable=False)
    payment_method = Column(String(32), nullable=False, default="Bank_Transfer") # Bank_Transfer, Bank_Cheque, Cash, Pay_Order
    bank_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    cheque_number = Column(String(64), nullable=True)
    cheque_date = Column(Date, nullable=True)
    transaction_reference = Column(String(128), nullable=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    invoice = relationship("APInvoice", back_populates="payments")
    bank_account = relationship("ChartOfAccount", foreign_keys=[bank_account_id])
    voucher = relationship("Voucher", foreign_keys=[voucher_id])
    created_by = relationship("User", foreign_keys=[created_by_user_id])


class APAdjustment(Base):
    """
    Accounts Payable Debit Notes, Credit Notes & Deductions.
    """
    __tablename__ = "acc_ap_adjustments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    invoice_id = Column(BigInteger, ForeignKey("acc_ap_invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="SET NULL"), nullable=True, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    adjustment_number = Column(String(64), unique=True, nullable=False, index=True)
    adjustment_type = Column(String(32), nullable=False, default="Debit_Note") # Debit_Note, Credit_Note, Retention_Holdback, TDS_VDS_Tax
    adjustment_date = Column(Date, nullable=False, default=func.current_date())
    amount = Column(Numeric(16, 2), nullable=False)
    reason = Column(String(255), nullable=False)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    invoice = relationship("APInvoice", back_populates="adjustments")
    vendor = relationship("Vendor")
    contractor = relationship("Subcontractor")
    voucher = relationship("Voucher", foreign_keys=[voucher_id])


class ARInvoice(Base):
    """
    Accounts Receivable (AR) Demand Notices & Sales Invoices.
    Manages customer milestone installments, down payments, service charges,
    commercial unit rentals, and late fee tracking.
    """
    __tablename__ = "acc_ar_invoices"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    invoice_number = Column(String(64), unique=True, nullable=False, index=True)
    invoice_type = Column(String(32), nullable=False, default="Installment_Demand", index=True)
    invoice_date = Column(Date, nullable=False, default=func.current_date(), index=True)
    due_date = Column(Date, nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name = Column(String(128), nullable=False)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)
    receivable_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    revenue_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)

    # Financial Breakdown
    gross_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    late_fee_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    net_receivable_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    collected_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    balance_due = Column(Numeric(16, 2), nullable=False, default=0.00)

    # Lifecycle & Followup
    status = Column(String(32), nullable=False, default="Issued", index=True) # Draft, Issued, Partially_Collected, Collected, Disputed, Written_Off, Cancelled
    collection_followup_status = Column(String(64), nullable=False, default="Not_Contacted", index=True)
    followup_notes = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    created_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer")
    booking = relationship("Booking")
    project = relationship("Project")
    unit = relationship("Unit")
    receivable_account = relationship("ChartOfAccount", foreign_keys=[receivable_account_id])
    revenue_account = relationship("ChartOfAccount", foreign_keys=[revenue_account_id])
    voucher = relationship("Voucher", foreign_keys=[voucher_id])
    receipts = relationship("ARReceipt", back_populates="invoice", cascade="all, delete-orphan")
    adjustments = relationship("ARAdjustment", back_populates="invoice")


class ARReceipt(Base):
    """
    Accounts Receivable Collection Money Receipts.
    Tracks money receipts, collection instruments (cheque/bank/cash),
    multi-invoice split allocations, and unallocated advance cash.
    """
    __tablename__ = "acc_ar_receipts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    receipt_number = Column(String(64), unique=True, nullable=False, index=True)
    receipt_date = Column(Date, nullable=False, default=func.current_date(), index=True)
    invoice_id = Column(BigInteger, ForeignKey("acc_ar_invoices.id", ondelete="CASCADE"), nullable=True, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    amount = Column(Numeric(16, 2), nullable=False)
    status = Column(String(32), nullable=False, default="Cleared") # Recorded, Cleared, Allocated, Partially_Allocated, Unallocated, Reversed, Refunded
    cleared_at = Column(TIMESTAMP, nullable=True)
    cleared_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    allocated_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    unallocated_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    collection_method = Column(String(32), nullable=False, default="Bank_Transfer") # Bank_Transfer, Bank_Cheque, Pay_Order, Cash, Card_POS, Digital_Wallet
    bank_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    bank_name = Column(String(128), nullable=True)
    cheque_number = Column(String(64), nullable=True)
    cheque_date = Column(Date, nullable=True)
    transaction_reference = Column(String(128), nullable=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    reversal_reason = Column(String(255), nullable=True)
    reversal_date = Column(Date, nullable=True)
    reversal_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    created_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    invoice = relationship("ARInvoice", back_populates="receipts")
    customer = relationship("Customer")
    project = relationship("Project")
    booking = relationship("Booking")
    bank_account = relationship("ChartOfAccount", foreign_keys=[bank_account_id])
    voucher = relationship("Voucher", foreign_keys=[voucher_id])
    reversal_voucher = relationship("Voucher", foreign_keys=[reversal_voucher_id])
    allocations = relationship("ARReceiptAllocation", back_populates="receipt", cascade="all, delete-orphan")


class ARReceiptAllocation(Base):
    """
    Individual allocation of a customer receipt to a specific sales invoice or milestone installment.
    Enables single receipts to be allocated across multiple installments without double counting.
    """
    __tablename__ = "acc_ar_receipt_allocations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    receipt_id = Column(BigInteger, ForeignKey("acc_ar_receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(BigInteger, ForeignKey("acc_ar_invoices.id", ondelete="RESTRICT"), nullable=False, index=True)
    allocated_amount = Column(Numeric(16, 2), nullable=False)
    allocation_date = Column(Date, nullable=False, default=func.current_date())
    notes = Column(Text, nullable=True)
    created_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    receipt = relationship("ARReceipt", back_populates="allocations")
    invoice = relationship("ARInvoice")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])


class ARAdjustment(Base):
    """
    Accounts Receivable Credit Notes, Waivers, Penalties, and Dispute Adjustments.
    """
    __tablename__ = "acc_ar_adjustments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    adjustment_number = Column(String(64), unique=True, nullable=False, index=True)
    adjustment_type = Column(String(32), nullable=False, default="Credit_Note") # Credit_Note, Late_Fee_Waiver, Debit_Note_Penalty, Dispute_Settlement, Write_Off
    adjustment_date = Column(Date, nullable=False, default=func.current_date())
    invoice_id = Column(BigInteger, ForeignKey("acc_ar_invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    amount = Column(Numeric(16, 2), nullable=False)
    reason = Column(String(255), nullable=False)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    invoice = relationship("ARInvoice", back_populates="adjustments")
    customer = relationship("Customer")
    voucher = relationship("Voucher", foreign_keys=[voucher_id])


class CashBox(Base):
    """
    Physical cashboxes, site imprest funds, petty cash boxes, and sales pavilion registers.
    """
    __tablename__ = "acc_cash_boxes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    box_code = Column(String(32), unique=True, nullable=False, index=True)
    box_name = Column(String(128), nullable=False)
    cashbox_type = Column(String(32), nullable=False, default="Head_Office", index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    custodian_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    imprest_limit = Column(Numeric(16, 2), nullable=False, default=50000.00)
    replenishment_threshold = Column(Numeric(16, 2), nullable=False, default=10000.00)
    current_balance = Column(Numeric(16, 2), nullable=False, default=0.00)
    status = Column(String(32), nullable=False, default="Active")
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    account = relationship("ChartOfAccount", foreign_keys=[account_id])
    custodian = relationship("User", foreign_keys=[custodian_user_id])
    vouchers = relationship("PettyCashVoucher", back_populates="cash_box", cascade="all, delete-orphan")


class PettyCashVoucher(Base):
    """
    Petty cash disbursements, imprest expense claims, cash receipts, and cash count audits (shortage/overage).
    """
    __tablename__ = "acc_petty_cash_vouchers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    voucher_number = Column(String(64), unique=True, nullable=False, index=True)
    cash_box_id = Column(BigInteger, ForeignKey("acc_cash_boxes.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True)
    transaction_date = Column(Date, nullable=False, default=func.current_date(), index=True)
    transaction_type = Column(String(32), nullable=False, default="Disbursement", index=True) # Disbursement, Receipt, Imprest_Replenish, Fund_Transfer, Cash_Audit_Count
    amount = Column(Numeric(16, 2), nullable=False)
    payee_name = Column(String(128), nullable=False)
    expense_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    cost_center_id = Column(BigInteger, ForeignKey("acc_cost_centers.id", ondelete="SET NULL"), nullable=True)
    purpose = Column(Text, nullable=False)
    supporting_receipt_ref = Column(String(128), nullable=True)
    cash_count_system = Column(Numeric(16, 2), nullable=True)
    cash_count_physical = Column(Numeric(16, 2), nullable=True)
    variance_amount = Column(Numeric(16, 2), nullable=True, default=0.00)
    gl_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    approved_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), nullable=False, default="Approved")

    created_at = Column(TIMESTAMP, server_default=func.now())

    cash_box = relationship("CashBox", back_populates="vouchers")
    project = relationship("Project")
    expense_account = relationship("ChartOfAccount", foreign_keys=[expense_account_id])
    cost_center = relationship("CostCenter", foreign_keys=[cost_center_id])
    gl_voucher = relationship("Voucher", foreign_keys=[gl_voucher_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])


class BankAccount(Base):
    """
    Corporate bank accounts, branch details, encrypted/masked account number, routing, and cheque book leaf tracking.
    """
    __tablename__ = "acc_bank_accounts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    bank_name = Column(String(128), nullable=False, index=True)
    branch_name = Column(String(128), nullable=False)
    account_name = Column(String(128), nullable=False)
    account_number_encrypted = Column(String(255), nullable=False)
    account_number_masked = Column(String(64), nullable=False)
    routing_number = Column(String(32), nullable=False)
    swift_code = Column(String(32), nullable=True)
    account_type = Column(String(32), nullable=False, default="Current_Account", index=True)
    currency = Column(String(8), nullable=False, default="BDT")
    account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    opening_balance = Column(Numeric(16, 2), nullable=False, default=0.00)
    current_balance = Column(Numeric(16, 2), nullable=False, default=0.00)
    is_escrow = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    cheque_prefix = Column(String(16), nullable=True)
    active_cheque_start = Column(BigInteger, nullable=True)
    active_cheque_end = Column(BigInteger, nullable=True)
    last_used_cheque_no = Column(BigInteger, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    account = relationship("ChartOfAccount", foreign_keys=[account_id])
    transactions = relationship("BankTransaction", back_populates="bank_account", cascade="all, delete-orphan")


class BankTransaction(Base):
    """
    Deposits, withdrawals, transfers, cheque leaves issued, bank charges, and interest.
    """
    __tablename__ = "acc_bank_transactions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    bank_account_id = Column(BigInteger, ForeignKey("acc_bank_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True)
    transaction_date = Column(Date, nullable=False, default=func.current_date(), index=True)
    transaction_type = Column(String(32), nullable=False, default="Deposit", index=True) # Deposit, Withdrawal, Transfer, Cheque_Issue, Bank_Charge, Interest_Income
    amount = Column(Numeric(16, 2), nullable=False)
    cheque_number = Column(String(64), nullable=True)
    cheque_date = Column(Date, nullable=True)
    cheque_status = Column(String(32), nullable=True) # Issued, Presented, Cleared, Bounced, Void
    contra_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    reference_number = Column(String(128), nullable=True)
    particulars = Column(Text, nullable=False)
    gl_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    is_reconciled = Column(Boolean, nullable=False, default=False)
    status = Column(String(32), nullable=False, default="Cleared", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    bank_account = relationship("BankAccount", back_populates="transactions")
    project = relationship("Project")
    contra_account = relationship("ChartOfAccount", foreign_keys=[contra_account_id])
    gl_voucher = relationship("Voucher", foreign_keys=[gl_voucher_id])


class MFSProvider(Base):
    """
    Mobile Financial Service providers (bKash, Nagad, Rocket, Upay).
    Configures merchant account, gateway fee %, settlement bank, and GL mapping.
    """
    __tablename__ = "acc_mfs_providers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    provider_code = Column(String(32), unique=True, nullable=False, index=True)
    provider_name = Column(String(64), nullable=False)
    merchant_number = Column(String(32), nullable=False)
    account_type = Column(String(32), nullable=False, default="Merchant_Wallet")
    fee_percentage = Column(Numeric(6, 3), nullable=False, default=1.500)
    fee_flat_charge = Column(Numeric(10, 2), nullable=False, default=0.00)
    settlement_bank_account_id = Column(BigInteger, ForeignKey("acc_bank_accounts.id", ondelete="SET NULL"), nullable=True)
    fee_expense_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    wallet_gl_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    daily_limit = Column(Numeric(16, 2), nullable=False, default=5000000.00)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    settlement_bank_account = relationship("BankAccount", foreign_keys=[settlement_bank_account_id])
    fee_expense_account = relationship("ChartOfAccount", foreign_keys=[fee_expense_account_id])
    wallet_gl_account = relationship("ChartOfAccount", foreign_keys=[wallet_gl_account_id])
    transactions = relationship("MFSTransaction", back_populates="provider", cascade="all, delete-orphan")


class MFSTransaction(Base):
    """
    MFS payment transactions with gross collection, gateway fee deduction, and net settlement calculation.
    Enforces duplicate callback prevention via unique (mfs_provider_id, transaction_id).
    """
    __tablename__ = "acc_mfs_transactions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    mfs_provider_id = Column(BigInteger, ForeignKey("acc_mfs_providers.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="SET NULL"), nullable=True)
    invoice_id = Column(BigInteger, ForeignKey("acc_ar_invoices.id", ondelete="SET NULL"), nullable=True)
    transaction_id = Column(String(128), nullable=False, index=True)
    payment_reference = Column(String(128), nullable=True)
    customer_phone = Column(String(32), nullable=False)
    gross_amount = Column(Numeric(16, 2), nullable=False)
    fee_deducted = Column(Numeric(16, 2), nullable=False, default=0.00)
    net_settlement_amount = Column(Numeric(16, 2), nullable=False)
    settlement_batch_id = Column(String(64), nullable=True, index=True)
    settlement_date = Column(Date, nullable=True)
    status = Column(String(32), nullable=False, default="Success", index=True)
    callback_payload = Column(Text, nullable=True)
    gl_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    provider = relationship("MFSProvider", back_populates="transactions")
    project = relationship("Project")
    customer = relationship("Customer")
    invoice = relationship("ARInvoice")
    gl_voucher = relationship("Voucher", foreign_keys=[gl_voucher_id])


class PaymentVoucher(Base):
    """
    Outgoing Payment Vouchers.
    Records approved cash, bank, MFS outgoing payments with a 7-stage workflow:
    Draft -> Submitted -> Checked -> Approved -> Posted -> Disbursed -> Reconciled.
    Distinguishes direct operational/office expense from Accounts Payable liquidation.
    """
    __tablename__ = "acc_payment_vouchers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True, default=1)
    branch_name = Column(String(128), nullable=False, default="Head Office Branch")
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    voucher_number = Column(String(64), unique=True, nullable=False, index=True)
    voucher_date = Column(Date, nullable=False, default=func.current_date(), index=True)
    payee_type = Column(String(32), nullable=False, default="Supplier") # Supplier, Subcontractor, Landowner, Employee, Utility, Other
    payee_name = Column(String(128), nullable=False, index=True)
    vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="SET NULL"), nullable=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True)
    landowner_id = Column(BigInteger, nullable=True)
    employee_id = Column(BigInteger, nullable=True)
    payment_method = Column(String(32), nullable=False, default="Bank_Transfer", index=True) # Bank_Transfer, Bank_Cheque, Cash, MFS, Pay_Order
    source_type = Column(String(32), nullable=False, default="Bank_Account") # Bank_Account, Cash_Box, MFS_Wallet
    bank_account_id = Column(BigInteger, ForeignKey("acc_bank_accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    cash_box_id = Column(BigInteger, ForeignKey("acc_cash_boxes.id", ondelete="SET NULL"), nullable=True, index=True)
    mfs_provider_id = Column(BigInteger, ForeignKey("acc_mfs_providers.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(16, 2), nullable=False)
    currency = Column(String(8), nullable=False, default="BDT")
    debit_category = Column(String(32), nullable=False, default="Expense", index=True) # Expense, Payable, Asset_CWIP, Inventory, Advance
    debit_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    credit_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    cost_center_id = Column(BigInteger, ForeignKey("acc_cost_centers.id", ondelete="SET NULL"), nullable=True)
    ap_invoice_id = Column(BigInteger, ForeignKey("acc_ap_invoices.id", ondelete="SET NULL"), nullable=True)
    supporting_invoice_ref = Column(String(128), nullable=True)
    purpose = Column(Text, nullable=False)
    narration = Column(Text, nullable=True)
    attachments_url = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="Draft", index=True) # Draft, Submitted, Checked, Approved, Posted, Disbursed, Reconciled, Cancelled
    cheque_number = Column(String(64), nullable=True)
    cheque_date = Column(Date, nullable=True)
    cheque_status = Column(String(32), nullable=True) # Prepared, Issued, Cleared, Bounced, Void
    settlement_status = Column(String(32), nullable=False, default="Pending_Settlement") # Pending_Settlement, Settled, Failed
    settlement_date = Column(Date, nullable=True)
    settlement_reference = Column(String(128), nullable=True)
    is_reconciled = Column(Boolean, nullable=False, default=False)
    reconciled_at = Column(TIMESTAMP, nullable=True)
    prepared_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    prepared_at = Column(TIMESTAMP, nullable=True)
    checked_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    checked_at = Column(TIMESTAMP, nullable=True)
    checked_remarks = Column(Text, nullable=True)
    approved_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    approved_remarks = Column(Text, nullable=True)
    disbursed_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    disbursed_at = Column(TIMESTAMP, nullable=True)
    gl_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    vendor = relationship("Vendor")
    contractor = relationship("Subcontractor")
    bank_account = relationship("BankAccount")
    cash_box = relationship("CashBox")
    mfs_provider = relationship("MFSProvider")
    debit_account = relationship("ChartOfAccount", foreign_keys=[debit_account_id])
    credit_account = relationship("ChartOfAccount", foreign_keys=[credit_account_id])
    cost_center = relationship("CostCenter")
    ap_invoice = relationship("APInvoice")
    gl_voucher = relationship("Voucher", foreign_keys=[gl_voucher_id])
    prepared_by = relationship("User", foreign_keys=[prepared_by_user_id])
    checked_by = relationship("User", foreign_keys=[checked_by_user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    disbursed_by = relationship("User", foreign_keys=[disbursed_by_user_id])


class ProjectFinancialDimensionConfig(Base):
    """
    Submodule 11.1: Project Financial Dimensions Configuration.
    Allows configuring which financial dimensions are mandatory for each account
    and transaction type.
    """
    __tablename__ = "acc_project_dimension_configs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, nullable=False, default=1)
    account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    account_code = Column(String(32), nullable=True)
    account_name = Column(String(191), nullable=True)
    account_type = Column(String(32), nullable=True)
    transaction_type = Column(String(32), nullable=False, default="ALL") # ALL, VOUCHER, DIRECT_INCOME, DIRECT_EXPENSE, BILL, INVOICE, PAYMENT, RECEIPT
    
    # Financial Dimension Mandatory Toggles
    is_company_branch_mandatory = Column(Boolean, nullable=False, default=True)
    is_project_mandatory = Column(Boolean, nullable=False, default=True)
    is_tower_mandatory = Column(Boolean, nullable=False, default=False)
    is_unit_mandatory = Column(Boolean, nullable=False, default=False)
    is_department_cost_center_mandatory = Column(Boolean, nullable=False, default=True)
    is_construction_phase_mandatory = Column(Boolean, nullable=False, default=False)
    is_cost_category_mandatory = Column(Boolean, nullable=False, default=True)
    is_party_mandatory = Column(Boolean, nullable=False, default=False) # Supplier or Customer
    is_budget_line_mandatory = Column(Boolean, nullable=False, default=False)
    
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    account = relationship("ChartOfAccount")


class ProjectIncomeTransaction(Base):
    """
    Submodule 11.2: Project Income Recognition & Financial Dimensions.
    Tracks all project income:
    - Property-sale income recognized under approved policy (POC/IFRS-15, etc.)
    - Rental income
    - Service & maintenance income
    - Parking & other contractual income
    - Other project-related income
    Tagged with 11.1 financial dimensions.
    """
    __tablename__ = "acc_project_income_transactions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, nullable=False, default=1)
    income_number = Column(String(64), unique=True, nullable=False, index=True)
    transaction_date = Column(Date, nullable=False, index=True, default=func.current_date())
    
    # 11.1 Financial Dimensions
    company_name = Column(String(128), nullable=False, default="Bengal Real Estate Ltd.")
    branch_name = Column(String(128), nullable=False, default="Head Office - Gulshan")
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, nullable=True)
    unit_id = Column(BigInteger, nullable=True)
    department_name = Column(String(128), nullable=False, default="Sales & Revenue")
    cost_center_id = Column(BigInteger, ForeignKey("acc_cost_centers.id", ondelete="SET NULL"), nullable=True)
    construction_phase = Column(String(64), nullable=True)
    cost_category = Column(String(64), nullable=False, default="PROPERTY_SALE", index=True) # PROPERTY_SALE, RENTAL_INCOME, SERVICE_INCOME, PARKING_CONTRACTUAL, OTHER_PROJECT_INCOME
    
    customer_id = Column(BigInteger, nullable=True)
    party_name = Column(String(191), nullable=True)
    budget_line_code = Column(String(64), nullable=True)
    account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    
    # Financial Amounts & Policy Recognition
    contract_value = Column(Numeric(16, 2), nullable=False, default=0.00)
    recognized_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    cash_collected_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    unearned_revenue = Column(Numeric(16, 2), nullable=False, default=0.00)
    recognition_policy = Column(String(64), nullable=False, default="POC_IFRS15")
    payment_method = Column(String(32), nullable=False, default="Bank_Transfer")
    reference_no = Column(String(128), nullable=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), nullable=False, default="POSTED", index=True) # DRAFT, POSTED, REVERSED, AUDITED
    notes = Column(Text, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    cost_center = relationship("CostCenter")
    account = relationship("ChartOfAccount")
    voucher = relationship("Voucher")


class ProjectExpenditureTransaction(Base):
    """
    Submodule 11.3: Project Expenditure Recognition & Financial Dimensions.
    Tracks all 12 project expenditure categories:
    - Land acquisition and eligible acquisition costs
    - Design, consultancy and engineering
    - Site preparation and earthworks
    - Civil construction
    - Electrical, plumbing and mechanical works
    - Finishing materials and labour
    - Contractor bills
    - Equipment and site operations
    - Approval and professional fees
    - Sales and marketing costs
    - Financing costs where eligible under the accounting policy
    - Allocated overheads
    Tagged with 11.1 financial dimensions.
    Reconciles committed purchase orders without double-counting!
    """
    __tablename__ = "acc_project_expenditure_transactions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, nullable=False, default=1)
    expenditure_number = Column(String(64), unique=True, nullable=False, index=True)
    transaction_date = Column(Date, nullable=False, index=True, default=func.current_date())
    
    # 11.1 Financial Dimensions
    company_name = Column(String(128), nullable=False, default="Bengal Real Estate Ltd.")
    branch_name = Column(String(128), nullable=False, default="Head Office - Gulshan")
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, nullable=True)
    unit_id = Column(BigInteger, nullable=True)
    department_name = Column(String(128), nullable=False, default="Civil Engineering")
    cost_center_id = Column(BigInteger, ForeignKey("acc_cost_centers.id", ondelete="SET NULL"), nullable=True)
    construction_phase = Column(String(64), nullable=True)
    cost_category = Column(String(64), nullable=False, default="CIVIL_CONSTRUCTION", index=True)
    
    party_type = Column(String(32), nullable=False, default="Supplier") # Supplier, Contractor, Consultant, Government_Authority, Bank
    vendor_id = Column(BigInteger, nullable=True)
    contractor_id = Column(BigInteger, nullable=True)
    party_name = Column(String(191), nullable=True)
    budget_line_code = Column(String(64), nullable=True)
    account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    
    # Financial Amounts
    gross_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    tax_vat_deducted = Column(Numeric(16, 2), nullable=False, default=0.00)
    retention_deducted = Column(Numeric(16, 2), nullable=False, default=0.00)
    net_payable_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    paid_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # 11.4 Overlap Reconciliation with PO/Work Orders
    committed_po_reference = Column(String(64), nullable=True, index=True)
    expenditure_type = Column(String(32), nullable=False, default="POSTED_ACTUAL") # POSTED_ACTUAL, ACCRUED_UNPAID, COMMITTED_PO
    payment_status = Column(String(32), nullable=False, default="PAID") # UNPAID, PARTIALLY_PAID, PAID
    payment_method = Column(String(32), nullable=False, default="Bank_Transfer")
    reference_no = Column(String(128), nullable=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), nullable=False, default="POSTED", index=True) # DRAFT, APPROVED, POSTED, REVERSED
    notes = Column(Text, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    cost_center = relationship("CostCenter")
    account = relationship("ChartOfAccount")
    voucher = relationship("Voucher")


# ==============================================================================
# SECTION 13: CUSTOMER ADVANCE & INSTALLMENT ACCOUNTING (13.1 & 13.2)
# ==============================================================================

class CustomerAdvanceInstallment(Base):
    """
    Section 13: Customer Advance & Installment Accounting Master Ledger.
    Integrates Finance module with Booking, Sales, and Installment & Collection Management.
    Enforces idempotency, customer liability tracking, unit/installment waterfall allocation,
    late charges waiver/adjustments, cancellation refunds, and revenue recognition transfer.
    """
    __tablename__ = "acc_customer_advance_installments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    advance_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. "ADV-2026-0001"
    source_module = Column(String(32), nullable=False, default="MANUAL") # BOOKING, SALES, INSTALLMENTS, COLLECTIONS, MANUAL
    source_transaction_id = Column(String(128), nullable=False) # Source ID e.g. "BK-REC-8902", "MR-2026-0045"
    idempotency_hash = Column(String(64), unique=True, nullable=False, index=True) # SHA-256 preventing double posting
    receipt_date = Column(Date, nullable=False, default=func.current_date(), index=True)

    # 13.1 Feature Transaction Types:
    # BOOKING_MONEY, DOWN_PAYMENT, INSTALLMENT_ADVANCE, INTERIM_COLLECTION,
    # LATE_CHARGE_ASSESSMENT, LATE_CHARGE_WAIVER, CANCELLATION_REFUND, REVENUE_RECOGNITION_TRANSFER
    transaction_type = Column(String(64), nullable=False, default="BOOKING_MONEY", index=True)

    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_name = Column(String(191), nullable=False)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="SET NULL"), nullable=True, index=True)
    booking_reference_no = Column(String(64), nullable=True)
    sale_agreement_no = Column(String(64), nullable=True) # Contract linkage

    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_name = Column(String(191), nullable=False)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)
    unit_number = Column(String(64), nullable=True)
    installment_id = Column(BigInteger, ForeignKey("sls_customer_installments.id", ondelete="SET NULL"), nullable=True)
    installment_title = Column(String(191), nullable=True)

    payment_mode = Column(String(32), nullable=False, default="BANK_TRANSFER") # BANK_TRANSFER, CHEQUE, CASH, MFS_BKASH, MFS_NAGAD
    bank_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    bank_name = Column(String(128), nullable=True)
    instrument_no = Column(String(64), nullable=True)
    instrument_date = Column(Date, nullable=True)

    # Financial Liability Ledger Amounts
    gross_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    allocated_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    unapplied_credit_balance = Column(Numeric(16, 2), nullable=False, default=0.00)
    revenue_recognized_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    refunded_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    forfeiture_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    late_charges_assessed = Column(Numeric(14, 2), nullable=False, default=0.00)
    late_charges_waived = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Statuses
    accounting_status = Column(String(32), nullable=False, default="ADVANCE_RECORDED", index=True) # ADVANCE_RECORDED, PARTIALLY_ALLOCATED, FULLY_ALLOCATED, RECOGNIZED_REVENUE, REFUNDED_CANCELLED
    revenue_recognition_status = Column(String(32), nullable=False, default="UNEARNED_LIABILITY") # UNEARNED_LIABILITY, POC_ELIGIBLE, TRANSFERRED_TO_REVENUE

    # Double Entry Accounting Vouchers
    gl_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True) # Debit Bank/Cash, Credit Customer Advances (2120)
    revenue_transfer_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True) # Debit Customer Advances (2120), Credit Revenue (4010)
    refund_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True) # Debit Customer Advances, Credit Bank

    # Aging & Reconciliation
    aging_bucket = Column(String(32), nullable=False, default="CURRENT") # CURRENT, 1_30_DAYS, 31_60_DAYS, 61_90_DAYS, OVER_90_DAYS
    days_outstanding = Column(Integer, nullable=False, default=0)
    reconciliation_status = Column(String(32), nullable=False, default="RECONCILED") # RECONCILED, PENDING_REVIEW, DISPUTED
    notes = Column(Text, nullable=True)
    created_by_user_id = Column(BigInteger, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer")
    booking = relationship("Booking")
    project = relationship("Project")
    tower = relationship("Tower")
    unit = relationship("Unit")
    installment = relationship("CustomerInstallment")
    bank_account = relationship("ChartOfAccount", foreign_keys=[bank_account_id])
    gl_voucher = relationship("Voucher", foreign_keys=[gl_voucher_id])
    revenue_transfer_voucher = relationship("Voucher", foreign_keys=[revenue_transfer_voucher_id])
    refund_voucher = relationship("Voucher", foreign_keys=[refund_voucher_id])
    allocations = relationship("CustomerAdvanceAllocation", back_populates="advance", cascade="all, delete-orphan")


class CustomerAdvanceAllocation(Base):
    """
    Section 13: Granular allocation of Customer Advance to Installment Demand or Revenue Recognition.
    """
    __tablename__ = "acc_customer_advance_allocations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    advance_id = Column(BigInteger, ForeignKey("acc_customer_advance_installments.id", ondelete="CASCADE"), nullable=False, index=True)
    installment_id = Column(BigInteger, ForeignKey("sls_customer_installments.id", ondelete="SET NULL"), nullable=True, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)
    allocated_amount = Column(Numeric(16, 2), nullable=False)
    allocation_date = Column(Date, nullable=False, default=func.current_date())
    allocation_type = Column(String(32), nullable=False, default="INSTALLMENT_DEMAND") # INSTALLMENT_DEMAND, LATE_FEE, REVENUE_RECOGNITION, ADJUSTMENT
    gl_clearing_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_user_id = Column(BigInteger, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    advance = relationship("CustomerAdvanceInstallment", back_populates="allocations")
    installment = relationship("CustomerInstallment")
    unit = relationship("Unit")
    gl_clearing_voucher = relationship("Voucher", foreign_keys=[gl_clearing_voucher_id])


class Loan(Base):
    """
    Section 14: Bank and Financial Institution Loan Management, Facility records,
    repayment schedule, interest rates, security/mortgage, covenants, and IAS 23 tracking.
    """
    __tablename__ = "acc_loans"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    loan_reference_no = Column(String(64), unique=True, nullable=False, index=True)
    facility_type = Column(String(64), nullable=False, default="PROJECT_TERM_LOAN")
    lender_name = Column(String(191), nullable=False, index=True)
    lender_branch = Column(String(191), nullable=True)
    lender_account_no = Column(String(64), nullable=True)
    sanction_letter_ref = Column(String(128), nullable=True)
    sanction_date = Column(Date, nullable=False)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    project_name = Column(String(191), nullable=True)
    
    approved_facility_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_disbursed_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_principal_repaid = Column(Numeric(16, 2), nullable=False, default=0.00)
    principal_outstanding = Column(Numeric(16, 2), nullable=False, default=0.00)
    current_portion_outstanding = Column(Numeric(16, 2), nullable=False, default=0.00)
    non_current_portion = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    tenure_months = Column(Integer, nullable=False, default=36)
    start_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=False)
    repayment_frequency = Column(String(32), nullable=False, default="MONTHLY")
    
    interest_rate_type = Column(String(32), nullable=False, default="FLOATING_SMART_SPREAD")
    interest_rate_pct = Column(Numeric(6, 2), nullable=False, default=11.50)
    smart_spread_pct = Column(Numeric(6, 2), nullable=False, default=3.50)
    calculation_method = Column(String(32), nullable=False, default="REDUCING_BALANCE")
    
    total_interest_accrued = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_interest_paid = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_interest_capitalized_cwip = Column(Numeric(16, 2), nullable=False, default=0.00)
    processing_fees_paid = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    security_collateral_description = Column(Text, nullable=True)
    mortgage_deed_no = Column(String(128), nullable=True)
    covenants_conditions = Column(Text, nullable=True)
    next_repayment_date = Column(Date, nullable=True)
    
    status = Column(String(32), nullable=False, default="ACTIVE")
    is_eligible_for_ias23 = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    disbursements = relationship("LoanDisbursement", back_populates="loan", cascade="all, delete-orphan")
    repayments = relationship("LoanRepayment", back_populates="loan", cascade="all, delete-orphan")
    interest_accruals = relationship("LoanInterestAccrual", back_populates="loan", cascade="all, delete-orphan")


class LoanDisbursement(Base):
    """
    Section 14: Loan disbursement tranches with GL double-entry voucher generation.
    Debit Bank Account (1120), Credit Bank Loan Payable (2140/2210).
    """
    __tablename__ = "acc_loan_disbursements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    disbursement_ref = Column(String(64), unique=True, nullable=False, index=True)
    loan_id = Column(BigInteger, ForeignKey("acc_loans.id", ondelete="CASCADE"), nullable=False, index=True)
    disbursement_date = Column(Date, nullable=False, index=True)
    gross_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    processing_fee_deducted = Column(Numeric(16, 2), nullable=False, default=0.00)
    net_received_in_bank = Column(Numeric(16, 2), nullable=False, default=0.00)
    company_bank_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    company_bank_name = Column(String(128), nullable=True)
    gl_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    loan = relationship("Loan", back_populates="disbursements")
    bank_account = relationship("ChartOfAccount")
    gl_voucher = relationship("Voucher")


class LoanRepayment(Base):
    """
    Section 14: Loan Repayments with Principal, Interest, and Penalty component split.
    """
    __tablename__ = "acc_loan_repayments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    payment_ref = Column(String(64), unique=True, nullable=False, index=True)
    loan_id = Column(BigInteger, ForeignKey("acc_loans.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_date = Column(Date, nullable=False, index=True)
    total_amount_paid = Column(Numeric(16, 2), nullable=False, default=0.00)
    principal_component = Column(Numeric(16, 2), nullable=False, default=0.00)
    interest_component = Column(Numeric(16, 2), nullable=False, default=0.00)
    fee_or_penalty_component = Column(Numeric(16, 2), nullable=False, default=0.00)
    bank_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True)
    gl_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    lender_statement_ref = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    loan = relationship("Loan", back_populates="repayments")
    bank_account = relationship("ChartOfAccount")
    gl_voucher = relationship("Voucher")


class LoanInterestAccrual(Base):
    """
    Section 14: Interest Accruals and optional IAS 23 Borrowing Cost Capitalization into CWIP (1220).
    """
    __tablename__ = "acc_loan_interest_accruals"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    accrual_ref = Column(String(64), unique=True, nullable=False, index=True)
    loan_id = Column(BigInteger, ForeignKey("acc_loans.id", ondelete="CASCADE"), nullable=False, index=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    calculation_basis_balance = Column(Numeric(16, 2), nullable=False, default=0.00)
    applied_rate_pct = Column(Numeric(6, 2), nullable=False, default=0.00)
    interest_accrued_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    is_capitalized_to_cwip = Column(Boolean, nullable=False, default=False)
    cwip_capitalization_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    gl_accrual_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    supporting_lender_statement = Column(String(191), nullable=True)
    status = Column(String(32), nullable=False, default="ACCRUED") # ACCRUED, CAPITALIZED_CWIP, RECONCILED, DISPUTED
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    loan = relationship("Loan", back_populates="interest_accruals")
    gl_accrual_voucher = relationship("Voucher", foreign_keys=[gl_accrual_voucher_id])
    cwip_capitalization_voucher = relationship("Voucher", foreign_keys=[cwip_capitalization_voucher_id])


class CWIPAllocation(Base):
    """
    Section 12: Construction Cost Allocation & Work in Progress (WIP).
    Preserves original incurred cost and records traceable allocation accounting transaction.
    Allocation Methods: Direct, Quantity-based, Area-based, Usage-based, Percentage.
    """
    __tablename__ = "acc_cwip_allocations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    allocation_ref = Column(String(64), unique=True, nullable=False, index=True)
    allocation_date = Column(Date, nullable=False, index=True)
    allocation_method = Column(String(64), nullable=False, default="DIRECT") # DIRECT, QUANTITY_BASED, AREA_BASED, USAGE_BASED, PERCENTAGE
    cost_category = Column(String(64), nullable=False, default="DIRECT_MATERIAL") # DIRECT_MATERIAL, DIRECT_LABOUR, CONTRACTOR_CERTIFIED_WORK, ENGINEERING_CONSULTANCY, SITE_OVERHEAD, EQUIPMENT_USAGE_DEPRECIATION, SHARED_PROJECT_COST
    source_module = Column(String(64), nullable=False, default="INVENTORY_MATERIAL_ISSUE")
    source_transaction_ref = Column(String(64), nullable=True)
    
    # Preserves original source
    original_cost_center_id = Column(BigInteger, ForeignKey("acc_cost_centers.id", ondelete="SET NULL"), nullable=True)
    original_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True)
    original_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Target allocation
    target_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    target_tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    work_package_id = Column(BigInteger, nullable=True)
    work_package_name = Column(String(191), nullable=False)
    boq_item_id = Column(BigInteger, nullable=True)
    boq_item_ref = Column(String(128), nullable=True)
    
    allocated_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    allocation_basis_description = Column(Text, nullable=False)
    basis_metric_value = Column(Numeric(12, 2), nullable=True)
    basis_metric_unit = Column(String(32), nullable=True)
    
    cwip_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    credit_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    gl_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    
    is_transferred_to_cogs = Column(Boolean, nullable=False, default=False)
    cogs_transfer_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), nullable=False, default="ALLOCATED") # ALLOCATED, TRANSFERRED_TO_COGS, REVERSED
    created_by_user_id = Column(BigInteger, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    original_project = relationship("Project", foreign_keys=[original_project_id])
    target_project = relationship("Project", foreign_keys=[target_project_id])
    target_tower = relationship("Tower", foreign_keys=[target_tower_id])
    cwip_account = relationship("ChartOfAccount", foreign_keys=[cwip_account_id])
    credit_account = relationship("ChartOfAccount", foreign_keys=[credit_account_id])
    gl_voucher = relationship("Voucher", foreign_keys=[gl_voucher_id])
    cogs_transfer_voucher = relationship("Voucher", foreign_keys=[cogs_transfer_voucher_id])


class CWIPMaterialIssue(Base):
    """
    Section 12.3: Material Issue to Construction.
    Debit Construction WIP (1220), Credit Construction Material Inventory (1150).
    """
    __tablename__ = "acc_cwip_material_issues"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    issue_ref = Column(String(64), unique=True, nullable=False, index=True)
    issue_date = Column(Date, nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_name = Column(String(191), nullable=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True)
    tower_name = Column(String(128), nullable=True)
    work_package = Column(String(191), nullable=False)
    material_code = Column(String(64), nullable=False, index=True)
    material_name = Column(String(191), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False, default=0.00)
    unit_of_measure = Column(String(32), nullable=False, default="BAG")
    unit_cost = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_cost = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    inventory_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    cwip_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    gl_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    requisition_ref = Column(String(64), nullable=True)
    issued_by = Column(String(128), nullable=True)
    received_by = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default="ISSUED")
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project")
    tower = relationship("Tower")
    inventory_account = relationship("ChartOfAccount", foreign_keys=[inventory_account_id])
    cwip_account = relationship("ChartOfAccount", foreign_keys=[cwip_account_id])
    gl_voucher = relationship("Voucher")


class CWIPUnitCOGSTransfer(Base):
    """
    Section 12.3: Transfer of accumulated development cost to Cost of Sales (COPS 5100)
    upon unit handover/sale recognition.
    Debit Cost of Property Sold (5100), Credit Construction WIP (1220).
    """
    __tablename__ = "acc_cwip_unit_cogs_transfers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    transfer_ref = Column(String(64), unique=True, nullable=False, index=True)
    transfer_date = Column(Date, nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)
    unit_number = Column(String(64), nullable=False)
    customer_name = Column(String(191), nullable=True)
    sale_agreement_ref = Column(String(64), nullable=True)
    unit_floor_area_sft = Column(Numeric(10, 2), nullable=False, default=0.00)
    cwip_cost_per_sft = Column(Numeric(10, 2), nullable=False, default=0.00)
    transferred_cogs_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    cwip_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    cogs_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False)
    gl_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)
    accounting_policy_basis = Column(Text, nullable=False)
    approved_by = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project")
    unit = relationship("Unit")
    cwip_account = relationship("ChartOfAccount", foreign_keys=[cwip_account_id])
    cogs_account = relationship("ChartOfAccount", foreign_keys=[cogs_account_id])
    gl_voucher = relationship("Voucher")





