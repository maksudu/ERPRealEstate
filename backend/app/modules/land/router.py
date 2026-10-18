from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.core.database import get_db
from app.modules.land.models import (
    LandBank, Landowner, SurveyRecord, JVAgreement, JVUnitAllocation,
    LandKhatian, LandDag, LandDeedDocument, LandJVMilestonePayment,
    LandParcel, LandownerParcelLink
)
from app.modules.land.schemas import (
    LandBankCreate, LandBankUpdate, LandBankResponse,
    LandownerCreate, LandownerUpdate, LandownerResponse,
    LandownerDuplicateCheckRequest, LandownerDuplicateCheckResponse,
    LandownerNegotiationNoteCreate,
    LandParcelCreate, LandParcelUpdate, LandParcelResponse,
    LandownerParcelLinkCreate, LandownerParcelLinkResponse,
    LandFeasibilityReportResponse, LandProposalComparisonItem,
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
# 2. Landowner and Seller Management (2.1)
# -------------------------------------------------------------
@router.get("/landowners", response_model=List[LandownerResponse])
async def list_landowners(
    owner_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves centralized register of landowners, sellers, co-owners, and authorized representatives.
    """
    stmt = (
        select(Landowner)
        .options(selectinload(Landowner.parcel_links))
        .order_by(desc(Landowner.id))
    )

    if owner_type:
        stmt = stmt.where(Landowner.owner_type == owner_type)
    if status:
        stmt = stmt.where(Landowner.status == status)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Landowner.landowner_code.ilike(search_pattern),
                Landowner.full_name_en.ilike(search_pattern),
                Landowner.full_name_bn.ilike(search_pattern),
                Landowner.nid_number.ilike(search_pattern),
                Landowner.phone_number.ilike(search_pattern),
                Landowner.tin_number.ilike(search_pattern),
                Landowner.email.ilike(search_pattern)
            )
        )

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()

    result = []
    for r in records:
        resp = LandownerResponse.model_validate(r)
        resp.linked_parcels_count = len(r.parcel_links or [])
        result.append(resp)
    return result


@router.post("/landowners", response_model=LandownerResponse, status_code=status.HTTP_201_CREATED)
async def create_landowner(
    payload: LandownerCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new landowner with auto-generated Landowner ID (e.g. LND-OWN-0005) and duplicate validation.
    """
    # Check duplicate NID or Phone if provided
    if payload.nid_number:
        nid_exist = await db.execute(select(Landowner).where(Landowner.nid_number == payload.nid_number.strip()))
        if nid_exist.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Landowner with NID '{payload.nid_number}' already registered in the system."
            )
    
    if payload.phone_number:
        phone_exist = await db.execute(select(Landowner).where(Landowner.phone_number == payload.phone_number.strip()))
        if phone_exist.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Landowner with Phone Number '{payload.phone_number}' already registered."
            )

    # Auto generate landowner_code if not supplied
    code = payload.landowner_code
    if not code:
        max_id_res = await db.execute(select(func.max(Landowner.id)))
        max_id = max_id_res.scalar() or 0
        code = f"LND-OWN-{(max_id + 1):04d}"

    landowner = Landowner(
        landowner_code=code,
        land_bank_id=payload.land_bank_id,
        owner_type=payload.owner_type,
        full_name_en=payload.full_name_en.strip(),
        full_name_bn=payload.full_name_bn.strip() if payload.full_name_bn else None,
        father_mother_spouse_name=payload.father_mother_spouse_name,
        present_address=payload.present_address,
        permanent_address=payload.permanent_address,
        nid_number=payload.nid_number.strip() if payload.nid_number else None,
        passport_number=payload.passport_number.strip() if payload.passport_number else None,
        company_reg_number=payload.company_reg_number.strip() if payload.company_reg_number else None,
        tin_number=payload.tin_number.strip() if payload.tin_number else None,
        phone_number=payload.phone_number.strip() if payload.phone_number else None,
        email=payload.email.strip() if payload.email else None,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        ownership_share_ratio=payload.ownership_share_ratio,
        ownership_nature=payload.ownership_nature,
        bank_name=payload.bank_name,
        bank_branch=payload.bank_branch,
        bank_account_no=payload.bank_account_no,
        bank_routing_no=payload.bank_routing_no,
        bank_account_holder=payload.bank_account_holder,
        bank_details=payload.bank_details,
        nominee_details=payload.nominee_details,
        poa_details=payload.poa_details,
        supporting_documents=payload.supporting_documents,
        negotiation_notes=payload.negotiation_notes or [],
        status=payload.status or "ACTIVE"
    )

    db.add(landowner)
    await db.commit()
    await db.refresh(landowner)

    resp = LandownerResponse.model_validate(landowner)
    resp.linked_parcels_count = 0
    return resp


@router.post("/landowners/check-duplicate", response_model=LandownerDuplicateCheckResponse)
async def check_landowner_duplicate(
    payload: LandownerDuplicateCheckRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Detects potential duplicate owners using configurable identity checks (NID, phone, TIN, company registration).
    """
    conditions = []
    if payload.nid_number and payload.nid_number.strip():
        conditions.append(Landowner.nid_number == payload.nid_number.strip())
    if payload.phone_number and payload.phone_number.strip():
        conditions.append(Landowner.phone_number == payload.phone_number.strip())
    if payload.tin_number and payload.tin_number.strip():
        conditions.append(Landowner.tin_number == payload.tin_number.strip())
    if payload.company_reg_number and payload.company_reg_number.strip():
        conditions.append(Landowner.company_reg_number == payload.company_reg_number.strip())

    if not conditions:
        return LandownerDuplicateCheckResponse(has_duplicate=False, matches=[])

    stmt = select(Landowner).where(or_(*conditions))
    if payload.exclude_id:
        stmt = stmt.where(Landowner.id != payload.exclude_id)

    res = await db.execute(stmt)
    matches = res.scalars().all()

    if matches:
        matched_fields = []
        first = matches[0]
        if payload.nid_number and first.nid_number == payload.nid_number.strip():
            matched_fields.append("NID")
        if payload.phone_number and first.phone_number == payload.phone_number.strip():
            matched_fields.append("Phone")
        if payload.tin_number and first.tin_number == payload.tin_number.strip():
            matched_fields.append("TIN")
        if payload.company_reg_number and first.company_reg_number == payload.company_reg_number.strip():
            matched_fields.append("Company Registration")

        return LandownerDuplicateCheckResponse(
            has_duplicate=True,
            matched_by=", ".join(matched_fields) if matched_fields else "Identity check",
            matches=[LandownerResponse.model_validate(m) for m in matches]
        )

    return LandownerDuplicateCheckResponse(has_duplicate=False, matches=[])


@router.get("/landowners/{landowner_id}", response_model=LandownerResponse)
async def get_landowner(landowner_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Landowner)
        .options(selectinload(Landowner.parcel_links).selectinload(LandownerParcelLink.parcel))
        .where(Landowner.id == landowner_id)
    )
    res = await db.execute(stmt)
    landowner = res.scalar_one_or_none()
    if not landowner:
        raise HTTPException(status_code=404, detail="Landowner not found")

    resp = LandownerResponse.model_validate(landowner)
    resp.linked_parcels_count = len(landowner.parcel_links or [])
    return resp


@router.put("/landowners/{landowner_id}", response_model=LandownerResponse)
async def update_landowner(
    landowner_id: int,
    payload: LandownerUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Landowner)
        .options(selectinload(Landowner.parcel_links))
        .where(Landowner.id == landowner_id)
    )
    res = await db.execute(stmt)
    landowner = res.scalar_one_or_none()
    if not landowner:
        raise HTTPException(status_code=404, detail="Landowner not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(landowner, field, val)

    await db.commit()
    await db.refresh(landowner)

    resp = LandownerResponse.model_validate(landowner)
    resp.linked_parcels_count = len(landowner.parcel_links or [])
    return resp


@router.delete("/landowners/{landowner_id}", status_code=status.HTTP_200_OK)
async def delete_landowner(landowner_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Landowner).where(Landowner.id == landowner_id)
    res = await db.execute(stmt)
    landowner = res.scalar_one_or_none()
    if not landowner:
        raise HTTPException(status_code=404, detail="Landowner not found")

    # Soft delete / set to ARCHIVED
    landowner.status = "ARCHIVED"
    await db.commit()
    return {"message": f"Landowner {landowner.landowner_code} has been successfully archived."}


@router.post("/landowners/{landowner_id}/negotiation-notes", response_model=LandownerResponse)
async def add_negotiation_note(
    landowner_id: int,
    payload: LandownerNegotiationNoteCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Appends communication, meeting notes, or negotiation history entry to landowner profile.
    """
    stmt = select(Landowner).where(Landowner.id == landowner_id)
    res = await db.execute(stmt)
    landowner = res.scalar_one_or_none()
    if not landowner:
        raise HTTPException(status_code=404, detail="Landowner not found")

    notes = landowner.negotiation_notes or []
    new_entry = {
        "timestamp": datetime.now().isoformat(),
        "date": str(payload.interaction_date or date.today()),
        "interaction_type": payload.interaction_type,
        "note": payload.note,
        "conducted_by": payload.conducted_by
    }
    # Create new list reference so SQLAlchemy picks up change
    landowner.negotiation_notes = notes + [new_entry]

    await db.commit()
    await db.refresh(landowner)
    return LandownerResponse.model_validate(landowner)


# -------------------------------------------------------------
# 3. Land Parcel and Location Registry (2.3)
# -------------------------------------------------------------
@router.get("/parcels", response_model=List[LandParcelResponse])
async def list_parcels(
    status_filter: Optional[str] = Query(None, alias="status"),
    mouza_filter: Optional[str] = Query(None, alias="mouza"),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves centralized registry of all distinct land parcels with boundaries, GPS, and area metrics.
    """
    stmt = (
        select(LandParcel)
        .options(selectinload(LandParcel.owner_links))
        .order_by(desc(LandParcel.id))
    )

    if status_filter:
        stmt = stmt.where(LandParcel.acquisition_status == status_filter)
    if mouza_filter:
        stmt = stmt.where(LandParcel.mouza_name == mouza_filter)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                LandParcel.parcel_id.ilike(search_pattern),
                LandParcel.project_name.ilike(search_pattern),
                LandParcel.mouza_name.ilike(search_pattern),
                LandParcel.khatian_number.ilike(search_pattern),
                LandParcel.dag_number.ilike(search_pattern),
                LandParcel.deed_number.ilike(search_pattern)
            )
        )

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()

    result = []
    for r in records:
        resp = LandParcelResponse.model_validate(r)
        resp.linked_owners_count = len(r.owner_links or [])
        result.append(resp)
    return result


@router.post("/parcels", response_model=LandParcelResponse, status_code=status.HTTP_201_CREATED)
async def create_parcel(
    payload: LandParcelCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new land parcel with auto-generated Parcel ID (e.g. LND-000128) and converted area units.
    """
    code = payload.parcel_id
    if not code:
        max_id_res = await db.execute(select(func.max(LandParcel.id)))
        max_id = max_id_res.scalar() or 0
        code = f"LND-{(max_id + 125):06d}"

    # Verify uniqueness
    exist_check = await db.execute(select(LandParcel).where(LandParcel.parcel_id == code))
    if exist_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Parcel ID '{code}' already exists.")

    # Calculate areas if input_value provided
    dec_val = payload.total_area_decimal
    katha_val = payload.total_area_katha
    sqft_val = payload.total_area_sqft
    bigha_val = payload.total_area_bigha

    if payload.input_value and payload.input_value > 0:
        unit = (payload.input_unit or "DECIMAL").upper()
        converted = convert_area_to_all_units(
            decimal=payload.input_value if unit == "DECIMAL" else None,
            katha=payload.input_value if unit == "KATHA" else None,
            sqft=payload.input_value if unit == "SQFT" else None,
            bigha=payload.input_value if unit == "BIGHA" else None
        )
        dec_val = converted["decimal"]
        katha_val = converted["katha"]
        sqft_val = converted["sqft"]
        bigha_val = converted["bigha"]
    elif dec_val > 0 and (not katha_val or katha_val == 0):
        converted = convert_area_to_all_units(decimal=dec_val)
        katha_val = converted["katha"]
        sqft_val = converted["sqft"]
        bigha_val = converted["bigha"]

    parcel = LandParcel(
        parcel_id=code,
        land_bank_id=payload.land_bank_id,
        project_id=payload.project_id,
        project_name=payload.project_name.strip(),
        division=payload.division or "Dhaka Division",
        district=payload.district or "Dhaka",
        upazila_thana=payload.upazila_thana or "Gulshan",
        mouza_name=payload.mouza_name.strip(),
        jl_number=payload.jl_number.strip(),
        khatian_number=payload.khatian_number.strip(),
        dag_number=payload.dag_number.strip(),
        land_classification=payload.land_classification or "RESIDENTIAL",
        total_area_decimal=dec_val,
        total_area_katha=katha_val,
        total_area_bigha=bigha_val,
        total_area_sqft=sqft_val,
        acquisition_status=payload.acquisition_status or "PROPOSED",
        gps_latitude=payload.gps_latitude,
        gps_longitude=payload.gps_longitude,
        boundary_north=payload.boundary_north,
        boundary_south=payload.boundary_south,
        boundary_east=payload.boundary_east,
        boundary_west=payload.boundary_west,
        road_access_width_ft=payload.road_access_width_ft or 40.0,
        deed_number=payload.deed_number,
        deed_date=payload.deed_date,
        source_record_info=payload.source_record_info,
        gis_polygon_data=payload.gis_polygon_data,
        remarks=payload.remarks
    )

    db.add(parcel)
    await db.commit()
    await db.refresh(parcel)

    resp = LandParcelResponse.model_validate(parcel)
    resp.linked_owners_count = 0
    return resp


@router.get("/parcels/{parcel_id}", response_model=LandParcelResponse)
async def get_parcel(parcel_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(LandParcel)
        .options(selectinload(LandParcel.owner_links).selectinload(LandownerParcelLink.landowner))
        .where(LandParcel.id == parcel_id)
    )
    res = await db.execute(stmt)
    parcel = res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    resp = LandParcelResponse.model_validate(parcel)
    resp.linked_owners_count = len(parcel.owner_links or [])
    return resp


@router.put("/parcels/{parcel_id}", response_model=LandParcelResponse)
async def update_parcel(
    parcel_id: int,
    payload: LandParcelUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LandParcel).where(LandParcel.id == parcel_id)
    res = await db.execute(stmt)
    parcel = res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(parcel, field, val)

    await db.commit()
    await db.refresh(parcel)

    resp = LandParcelResponse.model_validate(parcel)
    return resp


@router.delete("/parcels/{parcel_id}", status_code=status.HTTP_200_OK)
async def delete_parcel(parcel_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(LandParcel).where(LandParcel.id == parcel_id)
    res = await db.execute(stmt)
    parcel = res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    await db.delete(parcel)
    await db.commit()
    return {"message": f"Land parcel {parcel.parcel_id} deleted successfully"}


@router.get("/parcels/{parcel_id}/owners", response_model=List[LandownerParcelLinkResponse])
async def get_parcel_owners(parcel_id: int, db: AsyncSession = Depends(get_db)):
    """
    Returns all landowners associated with this parcel and their ownership share percentages.
    """
    stmt = (
        select(LandownerParcelLink)
        .options(
            selectinload(LandownerParcelLink.landowner),
            selectinload(LandownerParcelLink.parcel)
        )
        .where(LandownerParcelLink.parcel_id == parcel_id)
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/parcels/{parcel_id}/owners", response_model=LandownerParcelLinkResponse, status_code=status.HTTP_201_CREATED)
async def link_owner_to_parcel(
    parcel_id: int,
    payload: LandownerParcelLinkCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Associates an owner with a parcel with fractional share percentage (e.g. 50%).
    """
    # Check if link already exists
    existing = await db.execute(
        select(LandownerParcelLink).where(
            LandownerParcelLink.parcel_id == parcel_id,
            LandownerParcelLink.landowner_id == payload.landowner_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Owner is already linked to this parcel.")

    link = LandownerParcelLink(
        parcel_id=parcel_id,
        landowner_id=payload.landowner_id,
        ownership_share_percent=payload.ownership_share_percent,
        title_deed_no=payload.title_deed_no,
        status=payload.status or "ACTIVE"
    )
    db.add(link)
    await db.commit()

    stmt = (
        select(LandownerParcelLink)
        .options(
            selectinload(LandownerParcelLink.landowner),
            selectinload(LandownerParcelLink.parcel)
        )
        .where(LandownerParcelLink.id == link.id)
    )
    res = await db.execute(stmt)
    return res.scalar_one()


@router.delete("/parcels/{parcel_id}/owners/{link_id}", status_code=status.HTTP_200_OK)
async def unlink_owner_from_parcel(
    parcel_id: int,
    link_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LandownerParcelLink).where(
        LandownerParcelLink.id == link_id,
        LandownerParcelLink.parcel_id == parcel_id
    )
    res = await db.execute(stmt)
    link = res.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Parcel ownership link not found")

    await db.delete(link)
    await db.commit()
    return {"message": "Owner unlinked from parcel successfully"}


# -------------------------------------------------------------
# 4. Land Search and Acquisition Proposals (2.2)
# -------------------------------------------------------------
@router.get("/proposals/compare", response_model=List[LandProposalComparisonItem])
async def compare_proposals(db: AsyncSession = Depends(get_db)):
    """
    Returns comparative evaluation matrix of all active land proposals.
    """
    stmt = select(LandBank).order_by(desc(LandBank.id))
    res = await db.execute(stmt)
    proposals = res.scalars().all()

    items = []
    for p in proposals:
        items.append(
            LandProposalComparisonItem(
                id=p.id,
                project_code=p.project_code,
                proposal_title=p.proposal_title,
                location=f"{p.upazila_thana}, {p.district}",
                mouza_name=f"{p.mouza_name} (JL {p.jl_number})",
                source=p.opportunity_source or "BROKER",
                area_katha=float(p.total_area_katha),
                road_width_ft=float(p.road_access_width_ft or 40.0),
                proposed_type=p.proposed_development_type or "RESIDENTIAL",
                far_potential=float(p.far_potential or 4.5),
                max_floors=int(p.max_allowable_floors or 14),
                builtup_sqft=float(p.estimated_builtup_sqft or 0.0),
                total_cost=float(p.indicative_cost_total or 0.0),
                cost_per_katha=float(p.indicative_cost_per_katha or 0.0),
                workflow_stage=p.workflow_stage or "IDENTIFIED",
                status=p.status
            )
        )
    return items


@router.get("/proposals/{proposal_id}/feasibility-report", response_model=LandFeasibilityReportResponse)
async def generate_feasibility_report(proposal_id: int, db: AsyncSession = Depends(get_db)):
    """
    Generates an automated acquisition feasibility report and preliminary valuation for a land proposal.
    """
    stmt = select(LandBank).where(LandBank.id == proposal_id)
    res = await db.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Land proposal not found")

    sqft = float(p.total_area_sqft)
    katha = float(p.total_area_katha)
    far = float(p.far_potential or 4.5)
    coverage = float(p.ground_coverage_percent or 50.0)

    builtup_sqft = float(p.estimated_builtup_sqft) if p.estimated_builtup_sqft else (sqft * far)
    footprint = sqft * (coverage / 100.0)
    acq_cost = float(p.indicative_cost_total) if p.indicative_cost_total else (katha * 15000000.0)
    cost_per_katha = acq_cost / katha if katha > 0 else 0.0

    # Valuation estimates (Standard Dhaka high-rise estimates: 4,000 BDT/sqft construction, 9,500 BDT/sqft sale)
    const_cost_sqft = 4200.0
    sale_rate_sqft = 10500.0
    est_const_cost = builtup_sqft * const_cost_sqft
    projected_rev = (builtup_sqft * 0.75) * sale_rate_sqft # 75% sellable efficiency
    gross_profit = projected_rev - (acq_cost + est_const_cost)
    gross_margin = (gross_profit / projected_rev * 100.0) if projected_rev > 0 else 0.0

    recommendation = (
        "Strong Feasibility: Highly recommended for Management Approval & Legal Due Diligence."
        if gross_margin >= 25.0 and float(p.road_access_width_ft) >= 40.0
        else "Moderate Feasibility: Recommended with strict price negotiations on landowner share."
    )

    return LandFeasibilityReportResponse(
        proposal_id=p.id,
        project_code=p.project_code,
        proposal_title=p.proposal_title,
        location=f"{p.upazila_thana}, {p.district}",
        mouza_info=f"Mouza: {p.mouza_name}, JL No: {p.jl_number}",
        plot_size_katha=katha,
        plot_size_decimal=float(p.total_area_decimal),
        plot_size_sqft=sqft,
        road_width_ft=float(p.road_access_width_ft or 40.0),
        far=far,
        allowable_floors=int(p.max_allowable_floors or 14),
        ground_coverage_percent=coverage,
        total_builtup_sqft=round(builtup_sqft, 2),
        ground_footprint_sqft=round(footprint, 2),
        indicative_acquisition_cost=round(acq_cost, 2),
        cost_per_katha=round(cost_per_katha, 2),
        estimated_construction_cost=round(est_const_cost, 2),
        projected_revenue=round(projected_rev, 2),
        estimated_gross_profit=round(gross_profit, 2),
        gross_margin_percent=round(gross_margin, 2),
        workflow_stage=p.workflow_stage or "IDENTIFIED",
        recommendation=recommendation,
        key_risks=[
            "Sub-surface soil strata require deep piling (>35m)",
            "Road widening alignment under RAJUK DAP may affect frontage setback",
            "Multiple legal heirs require unified registered Power of Attorney"
        ],
        opportunities=[
            "Corner plot advantage with potential dual vehicular ingress/egress",
            "Proximity to 100ft road yields higher FAR bonus under DAP rules",
            "High commercial frontage absorption rate"
        ]
    )


@router.patch("/proposals/{proposal_id}/workflow-stage", response_model=LandBankResponse)
async def advance_workflow_stage(
    proposal_id: int,
    workflow_stage: str = Query(..., description="IDENTIFIED, SCREENING_INSPECTION, FEASIBILITY_VALUATION, MANAGEMENT_APPROVAL, DUE_DILIGENCE_NEGOTIATION, ACQUIRED, REJECTED"),
    db: AsyncSession = Depends(get_db)
):
    """
    Transitions proposal across 5-stage acquisition workflow:
    1. Opportunity Identified -> 2. Screening & Site Inspection -> 3. Feasibility & Preliminary Valuation -> 4. Management Approval -> 5. Due Diligence & Negotiation
    """
    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.parcels),
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

    proposal.workflow_stage = workflow_stage
    if workflow_stage == "ACQUIRED":
        proposal.status = "ACQUIRED"
    elif workflow_stage == "REJECTED":
        proposal.status = "REJECTED"

    await db.commit()
    await db.refresh(proposal)
    return proposal


@router.get("/proposals", response_model=List[LandBankResponse])
async def list_proposals(
    status_filter: Optional[str] = Query(None, alias="status"),
    workflow_stage_filter: Optional[str] = Query(None, alias="workflow_stage"),
    deal_type_filter: Optional[str] = Query(None, alias="deal_type"),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves land acquisition proposals with nested landowners, khatians, dags, documents, parcels, and JV agreements.
    """
    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.parcels),
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
    if workflow_stage_filter:
        stmt = stmt.where(LandBank.workflow_stage == workflow_stage_filter)
    if deal_type_filter:
        stmt = stmt.where(LandBank.deal_type == deal_type_filter)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                LandBank.project_code.ilike(search_pattern),
                LandBank.proposal_title.ilike(search_pattern),
                LandBank.mouza_name.ilike(search_pattern),
                LandBank.upazila_thana.ilike(search_pattern)
            )
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
    Creates a new land proposal with automatic multi-unit area conversion, construction potential estimation, and optional landowners.
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

    sqft_total = converted["sqft"]
    katha_total = converted["katha"]
    far = payload.far_potential or 4.50
    builtup_calc = sqft_total * far
    total_cost = payload.indicative_cost_total or 0.0
    cost_per_katha = (total_cost / katha_total) if (katha_total and katha_total > 0 and total_cost > 0) else 0.0

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
        opportunity_source=payload.opportunity_source or "BROKER",
        source_contact_details=payload.source_contact_details,
        road_access_width_ft=payload.road_access_width_ft or 40.0,
        surrounding_development=payload.surrounding_development,
        proposed_development_type=payload.proposed_development_type or "RESIDENTIAL",
        far_potential=far,
        max_allowable_floors=payload.max_allowable_floors or 14,
        ground_coverage_percent=payload.ground_coverage_percent or 50.00,
        estimated_builtup_sqft=round(builtup_calc, 2),
        indicative_cost_total=round(total_cost, 2),
        indicative_cost_per_katha=round(cost_per_katha, 2),
        status=payload.status.upper() if payload.status else "DRAFT_PROPOSAL",
        workflow_stage=payload.workflow_stage or "IDENTIFIED",
        location_description=payload.location_description,
        preliminary_valuation_notes=payload.preliminary_valuation_notes
    )

    db.add(proposal)
    await db.flush()

    if payload.landowners:
        for idx, lo_data in enumerate(payload.landowners):
            lo_code = f"LND-OWN-{(proposal.id * 10 + idx + 1):04d}"
            lo = Landowner(
                landowner_code=lo_code,
                land_bank_id=proposal.id,
                owner_type=lo_data.owner_type,
                full_name_en=lo_data.full_name_en,
                full_name_bn=lo_data.full_name_bn,
                nid_number=lo_data.nid_number,
                tin_number=lo_data.tin_number,
                phone_number=lo_data.phone_number,
                ownership_share_ratio=lo_data.ownership_share_ratio,
                bank_details=lo_data.bank_details,
                status="ACTIVE"
            )
            db.add(lo)
        await db.flush()

    await db.commit()

    stmt = (
        select(LandBank)
        .options(
            selectinload(LandBank.landowners),
            selectinload(LandBank.parcels),
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
            selectinload(LandBank.parcels),
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
            selectinload(LandBank.parcels),
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
    if payload.opportunity_source:
        proposal.opportunity_source = payload.opportunity_source
    if payload.source_contact_details is not None:
        proposal.source_contact_details = payload.source_contact_details
    if payload.road_access_width_ft is not None:
        proposal.road_access_width_ft = payload.road_access_width_ft
    if payload.surrounding_development is not None:
        proposal.surrounding_development = payload.surrounding_development
    if payload.proposed_development_type:
        proposal.proposed_development_type = payload.proposed_development_type
    if payload.far_potential is not None:
        proposal.far_potential = payload.far_potential
    if payload.max_allowable_floors is not None:
        proposal.max_allowable_floors = payload.max_allowable_floors
    if payload.ground_coverage_percent is not None:
        proposal.ground_coverage_percent = payload.ground_coverage_percent
    if payload.indicative_cost_total is not None:
        proposal.indicative_cost_total = payload.indicative_cost_total
        if proposal.total_area_katha and float(proposal.total_area_katha) > 0:
            proposal.indicative_cost_per_katha = float(payload.indicative_cost_total) / float(proposal.total_area_katha)
    if payload.status:
        proposal.status = payload.status
    if payload.workflow_stage:
        proposal.workflow_stage = payload.workflow_stage
    if payload.preliminary_valuation_notes is not None:
        proposal.preliminary_valuation_notes = payload.preliminary_valuation_notes
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

        # Re-calc built-up
        far = float(proposal.far_potential or 4.5)
        proposal.estimated_builtup_sqft = round(converted["sqft"] * far, 2)

    await db.commit()
    await db.refresh(proposal)
    return proposal


# -------------------------------------------------------------
# 5. Khatian Hierarchy (CS, SA, RS, BS, Mutation)
# -------------------------------------------------------------
@router.get("/khatians", response_model=List[LandKhatianResponse])
async def list_khatians(
    land_bank_id: Optional[int] = Query(None),
    khatian_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LandKhatian).order_by(desc(LandKhatian.id))
    if land_bank_id:
        stmt = stmt.where(LandKhatian.land_bank_id == land_bank_id)
    if khatian_type:
        stmt = stmt.where(LandKhatian.khatian_type == khatian_type)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/khatians", response_model=LandKhatianResponse, status_code=status.HTTP_201_CREATED)
async def create_khatian(payload: LandKhatianCreate, db: AsyncSession = Depends(get_db)):
    khatian = LandKhatian(
        land_bank_id=payload.land_bank_id,
        khatian_type=payload.khatian_type.upper(),
        khatian_number=payload.khatian_number.strip(),
        recorded_tenant_name=payload.recorded_tenant_name.strip(),
        case_or_jote_no=payload.case_or_jote_no,
        remarks=payload.remarks
    )
    db.add(khatian)
    await db.commit()
    await db.refresh(khatian)
    return khatian


# -------------------------------------------------------------
# 6. Dag / Plot Registry
# -------------------------------------------------------------
@router.get("/dags", response_model=List[LandDagResponse])
async def list_dags(
    land_bank_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LandDag).order_by(desc(LandDag.id))
    if land_bank_id:
        stmt = stmt.where(LandDag.land_bank_id == land_bank_id)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/dags", response_model=LandDagResponse, status_code=status.HTTP_201_CREATED)
async def create_dag(payload: LandDagCreate, db: AsyncSession = Depends(get_db)):
    katha_val = payload.input_value if payload.input_unit.upper() == "KATHA" else None
    decimal_val = payload.input_value if payload.input_unit.upper() == "DECIMAL" else None
    sqft_val = payload.input_value if payload.input_unit.upper() == "SQFT" else None
    bigha_val = payload.input_value if payload.input_unit.upper() == "BIGHA" else None

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
# 7. Legal Deeds & Document Management
# -------------------------------------------------------------
@router.get("/documents", response_model=List[LandDeedDocumentResponse])
async def list_documents(
    land_bank_id: Optional[int] = Query(None),
    doc_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LandDeedDocument).order_by(desc(LandDeedDocument.id))
    if land_bank_id:
        stmt = stmt.where(LandDeedDocument.land_bank_id == land_bank_id)
    if doc_type:
        stmt = stmt.where(LandDeedDocument.doc_type == doc_type)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/documents", response_model=LandDeedDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(payload: LandDeedDocumentCreate, db: AsyncSession = Depends(get_db)):
    is_exp = False
    if payload.expiry_date and payload.expiry_date < date.today():
        is_exp = True

    doc = LandDeedDocument(
        land_bank_id=payload.land_bank_id,
        doc_type=payload.doc_type.upper(),
        doc_number=payload.doc_number.strip(),
        issuing_office=payload.issuing_office,
        execution_date=payload.execution_date,
        expiry_date=payload.expiry_date,
        is_expired=is_exp,
        file_url=payload.file_url,
        verification_status=payload.verification_status,
        notes=payload.notes
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/documents/expiry-alerts")
async def get_document_expiry_alerts(
    threshold_days: int = Query(60, description="Alert if document expires within N days"),
    db: AsyncSession = Depends(get_db)
):
    threshold_date = date.today() + timedelta(days=threshold_days)
    stmt = (
        select(LandDeedDocument)
        .options(selectinload(LandDeedDocument.land_bank))
        .where(
            LandDeedDocument.expiry_date.isnot(None),
            LandDeedDocument.expiry_date <= threshold_date
        )
        .order_by(LandDeedDocument.expiry_date.asc())
    )
    res = await db.execute(stmt)
    docs = res.scalars().all()

    alerts = []
    for d in docs:
        days_left = (d.expiry_date - date.today()).days if d.expiry_date else None
        alerts.append({
            "document_id": d.id,
            "land_bank_id": d.land_bank_id,
            "project_code": d.land_bank.project_code if d.land_bank else "N/A",
            "doc_type": d.doc_type,
            "doc_number": d.doc_number,
            "expiry_date": d.expiry_date,
            "days_until_expiry": days_left,
            "is_critical": days_left is not None and days_left <= 15
        })

    return {
        "alert_count": len(alerts),
        "threshold_days": threshold_days,
        "expiring_documents": alerts
    }


# -------------------------------------------------------------
# 8. Joint Venture Agreements & Automated Unit Split Matrix
# -------------------------------------------------------------
@router.get("/jv-agreements", response_model=List[JVAgreementResponse])
async def list_jv_agreements(
    land_bank_id: Optional[int] = Query(None),
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
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/jv-agreements", response_model=JVAgreementResponse, status_code=status.HTTP_201_CREATED)
async def create_jv_agreement(
    payload: JVAgreementCreate,
    db: AsyncSession = Depends(get_db)
):
    if round(payload.landowner_share_percent + payload.developer_share_percent, 2) != 100.00:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Landowner share ({payload.landowner_share_percent}%) + Developer share ({payload.developer_share_percent}%) must sum to 100.00%."
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
        for u in payload.unit_allocations:
            alloc = JVUnitAllocation(
                jv_agreement_id=jv.id,
                tower_name=u.tower_name or "Tower 1",
                floor_number=u.floor_number or 1,
                unit_number=u.unit_number or "1A",
                unit_identifier=u.unit_identifier,
                unit_type=u.unit_type or "APARTMENT",
                allocation_type=u.allocation_type,
                gross_sft=u.gross_sft or 1500.0,
                parking_slot_number=u.parking_slot_number,
                allocation_notes=u.allocation_notes,
                is_locked_for_sales=False
            )
            db.add(alloc)

    if payload.milestones:
        for m in payload.milestones:
            mile = LandJVMilestonePayment(
                jv_agreement_id=jv.id,
                milestone_name=m.milestone_name,
                due_date=m.due_date,
                amount_bdt=m.amount_bdt,
                payment_status=m.payment_status or "PENDING",
                notes=m.notes
            )
            db.add(mile)

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
    stmt = (
        select(JVAgreement)
        .options(selectinload(JVAgreement.unit_allocations))
        .where(JVAgreement.id == payload.jv_agreement_id)
    )
    res = await db.execute(stmt)
    jv = res.scalar_one_or_none()
    if not jv:
        raise HTTPException(status_code=404, detail="JV Agreement not found")

    total_units = payload.total_floors * payload.units_per_floor
    lo_ratio = float(jv.landowner_share_percent) / 100.0
    lo_units_target = round(total_units * lo_ratio)

    created_allocations = []
    generated_lo_count = 0
    generated_dev_count = 0
    lo_sft = 0.0
    dev_sft = 0.0

    unit_suffixes = ["A", "B", "C", "D", "E", "F", "G", "H"]

    for floor in range(1, payload.total_floors + 1):
        for u_idx in range(payload.units_per_floor):
            suffix = unit_suffixes[u_idx % len(unit_suffixes)]
            unit_no = f"{floor}{suffix}"
            unit_ident = f"T1-F{floor:02d}-{suffix}"

            if payload.allocation_strategy == "ALTERNATE_FLOORS":
                is_lo = (floor % 2 == 1) if generated_lo_count < lo_units_target else False
            elif payload.allocation_strategy == "ODD_EVEN_UNITS":
                is_lo = ((floor + u_idx) % 2 == 0) if generated_lo_count < lo_units_target else False
            else:
                is_lo = generated_lo_count < lo_units_target

            alloc_type = "LANDOWNER_UNIT" if is_lo else "DEVELOPER_UNIT"

            if is_lo:
                generated_lo_count += 1
                lo_sft += payload.unit_gross_sft
            else:
                generated_dev_count += 1
                dev_sft += payload.unit_gross_sft

            created_allocations.append(
                JVUnitAllocation(
                    jv_agreement_id=jv.id,
                    tower_name="Tower 1",
                    floor_number=floor,
                    unit_number=unit_no,
                    unit_identifier=unit_ident,
                    unit_type="APARTMENT",
                    allocation_type=alloc_type,
                    gross_sft=payload.unit_gross_sft,
                    is_locked_for_sales=False
                )
            )

    db.add_all(created_allocations)
    await db.commit()

    fetch_stmt = (
        select(JVUnitAllocation)
        .where(JVUnitAllocation.jv_agreement_id == jv.id)
        .order_by(JVUnitAllocation.floor_number.asc(), JVUnitAllocation.unit_number.asc())
    )
    alloc_res = await db.execute(fetch_stmt)
    saved_allocs = alloc_res.scalars().all()

    return JVAutoAllocationResponse(
        jv_agreement_id=jv.id,
        total_units_generated=len(saved_allocs),
        landowner_units_count=generated_lo_count,
        developer_units_count=generated_dev_count,
        landowner_total_sft=round(lo_sft, 2),
        developer_total_sft=round(dev_sft, 2),
        allocated_units=[JVUnitAllocationResponse.model_validate(u) for u in saved_allocs]
    )


# -------------------------------------------------------------
# 9. Historical Title Deed Chain Continuity Verification
# -------------------------------------------------------------
@router.get("/deed-chain-verify/{land_bank_id}", response_model=DeedChainVerificationResponse)
async def verify_deed_chain(
    land_bank_id: int,
    db: AsyncSession = Depends(get_db)
):
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
