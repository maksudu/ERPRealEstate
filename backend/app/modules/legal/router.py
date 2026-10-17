import hashlib
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.modules.projects.models import AuthorityClearance, AuthorityClearanceCondition, Project
from app.modules.operations.models import CourtCase, CourtCaseDocument, CourtCaseHearing
from app.modules.legal.schemas import (
    ClearanceConditionBase,
    ClearanceConditionCreate,
    ClearanceConditionUpdate,
    ClearanceConditionResponse,
    AuthorityClearanceBase,
    AuthorityClearanceCreate,
    AuthorityClearanceUpdate,
    AuthorityClearanceResponse,
    ClearanceRenewalCalendarItem,
    CourtCaseDocumentBase,
    CourtCaseDocumentCreate,
    CourtCaseDocumentResponse,
    CourtCaseHearingBase,
    CourtCaseHearingCreate,
    CourtCaseHearingResponse,
    CourtCaseBase,
    CourtCaseCreate,
    CourtCaseUpdate,
    CourtCaseResponse,
    LegalComplianceMetrics,
)

router = APIRouter(prefix="/legal", tags=["Legal & Statutory Compliance Vault"])


# -------------------------------------------------------------
# 1. Executive Summary Metrics
# -------------------------------------------------------------
@router.get("/metrics", response_model=LegalComplianceMetrics)
async def get_legal_compliance_metrics(db: AsyncSession = Depends(get_db)):
    today = date.today()

    # Clearances metrics
    clearances_res = await db.execute(select(AuthorityClearance))
    all_clearances = clearances_res.scalars().all()
    total_permits = len(all_clearances)
    approved_permits = sum(1 for c in all_clearances if c.status == "APPROVED")
    
    expired_permits = sum(1 for c in all_clearances if c.expiry_date and c.expiry_date < today)
    expiring_soon_permits = sum(
        1 for c in all_clearances 
        if c.expiry_date and 0 <= (c.expiry_date - today).days <= (c.renewal_reminder_days or 30)
    )

    # Condition checklist metrics
    conditions_res = await db.execute(select(AuthorityClearanceCondition))
    all_conditions = conditions_res.scalars().all()
    total_conditions = len(all_conditions)
    complied_conditions = sum(1 for cond in all_conditions if cond.compliance_status in ("COMPLIED", "WAIVED"))
    compliance_pct = round((complied_conditions / total_conditions * 100), 2) if total_conditions > 0 else 100.0

    # Court Cases & Land Dispute metrics
    cases_res = await db.execute(select(CourtCase))
    all_cases = cases_res.scalars().all()
    active_cases = sum(1 for c in all_cases if c.status not in ("DECREE_FAVORABLE", "DISPOSED", "DISPOSED_COMPROMISED"))
    interim_stay_orders = sum(1 for c in all_cases if c.is_interim_stay_active)
    total_disputed_area = sum(float(c.disputed_area_decimals or 0) for c in all_cases)
    total_financial_exposure = sum(float(c.financial_claim_bdt or 0) for c in all_cases)

    return LegalComplianceMetrics(
        total_permits=total_permits,
        approved_permits=approved_permits,
        expiring_soon_permits=expiring_soon_permits,
        expired_permits=expired_permits,
        total_conditions=total_conditions,
        complied_conditions=complied_conditions,
        condition_compliance_percentage=compliance_pct,
        active_court_cases=active_cases,
        interim_stay_orders_active=interim_stay_orders,
        total_disputed_area_decimals=round(total_disputed_area, 4),
        total_financial_exposure_bdt=round(total_financial_exposure, 2)
    )


# -------------------------------------------------------------
# 2. Statutory Clearances & Building Sanctions
# -------------------------------------------------------------
@router.get("/permits", response_model=List[AuthorityClearanceResponse])
async def list_permits(
    project_id: Optional[int] = Query(None),
    authority_name: Optional[str] = Query(None),
    clearance_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AuthorityClearance)
        .options(selectinload(AuthorityClearance.conditions), selectinload(AuthorityClearance.project))
        .order_by(desc(AuthorityClearance.id))
    )
    if project_id:
        stmt = stmt.where(AuthorityClearance.project_id == project_id)
    if authority_name and authority_name != "ALL":
        stmt = stmt.where(AuthorityClearance.authority_name == authority_name)
    if clearance_type and clearance_type != "ALL":
        stmt = stmt.where(AuthorityClearance.clearance_type_id == clearance_type)
    if status_filter and status_filter != "ALL":
        stmt = stmt.where(AuthorityClearance.status == status_filter)

    res = await db.execute(stmt)
    clearances = res.scalars().all()
    today = date.today()

    results = []
    for cl in clearances:
        # Compute alert status and days to expiry
        days_left = None
        alert_status = "VALID"
        if cl.expiry_date:
            days_left = (cl.expiry_date - today).days
            if days_left < 0:
                alert_status = "EXPIRED"
            elif days_left <= (cl.renewal_reminder_days or 30):
                alert_status = "EXPIRING_SOON"
            else:
                alert_status = "VALID"
        
        conditions_list = cl.conditions or []
        complied = sum(1 for c in conditions_list if c.compliance_status in ("COMPLIED", "WAIVED"))

        results.append(
            AuthorityClearanceResponse(
                id=cl.id,
                project_id=cl.project_id,
                project_name=cl.project.project_name if cl.project else f"Project #{cl.project_id}",
                clearance_type_id=cl.clearance_type_id,
                authority_name=cl.authority_name or "RAJUK",
                reference_no=cl.reference_no,
                application_memo_no=cl.application_memo_no,
                approved_memo_no=cl.approved_memo_no,
                approval_date=cl.approval_date,
                expiry_date=cl.expiry_date,
                validity_months=cl.validity_months or 12,
                renewal_reminder_days=cl.renewal_reminder_days or 30,
                renewal_fee_bdt=cl.renewal_fee_bdt or Decimal("0.00"),
                renewal_alert_status=alert_status,
                days_to_expiry=days_left,
                sanctioned_floors=cl.sanctioned_floors,
                sanctioned_height_m=cl.sanctioned_height_m,
                contact_officer_name=cl.contact_officer_name,
                contact_officer_phone=cl.contact_officer_phone,
                status=cl.status,
                document_url=cl.document_url,
                remarks=cl.remarks,
                conditions_count=len(conditions_list),
                complied_conditions_count=complied,
                conditions=[ClearanceConditionResponse.model_validate(c) for c in conditions_list],
                created_at=cl.created_at,
                updated_at=cl.updated_at
            )
        )

    return results


@router.post("/permits", response_model=AuthorityClearanceResponse, status_code=status.HTTP_201_CREATED)
async def create_permit(payload: AuthorityClearanceCreate, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ref_no = payload.reference_no
    if not ref_no:
        ref_no = f"CLR-{payload.authority_name[:5].upper()}-{payload.project_id}-{datetime.now().strftime('%y%m%d%H%M')}"

    permit = AuthorityClearance(
        project_id=payload.project_id,
        clearance_type_id=payload.clearance_type_id,
        authority_name=payload.authority_name,
        reference_no=ref_no,
        application_memo_no=payload.application_memo_no,
        approved_memo_no=payload.approved_memo_no,
        approval_date=payload.approval_date,
        expiry_date=payload.expiry_date,
        validity_months=payload.validity_months,
        renewal_reminder_days=payload.renewal_reminder_days,
        renewal_fee_bdt=payload.renewal_fee_bdt,
        renewal_alert_status="VALID",
        sanctioned_floors=payload.sanctioned_floors,
        sanctioned_height_m=payload.sanctioned_height_m,
        contact_officer_name=payload.contact_officer_name,
        contact_officer_phone=payload.contact_officer_phone,
        status=payload.status,
        document_url=payload.document_url,
        remarks=payload.remarks
    )
    db.add(permit)
    await db.commit()
    await db.refresh(permit)

    return AuthorityClearanceResponse(
        id=permit.id,
        project_id=permit.project_id,
        project_name=project.project_name,
        clearance_type_id=permit.clearance_type_id,
        authority_name=permit.authority_name,
        reference_no=permit.reference_no,
        application_memo_no=permit.application_memo_no,
        approved_memo_no=permit.approved_memo_no,
        approval_date=permit.approval_date,
        expiry_date=permit.expiry_date,
        validity_months=permit.validity_months or 12,
        renewal_reminder_days=permit.renewal_reminder_days or 30,
        renewal_fee_bdt=permit.renewal_fee_bdt or Decimal("0.00"),
        renewal_alert_status="VALID",
        days_to_expiry=(permit.expiry_date - date.today()).days if permit.expiry_date else None,
        sanctioned_floors=permit.sanctioned_floors,
        sanctioned_height_m=permit.sanctioned_height_m,
        contact_officer_name=permit.contact_officer_name,
        contact_officer_phone=permit.contact_officer_phone,
        status=permit.status,
        document_url=permit.document_url,
        remarks=permit.remarks,
        conditions_count=0,
        complied_conditions_count=0,
        conditions=[],
        created_at=permit.created_at,
        updated_at=permit.updated_at
    )


@router.patch("/permits/{id}", response_model=AuthorityClearanceResponse)
async def update_permit(id: int, payload: AuthorityClearanceUpdate, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(AuthorityClearance)
        .options(selectinload(AuthorityClearance.conditions), selectinload(AuthorityClearance.project))
        .where(AuthorityClearance.id == id)
    )
    res = await db.execute(stmt)
    cl = res.scalar_one_or_none()
    if not cl:
        raise HTTPException(status_code=404, detail="Clearance record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(cl, k, v)

    await db.commit()
    await db.refresh(cl)

    days_left = (cl.expiry_date - date.today()).days if cl.expiry_date else None
    alert_status = "VALID"
    if days_left is not None:
        if days_left < 0:
            alert_status = "EXPIRED"
        elif days_left <= (cl.renewal_reminder_days or 30):
            alert_status = "EXPIRING_SOON"

    conditions_list = cl.conditions or []
    complied = sum(1 for c in conditions_list if c.compliance_status in ("COMPLIED", "WAIVED"))

    return AuthorityClearanceResponse(
        id=cl.id,
        project_id=cl.project_id,
        project_name=cl.project.project_name if cl.project else f"Project #{cl.project_id}",
        clearance_type_id=cl.clearance_type_id,
        authority_name=cl.authority_name,
        reference_no=cl.reference_no,
        application_memo_no=cl.application_memo_no,
        approved_memo_no=cl.approved_memo_no,
        approval_date=cl.approval_date,
        expiry_date=cl.expiry_date,
        validity_months=cl.validity_months or 12,
        renewal_reminder_days=cl.renewal_reminder_days or 30,
        renewal_fee_bdt=cl.renewal_fee_bdt or Decimal("0.00"),
        renewal_alert_status=alert_status,
        days_to_expiry=days_left,
        sanctioned_floors=cl.sanctioned_floors,
        sanctioned_height_m=cl.sanctioned_height_m,
        contact_officer_name=cl.contact_officer_name,
        contact_officer_phone=cl.contact_officer_phone,
        status=cl.status,
        document_url=cl.document_url,
        remarks=cl.remarks,
        conditions_count=len(conditions_list),
        complied_conditions_count=complied,
        conditions=[ClearanceConditionResponse.model_validate(c) for c in conditions_list],
        created_at=cl.created_at,
        updated_at=cl.updated_at
    )


# -------------------------------------------------------------
# 3. Clearance Conditions Checklist
# -------------------------------------------------------------
@router.get("/permits/{id}/conditions", response_model=List[ClearanceConditionResponse])
async def list_permit_conditions(id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(AuthorityClearanceCondition)
        .where(AuthorityClearanceCondition.clearance_id == id)
        .order_by(AuthorityClearanceCondition.id)
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/permits/{id}/conditions", response_model=ClearanceConditionResponse, status_code=status.HTTP_201_CREATED)
async def add_permit_condition(id: int, payload: ClearanceConditionBase, db: AsyncSession = Depends(get_db)):
    cl = await db.get(AuthorityClearance, id)
    if not cl:
        raise HTTPException(status_code=404, detail="Clearance permit not found")

    cond = AuthorityClearanceCondition(
        clearance_id=id,
        condition_code=payload.condition_code,
        condition_title=payload.condition_title,
        condition_category=payload.condition_category,
        mandatory_level=payload.mandatory_level,
        compliance_status=payload.compliance_status,
        compliance_date=payload.compliance_date,
        verified_by_officer=payload.verified_by_officer,
        evidence_doc_url=payload.evidence_doc_url,
        remarks=payload.remarks
    )
    db.add(cond)
    await db.commit()
    await db.refresh(cond)
    return cond


@router.patch("/permits/conditions/{cond_id}", response_model=ClearanceConditionResponse)
async def update_permit_condition(cond_id: int, payload: ClearanceConditionUpdate, db: AsyncSession = Depends(get_db)):
    cond = await db.get(AuthorityClearanceCondition, cond_id)
    if not cond:
        raise HTTPException(status_code=404, detail="Condition record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(cond, k, v)

    await db.commit()
    await db.refresh(cond)
    return cond


# -------------------------------------------------------------
# 4. Renewal Calendar & Automated Expiration Reminders
# -------------------------------------------------------------
@router.get("/permits/renewal-calendar", response_model=List[ClearanceRenewalCalendarItem])
async def get_renewal_calendar(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(AuthorityClearance)
        .options(selectinload(AuthorityClearance.project))
        .where(AuthorityClearance.expiry_date.isnot(None))
        .order_by(AuthorityClearance.expiry_date.asc())
    )
    res = await db.execute(stmt)
    clearances = res.scalars().all()
    today = date.today()

    items = []
    for cl in clearances:
        days = (cl.expiry_date - today).days
        urgency = "NORMAL_VALID"
        if days < 0:
            urgency = "CRITICAL_EXPIRED"
        elif days <= 15:
            urgency = "URGENT_15_DAYS"
        elif days <= 30:
            urgency = "WARNING_30_DAYS"

        items.append(
            ClearanceRenewalCalendarItem(
                id=cl.id,
                project_id=cl.project_id,
                project_name=cl.project.project_name if cl.project else f"Project #{cl.project_id}",
                authority_name=cl.authority_name or "RAJUK",
                clearance_type_id=cl.clearance_type_id,
                reference_no=cl.reference_no,
                approved_memo_no=cl.approved_memo_no,
                expiry_date=cl.expiry_date,
                days_remaining=days,
                alert_urgency=urgency,
                renewal_fee_bdt=cl.renewal_fee_bdt or Decimal("0.00"),
                contact_officer_name=cl.contact_officer_name,
                contact_officer_phone=cl.contact_officer_phone
            )
        )
    return items


# -------------------------------------------------------------
# 5. Court Litigation & Land Dispute Tracking
# -------------------------------------------------------------
@router.get("/cases", response_model=List[CourtCaseResponse])
async def list_cases(
    project_id: Optional[int] = Query(None),
    case_type: Optional[str] = Query(None),
    dispute_category: Optional[str] = Query(None),
    is_stay_active: Optional[bool] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(CourtCase)
        .options(selectinload(CourtCase.documents), selectinload(CourtCase.hearings), selectinload(CourtCase.project))
        .order_by(desc(CourtCase.id))
    )
    if project_id:
        stmt = stmt.where(CourtCase.project_id == project_id)
    if case_type and case_type != "ALL":
        stmt = stmt.where(CourtCase.case_type == case_type)
    if dispute_category and dispute_category != "ALL":
        stmt = stmt.where(CourtCase.dispute_category == dispute_category)
    if is_stay_active is not None:
        stmt = stmt.where(CourtCase.is_interim_stay_active == is_stay_active)
    if status_filter and status_filter != "ALL":
        stmt = stmt.where(CourtCase.status == status_filter)

    res = await db.execute(stmt)
    cases = res.scalars().all()

    results = []
    for c in cases:
        docs = c.documents or []
        hearings = c.hearings or []
        results.append(
            CourtCaseResponse(
                id=c.id,
                project_id=c.project_id,
                project_name=c.project.project_name if c.project else "General Land Parcel",
                case_type=c.case_type,
                case_number=c.case_number,
                concerned_court=c.concerned_court,
                legal_act_section=c.legal_act_section,
                dispute_category=c.dispute_category,
                land_mouza=c.land_mouza,
                cs_rs_bs_plot_no=c.cs_rs_bs_plot_no,
                disputed_area_decimals=c.disputed_area_decimals or Decimal("0.0000"),
                plaintiff=c.plaintiff,
                defendant=c.defendant,
                appointed_advocate=c.appointed_advocate,
                advocate_chamber=c.advocate_chamber,
                advocate_contact_phone=c.advocate_contact_phone,
                advocate_email=c.advocate_email,
                is_interim_stay_active=c.is_interim_stay_active,
                stay_order_details=c.stay_order_details,
                stay_order_granted_date=c.stay_order_granted_date,
                stay_order_valid_until=c.stay_order_valid_until,
                estimated_risk_level=c.estimated_risk_level or "MEDIUM",
                financial_claim_bdt=c.financial_claim_bdt or Decimal("0.00"),
                next_hearing_date=c.next_hearing_date,
                status=c.status,
                decree_outcome=c.decree_outcome,
                case_summary=c.case_summary,
                documents_count=len(docs),
                hearings_count=len(hearings),
                documents=[CourtCaseDocumentResponse.model_validate(d) for d in docs],
                hearings=[CourtCaseHearingResponse.model_validate(h) for h in hearings],
                created_at=c.created_at,
                updated_at=c.updated_at
            )
        )
    return results


@router.post("/cases", response_model=CourtCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(payload: CourtCaseCreate, db: AsyncSession = Depends(get_db)):
    case = CourtCase(**payload.model_dump())
    db.add(case)
    await db.commit()
    await db.refresh(case)

    project_name = None
    if case.project_id:
        p = await db.get(Project, case.project_id)
        if p:
            project_name = p.project_name

    return CourtCaseResponse(
        id=case.id,
        project_id=case.project_id,
        project_name=project_name or "General Land Parcel",
        case_type=case.case_type,
        case_number=case.case_number,
        concerned_court=case.concerned_court,
        legal_act_section=case.legal_act_section,
        dispute_category=case.dispute_category,
        land_mouza=case.land_mouza,
        cs_rs_bs_plot_no=case.cs_rs_bs_plot_no,
        disputed_area_decimals=case.disputed_area_decimals or Decimal("0.0000"),
        plaintiff=case.plaintiff,
        defendant=case.defendant,
        appointed_advocate=case.appointed_advocate,
        advocate_chamber=case.advocate_chamber,
        advocate_contact_phone=case.advocate_contact_phone,
        advocate_email=case.advocate_email,
        is_interim_stay_active=case.is_interim_stay_active,
        stay_order_details=case.stay_order_details,
        stay_order_granted_date=case.stay_order_granted_date,
        stay_order_valid_until=case.stay_order_valid_until,
        estimated_risk_level=case.estimated_risk_level,
        financial_claim_bdt=case.financial_claim_bdt,
        next_hearing_date=case.next_hearing_date,
        status=case.status,
        decree_outcome=case.decree_outcome,
        case_summary=case.case_summary,
        documents_count=0,
        hearings_count=0,
        documents=[],
        hearings=[],
        created_at=case.created_at,
        updated_at=case.updated_at
    )


@router.get("/cases/{id}", response_model=CourtCaseResponse)
async def get_case_details(id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(CourtCase)
        .options(selectinload(CourtCase.documents), selectinload(CourtCase.hearings), selectinload(CourtCase.project))
        .where(CourtCase.id == id)
    )
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Court case record not found")

    docs = case.documents or []
    hearings = case.hearings or []
    return CourtCaseResponse(
        id=case.id,
        project_id=case.project_id,
        project_name=case.project.project_name if case.project else "General Land Parcel",
        case_type=case.case_type,
        case_number=case.case_number,
        concerned_court=case.concerned_court,
        legal_act_section=case.legal_act_section,
        dispute_category=case.dispute_category,
        land_mouza=case.land_mouza,
        cs_rs_bs_plot_no=case.cs_rs_bs_plot_no,
        disputed_area_decimals=case.disputed_area_decimals or Decimal("0.0000"),
        plaintiff=case.plaintiff,
        defendant=case.defendant,
        appointed_advocate=case.appointed_advocate,
        advocate_chamber=case.advocate_chamber,
        advocate_contact_phone=case.advocate_contact_phone,
        advocate_email=case.advocate_email,
        is_interim_stay_active=case.is_interim_stay_active,
        stay_order_details=case.stay_order_details,
        stay_order_granted_date=case.stay_order_granted_date,
        stay_order_valid_until=case.stay_order_valid_until,
        estimated_risk_level=case.estimated_risk_level,
        financial_claim_bdt=case.financial_claim_bdt,
        next_hearing_date=case.next_hearing_date,
        status=case.status,
        decree_outcome=case.decree_outcome,
        case_summary=case.case_summary,
        documents_count=len(docs),
        hearings_count=len(hearings),
        documents=[CourtCaseDocumentResponse.model_validate(d) for d in docs],
        hearings=[CourtCaseHearingResponse.model_validate(h) for h in hearings],
        created_at=case.created_at,
        updated_at=case.updated_at
    )


@router.patch("/cases/{id}", response_model=CourtCaseResponse)
async def update_case(id: int, payload: CourtCaseUpdate, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(CourtCase)
        .options(selectinload(CourtCase.documents), selectinload(CourtCase.hearings), selectinload(CourtCase.project))
        .where(CourtCase.id == id)
    )
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Court case not found")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(case, k, v)

    await db.commit()
    await db.refresh(case)

    docs = case.documents or []
    hearings = case.hearings or []
    return CourtCaseResponse(
        id=case.id,
        project_id=case.project_id,
        project_name=case.project.project_name if case.project else "General Land Parcel",
        case_type=case.case_type,
        case_number=case.case_number,
        concerned_court=case.concerned_court,
        legal_act_section=case.legal_act_section,
        dispute_category=case.dispute_category,
        land_mouza=case.land_mouza,
        cs_rs_bs_plot_no=case.cs_rs_bs_plot_no,
        disputed_area_decimals=case.disputed_area_decimals or Decimal("0.0000"),
        plaintiff=case.plaintiff,
        defendant=case.defendant,
        appointed_advocate=case.appointed_advocate,
        advocate_chamber=case.advocate_chamber,
        advocate_contact_phone=case.advocate_contact_phone,
        advocate_email=case.advocate_email,
        is_interim_stay_active=case.is_interim_stay_active,
        stay_order_details=case.stay_order_details,
        stay_order_granted_date=case.stay_order_granted_date,
        stay_order_valid_until=case.stay_order_valid_until,
        estimated_risk_level=case.estimated_risk_level,
        financial_claim_bdt=case.financial_claim_bdt,
        next_hearing_date=case.next_hearing_date,
        status=case.status,
        decree_outcome=case.decree_outcome,
        case_summary=case.case_summary,
        documents_count=len(docs),
        hearings_count=len(hearings),
        documents=[CourtCaseDocumentResponse.model_validate(d) for d in docs],
        hearings=[CourtCaseHearingResponse.model_validate(h) for h in hearings],
        created_at=case.created_at,
        updated_at=case.updated_at
    )


# -------------------------------------------------------------
# 6. Digital Safe Document Archive
# -------------------------------------------------------------
@router.get("/cases/{id}/documents", response_model=List[CourtCaseDocumentResponse])
async def list_case_documents(id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(CourtCaseDocument)
        .where(CourtCaseDocument.case_id == id)
        .order_by(desc(CourtCaseDocument.id))
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/cases/{id}/documents", response_model=CourtCaseDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_safe_document(id: int, payload: CourtCaseDocumentBase, db: AsyncSession = Depends(get_db)):
    case = await db.get(CourtCase, id)
    if not case:
        raise HTTPException(status_code=404, detail="Court case record not found")

    # Generate integrity SHA-256 hash if absent
    safe_hash = payload.digital_safe_hash
    if not safe_hash:
        raw = f"{payload.document_title}:{payload.document_code}:{datetime.now().isoformat()}"
        safe_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()

    doc = CourtCaseDocument(
        case_id=id,
        document_code=payload.document_code,
        document_category=payload.document_category,
        document_title=payload.document_title,
        certified_copy_no=payload.certified_copy_no,
        issue_or_filing_date=payload.issue_or_filing_date,
        issuing_authority_or_court=payload.issuing_authority_or_court,
        file_url=payload.file_url,
        file_size_kb=payload.file_size_kb,
        digital_safe_hash=safe_hash,
        uploaded_by_name=payload.uploaded_by_name or "Legal Officer",
        is_confidential=payload.is_confidential,
        summary_notes=payload.summary_notes
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


# -------------------------------------------------------------
# 7. Court Hearing Diary & Next Hearing Dates
# -------------------------------------------------------------
@router.get("/cases/{id}/hearings", response_model=List[CourtCaseHearingResponse])
async def list_case_hearings(id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(CourtCaseHearing)
        .where(CourtCaseHearing.case_id == id)
        .order_by(desc(CourtCaseHearing.hearing_date))
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/cases/{id}/hearings", response_model=CourtCaseHearingResponse, status_code=status.HTTP_201_CREATED)
async def record_case_hearing(id: int, payload: CourtCaseHearingBase, db: AsyncSession = Depends(get_db)):
    case = await db.get(CourtCase, id)
    if not case:
        raise HTTPException(status_code=404, detail="Court case record not found")

    hearing = CourtCaseHearing(
        case_id=id,
        hearing_date=payload.hearing_date,
        presiding_judge=payload.presiding_judge,
        court_bench=payload.court_bench,
        summary_of_proceedings=payload.summary_of_proceedings,
        order_passed=payload.order_passed,
        next_hearing_date=payload.next_hearing_date,
        attended_advocate=payload.attended_advocate,
        action_items=payload.action_items
    )
    db.add(hearing)

    # Automatically advance next_hearing_date on the parent case record
    if payload.next_hearing_date:
        case.next_hearing_date = payload.next_hearing_date

    # If order passed was stay order extended or granted
    if payload.order_passed and "STAY" in payload.order_passed.upper():
        case.is_interim_stay_active = True
        case.status = "STAY_ORDER_GRANTED"

    await db.commit()
    await db.refresh(hearing)
    return hearing
