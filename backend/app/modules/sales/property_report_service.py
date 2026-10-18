import io
from datetime import datetime, date
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_, and_, desc
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.modules.inventory.models import Unit
from app.modules.projects.models import Project
from app.modules.sales.models import Booking, DeedRegistration, PropertyHandover
from app.modules.crm.models import Customer
from app.modules.sales.schemas import PropertyReportItem, PropertyReportResponse


async def fetch_property_report_data(
    db: AsyncSession,
    search: Optional[str] = None,
    project_id: Optional[int] = None,
    unit_type: Optional[str] = None,
    inventory_status: Optional[str] = None,
    workflow_stage: Optional[str] = None,
    possession_status: Optional[str] = None,
    facing: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    limit: Optional[int] = 20,
    offset: Optional[int] = 0
) -> Tuple[List[PropertyReportItem], int, Dict[str, Any]]:
    """
    Queries units, projects, bookings, customers, deed registrations, and handovers
    to generate an analytical property portfolio dataset.
    """
    # Base SELECT query with outer joins
    stmt = (
        select(
            Unit,
            Project,
            Booking,
            Customer,
            DeedRegistration,
            PropertyHandover
        )
        .join(Project, Unit.project_id == Project.id)
        .outerjoin(
            Booking,
            and_(
                Booking.unit_id == Unit.id,
                Booking.status != "CANCELLED"
            )
        )
        .outerjoin(Customer, Booking.primary_customer_id == Customer.id)
        .outerjoin(DeedRegistration, DeedRegistration.unit_id == Unit.id)
        .outerjoin(PropertyHandover, PropertyHandover.unit_id == Unit.id)
    )

    # Dynamic filter expressions
    conditions = []

    if project_id:
        conditions.append(Unit.project_id == project_id)

    if unit_type:
        conditions.append(Unit.unit_type_id == unit_type)

    if inventory_status:
        conditions.append(Unit.status_id == inventory_status)

    if facing:
        conditions.append(Unit.facing_id == facing)

    if workflow_stage and workflow_stage.strip():
        conditions.append(Booking.workflow_stage == workflow_stage)

    if possession_status and possession_status.strip():
        conditions.append(PropertyHandover.physical_possession_status == possession_status)

    if min_price is not None:
        conditions.append(
            or_(
                Booking.final_contract_value >= min_price,
                and_(Booking.final_contract_value == None, Unit.total_unit_price >= min_price)
            )
        )

    if max_price is not None:
        conditions.append(
            or_(
                Booking.final_contract_value <= max_price,
                and_(Booking.final_contract_value == None, Unit.total_unit_price <= max_price)
            )
        )

    if min_area is not None:
        conditions.append(Unit.gross_saleable_area_sqft >= min_area)

    if max_area is not None:
        conditions.append(Unit.gross_saleable_area_sqft <= max_area)

    if search and search.strip():
        s = f"%{search.strip()}%"
        conditions.append(
            or_(
                Unit.unit_number.ilike(s),
                Project.project_name.ilike(s),
                Project.project_code.ilike(s),
                Booking.booking_reference_no.ilike(s),
                Customer.full_name_en.ilike(s),
                Customer.primary_phone.ilike(s),
                PropertyHandover.handover_certificate_no.ilike(s),
                DeedRegistration.registered_deed_number.ilike(s)
            )
        )

    if conditions:
        stmt = stmt.where(and_(*conditions))

    # Execute full query to compute accurate KPIs and grand totals
    all_results = (await db.execute(stmt.order_by(Project.project_name.asc(), Unit.unit_number.asc()))).all()

    total_count = len(all_results)

    total_portfolio_val = 0.0
    total_collected = 0.0
    total_outstanding = 0.0
    total_handed = 0
    total_available = 0
    total_booked = 0

    all_items: List[PropertyReportItem] = []

    for row in all_results:
        unit: Unit = row[0]
        project: Project = row[1]
        booking: Optional[Booking] = row[2]
        customer: Optional[Customer] = row[3]
        deed: Optional[DeedRegistration] = row[4]
        handover: Optional[PropertyHandover] = row[5]

        list_p = float(unit.total_unit_price or 0.0)
        contract_v = float(booking.final_contract_value) if (booking and booking.final_contract_value is not None) else None
        effective_p = contract_v if contract_v is not None else list_p

        collected = 0.0
        if booking:
            earnest = float(booking.earnest_money_received or 0.0)
            dp = float(booking.down_payment_received or 0.0)
            collected = earnest + dp

        due = max(0.0, effective_p - collected) if booking else 0.0
        pct = round((collected / effective_p * 100), 1) if (booking and effective_p > 0) else 0.0

        inv_status = unit.status_id or "AVAILABLE"
        if inv_status == "AVAILABLE":
            total_available += 1
        elif inv_status in ["BOOKED", "SOLD", "RESERVED"]:
            total_booked += 1

        if handover and handover.physical_possession_status == "FULL_PHYSICAL_POSSESSION":
            total_handed += 1

        total_portfolio_val += effective_p
        total_collected += collected
        total_outstanding += due

        item = PropertyReportItem(
            unit_id=unit.id,
            unit_number=unit.unit_number,
            floor_number=unit.floor_number,
            project_id=project.id,
            project_name=project.project_name,
            project_code=project.project_code,
            unit_type=unit.unit_type_id or "TYPE_3BHK",
            facing=unit.facing_id or "SOUTH_FACING",
            area_sft=float(unit.gross_saleable_area_sqft or 0.0),
            bed_count=unit.bed_count or 3,
            bath_count=unit.bath_count or 3,
            inventory_status=inv_status,
            booking_id=booking.id if booking else None,
            booking_reference_no=booking.booking_reference_no if booking else None,
            workflow_stage=booking.workflow_stage if booking else None,
            customer_name=customer.full_name_en if customer else None,
            customer_phone=customer.primary_phone if customer else None,
            list_price=list_p,
            contract_value=contract_v,
            amount_collected=collected,
            balance_due=due,
            collection_percentage=pct,
            deed_status=deed.status if deed else None,
            deed_number=deed.registered_deed_number if deed else None,
            handover_status=handover.status if handover else None,
            possession_status=handover.physical_possession_status if handover else None,
            handover_date=handover.handover_date if handover else None,
            handover_certificate_no=handover.handover_certificate_no if handover else None
        )
        all_items.append(item)

    kpis = {
        "total_units": total_count,
        "total_portfolio_value": total_portfolio_val,
        "total_collected_amount": total_collected,
        "total_outstanding_amount": total_outstanding,
        "total_handed_over_count": total_handed,
        "total_available_count": total_available,
        "total_booked_count": total_booked
    }

    # Apply pagination slice if limit given
    if limit is not None and offset is not None:
        paged_items = all_items[offset: offset + limit]
    else:
        paged_items = all_items

    return paged_items, total_count, kpis


def generate_property_report_excel(
    items: List[PropertyReportItem],
    kpis: Dict[str, Any],
    filters_summary: Dict[str, str]
) -> bytes:
    """
    Generates a production-grade, beautifully formatted Excel (.xlsx) workbook using OpenPyXL.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Property & Sales Portfolio"
    ws.views.sheetView[0].showGridLines = True

    # Palette
    NAVY_HEADER = "1E293B"
    EMERALD_ACCENT = "059669"
    LIGHT_BG = "F8FAFC"
    ZEBRA_BG = "F1F5F9"
    BORDER_COLOR = "CBD5E1"

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    title_font = Font(name="Calibri", size=16, bold=True, color=NAVY_HEADER)
    subtitle_font = Font(name="Calibri", size=9, italic=True, color="64748B")
    kpi_title_font = Font(name="Calibri", size=9, bold=True, color="64748B")
    kpi_value_font = Font(name="Calibri", size=13, bold=True, color=EMERALD_ACCENT)
    bold_font = Font(name="Calibri", size=10, bold=True)
    normal_font = Font(name="Calibri", size=10)

    header_fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type="solid")
    kpi_fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")
    zebra_fill = PatternFill(start_color=ZEBRA_BG, end_color=ZEBRA_BG, fill_type="solid")

    thin_border = Border(
        left=Side(style="thin", color=BORDER_COLOR),
        right=Side(style="thin", color=BORDER_COLOR),
        top=Side(style="thin", color=BORDER_COLOR),
        bottom=Side(style="thin", color=BORDER_COLOR)
    )
    total_border = Border(
        top=Side(style="thin", color=NAVY_HEADER),
        bottom=Side(style="double", color=NAVY_HEADER)
    )

    # 1. Title Block
    ws.merge_cells("A1:N1")
    ws["A1"] = "BLUE OCEANS ERP — PROPERTY & SALES PORTFOLIO INTELLIGENCE REPORT"
    ws["A1"].font = title_font
    ws["A1"].alignment = Alignment(vertical="center")

    ws.merge_cells("A2:N2")
    ws["A2"] = f"Generated: {datetime.now().strftime('%d %B %Y, %I:%M %p')} | Confidential Management Report"
    ws["A2"].font = subtitle_font
    ws["A2"].alignment = Alignment(vertical="center")

    # 2. Filters Summary
    filter_text = " | ".join([f"{k}: {v}" for k, v in filters_summary.items() if v]) or "All Projects & Inventories"
    ws.merge_cells("A3:N3")
    ws["A3"] = f"Applied Filters: {filter_text}"
    ws["A3"].font = subtitle_font

    ws.row_dimensions[1].height = 24
    ws.row_dimensions[2].height = 16
    ws.row_dimensions[3].height = 16
    ws.row_dimensions[4].height = 8

    # 3. KPI Summary Table (Row 5 - 6)
    kpi_cards = [
        ("Total Properties", f"{kpis.get('total_units', 0):,}", "A", "B"),
        ("Available Units", f"{kpis.get('total_available_count', 0):,}", "C", "D"),
        ("Booked / Sold", f"{kpis.get('total_booked_count', 0):,}", "E", "F"),
        ("Possession Handed Over", f"{kpis.get('total_handed_over_count', 0):,}", "G", "H"),
        ("Total Portfolio Value", f"৳{kpis.get('total_portfolio_value', 0):,.2f}", "I", "J"),
        ("Realized Collections", f"৳{kpis.get('total_collected_amount', 0):,.2f}", "K", "L"),
        ("Outstanding Receivables", f"৳{kpis.get('total_outstanding_amount', 0):,.2f}", "M", "N")
    ]

    for title, val, start_col, end_col in kpi_cards:
        ws.merge_cells(f"{start_col}5:{end_col}5")
        ws.merge_cells(f"{start_col}6:{end_col}6")

        ws[f"{start_col}5"] = title.upper()
        ws[f"{start_col}5"].font = kpi_title_font
        ws[f"{start_col}5"].fill = kpi_fill
        ws[f"{start_col}5"].alignment = Alignment(horizontal="center", vertical="center")

        ws[f"{start_col}6"] = val
        ws[f"{start_col}6"].font = kpi_value_font
        ws[f"{start_col}6"].fill = kpi_fill
        ws[f"{start_col}6"].alignment = Alignment(horizontal="center", vertical="center")

    ws.row_dimensions[5].height = 16
    ws.row_dimensions[6].height = 22
    ws.row_dimensions[7].height = 12

    # 4. Data Headers (Row 8)
    headers = [
        ("Project", 22),
        ("Unit No", 12),
        ("Floor", 8),
        ("Type", 14),
        ("Facing", 16),
        ("Area (Sft)", 12),
        ("Status", 14),
        ("Purchaser / Buyer", 24),
        ("Phone", 15),
        ("List Price (BDT)", 18),
        ("Contract Value (BDT)", 20),
        ("Collected (BDT)", 18),
        ("Balance Due (BDT)", 18),
        ("Collection %", 14),
        ("Deed Status", 16),
        ("Possession Status", 20)
    ]

    header_row_idx = 8
    ws.row_dimensions[header_row_idx].height = 24

    for col_idx, (head_text, width) in enumerate(headers, 1):
        cell = ws.cell(row=header_row_idx, column=col_idx, value=head_text)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = max(width, len(head_text) + 3)

    # 5. Data Rows
    current_row = 9
    for item in items:
        ws.row_dimensions[current_row].height = 18
        is_zebra = (current_row % 2 == 0)
        row_fill = zebra_fill if is_zebra else None

        row_vals = [
            item.project_name,
            item.unit_number,
            item.floor_number,
            item.unit_type.replace("TYPE_", ""),
            item.facing.replace("_", " "),
            item.area_sft,
            item.inventory_status,
            item.customer_name or "—",
            item.customer_phone or "—",
            item.list_price,
            item.contract_value or item.list_price,
            item.amount_collected,
            item.balance_due,
            f"{item.collection_percentage:.1f}%",
            item.deed_status or "Not Registered",
            item.possession_status or "Not Taken"
        ]

        for col_idx, val in enumerate(row_vals, 1):
            cell = ws.cell(row=current_row, column=col_idx, value=val)
            cell.font = normal_font
            cell.border = thin_border
            if row_fill:
                cell.fill = row_fill

            # Alignment & formatting
            if col_idx in [6, 10, 11, 12, 13]:
                cell.alignment = Alignment(horizontal="right", vertical="center")
                if col_idx in [10, 11, 12, 13]:
                    cell.number_format = '#,##0.00'
                elif col_idx == 6:
                    cell.number_format = '#,##0'
            elif col_idx in [2, 3, 4, 7, 14, 15, 16]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

        current_row += 1

    # 6. Grand Totals Row
    ws.row_dimensions[current_row].height = 22
    ws.cell(row=current_row, column=1, value="PORTFOLIO TOTALS").font = bold_font
    ws.cell(row=current_row, column=1).alignment = Alignment(horizontal="left", vertical="center")

    for col in range(1, len(headers) + 1):
        ws.cell(row=current_row, column=col).border = total_border
        ws.cell(row=current_row, column=col).font = bold_font

    ws.cell(row=current_row, column=6, value=f"=SUM(F9:F{current_row-1})").number_format = '#,##0'
    ws.cell(row=current_row, column=10, value=f"=SUM(J9:J{current_row-1})").number_format = '#,##0.00'
    ws.cell(row=current_row, column=11, value=f"=SUM(K9:K{current_row-1})").number_format = '#,##0.00'
    ws.cell(row=current_row, column=12, value=f"=SUM(L9:L{current_row-1})").number_format = '#,##0.00'
    ws.cell(row=current_row, column=13, value=f"=SUM(M9:M{current_row-1})").number_format = '#,##0.00'

    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


def generate_property_report_pdf(
    items: List[PropertyReportItem],
    kpis: Dict[str, Any],
    filters_summary: Dict[str, str]
) -> bytes:
    """
    Generates a landscape, executive PDF report using ReportLab.
    """
    buffer = io.BytesIO()
    # A4 Landscape: width 841.89, height 595.27 pt
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=20,
        rightMargin=20,
        topMargin=20,
        bottomMargin=20
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=2
    )

    meta_style = ParagraphStyle(
        "ReportMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=8
    )

    th_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7,
        textColor=colors.white,
        alignment=1 # Center
    )

    td_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7,
        textColor=colors.HexColor("#1E293B")
    )

    td_right = ParagraphStyle(
        "TableCellRight",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7,
        textColor=colors.HexColor("#1E293B"),
        alignment=2 # Right
    )

    td_bold_right = ParagraphStyle(
        "TableCellBoldRight",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7,
        textColor=colors.HexColor("#0F172A"),
        alignment=2
    )

    elements = []

    # Title & Metadata
    elements.append(Paragraph("BLUE OCEANS ERP — PROPERTY & SALES PORTFOLIO INTELLIGENCE REPORT", title_style))
    filter_text = " | ".join([f"<b>{k}:</b> {v}" for k, v in filters_summary.items() if v]) or "All Portfolios"
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%d %B %Y, %I:%M %p')} &nbsp;|&nbsp; Filters: {filter_text}", meta_style))

    # Executive KPI Summary Table
    kpi_data = [
        [
            Paragraph("<b>TOTAL PROPERTIES</b>", td_style),
            Paragraph("<b>AVAILABLE UNITS</b>", td_style),
            Paragraph("<b>BOOKED / SOLD</b>", td_style),
            Paragraph("<b>HANDED OVER</b>", td_style),
            Paragraph("<b>PORTFOLIO VALUE</b>", td_style),
            Paragraph("<b>COLLECTED AMOUNT</b>", td_style),
            Paragraph("<b>OUTSTANDING RECEIVABLES</b>", td_style)
        ],
        [
            Paragraph(f"<b>{kpis.get('total_units', 0):,}</b>", title_style),
            Paragraph(f"<b>{kpis.get('total_available_count', 0):,}</b>", title_style),
            Paragraph(f"<b>{kpis.get('total_booked_count', 0):,}</b>", title_style),
            Paragraph(f"<b>{kpis.get('total_handed_over_count', 0):,}</b>", title_style),
            Paragraph(f"<b>৳{kpis.get('total_portfolio_value', 0):,.2f}</b>", title_style),
            Paragraph(f"<b>৳{kpis.get('total_collected_amount', 0):,.2f}</b>", title_style),
            Paragraph(f"<b>৳{kpis.get('total_outstanding_amount', 0):,.2f}</b>", title_style)
        ]
    ]

    kpi_table = Table(kpi_data, colWidths=[105, 105, 105, 105, 130, 125, 125])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 10))

    # Master Data Table
    table_headers = [
        Paragraph("Project", th_style),
        Paragraph("Unit", th_style),
        Paragraph("Type", th_style),
        Paragraph("Area (sft)", th_style),
        Paragraph("Status", th_style),
        Paragraph("Purchaser / Buyer", th_style),
        Paragraph("Phone", th_style),
        Paragraph("Contract Value", th_style),
        Paragraph("Collected", th_style),
        Paragraph("Balance Due", th_style),
        Paragraph("Col %", th_style),
        Paragraph("Possession", th_style)
    ]

    table_rows = [table_headers]

    for item in items:
        eff_price = item.contract_value or item.list_price
        table_rows.append([
            Paragraph(item.project_name[:20], td_style),
            Paragraph(item.unit_number, td_style),
            Paragraph(item.unit_type.replace("TYPE_", ""), td_style),
            Paragraph(f"{item.area_sft:,.0f}", td_right),
            Paragraph(item.inventory_status, td_style),
            Paragraph((item.customer_name or "—")[:22], td_style),
            Paragraph(item.customer_phone or "—", td_style),
            Paragraph(f"৳{eff_price:,.2f}", td_right),
            Paragraph(f"৳{item.amount_collected:,.2f}", td_right),
            Paragraph(f"৳{item.balance_due:,.2f}", td_right),
            Paragraph(f"{item.collection_percentage:.1f}%", td_right),
            Paragraph((item.possession_status or "NOT_TAKEN").replace("_", " "), td_style)
        ])

    # Totals Row
    table_rows.append([
        Paragraph("<b>GRAND TOTALS</b>", td_style),
        Paragraph(f"<b>{len(items)} units</b>", td_style),
        Paragraph("", td_style),
        Paragraph(f"<b>{sum(i.area_sft for i in items):,.0f}</b>", td_bold_right),
        Paragraph("", td_style),
        Paragraph("", td_style),
        Paragraph("", td_style),
        Paragraph(f"<b>৳{kpis.get('total_portfolio_value', 0):,.2f}</b>", td_bold_right),
        Paragraph(f"<b>৳{kpis.get('total_collected_amount', 0):,.2f}</b>", td_bold_right),
        Paragraph(f"<b>৳{kpis.get('total_outstanding_amount', 0):,.2f}</b>", td_bold_right),
        Paragraph("", td_style),
        Paragraph("", td_style)
    ])

    col_widths = [110, 45, 60, 50, 65, 120, 75, 80, 75, 75, 45, 80]
    data_table = Table(table_rows, colWidths=col_widths, repeatRows=1)

    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, colors.HexColor('#0F172A')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F1F5F9'))
    ]

    # Zebra striping
    for r in range(1, len(table_rows) - 1):
        if r % 2 == 0:
            t_style.append(('BACKGROUND', (0, r), (-1, r), colors.HexColor('#F8FAFC')))

    data_table.setStyle(TableStyle(t_style))
    elements.append(data_table)

    doc.build(elements)
    return buffer.getvalue()
