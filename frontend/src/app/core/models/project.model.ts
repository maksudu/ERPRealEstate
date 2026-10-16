export interface Tower {
  id: number;
  project_id: number;
  tower_code: string;
  tower_name: string;
  basement_floors: number;
  residential_floors: number;
  commercial_floors: number;
  total_lifts: number;
  created_at?: string;
}

export interface AuthorityClearance {
  id: number;
  project_id: number;
  clearance_type_id: string; // LUC, BUILDING_PLAN, FIRE_NOC, AVIATION_HEIGHT, ENVIRONMENTAL, WASA
  application_memo_no?: string;
  approved_memo_no?: string;
  approval_date?: string;
  expiry_date?: string;
  status: 'NOT_APPLIED' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  document_url?: string;
  remarks?: string;
  created_at?: string;
}

export interface BOQItem {
  id: number;
  project_id: number;
  tower_id?: number;
  wbs_phase_id: string; // SUB_STRUCTURE, PILING, SUPER_STRUCTURE, BRICK_WORK, FINISHING, MEP
  material_category_id: string; // REBAR_500W, CEMENT_OPC, SAND_FM_2_5, STONE_CHIPS, BRICKS_AUTO, CERAMIC_TILES
  item_description: string;
  unit_of_measure_id: string; // TON, BAG, CFT, THOUSAND_NOS, SQFT
  estimated_quantity: number;
  estimated_unit_rate: number;
  total_estimated_cost: number;
  actual_consumed_quantity: number;
  created_at?: string;
}

export interface Drawing {
  id: number;
  project_id: number;
  drawing_category_id: string;
  drawing_number: string;
  drawing_title: string;
  revision_number: string; // R0, R1, R2...
  is_approved_for_construction: boolean;
  approved_by?: string;
  approval_date?: string;
  file_url?: string;
  revision_notes?: string;
  created_at?: string;
}

export interface Project {
  id: number;
  land_bank_id?: number;
  project_code: string;
  project_name: string;
  development_authority_id: string; // RAJUK, CDA, KDA, RDA
  far_allocated: number;
  mgc_percent: number;
  road_width_feet: number;
  plot_area_sqft: number;
  total_builtup_area_sqft: number;
  total_saleable_area_sqft: number;
  planned_handover_date?: string;
  status: 'PLANNING' | 'PERMIT_PENDING' | 'UNDER_CONSTRUCTION' | 'HANDOVER_PHASE' | 'COMPLETED';
  description?: string;
  towers?: Tower[];
  clearances?: AuthorityClearance[];
  boq_items?: BOQItem[];
  drawings?: Drawing[];
  created_at?: string;
  updated_at?: string;
}

export interface FARCalculationResult {
  plot_area_sqft: number;
  plot_katha: number;
  road_width_feet: number;
  occupancy_type: string;
  permissible_far: number;
  mgc_percent: number;
  max_ground_coverage_sqft: number;
  max_permissible_builtup_sqft: number;
  estimated_saleable_sqft: number;
  regulatory_code: string;
}
