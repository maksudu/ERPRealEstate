import logging
import re
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_, and_, update, delete

from app.core.database import get_db
from app.modules.auth.models import User
from app.modules.projects.models import Project
from app.modules.crm.models import (
    Lead, LeadActivity, LeadAssignment, LeadAssignmentRule, LeadImportBatch,
    LeadQualification, Customer, Nominee, CustomerServiceRequest
)
from app.modules.crm.schemas import (
    LeadCreate, LeadUpdate, LeadResponse, LeadStageUpdate, LeadPaginatedOut,
    LeadActivityCreate, LeadActivityResponse,
    LeadAssignmentCreate, LeadAssignmentResponse, LeadAssignmentPaginatedOut,
    LeadAssignmentRuleCreate, LeadAssignmentRuleUpdate, LeadAssignmentRuleResponse,
    LeadAssignmentRulePaginatedOut,
    LeadImportRequest, LeadImportResponse, LeadImportPaginatedOut,
    BulkAssignRequest, DuplicateCheckResponse, LeadAssignmentQueueStats,
    CustomerCreate, CustomerUpdate, CustomerResponse, CustomerPaginatedOut,
    CustomerDuplicateCheckRequest, CustomerDuplicateCheckResponse, CustomerMergeRequest,
    NomineeCreate, NomineeUpdate, NomineeResponse,
    ServiceRequestCreate, ServiceRequestUpdate, ServiceRequestResponse, ServiceRequestPaginatedOut,
    LeadQualificationUpdate, LeadQualificationResponse, LeadQualificationPaginatedOut,
    FacebookWebhookPayload, WebsiteInquiryPayload, LeadScoreBreakdown
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crm", tags=["Omnichannel CRM & Customer KYC"])

# Global in-memory pointer for round-robin assignment among sales reps
_round_robin_counter = 0


async def _get_next_sales_rep(db: AsyncSession, project_id: Optional[int] = None) -> Optional[User]:
    """
    Selects the next active sales representative using sequential round-robin
    with project specialization awareness under Prompt 09.
    """
    global _round_robin_counter

    if project_id:
        proj_res = await db.execute(select(Project).where(Project.id == project_id))
        project = proj_res.scalars().first()
        if project and project.project_manager_id:
            pm_res = await db.execute(select(User).where(User.id == project.project_manager_id, User.is_active == True))
            pm = pm_res.scalars().first()
            if pm:
                return pm

    result = await db.execute(
        select(User).where(User.is_active == True).order_by(User.id.asc())
    )
    users = result.scalars().all()
    if not users:
        return None

    idx = _round_robin_counter % len(users)
    _round_robin_counter += 1
    return users[idx]


async def _get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    res = await db.execute(select(User).where(User.id == user_id))
    return res.scalars().first()


async def _generate_lead_code(db: AsyncSession) -> str:
    year = datetime.utcnow().year
    count_res = await db.execute(select(func.count(Lead.id)))
    next_num = (count_res.scalar() or 0) + 1
    return f"LEAD-{year}-{next_num:05d}"


async def _record_assignment(
    db: AsyncSession,
    lead: Lead,
    assigned_to_id: Optional[int],
    method: str,
    reason: Optional[str] = None,
    assigned_by_id: Optional[int] = None,
    sla_hours: int = 24
) -> LeadAssignment:
    """Deactivates previous active assignment and records a new one (Spec 4.3 history)."""
    previous_rep_id = lead.assigned_sales_rep_id

    await db.execute(
        update(LeadAssignment)
        .where(LeadAssignment.lead_id == lead.id, LeadAssignment.is_active == True)
        .values(is_active=False, released_at=datetime.utcnow())
    )

    deadline = datetime.utcnow() + timedelta(hours=sla_hours)
    assignment = LeadAssignment(
        lead_id=lead.id,
        assigned_to_id=assigned_to_id,
        assigned_by_id=assigned_by_id,
        previous_rep_id=previous_rep_id,
        assignment_method=method,
        assignment_reason=reason,
        response_sla_hours=sla_hours,
        is_active=True
    )
    db.add(assignment)

    lead.assigned_sales_rep_id = assigned_to_id
    lead.assignment_method = method
    lead.first_response_deadline = deadline
    return assignment


def compute_lead_scoring_details(lead: Lead) -> LeadScoreBreakdown:
    """
    Enterprise Lead Qualification & Scoring Engine (Spec 4.4).
    Configurable 0-100 score that ASSISTS sales — never auto-rejects a prospect.
    Factors:
      1. Budget Fit (0-20)
      2. Contact Completeness (0-15)
      3. Source Quality (0-20)
      4. Engagement / Stage Progression (0-20)
      5. Timeline Fit (0-15) — expected purchase date proximity
      6. Financing Readiness (0-10)
    5-tier health grades: HOT, WARM, COLD, UNQUALIFIED, NURTURE.
    Qualification reasons are accumulated and returned for display/edit.
    """
    reasons: list[str] = []

    # 1. Budget Fit (0-20)
    budget_fit = 8
    budget_min = float(lead.budget_range_min or 0.0)
    if budget_min >= 25000000.0:
        budget_fit = 20
        reasons.append("High budget fit (≥2.5 Cr)")
    elif budget_min >= 15000000.0:
        budget_fit = 16
        reasons.append("Strong budget fit (≥1.5 Cr)")
    elif budget_min >= 8000000.0:
        budget_fit = 12
        reasons.append("Moderate budget fit (≥80 Lakh)")
    elif budget_min > 0:
        budget_fit = 8
        reasons.append("Budget provided (below 80 Lakh)")

    # 2. Contact Completeness (0-15)
    contact_score = 0
    if lead.primary_phone:
        contact_score += 10
    if lead.email:
        contact_score += 5
        reasons.append("Email provided")
    if not lead.email:
        reasons.append("No email on file")

    # 3. Source Quality (0-20)
    source = (lead.lead_source_id or "").upper()
    source_map = {
        "WALK_IN": 20, "REFERRAL": 18, "EXHIBITION": 16, "BROKER": 15,
        "WEBSITE_FORM": 14, "WEB_FORM": 14, "WHATSAPP": 13, "PHONE_CALL": 12,
        "FACEBOOK_ADS": 11, "EMAIL": 10, "DIGITAL_CAMPAIGN": 10, "MANUAL_ENTRY": 8
    }
    source_score = source_map.get(source, 8)
    reasons.append(f"Source: {source.replace('_', ' ').title()}")

    # 4. Engagement / Stage Progression (0-20)
    stage = (lead.lead_stage or "NEW").upper()
    stage_weights = {
        "TOKEN_BOOKED": 20, "BOOKED": 20, "NEGOTIATION": 18,
        "SITE_VISIT_COMPLETED": 16, "VISITED": 16, "SITE_VISIT_SCHEDULED": 12,
        "QUALIFIED": 12, "CONTACTED": 8, "NEW": 4, "LOST": 0, "DROPPED": 0
    }
    engagement_score = stage_weights.get(stage, 4)
    if stage in ("TOKEN_BOOKED", "BOOKED"):
        reasons.append("Booking / token stage reached")
    elif stage in ("SITE_VISIT_COMPLETED", "VISITED"):
        reasons.append("Site visit completed")
    elif stage == "NEGOTIATION":
        reasons.append("In active negotiation")
    elif stage in ("LOST", "DROPPED"):
        reasons.append("Stage marked lost/dropped")

    # 5. Timeline Fit (0-15)
    timeline_score = 5
    if lead.expected_purchase_date:
        days_until = (lead.expected_purchase_date - datetime.utcnow().date()).days
        if days_until <= 30:
            timeline_score = 15
            reasons.append("Purchase within 30 days")
        elif days_until <= 90:
            timeline_score = 12
            reasons.append("Purchase within 90 days")
        elif days_until <= 180:
            timeline_score = 8
            reasons.append("Purchase within 6 months")
        else:
            timeline_score = 4
            reasons.append("Purchase timeline beyond 6 months")
    else:
        reasons.append("No expected purchase date provided")

    # 6. Financing Readiness (0-10)
    financing_score = 3
    if lead.financing_ready is True:
        financing_score = 10
        reasons.append("Financing ready (cash/loan approved)")
    elif lead.financing_ready is False:
        financing_score = 1
        reasons.append("Financing not yet ready")
    else:
        reasons.append("Financing readiness not provided")

    # Decision-maker bonus signal
    if lead.decision_maker_available is True:
        reasons.append("Decision-maker available")
        engagement_score = min(engagement_score + 2, 20)
    elif lead.decision_maker_available is False:
        reasons.append("Decision-maker not yet available")

    # Total (cap 100)
    computed_total = min(
        budget_fit + contact_score + source_score + engagement_score + timeline_score + financing_score,
        100
    )

    # Manual override takes precedence for displayed score (Spec 4.4: staff can override)
    if lead.manual_score_override is not None:
        total_score = max(0, min(int(lead.manual_score_override), 100))
        reasons.append(f"Manual score override applied: {total_score}")
    else:
        total_score = computed_total

    # 5-tier health grade mapping
    if lead.health_grade in ("UNQUALIFIED", "NURTURE") and lead.manual_score_override is None:
        # Staff-set classification persists until manually changed or high score re-computes it
        health_grade = lead.health_grade
    elif total_score >= 75:
        health_grade = "HOT"
    elif total_score >= 55:
        health_grade = "WARM"
    elif total_score >= 35:
        health_grade = "COLD"
    elif total_score >= 15:
        health_grade = "NURTURE"
    else:
        health_grade = "UNQUALIFIED"

    # Recommended action per grade
    action_map = {
        "HOT": "High purchase intent — schedule immediate site visit or contract drafting.",
        "WARM": "Interested prospect — schedule floor plan presentation and budget tailoring follow-up.",
        "COLD": "Early-stage interest — send brochure, nurture with project updates.",
        "NURTURE": "Potential future opportunity — add to long-term marketing drip campaign.",
        "UNQUALIFIED": "Does not currently meet agreed criteria — revisit after budget/timeline changes. Score assists; does not auto-reject."
    }
    action = action_map.get(health_grade, action_map["COLD"])

    # Engagement flags (milestones)
    engagement_flags = {
        "has_phone": bool(lead.primary_phone),
        "has_email": bool(lead.email),
        "has_project": bool(lead.interested_project_id),
        "has_budget": bool(lead.budget_range_min or lead.budget_range_max),
        "has_timeline": bool(lead.expected_purchase_date),
        "financing_ready": lead.financing_ready,
        "decision_maker_available": lead.decision_maker_available,
        "stage": stage
    }
    import json as _json
    engagement_flags_json = _json.dumps(engagement_flags)

    return LeadScoreBreakdown(
        lead_id=lead.id,
        lead_name=lead.lead_name,
        total_score=total_score,
        budget_fit_score=budget_fit,
        contact_completeness_score=contact_score,
        source_quality_score=source_score,
        engagement_progression_score=engagement_score,
        timeline_fit_score=timeline_score,
        financing_score=financing_score,
        lead_stage=lead.lead_stage,
        health_grade=health_grade,
        qualification_reasons="; ".join(reasons),
        recommended_action=action,
        financing_ready=lead.financing_ready,
        decision_maker_available=lead.decision_maker_available,
        manual_score_override=lead.manual_score_override
    )


async def _persist_qualification(
    db: AsyncSession,
    lead: Lead,
    breakdown: LeadScoreBreakdown,
    computed_by: str = "SYSTEM",
    computed_by_id: Optional[int] = None
) -> LeadQualification:
    """Persist computed score onto Lead and write a qualification history row (Spec 4.4)."""
    lead.lead_score = breakdown.total_score
    lead.health_grade = breakdown.health_grade
    if breakdown.qualification_reasons and not lead.qualification_reasons:
        lead.qualification_reasons = breakdown.qualification_reasons
    lead.last_scored_at = datetime.utcnow()

    qual = LeadQualification(
        lead_id=lead.id,
        total_score=breakdown.total_score,
        health_grade=breakdown.health_grade,
        budget_fit_score=breakdown.budget_fit_score,
        contact_completeness_score=breakdown.contact_completeness_score,
        source_quality_score=breakdown.source_quality_score,
        engagement_progression_score=breakdown.engagement_progression_score,
        timeline_fit_score=breakdown.timeline_fit_score,
        financing_score=breakdown.financing_score,
        qualification_reasons=breakdown.qualification_reasons,
        recommended_action=breakdown.recommended_action,
        engagement_flags=None,
        computed_by=computed_by,
        computed_by_id=computed_by_id
    )
    db.add(qual)
    return qual


def _lead_to_response(l: Lead) -> LeadResponse:
    resp = LeadResponse.model_validate(l)
    if l.assigned_sales_rep:
        resp.assigned_sales_rep_name = l.assigned_sales_rep.full_name_en
    if l.interested_project:
        resp.interested_project_name = l.interested_project.project_name
    return resp


_LEAD_LOAD_OPTIONS = (
    selectinload(Lead.activities),
    selectinload(Lead.assigned_sales_rep),
    selectinload(Lead.interested_project),
    selectinload(Lead.assignments).selectinload(LeadAssignment.assigned_to),
)


# ==========================================================================
# 4.2 Facebook & Website Webhook Ingestion
# ==========================================================================
@router.get("/webhooks/facebook")
async def verify_facebook_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token")
):
    VERIFY_TOKEN = "ERPREALESTATE_FB_VERIFY_TOKEN_2026"
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        logger.info("Facebook Webhook challenge verified successfully.")
        return int(hub_challenge) if hub_challenge and hub_challenge.isdigit() else hub_challenge
    elif hub_challenge:
        return int(hub_challenge) if hub_challenge.isdigit() else hub_challenge
    return {"status": "ready", "message": "Facebook Lead Ads Webhook endpoint active"}


@router.post("/webhooks/facebook")
async def receive_facebook_lead_webhook(
    payload: FacebookWebhookPayload,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    lead_name = payload.lead_name or "Facebook Prospect"
    primary_phone = payload.phone_number or "+8801700000000"
    email = payload.email
    campaign_name = payload.campaign_name or "FB-Lead-Ad-Campaign"
    interested_project_id = None

    if payload.entry:
        try:
            for entry in payload.entry:
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    if "leadgen_id" in value:
                        lead_name = f"FB Lead #{value.get('leadgen_id')}"
                    if "adgroup_name" in value:
                        campaign_name = value.get("adgroup_name")
        except Exception as e:
            logger.warning(f"Error parsing raw FB entries: {e}")

    if payload.interested_project_code:
        prj_res = await db.execute(select(Project).where(Project.project_code == payload.interested_project_code))
        proj = prj_res.scalars().first()
        if proj:
            interested_project_id = proj.id

    sales_rep = await _get_next_sales_rep(db)
    sales_rep_id = sales_rep.id if sales_rep else None

    lead_score = 65
    if email and primary_phone:
        lead_score += 15
    if interested_project_id:
        lead_score += 10

    new_lead = Lead(
        lead_source_id="FACEBOOK_ADS",
        original_source_id="FACEBOOK_ADS",
        campaign_name=campaign_name,
        utm_source="FACEBOOK_ADS",
        utm_campaign=campaign_name,
        lead_name=lead_name,
        primary_phone=primary_phone,
        email=email,
        preferred_contact_method="PHONE",
        interested_project_id=interested_project_id,
        budget_range_min=10000000.00,
        budget_range_max=25000000.00,
        assigned_sales_rep_id=sales_rep_id,
        assignment_method="ROUND_ROBIN",
        lead_stage="NEW",
        lead_score=min(lead_score, 100),
        priority="MEDIUM",
        notes="Automated lead captured via Facebook Ads Lead Webhook."
    )
    new_lead.lead_code = await _generate_lead_code(db)
    db.add(new_lead)
    await db.flush()

    await _record_assignment(db, new_lead, sales_rep_id, "ROUND_ROBIN", "Facebook webhook auto-assignment")

    activity = LeadActivity(
        lead_id=new_lead.id,
        sales_rep_id=sales_rep_id,
        activity_type="STAGE_CHANGE",
        activity_summary=f"Lead captured via Facebook Webhook. Assigned to {sales_rep.full_name_en if sales_rep else 'Unassigned'}.",
        outcome="NEW_LEAD"
    )
    db.add(activity)
    await db.commit()
    await db.refresh(new_lead)

    return {
        "status": "success",
        "lead_id": new_lead.id,
        "lead_code": new_lead.lead_code,
        "lead_name": new_lead.lead_name,
        "assigned_to": sales_rep.full_name_en if sales_rep else "Unassigned",
        "lead_score": new_lead.lead_score
    }


@router.post("/webhooks/website-inquiry")
async def receive_website_inquiry(
    payload: WebsiteInquiryPayload,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    interested_project_id = payload.interested_project_id
    if not interested_project_id and payload.project_code:
        prj_res = await db.execute(select(Project).where(Project.project_code == payload.project_code))
        p = prj_res.scalars().first()
        if p:
            interested_project_id = p.id

    sales_rep = await _get_next_sales_rep(db, project_id=interested_project_id)
    sales_rep_id = sales_rep.id if sales_rep else None

    lead = Lead(
        lead_source_id="WEBSITE_FORM",
        original_source_id="WEBSITE_FORM",
        campaign_name=payload.utm_campaign or "Website-Inquiry-Direct",
        utm_source=payload.utm_source,
        utm_campaign=payload.utm_campaign,
        lead_name=payload.full_name,
        primary_phone=payload.phone_number,
        email=payload.email,
        preferred_contact_method="PHONE",
        interested_project_id=interested_project_id,
        property_type=payload.property_type or payload.preferred_unit_type,
        preferred_location=payload.preferred_location,
        bedrooms=payload.bedrooms,
        budget_range_min=payload.budget_range_min or 10000000.0,
        budget_range_max=payload.budget_range_max or 25000000.0,
        assigned_sales_rep_id=sales_rep_id,
        assignment_method="ROUND_ROBIN",
        lead_stage="NEW",
        lead_score=70,
        priority="MEDIUM",
        notes=f"Website Inbound Message: {payload.message or 'Interested in unit details.'}"
    )
    lead.lead_code = await _generate_lead_code(db)
    db.add(lead)
    await db.flush()

    scoring = compute_lead_scoring_details(lead)
    await _persist_qualification(db, lead, scoring, computed_by="SYSTEM")

    await _record_assignment(db, lead, sales_rep_id, "ROUND_ROBIN", "Website inquiry auto-assignment")

    activity = LeadActivity(
        lead_id=lead.id,
        sales_rep_id=sales_rep_id,
        activity_type="STAGE_CHANGE",
        activity_summary=f"Website inquiry ingested. Auto-assigned to {sales_rep.full_name_en if sales_rep else 'General Queue'}.",
        outcome="NEW_LEAD"
    )
    db.add(activity)
    await db.commit()
    await db.refresh(lead)

    return {
        "status": "success",
        "lead_id": lead.id,
        "lead_code": lead.lead_code,
        "lead_name": lead.lead_name,
        "assigned_to": sales_rep.full_name_en if sales_rep else "Unassigned",
        "lead_score": lead.lead_score,
        "health_grade": scoring.health_grade
    }


# ==========================================================================
# 4.2 Duplicate Detection
# ==========================================================================
@router.post("/leads/check-duplicates", response_model=DuplicateCheckResponse)
async def check_lead_duplicates(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Detects potential duplicate leads by normalized phone and email (Spec 4.2).
    Accepts {"primary_phone": "...", "email": "...", "exclude_lead_id": 123?}
    """
    phone = (payload.get("primary_phone") or "").strip()
    email = (payload.get("email") or "").strip().lower() or None
    exclude_id = payload.get("exclude_lead_id")

    conditions = []
    if phone:
        cleaned = phone.replace(" ", "").replace("-", "")
        conditions.append(or_(
            Lead.primary_phone == phone,
            Lead.primary_phone == cleaned,
            func.replace(func.replace(Lead.primary_phone, "-", ""), " ", "") == cleaned
        ))
    if email:
        conditions.append(func.lower(Lead.email) == email)

    if not conditions:
        return DuplicateCheckResponse(is_duplicate=False)

    stmt = select(Lead).where(or_(*conditions)).options(*_LEAD_LOAD_OPTIONS).order_by(Lead.id.desc()).limit(10)
    if exclude_id:
        stmt = stmt.where(Lead.id != exclude_id)

    res = await db.execute(stmt)
    matches = res.scalars().all()
    return DuplicateCheckResponse(
        is_duplicate=len(matches) > 0,
        matching_lead_ids=[m.id for m in matches],
        matching_leads=[_lead_to_response(m) for m in matches]
    )


# ==========================================================================
# 4.2 Leads CRUD — List (Kanban) + Paginated Table
# ==========================================================================
@router.get("/leads", response_model=List[LeadResponse])
async def list_leads(
    lead_stage: Optional[str] = None,
    search: Optional[str] = None,
    sales_rep_id: Optional[int] = None,
    lead_source_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Kanban/list view — full filtered list without pagination."""
    stmt = (
        select(Lead)
        .options(*_LEAD_LOAD_OPTIONS)
        .order_by(Lead.updated_at.desc())
    )
    if lead_stage:
        stmt = stmt.where(Lead.lead_stage == lead_stage.upper())
    if sales_rep_id:
        stmt = stmt.where(Lead.assigned_sales_rep_id == sales_rep_id)
    if lead_source_id:
        stmt = stmt.where(Lead.lead_source_id == lead_source_id.upper())
    if search:
        sp = f"%{search}%"
        stmt = stmt.where(or_(
            Lead.lead_name.ilike(sp),
            Lead.primary_phone.ilike(sp),
            Lead.email.ilike(sp),
            Lead.campaign_name.ilike(sp),
            Lead.lead_code.ilike(sp)
        ))

    result = await db.execute(stmt)
    return [_lead_to_response(l) for l in result.scalars().all()]


@router.get("/leads/table", response_model=LeadPaginatedOut)
async def list_leads_table(
    search: Optional[str] = None,
    lead_stage: Optional[str] = None,
    lead_source_id: Optional[str] = None,
    priority: Optional[str] = None,
    property_type: Optional[str] = None,
    sales_rep_id: Optional[int] = None,
    project_id: Optional[int] = None,
    is_unassigned: Optional[bool] = None,
    is_opted_out: Optional[bool] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = "updated_at_desc",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Paginated, filterable lead table for the Lead Capture screen (Spec 4.2)."""
    q = select(Lead)
    if lead_stage:
        q = q.where(Lead.lead_stage == lead_stage.upper())
    if lead_source_id:
        q = q.where(Lead.lead_source_id == lead_source_id.upper())
    if priority:
        q = q.where(Lead.priority == priority.upper())
    if property_type:
        q = q.where(Lead.property_type == property_type.upper())
    if sales_rep_id:
        q = q.where(Lead.assigned_sales_rep_id == sales_rep_id)
    if project_id:
        q = q.where(Lead.interested_project_id == project_id)
    if is_unassigned is True:
        q = q.where(Lead.assigned_sales_rep_id.is_(None))
    if is_unassigned is False:
        q = q.where(Lead.assigned_sales_rep_id.isnot(None))
    if is_opted_out is not None:
        q = q.where(Lead.is_opted_out == is_opted_out)
    if date_from:
        q = q.where(Lead.created_at >= date_from)
    if date_to:
        q = q.where(Lead.created_at <= date_to)
    if search:
        sp = f"%{search.strip()}%"
        q = q.where(or_(
            Lead.lead_name.ilike(sp),
            Lead.primary_phone.ilike(sp),
            Lead.email.ilike(sp),
            Lead.campaign_name.ilike(sp),
            Lead.lead_code.ilike(sp),
            Lead.preferred_location.ilike(sp)
        ))

    cnt = await db.execute(select(func.count()).select_from(q.subquery()))
    total = cnt.scalar() or 0

    sort_map = {
        "updated_at_desc": Lead.updated_at.desc(),
        "updated_at_asc": Lead.updated_at.asc(),
        "created_at_desc": Lead.created_at.desc(),
        "created_at_asc": Lead.created_at.asc(),
        "lead_score_desc": Lead.lead_score.desc(),
        "lead_score_asc": Lead.lead_score.asc(),
        "lead_name_asc": Lead.lead_name.asc(),
        "lead_name_desc": Lead.lead_name.desc(),
    }
    order = sort_map.get(sort_by, Lead.updated_at.desc())

    res = await db.execute(
        q.options(*_LEAD_LOAD_OPTIONS).order_by(order).limit(limit).offset(offset)
    )
    items = [_lead_to_response(l) for l in res.scalars().all()]
    return LeadPaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Lead).options(*_LEAD_LOAD_OPTIONS).where(Lead.id == lead_id))
    lead = res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _lead_to_response(lead)


@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(payload: LeadCreate, db: AsyncSession = Depends(get_db)):
    """
    Creates a new lead (Spec 4.2 manual/walk-in/broker entry) with duplicate detection,
    auto lead code, scoring, and assignment-record creation (Spec 4.3).
    """
    # Duplicate detection by phone (normalized)
    cleaned_phone = payload.primary_phone.replace(" ", "").replace("-", "")
    dup_res = await db.execute(
        select(Lead).where(
            or_(
                Lead.primary_phone == payload.primary_phone,
                func.replace(func.replace(Lead.primary_phone, "-", ""), " ", "") == cleaned_phone
            )
        ).order_by(Lead.id.desc()).limit(1)
    )
    existing = dup_res.scalars().first()

    assigned_rep_id = payload.assigned_sales_rep_id
    assignment_method = "MANUAL" if assigned_rep_id else "ROUND_ROBIN"
    if not assigned_rep_id:
        rep = await _get_next_sales_rep(db, project_id=payload.interested_project_id)
        if rep:
            assigned_rep_id = rep.id

    lead = Lead(
        lead_source_id=payload.lead_source_id or "MANUAL_ENTRY",
        original_source_id=payload.lead_source_id or "MANUAL_ENTRY",
        campaign_name=payload.campaign_name,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
        referrer_broker_id=payload.referrer_broker_id,
        referral_customer_id=payload.referral_customer_id,
        lead_name=payload.lead_name,
        primary_phone=payload.primary_phone,
        email=payload.email,
        preferred_contact_method=payload.preferred_contact_method or "PHONE",
        is_consent_given=payload.is_consent_given,
        interested_project_id=payload.interested_project_id,
        property_type=payload.property_type,
        preferred_location=payload.preferred_location,
        required_area_sqft=payload.required_area_sqft,
        bedrooms=payload.bedrooms,
        expected_purchase_date=payload.expected_purchase_date,
        budget_range_min=payload.budget_range_min,
        budget_range_max=payload.budget_range_max,
        assigned_sales_rep_id=assigned_rep_id,
        assignment_method=assignment_method,
        lead_stage=payload.lead_stage or "NEW",
        lead_score=50,
        priority=payload.priority or "MEDIUM",
        is_duplicate=bool(existing),
        duplicate_of_lead_id=existing.id if existing else None,
        notes=payload.notes,
        financing_ready=payload.financing_ready,
        decision_maker_available=payload.decision_maker_available
    )
    scoring = compute_lead_scoring_details(lead)
    lead.lead_code = await _generate_lead_code(db)

    db.add(lead)
    await db.flush()

    await _persist_qualification(db, lead, scoring, computed_by="SYSTEM")
    await _record_assignment(db, lead, assigned_rep_id, assignment_method, "Initial assignment on lead creation")

    activity = LeadActivity(
        lead_id=lead.id,
        sales_rep_id=assigned_rep_id,
        activity_type="STAGE_CHANGE",
        activity_summary=f"Lead {lead.lead_code} registered under stage {lead.lead_stage}."
                         + (f" Possible duplicate of {existing.lead_code}." if existing else ""),
        outcome="CREATED"
    )
    db.add(activity)
    await db.commit()

    res = await db.execute(select(Lead).options(*_LEAD_LOAD_OPTIONS).where(Lead.id == lead.id))
    saved = res.scalars().first()
    return _lead_to_response(saved)


@router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: int, payload: LeadUpdate, db: AsyncSession = Depends(get_db)):
    """Full edit for a captured lead (Spec 4.2)."""
    res = await db.execute(select(Lead).options(*_LEAD_LOAD_OPTIONS).where(Lead.id == lead_id))
    lead = res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(lead, key, value)

    scoring = compute_lead_scoring_details(lead)
    await _persist_qualification(db, lead, scoring, computed_by="SYSTEM")

    await db.commit()
    await db.refresh(lead)
    res2 = await db.execute(select(Lead).options(*_LEAD_LOAD_OPTIONS).where(Lead.id == lead_id))
    return _lead_to_response(res2.scalars().first())


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.commit()
    return {"message": "Lead deleted", "id": lead_id}


# ==========================================================================
# Lead Stage & Scoring
# ==========================================================================
@router.get("/leads/{lead_id}/scoring-breakdown", response_model=LeadScoreBreakdown)
async def get_lead_scoring_breakdown(lead_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return compute_lead_scoring_details(lead)


# ==========================================================================
# 4.4 Lead Qualification & Scoring Workbench
# ==========================================================================
@router.put("/leads/{lead_id}/qualification", response_model=LeadResponse)
async def update_lead_qualification(
    lead_id: int,
    payload: LeadQualificationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Manual qualification update by authorized staff (Spec 4.4).
    Health grade and score are editable; reasons are stored. Score ASSISTS — never auto-rejects.
    """
    res = await db.execute(select(Lead).options(*_LEAD_LOAD_OPTIONS).where(Lead.id == lead_id))
    lead = res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if payload.health_grade is not None:
        allowed = {"HOT", "WARM", "COLD", "UNQUALIFIED", "NURTURE"}
        if payload.health_grade.upper() not in allowed:
            raise HTTPException(status_code=400, detail=f"health_grade must be one of {allowed}")
        lead.health_grade = payload.health_grade.upper()

    if payload.manual_score_override is not None:
        lead.manual_score_override = max(0, min(int(payload.manual_score_override), 100))

    if payload.qualification_reasons is not None:
        lead.qualification_reasons = payload.qualification_reasons

    if payload.financing_ready is not None:
        lead.financing_ready = payload.financing_ready

    if payload.decision_maker_available is not None:
        lead.decision_maker_available = payload.decision_maker_available

    lead.qualified_at = datetime.utcnow()

    # Recompute with overrides applied and persist history
    scoring = compute_lead_scoring_details(lead)
    await _persist_qualification(db, lead, scoring, computed_by="MANUAL")

    await db.commit()
    await db.refresh(lead)
    res2 = await db.execute(select(Lead).options(*_LEAD_LOAD_OPTIONS).where(Lead.id == lead_id))
    return _lead_to_response(res2.scalars().first())


@router.get("/leads/{lead_id}/qualifications", response_model=List[LeadQualificationResponse])
async def get_lead_qualification_history(
    lead_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Full score/qualification history for a lead (Spec 4.4 audit trail)."""
    res = await db.execute(
        select(LeadQualification)
        .options(selectinload(LeadQualification.computed_by_user))
        .where(LeadQualification.lead_id == lead_id)
        .order_by(LeadQualification.computed_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = []
    for q in res.scalars().all():
        resp = LeadQualificationResponse.model_validate(q)
        if q.lead:
            resp.lead_name = q.lead.lead_name
            resp.lead_code = q.lead.lead_code
        items.append(resp)
    return items


@router.get("/leads/qualification/table", response_model=LeadPaginatedOut)
async def list_leads_qualification_table(
    search: Optional[str] = None,
    health_grade: Optional[str] = None,
    lead_stage: Optional[str] = None,
    financing_ready: Optional[bool] = None,
    decision_maker_available: Optional[bool] = None,
    min_score: Optional[int] = None,
    max_score: Optional[int] = None,
    sort_by: str = "lead_score_desc",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Paginated qualification workbench (Spec 4.4) — filter by health grade, score range, flags."""
    q = select(Lead)
    if health_grade:
        q = q.where(Lead.health_grade == health_grade.upper())
    if lead_stage:
        q = q.where(Lead.lead_stage == lead_stage.upper())
    if financing_ready is not None:
        q = q.where(Lead.financing_ready == financing_ready)
    if decision_maker_available is not None:
        q = q.where(Lead.decision_maker_available == decision_maker_available)
    if min_score is not None:
        q = q.where(Lead.lead_score >= min_score)
    if max_score is not None:
        q = q.where(Lead.lead_score <= max_score)
    if search:
        sp = f"%{search.strip()}%"
        q = q.where(or_(
            Lead.lead_name.ilike(sp),
            Lead.lead_code.ilike(sp),
            Lead.primary_phone.ilike(sp),
            Lead.qualification_reasons.ilike(sp)
        ))

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0

    sort_map = {
        "lead_score_desc": Lead.lead_score.desc(),
        "lead_score_asc": Lead.lead_score.asc(),
        "created_at_desc": Lead.created_at.desc(),
        "created_at_asc": Lead.created_at.asc(),
        "updated_at_desc": Lead.updated_at.desc(),
    }
    order = sort_map.get(sort_by, Lead.lead_score.desc())

    res = await db.execute(
        q.options(*_LEAD_LOAD_OPTIONS).order_by(order).limit(limit).offset(offset)
    )
    items = [_lead_to_response(l) for l in res.scalars().all()]
    return LeadPaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.put("/leads/{lead_id}/stage", response_model=LeadResponse)
async def update_lead_stage(
    lead_id: int,
    payload: LeadStageUpdate,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Lead).options(*_LEAD_LOAD_OPTIONS).where(Lead.id == lead_id))
    lead = res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_stage = lead.lead_stage
    new_stage = payload.lead_stage.upper()
    lead.lead_stage = new_stage
    if payload.lost_reason:
        lead.lost_reason = payload.lost_reason

    scoring = compute_lead_scoring_details(lead)
    await _persist_qualification(db, lead, scoring, computed_by="SYSTEM")

    activity = LeadActivity(
        lead_id=lead.id,
        sales_rep_id=lead.assigned_sales_rep_id,
        activity_type="STAGE_CHANGE",
        activity_summary=f"Stage updated from {old_stage} to {new_stage}. {payload.notes or ''}".strip(),
        outcome=new_stage
    )
    db.add(activity)
    await db.commit()
    await db.refresh(lead)
    res2 = await db.execute(select(Lead).options(*_LEAD_LOAD_OPTIONS).where(Lead.id == lead_id))
    return _lead_to_response(res2.scalars().first())


# ==========================================================================
# 4.3 Lead Assignment & Distribution
# ==========================================================================
@router.post("/leads/{lead_id}/assign", response_model=LeadAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_lead(
    lead_id: int,
    payload: LeadAssignmentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Manual re-assignment of a lead to a sales rep (Spec 4.3).
    Records full assignment history and preserves previous owner.
    """
    res = await db.execute(select(Lead).options(*_LEAD_LOAD_OPTIONS).where(Lead.id == lead_id))
    lead = res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    target = await _get_user_by_id(db, payload.assigned_to_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=400, detail="Target sales representative not found or inactive")

    assignment = await _record_assignment(
        db, lead, payload.assigned_to_id,
        payload.assignment_method or "MANUAL",
        payload.assignment_reason,
        payload.assigned_by_id,
        payload.response_sla_hours or 24
    )

    activity = LeadActivity(
        lead_id=lead.id,
        sales_rep_id=payload.assigned_to_id,
        activity_type="STAGE_CHANGE",
        activity_summary=f"Lead assigned to {target.full_name_en} via {payload.assignment_method or 'MANUAL'}. {payload.assignment_reason or ''}".strip(),
        outcome="ASSIGNED"
    )
    db.add(activity)
    await db.commit()
    await db.refresh(assignment)

    resp = LeadAssignmentResponse.model_validate(assignment)
    resp.assigned_to_name = target.full_name_en
    resp.lead_name = lead.lead_name
    resp.lead_code = lead.lead_code
    return resp


@router.post("/leads/bulk-assign")
async def bulk_assign_leads(payload: BulkAssignRequest, db: AsyncSession = Depends(get_db)):
    """
    Bulk assign multiple leads — either to one rep (MANUAL) or distribute via ROUND_ROBIN (Spec 4.3).
    """
    res = await db.execute(select(Lead).where(Lead.id.in_(payload.lead_ids)).options(*_LEAD_LOAD_OPTIONS))
    leads = res.scalars().all()
    if not leads:
        raise HTTPException(status_code=404, detail="No leads found for the given IDs")

    assigned_count = 0
    skipped = []

    if payload.assignment_method == "ROUND_ROBIN":
        for lead in leads:
            rep = await _get_next_sales_rep(db, project_id=lead.interested_project_id)
            if rep:
                await _record_assignment(db, lead, rep.id, "ROUND_ROBIN", payload.assignment_reason, sla_hours=payload.response_sla_hours)
                assigned_count += 1
            else:
                skipped.append(lead.id)
    else:
        if not payload.assigned_to_id:
            raise HTTPException(status_code=400, detail="assigned_to_id is required for MANUAL bulk assignment")
        target = await _get_user_by_id(db, payload.assigned_to_id)
        if not target or not target.is_active:
            raise HTTPException(status_code=400, detail="Target sales representative not found or inactive")
        for lead in leads:
            await _record_assignment(db, lead, payload.assigned_to_id, "MANUAL", payload.assignment_reason, sla_hours=payload.response_sla_hours)
            assigned_count += 1

    await db.commit()
    return {
        "message": f"Assigned {assigned_count} lead(s)",
        "assigned_count": assigned_count,
        "skipped_lead_ids": skipped
    }


@router.get("/leads/{lead_id}/assignments", response_model=List[LeadAssignmentResponse])
async def get_lead_assignment_history(lead_id: int, db: AsyncSession = Depends(get_db)):
    """Full assignment history for a lead (Spec 4.3 — preserves previous owners)."""
    res = await db.execute(
        select(LeadAssignment)
        .options(
            selectinload(LeadAssignment.assigned_to),
            selectinload(LeadAssignment.assigned_by),
        )
        .where(LeadAssignment.lead_id == lead_id)
        .order_by(LeadAssignment.assigned_at.desc())
    )
    rows = res.scalars().all()
    out = []
    for a in rows:
        resp = LeadAssignmentResponse.model_validate(a)
        if a.assigned_to:
            resp.assigned_to_name = a.assigned_to.full_name_en
        if a.assigned_by:
            resp.assigned_by_name = a.assigned_by.full_name_en
        out.append(resp)
    return out


@router.get("/assignments", response_model=LeadAssignmentPaginatedOut)
async def list_assignments(
    search: Optional[str] = None,
    assigned_to_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    assignment_method: Optional[str] = None,
    is_escalated: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Paginated assignment records with filters for the Assignment & Distribution screen (Spec 4.3)."""
    q = (
        select(LeadAssignment)
        .join(Lead, LeadAssignment.lead_id == Lead.id)
    )
    if assigned_to_id:
        q = q.where(LeadAssignment.assigned_to_id == assigned_to_id)
    if is_active is not None:
        q = q.where(LeadAssignment.is_active == is_active)
    if assignment_method:
        q = q.where(LeadAssignment.assignment_method == assignment_method.upper())
    if is_escalated is True:
        q = q.where(LeadAssignment.escalated_at.isnot(None))
    if is_escalated is False:
        q = q.where(LeadAssignment.escalated_at.is_(None))
    if search:
        sp = f"%{search.strip()}%"
        q = q.where(or_(
            Lead.lead_name.ilike(sp),
            Lead.lead_code.ilike(sp),
            Lead.primary_phone.ilike(sp)
        ))

    cnt = await db.execute(select(func.count()).select_from(q.subquery()))
    total = cnt.scalar() or 0

    res = await db.execute(
        q.options(
            selectinload(LeadAssignment.assigned_to),
            selectinload(LeadAssignment.assigned_by),
        ).order_by(LeadAssignment.assigned_at.desc()).limit(limit).offset(offset)
    )
    items = []
    for a in res.scalars().all():
        resp = LeadAssignmentResponse.model_validate(a)
        if a.assigned_to:
            resp.assigned_to_name = a.assigned_to.full_name_en
        if a.assigned_by:
            resp.assigned_by_name = a.assigned_by.full_name_en
        if a.lead:
            resp.lead_name = a.lead.lead_name
            resp.lead_code = a.lead.lead_code
        items.append(resp)
    return LeadAssignmentPaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.post("/assignments/{assignment_id}/escalate", response_model=LeadAssignmentResponse)
async def escalate_assignment(
    assignment_id: int,
    reason: str = Query(..., description="Escalation reason"),
    db: AsyncSession = Depends(get_db)
):
    """
    Escalate an uncontacted / overdue assignment to the sales manager (Spec 4.3).
    """
    res = await db.execute(
        select(LeadAssignment).options(
            selectinload(LeadAssignment.assigned_to),
            selectinload(LeadAssignment.assigned_by),
        ).where(LeadAssignment.id == assignment_id)
    )
    assignment = res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.escalated_at = datetime.utcnow()
    assignment.escalation_reason = reason

    lead_res = await db.execute(select(Lead).where(Lead.id == assignment.lead_id))
    lead = lead_res.scalars().first()
    if lead:
        activity = LeadActivity(
            lead_id=lead.id,
            sales_rep_id=assignment.assigned_to_id,
            activity_type="STAGE_CHANGE",
            activity_summary=f"Assignment escalated. Reason: {reason}",
            outcome="ESCALATED"
        )
        db.add(activity)

    await db.commit()
    await db.refresh(assignment)
    resp = LeadAssignmentResponse.model_validate(assignment)
    if assignment.assigned_to:
        resp.assigned_to_name = assignment.assigned_to.full_name_en
    return resp


@router.get("/sales-reps")
async def list_sales_reps(db: AsyncSession = Depends(get_db)):
    """
    Active sales representatives for assignment dropdowns (Spec 4.3).
    Returns id + full_name_en for <app-searchable-select> options.
    """
    res = await db.execute(
        select(User.id, User.full_name_en, User.email)
        .where(User.is_active == True)
        .order_by(User.full_name_en.asc())
    )
    return [
        {"id": row[0], "full_name_en": row[1], "email": row[2]}
        for row in res.all()
    ]


@router.get("/assignment-queue/stats", response_model=LeadAssignmentQueueStats)
async def get_assignment_queue_stats(db: AsyncSession = Depends(get_db)):
    """KPI stats for the assignment dashboard (Spec 4.1/4.3)."""
    total = (await db.execute(select(func.count(Lead.id)))).scalar() or 0
    unassigned = (await db.execute(select(func.count(Lead.id)).where(Lead.assigned_sales_rep_id.is_(None)))).scalar() or 0
    now = datetime.utcnow()
    overdue = (
        await db.execute(
            select(func.count(Lead.id)).where(
                Lead.first_response_deadline.isnot(None),
                Lead.first_response_deadline < now,
                Lead.first_contacted_at.is_(None),
                Lead.lead_stage == "NEW"
            )
        )
    ).scalar() or 0
    assigned_today = (
        await db.execute(
            select(func.count(LeadAssignment.id)).where(
                LeadAssignment.is_active == True,
                LeadAssignment.assigned_at >= now.replace(hour=0, minute=0, second=0, microsecond=0)
            )
        )
    ).scalar() or 0
    reassigned = (
        await db.execute(
            select(func.count(LeadAssignment.id)).where(LeadAssignment.previous_rep_id.isnot(None))
        )
    ).scalar() or 0
    escalated = (
        await db.execute(
            select(func.count(LeadAssignment.id)).where(LeadAssignment.escalated_at.isnot(None))
        )
    ).scalar() or 0

    return LeadAssignmentQueueStats(
        total_leads=total,
        unassigned_leads=unassigned,
        overdue_first_response=overdue,
        assigned_today=assigned_today,
        reassigned_total=reassigned,
        escalated_total=escalated
    )


# ==========================================================================
# 4.3 Assignment Rules CRUD
# ==========================================================================
@router.get("/assignment-rules", response_model=LeadAssignmentRulePaginatedOut)
async def list_assignment_rules(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    method: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    q = select(LeadAssignmentRule)
    if is_active is not None:
        q = q.where(LeadAssignmentRule.is_active == is_active)
    if method:
        q = q.where(LeadAssignmentRule.method == method.upper())
    if search:
        sp = f"%{search.strip()}%"
        q = q.where(LeadAssignmentRule.rule_name.ilike(sp))

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    res = await db.execute(q.order_by(LeadAssignmentRule.priority_order, LeadAssignmentRule.id).limit(limit).offset(offset))
    items = [LeadAssignmentRuleResponse.model_validate(r) for r in res.scalars().all()]
    return LeadAssignmentRulePaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.get("/assignment-rules/{rule_id}", response_model=LeadAssignmentRuleResponse)
async def get_assignment_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(LeadAssignmentRule).where(LeadAssignmentRule.id == rule_id))
    rule = res.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Assignment rule not found")
    return rule


@router.post("/assignment-rules", response_model=LeadAssignmentRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment_rule(payload: LeadAssignmentRuleCreate, db: AsyncSession = Depends(get_db)):
    rule = LeadAssignmentRule(**payload.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.put("/assignment-rules/{rule_id}", response_model=LeadAssignmentRuleResponse)
async def update_assignment_rule(rule_id: int, payload: LeadAssignmentRuleUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(LeadAssignmentRule).where(LeadAssignmentRule.id == rule_id))
    rule = res.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Assignment rule not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, key, value)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/assignment-rules/{rule_id}")
async def delete_assignment_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(LeadAssignmentRule).where(LeadAssignmentRule.id == rule_id))
    rule = res.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Assignment rule not found")
    await db.delete(rule)
    await db.commit()
    return {"message": "Assignment rule deleted", "id": rule_id}


# ==========================================================================
# 4.2 Bulk Import & Import History
# ==========================================================================
@router.post("/leads/import", response_model=LeadImportResponse, status_code=status.HTTP_201_CREATED)
async def import_leads(payload: LeadImportRequest, db: AsyncSession = Depends(get_db)):
    """
    Bulk import leads from parsed Excel/CSV rows (Spec 4.2).
    Performs per-row validation, duplicate detection, and records import history.
    """
    success = 0
    failed = 0
    duplicates = 0
    errors: List[str] = []

    for idx, row in enumerate(payload.rows, start=1):
        try:
            phone = row.primary_phone.replace(" ", "").replace("-", "")
            dup = await db.execute(
                select(Lead.id).where(
                    func.replace(func.replace(Lead.primary_phone, "-", ""), " ", "") == phone
                ).limit(1)
            )
            if dup.scalars().first():
                duplicates += 1
                errors.append(f"Row {idx}: duplicate phone {row.primary_phone}")
                continue

            rep = await _get_next_sales_rep(db)
            lead = Lead(
                lead_source_id=row.lead_source_id or payload.source_channel or "MANUAL_ENTRY",
                original_source_id=row.lead_source_id or payload.source_channel or "MANUAL_ENTRY",
                campaign_name=row.campaign_name,
                lead_name=row.lead_name,
                primary_phone=row.primary_phone,
                email=(row.email or "").strip().lower() or None,
                preferred_contact_method=row.preferred_contact_method or "PHONE",
                property_type=row.property_type,
                preferred_location=row.preferred_location,
                bedrooms=row.bedrooms,
                budget_range_min=row.budget_range_min,
                budget_range_max=row.budget_range_max,
                assigned_sales_rep_id=rep.id if rep else None,
                assignment_method="ROUND_ROBIN" if rep else None,
                lead_stage="NEW",
                lead_score=50,
                priority="MEDIUM",
                notes=row.notes or f"Imported from {payload.filename}"
            )
            scoring = compute_lead_scoring_details(lead)
            lead.lead_code = await _generate_lead_code(db)
            db.add(lead)
            await db.flush()
            await _persist_qualification(db, lead, scoring, computed_by="SYSTEM")
            await _record_assignment(db, lead, rep.id if rep else None, "ROUND_ROBIN", "Bulk import auto-assignment")
            success += 1
        except Exception as e:
            failed += 1
            errors.append(f"Row {idx}: {str(e)}")

    batch = LeadImportBatch(
        filename=payload.filename,
        source_channel=payload.source_channel,
        total_rows=len(payload.rows),
        success_count=success,
        failed_count=failed,
        duplicate_count=duplicates,
        error_log="\n".join(errors[:100]) if errors else None
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return batch


@router.get("/leads/import/history", response_model=LeadImportPaginatedOut)
async def list_import_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    q = select(LeadImportBatch)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    res = await db.execute(q.order_by(LeadImportBatch.imported_at.desc()).limit(limit).offset(offset))
    items = [LeadImportResponse.model_validate(b) for b in res.scalars().all()]
    return LeadImportPaginatedOut(items=items, total=total, limit=limit, offset=offset)


# ==========================================================================
# 4.3 Activity Logging
# ==========================================================================
@router.post("/leads/{lead_id}/activities", response_model=LeadActivityResponse)
async def log_lead_activity(
    lead_id: int,
    payload: LeadActivityCreate,
    db: AsyncSession = Depends(get_db)
):
    lead_res = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = lead_res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activity = LeadActivity(
        lead_id=lead_id,
        sales_rep_id=payload.sales_rep_id or lead.assigned_sales_rep_id,
        activity_type=payload.activity_type,
        activity_summary=payload.activity_summary,
        scheduled_at=payload.scheduled_at,
        completed_at=payload.completed_at or datetime.utcnow(),
        outcome=payload.outcome
    )
    db.add(activity)

    # Mark first contact for SLA tracking (Spec 4.3)
    if payload.activity_type in ("PHONE_CALL", "WHATSAPP", "EMAIL", "OFFICE_MEETING") and not lead.first_contacted_at:
        lead.first_contacted_at = datetime.utcnow()
        if lead.lead_stage == "NEW":
            lead.lead_stage = "CONTACTED"
            scoring = compute_lead_scoring_details(lead)
            await _persist_qualification(db, lead, scoring, computed_by="SYSTEM")

    if payload.activity_type == "SITE_VISIT" and payload.outcome == "VISITED_POSITIVE":
        lead.lead_score = min((lead.lead_score or 0) + 15, 100)
        if lead.lead_stage in ["NEW", "CONTACTED"]:
            lead.lead_stage = "VISITED"

    await db.commit()
    await db.refresh(activity)
    return activity


# ==========================================================================
# 4.5 Customer KYC & Nominee Profiles
# ==========================================================================
def _nominee_from_payload(customer_id: int, nom: NomineeCreate) -> Nominee:
    return Nominee(
        customer_id=customer_id,
        nominee_name=nom.nominee_name,
        relation_type=nom.relationship,
        nid_number=nom.nid_number,
        share_percentage=nom.share_percentage,
        photo_url=nom.photo_url,
        phone=nom.phone,
        email=nom.email,
        address=nom.address,
        nid_front_url=nom.nid_front_url,
        nid_back_url=nom.nid_back_url,
        effective_from=nom.effective_from,
        effective_to=nom.effective_to,
        verification_status=nom.verification_status or "PENDING",
        notes=nom.notes
    )


def _customer_to_response(c: Customer) -> CustomerResponse:
    resp = CustomerResponse.model_validate(c)
    if c.relationship_manager:
        resp.relationship_manager_name = c.relationship_manager.full_name_en
    return resp


_CUSTOMER_LOAD_OPTIONS = (
    selectinload(Customer.nominees),
    selectinload(Customer.relationship_manager),
)


@router.get("/customers", response_model=List[CustomerResponse])
async def list_customers(
    search: Optional[str] = None,
    is_nrb: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Customer)
        .options(*_CUSTOMER_LOAD_OPTIONS)
        .where(Customer.merged_into_id.is_(None))
        .order_by(Customer.id.desc())
    )
    if is_nrb is not None:
        stmt = stmt.where(Customer.is_nrb == is_nrb)
    if search:
        sp = f"%{search}%"
        stmt = stmt.where(or_(
            Customer.full_name_en.ilike(sp),
            Customer.customer_code.ilike(sp),
            Customer.nid_number.ilike(sp),
            Customer.primary_phone.ilike(sp),
            Customer.email.ilike(sp)
        ))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/customers/table", response_model=CustomerPaginatedOut)
async def list_customers_table(
    search: Optional[str] = None,
    is_nrb: Optional[bool] = None,
    customer_type: Optional[str] = None,
    is_opted_out: Optional[bool] = None,
    sort_by: str = "created_at_desc",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Server-paged customer directory (Spec 4.5)."""
    q = select(Customer).where(Customer.merged_into_id.is_(None))
    if is_nrb is not None:
        q = q.where(Customer.is_nrb == is_nrb)
    if customer_type:
        q = q.where(Customer.customer_type == customer_type.upper())
    if is_opted_out is not None:
        q = q.where(Customer.is_opted_out == is_opted_out)
    if search:
        sp = f"%{search.strip()}%"
        q = q.where(or_(
            Customer.full_name_en.ilike(sp),
            Customer.customer_code.ilike(sp),
            Customer.nid_number.ilike(sp),
            Customer.primary_phone.ilike(sp),
            Customer.email.ilike(sp)
        ))

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0

    sort_map = {
        "created_at_desc": Customer.created_at.desc(),
        "created_at_asc": Customer.created_at.asc(),
        "full_name_en_asc": Customer.full_name_en.asc(),
        "customer_code_asc": Customer.customer_code.asc(),
        "lead_score_desc": Customer.id.desc(),
    }
    order = sort_map.get(sort_by, Customer.created_at.desc())

    res = await db.execute(
        q.options(*_CUSTOMER_LOAD_OPTIONS).order_by(order).limit(limit).offset(offset)
    )
    items = [_customer_to_response(c) for c in res.scalars().all()]
    return CustomerPaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Customer).options(*_CUSTOMER_LOAD_OPTIONS).where(Customer.id == customer_id)
    )
    customer = res.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return _customer_to_response(customer)


@router.post("/customers/check-duplicates", response_model=CustomerDuplicateCheckResponse)
async def check_customer_duplicates(payload: CustomerDuplicateCheckRequest, db: AsyncSession = Depends(get_db)):
    """Real-time duplicate check on phone / email / NID (Spec 4.5)."""
    q = select(Customer).where(Customer.merged_into_id.is_(None))
    conds = []
    if payload.primary_phone:
        cleaned = re.sub(r"[\s\-\(\)]", "", payload.primary_phone)
        conds.append(Customer.primary_phone == cleaned)
    if payload.email:
        conds.append(Customer.email == payload.email.strip().lower())
    if payload.nid_number:
        conds.append(Customer.nid_number == payload.nid_number.strip())
    if not conds:
        return CustomerDuplicateCheckResponse(is_duplicate=False)
    q = q.where(or_(*conds))
    if payload.exclude_customer_id:
        q = q.where(Customer.id != payload.exclude_customer_id)
    res = await db.execute(q.options(*_CUSTOMER_LOAD_OPTIONS).limit(10))
    matches = res.scalars().all()
    if not matches:
        return CustomerDuplicateCheckResponse(is_duplicate=False)
    return CustomerDuplicateCheckResponse(
        is_duplicate=True,
        matching_customer_ids=[c.id for c in matches],
        matching_customers=[_customer_to_response(c) for c in matches]
    )


@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: int, payload: CustomerUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Customer).options(*_CUSTOMER_LOAD_OPTIONS).where(Customer.id == customer_id)
    )
    customer = res.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    data = payload.model_dump(exclude_unset=True)
    if data.get("is_opted_out") is True:
        customer.opt_out_at = datetime.utcnow()
    if data.get("is_opted_out") is False:
        customer.opt_out_at = None
        customer.opt_out_reason = None
    for key, value in data.items():
        setattr(customer, key, value)

    await db.commit()
    res2 = await db.execute(
        select(Customer).options(*_CUSTOMER_LOAD_OPTIONS).where(Customer.id == customer_id)
    )
    return _customer_to_response(res2.scalars().first())


@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = res.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    await db.delete(customer)
    await db.commit()
    return {"message": "Customer deleted", "id": customer_id}


@router.post("/customers/{customer_id}/merge", response_model=CustomerResponse)
async def merge_customers(
    customer_id: int,
    payload: CustomerMergeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Merge duplicate customer into a survivor (Spec 4.5).
    Inquiry/lead history is preserved by redirecting referral_customer_id pointers
    to the target before flagging the source as merged. Source is soft-deleted.
    """
    if payload.source_customer_id == payload.target_customer_id:
        raise HTTPException(status_code=400, detail="Source and target customer must be different")

    src_res = await db.execute(select(Customer).where(Customer.id == payload.source_customer_id))
    source = src_res.scalars().first()
    if not source:
        raise HTTPException(status_code=404, detail="Source customer not found")

    tgt_res = await db.execute(
        select(Customer).options(*_CUSTOMER_LOAD_OPTIONS).where(Customer.id == payload.target_customer_id)
    )
    target = tgt_res.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Target customer not found")
    if target.merged_into_id:
        raise HTTPException(status_code=400, detail="Target customer has itself been merged into another record")

    # Redirect lead inquiry history to target (preserves history)
    await db.execute(
        update(Lead)
        .where(Lead.referral_customer_id == source.id)
        .values(referral_customer_id=target.id)
    )

    # Move nominees not already present (by name+relation)
    existing_pairs = {(n.nominee_name.lower(), n.relation_type.lower()) for n in target.nominees}
    for nom in source.nominees:
        key = (nom.nominee_name.lower(), nom.relation_type.lower())
        if key not in existing_pairs:
            nom.customer_id = target.id
            existing_pairs.add(key)
        else:
            await db.delete(nom)

    # Fill missing target fields from source where empty
    for field in ("email", "secondary_phone", "present_address", "permanent_address",
                  "nid_number", "tin_number", "passport_number", "full_name_bn",
                  "father_husband_name", "mother_name", "profile_photo_url",
                  "nid_scan_front_url", "nid_scan_back_url"):
        if not getattr(target, field) and getattr(source, field):
            setattr(target, field, getattr(source, field))

    # Flag source as merged (soft delete) — never hard-delete: audit trail
    source.merged_into_id = target.id
    source.merged_at = datetime.utcnow()
    if payload.merge_reason:
        source.notes = ((source.notes or "") + f"\n[MERGED into CUST#{target.id}: {payload.merge_reason}]").strip()

    await db.commit()
    res2 = await db.execute(
        select(Customer).options(*_CUSTOMER_LOAD_OPTIONS).where(Customer.id == target.id)
    )
    return _customer_to_response(res2.scalars().first())


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(payload: CustomerCreate, db: AsyncSession = Depends(get_db)):
    if payload.nominees:
        total_share = sum(n.share_percentage for n in payload.nominees)
        if total_share > 100.00:
            raise HTTPException(
                status_code=400,
                detail=f"Total nominee share percentage cannot exceed 100%. (Current sum: {total_share}%)"
            )

    count_res = await db.execute(select(func.count(Customer.id)))
    next_num = (count_res.scalar() or 0) + 1
    generated_code = f"CUST-{datetime.utcnow().year}-{next_num:04d}"

    customer = Customer(
        customer_code=generated_code,
        full_name_en=payload.full_name_en,
        full_name_bn=payload.full_name_bn,
        father_husband_name=payload.father_husband_name,
        mother_name=payload.mother_name,
        nid_number=payload.nid_number,
        tin_number=payload.tin_number,
        primary_phone=payload.primary_phone,
        secondary_phone=payload.secondary_phone,
        email=payload.email,
        present_address=payload.present_address,
        permanent_address=payload.permanent_address,
        is_nrb=payload.is_nrb,
        passport_number=payload.passport_number,
        customer_type=payload.customer_type or "INDIVIDUAL",
        preferred_language=payload.preferred_language or "BANGLA",
        preferred_contact_method=payload.preferred_contact_method or "PHONE",
        relationship_manager_id=payload.relationship_manager_id,
        is_consent_given=payload.is_consent_given,
        profile_photo_url=payload.profile_photo_url,
        nid_scan_front_url=payload.nid_scan_front_url,
        nid_scan_back_url=payload.nid_scan_back_url
    )
    db.add(customer)
    await db.flush()

    if payload.nominees:
        for nom in payload.nominees:
            db.add(_nominee_from_payload(customer.id, nom))

    await db.commit()
    result = await db.execute(
        select(Customer).options(*_CUSTOMER_LOAD_OPTIONS).where(Customer.id == customer.id)
    )
    return _customer_to_response(result.scalars().first())


# --- Nominee CRUD (Spec 4.5) ---
@router.post("/customers/{customer_id}/nominees", response_model=NomineeResponse)
async def add_nominee(customer_id: int, payload: NomineeCreate, db: AsyncSession = Depends(get_db)):
    cust_res = await db.execute(
        select(Customer).options(selectinload(Customer.nominees)).where(Customer.id == customer_id)
    )
    customer = cust_res.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    existing_sum = sum(float(n.share_percentage) for n in customer.nominees)
    if existing_sum + float(payload.share_percentage) > 100.00:
        raise HTTPException(
            status_code=400,
            detail=f"Adding {payload.share_percentage}% exceeds total limit. Current assigned: {existing_sum}%."
        )

    nominee = _nominee_from_payload(customer_id, payload)
    db.add(nominee)
    await db.commit()
    await db.refresh(nominee)
    return nominee


@router.put("/customers/{customer_id}/nominees/{nominee_id}", response_model=NomineeResponse)
async def update_nominee(
    customer_id: int,
    nominee_id: int,
    payload: NomineeUpdate,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Nominee).where(Nominee.id == nominee_id, Nominee.customer_id == customer_id)
    )
    nominee = res.scalars().first()
    if not nominee:
        raise HTTPException(status_code=404, detail="Nominee not found")

    data = payload.model_dump(exclude_unset=True)
    if "share_percentage" in data and data["share_percentage"] is not None:
        new_share = float(data["share_percentage"])
        cust_res = await db.execute(
            select(Customer).options(selectinload(Customer.nominees)).where(Customer.id == customer_id)
        )
        customer = cust_res.scalars().first()
        others = sum(float(n.share_percentage) for n in customer.nominees if n.id != nominee_id)
        if others + new_share > 100.00:
            raise HTTPException(
                status_code=400,
                detail=f"Total nominee share cannot exceed 100%. Others: {others}%, requested: {new_share}%."
            )
        nominee.previous_share_percentage = nominee.share_percentage
        nominee.share_changed_at = datetime.utcnow()

    if "relationship" in data and data["relationship"] is not None:
        nominee.relation_type = data.pop("relationship")
    elif "relation_type" in data:
        nominee.relation_type = data.pop("relation_type")

    for key, value in data.items():
        if value is not None and hasattr(nominee, key):
            setattr(nominee, key, value)

    await db.commit()
    await db.refresh(nominee)
    return nominee


@router.delete("/customers/{customer_id}/nominees/{nominee_id}")
async def delete_nominee(customer_id: int, nominee_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Nominee).where(Nominee.id == nominee_id, Nominee.customer_id == customer_id)
    )
    nominee = res.scalars().first()
    if not nominee:
        raise HTTPException(status_code=404, detail="Nominee not found")
    await db.delete(nominee)
    await db.commit()
    return {"message": "Nominee deleted", "id": nominee_id}


# --- Customer Service Requests (Spec 4.5) ---
def _service_request_to_response(sr: CustomerServiceRequest) -> ServiceRequestResponse:
    resp = ServiceRequestResponse.model_validate(sr)
    if sr.assigned_to:
        resp.assigned_to_name = sr.assigned_to.full_name_en
    return resp


_SERVICE_REQUEST_LOAD = selectinload(CustomerServiceRequest.assigned_to)


@router.get("/customers/{customer_id}/service-requests", response_model=ServiceRequestPaginatedOut)
async def list_service_requests(
    customer_id: int,
    request_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    q = select(CustomerServiceRequest).where(CustomerServiceRequest.customer_id == customer_id)
    if request_type:
        q = q.where(CustomerServiceRequest.request_type == request_type.upper())
    if status_filter:
        q = q.where(CustomerServiceRequest.status == status_filter.upper())

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    res = await db.execute(
        q.options(_SERVICE_REQUEST_LOAD)
        .order_by(CustomerServiceRequest.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = [_service_request_to_response(sr) for sr in res.scalars().all()]
    return ServiceRequestPaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/customers/{customer_id}/service-requests",
    response_model=ServiceRequestResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_service_request(
    customer_id: int,
    payload: ServiceRequestCreate,
    db: AsyncSession = Depends(get_db)
):
    cust = (await db.execute(select(Customer).where(Customer.id == customer_id))).scalars().first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    sr = CustomerServiceRequest(
        customer_id=customer_id,
        request_type=payload.request_type or "SERVICE",
        title=payload.title,
        description=payload.description,
        status=payload.status or "OPEN",
        priority=payload.priority or "MEDIUM",
        assigned_to_id=payload.assigned_to_id,
        resolution_notes=payload.resolution_notes,
        related_booking_id=payload.related_booking_id,
        related_unit_id=payload.related_unit_id
    )
    db.add(sr)
    await db.commit()
    await db.refresh(sr)
    res = await db.execute(
        select(CustomerServiceRequest).options(_SERVICE_REQUEST_LOAD).where(CustomerServiceRequest.id == sr.id)
    )
    return _service_request_to_response(res.scalars().first())


@router.put("/service-requests/{request_id}", response_model=ServiceRequestResponse)
async def update_service_request(
    request_id: int,
    payload: ServiceRequestUpdate,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(CustomerServiceRequest).options(_SERVICE_REQUEST_LOAD).where(CustomerServiceRequest.id == request_id)
    )
    sr = res.scalars().first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(sr, key, value)

    if sr.status in ("RESOLVED", "CLOSED") and not sr.resolved_at:
        sr.resolved_at = datetime.utcnow()

    await db.commit()
    res2 = await db.execute(
        select(CustomerServiceRequest).options(_SERVICE_REQUEST_LOAD).where(CustomerServiceRequest.id == request_id)
    )
    return _service_request_to_response(res2.scalars().first())


@router.delete("/service-requests/{request_id}")
async def delete_service_request(request_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CustomerServiceRequest).where(CustomerServiceRequest.id == request_id))
    sr = res.scalars().first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    await db.delete(sr)
    await db.commit()
    return {"message": "Service request deleted", "id": request_id}


# ==========================================================================
# CRM Metrics & Conversion Reports
# ==========================================================================
@router.get("/reports/conversion")
async def get_conversion_metrics(db: AsyncSession = Depends(get_db)):
    stages_list = [
        "NEW", "CONTACTED", "SITE_VISIT_SCHEDULED", "SITE_VISIT_COMPLETED",
        "NEGOTIATION", "TOKEN_BOOKED", "LOST"
    ]
    stage_counts = {s: 0 for s in stages_list}
    raw_res = await db.execute(
        select(Lead.lead_stage, func.count(Lead.id)).group_by(Lead.lead_stage)
    )
    for stage_val, count_val in raw_res.all():
        stage_str = (stage_val or "").upper()
        if stage_str == "VISITED":
            stage_counts["SITE_VISIT_COMPLETED"] = stage_counts.get("SITE_VISIT_COMPLETED", 0) + count_val
        elif stage_str == "BOOKED":
            stage_counts["TOKEN_BOOKED"] = stage_counts.get("TOKEN_BOOKED", 0) + count_val
        elif stage_str == "DROPPED":
            stage_counts["LOST"] = stage_counts.get("LOST", 0) + count_val
        elif stage_str in stage_counts:
            stage_counts[stage_str] += count_val
        else:
            stage_counts[stage_str] = count_val

    total_leads = sum(stage_counts.values())
    booked_leads = stage_counts.get("TOKEN_BOOKED", 0)
    conversion_rate = (booked_leads / total_leads * 100.0) if total_leads > 0 else 0.0

    sources_res = await db.execute(
        select(Lead.lead_source_id, func.count(Lead.id)).group_by(Lead.lead_source_id)
    )
    source_distribution = {row[0]: row[1] for row in sources_res.all()}

    cust_res = await db.execute(select(func.count(Customer.id)))
    total_customers = cust_res.scalar() or 0

    return {
        "total_leads": total_leads,
        "conversion_rate_percentage": round(conversion_rate, 2),
        "stage_funnel": stage_counts,
        "source_distribution": source_distribution,
        "total_verified_customers": total_customers
    }
