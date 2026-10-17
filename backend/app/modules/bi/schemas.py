from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal


class PortfolioValuationResponse(BaseModel):
    total_asset_value_bdt: float = 0.0
    sold_inventory_value_bdt: float = 0.0
    unsold_inventory_value_bdt: float = 0.0
    total_units_count: int = 0
    sold_units_count: int = 0
    unsold_units_count: int = 0
    average_unit_price_bdt: float = 0.0
    portfolio_sold_percentage: float = 0.0


class CashRunwayHorizonResponse(BaseModel):
    horizon_days: int = 90
    projected_installment_inflow_bdt: float = 0.0
    projected_pdc_clearing_inflow_bdt: float = 0.0
    projected_rental_inflow_bdt: float = 0.0
    total_inflow_bdt: float = 0.0
    committed_po_material_outflow_bdt: float = 0.0
    committed_contractor_ra_outflow_bdt: float = 0.0
    committed_labor_payroll_outflow_bdt: float = 0.0
    committed_statutory_overhead_outflow_bdt: float = 0.0
    total_outflow_bdt: float = 0.0
    net_cash_runway_bdt: float = 0.0
    monthly_burn_rate_bdt: float = 0.0
    runway_coverage_months: float = 0.0
    runway_health_status: str = "STRONG_SURPLUS" # STRONG_SURPLUS, MODERATE, CRITICAL_DEFICIT


class SalesVelocityItem(BaseModel):
    project_id: int
    project_name: str
    total_units: int = 0
    units_sold: int = 0
    avg_days_to_sell: float = 0.0
    velocity_status: str = "NORMAL" # FAST_MOVING, NORMAL, SLOW_MOVING


class ProjectProfitabilityComparison(BaseModel):
    project_id: int
    project_name: str
    total_revenue_bdt: float = 0.0
    land_cost_bdt: float = 0.0
    construction_cost_bdt: float = 0.0
    statutory_overhead_cost_bdt: float = 0.0
    total_cost_bdt: float = 0.0
    projected_gross_profit_bdt: float = 0.0
    gross_profit_margin_pct: float = 0.0
    projected_irr_pct: float = 0.0
    sales_velocity_avg_days: float = 0.0
    planned_value_pv: float = 0.0
    earned_value_ev: float = 0.0
    actual_cost_ac: float = 0.0
    spi_index: float = 1.00
    cpi_index: float = 1.00
    evm_status: str = "ON_TRACK" # ON_TRACK, COST_OVERRUN, SCHEDULE_DELAYED, AHEAD_OF_SCHEDULE


class HeatmapAgingCell(BaseModel):
    bucket_code: str # 0_30_DAYS, 31_60_DAYS, 61_90_DAYS, 91_180_DAYS, 180_PLUS_DAYS
    bucket_label: str
    overdue_count: int = 0
    overdue_amount_bdt: float = 0.0
    late_fee_bdt: float = 0.0
    risk_intensity: str = "LOW" # LOW, MEDIUM, HIGH, CRITICAL


class ProjectOverdueHeatmapRow(BaseModel):
    project_id: int
    project_name: str
    buckets: List[HeatmapAgingCell] = []
    total_project_overdue_bdt: float = 0.0
    total_overdue_units: int = 0


class ExecutiveBICockpitResponse(BaseModel):
    valuation: PortfolioValuationResponse
    runway_90d: CashRunwayHorizonResponse
    runway_180d: CashRunwayHorizonResponse
    sales_velocities: List[SalesVelocityItem] = []
    profitability_comparisons: List[ProjectProfitabilityComparison] = []
    overdue_heatmap: List[ProjectOverdueHeatmapRow] = []
    overall_spi: float = 1.00
    overall_cpi: float = 1.00
    overall_portfolio_irr: float = 0.0
