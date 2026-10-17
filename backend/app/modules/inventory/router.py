from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import json

from app.core.database import get_db
from app.core.redis import get_redis_client
from app.modules.inventory.models import Unit, ParkingBay, ParkingSlot, UnitCombinationLog
from app.modules.inventory.schemas import (
    UnitCreate, UnitResponse, UnitLockRequest, UnitLockResponse,
    ParkingBayCreate, ParkingBayResponse,
    TowerStackingResponse, PriceBreakdownResponse,
    UnitMergeRequest, UnitSplitRequest,
    ParkingSlotCreate, ParkingSlotResponse, ParkingSlotAssignRequest,
    calculate_unit_pricing
)
from app.modules.inventory.services import (
    get_tower_stacking_plan, get_unit_price_breakdown,
    merge_units as service_merge_units, split_unit as service_split_unit
)
from app.modules.inventory.ws_manager import manager

router = APIRouter(prefix="/inventory", tags=["Property Inventory & 2D Stacking Plan"])

LOCK_TTL_SECONDS = 900  # 15 Minutes Distributed Mutex

# -------------------------------------------------------------
# WebSocket Real-Time Matrix Endpoint
# -------------------------------------------------------------
@router.websocket("/live-matrix")
async def websocket_live_matrix(websocket: WebSocket):
    """
    Real-time WebSocket feed broadcasting unit lock, countdowns, and booking updates
    to all active Angular and Mobile clients simultaneously.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep socket alive and receive client pings if needed
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# -------------------------------------------------------------
# 1. Units Inventory CRUD & Matrix List
# -------------------------------------------------------------
@router.get("/units", response_model=List[UnitResponse])
async def list_units(
    project_id: Optional[int] = Query(None),
    tower_id: Optional[int] = Query(None),
    status_id: Optional[str] = Query(None),
    facing_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Unit).order_by(Unit.floor_number.desc(), Unit.unit_number.asc())
    if project_id:
        stmt = stmt.where(Unit.project_id == project_id)
    if tower_id:
        stmt = stmt.where(Unit.tower_id == tower_id)
    if status_id:
        stmt = stmt.where(Unit.status_id == status_id)
    if facing_id:
        stmt = stmt.where(Unit.facing_id == facing_id)

    res = await db.execute(stmt)
    units = res.scalars().all()

    # Calculate remaining lock seconds dynamically
    now = datetime.now(timezone.utc)
    results = []
    for u in units:
        rem_sec = 0
        if u.status_id == "ON_HOLD" and u.lock_expires_at:
            exp = u.lock_expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            delta = (exp - now).total_seconds()
            rem_sec = max(0, int(delta))
            # Auto-expire if time is up
            if rem_sec == 0:
                u.status_id = "AVAILABLE"
                u.current_locked_by_user_id = None
                u.current_locked_by_user_name = None
                u.lock_expires_at = None

        u_dict = UnitResponse.model_validate(u)
        u_dict.lock_remaining_seconds = rem_sec
        results.append(u_dict)

    return results


@router.post("/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
async def create_unit(
    payload: UnitCreate,
    db: AsyncSession = Depends(get_db)
):
    # Compute pricing using standard formula
    pricing = calculate_unit_pricing(
        gross_sqft=payload.gross_saleable_area_sqft,
        base_rate=payload.base_rate_per_sqft,
        floor_escalation=payload.floor_escalation_rate,
        facing_premium=payload.facing_premium_rate
    )

    unit = Unit(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        floor_number=payload.floor_number,
        unit_number=payload.unit_number.strip().upper(),
        unit_type_id=payload.unit_type_id,
        facing_id=payload.facing_id,
        net_carpet_area_sqft=payload.net_carpet_area_sqft,
        gross_saleable_area_sqft=payload.gross_saleable_area_sqft,
        base_rate_per_sqft=payload.base_rate_per_sqft,
        floor_escalation_rate=payload.floor_escalation_rate,
        facing_premium_rate=payload.facing_premium_rate,
        effective_rate_per_sqft=pricing["effective_rate_per_sqft"],
        total_unit_price=pricing["total_unit_price"],
        status_id="LANDOWNER_SHARE" if payload.is_landowner_share else (payload.status_id or "AVAILABLE"),
        is_landowner_share=payload.is_landowner_share
    )
    db.add(unit)
    await db.commit()
    await db.refresh(unit)
    return unit


# -------------------------------------------------------------
# 2. 15-Minute Distributed Mutex Locking (Redis nx=True, ex=900)
# -------------------------------------------------------------
@router.post("/units/{unit_id}/lock", response_model=UnitLockResponse)
async def lock_unit(
    unit_id: int,
    payload: UnitLockRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    CRITICAL DISTRIBUTED MUTEX LOCKING:
    - Sets Redis key 'unit:lock:{id}' with 15-minute TTL (ex=900, nx=True).
    - If already locked, returns 409 Conflict with remaining TTL.
    - Publishes event 'UNIT_LOCKED' and broadcasts via WebSockets in real time.
    """
    stmt = select(Unit).where(Unit.id == unit_id)
    res = await db.execute(stmt)
    unit = res.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Strict check: Landowner units are permanently locked from sales!
    if unit.is_landowner_share or unit.status_id == "LANDOWNER_SHARE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unit {unit.unit_number} is a registered Landowner Unit. Strictly locked from sales."
        )

    if unit.status_id in ["BOOKED", "SOLD"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unit {unit.unit_number} is already {unit.status_id} and cannot be locked."
        )

    lock_key = f"unit:lock:{unit_id}"
    lock_val = json.dumps({
        "user_id": payload.user_id,
        "user_name": payload.user_name,
        "locked_at": datetime.now(timezone.utc).isoformat()
    })

    redis_acquired = False
    remaining_ttl = LOCK_TTL_SECONDS
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=LOCK_TTL_SECONDS)

    try:
        redis_client = get_redis_client()
        # Atomic Redis Mutex with nx=True and ex=900
        acquired = await redis_client.set(lock_key, lock_val, ex=LOCK_TTL_SECONDS, nx=True)
        if not acquired:
            # Already locked in Redis! Fetch remaining TTL
            ttl = await redis_client.ttl(lock_key)
            existing_data = await redis_client.get(lock_key)
            existing_user = "Another Sales Agent"
            if existing_data:
                try:
                    existing_user = json.loads(existing_data).get("user_name", existing_user)
                except Exception:
                    pass
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Unit {unit.unit_number} is currently locked by {existing_user}. Remaining lock: {ttl} seconds."
            )
        redis_acquired = True
    except HTTPException:
        raise
    except Exception:
        # Fallback to DB-level lock if Redis is cold
        if unit.status_id == "ON_HOLD" and unit.lock_expires_at:
            exp = unit.lock_expires_at.replace(tzinfo=timezone.utc) if unit.lock_expires_at.tzinfo is None else unit.lock_expires_at
            if exp > now:
                rem = int((exp - now).total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Unit {unit.unit_number} is locked by {unit.current_locked_by_user_name}. Remaining lock: {rem} seconds."
                )

    # Update DB state
    unit.status_id = "ON_HOLD"
    unit.current_locked_by_user_id = payload.user_id
    unit.current_locked_by_user_name = payload.user_name
    unit.lock_expires_at = expires_at
    await db.commit()

    # Broadcast real-time event to all connected Angular/Flutter clients
    broadcast_msg = {
        "event": "UNIT_LOCKED",
        "unit_id": unit.id,
        "unit_number": unit.unit_number,
        "project_id": unit.project_id,
        "status_id": "ON_HOLD",
        "locked_by_user_id": payload.user_id,
        "locked_by_user_name": payload.user_name,
        "remaining_seconds": LOCK_TTL_SECONDS,
        "expires_at": expires_at.isoformat()
    }
    await manager.broadcast(broadcast_msg)

    # Also publish to Redis Pub/Sub if available
    try:
        redis_client = get_redis_client()
        await redis_client.publish("inventory:events", json.dumps(broadcast_msg))
    except Exception:
        pass

    return UnitLockResponse(
        success=True,
        unit_id=unit.id,
        unit_number=unit.unit_number,
        status="ON_HOLD",
        locked_by_user_id=payload.user_id or 1,
        locked_by_user_name=payload.user_name or "Sales Agent",
        lock_duration_seconds=LOCK_TTL_SECONDS,
        expires_at=expires_at,
        message=f"Unit {unit.unit_number} successfully locked for 15 minutes."
    )


@router.post("/units/{unit_id}/unlock", response_model=dict)
async def unlock_unit(unit_id: int, db: AsyncSession = Depends(get_db)):
    """
    Releases active 15-minute lock manually or on timeout.
    """
    stmt = select(Unit).where(Unit.id == unit_id)
    res = await db.execute(stmt)
    unit = res.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Release Redis Key
    try:
        redis_client = get_redis_client()
        await redis_client.delete(f"unit:lock:{unit_id}")
    except Exception:
        pass

    unit.status_id = "AVAILABLE"
    unit.current_locked_by_user_id = None
    unit.current_locked_by_user_name = None
    unit.lock_expires_at = None
    await db.commit()

    broadcast_msg = {
        "event": "UNIT_UNLOCKED",
        "unit_id": unit.id,
        "unit_number": unit.unit_number,
        "project_id": unit.project_id,
        "status_id": "AVAILABLE"
    }
    await manager.broadcast(broadcast_msg)

    return {"success": True, "message": f"Unit {unit.unit_number} unlocked and available."}


# -------------------------------------------------------------
# 3. Parking Bays Inventory
# -------------------------------------------------------------
@router.get("/parking-bays", response_model=List[ParkingBayResponse])
async def list_parking_bays(
    project_id: Optional[int] = Query(None),
    is_allocated: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ParkingBay).order_by(ParkingBay.bay_number.asc())
    if project_id:
        stmt = stmt.where(ParkingBay.project_id == project_id)
    if is_allocated is not None:
        stmt = stmt.where(ParkingBay.is_allocated == is_allocated)
    res = await db.execute(stmt)
    return res.scalars().all()


# -------------------------------------------------------------
# 4. 2D Visual Tower Stacking Plan & Unit Matrix
# -------------------------------------------------------------
@router.get("/stacking-plan", response_model=TowerStackingResponse)
async def get_stacking_plan_endpoint(
    project_id: int = Query(...),
    tower_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns full visual architectural cross-section of the tower elevation,
    with all floors stacked vertically from Penthouse to Basements,
    complete with 6-color unit status codes and 15-minute hold counters.
    """
    return await get_tower_stacking_plan(db, project_id=project_id, tower_id=tower_id)


@router.get("/units/{unit_id}/pricing-breakdown", response_model=PriceBreakdownResponse)
async def get_unit_pricing_sheet(
    unit_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamic Price Calculator:
    Itemizes Base Cost + Floor Rise Cost + Facing Premium + Car Parking + Utility Connection Fee - Max Allowable Discount.
    """
    return await get_unit_price_breakdown(db, unit_id=unit_id)


@router.post("/units/{unit_id}/reserve", response_model=UnitLockResponse)
async def instant_reserve_unit(
    unit_id: int,
    payload: UnitLockRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    15-Minute Instant Unit Reservation Mutex Lock.
    """
    return await lock_unit(unit_id=unit_id, payload=payload, db=db)


@router.post("/units/{unit_id}/release", response_model=dict)
async def release_reserve_unit(
    unit_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Releases active unit reservation hold manually.
    """
    return await unlock_unit(unit_id=unit_id, db=db)


# -------------------------------------------------------------
# 5. Unit Subdivision & Combination Engine
# -------------------------------------------------------------
@router.post("/units/merge", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
async def merge_units_endpoint(
    payload: UnitMergeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Combines two adjacent units on a floor (e.g., 10A + 10B -> Duplex).
    Calculates combined square footage, merges rate cards, and creates new unit.
    """
    return await service_merge_units(db, payload=payload)


@router.post("/units/{unit_id}/split", response_model=List[UnitResponse], status_code=status.HTTP_201_CREATED)
async def split_unit_endpoint(
    unit_id: int,
    payload: UnitSplitRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Subdivides a commercial floor or large flat into retail shop allotments.
    """
    return await service_split_unit(db, unit_id=unit_id, payload=payload)


@router.get("/combinations", response_model=List[dict])
async def list_combination_logs(
    project_id: Optional[int] = Query(None),
    tower_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Audit log history of all unit mergers & floor subdivisions.
    """
    stmt = select(UnitCombinationLog).order_by(desc(UnitCombinationLog.created_at))
    if project_id:
        stmt = stmt.where(UnitCombinationLog.project_id == project_id)
    if tower_id:
        stmt = stmt.where(UnitCombinationLog.tower_id == tower_id)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "project_id": l.project_id,
            "tower_id": l.tower_id,
            "operation_type": l.operation_type,
            "source_unit_numbers": l.source_unit_numbers,
            "target_unit_numbers": l.target_unit_numbers,
            "combined_gross_sft": float(l.combined_gross_sft),
            "combined_price": float(l.combined_price),
            "remarks": l.remarks,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]


# -------------------------------------------------------------
# 6. Basement Parking Slots Management
# -------------------------------------------------------------
@router.get("/parking-slots", response_model=List[ParkingSlotResponse])
async def list_parking_slots(
    project_id: Optional[int] = Query(None),
    tower_id: Optional[int] = Query(None),
    basement_level: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ParkingSlot).order_by(ParkingSlot.basement_level.asc(), ParkingSlot.slot_number.asc())
    if project_id:
        stmt = stmt.where(ParkingSlot.project_id == project_id)
    if tower_id:
        stmt = stmt.where(ParkingSlot.tower_id == tower_id)
    if basement_level:
        stmt = stmt.where(ParkingSlot.basement_level == basement_level)
    if status:
        stmt = stmt.where(ParkingSlot.status == status)
    res = await db.execute(stmt)
    slots = res.scalars().all()

    # Load unit numbers for assigned slots
    unit_ids = [s.assigned_unit_id for s in slots if s.assigned_unit_id]
    unit_map = {}
    if unit_ids:
        u_res = await db.execute(select(Unit.id, Unit.unit_number).where(Unit.id.in_(unit_ids)))
        unit_map = dict(u_res.fetchall())

    results = []
    for s in slots:
        r = ParkingSlotResponse.model_validate(s)
        r.assigned_unit_number = unit_map.get(s.assigned_unit_id)
        results.append(r)
    return results


@router.post("/parking-slots", response_model=ParkingSlotResponse, status_code=status.HTTP_201_CREATED)
async def create_parking_slot(
    payload: ParkingSlotCreate,
    db: AsyncSession = Depends(get_db)
):
    slot = ParkingSlot(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        basement_level=payload.basement_level,
        slot_number=payload.slot_number.strip().upper(),
        slot_type=payload.slot_type,
        price=payload.price,
        status="AVAILABLE"
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return slot


@router.post("/parking-slots/assign", response_model=dict)
async def assign_parking_slot_to_unit(
    payload: ParkingSlotAssignRequest,
    db: AsyncSession = Depends(get_db)
):
    # Fetch slot
    s_stmt = select(ParkingSlot).where(ParkingSlot.id == payload.slot_id)
    s_res = await db.execute(s_stmt)
    slot = s_res.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Parking slot not found.")

    # Fetch unit
    u_stmt = select(Unit).where(Unit.id == payload.unit_id)
    u_res = await db.execute(u_stmt)
    unit = u_res.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Target unit not found.")

    slot.assigned_unit_id = unit.id
    slot.status = "ALLOCATED"
    unit.parking_charge = (unit.parking_charge or 0.0) + float(slot.price)

    await db.commit()
    return {
        "success": True,
        "message": f"Parking Slot {slot.slot_number} successfully allocated to Unit {unit.unit_number}."
    }

