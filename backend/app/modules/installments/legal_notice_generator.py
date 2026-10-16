import logging
from io import BytesIO

logger = logging.getLogger(__name__)

def generate_section138_legal_notice_pdf(notice_data: dict) -> bytes:
    """
    Renders an official Statutory Legal Notice under Section 138 of the
    Negotiable Instruments Act 1881 (Act XXVI of 1881) for dishonour of cheque.
    Demands full payment within 30 days of receipt before filing a criminal complaint.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>Section 138 Statutory Legal Notice - Cheque #{notice_data.get('cheque_number')}</title>
        <style>
            @page {{
                size: A4;
                margin: 25mm 20mm 20mm 20mm;
                @bottom-right {{
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 8pt;
                    color: #64748b;
                }}
                @bottom-left {{
                    content: "Statutory Notice u/s 138 NI Act 1881 - Ref: {notice_data.get('notice_ref')}";
                    font-size: 8pt;
                    color: #64748b;
                }}
            }}
            body {{
                font-family: 'Helvetica Neue', 'Arial', sans-serif;
                color: #0f172a;
                font-size: 10pt;
                line-height: 1.6;
            }}
            .bengali {{
                font-family: 'SolaimanLipi', 'Kalpurush', 'Nikosh', 'Arial Unicode MS', sans-serif;
            }}
            .advocate-header {{
                text-align: center;
                border-bottom: 2px solid #b91c1c;
                padding-bottom: 12px;
                margin-bottom: 20px;
            }}
            .advocate-name {{
                font-size: 14pt;
                font-weight: bold;
                color: #991b1b;
                text-transform: uppercase;
            }}
            .advocate-chamber {{
                font-size: 9pt;
                color: #475569;
            }}
            .post-badge {{
                display: inline-block;
                padding: 4px 10px;
                background-color: #fee2e2;
                border: 1px solid #ef4444;
                color: #991b1b;
                font-weight: bold;
                font-size: 9pt;
                margin-bottom: 15px;
            }}
            .subject-box {{
                background-color: #f8fafc;
                border-left: 4px solid #b91c1c;
                padding: 8px 12px;
                font-weight: bold;
                margin: 15px 0;
                font-size: 9.5pt;
            }}
            table.cheque-table {{
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
            }}
            table.cheque-table th, table.cheque-table td {{
                border: 1px solid #cbd5e1;
                padding: 6px 10px;
                font-size: 9pt;
            }}
            table.cheque-table th {{
                background-color: #f1f5f9;
                text-align: left;
                color: #334155;
            }}
            .para {{
                margin-bottom: 12px;
                text-align: justify;
            }}
            .statutory-warning {{
                background-color: #fef2f2;
                border: 1px solid #f87171;
                padding: 10px;
                color: #7f1d1d;
                font-size: 9pt;
                margin: 20px 0;
                line-height: 1.5;
            }}
            .signature-block {{
                margin-top: 40px;
                float: right;
                width: 260px;
                text-align: center;
            }}
            .sig-line {{
                border-top: 1px solid #334155;
                margin-top: 45px;
                padding-top: 4px;
                font-weight: bold;
                font-size: 9pt;
            }}
        </style>
    </head>
    <body>

        <!-- Legal Counsel Header -->
        <div class="advocate-header">
            <div class="advocate-name">{notice_data.get('counsel_name', 'BARRISTER TANVIR & ASSOCIATES')}</div>
            <div class="advocate-chamber">Advocates, Supreme Court of Bangladesh</div>
            <div class="advocate-chamber">Chamber: Room 412, Supreme Court Bar Association Building, Shahbagh, Dhaka-1000</div>
            <div class="advocate-chamber">Phone: +88029584421 | Email: legal.dept@bengalrealestate.com</div>
        </div>

        <div class="post-badge">
            BY REGISTERED POST WITH A/D & COURIER SERVICE
        </div>

        <div>
            <strong>Date:</strong> {notice_data.get('notice_date')}<br>
            <strong>Notice Ref:</strong> {notice_data.get('notice_ref')}<br><br>
            <strong>TO:</strong><br>
            <strong>{notice_data.get('customer_name')}</strong><br>
            {notice_data.get('customer_address', 'Address on record')}<br>
            Phone: {notice_data.get('customer_phone')}<br>
            NID No: {notice_data.get('customer_nid', 'N/A')}
        </div>

        <div class="subject-box">
            SUBJECT: STATUTORY LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT 1881 FOR DISHONOUR OF CHEQUE NO. {notice_data.get('cheque_number')} FOR BDT {notice_data.get('cheque_amount', 0):,.2f}.
        </div>

        <div class="para">
            Sir / Madam,<br>
            Under instructions from and on behalf of our client, <strong>BENGAL REAL ESTATE DEVELOPERS LTD.</strong>, 
            having its registered Corporate Headquarters at Gulshan Avenue, Dhaka, we hereby serve upon you this formal statutory legal notice as follows:
        </div>

        <div class="para">
            1. That in discharge of your legally enforceable debt and milestone installment liability under Apartment Booking Reference 
            <strong>{notice_data.get('booking_reference_no')}</strong> (Unit <strong>{notice_data.get('unit_number')}</strong>, Project <strong>{notice_data.get('project_name')}</strong>), 
            you issued the undernoted Post-Dated Cheque drawn on your bank account in favour of our client:
        </div>

        <table class="cheque-table">
            <tr>
                <th style="width: 25%;">Cheque Number</th>
                <td style="width: 25%; font-weight: bold; color: #b91c1c;">{notice_data.get('cheque_number')}</td>
                <th style="width: 25%;">Cheque Date</th>
                <td style="width: 25%;">{notice_data.get('maturity_date')}</td>
            </tr>
            <tr>
                <th>Bank & Branch</th>
                <td colspan="3">{notice_data.get('bank_name')} ({notice_data.get('branch_name')})</td>
            </tr>
            <tr>
                <th>Dishonoured Amount</th>
                <td colspan="3" style="font-weight: bold; color: #b91c1c; font-size: 11pt;">
                    BDT {notice_data.get('cheque_amount', 0):,.2f}
                </td>
            </tr>
            <tr>
                <th>Dishonour Memo Date</th>
                <td>{notice_data.get('dishonour_memo_date')}</td>
                <th>Reason for Dishonour</th>
                <td style="font-weight: bold; color: #b91c1c;">{notice_data.get('dishonour_reason', 'Insufficient Funds')}</td>
            </tr>
        </table>

        <div class="para">
            2. That our client duly presented the said cheque for encashment through their banker, but the same was returned dishonoured and unpaid 
            with the bank return memo endorsed <strong>"{notice_data.get('dishonour_reason', 'INSUFFICIENT FUNDS')}"</strong> on {notice_data.get('dishonour_memo_date')}.
        </div>

        <div class="statutory-warning">
            <strong>STATUTORY 30-DAY DEMAND UNDER SECTION 138(c) OF THE NEGOTIABLE INSTRUMENTS ACT 1881:</strong><br>
            You are hereby formally called upon to pay the entire dishonoured cheque amount of <strong>BDT {notice_data.get('cheque_amount', 0):,.2f}</strong> 
            to our client by way of Bank Pay Order, Demand Draft, or RTGS within <strong>30 (THIRTY) DAYS</strong> from the date of receipt of this notice, 
            failing which our client shall initiate criminal prosecution against you under Section 138 of the Negotiable Instruments Act 1881 
            before the competent Court of the Chief Metropolitan Magistrate (CMM), Dhaka, where you shall be liable to be punished with imprisonment 
            for a term extending up to 1 (One) year, or with fine up to twice the amount of the cheque, or with both.
        </div>

        <div class="para">
            Please treat this communication as the formal demand notice prescribed by law.
        </div>

        <div class="signature-block">
            <div class="sig-line">
                {notice_data.get('counsel_name', 'Barrister Tanvir Ahmed')}<br>
                Advocate, Supreme Court of Bangladesh<br>
                For & on behalf of Bengal Real Estate Developers Ltd.
            </div>
        </div>

    </body>
    </html>
    """

    try:
        from weasyprint import HTML
        pdf_buffer = BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        return pdf_buffer.getvalue()
    except Exception as e:
        logger.warning(f"WeasyPrint unavailable ({e}), using ReportLab fallback.")
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=letter)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, 750, f"Statutory Legal Notice under NI Act 1881 Section 138")
        c.setFont("Helvetica", 10)
        c.drawString(50, 720, f"Cheque No: {notice_data.get('cheque_number', '')}")
        c.drawString(50, 700, f"Customer: {notice_data.get('customer_name', '')}")
        c.drawString(50, 680, f"Amount: BDT {notice_data.get('cheque_amount', 0):,.2f}")
        c.drawString(50, 650, "Full Section 138 demand notice rendered via ERP Real Estate Engine.")
        c.save()
        return pdf_buffer.getvalue()
