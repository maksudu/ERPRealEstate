from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime

# --------------------------------------------------------------------------
# Vendor & Material Schemas
# --------------------------------------------------------------------------
class VendorBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vendor_code: str
    vendor_name: str
    trade_category: str
    contact_person: str
    phone_number: str
    email: Optional[str] = None
    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    payment_terms_days: int = 30
    is_active: bool = True

class VendorCreate(BaseModel):
    vendor_name: str
    trade_category: str
    contact_person: str
    phone_number: str
    email: Optional[str] = None
    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    payment_terms_days: Optional[int] = 30

class VendorResponse(VendorBase):
    id: int
    created_at: Optional[datetime] = None


class MaterialItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    material_code: str
    material_name: str
    category: str
    unit_of_measure: str = "BAG"
    standard_unit_cost: float = 0.00
    is_active: bool = True

class MaterialItemCreate(BaseModel):
    material_code: str
    material_name: str
    category: str
    unit_of_measure: Optional[str] = "BAG"
    standard_unit_cost: Optional[float] = 0.00

class MaterialItemResponse(MaterialItemBase):
    id: int


# --------------------------------------------------------------------------
# Site Store & Stock Schemas
# --------------------------------------------------------------------------
class StoreStockBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    store_id: int
    material_id: int
    current_stock_quantity: float
    reorder_level: float = 100.00

class StoreStockResponse(StoreStockBase):
    id: int
    material_name: Optional[str] = None
    material_code: Optional[str] = None
    unit_of_measure: Optional[str] = None
    is_low_stock: bool = False
    last_updated_at: Optional[datetime] = None

class SiteStoreBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    store_name: str
    location_details: Optional[str] = None
    store_in_charge_user_id: Optional[int] = None
    is_active: bool = True

class SiteStoreCreate(BaseModel):
    project_id: int
    store_name: str
    location_details: Optional[str] = None
    store_in_charge_user_id: Optional[int] = None

class SiteStoreResponse(SiteStoreBase):
    id: int
    project_name: Optional[str] = None
    store_in_charge_name: Optional[str] = None
    stocks: List[StoreStockResponse] = []
    created_at: Optional[datetime] = None

class StockAdjustmentCreate(BaseModel):
    store_id: int
    material_id: int
    quantity_delta: float
    adjustment_reason: str # 'INITIAL_STOCK', 'MANUAL_CORRECTION', 'DAMAGE_WRITEOFF'


# --------------------------------------------------------------------------
# Purchase Requisition (PR) Schemas
# --------------------------------------------------------------------------
class PurchaseRequisitionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    pr_number: str
    requested_by_user_id: int
    requisition_date: date
    required_by_date: Optional[date] = None
    material_id: int
    requested_quantity: float
    purpose_notes: Optional[str] = None
    status: str = "PENDING_CS"

class PurchaseRequisitionCreate(BaseModel):
    project_id: int
    material_id: int
    requested_quantity: float
    required_by_date: Optional[date] = None
    purpose_notes: Optional[str] = None

class PurchaseRequisitionResponse(PurchaseRequisitionBase):
    id: int
    project_name: Optional[str] = None
    requester_name: Optional[str] = None
    material_name: Optional[str] = None
    unit_of_measure: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Comparative Statement (CS) Schemas
# --------------------------------------------------------------------------
class CSQuotationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vendor_id: int
    quoted_unit_rate: float
    quoted_quantity: float
    total_quoted_amount: float
    credit_days_offered: int = 30
    lead_time_days: int = 3
    is_recommended: bool = False
    remarks: Optional[str] = None

class CSQuotationInput(BaseModel):
    vendor_id: int
    quoted_unit_rate: float
    credit_days_offered: Optional[int] = 30
    lead_time_days: Optional[int] = 3
    remarks: Optional[str] = None

class CSQuotationResponse(CSQuotationBase):
    id: int
    vendor_name: Optional[str] = None
    vendor_code: Optional[str] = None

class ComparativeStatementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pr_id: int
    cs_number: str
    cs_date: date
    recommended_vendor_id: Optional[int] = None
    status: str = "DRAFT"
    justification_summary: Optional[str] = None

class ComparativeStatementCreate(BaseModel):
    pr_id: int
    recommended_vendor_id: Optional[int] = None
    justification_summary: Optional[str] = None
    quotations: List[CSQuotationInput]

class ComparativeStatementResponse(ComparativeStatementBase):
    id: int
    pr_number: Optional[str] = None
    project_name: Optional[str] = None
    material_name: Optional[str] = None
    requested_quantity: Optional[float] = None
    unit_of_measure: Optional[str] = None
    recommended_vendor_name: Optional[str] = None
    quotations: List[CSQuotationResponse] = []
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Purchase Order (PO) Schemas
# --------------------------------------------------------------------------
class PurchaseOrderBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    po_number: str
    cs_id: Optional[int] = None
    project_id: int
    vendor_id: int
    material_id: int
    ordered_quantity: float
    unit_price: float
    total_po_amount: float
    po_date: date
    delivery_deadline: date
    destination_store_id: int
    status: str = "ISSUED"
    terms_and_conditions: Optional[str] = None

class PurchaseOrderCreateFromCS(BaseModel):
    cs_id: int
    destination_store_id: int
    delivery_deadline: date
    terms_and_conditions: Optional[str] = None

class PurchaseOrderDirectCreate(BaseModel):
    project_id: int
    vendor_id: int
    material_id: int
    ordered_quantity: float
    unit_price: float
    destination_store_id: int
    delivery_deadline: date
    terms_and_conditions: Optional[str] = None

class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    project_name: Optional[str] = None
    vendor_name: Optional[str] = None
    material_name: Optional[str] = None
    unit_of_measure: Optional[str] = None
    store_name: Optional[str] = None
    total_received_quantity: float = 0.00
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Goods Receipt Note (GRN) & 3-Way Matching Schemas
# --------------------------------------------------------------------------
class GoodsReceiptBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    po_id: int
    grn_number: str
    receipt_date: date
    delivery_challan_number: str
    challan_photo_url: Optional[str] = None
    received_by_user_id: int
    received_quantity: float
    rejected_quantity: float = 0.00
    accepted_quantity: float
    supplier_invoice_number: Optional[str] = None
    supplier_invoice_amount: Optional[float] = None
    calculated_expected_amount: float
    variance_amount: float = 0.00
    three_way_match_status: str = "PENDING_MATCH"
    accounts_voucher_ref: Optional[str] = None
    status: str = "DRAFT"
    inspection_remarks: Optional[str] = None

class GoodsReceiptCreate(BaseModel):
    po_id: int
    delivery_challan_number: str
    challan_photo_url: Optional[str] = None
    received_quantity: float
    rejected_quantity: Optional[float] = 0.00
    supplier_invoice_number: Optional[str] = None
    supplier_invoice_amount: Optional[float] = None
    inspection_remarks: Optional[str] = None

class GoodsReceipt3WayMatchRequest(BaseModel):
    supplier_invoice_number: str
    supplier_invoice_amount: float
    approval_action: str # 'APPROVE_MATCH', 'REJECT_VARIANCE'
    accounts_notes: Optional[str] = None

class GoodsReceiptResponse(GoodsReceiptBase):
    id: int
    po_number: Optional[str] = None
    project_name: Optional[str] = None
    vendor_name: Optional[str] = None
    material_name: Optional[str] = None
    unit_of_measure: Optional[str] = None
    po_unit_price: Optional[float] = None
    received_by_name: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Procurement Summary Metrics
# --------------------------------------------------------------------------
class ProcurementMetrics(BaseModel):
    total_active_stores: int
    low_stock_items_count: int
    pending_pr_count: int
    active_po_count: int
    total_po_value: float
    grn_variance_flags: int
