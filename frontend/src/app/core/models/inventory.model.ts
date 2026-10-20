export interface Unit {
  id: number;
  project_id: number;
  tower_id: number;
  floor_number: number;
  unit_number: string;
  unit_type_id: string; // TYPE_3BHK, TYPE_4BHK, PENTHOUSE, DUPLEX, COMMERCIAL, SHOP
  facing_id: string; // SOUTH_FACING, NORTH_FACING, LAKE_VIEW, CORNER_PLOT, ROAD_FACING, NORTH_EAST
  net_carpet_area_sqft: number;
  gross_saleable_area_sqft: number;
  unit_size_sqft?: number;
  bed_count?: number;
  bath_count?: number;
  balcony_count?: number;
  floor_plan_image_url?: string;
  render_images_json?: string;
  base_rate_per_sqft: number;
  floor_escalation_rate: number;
  facing_premium_rate: number;
  effective_rate_per_sqft: number;
  total_unit_price: number;
  utility_connection_fee?: number;
  parking_charge?: number;
  max_discount_amount?: number;
  status_id: string;
  is_landowner_share: boolean;
  project_name?: string;
  project_code?: string;
  tower_name?: string;
  is_merged?: boolean;
  merged_into_unit_id?: number;
  parent_unit_id?: number;
  combination_type?: string;
  current_locked_by_user_id?: number;
  current_locked_by_user_name?: string;
  lock_expires_at?: string;
  lock_remaining_seconds?: number;
  parking_allocation_id?: number | null;
  created_at?: string;
}

export interface UnitLockResponse {
  success: boolean;
  unit_id: number;
  unit_number: string;
  status: string;
  locked_by_user_id: number;
  locked_by_user_name: string;
  lock_duration_seconds: number;
  expires_at: string;
  message: string;
}

export interface UnitTile {
  id: number;
  project_id: number;
  tower_id: number;
  floor_number: number;
  unit_number: string;
  unit_type: string;
  facing: string;
  gross_sft: number;
  net_carpet_sft: number;
  bed_count: number;
  bath_count: number;
  balcony_count: number;
  base_price_per_sft: number;
  floor_rise_rate: number;
  facing_premium: number;
  total_base_price: number;
  utility_connection_fee: number;
  parking_charge: number;
  max_discount_amount: number;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'LANDOWNER_SHARE' | 'RETAINED' | 'BLOCKED';
  color_code: string;
  status_label: string;
  lock_remaining_seconds: number;
  locked_by_user_name?: string;
  floor_plan_image_url?: string;
  is_landowner_share?: boolean;
  is_merged: boolean;
  combination_type?: string;
}

export interface StackingFloorNode {
  floor_number: number;
  floor_name: string;
  floor_type: 'PENTHOUSE' | 'TYPICAL' | 'PODIUM' | 'GROUND' | 'BASEMENT';
  total_units: number;
  available_count: number;
  reserved_count: number;
  sold_count: number;
  landowner_count: number;
  retained_count: number;
  blocked_count: number;
  units: UnitTile[];
}

export interface StackingSummary {
  total_units: number;
  available: number;
  reserved: number;
  sold: number;
  landowner: number;
  retained: number;
  blocked: number;
  total_saleable_sqft: number;
  total_inventory_value: number;
}

export interface TowerStackingResponse {
  project_id: number;
  project_name: string;
  tower_id: number;
  tower_name: string;
  total_floors: number;
  residential_floors: number;
  basement_floors: number;
  floors: StackingFloorNode[];
  summary: StackingSummary;
}

export interface PriceBreakdown {
  unit_id: number;
  unit_number: string;
  unit_type: string;
  facing: string;
  gross_sft: number;
  net_carpet_sft: number;
  base_rate_per_sft: number;
  base_cost: number;
  floor_number: number;
  floor_rise_rate: number;
  floor_rise_cost: number;
  facing_premium_rate: number;
  facing_premium_cost: number;
  parking_charge: number;
  utility_connection_fee: number;
  subtotal: number;
  max_discount_amount: number;
  min_allowed_price: number;
  net_effective_price: number;
  is_landowner_share: boolean;
  status: string;
}

export interface ParkingBay {
  id: number;
  project_id: number;
  basement_level: string;
  bay_number: string;
  parking_type_id: string;
  price: number;
  is_allocated: boolean;
  allocated_to_unit_id?: number;
}

export interface ParkingSlot {
  id: number;
  project_id: number;
  tower_id?: number;
  basement_level: string;
  slot_number: string;
  slot_type: string;
  price: number;
  status: 'AVAILABLE' | 'RESERVED' | 'ALLOCATED' | 'BLOCKED';
  assigned_unit_id?: number;
  assigned_unit_number?: string;
  created_at?: string;
}

export interface UnitMergePayload {
  project_id: number;
  tower_id: number;
  floor_number: number;
  source_unit_ids: number[];
  new_unit_number: string;
  unit_type: string;
  facing: string;
  bed_count: number;
  bath_count: number;
  balcony_count: number;
  remarks?: string;
}

export interface SubdivisionItem {
  unit_number: string;
  gross_sft: number;
  net_carpet_sft: number;
  unit_type: string;
  facing: string;
  bed_count: number;
  bath_count: number;
  balcony_count: number;
}

export interface UnitSplitPayload {
  unit_id: number;
  subdivisions: SubdivisionItem[];
  remarks?: string;
}

export interface CombinationLog {
  id: number;
  project_id: number;
  tower_id: number;
  operation_type: 'MERGE' | 'SPLIT';
  source_unit_numbers: string;
  target_unit_numbers: string;
  combined_gross_sft: number;
  combined_price: number;
  remarks?: string;
  created_at?: string;
}

export interface InventoryDashboardResponse {
  total_units: number;
  available_units: number;
  reserved_units: number;
  booked_sold_units: number;
  blocked_units: number;
  landowner_units: number;
  developer_units: number;
  total_saleable_area_sqft: number;
  remaining_saleable_area_sqft: number;
  booked_sold_area_sqft: number;
  estimated_total_value: number;
  remaining_inventory_value: number;
  booked_sold_value: number;
  average_rate_per_sqft: number;
  total_parking_slots: number;
  available_parking_slots: number;
  allocated_parking_slots: number;
  property_type_breakdown: Array<{ type: string; total: number; available: number; sold: number }>;
  project_breakdown: Array<{ project_name: string; code: string; total_units: number; available: number; booked_sold: number; reserved: number }>;
  floor_breakdown: Array<{ floor: number; floor_label: string; total_units: number; available: number; booked: number; reserved: number }>;
  reservation_alerts: Array<{ unit_number: string; project_name: string; agent_name: string; hold_status: string; remaining_minutes: number; expires_in: string }>;
}

export interface UnitPagedResponse {
  total: number;
  page: number;
  limit: number;
  items: Unit[];
}

export interface UnitCreatePayload {
  project_id: number;
  tower_id: number;
  floor_number: number;
  unit_number: string;
  unit_type_id: string;
  facing_id: string;
  net_carpet_area_sqft: number;
  gross_saleable_area_sqft: number;
  bed_count: number;
  bath_count: number;
  balcony_count: number;
  floor_plan_image_url?: string;
  base_rate_per_sqft: number;
  floor_escalation_rate: number;
  facing_premium_rate: number;
  utility_connection_fee?: number;
  parking_charge?: number;
  max_discount_amount?: number;
  status_id?: string;
  is_landowner_share?: boolean;
}

export interface UnitUpdatePayload extends Partial<UnitCreatePayload> {}

export interface BulkUnitCreatePayload {
  project_id: number;
  tower_id: number;
  start_floor: number;
  end_floor: number;
  units_per_floor: number;
  unit_prefix?: string;
  unit_type_id: string;
  facing_id: string;
  net_carpet_area_sqft: number;
  gross_saleable_area_sqft: number;
  base_rate_per_sqft: number;
  floor_escalation_rate: number;
  facing_premium_rate: number;
  is_landowner_share_pattern?: string;
}

export interface PriceList {
  id: number;
  project_id: number;
  tower_id?: number;
  project_name?: string;
  version_code: string;
  title: string;
  base_rate_per_sqft: number;
  floor_escalation_rate: number;
  facing_premium_lake: number;
  facing_premium_south: number;
  facing_premium_corner: number;
  facing_premium_road: number;
  parking_standard_rate: number;
  parking_vip_rate: number;
  utility_connection_rate: number;
  min_selling_rate_per_sqft: number;
  max_discount_pct_exec: number;
  max_discount_pct_mgr: number;
  max_discount_pct_dir: number;
  effective_from?: string;
  effective_to?: string;
  status: 'ACTIVE' | 'DRAFT' | 'APPROVED' | 'ARCHIVED';
  approved_by?: string;
  notes?: string;
  created_at?: string;
}

export interface PriceListPagedResponse {
  items: PriceList[];
  total: number;
  limit: number;
  offset: number;
}

export interface PriceOverride {
  id: number;
  price_list_id?: number;
  project_id: number;
  unit_id: number;
  unit_number: string;
  customer_name: string;
  standard_price: number;
  negotiated_price: number;
  discount_amount: number;
  discount_pct: number;
  discount_authority_level: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by: string;
  approved_by?: string;
  justification?: string;
  created_at?: string;
}

export interface PriceOverridePagedResponse {
  items: PriceOverride[];
  total: number;
  limit: number;
  offset: number;
}

export interface PriceChangeAudit {
  id: number;
  price_list_id?: number;
  project_id?: number;
  unit_id?: number;
  unit_number?: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  reason?: string;
  effective_date?: string;
  created_at?: string;
}

export interface PriceAuditPagedResponse {
  items: PriceChangeAudit[];
  total: number;
  limit: number;
  offset: number;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  project_id: number;
  price_list_id?: number;
  unit_id?: number;
  unit_code?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  chargeable_area_sqft: number;
  rate_per_sqft: number;
  base_apartment_price: number;
  parking_charge: number;
  discount_pct: number;
  discount_amount: number;
  net_total_price: number;
  valid_until?: string;
  status: 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'EXPIRED';
  prepared_by: string;
  notes?: string;
  created_at?: string;
}

export interface QuotationPagedResponse {
  items: Quotation[];
  total: number;
  limit: number;
  offset: number;
}

export interface PricingCalculationResult {
  chargeable_area_sqft: number;
  price_per_sqft: number;
  base_apartment_price: number;
  parking_price: number;
  discount_pct: number;
  discount_amount: number;
  net_apartment_price: number;
  utility_fee: number;
  illustrative_total_price: number;
}

export interface UnitReservation {
  id: number;
  unit_id: number;
  unit_number: string;
  project_id: number;
  customer_name: string;
  customer_phone: string;
  customer_nid_passport?: string;
  sales_agent_name: string;
  reservation_token: string;
  reserved_at: string;
  expires_at: string;
  duration_minutes: number;
  remaining_seconds: number;
  hold_deposit_amount: number;
  conditions?: string;
  status: 'ACTIVE_HOLD' | 'CONFIRMED_BOOKING' | 'RELEASED' | 'EXPIRED' | 'CANCELLED';
  approved_by?: string;
  release_reason?: string;
  released_at?: string;
  released_by?: string;
  created_at?: string;
}

export interface ReservationPagedResponse {
  items: UnitReservation[];
  total: number;
  limit: number;
  offset: number;
}

export interface UnitStatusHistory {
  id: number;
  unit_id: number;
  unit_number: string;
  project_id: number;
  from_status: string;
  to_status: string;
  transition_type: string;
  initiated_by: string;
  authorized_by?: string;
  reason?: string;
  transitioned_at: string;
}

export interface StatusHistoryPagedResponse {
  items: UnitStatusHistory[];
  total: number;
  limit: number;
  offset: number;
}

export interface AvailabilitySummary {
  total_units: number;
  available: number;
  reserved: number;
  booked: number;
  sold: number;
  blocked: number;
  landowner_allocated: number;
  under_construction: number;
  handed_over: number;
  cancelled: number;
}

export type FacilityCategory = 'SEPARATELY_SALEABLE' | 'COMMON_FACILITY';
export type FacilityType = 
  | 'PARKING_BASEMENT' 
  | 'PARKING_GROUND' 
  | 'PARKING_COVERED' 
  | 'PARKING_OPEN' 
  | 'MOTORCYCLE_BAY' 
  | 'STORAGE_ROOM' 
  | 'ROOFTOP_FACILITY' 
  | 'COMMUNITY_SPACE' 
  | 'COMMERCIAL_SIGNAGE' 
  | 'OTHER';

export interface FacilityItem {
  id: number;
  project_id: number;
  slot_number: string;
  facility_category: FacilityCategory;
  facility_type: FacilityType;
  floor_level: string;
  size_sqft: number;
  location_description?: string;
  status: 'AVAILABLE' | 'RESERVED' | 'ALLOCATED' | 'BLOCKED' | 'SOLD';
  unit_id?: number;
  unit_number?: string;
  customer_id?: number;
  allocated_customer_name?: string;
  contract_reference?: string;
  allocation_type?: 'DEVELOPER_SALE' | 'LANDOWNER_ENTITLEMENT' | 'TENANT_ALLOCATION' | 'COMMON_AMENITY';
  allocated_at?: string;
  allocated_by?: string;
  price: number;
  package_price?: number;
  allows_shared_entitlement: boolean;
  remarks?: string;
}

export interface FacilitySummary {
  total_facilities: number;
  available: number;
  allocated: number;
  reserved: number;
  blocked: number;
  total_parking: number;
  available_parking: number;
  total_storage: number;
  available_storage: number;
  total_commercial_signage: number;
  common_facilities_count: number;
  separately_saleable_count: number;
}

export interface FacilityPagedResponse {
  items: FacilityItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface FacilityTransferLog {
  id: number;
  facility_id: number;
  slot_number: string;
  from_customer_id?: number;
  from_customer_name?: string;
  from_contract_ref?: string;
  to_customer_id?: number;
  to_customer_name?: string;
  to_contract_ref?: string;
  transfer_fee: number;
  reason?: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  transferred_at: string;
}

export interface FacilityTransferPagedResponse {
  items: FacilityTransferLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface FacilityAssignmentPayload {
  unit_id?: number;
  customer_id?: number;
  allocated_customer_name?: string;
  contract_reference?: string;
  allocation_type?: string;
  package_price?: number;
  remarks?: string;
}

export interface FacilityTransferPayload {
  facility_id: number;
  to_customer_id?: number;
  to_customer_name: string;
  to_contract_ref: string;
  transfer_fee?: number;
  reason: string;
}

export interface ProposedUnitMergePayload {
  project_id: number;
  source_unit_ids: number[];
  combined_unit_number: string;
  combined_floor_number: number;
  combined_gross_sft?: number;
  combined_net_sft?: number;
  revised_price?: number;
  technical_approval_by: string;
  commercial_approval_by: string;
  legal_approval_by: string;
  drawing_attachment_url?: string;
  remarks?: string;
}

export interface ProposedChildUnitSpec {
  unit_number: string;
  gross_saleable_area_sqft: number;
  net_carpet_area_sqft: number;
  unit_type_id: string;
  facing_id: string;
  bed_count: number;
  bath_count: number;
  balcony_count: number;
  base_rate_per_sqft: number;
  total_unit_price: number;
}

export interface ProposedUnitSplitPayload {
  parent_unit_id: number;
  child_units: ProposedChildUnitSpec[];
  regulatory_approval_ref?: string;
  measurement_tolerance_notes?: string;
  technical_approval_by: string;
  commercial_approval_by: string;
  legal_approval_by: string;
  drawing_attachment_url?: string;
}

export interface CombinationLogItem {
  id: number;
  action_type: 'MERGE' | 'SPLIT';
  project_id: number;
  source_unit_ids?: string;
  resulting_unit_ids?: string;
  technical_approval_by?: string;
  commercial_approval_by?: string;
  legal_approval_by?: string;
  regulatory_approval_ref?: string;
  drawing_attachment_url?: string;
  measurement_reconciliation_notes?: string;
  status: string;
  reason?: string;
  created_at: string;
}

export interface CombinationLogPagedResponse {
  items: CombinationLogItem[];
  total: number;
  limit: number;
  offset: number;
}

// Spec 3.6: Floor plans, property images and documents
export type PropertyDocumentType = 
  | 'PROJECT_BROCHURE'
  | 'APPROVED_FLOOR_PLAN'
  | 'TOWER_LAYOUT'
  | 'FLOOR_LAYOUT'
  | 'INDIVIDUAL_UNIT_PLAN'
  | 'UNIT_PHOTOGRAPH'
  | 'SAMPLE_INTERIOR_IMAGE'
  | 'ARCHITECTURAL_SPEC'
  | 'ENGINEERING_SPEC'
  | 'AREA_MEASUREMENT_SHEET'
  | 'FINISHING_FIXTURE_SCHEDULE'
  | 'PARKING_LAYOUT'
  | 'APPROVAL_CERTIFICATE';

export type PropertyDocumentVisibility = 
  | 'PUBLIC_SALES_PORTAL'
  | 'INTERNAL_SALES_AGENT'
  | 'RESTRICTED_CONFIDENTIAL';

export interface PropertyDocumentItem {
  id: number;
  project_id: number;
  tower_id?: number;
  floor_number?: number;
  unit_id?: number;
  document_type: PropertyDocumentType;
  title: string;
  file_url: string;
  thumbnail_url?: string;
  file_size_kb: number;
  file_extension: string;
  mime_type: string;
  version_tag: string;
  is_superseded: boolean;
  superseded_by_id?: number;
  superseded_at?: string;
  visibility: PropertyDocumentVisibility;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  approved_at?: string;
  uploader_id?: number;
  uploader_name: string;
  tags?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyDocumentPagedResponse {
  items: PropertyDocumentItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PropertyDocumentSummary {
  total_documents: number;
  approved_floor_plans: number;
  unit_plans: number;
  unit_photographs: number;
  interior_renders: number;
  technical_specs: number;
  public_sales_portal_count: number;
  restricted_confidential_count: number;
  superseded_archive_count: number;
}

export interface PropertyDocumentCreatePayload {
  project_id: number;
  tower_id?: number;
  floor_number?: number;
  unit_id?: number;
  document_type: string;
  title: string;
  file_url: string;
  thumbnail_url?: string;
  file_size_kb?: number;
  file_extension?: string;
  mime_type?: string;
  version_tag?: string;
  visibility?: string;
  uploader_name?: string;
  tags?: string;
  notes?: string;
}

export interface PropertyDocumentUpdatePayload {
  title?: string;
  document_type?: string;
  tower_id?: number;
  floor_number?: number;
  unit_id?: number;
  visibility?: string;
  tags?: string;
  notes?: string;
}

export interface PropertyDocumentSupersedePayload {
  new_version_tag: string;
  new_file_url: string;
  new_thumbnail_url?: string;
  new_file_size_kb?: number;
  new_file_extension?: string;
  new_mime_type?: string;
  reason?: string;
}

export interface PropertyDocumentApprovePayload {
  approval_status: 'APPROVED' | 'REJECTED';
  approved_by: string;
  visibility?: string;
  notes?: string;
}




