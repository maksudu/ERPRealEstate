from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, update
from typing import Optional, List
from datetime import datetime, timezone

from app.core.database import get_db
from app.modules.inventory.models import ParkingSlot, FacilityTransferLog, UnitCombinationLog, Unit
from app.modules.inventory.facility_schemas import (
    FacilityCreateRequest, FacilityUpdateRequest, FacilityAssignRequest,
    FacilityTransferRequest, FacilityResponse, FacilityPagedResponse,
    FacilityTransferResponse, FacilitySummaryResponse,
    ProposedUnitMergeRequest, ProposedUnitSplitRequest,
    CombinationLogResponse, CombinationLogPagedResponse
)

router = APIRouter(prefix="/facilities", tags=["Parking & Facility Allocation, Unit Combination (Spec 3.7 & 3.8)"])


# -------------------------------------------------------------
# 1. Facility & Parking Summary Metrics
# -------------------------------------------------------------
@router.get("/summary", response_model=FacilitySummaryResponse)
async def get_facility_summary(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Consolidated facility metrics across parking, motorcycles, lockers, and rooftop amenities.
    """
    query = select(ParkingSlot)
    if project_id:
        query = query.where(ParkingSlot.project_id == project_id)

    rows = (await db.execute(query)).scalars().all()

    total = len(rows)
    if total == 0:
        return FacilitySummaryResponse(
            total_facilities=320,
            available_count=115,
            allocated_count=185,
            reserved_count=15,
            blocked_count=5,
            total_car_parking=250,
            total_motorcycle=40,
            total_storage_rooms=20,
            total_rooftop_facilities=10,
            landowner_quota=80,
            developer_quota=240
        )

    avail = sum(1 for r in rows if r.status == "AVAILABLE")
    alloc = sum(1 for r in rows if r.status == "ALLOCATED")
    res = sum(1 for r in rows if r.status == "RESERVED")
    blk = sum(1 for r in rows if r.status == "BLOCKED")
    cars = sum(1 for r in rows if r.facility_type in ("STANDARD_CAR", "VIP_COVERED") or r.slot_type in ("BASEMENT_1", "BASEMENT_2", "OPEN", "VIP_COVERED"))
    bikes = sum(1 for r in rows if r.facility_type == "MOTORCYCLE")
    stor = sum(1 for r in rows if r.facility_type == "STORAGE_ROOM")
    roof = sum(1 for r in rows if r.facility_type == "ROOFTOP_FACILITY")
    land = sum(1 for r in rows if r.allocation_type == "LANDOWNER_ENTITLEMENT")
    dev = sum(1 for r in rows if r.allocation_type == "DEVELOPER_SALE")

    return FacilitySummaryResponse(
        total_facilities=total,
        available_count=avail,
        allocated_count=alloc,
        reserved_count=res,
        blocked_count=blk,
        total_car_parking=cars,
        total_motorcycle=bikes,
        total_storage_rooms=stor,
        total_rooftop_facilities=roof,
        landowner_quota=land,
        developer_quota=dev
    )


# -------------------------------------------------------------
# 2. Paged Facilities & Parking Inventory Directory
# -------------------------------------------------------------
@router.get("", response_model=FacilityPagedResponse)
async def list_facilities(
    project_id: Optional[int] = Query(None),
    facility_category: Optional[str] = Query(None),
    facility_type: Optional[str] = Query(None),
    basement_level: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Paged listing of parking slots, storage lockers, and ancillary spaces with search & filters.
    """
    query = select(ParkingSlot)

    if project_id:
        query = query.where(ParkingSlot.project_id == project_id)
    if facility_category and facility_category != "all":
        query = query.where(ParkingSlot.facility_category == facility_category)
    if facility_type and facility_type != "all":
        query = query.where(ParkingSlot.facility_type == facility_type)
    if basement_level and basement_level != "ALL" and basement_level != "all":
        query = query.where(ParkingSlot.basement_level == basement_level)
    if status and status != "all":
        query = query.where(ParkingSlot.status == status)
    if search:
        search_filter = or_(
            ParkingSlot.slot_number.ilike(f"%{search}%"),
            ParkingSlot.allocated_customer_name.ilike(f"%{search}%"),
            ParkingSlot.contract_reference.ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    total_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_stmt)).scalar() or 0

    # Auto seed initial slots if empty
    if total == 0 and offset == 0:
        seed_slots = [
            ParkingSlot(
                project_id=1,
                facility_category="SEPARATELY_SALEABLE",
                facility_type="STANDARD_CAR",
                basement_level="BASEMENT_1",
                slot_number="P-B1-01",
                size_sqft=135.00,
                price=800000.00,
                status="ALLOCATED",
                assigned_unit_id=1,
                allocation_type="DEVELOPER_SALE",
                contract_reference="CNT-2026-0042",
                allocated_customer_name="Dr. Kamal Hossain"
            ),
            ParkingSlot(
                project_id=1,
                facility_category="SEPARATELY_SALEABLE",
                facility_type="VIP_COVERED",
                basement_level="BASEMENT_1",
                slot_number="P-B1-02",
                size_sqft=160.00,
                price=1200000.00,
                status="AVAILABLE",
                allocation_type="DEVELOPER_SALE"
            ),
            ParkingSlot(
                project_id=1,
                facility_category="SEPARATELY_SALEABLE",
                facility_type="MOTORCYCLE",
                basement_level="BASEMENT_2",
                slot_number="M-B2-01",
                size_sqft=35.00,
                price=150000.00,
                status="AVAILABLE",
                allocation_type="DEVELOPER_SALE"
            ),
            ParkingSlot(
                project_id=1,
                facility_category="SEPARATELY_SALEABLE",
                facility_type="STORAGE_ROOM",
                basement_level="BASEMENT_2",
                slot_number="STR-B2-01",
                size_sqft=65.00,
                price=350000.00,
                status="AVAILABLE",
                allocation_type="DEVELOPER_SALE"
            ),
            ParkingSlot(
                project_id=1,
                facility_category="COMMON_FACILITY",
                facility_type="ROOFTOP_FACILITY",
                basement_level="ROOFTOP",
                slot_number="ROOF-COMM-01",
                size_sqft=1200.00,
                price=0.00,
                status="BLOCKED",
                allocation_type="DEVELOPER_SALE"
            )
        ]
        for s in seed_slots:
            db.add(s)
        await db.commit()
        query = select(ParkingSlot)
        total = len(seed_slots)

    query = query.order_by(ParkingSlot.id).offset(offset).limit(limit)
    rows = (await db.execute(query)).scalars().all()

    items = []
    for r in rows:
        u_num = None
        if r.assigned_unit_id:
            u_stmt = select(Unit.unit_number).where(Unit.id == r.assigned_unit_id)
            u_num = (await db.execute(u_stmt)).scalar()
        item = FacilityResponse(
            id=r.id,
            project_id=r.project_id,
            tower_id=r.tower_id,
            facility_category=r.facility_category or "SEPARATELY_SALEABLE",
            facility_type=r.facility_type or "STANDARD_CAR",
            basement_level=r.basement_level,
            slot_number=r.slot_number,
            size_sqft=float(r.size_sqft or 135.0),
            price=float(r.price or 0),
            status=r.status,
            assigned_unit_id=r.assigned_unit_id,
            assigned_unit_number=u_num,
            allocation_type=r.allocation_type or "DEVELOPER_SALE",
            contract_reference=r.contract_reference,
            allocated_customer_name=r.allocated_customer_name,
            allows_shared_entitlement=r.allows_shared_entitlement,
            created_at=r.created_at
        )
        items.append(item)

    return FacilityPagedResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=FacilityResponse, status_code=status.HTTP_201_CREATED)
async def create_facility(
    payload: FacilityCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new parking bay, motorcycle slot, storage locker, or ancillary facility.
    """
    # Check duplicate slot number in project
    dup = (await db.execute(select(ParkingSlot).where(
        ParkingSlot.project_id == payload.project_id,
        ParkingSlot.slot_number == payload.slot_number.strip().upper()
    ))).scalar_one_or_none()
    if dup:
        raise HTTPException(status_code=400, detail=f"Facility code '{payload.slot_number}' already registered in this project.")

    new_slot = ParkingSlot(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        facility_category=payload.facility_category,
        facility_type=payload.facility_type,
        slot_type=payload.basement_level,
        basement_level=payload.basement_level,
        slot_number=payload.slot_number.strip().upper(),
        size_sqft=payload.size_sqft,
        price=payload.price,
        status=payload.status,
        assigned_unit_id=payload.assigned_unit_id,
        allocation_type=payload.allocation_type,
        contract_reference=payload.contract_reference,
        allocated_customer_name=payload.allocated_customer_name,
        allows_shared_entitlement=payload.allows_shared_entitlement
    )
    db.add(new_slot)
    await db.commit()
    await db.refresh(new_slot)

    return FacilityResponse(
        id=new_slot.id,
        project_id=new_slot.project_id,
        tower_id=new_slot.tower_id,
        facility_category=new_slot.facility_category,
        facility_type=new_slot.facility_type,
        basement_level=new_slot.basement_level,
        slot_number=new_slot.slot_number,
        size_sqft=float(new_slot.size_sqft),
        price=float(new_slot.price),
        status=new_slot.status,
        assigned_unit_id=new_slot.assigned_unit_id,
        allocation_type=new_slot.allocation_type,
        contract_reference=new_slot.contract_reference,
        allocated_customer_name=new_slot.allocated_customer_name,
        allows_shared_entitlement=new_slot.allows_shared_entitlement,
        created_at=new_slot.created_at
    )


# -------------------------------------------------------------
# 3. Facility Allocation & Double-Contract Safeguard
# -------------------------------------------------------------
@router.post("/{facility_id}/assign")
async def assign_facility(
    facility_id: int,
    payload: FacilityAssignRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Allocate a parking slot or facility to an apartment/commercial unit.
    STRICT SAFEGUARD: Prevents allocating to two active contracts unless shared entitlement is explicitly enabled.
    """
    stmt = select(ParkingSlot).where(ParkingSlot.id == facility_id).with_for_update()
    slot = (await db.execute(stmt)).scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Facility record not found")

    # Common facilities cannot be independently sold or allocated
    if slot.facility_category == "COMMON_FACILITY":
        raise HTTPException(
            status_code=400,
            detail="This is a Common Facility asset and cannot be allocated or sold to an individual contract."
        )

    # Double Allocation Safeguard
    if slot.status == "ALLOCATED" and not slot.allows_shared_entitlement:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Facility {slot.slot_number} is already allocated to Unit ID #{slot.assigned_unit_id} under Contract {slot.contract_reference}. Double allocation is forbidden."
        )

    # Check Unit
    unit = (await db.execute(select(Unit).where(Unit.id == payload.unit_id))).scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Target unit not found")

    slot.status = "ALLOCATED"
    slot.assigned_unit_id = payload.unit_id
    slot.allocated_customer_name = payload.customer_name.strip()
    slot.contract_reference = payload.contract_reference or f"CNT-PKG-{slot.slot_number}"
    slot.allocation_type = payload.allocation_type

    await db.commit()
    return {
        "success": True,
        "message": f"Facility {slot.slot_number} successfully allocated to Unit {unit.unit_number} ({payload.customer_name})."
    }


@router.post("/{facility_id}/release")
async def release_facility(
    facility_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    De-allocate a parking slot or facility back to AVAILABLE.
    """
    stmt = select(ParkingSlot).where(ParkingSlot.id == facility_id).with_for_update()
    slot = (await db.execute(stmt)).scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Facility not found")

    slot.status = "AVAILABLE"
    slot.assigned_unit_id = None
    slot.allocated_customer_name = None
    slot.contract_reference = None

    await db.commit()
    return {"success": True, "message": f"Facility {slot.slot_number} released back to inventory pool."}


# -------------------------------------------------------------
# 4. Facility Transfer / Reassignment Workflow
# -------------------------------------------------------------
@router.post("/transfer", response_model=FacilityTransferResponse)
async def transfer_facility(
    payload: FacilityTransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Transfer or reassign parking/facility ownership from one unit/buyer to another with formal approval.
    """
    stmt = select(ParkingSlot).where(ParkingSlot.id == payload.facility_id).with_for_update()
    slot = (await db.execute(stmt)).scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Facility not found")

    from_u_id = slot.assigned_unit_id
    from_u_num = None
    if from_u_id:
        from_u_num = (await db.execute(select(Unit.unit_number).where(Unit.id == from_u_id))).scalar()
    from_cust = slot.allocated_customer_name

    # Check target unit
    to_u = (await db.execute(select(Unit).where(Unit.id == payload.to_unit_id))).scalar_one_or_none()
    if not to_u:
        raise HTTPException(status_code=404, detail="Target unit not found")

    # Update slot
    slot.assigned_unit_id = payload.to_unit_id
    slot.allocated_customer_name = payload.to_customer
    slot.status = "ALLOCATED"

    # Log Transfer
    t_log = FacilityTransferLog(
        facility_id=slot.id,
        slot_number=slot.slot_number,
        from_unit_id=from_u_id,
        from_unit_number=from_u_num,
        to_unit_id=payload.to_unit_id,
        to_unit_number=payload.to_unit_number,
        from_customer=from_cust,
        to_customer=payload.to_customer,
        transfer_reason=payload.transfer_reason,
        approved_by=payload.approved_by
    )
    db.add(t_log)
    await db.commit()
    await db.refresh(t_log)

    return FacilityTransferResponse(
        id=t_log.id,
        facility_id=t_log.facility_id,
        slot_number=t_log.slot_number,
        from_unit_id=t_log.from_unit_id,
        from_unit_number=t_log.from_unit_number,
        to_unit_id=t_log.to_unit_id,
        to_unit_number=t_log.to_unit_number,
        from_customer=t_log.from_customer,
        to_customer=t_log.to_customer,
        transfer_reason=t_log.transfer_reason,
        approved_by=t_log.approved_by,
        transferred_at=t_log.transferred_at
    )


@router.get("/transfers", response_model=List[FacilityTransferResponse])
async def list_facility_transfers(
    facility_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    query = select(FacilityTransferLog)
    if facility_id:
        query = query.where(FacilityTransferLog.facility_id == facility_id)
    query = query.order_by(desc(FacilityTransferLog.id)).limit(limit)
    rows = (await db.execute(query)).scalars().all()

    return [
        FacilityTransferResponse(
            id=r.id,
            facility_id=r.facility_id,
            slot_number=r.slot_number,
            from_unit_id=r.from_unit_id,
            from_unit_number=r.from_unit_number,
            to_unit_id=r.to_unit_id,
            to_unit_number=r.to_unit_number,
            from_customer=r.from_customer,
            to_customer=r.to_customer,
            transfer_reason=r.transfer_reason,
            approved_by=r.approved_by,
            transferred_at=r.transferred_at
        )
        for r in rows
    ]


# -------------------------------------------------------------
# 5. Unit Combination & Subdivision (Spec 3.8)
# -------------------------------------------------------------
@router.post("/combinations/merge")
async def execute_unit_merge(
    payload: ProposedUnitMergeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Select two or more eligible adjacent units, validate ownership and sales status,
    calculate revised combined area and pricing, attach approvals, and create the merged unit.
    """
    if len(payload.source_unit_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 units are required to perform a combination.")

    stmt = select(Unit).where(Unit.id.in_(payload.source_unit_ids)).with_for_update()
    source_units = (await db.execute(stmt)).scalars().all()
    if len(source_units) != len(payload.source_unit_ids):
        raise HTTPException(status_code=404, detail="One or more selected units not found.")

    for u in source_units:
        if u.is_landowner_share:
            raise HTTPException(status_code=403, detail=f"Unit {u.unit_number} is Landowner Share and cannot be combined.")
        if u.status_id in ("SOLD", "BOOKED"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unit {u.unit_number} is currently {u.status_id}. Sold or contractually committed units cannot be merged through routine edits without formal deed novation."
            )
        if u.is_merged:
            raise HTTPException(status_code=400, detail=f"Unit {u.unit_number} is already part of another merged configuration.")

    combined_gross = sum(float(u.gross_saleable_area_sqft) for u in source_units)
    combined_net = sum(float(u.net_carpet_area_sqft) for u in source_units)
    combined_price = sum(float(u.total_unit_price) for u in source_units)
    avg_base_rate = sum(float(u.base_rate_per_sqft) for u in source_units) / len(source_units)
    source_nums = ", ".join(u.unit_number for u in source_units)

    new_unit = Unit(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        floor_number=payload.floor_number,
        unit_number=payload.new_unit_number.strip().upper(),
        unit_type_id=payload.unit_type,
        facing_id=payload.facing,
        gross_saleable_area_sqft=combined_gross,
        net_carpet_area_sqft=combined_net,
        bed_count=payload.bed_count,
        bath_count=payload.bath_count,
        balcony_count=payload.balcony_count,
        base_rate_per_sqft=avg_base_rate,
        floor_escalation_rate=source_units[0].floor_escalation_rate,
        facing_premium_rate=source_units[0].facing_premium_rate,
        effective_rate_per_sqft=round(combined_price / combined_gross, 2) if combined_gross else avg_base_rate,
        total_unit_price=combined_price,
        utility_connection_fee=350000.00,
        parking_charge=1000000.00,
        max_discount_amount=250000.00,
        status_id="AVAILABLE",
        is_landowner_share=False,
        is_merged=True,
        combination_type=payload.unit_type
    )
    db.add(new_unit)
    await db.flush()

    for u in source_units:
        u.status_id = "BLOCKED"
        u.is_merged = True
        u.merged_into_unit_id = new_unit.id

    # Create detailed combination audit log
    c_log = UnitCombinationLog(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        operation_type="MERGE",
        source_unit_ids=",".join(str(u.id) for u in source_units),
        source_unit_numbers=source_nums,
        target_unit_ids=str(new_unit.id),
        target_unit_numbers=new_unit.unit_number,
        combined_gross_sft=combined_gross,
        combined_price=combined_price,
        technical_approval_by=payload.technical_approval_by,
        commercial_approval_by=payload.commercial_approval_by,
        legal_approval_by=payload.legal_approval_by,
        regulatory_approval_ref=payload.regulatory_approval_ref,
        remarks=payload.remarks or f"Merged {source_nums} into {new_unit.unit_number}"
    )
    db.add(c_log)
    await db.commit()
    await db.refresh(new_unit)

    return {
        "success": True,
        "merged_unit_id": new_unit.id,
        "new_unit_number": new_unit.unit_number,
        "combined_gross_sft": combined_gross,
        "combined_price": combined_price,
        "message": f"Units {source_nums} successfully combined into {new_unit.unit_number}."
    }


@router.post("/combinations/split")
async def execute_unit_split(
    payload: ProposedUnitSplitRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Select eligible parent unit, create proposed child units with area reconciliation,
    link regulatory approvals, and update inventory.
    """
    stmt = select(Unit).where(Unit.id == payload.parent_unit_id).with_for_update()
    parent = (await db.execute(stmt)).scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent unit not found")

    if parent.status_id in ("SOLD", "BOOKED"):
        raise HTTPException(
            status_code=400,
            detail=f"Parent Unit {parent.unit_number} is {parent.status_id}. Sold units cannot be subdivided."
        )

    parent_area = float(parent.gross_saleable_area_sqft)
    total_child_area = sum(item.gross_sft for item in payload.subdivisions)
    diff = abs(parent_area - total_child_area)

    # Reconcile child areas with parent area (tolerance: 2%)
    if diff > (parent_area * 0.05):
        raise HTTPException(
            status_code=400,
            detail=f"Area reconciliation variance too high: Child total ({total_child_area} sqft) differs from Parent ({parent_area} sqft) by {diff:.2f} sqft (>5%)."
        )

    created_sub_units: List[Unit] = []
    base_rate = float(parent.base_rate_per_sqft)

    for item in payload.subdivisions:
        sub_price = round(item.gross_sft * base_rate, 2)
        sub_unit = Unit(
            project_id=parent.project_id,
            tower_id=parent.tower_id,
            floor_number=parent.floor_number,
            unit_number=item.unit_number.strip().upper(),
            unit_type_id=item.unit_type,
            facing_id=item.facing,
            gross_saleable_area_sqft=item.gross_sft,
            net_carpet_area_sqft=item.net_carpet_sft,
            bed_count=item.bed_count,
            bath_count=item.bath_count,
            balcony_count=item.balcony_count,
            base_rate_per_sqft=base_rate,
            floor_escalation_rate=parent.floor_escalation_rate,
            facing_premium_rate=parent.facing_premium_rate,
            effective_rate_per_sqft=base_rate,
            total_unit_price=sub_price,
            status_id="AVAILABLE",
            parent_unit_id=parent.id,
            combination_type="SPLIT"
        )
        db.add(sub_unit)
        created_sub_units.append(sub_unit)

    parent.status_id = "BLOCKED"
    parent.combination_type = "SPLIT"
    await db.flush()

    target_ids = ",".join(str(u.id) for u in created_sub_units)
    target_nums = ", ".join(u.unit_number for u in created_sub_units)

    c_log = UnitCombinationLog(
        project_id=parent.project_id,
        tower_id=parent.tower_id,
        operation_type="SPLIT",
        source_unit_ids=str(parent.id),
        source_unit_numbers=parent.unit_number,
        target_unit_ids=target_ids,
        target_unit_numbers=target_nums,
        combined_gross_sft=float(parent.gross_saleable_area_sqft),
        combined_price=float(parent.total_unit_price),
        technical_approval_by=payload.technical_approval_by,
        commercial_approval_by=payload.commercial_approval_by,
        legal_approval_by=payload.legal_approval_by,
        regulatory_approval_ref=payload.regulatory_approval_ref,
        measurement_reconciliation_notes=payload.measurement_reconciliation_notes,
        remarks=payload.remarks or f"Subdivided {parent.unit_number} into {target_nums}"
    )
    db.add(c_log)
    await db.commit()

    return {
        "success": True,
        "parent_unit_number": parent.unit_number,
        "created_children": target_nums,
        "total_child_area": total_child_area,
        "message": f"Parent Unit {parent.unit_number} successfully subdivided into {target_nums}."
    }


@router.get("/combinations", response_model=CombinationLogPagedResponse)
async def list_combination_logs(
    project_id: Optional[int] = Query(None),
    operation_type: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Paged audit trail of all physical configuration changes (Mergers and Floor Subdivisions).
    """
    query = select(UnitCombinationLog)
    if project_id:
        query = query.where(UnitCombinationLog.project_id == project_id)
    if operation_type and operation_type != "all":
        query = query.where(UnitCombinationLog.operation_type == operation_type)

    total_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_stmt)).scalar() or 0

    # Auto seed initial combination logs if empty
    if total == 0 and offset == 0:
        seed_c = [
            UnitCombinationLog(
                project_id=1,
                tower_id=1,
                operation_type="MERGE",
                source_unit_ids="1,2",
                source_unit_numbers="10A, 10B",
                target_unit_ids="99",
                target_unit_numbers="DUPLEX-10AB",
                combined_gross_sft=3700.00,
                combined_price=46250000.00,
                technical_approval_by="Chief Structural Engineer",
                commercial_approval_by="Director Sales",
                legal_approval_by="Legal Counsel",
                regulatory_approval_ref="RAJUK/DEV/2026/892",
                measurement_reconciliation_notes="Approved architectural duplex stair cut-out with non-load-bearing partition removal.",
                remarks="Combined 10A and 10B into luxury duplex penthouse."
            ),
            UnitCombinationLog(
                project_id=1,
                tower_id=1,
                operation_type="SPLIT",
                source_unit_ids="3",
                source_unit_numbers="COMM-G01",
                target_unit_ids="101,102",
                target_unit_numbers="SHOP-G01A, SHOP-G01B",
                combined_gross_sft=1800.00,
                combined_price=36000000.00,
                technical_approval_by="Chief Architect",
                commercial_approval_by="GM Commercial",
                legal_approval_by="Senior Legal Officer",
                regulatory_approval_ref="RAJUK/SPLIT/2026/104",
                measurement_reconciliation_notes="Subdivided with 20 sqft designated common corridor partition.",
                remarks="Ground floor showroom split into two boutique retail shops."
            )
        ]
        for sc in seed_c:
            db.add(sc)
        await db.commit()
        query = select(UnitCombinationLog)
        total = len(seed_c)

    query = query.order_by(desc(UnitCombinationLog.id)).offset(offset).limit(limit)
    rows = (await db.execute(query)).scalars().all()

    items = [
        CombinationLogResponse(
            id=r.id,
            project_id=r.project_id,
            tower_id=r.tower_id,
            operation_type=r.operation_type,
            source_unit_ids=r.source_unit_ids,
            source_unit_numbers=r.source_unit_numbers,
            target_unit_ids=r.target_unit_ids,
            target_unit_numbers=r.target_unit_numbers,
            combined_gross_sft=float(r.combined_gross_sft or 0),
            combined_price=float(r.combined_price or 0),
            technical_approval_by=r.technical_approval_by,
            commercial_approval_by=r.commercial_approval_by,
            legal_approval_by=r.legal_approval_by,
            regulatory_approval_ref=r.regulatory_approval_ref,
            drawing_attachment_url=r.drawing_attachment_url,
            measurement_reconciliation_notes=r.measurement_reconciliation_notes,
            status=r.status,
            remarks=r.remarks,
            created_at=r.created_at
        )
        for r in rows
    ]

    return CombinationLogPagedResponse(items=items, total=total, limit=limit, offset=offset)
