export interface ProjectFinancialDimensionConfig {
  id?: number;
  organization_id?: number;
  account_id?: number | null;
  account_code?: string | null;
  account_name?: string | null;
  account_type?: string | null;
  transaction_type: string;
  is_company_branch_mandatory: boolean;
  is_project_mandatory: boolean;
  is_tower_mandatory: boolean;
  is_unit_mandatory: boolean;
  is_department_cost_center_mandatory: boolean;
  is_construction_phase_mandatory: boolean;
  is_cost_category_mandatory: boolean;
  is_party_mandatory: boolean;
  is_budget_line_mandatory: boolean;
  notes?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DimensionConfigPaginationResponse {
  items: ProjectFinancialDimensionConfig[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProjectIncomeTransaction {
  id?: number;
  organization_id?: number;
  income_number?: string;
  transaction_date: string;
  company_name: string;
  branch_name: string;
  project_id: number;
  project_name?: string;
  project_code?: string;
  tower_id?: number | null;
  tower_name?: string;
  unit_id?: number | null;
  unit_number?: string;
  department_name: string;
  cost_center_id?: number | null;
  cost_center_name?: string;
  construction_phase?: string | null;
  cost_category: string;
  customer_id?: number | null;
  customer_name?: string;
  party_name?: string | null;
  budget_line_code?: string | null;
  account_id?: number | null;
  account_name?: string;
  contract_value: number;
  recognized_amount: number;
  cash_collected_amount: number;
  unearned_revenue: number;
  recognition_policy: string;
  payment_method: string;
  reference_no?: string | null;
  voucher_id?: number | null;
  status: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectIncomePaginationResponse {
  items: ProjectIncomeTransaction[];
  total: number;
  limit: number;
  offset: number;
  total_recognized_amount: number;
  total_collected_amount: number;
  total_unearned_revenue: number;
}

export interface ProjectExpenditureTransaction {
  id?: number;
  organization_id?: number;
  expenditure_number?: string;
  transaction_date: string;
  company_name: string;
  branch_name: string;
  project_id: number;
  project_name?: string;
  project_code?: string;
  tower_id?: number | null;
  tower_name?: string;
  unit_id?: number | null;
  unit_number?: string;
  department_name: string;
  cost_center_id?: number | null;
  cost_center_name?: string;
  construction_phase?: string | null;
  cost_category: string;
  party_type: string;
  vendor_id?: number | null;
  contractor_id?: number | null;
  party_name?: string | null;
  party_display_name?: string;
  budget_line_code?: string | null;
  account_id?: number | null;
  account_name?: string;
  gross_amount: number;
  tax_vat_deducted: number;
  retention_deducted: number;
  net_payable_amount: number;
  paid_amount: number;
  committed_po_reference?: string | null;
  expenditure_type: string;
  payment_status: string;
  payment_method: string;
  reference_no?: string | null;
  voucher_id?: number | null;
  status: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectExpenditurePaginationResponse {
  items: ProjectExpenditureTransaction[];
  total: number;
  limit: number;
  offset: number;
  total_gross_amount: number;
  total_tax_vat_deducted: number;
  total_net_payable: number;
  total_paid_amount: number;
}

export interface ProjectProfitabilityItem {
  project_id: number;
  project_code: string;
  project_name: string;
  status: string;
  budget: number;
  actual_cost: number;
  committed_cost: number;
  invoiced_po_overlap: number;
  forecast_cost: number;
  recognized_revenue: number;
  cash_collected: number;
  gross_profit: number;
  budget_variance: number;
  forecast_margin_pct: number;
  gross_margin_pct: number;
  cost_completion_pct: number;
  income_count: number;
  expenditure_count: number;
  notes?: string;
}

export interface MultiProjectProfitabilityReportResponse {
  projects: ProjectProfitabilityItem[];
  total_budget: number;
  total_actual_cost: number;
  total_committed_cost: number;
  total_reconciled_overlap: number;
  total_forecast_cost: number;
  total_recognized_revenue: number;
  total_cash_collected: number;
  total_gross_profit: number;
  total_budget_variance: number;
  overall_gross_margin_pct: number;
  overall_forecast_margin_pct: number;
  total_projects_count: number;
  generated_at: string;
}
