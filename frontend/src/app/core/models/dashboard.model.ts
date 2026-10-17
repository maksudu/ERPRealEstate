export interface ExecutiveOverview {
  active_projects: number;
  total_projects: number;
  total_units: number;
  contracted_sales_value_bdt: number;
  contracted_sales_value_cr: number;
  collections_received_bdt: number;
  collections_received_cr: number;
  overdue_receivables_bdt: number;
  overdue_receivables_cr: number;
  actual_project_cost_bdt: number;
  actual_project_cost_cr: number;
  on_track_projects_count: number;
  units_sold_or_contracted: number;
  reporting_period: string;
  last_refreshed_at: string;
}

export interface ProjectKPIItem {
  id: number;
  project_code: string;
  project_name: string;
  location: string;
  development_authority: string;
  status: string;
  total_units: number;
  sold_units: number;
  sales_ratio_pct: number;
  total_budget_bdt: number;
  actual_spent_bdt: number;
  budget_variance_bdt: number;
  budget_utilization_pct: number;
  cost_to_complete_bdt: number;
  project_completion_pct: number;
  schedule_variance_days: number;
  is_on_track: boolean;
  planned_handover_date?: string;
  forecast_handover_date?: string;
}

export interface ProjectPortfolio {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  on_hold_projects: number;
  projects_by_authority: Record<string, number>;
  projects_by_status: Record<string, number>;
  items: ProjectKPIItem[];
}

export interface ProjectDrillDown {
  project_overview: {
    id: number;
    project_code: string;
    project_name: string;
    authority: string;
    far_allocated: number;
    mgc_percent: number;
    plot_area_sqft: number;
    total_builtup_area_sqft: number;
    total_saleable_area_sqft: number;
    status: string;
    towers_count: number;
    floors_max: number;
    total_units: number;
  };
  sales_inventory: {
    total_units: number;
    available_units: number;
    reserved_units: number;
    booked_units: number;
    sold_units: number;
    total_sales_value_bdt: number;
    unsold_inventory_value_bdt: number;
    sales_absorption_pct: number;
  };
  construction_milestones: Array<{
    id: number;
    phase: string;
    material: string;
    description: string;
    uom: string;
    planned_qty: number;
    actual_qty: number;
    progress_pct: number;
  }>;
  procurement_costs: {
    committed_po_value: number;
    material_consumption_value: number;
    site_store_stock_value: number;
  };
  financials: {
    approved_budget_bdt: number;
    actual_expenditure_bdt: number;
    budget_variance_bdt: number;
    budget_utilization_pct: number;
    current_liabilities_bdt: number;
  };
  receivables_handover: {
    total_receivable_bdt: number;
    total_collected_bdt: number;
    overdue_receivables_bdt: number;
    handover_readiness_pct: number;
  };
  profitability_forecast: {
    projected_total_revenue_cr: number;
    forecast_total_cost_cr: number;
    estimated_gross_profit_cr: number;
    projected_profit_margin_pct: number;
  };
}

export interface UnitTypeBreakdown {
  type_id: string;
  label: string;
  count: number;
  percentage: number;
  total_value_bdt?: number;
}

export interface InventoryDashboard {
  total_units: number;
  available_units: number;
  reserved_units: number;
  booked_units: number;
  sold_units: number;
  cancelled_units: number;
  handover_ready_units: number;
  unsold_inventory_value_bdt: number;
  total_saleable_area_sqft: number;
  sold_saleable_area_sqft: number;
  available_saleable_area_sqft: number;
  projected_sales_bdt: number;
  min_price_per_sqft: number;
  avg_price_per_sqft: number;
  sales_by_unit_type: UnitTypeBreakdown[];
  availability_by_unit_type: UnitTypeBreakdown[];
  price_ranges: Array<{ range: string; count: number }>;
}

export interface SalesVsTargetMonth {
  month: string;
  actual_sales_bdt: number;
  target_sales_bdt: number;
  formatted_actual: string;
  formatted_target: string;
}

export interface DefaulterClient {
  id: number;
  name: string;
  avatar_initials: string;
  units: string;
  overdue_amount_bdt: number;
  days_overdue: number;
  phone: string;
  status: string;
  action_type: string;
}

export interface SalesAnalytics {
  sales_vs_target_trend: SalesVsTargetMonth[];
  sales_by_unit_type: UnitTypeBreakdown[];
  availability_by_unit_type: UnitTypeBreakdown[];
  defaulters_morosos: DefaulterClient[];
  total_overdue_debt: number;
  average_unit_selling_price_bdt: number;
  average_discount_pct: number;
  cancellation_rate_pct: number;
  lead_conversion_rate_pct: number;
  total_leads: number;
  total_bookings: number;
}

export interface BIModuleItem {
  id: number;
  module_key: string;
  title: string;
  description: string;
  badge?: string;
  kpis: Record<string, any>;
}
