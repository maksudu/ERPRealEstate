from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.core.database import get_db
from app.modules.bi.schemas import (
    ExecutiveBICockpitResponse,
    PortfolioValuationResponse,
    CashRunwayHorizonResponse,
    SalesVelocityItem,
    ProjectProfitabilityComparison,
    ProjectOverdueHeatmapRow,
)
from app.modules.bi.services import BIEngineService
from app.modules.bi.report_generator import BIReportGenerator

router = APIRouter(prefix="/bi", tags=["Executive Management BI Cockpit"])


@router.get("/cockpit", response_model=ExecutiveBICockpitResponse)
async def get_executive_cockpit(db: AsyncSession = Depends(get_db)):
    """
    Returns unified executive BI Cockpit data:
    Portfolio valuation, 90/180-day cash runway, EVM SPI/CPI, sales velocity, and overdue heatmap.
    """
    return await BIEngineService.get_cockpit_summary(db)


@router.get("/valuation", response_model=PortfolioValuationResponse)
async def get_portfolio_valuation(db: AsyncSession = Depends(get_db)):
    """
    Returns total portfolio asset value, sold vs unsold inventory valuation and units count.
    """
    return await BIEngineService.compute_portfolio_valuation(db)


@router.get("/runway", response_model=CashRunwayHorizonResponse)
async def get_cash_runway(
    horizon_days: int = Query(90, description="Horizon window: 90, 180, 365 days"),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes net cash runway: Projected inflows (installments, PDCs, leases) vs committed liabilities (POs, RA bills, labor).
    """
    return await BIEngineService.compute_cash_runway(db, horizon_days)


@router.get("/sales-velocity", response_model=List[SalesVelocityItem])
async def get_sales_velocity(db: AsyncSession = Depends(get_db)):
    """
    Returns average days to sell a unit per spatial project and velocity classification.
    """
    return await BIEngineService.compute_sales_velocity(db)


@router.get("/profitability-evm", response_model=List[ProjectProfitabilityComparison])
async def get_profitability_and_evm(db: AsyncSession = Depends(get_db)):
    """
    Returns project-wise revenue, land, construction, gross margin %, IRR %, and EVM (PV, EV, AC, SPI, CPI).
    """
    return await BIEngineService.compute_profitability_and_evm(db)


@router.get("/overdue-heatmap", response_model=List[ProjectOverdueHeatmapRow])
async def get_overdue_heatmap(db: AsyncSession = Depends(get_db)):
    """
    Returns matrix heatmap of overdue buyer collections categorized into aging buckets (0-30, 31-60, 61-90, 91-180, 180+ days).
    """
    return await BIEngineService.compute_overdue_heatmap(db)


@router.get("/export/board-pdf")
async def export_board_presentation_pdf(db: AsyncSession = Depends(get_db)):
    """
    1-Click download of executive Board Presentation PDF report.
    """
    cockpit_data = await BIEngineService.get_cockpit_summary(db)
    pdf_bytes = BIReportGenerator.generate_board_presentation_pdf(cockpit_data)
    filename = f"Board_Presentation_Executive_BI_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/audit-excel")
async def export_audit_excel_workbook(db: AsyncSession = Depends(get_db)):
    """
    1-Click download of multi-tab Excel financial audit workbook (.xlsx).
    """
    cockpit_data = await BIEngineService.get_cockpit_summary(db)
    xlsx_bytes = BIReportGenerator.generate_excel_audit_workbook(cockpit_data)
    filename = f"Executive_Audit_Workbook_{datetime.now().strftime('%Y%m%d')}.xlsx"

    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
