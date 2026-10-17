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
    weighted_avg_rate: float = 0.00
    total_stock_value: float = 0.00
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
    is_central_warehouse: bool = False
    is_active: bool = True

class SiteStoreCreate(BaseModel):
    project_id: int
    store_name: str
    location_details: Optional[str] = None
    store_in_charge_user_id: Optional[int] = None
    is_central_warehouse: Optional[bool] = False

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
# Purchase Requisition (PR) Schemas (with BOQ Hard Budget & WBS Link)
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
    boq_item_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    purpose_notes: Optional[str] = None
    status: str = "PENDING_CS"

class PurchaseRequisitionCreate(BaseModel):
    project_id: int
    material_id: int
    requested_quantity: float
    boq_item_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    required_by_date: Optional[date] = None
    purpose_notes: Optional[str] = None

class PurchaseRequisitionResponse(PurchaseRequisitionBase):
    id: int
    project_name: Optional[str] = None
    requester_name: Optional[str] = None
    material_name: Optional[str] = None
    unit_of_measure: Optional[str] = None
    boq_item_code: Optional[str] = None
    wbs_node_code: Optional[str] = None
    wbs_node_name: Optional[str] = None
    boq_remaining_headroom: Optional[float] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# RFQ (Request for Quotation) Schemas
# --------------------------------------------------------------------------
class RFQVendorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_id: int
    vendor_name: Optional[str] = None
    vendor_code: Optional[str] = None
    invitation_sent_at: Optional[datetime] = None
    status: str = "INVITED"

class RFQCreate(BaseModel):
    pr_id: int
    submission_deadline: date
    vendor_ids: List[int]
    notes: Optional[str] = None

class RFQResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pr_id: int
    pr_number: Optional[str] = None
    project_name: Optional[str] = None
    material_name: Optional[str] = None
    requested_quantity: Optional[float] = None
    unit_of_measure: Optional[str] = None
    rfq_number: str
    rfq_date: date
    submission_deadline: date
    notes: Optional[str] = None
    status: str = "ISSUED"
    invited_vendors: List[RFQVendorResponse] = []
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Comparative Statement (CS) Schemas
# --------------------------------------------------------------------------
class CSQuotationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vendor_id: int
    brand_grade: Optional[str] = None
    payment_terms: Optional[str] = None
    technical_compliance: str = "COMPLIANT"
    quoted_unit_rate: float
    quoted_quantity: float
    total_quoted_amount: float
    credit_days_offered: int = 30
    lead_time_days: int = 3
    is_recommended: bool = False
    remarks: Optional[str] = None

class CSQuotationInput(BaseModel):
    vendor_id: int
    brand_grade: Optional[str] = None
    payment_terms: Optional[str] = None
    technical_compliance: Optional[str] = "COMPLIANT"
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
    lowest_bidder_vendor_id: Optional[int] = None
    lowest_unit_rate: Optional[float] = None
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
    approval_status: str = "APPROVED"
    approved_by_user_id: Optional[int] = None
    approval_date: Optional[date] = None
    delivery_schedule_notes: Optional[str] = None
    status: str = "ISSUED"
    terms_and_conditions: Optional[str] = None

class PurchaseOrderCreateFromCS(BaseModel):
    cs_id: int
    destination_store_id: int
    delivery_deadline: date
    delivery_schedule_notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None

class PurchaseOrderDirectCreate(BaseModel):
    project_id: int
    vendor_id: int
    material_id: int
    ordered_quantity: float
    unit_price: float
    destination_store_id: int
    delivery_deadline: date
    delivery_schedule_notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None

class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    project_name: Optional[str] = None
    vendor_name: Optional[str] = None
    material_name: Optional[str] = None
    unit_of_measure: Optional[str] = None
    store_name: Optional[str] = None
    approved_by_name: Optional[str] = None
    total_received_quantity: float = 0.00
    created_at: Optional[datetime] = None

class PurchaseOrderApproveRequest(BaseModel):
    approved: bool = True
    delivery_schedule_notes: Optional[str] = None
    notes: Optional[str] = None


# --------------------------------------------------------------------------
# Gate Entry & Goods Receipt Note (GRN) Schemas
# --------------------------------------------------------------------------
class GoodsReceiptBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    po_id: int
    grn_number: str
    receipt_date: date
    delivery_challan_number: str
    challan_photo_url: Optional[str] = None
    received_by_user_id: int
    
    gate_entry_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    gate_in_timestamp: Optional[datetime] = None
    physical_count_verified: bool = True

    received_quantity: float
    rejected_quantity: float = 0.00
    accepted_quantity: float
    qc_status: str = "PENDING"

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
    gate_entry_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    physical_count_verified: Optional[bool] = True
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
# Quality Inspection (QC) Schemas
# --------------------------------------------------------------------------
class QualityInspectionCreate(BaseModel):
    grn_id: int
    slump_test_mm: Optional[float] = None
    tensile_strength_mpa: Optional[float] = None
    mtr_mill_test_report_number: Optional[str] = None
    mtr_verified: bool = True
    test_result: str = "PASSED" # PASSED, FAILED, CONDITIONAL_PASS
    qc_remarks: Optional[str] = None

class QualityInspectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    grn_id: int
    grn_number: Optional[str] = None
    po_number: Optional[str] = None
    material_name: Optional[str] = None
    inspection_number: str
    inspection_date: date
    inspector_name: Optional[str] = None
    slump_test_mm: Optional[float] = None
    tensile_strength_mpa: Optional[float] = None
    mtr_mill_test_report_number: Optional[str] = None
    mtr_verified: bool = True
    test_result: str
    qc_remarks: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Material Issue Note (MIN) Schemas
# --------------------------------------------------------------------------
class MaterialIssueCreate(BaseModel):
    store_id: int
    project_id: int
    material_id: int
    issued_quantity: float
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    wbs_node_id: Optional[int] = None
    issued_to_contractor_id: Optional[int] = None
    contractor_name: Optional[str] = None
    purpose: Optional[str] = None

class MaterialIssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    min_number: str
    issue_date: date
    store_id: int
    store_name: Optional[str] = None
    project_id: int
    project_name: Optional[str] = None
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    wbs_node_id: Optional[int] = None
    wbs_node_name: Optional[str] = None
    material_id: int
    material_name: Optional[str] = None
    unit_of_measure: str
    issued_quantity: float
    contractor_name: Optional[str] = None
    issued_by_name: Optional[str] = None
    purpose: Optional[str] = None
    unit_cost_at_issue: float = 0.00
    total_issue_cost: float = 0.00
    status: str = "ISSUED"
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Inter-Site Stock Transfer Schemas
# --------------------------------------------------------------------------
class StockTransferCreate(BaseModel):
    from_store_id: int
    to_store_id: int
    material_id: int
    transfer_quantity: float
    dispatch_challan_number: str
    remarks: Optional[str] = None

class StockTransferReceive(BaseModel):
    remarks: Optional[str] = None

class StockTransferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transfer_number: str
    from_store_id: int
    from_store_name: Optional[str] = None
    to_store_id: int
    to_store_name: Optional[str] = None
    material_id: int
    material_name: Optional[str] = None
    unit_of_measure: Optional[str] = None
    transfer_quantity: float
    dispatch_date: date
    dispatched_by_name: Optional[str] = None
    receipt_date: Optional[date] = None
    received_by_name: Optional[str] = None
    dispatch_challan_number: str
    unit_rate: float
    total_transfer_value: float
    status: str
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Stock Movement Ledger & Valuation Schemas
# --------------------------------------------------------------------------
class StockLedgerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    store_id: int
    material_id: int
    material_name: Optional[str] = None
    transaction_type: str
    reference_number: str
    transaction_date: date
    quantity_in: float
    quantity_out: float
    unit_rate: float
    total_value: float
    running_balance_qty: float
    running_weighted_avg_rate: float
    created_at: Optional[datetime] = None

class StoreValuationItem(BaseModel):
    material_id: int
    material_name: str
    category: str
    unit_of_measure: str
    current_stock_quantity: float
    weighted_avg_rate: float
    total_stock_value: float

class StoreValuationResponse(BaseModel):
    store_id: int
    store_name: str
    is_central_warehouse: bool
    project_name: Optional[str] = None
    total_valuation: float
    items: List[StoreValuationItem] = []


# --------------------------------------------------------------------------
# Procurement Summary Metrics
# --------------------------------------------------------------------------
class ProcurementMetrics(BaseModel):
    total_active_stores: int
    central_warehouses_count: int = 1
    low_stock_items_count: int
    pending_pr_count: int
    active_po_count: int
    total_po_value: float
    grn_variance_flags: int
    pending_qc_count: int = 0
    total_inventory_valuation: float = 0.00
