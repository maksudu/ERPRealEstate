from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, JSON, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project, BOQItem
from app.modules.construction.models import WBSNode, Subcontractor
from app.modules.auth.models import User

class Vendor(Base):
    """
    Suppliers & Material Vendors master register.
    """
    __tablename__ = "scm_vendors"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    vendor_code = Column(String(32), unique=True, nullable=False, index=True)
    vendor_name = Column(String(191), nullable=False)
    trade_category = Column(String(64), nullable=False) # STEEL_REBAR, CEMENT, AGGREGATES, BRICKS, TILES_SANITARY, ELECTRICAL
    contact_person = Column(String(128), nullable=False)
    phone_number = Column(String(32), nullable=False)
    email = Column(String(128), nullable=True)
    business_address = Column(Text, nullable=True)
    business_registration_number = Column(String(64), nullable=True)
    trade_license_number = Column(String(64), nullable=True)
    trade_license_expiry_date = Column(Date, nullable=True, index=True)
    tin_number = Column(String(64), nullable=True)
    bin_number = Column(String(64), nullable=True)
    supplied_categories = Column(JSON, nullable=True)
    document_refs = Column(JSON, nullable=True)
    authorized_representatives = Column(JSON, nullable=True)
    references = Column(JSON, nullable=True)
    bank_name = Column(String(128), nullable=True)
    bank_account_name = Column(String(128), nullable=True)
    bank_account_number = Column(String(128), nullable=True)
    bank_branch = Column(String(128), nullable=True)
    credit_limit_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    currency = Column(String(8), nullable=False, default="BDT")
    payment_terms_days = Column(Integer, nullable=False, default=30)
    approval_status = Column(String(40), nullable=False, default="APPROVED", index=True)
    approval_notes = Column(Text, nullable=True)
    performance_score = Column(Numeric(5, 2), nullable=True)
    late_delivery_count = Column(Integer, nullable=False, default=0)
    rejected_delivery_count = Column(Integer, nullable=False, default=0)
    quality_complaint_count = Column(Integer, nullable=False, default=0)
    non_conformance_count = Column(Integer, nullable=False, default=0)
    suspension_reason = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")


class VendorApprovalEvent(Base):
    __tablename__ = "scm_vendor_approval_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(40), nullable=False)
    from_status = Column(String(40), nullable=True)
    to_status = Column(String(40), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class MaterialItem(Base):
    """
    Material Catalog Master with standard unit of measurement and category.
    """
    __tablename__ = "scm_materials"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    material_code = Column(String(32), unique=True, nullable=False, index=True)
    material_name = Column(String(191), nullable=False)
    category = Column(String(64), nullable=False) # CEMENT, REBAR, SAND, STONE_CHIPS, BRICKS, FINISHING
    unit_of_measure = Column(String(32), nullable=False, default="BAG") # BAG, TON, CFT, NOS, SQFT
    standard_unit_cost = Column(Numeric(14, 2), nullable=False, default=0.00)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())


class SiteStore(Base):
    """
    Site / Central Material Stores.
    Central Warehouse and Multi-site store separation.
    """
    __tablename__ = "scm_site_stores"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    store_name = Column(String(128), nullable=False)
    location_details = Column(String(191), nullable=True)
    store_in_charge_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)
    is_central_warehouse = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    store_in_charge = relationship("User")
    stocks = relationship("StoreStock", back_populates="store", cascade="all, delete-orphan")


class StoreStock(Base):
    """
    Store inventory balance, weighted average valuation & reorder threshold per material item.
    Real-time stock balance with Weighted Average / FIFO inventory valuation.
    """
    __tablename__ = "scm_store_stock"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    store_id = Column(BigInteger, ForeignKey("scm_site_stores.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)
    current_stock_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    reserved_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    weighted_avg_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_stock_value = Column(Numeric(16, 2), nullable=False, default=0.00)
    reorder_level = Column(Numeric(14, 4), nullable=False, default=100.00)
    last_updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    store = relationship("SiteStore", back_populates="stocks")
    material = relationship("MaterialItem")


class PurchaseRequisition(Base):
    """
    Site Material Indent / Purchase Requisitions.
    Checked against BOQ remaining budget & linked to specific WBS Activity.
    """
    __tablename__ = "scm_purchase_requisitions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    pr_number = Column(String(64), unique=True, nullable=False, index=True)
    batch_reference = Column(String(64), nullable=True, index=True)
    requested_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False, index=True)
    requisition_date = Column(Date, nullable=False, default=func.current_date())
    required_by_date = Column(Date, nullable=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)
    requested_quantity = Column(Numeric(14, 4), nullable=False)
    approved_quantity = Column(Numeric(14, 4), nullable=True)
    
    # BOQ Hard Budget Lock link & WBS Activity mapping
    boq_item_id = Column(BigInteger, ForeignKey("prj_boq_items.id", ondelete="SET NULL"), nullable=True, index=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    tower_name = Column(String(64), nullable=True)
    floor_number = Column(String(32), nullable=True)
    priority = Column(String(16), nullable=False, default="NORMAL")
    department = Column(String(128), nullable=True)
    destination_store_id = Column(BigInteger, ForeignKey("scm_site_stores.id", ondelete="SET NULL"), nullable=True, index=True)
    delivery_location = Column(String(191), nullable=True)
    attachment_refs = Column(JSON, nullable=True)

    purpose_notes = Column(Text, nullable=True)
    # PR lifecycle: DRAFT, SUBMITTED, UNDER_REVIEW, RETURNED_FOR_REVISION, APPROVED,
    # PARTIALLY_APPROVED, REJECTED, CONVERTED_TO_PO, PARTIALLY_ORDERED, COMPLETED, CANCELLED.
    status = Column(String(32), nullable=False, default="DRAFT", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    requester = relationship("User")
    material = relationship("MaterialItem")
    boq_item = relationship("BOQItem")
    wbs_node = relationship("WBSNode")
    comparative_statements = relationship("ComparativeStatement", back_populates="requisition")
    rfqs = relationship("RFQ", back_populates="requisition")


class PRWorkflowEvent(Base):
    __tablename__ = "scm_pr_workflow_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pr_id = Column(BigInteger, ForeignKey("scm_purchase_requisitions.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(32), nullable=False)
    from_status = Column(String(32), nullable=True)
    to_status = Column(String(32), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class RFQ(Base):
    """
    Request for Quotation (RFQ) sent to approved vendors.
    """
    __tablename__ = "scm_rfqs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pr_id = Column(BigInteger, ForeignKey("scm_purchase_requisitions.id", ondelete="CASCADE"), nullable=False, index=True)
    rfq_number = Column(String(64), unique=True, nullable=False, index=True)
    rfq_date = Column(Date, nullable=False, default=func.current_date())
    submission_deadline = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)
    # Status: ISSUED, QUOTES_RECEIVED, CLOSED
    status = Column(String(32), nullable=False, default="ISSUED", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    requisition = relationship("PurchaseRequisition", back_populates="rfqs")
    invited_vendors = relationship("RFQVendor", back_populates="rfq", cascade="all, delete-orphan")


class RFQVendor(Base):
    """
    Vendors invited to bid for a specific RFQ.
    """
    __tablename__ = "scm_rfq_vendors"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    rfq_id = Column(BigInteger, ForeignKey("scm_rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="RESTRICT"), nullable=False, index=True)
    invitation_sent_at = Column(TIMESTAMP, server_default=func.now())
    # Status: INVITED, QUOTED, DECLINED
    status = Column(String(32), nullable=False, default="INVITED")

    rfq = relationship("RFQ", back_populates="invited_vendors")
    vendor = relationship("Vendor")


class ComparativeStatement(Base):
    """
    Vendor Quotation Comparative Statements (CS).
    Dynamic side-by-side comparison of supplier quotes.
    """
    __tablename__ = "scm_comparative_statements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pr_id = Column(BigInteger, ForeignKey("scm_purchase_requisitions.id", ondelete="RESTRICT"), nullable=False, index=True)
    cs_number = Column(String(64), unique=True, nullable=False, index=True)
    cs_date = Column(Date, nullable=False, default=func.current_date())
    recommended_vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="SET NULL"), nullable=True, index=True)
    # Status: DRAFT, APPROVED, REJECTED, PO_GENERATED
    status = Column(String(32), nullable=False, default="DRAFT", index=True)
    justification_summary = Column(Text, nullable=True)
    committee_recommendation = Column(Text, nullable=True)
    committee_decision_notes = Column(Text, nullable=True)
    committee_decided_at = Column(TIMESTAMP, nullable=True)
    award_allocations = Column(JSON, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    requisition = relationship("PurchaseRequisition", back_populates="comparative_statements")
    recommended_vendor = relationship("Vendor")
    quotations = relationship("CSQuotation", back_populates="comparative_statement", cascade="all, delete-orphan")


class CSQuotation(Base):
    """
    Individual vendor bid item in Comparative Statement.
    Includes Price, Payment terms, Brand/Grade, Delivery lead time & Lowest Bidder flag.
    """
    __tablename__ = "scm_cs_quotations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    cs_id = Column(BigInteger, ForeignKey("scm_comparative_statements.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="RESTRICT"), nullable=False, index=True)
    brand_grade = Column(String(128), nullable=True) # e.g. BSRM 500W Grade 72.5, Bashundhara CEM-I 52.5N
    technical_specification = Column(Text, nullable=True)
    country_of_origin = Column(String(100), nullable=True)
    warranty_months = Column(Integer, nullable=True)
    quotation_valid_until = Column(Date, nullable=True)
    payment_terms = Column(String(128), nullable=True) # e.g. 30 Days Credit, 10% Advance + 90% at Site Delivery
    technical_compliance = Column(String(64), nullable=False, default="COMPLIANT") # COMPLIANT, DEVIATION_NOTED, NON_COMPLIANT
    quoted_unit_rate = Column(Numeric(14, 2), nullable=False)
    quoted_quantity = Column(Numeric(14, 4), nullable=False)
    total_quoted_amount = Column(Numeric(16, 2), nullable=False)
    delivery_charge_bdt = Column(Numeric(14, 2), nullable=False, default=0)
    discount_amount_bdt = Column(Numeric(14, 2), nullable=False, default=0)
    vat_amount_bdt = Column(Numeric(14, 2), nullable=False, default=0)
    other_tax_amount_bdt = Column(Numeric(14, 2), nullable=False, default=0)
    commercial_evaluation = Column(String(32), nullable=False, default="PENDING")
    revision_number = Column(Integer, nullable=False, default=1)
    previous_quotation_id = Column(BigInteger, ForeignKey("scm_cs_quotations.id", ondelete="SET NULL"), nullable=True)
    is_current = Column(Boolean, nullable=False, default=True, index=True)
    negotiation_history = Column(Text, nullable=True)
    credit_days_offered = Column(Integer, nullable=False, default=30)
    lead_time_days = Column(Integer, nullable=False, default=3)
    is_recommended = Column(Boolean, nullable=False, default=False)
    remarks = Column(String(255), nullable=True)

    comparative_statement = relationship("ComparativeStatement", back_populates="quotations")
    vendor = relationship("Vendor")


class PurchaseOrder(Base):
    """
    Procurement Purchase Orders (PO).
    Multi-tier approved PO with delivery schedule.
    """
    __tablename__ = "scm_purchase_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    po_number = Column(String(64), unique=True, nullable=False, index=True)
    cs_id = Column(BigInteger, ForeignKey("scm_comparative_statements.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="RESTRICT"), nullable=False, index=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)
    ordered_quantity = Column(Numeric(14, 4), nullable=False)
    unit_price = Column(Numeric(14, 2), nullable=False)
    total_po_amount = Column(Numeric(16, 2), nullable=False)
    po_date = Column(Date, nullable=False, default=func.current_date())
    delivery_deadline = Column(Date, nullable=False)
    destination_store_id = Column(BigInteger, ForeignKey("scm_site_stores.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Multi-tier approval & delivery schedule
    approval_status = Column(String(32), nullable=False, default="APPROVED", index=True) # DRAFT, PENDING_APPROVAL, APPROVED, REJECTED
    approved_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approval_date = Column(Date, nullable=True)
    delivery_schedule_notes = Column(String(255), nullable=True)

    # Status: ISSUED, PARTIALLY_RECEIVED, FULLY_RECEIVED, CANCELLED
    status = Column(String(32), nullable=False, default="ISSUED", index=True)
    terms_and_conditions = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    vendor = relationship("Vendor", back_populates="purchase_orders")
    material = relationship("MaterialItem")
    store = relationship("SiteStore")
    comparative_statement = relationship("ComparativeStatement")
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    goods_receipts = relationship("GoodsReceipt", back_populates="purchase_order")


class GoodsReceipt(Base):
    """
    Gate Entry & Goods Receipt Note (GRN) & 3-Way Matching Subsystem.
    Physical count verification at site gate, linked to Quality Inspection before stock entry.
    """
    __tablename__ = "scm_goods_receipts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    po_id = Column(BigInteger, ForeignKey("scm_purchase_orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    grn_number = Column(String(64), unique=True, nullable=False, index=True)
    receipt_date = Column(Date, nullable=False, default=func.current_date())
    delivery_challan_number = Column(String(64), nullable=False)
    challan_photo_url = Column(String(255), nullable=True)
    received_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Gate Entry Verification
    gate_entry_number = Column(String(64), nullable=True, index=True)
    vehicle_number = Column(String(64), nullable=True)
    driver_name = Column(String(128), nullable=True)
    driver_phone = Column(String(32), nullable=True)
    gate_in_timestamp = Column(TIMESTAMP, nullable=True)
    physical_count_verified = Column(Boolean, nullable=False, default=True)

    received_quantity = Column(Numeric(14, 4), nullable=False)
    rejected_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    accepted_quantity = Column(Numeric(14, 4), nullable=False)
    
    # Quality Inspection Status: PENDING, PASSED, FAILED, CONDITIONAL
    qc_status = Column(String(32), nullable=False, default="PENDING", index=True)

    # Supplier Invoice & 3-Way Matching Fields
    supplier_invoice_number = Column(String(64), nullable=True)
    supplier_invoice_amount = Column(Numeric(16, 2), nullable=True)
    calculated_expected_amount = Column(Numeric(16, 2), nullable=False) # accepted_quantity * PO.unit_price
    variance_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # 3-Way Matching Status: PENDING_MATCH, MATCHED_OK, VARIANCE_FLAGGED, ACCOUNTS_APPROVED
    three_way_match_status = Column(String(32), nullable=False, default="PENDING_MATCH", index=True)
    accounts_voucher_ref = Column(String(64), nullable=True)
    
    # Status: DRAFT, GATE_ENTERED, QC_VERIFIED, VERIFIED_STORE, POSTED_ACCOUNTS
    status = Column(String(32), nullable=False, default="DRAFT", index=True)
    inspection_remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="goods_receipts")
    received_by = relationship("User")
    quality_inspection = relationship("QualityInspection", back_populates="goods_receipt", uselist=False)


class QualityInspection(Base):
    """
    Quality Inspection (QC) before Store Stock Entry.
    Slump test, tensile strength test (MTR - Mill Test Report) verification.
    """
    __tablename__ = "scm_quality_inspections"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    grn_id = Column(BigInteger, ForeignKey("scm_goods_receipts.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    inspection_number = Column(String(64), unique=True, nullable=False, index=True)
    inspection_date = Column(Date, nullable=False, default=func.current_date())
    inspector_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    slump_test_mm = Column(Numeric(8, 2), nullable=True) # e.g. 100 mm for concrete/mortar
    tensile_strength_mpa = Column(Numeric(8, 2), nullable=True) # e.g. 520 MPa for rebar (Grade 500W)
    mtr_mill_test_report_number = Column(String(128), nullable=True)
    mtr_verified = Column(Boolean, nullable=False, default=True)
    
    # Status: PASSED, FAILED, CONDITIONAL_PASS
    test_result = Column(String(32), nullable=False, default="PASSED", index=True)
    qc_remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    goods_receipt = relationship("GoodsReceipt", back_populates="quality_inspection")
    inspector = relationship("User")


class MaterialIssueNote(Base):
    """
    Material Issue Note (MIN):
    Materials issued directly against a specific Tower, Floor, and WBS code.
    Decrements store stock and records issue value at Weighted Average rate.
    """
    __tablename__ = "scm_material_issues"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    min_number = Column(String(64), unique=True, nullable=False, index=True)
    issue_date = Column(Date, nullable=False, default=func.current_date())
    store_id = Column(BigInteger, ForeignKey("scm_site_stores.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_name = Column(String(64), nullable=True)
    floor_number = Column(String(32), nullable=True)
    wbs_node_id = Column(BigInteger, ForeignKey("con_wbs_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    issued_quantity = Column(Numeric(14, 4), nullable=False)
    unit_of_measure = Column(String(32), nullable=False)
    issued_to_contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    contractor_name = Column(String(191), nullable=True)
    issued_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    purpose = Column(Text, nullable=True)
    unit_cost_at_issue = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_issue_cost = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Status: ISSUED, CANCELLED
    status = Column(String(32), nullable=False, default="ISSUED", index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    store = relationship("SiteStore")
    project = relationship("Project")
    wbs_node = relationship("WBSNode")
    material = relationship("MaterialItem")
    contractor = relationship("Subcontractor")
    issued_by = relationship("User")


class StockTransfer(Base):
    """
    Inter-site Stock Transfer with dispatch and receipt acknowledgment.
    """
    __tablename__ = "scm_stock_transfers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    transfer_number = Column(String(64), unique=True, nullable=False, index=True)
    from_store_id = Column(BigInteger, ForeignKey("scm_site_stores.id", ondelete="RESTRICT"), nullable=False, index=True)
    to_store_id = Column(BigInteger, ForeignKey("scm_site_stores.id", ondelete="RESTRICT"), nullable=False, index=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)
    transfer_quantity = Column(Numeric(14, 4), nullable=False)
    
    dispatch_date = Column(Date, nullable=False, default=func.current_date())
    dispatched_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False, index=True)
    receipt_date = Column(Date, nullable=True)
    received_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    dispatch_challan_number = Column(String(64), nullable=False)
    unit_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_transfer_value = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Status: DISPATCHED, RECEIVED, CANCELLED
    status = Column(String(32), nullable=False, default="DISPATCHED", index=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    from_store = relationship("SiteStore", foreign_keys=[from_store_id])
    to_store = relationship("SiteStore", foreign_keys=[to_store_id])
    material = relationship("MaterialItem")
    dispatched_by = relationship("User", foreign_keys=[dispatched_by_user_id])
    received_by = relationship("User", foreign_keys=[received_by_user_id])


class StockLedger(Base):
    """
    Real-time inventory movement ledger for Weighted Average & FIFO valuation.
    Tracks receipts, issues, adjustments and transfers with running balance and rate.
    """
    __tablename__ = "scm_stock_ledger"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    store_id = Column(BigInteger, ForeignKey("scm_site_stores.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)
    transaction_type = Column(String(32), nullable=False, index=True) # GRN_IN, MIN_OUT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT
    reference_number = Column(String(64), nullable=False, index=True) # GRN-xxx, MIN-xxx, TRF-xxx
    transaction_date = Column(Date, nullable=False, default=func.current_date())
    
    quantity_in = Column(Numeric(14, 4), nullable=False, default=0.00)
    quantity_out = Column(Numeric(14, 4), nullable=False, default=0.00)
    unit_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_value = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    running_balance_qty = Column(Numeric(14, 4), nullable=False, default=0.00)
    running_weighted_avg_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    created_at = Column(TIMESTAMP, server_default=func.now())

    store = relationship("SiteStore")
    material = relationship("MaterialItem")
