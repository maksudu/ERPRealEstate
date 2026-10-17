from sqlalchemy import (
    Column, BigInteger, String, Numeric, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class ExecutiveSnapshot(Base):
    """
    Executive Management BI Snapshot recording point-in-time valuation, runway and EVM metrics.
    """
    __tablename__ = "bi_executive_snapshots"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    snapshot_date = Column(Date, nullable=False, index=True)
    
    # Portfolio Valuation
    total_portfolio_asset_value = Column(Numeric(18, 2), nullable=False, default=0.00)
    total_sold_inventory_value = Column(Numeric(18, 2), nullable=False, default=0.00)
    total_unsold_inventory_value = Column(Numeric(18, 2), nullable=False, default=0.00)
    units_sold_count = Column(Integer, nullable=False, default=0)
    units_unsold_count = Column(Integer, nullable=False, default=0)
    
    # Cash Runway (90 & 180 Days)
    cash_runway_90d_inflow = Column(Numeric(18, 2), nullable=False, default=0.00)
    cash_runway_90d_outflow = Column(Numeric(18, 2), nullable=False, default=0.00)
    net_cash_runway_90d = Column(Numeric(18, 2), nullable=False, default=0.00)
    cash_runway_180d_inflow = Column(Numeric(18, 2), nullable=False, default=0.00)
    cash_runway_180d_outflow = Column(Numeric(18, 2), nullable=False, default=0.00)
    net_cash_runway_180d = Column(Numeric(18, 2), nullable=False, default=0.00)
    
    # Velocity & EVM
    average_sales_velocity_days = Column(Numeric(8, 2), nullable=False, default=0.00)
    overall_spi = Column(Numeric(5, 2), nullable=False, default=1.00)
    overall_cpi = Column(Numeric(5, 2), nullable=False, default=1.00)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class ProjectProfitabilityForecast(Base):
    """
    Project-level profitability comparison and Earned Value Management (EVM) tracking.
    """
    __tablename__ = "bi_project_profitability_forecasts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    total_revenue_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    land_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    construction_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    statutory_overhead_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    total_cost_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    
    projected_gross_profit_bdt = Column(Numeric(18, 2), nullable=False, default=0.00)
    gross_profit_margin_pct = Column(Numeric(6, 2), nullable=False, default=0.00)
    projected_irr_pct = Column(Numeric(6, 2), nullable=False, default=0.00)
    sales_velocity_avg_days = Column(Numeric(8, 2), nullable=False, default=0.00)
    
    # EVM Performance
    planned_value_pv = Column(Numeric(18, 2), nullable=False, default=0.00)
    earned_value_ev = Column(Numeric(18, 2), nullable=False, default=0.00)
    actual_cost_ac = Column(Numeric(18, 2), nullable=False, default=0.00)
    spi_index = Column(Numeric(5, 2), nullable=False, default=1.00)
    cpi_index = Column(Numeric(5, 2), nullable=False, default=1.00)
    evm_status = Column(String(32), nullable=False, default="ON_TRACK") # ON_TRACK, COST_OVERRUN, SCHEDULE_DELAYED, AHEAD_OF_SCHEDULE

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
