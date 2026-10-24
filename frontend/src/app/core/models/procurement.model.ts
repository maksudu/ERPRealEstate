export interface Vendor {
  id: number;
  vendor_code: string;
  vendor_name: string;
  trade_category: string;
  contact_person: string;
  phone_number: string;
  email?: string | null;
  business_address?: string | null;
  business_registration_number?: string | null;
  trade_license_number?: string | null;
  trade_license_expiry_date?: string | null;
  supplied_categories?: string[] | null;
  document_refs?: { name?: string; url: string; expiry_date?: string }[] | null;
  authorized_representatives?: string[] | null;
  references?: string[] | null;
  credit_limit_bdt?: number;
  currency?: string;
  tin_number?: string | null;
  bin_number?: string | null;
  payment_terms_days: number;
  is_active: boolean;
  approval_status: string;
  approval_notes?: string | null;
  performance_score?: number | null;
  late_delivery_count?: number;
  rejected_delivery_count?: number;
  quality_complaint_count?: number;
  non_conformance_count?: number;
  suspension_reason?: string | null;
  created_at?: string;
}

export interface MaterialItem {
  id: number;
  material_code: string;
  material_name: string;
  category: string;
  unit_of_measure: string;
  standard_unit_cost: number;
  is_active: boolean;
}

export interface StoreStock {
  id: number;
  store_id: number;
  store_name?: string | null;
  material_id: number;
  material_name?: string | null;
  material_code?: string | null;
  unit_of_measure?: string | null;
  current_stock_quantity: number;
  reserved_quantity?: number;
  available_quantity?: number;
  quarantined_quantity?: number;
  bin_location?: string | null;
  rack_number?: string | null;
  zone?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  weighted_avg_rate: number;
  total_stock_value: number;
  reorder_level: number;
  is_low_stock: boolean;
  last_updated_at?: string;
}

export interface SiteStore {
  id: number;
  project_id: number;
  project_name?: string | null;
  store_name: string;
  store_type?: string | null;
  location_details?: string | null;
  store_in_charge_user_id?: number | null;
  store_in_charge_name?: string | null;
  zone_code?: string | null;
  rack_code?: string | null;
  bin_code?: string | null;
  contact_phone?: string | null;
  is_central_warehouse: boolean;
  is_active: boolean;
  stocks: StoreStock[];
  created_at?: string;
}

export interface PurchaseRequisition {
  id: number;
  project_id: number;
  project_name?: string | null;
  pr_number: string;
  batch_reference?: string | null;
  requested_by_user_id: number;
  requester_name?: string | null;
  department_name?: string | null;
  site_engineer_name?: string | null;
  requisition_date: string;
  required_by_date?: string | null;
  material_id: number;
  material_name?: string | null;
  material_specification?: string | null;
  unit_of_measure?: string | null;
  requested_quantity: number;
  approved_quantity?: number | null;
  current_stock_quantity?: number | null;
  reserved_quantity?: number | null;
  estimated_unit_rate?: number | null;
  estimated_amount?: number | null;
  suggested_vendor_name?: string | null;
  priority?: 'NORMAL' | 'URGENT' | 'EMERGENCY' | string;
  boq_item_id?: number | null;
  boq_item_code?: string | null;
  boq_remaining_headroom?: number | null;
  wbs_node_id?: number | null;
  wbs_node_code?: string | null;
  wbs_node_name?: string | null;
  tower_name?: string | null;
  floor_number?: string | null;
  department?: string | null;
  destination_store_id?: number | null;
  delivery_location?: string | null;
  attachment_refs?: string[] | null;
  purpose_notes?: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'RETURNED_FOR_REVISION' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO' | 'PARTIALLY_ORDERED' | 'COMPLETED' | 'CANCELLED' | 'SITE_APPROVED' | 'BUDGET_VERIFIED' | 'PROCUREMENT_REVIEWED' | 'APPROVED_FOR_PURCHASE' | 'PENDING_CS' | 'RFQ_ISSUED' | 'CS_PREPARED' | 'FULLY_ORDERED' | 'PO_ISSUED' | 'CLOSED' | string;
  created_at?: string;
}

export interface RFQVendor {
  id: number;
  vendor_id: number;
  vendor_name?: string | null;
  vendor_code?: string | null;
  invitation_sent_at?: string;
  status: string;
}

export interface RFQ {
  id: number;
  pr_id: number;
  pr_number?: string | null;
  project_name?: string | null;
  material_name?: string | null;
  requested_quantity?: number | null;
  unit_of_measure?: string | null;
  rfq_number: string;
  rfq_date: string;
  submission_deadline: string;
  notes?: string | null;
  status: string;
  invited_vendors: RFQVendor[];
  created_at?: string;
}

export interface CSQuotation {
  id?: number;
  vendor_id: number;
  vendor_name?: string | null;
  vendor_code?: string | null;
  brand_grade?: string | null;
  technical_specification?: string | null;
  country_of_origin?: string | null;
  warranty_months?: number | null;
  quotation_valid_until?: string | null;
  payment_terms?: string | null;
  technical_compliance?: string;
  quality_compliance?: 'Pass' | 'Pending' | 'Failed' | string;
  quoted_unit_rate: number;
  transport_cost?: number;
  discount_amount?: number;
  delivery_charge_bdt?: number;
  discount_amount_bdt?: number;
  vat_amount_bdt?: number;
  other_tax_amount_bdt?: number;
  commercial_evaluation?: string;
  revision_number?: number;
  negotiation_history?: string | null;
  tax_amount?: number;
  total_delivered_cost?: number;
  quoted_quantity: number;
  total_quoted_amount: number;
  credit_days_offered: number;
  lead_time_days: number;
  warranty_terms?: string | null;
  is_recommended: boolean;
  remarks?: string | null;
}

export interface ComparativeStatement {
  id: number;
  pr_id: number;
  pr_number?: string | null;
  project_name?: string | null;
  material_name?: string | null;
  requested_quantity?: number | null;
  unit_of_measure?: string | null;
  cs_number: string;
  cs_date: string;
  recommended_vendor_id?: number | null;
  recommended_vendor_name?: string | null;
  lowest_bidder_vendor_id?: number | null;
  lowest_unit_rate?: number | null;
  status: 'DRAFT' | 'PENDING_COMMITTEE' | 'APPROVED' | 'REJECTED' | 'PO_GENERATED';
  committee_recommendation?: string | null;
  committee_decision_notes?: string | null;
  award_allocations?: { vendor_id: number; quantity: number; quotation_id: number; rationale?: string }[] | null;
  justification_summary?: string | null;
  quotations: CSQuotation[];
  created_at?: string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  cs_id?: number | null;
  project_id: number;
  project_name?: string | null;
  vendor_id: number;
  vendor_name?: string | null;
  material_id: number;
  material_name?: string | null;
  unit_of_measure?: string | null;
  ordered_quantity: number;
  unit_price: number;
  total_po_amount: number;
  po_date: string;
  delivery_deadline: string;
  destination_store_id: number;
  boq_item_id?: number | null;
  wbs_node_id?: number | null;
  order_type?: 'LOCAL' | 'IMPORTED' | 'EQUIPMENT' | 'SERVICE' | string;
  item_specification?: string | null;
  discount_amount_bdt?: number;
  tax_amount_bdt?: number;
  payment_terms_days?: number;
  advance_payment_amount_bdt?: number;
  revision_number?: number;
  revision_history?: Record<string, any>[] | null;
    line_items?: Array<Record<string, any>> | null;
    payment_terms?: string | null;
  store_name?: string | null;
  approval_status: string;
  approved_by_name?: string | null;
  approval_date?: string | null;
  delivery_schedule_notes?: string | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_SUPPLIER' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CLOSED' | 'REJECTED' | 'CANCELLED' | 'ON_HOLD' | 'OVERDUE' | string;
  total_received_quantity: number;
  terms_and_conditions?: string | null;
  created_at?: string;
}

export interface GoodsReceipt {
  id: number;
  po_id: number;
  po_number?: string | null;
  po_unit_price?: number | null;
  po_ordered_quantity?: number | null;
  po_outstanding_quantity?: number | null;
  destination_store_name?: string | null;
  project_name?: string | null;
  vendor_name?: string | null;
  material_name?: string | null;
  unit_of_measure?: string | null;
  grn_number: string;
  receipt_date: string;
  delivery_challan_number: string;
  challan_photo_url?: string | null;
  received_by_user_id: number;
  received_by_name?: string | null;
  
  gate_entry_number?: string | null;
  vehicle_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  gate_in_timestamp?: string | null;
  physical_count_verified: boolean;

  received_quantity: number;
  rejected_quantity: number;
  accepted_quantity: number;
  qc_status: 'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL';

  supplier_invoice_number?: string | null;
  supplier_invoice_amount?: number | null;
  calculated_expected_amount: number;
  variance_amount: number;
  three_way_match_status: 'PENDING_MATCH' | 'MATCHED_OK' | 'VARIANCE_FLAGGED' | 'ACCOUNTS_APPROVED';
  accounts_voucher_ref?: string | null;
  status: 'DRAFT' | 'GATE_ENTERED' | 'VERIFIED_STORE' | 'POSTED_ACCOUNTS';
  inspection_remarks?: string | null;
  created_at?: string;
}

export interface QualityInspection {
  id: number;
  grn_id: number;
  grn_number?: string | null;
  po_number?: string | null;
  material_name?: string | null;
  inspection_number: string;
  inspection_date: string;
  inspector_name?: string | null;
  slump_test_mm?: number | null;
  tensile_strength_mpa?: number | null;
  mtr_mill_test_report_number?: string | null;
  mtr_verified: boolean;
  test_result: string;
  qc_remarks?: string | null;
  created_at?: string;
}

export interface MaterialIssueNote {
  id: number;
  min_number: string;
  issue_date: string;
  store_id: number;
  store_name?: string | null;
  project_id: number;
  project_name?: string | null;
  tower_name?: string | null;
  floor_number?: string | null;
  wbs_node_id?: number | null;
  wbs_node_name?: string | null;
  material_id: number;
  material_name?: string | null;
  unit_of_measure: string;
  issued_quantity: number;
  returned_quantity?: number;
  net_consumed_quantity?: number;
  receiving_person?: string | null;
  batch_number?: string | null;
  contractor_name?: string | null;
  issued_by_name?: string | null;
  purpose?: string | null;
  unit_cost_at_issue: number;
  total_issue_cost: number;
  status: string;
  created_at?: string;
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  from_store_id: number;
  from_store_name?: string | null;
  to_store_id: number;
  to_store_name?: string | null;
  material_id: number;
  material_name?: string | null;
  unit_of_measure?: string | null;
  transfer_quantity: number;
  received_quantity?: number | null;
  damaged_quantity?: number;
  short_delivered_quantity?: number;
  discrepancy_notes?: string | null;
  dispatch_date: string;
  dispatched_by_name?: string | null;
  receipt_date?: string | null;
  received_by_name?: string | null;
  dispatch_challan_number: string;
  unit_rate: number;
  total_transfer_value: number;
  status: string;
  remarks?: string | null;
  created_at?: string;
}

export interface StockAdjustmentRecord {
  id: number;
  store_id: number;
  store_name: string;
  material_id: number;
  material_name: string;
  unit_of_measure: string;
  quantity_delta: number;
  unit_rate: number;
  total_adjustment_value: number;
  adjustment_reason: string;
  approval_status: string;
  evidence_notes?: string;
  voucher_reference?: string;
  created_at?: string;
}

export interface StockLedger {
  id: number;
  store_id: number;
  store_name?: string | null;
  material_id: number;
  material_name?: string | null;
  unit_of_measure?: string | null;
  transaction_type: string;
  reference_number: string;
  transaction_date: string;
  posting_date?: string;
  quantity_in: number;
  quantity_out: number;
  unit_rate: number;
  total_value: number;
  running_balance_qty: number;
  balance_quantity?: number;
  running_weighted_avg_rate: number;
  created_at?: string;
}

export interface StoreValuationItem {
  material_id: number;
  material_name: string;
  category: string;
  unit_of_measure: string;
  current_stock_quantity: number;
  weighted_avg_rate: number;
  total_stock_value: number;
}

export interface StoreValuationResponse {
  store_id: number;
  store_name: string;
  is_central_warehouse: boolean;
  project_name?: string | null;
  total_valuation: number;
  total_stock_value?: number;
  items: StoreValuationItem[];
}

export interface ValuationMethodComparison {
  material_id: number;
  material_name: string;
  category: string;
  unit_of_measure: string;
  current_quantity: number;
  weighted_avg_rate: number;
  weighted_avg_valuation: number;
  fifo_rate: number;
  fifo_valuation: number;
  standard_cost: number;
  standard_valuation: number;
  cost_variance: number;
}

export interface StockAgingReportItem {
  material_id: number;
  material_name: string;
  store_name: string;
  current_stock_quantity: number;
  unit_of_measure: string;
  weighted_avg_rate: number;
  total_valuation: number;
  days_since_last_movement: number;
  aging_category: string;
  impairment_risk: string;
}

export interface PeriodEndReconciliation {
  period_name: string;
  total_inventory_asset_valuation: number;
  gl_inventory_account_balance: number;
  unreconciled_difference: number;
  reconciliation_status: string;
}

export interface ProcurementMetrics {
  total_active_stores: number;
  central_warehouses_count: number;
  low_stock_items_count: number;
  pending_pr_count: number;
  active_po_count: number;
  total_po_value: number;
  grn_variance_flags: number;
  pending_qc_count: number;
  total_inventory_valuation: number;
}

export interface ReorderAlertItem {
  store_id: number;
  store_name: string;
  material_id: number;
  material_name: string;
  category: string;
  unit_of_measure: string;
  current_stock_quantity: number;
  reorder_level: number;
  safety_stock?: number;
  lead_time_days?: number;
  avg_daily_consumption?: number;
  open_po_quantity?: number;
  reserved_quantity?: number;
  max_stock_level?: number;
  shortage_quantity: number;
  weighted_avg_rate: number;
  suggested_order_value: number;
  suggested_purchase_quantity?: number;
  is_emergency?: boolean;
  project_id?: number | null;
  project_name?: string | null;
}

export interface SupplierBill {
  id: number;
  po_id: number;
  po_number: string;
  grn_number: string;
  vendor_name: string;
  project_name?: string | null;
  material_name?: string | null;
  unit_of_measure?: string | null;
  po_unit_price?: number;
  ordered_quantity?: number;
  delivered_quantity?: number;
  accepted_quantity?: number;
  rejected_quantity?: number;
  receipt_date: string;
  supplier_invoice_number?: string | null;
  supplier_invoice_amount?: number | null;
  calculated_expected_amount: number;
  variance_amount: number;
  three_way_match_status: string;
  accounts_voucher_ref?: string | null;
  qc_status: string;
  status: string;
  vat_tax_amount?: number;
  freight_amount?: number;
  discount_amount?: number;
  debit_note_number?: string | null;
  debit_note_amount?: number;
  payment_status?: string;
  payment_voucher_ref?: string | null;
  duplicate_warning?: boolean;
}

export interface AuditTrailItem {
  id: number;
  timestamp: string;
  module: string;
  action: string;
  reference_number: string;
  user_name: string;
  details: string;
  status: string;
}
