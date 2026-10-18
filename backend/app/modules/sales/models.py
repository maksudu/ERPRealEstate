from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, JSON, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project
from app.modules.inventory.models import Unit
from app.modules.crm.models import Customer
from app.modules.auth.models import User

class Booking(Base):
    """
    Sales Booking Master record for apartment, commercial, and parking units.
    Tracks contract value, earnest money, multi-level discount approvals, and statutory statuses.
    """
    __tablename__ = "sls_bookings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_reference_no = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'BK-2026-0089'
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    primary_customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    booking_date = Column(Date, nullable=False, default=func.current_date())
    
    # Financial Terms
    base_unit_price = Column(Numeric(14, 2), nullable=False) # Undiscounted list price
    discount_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    discount_percentage = Column(Numeric(5, 2), nullable=False, default=0.00)
    
    # Required Approval Tier: 'SALES_MANAGER' (<= 1%), 'DIRECTOR' (<= 3%), 'MANAGING_DIRECTOR' (> 3%)
    required_approval_tier = Column(String(64), nullable=False, default="SALES_MANAGER")
    # Status: 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'
    discount_approval_status = Column(String(32), nullable=False, default="APPROVED")
    discount_approved_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    discount_approval_notes = Column(Text, nullable=True)

    # Pricing Breakdown under REHAB / Bangladesh Real Estate Standards
    parking_charge = Column(Numeric(14, 2), nullable=False, default=0.00)
    utility_charge = Column(Numeric(14, 2), nullable=False, default=0.00) # Gas, Electricity, Water & Sewerage connection
    documentation_charge = Column(Numeric(14, 2), nullable=False, default=0.00) # Legal vetting, deed drafting & stamp charges
    parking_slot_number = Column(String(64), nullable=True)

    # Link to Governance Maker-Checker Approval Request
    governance_request_id = Column(BigInteger, ForeignKey("gov_approval_requests.id", ondelete="SET NULL"), nullable=True)

    final_contract_value = Column(Numeric(14, 2), nullable=False) # (base_price + parking + utility + doc) - discount
    earnest_money_received = Column(Numeric(14, 2), nullable=False, default=0.00)
    down_payment_total = Column(Numeric(14, 2), nullable=False, default=0.00)
    booking_money_target = Column(Numeric(14, 2), nullable=True) # Spec 5.5: Illustrative e.g. 5%
    down_payment_target = Column(Numeric(14, 2), nullable=True) # Spec 5.5: Illustrative e.g. 15% inclusive of booking money
    down_payment_received = Column(Numeric(14, 2), nullable=False, default=0.00)
    down_payment_due_date = Column(Date, nullable=True)
    down_payment_status = Column(String(32), nullable=False, default="PENDING") # PENDING, PARTIAL, COMPLETED
    
    # Workflow & Sales Rep (Spec 5.1, 5.2, 5.3)
    reservation_expiry_date = Column(Date, nullable=True)
    sales_rep_name = Column(String(128), nullable=True)
    workflow_stage = Column(String(64), nullable=False, default="05_BOOKING_CONFIRMED")

    # Lifecycle: 'PROVISIONAL', 'AGREEMENT_SIGNED', 'REGISTRATION_DONE', 'CANCELLED', 'TRANSFERRED'
    status = Column(String(32), nullable=False, default="PROVISIONAL", index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project")
    unit = relationship("Unit")
    customer = relationship("Customer")
    discount_approved_by = relationship("User")
    cancellation = relationship("BookingCancellation", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    transfers = relationship("UnitTransfer", back_populates="booking", cascade="all, delete-orphan")
    joint_buyers = relationship("BookingJointBuyer", back_populates="booking", cascade="all, delete-orphan")
    nominees = relationship("BookingNominee", back_populates="booking", cascade="all, delete-orphan")
    collections = relationship("BookingPaymentCollection", back_populates="booking", cascade="all, delete-orphan")
    documents = relationship("SalesLegalDocument", back_populates="booking", cascade="all, delete-orphan")


class BookingNominee(Base):
    """
    Nominee details registered for an apartment booking.
    Recorded separately from contractual buyers (Spec 5.3).
    The system does not treat nominees automatically as legal buyers.
    """
    __tablename__ = "sls_booking_nominees"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String(191), nullable=False)
    relation_to_buyer = Column(String(64), nullable=False) # e.g. SPOUSE, SON, DAUGHTER, BROTHER
    contact_phone = Column(String(32), nullable=False)
    email = Column(String(128), nullable=True)
    nid_or_passport = Column(String(64), nullable=True)
    nomination_percentage = Column(Numeric(5, 2), nullable=False, default=100.00)
    effective_date = Column(Date, nullable=False, default=func.current_date())
    supporting_document_url = Column(String(255), nullable=True)
    approval_status = Column(String(32), nullable=False, default="APPROVED")
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking", back_populates="nominees")


class BookingJointBuyer(Base):
    """
    Joint Buyers / Co-applicants KYC under Bangladesh Real Estate Act.
    Supports husband-wife, parent-child, and business partner co-ownership with specified shares.
    """
    __tablename__ = "sls_booking_joint_buyers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name_en = Column(String(191), nullable=False)
    full_name_bn = Column(String(191), nullable=True)
    nid_number = Column(String(64), nullable=True, index=True)
    passport_number = Column(String(64), nullable=True)
    tin_number = Column(String(64), nullable=True)
    primary_phone = Column(String(32), nullable=False)
    email = Column(String(128), nullable=True)
    present_address = Column(Text, nullable=True)
    relation_to_primary = Column(String(64), nullable=False, default="CO_APPLICANT") # SPOUSE, BROTHER, SON, DAUGHTER, PARTNER
    share_percentage = Column(Numeric(5, 2), nullable=False, default=50.00)
    photo_url = Column(String(255), nullable=True)
    nid_scan_url = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    booking = relationship("Booking", back_populates="joint_buyers")


class BookingCancellation(Base):
    """
    Spec 5.9: Cancellation and Refund Management.
    Enforces REHAB statutory norms, deduction/penalty rules, 3-tier approvals (Legal, Sales, Finance),
    bank refund disbursement, duplicate refund prevention, and inventory release.
    """
    __tablename__ = "sls_booking_cancellations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    cancellation_code = Column(String(64), unique=True, nullable=True, index=True) # e.g. 'CAN-2026-0001'
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    cancellation_date = Column(Date, nullable=False, default=func.current_date())
    
    # Category: BUYER_DEFAULT, BUYER_RELOCATION, FINANCIAL_HARDSHIP, DEVELOPER_DELAY, MUTUAL_CONSENT, FORCE_MAJEURE
    cancellation_category = Column(String(64), nullable=False, default="BUYER_DEFAULT")
    cancellation_reason = Column(Text, nullable=False)
    
    total_paid = Column(Numeric(14, 2), nullable=False, default=0.00) # Cumulative collections to date
    
    # Deduction Engine: REHAB_STATUTORY, FIXED_SERVICE_CHARGE, DEVELOPER_DEFAULT_ZERO, MUTUAL_CUSTOM
    deduction_type = Column(String(64), nullable=False, default="REHAB_STATUTORY")
    forfeiture_deduction_percentage = Column(Numeric(5, 2), nullable=False, default=10.00) # e.g. 10%
    forfeiture_deduction_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    service_charge_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    net_refund_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    amount_refunded_so_far = Column(Numeric(14, 2), nullable=False, default=0.00)
    
    # Workflow Status: 'REQUESTED', 'UNDER_REVIEW', 'LEGAL_APPROVED', 'FINANCE_APPROVED', 'REFUNDED_SETTLED', 'REJECTED'
    status = Column(String(32), nullable=False, default="REQUESTED", index=True)

    # 3-Tier Approvals
    legal_approval_status = Column(String(32), nullable=False, default="PENDING")
    legal_approved_by = Column(String(128), nullable=True)
    legal_approval_date = Column(TIMESTAMP, nullable=True)
    legal_notes = Column(Text, nullable=True)

    sales_approval_status = Column(String(32), nullable=False, default="PENDING")
    sales_approved_by = Column(String(128), nullable=True)
    sales_approval_date = Column(TIMESTAMP, nullable=True)

    finance_approval_status = Column(String(32), nullable=False, default="PENDING")
    finance_approved_by = Column(String(128), nullable=True)
    finance_approval_date = Column(TIMESTAMP, nullable=True)

    # Refund Disbursement Controls (Restricted bank details)
    refund_payment_mode = Column(String(32), nullable=False, default="BANK_TRANSFER") # BANK_TRANSFER, BEFTN, RTGS, CHEQUE, STAGED_INSTALLMENTS
    refund_bank_name = Column(String(128), nullable=True)
    refund_account_name = Column(String(128), nullable=True)
    refund_account_number = Column(String(64), nullable=True)
    refund_routing_number = Column(String(32), nullable=True)
    refund_cheque_no = Column(String(64), nullable=True)
    refund_payment_reference = Column(String(128), nullable=True)
    refund_disbursed_date = Column(Date, nullable=True)
    
    # Communication & Inventory controls
    customer_notified = Column(Boolean, nullable=False, default=False)
    customer_notified_at = Column(TIMESTAMP, nullable=True)
    inventory_reverted = Column(Boolean, nullable=False, default=False)
    gl_voucher_reference = Column(String(64), nullable=True)
    settlement_notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking", back_populates="cancellation")


class UnitTransfer(Base):
    """
    Spec 5.10: Property Transfer and Buyer Change.
    Supports buyer substitution, addition/removal of co-buyers, share amendments,
    transfer fee calculation, compliance balance verification, and revised agreement linkage.
    A transfer preserves original payment history without erasing transaction audit trails.
    """
    __tablename__ = "sls_unit_transfers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    transfer_number = Column(String(64), unique=True, nullable=True, index=True) # e.g. 'TRF-2026-0001'
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    from_customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    to_customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=True, index=True)
    
    # Transfer Type: FULL_BUYER_SUBSTITUTION, ADD_CO_BUYER, REMOVE_CO_BUYER, OWNERSHIP_SHARE_AMENDMENT
    transfer_type = Column(String(64), nullable=False, default="FULL_BUYER_SUBSTITUTION")
    transfer_date = Column(Date, nullable=False, default=func.current_date())
    
    # Co-buyer / Share Amendment fields
    co_buyer_name = Column(String(191), nullable=True)
    co_buyer_nid = Column(String(64), nullable=True)
    co_buyer_phone = Column(String(32), nullable=True)
    co_buyer_relation = Column(String(64), nullable=True)
    previous_share_percent = Column(Numeric(5, 2), nullable=False, default=100.00)
    new_share_percent = Column(Numeric(5, 2), nullable=False, default=100.00)

    # Balance & Compliance check
    outstanding_balance_at_transfer = Column(Numeric(14, 2), nullable=False, default=0.00)
    is_dues_cleared = Column(Boolean, nullable=False, default=True)

    # Transfer Fee (e.g. 1-2% developer NOC fee)
    transfer_fee_percentage = Column(Numeric(5, 2), nullable=False, default=1.00)
    transfer_fee_bdt = Column(Numeric(14, 2), nullable=False, default=0.00)
    transfer_fee_receipt_no = Column(String(64), nullable=True)
    is_fee_paid = Column(Boolean, nullable=False, default=False)
    
    # Supporting Document URLs
    noc_document_url = Column(String(255), nullable=True)
    sale_permission_url = Column(String(255), nullable=True)
    affidavit_document_url = Column(String(255), nullable=True)

    # Approvals & Execution
    approval_status = Column(String(32), nullable=False, default="PENDING_COMPLIANCE", index=True) # PENDING_COMPLIANCE, LEGAL_APPROVED, MANAGEMENT_APPROVED, EXECUTED_COMPLETED, REJECTED
    legal_approved_by = Column(String(128), nullable=True)
    management_approved_by = Column(String(128), nullable=True)
    approval_date = Column(TIMESTAMP, nullable=True)

    revised_agreement_reference = Column(String(64), nullable=True)
    transfer_effective_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking", back_populates="transfers")
    from_customer = relationship("Customer", foreign_keys=[from_customer_id])
    to_customer = relationship("Customer", foreign_keys=[to_customer_id])


class DiscountLimitPolicy(Base):
    """
    Discount limits configuration by employee role and project (Spec 5.4 Controls).
    Sets delegated commercial authority to prevent unauthorized price concessions.
    """
    __tablename__ = "sls_discount_limit_policies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=True, index=True) # None = Universal
    role_name = Column(String(64), nullable=False) # 'SALES_REPRESENTATIVE', 'SALES_MANAGER', 'HEAD_OF_SALES', 'MANAGING_DIRECTOR'
    max_discount_percentage = Column(Numeric(5, 2), nullable=False) # e.g. 1.00%, 3.00%, 7.00%, 15.00%
    max_discount_amount = Column(Numeric(14, 2), nullable=True)
    requires_justification = Column(Boolean, default=True)
    requires_attachment = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")


class PriceNegotiationProposal(Base):
    """
    Controlled commercial price negotiation and discount request record (Spec 5.4).
    Preserves original list price, requested discount, approved price, and full audit trail.
    """
    __tablename__ = "sls_price_negotiations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    proposal_reference_no = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'PR-2026-0012'
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    submitted_by_rep_name = Column(String(128), nullable=False)

    # Detailed Pricing Components (Spec 5.4)
    base_unit_price = Column(Numeric(14, 2), nullable=False)
    chargeable_area_sqft = Column(Numeric(10, 2), nullable=True)
    price_per_sqft = Column(Numeric(12, 2), nullable=True)
    floor_facing_premium = Column(Numeric(14, 2), nullable=False, default=0.00) # Floor/Facing premium charge
    parking_facility_charge = Column(Numeric(14, 2), nullable=False, default=0.00)
    utility_other_fees = Column(Numeric(14, 2), nullable=False, default=0.00)
    gross_list_price = Column(Numeric(14, 2), nullable=False)

    # Requested Commercial Terms
    requested_discount_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    requested_discount_percentage = Column(Numeric(5, 2), nullable=False, default=0.00)
    proposed_final_price = Column(Numeric(14, 2), nullable=False)
    justification_reason = Column(Text, nullable=False)
    supporting_document_url = Column(String(255), nullable=True)

    # Approval Hierarchy & Multi-Tier Escalation
    required_approval_tier = Column(String(64), nullable=False, default="SALES_MANAGER") # SALES_MANAGER, HEAD_OF_SALES, MANAGING_DIRECTOR
    status = Column(String(32), nullable=False, default="PENDING_REVIEW", index=True) # 'PENDING_REVIEW', 'APPROVED', 'REJECTED'
    
    # Audit & Approval History (Spec 5.4)
    approved_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approved_by_name = Column(String(128), nullable=True)
    decision_date = Column(TIMESTAMP, nullable=True)
    approval_comments = Column(Text, nullable=True)
    approved_discount_amount = Column(Numeric(14, 2), nullable=True)
    approved_final_price = Column(Numeric(14, 2), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project")
    unit = relationship("Unit")
    customer = relationship("Customer")
    approved_by = relationship("User")
    booking = relationship("Booking")


class BookingPaymentCollection(Base):
    """
    Spec 5.5: Booking Money & Down Payment Collection Ledger.
    Integrates commercial payments with Finance & Accounting.
    Accounting Control: An unverified payment instruction (cheque/unverified digital)
    must not be treated as cleared cash until cleared.
    """
    __tablename__ = "sls_booking_collections"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    receipt_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'MR-2026-0042'
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Category: 'BOOKING_MONEY', 'DOWN_PAYMENT', 'PARTIAL_DOWN_PAYMENT', 'ADVANCE_INSTALLMENT'
    collection_type = Column(String(64), nullable=False, default="BOOKING_MONEY")
    amount = Column(Numeric(14, 2), nullable=False)
    payment_date = Column(Date, nullable=False, default=func.current_date())

    # Multi-mode Instrument: CASH, CHEQUE, BANK_TRANSFER, BEFTN, RTGS, BKASH, NAGAD, CARD
    payment_mode = Column(String(32), nullable=False, default="BANK_TRANSFER")
    instrument_number = Column(String(64), nullable=True) # Cheque # / Card Txn / BEFTN Ref
    instrument_date = Column(Date, nullable=True)
    drawn_bank_name = Column(String(128), nullable=True) # Customer bank
    branch_name = Column(String(128), nullable=True)
    deposited_account_name = Column(String(128), nullable=True) # Company bank account
    transaction_reference = Column(String(128), nullable=True)

    # Accounting Control: Cash Clearance
    is_cleared_cash = Column(Boolean, nullable=False, default=False)
    clearance_status = Column(String(32), nullable=False, default="PENDING_CLEARANCE", index=True) # 'CLEARED', 'PENDING_CLEARANCE', 'DISHONOURED'
    clearance_date = Column(Date, nullable=True)
    dishonour_reason = Column(Text, nullable=True)

    # Payment Reversal & Refund Requests with Approval
    reversal_status = Column(String(32), nullable=False, default="NONE", index=True) # 'NONE', 'REQUESTED', 'APPROVED', 'REJECTED'
    reversal_reason = Column(Text, nullable=True)
    reversal_requested_by = Column(String(128), nullable=True)
    reversal_approved_by = Column(String(128), nullable=True)
    reversal_date = Column(TIMESTAMP, nullable=True)

    # Bank Reconciliation & GL Voucher Link
    bank_reconciliation_status = Column(String(32), nullable=False, default="UNRECONCILED") # 'UNRECONCILED', 'RECONCILED'
    reconciliation_date = Column(Date, nullable=True)
    gl_voucher_reference = Column(String(64), nullable=True) # Linked accounting voucher e.g. 'JV-2026-0189'

    # Communication & Audit
    sms_sent = Column(Boolean, nullable=False, default=False)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    booking = relationship("Booking", back_populates="collections")
    customer = relationship("Customer")


class LegalDocumentTemplate(Base):
    """
    Spec 5.6: Configurable Legal & Commercial Document Templates with Company Branding.
    Includes merge fields for customer, project, unit, price, and installment terms.
    """
    __tablename__ = "sls_document_templates"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    template_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'TPL_AGREEMENT_SALE'
    document_type = Column(String(64), nullable=False, index=True) # One of the 13 Spec 5.6 types
    title_en = Column(String(191), nullable=False)
    title_bn = Column(String(191), nullable=True)
    header_branding_html = Column(Text, nullable=True)
    content_template = Column(Text, nullable=False) # Template with {{customer_name}}, {{unit_number}}, etc.
    footer_legal_disclaimer = Column(Text, nullable=True)
    version = Column(String(32), nullable=False, default="v1.0")
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class SalesLegalDocument(Base):
    """
    Spec 5.6: Sales agreement and deed document preparation record.
    Manages merge-field generated documents, version control, legal review, and signature execution.
    Disclaimer: Final legal instruments must be reviewed and executed in accordance with applicable Bangladesh law.
    """
    __tablename__ = "sls_legal_documents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    document_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'AGR-2026-0012'
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    template_id = Column(BigInteger, ForeignKey("sls_document_templates.id", ondelete="SET NULL"), nullable=True)
    
    # One of the 13 Spec 5.6 types:
    # 'PROPERTY_RESERVATION_FORM', 'BOOKING_APPLICATION', 'BOOKING_CONFIRMATION_LETTER', 'ALLOTMENT_LETTER',
    # 'AGREEMENT_FOR_SALE', 'PAYMENT_SCHEDULE_ANNEXURE', 'PRICE_DISCOUNT_APPROVAL_SHEET', 'COBUYER_DECLARATION',
    # 'NOMINEE_FORM', 'AGREEMENT_AMENDMENT', 'CANCELLATION_REFUND_DOCUMENT', 'DEED_PREPARATION_CHECKLIST', 'POSSESSION_HANDOVER_DOCUMENT'
    document_type = Column(String(64), nullable=False, index=True)
    title = Column(String(191), nullable=False)
    version = Column(String(32), nullable=False, default="v1.0") # Version control (v1.0, v1.1, v2.0)
    
    rendered_content = Column(Text, nullable=False)
    merge_data_json = Column(JSON, nullable=True)

    # Legal Review & Approval Workflow
    legal_review_status = Column(String(32), nullable=False, default="DRAFT", index=True) # 'DRAFT', 'PENDING_LEGAL_REVIEW', 'LEGAL_APPROVED', 'EXECUTED_SIGNED', 'REJECTED', 'AMENDED'
    legal_reviewed_by = Column(String(128), nullable=True)
    legal_review_date = Column(TIMESTAMP, nullable=True)
    legal_review_notes = Column(Text, nullable=True)

    # Signature Status & Signing Dates
    first_party_signed = Column(Boolean, nullable=False, default=False)
    first_party_signed_at = Column(Date, nullable=True)
    first_party_signatory_name = Column(String(128), nullable=True)
    second_party_signed = Column(Boolean, nullable=False, default=False)
    second_party_signed_at = Column(Date, nullable=True)
    second_party_signatory_name = Column(String(128), nullable=True)
    witness_1_name = Column(String(128), nullable=True)
    witness_2_name = Column(String(128), nullable=True)
    execution_date = Column(Date, nullable=True)

    # Statutory Deed Preparation Checklist (JSON object tracking compliance items)
    checklist_status_json = Column(JSON, nullable=True)
    amendment_reason = Column(Text, nullable=True)
    audit_trail_json = Column(JSON, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    booking = relationship("Booking", back_populates="documents")
    customer = relationship("Customer")
    template = relationship("LegalDocumentTemplate")


class CustomerSalesLedgerEntry(Base):
    """
    Spec 5.8: Customer-wise and Booking-wise Sales Subledger.
    Provides a consolidated statement for every booking and customer,
    with the ability to view a combined account across multiple properties.
    Tracks contract charges, amendments, booking money, down payments, installment invoices,
    receipts, credit notes, approved adjustments, refunds, reversals, and late fees.
    """
    __tablename__ = "sls_customer_ledger_entries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    entry_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'LED-2026-0001'
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)

    transaction_date = Column(Date, nullable=False, default=func.current_date())
    
    # Types: CONTRACT_CHARGE, CONTRACT_AMENDMENT, BOOKING_MONEY, DOWN_PAYMENT, 
    # INSTALLMENT_INVOICE, RECEIPT, CREDIT_NOTE, DEBIT_NOTE, ADJUSTMENT, REFUND_REVERSAL, LATE_FEE
    transaction_type = Column(String(64), nullable=False, index=True)
    description = Column(Text, nullable=False)
    reference_no = Column(String(128), nullable=True, index=True) # Booking #, Invoice #, Money Receipt #, Cheque #

    # Financial entries
    debit_amount = Column(Numeric(14, 2), nullable=False, default=0.00) # Increases balance due (charges, invoices, fees)
    credit_amount = Column(Numeric(14, 2), nullable=False, default=0.00) # Decreases balance due (receipts, credits)
    running_balance = Column(Numeric(14, 2), nullable=False, default=0.00)

    # Aging & Payment Terms
    due_date = Column(Date, nullable=True)
    days_overdue = Column(Integer, nullable=False, default=0)
    # Aging Bucket: CURRENT, 1_30_DAYS, 31_60_DAYS, 61_90_DAYS, OVER_90_DAYS
    ageing_bucket = Column(String(32), nullable=False, default="CURRENT")

    payment_mode = Column(String(32), nullable=True) # CASH, CHEQUE, BANK_TRANSFER, BEFTN, RTGS, BKASH, NAGAD
    
    # Accounts Receivable Subledger & GL Reconciliation
    gl_account_code = Column(String(64), nullable=False, default="1200-AR-FLAT-SALES")
    gl_voucher_reference = Column(String(64), nullable=True) # e.g. 'JV-2026-0189'
    reconciliation_status = Column(String(32), nullable=False, default="RECONCILED", index=True) # RECONCILED, PENDING_POSTING, DISCREPANCY
    reconciled_at = Column(TIMESTAMP, nullable=True)

    created_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    audit_trail_json = Column(JSON, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    customer = relationship("Customer")
    booking = relationship("Booking")
    project = relationship("Project")
    unit = relationship("Unit")


class CustomerLedgerAdjustment(Base):
    """
    Spec 5.8: Controlled Commercial Adjustments & Credit Notes for Sales Ledger.
    Restricted editing of posted transactions with full audit trail and GL linkage.
    """
    __tablename__ = "sls_customer_ledger_adjustments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    adjustment_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'ADJ-2026-0001'
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=False, index=True)

    # CREDIT_NOTE, DEBIT_NOTE, GOODWILL_DISCOUNT, INTEREST_WAIVER, UTILITY_RECONCILIATION, LEGAL_RECONCILIATION
    adjustment_type = Column(String(64), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    adjustment_date = Column(Date, nullable=False, default=func.current_date())
    reason = Column(Text, nullable=False)
    
    # Approval & Maker-Checker
    approval_status = Column(String(32), nullable=False, default="APPROVED") # APPROVED, PENDING_APPROVAL, REJECTED
    approved_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    supporting_document_url = Column(String(255), nullable=True)

    # GL Link
    gl_account_code = Column(String(64), nullable=False, default="1200-AR-FLAT-SALES")
    gl_voucher_reference = Column(String(64), nullable=True)
    ledger_entry_id = Column(BigInteger, ForeignKey("sls_customer_ledger_entries.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer")
    booking = relationship("Booking")


# ==============================================================================
# Spec 5.11: Registration & Deed Tracking Models
# ==============================================================================

class RegistrationChecklistTemplate(Base):
    """
    Spec 5.11: Configurable Sub-Registry & Legal Deed Preparation Checklist Template.
    Allows developer legal counsel to define property-specific statutory requirements.
    """
    __tablename__ = "sls_registration_checklist_templates"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    template_code = Column(String(64), unique=True, nullable=False, index=True)
    template_name = Column(String(128), nullable=False)
    description = Column(String(255), nullable=True)
    property_type = Column(String(64), nullable=False, default="RESIDENTIAL_APARTMENT")
    checklist_schema = Column(JSON, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    registrations = relationship("DeedRegistration", back_populates="template")


class DeedRegistration(Base):
    """
    Spec 5.11: Registration & Deed Tracking Lifecycle Record.
    Tracks all 9 statutory checklist stages, fee payments, legal vetting,
    appointment scheduling, sub-registry volume/page recording, and vault archiving.
    """
    __tablename__ = "sls_deed_registrations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    registration_tracking_no = Column(String(64), unique=True, nullable=False, index=True) # e.g. 'REG-2026-0001'
    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)
    template_id = Column(BigInteger, ForeignKey("sls_registration_checklist_templates.id", ondelete="SET NULL"), nullable=True)

    # Deed & Sub-Registry Particulars
    deed_type = Column(String(64), nullable=False, default="SALE_DEED_SAF_KABALA") # SALE_DEED_SAF_KABALA, DEED_OF_AGREEMENT_BAYNANAMA, etc.
    sub_registry_office = Column(String(191), nullable=False, default="Gulshan Sub-Registry Office")
    conducting_advocate = Column(String(128), nullable=True)
    
    # Status: NOT_STARTED, DOCUMENTS_PENDING, UNDER_LEGAL_REVIEW, DRAFT_PREPARED, SUBMITTED, REGISTRATION_PENDING, REGISTERED, COMPLETED
    status = Column(String(64), nullable=False, default="NOT_STARTED", index=True)

    # Live Checklist Progression (JSON mapping of step statuses, completed date, notes, doc links)
    checklist_status = Column(JSON, nullable=True)

    # Statutory Fees & Costs
    total_registration_costs = Column(Numeric(14, 2), nullable=False, default=0.00)
    stamp_duty_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    registration_fee_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    ait_tax_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    local_gov_tax_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    is_fees_cleared = Column(Boolean, nullable=False, default=False)

    # Sub-Registry Scheduling & Execution
    appointment_date = Column(Date, nullable=True)
    appointment_time = Column(String(32), nullable=True)
    deed_receipt_number = Column(String(64), nullable=True) # Official Sub-Registry I-Form / Receipt
    registered_deed_number = Column(String(64), nullable=True)
    balam_book_no = Column(String(32), nullable=True)
    volume_no = Column(String(32), nullable=True)
    page_no = Column(String(32), nullable=True)
    deed_delivery_date = Column(Date, nullable=True)
    vault_location = Column(String(128), nullable=True)

    # Legal Vetting & Validation
    legal_officer_name = Column(String(128), nullable=True)
    legal_validation_status = Column(String(32), nullable=False, default="PENDING") # PENDING, VALIDATED, REJECTED
    legal_validation_date = Column(TIMESTAMP, nullable=True)
    legal_validation_notes = Column(Text, nullable=True)

    # Outstanding Legal Issues & Corrective Actions
    outstanding_issues = Column(JSON, nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    booking = relationship("Booking")
    customer = relationship("Customer")
    project = relationship("Project")
    unit = relationship("Unit")
    template = relationship("RegistrationChecklistTemplate", back_populates="registrations")


class PropertyHandover(Base):
    """
    Spec 5.12 Property Handover Management
    Manages operational transition from booked property to customer possession.
    Prerequisites, inspection checklist, defect/snagging tracking, utility meter readings,
    key & access-card issuance, warranty/maintenance documents, customer acknowledgment,
    and possession handover certificate.
    """
    __tablename__ = "sls_property_handovers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    handover_tracking_no = Column(String(64), unique=True, nullable=False, index=True)

    booking_id = Column(BigInteger, ForeignKey("sls_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("crm_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="RESTRICT"), nullable=False, index=True)

    responsible_staff_name = Column(String(128), nullable=True)
    responsible_engineer_name = Column(String(128), nullable=True)

    # Operational Handover Status
    status = Column(String(64), nullable=False, default="NOT_STARTED", index=True)

    # Distinct Status Fields per specification:
    # "Registration, contractual completion, and physical possession must remain distinct status fields
    # because one does not always automatically establish the others."
    contractual_completion_status = Column(String(64), nullable=False, default="PENDING")
    financial_clearance_status = Column(String(64), nullable=False, default="PENDING")
    legal_registration_status = Column(String(64), nullable=False, default="PENDING")
    physical_possession_status = Column(String(64), nullable=False, default="NOT_TAKEN")

    # Handover Prerequisites & Unit Inspection Checklists (JSON)
    prerequisites_checklist = Column(JSON, nullable=True)
    inspection_checklist = Column(JSON, nullable=True)

    # Utility Meter Readings & Accounts
    electricity_meter_no = Column(String(64), nullable=True)
    electricity_meter_reading = Column(String(64), nullable=True)
    electricity_provider = Column(String(64), nullable=True, default="DESCO")

    gas_meter_no = Column(String(64), nullable=True)
    gas_meter_reading = Column(String(64), nullable=True)
    gas_provider = Column(String(64), nullable=True, default="TITAS_GAS")

    water_meter_no = Column(String(64), nullable=True)
    water_meter_reading = Column(String(64), nullable=True)
    water_consumer_id = Column(String(64), nullable=True, default="DWASA")

    # Key, Access Card & Parking Issuance (JSON)
    keys_issued_json = Column(JSON, nullable=True)

    # Warranty & Maintenance Documents (JSON)
    warranty_documents_json = Column(JSON, nullable=True)

    # Defect and Snagging Items (JSON list)
    snag_items = Column(JSON, nullable=True)

    # Appointment & Execution
    appointment_date = Column(Date, nullable=True)
    appointment_time = Column(String(32), nullable=True)

    # Handover Certificate & Customer Acknowledgment
    handover_certificate_no = Column(String(64), nullable=True)
    handover_date = Column(Date, nullable=True)
    customer_acknowledged = Column(Boolean, nullable=False, default=False)
    customer_acknowledgment_date = Column(Date, nullable=True)
    customer_declaration_notes = Column(Text, nullable=True)
    possession_certificate_url = Column(String(255), nullable=True)
    dlp_end_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    booking = relationship("Booking")
    customer = relationship("Customer")
    project = relationship("Project")
    unit = relationship("Unit")






