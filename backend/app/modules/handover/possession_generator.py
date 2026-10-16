import logging
from io import BytesIO

logger = logging.getLogger(__name__)


def generate_possession_letter_pdf(data: dict) -> bytes:
    """
    Generate statutory Apartment Possession & Key Handover Certificate PDF.
    Complies with REHAB and National Building Code handover procedures.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Possession & Key Handover Certificate</title>
        <style>
            @page {{
                size: A4 portrait;
                margin: 20mm 15mm 20mm 15mm;
                @bottom-right {{
                    content: "Page " counter(page) " of " counter(pages);
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    font-size: 8pt;
                    color: #64748b;
                }}
            }}
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #1e293b;
                font-size: 11pt;
                line-height: 1.6;
                margin: 0;
                padding: 0;
            }}
            .header {{
                text-align: center;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 12px;
                margin-bottom: 25px;
            }}
            .company-name {{
                font-size: 20pt;
                font-weight: 800;
                color: #0f172a;
                letter-spacing: 1px;
                text-transform: uppercase;
            }}
            .company-tagline {{
                font-size: 9pt;
                color: #64748b;
                margin-top: 3px;
            }}
            .cert-badge {{
                display: inline-block;
                background-color: #047857;
                color: #ffffff;
                font-size: 11pt;
                font-weight: 700;
                padding: 6px 20px;
                border-radius: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 15px;
            }}
            .ref-row {{
                display: flex;
                justify-content: space-between;
                font-size: 9.5pt;
                margin-bottom: 20px;
                color: #475569;
            }}
            .section-title {{
                font-size: 11pt;
                font-weight: 700;
                color: #0f172a;
                border-left: 4px solid #047857;
                padding-left: 8px;
                margin-top: 18px;
                margin-bottom: 10px;
                text-transform: uppercase;
            }}
            table.info-table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 18px;
                font-size: 10pt;
            }}
            table.info-table th, table.info-table td {{
                border: 1px solid #cbd5e1;
                padding: 8px 12px;
            }}
            table.info-table th {{
                background-color: #f8fafc;
                color: #334155;
                text-align: left;
                width: 30%;
                font-weight: 600;
            }}
            table.info-table td {{
                background-color: #ffffff;
                color: #0f172a;
            }}
            .declaration-box {{
                background-color: #f0fdf4;
                border: 1px solid #86efac;
                border-radius: 6px;
                padding: 12px 16px;
                font-size: 9.5pt;
                color: #14532d;
                margin-bottom: 25px;
            }}
            .signatures {{
                margin-top: 50px;
                width: 100%;
                display: table;
            }}
            .sig-cell {{
                display: table-cell;
                width: 33.33%;
                text-align: center;
                vertical-align: bottom;
                padding: 0 10px;
            }}
            .sig-line {{
                border-top: 1px solid #475569;
                margin-bottom: 5px;
            }}
            .sig-title {{
                font-size: 9pt;
                font-weight: 600;
                color: #334155;
            }}
            .sig-subtitle {{
                font-size: 8pt;
                color: #64748b;
            }}
            .watermark {{
                position: fixed;
                top: 45%;
                left: 15%;
                font-size: 55pt;
                color: rgba(4, 120, 87, 0.05);
                transform: rotate(-35deg);
                font-weight: 900;
                text-transform: uppercase;
                pointer-events: none;
            }}
        </style>
    </head>
    <body>
        <div class="watermark">POSSESSION HANDOVER</div>

        <div class="header">
            <div class="company-name">{data.get('developer_name', 'BANGLADESH REAL ESTATE LTD.')}</div>
            <div class="company-tagline">Registered with REHAB · RAJUK / CDA Approved Real Estate Developer</div>
            <div class="cert-badge">Official Possession & Key Handover Certificate</div>
        </div>

        <div class="ref-row">
            <div><strong>Possession Certificate No:</strong> {data.get('possession_letter_number', 'POS-2026-001')}</div>
            <div><strong>Handover Date:</strong> {data.get('possession_handover_date', '2026-10-16')}</div>
        </div>

        <div class="section-title">1. Property & Allottee Particulars</div>
        <table class="info-table">
            <tr>
                <th>Project Name</th>
                <td><strong>{data.get('project_name', 'N/A')}</strong></td>
            </tr>
            <tr>
                <th>Apartment / Unit No</th>
                <td><strong>Unit {data.get('unit_number', 'N/A')}</strong> ({data.get('unit_size_sqft', 'N/A')} Gross SFT)</td>
            </tr>
            <tr>
                <th>Allotted Owner Name</th>
                <td><strong>{data.get('customer_name', 'Valued Allottee')}</strong></td>
            </tr>
            <tr>
                <th>National ID / Passport</th>
                <td>{data.get('customer_nid', 'N/A')}</td>
            </tr>
            <tr>
                <th>Sales Booking Reference</th>
                <td>{data.get('booking_reference_no', 'N/A')}</td>
            </tr>
            <tr>
                <th>Site Supervising Engineer</th>
                <td>{data.get('site_engineer_name', 'Lead Project Engineer')}</td>
            </tr>
        </table>

        <div class="section-title">2. Financial Clearance & Snagging Rectification</div>
        <div class="declaration-box">
            ✔ <strong>100% Financial Clearance Verified:</strong> All installment considerations, statutory utility connection charges, and registration expenses have been unconditionally settled with the corporate accounts department.<br>
            ✔ <strong>Snagging & Joint Pre-Inspection:</strong> The physical inspection of the apartment, including sanitary fittings, electrical DB boards, floor tiles, and joinery works, has been completed to the satisfaction of the Allottee.
        </div>

        <div class="section-title">3. 12-Month Defect Liability Period (DLP) Warranty</div>
        <p style="font-size: 9pt; color: #475569; margin-bottom: 20px;">
            The developer hereby covenants a statutory <strong>12-Month Defect Liability Warranty</strong> from the date of physical possession. Any defects in plumbing, sanitary lines, internal electrical wiring, and tile de-bonding shall be repaired free of cost within 72 hours of ticket generation via the ERP Portal.
        </p>

        <div class="signatures">
            <div class="sig-cell">
                <div class="sig-line"></div>
                <div class="sig-title">{data.get('customer_name', 'Allottee')}</div>
                <div class="sig-subtitle">Signature of Buyer (Possession Received)</div>
            </div>
            <div class="sig-cell">
                <div class="sig-line"></div>
                <div class="sig-title">{data.get('site_engineer_name', 'Site Engineer')}</div>
                <div class="sig-subtitle">Inspecting Site Engineer</div>
            </div>
            <div class="sig-cell">
                <div class="sig-line"></div>
                <div class="sig-title">Authorized Signatory</div>
                <div class="sig-subtitle">For Developer Ltd. (Seal & Sign)</div>
            </div>
        </div>
    </body>
    </html>
    """
    try:
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except Exception as e:
        logger.warning(f"WeasyPrint unavailable ({e}), using ReportLab fallback.")
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=letter)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, 750, "Apartment Possession & Key Handover Certificate")
        c.setFont("Helvetica", 10)
        c.drawString(50, 720, f"Certificate No: {data.get('possession_letter_number', '')}")
        c.drawString(50, 700, f"Customer: {data.get('customer_name', '')}")
        c.drawString(50, 680, f"Project: {data.get('project_name', '')}")
        c.drawString(50, 660, f"Unit: {data.get('unit_number', '')}")
        c.drawString(50, 630, "Official key possession cleared via ERP Real Estate Engine.")
        c.save()
        return pdf_buffer.getvalue()
