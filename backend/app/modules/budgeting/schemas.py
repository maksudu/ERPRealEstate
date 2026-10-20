from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import date, datetime
from decimal import Decimal

class BudgetPlanBase(BaseModel):
    plan_code: Optional[str] = None
    title: str
    fiscal_year: str = "2025-2026"
    scope_level: str = "PROJECT"
    period_type: str = "MULTI_YEAR"
    project_id: Optional[int] = None
    tower_name: Optional[str] = None
    department_name: Optional[str] = None
    total_budget_bdt: Decimal = Decimal("0.00")
    committed_amount_bdt: Decimal = Decimal("0.00")
    actual_expenditure_bdt: Decimal = Decimal("0.00")
    available_budget_bdt: Decimal = Decimal("0.00")
    version: int = 1
    status: str = "DRAFT"
    approval_notes: Optional[str] = None
    prepared_by: Optional[str] = "Project Lead QS"
    approved_by: Optional[str] = None

class BudgetPlanCreate(BudgetPlanBase):
    pass

class BudgetPlanUpdate(BaseModel):
    title: Optional[str] = None
    fiscal_year: Optional[str] = None
    scope_level: Optional[str] = None
    period_type: Optional[str] = None
    total_budget_bdt: Optional[Decimal] = None
    committed_amount_bdt: Optional[Decimal] = None
    actual_expenditure_bdt: Optional[Decimal] = None
    available_budget_bdt: Optional[Decimal] = None
    status: Optional[str] = None
    approval_notes: Optional[str] = None
    approved_by: Optional[str] = None

class BudgetPlanResponse(BudgetPlanBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectBudgetBase(BaseModel):
    budget_plan_id: int
    project_id: int
    tower_id: Optional[int] = None
    tower_name: Optional[str] = None
    cost_category: str
    cost_center: str = "Civil Works"
    line_code: str
    item_name: str
    description: Optional[str] = None
    baseline_amount_bdt: Decimal = Decimal("0.00")
    revised_amount_bdt: Decimal = Decimal("0.00")
    committed_amount_bdt: Decimal = Decimal("0.00")
    actual_spent_bdt: Decimal = Decimal("0.00")
    variance_bdt: Decimal = Decimal("0.00")
    is_locked: bool = False

class ProjectBudgetCreate(ProjectBudgetBase):
    pass

class ProjectBudgetUpdate(BaseModel):
    cost_category: Optional[str] = None
    cost_center: Optional[str] = None
    item_name: Optional[str] = None
    description: Optional[str] = None
    baseline_amount_bdt: Optional[Decimal] = None
    revised_amount_bdt: Optional[Decimal] = None
    committed_amount_bdt: Optional[Decimal] = None
    actual_spent_bdt: Optional[Decimal] = None
    variance_bdt: Optional[Decimal] = None
    is_locked: Optional[bool] = None

class ProjectBudgetResponse(ProjectBudgetBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


class BoqItemBase(BaseModel):
    project_id: int
    tower_name: Optional[str] = "Tower A"
    work_category: str
    work_item: str
    item_code: Optional[str] = None
    unit: str = "CFT"
    estimated_qty: Decimal = Decimal("0.00")
    budget_rate_bdt: Decimal = Decimal("0.00")
    total_budget_bdt: Decimal = Decimal("0.00")
    material_cost_bdt: Decimal = Decimal("0.00")
    labor_cost_bdt: Decimal = Decimal("0.00")
    equipment_cost_bdt: Decimal = Decimal("0.00")
    subcontractor_cost_bdt: Decimal = Decimal("0.00")
    actual_qty: Decimal = Decimal("0.00")
    certified_qty: Decimal = Decimal("0.00")
    actual_spent_bdt: Decimal = Decimal("0.00")
    version: int = 1
    is_approved: bool = True
    notes: Optional[str] = None

class BoqItemCreate(BoqItemBase):
    pass

class BoqItemUpdate(BaseModel):
    work_category: Optional[str] = None
    work_item: Optional[str] = None
    unit: Optional[str] = None
    estimated_qty: Optional[Decimal] = None
    budget_rate_bdt: Optional[Decimal] = None
    total_budget_bdt: Optional[Decimal] = None
    material_cost_bdt: Optional[Decimal] = None
    labor_cost_bdt: Optional[Decimal] = None
    equipment_cost_bdt: Optional[Decimal] = None
    subcontractor_cost_bdt: Optional[Decimal] = None
    actual_qty: Optional[Decimal] = None
    certified_qty: Optional[Decimal] = None
    actual_spent_bdt: Optional[Decimal] = None
    is_approved: Optional[bool] = None
    notes: Optional[str] = None

class BoqItemResponse(BoqItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


class CostAllocationBase(BaseModel):
    allocation_code: Optional[str] = None
    project_id: int
    tower_name: Optional[str] = None
    floor_level: Optional[str] = None
    unit_number: Optional[str] = None
    cost_center: str = "Civil Works"
    cost_category: str = "Material"
    allocation_method: str = "FLOOR_AREA"
    basis_value: Optional[Decimal] = Decimal("0.00")
    allocated_pct: Decimal = Decimal("100.00")
    allocated_amount_bdt: Decimal = Decimal("0.00")
    remarks: Optional[str] = None

class CostAllocationCreate(CostAllocationBase):
    pass

class CostAllocationResponse(CostAllocationBase):
    id: int
    created_at: Optional[datetime] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


class BudgetApprovalWorkflowResponse(BaseModel):
    id: int
    budget_plan_id: int
    step_sequence: int
    step_name: str
    assigned_role: str
    status: str
    action_taken: Optional[str] = None
    comments: Optional[str] = None
    action_by: Optional[str] = None
    action_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BudgetApprovalAction(BaseModel):
    workflow_id: int
    action: str # APPROVE, REJECT, RETURN
    comments: Optional[str] = None
    action_by: str = "Authorized Approver"


class PurchaseBudgetCheckBase(BaseModel):
    check_code: Optional[str] = None
    project_id: int
    document_type: str = "PURCHASE_ORDER"
    document_ref: str
    vendor_name: Optional[str] = None
    cost_category: str
    cost_center: str
    requested_amount_bdt: Decimal
    current_budget_bdt: Decimal = Decimal("0.00")
    already_committed_bdt: Decimal = Decimal("0.00")
    available_budget_bdt: Decimal = Decimal("0.00")
    status: str = "APPROVED_WITHIN_BUDGET"
    action_notes: Optional[str] = None
    verified_by: Optional[str] = "Budget Officer"

class PurchaseBudgetCheckCreate(PurchaseBudgetCheckBase):
    pass

class PurchaseBudgetCheckResponse(PurchaseBudgetCheckBase):
    id: int
    verified_at: Optional[datetime] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


class ExpenseControlBase(BaseModel):
    expense_ref: Optional[str] = None
    project_id: int
    tower_name: Optional[str] = None
    cost_category: str
    party_type: str = "CONTRACTOR"
    party_name: str
    bill_number: Optional[str] = None
    bill_amount_bdt: Decimal = Decimal("0.00")
    certified_amount_bdt: Decimal = Decimal("0.00")
    tax_vat_deducted_bdt: Decimal = Decimal("0.00")
    retention_amount_bdt: Decimal = Decimal("0.00")
    net_payable_bdt: Decimal = Decimal("0.00")
    paid_amount_bdt: Decimal = Decimal("0.00")
    balance_payable_bdt: Decimal = Decimal("0.00")
    payment_status: str = "PENDING"
    voucher_ref: Optional[str] = None
    bill_date: Optional[date] = None

class ExpenseControlCreate(ExpenseControlBase):
    pass

class ExpenseControlUpdate(BaseModel):
    certified_amount_bdt: Optional[Decimal] = None
    tax_vat_deducted_bdt: Optional[Decimal] = None
    retention_amount_bdt: Optional[Decimal] = None
    net_payable_bdt: Optional[Decimal] = None
    paid_amount_bdt: Optional[Decimal] = None
    payment_status: Optional[str] = None
    voucher_ref: Optional[str] = None

class ExpenseControlResponse(ExpenseControlBase):
    id: int
    created_at: Optional[datetime] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


class BudgetVariationBase(BaseModel):
    variation_code: Optional[str] = None
    project_id: int
    tower_name: Optional[str] = None
    boq_item_id: Optional[int] = None
    title: str
    reason_category: str
    justification: Optional[str] = None
    original_qty: Optional[Decimal] = Decimal("0.00")
    revised_qty: Optional[Decimal] = Decimal("0.00")
    original_cost_bdt: Decimal = Decimal("0.00")
    revised_cost_bdt: Decimal = Decimal("0.00")
    variation_amount_bdt: Decimal = Decimal("0.00")
    stage: str = "SUBMITTED"
    approved_by: Optional[str] = None
    created_by: Optional[str] = "Site Engineer"

class BudgetVariationCreate(BudgetVariationBase):
    pass

class BudgetVariationUpdate(BaseModel):
    project_id: Optional[int] = None
    tower_name: Optional[str] = None
    title: Optional[str] = None
    reason_category: Optional[str] = None
    stage: Optional[str] = None
    approved_by: Optional[str] = None
    original_qty: Optional[Decimal] = None
    revised_qty: Optional[Decimal] = None
    original_cost_bdt: Optional[Decimal] = None
    revised_cost_bdt: Optional[Decimal] = None
    variation_amount_bdt: Optional[Decimal] = None
    justification: Optional[str] = None

class BudgetVariationResponse(BudgetVariationBase):
    id: int
    approval_date: Optional[date] = None
    created_at: Optional[datetime] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    approved_budget_bdt: Decimal
    actual_expenditure_bdt: Decimal
    committed_costs_bdt: Decimal
    available_budget_bdt: Decimal
    budget_consumed_pct: Decimal
    total_projects_count: int
    variations_pending_count: int
    over_budget_alerts_count: int
    category_breakdown: List[dict]
    project_summaries: List[dict]
    monthly_trend: List[dict]

class BudgetVsActualItem(BaseModel):
    cost_category: str
    budget_bdt: Decimal
    actual_bdt: Decimal
    committed_bdt: Decimal
    variance_bdt: Decimal
    variance_status: str # Under Budget / Over Budget
    consumption_pct: Decimal

class ForecastingItem(BaseModel):
    project_id: int
    project_name: str
    original_budget_bdt: Decimal
    actual_spent_bdt: Decimal
    committed_bdt: Decimal
    estimated_cost_to_complete_bdt: Decimal
    final_forecasted_cost_bdt: Decimal
    projected_variance_bdt: Decimal
    risk_level: str # LOW, MODERATE, HIGH
