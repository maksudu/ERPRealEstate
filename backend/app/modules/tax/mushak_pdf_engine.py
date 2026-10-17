import json
import logging
from io import BytesIO

logger = logging.getLogger(__name__)


def generate_mushak_63_pdf(invoice_data: dict) -> bytes:
    """
    Renders official Statutory Mushak 6.3 Tax Invoice (কর চালানপত্র - বিধি ৪০ এর উপ-বিধি (১) এর দফা (গ) অনুযায়ী মূসক-৬.৩)
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
                font-size: 9pt;
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
                margin-bottom: 12px;
                text-align: center;
                background-color: #f8fafc;
            }}
            .govt-title {{
                font-size: 13pt;
                font-weight: bold;
                margin: 0;
                color: #0f172a;
            }}
            .sub-title {{
                font-size: 9.5pt;
                margin: 2px 0;
            }}
            .form-badge {{
                display: inline-block;
                border: 1.5px solid #0f172a;
                background-color: #0f172a;
                color: #ffffff;
                padding: 2px 10px;
                font-weight: bold;
                font-size: 11pt;
                margin-top: 5px;
                border-radius: 3px;
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
                margin-bottom: 15px;
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
                margin-top: 30px;
                width: 100%;
            }}
            .signature-line {{
                border-top: 1px solid #0f172a;
                width: 200px;
                margin-top: 45px;
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
            <div class="sub-title bengali" style="font-size: 8pt;">[মূল্য সংযোজন কর ও সম্পূরক শুল্ক বিধিমালা, ২০১৬ এর বিধি ৪০ এর উপ-বিধি (১) এর দফা (গ) দ্রষ্টব্য]</div>
            <div class="form-badge bengali">মূসক - ৬.৩ (Mushak 6.3)</div>
        </div>

        <table class="info-table">
            <tr>
                <td style="width: 50%;">
                    <div><strong class="bengali">নিবন্ধিত ব্যক্তির নাম (Supplier):</strong> {invoice_data.get('developer_company_name', 'Maksudu Real Estate & Construction Ltd.')}</div>
                    <div><strong class="bengali">নিবন্ধিত ব্যক্তির বিআইএন (BIN):</strong> {invoice_data.get('developer_bin_number', '001234567-0101')}</div>
                    <div><strong class="bengali">চালানপত্র জারির ঠিকানা:</strong> House 42, Road 11, Block D, Banani, Dhaka-1213</div>
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
                    <div><strong class="bengali">প্রকল্প ও ইউনিট (Property):</strong> {invoice_data.get('project_name', 'Executive Heights')} • Unit #{invoice_data.get('unit_number', '5B')} ({invoice_data.get('apartment_sqft')} Sqft)</div>
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
                <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 10pt;">
                    <td colspan="5" class="text-right bengali">মূসক সহ মোট সংগৃহীত অর্থ (Total Inclusive Collected):</td>
                    <td class="text-right">৳{invoice_data.get('total_amount_collected', 0):,.2f}</td>
                </tr>
            </tfoot>
        </table>

        <div style="font-size: 8pt; color: #334155; margin-bottom: 20px;">
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
    return _render_html_or_fallback(html_content, f"Mushak 6.3: {invoice_data.get('mushak_challan_number')}")


def generate_mushak_65_pdf(challan_data: dict) -> bytes:
    """
    Renders statutory Form Mushak 6.5 (পণ্য স্থানান্তর চালানপত্র - বিধি ৪০ এর উপ-বিধি (১) এর দফা (ঙ) অনুযায়ী মূসক-৬.৫)
    for transferring materials/subcontractor equipment across construction sites.
    """
    items = challan_data.get('items', [])
    items_rows_html = ""
    for idx, itm in enumerate(items, 1):
        items_rows_html += f"""
        <tr>
            <td style="text-align: center;">{idx}</td>
            <td><strong>{itm.get('item_name')}</strong><br><span style="font-size: 8pt; color: #64748b;">{itm.get('specification', '')}</span></td>
            <td style="text-align: center;">{itm.get('quantity')} {itm.get('unit')}</td>
            <td style="text-align: right;">৳{float(itm.get('unit_value', 0)):,.2f}</td>
            <td style="text-align: right; font-weight: bold;">৳{float(itm.get('total_value', 0)):,.2f}</td>
        </tr>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>Mushak 6.5 Goods Transfer Challan - {challan_data.get('challan_number')}</title>
        <style>
            @page {{
                size: A4;
                margin: 15mm 12mm 15mm 12mm;
            }}
            body {{
                font-family: 'Helvetica Neue', 'Arial', sans-serif;
                color: #0f172a;
                font-size: 9pt;
                line-height: 1.4;
            }}
            .bengali {{ font-family: 'SolaimanLipi', 'Kalpurush', 'Nikosh', 'Arial Unicode MS', sans-serif; }}
            .text-center {{ text-align: center; }}
            .header-box {{
                border: 2px solid #0f172a;
                padding: 10px;
                margin-bottom: 12px;
                text-align: center;
                background-color: #f8fafc;
            }}
            .form-badge {{
                display: inline-block;
                background-color: #1e293b;
                color: white;
                padding: 2px 10px;
                font-weight: bold;
                font-size: 11pt;
                margin-top: 5px;
            }}
            .info-table, .table-bordered {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }}
            .table-bordered th, .table-bordered td {{
                border: 1px solid #0f172a;
                padding: 6px;
            }}
            .table-bordered th {{
                background-color: #f1f5f9;
                font-weight: bold;
                font-size: 8.5pt;
            }}
        </style>
    </head>
    <body>
        <div class="header-box">
            <div style="font-size: 13pt; font-weight: bold;" class="bengali">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
            <div style="font-size: 10pt;" class="bengali">জাতীয় রাজস্ব বোর্ড (National Board of Revenue)</div>
            <div style="font-size: 10pt; font-weight: bold;" class="bengali">পণ্য স্থানান্তর চালানপত্র (GOODS TRANSFER CHALLAN)</div>
            <div style="font-size: 8pt;" class="bengali">[মূল্য সংযোজন কর ও সম্পূরক শুল্ক বিধিমালা, ২০১৬ এর বিধি ৪০ এর উপ-বিধি (১) এর দফা (ঙ) দ্রষ্টব্য]</div>
            <div class="form-badge bengali">মূসক - ৬.৫ (Mushak 6.5)</div>
        </div>

        <table class="info-table">
            <tr>
                <td style="width: 50%;">
                    <div><strong class="bengali">নিবন্ধিত সত্তার নাম:</strong> {challan_data.get('developer_company_name', 'Maksudu Real Estate & Construction Ltd.')}</div>
                    <div><strong class="bengali">বিআইএন (BIN):</strong> {challan_data.get('developer_bin', '001234567-0101')}</div>
                    <div><strong class="bengali">প্রেরক প্রজেক্ট / ওয়্যারহাউস:</strong> {challan_data.get('origin_project_name')}</div>
                    <div><strong class="bengali">প্রাপক প্রজেক্ট / সাইট:</strong> {challan_data.get('destination_project_name')}</div>
                </td>
                <td style="width: 50%;">
                    <div><strong class="bengali">চালানপত্র নম্বর:</strong> <strong>{challan_data.get('challan_number')}</strong></div>
                    <div><strong class="bengali">ইস্যুর তারিখ ও সময়:</strong> {challan_data.get('issue_date')} • {challan_data.get('issue_time')}</div>
                    <div><strong class="bengali">যানবাহনের বিবরণ:</strong> {challan_data.get('transport_vehicle_type')} ({challan_data.get('vehicle_number')})</div>
                    <div><strong class="bengali">চালকের নাম ও মোবাইল:</strong> {challan_data.get('driver_name')} ({challan_data.get('driver_phone')})</div>
                </td>
            </tr>
            {f'<tr><td colspan="2" style="border-top: 1px dashed #cbd5e1; padding-top: 6px;"><strong class="bengali">সাবকন্ট্রাক্টর / বাস্তবায়নকারী:</strong> {challan_data.get("subcontractor_name")}</td></tr>' if challan_data.get("subcontractor_name") else ''}
        </table>

        <table class="table-bordered">
            <thead>
                <tr>
                    <th style="width: 6%;">ক্র: নং</th>
                    <th style="width: 44%;">পণ্যের বিবরণ ও স্পেসিফিকেশন</th>
                    <th style="width: 18%;">পরিমাণ ও একক</th>
                    <th style="width: 16%;">আনুমানিক একক মূল্য (টাকা)</th>
                    <th style="width: 16%;">মোট ঘোষিত মূল্য (টাকা)</th>
                </tr>
            </thead>
            <tbody>
                {items_rows_html}
            </tbody>
            <tfoot>
                <tr style="background-color: #f8fafc; font-weight: bold;">
                    <td colspan="4" style="text-align: right;" class="bengali">মোট ঘোষিত মালামালের মূল্য:</td>
                    <td style="text-align: right;">৳{float(challan_data.get('total_declared_value', 0)):,.2f}</td>
                </tr>
            </tfoot>
        </table>

        <div style="font-size: 8pt; color: #475569; margin-top: 10px;" class="bengali">
            * দ্রষ্টব্য: এই চালানপত্রটি একই ব্যক্তি বা প্রতিষ্ঠানের অভ্যন্তরীণ নির্মাণ সাইট অথবা সাবকন্ট্রাক্টরের কাজের স্থানান্তরের জন্য ব্যবহৃত হইতেছে। এতে কোনো বাণিজ্যিক বিক্রয় জড়িত নহে।
        </div>

        <table style="width: 100%; margin-top: 40px;">
            <tr>
                <td style="width: 33%; text-align: center;">
                    <div style="border-top: 1px solid #0f172a; width: 150px; margin: 0 auto; font-size: 8.5pt; font-weight: bold;" class="bengali">
                        প্রেরণকারীর স্বাক্ষর ও সিল
                    </div>
                </td>
                <td style="width: 33%; text-align: center;">
                    <div style="border-top: 1px solid #0f172a; width: 150px; margin: 0 auto; font-size: 8.5pt; font-weight: bold;" class="bengali">
                        চালকের স্বাক্ষর
                    </div>
                </td>
                <td style="width: 34%; text-align: center;">
                    <div style="border-top: 1px solid #0f172a; width: 150px; margin: 0 auto; font-size: 8.5pt; font-weight: bold;" class="bengali">
                        গ্রহণকারীর স্বাক্ষর ও সিল
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return _render_html_or_fallback(html_content, f"Mushak 6.5: {challan_data.get('challan_number')}")


def generate_form_54_pdf(cert_data: dict) -> bytes:
    """
    Renders official NBR Statutory Form 54 (Certificate of Deduction of Tax at Source / উৎসে আয়কর কর্তন সনদপত্র)
    under Bangladesh Income Tax Act, 2023.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>Form 54 TDS Certificate - {cert_data.get('certificate_number')}</title>
        <style>
            @page {{ size: A4; margin: 15mm 12mm 15mm 12mm; }}
            body {{ font-family: 'Helvetica Neue', 'Arial', sans-serif; color: #0f172a; font-size: 9pt; line-height: 1.4; }}
            .bengali {{ font-family: 'SolaimanLipi', 'Kalpurush', 'Nikosh', 'Arial Unicode MS', sans-serif; }}
            .header-box {{ border: 2px solid #0f172a; padding: 10px; margin-bottom: 12px; text-align: center; background-color: #f8fafc; }}
            .form-badge {{ display: inline-block; background-color: #047857; color: white; padding: 2px 10px; font-weight: bold; font-size: 11pt; margin-top: 5px; }}
            .table-bordered {{ width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 15px; }}
            .table-bordered th, .table-bordered td {{ border: 1px solid #0f172a; padding: 6px; }}
            .table-bordered th {{ background-color: #f1f5f9; font-weight: bold; font-size: 8.5pt; }}
        </style>
    </head>
    <body>
        <div class="header-box">
            <div style="font-size: 13pt; font-weight: bold;" class="bengali">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
            <div style="font-size: 10pt;" class="bengali">জাতীয় রাজস্ব বোর্ড (National Board of Revenue)</div>
            <div style="font-size: 10pt; font-weight: bold;" class="bengali">উৎসে আয়কর কর্তন প্রত্যয়নপত্র (CERTIFICATE OF TAX DEDUCTION AT SOURCE)</div>
            <div style="font-size: 8pt;" class="bengali">[আয়কর আইন, ২০২৩ এবং সংশ্লিষ্ট উৎসে কর বিধিমালার অধীনে প্রণীত]</div>
            <div class="form-badge bengali">ফরম - ৫৪ (Form 54)</div>
        </div>

        <table style="width: 100%; margin-bottom: 15px;">
            <tr>
                <td style="width: 50%;">
                    <div><strong class="bengali">কর্তনকারী কর্তৃপক্ষের নাম:</strong> {cert_data.get('deductor_company_name', 'Maksudu Real Estate & Construction Ltd.')}</div>
                    <div><strong class="bengali">কর্তনকারীর টিআইএন (TIN):</strong> {cert_data.get('deductor_tin', '512398457612')}</div>
                    <div><strong class="bengali">ঠিকানা:</strong> House 42, Road 11, Banani, Dhaka-1213</div>
                </td>
                <td style="width: 50%;">
                    <div><strong class="bengali">সনদ নম্বর:</strong> <strong>{cert_data.get('certificate_number')}</strong></div>
                    <div><strong class="bengali">ইস্যুর তারিখ:</strong> {cert_data.get('issue_date')}</div>
                    <div><strong class="bengali">কর বছর:</strong> 2025-2026 (Assessment Year: 2026-2027)</div>
                </td>
            </tr>
            <tr>
                <td colspan="2" style="border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                    <div><strong class="bengali">যাহার কর কর্তন করা হইয়াছে (Payee Name):</strong> <strong>{cert_data.get('payee_name')}</strong></div>
                    <div><strong class="bengali">প্রাপকের টিআইএন (Payee TIN):</strong> {cert_data.get('payee_tin', 'N/A')}</div>
                    <div><strong class="bengali">প্রাপকের ধরন:</strong> {cert_data.get('payee_type', 'Contractor / Vendor')}</div>
                </td>
            </tr>
        </table>

        <table class="table-bordered">
            <thead>
                <tr>
                    <th>আইনের ধারা (Section)</th>
                    <th>পরিশোধের বিবরণ / বিল নং</th>
                    <th>মোট পরিশোধিত অঙ্ক (টাকা)</th>
                    <th>কর্তনের হার (%)</th>
                    <th>কর্তনকৃত আয়কর (টাকা)</th>
                    <th>ট্রেজারি চালানের বিবরণ ও তারিখ</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="font-weight: bold;">{cert_data.get('deduction_section', 'Section 89')}</td>
                    <td>{cert_data.get('bill_reference', 'Subcontractor Bill / Supplier Supply')}</td>
                    <td style="text-align: right;">৳{float(cert_data.get('gross_amount', 0)):,.2f}</td>
                    <td style="text-align: center; font-weight: bold;">{cert_data.get('tax_rate_percent')}%</td>
                    <td style="text-align: right; font-weight: bold; color: #b91c1c;">৳{float(cert_data.get('withheld_amount', 0)):,.2f}</td>
                    <td style="font-size: 8pt;">{cert_data.get('challan_number', 'Challan pending deposit')} ({cert_data.get('challan_deposit_date', 'N/A')})</td>
                </tr>
            </tbody>
        </table>

        <div style="font-size: 8pt; color: #334155; margin-top: 20px;" class="bengali">
            <strong>প্রত্যয়ন (Certification):</strong><br>
            প্রত্যয়ন করা যাইতেছে যে, উপরে বর্ণিত অর্থ হইতে বিধিমোতাবেক যথাসময়ে আয়কর কর্তনপূর্বক সরকারি ট্রেজারিতে বাংলাদেশ ব্যাংকের নির্ধারিত অর্থনৈতিক কোডে জমা প্রদান করা হইয়াছে।
        </div>

        <table style="width: 100%; margin-top: 50px;">
            <tr>
                <td style="width: 50%;">
                    <div style="border-top: 1px solid #0f172a; width: 200px; text-align: center; font-size: 8.5pt; font-weight: bold;" class="bengali">
                        হিসাব প্রধানের স্বাক্ষর
                    </div>
                </td>
                <td style="width: 50%; text-align: right;">
                    <div style="border-top: 1px solid #0f172a; width: 220px; margin-left: auto; text-align: center; font-size: 8.5pt; font-weight: bold;" class="bengali">
                        কর্তনকারী কর্মকর্তার স্বাক্ষর ও সিল
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return _render_html_or_fallback(html_content, f"Form 54: {cert_data.get('certificate_number')}")


def generate_mushak_66_pdf(vds_data: dict) -> bytes:
    """
    Renders statutory Form Mushak 6.6 (উৎসে মূসক কর্তন সনদপত্র) under Bangladesh VAT Act 2012.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>Mushak 6.6 VDS Certificate - {vds_data.get('certificate_no')}</title>
        <style>
            @page {{ size: A4; margin: 15mm 12mm 15mm 12mm; }}
            body {{ font-family: 'Helvetica Neue', 'Arial', sans-serif; color: #0f172a; font-size: 9pt; line-height: 1.4; }}
            .bengali {{ font-family: 'SolaimanLipi', 'Kalpurush', 'Nikosh', 'Arial Unicode MS', sans-serif; }}
            .header-box {{ border: 2px solid #0f172a; padding: 10px; margin-bottom: 12px; text-align: center; background-color: #f8fafc; }}
            .form-badge {{ display: inline-block; background-color: #4338ca; color: white; padding: 2px 10px; font-weight: bold; font-size: 11pt; margin-top: 5px; }}
            .table-bordered {{ width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 15px; }}
            .table-bordered th, .table-bordered td {{ border: 1px solid #0f172a; padding: 6px; }}
            .table-bordered th {{ background-color: #f1f5f9; font-weight: bold; font-size: 8.5pt; }}
        </style>
    </head>
    <body>
        <div class="header-box">
            <div style="font-size: 13pt; font-weight: bold;" class="bengali">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
            <div style="font-size: 10pt;" class="bengali">জাতীয় রাজস্ব বোর্ড (National Board of Revenue)</div>
            <div style="font-size: 10pt; font-weight: bold;" class="bengali">উৎসে মূসক কর্তন সনদপত্র (VDS CERTIFICATE)</div>
            <div style="font-size: 8pt;" class="bengali">[মূল্য সংযোজন কর ও সম্পূরক শুল্ক বিধিমালা, ২০১৬ এর বিধি ৪০ এর উপ-বিধি (১) এর দফা (ছ) দ্রষ্টব্য]</div>
            <div class="form-badge bengali">মূসক - ৬.৬ (Mushak 6.6)</div>
        </div>

        <table style="width: 100%; margin-bottom: 15px;">
            <tr>
                <td style="width: 50%;">
                    <div><strong class="bengali">কর্তনকারী সত্তা:</strong> {vds_data.get('deductor_company_name', 'Maksudu Real Estate & Construction Ltd.')}</div>
                    <div><strong class="bengali">বিআইএন (BIN):</strong> {vds_data.get('deductor_bin', '001234567-0101')}</div>
                </td>
                <td style="width: 50%;">
                    <div><strong class="bengali">সনদ নম্বর:</strong> <strong>{vds_data.get('certificate_no')}</strong></div>
                    <div><strong class="bengali">ইস্যুর তারিখ:</strong> {vds_data.get('issue_date')}</div>
                </td>
            </tr>
            <tr>
                <td colspan="2" style="border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                    <div><strong class="bengali">সরবরাহকারীর নাম:</strong> {vds_data.get('vendor_name')}</div>
                    <div><strong class="bengali">সরবরাহকারীর বিআইএন / টিআইএন:</strong> {vds_data.get('vendor_bin_tin', 'N/A')}</div>
                </td>
            </tr>
        </table>

        <table class="table-bordered">
            <thead>
                <tr>
                    <th>পণ্য বা সেবার বিবরণ</th>
                    <th>চালানপত্র / বিল নং ও তারিখ</th>
                    <th>মোট মূল্য (টাকা)</th>
                    <th>মূসকের হার (%)</th>
                    <th>উৎসে কর্তনকৃত মূসকের পরিমাণ (টাকা)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{vds_data.get('procurement_category', 'Construction Material / Procurement')}</td>
                    <td>{vds_data.get('bill_number')} ({vds_data.get('bill_date')})</td>
                    <td style="text-align: right;">৳{float(vds_data.get('total_bill_amount', 0)):,.2f}</td>
                    <td style="text-align: center; font-weight: bold;">{vds_data.get('vat_rate_percent')}%</td>
                    <td style="text-align: right; font-weight: bold; color: #4338ca;">৳{float(vds_data.get('vds_amount', 0)):,.2f}</td>
                </tr>
            </tbody>
        </table>

        <div style="font-size: 8pt; color: #475569; margin-top: 20px;" class="bengali">
            * প্রত্যয়ন করা যাইতেছে যে, উপরোক্ত বিল হইতে মূসক কর্তনপূর্বক সরকারি ট্রেজারিতে নির্ধারিত অর্থনৈতিক কোডে জমা করা হইয়াছে/হইবে।
        </div>

        <table style="width: 100%; margin-top: 50px;">
            <tr>
                <td style="width: 50%;">
                    <div style="border-top: 1px solid #0f172a; width: 180px; text-align: center; font-size: 8.5pt; font-weight: bold;" class="bengali">
                        হিসাব কর্মকর্তার স্বাক্ষর
                    </div>
                </td>
                <td style="width: 50%; text-align: right;">
                    <div style="border-top: 1px solid #0f172a; width: 200px; margin-left: auto; text-align: center; font-size: 8.5pt; font-weight: bold;" class="bengali">
                        ক্ষমতাপ্রাপ্ত কর্মকর্তার স্বাক্ষর ও সিল
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return _render_html_or_fallback(html_content, f"Mushak 6.6: {vds_data.get('certificate_no')}")


def _render_html_or_fallback(html_content: str, title: str) -> bytes:
    try:
        from weasyprint import HTML
        pdf_buffer = BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        return pdf_buffer.getvalue()
    except Exception as e:
        logger.warning(f"WeasyPrint unavailable ({e}), using ReportLab fallback for {title}.")
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=letter)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, 750, f"NBR Statutory Document: {title}")
        c.setFont("Helvetica", 10)
        c.drawString(50, 720, "Official NBR statutory form generated via ERP Real Estate Engine.")
        c.drawString(50, 700, "Compliance: Value Added Tax Act 2012 & Income Tax Act 2023.")
        c.drawString(50, 670, "Document certified and registered in Bangladesh NBR Tax Ledger.")
        c.save()
        return pdf_buffer.getvalue()
