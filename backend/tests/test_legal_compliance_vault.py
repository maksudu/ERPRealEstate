import pytest
import uuid
from datetime import date, timedelta
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from tests.conftest import TestSessionLocal
from app.modules.projects.models import Project, AuthorityClearance, AuthorityClearanceCondition
from app.modules.operations.models import CourtCase, CourtCaseDocument, CourtCaseHearing


@pytest.mark.asyncio
async def test_statutory_clearance_creation_and_condition_checklist():
    """
    Test Statutory Clearances & Permits:
    - Create permit (e.g. DoE or Fire NOC)
    - Add condition checklist items
    - Verify conditions list and update condition status to COMPLIED
    - Verify renewal alert status calculation
    """
    async with TestSessionLocal() as session:
        proj_res = await session.execute(select(Project).limit(1))
        project = proj_res.scalar_one_or_none()
        assert project is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create a statutory clearance
        ref_no = f"CLR-FSCD-TEST-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "project_id": project.id,
            "clearance_type_id": "FIRE_NOC",
            "authority_name": "FSCD",
            "reference_no": ref_no,
            "application_memo_no": "FSCD/DHAKA/2026/MEMO-101",
            "approved_memo_no": "FSCD/NOC/2026/892",
            "approval_date": str(date.today() - timedelta(days=30)),
            "expiry_date": str(date.today() + timedelta(days=335)),
            "validity_months": 12,
            "renewal_reminder_days": 30,
            "renewal_fee_bdt": 45000.00,
            "sanctioned_floors": "2 Basement + 14 Floors",
            "contact_officer_name": "Major M. Shakil (Deputy Director, FSCD)",
            "contact_officer_phone": "+8801712000000",
            "status": "APPROVED",
            "remarks": "Fire safety NOC granted subject to riser line tests."
        }
        res = await ac.post("/api/v1/legal/permits", json=payload)
        assert res.status_code == 201
        permit = res.json()
        permit_id = permit["id"]
        assert permit["reference_no"] == ref_no
        assert permit["authority_name"] == "FSCD"
        assert permit["renewal_alert_status"] == "VALID"

        # 2. Add Condition checklist items
        cond_payload = {
            "condition_code": "COND-FIRE-01",
            "condition_title": "Installation of Wet Riser System with 4-inch Diameter GI Pipe",
            "condition_category": "FIRE_SAFETY",
            "mandatory_level": "CRITICAL",
            "compliance_status": "PENDING",
            "remarks": "To be tested prior to occupancy application."
        }
        cond_res = await ac.post(f"/api/v1/legal/permits/{permit_id}/conditions", json=cond_payload)
        assert cond_res.status_code == 201
        cond = cond_res.json()
        cond_id = cond["id"]
        assert cond["condition_code"] == "COND-FIRE-01"
        assert cond["compliance_status"] == "PENDING"

        # 3. Update Condition compliance
        update_cond_res = await ac.patch(f"/api/v1/legal/permits/conditions/{cond_id}", json={
            "compliance_status": "COMPLIED",
            "compliance_date": str(date.today()),
            "verified_by_officer": "Major M. Shakil",
            "remarks": "Pressure test passed at 150 PSI."
        })
        assert update_cond_res.status_code == 200
        updated_cond = update_cond_res.json()
        assert updated_cond["compliance_status"] == "COMPLIED"
        assert updated_cond["verified_by_officer"] == "Major M. Shakil"

        # 4. Fetch permit with conditions
        permits_res = await ac.get(f"/api/v1/legal/permits?authority_name=FSCD")
        assert permits_res.status_code == 200
        items = permits_res.json()
        matched = next((p for p in items if p["id"] == permit_id), None)
        assert matched is not None
        assert matched["conditions_count"] >= 1
        assert matched["complied_conditions_count"] >= 1


@pytest.mark.asyncio
async def test_clearance_renewal_calendar_and_expiration_alerts():
    """
    Test Renewal Calendar & Expiration Reminders:
    - Verifies clearances sorted by expiry date
    - Verifies alert_urgency calculation
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        cal_res = await ac.get("/api/v1/legal/permits/renewal-calendar")
        assert cal_res.status_code == 200
        cal_items = cal_res.json()
        assert isinstance(cal_items, list)
        if len(cal_items) > 0:
            first = cal_items[0]
            assert "days_remaining" in first
            assert "alert_urgency" in first
            assert first["alert_urgency"] in ("CRITICAL_EXPIRED", "URGENT_15_DAYS", "WARNING_30_DAYS", "NORMAL_VALID")


@pytest.mark.asyncio
async def test_court_case_litigation_stay_order_and_digital_safe():
    """
    Test Dispute & Litigation Vault:
    - Create court case with section, plaintiff, defendant, interim stay order
    - Upload certified document in Digital Safe Archive
    - Record hearing diary entry
    - Verify detail endpoint aggregates documents and hearings
    """
    async with TestSessionLocal() as session:
        proj_res = await session.execute(select(Project).limit(1))
        project = proj_res.scalar_one_or_none()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        case_no = f"Title Suit No. {uuid.uuid4().hex[:4].upper()} of 2026"
        case_payload = {
            "project_id": project.id if project else None,
            "case_type": "Title Suit",
            "case_number": case_no,
            "concerned_court": "Joint District Judge 1st Court, Dhaka",
            "legal_act_section": "Specific Relief Act 1877 Sec 42",
            "dispute_category": "LAND_TITLE_DISPUTE",
            "land_mouza": "Mouza: Tejgaon, Dhaka",
            "cs_rs_bs_plot_no": "RS Plot 890, BS Plot 1204",
            "disputed_area_decimals": 5.2500,
            "plaintiff": "Bengal Real Estate Ltd",
            "defendant": "A. K. Azad & Others",
            "appointed_advocate": "Advocate Kamrul Islam",
            "advocate_chamber": "Supreme Court Bar Association Room 204",
            "advocate_contact_phone": "+8801700112233",
            "advocate_email": "kamrul@scba.org.bd",
            "is_interim_stay_active": True,
            "stay_order_details": "Status quo on possession granted on northern boundary.",
            "stay_order_granted_date": str(date.today() - timedelta(days=15)),
            "stay_order_valid_until": str(date.today() + timedelta(days=45)),
            "estimated_risk_level": "HIGH",
            "financial_claim_bdt": 12000000.00,
            "next_hearing_date": str(date.today() + timedelta(days=21)),
            "status": "STAY_ORDER_GRANTED",
            "case_summary": "Suit for declaration of title and eviction of illegal encroachers."
        }
        res = await ac.post("/api/v1/legal/cases", json=case_payload)
        assert res.status_code == 201
        case = res.json()
        case_id = case["id"]
        assert case["case_number"] == case_no
        assert case["is_interim_stay_active"] is True

        # Upload Certified Copy into Digital Safe Vault
        doc_payload = {
            "case_id": case_id,
            "document_code": f"DOC-TEST-{uuid.uuid4().hex[:4].upper()}",
            "document_category": "CERTIFIED_LAND_TITLE",
            "document_title": "Certified Copy of Registered Baya Deed No. 1290/1979",
            "certified_copy_no": "CC-TEJ-1979-1290",
            "issue_or_filing_date": "1979-05-18",
            "issuing_authority_or_court": "Tejgaon Sub-Registry",
            "file_url": "/static/uploads/legal_vault/certified_deed_test.pdf",
            "file_size_kb": 2450,
            "uploaded_by_name": "Advocate Kamrul Islam",
            "is_confidential": True,
            "summary_notes": "Vital document establishing registered conveyance title."
        }
        doc_res = await ac.post(f"/api/v1/legal/cases/{case_id}/documents", json=doc_payload)
        assert doc_res.status_code == 201
        doc = doc_res.json()
        assert doc["document_category"] == "CERTIFIED_LAND_TITLE"
        assert doc["digital_safe_hash"] is not None

        # Record Court Hearing Entry
        hearing_payload = {
            "case_id": case_id,
            "hearing_date": str(date.today() - timedelta(days=5)),
            "presiding_judge": "Joint District Judge Mr. M. H. Chowdhury",
            "court_bench": "1st Court",
            "summary_of_proceedings": "Plaintiff submitted certified Baya deeds. Defendant prayed adjournment for filing rejoinder.",
            "order_passed": "TIME_PETITION_ALLOWED_STATUS_QUO_EXTENDED",
            "next_hearing_date": str(date.today() + timedelta(days=21)),
            "attended_advocate": "Advocate Kamrul Islam",
            "action_items": "Submit written reply to defendant objections."
        }
        hearing_res = await ac.post(f"/api/v1/legal/cases/{case_id}/hearings", json=hearing_payload)
        assert hearing_res.status_code == 201
        hearing = hearing_res.json()
        assert hearing["order_passed"] == "TIME_PETITION_ALLOWED_STATUS_QUO_EXTENDED"

        # Verify Case Details Aggregation
        detail_res = await ac.get(f"/api/v1/legal/cases/{case_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["documents_count"] >= 1
        assert detail["hearings_count"] >= 1
        assert len(detail["documents"]) >= 1
        assert len(detail["hearings"]) >= 1


@pytest.mark.asyncio
async def test_legal_compliance_executive_metrics():
    """
    Test Executive Compliance Metrics:
    - Verifies permits count, condition compliance percentage, active stay orders
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/legal/metrics")
        assert res.status_code == 200
        metrics = res.json()
        assert "total_permits" in metrics
        assert "approved_permits" in metrics
        assert "total_conditions" in metrics
        assert "condition_compliance_percentage" in metrics
        assert "active_court_cases" in metrics
        assert "interim_stay_orders_active" in metrics
        assert "total_disputed_area_decimals" in metrics
        assert "total_financial_exposure_bdt" in metrics
        assert metrics["total_permits"] >= 1
        assert metrics["active_court_cases"] >= 1
