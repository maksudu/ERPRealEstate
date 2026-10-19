export interface Subcontractor {
  id: number;
  contractor_code: string;
  company_name: string;
  contractor_name?: string | null;
  legal_business_name?: string | null;
  trade_specialization: string;
  trade_category: string;
  contractor_type: string;
  parent_contractor_id?: number | null;
  parent_contractor_name?: string | null;

  contact_person: string;
  primary_phone: string;
  secondary_phone?: string | null;
  email?: string | null;
  office_address?: string | null;
  city?: string | null;
  authorized_rep_name?: string | null;
  authorized_rep_designation?: string | null;
  authorized_rep_phone?: string | null;
  authorized_rep_nid?: string | null;

  tin_number?: string | null;
  bin_number?: string | null;
  trade_license_number?: string | null;
  trade_license_expiry?: string | null;
  tax_circle?: string | null;

  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_routing_number?: string | null;
  payment_terms_days: number;

  iso_certification?: string | null;
  license_grade?: string | null;
  enlistment_category?: string | null;
  insurance_policy_number?: string | null;
  insurance_expiry_date?: string | null;
  insurance_coverage_amount: number;

  safety_compliant: boolean;
  safety_officer_name?: string | null;
  safety_incident_count: number;

  performance_rating: number;
  past_projects_count: number;
  experience_years: number;

  manpower_capacity: number;
  equipment_inventory?: string | null;
  site_supervisor_name?: string | null;
  site_supervisor_phone?: string | null;
  scope_boundaries?: string | null;
  duplicate_billing_protection: boolean;

  contract_start_date?: string | null;
  contract_expiry_date?: string | null;
  onboarding_status: string;
  completion_status: string;
  has_active_disputes: boolean;
  remarks?: string | null;
  is_active: boolean;

  rates_count?: number;
  disputes_count?: number;
  active_work_orders_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SubcontractorListResponse {
  items: Subcontractor[];
  total: number;
  limit: number;
  offset: number;
}

export interface ContractorMetrics {
  total_contractors: number;
  active_subcontractors: number;
  approved_enlisted: number;
  active_disputes_count: number;
  total_disputed_amount: number;
  avg_performance_rating: number;
}

export interface ContractorRate {
  id: number;
  contractor_id: number;
  project_id?: number | null;
  work_order_id?: number | null;
  item_code: string;
  trade_item_name: string;
  specification?: string | null;
  unit_of_measure: string;
  approved_unit_rate: number;
  scope_boundary_definition?: string | null;
  effective_start_date: string;
  effective_end_date?: string | null;
  is_active: boolean;
  contractor_name?: string | null;
  project_name?: string | null;
  created_at?: string;
}

export interface ContractorDispute {
  id: number;
  dispute_code: string;
  contractor_id: number;
  project_id: number;
  work_order_id?: number | null;
  dispute_category: string;
  dispute_title: string;
  description: string;
  claimed_amount: number;
  approved_deduction_amount: number;
  retention_held_amount: number;
  status: string;
  resolution_notes?: string | null;
  raised_by_user_id: number;
  raised_date: string;
  resolved_date?: string | null;
  resolved_by_user_id?: number | null;
  contractor_name?: string | null;
  project_name?: string | null;
  created_at?: string;
}

export interface ContractorFilter {
  search?: string;
  contractor_type?: string;
  trade_category?: string;
  onboarding_status?: string;
  completion_status?: string;
  has_disputes?: boolean;
  limit?: number;
  offset?: number;
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
  wbs_tier: string;
  phase_category: string;
  activity_type?: string | null;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  duration_days?: number;
  unit_of_measure?: string;
  planned_quantity?: number;
  verified_completed_quantity?: number;
  approved_total_quantity?: number;
  progress_measurement_method?: string;
  progress_percentage: number;
  weightage_percentage: number;
  earned_value?: number;
  planned_value?: number;
  status: string;
  baseline_start_date?: string | null;
  baseline_end_date?: string | null;
  baseline_duration_days?: number | null;
  schedule_revision_no?: number;
  is_critical_path?: boolean;
  is_milestone?: boolean;
  predecessor_node_id?: number | null;
  predecessor_code?: string | null;
  dependency_type?: string;
  lag_days?: number;
  contractor_id?: number | null;
  contractor_name?: string | null;
  responsible_engineer?: string | null;
  responsible_team?: string | null;
  delay_days?: number;
  delay_reason?: string | null;
  corrective_action?: string | null;
  weather_constraints?: string | null;
  site_constraints?: string | null;
  forecasted_end_date?: string | null;
  variance_days?: number;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
  children?: WBSNode[];
}

export interface WBSMetrics {
  project_id: number;
  project_name: string;
  total_activities: number;
  completed_activities: number;
  in_progress_activities: number;
  delayed_activities: number;
  critical_path_activities: number;
  milestones_count: number;
  overall_weighted_progress: number;
  total_planned_value: number;
  total_earned_value: number;
  schedule_performance_index: number;
  average_variance_days: number;
}

export interface ProjectCalendar {
  id?: number;
  project_id: number;
  calendar_name: string;
  working_days_per_week: number;
  weekly_off_days: string[];
  working_hours_per_day: number;
  shifts: { name: string; start_time: string; end_time: string; is_default?: boolean }[];
  holidays: { date: string; name: string }[];
  created_at?: string;
  updated_at?: string;
}

export interface ActivityDependency {
  id?: number;
  wbs_node_id: number;
  predecessor_node_id: number;
  dependency_type: string;
  lag_days: number;
  created_at?: string;
  predecessor_code?: string;
  predecessor_name?: string;
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
  specification?: string | null;
  unit_of_measure_id: string;

  // Rate components
  estimated_quantity: number;
  estimated_unit_rate: number;
  total_estimated_cost: number;
  material_rate?: number;
  labour_rate?: number;
  equipment_rate?: number;
  subcontract_rate?: number;

  // Lifecycle Stage & Baselines
  stage?: string;
  tender_quantity?: number;
  tender_unit_rate?: number;
  tender_total_amount?: number;
  contract_quantity?: number;
  contract_unit_rate?: number;
  contract_total_amount?: number;
  revised_quantity?: number;
  revised_unit_rate?: number;
  revised_total_amount?: number;

  // Actuals & Consumption
  actual_consumed_quantity: number;
  completed_quantity?: number;
  remaining_quantity?: number;
  requisitioned_quantity: number;
  variation_order_quantity: number;
  actual_cost?: number;
  cost_variance?: number;

  // Controls & Locks
  hard_lock_percentage: number;
  allowable_quantity?: number;
  variance_percentage?: number;
  is_locked: boolean;
  version_no?: number;
  approved_by?: string | null;
  approval_date?: string | null;
  rate_analysis_notes?: string | null;
  supporting_document_url?: string | null;

  // Joined metadata
  project_name?: string | null;
  tower_name?: string | null;
  wbs_node_code?: string | null;
  wbs_node_name?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface BOQMetrics {
  project_id: number;
  project_name: string;
  total_boq_items: number;
  total_estimated_amount: number;
  total_contract_amount: number;
  total_tender_amount: number;
  total_actual_cost: number;
  total_requisitioned_amount: number;
  total_variation_amount: number;
  total_locked_items: number;
  total_hard_locked_items: number;
  cost_variance_amount: number;
  cost_variance_percentage: number;
  component_breakdown: {
    MATERIAL: number;
    LABOUR: number;
    EQUIPMENT: number;
    SUBCONTRACT: number;
  };
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

export interface DPREquipmentRecord {
  equipment_name: string;
  qty: number;
  hours_operated: number;
  downtime_hours: number;
  downtime_reason?: string | null;
  status?: 'OPERATIONAL' | 'STANDBY' | 'BREAKDOWN' | string;
}

export interface DPRMaterialRecord {
  material_name: string;
  unit: string;
  received_qty: number;
  issued_qty: number;
  consumed_qty: number;
  wastage_qty: number;
}

export interface DPRBOQRecord {
  boq_item_id?: number;
  item_code: string;
  item_description: string;
  unit: string;
  completed_quantity: number;
  unit_rate?: number;
  wbs_node_id?: number | null;
}

export interface DPRReport {
  id: number;
  project_id: number;
  project_name?: string | null;
  tower_id?: number | null;
  tower_name?: string | null;
  wbs_node_id?: number | null;
  wbs_node_name?: string | null;
  report_date: string;
  weather_condition_id: string;
  site_engineer_id?: number | null;
  site_engineer_name?: string | null;
  supervisor_name?: string | null;

  report_number?: string | null;
  client_offline_uuid?: string | null;
  sync_status: 'SYNCED' | 'OFFLINE_DRAFT' | 'CONFLICT_DETECTED' | 'CONFLICT_RESOLVED' | string;
  conflict_detected: boolean;
  conflict_notes?: string | null;
  version_number: number;
  revision_history?: any[];

  // Geo-location & Photo Timestamps
  latitude?: number | null;
  longitude?: number | null;
  gps_accuracy_meters?: number | null;
  location_address?: string | null;
  location_verified: boolean;
  photo_timestamp?: string | null;

  // Activities & Scope
  structural_activity_summary: string;
  activities_planned?: string | null;
  activities_completed?: string | null;
  floor_unit_location?: string | null;
  boq_quantities_completed?: DPRBOQRecord[] | any;

  // Equipment Tracking
  machinery_deployed?: string | null;
  equipment_records?: DPREquipmentRecord[] | any;
  total_equipment_downtime_hours: number;

  // Materials & Quantities
  materials_summary?: DPRMaterialRecord[] | any;
  material_wastage_notes?: string | null;
  concrete_casting_cft: number;
  steel_rod_consumed_mt: number;
  cement_consumed_bags: number;

  // Inspection & QA
  inspection_requests?: string | null;
  quality_observations?: string | null;
  inspection_status: 'PENDING' | 'APPROVED_ON_SITE' | 'CONDITIONAL_APPROVAL' | 'REJECTED' | 'NCR_ISSUED' | string;

  // Constraints & Delays
  site_constraints?: string | null;
  delay_hours: number;
  delay_root_cause?: string | null;
  delay_root_cause_id?: string | null;
  recovery_plan?: string | null;

  safety_incident_logged: boolean;
  safety_incident_notes?: string | null;
  site_photos?: { url: string; caption?: string; timestamp?: string; lat?: number; lng?: number }[] | any;

  total_workers_onsite: number;
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | string;
  engineer_comments?: string | null;
  supervisor_approval_status: 'PENDING_REVIEW' | 'VERIFIED_BY_ENGINEER' | 'APPROVED_BY_PM' | 'REJECTED_NEEDS_REVISION' | string;
  supervisor_comments?: string | null;
  approved_by_supervisor_id?: number | null;
  approval_date?: string | null;
  supervisor_signature?: string | null;

  labor_entries: LaborMuster[];
  created_at?: string;
  updated_at?: string;
}

export interface DPRReportListResponse {
  items: DPRReport[];
  total: number;
  limit: number;
  offset: number;
}

export interface DPRMetrics {
  total_reports: number;
  total_workers_logged: number;
  total_concrete_cft: number;
  total_rebar_mt: number;
  total_equipment_downtime_hours: number;
  total_delay_hours: number;
  pending_approvals: number;
  offline_sync_pending: number;
  safety_incidents: number;

  total_dpr_logged?: number;
  total_workers_today?: number;
  cumulative_concrete_cft?: number;
  cumulative_rebar_mt?: number;
  total_downtime_hours?: number;
  pending_approval_count?: number;
  critical_delays_count?: number;
}

export interface DPRFilter {
  project_id?: number;
  tower_id?: number;
  weather_condition_id?: string;
  report_date?: string;
  date_from?: string;
  date_to?: string;
  sync_status?: string;
  supervisor_approval_status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface WeeklyMonthlyProgressReport {
  period_type: 'WEEKLY' | 'MONTHLY';
  project_id: number;
  project_name: string;
  start_date: string;
  end_date: string;
  total_dprs_logged: number;
  average_daily_headcount: number;
  cumulative_concrete_cft: number;
  cumulative_rebar_mt: number;
  total_downtime_hours: number;
  total_delay_hours: number;
  planned_progress_percentage: number;
  actual_progress_percentage: number;
  variance_percentage: number;

  planned_progress_pct?: number;
  actual_progress_pct?: number;
  variance_pct?: number;
  schedule_status?: string;
  actual_cost_bdt?: number;
  budget_cost_bdt?: number;
  activities?: any[];
  material_consumption?: any[];

  critical_delays: { date: string; delay_hours: number; cause: string; recovery_plan: string }[];
  contractor_productivity: { contractor: string; mandays: number; total_wages: number; contractor_name?: string; trade_category?: string; man_days_deployed?: number; completed_output?: string; efficiency_pct?: number }[] | any[];
  material_consumption_summary: { material: string; quantity: number; unit: string }[];
  pending_inspections_count: number;
  unresolved_ncr_count: number;
  forecast_completion_date?: string | null;
}

export interface WorkOrder {
  id?: number;
  work_order_no: string;
  contract_reference?: string | null;
  project_id: number;
  contractor_id: number;
  tower_id?: number | null;
  tower_name?: string | null;
  wbs_node_id?: number | null;
  wbs_package_name?: string | null;

  contract_title?: string | null;
  contract_type: string;
  contract_model: string;
  tender_reference?: string | null;
  technical_specifications?: string | null;
  scope_of_work?: string | null;

  total_contract_value: number;
  original_contract_value: number;
  approved_variations_value: number;
  revised_contract_value: number;
  committed_cost: number;
  certified_work_value: number;
  paid_amount: number;

  start_date?: string | null;
  target_completion_date?: string | null;
  actual_completion_date?: string | null;
  delay_days: number;

  advance_payment_amount: number;
  advance_payment_percent: number;
  advance_recovery_rule?: string | null;
  advance_recovered_amount: number;

  retention_money_percent: number;
  retention_money_held: number;
  retention_release_conditions?: string | null;
  defect_liability_months: number;

  performance_security_type?: string | null;
  performance_security_amount: number;
  performance_security_expiry?: string | null;

  tds_section?: string | null;
  tds_rate: number;
  vds_rate: number;

  delegated_approval_limit: number;
  budget_headroom_alert_percent: number;
  budget_alert_triggered: boolean;

  approval_status: string;
  approval_level?: string | null;
  approved_by_user_id?: number | null;
  approval_date?: string | null;
  signed_contract_doc_url?: string | null;
  document_attachments?: string | null;
  version_number: number;
  amendment_notes?: string | null;
  status: string;

  project_name?: string | null;
  contractor_name?: string | null;
  contractor_trade?: string | null;
  contractor_phone?: string | null;
  approved_by_name?: string | null;
  items?: WorkOrderItem[];
  milestones?: WorkOrderMilestone[];
  created_at?: string;
  updated_at?: string;
}

export interface SignatureChainItem {
  role: string;
  title: string;
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | string;
  signed_by?: string | null;
  signed_at?: string | null;
  notes?: string | null;
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
  defect_title?: string | null;
  inspection_id?: number | null;
  inspection_code?: string | null;
  category: 'Structural Defect' | 'Honeycombing' | 'Cover Missing' | 'Safety Violation' | string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  affects_safety_or_structural?: boolean;
  escalation_level?: string;
  escalated_to_name?: string | null;
  escalated_at?: string | null;
  description?: string | null;
  location_details?: string | null;
  photo_url?: string | null;
  assigned_contractor_id?: number | null;
  contractor_name?: string | null;
  rectification_deadline: string;
  status: 'Open' | 'Assigned' | 'Rectified' | 'Verified_Closed' | 'Under_Reinspection' | string;
  corrective_action?: string | null;
  preventive_action?: string | null;
  capa_submitted_at?: string | null;
  capa_submitted_by_name?: string | null;
  rectification_notes?: string | null;
  rectification_photo_url?: string | null;
  reinspected_by_user_id?: number | null;
  reinspected_by_name?: string | null;
  reinspection_date?: string | null;
  reinspection_verdict?: string | null;
  reinspection_remarks?: string | null;
  closure_approval_remarks?: string | null;
  closure_approved_by_user_id?: number | null;
  closure_approved_by_name?: string | null;
  closed_date?: string | null;
  is_overdue?: boolean;
  created_at?: string;
}

export interface LaborWorker {
  id: number;
  worker_code: string;
  worker_name: string;
  worker_type: 'DIRECT_EMPLOYEE' | 'PIECE_RATE' | 'SUBCON_LABOR' | string;
  contractor_id?: number | null;
  contractor_name?: string | null;
  trade_category: string;
  skill_level: string;
  daily_wage_rate: number;
  hourly_overtime_rate: number;
  nid_number?: string | null;
  phone_number?: string | null;
  emergency_contact?: string | null;
  assigned_project_id?: number | null;
  assigned_project_name?: string | null;
  photo_url?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LaborWorkerListResponse {
  items: LaborWorker[];
  total: number;
  limit: number;
  offset: number;
}

export interface LaborAttendance {
  id: number;
  attendance_date: string;
  worker_id: number;
  worker_code?: string | null;
  worker_name?: string | null;
  trade_category?: string | null;
  worker_type?: string | null;
  project_id: number;
  project_name?: string | null;
  contractor_id?: number | null;
  contractor_name?: string | null;
  wbs_node_id?: number | null;
  wbs_node_name?: string | null;
  shift_type: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  attendance_status: string;
  manday_fraction: number;
  overtime_hours: number;
  total_earned_amount: number;
  supervisor_approved: boolean;
  supervisor_id?: number | null;
  supervisor_name?: string | null;
  approval_timestamp?: string | null;
  attendance_method: string;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  gps_location_address?: string | null;
  verification_photo_url?: string | null;
  biometric_verified: boolean;
  remarks?: string | null;
  created_at?: string;
}

export interface LaborAttendanceListResponse {
  items: LaborAttendance[];
  total: number;
  limit: number;
  offset: number;
}

export interface LaborAttendanceMetrics {
  total_records: number;
  present_count: number;
  absent_count: number;
  late_or_half_day_count: number;
  total_mandays: number;
  total_overtime_hours: number;
  total_wage_cost: number;
  pending_approvals: number;
  biometric_or_gps_verified_count: number;
}

export interface GangAttendanceItem {
  worker_id: number;
  attendance_status?: string;
  manday_fraction?: number;
  overtime_hours?: number;
  remarks?: string | null;
}

export interface GangAttendanceBatchCreate {
  project_id: number;
  attendance_date: string;
  shift_type?: string;
  contractor_id?: number | null;
  wbs_node_id?: number | null;
  attendance_method?: string;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  gps_location_address?: string | null;
  verification_photo_url?: string | null;
  gang_members: GangAttendanceItem[];
}

export interface SubcontractorPayment {
  id: number;
  voucher_number: string;
  payment_type: 'DIRECT_PAYROLL' | 'CONTRACTOR_INVOICE' | string;
  project_id: number;
  project_name?: string | null;
  contractor_id?: number | null;
  contractor_name?: string | null;
  worker_id?: number | null;
  worker_name?: string | null;
  work_order_id?: number | null;
  work_order_no?: string | null;
  period_start_date: string;
  period_end_date: string;
  verified_attendance_mandays: number;
  attendance_wages_amount: number;
  measured_work_amount: number;
  gross_payable_amount: number;
  advance_recovery_amount: number;
  retention_percentage: number;
  retention_deduction_amount: number;
  other_deductions_amount: number;
  deduction_notes?: string | null;
  tax_compliance_type: string;
  tds_rate: number;
  tds_amount: number;
  vds_rate: number;
  vds_amount: number;
  net_certified_payable: number;
  certified_by_user_id?: number | null;
  certified_by_name?: string | null;
  certified_at?: string | null;
  certification_status: 'DRAFT' | 'CERTIFIED' | 'ACCOUNTS_POSTED' | 'PAID' | 'VOID' | string;
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_date?: string | null;
  voucher_document_url?: string | null;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SubcontractorPaymentListResponse {
  items: SubcontractorPayment[];
  total: number;
  limit: number;
  offset: number;
}

export interface QualityChecklistItem {
  criterion: string;
  is_mandatory: boolean;
  result: 'PASS' | 'FAIL' | 'NA';
  remarks?: string;
}

export interface QualityInspection {
  id: number;
  inspection_code: string;
  project_id: number;
  project_name?: string | null;
  tower_id?: number | null;
  tower_name?: string | null;
  wbs_node_id?: number | null;
  wbs_node_name?: string | null;
  work_order_id?: number | null;
  work_order_no?: string | null;
  contractor_id?: number | null;
  contractor_name?: string | null;
  itp_code?: string | null;
  stage_category: 'CONCRETE_CASTING' | 'REINFORCEMENT' | 'MASONRY' | 'WATERPROOFING' | 'ELECTRICAL' | 'PLUMBING' | 'FINISHING' | string;
  location_details: string;
  inspection_request_date: string;
  inspection_date?: string | null;
  inspector_user_id?: number | null;
  inspector_name?: string | null;
  contractor_representative?: string | null;
  checklist_items: QualityChecklistItem[];
  mandatory_checks_passed: boolean;
  verdict: 'PENDING' | 'PASSED' | 'REJECTED' | 'CONDITIONAL_APPROVAL' | string;
  evidence_photos?: string[];
  material_test_cert_url?: string | null;
  cube_test_strength_psi?: number | null;
  laboratory_report_ref?: string | null;
  remarks?: string | null;
  supervisor_approved: boolean;
  supervisor_approved_at?: string | null;
  ncr_created_id?: number | null;
  ncr_number?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface QualityInspectionListResponse {
  items: QualityInspection[];
  total: number;
  limit: number;
  offset: number;
}

export interface QualityDefectMetrics {
  total_inspections: number;
  passed_inspections: number;
  failed_inspections: number;
  pending_inspections: number;
  total_defects: number;
  open_defects: number;
  rectified_defects: number;
  closed_defects: number;
  critical_safety_structural_defects: number;
  lab_tests_performed: number;
}

export interface SiteMaterialRequisition {
  id: number;
  requisition_number: string;
  project_id: number;
  tower_id?: number | null;
  tower_name?: string | null;
  floor_number?: string | null;
  work_package: string;
  wbs_node_id?: number | null;
  material_id: number;
  boq_item_id?: number | null;

  material_code: string;
  material_name: string;
  specification?: string | null;
  grade?: string | null;
  unit_of_measure: string;

  requested_quantity: number;
  approved_quantity: number;
  issued_quantity: number;
  returned_quantity: number;
  consumed_quantity: number;
  wastage_quantity: number;
  damage_quantity: number;
  allowed_wastage_percentage: number;
  actual_wastage_percentage: number;

  stock_balance_at_request: number;
  boq_allocated_quantity: number;
  boq_previous_consumed: number;
  boq_remaining_headroom: number;

  store_id?: number | null;
  supplier_name?: string | null;
  batch_lot_number?: string | null;
  storage_location?: string | null;

  requested_by_user_id: number;
  requisition_date: string;
  required_by_date?: string | null;
  priority: 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL' | string;

  approved_by_user_id?: number | null;
  approval_date?: string | null;
  rejection_reason?: string | null;
  purpose_remarks?: string | null;

  purchase_requisition_id?: number | null;
  min_number?: string | null;
  received_date?: string | null;
  received_by_user_id?: number | null;

  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PO_INITIATED' | 'PARTIALLY_ISSUED' | 'ISSUED' | 'RECEIVED_AT_SITE' | 'CONSUMED' | 'CLOSED' | string;

  project_name?: string | null;
  wbs_node_code?: string | null;
  wbs_node_name?: string | null;
  store_name?: string | null;
  requested_by_name?: string | null;
  approved_by_name?: string | null;
  received_by_name?: string | null;
  stock_shortage?: number;

  created_at?: string;
  updated_at?: string;
}

export interface MaterialConsumption {
  id: number;
  requisition_id: number;
  min_id?: number | null;
  project_id: number;
  wbs_node_id?: number | null;
  material_id: number;

  consumption_date: string;
  quantity_consumed: number;
  quantity_returned: number;
  quantity_wasted: number;
  quantity_damaged: number;
  unit_of_measure: string;
  unit_cost: number;
  total_consumption_cost: number;
  variance_cost: number;

  batch_lot_number?: string | null;
  work_location?: string | null;
  subcontractor_id?: number | null;
  recorded_by_user_id?: number | null;
  verification_status: string;
  remarks?: string | null;

  project_name?: string | null;
  material_name?: string | null;
  material_code?: string | null;
  wbs_node_code?: string | null;
  wbs_node_name?: string | null;
  contractor_name?: string | null;
  recorded_by_name?: string | null;
  created_at?: string;
}

export interface MaterialReturn {
  id: number;
  rts_number: string;
  requisition_id: number;
  store_id: number;
  project_id: number;
  material_id: number;

  return_date: string;
  returned_quantity: number;
  unit_of_measure: string;
  condition_status: 'GOOD' | 'PARTIALLY_DAMAGED' | 'SCRAP' | string;
  return_reason?: string | null;
  returned_by_user_id: number;
  accepted_by_storekeeper_id?: number | null;
  status: string;

  project_name?: string | null;
  material_name?: string | null;
  store_name?: string | null;
  returned_by_name?: string | null;
  accepted_by_name?: string | null;
  created_at?: string;
}

export interface MaterialRequisitionMetrics {
  total_requisitions: number;
  pending_approvals: number;
  approved_in_progress: number;
  total_issued_count: number;
  total_consumed_records: number;
  total_return_records: number;
  total_consumption_value: number;
  total_wasted_value: number;
  total_returned_value: number;
}

export interface SiteMaterialRequisitionFilter {
  project_id?: number;
  tower_id?: number;
  wbs_node_id?: number;
  work_package?: string;
  status?: string;
  priority?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// -------------------------------------------------------------
// Work Orders & Contract Management Models
// -------------------------------------------------------------
export interface WorkOrderItem {
  id?: number;
  work_order_id?: number;
  boq_item_id?: number | null;
  wbs_node_id?: number | null;
  item_code: string;
  item_description: string;
  specification?: string | null;
  unit_of_measure: string;
  boq_quantity: number;
  contract_quantity: number;
  approved_unit_rate: number;
  total_amount: number;
  executed_quantity: number;
  remaining_quantity: number;
  remarks?: string | null;
  created_at?: string;
}

export interface WorkOrderMilestone {
  id?: number;
  work_order_id?: number;
  milestone_code: string;
  milestone_title: string;
  target_date: string;
  actual_date?: string | null;
  weightage_percent: number;
  milestone_amount: number;
  is_critical: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'ACHIEVED' | 'DELAYED' | string;
  verification_notes?: string | null;
  created_at?: string;
}

export interface WorkOrderListResponse {
  items: WorkOrder[];
  total: number;
  limit: number;
  offset: number;
}

export interface WorkOrderMetrics {
  total_work_orders: number;
  active_contracts: number;
  total_original_value: number;
  total_revised_value: number;
  total_committed_cost: number;
  total_certified_value: number;
  total_paid_value: number;
  total_advance_disbursed: number;
  total_retention_held: number;
  total_delayed_contracts: number;
  budget_alert_count: number;
}

export interface WorkOrderFilter {
  project_id?: number;
  contractor_id?: number;
  contract_type?: string;
  contract_model?: string;
  approval_status?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// --------------------------------------------------------------------------
// Measurement-Based RA Billing & Payment Certification Models
// --------------------------------------------------------------------------
export interface RABillItem {
  id?: number;
  ra_bill_id?: number;
  work_order_item_id?: number | null;
  item_code: string;
  item_description: string;
  unit_of_measure: string;
  contract_rate: number;
  contract_quantity: number;
  previous_quantity: number;
  current_measured_quantity: number;
  cumulative_quantity: number;
  previous_amount: number;
  current_amount: number;
  cumulative_amount: number;
  location_floor?: string | null;
  measurement_sheet_ref?: string | null;
  remarks?: string | null;
}

export interface RABillSignatureStep {
  role: string;
  name?: string;
  action?: string;
  status?: string;
  date?: string;
  comments?: string;
  signed_by?: string;
  signed_at?: string;
  notes?: string;
}

export interface RABill {
  id: number;
  ra_bill_number: string;
  work_order_id: number;
  work_order_no?: string | null;
  project_id: number;
  project_name?: string | null;
  contractor_id: number;
  contractor_name?: string | null;
  contract_title?: string | null;

  bill_date: string;
  billing_period_start?: string | null;
  billing_period_end?: string | null;

  previous_certified_amount: number;
  current_gross_bill_value: number;
  gross_work_certified_amount: number;
  cumulative_certified_amount: number;

  advance_recovery_deducted: number;
  retention_percent: number;
  retention_money_deducted: number;
  material_store_recovery_amount: number;
  penalty_deduction_amount: number;
  other_deductions_amount: number;
  other_deductions_description?: string | null;

  tax_treatment_type: string;
  tds_rate: number;
  tds_withheld_amount: number;
  vat_treatment_type: string;
  vds_rate: number;
  vds_withheld_amount: number;

  net_payable_amount: number;
  previous_payments_amount: number;
  net_payable_balance: number;

  workflow_stage: string;
  current_stage_assignee_role: string;
  revision_number: number;
  rejection_reason?: string | null;
  review_comments?: string | null;

  measurement_sheet_urls?: string | null;
  site_photo_urls?: string | null;

  is_on_hold: boolean;
  hold_reason?: string | null;
  hold_by_user_id?: number | null;
  dispute_id?: number | null;

  retention_release_status: string;
  retention_release_eligible_date?: string | null;
  retention_release_amount: number;

  status: string;
  payment_status: string;
  paid_amount: number;
  payment_date?: string | null;
  payment_method?: string | null;
  bank_payment_ref?: string | null;
  cheque_reference?: string | null;
  accounts_journal_voucher_ref?: string | null;
  remarks?: string | null;
  approval_signature_chain?: RABillSignatureStep[] | any;

  items?: RABillItem[];
  created_at?: string;
  updated_at?: string;
}

export interface RABillListResponse {
  items: RABill[];
  total: number;
  limit: number;
  offset: number;
}

export interface RABillMetrics {
  total_bills: number;
  total_gross_certified: number;
  total_net_payable: number;
  total_advance_recovered: number;
  total_retention_deducted: number;
  total_tds_withheld: number;
  total_vds_withheld: number;
  total_paid_amount: number;
  total_pending_approval: number;
  total_on_hold: number;
}

export interface RABillFilter {
  project_id?: number;
  work_order_id?: number;
  contractor_id?: number;
  workflow_stage?: string;
  payment_status?: string;
  status?: string;
  is_on_hold?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface RABillWorkflowActionPayload {
  action: 'VERIFY_ON_SITE' | 'REVIEW_QS' | 'APPROVE_PM' | 'REVIEW_ACCOUNTS' | 'AUTHORIZE_PAYMENT' | 'REVISE' | 'REJECT' | 'PUT_ON_HOLD' | 'RELEASE_HOLD' | string;
  actor_name: string;
  actor_role: string;
  comments?: string;
  payment_date?: string;
  payment_method?: string;
  bank_payment_ref?: string;
  cheque_reference?: string;
  paid_amount?: number;
}

// -------------------------------------------------------------
// Safety Incident & HSE Management Models
// -------------------------------------------------------------
export interface SafetyIncident {
  id?: number;
  incident_code: string;
  incident_title: string;
  project_id: number;
  contractor_id?: number | null;
  wbs_node_id?: number | null;
  incident_date: string;
  incident_time?: string | null;
  exact_location: string;
  incident_type: string; // NEAR_MISS, FIRST_AID, MEDICAL_TREATMENT, LOST_TIME_INJURY, PROPERTY_DAMAGE, ENVIRONMENTAL_SPILL
  severity_level: string; // LOW, MEDIUM, HIGH, CRITICAL
  injured_person_type?: string | null;
  injured_person_name?: string | null;
  injured_worker_id?: number | null;
  injury_nature?: string | null;
  body_part_affected?: string | null;
  days_lost_count: number;
  property_damage_estimated_cost: number;
  incident_description: string;
  root_cause_analysis?: string | null;
  immediate_action_taken?: string | null;
  corrective_preventive_action?: string | null;
  responsible_person_name?: string | null;
  capa_due_date?: string | null;
  investigation_status: string; // REPORTED, UNDER_INVESTIGATION, CAPA_ASSIGNED, RESOLVED, CLOSED
  investigated_by_user_id?: number | null;
  investigation_date?: string | null;
  emergency_escalation_notified: boolean;
  escalated_to_management_at?: string | null;
  is_confidential_medical: boolean;
  incident_photo_urls?: string[] | null;
  police_or_regulatory_report_filed: boolean;
  project_name?: string | null;
  contractor_name?: string | null;
  injured_worker_code?: string | null;
  investigator_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SafetyIncidentListResponse {
  items: SafetyIncident[];
  total: number;
  limit: number;
  offset: number;
}

export interface SafetyIncidentFilter {
  project_id?: number;
  contractor_id?: number;
  incident_type?: string;
  severity_level?: string;
  investigation_status?: string;
  include_confidential?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface HSESafetyMetrics {
  total_incidents: number;
  near_miss_count: number;
  first_aid_count: number;
  medical_lti_count: number;
  total_days_lost: number;
  open_investigations: number;
  total_trainings_conducted: number;
  total_workers_inducted: number;
  active_ptw_count: number;
  critical_safety_escalations: number;
}

// -------------------------------------------------------------
// Safety Training & Toolbox Talks Models
// -------------------------------------------------------------
export interface SafetyTraining {
  id?: number;
  training_code: string;
  project_id: number;
  contractor_id?: number | null;
  training_type: string; // SITE_INDUCTION, TOOLBOX_TALK, WORKING_AT_HEIGHT, FIRE_SAFETY, ELECTRICAL_SAFETY
  session_title: string;
  trainer_name: string;
  trainer_designation?: string | null;
  training_date: string;
  duration_minutes: number;
  location_room_zone?: string | null;
  attendees_count: number;
  attendees_list?: any[] | null;
  topics_covered?: string | null;
  feedback_summary?: string | null;
  photo_url?: string | null;
  project_name?: string | null;
  contractor_name?: string | null;
  created_at?: string;
}

export interface SafetyTrainingListResponse {
  items: SafetyTraining[];
  total: number;
  limit: number;
  offset: number;
}

export interface SafetyTrainingFilter {
  project_id?: number;
  contractor_id?: number;
  training_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// -------------------------------------------------------------
// Permits-To-Work (PTW) Models
// -------------------------------------------------------------
export interface PermitToWork {
  id?: number;
  permit_number: string;
  project_id: number;
  contractor_id?: number | null;
  permit_type: string; // HOT_WORK, WORKING_AT_HEIGHT, CONFINED_SPACE, DEEP_EXCAVATION, ELECTRICAL_ISOLATION
  work_location: string;
  scope_of_controlled_activity: string;
  valid_from_time: string;
  valid_to_time: string;
  hazard_controls_in_place?: any | null;
  requested_by_supervisor_name: string;
  safety_officer_name?: string | null;
  safety_officer_verified: boolean;
  project_manager_approved: boolean;
  approved_by_name?: string | null;
  permit_status: string; // REQUESTED, APPROVED_ACTIVE, SUSPENDED, EXPIRED, CLOSED_SURRENDERED
  closure_inspection_notes?: string | null;
  project_name?: string | null;
  contractor_name?: string | null;
  request_timestamp?: string | null;
  approval_timestamp?: string | null;
  closed_at?: string | null;
  created_at?: string;
}

export interface PermitToWorkListResponse {
  items: PermitToWork[];
  total: number;
  limit: number;
  offset: number;
}

export interface PermitToWorkFilter {
  project_id?: number;
  contractor_id?: number;
  permit_type?: string;
  permit_status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// -------------------------------------------------------------
// Project Completion & Handover Models
// -------------------------------------------------------------
export interface ProjectCompletion {
  id?: number;
  completion_code: string;
  project_id: number;
  target_handover_date: string;
  actual_completion_date?: string | null;
  stage_status: string; // IN_RECONCILIATION, MANAGEMENT_REVIEW, SUBSTANTIALLY_COMPLETED, FORMALLY_CLOSED
  wbs_activities_completion_pct: number;
  total_boq_reconciled_items_count: number;
  final_reconciled_cost_bdt: number;
  original_budget_cost_bdt: number;
  cost_variance_amount_bdt: number;
  outstanding_contractor_bills_amount: number;
  retention_money_locked_bdt: number;
  retention_release_authorized: boolean;
  materials_store_reconciliation_cleared: boolean;
  equipment_store_reconciliation_cleared: boolean;
  open_quality_defects_count: number;
  open_safety_incidents_count: number;
  as_built_drawings_submitted: boolean;
  as_built_drawings_ref_url?: string | null;
  om_manuals_submitted: boolean;
  om_manuals_ref_url?: string | null;
  warranties_collected_count: number;
  warranties_summary_url?: string | null;
  mandatory_items_all_cleared: boolean;
  permitted_punchlist_exceptions?: any[] | null;
  taking_over_certificate_url?: string | null;
  project_manager_signoff: boolean;
  pm_name?: string | null;
  pm_signoff_at?: string | null;
  project_director_signoff: boolean;
  director_name?: string | null;
  director_signoff_at?: string | null;
  remarks?: string | null;
  project_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectCompletionListResponse {
  items: ProjectCompletion[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProjectCompletionFilter {
  project_id?: number;
  stage_status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ProjectCompletionMetrics {
  total_projects_in_closeout: number;
  substantially_completed_count: number;
  formally_closed_count: number;
  total_reconciled_cost_bdt: number;
  total_cost_variance_bdt: number;
  total_retentions_held_bdt: number;
  total_open_snags: number;
  mandatory_critical_snags_open: number;
}

// -------------------------------------------------------------
// Punchlist Snag Register Models
// -------------------------------------------------------------
export interface PunchlistItem {
  id?: number;
  completion_id: number;
  project_id: number;
  item_code: string;
  category: string; // Architectural Finishing, MEP & Electrical, Civil & Concrete, Fire & Life Safety, Landscaping
  location_floor_unit: string;
  description: string;
  photo_url?: string | null;
  assigned_contractor_id?: number | null;
  contractor_name?: string | null;
  severity: string; // MINOR_COSMETIC, OPERATIONAL, MANDATORY_CRITICAL
  target_rectification_date: string;
  status: string; // OPEN, RECTIFIED_PENDING_INSPECTION, VERIFIED_CLOSED
  reinspected_by_name?: string | null;
  closed_at?: string | null;
  project_name?: string | null;
  created_at?: string;
}

export interface PunchlistListResponse {
  items: PunchlistItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PunchlistFilter {
  completion_id?: number;
  project_id?: number;
  assigned_contractor_id?: number;
  severity?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// -------------------------------------------------------------
// Construction Management Reports Interfaces
// -------------------------------------------------------------
export interface ConstructionReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center' | string;
  format_type?: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'badge' | string;
}

export interface ConstructionReportMeta {
  code: string;
  name: string;
  category: string;
  description: string;
  icon: string;
}

export interface ConstructionReportSummaryKPIs {
  total_active_projects: number;
  overall_schedule_health_pct: number;
  total_committed_cost_bdt: number;
  total_actual_expenditure_bdt: number;
  total_retention_liability_bdt: number;
  open_defects_and_incidents: number;
  material_wastage_rate_pct: number;
}

export interface ConstructionReportResponse {
  report_type: string;
  report_title: string;
  generated_at: string;
  total_items: number;
  limit: number;
  offset: number;
  columns: ConstructionReportColumn[];
  summary_aggregates: Record<string, any>;
  items: Record<string, any>[];
}

export interface ConstructionReportFilter {
  project_id?: number;
  contractor_id?: number;
  wbs_node_id?: number;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}





