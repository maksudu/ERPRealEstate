from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project, Tower
from app.modules.auth.models import Organization, User
from app.modules.sales.models import Booking
from app.modules.procurement.models import Vendor
from app.modules.construction.models import Subcontractor


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
    bank_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False, index=True)
    statement_date = Column(Date, nullable=False, index=True)
    statement_balance = Column(Numeric(16, 2), nullable=False)
    book_balance = Column(Numeric(16, 2), nullable=False)
    difference_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    is_reconciled = Column(Boolean, nullable=False, default=False)
    reconciliation_notes = Column(Text, nullable=True)

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
    transaction_date = Column(Date, nullable=False)
    reference_no = Column(String(64), nullable=True, index=True)
    description = Column(String(255), nullable=False)
    debit_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    credit_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    
    # Matching: MATCHED, UNMATCHED, DISCREPANCY
    match_status = Column(String(32), nullable=False, default="UNMATCHED", index=True)
    matched_voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True)

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
