import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.modules.auth.models import User
from app.modules.projects.models import Project
from app.modules.crm.models import Lead, LeadActivity, Customer, Nominee
from app.modules.crm.schemas import (
    LeadCreate, LeadResponse, LeadStageUpdate,
    LeadActivityCreate, LeadActivityResponse,
    CustomerCreate, CustomerResponse,
    NomineeCreate, NomineeResponse,
    FacebookWebhookPayload
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crm", tags=["Omnichannel CRM & Customer KYC"])

# Global in-memory pointer for round-robin assignment among sales reps
_round_robin_counter = 0

async def _get_next_sales_rep(db: AsyncSession) -> Optional[User]:
    """
    Selects the next active sales representative using sequential round-robin.
    """
    global _round_robin_counter
    result = await db.execute(
        select(User).where(User.is_active == True).order_by(User.id.asc())
    )
    users = result.scalars().all()
    if not users:
        return None
    
    idx = _round_robin_counter % len(users)
    _round_robin_counter += 1
    return users[idx]


# --------------------------------------------------------------------------
# Facebook Lead Ads Webhook Receiver
# --------------------------------------------------------------------------
@router.get("/webhooks/facebook")
async def verify_facebook_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token")
):
    """
    Facebook Webhook Verification Challenge endpoint.
    """
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
    """
    Parses Facebook Lead Ads payload or direct lead ingestion test payload,
    resolves project interest, assigns sales representative via round-robin,
    and creates a crm_leads record with an initial STAGE_CHANGE activity.
    """
    lead_name = payload.lead_name or "Facebook Prospect"
    primary_phone = payload.phone_number or "+8801700000000"
    email = payload.email
    campaign_name = payload.campaign_name or "FB-Lead-Ad-Campaign"
    interested_project_id = None

    # Inspect nested entries if present in standard Facebook Webhook format
    if payload.entry:
        try:
            for entry in payload.entry:
                changes = entry.get("changes", [])
                for change in changes:
                    value = change.get("value", {})
                    if "leadgen_id" in value:
                        lead_name = f"FB Lead #{value.get('leadgen_id')}"
                    if "adgroup_name" in value:
                        campaign_name = value.get("adgroup_name")
        except Exception as e:
            logger.warning(f"Error parsing raw FB entries: {e}")

    # Resolve project if project code is specified
    if payload.interested_project_code:
        prj_res = await db.execute(
            select(Project).where(Project.project_code == payload.interested_project_code)
        )
        proj = prj_res.scalars().first()
        if proj:
            interested_project_id = proj.id

    # Round-robin sales rep assignment
    sales_rep = await _get_next_sales_rep(db)
    sales_rep_id = sales_rep.id if sales_rep else None

    # Calculate initial lead score
    lead_score = 65
    if email and primary_phone:
        lead_score += 15
    if interested_project_id:
        lead_score += 10

    new_lead = Lead(
        lead_source_id="FACEBOOK_ADS",
        campaign_name=campaign_name,
        lead_name=lead_name,
        primary_phone=primary_phone,
        email=email,
        interested_project_id=interested_project_id,
        budget_range_min=10000000.00,
        budget_range_max=25000000.00,
        assigned_sales_rep_id=sales_rep_id,
        lead_stage="NEW",
        lead_score=min(lead_score, 100),
        notes="Automated lead captured via Facebook Ads Lead Webhook."
    )
    db.add(new_lead)
    await db.flush()

    # Log initial activity
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
        "lead_name": new_lead.lead_name,
        "assigned_to": sales_rep.full_name_en if sales_rep else "Unassigned",
        "lead_score": new_lead.lead_score
    }


# --------------------------------------------------------------------------
# CRM Leads Endpoints (Kanban & List)
# --------------------------------------------------------------------------
@router.get("/leads", response_model=List[LeadResponse])
async def list_leads(
    lead_stage: Optional[str] = None,
    search: Optional[str] = None,
    sales_rep_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of leads with activities, assigned sales rep, and interested project.
    """
    stmt = (
        select(Lead)
        .options(
            selectinload(Lead.activities),
            selectinload(Lead.assigned_sales_rep),
            selectinload(Lead.interested_project)
        )
        .order_by(Lead.updated_at.desc())
    )

    if lead_stage:
        stmt = stmt.where(Lead.lead_stage == lead_stage.upper())
    if sales_rep_id:
        stmt = stmt.where(Lead.assigned_sales_rep_id == sales_rep_id)
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Lead.lead_name.ilike(search_pattern),
                Lead.primary_phone.ilike(search_pattern),
                Lead.email.ilike(search_pattern),
                Lead.campaign_name.ilike(search_pattern)
            )
        )

    result = await db.execute(stmt)
    leads = result.scalars().all()

    # Map relation names for the response
    responses = []
    for l in leads:
        resp = LeadResponse.model_validate(l)
        if l.assigned_sales_rep:
            resp.assigned_sales_rep_name = l.assigned_sales_rep.full_name_en
        if l.interested_project:
            resp.interested_project_name = l.interested_project.project_name
        responses.append(resp)

    return responses


@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new lead manually (Walk-in, Broker, Web Form, or Direct Call).
    """
    assigned_rep_id = payload.assigned_sales_rep_id
    if not assigned_rep_id:
        rep = await _get_next_sales_rep(db)
        if rep:
            assigned_rep_id = rep.id

    # Compute dynamic lead scoring
    score = 50
    if payload.email and payload.primary_phone:
        score += 15
    if payload.interested_project_id:
        score += 15
    if payload.budget_range_min and payload.budget_range_min > 0:
        score += 10
    if payload.lead_source_id in ["WALK_IN", "BROKER"]:
        score += 10

    lead = Lead(
        lead_source_id=payload.lead_source_id or "WALK_IN",
        campaign_name=payload.campaign_name,
        lead_name=payload.lead_name,
        primary_phone=payload.primary_phone,
        email=payload.email,
        interested_project_id=payload.interested_project_id,
        budget_range_min=payload.budget_range_min,
        budget_range_max=payload.budget_range_max,
        assigned_sales_rep_id=assigned_rep_id,
        lead_stage=payload.lead_stage or "NEW",
        lead_score=min(score, 100),
        notes=payload.notes
    )
    db.add(lead)
    await db.flush()

    activity = LeadActivity(
        lead_id=lead.id,
        sales_rep_id=assigned_rep_id,
        activity_type="STAGE_CHANGE",
        activity_summary=f"Lead registered in system under stage {lead.lead_stage}.",
        outcome="CREATED"
    )
    db.add(activity)
    await db.commit()

    # Re-fetch with eager loaded relationships
    result = await db.execute(
        select(Lead)
        .options(
            selectinload(Lead.activities),
            selectinload(Lead.assigned_sales_rep),
            selectinload(Lead.interested_project)
        )
        .where(Lead.id == lead.id)
    )
    saved_lead = result.scalars().first()
    resp = LeadResponse.model_validate(saved_lead)
    if saved_lead.assigned_sales_rep:
        resp.assigned_sales_rep_name = saved_lead.assigned_sales_rep.full_name_en
    if saved_lead.interested_project:
        resp.interested_project_name = saved_lead.interested_project.project_name
    return resp


@router.put("/leads/{lead_id}/stage", response_model=LeadResponse)
async def update_lead_stage(
    lead_id: int,
    payload: LeadStageUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the Kanban stage of a lead and logs a stage-transition activity.
    """
    stmt = (
        select(Lead)
        .options(
            selectinload(Lead.activities),
            selectinload(Lead.assigned_sales_rep),
            selectinload(Lead.interested_project)
        )
        .where(Lead.id == lead_id)
    )
    result = await db.execute(stmt)
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_stage = lead.lead_stage
    new_stage = payload.lead_stage.upper()
    lead.lead_stage = new_stage

    # Dynamic score adjustments based on pipeline progression
    stage_scores = {
        "NEW": 50,
        "CONTACTED": 60,
        "VISITED": 75,
        "NEGOTIATION": 90,
        "BOOKED": 100,
        "DROPPED": 15
    }
    if new_stage in stage_scores:
        lead.lead_score = stage_scores[new_stage]

    # Create activity audit
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

    resp = LeadResponse.model_validate(lead)
    if lead.assigned_sales_rep:
        resp.assigned_sales_rep_name = lead.assigned_sales_rep.full_name_en
    if lead.interested_project:
        resp.interested_project_name = lead.interested_project.project_name
    return resp


@router.post("/leads/{lead_id}/activities", response_model=LeadActivityResponse)
async def log_lead_activity(
    lead_id: int,
    payload: LeadActivityCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Logs phone calls, site visits, WhatsApp conversations, or scheduled follow-ups.
    """
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

    # If activity is a completed site visit, boost score
    if payload.activity_type == "SITE_VISIT" and payload.outcome == "VISITED_POSITIVE":
        lead.lead_score = min(lead.lead_score + 15, 100)
        if lead.lead_stage in ["NEW", "CONTACTED"]:
            lead.lead_stage = "VISITED"

    await db.commit()
    await db.refresh(activity)
    return activity


# --------------------------------------------------------------------------
# CRM Customer KYC & Nominee Profiles (Module 52)
# --------------------------------------------------------------------------
@router.get("/customers", response_model=List[CustomerResponse])
async def list_customers(
    search: Optional[str] = None,
    is_nrb: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Lists KYC verified customer profiles with their registered nominees.
    """
    stmt = (
        select(Customer)
        .options(selectinload(Customer.nominees))
        .order_by(Customer.id.desc())
    )

    if is_nrb is not None:
        stmt = stmt.where(Customer.is_nrb == is_nrb)

    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Customer.full_name_en.ilike(search_pattern),
                Customer.customer_code.ilike(search_pattern),
                Customer.nid_number.ilike(search_pattern),
                Customer.primary_phone.ilike(search_pattern),
                Customer.email.ilike(search_pattern)
            )
        )

    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new customer KYC profile with nominee share verification (sum must not exceed 100%).
    """
    # Validate nominee share percentages if nominees are provided
    if payload.nominees:
        total_share = sum(n.share_percentage for n in payload.nominees)
        if total_share > 100.00:
            raise HTTPException(
                status_code=400,
                detail=f"Total nominee share percentage cannot exceed 100%. (Current sum: {total_share}%)"
            )

    # Generate customer code
    count_res = await db.execute(select(func.count(Customer.id)))
    next_num = (count_res.scalar() or 0) + 1
    generated_code = f"CUST-2026-{next_num:04d}"

    customer = Customer(
        customer_code=generated_code,
        full_name_en=payload.full_name_en,
        full_name_bn=payload.full_name_bn,
        father_husband_name=payload.father_husband_name,
        mother_name=payload.mother_name,
        nid_number=payload.nid_number,
        tin_number=payload.tin_number,
        primary_phone=payload.primary_phone,
        email=payload.email,
        present_address=payload.present_address,
        permanent_address=payload.permanent_address,
        is_nrb=payload.is_nrb,
        passport_number=payload.passport_number,
        profile_photo_url=payload.profile_photo_url
    )
    db.add(customer)
    await db.flush()

    if payload.nominees:
        for nom in payload.nominees:
            nominee_record = Nominee(
                customer_id=customer.id,
                nominee_name=nom.nominee_name,
                relation_type=nom.relationship,
                nid_number=nom.nid_number,
                share_percentage=nom.share_percentage,
                photo_url=nom.photo_url
            )
            db.add(nominee_record)

    await db.commit()

    result = await db.execute(
        select(Customer)
        .options(selectinload(Customer.nominees))
        .where(Customer.id == customer.id)
    )
    return result.scalars().first()


@router.post("/customers/{customer_id}/nominees", response_model=NomineeResponse)
async def add_nominee(
    customer_id: int,
    payload: NomineeCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Appends a new nominee to an existing customer KYC file.
    """
    cust_res = await db.execute(
        select(Customer)
        .options(selectinload(Customer.nominees))
        .where(Customer.id == customer_id)
    )
    customer = cust_res.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    existing_sum = sum(n.share_percentage for n in customer.nominees)
    if existing_sum + payload.share_percentage > 100.00:
        raise HTTPException(
            status_code=400,
            detail=f"Adding {payload.share_percentage}% exceeds total limit. Current assigned: {existing_sum}%."
        )

    nominee = Nominee(
        customer_id=customer_id,
        nominee_name=payload.nominee_name,
        relation_type=payload.relationship,
        nid_number=payload.nid_number,
        share_percentage=payload.share_percentage,
        photo_url=payload.photo_url
    )
    db.add(nominee)
    await db.commit()
    await db.refresh(nominee)
    return nominee


# --------------------------------------------------------------------------
# CRM Metrics & Conversion Reports
# --------------------------------------------------------------------------
@router.get("/reports/conversion")
async def get_conversion_metrics(db: AsyncSession = Depends(get_db)):
    """
    Returns funnel conversion analytics, lead source distribution, and pipeline health.
    """
    # Count leads by stage
    stage_counts = {}
    for stage in ["NEW", "CONTACTED", "VISITED", "NEGOTIATION", "BOOKED", "DROPPED"]:
        res = await db.execute(
            select(func.count(Lead.id)).where(Lead.lead_stage == stage)
        )
        stage_counts[stage] = res.scalar() or 0

    total_leads = sum(stage_counts.values())
    booked_leads = stage_counts.get("BOOKED", 0)
    conversion_rate = (booked_leads / total_leads * 100.0) if total_leads > 0 else 0.0

    # Source breakdown
    sources_res = await db.execute(
        select(Lead.lead_source_id, func.count(Lead.id)).group_by(Lead.lead_source_id)
    )
    source_distribution = {row[0]: row[1] for row in sources_res.all()}

    # Customer count
    cust_res = await db.execute(select(func.count(Customer.id)))
    total_customers = cust_res.scalar() or 0

    return {
        "total_leads": total_leads,
        "conversion_rate_percentage": round(conversion_rate, 2),
        "stage_funnel": stage_counts,
        "source_distribution": source_distribution,
        "total_verified_customers": total_customers
    }
