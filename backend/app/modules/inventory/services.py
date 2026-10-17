from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, update
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
import json

from app.modules.inventory.models import Unit, ParkingSlot, ParkingBay, UnitCombinationLog
from app.modules.projects.models import Project, Tower
from app.modules.inventory.schemas import (
    UnitTileResponse, StackingFloorNode, StackingSummary, TowerStackingResponse,
    PriceBreakdownResponse, UnitMergeRequest, UnitSplitRequest,
    ParkingSlotResponse, ParkingSlotCreate
)

STATUS_COLOR_MAP = {
    "AVAILABLE": ("#10B981", "Available"),
    "RESERVED": ("#F59E0B", "15-Min Reserved"),
    "ON_HOLD": ("#F59E0B", "15-Min Reserved"),
    "BOOKED": ("#EF4444", "Booked / Sold"),
    "SOLD": ("#EF4444", "Booked / Sold"),
    "LANDOWNER_SHARE": ("#3B82F6", "Landowner Share"),
    "RETAINED": ("#8B5CF6", "Company Retained"),
    "BLOCKED": ("#6B7280", "Blocked / Hold"),
}

def resolve_status_info(status_id: str, is_landowner_share: bool) -> tuple[str, str, str]:
    if is_landowner_share or status_id == "LANDOWNER_SHARE":
        return "LANDOWNER_SHARE", "#3B82F6", "Landowner Share"
    st = status_id.upper()
    if st in ("ON_HOLD", "RESERVED"):
        return "RESERVED", "#F59E0B", "15-Min Reserved"
    if st in ("BOOKED", "SOLD"):
        return "SOLD", "#EF4444", "Sold / Executed"
    if st == "RETAINED":
        return "RETAINED", "#8B5CF6", "Company Retained"
    if st == "BLOCKED":
        return "BLOCKED", "#6B7280", "Blocked / Hold"
    return "AVAILABLE", "#10B981", "Available"


async def get_tower_stacking_plan(
    db: AsyncSession,
    project_id: int,
    tower_id: Optional[int] = None
) -> TowerStackingResponse:
    # 1. Fetch Project
    p_stmt = select(Project).where(Project.id == project_id)
    p_res = await db.execute(p_stmt)
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 2. Fetch Tower (default to first tower if not specified)
    if not tower_id:
        t_stmt = select(Tower).where(Tower.project_id == project_id).order_by(Tower.id.asc()).limit(1)
        t_res = await db.execute(t_stmt)
        tower = t_res.scalar_one_or_none()
        if not tower:
            # Fallback mock/standalone tower
            tower = Tower(id=1, project_id=project_id, tower_code="TOWER-A", tower_name="Signature Tower", residential_floors=18, basement_floors=2)
    else:
        t_stmt = select(Tower).where(Tower.id == tower_id)
        t_res = await db.execute(t_stmt)
        tower = t_res.scalar_one_or_none()
        if not tower:
            raise HTTPException(status_code=404, detail="Tower not found")

    # 3. Query all units for project and tower
    u_stmt = (
        select(Unit)
        .where(Unit.project_id == project_id)
        .where(Unit.tower_id == tower.id)
        .where(Unit.merged_into_unit_id.is_(None)) # Exclude units that were merged into another
        .order_by(Unit.floor_number.desc(), Unit.unit_number.asc())
    )
    u_res = await db.execute(u_stmt)
    all_units = u_res.scalars().all()

    now_utc = datetime.now(timezone.utc)

    # 4. Group by floor
    floors_map: Dict[int, List[UnitTileResponse]] = {}
    total_saleable_sqft = 0.0
    total_inv_value = 0.0

    count_available = 0
    count_reserved = 0
    count_sold = 0
    count_landowner = 0
    count_retained = 0
    count_blocked = 0

    for u in all_units:
        rem_sec = 0
        canonical_status, color_code, status_label = resolve_status_info(u.status_id, u.is_landowner_share)

        if canonical_status == "RESERVED" and u.lock_expires_at:
            exp = u.lock_expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            delta = (exp - now_utc).total_seconds()
            rem_sec = max(0, int(delta))
            if rem_sec == 0:
                # Auto-release expired hold
                canonical_status = "AVAILABLE"
                color_code = "#10B981"
                status_label = "Available"
                u.status_id = "AVAILABLE"
                u.current_locked_by_user_id = None
                u.current_locked_by_user_name = None
                u.lock_expires_at = None

        # Stats count
        if canonical_status == "AVAILABLE":
            count_available += 1
        elif canonical_status == "RESERVED":
            count_reserved += 1
        elif canonical_status == "SOLD":
            count_sold += 1
        elif canonical_status == "LANDOWNER_SHARE":
            count_landowner += 1
        elif canonical_status == "RETAINED":
            count_retained += 1
        elif canonical_status == "BLOCKED":
            count_blocked += 1

        gross_sft = float(u.gross_saleable_area_sqft)
        unit_price = float(u.total_unit_price)
        total_saleable_sqft += gross_sft
        total_inv_value += unit_price

        tile = UnitTileResponse(
            id=u.id,
            project_id=u.project_id,
            tower_id=u.tower_id,
            floor_number=u.floor_number,
            unit_number=u.unit_number,
            unit_type=u.unit_type_id,
            facing=u.facing_id,
            gross_sft=gross_sft,
            net_carpet_sft=float(u.net_carpet_area_sqft),
            bed_count=u.bed_count or 3,
            bath_count=u.bath_count or 3,
            balcony_count=u.balcony_count or 2,
            base_price_per_sft=float(u.base_rate_per_sqft),
            floor_rise_rate=float(u.floor_escalation_rate),
            facing_premium=float(u.facing_premium_rate),
            total_base_price=unit_price,
            utility_connection_fee=float(u.utility_connection_fee or 250000.00),
            parking_charge=float(u.parking_charge or 0.00),
            max_discount_amount=float(u.max_discount_amount or 150000.00),
            status=canonical_status,
            color_code=color_code,
            status_label=status_label,
            lock_remaining_seconds=rem_sec,
            locked_by_user_name=u.current_locked_by_user_name,
            floor_plan_image_url=u.floor_plan_image_url,
            is_merged=bool(u.is_merged),
            combination_type=u.combination_type
        )

        fl = u.floor_number
        if fl not in floors_map:
            floors_map[fl] = []
        floors_map[fl].append(tile)

    # 5. Build vertically ordered floor nodes (top down)
    sorted_floors = sorted(floors_map.keys(), reverse=True)
    floor_nodes: List[StackingFloorNode] = []

    for fl in sorted_floors:
        units_on_floor = floors_map[fl]
        # Determine floor type & name
        if fl >= (tower.residential_floors or 18):
            f_type = "PENTHOUSE"
            f_name = f"Penthouse Suite (Floor {fl})"
        elif fl == 2:
            f_type = "PODIUM"
            f_name = "Podium Wellness & Club (Floor 2)"
        elif fl == 1:
            f_type = "GROUND"
            f_name = "Ground Corporate Floor (Floor 1)"
        elif fl < 0:
            f_type = "BASEMENT"
            f_name = f"Basement {abs(fl)} Parking"
        else:
            f_type = "TYPICAL"
            f_name = f"Typical Residential Floor {fl}"

        node = StackingFloorNode(
            floor_number=fl,
            floor_name=f_name,
            floor_type=f_type,
            total_units=len(units_on_floor),
            available_count=sum(1 for x in units_on_floor if x.status == "AVAILABLE"),
            reserved_count=sum(1 for x in units_on_floor if x.status == "RESERVED"),
            sold_count=sum(1 for x in units_on_floor if x.status == "SOLD"),
            landowner_count=sum(1 for x in units_on_floor if x.status == "LANDOWNER_SHARE"),
            retained_count=sum(1 for x in units_on_floor if x.status == "RETAINED"),
            blocked_count=sum(1 for x in units_on_floor if x.status == "BLOCKED"),
            units=units_on_floor
        )
        floor_nodes.append(node)

    summary = StackingSummary(
        total_units=len(all_units),
        available=count_available,
        reserved=count_reserved,
        sold=count_sold,
        landowner=count_landowner,
        retained=count_retained,
        blocked=count_blocked,
        total_saleable_sqft=round(total_saleable_sqft, 2),
        total_inventory_value=round(total_inv_value, 2)
    )

    return TowerStackingResponse(
        project_id=project.id,
        project_name=project.project_name,
        tower_id=tower.id,
        tower_name=tower.tower_name,
        total_floors=tower.residential_floors + tower.basement_floors,
        residential_floors=tower.residential_floors,
        basement_floors=tower.basement_floors,
        floors=floor_nodes,
        summary=summary
    )


async def get_unit_price_breakdown(
    db: AsyncSession,
    unit_id: int
) -> PriceBreakdownResponse:
    stmt = select(Unit).where(Unit.id == unit_id)
    res = await db.execute(stmt)
    unit = res.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    gross_sft = float(unit.gross_saleable_area_sqft)
    net_sft = float(unit.net_carpet_area_sqft)
    base_rate = float(unit.base_rate_per_sqft)
    base_cost = round(gross_sft * base_rate, 2)

    floor_rise_rate = float(unit.floor_escalation_rate)
    floor_rise_cost = round(unit.floor_number * floor_rise_rate * gross_sft, 2)

    facing_rate = float(unit.facing_premium_rate)
    facing_cost = round(gross_sft * facing_rate, 2)

    parking_cost = float(unit.parking_charge or 0.00)
    utility_fee = float(unit.utility_connection_fee or 250000.00)

    subtotal = round(base_cost + floor_rise_cost + facing_cost + parking_cost + utility_fee, 2)
    max_discount = float(unit.max_discount_amount or 150000.00)
    min_allowed = round(subtotal - max_discount, 2)

    return PriceBreakdownResponse(
        unit_id=unit.id,
        unit_number=unit.unit_number,
        unit_type=unit.unit_type_id,
        facing=unit.facing_id,
        gross_sft=gross_sft,
        net_carpet_sft=net_sft,
        base_rate_per_sft=base_rate,
        base_cost=base_cost,
        floor_number=unit.floor_number,
        floor_rise_rate=floor_rise_rate,
        floor_rise_cost=floor_rise_cost,
        facing_premium_rate=facing_rate,
        facing_premium_cost=facing_cost,
        parking_charge=parking_cost,
        utility_connection_fee=utility_fee,
        subtotal=subtotal,
        max_discount_amount=max_discount,
        min_allowed_price=min_allowed,
        net_effective_price=subtotal,
        is_landowner_share=bool(unit.is_landowner_share),
        status=unit.status_id
    )


async def merge_units(
    db: AsyncSession,
    payload: UnitMergeRequest,
    user_id: Optional[int] = None
) -> Unit:
    if len(payload.source_unit_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 units are required to execute a unit merge.")

    # 1. Fetch source units
    stmt = select(Unit).where(Unit.id.in_(payload.source_unit_ids))
    res = await db.execute(stmt)
    source_units = res.scalars().all()

    if len(source_units) != len(payload.source_unit_ids):
        raise HTTPException(status_code=404, detail="One or more selected source units not found.")

    for u in source_units:
        if u.is_landowner_share:
            raise HTTPException(status_code=403, detail=f"Unit {u.unit_number} is Landowner Share and cannot be merged.")
        if u.status_id in ("BOOKED", "SOLD"):
            raise HTTPException(status_code=400, detail=f"Unit {u.unit_number} is already {u.status_id} and cannot be merged.")
        if u.is_merged:
            raise HTTPException(status_code=400, detail=f"Unit {u.unit_number} is already part of another merged unit.")

    # Calculate combined specifications
    combined_gross = sum(float(u.gross_saleable_area_sqft) for u in source_units)
    combined_net = sum(float(u.net_carpet_area_sqft) for u in source_units)
    avg_base_rate = sum(float(u.base_rate_per_sqft) for u in source_units) / len(source_units)
    combined_price = sum(float(u.total_unit_price) for u in source_units)
    source_nums = ", ".join(u.unit_number for u in source_units)

    # Create new merged unit
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
        combination_type=payload.unit_type,
        floor_plan_image_url="assets/images/parcels/floorplan_duplex.svg"
    )
    db.add(new_unit)
    await db.flush()

    # Update source units
    for u in source_units:
        u.status_id = "BLOCKED"
        u.is_merged = True
        u.merged_into_unit_id = new_unit.id

    # Create audit log
    log = UnitCombinationLog(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        operation_type="MERGE",
        source_unit_ids=",".join(str(u.id) for u in source_units),
        source_unit_numbers=source_nums,
        target_unit_ids=str(new_unit.id),
        target_unit_numbers=new_unit.unit_number,
        combined_gross_sft=combined_gross,
        combined_price=combined_price,
        remarks=payload.remarks or f"Merged {source_nums} into {new_unit.unit_number}",
        performed_by_id=user_id
    )
    db.add(log)
    await db.commit()
    await db.refresh(new_unit)
    return new_unit


async def split_unit(
    db: AsyncSession,
    unit_id: int,
    payload: UnitSplitRequest,
    user_id: Optional[int] = None
) -> List[Unit]:
    stmt = select(Unit).where(Unit.id == unit_id)
    res = await db.execute(stmt)
    parent = res.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent unit to subdivide not found.")

    if parent.status_id in ("BOOKED", "SOLD"):
        raise HTTPException(status_code=400, detail="Cannot split an executed or booked unit.")

    total_sub_sft = sum(item.gross_sft for item in payload.subdivisions)
    if total_sub_sft > float(parent.gross_saleable_area_sqft) * 1.05:
        raise HTTPException(status_code=400, detail=f"Total subdivided area ({total_sub_sft}) exceeds parent area ({parent.gross_saleable_area_sqft}).")

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
            combination_type="SPLIT",
            floor_plan_image_url=parent.floor_plan_image_url
        )
        db.add(sub_unit)
        created_sub_units.append(sub_unit)

    # Block parent unit
    parent.status_id = "BLOCKED"
    parent.combination_type = "SPLIT"

    await db.flush()

    # Log operation
    target_ids = ",".join(str(u.id) for u in created_sub_units)
    target_nums = ", ".join(u.unit_number for u in created_sub_units)
    log = UnitCombinationLog(
        project_id=parent.project_id,
        tower_id=parent.tower_id,
        operation_type="SPLIT",
        source_unit_ids=str(parent.id),
        source_unit_numbers=parent.unit_number,
        target_unit_ids=target_ids,
        target_unit_numbers=target_nums,
        combined_gross_sft=float(parent.gross_saleable_area_sqft),
        combined_price=float(parent.total_unit_price),
        remarks=payload.remarks or f"Subdivided {parent.unit_number} into {target_nums}",
        performed_by_id=user_id
    )
    db.add(log)
    await db.commit()
    for u in created_sub_units:
        await db.refresh(u)
    return created_sub_units
