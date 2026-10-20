from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc
from typing import Optional
from datetime import datetime, date
import uuid

from app.core.database import get_db
from app.modules.mobile_sales.models import (
    MobileSalesLead,
    MobileSalesCustomer,
    MobileSalesProperty,
    MobileSalesQuotation,
    MobileSalesSiteVisit,
    MobileSalesBooking,
    MobileSalesApproval,
    MobileSalesNotification
)
from app.modules.mobile_sales.schemas import (
    LeadCreate, LeadUpdate,
    CustomerCreate, CustomerUpdate,
    PropertyCreate, PropertyUpdate,
    QuotationCreate, QuotationUpdate,
    SiteVisitCreate, SiteVisitUpdate,
    BookingCreate, BookingUpdate,
    ApprovalCreate, ApprovalUpdate,
    NotificationCreate
)

router = APIRouter(prefix="/mobile-sales", tags=["Mobile Sales App"])


# =========================================================================
# 1. Dashboard KPIs & Metrics
# =========================================================================
@router.get("/dashboard/kpis")
async def get_dashboard_kpis(db: AsyncSession = Depends(get_db)):
    """
    Returns Dashboard Metrics: Total leads, new leads, follow-ups, site visits, and conversions
    """
    await _seed_defaults_if_empty(db)

    total_leads = (await db.execute(select(func.count(MobileSalesLead.id)))).scalar() or 0
    new_leads = (await db.execute(select(func.count(MobileSalesLead.id)).where(MobileSalesLead.status == "NEW"))).scalar() or 0
    site_visits = (await db.execute(select(func.count(MobileSalesSiteVisit.id)))).scalar() or 0
    total_bookings = (await db.execute(select(func.count(MobileSalesBooking.id)))).scalar() or 0
    total_quotations = (await db.execute(select(func.count(MobileSalesQuotation.id)))).scalar() or 0
    pending_approvals = (await db.execute(select(func.count(MobileSalesApproval.id)).where(MobileSalesApproval.status == "PENDING"))).scalar() or 0
    active_properties = (await db.execute(select(func.count(MobileSalesProperty.id)).where(MobileSalesProperty.availability_status == "AVAILABLE"))).scalar() or 0

    conversion_rate = round((total_bookings / total_leads * 100), 1) if total_leads > 0 else 18.5

    return {
        "total_leads": total_leads,
        "new_leads": new_leads,
        "follow_ups": 34,
        "site_visits": site_visits,
        "total_bookings": total_bookings,
        "conversions": total_bookings,
        "conversion_rate_percentage": conversion_rate,
        "total_quotations": total_quotations,
        "pending_approvals": pending_approvals,
        "active_available_units": active_properties
    }


# =========================================================================
# 2. Lead Management
# =========================================================================
@router.get("/leads")
async def list_leads(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    lead_source: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSalesLead)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSalesLead.lead_name.ilike(s),
                MobileSalesLead.phone.ilike(s),
                MobileSalesLead.lead_code.ilike(s),
                MobileSalesLead.interested_project.ilike(s),
                MobileSalesLead.assigned_sales_rep_name.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSalesLead.status == status)
    if lead_source and lead_source != "ALL":
        query = query.where(MobileSalesLead.lead_source == lead_source)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSalesLead.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/leads")
async def create_lead(payload: LeadCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSalesLead.id)))).scalar() or 0
    code = f"LEAD-2026-{(count + 1):04d}"
    lead = MobileSalesLead(
        lead_code=code,
        lead_name=payload.lead_name,
        phone=payload.phone,
        email=payload.email,
        lead_source=payload.lead_source,
        status=payload.status,
        assigned_sales_rep_name=payload.assigned_sales_rep_name,
        interested_project=payload.interested_project,
        budget_bdt=payload.budget_bdt,
        notes=payload.notes
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: int, payload: LeadUpdate, db: AsyncSession = Depends(get_db)):
    lead = (await db.execute(select(MobileSalesLead).where(MobileSalesLead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    await db.commit()
    await db.refresh(lead)
    return lead


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    lead = (await db.execute(select(MobileSalesLead).where(MobileSalesLead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.commit()
    return {"message": "Lead deleted successfully", "id": lead_id}


# =========================================================================
# 3. Customer Management
# =========================================================================
@router.get("/customers")
async def list_customers(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSalesCustomer)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSalesCustomer.full_name.ilike(s),
                MobileSalesCustomer.phone.ilike(s),
                MobileSalesCustomer.customer_code.ilike(s),
                MobileSalesCustomer.email.ilike(s),
                MobileSalesCustomer.nid_number.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSalesCustomer.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSalesCustomer.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/customers")
async def create_customer(payload: CustomerCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSalesCustomer.id)))).scalar() or 0
    code = f"CUST-2026-{(count + 1):04d}"
    cust = MobileSalesCustomer(
        customer_code=code,
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        nid_number=payload.nid_number,
        present_address=payload.present_address,
        requirements=payload.requirements,
        interaction_history=payload.interaction_history,
        status=payload.status
    )
    db.add(cust)
    await db.commit()
    await db.refresh(cust)
    return cust


@router.put("/customers/{customer_id}")
async def update_customer(customer_id: int, payload: CustomerUpdate, db: AsyncSession = Depends(get_db)):
    cust = (await db.execute(select(MobileSalesCustomer).where(MobileSalesCustomer.id == customer_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cust, field, value)

    await db.commit()
    await db.refresh(cust)
    return cust


@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    cust = (await db.execute(select(MobileSalesCustomer).where(MobileSalesCustomer.id == customer_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    await db.delete(cust)
    await db.commit()
    return {"message": "Customer removed successfully", "id": customer_id}


# =========================================================================
# 4. Project & Property Management (Units & Real-time Availability)
# =========================================================================
@router.get("/properties")
async def list_properties(
    search: Optional[str] = Query(None),
    availability: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSalesProperty)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSalesProperty.project_name.ilike(s),
                MobileSalesProperty.unit_number.ilike(s),
                MobileSalesProperty.tower_name.ilike(s),
                MobileSalesProperty.location.ilike(s),
                MobileSalesProperty.unit_type.ilike(s)
            )
        )
    if availability and availability != "ALL":
        query = query.where(MobileSalesProperty.availability_status == availability)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(MobileSalesProperty.unit_number).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/properties")
async def create_property(payload: PropertyCreate, db: AsyncSession = Depends(get_db)):
    prop = MobileSalesProperty(
        project_name=payload.project_name,
        location=payload.location,
        tower_name=payload.tower_name,
        floor_no=payload.floor_no,
        unit_number=payload.unit_number,
        size_sqft=payload.size_sqft,
        unit_type=payload.unit_type,
        parking_slots=payload.parking_slots,
        price_per_sqft=payload.price_per_sqft,
        total_price=payload.total_price,
        availability_status=payload.availability_status,
        apartment_plans_url=payload.apartment_plans_url
    )
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return prop


@router.put("/properties/{property_id}")
async def update_property(property_id: int, payload: PropertyUpdate, db: AsyncSession = Depends(get_db)):
    prop = (await db.execute(select(MobileSalesProperty).where(MobileSalesProperty.id == property_id))).scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property unit not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(prop, field, value)

    await db.commit()
    await db.refresh(prop)
    return prop


@router.delete("/properties/{property_id}")
async def delete_property(property_id: int, db: AsyncSession = Depends(get_db)):
    prop = (await db.execute(select(MobileSalesProperty).where(MobileSalesProperty.id == property_id))).scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property unit not found")
    await db.delete(prop)
    await db.commit()
    return {"message": "Property unit removed successfully", "id": property_id}


# =========================================================================
# 5. Quotation Management
# =========================================================================
@router.get("/quotations")
async def list_quotations(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSalesQuotation)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSalesQuotation.quotation_no.ilike(s),
                MobileSalesQuotation.customer_name.ilike(s),
                MobileSalesQuotation.customer_phone.ilike(s),
                MobileSalesQuotation.project_name.ilike(s),
                MobileSalesQuotation.unit_number.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSalesQuotation.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSalesQuotation.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/quotations")
async def create_quotation(payload: QuotationCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSalesQuotation.id)))).scalar() or 0
    code = f"QTN-2026-{(count + 1):04d}"

    base_price = payload.base_price or (payload.size_sqft * payload.rate_per_sqft)
    discount_amount = (base_price * payload.discount_percent) / 100
    net_payable = (base_price + payload.parking_charge + payload.utility_charge) - discount_amount

    quot = MobileSalesQuotation(
        quotation_no=code,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        project_name=payload.project_name,
        unit_number=payload.unit_number,
        size_sqft=payload.size_sqft,
        rate_per_sqft=payload.rate_per_sqft,
        base_price=base_price,
        parking_charge=payload.parking_charge,
        utility_charge=payload.utility_charge,
        discount_percent=payload.discount_percent,
        discount_amount=discount_amount,
        net_payable=net_payable,
        validity_date=payload.validity_date or date.today(),
        status=payload.status,
        pdf_url=f"/static/uploads/quotations/{code}.pdf"
    )
    db.add(quot)
    await db.commit()
    await db.refresh(quot)
    return quot


@router.put("/quotations/{quotation_id}")
async def update_quotation(quotation_id: int, payload: QuotationUpdate, db: AsyncSession = Depends(get_db)):
    quot = (await db.execute(select(MobileSalesQuotation).where(MobileSalesQuotation.id == quotation_id))).scalar_one_or_none()
    if not quot:
        raise HTTPException(status_code=404, detail="Quotation not found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(quot, field, value)

    # Recalculate if financial fields changed
    base_price = quot.size_sqft * quot.rate_per_sqft
    quot.base_price = base_price
    quot.discount_amount = (base_price * quot.discount_percent) / 100
    quot.net_payable = (base_price + quot.parking_charge + quot.utility_charge) - quot.discount_amount

    await db.commit()
    await db.refresh(quot)
    return quot


@router.delete("/quotations/{quotation_id}")
async def delete_quotation(quotation_id: int, db: AsyncSession = Depends(get_db)):
    quot = (await db.execute(select(MobileSalesQuotation).where(MobileSalesQuotation.id == quotation_id))).scalar_one_or_none()
    if not quot:
        raise HTTPException(status_code=404, detail="Quotation not found")
    await db.delete(quot)
    await db.commit()
    return {"message": "Quotation deleted successfully", "id": quotation_id}


# =========================================================================
# 6. Site Visit Management
# =========================================================================
@router.get("/site-visits")
async def list_site_visits(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSalesSiteVisit)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSalesSiteVisit.visit_code.ilike(s),
                MobileSalesSiteVisit.customer_name.ilike(s),
                MobileSalesSiteVisit.customer_phone.ilike(s),
                MobileSalesSiteVisit.project_name.ilike(s),
                MobileSalesSiteVisit.sales_executive.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSalesSiteVisit.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSalesSiteVisit.scheduled_at)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/site-visits")
async def create_site_visit(payload: SiteVisitCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSalesSiteVisit.id)))).scalar() or 0
    code = f"VST-2026-{(count + 1):04d}"
    visit = MobileSalesSiteVisit(
        visit_code=code,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        project_name=payload.project_name,
        unit_number=payload.unit_number,
        sales_executive=payload.sales_executive,
        scheduled_at=payload.scheduled_at,
        status=payload.status,
        feedback=payload.feedback,
        follow_up_date=payload.follow_up_date
    )
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return visit


@router.put("/site-visits/{visit_id}")
async def update_site_visit(visit_id: int, payload: SiteVisitUpdate, db: AsyncSession = Depends(get_db)):
    visit = (await db.execute(select(MobileSalesSiteVisit).where(MobileSalesSiteVisit.id == visit_id))).scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit record not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(visit, field, value)

    await db.commit()
    await db.refresh(visit)
    return visit


@router.delete("/site-visits/{visit_id}")
async def delete_site_visit(visit_id: int, db: AsyncSession = Depends(get_db)):
    visit = (await db.execute(select(MobileSalesSiteVisit).where(MobileSalesSiteVisit.id == visit_id))).scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit record not found")
    await db.delete(visit)
    await db.commit()
    return {"message": "Site visit deleted", "id": visit_id}


# =========================================================================
# 7. Booking Management
# =========================================================================
@router.get("/bookings")
async def list_bookings(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSalesBooking)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSalesBooking.booking_no.ilike(s),
                MobileSalesBooking.customer_name.ilike(s),
                MobileSalesBooking.customer_phone.ilike(s),
                MobileSalesBooking.project_name.ilike(s),
                MobileSalesBooking.unit_number.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSalesBooking.reservation_status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSalesBooking.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/bookings")
async def create_booking(payload: BookingCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSalesBooking.id)))).scalar() or 0
    code = f"MOB-BK-2026-{(count + 1):04d}"
    booking = MobileSalesBooking(
        booking_no=code,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        project_name=payload.project_name,
        unit_number=payload.unit_number,
        booking_date=payload.booking_date,
        reservation_status=payload.reservation_status,
        booking_amount=payload.booking_amount,
        installment_plan_months=payload.installment_plan_months,
        documents_count=payload.documents_count,
        notes=payload.notes
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


@router.put("/bookings/{booking_id}")
async def update_booking(booking_id: int, payload: BookingUpdate, db: AsyncSession = Depends(get_db)):
    bk = (await db.execute(select(MobileSalesBooking).where(MobileSalesBooking.id == booking_id))).scalar_one_or_none()
    if not bk:
        raise HTTPException(status_code=404, detail="Booking not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(bk, field, value)

    await db.commit()
    await db.refresh(bk)
    return bk


@router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    bk = (await db.execute(select(MobileSalesBooking).where(MobileSalesBooking.id == booking_id))).scalar_one_or_none()
    if not bk:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.delete(bk)
    await db.commit()
    return {"message": "Booking request removed", "id": booking_id}


# =========================================================================
# 8. Approval Workflow (Discount, Booking & Cancellation)
# =========================================================================
@router.get("/approvals")
async def list_approvals(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSalesApproval)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSalesApproval.approval_code.ilike(s),
                MobileSalesApproval.reference_code.ilike(s),
                MobileSalesApproval.requested_by.ilike(s),
                MobileSalesApproval.request_type.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileSalesApproval.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSalesApproval.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/approvals")
async def create_approval(payload: ApprovalCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSalesApproval.id)))).scalar() or 0
    code = f"APP-2026-{(count + 1):04d}"
    appr = MobileSalesApproval(
        approval_code=code,
        request_type=payload.request_type,
        reference_code=payload.reference_code,
        requested_by=payload.requested_by,
        amount_involved=payload.amount_involved,
        status=payload.status,
        remarks=payload.remarks
    )
    db.add(appr)
    await db.commit()
    await db.refresh(appr)
    return appr


@router.put("/approvals/{approval_id}")
async def update_approval(approval_id: int, payload: ApprovalUpdate, db: AsyncSession = Depends(get_db)):
    appr = (await db.execute(select(MobileSalesApproval).where(MobileSalesApproval.id == approval_id))).scalar_one_or_none()
    if not appr:
        raise HTTPException(status_code=404, detail="Approval request not found")

    appr.status = payload.status
    appr.remarks = payload.remarks or appr.remarks
    appr.approved_by = payload.approved_by or "Sales Director"
    appr.decided_at = datetime.now()

    await db.commit()
    await db.refresh(appr)
    return appr


@router.delete("/approvals/{approval_id}")
async def delete_approval(approval_id: int, db: AsyncSession = Depends(get_db)):
    appr = (await db.execute(select(MobileSalesApproval).where(MobileSalesApproval.id == approval_id))).scalar_one_or_none()
    if not appr:
        raise HTTPException(status_code=404, detail="Approval not found")
    await db.delete(appr)
    await db.commit()
    return {"message": "Approval record deleted", "id": approval_id}


# =========================================================================
# 9. Notifications (Lead Assignment, Overdue Follow-ups, Approvals)
# =========================================================================
@router.get("/notifications")
async def list_notifications(
    search: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileSalesNotification)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileSalesNotification.title.ilike(s),
                MobileSalesNotification.message.ilike(s),
                MobileSalesNotification.notification_type.ilike(s)
            )
        )
    if is_read is not None:
        query = query.where(MobileSalesNotification.is_read == is_read)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileSalesNotification.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/notifications")
async def create_notification(payload: NotificationCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileSalesNotification.id)))).scalar() or 0
    code = f"NTF-2026-{(count + 1):04d}"
    ntf = MobileSalesNotification(
        notification_code=code,
        title=payload.title,
        notification_type=payload.notification_type,
        message=payload.message,
        recipient_name=payload.recipient_name,
        is_read=payload.is_read
    )
    db.add(ntf)
    await db.commit()
    await db.refresh(ntf)
    return ntf


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, db: AsyncSession = Depends(get_db)):
    ntf = (await db.execute(select(MobileSalesNotification).where(MobileSalesNotification.id == notification_id))).scalar_one_or_none()
    if not ntf:
        raise HTTPException(status_code=404, detail="Notification not found")
    ntf.is_read = True
    await db.commit()
    await db.refresh(ntf)
    return ntf


@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: int, db: AsyncSession = Depends(get_db)):
    ntf = (await db.execute(select(MobileSalesNotification).where(MobileSalesNotification.id == notification_id))).scalar_one_or_none()
    if not ntf:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.delete(ntf)
    await db.commit()
    return {"message": "Notification dismissed", "id": notification_id}


# =========================================================================
# 10. Authentication & Role Permissions
# =========================================================================
@router.get("/auth/session")
async def get_mobile_auth_session():
    """
    Returns mobile sales authentication session and role permissions
    """
    return {
        "user_id": 101,
        "username": "ashraful.alam",
        "full_name": "Ashraful Alam",
        "role_code": "SALES_EXEC",
        "role_name": "Senior Sales Executive",
        "assigned_projects": ["BlueOceans Marina Bay", "BlueOceans Skyline", "Lakeview Heights"],
        "permissions": [
            "MOBILE_SALES_DASHBOARD_VIEW",
            "MOBILE_LEAD_CREATE",
            "MOBILE_LEAD_ASSIGN",
            "MOBILE_CUSTOMER_MANAGE",
            "MOBILE_PROPERTY_VIEW",
            "MOBILE_QUOTATION_GENERATE",
            "MOBILE_SITE_VISIT_SCHEDULE",
            "MOBILE_BOOKING_REQUEST",
            "MOBILE_APPROVAL_SUBMIT",
            "MOBILE_NOTIFICATIONS_RECEIVE"
        ],
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sales_exec_demo_token",
        "token_type": "Bearer",
        "expires_in_hours": 24
    }


# =========================================================================
# Helper: Seed default records on first run
# =========================================================================
async def _seed_defaults_if_empty(db: AsyncSession):
    count = (await db.execute(select(func.count(MobileSalesLead.id)))).scalar() or 0
    if count > 0:
        return

    # Seed Leads
    leads_data = [
        MobileSalesLead(
            lead_code="LEAD-2026-0001",
            lead_name="Engr. Mahfuzur Rahman",
            phone="+8801711223344",
            email="mahfuz.rahman@gmail.com",
            lead_source="FACEBOOK_ADS",
            status="NEW",
            assigned_sales_rep_name="Ashraful Alam",
            interested_project="BlueOceans Marina Bay",
            budget_bdt=35000000.00,
            notes="Interested in 4BHK South-facing duplex with 2 car parking slots."
        ),
        MobileSalesLead(
            lead_code="LEAD-2026-0002",
            lead_name="Dr. Nuzhat Fatema",
            phone="+8801819556677",
            email="nuzhat.fatema@yahoo.com",
            lead_source="WEBSITE_INQUIRY",
            status="SITE_VISIT_SCHEDULED",
            assigned_sales_rep_name="Tahsina Rahman",
            interested_project="BlueOceans Skyline",
            budget_bdt=28000000.00,
            notes="Doctor at Square Hospital. Looking for quiet corner unit above 10th floor."
        ),
        MobileSalesLead(
            lead_code="LEAD-2026-0003",
            lead_name="Syed Tariqul Islam",
            phone="+8801912889900",
            email="tariqul.islam@apexgroup.com",
            lead_source="DIRECT_WALK_IN",
            status="NEGOTIATION",
            assigned_sales_rep_name="Ashraful Alam",
            interested_project="Lakeview Heights",
            budget_bdt=42000000.00,
            notes="NRB living in Dubai, visiting Dhaka till next Tuesday. Fast decision expected."
        ),
        MobileSalesLead(
            lead_code="LEAD-2026-0004",
            lead_name="Barrister Kamal Hossain",
            phone="+8801713445566",
            email="kamal.legal@gmail.com",
            lead_source="BROKER_REFERRAL",
            status="WON",
            assigned_sales_rep_name="Ashraful Alam",
            interested_project="BlueOceans Marina Bay",
            budget_bdt=38000000.00,
            notes="Booking advance submitted. Agreement drafting in progress."
        )
    ]
    db.add_all(leads_data)

    # Seed Customers
    cust_data = [
        MobileSalesCustomer(
            customer_code="CUST-2026-0001",
            full_name="Engr. Mahfuzur Rahman",
            phone="+8801711223344",
            email="mahfuz.rahman@gmail.com",
            nid_number="19822695500001",
            present_address="House 42, Road 11, Banani, Dhaka-1213",
            requirements="2,400+ sqft, 4 Bed, 4 Bath, Lakeview, 2 Car Parking",
            interaction_history="Phone call on 14 Oct; WhatsApp floorplan sent 16 Oct; Site visit set for tomorrow.",
            status="ACTIVE"
        ),
        MobileSalesCustomer(
            customer_code="CUST-2026-0002",
            full_name="Dr. Nuzhat Fatema",
            phone="+8801819556677",
            email="nuzhat.fatema@yahoo.com",
            nid_number="19892695500002",
            present_address="Flat 6B, Concord Tower, Panthapath, Dhaka",
            requirements="1,850 sqft, 3 Bed, Higher Floor, Modern Gymnasium & Pool in Complex",
            interaction_history="Met at REHAB Fair 2026; requested EMI schedule for 36 months.",
            status="ACTIVE"
        )
    ]
    db.add_all(cust_data)

    # Seed Properties
    prop_data = [
        MobileSalesProperty(
            project_name="BlueOceans Marina Bay",
            location="Plot 18, Road 90, Gulshan-2, Dhaka",
            tower_name="Tower Alpha",
            floor_no="Floor 14",
            unit_number="A-1402",
            size_sqft=2450.00,
            unit_type="4BHK Royal Duplex",
            parking_slots=2,
            price_per_sqft=15500.00,
            total_price=37975000.00,
            availability_status="AVAILABLE",
            apartment_plans_url="/static/uploads/plans/A-1402.pdf"
        ),
        MobileSalesProperty(
            project_name="BlueOceans Marina Bay",
            location="Plot 18, Road 90, Gulshan-2, Dhaka",
            tower_name="Tower Alpha",
            floor_no="Floor 10",
            unit_number="A-1001",
            size_sqft=2150.00,
            unit_type="3BHK Deluxe",
            parking_slots=1,
            price_per_sqft=14500.00,
            total_price=31175000.00,
            availability_status="BOOKED",
            apartment_plans_url="/static/uploads/plans/A-1001.pdf"
        ),
        MobileSalesProperty(
            project_name="BlueOceans Skyline",
            location="Sector 4, Uttara, Dhaka",
            tower_name="Skyline Vista",
            floor_no="Floor 08",
            unit_number="SV-803",
            size_sqft=1850.00,
            unit_type="3BHK Premium",
            parking_slots=1,
            price_per_sqft=11500.00,
            total_price=21275000.00,
            availability_status="AVAILABLE",
            apartment_plans_url="/static/uploads/plans/SV-803.pdf"
        ),
        MobileSalesProperty(
            project_name="Lakeview Heights",
            location="Road 27, Dhanmondi, Dhaka",
            tower_name="Tower Beta",
            floor_no="Floor 12",
            unit_number="B-1204",
            size_sqft=2600.00,
            unit_type="4BHK Penthouse",
            parking_slots=2,
            price_per_sqft=16000.00,
            total_price=41600000.00,
            availability_status="AVAILABLE",
            apartment_plans_url="/static/uploads/plans/B-1204.pdf"
        )
    ]
    db.add_all(prop_data)

    # Seed Quotations
    quot_data = [
        MobileSalesQuotation(
            quotation_no="QTN-2026-0001",
            customer_name="Engr. Mahfuzur Rahman",
            customer_phone="+8801711223344",
            project_name="BlueOceans Marina Bay",
            unit_number="A-1402",
            size_sqft=2450.00,
            rate_per_sqft=15500.00,
            base_price=37975000.00,
            parking_charge=1500000.00,
            utility_charge=600000.00,
            discount_percent=2.00,
            discount_amount=759500.00,
            net_payable=39315500.00,
            validity_date=date.today(),
            status="OFFERED",
            pdf_url="/static/uploads/quotations/QTN-2026-0001.pdf"
        )
    ]
    db.add_all(quot_data)

    # Seed Site Visits
    visit_data = [
        MobileSalesSiteVisit(
            visit_code="VST-2026-0001",
            customer_name="Dr. Nuzhat Fatema",
            customer_phone="+8801819556677",
            project_name="BlueOceans Skyline",
            unit_number="SV-803",
            sales_executive="Ashraful Alam",
            scheduled_at=datetime.now(),
            status="SCHEDULED",
            feedback="Family scheduled to inspect 8th-floor morning sunlight and view.",
            follow_up_date=date.today(),
            reminder_sent=True
        )
    ]
    db.add_all(visit_data)

    # Seed Bookings
    book_data = [
        MobileSalesBooking(
            booking_no="MOB-BK-2026-0001",
            customer_name="Barrister Kamal Hossain",
            customer_phone="+8801713445566",
            project_name="BlueOceans Marina Bay",
            unit_number="A-1001",
            booking_date=date.today(),
            reservation_status="CONFIRMED",
            booking_amount=2000000.00,
            installment_plan_months=36,
            documents_count=4,
            notes="Initial token paid via City Bank pay-order #PO-99212."
        )
    ]
    db.add_all(book_data)

    # Seed Approvals
    appr_data = [
        MobileSalesApproval(
            approval_code="APP-2026-0001",
            request_type="DISCOUNT_APPROVAL",
            reference_code="QTN-2026-0001",
            requested_by="Ashraful Alam",
            amount_involved=759500.00,
            status="APPROVED",
            remarks="VIP Client referral from Chairman office. 2% discount authorized.",
            approved_by="Md. Rafiqul Islam (Director Sales)",
            decided_at=datetime.now()
        ),
        MobileSalesApproval(
            approval_code="APP-2026-0002",
            request_type="BOOKING_APPROVAL",
            reference_code="MOB-BK-2026-0001",
            requested_by="Ashraful Alam",
            amount_involved=2000000.00,
            status="PENDING",
            remarks="Awaiting KYC verification of joint buyer and TIN certificate clearance."
        )
    ]
    db.add_all(appr_data)

    # Seed Notifications
    notif_data = [
        MobileSalesNotification(
            notification_code="NTF-2026-0001",
            title="New High-Priority Lead Assigned",
            notification_type="LEAD_ASSIGNMENT",
            message="Lead 'Engr. Mahfuzur Rahman' assigned for BlueOceans Marina Bay. Target first response: within 2 hours.",
            is_read=False,
            recipient_name="Ashraful Alam"
        ),
        MobileSalesNotification(
            notification_code="NTF-2026-0002",
            title="Site Visit Reminder: Today at 3:30 PM",
            notification_type="OVERDUE_FOLLOWUP",
            message="Site inspection with Dr. Nuzhat Fatema at Skyline project site. Site engineer notified.",
            is_read=False,
            recipient_name="Ashraful Alam"
        ),
        MobileSalesNotification(
            notification_code="NTF-2026-0003",
            title="Discount Request Approved",
            notification_type="APPROVAL_RESULT",
            message="2% discount on Quotation QTN-2026-0001 approved by Director of Sales.",
            is_read=True,
            recipient_name="Ashraful Alam"
        )
    ]
    db.add_all(notif_data)

    await db.commit()
