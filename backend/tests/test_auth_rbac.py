import pytest
from app.core.security import create_access_token
from app.modules.auth.models import User, UserProjectAssignment
from app.modules.auth.dependencies import require_project_scope
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_x_project_id_missing_header_rejected(async_client, admin_token):
    """
    Project-scoped endpoints must return 400 Bad Request if X-Project-Id header is missing.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await async_client.get("/api/v1/auth/project-scope", headers=headers)
    assert response.status_code == 400
    assert "X-Project-Id" in response.json()["detail"]


@pytest.mark.asyncio
async def test_x_project_id_invalid_integer_rejected(async_client, admin_token):
    """
    Non-integer X-Project-Id headers must be rejected with 400 Bad Request.
    """
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "X-Project-Id": "invalid_project_string"
    }
    response = await async_client.get("/api/v1/auth/project-scope", headers=headers)
    assert response.status_code == 400
    assert "valid integer ID" in response.json()["detail"]


@pytest.mark.asyncio
async def test_group_admin_bypasses_project_restriction(async_client, admin_token):
    """
    Group Admins must automatically bypass project assignment restrictions with can_view_financials=True.
    """
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "X-Project-Id": "9999" # An arbitrary project ID
    }
    response = await async_client.get("/api/v1/auth/project-scope", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_group_admin"] is True
    assert data["can_view_financials"] is True
    assert data["project_id"] == 9999


@pytest.mark.asyncio
async def test_unassigned_user_rejected_with_403_forbidden():
    """
    Regular users without assignment to the requested project must be rejected with 403 Forbidden.
    """
    mock_user = User(
        id=55,
        username="site_engineer",
        is_group_admin=False,
        is_active=True
    )
    # User has assignment only to project 1
    mock_user.project_assignments = [
        UserProjectAssignment(user_id=55, project_id=1, role_code="SITE_ENGINEER", can_view_financials=False)
    ]

    # Requesting assigned project 1 succeeds
    context = await require_project_scope(x_project_id="1", current_user=mock_user)
    assert context.project_id == 1
    assert context.is_group_admin is False
    assert context.can_view_financials is False

    # Requesting unassigned project 2 raises 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        await require_project_scope(x_project_id="2", current_user=mock_user)
    assert exc_info.value.status_code == 403
    assert "not assigned to project ID 2" in exc_info.value.detail
