import pytest
import uuid
from datetime import date, timedelta
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_wbs_hierarchy_tree_and_progress_update(async_client: AsyncClient, admin_headers: dict):
    """
    Validates Work Breakdown Structure (WBS) & Activity Master:
    - Multi-tier tree: Phase -> Sub-Phase -> Activity -> Task
    - Milestone tracking with planned vs actual dates & progress %
    - Updating progress to 100% automatically sets status to COMPLETED.
    """
    # 1. Fetch flat WBS nodes
    flat_resp = await async_client.get("/api/v1/construction/wbs", headers=admin_headers)
    assert flat_resp.status_code == 200
    nodes = flat_resp.json()
    assert isinstance(nodes, list)
    assert len(nodes) >= 3

    # 2. Fetch as hierarchical tree
    tree_resp = await async_client.get("/api/v1/construction/wbs?as_tree=true", headers=admin_headers)
    assert tree_resp.status_code == 200
    tree_nodes = tree_resp.json()
    assert isinstance(tree_nodes, list)
    # Roots should have children
    root = tree_nodes[0]
    assert "children" in root
    assert len(root["children"]) >= 1

    # 3. Create a new activity/task node
    parent_node_id = root["children"][0]["id"]
    test_code = f"TASK-TST-{uuid.uuid4().hex[:6]}"
    new_task = {
        "project_id": root["project_id"],
        "tower_id": root["tower_id"],
        "parent_id": parent_node_id,
        "node_code": test_code,
        "node_name": "Tremie Pipe Concrete Pouring QC Check",
        "wbs_tier": "TASK",
        "phase_category": root["phase_category"],
        "activity_type": "PILING",
        "planned_start_date": str(date.today()),
        "planned_end_date": str(date.today() + timedelta(days=7)),
        "weightage_percentage": 5.00,
        "responsible_engineer": "Engr. Site Inspector",
        "remarks": "Automated test task"
    }
    create_resp = await async_client.post("/api/v1/construction/wbs", json=new_task, headers=admin_headers)
    assert create_resp.status_code == 201
    created_task = create_resp.json()
    assert created_task["node_code"] == test_code
    assert created_task["status"] == "NOT_STARTED"

    # 4. Update progress to 100% and verify auto-completion
    prog_payload = {
        "progress_percentage": 100.00,
        "remarks": "Inspection completed and Tremie logs verified."
    }
    update_resp = await async_client.put(
        f"/api/v1/construction/wbs/{created_task['id']}/progress",
        json=prog_payload,
        headers=admin_headers
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert float(updated_data["progress_percentage"]) == 100.00
    assert updated_data["status"] == "COMPLETED"
    assert updated_data["actual_end_date"] is not None


@pytest.mark.asyncio
async def test_boq_hard_budget_lock_enforcement(async_client: AsyncClient, admin_headers: dict):
    """
    Validates BOQ 105% Hard Budget Lock:
    - Pre-flight check detects whether requisition exceeds 105% ceiling.
    - Site cannot requisition material exceeding 105% without approved Variation Order (VO).
    """
    # 1. Fetch BOQ budget locks
    boq_resp = await async_client.get("/api/v1/construction/boq/budget-locks", headers=admin_headers)
    assert boq_resp.status_code == 200
    boq_items = boq_resp.json()
    assert len(boq_items) >= 1

    item = boq_items[0]
    item_id = item["id"]
    estimated_qty = float(item["estimated_quantity"])
    allowable_qty = float(item["allowable_quantity"])
    already_req = float(item["requisitioned_quantity"])

    # 2. Pre-flight check for a quantity that definitely exceeds allowable ceiling
    huge_qty = allowable_qty + 500.0
    check_payload = {
        "boq_item_id": item_id,
        "requested_quantity": huge_qty,
        "requisition_memo_no": "MEMO-FAIL-01"
    }
    check_resp = await async_client.post("/api/v1/construction/boq/check-budget-lock", json=check_payload, headers=admin_headers)
    assert check_resp.status_code == 200
    check_data = check_resp.json()
    assert check_data["budget_lock_triggered"] is True
    assert "HARD BUDGET LOCK TRIGGERED" in check_data["message"]

    # 3. Attempting to requisition this huge quantity must trigger HTTP 400 Bad Request
    req_resp = await async_client.post("/api/v1/construction/boq/requisition", json=check_payload, headers=admin_headers)
    assert req_resp.status_code == 400
    err_msg = req_resp.json()["detail"]
    assert "HARD BUDGET LOCK ENFORCED" in err_msg


@pytest.mark.asyncio
async def test_variation_order_lifecycle_unlocks_boq_headroom(async_client: AsyncClient, admin_headers: dict):
    """
    Validates Variation Order (VO) Subsystem:
    - Creates a Variation Order for a project BOQ item.
    - Approval by Project Director unlocks additional allowable headroom on the BOQ item.
    """
    boq_resp = await async_client.get("/api/v1/construction/boq/budget-locks", headers=admin_headers)
    assert boq_resp.status_code == 200
    item = boq_resp.json()[0]
    initial_vo_qty = float(item.get("variation_order_quantity") or 0.0)

    # 1. Submit Variation Order
    vo_payload = {
        "project_id": item["project_id"],
        "boq_item_id": item["id"],
        "additional_quantity": 250.00,
        "revised_rate": float(item["estimated_unit_rate"]),
        "reason": "Architectural floor elevation revision required additional reinforcement"
    }
    vo_create_resp = await async_client.post("/api/v1/construction/boq/variation-orders", json=vo_payload, headers=admin_headers)
    assert vo_create_resp.status_code == 201
    vo_data = vo_create_resp.json()
    assert vo_data["status"] == "PENDING"
    vo_id = vo_data["id"]

    # 2. Approve Variation Order
    approve_payload = {
        "approved_by_pm": "Engr. Mostofa Kamal (Project Director)",
        "status": "APPROVED",
        "approval_notes": "Reviewed and approved by steering committee."
    }
    vo_app_resp = await async_client.put(
        f"/api/v1/construction/boq/variation-orders/{vo_id}/approve",
        json=approve_payload,
        headers=admin_headers
    )
    assert vo_app_resp.status_code == 200
    assert vo_app_resp.json()["status"] == "APPROVED"

    # 3. Verify BOQ item has incremented variation_order_quantity and is unlocked
    refetch_resp = await async_client.get("/api/v1/construction/boq/budget-locks", headers=admin_headers)
    updated_items = refetch_resp.json()
    updated_item = next(b for b in updated_items if b["id"] == item["id"])
    assert float(updated_item["variation_order_quantity"]) == pytest.approx(initial_vo_qty + 250.00, 0.01)
    assert updated_item["is_locked"] is False


@pytest.mark.asyncio
async def test_joint_measurement_sheet_creation_and_dimensions(async_client: AsyncClient, admin_headers: dict):
    """
    Validates Joint Measurement Sheet (JMS) Engine:
    - Captures dimensions (Length x Breadth x Depth) and verifies quantity calculation.
    - Verifies Site Engineer and Subcontractor signoff fields.
    """
    wo_resp = await async_client.get("/api/v1/construction/work-orders", headers=admin_headers)
    assert wo_resp.status_code == 200
    work_orders = wo_resp.json()
    assert len(work_orders) >= 1
    wo_id = work_orders[0]["id"]

    jms_payload = {
        "work_order_id": wo_id,
        "jms_number": f"JMS-TEST-{uuid.uuid4().hex[:8]}",
        "measurement_date": str(date.today()),
        "location_floor": "Tower 1 - Floor 5 Beam B5-S5",
        "trade_item": "Formwork & Centering Plywood",
        "unit_of_measure": "SFT",
        "measured_length": 50.00,
        "measured_breadth": 20.00,
        "measured_depth": 0.00, # 2D area (50 x 20 = 1000 SFT)
        "measured_quantity": 0.00, # Should be calculated by engine
        "unit_rate": 35.00,
        "verified_by_site_engineer": "Engr. Tanvir Ahmed",
        "subcontractor_representative": "Md. Rafiqul Islam"
    }
    create_resp = await async_client.post("/api/v1/construction/jms", json=jms_payload, headers=admin_headers)
    assert create_resp.status_code == 201
    created_jms = create_resp.json()
    assert float(created_jms["measured_quantity"]) == pytest.approx(1000.0, 0.1)
    assert float(created_jms["total_amount"]) == pytest.approx(35000.0, 0.1)
    assert created_jms["status"] == "VERIFIED_BY_ENGINEER"


@pytest.mark.asyncio
async def test_dpr_site_diary_enriched_logs(async_client: AsyncClient, admin_headers: dict):
    """
    Validates Daily Progress Report (DPR / Site Diary):
    - Floor/Unit location, machinery deployed, site photos, and safety incidents.
    """
    p_resp = await async_client.get("/api/v1/projects/list", headers=admin_headers)
    assert p_resp.status_code == 200
    projects = p_resp.json()
    assert len(projects) >= 1
    proj_id = projects[0]["id"]

    dpr_payload = {
        "project_id": proj_id,
        "report_date": str(date.today()),
        "weather_condition_id": "SUNNY",
        "structural_activity_summary": "Shear wall SW-2 reinforcement binding & electric vibrator compaction",
        "floor_unit_location": "Podium Level 3 Zone A",
        "machinery_deployed": "1x Stationary Concrete Pump, 2x Tower Cranes, 4x Vibrators",
        "site_photos": [
            {"url": "assets/images/construction/dpr_test_1.jpg", "caption": "Shear wall reinforcement inspection"}
        ],
        "safety_incident_logged": False,
        "safety_incident_notes": "All safety harnesses and hard hats verified.",
        "concrete_casting_cft": 1500.00,
        "steel_rod_consumed_mt": 12.500,
        "cement_consumed_bags": 350,
        "total_workers_onsite": 42
    }
    create_resp = await async_client.post("/api/v1/construction/dpr", json=dpr_payload, headers=admin_headers)
    assert create_resp.status_code == 201
    dpr_data = create_resp.json()
    assert dpr_data["floor_unit_location"] == "Podium Level 3 Zone A"
    assert "Stationary Concrete Pump" in dpr_data["machinery_deployed"]
    assert dpr_data["safety_incident_logged"] is False
    assert len(dpr_data["site_photos"]) == 1


@pytest.mark.asyncio
async def test_ra_billing_statutory_deductions_and_multi_role_approval(async_client: AsyncClient, admin_headers: dict):
    """
    Validates Subcontractor RA Billing Engine:
    - Statutory Deductions: Retention (10%), Advance Recovery, Developer Store Recovery, TDS (Sec 52), VDS.
    - Net Payable formula verification:
      Net Payable = Gross - Retention - Advance - Store Recovery - TDS - VDS
    - Multi-tier digital approval signature chain:
      Site Engineer -> Quantity Surveyor -> Project Director -> Accounts
    """
    wo_resp = await async_client.get("/api/v1/construction/work-orders", headers=admin_headers)
    assert wo_resp.status_code == 200
    work_orders = wo_resp.json()
    assert len(work_orders) >= 1
    wo_id = work_orders[0]["id"]

    # 1. Create RA Bill with 10% retention, 5% TDS, 5% VDS, 50k Advance, 40k Store recovery
    gross = 1000000.00
    ra_payload = {
        "work_order_id": wo_id,
        "ra_bill_number": f"RA-TEST-{uuid.uuid4().hex[:8]}",
        "bill_date": str(date.today()),
        "billing_period_start": str(date.today() - timedelta(days=30)),
        "billing_period_end": str(date.today()),
        "gross_work_certified_amount": gross,
        "retention_percent": 10.00, # 100,000
        "advance_recovery_deducted": 50000.00,
        "material_store_recovery_amount": 40000.00,
        "tds_rate": 5.00, # 50,000
        "vds_rate": 5.00, # 50,000
        "remarks": "Subcontractor bill with complete statutory deductions"
    }
    create_resp = await async_client.post("/api/v1/construction/ra-bills", json=ra_payload, headers=admin_headers)
    assert create_resp.status_code == 201
    bill = create_resp.json()
    bill_id = bill["id"]

    # Expected net: 1,000,000 - 100,000 - 50,000 - 40,000 - 50,000 - 50,000 = 710,000
    assert float(bill["retention_money_deducted"]) == pytest.approx(100000.00, 0.01)
    assert float(bill["advance_recovery_deducted"]) == pytest.approx(50000.00, 0.01)
    assert float(bill["material_store_recovery_amount"]) == pytest.approx(40000.00, 0.01)
    assert float(bill["tds_withheld_amount"]) == pytest.approx(50000.00, 0.01)
    assert float(bill["vds_withheld_amount"]) == pytest.approx(50000.00, 0.01)
    assert float(bill["net_payable_amount"]) == pytest.approx(710000.00, 0.01)
    assert bill["status"] == "VERIFIED_BY_ENGINEER"

    # Signature chain must have 4 tiers
    chain = bill["approval_signature_chain"]
    assert len(chain) == 4
    roles = [c["role"] for c in chain]
    assert "SITE_ENGINEER" in roles
    assert "QUANTITY_SURVEYOR" in roles
    assert "PROJECT_DIRECTOR" in roles
    assert "ACCOUNTS" in roles

    # 2. Quantity Surveyor Verification
    qs_sign_payload = {
        "role": "QUANTITY_SURVEYOR",
        "signatory_name": "Engr. QS Lead",
        "action": "VERIFY",
        "approval_notes": "Measurements and rates verified against contract."
    }
    qs_resp = await async_client.post(f"/api/v1/construction/ra-bills/{bill_id}/sign", json=qs_sign_payload, headers=admin_headers)
    assert qs_resp.status_code == 200
    assert qs_resp.json()["status"] == "VERIFIED_BY_QS"

    # 3. Project Director Approval
    pd_sign_payload = {
        "role": "PROJECT_DIRECTOR",
        "signatory_name": "Engr. Mostofa Kamal (PD)",
        "action": "APPROVE",
        "approval_notes": "Technical milestone progress verified on site."
    }
    pd_resp = await async_client.post(f"/api/v1/construction/ra-bills/{bill_id}/sign", json=pd_sign_payload, headers=admin_headers)
    assert pd_resp.status_code == 200
    assert pd_resp.json()["status"] == "APPROVED_BY_PD"

    # 4. Accounts Approval & Double-entry Voucher Posting
    acc_sign_payload = {
        "role": "ACCOUNTS",
        "signatory_name": "Head of Finance & Accounts",
        "action": "APPROVE",
        "approval_notes": "Tax compliance and net liability journal voucher posted."
    }
    acc_resp = await async_client.post(f"/api/v1/construction/ra-bills/{bill_id}/sign", json=acc_sign_payload, headers=admin_headers)
    assert acc_resp.status_code == 200
    final_bill = acc_resp.json()
    assert final_bill["status"] == "ACCOUNTS_VOUCHER_POSTED"
    assert final_bill["accounts_journal_voucher_ref"] is not None
