from datetime import date
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.modules.projects.models import Project


@pytest.mark.asyncio
async def test_approved_clearance_requires_official_evidence(async_client, db_session):
    project = (await db_session.execute(select(Project).limit(1))).scalar_one_or_none()
    assert project is not None

    response = await async_client.post(
        "/api/v1/projects/clearances",
        json={
            "project_id": project.id,
            "reference_no": f"TEST-{uuid4().hex[:10]}",
            "clearance_type_id": "BUILDING_PLAN",
            "authority_name": project.development_authority_id,
            "status": "APPROVED",
        },
    )

    assert response.status_code == 422
    assert "approved memo number" in response.json()["detail"]
    assert "approval date" in response.json()["detail"]
    assert "official approval document URL" in response.json()["detail"]


@pytest.mark.asyncio
async def test_clearance_cannot_be_updated_to_approved_without_evidence(async_client, db_session):
    project = (await db_session.execute(select(Project).limit(1))).scalar_one_or_none()
    assert project is not None
    created = await async_client.post(
        "/api/v1/projects/clearances",
        json={
            "project_id": project.id,
            "reference_no": f"TEST-{uuid4().hex[:10]}",
            "clearance_type_id": "BUILDING_PLAN",
            "authority_name": project.development_authority_id,
            "status": "SUBMITTED",
        },
    )
    assert created.status_code == 201

    response = await async_client.put(
        f"/api/v1/projects/clearances/{created.json()['id']}",
        json={"status": "APPROVED"},
    )

    assert response.status_code == 422
    assert "APPROVED clearances require" in response.json()["detail"]


@pytest.mark.asyncio
async def test_approved_clearance_accepts_complete_official_evidence(async_client, db_session):
    project = (await db_session.execute(select(Project).limit(1))).scalar_one_or_none()
    assert project is not None

    response = await async_client.post(
        "/api/v1/projects/clearances",
        json={
            "project_id": project.id,
            "reference_no": f"TEST-{uuid4().hex[:10]}",
            "clearance_type_id": "BUILDING_PLAN",
            "authority_name": project.development_authority_id,
            "status": "APPROVED",
            "approved_memo_no": "AUTH/APPROVAL/TEST-01",
            "approval_date": date.today().isoformat(),
            "document_url": "https://documents.example.test/official-approval.pdf",
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "APPROVED"
