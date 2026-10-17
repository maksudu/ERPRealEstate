"""
Database Migration & Lookup Seeding Script:
PROMPT 13: Executive Management BI Cockpit, Cash Runway & Project Profitability Forecasting

Modules:
- bi_executive_snapshots
- bi_project_profitability_forecasts
- Dynamic Lookups: BI_RUNWAY_HORIZON, BI_HEATMAP_BUCKET, BI_PROFITABILITY_METRIC, BI_REPORT_EXPORT_TYPE
"""

import asyncio
import logging
import os
import sys
from datetime import date, timedelta
from decimal import Decimal

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.modules.auth.models
import app.modules.lookups.models
import app.modules.land.models
import app.modules.projects.models
import app.modules.inventory.models
import app.modules.crm.models
import app.modules.sales.models
import app.modules.installments.models
import app.modules.construction.models
import app.modules.procurement.models
import app.modules.accounts.models
import app.modules.handover.models
import app.modules.operations.models
import app.modules.hrms.models
import app.modules.tax.models
import app.modules.governance.models
import app.modules.legal.models
import app.modules.bi.models

from sqlalchemy import text, select
from app.core.database import AsyncSessionLocal, engine
from app.modules.projects.models import Project
from app.modules.bi.models import ExecutiveSnapshot, ProjectProfitabilityForecast

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_bi_cockpit")

TABLE_DDL = [
    """
    CREATE TABLE IF NOT EXISTS `bi_executive_snapshots` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `snapshot_date` DATE NOT NULL,
        `total_portfolio_asset_value` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `total_sold_inventory_value` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `total_unsold_inventory_value` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `units_sold_count` INT NOT NULL DEFAULT 0,
        `units_unsold_count` INT NOT NULL DEFAULT 0,
        `cash_runway_90d_inflow` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `cash_runway_90d_outflow` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `net_cash_runway_90d` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `cash_runway_180d_inflow` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `cash_runway_180d_outflow` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `net_cash_runway_180d` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `average_sales_velocity_days` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        `overall_spi` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
        `overall_cpi` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_snap_date` (`snapshot_date`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS `bi_project_profitability_forecasts` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `project_id` BIGINT NOT NULL,
        `total_revenue_bdt` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `land_cost_bdt` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `construction_cost_bdt` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `statutory_overhead_cost_bdt` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `total_cost_bdt` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `projected_gross_profit_bdt` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `gross_profit_margin_pct` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
        `projected_irr_pct` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
        `sales_velocity_avg_days` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        `planned_value_pv` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `earned_value_ev` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `actual_cost_ac` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `spi_index` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
        `cpi_index` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
        `evm_status` VARCHAR(32) NOT NULL DEFAULT 'ON_TRACK',
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_fc_project_id` (`project_id`),
        CONSTRAINT `fk_fc_project` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

LOOKUP_SEEDS = [
    {
        "category_code": "BI_RUNWAY_HORIZON",
        "category_name": "Cash Runway Horizon Windows",
        "description": "Liquidity forecasting windows for cash runway and burn projections",
        "items": [
            ("DAYS_90", "90 Days (Q1 Immediate Liquidity)", 1),
            ("DAYS_180", "180 Days (H1 Strategic Planning)", 2),
            ("DAYS_365", "365 Days (Full Fiscal Year Horizon)", 3),
        ]
    },
    {
        "category_code": "BI_HEATMAP_BUCKET",
        "category_name": "Overdue Collection Aging Buckets",
        "description": "Aging classification categories for installment collection heatmaps",
        "items": [
            ("0_30_DAYS", "0-30 Days (Current Grace Window)", 1),
            ("31_60_DAYS", "31-60 Days (Mild Overdue / 1st Reminder)", 2),
            ("61_90_DAYS", "61-90 Days (Severe Delinquent / Formal Notice)", 3),
            ("91_180_DAYS", "91-180 Days (Critical Default / Allotment Cancel Risk)", 4),
            ("180_PLUS_DAYS", "180+ Days (Legal Proceeding / NI 138 Trigger)", 5),
        ]
    },
    {
        "category_code": "BI_PROFITABILITY_METRIC",
        "category_name": "BI Profitability & EVM Performance Indicators",
        "description": "Key financial return and earned value metrics for executive comparison",
        "items": [
            ("GROSS_PROFIT", "Gross Profit Margin (%)", 1),
            ("PROJECTED_IRR", "Projected Internal Rate of Return (IRR %)", 2),
            ("SPI_SCHEDULE", "Schedule Performance Index (SPI = EV/PV)", 3),
            ("CPI_COST", "Cost Performance Index (CPI = EV/AC)", 4),
        ]
    },
    {
        "category_code": "BI_REPORT_EXPORT_TYPE",
        "category_name": "Executive Report Export Formats",
        "description": "Report presentation and workbook download types for Board Meetings",
        "items": [
            ("BOARD_PDF", "Board Presentation Executive PDF (Landscape)", 1),
            ("AUDIT_EXCEL", "Detailed Audit Workbook (Excel .xlsx)", 2),
            ("RUNWAY_SENSITIVITY", "Cash Runway Liquidity Sensitivity Matrix", 3),
        ]
    }
]


async def run_migration():
    async with engine.begin() as conn:
        logger.info("Executing DDL for BI Cockpit tables...")
        for ddl in TABLE_DDL:
            await conn.execute(text(ddl))

    logger.info("Seeding dynamic lookup categories and items...")
    async with AsyncSessionLocal() as session:
        for cat in LOOKUP_SEEDS:
            res = await session.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"),
                {"code": cat["category_code"]}
            )
            cat_id = res.scalar()
            if not cat_id:
                insert_cat = text("""
                    INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active, created_at, updated_at)
                    VALUES (:code, :name, :desc, 1, NOW(), NOW())
                """)
                res_ins = await session.execute(insert_cat, {
                    "code": cat["category_code"],
                    "name": cat["category_name"],
                    "desc": cat["description"]
                })
                cat_id = res_ins.lastrowid
                logger.info(f"Created lookup category: {cat['category_code']}")

            for item_code, item_label, sort_order in cat["items"]:
                res_item = await session.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cat_id AND item_code = :item_code"),
                    {"cat_id": cat_id, "item_code": item_code}
                )
                if not res_item.scalar():
                    insert_item = text("""
                        INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, sort_order, is_active, created_at, updated_at)
                        VALUES (:cat_id, :code, :name_en, :sort, 1, NOW(), NOW())
                    """)
                    await session.execute(insert_item, {
                        "cat_id": cat_id,
                        "code": item_code,
                        "name_en": item_label,
                        "sort": sort_order
                    })

        # Seed realistic project profitability forecasts if empty
        fc_count = (await session.execute(select(text("COUNT(*) FROM bi_project_profitability_forecasts")))).scalar()
        if fc_count == 0:
            logger.info("Seeding benchmark project profitability & EVM forecasts...")
            p_res = await session.execute(select(Project))
            projects = p_res.scalars().all()
            for p in projects:
                base_rev = Decimal("320000000.00") + Decimal(str(p.id * 65000000))
                land_c = base_rev * Decimal("0.32")
                con_c = base_rev * Decimal("0.42")
                ovh_c = base_rev * Decimal("0.05")
                tot_c = land_c + con_c + ovh_c
                profit = base_rev - tot_c
                margin = (profit / base_rev) * 100
                irr = Decimal("24.8") + Decimal(str(p.id * 1.5))
                pv = con_c * Decimal("0.55")
                ev = pv * Decimal("1.05") # 5% ahead of schedule
                ac = ev / Decimal("1.03") # 3% cost efficiency
                spi = ev / pv if pv > 0 else Decimal("1.00")
                cpi = ev / ac if ac > 0 else Decimal("1.00")

                fc = ProjectProfitabilityForecast(
                    project_id=p.id,
                    total_revenue_bdt=base_rev,
                    land_cost_bdt=land_c,
                    construction_cost_bdt=con_c,
                    statutory_overhead_cost_bdt=ovh_c,
                    total_cost_bdt=tot_c,
                    projected_gross_profit_bdt=profit,
                    gross_profit_margin_pct=round(margin, 2),
                    projected_irr_pct=round(irr, 2),
                    sales_velocity_avg_days=Decimal("29.5"),
                    planned_value_pv=round(pv, 2),
                    earned_value_ev=round(ev, 2),
                    actual_cost_ac=round(ac, 2),
                    spi_index=round(spi, 2),
                    cpi_index=round(cpi, 2),
                    evm_status="AHEAD_OF_SCHEDULE"
                )
                session.add(fc)

        await session.commit()
        logger.info("BI Cockpit migration and seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(run_migration())
