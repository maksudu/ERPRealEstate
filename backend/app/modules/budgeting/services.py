from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.budgeting.models import (
    BudgetPlan, ProjectBudget, BoqItem, CostAllocation,
    BudgetApprovalWorkflow, PurchaseBudgetCheck, ExpenseControl, BudgetVariation
)
from app.modules.projects.models import Project

async def get_or_create_initial_seed(db: AsyncSession):
    """Ensure at least demo real estate projects and budget records exist for immediate UI preview"""
    # Check if budget plans exist
    res = await db.execute(select(func.count(BudgetPlan.id)))
    count = res.scalar() or 0
    if count > 0:
        return

    # Check for existing project or create reference
    proj_res = await db.execute(select(Project).limit(1))
    proj = proj_res.scalar_one_or_none()
    
    project_id = proj.id if proj else 1
    project_name = proj.project_name if proj else "Twin Tower Residential Project"

    # 1. Budget Plan - Twin Tower Residential Project
    plan = BudgetPlan(
        plan_code="BP-2025-001",
        title=f"{project_name} - Master Development Budget",
        fiscal_year="2025-2026",
        scope_level="PROJECT",
        period_type="MULTI_YEAR",
        project_id=project_id,
        tower_name="Tower A & B",
        total_budget_bdt=Decimal("120000000.00"),      # ৳12.00 Cr
        actual_expenditure_bdt=Decimal("72000000.00"),  # ৳7.20 Cr
        committed_amount_bdt=Decimal("20000000.00"),    # ৳2.00 Cr
        available_budget_bdt=Decimal("28000000.00"),    # ৳2.80 Cr
        version=1,
        status="APPROVED",
        prepared_by="Engr. M. Rahman (Chief QS)",
        approved_by="Executive Committee & MD",
        approval_notes="Approved according to Board Resolution B-2025/14"
    )
    db.add(plan)
    await db.flush()

    # 2. Detailed Project Budget Lines matching Example:
    # Land & Legal: ৳3.00 Cr / ৳2.80 Cr
    # Civil Construction: ৳5.00 Cr / ৳3.20 Cr
    # Electrical & Plumbing: ৳1.50 Cr / ৳0.80 Cr
    # Finishing: ৳1.50 Cr / ৳0.40 Cr
    # Other Costs: ৳1.00 Cr / ৳0.00 Cr
    budget_lines = [
        ProjectBudget(
            budget_plan_id=plan.id,
            project_id=project_id,
            tower_name="Common / Master",
            cost_category="Land and legal",
            cost_center="Legal & Land Bank",
            line_code="LND-001",
            item_name="Land Acquisition, Registration & Title Vetting",
            description="Deed execution, mutation, and legal verification expenses",
            baseline_amount_bdt=Decimal("30000000.00"),
            revised_amount_bdt=Decimal("30000000.00"),
            committed_amount_bdt=Decimal("0.00"),
            actual_spent_bdt=Decimal("28000000.00"),
            variance_bdt=Decimal("2000000.00"),
            is_locked=True
        ),
        ProjectBudget(
            budget_plan_id=plan.id,
            project_id=project_id,
            tower_name="Tower A",
            cost_category="Civil construction",
            cost_center="Civil Works",
            line_code="CIV-001",
            item_name="Substructure, Piling & Superstructure RCC",
            description="Concrete, Rebar 72.5 grade, formwork, and earth excavation",
            baseline_amount_bdt=Decimal("50000000.00"),
            revised_amount_bdt=Decimal("50000000.00"),
            committed_amount_bdt=Decimal("12000000.00"),
            actual_spent_bdt=Decimal("32000000.00"),
            variance_bdt=Decimal("18000000.00"),
            is_locked=True
        ),
        ProjectBudget(
            budget_plan_id=plan.id,
            project_id=project_id,
            tower_name="Tower A & B",
            cost_category="Electrical & plumbing",
            cost_center="MEP Division",
            line_code="MEP-001",
            item_name="Conduit wiring, Substation, Plumbing & Sanitary",
            description="High voltage transformers, main distribution board & pumps",
            baseline_amount_bdt=Decimal("15000000.00"),
            revised_amount_bdt=Decimal("15000000.00"),
            committed_amount_bdt=Decimal("5000000.00"),
            actual_spent_bdt=Decimal("8000000.00"),
            variance_bdt=Decimal("7000000.00"),
            is_locked=False
        ),
        ProjectBudget(
            budget_plan_id=plan.id,
            project_id=project_id,
            tower_name="Tower A",
            cost_category="Finishing",
            cost_center="Architectural Finishing",
            line_code="FIN-001",
            item_name="Tiles, Sanitary Ware, Paint & Exterior Glazing",
            description="Homogeneous floor tiles, bathroom fittings & weather-coat paint",
            baseline_amount_bdt=Decimal("15000000.00"),
            revised_amount_bdt=Decimal("15000000.00"),
            committed_amount_bdt=Decimal("3000000.00"),
            actual_spent_bdt=Decimal("4000000.00"),
            variance_bdt=Decimal("11000000.00"),
            is_locked=False
        ),
        ProjectBudget(
            budget_plan_id=plan.id,
            project_id=project_id,
            tower_name="Common",
            cost_category="Other costs",
            cost_center="Administration & Contingency",
            line_code="OTH-001",
            item_name="Project Overhead, Safety, Permits & Contingency",
            description="RAJUK clearance, CDA NOC, insurance, and contingency reserve",
            baseline_amount_bdt=Decimal("10000000.00"),
            revised_amount_bdt=Decimal("10000000.00"),
            committed_amount_bdt=Decimal("0.00"),
            actual_spent_bdt=Decimal("0.00"),
            variance_bdt=Decimal("10000000.00"),
            is_locked=False
        )
    ]
    for b in budget_lines:
        db.add(b)

    # 3. Sample BOQ Items matching prompt
    boq = BoqItem(
        project_id=project_id,
        tower_name="Tower A",
        work_category="Structural work",
        work_item="Reinforced concrete (1:1.5:3 with Stone Chips)",
        item_code="BOQ-STR-01",
        unit="CFT",
        estimated_qty=Decimal("50000.00"),
        budget_rate_bdt=Decimal("250.00"),
        total_budget_bdt=Decimal("12500000.00"), # ৳1,25,00,000
        material_cost_bdt=Decimal("8500000.00"),
        labor_cost_bdt=Decimal("2500000.00"),
        equipment_cost_bdt=Decimal("1000000.00"),
        subcontractor_cost_bdt=Decimal("500000.00"),
        actual_qty=Decimal("32000.00"),
        certified_qty=Decimal("30000.00"),
        actual_spent_bdt=Decimal("7800000.00"),
        version=1,
        is_approved=True,
        notes="High-strength concrete for Level 1 to Level 10 columns and beams"
    )
    db.add(boq)

    # 4. Cost Allocation
    alloc = CostAllocation(
        allocation_code="ALC-2025-001",
        project_id=project_id,
        tower_name="Tower A",
        floor_level="Floor 01–20",
        unit_number="Apartment A-101 to A-2004",
        cost_center="Civil Works",
        cost_category="Material",
        allocation_method="FLOOR_AREA",
        basis_value=Decimal("185000.00"), # SFT
        allocated_pct=Decimal("100.00"),
        allocated_amount_bdt=Decimal("50000000.00"),
        remarks="Allocated proportionally by saleable floor area across 20 floors"
    )
    db.add(alloc)

    # 5. Approval Workflow
    workflows = [
        BudgetApprovalWorkflow(
            budget_plan_id=plan.id,
            step_sequence=1,
            step_name="Preparation",
            assigned_role="Site QS & Estimation Lead",
            status="APPROVED",
            action_taken="SUBMIT",
            comments="Detailed BOQ and rate analyses prepared with current BSRM & Holcim rates",
            action_by="Engr. Tariqul Islam",
            action_at=func.now()
        ),
        BudgetApprovalWorkflow(
            budget_plan_id=plan.id,
            step_sequence=2,
            step_name="Technical Review",
            assigned_role="Chief Structural Engineer",
            status="APPROVED",
            action_taken="APPROVE",
            comments="WBS item quantities validated against architectural drawings & structural design",
            action_by="Engr. K. Zaman",
            action_at=func.now()
        ),
        BudgetApprovalWorkflow(
            budget_plan_id=plan.id,
            step_sequence=3,
            step_name="Finance Review",
            assigned_role="Chief Financial Officer",
            status="APPROVED",
            action_taken="APPROVE",
            comments="Cashflow feasibility checked against project pre-sales schedules and equity",
            action_by="Farhan Ahmed, FCA",
            action_at=func.now()
        ),
        BudgetApprovalWorkflow(
            budget_plan_id=plan.id,
            step_sequence=4,
            step_name="Management Approval",
            assigned_role="Managing Director",
            status="APPROVED",
            action_taken="APPROVE",
            comments="Final Board approval signed. Project baseline locked at ৳12.00 Cr",
            action_by="Managing Director",
            action_at=func.now()
        )
    ]
    for w in workflows:
        db.add(w)

    # 6. Purchase Budget Control Check
    po_check = PurchaseBudgetCheck(
        check_code="PBC-2025-089",
        project_id=project_id,
        document_type="PURCHASE_ORDER",
        document_ref="PO-2025-045 (BSRM 500W Steel)",
        vendor_name="BSRM Steels Limited",
        cost_category="Civil construction",
        cost_center="Civil Works",
        requested_amount_bdt=Decimal("4500000.00"),
        current_budget_bdt=Decimal("50000000.00"),
        already_committed_bdt=Decimal("12000000.00"),
        available_budget_bdt=Decimal("18000000.00"),
        status="APPROVED_WITHIN_BUDGET",
        action_notes="Requested PO amount is well within available Civil budget of ৳1.80 Cr",
        verified_by="Budget Control Officer"
    )
    db.add(po_check)

    # 7. Expense Control
    expense = ExpenseControl(
        expense_ref="EXP-2025-104",
        project_id=project_id,
        tower_name="Tower A",
        cost_category="Civil construction",
        party_type="CONTRACTOR",
        party_name="Spectra Engineering & Construction Ltd",
        bill_number="RA-BILL-08",
        bill_amount_bdt=Decimal("3500000.00"),
        certified_amount_bdt=Decimal("3350000.00"),
        tax_vat_deducted_bdt=Decimal("251250.00"),
        retention_amount_bdt=Decimal("167500.00"),
        net_payable_bdt=Decimal("2931250.00"),
        paid_amount_bdt=Decimal("2931250.00"),
        balance_payable_bdt=Decimal("0.00"),
        payment_status="PAID",
        voucher_ref="BPV-2025-5021",
        bill_date=None
    )
    db.add(expense)

    # 8. Budget Variation
    var = BudgetVariation(
        variation_code="VAR-2025-012",
        project_id=project_id,
        tower_name="Tower A",
        title="Foundation Deep Piling Length Revision",
        reason_category="Site Condition Changes",
        justification="Subsoil geotechnical report revision required extending cast-in-situ piles by 5 metres",
        original_qty=Decimal("4500.00"),
        revised_qty=Decimal("5200.00"),
        original_cost_bdt=Decimal("8000000.00"),
        revised_cost_bdt=Decimal("9400000.00"),
        variation_amount_bdt=Decimal("1400000.00"),
        stage="MANAGEMENT_APPROVED",
        approved_by="Executive Director (Technical)",
        created_by="Engr. M. Rafiq (Project Manager)"
    )
    db.add(var)

    await db.commit()
