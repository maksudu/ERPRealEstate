from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project
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
    tin_number = Column(String(64), nullable=True)
    bin_number = Column(String(64), nullable=True)
    payment_terms_days = Column(Integer, nullable=False, default=30)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")


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
    `scm_site_stores`: id, project_id, store_name, store_in_charge_user_id.
    """
    __tablename__ = "scm_site_stores"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    store_name = Column(String(128), nullable=False)
    location_details = Column(String(191), nullable=True)
    store_in_charge_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    store_in_charge = relationship("User")
    stocks = relationship("StoreStock", back_populates="store", cascade="all, delete-orphan")


class StoreStock(Base):
    """
    Store inventory balance & reorder threshold per material item.
    `scm_store_stock`: id, store_id, material_id, current_stock_quantity, reorder_level.
    """
    __tablename__ = "scm_store_stock"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    store_id = Column(BigInteger, ForeignKey("scm_site_stores.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)
    current_stock_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    reorder_level = Column(Numeric(14, 4), nullable=False, default=100.00)
    last_updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    store = relationship("SiteStore", back_populates="stocks")
    material = relationship("MaterialItem")


class PurchaseRequisition(Base):
    """
    Site Material Indent / Purchase Requisitions.
    `scm_purchase_requisitions`: id, project_id, pr_number, requested_by_user_id, status.
    """
    __tablename__ = "scm_purchase_requisitions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    pr_number = Column(String(64), unique=True, nullable=False, index=True)
    requested_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False, index=True)
    requisition_date = Column(Date, nullable=False, default=func.current_date())
    required_by_date = Column(Date, nullable=True)
    material_id = Column(BigInteger, ForeignKey("scm_materials.id", ondelete="RESTRICT"), nullable=False, index=True)
    requested_quantity = Column(Numeric(14, 4), nullable=False)
    purpose_notes = Column(Text, nullable=True)
    # Status: PENDING_CS, CS_PREPARED, PO_ISSUED, REJECTED
    status = Column(String(32), nullable=False, default="PENDING_CS", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    requester = relationship("User")
    material = relationship("MaterialItem")
    comparative_statements = relationship("ComparativeStatement", back_populates="requisition")



class ComparativeStatement(Base):
    """
    Vendor Quotation Comparative Statements (CS).
    `scm_comparative_statements`: id, pr_id, cs_number, status, recommended_vendor_id.
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

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    requisition = relationship("PurchaseRequisition", back_populates="comparative_statements")
    recommended_vendor = relationship("Vendor")
    quotations = relationship("CSQuotation", back_populates="comparative_statement", cascade="all, delete-orphan")


class CSQuotation(Base):
    """
    Individual vendor bid item in Comparative Statement.
    """
    __tablename__ = "scm_cs_quotations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    cs_id = Column(BigInteger, ForeignKey("scm_comparative_statements.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(BigInteger, ForeignKey("scm_vendors.id", ondelete="RESTRICT"), nullable=False, index=True)
    quoted_unit_rate = Column(Numeric(14, 2), nullable=False)
    quoted_quantity = Column(Numeric(14, 4), nullable=False)
    total_quoted_amount = Column(Numeric(16, 2), nullable=False)
    credit_days_offered = Column(Integer, nullable=False, default=30)
    lead_time_days = Column(Integer, nullable=False, default=3)
    is_recommended = Column(Boolean, nullable=False, default=False)
    remarks = Column(String(255), nullable=True)

    comparative_statement = relationship("ComparativeStatement", back_populates="quotations")
    vendor = relationship("Vendor")


class PurchaseOrder(Base):
    """
    Procurement Purchase Orders (PO).
    `scm_purchase_orders`: id, po_number, vendor_id, total_po_amount, delivery_deadline, status.
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
    goods_receipts = relationship("GoodsReceipt", back_populates="purchase_order")


class GoodsReceipt(Base):
    """
    Goods Receipt Note (GRN) & 3-Way Matching Subsystem.
    `scm_goods_receipts`: id, po_id, grn_number, delivery_challan_number, challan_photo_url, received_by_user_id, status.
    3-Way Match Formula:
    Verifies PO Qty & Price vs. GRN Received Qty vs. Supplier Invoice Amount before accounts approval.
    """
    __tablename__ = "scm_goods_receipts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    po_id = Column(BigInteger, ForeignKey("scm_purchase_orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    grn_number = Column(String(64), unique=True, nullable=False, index=True)
    receipt_date = Column(Date, nullable=False, default=func.current_date())
    delivery_challan_number = Column(String(64), nullable=False)
    challan_photo_url = Column(String(255), nullable=True)
    received_by_user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    received_quantity = Column(Numeric(14, 4), nullable=False)

    rejected_quantity = Column(Numeric(14, 4), nullable=False, default=0.00)
    accepted_quantity = Column(Numeric(14, 4), nullable=False)
    
    # Supplier Invoice & 3-Way Matching Fields
    supplier_invoice_number = Column(String(64), nullable=True)
    supplier_invoice_amount = Column(Numeric(16, 2), nullable=True)
    calculated_expected_amount = Column(Numeric(16, 2), nullable=False) # accepted_quantity * PO.unit_price
    variance_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # 3-Way Matching Status: PENDING_MATCH, MATCHED_OK, VARIANCE_FLAGGED, ACCOUNTS_APPROVED
    three_way_match_status = Column(String(32), nullable=False, default="PENDING_MATCH", index=True)
    accounts_voucher_ref = Column(String(64), nullable=True)
    
    # Status: DRAFT, VERIFIED_STORE, POSTED_ACCOUNTS
    status = Column(String(32), nullable=False, default="DRAFT", index=True)
    inspection_remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="goods_receipts")
    received_by = relationship("User")
