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
