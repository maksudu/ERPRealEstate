import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.modules.crm.models import Customer
from app.modules.sales.models import Booking
from app.modules.inventory.models import Unit
from app.modules.projects.models import Project, Tower
from app.modules.installments.models import CustomerInstallment, MoneyReceipt, MoneyReceiptAllocation
from app.modules.portal.models import (
    ConstructionProgressUpdate,
    CustomerServiceTicket,
    OnlinePaymentIntent,
)
from app.modules.portal.schemas import (
    PhotoItem,
    ConstructionUpdateCreate,
    ConstructionUpdateResponse,
    CustomerUnitSummary,
    CustomerPaymentLedgerItem,
    CustomerInstallmentTimelineItem,
    CustomerServiceTicketCreate,
    CustomerServiceTicketUpdate,
    CustomerServiceTicketResponse,
    OnlinePaymentCheckoutRequest,
    OnlinePaymentCheckoutResponse,
    OnlinePaymentVerificationRequest,
    OnlinePaymentVerificationResponse,
    CustomerPortalOverviewResponse,
)
from app.modules.portal.receipt_pdf import MoneyReceiptPDFGenerator


class CustomerPortalService:
    @staticmethod
    async def get_or_default_customer(db: AsyncSession, customer_id: Optional[int] = None) -> Customer:
        if customer_id:
            res = await db.execute(select(Customer).where(Customer.id == customer_id))
            cust = res.scalar_one_or_none()
            if cust:
                return cust
        
        # Fallback to the first registered customer in DB
        res = await db.execute(select(Customer).limit(1))
        cust = res.scalar_one_or_none()
        if not cust:
            raise HTTPException(status_code=404, detail="No customer found in the system.")
        return cust

    @staticmethod
    async def get_customer_overview(
        db: AsyncSession,
        customer_id: Optional[int] = None,
        booking_id: Optional[int] = None
    ) -> CustomerPortalOverviewResponse:
        customer = await CustomerPortalService.get_or_default_customer(db, customer_id)

        # 1. Fetch Primary Booking
        b_query = select(Booking).where(Booking.primary_customer_id == customer.id)
        if booking_id:
            b_query = b_query.where(Booking.id == booking_id)
        b_res = await db.execute(b_query.order_by(desc(Booking.id)).limit(1))
        booking = b_res.scalar_one_or_none()

        unit_summary: Optional[CustomerUnitSummary] = None
        project_id = 1

        if booking:
            project_id = booking.project_id
            # Fetch Project & Unit
            p_res = await db.execute(select(Project).where(Project.id == booking.project_id))
            project = p_res.scalar_one_or_none()

            u_res = await db.execute(select(Unit).where(Unit.id == booking.unit_id))
            unit = u_res.scalar_one_or_none()

            # Calculate payments
            mr_res = await db.execute(
                select(MoneyReceipt).where(MoneyReceipt.booking_id == booking.id)
            )
            receipts = mr_res.scalars().all()
            total_paid = sum(Decimal(str(r.amount_received or 0)) for r in receipts)
            contract_val = Decimal(str(booking.final_contract_value or 0))
            dues = max(Decimal("0.00"), contract_val - total_paid)

            unit_summary = CustomerUnitSummary(
                booking_id=booking.id,
                booking_reference_no=booking.booking_reference_no,
                project_id=project.id if project else 1,
                project_name=project.project_name if project else "Ocean Heights Luxury Residency",
                project_location=getattr(project, 'location', None) or "Plot 14, Road 71, Gulshan-2, Dhaka",
                unit_id=unit.id if unit else 1,
                unit_number=unit.unit_number if unit else "8B",
                floor_number=unit.floor_number if unit else 8,
                unit_type=unit.unit_type_id if unit else "TYPE_3BHK",
                facing=unit.facing_id if unit else "SOUTH_FACING",
                bed_count=unit.bed_count if unit else 3,
                bath_count=unit.bath_count if unit else 3,
                balcony_count=unit.balcony_count if unit else 2,
                gross_saleable_area_sqft=float(unit.gross_saleable_area_sqft if unit else 2150.0),
                net_carpet_area_sqft=float(unit.net_carpet_area_sqft if unit else 1850.0),
                parking_bay_number=booking.parking_slot_number or "B1-P24",
                floor_plan_image_url=unit.floor_plan_image_url if unit else "/assets/images/parcels/floorplan-type-3bhk.svg",
                booking_status=booking.status,
                total_contract_value_bdt=round(float(contract_val), 2),
                total_paid_bdt=round(float(total_paid), 2),
                outstanding_dues_bdt=round(float(dues), 2),
                construction_progress_percentage=68.50
            )

        # 2. Fetch Construction Updates
        updates = await CustomerPortalService.get_construction_updates(db, project_id)

        # 3. Fetch Payment Ledger
        payment_ledger = []
        if booking:
            payment_ledger = await CustomerPortalService.get_payment_ledger(db, booking.id)

        # 4. Fetch Upcoming Installments Timeline
        upcoming_installments = []
        if booking:
            upcoming_installments = await CustomerPortalService.get_installment_timeline(db, booking.id)

        # 5. Fetch Active Service Tickets
        active_tickets = await CustomerPortalService.get_customer_tickets(db, customer.id)

        return CustomerPortalOverviewResponse(
            customer_id=customer.id,
            customer_name=customer.full_name_en,
            customer_code=customer.customer_code,
            primary_phone=customer.primary_phone,
            email=customer.email,
            unit_summary=unit_summary,
            construction_updates=updates,
            payment_ledger=payment_ledger,
            upcoming_installments=upcoming_installments,
            active_tickets=active_tickets
        )

    @staticmethod
    async def get_construction_updates(
        db: AsyncSession,
        project_id: Optional[int] = None
    ) -> List[ConstructionUpdateResponse]:
        query = select(ConstructionProgressUpdate).where(ConstructionProgressUpdate.status == "PUBLISHED")
        if project_id:
            query = query.where(ConstructionProgressUpdate.project_id == project_id)
        
        res = await db.execute(query.order_by(desc(ConstructionProgressUpdate.update_date)))
        records = res.scalars().all()

        results = []
        for r in records:
            p_res = await db.execute(select(Project).where(Project.id == r.project_id))
            proj = p_res.scalar_one_or_none()

            raw_photos = r.photos_json or []
            photo_items = [
                PhotoItem(
                    url=p.get("url", ""),
                    caption=p.get("caption", ""),
                    uploaded_at=p.get("uploaded_at")
                )
                for p in raw_photos
            ]

            results.append(
                ConstructionUpdateResponse(
                    id=r.id,
                    project_id=r.project_id,
                    project_name=proj.project_name if proj else None,
                    tower_id=r.tower_id,
                    update_title=r.update_title,
                    update_date=r.update_date,
                    week_number=r.week_number,
                    completion_percentage=float(r.completion_percentage or 0),
                    milestone_phase=r.milestone_phase,
                    engineer_notes=r.engineer_notes,
                    photos=photo_items,
                    status=r.status,
                    created_at=r.created_at
                )
            )
        return results

    @staticmethod
    async def create_construction_update(
        db: AsyncSession,
        payload: ConstructionUpdateCreate,
        engineer_id: Optional[int] = None
    ) -> ConstructionUpdateResponse:
        photos_payload = [p.model_dump() for p in payload.photos]
        update_obj = ConstructionProgressUpdate(
            project_id=payload.project_id,
            tower_id=payload.tower_id,
            update_title=payload.update_title,
            update_date=payload.update_date or date.today(),
            week_number=payload.week_number,
            completion_percentage=Decimal(str(payload.completion_percentage)),
            milestone_phase=payload.milestone_phase,
            engineer_notes=payload.engineer_notes,
            photos_json=photos_payload,
            posted_by_engineer_id=engineer_id,
            status="PUBLISHED"
        )
        db.add(update_obj)
        await db.commit()
        await db.refresh(update_obj)

        p_res = await db.execute(select(Project).where(Project.id == update_obj.project_id))
        proj = p_res.scalar_one_or_none()

        return ConstructionUpdateResponse(
            id=update_obj.id,
            project_id=update_obj.project_id,
            project_name=proj.project_name if proj else None,
            tower_id=update_obj.tower_id,
            update_title=update_obj.update_title,
            update_date=update_obj.update_date,
            week_number=update_obj.week_number,
            completion_percentage=float(update_obj.completion_percentage),
            milestone_phase=update_obj.milestone_phase,
            engineer_notes=update_obj.engineer_notes,
            photos=payload.photos,
            status=update_obj.status,
            created_at=update_obj.created_at
        )

    @staticmethod
    async def get_payment_ledger(
        db: AsyncSession,
        booking_id: int
    ) -> List[CustomerPaymentLedgerItem]:
        res = await db.execute(
            select(MoneyReceipt)
            .where(MoneyReceipt.booking_id == booking_id)
            .order_by(desc(MoneyReceipt.receipt_date))
        )
        receipts = res.scalars().all()

        return [
            CustomerPaymentLedgerItem(
                receipt_id=r.id,
                mr_number=r.mr_number,
                receipt_date=r.receipt_date,
                amount_bdt=float(r.amount_received or 0),
                payment_mode=r.payment_mode,
                instrument_no=r.instrument_no,
                bank_name=r.bank_name,
                status=r.status,
                qr_token=r.qr_verification_token or "VERIFIED",
                late_fee_adjusted=float(r.late_fee_adjusted or 0),
                principal_adjusted=float(r.installment_principal_adjusted or 0)
            )
            for r in receipts
        ]

    @staticmethod
    async def get_installment_timeline(
        db: AsyncSession,
        booking_id: int
    ) -> List[CustomerInstallmentTimelineItem]:
        res = await db.execute(
            select(CustomerInstallment)
            .where(CustomerInstallment.booking_id == booking_id)
            .order_by(CustomerInstallment.due_date)
        )
        installments = res.scalars().all()

        today = date.today()
        first_unpaid_marked = False
        items = []

        for inst in installments:
            payable = Decimal(str(inst.payable_amount or 0))
            paid = Decimal(str(inst.paid_amount or 0))
            late = Decimal(str(inst.late_fee_accrued or 0))
            outstanding = max(Decimal("0.00"), payable + late - paid)

            is_cur = False
            if not first_unpaid_marked and inst.status in ["DUE", "UPCOMING", "OVERDUE"] and outstanding > 0:
                is_cur = True
                first_unpaid_marked = True

            items.append(
                CustomerInstallmentTimelineItem(
                    installment_id=inst.id,
                    installment_no=inst.installment_no,
                    title=inst.title,
                    due_date=inst.due_date,
                    payable_amount=float(payable),
                    paid_amount=float(paid),
                    late_fee_accrued=float(late),
                    outstanding_amount=float(outstanding),
                    status=inst.status,
                    milestone_trigger=inst.milestone_trigger,
                    is_current=is_cur
                )
            )
        return items

    @staticmethod
    async def create_service_ticket(
        db: AsyncSession,
        payload: CustomerServiceTicketCreate,
        customer_id: int
    ) -> CustomerServiceTicketResponse:
        b_res = await db.execute(select(Booking).where(Booking.id == payload.booking_id))
        booking = b_res.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")

        tkt_number = f"TKT-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"

        ticket = CustomerServiceTicket(
            ticket_number=tkt_number,
            customer_id=customer_id,
            booking_id=payload.booking_id,
            unit_id=booking.unit_id,
            category=payload.category,
            title=payload.title,
            description=payload.description,
            location_in_unit=payload.location_in_unit,
            urgency=payload.urgency,
            attachment_photo_url=payload.attachment_photo_url,
            status="SUBMITTED"
        )
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)

        u_res = await db.execute(select(Unit).where(Unit.id == ticket.unit_id))
        unit = u_res.scalar_one_or_none()

        c_res = await db.execute(select(Customer).where(Customer.id == ticket.customer_id))
        cust = c_res.scalar_one_or_none()

        return CustomerServiceTicketResponse(
            id=ticket.id,
            ticket_number=ticket.ticket_number,
            customer_id=ticket.customer_id,
            customer_name=cust.full_name_en if cust else None,
            booking_id=ticket.booking_id,
            unit_id=ticket.unit_id,
            unit_number=unit.unit_number if unit else None,
            category=ticket.category,
            title=ticket.title,
            description=ticket.description,
            location_in_unit=ticket.location_in_unit,
            urgency=ticket.urgency,
            attachment_photo_url=ticket.attachment_photo_url,
            status=ticket.status,
            resolution_notes=ticket.resolution_notes,
            resolved_at=ticket.resolved_at,
            created_at=ticket.created_at
        )

    @staticmethod
    async def get_customer_tickets(
        db: AsyncSession,
        customer_id: int
    ) -> List[CustomerServiceTicketResponse]:
        res = await db.execute(
            select(CustomerServiceTicket)
            .where(CustomerServiceTicket.customer_id == customer_id)
            .order_by(desc(CustomerServiceTicket.created_at))
        )
        tickets = res.scalars().all()

        results = []
        for t in tickets:
            u_res = await db.execute(select(Unit).where(Unit.id == t.unit_id))
            unit = u_res.scalar_one_or_none()

            results.append(
                CustomerServiceTicketResponse(
                    id=t.id,
                    ticket_number=t.ticket_number,
                    customer_id=t.customer_id,
                    booking_id=t.booking_id,
                    unit_id=t.unit_id,
                    unit_number=unit.unit_number if unit else None,
                    category=t.category,
                    title=t.title,
                    description=t.description,
                    location_in_unit=t.location_in_unit,
                    urgency=t.urgency,
                    attachment_photo_url=t.attachment_photo_url,
                    status=t.status,
                    assigned_engineer_id=t.assigned_engineer_id,
                    resolution_notes=t.resolution_notes,
                    resolved_at=t.resolved_at,
                    created_at=t.created_at
                )
            )
        return results

    @staticmethod
    async def update_service_ticket(
        db: AsyncSession,
        ticket_id: int,
        payload: CustomerServiceTicketUpdate
    ) -> CustomerServiceTicketResponse:
        res = await db.execute(select(CustomerServiceTicket).where(CustomerServiceTicket.id == ticket_id))
        ticket = res.scalar_one_or_none()
        if not ticket:
            raise HTTPException(status_code=404, detail="Service ticket not found.")

        if payload.status:
            ticket.status = payload.status
            if payload.status in ["RESOLVED", "CLOSED"]:
                ticket.resolved_at = datetime.now()
        if payload.resolution_notes is not None:
            ticket.resolution_notes = payload.resolution_notes
        if payload.assigned_engineer_id:
            ticket.assigned_engineer_id = payload.assigned_engineer_id

        await db.commit()
        await db.refresh(ticket)

        u_res = await db.execute(select(Unit).where(Unit.id == ticket.unit_id))
        unit = u_res.scalar_one_or_none()

        return CustomerServiceTicketResponse(
            id=ticket.id,
            ticket_number=ticket.ticket_number,
            customer_id=ticket.customer_id,
            booking_id=ticket.booking_id,
            unit_id=ticket.unit_id,
            unit_number=unit.unit_number if unit else None,
            category=ticket.category,
            title=ticket.title,
            description=ticket.description,
            location_in_unit=ticket.location_in_unit,
            urgency=ticket.urgency,
            attachment_photo_url=ticket.attachment_photo_url,
            status=ticket.status,
            assigned_engineer_id=ticket.assigned_engineer_id,
            resolution_notes=ticket.resolution_notes,
            resolved_at=ticket.resolved_at,
            created_at=ticket.created_at
        )

    @staticmethod
    async def initiate_online_payment(
        db: AsyncSession,
        payload: OnlinePaymentCheckoutRequest,
        customer_id: int
    ) -> OnlinePaymentCheckoutResponse:
        i_res = await db.execute(
            select(CustomerInstallment).where(CustomerInstallment.id == payload.installment_id)
        )
        installment = i_res.scalar_one_or_none()
        if not installment:
            raise HTTPException(status_code=404, detail="Installment milestone not found.")

        payable = Decimal(str(installment.payable_amount or 0))
        paid = Decimal(str(installment.paid_amount or 0))
        late = Decimal(str(installment.late_fee_accrued or 0))
        due_amount = max(Decimal("1000.00"), payable + late - paid)

        # 1.5% gateway surcharge simulation
        gateway_fee = (due_amount * Decimal("0.015")).quantize(Decimal("0.01"))
        txn_ref = f"TXN-{payload.payment_gateway}-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        payment_intent = OnlinePaymentIntent(
            transaction_reference=txn_ref,
            booking_id=payload.booking_id,
            installment_id=payload.installment_id,
            customer_id=customer_id,
            payment_gateway=payload.payment_gateway,
            amount_bdt=due_amount,
            gateway_fee_bdt=gateway_fee,
            payer_mobile=payload.payer_mobile,
            gateway_status="INITIATED"
        )
        db.add(payment_intent)
        await db.commit()

        gateway_url = f"https://checkout.sandbox.{payload.payment_gateway.lower()}.com/v2/payment/{txn_ref}"

        return OnlinePaymentCheckoutResponse(
            transaction_reference=txn_ref,
            gateway_url=gateway_url,
            amount_bdt=float(due_amount),
            gateway_fee_bdt=float(gateway_fee),
            payment_gateway=payload.payment_gateway,
            gateway_status="INITIATED"
        )

    @staticmethod
    async def verify_online_payment(
        db: AsyncSession,
        payload: OnlinePaymentVerificationRequest
    ) -> OnlinePaymentVerificationResponse:
        p_res = await db.execute(
            select(OnlinePaymentIntent).where(
                OnlinePaymentIntent.transaction_reference == payload.transaction_reference
            )
        )
        intent = p_res.scalar_one_or_none()
        if not intent:
            raise HTTPException(status_code=404, detail="Payment transaction reference not found.")

        if not payload.simulated_success:
            intent.gateway_status = "FAILED"
            await db.commit()
            return OnlinePaymentVerificationResponse(
                transaction_reference=intent.transaction_reference,
                gateway_status="FAILED",
                message="Payment gateway declined transaction."
            )

        # Success flow:
        intent.gateway_status = "SUCCESS"
        intent.gateway_transaction_id = payload.gateway_transaction_id

        # 1. Update Installment
        i_res = await db.execute(
            select(CustomerInstallment).where(CustomerInstallment.id == intent.installment_id)
        )
        installment = i_res.scalar_one_or_none()
        if installment:
            installment.paid_amount = (Decimal(str(installment.paid_amount or 0)) + intent.amount_bdt)
            if installment.paid_amount >= installment.payable_amount:
                installment.status = "PAID"
            else:
                installment.status = "DUE"

        # 2. Issue Official Money Receipt
        mr_num = f"MR-PORTAL-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"
        qr_token = f"QR-MR-{uuid.uuid4().hex}"

        receipt = MoneyReceipt(
            mr_number=mr_num,
            receipt_date=date.today(),
            booking_id=intent.booking_id,
            customer_id=intent.customer_id,
            payment_mode=intent.payment_gateway,
            instrument_no=payload.gateway_transaction_id,
            bank_name=f"Online Gateway ({intent.payment_gateway})",
            amount_received=intent.amount_bdt,
            installment_principal_adjusted=intent.amount_bdt,
            late_fee_adjusted=Decimal("0.00"),
            qr_verification_token=qr_token,
            status="CLEARED",
            remarks=f"Customer Portal checkout via {intent.payment_gateway}. Ref: {intent.transaction_reference}"
        )
        db.add(receipt)
        await db.flush()

        intent.generated_money_receipt_id = receipt.id

        # Allocation
        alloc = MoneyReceiptAllocation(
            receipt_id=receipt.id,
            installment_id=intent.installment_id,
            allocated_late_fee=Decimal("0.00"),
            allocated_principal=intent.amount_bdt,
            total_allocated=intent.amount_bdt
        )
        db.add(alloc)

        await db.commit()

        return OnlinePaymentVerificationResponse(
            transaction_reference=intent.transaction_reference,
            gateway_status="SUCCESS",
            generated_mr_number=receipt.mr_number,
            amount_paid_bdt=float(intent.amount_bdt),
            message="Online payment verified successfully. Official Money Receipt generated."
        )

    @staticmethod
    async def generate_receipt_pdf_bytes(db: AsyncSession, receipt_id: int) -> bytes:
        r_res = await db.execute(select(MoneyReceipt).where(MoneyReceipt.id == receipt_id))
        receipt = r_res.scalar_one_or_none()
        if not receipt:
            raise HTTPException(status_code=404, detail="Money receipt not found.")

        # Join customer, booking, project, unit
        c_res = await db.execute(select(Customer).where(Customer.id == receipt.customer_id))
        cust = c_res.scalar_one_or_none()

        b_res = await db.execute(select(Booking).where(Booking.id == receipt.booking_id))
        booking = b_res.scalar_one_or_none()

        project_name = "Blue Oceans Premium Towers"
        unit_number = "Unit 8B"
        parking_slot = "B1-P24"
        contract_val = Decimal("15000000.00")

        if booking:
            contract_val = Decimal(str(booking.final_contract_value or 0))
            parking_slot = booking.parking_slot_number or "Allotted Bay"

            p_res = await db.execute(select(Project).where(Project.id == booking.project_id))
            proj = p_res.scalar_one_or_none()
            if proj:
                project_name = proj.project_name

            u_res = await db.execute(select(Unit).where(Unit.id == booking.unit_id))
            unit = u_res.scalar_one_or_none()
            if unit:
                unit_number = unit.unit_number

        # Calculate outstanding
        all_mr_res = await db.execute(
            select(MoneyReceipt).where(MoneyReceipt.booking_id == receipt.booking_id)
        )
        all_receipts = all_mr_res.scalars().all()
        total_paid = sum(Decimal(str(r.amount_received or 0)) for r in all_receipts)
        outstanding = max(Decimal("0.00"), contract_val - total_paid)

        return MoneyReceiptPDFGenerator.generate_receipt_pdf(
            mr_number=receipt.mr_number,
            receipt_date=str(receipt.receipt_date),
            customer_name=cust.full_name_en if cust else "Flat Owner",
            customer_code=cust.customer_code if cust else "CUST-001",
            customer_phone=cust.primary_phone if cust else "+8801700000000",
            project_name=project_name,
            unit_number=unit_number,
            parking_slot=parking_slot,
            amount_received=float(receipt.amount_received or 0),
            payment_mode=receipt.payment_mode,
            instrument_no=receipt.instrument_no or "N/A",
            bank_name=receipt.bank_name or "Official Bank Account",
            late_fee_adjusted=float(receipt.late_fee_adjusted or 0),
            principal_adjusted=float(receipt.installment_principal_adjusted or 0),
            outstanding_balance=float(outstanding),
            qr_token=receipt.qr_verification_token or "VERIFIED-SEAL"
        )
