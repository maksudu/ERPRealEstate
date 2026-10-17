import pytest
from httpx import AsyncClient, ASGITransport
from datetime import date
from app.main import app


@pytest.mark.asyncio
async def test_tds_calculator_contractor_slabs():
    """
    Tests automated statutory deduction under Income Tax Act 2023:
    Contractor bills: 3% (< 50L), 5% (50L-2Cr), 7% (> 2Cr) and 50% penalty without TIN.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Tier 1: 40 Lakh (3%)
        resp1 = await client.post("/api/v1/tax/tds-calculator", json={
            "bill_type": "CONTRACTOR_CIVIL",
            "gross_amount": 4000000.0,
            "payee_has_tin": True,
            "payee_submitted_return_proof": True
        })
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["tds_rate_percent"] == 3.0
        assert data1["tds_deduction_amount"] == 120000.0

        # Tier 2: 80 Lakh (5%)
        resp2 = await client.post("/api/v1/tax/tds-calculator", json={
            "bill_type": "CONTRACTOR_CIVIL",
            "gross_amount": 8000000.0,
            "payee_has_tin": True,
            "payee_submitted_return_proof": True
        })
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["tds_rate_percent"] == 5.0
        assert data2["tds_deduction_amount"] == 400000.0

        # Tier 3: 2.5 Crore (7%)
        resp3 = await client.post("/api/v1/tax/tds-calculator", json={
            "bill_type": "CONTRACTOR_CIVIL",
            "gross_amount": 25000000.0,
            "payee_has_tin": True,
            "payee_submitted_return_proof": True
        })
        assert resp3.status_code == 200
        data3 = resp3.json()
        assert data3["tds_rate_percent"] == 7.0
        assert data3["tds_deduction_amount"] == 1750000.0

        # Non-compliance Penalty: 50% rate hike (3% -> 4.5%)
        resp4 = await client.post("/api/v1/tax/tds-calculator", json={
            "bill_type": "CONTRACTOR_CIVIL",
            "gross_amount": 4000000.0,
            "payee_has_tin": False,
            "payee_submitted_return_proof": False
        })
        assert resp4.status_code == 200
        data4 = resp4.json()
        assert data4["tds_rate_percent"] == 4.5
        assert data4["tds_deduction_amount"] == 180000.0


@pytest.mark.asyncio
async def test_tds_consultant_and_vds_procurement():
    """
    Tests professional consultant fees (10%/12%) and VDS on Sand, Bricks, Transport, Consultancy.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Consultant with TIN: 10%
        resp_cons = await client.post("/api/v1/tax/tds-calculator", json={
            "bill_type": "CONSULTANT_PROFESSIONAL",
            "category": "ARCHITECTURAL_DESIGN",
            "gross_amount": 1000000.0,
            "payee_has_tin": True,
            "payee_submitted_return_proof": True
        })
        assert resp_cons.status_code == 200
        d_cons = resp_cons.json()
        assert d_cons["tds_rate_percent"] == 10.0
        assert d_cons["tds_deduction_amount"] == 100000.0
        assert d_cons["vds_rate_percent"] == 15.0 # Consultancy VDS 15%
        assert d_cons["vds_deduction_amount"] == 150000.0

        # Sand & Stone Supply VDS: 5%
        resp_sand = await client.post("/api/v1/tax/tds-calculator", json={
            "bill_type": "SUPPLIER_GOODS",
            "category": "SAND_AND_STONE_CHIPS",
            "gross_amount": 500000.0,
            "payee_has_tin": True,
            "payee_submitted_return_proof": True
        })
        assert resp_sand.status_code == 200
        d_sand = resp_sand.json()
        assert d_sand["vds_rate_percent"] == 5.0
        assert d_sand["vds_deduction_amount"] == 25000.0


@pytest.mark.asyncio
async def test_section_53ff_ait_and_sub_registry_breakdown():
    """
    Tests Section 53FF Advance Income Tax (AIT) calculation based on Rajuk/City Corp zones
    and complete Sub-Registry statutory deed transfer fee breakdown.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Gulshan/Banani Zone: ৳4,000 / sqm
        # 2,150 sqft = 199.74 sqm => AIT approx 199.74 * 4000 = ৳798,960
        # Deed Value: ৳25,000,000 (Stamp 1.5% = ৳375k, Reg 1.0% = ৳250k, Local 2.0% = ৳500k, VAT 4.5% = ৳1,125k)
        resp = await client.post("/api/v1/tax/ait-section-53ff", json={
            "deed_value_bdt": 25000000.0,
            "apartment_sqft": 2150.0,
            "zone_code": "GULSHAN_BANANI",
            "property_type": "RESIDENTIAL"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["zone_code"] == "GULSHAN_BANANI"
        assert data["ait_rate_per_sqm"] == 4000.0
        assert data["stamp_duty_amount"] == 375000.0
        assert data["registration_fee_amount"] == 250000.0
        assert data["local_govt_tax_amount"] == 500000.0
        assert data["vat_rate_percent"] == 4.5
        assert data["vat_amount"] == 1125000.0
        assert data["total_statutory_taxes"] > 0
        assert data["total_effective_cost"] == data["deed_value_bdt"] + data["total_statutory_taxes"]


@pytest.mark.asyncio
async def test_mushak_65_goods_transfer_flow():
    """
    Tests creation and PDF rendering of statutory Form Mushak 6.5 Material/Subcontractor Transfer Challan.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Mushak 6.5 Challan
        create_resp = await client.post("/api/v1/tax/mushak-6-5", json={
            "origin_project_id": 1,
            "destination_project_id": 1,
            "transport_vehicle_type": "COVERED_VAN",
            "vehicle_number": "DHAKA METRO-U-12-3456",
            "driver_name": "Alamgir Hossain",
            "driver_phone": "01811-223344",
            "purpose": "SUBCONTRACTOR_FABRICATION",
            "items": [
                {
                    "item_name": "MS Deformed Bar 12mm",
                    "specification": "Grade 500 TMT",
                    "quantity": 5.0,
                    "unit": "TON",
                    "unit_value": 97000.0,
                    "total_value": 485000.0
                }
            ],
            "remarks": "Rebar transfer for basement beam fabrication"
        })
        assert create_resp.status_code == 201
        challan = create_resp.json()
        assert "MUSHAK-6.5" in challan["challan_number"]
        assert challan["total_declared_value"] == 485000.0

        # 2. Fetch PDF
        pdf_resp = await client.get(f"/api/v1/tax/mushak-6-5/{challan['id']}/pdf")
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert len(pdf_resp.content) > 100


@pytest.mark.asyncio
async def test_tax_zones_and_rules_configuration():
    """
    Tests zero-hardcoding dynamic endpoints for Tax Zones and Withholding Rules.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Zones list
        zones_resp = await client.get("/api/v1/tax/tax-zones")
        assert zones_resp.status_code == 200
        zones = zones_resp.json()
        assert len(zones) >= 5

        # Rules list
        rules_resp = await client.get("/api/v1/tax/withholding-rules")
        assert rules_resp.status_code == 200
        rules = rules_resp.json()
        assert len(rules) >= 10
