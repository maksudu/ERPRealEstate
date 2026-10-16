from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project
from app.modules.auth.models import Organization, User
from app.modules.sales.models import Booking
from app.modules.procurement.models import Vendor
from app.modules.construction.models import Subcontractor


class ChartOfAccount(Base):
    """
    Standard Double-Entry Chart of Accounts (COA) hierarchical tree.
    `acc_chart_of_accounts`: id, organization_id, account_code, account_name_en, account_name_bn,
    account_type (Asset, Liability, Equity, Revenue, Expense), is_leaf_account.
    """
    __tablename__ = "acc_chart_of_accounts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    parent_account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    account_code = Column(String(32), unique=True, nullable=False, index=True) # e.g. 1000, 1010, 2000, 3000, 4000, 5000
    account_name_en = Column(String(191), nullable=False)
    account_name_bn = Column(String(191), nullable=True)
    account_type = Column(String(32), nullable=False, index=True) # Asset, Liability, Equity, Revenue, Expense
    is_leaf_account = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    parent_account = relationship("ChartOfAccount", remote_side=[id])
    journal_entries = relationship("JournalEntry", back_populates="account")


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
    Double-entry line item.
    `acc_journal_entries`: id, voucher_id, project_id, account_id, voucher_date,
    debit_amount, credit_amount, narration.
    Financial Safeguard: Sum(Debit) == Sum(Credit).
    """
    __tablename__ = "acc_journal_entries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    account_id = Column(BigInteger, ForeignKey("acc_chart_of_accounts.id", ondelete="RESTRICT"), nullable=False, index=True)
    voucher_date = Column(Date, nullable=False, index=True)
    debit_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    credit_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    narration = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    voucher = relationship("Voucher", back_populates="entries")
    project = relationship("Project")
    account = relationship("ChartOfAccount", back_populates="journal_entries")


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


class MushakTaxInvoice(Base):
    """
    Statutory Mushak 6.3 Tax Invoice under Bangladesh VAT Act 2012.
    - Residential <= 1,600 sq ft: 2.0% VAT
    - Residential > 1,600 sq ft: 4.5% VAT
    - Commercial properties: 7.5% - 15.0% VAT
    """
    __tablename__ = "acc_mushak_tax_invoices"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    mushak_challan_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. MUSHAK-6.3-2026-0001
    invoice_date = Column(Date, nullable=False, default=func.current_date())
    developer_bin_number = Column(String(32), nullable=False, default="001234567-0101")
    customer_tin_nid = Column(String(64), nullable=False)
    apartment_sqft = Column(Numeric(10, 2), nullable=False)
    taxable_amount = Column(Numeric(14, 2), nullable=False)
    vat_rate_percent = Column(Numeric(5, 2), nullable=False) # 2.0, 4.5, 7.5, 15.0
    vat_amount = Column(Numeric(14, 2), nullable=False)
    total_amount_collected = Column(Numeric(14, 2), nullable=False)
    pdf_url = Column(String(255), nullable=True)
    status = Column(String(32), nullable=False, default="ISSUED") # ISSUED, CANCELLED

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking")


class TDSDeduction(Base):
    """
    Tax Deduction at Source (TDS/VDS) under Income Tax Act 2023 & VAT Act 2012.
    Deduction sections:
    - Sec 52: Goods & Contract Execution (5%-7%)
    - Sec 52C: Advance against compensation (2%)
    - Sec 53: Commission, broker fees, discounts (10%)
    - Sec 53FF: Real estate developers / land transfer AIT
    """
    __tablename__ = "acc_tds_deductions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True, index=True)
    vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="SET NULL"), nullable=True, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    deduction_section = Column(String(64), nullable=False, index=True) # Sec 52, Sec 52C, Sec 53, Sec 53FF, VDS
    gross_amount = Column(Numeric(14, 2), nullable=False)
    tax_rate_percent = Column(Numeric(5, 2), nullable=False)
    withheld_amount = Column(Numeric(14, 2), nullable=False)
    challan_number = Column(String(64), nullable=True) # Treasury Challan Number e.g. TR-CHAL-99120
    challan_deposit_date = Column(Date, nullable=True)
    status = Column(String(32), nullable=False, default="WITHHELD") # WITHHELD, DEPOSITED_TO_TREASURY

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    voucher = relationship("Voucher")
    vendor = relationship("Vendor")
    contractor = relationship("Subcontractor")

