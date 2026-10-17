import io
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.portal.schemas import (
    CustomerPortalOverviewResponse,
    ConstructionUpdateCreate,
    ConstructionUpdateResponse,
    CustomerPaymentLedgerItem,
    CustomerInstallmentTimelineItem,
    CustomerServiceTicketCreate,
    CustomerServiceTicketUpdate,
    CustomerServiceTicketResponse,
    OnlinePaymentCheckoutRequest,
    OnlinePaymentCheckoutResponse,
    OnlinePaymentVerificationRequest,
    OnlinePaymentVerificationResponse,
)
from app.modules.portal.services import CustomerPortalService

router = APIRouter(prefix="/portal", tags=["Customer Self-Service Portal & Flat Owner Transparency"])


@router.get("/overview", response_model=CustomerPortalOverviewResponse)
async def get_customer_portal_overview(
    customer_id: Optional[int] = Query(None, description="Customer ID filter (defaults to active user)"),
    booking_id: Optional[int] = Query(None, description="Booking ID filter"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns consolidated Customer Portal dashboard:
    Apartment specifications, allotted parking bay, weekly construction photo gallery, payment ledger,
    upcoming installment timeline, and active snag tickets.
    """
    return await CustomerPortalService.get_customer_overview(db, customer_id, booking_id)


@router.get("/updates", response_model=List[ConstructionUpdateResponse])
async def get_construction_updates(
    project_id: Optional[int] = Query(None, description="Project ID filter"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns live photo gallery of building construction progress updated weekly by site engineers.
    """
    return await CustomerPortalService.get_construction_updates(db, project_id)


@router.post("/updates", response_model=ConstructionUpdateResponse, status_code=201)
async def create_construction_update(
    payload: ConstructionUpdateCreate,
    engineer_id: Optional[int] = Query(None, description="Engineer User ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Site engineer logs weekly construction progress with photo attachments and milestone completion %.
    """
    return await CustomerPortalService.create_construction_update(db, payload, engineer_id)


@router.get("/ledger", response_model=List[CustomerPaymentLedgerItem])
async def get_payment_ledger(
    booking_id: int = Query(..., description="Booking ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns complete ledger of payments made by flat owner with QR-verified Money Receipts.
    """
    return await CustomerPortalService.get_payment_ledger(db, booking_id)


@router.get("/installments", response_model=List[CustomerInstallmentTimelineItem])
async def get_installment_timeline(
    booking_id: int = Query(..., description="Booking ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns upcoming installment schedule timeline with due dates, surcharges, and current active installment.
    """
    return await CustomerPortalService.get_installment_timeline(db, booking_id)


@router.post("/tickets", response_model=CustomerServiceTicketResponse, status_code=201)
async def create_service_ticket(
    payload: CustomerServiceTicketCreate,
    customer_id: Optional[int] = Query(None, description="Customer ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Flat owner logs snag / maintenance support ticket with defect photo and category.
    """
    cust = await CustomerPortalService.get_or_default_customer(db, customer_id)
    return await CustomerPortalService.create_service_ticket(db, payload, cust.id)


@router.get("/tickets", response_model=List[CustomerServiceTicketResponse])
async def get_customer_tickets(
    customer_id: Optional[int] = Query(None, description="Customer ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of service / snag tickets logged by the flat owner with live resolution status.
    """
    cust = await CustomerPortalService.get_or_default_customer(db, customer_id)
    return await CustomerPortalService.get_customer_tickets(db, cust.id)


@router.patch("/tickets/{ticket_id}", response_model=CustomerServiceTicketResponse)
async def update_service_ticket(
    ticket_id: int,
    payload: CustomerServiceTicketUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Engineers or admins update snag ticket status (ACKNOWLEDGED, WORK_IN_PROGRESS, RESOLVED, CLOSED).
    """
    return await CustomerPortalService.update_service_ticket(db, ticket_id, payload)


@router.post("/payments/checkout", response_model=OnlinePaymentCheckoutResponse)
async def initiate_online_payment(
    payload: OnlinePaymentCheckoutRequest,
    customer_id: Optional[int] = Query(None, description="Customer ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates payment gateway checkout session for installment (bKash, Nagad, SSLCommerz).
    """
    cust = await CustomerPortalService.get_or_default_customer(db, customer_id)
    return await CustomerPortalService.initiate_online_payment(db, payload, cust.id)


@router.post("/payments/verify", response_model=OnlinePaymentVerificationResponse)
async def verify_online_payment(
    payload: OnlinePaymentVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies payment gateway transaction, updates installment ledger, and generates statutory Money Receipt.
    """
    return await CustomerPortalService.verify_online_payment(db, payload)


@router.get("/receipts/{receipt_id}/pdf")
async def download_money_receipt_pdf(
    receipt_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    1-Click Download of official statutory Money Receipt PDF with QR verification token.
    """
    pdf_bytes = await CustomerPortalService.generate_receipt_pdf_bytes(db, receipt_id)
    filename = f"Money_Receipt_MR_{receipt_id}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
