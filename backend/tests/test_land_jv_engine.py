import pytest
from datetime import date, timedelta
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_khatian_hierarchy_and_retrieval(async_client: AsyncClient, admin_headers: dict):
    """
    Validates Bangladesh Khatian Survey Hierarchy (CS -> SA -> RS -> BS -> MUTATION).
    """
    response = await async_client.get("/api/v1/land/khatians", headers=admin_headers)
    assert response.status_code == 200
    khatians = response.json()
    assert isinstance(khatians, list)
    assert len(khatians) >= 1

    new_khatian = {
        "land_bank_id": khatians[0]["land_bank_id"],
        "khatian_type": "RS",
        "khatian_number": "RS-TEST-9921",
        "recorded_tenant_name": "Test Zamindar Estate",
        "case_or_jote_no": "JOTE-441",
        "remarks": "Automated Test Khatian"
    }
    create_resp = await async_client.post("/api/v1/land/khatians", json=new_khatian, headers=admin_headers)
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    assert created_data["khatian_number"] == "RS-TEST-9921"
    assert created_data["khatian_type"] == "RS"


@pytest.mark.asyncio
async def test_dag_plot_creation_with_multi_unit_conversion(async_client: AsyncClient, admin_headers: dict):
    """
    Validates Dag/Plot tracking with multi-unit conversion:
    When Katha is passed, Decimal, Bigha, and Sqft must be auto-calculated.
    """
    kh_resp = await async_client.get("/api/v1/land/khatians", headers=admin_headers)
    assert kh_resp.status_code == 200
    khatians = kh_resp.json()
    khatian_id = khatians[0]["id"]
    land_bank_id = khatians[0]["land_bank_id"]

    new_dag = {
        "khatian_id": khatian_id,
        "land_bank_id": land_bank_id,
        "dag_number": "DAG-TEST-881",
        "land_class": "NAL",
        "input_unit": "KATHA",
        "input_value": 10.0,
        "possession_status": "FULL_POSSESSION",
        "remarks": "Test Dag plot"
    }
    dag_resp = await async_client.post("/api/v1/land/dags", json=new_dag, headers=admin_headers)
    assert dag_resp.status_code == 201
    dag_data = dag_resp.json()
    assert dag_data["dag_number"] == "DAG-TEST-881"
    assert dag_data["area_katha"] == 10.0
    assert dag_data["area_sqft"] == 7200.0
    assert dag_data["area_bigha"] == 0.5
    assert abs(dag_data["area_decimal"] - 16.53) < 0.05


@pytest.mark.asyncio
async def test_document_expiry_alerts_engine(async_client: AsyncClient, admin_headers: dict):
    """
    Validates Statutory Document upload, expiration calculation, and 60-day alert filtering.
    """
    kh_resp = await async_client.get("/api/v1/land/khatians", headers=admin_headers)
    land_bank_id = kh_resp.json()[0]["land_bank_id"]

    today = date.today()
    expiring_soon = today + timedelta(days=25)

    import uuid
    unique_doc_no = f"TAX-ALERT-{uuid.uuid4().hex[:6]}"
    doc_payload = {
        "land_bank_id": land_bank_id,
        "doc_type": "KHAJNA_TAX",
        "doc_number": unique_doc_no,
        "issuing_office": "Assistant Commissioner (Land), Gulshan Circle",
        "execution_date": str(today - timedelta(days=340)),
        "expiry_date": str(expiring_soon),
        "notes": "Expiring Land Development Tax Dakhila"
    }
    doc_resp = await async_client.post("/api/v1/land/documents", json=doc_payload, headers=admin_headers)
    assert doc_resp.status_code == 201
    created_doc = doc_resp.json()
    assert created_doc["doc_number"] == unique_doc_no

    alert_resp = await async_client.get("/api/v1/land/documents/expiry-alerts", headers=admin_headers)
    assert alert_resp.status_code == 200
    alerts = alert_resp.json()
    assert isinstance(alerts, list)
    matching = [d for d in alerts if d["doc_number"] == unique_doc_no]
    assert len(matching) == 1
    assert matching[0]["days_remaining"] <= 60


@pytest.mark.asyncio
async def test_deed_chain_continuity_verification(async_client: AsyncClient, admin_headers: dict):
    """
    Validates Title Deed Chain continuity (CS -> SA -> RS -> BS -> MUTATION).
    """
    kh_resp = await async_client.get("/api/v1/land/khatians", headers=admin_headers)
    land_bank_id = kh_resp.json()[0]["land_bank_id"]

    verify_resp = await async_client.get(f"/api/v1/land/deed-chain-verify/{land_bank_id}", headers=admin_headers)
    assert verify_resp.status_code == 200
    chain = verify_resp.json()
    assert chain["land_bank_id"] == land_bank_id
    assert "verification_status" in chain
    assert chain["has_cs"] is True
    assert chain["has_sa"] is True
    assert chain["has_rs"] is True
    assert chain["survey_sequence_verified"] is True


@pytest.mark.asyncio
async def test_jv_agreement_and_auto_allocation_matrix(async_client: AsyncClient, admin_headers: dict):
    """
    Validates:
    1. Automated 60:40 or 50:50 Unit Allocation matrix generation.
    2. Guaranteed rule: Units allocated to LANDOWNER must be marked `is_locked_for_sales = True`.
    """
    # 1. Fetch existing JV agreement seeded
    jv_resp = await async_client.get("/api/v1/land/jv-agreements", headers=admin_headers)
    assert jv_resp.status_code == 200
    jv_list = jv_resp.json()
    assert isinstance(jv_list, list)
    assert len(jv_list) >= 1
    first_jv = jv_list[0]
    jv_id = first_jv["id"]

    # 2. Run auto-allocation matrix on this JV agreement (e.g. 5 floors, 2 units/floor = 10 units)
    alloc_req = {
        "jv_agreement_id": jv_id,
        "total_floors": 5,
        "units_per_floor": 2,
        "unit_gross_sft": 1750.0,
        "allocation_strategy": "ALTERNATE_FLOORS"
    }
    sim_resp = await async_client.post("/api/v1/land/jv-agreements/auto-allocate", json=alloc_req, headers=admin_headers)
    assert sim_resp.status_code == 200
    matrix = sim_resp.json()

    assert matrix["jv_agreement_id"] == jv_id
    assert matrix["total_units_generated"] == 10
    assert matrix["landowner_units_count"] + matrix["developer_units_count"] == 10
    assert len(matrix["allocated_units"]) == 10

    # Verify Landowner locked units
    landowner_units = [u for u in matrix["allocated_units"] if u["allocation_type"] == "LANDOWNER_UNIT"]
    assert len(landowner_units) > 0
    for lu in landowner_units:
        assert lu["is_locked_for_sales"] is True

    # Verify Developer units are unlocked
    dev_units = [u for u in matrix["allocated_units"] if u["allocation_type"] == "DEVELOPER_UNIT"]
    assert len(dev_units) > 0
    for du in dev_units:
        assert du["is_locked_for_sales"] is False

