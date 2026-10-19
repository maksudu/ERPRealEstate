export interface FilterOptionsResponse {
  companies: Array<{ id: number; name: string; legal_name?: string; code?: string }>;
  fiscal_years: Array<{ id: number; name: string; start_date: string; end_date: string; is_closed: boolean }>;
  projects: Array<{ id: number; name: string; code: string; status: string; district: string }>;
  cost_centers: Array<{ id: number; name: string; code: string }>;
  account_groups: string[];
  accounts: Array<{ id: number; code: string; name: string; type: string }>;
  voucher_types: string[];
  voucher_statuses: string[];
  bank_accounts: Array<{ id: number; name: string; bank_name: string; account_number: string }>;
  payment_methods: string[];
  currencies: string[];
}

export interface KPIMetric {
  key: string;
  title: string;
  primary_amount: number;
  secondary_amount?: number;
  secondary_label?: string;
  badge?: string;
  trend_pct?: number;
  trend_direction?: 'up' | 'down' | 'neutral';
  category: string;
  drilldown_type: string;
}

export interface DashboardKPIsResponse {
  currency: string;
  as_of_date: string;
  from_date?: string;
  to_date?: string;
  project_id?: number;
  total_projects_count: number;

  revenue_recognized: KPIMetric;
  customer_receivables: KPIMetric;
  customer_advances: KPIMetric;
  accounts_payable: KPIMetric;
  cash_in_hand: KPIMetric;
  bank_balances: KPIMetric;
  mfs_balances: KPIMetric;
  project_expenditure: KPIMetric;
  cwip_balance: KPIMetric;
  budget_vs_actual: KPIMetric;
  loans_outstanding: KPIMetric;
  operating_expenses: KPIMetric;
  profitability: KPIMetric;
  operating_cash_flow: KPIMetric;
  unreconciled_transactions: KPIMetric;
  unposted_vouchers: KPIMetric;

  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  liquidity_ratio: number;
}

export interface ProjectFinancialSummaryRow {
  project_id: number;
  project_code: string;
  project_name: string;
  district: string;
  status: string;
  approved_budget: number;
  actual_expenditure: number;
  cwip_balance: number;
  budget_variance: number;
  budget_utilization_pct: number;
  recognized_revenue: number;
  customer_advances: number;
  customer_receivables: number;
  operating_cash_flow: number;
  financial_health: 'EXCELLENT' | 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
}

export interface ProjectFinancialSummaryResponse {
  total_projects: number;
  active_projects: number;
  total_approved_budget: number;
  total_actual_expenditure: number;
  total_cwip_balance: number;
  total_revenue: number;
  total_advances: number;
  total_receivables: number;
  projects: ProjectFinancialSummaryRow[];
}

export interface DrilldownItem {
  id: number;
  voucher_id?: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  voucher_status: string;
  account_code?: string;
  account_name?: string;
  account_type?: string;
  narration: string;
  project_name?: string;
  cost_center_name?: string;
  reference_no?: string;
  debit_amount: number;
  credit_amount: number;
  net_amount: number;
  source_module: string;
}

export interface DrilldownResponse {
  kpi_type: string;
  kpi_title: string;
  filter_summary: string;
  total_records: number;
  total_amount: number;
  total_debit: number;
  total_credit: number;
  items: DrilldownItem[];
}

export interface DashboardFilterState {
  organization_id?: number | null;
  fiscal_year_id?: number | null;
  project_id?: number | null;
  cost_center_id?: number | null;
  account_group?: string | null;
  account_id?: number | null;
  voucher_type?: string | null;
  voucher_status?: string | null;
  bank_account_id?: number | null;
  payment_method?: string | null;
  currency?: string;
  from_date?: string;
  to_date?: string;
}
