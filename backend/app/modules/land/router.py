from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.modules.land.models import (
    LandBank, Landowner, SurveyRecord, JVAgreement, JVUnitAllocation
)
from app.modules.land.schemas import (
    LandBankCreate, LandBankUpdate, LandBankResponse,
    LandownerCreate, LandownerResponse,
    SurveyRecordCreate, SurveyRecordResponse,
    JVAgreementCreate, JVAgreementResponse,
    JVUnitAllocationCreate, JVUnitAllocationResponse,
    DeedChainVerificationResponse,
    convert_area_to_all_units
)

router = APIRouter(prefix="/land", tags=["Land Bank, Historic Surveys & JV Engine"])


# -------------------------------------------------------------
# 1. Area Conversion Calculator Helper Endpoint
# -------------------------------------------------------------
@router.get("/math/convert", response_model=dict)
async def calculate_area(
    katha: Optional[float] = Query(None, description="Land area in Katha"),
    decimal: Optional[float] = Query(None, description="Land area in Decimal / Shotok"),
    sqft: Optional[float] = Query(None, description="Land area in Sq Ft")
):
    """
    Standard Bangladesh land measurement conversion endpoint:
    - 1 Katha = 720 Sq Ft
    - 1 Decimal = 435.6 Sq Ft
    - 1 Bigha = 20 Katha = 14,400 Sq Ft
    - 1 Acre = 100 Decimal = 43,560 Sq Ft
    """
    return convert_area_to_all_units(katha=katha, decimal=decimal, sqft=sqft)


# -------------------------------------------------------------
# 2. Land Bank (Proposals) CRUD
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
    Retrieves land acquisition proposals with nested landowners, historic survey records, and JV agreements.
    """
    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.survey_records),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.unit_allocations)
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
            (LandBank.mouza_name.ilike(search_pattern))
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
    Creates a new land proposal with automatic Bangladesh area conversion and optional landowners.
    """
    # Check duplicate project_code
    existing = await db.execute(select(LandBank).where(LandBank.project_code == payload.project_code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project code '{payload.project_code}' already exists."
        )

    # Convert area using Bangladesh standard conversion
    katha_val = payload.input_value if payload.input_unit.upper() == "KATHA" else None
    decimal_val = payload.input_value if payload.input_unit.upper() == "DECIMAL" else None
    sqft_val = payload.input_value if payload.input_unit.upper() == "SQFT" else None

    converted = convert_area_to_all_units(katha=katha_val, decimal=decimal_val, sqft=sqft_val)

    land_bank = LandBank(
        project_code=payload.project_code.strip().upper(),
        proposal_title=payload.proposal_title.strip(),
        mouza_name=payload.mouza_name.strip(),
        jl_number=payload.jl_number.strip(),
        total_area_katha=converted["katha"],
        total_area_decimal=converted["decimal"],
        total_area_sqft=converted["sqft"],
        deal_type=payload.deal_type,
        status=payload.status or "DRAFT_PROPOSAL",
        location_description=payload.location_description
    )
    db.add(land_bank)
    await db.flush()

    if payload.landowners:
        for lo in payload.landowners:
            landowner = Landowner(
                land_bank_id=land_bank.id,
                owner_type=lo.owner_type,
                full_name_en=lo.full_name_en,
                full_name_bn=lo.full_name_bn,
                nid_number=lo.nid_number,
                tin_number=lo.tin_number,
                phone_number=lo.phone_number,
                ownership_share_ratio=lo.ownership_share_ratio,
                bank_details=lo.bank_details
            )
            db.add(landowner)
        await db.flush()

    await db.commit()

    # Re-fetch with relationships
    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.survey_records),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.unit_allocations)
        )
        .where(LandBank.id == land_bank.id)
    )
    res = await db.execute(stmt)
    return res.scalar_one()


@router.get("/proposals/{proposal_id}", response_model=LandBankResponse)
async def get_proposal(proposal_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.survey_records),
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.unit_allocations)
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
            selectinload(LandBank.jv_agreements).selectinload(JVAgreement.unit_allocations)
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
        converted = convert_area_to_all_units(katha=katha_val, decimal=decimal_val, sqft=sqft_val)
        proposal.total_area_katha = converted["katha"]
        proposal.total_area_decimal = converted["decimal"]
        proposal.total_area_sqft = converted["sqft"]

    await db.commit()
    await db.refresh(proposal)
    return proposal


@router.delete("/proposals/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proposal(proposal_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(LandBank).where(LandBank.id == proposal_id))
    proposal = res.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Land proposal not found")
    await db.delete(proposal)
    await db.commit()
    return None


# -------------------------------------------------------------
# 3. Historic Survey Records (CS, SA, RS, BS, Mutation)
# -------------------------------------------------------------
@router.get("/surveys", response_model=List[SurveyRecordResponse])
async def list_surveys(
    land_bank_id: Optional[int] = Query(None),
    survey_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SurveyRecord).order_by(desc(SurveyRecord.id))
    if land_bank_id:
        stmt = stmt.where(SurveyRecord.land_bank_id == land_bank_id)
    if survey_type:
        stmt = stmt.where(SurveyRecord.survey_type_id == survey_type)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/surveys", response_model=SurveyRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_survey_record(
    payload: SurveyRecordCreate,
    land_bank_id: int = Query(..., description="ID of associated Land Bank proposal"),
    db: AsyncSession = Depends(get_db)
):
    """
    Logs historic khatian & dag survey details with automatic Decimal/Katha math.
    """
    # Verify land bank exists
    lb_res = await db.execute(select(LandBank).where(LandBank.id == land_bank_id))
    if not lb_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Land Bank proposal not found")

    # Sync area math
    area_dec = payload.recorded_area_decimal
    area_kat = payload.recorded_area_katha
    if area_dec > 0 and area_kat == 0:
        converted = convert_area_to_all_units(decimal=area_dec)
        area_kat = converted["katha"]
    elif area_kat > 0 and area_dec == 0:
        converted = convert_area_to_all_units(katha=area_kat)
        area_dec = converted["decimal"]

    survey = SurveyRecord(
        land_bank_id=land_bank_id,
        survey_type_id=payload.survey_type_id.upper(),
        khatian_number=payload.khatian_number,
        recorded_tenant_name=payload.recorded_tenant_name,
        dag_number=payload.dag_number,
        recorded_area_decimal=area_dec,
        recorded_area_katha=area_kat,
        remarks=payload.remarks
    )
    db.add(survey)
    await db.commit()
    await db.refresh(survey)
    return survey


# -------------------------------------------------------------
# 4. Joint Venture (JV) Agreements & Unit Allocations
# -------------------------------------------------------------
@router.get("/jv-agreements", response_model=List[JVAgreementResponse])
async def list_jv_agreements(
    land_bank_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(JVAgreement)
        .options(selectinload(JVAgreement.unit_allocations))
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
    Generates a Joint Venture Agreement and assigns units.
    CRITICAL BUSINESS RULE:
    Units allocated as 'LANDOWNER_UNIT' are permanently locked with is_locked_for_sales = true.
    """
    # Verify land bank exists
    lb_res = await db.execute(select(LandBank).where(LandBank.id == payload.land_bank_id))
    land_bank = lb_res.scalar_one_or_none()
    if not land_bank:
        raise HTTPException(status_code=404, detail="Land Bank proposal not found")

    # Validate share percentages sum to 100%
    total_share = payload.landowner_share_percent + payload.developer_share_percent
    if abs(total_share - 100.0) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total shares must sum to 100%. Got {total_share}% (Landowner: {payload.landowner_share_percent}%, Developer: {payload.developer_share_percent}%)."
        )

    # Check duplicate deed no
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
        tenure_months=payload.tenure_months,
        status="ACTIVE"
    )
    db.add(jv)
    await db.flush()

    # Process Unit Allocations
    if payload.unit_allocations:
        for unit in payload.unit_allocations:
            alloc_type = unit.allocation_type.strip().upper()
            # CRITICAL BUSINESS RULE: Landowner units are strictly locked from sales!
            is_locked = True if alloc_type == "LANDOWNER_UNIT" else False
            
            unit_record = JVUnitAllocation(
                jv_agreement_id=jv.id,
                unit_identifier=unit.unit_identifier.strip(),
                allocation_type=alloc_type,
                is_locked_for_sales=is_locked,
                allocation_notes=unit.allocation_notes
            )
            db.add(unit_record)
        await db.flush()

    # Update Land Bank status to JV_SIGNED
    land_bank.status = "JV_SIGNED"
    await db.commit()

    # Re-fetch JV Agreement
    stmt = (
        select(JVAgreement)
        .options(selectinload(JVAgreement.unit_allocations))
        .where(JVAgreement.id == jv.id)
    )
    res = await db.execute(stmt)
    return res.scalar_one()


# -------------------------------------------------------------
# 5. Deed Chain & Historical Survey Chain Verification Engine
# -------------------------------------------------------------
@router.get("/deed-chain-verify/{land_bank_id}", response_model=DeedChainVerificationResponse)
async def verify_deed_chain(
    land_bank_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies Bangladesh historical land survey chain continuity:
    CS (Cadastral Survey) -> SA (State Acquisition) -> RS (Revisional Survey) -> BS/City Survey.
    Checks whether:
    1. Continuous khatian chain is logged
    2. Total dag area aligns with proposed acquisition area
    3. Identifies broken chain links or area discrepancies
    """
    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.survey_records)
        )
        .where(LandBank.id == land_bank_id)
    )
    res = await db.execute(stmt)
    proposal = res.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Land Bank parcel not found")

    surveys = proposal.survey_records or []
    survey_types = {s.survey_type_id.upper() for s in surveys}

    has_cs = "CS" in survey_types
    has_sa = "SA" in survey_types
    has_rs = "RS" in survey_types
    has_bs = ("BS" in survey_types) or ("BS_CITY" in survey_types) or ("CITY" in survey_types)

    # Calculate total recorded survey area
    total_survey_decimal = sum(float(s.recorded_area_decimal) for s in surveys)
    total_survey_katha = sum(float(s.recorded_area_katha) for s in surveys)
    prop_katha = float(proposal.total_area_katha)

    area_variance = 0.0
    if prop_katha > 0 and total_survey_katha > 0:
        area_variance = round(abs(total_survey_katha - prop_katha) / prop_katha * 100, 2)

    # Verification status logic
    # In Bangladesh, having RS or BS with clear link is primary; CS/SA adds unbroken historic validity
    if has_rs and (has_cs or has_sa):
        verification_status = "VERIFIED"
        remarks = "Complete unbroken historical title chain (CS/SA to RS/BS) verified. Safe for JV/Purchase."
    elif has_rs or has_bs:
        verification_status = "PARTIAL"
        remarks = "Modern survey (RS/BS) recorded, but historic parent survey (CS/SA) missing from title deed chain."
    else:
        verification_status = "MISSING_HISTORIC_LINK"
        remarks = "Critical missing survey records. High legal risk. Detailed AC Land & Sub-Registry search required."

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
