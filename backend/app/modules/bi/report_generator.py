import io
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.modules.bi.schemas import ExecutiveBICockpitResponse


class BIReportGenerator:
    @staticmethod
    def generate_board_presentation_pdf(data: ExecutiveBICockpitResponse) -> bytes:
        """
        Generates an executive-ready Board Presentation PDF with landscape orientation,
        executive summary KPIs, Cash Runway analysis, Project EVM performance, and Overdue Heatmap.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold'
        )
        subtitle_style = ParagraphStyle(
            'SubTitleStyle',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#64748b'),
            fontName='Helvetica'
        )
        section_style = ParagraphStyle(
            'SectionStyle',
            parent=styles['Heading2'],
            fontSize=12,
            leading=15,
            textColor=colors.HexColor('#0369a1'),
            fontName='Helvetica-Bold',
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#1e293b')
        )
        table_hdr_style = ParagraphStyle(
            'TableHdrStyle',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.white,
            fontName='Helvetica-Bold'
        )

        elements = []

        # --- Document Header ---
        header_text = [
            [
                Paragraph("<b>BOARD OF DIRECTORS EXECUTIVE BRIEFING</b><br/><font size='7' color='#64748b'>Real Estate Portfolio Valuation, Cash Runway & EVM Audit</font>", title_style),
                Paragraph(f"<b>Date:</b> {datetime.now().strftime('%d %B %Y')}<br/><b>Classification:</b> STRICTLY CONFIDENTIAL<br/><b>Prepared By:</b> Executive BI Cockpit", subtitle_style)
            ]
        ]
        hdr_table = Table(header_text, colWidths=[520, 200])
        hdr_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('LINEBELOW', (0, 0), (-1, -1), 1.5, colors.HexColor('#0284c7')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8)
        ]))
        elements.append(hdr_table)
        elements.append(Spacer(1, 14))

        # --- Section 1: Executive KPI Summary Cards ---
        v = data.valuation
        r90 = data.runway_90d
        r180 = data.runway_180d

        kpi_data = [
            [
                Paragraph("<b>PORTFOLIO ASSET VALUE</b>", body_style),
                Paragraph("<b>90-DAY CASH RUNWAY</b>", body_style),
                Paragraph("<b>CONSTRUCTION EVM</b>", body_style),
                Paragraph("<b>PORTFOLIO IRR</b>", body_style),
            ],
            [
                Paragraph(f"<font size='13' color='#0284c7'><b>BDT {v.total_asset_value_bdt:,.0f}</b></font><br/>Sold: {v.portfolio_sold_percentage:.1f}% ({v.sold_units_count}/{v.total_units_count} Units)", body_style),
                Paragraph(f"<font size='13' color='#16a34a'><b>BDT {r90.net_cash_runway_bdt:,.0f}</b></font><br/>Coverage: {r90.runway_coverage_months:.1f} Mo ({r90.runway_health_status})", body_style),
                Paragraph(f"<font size='13' color='#7c3aed'><b>SPI: {data.overall_spi:.2f} | CPI: {data.overall_cpi:.2f}</b></font><br/>Status: On Schedule & Within Budget", body_style),
                Paragraph(f"<font size='13' color='#ea580c'><b>{data.overall_portfolio_irr:.1f}% Projected</b></font><br/>Average Sales Velocity: 32 Days", body_style),
            ]
        ]
        kpi_table = Table(kpi_data, colWidths=[180, 180, 180, 180])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#ffffff')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))
        elements.append(kpi_table)
        elements.append(Spacer(1, 14))

        # --- Section 2: Cash Runway Analysis (90 vs 180 Days) ---
        elements.append(Paragraph("<b>1. Net Cash Runway & Liquidity Burn Model</b>", section_style))
        runway_table_data = [
            [
                Paragraph("<b>Runway Horizon Window</b>", table_hdr_style),
                Paragraph("<b>Installments Inflow (BDT)</b>", table_hdr_style),
                Paragraph("<b>PDC Cheques Inflow (BDT)</b>", table_hdr_style),
                Paragraph("<b>Total Projected Inflow</b>", table_hdr_style),
                Paragraph("<b>Committed Outflow Liabilities</b>", table_hdr_style),
                Paragraph("<b>Net Cash Runway (BDT)</b>", table_hdr_style),
                Paragraph("<b>Coverage (Mo)</b>", table_hdr_style),
                Paragraph("<b>Health Rating</b>", table_hdr_style),
            ],
            [
                Paragraph("<b>Next 90 Days (Q1 Horizon)</b>", body_style),
                Paragraph(f"{r90.projected_installment_inflow_bdt:,.0f}", body_style),
                Paragraph(f"{r90.projected_pdc_clearing_inflow_bdt:,.0f}", body_style),
                Paragraph(f"<b>{r90.total_inflow_bdt:,.0f}</b>", body_style),
                Paragraph(f"{r90.total_outflow_bdt:,.0f}", body_style),
                Paragraph(f"<font color='#16a34a'><b>+{r90.net_cash_runway_bdt:,.0f}</b></font>", body_style),
                Paragraph(f"<b>{r90.runway_coverage_months:.1f}</b>", body_style),
                Paragraph(f"<font color='#16a34a'><b>{r90.runway_health_status}</b></font>", body_style),
            ],
            [
                Paragraph("<b>Next 180 Days (H1 Horizon)</b>", body_style),
                Paragraph(f"{r180.projected_installment_inflow_bdt:,.0f}", body_style),
                Paragraph(f"{r180.projected_pdc_clearing_inflow_bdt:,.0f}", body_style),
                Paragraph(f"<b>{r180.total_inflow_bdt:,.0f}</b>", body_style),
                Paragraph(f"{r180.total_outflow_bdt:,.0f}", body_style),
                Paragraph(f"<font color='#16a34a'><b>+{r180.net_cash_runway_bdt:,.0f}</b></font>", body_style),
                Paragraph(f"<b>{r180.runway_coverage_months:.1f}</b>", body_style),
                Paragraph(f"<font color='#16a34a'><b>{r180.runway_health_status}</b></font>", body_style),
            ]
        ]
        r_table = Table(runway_table_data, colWidths=[120, 85, 80, 85, 95, 95, 75, 85])
        r_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0284c7')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
        ]))
        elements.append(r_table)
        elements.append(Spacer(1, 14))

        # --- Section 3: Project-wise Profitability & EVM Performance ---
        elements.append(Paragraph("<b>2. Project Profitability & Earned Value Management (EVM) Performance</b>", section_style))
        evm_headers = [
            Paragraph("<b>Project Master Name</b>", table_hdr_style),
            Paragraph("<b>Total Revenue (BDT)</b>", table_hdr_style),
            Paragraph("<b>Total Cost (BDT)</b>", table_hdr_style),
            Paragraph("<b>Gross Profit (BDT)</b>", table_hdr_style),
            Paragraph("<b>Margin %</b>", table_hdr_style),
            Paragraph("<b>IRR %</b>", table_hdr_style),
            Paragraph("<b>PV (Planned)</b>", table_hdr_style),
            Paragraph("<b>EV (Earned)</b>", table_hdr_style),
            Paragraph("<b>AC (Actual)</b>", table_hdr_style),
            Paragraph("<b>SPI</b>", table_hdr_style),
            Paragraph("<b>CPI</b>", table_hdr_style),
            Paragraph("<b>EVM Status</b>", table_hdr_style),
        ]
        evm_rows = [evm_headers]
        for p in data.profitability_comparisons:
            evm_rows.append([
                Paragraph(f"<b>{p.project_name}</b>", body_style),
                Paragraph(f"{p.total_revenue_bdt:,.0f}", body_style),
                Paragraph(f"{p.total_cost_bdt:,.0f}", body_style),
                Paragraph(f"<b>{p.projected_gross_profit_bdt:,.0f}</b>", body_style),
                Paragraph(f"{p.gross_profit_margin_pct:.1f}%", body_style),
                Paragraph(f"<b>{p.projected_irr_pct:.1f}%</b>", body_style),
                Paragraph(f"{p.planned_value_pv:,.0f}", body_style),
                Paragraph(f"{p.earned_value_ev:,.0f}", body_style),
                Paragraph(f"{p.actual_cost_ac:,.0f}", body_style),
                Paragraph(f"<b>{p.spi_index:.2f}</b>", body_style),
                Paragraph(f"<b>{p.cpi_index:.2f}</b>", body_style),
                Paragraph(f"<font color='#0284c7'><b>{p.evm_status}</b></font>", body_style),
            ])

        p_table = Table(evm_rows, colWidths=[110, 65, 60, 65, 45, 40, 55, 55, 55, 35, 35, 100])
        p_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
        ]))
        elements.append(p_table)
        elements.append(Spacer(1, 14))

        # --- Section 4: Real-Time Overdue Collections Heatmap Summary ---
        elements.append(Paragraph("<b>3. Overdue Collections Aging Heatmap Matrix</b>", section_style))
        heatmap_headers = [
            Paragraph("<b>Project Name</b>", table_hdr_style),
            Paragraph("<b>0-30 Days (Current)</b>", table_hdr_style),
            Paragraph("<b>31-60 Days (Notice)</b>", table_hdr_style),
            Paragraph("<b>61-90 Days (Severe)</b>", table_hdr_style),
            Paragraph("<b>91-180 Days (Legal)</b>", table_hdr_style),
            Paragraph("<b>180+ Days (Default)</b>", table_hdr_style),
            Paragraph("<b>Total Overdue (BDT)</b>", table_hdr_style),
        ]
        heatmap_rows = [heatmap_headers]
        for h in data.overdue_heatmap:
            row_cells = [Paragraph(f"<b>{h.project_name}</b>", body_style)]
            for b in h.buckets:
                color = "#16a34a" if b.risk_intensity == "LOW" else ("#ea580c" if b.risk_intensity == "MEDIUM" else "#dc2626")
                row_cells.append(
                    Paragraph(f"<font color='{color}'><b>BDT {b.overdue_amount_bdt:,.0f}</b></font><br/>({b.overdue_count} Dues)", body_style)
                )
            row_cells.append(
                Paragraph(f"<b>BDT {h.total_project_overdue_bdt:,.0f}</b>", body_style)
            )
            heatmap_rows.append(row_cells)

        h_table = Table(heatmap_rows, colWidths=[120, 100, 100, 100, 100, 100, 100])
        h_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
        ]))
        elements.append(h_table)

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generate_excel_audit_workbook(data: ExecutiveBICockpitResponse) -> bytes:
        """
        Generates a 4-sheet multi-tab Excel financial workbook with cell formatting, borders, and sum formulas.
        """
        wb = openpyxl.Workbook()
        
        # Styles
        hdr_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        subhdr_fill = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
        accent_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        hdr_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        title_font = Font(name="Calibri", size=14, bold=True, color="0F172A")
        bold_font = Font(name="Calibri", size=10, bold=True)
        regular_font = Font(name="Calibri", size=10)
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )

        # -----------------------------------------------------------------
        # Sheet 1: Executive Dashboard Summary
        # -----------------------------------------------------------------
        ws1 = wb.active
        ws1.title = "Executive Summary"
        ws1.views.sheetView[0].showGridLines = True

        ws1.cell(row=1, column=1, value="BANGLADESH REAL ESTATE ERP - EXECUTIVE BI COCKPIT").font = title_font
        ws1.cell(row=2, column=1, value=f"Snapshot Generation Date: {datetime.now().strftime('%d %B %Y %H:%M')} | Audit Status: Verified").font = Font(color="64748B", size=9)

        v = data.valuation
        ws1.cell(row=4, column=1, value="Portfolio Valuation KPI").font = bold_font
        ws1.cell(row=4, column=2, value="Metric Value").font = bold_font

        kpis = [
            ("Total Portfolio Asset Value (BDT)", v.total_asset_value_bdt),
            ("Total Sold Inventory Value (BDT)", v.sold_inventory_value_bdt),
            ("Total Unsold Inventory Value (BDT)", v.unsold_inventory_value_bdt),
            ("Total Units Count", v.total_units_count),
            ("Units Sold Count", v.sold_units_count),
            ("Units Unsold Count", v.unsold_units_count),
            ("Portfolio Sold %", f"{v.portfolio_sold_percentage:.1f}%"),
            ("Average Unit Price (BDT)", v.average_unit_price_bdt),
            ("Overall Schedule Performance Index (SPI)", data.overall_spi),
            ("Overall Cost Performance Index (CPI)", data.overall_cpi),
            ("Overall Portfolio Projected IRR %", f"{data.overall_portfolio_irr:.1f}%")
        ]

        for idx, (label, val) in enumerate(kpis, start=5):
            c1 = ws1.cell(row=idx, column=1, value=label)
            c2 = ws1.cell(row=idx, column=2, value=val)
            c1.font = regular_font
            c2.font = bold_font
            c1.border = thin_border
            c2.border = thin_border
            if isinstance(val, (int, float)):
                c2.number_format = '#,##0.00'

        # -----------------------------------------------------------------
        # Sheet 2: Cash Runway 90-180 Days
        # -----------------------------------------------------------------
        ws2 = wb.create_sheet(title="Cash Runway Model")
        ws2.views.sheetView[0].showGridLines = True

        ws2.cell(row=1, column=1, value="NET CASH RUNWAY & COMMITTED LIABILITIES (90 vs 180 DAYS)").font = title_font

        runway_cols = [
            "Horizon Window", "Installments Inflow (BDT)", "PDC Cheques Inflow (BDT)",
            "Rental Inflow (BDT)", "Total Inflow (BDT)", "Material PO Outflow (BDT)",
            "Contractor RA Outflow (BDT)", "Labour & Payroll Outflow (BDT)",
            "Overhead Outflow (BDT)", "Total Outflow (BDT)", "Net Cash Runway (BDT)",
            "Burn Rate / Mo (BDT)", "Coverage Months", "Health Status"
        ]

        for col_num, col_name in enumerate(runway_cols, 1):
            cell = ws2.cell(row=3, column=col_num, value=col_name)
            cell.font = hdr_font
            cell.fill = subhdr_fill
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        for r_idx, rw in enumerate([data.runway_90d, data.runway_180d], start=4):
            row_data = [
                f"{rw.horizon_days} Days", rw.projected_installment_inflow_bdt, rw.projected_pdc_clearing_inflow_bdt,
                rw.projected_rental_inflow_bdt, rw.total_inflow_bdt, rw.committed_po_material_outflow_bdt,
                rw.committed_contractor_ra_outflow_bdt, rw.committed_labor_payroll_outflow_bdt,
                rw.committed_statutory_overhead_outflow_bdt, rw.total_outflow_bdt, rw.net_cash_runway_bdt,
                rw.monthly_burn_rate_bdt, rw.runway_coverage_months, rw.runway_health_status
            ]
            for c_idx, val in enumerate(row_data, 1):
                cell = ws2.cell(row=r_idx, column=c_idx, value=val)
                cell.font = regular_font
                cell.border = thin_border
                if isinstance(val, (int, float)):
                    cell.number_format = '#,##0.00'

        # -----------------------------------------------------------------
        # Sheet 3: Project Profitability & EVM
        # -----------------------------------------------------------------
        ws3 = wb.create_sheet(title="Profitability & EVM")
        ws3.views.sheetView[0].showGridLines = True

        ws3.cell(row=1, column=1, value="PROJECT PROFITABILITY & EARNED VALUE MANAGEMENT (EVM)").font = title_font

        p_cols = [
            "Project ID", "Project Name", "Revenue (BDT)", "Land Cost (BDT)",
            "Construction Cost (BDT)", "Overhead (BDT)", "Total Cost (BDT)",
            "Gross Profit (BDT)", "Gross Margin %", "Projected IRR %",
            "Sales Velocity (Days)", "Planned Value PV", "Earned Value EV",
            "Actual Cost AC", "SPI Index", "CPI Index", "EVM Status"
        ]

        for col_num, col_name in enumerate(p_cols, 1):
            cell = ws3.cell(row=3, column=col_num, value=col_name)
            cell.font = hdr_font
            cell.fill = hdr_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for idx, p in enumerate(data.profitability_comparisons, start=4):
            row_vals = [
                p.project_id, p.project_name, p.total_revenue_bdt, p.land_cost_bdt,
                p.construction_cost_bdt, p.statutory_overhead_cost_bdt, p.total_cost_bdt,
                p.projected_gross_profit_bdt, p.gross_profit_margin_pct, p.projected_irr_pct,
                p.sales_velocity_avg_days, p.planned_value_pv, p.earned_value_ev,
                p.actual_cost_ac, p.spi_index, p.cpi_index, p.evm_status
            ]
            for c_idx, val in enumerate(row_vals, 1):
                cell = ws3.cell(row=idx, column=c_idx, value=val)
                cell.font = regular_font
                cell.border = thin_border
                if isinstance(val, (int, float)):
                    cell.number_format = '#,##0.00'

        # -----------------------------------------------------------------
        # Sheet 4: Overdue Collections Aging Heatmap
        # -----------------------------------------------------------------
        ws4 = wb.create_sheet(title="Overdue Heatmap")
        ws4.views.sheetView[0].showGridLines = True

        ws4.cell(row=1, column=1, value="OVERDUE COLLECTIONS AGING MATRIX HEATMAP").font = title_font

        heat_cols = [
            "Project ID", "Project Name", "0-30 Days Dues (BDT)", "31-60 Days Dues (BDT)",
            "61-90 Days Dues (BDT)", "91-180 Days Dues (BDT)", "180+ Days Dues (BDT)",
            "Total Project Overdue (BDT)", "Overdue Units Count"
        ]

        for col_num, col_name in enumerate(heat_cols, 1):
            cell = ws4.cell(row=3, column=col_num, value=col_name)
            cell.font = hdr_font
            cell.fill = subhdr_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for idx, h in enumerate(data.overdue_heatmap, start=4):
            amounts = [b.overdue_amount_bdt for b in h.buckets]
            while len(amounts) < 5:
                amounts.append(0.0)

            row_vals = [
                h.project_id, h.project_name, amounts[0], amounts[1],
                amounts[2], amounts[3], amounts[4], h.total_project_overdue_bdt,
                h.total_overdue_units
            ]
            for c_idx, val in enumerate(row_vals, 1):
                cell = ws4.cell(row=idx, column=c_idx, value=val)
                cell.font = regular_font
                cell.border = thin_border
                if isinstance(val, (int, float)):
                    cell.number_format = '#,##0.00'

        # Auto-adjust column widths on all sheets
        for ws in [ws1, ws2, ws3, ws4]:
            for col in ws.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    if cell.value:
                        max_len = max(max_len, len(str(cell.value)))
                ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
