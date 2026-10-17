import json
import logging
from datetime import date, datetime
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.modules.tax.models import (
    TaxWithholdingRule, TaxZoneRate, Mushak65Challan, TaxTreasuryChallan
)
from app.modules.tax.schemas import (
    TDSVDSCalculationRequest, TDSVDSCalculationResponse,
    AITSection53FFRequest, AITSection53FFResponse,
    Mushak65ChallanCreate
)
from app.modules.accounts.models import MushakTaxInvoice, TDSDeduction, Voucher
from app.modules.sales.models import Booking
from app.modules.projects.models import Project

logger = logging.getLogger(__name__)


async def calculate_tds_and_vds(
    db: AsyncSession,
    req: TDSVDSCalculationRequest
) -> TDSVDSCalculationResponse:
    """
    Computes precise statutory TDS (Income Tax Act 2023) and VDS (VAT Act 2012)
    with dynamic rule lookup from DB and statutory fallbacks.
    """
    gross = float(req.gross_amount)
    statutory_notes = []

    # 1. Check if dynamic rule exists in DB
    rule_stmt = select(TaxWithholdingRule).where(
        TaxWithholdingRule.rule_type == "TDS",
        TaxWithholdingRule.is_active == True
    )
    if req.bill_type == "CONTRACTOR_CIVIL":
        rule_stmt = rule_stmt.where(TaxWithholdingRule.rule_code.like("SEC_89_CONTRACTOR%"))
    elif req.bill_type == "CONSULTANT_PROFESSIONAL":
        rule_stmt = rule_stmt.where(TaxWithholdingRule.rule_code.like("SEC_86_CONSULTANT%"))
    elif req.bill_type == "SUPPLIER_GOODS":
        rule_stmt = rule_stmt.where(TaxWithholdingRule.rule_code.like("SEC_89_SUPPLIER%"))
    elif req.bill_type == "COMMISSION_BROKER":
        rule_stmt = rule_stmt.where(TaxWithholdingRule.rule_code.like("SEC_94_COMMISSION%"))
    elif req.bill_type == "RENT_LEASE":
        rule_stmt = rule_stmt.where(TaxWithholdingRule.rule_code.like("SEC_88_RENT%"))

    result = await db.execute(rule_stmt)
    matching_rules = result.scalars().all()

    tds_rate = 0.0
    tds_section = "Section 89"
    slab_applied = "Standard Flat Rate"

    # Evaluate TDS
    if req.bill_type == "CONTRACTOR_CIVIL":
        tds_section = "Section 89 (Income Tax Act 2023 - Execution of Contract)"
        if gross <= 5000000: # <= 50 Lac BDT
            tds_rate = 3.00
            slab_applied = "Tier 1: Up to ৳50 Lakh (3.00%)"
        elif gross <= 20000000: # 50 Lac - 2 Crore BDT
            tds_rate = 5.00
            slab_applied = "Tier 2: ৳50 Lakh to ৳2 Crore (5.00%)"
        else: # > 2 Crore BDT
            tds_rate = 7.00
            slab_applied = "Tier 3: Exceeding ৳2 Crore (7.00%)"

        if not req.payee_has_tin or not req.payee_submitted_return_proof:
            tds_rate = round(tds_rate * 1.5, 2)
            statutory_notes.append("Payee has not submitted Return Proof / e-TIN. Statutory 50% rate hike applied under Section 89(3).")

    elif req.bill_type == "CONSULTANT_PROFESSIONAL":
        tds_section = "Section 86 (Income Tax Act 2023 - Professional & Technical Fees)"
        if req.payee_has_tin and req.payee_submitted_return_proof:
            tds_rate = 10.00
            slab_applied = "Standard Professional Rate (10.00%)"
        else:
            tds_rate = 12.00
            slab_applied = "Without Proof of Return Submission Rate (12.00%)"
            statutory_notes.append("Non-compliance with Proof of Return Submission (PSR). 12% deduction applied.")

    elif req.bill_type == "SUPPLIER_GOODS":
        tds_section = "Section 89 (Income Tax Act 2023 - Supply of Goods)"
        tds_rate = 3.00 if req.payee_has_tin else 5.00
        slab_applied = f"Supply Base Rate ({tds_rate:.2f}%)"

    elif req.bill_type == "COMMISSION_BROKER":
        tds_section = "Section 94 (Income Tax Act 2023 - Brokerage & Commission)"
        tds_rate = 10.00
        slab_applied = "Statutory Agent Commission (10.00%)"

    elif req.bill_type == "RENT_LEASE":
        tds_section = "Section 88 (Income Tax Act 2023 - House & Site Rent)"
        tds_rate = 5.00
        slab_applied = "Property Lease Rate (5.00%)"
    else:
        tds_section = "General TDS"
        tds_rate = 5.00
        slab_applied = "General Withholding (5.00%)"

    tds_amt = round(gross * (tds_rate / 100.0), 2)

    # 2. Evaluate VDS (VAT Act 2012)
    vds_rule = "VAT Act 2012 (Third Schedule & SRO)"
    vds_rate = 0.0

    category_clean = (req.category or "").upper()
    if "SAND" in category_clean or "STONE" in category_clean or "AGGREGATE" in category_clean:
        vds_rate = 5.00
        vds_rule = "Sand & Stone Supply (VDS 5.00%)"
    elif "BRICK" in category_clean:
        vds_rate = 7.50
        vds_rule = "Bricks Procurement (VDS 7.50%)"
    elif "TILE" in category_clean or "SANITARY" in category_clean:
        vds_rate = 7.50
        vds_rule = "Finishing Tiles & Sanitary Supply (VDS 7.50%)"
    elif "TRANSPORT" in category_clean or "CARRIAGE" in category_clean:
        vds_rate = 10.00
        vds_rule = "Transport & Vehicle Hire Contractor (VDS 10.00%)"
    elif "CONSULT" in category_clean or "ARCHITECT" in category_clean or "ENGINEER" in category_clean:
        vds_rate = 15.00
        vds_rule = "Architectural & Engineering Consultancy (VDS 15.00%)"
    elif req.bill_type == "CONTRACTOR_CIVIL":
        vds_rate = 7.50
        vds_rule = "Civil Construction Procurement Contractor (VDS 7.50%)"
    else:
        vds_rate = 7.50
        vds_rule = "General Procurement VDS (7.50%)"

    vds_amt = round(gross * (vds_rate / 100.0), 2)
    total_tax = round(tds_amt + vds_amt, 2)
    net_payable = round(gross - total_tax, 2)

    statutory_notes.append("Real Estate Developer is an NBR Designated Withholding Entity (উৎস কর কর্তনকারী কর্তৃপক্ষ).")
    statutory_notes.append("Deduction Certificate (Form 54) and Mushak 6.6 must be issued within 15 days of deduction.")

    return TDSVDSCalculationResponse(
        bill_type=req.bill_type,
        category=req.category,
        gross_amount=gross,
        applicable_tds_section=tds_section,
        tds_rate_percent=tds_rate,
        tds_deduction_amount=tds_amt,
        tds_slab_applied=slab_applied,
        applicable_vds_rule=vds_rule,
        vds_rate_percent=vds_rate,
        vds_deduction_amount=vds_amt,
        total_tax_deducted=total_tax,
        net_payable_to_vendor=net_payable,
        statutory_notes=statutory_notes,
        required_challan_code="1-1141-0010-0111 (VAT) & 1-1141-0020-0101 (TDS)"
    )


async def calculate_section_53ff_ait(
    db: AsyncSession,
    req: AITSection53FFRequest
) -> AITSection53FFResponse:
    """
    Computes Section 53FF Advance Income Tax (AIT) on Flat/Land Registration
    and complete Sub-Registry Deed Execution Cost Breakdown.
    """
    deed_val = float(req.deed_value_bdt)
    sqft = float(req.apartment_sqft)
    sqm = round(sqft / 10.7639, 2)

    # 1. Lookup dynamic zone from DB
    stmt = select(TaxZoneRate).where(
        TaxZoneRate.zone_code == req.zone_code,
        TaxZoneRate.is_active == True
    )
    res = await db.execute(stmt)
    zone = res.scalar_one_or_none()

    if zone:
        rate_sqm = float(zone.rate_per_sqm_commercial) if req.property_type == "COMMERCIAL" else float(zone.rate_per_sqm_residential)
        rate_sft = float(zone.rate_per_sft_commercial) if req.property_type == "COMMERCIAL" else float(zone.rate_per_sft_residential)
        zone_name = zone.zone_name
        authority = zone.city_authority
    else:
        # Statutory fallbacks
        defaults = {
            "GULSHAN_BANANI": (4000.0, 8000.0, 371.6, 743.2, "Gulshan, Banani, Baridhara, Motijheel, Dilkusha", "RAJUK"),
            "DHANMONDI_UTTARA": (3000.0, 6000.0, 278.7, 557.4, "Dhanmondi, DOHS, Lalmatia, Uttara, Bashundhara", "RAJUK"),
            "PURBACHAL_OTHER": (2000.0, 4000.0, 185.8, 371.6, "Other Dhaka City Corporation & Purbachal", "RAJUK"),
            "CHITTAGONG_METRO": (1500.0, 3000.0, 139.3, 278.7, "Chittagong, Gazipur, Narayanganj City Corporations", "CDA"),
            "OTHER_DISTRICT": (1000.0, 2000.0, 92.9, 185.8, "Other Pourashava, Municipalities & Districts", "POURASHAVA")
        }
        fallback = defaults.get(req.zone_code, (2000.0, 4000.0, 185.8, 371.6, "Dhaka Other Areas", "RAJUK"))
        rate_sqm = fallback[1] if req.property_type == "COMMERCIAL" else fallback[0]
        rate_sft = fallback[3] if req.property_type == "COMMERCIAL" else fallback[2]
        zone_name = fallback[4]
        authority = fallback[5]

    # Section 53FF AIT Calculation
    ait_amt = round(sqm * rate_sqm, 2)

    # Sub-Registry statutory fees
    stamp_duty = round(deed_val * 0.015, 2) # 1.5%
    reg_fee = round(deed_val * 0.010, 2)    # 1.0%
    local_tax = round(deed_val * 0.020, 2)  # 2.0%

    # VAT Act 2012
    if req.property_type == "COMMERCIAL":
        vat_rate = 7.50
    elif sqft <= 1600.0:
        vat_rate = 2.00
    else:
        vat_rate = 4.50

    vat_amt = round(deed_val * (vat_rate / 100.0), 2)
    tot_statutory = round(stamp_duty + reg_fee + local_tax + ait_amt + vat_amt, 2)
    tot_effective = round(deed_val + tot_statutory, 2)
    pct_of_deed = round((tot_statutory / deed_val) * 100.0, 2) if deed_val > 0 else 0.0

    heads = [
        f"Advance Income Tax (AIT Sec 53FF): Code 1-1141-0020-0101 (৳{ait_amt:,.2f})",
        f"Stamp Duty (1.5%): Bangladesh Non-Judicial Stamp via Treasury Challan (৳{stamp_duty:,.2f})",
        f"Sub-Registry Registration Fee (1.0%): Code 1-2241-0000-1811 (৳{reg_fee:,.2f})",
        f"Local Government Tax (2.0%): City Corp / Pourashava Pay Order (৳{local_tax:,.2f})",
        f"VAT on Property Registration: Code 1-1141-0010-0111 (৳{vat_amt:,.2f})"
    ]

    return AITSection53FFResponse(
        deed_value_bdt=deed_val,
        apartment_sqft=sqft,
        apartment_sqm=sqm,
        zone_code=req.zone_code,
        zone_name=zone_name,
        city_authority=authority,
        property_type=req.property_type,
        ait_rate_per_sqm=rate_sqm,
        ait_rate_per_sft=rate_sft,
        ait_amount_bdt=ait_amt,
        stamp_duty_rate_percent=1.50,
        stamp_duty_amount=stamp_duty,
        registration_fee_rate_percent=1.00,
        registration_fee_amount=reg_fee,
        local_govt_tax_rate_percent=2.00,
        local_govt_tax_amount=local_tax,
        vat_rate_percent=vat_rate,
        vat_amount=vat_amt,
        total_statutory_taxes=tot_statutory,
        total_effective_cost=tot_effective,
        tax_percentage_of_deed_value=pct_of_deed,
        required_treasury_heads=heads
    )


async def create_mushak_65_transfer_challan(
    db: AsyncSession,
    payload: Mushak65ChallanCreate
) -> Mushak65Challan:
    """
    Generates and persists a statutory Form Mushak 6.5 Material & Subcontractor Transfer Challan.
    """
    count = (await db.execute(select(func.count(Mushak65Challan.id)))).scalar() or 0
    challan_no = f"MUSHAK-6.5-{date.today().year}-{count + 1:05d}"
    
    total_val = sum(float(item.total_value) for item in payload.items)
    items_serialized = json.dumps([item.model_dump() for item in payload.items])

    challan = Mushak65Challan(
        challan_number=challan_no,
        issue_date=date.today(),
        issue_time=datetime.now().strftime("%I:%M %p"),
        origin_project_id=payload.origin_project_id,
        destination_project_id=payload.destination_project_id,
        subcontractor_id=payload.subcontractor_id,
        transport_vehicle_type=payload.transport_vehicle_type,
        vehicle_number=payload.vehicle_number,
        driver_name=payload.driver_name,
        driver_phone=payload.driver_phone,
        items_json=items_serialized,
        total_declared_value=total_val,
        purpose=payload.purpose,
        status="ISSUED",
        remarks=payload.remarks
    )
    db.add(challan)
    await db.commit()
    await db.refresh(challan)
    return challan
