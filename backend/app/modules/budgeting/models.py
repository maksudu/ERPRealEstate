from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, JSON, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class BudgetPlan(Base):
    """
    Budget Plan Header - Annual, Project, Phase, Tower and Department Budgets
    """
    __tablename__ = "bcc_budget_plans"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    plan_code = Column(String(64), unique=True, nullable=False, index=True)
    title = Column(String(191), nullable=False)
    fiscal_year = Column(String(32), nullable=False, default="2025-2026", index=True)
    scope_level = Column(String(64), nullable=False, default="PROJECT") # ANNUAL, PROJECT, PHASE, TOWER, DEPARTMENT
    period_type = Column(String(64), nullable=False, default="MULTI_YEAR") # ANNUAL, QUARTERLY, MONTHLY, PROJECT_LIFECYCLE
    
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    tower_name = Column(String(128), nullable=True)
    department_name = Column(String(128), nullable=True)
    
    total_budget_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    committed_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    actual_expenditure_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    available_budget_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    
    version = Column(Integer, nullable=False, default=1)
    status = Column(String(64), nullable=False, default="DRAFT", index=True) # DRAFT, UNDER_REVIEW, APPROVED, REVISED, REJECTED
    approval_notes = Column(Text, nullable=True)
    prepared_by = Column(String(128), nullable=True, default="Project Lead QS")
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    items = relationship("ProjectBudget", back_populates="budget_plan", cascade="all, delete-orphan")
    workflows = relationship("BudgetApprovalWorkflow", back_populates="budget_plan", cascade="all, delete-orphan")


class ProjectBudget(Base):
    """
    Project Budget Line Items - Land, Construction, Administrative and Marketing Budgets
    """
    __tablename__ = "bcc_project_budgets"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    budget_plan_id = Column(BigInteger, ForeignKey("bcc_budget_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, nullable=True)
    tower_name = Column(String(128), nullable=True)
    
    cost_category = Column(String(128), nullable=False, index=True) # Land & Legal, Civil Construction, Electrical & Plumbing, Finishing, Marketing & Sales, Admin
    cost_center = Column(String(128), nullable=False, default="Civil Works", index=True)
    line_code = Column(String(64), nullable=False)
    item_name = Column(String(191), nullable=False)
    description = Column(Text, nullable=True)
    
    baseline_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    revised_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    committed_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    actual_spent_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    variance_bdt = Column(Numeric(18, 2), nullable=False, default=0.00) # Baseline - Actual Spent
    is_locked = Column(Boolean, default=False)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    budget_plan = relationship("BudgetPlan", back_populates="items")


class BoqItem(Base):
    """
    BOQ Budget Management - Quantity, rate, material, labor, equipment and subcontractor breakdown
    """
    __tablename__ = "bcc_boq_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_name = Column(String(128), nullable=True, default="Tower A")
    work_category = Column(String(128), nullable=False, index=True) # Structural Work, Substructure, Masonry, Finishing, MEP
    work_item = Column(String(191), nullable=False)
    item_code = Column(String(64), nullable=True)
    unit = Column(String(32), nullable=False, default="CFT") # CFT, m3, SFT, RFT, Nos, MT, Bags
    
    estimated_qty = Column(Numeric(14, 2), nullable=False, default=0.00)
    budget_rate_bdt = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_budget_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    
    material_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    labor_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    equipment_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    subcontractor_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    
    actual_qty = Column(Numeric(14, 2), nullable=False, default=0.00)
    certified_qty = Column(Numeric(14, 2), nullable=False, default=0.00)
    actual_spent_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    version = Column(Integer, default=1)
    is_approved = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class CostAllocation(Base):
    """
    Cost Allocation - Project, tower, floor, unit and cost-center allocation
    """
    __tablename__ = "bcc_cost_allocations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    allocation_code = Column(String(64), unique=True, nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_name = Column(String(128), nullable=True)
    floor_level = Column(String(64), nullable=True)
    unit_number = Column(String(64), nullable=True)
    
    cost_center = Column(String(128), nullable=False, default="Civil Works", index=True)
    cost_category = Column(String(128), nullable=False, default="Material", index=True) # Material, Labor, Contractor, Overhead
    
    allocation_method = Column(String(64), nullable=False, default="FLOOR_AREA") # DIRECT, FLOOR_AREA, UNIT_COUNT, PERCENTAGE
    basis_value = Column(Numeric(14, 2), nullable=True, default=0.00) # e.g. SFT or Unit Count
    allocated_pct = Column(Numeric(6, 2), nullable=False, default=100.00)
    allocated_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    remarks = Column(Text, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class BudgetApprovalWorkflow(Base):
    """
    Budget Approval Workflow - Preparation, review, approval and revision stages
    """
    __tablename__ = "bcc_approval_workflows"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    budget_plan_id = Column(BigInteger, ForeignKey("bcc_budget_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    step_sequence = Column(Integer, nullable=False, default=1)
    step_name = Column(String(128), nullable=False) # Preparation, Technical Review, Finance Review, Management Approval
    assigned_role = Column(String(128), nullable=False) # Site QS, Chief Engineer, Finance Controller, Managing Director
    status = Column(String(64), nullable=False, default="PENDING") # PENDING, APPROVED, REJECTED, RETURNED
    action_taken = Column(String(64), nullable=True)
    comments = Column(Text, nullable=True)
    action_by = Column(String(128), nullable=True)
    action_at = Column(TIMESTAMP, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    budget_plan = relationship("BudgetPlan", back_populates="workflows")


class PurchaseBudgetCheck(Base):
    """
    Purchase Budget Control - Requisition, purchase order and available budget checks
    """
    __tablename__ = "bcc_purchase_controls"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    check_code = Column(String(64), unique=True, nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(64), nullable=False, default="PURCHASE_ORDER") # REQUISITION, PURCHASE_ORDER
    document_ref = Column(String(128), nullable=False, index=True)
    vendor_name = Column(String(191), nullable=True)
    cost_category = Column(String(128), nullable=False)
    cost_center = Column(String(128), nullable=False)
    
    requested_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    current_budget_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    already_committed_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    available_budget_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    
    status = Column(String(64), nullable=False, default="APPROVED_WITHIN_BUDGET") # APPROVED_WITHIN_BUDGET, OVER_BUDGET_HELD, ROUTED_FOR_SPECIAL_APPROVAL
    action_notes = Column(Text, nullable=True)
    verified_by = Column(String(128), nullable=True, default="Budget Officer")
    verified_at = Column(TIMESTAMP, server_default=func.now())


class ExpenseControl(Base):
    """
    Expense Control - Actual expenses, contractor bills and payment tracking
    """
    __tablename__ = "bcc_expense_controls"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    expense_ref = Column(String(64), unique=True, nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_name = Column(String(128), nullable=True)
    cost_category = Column(String(128), nullable=False)
    party_type = Column(String(64), nullable=False, default="CONTRACTOR") # CONTRACTOR, VENDOR, CONSULTANT, UTILITY
    party_name = Column(String(191), nullable=False)
    
    bill_number = Column(String(128), nullable=True)
    bill_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    certified_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    tax_vat_deducted_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    retention_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    net_payable_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    paid_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    balance_payable_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    
    payment_status = Column(String(64), nullable=False, default="PENDING") # PENDING, PARTIAL, PAID
    voucher_ref = Column(String(128), nullable=True)
    bill_date = Column(Date, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class BudgetVariation(Base):
    """
    Budget Variation - Additional work, revised quantities and cost change approvals
    """
    __tablename__ = "bcc_budget_variations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    variation_code = Column(String(64), unique=True, nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_name = Column(String(128), nullable=True)
    boq_item_id = Column(BigInteger, ForeignKey("bcc_boq_items.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(191), nullable=False)
    reason_category = Column(String(128), nullable=False) # Additional Work, Architectural Revision, Revised BOQ Quantities, Material Price Escalation
    justification = Column(Text, nullable=True)
    
    original_qty = Column(Numeric(14, 2), nullable=True, default=0.00)
    revised_qty = Column(Numeric(14, 2), nullable=True, default=0.00)
    original_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    revised_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    variation_amount_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    
    stage = Column(String(64), nullable=False, default="SUBMITTED") # SUBMITTED, TECHNICAL_REVIEW, FINANCE_REVIEW, MANAGEMENT_APPROVED, REJECTED
    approval_date = Column(Date, nullable=True)
    approved_by = Column(String(128), nullable=True)
    created_by = Column(String(128), nullable=True, default="Site Engineer")
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
