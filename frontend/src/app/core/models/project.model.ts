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

export interface AuthorityClearanceCondition {
  id: number;
  clearance_id: number;
  condition_code: string;
  condition_title: string;
  condition_category: string;
  mandatory_level: string;
  compliance_status: string;
  compliance_date?: string;
  verified_by_officer?: string;
  evidence_doc_url?: string;
  remarks?: string;
  created_at?: string;
}

export interface AuthorityClearance {
  id: number;
  project_id: number;
  project_name?: string;
  project_code?: string;
  reference_no?: string;
  clearance_type_id: string; // LUC, BUILDING_PLAN, FIRE_NOC, AVIATION_HEIGHT, ENVIRONMENTAL, WASA, DESCO_DPDC, OCCUPANCY_CERT
  approval_category?: string;
  authority_name: string; // RAJUK, CDA, KDA, RDA, DoE, FSCD, CAAB, WASA, DESCO_DPDC, TITAS_GAS
  application_memo_no?: string;
  approved_memo_no?: string;
  submission_date?: string;
  approval_date?: string;
  expiry_date?: string;
  validity_months?: number;
  renewal_reminder_days?: number;
  renewal_fee_bdt?: number;
  renewal_alert_status?: string;
  sanctioned_floors?: string;
  sanctioned_height_m?: number;
  responsible_officer?: string;
  contact_officer_name?: string;
  contact_officer_phone?: string;
  next_action?: string;
  status: 'DRAFT' | 'NOT_APPLIED' | 'SUBMITTED' | 'QUERY_RAISED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'RENEWAL_PENDING';
  document_url?: string;
  remarks?: string;
  conditions?: AuthorityClearanceCondition[];
  created_at?: string;
  updated_at?: string;
}

export interface AuthorityClearancePaginationResponse {
  items: AuthorityClearance[];
  total: number;
  limit: number;
  offset: number;
  approved_count: number;
  submitted_count: number;
  expired_count: number;
  compliance_adherence_pct: number;
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

export interface ProjectSiteOffice {
  office_name: string;
  site_address: string;
  engineer_in_charge?: string;
  contact_phone?: string;
}

export interface ProjectDocumentItem {
  doc_id?: string;
  title: string;
  doc_type: string;
  file_url?: string;
  upload_date?: string;
  uploaded_by?: string;
  file_size_kb?: number;
}

export interface ProjectStatusHistoryEntry {
  from_status?: string;
  to_status: string;
  changed_at: string;
  note?: string;
  changed_by?: string;
}

export interface Project {
  id: number;
  land_bank_id?: number;
  parcel_id?: number;
  project_code: string;
  project_name: string;
  project_name_bn?: string;
  company_name?: string;
  project_type?: string;
  project_category?: string;
  project_ownership?: 'OWNED' | 'JOINT_VENTURE' | 'PARTNERSHIP' | string;
  
  division?: string;
  district?: string;
  thana_upazila?: string;
  locality?: string;
  site_address?: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  
  project_manager?: string;
  project_director?: string;
  department?: string;
  project_team_structure?: any;
  site_offices?: ProjectSiteOffice[];
  development_authority_id: string; // RAJUK, CDA, KDA, RDA
  
  total_land_area_katha?: number;
  total_land_area_decimal?: number;
  total_land_area_sqft?: number;
  far_allocated: number;
  mgc_percent: number;
  road_width_feet: number;
  plot_area_sqft: number;
  total_builtup_area_sqft: number;
  total_saleable_area_sqft: number;
  planned_construction_area_sqft?: number;
  
  project_start_date?: string;
  target_completion_date?: string;
  actual_start_date?: string;
  revised_completion_date?: string;
  project_duration_months?: number;
  planned_handover_date?: string;
  
  project_funding_source?: string;
  cost_center_code?: string;
  financial_year?: string;
  estimated_budget_bdt?: number;
  approved_budget_bdt?: number;
  target_customer_segment?: string;
  project_scope?: string;
  
  status: 'DRAFT' | 'FEASIBILITY' | 'UNDER_REVIEW' | 'APPROVED' | 'PLANNING' | 'UNDER_CONSTRUCTION' | 'ON_HOLD' | 'COMPLETED' | 'CLOSED' | 'ACTIVE' | 'PROPOSED' | string;
  approval_status?: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | string;
  project_phase?: string;
  land_parcel_ids?: number[];
  landowner_ids?: number[];
  status_history?: ProjectStatusHistoryEntry[];
  project_documents?: ProjectDocumentItem[];
  description?: string;
  towers?: Tower[];
  clearances?: AuthorityClearance[];
  boq_items?: BOQItem[];
  drawings?: Drawing[];
  created_at?: string;
  updated_at?: string;
}

export interface ProjectFeasibility {
  id: number;
  project_id: number;
  project_name?: string;
  project_code?: string;
  feasibility_code: string;
  title: string;
  version_label: string;
  
  land_acquisition_cost: number;
  legal_and_vetting_expenses: number;
  preliminary_arch_engineering_cost: number;
  estimated_construction_cost: number;
  infrastructure_and_site_dev: number;
  utility_connection_expenses: number;
  professional_authority_fees: number;
  financing_and_interest_cost: number;
  contingency_reserve: number;
  
  proposed_building_height_meters: number;
  proposed_floor_count: number;
  proposed_unit_count: number;
  total_saleable_area_sqft: number;
  
  landowner_jv_sharing_ratio: string;
  developer_share_sqft: number;
  landowner_share_sqft: number;
  
  estimated_apartment_sales_revenue: number;
  estimated_commercial_sales_revenue: number;
  estimated_parking_sales_revenue: number;
  estimated_other_sales_revenue: number;
  
  estimated_gross_revenue: number;
  estimated_total_cost: number;
  gross_project_profit: number;
  operating_profit: number;
  net_profit_after_tax: number;
  profit_margin_percent: number;
  roi_percent: number;
  
  cash_flow_forecast?: any;
  scenario_models?: any;
  
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
  reviewed_by?: string;
  review_date?: string;
  review_remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectMetaOptions {
  land_banks: { value: number; label: string; subLabel: string; katha: number; decimal: number; sqft: number; thana: string; district: string }[];
  parcels?: { value: number; label: string; subLabel: string; decimal: number; sqft: number; mouza: string; status: string }[];
  landowners?: { value: number; label: string; subLabel: string }[];
  companies: { value: string; label: string; subLabel: string }[];
  project_types: { value: string; label: string; subLabel: string }[];
  project_categories: { value: string; label: string; subLabel: string }[];
  project_ownerships?: { value: string; label: string; subLabel: string }[];
  project_phases?: { value: string; label: string; subLabel: string }[];
  lifecycle_statuses?: { value: string; label: string; subLabel: string }[];
  divisions?: { value: string; label: string }[];
  funding_sources: { value: string; label: string; subLabel: string }[];
  departments: { value: string; label: string }[];
  project_managers: { value: string; label: string; subLabel: string }[];
  project_directors: { value: string; label: string; subLabel: string }[];
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

// ----------------------------------------------------------------------------
// Submodule 2.6: Estimated Profitability and ROI
// ----------------------------------------------------------------------------
export interface ProjectProfitability {
  id: number;
  project_id: number;
  project_name?: string;
  project_code?: string;
  forecast_code: string;
  version_label: string;
  calculation_date?: string;

  // Revenue estimates by saleable inventory
  apartment_revenue_est: number;
  shop_revenue_est: number;
  office_revenue_est: number;
  parking_revenue_est: number;
  other_revenue_est: number;
  total_estimated_revenue: number;

  // Landowner and developer shares for Joint Venture
  jv_sharing_ratio: string;
  developer_share_pct: number;
  landowner_share_pct: number;
  developer_revenue_share_bdt: number;
  landowner_revenue_share_bdt: number;

  // Cost Estimates
  construction_cost_est: number;
  consultant_fee_est: number;
  marketing_sales_cost_est: number;
  admin_overhead_est: number;
  financing_interest_cost_est: number;
  contingency_cost_est: number;
  total_project_cost_est: number;

  // Defined Investment Base & ROI
  defined_investment_base_type: 'TOTAL_PROJECT_INVESTMENT' | 'EQUITY_INVESTED';
  defined_investment_base_bdt: number;
  estimated_project_profit: number;
  gross_profit_margin_pct: number;
  breakeven_sales_revenue: number;
  breakeven_units_sqft: number;
  roi_pct: number;

  // Actual vs Estimated
  recognized_revenue: number;
  recognized_project_expenses: number;
  actual_project_profit: number;
  actual_roi_pct: number;
  committed_costs: number;
  posted_expenses: number;
  cost_to_complete_forecast: number;
  revised_completion_date?: string;

  // Scenario Modeling
  scenario_price_increase_pct: number;
  scenario_sales_delay_months: number;
  scenario_cost_overrun_pct: number;
  scenario_modeled_profit_bdt: number;
  scenario_modeled_roi_pct: number;

  collection_schedule_json?: any[];

  status: 'DRAFT' | 'ACTIVE_FORECAST' | 'ARCHIVED';
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectProfitabilityPaginationResponse {
  items: ProjectProfitability[];
  total: number;
  limit: number;
  offset: number;
  portfolio_projected_revenue_bdt: number;
  portfolio_net_profit_bdt: number;
  average_roi_pct: number;
}

export interface ProfitabilitySimulationRequest {
  total_revenue_bdt: number;
  total_cost_bdt: number;
  defined_investment_base_bdt: number;
  price_increase_pct: number;
  sales_delay_months: number;
  cost_overrun_pct: number;
}

export interface ProfitabilitySimulationResponse {
  base_profit_bdt: number;
  base_roi_pct: number;
  modeled_revenue_bdt: number;
  modeled_cost_bdt: number;
  modeled_profit_bdt: number;
  modeled_roi_pct: number;
  modeled_margin_pct: number;
  breakeven_revenue_bdt: number;
}

// ----------------------------------------------------------------------------
// Submodule 2.7: Project Timeline and Milestone Tracking
// ----------------------------------------------------------------------------
export interface ProjectMilestone {
  id: number;
  project_id: number;
  project_name?: string;
  project_code?: string;
  milestone_code: string;
  milestone_number: number;
  milestone_name: string;
  standard_milestone_ref?: string;
  category: string;

  planned_start_date: string;
  planned_finish_date: string;
  baseline_start_date?: string;
  baseline_finish_date?: string;
  actual_start_date?: string;
  actual_finish_date?: string;

  assigned_department?: string;
  contractor_id?: number;
  contractor_name?: string;
  responsible_person?: string;
  supervisor_name?: string;

  predecessor_ids?: number[];
  is_critical_path: boolean;
  weightage_percent: number;

  physical_progress_pct: number;
  financial_progress_pct: number;

  delay_days: number;
  delay_reason?: string;
  recovery_plan?: string;
  escalation_level: 'NONE' | 'LOW' | 'MEDIUM' | 'CRITICAL';

  supervisor_verification: 'PENDING' | 'VERIFIED' | 'REJECTED';
  evidence_attachment_url?: string;

  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectMilestonePaginationResponse {
  items: ProjectMilestone[];
  total: number;
  limit: number;
  offset: number;
  completed_count: number;
  critical_path_count: number;
  overall_physical_progress_pct: number;
  overall_financial_progress_pct: number;
}

// --------------------------------------------------------------------------
// Submodule 2.9: Architectural Drawings & Document Management Models
// --------------------------------------------------------------------------
export interface DrawingRevision {
  id?: number;
  drawing_id?: number;
  revision_number: string;
  revision_date?: string;
  author?: string;
  file_url?: string;
  file_name?: string;
  file_size_mb?: number;
  action_type: string;
  change_summary?: string;
  approved_by?: string;
  created_at?: string;
}

export interface Drawing {
  id: number;
  project_id: number;
  project_name?: string;
  project_code?: string;
  tower_id?: number;
  tower_name?: string;
  approval_clearance_id?: number;
  clearance_memo?: string;

  drawing_category_id: string;
  drawing_number: string;
  drawing_title: string;
  discipline: string;
  revision_number: string;

  floor_level?: string;
  construction_package?: string;
  author?: string;
  issue_date?: string;

  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED_FOR_CONSTRUCTION' | 'SUPERSEDED' | 'AS_BUILT' | string;
  is_approved_for_construction: boolean;
  is_superseded: boolean;
  superseded_by_id?: number;
  superseded_date?: string;

  approved_by?: string;
  approval_date?: string;

  file_url?: string;
  file_name?: string;
  file_size_mb?: number;
  file_type?: string;

  is_confidential: boolean;
  access_role: string;
  download_count: number;
  revision_notes?: string;

  revisions?: DrawingRevision[];
  created_at?: string;
  updated_at?: string;
}

export interface DrawingPaginationResponse {
  items: Drawing[];
  total: number;
  limit: number;
  offset: number;
  ifc_count: number;
  under_review_count: number;
  superseded_count: number;
  as_built_count: number;
  confidential_count: number;
}

// --------------------------------------------------------------------------
// Submodule 2.13: Project-wise Profit & Loss (Financial Performance) Models
// --------------------------------------------------------------------------
export interface ProjectFinancialPerformance {
  id: number;
  project_id: number;
  project_name?: string;
  project_code?: string;
  cost_center_code: string;
  fiscal_year: string;
  period_type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUMULATIVE_TO_DATE' | string;
  period_name: string;

  // 1. Revenue Recognition vs Collections
  recognized_revenue: number; // POC recognized revenue
  customer_advances_collected: number; // Actual cash collected from buyers
  unearned_revenue: number;
  receivables_due: number;

  // 2. Direct Costs Incurred (Cost of Sales)
  land_cost_allocated: number;
  construction_materials_cost: number;
  consultants_direct_cost: number;
  total_cost_of_sales: number;

  // 3. Gross Project Profit
  gross_project_profit: number;
  gross_profit_margin_pct: number;

  // 4. Operating Expenses & Overheads
  allocated_operating_expenses: number;
  operating_profit_ebit: number;

  // 5. Financing Expenses
  financing_expenses: number;
  bank_loan_drawn: number;
  bank_loan_outstanding: number;

  // 6. Bottom-Line Profit
  profit_before_tax_pbt: number;
  estimated_income_tax: number;
  net_profit_after_tax: number;
  net_profit_margin_pct: number;
  roi_percent: number;

  // 7. Cash Disbursements vs Certified Work
  contractor_payments_made: number;
  contractor_work_certified: number;
  outstanding_contractor_payable: number;

  // 8. Forecast & EAC
  committed_cost: number;
  forecast_cost_to_complete_etc: number;
  estimate_at_completion_eac: number;
  original_feasibility_profit: number;
  variance_from_feasibility: number;

  // 9. JV Allocation
  landowner_share_pct: number;
  developer_share_pct: number;
  landowner_revenue_share: number;
  developer_revenue_share: number;
  developer_net_pbt: number;

  status: 'PROVISIONAL' | 'AUDITED' | 'FINAL_CLOSURE' | string;
  prepared_by?: string;
  approved_by?: string;
  approval_date?: string;
  notes?: string;

  created_at?: string;
  updated_at?: string;
}

export interface ProjectFinancialPerformancePaginationResponse {
  items: ProjectFinancialPerformance[];
  total: number;
  limit: number;
  offset: number;
  total_recognized_revenue: number;
  total_customer_collections: number;
  total_gross_profit: number;
  total_pbt: number;
  avg_gross_margin_pct: number;
  avg_pbt_margin_pct: number;
}

export interface ProjectPnLAnalyticsResponse {
  pnl_summary_table: any[];
  budget_vs_actual: any[];
  revenue_vs_collections: any[];
  direct_cost_breakdown: any[];
  committed_vs_forecast: any[];
  margin_metrics: any[];
  tower_unit_profitability: any[];
  jv_sharing_summary: any[];
  actual_vs_feasibility: any[];
}



