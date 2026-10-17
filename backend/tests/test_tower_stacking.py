import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.inventory.models import Unit, ParkingSlot
from sqlalchemy import select

@pytest.mark.asyncio
async def test_tower_stacking_plan():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/inventory/stacking-plan?project_id=1&tower_id=1")
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["project_id"] == 1
        assert "floors" in data
        assert len(data["floors"]) > 0
        # Floors should be sorted top down (highest floor first)
        first_floor = data["floors"][0]
        assert first_floor["floor_number"] >= 14
        assert first_floor["total_units"] > 0
        assert "units" in first_floor

        # Verify unit fields & color codes
        first_unit = first_floor["units"][0]
        assert "color_code" in first_unit
        assert "status_label" in first_unit
        assert "gross_sft" in first_unit
        assert "total_base_price" in first_unit


@pytest.mark.asyncio
async def test_unit_pricing_breakdown():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        units_resp = await ac.get("/api/v1/inventory/units?project_id=1")
        assert units_resp.status_code == 200
        units = units_resp.json()
        assert len(units) > 0
        unit_id = units[0]["id"]

        response = await ac.get(f"/api/v1/inventory/units/{unit_id}/pricing-breakdown")
        assert response.status_code == 200, response.text
        sheet = response.json()
        assert sheet["unit_id"] == unit_id
        assert sheet["gross_sft"] > 0
        assert sheet["base_cost"] > 0
        assert sheet["subtotal"] >= sheet["base_cost"]
        assert sheet["min_allowed_price"] <= sheet["subtotal"]


@pytest.mark.asyncio
async def test_instant_reserve_and_release():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        units_resp = await ac.get("/api/v1/inventory/units?project_id=1&status_id=AVAILABLE")
        assert units_resp.status_code == 200
        units = units_resp.json()
        if not units:
            pytest.skip("No available unit found to test lock")
        unit_id = units[0]["id"]

        # 1. Instant Reserve
        res_resp = await ac.post(f"/api/v1/inventory/units/{unit_id}/reserve", json={
            "user_id": 99,
            "user_name": "QA Architect",
            "duration_minutes": 15
        })
        assert res_resp.status_code == 200, res_resp.text
        res_data = res_resp.json()
        assert res_data["success"] is True
        assert res_data["lock_duration_seconds"] == 900

        # 2. Release hold
        rel_resp = await ac.post(f"/api/v1/inventory/units/{unit_id}/release")
        assert rel_resp.status_code == 200, rel_resp.text
        assert rel_resp.json()["success"] is True


@pytest.mark.asyncio
async def test_parking_slots_and_allocation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List parking slots
        res = await ac.get("/api/v1/inventory/parking-slots?project_id=1")
        assert res.status_code == 200, res.text
        slots = res.json()
        assert len(slots) > 0
        slot = slots[0]
        assert "slot_number" in slot
        assert "basement_level" in slot
        assert slot["price"] > 0


@pytest.mark.asyncio
async def test_unit_merge():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Fetch 2 available units on floor 14
        units_resp = await ac.get("/api/v1/inventory/units?project_id=1&tower_id=1")
        assert units_resp.status_code == 200
        units = units_resp.json()
        fl14_units = [u for u in units if u["floor_number"] == 14 and u["status_id"] == "AVAILABLE" and not u.get("is_merged")]
        if len(fl14_units) >= 2:
            u1, u2 = fl14_units[0], fl14_units[1]
            merge_resp = await ac.post("/api/v1/inventory/units/merge", json={
                "project_id": 1,
                "tower_id": 1,
                "floor_number": 14,
                "source_unit_ids": [u1["id"], u2["id"]],
                "new_unit_number": "14-DUPLEX-AB",
                "unit_type": "DUPLEX",
                "facing": "SOUTH_LAKE",
                "bed_count": 6,
                "bath_count": 6,
                "balcony_count": 5,
                "remarks": "Architectural client combination"
            })
            assert merge_resp.status_code == 201, merge_resp.text
            new_u = merge_resp.json()
            assert new_u["unit_number"] == "14-DUPLEX-AB"
            assert new_u["gross_saleable_area_sqft"] == u1["gross_saleable_area_sqft"] + u2["gross_saleable_area_sqft"]
