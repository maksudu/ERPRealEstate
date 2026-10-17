import pytest
import uuid
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from tests.conftest import TestSessionLocal
from app.modules.projects.models import Project
from app.modules.inventory.models import Unit
from app.modules.crm.models import Customer
from app.modules.sales.models import Booking
from app.modules.installments.models import CustomerInstallment, MoneyReceipt, TripartiteLoan, LoanTranche

@pytest.mark.asyncio
async def test_money_receipt_waterfall_adjustment():
    """
    Tests Partial Payment Collection Waterfall Logic:
    1. First adjusts late fee / surcharge across overdue installments.
    2. Then adjusts oldest overdue installment principal.
    3. Any excess becomes advance credit.
    4. Auto-generates unique MR number, QR verification token, and dispatches SMS.
    """
    async with TestSessionLocal() as session:
        # Create dedicated test project, unit, customer, booking
        proj = (await session.execute(select(Project).order_by(Project.id.asc()))).scalars().first()
        assert proj is not None

        unit = (await session.execute(select(Unit).where(Unit.project_id == proj.id).order_by(Unit.id.asc()))).scalars().first()
        assert unit is not None

        cust = Customer(
            customer_code=f"CUST-{uuid.uuid4().hex[:6].upper()}",
            full_name_en="Alhajj M. R. Talukder",
            primary_phone="+8801755112233",
            email="talukder@test.com"
        )
        session.add(cust)
        await session.flush()

        booking = Booking(
            booking_reference_no=f"BK-TEST-{uuid.uuid4().hex[:6].upper()}",
            project_id=proj.id,
            unit_id=unit.id,
            primary_customer_id=cust.id,
            booking_date=date.today(),
            base_unit_price=8000000.0,
            parking_charge=350000.0,
            utility_charge=250000.0,
            documentation_charge=50000.0,
            discount_amount=0.0,
            discount_percentage=0.0,
            final_contract_value=8650000.0,
            earnest_money_received=500000.0,
            status="AGREEMENT_SIGNED"
        )
        session.add(booking)
        await session.flush()

        # Create 1 installment with late fee
        inst = CustomerInstallment(
            booking_id=booking.id,
            installment_no=1,
            title="Overdue Down Payment",
            due_date=date.today() - timedelta(days=35),
            grace_period_days=15,
            payable_amount=200000.00,
            paid_amount=0.00,
            late_fee_accrued=8000.00,
            status="OVERDUE"
        )
        session.add(inst)
        await session.commit()
        booking_id = booking.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Post payment of BDT 50,000
        # Waterfall expectation:
        # 1. 8,000 adjusts late fee accrued to 0
        # 2. Remaining 42,000 adjusts installment principal
        # 3. Excess advance = 0
        payload = {
            "booking_id": booking_id,
            "receipt_date": str(date.today()),
            "payment_mode": "BANK_TRANSFER",
            "instrument_no": "BEFTN-DHAKA-2026-991",
            "instrument_date": str(date.today()),
            "bank_name": "Standard Chartered Bank",
            "branch_name": "Gulshan 2",
            "amount_received": 50000.00,
            "remarks": "NPSB Online Collection Test",
            "send_sms_notification": True
        }

        res = await client.post("/api/v1/installments/money-receipts", json=payload)
        assert res.status_code == 201, f"Failed: {res.text}"
        mr = res.json()

        assert mr["mr_number"].startswith("MR-")
        assert mr["amount_received"] == 50000.00
        assert mr["payment_mode"] == "BANK_TRANSFER"
        assert mr["qr_verification_token"] is not None
        assert mr["late_fee_adjusted"] == 8000.00  # Late fee cleared first!
        assert mr["installment_principal_adjusted"] == 42000.00 # Remaining principal cleared
        assert mr["excess_advance_amount"] == 0.00
        assert mr["status"] == "CLEARED"
        assert len(mr["allocations"]) == 1
        assert mr["allocations"][0]["allocated_late_fee"] == 8000.00
        assert mr["allocations"][0]["allocated_principal"] == 42000.00

        # Verify QR Verification Endpoint
        v_res = await client.get(f"/api/v1/installments/money-receipts/{mr['id']}/verify")
        assert v_res.status_code == 200
        v_data = v_res.json()
        assert v_data["verified"] is True
        assert v_data["mr_number"] == mr["mr_number"]
        assert v_data["amount_received"] == 50000.00
        assert v_data["late_fee_adjusted"] == 8000.00
        assert v_data["principal_adjusted"] == 42000.00


@pytest.mark.asyncio
async def test_tripartite_bank_loan_lifecycle():
    """
    Tests Tripartite Home Loan End-to-End Workflow:
    1. Agreement Creation with DBH Finance & Milestone Tranches.
    2. Developer NOC Issuance.
    3. Bank Civil Engineer Inspection Verification.
    4. Tranche Disbursement triggering automatic Money Receipt creation and ledger reconciliation.
    """
    async with TestSessionLocal() as session:
        booking = (await session.execute(select(Booking).order_by(Booking.id.asc()))).scalars().first()
        assert booking is not None
        booking_id = booking.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create Tripartite Loan
        loan_payload = {
            "booking_id": booking_id,
            "financial_institution_code": "DBH_FINANCE",
            "bank_name": "DBH Finance PLC",
            "branch_name": "Principal Branch, Dhaka",
            "sanction_letter_no": f"SANCT-DBH-{uuid.uuid4().hex[:6].upper()}",
            "sanction_date": str(date.today() - timedelta(days=20)),
            "sanctioned_amount": 6000000.00,
            "tripartite_agreement_date": str(date.today() - timedelta(days=15)),
            "bank_officer_name": "Zahidul Karim",
            "bank_officer_phone": "+8801812345678",
            "bank_officer_email": "zahid.karim@dbhfinance.com",
            "remarks": "Home Loan Sanctioned 70% LTV",
            "tranches": [
                {
                    "tranche_number": 1,
                    "milestone_title": "Plinth & Foundation Casting (35%)",
                    "sanctioned_tranche_amount": 2100000.00,
                    "remarks": "Tranche 1 upon basement casting"
                },
                {
                    "tranche_number": 2,
                    "milestone_title": "Roof Casting 5th Floor (35%)",
                    "sanctioned_tranche_amount": 2100000.00,
                    "remarks": "Tranche 2 upon superstructure"
                },
                {
                    "tranche_number": 3,
                    "milestone_title": "Finishing & Handover (30%)",
                    "sanctioned_tranche_amount": 1800000.00,
                    "remarks": "Final tranche at possession"
                }
            ]
        }

        loan_res = await client.post("/api/v1/installments/tripartite-loans", json=loan_payload)
        assert loan_res.status_code == 201, f"Create loan failed: {loan_res.text}"
        loan = loan_res.json()

        assert loan["loan_reference_no"].startswith("TRP-")
        assert loan["sanctioned_amount"] == 6000000.00
        assert len(loan["tranches"]) == 3
        tranche_1 = loan["tranches"][0]

        # 2. Issue Developer NOC
        noc_payload = {
            "developer_noc_ref": f"NOC-DEV-{uuid.uuid4().hex[:6].upper()}",
            "developer_noc_date": str(date.today()),
            "remarks": "NOC granted endorsing mortgage charge to DBH Finance"
        }
        noc_res = await client.post(f"/api/v1/installments/tripartite-loans/{loan['id']}/noc", json=noc_payload)
        assert noc_res.status_code == 200
        updated_loan = noc_res.json()
        assert updated_loan["noc_status"] == "ISSUED"
        assert updated_loan["status"] == "NOC_ISSUED"

        # 3. Bank Civil Engineer Inspection Verification
        insp_payload = {
            "bank_inspection_date": str(date.today()),
            "inspection_status": "INSPECTION_PASSED",
            "inspection_engineer_name": "Engr. M. A. Rouf (DBH Emp #482)",
            "inspection_notes": "Foundation & Basement columns inspected; structural curing satisfactory."
        }
        insp_res = await client.put(
            f"/api/v1/installments/tripartite-loans/{loan['id']}/tranches/{tranche_1['id']}/inspection",
            json=insp_payload
        )
        assert insp_res.status_code == 200
        tranche_insp = insp_res.json()
        assert tranche_insp["inspection_status"] == "INSPECTION_PASSED"
        assert tranche_insp["status"] == "INSPECTION_DONE"

        # 4. Record Tranche Disbursement (Triggers auto Money Receipt)
        disb_payload = {
            "disbursed_date": str(date.today()),
            "disbursed_amount": 2100000.00,
            "payment_mode": "BANK_TRANSFER",
            "payment_instrument_no": "DBH-PO-994821",
            "bank_name": "DBH Finance PLC",
            "branch_name": "Principal Branch",
            "remarks": "Tranche 1 Pay Order received and reconciled"
        }
        disb_res = await client.post(
            f"/api/v1/installments/tripartite-loans/{loan['id']}/tranches/{tranche_1['id']}/disburse",
            json=disb_payload
        )
        assert disb_res.status_code == 200
        disbursed_tranche = disb_res.json()
        assert disbursed_tranche["status"] == "RECONCILED"
        assert disbursed_tranche["receipt_id"] is not None
        assert disbursed_tranche["mr_number"] is not None

        # 5. Verify Metrics Endpoint
        metrics_res = await client.get("/api/v1/installments/metrics")
        assert metrics_res.status_code == 200
        metrics = metrics_res.json()
        assert metrics["total_money_receipts_count"] > 0
        assert metrics["total_money_receipts_amount"] > 0
        assert metrics["total_tripartite_loans_count"] > 0
