from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.modules.land.models import LandBank
from app.modules.projects.models import (
    Project, Tower, AuthorityClearance, BOQItem, Drawing
)
from app.modules.projects.schemas import (
    ProjectCreate, ProjectResponse,
    TowerCreate, TowerResponse,
    AuthorityClearanceCreate, AuthorityClearanceUpdate, AuthorityClearanceResponse,
    BOQItemCreate, BOQItemResponse,
    DrawingCreate, DrawingResponse,
    calculate_dhaka_far_2008
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
    existing = await db.execute(select(Project).where(Project.project_code == payload.project_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Project code '{payload.project_code}' already exists.")

    # Determine plot area from land bank if provided and not explicitly specified
    plot_sqft = payload.plot_area_sqft or 0.0
    if payload.land_bank_id and plot_sqft == 0:
        lb_res = await db.execute(select(LandBank).where(LandBank.id == payload.land_bank_id))
        land_bank = lb_res.scalar_one_or_none()
        if land_bank:
            plot_sqft = float(land_bank.total_area_sqft)

    # Compute Dhaka FAR 2008 values
    far_data = calculate_dhaka_far_2008(
        plot_area_sqft=plot_sqft if plot_sqft > 0 else 14400.0,
        road_width_feet=payload.road_width_feet
    )

    project = Project(
        land_bank_id=payload.land_bank_id,
        project_code=payload.project_code.strip().upper(),
        project_name=payload.project_name.strip(),
        development_authority_id=payload.development_authority_id.upper(),
        far_allocated=far_data["permissible_far"],
        mgc_percent=far_data["mgc_percent"],
        road_width_feet=payload.road_width_feet,
        plot_area_sqft=plot_sqft,
        total_builtup_area_sqft=far_data["max_permissible_builtup_sqft"],
        total_saleable_area_sqft=far_data["estimated_saleable_sqft"],
        planned_handover_date=payload.planned_handover_date,
        status=payload.status or "PLANNING",
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


# -------------------------------------------------------------
# 3. Statutory Authority Clearances (RAJUK, CDA, Fire NOC, Aviation, etc.)
# -------------------------------------------------------------
@router.get("/clearances", response_model=List[AuthorityClearanceResponse])
async def list_clearances(
    project_id: Optional[int] = Query(None),
    clearance_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuthorityClearance).order_by(desc(AuthorityClearance.id))
    if project_id:
        stmt = stmt.where(AuthorityClearance.project_id == project_id)
    if clearance_type:
        stmt = stmt.where(AuthorityClearance.clearance_type_id == clearance_type.upper())
    if status_filter:
        stmt = stmt.where(AuthorityClearance.status == status_filter)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.put("/clearances/{clearance_id}", response_model=AuthorityClearanceResponse)
async def update_clearance(
    clearance_id: int,
    payload: AuthorityClearanceUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuthorityClearance).where(AuthorityClearance.id == clearance_id)
    res = await db.execute(stmt)
    cl = res.scalar_one_or_none()
    if not cl:
        raise HTTPException(status_code=404, detail="Clearance record not found")

    if payload.application_memo_no is not None:
        cl.application_memo_no = payload.application_memo_no
    if payload.approved_memo_no is not None:
        cl.approved_memo_no = payload.approved_memo_no
    if payload.approval_date is not None:
        cl.approval_date = payload.approval_date
    if payload.expiry_date is not None:
        cl.expiry_date = payload.expiry_date
    if payload.status is not None:
        cl.status = payload.status
    if payload.document_url is not None:
        cl.document_url = payload.document_url
    if payload.remarks is not None:
        cl.remarks = payload.remarks

    await db.commit()
    await db.refresh(cl)
    return cl


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
