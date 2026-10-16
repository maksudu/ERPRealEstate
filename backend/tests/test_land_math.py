import pytest
from decimal import Decimal
from app.modules.land.schemas import (
    convert_area_to_all_units,
    KATHA_TO_SQFT,
    DECIMAL_TO_SQFT,
    BIGHA_TO_KATHA,
    ACRE_TO_DECIMAL
)

def test_statutory_bangladesh_land_constants():
    """
    Validates canonical Bangladesh Land Measurement Constants:
    - 1 Katha = 720 Sq Ft
    - 1 Decimal = 435.60 Sq Ft
    - 1 Bigha = 20 Katha = 14,400 Sq Ft
    - 1 Acre = 100 Decimal = 43,560 Sq Ft
    """
    assert KATHA_TO_SQFT == Decimal("720.00")
    assert DECIMAL_TO_SQFT == Decimal("435.60")
    assert BIGHA_TO_KATHA == Decimal("20.00")
    assert ACRE_TO_DECIMAL == Decimal("100.00")


def test_katha_input_conversions():
    """
    Test 20 Katha (exactly 1 Bigha):
    - Sqft = 20 * 720 = 14,400 Sqft
    - Bigha = 1.0
    - Decimal = 14,400 / 435.60 = 33.0579 Decimal
    - Acre = 33.0579 / 100 = 0.3306 Acre
    """
    res = convert_area_to_all_units(katha=20.0)
    assert res["sqft"] == 14400.00
    assert res["katha"] == 20.0
    assert res["bigha"] == 1.0
    assert abs(res["decimal"] - 33.0579) < 0.001
    assert abs(res["acre"] - 0.3306) < 0.001


def test_decimal_input_conversions():
    """
    Test 100 Decimal (exactly 1 Acre):
    - Sqft = 100 * 435.60 = 43,560 Sqft
    - Acre = 1.0
    - Katha = 43,560 / 720 = 60.5 Katha
    - Bigha = 60.5 / 20 = 3.025 Bigha
    """
    res = convert_area_to_all_units(decimal=100.0)
    assert res["sqft"] == 43560.00
    assert res["acre"] == 1.0
    assert res["decimal"] == 100.0
    assert res["katha"] == 60.5
    assert res["bigha"] == 3.025


def test_sqft_input_conversions():
    """
    Test 7,200 Sqft:
    - Katha = 10.0
    - Bigha = 0.5
    - Decimal = 7200 / 435.60 = 16.5289
    """
    res = convert_area_to_all_units(sqft=7200.0)
    assert res["sqft"] == 7200.0
    assert res["katha"] == 10.0
    assert res["bigha"] == 0.5
    assert abs(res["decimal"] - 16.5289) < 0.001


@pytest.mark.asyncio
async def test_land_convert_endpoint(async_client, admin_headers):
    """
    Test GET /api/v1/land/convert-area endpoint.
    """
    response = await async_client.get(
        "/api/v1/land/math/convert",
        headers=admin_headers,
        params={"katha": 10.0}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["katha"] == 10.0
    assert data["sqft"] == 7200.0
    assert data["bigha"] == 0.5
