from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, update
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.modules.inventory.models import PriceList, PriceOverride, PriceChangeAudit, Quotation, Unit
from app.modules.projects.models import Project
from app.modules.inventory.pricing_schemas import (
    PriceListCreate, PriceListUpdate, PriceListResponse, PriceListPagedResponse,
    PriceOverrideCreate, PriceOverrideApproval, PriceOverrideResponse, PriceOverridePagedResponse,
    PriceChangeAuditResponse, PriceAuditPagedResponse,
    QuotationCreate, QuotationResponse, QuotationPagedResponse,
    PricingCalculationRequest, PricingCalculationResponse
)

router = APIRouter(prefix="/pricing", tags=["Unit Pricing & Price List Management (Spec 3.5)"])

# -------------------------------------------------------------
# 1. Master Price Lists Management
# -------------------------------------------------------------
@router.get("/price-lists", response_model=PriceListPagedResponse)
async def list_price_lists(
    project_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Centralized master price lists with versioning, orientation premiums,
    and discount authorization limits.
    """
    query = select(PriceList)

    if project_id:
        query = query.where(PriceList.project_id == project_id)
    if status and status != "all":
        query = query.where(PriceList.status == status)
    if search:
        search_filter = or_(
            PriceList.version_code.ilike(f"%{search}%"),
            PriceList.title.ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    total_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_stmt)).scalar() or 0

    # Auto seed initial price lists if completely empty
    if total == 0 and offset == 0:
        seed_lists = [
            PriceList(
                project_id=1,
                version_code="PL-GL-2026-V1",
                title="Gulshan Lakeview Launch Rate Card",
                base_rate_per_sqft=12500.00,
                floor_escalation_rate=100.00,
                facing_premium_lake=600.00,
                facing_premium_south=400.00,
                facing_premium_corner=300.00,
                facing_premium_road=150.00,
                parking_standard_rate=800000.00,
                parking_vip_rate=1200000.00,
                utility_connection_rate=250000.00,
                min_selling_rate_per_sqft=11500.00,
                max_discount_pct_exec=3.00,
                max_discount_pct_mgr=7.00,
                max_discount_pct_dir=15.00,
                status="ACTIVE",
                approved_by="Executive Committee",
                notes="Board approved launch rate card with Lake View and Corner premiums."
            ),
            PriceList(
                project_id=2,
                version_code="PL-BB-2026-V2",
                title="Banani Boulevard Commercial & Resi Q1",
                base_rate_per_sqft=14500.00,
                floor_escalation_rate=150.00,
                facing_premium_lake=500.00,
                facing_premium_south=350.00,
                facing_premium_corner=400.00,
                facing_premium_road=250.00,
                parking_standard_rate=1000000.00,
                parking_vip_rate=1500000.00,
                utility_connection_rate=300000.00,
                min_selling_rate_per_sqft=13500.00,
                max_discount_pct_exec=2.50,
                max_discount_pct_mgr=6.00,
                max_discount_pct_dir=12.00,
                status="ACTIVE",
                approved_by="Managing Director",
                notes="Revised Q1 baseline for high-rise commercial tower."
            ),
            PriceList(
                project_id=3,
                version_code="PL-UNS-2026-V1",
                title="Uttara North Star Standard Pricing",
                base_rate_per_sqft=8500.00,
                floor_escalation_rate=75.00,
                facing_premium_lake=300.00,
                facing_premium_south=200.00,
                facing_premium_corner=150.00,
                facing_premium_road=100.00,
                parking_standard_rate=600000.00,
                parking_vip_rate=900000.00,
                utility_connection_rate=200000.00,
                min_selling_rate_per_sqft=7800.00,
                max_discount_pct_exec=4.00,
                max_discount_pct_mgr=8.00,
                max_discount_pct_dir=15.00,
                status="APPROVED",
                approved_by="Sales Director",
                notes="Affordable residential tower pricing version."
            )
        ]
        for s in seed_lists:
            db.add(s)
        await db.commit()

        # Re-query
        query = select(PriceList)
        total = len(seed_lists)

    query = query.order_by(desc(PriceList.id)).offset(offset).limit(limit)
    rows = (await db.execute(query)).scalars().all()

    # Map with project names
    items = []
    for r in rows:
        p_name = None
        if r.project_id:
            p_stmt = select(Project.name).where(Project.id == r.project_id)
            p_name = (await db.execute(p_stmt)).scalar()
        item = PriceListResponse(
            id=r.id,
            project_id=r.project_id,
            tower_id=r.tower_id,
            project_name=p_name or f"Project #{r.project_id}",
            version_code=r.version_code,
            title=r.title,
            base_rate_per_sqft=float(r.base_rate_per_sqft or 0),
            floor_escalation_rate=float(r.floor_escalation_rate or 0),
            facing_premium_lake=float(r.facing_premium_lake or 0),
            facing_premium_south=float(r.facing_premium_south or 0),
            facing_premium_corner=float(r.facing_premium_corner or 0),
            facing_premium_road=float(r.facing_premium_road or 0),
            parking_standard_rate=float(r.parking_standard_rate or 0),
            parking_vip_rate=float(r.parking_vip_rate or 0),
            utility_connection_rate=float(r.utility_connection_rate or 0),
            min_selling_rate_per_sqft=float(r.min_selling_rate_per_sqft or 0),
            max_discount_pct_exec=float(r.max_discount_pct_exec or 0),
            max_discount_pct_mgr=float(r.max_discount_pct_mgr or 0),
            max_discount_pct_dir=float(r.max_discount_pct_dir or 0),
            effective_from=r.effective_from,
            effective_to=r.effective_to,
            status=r.status,
            approved_by=r.approved_by,
            notes=r.notes,
            created_at=r.created_at
        )
        items.append(item)

    return PriceListPagedResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/price-lists", response_model=PriceListResponse, status_code=status.HTTP_201_CREATED)
async def create_price_list(
    payload: PriceListCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new project master price list with statutory limits and versioning.
    """
    # Check duplicate version code
    dup = (await db.execute(select(PriceList).where(PriceList.version_code == payload.version_code))).scalar_one_or_none()
    if dup:
        raise HTTPException(status_code=400, detail=f"Price list version '{payload.version_code}' already exists.")

    new_pl = PriceList(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        version_code=payload.version_code.strip().upper(),
        title=payload.title.strip(),
        base_rate_per_sqft=payload.base_rate_per_sqft,
        floor_escalation_rate=payload.floor_escalation_rate,
        facing_premium_lake=payload.facing_premium_lake,
        facing_premium_south=payload.facing_premium_south,
        facing_premium_corner=payload.facing_premium_corner,
        facing_premium_road=payload.facing_premium_road,
        parking_standard_rate=payload.parking_standard_rate,
        parking_vip_rate=payload.parking_vip_rate,
        utility_connection_rate=payload.utility_connection_rate,
        min_selling_rate_per_sqft=payload.min_selling_rate_per_sqft,
        max_discount_pct_exec=payload.max_discount_pct_exec,
        max_discount_pct_mgr=payload.max_discount_pct_mgr,
        max_discount_pct_dir=payload.max_discount_pct_dir,
        effective_from=payload.effective_from or datetime.now(timezone.utc),
        effective_to=payload.effective_to,
        status=payload.status,
        notes=payload.notes
    )
    db.add(new_pl)
    await db.commit()
    await db.refresh(new_pl)

    # Log initial creation audit
    audit = PriceChangeAudit(
        price_list_id=new_pl.id,
        project_id=new_pl.project_id,
        field_changed="PRICE_LIST_CREATED",
        old_value="NONE",
        new_value=f"Base Rate: {new_pl.base_rate_per_sqft}",
        changed_by="Pricing Admin",
        reason=f"New Price List {new_pl.version_code} created: {new_pl.title}"
    )
    db.add(audit)
    await db.commit()

    p_stmt = select(Project.name).where(Project.id == new_pl.project_id)
    p_name = (await db.execute(p_stmt)).scalar()

    return PriceListResponse(
        id=new_pl.id,
        project_id=new_pl.project_id,
        tower_id=new_pl.tower_id,
        project_name=p_name or f"Project #{new_pl.project_id}",
        version_code=new_pl.version_code,
        title=new_pl.title,
        base_rate_per_sqft=float(new_pl.base_rate_per_sqft),
        floor_escalation_rate=float(new_pl.floor_escalation_rate),
        facing_premium_lake=float(new_pl.facing_premium_lake),
        facing_premium_south=float(new_pl.facing_premium_south),
        facing_premium_corner=float(new_pl.facing_premium_corner),
        facing_premium_road=float(new_pl.facing_premium_road),
        parking_standard_rate=float(new_pl.parking_standard_rate),
        parking_vip_rate=float(new_pl.parking_vip_rate),
        utility_connection_rate=float(new_pl.utility_connection_rate),
        min_selling_rate_per_sqft=float(new_pl.min_selling_rate_per_sqft),
        max_discount_pct_exec=float(new_pl.max_discount_pct_exec),
        max_discount_pct_mgr=float(new_pl.max_discount_pct_mgr),
        max_discount_pct_dir=float(new_pl.max_discount_pct_dir),
        effective_from=new_pl.effective_from,
        effective_to=new_pl.effective_to,
        status=new_pl.status,
        approved_by=new_pl.approved_by,
        notes=new_pl.notes,
        created_at=new_pl.created_at
    )


@router.put("/price-lists/{list_id}", response_model=PriceListResponse)
async def update_price_list(
    list_id: int,
    payload: PriceListUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update price list fields and automatically register an immutable price audit trail.
    """
    pl = (await db.execute(select(PriceList).where(PriceList.id == list_id))).scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Price list not found")

    # Record audit if base rate changed
    if payload.base_rate_per_sqft is not None and float(payload.base_rate_per_sqft) != float(pl.base_rate_per_sqft):
        audit = PriceChangeAudit(
            price_list_id=pl.id,
            project_id=pl.project_id,
            field_changed="BASE_RATE_PER_SQFT",
            old_value=str(pl.base_rate_per_sqft),
            new_value=str(payload.base_rate_per_sqft),
            changed_by="Pricing Officer",
            reason="Price revision under Board review"
        )
        db.add(audit)
        pl.base_rate_per_sqft = payload.base_rate_per_sqft

    if payload.title is not None: pl.title = payload.title
    if payload.floor_escalation_rate is not None: pl.floor_escalation_rate = payload.floor_escalation_rate
    if payload.facing_premium_lake is not None: pl.facing_premium_lake = payload.facing_premium_lake
    if payload.facing_premium_south is not None: pl.facing_premium_south = payload.facing_premium_south
    if payload.facing_premium_corner is not None: pl.facing_premium_corner = payload.facing_premium_corner
    if payload.facing_premium_road is not None: pl.facing_premium_road = payload.facing_premium_road
    if payload.parking_standard_rate is not None: pl.parking_standard_rate = payload.parking_standard_rate
    if payload.parking_vip_rate is not None: pl.parking_vip_rate = payload.parking_vip_rate
    if payload.utility_connection_rate is not None: pl.utility_connection_rate = payload.utility_connection_rate
    if payload.min_selling_rate_per_sqft is not None: pl.min_selling_rate_per_sqft = payload.min_selling_rate_per_sqft
    if payload.max_discount_pct_exec is not None: pl.max_discount_pct_exec = payload.max_discount_pct_exec
    if payload.max_discount_pct_mgr is not None: pl.max_discount_pct_mgr = payload.max_discount_pct_mgr
    if payload.max_discount_pct_dir is not None: pl.max_discount_pct_dir = payload.max_discount_pct_dir
    if payload.effective_to is not None: pl.effective_to = payload.effective_to
    if payload.status is not None: pl.status = payload.status
    if payload.notes is not None: pl.notes = payload.notes

    await db.commit()
    await db.refresh(pl)

    p_stmt = select(Project.name).where(Project.id == pl.project_id)
    p_name = (await db.execute(p_stmt)).scalar()

    return PriceListResponse(
        id=pl.id,
        project_id=pl.project_id,
        tower_id=pl.tower_id,
        project_name=p_name or f"Project #{pl.project_id}",
        version_code=pl.version_code,
        title=pl.title,
        base_rate_per_sqft=float(pl.base_rate_per_sqft),
        floor_escalation_rate=float(pl.floor_escalation_rate),
        facing_premium_lake=float(pl.facing_premium_lake),
        facing_premium_south=float(pl.facing_premium_south),
        facing_premium_corner=float(pl.facing_premium_corner),
        facing_premium_road=float(pl.facing_premium_road),
        parking_standard_rate=float(pl.parking_standard_rate),
        parking_vip_rate=float(pl.parking_vip_rate),
        utility_connection_rate=float(pl.utility_connection_rate),
        min_selling_rate_per_sqft=float(pl.min_selling_rate_per_sqft),
        max_discount_pct_exec=float(pl.max_discount_pct_exec),
        max_discount_pct_mgr=float(pl.max_discount_pct_mgr),
        max_discount_pct_dir=float(pl.max_discount_pct_dir),
        effective_from=pl.effective_from,
        effective_to=pl.effective_to,
        status=pl.status,
        approved_by=pl.approved_by,
        notes=pl.notes,
        created_at=pl.created_at
    )


@router.post("/price-lists/{list_id}/approve")
async def approve_price_list(
    list_id: int,
    approver_name: str = Query("Managing Director"),
    db: AsyncSession = Depends(get_db)
):
    """
    Formally approve a price list version.
    """
    pl = (await db.execute(select(PriceList).where(PriceList.id == list_id))).scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Price list not found")

    pl.status = "APPROVED"
    pl.approved_by = approver_name

    audit = PriceChangeAudit(
        price_list_id=pl.id,
        project_id=pl.project_id,
        field_changed="STATUS_APPROVED",
        old_value="DRAFT",
        new_value="APPROVED",
        changed_by=approver_name,
        reason=f"Price list {pl.version_code} formally authorized by {approver_name}"
    )
    db.add(audit)
    await db.commit()
    return {"success": True, "message": f"Price list {pl.version_code} approved successfully."}


@router.post("/price-lists/{list_id}/activate")
async def activate_price_list(
    list_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Activate a price list for a project and set prior active lists to ARCHIVED.
    """
    pl = (await db.execute(select(PriceList).where(PriceList.id == list_id))).scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Price list not found")

    # Archive existing active price lists for this project
    await db.execute(
        update(PriceList)
        .where(PriceList.project_id == pl.project_id, PriceList.status == "ACTIVE", PriceList.id != pl.id)
        .values(status="ARCHIVED")
    )

    pl.status = "ACTIVE"
    pl.effective_from = datetime.now(timezone.utc)

    audit = PriceChangeAudit(
        price_list_id=pl.id,
        project_id=pl.project_id,
        field_changed="STATUS_ACTIVE",
        old_value="APPROVED",
        new_value="ACTIVE",
        changed_by="System Administrator",
        reason=f"Price list {pl.version_code} activated as active project rate card"
    )
    db.add(audit)
    await db.commit()
    return {"success": True, "message": f"Price list {pl.version_code} is now ACTIVE."}


# -------------------------------------------------------------
# 2. Unit-Level Price Overrides & Negotiated Exceptions
# -------------------------------------------------------------
@router.get("/overrides", response_model=PriceOverridePagedResponse)
async def list_price_overrides(
    project_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Paged directory of unit-specific negotiated price overrides and discount exception workflows.
    """
    query = select(PriceOverride)

    if project_id:
        query = query.where(PriceOverride.project_id == project_id)
    if status and status != "all":
        query = query.where(PriceOverride.status == status)
    if search:
        search_filter = or_(
            PriceOverride.unit_number.ilike(f"%{search}%"),
            PriceOverride.customer_name.ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    total_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_stmt)).scalar() or 0

    # Auto seed initial overrides if empty
    if total == 0 and offset == 0:
        seed_overrides = [
            PriceOverride(
                project_id=1,
                unit_id=1,
                unit_number="12A",
                customer_name="Dr. Kamal Hossain",
                standard_price=23125000.00,
                negotiated_price=22000000.00,
                discount_amount=1125000.00,
                discount_pct=4.86,
                discount_authority_level="SALES_MANAGER",
                status="APPROVED",
                requested_by="Maksudur Rahman (Senior Exec)",
                approved_by="Tariqul Islam (GM Sales)",
                justification="Upfront 60% down payment committed within 7 days."
            ),
            PriceOverride(
                project_id=1,
                unit_id=2,
                unit_number="14B",
                customer_name="Nasreen Sultana",
                standard_price=24500000.00,
                negotiated_price=22500000.00,
                discount_amount=2000000.00,
                discount_pct=8.16,
                discount_authority_level="MANAGING_DIRECTOR",
                status="PENDING",
                requested_by="Fahim Chowdhury",
                justification="Multiple unit buyer; purchasing 2 units simultaneously."
            )
        ]
        for so in seed_overrides:
            db.add(so)
        await db.commit()
        query = select(PriceOverride)
        total = len(seed_overrides)

    query = query.order_by(desc(PriceOverride.id)).offset(offset).limit(limit)
    rows = (await db.execute(query)).scalars().all()

    items = [
        PriceOverrideResponse(
            id=r.id,
            price_list_id=r.price_list_id,
            project_id=r.project_id,
            unit_id=r.unit_id,
            unit_number=r.unit_number,
            customer_name=r.customer_name,
            standard_price=float(r.standard_price or 0),
            negotiated_price=float(r.negotiated_price or 0),
            discount_amount=float(r.discount_amount or 0),
            discount_pct=float(r.discount_pct or 0),
            discount_authority_level=r.discount_authority_level,
            status=r.status,
            requested_by=r.requested_by,
            approved_by=r.approved_by,
            justification=r.justification,
            created_at=r.created_at
        )
        for r in rows
    ]

    return PriceOverridePagedResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/overrides", response_model=PriceOverrideResponse, status_code=status.HTTP_201_CREATED)
async def create_price_override(
    payload: PriceOverrideCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a unit price override / discount exception request for approval.
    """
    # Verify unit exists
    u = (await db.execute(select(Unit).where(Unit.id == payload.unit_id))).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Unit not found")

    new_po = PriceOverride(
        price_list_id=payload.price_list_id,
        project_id=payload.project_id,
        unit_id=payload.unit_id,
        unit_number=payload.unit_number,
        customer_name=payload.customer_name,
        standard_price=payload.standard_price,
        negotiated_price=payload.negotiated_price,
        discount_amount=payload.discount_amount,
        discount_pct=payload.discount_pct,
        discount_authority_level=payload.discount_authority_level,
        status="PENDING",
        requested_by=payload.requested_by,
        justification=payload.justification
    )
    db.add(new_po)
    await db.commit()
    await db.refresh(new_po)

    # Log audit
    audit = PriceChangeAudit(
        project_id=new_po.project_id,
        unit_id=new_po.unit_id,
        unit_number=new_po.unit_number,
        field_changed="NEGOTIATED_OVERRIDE_REQUESTED",
        old_value=str(new_po.standard_price),
        new_value=str(new_po.negotiated_price),
        changed_by=new_po.requested_by,
        reason=f"Override requested: {new_po.discount_pct}% discount for {new_po.customer_name}"
    )
    db.add(audit)
    await db.commit()

    return PriceOverrideResponse(
        id=new_po.id,
        price_list_id=new_po.price_list_id,
        project_id=new_po.project_id,
        unit_id=new_po.unit_id,
        unit_number=new_po.unit_number,
        customer_name=new_po.customer_name,
        standard_price=float(new_po.standard_price),
        negotiated_price=float(new_po.negotiated_price),
        discount_amount=float(new_po.discount_amount),
        discount_pct=float(new_po.discount_pct),
        discount_authority_level=new_po.discount_authority_level,
        status=new_po.status,
        requested_by=new_po.requested_by,
        approved_by=new_po.approved_by,
        justification=new_po.justification,
        created_at=new_po.created_at
    )


@router.put("/overrides/{override_id}/status")
async def update_override_status(
    override_id: int,
    payload: PriceOverrideApproval,
    db: AsyncSession = Depends(get_db)
):
    """
    Approve or reject a unit negotiated price exception.
    """
    po = (await db.execute(select(PriceOverride).where(PriceOverride.id == override_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Override record not found")

    po.status = payload.status
    po.approved_by = payload.approved_by

    # If approved, update the unit's total price
    if payload.status == "APPROVED":
        u = (await db.execute(select(Unit).where(Unit.id == po.unit_id))).scalar_one_or_none()
        if u:
            u.total_unit_price = po.negotiated_price

    audit = PriceChangeAudit(
        project_id=po.project_id,
        unit_id=po.unit_id,
        unit_number=po.unit_number,
        field_changed=f"OVERRIDE_{payload.status}",
        old_value=str(po.standard_price),
        new_value=str(po.negotiated_price),
        changed_by=payload.approved_by,
        reason=f"Override status set to {payload.status}. {payload.remarks or ''}"
    )
    db.add(audit)
    await db.commit()
    return {"success": True, "message": f"Override has been {payload.status} by {payload.approved_by}."}


# -------------------------------------------------------------
# 3. Price Change Audit Trail
# -------------------------------------------------------------
@router.get("/audits", response_model=PriceAuditPagedResponse)
async def list_price_audits(
    project_id: Optional[int] = Query(None),
    unit_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Complete immutable audit log of all price changes, master rate adjustments, and exceptions.
    """
    query = select(PriceChangeAudit)
    if project_id:
        query = query.where(PriceChangeAudit.project_id == project_id)
    if unit_id:
        query = query.where(PriceChangeAudit.unit_id == unit_id)

    total_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_stmt)).scalar() or 0

    # Auto seed initial audits if empty
    if total == 0 and offset == 0:
        seed_audits = [
            PriceChangeAudit(
                project_id=1,
                unit_number="12A",
                field_changed="BASE_RATE_REVISION",
                old_value="৳12,000",
                new_value="৳12,500",
                changed_by="Pricing Committee",
                reason="Annual construction material inflation adjustment.",
                effective_date=datetime.now(timezone.utc) - timedelta(days=30)
            ),
            PriceChangeAudit(
                project_id=1,
                unit_number="14B",
                field_changed="FACING_PREMIUM",
                old_value="৳400",
                new_value="৳600",
                changed_by="Sales Director",
                reason="Lake front direct view premium adjustment.",
                effective_date=datetime.now(timezone.utc) - timedelta(days=15)
            )
        ]
        for a in seed_audits:
            db.add(a)
        await db.commit()
        query = select(PriceChangeAudit)
        total = len(seed_audits)

    query = query.order_by(desc(PriceChangeAudit.id)).offset(offset).limit(limit)
    rows = (await db.execute(query)).scalars().all()

    items = [
        PriceChangeAuditResponse(
            id=r.id,
            price_list_id=r.price_list_id,
            project_id=r.project_id,
            unit_id=r.unit_id,
            unit_number=r.unit_number,
            field_changed=r.field_changed,
            old_value=r.old_value,
            new_value=r.new_value,
            changed_by=r.changed_by,
            reason=r.reason,
            effective_date=r.effective_date,
            created_at=r.created_at
        )
        for r in rows
    ]

    return PriceAuditPagedResponse(items=items, total=total, limit=limit, offset=offset)


# -------------------------------------------------------------
# 4. Illustrative Apartment Price Calculator
# -------------------------------------------------------------
@router.post("/calculate", response_model=PricingCalculationResponse)
async def calculate_apartment_price(payload: PricingCalculationRequest):
    """
    Real-time illustrative apartment price calculator implementing the formula:
    Base Apartment Price = Chargeable Area * Price per sq ft
    Discount Amount = Base Apartment Price * (Discount % / 100)
    Total Price = (Base Apartment Price - Discount Amount) + Parking Price + Utility Fee
    """
    area = float(payload.chargeable_area_sqft)
    rate = float(payload.price_per_sqft)
    base_price = round(area * rate, 2)
    discount_pct = float(payload.discount_pct)
    discount_amt = round(base_price * (discount_pct / 100.0), 2)
    net_apt = round(base_price - discount_amt, 2)
    parking = float(payload.parking_price)
    utility = float(payload.utility_fee)
    total_price = round(net_apt + parking + utility, 2)

    return PricingCalculationResponse(
        chargeable_area_sqft=area,
        price_per_sqft=rate,
        base_apartment_price=base_price,
        parking_price=parking,
        discount_pct=discount_pct,
        discount_amount=discount_amt,
        net_apartment_price=net_apt,
        utility_fee=utility,
        illustrative_total_price=total_price
    )


# -------------------------------------------------------------
# 5. Formal Quotation Generation
# -------------------------------------------------------------
@router.get("/quotations", response_model=QuotationPagedResponse)
async def list_quotations(
    project_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Paged listing of official quotations generated from approved price lists.
    """
    query = select(Quotation)
    if project_id:
        query = query.where(Quotation.project_id == project_id)
    if search:
        search_filter = or_(
            Quotation.quotation_number.ilike(f"%{search}%"),
            Quotation.customer_name.ilike(f"%{search}%"),
            Quotation.customer_phone.ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    total_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_stmt)).scalar() or 0

    # Auto seed initial quotation if empty
    if total == 0 and offset == 0:
        seed_q = Quotation(
            quotation_number="QT-2026-0001",
            project_id=1,
            unit_code="12A",
            customer_name="Dr. Kamal Hossain",
            customer_phone="+880 1711-234567",
            customer_email="kamal.hossain@gmail.com",
            chargeable_area_sqft=1500.00,
            rate_per_sqft=8500.00,
            base_apartment_price=12750000.00,
            parking_charge=800000.00,
            discount_pct=0.00,
            discount_amount=0.00,
            net_total_price=13550000.00,
            valid_until=datetime.now(timezone.utc) + timedelta(days=15),
            status="ISSUED",
            prepared_by="Senior Sales Officer",
            notes="Valid for 15 days under Price List PL-GL-2026-V1"
        )
        db.add(seed_q)
        await db.commit()
        query = select(Quotation)
        total = 1

    query = query.order_by(desc(Quotation.id)).offset(offset).limit(limit)
    rows = (await db.execute(query)).scalars().all()

    items = [
        QuotationResponse(
            id=r.id,
            quotation_number=r.quotation_number,
            project_id=r.project_id,
            price_list_id=r.price_list_id,
            unit_id=r.unit_id,
            unit_code=r.unit_code,
            customer_name=r.customer_name,
            customer_phone=r.customer_phone,
            customer_email=r.customer_email,
            chargeable_area_sqft=float(r.chargeable_area_sqft or 0),
            rate_per_sqft=float(r.rate_per_sqft or 0),
            base_apartment_price=float(r.base_apartment_price or 0),
            parking_charge=float(r.parking_charge or 0),
            discount_pct=float(r.discount_pct or 0),
            discount_amount=float(r.discount_amount or 0),
            net_total_price=float(r.net_total_price or 0),
            valid_until=r.valid_until,
            status=r.status,
            prepared_by=r.prepared_by,
            notes=r.notes,
            created_at=r.created_at
        )
        for r in rows
    ]

    return QuotationPagedResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/quotations", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    payload: QuotationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate and save a formal price quotation using the approved price version.
    """
    # Generate sequential quotation number
    q_count = (await db.execute(select(func.count(Quotation.id)))).scalar() or 0
    q_num = f"QT-2026-{q_count + 1:04d}"

    valid_dt = datetime.now(timezone.utc) + timedelta(days=payload.validity_days)

    new_q = Quotation(
        quotation_number=q_num,
        project_id=payload.project_id,
        price_list_id=payload.price_list_id,
        unit_id=payload.unit_id,
        unit_code=payload.unit_code,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        chargeable_area_sqft=payload.chargeable_area_sqft,
        rate_per_sqft=payload.rate_per_sqft,
        base_apartment_price=payload.base_apartment_price,
        parking_charge=payload.parking_charge,
        discount_pct=payload.discount_pct,
        discount_amount=payload.discount_amount,
        net_total_price=payload.net_total_price,
        valid_until=valid_dt,
        status="ISSUED",
        prepared_by=payload.prepared_by,
        notes=payload.notes
    )
    db.add(new_q)
    await db.commit()
    await db.refresh(new_q)

    return QuotationResponse(
        id=new_q.id,
        quotation_number=new_q.quotation_number,
        project_id=new_q.project_id,
        price_list_id=new_q.price_list_id,
        unit_id=new_q.unit_id,
        unit_code=new_q.unit_code,
        customer_name=new_q.customer_name,
        customer_phone=new_q.customer_phone,
        customer_email=new_q.customer_email,
        chargeable_area_sqft=float(new_q.chargeable_area_sqft),
        rate_per_sqft=float(new_q.rate_per_sqft),
        base_apartment_price=float(new_q.base_apartment_price),
        parking_charge=float(new_q.parking_charge),
        discount_pct=float(new_q.discount_pct),
        discount_amount=float(new_q.discount_amount),
        net_total_price=float(new_q.net_total_price),
        valid_until=new_q.valid_until,
        status=new_q.status,
        prepared_by=new_q.prepared_by,
        notes=new_q.notes,
        created_at=new_q.created_at
    )
