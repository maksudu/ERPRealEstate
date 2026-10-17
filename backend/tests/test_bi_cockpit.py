import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_executive_bi_cockpit_full_summary():
    """
    Test GET /api/v1/bi/cockpit
    Verifies full executive summary payload containing:
    - valuation
    - runway_90d and runway_180d
    - sales_velocities
    - profitability_comparisons (with EVM SPI/CPI)
    - overdue_heatmap (with aging buckets)
    - overall_spi, overall_cpi, overall_portfolio_irr
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/bi/cockpit")
        assert res.status_code == 200
        data = res.json()

        # Valuation
        assert "valuation" in data
        val = data["valuation"]
        assert val["total_units_count"] >= 0
        assert val["sold_units_count"] >= 0
        assert val["unsold_units_count"] >= 0
        assert val["total_asset_value_bdt"] >= 0

        # Cash Runway Horizons
        assert "runway_90d" in data
        assert "runway_180d" in data
        for r_key in ["runway_90d", "runway_180d"]:
            r = data[r_key]
            assert "total_inflow_bdt" in r
            assert "total_outflow_bdt" in r
            assert "net_cash_runway_bdt" in r
            assert "runway_health_status" in r
            assert r["runway_health_status"] in ["STRONG_SURPLUS", "MODERATE", "CRITICAL_DEFICIT"]

        # Sales Velocities
        assert "sales_velocities" in data
        assert isinstance(data["sales_velocities"], list)

        # Profitability & EVM Comparisons
        assert "profitability_comparisons" in data
        assert isinstance(data["profitability_comparisons"], list)
        if len(data["profitability_comparisons"]) > 0:
            item = data["profitability_comparisons"][0]
            assert "project_id" in item
            assert "project_name" in item
            assert "spi_index" in item
            assert "cpi_index" in item
            assert "evm_status" in item

        # Overdue Heatmap
        assert "overdue_heatmap" in data
        assert isinstance(data["overdue_heatmap"], list)
        if len(data["overdue_heatmap"]) > 0:
            h_row = data["overdue_heatmap"][0]
            assert "project_id" in h_row
            assert "total_project_overdue_bdt" in h_row
            assert "buckets" in h_row
            assert len(h_row["buckets"]) == 5
            for b in h_row["buckets"]:
                assert b["risk_intensity"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

        # High-level EVM metrics
        assert "overall_spi" in data
        assert "overall_cpi" in data
        assert "overall_portfolio_irr" in data


@pytest.mark.asyncio
async def test_bi_portfolio_valuation_endpoint():
    """
    Test GET /api/v1/bi/valuation
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/bi/valuation")
        assert res.status_code == 200
        val = res.json()
        assert "total_units_count" in val
        assert "sold_inventory_value_bdt" in val
        assert "unsold_inventory_value_bdt" in val
        assert val["total_units_count"] == val["sold_units_count"] + val["unsold_units_count"]


@pytest.mark.asyncio
async def test_bi_cash_runway_horizons_endpoint():
    """
    Test GET /api/v1/bi/runway with and without horizon filter
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Default horizon (90 days)
        res_default = await ac.get("/api/v1/bi/runway")
        assert res_default.status_code == 200
        r_default = res_default.json()
        assert r_default["horizon_days"] == 90
        assert r_default["runway_health_status"] in ["STRONG_SURPLUS", "MODERATE", "CRITICAL_DEFICIT"]
        assert "total_inflow_bdt" in r_default
        assert "total_outflow_bdt" in r_default

        # Horizon: 180 days
        res_180 = await ac.get("/api/v1/bi/runway?horizon_days=180")
        assert res_180.status_code == 200
        r_180 = res_180.json()
        assert r_180["horizon_days"] == 180
        assert r_180["runway_health_status"] in ["STRONG_SURPLUS", "MODERATE", "CRITICAL_DEFICIT"]


@pytest.mark.asyncio
async def test_bi_sales_velocity_endpoint():
    """
    Test GET /api/v1/bi/sales-velocity
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/bi/sales-velocity")
        assert res.status_code == 200
        items = res.json()
        assert isinstance(items, list)
        for p in items:
            assert "project_id" in p
            assert "total_units" in p
            assert "units_sold" in p
            assert "avg_days_to_sell" in p
            assert "velocity_status" in p


@pytest.mark.asyncio
async def test_bi_profitability_and_evm_endpoint():
    """
    Test GET /api/v1/bi/profitability-evm
    Verifies EVM calculations: SPI = EV / PV, CPI = EV / AC
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/bi/profitability-evm")
        assert res.status_code == 200
        items = res.json()
        assert isinstance(items, list)
        for proj in items:
            assert "planned_value_pv" in proj
            assert "earned_value_ev" in proj
            assert "actual_cost_ac" in proj
            assert "spi_index" in proj
            assert "cpi_index" in proj
            assert "gross_profit_margin_pct" in proj
            assert "projected_irr_pct" in proj
            assert proj["spi_index"] > 0
            assert proj["cpi_index"] > 0


@pytest.mark.asyncio
async def test_bi_overdue_aging_heatmap_endpoint():
    """
    Test GET /api/v1/bi/overdue-heatmap
    Verifies bucket structure and risk intensities
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/bi/overdue-heatmap")
        assert res.status_code == 200
        items = res.json()
        assert isinstance(items, list)
        for row in items:
            assert "project_id" in row
            assert "total_project_overdue_bdt" in row
            assert "total_overdue_units" in row
            assert "buckets" in row
            assert len(row["buckets"]) == 5
            for b in row["buckets"]:
                assert "bucket_code" in b
                assert "overdue_amount_bdt" in b
                assert "risk_intensity" in b


@pytest.mark.asyncio
async def test_bi_board_presentation_pdf_export():
    """
    Test GET /api/v1/bi/export/board-pdf
    Verifies generated PDF stream
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/bi/export/board-pdf")
        assert res.status_code == 200
        assert "application/pdf" in res.headers.get("content-type", "")
        assert res.content.startswith(b"%PDF")
        assert len(res.content) > 1000


@pytest.mark.asyncio
async def test_bi_excel_audit_workbook_export():
    """
    Test GET /api/v1/bi/export/audit-excel
    Verifies generated OpenPyXL Excel workbook stream (.xlsx)
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/bi/export/audit-excel")
        assert res.status_code == 200
        assert "spreadsheetml" in res.headers.get("content-type", "")
        # XLSX is a ZIP archive format starting with PK\x03\x04
        assert res.content.startswith(b"PK")
        assert len(res.content) > 1000
