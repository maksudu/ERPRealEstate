import logging
from io import BytesIO

logger = logging.getLogger(__name__)

def generate_mushak_63_pdf(invoice_data: dict) -> bytes:
    """
    Renders an official Statutory Mushak 6.3 Tax Invoice (কর চালানপত্র - বিধি ৪০ এর উপ-বিধি (১) এর দফা (গ) অনুযায়ী মূসক-৬.৩)
    under Bangladesh Value Added Tax and Supplementary Duty Act, 2012.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>Mushak 6.3 Tax Invoice - {invoice_data.get('mushak_challan_number')}</title>
        <style>
            @page {{
                size: A4;
                margin: 15mm 12mm 15mm 12mm;
                @bottom-right {{
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 8pt;
                    color: #64748b;
                }}
                @bottom-left {{
                    content: "NBR Statutory Form Mushak-6.3 • Ref: {invoice_data.get('mushak_challan_number')}";
                    font-size: 8pt;
                    color: #64748b;
                }}
            }}
            body {{
                font-family: 'Helvetica Neue', 'Arial', sans-serif;
                color: #0f172a;
                font-size: 9.5pt;
                line-height: 1.4;
            }}
            .bengali {{
                font-family: 'SolaimanLipi', 'Kalpurush', 'Nikosh', 'Arial Unicode MS', sans-serif;
            }}
            .text-center {{ text-align: center; }}
            .text-right {{ text-align: right; }}
            .font-bold {{ font-weight: bold; }}
            
            .header-box {{
                border: 2px solid #0f172a;
                padding: 10px;
                margin-bottom: 15px;
                text-align: center;
            }}
            .govt-title {{
                font-size: 13pt;
                font-weight: bold;
                margin: 0;
            }}
            .sub-title {{
                font-size: 10pt;
                margin: 2px 0;
            }}
            .form-badge {{
                display: inline-block;
                border: 1.5px solid #0f172a;
                padding: 2px 8px;
                font-weight: bold;
                font-size: 11pt;
                margin-top: 5px;
            }}
            .info-table {{
                width: 100%;
                margin-bottom: 15px;
                border-collapse: collapse;
            }}
            .info-table td {{
                padding: 4px 6px;
                vertical-align: top;
            }}
            .table-bordered {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }}
            .table-bordered th, .table-bordered td {{
                border: 1px solid #0f172a;
                padding: 6px;
            }}
            .table-bordered th {{
                background-color: #f1f5f9;
                font-weight: bold;
                text-align: center;
                font-size: 8.5pt;
            }}
            .signature-section {{
                margin-top: 40px;
                width: 100%;
            }}
            .signature-line {{
                border-top: 1px solid #0f172a;
                width: 200px;
                margin-top: 50px;
                text-align: center;
                font-size: 8.5pt;
                font-weight: bold;
            }}
        </style>
    </head>
    <body>
        <div class="header-box">
            <div class="govt-title bengali">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
            <div class="sub-title bengali">জাতীয় রাজস্ব বোর্ড (National Board of Revenue)</div>
            <div class="sub-title bengali">কর চালানপত্র (TAX INVOICE)</div>
            <div class="sub-title bengali" style="font-size: 8.5pt;">[মূল্য সংযোজন কর ও সম্পূরক শুল্ক বিধিমালা, ২০১৬ এর বিধি ৪০ এর উপ-বিধি (১) এর দফা (গ) দ্রষ্টব্য]</div>
            <div class="form-badge bengali">মূসক - ৬.৩ (Mushak 6.3)</div>
        </div>

        <table class="info-table">
            <tr>
                <td style="width: 50%;">
                    <div><strong class="bengali">নিবন্ধিত ব্যক্তির নাম (Supplier Name):</strong> {invoice_data.get('developer_company_name', 'Maksudu Real Estate & Construction Ltd.')}</div>
                    <div><strong class="bengali">নিবন্ধিত ব্যক্তির বিআইএন (BIN):</strong> {invoice_data.get('developer_bin_number', '001234567-0101')}</div>
                    <div><strong class="bengali">চালানপত্র জারির ঠিকানা (Issue Address):</strong> House 42, Road 11, Block D, Banani, Dhaka-1213</div>
                </td>
                <td style="width: 50%;">
                    <div><strong class="bengali">চালান নম্বর (Invoice No):</strong> <span class="font-bold">{invoice_data.get('mushak_challan_number')}</span></div>
                    <div><strong class="bengali">ইস্যুর তারিখ (Issue Date):</strong> {invoice_data.get('invoice_date')}</div>
                    <div><strong class="bengali">ইস্যুর সময় (Issue Time):</strong> 11:30 AM</div>
                </td>
            </tr>
            <tr>
                <td colspan="2" style="border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                    <div><strong class="bengali">ক্রেতার নাম (Buyer Name):</strong> {invoice_data.get('customer_name', 'Dr. Mahmudur Rahman')}</div>
                    <div><strong class="bengali">ক্রেতার টিআইএন / এনআইডি (Buyer TIN/NID):</strong> {invoice_data.get('customer_tin_nid', 'NID: 19852691234567890')}</div>
                    <div><strong class="bengali">প্রকল্প ও ইউনিট (Property Details):</strong> {invoice_data.get('project_name', 'Bashundhara Executive Heights')} • Unit #{invoice_data.get('unit_number', '5B')} ({invoice_data.get('apartment_sqft')} Sqft)</div>
                </td>
            </tr>
        </table>

        <table class="table-bordered">
            <thead>
                <tr>
                    <th style="width: 5%;">ক্র: নং<br>(SL)</th>
                    <th style="width: 40%;">পণ্য বা সেবার বর্ণনা<br>(Description of Real Estate Supply / Service)</th>
                    <th style="width: 15%;">পরিমাপের একক<br>(Unit / Sqft)</th>
                    <th style="width: 15%;">মূল্য (টাকা)<br>(Taxable Amount BDT)</th>
                    <th style="width: 10%;">মূসকের হার<br>(VAT Rate %)</th>
                    <th style="width: 15%;">মূসকের পরিমাণ<br>(VAT Amount BDT)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="text-center">১</td>
                    <td>
                        <strong>Apartment Construction & Handover Consideration</strong><br>
                        <span style="font-size: 8pt; color: #475569;">
                            Statutory VAT under VAT Act 2012 for {invoice_data.get('apartment_type', 'Residential')} Real Estate ({invoice_data.get('apartment_sqft')} sqft)
                        </span>
                    </td>
                    <td class="text-center">{invoice_data.get('apartment_sqft')} sft</td>
                    <td class="text-right">৳{invoice_data.get('taxable_amount', 0):,.2f}</td>
                    <td class="text-center font-bold">{invoice_data.get('vat_rate_percent')}%</td>
                    <td class="text-right font-bold">৳{invoice_data.get('vat_amount', 0):,.2f}</td>
                </tr>
            </tbody>
            <tfoot>
                <tr style="background-color: #f8fafc; font-weight: bold;">
                    <td colspan="3" class="text-right bengali">সর্বমোট (Sub-Total):</td>
                    <td class="text-right">৳{invoice_data.get('taxable_amount', 0):,.2f}</td>
                    <td></td>
                    <td class="text-right">৳{invoice_data.get('vat_amount', 0):,.2f}</td>
                </tr>
                <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 10.5pt;">
                    <td colspan="5" class="text-right bengali">মূসক সহ মোট সংগৃহীত অর্থ (Total Inclusive Collected):</td>
                    <td class="text-right">৳{invoice_data.get('total_amount_collected', 0):,.2f}</td>
                </tr>
            </tfoot>
        </table>

        <div style="font-size: 8.5pt; color: #334155; margin-bottom: 20px;">
            <strong class="bengali">ঘোষণা (Declaration):</strong><br>
            আমি প্রত্যয়ন করিতেছি যে, এই চালানপত্রে বর্ণিত পণ্যের মূল্য ও প্রদেয় মূল্য সংযোজন কর সঠিকভাবে নিরূপিত হইয়াছে এবং ইহা বাংলাদেশ মূল্য সংযোজন কর ও সম্পূরক শুল্ক আইন, ২০১২ এর সকল বিধিবিধান অনুযায়ী প্রস্তুতকৃত।
        </div>

        <table class="signature-section">
            <tr>
                <td style="width: 50%;">
                    <div class="signature-line bengali">
                        ক্রেতার স্বাক্ষর<br>(Buyer's Signature)
                    </div>
                </td>
                <td style="width: 50%;" class="text-right">
                    <div class="signature-line bengali" style="margin-left: auto;">
                        ক্ষমতাপ্রাপ্ত কর্মকর্তার স্বাক্ষর ও সিল<br>(Authorized Officer Signature & Seal)
                    </div>
                </td>
            </tr>
        </table>
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
        c.drawString(50, 750, f"Mushak 6.3 Tax Invoice: {invoice_data.get('mushak_challan_number', '')}")
        c.setFont("Helvetica", 10)
        c.drawString(50, 720, f"Customer: {invoice_data.get('customer_name', '')}")
        c.drawString(50, 700, f"VAT Amount: BDT {invoice_data.get('vat_amount', 0):,.2f}")
        c.drawString(50, 680, f"Total Amount: BDT {invoice_data.get('total_amount_collected', 0):,.2f}")
        c.drawString(50, 650, "Statutory Mushak 6.3 generated via ERP Real Estate Engine.")
        c.save()
        return pdf_buffer.getvalue()
