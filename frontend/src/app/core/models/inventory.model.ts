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
  status_id: 'AVAILABLE' | 'ON_HOLD' | 'RESERVED' | 'BOOKED' | 'SOLD' | 'LANDOWNER_SHARE' | 'RETAINED' | 'BLOCKED';
  is_landowner_share: boolean;
  is_merged?: boolean;
  merged_into_unit_id?: number;
  parent_unit_id?: number;
  combination_type?: string;
  current_locked_by_user_id?: number;
  current_locked_by_user_name?: string;
  lock_expires_at?: string;
  lock_remaining_seconds?: number;
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
