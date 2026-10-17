import logging
from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.modules.projects.models import Project, BOQItem
from app.modules.construction.models import WBSNode, Subcontractor
from app.modules.auth.models import User
from app.modules.procurement.models import (
    Vendor, MaterialItem, SiteStore, StoreStock,
    PurchaseRequisition, RFQ, RFQVendor,
    ComparativeStatement, CSQuotation,
    PurchaseOrder, GoodsReceipt, QualityInspection,
    MaterialIssueNote, StockTransfer, StockLedger
)
from app.modules.procurement.schemas import (
    VendorCreate, VendorResponse,
    MaterialItemCreate, MaterialItemResponse,
    SiteStoreCreate, SiteStoreResponse, StoreStockResponse, StockAdjustmentCreate,
    PurchaseRequisitionCreate, PurchaseRequisitionResponse,
    RFQCreate, RFQResponse, RFQVendorResponse,
    ComparativeStatementCreate, ComparativeStatementResponse, CSQuotationResponse,
    PurchaseOrderDirectCreate, PurchaseOrderCreateFromCS, PurchaseOrderResponse, PurchaseOrderApproveRequest,
    GoodsReceiptCreate, GoodsReceiptResponse, GoodsReceipt3WayMatchRequest,
    QualityInspectionCreate, QualityInspectionResponse,
    MaterialIssueCreate, MaterialIssueResponse,
    StockTransferCreate, StockTransferReceive, StockTransferResponse,
    StockLedgerResponse, StoreValuationResponse, StoreValuationItem,
    ProcurementMetrics
)
from app.modules.accounts.services import post_grn_voucher

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/procurement", tags=["Procurement, Supply Chain, CS, GRN & Stores"])


# --------------------------------------------------------------------------
# 1. Vendors Master
# --------------------------------------------------------------------------
@router.get("/vendors", response_model=List[VendorResponse])
async def list_vendors(db: AsyncSession = Depends(get_db)):
    """List registered suppliers and materials vendors."""
    result = await db.execute(select(Vendor).order_by(Vendor.vendor_name.asc()))
    return result.scalars().all()


@router.post("/vendors", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(payload: VendorCreate, db: AsyncSession = Depends(get_db)):
    """Register a new supplier / materials vendor."""
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
    """List standard civil & finishing construction materials catalog."""
    result = await db.execute(select(MaterialItem).order_by(MaterialItem.category.asc(), MaterialItem.material_name.asc()))
    return result.scalars().all()


@router.post("/materials", response_model=MaterialItemResponse, status_code=status.HTTP_201_CREATED)
async def create_material(payload: MaterialItemCreate, db: AsyncSession = Depends(get_db)):
    """Register a new material catalog item."""
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
# 3. Site Stores & Stock Valuation
# --------------------------------------------------------------------------
@router.get("/stores", response_model=List[SiteStoreResponse])
async def list_site_stores(
    project_id: Optional[int] = Query(None),
    is_central: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List project site & central warehouse stores with stock and valuation."""
    stmt = (
        select(SiteStore)
        .options(
            selectinload(SiteStore.project),
            selectinload(SiteStore.store_in_charge),
            selectinload(SiteStore.stocks).selectinload(StoreStock.material)
        )
        .order_by(SiteStore.is_central_warehouse.desc(), SiteStore.id.asc())
    )
    if project_id:
        stmt = stmt.where(SiteStore.project_id == project_id)
    if is_central is not None:
        stmt = stmt.where(SiteStore.is_central_warehouse == is_central)

    result = await db.execute(stmt)
    stores = result.scalars().all()

    resp_list: List[SiteStoreResponse] = []
    for s in stores:
        resp = SiteStoreResponse.model_validate(s)
        resp.project_name = s.project.project_name if s.project else None
        resp.store_in_charge_name = s.store_in_charge.full_name_en if s.store_in_charge else "Store Officer"
        
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
    """Create a new site or central warehouse store location."""
    proj = await db.get(Project, payload.project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")

    store = SiteStore(
        project_id=payload.project_id,
        store_name=payload.store_name,
        location_details=payload.location_details,
        store_in_charge_user_id=payload.store_in_charge_user_id,
        is_central_warehouse=payload.is_central_warehouse or False
    )
    db.add(store)
    await db.commit()
    await db.refresh(store)

    materials = (await db.execute(select(MaterialItem))).scalars().all()
    for mat in materials:
        stk = StoreStock(
            store_id=store.id,
            material_id=mat.id,
            current_stock_quantity=0.00,
            weighted_avg_rate=float(mat.standard_unit_cost or 0.0),
            total_stock_value=0.00,
            reorder_level=100.00
        )
        db.add(stk)
    await db.commit()

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
    resp.store_in_charge_name = store.store_in_charge.full_name_en if store.store_in_charge else "Store Officer"
    return resp


@router.get("/stores/valuation-summary", response_model=List[StoreValuationResponse])
async def get_store_valuation_summary(db: AsyncSession = Depends(get_db)):
    """Real-time store stock inventory valuation breakdown across central & site stores."""
    stmt = (
        select(SiteStore)
        .options(
            selectinload(SiteStore.project),
            selectinload(SiteStore.stocks).selectinload(StoreStock.material)
        )
        .where(SiteStore.is_active == True)
        .order_by(SiteStore.is_central_warehouse.desc(), SiteStore.id.asc())
    )
    res = await db.execute(stmt)
    stores = res.scalars().all()

    summary: List[StoreValuationResponse] = []
    for s in stores:
        tot_val = 0.0
        items: List[StoreValuationItem] = []
        for stk in s.stocks:
            qty = float(stk.current_stock_quantity)
            rate = float(stk.weighted_avg_rate)
            val = round(qty * rate, 2)
            tot_val += val
            if stk.material:
                items.append(StoreValuationItem(
                    material_id=stk.material_id,
                    material_name=stk.material.material_name,
                    category=stk.material.category,
                    unit_of_measure=stk.material.unit_of_measure,
                    current_stock_quantity=qty,
                    weighted_avg_rate=rate,
                    total_stock_value=val
                ))
        summary.append(StoreValuationResponse(
            store_id=s.id,
            store_name=s.store_name,
            is_central_warehouse=s.is_central_warehouse,
            project_name=s.project.project_name if s.project else None,
            total_valuation=round(tot_val, 2),
            items=items
        ))
    return summary


@router.get("/stores/{store_id}/ledger", response_model=List[StockLedgerResponse])
async def get_store_stock_ledger(
    store_id: int,
    material_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve running stock movement ledger (FIFO / Weighted Average) for a store."""
    stmt = (
        select(StockLedger)
        .options(selectinload(StockLedger.material))
        .where(StockLedger.store_id == store_id)
        .order_by(StockLedger.id.desc())
    )
    if material_id:
        stmt = stmt.where(StockLedger.material_id == material_id)

    res = await db.execute(stmt)
    records = res.scalars().all()

    resp_list: List[StockLedgerResponse] = []
    for r in records:
        resp = StockLedgerResponse.model_validate(r)
        resp.material_name = r.material.material_name if r.material else None
        resp_list.append(resp)
    return resp_list


# --------------------------------------------------------------------------
# 4. Purchase Requisitions (PR) with BOQ Hard Budget Lock Check
# --------------------------------------------------------------------------
@router.get("/requisitions", response_model=List[PurchaseRequisitionResponse])
async def list_purchase_requisitions(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List site purchase indents and requisitions with BOQ and WBS tracking."""
    stmt = (
        select(PurchaseRequisition)
        .options(
            selectinload(PurchaseRequisition.project),
            selectinload(PurchaseRequisition.requester),
            selectinload(PurchaseRequisition.material),
            selectinload(PurchaseRequisition.boq_item),
            selectinload(PurchaseRequisition.wbs_node)
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
        if pr.boq_item:
            resp.boq_item_code = pr.boq_item.item_code or f"BOQ-{pr.boq_item.id}"
            headroom = (float(pr.boq_item.estimated_quantity) * 1.05 + float(pr.boq_item.variation_order_quantity or 0.0)) - float(pr.boq_item.requisitioned_quantity or 0.0)
            resp.boq_remaining_headroom = max(0.0, round(headroom, 2))
        if pr.wbs_node:
            resp.wbs_node_code = pr.wbs_node.node_code
            resp.wbs_node_name = pr.wbs_node.node_name
        resp_list.append(resp)
    return resp_list


@router.post("/requisitions", response_model=PurchaseRequisitionResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_requisition(
    payload: PurchaseRequisitionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a new Site Purchase Requisition (PR).
    Hard Budget Lock Check:
    Verifies that requested material does not exceed 105% of estimated BOQ quantity + approved VOs.
    """
    proj = await db.get(Project, payload.project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    # BOQ Hard Budget Lock Verification
    if payload.boq_item_id:
        boq = await db.get(BOQItem, payload.boq_item_id)
        if not boq:
            raise HTTPException(status_code=404, detail="Specified BOQ Item not found.")
        
        est_qty = float(boq.estimated_quantity)
        vo_qty = float(boq.variation_order_quantity or 0.0)
        lock_pct = float(boq.hard_lock_percentage or 105.0) / 100.0
        allowable_ceiling = (est_qty * lock_pct) + vo_qty
        current_req = float(boq.requisitioned_quantity or 0.0)
        new_total_req = current_req + float(payload.requested_quantity)

        if new_total_req > allowable_ceiling:
            overage = new_total_req - allowable_ceiling
            raise HTTPException(
                status_code=400,
                detail=f"Hard Budget Lock Triggered! Requisition quantity ({payload.requested_quantity}) exceeds remaining allowable BOQ headroom ({max(0.0, allowable_ceiling - current_req):,.2f} {boq.unit_of_measure_id}). Requires an approved Variation Order (VO) for additional {overage:,.2f} {boq.unit_of_measure_id}."
            )
        
        # Increment requisitioned quantity on BOQ Item
        boq.requisitioned_quantity = new_total_req
        if boq.requisitioned_quantity >= allowable_ceiling:
            boq.is_locked = True

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
        boq_item_id=payload.boq_item_id,
        wbs_node_id=payload.wbs_node_id,
        tower_name=payload.tower_name,
        floor_number=payload.floor_number,
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
            selectinload(PurchaseRequisition.material),
            selectinload(PurchaseRequisition.boq_item),
            selectinload(PurchaseRequisition.wbs_node)
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
    if pr.boq_item:
        resp.boq_item_code = pr.boq_item.item_code or f"BOQ-{pr.boq_item.id}"
        headroom = (float(pr.boq_item.estimated_quantity) * 1.05 + float(pr.boq_item.variation_order_quantity or 0.0)) - float(pr.boq_item.requisitioned_quantity or 0.0)
        resp.boq_remaining_headroom = max(0.0, round(headroom, 2))
    if pr.wbs_node:
        resp.wbs_node_code = pr.wbs_node.node_code
        resp.wbs_node_name = pr.wbs_node.node_name
    return resp


# --------------------------------------------------------------------------
# 5. Request for Quotation (RFQ)
# --------------------------------------------------------------------------
@router.get("/rfqs", response_model=List[RFQResponse])
async def list_rfqs(
    pr_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List issued RFQs with vendor invitation statuses."""
    stmt = (
        select(RFQ)
        .options(
            selectinload(RFQ.requisition).selectinload(PurchaseRequisition.project),
            selectinload(RFQ.requisition).selectinload(PurchaseRequisition.material),
            selectinload(RFQ.invited_vendors).selectinload(RFQVendor.vendor)
        )
        .order_by(RFQ.id.desc())
    )
    if pr_id:
        stmt = stmt.where(RFQ.pr_id == pr_id)

    res = await db.execute(stmt)
    rfqs = res.scalars().all()

    resp_list: List[RFQResponse] = []
    for rfq in rfqs:
        resp = RFQResponse.model_validate(rfq)
        if rfq.requisition:
            resp.pr_number = rfq.requisition.pr_number
            resp.project_name = rfq.requisition.project.project_name if rfq.requisition.project else None
            resp.material_name = rfq.requisition.material.material_name if rfq.requisition.material else None
            resp.requested_quantity = float(rfq.requisition.requested_quantity)
            resp.unit_of_measure = rfq.requisition.material.unit_of_measure if rfq.requisition.material else None
        
        resp.invited_vendors = [
            RFQVendorResponse(
                id=iv.id,
                vendor_id=iv.vendor_id,
                vendor_name=iv.vendor.vendor_name if iv.vendor else None,
                vendor_code=iv.vendor.vendor_code if iv.vendor else None,
                invitation_sent_at=iv.invitation_sent_at,
                status=iv.status
            ) for iv in rfq.invited_vendors
        ]
        resp_list.append(resp)
    return resp_list


@router.post("/rfqs", response_model=RFQResponse, status_code=status.HTTP_201_CREATED)
async def create_rfq(payload: RFQCreate, db: AsyncSession = Depends(get_db)):
    """Issue Request for Quotation (RFQ) to approved supplier vendors."""
    pr = await db.get(PurchaseRequisition, payload.pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    if not payload.vendor_ids:
        raise HTTPException(status_code=400, detail="At least one vendor must be selected for RFQ.")

    count = (await db.execute(select(func.count(RFQ.id)))).scalar() or 0
    rfq_no = f"RFQ-{date.today().year}-{count + 1:04d}"

    rfq = RFQ(
        pr_id=payload.pr_id,
        rfq_number=rfq_no,
        rfq_date=date.today(),
        submission_deadline=payload.submission_deadline,
        notes=payload.notes,
        status="ISSUED"
    )
    db.add(rfq)
    await db.commit()
    await db.refresh(rfq)

    # Attach invited vendors
    for v_id in payload.vendor_ids:
        inv = RFQVendor(
            rfq_id=rfq.id,
            vendor_id=v_id,
            status="INVITED"
        )
        db.add(inv)

    pr.status = "RFQ_ISSUED"
    await db.commit()

    stmt = (
        select(RFQ)
        .options(
            selectinload(RFQ.requisition).selectinload(PurchaseRequisition.project),
            selectinload(RFQ.requisition).selectinload(PurchaseRequisition.material),
            selectinload(RFQ.invited_vendors).selectinload(RFQVendor.vendor)
        )
        .where(RFQ.id == rfq.id)
    )
    res = await db.execute(stmt)
    rfq = res.scalar_one()

    resp = RFQResponse.model_validate(rfq)
    if rfq.requisition:
        resp.pr_number = rfq.requisition.pr_number
        resp.project_name = rfq.requisition.project.project_name if rfq.requisition.project else None
        resp.material_name = rfq.requisition.material.material_name if rfq.requisition.material else None
        resp.requested_quantity = float(rfq.requisition.requested_quantity)
        resp.unit_of_measure = rfq.requisition.material.unit_of_measure if rfq.requisition.material else None
    resp.invited_vendors = [
        RFQVendorResponse(
            id=iv.id,
            vendor_id=iv.vendor_id,
            vendor_name=iv.vendor.vendor_name if iv.vendor else None,
            vendor_code=iv.vendor.vendor_code if iv.vendor else None,
            invitation_sent_at=iv.invitation_sent_at,
            status=iv.status
        ) for iv in rfq.invited_vendors
    ]
    return resp


# --------------------------------------------------------------------------
# 6. Comparative Statements (CS) with Lowest Bidder & Brand/Grade
# --------------------------------------------------------------------------
@router.get("/comparative-statements", response_model=List[ComparativeStatementResponse])
async def list_comparative_statements(
    pr_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List Comparative Statements with side-by-side quote comparisons."""
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
        lowest_rate = float('inf')
        lowest_v_id = None
        for q in cs.quotations:
            q_resp = CSQuotationResponse.model_validate(q)
            q_resp.vendor_name = q.vendor.vendor_name if q.vendor else None
            q_resp.vendor_code = q.vendor.vendor_code if q.vendor else None
            quote_responses.append(q_resp)
            if float(q.quoted_unit_rate) < lowest_rate:
                lowest_rate = float(q.quoted_unit_rate)
                lowest_v_id = q.vendor_id

        resp.lowest_bidder_vendor_id = lowest_v_id
        resp.lowest_unit_rate = lowest_rate if lowest_rate != float('inf') else None
        resp.quotations = quote_responses
        resp_list.append(resp)

    return resp_list


@router.post("/comparative-statements", response_model=ComparativeStatementResponse, status_code=status.HTTP_201_CREATED)
async def create_comparative_statement(
    payload: ComparativeStatementCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new Comparative Statement (CS) comparing vendor quotes side-by-side.
    Highlights lowest bidder, brand/grade and credit terms.
    """
    if len(payload.quotations) < 2:
        raise HTTPException(status_code=400, detail="A Comparative Statement requires at least 2 vendor quotations for commercial audit rigor.")

    pr = await db.get(PurchaseRequisition, payload.pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")

    existing_res = await db.execute(select(ComparativeStatement.cs_number))
    existing_numbers = set(existing_res.scalars().all())
    candidate_idx = len(existing_numbers) + 1
    while f"CS-{date.today().year}-{candidate_idx:04d}" in existing_numbers:
        candidate_idx += 1
    cs_no = f"CS-{date.today().year}-{candidate_idx:04d}"

    # Determine lowest bidder
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

    req_qty = float(pr.requested_quantity)
    for q_input in payload.quotations:
        total_amt = round(float(q_input.quoted_unit_rate) * req_qty, 2)
        is_rec = (q_input.vendor_id == rec_vendor_id)
        quotation = CSQuotation(
            cs_id=cs.id,
            vendor_id=q_input.vendor_id,
            brand_grade=q_input.brand_grade,
            payment_terms=q_input.payment_terms or "30 Days Credit",
            technical_compliance=q_input.technical_compliance or "COMPLIANT",
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
    resp.lowest_bidder_vendor_id = lowest_vendor_id
    resp.lowest_unit_rate = sorted_quotes[0].quoted_unit_rate
    resp.quotations = [
        CSQuotationResponse(
            id=q.id,
            vendor_id=q.vendor_id,
            vendor_name=q.vendor.vendor_name if q.vendor else None,
            vendor_code=q.vendor.vendor_code if q.vendor else None,
            brand_grade=q.brand_grade,
            payment_terms=q.payment_terms,
            technical_compliance=q.technical_compliance,
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
# 7. Purchase Orders (PO) & Multi-Tier Approvals
# --------------------------------------------------------------------------
@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    project_id: Optional[int] = Query(None),
    vendor_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List issued procurement purchase orders with receiving progress."""
    stmt = (
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.project),
            selectinload(PurchaseOrder.vendor),
            selectinload(PurchaseOrder.material),
            selectinload(PurchaseOrder.store),
            selectinload(PurchaseOrder.approved_by),
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
        resp.approved_by_name = po.approved_by.full_name_en if po.approved_by else "Procurement Head"

        tot_rcvd = sum(float(gr.accepted_quantity) for gr in po.goods_receipts)
        resp.total_received_quantity = tot_rcvd
        resp_list.append(resp)

    return resp_list


@router.post("/purchase-orders/generate-from-cs", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def generate_po_from_cs(
    payload: PurchaseOrderCreateFromCS,
    db: AsyncSession = Depends(get_db)
):
    """Generate an official Purchase Order (PO) from an approved Comparative Statement (CS)."""
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

    winning_quote = next((q for q in cs.quotations if q.vendor_id == cs.recommended_vendor_id), None)
    if not winning_quote:
        raise HTTPException(status_code=400, detail="Winning vendor quotation details missing.")

    store = await db.get(SiteStore, payload.destination_store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Destination store not found.")

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    count = (await db.execute(select(func.count(PurchaseOrder.id)))).scalar() or 0
    idx = count + 1
    while True:
        po_no = f"PO-{date.today().year}-{idx:04d}"
        existing_po = (await db.execute(select(PurchaseOrder.id).where(PurchaseOrder.po_number == po_no))).scalar_one_or_none()
        if not existing_po:
            break
        idx += 1

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
        approval_status="APPROVED",
        approved_by_user_id=user_id,
        approval_date=date.today(),
        delivery_schedule_notes=payload.delivery_schedule_notes or f"Delivery to {store.store_name} by {payload.delivery_deadline}",
        status="ISSUED",
        terms_and_conditions=payload.terms_and_conditions or "Payment within 30 days after 3-Way Match GRN verification."
    )
    db.add(po)

    cs.status = "PO_GENERATED"
    cs.requisition.status = "PO_ISSUED"
    await db.commit()
    await db.refresh(po)

    stmt = (
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.project),
            selectinload(PurchaseOrder.vendor),
            selectinload(PurchaseOrder.material),
            selectinload(PurchaseOrder.store),
            selectinload(PurchaseOrder.approved_by),
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
    resp.approved_by_name = po.approved_by.full_name_en if po.approved_by else "Procurement Head"
    resp.total_received_quantity = 0.00
    return resp


@router.put("/purchase-orders/{id}/approve", response_model=PurchaseOrderResponse)
async def approve_purchase_order(
    id: int,
    payload: PurchaseOrderApproveRequest,
    db: AsyncSession = Depends(get_db)
):
    """Multi-tier approval for high-value Purchase Orders."""
    po = await db.get(PurchaseOrder, id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found.")

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()

    if payload.approved:
        po.approval_status = "APPROVED"
        po.approved_by_user_id = user.id if user else 1
        po.approval_date = date.today()
    else:
        po.approval_status = "REJECTED"
        po.status = "CANCELLED"

    if payload.delivery_schedule_notes:
        po.delivery_schedule_notes = payload.delivery_schedule_notes

    await db.commit()
    await db.refresh(po)

    stmt = (
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.project),
            selectinload(PurchaseOrder.vendor),
            selectinload(PurchaseOrder.material),
            selectinload(PurchaseOrder.store),
            selectinload(PurchaseOrder.approved_by),
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
    resp.approved_by_name = po.approved_by.full_name_en if po.approved_by else "Procurement Head"
    return resp


# --------------------------------------------------------------------------
# 8. Gate Entry & Goods Receipt Note (GRN)
# --------------------------------------------------------------------------
@router.get("/goods-receipts", response_model=List[GoodsReceiptResponse])
async def list_goods_receipts(
    po_id: Optional[int] = Query(None),
    match_status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List GRNs with Gate Entry count and 3-Way Match audit status."""
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
    - Auto-generates GRN and Gate Entry number.
    - Physical count verified at gate.
    - Status set to GATE_ENTERED; stock entry verified upon Quality Inspection (QC).
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

    expected_amt = round(accepted_qty * float(po.unit_price), 2)
    inv_amt = float(payload.supplier_invoice_amount) if payload.supplier_invoice_amount else None
    variance = round(inv_amt - expected_amt, 2) if inv_amt is not None else 0.00

    match_status = "PENDING_MATCH"
    if inv_amt is not None:
        match_status = "MATCHED_OK" if abs(variance) <= 1.00 else "VARIANCE_FLAGGED"

    count = (await db.execute(select(func.count(GoodsReceipt.id)))).scalar() or 0
    grn_no = f"GRN-{date.today().year}-{count + 1:04d}"
    gate_no = payload.gate_entry_number or f"GATE-{date.today().year}-{count + 1:04d}"

    grn = GoodsReceipt(
        po_id=po.id,
        grn_number=grn_no,
        receipt_date=date.today(),
        delivery_challan_number=payload.delivery_challan_number,
        challan_photo_url=payload.challan_photo_url or "assets/images/common/delivery_challan.jpg",
        received_by_user_id=user_id,
        gate_entry_number=gate_no,
        vehicle_number=payload.vehicle_number or "Dhaka Metro TA 11-4567",
        driver_name=payload.driver_name,
        driver_phone=payload.driver_phone,
        gate_in_timestamp=datetime.now(),
        physical_count_verified=payload.physical_count_verified if payload.physical_count_verified is not None else True,
        received_quantity=rcvd_qty,
        rejected_quantity=rej_qty,
        accepted_quantity=accepted_qty,
        qc_status="PENDING",
        supplier_invoice_number=payload.supplier_invoice_number,
        supplier_invoice_amount=inv_amt,
        calculated_expected_amount=expected_amt,
        variance_amount=variance,
        three_way_match_status=match_status,
        status="GATE_ENTERED",
        inspection_remarks=payload.inspection_remarks
    )
    db.add(grn)
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
        if abs(variance) > 50.00:
            grn.three_way_match_status = "VARIANCE_FLAGGED"
            raise HTTPException(
                status_code=400,
                detail=f"3-Way Match Failed! Invoice amount ({inv_amt:,.2f} BDT) differs from expected certified quantity ({expected_amt:,.2f} BDT) by {variance:,.2f} BDT. Resolve commercial variance first."
            )
        else:
            grn.three_way_match_status = "ACCOUNTS_APPROVED"
            grn.status = "POSTED_ACCOUNTS"
            voucher_ref = await post_grn_voucher(db=db, grn=grn)
            grn.accounts_voucher_ref = voucher_ref
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
# 9. Quality Inspection (QC)
# --------------------------------------------------------------------------
@router.get("/quality-inspections", response_model=List[QualityInspectionResponse])
async def list_quality_inspections(
    grn_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List QC inspections including slump test, tensile yield and MTR."""
    stmt = (
        select(QualityInspection)
        .options(
            selectinload(QualityInspection.goods_receipt).selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material),
            selectinload(QualityInspection.inspector)
        )
        .order_by(QualityInspection.id.desc())
    )
    if grn_id:
        stmt = stmt.where(QualityInspection.grn_id == grn_id)

    res = await db.execute(stmt)
    qcs = res.scalars().all()

    resp_list: List[QualityInspectionResponse] = []
    for qc in qcs:
        resp = QualityInspectionResponse.model_validate(qc)
        if qc.goods_receipt:
            resp.grn_number = qc.goods_receipt.grn_number
            if qc.goods_receipt.purchase_order:
                resp.po_number = qc.goods_receipt.purchase_order.po_number
                resp.material_name = qc.goods_receipt.purchase_order.material.material_name if qc.goods_receipt.purchase_order.material else None
        resp.inspector_name = qc.inspector.full_name_en if qc.inspector else "Quality Assurance Engineer"
        resp_list.append(resp)
    return resp_list


@router.post("/quality-inspections", response_model=QualityInspectionResponse, status_code=status.HTTP_201_CREATED)
async def create_quality_inspection(
    payload: QualityInspectionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Perform Quality Inspection on received GRN consignment:
    - Slump test & Tensile yield verification
    - Mill Test Report (MTR) validation
    - On 'PASSED': Updates GRN status, credits physical store stock, and updates Weighted Average inventory rate!
    """
    stmt = (
        select(GoodsReceipt)
        .options(
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.store),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material)
        )
        .where(GoodsReceipt.id == payload.grn_id)
    )
    res = await db.execute(stmt)
    grn = res.scalar_one_or_none()
    if not grn:
        raise HTTPException(status_code=404, detail="GRN record not found.")

    po = grn.purchase_order
    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    count = (await db.execute(select(func.count(QualityInspection.id)))).scalar() or 0
    qc_no = f"QC-{date.today().year}-{count + 1:04d}"

    qc = QualityInspection(
        grn_id=grn.id,
        inspection_number=qc_no,
        inspection_date=date.today(),
        inspector_user_id=user_id,
        slump_test_mm=payload.slump_test_mm,
        tensile_strength_mpa=payload.tensile_strength_mpa,
        mtr_mill_test_report_number=payload.mtr_mill_test_report_number or "MTR-MILL-CERT-OK",
        mtr_verified=payload.mtr_verified,
        test_result=payload.test_result,
        qc_remarks=payload.qc_remarks or "Consignment certified per BNBC / ASTM standards."
    )
    db.add(qc)

    grn.qc_status = payload.test_result

    # If PASSED, credit store stock & recalculate Weighted Average Rate
    if payload.test_result == "PASSED":
        grn.status = "VERIFIED_STORE"
        accepted_qty = float(grn.accepted_quantity)
        po_unit_price = float(po.unit_price)

        stk_stmt = (
            select(StoreStock)
            .where(StoreStock.store_id == po.destination_store_id, StoreStock.material_id == po.material_id)
        )
        stk_res = await db.execute(stk_stmt)
        stk = stk_res.scalar_one_or_none()

        old_qty = float(stk.current_stock_quantity) if stk else 0.0
        old_rate = float(stk.weighted_avg_rate) if stk else 0.0
        old_val = float(stk.total_stock_value) if stk else 0.0

        new_qty = old_qty + accepted_qty
        new_val = old_val + (accepted_qty * po_unit_price)
        new_rate = round(new_val / new_qty, 2) if new_qty > 0 else po_unit_price

        if stk:
            stk.current_stock_quantity = new_qty
            stk.weighted_avg_rate = new_rate
            stk.total_stock_value = round(new_qty * new_rate, 2)
        else:
            stk = StoreStock(
                store_id=po.destination_store_id,
                material_id=po.material_id,
                current_stock_quantity=new_qty,
                weighted_avg_rate=new_rate,
                total_stock_value=round(new_qty * new_rate, 2),
                reorder_level=100.00
            )
            db.add(stk)

        # Record in Stock Movement Ledger
        ledger_entry = StockLedger(
            store_id=po.destination_store_id,
            material_id=po.material_id,
            transaction_type="GRN_IN",
            reference_number=grn.grn_number,
            transaction_date=date.today(),
            quantity_in=accepted_qty,
            quantity_out=0.00,
            unit_rate=po_unit_price,
            total_value=round(accepted_qty * po_unit_price, 2),
            running_balance_qty=new_qty,
            running_weighted_avg_rate=new_rate
        )
        db.add(ledger_entry)

        # Update PO status
        total_rcvd = (
            await db.execute(
                select(func.sum(GoodsReceipt.accepted_quantity)).where(GoodsReceipt.po_id == po.id, GoodsReceipt.qc_status == "PASSED")
            )
        ).scalar() or 0.0
        total_rcvd = float(total_rcvd) + accepted_qty

        if total_rcvd >= float(po.ordered_quantity):
            po.status = "FULLY_RECEIVED"
        else:
            po.status = "PARTIALLY_RECEIVED"

    elif payload.test_result == "FAILED":
        grn.status = "REJECTED_QC"

    await db.commit()
    await db.refresh(qc)

    resp = QualityInspectionResponse.model_validate(qc)
    resp.grn_number = grn.grn_number
    resp.po_number = po.po_number
    resp.material_name = po.material.material_name if po.material else None
    resp.inspector_name = user.full_name_en if user else "Quality Assurance Engineer"
    return resp


# --------------------------------------------------------------------------
# 10. Material Issue Note (MIN)
# --------------------------------------------------------------------------
@router.get("/material-issues", response_model=List[MaterialIssueResponse])
async def list_material_issues(
    project_id: Optional[int] = Query(None),
    store_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List Material Issue Notes issued against Tower, Floor and WBS nodes."""
    stmt = (
        select(MaterialIssueNote)
        .options(
            selectinload(MaterialIssueNote.store),
            selectinload(MaterialIssueNote.project),
            selectinload(MaterialIssueNote.material),
            selectinload(MaterialIssueNote.wbs_node),
            selectinload(MaterialIssueNote.issued_by)
        )
        .order_by(MaterialIssueNote.id.desc())
    )
    if project_id:
        stmt = stmt.where(MaterialIssueNote.project_id == project_id)
    if store_id:
        stmt = stmt.where(MaterialIssueNote.store_id == store_id)

    res = await db.execute(stmt)
    issues = res.scalars().all()

    resp_list: List[MaterialIssueResponse] = []
    for mi in issues:
        resp = MaterialIssueResponse.model_validate(mi)
        resp.store_name = mi.store.store_name if mi.store else None
        resp.project_name = mi.project.project_name if mi.project else None
        resp.material_name = mi.material.material_name if mi.material else None
        resp.wbs_node_name = mi.wbs_node.node_name if mi.wbs_node else None
        resp.issued_by_name = mi.issued_by.full_name_en if mi.issued_by else "Store Keeper"
        resp_list.append(resp)
    return resp_list


@router.post("/material-issues", response_model=MaterialIssueResponse, status_code=status.HTTP_201_CREATED)
async def create_material_issue(
    payload: MaterialIssueCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Issue materials directly against a specific Tower, Floor, and WBS code:
    - Decrements current stock balance.
    - Valued at current Weighted Average rate.
    - Updates Stock Movement Ledger.
    """
    stk_stmt = (
        select(StoreStock)
        .where(StoreStock.store_id == payload.store_id, StoreStock.material_id == payload.material_id)
    )
    stk_res = await db.execute(stk_stmt)
    stk = stk_res.scalar_one_or_none()

    req_qty = float(payload.issued_quantity)
    if not stk or float(stk.current_stock_quantity) < req_qty:
        available = float(stk.current_stock_quantity) if stk else 0.0
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient inventory! Requested {req_qty:,.2f} but available physical balance is only {available:,.2f}."
        )

    mat = await db.get(MaterialItem, payload.material_id)
    uom = mat.unit_of_measure if mat else "UNIT"
    rate = float(stk.weighted_avg_rate)
    tot_cost = round(req_qty * rate, 2)

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    count = (await db.execute(select(func.count(MaterialIssueNote.id)))).scalar() or 0
    min_no = f"MIN-{date.today().year}-{count + 1:04d}"

    min_entry = MaterialIssueNote(
        min_number=min_no,
        issue_date=date.today(),
        store_id=payload.store_id,
        project_id=payload.project_id,
        tower_name=payload.tower_name,
        floor_number=payload.floor_number,
        wbs_node_id=payload.wbs_node_id,
        material_id=payload.material_id,
        issued_quantity=req_qty,
        unit_of_measure=uom,
        issued_to_contractor_id=payload.issued_to_contractor_id,
        contractor_name=payload.contractor_name,
        issued_by_user_id=user_id,
        purpose=payload.purpose,
        unit_cost_at_issue=rate,
        total_issue_cost=tot_cost,
        status="ISSUED"
    )
    db.add(min_entry)

    # Decrement store stock
    new_qty = float(stk.current_stock_quantity) - req_qty
    stk.current_stock_quantity = new_qty
    stk.total_stock_value = round(new_qty * rate, 2)

    # Record in Stock Movement Ledger
    ledger_entry = StockLedger(
        store_id=payload.store_id,
        material_id=payload.material_id,
        transaction_type="MIN_OUT",
        reference_number=min_no,
        transaction_date=date.today(),
        quantity_in=0.00,
        quantity_out=req_qty,
        unit_rate=rate,
        total_value=tot_cost,
        running_balance_qty=new_qty,
        running_weighted_avg_rate=rate
    )
    db.add(ledger_entry)

    await db.commit()
    await db.refresh(min_entry)

    stmt = (
        select(MaterialIssueNote)
        .options(
            selectinload(MaterialIssueNote.store),
            selectinload(MaterialIssueNote.project),
            selectinload(MaterialIssueNote.material),
            selectinload(MaterialIssueNote.wbs_node),
            selectinload(MaterialIssueNote.issued_by)
        )
        .where(MaterialIssueNote.id == min_entry.id)
    )
    res = await db.execute(stmt)
    min_entry = res.scalar_one()

    resp = MaterialIssueResponse.model_validate(min_entry)
    resp.store_name = min_entry.store.store_name if min_entry.store else None
    resp.project_name = min_entry.project.project_name if min_entry.project else None
    resp.material_name = min_entry.material.material_name if min_entry.material else None
    resp.wbs_node_name = min_entry.wbs_node.node_name if min_entry.wbs_node else None
    resp.issued_by_name = min_entry.issued_by.full_name_en if min_entry.issued_by else "Store Keeper"
    return resp


# --------------------------------------------------------------------------
# 11. Inter-Site Stock Transfer
# --------------------------------------------------------------------------
@router.get("/stock-transfers", response_model=List[StockTransferResponse])
async def list_stock_transfers(
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List inter-site stock transfers between central warehouse and project sites."""
    stmt = (
        select(StockTransfer)
        .options(
            selectinload(StockTransfer.from_store),
            selectinload(StockTransfer.to_store),
            selectinload(StockTransfer.material),
            selectinload(StockTransfer.dispatched_by),
            selectinload(StockTransfer.received_by)
        )
        .order_by(StockTransfer.id.desc())
    )
    if status_filter:
        stmt = stmt.where(StockTransfer.status == status_filter)

    res = await db.execute(stmt)
    transfers = res.scalars().all()

    resp_list: List[StockTransferResponse] = []
    for trf in transfers:
        resp = StockTransferResponse.model_validate(trf)
        resp.from_store_name = trf.from_store.store_name if trf.from_store else None
        resp.to_store_name = trf.to_store.store_name if trf.to_store else None
        resp.material_name = trf.material.material_name if trf.material else None
        resp.unit_of_measure = trf.material.unit_of_measure if trf.material else None
        resp.dispatched_by_name = trf.dispatched_by.full_name_en if trf.dispatched_by else "Dispatch Officer"
        resp.received_by_name = trf.received_by.full_name_en if trf.received_by else None
        resp_list.append(resp)
    return resp_list


@router.post("/stock-transfers/dispatch", response_model=StockTransferResponse, status_code=status.HTTP_201_CREATED)
async def dispatch_stock_transfer(
    payload: StockTransferCreate,
    db: AsyncSession = Depends(get_db)
):
    """Dispatch material from one store (e.g. Central Warehouse) to another site store."""
    if payload.from_store_id == payload.to_store_id:
        raise HTTPException(status_code=400, detail="Source and destination stores cannot be the same.")

    stk_stmt = (
        select(StoreStock)
        .where(StoreStock.store_id == payload.from_store_id, StoreStock.material_id == payload.material_id)
    )
    res = await db.execute(stk_stmt)
    source_stk = res.scalar_one_or_none()

    qty = float(payload.transfer_quantity)
    if not source_stk or float(source_stk.current_stock_quantity) < qty:
        available = float(source_stk.current_stock_quantity) if source_stk else 0.0
        raise HTTPException(status_code=400, detail=f"Insufficient source stock! Available is {available:,.2f}.")

    rate = float(source_stk.weighted_avg_rate)
    tot_val = round(qty * rate, 2)

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    count = (await db.execute(select(func.count(StockTransfer.id)))).scalar() or 0
    trf_no = f"TRF-{date.today().year}-{count + 1:04d}"

    transfer = StockTransfer(
        transfer_number=trf_no,
        from_store_id=payload.from_store_id,
        to_store_id=payload.to_store_id,
        material_id=payload.material_id,
        transfer_quantity=qty,
        dispatch_date=date.today(),
        dispatched_by_user_id=user_id,
        dispatch_challan_number=payload.dispatch_challan_number,
        unit_rate=rate,
        total_transfer_value=tot_val,
        status="DISPATCHED",
        remarks=payload.remarks
    )
    db.add(transfer)

    # Decrement source store stock
    source_stk.current_stock_quantity = float(source_stk.current_stock_quantity) - qty
    source_stk.total_stock_value = round(float(source_stk.current_stock_quantity) * rate, 2)

    # Record in source ledger
    db.add(StockLedger(
        store_id=payload.from_store_id,
        material_id=payload.material_id,
        transaction_type="TRANSFER_OUT",
        reference_number=trf_no,
        transaction_date=date.today(),
        quantity_in=0.00,
        quantity_out=qty,
        unit_rate=rate,
        total_value=tot_val,
        running_balance_qty=float(source_stk.current_stock_quantity),
        running_weighted_avg_rate=rate
    ))

    await db.commit()
    await db.refresh(transfer)

    stmt = (
        select(StockTransfer)
        .options(
            selectinload(StockTransfer.from_store),
            selectinload(StockTransfer.to_store),
            selectinload(StockTransfer.material),
            selectinload(StockTransfer.dispatched_by)
        )
        .where(StockTransfer.id == transfer.id)
    )
    res = await db.execute(stmt)
    transfer = res.scalar_one()

    resp = StockTransferResponse.model_validate(transfer)
    resp.from_store_name = transfer.from_store.store_name if transfer.from_store else None
    resp.to_store_name = transfer.to_store.store_name if transfer.to_store else None
    resp.material_name = transfer.material.material_name if transfer.material else None
    resp.unit_of_measure = transfer.material.unit_of_measure if transfer.material else None
    resp.dispatched_by_name = transfer.dispatched_by.full_name_en if transfer.dispatched_by else "Dispatch Officer"
    return resp


@router.put("/stock-transfers/{id}/receive", response_model=StockTransferResponse)
async def receive_stock_transfer(
    id: int,
    payload: StockTransferReceive,
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge physical receipt of transferred material at destination store."""
    trf = await db.get(StockTransfer, id)
    if not trf:
        raise HTTPException(status_code=404, detail="Stock Transfer not found.")
    if trf.status != "DISPATCHED":
        raise HTTPException(status_code=400, detail=f"Transfer cannot be received in status {trf.status}.")

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    trf.receipt_date = date.today()
    trf.received_by_user_id = user_id
    trf.status = "RECEIVED"
    if payload.remarks:
        trf.remarks = f"{trf.remarks or ''}\n[Receipt Note: {payload.remarks}]"

    # Credit destination store stock and recalculate weighted average rate
    qty = float(trf.transfer_quantity)
    trf_rate = float(trf.unit_rate)

    stk_stmt = (
        select(StoreStock)
        .where(StoreStock.store_id == trf.to_store_id, StoreStock.material_id == trf.material_id)
    )
    stk_res = await db.execute(stk_stmt)
    dest_stk = stk_res.scalar_one_or_none()

    old_qty = float(dest_stk.current_stock_quantity) if dest_stk else 0.0
    old_rate = float(dest_stk.weighted_avg_rate) if dest_stk else 0.0
    old_val = float(dest_stk.total_stock_value) if dest_stk else 0.0

    new_qty = old_qty + qty
    new_val = old_val + (qty * trf_rate)
    new_rate = round(new_val / new_qty, 2) if new_qty > 0 else trf_rate

    if dest_stk:
        dest_stk.current_stock_quantity = new_qty
        dest_stk.weighted_avg_rate = new_rate
        dest_stk.total_stock_value = round(new_qty * new_rate, 2)
    else:
        dest_stk = StoreStock(
            store_id=trf.to_store_id,
            material_id=trf.material_id,
            current_stock_quantity=new_qty,
            weighted_avg_rate=new_rate,
            total_stock_value=round(new_qty * new_rate, 2),
            reorder_level=100.00
        )
        db.add(dest_stk)

    # Record in destination ledger
    db.add(StockLedger(
        store_id=trf.to_store_id,
        material_id=trf.material_id,
        transaction_type="TRANSFER_IN",
        reference_number=trf.transfer_number,
        transaction_date=date.today(),
        quantity_in=qty,
        quantity_out=0.00,
        unit_rate=trf_rate,
        total_value=round(qty * trf_rate, 2),
        running_balance_qty=new_qty,
        running_weighted_avg_rate=new_rate
    ))

    await db.commit()
    await db.refresh(trf)

    stmt = (
        select(StockTransfer)
        .options(
            selectinload(StockTransfer.from_store),
            selectinload(StockTransfer.to_store),
            selectinload(StockTransfer.material),
            selectinload(StockTransfer.dispatched_by),
            selectinload(StockTransfer.received_by)
        )
        .where(StockTransfer.id == trf.id)
    )
    res = await db.execute(stmt)
    trf = res.scalar_one()

    resp = StockTransferResponse.model_validate(trf)
    resp.from_store_name = trf.from_store.store_name if trf.from_store else None
    resp.to_store_name = trf.to_store.store_name if trf.to_store else None
    resp.material_name = trf.material.material_name if trf.material else None
    resp.unit_of_measure = trf.material.unit_of_measure if trf.material else None
    resp.dispatched_by_name = trf.dispatched_by.full_name_en if trf.dispatched_by else "Dispatch Officer"
    resp.received_by_name = trf.received_by.full_name_en if trf.received_by else "Receiving Store Keeper"
    return resp


# --------------------------------------------------------------------------
# 12. Procurement Executive Metrics
# --------------------------------------------------------------------------
@router.get("/metrics", response_model=ProcurementMetrics)
async def get_procurement_metrics(db: AsyncSession = Depends(get_db)):
    """Returns executive supply chain KPI metrics including valuation and pending QC."""
    stores_count = (await db.execute(select(func.count(SiteStore.id)).where(SiteStore.is_active == True))).scalar() or 0
    c_warehouses = (await db.execute(select(func.count(SiteStore.id)).where(SiteStore.is_central_warehouse == True))).scalar() or 0
    low_stock = (await db.execute(select(func.count(StoreStock.id)).where(StoreStock.current_stock_quantity <= StoreStock.reorder_level))).scalar() or 0
    pending_pr = (await db.execute(select(func.count(PurchaseRequisition.id)).where(PurchaseRequisition.status.in_(["PENDING_CS", "RFQ_ISSUED"])))).scalar() or 0
    active_po = (await db.execute(select(func.count(PurchaseOrder.id)).where(PurchaseOrder.status.in_(["ISSUED", "PARTIALLY_RECEIVED"])))).scalar() or 0
    po_val = (await db.execute(select(func.sum(PurchaseOrder.total_po_amount)))).scalar() or 0.0
    var_flags = (await db.execute(select(func.count(GoodsReceipt.id)).where(GoodsReceipt.three_way_match_status == "VARIANCE_FLAGGED"))).scalar() or 0
    pending_qc = (await db.execute(select(func.count(GoodsReceipt.id)).where(GoodsReceipt.qc_status == "PENDING"))).scalar() or 0
    tot_val = (await db.execute(select(func.sum(StoreStock.total_stock_value)))).scalar() or 0.0

    return ProcurementMetrics(
        total_active_stores=stores_count,
        central_warehouses_count=c_warehouses,
        low_stock_items_count=low_stock,
        pending_pr_count=pending_pr,
        active_po_count=active_po,
        total_po_value=float(po_val),
        grn_variance_flags=var_flags,
        pending_qc_count=pending_qc,
        total_inventory_valuation=float(tot_val)
    )
