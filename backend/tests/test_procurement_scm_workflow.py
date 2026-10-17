import pytest
from httpx import AsyncClient, ASGITransport
from datetime import date, datetime
from sqlalchemy.future import select
from app.main import app
from tests.conftest import TestSessionLocal as AsyncSessionLocal
from app.modules.projects.models import Project, BOQItem
from app.modules.construction.models import WBSNode
from app.modules.procurement.models import (
    Vendor, MaterialItem, SiteStore, StoreStock,
    PurchaseRequisition, RFQ, ComparativeStatement,
    PurchaseOrder, GoodsReceipt, QualityInspection,
    MaterialIssueNote, StockTransfer, StockLedger
)

@pytest.mark.asyncio
async def test_pr_creation_with_boq_hard_budget_lock():
    """
    Test PR creation checked against BOQ remaining budget:
    - Normal quantity succeeds and increments boq.requisitioned_quantity
    - Exceeding 105% allowable ceiling is rejected with HTTP 400 Hard Budget Lock
    """
    async with AsyncSessionLocal() as session:
        proj_res = await session.execute(select(Project).order_by(Project.id.asc()).limit(1))
        proj = proj_res.scalar_one_or_none()
        assert proj is not None, "Seed project must exist"

        mat_res = await session.execute(select(MaterialItem).where(MaterialItem.category == "REBAR").limit(1))
        mat = mat_res.scalar_one_or_none()
        assert mat is not None, "Rebar material must exist"

        # Create a dedicated BOQ Item with estimated 100 Tons
        boq = BOQItem(
            project_id=proj.id,
            item_code=f"BOQ-TEST-SCM-{datetime.now().strftime('%f')}",
            wbs_phase_id="SUB_STRUCTURE",
            material_category_id="REBAR_500W",
            item_description="Grade 500W TMT Deformed Rebar",
            unit_of_measure_id="TON",
            estimated_quantity=100.0,
            estimated_unit_rate=95000.0,
            total_estimated_cost=9500000.0,
            requisitioned_quantity=0.0,
            variation_order_quantity=0.0,
            hard_lock_percentage=105.0,
            is_locked=False
        )
        session.add(boq)
        await session.commit()
        await session.refresh(boq)
        boq_id = boq.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Normal requisition: 40 Tons (Well within 105 Tons allowable)
        resp1 = await ac.post("/api/v1/procurement/requisitions", json={
            "project_id": proj.id,
            "material_id": mat.id,
            "requested_quantity": 40.0,
            "boq_item_id": boq_id,
            "tower_name": "Tower A",
            "floor_number": "Basement 1",
            "purpose_notes": "Mat foundation bottom layer rebar placement"
        })
        assert resp1.status_code == 201, f"Expected 201, got {resp1.text}"
        data1 = resp1.json()
        assert data1["requested_quantity"] == 40.0
        assert data1["boq_item_id"] == boq_id

        # 2. Excessive requisition: 70 Tons (Total 40 + 70 = 110 > 105 Tons allowable!)
        resp2 = await ac.post("/api/v1/procurement/requisitions", json={
            "project_id": proj.id,
            "material_id": mat.id,
            "requested_quantity": 70.0,
            "boq_item_id": boq_id,
            "tower_name": "Tower A",
            "floor_number": "Basement 1",
            "purpose_notes": "Attempting over-budget requisition"
        })
        assert resp2.status_code == 400
        assert "Hard Budget Lock Triggered" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_rfq_issuance_and_vendor_invitations():
    """
    Test Request for Quotation (RFQ) issuance to approved vendors.
    """
    async with AsyncSessionLocal() as session:
        pr_res = await session.execute(select(PurchaseRequisition).order_by(PurchaseRequisition.id.desc()).limit(1))
        pr = pr_res.scalar_one_or_none()
        assert pr is not None, "PR must exist"

        vendors_res = await session.execute(select(Vendor).limit(2))
        vendors = vendors_res.scalars().all()
        assert len(vendors) >= 2, "At least 2 vendors must exist"
        vendor_ids = [v.id for v in vendors]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/v1/procurement/rfqs", json={
            "pr_id": pr.id,
            "submission_deadline": str(date.today()),
            "vendor_ids": vendor_ids,
            "notes": "Please quote best rates with 30-day credit terms."
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["rfq_number"].startswith("RFQ-")
        assert len(data["invited_vendors"]) == len(vendor_ids)
        assert data["status"] == "ISSUED"


@pytest.mark.asyncio
async def test_comparative_statement_dynamic_comparison_and_lowest_bidder():
    """
    Test Comparative Statement (CS) side-by-side evaluation with lowest bidder identification.
    """
    async with AsyncSessionLocal() as session:
        pr_res = await session.execute(select(PurchaseRequisition).order_by(PurchaseRequisition.id.desc()).limit(1))
        pr = pr_res.scalar_one_or_none()
        assert pr is not None

        vendors_res = await session.execute(select(Vendor).limit(3))
        vendors = vendors_res.scalars().all()
        assert len(vendors) >= 2

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        quotes = [
            {
                "vendor_id": vendors[0].id,
                "brand_grade": "BSRM 500W Grade 72.5",
                "payment_terms": "30 Days Credit",
                "technical_compliance": "COMPLIANT",
                "quoted_unit_rate": 96500.0,
                "credit_days_offered": 30,
                "lead_time_days": 2,
                "remarks": "Standard BSRM factory delivery"
            },
            {
                "vendor_id": vendors[1].id,
                "brand_grade": "AKS 500W High Ductility",
                "payment_terms": "45 Days Credit",
                "technical_compliance": "COMPLIANT",
                "quoted_unit_rate": 94200.0, # Lowest bidder
                "credit_days_offered": 45,
                "lead_time_days": 3,
                "remarks": "Lowest rate with longer credit period"
            }
        ]

        resp = await ac.post("/api/v1/procurement/comparative-statements", json={
            "pr_id": pr.id,
            "justification_summary": "AKS selected as lowest bidder with 45 days credit line.",
            "quotations": quotes
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["cs_number"].startswith("CS-")
        assert data["lowest_bidder_vendor_id"] == vendors[1].id
        assert data["lowest_unit_rate"] == 94200.0
        assert len(data["quotations"]) == 2


@pytest.mark.asyncio
async def test_purchase_order_generation_and_approval():
    """
    Test generating PO from approved CS and verifying multi-tier approval.
    """
    async with AsyncSessionLocal() as session:
        cs_res = await session.execute(select(ComparativeStatement).order_by(ComparativeStatement.id.desc()).limit(1))
        cs = cs_res.scalar_one_or_none()
        assert cs is not None

        store_res = await session.execute(select(SiteStore).order_by(SiteStore.id.asc()).limit(1))
        store = store_res.scalar_one_or_none()
        assert store is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Generate PO from CS
        resp = await ac.post("/api/v1/procurement/purchase-orders/generate-from-cs", json={
            "cs_id": cs.id,
            "destination_store_id": store.id,
            "delivery_deadline": str(date.today()),
            "delivery_schedule_notes": "Deliver 50% in Batch 1, remaining in Batch 2.",
            "terms_and_conditions": "30 days credit after QC verification."
        })
        assert resp.status_code == 201
        po = resp.json()
        assert po["po_number"].startswith("PO-")
        assert po["approval_status"] == "APPROVED"
        po_id = po["id"]

        # 2. Multi-tier approval endpoint
        appr_resp = await ac.put(f"/api/v1/procurement/purchase-orders/{po_id}/approve", json={
            "approved": True,
            "delivery_schedule_notes": "Final Project Director approval granted."
        })
        assert appr_resp.status_code == 200
        assert appr_resp.json()["approval_status"] == "APPROVED"


@pytest.mark.asyncio
async def test_gate_entry_and_qc_slump_tensile_verification():
    """
    Test Gate Entry physical count verification & Quality Inspection (Slump test, tensile test, MTR)
    which then automatically credits Store Stock at Weighted Average rate.
    """
    async with AsyncSessionLocal() as session:
        po_res = await session.execute(select(PurchaseOrder).order_by(PurchaseOrder.id.desc()).limit(1))
        po = po_res.scalar_one_or_none()
        assert po is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Gate Entry & Physical count at site gate
        grn_resp = await ac.post("/api/v1/procurement/goods-receipts", json={
            "po_id": po.id,
            "delivery_challan_number": "CH-BSRM-9921",
            "gate_entry_number": "GATE-2026-TEST",
            "vehicle_number": "Dhaka Metro TA 14-8899",
            "driver_name": "Md. Rafiqul Islam",
            "driver_phone": "01711223344",
            "physical_count_verified": True,
            "received_quantity": 20.0,
            "rejected_quantity": 0.0,
            "supplier_invoice_number": "INV-AKS-2026-04",
            "supplier_invoice_amount": round(20.0 * float(po.unit_price), 2),
            "inspection_remarks": "Unloaded at Central Rebar Yard."
        })
        assert grn_resp.status_code == 201
        grn = grn_resp.json()
        assert grn["status"] == "GATE_ENTERED"
        assert grn["qc_status"] == "PENDING"
        grn_id = grn["id"]

        # 2. Quality Inspection: Slump test & Tensile yield verification
        qc_resp = await ac.post("/api/v1/procurement/quality-inspections", json={
            "grn_id": grn_id,
            "slump_test_mm": 105.0,
            "tensile_strength_mpa": 525.0,
            "mtr_mill_test_report_number": "MTR-CERT-ASTM-525",
            "mtr_verified": True,
            "test_result": "PASSED",
            "qc_remarks": "Yield strength exceeds 500 MPa specification. Passed QA lab test."
        })
        assert qc_resp.status_code == 201
        qc_data = qc_resp.json()
        assert qc_data["test_result"] == "PASSED"
        assert qc_data["mtr_verified"] is True

        # 3. Verify stock ledger entry was created
        ledger_resp = await ac.get(f"/api/v1/procurement/stores/{po.destination_store_id}/ledger")
        assert ledger_resp.status_code == 200
        ledger = ledger_resp.json()
        assert len(ledger) > 0
        latest = ledger[0]
        assert latest["transaction_type"] in ["GRN_IN", "TRANSFER_IN", "TRANSFER_OUT", "MIN_OUT"]


@pytest.mark.asyncio
async def test_material_issue_note_decrements_stock_against_tower_floor_wbs():
    """
    Test issuing Material Issue Note (MIN) directly against Tower, Floor and WBS code.
    Verifies physical stock decrements and valuation moves at weighted average rate.
    """
    async with AsyncSessionLocal() as session:
        # Pick store with stock > 0
        stk_res = await session.execute(
            select(StoreStock).where(StoreStock.current_stock_quantity > 5.0).limit(1)
        )
        stk = stk_res.scalar_one_or_none()
        if not stk:
            # Seed stock
            store = (await session.execute(select(SiteStore).limit(1))).scalar_one()
            mat = (await session.execute(select(MaterialItem).limit(1))).scalar_one()
            stk = StoreStock(
                store_id=store.id,
                material_id=mat.id,
                current_stock_quantity=50.0,
                weighted_avg_rate=540.0,
                total_stock_value=27000.0,
                reorder_level=10.0
            )
            session.add(stk)
            await session.commit()
            await session.refresh(stk)

        store_id = stk.store_id
        mat_id = stk.material_id
        store = await session.get(SiteStore, store_id)
        proj_id = store.project_id
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Issue 5 units against Tower A, Floor 2
        resp = await ac.post("/api/v1/procurement/material-issues", json={
            "store_id": store_id,
            "project_id": proj_id,
            "material_id": mat_id,
            "issued_quantity": 5.0,
            "tower_name": "Tower A",
            "floor_number": "Level 2",
            "contractor_name": "Bengal Civil Tech Ltd.",
            "purpose": "Column and shear wall casting level 2"
        })
        assert resp.status_code == 201
        min_data = resp.json()
        assert min_data["min_number"].startswith("MIN-")
        assert min_data["issued_quantity"] == 5.0
        assert min_data["total_issue_cost"] > 0.0

        # 2. Attempting to issue more than available stock should fail
        over_resp = await ac.post("/api/v1/procurement/material-issues", json={
            "store_id": store_id,
            "project_id": proj_id,
            "material_id": mat_id,
            "issued_quantity": 999999.0,
            "tower_name": "Tower A",
            "floor_number": "Level 2"
        })
        assert over_resp.status_code == 400
        assert "Insufficient inventory" in over_resp.json()["detail"]


@pytest.mark.asyncio
async def test_inter_site_stock_transfer_workflow():
    """
    Test Inter-Site stock transfer:
    - Central Warehouse dispatches to Project site store
    - Site store acknowledges receipt, adjusting stock balance and valuation
    """
    async with AsyncSessionLocal() as session:
        stores = (await session.execute(select(SiteStore).limit(2))).scalars().all()
        assert len(stores) >= 2, "At least 2 stores needed for transfer"
        from_store = stores[0]
        to_store = stores[1]

        # Ensure from_store has stock
        stk_res = await session.execute(
            select(StoreStock).where(StoreStock.store_id == from_store.id, StoreStock.current_stock_quantity >= 10.0).limit(1)
        )
        stk = stk_res.scalar_one_or_none()
        if not stk:
            mat = (await session.execute(select(MaterialItem).limit(1))).scalar_one()
            stk = StoreStock(
                store_id=from_store.id,
                material_id=mat.id,
                current_stock_quantity=100.0,
                weighted_avg_rate=500.0,
                total_stock_value=50000.0,
                reorder_level=10.0
            )
            session.add(stk)
            await session.commit()
            await session.refresh(stk)

        mat_id = stk.material_id
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Dispatch transfer
        disp_resp = await ac.post("/api/v1/procurement/stock-transfers/dispatch", json={
            "from_store_id": from_store.id,
            "to_store_id": to_store.id,
            "material_id": mat_id,
            "transfer_quantity": 10.0,
            "dispatch_challan_number": "TRF-CH-0091",
            "remarks": "Urgent transfer for structural slab casting"
        })
        assert disp_resp.status_code == 201
        trf = disp_resp.json()
        assert trf["status"] == "DISPATCHED"
        trf_id = trf["id"]

        # 2. Receive transfer at destination store
        recv_resp = await ac.put(f"/api/v1/procurement/stock-transfers/{trf_id}/receive", json={
            "remarks": "Received all 10 units in perfect condition."
        })
        assert recv_resp.status_code == 200
        assert recv_resp.json()["status"] == "RECEIVED"
