export interface CWIPAllocation {
  id: number;
  allocation_ref: string;
  allocation_date: string;
  allocation_method: string; // DIRECT, QUANTITY_BASED, AREA_BASED, USAGE_BASED, PERCENTAGE
  cost_category: string; // DIRECT_MATERIAL, DIRECT_LABOUR, CONTRACTOR_CERTIFIED_WORK, ENGINEERING_CONSULTANCY, SITE_OVERHEAD, EQUIPMENT_USAGE_DEPRECIATION, SHARED_PROJECT_COST
  source_module: string;
  source_transaction_ref?: string;
  original_cost_center_id?: number;
  original_project_id?: number;
  original_project_name?: string;
  original_amount: number;
  target_project_id: number;
  target_project_name?: string;
  target_tower_id?: number;
  target_tower_name?: string;
  work_package_id?: number;
  work_package_name: string;
  boq_item_id?: number;
  boq_item_ref?: string;
  allocated_amount: number;
  allocation_basis_description: string;
  basis_metric_value?: number;
  basis_metric_unit?: string;
  cwip_account_id: number;
  credit_account_id: number;
  gl_voucher_id?: number;
  is_transferred_to_cogs: boolean;
  cogs_transfer_voucher_id?: number;
  status: string; // ALLOCATED, TRANSFERRED_TO_COGS, REVERSED
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CWIPAllocationListResponse {
  total: number;
  page: number;
  limit: number;
  offset: number;
  total_pages: number;
  items: CWIPAllocation[];
}

export interface CWIPMaterialIssue {
  id: number;
  issue_ref: string;
  issue_date: string;
  project_id: number;
  project_name?: string;
  tower_id?: number;
  tower_name?: string;
  work_package: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit_of_measure: string;
  unit_cost: number;
  total_cost: number;
  inventory_account_id: number;
  cwip_account_id: number;
  gl_voucher_id?: number;
  requisition_ref?: string;
  issued_by?: string;
  received_by?: string;
  status: string;
  notes?: string;
  created_at?: string;
}

export interface CWIPMaterialIssueListResponse {
  total: number;
  page: number;
  limit: number;
  offset: number;
  total_pages: number;
  items: CWIPMaterialIssue[];
}

export interface CWIPUnitCOGSTransfer {
  id: number;
  transfer_ref: string;
  transfer_date: string;
  project_id: number;
  unit_id?: number;
  unit_number: string;
  customer_name?: string;
  sale_agreement_ref?: string;
  unit_floor_area_sft: number;
  cwip_cost_per_sft: number;
  transferred_cogs_amount: number;
  cwip_account_id: number;
  cogs_account_id: number;
  gl_voucher_id?: number;
  accounting_policy_basis: string;
  approved_by?: string;
  notes?: string;
  created_at?: string;
}

export interface CWIPBudgetVsActualItem {
  project_id: number;
  project_name: string;
  district: string;
  work_packages_count: number;
  boq_approved_budget: number;
  actual_cwip_accumulated: number;
  materials_issued_cost: number;
  labour_and_contractor_cost: number;
  overhead_and_consultancy_cost: number;
  variance_amount: number;
  variance_pct: number;
  completion_percentage: number;
  cost_to_complete_forecast: number;
  estimate_at_completion: number;
  wip_aging_status: string;
}

export interface CWIPBudgetTrackingResponse {
  total_projects: number;
  portfolio_budget: number;
  portfolio_actual_cwip: number;
  portfolio_variance: number;
  portfolio_cost_to_complete: number;
  portfolio_completion_avg_pct: number;
  projects: CWIPBudgetVsActualItem[];
}

export interface CWIPPortfolioSummaryKPIs {
  total_allocations_count: number;
  total_allocated_cwip: number;
  total_material_issues_count: number;
  total_material_issues_cost: number;
  total_cogs_transferred: number;
  active_net_cwip_balance: number;
  budget_utilization_pct: number;
}

export interface CWIPAllocationCreatePayload {
  allocation_ref: string;
  allocation_date: string;
  allocation_method: string;
  cost_category: string;
  source_module: string;
  source_transaction_ref?: string;
  original_cost_center_id?: number | null;
  original_project_id?: number | null;
  original_amount: number;
  target_project_id: number;
  target_tower_id?: number | null;
  work_package_id?: number | null;
  work_package_name: string;
  boq_item_id?: number | null;
  boq_item_ref?: string;
  allocated_amount: number;
  allocation_basis_description: string;
  basis_metric_value?: number;
  basis_metric_unit?: string;
  cwip_account_id?: number;
  credit_account_id?: number;
  notes?: string;
}

export interface CWIPMaterialIssueCreatePayload {
  issue_ref: string;
  issue_date: string;
  project_id: number;
  project_name?: string;
  tower_id?: number | null;
  tower_name?: string;
  work_package: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit_of_measure: string;
  unit_cost: number;
  total_cost: number;
  inventory_account_id?: number;
  cwip_account_id?: number;
  requisition_ref?: string;
  issued_by?: string;
  received_by?: string;
  notes?: string;
}

export interface CWIPUnitCOGSTransferPayload {
  transfer_date: string;
  project_id: number;
  unit_id?: number | null;
  unit_number: string;
  customer_name?: string;
  sale_agreement_ref?: string;
  unit_floor_area_sft: number;
  cwip_cost_per_sft: number;
  transferred_cogs_amount: number;
  cwip_account_id?: number;
  cogs_account_id?: number;
  accounting_policy_basis: string;
  approved_by?: string;
  notes?: string;
}
