import pytest
import os
import sys
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from tests.conftest import TestSessionLocal
from app.modules.inventory.models import Unit
from app.modules.sales.models import Booking
from app.modules.auth.models import User
from app.modules.handover.models import HandoverInspection, SnagItem, DLPTicket, LeaseAgreement, CAMBill, UtilitySubMeterReading


@pytest.mark.asyncio
async def test_handover_metrics_and_snag_item_workflow():
    """
    Test Handover KPIs and Pre-Handover Digital Snag List:
    Logging snag defect -> Contractor assignment -> Rectification -> Site Engineer Verification & Customer sign-off.
    """
    async with TestSessionLocal() as session:
        unit_res = await session.execute(select(Unit).limit(1))
        unit = unit_res.scalar_one_or_none()
        assert unit is not None

        user_res = await session.execute(select(User).limit(1))
        user = user_res.scalar_one_or_none()
        assert user is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Fetch dashboard metrics
        metrics_resp = await ac.get("/api/v1/handover/metrics")
        assert metrics_resp.status_code == 200
        metrics = metrics_resp.json()
        assert "total_inspections_count" in metrics
        assert "open_snags_count" in metrics

        # 2. Create a digital snag defect
        snag_payload = {
            "unit_id": unit.id,
            "category": "Plumbing",
            "location": "Master Bed Ensuite",
            "defect_description": "Water pressure drop in shower mixer valve.",
            "photo_attachment_url": "assets/images/common/snag_test.jpg",
            "severity": "HIGH",
            "contractor_name": "Grohe Sanitary Fitters"
        }
        create_resp = await ac.post("/api/v1/handover/snags", json=snag_payload)
        assert create_resp.status_code == 201
        snag = create_resp.json()
        snag_id = snag["id"]
        assert snag["snag_code"].startswith("SNG-")
        assert snag["status"] == "ASSIGNED"

        # 3. Update snag to FIXED and VERIFIED_CLOSED
        update_resp = await ac.patch(f"/api/v1/handover/snags/{snag_id}", json={
            "status": "VERIFIED_CLOSED",
            "fix_date": str(date.today()),
            "verified_by_engineer_id": user.id,
            "verification_notes": "Mixer valve core replaced and pressure tested to 3.5 bar.",
            "customer_accepted": True
        })
        assert update_resp.status_code == 200
        updated_snag = update_resp.json()
        assert updated_snag["status"] == "VERIFIED_CLOSED"
        assert updated_snag["customer_accepted"] is True


@pytest.mark.asyncio
async def test_handover_possession_and_key_certificate_generation():
    """
    Test Key Handover & Possession Letter generation with 100% financial clearance check
    and automated 12-Month Defect Liability Period (DLP) warranty calculation (+365 days).
    """
    async with TestSessionLocal() as session:
        booking_res = await session.execute(select(Booking).limit(1))
        booking = booking_res.scalar_one_or_none()
        assert booking is not None

        unit_res = await session.execute(select(Unit).where(Unit.id == booking.unit_id))
        unit = unit_res.scalar_one_or_none()
        assert unit is not None

        user_res = await session.execute(select(User).limit(1))
        user = user_res.scalar_one_or_none()
        assert user is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create Handover Inspection
        insp_resp = await ac.post("/api/v1/handover/inspections", json={
            "booking_id": booking.id,
            "unit_id": unit.id,
            "site_engineer_id": user.id,
            "inspection_date": str(date.today()),
            "all_financial_dues_cleared": True,
            "key_sets_count": 3,
            "notes": "Pre-handover joint inspection completed. Financial clearance verified by accounts."
        })
        assert insp_resp.status_code == 201
        insp = insp_resp.json()
        insp_id = insp["id"]

        # 2. Execute Key Handover
        handover_date = str(date.today())
        exec_resp = await ac.patch(f"/api/v1/handover/inspections/{insp_id}/handover", json={
            "possession_handover_date": handover_date,
            "key_sets_count": 3,
            "joint_customer_signoff": True,
            "notes": "3 sets of brass keys, sub-meter keys, and warranty kit handed over."
        })
        assert exec_resp.status_code == 200
        executed = exec_resp.json()
        assert executed["status"] == "POSSESSION_HANDED_OVER"
        assert executed["possession_letter_number"].startswith("POSS-")
        assert executed["key_handover_certificate_number"].startswith("KEY-")
        assert executed["joint_customer_signoff"] is True
        assert executed["warranty_start_date"] == handover_date
        assert executed["warranty_end_date"] is not None

        # 3. Test PDF generation endpoint
        pdf_resp = await ac.get(f"/api/v1/handover/inspections/{insp_id}/possession-letter")
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert len(pdf_resp.content) > 100


@pytest.mark.asyncio
async def test_dlp_12_month_warranty_and_sla_timers():
    """
    Test Defect Liability Period (DLP) Warranty tickets with SLA timers (24h/48h/72h)
    and warranty validity checks.
    """
    async with TestSessionLocal() as session:
        unit_res = await session.execute(select(Unit).limit(1))
        unit = unit_res.scalar_one_or_none()
        assert unit is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Raise a critical electrical defect ticket
        ticket_resp = await ac.post("/api/v1/handover/dlp-tickets", json={
            "unit_id": unit.id,
            "ticket_category": "Electrical",
            "defect_severity": "CRITICAL",
            "issue_description": "Main circuit breaker trip in DB board affecting refrigerator outlet.",
            "assigned_technician": "Engr. Al-Amin",
            "sla_hours": 24,
            "borne_by": "DEVELOPER_WARRANTY"
        })
        assert ticket_resp.status_code == 201
        ticket = ticket_resp.json()
        ticket_id = ticket["id"]
        assert ticket["ticket_code"].startswith("DLP-")
        assert ticket["defect_severity"] == "CRITICAL"
        assert ticket["sla_hours"] == 24
        assert ticket["is_under_warranty"] is True

        # 2. Update status to RESOLVED
        update_resp = await ac.patch(f"/api/v1/handover/dlp-tickets/{ticket_id}/status", json={
            "status": "RESOLVED",
            "rectification_notes": "Replaced faulty 32A MCB with Schneider breaker. Problem resolved.",
            "rectified_date": str(date.today()),
            "resolution_cost_bdt": 1250.00
        })
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["status"] == "RESOLVED"
        assert updated["sla_breach_status"] == "RESOLVED_ON_TIME"


@pytest.mark.asyncio
async def test_commercial_space_lease_cam_billing_and_submeter_reading():
    """
    Test Commercial Rental/Leasing Engine:
    Tenant profile -> Lease terms -> Monthly CAM bill generation & payment -> Utility sub-meter consumption.
    """
    async with TestSessionLocal() as session:
        unit_res = await session.execute(select(Unit).limit(1))
        unit = unit_res.scalar_one_or_none()
        assert unit is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register Commercial Space Lease
        lease_payload = {
            "unit_id": unit.id,
            "tenant_name": "Kazi Fahim Ahmed",
            "tenant_company_name": "Apex Footwear Flagship Store",
            "trade_license_number": "TRAD-DSCC-889922",
            "tin_bin_number": "BIN-99221144-0101",
            "tenant_nid": "19902691234567890",
            "tenant_phone": "+8801711223344",
            "tenant_email": "apex.gulshan@apex.com.bd",
            "emergency_contact_phone": "+8801811223344",
            "commercial_space_type": "RETAIL_SHOP",
            "floor_area_sqft": 1200.00,
            "rent_per_sqft_bdt": 110.00,
            "monthly_rent_bdt": 132000.00,
            "cam_rate_per_sqft_bdt": 16.00,
            "fitout_grace_period_days": 30,
            "lease_start_date": str(date.today()),
            "lease_expiry_date": str(date.today() + timedelta(days=365 * 2)),
            "security_deposit_bdt": 396000.00,
            "security_deposit_status": "RECEIVED",
            "rent_escalation_percent": 10.00,
            "escalation_frequency_months": 12,
            "remarks": "Ground floor prime corner retail showroom."
        }
        lease_resp = await ac.post("/api/v1/handover/leases", json=lease_payload)
        assert lease_resp.status_code == 201
        lease = lease_resp.json()
        lease_id = lease["id"]
        assert lease["lease_reference_no"].startswith("LSE-")
        assert lease["security_deposit_status"] == "RECEIVED"

        # 2. Generate Monthly CAM Service Charge Bill
        cam_payload = {
            "lease_id": lease_id,
            "bill_month": "2026-11",
            "sinking_fund_charge": 2000.00,
            "generator_backup_charge": 3500.00,
            "common_electricity_water": 2800.00,
            "remarks": "November 2026 CAM service charge invoice."
        }
        cam_resp = await ac.post("/api/v1/handover/cam-bills", json=cam_payload)
        assert cam_resp.status_code == 201
        cam_bill = cam_resp.json()
        bill_id = cam_bill["id"]
        assert cam_bill["bill_number"].startswith("CAM-")
        assert cam_bill["payment_status"] == "UNPAID"
        assert cam_bill["total_bill_amount"] > 0

        # 3. Pay CAM Bill
        pay_resp = await ac.post(f"/api/v1/handover/cam-bills/{bill_id}/pay", json={
            "paid_amount": cam_bill["total_bill_amount"],
            "paid_date": str(date.today()),
            "payment_mode": "BANK_TRANSFER",
            "instrument_no": "TXN-EBL-8829910",
            "remarks": "Full payment received via corporate bank transfer."
        })
        assert pay_resp.status_code == 200
        paid_bill = pay_resp.json()
        assert paid_bill["payment_status"] == "PAID"

        # 4. Record Utility Sub-Meter Reading
        submeter_payload = {
            "lease_id": lease_id,
            "meter_number": "DESCO-COMM-9921",
            "meter_type": "ELECTRICITY",
            "previous_reading": 1000.00,
            "current_reading": 1650.00,
            "tariff_rate_per_unit": 14.50,
            "vat_rate_percent": 5.00,
            "remarks": "Retail outlet sub-meter reading for November 2026."
        }
        meter_resp = await ac.post("/api/v1/handover/utility-readings", json=submeter_payload)
        assert meter_resp.status_code == 201
        reading = meter_resp.json()
        assert reading["units_consumed"] == 650.00
        assert reading["subtotal_amount"] == round(650.00 * 14.50, 2)
        assert reading["total_utility_amount"] > reading["subtotal_amount"]
        assert reading["billing_status"] == "BILLED"
