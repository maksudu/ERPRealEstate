import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


class MoneyReceiptPDFGenerator:
    """
    Statutory Bangladesh Real Estate Money Receipt (MR) PDF Generator.
    Produces high-fidelity downloadable customer money receipts under REHAB & statutory tax regulations.
    """

    @staticmethod
    def generate_receipt_pdf(
        mr_number: str,
        receipt_date: str,
        customer_name: str,
        customer_code: str,
        customer_phone: str,
        project_name: str,
        unit_number: str,
        parking_slot: str,
        amount_received: float,
        payment_mode: str,
        instrument_no: str,
        bank_name: str,
        late_fee_adjusted: float,
        principal_adjusted: float,
        outstanding_balance: float,
        qr_token: str
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'ReceiptTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            alignment=1, # Center
            textColor=colors.HexColor('#0f172a')
        )

        subtitle_style = ParagraphStyle(
            'ReceiptSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            alignment=1, # Center
            textColor=colors.HexColor('#64748b')
        )

        section_heading = ParagraphStyle(
            'ReceiptSection',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#1e293b')
        )

        normal_style = ParagraphStyle(
            'ReceiptNormal',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155')
        )

        bold_style = ParagraphStyle(
            'ReceiptBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#0f172a')
        )

        elements = []

        # 1. Company Header
        elements.append(Paragraph("BLUE OCEANS REAL ESTATE & INFRASTRUCTURE LTD.", title_style))
        elements.append(Paragraph("Gulshan Avenue, Block-NW(J), Dhaka-1212, Bangladesh | REHAB Member #1042", subtitle_style))
        elements.append(Paragraph("OFFICIAL STATUTORY MONEY RECEIPT", ParagraphStyle(
            'MRBadge',
            parent=title_style,
            fontSize=12,
            textColor=colors.HexColor('#047857'),
            spaceBefore=6
        )))
        elements.append(Spacer(1, 12))

        # 2. Receipt Meta Box
        meta_data = [
            [
                Paragraph(f"<b>Money Receipt No:</b> <font color='#047857'>{mr_number}</font>", normal_style),
                Paragraph(f"<b>Date:</b> {receipt_date}", normal_style)
            ],
            [
                Paragraph(f"<b>Customer Code:</b> {customer_code}", normal_style),
                Paragraph(f"<b>Verification Token:</b> {qr_token[:16]}...", normal_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # 3. Customer & Property Allocation Details
        elements.append(Paragraph("Buyer & Property Details", section_heading))
        elements.append(Spacer(1, 6))

        prop_data = [
            [
                Paragraph("<b>Buyer Name:</b>", normal_style),
                Paragraph(customer_name, bold_style),
                Paragraph("<b>Project:</b>", normal_style),
                Paragraph(project_name, bold_style)
            ],
            [
                Paragraph("<b>Primary Phone:</b>", normal_style),
                Paragraph(customer_phone, normal_style),
                Paragraph("<b>Apartment / Unit:</b>", normal_style),
                Paragraph(unit_number, bold_style)
            ],
            [
                Paragraph("<b>Payment Instrument:</b>", normal_style),
                Paragraph(f"{payment_mode} ({instrument_no or 'N/A'})", normal_style),
                Paragraph("<b>Parking Bay:</b>", normal_style),
                Paragraph(parking_slot or "Standard Allotment", normal_style)
            ],
            [
                Paragraph("<b>Bank / Gateway:</b>", normal_style),
                Paragraph(bank_name or "Direct / Gateway", normal_style),
                Paragraph("<b>Receipt Status:</b>", normal_style),
                Paragraph("<font color='#059669'><b>CLEARED & VERIFIED</b></font>", normal_style)
            ]
        ]
        prop_table = Table(prop_data, colWidths=[110, 160, 110, 160])
        prop_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f1f5f9')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#f1f5f9')),
        ]))
        elements.append(prop_table)
        elements.append(Spacer(1, 16))

        # 4. Financial Waterfall Ledger
        elements.append(Paragraph("Payment Settlement & Waterfall Allocation", section_heading))
        elements.append(Spacer(1, 6))

        waterfall_data = [
            [
                Paragraph("<b>Settlement Component</b>", bold_style),
                Paragraph("<b>Amount (BDT)</b>", ParagraphStyle('RHead', parent=bold_style, alignment=2))
            ],
            [
                Paragraph("Total Gross Amount Cleared", normal_style),
                Paragraph(f"৳ {amount_received:,.2f}", ParagraphStyle('R1', parent=bold_style, alignment=2, textColor=colors.HexColor('#047857')))
            ],
            [
                Paragraph("Late Surcharge / Due Fee Adjusted", normal_style),
                Paragraph(f"৳ {late_fee_adjusted:,.2f}", ParagraphStyle('R2', parent=normal_style, alignment=2))
            ],
            [
                Paragraph("Installment Principal Adjusted", normal_style),
                Paragraph(f"৳ {principal_adjusted:,.2f}", ParagraphStyle('R3', parent=normal_style, alignment=2))
            ],
            [
                Paragraph("<b>Remaining Unit Balance Due</b>", bold_style),
                Paragraph(f"<b>৳ {outstanding_balance:,.2f}</b>", ParagraphStyle('R4', parent=bold_style, alignment=2, textColor=colors.HexColor('#b91c1c')))
            ]
        ]
        wf_table = Table(waterfall_data, colWidths=[380, 160])
        wf_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fef2f2')),
        ]))
        # Fix text color of headers in table
        for r_idx in range(len(waterfall_data[0])):
            waterfall_data[0][r_idx].style.textColor = colors.white
        elements.append(wf_table)
        elements.append(Spacer(1, 25))

        # 5. Security & Verification Footer
        footer_data = [
            [
                Paragraph(
                    "<b>QR Verification Seal:</b><br/>"
                    f"<font size='7' color='#64748b'>Token: {qr_token}<br/>"
                    "Scan or verify at portal/verify. System generated e-Receipt valid without physical seal.</font>",
                    normal_style
                ),
                Paragraph(
                    "<b>Blue Oceans Finance & Accounts</b><br/><br/>"
                    "____________________________<br/>"
                    "<font size='8' color='#64748b'>Authorized Signatory</font>",
                    ParagraphStyle('Sign', parent=normal_style, alignment=2)
                )
            ]
        ]
        footer_table = Table(footer_data, colWidths=[340, 200])
        footer_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(footer_table)

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
