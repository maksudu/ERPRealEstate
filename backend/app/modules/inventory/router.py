from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import json

from app.core.database import get_db
from app.core.redis import get_redis_client
from app.modules.inventory.models import Unit, ParkingBay
from app.modules.inventory.schemas import (
    UnitCreate, UnitResponse, UnitLockRequest, UnitLockResponse,
    ParkingBayCreate, ParkingBayResponse,
    calculate_unit_pricing
)
from app.modules.inventory.ws_manager import manager

router = APIRouter(prefix="/inventory", tags=["Property Inventory & 15-Min Redis Locking"])

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
