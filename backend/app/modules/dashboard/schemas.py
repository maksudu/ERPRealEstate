from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ExecutiveOverviewResponse(BaseModel):
    active_projects: int = Field(..., description="Active projects across the portfolio")
    total_projects: int = Field(..., description="Total registered projects")
    total_units: int = Field(..., description="All registered units in portfolio")
    contracted_sales_value_bdt: float = Field(..., description="Approved sale agreements total BDT")
    contracted_sales_value_cr: float = Field(..., description="Contracted sales value in Crore ৳")
    collections_received_bdt: float = Field(..., description="Verified receipts total BDT")
    collections_received_cr: float = Field(..., description="Collections received in Crore ৳")
    overdue_receivables_bdt: float = Field(..., description="Past-due customer balances total BDT")
    overdue_receivables_cr: float = Field(..., description="Overdue receivables in Crore ৳")
    actual_project_cost_bdt: float = Field(..., description="Posted project expenditure total BDT")
    actual_project_cost_cr: float = Field(..., description="Actual project cost in Crore ৳")
    on_track_projects_count: int = Field(..., description="Projects meeting physical and schedule baselines")
    units_sold_or_contracted: int = Field(..., description="Total units sold or under agreement")
    reporting_period: str = Field(..., description="Financial period e.g. FY 2026 Q3")
    last_refreshed_at: str = Field(..., description="ISO 8601 server refresh timestamp")

class ProjectKPIItem(BaseModel):
    id: int
    project_code: str
    project_name: str
    location: str
    development_authority: str
    status: str
    total_units: int
    sold_units: int
    sales_ratio_pct: float
    total_budget_bdt: float
    actual_spent_bdt: float
    budget_variance_bdt: float
    budget_utilization_pct: float
    cost_to_complete_bdt: float
    project_completion_pct: float
    schedule_variance_days: int
    is_on_track: bool
    planned_handover_date: Optional[str] = None
    forecast_handover_date: Optional[str] = None

class ProjectPortfolioResponse(BaseModel):
    total_projects: int
    active_projects: int
    completed_projects: int
    on_hold_projects: int
    projects_by_authority: Dict[str, int]
    projects_by_status: Dict[str, int]
    items: List[ProjectKPIItem]

class ProjectDrillDownResponse(BaseModel):
    project_overview: Dict[str, Any]
    sales_inventory: Dict[str, Any]
    construction_milestones: List[Dict[str, Any]]
    procurement_costs: Dict[str, Any]
    financials: Dict[str, Any]
    receivables_handover: Dict[str, Any]
    profitability_forecast: Dict[str, Any]

class UnitTypeBreakdown(BaseModel):
    type_id: str
    label: str
    count: int
    percentage: float
    total_value_bdt: Optional[float] = 0.0

class InventoryDashboardResponse(BaseModel):
    total_units: int
    available_units: int
    reserved_units: int
    booked_units: int
    sold_units: int
    cancelled_units: int
    handover_ready_units: int
    unsold_inventory_value_bdt: float
    total_saleable_area_sqft: float
    sold_saleable_area_sqft: float
    available_saleable_area_sqft: float
    projected_sales_bdt: float
    min_price_per_sqft: float
    avg_price_per_sqft: float
    sales_by_unit_type: List[UnitTypeBreakdown]
    availability_by_unit_type: List[UnitTypeBreakdown]
    price_ranges: List[Dict[str, Any]]

class SalesVsTargetMonth(BaseModel):
    month: str
    actual_sales_bdt: float
    target_sales_bdt: float
    formatted_actual: str
    formatted_target: str

class DefaulterClient(BaseModel):
    id: int
    name: str
    avatar_initials: str
    units: str
    overdue_amount_bdt: float
    days_overdue: int
    phone: str
    status: str
    action_type: str

class SalesAnalyticsResponse(BaseModel):
    sales_vs_target_trend: List[SalesVsTargetMonth]
    sales_by_unit_type: List[UnitTypeBreakdown]
    availability_by_unit_type: List[UnitTypeBreakdown]
    defaulters_morosos: List[DefaulterClient]
    total_overdue_debt: float
    average_unit_selling_price_bdt: float
    average_discount_pct: float
    cancellation_rate_pct: float
    lead_conversion_rate_pct: float
    total_leads: int
    total_bookings: int

class BIModuleItem(BaseModel):
    id: int
    module_key: str
    title: str
    description: str
    badge: Optional[str] = None
    kpis: Dict[str, Any]

class BISubModulesResponse(BaseModel):
    modules: List[BIModuleItem]
