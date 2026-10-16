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
  purpose_notes?: string | null;
  status: 'PENDING_CS' | 'CS_PREPARED' | 'PO_ISSUED' | 'REJECTED';
  created_at?: string;
}

export interface CSQuotation {
  id?: number;
  vendor_id: number;
  vendor_name?: string | null;
  vendor_code?: string | null;
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
  received_quantity: number;
  rejected_quantity: number;
  accepted_quantity: number;
  supplier_invoice_number?: string | null;
  supplier_invoice_amount?: number | null;
  calculated_expected_amount: number;
  variance_amount: number;
  three_way_match_status: 'PENDING_MATCH' | 'MATCHED_OK' | 'VARIANCE_FLAGGED' | 'ACCOUNTS_APPROVED';
  accounts_voucher_ref?: string | null;
  status: 'DRAFT' | 'VERIFIED_STORE' | 'POSTED_ACCOUNTS';
  inspection_remarks?: string | null;
  created_at?: string;
}

export interface ProcurementMetrics {
  total_active_stores: number;
  low_stock_items_count: number;
  pending_pr_count: number;
  active_po_count: number;
  total_po_value: number;
  grn_variance_flags: number;
}
