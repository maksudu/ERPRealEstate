from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.core.database import get_db
from app.modules.operations.models import Broker, BrokerCommission, CourtCase, MachineryAsset, ImportBatch
from app.modules.operations.schemas import (
    BrokerCreate, BrokerResponse,
    BrokerCommissionCreate, BrokerCommissionResponse, CommissionReleaseRequest,
    CourtCaseCreate, CourtCaseResponse,
    MachineryAssetCreate, MachineryAssetResponse,
    ImportBatchCreate, ImportBatchResponse
)
from app.modules.operations.services import BrokerCommissionService, BulkExcelMigrationService

router = APIRouter(tags=["Operations, Legal & Migration"])


# ---------------------------------------------------------
# 1. Broker Management (Module 22)
# ---------------------------------------------------------
@router.get("/brokers", response_model=List[BrokerResponse])
async def list_brokers(
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = None
):
    stmt = select(Broker)
    if status:
        stmt = stmt.where(Broker.status == status)
    result = await db.execute(stmt.order_by(Broker.id.desc()))
    return result.scalars().all()


@router.post("/brokers", response_model=BrokerResponse, status_code=status.HTTP_201_CREATED)
async def create_broker(
    payload: BrokerCreate,
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(Broker).where(Broker.broker_code == payload.broker_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Broker code '{payload.broker_code}' already exists.")

    broker = Broker(**payload.model_dump())
    db.add(broker)
    await db.commit()
    await db.refresh(broker)
    return broker


# ---------------------------------------------------------
# 2. Broker Commissions & Staged Release (Module 22)
# ---------------------------------------------------------
@router.get("/brokers/commissions", response_model=List[BrokerCommissionResponse])
async def list_broker_commissions(
    db: AsyncSession = Depends(get_db),
    broker_id: Optional[int] = None
):
    stmt = select(BrokerCommission)
    if broker_id:
        stmt = stmt.where(BrokerCommission.broker_id == broker_id)
    result = await db.execute(stmt.order_by(BrokerCommission.id.desc()))
    return result.scalars().all()


@router.post("/brokers/commissions", response_model=BrokerCommissionResponse, status_code=status.HTTP_201_CREATED)
async def create_broker_commission(
    payload: BrokerCommissionCreate,
    db: AsyncSession = Depends(get_db)
):
    broker = await db.get(Broker, payload.broker_id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found.")

    total_commission = BrokerCommissionService.calculate_commission(
        payload.total_unit_value,
        payload.commission_percent
    )

    comm = BrokerCommission(
        broker_id=payload.broker_id,
        booking_id=payload.booking_id,
        total_unit_value=payload.total_unit_value,
        commission_percent=payload.commission_percent,
        total_commission_amount=total_commission,
        disbursed_amount=Decimal("0.00"),
        tds_withheld_amount=Decimal("0.00"),
        down_payment_disbursed=False,
        ground_slab_disbursed=False,
        registration_deed_disbursed=False,
        status="CALCULATED",
        disbursement_notes="Accrued upon booking confirmation."
    )
    db.add(comm)
    await db.commit()
    await db.refresh(comm)
    return comm


@router.post("/brokers/commissions/{id}/release")
async def release_commission_tranche(
    id: int,
    payload: CommissionReleaseRequest,
    db: AsyncSession = Depends(get_db)
):
    comm = await db.get(BrokerCommission, id)
    if not comm:
        raise HTTPException(status_code=404, detail="Broker commission record not found.")

    result = BrokerCommissionService.process_tranche_release(
        comm,
        payload.tranche_stage,
        payload.notes
    )

    await db.commit()
    await db.refresh(comm)
    return {
        "message": f"Successfully released {payload.tranche_stage} tranche.",
        "commission_id": comm.id,
        "details": result
    }


# ---------------------------------------------------------
# 3. Court Cases & Legal Litigation (Module 46)
# ---------------------------------------------------------
@router.get("/legal/cases", response_model=List[CourtCaseResponse])
async def list_court_cases(
    db: AsyncSession = Depends(get_db),
    project_id: Optional[int] = None,
    case_type: Optional[str] = None
):
    stmt = select(CourtCase)
    if project_id:
        stmt = stmt.where(CourtCase.project_id == project_id)
    if case_type:
        stmt = stmt.where(CourtCase.case_type == case_type)
    result = await db.execute(stmt.order_by(CourtCase.id.desc()))
    return result.scalars().all()


@router.post("/legal/cases", response_model=CourtCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_court_case(
    payload: CourtCaseCreate,
    db: AsyncSession = Depends(get_db)
):
    case = CourtCase(**payload.model_dump())
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


@router.put("/legal/cases/{id}/status", response_model=CourtCaseResponse)
async def update_court_case_status(
    id: int,
    new_status: str = Query(..., description="FILED, HEARING_ONGOING, STAY_ORDER_GRANTED, DISPOSED, DECREE_FAVORABLE"),
    summary_update: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    case = await db.get(CourtCase, id)
    if not case:
        raise HTTPException(status_code=404, detail="Court case not found.")

    case.status = new_status
    if summary_update:
        case.case_summary = (case.case_summary or "") + "\n" + summary_update
    await db.commit()
    await db.refresh(case)
    return case


# ---------------------------------------------------------
# 4. Heavy Equipment Fleet (Module 55)
# ---------------------------------------------------------
@router.get("/machinery/assets", response_model=List[MachineryAssetResponse])
async def list_machinery_assets(
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = None
):
    stmt = select(MachineryAsset)
    if category:
        stmt = stmt.where(MachineryAsset.category == category)
    result = await db.execute(stmt.order_by(MachineryAsset.id.desc()))
    return result.scalars().all()


@router.post("/machinery/assets", response_model=MachineryAssetResponse, status_code=status.HTTP_201_CREATED)
async def create_machinery_asset(
    payload: MachineryAssetCreate,
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(MachineryAsset).where(MachineryAsset.asset_code == payload.asset_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Asset code '{payload.asset_code}' already exists.")

    asset = MachineryAsset(**payload.model_dump())
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


@router.put("/machinery/assets/{id}/assign", response_model=MachineryAssetResponse)
async def assign_machinery_project(
    id: int,
    project_id: Optional[int] = None,
    meter_reading: Optional[Decimal] = None,
    new_status: str = "OPERATIONAL",
    db: AsyncSession = Depends(get_db)
):
    asset = await db.get(MachineryAsset, id)
    if not asset:
        raise HTTPException(status_code=404, detail="Machinery asset not found.")

    asset.current_assigned_project_id = project_id
    if meter_reading is not None:
        asset.meter_reading_hours = meter_reading
    asset.status = new_status

    await db.commit()
    await db.refresh(asset)
    return asset


# ---------------------------------------------------------
# 5. Legacy Excel Migration & Bulk Importer (Modules 62, 72)
# ---------------------------------------------------------
@router.get("/migration/batches", response_model=List[ImportBatchResponse])
async def list_import_batches(
    db: AsyncSession = Depends(get_db),
    entity_type: Optional[str] = None
):
    stmt = select(ImportBatch)
    if entity_type:
        stmt = stmt.where(ImportBatch.entity_type == entity_type)
    result = await db.execute(stmt.order_by(ImportBatch.id.desc()))
    return result.scalars().all()


@router.post("/migration/import", response_model=ImportBatchResponse, status_code=status.HTTP_201_CREATED)
async def upload_migration_batch(
    payload: ImportBatchCreate,
    db: AsyncSession = Depends(get_db)
):
    batch = ImportBatch(**payload.model_dump())
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return batch
