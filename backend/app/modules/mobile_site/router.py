from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc
from typing import Optional
from datetime import datetime, date

from app.core.database import get_db
from app.modules.mobile_site.models import (
    MobileSiteDpr,
    MobileSiteTask,
    MobileSiteMaterialReq,
    MobileSiteMaterialTx,
    MobileSitePhotoDoc,
    MobileSiteQuality,
    MobileSiteContractor,
    MobileSiteSafety,
    MobileSiteOfflineSync
)
from app.modules.mobile_site.schemas import (
    DprCreate, DprUpdate,
    TaskCreate, TaskUpdate,
    MaterialReqCreate, MaterialReqUpdate,
    MaterialTxCreate,
    PhotoDocCreate,
    QualityCreate, QualityUpdate,
    ContractorCreate, ContractorUpdate,
    SafetyCreate, SafetyUpdate,
    OfflineSyncCreate
)

router = APIRouter(prefix="/mobile-site", tags=["Mobile Site App"])


# =========================================================================
# 1. Site Dashboard KPIs & Alerts
# =========================================================================
@router.get("/dashboard/kpis")
async def get_dashboard_kpis(db: AsyncSession = Depends(get_db)):
    await _seed_defaults_if_empty(db)

    pending_tasks = (await db.execute(select(func.count(MobileSiteTask.id)).where(MobileSiteTask.status != "COMPLETED"))).scalar() or 0
    active_material_reqs = (await db.execute(select(func.count(MobileSiteMaterialReq.id)).where(MobileSiteMaterialReq.status == "PENDING"))).scalar() or 0
    inspection_alerts = (await db.execute(select(func.count(MobileSiteQuality.id)).where(MobileSiteQuality.result != "PASS"))).scalar() or 0
    open_safety_incidents = (await db.execute(select(func.count(MobileSiteSafety.id)).where(MobileSiteSafety.status != "RESOLVED"))).scalar() or 0
    dpr_submitted_count = (await db.execute(select(func.count(MobileSiteDpr.id)))).scalar() or 0

    return {
        "project_overall_progress_percent": 68.5,
        "active_labour_strength_today": 142,
        "pending_tasks": pending_tasks,
        "material_requests": active_material_reqs,
        "inspection_alerts": inspection_alerts,
        "open_safety_incidents": open_safety_incidents,
        "dpr_submitted_count": dpr_submitted_count,
        "offline_cached_records": 3,
        "concrete_cube_tests_due": 2,
        "active_project": "BlueOceans Marina Bay (Tower Alpha & Beta)"
    }


# =========================================================================
# 2. Daily Progress Report (DPR)
# =========================================================================
@router.get("/dpr")
async def list_dprs(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSiteDpr)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSiteDpr.dpr_code.ilike(s),
                MobileSiteDpr.project_name.ilike(s),
                MobileSiteDpr.site_engineer.ilike(s),
                MobileSiteDpr.work_completed.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSiteDpr.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSiteDpr.dpr_date)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/dpr")
async def create_dpr(payload: DprCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSiteDpr.id)))).scalar() or 0
    code = f"DPR-2026-{(count + 1):04d}"
    dpr = MobileSiteDpr(
        dpr_code=code,
        project_name=payload.project_name,
        dpr_date=payload.dpr_date,
        weather_condition=payload.weather_condition,
        labour_count=payload.labour_count,
        work_completed=payload.work_completed,
        delays_challenges=payload.delays_challenges,
        site_engineer=payload.site_engineer,
        status=payload.status
    )
    db.add(dpr)
    await db.commit()
    await db.refresh(dpr)
    return dpr


@router.put("/dpr/{dpr_id}")
async def update_dpr(dpr_id: int, payload: DprUpdate, db: AsyncSession = Depends(get_db)):
    dpr = (await db.execute(select(MobileSiteDpr).where(MobileSiteDpr.id == dpr_id))).scalar_one_or_none()
    if not dpr:
        raise HTTPException(status_code=404, detail="DPR record not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(dpr, field, value)

    await db.commit()
    await db.refresh(dpr)
    return dpr


@router.delete("/dpr/{dpr_id}")
async def delete_dpr(dpr_id: int, db: AsyncSession = Depends(get_db)):
    dpr = (await db.execute(select(MobileSiteDpr).where(MobileSiteDpr.id == dpr_id))).scalar_one_or_none()
    if not dpr:
        raise HTTPException(status_code=404, detail="DPR record not found")
    await db.delete(dpr)
    await db.commit()
    return {"message": "DPR deleted", "id": dpr_id}


# =========================================================================
# 3. Task & Milestone Management
# =========================================================================
@router.get("/tasks")
async def list_tasks(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSiteTask)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSiteTask.task_code.ilike(s),
                MobileSiteTask.task_name.ilike(s),
                MobileSiteTask.milestone_name.ilike(s),
                MobileSiteTask.assigned_to.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSiteTask.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(MobileSiteTask.deadline).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/tasks")
async def create_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSiteTask.id)))).scalar() or 0
    code = f"TSK-2026-{(count + 1):04d}"
    task = MobileSiteTask(
        task_code=code,
        task_name=payload.task_name,
        milestone_name=payload.milestone_name,
        project_name=payload.project_name,
        assigned_to=payload.assigned_to,
        deadline=payload.deadline,
        progress_percentage=payload.progress_percentage,
        priority=payload.priority,
        status=payload.status
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.put("/tasks/{task_id}")
async def update_task(task_id: int, payload: TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = (await db.execute(select(MobileSiteTask).where(MobileSiteTask.id == task_id))).scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    if task.progress_percentage >= 100:
        task.status = "COMPLETED"

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = (await db.execute(select(MobileSiteTask).where(MobileSiteTask.id == task_id))).scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return {"message": "Task removed", "id": task_id}


# =========================================================================
# 4. Material Requisitions
# =========================================================================
@router.get("/requisitions")
async def list_requisitions(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSiteMaterialReq)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSiteMaterialReq.req_code.ilike(s),
                MobileSiteMaterialReq.material_name.ilike(s),
                MobileSiteMaterialReq.project_name.ilike(s),
                MobileSiteMaterialReq.requested_by.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSiteMaterialReq.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSiteMaterialReq.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/requisitions")
async def create_requisition(payload: MaterialReqCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSiteMaterialReq.id)))).scalar() or 0
    code = f"SMR-2026-{(count + 1):04d}"
    req = MobileSiteMaterialReq(
        req_code=code,
        project_name=payload.project_name,
        material_name=payload.material_name,
        material_category=payload.material_category,
        quantity=payload.quantity,
        unit=payload.unit,
        urgency=payload.urgency,
        required_by_date=payload.required_by_date,
        requested_by=payload.requested_by,
        status=payload.status
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


@router.put("/requisitions/{req_id}")
async def update_requisition(req_id: int, payload: MaterialReqUpdate, db: AsyncSession = Depends(get_db)):
    req = (await db.execute(select(MobileSiteMaterialReq).where(MobileSiteMaterialReq.id == req_id))).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Material requisition not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(req, field, value)

    await db.commit()
    await db.refresh(req)
    return req


@router.delete("/requisitions/{req_id}")
async def delete_requisition(req_id: int, db: AsyncSession = Depends(get_db)):
    req = (await db.execute(select(MobileSiteMaterialReq).where(MobileSiteMaterialReq.id == req_id))).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Material requisition not found")
    await db.delete(req)
    await db.commit()
    return {"message": "Requisition removed", "id": req_id}


# =========================================================================
# 5. Material Receiving & Consumption (Transactions)
# =========================================================================
@router.get("/transactions")
async def list_transactions(
    search: Optional[str] = Query(None),
    tx_type: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSiteMaterialTx)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSiteMaterialTx.tx_code.ilike(s),
                MobileSiteMaterialTx.material_name.ilike(s),
                MobileSiteMaterialTx.challan_number.ilike(s),
                MobileSiteMaterialTx.vendor_or_receiver.ilike(s)
            )
        )
    if tx_type and tx_type != "ALL":
        query = query.where(MobileSiteMaterialTx.tx_type == tx_type)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSiteMaterialTx.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/transactions")
async def create_transaction(payload: MaterialTxCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSiteMaterialTx.id)))).scalar() or 0
    code = f"MTX-2026-{(count + 1):04d}"
    tx = MobileSiteMaterialTx(
        tx_code=code,
        tx_type=payload.tx_type,
        project_name=payload.project_name,
        material_name=payload.material_name,
        quantity=payload.quantity,
        unit=payload.unit,
        vendor_or_receiver=payload.vendor_or_receiver,
        challan_number=payload.challan_number,
        vehicle_number=payload.vehicle_number,
        recorded_by=payload.recorded_by,
        remarks=payload.remarks
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


@router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: int, db: AsyncSession = Depends(get_db)):
    tx = (await db.execute(select(MobileSiteMaterialTx).where(MobileSiteMaterialTx.id == tx_id))).scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.delete(tx)
    await db.commit()
    return {"message": "Transaction removed", "id": tx_id}


# =========================================================================
# 6. Site Photo Documentation
# =========================================================================
@router.get("/photos")
async def list_photos(
    search: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSitePhotoDoc)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSitePhotoDoc.photo_code.ilike(s),
                MobileSitePhotoDoc.project_name.ilike(s),
                MobileSitePhotoDoc.floor_or_location.ilike(s),
                MobileSitePhotoDoc.captured_by.ilike(s)
            )
        )

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSitePhotoDoc.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/photos")
async def create_photo(payload: PhotoDocCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSitePhotoDoc.id)))).scalar() or 0
    code = f"IMG-2026-{(count + 1):04d}"
    photo = MobileSitePhotoDoc(
        photo_code=code,
        project_name=payload.project_name,
        floor_or_location=payload.floor_or_location,
        photo_url=payload.photo_url,
        gps_latitude=payload.gps_latitude,
        gps_longitude=payload.gps_longitude,
        captured_by=payload.captured_by,
        notes=payload.notes
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


@router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: int, db: AsyncSession = Depends(get_db)):
    photo = (await db.execute(select(MobileSitePhotoDoc).where(MobileSitePhotoDoc.id == photo_id))).scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    await db.delete(photo)
    await db.commit()
    return {"message": "Photo removed", "id": photo_id}


# =========================================================================
# 7. Quality Control
# =========================================================================
@router.get("/quality")
async def list_quality_inspections(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSiteQuality)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSiteQuality.qc_code.ilike(s),
                MobileSiteQuality.inspection_item.ilike(s),
                MobileSiteQuality.project_name.ilike(s),
                MobileSiteQuality.inspected_by.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSiteQuality.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSiteQuality.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/quality")
async def create_quality_inspection(payload: QualityCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSiteQuality.id)))).scalar() or 0
    code = f"QC-2026-{(count + 1):04d}"
    qc = MobileSiteQuality(
        qc_code=code,
        project_name=payload.project_name,
        inspection_item=payload.inspection_item,
        inspection_category=payload.inspection_category,
        result=payload.result,
        defect_notes=payload.defect_notes,
        corrective_action=payload.corrective_action,
        inspected_by=payload.inspected_by,
        status=payload.status
    )
    db.add(qc)
    await db.commit()
    await db.refresh(qc)
    return qc


@router.put("/quality/{qc_id}")
async def update_quality_inspection(qc_id: int, payload: QualityUpdate, db: AsyncSession = Depends(get_db)):
    qc = (await db.execute(select(MobileSiteQuality).where(MobileSiteQuality.id == qc_id))).scalar_one_or_none()
    if not qc:
        raise HTTPException(status_code=404, detail="Quality inspection record not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(qc, field, value)

    await db.commit()
    await db.refresh(qc)
    return qc


@router.delete("/quality/{qc_id}")
async def delete_quality_inspection(qc_id: int, db: AsyncSession = Depends(get_db)):
    qc = (await db.execute(select(MobileSiteQuality).where(MobileSiteQuality.id == qc_id))).scalar_one_or_none()
    if not qc:
        raise HTTPException(status_code=404, detail="Quality record not found")
    await db.delete(qc)
    await db.commit()
    return {"message": "Quality record removed", "id": qc_id}


# =========================================================================
# 8. Contractor Management
# =========================================================================
@router.get("/contractors")
async def list_contractor_records(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSiteContractor)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSiteContractor.record_code.ilike(s),
                MobileSiteContractor.contractor_name.ilike(s),
                MobileSiteContractor.work_description.ilike(s),
                MobileSiteContractor.trade_type.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSiteContractor.verification_status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSiteContractor.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/contractors")
async def create_contractor_record(payload: ContractorCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSiteContractor.id)))).scalar() or 0
    code = f"CT-REC-2026-{(count + 1):04d}"
    rec = MobileSiteContractor(
        record_code=code,
        project_name=payload.project_name,
        contractor_name=payload.contractor_name,
        trade_type=payload.trade_type,
        work_description=payload.work_description,
        measured_quantity=payload.measured_quantity,
        unit=payload.unit,
        verified_bill_amount=payload.verified_bill_amount,
        verification_status=payload.verification_status,
        verified_by=payload.verified_by
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


@router.put("/contractors/{rec_id}")
async def update_contractor_record(rec_id: int, payload: ContractorUpdate, db: AsyncSession = Depends(get_db)):
    rec = (await db.execute(select(MobileSiteContractor).where(MobileSiteContractor.id == rec_id))).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Contractor record not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rec, field, value)

    await db.commit()
    await db.refresh(rec)
    return rec


@router.delete("/contractors/{rec_id}")
async def delete_contractor_record(rec_id: int, db: AsyncSession = Depends(get_db)):
    rec = (await db.execute(select(MobileSiteContractor).where(MobileSiteContractor.id == rec_id))).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Contractor record not found")
    await db.delete(rec)
    await db.commit()
    return {"message": "Contractor measurement record removed", "id": rec_id}


# =========================================================================
# 9. Safety Management (HSE)
# =========================================================================
@router.get("/safety")
async def list_safety_incidents(
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSiteSafety)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSiteSafety.incident_code.ilike(s),
                MobileSiteSafety.incident_type.ilike(s),
                MobileSiteSafety.description.ilike(s),
                MobileSiteSafety.inspector_name.ilike(s)
            )
        )
    if severity and severity != "ALL":
        query = query.where(MobileSiteSafety.severity == severity)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSiteSafety.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/safety")
async def create_safety_incident(payload: SafetyCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSiteSafety.id)))).scalar() or 0
    code = f"HSE-2026-{(count + 1):04d}"
    incident = MobileSiteSafety(
        incident_code=code,
        project_name=payload.project_name,
        incident_type=payload.incident_type,
        severity=payload.severity,
        description=payload.description,
        corrective_action=payload.corrective_action,
        inspector_name=payload.inspector_name,
        status=payload.status
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    return incident


@router.put("/safety/{incident_id}")
async def update_safety_incident(incident_id: int, payload: SafetyUpdate, db: AsyncSession = Depends(get_db)):
    incident = (await db.execute(select(MobileSiteSafety).where(MobileSiteSafety.id == incident_id))).scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Safety incident not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(incident, field, value)

    await db.commit()
    await db.refresh(incident)
    return incident


@router.delete("/safety/{incident_id}")
async def delete_safety_incident(incident_id: int, db: AsyncSession = Depends(get_db)):
    incident = (await db.execute(select(MobileSiteSafety).where(MobileSiteSafety.id == incident_id))).scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Safety incident not found")
    await db.delete(incident)
    await db.commit()
    return {"message": "Safety incident removed", "id": incident_id}


# =========================================================================
# 10. Offline Sync Queue
# =========================================================================
@router.get("/offline-sync")
async def list_offline_syncs(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSiteOfflineSync)
    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSiteOfflineSync.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/offline-sync")
async def create_offline_sync(payload: OfflineSyncCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSiteOfflineSync.id)))).scalar() or 0
    code = f"SYNC-2026-{(count + 1):04d}"
    sync = MobileSiteOfflineSync(
        sync_code=code,
        payload_type=payload.payload_type,
        device_id=payload.device_id,
        synced_records_count=payload.synced_records_count,
        status="SYNCED",
        remarks=payload.remarks
    )
    db.add(sync)
    await db.commit()
    await db.refresh(sync)
    return sync


@router.put("/offline-sync/{sync_id}")
async def update_offline_sync(sync_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    sync = (await db.execute(select(MobileSiteOfflineSync).where(MobileSiteOfflineSync.id == sync_id))).scalar_one_or_none()
    if not sync:
        raise HTTPException(status_code=404, detail="Sync item not found")
    if "sync_status" in payload:
        sync.status = payload["sync_status"]
    if "status" in payload:
        sync.status = payload["status"]
    if "remarks" in payload:
        sync.remarks = payload["remarks"]
    await db.commit()
    await db.refresh(sync)
    return sync


@router.delete("/offline-sync/{sync_id}")
async def delete_offline_sync(sync_id: int, db: AsyncSession = Depends(get_db)):
    sync = (await db.execute(select(MobileSiteOfflineSync).where(MobileSiteOfflineSync.id == sync_id))).scalar_one_or_none()
    if not sync:
        raise HTTPException(status_code=404, detail="Sync item not found")
    await db.delete(sync)
    await db.commit()
    return {"message": "Sync item deleted", "id": sync_id}


# =========================================================================
# 11. Auth Session
# =========================================================================
@router.get("/auth/session")
async def get_site_auth_session():
    return {
        "user_id": 202,
        "username": "sajjad.engineer",
        "full_name": "Engr. Sajjad Hossain",
        "role_code": "SITE_ENGINEER",
        "role_name": "Senior Site Engineer & Project Manager",
        "assigned_projects": ["BlueOceans Marina Bay", "BlueOceans Skyline"],
        "permissions": [
            "SITE_DPR_CREATE",
            "SITE_TASK_MANAGE",
            "SITE_MATERIAL_REQ",
            "SITE_STOCK_RECEIVE",
            "SITE_PHOTO_UPLOAD",
            "SITE_QUALITY_INSPECT",
            "SITE_CONTRACTOR_VERIFY",
            "SITE_HSE_REPORT",
            "SITE_OFFLINE_SYNC"
        ],
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.site_engineer_demo_token",
        "token_type": "Bearer"
    }


# =========================================================================
# Helper: Seed default records on first run
# =========================================================================
async def _seed_defaults_if_empty(db: AsyncSession):
    count = (await db.execute(select(func.count(MobileSiteDpr.id)))).scalar() or 0
    if count > 0:
        return

    # Seed DPR
    dpr_items = [
        MobileSiteDpr(
            dpr_code="DPR-2026-0001",
            project_name="BlueOceans Marina Bay",
            dpr_date=date.today(),
            weather_condition="Sunny (33°C), Low Humidity",
            labour_count=68,
            work_completed="Tower Alpha 14th floor roof slab rebar binding completed (95%). Shuttering inspection initiated. Concrete pump positioned for tomorrow morning casting.",
            delays_challenges="Slight delay in ready-mix concrete batch delivery from Meghna plant due to city traffic window.",
            site_engineer="Engr. Sajjad Hossain",
            status="SUBMITTED"
        ),
        MobileSiteDpr(
            dpr_code="DPR-2026-0002",
            project_name="BlueOceans Skyline",
            dpr_date=date.today(),
            weather_condition="Clear (31°C)",
            labour_count=52,
            work_completed="Basement-2 diaphragm wall water-tightness curing and sump pump installation completed.",
            delays_challenges="None. Power backup generator tested successfully.",
            site_engineer="Engr. Tariqul Islam",
            status="APPROVED"
        )
    ]
    db.add_all(dpr_items)

    # Seed Tasks
    task_items = [
        MobileSiteTask(
            task_code="TSK-2026-0001",
            task_name="Tower Alpha 14th Floor Slab Concrete Casting",
            milestone_name="Superstructure Frame",
            project_name="BlueOceans Marina Bay",
            assigned_to="Engr. Sajjad Hossain",
            deadline=date.today(),
            progress_percentage=85,
            priority="CRITICAL",
            status="IN_PROGRESS"
        ),
        MobileSiteTask(
            task_code="TSK-2026-0002",
            task_name="Concrete Cube Compressive Strength 28-Day Crushing Test",
            milestone_name="Quality Assurance",
            project_name="BlueOceans Marina Bay",
            assigned_to="QC Engineer Rahim",
            deadline=date.today(),
            progress_percentage=100,
            priority="HIGH",
            status="COMPLETED"
        ),
        MobileSiteTask(
            task_code="TSK-2026-0003",
            task_name="Basement Electrical Conduit & Earthing Pit Laying",
            milestone_name="MEP Infrastructure",
            project_name="BlueOceans Skyline",
            assigned_to="Engr. Tariqul Islam",
            deadline=date.today(),
            progress_percentage=40,
            priority="MEDIUM",
            status="IN_PROGRESS"
        )
    ]
    db.add_all(task_items)

    # Seed Material Requisitions
    req_items = [
        MobileSiteMaterialReq(
            req_code="SMR-2026-0001",
            project_name="BlueOceans Marina Bay",
            material_name="Seven Rings Special Portland Composite Cement (PCC)",
            material_category="CEMENT",
            quantity=800.00,
            unit="Bags",
            urgency="URGENT",
            required_by_date=date.today(),
            requested_by="Engr. Sajjad Hossain",
            status="PENDING"
        ),
        MobileSiteMaterialReq(
            req_code="SMR-2026-0002",
            project_name="BlueOceans Marina Bay",
            material_name="BSRM 72.5G High Strength TMT Rebar 20mm & 16mm",
            material_category="STEEL",
            quantity=25.00,
            unit="Tons",
            urgency="NORMAL",
            required_by_date=date.today(),
            requested_by="Engr. Sajjad Hossain",
            status="APPROVED"
        ),
        MobileSiteMaterialReq(
            req_code="SMR-2026-0003",
            project_name="BlueOceans Skyline",
            material_name="Sylhet Coarse Sand (FM 2.5)",
            material_category="SAND",
            quantity=3500.00,
            unit="Cft",
            urgency="NORMAL",
            required_by_date=date.today(),
            requested_by="Engr. Tariqul Islam",
            status="PENDING"
        )
    ]
    db.add_all(req_items)

    # Seed Material Transactions
    tx_items = [
        MobileSiteMaterialTx(
            tx_code="MTX-2026-0001",
            tx_type="RECEIVED",
            project_name="BlueOceans Marina Bay",
            material_name="Seven Rings Cement (PCC)",
            quantity=500.00,
            unit="Bags",
            vendor_or_receiver="Seven Rings Cement Ltd.",
            challan_number="CH-88219",
            vehicle_number="Dhaka Metro-Ta 11-4521",
            recorded_by="Storekeeper Faruk",
            remarks="Verified 500 bags unloaded at central site warehouse. Quality seals intact."
        ),
        MobileSiteMaterialTx(
            tx_code="MTX-2026-0002",
            tx_type="ISSUED",
            project_name="BlueOceans Marina Bay",
            material_name="Seven Rings Cement (PCC)",
            quantity=240.00,
            unit="Bags",
            vendor_or_receiver="Contractor Messers Kashem Builders",
            challan_number="ISS-1092",
            recorded_by="Storekeeper Faruk",
            remarks="Issued for 14th floor beam and column preparation."
        )
    ]
    db.add_all(tx_items)

    # Seed Photos
    photo_items = [
        MobileSitePhotoDoc(
            photo_code="IMG-2026-0001",
            project_name="BlueOceans Marina Bay",
            floor_or_location="14th Floor Slab Decking & Rebar Mesh",
            photo_url="/static/uploads/site_photos/slab_decking_alpha.jpg",
            gps_latitude=23.792500,
            gps_longitude=90.407800,
            captured_by="Engr. Sajjad Hossain",
            notes="Clear view of spacing chairs, beam bottom stirrups and conduit lines before casting."
        )
    ]
    db.add_all(photo_items)

    # Seed Quality Inspections
    qc_items = [
        MobileSiteQuality(
            qc_code="QC-2026-0001",
            project_name="BlueOceans Marina Bay",
            inspection_item="Tower Alpha Column C4 Rebar Lap Length & Clear Cover",
            inspection_category="REBAR_CHECK",
            result="PASS",
            defect_notes="Cover blocks 40mm adequately placed.",
            corrective_action="N/A. Approved for shuttering.",
            inspected_by="QC Engineer Rahim",
            status="APPROVED"
        ),
        MobileSiteQuality(
            qc_code="QC-2026-0002",
            project_name="BlueOceans Skyline",
            inspection_item="7-Day Concrete Cube Compressive Strength Test (Batch #42)",
            inspection_category="CONCRETE_CUBE",
            result="PASS",
            defect_notes="Average compressive strength achieved 26.4 MPa (exceeds 70% threshold).",
            corrective_action="Proceed to 28-day curing verification.",
            inspected_by="QC Engineer Rahim",
            status="APPROVED"
        )
    ]
    db.add_all(qc_items)

    # Seed Contractors
    ct_items = [
        MobileSiteContractor(
            record_code="CT-REC-2026-0001",
            project_name="BlueOceans Marina Bay",
            contractor_name="M/S Kashem Civil Construction",
            trade_type="Civil & Formwork",
            work_description="Shuttering & Bar Bending for 14th Floor Slab",
            measured_quantity=2450.00,
            unit="Sft",
            verified_bill_amount=367500.00,
            verification_status="VERIFIED",
            verified_by="Project Manager"
        )
    ]
    db.add_all(ct_items)

    # Seed Safety Incidents
    safety_items = [
        MobileSiteSafety(
            incident_code="HSE-2026-0001",
            project_name="BlueOceans Marina Bay",
            incident_type="PPE_VIOLATION",
            severity="LOW",
            description="3 sub-contractor helpers found working on perimeter scaffold without double lanyard safety harness.",
            corrective_action="Work halted immediately. Safety harness issued, safety toolbox briefing conducted on site.",
            inspector_name="HSE Officer Alam",
            status="RESOLVED"
        )
    ]
    db.add_all(safety_items)

    # Seed Offline Sync
    sync_items = [
        MobileSiteOfflineSync(
            sync_code="SYNC-2026-0001",
            payload_type="DPR_ENTRY",
            device_id="MOBILE-SM-G998B",
            synced_records_count=2,
            status="SYNCED",
            remarks="Offline batch synced over 4G connectivity at 06:45 PM"
        )
    ]
    db.add_all(sync_items)

    await db.commit()
