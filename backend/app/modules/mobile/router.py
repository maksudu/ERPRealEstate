"""
Mobile Sales App API  (/api/v1/mobile/...)

Aggregated, mobile-friendly endpoints for field sales executives.
IMPORTANT: No new tables. Every endpoint reads/writes EXISTING models:
  - auth.User                       -> login / profile / sales executives
  - crm.Lead, LeadAssignment        -> lead management
  - crm.Customer, CustomerRequirement, CommunicationHistory -> customer management
  - crm.LeadActivity (SITE_VISIT)   -> site visit management
  - crm.FollowUpTask                -> follow-up reminders
  - projects.Project, Tower, ProjectFloor / inventory.Unit, ParkingSlot -> project & property
  - inventory.Quotation             -> quotation management
  - sales.Booking, BookingCancellation, SalesLegalDocument -> booking management
  - installments.BookingInstallmentSchedule, CustomerInstallment -> installment plans
  - governance.ApprovalRequest / ApprovalStep / GovernanceNotification -> approvals & notifications
"""
import secrets
from datetime import datetime, date, timedelta
from decimal import Decimal, ROUND_DOWN
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.lookups.models import LookupCategory, LookupItem
from app.modules.projects.models import Project, Tower, ProjectFloor
from app.modules.inventory.models import Unit, ParkingSlot, Quotation
from app.modules.crm.models import (
    Lead, LeadAssignment, LeadActivity, Customer, CustomerRequirement,
    FollowUpTask, CommunicationHistory,
)
from app.modules.sales.models import Booking, BookingCancellation, SalesLegalDocument
from app.modules.installments.models import BookingInstallmentSchedule, CustomerInstallment
from app.modules.governance.models import ApprovalRequest, ApprovalStep, GovernanceNotification
from app.modules.governance.schemas import ApprovalRequestCreate, ApprovalActionRequest
from app.modules.governance.services import GovernanceEngineService

from app.modules.mobile import schemas as s
from app.modules.mobile.pdf import build_quotation_pdf, build_booking_pdf

router = APIRouter(prefix="/mobile", tags=["Mobile Sales App"])

CONVERSION_STAGES = ("TOKEN_BOOKED", "07_BOOKING", "CONVERTED", "BOOKED", "WON")
CLOSED_STAGES = CONVERSION_STAGES + ("LOST",)
SITE_VISIT = "SITE_VISIT"
MANAGER_KEYWORDS = ("MANAGER", "HEAD", "DIRECTOR", "ADMIN", "MD")

FALLBACK_LOOKUPS = {
    "CRM_LEAD_SOURCE": ["MANUAL_ENTRY", "FACEBOOK_ADS", "WEB_FORM", "WALK_IN", "WHATSAPP", "BROKER", "REFERRAL", "PHONE"],
    "CRM_LEAD_STAGE": ["NEW", "CONTACTED", "SITE_VISIT_SCHEDULED", "SITE_VISIT_COMPLETED", "NEGOTIATION", "TOKEN_BOOKED", "LOST"],
    "CRM_LOST_REASON": ["BUDGET_MISMATCH", "LOCATION_MISMATCH", "BOUGHT_ELSEWHERE", "NOT_RESPONDING", "OTHER"],
    "CRM_COMMUNICATION_CHANNEL": ["PHONE_CALL", "WHATSAPP", "SMS", "EMAIL", "MEETING", "INTERNAL_NOTE"],
    "CRM_TASK_CATEGORY": ["GENERAL_FOLLOW_UP", "CALL_BACK", "SEND_QUOTATION", "SITE_VISIT_FOLLOW_UP", "DOCUMENT_COLLECTION", "PAYMENT_REMINDER"],
    "CRM_TASK_PRIORITY": ["LOW", "MEDIUM", "HIGH", "URGENT"],
    "CRM_CUSTOMER_TYPE": ["INDIVIDUAL", "COMPANY", "INVESTOR", "OTHER"],
    "CRM_PROPERTY_TYPE": ["APARTMENT", "DUPLEX", "PENTHOUSE", "COMMERCIAL_SPACE", "SHOP", "LAND"],
    "SITE_VISIT_STATUS": ["PLANNED", "CONFIRMED", "COMPLETED", "RESCHEDULED", "NO_SHOW", "CANCELLED"],
    "CANCELLATION_CATEGORY": ["BUYER_RELOCATION", "FINANCIAL_HARDSHIP", "BUYER_DEFAULT", "DEVELOPER_DELAY", "MUTUAL_CONSENT", "FORCE_MAJEURE"],
    "INSTALLMENT_PLAN_TYPE": ["MONTHLY", "QUARTERLY"],
}


# =====================================================================
# Helpers
# =====================================================================
def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


def _iso(v) -> Optional[str]:
    return v.isoformat() if v is not None else None


def _code(prefix: str) -> str:
    return f"{prefix}-{datetime.now():%y%m%d}-{secrets.token_hex(3).upper()}"


def _blank(v):
    return None if (v is None or (isinstance(v, str) and not v.strip())) else v


def _q2(v: Decimal) -> Decimal:
    return Decimal(v).quantize(Decimal("0.01"))


def _add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    days = [31, 29 if (y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return date(y, m, min(d.day, days[m - 1]))


def is_manager(user: User) -> bool:
    if user.is_group_admin:
        return True
    return any(any(k in (a.role_code or "").upper() for k in MANAGER_KEYWORDS) for a in (user.project_assignments or []))


def _user_brief(u: Optional[User]):
    if not u:
        return None
    return {"id": u.id, "name": u.full_name_en, "phone": u.phone_number, "email": u.email}


async def _get_or_404(db: AsyncSession, model, obj_id: int, label: str):
    obj = await db.get(model, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{label} not found.")
    return obj


async def _notify(db: AsyncSession, user_id: Optional[int], title: str, body: str, action_url: str, request_id: Optional[int] = None):
    if not user_id:
        return
    db.add(GovernanceNotification(
        recipient_user_id=user_id, request_id=request_id, channel="MOBILE_PUSH",
        title=title[:191], body=body, action_url=action_url, status="DELIVERED",
    ))


async def _user_from_token_or_query(
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=False)),
    access_token: Optional[str] = Query(None, description="Bearer token for direct PDF download links"),
    db: AsyncSession = Depends(get_db),
) -> User:
    raw = token or access_token
    if not raw:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(raw)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        username = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = (await db.execute(select(User).where(User.username == username, User.is_active == True))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def _lead_dict(l: Lead, rep: Optional[User] = None, project_name: Optional[str] = None):
    return {
        "id": l.id, "lead_code": l.lead_code, "lead_name": l.lead_name, "primary_phone": l.primary_phone,
        "email": l.email, "lead_source_id": l.lead_source_id, "original_source_id": l.original_source_id,
        "campaign_name": l.campaign_name, "interested_project_id": l.interested_project_id,
        "interested_project_name": project_name, "property_type": l.property_type,
        "preferred_location": l.preferred_location, "required_area_sqft": _f(l.required_area_sqft),
        "bedrooms": l.bedrooms, "budget_range_min": _f(l.budget_range_min), "budget_range_max": _f(l.budget_range_max),
        "expected_purchase_date": _iso(l.expected_purchase_date), "priority": l.priority,
        "lead_stage": l.lead_stage, "lead_score": l.lead_score, "health_grade": l.health_grade,
        "lost_reason": l.lost_reason, "notes": l.notes,
        "assigned_sales_rep_id": l.assigned_sales_rep_id, "assigned_sales_rep": _user_brief(rep),
        "first_contacted_at": _iso(l.first_contacted_at),
        "created_at": _iso(l.created_at), "updated_at": _iso(l.updated_at),
    }


def _customer_dict(c: Customer):
    return {
        "id": c.id, "customer_code": c.customer_code, "full_name_en": c.full_name_en, "full_name_bn": c.full_name_bn,
        "primary_phone": c.primary_phone, "secondary_phone": c.secondary_phone, "email": c.email,
        "nid_number": c.nid_number, "tin_number": c.tin_number, "present_address": c.present_address,
        "permanent_address": c.permanent_address, "customer_type": c.customer_type,
        "preferred_contact_method": c.preferred_contact_method, "preferred_language": c.preferred_language,
        "is_nrb": c.is_nrb, "passport_number": c.passport_number, "profile_photo_url": c.profile_photo_url,
        "relationship_manager_id": c.relationship_manager_id, "created_at": _iso(c.created_at),
    }


def _unit_dict(u: Unit, tower_name: Optional[str] = None):
    return {
        "id": u.id, "project_id": u.project_id, "tower_id": u.tower_id, "tower_name": tower_name,
        "floor_number": u.floor_number, "unit_number": u.unit_number, "unit_type": u.unit_type_id,
        "facing": u.facing_id, "bed_count": u.bed_count, "bath_count": u.bath_count, "balcony_count": u.balcony_count,
        "net_carpet_area_sqft": _f(u.net_carpet_area_sqft), "gross_saleable_area_sqft": _f(u.gross_saleable_area_sqft),
        "base_rate_per_sqft": _f(u.base_rate_per_sqft), "effective_rate_per_sqft": _f(u.effective_rate_per_sqft),
        "total_unit_price": _f(u.total_unit_price), "parking_charge": _f(u.parking_charge),
        "utility_connection_fee": _f(u.utility_connection_fee), "max_discount_amount": _f(u.max_discount_amount),
        "status": u.status_id, "is_landowner_share": u.is_landowner_share,
        "floor_plan_image_url": u.floor_plan_image_url, "render_images_json": u.render_images_json,
        "locked_by": u.current_locked_by_user_name, "lock_expires_at": _iso(u.lock_expires_at),
    }


def _activity_dict(a: LeadActivity, lead_name=None, customer_name=None, project_name=None, unit_number=None):
    return {
        "id": a.id, "activity_code": a.activity_code, "activity_type": a.activity_type, "title": a.title,
        "summary": a.activity_summary, "lead_id": a.lead_id, "lead_name": lead_name,
        "customer_id": a.customer_id, "customer_name": customer_name,
        "project_id": a.project_id, "project_name": project_name, "unit_id": a.unit_id, "unit_number": unit_number,
        "sales_rep_id": a.sales_rep_id, "scheduled_start": _iso(a.scheduled_start or a.scheduled_at),
        "scheduled_end": _iso(a.scheduled_end), "duration_minutes": a.duration_minutes,
        "meeting_location": a.meeting_location, "agenda": a.agenda, "status": a.status,
        "attendance_status": a.attendance_status, "outcome": a.outcome, "next_action": a.next_action,
        "next_follow_up_date": _iso(a.next_follow_up_date), "reminder_minutes_before": a.reminder_minutes_before,
        "completed_at": _iso(a.completed_at), "created_at": _iso(a.created_at),
    }


def _task_dict(t: FollowUpTask, lead_name=None, customer_name=None):
    now = datetime.now()
    overdue = t.status in ("PENDING", "IN_PROGRESS", "OVERDUE") and t.due_date is not None and t.due_date < now
    return {
        "id": t.id, "task_code": t.task_code, "title": t.title, "description": t.description,
        "task_category": t.task_category, "priority": t.priority, "due_date": _iso(t.due_date),
        "status": "OVERDUE" if overdue else t.status, "is_overdue": overdue,
        "lead_id": t.lead_id, "lead_name": lead_name, "customer_id": t.customer_id, "customer_name": customer_name,
        "assigned_to_id": t.assigned_to_id, "completion_outcome": t.completion_outcome,
        "completion_notes": t.completion_notes, "completed_at": _iso(t.completed_at), "created_at": _iso(t.created_at),
    }


async def _names(db: AsyncSession, model, ids, attr: str):
    ids = {i for i in ids if i}
    if not ids:
        return {}
    rows = (await db.execute(select(model.id, getattr(model, attr)).where(model.id.in_(ids)))).all()
    return {r[0]: r[1] for r in rows}


def _lead_scope(stmt, user: User, mine: Optional[bool]):
    if mine or (mine is None and not is_manager(user)):
        stmt = stmt.where(Lead.assigned_sales_rep_id == user.id)
    return stmt


# =====================================================================
# Profile, Lookups
# =====================================================================
@router.get("/me")
async def mobile_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id, "username": user.username, "email": user.email, "phone_number": user.phone_number,
        "full_name_en": user.full_name_en, "full_name_bn": user.full_name_bn,
        "is_group_admin": user.is_group_admin, "is_manager": is_manager(user),
        "organization_id": user.organization_id,
        "organization_name": user.organization.legal_name_en if user.organization else None,
        "project_assignments": [{"project_id": a.project_id, "role_code": a.role_code} for a in user.project_assignments],
    }


@router.get("/lookups")
async def mobile_lookups(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """All dropdown sources for the app — read dynamically from sys_lookup_items with safe fallbacks."""
    rows = (await db.execute(
        select(LookupCategory.category_code, LookupItem.item_code, LookupItem.item_name_en, LookupItem.item_name_bn, LookupItem.color_badge)
        .join(LookupItem, LookupItem.category_id == LookupCategory.id)
        .where(LookupCategory.category_code.in_(list(FALLBACK_LOOKUPS.keys())), LookupItem.is_active == True)
        .order_by(LookupCategory.category_code, LookupItem.sort_order)
    )).all()
    out = {}
    for cat, code, en, bn, color in rows:
        out.setdefault(cat, []).append({"code": code, "label": en, "label_bn": bn, "color": color})
    for cat, codes in FALLBACK_LOOKUPS.items():
        if cat not in out:
            out[cat] = [{"code": c, "label": c.replace("_", " ").title(), "label_bn": None, "color": None} for c in codes]

    projects = (await db.execute(select(Project.id, Project.project_name, Project.project_code).order_by(Project.project_name))).all()
    out["projects"] = [{"code": str(p[0]), "label": p[1], "sub": p[2]} for p in projects]

    reps = (await db.execute(
        select(User.id, User.full_name_en, User.phone_number)
        .where(User.organization_id == user.organization_id, User.is_active == True)
        .order_by(User.full_name_en)
    )).all()
    out["sales_executives"] = [{"code": str(r[0]), "label": r[1], "sub": r[2]} for r in reps]
    return out


# =====================================================================
# Dashboard
# =====================================================================
@router.get("/dashboard")
async def mobile_dashboard(
    mine: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    own = mine or (mine is None and not is_manager(user))
    now = datetime.now()
    today0 = datetime.combine(date.today(), datetime.min.time())
    month0 = today0.replace(day=1)

    def lead_q(*conds):
        q = select(func.count(Lead.id)).where(*conds)
        return q.where(Lead.assigned_sales_rep_id == user.id) if own else q

    total_leads = (await db.execute(lead_q())).scalar() or 0
    new_leads = (await db.execute(lead_q(Lead.lead_stage == "NEW"))).scalar() or 0
    new_today = (await db.execute(lead_q(Lead.created_at >= today0))).scalar() or 0
    conversions = (await db.execute(lead_q(Lead.lead_stage.in_(CONVERSION_STAGES)))).scalar() or 0
    conversions_month = (await db.execute(lead_q(Lead.lead_stage.in_(CONVERSION_STAGES), Lead.updated_at >= month0))).scalar() or 0

    fu = select(func.count(FollowUpTask.id)).where(FollowUpTask.status.in_(("PENDING", "IN_PROGRESS", "OVERDUE")))
    if own:
        fu = fu.where(FollowUpTask.assigned_to_id == user.id)
    follow_ups = (await db.execute(fu)).scalar() or 0
    overdue = (await db.execute(fu.where(FollowUpTask.due_date < now))).scalar() or 0
    due_today = (await db.execute(fu.where(FollowUpTask.due_date >= today0, FollowUpTask.due_date < today0 + timedelta(days=1)))).scalar() or 0

    sv = select(func.count(LeadActivity.id)).where(LeadActivity.activity_type == SITE_VISIT)
    if own:
        sv = sv.where(LeadActivity.sales_rep_id == user.id)
    site_visits_total = (await db.execute(sv)).scalar() or 0
    site_visits_upcoming = (await db.execute(sv.where(LeadActivity.status.in_(("PLANNED", "CONFIRMED", "RESCHEDULED")), LeadActivity.scheduled_start >= now))).scalar() or 0
    site_visits_done = (await db.execute(sv.where(LeadActivity.status == "COMPLETED"))).scalar() or 0

    bk = select(func.count(Booking.id), func.coalesce(func.sum(Booking.final_contract_value), 0)).where(Booking.status != "CANCELLED")
    if own:
        bk = bk.where(Booking.sales_rep_name == user.full_name_en)
    bookings_count, bookings_value = (await db.execute(bk)).one()

    stage_q = select(Lead.lead_stage, func.count(Lead.id)).group_by(Lead.lead_stage)
    if own:
        stage_q = stage_q.where(Lead.assigned_sales_rep_id == user.id)
    pipeline = [{"stage": r[0], "count": r[1]} for r in (await db.execute(stage_q)).all()]

    src_q = select(Lead.lead_source_id, func.count(Lead.id)).group_by(Lead.lead_source_id)
    if own:
        src_q = src_q.where(Lead.assigned_sales_rep_id == user.id)
    sources = [{"source": r[0], "count": r[1]} for r in (await db.execute(src_q)).all()]

    # Today's agenda
    tq = select(FollowUpTask).where(FollowUpTask.status.in_(("PENDING", "IN_PROGRESS", "OVERDUE")), FollowUpTask.due_date < today0 + timedelta(days=1))
    if own:
        tq = tq.where(FollowUpTask.assigned_to_id == user.id)
    tasks = (await db.execute(tq.order_by(FollowUpTask.due_date).limit(8))).scalars().all()
    lead_names = await _names(db, Lead, [t.lead_id for t in tasks], "lead_name")
    cust_names = await _names(db, Customer, [t.customer_id for t in tasks], "full_name_en")

    vq = select(LeadActivity).where(LeadActivity.activity_type == SITE_VISIT, LeadActivity.status.in_(("PLANNED", "CONFIRMED", "RESCHEDULED")), LeadActivity.scheduled_start >= today0)
    if own:
        vq = vq.where(LeadActivity.sales_rep_id == user.id)
    visits = (await db.execute(vq.order_by(LeadActivity.scheduled_start).limit(5))).scalars().all()
    v_leads = await _names(db, Lead, [v.lead_id for v in visits], "lead_name")
    v_proj = await _names(db, Project, [v.project_id for v in visits], "project_name")

    rq = select(Lead).order_by(desc(Lead.created_at)).limit(5)
    if own:
        rq = rq.where(Lead.assigned_sales_rep_id == user.id)
    recent = (await db.execute(rq)).scalars().all()

    unread = (await db.execute(select(func.count(GovernanceNotification.id)).where(
        GovernanceNotification.recipient_user_id == user.id, GovernanceNotification.status != "READ"))).scalar() or 0

    return {
        "scope": "MINE" if own else "ALL",
        "kpis": {
            "total_leads": total_leads, "new_leads": new_leads, "new_leads_today": new_today,
            "follow_ups": follow_ups, "follow_ups_overdue": overdue, "follow_ups_today": due_today,
            "site_visits": site_visits_total, "site_visits_upcoming": site_visits_upcoming, "site_visits_completed": site_visits_done,
            "conversions": conversions, "conversions_this_month": conversions_month,
            "conversion_rate": round(conversions * 100.0 / total_leads, 1) if total_leads else 0.0,
            "bookings": bookings_count, "bookings_value": _f(bookings_value),
        },
        "pipeline": pipeline,
        "sources": sources,
        "today_tasks": [_task_dict(t, lead_names.get(t.lead_id), cust_names.get(t.customer_id)) for t in tasks],
        "upcoming_visits": [_activity_dict(v, v_leads.get(v.lead_id), None, v_proj.get(v.project_id)) for v in visits],
        "recent_leads": [_lead_dict(l) for l in recent],
        "unread_notifications": unread + overdue,
    }


# =====================================================================
# Lead Management
# =====================================================================
@router.get("/leads")
async def list_leads(
    search: Optional[str] = None, stage: Optional[str] = None, source: Optional[str] = None,
    assigned_to: Optional[int] = None, mine: Optional[bool] = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    stmt = _lead_scope(select(Lead), user, mine)
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(or_(Lead.lead_name.ilike(like), Lead.primary_phone.ilike(like), Lead.lead_code.ilike(like), Lead.email.ilike(like)))
    if stage:
        stmt = stmt.where(Lead.lead_stage == stage)
    if source:
        stmt = stmt.where(Lead.lead_source_id == source)
    if assigned_to:
        stmt = stmt.where(Lead.assigned_sales_rep_id == assigned_to)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    rows = (await db.execute(stmt.options(selectinload(Lead.assigned_sales_rep)).order_by(desc(Lead.created_at)).offset((page - 1) * page_size).limit(page_size))).scalars().all()
    proj = await _names(db, Project, [l.interested_project_id for l in rows], "project_name")
    return {"total": total, "page": page, "page_size": page_size,
            "items": [_lead_dict(l, l.assigned_sales_rep, proj.get(l.interested_project_id)) for l in rows]}


@router.post("/leads", status_code=201)
async def create_lead(payload: s.MobileLeadCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    dup = (await db.execute(select(Lead.id, Lead.lead_code).where(Lead.primary_phone == payload.primary_phone.strip(), Lead.lead_stage.notin_(CLOSED_STAGES)).limit(1))).first()
    rep_id = payload.assigned_sales_rep_id or user.id
    lead = Lead(
        organization_id=user.organization_id, lead_code=_code("LEAD"),
        lead_source_id=payload.lead_source_id, original_source_id=payload.lead_source_id,
        campaign_name=_blank(payload.campaign_name), lead_name=payload.lead_name.strip(),
        primary_phone=payload.primary_phone.strip(), email=_blank(payload.email),
        interested_project_id=payload.interested_project_id, property_type=_blank(payload.property_type),
        preferred_location=_blank(payload.preferred_location), required_area_sqft=payload.required_area_sqft,
        bedrooms=payload.bedrooms, budget_range_min=payload.budget_range_min, budget_range_max=payload.budget_range_max,
        expected_purchase_date=payload.expected_purchase_date, priority=payload.priority,
        assigned_sales_rep_id=rep_id, assignment_method="MANUAL", lead_stage="NEW",
        first_response_deadline=datetime.now() + timedelta(hours=24),
        is_duplicate=bool(dup), duplicate_of_lead_id=dup[0] if dup else None, notes=_blank(payload.notes),
    )
    db.add(lead)
    await db.flush()
    db.add(LeadAssignment(lead_id=lead.id, assigned_to_id=rep_id, assigned_by_id=user.id, assignment_method="MANUAL",
                          assignment_reason="Created from mobile app", is_active=True))
    if rep_id != user.id:
        await _notify(db, rep_id, f"New lead assigned: {lead.lead_name}", f"{user.full_name_en} assigned lead {lead.lead_code} ({lead.primary_phone}) to you.", f"/leads/{lead.id}")
    await db.commit()
    return {"id": lead.id, "lead_code": lead.lead_code, "is_duplicate": lead.is_duplicate,
            "duplicate_of": dup[1] if dup else None}


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    lead = (await db.execute(select(Lead).options(selectinload(Lead.assigned_sales_rep)).where(Lead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found.")
    project_name = (await db.get(Project, lead.interested_project_id)).project_name if lead.interested_project_id else None
    acts = (await db.execute(select(LeadActivity).where(LeadActivity.lead_id == lead_id).order_by(desc(LeadActivity.created_at)).limit(30))).scalars().all()
    tasks = (await db.execute(select(FollowUpTask).where(FollowUpTask.lead_id == lead_id).order_by(desc(FollowUpTask.due_date)).limit(30))).scalars().all()
    comms = (await db.execute(select(CommunicationHistory).where(CommunicationHistory.lead_id == lead_id).order_by(desc(CommunicationHistory.sent_at)).limit(30))).scalars().all()
    assigns = (await db.execute(select(LeadAssignment).options(selectinload(LeadAssignment.assigned_to)).where(LeadAssignment.lead_id == lead_id).order_by(desc(LeadAssignment.assigned_at)))).scalars().all()
    return {
        **_lead_dict(lead, lead.assigned_sales_rep, project_name),
        "activities": [_activity_dict(a) for a in acts],
        "follow_ups": [_task_dict(t) for t in tasks],
        "communications": [_comm_dict(c) for c in comms],
        "assignment_history": [{"id": a.id, "assigned_to": _user_brief(a.assigned_to), "method": a.assignment_method,
                                "reason": a.assignment_reason, "is_active": a.is_active, "assigned_at": _iso(a.assigned_at)} for a in assigns],
    }


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: int, payload: s.MobileLeadUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    lead = await _get_or_404(db, Lead, lead_id, "Lead")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(lead, k, _blank(v) if isinstance(v, str) else v)
    await db.commit()
    return {"id": lead.id, "message": "Lead updated."}


@router.patch("/leads/{lead_id}/status")
async def update_lead_status(lead_id: int, payload: s.MobileLeadStatusUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    lead = await _get_or_404(db, Lead, lead_id, "Lead")
    if payload.lead_stage == "LOST" and not _blank(payload.lost_reason):
        raise HTTPException(400, "Lost reason is required when marking a lead as LOST.")
    old = lead.lead_stage
    lead.lead_stage = payload.lead_stage
    lead.lost_reason = payload.lost_reason if payload.lead_stage == "LOST" else None
    if old == "NEW" and payload.lead_stage != "NEW" and not lead.first_contacted_at:
        lead.first_contacted_at = datetime.now()
    db.add(CommunicationHistory(
        communication_code=_code("COM"), channel="INTERNAL_NOTE", direction="INTERNAL", lead_id=lead.id, user_id=user.id,
        subject=f"Status changed: {old} -> {payload.lead_stage}",
        message_body=payload.notes or f"Lead stage updated by {user.full_name_en}", is_automated=True,
    ))
    await db.commit()
    return {"id": lead.id, "lead_stage": lead.lead_stage}


@router.post("/leads/{lead_id}/assign")
async def assign_lead(lead_id: int, payload: s.MobileLeadAssign, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    lead = await _get_or_404(db, Lead, lead_id, "Lead")
    rep = await _get_or_404(db, User, payload.sales_rep_id, "Sales executive")
    if not rep.is_active:
        raise HTTPException(400, "Selected sales executive is inactive.")
    prev = lead.assigned_sales_rep_id
    for a in (await db.execute(select(LeadAssignment).where(LeadAssignment.lead_id == lead_id, LeadAssignment.is_active == True))).scalars().all():
        a.is_active = False
        a.released_at = datetime.now()
    db.add(LeadAssignment(lead_id=lead_id, assigned_to_id=rep.id, assigned_by_id=user.id, previous_rep_id=prev,
                          assignment_method="MANUAL", assignment_reason=payload.reason or "Reassigned from mobile app", is_active=True))
    lead.assigned_sales_rep_id = rep.id
    lead.assignment_method = "MANUAL"
    await _notify(db, rep.id, f"New lead assigned: {lead.lead_name}",
                  f"{user.full_name_en} assigned lead {lead.lead_code} ({lead.primary_phone}) to you. {payload.reason or ''}".strip(), f"/leads/{lead.id}")
    await db.commit()
    return {"id": lead.id, "assigned_sales_rep": _user_brief(rep)}


@router.post("/leads/{lead_id}/convert")
async def convert_lead_to_customer(lead_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    lead = await _get_or_404(db, Lead, lead_id, "Lead")
    existing = (await db.execute(select(Customer).where(Customer.primary_phone == lead.primary_phone).limit(1))).scalar_one_or_none()
    if existing:
        return {"customer_id": existing.id, "customer_code": existing.customer_code, "created": False}
    c = Customer(customer_code=_code("CUS"), full_name_en=lead.lead_name, primary_phone=lead.primary_phone, email=lead.email,
                 relationship_manager_id=lead.assigned_sales_rep_id or user.id, preferred_contact_method=lead.preferred_contact_method or "PHONE")
    db.add(c)
    await db.flush()
    if lead.interested_project_id or lead.budget_range_max:
        db.add(CustomerRequirement(
            requirement_code=_code("REQ"), customer_id=c.id, title=f"From lead {lead.lead_code}",
            preferred_project_id=lead.interested_project_id, preferred_location=lead.preferred_location,
            property_type=lead.property_type or "APARTMENT", budget_min_bdt=lead.budget_range_min, budget_max_bdt=lead.budget_range_max,
            area_min_sqft=lead.required_area_sqft, bedrooms=lead.bedrooms, assigned_sales_rep_id=lead.assigned_sales_rep_id, created_by_id=user.id,
        ))
    await db.commit()
    return {"customer_id": c.id, "customer_code": c.customer_code, "created": True}


# =====================================================================
# Customer Management
# =====================================================================
def _comm_dict(c: CommunicationHistory):
    return {"id": c.id, "code": c.communication_code, "channel": c.channel, "direction": c.direction, "subject": c.subject,
            "message_body": c.message_body, "lead_id": c.lead_id, "customer_id": c.customer_id, "user_id": c.user_id,
            "resulting_action": c.resulting_action, "sent_at": _iso(c.sent_at)}


@router.get("/customers")
async def list_customers(
    search: Optional[str] = None, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    stmt = select(Customer).where(Customer.merged_into_id.is_(None))
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(or_(Customer.full_name_en.ilike(like), Customer.primary_phone.ilike(like),
                              Customer.customer_code.ilike(like), Customer.nid_number.ilike(like), Customer.email.ilike(like)))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    rows = (await db.execute(stmt.order_by(desc(Customer.created_at)).offset((page - 1) * page_size).limit(page_size))).scalars().all()
    return {"total": total, "page": page, "page_size": page_size, "items": [_customer_dict(c) for c in rows]}


@router.post("/customers", status_code=201)
async def create_customer(payload: s.MobileCustomerCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    nid = _blank(payload.nid_number)
    if nid and (await db.execute(select(Customer.id).where(Customer.nid_number == nid))).first():
        raise HTTPException(409, "A customer with this NID already exists.")
    data = {k: (_blank(v) if isinstance(v, str) else v) for k, v in payload.model_dump().items()}
    c = Customer(customer_code=_code("CUS"), relationship_manager_id=user.id, **data)
    db.add(c)
    await db.commit()
    return {"id": c.id, "customer_code": c.customer_code}


@router.get("/customers/{customer_id}")
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    c = await _get_or_404(db, Customer, customer_id, "Customer")
    reqs = (await db.execute(select(CustomerRequirement).where(CustomerRequirement.customer_id == customer_id).order_by(desc(CustomerRequirement.created_at)))).scalars().all()
    comms = (await db.execute(select(CommunicationHistory).where(CommunicationHistory.customer_id == customer_id).order_by(desc(CommunicationHistory.sent_at)).limit(50))).scalars().all()
    acts = (await db.execute(select(LeadActivity).where(LeadActivity.customer_id == customer_id).order_by(desc(LeadActivity.created_at)).limit(30))).scalars().all()
    bookings = (await db.execute(select(Booking).where(Booking.primary_customer_id == customer_id).order_by(desc(Booking.created_at)))).scalars().all()
    proj = await _names(db, Project, [r.preferred_project_id for r in reqs] + [b.project_id for b in bookings], "project_name")
    units = await _names(db, Unit, [b.unit_id for b in bookings], "unit_number")
    rm = await db.get(User, c.relationship_manager_id) if c.relationship_manager_id else None

    history = [{"type": "COMMUNICATION", **_comm_dict(x), "at": _iso(x.sent_at)} for x in comms]
    history += [{"type": "ACTIVITY", **_activity_dict(a), "at": _iso(a.scheduled_start or a.created_at)} for a in acts]
    history.sort(key=lambda h: h["at"] or "", reverse=True)
    return {
        **_customer_dict(c),
        "relationship_manager": _user_brief(rm),
        "requirements": [{
            "id": r.id, "requirement_code": r.requirement_code, "title": r.title, "preferred_project_id": r.preferred_project_id,
            "preferred_project_name": proj.get(r.preferred_project_id), "preferred_location": r.preferred_location,
            "property_type": r.property_type, "budget_min_bdt": _f(r.budget_min_bdt), "budget_max_bdt": _f(r.budget_max_bdt),
            "area_min_sqft": _f(r.area_min_sqft), "area_max_sqft": _f(r.area_max_sqft), "bedrooms": r.bedrooms,
            "bathrooms": r.bathrooms, "preferred_floor": r.preferred_floor, "preferred_facing": r.preferred_facing,
            "parking_required": r.parking_required, "purchase_timeline": r.purchase_timeline,
            "payment_preference": r.payment_preference, "special_notes": r.special_notes, "status": r.status,
        } for r in reqs],
        "interaction_history": history,
        "bookings": [{"id": b.id, "booking_reference_no": b.booking_reference_no, "project_name": proj.get(b.project_id),
                      "unit_number": units.get(b.unit_id), "final_contract_value": _f(b.final_contract_value),
                      "status": b.status, "booking_date": _iso(b.booking_date)} for b in bookings],
    }


@router.put("/customers/{customer_id}")
async def update_customer(customer_id: int, payload: s.MobileCustomerUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    c = await _get_or_404(db, Customer, customer_id, "Customer")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, _blank(v) if isinstance(v, str) else v)
    await db.commit()
    return {"id": c.id, "message": "Customer updated."}


@router.post("/customers/{customer_id}/requirements", status_code=201)
async def add_requirement(customer_id: int, payload: s.MobileRequirementCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _get_or_404(db, Customer, customer_id, "Customer")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    r = CustomerRequirement(requirement_code=_code("REQ"), customer_id=customer_id, assigned_sales_rep_id=user.id, created_by_id=user.id, **data)
    db.add(r)
    await db.commit()
    return {"id": r.id, "requirement_code": r.requirement_code}


@router.post("/interactions", status_code=201)
async def log_interaction(payload: s.MobileInteractionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if not payload.lead_id and not payload.customer_id:
        raise HTTPException(400, "lead_id or customer_id is required.")
    c = CommunicationHistory(communication_code=_code("COM"), user_id=user.id, **payload.model_dump())
    db.add(c)
    if payload.lead_id:
        lead = await db.get(Lead, payload.lead_id)
        if lead and not lead.first_contacted_at:
            lead.first_contacted_at = datetime.now()
            if lead.lead_stage == "NEW":
                lead.lead_stage = "CONTACTED"
    await db.commit()
    return {"id": c.id, "code": c.communication_code}


# =====================================================================
# Project & Property
# =====================================================================
@router.get("/projects")
async def list_projects(search: Optional[str] = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Project)
    if search:
        stmt = stmt.where(or_(Project.project_name.ilike(f"%{search}%"), Project.project_code.ilike(f"%{search}%"), Project.thana_upazila.ilike(f"%{search}%")))
    projects = (await db.execute(stmt.order_by(Project.project_name))).scalars().all()
    stats = (await db.execute(select(Unit.project_id, Unit.status_id, func.count(Unit.id)).where(Unit.is_merged == False).group_by(Unit.project_id, Unit.status_id))).all()
    prices = (await db.execute(select(Unit.project_id, func.min(Unit.total_unit_price), func.max(Unit.total_unit_price), func.min(Unit.gross_saleable_area_sqft), func.max(Unit.gross_saleable_area_sqft)).group_by(Unit.project_id))).all()
    towers = (await db.execute(select(Tower.project_id, func.count(Tower.id)).group_by(Tower.project_id))).all()
    st, pr, tw = {}, {p[0]: p for p in prices}, {t[0]: t[1] for t in towers}
    for pid, status, cnt in stats:
        st.setdefault(pid, {})[status] = cnt
    out = []
    for p in projects:
        sm = st.get(p.id, {})
        pp = pr.get(p.id)
        out.append({
            "id": p.id, "project_code": p.project_code, "project_name": p.project_name, "project_type": p.project_type,
            "project_category": p.project_category, "district": p.district, "thana_upazila": p.thana_upazila,
            "site_address": p.site_address, "status": p.status, "planned_handover_date": _iso(p.planned_handover_date),
            "total_land_area_katha": _f(p.total_land_area_katha), "description": p.description, "towers": tw.get(p.id, 0),
            "total_units": sum(sm.values()), "available_units": sm.get("AVAILABLE", 0),
            "booked_units": sm.get("BOOKED", 0) + sm.get("SOLD", 0), "reserved_units": sm.get("RESERVED", 0) + sm.get("ON_HOLD", 0),
            "status_breakdown": sm,
            "min_price": _f(pp[1]) if pp else None, "max_price": _f(pp[2]) if pp else None,
            "min_size": _f(pp[3]) if pp else None, "max_size": _f(pp[4]) if pp else None,
        })
    return out


@router.get("/projects/{project_id}")
async def project_detail(project_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    p = await _get_or_404(db, Project, project_id, "Project")
    towers = (await db.execute(select(Tower).where(Tower.project_id == project_id).order_by(Tower.tower_code))).scalars().all()
    floors = (await db.execute(select(ProjectFloor).where(ProjectFloor.project_id == project_id).order_by(ProjectFloor.floor_number))).scalars().all()
    ustats = (await db.execute(select(Unit.tower_id, Unit.floor_number, Unit.status_id, func.count(Unit.id))
                               .where(Unit.project_id == project_id, Unit.is_merged == False)
                               .group_by(Unit.tower_id, Unit.floor_number, Unit.status_id))).all()
    types = (await db.execute(select(Unit.unit_type_id, func.count(Unit.id), func.min(Unit.gross_saleable_area_sqft), func.max(Unit.gross_saleable_area_sqft),
                                     func.min(Unit.total_unit_price), func.max(Unit.total_unit_price), func.max(Unit.floor_plan_image_url))
                              .where(Unit.project_id == project_id).group_by(Unit.unit_type_id))).all()
    parking = (await db.execute(select(ParkingSlot.status, func.count(ParkingSlot.id)).where(ParkingSlot.project_id == project_id).group_by(ParkingSlot.status))).all()

    grid = {}
    for tid, fl, status, cnt in ustats:
        f = grid.setdefault(tid, {}).setdefault(fl, {})
        f[status] = f.get(status, 0) + cnt
    floor_names = {(f.tower_id, f.floor_number): f.display_name for f in floors}
    return {
        "id": p.id, "project_code": p.project_code, "project_name": p.project_name, "project_type": p.project_type,
        "district": p.district, "thana_upazila": p.thana_upazila, "site_address": p.site_address, "status": p.status,
        "description": p.description, "planned_handover_date": _iso(p.planned_handover_date),
        "far_allocated": _f(p.far_allocated), "total_land_area_katha": _f(p.total_land_area_katha),
        "towers": [{
            "id": t.id, "tower_code": t.tower_code, "tower_name": t.tower_name, "total_floors": t.total_floors,
            "basement_floors": t.basement_floors, "total_lifts": t.total_lifts, "construction_status": t.construction_status,
            "floors": [{"floor_number": fl, "display_name": floor_names.get((t.id, fl), f"Floor {fl}"),
                        "total": sum(sm.values()), "available": sm.get("AVAILABLE", 0), "status_breakdown": sm}
                       for fl, sm in sorted(grid.get(t.id, {}).items())],
        } for t in towers],
        "apartment_plans": [{"unit_type": r[0], "count": r[1], "min_size": _f(r[2]), "max_size": _f(r[3]),
                             "min_price": _f(r[4]), "max_price": _f(r[5]), "floor_plan_image_url": r[6]} for r in types],
        "parking": {r[0]: r[1] for r in parking},
    }


@router.get("/projects/{project_id}/units")
async def project_units(
    project_id: int, tower_id: Optional[int] = None, floor: Optional[int] = None, status: Optional[str] = None,
    unit_type: Optional[str] = None, min_size: Optional[float] = None, max_size: Optional[float] = None,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    stmt = select(Unit).where(Unit.project_id == project_id, Unit.is_merged == False)
    if tower_id:
        stmt = stmt.where(Unit.tower_id == tower_id)
    if floor is not None:
        stmt = stmt.where(Unit.floor_number == floor)
    if status:
        stmt = stmt.where(Unit.status_id == status)
    if unit_type:
        stmt = stmt.where(Unit.unit_type_id == unit_type)
    if min_size:
        stmt = stmt.where(Unit.gross_saleable_area_sqft >= min_size)
    if max_size:
        stmt = stmt.where(Unit.gross_saleable_area_sqft <= max_size)
    units = (await db.execute(stmt.order_by(Unit.tower_id, desc(Unit.floor_number), Unit.unit_number))).scalars().all()
    tnames = await _names(db, Tower, [u.tower_id for u in units], "tower_name")
    return [_unit_dict(u, tnames.get(u.tower_id)) for u in units]


@router.get("/units/{unit_id}")
async def unit_detail(unit_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    u = await _get_or_404(db, Unit, unit_id, "Unit")
    tower = await db.get(Tower, u.tower_id)
    project = await db.get(Project, u.project_id)
    slots = (await db.execute(select(ParkingSlot).where(ParkingSlot.project_id == u.project_id,
                                                        or_(ParkingSlot.assigned_unit_id == u.id, ParkingSlot.status == "AVAILABLE"))
                              .order_by(ParkingSlot.slot_number).limit(50))).scalars().all()
    return {
        **_unit_dict(u, tower.tower_name if tower else None),
        "project_name": project.project_name if project else None,
        "parking_slots": [{"id": p.id, "slot_number": p.slot_number, "facility_type": p.facility_type, "basement_level": p.basement_level,
                           "size_sqft": _f(p.size_sqft), "price": _f(p.price), "status": p.status,
                           "assigned_to_this_unit": p.assigned_unit_id == u.id} for p in slots],
    }


@router.get("/projects/{project_id}/parking")
async def project_parking(project_id: int, status: Optional[str] = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(ParkingSlot).where(ParkingSlot.project_id == project_id)
    if status:
        stmt = stmt.where(ParkingSlot.status == status)
    rows = (await db.execute(stmt.order_by(ParkingSlot.basement_level, ParkingSlot.slot_number))).scalars().all()
    return [{"id": p.id, "slot_number": p.slot_number, "facility_type": p.facility_type, "basement_level": p.basement_level,
             "size_sqft": _f(p.size_sqft), "price": _f(p.price), "status": p.status, "assigned_unit_id": p.assigned_unit_id} for p in rows]


# =====================================================================
# Quotation Management
# =====================================================================
def _quotation_dict(q: Quotation, project_name=None):
    return {"id": q.id, "quotation_number": q.quotation_number, "project_id": q.project_id, "project_name": project_name,
            "unit_id": q.unit_id, "unit_code": q.unit_code, "customer_name": q.customer_name, "customer_phone": q.customer_phone,
            "customer_email": q.customer_email, "chargeable_area_sqft": _f(q.chargeable_area_sqft), "rate_per_sqft": _f(q.rate_per_sqft),
            "base_apartment_price": _f(q.base_apartment_price), "parking_charge": _f(q.parking_charge), "discount_pct": _f(q.discount_pct),
            "discount_amount": _f(q.discount_amount), "net_total_price": _f(q.net_total_price), "valid_until": _iso(q.valid_until),
            "status": "EXPIRED" if q.status == "ISSUED" and q.valid_until and q.valid_until < datetime.now() else q.status,
            "prepared_by": q.prepared_by, "notes": q.notes, "created_at": _iso(q.created_at),
            "pdf_url": f"{settings.API_V1_PREFIX}/mobile/quotations/{q.id}/pdf"}


@router.get("/quotations")
async def list_quotations(search: Optional[str] = None, mine: Optional[bool] = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Quotation)
    if mine or (mine is None and not is_manager(user)):
        stmt = stmt.where(Quotation.prepared_by == user.full_name_en)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(Quotation.quotation_number.ilike(like), Quotation.customer_name.ilike(like), Quotation.customer_phone.ilike(like)))
    rows = (await db.execute(stmt.order_by(desc(Quotation.created_at)).limit(100))).scalars().all()
    proj = await _names(db, Project, [q.project_id for q in rows], "project_name")
    return [_quotation_dict(q, proj.get(q.project_id)) for q in rows]


@router.post("/quotations/preview")
async def preview_quotation(payload: s.MobileQuotationCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await _calc_quotation(db, payload)


async def _calc_quotation(db: AsyncSession, payload: s.MobileQuotationCreate):
    u = await _get_or_404(db, Unit, payload.unit_id, "Unit")
    area = Decimal(u.gross_saleable_area_sqft or 0)
    rate = Decimal(payload.rate_per_sqft) if payload.rate_per_sqft else Decimal(u.effective_rate_per_sqft or u.base_rate_per_sqft or 0)
    base = _q2(area * rate) if (payload.rate_per_sqft or not u.total_unit_price) else _q2(Decimal(u.total_unit_price))
    parking = Decimal(payload.parking_charge) if payload.parking_charge is not None else Decimal(u.parking_charge or 0)
    if payload.discount_amount:
        disc = _q2(Decimal(payload.discount_amount))
        pct = _q2(disc * 100 / base) if base else Decimal("0")
    else:
        pct = _q2(Decimal(payload.discount_pct or 0))
        disc = _q2(base * pct / 100)
    if disc > base:
        raise HTTPException(400, "Discount cannot exceed unit price.")
    net = _q2(base + parking - disc)
    return {"unit": u, "area": area, "rate": rate, "base": base, "parking": parking, "discount": disc, "pct": pct, "net": net,
            "needs_approval": disc > Decimal(u.max_discount_amount or 0),
            "summary": {"chargeable_area_sqft": _f(area), "rate_per_sqft": _f(rate), "base_apartment_price": _f(base),
                        "parking_charge": _f(parking), "discount_pct": _f(pct), "discount_amount": _f(disc), "net_total_price": _f(net),
                        "max_discount_allowed": _f(u.max_discount_amount)}} if False else {
        "chargeable_area_sqft": _f(area), "rate_per_sqft": _f(rate), "base_apartment_price": _f(base), "parking_charge": _f(parking),
        "discount_pct": _f(pct), "discount_amount": _f(disc), "net_total_price": _f(net), "max_discount_allowed": _f(u.max_discount_amount),
        "exceeds_discount_limit": disc > Decimal(u.max_discount_amount or 0), "_unit": u,
    }


@router.post("/quotations", status_code=201)
async def create_quotation(payload: s.MobileQuotationCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    calc = await _calc_quotation(db, payload)
    u: Unit = calc.pop("_unit")
    q = Quotation(
        quotation_number=_code("QT"), project_id=u.project_id, unit_id=u.id, unit_code=u.unit_number,
        customer_name=payload.customer_name.strip(), customer_phone=payload.customer_phone.strip(), customer_email=_blank(payload.customer_email),
        chargeable_area_sqft=calc["chargeable_area_sqft"], rate_per_sqft=calc["rate_per_sqft"], base_apartment_price=calc["base_apartment_price"],
        parking_charge=calc["parking_charge"], discount_pct=calc["discount_pct"], discount_amount=calc["discount_amount"],
        net_total_price=calc["net_total_price"], valid_until=datetime.now() + timedelta(days=payload.valid_days),
        status="ISSUED", prepared_by=user.full_name_en, notes=_blank(payload.notes),
    )
    db.add(q)
    await db.commit()
    project = await db.get(Project, q.project_id)
    return _quotation_dict(q, project.project_name if project else None)


@router.get("/quotations/{quotation_id}")
async def get_quotation(quotation_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = await _get_or_404(db, Quotation, quotation_id, "Quotation")
    project = await db.get(Project, q.project_id)
    return _quotation_dict(q, project.project_name if project else None)


@router.get("/quotations/{quotation_id}/pdf")
async def quotation_pdf(quotation_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(_user_from_token_or_query)):
    q = await _get_or_404(db, Quotation, quotation_id, "Quotation")
    project = await db.get(Project, q.project_id)
    unit = await db.get(Unit, q.unit_id) if q.unit_id else None
    tower = await db.get(Tower, unit.tower_id) if unit else None
    pdf = build_quotation_pdf(q, project.project_name if project else "", tower.tower_name if tower else "", unit)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="{q.quotation_number}.pdf"'})


# =====================================================================
# Follow-ups
# =====================================================================
@router.get("/follow-ups")
async def list_follow_ups(
    status: Optional[str] = None, overdue: bool = False, today: bool = False, mine: Optional[bool] = None,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    stmt = select(FollowUpTask)
    if mine or (mine is None and not is_manager(user)):
        stmt = stmt.where(FollowUpTask.assigned_to_id == user.id)
    now = datetime.now()
    if overdue:
        stmt = stmt.where(FollowUpTask.status.in_(("PENDING", "IN_PROGRESS", "OVERDUE")), FollowUpTask.due_date < now)
    elif status:
        stmt = stmt.where(FollowUpTask.status == status)
    if today:
        t0 = datetime.combine(date.today(), datetime.min.time())
        stmt = stmt.where(FollowUpTask.due_date >= t0, FollowUpTask.due_date < t0 + timedelta(days=1))
    rows = (await db.execute(stmt.order_by(FollowUpTask.due_date).limit(200))).scalars().all()
    ln = await _names(db, Lead, [t.lead_id for t in rows], "lead_name")
    cn = await _names(db, Customer, [t.customer_id for t in rows], "full_name_en")
    return [_task_dict(t, ln.get(t.lead_id), cn.get(t.customer_id)) for t in rows]


@router.post("/follow-ups", status_code=201)
async def create_follow_up(payload: s.MobileFollowUpCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if not payload.lead_id and not payload.customer_id:
        raise HTTPException(400, "lead_id or customer_id is required.")
    data = payload.model_dump()
    data["assigned_to_id"] = data.get("assigned_to_id") or user.id
    t = FollowUpTask(task_code=_code("TSK"), status="PENDING", reminder_channel="MOBILE_PUSH", **data)
    db.add(t)
    if t.assigned_to_id != user.id:
        await _notify(db, t.assigned_to_id, f"New follow-up: {t.title}", f"Assigned by {user.full_name_en}, due {payload.due_date:%d %b %Y %H:%M}", "/follow-ups")
    await db.commit()
    return {"id": t.id, "task_code": t.task_code}


@router.patch("/follow-ups/{task_id}/complete")
async def complete_follow_up(task_id: int, payload: s.MobileFollowUpComplete, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    t = await _get_or_404(db, FollowUpTask, task_id, "Follow-up")
    t.status = "COMPLETED"
    t.completion_outcome = payload.completion_outcome
    t.completion_notes = payload.completion_notes
    t.completed_at = datetime.now()
    t.completed_by_id = user.id
    await db.commit()
    return {"id": t.id, "status": t.status}


# =====================================================================
# Site Visit Management  (crm_lead_activities, activity_type = SITE_VISIT)
# =====================================================================
@router.get("/site-visits")
async def list_site_visits(
    status: Optional[str] = None, upcoming: bool = False, date_from: Optional[date] = None, date_to: Optional[date] = None,
    mine: Optional[bool] = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    stmt = select(LeadActivity).where(LeadActivity.activity_type == SITE_VISIT)
    if mine or (mine is None and not is_manager(user)):
        stmt = stmt.where(LeadActivity.sales_rep_id == user.id)
    if status:
        stmt = stmt.where(LeadActivity.status == status)
    if upcoming:
        stmt = stmt.where(LeadActivity.scheduled_start >= datetime.combine(date.today(), datetime.min.time()),
                          LeadActivity.status.in_(("PLANNED", "CONFIRMED", "RESCHEDULED")))
    if date_from:
        stmt = stmt.where(LeadActivity.scheduled_start >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        stmt = stmt.where(LeadActivity.scheduled_start < datetime.combine(date_to + timedelta(days=1), datetime.min.time()))
    rows = (await db.execute(stmt.order_by(LeadActivity.scheduled_start.asc() if upcoming else desc(LeadActivity.scheduled_start)).limit(200))).scalars().all()
    ln = await _names(db, Lead, [a.lead_id for a in rows], "lead_name")
    cn = await _names(db, Customer, [a.customer_id for a in rows], "full_name_en")
    pn = await _names(db, Project, [a.project_id for a in rows], "project_name")
    un = await _names(db, Unit, [a.unit_id for a in rows], "unit_number")
    return [_activity_dict(a, ln.get(a.lead_id), cn.get(a.customer_id), pn.get(a.project_id), un.get(a.unit_id)) for a in rows]


@router.post("/site-visits", status_code=201)
async def create_site_visit(payload: s.MobileSiteVisitCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if not payload.lead_id and not payload.customer_id:
        raise HTTPException(400, "lead_id or customer_id is required.")
    project = await _get_or_404(db, Project, payload.project_id, "Project")
    who = ""
    if payload.lead_id:
        lead = await _get_or_404(db, Lead, payload.lead_id, "Lead")
        who = lead.lead_name
        if lead.lead_stage in ("NEW", "CONTACTED", "03_QUALIFIED"):
            lead.lead_stage = "SITE_VISIT_SCHEDULED"
    elif payload.customer_id:
        who = (await _get_or_404(db, Customer, payload.customer_id, "Customer")).full_name_en
    end = payload.scheduled_start + timedelta(minutes=payload.duration_minutes)
    a = LeadActivity(
        activity_code=_code("SV"), lead_id=payload.lead_id, customer_id=payload.customer_id, project_id=payload.project_id,
        unit_id=payload.unit_id, sales_rep_id=user.id, activity_type=SITE_VISIT, title=f"Site visit - {project.project_name}",
        activity_summary=f"Site visit with {who} at {project.project_name}", scheduled_at=payload.scheduled_start,
        scheduled_start=payload.scheduled_start, scheduled_end=end, duration_minutes=payload.duration_minutes,
        meeting_location=payload.meeting_location or project.site_address, agenda=payload.agenda, status="PLANNED",
        reminder_minutes_before=payload.reminder_minutes_before,
    )
    db.add(a)
    await db.flush()
    # Follow-up reminder before the visit
    db.add(FollowUpTask(task_code=_code("TSK"), lead_id=payload.lead_id, customer_id=payload.customer_id, activity_id=a.id,
                        title=f"Confirm site visit with {who}", task_category="SITE_VISIT_FOLLOW_UP", priority="HIGH",
                        due_date=payload.scheduled_start - timedelta(minutes=payload.reminder_minutes_before),
                        assigned_to_id=user.id, status="PENDING", reminder_channel="MOBILE_PUSH", is_automated=True))
    await db.commit()
    return {"id": a.id, "activity_code": a.activity_code}


@router.patch("/site-visits/{visit_id}")
async def update_site_visit(visit_id: int, payload: s.MobileSiteVisitUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    a = await _get_or_404(db, LeadActivity, visit_id, "Site visit")
    if a.activity_type != SITE_VISIT:
        raise HTTPException(400, "Activity is not a site visit.")
    a.status = payload.status
    if payload.scheduled_start:
        a.scheduled_start = a.scheduled_at = payload.scheduled_start
        a.scheduled_end = payload.scheduled_start + timedelta(minutes=a.duration_minutes or 60)
        a.is_reminder_sent = False
    if payload.outcome is not None:
        a.outcome = payload.outcome
    if payload.next_action is not None:
        a.next_action = payload.next_action
    if payload.status == "COMPLETED":
        a.completed_at = datetime.now()
        a.attendance_status = "ATTENDED"
        if a.lead_id:
            lead = await db.get(Lead, a.lead_id)
            if lead and lead.lead_stage in ("NEW", "CONTACTED", "SITE_VISIT_SCHEDULED", "03_QUALIFIED"):
                lead.lead_stage = "SITE_VISIT_COMPLETED"
    elif payload.status == "NO_SHOW":
        a.attendance_status = "NO_SHOW"
    if payload.next_follow_up_date:
        a.next_follow_up_date = payload.next_follow_up_date
        db.add(FollowUpTask(task_code=_code("TSK"), lead_id=a.lead_id, customer_id=a.customer_id, activity_id=a.id,
                            title=payload.next_action or "Post site-visit follow-up", task_category="SITE_VISIT_FOLLOW_UP",
                            priority="MEDIUM", due_date=datetime.combine(payload.next_follow_up_date, datetime.min.time()) + timedelta(hours=10),
                            assigned_to_id=a.sales_rep_id or user.id, status="PENDING", reminder_channel="MOBILE_PUSH", is_automated=True))
    await db.commit()
    return {"id": a.id, "status": a.status}


# =====================================================================
# Booking Management
# =====================================================================
async def _create_approval(db: AsyncSession, user: User, doc_type: str, doc_id: int, ref: str, project_id: int, amount, notes: str, summary: dict) -> ApprovalRequest:
    req = await GovernanceEngineService.evaluate_and_create_request(db, ApprovalRequestCreate(
        document_type=doc_type, document_id=str(doc_id), document_reference_no=ref, project_id=project_id,
        maker_user_name=user.full_name_en, maker_notes=notes, financial_amount=Decimal(str(amount or 0)), document_summary=summary,
    ))
    req.maker_user_id = user.id
    return req


def _booking_dict(b: Booking, project_name=None, unit_number=None, customer_name=None):
    return {"id": b.id, "booking_reference_no": b.booking_reference_no, "project_id": b.project_id, "project_name": project_name,
            "unit_id": b.unit_id, "unit_number": unit_number, "customer_id": b.primary_customer_id, "customer_name": customer_name,
            "booking_date": _iso(b.booking_date), "base_unit_price": _f(b.base_unit_price), "discount_amount": _f(b.discount_amount),
            "discount_percentage": _f(b.discount_percentage), "discount_approval_status": b.discount_approval_status,
            "required_approval_tier": b.required_approval_tier, "parking_charge": _f(b.parking_charge),
            "parking_slot_number": b.parking_slot_number, "utility_charge": _f(b.utility_charge),
            "documentation_charge": _f(b.documentation_charge), "final_contract_value": _f(b.final_contract_value),
            "earnest_money_received": _f(b.earnest_money_received), "booking_money_target": _f(b.booking_money_target),
            "down_payment_target": _f(b.down_payment_target), "down_payment_received": _f(b.down_payment_received),
            "reservation_expiry_date": _iso(b.reservation_expiry_date), "sales_rep_name": b.sales_rep_name,
            "workflow_stage": b.workflow_stage, "status": b.status, "notes": b.notes, "created_at": _iso(b.created_at),
            "pdf_url": f"{settings.API_V1_PREFIX}/mobile/bookings/{b.id}/pdf"}


@router.get("/bookings")
async def list_bookings(search: Optional[str] = None, status: Optional[str] = None, mine: Optional[bool] = None,
                        db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Booking)
    if mine or (mine is None and not is_manager(user)):
        stmt = stmt.where(Booking.sales_rep_name == user.full_name_en)
    if status:
        stmt = stmt.where(Booking.status == status)
    if search:
        cids = select(Customer.id).where(or_(Customer.full_name_en.ilike(f"%{search}%"), Customer.primary_phone.ilike(f"%{search}%")))
        stmt = stmt.where(or_(Booking.booking_reference_no.ilike(f"%{search}%"), Booking.primary_customer_id.in_(cids)))
    rows = (await db.execute(stmt.order_by(desc(Booking.created_at)).limit(100))).scalars().all()
    pn = await _names(db, Project, [b.project_id for b in rows], "project_name")
    un = await _names(db, Unit, [b.unit_id for b in rows], "unit_number")
    cn = await _names(db, Customer, [b.primary_customer_id for b in rows], "full_name_en")
    return [_booking_dict(b, pn.get(b.project_id), un.get(b.unit_id), cn.get(b.primary_customer_id)) for b in rows]


@router.post("/bookings", status_code=201)
async def create_booking(payload: s.MobileBookingCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Reservation request -> provisional booking + installment plan + approval workflow."""
    u = await _get_or_404(db, Unit, payload.unit_id, "Unit")
    c = await _get_or_404(db, Customer, payload.customer_id, "Customer")
    if u.is_landowner_share:
        raise HTTPException(403, "Landowner share units cannot be booked.")
    if u.status_id not in ("AVAILABLE", "ON_HOLD", "RESERVED"):
        raise HTTPException(409, f"Unit {u.unit_number} is not available (status: {u.status_id}).")
    active = (await db.execute(select(Booking.id).where(Booking.unit_id == u.id, Booking.status != "CANCELLED"))).first()
    if active:
        raise HTTPException(409, "This unit already has an active booking.")

    base = _q2(Decimal(u.total_unit_price or 0) or Decimal(u.gross_saleable_area_sqft or 0) * Decimal(u.effective_rate_per_sqft or 0))
    parking = _q2(Decimal(payload.parking_charge if payload.parking_charge is not None else (u.parking_charge or 0)))
    utility = _q2(Decimal(payload.utility_charge if payload.utility_charge is not None else (u.utility_connection_fee or 0)))
    doc = _q2(Decimal(payload.documentation_charge))
    disc = _q2(Decimal(payload.discount_amount))
    if disc > base:
        raise HTTPException(400, "Discount cannot exceed base unit price.")
    pct = _q2(disc * 100 / base) if base else Decimal("0")
    tier = "SALES_MANAGER" if pct <= 1 else ("DIRECTOR" if pct <= 3 else "MANAGING_DIRECTOR")
    final = _q2(base + parking + utility + doc - disc)
    bm = _q2(final * Decimal(payload.booking_money_pct) / 100)
    dp = _q2(final * Decimal(payload.down_payment_pct) / 100)
    if dp < bm:
        dp = bm

    b = Booking(
        booking_reference_no=_code("BK"), project_id=u.project_id, unit_id=u.id, primary_customer_id=c.id, booking_date=date.today(),
        base_unit_price=base, discount_amount=disc, discount_percentage=pct, required_approval_tier=tier,
        discount_approval_status="PENDING_APPROVAL" if disc > 0 else "APPROVED", discount_approval_notes=payload.discount_justification,
        parking_charge=parking, parking_slot_number=_blank(payload.parking_slot_number), utility_charge=utility, documentation_charge=doc,
        final_contract_value=final, earnest_money_received=payload.earnest_money_received, booking_money_target=bm,
        down_payment_target=dp, down_payment_received=Decimal("0"), reservation_expiry_date=date.today() + timedelta(days=7),
        sales_rep_name=user.full_name_en, workflow_stage="03_PENDING_APPROVAL", status="PROVISIONAL", notes=_blank(payload.notes),
    )
    db.add(b)
    await db.flush()

    # ---- Installment plan ----
    start = payload.installment_start_date or _add_months(date.today(), 1)
    step = 3 if payload.plan_type == "QUARTERLY" else 1
    n = payload.installment_count
    balance = final - dp
    regular = (balance / n).quantize(Decimal("0.01"), rounding=ROUND_DOWN) if n else Decimal("0")
    rounding = _q2(balance - regular * n)
    sch = BookingInstallmentSchedule(
        schedule_code=_code("SCH"), booking_id=b.id, customer_id=c.id, plan_type=payload.plan_type, approved_contract_price=final,
        booking_money_amount=bm, down_payment_percentage=payload.down_payment_pct, down_payment_amount=dp,
        installment_balance_amount=balance, total_installment_count=n, regular_installment_amount=regular,
        rounding_adjustment_amount=rounding, rounding_adjusted_installment_no=n + 2, start_date=start, status="DRAFT",
    )
    db.add(sch)
    await db.flush()
    plan = [("BOOKING_MONEY", "Booking Money", date.today(), bm)]
    if dp - bm > 0:
        plan.append(("DOWN_PAYMENT", "Down Payment", date.today() + timedelta(days=30), dp - bm))
    itype = "QUARTERLY_INSTALLMENT" if step == 3 else "MONTHLY_INSTALLMENT"
    for i in range(n):
        amt = regular + (rounding if i == n - 1 else 0)
        plan.append((itype, f"Installment #{i + 1:02d}", _add_months(start, i * step), amt))
    for idx, (typ, title, due, amt) in enumerate(plan, start=1):
        db.add(CustomerInstallment(schedule_id=sch.id, booking_id=b.id, installment_no=idx, installment_type=typ, title=title,
                                   fixed_amount=amt, due_date=due, payable_amount=amt, balance_due=amt, status="SCHEDULED"))

    # ---- Reserve unit & approvals ----
    u.status_id = "RESERVED"
    summary = {"customer": c.full_name_en, "unit": u.unit_number, "final_contract_value": float(final),
               "discount_amount": float(disc), "discount_percentage": float(pct), "sales_rep": user.full_name_en}
    breq = await _create_approval(db, user, "BOOKING_APPROVAL", b.id, b.booking_reference_no, u.project_id, final,
                                  payload.notes or "Booking request from mobile app", summary)
    b.governance_request_id = breq.id
    dreq = None
    if disc > 0:
        dreq = await _create_approval(db, user, "DISCOUNT_APPROVAL", b.id, b.booking_reference_no, u.project_id, pct,
                                      payload.discount_justification or "Discount requested from mobile app", summary)
    await db.commit()
    return {"id": b.id, "booking_reference_no": b.booking_reference_no, "final_contract_value": float(final),
            "booking_approval_request": breq.request_number, "discount_approval_request": dreq.request_number if dreq else None,
            "installments": len(plan)}


@router.get("/bookings/{booking_id}")
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    b = await _get_or_404(db, Booking, booking_id, "Booking")
    project = await db.get(Project, b.project_id)
    unit = await db.get(Unit, b.unit_id)
    cust = await db.get(Customer, b.primary_customer_id)
    inst = (await db.execute(select(CustomerInstallment).where(CustomerInstallment.booking_id == b.id).order_by(CustomerInstallment.installment_no))).scalars().all()
    docs = (await db.execute(select(SalesLegalDocument).where(SalesLegalDocument.booking_id == b.id).order_by(desc(SalesLegalDocument.created_at)))).scalars().all()
    canc = (await db.execute(select(BookingCancellation).where(BookingCancellation.booking_id == b.id))).scalar_one_or_none()
    approvals = (await db.execute(select(ApprovalRequest).where(ApprovalRequest.document_id == str(b.id),
                                                                ApprovalRequest.document_type.in_(("BOOKING_APPROVAL", "DISCOUNT_APPROVAL", "BOOKING_CANCELLATION")))
                                  .order_by(desc(ApprovalRequest.created_at)))).scalars().all()
    paid = sum((i.paid_amount or 0) for i in inst)
    return {
        **_booking_dict(b, project.project_name if project else None, unit.unit_number if unit else None, cust.full_name_en if cust else None),
        "customer": _customer_dict(cust) if cust else None,
        "unit": _unit_dict(unit) if unit else None,
        "installments": [{"id": i.id, "installment_no": i.installment_no, "type": i.installment_type, "title": i.title,
                          "due_date": _iso(i.due_date), "payable_amount": _f(i.payable_amount), "paid_amount": _f(i.paid_amount),
                          "balance_due": _f(i.balance_due), "status": i.status} for i in inst],
        "total_paid": _f(paid), "outstanding": _f(Decimal(b.final_contract_value or 0) - Decimal(paid or 0)),
        "documents": [{"id": d.id, "document_number": d.document_number, "document_type": d.document_type, "title": d.title,
                       "version": d.version, "status": d.legal_review_status} for d in docs],
        "cancellation": {"id": canc.id, "code": canc.cancellation_code, "status": canc.status, "category": canc.cancellation_category,
                         "reason": canc.cancellation_reason, "net_refund_amount": _f(canc.net_refund_amount)} if canc else None,
        "approvals": [_approval_dict(r) for r in approvals],
    }


@router.get("/bookings/{booking_id}/pdf")
async def booking_pdf(booking_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(_user_from_token_or_query)):
    b = await _get_or_404(db, Booking, booking_id, "Booking")
    project = await db.get(Project, b.project_id)
    unit = await db.get(Unit, b.unit_id)
    cust = await db.get(Customer, b.primary_customer_id)
    inst = (await db.execute(select(CustomerInstallment).where(CustomerInstallment.booking_id == b.id).order_by(CustomerInstallment.installment_no))).scalars().all()
    label = f"{unit.unit_number} (Floor {unit.floor_number}, {_f(unit.gross_saleable_area_sqft)} sqft)" if unit else "-"
    pdf = build_booking_pdf(b, cust, project.project_name if project else "", label, inst)
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{b.booking_reference_no}.pdf"'})


@router.post("/bookings/{booking_id}/cancel", status_code=201)
async def request_cancellation(booking_id: int, payload: s.MobileBookingCancel, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    b = await _get_or_404(db, Booking, booking_id, "Booking")
    if b.status == "CANCELLED":
        raise HTTPException(400, "Booking is already cancelled.")
    if (await db.execute(select(BookingCancellation.id).where(BookingCancellation.booking_id == b.id))).first():
        raise HTTPException(409, "A cancellation request already exists for this booking.")
    paid = (await db.execute(select(func.coalesce(func.sum(CustomerInstallment.paid_amount), 0)).where(CustomerInstallment.booking_id == b.id))).scalar() or 0
    paid = Decimal(paid) + Decimal(b.earnest_money_received or 0)
    pct = Decimal("0") if payload.cancellation_category == "DEVELOPER_DELAY" else Decimal("10")
    ded = _q2(paid * pct / 100)
    canc = BookingCancellation(cancellation_code=_code("CAN"), booking_id=b.id, cancellation_category=payload.cancellation_category,
                               cancellation_reason=payload.cancellation_reason, total_paid=paid,
                               deduction_type="DEVELOPER_DEFAULT_ZERO" if pct == 0 else "REHAB_STATUTORY",
                               forfeiture_deduction_percentage=pct, forfeiture_deduction_amount=ded, net_refund_amount=_q2(paid - ded),
                               status="REQUESTED")
    db.add(canc)
    await db.flush()
    req = await _create_approval(db, user, "BOOKING_CANCELLATION", b.id, b.booking_reference_no, b.project_id, paid,
                                 payload.cancellation_reason, {"cancellation_code": canc.cancellation_code, "category": payload.cancellation_category,
                                                               "total_paid": float(paid), "net_refund": float(paid - ded)})
    await db.commit()
    return {"id": canc.id, "cancellation_code": canc.cancellation_code, "approval_request": req.request_number}


# =====================================================================
# Approval Workflow
# =====================================================================
def _approval_dict(r: ApprovalRequest, steps: Optional[List[ApprovalStep]] = None):
    d = {"id": r.id, "request_number": r.request_number, "document_type": r.document_type, "document_id": r.document_id,
         "document_reference_no": r.document_reference_no, "project_id": r.project_id, "maker_user_id": r.maker_user_id,
         "maker_user_name": r.maker_user_name, "maker_notes": r.maker_notes, "financial_amount": _f(r.financial_amount),
         "total_tiers": r.total_tiers, "current_tier": r.current_tier, "status": r.status, "document_summary": r.document_summary,
         "final_action_timestamp": _iso(r.final_action_timestamp), "created_at": _iso(r.created_at)}
    if steps is not None:
        d["steps"] = [{"id": st.id, "tier_level": st.tier_level, "tier_name": st.tier_name, "required_role": st.required_role,
                       "assigned_user_id": st.assigned_user_id, "assigned_user_name": st.assigned_user_name, "status": st.status,
                       "action_by_user_name": st.action_by_user_name, "action_timestamp": _iso(st.action_timestamp),
                       "comments": st.comments} for st in steps]
    return d


MOBILE_DOC_TYPES = ("DISCOUNT_APPROVAL", "BOOKING_APPROVAL", "BOOKING_CANCELLATION")


@router.get("/approvals")
async def list_approvals(
    box: str = Query("pending", description="pending = awaiting my action, submitted = raised by me, all"),
    document_type: Optional[str] = None, status: Optional[str] = None,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    stmt = select(ApprovalRequest).where(ApprovalRequest.document_type.in_(MOBILE_DOC_TYPES))
    if document_type:
        stmt = stmt.where(ApprovalRequest.document_type == document_type)
    if box == "submitted":
        stmt = stmt.where(ApprovalRequest.maker_user_id == user.id)
    elif box == "pending":
        stmt = stmt.where(ApprovalRequest.status == "PENDING")
        step_cond = and_(ApprovalStep.request_id == ApprovalRequest.id, ApprovalStep.tier_level == ApprovalRequest.current_tier,
                         ApprovalStep.status == "PENDING")
        if not user.is_group_admin:
            step_cond = and_(step_cond, or_(ApprovalStep.assigned_user_id == user.id,
                                            and_(ApprovalStep.assigned_user_id.is_(None), is_manager(user))))
        stmt = stmt.where(select(ApprovalStep.id).where(step_cond).exists())
    elif not is_manager(user):
        stmt = stmt.where(ApprovalRequest.maker_user_id == user.id)
    if status:
        stmt = stmt.where(ApprovalRequest.status == status)
    rows = (await db.execute(stmt.order_by(desc(ApprovalRequest.created_at)).limit(100))).scalars().all()
    return [_approval_dict(r) for r in rows]


@router.get("/approvals/{request_id}")
async def get_approval(request_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    r = await _get_or_404(db, ApprovalRequest, request_id, "Approval request")
    steps = (await db.execute(select(ApprovalStep).where(ApprovalStep.request_id == r.id).order_by(ApprovalStep.tier_level))).scalars().all()
    d = _approval_dict(r, steps)
    cur = next((st for st in steps if st.tier_level == r.current_tier and st.status == "PENDING"), None)
    d["can_act"] = bool(r.status == "PENDING" and cur and (user.is_group_admin or cur.assigned_user_id == user.id or (cur.assigned_user_id is None and is_manager(user))) and r.maker_user_id != user.id)
    return d


@router.post("/approvals/{request_id}/action")
async def act_on_approval(request_id: int, payload: s.MobileApprovalAction, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    r = await _get_or_404(db, ApprovalRequest, request_id, "Approval request")
    if r.status != "PENDING":
        raise HTTPException(400, f"Request is already {r.status}.")
    if r.maker_user_id == user.id and not user.is_group_admin:
        raise HTTPException(403, "Maker-Checker violation: you cannot approve your own request.")
    step = (await db.execute(select(ApprovalStep).where(ApprovalStep.request_id == r.id, ApprovalStep.tier_level == r.current_tier,
                                                        ApprovalStep.status == "PENDING"))).scalar_one_or_none()
    if not step:
        raise HTTPException(400, "No pending step for this request.")
    if not (user.is_group_admin or step.assigned_user_id == user.id or (step.assigned_user_id is None and is_manager(user))):
        raise HTTPException(403, f"This step requires role {step.required_role}.")
    action = payload.action.upper()
    if action in ("REJECT", "REQUEST_CORRECTION") and not _blank(payload.comments):
        raise HTTPException(400, "Comments are required for rejection / correction.")

    req, st = await GovernanceEngineService.process_step_action(db, r.id, step.id, ApprovalActionRequest(
        action=action, comments=payload.comments, approver_name=user.full_name_en))
    st.action_by_user_id = user.id
    await _sync_document(db, req)
    await db.commit()
    return {"id": req.id, "status": req.status, "current_tier": req.current_tier, "total_tiers": req.total_tiers}


async def _sync_document(db: AsyncSession, req: ApprovalRequest):
    """Propagate final approval outcome to the underlying sales documents."""
    if req.status not in ("APPROVED", "REJECTED"):
        return
    approved = req.status == "APPROVED"
    b = await db.get(Booking, int(req.document_id)) if req.document_id and req.document_id.isdigit() else None
    if not b:
        return
    unit = await db.get(Unit, b.unit_id)
    if req.document_type == "DISCOUNT_APPROVAL":
        b.discount_approval_status = req.status
    elif req.document_type == "BOOKING_APPROVAL":
        if approved:
            b.workflow_stage = "05_BOOKING_CONFIRMED"
            if unit:
                unit.status_id = "BOOKED"
            sch = (await db.execute(select(BookingInstallmentSchedule).where(BookingInstallmentSchedule.booking_id == b.id))).scalars().first()
            if sch:
                sch.status = "ACTIVE"
        else:
            b.status = "CANCELLED"
            b.workflow_stage = "REJECTED"
            if unit:
                unit.status_id = "AVAILABLE"
    elif req.document_type == "BOOKING_CANCELLATION":
        canc = (await db.execute(select(BookingCancellation).where(BookingCancellation.booking_id == b.id))).scalar_one_or_none()
        if canc:
            if approved:
                canc.status = "FINANCE_APPROVED"
                canc.legal_approval_status = canc.sales_approval_status = canc.finance_approval_status = "APPROVED"
                canc.inventory_reverted = True
                b.status = "CANCELLED"
                if unit:
                    unit.status_id = "AVAILABLE"
            else:
                canc.status = "REJECTED"
    await _notify(db, req.maker_user_id, f"{req.document_type.replace('_', ' ').title()} {req.status}: {req.document_reference_no}",
                  f"Your request {req.request_number} was {req.status.lower()}.", f"/approvals/{req.id}", req.id)


# =====================================================================
# Notifications
# =====================================================================
@router.get("/notifications")
async def list_notifications(unread_only: bool = False, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(GovernanceNotification).where(GovernanceNotification.recipient_user_id == user.id)
    if unread_only:
        stmt = stmt.where(GovernanceNotification.status != "READ")
    rows = (await db.execute(stmt.order_by(desc(GovernanceNotification.created_at)).limit(100))).scalars().all()
    items = []
    for n in rows:
        t = n.title.lower()
        kind = "LEAD_ASSIGNED" if "lead assigned" in t else ("APPROVAL_RESULT" if ("approved" in t or "rejected" in t) else
                                                             ("APPROVAL_PENDING" if "pending" in t or "approval" in t else "GENERAL"))
        items.append({"id": f"n-{n.id}", "type": kind, "title": n.title, "body": n.body, "action_url": n.action_url,
                      "request_id": n.request_id, "is_read": n.status == "READ", "created_at": _iso(n.created_at)})
    # Live overdue follow-up alerts (derived from crm_follow_up_tasks)
    overdue = (await db.execute(select(FollowUpTask).where(FollowUpTask.assigned_to_id == user.id,
                                                           FollowUpTask.status.in_(("PENDING", "IN_PROGRESS", "OVERDUE")),
                                                           FollowUpTask.due_date < datetime.now())
                                .order_by(FollowUpTask.due_date).limit(50))).scalars().all()
    for t in overdue:
        items.append({"id": f"f-{t.id}", "type": "OVERDUE_FOLLOW_UP", "title": f"Overdue follow-up: {t.title}",
                      "body": f"Was due {t.due_date:%d %b %Y %H:%M}. Priority {t.priority}.", "action_url": f"/follow-ups/{t.id}",
                      "request_id": None, "is_read": False, "created_at": _iso(t.due_date)})
    items.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return {"unread": sum(1 for i in items if not i["is_read"]), "items": items}


@router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    n = await _get_or_404(db, GovernanceNotification, notif_id, "Notification")
    if n.recipient_user_id != user.id:
        raise HTTPException(403, "Not your notification.")
    n.status = "READ"
    await db.commit()
    return {"id": n.id, "status": n.status}


@router.post("/notifications/read-all")
async def mark_all_read(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(GovernanceNotification).where(GovernanceNotification.recipient_user_id == user.id,
                                                                  GovernanceNotification.status != "READ"))).scalars().all()
    for n in rows:
        n.status = "READ"
    await db.commit()
    return {"updated": len(rows)}
