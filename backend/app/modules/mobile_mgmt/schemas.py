from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Project Performance
class ProjectCreate(BaseModel):
    project_name: str
    location: str
    total_budget: float = 0.0
    actual_cost: float = 0.0
    cost_variance: float = 0.0
    progress_percentage: float = 0.0
    estimated_revenue: float = 0.0
    projected_profitability_percentage: float = 0.0
    status: str = "IN_PROGRESS"


class ProjectUpdate(BaseModel):
    location: Optional[str] = None
    total_budget: Optional[float] = None
    actual_cost: Optional[float] = None
    cost_variance: Optional[float] = None
    progress_percentage: Optional[float] = None
    estimated_revenue: Optional[float] = None
    projected_profitability_percentage: Optional[float] = None
    status: Optional[str] = None


# Sales Analytics
class SalesAnalyticsCreate(BaseModel):
    project_name: str
    total_units: int = 0
    booked_units: int = 0
    available_units: int = 0
    sales_target: float = 0.0
    actual_sales: float = 0.0
    conversion_rate_percentage: float = 0.0
    average_price_per_sqft: float = 0.0


class SalesAnalyticsUpdate(BaseModel):
    total_units: Optional[int] = None
    booked_units: Optional[int] = None
    available_units: Optional[int] = None
    sales_target: Optional[float] = None
    actual_sales: Optional[float] = None
    conversion_rate_percentage: Optional[float] = None
    average_price_per_sqft: Optional[float] = None


# Cash Flow
class CashFlowCreate(BaseModel):
    period_month: str
    receivables_due: float = 0.0
    payables_due: float = 0.0
    net_cash_position: float = 0.0
    projected_collections: float = 0.0
    actual_surplus_deficit: float = 0.0


class CashFlowUpdate(BaseModel):
    receivables_due: Optional[float] = None
    payables_due: Optional[float] = None
    net_cash_position: Optional[float] = None
    projected_collections: Optional[float] = None
    actual_surplus_deficit: Optional[float] = None


# Approval
class ApprovalCreate(BaseModel):
    request_category: str
    title: str
    project_name: str
    requested_amount: float
    requested_by: str
    priority: str = "MEDIUM"
    executive_notes: Optional[str] = None


class ApprovalAction(BaseModel):
    status: str
    executive_notes: Optional[str] = None


# Procurement
class ProcurementCreate(BaseModel):
    project_name: str
    material_description: str
    estimated_cost: float = 0.0
    lowest_quotation_cost: float = 0.0
    vendor_selected: Optional[str] = None
    po_status: str = "PENDING_PO"


class ProcurementUpdate(BaseModel):
    lowest_quotation_cost: Optional[float] = None
    vendor_selected: Optional[str] = None
    po_status: Optional[str] = None


# Construction
class ConstructionCreate(BaseModel):
    project_name: str
    milestone_name: str
    target_completion_date: str
    delay_days: int = 0
    contractor_name: str
    contractor_performance_score: float = 85.0
    status: str = "ON_TRACK"
    critical_issues: Optional[str] = None


class ConstructionUpdate(BaseModel):
    delay_days: Optional[int] = None
    contractor_performance_score: Optional[float] = None
    status: Optional[str] = None
    critical_issues: Optional[str] = None


# HR Overview
class HrOverviewCreate(BaseModel):
    department_name: str
    total_headcount: int = 0
    present_today: int = 0
    on_leave: int = 0
    monthly_payroll_cost: float = 0.0
    pending_leave_requests: int = 0


class HrOverviewUpdate(BaseModel):
    total_headcount: Optional[int] = None
    present_today: Optional[int] = None
    on_leave: Optional[int] = None
    monthly_payroll_cost: Optional[float] = None
    pending_leave_requests: Optional[int] = None


# Compliance
class ComplianceCreate(BaseModel):
    compliance_type: str
    authority_name: str
    project_name: str
    expiry_date: str
    days_remaining: int = 30
    risk_level: str = "MEDIUM"
    status: str = "ACTIVE"


class ComplianceUpdate(BaseModel):
    expiry_date: Optional[str] = None
    days_remaining: Optional[int] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None


# Report
class ReportCreate(BaseModel):
    title: str
    category: str
    format: str = "PDF"
    generation_date: str
    generated_by: str = "Board Secretarial Unit"
    file_size: str = "2.4 MB"
    download_url: Optional[str] = None
