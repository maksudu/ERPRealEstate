export interface Subcontractor {
  id: number;
  contractor_code: string;
  company_name: string;
  trade_specialization: string;
  contact_person: string;
  primary_phone: string;
  tin_number?: string | null;
  bin_number?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface LaborMuster {
  id?: number;
  dpr_id: number;
  contractor_id?: number | null;
  contractor_name?: string | null;
  trade_category: string;
  worker_count: number;
  daily_wage_rate: number;
  total_wage: number;
  created_at?: string;
}

export interface WBSNode {
  id: number;
  project_id: number;
  tower_id?: number | null;
  parent_id?: number | null;
  node_code: string;
  node_name: string;
  wbs_tier: 'PHASE' | 'SUB_PHASE' | 'ACTIVITY' | 'TASK' | string;
  phase_category: 'SUBSTRUCTURE' | 'SUPERSTRUCTURE' | 'FINISHING' | 'MEP' | string;
  activity_type?: string | null;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  progress_percentage: number;
  weightage_percentage: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'CRITICAL_PATH' | string;
  responsible_engineer?: string | null;
  remarks?: string | null;
  created_at?: string;
  children?: WBSNode[];
}

export interface BOQItemBudgetLock {
  id: number;
  project_id: number;
  tower_id?: number | null;
  wbs_node_id?: number | null;
  wbs_phase_id: string;
  material_category_id: string;
  item_code?: string | null;
  item_description: string;
  unit_of_measure_id: string;
  estimated_quantity: number;
  estimated_unit_rate: number;
  total_estimated_cost: number;
  actual_consumed_quantity: number;
  requisitioned_quantity: number;
  variation_order_quantity: number;
  hard_lock_percentage: number;
  allowable_quantity?: number;
  variance_percentage?: number;
  is_locked: boolean;
  created_at?: string;
}

export interface VariationOrder {
  id: number;
  project_id: number;
  boq_item_id: number;
  vo_number: string;
  additional_quantity: number;
  revised_rate?: number | null;
  additional_budget: number;
  reason: string;
  approved_by_pm?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  approval_date?: string | null;
  created_at?: string;
}

export interface JointMeasurementSheet {
  id: number;
  work_order_id: number;
  wbs_node_id?: number | null;
  jms_number: string;
  measurement_date: string;
  location_floor: string;
  trade_item: string;
  unit_of_measure: string;
  measured_length: number;
  measured_breadth: number;
  measured_depth: number;
  measured_quantity: number;
  unit_rate: number;
  total_amount: number;
  verified_by_site_engineer: string;
  subcontractor_representative: string;
  status: 'DRAFT' | 'VERIFIED_BY_ENGINEER' | 'BILLED' | string;
  ra_bill_id?: number | null;
  created_at?: string;
}

export interface DPRReport {
  id: number;
  project_id: number;
  project_name?: string | null;
  tower_id?: number | null;
  tower_name?: string | null;
  wbs_node_id?: number | null;
  report_date: string;
  weather_condition_id: string;
  site_engineer_id?: number | null;
  site_engineer_name?: string | null;
  structural_activity_summary: string;
  floor_unit_location?: string | null;
  machinery_deployed?: string | null;
  site_photos?: { url: string; caption?: string }[];
  safety_incident_logged: boolean;
  safety_incident_notes?: string | null;
  concrete_casting_cft: number;
  steel_rod_consumed_mt: number;
  cement_consumed_bags: number;
  total_workers_onsite: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED_BY_PM' | string;
  labor_entries: LaborMuster[];
  created_at?: string;
}

export interface WorkOrder {
  id: number;
  project_id: number;
  project_name?: string | null;
  contractor_id: number;
  contractor_name?: string | null;
  work_order_no: string;
  contract_type: string;
  total_contract_value: number;
  retention_money_percent: number;
  defect_liability_months: number;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | string;
  scope_of_work?: string | null;
  created_at?: string;
}

export interface SignatureChainItem {
  role: string;
  title: string;
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | string;
  signed_by?: string | null;
  signed_at?: string | null;
  notes?: string | null;
}

export interface RABill {
  id: number;
  work_order_id: number;
  work_order_no?: string | null;
  project_name?: string | null;
  contractor_name?: string | null;
  ra_bill_number: string;
  bill_date: string;
  billing_period_start?: string | null;
  billing_period_end?: string | null;
  gross_work_certified_amount: number;
  retention_percent?: number;
  retention_money_deducted: number;
  advance_recovery_deducted: number;
  material_store_recovery_amount?: number;
  tds_rate?: number;
  tds_withheld_amount: number;
  vds_rate?: number;
  vds_withheld_amount: number;
  net_payable_amount: number;
  approval_signature_chain?: SignatureChainItem[];
  status: 'DRAFT' | 'VERIFIED_BY_ENGINEER' | 'VERIFIED_BY_QS' | 'APPROVED_BY_PD' | 'ACCOUNTS_VOUCHER_POSTED' | 'REJECTED' | string;
  accounts_journal_voucher_ref?: string | null;
  remarks?: string | null;
  created_at?: string;
}

export interface ConstructionMetrics {
  total_dpr_logged: number;
  cumulative_concrete_cft: number;
  cumulative_rebar_mt: number;
  total_active_work_orders: number;
  total_ra_bills_certified: number;
  total_net_payable_certified: number;
}

export interface ConcreteCubeTest {
  id: number;
  project_id: number;
  project_name?: string | null;
  tower_id?: number | null;
  tower_name?: string | null;
  structural_element: string;
  casting_date: string;
  design_compressive_strength_psi: number;
  concrete_grade: string;
  batching_plant_name: string;
  slump_test_mm: number;
  day7_testing_date?: string | null;
  day7_strength_psi?: number | null;
  day7_status?: 'DUE' | 'COMPLETED' | 'UPCOMING';
  day14_testing_date?: string | null;
  day14_strength_psi?: number | null;
  day14_status?: 'DUE' | 'COMPLETED' | 'UPCOMING';
  day28_testing_date?: string | null;
  day28_strength_psi?: number | null;
  day28_status?: 'DUE' | 'COMPLETED' | 'UPCOMING';
  test_verdict: 'PENDING' | 'PENDING_DAY28' | 'WARNING_LOW_STRENGTH' | 'PASSED' | 'FAILED';
  lab_test_report_url?: string | null;
  remarks?: string | null;
  created_at?: string;
}

export interface CubeTestNotificationAlert {
  test_id: number;
  project_id: number;
  project_name: string;
  structural_element: string;
  casting_date: string;
  test_milestone: 'Day 7' | 'Day 14' | 'Day 28';
  scheduled_test_date: string;
  days_remaining: number;
  alert_level: 'TODAY' | 'OVERDUE' | 'UPCOMING_48H';
  design_strength_psi: number;
}

export interface SafetyNCR {
  id: number;
  project_id: number;
  project_name?: string | null;
  ncr_number: string;
  category: 'Structural Defect' | 'Honeycombing' | 'Cover Missing' | 'Safety Violation' | string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description?: string | null;
  location_details?: string | null;
  photo_url?: string | null;
  assigned_contractor_id?: number | null;
  contractor_name?: string | null;
  rectification_deadline: string;
  status: 'Open' | 'Rectified' | 'Verified_Closed';
  rectification_notes?: string | null;
  rectification_photo_url?: string | null;
  closed_date?: string | null;
  is_overdue?: boolean;
  created_at?: string;
}
