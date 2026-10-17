import json
import logging
from io import BytesIO
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from app.core.database import get_db
from app.modules.tax.models import (
    TaxWithholdingRule, TaxZoneRate, Mushak65Challan, TaxTreasuryChallan
)
from app.modules.tax.schemas import (
    TaxWithholdingRuleCreate, TaxWithholdingRuleResponse,
    TaxZoneRateCreate, TaxZoneRateResponse,
    TDSVDSCalculationRequest, TDSVDSCalculationResponse,
    AITSection53FFRequest, AITSection53FFResponse,
    Mushak63InvoiceCreate, Mushak63InvoiceResponse,
    Mushak65ChallanCreate, Mushak65ChallanResponse,
    TaxTreasuryChallanCreate, TaxTreasuryChallanResponse
)
from app.modules.tax.services import (
    calculate_tds_and_vds, calculate_section_53ff_ait,
    create_mushak_65_transfer_challan
)
from app.modules.tax.mushak_pdf_engine import (
    generate_mushak_63_pdf, generate_mushak_65_pdf,
    generate_form_54_pdf, generate_mushak_66_pdf
)
from app.modules.accounts.models import MushakTaxInvoice, TDSDeduction, Voucher
from app.modules.accounts.schemas import TDSDeductionResponse, TDSDeductionCreate, TDSDeductionDeposit
from app.modules.accounts.services import post_vat_mushak_revenue_voucher
from app.modules.sales.models import Booking
from app.modules.projects.models import Project
from app.modules.procurement.models import Vendor
from app.modules.construction.models import Subcontractor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tax", tags=["Bangladesh NBR VAT (Mushak 6.3/6.5), TDS/VDS & Section 53FF AIT"])


# --------------------------------------------------------------------------
# 1. Statutory Mushak 6.3 Tax Invoices (VAT Act 2012)
# --------------------------------------------------------------------------
@router.get("/mushak-6-3", response_model=List[Mushak63InvoiceResponse])
async def list_mushak_invoices(
    booking_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List statutory Mushak 6.3 Tax Invoices issued to property buyers.
    """
    stmt = (
        select(MushakTaxInvoice)
        .options(
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.project),
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.customer),
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.unit)
        )
        .order_by(MushakTaxInvoice.id.desc())
    )
    if booking_id:
        stmt = stmt.where(MushakTaxInvoice.booking_id == booking_id)

    result = await db.execute(stmt)
    invoices = result.scalars().all()

    resp_list: List[Mushak63InvoiceResponse] = []
    for inv in invoices:
        resp = Mushak63InvoiceResponse.model_validate(inv)
        if inv.booking:
            resp.booking_reference_no = inv.booking.booking_reference_no
            resp.customer_name = inv.booking.customer.full_name_en if inv.booking.customer else None
            resp.project_name = inv.booking.project.project_name if inv.booking.project else None
            resp.unit_number = inv.booking.unit.unit_number if inv.booking.unit else None
        resp_list.append(resp)
    return resp_list


@router.get("/mushak-6-3/{invoice_id}", response_model=Mushak63InvoiceResponse)
async def get_mushak_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve details for a single Mushak 6.3 Tax Invoice.
    """
    stmt = (
        select(MushakTaxInvoice)
        .options(
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.project),
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.customer),
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.unit)
        )
        .where(MushakTaxInvoice.id == invoice_id)
    )
    res = await db.execute(stmt)
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Mushak 6.3 invoice not found.")

    resp = Mushak63InvoiceResponse.model_validate(inv)
    if inv.booking:
        resp.booking_reference_no = inv.booking.booking_reference_no
        resp.customer_name = inv.booking.customer.full_name_en if inv.booking.customer else None
        resp.project_name = inv.booking.project.project_name if inv.booking.project else None
        resp.unit_number = inv.booking.unit.unit_number if inv.booking.unit else None
    return resp


@router.post("/mushak-6-3", response_model=Mushak63InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def generate_mushak_invoice(
    payload: Mushak63InvoiceCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Generates and issues a Statutory Mushak 6.3 Tax Invoice under VAT Act 2012:
    - Residential <= 1,600 sq ft: 2.0% VAT
    - Residential > 1,600 sq ft: 4.5% VAT
    - Commercial properties: 7.5% VAT
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.project),
            selectinload(Booking.customer),
            selectinload(Booking.unit)
        )
        .where(Booking.id == payload.booking_id)
    )
    res = await db.execute(stmt)
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    sqft = float(booking.unit.gross_sft) if (booking.unit and booking.unit.gross_sft) else 1500.0

    apt_type = payload.apartment_type or "RESIDENTIAL"
    if apt_type == "COMMERCIAL":
        vat_rate = 7.50
    elif sqft <= 1600.00:
        vat_rate = 2.00
    else:
        vat_rate = 4.50

    taxable = float(payload.taxable_amount)
    vat_amt = round(taxable * (vat_rate / 100.0), 2)
    tot_collected = round(taxable + vat_amt, 2)

    count = (await db.execute(select(func.count(MushakTaxInvoice.id)))).scalar() or 0
    challan_no = f"MUSHAK-6.3-{date.today().year}-{count + 1:05d}"

    cust_tin_nid = payload.customer_tin_nid or (
        f"TIN: {booking.customer.tin_number}" if (booking.customer and booking.customer.tin_number)
        else (f"NID: {booking.customer.nid_number}" if (booking.customer and booking.customer.nid_number) else "NID: 19852691234567890")
    )

    inv = MushakTaxInvoice(
        booking_id=booking.id,
        mushak_challan_number=challan_no,
        invoice_date=date.today(),
        developer_bin_number="001234567-0101",
        customer_tin_nid=cust_tin_nid,
        apartment_sqft=sqft,
        taxable_amount=taxable,
        vat_rate_percent=vat_rate,
        vat_amount=vat_amt,
        total_amount_collected=tot_collected,
        pdf_url=f"/api/v1/tax/mushak-6-3/{count + 1}/pdf",
        status="ISSUED"
    )
    db.add(inv)
    await db.flush()

    try:
        await post_vat_mushak_revenue_voucher(
            db=db,
            booking_id=booking.id,
            mushak_challan_number=challan_no,
            taxable_amount=float(taxable),
            vat_amount=float(vat_amt),
            total_collected=float(tot_collected),
            project_id=booking.project_id if booking else None
        )
    except Exception as e:
        logger.warning(f"Could not auto-post VAT GL voucher: {e}")

    await db.commit()
    await db.refresh(inv)

    resp = Mushak63InvoiceResponse.model_validate(inv)
    resp.booking_reference_no = booking.booking_reference_no
    resp.customer_name = booking.customer.full_name_en if booking.customer else None
    resp.project_name = booking.project.project_name if booking.project else None
    resp.unit_number = booking.unit.unit_number if booking.unit else None
    return resp


@router.get("/mushak-6-3/{invoice_id}/pdf")
async def download_mushak_63_pdf(invoice_id: int, db: AsyncSession = Depends(get_db)):
    """
    Renders and streams official bilingual NBR Form Mushak-6.3 PDF.
    """
    stmt = (
        select(MushakTaxInvoice)
        .options(
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.project),
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.customer),
            selectinload(MushakTaxInvoice.booking).selectinload(Booking.unit)
        )
        .where(MushakTaxInvoice.id == invoice_id)
    )
    res = await db.execute(stmt)
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Mushak 6.3 invoice not found.")

    invoice_data = {
        "mushak_challan_number": inv.mushak_challan_number,
        "invoice_date": inv.invoice_date.strftime("%d/%m/%Y"),
        "developer_company_name": "Maksudu Real Estate & Construction Ltd.",
        "developer_bin_number": inv.developer_bin_number,
        "customer_name": inv.booking.customer.full_name_en if (inv.booking and inv.booking.customer) else "Valued Client",
        "customer_tin_nid": inv.customer_tin_nid,
        "project_name": inv.booking.project.project_name if (inv.booking and inv.booking.project) else "Real Estate Project",
        "unit_number": inv.booking.unit.unit_number if (inv.booking and inv.booking.unit) else "5B",
        "apartment_sqft": float(inv.apartment_sqft),
        "taxable_amount": float(inv.taxable_amount),
        "vat_rate_percent": float(inv.vat_rate_percent),
        "vat_amount": float(inv.vat_amount),
        "total_amount_collected": float(inv.total_amount_collected)
    }

    pdf_bytes = generate_mushak_63_pdf(invoice_data)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={inv.mushak_challan_number}.pdf"}
    )


# --------------------------------------------------------------------------
# 2. Subcontractor & Goods Transfer Mushak 6.5 (VAT Act 2012)
# --------------------------------------------------------------------------
@router.get("/mushak-6-5", response_model=List[Mushak65ChallanResponse])
async def list_mushak_65_challans(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List statutory Form Mushak 6.5 Material & Subcontractor Transfer Challans.
    """
    stmt = (
        select(Mushak65Challan)
        .options(
            selectinload(Mushak65Challan.origin_project),
            selectinload(Mushak65Challan.destination_project),
            selectinload(Mushak65Challan.subcontractor)
        )
        .order_by(Mushak65Challan.id.desc())
    )
    if project_id:
        stmt = stmt.where(
            (Mushak65Challan.origin_project_id == project_id) |
            (Mushak65Challan.destination_project_id == project_id)
        )

    result = await db.execute(stmt)
    challans = result.scalars().all()

    resp_list: List[Mushak65ChallanResponse] = []
    for c in challans:
        r = Mushak65ChallanResponse.model_validate(c)
        r.origin_project_name = c.origin_project.project_name if c.origin_project else None
        r.destination_project_name = c.destination_project.project_name if c.destination_project else None
        r.subcontractor_name = c.subcontractor.company_name if c.subcontractor else None
        resp_list.append(r)
    return resp_list


@router.post("/mushak-6-5", response_model=Mushak65ChallanResponse, status_code=status.HTTP_201_CREATED)
async def create_mushak_65(
    payload: Mushak65ChallanCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Issues statutory Form Mushak 6.5 Goods Transfer Challan between construction sites or to subcontractors.
    """
    challan = await create_mushak_65_transfer_challan(db=db, payload=payload)

    # Reload relationships
    stmt = (
        select(Mushak65Challan)
        .options(
            selectinload(Mushak65Challan.origin_project),
            selectinload(Mushak65Challan.destination_project),
            selectinload(Mushak65Challan.subcontractor)
        )
        .where(Mushak65Challan.id == challan.id)
    )
    res = await db.execute(stmt)
    c = res.scalar_one()

    r = Mushak65ChallanResponse.model_validate(c)
    r.origin_project_name = c.origin_project.project_name if c.origin_project else None
    r.destination_project_name = c.destination_project.project_name if c.destination_project else None
    r.subcontractor_name = c.subcontractor.company_name if c.subcontractor else None
    return r


@router.get("/mushak-6-5/{challan_id}/pdf")
async def download_mushak_65_pdf(challan_id: int, db: AsyncSession = Depends(get_db)):
    """
    Renders and streams official NBR Form Mushak-6.5 Goods Transfer PDF.
    """
    stmt = (
        select(Mushak65Challan)
        .options(
            selectinload(Mushak65Challan.origin_project),
            selectinload(Mushak65Challan.destination_project),
            selectinload(Mushak65Challan.subcontractor)
        )
        .where(Mushak65Challan.id == challan_id)
    )
    res = await db.execute(stmt)
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Mushak 6.5 challan not found.")

    items_list = json.loads(c.items_json) if c.items_json else []

    challan_data = {
        "challan_number": c.challan_number,
        "issue_date": c.issue_date.strftime("%d/%m/%Y"),
        "issue_time": c.issue_time,
        "developer_company_name": "Maksudu Real Estate & Construction Ltd.",
        "developer_bin": "001234567-0101",
        "origin_project_name": c.origin_project.project_name if c.origin_project else "Central Warehouse",
        "destination_project_name": c.destination_project.project_name if c.destination_project else "Site / Fabrication Yard",
        "subcontractor_name": c.subcontractor.company_name if c.subcontractor else None,
        "transport_vehicle_type": c.transport_vehicle_type,
        "vehicle_number": c.vehicle_number,
        "driver_name": c.driver_name,
        "driver_phone": c.driver_phone,
        "items": items_list,
        "total_declared_value": float(c.total_declared_value)
    }

    pdf_bytes = generate_mushak_65_pdf(challan_data)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={c.challan_number}.pdf"}
    )


# --------------------------------------------------------------------------
# 3. Dynamic TDS & VDS Calculation Engine (Income Tax Act 2023)
# --------------------------------------------------------------------------
@router.post("/tds-calculator", response_model=TDSVDSCalculationResponse)
async def calculate_tds_calculator_endpoint(
    payload: TDSVDSCalculationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Automated TDS (Income Tax Act 2023) & VDS (VAT Act 2012) Calculator:
    - Contractor bills: 3% to 7% based on bill size
    - Professional/Consultant fees: 10% to 12%
    - Supplier supplies: 2% to 5%
    - VDS on Sand, Bricks, Tiles, Transport, Consultancy
    """
    return await calculate_tds_and_vds(db=db, req=payload)


# --------------------------------------------------------------------------
# 4. Section 53FF Advance Income Tax (AIT) Calculator
# --------------------------------------------------------------------------
@router.post("/ait-section-53ff", response_model=AITSection53FFResponse)
async def calculate_ait_section_53ff_endpoint(
    payload: AITSection53FFRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Computes Section 53FF Advance Income Tax (AIT) and exact Sub-Registry Execution Cost:
    - Rajuk / CDA / Pourashava / Cantonment Zone Rates per Sqm
    - Stamp Duty (1.5%) + Reg Fee (1.0%) + Local Govt Tax (2.0%) + VAT
    """
    return await calculate_section_53ff_ait(db=db, req=payload)


# --------------------------------------------------------------------------
# 5. Dynamic Withholding Rules Configuration (ZERO hardcoding)
# --------------------------------------------------------------------------
@router.get("/withholding-rules", response_model=List[TaxWithholdingRuleResponse])
async def list_withholding_rules(db: AsyncSession = Depends(get_db)):
    """
    List all active configurable TDS/VDS rules.
    """
    stmt = select(TaxWithholdingRule).order_by(TaxWithholdingRule.rule_code.asc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/withholding-rules", response_model=TaxWithholdingRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_withholding_rule(
    payload: TaxWithholdingRuleCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Add or update a statutory TDS/VDS rule dynamically.
    """
    rule = TaxWithholdingRule(**payload.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


# --------------------------------------------------------------------------
# 6. Dynamic Section 53FF Tax Zones Configuration
# --------------------------------------------------------------------------
@router.get("/tax-zones", response_model=List[TaxZoneRateResponse])
async def list_tax_zones(db: AsyncSession = Depends(get_db)):
    """
    List all Section 53FF Tax Zones and rates.
    """
    stmt = select(TaxZoneRate).order_by(TaxZoneRate.zone_code.asc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/tax-zones", response_model=TaxZoneRateResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_zone(
    payload: TaxZoneRateCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Add a new location zone with Section 53FF rates.
    """
    zone = TaxZoneRate(**payload.model_dump())
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return zone


# --------------------------------------------------------------------------
# 7. Statutory Deduction Certificates (Form 54 & Mushak 6.6)
# --------------------------------------------------------------------------
@router.get("/certificates/form-54/{tds_id}/pdf")
async def download_form_54_pdf(tds_id: int, db: AsyncSession = Depends(get_db)):
    """
    Generates official NBR Statutory Form 54 Certificate of Tax Deduction at Source.
    """
    stmt = (
        select(TDSDeduction)
        .options(
            selectinload(TDSDeduction.vendor),
            selectinload(TDSDeduction.contractor),
            selectinload(TDSDeduction.voucher)
        )
        .where(TDSDeduction.id == tds_id)
    )
    res = await db.execute(stmt)
    tds = res.scalar_one_or_none()
    if not tds:
        raise HTTPException(status_code=404, detail="TDS record not found.")

    payee_name = tds.contractor.company_name if tds.contractor else (tds.vendor.vendor_name if tds.vendor else "Subcontractor / Supplier")
    payee_tin = tds.vendor.tin_number if (tds.vendor and tds.vendor.tin_number) else "TIN: 198425123984"

    cert_data = {
        "certificate_number": f"NBR-FORM54-2026-{tds.id:05d}",
        "issue_date": date.today().strftime("%d/%m/%Y"),
        "deductor_company_name": "Maksudu Real Estate & Construction Ltd.",
        "deductor_tin": "512398457612",
        "payee_name": payee_name,
        "payee_tin": payee_tin,
        "payee_type": "Civil Subcontractor" if tds.contractor else "Material Supplier",
        "deduction_section": tds.deduction_section,
        "bill_reference": f"Voucher #{tds.voucher.voucher_number}" if tds.voucher else "Contract Bill",
        "gross_amount": float(tds.gross_amount),
        "tax_rate_percent": float(tds.tax_rate_percent),
        "withheld_amount": float(tds.withheld_amount),
        "challan_number": tds.challan_number or "Pending Deposit",
        "challan_deposit_date": tds.challan_deposit_date.strftime("%d/%m/%Y") if tds.challan_deposit_date else "N/A"
    }

    pdf_bytes = generate_form_54_pdf(cert_data)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={cert_data['certificate_number']}.pdf"}
    )


@router.get("/certificates/mushak-6-6/{tds_id}/pdf")
async def download_mushak_66_pdf(tds_id: int, db: AsyncSession = Depends(get_db)):
    """
    Generates official NBR Statutory Form Mushak 6.6 VDS Withholding Certificate.
    """
    stmt = (
        select(TDSDeduction)
        .options(
            selectinload(TDSDeduction.vendor),
            selectinload(TDSDeduction.contractor),
            selectinload(TDSDeduction.voucher)
        )
        .where(TDSDeduction.id == tds_id)
    )
    res = await db.execute(stmt)
    tds = res.scalar_one_or_none()
    if not tds:
        raise HTTPException(status_code=404, detail="Deduction record not found.")

    vendor_name = tds.vendor.vendor_name if tds.vendor else (tds.contractor.company_name if tds.contractor else "Vendor")
    vendor_bin = tds.vendor.bin_number if (tds.vendor and tds.vendor.bin_number) else "BIN: 009876543-0202"

    vds_data = {
        "certificate_no": f"MUSHAK-6.6-2026-{tds.id:05d}",
        "issue_date": date.today().strftime("%d/%m/%Y"),
        "deductor_company_name": "Maksudu Real Estate & Construction Ltd.",
        "deductor_bin": "001234567-0101",
        "vendor_name": vendor_name,
        "vendor_bin_tin": vendor_bin,
        "procurement_category": tds.deduction_section,
        "bill_number": f"BILL-REF-{tds.id:04d}",
        "bill_date": date.today().strftime("%d/%m/%Y"),
        "total_bill_amount": float(tds.gross_amount),
        "vat_rate_percent": float(tds.tax_rate_percent),
        "vds_amount": float(tds.withheld_amount)
    }

    pdf_bytes = generate_mushak_66_pdf(vds_data)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={vds_data['certificate_no']}.pdf"}
    )


# --------------------------------------------------------------------------
# 8. Treasury Challan Register (Form TR-6)
# --------------------------------------------------------------------------
@router.get("/treasury-challans", response_model=List[TaxTreasuryChallanResponse])
async def list_treasury_challans(db: AsyncSession = Depends(get_db)):
    """
    List NBR Treasury Challan deposits.
    """
    stmt = select(TaxTreasuryChallan).order_by(TaxTreasuryChallan.deposit_date.desc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/treasury-challans", response_model=TaxTreasuryChallanResponse, status_code=status.HTTP_201_CREATED)
async def create_treasury_challan(
    payload: TaxTreasuryChallanCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Record an NBR Treasury Challan deposit in Sonali Bank / Bangladesh Bank.
    """
    challan = TaxTreasuryChallan(**payload.model_dump())
    db.add(challan)
    await db.commit()
    await db.refresh(challan)
    return challan
