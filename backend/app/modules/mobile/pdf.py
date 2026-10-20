"""
PDF generators for the Mobile Sales App (Quotation & Booking confirmation).
Uses reportlab (already in requirements.txt).
"""
from io import BytesIO
from decimal import Decimal
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


def bdt(value) -> str:
    """Bangladeshi Lakh/Crore grouping, e.g. 1,25,50,000.00"""
    try:
        v = Decimal(str(value or 0)).quantize(Decimal("0.01"))
    except Exception:
        v = Decimal("0.00")
    neg = v < 0
    s = f"{abs(v):.2f}"
    whole, frac = s.split(".")
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        whole = ",".join(parts) + "," + tail
    return f"{'-' if neg else ''}BDT {whole}.{frac}"


_styles = getSampleStyleSheet()
_H = ParagraphStyle("H", parent=_styles["Heading1"], textColor=colors.HexColor("#0B3D91"), fontSize=18)
_S = ParagraphStyle("S", parent=_styles["Normal"], fontSize=9, textColor=colors.HexColor("#475569"))
_N = _styles["Normal"]


def _kv_table(rows, col_widths=(70 * mm, 100 * mm), highlight_last=False):
    t = Table(rows, colWidths=col_widths)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if highlight_last:
        style += [
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#0B3D91")),
            ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ]
    t.setStyle(TableStyle(style))
    return t


def build_quotation_pdf(q, project_name: str, tower_name: str, unit) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm)
    el = [
        Paragraph("PRICE QUOTATION", _H),
        Paragraph(f"Quotation No: <b>{q.quotation_number}</b> &nbsp;&nbsp; Date: {q.created_at:%d %b %Y}" if q.created_at else f"Quotation No: <b>{q.quotation_number}</b>", _N),
        Paragraph(f"Valid Until: {q.valid_until:%d %b %Y}", _S),
        Spacer(1, 8),
        Paragraph("<b>Customer</b>", _N),
        _kv_table([
            ["Name", q.customer_name],
            ["Phone", q.customer_phone],
            ["Email", q.customer_email or "-"],
        ]),
        Spacer(1, 8),
        Paragraph("<b>Property</b>", _N),
        _kv_table([
            ["Project", project_name or "-"],
            ["Tower / Building", tower_name or "-"],
            ["Unit", q.unit_code or "-"],
            ["Floor", str(getattr(unit, "floor_number", "-"))],
            ["Type / Facing", f"{getattr(unit, 'unit_type_id', '-')} / {getattr(unit, 'facing_id', '-')}"],
            ["Bed / Bath / Balcony", f"{getattr(unit, 'bed_count', '-')} / {getattr(unit, 'bath_count', '-')} / {getattr(unit, 'balcony_count', '-')}"],
        ]),
        Spacer(1, 8),
        Paragraph("<b>Price Breakdown</b>", _N),
        _kv_table([
            ["Chargeable Area (sqft)", f"{q.chargeable_area_sqft:,.2f}"],
            ["Rate per sqft", bdt(q.rate_per_sqft)],
            ["Apartment Price", bdt(q.base_apartment_price)],
            ["Car Parking", bdt(q.parking_charge)],
            [f"Discount ({q.discount_pct:.2f}%)", f"- {bdt(q.discount_amount)}"],
            ["NET PAYABLE", bdt(q.net_total_price)],
        ], highlight_last=True),
        Spacer(1, 10),
        Paragraph(f"Notes: {q.notes}" if q.notes else "", _S),
        Spacer(1, 6),
        Paragraph(
            "This quotation is indicative and subject to unit availability and management approval. "
            "Registration cost, stamp duty and VAT (Mushak) are payable as per Government of Bangladesh rules.",
            _S,
        ),
        Spacer(1, 24),
        Paragraph(f"Prepared by: <b>{q.prepared_by}</b>", _N),
        Paragraph(f"Generated: {datetime.now():%d %b %Y %H:%M}", _S),
    ]
    doc.build(el)
    return buf.getvalue()


def build_booking_pdf(b, customer, project_name: str, unit_label: str, installments) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm)
    el = [
        Paragraph("BOOKING CONFIRMATION", _H),
        Paragraph(f"Booking Ref: <b>{b.booking_reference_no}</b> &nbsp;&nbsp; Date: {b.booking_date}", _N),
        Paragraph(f"Status: {b.status} &nbsp;|&nbsp; Discount approval: {b.discount_approval_status}", _S),
        Spacer(1, 8),
        _kv_table([
            ["Customer", customer.full_name_en if customer else "-"],
            ["Phone", customer.primary_phone if customer else "-"],
            ["NID", (customer.nid_number or "-") if customer else "-"],
            ["Project", project_name or "-"],
            ["Unit", unit_label],
            ["Parking Slot", b.parking_slot_number or "-"],
        ]),
        Spacer(1, 8),
        _kv_table([
            ["Base Unit Price", bdt(b.base_unit_price)],
            ["Parking", bdt(b.parking_charge)],
            ["Utility Connection", bdt(b.utility_charge)],
            ["Documentation", bdt(b.documentation_charge)],
            [f"Discount ({b.discount_percentage:.2f}%)", f"- {bdt(b.discount_amount)}"],
            ["FINAL CONTRACT VALUE", bdt(b.final_contract_value)],
        ], highlight_last=True),
        Spacer(1, 10),
        Paragraph("<b>Installment Plan</b>", _N),
    ]
    rows = [["#", "Title", "Due Date", "Amount", "Status"]]
    for i in installments:
        rows.append([str(i.installment_no), i.title, str(i.due_date), bdt(i.payable_amount), i.status])
    t = Table(rows, colWidths=(10 * mm, 60 * mm, 28 * mm, 42 * mm, 30 * mm), repeatRows=1)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CBD5E1")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3D91")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("ALIGN", (3, 1), (3, -1), "RIGHT"),
    ]))
    el.append(t)
    el += [Spacer(1, 30), Paragraph("Customer Signature ____________________ &nbsp;&nbsp;&nbsp; Authorized Signature ____________________", _N)]
    doc.build(el)
    return buf.getvalue()
