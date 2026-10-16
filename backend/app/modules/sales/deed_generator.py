import logging
from io import BytesIO
from weasyprint import HTML, CSS

logger = logging.getLogger(__name__)

def generate_bilingual_deed_pdf(booking_data: dict) -> bytes:
    """
    Renders an official Bilingual Deed of Agreement (চুক্তিনামা ও বরাদ্দপত্র)
    matching Sub-Registry statutory standards under Bangladesh Real Estate Act 2010.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>Deed of Agreement - {booking_data.get('booking_reference_no')}</title>
        <style>
            @page {{
                size: A4;
                margin: 20mm 15mm 20mm 15mm;
                @bottom-right {{
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 8pt;
                    color: #64748b;
                }}
                @bottom-left {{
                    content: "ERP Real Estate Bangladesh - Statutory Deed Reference: {booking_data.get('booking_reference_no')}";
                    font-size: 8pt;
                    color: #64748b;
                }}
            }}
            body {{
                font-family: 'Helvetica Neue', 'Arial', sans-serif;
                color: #0f172a;
                font-size: 10pt;
                line-height: 1.5;
            }}
            .bengali {{
                font-family: 'SolaimanLipi', 'Kalpurush', 'Nikosh', 'Arial Unicode MS', sans-serif;
            }}
            .header-table {{
                width: 100%;
                border-bottom: 2px solid #059669;
                padding-bottom: 12px;
                margin-bottom: 15px;
            }}
            .stamp-box {{
                border: 2px dashed #059669;
                padding: 10px;
                text-align: center;
                background-color: #ecfdf5;
                font-size: 8pt;
                font-weight: bold;
                color: #065f46;
                margin-bottom: 20px;
            }}
            .title-area {{
                text-align: center;
                margin-bottom: 20px;
            }}
            .main-title {{
                font-size: 16pt;
                font-weight: bold;
                color: #065f46;
                text-transform: uppercase;
                margin: 0;
            }}
            .sub-title {{
                font-size: 12pt;
                color: #334155;
                margin-top: 4px;
            }}
            .section-title {{
                font-size: 11pt;
                font-weight: bold;
                background-color: #f1f5f9;
                padding: 4px 8px;
                border-left: 4px solid #059669;
                margin-top: 15px;
                margin-bottom: 8px;
            }}
            table.data-table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 12px;
            }}
            table.data-table th, table.data-table td {{
                border: 1px solid #cbd5e1;
                padding: 6px 8px;
                font-size: 9pt;
            }}
            table.data-table th {{
                background-color: #f8fafc;
                text-align: left;
                color: #475569;
            }}
            .clause {{
                margin-bottom: 8px;
                text-align: justify;
                font-size: 9pt;
            }}
            .signatures-table {{
                width: 100%;
                margin-top: 50px;
                border-collapse: collapse;
            }}
            .signatures-table td {{
                width: 33%;
                text-align: center;
                vertical-align: bottom;
                padding: 20px 10px 0 10px;
            }}
            .sig-line {{
                border-top: 1px solid #334155;
                padding-top: 4px;
                font-size: 8pt;
                font-weight: bold;
            }}
        </style>
    </head>
    <body>

        <!-- Header -->
        <table class="header-table">
            <tr>
                <td style="width: 70%;">
                    <div style="font-size: 16pt; font-weight: bold; color: #059669;">BENGAL REAL ESTATE DEVELOPERS LTD.</div>
                    <div style="font-size: 8pt; color: #64748b;">REHAB Member No: REHAB-2004-0982 | RAJUK Enlisted Real Estate Entity</div>
                    <div style="font-size: 8pt; color: #64748b;">Head Office: Landmark Tower, Level 14, 56 Gulshan Avenue, Dhaka-1212</div>
                </td>
                <td style="width: 30%; text-align: right;">
                    <div style="font-size: 9pt; font-weight: bold; color: #0f172a;">Deed Ref: {booking_data.get('booking_reference_no')}</div>
                    <div style="font-size: 8pt; color: #64748b;">Booking Date: {booking_data.get('booking_date')}</div>
                    <div style="font-size: 8pt; color: #059669; font-weight: bold;">Status: {booking_data.get('status')}</div>
                </td>
            </tr>
        </table>

        <!-- Non-Judicial Stamp Note -->
        <div class="stamp-box">
            NON-JUDICIAL STAMP EXECUTABLE DEED (বাধ্যতামূলক নন-জুডিশিয়াল স্ট্যাম্পে সম্পাদিত চুক্তিনামা)<br>
            EXECUTION UNDER THE REAL ESTATE DEVELOPMENT & MANAGEMENT ACT 2010 (ধারা ১৪, ১৫ ও ১৬)
        </div>

        <div class="title-area">
            <h1 class="main-title">DEED OF AGREEMENT FOR ALLOTMENT OF APARTMENT</h1>
            <div class="sub-title bengali">ফ্ল্যাট বরাদ্দ ও বিক্রয়ের দ্বিপাক্ষিক বায়না চুক্তিনামা</div>
        </div>

        <!-- 1. The Parties -->
        <div class="section-title">1. PARTIES TO THE AGREEMENT (চুক্তির পক্ষগণ)</div>
        <p class="clause">
            This Deed of Agreement is executed between <strong>BENGAL REAL ESTATE DEVELOPERS LTD.</strong>, 
            having its registered corporate office at Gulshan Avenue, Dhaka (hereinafter referred to as the <strong>"FIRST PARTY / DEVELOPER"</strong>) 
            AND <strong>{booking_data.get('customer_name')}</strong>, holding National Identity Card (NID) No: 
            <strong>{booking_data.get('customer_nid', 'N/A')}</strong>, Primary Contact: <strong>{booking_data.get('customer_phone')}</strong> 
            (hereinafter referred to as the <strong>"SECOND PARTY / ALLOTTEE / BUYER"</strong>).
        </p>

        <!-- 2. Property & Unit Schedule -->
        <div class="section-title">2. SCHEDULE OF ALLOTTED PROPERTY (বরাদ্দকৃত ফ্ল্যাটের তফসিল)</div>
        <table class="data-table">
            <tr>
                <th style="width: 25%;">Project Name</th>
                <td style="width: 25%; font-weight: bold;">{booking_data.get('project_name')}</td>
                <th style="width: 25%;">Unit / Apartment No.</th>
                <td style="width: 25%; font-weight: bold; color: #059669;">{booking_data.get('unit_number')}</td>
            </tr>
            <tr>
                <th>Floor Level</th>
                <td>Floor {booking_data.get('floor_number', 'N/A')}</td>
                <th>Facing Orientation</th>
                <td>{booking_data.get('facing', 'South-East')}</td>
            </tr>
            <tr>
                <th>Gross Saleable Area</th>
                <td>{booking_data.get('gross_area_sqft', 'N/A')} Sqft</td>
                <th>Allocated Parking Bay</th>
                <td>1 Dedicated Basement Bay</td>
            </tr>
        </table>

        <!-- 3. Financial Consideration -->
        <div class="section-title">3. FINANCIAL CONSIDERATION & PAYMENT SCHEDULE (মূল্য ও পরিশোধ শর্ত)</div>
        <table class="data-table">
            <tr>
                <th>Base Unit Value (Undiscounted)</th>
                <td style="text-align: right; font-weight: bold;">BDT {booking_data.get('base_unit_price', 0):,.2f}</td>
            </tr>
            <tr>
                <th>Approved Promotional Discount ({booking_data.get('discount_percentage', 0):.2f}%)</th>
                <td style="text-align: right; color: #059669; font-weight: bold;">- BDT {booking_data.get('discount_amount', 0):,.2f}</td>
            </tr>
            <tr style="background-color: #ecfdf5;">
                <th style="font-weight: bold; font-size: 10pt;">Final Agreed Contract Consideration</th>
                <td style="text-align: right; font-weight: bold; font-size: 10pt; color: #065f46;">BDT {booking_data.get('final_contract_value', 0):,.2f}</td>
            </tr>
            <tr>
                <th>Earnest Booking Money Received</th>
                <td style="text-align: right;">BDT {booking_data.get('earnest_money_received', 0):,.2f}</td>
            </tr>
            <tr>
                <th>Total Down Payment Deposited</th>
                <td style="text-align: right;">BDT {booking_data.get('down_payment_total', 0):,.2f}</td>
            </tr>
        </table>

        <!-- 4. Mandatory Statutory Clauses -->
        <div class="section-title">4. STATUTORY TERMS & CONDITIONS (আইনগত শর্তাবলী)</div>
        <div class="clause">
            <strong>4.1 Handover & Construction Timeline:</strong> The Developer undertakes to complete construction in accordance with approved RAJUK architectural and structural engineering plans and hand over physical vacant possession within the stipulated schedule. A grace period of 6 (six) months shall be admissible in events of Force Majeure.
        </div>
        <div class="clause">
            <strong>4.2 Allotment Cancellation & Refund (REHAB Standard):</strong> If the Allottee cancels this allotment, the Developer shall deduct 10% (Ten Percent) of the total deposited amount as statutory forfeiture/service charge, and the remaining net balance shall be refunded within 90 (ninety) days of resale.
        </div>
        <div class="clause">
            <strong>4.3 Sub-Registry Deed Execution:</strong> The Developer shall execute the registered Sub-Registry Sale Deed and mutation clearance upon clearance of all scheduled installments and statutory government transfer taxes (AIT u/s 53FF, Stamp Duty, Gain Tax, and Local Council Fees).
        </div>

        <!-- 5. Signatures -->
        <table class="signatures-table">
            <tr>
                <td>
                    <div class="sig-line">
                        For & on behalf of First Party<br>
                        <strong>Managing Director / Director</strong><br>
                        Bengal Real Estate Developers Ltd.
                    </div>
                </td>
                <td>
                    <div class="sig-line">
                        Authorized Legal Signatory<br>
                        <strong>Head of Sales & CRM</strong><br>
                        Official Seal
                    </div>
                </td>
                <td>
                    <div class="sig-line">
                        Second Party (Allottee / Buyer)<br>
                        <strong>{booking_data.get('customer_name')}</strong><br>
                        NID: {booking_data.get('customer_nid', 'Verified')}
                    </div>
                </td>
            </tr>
        </table>

    </body>
    </html>
    """

    pdf_buffer = BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    return pdf_buffer.getvalue()
