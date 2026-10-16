export interface Unit {
  id: number;
  project_id: number;
  tower_id: number;
  floor_number: number;
  unit_number: string;
  unit_type_id: string; // TYPE_3BHK, TYPE_4BHK, PENTHOUSE, DUPLEX
  facing_id: string; // SOUTH_FACING, NORTH_FACING, LAKE_VIEW, CORNER_PLOT, ROAD_FACING
  net_carpet_area_sqft: number;
  gross_saleable_area_sqft: number;
  base_rate_per_sqft: number;
  floor_escalation_rate: number;
  facing_premium_rate: number;
  effective_rate_per_sqft: number;
  total_unit_price: number;
  status_id: 'AVAILABLE' | 'ON_HOLD' | 'BOOKED' | 'SOLD' | 'LANDOWNER_SHARE';
  is_landowner_share: boolean;
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
