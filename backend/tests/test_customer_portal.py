import pytest
import uuid
from datetime import date
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app


@pytest.mark.asyncio
async def test_customer_portal_overview_endpoint():
    """
    Test GET /api/v1/portal/overview
    Verifies full dashboard with apartment specs, parking bay, construction gallery, ledger, installments, and tickets.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/portal/overview")
        assert res.status_code == 200
        data = res.json()

        assert "customer_id" in data
        assert "customer_name" in data
        assert "customer_code" in data
        assert "primary_phone" in data

        # Unit Summary & Specs
        if data["unit_summary"]:
            u = data["unit_summary"]
            assert "booking_id" in u
            assert "project_name" in u
            assert "unit_number" in u
            assert "bed_count" in u
            assert "bath_count" in u
            assert "balcony_count" in u
            assert "gross_saleable_area_sqft" in u
            assert "net_carpet_area_sqft" in u
            assert "parking_bay_number" in u
            assert "total_contract_value_bdt" in u
            assert "total_paid_bdt" in u
            assert "outstanding_dues_bdt" in u
            assert u["total_contract_value_bdt"] >= 0

        # Construction Gallery Updates
        assert "construction_updates" in data
        assert isinstance(data["construction_updates"], list)
        if len(data["construction_updates"]) > 0:
            up = data["construction_updates"][0]
            assert "update_title" in up
            assert "completion_percentage" in up
            assert "milestone_phase" in up
            assert "photos" in up

        # Financial Ledger & Installments
        assert "payment_ledger" in data
        assert isinstance(data["payment_ledger"], list)

        assert "upcoming_installments" in data
        assert isinstance(data["upcoming_installments"], list)

        # Service Tickets
        assert "active_tickets" in data
        assert isinstance(data["active_tickets"], list)


@pytest.mark.asyncio
async def test_construction_updates_and_gallery_creation():
    """
    Test GET /api/v1/portal/updates and POST /api/v1/portal/updates
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Fetch updates
        res = await ac.get("/api/v1/portal/updates")
        assert res.status_code == 200
        updates = res.json()
        assert isinstance(updates, list)

        # 2. Site Engineer posts weekly progress update with photo attachments
        new_payload = {
            "project_id": 1,
            "update_title": f"14th Floor Column Reinforcement Inspection #{uuid.uuid4().hex[:4]}",
            "update_date": str(date.today()),
            "week_number": 43,
            "completion_percentage": 72.40,
            "milestone_phase": "SUPER_STRUCTURE",
            "engineer_notes": "Main structural column rebar diameter verified against structural drawings. Shuttering work in progress.",
            "photos": [
                {
                    "url": "https://images.unsplash.com/photo-1541888946425-d0fbb18615f3",
                    "caption": "Column vertical rebar lap splice inspection",
                    "uploaded_at": str(date.today())
                }
            ]
        }
        create_res = await ac.post("/api/v1/portal/updates", json=new_payload)
        assert create_res.status_code == 201
        created = create_res.json()
        assert created["update_title"] == new_payload["update_title"]
        assert created["completion_percentage"] == 72.40
        assert len(created["photos"]) == 1
        assert created["status"] == "PUBLISHED"


@pytest.mark.asyncio
async def test_customer_service_snag_ticket_lifecycle():
    """
    Test POST /api/v1/portal/tickets, GET /api/v1/portal/tickets, and PATCH /api/v1/portal/tickets/{id}
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        overview_res = await ac.get("/api/v1/portal/overview")
        assert overview_res.status_code == 200
        overview = overview_res.json()
        booking_id = overview["unit_summary"]["booking_id"] if overview.get("unit_summary") else 1
        customer_id = overview["customer_id"]

        # 1. Flat owner logs maintenance/snag defect ticket
        ticket_payload = {
            "booking_id": booking_id,
            "category": "ELECTRICAL_FIXTURES",
            "title": "Kitchen Island Power Outlet Tripping Circuit Breaker",
            "description": "GFCI circuit breaker trips whenever micro-oven is powered on kitchen island counter.",
            "location_in_unit": "Kitchen Island",
            "urgency": "URGENT",
            "attachment_photo_url": "https://images.unsplash.com/photo-1581094794329-c8112a89af12"
        }
        res_post = await ac.post(f"/api/v1/portal/tickets?customer_id={customer_id}", json=ticket_payload)
        assert res_post.status_code == 201
        ticket = res_post.json()
        assert ticket["ticket_number"].startswith("TKT-")
        assert ticket["category"] == "ELECTRICAL_FIXTURES"
        assert ticket["status"] == "SUBMITTED"
        ticket_id = ticket["id"]

        # 2. Get customer tickets
        res_get = await ac.get(f"/api/v1/portal/tickets?customer_id={customer_id}")
        assert res_get.status_code == 200
        tickets = res_get.json()
        assert any(t["id"] == ticket_id for t in tickets)

        # 3. Engineer acknowledges and resolves ticket
        patch_payload = {
            "status": "WORK_IN_PROGRESS",
            "resolution_notes": "Electrician dispatched. Re-terminated neutral terminal wire inside junction box."
        }
        res_patch = await ac.patch(f"/api/v1/portal/tickets/{ticket_id}", json=patch_payload)
        assert res_patch.status_code == 200
        updated = res_patch.json()
        assert updated["status"] == "WORK_IN_PROGRESS"
        assert updated["resolution_notes"] == patch_payload["resolution_notes"]


@pytest.mark.asyncio
async def test_online_payment_checkout_and_receipt_issuance():
    """
    Test POST /api/v1/portal/payments/checkout and POST /api/v1/portal/payments/verify
    Verifies installment payment settlement and statutory Money Receipt creation.
    """
    from tests.conftest import TestSessionLocal
    from app.modules.installments.models import CustomerInstallment
    from decimal import Decimal

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        overview_res = await ac.get("/api/v1/portal/overview")
        assert overview_res.status_code == 200
        overview = overview_res.json()
        booking_id = overview["unit_summary"]["booking_id"] if overview.get("unit_summary") else 1
        customer_id = overview["customer_id"]

        # Ensure an installment exists for test booking
        async with TestSessionLocal() as session:
            inst_check = await session.execute(
                select(CustomerInstallment).where(CustomerInstallment.booking_id == booking_id)
            )
            existing_inst = inst_check.scalar_one_or_none()
            if not existing_inst:
                new_inst = CustomerInstallment(
                    booking_id=booking_id,
                    installment_no=1,
                    title="1st Floor Roof Casting Milestone",
                    due_date=date.today(),
                    payable_amount=Decimal("500000.00"),
                    paid_amount=Decimal("0.00"),
                    status="DUE"
                )
                session.add(new_inst)
                await session.commit()
                await session.refresh(new_inst)
                installment_id = new_inst.id
            else:
                installment_id = existing_inst.id

        # 1. Initiate checkout session
        checkout_payload = {
            "booking_id": booking_id,
            "installment_id": installment_id,
            "payment_gateway": "BKASH",
            "payer_mobile": "+8801712345678"
        }
        chk_res = await ac.post(f"/api/v1/portal/payments/checkout?customer_id={customer_id}", json=checkout_payload)
        assert chk_res.status_code == 200
        checkout_data = chk_res.json()
        txn_ref = checkout_data["transaction_reference"]
        assert txn_ref.startswith("TXN-BKASH-")
        assert "gateway_url" in checkout_data
        assert checkout_data["gateway_status"] == "INITIATED"

        # 2. Verify payment callback from gateway
        verify_payload = {
            "transaction_reference": txn_ref,
            "gateway_transaction_id": f"BKASH-TRX-{uuid.uuid4().hex[:8].upper()}",
            "simulated_success": True
        }
        ver_res = await ac.post("/api/v1/portal/payments/verify", json=verify_payload)
        assert ver_res.status_code == 200
        ver_data = ver_res.json()
        assert ver_data["gateway_status"] == "SUCCESS"
        assert ver_data["generated_mr_number"] is not None
        assert ver_data["generated_mr_number"].startswith("MR-PORTAL-")


@pytest.mark.asyncio
async def test_download_money_receipt_pdf():
    """
    Test GET /api/v1/portal/receipts/{receipt_id}/pdf
    Verifies generated ReportLab statutory Money Receipt PDF stream.
    """
    from tests.conftest import TestSessionLocal
    from app.modules.installments.models import MoneyReceipt
    from decimal import Decimal

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        overview_res = await ac.get("/api/v1/portal/overview")
        assert overview_res.status_code == 200
        overview = overview_res.json()
        booking_id = overview["unit_summary"]["booking_id"] if overview.get("unit_summary") else 1
        customer_id = overview["customer_id"]

        # Ensure at least one money receipt exists
        async with TestSessionLocal() as session:
            mr_check = await session.execute(
                select(MoneyReceipt).where(MoneyReceipt.booking_id == booking_id)
            )
            mr = mr_check.scalars().first()
            if not mr:
                mr = MoneyReceipt(
                    mr_number=f"MR-TEST-{uuid.uuid4().hex[:6].upper()}",
                    receipt_date=date.today(),
                    booking_id=booking_id,
                    customer_id=customer_id,
                    payment_mode="BKASH",
                    amount_received=Decimal("250000.00"),
                    installment_principal_adjusted=Decimal("250000.00"),
                    late_fee_adjusted=Decimal("0.00"),
                    qr_verification_token=f"QR-TEST-{uuid.uuid4().hex}",
                    status="CLEARED"
                )
                session.add(mr)
                await session.commit()
                await session.refresh(mr)
            receipt_id = mr.id

        pdf_res = await ac.get(f"/api/v1/portal/receipts/{receipt_id}/pdf")
        assert pdf_res.status_code == 200
        assert "application/pdf" in pdf_res.headers.get("content-type", "")
        assert pdf_res.content.startswith(b"%PDF")
        assert len(pdf_res.content) > 500
