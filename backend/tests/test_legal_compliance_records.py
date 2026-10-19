from datetime import date, timedelta
from types import SimpleNamespace
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.modules.auth.dependencies import get_current_user


@pytest.fixture
def authorized_legal_user():
    user = SimpleNamespace(
        id=1,
        username="legal-admin",
        full_name_en="Legal Admin",
        is_group_admin=True,
        project_assignments=[],
    )
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_legal_records_crud_pagination_filters_and_audit(authorized_legal_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        marker = f"records-{uuid.uuid4().hex[:10]}"
        created = []
        for index in range(3):
            response = await client.post("/api/v1/legal/records", json={
                "area": "registered_record",
                "title": f"{marker} deed {index}",
                "reference_no": f"{marker}-{index}",
                "status": "IN_REVIEW",
                "due_date": str(date.today() + timedelta(days=index)),
                "data": {"deed_number": f"DN-{index}", "khatian_number": f"KH-{index}"},
            })
            assert response.status_code == 201, response.text
            created.append(response.json())

        page = await client.get("/api/v1/legal/records", params={
            "area": "registered_record", "q": marker, "status": "IN_REVIEW", "limit": 1, "offset": 1,
        })
        assert page.status_code == 200
        page_data = page.json()
        assert page_data["total"] == 3
        assert page_data["limit"] == 1
        assert page_data["offset"] == 1
        assert len(page_data["items"]) == 1

        record_id = created[0]["id"]
        updated = await client.patch(f"/api/v1/legal/records/{record_id}", json={
            "title": f"{marker} updated",
            "data": {"deed_number": "UPDATED-DN", "khatian_number": "KH-UPDATED"},
        })
        assert updated.status_code == 200
        assert updated.json()["data"]["deed_number"] == "UPDATED-DN"

        audit = await client.get("/api/v1/legal/audit", params={"record_id": record_id, "limit": 10, "offset": 0})
        assert audit.status_code == 200
        assert audit.json()["total"] == 2
        assert {entry["action"] for entry in audit.json()["items"]} == {"CREATE", "UPDATE"}

        deleted = await client.delete(f"/api/v1/legal/records/{record_id}")
        assert deleted.status_code == 204
        audit_after_delete = await client.get("/api/v1/legal/audit", params={"record_id": record_id})
        assert audit_after_delete.json()["total"] == 3

        for record in created[1:]:
            await client.delete(f"/api/v1/legal/records/{record['id']}")


@pytest.mark.asyncio
async def test_title_clearance_requires_verified_review_and_authorized_approval(authorized_legal_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        base = {
            "area": "land_title",
            "title": f"title-{uuid.uuid4().hex[:8]}",
            "status": "APPROVED",
            "data": {"document_reference": "uploaded-title-scan.pdf"},
        }
        rejected = await client.post("/api/v1/legal/records", json=base)
        assert rejected.status_code == 422

        valid = {
            **base,
            "title": f"title-verified-{uuid.uuid4().hex[:8]}",
            "data": {
                "document_reference": "uploaded-title-scan.pdf",
                "verification_outcome": "VERIFIED",
                "reviewer_identity": "Land Counsel",
                "authorized_approver": "legal-admin",
                "approval_authorized": True,
            },
        }
        approved = await client.post("/api/v1/legal/records", json=valid)
        assert approved.status_code == 201, approved.text
        await client.delete(f"/api/v1/legal/records/{approved.json()['id']}")


@pytest.mark.asyncio
async def test_conditional_clearance_requires_owner_and_deadline(authorized_legal_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        base = {
            "area": "land_use_clearance",
            "title": f"conditional-{uuid.uuid4().hex[:8]}",
            "status": "CONDITIONALLY_APPROVED",
            "data": {
                "verification_outcome": "CONDITIONAL",
                "reviewer_identity": "Land Counsel",
                "authorized_approver": "legal-admin",
                "approval_authorized": True,
                "conditions": [{"description": "Submit revised plan"}],
            },
        }
        rejected = await client.post("/api/v1/legal/records", json=base)
        assert rejected.status_code == 422

        base["data"]["conditions"] = [{
            "owner": "Project Compliance Lead",
            "deadline": str(date.today() + timedelta(days=14)),
            "description": "Submit revised plan",
        }]
        approved = await client.post("/api/v1/legal/records", json=base)
        assert approved.status_code == 201, approved.text
        await client.delete(f"/api/v1/legal/records/{approved.json()['id']}")


@pytest.mark.asyncio
async def test_registered_land_records_keep_mutation_and_tax_verification_distinct(authorized_legal_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        marker = f"land-record-{uuid.uuid4().hex[:8]}"
        payload = {
            "area": "registered_record",
            "title": marker,
            "status": "IN_REVIEW",
            "data": {
                "record_type": "MUTATION",
                "deed_type": "SALE_DEED",
                "deed_number": "D-1001",
                "deed_date": "2025-03-14",
                "registration_office": "SUB_REGISTRY_DHAKA",
                "mouza": "Example Mouza",
                "jl_number": "42",
                "dag_numbers": "101, 102",
                "mutation_application_number": "MUT-2026-01",
                "mutation_application_status": "SUBMITTED",
                "mutation_outcome": None,
                "tax_receipt_reference": "RECEIPT-123",
                "tax_reconciliation_status": "UNVERIFIED",
            },
        }
        payload["data"]["land_tax_amount"] = -1
        invalid_amount = await client.post("/api/v1/legal/records", json=payload)
        assert invalid_amount.status_code == 422
        payload["data"].pop("land_tax_amount")

        created = await client.post("/api/v1/legal/records", json=payload)
        assert created.status_code == 201, created.text
        record = created.json()
        assert record["data"]["mutation_application_status"] == "SUBMITTED"
        assert record["data"]["mutation_outcome"] is None
        assert record["data"]["tax_reconciliation_status"] == "UNVERIFIED"

        page = await client.get("/api/v1/legal/records", params={
            "area": "registered_record", "record_type": "MUTATION",
            "mutation_application_status": "SUBMITTED", "tax_reconciliation_status": "UNVERIFIED",
            "q": marker, "limit": 10, "offset": 0,
        })
        assert page.status_code == 200
        assert [item["id"] for item in page.json()["items"]] == [record["id"]]
        updated = await client.patch(f"/api/v1/legal/records/{record['id']}", json={"data": {**record["data"], "review_date": None}})
        assert updated.status_code == 200
        assert updated.json()["due_date"] is None
        assert updated.json()["data"]["expiry_date"] is None
        await client.delete(f"/api/v1/legal/records/{record['id']}")


@pytest.mark.asyncio
async def test_developer_registration_lifecycle_and_non_expiring_approval(authorized_legal_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        marker = f"developer-registration-{uuid.uuid4().hex[:8]}"
        payload = {
            "area": "developer_registration",
            "title": marker,
            "status": "APPROVED_ISSUED",
            "data": {
                "legal_entity": "BLUEOCEANS_REAL_ESTATE",
                "registration_type": "DEVELOPER_LICENCE",
                "registration_authority": "STATUTORY_AUTHORITY_X",
                "registration_number": "REG-2026-01",
                "issue_date": "2026-01-15",
                "expiry_date": None,
                "renewal_due_date": None,
                "continuing_conditions": "Maintain the recorded conditions.",
                "review_date": "2027-01-15",
                "renewal_reminder_intervals": "90, 60, 30, 15, 7",
                "reminder_channel_primary": "IN_APP",
                "auto_assign_renewal_task": True,
                "renewal_task_owner": "LEGAL_OFFICER_A",
            },
        }
        invalid = {**payload, "title": marker + " invalid", "data": {**payload["data"], "registration_fee_bdt": -10}}
        rejected = await client.post("/api/v1/legal/records", json=invalid)
        assert rejected.status_code == 422

        created = await client.post("/api/v1/legal/records", json=payload)
        assert created.status_code == 201, created.text
        record = created.json()
        assert record["due_date"] == "2027-01-15"
        assert record["data"]["expiry_date"] is None
        assert record["data"]["review_date"] == "2027-01-15"
        assert record["data"]["renewal_reminder_intervals"] == "90, 60, 30, 15, 7"

        page = await client.get("/api/v1/legal/records", params={
            "area": "developer_registration", "registration_type": "DEVELOPER_LICENCE",
            "registration_authority": "STATUTORY_AUTHORITY_X", "status": "APPROVED_ISSUED",
            "q": marker, "limit": 10, "offset": 0,
        })
        assert page.status_code == 200
        assert [item["id"] for item in page.json()["items"]] == [record["id"]]
        await client.delete(f"/api/v1/legal/records/{record['id']}")


@pytest.mark.asyncio
async def test_issued_approval_with_open_condition_is_not_compliant(authorized_legal_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        marker = f"approval-condition-{uuid.uuid4().hex[:8]}"
        approval_response = await client.post("/api/v1/legal/records", json={
            "area": "land_use_clearance",
            "title": marker,
            "reference_no": marker + "-APP",
            "status": "APPROVED",
            "data": {
                "approval_category": "BUILDING_PLAN",
                "approval_number": marker + "-NO",
                "expiry_date": str(date.today() + timedelta(days=15)),
                "verification_outcome": "VERIFIED",
                "reviewer_identity": "Legal Reviewer",
                "authorized_approver": "legal-admin",
                "approval_authorized": True,
                "conditions": [{"owner": "Engineering", "deadline": str(date.today() - timedelta(days=1)), "description": "Submit revised drawing"}],
            },
        })
        assert approval_response.status_code == 201, approval_response.text
        approval_id = approval_response.json()["id"]
        assert approval_response.json()["due_date"] == str(date.today() + timedelta(days=15))

        condition_response = await client.post("/api/v1/legal/records", json={
            "area": "approval_condition",
            "title": marker + " condition",
            "reference_no": marker + "-COND-1",
            "status": "OPEN",
            "due_date": str(date.today() - timedelta(days=1)),
            "data": {"approval_reference": str(approval_id), "condition_text": "Submit revised drawing", "owner": "Engineering"},
        })
        assert condition_response.status_code == 201, condition_response.text
        condition_id = condition_response.json()["id"]

        condition_page = await client.get("/api/v1/legal/records", params={
            "area": "approval_condition", "approval_reference": str(approval_id),
            "status": "OPEN", "limit": 10, "offset": 0,
        })
        assert condition_page.status_code == 200
        assert [item["id"] for item in condition_page.json()["items"]] == [condition_id]

        dashboard = await client.get("/api/v1/legal/dashboard")
        assert dashboard.status_code == 200
        assert dashboard.json()["open_approval_conditions"] >= 1
        assert dashboard.json()["overdue_approval_conditions"] >= 1
        approval_area = next(item for item in dashboard.json()["areas"] if item["area"] == "land_use_clearance")
        assert approval_area["open_items"] >= 1

        await client.delete(f"/api/v1/legal/records/{condition_id}")
        await client.delete(f"/api/v1/legal/records/{approval_id}")


@pytest.mark.asyncio
async def test_noc_correspondence_threads_crud_filters_and_audit(authorized_legal_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        marker = f"noc-{uuid.uuid4().hex[:8]}"
        payloads = [
            {"area": "noc_correspondence", "title": marker + " outgoing", "reference_no": marker + "-OUT", "status": "DISPATCHED", "due_date": str(date.today() + timedelta(days=5)), "data": {"correspondence_direction": "OUTGOING", "correspondence_type": "NOC_APPLICATION", "authority": "AUTHORITY_A", "external_organization": "UTILITY_PROVIDER_A", "thread_reference": marker + "-THREAD", "subject": "Utility NOC request", "workflow_stage": "DISPATCHED_SUBMITTED", "response_due_date": str(date.today() + timedelta(days=5)), "dispatch_reference": "POST-TRACK-100", "noc_category": "UTILITY_CONNECTION", "issuing_party": "COMPANY_A", "receiving_party": "AUTHORITY_A", "conditions": "As stated by issuer", "validity_end_date": None}},
            {"area": "noc_correspondence", "title": marker + " incoming", "reference_no": marker + "-IN", "status": "RECEIVED", "data": {"correspondence_direction": "INCOMING", "correspondence_type": "AUTHORITY_REPLY", "authority": "AUTHORITY_A", "thread_reference": marker + "-THREAD", "subject": "Reply to utility NOC request", "workflow_stage": "RESPONSE_RECEIVED"}},
        ]
        created = []
        for payload in payloads:
            response = await client.post("/api/v1/legal/records", json=payload)
            assert response.status_code == 201, response.text
            created.append(response.json())

        page = await client.get("/api/v1/legal/records", params={"area": "noc_correspondence", "correspondence_direction": "OUTGOING", "correspondence_type": "NOC_APPLICATION", "correspondence_authority": "AUTHORITY_A", "correspondence_external_organization": "UTILITY_PROVIDER_A", "thread_reference": marker + "-THREAD", "q": marker, "limit": 1, "offset": 0})
        assert page.status_code == 200
        page_data = page.json()
        assert page_data["total"] == 1
        assert page_data["limit"] == 1
        assert page_data["items"][0]["id"] == created[0]["id"]
        assert page_data["items"][0]["data"]["thread_reference"] == marker + "-THREAD"
        assert page_data["items"][0]["due_date"] == str(date.today() + timedelta(days=5))

        updated = await client.patch(f"/api/v1/legal/records/{created[0]['id']}", json={"data": {**created[0]["data"], "workflow_stage": "ACKNOWLEDGED"}})
        assert updated.status_code == 200
        assert updated.json()["data"]["workflow_stage"] == "ACKNOWLEDGED"

        for record in created:
            deleted = await client.delete(f"/api/v1/legal/records/{record['id']}")
            assert deleted.status_code == 204
