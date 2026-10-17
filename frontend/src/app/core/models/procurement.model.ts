export interface Vendor {
  id: number;
  vendor_code: string;
  vendor_name: string;
  trade_category: string;
  contact_person: string;
  phone_number: string;
  email?: string | null;
  tin_number?: string | null;
  bin_number?: string | null;
  payment_terms_days: number;
  is_active: boolean;
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
  material_id: number;
  material_name?: string | null;
  material_code?: string | null;
  unit_of_measure?: string | null;
  current_stock_quantity: number;
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
  location_details?: string | null;
  store_in_charge_user_id?: number | null;
  store_in_charge_name?: string | null;
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
  requested_by_user_id: number;
  requester_name?: string | null;
  requisition_date: string;
  required_by_date?: string | null;
  material_id: number;
  material_name?: string | null;
  unit_of_measure?: string | null;
  requested_quantity: number;
  boq_item_id?: number | null;
  boq_item_code?: string | null;
  boq_remaining_headroom?: number | null;
  wbs_node_id?: number | null;
  wbs_node_code?: string | null;
  wbs_node_name?: string | null;
  tower_name?: string | null;
  floor_number?: string | null;
  purpose_notes?: string | null;
  status: 'PENDING_CS' | 'RFQ_ISSUED' | 'CS_PREPARED' | 'PO_ISSUED' | 'REJECTED';
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
  payment_terms?: string | null;
  technical_compliance?: string;
  quoted_unit_rate: number;
  quoted_quantity: number;
  total_quoted_amount: number;
  credit_days_offered: number;
  lead_time_days: number;
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
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'PO_GENERATED';
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
  store_name?: string | null;
  approval_status: string;
  approved_by_name?: string | null;
  approval_date?: string | null;
  delivery_schedule_notes?: string | null;
  status: 'ISSUED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED';
  total_received_quantity: number;
  terms_and_conditions?: string | null;
  created_at?: string;
}

export interface GoodsReceipt {
  id: number;
  po_id: number;
  po_number?: string | null;
  po_unit_price?: number | null;
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

export interface StockLedger {
  id: number;
  store_id: number;
  material_id: number;
  material_name?: string | null;
  transaction_type: string;
  reference_number: string;
  transaction_date: string;
  quantity_in: number;
  quantity_out: number;
  unit_rate: number;
  total_value: number;
  running_balance_qty: number;
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
  items: StoreValuationItem[];
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
