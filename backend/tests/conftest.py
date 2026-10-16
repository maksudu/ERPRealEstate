import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.core.database import AsyncSessionLocal

@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

@pytest.fixture
def admin_token():
    return create_access_token({"sub": "admin", "user_id": 1, "is_group_admin": True})

@pytest.fixture
def admin_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}",
        "X-Project-Id": "1"
    }

@pytest.fixture
def user_token():
    return create_access_token({"sub": "regular_user", "user_id": 2, "is_group_admin": False})

@pytest.fixture
def user_headers(user_token):
    return {
        "Authorization": f"Bearer {user_token}",
        "X-Project-Id": "1"
    }

@pytest_asyncio.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session
