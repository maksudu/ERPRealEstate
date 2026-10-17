from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, timedelta

from app.core.database import get_db
from app.modules.land.models import (
    LandBank, Landowner, SurveyRecord, JVAgreement, JVUnitAllocation,
    LandKhatian, LandDag, LandDeedDocument, LandJVMilestonePayment
)
from app.modules.land.schemas import (
    LandBankCreate, LandBankUpdate, LandBankResponse,
    LandownerCreate, LandownerResponse,
    SurveyRecordCreate, SurveyRecordResponse,
    LandKhatianCreate, LandKhatianResponse,
    LandDagCreate, LandDagResponse,
    LandDeedDocumentCreate, LandDeedDocumentResponse,
    LandJVMilestonePaymentCreate, LandJVMilestonePaymentResponse,
    JVAgreementCreate, JVAgreementResponse,
    JVUnitAllocationCreate, JVUnitAllocationResponse,
    JVAutoAllocationRequest, JVAutoAllocationResponse,
    DeedChainVerificationResponse,
    convert_area_to_all_units
)

router = APIRouter(prefix="/land", tags=["Land Bank, Khatians, Dags & Landowner JV Engine"])


# -------------------------------------------------------------
# 1. Multi-Unit Area Conversion Calculator Helper Endpoint
# -------------------------------------------------------------
@router.get("/math/convert", response_model=dict)
async def calculate_area(
    katha: Optional[float] = Query(None, description="Land area in Katha"),
    decimal: Optional[float] = Query(None, description="Land area in Decimal / Shotok"),
    sqft: Optional[float] = Query(None, description="Land area in Sq Ft"),
    bigha: Optional[float] = Query(None, description="Land area in Bigha (1 Bigha = 20 Katha)")
):
    """
    Standard Bangladesh land measurement conversion:
    - 1 Katha = 720 Sq Ft
    - 1 Decimal = 435.60 Sq Ft
    - 1 Bigha = 20 Katha = 14,400 Sq Ft
    - 1 Acre = 100 Decimal = 43,560 Sq Ft
    """
    return convert_area_to_all_units(katha=katha, decimal=decimal, sqft=sqft, bigha=bigha)


# -------------------------------------------------------------
# 2. Land Bank Parcels CRUD
# -------------------------------------------------------------
@router.get("/proposals", response_model=List[LandBankResponse])
async def list_proposals(
    status_filter: Optional[str] = Query(None, alias="status"),
    deal_type_filter: Optional[str] = Query(None, alias="deal_type"),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves land acquisition proposals with nested landowners, khatians, dags, documents, and JV agreements.
    """
    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.survey_records),
            selectinload(LandBank.khatians),
            selectinload(LandBank.dags),
            selectinload(LandBank.documents),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.unit_allocations),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.milestones)
        )
        .order_by(desc(LandBank.id))
    )

    if status_filter:
        stmt = stmt.where(LandBank.status == status_filter)
    if deal_type_filter:
        stmt = stmt.where(LandBank.deal_type == deal_type_filter)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            (LandBank.project_code.ilike(search_pattern)) |
            (LandBank.proposal_title.ilike(search_pattern)) |
            (LandBank.mouza_name.ilike(search_pattern)) |
            (LandBank.upazila_thana.ilike(search_pattern))
        )

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/proposals", response_model=LandBankResponse, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    payload: LandBankCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new land proposal with automatic multi-unit area conversion and optional landowners.
    """
    existing = await db.execute(select(LandBank).where(LandBank.project_code == payload.project_code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project code '{payload.project_code}' already exists."
        )

    katha_val = payload.input_value if payload.input_unit.upper() == "KATHA" else None
    decimal_val = payload.input_value if payload.input_unit.upper() == "DECIMAL" else None
    sqft_val = payload.input_value if payload.input_unit.upper() == "SQFT" else None
    bigha_val = payload.input_value if payload.input_unit.upper() == "BIGHA" else None

    converted = convert_area_to_all_units(katha=katha_val, decimal=decimal_val, sqft=sqft_val, bigha=bigha_val)

    proposal = LandBank(
        project_code=payload.project_code.strip(),
        proposal_title=payload.proposal_title.strip(),
        mouza_name=payload.mouza_name.strip(),
        jl_number=payload.jl_number.strip(),
        upazila_thana=payload.upazila_thana or "Gulshan",
        district=payload.district or "Dhaka",
        sub_registry_office=payload.sub_registry_office or "Gulshan Sub-Registry Office",
        total_area_katha=converted["katha"],
        total_area_decimal=converted["decimal"],
        total_area_bigha=converted["bigha"],
        total_area_sqft=converted["sqft"],
        deal_type=payload.deal_type.upper(),
        status=payload.status.upper() if payload.status else "DRAFT_PROPOSAL",
        location_description=payload.location_description
    )

    db.add(proposal)
    await db.flush()

    if payload.landowners:
        for lo_data in payload.landowners:
            lo = Landowner(
                land_bank_id=proposal.id,
                owner_type=lo_data.owner_type,
                full_name_en=lo_data.full_name_en,
                full_name_bn=lo_data.full_name_bn,
                nid_number=lo_data.nid_number,
                tin_number=lo_data.tin_number,
                phone_number=lo_data.phone_number,
                ownership_share_ratio=lo_data.ownership_share_ratio,
                bank_details=lo_data.bank_details
            )
            db.add(lo)
        await db.flush()

    await db.commit()

    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.survey_records),
            selectinload(LandBank.khatians),
            selectinload(LandBank.dags),
            selectinload(LandBank.documents),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.unit_allocations),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.milestones)
        )
        .where(LandBank.id == proposal.id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@router.get("/proposals/{proposal_id}", response_model=LandBankResponse)
async def get_proposal(proposal_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.survey_records),
            selectinload(LandBank.khatians),
            selectinload(LandBank.dags),
            selectinload(LandBank.documents),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.unit_allocations),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.milestones)
        )
        .where(LandBank.id == proposal_id)
    )
    res = await db.execute(stmt)
    proposal = res.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Land proposal not found")
    return proposal


@router.put("/proposals/{proposal_id}", response_model=LandBankResponse)
async def update_proposal(
    proposal_id: int,
    payload: LandBankUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.survey_records),
            selectinload(LandBank.khatians),
            selectinload(LandBank.dags),
            selectinload(LandBank.documents),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.unit_allocations),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.milestones)
        )
        .where(LandBank.id == proposal_id)
    )
    res = await db.execute(stmt)
    proposal = res.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Land proposal not found")

    if payload.proposal_title:
        proposal.proposal_title = payload.proposal_title
    if payload.mouza_name:
        proposal.mouza_name = payload.mouza_name
    if payload.jl_number:
        proposal.jl_number = payload.jl_number
    if payload.upazila_thana:
        proposal.upazila_thana = payload.upazila_thana
    if payload.district:
        proposal.district = payload.district
    if payload.sub_registry_office:
        proposal.sub_registry_office = payload.sub_registry_office
    if payload.deal_type:
        proposal.deal_type = payload.deal_type
    if payload.status:
        proposal.status = payload.status
    if payload.location_description is not None:
        proposal.location_description = payload.location_description

    if payload.input_unit and payload.input_value:
        katha_val = payload.input_value if payload.input_unit.upper() == "KATHA" else None
        decimal_val = payload.input_value if payload.input_unit.upper() == "DECIMAL" else None
        sqft_val = payload.input_value if payload.input_unit.upper() == "SQFT" else None
        bigha_val = payload.input_value if payload.input_unit.upper() == "BIGHA" else None
        converted = convert_area_to_all_units(katha=katha_val, decimal=decimal_val, sqft=sqft_val, bigha=bigha_val)
        proposal.total_area_katha = converted["katha"]
        proposal.total_area_decimal = converted["decimal"]
        proposal.total_area_bigha = converted["bigha"]
        proposal.total_area_sqft = converted["sqft"]

    await db.commit()
    await db.refresh(proposal)
    return proposal


# -------------------------------------------------------------
# 3. Khatian Hierarchy (CS, SA, RS, BS, Mutation)
# -------------------------------------------------------------
@router.get("/khatians", response_model=List[LandKhatianResponse])
async def list_khatians(
    land_bank_id: Optional[int] = Query(None),
    khatian_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LandKhatian).order_by(LandKhatian.id.asc())
    if land_bank_id:
        stmt = stmt.where(LandKhatian.land_bank_id == land_bank_id)
    if khatian_type:
        stmt = stmt.where(LandKhatian.khatian_type == khatian_type)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/khatians", response_model=LandKhatianResponse, status_code=status.HTTP_201_CREATED)
async def create_khatian(
    payload: LandKhatianCreate,
    db: AsyncSession = Depends(get_db)
):
    khatian = LandKhatian(**payload.model_dump())
    db.add(khatian)
    await db.commit()
    await db.refresh(khatian)
    return khatian


# -------------------------------------------------------------
# 4. Dag / Plot Tracking with Multi-Unit Conversions
# -------------------------------------------------------------
@router.get("/dags", response_model=List[LandDagResponse])
async def list_dags(
    land_bank_id: Optional[int] = Query(None),
    khatian_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LandDag).order_by(LandDag.id.asc())
    if land_bank_id:
        stmt = stmt.where(LandDag.land_bank_id == land_bank_id)
    if khatian_id:
        stmt = stmt.where(LandDag.khatian_id == khatian_id)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/dags", response_model=LandDagResponse, status_code=status.HTTP_201_CREATED)
async def create_dag(
    payload: LandDagCreate,
    db: AsyncSession = Depends(get_db)
):
    katha_val = payload.input_value if payload.input_unit.upper() == "KATHA" else None
    decimal_val = payload.input_value if payload.input_unit.upper() == "DECIMAL" else None
    bigha_val = payload.input_value if payload.input_unit.upper() == "BIGHA" else None
    sqft_val = payload.input_value if payload.input_unit.upper() == "SQFT" else None

    converted = convert_area_to_all_units(katha=katha_val, decimal=decimal_val, sqft=sqft_val, bigha=bigha_val)

    dag = LandDag(
        land_bank_id=payload.land_bank_id,
        khatian_id=payload.khatian_id,
        dag_number=payload.dag_number.strip(),
        land_class=payload.land_class.upper(),
        area_decimal=converted["decimal"],
        area_katha=converted["katha"],
        area_bigha=converted["bigha"],
        area_sqft=converted["sqft"],
        possession_status=payload.possession_status or "FULL_POSSESSION",
        remarks=payload.remarks
    )
    db.add(dag)
    await db.commit()
    await db.refresh(dag)
    return dag


# -------------------------------------------------------------
# 5. Deed Documents, Mutation, DCR, Khajna & PoA Expiry Alerts
# -------------------------------------------------------------
@router.get("/documents", response_model=List[LandDeedDocumentResponse])
async def list_documents(
    land_bank_id: Optional[int] = Query(None),
    doc_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LandDeedDocument).order_by(LandDeedDocument.id.desc())
    if land_bank_id:
        stmt = stmt.where(LandDeedDocument.land_bank_id == land_bank_id)
    if doc_type:
        stmt = stmt.where(LandDeedDocument.doc_type == doc_type)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/documents", response_model=LandDeedDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: LandDeedDocumentCreate,
    db: AsyncSession = Depends(get_db)
):
    today = date.today()
    is_exp = bool(payload.expiry_date and payload.expiry_date < today)
    doc = LandDeedDocument(**payload.model_dump())
    doc.is_expired = is_exp
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/documents/expiry-alerts")
async def get_document_expiry_alerts(db: AsyncSession = Depends(get_db)):
    """
    Returns legal alerts for Khajna (Land Tax) and Power of Attorney (PoA)
    documents expiring within 60 days or already expired.
    """
    today = date.today()
    threshold = today + timedelta(days=60)

    stmt = (
        select(LandDeedDocument)
        .options(selectinload(LandDeedDocument.land_bank))
        .where(
            LandDeedDocument.expiry_date != None,
            LandDeedDocument.expiry_date <= threshold
        )
        .order_by(LandDeedDocument.expiry_date.asc())
    )
    res = await db.execute(stmt)
    docs = res.scalars().all()

    alerts = []
    for d in docs:
        days_left = (d.expiry_date - today).days
        is_overdue = days_left < 0
        alerts.append({
            "id": d.id,
            "doc_number": d.doc_number,
            "doc_type": d.doc_type,
            "parcel_title": d.land_bank.proposal_title if d.land_bank else "Land Parcel",
            "mouza": d.land_bank.mouza_name if d.land_bank else "",
            "expiry_date": d.expiry_date,
            "days_remaining": days_left,
            "alert_severity": "DANGER" if is_overdue else ("WARNING" if days_left <= 30 else "INFO"),
            "status_message": f"Expired {abs(days_left)} days ago! Immediate renewal required." if is_overdue else f"Expires in {days_left} days."
        })
    return alerts


# -------------------------------------------------------------
# 6. Joint Venture (JV) Ratio & Sharing Engine
# -------------------------------------------------------------
@router.get("/jv-agreements", response_model=List[JVAgreementResponse])
async def list_jv_agreements(
    land_bank_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(JVAgreement)
        .options(
            selectinload(JVAgreement.unit_allocations),
            selectinload(JVAgreement.milestones)
        )
        .order_by(desc(JVAgreement.id))
    )
    if land_bank_id:
        stmt = stmt.where(JVAgreement.land_bank_id == land_bank_id)
    if status_filter:
        stmt = stmt.where(JVAgreement.status == status_filter)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/jv-agreements", response_model=JVAgreementResponse, status_code=status.HTTP_201_CREATED)
async def create_jv_agreement(
    payload: JVAgreementCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a Joint Venture contractual agreement (e.g., 50:50 or 60:40) with unit allocations and milestones.
    CRITICAL RULE: Landowner allocated units are strictly locked from sales.
    """
    total_share = payload.landowner_share_percent + payload.developer_share_percent
    if abs(total_share - 100.0) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total shares must sum to 100%. Got {total_share}% (Landowner: {payload.landowner_share_percent}%, Developer: {payload.developer_share_percent}%)."
        )

    existing_deed = await db.execute(select(JVAgreement).where(JVAgreement.agreement_deed_no == payload.agreement_deed_no))
    if existing_deed.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agreement Deed No '{payload.agreement_deed_no}' already exists."
        )

    jv = JVAgreement(
        land_bank_id=payload.land_bank_id,
        agreement_deed_no=payload.agreement_deed_no.strip(),
        landowner_share_percent=payload.landowner_share_percent,
        developer_share_percent=payload.developer_share_percent,
        signing_money_total=payload.signing_money_total,
        signing_money_paid=payload.signing_money_paid or 0.0,
        tenure_months=payload.tenure_months,
        poa_deed_number=payload.poa_deed_number,
        poa_execution_date=payload.poa_execution_date,
        poa_expiry_date=payload.poa_expiry_date,
        poa_verified=payload.poa_verified if payload.poa_verified is not None else True,
        status="ACTIVE"
    )
    db.add(jv)
    await db.flush()

    if payload.unit_allocations:
        for unit in payload.unit_allocations:
            alloc_type = unit.allocation_type.strip().upper()
            is_locked = True if alloc_type == "LANDOWNER_UNIT" else False
            
            unit_record = JVUnitAllocation(
                jv_agreement_id=jv.id,
                tower_name=unit.tower_name or "Tower 1",
                floor_number=unit.floor_number or 1,
                unit_number=unit.unit_number or "1A",
                unit_identifier=unit.unit_identifier.strip(),
                unit_type=unit.unit_type or "APARTMENT",
                allocation_type=alloc_type,
                is_locked_for_sales=is_locked,
                gross_sft=unit.gross_sft or 1500.0,
                parking_slot_number=unit.parking_slot_number,
                allocation_notes=unit.allocation_notes
            )
            db.add(unit_record)
        await db.flush()

    if payload.milestones:
        for m in payload.milestones:
            mile = LandJVMilestonePayment(
                jv_agreement_id=jv.id,
                milestone_name=m.milestone_name,
                due_date=m.due_date,
                amount_bdt=m.amount_bdt,
                payment_status=m.payment_status or "PENDING",
                paid_date=m.paid_date,
                voucher_ref=m.voucher_ref,
                notes=m.notes
            )
            db.add(mile)
        await db.flush()

    # Update parcel status to JV_SIGNED
    lb_res = await db.execute(select(LandBank).where(LandBank.id == payload.land_bank_id))
    lb = lb_res.scalar_one_or_none()
    if lb:
        lb.status = "JV_SIGNED"

    await db.commit()

    stmt = (
        select(JVAgreement)
        .options(
            selectinload(JVAgreement.unit_allocations),
            selectinload(JVAgreement.milestones)
        )
        .where(JVAgreement.id == jv.id)
    )
    res = await db.execute(stmt)
    return res.scalar_one()


@router.post("/jv-agreements/auto-allocate", response_model=JVAutoAllocationResponse)
async def auto_allocate_jv_units(
    payload: JVAutoAllocationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Automated Unit Allocation Matrix generator based on agreed JV ratio (e.g., 50:50 or 60:40).
    Partitions residential floors/units evenly or alternately between Landowner and Developer.
    """
    stmt = (
        select(JVAgreement)
        .options(selectinload(JVAgreement.unit_allocations))
        .where(JVAgreement.id == payload.jv_agreement_id)
    )
    res = await db.execute(stmt)
    jv = res.scalar_one_or_none()
    if not jv:
        raise HTTPException(status_code=404, detail="JV Agreement not found.")

    landowner_pct = float(jv.landowner_share_percent) # e.g. 50 or 40
    developer_pct = float(jv.developer_share_percent) # e.g. 50 or 60

    # Clean existing allocations if regenerating
    for old_u in jv.unit_allocations:
        await db.delete(old_u)
    await db.flush()

    total_units = payload.total_floors * payload.units_per_floor
    target_landowner_count = round(total_units * (landowner_pct / 100.0))

    unit_suffixes = ["A", "B", "C", "D", "E", "F"][:payload.units_per_floor]

    generated_allocs = []
    landowner_count = 0
    developer_count = 0
    landowner_sft = 0.0
    developer_sft = 0.0

    unit_idx = 0
    for fl in range(1, payload.total_floors + 1):
        for sfx in unit_suffixes:
            unit_idx += 1
            unit_no = f"{fl}{sfx}"
            identifier = f"Tower 1 - Fl {fl} - Unit {unit_no}"
            
            # Allocation strategy
            if payload.allocation_strategy == "ALTERNATE_FLOORS":
                is_landowner = (fl % 2 == 1) and (landowner_count < target_landowner_count)
            else: # ODD_EVEN_UNITS or balanced
                is_landowner = (unit_idx % 2 == 1) and (landowner_count < target_landowner_count)

            if not is_landowner and (total_units - unit_idx) < (target_landowner_count - landowner_count):
                is_landowner = True

            alloc_type = "LANDOWNER_UNIT" if is_landowner else "DEVELOPER_UNIT"
            is_locked = True if is_landowner else False

            if is_landowner:
                landowner_count += 1
                landowner_sft += payload.unit_gross_sft
            else:
                developer_count += 1
                developer_sft += payload.unit_gross_sft

            parking_slot = f"B1-{unit_idx:02d}"

            alloc = JVUnitAllocation(
                jv_agreement_id=jv.id,
                tower_name="Tower 1",
                floor_number=fl,
                unit_number=unit_no,
                unit_identifier=identifier,
                unit_type="APARTMENT",
                allocation_type=alloc_type,
                is_locked_for_sales=is_locked,
                gross_sft=payload.unit_gross_sft,
                parking_slot_number=parking_slot,
                allocation_notes=f"Auto-allocated according to {landowner_pct}:{developer_pct} JV Ratio"
            )
            db.add(alloc)

    await db.commit()

    stmt_allocs = select(JVUnitAllocation).where(JVUnitAllocation.jv_agreement_id == jv.id).order_by(JVUnitAllocation.id.asc())
    res_allocs = await db.execute(stmt_allocs)
    saved_allocs = res_allocs.scalars().all()

    return JVAutoAllocationResponse(
        jv_agreement_id=jv.id,
        total_units_generated=len(saved_allocs),
        landowner_units_count=landowner_count,
        developer_units_count=developer_count,
        landowner_total_sft=round(landowner_sft, 2),
        developer_total_sft=round(developer_sft, 2),
        allocated_units=[JVUnitAllocationResponse.model_validate(u) for u in saved_allocs]
    )


# -------------------------------------------------------------
# 7. Historical Title Deed Chain Continuity Verification
# -------------------------------------------------------------
@router.get("/deed-chain-verify/{land_bank_id}", response_model=DeedChainVerificationResponse)
async def verify_deed_chain(
    land_bank_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies Bangladesh historical land survey chain continuity:
    CS (Cadastral Survey) -> SA (State Acquisition) -> RS (Revisional Survey) -> BS/City Survey.
    """
    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.survey_records),
            selectinload(LandBank.khatians)
        )
        .where(LandBank.id == land_bank_id)
    )
    res = await db.execute(stmt)
    proposal = res.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Land Bank parcel not found")

    surveys = proposal.survey_records or []
    khatians = proposal.khatians or []
    
    types = {s.survey_type_id.upper() for s in surveys}.union({k.khatian_type.upper() for k in khatians})

    has_cs = "CS" in types
    has_sa = "SA" in types
    has_rs = "RS" in types
    has_bs = ("BS" in types) or ("BS_CITY" in types) or ("CITY" in types)

    total_survey_decimal = sum(float(s.recorded_area_decimal) for s in surveys)
    total_survey_katha = sum(float(s.recorded_area_katha) for s in surveys)
    prop_katha = float(proposal.total_area_katha)

    area_variance = 0.0
    if prop_katha > 0 and total_survey_katha > 0:
        area_variance = round(abs(total_survey_katha - prop_katha) / prop_katha * 100, 2)

    if has_rs and (has_cs or has_sa):
        verification_status = "VERIFIED"
        remarks = "Complete unbroken historical title chain (CS/SA to RS/BS) verified. Safe for Joint Venture."
    elif has_rs or has_bs:
        verification_status = "PARTIAL"
        remarks = "Modern survey (RS/BS) recorded, but historic parent survey (CS/SA) missing from title deed chain."
    else:
        verification_status = "MISSING_HISTORIC_LINK"
        remarks = "Critical missing survey records. Detailed AC Land & Sub-Registry search required."

    return DeedChainVerificationResponse(
        land_bank_id=proposal.id,
        project_code=proposal.project_code,
        proposal_title=proposal.proposal_title,
        mouza_name=proposal.mouza_name,
        jl_number=proposal.jl_number,
        has_cs=has_cs,
        has_sa=has_sa,
        has_rs=has_rs,
        has_bs=has_bs,
        survey_sequence_verified=(has_cs and has_sa and has_rs),
        total_survey_area_decimal=round(total_survey_decimal, 4),
        total_survey_area_katha=round(total_survey_katha, 4),
        total_land_bank_area_katha=prop_katha,
        area_variance_percentage=area_variance,
        surveys=[SurveyRecordResponse.model_validate(s) for s in surveys],
        landowners=[LandownerResponse.model_validate(lo) for lo in (proposal.landowners or [])],
        verification_status=verification_status,
        remarks=remarks
    )
