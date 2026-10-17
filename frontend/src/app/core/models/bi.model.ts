export interface PortfolioValuation {
  total_asset_value_bdt: number;
  sold_inventory_value_bdt: number;
  unsold_inventory_value_bdt: number;
  total_units_count: number;
  sold_units_count: number;
  unsold_units_count: number;
  average_unit_price_bdt: number;
  portfolio_sold_percentage: number;
}

export interface CashRunwayHorizon {
  horizon_days: number;
  projected_installment_inflow_bdt: number;
  projected_pdc_clearing_inflow_bdt: number;
  projected_rental_inflow_bdt: number;
  total_inflow_bdt: number;
  committed_po_material_outflow_bdt: number;
  committed_contractor_ra_outflow_bdt: number;
  committed_labor_payroll_outflow_bdt: number;
  committed_statutory_overhead_outflow_bdt: number;
  total_outflow_bdt: number;
  net_cash_runway_bdt: number;
  monthly_burn_rate_bdt: number;
  runway_coverage_months: number;
  runway_health_status: 'STRONG_SURPLUS' | 'MODERATE' | 'CRITICAL_DEFICIT';
}

export interface SalesVelocityItem {
  project_id: number;
  project_name: string;
  total_units: number;
  units_sold: number;
  avg_days_to_sell: number;
  velocity_status: 'FAST_MOVING' | 'NORMAL' | 'SLOW_MOVING';
}

export interface ProjectProfitabilityComparison {
  project_id: number;
  project_name: string;
  total_revenue_bdt: number;
  land_cost_bdt: number;
  construction_cost_bdt: number;
  statutory_overhead_cost_bdt: number;
  total_cost_bdt: number;
  projected_gross_profit_bdt: number;
  gross_profit_margin_pct: number;
  projected_irr_pct: number;
  sales_velocity_avg_days: number;
  planned_value_pv: number;
  earned_value_ev: number;
  actual_cost_ac: number;
  spi_index: number;
  cpi_index: number;
  evm_status: 'ON_TRACK' | 'COST_OVERRUN' | 'SCHEDULE_DELAYED' | 'AHEAD_OF_SCHEDULE';
}

export interface HeatmapAgingCell {
  bucket_code: '0_30_DAYS' | '31_60_DAYS' | '61_90_DAYS' | '91_180_DAYS' | '180_PLUS_DAYS';
  bucket_label: string;
  overdue_count: number;
  overdue_amount_bdt: number;
  late_fee_bdt: number;
  risk_intensity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ProjectOverdueHeatmapRow {
  project_id: number;
  project_name: string;
  buckets: HeatmapAgingCell[];
  total_project_overdue_bdt: number;
  total_overdue_units: number;
}

export interface ExecutiveBICockpit {
  valuation: PortfolioValuation;
  runway_90d: CashRunwayHorizon;
  runway_180d: CashRunwayHorizon;
  sales_velocities: SalesVelocityItem[];
  profitability_comparisons: ProjectProfitabilityComparison[];
  overdue_heatmap: ProjectOverdueHeatmapRow[];
  overall_spi: number;
  overall_cpi: number;
  overall_portfolio_irr: number;
}
