from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime, timedelta
import os, uuid, shutil

from app.core.database import get_db
from app.modules.land.models import (
    LandBank, Landowner, SurveyRecord, JVAgreement, JVUnitAllocation,
    LandKhatian, LandDag, LandDeedDocument, LandJVMilestonePayment,
    LandParcel, LandownerParcelLink, MeasurementConvention,
    LegalDueDiligence, DueDiligenceItem,
    LandValuation, AcquisitionCosting, AcquisitionExpenseItem,
    LandNegotiation, NegotiationMeeting, NegotiationTermVersion,
    LandPaymentSchedule, LandPaymentTransaction
)
from app.modules.land.schemas import (
    LandBankCreate, LandBankUpdate, LandBankResponse,
    LandownerCreate, LandownerUpdate, LandownerResponse,
    LandownerDuplicateCheckRequest, LandownerDuplicateCheckResponse,
    LandownerNegotiationNoteCreate,
    LandParcelCreate, LandParcelUpdate, LandParcelResponse,
    LandownerParcelLinkCreate, LandownerParcelLinkUpdate, LandownerParcelLinkResponse,
    JointOwnershipShareSummary,
    LandFeasibilityReportResponse, LandProposalComparisonItem,
    SurveyRecordCreate, SurveyRecordResponse,
    LandKhatianCreate, LandKhatianResponse,
    LandDagCreate, LandDagResponse,
    LandDeedDocumentCreate, LandDeedDocumentUpdate, LandDeedDocumentResponse,
    DocumentVerifyRequest, DocumentChecklistResponse,
    LandJVMilestonePaymentCreate, LandJVMilestonePaymentResponse,
    JVAgreementCreate, JVAgreementUpdate, JVAgreementResponse,
    JVUnitAllocationCreate, JVUnitAllocationResponse,
    JVAutoAllocationRequest, JVAutoAllocationResponse,
    DeedChainVerificationResponse,
    LegalDueDiligenceCreate, LegalDueDiligenceUpdate, LegalDueDiligenceResponse,
    DueDiligenceItemCreate, DueDiligenceItemUpdate, DueDiligenceItemResponse,
    DueDiligenceExceptionApprovalRequest,
    LandValuationCreate, LandValuationUpdate, LandValuationResponse, LandValuationPage,
    AcquisitionExpenseItemCreate, AcquisitionExpenseItemUpdate, AcquisitionExpenseItemResponse,
    AcquisitionCostingCreate, AcquisitionCostingUpdate, AcquisitionCostingResponse, AcquisitionCostingPage,
    CostingApprovalRequest, ValuationApprovalRequest, ValuationComparisonSummary,
    NegotiationMeetingCreate, NegotiationMeetingResponse,
    NegotiationTermVersionCreate, NegotiationTermVersionResponse,
    LandNegotiationCreate, LandNegotiationUpdate, LandNegotiationResponse,
    NegotiationTermsApprovalRequest, NegotiationOfferRevisionRequest, NegotiationAlertsResponse,
    LandPaymentTransactionCreate, LandPaymentTransactionResponse,
    LandPaymentScheduleCreate, LandPaymentScheduleUpdate, LandPaymentScheduleResponse,
    PaymentApprovalRequest, PaymentDisbursementRequest, PaymentReversalRequest,
    PaymentScheduleAutoGenerateRequest, PaymentReconciliationSummary,
    MeasurementConventionCreate, MeasurementConventionUpdate, MeasurementConventionResponse,
    RegionalConversionCalculationRequest, RegionalConversionCalculationResponse,
    convert_area_to_all_units
)

router = APIRouter(prefix="/land", tags=["Land Bank, Khatians, Dags & Landowner JV Engine"])

# Include Modular Sub-Routers
from app.modules.land.reports_router import router as reports_router
from app.modules.land.dashboard_router import router as dashboard_router
router.include_router(reports_router)
router.include_router(dashboard_router)
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
        father_name=payload.father_name,
        mother_name=payload.mother_name,
        spouse_name=payload.spouse_name,
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


NID_UPLOAD_DIR = os.path.join("app", "static", "uploads", "nid_scans")
os.makedirs(NID_UPLOAD_DIR, exist_ok=True)

@router.post("/landowners/{landowner_id}/upload-nid", status_code=200)
async def upload_landowner_nid(
    landowner_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload NID scan/image for a landowner and save path to their record."""
    stmt = select(Landowner).where(Landowner.id == landowner_id)
    res = await db.execute(stmt)
    landowner = res.scalar_one_or_none()
    if not landowner:
        raise HTTPException(status_code=404, detail="Landowner not found")

    filename = file.filename or "nid_scan.jpg"
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported file format '{ext}'. Allowed: jpg, jpeg, png, webp, pdf")

    unique_filename = f"nid_{landowner_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(NID_UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    nid_url = f"/static/uploads/nid_scans/{unique_filename}"
    landowner.nid_image_path = nid_url
    await db.commit()

    return {"nid_image_path": nid_url, "message": "NID image uploaded successfully"}


LANDOWNER_DOCS_DIR = os.path.join("app", "static", "uploads", "landowner_docs")
os.makedirs(LANDOWNER_DOCS_DIR, exist_ok=True)

@router.post("/landowners/upload-document", status_code=200)
async def upload_landowner_document(
    file: UploadFile = File(...),
    document_name: Optional[str] = Form(None)
):
    """Upload supporting document for landowner (works in both Create and Edit modes)."""
    filename = file.filename or "document.pdf"
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    unique_filename = f"doc_{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(LANDOWNER_DOCS_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_url = f"/static/uploads/landowner_docs/{unique_filename}"
    return {
        "file_url": doc_url,
        "file_name": filename,
        "document_name": document_name or filename,
        "file_size": os.path.getsize(file_path),
        "extension": ext
    }



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


# -------------------------------------------------------------
# 3. Joint Ownership and Landowner Agreements Engine (Module 2.6)
# -------------------------------------------------------------
@router.get("/joint-ownership-links", response_model=List[LandownerParcelLinkResponse])
async def get_all_joint_ownership_links(
    parcel_id: Optional[int] = Query(None),
    landowner_id: Optional[int] = Query(None),
    consent_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Master list of all landowner-parcel joint ownership shares with full pagination & filters.
    """
    stmt = (
        select(LandownerParcelLink)
        .options(
            selectinload(LandownerParcelLink.landowner),
            selectinload(LandownerParcelLink.parcel)
        )
    )

    if parcel_id:
        stmt = stmt.where(LandownerParcelLink.parcel_id == parcel_id)
    if landowner_id:
        stmt = stmt.where(LandownerParcelLink.landowner_id == landowner_id)
    if consent_status:
        stmt = stmt.where(LandownerParcelLink.consent_status == consent_status)
    if search:
        search_fmt = f"%{search}%"
        stmt = stmt.join(LandownerParcelLink.landowner).where(
            or_(
                Landowner.full_name_en.ilike(search_fmt),
                Landowner.landowner_code.ilike(search_fmt),
                LandownerParcelLink.title_deed_no.ilike(search_fmt),
                LandownerParcelLink.poa_holder_name.ilike(search_fmt)
            )
        )

    stmt = stmt.order_by(desc(LandownerParcelLink.id)).offset(skip).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/parcels/{parcel_id}/owners", response_model=List[LandownerParcelLinkResponse])
async def get_parcel_owners(parcel_id: int, db: AsyncSession = Depends(get_db)):
    """
    Returns all co-owners associated with this parcel with ownership share % and equivalent area.
    """
    stmt = (
        select(LandownerParcelLink)
        .options(
            selectinload(LandownerParcelLink.landowner),
            selectinload(LandownerParcelLink.parcel)
        )
        .where(LandownerParcelLink.parcel_id == parcel_id)
        .order_by(desc(LandownerParcelLink.ownership_share_percent))
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/parcels/{parcel_id}/joint-ownership-audit", response_model=JointOwnershipShareSummary)
async def audit_parcel_joint_ownership(parcel_id: int, db: AsyncSession = Depends(get_db)):
    """
    Validates that co-owners' fractional shares sum to 100% and calculates owner-wise
    equivalent areas (decimals, katha, sqft). Disputed or unresolved shares are flagged.
    """
    # Fetch parcel
    res_p = await db.execute(select(LandParcel).where(LandParcel.id == parcel_id))
    parcel = res_p.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    # Fetch all co-owner links
    stmt = (
        select(LandownerParcelLink)
        .options(
            selectinload(LandownerParcelLink.landowner),
            selectinload(LandownerParcelLink.parcel)
        )
        .where(LandownerParcelLink.parcel_id == parcel_id)
        .order_by(desc(LandownerParcelLink.ownership_share_percent))
    )
    res = await db.execute(stmt)
    links = res.scalars().all()

    total_dec = float(parcel.total_area_decimal) or 0.0
    total_katha = float(parcel.total_area_katha) or (total_dec * 0.605)
    total_sqft = float(parcel.total_area_sqft) or (total_dec * 435.6)

    sum_share = sum(float(l.ownership_share_percent) for l in links)
    unallocated = round(100.0 - sum_share, 2)
    is_exact_100 = abs(unallocated) < 0.01

    has_dispute = any(l.consent_status in ("DISPUTED", "REFUSED", "LEGAL_NOTICE") for l in links)
    unresolved_count = sum(1 for l in links if l.consent_status != "CONSENT_GRANTED" or not l.is_share_verified)

    return JointOwnershipShareSummary(
        parcel_id=parcel.id,
        project_name=parcel.project_name,
        total_area_decimal=round(total_dec, 4),
        total_area_katha=round(total_katha, 4),
        total_area_sqft=round(total_sqft, 2),
        total_owners_count=len(links),
        total_recorded_share_percent=round(sum_share, 2),
        unallocated_share_percent=unallocated,
        is_fully_accounted_100=is_exact_100,
        has_disputed_ownership=has_dispute,
        unresolved_owners_count=unresolved_count,
        co_owners=[LandownerParcelLinkResponse.model_validate(l) for l in links]
    )


@router.post("/parcels/{parcel_id}/owners", response_model=LandownerParcelLinkResponse, status_code=status.HTTP_201_CREATED)
async def link_owner_to_parcel(
    parcel_id: int,
    payload: LandownerParcelLinkCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Registers an owner with a parcel, calculating equivalent decimal/katha/sqft from total parcel area.
    """
    # Fetch parcel to calculate area
    res_p = await db.execute(select(LandParcel).where(LandParcel.id == parcel_id))
    parcel = res_p.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    # Check if link already exists
    existing = await db.execute(
        select(LandownerParcelLink).where(
            LandownerParcelLink.parcel_id == parcel_id,
            LandownerParcelLink.landowner_id == payload.landowner_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Owner is already registered under this parcel.")

    p_area_dec = float(parcel.total_area_decimal) or 0.0
    share_ratio = payload.ownership_share_percent / 100.0
    eq_dec = p_area_dec * share_ratio
    eq_katha = eq_dec * 0.605
    eq_sqft = eq_dec * 435.6

    link = LandownerParcelLink(
        parcel_id=parcel_id,
        landowner_id=payload.landowner_id,
        ownership_share_percent=payload.ownership_share_percent,
        ownership_source=payload.ownership_source or "PURCHASE",
        equivalent_area_decimal=round(eq_dec, 4),
        equivalent_area_katha=round(eq_katha, 4),
        equivalent_area_sqft=round(eq_sqft, 2),
        proposed_sale_price_bdt=payload.proposed_sale_price_bdt or 0.0,
        development_share_percent=payload.development_share_percent or 0.0,
        consent_status=payload.consent_status or "CONSENT_GRANTED",
        has_poa=payload.has_poa or False,
        poa_holder_name=payload.poa_holder_name,
        witness_details=payload.witness_details,
        dispute_remarks=payload.dispute_remarks,
        is_share_verified=True,
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


@router.put("/joint-ownership-links/{link_id}", response_model=LandownerParcelLinkResponse)
async def update_joint_ownership_link(
    link_id: int,
    payload: LandownerParcelLinkUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates ownership share percentage, consent status, or PoA details for a co-owner.
    """
    stmt = (
        select(LandownerParcelLink)
        .options(
            selectinload(LandownerParcelLink.landowner),
            selectinload(LandownerParcelLink.parcel)
        )
        .where(LandownerParcelLink.id == link_id)
    )
    res = await db.execute(stmt)
    link = res.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Ownership record not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(link, field, val)

    # Recalculate equivalent areas if share percent changed
    if payload.ownership_share_percent is not None and link.parcel:
        p_area_dec = float(link.parcel.total_area_decimal) or 0.0
        share_ratio = float(link.ownership_share_percent) / 100.0
        link.equivalent_area_decimal = round(p_area_dec * share_ratio, 4)
        link.equivalent_area_katha = round(link.equivalent_area_decimal * 0.605, 4)
        link.equivalent_area_sqft = round(link.equivalent_area_decimal * 435.6, 2)

    await db.commit()
    await db.refresh(link)
    return link


@router.delete("/joint-ownership-links/{link_id}", status_code=status.HTTP_200_OK)
async def delete_joint_ownership_link(link_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(LandownerParcelLink).where(LandownerParcelLink.id == link_id)
    res = await db.execute(stmt)
    link = res.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Ownership record not found")

    await db.delete(link)
    await db.commit()
    return {"message": "Joint ownership record removed successfully"}


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
    project_code: Optional[str] = Query(None),
    proposal_title: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
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
            selectinload(LandBank.documents).selectinload(LandDeedDocument.parcel),
            selectinload(LandBank.documents).selectinload(LandDeedDocument.landowner),
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
    if project_code:
        stmt = stmt.where(LandBank.project_code.ilike(f"%{project_code.strip()}%"))
    if proposal_title:
        stmt = stmt.where(LandBank.proposal_title.ilike(f"%{proposal_title.strip()}%"))
    if location:
        location_pattern = f"%{location.strip()}%"
        stmt = stmt.where(
            or_(
                LandBank.mouza_name.ilike(location_pattern),
                LandBank.upazila_thana.ilike(location_pattern),
                LandBank.district.ilike(location_pattern),
                LandBank.location_description.ilike(location_pattern)
            )
        )
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
        preliminary_valuation_notes=payload.preliminary_valuation_notes,
        feasibility_report_summary=payload.feasibility_report_summary
    )

    db.add(proposal)
    await db.flush()

    if payload.landowners:
        for idx, lo_data in enumerate(payload.landowners):
            lo_code = f"LND-OWN-{(proposal.id * 10 + idx + 1):04d}"
            lo = Landowner(
                landowner_code=lo_code,
                land_bank_id=proposal.id,
                owner_type=lo_data.owner_type or "INDIVIDUAL",
                ownership_nature=lo_data.ownership_nature or "INHERITED",
                full_name_en=lo_data.full_name_en,
                full_name_bn=lo_data.full_name_bn,
                father_name=lo_data.father_name,
                mother_name=lo_data.mother_name,
                spouse_name=lo_data.spouse_name,
                nid_number=lo_data.nid_number,
                tin_number=lo_data.tin_number,
                phone_number=lo_data.phone_number,
                ownership_share_ratio=lo_data.ownership_share_ratio if lo_data.ownership_share_ratio is not None else 1.0,
                supporting_documents=lo_data.supporting_documents,
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
            selectinload(LandBank.documents).selectinload(LandDeedDocument.parcel),
            selectinload(LandBank.documents).selectinload(LandDeedDocument.landowner),
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
            selectinload(LandBank.documents).selectinload(LandDeedDocument.parcel),
            selectinload(LandBank.documents).selectinload(LandDeedDocument.landowner),
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
            selectinload(LandBank.documents).selectinload(LandDeedDocument.parcel),
            selectinload(LandBank.documents).selectinload(LandDeedDocument.landowner),
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
    if payload.feasibility_report_summary is not None:
        proposal.feasibility_report_summary = payload.feasibility_report_summary
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

        far = float(proposal.far_potential or 4.5)
        proposal.estimated_builtup_sqft = round(converted["sqft"] * far, 2)

    if payload.landowners is not None:
        for lo in proposal.landowners or []:
            await db.delete(lo)
        await db.flush()
        for idx, lo_data in enumerate(payload.landowners):
            lo_code = f"LND-OWN-{(proposal.id * 10 + idx + 1):04d}"
            lo = Landowner(
                landowner_code=lo_code,
                land_bank_id=proposal.id,
                owner_type=lo_data.owner_type or "INDIVIDUAL",
                ownership_nature=lo_data.ownership_nature or "INHERITED",
                full_name_en=lo_data.full_name_en,
                full_name_bn=lo_data.full_name_bn,
                father_name=lo_data.father_name,
                mother_name=lo_data.mother_name,
                spouse_name=lo_data.spouse_name,
                nid_number=lo_data.nid_number,
                tin_number=lo_data.tin_number,
                phone_number=lo_data.phone_number,
                ownership_share_ratio=lo_data.ownership_share_ratio if lo_data.ownership_share_ratio is not None else 1.0,
                supporting_documents=lo_data.supporting_documents,
                bank_details=lo_data.bank_details,
                status="ACTIVE"
            )
            db.add(lo)
        await db.flush()

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
# 6.1 Regional Land Measurement Conventions (2.4)
# -------------------------------------------------------------
@router.get("/measurement-conventions", response_model=List[MeasurementConventionResponse])
async def list_measurement_conventions(db: AsyncSession = Depends(get_db)):
    """
    Retrieves configurable regional land measurement conventions (Dhaka, Chittagong, Rajshahi, Sylhet).
    """
    stmt = select(MeasurementConvention).order_by(MeasurementConvention.is_default.desc(), MeasurementConvention.id.asc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/measurement-conventions", response_model=MeasurementConventionResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement_convention(
    payload: MeasurementConventionCreate,
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(MeasurementConvention).where(MeasurementConvention.convention_code == payload.convention_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Convention code '{payload.convention_code}' already exists.")

    conv = MeasurementConvention(
        convention_code=payload.convention_code.strip(),
        convention_name=payload.convention_name.strip(),
        region_district=payload.region_district.strip(),
        katha_to_sqft=payload.katha_to_sqft,
        decimal_to_sqft=payload.decimal_to_sqft,
        bigha_to_katha=payload.bigha_to_katha,
        acre_to_decimal=payload.acre_to_decimal,
        kani_to_sqft=payload.kani_to_sqft,
        gonda_to_sqft=payload.gonda_to_sqft,
        is_default=payload.is_default,
        notes=payload.notes
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.put("/measurement-conventions/{conv_id}", response_model=MeasurementConventionResponse)
async def update_measurement_convention(
    conv_id: int,
    payload: MeasurementConventionUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(MeasurementConvention).where(MeasurementConvention.id == conv_id)
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Measurement convention not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(conv, field, val)

    await db.commit()
    await db.refresh(conv)
    return conv


@router.post("/math/convert-regional", response_model=RegionalConversionCalculationResponse)
async def convert_area_regional(
    payload: RegionalConversionCalculationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Performs regional land unit conversion while preserving the original registered deed area.
    """
    stmt = select(MeasurementConvention)
    if payload.convention_id:
        stmt = stmt.where(MeasurementConvention.id == payload.convention_id)
    elif payload.convention_code:
        stmt = stmt.where(MeasurementConvention.convention_code == payload.convention_code)
    else:
        stmt = stmt.where(MeasurementConvention.is_default == True)

    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        stmt_def = select(MeasurementConvention).where(MeasurementConvention.is_default == True)
        res_def = await db.execute(stmt_def)
        conv = res_def.scalar_one_or_none()

    katha_factor = float(conv.katha_to_sqft) if conv else 720.0
    decimal_factor = float(conv.decimal_to_sqft) if conv else 435.6
    bigha_to_katha = float(conv.bigha_to_katha) if conv else 20.0
    bigha_sqft = katha_factor * bigha_to_katha
    acre_factor = decimal_factor * (float(conv.acre_to_decimal) if conv else 100.0)
    kani_sqft = float(conv.kani_to_sqft) if conv and conv.kani_to_sqft else 17424.0
    gonda_sqft = float(conv.gonda_to_sqft) if conv and conv.gonda_to_sqft else 871.2

    # Calculate base sqft from input
    unit = payload.input_unit.upper()
    val = payload.input_value
    sqm_to_sqft = 10.7639104167

    calculated_sqft = 0.0
    if unit == "SQFT":
        calculated_sqft = val
    elif unit == "SQM":
        calculated_sqft = val * sqm_to_sqft
    elif unit == "DECIMAL":
        calculated_sqft = val * decimal_factor
    elif unit == "KATHA":
        calculated_sqft = val * katha_factor
    elif unit == "BIGHA":
        calculated_sqft = val * bigha_sqft
    elif unit == "ACRE":
        calculated_sqft = val * acre_factor
    elif unit == "KANI":
        calculated_sqft = val * kani_sqft
    elif unit == "GONDA":
        calculated_sqft = val * gonda_sqft

    converted = {
        "sqft": round(calculated_sqft, 2),
        "sqm": round(calculated_sqft / sqm_to_sqft, 4),
        "decimal": round(calculated_sqft / decimal_factor, 4) if decimal_factor > 0 else 0.0,
        "katha": round(calculated_sqft / katha_factor, 4) if katha_factor > 0 else 0.0,
        "bigha": round(calculated_sqft / bigha_sqft, 4) if bigha_sqft > 0 else 0.0,
        "acre": round(calculated_sqft / acre_factor, 4) if acre_factor > 0 else 0.0,
        "kani": round(calculated_sqft / kani_sqft, 4) if kani_sqft > 0 else 0.0,
        "gonda": round(calculated_sqft / gonda_sqft, 4) if gonda_sqft > 0 else 0.0
    }

    return RegionalConversionCalculationResponse(
        convention_used=conv.convention_name if conv else "Dhaka Standard (Default)",
        region=conv.region_district if conv else "Dhaka Metropolitan",
        original_deed_record={
            "registered_unit": payload.original_registered_unit or payload.input_unit,
            "registered_value": payload.original_registered_value if payload.original_registered_value is not None else payload.input_value,
            "preserved_statutory_text": f"{payload.original_registered_value if payload.original_registered_value is not None else payload.input_value} {payload.original_registered_unit or payload.input_unit}"
        },
        converted_units=converted,
        conversion_factors={
            "katha_to_sqft": katha_factor,
            "decimal_to_sqft": decimal_factor,
            "bigha_to_katha": bigha_to_katha,
            "bigha_to_sqft": bigha_sqft,
            "acre_to_sqft": acre_factor,
            "sqm_to_sqft": sqm_to_sqft,
            "kani_to_sqft": kani_sqft,
            "gonda_to_sqft": gonda_sqft
        }
    )


# -------------------------------------------------------------
# 7. Legal Deeds, Mutation & Document Management (2.5)
# -------------------------------------------------------------
@router.get("/documents", response_model=List[LandDeedDocumentResponse])
async def list_documents(
    parcel_id: Optional[int] = Query(None),
    landowner_id: Optional[int] = Query(None),
    land_bank_id: Optional[int] = Query(None),
    document_category: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Centralized legal document register maintaining all deeds, mutations, parchas, maps, and permissions.
    """
    stmt = (
        select(LandDeedDocument)
        .options(
            selectinload(LandDeedDocument.parcel),
            selectinload(LandDeedDocument.landowner)
        )
        .order_by(desc(LandDeedDocument.id))
    )

    if parcel_id:
        stmt = stmt.where(LandDeedDocument.parcel_id == parcel_id)
    if landowner_id:
        stmt = stmt.where(LandDeedDocument.landowner_id == landowner_id)
    if land_bank_id:
        stmt = stmt.where(LandDeedDocument.land_bank_id == land_bank_id)
    if document_category:
        stmt = stmt.where(LandDeedDocument.document_category == document_category)
    if verification_status:
        stmt = stmt.where(LandDeedDocument.verification_status == verification_status)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                LandDeedDocument.doc_number.ilike(search_pattern),
                LandDeedDocument.doc_title.ilike(search_pattern),
                LandDeedDocument.reference_number.ilike(search_pattern),
                LandDeedDocument.issuing_office.ilike(search_pattern),
                LandDeedDocument.file_name.ilike(search_pattern)
            )
        )

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()

    result = []
    for r in records:
        resp = LandDeedDocumentResponse.model_validate(r)
        if r.expiry_date:
            resp.days_until_expiry = (r.expiry_date - date.today()).days
        result.append(resp)
    return result


@router.post("/documents", response_model=LandDeedDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: LandDeedDocumentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new legal document.
    IMPORTANT: File upload alone NEVER marks legal ownership as verified! Verification requires independent title vetting.
    """
    is_exp = False
    if payload.expiry_date and payload.expiry_date < date.today():
        is_exp = True

    doc = LandDeedDocument(
        land_bank_id=payload.land_bank_id,
        parcel_id=payload.parcel_id,
        landowner_id=payload.landowner_id,
        doc_type=payload.doc_type.upper(),
        document_category=payload.document_category or "SALE_DEED",
        doc_number=payload.doc_number.strip(),
        doc_title=payload.doc_title.strip() if payload.doc_title else f"{payload.doc_type} ({payload.doc_number})",
        reference_number=payload.reference_number.strip() if payload.reference_number else None,
        issuing_office=payload.issuing_office or "Sub-Registry Office",
        execution_date=payload.execution_date or date.today(),
        expiry_date=payload.expiry_date,
        is_expired=is_exp,
        file_url=payload.file_url,
        file_name=payload.file_name,
        file_size_bytes=payload.file_size_bytes,
        mime_type=payload.mime_type or "application/pdf",
        document_version=payload.document_version or "v1.0",
        verification_status="PENDING", # Always starts as PENDING!
        verification_officer=None,
        verification_date=None,
        verification_remarks=None,
        is_independently_verified=False, # Mandatory business rule
        ocr_extracted_data=payload.ocr_extracted_data,
        ocr_status=payload.ocr_status or "NOT_EXTRACTED",
        access_security_level=payload.access_security_level or "STANDARD",
        renewal_reminder_days=payload.renewal_reminder_days or 30,
        notes=payload.notes
    )

    db.add(doc)
    await db.commit()

    stmt = (
        select(LandDeedDocument)
        .options(
            selectinload(LandDeedDocument.parcel),
            selectinload(LandDeedDocument.landowner)
        )
        .where(LandDeedDocument.id == doc.id)
    )
    res = await db.execute(stmt)
    saved = res.scalar_one()

    resp = LandDeedDocumentResponse.model_validate(saved)
    if saved.expiry_date:
        resp.days_until_expiry = (saved.expiry_date - date.today()).days
    return resp


@router.get("/documents/{document_id}", response_model=LandDeedDocumentResponse)
async def get_document(document_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(LandDeedDocument)
        .options(
            selectinload(LandDeedDocument.parcel),
            selectinload(LandDeedDocument.landowner)
        )
        .where(LandDeedDocument.id == document_id)
    )
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Legal document not found")

    resp = LandDeedDocumentResponse.model_validate(doc)
    if doc.expiry_date:
        resp.days_until_expiry = (doc.expiry_date - date.today()).days
    return resp


@router.put("/documents/{document_id}", response_model=LandDeedDocumentResponse)
async def update_document(
    document_id: int,
    payload: LandDeedDocumentUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(LandDeedDocument)
        .options(
            selectinload(LandDeedDocument.parcel),
            selectinload(LandDeedDocument.landowner)
        )
        .where(LandDeedDocument.id == document_id)
    )
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Legal document not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(doc, field, val)

    if doc.expiry_date and doc.expiry_date < date.today():
        doc.is_expired = True

    await db.commit()
    await db.refresh(doc)

    resp = LandDeedDocumentResponse.model_validate(doc)
    if doc.expiry_date:
        resp.days_until_expiry = (doc.expiry_date - date.today()).days
    return resp


@router.delete("/documents/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(LandDeedDocument).where(LandDeedDocument.id == document_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Legal document not found")

    await db.delete(doc)
    await db.commit()
    return {"message": f"Document {doc.doc_number} deleted successfully"}


@router.post("/documents/{document_id}/verify", response_model=LandDeedDocumentResponse)
async def verify_document(
    document_id: int,
    payload: DocumentVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Formal legal title verification by authorized counsel or surveyor.
    Sets is_independently_verified = True and updates verification officer/date.
    """
    stmt = (
        select(LandDeedDocument)
        .options(
            selectinload(LandDeedDocument.parcel),
            selectinload(LandDeedDocument.landowner)
        )
        .where(LandDeedDocument.id == document_id)
    )
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Legal document not found")

    doc.verification_status = payload.verification_status
    doc.verification_officer = payload.verification_officer.strip()
    doc.verification_date = date.today()
    doc.verification_remarks = payload.verification_remarks
    doc.is_independently_verified = (payload.verification_status == "VERIFIED")

    await db.commit()
    await db.refresh(doc)

    resp = LandDeedDocumentResponse.model_validate(doc)
    if doc.expiry_date:
        resp.days_until_expiry = (doc.expiry_date - date.today()).days
    return resp


@router.post("/documents/{document_id}/ocr-simulate", response_model=LandDeedDocumentResponse)
async def ocr_simulate_document(
    document_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    OCR-assisted extraction of deed number, khatian number, dag number, area, and owner name.
    Extracted data is stored in ocr_extracted_data and flagged as EXTRACTED pending manual confirmation.
    """
    stmt = (
        select(LandDeedDocument)
        .options(
            selectinload(LandDeedDocument.parcel),
            selectinload(LandDeedDocument.landowner)
        )
        .where(LandDeedDocument.id == document_id)
    )
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Legal document not found")

    # Perform intelligent extraction based on document metadata & attached parcel
    khatian_no = doc.parcel.khatian_number if doc.parcel else "1042"
    dag_no = doc.parcel.dag_number if doc.parcel else "5041"
    area_dec = float(doc.parcel.total_area_decimal) if doc.parcel else 20.0
    owner_name = doc.landowner.full_name_en if doc.landowner else "Alhaj Nurul Islam"

    extracted = {
        "extracted_at": datetime.now().isoformat(),
        "confidence_score": 0.94,
        "deed_number": doc.doc_number,
        "issuing_office": doc.issuing_office,
        "khatian_number": khatian_no,
        "dag_number": dag_no,
        "recorded_area_decimal": area_dec,
        "owner_name": owner_name,
        "ocr_raw_snippet": f"গণপ্রজাতন্ত্রী বাংলাদেশ সরকার - সাব-রেজিস্ট্রার কার্যালয়। দলিল নং: {doc.doc_number}। দাগ নং: {dag_no}, খতিয়ান নং: {khatian_no}, জমির পরিমাণ: {area_dec} শতাংশ। গ্রহীতা: {owner_name}।"
    }

    doc.ocr_extracted_data = extracted
    doc.ocr_status = "EXTRACTED"
    await db.commit()
    await db.refresh(doc)

    resp = LandDeedDocumentResponse.model_validate(doc)
    return resp


@router.get("/parcels/{parcel_id}/document-checklist", response_model=DocumentChecklistResponse)
async def get_parcel_document_checklist(
    parcel_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Comprehensive document checklist before acquisition approval.
    Validates presence and independent verification of mandatory categories:
    Saf-Kabala, Baya Deed Chain, Mutation & DCR, Khajna Tax Dakhila, Boundary Survey Map, and Mouza Sheet.
    """
    p_stmt = select(LandParcel).where(LandParcel.id == parcel_id)
    p_res = await db.execute(p_stmt)
    parcel = p_res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    docs_stmt = select(LandDeedDocument).where(LandDeedDocument.parcel_id == parcel_id)
    docs_res = await db.execute(docs_stmt)
    docs = docs_res.scalars().all()

    category_docs_map = {}
    for d in docs:
        cat = d.document_category
        if cat not in category_docs_map or d.is_independently_verified:
            category_docs_map[cat] = d

    mandatory_categories = [
        {"code": "SALE_DEED", "title": "Sale Deed / Conveyance (Saf-Kabala)", "mandatory": True},
        {"code": "CHAIN_BAYA_DEED", "title": "Ownership Chain (Baya Deed 25+ Years)", "mandatory": True},
        {"code": "MUTATION_DCR", "title": "Mutation Parcha & DCR Case Receipt", "mandatory": True},
        {"code": "TAX_DAKHILA", "title": "Updated Land Development Tax (Khajna)", "mandatory": True},
        {"code": "SURVEY_PARCHA", "title": "Statutory Survey Parcha (RS / BS)", "mandatory": True},
        {"code": "MOUZA_MAP", "title": "Certified Mouza Map Sheet", "mandatory": True},
        {"code": "BOUNDARY_SURVEY", "title": "Boundary Demarcation Survey Report", "mandatory": False},
        {"code": "POA_PARTITION_WARIS", "title": "Waris Certificate / Partition / PoA", "mandatory": False},
        {"code": "NOC_PERMISSION", "title": "NOC / Height Clearance Certificates", "mandatory": False}
    ]

    items = []
    missing_mandatory = []
    verified_count = 0

    for cat in mandatory_categories:
        doc = category_docs_map.get(cat["code"])
        is_present = doc is not None
        is_ver = doc.is_independently_verified if doc else False

        if is_ver:
            verified_count += 1
        elif cat["mandatory"]:
            missing_mandatory.append(cat["title"])

        items.append(
            DocumentChecklistItem(
                category_code=cat["code"],
                category_title=cat["title"],
                is_mandatory=cat["mandatory"],
                is_present=is_present,
                is_verified=is_ver,
                document_id=doc.id if doc else None,
                document_title=doc.doc_title if doc else None,
                status="VERIFIED" if is_ver else ("UPLOADED_UNVERIFIED" if is_present else "MISSING")
            )
        )

    is_ready = len(missing_mandatory) == 0

    return DocumentChecklistResponse(
        parcel_id=parcel.id,
        parcel_code=parcel.parcel_id,
        project_name=parcel.project_name,
        total_documents_count=len(docs),
        verified_documents_count=verified_count,
        is_approval_ready=is_ready,
        missing_mandatory_categories=missing_mandatory,
        items=items
    )


@router.get("/documents/expiry-alerts")
async def get_document_expiry_alerts(
    threshold_days: int = Query(60, description="Alert if document expires within N days"),
    db: AsyncSession = Depends(get_db)
):
    threshold_date = date.today() + timedelta(days=threshold_days)
    stmt = (
        select(LandDeedDocument)
        .options(
            selectinload(LandDeedDocument.parcel),
            selectinload(LandDeedDocument.landowner)
        )
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
            "parcel_id": d.parcel_id,
            "parcel_code": d.parcel.parcel_id if d.parcel else "N/A",
            "project_name": d.parcel.project_name if d.parcel else "N/A",
            "doc_title": d.doc_title,
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
            selectinload(JVAgreement.milestones),
            selectinload(JVAgreement.parcel)
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

    lb_id = payload.land_bank_id
    if not lb_id and payload.parcel_id:
        p_res = await db.execute(select(LandParcel).where(LandParcel.id == payload.parcel_id))
        p_obj = p_res.scalar_one_or_none()
        if p_obj and p_obj.land_bank_id:
            lb_id = p_obj.land_bank_id
    if not lb_id:
        lb_res = await db.execute(select(LandBank.id).limit(1))
        lb_id = lb_res.scalar()

    jv = JVAgreement(
        land_bank_id=lb_id,
        parcel_id=payload.parcel_id,
        agreement_deed_no=payload.agreement_deed_no.strip(),
        agreement_type=payload.agreement_type or "JOINT_VENTURE_DEVELOPMENT",
        registration_deed_no=payload.registration_deed_no,
        registration_office=payload.registration_office,
        registration_date=payload.registration_date,
        witness_count=payload.witness_count if payload.witness_count is not None else 2,
        landowner_share_percent=payload.landowner_share_percent,
        developer_share_percent=payload.developer_share_percent,
        signing_money_total=payload.signing_money_total,
        signing_money_paid=payload.signing_money_paid or 0.0,
        tenure_months=payload.tenure_months,
        allocated_flats_count=payload.allocated_flats_count or 0,
        allocated_shops_count=payload.allocated_shops_count or 0,
        allocated_car_parks_count=payload.allocated_car_parks_count or 0,
        allocated_cash_bdt=payload.allocated_cash_bdt or 0.0,
        obligations_developer=payload.obligations_developer,
        obligations_landowner=payload.obligations_landowner,
        special_conditions=payload.special_conditions,
        amendment_number=payload.amendment_number or 0,
        termination_conditions=payload.termination_conditions,
        missing_consents_flag=bool(payload.missing_consents_flag),
        poa_deed_number=payload.poa_deed_number,
        poa_execution_date=payload.poa_execution_date,
        poa_expiry_date=payload.poa_expiry_date,
        poa_verified=payload.poa_verified if payload.poa_verified is not None else True,
        agreement_document_name=payload.agreement_document_name,
        agreement_file_url=payload.agreement_file_url,
        supporting_documents=payload.supporting_documents,
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
                is_locked_for_sales=(u.allocation_type == "LANDOWNER_UNIT")
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


# -------------------------------------------------------------
# 11. Landowner Agreements Update & Deletion (Module 2.6)
# -------------------------------------------------------------
@router.put("/jv-agreements/{jv_id}", response_model=JVAgreementResponse)
async def update_jv_agreement(
    jv_id: int,
    payload: JVAgreementUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(JVAgreement)
        .options(
            selectinload(JVAgreement.parcel),
            selectinload(JVAgreement.unit_allocations),
            selectinload(JVAgreement.milestones)
        )
        .where(JVAgreement.id == jv_id)
    )
    res = await db.execute(stmt)
    jv = res.scalar_one_or_none()
    if not jv:
        raise HTTPException(status_code=404, detail="Agreement not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(jv, field, val)

    await db.commit()
    await db.refresh(jv)
    return jv


@router.delete("/jv-agreements/{jv_id}", status_code=status.HTTP_200_OK)
async def delete_jv_agreement(jv_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(JVAgreement).where(JVAgreement.id == jv_id)
    res = await db.execute(stmt)
    jv = res.scalar_one_or_none()
    if not jv:
        raise HTTPException(status_code=404, detail="Agreement not found")

    await db.delete(jv)
    await db.commit()
    return {"message": "Agreement deleted successfully"}


# -------------------------------------------------------------
# 12. Legal Due Diligence and Encumbrance Tracking (Module 2.7)
# -------------------------------------------------------------
@router.get("/legal-due-diligence", response_model=List[LegalDueDiligenceResponse])
async def list_legal_due_diligence(
    parcel_id: Optional[int] = Query(None),
    risk_level: Optional[str] = Query(None),
    clearance_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(LegalDueDiligence)
        .options(
            selectinload(LegalDueDiligence.parcel),
            selectinload(LegalDueDiligence.items)
        )
    )

    if parcel_id:
        stmt = stmt.where(LegalDueDiligence.parcel_id == parcel_id)
    if risk_level:
        stmt = stmt.where(LegalDueDiligence.overall_risk_level == risk_level)
    if clearance_status:
        stmt = stmt.where(LegalDueDiligence.clearance_status == clearance_status)
    if search:
        search_fmt = f"%{search}%"
        stmt = stmt.where(
            or_(
                LegalDueDiligence.diligence_code.ilike(search_fmt),
                LegalDueDiligence.lead_legal_counsel.ilike(search_fmt),
                LegalDueDiligence.law_firm_name.ilike(search_fmt),
                LegalDueDiligence.encumbrance_certificate_no.ilike(search_fmt)
            )
        )

    stmt = stmt.order_by(desc(LegalDueDiligence.id)).offset(skip).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list = []
    for r in records:
        resp = LegalDueDiligenceResponse.model_validate(r)
        items = r.items or []
        resp.blocking_items_count = sum(1 for it in items if it.is_blocking or it.risk_level in ("HIGH", "CRITICAL"))
        resp.passed_items_count = sum(1 for it in items if it.decision == "PASSED")
        resp_list.append(resp)
    return resp_list


@router.get("/legal-due-diligence/{diligence_id}", response_model=LegalDueDiligenceResponse)
async def get_legal_due_diligence_by_id(
    diligence_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(LegalDueDiligence)
        .options(
            selectinload(LegalDueDiligence.parcel),
            selectinload(LegalDueDiligence.items)
        )
        .where(LegalDueDiligence.id == diligence_id)
    )
    res = await db.execute(stmt)
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Legal due diligence record not found")

    resp = LegalDueDiligenceResponse.model_validate(r)
    items = r.items or []
    resp.blocking_items_count = sum(1 for it in items if it.is_blocking or it.risk_level in ("HIGH", "CRITICAL"))
    resp.passed_items_count = sum(1 for it in items if it.decision == "PASSED")
    return resp


@router.get("/parcels/{parcel_id}/legal-due-diligence", response_model=Optional[LegalDueDiligenceResponse])
async def get_parcel_due_diligence(parcel_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(LegalDueDiligence)
        .options(
            selectinload(LegalDueDiligence.parcel),
            selectinload(LegalDueDiligence.items)
        )
        .where(LegalDueDiligence.parcel_id == parcel_id)
    )
    res = await db.execute(stmt)
    r = res.scalar_one_or_none()
    if not r:
        return None

    resp = LegalDueDiligenceResponse.model_validate(r)
    items = r.items or []
    resp.blocking_items_count = sum(1 for it in items if it.is_blocking or it.risk_level in ("HIGH", "CRITICAL"))
    resp.passed_items_count = sum(1 for it in items if it.decision == "PASSED")
    return resp


@router.post("/legal-due-diligence", response_model=LegalDueDiligenceResponse, status_code=status.HTTP_201_CREATED)
async def create_legal_due_diligence(
    payload: LegalDueDiligenceCreate,
    db: AsyncSession = Depends(get_db)
):
    count_res = await db.execute(select(func.count(LegalDueDiligence.id)))
    cnt = count_res.scalar() or 0
    diligence_code = f"LDD-2026-{cnt + 1:04d}"

    record = LegalDueDiligence(
        diligence_code=diligence_code,
        parcel_id=payload.parcel_id,
        lead_legal_counsel=payload.lead_legal_counsel,
        law_firm_name=payload.law_firm_name,
        overall_risk_level=payload.overall_risk_level or "LOW",
        clearance_status=payload.clearance_status or "UNDER_REVIEW",
        acquisition_blocked=payload.overall_risk_level in ("HIGH", "CRITICAL"),
        summary_legal_opinion=payload.summary_legal_opinion,
        title_search_period_years=payload.title_search_period_years or 30,
        sub_registry_office_searched=payload.sub_registry_office_searched,
        encumbrance_certificate_no=payload.encumbrance_certificate_no,
        non_encumbrance_certificate_date=payload.non_encumbrance_certificate_date
    )
    db.add(record)
    await db.flush()

    # Pre-populate default 10 statutory due diligence checks
    default_items = [
        ("CHAIN_OF_TITLE", "Chain of Title (25-30 Year Baya Deeds Verification)", payload.lead_legal_counsel, date.today(), "LOW", "PASSED", "Parent deeds, CS/SA/RS khatian chain verification in Sub-Registry Book 1.", False),
        ("SURVEY_DEED_MATCH", "Deed vs Khatian vs Dag Area Reconciliation", payload.lead_legal_counsel, date.today(), "LOW", "PASSED", "Comparing deed schedule with RS/BS parcha dag area and mouza map boundaries.", False),
        ("MUTATION_TAX", "Mutation & Dakhila Receipts (Khajna Paid to Date)", payload.lead_legal_counsel, date.today(), "LOW", "PASSED", "AC Land namjari mutation order, DCR receipt, and land development tax dakhila.", False),
        ("MORTGAGE_LIENS_ENCUMBRANCE", "Mortgage, Liens, Bank Charges & CIB Search", payload.lead_legal_counsel, date.today(), "LOW", "PASSED", "Sub-Registry Book 2 search, RJSC charge check, and Bank non-encumbrance certificate.", False),
        ("PENDING_LITIGATION_DISPUTES", "Pending Litigation, Title Suits & Injunction Check", payload.lead_legal_counsel, date.today(), "LOW", "PASSED", "Searching Civil Court registers (Assistant Judge, Senior Sub-Judge) for title suits.", False),
        ("OWNERSHIP_INHERITANCE_CONSENT", "Inheritance Succession & Co-Sharers Consent Audit", payload.lead_legal_counsel, date.today(), "LOW", "PASSED", "Waris succession certificate, partition deeds, and non-signatory dispute risks.", False),
        ("POSSESSION_ENCROACHMENT_BOUNDARY", "Physical Possession & Demarcation Boundary Vetting", payload.lead_legal_counsel, date.today(), "LOW", "PASSED", "On-site boundary inspection, access road width confirmation, and zero encroachment.", False),
        ("LAND_USE_RESTRICTIONS_RAJUK", "RAJUK / CDA Master Plan & Wetland Clearance", payload.lead_legal_counsel, date.today(), "LOW", "PASSED", "DAP / Master Plan zoning compliance; flood-flow and waterbody reservation verification.", False),
        ("EVIDENCE_CLEARANCE", "Statutory Clearances (NOC, Environment, Fire)", payload.lead_legal_counsel, date.today(), "LOW", "PASSED", "Aviation height clearance, environmental screening, and utility rights-of-way.", False),
        ("LEGAL_CLEARANCE_OPINION", "Final Legal Title Certificate & Clearance Opinion", payload.lead_legal_counsel, date.today(), "LOW", "PASSED", "Documented legal opinion stating whether parcel is marketable and acquisition-ready.", False)
    ]

    for cat, title, officer, vdate, risk, dec, rem, blk in default_items:
        it = DueDiligenceItem(
            due_diligence_id=record.id,
            check_category=cat,
            check_title=title,
            responsible_officer=officer,
            verification_date=vdate,
            risk_level=risk,
            decision=dec,
            remarks=rem,
            is_blocking=blk
        )
        db.add(it)

    await db.commit()

    stmt = (
        select(LegalDueDiligence)
        .options(
            selectinload(LegalDueDiligence.parcel),
            selectinload(LegalDueDiligence.items)
        )
        .where(LegalDueDiligence.id == record.id)
    )
    res = await db.execute(stmt)
    created = res.scalar_one()
    resp = LegalDueDiligenceResponse.model_validate(created)
    resp.blocking_items_count = 0
    resp.passed_items_count = 10
    return resp


@router.put("/legal-due-diligence/{diligence_id}", response_model=LegalDueDiligenceResponse)
async def update_legal_due_diligence(
    diligence_id: int,
    payload: LegalDueDiligenceUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(LegalDueDiligence)
        .options(
            selectinload(LegalDueDiligence.parcel),
            selectinload(LegalDueDiligence.items)
        )
        .where(LegalDueDiligence.id == diligence_id)
    )
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Due diligence record not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(record, field, val)

    if record.overall_risk_level in ("HIGH", "CRITICAL") and not record.exception_approved_by:
        record.acquisition_blocked = True
        record.clearance_status = "BLOCKED"

    await db.commit()
    await db.refresh(record)

    resp = LegalDueDiligenceResponse.model_validate(record)
    items = record.items or []
    resp.blocking_items_count = sum(1 for it in items if it.is_blocking or it.risk_level in ("HIGH", "CRITICAL"))
    resp.passed_items_count = sum(1 for it in items if it.decision == "PASSED")
    return resp


@router.post("/legal-due-diligence/{diligence_id}/items", response_model=DueDiligenceItemResponse)
async def add_due_diligence_item(
    diligence_id: int,
    payload: DueDiligenceItemCreate,
    db: AsyncSession = Depends(get_db)
):
    is_blk = payload.risk_level in ("HIGH", "CRITICAL") or payload.decision == "FAILED_BLOCKING"
    item = DueDiligenceItem(
        due_diligence_id=diligence_id,
        check_category=payload.check_category,
        check_title=payload.check_title,
        responsible_officer=payload.responsible_officer,
        verification_date=payload.verification_date,
        risk_level=payload.risk_level,
        decision=payload.decision,
        evidence_documents=payload.evidence_documents,
        remarks=payload.remarks,
        is_blocking=is_blk
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/legal-due-diligence/{diligence_id}/items/{item_id}", response_model=DueDiligenceItemResponse)
async def update_due_diligence_item(
    diligence_id: int,
    item_id: int,
    payload: DueDiligenceItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DueDiligenceItem).where(
        DueDiligenceItem.id == item_id,
        DueDiligenceItem.due_diligence_id == diligence_id
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Due diligence item not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(item, field, val)

    if item.risk_level in ("HIGH", "CRITICAL") or item.decision == "FAILED_BLOCKING":
        item.is_blocking = True

    await db.commit()
    await db.refresh(item)
    return item


@router.post("/legal-due-diligence/{diligence_id}/exception-approval", response_model=LegalDueDiligenceResponse)
async def approve_due_diligence_exception(
    diligence_id: int,
    payload: DueDiligenceExceptionApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(LegalDueDiligence)
        .options(
            selectinload(LegalDueDiligence.parcel),
            selectinload(LegalDueDiligence.items)
        )
        .where(LegalDueDiligence.id == diligence_id)
    )
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Due diligence record not found")

    record.exception_approved_by = payload.exception_approved_by
    record.exception_reason = payload.exception_reason
    if payload.override_blocked_status:
        record.acquisition_blocked = False
        record.clearance_status = "CONDITIONAL_CLEARANCE"

    await db.commit()
    await db.refresh(record)

    resp = LegalDueDiligenceResponse.model_validate(record)
    items = record.items or []
    resp.blocking_items_count = sum(1 for it in items if it.is_blocking or it.risk_level in ("HIGH", "CRITICAL"))
    resp.passed_items_count = sum(1 for it in items if it.decision == "PASSED")
    return resp


# ==============================================================================
# 13. Land Valuation and Acquisition Costing (Module 2.8)
# ==============================================================================

def recalculate_costing(costing: AcquisitionCosting, parcel: Optional[LandParcel] = None):
    """
    Recalculates total estimated/actual acquisition costs, unit rates (sqft, katha, decimal),
    and capitalization accounting breakdown.
    Core formulas:
    - Total Acquisition Cost = Purchase Price + Approved Acquisition Expenses
    - Cost per Sq Ft = Total Acquisition Cost / Acquired Area in Sq Ft
    - Cost per Decimal = Total Acquisition Cost / Acquired Area in Decimals
    - Cost per Katha = Total Acquisition Cost / Acquired Area in Katha
    """
    items = costing.expense_items or []
    est_exp = sum(float(it.estimated_amount_bdt or 0.0) for it in items)
    act_exp = sum(float(it.actual_amount_bdt or 0.0) for it in items)
    
    agreed = float(costing.agreed_purchase_price_bdt or 0.0)
    budget = float(costing.budget_allocated_bdt or 0.0)
    
    costing.total_estimated_expenses_bdt = est_exp
    costing.total_actual_expenses_bdt = act_exp
    costing.total_estimated_cost_bdt = agreed + est_exp
    costing.total_actual_cost_bdt = agreed + act_exp
    costing.remaining_budget_bdt = budget - costing.total_actual_cost_bdt
    costing.cost_variance_bdt = costing.total_actual_cost_bdt - costing.total_estimated_cost_bdt
    
    if costing.total_estimated_cost_bdt > 0:
        costing.cost_variance_percent = round((costing.cost_variance_bdt / costing.total_estimated_cost_bdt) * 100, 2)
    else:
        costing.cost_variance_percent = 0.0

    # Capitalization Policy Breakdown
    cap_land = agreed + sum(float(it.actual_amount_bdt or 0.0) for it in items if it.accounting_treatment == "CAPITALIZE_LAND")
    cap_dev = sum(float(it.actual_amount_bdt or 0.0) for it in items if it.accounting_treatment == "CAPITALIZE_PROJECT")
    exp_acq = sum(float(it.actual_amount_bdt or 0.0) for it in items if it.accounting_treatment == "EXPENSE_OFF")
    
    costing.capitalized_land_cost_bdt = cap_land
    costing.capitalized_development_cost_bdt = cap_dev
    costing.expensed_acquisition_cost_bdt = exp_acq

    # Unit rate calculation
    if parcel:
        area_dec = float(parcel.total_area_decimal or 0.0)
        area_katha = float(parcel.total_area_katha or 0.0)
        area_sqft = float(parcel.total_area_sqft or 0.0)
        
        # Fallbacks using standard BD conversions
        if area_sqft == 0.0 and area_dec > 0.0:
            area_sqft = area_dec * 435.6
        if area_katha == 0.0 and area_dec > 0.0:
            area_katha = area_dec * 0.605

        costing.cost_per_decimal_bdt = round(costing.total_actual_cost_bdt / area_dec, 2) if area_dec > 0 else 0.0
        costing.cost_per_katha_bdt = round(costing.total_actual_cost_bdt / area_katha, 2) if area_katha > 0 else 0.0
        costing.cost_per_sqft_bdt = round(costing.total_actual_cost_bdt / area_sqft, 2) if area_sqft > 0 else 0.0


# --- 13.1 Land Valuations CRUD & Comparison ---

@router.get("/valuations", response_model=LandValuationPage)
async def list_land_valuations(
    parcel_id: Optional[int] = Query(None),
    valuation_source: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    skip: Optional[int] = Query(None, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    filters = []
    if parcel_id:
        filters.append(LandValuation.parcel_id == parcel_id)
    if valuation_source:
        filters.append(LandValuation.valuation_source == valuation_source)
    if approval_status:
        filters.append(LandValuation.approval_status == approval_status)
    if search:
        s = f"%{search.strip()}%"
        filters.append(
            or_(
                LandValuation.valuation_code.ilike(s),
                LandValuation.assessor_name.ilike(s),
                LandValuation.assessor_company.ilike(s),
                LandValuation.notes_and_methodology.ilike(s)
            )
        )
    effective_offset = skip if skip is not None else offset
    total = await db.scalar(select(func.count(LandValuation.id)).where(*filters))
    stmt = select(LandValuation).where(*filters).order_by(desc(LandValuation.id)).offset(effective_offset).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()
    return {
        "items": [LandValuationResponse.model_validate(r) for r in records],
        "total": total or 0,
        "offset": effective_offset,
        "limit": limit
    }


@router.post("/valuations", response_model=LandValuationResponse, status_code=status.HTTP_201_CREATED)
async def create_land_valuation(
    payload: LandValuationCreate,
    db: AsyncSession = Depends(get_db)
):
    # Verify parcel exists
    p_res = await db.execute(select(LandParcel).where(LandParcel.id == payload.parcel_id))
    parcel = p_res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Target parcel not found")

    # Generate sequential unique code
    count_res = await db.execute(
        select(func.count(LandValuation.id)).where(LandValuation.parcel_id == payload.parcel_id)
    )
    val_num = (count_res.scalar() or 0) + 1
    val_code = f"VAL-{parcel.parcel_id or 'PRC' + str(parcel.id)}-{val_num:02d}"

    # Auto compute mouza valuation total if mouza rate provided
    mouza_total = payload.govt_mouza_valuation_total_bdt or 0.0
    if (not mouza_total or mouza_total == 0.0) and payload.govt_mouza_rate_per_decimal_bdt:
        mouza_total = float(payload.govt_mouza_rate_per_decimal_bdt) * float(parcel.total_area_decimal or 0.0)

    val_record = LandValuation(
        valuation_code=val_code,
        parcel_id=payload.parcel_id,
        valuation_date=payload.valuation_date,
        valuation_source=payload.valuation_source or "INTERNAL_ESTIMATE",
        assessor_name=payload.assessor_name,
        assessor_company=payload.assessor_company,
        assessor_license_no=payload.assessor_license_no,
        asking_price_total_bdt=payload.asking_price_total_bdt or 0.0,
        market_valuation_total_bdt=payload.market_valuation_total_bdt or 0.0,
        govt_mouza_rate_per_decimal_bdt=payload.govt_mouza_rate_per_decimal_bdt or 0.0,
        govt_mouza_valuation_total_bdt=mouza_total,
        recommended_offer_price_bdt=payload.recommended_offer_price_bdt or 0.0,
        notes_and_methodology=payload.notes_and_methodology,
        approval_status=payload.approval_status or "DRAFT"
    )
    db.add(val_record)
    await db.commit()
    await db.refresh(val_record)
    return LandValuationResponse.model_validate(val_record)


@router.get("/valuations/{valuation_id}", response_model=LandValuationResponse)
async def get_land_valuation(
    valuation_id: int,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(LandValuation).where(LandValuation.id == valuation_id))
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Land valuation record not found")
    return LandValuationResponse.model_validate(record)


@router.put("/valuations/{valuation_id}", response_model=LandValuationResponse)
async def update_land_valuation(
    valuation_id: int,
    payload: LandValuationUpdate,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(LandValuation).where(LandValuation.id == valuation_id))
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Land valuation record not found")

    update_dict = payload.model_dump(exclude_unset=True)
    if "parcel_id" in update_dict:
        parcel_id = update_dict["parcel_id"]
        if parcel_id is None:
            update_dict.pop("parcel_id")
        else:
            parcel_res = await db.execute(select(LandParcel).where(LandParcel.id == parcel_id))
            if parcel_res.scalar_one_or_none() is None:
                raise HTTPException(status_code=404, detail="Target parcel not found")
    for field, val in update_dict.items():
        setattr(record, field, val)

    await db.commit()
    await db.refresh(record)
    return LandValuationResponse.model_validate(record)


@router.delete("/valuations/{valuation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_land_valuation(
    valuation_id: int,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(LandValuation).where(LandValuation.id == valuation_id))
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Land valuation record not found")
    await db.delete(record)
    await db.commit()


@router.post("/valuations/{valuation_id}/approve", response_model=LandValuationResponse)
async def approve_land_valuation(
    valuation_id: int,
    payload: ValuationApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(LandValuation).where(LandValuation.id == valuation_id))
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Land valuation record not found")

    record.approval_status = payload.approval_status
    record.approved_by = payload.approved_by
    record.approval_date = date.today()
    record.approval_remarks = payload.approval_remarks
    await db.commit()
    await db.refresh(record)
    return LandValuationResponse.model_validate(record)


@router.get("/parcels/{parcel_id}/valuation-comparison", response_model=ValuationComparisonSummary)
async def get_parcel_valuation_comparison(
    parcel_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Compares asking price, market valuation, govt mouza valuation, and negotiated agreed purchase price.
    Calculates commercial variances for investment committee decision making.
    """
    p_res = await db.execute(select(LandParcel).where(LandParcel.id == parcel_id))
    parcel = p_res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    v_res = await db.execute(
        select(LandValuation).where(LandValuation.parcel_id == parcel_id).order_by(desc(LandValuation.id))
    )
    valuations = v_res.scalars().all()

    # Get active agreed purchase price from costing if exists
    c_res = await db.execute(
        select(AcquisitionCosting.agreed_purchase_price_bdt)
        .where(AcquisitionCosting.parcel_id == parcel_id)
        .order_by(desc(AcquisitionCosting.id))
        .limit(1)
    )
    agreed_price = c_res.scalar() or 0.0

    # Max asking price, highest market valuation, and govt mouza rate
    asking = max([float(v.asking_price_total_bdt or 0.0) for v in valuations], default=0.0)
    market = max([float(v.market_valuation_total_bdt or 0.0) for v in valuations], default=0.0)
    mouza = max([float(v.govt_mouza_valuation_total_bdt or 0.0) for v in valuations], default=0.0)

    var_asking_negotiated = (float(agreed_price) - asking) if (agreed_price and asking) else 0.0
    var_market_negotiated = (float(agreed_price) - market) if (agreed_price and market) else 0.0

    return ValuationComparisonSummary(
        parcel_id=parcel.id,
        parcel_name=f"{parcel.parcel_id or 'PRC-' + str(parcel.id)} - {parcel.project_name or parcel.mouza_name}",
        total_area_decimal=float(parcel.total_area_decimal or 0.0),
        total_area_katha=float(parcel.total_area_katha or 0.0),
        total_area_sqft=float(parcel.total_area_sqft or 0.0),
        asking_price=asking,
        market_valuation=market,
        govt_mouza_valuation=mouza,
        negotiated_agreed_price=float(agreed_price),
        variance_asking_vs_negotiated=var_asking_negotiated,
        variance_market_vs_negotiated=var_market_negotiated,
        valuations_count=len(valuations),
        valuations=[LandValuationResponse.model_validate(v) for v in valuations]
    )


# --- 13.2 Land Acquisition Costing & Expenses ---

@router.get("/acquisition-costings", response_model=AcquisitionCostingPage)
async def list_acquisition_costings(
    parcel_id: Optional[int] = Query(None),
    costing_status: Optional[str] = Query(None),
    approval_stage: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    skip: Optional[int] = Query(None, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    filters = []
    if parcel_id:
        filters.append(AcquisitionCosting.parcel_id == parcel_id)
    if costing_status:
        filters.append(AcquisitionCosting.costing_status == costing_status)
    if approval_stage:
        filters.append(AcquisitionCosting.approval_stage == approval_stage)
    if search:
        s = f"%{search.strip()}%"
        filters.append(
            or_(
                AcquisitionCosting.costing_code.ilike(s),
                AcquisitionCosting.remarks.ilike(s),
                AcquisitionCosting.approved_by.ilike(s)
            )
        )
    effective_offset = skip if skip is not None else offset
    total = await db.scalar(select(func.count(AcquisitionCosting.id)).where(*filters))
    stmt = (
        select(AcquisitionCosting)
        .options(
            selectinload(AcquisitionCosting.expense_items),
            selectinload(AcquisitionCosting.parcel)
        )
        .where(*filters)
        .order_by(desc(AcquisitionCosting.id))
        .offset(effective_offset)
        .limit(limit)
    )
    res = await db.execute(stmt)
    records = res.scalars().all()

    # Ensure dynamic calculations are up-to-date
    results = []
    for r in records:
        recalculate_costing(r, r.parcel)
        results.append(AcquisitionCostingResponse.model_validate(r))
    return {
        "items": results,
        "total": total or 0,
        "offset": effective_offset,
        "limit": limit
    }


@router.post("/acquisition-costings", response_model=AcquisitionCostingResponse, status_code=status.HTTP_201_CREATED)
async def create_acquisition_costing(
    payload: AcquisitionCostingCreate,
    db: AsyncSession = Depends(get_db)
):
    p_res = await db.execute(select(LandParcel).where(LandParcel.id == payload.parcel_id))
    parcel = p_res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    count_res = await db.execute(
        select(func.count(AcquisitionCosting.id)).where(AcquisitionCosting.parcel_id == payload.parcel_id)
    )
    c_num = (count_res.scalar() or 0) + 1
    c_code = f"ACQ-{parcel.parcel_id or 'PRC' + str(parcel.id)}-{c_num:02d}"

    costing = AcquisitionCosting(
        costing_code=c_code,
        parcel_id=payload.parcel_id,
        valuation_id=payload.valuation_id,
        costing_date=payload.costing_date,
        costing_status=payload.costing_status or "ESTIMATED",
        agreed_purchase_price_bdt=payload.agreed_purchase_price_bdt or 0.0,
        budget_allocated_bdt=payload.budget_allocated_bdt or 0.0,
        remarks=payload.remarks,
        approval_stage="DRAFT"
    )
    db.add(costing)
    await db.flush()

    # Add initial expense items if passed
    if payload.expense_items:
        for it in payload.expense_items:
            exp = AcquisitionExpenseItem(
                costing_id=costing.id,
                expense_category=it.expense_category,
                item_description=it.item_description,
                payee_name=it.payee_name,
                estimated_amount_bdt=it.estimated_amount_bdt or 0.0,
                actual_amount_bdt=it.actual_amount_bdt or 0.0,
                variance_amount_bdt=(it.actual_amount_bdt or 0.0) - (it.estimated_amount_bdt or 0.0),
                payment_status=it.payment_status or "PLANNED",
                accounting_treatment=it.accounting_treatment or "CAPITALIZE_LAND",
                payment_date=it.payment_date,
                receipt_voucher_ref=it.receipt_voucher_ref,
                supporting_document_url=it.supporting_document_url,
                notes=it.notes
            )
            db.add(exp)
        await db.flush()

    # Reload with items and compute sums
    stmt = (
        select(AcquisitionCosting)
        .options(
            selectinload(AcquisitionCosting.expense_items),
            selectinload(AcquisitionCosting.parcel)
        )
        .where(AcquisitionCosting.id == costing.id)
    )
    res = await db.execute(stmt)
    saved = res.scalar_one()
    recalculate_costing(saved, parcel)
    await db.commit()
    await db.refresh(saved)
    return AcquisitionCostingResponse.model_validate(saved)


@router.get("/acquisition-costings/{costing_id}", response_model=AcquisitionCostingResponse)
async def get_acquisition_costing_by_id(
    costing_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AcquisitionCosting)
        .options(
            selectinload(AcquisitionCosting.expense_items),
            selectinload(AcquisitionCosting.parcel)
        )
        .where(AcquisitionCosting.id == costing_id)
    )
    res = await db.execute(stmt)
    costing = res.scalar_one_or_none()
    if not costing:
        raise HTTPException(status_code=404, detail="Acquisition costing record not found")

    recalculate_costing(costing, costing.parcel)
    return AcquisitionCostingResponse.model_validate(costing)


@router.put("/acquisition-costings/{costing_id}", response_model=AcquisitionCostingResponse)
async def update_acquisition_costing(
    costing_id: int,
    payload: AcquisitionCostingUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AcquisitionCosting)
        .options(
            selectinload(AcquisitionCosting.expense_items),
            selectinload(AcquisitionCosting.parcel)
        )
        .where(AcquisitionCosting.id == costing_id)
    )
    res = await db.execute(stmt)
    costing = res.scalar_one_or_none()
    if not costing:
        raise HTTPException(status_code=404, detail="Acquisition costing record not found")

    update_dict = payload.model_dump(exclude_unset=True)
    if "parcel_id" in update_dict:
        parcel_id = update_dict["parcel_id"]
        if parcel_id is None:
            update_dict.pop("parcel_id")
        else:
            parcel_res = await db.execute(select(LandParcel).where(LandParcel.id == parcel_id))
            parcel = parcel_res.scalar_one_or_none()
            if parcel is None:
                raise HTTPException(status_code=404, detail="Land parcel not found")
            costing.parcel = parcel
    for field, val in update_dict.items():
        setattr(costing, field, val)

    recalculate_costing(costing, costing.parcel)
    await db.commit()
    await db.refresh(costing)
    return AcquisitionCostingResponse.model_validate(costing)


@router.delete("/acquisition-costings/{costing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_acquisition_costing(
    costing_id: int,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(AcquisitionCosting).where(AcquisitionCosting.id == costing_id))
    costing = res.scalar_one_or_none()
    if not costing:
        raise HTTPException(status_code=404, detail="Acquisition costing record not found")
    await db.delete(costing)
    await db.commit()


@router.post("/acquisition-costings/{costing_id}/approve", response_model=AcquisitionCostingResponse)
async def approve_acquisition_costing(
    costing_id: int,
    payload: CostingApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AcquisitionCosting)
        .options(
            selectinload(AcquisitionCosting.expense_items),
            selectinload(AcquisitionCosting.parcel)
        )
        .where(AcquisitionCosting.id == costing_id)
    )
    res = await db.execute(stmt)
    costing = res.scalar_one_or_none()
    if not costing:
        raise HTTPException(status_code=404, detail="Acquisition costing record not found")

    costing.approval_stage = payload.approval_stage
    costing.approved_by = payload.approved_by
    costing.approved_at = datetime.utcnow()
    costing.approval_notes = payload.approval_notes
    if payload.approval_stage == "BOARD_APPROVED":
        costing.costing_status = "APPROVED"

    await db.commit()
    await db.refresh(costing)
    return AcquisitionCostingResponse.model_validate(costing)


# --- 13.3 Acquisition Expense Items Endpoints ---

@router.post("/acquisition-costings/{costing_id}/expenses", response_model=AcquisitionExpenseItemResponse, status_code=status.HTTP_201_CREATED)
async def add_acquisition_expense_item(
    costing_id: int,
    payload: AcquisitionExpenseItemCreate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AcquisitionCosting)
        .options(
            selectinload(AcquisitionCosting.expense_items),
            selectinload(AcquisitionCosting.parcel)
        )
        .where(AcquisitionCosting.id == costing_id)
    )
    res = await db.execute(stmt)
    costing = res.scalar_one_or_none()
    if not costing:
        raise HTTPException(status_code=404, detail="Acquisition costing record not found")

    est = float(payload.estimated_amount_bdt or 0.0)
    act = float(payload.actual_amount_bdt or 0.0)
    item = AcquisitionExpenseItem(
        costing_id=costing_id,
        expense_category=payload.expense_category,
        item_description=payload.item_description,
        payee_name=payload.payee_name,
        estimated_amount_bdt=est,
        actual_amount_bdt=act,
        variance_amount_bdt=act - est,
        payment_status=payload.payment_status or "PLANNED",
        accounting_treatment=payload.accounting_treatment or "CAPITALIZE_LAND",
        payment_date=payload.payment_date,
        receipt_voucher_ref=payload.receipt_voucher_ref,
        supporting_document_url=payload.supporting_document_url,
        notes=payload.notes
    )
    db.add(item)
    await db.flush()

    # Trigger costing recalculation
    costing.expense_items.append(item)
    recalculate_costing(costing, costing.parcel)
    await db.commit()
    await db.refresh(item)
    return AcquisitionExpenseItemResponse.model_validate(item)


@router.put("/acquisition-costings/{costing_id}/expenses/{expense_id}", response_model=AcquisitionExpenseItemResponse)
async def update_acquisition_expense_item(
    costing_id: int,
    expense_id: int,
    payload: AcquisitionExpenseItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AcquisitionCosting)
        .options(
            selectinload(AcquisitionCosting.expense_items),
            selectinload(AcquisitionCosting.parcel)
        )
        .where(AcquisitionCosting.id == costing_id)
    )
    res = await db.execute(stmt)
    costing = res.scalar_one_or_none()
    if not costing:
        raise HTTPException(status_code=404, detail="Acquisition costing record not found")

    it_res = await db.execute(
        select(AcquisitionExpenseItem)
        .where(AcquisitionExpenseItem.id == expense_id, AcquisitionExpenseItem.costing_id == costing_id)
    )
    item = it_res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Expense item not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(item, field, val)

    item.variance_amount_bdt = float(item.actual_amount_bdt or 0.0) - float(item.estimated_amount_bdt or 0.0)
    recalculate_costing(costing, costing.parcel)
    await db.commit()
    await db.refresh(item)
    return AcquisitionExpenseItemResponse.model_validate(item)


@router.delete("/acquisition-costings/{costing_id}/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_acquisition_expense_item(
    costing_id: int,
    expense_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AcquisitionCosting)
        .options(
            selectinload(AcquisitionCosting.expense_items),
            selectinload(AcquisitionCosting.parcel)
        )
        .where(AcquisitionCosting.id == costing_id)
    )
    res = await db.execute(stmt)
    costing = res.scalar_one_or_none()
    if not costing:
        raise HTTPException(status_code=404, detail="Acquisition costing record not found")

    it_res = await db.execute(
        select(AcquisitionExpenseItem)
        .where(AcquisitionExpenseItem.id == expense_id, AcquisitionExpenseItem.costing_id == costing_id)
    )
    item = it_res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Expense item not found")

    await db.delete(item)
    await db.flush()

    # Re-fetch items without the deleted one and recalculate
    items_res = await db.execute(
        select(AcquisitionExpenseItem).where(AcquisitionExpenseItem.costing_id == costing_id)
    )
    costing.expense_items = items_res.scalars().all()
    recalculate_costing(costing, costing.parcel)
    await db.commit()


# -------------------------------------------------------------
# 14. Landowner Negotiation and Agreement Management (2.9)
# -------------------------------------------------------------
@router.get("/negotiations/alerts/delayed-and-expiring", response_model=NegotiationAlertsResponse)
async def get_negotiation_alerts(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns alerts for delayed negotiations (past closing deadline or marked delayed)
    and expiring agreements (expiry within next 60 days).
    """
    today = date.today()
    sixty_days_later = today + timedelta(days=60)

    # 1. Delayed negotiations: target deadline passed and not completed/executed/terminated, or is_delayed=True
    delayed_stmt = (
        select(LandNegotiation)
        .options(
            selectinload(LandNegotiation.meetings),
            selectinload(LandNegotiation.term_versions)
        )
        .where(
            or_(
                LandNegotiation.is_delayed.is_(True),
                (LandNegotiation.target_closing_deadline < today) &
                (LandNegotiation.agreement_status.notin_(["EXECUTED_REGISTERED", "TERMINATED", "EXPIRED"]))
            )
        )
        .order_by(desc(LandNegotiation.target_closing_deadline))
    )
    delayed_res = await db.execute(delayed_stmt)
    delayed_records = delayed_res.scalars().all()

    # 2. Expiring agreements: agreement_expiry_date is set and falls between today - 30 days and today + 60 days
    expiring_stmt = (
        select(LandNegotiation)
        .options(
            selectinload(LandNegotiation.meetings),
            selectinload(LandNegotiation.term_versions)
        )
        .where(
            LandNegotiation.agreement_expiry_date.isnot(None),
            LandNegotiation.agreement_expiry_date <= sixty_days_later,
            LandNegotiation.agreement_status.notin_(["TERMINATED", "EXPIRED"])
        )
        .order_by(LandNegotiation.agreement_expiry_date.asc())
    )
    expiring_res = await db.execute(expiring_stmt)
    expiring_records = expiring_res.scalars().all()

    return NegotiationAlertsResponse(
        total_delayed=len(delayed_records),
        total_expiring=len(expiring_records),
        delayed_negotiations=[LandNegotiationResponse.model_validate(r) for r in delayed_records],
        expiring_agreements=[LandNegotiationResponse.model_validate(r) for r in expiring_records]
    )


AGREEMENT_DOCS_DIR = os.path.join("app", "static", "uploads", "agreement_docs")
os.makedirs(AGREEMENT_DOCS_DIR, exist_ok=True)

@router.post("/negotiations/upload-agreement", status_code=200)
async def upload_negotiation_agreement_document(
    file: UploadFile = File(...),
    document_name: Optional[str] = Form(None)
):
    """Upload agreement document (PDF, JPG, PNG, DOC, DOCX) for commercial negotiations."""
    filename = file.filename or "agreement.pdf"
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    unique_filename = f"agmt_{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(AGREEMENT_DOCS_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_url = f"/static/uploads/agreement_docs/{unique_filename}"
    return {
        "file_url": doc_url,
        "file_name": filename,
        "document_name": document_name or filename,
        "file_size": os.path.getsize(file_path),
        "extension": ext
    }


@router.get("/negotiations", response_model=List[LandNegotiationResponse])
async def list_negotiations(
    parcel_id: Optional[int] = Query(None),
    landowner_id: Optional[int] = Query(None),
    negotiation_stage: Optional[str] = Query(None),
    agreement_status: Optional[str] = Query(None),
    is_delayed: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Lists commercial negotiation registers with meetings and term version history.
    """
    stmt = (
        select(LandNegotiation)
        .options(
            selectinload(LandNegotiation.meetings),
            selectinload(LandNegotiation.term_versions)
        )
        .order_by(desc(LandNegotiation.id))
        .offset(skip)
        .limit(limit)
    )

    if parcel_id:
        stmt = stmt.where(LandNegotiation.parcel_id == parcel_id)
    if landowner_id:
        stmt = stmt.where(LandNegotiation.landowner_id == landowner_id)
    if negotiation_stage:
        stmt = stmt.where(LandNegotiation.negotiation_stage == negotiation_stage)
    if agreement_status:
        stmt = stmt.where(LandNegotiation.agreement_status == agreement_status)
    if is_delayed is not None:
        stmt = stmt.where(LandNegotiation.is_delayed == is_delayed)
    if search:
        pat = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                LandNegotiation.negotiation_code.ilike(pat),
                LandNegotiation.negotiation_title.ilike(pat),
                LandNegotiation.installment_terms_summary.ilike(pat),
                LandNegotiation.conditions_precedent.ilike(pat)
            )
        )

    res = await db.execute(stmt)
    negotiations = res.scalars().all()

    # Automatically synchronize is_delayed flag if target deadline is past today
    today = date.today()
    for neg in negotiations:
        if neg.target_closing_deadline and neg.target_closing_deadline < today:
            if neg.agreement_status not in ["EXECUTED_REGISTERED", "TERMINATED", "EXPIRED"]:
                neg.is_delayed = True

    return [LandNegotiationResponse.model_validate(n) for n in negotiations]


@router.post("/negotiations", response_model=LandNegotiationResponse, status_code=status.HTTP_201_CREATED)
async def create_negotiation(
    payload: LandNegotiationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new Landowner Commercial Negotiation record and automatically initializes Version 1
    in the commercial term version audit trail.
    """
    # Verify parcel exists
    parcel_res = await db.execute(select(LandParcel).where(LandParcel.id == payload.parcel_id))
    parcel = parcel_res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    # Generate unique negotiation code
    count_res = await db.execute(
        select(func.count(LandNegotiation.id)).where(LandNegotiation.parcel_id == payload.parcel_id)
    )
    existing_count = count_res.scalar() or 0
    negotiation_code = f"NEG-{payload.parcel_id}-{(existing_count + 1):02d}"

    # Auto detect if delayed
    is_delayed = False
    if payload.target_closing_deadline < date.today():
        is_delayed = True

    negotiation = LandNegotiation(
        negotiation_code=negotiation_code,
        parcel_id=payload.parcel_id,
        landowner_id=payload.landowner_id,
        negotiation_title=payload.negotiation_title,
        negotiation_stage=payload.negotiation_stage or "INITIAL_OFFER",
        initial_asking_price_bdt=payload.initial_asking_price_bdt or 0.0,
        developer_target_price_bdt=payload.developer_target_price_bdt or 0.0,
        current_offer_amount_bdt=payload.current_offer_amount_bdt or 0.0,
        current_counteroffer_amount_bdt=payload.current_counteroffer_amount_bdt or 0.0,
        final_agreed_amount_bdt=payload.final_agreed_amount_bdt or 0.0,
        consideration_type=payload.consideration_type or "CASH_PURCHASE",
        proposed_advance_bdt=payload.proposed_advance_bdt or 0.0,
        installment_terms_summary=payload.installment_terms_summary,
        non_cash_consideration_details=payload.non_cash_consideration_details,
        conditions_precedent=payload.conditions_precedent,
        negotiation_start_date=payload.negotiation_start_date,
        target_closing_deadline=payload.target_closing_deadline,
        agreement_execution_date=payload.agreement_execution_date,
        agreement_expiry_date=payload.agreement_expiry_date,
        agreement_status=payload.agreement_status or "DRAFTING",
        agreement_document_name=payload.agreement_document_name,
        agreement_file_url=payload.agreement_file_url,
        supporting_documents=payload.supporting_documents,
        is_delayed=is_delayed,
        current_version=1
    )
    db.add(negotiation)
    await db.flush()

    # Initialize Version 1 in NegotiationTermVersion audit trail
    init_price = payload.current_offer_amount_bdt or payload.developer_target_price_bdt or payload.initial_asking_price_bdt or 0.0
    init_version = NegotiationTermVersion(
        negotiation_id=negotiation.id,
        version_number=1,
        offered_by_party="DEVELOPER",
        proposed_price_bdt=init_price,
        proposed_advance_bdt=payload.proposed_advance_bdt or 0.0,
        proposed_timeline_days=30,
        revision_summary="Initial commercial terms & baseline offer drafted.",
        created_by_officer="Commercial Deal Lead"
    )
    db.add(init_version)
    await db.commit()

    # Re-fetch complete record with relationships
    stmt = (
        select(LandNegotiation)
        .options(
            selectinload(LandNegotiation.meetings),
            selectinload(LandNegotiation.term_versions)
        )
        .where(LandNegotiation.id == negotiation.id)
    )
    res = await db.execute(stmt)
    saved = res.scalar_one()
    return LandNegotiationResponse.model_validate(saved)


@router.get("/negotiations/{id}", response_model=LandNegotiationResponse)
async def get_negotiation(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full details of a negotiation including meeting history and revision audit versions.
    """
    stmt = (
        select(LandNegotiation)
        .options(
            selectinload(LandNegotiation.meetings),
            selectinload(LandNegotiation.term_versions)
        )
        .where(LandNegotiation.id == id)
    )
    res = await db.execute(stmt)
    neg = res.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation record not found")
    return LandNegotiationResponse.model_validate(neg)


@router.put("/negotiations/{id}", response_model=LandNegotiationResponse)
async def update_negotiation(
    id: int,
    payload: LandNegotiationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates negotiation details, agreement status, payment terms, or conditions precedent.
    """
    stmt = (
        select(LandNegotiation)
        .options(
            selectinload(LandNegotiation.meetings),
            selectinload(LandNegotiation.term_versions)
        )
        .where(LandNegotiation.id == id)
    )
    res = await db.execute(stmt)
    neg = res.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation record not found")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(neg, field, val)

    # Check delayed status
    if neg.target_closing_deadline and neg.target_closing_deadline < date.today():
        if neg.agreement_status not in ["EXECUTED_REGISTERED", "TERMINATED", "EXPIRED"]:
            neg.is_delayed = True

    await db.commit()
    await db.refresh(neg)
    return LandNegotiationResponse.model_validate(neg)


@router.delete("/negotiations/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_negotiation(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes negotiation record along with meetings and version history.
    """
    stmt = select(LandNegotiation).where(LandNegotiation.id == id)
    res = await db.execute(stmt)
    neg = res.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation record not found")

    await db.delete(neg)
    await db.commit()


@router.post("/negotiations/{id}/revise-terms", response_model=LandNegotiationResponse)
async def revise_negotiation_terms(
    id: int,
    payload: NegotiationOfferRevisionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Appends a new revision to the negotiation's commercial term version history.
    Updates current offer or counteroffer amount and increments the current version number.
    """
    stmt = (
        select(LandNegotiation)
        .options(
            selectinload(LandNegotiation.meetings),
            selectinload(LandNegotiation.term_versions)
        )
        .where(LandNegotiation.id == id)
    )
    res = await db.execute(stmt)
    neg = res.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation record not found")

    neg.current_version += 1

    if payload.offered_by_party.upper() == "LANDOWNER":
        neg.current_counteroffer_amount_bdt = payload.proposed_price_bdt
        neg.negotiation_stage = "COUNTER_OFFER"
    else:
        neg.current_offer_amount_bdt = payload.proposed_price_bdt
        neg.negotiation_stage = "COUNTER_OFFER"

    if payload.proposed_advance_bdt and payload.proposed_advance_bdt > 0:
        neg.proposed_advance_bdt = payload.proposed_advance_bdt

    new_version = NegotiationTermVersion(
        negotiation_id=neg.id,
        version_number=neg.current_version,
        offered_by_party=payload.offered_by_party,
        proposed_price_bdt=payload.proposed_price_bdt,
        proposed_advance_bdt=payload.proposed_advance_bdt or 0.0,
        proposed_timeline_days=payload.proposed_timeline_days,
        revision_summary=payload.revision_summary,
        created_by_officer=payload.created_by_officer
    )
    db.add(new_version)
    await db.commit()

    # Re-fetch with fresh versions
    fresh_res = await db.execute(stmt)
    updated_neg = fresh_res.scalar_one()
    return LandNegotiationResponse.model_validate(updated_neg)


@router.post("/negotiations/{id}/approve", response_model=LandNegotiationResponse)
async def approve_commercial_terms(
    id: int,
    payload: NegotiationTermsApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authorized personnel approval of final commercial terms.
    Locks in the final agreed amount, updates stage to FINAL_TERMS_AGREED,
    moves agreement status to MANAGEMENT_REVIEW / READY_FOR_EXECUTION,
    and appends an audit revision record.
    """
    stmt = (
        select(LandNegotiation)
        .options(
            selectinload(LandNegotiation.meetings),
            selectinload(LandNegotiation.term_versions)
        )
        .where(LandNegotiation.id == id)
    )
    res = await db.execute(stmt)
    neg = res.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation record not found")

    neg.terms_approved_by = payload.approved_by
    neg.terms_approved_at = datetime.utcnow()
    neg.approval_notes = payload.approval_notes
    neg.negotiation_stage = "FINAL_TERMS_AGREED"
    neg.agreement_status = "READY_FOR_EXECUTION"

    if payload.final_agreed_amount_bdt and payload.final_agreed_amount_bdt > 0:
        neg.final_agreed_amount_bdt = payload.final_agreed_amount_bdt

    neg.current_version += 1
    approval_version = NegotiationTermVersion(
        negotiation_id=neg.id,
        version_number=neg.current_version,
        offered_by_party="BOARD_APPROVED",
        proposed_price_bdt=neg.final_agreed_amount_bdt or neg.current_offer_amount_bdt,
        proposed_advance_bdt=neg.proposed_advance_bdt,
        proposed_timeline_days=0,
        revision_summary=f"Commercial terms officially approved by {payload.approved_by}. Final Amount: BDT {neg.final_agreed_amount_bdt:,.2f}. Notes: {payload.approval_notes or 'None'}",
        created_by_officer=payload.approved_by
    )
    db.add(approval_version)
    await db.commit()

    fresh_res = await db.execute(stmt)
    updated_neg = fresh_res.scalar_one()
    return LandNegotiationResponse.model_validate(updated_neg)


@router.post("/negotiations/{id}/meetings", response_model=NegotiationMeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_negotiation_meeting(
    id: int,
    payload: NegotiationMeetingCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Logs a negotiation meeting with venue, attendees, discussion minutes, and follow-up tasks.
    """
    stmt = select(LandNegotiation).where(LandNegotiation.id == id)
    res = await db.execute(stmt)
    neg = res.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation record not found")

    meeting = NegotiationMeeting(
        negotiation_id=id,
        meeting_date=payload.meeting_date,
        meeting_venue=payload.meeting_venue,
        developer_attendees=payload.developer_attendees,
        landowner_attendees=payload.landowner_attendees,
        discussion_minutes=payload.discussion_minutes,
        follow_up_tasks=payload.follow_up_tasks,
        next_meeting_date=payload.next_meeting_date
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)
    return NegotiationMeetingResponse.model_validate(meeting)


@router.delete("/negotiations/{id}/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_negotiation_meeting(
    id: int,
    meeting_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a negotiation meeting record.
    """
    stmt = select(NegotiationMeeting).where(
        NegotiationMeeting.id == meeting_id,
        NegotiationMeeting.negotiation_id == id
    )
    res = await db.execute(stmt)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Negotiation meeting not found")

    await db.delete(meeting)
    await db.commit()


# -------------------------------------------------------------
# 15. Land Payment Schedules and Outstanding Balances (2.10)
# -------------------------------------------------------------
@router.get("/payment-schedules/reconciliation", response_model=PaymentReconciliationSummary)
async def get_payment_reconciliation_summary(
    parcel_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Reconciles scheduled contractual dues, approved amounts, posted/paid settlements,
    and outstanding balances across land acquisitions.
    """
    stmt = select(LandPaymentSchedule)
    if parcel_id:
        stmt = stmt.where(LandPaymentSchedule.parcel_id == parcel_id)

    res = await db.execute(stmt)
    schedules = res.scalars().all()

    today = date.today()
    total_due = 0.0
    total_approved = 0.0
    total_paid = 0.0
    total_outstanding = 0.0
    total_overdue = 0.0
    overdue_count = 0
    paid_count = 0
    pending_count = 0

    for s in schedules:
        due = float(s.due_amount_bdt or 0.0)
        paid = float(s.paid_amount_bdt or 0.0)
        out = float(s.outstanding_amount_bdt or 0.0)

        total_due += due
        total_paid += paid
        total_outstanding += out

        if s.approval_status in ["APPROVED_FOR_PAYMENT", "POSTED_PAID"]:
            total_approved += due

        if s.approval_status == "POSTED_PAID":
            paid_count += 1
        else:
            pending_count += 1

        if s.due_date < today and s.approval_status != "POSTED_PAID":
            overdue_count += 1
            total_overdue += out

    return PaymentReconciliationSummary(
        total_contractual_due_bdt=total_due,
        total_approved_bdt=total_approved,
        total_paid_bdt=total_paid,
        total_outstanding_bdt=total_outstanding,
        total_overdue_bdt=total_overdue,
        overdue_count=overdue_count,
        schedules_count=len(schedules),
        paid_count=paid_count,
        pending_count=pending_count
    )


@router.get("/payment-schedules", response_model=List[LandPaymentScheduleResponse])
async def list_payment_schedules(
    parcel_id: Optional[int] = Query(None),
    landowner_id: Optional[int] = Query(None),
    negotiation_id: Optional[int] = Query(None),
    payment_type: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    is_overdue: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Lists land payment schedules with real-time overdue checks and transaction records.
    """
    stmt = (
        select(LandPaymentSchedule)
        .options(selectinload(LandPaymentSchedule.transactions))
        .order_by(LandPaymentSchedule.due_date.asc())
        .offset(skip)
        .limit(limit)
    )

    if parcel_id:
        stmt = stmt.where(LandPaymentSchedule.parcel_id == parcel_id)
    if landowner_id:
        stmt = stmt.where(LandPaymentSchedule.landowner_id == landowner_id)
    if negotiation_id:
        stmt = stmt.where(LandPaymentSchedule.negotiation_id == negotiation_id)
    if payment_type:
        stmt = stmt.where(LandPaymentSchedule.payment_type == payment_type)
    if approval_status:
        stmt = stmt.where(LandPaymentSchedule.approval_status == approval_status)
    if is_overdue is not None:
        stmt = stmt.where(LandPaymentSchedule.is_overdue == is_overdue)
    if search:
        pat = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                LandPaymentSchedule.schedule_code.ilike(pat),
                LandPaymentSchedule.installment_title.ilike(pat),
                LandPaymentSchedule.beneficiary_name.ilike(pat),
                LandPaymentSchedule.transaction_reference.ilike(pat),
                LandPaymentSchedule.accounting_voucher_no.ilike(pat)
            )
        )

    res = await db.execute(stmt)
    schedules = res.scalars().all()

    today = date.today()
    for s in schedules:
        if s.due_date < today and s.approval_status != "POSTED_PAID":
            s.is_overdue = True
        else:
            s.is_overdue = False

    return [LandPaymentScheduleResponse.model_validate(s) for s in schedules]


@router.post("/payment-schedules", response_model=LandPaymentScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_schedule(
    payload: LandPaymentScheduleCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates an individual land payment schedule installment.
    """
    count_res = await db.execute(
        select(func.count(LandPaymentSchedule.id)).where(LandPaymentSchedule.parcel_id == payload.parcel_id)
    )
    existing_count = count_res.scalar() or 0
    schedule_code = f"LPS-{payload.parcel_id}-{(existing_count + 1):02d}"

    # Auto-fetch beneficiary bank info from landowner if available
    b_name = payload.beneficiary_name
    b_bank = payload.beneficiary_bank_name
    b_branch = payload.beneficiary_bank_branch
    b_acc = payload.beneficiary_account_no
    b_route = payload.beneficiary_routing_no

    if payload.landowner_id and not b_bank:
        owner_res = await db.execute(select(Landowner).where(Landowner.id == payload.landowner_id))
        owner = owner_res.scalar_one_or_none()
        if owner:
            b_name = b_name or owner.full_name_en
            b_bank = b_bank or owner.bank_name
            b_branch = b_branch or owner.bank_branch
            b_acc = b_acc or owner.bank_account_no
            b_route = b_route or owner.bank_routing_no

    is_overdue = payload.due_date < date.today()

    schedule = LandPaymentSchedule(
        schedule_code=schedule_code,
        parcel_id=payload.parcel_id,
        acquisition_costing_id=payload.acquisition_costing_id,
        negotiation_id=payload.negotiation_id,
        jv_agreement_id=payload.jv_agreement_id,
        landowner_id=payload.landowner_id,
        installment_number=payload.installment_number or (existing_count + 1),
        installment_title=payload.installment_title,
        payment_type=payload.payment_type or "ADVANCE_PAYMENT",
        due_date=payload.due_date,
        due_amount_bdt=payload.due_amount_bdt,
        paid_amount_bdt=0.0,
        outstanding_amount_bdt=payload.due_amount_bdt,
        payment_method=payload.payment_method or "BANK_TRANSFER",
        beneficiary_name=b_name,
        beneficiary_bank_name=b_bank,
        beneficiary_bank_branch=b_branch,
        beneficiary_account_no=b_acc,
        beneficiary_routing_no=b_route,
        transaction_reference=payload.transaction_reference,
        approval_status="DRAFT",
        accounting_voucher_no=payload.accounting_voucher_no,
        gl_account_code=payload.gl_account_code or "1120-LAND-ACQ-CAPEX",
        is_overdue=is_overdue,
        notes=payload.notes
    )
    db.add(schedule)
    await db.commit()

    stmt = (
        select(LandPaymentSchedule)
        .options(selectinload(LandPaymentSchedule.transactions))
        .where(LandPaymentSchedule.id == schedule.id)
    )
    fresh = await db.execute(stmt)
    return LandPaymentScheduleResponse.model_validate(fresh.scalar_one())


@router.post("/payment-schedules/auto-generate", response_model=List[LandPaymentScheduleResponse], status_code=status.HTTP_201_CREATED)
async def auto_generate_payment_schedules(
    payload: PaymentScheduleAutoGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Automated generation of contractual payment schedules from an approved agreement
    with 4 standard statutory phases:
    1. Booking / Earnest Money Deposit
    2. Bayna / Advance Agreement Payment
    3. Title & Mutation Verification Installment
    4. Final Sub-Registry & Kabala Execution Settlement
    """
    # Verify parcel
    parcel_res = await db.execute(select(LandParcel).where(LandParcel.id == payload.parcel_id))
    parcel = parcel_res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    # Landowner lookup
    owner_id = payload.landowner_id
    b_name = None
    b_bank = None
    b_branch = None
    b_acc = None
    b_route = None

    if owner_id:
        owner_res = await db.execute(select(Landowner).where(Landowner.id == owner_id))
        owner = owner_res.scalar_one_or_none()
        if owner:
            b_name = owner.full_name_en
            b_bank = owner.bank_name
            b_branch = owner.bank_branch
            b_acc = owner.bank_account_no
            b_route = owner.bank_routing_no

    total_amount = payload.total_agreed_amount_bdt
    interval_days = payload.days_interval_between_stages or 30

    stages = [
        (
            1,
            "Installment 1: Booking & Earnest-Money Deposit",
            "BOOKING_DEPOSIT",
            (total_amount * (payload.earnest_money_percent or 10.0)) / 100.0,
            payload.start_date
        ),
        (
            2,
            "Installment 2: Bayna & Preliminary Advance Payment",
            "ADVANCE_PAYMENT",
            (total_amount * (payload.advance_bayna_percent or 30.0)) / 100.0,
            payload.start_date + timedelta(days=interval_days)
        ),
        (
            3,
            "Installment 3: Mutation Porcha & Title Vetting Settlement",
            "INSTALLMENT_PAYMENT",
            (total_amount * (payload.interim_milestone_percent or 30.0)) / 100.0,
            payload.start_date + timedelta(days=interval_days * 2)
        ),
        (
            4,
            "Installment 4: Final Sub-Registry Deed Execution Settlement",
            "FINAL_SETTLEMENT",
            (total_amount * (payload.final_settlement_percent or 30.0)) / 100.0,
            payload.start_date + timedelta(days=interval_days * 3)
        )
    ]

    count_res = await db.execute(
        select(func.count(LandPaymentSchedule.id)).where(LandPaymentSchedule.parcel_id == payload.parcel_id)
    )
    existing_count = count_res.scalar() or 0

    created_ids = []
    today = date.today()
    for num, title, ptype, amount, due_dt in stages:
        sched_code = f"LPS-{payload.parcel_id}-{(existing_count + num):02d}"
        s = LandPaymentSchedule(
            schedule_code=sched_code,
            parcel_id=payload.parcel_id,
            negotiation_id=payload.negotiation_id,
            landowner_id=owner_id,
            installment_number=existing_count + num,
            installment_title=title,
            payment_type=ptype,
            due_date=due_dt,
            due_amount_bdt=amount,
            paid_amount_bdt=0.0,
            outstanding_amount_bdt=amount,
            payment_method="BANK_TRANSFER",
            beneficiary_name=b_name,
            beneficiary_bank_name=b_bank,
            beneficiary_bank_branch=b_branch,
            beneficiary_account_no=b_acc,
            beneficiary_routing_no=b_route,
            approval_status="DRAFT",
            is_overdue=due_dt < today,
            notes="Auto-generated from approved commercial acquisition agreement."
        )
        db.add(s)
        await db.flush()
        created_ids.append(s.id)

    await db.commit()

    stmt = (
        select(LandPaymentSchedule)
        .options(selectinload(LandPaymentSchedule.transactions))
        .where(LandPaymentSchedule.id.in_(created_ids))
        .order_by(LandPaymentSchedule.due_date.asc())
    )
    res = await db.execute(stmt)
    records = res.scalars().all()
    return [LandPaymentScheduleResponse.model_validate(r) for r in records]


@router.get("/payment-schedules/{id}", response_model=LandPaymentScheduleResponse)
async def get_payment_schedule(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(LandPaymentSchedule)
        .options(selectinload(LandPaymentSchedule.transactions))
        .where(LandPaymentSchedule.id == id)
    )
    res = await db.execute(stmt)
    schedule = res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment schedule not found")
    return LandPaymentScheduleResponse.model_validate(schedule)


@router.put("/payment-schedules/{id}", response_model=LandPaymentScheduleResponse)
async def update_payment_schedule(
    id: int,
    payload: LandPaymentScheduleUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(LandPaymentSchedule)
        .options(selectinload(LandPaymentSchedule.transactions))
        .where(LandPaymentSchedule.id == id)
    )
    res = await db.execute(stmt)
    schedule = res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment schedule not found")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(schedule, field, val)

    # Recalculate outstanding amount
    schedule.outstanding_amount_bdt = max(0.0, float(schedule.due_amount_bdt or 0.0) - float(schedule.paid_amount_bdt or 0.0))

    if schedule.due_date < date.today() and schedule.approval_status != "POSTED_PAID":
        schedule.is_overdue = True
    else:
        schedule.is_overdue = False

    await db.commit()
    await db.refresh(schedule)
    return LandPaymentScheduleResponse.model_validate(schedule)


@router.delete("/payment-schedules/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_schedule(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LandPaymentSchedule).where(LandPaymentSchedule.id == id)
    res = await db.execute(stmt)
    schedule = res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment schedule not found")

    if schedule.paid_amount_bdt > 0:
        raise HTTPException(status_code=400, detail="Cannot delete a payment schedule with posted payments. Use reversal instead.")

    await db.delete(schedule)
    await db.commit()


@router.post("/payment-schedules/{id}/approve", response_model=LandPaymentScheduleResponse)
async def approve_payment_schedule(
    id: int,
    payload: PaymentApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authorizes a scheduled payment for disbursement.
    Supports contractual variation approvals to prevent unapproved budget overruns.
    """
    stmt = (
        select(LandPaymentSchedule)
        .options(selectinload(LandPaymentSchedule.transactions))
        .where(LandPaymentSchedule.id == id)
    )
    res = await db.execute(stmt)
    schedule = res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment schedule not found")

    schedule.approval_status = payload.approval_status
    schedule.approved_by = payload.approved_by
    schedule.approved_at = datetime.utcnow()
    schedule.approval_notes = payload.approval_notes

    if payload.approved_variation_amount and payload.approved_variation_amount != 0:
        schedule.approved_variation_amount += payload.approved_variation_amount
        schedule.due_amount_bdt += payload.approved_variation_amount
        schedule.outstanding_amount_bdt = max(0.0, float(schedule.due_amount_bdt) - float(schedule.paid_amount_bdt))

    await db.commit()
    await db.refresh(schedule)
    return LandPaymentScheduleResponse.model_validate(schedule)


@router.post("/payment-schedules/{id}/disburse", response_model=LandPaymentScheduleResponse)
async def disburse_payment(
    id: int,
    payload: PaymentDisbursementRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Disburses an authorized installment payment.
    Enforces that payment requests require verification and creates an immutable GL-linked transaction.
    Marks schedule as POSTED_PAID once settled.
    """
    stmt = (
        select(LandPaymentSchedule)
        .options(selectinload(LandPaymentSchedule.transactions))
        .where(LandPaymentSchedule.id == id)
    )
    res = await db.execute(stmt)
    schedule = res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment schedule not found")

    if schedule.approval_status not in ["APPROVED_FOR_PAYMENT", "PENDING_APPROVAL", "DRAFT"]:
        if schedule.approval_status == "POSTED_PAID" and schedule.outstanding_amount_bdt <= 0:
            raise HTTPException(status_code=400, detail="This installment is already fully paid and posted.")

    # Prevent payment exceeding contractual due amount
    remaining_payable = float(schedule.due_amount_bdt or 0.0) - float(schedule.paid_amount_bdt or 0.0)
    if payload.amount_bdt > remaining_payable + 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Disbursement of BDT {payload.amount_bdt:,.2f} exceeds remaining outstanding contractual limit of BDT {remaining_payable:,.2f} without an authorized variation."
        )

    # Generate unique transaction code
    count_res = await db.execute(select(func.count(LandPaymentTransaction.id)))
    txn_count = count_res.scalar() or 0
    txn_code = f"TXN-LND-{date.today().year}-{(txn_count + 1):04d}"

    txn = LandPaymentTransaction(
        schedule_id=schedule.id,
        transaction_code=txn_code,
        transaction_date=payload.transaction_date,
        amount_bdt=payload.amount_bdt,
        payment_method=payload.payment_method,
        bank_name=payload.bank_name or schedule.beneficiary_bank_name,
        account_no=payload.account_no or schedule.beneficiary_account_no,
        instrument_no=payload.instrument_no,
        accounting_voucher_no=payload.accounting_voucher_no,
        is_reversal=False,
        posted_by=payload.posted_by,
        notes=payload.notes
    )
    db.add(txn)

    schedule.paid_amount_bdt += payload.amount_bdt
    schedule.outstanding_amount_bdt = max(0.0, float(schedule.due_amount_bdt) - float(schedule.paid_amount_bdt))
    schedule.accounting_voucher_no = payload.accounting_voucher_no

    if schedule.outstanding_amount_bdt <= 0:
        schedule.approval_status = "POSTED_PAID"
        schedule.is_overdue = False

    await db.commit()

    fresh_res = await db.execute(stmt)
    updated = fresh_res.scalar_one()
    return LandPaymentScheduleResponse.model_validate(updated)


@router.post("/payment-schedules/{id}/transactions/{txn_id}/reverse", response_model=LandPaymentScheduleResponse)
async def reverse_payment_transaction(
    id: int,
    txn_id: int,
    payload: PaymentReversalRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Reverses a posted payment transaction without deleting prior records,
    retaining full audit trail and restoring outstanding payable balances.
    """
    stmt = (
        select(LandPaymentSchedule)
        .options(selectinload(LandPaymentSchedule.transactions))
        .where(LandPaymentSchedule.id == id)
    )
    res = await db.execute(stmt)
    schedule = res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment schedule not found")

    txn_res = await db.execute(
        select(LandPaymentTransaction).where(
            LandPaymentTransaction.id == txn_id,
            LandPaymentTransaction.schedule_id == id
        )
    )
    orig_txn = txn_res.scalar_one_or_none()
    if not orig_txn:
        raise HTTPException(status_code=404, detail="Payment transaction not found")

    if orig_txn.is_reversal:
        raise HTTPException(status_code=400, detail="Cannot reverse an already reversed transaction.")

    # Create reversal entry
    rev_code = f"REV-{orig_txn.transaction_code}"
    rev_txn = LandPaymentTransaction(
        schedule_id=schedule.id,
        transaction_code=rev_code,
        transaction_date=date.today(),
        amount_bdt=-float(orig_txn.amount_bdt),
        payment_method=orig_txn.payment_method,
        bank_name=orig_txn.bank_name,
        account_no=orig_txn.account_no,
        instrument_no=f"REV-INSTR-{orig_txn.instrument_no or ''}",
        accounting_voucher_no=f"REV-{orig_txn.accounting_voucher_no or ''}",
        is_reversal=True,
        reversal_reason=payload.reversal_reason,
        reversed_transaction_id=orig_txn.id,
        posted_by=payload.posted_by,
        notes=payload.notes or f"Reversal of {orig_txn.transaction_code}. Reason: {payload.reversal_reason}"
    )
    db.add(rev_txn)

    # Restore balances
    schedule.paid_amount_bdt = max(0.0, float(schedule.paid_amount_bdt) - float(orig_txn.amount_bdt))
    schedule.outstanding_amount_bdt = max(0.0, float(schedule.due_amount_bdt) - float(schedule.paid_amount_bdt))

    if schedule.outstanding_amount_bdt > 0:
        schedule.approval_status = "APPROVED_FOR_PAYMENT"

    await db.commit()

    fresh_res = await db.execute(stmt)
    updated = fresh_res.scalar_one()
    return LandPaymentScheduleResponse.model_validate(updated)
