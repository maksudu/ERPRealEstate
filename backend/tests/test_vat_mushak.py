import pytest
from app.modules.accounts.mushak_generator import generate_mushak_63_pdf

def compute_statutory_vat(sqft: float, property_type: str = "RESIDENTIAL", taxable_amount: float = 10000000.0):
    """
    Standard Bangladesh VAT Act 2012 Calculation:
    - Commercial properties: 7.5%
    - Residential <= 1,600 sq ft: 2.0%
    - Residential > 1,600 sq ft: 4.5%
    """
    prop = property_type.upper()
    if prop == "COMMERCIAL":
        rate = 7.50
    elif sqft <= 1600.0:
        rate = 2.00
    else:
        rate = 4.50

    vat_amount = round(taxable_amount * (rate / 100.0), 2)
    total_amount = round(taxable_amount + vat_amount, 2)
    return {
        "sqft": sqft,
        "property_type": prop,
        "vat_rate_percent": rate,
        "taxable_amount": taxable_amount,
        "vat_amount": vat_amount,
        "total_amount": total_amount
    }


def test_residential_under_1600_sqft_vat():
    """
    Under 1,600 sqft apartment (e.g. 1,450 sqft):
    Taxable: 10,000,000 BDT
    Statutory VAT Rate: 2.0%
    VAT Amount: 200,000 BDT
    Total: 10,200,000 BDT
    """
    res = compute_statutory_vat(sqft=1450.0, property_type="RESIDENTIAL", taxable_amount=10000000.0)
    assert res["vat_rate_percent"] == 2.00
    assert res["vat_amount"] == 200000.00
    assert res["total_amount"] == 10200000.00


def test_residential_exactly_1600_sqft_vat():
    """
    Exactly 1,600 sqft apartment:
    Statutory VAT Rate: 2.0%
    """
    res = compute_statutory_vat(sqft=1600.0, property_type="RESIDENTIAL", taxable_amount=10000000.0)
    assert res["vat_rate_percent"] == 2.00
    assert res["vat_amount"] == 200000.00


def test_residential_over_1600_sqft_vat():
    """
    Over 1,600 sqft luxury apartment (e.g. 2,250 sqft):
    Taxable: 25,000,000 BDT
    Statutory VAT Rate: 4.5%
    VAT Amount: 1,125,000 BDT
    Total: 26,125,000 BDT
    """
    res = compute_statutory_vat(sqft=2250.0, property_type="RESIDENTIAL", taxable_amount=25000000.0)
    assert res["vat_rate_percent"] == 4.50
    assert res["vat_amount"] == 1125000.00
    assert res["total_amount"] == 26125000.00


def test_commercial_property_vat():
    """
    Commercial showroom / office floor:
    Statutory VAT Rate: 7.5%
    """
    res = compute_statutory_vat(sqft=3500.0, property_type="COMMERCIAL", taxable_amount=40000000.0)
    assert res["vat_rate_percent"] == 7.50
    assert res["vat_amount"] == 3000000.00
    assert res["total_amount"] == 43000000.00


@pytest.mark.asyncio
async def test_sub_registry_ait_and_vat_calculator_endpoint(async_client, admin_headers):
    """
    Tests GET /api/v1/accounts/sub-registry-calculator endpoint for deed statutory fees.
    """
    response = await async_client.post(
        "/api/v1/accounts/sub-registry-calc",
        headers=admin_headers,
        json={
            "deed_value_bdt": 10000000.0,
            "apartment_sqft": 1500.0,
            "zone_category": "DHAKA_OTHER",
            "property_type": "RESIDENTIAL"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["vat_rate_percent"] == 2.00
    assert data["vat_amount"] == 200000.00
    assert data["stamp_duty_rate_percent"] == 1.50
    assert data["stamp_duty_amount"] == 150000.00
    assert data["registration_fee_rate_percent"] == 1.00
    assert data["registration_fee_amount"] == 100000.00
    assert data["local_govt_tax_rate_percent"] == 2.00
    assert data["local_govt_tax_amount"] == 200000.00
    assert data["ait_rate_per_sqm_bdt"] == 2000.0
