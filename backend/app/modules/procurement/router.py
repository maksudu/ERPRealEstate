import logging
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.modules.projects.models import Project
from app.modules.auth.models import User
from app.modules.procurement.models import (
    Vendor, MaterialItem, SiteStore, StoreStock,
    PurchaseRequisition, ComparativeStatement, CSQuotation,
    PurchaseOrder, GoodsReceipt
)
from app.modules.procurement.schemas import (
    VendorCreate, VendorResponse,
    MaterialItemCreate, MaterialItemResponse,
    SiteStoreCreate, SiteStoreResponse, StoreStockResponse, StockAdjustmentCreate,
    PurchaseRequisitionCreate, PurchaseRequisitionResponse,
    ComparativeStatementCreate, ComparativeStatementResponse, CSQuotationResponse,
    PurchaseOrderDirectCreate, PurchaseOrderCreateFromCS, PurchaseOrderResponse,
    GoodsReceiptCreate, GoodsReceiptResponse, GoodsReceipt3WayMatchRequest,
    ProcurementMetrics
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/procurement", tags=["Procurement, Stores, CS & GRN 3-Way Match"])


# --------------------------------------------------------------------------
# 1. Vendors Master
# --------------------------------------------------------------------------
@router.get("/vendors", response_model=List[VendorResponse])
async def list_vendors(db: AsyncSession = Depends(get_db)):
    """
    List registered suppliers and materials vendors.
    """
    result = await db.execute(select(Vendor).order_by(Vendor.vendor_name.asc()))
    return result.scalars().all()


@router.post("/vendors", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(payload: VendorCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new supplier / materials vendor.
    """
    count = (await db.execute(select(func.count(Vendor.id)))).scalar() or 0
    vendor_code = f"VND-{count + 1:04d}"

    v = Vendor(
        vendor_code=vendor_code,
        vendor_name=payload.vendor_name,
        trade_category=payload.trade_category,
        contact_person=payload.contact_person,
        phone_number=payload.phone_number,
        email=payload.email,
        tin_number=payload.tin_number,
        bin_number=payload.bin_number,
        payment_terms_days=payload.payment_terms_days or 30
    )
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return v


# --------------------------------------------------------------------------
# 2. Materials Master
# --------------------------------------------------------------------------
@router.get("/materials", response_model=List[MaterialItemResponse])
async def list_materials(db: AsyncSession = Depends(get_db)):
    """
    List standard civil & finishing construction materials catalog.
    """
    result = await db.execute(select(MaterialItem).order_by(MaterialItem.category.asc(), MaterialItem.material_name.asc()))
    return result.scalars().all()


@router.post("/materials", response_model=MaterialItemResponse, status_code=status.HTTP_201_CREATED)
async def create_material(payload: MaterialItemCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new material catalog item.
    """
    mat = MaterialItem(
        material_code=payload.material_code,
        material_name=payload.material_name,
        category=payload.category,
        unit_of_measure=payload.unit_of_measure or "BAG",
        standard_unit_cost=payload.standard_unit_cost or 0.00
    )
    db.add(mat)
    await db.commit()
    await db.refresh(mat)
    return mat


# --------------------------------------------------------------------------
# 3. Site Stores & Stock Registers (Module 38)
# --------------------------------------------------------------------------
@router.get("/stores", response_model=List[SiteStoreResponse])
async def list_site_stores(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List all project site & central stores with current inventory stock and reorder alert levels.
    """
    stmt = (
        select(SiteStore)
        .options(
            selectinload(SiteStore.project),
            selectinload(SiteStore.store_in_charge),
            selectinload(SiteStore.stocks).selectinload(StoreStock.material)
        )
        .order_by(SiteStore.id.asc())
    )
    if project_id:
        stmt = stmt.where(SiteStore.project_id == project_id)

    result = await db.execute(stmt)
    stores = result.scalars().all()

    resp_list: List[SiteStoreResponse] = []
    for s in stores:
        resp = SiteStoreResponse.model_validate(s)
        resp.project_name = s.project.project_name if s.project else None
        resp.store_in_charge_name = s.store_in_charge.full_name_en if s.store_in_charge else "Store Keeper"
        
        stock_responses = []
        for st in s.stocks:
            st_resp = StoreStockResponse.model_validate(st)
            if st.material:
                st_resp.material_name = st.material.material_name
                st_resp.material_code = st.material.material_code
                st_resp.unit_of_measure = st.material.unit_of_measure
            st_resp.is_low_stock = float(st.current_stock_quantity) <= float(st.reorder_level)
            stock_responses.append(st_resp)
        resp.stocks = stock_responses
        resp_list.append(resp)

    return resp_list


@router.post("/stores", response_model=SiteStoreResponse, status_code=status.HTTP_201_CREATED)
async def create_site_store(payload: SiteStoreCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new site or central store location.
    """
    proj = await db.get(Project, payload.project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")

    store = SiteStore(
        project_id=payload.project_id,
        store_name=payload.store_name,
        location_details=payload.location_details,
        store_in_charge_user_id=payload.store_in_charge_user_id
    )
    db.add(store)
    await db.commit()
    await db.refresh(store)

    # Initialize standard materials with zero stock in this store
    materials = (await db.execute(select(MaterialItem))).scalars().all()
    for mat in materials:
        stk = StoreStock(
            store_id=store.id,
            material_id=mat.id,
            current_stock_quantity=0.00,
            reorder_level=100.00
        )
        db.add(stk)
    await db.commit()

    # Reload store with relationships
    stmt = (
        select(SiteStore)
        .options(
            selectinload(SiteStore.project),
            selectinload(SiteStore.store_in_charge),
            selectinload(SiteStore.stocks).selectinload(StoreStock.material)
        )
        .where(SiteStore.id == store.id)
    )
    res = await db.execute(stmt)
    store = res.scalar_one()

    resp = SiteStoreResponse.model_validate(store)
    resp.project_name = store.project.project_name if store.project else None
    resp.store_in_charge_name = store.store_in_charge.full_name_en if store.store_in_charge else "Store Keeper"
    return resp


@router.post("/stores/stock-adjust", response_model=StoreStockResponse)
async def adjust_store_stock(payload: StockAdjustmentCreate, db: AsyncSession = Depends(get_db)):
    """
    Perform direct inventory adjustments / initial stock load.
    """
    stmt = (
        select(StoreStock)
        .options(selectinload(StoreStock.material))
        .where(StoreStock.store_id == payload.store_id, StoreStock.material_id == payload.material_id)
    )
    res = await db.execute(stmt)
    stk = res.scalar_one_or_none()
    if not stk:
        stk = StoreStock(
            store_id=payload.store_id,
            material_id=payload.material_id,
            current_stock_quantity=max(0.0, payload.quantity_delta),
            reorder_level=100.00
        )
        db.add(stk)
    else:
        new_qty = float(stk.current_stock_quantity) + payload.quantity_delta
        stk.current_stock_quantity = max(0.0, new_qty)

    await db.commit()
    await db.refresh(stk)

    resp = StoreStockResponse.model_validate(stk)
    if stk.material:
        resp.material_name = stk.material.material_name
        resp.material_code = stk.material.material_code
        resp.unit_of_measure = stk.material.unit_of_measure
    resp.is_low_stock = float(stk.current_stock_quantity) <= float(stk.reorder_level)
    return resp


# --------------------------------------------------------------------------
# 4. Purchase Requisitions (PR) (Module 45)
# --------------------------------------------------------------------------
@router.get("/requisitions", response_model=List[PurchaseRequisitionResponse])
async def list_purchase_requisitions(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List site purchase indents and requisitions.
    """
    stmt = (
        select(PurchaseRequisition)
        .options(
            selectinload(PurchaseRequisition.project),
            selectinload(PurchaseRequisition.requester),
            selectinload(PurchaseRequisition.material)
        )
        .order_by(PurchaseRequisition.id.desc())
    )
    if project_id:
        stmt = stmt.where(PurchaseRequisition.project_id == project_id)
    if status_filter:
        stmt = stmt.where(PurchaseRequisition.status == status_filter)

    result = await db.execute(stmt)
    prs = result.scalars().all()

    resp_list: List[PurchaseRequisitionResponse] = []
    for pr in prs:
        resp = PurchaseRequisitionResponse.model_validate(pr)
        resp.project_name = pr.project.project_name if pr.project else None
        resp.requester_name = pr.requester.full_name_en if pr.requester else "Site Engineer"
        resp.material_name = pr.material.material_name if pr.material else None
        resp.unit_of_measure = pr.material.unit_of_measure if pr.material else None
        resp_list.append(resp)
    return resp_list


@router.post("/requisitions", response_model=PurchaseRequisitionResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_requisition(
    payload: PurchaseRequisitionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a new Site Purchase Requisition (PR).
    """
    proj = await db.get(Project, payload.project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    count = (await db.execute(select(func.count(PurchaseRequisition.id)).where(PurchaseRequisition.project_id == payload.project_id))).scalar() or 0
    pr_no = f"PR-{proj.project_code or 'PRJ'}-{date.today().year}-{count + 1:04d}"

    pr = PurchaseRequisition(
        project_id=payload.project_id,
        pr_number=pr_no,
        requested_by_user_id=user_id,
        requisition_date=date.today(),
        required_by_date=payload.required_by_date,
        material_id=payload.material_id,
        requested_quantity=payload.requested_quantity,
        purpose_notes=payload.purpose_notes,
        status="PENDING_CS"
    )
    db.add(pr)
    await db.commit()
    await db.refresh(pr)

    stmt = (
        select(PurchaseRequisition)
        .options(
            selectinload(PurchaseRequisition.project),
            selectinload(PurchaseRequisition.requester),
            selectinload(PurchaseRequisition.material)
        )
        .where(PurchaseRequisition.id == pr.id)
    )
    res = await db.execute(stmt)
    pr = res.scalar_one()

    resp = PurchaseRequisitionResponse.model_validate(pr)
    resp.project_name = pr.project.project_name if pr.project else None
    resp.requester_name = pr.requester.full_name_en if pr.requester else "Site Engineer"
    resp.material_name = pr.material.material_name if pr.material else None
    resp.unit_of_measure = pr.material.unit_of_measure if pr.material else None
    return resp


# --------------------------------------------------------------------------
# 5. Comparative Statements (CS) (Module 45)
# --------------------------------------------------------------------------
@router.get("/comparative-statements", response_model=List[ComparativeStatementResponse])
async def list_comparative_statements(
    pr_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List Comparative Statements comparing multi-vendor quotation bids.
    """
    stmt = (
        select(ComparativeStatement)
        .options(
            selectinload(ComparativeStatement.requisition).selectinload(PurchaseRequisition.project),
            selectinload(ComparativeStatement.requisition).selectinload(PurchaseRequisition.material),
            selectinload(ComparativeStatement.recommended_vendor),
            selectinload(ComparativeStatement.quotations).selectinload(CSQuotation.vendor)
        )
        .order_by(ComparativeStatement.id.desc())
    )
    if pr_id:
        stmt = stmt.where(ComparativeStatement.pr_id == pr_id)

    result = await db.execute(stmt)
    cs_list = result.scalars().all()

    resp_list: List[ComparativeStatementResponse] = []
    for cs in cs_list:
        resp = ComparativeStatementResponse.model_validate(cs)
        if cs.requisition:
            resp.pr_number = cs.requisition.pr_number
            resp.requested_quantity = float(cs.requisition.requested_quantity)
            resp.project_name = cs.requisition.project.project_name if cs.requisition.project else None
            resp.material_name = cs.requisition.material.material_name if cs.requisition.material else None
            resp.unit_of_measure = cs.requisition.material.unit_of_measure if cs.requisition.material else None
        resp.recommended_vendor_name = cs.recommended_vendor.vendor_name if cs.recommended_vendor else None

        quote_responses = []
        for q in cs.quotations:
            q_resp = CSQuotationResponse.model_validate(q)
            q_resp.vendor_name = q.vendor.vendor_name if q.vendor else None
            q_resp.vendor_code = q.vendor.vendor_code if q.vendor else None
            quote_responses.append(q_resp)
        resp.quotations = quote_responses
        resp_list.append(resp)

    return resp_list


@router.post("/comparative-statements", response_model=ComparativeStatementResponse, status_code=status.HTTP_201_CREATED)
async def create_comparative_statement(
    payload: ComparativeStatementCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new Comparative Statement (CS) comparing vendor quotes.
    Requires at least 2 vendor quotations for commercial audit rigor.
    """
    if len(payload.quotations) < 2:
        raise HTTPException(status_code=400, detail="A Comparative Statement requires at least 2 vendor quotations for commercial transparency.")

    pr = await db.get(PurchaseRequisition, payload.pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")

    count = (await db.execute(select(func.count(ComparativeStatement.id)))).scalar() or 0
    cs_no = f"CS-{date.today().year}-{count + 1:04d}"

    # Determine lowest bidder if not explicitly provided
    sorted_quotes = sorted(payload.quotations, key=lambda x: x.quoted_unit_rate)
    lowest_vendor_id = sorted_quotes[0].vendor_id
    rec_vendor_id = payload.recommended_vendor_id or lowest_vendor_id

    cs = ComparativeStatement(
        pr_id=payload.pr_id,
        cs_number=cs_no,
        cs_date=date.today(),
        recommended_vendor_id=rec_vendor_id,
        status="APPROVED",
        justification_summary=payload.justification_summary or f"Lowest responsive quote recommended (Vendor ID: {rec_vendor_id})."
    )
    db.add(cs)
    await db.commit()
    await db.refresh(cs)

    # Add vendor quotation rows
    req_qty = float(pr.requested_quantity)
    for q_input in payload.quotations:
        total_amt = round(float(q_input.quoted_unit_rate) * req_qty, 2)
        is_rec = (q_input.vendor_id == rec_vendor_id)
        quotation = CSQuotation(
            cs_id=cs.id,
            vendor_id=q_input.vendor_id,
            quoted_unit_rate=q_input.quoted_unit_rate,
            quoted_quantity=req_qty,
            total_quoted_amount=total_amt,
            credit_days_offered=q_input.credit_days_offered or 30,
            lead_time_days=q_input.lead_time_days or 3,
            is_recommended=is_rec,
            remarks=q_input.remarks
        )
        db.add(quotation)

    pr.status = "CS_PREPARED"
    await db.commit()

    # Reload CS with relationships
    stmt = (
        select(ComparativeStatement)
        .options(
            selectinload(ComparativeStatement.requisition).selectinload(PurchaseRequisition.project),
            selectinload(ComparativeStatement.requisition).selectinload(PurchaseRequisition.material),
            selectinload(ComparativeStatement.recommended_vendor),
            selectinload(ComparativeStatement.quotations).selectinload(CSQuotation.vendor)
        )
        .where(ComparativeStatement.id == cs.id)
    )
    res = await db.execute(stmt)
    cs = res.scalar_one()

    resp = ComparativeStatementResponse.model_validate(cs)
    resp.pr_number = cs.requisition.pr_number
    resp.requested_quantity = float(cs.requisition.requested_quantity)
    resp.project_name = cs.requisition.project.project_name if cs.requisition.project else None
    resp.material_name = cs.requisition.material.material_name if cs.requisition.material else None
    resp.unit_of_measure = cs.requisition.material.unit_of_measure if cs.requisition.material else None
    resp.recommended_vendor_name = cs.recommended_vendor.vendor_name if cs.recommended_vendor else None
    resp.quotations = [
        CSQuotationResponse(
            id=q.id,
            vendor_id=q.vendor_id,
            vendor_name=q.vendor.vendor_name if q.vendor else None,
            vendor_code=q.vendor.vendor_code if q.vendor else None,
            quoted_unit_rate=float(q.quoted_unit_rate),
            quoted_quantity=float(q.quoted_quantity),
            total_quoted_amount=float(q.total_quoted_amount),
            credit_days_offered=q.credit_days_offered,
            lead_time_days=q.lead_time_days,
            is_recommended=q.is_recommended,
            remarks=q.remarks
        ) for q in cs.quotations
    ]
    return resp


# --------------------------------------------------------------------------
# 6. Purchase Orders (PO) (Module 47)
# --------------------------------------------------------------------------
@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    project_id: Optional[int] = Query(None),
    vendor_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List issued procurement purchase orders with receiving progress.
    """
    stmt = (
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.project),
            selectinload(PurchaseOrder.vendor),
            selectinload(PurchaseOrder.material),
            selectinload(PurchaseOrder.store),
            selectinload(PurchaseOrder.goods_receipts)
        )
        .order_by(PurchaseOrder.id.desc())
    )
    if project_id:
        stmt = stmt.where(PurchaseOrder.project_id == project_id)
    if vendor_id:
        stmt = stmt.where(PurchaseOrder.vendor_id == vendor_id)
    if status_filter:
        stmt = stmt.where(PurchaseOrder.status == status_filter)

    result = await db.execute(stmt)
    pos = result.scalars().all()

    resp_list: List[PurchaseOrderResponse] = []
    for po in pos:
        resp = PurchaseOrderResponse.model_validate(po)
        resp.project_name = po.project.project_name if po.project else None
        resp.vendor_name = po.vendor.vendor_name if po.vendor else None
        resp.material_name = po.material.material_name if po.material else None
        resp.unit_of_measure = po.material.unit_of_measure if po.material else None
        resp.store_name = po.store.store_name if po.store else None

        tot_rcvd = sum(float(gr.accepted_quantity) for gr in po.goods_receipts)
        resp.total_received_quantity = tot_rcvd
        resp_list.append(resp)

    return resp_list


@router.post("/purchase-orders/generate-from-cs", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def generate_po_from_cs(
    payload: PurchaseOrderCreateFromCS,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate an official Purchase Order (PO) from an approved Comparative Statement (CS).
    """
    stmt = (
        select(ComparativeStatement)
        .options(
            selectinload(ComparativeStatement.requisition).selectinload(PurchaseRequisition.project),
            selectinload(ComparativeStatement.requisition).selectinload(PurchaseRequisition.material),
            selectinload(ComparativeStatement.quotations)
        )
        .where(ComparativeStatement.id == payload.cs_id)
    )
    res = await db.execute(stmt)
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Comparative Statement not found.")
    if not cs.recommended_vendor_id:
        raise HTTPException(status_code=400, detail="CS does not have a recommended vendor selected.")

    # Find the winning quote
    winning_quote = next((q for q in cs.quotations if q.vendor_id == cs.recommended_vendor_id), None)
    if not winning_quote:
        raise HTTPException(status_code=400, detail="Winning vendor quotation details missing.")

    store = await db.get(SiteStore, payload.destination_store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Destination store not found.")

    count = (await db.execute(select(func.count(PurchaseOrder.id)))).scalar() or 0
    po_no = f"PO-{date.today().year}-{count + 1:04d}"

    po = PurchaseOrder(
        po_number=po_no,
        cs_id=cs.id,
        project_id=cs.requisition.project_id,
        vendor_id=cs.recommended_vendor_id,
        material_id=cs.requisition.material_id,
        ordered_quantity=cs.requisition.requested_quantity,
        unit_price=winning_quote.quoted_unit_rate,
        total_po_amount=winning_quote.total_quoted_amount,
        po_date=date.today(),
        delivery_deadline=payload.delivery_deadline,
        destination_store_id=payload.destination_store_id,
        status="ISSUED",
        terms_and_conditions=payload.terms_and_conditions or "Payment within 30 days after 3-Way Match GRN verification."
    )
    db.add(po)

    cs.status = "PO_GENERATED"
    cs.requisition.status = "PO_ISSUED"
    await db.commit()
    await db.refresh(po)

    # Reload PO with relationships
    stmt = (
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.project),
            selectinload(PurchaseOrder.vendor),
            selectinload(PurchaseOrder.material),
            selectinload(PurchaseOrder.store),
            selectinload(PurchaseOrder.goods_receipts)
        )
        .where(PurchaseOrder.id == po.id)
    )
    res = await db.execute(stmt)
    po = res.scalar_one()

    resp = PurchaseOrderResponse.model_validate(po)
    resp.project_name = po.project.project_name if po.project else None
    resp.vendor_name = po.vendor.vendor_name if po.vendor else None
    resp.material_name = po.material.material_name if po.material else None
    resp.unit_of_measure = po.material.unit_of_measure if po.material else None
    resp.store_name = po.store.store_name if po.store else None
    resp.total_received_quantity = 0.00
    return resp


# --------------------------------------------------------------------------
# 7. Goods Receipt Notes (GRN) & 3-Way Invoice Matching (Module 38/47)
# --------------------------------------------------------------------------
@router.get("/goods-receipts", response_model=List[GoodsReceiptResponse])
async def list_goods_receipts(
    po_id: Optional[int] = Query(None),
    match_status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List GRNs with 3-Way Matching audit status (PO Quantity/Price vs. GRN Accepted vs. Supplier Invoice).
    """
    stmt = (
        select(GoodsReceipt)
        .options(
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.project),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material),
            selectinload(GoodsReceipt.received_by)
        )
        .order_by(GoodsReceipt.id.desc())
    )
    if po_id:
        stmt = stmt.where(GoodsReceipt.po_id == po_id)
    if match_status:
        stmt = stmt.where(GoodsReceipt.three_way_match_status == match_status)

    result = await db.execute(stmt)
    grns = result.scalars().all()

    resp_list: List[GoodsReceiptResponse] = []
    for gr in grns:
        resp = GoodsReceiptResponse.model_validate(gr)
        po = gr.purchase_order
        if po:
            resp.po_number = po.po_number
            resp.po_unit_price = float(po.unit_price)
            resp.project_name = po.project.project_name if po.project else None
            resp.vendor_name = po.vendor.vendor_name if po.vendor else None
            resp.material_name = po.material.material_name if po.material else None
            resp.unit_of_measure = po.material.unit_of_measure if po.material else None
        resp.received_by_name = gr.received_by.full_name_en if gr.received_by else "Store Officer"
        resp_list.append(resp)

    return resp_list


@router.post("/goods-receipts", response_model=GoodsReceiptResponse, status_code=status.HTTP_201_CREATED)
async def create_goods_receipt(
    payload: GoodsReceiptCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive consignment at site store:
    - Auto-generates GRN number.
    - Evaluates 3-Way matching formula: Expected Amount = Accepted Qty * PO Unit Price.
    - Automatically increments physical inventory in `scm_store_stock`.
    - Updates Purchase Order delivery fulfillment status.
    """
    stmt = (
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.project),
            selectinload(PurchaseOrder.vendor),
            selectinload(PurchaseOrder.material),
            selectinload(PurchaseOrder.store)
        )
        .where(PurchaseOrder.id == payload.po_id)
    )
    res = await db.execute(stmt)
    po = res.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found.")

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    rcvd_qty = float(payload.received_quantity)
    rej_qty = float(payload.rejected_quantity or 0.00)
    accepted_qty = max(0.0, rcvd_qty - rej_qty)

    # 3-Way Matching Calculation
    expected_amt = round(accepted_qty * float(po.unit_price), 2)
    inv_amt = float(payload.supplier_invoice_amount) if payload.supplier_invoice_amount else None
    variance = round(inv_amt - expected_amt, 2) if inv_amt is not None else 0.00

    match_status = "PENDING_MATCH"
    if inv_amt is not None:
        # If invoice matches expected value within 1 BDT rounding tolerance
        if abs(variance) <= 1.00:
            match_status = "MATCHED_OK"
        else:
            match_status = "VARIANCE_FLAGGED"

    count = (await db.execute(select(func.count(GoodsReceipt.id)))).scalar() or 0
    grn_no = f"GRN-{date.today().year}-{count + 1:04d}"

    grn = GoodsReceipt(
        po_id=po.id,
        grn_number=grn_no,
        receipt_date=date.today(),
        delivery_challan_number=payload.delivery_challan_number,
        challan_photo_url=payload.challan_photo_url or "assets/images/common/delivery_challan.jpg",
        received_by_user_id=user_id,
        received_quantity=rcvd_qty,
        rejected_quantity=rej_qty,
        accepted_quantity=accepted_qty,
        supplier_invoice_number=payload.supplier_invoice_number,
        supplier_invoice_amount=inv_amt,
        calculated_expected_amount=expected_amt,
        variance_amount=variance,
        three_way_match_status=match_status,
        status="VERIFIED_STORE",
        inspection_remarks=payload.inspection_remarks
    )
    db.add(grn)

    # Automatically increment store stock balance
    stk_stmt = (
        select(StoreStock)
        .where(StoreStock.store_id == po.destination_store_id, StoreStock.material_id == po.material_id)
    )
    stk_res = await db.execute(stk_stmt)
    store_stock = stk_res.scalar_one_or_none()
    if store_stock:
        store_stock.current_stock_quantity = float(store_stock.current_stock_quantity) + accepted_qty
    else:
        new_stk = StoreStock(
            store_id=po.destination_store_id,
            material_id=po.material_id,
            current_stock_quantity=accepted_qty,
            reorder_level=100.00
        )
        db.add(new_stk)

    # Update PO fulfillment status
    total_received_to_date = (
        await db.execute(
            select(func.sum(GoodsReceipt.accepted_quantity)).where(GoodsReceipt.po_id == po.id)
        )
    ).scalar() or 0.0
    total_received_to_date = float(total_received_to_date) + accepted_qty

    if total_received_to_date >= float(po.ordered_quantity):
        po.status = "FULLY_RECEIVED"
    else:
        po.status = "PARTIALLY_RECEIVED"

    await db.commit()
    await db.refresh(grn)

    resp = GoodsReceiptResponse.model_validate(grn)
    resp.po_number = po.po_number
    resp.po_unit_price = float(po.unit_price)
    resp.project_name = po.project.project_name if po.project else None
    resp.vendor_name = po.vendor.vendor_name if po.vendor else None
    resp.material_name = po.material.material_name if po.material else None
    resp.unit_of_measure = po.material.unit_of_measure if po.material else None
    resp.received_by_name = user.full_name_en if user else "Store Officer"
    return resp


@router.post("/goods-receipts/{grn_id}/3way-match", response_model=GoodsReceiptResponse)
async def execute_three_way_match(
    grn_id: int,
    payload: GoodsReceipt3WayMatchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Accounts Department 3-Way Match Verification:
    Compares PO Unit Price * Accepted Quantity against Supplier Invoice.
    If action is 'APPROVE_MATCH' and variance is acceptable, auto-generates Accounts liability voucher ref.
    """
    stmt = (
        select(GoodsReceipt)
        .options(
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.project),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material),
            selectinload(GoodsReceipt.received_by)
        )
        .where(GoodsReceipt.id == grn_id)
    )
    res = await db.execute(stmt)
    grn = res.scalar_one_or_none()
    if not grn:
        raise HTTPException(status_code=404, detail="GRN record not found.")

    po = grn.purchase_order
    accepted_qty = float(grn.accepted_quantity)
    po_rate = float(po.unit_price)
    expected_amt = round(accepted_qty * po_rate, 2)
    inv_amt = float(payload.supplier_invoice_amount)
    variance = round(inv_amt - expected_amt, 2)

    grn.supplier_invoice_number = payload.supplier_invoice_number
    grn.supplier_invoice_amount = inv_amt
    grn.calculated_expected_amount = expected_amt
    grn.variance_amount = variance

    if payload.approval_action == "APPROVE_MATCH":
        if abs(variance) > 50.00: # Exceeds allowed discrepancy
            grn.three_way_match_status = "VARIANCE_FLAGGED"
            grn.status = "VERIFIED_STORE"
            raise HTTPException(
                status_code=400,
                detail=f"3-Way Match Failed! Invoice amount ({inv_amt:,.2f} BDT) differs from expected certified quantity ({expected_amt:,.2f} BDT) by {variance:,.2f} BDT. Resolve commercial variance first."
            )
        else:
            grn.three_way_match_status = "ACCOUNTS_APPROVED"
            grn.status = "POSTED_ACCOUNTS"
            grn.accounts_voucher_ref = f"JV-PROC-{date.today().year}-{grn.id:04d}"
            logger.info("3-Way Match Passed for GRN %s. Emitted Accounts Journal Voucher: %s", grn.grn_number, grn.accounts_voucher_ref)
    else:
        grn.three_way_match_status = "VARIANCE_FLAGGED"

    if payload.accounts_notes:
        grn.inspection_remarks = f"{grn.inspection_remarks or ''}\n[Accounts Note: {payload.accounts_notes}]"

    await db.commit()
    await db.refresh(grn)

    resp = GoodsReceiptResponse.model_validate(grn)
    resp.po_number = po.po_number
    resp.po_unit_price = po_rate
    resp.project_name = po.project.project_name if po.project else None
    resp.vendor_name = po.vendor.vendor_name if po.vendor else None
    resp.material_name = po.material.material_name if po.material else None
    resp.unit_of_measure = po.material.unit_of_measure if po.material else None
    resp.received_by_name = grn.received_by.full_name_en if grn.received_by else "Store Officer"
    return resp


# --------------------------------------------------------------------------
# 8. Procurement Operations Metrics
# --------------------------------------------------------------------------
@router.get("/metrics", response_model=ProcurementMetrics)
async def get_procurement_metrics(db: AsyncSession = Depends(get_db)):
    """
    Returns executive supply chain KPI metrics.
    """
    stores_count = (await db.execute(select(func.count(SiteStore.id)).where(SiteStore.is_active == True))).scalar() or 0
    low_stock = (await db.execute(select(func.count(StoreStock.id)).where(StoreStock.current_stock_quantity <= StoreStock.reorder_level))).scalar() or 0
    pending_pr = (await db.execute(select(func.count(PurchaseRequisition.id)).where(PurchaseRequisition.status == "PENDING_CS"))).scalar() or 0
    active_po = (await db.execute(select(func.count(PurchaseOrder.id)).where(PurchaseOrder.status.in_(["ISSUED", "PARTIALLY_RECEIVED"])))).scalar() or 0
    po_val = (await db.execute(select(func.sum(PurchaseOrder.total_po_amount)))).scalar() or 0.0
    var_flags = (await db.execute(select(func.count(GoodsReceipt.id)).where(GoodsReceipt.three_way_match_status == "VARIANCE_FLAGGED"))).scalar() or 0

    return ProcurementMetrics(
        total_active_stores=stores_count,
        low_stock_items_count=low_stock,
        pending_pr_count=pending_pr,
        active_po_count=active_po,
        total_po_value=float(po_val),
        grn_variance_flags=var_flags
    )
