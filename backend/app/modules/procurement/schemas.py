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
    business_address: Optional[str] = None
    business_registration_number: Optional[str] = None
    trade_license_number: Optional[str] = None
    trade_license_expiry_date: Optional[date] = None
    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    supplied_categories: Optional[List[str]] = None
    document_refs: Optional[List[dict]] = None
    authorized_representatives: Optional[List[str]] = None
    references: Optional[List[str]] = None
    credit_limit_bdt: float = 0.00
    currency: str = "BDT"
    payment_terms_days: int = 30
    is_active: bool = True
    approval_status: str = "APPROVED"
    approval_notes: Optional[str] = None
    performance_score: Optional[float] = None
    late_delivery_count: int = 0
    rejected_delivery_count: int = 0
    quality_complaint_count: int = 0
    non_conformance_count: int = 0
    suspension_reason: Optional[str] = None

class VendorCreate(BaseModel):
    vendor_name: str
    trade_category: str
    contact_person: str
    phone_number: str
    email: Optional[str] = None
    business_address: Optional[str] = None
    business_registration_number: Optional[str] = None
    trade_license_number: Optional[str] = None
    trade_license_expiry_date: Optional[date] = None
    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    supplied_categories: Optional[List[str]] = None
    document_refs: Optional[List[dict]] = None
    authorized_representatives: Optional[List[str]] = None
    references: Optional[List[str]] = None
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_branch: Optional[str] = None
    credit_limit_bdt: Optional[float] = 0.00
    currency: Optional[str] = "BDT"
    payment_terms_days: Optional[int] = 30

class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = None
    trade_category: Optional[str] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    business_address: Optional[str] = None
    business_registration_number: Optional[str] = None
    trade_license_number: Optional[str] = None
    trade_license_expiry_date: Optional[date] = None
    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    supplied_categories: Optional[List[str]] = None
    document_refs: Optional[List[dict]] = None
    authorized_representatives: Optional[List[str]] = None
    references: Optional[List[str]] = None
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_branch: Optional[str] = None
    credit_limit_bdt: Optional[float] = None
    currency: Optional[str] = None
    payment_terms_days: Optional[int] = None

class VendorWorkflowAction(BaseModel):
    action: str
    notes: Optional[str] = None

class VendorPaymentDetailsResponse(BaseModel):
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_branch: Optional[str] = None

class VendorApprovalEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vendor_id: int
    actor_user_id: Optional[int] = None
    action: str
    from_status: Optional[str] = None
    to_status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

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

class MaterialItemUpdate(BaseModel):
    material_code: Optional[str] = None
    material_name: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: Optional[str] = None
    standard_unit_cost: Optional[float] = None
    is_active: Optional[bool] = None

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
    reserved_quantity: float = 0.00
    weighted_avg_rate: float = 0.00
    total_stock_value: float = 0.00
    reorder_level: float = 100.00

class StoreStockResponse(StoreStockBase):
    id: int
    material_name: Optional[str] = None
    material_code: Optional[str] = None
    unit_of_measure: Optional[str] = None
    reserved_quantity: float = 0.00
    available_quantity: Optional[float] = None
    quarantined_quantity: float = 0.00
    bin_location: Optional[str] = None
    rack_number: Optional[str] = None
    zone: Optional[str] = None
    batch_number: Optional[str] = None
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

class SiteStoreUpdate(BaseModel):
    store_name: Optional[str] = None
    location_details: Optional[str] = None
    store_in_charge_user_id: Optional[int] = None
    is_central_warehouse: Optional[bool] = None
    is_active: Optional[bool] = None

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
    adjustment_reason: str # 'CYCLE_COUNT_VARIANCE', 'DAMAGE_MOISTURE', 'HANDLING_LOSS', 'UOM_CORRECTION', 'OPENING_BALANCE', 'THEFT_OR_PILFERAGE', 'OBSOLETE_SCRAP'
    evidence_notes: Optional[str] = None
    voucher_reference: Optional[str] = None

class StockAdjustmentRecord(BaseModel):
    id: int
    store_id: int
    store_name: str
    material_id: int
    material_name: str
    unit_of_measure: str
    quantity_delta: float
    unit_rate: float
    total_adjustment_value: float
    adjustment_reason: str
    approval_status: str # 'APPROVED', 'PENDING_APPROVAL'
    evidence_notes: Optional[str] = None
    voucher_reference: Optional[str] = None
    created_at: Optional[datetime] = None

class StockAdjustmentReversalRequest(BaseModel):
    reversal_reason: str

class StoreStockReservationRequest(BaseModel):
    store_id: int
    material_id: int
    reserved_quantity: float
    work_order_reference: Optional[str] = None
    reservation_purpose: Optional[str] = None

class PhysicalCycleCountRequest(BaseModel):
    store_id: int
    material_id: int
    physical_counted_quantity: float
    cycle_count_date: Optional[date] = None
    discrepancy_reason: Optional[str] = None
    counter_officer_name: Optional[str] = None


# --------------------------------------------------------------------------
# Purchase Requisition (PR) Schemas (with BOQ Hard Budget & WBS Link)
# --------------------------------------------------------------------------
class PurchaseRequisitionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    pr_number: str
    batch_reference: Optional[str] = None
    requested_by_user_id: int
    requisition_date: date
    required_by_date: Optional[date] = None
    material_id: int
    requested_quantity: float
    approved_quantity: Optional[float] = None
    boq_item_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    priority: str = "NORMAL"
    department: Optional[str] = None
    destination_store_id: Optional[int] = None
    delivery_location: Optional[str] = None
    attachment_refs: Optional[list[str]] = None
    purpose_notes: Optional[str] = None
    status: str = "DRAFT"

class PurchaseRequisitionCreate(BaseModel):
    project_id: int
    batch_reference: Optional[str] = None
    material_id: int
    requested_quantity: float
    boq_item_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    required_by_date: Optional[date] = None
    purpose_notes: Optional[str] = None
    priority: str = "NORMAL"
    department: Optional[str] = None
    destination_store_id: Optional[int] = None
    delivery_location: Optional[str] = None
    attachment_refs: Optional[list[str]] = None

class PurchaseRequisitionUpdate(BaseModel):
    requested_quantity: Optional[float] = None
    required_by_date: Optional[date] = None
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    purpose_notes: Optional[str] = None
    priority: Optional[str] = None
    department: Optional[str] = None
    destination_store_id: Optional[int] = None
    delivery_location: Optional[str] = None
    attachment_refs: Optional[list[str]] = None

class RequisitionAvailabilityResponse(BaseModel):
    project_id: int
    material_id: int
    requested_quantity: float
    on_hand_quantity: float
    reserved_quantity: float
    available_quantity: float
    open_requisition_quantity: float
    incoming_po_quantity: float
    approved_project_budget_bdt: float
    committed_purchase_order_bdt: float
    estimated_request_value_bdt: float
    budget_available_bdt: float

class PRWorkflowAction(BaseModel):
    action: str # 'SUBMIT', 'DEPARTMENT_APPROVE', 'PROJECT_APPROVE', 'VERIFY_BUDGET', 'PROCUREMENT_REVIEW', 'APPROVE_PURCHASE', 'RETURN_FOR_REVISION', 'REJECT'
    notes: Optional[str] = None
    approved_quantity: Optional[float] = None

class PRWorkflowEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    pr_id: int
    action: str
    from_status: Optional[str] = None
    to_status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

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
    technical_specification: Optional[str] = None
    country_of_origin: Optional[str] = None
    warranty_months: Optional[int] = None
    quotation_valid_until: Optional[date] = None
    payment_terms: Optional[str] = None
    technical_compliance: str = "COMPLIANT"
    quoted_unit_rate: float
    quoted_quantity: float
    total_quoted_amount: float
    delivery_charge_bdt: float = 0
    discount_amount_bdt: float = 0
    vat_amount_bdt: float = 0
    other_tax_amount_bdt: float = 0
    commercial_evaluation: str = "PENDING"
    revision_number: int = 1
    previous_quotation_id: Optional[int] = None
    is_current: bool = True
    negotiation_history: Optional[str] = None
    credit_days_offered: int = 30
    lead_time_days: int = 3
    is_recommended: bool = False
    remarks: Optional[str] = None

class CSQuotationInput(BaseModel):
    vendor_id: int
    quoted_quantity: Optional[float] = None
    brand_grade: Optional[str] = None
    technical_specification: Optional[str] = None
    country_of_origin: Optional[str] = None
    warranty_months: Optional[int] = None
    quotation_valid_until: Optional[date] = None
    payment_terms: Optional[str] = None
    technical_compliance: Optional[str] = "COMPLIANT"
    quoted_unit_rate: float
    delivery_charge_bdt: float = 0
    discount_amount_bdt: float = 0
    vat_amount_bdt: float = 0
    other_tax_amount_bdt: float = 0
    commercial_evaluation: str = "PENDING"
    negotiation_history: Optional[str] = None
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
    committee_recommendation: Optional[str] = None
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
    committee_recommendation: Optional[str] = None
    committee_decision_notes: Optional[str] = None
    award_allocations: Optional[List[dict]] = None
    quotations: List[CSQuotationResponse] = []
    created_at: Optional[datetime] = None

class CSCommitteeDecision(BaseModel):
    approved: bool
    decision_notes: str
    awards: List[dict] = []


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
    vendor_id: Optional[int] = None
    ordered_quantity: Optional[float] = None
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

class PurchaseOrderUpdate(BaseModel):
    ordered_quantity: Optional[float] = None
    unit_price: Optional[float] = None
    delivery_deadline: Optional[date] = None
    destination_store_id: Optional[int] = None
    delivery_schedule_notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    status: Optional[str] = None
    approval_status: Optional[str] = None

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

class GoodsReceiptUpdate(BaseModel):
    delivery_challan_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    received_quantity: Optional[float] = None
    rejected_quantity: Optional[float] = None
    physical_count_verified: Optional[bool] = None
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
    po_ordered_quantity: Optional[float] = None
    po_outstanding_quantity: Optional[float] = None
    destination_store_name: Optional[str] = None
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

class QualityInspectionUpdate(BaseModel):
    slump_test_mm: Optional[float] = None
    tensile_strength_mpa: Optional[float] = None
    mtr_mill_test_report_number: Optional[str] = None
    mtr_verified: Optional[bool] = None
    test_result: Optional[str] = None
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
    receiving_person: Optional[str] = None
    batch_number: Optional[str] = None
    boq_item_id: Optional[int] = None
    purpose: Optional[str] = None

class MaterialIssueUpdate(BaseModel):
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    contractor_name: Optional[str] = None
    receiving_person: Optional[str] = None
    purpose: Optional[str] = None

class MaterialReturnCreate(BaseModel):
    min_id: int
    returned_quantity: float
    return_reason: str = "UNUSED_RECOVERY" # UNUSED_RECOVERY, DAMAGED_EXCHANGE, ACTIVITY_COMPLETED
    returning_person: Optional[str] = None
    remarks: Optional[str] = None

class ConsumptionReconciliationReport(BaseModel):
    activity_name: str
    material_name: str
    unit_of_measure: str
    boq_allowance: float
    total_issued: float
    total_returned: float
    reported_consumed: float
    net_consumed: float
    variance_quantity: float
    wastage_percentage: float
    unexplained_variance: float
    contractor_name: Optional[str] = None

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
    returned_quantity: float = 0.00
    net_consumed_quantity: Optional[float] = None
    contractor_name: Optional[str] = None
    receiving_person: Optional[str] = None
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
    received_quantity: Optional[float] = None
    damaged_quantity: Optional[float] = 0.0
    short_delivered_quantity: Optional[float] = 0.0
    discrepancy_reason: Optional[str] = None
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
    received_quantity: Optional[float] = None
    damaged_quantity: Optional[float] = 0.0
    short_delivered_quantity: Optional[float] = 0.0
    discrepancy_notes: Optional[str] = None
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

class ValuationMethodComparison(BaseModel):
    material_id: int
    material_name: str
    category: str
    unit_of_measure: str
    current_quantity: float
    weighted_avg_rate: float
    weighted_avg_valuation: float
    fifo_rate: float
    fifo_valuation: float
    standard_cost: float
    standard_valuation: float
    cost_variance: float

class StockAgingReportItem(BaseModel):
    material_id: int
    material_name: str
    store_name: str
    current_stock_quantity: float
    unit_of_measure: str
    weighted_avg_rate: float
    total_valuation: float
    days_since_last_movement: int
    aging_category: str # 'ACTIVE (<30d)', 'SLOW_MOVING (31-90d)', 'NON_MOVING (91-180d)', 'OBSOLETE (>180d)'
    impairment_risk: str # 'LOW', 'MEDIUM', 'HIGH'

class PeriodEndReconciliation(BaseModel):
    period_name: str
    total_inventory_asset_valuation: float
    gl_inventory_account_balance: float
    unreconciled_difference: float
    reconciliation_status: str # 'BALANCED', 'VARIANCE_DETECTED'


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


# --------------------------------------------------------------------------
# Planning, Supplier Bills & Audit Trail Schemas
# --------------------------------------------------------------------------
class ReorderAlertItem(BaseModel):
    store_id: int
    store_name: str
    material_id: int
    material_name: str
    category: str
    unit_of_measure: str
    current_stock_quantity: float
    reorder_level: float
    safety_stock: float = 0.0
    lead_time_days: int = 7
    avg_daily_consumption: float = 0.0
    open_po_quantity: float = 0.0
    reserved_quantity: float = 0.0
    max_stock_level: float = 0.0
    shortage_quantity: float
    weighted_avg_rate: float
    suggested_order_value: float
    suggested_purchase_quantity: float = 0.0
    is_emergency: bool = False
    project_id: Optional[int] = None
    project_name: Optional[str] = None

class SupplierBillResponse(BaseModel):
    id: int
    po_id: int
    po_number: str
    grn_number: str
    vendor_name: str
    project_name: Optional[str] = None
    material_name: Optional[str] = None
    unit_of_measure: Optional[str] = None
    po_unit_price: float = 0.0
    ordered_quantity: float = 0.0
    delivered_quantity: float = 0.0
    accepted_quantity: float = 0.0
    rejected_quantity: float = 0.0
    receipt_date: date
    supplier_invoice_number: Optional[str] = None
    supplier_invoice_amount: Optional[float] = None
    calculated_expected_amount: float
    variance_amount: float
    three_way_match_status: str
    accounts_voucher_ref: Optional[str] = None
    qc_status: str
    status: str
    vat_tax_amount: float = 0.0
    freight_amount: float = 0.0
    discount_amount: float = 0.0
    debit_note_number: Optional[str] = None
    debit_note_amount: float = 0.0
    payment_status: str = "UNPAID" # UNPAID, PAID
    payment_voucher_ref: Optional[str] = None
    duplicate_warning: bool = False

class SupplierBillReconcileRequest(BaseModel):
    supplier_invoice_number: str
    supplier_invoice_amount: float
    vat_tax_amount: float = 0.0
    freight_amount: float = 0.0
    discount_amount: float = 0.0
    approval_action: str = "APPROVE_MATCH" # APPROVE_MATCH, VARIANCE_FLAGGED, DISPUTED
    accounts_voucher_ref: Optional[str] = None
    accounts_notes: Optional[str] = None

class SupplierBillPaymentRequest(BaseModel):
    paid_amount: float
    payment_method: str = "BANK_TRANSFER" # BANK_TRANSFER, CHEQUE, BEFTN, RTGS, CASH
    bank_account_reference: Optional[str] = None
    cheque_number: Optional[str] = None
    payment_voucher_ref: str
    payment_date: Optional[date] = None
    remarks: Optional[str] = None

class SupplierDebitNoteCreate(BaseModel):
    debit_amount: float
    debit_reason: str # REJECTED_GOODS_DEDUCTION, PRICE_OVERCHARGE, TRANSIT_DAMAGE_CLAIM
    remarks: Optional[str] = None

class AuditTrailItem(BaseModel):
    id: int
    timestamp: datetime
    module: str
    action: str
    reference_number: str
    user_name: str
    details: str
    status: str

