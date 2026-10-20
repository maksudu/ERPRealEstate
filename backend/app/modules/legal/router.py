import hashlib
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, func, or_, select
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
    LegalAuditResponse,
    LegalAuditPage,
    LegalDashboardResponse,
    LegalRecordCreate,
    LegalRecordPage,
    LegalRecordResponse,
    LegalRecordUpdate,
)
from app.modules.legal.models import LegalAuditEvent, LegalComplianceRecord
from app.modules.lookups.models import LookupCategory, LookupItem
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User

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


LEGAL_AREAS = (
    "land_title", "registered_record", "developer_registration", "land_use_clearance",
    "approval_condition", "noc_correspondence", "sale_transfer", "litigation_notice",
    "document_archive", "calendar_reminder", "approval_workflow", "compliance_report",
)
LEGAL_LOOKUP_CATEGORIES = {
    "LEGAL_RECORD_STATUS": "Legal record status",
    "LEGAL_REVIEW_OUTCOME": "Legal review outcomes",
    "LEGAL_RECORD_TYPE": "Registered land record types",
    "LEGAL_ENTITY": "Company and legal entities",
    "LEGAL_REGISTRATION_TYPE": "Business registrations and licences",
    "LEGAL_APPLICABLE_TERRITORY": "Registration territories",
    "LEGAL_RESPONSIBLE_DEPARTMENT": "Responsible departments",
    "LEGAL_RESPONSIBLE_OFFICER": "Responsible officers and task owners",
    "DEVELOPER_REGISTRATION_STATUS": "Developer registration lifecycle statuses",
    "LEGAL_NOTIFICATION_CHANNEL": "Reminder notification channels",
    "LEGAL_DEED_TYPE": "Deed classifications",
    "LEGAL_APPROVAL_CATEGORY": "Project approval categories",
    "LEGAL_APPROVAL_STATUS": "Approval workflow statuses",
    "LEGAL_CONDITION_TRACKING_STATUS": "Approval condition tracking statuses",
    "LEGAL_LAND_OFFICE": "Registration and land offices",
    "LEGAL_REVIEW_STATUS": "Legal review statuses",
    "LEGAL_REGISTRATION_VERIFICATION": "Deed registration verification outcomes",
    "LEGAL_SURVEY_RECORD_TYPE": "Survey and khatian record types",
    "LEGAL_MUTATION_APPLICATION_STATUS": "Mutation application statuses",
    "LEGAL_MUTATION_OUTCOME": "Final mutation outcomes",
    "LEGAL_TAX_RECONCILIATION_STATUS": "Land development tax reconciliation statuses",
    "LEGAL_LAND_USE_TYPE": "Land-use classifications",
    "LEGAL_CONDITION_STATUS": "Approval condition statuses",
    "LEGAL_CORRESPONDENCE_TYPE": "Authority correspondence types",
    "LEGAL_CORRESPONDENCE_DIRECTION": "Incoming and outgoing correspondence directions",
    "LEGAL_CORRESPONDENCE_STAGE": "Correspondence workflow stages",
    "LEGAL_SUBMISSION_METHOD": "Correspondence submission methods",
    "LEGAL_EXTERNAL_ORGANIZATION": "External organizations and counterparties",
    "LEGAL_NOC_CATEGORY": "Project-specific NOC categories",
    "LEGAL_AGREEMENT_TYPE": "Customer agreement types",
    "LEGAL_SALE_RECORD_KIND": "Agreement and controlled change record types",
    "LEGAL_SALE_AGREEMENT_STAGE": "Customer agreement workflow stages",
    "LEGAL_SALE_EXECUTION_STATUS": "Agreement execution statuses",
    "LEGAL_SALE_TRANSFER_STAGE": "Transfer and cancellation workflow stages",
    "LEGAL_SALE_FINANCE_STATUS": "Contract financial clearance statuses",
    "LEGAL_SALE_CHANGE_TYPE": "Contract amendment and transfer action types",
    "LEGAL_AUTHORIZED_DECISION": "Authorized legal and management decisions",
    "LEGAL_CASE_WORKFLOW_STAGE": "Litigation workflow stages",
    "LEGAL_CASE_STATUS": "Litigation case statuses",
    "LEGAL_NOTICE_TYPE": "Legal notice classifications",
    "LEGAL_NOTICE_SERVICE_METHOD": "Notice service and dispatch methods",
    "LEGAL_NOTICE_RESPONSE_STATUS": "Legal notice response statuses",
    "LEGAL_TRANSFER_STATUS": "Transfer statuses",
    "LEGAL_RISK_LEVEL": "Legal risk classifications",
    "LEGAL_DOCUMENT_TYPE": "Legal archive document types",
    "LEGAL_CONFIDENTIALITY": "Archive confidentiality classifications",
    "LEGAL_REMINDER_TYPE": "Compliance reminder types",
    "LEGAL_REPEAT_RULE": "Reminder recurrence rules",
    "LEGAL_WORKFLOW_TYPE": "Legal workflow classifications",
    "LEGAL_APPROVAL_STAGE": "Legal approval stages",
    "LEGAL_REPORT_TYPE": "Compliance report types",
    "STATUTORY_AUTHORITY": "Authorities and registering offices",
    "CLEARANCE_CONDITION_CATEGORY": "Clearance condition classifications",
    "CLEARANCE_MANDATORY_LEVEL": "Condition severity classifications",
    "CLEARANCE_CONDITION_STATUS": "Condition compliance statuses",
    "CLEARANCE_PERMIT_TYPE": "Clearance and permit types",
    "CLEARANCE_STATUS": "Clearance workflow statuses",
    "COURT_NAME": "Courts and dispute forums",
    "LEGAL_ACT_SECTION": "Legal acts and sections",
    "SAFE_DOCUMENT_CATEGORY": "Legal archive classifications",
}
TERMINAL_LEGAL_STATUSES = {"closed", "complete", "completed", "approved", "cleared", "rejected", "dismissed", "archived", "fulfilled", "complied", "waived"}


def _approval_open_condition_counts(approval: LegalComplianceRecord, records: list[LegalComplianceRecord], today: date) -> tuple[int, int]:
    data = approval.data or {}
    references = {str(approval.id)}
    if approval.reference_no:
        references.add(str(approval.reference_no).strip())
    for key in ("approval_number", "approved_memo_no"):
        if data.get(key):
            references.add(str(data[key]).strip())
    linked = [
        item for item in records
        if item.area == "approval_condition"
        and str((item.data or {}).get("approval_reference", "")).strip() in references
    ]
    open_items = [item for item in linked if (item.status or "").strip().lower() not in TERMINAL_LEGAL_STATUSES]
    obligations = data.get("conditions") if isinstance(data.get("conditions"), list) else []
    untracked = max(0, len(obligations) - len(linked))
    overdue = sum(1 for item in open_items if item.due_date and item.due_date < today)
    if untracked:
        linked_text = {str((item.data or {}).get("condition_text", "")).strip() for item in linked}
        for obligation in obligations:
            if not isinstance(obligation, dict) or str(obligation.get("description", "")).strip() in linked_text:
                continue
            try:
                deadline = date.fromisoformat(str(obligation.get("deadline", "")))
                overdue += int(deadline < today)
            except ValueError:
                pass
    return len(open_items) + untracked, overdue


def _record_snapshot(record: LegalComplianceRecord) -> dict:
    return {
        "id": record.id,
        "area": record.area,
        "title": record.title,
        "reference_no": record.reference_no,
        "project_id": record.project_id,
        "status": record.status,
        "due_date": record.due_date.isoformat() if record.due_date else None,
        "data": record.data or {},
    }


LEGAL_DEFAULT_LOOKUP_ITEMS = {
    "LEGAL_RECORD_STATUS": [
        ("DRAFT", "Draft / খসড়া"),
        ("IN_REVIEW", "In Legal Review / আইনি পর্যালোচনায়"),
        ("VERIFIED", "Verified / যাচাইকৃত"),
        ("DISCREPANCY_FLAGGED", "Discrepancy Flagged / অমিল শনাক্ত"),
        ("RECTIFICATION_REQUIRED", "Rectification Required / সংশোধন প্রয়োজন"),
        ("CLEARED", "Cleared / ছাড়পত্র প্রাপ্ত"),
        ("CLOSED", "Closed / সমাপ্ত"),
    ],
    "LEGAL_REVIEW_OUTCOME": [
        ("CLEARED", "Cleared without reservation"),
        ("CONDITIONAL_CLEARANCE", "Conditional clearance with undertakings"),
        ("OBJECTIONS_RAISED", "Objections raised / defective title chain"),
        ("REJECTED", "Rejected by legal counsel"),
        ("PENDING_DOCUMENTS", "Pending certified documents from Sub-Registry"),
    ],
    "LEGAL_RECORD_TYPE": [
        ("DEED", "Saf Kabala / Title Deed (বিক্রয় দলিল)"),
        ("KHATIAN", "Khatian / Record of Rights (খতিয়ান/পর্চা)"),
        ("MUTATION", "Mutation / Namjari (নামজারি দাখিলা)"),
        ("LAND_DEVELOPMENT_TAX", "Land Development Tax / Dakhila (ভূমি উন্নয়ন কর)"),
    ],
    "LEGAL_ENTITY": [
        ("BLUEOCEANS_HOLDINGS", "BlueOceans Holdings Ltd"),
        ("BLUEOCEANS_PROPERTIES", "BlueOceans Properties Ltd"),
        ("BLUEOCEANS_DEVELOPERS", "BlueOceans Real Estate & Developers"),
        ("PROJECT_SPV", "Special Purpose Vehicle (SPV) Entity"),
    ],
    "LEGAL_REGISTRATION_TYPE": [
        ("RAJUK_DEVELOPER_ENLISTMENT", "RAJUK Developer Enlistment Certificate"),
        ("REHAB_MEMBERSHIP", "REHAB Membership Certificate"),
        ("TRADE_LICENCE", "City Corporation Trade Licence"),
        ("FIRE_LICENCE", "Fire Service & Civil Defence Licence"),
        ("ENVIRONMENTAL_CLEARANCE", "Department of Environment (DoE) Clearance"),
        ("RJSC_INCORPORATION", "RJSC Certificate of Incorporation"),
    ],
    "LEGAL_APPLICABLE_TERRITORY": [
        ("DHAKA_METRO_RAJUK", "Dhaka Metropolitan Area (RAJUK)"),
        ("CHATTOGRAM_CDA", "Chattogram Development Area (CDA)"),
        ("GAZIPUR_GDA", "Gazipur Development Authority (GDA)"),
        ("NARAYANGANJ", "Narayanganj City Corporation"),
        ("NATIONWIDE", "Nationwide (All Bangladesh)"),
    ],
    "LEGAL_RESPONSIBLE_DEPARTMENT": [
        ("LEGAL_COMPLIANCE", "Legal & Statutory Compliance"),
        ("LAND_ACQUISITION", "Land Acquisition & Survey"),
        ("REGULATORY_LIAISON", "Regulatory & Authority Liaison"),
        ("ENGINEERING_DESIGN", "Engineering & Architectural Design"),
        ("CUSTOMER_RELATIONS", "Customer Relationship & Handover"),
        ("FINANCE_TREASURY", "Finance & Accounts"),
    ],
    "LEGAL_RESPONSIBLE_OFFICER": [
        ("CHIEF_LEGAL_COUNSEL", "Chief Legal Counsel"),
        ("SENIOR_LEGAL_OFFICER", "Senior Legal Officer"),
        ("LAND_ACQUISITION_MANAGER", "Land Acquisition Manager"),
        ("STATUTORY_LIAISON_OFFICER", "Statutory Liaison Officer"),
        ("COMPANY_SECRETARY", "Company Secretary"),
    ],
    "DEVELOPER_REGISTRATION_STATUS": [
        ("NOT_STARTED", "Not Started"),
        ("DOCS_PREPARATION", "Documents in Preparation"),
        ("APP_SUBMITTED", "Application Submitted"),
        ("UNDER_REVIEW", "Under Review"),
        ("APPROVED_ISSUED", "Approved / Issued"),
        ("RENEWAL_DUE", "Renewal Due"),
        ("RENEWED", "Renewed"),
        ("REJECTED", "Rejected"),
        ("SUSPENDED", "Suspended"),
        ("EXPIRED", "Expired"),
        ("CANCELLED", "Cancelled"),
    ],
    "LEGAL_NOTIFICATION_CHANNEL": [
        ("EMAIL", "Official Email"),
        ("SMS", "SMS Notification"),
        ("IN_APP", "In-App Dashboard Notification"),
        ("WHATSAPP", "WhatsApp Business Alert"),
        ("HEAD_ESCALATION", "Escalation to Department Head"),
    ],
    "LEGAL_DEED_TYPE": [
        ("SAF_KABALA", "Saf Kabala (Absolute Sale Deed)"),
        ("BAINA_PATRA", "Baina Patra (Agreement for Sale)"),
        ("HEBA_BILA_EWAJ", "Heba Bil Ewaj (Gift for Consideration)"),
        ("BORTONNAMA", "Partition Deed (আপোষ বন্টননামা)"),
        ("AMMOCTARNAMA", "Irrevocable Power of Attorney (আমমোক্তারনামা)"),
        ("LEASE_DEED", "Registered Long-term Lease Deed"),
        ("MORTGAGE_DEED", "Registered Mortgage Deed"),
    ],
    "LEGAL_APPROVAL_CATEGORY": [
        ("LAND_USE_CLEARANCE", "Land-use or Planning Clearance (LUC)"),
        ("LAYOUT_SUBDIVISION", "Layout / Subdivision Approval"),
        ("BUILDING_PLAN", "Building-plan Approval"),
        ("REVISED_BUILDING_PLAN", "Revised Building-plan Approval"),
        ("ENVIRONMENTAL_CLEARANCE", "Environmental Clearance (DoE)"),
        ("FIRE_SAFETY_CLEARANCE", "Fire-safety Clearance / FSCD NOC"),
        ("UTILITY_APPROVAL", "Utility & Service Provider Approval (WASA/DESCO)"),
        ("ROAD_DRAINAGE_PERMISSION", "Access, Road or Drainage Permission"),
        ("OCCUPANCY_CERTIFICATE", "Completion / Occupancy Certificate"),
    ],
    "LEGAL_APPROVAL_STATUS": [
        ("DRAFT_PREPARATION", "Draft in Preparation"),
        ("SUBMITTED", "Submitted to Authority"),
        ("UNDER_SCRUTINY", "Under Departmental Scrutiny"),
        ("QUERIES_RAISED", "Queries Raised by Authority"),
        ("CONDITIONAL_APPROVAL", "Sanctioned with Conditions"),
        ("FULLY_APPROVED", "Sanctioned / Approved"),
        ("REJECTED", "Rejected by Authority"),
        ("REVISED_FILED", "Revised Application Filed"),
        ("EXPIRED", "Expired / Validity Lapsed"),
    ],
    "LEGAL_CONDITION_TRACKING_STATUS": [
        ("OPEN", "Open / Action Required"),
        ("IN_PROGRESS", "In Progress / Evidence Gathering"),
        ("FULFILLED", "Fulfilled & Verified"),
        ("DISPUTED", "Disputed with Authority"),
        ("OVERDUE", "Overdue / Risk Escalated"),
        ("WAIVED", "Waived by Competent Authority"),
    ],
    "LEGAL_LAND_OFFICE": [
        ("SUB_REGISTRY_TEJGAON", "Sub-Registry Office Tejgaon, Dhaka"),
        ("SUB_REGISTRY_GULSHAN", "Sub-Registry Office Gulshan, Dhaka"),
        ("SUB_REGISTRY_SAVAR", "Sub-Registry Office Savar, Dhaka"),
        ("SUB_REGISTRY_CHATTOGRAM", "Sub-Registry Office Sadar, Chattogram"),
        ("AC_LAND_MIRPUR", "AC Land Office Mirpur Circle"),
        ("AC_LAND_MOHAMMADPUR", "AC Land Office Mohammadpur Circle"),
        ("AC_LAND_GULSHAN", "AC Land Office Gulshan Circle"),
        ("UNION_LAND_OFFICE", "Concerned Union Land Office / Tahsil Office"),
    ],
    "LEGAL_REVIEW_STATUS": [
        ("PENDING_REVIEW", "Pending Legal Review"),
        ("TITLE_SEARCH_ONGOING", "Sub-Registry Search Ongoing"),
        ("DISCREPANCY_NOTED", "Discrepancy Noted in Title Chain"),
        ("LEGAL_OPINION_GIVEN", "Legal Opinion Given"),
        ("CLEARED_BY_ADVOCATE", "Cleared by Advocate"),
    ],
    "LEGAL_REGISTRATION_VERIFICATION": [
        ("VERIFIED_BALAM_BOOK", "Verified with Original Balam Book"),
        ("SEARCH_SLIP_VERIFIED", "Search Slip Record Confirmed"),
        ("VOLUME_PAGE_MISMATCH", "Volume / Page Mismatch Detected"),
        ("GENUINE_CERTIFIED_COPY", "Genuine Certified Copy Confirmed"),
    ],
    "LEGAL_SURVEY_RECORD_TYPE": [
        ("CS", "CS (Cadastral Survey / ১৮৮৮-১৯৪০)"),
        ("SA", "SA (State Acquisition Survey / ১৯৫৬-১৯৬২)"),
        ("RS", "RS (Revisional Survey / ১৯৬২-বর্তমান)"),
        ("BS_CITY", "BS / City Survey (বাংলাদেশ/সিটি জরিপ)"),
        ("DIARA", "Diara Survey (নদী সিকস্তি ও পয়স্তি জরিপ)"),
    ],
    "LEGAL_MUTATION_APPLICATION_STATUS": [
        ("APPLICATION_DRAFTED", "Application Drafted"),
        ("E_MUTATION_FILED", "e-Mutation Filed Online"),
        ("NOTICE_SERVED", "General & Special Notice Served"),
        ("HEARING_SCHEDULED", "Hearing Scheduled at AC Land Office"),
        ("FIELD_REPORT_SUBMITTED", "Kanungo / Surveyor Report Submitted"),
        ("DCR_FEE_PAID", "DCR Fee Paid"),
        ("MUTATION_COMPLETED", "Mutation Completed"),
        ("APPLICATION_REJECTED", "Application Rejected"),
    ],
    "LEGAL_MUTATION_OUTCOME": [
        ("MUTATION_APPROVED", "Mutation Approved & New Khatian Created"),
        ("REJECTED_LACK_OF_TITLE", "Rejected: Title Chain Incomplete"),
        ("REJECTED_AREA_MISMATCH", "Rejected: Area / Share Mismatch"),
        ("ORDERED_CORRECTION", "Remanded for Boundary Correction"),
    ],
    "LEGAL_TAX_RECONCILIATION_STATUS": [
        ("PAID_AND_RECONCILED", "Paid & Verified (Khajna Dakhila Matched)"),
        ("UNPAID_CONFIRMED_ARREARS", "Unpaid / Confirmed Arrears"),
        ("HOLDING_MISMATCH", "Holding / Area Discrepancy Found"),
        ("EXEMPTION_CLAIMED", "Exemption / Waiver Claimed"),
    ],
    "LEGAL_LAND_USE_TYPE": [
        ("RESIDENTIAL", "Residential (Urban Housing)"),
        ("COMMERCIAL", "Commercial / Business Tower"),
        ("MIXED_USE", "Mixed-Use (Commercial + Residential)"),
        ("INDUSTRIAL", "Industrial / Light Manufacturing"),
        ("CIVIC_FACILITY", "Civic & Community Facility"),
    ],
    "LEGAL_CORRESPONDENCE_TYPE": [
        ("OFFICIAL_LETTER", "Official Letter / সারক লিপি"),
        ("SHOW_CAUSE_NOTICE", "Show Cause Notice / কারণ দর্শাও নোটিশ"),
        ("LEGAL_NOTICE", "Legal Notice through Advocate"),
        ("NOC_APPLICATION", "NOC / Permission Application"),
        ("CLARIFICATION_RESPONSE", "Reply & Clarification"),
        ("MEETING_MINUTES", "Official Meeting Minutes"),
    ],
    "LEGAL_CORRESPONDENCE_DIRECTION": [
        ("INCOMING", "Incoming / গৃহীত"),
        ("OUTGOING", "Outgoing / প্রেরিত"),
    ],
    "LEGAL_CORRESPONDENCE_STAGE": [
        ("DRAFT", "Draft"),
        ("INTERNAL_REVIEW", "Internal Review"),
        ("AUTHORIZED_APPROVAL", "Authorized Approval"),
        ("DISPATCHED", "Dispatched / Submitted"),
        ("ACKNOWLEDGED", "Acknowledged by Recipient"),
        ("RESPONSE_RECEIVED", "Response Received"),
        ("ACTION_COMPLETED", "Action Completed"),
        ("ARCHIVED", "Archived"),
    ],
    "LEGAL_SUBMISSION_METHOD": [
        ("HAND_DELIVERY_PEON_BOOK", "Hand Delivery with Receiving / Peon Book"),
        ("REGISTERED_POST_AD", "Registered Post with A/D"),
        ("OFFICIAL_COURIER", "Express Courier Service"),
        ("E_NOTHI_PORTAL", "Government e-Nothi / Online Portal"),
        ("DIRECT_EMAIL", "Official Email"),
    ],
    "LEGAL_EXTERNAL_ORGANIZATION": [
        ("RAJUK", "RAJUK (Rajdhani Unnayan Kartripakkha)"),
        ("CDA", "CDA (Chattogram Development Authority)"),
        ("KDA", "KDA (Khulna Development Authority)"),
        ("RDA", "RDA (Rajshahi Development Authority)"),
        ("DOE", "Department of Environment (DoE)"),
        ("FSCD", "Fire Service & Civil Defence (FSCD)"),
        ("DWASA", "Dhaka WASA"),
        ("DESCO", "DESCO (Dhaka Electric Supply Company)"),
        ("DPDC", "DPDC (Dhaka Power Distribution Company)"),
        ("TITAS", "Titas Gas Transmission & Distribution"),
        ("DNCC", "Dhaka North City Corporation (DNCC)"),
        ("DSCC", "Dhaka South City Corporation (DSCC)"),
        ("AC_LAND", "Office of Assistant Commissioner (Land)"),
    ],
    "LEGAL_NOC_CATEGORY": [
        ("FIRE_LIFE_SAFETY", "Fire & Life Safety NOC"),
        ("ENVIRONMENTAL_CLEARANCE", "Environmental Clearance (DoE)"),
        ("CIVIL_AVIATION_HEIGHT", "Civil Aviation Height Clearance (CAAB)"),
        ("TRAFFIC_IMPACT", "Traffic Impact Assessment (TIA)"),
        ("WASA_DEEP_TUBEWELL", "WASA Water Supply & Sewerage NOC"),
        ("POWER_SUBSTATION", "DESCO/DPDC Substation & Power Clearance"),
        ("GAS_SAFETY", "Gas Pipeline & Safety Permission"),
        ("ROAD_ACCESS_DRAINAGE", "City Corporation Road Cutting & Drainage Permission"),
    ],
    "LEGAL_AGREEMENT_TYPE": [
        ("AGREEMENT_FOR_SALE", "Deed of Agreement for Sale (বায়না চুক্তি)"),
        ("ALLOTMENT_AGREEMENT", "Allotment Letter & Agreement"),
        ("CAR_PARKING_ALLOTMENT", "Car Parking Allotment Agreement"),
        ("ADDENDUM_AGREEMENT", "Supplementary / Addendum Agreement"),
        ("TRANSFER_ASSIGNMENT", "Ownership Transfer / Assignment Deed"),
        ("CANCELLATION_SETTLEMENT", "Agreement Cancellation & Settlement Deed"),
        ("POWER_OF_ATTORNEY", "Power of Attorney (POA) for Registration"),
    ],
    "LEGAL_TRANSFER_STATUS": [
        ("REQUEST_SUBMITTED", "Transfer Request Submitted"),
        ("LEGAL_VETTING", "Legal Vetting Ongoing"),
        ("FINANCE_CLEARED", "Finance & Accounts Cleared"),
        ("MANAGEMENT_APPROVED", "Authorized Management Approved"),
        ("EXECUTION_PENDING", "Execution Pending"),
        ("EXECUTED_TRANSFERRED", "Deed Executed & Transferred"),
        ("REJECTED", "Transfer Rejected"),
    ],
    "LEGAL_SALE_RECORD_KIND": [
        ("AGREEMENT", "Sale Agreement"),
        ("OWNERSHIP_AMENDMENT", "Joint Buyer / Ownership Amendment"),
        ("NOMINEE_UPDATE", "Nominee Update"),
        ("TRANSFER_REQUEST", "Transfer / Assignment Request"),
        ("RESALE_SUBSTITUTION", "Resale / Customer Substitution"),
        ("AGREEMENT_ADDENDUM", "Agreement Addendum"),
        ("CANCELLATION_SETTLEMENT", "Cancellation / Settlement"),
        ("POWER_OF_ATTORNEY", "Power of Attorney / Authorization"),
        ("DEED_PREPARATION", "Deed Preparation / Execution"),
    ],
    "LEGAL_SALE_AGREEMENT_STAGE": [
        ("DRAFT", "Draft"),
        ("LEGAL_REVIEW", "Legal Review"),
        ("FINANCE_VERIFICATION", "Finance Verification (if required)"),
        ("AUTHORIZED_APPROVAL", "Authorized Approval"),
        ("EXECUTION_PENDING", "Execution Pending"),
        ("EXECUTED", "Executed"),
        ("ARCHIVED", "Archived"),
    ],
    "LEGAL_SALE_EXECUTION_STATUS": [
        ("DRAFT", "Unsigned Draft"),
        ("LEGAL_REVIEW", "Legal Review"),
        ("FINANCE_VERIFICATION", "Finance Verification"),
        ("APPROVED", "Authorized Approval Complete"),
        ("EXECUTION_PENDING", "Execution Pending"),
        ("EXECUTED", "Executed and Signed"),
        ("ARCHIVED", "Archived"),
    ],
    "LEGAL_SALE_TRANSFER_STAGE": [
        ("REQUESTED", "Request Submitted"),
        ("LEGAL_REVIEW", "Legal Review"),
        ("FINANCE_VERIFICATION", "Finance Verification (if required)"),
        ("AUTHORIZED_DECISION", "Authorized Decision"),
        ("DOCUMENT_PREPARATION", "Resulting Document Preparation"),
        ("EXECUTION_PENDING", "Execution Pending"),
        ("COMPLETED", "Completed and Filed"),
        ("REJECTED", "Rejected"),
    ],
    "LEGAL_SALE_FINANCE_STATUS": [
        ("NOT_REQUIRED", "Not Required"),
        ("PENDING", "Pending Verification"),
        ("CLEARED", "Cleared"),
        ("OUTSTANDING", "Outstanding Balance"),
        ("ON_HOLD", "On Hold"),
    ],
    "LEGAL_SALE_CHANGE_TYPE": [
        ("JOINT_BUYER_AMENDMENT", "Joint Buyer / Ownership Amendment"),
        ("NOMINEE_UPDATE", "Nominee Update"),
        ("TRANSFER_ASSIGNMENT", "Transfer / Assignment"),
        ("RESALE_SUBSTITUTION", "Resale / Customer Substitution"),
        ("AGREEMENT_ADDENDUM", "Agreement Addendum"),
        ("CANCELLATION_SETTLEMENT", "Cancellation / Settlement"),
        ("POWER_OF_ATTORNEY", "Power of Attorney / Authorization"),
        ("DEED_PREPARATION", "Deed Preparation / Execution"),
    ],
    "LEGAL_AUTHORIZED_DECISION": [
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("RETURNED_FOR_REVISION", "Returned for Revision"),
    ],
    "LEGAL_CASE_TYPE": [
        ("TITLE_SUIT", "Title Suit (স্বত্ব মামলা)"),
        ("TEMPORARY_INJUNCTION", "Temporary Injunction / Stay Order (নিষেধাজ্ঞা)"),
        ("WRIT_PETITION", "High Court Writ Petition"),
        ("PRE_EMPTION_SUIT", "Pre-emption Suit (অগ্রক্রয় মামলা)"),
        ("PARTITION_SUIT", "Partition Suit (বন্টন মামলা)"),
        ("MONEY_SUIT", "Money Suit / Recovery Suit"),
        ("NI_ACT_138", "Cheque Dishonour Suit (NI Act Section 138)"),
        ("LAND_SURVEY_TRIBUNAL", "Land Survey Tribunal (LST) Case"),
        ("LEGAL_NOTICE", "Advocate Legal Notice / Reply"),
    ],
    "LEGAL_CASE_WORKFLOW_STAGE": [
        ("CASE_REGISTERED", "Case Registered"),
        ("INITIAL_REVIEW", "Initial Review"),
        ("LAWYER_ASSIGNED", "Lawyer Assigned"),
        ("DOCUMENTS_COLLECTED", "Documents Collected"),
        ("STRATEGY_APPROVED", "Strategy Approved"),
        ("PROCEEDINGS", "Hearings / Proceedings"),
        ("OUTCOME_RECORDED", "Order or Outcome Recorded"),
        ("FOLLOW_UP", "Follow-up"),
        ("CLOSED", "Closed"),
    ],
    "LEGAL_CASE_STATUS": [
        ("OPEN", "Open"),
        ("IN_REVIEW", "Initial Review"),
        ("ACTIVE_PROCEEDINGS", "Active Proceedings"),
        ("FOLLOW_UP", "Follow-up Required"),
        ("CLOSED", "Closed"),
    ],
    "LEGAL_NOTICE_TYPE": [
        ("DEMAND", "Demand Notice"),
        ("SHOW_CAUSE", "Show-cause Notice"),
        ("BREACH", "Breach / Default Notice"),
        ("COURT_PROCESS", "Court Process / Summons"),
        ("RESPONSE", "Legal Response / Reply"),
        ("OTHER", "Other Configured Notice"),
    ],
    "LEGAL_NOTICE_SERVICE_METHOD": [
        ("REGISTERED_POST", "Registered Post"),
        ("COURIER", "Courier"),
        ("HAND_DELIVERY", "Hand Delivery"),
        ("EMAIL", "Email"),
        ("COURT_PROCESS_SERVER", "Court Process Server"),
        ("OTHER", "Other Recorded Method"),
    ],
    "LEGAL_NOTICE_RESPONSE_STATUS": [
        ("NOT_STARTED", "Not Started"),
        ("DRAFTING", "Drafting Response"),
        ("INTERNAL_REVIEW", "Internal Review"),
        ("AWAITING_APPROVAL", "Awaiting Authorized Approval"),
        ("APPROVED_FOR_DISPATCH", "Approved for Dispatch"),
        ("DISPATCHED", "Dispatched"),
        ("ACKNOWLEDGED", "Acknowledged"),
        ("COMPLETED", "Completed"),
    ],
    "LEGAL_RISK_LEVEL": [
        ("LOW", "Low Risk (Routine / Procedural)"),
        ("MEDIUM", "Medium Risk (Monitor Actively)"),
        ("HIGH", "High Risk (Requires Injunction Defense)"),
        ("CRITICAL", "Critical / Urgent (Hold on Land / Sales)"),
    ],
    "LEGAL_DOCUMENT_TYPE": [
        ("ORIGINAL_TITLE_DEED", "Original Registered Title Deed"),
        ("CERTIFIED_PORCHA", "Certified Porcha / Khatian"),
        ("MUTATION_DAKHILA", "Mutation Order & Dakhila"),
        ("APPROVED_DRAWING", "Sanctioned Building Plan / Architectural Drawing"),
        ("SANCTIONED_PERMIT", "Government Permission / Sanction Memo"),
        ("COURT_CERTIFIED_ORDER", "Court Certified Copy / Injunction Order"),
        ("LEGAL_OPINION_REPORT", "External Senior Counsel Legal Opinion"),
        ("CUSTOMER_AGREEMENT", "Executed Customer Agreement / Allotment"),
        ("POWER_OF_ATTORNEY", "Registered Power of Attorney"),
    ],
    "LEGAL_CONFIDENTIALITY": [
        ("STANDARD_INTERNAL", "Standard Confidential (Company Wide)"),
        ("LEGAL_PRIVILEGED", "Legal Professional Privilege (Legal Team Only)"),
        ("RESTRICTED_BOARD", "Strictly Restricted (Board & Executive Directors)"),
        ("PUBLIC_RECORD", "Public Document / Gazette Copy"),
    ],
    "LEGAL_REMINDER_TYPE": [
        ("REGISTRATION_RENEWAL", "Statutory Registration & Licence Renewal"),
        ("APPROVAL_EXPIRY", "Approval Validity & Renewal Expiry"),
        ("CONDITION_DEADLINE", "Approval Condition Deadline"),
        ("LAND_TAX_PERIOD", "Land Development Tax Fiscal Period"),
        ("COURT_HEARING", "Court Hearing / Proceeding Date"),
        ("NOTICE_DEADLINE", "Legal Notice Response Deadline"),
        ("CONTRACT_MILESTONE", "Agreement / Contractual Milestone"),
    ],
    "LEGAL_REPEAT_RULE": [
        ("NONE", "None (One-time)"),
        ("DAILY", "Daily"),
        ("WEEKLY", "Weekly"),
        ("MONTHLY", "Monthly"),
        ("QUARTERLY", "Quarterly"),
        ("HALF_YEARLY", "Half-Yearly"),
        ("ANNUALLY", "Annually"),
    ],
    "LEGAL_WORKFLOW_TYPE": [
        ("TITLE_CLEARANCE", "Land Title Due Diligence Clearance"),
        ("APPROVAL_SUBMISSION", "Building Plan Approval Sanction"),
        ("AGREEMENT_EXECUTION", "Customer Sale Agreement Execution"),
        ("BUYER_SUBSTITUTION", "Buyer Substitution / Transfer Clearance"),
        ("DISPUTE_LEGAL_HOLD", "Dispute Legal Hold & Release"),
        ("COMPLIANCE_CLOSURE", "Statutory Compliance Closure Sign-off"),
    ],
    "LEGAL_APPROVAL_STAGE": [
        ("MAKER_DRAFT", "Maker: Draft Registered"),
        ("CHECKER_REVIEW", "Checker: Documents & Deadlines Verified"),
        ("LEGAL_HEAD_RECOMMEND", "Approver: Legal Head Clearance"),
        ("EXECUTIVE_DIRECTOR_SIGN", "Authorized: Managing Director / Board Sign-off"),
        ("OFFICER_EXECUTED", "Responsible Officer: Executed & Proof Uploaded"),
        ("AUDIT_CLOSED", "Audit: Confirmed & Closed"),
    ],
    "LEGAL_REPORT_TYPE": [
        ("PORTFOLIO_COMPLIANCE", "Statutory & Regulatory Compliance Portfolio"),
        ("LAND_TITLE_RISK_MATRIX", "Land Title & Title-Chain Risk Matrix"),
        ("LITIGATION_DISPUTES", "Active Litigation & Dispute Register"),
        ("EXPIRING_APPROVALS", "Expiring Licences & Approvals Forecast"),
        ("UNMET_CONDITIONS_REPORT", "Unmet Approval Conditions & Penalties"),
    ],
    "STATUTORY_AUTHORITY": [
        ("RAJUK", "RAJUK (Rajdhani Unnayan Kartripakkha)"),
        ("CDA", "CDA (Chattogram Development Authority)"),
        ("KDA", "KDA (Khulna Development Authority)"),
        ("RDA", "RDA (Rajshahi Development Authority)"),
        ("DOE", "Department of Environment (DoE)"),
        ("FSCD", "Fire Service & Civil Defence (FSCD)"),
        ("CAAB", "Civil Aviation Authority of Bangladesh (CAAB)"),
        ("DWASA", "Dhaka WASA"),
        ("CWASA", "Chattogram WASA"),
        ("DESCO", "Dhaka Electric Supply Company (DESCO)"),
        ("DPDC", "Dhaka Power Distribution Company (DPDC)"),
        ("TITAS", "Titas Gas Transmission & Distribution"),
        ("SUB_REGISTRY", "Sub-Registry Office"),
        ("AC_LAND", "Office of Assistant Commissioner (Land)"),
        ("REHAB", "Real Estate & Housing Association of Bangladesh (REHAB)"),
    ],
    "COURT_NAME": [
        ("SUPREME_COURT_HCD", "High Court Division, Supreme Court of Bangladesh"),
        ("DISTRICT_JUDGE_DHAKA", "Court of District & Sessions Judge, Dhaka"),
        ("JOINT_DISTRICT_JUDGE_1", "1st Court of Joint District Judge, Dhaka"),
        ("ASSISTANT_JUDGE_DHAKA", "Court of Assistant Judge, Dhaka"),
        ("LAND_SURVEY_TRIBUNAL", "Land Survey Tribunal (LST), Dhaka"),
        ("METROPOLITAN_SESSIONS", "Court of Metropolitan Sessions Judge, Dhaka"),
        ("ARTHA_RIN_ADALAT", "Artha Rin Adalat, Dhaka"),
    ],
    "LEGAL_ACT_SECTION": [
        ("TP_ACT_1882", "Transfer of Property Act, 1882"),
        ("REGISTRATION_ACT_1908", "Registration Act, 1908"),
        ("SAT_ACT_1950", "State Acquisition and Tenancy Act, 1950"),
        ("REAL_ESTATE_ACT_2010", "Real Estate Development and Management Act, 2010"),
        ("SPECIFIC_RELIEF_1877", "Specific Relief Act, 1877"),
        ("NI_ACT_1881_SEC_138", "Negotiable Instruments Act, 1881 (Section 138)"),
        ("BUILDING_CONSTRUCTION_1952", "Building Construction Act, 1952 (East Bengal Act II of 1952)"),
    ],
    "SAFE_DOCUMENT_CATEGORY": [
        ("ORIGINAL_DEED", "Original Non-Judicial Stamped Title Deed"),
        ("CERTIFIED_RECORD", "Government Certified Record of Rights (Porcha)"),
        ("ALLOTMENT_INSTRUMENT", "Sale Allotment & Financial Contract"),
        ("COURT_ORDER", "Court Certified Injunction / Decree Order"),
        ("POWER_OF_ATTORNEY", "Registered Irrevocable Power of Attorney"),
        ("NATIONAL_ID_PROOF", "National ID (NID) / Identity Verification"),
        ("SCANNED_VAULT_BACKUP", "High-Resolution Cryptographically Hashed Scan"),
    ]
}


async def _ensure_legal_lookup_categories(db: AsyncSession) -> None:
    result = await db.execute(
        select(LookupCategory).where(LookupCategory.category_code.in_(LEGAL_LOOKUP_CATEGORIES))
    )
    categories = result.scalars().all()
    cat_map = {c.category_code: c for c in categories}
    created_any = False
    for code, name in LEGAL_LOOKUP_CATEGORIES.items():
        if code not in cat_map:
            new_cat = LookupCategory(
                category_code=code,
                category_name=name,
                description="Configurable legal-compliance choices; add only values applicable to the organization.",
                is_system_locked=False,
                is_active=True,
            )
            db.add(new_cat)
            created_any = True
    if created_any:
        await db.commit()
        refreshed = await db.execute(
            select(LookupCategory).where(LookupCategory.category_code.in_(LEGAL_LOOKUP_CATEGORIES))
        )
        cat_map = {c.category_code: c for c in refreshed.scalars().all()}

    # Seed default items if empty
    items_added = False
    for cat_code, items in LEGAL_DEFAULT_LOOKUP_ITEMS.items():
        cat = cat_map.get(cat_code)
        if not cat:
            continue
        count = await db.scalar(select(func.count(LookupItem.id)).where(LookupItem.category_id == cat.id)) or 0
        if count == 0:
            for idx, (item_code, item_label) in enumerate(items, start=1):
                db.add(LookupItem(
                    category_id=cat.id,
                    item_code=item_code,
                    item_name_en=item_label,
                    item_name_bn=item_label,
                    is_active=True,
                    sort_order=idx,
                ))
            items_added = True
    if items_added:
        await db.commit()


def _legal_record_due_date(area: str, data: dict) -> Optional[date]:
    if area == "litigation_notice":
        deadlines = []
        for key in ("next_hearing_date", "response_deadline", "stay_order_valid_until"):
            value = data.get(key)
            if value:
                try:
                    deadlines.append(date.fromisoformat(str(value)))
                except ValueError:
                    raise HTTPException(status_code=422, detail=f"{key} must be a valid date.")
        return min(deadlines) if deadlines else None
    date_keys = (
        ("expiry_date", "renewal_due_date", "review_date") if area == "developer_registration"
        else ("expiry_date",) if area == "land_use_clearance"
        else ("response_due_date", "response_deadline") if area == "noc_correspondence"
        else ("deadline", "due_date") if area == "approval_condition"
        else ("next_hearing_date", "response_deadline") if area == "litigation_notice"
        else ("reminder_date", "due_date") if area == "calendar_reminder"
        else ("expiry_date", "retention_review_date", "review_date") if area == "document_archive"
        else ("decision_date",) if area == "approval_workflow"
        else ("next_tax_reminder_date", "mutation_hearing_date", "deed_date") if area == "registered_record"
        else ("request_due_date",) if area == "sale_transfer" and _sale_record_kind(data) != "AGREEMENT"
        else ()
    )
    for key in date_keys:
        value = data.get(key)
        if not value:
            continue
        try:
            return date.fromisoformat(str(value))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"{key} must be a valid date.")
    return None


def _validate_registered_land_data(area: str, data: dict) -> None:
    if area == "registered_record":
        amount_keys = ("land_tax_amount", "confirmed_outstanding_amount")
    elif area == "developer_registration":
        amount_keys = ("registration_fee_bdt",)
    elif area == "sale_transfer":
        amount_keys = ("agreed_price_bdt", "transfer_fee_bdt")
    elif area == "litigation_notice":
        amount_keys = ("financial_claim_bdt", "approved_legal_budget_bdt")
    else:
        return
    for key in amount_keys:
        value = data.get(key)
        if value in (None, ""):
            continue
        try:
            amount = Decimal(str(value))
        except Exception:
            raise HTTPException(status_code=422, detail=f"{key} must be a valid BDT amount.")
        if not amount.is_finite() or amount < 0:
            raise HTTPException(status_code=422, detail=f"{key} must be a non-negative BDT amount.")


SALE_AGREEMENT_VERSIONED_FIELDS = {
    "booking_id", "customer_id", "customer_name", "customer_reference", "customer_phone", "customer_nid",
    "co_owner_details", "project_reference", "unit_id", "unit_number", "parking_bay_reference",
    "booking_reference_no", "sale_agreement_number", "agreement_type", "template_id", "template_version",
    "agreement_date", "agreed_price_bdt", "payment_schedule_id", "payment_schedule_reference",
    "handover_terms_reference", "nominee_updates", "power_of_attorney_reference", "customer_signature_date",
    "customer_signatory_name", "developer_signature_date", "developer_signatory_name", "witness_details",
    "document_reference", "checksum",
}
SALE_AGREEMENT_IDENTITY_FIELDS = {"booking_id", "customer_id", "customer_name", "customer_reference", "customer_phone", "customer_nid", "co_owner_details", "project_reference", "unit_id", "unit_number", "parking_bay_reference"}
SALE_AGREEMENT_EXECUTED_VALUES = {"EXECUTED", "EXECUTED_SIGNED", "ARCHIVED"}
SALE_APPROVED_REVIEW_VALUES = {"APPROVED", "LEGAL_APPROVED", "VETTED", "CLEARED", "ACCEPTED"}
CASE_CLOSED_VALUES = {"CLOSED"}


def _legal_user_roles(user: User) -> set[str]:
    return {
        str(getattr(assignment, "role_code", "")).strip().upper()
        for assignment in (getattr(user, "project_assignments", None) or [])
    }


def _is_legal_management_user(user: User) -> bool:
    roles = _legal_user_roles(user)
    return bool(getattr(user, "is_group_admin", False) or getattr(user, "is_superuser", False)) or any(
        any(token in role for token in ("ADMIN", "MANAGER", "MANAGEMENT", "DIRECTOR")) for role in roles
    )


def _is_legal_staff_user(user: User) -> bool:
    return any("LEGAL" in role or "LAW" in role or "APPROVER" in role for role in _legal_user_roles(user)) or _is_legal_management_user(user)


def _is_legal_approver_user(user: User) -> bool:
    roles = _legal_user_roles(user)
    return _is_legal_management_user(user) or any(
        "LEGAL" in role and any(token in role for token in ("APPROVER", "MANAGER", "HEAD", "ADMIN"))
        for role in roles
    ) or any("APPROVER" in role for role in roles)


def _require_litigation_access(user: User, data: Optional[dict] = None, *, creating: bool = False) -> None:
    if not _is_legal_staff_user(user):
        raise HTTPException(status_code=403, detail="Litigation records are restricted to assigned legal staff and authorized management.")
    if creating or data is None or _is_legal_management_user(user):
        return
    identities = {
        str(getattr(user, "username", "")).strip().casefold(),
        str(getattr(user, "full_name_en", "")).strip().casefold(),
    }
    assigned = str(data.get("assigned_inhouse_counsel", "")).strip().casefold()
    if assigned and assigned not in identities:
        raise HTTPException(status_code=403, detail="This sensitive litigation record is available only to its assigned legal officer or authorized management.")


def _require_authorized_case_actor(user: User, actor_name: str, action: str) -> None:
    if not _is_legal_approver_user(user) or str(actor_name or "").strip().casefold() not in {
        str(getattr(user, "username", "")).strip().casefold(),
        str(getattr(user, "full_name_en", "")).strip().casefold(),
    }:
        raise HTTPException(status_code=403, detail=f"Only an authenticated legal approver or authorized management user may record the {action} decision.")


def _case_is_closed(status_value: Optional[str], data: dict) -> bool:
    return (
        str(status_value or "").strip().upper() in CASE_CLOSED_VALUES
        or str(data.get("case_status", "")).strip().upper() in CASE_CLOSED_VALUES
        or str(data.get("case_workflow_stage", "")).strip().upper() in CASE_CLOSED_VALUES
    )


def _validate_litigation_controls(data: dict, status_value: Optional[str], current_user: User, existing: Optional[LegalComplianceRecord] = None) -> None:
    data = dict(data or {})
    closing = _case_is_closed(status_value, data)
    was_closed = bool(existing and _case_is_closed(existing.status, existing.data or {}))
    if was_closed and not closing:
        raise HTTPException(status_code=409, detail="Closed case records are retained for audit and cannot be reopened; create a linked follow-up record if authorized.")
    if was_closed:
        locked_closure_fields = ("case_closure_outcome", "case_closure_approver", "case_closure_authorized", "case_closed_at")
        if any((existing.data or {}).get(key) != data.get(key) for key in locked_closure_fields):
            raise HTTPException(status_code=409, detail="A closed case outcome and authorization are immutable; create a linked follow-up record for subsequent work.")
    if closing:
        required = {
            "case_closure_outcome": "documented outcome and follow-up",
            "case_closure_approver": "closure approver identity",
            "case_closed_at": "closure date",
        }
        missing = [label for key, label in required.items() if not str(data.get(key, "")).strip()]
        if data.get("case_closure_authorized") is not True:
            missing.append("explicit authorized closure decision")
        if missing:
            raise HTTPException(status_code=422, detail="Case closure requires " + ", ".join(missing) + ".")
        if not was_closed or (existing and not _case_is_closed(existing.status, existing.data or {})):
            _require_authorized_case_actor(current_user, data.get("case_closure_approver", ""), "case closure")

    old_data = existing.data or {} if existing else {}
    old_hold = old_data.get("legal_hold_applied") is True
    new_hold = data.get("legal_hold_applied") is True
    if old_hold and new_hold:
        protected = ("legal_hold_scope", "legal_hold_authorized_by", "legal_hold_authorized", "legal_hold_authorized_at")
        if any(old_data.get(key) != data.get(key) for key in protected):
            raise HTTPException(status_code=409, detail="An active legal hold cannot be modified in place; record an authorized release before creating a revised hold.")
    elif not old_hold and new_hold:
        if not str(data.get("legal_hold_scope", "")).strip() or not data.get("legal_hold_authorized_at") or data.get("legal_hold_authorized") is not True:
            raise HTTPException(status_code=422, detail="Applying a legal hold requires its scope, authorization decision, and authorization date.")
        _require_authorized_case_actor(current_user, data.get("legal_hold_authorized_by", ""), "legal hold")
    elif old_hold and not new_hold:
        if not str(data.get("legal_hold_release_reason", "")).strip() or not str(data.get("legal_hold_release_authorized_by", "")).strip() or not data.get("legal_hold_released_at") or data.get("legal_hold_release_authorized") is not True:
            raise HTTPException(status_code=422, detail="Releasing a legal hold requires its rationale, authorized decision, and release date.")
        _require_authorized_case_actor(current_user, data.get("legal_hold_release_authorized_by", ""), "legal hold release")

    stage = str(data.get("case_workflow_stage", "")).strip().upper()
    if stage in {"STRATEGY_APPROVED", "PROCEEDINGS", "OUTCOME_RECORDED", "FOLLOW_UP", "CLOSED"}:
        if str(data.get("case_strategy_review_status", "")).strip().upper() not in SALE_APPROVED_REVIEW_VALUES:
            raise HTTPException(status_code=422, detail="A documented approved case strategy is required before proceedings or later workflow stages.")
        if data.get("case_strategy_approval_authorized") is not True or not data.get("case_strategy_approved_at"):
            raise HTTPException(status_code=422, detail="Case strategy progression requires an authorized decision and approval date.")
        _require_authorized_case_actor(current_user, data.get("case_strategy_approver", ""), "case strategy approval")

    notice_status = str(data.get("notice_response_status", "")).strip().upper()
    if notice_status in {"DISPATCHED", "ACKNOWLEDGED", "COMPLETED"}:
        if str(data.get("notice_internal_review_status", "")).strip().upper() not in SALE_APPROVED_REVIEW_VALUES or not str(data.get("notice_reviewed_by", "")).strip():
            raise HTTPException(status_code=422, detail="An internally reviewed response and reviewer identity are required before notice dispatch.")
        if data.get("notice_approval_authorized") is not True or not data.get("notice_dispatch_date") or not str(data.get("notice_dispatch_reference", "")).strip():
            raise HTTPException(status_code=422, detail="Notice dispatch requires an authorized decision, dispatch date, and service reference.")
        _require_authorized_case_actor(current_user, data.get("notice_authorized_approver", ""), "notice dispatch")


def _append_litigation_history(existing: Optional[LegalComplianceRecord], data: dict, status_value: Optional[str], actor: str) -> dict:
    result = dict(data or {})
    old_data = dict(existing.data or {}) if existing else {}
    history = list(old_data.get("case_status_history") or [])
    old_record_status = existing.status if existing else None
    new_record_status = status_value
    old_status = old_data.get("case_status")
    new_status = result.get("case_status")
    old_stage = old_data.get("case_workflow_stage")
    new_stage = result.get("case_workflow_stage")
    if (not existing and (new_status or new_record_status or new_stage)) or (
        existing and (old_record_status != new_record_status or old_status != new_status or old_stage != new_stage)
    ):
        history.append({
            "from_record_status": old_record_status,
            "to_record_status": new_record_status,
            "from_case_status": old_status,
            "to_case_status": new_status,
            "from_stage": old_stage,
            "to_stage": new_stage,
            "changed_at": datetime.utcnow().isoformat(),
            "changed_by": actor,
            "outcome": result.get("case_closure_outcome") if _case_is_closed(status_value, result) else None,
        })
    result["case_status_history"] = history

    hold_history = list(old_data.get("legal_hold_history") or [])
    old_hold = old_data.get("legal_hold_applied") is True
    new_hold = result.get("legal_hold_applied") is True
    if old_hold != new_hold:
        hold_history.append({
            "action": "APPLIED" if new_hold else "RELEASED",
            "scope": result.get("legal_hold_scope") or old_data.get("legal_hold_scope"),
            "reason": result.get("legal_hold_release_reason") if old_hold else result.get("legal_hold_scope"),
            "authorized_by": result.get("legal_hold_authorized_by") if new_hold else result.get("legal_hold_release_authorized_by"),
            "recorded_by": actor,
            "recorded_at": datetime.utcnow().isoformat(),
        })
    result["legal_hold_history"] = hold_history
    return result


def _sale_record_kind(data: dict) -> str:
    return str(data.get("document_control_type") or "AGREEMENT").strip().upper()


def _sale_is_authorized_approver(user: User, data: dict) -> bool:
    role_codes = {
        str(getattr(assignment, "role_code", "")).upper()
        for assignment in (getattr(user, "project_assignments", None) or [])
    }
    can_approve = bool(getattr(user, "is_group_admin", False)) or any(
        "LEGAL" in role or "APPROVER" in role or role == "ADMIN" for role in role_codes
    )
    approver_names = {
        str(getattr(user, "username", "")).strip().casefold(),
        str(getattr(user, "full_name_en", "")).strip().casefold(),
    }
    return can_approve and str(data.get("authorized_approver", "")).strip().casefold() in approver_names


def _require_sale_authorized_decision(data: dict, user: User) -> None:
    if str(data.get("authorized_decision", "")).strip().upper() not in {"APPROVED", "REJECTED"}:
        raise HTTPException(status_code=422, detail="An authorized approval or rejection decision is required at this workflow stage.")
    if data.get("approval_authorized") is not True or not str(data.get("authorized_approver", "")).strip():
        raise HTTPException(status_code=422, detail="Record the authorized approver and explicit approval authorization.")
    if not _sale_is_authorized_approver(user, data):
        raise HTTPException(status_code=403, detail="Only the authenticated legal approver or group administrator may authorize this contract action.")


def _validate_sale_transfer_data(data: dict, current_user: User, existing: Optional[LegalComplianceRecord] = None, project_id: Optional[int] = None) -> None:
    data = data or {}
    kind = _sale_record_kind(data)
    if existing is None and not str(data.get("document_control_type", "")).strip():
        raise HTTPException(status_code=422, detail="Choose an agreement or controlled request type.")

    if kind == "AGREEMENT":
        execution_status = str(data.get("execution_status", "")).strip().upper()
        if execution_status in SALE_AGREEMENT_EXECUTED_VALUES:
            required_fields = {
                "customer_signature_date": "Customer signature date",
                "customer_signatory_name": "Customer signatory name",
                "developer_signature_date": "Developer signature date",
                "developer_signatory_name": "Developer signatory name",
                "document_reference": "Signed agreement document reference",
                "checksum": "Signed document checksum",
                "legal_reviewer_identity": "Legal reviewer identity",
            }
            missing = [label for key, label in required_fields.items() if not str(data.get(key, "")).strip()]
            if missing:
                raise HTTPException(status_code=422, detail="An agreement cannot be marked executed until these are recorded: " + ", ".join(missing) + ".")
            if str(data.get("legal_review_status", "")).strip().upper() not in SALE_APPROVED_REVIEW_VALUES:
                raise HTTPException(status_code=422, detail="An executed agreement must have a completed legal review.")
            _require_sale_authorized_decision(data, current_user)
        if existing and _sale_record_kind(existing.data or {}) == "AGREEMENT":
            old_data = existing.data or {}
            changed_fields = {key for key in SALE_AGREEMENT_VERSIONED_FIELDS if old_data.get(key) != data.get(key)}
            old_executed = str(old_data.get("execution_status", "")).strip().upper() in SALE_AGREEMENT_EXECUTED_VALUES
            if old_executed and changed_fields:
                raise HTTPException(status_code=409, detail="Executed agreement terms are immutable. Create a separately reviewed transfer, amendment, or cancellation request.")
            new_execution_status = str(data.get("execution_status", "")).strip().upper()
            if old_executed and new_execution_status not in SALE_AGREEMENT_EXECUTED_VALUES:
                raise HTTPException(status_code=409, detail="Executed agreement status cannot be rolled back to draft or review.")
            locked_review_fields = ("legal_review_status", "legal_reviewer_identity", "legal_review_date", "authorized_approver", "authorized_decision", "approval_authorized", "sales_legal_document_id", "sales_legal_document_number")
            if old_executed and any(old_data.get(key) != data.get(key) for key in locked_review_fields):
                raise HTTPException(status_code=409, detail="Executed agreement approval and document history cannot be overwritten.")
            if old_executed and old_data.get("agreement_workflow_stage") != data.get("agreement_workflow_stage") and new_execution_status != "ARCHIVED":
                raise HTTPException(status_code=409, detail="An executed agreement can only advance to its archived stage.")
            if changed_fields:
                if str(data.get("legal_review_status", "")).strip().upper() not in SALE_APPROVED_REVIEW_VALUES:
                    raise HTTPException(status_code=422, detail="Changes to ownership, price, or contractual terms require completed legal review.")
                _require_sale_authorized_decision(data, current_user)
            if existing.project_id != project_id:
                if old_executed:
                    raise HTTPException(status_code=409, detail="The project on an executed agreement cannot be changed; create a controlled amendment request.")
                if str(data.get("legal_review_status", "")).strip().upper() not in SALE_APPROVED_REVIEW_VALUES:
                    raise HTTPException(status_code=422, detail="A project or unit change requires completed legal review.")
                _require_sale_authorized_decision(data, current_user)
        return

    if not data.get("source_agreement_record_id"):
        raise HTTPException(status_code=422, detail="A transfer, amendment, nominee, deed, or cancellation record must reference its source executed agreement.")
    if not str(data.get("request_owner", "")).strip() or not str(data.get("request_summary", "")).strip():
        raise HTTPException(status_code=422, detail="A controlled agreement action requires a request owner and documented request summary.")
    stage = str(data.get("transfer_workflow_stage", "REQUESTED")).strip().upper()
    if stage not in {"REQUESTED", "DRAFT"}:
        if not str(data.get("legal_reviewer_identity", "")).strip() or not str(data.get("legal_review_status", "")).strip():
            raise HTTPException(status_code=422, detail="Record the legal reviewer and review outcome before advancing a controlled agreement action.")
    if stage in {"AUTHORIZED_DECISION", "DOCUMENT_PREPARATION", "EXECUTION_PENDING", "COMPLETED", "REJECTED"}:
        review_status = str(data.get("legal_review_status", "")).strip().upper()
        if stage == "REJECTED":
            if review_status not in {"REJECTED", "DECLINED", "NOT_RECOMMENDED"}:
                raise HTTPException(status_code=422, detail="A documented negative legal review outcome is required before rejecting this controlled action.")
        elif review_status not in SALE_APPROVED_REVIEW_VALUES:
            raise HTTPException(status_code=422, detail="Legal review must be approved before the authorized decision stage.")
        _require_sale_authorized_decision(data, current_user)
        if stage != "REJECTED" and data.get("financial_clearance_required") is True:
            if str(data.get("financial_clearance_status", "")).strip().upper() != "CLEARED" or not str(data.get("financial_clearance_reviewer", "")).strip() or not data.get("financial_clearance_date"):
                raise HTTPException(status_code=422, detail="Required financial clearance must be verified by Finance before approval.")
    if stage in {"EXECUTION_PENDING", "COMPLETED"} and not str(data.get("resulting_document_reference", "")).strip():
        raise HTTPException(status_code=422, detail="Record the resulting approved document before execution or completion.")
    if stage == "COMPLETED" and not str(data.get("checksum", "")).strip():
        raise HTTPException(status_code=422, detail="A checksum is required for the resulting executed transfer or cancellation document.")


def _append_sale_agreement_version(existing: LegalComplianceRecord, incoming_data: dict, actor: str, project_id: Optional[int]) -> dict:
    data = dict(incoming_data or {})
    old_data = dict(existing.data or {})
    for key in ("agreement_version_history", "agreement_version_number", "previous_versions_summary", "current_version_number"):
        data.pop(key, None)
    changed = existing.project_id != project_id or any(old_data.get(key) != data.get(key) for key in SALE_AGREEMENT_VERSIONED_FIELDS)
    history = list(old_data.get("agreement_version_history") or [])
    version_number = int(old_data.get("agreement_version_number") or 1)
    if changed:
        snapshot = {key: value for key, value in old_data.items() if key not in {"agreement_version_history", "previous_versions_summary", "current_version_number"}}
        snapshot["_record_project_id"] = existing.project_id
        history.append({
            "version_number": version_number,
            "saved_at": datetime.utcnow().isoformat(),
            "changed_by": actor,
            "reference": old_data.get("sale_agreement_number") or old_data.get("booking_reference_no") or existing.reference_no,
            "snapshot": snapshot,
        })
        version_number += 1
    data["agreement_version_history"] = history
    data["agreement_version_number"] = version_number
    return data


async def _validate_sale_transfer_source(db: AsyncSession, data: dict, record_id: Optional[int], project_id: Optional[int]) -> None:
    if _sale_record_kind(data) == "AGREEMENT":
        return
    try:
        source_id = int(data.get("source_agreement_record_id"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Select a valid source agreement record.")
    if record_id == source_id:
        raise HTTPException(status_code=422, detail="A controlled action cannot reference itself as the source agreement.")
    source = await db.get(LegalComplianceRecord, source_id)
    if not source or source.area != "sale_transfer":
        raise HTTPException(status_code=404, detail="The source agreement record was not found.")
    source_data = source.data or {}
    if _sale_record_kind(source_data) != "AGREEMENT" or str(source_data.get("execution_status", "")).strip().upper() not in SALE_AGREEMENT_EXECUTED_VALUES:
        raise HTTPException(status_code=409, detail="Controlled changes can only reference an executed agreement.")
    if source.project_id and project_id and source.project_id != project_id:
        raise HTTPException(status_code=422, detail="The controlled action project must match its source agreement.")
    source_booking = source_data.get("booking_id")
    action_booking = data.get("booking_id")
    if source_booking and str(source_booking) != str(action_booking):
        raise HTTPException(status_code=422, detail="The financial ledger booking remains linked to the source agreement; do not substitute its customer.")



def _validate_clearance_review(area: str, status_value: Optional[str], data: dict, current_user: User) -> None:
    if area not in {"land_title", "land_use_clearance"}:
        return
    status_text = (status_value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if status_text not in {"approved", "approved_issued", "approved/issued", "issued", "cleared", "conditionally_approved", "conditional"}:
        return
    if not data.get("verification_outcome"):
        raise HTTPException(status_code=422, detail="A documented verification outcome is required before clearance.")
    if not str(data.get("reviewer_identity", "")).strip():
        raise HTTPException(status_code=422, detail="Reviewer identity is required before clearance.")
    if not str(data.get("authorized_approver", "")).strip() or data.get("approval_authorized") is not True:
        raise HTTPException(status_code=422, detail="An authorized approver and explicit approval authorization are required.")
    role_codes = {
        str(getattr(assignment, "role_code", "")).upper()
        for assignment in (getattr(current_user, "project_assignments", None) or [])
    }
    can_approve = bool(getattr(current_user, "is_group_admin", False)) or any(
        "LEGAL" in role or "APPROVER" in role or role == "ADMIN" for role in role_codes
    )
    approver_names = {
        str(getattr(current_user, "username", "")).strip().casefold(),
        str(getattr(current_user, "full_name_en", "")).strip().casefold(),
    }
    if not can_approve or str(data.get("authorized_approver", "")).strip().casefold() not in approver_names:
        raise HTTPException(status_code=403, detail="Only the authenticated legal approver or group administrator may authorize clearance.")
    outcome = str(data.get("verification_outcome", "")).strip().lower()
    if status_text in {"conditional", "conditionally_approved"} or outcome in {"conditional", "conditionally_clear"}:
        conditions = data.get("conditions")
        if not isinstance(conditions, list) or not conditions:
            raise HTTPException(status_code=422, detail="Conditional clearance requires at least one owner-assigned condition with a deadline.")
        for condition in conditions:
            if not isinstance(condition, dict) or not str(condition.get("owner", "")).strip() or not condition.get("deadline"):
                raise HTTPException(status_code=422, detail="Each conditional approval item must include an owner and deadline.")


async def _write_legal_audit(
    db: AsyncSession, record_id: Optional[int], area: str, action: str, actor: str,
    before_data: Optional[dict], after_data: Optional[dict],
) -> None:
    db.add(LegalAuditEvent(
        record_id=record_id, area=area, action=action, actor=actor[:128],
        before_data=before_data, after_data=after_data,
    ))


@router.get("/dashboard", response_model=LegalDashboardResponse)
async def get_legal_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_legal_lookup_categories(db)
    today = date.today()
    count_result = await db.execute(
        select(LegalComplianceRecord.area, func.count(LegalComplianceRecord.id))
        .group_by(LegalComplianceRecord.area)
    )
    totals = {area: count for area, count in count_result.all()}
    records_result = await db.execute(select(LegalComplianceRecord))
    records = records_result.scalars().all()
    areas = []
    open_approval_conditions = sum(
        1 for record in records
        if record.area == "approval_condition" and (record.status or "").strip().lower() not in TERMINAL_LEGAL_STATUSES
    )
    overdue_approval_conditions = sum(
        1 for record in records
        if record.area == "approval_condition"
        and (record.status or "").strip().lower() not in TERMINAL_LEGAL_STATUSES
        and record.due_date and record.due_date < today
    )
    for area in LEGAL_AREAS:
        area_records = [record for record in records if record.area == area]
        active = [record for record in area_records if (record.status or "").lower() not in TERMINAL_LEGAL_STATUSES]
        overdue = [record for record in active if record.due_date and record.due_date < today]
        if area in {"land_use_clearance", "developer_registration"}:
            for dated_record in area_records:
                if dated_record.due_date and dated_record.due_date < today:
                    if dated_record not in active:
                        active.append(dated_record)
                    if dated_record not in overdue:
                        overdue.append(dated_record)
        if area == "land_use_clearance":
            for approval in area_records:
                condition_count, condition_overdue = _approval_open_condition_counts(approval, records, today)
                if condition_count and approval not in active:
                    active.append(approval)
                if condition_overdue and approval.due_date and approval.due_date < today and approval not in overdue:
                    overdue.append(approval)
                raw_conditions = (approval.data or {}).get("conditions")
                if isinstance(raw_conditions, list):
                    matched = [
                        item for item in records
                        if item.area == "approval_condition"
                        and str((item.data or {}).get("approval_reference", "")).strip()
                        and str((item.data or {}).get("approval_reference", "")).strip() in {
                            str(approval.id), str(approval.reference_no or "").strip(),
                            str((approval.data or {}).get("approval_number", "")).strip(),
                        }
                    ]
                    linked_open = sum(1 for item in matched if (item.status or "").strip().lower() not in TERMINAL_LEGAL_STATUSES)
                    linked_overdue = sum(1 for item in matched if item.due_date and item.due_date < today and (item.status or "").strip().lower() not in TERMINAL_LEGAL_STATUSES)
                    untracked = max(0, len(raw_conditions) - len(matched))
                    open_approval_conditions += untracked
                    overdue_approval_conditions += max(0, condition_overdue - linked_overdue)
        areas.append({"area": area, "total": totals.get(area, 0), "open_items": len(active), "overdue_items": len(overdue)})
    due_soon_stmt = (
        select(LegalComplianceRecord)
        .where(
            LegalComplianceRecord.due_date >= today,
            LegalComplianceRecord.due_date <= today + timedelta(days=30),
            or_(
                LegalComplianceRecord.status.is_(None),
                func.lower(LegalComplianceRecord.status).notin_(TERMINAL_LEGAL_STATUSES),
                LegalComplianceRecord.area.in_(("land_use_clearance", "developer_registration")),
            ),
        )
        .order_by(LegalComplianceRecord.due_date)
        .limit(10)
    )
    due_soon_result = await db.execute(due_soon_stmt)
    active_litigation = sum(
        1 for record in records
        if record.area == "litigation_notice" and (record.status or "").lower() not in TERMINAL_LEGAL_STATUSES
    )
    pending_approvals = sum(
        1 for record in records
        if record.area == "approval_workflow" and (record.status or "").lower() not in TERMINAL_LEGAL_STATUSES
    )
    return {
        "areas": areas,
        "due_soon": [_record_snapshot(record) for record in due_soon_result.scalars().all()],
        "active_litigation": active_litigation,
        "pending_approvals": pending_approvals,
    }


@router.get("/records", response_model=LegalRecordPage)
async def list_legal_records(
    area: str = Query(...),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    q: Optional[str] = Query(None, max_length=128),
    status_filter: Optional[str] = Query(None, alias="status"),
    project_id: Optional[int] = Query(None),
    due_from: Optional[date] = Query(None),
    due_to: Optional[date] = Query(None),
    record_type: Optional[str] = Query(None, max_length=64),
    mutation_application_status: Optional[str] = Query(None, max_length=64),
    mutation_outcome: Optional[str] = Query(None, max_length=64),
    tax_reconciliation_status: Optional[str] = Query(None, max_length=64),
    registration_type: Optional[str] = Query(None, max_length=64),
    registration_authority: Optional[str] = Query(None, max_length=64),
    approval_category: Optional[str] = Query(None, max_length=64),
    approval_authority: Optional[str] = Query(None, max_length=64),
    approval_reference: Optional[str] = Query(None, max_length=128),
    correspondence_direction: Optional[str] = Query(None, max_length=64),
    correspondence_type: Optional[str] = Query(None, max_length=64),
    correspondence_authority: Optional[str] = Query(None, max_length=128),
    correspondence_external_organization: Optional[str] = Query(None, max_length=128),
    thread_reference: Optional[str] = Query(None, max_length=128),
    agreement_type: Optional[str] = Query(None, max_length=64),
    transfer_status: Optional[str] = Query(None, max_length=64),
    sale_record_kind: Optional[str] = Query(None, max_length=64),
    execution_status: Optional[str] = Query(None, max_length=64),
    sale_workflow_stage: Optional[str] = Query(None, max_length=64),
    agreement_workflow_stage: Optional[str] = Query(None, max_length=64),
    transfer_workflow_stage: Optional[str] = Query(None, max_length=64),
    booking_id: Optional[int] = Query(None, ge=1),
    case_type: Optional[str] = Query(None, max_length=64),
    risk_level: Optional[str] = Query(None, max_length=64),
    case_status: Optional[str] = Query(None, max_length=64),
    case_workflow_stage: Optional[str] = Query(None, max_length=64),
    notice_type: Optional[str] = Query(None, max_length=64),
    notice_response_status: Optional[str] = Query(None, max_length=64),
    document_type: Optional[str] = Query(None, max_length=64),
    confidentiality: Optional[str] = Query(None, max_length=64),
    reminder_type: Optional[str] = Query(None, max_length=64),
    workflow_type: Optional[str] = Query(None, max_length=64),
    approval_stage: Optional[str] = Query(None, max_length=64),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_legal_lookup_categories(db)
    if area not in LEGAL_AREAS:
        raise HTTPException(status_code=422, detail="Unknown legal compliance area.")
    if area == "litigation_notice":
        if not _is_legal_staff_user(current_user):
            raise HTTPException(status_code=403, detail="Litigation records are restricted to assigned legal staff and authorized management.")
    filters = [LegalComplianceRecord.area == area]
    if area == "litigation_notice" and not _is_legal_management_user(current_user):
        identities = [name for name in {
            str(getattr(current_user, "username", "")).strip(),
            str(getattr(current_user, "full_name_en", "")).strip(),
        } if name]
        assigned_filters = [LegalComplianceRecord.data["assigned_inhouse_counsel"].as_string().in_(identities)]
        assigned_filters.append(LegalComplianceRecord.data["notice_responsible_officer"].as_string().in_(identities))
        filters.append(or_(*assigned_filters))
    if q:
        searchable = [
            LegalComplianceRecord.title.ilike(f"%{q}%"),
            LegalComplianceRecord.reference_no.ilike(f"%{q}%"),
        ]
        if area == "developer_registration":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in ("registration_number", "application_reference", "certificate_reference", "legal_entity")
            )
        if area == "approval_condition":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in ("approval_reference", "source_reference", "condition_text", "owner")
            )
        if area == "land_use_clearance":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in ("approval_number", "application_number", "approval_category", "parcel_reference")
            )
        if area == "noc_correspondence":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in ("correspondence_direction", "correspondence_type", "authority", "external_organization", "subject", "tracking_reference", "thread_reference", "parcel_reference", "related_approval_reference", "related_case_reference", "application_reference", "noc_category")
            )
        if area == "registered_record":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in (
                    "deed_number", "registration_reference", "khatian_number", "mutation_application_number",
                    "parcel_reference", "dag_numbers", "tax_receipt_reference", "assessment_reference",
                )
            )
        if area == "sale_transfer":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in (
                    "customer_name", "customer_reference", "sale_agreement_number", "booking_reference_no",
                    "customer_id", "booking_id", "source_agreement_record_id", "document_control_type",
                    "registration_deed_number", "unit_number", "agreement_type", "transfer_status",
                    "execution_status", "agreement_workflow_stage", "transfer_workflow_stage"
                )
            )
        if area == "litigation_notice":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in (
                    "internal_case_number", "case_number", "court_or_authority", "concerned_court",
                    "party_names", "appointed_advocate", "claimant_plaintiff", "respondent_defendant"
                )
            )
        if area == "document_archive":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in (
                    "document_title", "document_number", "document_type", "checksum", "unique_document_id"
                )
            )
        if area == "calendar_reminder":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in (
                    "task_id", "obligation_title", "reminder_type", "owner", "related_record_reference"
                )
            )
        if area == "approval_workflow":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in (
                    "workflow_id", "workflow_type", "reviewer_identity", "authorized_approver", "subject_title"
                )
            )
        if area == "compliance_report":
            searchable.extend(
                LegalComplianceRecord.data[key].as_string().ilike(f"%{q}%")
                for key in (
                    "report_title", "report_type", "prepared_by"
                )
            )
        filters.append(or_(*searchable))
    if status_filter:
        filters.append(LegalComplianceRecord.status == status_filter)
    if project_id is not None:
        filters.append(LegalComplianceRecord.project_id == project_id)
    if due_from:
        filters.append(LegalComplianceRecord.due_date >= due_from)
    if due_to:
        filters.append(LegalComplianceRecord.due_date <= due_to)
    if record_type:
        filters.append(LegalComplianceRecord.data["record_type"].as_string() == record_type)
    if mutation_application_status:
        filters.append(LegalComplianceRecord.data["mutation_application_status"].as_string() == mutation_application_status)
    if mutation_outcome:
        filters.append(LegalComplianceRecord.data["mutation_outcome"].as_string() == mutation_outcome)
    if tax_reconciliation_status:
        filters.append(LegalComplianceRecord.data["tax_reconciliation_status"].as_string() == tax_reconciliation_status)
    if registration_type:
        filters.append(LegalComplianceRecord.data["registration_type"].as_string() == registration_type)
    if registration_authority:
        filters.append(LegalComplianceRecord.data["registration_authority"].as_string() == registration_authority)
    if approval_category:
        filters.append(LegalComplianceRecord.data["approval_category"].as_string() == approval_category)
    if approval_authority:
        filters.append(LegalComplianceRecord.data["authority"].as_string() == approval_authority)
    if approval_reference:
        filters.append(LegalComplianceRecord.data["approval_reference"].as_string() == approval_reference)
    if agreement_type:
        filters.append(LegalComplianceRecord.data["agreement_type"].as_string() == agreement_type)
    if transfer_status:
        filters.append(LegalComplianceRecord.data["transfer_status"].as_string() == transfer_status)
    if sale_record_kind:
        filters.append(LegalComplianceRecord.data["document_control_type"].as_string() == sale_record_kind)
    if execution_status:
        filters.append(LegalComplianceRecord.data["execution_status"].as_string() == execution_status)
    if sale_workflow_stage:
        filters.append(or_(
            LegalComplianceRecord.data["agreement_workflow_stage"].as_string() == sale_workflow_stage,
            LegalComplianceRecord.data["transfer_workflow_stage"].as_string() == sale_workflow_stage,
        ))
    if agreement_workflow_stage:
        filters.append(LegalComplianceRecord.data["agreement_workflow_stage"].as_string() == agreement_workflow_stage)
    if transfer_workflow_stage:
        filters.append(LegalComplianceRecord.data["transfer_workflow_stage"].as_string() == transfer_workflow_stage)
    if booking_id is not None:
        filters.append(LegalComplianceRecord.data["booking_id"].as_string() == str(booking_id))
    if case_type:
        filters.append(LegalComplianceRecord.data["case_type"].as_string() == case_type)
    if risk_level:
        filters.append(LegalComplianceRecord.data["risk_level"].as_string() == risk_level)
    if case_status:
        filters.append(LegalComplianceRecord.data["case_status"].as_string() == case_status)
    if case_workflow_stage:
        filters.append(LegalComplianceRecord.data["case_workflow_stage"].as_string() == case_workflow_stage)
    if notice_type:
        filters.append(LegalComplianceRecord.data["notice_type"].as_string() == notice_type)
    if notice_response_status:
        filters.append(LegalComplianceRecord.data["notice_response_status"].as_string() == notice_response_status)
    if document_type:
        filters.append(LegalComplianceRecord.data["document_type"].as_string() == document_type)
    if confidentiality:
        filters.append(LegalComplianceRecord.data["confidentiality"].as_string() == confidentiality)
    if reminder_type:
        filters.append(LegalComplianceRecord.data["reminder_type"].as_string() == reminder_type)
    if workflow_type:
        filters.append(LegalComplianceRecord.data["workflow_type"].as_string() == workflow_type)
    if approval_stage:
        filters.append(LegalComplianceRecord.data["approval_stage"].as_string() == approval_stage)
    if area == "noc_correspondence":
        if correspondence_direction:
            filters.append(LegalComplianceRecord.data["correspondence_direction"].as_string() == correspondence_direction)
        if correspondence_type:
            filters.append(LegalComplianceRecord.data["correspondence_type"].as_string() == correspondence_type)
        if correspondence_authority:
            filters.append(or_(
                LegalComplianceRecord.data["authority"].as_string() == correspondence_authority,
                LegalComplianceRecord.data["external_organization"].as_string() == correspondence_authority,
            ))
        if correspondence_external_organization:
            filters.append(LegalComplianceRecord.data["external_organization"].as_string() == correspondence_external_organization)
        if thread_reference:
            filters.append(LegalComplianceRecord.data["thread_reference"].as_string() == thread_reference)
    total = await db.scalar(select(func.count(LegalComplianceRecord.id)).where(and_(*filters))) or 0
    result = await db.execute(
        select(LegalComplianceRecord).where(and_(*filters))
        .order_by(desc(LegalComplianceRecord.updated_at), desc(LegalComplianceRecord.id))
        .limit(limit).offset(offset)
    )
    return {"items": result.scalars().all(), "total": total, "limit": limit, "offset": offset}


@router.get("/records/{record_id}", response_model=LegalRecordResponse)
async def get_legal_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = await db.get(LegalComplianceRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Legal compliance record not found.")
    if record.area == "litigation_notice":
        _require_litigation_access(current_user, record.data or {})
    return record


@router.post("/records", response_model=LegalRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_legal_record(
    payload: LegalRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.data or {}
    if payload.area == "litigation_notice":
        _require_litigation_access(current_user, data, creating=True)
        _validate_litigation_controls(data, payload.status, current_user)
        data = dict(data)
        if _case_is_closed(payload.status, data):
            data["case_status"] = "CLOSED"
            data["case_workflow_stage"] = "CLOSED"
        data = _append_litigation_history(None, data, payload.status, current_user.username)
    _validate_registered_land_data(payload.area, data)
    _validate_clearance_review(payload.area, payload.status, data, current_user)
    if payload.area == "sale_transfer":
        _validate_sale_transfer_data(data, current_user, project_id=payload.project_id)
        await _validate_sale_transfer_source(db, data, None, payload.project_id)
        if _sale_record_kind(data) == "AGREEMENT":
            data = dict(data)
            data["agreement_version_history"] = []
            data["agreement_version_number"] = 1
    record = LegalComplianceRecord(
        area=payload.area, title=payload.title.strip(), reference_no=payload.reference_no,
        project_id=payload.project_id, status="CLOSED" if payload.area == "litigation_notice" and _case_is_closed(payload.status, data) else payload.status,
        due_date=_legal_record_due_date(payload.area, data) if payload.area in {"developer_registration", "land_use_clearance", "noc_correspondence", "sale_transfer", "litigation_notice"} else payload.due_date,
        data=data,
    )
    db.add(record)
    await db.flush()
    await _write_legal_audit(db, record.id, record.area, "CREATE", current_user.username, None, _record_snapshot(record))
    await db.commit()
    await db.refresh(record)
    return record


@router.patch("/records/{record_id}", response_model=LegalRecordResponse)
async def update_legal_record(
    record_id: int,
    payload: LegalRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = await db.get(LegalComplianceRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Legal compliance record not found.")
    before_data = _record_snapshot(record)
    update_data = payload.model_dump(exclude_unset=True)
    data = update_data.get("data", record.data or {})
    status_value = update_data.get("status", record.status)
    project_id = update_data.get("project_id", record.project_id)
    if record.area == "litigation_notice":
        _require_litigation_access(current_user, record.data or {})
        _validate_litigation_controls(data or {}, status_value, current_user, existing=record)
        data = dict(data or {})
        if _case_is_closed(status_value, data):
            data["case_status"] = "CLOSED"
            data["case_workflow_stage"] = "CLOSED"
            status_value = "CLOSED"
            update_data["status"] = "CLOSED"
        data = _append_litigation_history(record, data, status_value, current_user.username)
        update_data["data"] = data
    _validate_registered_land_data(record.area, data or {})
    _validate_clearance_review(record.area, status_value, data or {}, current_user)
    if record.area == "sale_transfer":
        data = dict(data or {})
        _validate_sale_transfer_data(data, current_user, existing=record, project_id=project_id)
        await _validate_sale_transfer_source(db, data, record.id, project_id)
        if _sale_record_kind(data) == "AGREEMENT":
            data = _append_sale_agreement_version(record, data, current_user.username, project_id)
        update_data["data"] = data
    for field, value in update_data.items():
        setattr(record, field, value)
    if record.area in {"developer_registration", "land_use_clearance", "noc_correspondence", "sale_transfer", "litigation_notice"}:
        record.due_date = _legal_record_due_date(record.area, record.data or {})
    await _write_legal_audit(db, record.id, record.area, "UPDATE", current_user.username, before_data, _record_snapshot(record))
    await db.commit()
    await db.refresh(record)
    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_legal_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = await db.get(LegalComplianceRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Legal compliance record not found.")
    if record.area == "litigation_notice":
        _require_litigation_access(current_user, record.data or {})
        if _case_is_closed(record.status, record.data or {}):
            raise HTTPException(status_code=409, detail="Closed litigation records are retained for audit and cannot be deleted.")
    if record.area == "sale_transfer" and _sale_record_kind(record.data or {}) == "AGREEMENT" and str((record.data or {}).get("execution_status", "")).strip().upper() in SALE_AGREEMENT_EXECUTED_VALUES:
        raise HTTPException(status_code=409, detail="Executed agreements are retained as legal evidence and cannot be deleted.")
    before_data = _record_snapshot(record)
    await _write_legal_audit(db, record.id, record.area, "DELETE", current_user.username, before_data, None)
    await db.delete(record)
    await db.commit()


@router.get("/audit", response_model=LegalAuditPage)
async def list_legal_audit_events(
    area: Optional[str] = Query(None),
    record_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = []
    if area:
        if area not in LEGAL_AREAS:
            raise HTTPException(status_code=422, detail="Unknown legal compliance area.")
        filters.append(LegalAuditEvent.area == area)
    if record_id is not None:
        filters.append(LegalAuditEvent.record_id == record_id)
    total = await db.scalar(select(func.count(LegalAuditEvent.id)).where(*filters)) or 0
    result = await db.execute(
        select(LegalAuditEvent).where(*filters)
        .order_by(desc(LegalAuditEvent.created_at), desc(LegalAuditEvent.id))
        .limit(limit).offset(offset)
    )
    return {"items": result.scalars().all(), "total": total, "limit": limit, "offset": offset}
