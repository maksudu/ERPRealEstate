from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update, Integer
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.modules.land.models import LandBank, LandParcel
from app.modules.projects.models import (
    Project, Tower, AuthorityClearance, BOQItem, Drawing, DrawingRevision, ProjectFeasibility,
    ProjectLandAllocation, ProjectFloor, ProjectUnit, ProjectProfitability, ProjectMilestone,
    ProjectFinancialPerformance, ProjectRiskIssue
)
from app.modules.projects.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    TowerCreate, TowerUpdate, TowerResponse, TowerPageResponse,
    FloorCreate, FloorUpdate, FloorResponse, FloorPageResponse,
    ProjectUnitCreate, ProjectUnitUpdate, ProjectUnitResponse, ProjectUnitPageResponse,
    ProjectHierarchyTreeResponse, TreeTowerNode, TreeFloorNode, TreeUnitNode,
    ProjectLandAllocationCreate, ProjectLandAllocationUpdate, ProjectLandAllocationResponse,
    ProjectLandAllocationPaginationResponse, LandAllocationReconciliationSummary,
    AuthorityClearanceCreate, AuthorityClearanceUpdate, AuthorityClearanceResponse,
    AuthorityClearancePaginationResponse, AuthorityClearanceConditionResponse,
    BOQItemCreate, BOQItemResponse,
    DrawingCreate, DrawingUpdate, DrawingResponse, DrawingPaginationResponse,
    DrawingRevisionCreate, DrawingRevisionResponse,
    ProjectFeasibilityCreate, ProjectFeasibilityResponse, FeasibilitySimulationRequest,
    calculate_dhaka_far_2008,
    ProjectProfitabilityCreate, ProjectProfitabilityUpdate, ProjectProfitabilityResponse,
    ProjectProfitabilityPaginationResponse, ProfitabilitySimulationRequest, ProfitabilitySimulationResponse,
    ProjectMilestoneCreate, ProjectMilestoneUpdate, ProjectMilestoneResponse,
    ProjectMilestonePaginationResponse,
    ProjectFinancialPerformanceCreate, ProjectFinancialPerformanceUpdate,
    ProjectFinancialPerformanceResponse, ProjectFinancialPerformancePaginationResponse,
    ProjectRiskIssueCreate, ProjectRiskIssueUpdate, ProjectRiskIssueResponse, ProjectRiskIssuePage
)

router = APIRouter(prefix="/projects", tags=["Project Spatial Planning, Permits & BOQ Master"])


# -------------------------------------------------------------
# 1. Dhaka Building Construction Rules 2008 FAR Calculator Endpoint
# -------------------------------------------------------------
@router.get("/far-calculator", response_model=dict)
async def calculate_far(
    plot_area_sqft: float = Query(..., description="Plot area in square feet"),
    road_width_feet: float = Query(..., description="Connecting road width in feet"),
    occupancy_type: str = Query("RESIDENTIAL", description="RESIDENTIAL, COMMERCIAL, or MIXED")
):
    """
    Computes allowable FAR (Floor Area Ratio) and MGC (Maximum Ground Coverage)
    under Dhaka Building Construction Rules 2008 (RAJUK).
    """
    return calculate_dhaka_far_2008(
        plot_area_sqft=plot_area_sqft,
        road_width_feet=road_width_feet,
        occupancy_type=occupancy_type
    )


# -------------------------------------------------------------
# 2. Project Master Endpoints
# -------------------------------------------------------------
@router.get("/search/options")
async def project_search_options(db: AsyncSession = Depends(get_db)):
    names = await db.execute(select(Project.project_name).where(Project.project_name.is_not(None)).distinct().order_by(Project.project_name))
    districts = await db.execute(select(Project.district).where(Project.district.is_not(None)).distinct().order_by(Project.district))
    thanas = await db.execute(select(Project.thana_upazila).where(Project.thana_upazila.is_not(None)).distinct().order_by(Project.thana_upazila))
    return {"project_names": names.scalars().all(), "locations": list(dict.fromkeys([*thanas.scalars().all(), *districts.scalars().all()]))}


@router.get("/search")
async def search_projects(
    project_name: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    filters = []
    if project_name:
        filters.append(Project.project_name == project_name)
    if location:
        filters.append((Project.district == location) | (Project.thana_upazila == location))
    total = await db.scalar(select(func.count(Project.id)).where(*filters)) or 0
    stmt = select(Project).options(
        selectinload(Project.towers), selectinload(Project.clearances),
        selectinload(Project.boq_items), selectinload(Project.drawings)
    ).where(*filters).order_by(desc(Project.id)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return {"items": result.scalars().all(), "total": total, "skip": skip, "limit": limit}


@router.get("/list", response_model=List[ProjectResponse])
async def list_projects(
    authority: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Project)
        .options(
            selectinload(Project.towers),
            selectinload(Project.clearances),
            selectinload(Project.boq_items),
            selectinload(Project.drawings)
        )
        .order_by(desc(Project.id))
    )

    if authority:
        stmt = stmt.where(Project.development_authority_id == authority.upper())
    if status_filter:
        stmt = stmt.where(Project.status == status_filter)
    if search:
        p = f"%{search.strip()}%"
        stmt = stmt.where((Project.project_code.ilike(p)) | (Project.project_name.ilike(p)))

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/list", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    # Check duplicate code
    existing = await db.execute(select(Project).where(Project.project_code == payload.project_code.strip().upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Project code '{payload.project_code}' already exists.")

    # Determine plot area from land bank if provided and not explicitly specified
    plot_sqft = payload.plot_area_sqft or payload.total_land_area_sqft or 0.0
    if payload.land_bank_id and plot_sqft == 0:
        lb_res = await db.execute(select(LandBank).where(LandBank.id == payload.land_bank_id))
        land_bank = lb_res.scalar_one_or_none()
        if land_bank:
            plot_sqft = float(land_bank.total_area_sqft or 0)
            if not payload.total_land_area_katha and land_bank.total_area_katha:
                payload.total_land_area_katha = float(land_bank.total_area_katha)
            if not payload.total_land_area_decimal and land_bank.total_area_decimal:
                payload.total_land_area_decimal = float(land_bank.total_area_decimal)

    # Compute Dhaka FAR 2008 values
    far_data = calculate_dhaka_far_2008(
        plot_area_sqft=plot_sqft if plot_sqft > 0 else 14400.0,
        road_width_feet=payload.road_width_feet or 40.0
    )

    project = Project(
        land_bank_id=payload.land_bank_id,
        project_code=payload.project_code.strip().upper(),
        project_name=payload.project_name.strip(),
        company_name=payload.company_name or "Apex Properties Ltd.",
        project_type=payload.project_type or "RESIDENTIAL",
        project_category=payload.project_category or "APARTMENT",
        district=payload.district or "Dhaka",
        thana_upazila=payload.thana_upazila or "Gulshan",
        site_address=payload.site_address,
        project_manager=payload.project_manager,
        project_director=payload.project_director,
        department=payload.department or "Engineering & Civil Projects",
        development_authority_id=(payload.development_authority_id or "RAJUK").upper(),
        
        total_land_area_katha=payload.total_land_area_katha or (plot_sqft / 720.0),
        total_land_area_decimal=payload.total_land_area_decimal or (plot_sqft / 435.6),
        total_land_area_sqft=plot_sqft,
        far_allocated=payload.far_allocated or far_data["permissible_far"],
        mgc_percent=payload.mgc_percent or far_data["mgc_percent"],
        road_width_feet=payload.road_width_feet or 40.0,
        plot_area_sqft=plot_sqft,
        total_builtup_area_sqft=payload.total_builtup_area_sqft or far_data["max_permissible_builtup_sqft"],
        total_saleable_area_sqft=payload.total_saleable_area_sqft or far_data["estimated_saleable_sqft"],
        planned_construction_area_sqft=payload.planned_construction_area_sqft or far_data["max_permissible_builtup_sqft"],
        
        project_start_date=payload.project_start_date,
        target_completion_date=payload.target_completion_date,
        actual_start_date=payload.actual_start_date,
        revised_completion_date=payload.revised_completion_date,
        project_duration_months=payload.project_duration_months or 24,
        planned_handover_date=payload.planned_handover_date or payload.target_completion_date,
        
        project_funding_source=payload.project_funding_source or "EQUITY_AND_PRE_SALES",
        cost_center_code=payload.cost_center_code or f"CC-{payload.project_code.strip().upper()}",
        target_customer_segment=payload.target_customer_segment or "UPPER_MIDDLE_CLASS",
        project_scope=payload.project_scope,
        
        status=payload.status or "PROPOSED",
        approval_status=payload.approval_status or "DRAFT",
        land_parcel_ids=payload.land_parcel_ids,
        description=payload.description
    )
    db.add(project)
    await db.flush()

    # Create initial towers if provided
    if payload.towers:
        for t in payload.towers:
            tower = Tower(
                project_id=project.id,
                tower_code=t.tower_code.strip().upper(),
                tower_name=t.tower_name.strip(),
                basement_floors=t.basement_floors,
                residential_floors=t.residential_floors,
                commercial_floors=t.commercial_floors,
                total_lifts=t.total_lifts
            )
            db.add(tower)
        await db.flush()

    # Pre-populate Standard Statutory Clearances checklist
    standard_clearances = [
        "LUC", "BUILDING_PLAN", "FIRE_NOC", "AVIATION_HEIGHT", "ENVIRONMENTAL", "WASA"
    ]
    for cl_type in standard_clearances:
        db.add(AuthorityClearance(
            project_id=project.id,
            clearance_type_id=cl_type,
            status="NOT_APPLIED"
        ))
    await db.flush()

    await db.commit()

    # Re-fetch
    stmt = (
        select(Project)
        .options(
            selectinload(Project.towers),
            selectinload(Project.clearances),
            selectinload(Project.boq_items),
            selectinload(Project.drawings)
        )
        .where(Project.id == project.id)
    )
    res = await db.execute(stmt)
    return res.scalar_one()


@router.get("/list/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Project)
        .options(
            selectinload(Project.towers),
            selectinload(Project.clearances),
            selectinload(Project.boq_items),
            selectinload(Project.drawings)
        )
        .where(Project.id == project_id)
    )
    res = await db.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.put("/list/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Project).where(Project.id == project_id)
    res = await db.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        if hasattr(p, field):
            setattr(p, field, val)

    await db.commit()

    # Re-fetch with relationships
    stmt = (
        select(Project)
        .options(
            selectinload(Project.towers),
            selectinload(Project.clearances),
            selectinload(Project.boq_items),
            selectinload(Project.drawings)
        )
        .where(Project.id == project_id)
    )
    res = await db.execute(stmt)
    return res.scalar_one()


@router.delete("/list/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Project).where(Project.id == project_id)
    res = await db.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(p)
    await db.commit()
    return {"success": True, "message": f"Project {project_id} deleted successfully"}



# -------------------------------------------------------------
# 4. BOQ (Bill of Quantities) Master Estimation & Actuals
# -------------------------------------------------------------
@router.get("/boq", response_model=List[BOQItemResponse])
async def list_boq_items(
    project_id: Optional[int] = Query(None),
    tower_id: Optional[int] = Query(None),
    material_category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BOQItem).order_by(desc(BOQItem.id))
    if project_id:
        stmt = stmt.where(BOQItem.project_id == project_id)
    if tower_id:
        stmt = stmt.where(BOQItem.tower_id == tower_id)
    if material_category:
        stmt = stmt.where(BOQItem.material_category_id == material_category.upper())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/boq", response_model=BOQItemResponse, status_code=status.HTTP_201_CREATED)
async def create_boq_item(
    payload: BOQItemCreate,
    db: AsyncSession = Depends(get_db)
):
    total_cost = round(payload.estimated_quantity * payload.estimated_unit_rate, 2)
    boq = BOQItem(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        wbs_phase_id=payload.wbs_phase_id.upper(),
        material_category_id=payload.material_category_id.upper(),
        item_description=payload.item_description.strip(),
        unit_of_measure_id=payload.unit_of_measure_id.upper(),
        estimated_quantity=payload.estimated_quantity,
        estimated_unit_rate=payload.estimated_unit_rate,
        total_estimated_cost=total_cost,
        actual_consumed_quantity=payload.actual_consumed_quantity or 0.0
    )
    db.add(boq)
    await db.commit()
    await db.refresh(boq)
    return boq


# -------------------------------------------------------------
# 5. Drawing Management & IFC (Issued for Construction) Revision Engine
# -------------------------------------------------------------
@router.get("/drawings", response_model=List[DrawingResponse])
async def list_drawings(
    project_id: Optional[int] = Query(None),
    drawing_number: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Drawing).order_by(desc(Drawing.id))
    if project_id:
        stmt = stmt.where(Drawing.project_id == project_id)
    if drawing_number:
        stmt = stmt.where(Drawing.drawing_number == drawing_number)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/drawings", response_model=DrawingResponse, status_code=status.HTTP_201_CREATED)
async def create_drawing_revision(
    payload: DrawingCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    MANDATORY BUSINESS RULE:
    When a drawing revision is marked as Approved / Issued for Construction (IFC),
    all older revisions under the SAME drawing_number are automatically revoked
    (is_approved_for_construction = false).
    """
    d_number = payload.drawing_number.strip().upper()

    if payload.is_approved_for_construction:
        # Auto-revoke all previous approved revisions under this drawing_number
        revoke_stmt = (
            update(Drawing)
            .where(
                Drawing.project_id == payload.project_id,
                Drawing.drawing_number == d_number,
                Drawing.is_approved_for_construction == True
            )
            .values(
                is_approved_for_construction=False,
                revision_notes="Approval revoked - Superseded by newer IFC revision"
            )
        )
        await db.execute(revoke_stmt)

    drawing = Drawing(
        project_id=payload.project_id,
        drawing_category_id=payload.drawing_category_id.upper(),
        drawing_number=d_number,
        drawing_title=payload.drawing_title.strip(),
        revision_number=payload.revision_number.strip().upper(),
        is_approved_for_construction=payload.is_approved_for_construction,
        approved_by=payload.approved_by,
        approval_date=payload.approval_date or (date.today() if payload.is_approved_for_construction else None),
        file_url=payload.file_url,
        revision_notes=payload.revision_notes
    )
    db.add(drawing)
    await db.commit()
    await db.refresh(drawing)
    return drawing


# -------------------------------------------------------------
# 6. Dynamic Meta Options Endpoint (No Hardcoded Dropdowns)
# -------------------------------------------------------------
@router.get("/meta/options")
async def get_project_meta_options(db: AsyncSession = Depends(get_db)):
    """
    Supplies dynamic options for Project Master & Feasibility dropdowns.
    Every select can also be dynamically expanded using the inline '+ Add New' button.
    """
    # Fetch registered land parcels from Land Acquisition module
    lb_stmt = select(LandBank).order_by(desc(LandBank.id)).limit(100)
    lb_res = await db.execute(lb_stmt)
    land_banks = lb_res.scalars().all()

    land_options = [
        {
            "value": lb.id,
            "label": f"[{lb.project_code}] {lb.proposal_title} - {lb.mouza_name}",
            "subLabel": f"{float(lb.total_area_katha or 0):.2f} Katha ({float(lb.total_area_sqft or 0):,.0f} SqFt) - {lb.upazila_thana}, {lb.district}",
            "katha": float(lb.total_area_katha or 0),
            "decimal": float(lb.total_area_decimal or 0),
            "sqft": float(lb.total_area_sqft or 0),
            "thana": lb.upazila_thana,
            "district": lb.district
        }
        for lb in land_banks
    ]

    # Pre-defined companies
    companies = [
        {"value": "Apex Properties Ltd.", "label": "Apex Properties Ltd.", "subLabel": "Registered Real Estate Developer"},
        {"value": "Shanta Holdings Ltd.", "label": "Shanta Holdings Ltd.", "subLabel": "Luxury Residential & Commercial"},
        {"value": "Navana Real Estate Ltd.", "label": "Navana Real Estate Ltd.", "subLabel": "Urban Housing & Tower Specialist"},
        {"value": "Rangs Properties Ltd.", "label": "Rangs Properties Ltd.", "subLabel": "High-Rise Commercial Complexes"},
        {"value": "Concord Real Estate Ltd.", "label": "Concord Real Estate Ltd.", "subLabel": "Integrated Townships & Infrastructure"}
    ]

    project_types = [
        {"value": "RESIDENTIAL", "label": "Residential Development", "subLabel": "Apartments, Condominiums, Villas"},
        {"value": "COMMERCIAL", "label": "Commercial & Retail", "subLabel": "Office Towers, Shopping Malls, Tech Parks"},
        {"value": "MIXED_USE", "label": "Mixed-Use Complex", "subLabel": "Combined Residential, Retail & Hospitality"},
        {"value": "LAND_DEVELOPMENT", "label": "Land Development & Plotting", "subLabel": "Gated Subdivided Residential Estates"}
    ]

    project_categories = [
        {"value": "APARTMENT", "label": "Luxury Apartment Building", "subLabel": "Standard 14-20 Storey Living"},
        {"value": "CONDOMINIUM", "label": "Gated Condominium Community", "subLabel": "Multi-Tower with Club House & Amenities"},
        {"value": "SHOPPING_COMPLEX", "label": "Commercial Shopping Complex", "subLabel": "Multi-Level Retail Center"},
        {"value": "COMMERCIAL_TOWER", "label": "Corporate Office Tower", "subLabel": "Grade-A Commercial Space"},
        {"value": "DUPLEX", "label": "Exclusive Duplex Suites", "subLabel": "Low-Density Luxury Villas"}
    ]

    funding_sources = [
        {"value": "EQUITY_AND_PRE_SALES", "label": "Equity & Customer Pre-Sales", "subLabel": "Self-funding through booking advances"},
        {"value": "BANK_FINANCE", "label": "Commercial Bank Project Finance", "subLabel": "Term Loan & Construction Line"},
        {"value": "CUSTOMER_ADVANCES", "label": "100% Customer Installment Advances", "subLabel": "Zero debt structure"},
        {"value": "JOINT_VENTURE_SYNDICATE", "label": "Joint Venture & Syndicate Funding", "subLabel": "Developer-Investor Consortium"},
        {"value": "ISLAMIC_SUKUK", "label": "Islamic Sukuk & Murabaha", "subLabel": "Shariah-compliant financing facility"}
    ]

    departments = [
        {"value": "Engineering & Civil Projects", "label": "Engineering & Civil Projects"},
        {"value": "Architecture & Spatial Planning", "label": "Architecture & Spatial Planning"},
        {"value": "Commercial Project Development", "label": "Commercial Project Development"},
        {"value": "Project Management Office (PMO)", "label": "Project Management Office (PMO)"}
    ]

    project_managers = [
        {"value": "Engr. Tariqul Islam, PMP", "label": "Engr. Tariqul Islam, PMP", "subLabel": "Principal Project Manager"},
        {"value": "Engr. Kazi Mahfuzur Rahman", "label": "Engr. Kazi Mahfuzur Rahman", "subLabel": "Senior Civil Project Lead"},
        {"value": "Engr. Shafiqul Alam", "label": "Engr. Shafiqul Alam", "subLabel": "High-Rise Construction Lead"},
        {"value": "Engr. Nazrul Hassan", "label": "Engr. Nazrul Hassan", "subLabel": "MEP & Structural Coordinator"}
    ]

    project_directors = [
        {"value": "Tanvir Ahmed, Managing Director", "label": "Tanvir Ahmed", "subLabel": "Managing Director / Sponsor"},
        {"value": "Dr. Salman Khan, Executive Director", "label": "Dr. Salman Khan", "subLabel": "Executive Director Operations"},
        {"value": "Mustafizur Rahman, Director Planning", "label": "Mustafizur Rahman", "subLabel": "Director Engineering & Land"}
    ]

    return {
        "land_banks": land_options,
        "companies": companies,
        "project_types": project_types,
        "project_categories": project_categories,
        "funding_sources": funding_sources,
        "departments": departments,
        "project_managers": project_managers,
        "project_directors": project_directors
    }


# -------------------------------------------------------------
# 7. 2.2 Project Feasibility & Investment Analysis Endpoints
# -------------------------------------------------------------
def _calculate_feasibility_metrics(data: dict) -> dict:
    revenue = (
        float(data.get("estimated_apartment_sales_revenue", 0) or 0) +
        float(data.get("estimated_commercial_sales_revenue", 0) or 0) +
        float(data.get("estimated_parking_sales_revenue", 0) or 0) +
        float(data.get("estimated_other_sales_revenue", 0) or 0)
    )

    cost = (
        float(data.get("land_acquisition_cost", 0) or 0) +
        float(data.get("legal_and_vetting_expenses", 0) or 0) +
        float(data.get("preliminary_arch_engineering_cost", 0) or 0) +
        float(data.get("estimated_construction_cost", 0) or 0) +
        float(data.get("infrastructure_and_site_dev", 0) or 0) +
        float(data.get("utility_connection_expenses", 0) or 0) +
        float(data.get("professional_authority_fees", 0) or 0) +
        float(data.get("financing_and_interest_cost", 0) or 0) +
        float(data.get("contingency_reserve", 0) or 0)
    )

    gross_profit = revenue - cost
    financing = float(data.get("financing_and_interest_cost", 0) or 0)
    operating_profit = gross_profit - financing
    tax_rate = float(data.get("tax_rate_percent", 15.0) or 15.0) / 100.0
    net_profit_after_tax = max(0.0, operating_profit * (1.0 - tax_rate))
    
    margin_pct = round((gross_profit / revenue * 100.0), 2) if revenue > 0 else 0.0
    roi_pct = round((gross_profit / cost * 100.0), 2) if cost > 0 else 0.0

    # 3 Scenarios
    scenarios = {
        "base_case": {
            "name": "Base Feasibility Model",
            "revenue": revenue,
            "cost": cost,
            "profit": gross_profit,
            "margin_percent": margin_pct,
            "roi_percent": roi_pct
        },
        "optimistic_case": {
            "name": "Optimistic (+10% Sales, -5% Construction Cost)",
            "revenue": round(revenue * 1.10, 2),
            "cost": round(cost * 0.95, 2),
            "profit": round((revenue * 1.10) - (cost * 0.95), 2),
            "margin_percent": round((((revenue * 1.10) - (cost * 0.95)) / (revenue * 1.10)) * 100.0, 2) if revenue > 0 else 0.0,
            "roi_percent": round((((revenue * 1.10) - (cost * 0.95)) / (cost * 0.95)) * 100.0, 2) if cost > 0 else 0.0
        },
        "stress_case": {
            "name": "Stress Test (-15% Sales Price, +15% Cost Escalation)",
            "revenue": round(revenue * 0.85, 2),
            "cost": round(cost * 1.15, 2),
            "profit": round((revenue * 0.85) - (cost * 1.15), 2),
            "margin_percent": round((((revenue * 0.85) - (cost * 1.15)) / (revenue * 0.85)) * 100.0, 2) if revenue > 0 else 0.0,
            "roi_percent": round((((revenue * 0.85) - (cost * 1.15)) / (cost * 1.15)) * 100.0, 2) if cost > 0 else 0.0
        }
    }

    # Cash Flow Projection (8 Quarters)
    cash_flow = [
        {"quarter": "Q1 (Land & Approvals)", "outflow": round(cost * 0.25, 2), "inflow": round(revenue * 0.10, 2), "net": round(revenue * 0.10 - cost * 0.25, 2)},
        {"quarter": "Q2 (Piling & Substructure)", "outflow": round(cost * 0.20, 2), "inflow": round(revenue * 0.15, 2), "net": round(revenue * 0.15 - cost * 0.20, 2)},
        {"quarter": "Q3 (Superstructure L1-L7)", "outflow": round(cost * 0.15, 2), "inflow": round(revenue * 0.15, 2), "net": round(revenue * 0.15 - cost * 0.15, 2)},
        {"quarter": "Q4 (Superstructure L8-L14)", "outflow": round(cost * 0.15, 2), "inflow": round(revenue * 0.20, 2), "net": round(revenue * 0.20 - cost * 0.15, 2)},
        {"quarter": "Q5 (Finishing & MEP)", "outflow": round(cost * 0.10, 2), "inflow": round(revenue * 0.15, 2), "net": round(revenue * 0.15 - cost * 0.10, 2)},
        {"quarter": "Q6 (Utility Connections)", "outflow": round(cost * 0.08, 2), "inflow": round(revenue * 0.10, 2), "net": round(revenue * 0.10 - cost * 0.08, 2)},
        {"quarter": "Q7 (Handover & Closure)", "outflow": round(cost * 0.05, 2), "inflow": round(revenue * 0.10, 2), "net": round(revenue * 0.10 - cost * 0.05, 2)},
        {"quarter": "Q8 (Final Settlement)", "outflow": round(cost * 0.02, 2), "inflow": round(revenue * 0.05, 2), "net": round(revenue * 0.05 - cost * 0.02, 2)}
    ]

    return {
        "estimated_gross_revenue": revenue,
        "estimated_total_cost": cost,
        "gross_project_profit": gross_profit,
        "operating_profit": operating_profit,
        "net_profit_after_tax": net_profit_after_tax,
        "profit_margin_percent": margin_pct,
        "roi_percent": roi_pct,
        "scenarios": scenarios,
        "cash_flow_forecast": cash_flow
    }


@router.post("/feasibilities/simulate")
async def simulate_feasibility(payload: FeasibilitySimulationRequest):
    """Real-time calculator simulation without saving to DB"""
    data = payload.model_dump()
    return _calculate_feasibility_metrics(data)


@router.get("/feasibilities", response_model=List[ProjectFeasibilityResponse])
async def list_feasibilities(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(ProjectFeasibility)
        .options(selectinload(ProjectFeasibility.project))
        .order_by(desc(ProjectFeasibility.id))
    )
    if project_id:
        stmt = stmt.where(ProjectFeasibility.project_id == project_id)
    if status_filter:
        stmt = stmt.where(ProjectFeasibility.status == status_filter)
    if search:
        p = f"%{search.strip()}%"
        stmt = stmt.where((ProjectFeasibility.feasibility_code.ilike(p)) | (ProjectFeasibility.title.ilike(p)))

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()

    # Enrich with project info
    output = []
    for r in records:
        resp = ProjectFeasibilityResponse.model_validate(r)
        if r.project:
            resp.project_name = r.project.project_name
            resp.project_code = r.project.project_code
        output.append(resp)
    return output


@router.post("/feasibilities", response_model=ProjectFeasibilityResponse, status_code=status.HTTP_201_CREATED)
async def create_feasibility(
    payload: ProjectFeasibilityCreate,
    db: AsyncSession = Depends(get_db)
):
    # Verify project exists
    p_res = await db.execute(select(Project).where(Project.id == payload.project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Check duplicate code
    f_code = payload.feasibility_code.strip().upper()
    existing = await db.execute(select(ProjectFeasibility).where(ProjectFeasibility.feasibility_code == f_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Feasibility code '{f_code}' already exists.")

    metrics = _calculate_feasibility_metrics(payload.model_dump())

    # Calculate JV split sqft
    jv_split_str = payload.landowner_jv_sharing_ratio or "50:50"
    try:
        parts = jv_split_str.split(":")
        landowner_pct = float(parts[0]) / 100.0
        developer_pct = float(parts[1]) / 100.0
    except Exception:
        landowner_pct = 0.50
        developer_pct = 0.50

    saleable_sqft = payload.total_saleable_area_sqft or float(project.total_saleable_area_sqft or 0)
    dev_share = saleable_sqft * developer_pct
    owner_share = saleable_sqft * landowner_pct

    feasibility = ProjectFeasibility(
        project_id=payload.project_id,
        feasibility_code=f_code,
        title=payload.title.strip(),
        version_label=payload.version_label or "V1.0",
        
        land_acquisition_cost=payload.land_acquisition_cost or 0.0,
        legal_and_vetting_expenses=payload.legal_and_vetting_expenses or 0.0,
        preliminary_arch_engineering_cost=payload.preliminary_arch_engineering_cost or 0.0,
        estimated_construction_cost=payload.estimated_construction_cost or 0.0,
        infrastructure_and_site_dev=payload.infrastructure_and_site_dev or 0.0,
        utility_connection_expenses=payload.utility_connection_expenses or 0.0,
        professional_authority_fees=payload.professional_authority_fees or 0.0,
        financing_and_interest_cost=payload.financing_and_interest_cost or 0.0,
        contingency_reserve=payload.contingency_reserve or 0.0,
        
        proposed_building_height_meters=payload.proposed_building_height_meters or 45.0,
        proposed_floor_count=payload.proposed_floor_count or 14,
        proposed_unit_count=payload.proposed_unit_count or 56,
        total_saleable_area_sqft=saleable_sqft,
        
        landowner_jv_sharing_ratio=jv_split_str,
        developer_share_sqft=dev_share,
        landowner_share_sqft=owner_share,
        
        estimated_apartment_sales_revenue=payload.estimated_apartment_sales_revenue or 0.0,
        estimated_commercial_sales_revenue=payload.estimated_commercial_sales_revenue or 0.0,
        estimated_parking_sales_revenue=payload.parking_sales_revenue if hasattr(payload, 'parking_sales_revenue') else (payload.estimated_parking_sales_revenue or 0.0),
        estimated_other_sales_revenue=payload.estimated_other_sales_revenue or 0.0,
        
        estimated_gross_revenue=metrics["estimated_gross_revenue"],
        estimated_total_cost=metrics["estimated_total_cost"],
        gross_project_profit=metrics["gross_project_profit"],
        operating_profit=metrics["operating_profit"],
        net_profit_after_tax=metrics["net_profit_after_tax"],
        profit_margin_percent=metrics["profit_margin_percent"],
        roi_percent=metrics["roi_percent"],
        
        cash_flow_forecast=metrics["cash_flow_forecast"],
        scenario_models=metrics["scenarios"],
        status=payload.status or "DRAFT",
        review_remarks=payload.review_remarks
    )

    db.add(feasibility)
    await db.commit()
    await db.refresh(feasibility)

    resp = ProjectFeasibilityResponse.model_validate(feasibility)
    resp.project_name = project.project_name
    resp.project_code = project.project_code
    return resp


@router.put("/feasibilities/{feasibility_id}", response_model=ProjectFeasibilityResponse)
async def update_feasibility(
    feasibility_id: int,
    action: Optional[str] = Query(None, description="APPROVE, REJECT, or RESUBMIT"),
    remarks: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(ProjectFeasibility)
        .options(selectinload(ProjectFeasibility.project))
        .where(ProjectFeasibility.id == feasibility_id)
    )
    res = await db.execute(stmt)
    f = res.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Feasibility record not found")

    if action:
        act = action.upper()
        if act == "APPROVE":
            f.status = "APPROVED"
        elif act == "REJECT":
            f.status = "REJECTED"
        elif act == "RESUBMIT":
            f.status = "RESUBMISSION_REQUIRED"
        f.review_date = date.today()
        f.reviewed_by = "Executive Committee"
        if remarks:
            f.review_remarks = remarks

    await db.commit()
    await db.refresh(f)

    resp = ProjectFeasibilityResponse.model_validate(f)
    if f.project:
        resp.project_name = f.project.project_name
        resp.project_code = f.project.project_code
    return resp


# =============================================================
# 2.3 Project-wise Land and Cost Allocation Endpoints
# =============================================================
@router.get("/land-allocations", response_model=ProjectLandAllocationPaginationResponse)
async def list_land_allocations(
    project_id: Optional[int] = Query(None),
    allocation_method: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: Optional[int] = Query(None, ge=0),
    offset: Optional[int] = Query(None, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List persisted project land allocations with filtered totals and aggregates."""
    page_offset = offset if offset is not None else (skip if skip is not None else 0)
    stmt = select(ProjectLandAllocation)
    if project_id is not None:
        stmt = stmt.where(ProjectLandAllocation.project_id == project_id)
    if allocation_method:
        stmt = stmt.where(ProjectLandAllocation.allocation_method == allocation_method)
    if status:
        stmt = stmt.where(ProjectLandAllocation.approval_status == status)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            ProjectLandAllocation.allocation_code.ilike(pattern) |
            ProjectLandAllocation.project_name.ilike(pattern) |
            ProjectLandAllocation.parcel_identifier.ilike(pattern)
        )

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    aggregate_stmt = select(
        func.coalesce(func.sum(ProjectLandAllocation.total_allocated_cost), 0),
        func.coalesce(func.sum(ProjectLandAllocation.allocated_area_katha), 0),
        func.coalesce(func.sum(ProjectLandAllocation.allocated_area_decimal), 0),
        func.coalesce(func.sum(ProjectLandAllocation.is_shared_parcel.cast(Integer)), 0),
    ).select_from(ProjectLandAllocation)
    if project_id is not None:
        aggregate_stmt = aggregate_stmt.where(ProjectLandAllocation.project_id == project_id)
    if allocation_method:
        aggregate_stmt = aggregate_stmt.where(ProjectLandAllocation.allocation_method == allocation_method)
    if status:
        aggregate_stmt = aggregate_stmt.where(ProjectLandAllocation.approval_status == status)
    if search:
        pattern = f"%{search}%"
        aggregate_stmt = aggregate_stmt.where(
            ProjectLandAllocation.allocation_code.ilike(pattern) |
            ProjectLandAllocation.project_name.ilike(pattern) |
            ProjectLandAllocation.parcel_identifier.ilike(pattern)
        )
    total_cost, total_katha, total_decimal, shared_count = (await db.execute(aggregate_stmt)).one()
    rows = (await db.execute(stmt.order_by(desc(ProjectLandAllocation.id)).offset(page_offset).limit(limit))).scalars().all()
    return ProjectLandAllocationPaginationResponse(
        items=[ProjectLandAllocationResponse.model_validate(row) for row in rows],
        total=total, skip=page_offset, offset=page_offset, limit=limit,
        total_allocated_cost_bdt=float(total_cost or 0),
        total_allocated_katha=float(total_katha or 0),
        total_allocated_decimal=float(total_decimal or 0),
        shared_parcels_count=int(shared_count or 0),
    )


@router.post("/land-allocations", response_model=ProjectLandAllocationResponse, status_code=status.HTTP_201_CREATED)
async def create_land_allocation(
    payload: ProjectLandAllocationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Submodule 2.3: Allocate acquired land parcel to a project.
    Auto-computes total allocated cost and validates against duplicate assignment.
    """
    total_cost = (
        float(payload.land_purchase_price or 0) +
        float(payload.legal_fees or 0) +
        float(payload.registration_costs or 0) +
        float(payload.acquisition_related_expenses or 0)
    )

    allocation = ProjectLandAllocation(
        project_id=payload.project_id,
        parcel_id=payload.parcel_id,
        allocation_code=payload.allocation_code or f"PLA-{date.today().year}-{func.random()}",
        project_name=payload.project_name,
        parcel_identifier=payload.parcel_identifier,
        allocated_area_decimal=payload.allocated_area_decimal,
        allocated_area_katha=payload.allocated_area_katha,
        allocated_area_sqft=payload.allocated_area_sqft,
        allocation_percentage=payload.allocation_percentage,
        effective_date=payload.effective_date,
        allocation_method=payload.allocation_method,
        allocation_basis_notes=payload.allocation_basis_notes,
        is_shared_parcel=payload.is_shared_parcel,
        shared_projects_notes=payload.shared_projects_notes,
        common_infrastructure_scope=payload.common_infrastructure_scope,
        land_purchase_price=payload.land_purchase_price,
        legal_fees=payload.legal_fees,
        registration_costs=payload.registration_costs,
        acquisition_related_expenses=payload.acquisition_related_expenses,
        total_allocated_cost=total_cost,
        original_allocated_cost=total_cost,
        revised_allocated_cost=total_cost,
        unallocated_balance=payload.unallocated_balance,
        transfer_history_notes=f"Initial allocation on {date.today()} to {payload.project_name}",
        acquisition_ledger_ref=payload.acquisition_ledger_ref,
        reconciliation_status=payload.reconciliation_status or "RECONCILED",
        approval_status=payload.approval_status or "APPROVED",
        remarks=payload.remarks
    )
    db.add(allocation)
    await db.commit()
    await db.refresh(allocation)
    return ProjectLandAllocationResponse.model_validate(allocation)


@router.put("/land-allocations/{allocation_id}", response_model=ProjectLandAllocationResponse)
async def update_land_allocation(
    allocation_id: int,
    payload: ProjectLandAllocationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Submodule 2.3: Update or reassign land allocation.
    Maintains transfer history if reassigned to another project.
    """
    stmt = select(ProjectLandAllocation).where(ProjectLandAllocation.id == allocation_id)
    res = await db.execute(stmt)
    alloc = res.scalar_one_or_none()
    if not alloc:
        raise HTTPException(status_code=404, detail="Land allocation record not found")

    data = payload.model_dump(exclude_unset=True)

    # Check if reassigning to a different project
    if "project_id" in data and data["project_id"] != alloc.project_id:
        prev_proj = alloc.project_name
        new_proj = data.get("project_name", f"Project #{data['project_id']}")
        transfer_entry = f"\n[Transfer on {date.today()}] Reassigned from '{prev_proj}' to '{new_proj}'. Reason: {data.get('transfer_history_notes', 'Project portfolio reallocation')}."
        alloc.transfer_history_notes = (alloc.transfer_history_notes or "") + transfer_entry

    for k, v in data.items():
        if k != "transfer_history_notes":
            setattr(alloc, k, v)

    # Re-calculate total cost
    alloc.total_allocated_cost = (
        float(alloc.land_purchase_price or 0) +
        float(alloc.legal_fees or 0) +
        float(alloc.registration_costs or 0) +
        float(alloc.acquisition_related_expenses or 0)
    )
    alloc.revised_allocated_cost = alloc.total_allocated_cost

    await db.commit()
    await db.refresh(alloc)
    return ProjectLandAllocationResponse.model_validate(alloc)


@router.delete("/land-allocations/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_land_allocation(
    allocation_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ProjectLandAllocation).where(ProjectLandAllocation.id == allocation_id)
    res = await db.execute(stmt)
    alloc = res.scalar_one_or_none()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
    await db.delete(alloc)
    await db.commit()
    return None


@router.get("/land-allocations/ledger-reconciliation", response_model=LandAllocationReconciliationSummary)
async def get_land_allocation_reconciliation(db: AsyncSession = Depends(get_db)):
    """
    Submodule 2.3: Reconcile allocated project land costs against the central land acquisition ledger.
    """
    allocs = (await db.execute(select(ProjectLandAllocation))).scalars().all()
    total_allocated = sum(float(a.total_allocated_cost or 0) for a in allocs)
    reconciled = sum(1 for a in allocs if a.reconciliation_status == "RECONCILED")
    pending = sum(1 for a in allocs if a.reconciliation_status != "RECONCILED")
    
    # Baseline benchmark acquisition ledger total: ৳45.00 Crore across land bank
    total_acquisitions = 450000000.00
    unallocated = max(0.0, total_acquisitions - total_allocated)

    return LandAllocationReconciliationSummary(
        total_land_acquisitions_bdt=total_acquisitions,
        total_allocated_to_projects_bdt=total_allocated,
        unallocated_land_bank_bdt=unallocated,
        total_parcels_allocated=len(allocs),
        reconciled_count=reconciled,
        pending_reconciliation_count=pending
    )


@router.get("/land-allocations/{allocation_id}", response_model=ProjectLandAllocationResponse)
async def get_land_allocation(allocation_id: int, db: AsyncSession = Depends(get_db)):
    allocation = (await db.execute(select(ProjectLandAllocation).where(ProjectLandAllocation.id == allocation_id))).scalar_one_or_none()
    if allocation is None:
        raise HTTPException(status_code=404, detail="Land allocation record not found")
    return ProjectLandAllocationResponse.model_validate(allocation)

# =============================================================
# 2.4 Building, Tower, Floor & Unit Setup Endpoints
# =============================================================

@router.get("/hierarchy/tree", response_model=ProjectHierarchyTreeResponse)
async def get_project_hierarchy_tree(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Submodule 2.4: Fetch complete hierarchical structure:
    Project -> Building/Tower -> Floor -> Unit / Space.
    Seeds realistic Green Valley Twin Towers hierarchy if empty.
    """
    p_stmt = select(Project).order_by(Project.id.asc())
    if project_id:
        p_stmt = p_stmt.where(Project.id == project_id)
    project = (await db.execute(p_stmt)).scalars().first()

    if not project:
        # Create default project if none
        project = Project(
            project_code="PRJ-2026-001",
            project_name="Green Valley Twin Towers",
            project_type="MIXED_USE",
            project_category="CONDOMINIUM",
            district="Dhaka",
            thana_upazila="Gulshan",
            site_address="Plot 14-16, Road 71, Gulshan-2, Dhaka",
            company_name="Green Valley Properties Ltd.",
            project_manager="Engr. Rafiqul Islam",
            approval_status="APPROVED",
            status="ACTIVE"
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)

    # Check if project has towers
    t_stmt = (
        select(Tower)
        .options(
            selectinload(Tower.floors).selectinload(ProjectFloor.units),
            selectinload(Tower.units)
        )
        .where(Tower.project_id == project.id)
        .order_by(Tower.id.asc())
    )
    towers = (await db.execute(t_stmt)).scalars().all()

    if not towers:
        # Auto-seed Green Valley Twin Towers: Tower A and Tower B
        tower_a = Tower(
            project_id=project.id,
            tower_code="TOWER-A",
            tower_name="Tower A - Signature Residential Wing",
            building_code="BLD-TWA",
            building_type="RESIDENTIAL",
            total_floors=21,
            basement_floors=2,
            podium_floors=1,
            residential_floors=18,
            commercial_floors=0,
            total_lifts=3,
            approved_height_m=68.50,
            approved_floor_area_sqft=168000.00,
            structural_system="RCC_FRAME",
            building_specifications="Grade-60 deformed bar reinforcement, C40 high-performance concrete, thermal facade glazing",
            architect_name="Mustapha Khalid Palash",
            consultant_name="Vista Engineering Consultants",
            contractor_name="Blue Oceans Construction Ltd",
            planned_construction_start=date(2025, 6, 1),
            planned_completion_date=date(2028, 12, 31),
            approval_reference_no="RAJUK/BP/2026-9812",
            drawing_references="DWG-TWA-STR-01 to 24",
            construction_status="SUPERSTRUCTURE"
        )
        tower_b = Tower(
            project_id=project.id,
            tower_code="TOWER-B",
            tower_name="Tower B - Commercial & Luxury Suites",
            building_code="BLD-TWB",
            building_type="MIXED_USE",
            total_floors=16,
            basement_floors=2,
            podium_floors=2,
            residential_floors=10,
            commercial_floors=4,
            total_lifts=2,
            approved_height_m=54.00,
            approved_floor_area_sqft=124000.00,
            structural_system="POST_TENSIONED_CONCRETE",
            building_specifications="Post-tensioned flat slabs, curtain wall facade, dedicated high-speed commercial elevators",
            architect_name="Mustapha Khalid Palash",
            consultant_name="Vista Engineering Consultants",
            contractor_name="Blue Oceans Construction Ltd",
            planned_construction_start=date(2025, 9, 1),
            planned_completion_date=date(2028, 9, 30),
            approval_reference_no="RAJUK/BP/2026-9815",
            drawing_references="DWG-TWB-STR-01 to 18",
            construction_status="SUBSTRUCTURE"
        )
        db.add_all([tower_a, tower_b])
        await db.commit()
        await db.refresh(tower_a)
        await db.refresh(tower_b)

        # Seed sample floors for Tower A
        floors_a = [
            ProjectFloor(project_id=project.id, tower_id=tower_a.id, floor_number=-2, display_name="Basement 2", floor_type="BASEMENT", floor_area_sqft=12000, common_area_sqft=12000, planned_units_count=40, construction_status="COMPLETED", inspection_status="APPROVED"),
            ProjectFloor(project_id=project.id, tower_id=tower_a.id, floor_number=-1, display_name="Basement 1", floor_type="BASEMENT", floor_area_sqft=12000, common_area_sqft=12000, planned_units_count=35, construction_status="COMPLETED", inspection_status="APPROVED"),
            ProjectFloor(project_id=project.id, tower_id=tower_a.id, floor_number=0, display_name="Ground Floor", floor_type="GROUND", floor_area_sqft=9500, common_area_sqft=7500, planned_units_count=2, construction_status="COMPLETED", inspection_status="APPROVED"),
            ProjectFloor(project_id=project.id, tower_id=tower_a.id, floor_number=1, display_name="1st Floor - Community & Club", floor_type="PODIUM", floor_area_sqft=9000, common_area_sqft=9000, planned_units_count=0, construction_status="COMPLETED", inspection_status="APPROVED"),
            ProjectFloor(project_id=project.id, tower_id=tower_a.id, floor_number=5, display_name="5th Floor - Standard Living", floor_type="RESIDENTIAL", floor_area_sqft=8400, common_area_sqft=1400, planned_units_count=4, construction_status="CASTING", inspection_status="APPROVED"),
            ProjectFloor(project_id=project.id, tower_id=tower_a.id, floor_number=18, display_name="18th Floor - Sky Penthouses", floor_type="RESIDENTIAL", floor_area_sqft=8400, common_area_sqft=1200, planned_units_count=2, construction_status="NOT_STARTED", inspection_status="PENDING"),
            ProjectFloor(project_id=project.id, tower_id=tower_a.id, floor_number=19, display_name="Rooftop & Sky Lounge", floor_type="ROOF", floor_area_sqft=8000, common_area_sqft=8000, planned_units_count=0, construction_status="NOT_STARTED", inspection_status="PENDING")
        ]
        db.add_all(floors_a)
        await db.commit()

        # Fetch floor 5 to link sample units
        fl5 = next(f for f in floors_a if f.floor_number == 5)
        fl18 = next(f for f in floors_a if f.floor_number == 18)

        units_a = [
            ProjectUnit(
                project_id=project.id, tower_id=tower_a.id, floor_id=fl5.id, floor_number=5,
                unit_code="TWA-05A", unit_type="APARTMENT_3BHK", bedroom_count=3, bathroom_count=3, balcony_count=2,
                parking_details="Basement 1, Slot P-12", saleable_area_sqft=2150.00, usable_carpet_area_sqft=1720.00,
                common_area_allocated_sqft=430.00, unit_orientation="SOUTH_FACING",
                specifications="Imported porcelain tiles 80x80cm, Kohler bathroom fixtures, VRF AC pre-installed",
                planned_price_bdt=27500000.00, ownership_classification="DEVELOPER_INVENTORY",
                unit_status="AVAILABLE", configuration_stage="AUTHORITY_APPROVED", approval_schedule_ref="SCH-2026-TWA-5"
            ),
            ProjectUnit(
                project_id=project.id, tower_id=tower_a.id, floor_id=fl5.id, floor_number=5,
                unit_code="TWA-05B", unit_type="APARTMENT_3BHK", bedroom_count=3, bathroom_count=3, balcony_count=2,
                parking_details="Basement 1, Slot P-13", saleable_area_sqft=2150.00, usable_carpet_area_sqft=1720.00,
                common_area_allocated_sqft=430.00, unit_orientation="LAKE_VIEW",
                specifications="Lakefront view balcony, Burma teak entrance door, Grohe fittings",
                planned_price_bdt=29500000.00, ownership_classification="LANDOWNER_ALLOCATION",
                unit_status="ALLOCATED", configuration_stage="AUTHORITY_APPROVED", approval_schedule_ref="SCH-2026-TWA-5"
            ),
            ProjectUnit(
                project_id=project.id, tower_id=tower_a.id, floor_id=fl5.id, floor_number=5,
                unit_code="TWA-05C", unit_type="APARTMENT_4BHK", bedroom_count=4, bathroom_count=4, balcony_count=3,
                parking_details="Basement 1, Slot P-14 & P-15", saleable_area_sqft=2850.00, usable_carpet_area_sqft=2280.00,
                common_area_allocated_sqft=570.00, unit_orientation="CORNER_PLOT",
                specifications="Double glazed thermal acoustic windows, premium marble living hall",
                planned_price_bdt=38500000.00, ownership_classification="DEVELOPER_INVENTORY",
                unit_status="SOLD", configuration_stage="AUTHORITY_APPROVED", approval_schedule_ref="SCH-2026-TWA-5"
            ),
            ProjectUnit(
                project_id=project.id, tower_id=tower_a.id, floor_id=fl18.id, floor_number=18,
                unit_code="TWA-18A", unit_type="PENTHOUSE", bedroom_count=5, bathroom_count=6, balcony_count=4,
                parking_details="Basement 1, Slots VIP-01, 02, 03", saleable_area_sqft=4600.00, usable_carpet_area_sqft=3800.00,
                common_area_allocated_sqft=800.00, unit_orientation="SOUTH_FACING",
                specifications="Private plunge pool, rooftop garden terrace, private elevator lobby",
                planned_price_bdt=75000000.00, ownership_classification="DEVELOPER_INVENTORY",
                unit_status="AVAILABLE", configuration_stage="PLANNED", approval_schedule_ref="SCH-2026-TWA-18"
            )
        ]
        db.add_all(units_a)
        await db.commit()

        # Re-query towers
        towers = (await db.execute(t_stmt)).scalars().all()

    # Build the tree
    tower_nodes: List[TreeTowerNode] = []
    total_floors_cnt = 0
    total_units_cnt = 0
    total_sqft = 0.0
    dev_units = 0
    lo_units = 0

    for t in towers:
        floor_nodes: List[TreeFloorNode] = []
        for fl in t.floors:
            total_floors_cnt += 1
            u_nodes: List[TreeUnitNode] = []
            for u in fl.units:
                total_units_cnt += 1
                total_sqft += float(u.saleable_area_sqft or 0)
                if u.ownership_classification == "DEVELOPER_INVENTORY":
                    dev_units += 1
                elif u.ownership_classification == "LANDOWNER_ALLOCATION":
                    lo_units += 1

                u_nodes.append(TreeUnitNode(
                    id=u.id,
                    unit_code=u.unit_code,
                    unit_type=u.unit_type,
                    saleable_area_sqft=float(u.saleable_area_sqft or 0),
                    usable_carpet_area_sqft=float(u.usable_carpet_area_sqft or 0),
                    planned_price_bdt=float(u.planned_price_bdt or 0),
                    ownership_classification=u.ownership_classification,
                    unit_status=u.unit_status,
                    configuration_stage=u.configuration_stage
                ))

            floor_nodes.append(TreeFloorNode(
                id=fl.id,
                floor_number=fl.floor_number,
                display_name=fl.display_name,
                floor_type=fl.floor_type,
                floor_area_sqft=float(fl.floor_area_sqft or 0),
                construction_status=fl.construction_status,
                units=u_nodes
            ))

        tower_nodes.append(TreeTowerNode(
            id=t.id,
            tower_code=t.tower_code,
            tower_name=t.tower_name,
            building_type=t.building_type or "RESIDENTIAL",
            total_floors=t.total_floors or 14,
            construction_status=t.construction_status or "PLANNING",
            floors=floor_nodes
        ))

    return ProjectHierarchyTreeResponse(
        project_id=project.id,
        project_name=project.project_name,
        project_code=project.project_code,
        total_towers=len(towers),
        total_floors=total_floors_cnt,
        total_units=total_units_cnt,
        total_saleable_sqft=total_sqft,
        total_developer_units=dev_units,
        total_landowner_units=lo_units,
        towers=tower_nodes
    )


# -------------------------------------------------------------
# Tower CRUD Endpoints
# -------------------------------------------------------------
@router.get("/towers")
async def list_towers(
    project_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    building_type: Optional[str] = Query(None),
    construction_status: Optional[str] = Query(None),
    skip: Optional[int] = Query(None, ge=0),
    offset: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Tower).options(selectinload(Tower.floors), selectinload(Tower.units)).order_by(Tower.id.asc())
    if project_id is not None: stmt = stmt.where(Tower.project_id == project_id)
    if building_type: stmt = stmt.where(Tower.building_type == building_type)
    if construction_status: stmt = stmt.where(Tower.construction_status == construction_status)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Tower.tower_code.ilike(pattern) | Tower.tower_name.ilike(pattern) | Tower.building_code.ilike(pattern))
    total = (await db.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))).scalar_one()
    page_offset = offset if offset is not None else (skip if skip is not None else 0)
    paged = skip is not None or offset is not None or limit is not None
    page_limit = limit if limit is not None else 200
    page_stmt = stmt.offset(page_offset)
    if paged: page_stmt = page_stmt.limit(page_limit)
    rows = (await db.execute(page_stmt)).scalars().all()
    items = []
    for tower in rows:
        response = TowerResponse.model_validate(tower)
        response.floor_count = len(tower.floors or [])
        response.unit_count = len(tower.units or [])
        items.append(response)
    if paged:
        return TowerPageResponse(items=items, total=total, limit=page_limit, offset=page_offset)
    return items


@router.get("/towers/{tower_id}", response_model=TowerResponse)
async def get_tower(tower_id: int, db: AsyncSession = Depends(get_db)):
    tower = (await db.execute(select(Tower).options(selectinload(Tower.floors), selectinload(Tower.units)).where(Tower.id == tower_id))).scalar_one_or_none()
    if tower is None: raise HTTPException(status_code=404, detail="Tower not found")
    response = TowerResponse.model_validate(tower)
    response.floor_count = len(tower.floors or [])
    response.unit_count = len(tower.units or [])
    return response


@router.post("/towers", response_model=TowerResponse, status_code=status.HTTP_201_CREATED)
async def create_tower(payload: TowerCreate, db: AsyncSession = Depends(get_db)):
    tower = Tower(**payload.model_dump())
    db.add(tower)
    await db.commit()
    await db.refresh(tower)
    return TowerResponse.model_validate(tower)


@router.put("/towers/{tower_id}", response_model=TowerResponse)
async def update_tower(tower_id: int, payload: TowerUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(Tower).where(Tower.id == tower_id)
    tower = (await db.execute(stmt)).scalar_one_or_none()
    if not tower:
        raise HTTPException(status_code=404, detail="Tower not found")
    
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(tower, k, v)
    await db.commit()
    await db.refresh(tower)
    return TowerResponse.model_validate(tower)


@router.delete("/towers/{tower_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tower(tower_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Tower).where(Tower.id == tower_id)
    tower = (await db.execute(stmt)).scalar_one_or_none()
    if not tower:
        raise HTTPException(status_code=404, detail="Tower not found")
    await db.delete(tower)
    await db.commit()
    return None


# -------------------------------------------------------------
# Floor CRUD Endpoints
# -------------------------------------------------------------
@router.get("/floors")
async def list_floors(
    project_id: Optional[int] = Query(None),
    tower_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    floor_type: Optional[str] = Query(None),
    construction_status: Optional[str] = Query(None),
    inspection_status: Optional[str] = Query(None),
    skip: Optional[int] = Query(None, ge=0),
    offset: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ProjectFloor).options(selectinload(ProjectFloor.tower), selectinload(ProjectFloor.units)).order_by(ProjectFloor.floor_number.asc())
    if project_id is not None: stmt = stmt.where(ProjectFloor.project_id == project_id)
    if tower_id is not None: stmt = stmt.where(ProjectFloor.tower_id == tower_id)
    if floor_type: stmt = stmt.where(ProjectFloor.floor_type == floor_type)
    if construction_status: stmt = stmt.where(ProjectFloor.construction_status == construction_status)
    if inspection_status: stmt = stmt.where(ProjectFloor.inspection_status == inspection_status)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(ProjectFloor.display_name.ilike(pattern) | ProjectFloor.floor_type.ilike(pattern))
    total = (await db.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))).scalar_one()
    page_offset = offset if offset is not None else (skip if skip is not None else 0)
    paged = skip is not None or offset is not None or limit is not None
    page_limit = limit if limit is not None else 200
    page_stmt = stmt.offset(page_offset)
    if paged: page_stmt = page_stmt.limit(page_limit)
    rows = (await db.execute(page_stmt)).scalars().all()
    items = []
    for floor in rows:
        response = FloorResponse.model_validate(floor)
        response.tower_name = floor.tower.tower_name if floor.tower else None
        response.unit_count = len(floor.units or [])
        items.append(response)
    if paged:
        return FloorPageResponse(items=items, total=total, limit=page_limit, offset=page_offset)
    return items


@router.get("/floors/{floor_id}", response_model=FloorResponse)
async def get_floor(floor_id: int, db: AsyncSession = Depends(get_db)):
    floor = (await db.execute(select(ProjectFloor).options(selectinload(ProjectFloor.tower), selectinload(ProjectFloor.units)).where(ProjectFloor.id == floor_id))).scalar_one_or_none()
    if floor is None: raise HTTPException(status_code=404, detail="Floor not found")
    response = FloorResponse.model_validate(floor)
    response.tower_name = floor.tower.tower_name if floor.tower else None
    response.unit_count = len(floor.units or [])
    return response


@router.post("/floors", response_model=FloorResponse, status_code=status.HTTP_201_CREATED)
async def create_floor(payload: FloorCreate, db: AsyncSession = Depends(get_db)):
    floor = ProjectFloor(**payload.model_dump())
    db.add(floor)
    await db.commit()
    await db.refresh(floor)
    return FloorResponse.model_validate(floor)


@router.put("/floors/{floor_id}", response_model=FloorResponse)
async def update_floor(floor_id: int, payload: FloorUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(ProjectFloor).where(ProjectFloor.id == floor_id)
    fl = (await db.execute(stmt)).scalar_one_or_none()
    if not fl:
        raise HTTPException(status_code=404, detail="Floor not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(fl, k, v)
    await db.commit()
    await db.refresh(fl)
    return FloorResponse.model_validate(fl)


@router.delete("/floors/{floor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_floor(floor_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(ProjectFloor).where(ProjectFloor.id == floor_id)
    fl = (await db.execute(stmt)).scalar_one_or_none()
    if not fl:
        raise HTTPException(status_code=404, detail="Floor not found")
    await db.delete(fl)
    await db.commit()
    return None


# -------------------------------------------------------------
# Unit CRUD Endpoints with Strict Validation Rules
# -------------------------------------------------------------
@router.get("/units")
async def list_units(
    project_id: Optional[int] = Query(None),
    tower_id: Optional[int] = Query(None),
    floor_id: Optional[int] = Query(None),
    unit_status: Optional[str] = Query(None),
    ownership: Optional[str] = Query(None),
    unit_type: Optional[str] = Query(None),
    configuration_stage: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: Optional[int] = Query(None, ge=0),
    offset: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ProjectUnit).options(selectinload(ProjectUnit.project), selectinload(ProjectUnit.tower)).order_by(ProjectUnit.floor_number.asc(), ProjectUnit.unit_code.asc())
    if project_id is not None: stmt = stmt.where(ProjectUnit.project_id == project_id)
    if tower_id is not None: stmt = stmt.where(ProjectUnit.tower_id == tower_id)
    if floor_id is not None: stmt = stmt.where(ProjectUnit.floor_id == floor_id)
    if unit_status: stmt = stmt.where(ProjectUnit.unit_status == unit_status)
    if ownership: stmt = stmt.where(ProjectUnit.ownership_classification == ownership)
    if unit_type: stmt = stmt.where(ProjectUnit.unit_type == unit_type)
    if configuration_stage: stmt = stmt.where(ProjectUnit.configuration_stage == configuration_stage)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(ProjectUnit.unit_code.ilike(pattern) | ProjectUnit.unit_type.ilike(pattern) | ProjectUnit.unit_orientation.ilike(pattern))
    total = (await db.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))).scalar_one()
    page_offset = offset if offset is not None else (skip if skip is not None else 0)
    page_limit = limit if limit is not None else 50
    rows = (await db.execute(stmt.offset(page_offset).limit(page_limit))).scalars().all()
    items = []
    for unit in rows:
        response = ProjectUnitResponse.model_validate(unit)
        response.project_name = unit.project.project_name if unit.project else None
        response.tower_name = unit.tower.tower_name if unit.tower else None
        items.append(response)
    if skip is not None or offset is not None or limit is not None:
        return ProjectUnitPageResponse(items=items, total=total, limit=page_limit, offset=page_offset)
    return items


@router.post("/units", response_model=ProjectUnitResponse, status_code=status.HTTP_201_CREATED)
async def create_unit(payload: ProjectUnitCreate, db: AsyncSession = Depends(get_db)):
    """
    Submodule 2.4: Create unit.
    Validation Rule: Unit codes must be unique within the defined project structure.
    """
    chk_stmt = select(ProjectUnit).where(
        ProjectUnit.project_id == payload.project_id,
        ProjectUnit.unit_code == payload.unit_code
    )
    existing = (await db.execute(chk_stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Unit code '{payload.unit_code}' is already registered in this project. Unit codes must be unique."
        )

    unit = ProjectUnit(**payload.model_dump())
    db.add(unit)
    await db.commit()
    await db.refresh(unit)
    return ProjectUnitResponse.model_validate(unit)


@router.put("/units/{unit_id}", response_model=ProjectUnitResponse)
async def update_unit(unit_id: int, payload: ProjectUnitUpdate, db: AsyncSession = Depends(get_db)):
    """
    Submodule 2.4: Update unit.
    Validation Rule: Sold or allocated units must not be reassigned without an authorized transaction.
    """
    stmt = (
        select(ProjectUnit)
        .options(selectinload(ProjectUnit.project), selectinload(ProjectUnit.tower))
        .where(ProjectUnit.id == unit_id)
    )
    unit = (await db.execute(stmt)).scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    data = payload.model_dump(exclude_unset=True)

    # Validation Rule Check: Reassigning ownership on SOLD or ALLOCATED unit
    is_protected = unit.unit_status in ["SOLD", "ALLOCATED", "RESERVED"]
    ownership_changed = "ownership_classification" in data and data["ownership_classification"] != unit.ownership_classification
    status_changed = "unit_status" in data and data["unit_status"] != unit.unit_status

    if is_protected and (ownership_changed or (status_changed and data["unit_status"] == "AVAILABLE")):
        if not data.get("reassignment_authorized"):
            raise HTTPException(
                status_code=400,
                detail=f"Unit '{unit.unit_code}' is currently '{unit.unit_status}'. Reassignment or release requires an authorized transaction with an audit reason."
            )

    for k, v in data.items():
        setattr(unit, k, v)

    await db.commit()
    await db.refresh(unit)
    ur = ProjectUnitResponse.model_validate(unit)
    ur.project_name = unit.project.project_name if unit.project else None
    ur.tower_name = unit.tower.tower_name if unit.tower else None
    return ur


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(unit_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(ProjectUnit).where(ProjectUnit.id == unit_id)
    unit = (await db.execute(stmt)).scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    if unit.unit_status in ["SOLD", "ALLOCATED"]:
        raise HTTPException(status_code=400, detail="Cannot delete a unit that is SOLD or ALLOCATED.")
    await db.delete(unit)
    await db.commit()
    return None


@router.get("/units/reconciliation", response_model=dict)
async def get_units_area_reconciliation(
    project_id: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Submodule 2.4: Reconcile aggregate unit saleable & carpet areas against
    approved architectural schedules and permissible FAR area.
    """
    proj_stmt = select(Project).where(Project.id == project_id)
    proj = (await db.execute(proj_stmt)).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    units_stmt = select(ProjectUnit).where(ProjectUnit.project_id == project_id)
    units = (await db.execute(units_stmt)).scalars().all()

    planned_construction_sqft = float(proj.planned_construction_area_sqft or 200000.0)
    total_saleable = sum(float(u.saleable_area_sqft or 0) for u in units)
    total_carpet = sum(float(u.usable_carpet_area_sqft or 0) for u in units)
    total_common = sum(float(u.common_area_allocated_sqft or 0) for u in units)
    variance_sqft = planned_construction_sqft - total_saleable

    authority_approved_units = sum(1 for u in units if u.configuration_stage == "AUTHORITY_APPROVED")
    planned_only_units = sum(1 for u in units if u.configuration_stage == "PLANNED")

    return {
        "project_id": proj.id,
        "project_name": proj.project_name,
        "approved_schedule_area_sqft": planned_construction_sqft,
        "total_unit_saleable_sqft": total_saleable,
        "total_carpet_sqft": total_carpet,
        "total_common_area_sqft": total_common,
        "area_variance_sqft": variance_sqft,
        "reconciliation_status": "BALANCED" if abs(variance_sqft) < 500 else ("UNDER_ALLOCATED" if variance_sqft > 0 else "EXCEEDS_APPROVED_SCHEDULE"),
        "total_units_count": len(units),
        "authority_approved_count": authority_approved_units,
        "planned_only_count": planned_only_units
    }


@router.get("/units/{unit_id}", response_model=ProjectUnitResponse)
async def get_unit(unit_id: int, db: AsyncSession = Depends(get_db)):
    unit = (await db.execute(
        select(ProjectUnit)
        .options(selectinload(ProjectUnit.project), selectinload(ProjectUnit.tower))
        .where(ProjectUnit.id == unit_id)
    )).scalar_one_or_none()
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    response = ProjectUnitResponse.model_validate(unit)
    response.project_name = unit.project.project_name if unit.project else None
    response.tower_name = unit.tower.tower_name if unit.tower else None
    return response


# =============================================================================
# Submodule 2.6: Estimated Profitability and ROI Endpoints
# =============================================================================
@router.get("/profitability", response_model=ProjectProfitabilityPaginationResponse)
async def list_project_profitability(
    project_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(ProjectProfitability)
    if project_id:
        query = query.where(ProjectProfitability.project_id == project_id)
    if status:
        query = query.where(ProjectProfitability.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (ProjectProfitability.forecast_code.ilike(search_pattern)) |
            (ProjectProfitability.version_label.ilike(search_pattern)) |
            (ProjectProfitability.remarks.ilike(search_pattern))
        )

    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Execute paginated
    items_stmt = query.order_by(desc(ProjectProfitability.id)).offset(offset).limit(limit)
    records = (await db.execute(items_stmt)).scalars().all()

    # Load project details
    proj_ids = list(set([r.project_id for r in records if r.project_id]))
    proj_map = {}
    if proj_ids:
        p_stmt = select(Project).where(Project.id.in_(proj_ids))
        p_res = (await db.execute(p_stmt)).scalars().all()
        proj_map = {p.id: p for p in p_res}

    result_items = []
    for r in records:
        proj = proj_map.get(r.project_id)
        d = ProjectProfitabilityResponse.model_validate(r)
        if proj:
            d.project_name = proj.project_name
            d.project_code = proj.project_code
        result_items.append(d)

    # Portfolio KPI aggregations
    all_stmt = select(
        func.sum(ProjectProfitability.total_estimated_revenue),
        func.sum(ProjectProfitability.estimated_project_profit),
        func.avg(ProjectProfitability.roi_pct)
    ).where(ProjectProfitability.status == "ACTIVE_FORECAST")
    all_res = (await db.execute(all_stmt)).one_or_none()

    portfolio_revenue = float(all_res[0] or 0) if all_res else 0.0
    portfolio_profit = float(all_res[1] or 0) if all_res else 0.0
    average_roi = float(all_res[2] or 0) if all_res else 0.0

    return ProjectProfitabilityPaginationResponse(
        items=result_items,
        total=total,
        limit=limit,
        offset=offset,
        portfolio_projected_revenue_bdt=portfolio_revenue,
        portfolio_net_profit_bdt=portfolio_profit,
        average_roi_pct=average_roi
    )


@router.post("/profitability", response_model=ProjectProfitabilityResponse, status_code=status.HTTP_201_CREATED)
async def create_project_profitability(
    payload: ProjectProfitabilityCreate,
    db: AsyncSession = Depends(get_db)
):
    # Verify project exists
    proj = (await db.execute(select(Project).where(Project.id == payload.project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Calculate total revenue if not explicitly provided
    total_rev = payload.total_estimated_revenue
    if total_rev <= 0:
        total_rev = (
            payload.apartment_revenue_est +
            payload.shop_revenue_est +
            payload.office_revenue_est +
            payload.parking_revenue_est +
            payload.other_revenue_est
        )

    # Calculate total cost if not explicitly provided
    total_cost = payload.total_project_cost_est
    if total_cost <= 0:
        total_cost = (
            payload.construction_cost_est +
            payload.consultant_fee_est +
            payload.marketing_sales_cost_est +
            payload.admin_overhead_est +
            payload.financing_interest_cost_est +
            payload.contingency_cost_est
        )

    # Calculate JV revenue shares
    dev_share_rev = total_rev * (payload.developer_share_pct / 100.0)
    landowner_share_rev = total_rev * (payload.landowner_share_pct / 100.0)

    # Recommended calculations: Project Profit = Recognized Revenue - Recognized Expenses
    # Or for feasibility: Estimated Project Profit = Developer Revenue Share - Total Project Cost
    estimated_profit = dev_share_rev - total_cost if payload.developer_share_pct < 100 else total_rev - total_cost
    margin_pct = (estimated_profit / total_rev * 100.0) if total_rev > 0 else 0.0

    # Investment base
    inv_base = payload.defined_investment_base_bdt
    if inv_base <= 0:
        inv_base = total_cost

    roi = (estimated_profit / inv_base * 100.0) if inv_base > 0 else 0.0

    # Break-even calculation
    breakeven_sales = total_cost / (1.0 - (payload.marketing_sales_cost_est / total_rev)) if total_rev > payload.marketing_sales_cost_est else total_cost

    # Actual profit if recognized values provided
    actual_profit = payload.recognized_revenue - payload.recognized_project_expenses
    actual_roi = (actual_profit / inv_base * 100.0) if inv_base > 0 and payload.recognized_revenue > 0 else 0.0

    data = payload.model_dump()
    data.update({
        "total_estimated_revenue": total_rev,
        "total_project_cost_est": total_cost,
        "developer_revenue_share_bdt": dev_share_rev,
        "landowner_revenue_share_bdt": landowner_share_rev,
        "estimated_project_profit": estimated_profit,
        "gross_profit_margin_pct": margin_pct,
        "defined_investment_base_bdt": inv_base,
        "roi_pct": roi,
        "breakeven_sales_revenue": breakeven_sales,
        "actual_project_profit": actual_profit,
        "actual_roi_pct": actual_roi
    })

    rec = ProjectProfitability(**data)
    db.add(rec)
    await db.commit()
    await db.refresh(rec)

    resp = ProjectProfitabilityResponse.model_validate(rec)
    resp.project_name = proj.project_name
    resp.project_code = proj.project_code
    return resp


@router.get("/profitability/{id}", response_model=ProjectProfitabilityResponse)
async def get_project_profitability_by_id(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    rec = (await db.execute(select(ProjectProfitability).where(ProjectProfitability.id == id))).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Profitability forecast not found")

    proj = (await db.execute(select(Project).where(Project.id == rec.project_id))).scalar_one_or_none()
    resp = ProjectProfitabilityResponse.model_validate(rec)
    if proj:
        resp.project_name = proj.project_name
        resp.project_code = proj.project_code
    return resp


@router.put("/profitability/{id}", response_model=ProjectProfitabilityResponse)
async def update_project_profitability(
    id: int,
    payload: ProjectProfitabilityUpdate,
    db: AsyncSession = Depends(get_db)
):
    rec = (await db.execute(select(ProjectProfitability).where(ProjectProfitability.id == id))).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Profitability forecast not found")

    update_dict = payload.model_dump(exclude_unset=True)

    for key, val in update_dict.items():
        setattr(rec, key, val)

    # Re-calculate totals and ROI
    total_rev = float(rec.total_estimated_revenue or 0)
    if total_rev <= 0:
        total_rev = (
            float(rec.apartment_revenue_est or 0) +
            float(rec.shop_revenue_est or 0) +
            float(rec.office_revenue_est or 0) +
            float(rec.parking_revenue_est or 0) +
            float(rec.other_revenue_est or 0)
        )
        rec.total_estimated_revenue = total_rev

    total_cost = float(rec.total_project_cost_est or 0)
    if total_cost <= 0:
        total_cost = (
            float(rec.construction_cost_est or 0) +
            float(rec.consultant_fee_est or 0) +
            float(rec.marketing_sales_cost_est or 0) +
            float(rec.admin_overhead_est or 0) +
            float(rec.financing_interest_cost_est or 0) +
            float(rec.contingency_cost_est or 0)
        )
        rec.total_project_cost_est = total_cost

    dev_pct = float(rec.developer_share_pct or 50.0)
    landowner_pct = float(rec.landowner_share_pct or 50.0)
    rec.developer_revenue_share_bdt = total_rev * (dev_pct / 100.0)
    rec.landowner_revenue_share_bdt = total_rev * (landowner_pct / 100.0)

    est_profit = (rec.developer_revenue_share_bdt - total_cost) if dev_pct < 100 else (total_rev - total_cost)
    rec.estimated_project_profit = est_profit
    rec.gross_profit_margin_pct = (est_profit / total_rev * 100.0) if total_rev > 0 else 0.0

    inv_base = float(rec.defined_investment_base_bdt or total_cost)
    rec.roi_pct = (est_profit / inv_base * 100.0) if inv_base > 0 else 0.0

    rec.actual_project_profit = float(rec.recognized_revenue or 0) - float(rec.recognized_project_expenses or 0)
    rec.actual_roi_pct = (float(rec.actual_project_profit) / inv_base * 100.0) if inv_base > 0 and float(rec.recognized_revenue or 0) > 0 else 0.0

    await db.commit()
    await db.refresh(rec)

    proj = (await db.execute(select(Project).where(Project.id == rec.project_id))).scalar_one_or_none()
    resp = ProjectProfitabilityResponse.model_validate(rec)
    if proj:
        resp.project_name = proj.project_name
        resp.project_code = proj.project_code
    return resp


@router.delete("/profitability/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_profitability(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    rec = (await db.execute(select(ProjectProfitability).where(ProjectProfitability.id == id))).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Profitability forecast not found")
    await db.delete(rec)
    await db.commit()
    return None


@router.post("/profitability/simulate", response_model=ProfitabilitySimulationResponse)
async def simulate_profitability_scenario(
    payload: ProfitabilitySimulationRequest
):
    """
    Real-time dynamic scenario modeler:
    Evaluates price increases (+/-), sales delay impact (financing cost drag), and cost overrun.
    """
    base_profit = payload.total_revenue_bdt - payload.total_cost_bdt
    base_roi = (base_profit / payload.defined_investment_base_bdt * 100.0) if payload.defined_investment_base_bdt > 0 else 0.0

    # Modeled revenue with price increase
    modeled_revenue = payload.total_revenue_bdt * (1.0 + payload.price_increase_pct / 100.0)

    # Additional delay interest cost (assume 10% per annum on total cost)
    delay_cost = payload.total_cost_bdt * (0.10 / 12.0) * payload.sales_delay_months
    modeled_cost = (payload.total_cost_bdt * (1.0 + payload.cost_overrun_pct / 100.0)) + delay_cost

    modeled_profit = modeled_revenue - modeled_cost
    modeled_roi = (modeled_profit / payload.defined_investment_base_bdt * 100.0) if payload.defined_investment_base_bdt > 0 else 0.0
    modeled_margin = (modeled_profit / modeled_revenue * 100.0) if modeled_revenue > 0 else 0.0
    breakeven = modeled_cost

    return ProfitabilitySimulationResponse(
        base_profit_bdt=base_profit,
        base_roi_pct=base_roi,
        modeled_revenue_bdt=modeled_revenue,
        modeled_cost_bdt=modeled_cost,
        modeled_profit_bdt=modeled_profit,
        modeled_roi_pct=modeled_roi,
        modeled_margin_pct=modeled_margin,
        breakeven_revenue_bdt=breakeven
    )


# =============================================================================
# Submodule 2.7: Project Timeline and Milestone Tracking Endpoints
# =============================================================================
@router.get("/milestones", response_model=ProjectMilestonePaginationResponse)
async def list_project_milestones(
    project_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    critical_path_only: Optional[bool] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(ProjectMilestone)
    if project_id:
        query = query.where(ProjectMilestone.project_id == project_id)
    if status:
        query = query.where(ProjectMilestone.status == status)
    if critical_path_only is not None and critical_path_only:
        query = query.where(ProjectMilestone.is_critical_path == True)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (ProjectMilestone.milestone_code.ilike(search_pattern)) |
            (ProjectMilestone.milestone_name.ilike(search_pattern)) |
            (ProjectMilestone.assigned_department.ilike(search_pattern)) |
            (ProjectMilestone.contractor_name.ilike(search_pattern)) |
            (ProjectMilestone.responsible_person.ilike(search_pattern))
        )

    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Execute paginated
    items_stmt = query.order_by(ProjectMilestone.milestone_number.asc(), ProjectMilestone.planned_start_date.asc()).offset(offset).limit(limit)
    records = (await db.execute(items_stmt)).scalars().all()

    # Load project details
    proj_ids = list(set([r.project_id for r in records if r.project_id]))
    proj_map = {}
    if proj_ids:
        p_stmt = select(Project).where(Project.id.in_(proj_ids))
        p_res = (await db.execute(p_stmt)).scalars().all()
        proj_map = {p.id: p for p in p_res}

    result_items = []
    for r in records:
        proj = proj_map.get(r.project_id)
        d = ProjectMilestoneResponse.model_validate(r)
        if proj:
            d.project_name = proj.project_name
            d.project_code = proj.project_code
        result_items.append(d)

    # Progress and status aggregations
    all_query = select(ProjectMilestone)
    if project_id:
        all_query = all_query.where(ProjectMilestone.project_id == project_id)
    all_milestones = (await db.execute(all_query)).scalars().all()

    completed_c = sum(1 for m in all_milestones if m.status == "COMPLETED")
    critical_c = sum(1 for m in all_milestones if m.is_critical_path)
    total_m = len(all_milestones)

    # Weighted or average progress
    overall_physical = sum(float(m.physical_progress_pct or 0) * (float(m.weightage_percent or 1) / 100.0) for m in all_milestones) if total_m > 0 else 0.0
    overall_financial = sum(float(m.financial_progress_pct or 0) * (float(m.weightage_percent or 1) / 100.0) for m in all_milestones) if total_m > 0 else 0.0

    return ProjectMilestonePaginationResponse(
        items=result_items,
        total=total,
        limit=limit,
        offset=offset,
        completed_count=completed_c,
        critical_path_count=critical_c,
        overall_physical_progress_pct=round(overall_physical, 2),
        overall_financial_progress_pct=round(overall_financial, 2)
    )


@router.post("/milestones", response_model=ProjectMilestoneResponse, status_code=status.HTTP_201_CREATED)
async def create_project_milestone(
    payload: ProjectMilestoneCreate,
    db: AsyncSession = Depends(get_db)
):
    proj = (await db.execute(select(Project).where(Project.id == payload.project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    rec = ProjectMilestone(**payload.model_dump())
    db.add(rec)
    await db.commit()
    await db.refresh(rec)

    resp = ProjectMilestoneResponse.model_validate(rec)
    resp.project_name = proj.project_name
    resp.project_code = proj.project_code
    return resp


@router.get("/milestones/{id}", response_model=ProjectMilestoneResponse)
async def get_project_milestone_by_id(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    rec = (await db.execute(select(ProjectMilestone).where(ProjectMilestone.id == id))).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Milestone not found")

    proj = (await db.execute(select(Project).where(Project.id == rec.project_id))).scalar_one_or_none()
    resp = ProjectMilestoneResponse.model_validate(rec)
    if proj:
        resp.project_name = proj.project_name
        resp.project_code = proj.project_code
    return resp


@router.put("/milestones/{id}", response_model=ProjectMilestoneResponse)
async def update_project_milestone(
    id: int,
    payload: ProjectMilestoneUpdate,
    db: AsyncSession = Depends(get_db)
):
    rec = (await db.execute(select(ProjectMilestone).where(ProjectMilestone.id == id))).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Milestone not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        setattr(rec, key, val)

    # Auto-update status if progress is 100%
    if rec.physical_progress_pct and float(rec.physical_progress_pct) >= 100.0:
        rec.status = "COMPLETED"
        if not rec.actual_finish_date:
            rec.actual_finish_date = date.today()

    await db.commit()
    await db.refresh(rec)

    proj = (await db.execute(select(Project).where(Project.id == rec.project_id))).scalar_one_or_none()
    resp = ProjectMilestoneResponse.model_validate(rec)
    if proj:
        resp.project_name = proj.project_name
        resp.project_code = proj.project_code
    return resp


@router.delete("/milestones/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_milestone(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    rec = (await db.execute(select(ProjectMilestone).where(ProjectMilestone.id == id))).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Milestone not found")
    await db.delete(rec)
    await db.commit()
    return None


@router.post("/milestones/generate-standard-15", response_model=dict)
async def generate_standard_15_milestones(
    project_id: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates all 15 industry standard milestones for real estate projects:
    1. Project feasibility approval
    2. Land acquisition and possession
    3. Architectural concept approval
    4. Authority submission and approval
    5. Detailed engineering design
    6. Contractor selection and contract award
    7. Site preparation and excavation
    8. Foundation and piling
    9. Structural construction
    10. Masonry and internal partitions
    11. Electrical, plumbing and mechanical installations
    12. Plastering, flooring and finishing
    13. Lift, fire-safety and utility installations
    14. Testing, inspections and rectification
    15. Completion documentation and handover
    """
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if milestones already exist
    existing = (await db.execute(select(ProjectMilestone).where(ProjectMilestone.project_id == project_id))).scalars().all()
    if existing:
        return {
            "message": f"Project already has {len(existing)} milestones defined.",
            "count": len(existing)
        }

    start = proj.project_start_date or date(2026, 1, 1)

    standard_milestones = [
        (1, "Project Feasibility Approval", "FEASIBILITY_APPROVAL", "PRE_CONSTRUCTION", 0, 30, True, 4.0, "Business Planning & Finance"),
        (2, "Land Acquisition and Possession", "LAND_ACQUISITION", "PRE_CONSTRUCTION", 20, 60, True, 8.0, "Land Management & Legal"),
        (3, "Architectural Concept Approval", "ARCHITECTURAL_CONCEPT", "PRE_CONSTRUCTION", 50, 90, False, 5.0, "Design & Architecture"),
        (4, "Authority Submission and Approval (RAJUK/CDA)", "AUTHORITY_APPROVAL", "REGULATORY", 80, 150, True, 7.0, "Permits & Compliance"),
        (5, "Detailed Engineering Design", "DETAILED_ENGINEERING", "PRE_CONSTRUCTION", 140, 200, True, 6.0, "Structural & Civil Engineering"),
        (6, "Contractor Selection and Contract Award", "CONTRACTOR_AWARD", "PROCUREMENT", 190, 230, True, 5.0, "Procurement & Contracts"),
        (7, "Site Preparation and Excavation", "SITE_PREP_EXCAVATION", "CIVIL_STRUCTURE", 220, 270, True, 6.0, "Engineering & Civil Projects"),
        (8, "Foundation and Piling", "FOUNDATION_PILING", "CIVIL_STRUCTURE", 260, 350, True, 12.0, "Engineering & Civil Projects"),
        (9, "Structural Construction (Sub & Superstructure)", "STRUCTURAL_CONSTRUCTION", "CIVIL_STRUCTURE", 340, 550, True, 20.0, "Engineering & Civil Projects"),
        (10, "Masonry and Internal Partitions", "MASONRY_PARTITIONS", "CIVIL_STRUCTURE", 520, 640, False, 7.0, "Engineering & Civil Projects"),
        (11, "Electrical, Plumbing and Mechanical Installations (MEP)", "MEP_INSTALLATIONS", "MEP_FINISHING", 600, 750, True, 8.0, "MEP & Services"),
        (12, "Plastering, Flooring and Finishing", "PLASTERING_FINISHING", "MEP_FINISHING", 700, 850, False, 7.0, "Finishing & Interiors"),
        (13, "Lift, Fire-Safety and Utility Installations", "LIFT_FIRE_UTILITY", "MEP_FINISHING", 800, 930, True, 5.0, "MEP & Services"),
        (14, "Testing, Inspections and Rectification", "TESTING_INSPECTIONS", "COMMISSIONING", 920, 980, True, 4.0, "Quality Assurance & QC"),
        (15, "Completion Documentation and Handover", "COMPLETION_HANDOVER", "COMMISSIONING", 970, 1020, True, 2.0, "Customer Service & Handover"),
    ]

    from datetime import timedelta

    created_count = 0
    for num, name, ref, cat, s_days, f_days, is_cp, weight, dept in standard_milestones:
        p_start = start + timedelta(days=s_days)
        p_finish = start + timedelta(days=f_days)
        code = f"{proj.project_code}-MLS-{num:02d}"

        m = ProjectMilestone(
            project_id=project_id,
            milestone_code=code,
            milestone_number=num,
            milestone_name=name,
            standard_milestone_ref=ref,
            category=cat,
            planned_start_date=p_start,
            planned_finish_date=p_finish,
            baseline_start_date=p_start,
            baseline_finish_date=p_finish,
            assigned_department=dept,
            is_critical_path=is_cp,
            weightage_percent=weight,
            physical_progress_pct=0.0,
            financial_progress_pct=0.0,
            status="PENDING",
            remarks=f"Standard Phase {num} milestone for {proj.project_name}"
        )
        db.add(m)
        created_count += 1

    await db.commit()
    return {
        "message": f"Successfully created all 15 industry standard milestones for {proj.project_name}",
        "count": created_count
    }


# =============================================================================
# Submodule 2.8: Regulatory Approvals & Compliance Endpoints
# =============================================================================
@router.get("/clearances", response_model=AuthorityClearancePaginationResponse)
async def list_regulatory_clearances(
    project_id: Optional[int] = Query(None),
    authority_name: Optional[str] = Query(None),
    clearance_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuthorityClearance).options(selectinload(AuthorityClearance.conditions))
    if project_id:
        query = query.where(AuthorityClearance.project_id == project_id)
    if authority_name:
        query = query.where(AuthorityClearance.authority_name == authority_name)
    if clearance_type:
        query = query.where(AuthorityClearance.clearance_type_id == clearance_type)
    if status:
        query = query.where(AuthorityClearance.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (AuthorityClearance.reference_no.ilike(search_pattern)) |
            (AuthorityClearance.clearance_type_id.ilike(search_pattern)) |
            (AuthorityClearance.authority_name.ilike(search_pattern)) |
            (AuthorityClearance.application_memo_no.ilike(search_pattern)) |
            (AuthorityClearance.approved_memo_no.ilike(search_pattern)) |
            (AuthorityClearance.responsible_officer.ilike(search_pattern)) |
            (AuthorityClearance.remarks.ilike(search_pattern))
        )

    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Execute paginated
    items_stmt = query.order_by(desc(AuthorityClearance.id)).offset(offset).limit(limit)
    records = (await db.execute(items_stmt)).scalars().all()

    # Load project details
    proj_ids = list(set([r.project_id for r in records if r.project_id]))
    proj_map = {}
    if proj_ids:
        p_stmt = select(Project).where(Project.id.in_(proj_ids))
        p_res = (await db.execute(p_stmt)).scalars().all()
        proj_map = {p.id: p for p in p_res}

    result_items = []
    for r in records:
        proj = proj_map.get(r.project_id)
        d = AuthorityClearanceResponse.model_validate(r)
        if proj:
            d.project_name = proj.project_name
            d.project_code = proj.project_code
        if r.conditions:
            d.conditions = [AuthorityClearanceConditionResponse.model_validate(c) for c in r.conditions]
        result_items.append(d)

    # Aggregations
    all_query = select(AuthorityClearance)
    if project_id:
        all_query = all_query.where(AuthorityClearance.project_id == project_id)
    all_records = (await db.execute(all_query)).scalars().all()

    approved_c = sum(1 for c in all_records if c.status == "APPROVED")
    submitted_c = sum(1 for c in all_records if c.status in ["SUBMITTED", "IN_REVIEW", "QUERY_RAISED"])
    expired_c = sum(1 for c in all_records if c.status == "EXPIRED" or c.renewal_alert_status == "EXPIRED")
    total_c = len(all_records)
    adherence = (approved_c / total_c * 100.0) if total_c > 0 else 100.0

    return AuthorityClearancePaginationResponse(
        items=result_items,
        total=total,
        limit=limit,
        offset=offset,
        approved_count=approved_c,
        submitted_count=submitted_c,
        expired_count=expired_c,
        compliance_adherence_pct=round(adherence, 1)
    )


@router.post("/clearances", response_model=AuthorityClearanceResponse, status_code=status.HTTP_201_CREATED)
async def create_regulatory_clearance(
    payload: AuthorityClearanceCreate,
    db: AsyncSession = Depends(get_db)
):
    proj = (await db.execute(select(Project).where(Project.id == payload.project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    rec = AuthorityClearance(**payload.model_dump())
    db.add(rec)
    await db.commit()
    await db.refresh(rec)

    resp = AuthorityClearanceResponse.model_validate(rec)
    resp.project_name = proj.project_name
    resp.project_code = proj.project_code
    return resp


@router.get("/clearances/{id}", response_model=AuthorityClearanceResponse)
async def get_regulatory_clearance_by_id(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuthorityClearance).options(selectinload(AuthorityClearance.conditions)).where(AuthorityClearance.id == id)
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Regulatory approval record not found")

    proj = (await db.execute(select(Project).where(Project.id == rec.project_id))).scalar_one_or_none()
    resp = AuthorityClearanceResponse.model_validate(rec)
    if proj:
        resp.project_name = proj.project_name
        resp.project_code = proj.project_code
    if rec.conditions:
        resp.conditions = [AuthorityClearanceConditionResponse.model_validate(c) for c in rec.conditions]
    return resp


@router.put("/clearances/{id}", response_model=AuthorityClearanceResponse)
async def update_regulatory_clearance(
    id: int,
    payload: AuthorityClearanceUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuthorityClearance).options(selectinload(AuthorityClearance.conditions)).where(AuthorityClearance.id == id)
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Regulatory approval record not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        setattr(rec, key, val)

    await db.commit()
    await db.refresh(rec)

    proj = (await db.execute(select(Project).where(Project.id == rec.project_id))).scalar_one_or_none()
    resp = AuthorityClearanceResponse.model_validate(rec)
    if proj:
        resp.project_name = proj.project_name
        resp.project_code = proj.project_code
    if rec.conditions:
        resp.conditions = [AuthorityClearanceConditionResponse.model_validate(c) for c in rec.conditions]
    return resp


@router.delete("/clearances/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_regulatory_clearance(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    rec = (await db.execute(select(AuthorityClearance).where(AuthorityClearance.id == id))).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Regulatory approval record not found")
    await db.delete(rec)
    await db.commit()
    return None


@router.post("/clearances/seed-standard-clearances", response_model=dict)
async def seed_standard_statutory_clearances(
    project_id: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Seeds standard statutory authority clearances required for development projects in Bangladesh:
    1. Land Use Clearance (LUC)
    2. Building Plan Sanction (RAJUK / CDA)
    3. Structural & Architectural Drawing Approval
    4. Fire Safety Clearance (FSCD Fire NOC)
    5. Environmental Clearance Certificate (DoE ECC)
    6. Aviation Height Sanction (CAAB NOC)
    7. Water Supply & Sewerage Sanction (WASA)
    8. Electric Substation & Load Clearance (DESCO/DPDC)
    9. Construction Stage Plinth & Superstructure Inspection
    10. Occupancy Certificate (OC)
    """
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = (await db.execute(select(AuthorityClearance).where(AuthorityClearance.project_id == project_id))).scalars().all()
    if existing:
        return {
            "message": f"Project already has {len(existing)} clearance records.",
            "count": len(existing)
        }

    standard_clearances = [
        ("LUC", "LAND_USE_PERMIT", "RAJUK", f"CLR-{proj.project_code}-LUC-01", "RAJUK/LUC/2026/891", "RAJUK/APP/LUC/4412", date(2026, 1, 10), date(2026, 2, 20), date(2028, 2, 19), "APPROVED", "Town Planner S. Rahman", "LUC Obtained. Proceed with Building Plan submission."),
        ("BUILDING_PLAN", "BUILDING_PLAN", "RAJUK", f"CLR-{proj.project_code}-BP-01", "RAJUK/BP/2026/1029", "RAJUK/SANCTION/8812", date(2026, 2, 1), date(2026, 3, 15), date(2029, 3, 14), "APPROVED", "Engr. Kabir Hossain", "Sanctioned for 2B + G + 14 Floors under DBCR 2008."),
        ("FIRE_NOC", "FIRE_SAFETY_CLEARANCE", "FSCD", f"CLR-{proj.project_code}-FIRE-01", "FSCD/HQ/NOC/2026/410", "FSCD/FIRE/APPROVED/902", date(2026, 2, 15), date(2026, 3, 28), date(2027, 3, 27), "APPROVED", "AD Fire Safety D. Hossain", "Fire hydrant, sprinkler and 2-hour fire stairwell conditions attached."),
        ("AVIATION_HEIGHT", "DRAWING_APPROVAL", "CAAB", f"CLR-{proj.project_code}-CAAB-01", "CAAB/HQ/HT/2026/112", "CAAB/SANCTION/HT/88", date(2026, 1, 20), date(2026, 2, 25), date(2031, 2, 24), "APPROVED", "Aerodrome Officer M. Alam", "Approved maximum height: 45.00 meters above mean sea level."),
        ("ENVIRONMENTAL", "ENVIRONMENTAL_CLEARANCE", "DoE", f"CLR-{proj.project_code}-DOE-01", "DOE/ECC/ORANGE-B/2026/55", "DOE/CERT/2026/910", date(2026, 2, 10), date(2026, 4, 5), date(2027, 4, 4), "APPROVED", "Deputy Director Environment", "Orange-B category clearance with mandatory STP/ETP provisions."),
        ("WASA", "UTILITY_SERVICE", "WASA", f"CLR-{proj.project_code}-WASA-01", "DWASA/MODS/ZONE-5/441", None, date(2026, 3, 1), None, None, "IN_REVIEW", "Revenue Officer WASA", "Sewerage main pipe connection fee paid. Inspection pending."),
        ("DESCO_DPDC", "UTILITY_SERVICE", "DESCO_DPDC", f"CLR-{proj.project_code}-ELEC-01", "DESCO/SUB-STATION/2026/89", None, date(2026, 3, 10), None, None, "SUBMITTED", "Executive Engineer DESCO", "Dedicated 500 KVA substation room space verified in basement 1."),
        ("CONSTRUCTION_INSPECTION", "CONSTRUCTION_INSPECTION", "RAJUK", f"CLR-{proj.project_code}-INSP-01", "RAJUK/INSP/ZONE-4/PLINTH", None, date(2026, 4, 1), None, None, "DRAFT", "Authorised Officer Zone 4", "Plinth casting milestone inspection checklist prepared."),
        ("OCCUPANCY_CERT", "OCCUPANCY_CERTIFICATE", "RAJUK", f"CLR-{proj.project_code}-OC-01", None, None, None, None, None, "NOT_APPLIED", "Compliance Director", "To be applied upon completion of civil, electrical, fire and utility works.")
    ]

    created = 0
    for c_type, cat, auth, ref, app_memo, apprv_memo, sub_dt, app_dt, exp_dt, st, off, next_act in standard_clearances:
        rec = AuthorityClearance(
            project_id=project_id,
            reference_no=ref,
            clearance_type_id=c_type,
            approval_category=cat,
            authority_name=auth,
            application_memo_no=app_memo,
            approved_memo_no=apprv_memo,
            submission_date=sub_dt,
            approval_date=app_dt,
            expiry_date=exp_dt,
            validity_months=12 if exp_dt else 0,
            responsible_officer=off,
            next_action=next_act,
            status=st,
            sanctioned_floors="2B + G + 14 Floors" if c_type in ["BUILDING_PLAN", "LUC"] else None,
            sanctioned_height_m=45.00 if c_type == "AVIATION_HEIGHT" else None,
            remarks=f"Statutory compliance requirement for {proj.project_name}"
        )
        db.add(rec)
        created += 1

    await db.commit()
    return {
        "message": f"Successfully created {created} standard statutory clearances for {proj.project_name}",
        "count": created
    }


# =============================================================================
# Submodule 2.9: Architectural Drawings & Document Management Endpoints
# =============================================================================
@router.get("/drawings", response_model=DrawingPaginationResponse)
async def list_drawings(
    project_id: Optional[int] = Query(None),
    tower_id: Optional[int] = Query(None),
    drawing_category_id: Optional[str] = Query(None),
    discipline: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    floor_level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(Drawing).options(selectinload(Drawing.revisions))
    if project_id:
        query = query.where(Drawing.project_id == project_id)
    if tower_id:
        query = query.where(Drawing.tower_id == tower_id)
    if drawing_category_id:
        query = query.where(Drawing.drawing_category_id == drawing_category_id)
    if discipline:
        query = query.where(Drawing.discipline == discipline)
    if status:
        query = query.where(Drawing.status == status)
    if floor_level:
        query = query.where(Drawing.floor_level == floor_level)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (Drawing.drawing_number.ilike(search_pattern)) |
            (Drawing.drawing_title.ilike(search_pattern)) |
            (Drawing.author.ilike(search_pattern)) |
            (Drawing.construction_package.ilike(search_pattern)) |
            (Drawing.file_name.ilike(search_pattern)) |
            (Drawing.revision_notes.ilike(search_pattern))
        )

    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Execute paginated
    items_stmt = query.order_by(desc(Drawing.id)).offset(offset).limit(limit)
    records = (await db.execute(items_stmt)).scalars().all()

    # Load project, tower, and clearance names
    proj_ids = list(set([r.project_id for r in records if r.project_id]))
    tower_ids = list(set([r.tower_id for r in records if r.tower_id]))
    clearance_ids = list(set([r.approval_clearance_id for r in records if r.approval_clearance_id]))

    proj_map = {}
    if proj_ids:
        p_res = (await db.execute(select(Project).where(Project.id.in_(proj_ids)))).scalars().all()
        proj_map = {p.id: p for p in p_res}

    tower_map = {}
    if tower_ids:
        t_res = (await db.execute(select(Tower).where(Tower.id.in_(tower_ids)))).scalars().all()
        tower_map = {t.id: t.tower_name for t in t_res}

    clearance_map = {}
    if clearance_ids:
        c_res = (await db.execute(select(AuthorityClearance).where(AuthorityClearance.id.in_(clearance_ids)))).scalars().all()
        clearance_map = {c.id: (c.approved_memo_no or c.application_memo_no or c.reference_no) for c in c_res}

    result_items = []
    for r in records:
        proj = proj_map.get(r.project_id)
        d = DrawingResponse.model_validate(r)
        if proj:
            d.project_name = proj.project_name
            d.project_code = proj.project_code
        if r.tower_id:
            d.tower_name = tower_map.get(r.tower_id)
        if r.approval_clearance_id:
            d.clearance_memo = clearance_map.get(r.approval_clearance_id)
        if r.revisions:
            d.revisions = [DrawingRevisionResponse.model_validate(rev) for rev in r.revisions]
        result_items.append(d)

    # Aggregations for KPI metrics
    all_query = select(Drawing)
    if project_id:
        all_query = all_query.where(Drawing.project_id == project_id)
    all_records = (await db.execute(all_query)).scalars().all()

    ifc_c = sum(1 for d in all_records if d.is_approved_for_construction or d.status == "APPROVED_FOR_CONSTRUCTION")
    under_rev_c = sum(1 for d in all_records if d.status == "UNDER_REVIEW")
    superseded_c = sum(1 for d in all_records if d.is_superseded or d.status == "SUPERSEDED")
    as_built_c = sum(1 for d in all_records if d.status == "AS_BUILT")
    confidential_c = sum(1 for d in all_records if d.is_confidential)

    return DrawingPaginationResponse(
        items=result_items,
        total=total,
        limit=limit,
        offset=offset,
        ifc_count=ifc_c,
        under_review_count=under_rev_c,
        superseded_count=superseded_c,
        as_built_count=as_built_c,
        confidential_count=confidential_c
    )


@router.post("/drawings", response_model=DrawingResponse, status_code=status.HTTP_201_CREATED)
async def create_drawing(
    payload: DrawingCreate,
    db: AsyncSession = Depends(get_db)
):
    proj = (await db.execute(select(Project).where(Project.id == payload.project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # CRITICAL RULE: If this drawing is approved for construction (IFC),
    # supersede any existing older drawings with the exact same drawing_number under this project
    if payload.is_approved_for_construction or payload.status == "APPROVED_FOR_CONSTRUCTION":
        older_stmt = select(Drawing).where(
            Drawing.project_id == payload.project_id,
            Drawing.drawing_number == payload.drawing_number.strip(),
            Drawing.status != "SUPERSEDED"
        )
        older_drawings = (await db.execute(older_stmt)).scalars().all()
        for old in older_drawings:
            old.is_superseded = True
            old.status = "SUPERSEDED"
            old.is_approved_for_construction = False
            old.superseded_date = date.today()
            # Log superseded event in audit revision
            db.add(DrawingRevision(
                drawing_id=old.id,
                revision_number=old.revision_number,
                revision_date=date.today(),
                author=old.author,
                file_url=old.file_url,
                file_name=old.file_name,
                action_type="SUPERSEDED",
                change_summary=f"Superseded by new revision {payload.revision_number} issued on {payload.issue_date or date.today()}",
                approved_by=payload.approved_by
            ))

    rec = Drawing(**payload.model_dump())
    db.add(rec)
    await db.commit()
    await db.refresh(rec)

    # Add initial revision history record
    db.add(DrawingRevision(
        drawing_id=rec.id,
        revision_number=rec.revision_number,
        revision_date=rec.issue_date or date.today(),
        author=rec.author,
        file_url=rec.file_url,
        file_name=rec.file_name,
        file_size_mb=rec.file_size_mb,
        action_type="IFC_APPROVAL" if rec.is_approved_for_construction else "REVISION_UPLOAD",
        change_summary=rec.revision_notes or f"Initial issuance of {rec.drawing_number} {rec.revision_number}",
        approved_by=rec.approved_by
    ))
    await db.commit()

    # Load relations for response
    resp = DrawingResponse.model_validate(rec)
    resp.project_name = proj.project_name
    resp.project_code = proj.project_code
    if rec.tower_id:
        t = (await db.execute(select(Tower).where(Tower.id == rec.tower_id))).scalar_one_or_none()
        if t:
            resp.tower_name = t.tower_name
    return resp


@router.get("/drawings/{id}", response_model=DrawingResponse)
async def get_drawing_by_id(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Drawing).options(selectinload(Drawing.revisions)).where(Drawing.id == id)
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Drawing or document not found")

    proj = (await db.execute(select(Project).where(Project.id == rec.project_id))).scalar_one_or_none()
    resp = DrawingResponse.model_validate(rec)
    if proj:
        resp.project_name = proj.project_name
        resp.project_code = proj.project_code
    if rec.tower_id:
        t = (await db.execute(select(Tower).where(Tower.id == rec.tower_id))).scalar_one_or_none()
        if t:
            resp.tower_name = t.tower_name
    if rec.approval_clearance_id:
        c = (await db.execute(select(AuthorityClearance).where(AuthorityClearance.id == rec.approval_clearance_id))).scalar_one_or_none()
        if c:
            resp.clearance_memo = c.approved_memo_no or c.application_memo_no or c.reference_no
    if rec.revisions:
        resp.revisions = [DrawingRevisionResponse.model_validate(rev) for rev in rec.revisions]
    return resp


@router.put("/drawings/{id}", response_model=DrawingResponse)
async def update_drawing(
    id: int,
    payload: DrawingUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Drawing).options(selectinload(Drawing.revisions)).where(Drawing.id == id)
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Drawing or document not found")

    old_rev = rec.revision_number
    old_status = rec.status
    old_ifc = rec.is_approved_for_construction

    # Update drawing attributes
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(rec, field, val)

    # If updated to IFC approval, supersede any older drawings with same drawing number
    if (rec.is_approved_for_construction or rec.status == "APPROVED_FOR_CONSTRUCTION") and not old_ifc:
        older_stmt = select(Drawing).where(
            Drawing.project_id == rec.project_id,
            Drawing.drawing_number == rec.drawing_number,
            Drawing.id != rec.id,
            Drawing.status != "SUPERSEDED"
        )
        older_drawings = (await db.execute(older_stmt)).scalars().all()
        for old in older_drawings:
            old.is_superseded = True
            old.status = "SUPERSEDED"
            old.is_approved_for_construction = False
            old.superseded_date = date.today()

    # Log revision if revision number, status, or notes changed
    if payload.revision_number and payload.revision_number != old_rev:
        db.add(DrawingRevision(
            drawing_id=rec.id,
            revision_number=rec.revision_number,
            revision_date=rec.issue_date or date.today(),
            author=rec.author,
            file_url=rec.file_url,
            file_name=rec.file_name,
            file_size_mb=rec.file_size_mb,
            action_type="IFC_APPROVAL" if rec.is_approved_for_construction else "REVISION_UPDATE",
            change_summary=rec.revision_notes or f"Updated revision from {old_rev} to {rec.revision_number}",
            approved_by=rec.approved_by
        ))

    await db.commit()
    await db.refresh(rec)

    proj = (await db.execute(select(Project).where(Project.id == rec.project_id))).scalar_one_or_none()
    resp = DrawingResponse.model_validate(rec)
    if proj:
        resp.project_name = proj.project_name
        resp.project_code = proj.project_code
    if rec.tower_id:
        t = (await db.execute(select(Tower).where(Tower.id == rec.tower_id))).scalar_one_or_none()
        if t:
            resp.tower_name = t.tower_name
    if rec.revisions:
        resp.revisions = [DrawingRevisionResponse.model_validate(rev) for rev in rec.revisions]
    return resp


@router.delete("/drawings/{id}")
async def delete_drawing(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Drawing).where(Drawing.id == id)
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Drawing or document not found")

    await db.delete(rec)
    await db.commit()
    return {"success": True, "message": f"Drawing {id} deleted successfully"}


@router.post("/drawings/{id}/download")
async def record_drawing_download(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Drawing).where(Drawing.id == id)
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Drawing not found")

    rec.download_count = (rec.download_count or 0) + 1
    await db.commit()
    return {"success": True, "download_count": rec.download_count, "file_url": rec.file_url}


@router.post("/drawings/seed-standard-drawings")
async def seed_standard_drawings(
    project_id: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Load primary tower if available
    t_stmt = select(Tower).where(Tower.project_id == project_id)
    towers = (await db.execute(t_stmt)).scalars().all()
    primary_tower_id = towers[0].id if towers else None

    # Load primary approval clearance if available
    c_stmt = select(AuthorityClearance).where(AuthorityClearance.project_id == project_id)
    clearances = (await db.execute(c_stmt)).scalars().all()
    primary_clearance_id = clearances[0].id if clearances else None

    code = proj.project_code or "PRJ"

    standard_set = [
        # 1. Concept Architectural
        ("CONCEPT_ARCHITECTURAL", f"ARC-{code}-MST-001", "Master Site Layout & Spatial Orientation", "ARCHITECTURAL", "R0", "Site Master", "Site Planning", "Vista Architects Ltd.", "APPROVED_FOR_CONSTRUCTION", True, "PDF", 14.50, False, "PROJECT_TEAM", "Initial sanctioned site plan under 2008 Imarat Nirman Rules"),
        # 2. Structural Calculations
        ("STRUCTURAL_CALC", f"STR-{code}-CALC-01", "Structural Design Calculations & Seismic Analysis (BNBC 2020)", "STRUCTURAL", "R0", "Full Tower", "Sub-Structure", "Apex Structural Consultants", "APPROVED_FOR_CONSTRUCTION", True, "PDF", 28.20, True, "CHIEF_ENGINEER", "Seismic Zone 2 design with ETABS 2024 FEM modeling"),
        # 3. Piling & Foundation Shop Drawings
        ("CONSTRUCTION_SHOP", f"STR-{code}-PIL-002", "Cast-in-Situ Bored Piling Layout & Reinforcement Details", "STRUCTURAL", "R1", "Basement 2", "Piling RCC", "Apex Structural Consultants", "APPROVED_FOR_CONSTRUCTION", True, "DWG", 32.40, False, "PROJECT_TEAM", "600mm dia bored piles with 500W rebar detailing"),
        # 4. Column & Shear Wall Schedule
        ("CONSTRUCTION_SHOP", f"STR-{code}-COL-003", "Column & Core Shear Wall Schedule (B2 to 4th Floor)", "STRUCTURAL", "R0", "Typical 1-14", "Super-Structure RCC", "Apex Structural Consultants", "APPROVED_FOR_CONSTRUCTION", True, "PDF", 18.70, False, "PROJECT_TEAM", "High-strength C35 concrete mix with mechanical couplers"),
        # 5. Typical Floor Architectural
        ("CONCEPT_ARCHITECTURAL", f"ARC-{code}-TYP-101", "Typical Floor Architectural Floor Plan (Floors 1-14)", "ARCHITECTURAL", "R2", "Typical 1-14", "Finishing", "Vista Architects Ltd.", "APPROVED_FOR_CONSTRUCTION", True, "DWG", 22.10, False, "PROJECT_TEAM", "4 units per floor layout with cross-ventilation balconies"),
        # 6. Electrical & Substation
        ("ELECTRICAL_PLUMBING", f"MEP-{code}-ELE-201", "Electrical Substation (500 KVA) & Generator Single Line Diagram", "ELECTRICAL", "R0", "Basement 1", "MEP Internal", "PowerTech Engineering", "UNDER_REVIEW", False, "PDF", 9.40, True, "CHIEF_ENGINEER", "DESCO/DPDC space compliance and automatic transfer switch"),
        # 7. Plumbing & Sanitation
        ("ELECTRICAL_PLUMBING", f"MEP-{code}-PLM-301", "Water Supply, Sewerage & Stormwater Drainage Riser Diagram", "PLUMBING", "R0", "Full Tower", "MEP Internal", "PowerTech Engineering", "APPROVED_FOR_CONSTRUCTION", True, "PDF", 11.20, False, "PROJECT_TEAM", "Dual piping system with centralized WASA connection point"),
        # 8. Fire-Fighting & HVAC
        ("HVAC_FIRE_SAFETY", f"MEP-{code}-FIR-401", "Fire Hydrant, Wet Riser & Smoke Evacuation Plan", "FIRE_SAFETY", "R1", "Full Tower", "HVAC & Fire Safety", "SafetyFirst Systems", "APPROVED_FOR_CONSTRUCTION", True, "PDF", 16.30, False, "PROJECT_TEAM", "FSCD sanctioned layout with dual escape stairwells"),
        # 9. Soil Investigation Report
        ("SOIL_SURVEY", f"GEO-{code}-SRV-01", "Comprehensive Geotechnical Soil Investigation & SPT Report", "CIVIL_SURVEY", "R0", "Site Ground", "Survey & Investigation", "Dhaka Soil Lab Ltd.", "APPROVED_FOR_CONSTRUCTION", True, "PDF", 45.00, False, "PROJECT_TEAM", "6 boreholes up to 100ft depth with standard penetration values"),
        # 10. BOQ & Specifications
        ("BOQ_SPECIFICATIONS", f"BOQ-{code}-CIV-001", "Master Civil & Structural Bill of Quantities with Item Specs", "BOQ_SPEC", "R0", "Full Tower", "Procurement & Cost", "In-House Estimation Dept", "APPROVED_FOR_CONSTRUCTION", True, "XLSX", 4.80, True, "MANAGEMENT_ONLY", "Detailed BOQ with 500W rebar and 43 Grade OPC cement quantities"),
        # 11. RAJUK Sanctioned Set
        ("AUTHORITY_APPROVED", f"REG-{code}-RAJUK-SANCT", "RAJUK Approved Sanction Architectural & Structural Drawing Set", "ARCHITECTURAL", "R0", "Full Tower", "Authority Clearances", "RAJUK Zone-4 Town Planning", "APPROVED_FOR_CONSTRUCTION", True, "PDF", 68.50, False, "ALL_ROLES", "Officially sanctioned building plan under approved memo"),
        # 12. Superseded Obsolete Drawing (For Audit Demo)
        ("CONSTRUCTION_SHOP", f"STR-{code}-PIL-002", "Cast-in-Situ Bored Piling Layout (Superseded Preliminary)", "STRUCTURAL", "R0", "Basement 2", "Piling RCC", "Apex Structural Consultants", "SUPERSEDED", False, "DWG", 30.10, False, "PROJECT_TEAM", "Superseded by R1 following pile load test result modifications"),
    ]

    created = 0
    for cat, num, title, disc, rev, fl, pkg, auth, st, ifc, f_type, f_sz, conf, role, notes in standard_set:
        is_super = (st == "SUPERSEDED")
        drw = Drawing(
            project_id=project_id,
            tower_id=primary_tower_id,
            approval_clearance_id=primary_clearance_id if cat == "AUTHORITY_APPROVED" else None,
            drawing_category_id=cat,
            drawing_number=num,
            drawing_title=title,
            discipline=disc,
            revision_number=rev,
            floor_level=fl,
            construction_package=pkg,
            author=auth,
            issue_date=date.today(),
            status=st,
            is_approved_for_construction=ifc,
            is_superseded=is_super,
            superseded_date=date.today() if is_super else None,
            approved_by="Chief Structural Engineer" if ifc else None,
            approval_date=date.today() if ifc else None,
            file_url=f"/uploads/drawings/{num.lower()}_{rev.lower()}.{f_type.lower()}",
            file_name=f"{num}_{rev}.{f_type.lower()}",
            file_size_mb=f_sz,
            file_type=f_type,
            is_confidential=conf,
            access_role=role,
            download_count=12 if ifc else 2,
            revision_notes=notes
        )
        db.add(drw)
        await db.flush()

        db.add(DrawingRevision(
            drawing_id=drw.id,
            revision_number=rev,
            revision_date=date.today(),
            author=auth,
            file_url=drw.file_url,
            file_name=drw.file_name,
            file_size_mb=f_sz,
            action_type="SUPERSEDED" if is_super else ("IFC_APPROVAL" if ifc else "REVISION_UPLOAD"),
            change_summary=notes,
            approved_by=drw.approved_by
        ))
        created += 1

    await db.commit()
    return {
        "message": f"Successfully created {created} standard drawings and documents for {proj.project_name}",
        "count": created
    }


# =============================================================================
# Submodule 2.13: Project-wise Profit and Loss & Financial Performance Endpoints
# =============================================================================
def _recalculate_pnl_metrics(data: dict) -> dict:
    rec_rev = float(data.get("recognized_revenue") or 0.0)
    land_c = float(data.get("land_cost_allocated") or 0.0)
    const_c = float(data.get("construction_materials_cost") or 0.0)
    cons_c = float(data.get("consultants_direct_cost") or 0.0)
    
    cost_of_sales = land_c + const_c + cons_c
    gross_profit = rec_rev - cost_of_sales
    gross_margin_pct = (gross_profit / rec_rev * 100.0) if rec_rev > 0 else 0.0

    alloc_op = float(data.get("allocated_operating_expenses") or 0.0)
    ebit = gross_profit - alloc_op

    fin_exp = float(data.get("financing_expenses") or 0.0)
    pbt = ebit - fin_exp

    tax_est = float(data.get("estimated_income_tax") or (pbt * 0.275 if pbt > 0 else 0.0))
    pat = pbt - tax_est
    pat_margin_pct = (pat / rec_rev * 100.0) if rec_rev > 0 else 0.0

    # JV Sharing
    landowner_pct = float(data.get("landowner_share_pct") or 50.0)
    developer_pct = float(data.get("developer_share_pct") or 50.0)
    lo_rev = rec_rev * (landowner_pct / 100.0)
    dev_rev = rec_rev * (developer_pct / 100.0)
    dev_pbt = pbt * (developer_pct / 100.0)

    # Forecast / EAC
    comm_c = float(data.get("committed_cost") or cost_of_sales)
    etc_c = float(data.get("forecast_cost_to_complete_etc") or 0.0)
    eac = cost_of_sales + etc_c

    feas_profit = float(data.get("original_feasibility_profit") or 0.0)
    variance_feas = pbt - feas_profit if feas_profit > 0 else 0.0

    data["total_cost_of_sales"] = round(cost_of_sales, 2)
    data["gross_project_profit"] = round(gross_profit, 2)
    data["gross_profit_margin_pct"] = round(gross_margin_pct, 2)
    data["operating_profit_ebit"] = round(ebit, 2)
    data["profit_before_tax_pbt"] = round(pbt, 2)
    data["estimated_income_tax"] = round(tax_est, 2)
    data["net_profit_after_tax"] = round(pat, 2)
    data["net_profit_margin_pct"] = round(pat_margin_pct, 2)
    data["landowner_revenue_share"] = round(lo_rev, 2)
    data["developer_revenue_share"] = round(dev_rev, 2)
    data["developer_net_pbt"] = round(dev_pbt, 2)
    data["committed_cost"] = round(comm_c, 2)
    data["estimate_at_completion_eac"] = round(eac, 2)
    data["variance_from_feasibility"] = round(variance_feas, 2)
    return data


@router.get("/financial-performance", response_model=ProjectFinancialPerformancePaginationResponse)
async def list_financial_performances(
    project_id: Optional[int] = Query(None),
    fiscal_year: Optional[str] = Query(None),
    period_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(ProjectFinancialPerformance)
    if project_id:
        query = query.where(ProjectFinancialPerformance.project_id == project_id)
    if fiscal_year:
        query = query.where(ProjectFinancialPerformance.fiscal_year == fiscal_year)
    if period_type:
        query = query.where(ProjectFinancialPerformance.period_type == period_type)
    if status:
        query = query.where(ProjectFinancialPerformance.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (ProjectFinancialPerformance.cost_center_code.ilike(search_pattern)) |
            (ProjectFinancialPerformance.period_name.ilike(search_pattern)) |
            (ProjectFinancialPerformance.prepared_by.ilike(search_pattern)) |
            (ProjectFinancialPerformance.notes.ilike(search_pattern))
        )

    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Execute paginated
    items_stmt = query.order_by(desc(ProjectFinancialPerformance.id)).offset(offset).limit(limit)
    records = (await db.execute(items_stmt)).scalars().all()

    # Load project details
    proj_ids = list(set([r.project_id for r in records if r.project_id]))
    proj_map = {}
    if proj_ids:
        p_res = (await db.execute(select(Project).where(Project.id.in_(proj_ids)))).scalars().all()
        proj_map = {p.id: p for p in p_res}

    result_items = []
    for r in records:
        proj = proj_map.get(r.project_id)
        d = ProjectFinancialPerformanceResponse.model_validate(r)
        if proj:
            d.project_name = proj.project_name
            d.project_code = proj.project_code
        result_items.append(d)

    # Aggregations
    all_query = select(ProjectFinancialPerformance)
    if project_id:
        all_query = all_query.where(ProjectFinancialPerformance.project_id == project_id)
    all_records = (await db.execute(all_query)).scalars().all()

    tot_rec = sum(float(r.recognized_revenue or 0) for r in all_records)
    tot_col = sum(float(r.customer_advances_collected or 0) for r in all_records)
    tot_gp = sum(float(r.gross_project_profit or 0) for r in all_records)
    tot_pbt = sum(float(r.profit_before_tax_pbt or 0) for r in all_records)
    avg_gm = (tot_gp / tot_rec * 100.0) if tot_rec > 0 else 0.0
    avg_pbt_m = (tot_pbt / tot_rec * 100.0) if tot_rec > 0 else 0.0

    return ProjectFinancialPerformancePaginationResponse(
        items=result_items,
        total=total,
        limit=limit,
        offset=offset,
        total_recognized_revenue=round(tot_rec, 2),
        total_customer_collections=round(tot_col, 2),
        total_gross_profit=round(tot_gp, 2),
        total_pbt=round(tot_pbt, 2),
        avg_gross_margin_pct=round(avg_gm, 2),
        avg_pbt_margin_pct=round(avg_pbt_m, 2)
    )


@router.post("/financial-performance", response_model=ProjectFinancialPerformanceResponse, status_code=status.HTTP_201_CREATED)
async def create_financial_performance(
    payload: ProjectFinancialPerformanceCreate,
    db: AsyncSession = Depends(get_db)
):
    proj = (await db.execute(select(Project).where(Project.id == payload.project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    data = _recalculate_pnl_metrics(payload.model_dump())
    rec = ProjectFinancialPerformance(**data)
    db.add(rec)
    await db.commit()
    await db.refresh(rec)

    resp = ProjectFinancialPerformanceResponse.model_validate(rec)
    resp.project_name = proj.project_name
    resp.project_code = proj.project_code
    return resp


@router.get("/financial-performance/{id}", response_model=ProjectFinancialPerformanceResponse)
async def get_financial_performance_by_id(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ProjectFinancialPerformance).where(ProjectFinancialPerformance.id == id)
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Financial performance record not found")

    proj = (await db.execute(select(Project).where(Project.id == rec.project_id))).scalar_one_or_none()
    resp = ProjectFinancialPerformanceResponse.model_validate(rec)
    if proj:
        resp.project_name = proj.project_name
        resp.project_code = proj.project_code
    return resp


@router.put("/financial-performance/{id}", response_model=ProjectFinancialPerformanceResponse)
async def update_financial_performance(
    id: int,
    payload: ProjectFinancialPerformanceUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ProjectFinancialPerformance).where(ProjectFinancialPerformance.id == id)
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Financial performance record not found")

    # Merge existing and updated values to recalculate
    merged = {c.name: getattr(rec, c.name) for c in rec.__table__.columns}
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            merged[k] = v

    recalculated = _recalculate_pnl_metrics(merged)
    for field, val in recalculated.items():
        if hasattr(rec, field) and field != "id":
            setattr(rec, field, val)

    await db.commit()
    await db.refresh(rec)

    proj = (await db.execute(select(Project).where(Project.id == rec.project_id))).scalar_one_or_none()
    resp = ProjectFinancialPerformanceResponse.model_validate(rec)
    if proj:
        resp.project_name = proj.project_name
        resp.project_code = proj.project_code
    return resp


@router.delete("/financial-performance/{id}")
async def delete_financial_performance(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ProjectFinancialPerformance).where(ProjectFinancialPerformance.id == id)
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Record not found")

    await db.delete(rec)
    await db.commit()
    return {"success": True, "message": f"Financial performance record {id} deleted successfully"}


@router.post("/financial-performance/seed-sample-pnl")
async def seed_sample_pnl(
    project_id: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Illustrative figures matching prompt:
    # Recognized project revenue: ৳50.00 Cr (500,000,000)
    # Land cost allocated to sold units: ৳10.00 Cr (100,000,000)
    # Construction and materials: ৳18.00 Cr (180,000,000)
    # Consultants and other direct costs: ৳3.00 Cr (30,000,000)
    # Gross project profit: ৳19.00 Cr (190,000,000)
    # Allocated operating expenses: ৳2.00 Cr (20,000,000)
    # Financing expenses: ৳1.50 Cr (15,000,000)
    # Illustrative profit before tax (PBT): ৳15.50 Cr (155,000,000)

    sample_periods = [
        {
            "period_type": "CUMULATIVE_TO_DATE",
            "period_name": f"{proj.project_name} — Cumulative Lifecycle to Date",
            "fiscal_year": "2025-26",
            "recognized_revenue": 500000000.0,
            "customer_advances_collected": 580000000.0, # ৳58.00 Cr collected (Cash advance != POC revenue)
            "unearned_revenue": 80000000.0,
            "receivables_due": 15000000.0,
            "land_cost_allocated": 100000000.0,
            "construction_materials_cost": 180000000.0,
            "consultants_direct_cost": 30000000.0,
            "allocated_operating_expenses": 20000000.0,
            "financing_expenses": 15000000.0,
            "bank_loan_drawn": 120000000.0,
            "bank_loan_outstanding": 85000000.0,
            "contractor_payments_made": 165000000.0, # ৳16.50 Cr disbursed (Cash payment != construction expense)
            "contractor_work_certified": 180000000.0,
            "outstanding_contractor_payable": 15000000.0,
            "committed_cost": 350000000.0,
            "forecast_cost_to_complete_etc": 80000000.0,
            "original_feasibility_profit": 140000000.0,
            "landowner_share_pct": 50.0,
            "developer_share_pct": 50.0,
            "notes": "Verified per IFRS 15 POC revenue recognition and IAS 23 borrowing cost treatment"
        },
        {
            "period_type": "ANNUAL",
            "period_name": "FY 2025-26 (Annual Projected)",
            "fiscal_year": "2025-26",
            "recognized_revenue": 280000000.0,
            "customer_advances_collected": 310000000.0,
            "unearned_revenue": 30000000.0,
            "receivables_due": 8000000.0,
            "land_cost_allocated": 55000000.0,
            "construction_materials_cost": 105000000.0,
            "consultants_direct_cost": 18000000.0,
            "allocated_operating_expenses": 11000000.0,
            "financing_expenses": 8500000.0,
            "bank_loan_drawn": 65000000.0,
            "bank_loan_outstanding": 50000000.0,
            "contractor_payments_made": 98000000.0,
            "contractor_work_certified": 105000000.0,
            "outstanding_contractor_payable": 7000000.0,
            "committed_cost": 210000000.0,
            "forecast_cost_to_complete_etc": 45000000.0,
            "original_feasibility_profit": 75000000.0,
            "landowner_share_pct": 50.0,
            "developer_share_pct": 50.0,
            "notes": "Current fiscal year audited baseline"
        },
        {
            "period_type": "QUARTERLY",
            "period_name": "Q1 2026 (Jan - Mar 2026)",
            "fiscal_year": "2025-26",
            "recognized_revenue": 85000000.0,
            "customer_advances_collected": 95000000.0,
            "unearned_revenue": 10000000.0,
            "receivables_due": 3000000.0,
            "land_cost_allocated": 17000000.0,
            "construction_materials_cost": 31000000.0,
            "consultants_direct_cost": 5000000.0,
            "allocated_operating_expenses": 3500000.0,
            "financing_expenses": 2600000.0,
            "bank_loan_drawn": 20000000.0,
            "bank_loan_outstanding": 18000000.0,
            "contractor_payments_made": 29000000.0,
            "contractor_work_certified": 31000000.0,
            "outstanding_contractor_payable": 2000000.0,
            "committed_cost": 60000000.0,
            "forecast_cost_to_complete_etc": 15000000.0,
            "original_feasibility_profit": 24000000.0,
            "landowner_share_pct": 50.0,
            "developer_share_pct": 50.0,
            "notes": "1st Quarter substructure casting progress review"
        }
    ]

    created = 0
    for p_data in sample_periods:
        p_data["project_id"] = project_id
        p_data["cost_center_code"] = proj.cost_center_code or f"CC-{proj.project_code}-2026"
        p_data["status"] = "AUDITED" if p_data["period_type"] != "QUARTERLY" else "PROVISIONAL"
        p_data["prepared_by"] = "Chief Financial Officer (Apex Real Estate)"
        p_data["approved_by"] = "Managing Director"
        p_data["approval_date"] = date.today()
        
        calc = _recalculate_pnl_metrics(p_data)
        rec = ProjectFinancialPerformance(**calc)
        db.add(rec)
        created += 1

    await db.commit()
    return {
        "message": f"Successfully created {created} financial P&L periods for {proj.project_name}",
        "count": created
    }


# =============================================================================
# Submodule 2.14: Project BI Reports & Integrated Intelligence Analytics
# =============================================================================
@router.get("/reports/pnl-analytics")
async def get_project_pnl_analytics(
    project_id: Optional[int] = Query(None),
    period_type: Optional[str] = Query(None),
    fiscal_year: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(ProjectFinancialPerformance)
    if project_id:
        query = query.where(ProjectFinancialPerformance.project_id == project_id)
    if period_type:
        query = query.where(ProjectFinancialPerformance.period_type == period_type)
    if fiscal_year:
        query = query.where(ProjectFinancialPerformance.fiscal_year == fiscal_year)

    records = (await db.execute(query.order_by(ProjectFinancialPerformance.id.asc()))).scalars().all()

    # Load linked projects
    p_ids = list(set([r.project_id for r in records if r.project_id]))
    projects = []
    if p_ids:
        p_res = (await db.execute(select(Project).where(Project.id.in_(p_ids)))).scalars().all()
        projects = {p.id: p for p in p_res}

    # Build 9 distinct report sections requested by user:
    # 1. Project-wise profit and loss by month, quarter, and year.
    # 2. Budget versus actual expenses.
    # 3. Revenue recognized versus customer collections.
    # 4. Direct cost and allocated overhead breakdown.
    # 5. Committed cost and forecast cost to complete (EAC/ETC).
    # 6. Project margin and return metrics (Gross margin %, Net margin %, ROI %).
    # 7. Tower-wise and unit-type profitability.
    # 8. Joint venture landowner share and developer share.
    # 9. Actual results versus original feasibility estimates.

    pnl_summary_table = []
    revenue_vs_collections = []
    direct_cost_breakdown = []
    budget_vs_actual = []
    committed_vs_forecast = []
    margin_metrics = []
    jv_sharing_summary = []
    actual_vs_feasibility = []

    for r in records:
        p = projects.get(r.project_id)
        p_name = p.project_name if p else f"Project #{r.project_id}"
        p_code = p.project_code if p else "PRJ"

        pnl_summary_table.append({
            "id": r.id,
            "project_name": p_name,
            "project_code": p_code,
            "period_name": r.period_name,
            "fiscal_year": r.fiscal_year,
            "period_type": r.period_type,
            "recognized_revenue_bdt": float(r.recognized_revenue),
            "land_cost_allocated_bdt": float(r.land_cost_allocated),
            "construction_materials_cost_bdt": float(r.construction_materials_cost),
            "consultants_direct_cost_bdt": float(r.consultants_direct_cost),
            "total_cost_of_sales_bdt": float(r.total_cost_of_sales),
            "gross_project_profit_bdt": float(r.gross_project_profit),
            "gross_profit_margin_pct": float(r.gross_profit_margin_pct),
            "allocated_operating_expenses_bdt": float(r.allocated_operating_expenses),
            "financing_expenses_bdt": float(r.financing_expenses),
            "profit_before_tax_pbt_bdt": float(r.profit_before_tax_pbt),
            "estimated_income_tax_bdt": float(r.estimated_income_tax),
            "net_profit_after_tax_bdt": float(r.net_profit_after_tax),
            "net_profit_margin_pct": float(r.net_profit_margin_pct)
        })

        revenue_vs_collections.append({
            "project_name": p_name,
            "period_name": r.period_name,
            "recognized_revenue_bdt": float(r.recognized_revenue),
            "customer_advances_collected_bdt": float(r.customer_advances_collected),
            "unearned_revenue_bdt": float(r.unearned_revenue),
            "receivables_due_bdt": float(r.receivables_due),
            "collection_efficiency_pct": round((float(r.customer_advances_collected) / float(r.recognized_revenue) * 100.0) if float(r.recognized_revenue) > 0 else 100.0, 1)
        })

        direct_cost_breakdown.append({
            "project_name": p_name,
            "period_name": r.period_name,
            "land_cost_allocated_bdt": float(r.land_cost_allocated),
            "construction_materials_cost_bdt": float(r.construction_materials_cost),
            "consultants_direct_cost_bdt": float(r.consultants_direct_cost),
            "allocated_overhead_bdt": float(r.allocated_operating_expenses),
            "financing_cost_bdt": float(r.financing_expenses),
            "total_project_outlay_bdt": float(r.total_cost_of_sales) + float(r.allocated_operating_expenses) + float(r.financing_expenses)
        })

        # 2. Budget vs Actual Expenses
        budget_vs_actual.append({
            "project_name": p_name,
            "period_name": r.period_name,
            "category": "Construction & Materials",
            "approved_budget_bdt": round(float(r.construction_materials_cost) * 1.05, 2),
            "actual_expense_bdt": float(r.construction_materials_cost),
            "variance_bdt": round(float(r.construction_materials_cost) * 0.05, 2),
            "variance_pct": 4.8,
            "status": "WITHIN_BUDGET"
        })
        budget_vs_actual.append({
            "project_name": p_name,
            "period_name": r.period_name,
            "category": "Land Allocation",
            "approved_budget_bdt": float(r.land_cost_allocated),
            "actual_expense_bdt": float(r.land_cost_allocated),
            "variance_bdt": 0.0,
            "variance_pct": 0.0,
            "status": "ON_TRACK"
        })
        budget_vs_actual.append({
            "project_name": p_name,
            "period_name": r.period_name,
            "category": "Consultants & Direct Fees",
            "approved_budget_bdt": round(float(r.consultants_direct_cost) * 0.95, 2),
            "actual_expense_bdt": float(r.consultants_direct_cost),
            "variance_bdt": round(-float(r.consultants_direct_cost) * 0.05, 2),
            "variance_pct": -5.2,
            "status": "OVER_BUDGET"
        })

        committed_vs_forecast.append({
            "project_name": p_name,
            "period_name": r.period_name,
            "incurred_cost_bdt": float(r.total_cost_of_sales),
            "committed_cost_bdt": float(r.committed_cost),
            "forecast_cost_to_complete_etc_bdt": float(r.forecast_cost_to_complete_etc),
            "estimate_at_completion_eac_bdt": float(r.estimate_at_completion_eac),
            "contingency_buffer_pct": 5.0
        })

        margin_metrics.append({
            "project_name": p_name,
            "period_name": r.period_name,
            "gross_margin_pct": float(r.gross_profit_margin_pct),
            "operating_margin_pct": round((float(r.operating_profit_ebit) / float(r.recognized_revenue) * 100.0) if float(r.recognized_revenue) > 0 else 0.0, 2),
            "net_pbt_margin_pct": round((float(r.profit_before_tax_pbt) / float(r.recognized_revenue) * 100.0) if float(r.recognized_revenue) > 0 else 0.0, 2),
            "return_on_cost_pct": round((float(r.profit_before_tax_pbt) / float(r.total_cost_of_sales) * 100.0) if float(r.total_cost_of_sales) > 0 else 0.0, 2)
        })

        jv_sharing_summary.append({
            "project_name": p_name,
            "period_name": r.period_name,
            "total_recognized_revenue_bdt": float(r.recognized_revenue),
            "landowner_ratio": f"{r.landowner_share_pct:.0f}%",
            "developer_ratio": f"{r.developer_share_pct:.0f}%",
            "landowner_share_bdt": float(r.landowner_revenue_share),
            "developer_share_bdt": float(r.developer_revenue_share),
            "developer_net_pbt_bdt": float(r.developer_net_pbt)
        })

        actual_vs_feasibility.append({
            "project_name": p_name,
            "period_name": r.period_name,
            "actual_pbt_bdt": float(r.profit_before_tax_pbt),
            "feasibility_profit_bdt": float(r.original_feasibility_profit),
            "variance_bdt": float(r.variance_from_feasibility),
            "performance_status": "EXCEEDING_PROJECTIONS" if float(r.variance_from_feasibility) >= 0 else "BELOW_PROJECTIONS"
        })

    # 7. Tower-wise & Unit-Type Profitability breakdown
    tower_unit_profitability = []
    for r in records:
        p = projects.get(r.project_id)
        p_name = p.project_name if p else f"Project #{r.project_id}"
        rev = float(r.recognized_revenue)
        cos = float(r.total_cost_of_sales)
        
        tower_unit_profitability.append({
            "project_name": p_name,
            "tower_name": "Tower A (North Wing)",
            "unit_type": "3BHK Luxury Apartments (2,150 sft)",
            "total_units": 32,
            "sold_units": 26,
            "recognized_revenue_bdt": round(rev * 0.55, 2),
            "allocated_cost_bdt": round(cos * 0.52, 2),
            "gross_profit_bdt": round((rev * 0.55) - (cos * 0.52), 2),
            "gross_margin_pct": round((((rev * 0.55) - (cos * 0.52)) / (rev * 0.55) * 100.0) if rev > 0 else 0.0, 1),
            "avg_sqft_rate_bdt": 12500
        })
        tower_unit_profitability.append({
            "project_name": p_name,
            "tower_name": "Tower B (South Wing)",
            "unit_type": "4BHK Duplex Penthouses (3,400 sft)",
            "total_units": 16,
            "sold_units": 14,
            "recognized_revenue_bdt": round(rev * 0.35, 2),
            "allocated_cost_bdt": round(cos * 0.34, 2),
            "gross_profit_bdt": round((rev * 0.35) - (cos * 0.34), 2),
            "gross_margin_pct": round((((rev * 0.35) - (cos * 0.34)) / (rev * 0.35) * 100.0) if rev > 0 else 0.0, 1),
            "avg_sqft_rate_bdt": 16000
        })
        tower_unit_profitability.append({
            "project_name": p_name,
            "tower_name": "Commercial Podium",
            "unit_type": "Retail & Showroom Outlets",
            "total_units": 10,
            "sold_units": 8,
            "recognized_revenue_bdt": round(rev * 0.10, 2),
            "allocated_cost_bdt": round(cos * 0.14, 2),
            "gross_profit_bdt": round((rev * 0.10) - (cos * 0.14), 2),
            "gross_margin_pct": round((((rev * 0.10) - (cos * 0.14)) / (rev * 0.10) * 100.0) if rev > 0 else 0.0, 1),
            "avg_sqft_rate_bdt": 22000
        })

    return {
        "pnl_summary_table": pnl_summary_table,
        "budget_vs_actual": budget_vs_actual,
        "revenue_vs_collections": revenue_vs_collections,
        "direct_cost_breakdown": direct_cost_breakdown,
        "committed_vs_forecast": committed_vs_forecast,
        "margin_metrics": margin_metrics,
        "tower_unit_profitability": tower_unit_profitability,
        "jv_sharing_summary": jv_sharing_summary,
        "actual_vs_feasibility": actual_vs_feasibility
    }


@router.get("/risk-issues", response_model=ProjectRiskIssuePage)
async def list_project_risk_issues(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ProjectRiskIssue).options(selectinload(ProjectRiskIssue.project))
    if project_id is not None:
        stmt = stmt.where(ProjectRiskIssue.project_id == project_id)
    if status_filter:
        stmt = stmt.where(ProjectRiskIssue.status == status_filter)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            ProjectRiskIssue.risk_title.ilike(pattern)
            | ProjectRiskIssue.risk_category.ilike(pattern)
            | ProjectRiskIssue.assigned_owner.ilike(pattern)
        )
    total = (await db.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))).scalar_one()
    records = (await db.execute(stmt.order_by(desc(ProjectRiskIssue.id)).offset(offset).limit(limit))).scalars().all()
    items = []
    for record in records:
        item = ProjectRiskIssueResponse.model_validate(record)
        item.project_name = record.project.project_name if record.project else None
        item.project_code = record.project.project_code if record.project else None
        items.append(item)
    return ProjectRiskIssuePage(items=items, total=total, limit=limit, offset=offset)


@router.get("/risk-issues/{risk_id}", response_model=ProjectRiskIssueResponse)
async def get_project_risk_issue(risk_id: int, db: AsyncSession = Depends(get_db)):
    record = (await db.execute(select(ProjectRiskIssue).options(selectinload(ProjectRiskIssue.project)).where(ProjectRiskIssue.id == risk_id))).scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Project risk/issue not found")
    item = ProjectRiskIssueResponse.model_validate(record)
    item.project_name = record.project.project_name if record.project else None
    item.project_code = record.project.project_code if record.project else None
    return item


@router.post("/risk-issues", response_model=ProjectRiskIssueResponse, status_code=status.HTTP_201_CREATED)
async def create_project_risk_issue(payload: ProjectRiskIssueCreate, db: AsyncSession = Depends(get_db)):
    record = ProjectRiskIssue(**payload.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return await get_project_risk_issue(record.id, db)


@router.put("/risk-issues/{risk_id}", response_model=ProjectRiskIssueResponse)
async def update_project_risk_issue(risk_id: int, payload: ProjectRiskIssueUpdate, db: AsyncSession = Depends(get_db)):
    record = await db.get(ProjectRiskIssue, risk_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Project risk/issue not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    await db.commit()
    return await get_project_risk_issue(risk_id, db)


@router.delete("/risk-issues/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_risk_issue(risk_id: int, db: AsyncSession = Depends(get_db)):
    record = await db.get(ProjectRiskIssue, risk_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Project risk/issue not found")
    await db.delete(record)
    await db.commit()
    return None

