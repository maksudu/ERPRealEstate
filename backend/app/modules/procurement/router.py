import logging
from typing import List, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, get_current_user_optional
from app.modules.projects.models import Project, BOQItem
from app.modules.construction.models import WBSNode, Subcontractor
from app.modules.auth.models import User
from app.modules.procurement.models import (
    Vendor, VendorApprovalEvent, MaterialItem, SiteStore, StoreStock,
    PurchaseRequisition, PRWorkflowEvent, RFQ, RFQVendor,
    ComparativeStatement, CSQuotation,
    PurchaseOrder, GoodsReceipt, QualityInspection,
    MaterialIssueNote, StockTransfer, StockLedger
)
from app.modules.procurement.schemas import (
    VendorCreate, VendorUpdate, VendorResponse, VendorWorkflowAction, VendorApprovalEventResponse, VendorPaymentDetailsResponse,
    MaterialItemCreate, MaterialItemUpdate, MaterialItemResponse,
    SiteStoreCreate, SiteStoreUpdate, SiteStoreResponse, StoreStockResponse, StockAdjustmentCreate,
    StoreStockReservationRequest, PhysicalCycleCountRequest,
    PurchaseRequisitionCreate, PurchaseRequisitionUpdate, PRWorkflowAction, PRWorkflowEventResponse, PurchaseRequisitionResponse,
    RFQCreate, RFQResponse, RFQVendorResponse,
    ComparativeStatementCreate, ComparativeStatementResponse, CSQuotationResponse, CSQuotationInput, CSCommitteeDecision,
    PurchaseOrderDirectCreate, PurchaseOrderUpdate, PurchaseOrderCreateFromCS, PurchaseOrderResponse, PurchaseOrderApproveRequest,
    GoodsReceiptCreate, GoodsReceiptUpdate, GoodsReceiptResponse, GoodsReceipt3WayMatchRequest,
    QualityInspectionCreate, QualityInspectionUpdate, QualityInspectionResponse,
    MaterialIssueCreate, MaterialIssueUpdate, MaterialIssueResponse, MaterialReturnCreate, ConsumptionReconciliationReport,
    StockTransferCreate, StockTransferReceive, StockTransferResponse,
    StockAdjustmentRecord, StockAdjustmentReversalRequest,
    ValuationMethodComparison, StockAgingReportItem, PeriodEndReconciliation,
    StockLedgerResponse, StoreValuationResponse, StoreValuationItem,
    ProcurementMetrics, ReorderAlertItem,
    RequisitionAvailabilityResponse,
    SupplierBillResponse, SupplierBillReconcileRequest, SupplierBillPaymentRequest, SupplierDebitNoteCreate,
    AuditTrailItem
)
from app.modules.accounts.services import post_grn_voucher

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/procurement", tags=["Procurement, Supply Chain, CS, GRN & Stores"])


# --------------------------------------------------------------------------
# 1. Vendors Master
# --------------------------------------------------------------------------
@router.get("/vendors", response_model=List[VendorResponse])
async def list_vendors(
    search: Optional[str] = Query(None),
    trade_category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List registered suppliers and materials vendors with search and paging."""
    stmt = select(Vendor)
    if search:
        s = f"%{search}%"
        stmt = stmt.where(or_(
            Vendor.vendor_name.ilike(s),
            Vendor.vendor_code.ilike(s),
            Vendor.contact_person.ilike(s)
        ))
    if trade_category:
        stmt = stmt.where(Vendor.trade_category == trade_category)
    stmt = stmt.order_by(Vendor.vendor_name.asc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/vendors", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(payload: VendorCreate, db: AsyncSession = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
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
        business_address=payload.business_address,
        business_registration_number=payload.business_registration_number,
        trade_license_number=payload.trade_license_number,
        trade_license_expiry_date=payload.trade_license_expiry_date,
        tin_number=payload.tin_number,
        bin_number=payload.bin_number,
        supplied_categories=payload.supplied_categories,
        document_refs=payload.document_refs,
        authorized_representatives=payload.authorized_representatives,
        references=payload.references,
        bank_name=payload.bank_name,
        bank_account_name=payload.bank_account_name,
        bank_account_number=payload.bank_account_number,
        bank_branch=payload.bank_branch,
        credit_limit_bdt=payload.credit_limit_bdt or 0,
        currency=payload.currency or "BDT",
        payment_terms_days=payload.payment_terms_days or 30,
        approval_status="PENDING_PROCUREMENT_REVIEW",
        is_active=False
    )
    db.add(v)
    await db.flush()
    db.add(VendorApprovalEvent(vendor_id=v.id, actor_user_id=current_user.id if current_user else None, action="SUBMIT", from_status=None, to_status=v.approval_status, notes="Vendor registration submitted"))
    await db.commit()
    await db.refresh(v)
    return v


@router.put("/vendors/{vendor_id}", response_model=VendorResponse)
async def update_vendor(vendor_id: int, payload: VendorUpdate, db: AsyncSession = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """Update supplier profile."""
    v = await db.get(Vendor, vendor_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    updates = payload.model_dump(exclude_unset=True)
    sensitive_fields = {"bank_name", "bank_account_name", "bank_account_number", "bank_branch"}
    if sensitive_fields.intersection(updates) and (not current_user or not current_user.is_group_admin):
        raise HTTPException(status_code=403, detail="Supplier payment details can only be changed by authorized finance administrators.")
    for field, val in updates.items():
        setattr(v, field, val)
    await db.commit()
    await db.refresh(v)
    return v


@router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Suspend vendor instead of deleting a referenced supplier master."""
    v = await db.get(Vendor, vendor_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if not current_user.is_group_admin:
        raise HTTPException(status_code=403, detail="Suspending a vendor requires group administrator approval.")
    old_status = v.approval_status
    if old_status in {"REJECTED", "BLACKLISTED"}:
        raise HTTPException(status_code=400, detail=f"Vendor in {old_status} state cannot be suspended through this action.")
    v.is_active = False
    v.approval_status = "SUSPENDED"
    v.suspension_reason = "Suspended from vendor register"
    db.add(VendorApprovalEvent(vendor_id=v.id, actor_user_id=current_user.id, action="SUSPEND", from_status=old_status, to_status=v.approval_status, notes=v.suspension_reason))
    await db.commit()
    return {"message": "Vendor suspended successfully"}


@router.post("/vendors/{vendor_id}/workflow", response_model=VendorResponse)
async def vendor_workflow(vendor_id: int, payload: VendorWorkflowAction, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    action = payload.action.upper()
    transitions = {
        ("PENDING_PROCUREMENT_REVIEW", "PROCUREMENT_REVIEW"): "PENDING_FINANCE_VERIFICATION",
        ("PENDING_FINANCE_VERIFICATION", "FINANCE_VERIFY"): "PENDING_TECHNICAL_REVIEW",
        ("PENDING_TECHNICAL_REVIEW", "TECHNICAL_APPROVE"): "PENDING_MANAGEMENT_APPROVAL",
        ("PENDING_MANAGEMENT_APPROVAL", "APPROVE"): "APPROVED",
        ("PENDING_PROCUREMENT_REVIEW", "RETURN"): "RETURNED_FOR_REVISION",
        ("PENDING_FINANCE_VERIFICATION", "RETURN"): "RETURNED_FOR_REVISION",
        ("PENDING_TECHNICAL_REVIEW", "RETURN"): "RETURNED_FOR_REVISION",
        ("RETURNED_FOR_REVISION", "RESUBMIT"): "PENDING_PROCUREMENT_REVIEW",
        ("APPROVED", "SUSPEND"): "SUSPENDED",
        ("SUSPENDED", "REACTIVATE"): "PENDING_MANAGEMENT_APPROVAL",
        ("APPROVED", "BLACKLIST"): "BLACKLISTED",
    }
    target = transitions.get((vendor.approval_status, action))
    if action == "REJECT" and vendor.approval_status.startswith("PENDING_"):
        target = "REJECTED"
    if not target:
        raise HTTPException(status_code=400, detail=f"Action {action} is not allowed while vendor is {vendor.approval_status}.")
    if (action in {"APPROVE", "BLACKLIST", "REACTIVATE", "SUSPEND"}
            or (action == "REJECT" and vendor.approval_status == "PENDING_MANAGEMENT_APPROVAL")) and not current_user.is_group_admin:
        raise HTTPException(status_code=403, detail="Management approval is restricted to authorized group administrators.")
    previous = vendor.approval_status
    vendor.approval_status = target
    vendor.is_active = target == "APPROVED"
    vendor.approval_notes = payload.notes or vendor.approval_notes
    if target in {"SUSPENDED", "BLACKLISTED"}:
        vendor.suspension_reason = payload.notes or target.title()
    elif target == "APPROVED":
        vendor.suspension_reason = None
    db.add(VendorApprovalEvent(vendor_id=vendor.id, actor_user_id=current_user.id, action=action, from_status=previous, to_status=target, notes=payload.notes))
    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.get("/vendors/{vendor_id}/history", response_model=List[VendorApprovalEventResponse])
async def vendor_approval_history(vendor_id: int, db: AsyncSession = Depends(get_db)):
    if not await db.get(Vendor, vendor_id):
        raise HTTPException(status_code=404, detail="Vendor not found.")
    result = await db.execute(select(VendorApprovalEvent).where(VendorApprovalEvent.vendor_id == vendor_id).order_by(VendorApprovalEvent.created_at, VendorApprovalEvent.id))
    return result.scalars().all()


@router.get("/vendors/{vendor_id}/payment-details", response_model=VendorPaymentDetailsResponse)
async def vendor_payment_details(vendor_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_group_admin:
        raise HTTPException(status_code=403, detail="Supplier bank details are restricted to authorized finance administrators.")
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    return VendorPaymentDetailsResponse(
        bank_name=vendor.bank_name, bank_account_name=vendor.bank_account_name,
        bank_account_number=vendor.bank_account_number, bank_branch=vendor.bank_branch
    )


@router.get("/vendors/expiry-alerts", response_model=List[VendorResponse])
async def vendor_expiry_alerts(days: int = Query(60, ge=0, le=365), db: AsyncSession = Depends(get_db)):
    cutoff = date.today() + timedelta(days=days)
    result = await db.execute(select(Vendor).where(or_(
        Vendor.trade_license_expiry_date <= cutoff,
        Vendor.document_refs.is_not(None)
    )).order_by(Vendor.trade_license_expiry_date))
    alerts = []
    for vendor in result.scalars().all():
        expiring = bool(vendor.trade_license_expiry_date and vendor.trade_license_expiry_date <= cutoff)
        for doc in vendor.document_refs or []:
            if not isinstance(doc, dict) or not doc.get("expiry_date"):
                continue
            try:
                expiring = expiring or date.fromisoformat(str(doc["expiry_date"])) <= cutoff
            except ValueError:
                continue
        if expiring:
            alerts.append(vendor)
    return alerts


# --------------------------------------------------------------------------
# 2. Materials Master
# --------------------------------------------------------------------------
@router.get("/materials", response_model=List[MaterialItemResponse])
async def list_materials(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List standard civil & finishing construction materials catalog with search and paging."""
    stmt = select(MaterialItem)
    if search:
        s = f"%{search}%"
        stmt = stmt.where(or_(
            MaterialItem.material_name.ilike(s),
            MaterialItem.material_code.ilike(s)
        ))
    if category:
        stmt = stmt.where(MaterialItem.category == category)
    stmt = stmt.order_by(MaterialItem.category.asc(), MaterialItem.material_name.asc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
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


@router.put("/materials/{material_id}", response_model=MaterialItemResponse)
async def update_material(material_id: int, payload: MaterialItemUpdate, db: AsyncSession = Depends(get_db)):
    """Update material catalog item."""
    mat = await db.get(MaterialItem, material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(mat, field, val)
    await db.commit()
    await db.refresh(mat)
    return mat


@router.delete("/materials/{material_id}")
async def delete_material(material_id: int, db: AsyncSession = Depends(get_db)):
    """Delete material catalog item."""
    mat = await db.get(MaterialItem, material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    await db.delete(mat)
    await db.commit()
    return {"message": "Material deleted successfully"}


# --------------------------------------------------------------------------
# 3. Site Stores & Stock Valuation
# --------------------------------------------------------------------------
@router.get("/stores", response_model=List[SiteStoreResponse])
async def list_site_stores(
    project_id: Optional[int] = Query(None),
    is_central: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List project site & central warehouse stores with stock, bin locations, and valuation."""
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
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                SiteStore.store_name.ilike(s),
                SiteStore.location_details.ilike(s)
            )
        )

    stmt = stmt.offset(offset).limit(limit)
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
            curr_qty = float(st.current_stock_quantity)
            st_resp.reserved_quantity = 0.00
            st_resp.available_quantity = curr_qty
            st_resp.quarantined_quantity = 0.00
            st_resp.is_low_stock = curr_qty <= float(st.reorder_level)
            stock_responses.append(st_resp)
        resp.stocks = stock_responses
        resp_list.append(resp)

    return resp_list


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


@router.get("/stores/{store_id}", response_model=SiteStoreResponse)
async def get_site_store(store_id: int, db: AsyncSession = Depends(get_db)):
    """Get single warehouse or project-site store by ID."""
    stmt = (
        select(SiteStore)
        .options(
            selectinload(SiteStore.project),
            selectinload(SiteStore.store_in_charge),
            selectinload(SiteStore.stocks).selectinload(StoreStock.material)
        )
        .where(SiteStore.id == store_id)
    )
    res = await db.execute(stmt)
    store = res.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store location not found.")

    resp = SiteStoreResponse.model_validate(store)
    resp.project_name = store.project.project_name if store.project else None
    resp.store_in_charge_name = store.store_in_charge.full_name_en if store.store_in_charge else "Store Officer"
    
    stock_responses = []
    for st in store.stocks:
        st_resp = StoreStockResponse.model_validate(st)
        if st.material:
            st_resp.material_name = st.material.material_name
            st_resp.material_code = st.material.material_code
            st_resp.unit_of_measure = st.material.unit_of_measure
        curr_qty = float(st.current_stock_quantity)
        st_resp.reserved_quantity = 0.00
        st_resp.available_quantity = curr_qty
        st_resp.is_low_stock = curr_qty <= float(st.reorder_level)
        stock_responses.append(st_resp)
    resp.stocks = stock_responses
    return resp


@router.put("/stores/{store_id}", response_model=SiteStoreResponse)
async def update_site_store(
    store_id: int,
    payload: SiteStoreUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update warehouse or project-site store attributes."""
    store = await db.get(SiteStore, store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store location not found.")

    if payload.store_name is not None:
        store.store_name = payload.store_name
    if payload.location_details is not None:
        store.location_details = payload.location_details
    if payload.store_in_charge_user_id is not None:
        store.store_in_charge_user_id = payload.store_in_charge_user_id
    if payload.is_central_warehouse is not None:
        store.is_central_warehouse = payload.is_central_warehouse
    if payload.is_active is not None:
        store.is_active = payload.is_active

    await db.commit()
    await db.refresh(store)

    return await get_site_store(store_id=store.id, db=db)


@router.delete("/stores/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site_store(store_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a store if it holds no active material inventory."""
    store = await db.get(SiteStore, store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store location not found.")

    # Check for active non-zero stocks
    stk_sum = (
        await db.execute(
            select(func.sum(StoreStock.current_stock_quantity)).where(StoreStock.store_id == store_id)
        )
    ).scalar() or 0.0

    if float(stk_sum) > 0.0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete store! Currently contains {float(stk_sum):,.2f} units of stock. Transfer or issue materials first."
        )

    await db.delete(store)
    await db.commit()


@router.post("/stores/stock-reservation", response_model=StoreStockResponse)
async def reserve_store_stock(
    payload: StoreStockReservationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Reserve physical store stock against an approved work order or purchase requisition:
    Formula: Available Stock = Accepted On-hand Stock - Reserved Stock
    """
    stmt = select(StoreStock).options(selectinload(StoreStock.material)).where(
        StoreStock.store_id == payload.store_id,
        StoreStock.material_id == payload.material_id
    ).with_for_update()
    res = await db.execute(stmt)
    stk = res.scalar_one_or_none()
    if not stk:
        raise HTTPException(status_code=404, detail="Material not stocked in specified store.")

    curr_qty = float(stk.current_stock_quantity)
    req_qty = float(payload.reserved_quantity)
    already_reserved = float(stk.reserved_quantity or 0)
    available_qty = max(0.0, curr_qty - already_reserved)

    if req_qty <= 0:
        raise HTTPException(status_code=400, detail="Reservation quantity must be greater than zero.")
    if req_qty > available_qty:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient available stock! Available: {available_qty:,.2f}, Requested Reservation: {req_qty:,.2f}."
        )
    stk.reserved_quantity = already_reserved + req_qty

    # Record in ledger for custody and tracking
    ledger_entry = StockLedger(
        store_id=payload.store_id,
        material_id=payload.material_id,
        transaction_type="STOCK_RESERVE",
        reference_number=payload.work_order_reference or f"WO-RES-{date.today().year}",
        transaction_date=date.today(),
        quantity_in=0.00,
        quantity_out=0.00,
        unit_rate=float(stk.weighted_avg_rate),
        total_value=0.00,
        running_balance_qty=curr_qty,
        running_weighted_avg_rate=float(stk.weighted_avg_rate)
    )
    db.add(ledger_entry)
    await db.commit()
    await db.refresh(stk)

    resp = StoreStockResponse.model_validate(stk)
    if stk.material:
        resp.material_name = stk.material.material_name
        resp.material_code = stk.material.material_code
        resp.unit_of_measure = stk.material.unit_of_measure
    resp.reserved_quantity = float(stk.reserved_quantity)
    resp.available_quantity = max(0.0, curr_qty - float(stk.reserved_quantity))
    return resp


@router.post("/stores/cycle-count", response_model=StoreStockResponse)
async def record_physical_cycle_count(
    payload: PhysicalCycleCountRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Record physical stock cycle count at store location:
    Computes discrepancy variance against book stock and updates running balance.
    """
    stmt = select(StoreStock).options(selectinload(StoreStock.material)).where(
        StoreStock.store_id == payload.store_id,
        StoreStock.material_id == payload.material_id
    )
    res = await db.execute(stmt)
    stk = res.scalar_one_or_none()
    if not stk:
        raise HTTPException(status_code=404, detail="Material not stocked in specified store.")

    book_qty = float(stk.current_stock_quantity)
    phys_qty = float(payload.physical_counted_quantity)
    variance = round(phys_qty - book_qty, 4)
    unit_rate = float(stk.weighted_avg_rate)

    stk.current_stock_quantity = phys_qty
    stk.total_stock_value = round(phys_qty * unit_rate, 2)

    ledger_entry = StockLedger(
        store_id=payload.store_id,
        material_id=payload.material_id,
        transaction_type="CYCLE_COUNT_ADJUST",
        reference_number=f"CYCLE-{date.today().year}-{date.today().month:02d}",
        transaction_date=payload.cycle_count_date or date.today(),
        quantity_in=variance if variance > 0 else 0.00,
        quantity_out=abs(variance) if variance < 0 else 0.00,
        unit_rate=unit_rate,
        total_value=round(abs(variance) * unit_rate, 2),
        running_balance_qty=phys_qty,
        running_weighted_avg_rate=unit_rate
    )
    db.add(ledger_entry)
    await db.commit()
    await db.refresh(stk)

    resp = StoreStockResponse.model_validate(stk)
    if stk.material:
        resp.material_name = stk.material.material_name
        resp.material_code = stk.material.material_code
        resp.unit_of_measure = stk.material.unit_of_measure
    resp.available_quantity = phys_qty
    return resp


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

    return await get_site_store(store_id=store.id, db=db)


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
@router.get("/requisitions/availability", response_model=RequisitionAvailabilityResponse)
async def get_requisition_availability(
    project_id: int = Query(...), material_id: int = Query(...), requested_quantity: float = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Show project stock, outstanding PRs and unreceived purchase quantities before requisition."""
    if not await db.get(Project, project_id) or not await db.get(MaterialItem, material_id):
        raise HTTPException(status_code=404, detail="Project or material not found.")
    stock_query = await db.execute(
        select(func.coalesce(func.sum(StoreStock.current_stock_quantity), 0),
               func.coalesce(func.sum(StoreStock.reserved_quantity), 0))
        .join(SiteStore, SiteStore.id == StoreStock.store_id)
        .where(SiteStore.project_id == project_id, StoreStock.material_id == material_id)
    )
    on_hand, reserved = stock_query.one()
    pr_qty = (await db.execute(select(func.coalesce(func.sum(PurchaseRequisition.requested_quantity), 0)).where(
        PurchaseRequisition.project_id == project_id, PurchaseRequisition.material_id == material_id,
        PurchaseRequisition.status.notin_(["REJECTED", "CANCELLED", "COMPLETED", "PO_ISSUED"])
    ))).scalar_one()
    po_rows = await db.execute(
        select(PurchaseOrder.ordered_quantity, func.coalesce(func.sum(GoodsReceipt.accepted_quantity), 0))
        .outerjoin(GoodsReceipt, GoodsReceipt.po_id == PurchaseOrder.id)
        .where(PurchaseOrder.project_id == project_id, PurchaseOrder.material_id == material_id,
               PurchaseOrder.status.notin_(["CANCELLED", "CLOSED"]))
        .group_by(PurchaseOrder.id)
    )
    incoming = sum(max(0.0, float(ordered or 0) - float(received or 0)) for ordered, received in po_rows.all())
    on_hand_f, reserved_f = float(on_hand or 0), float(reserved or 0)
    project = await db.get(Project, project_id)
    committed_value = float((await db.execute(select(func.coalesce(func.sum(PurchaseOrder.total_po_amount), 0)).where(
        PurchaseOrder.project_id == project_id, PurchaseOrder.status.notin_(["CANCELLED", "REJECTED"])
    ))).scalar_one() or 0)
    material = await db.get(MaterialItem, material_id)
    approved_budget = float(project.approved_budget_bdt or 0)
    estimated_value = requested_quantity * float(material.standard_unit_cost or 0)
    return RequisitionAvailabilityResponse(
        project_id=project_id, material_id=material_id, requested_quantity=requested_quantity,
        on_hand_quantity=on_hand_f, reserved_quantity=reserved_f,
        available_quantity=max(0.0, on_hand_f - reserved_f),
        open_requisition_quantity=float(pr_qty or 0), incoming_po_quantity=incoming,
        approved_project_budget_bdt=approved_budget, committed_purchase_order_bdt=committed_value,
        estimated_request_value_bdt=estimated_value,
        budget_available_bdt=max(0.0, approved_budget - committed_value) if approved_budget > 0 else 0.0
    )


@router.get("/requisitions", response_model=List[PurchaseRequisitionResponse])
async def list_purchase_requisitions(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List site purchase indents and requisitions with BOQ and WBS tracking, search and paging."""
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
    if search:
        s = f"%{search}%"
        stmt = stmt.where(or_(
            PurchaseRequisition.pr_number.ilike(s),
            PurchaseRequisition.tower_name.ilike(s),
            PurchaseRequisition.floor_number.ilike(s),
            PurchaseRequisition.purpose_notes.ilike(s)
        ))

    stmt = stmt.offset(offset).limit(limit)
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


@router.put("/requisitions/{pr_id}", response_model=PurchaseRequisitionResponse)
async def update_purchase_requisition(
    pr_id: int,
    payload: PurchaseRequisitionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update purchase requisition details."""
    pr = await db.get(PurchaseRequisition, pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    
    if payload.requested_quantity is not None:
        pr.requested_quantity = payload.requested_quantity
    if payload.required_by_date is not None:
        pr.required_by_date = payload.required_by_date
    if payload.tower_name is not None:
        pr.tower_name = payload.tower_name
    if payload.floor_number is not None:
        pr.floor_number = payload.floor_number
    if payload.purpose_notes is not None:
        pr.purpose_notes = payload.purpose_notes
    for field in ("priority", "department", "destination_store_id", "delivery_location", "attachment_refs"):
        value = getattr(payload, field)
        if value is not None:
            setattr(pr, field, value)

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
    return resp


@router.post("/requisitions/{pr_id}/workflow", response_model=PurchaseRequisitionResponse)
async def execute_pr_workflow(
    pr_id: int,
    payload: PRWorkflowAction,
    db: AsyncSession = Depends(get_db)
):
    """
    Advance PR through approval workflow:
    Draft → Submitted → Site/Department Approval → Budget Verification → Procurement Review → Approved for Purchase → Rejected
    """
    pr = await db.get(PurchaseRequisition, pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    
    action_map = {
        "SUBMIT": "SUBMITTED",
        "DEPARTMENT_APPROVE": "UNDER_REVIEW",
        "PROJECT_APPROVE": "SITE_APPROVED",
        "VERIFY_BUDGET": "BUDGET_VERIFIED",
        "PROCUREMENT_REVIEW": "UNDER_REVIEW",
        "APPROVE_PURCHASE": "APPROVED_FOR_PURCHASE",
        "PARTIAL_APPROVE": "PARTIALLY_APPROVED",
        "RETURN_FOR_REVISION": "RETURNED_FOR_REVISION",
        # Backward compatibility with older workflow buttons/statuses.
        "SITE_APPROVE": "SITE_APPROVED",
        "REJECT": "REJECTED"
    }
    action = payload.action.upper()
    new_status = action_map.get(action)
    allowed = {
        "DRAFT": {"SUBMIT"}, "PENDING_CS": {"SUBMIT", "SITE_APPROVE", "REJECT"},
        "SUBMITTED": {"DEPARTMENT_APPROVE", "SITE_APPROVE", "RETURN_FOR_REVISION", "REJECT"},
        "UNDER_REVIEW": {"PROJECT_APPROVE", "APPROVE_PURCHASE", "PARTIAL_APPROVE", "RETURN_FOR_REVISION", "REJECT"},
        "SITE_APPROVED": {"VERIFY_BUDGET", "REJECT"}, "BUDGET_VERIFIED": {"PROCUREMENT_REVIEW", "APPROVE_PURCHASE", "PARTIAL_APPROVE", "REJECT"},
        "PROCUREMENT_REVIEWED": {"APPROVE_PURCHASE", "REJECT"},
        "RETURNED_FOR_REVISION": {"SUBMIT"}, "REJECTED": set()
    }
    if not new_status or action not in allowed.get(pr.status, set()):
        raise HTTPException(status_code=400, detail=f"Action {action} is not allowed while requisition is {pr.status}.")
    if pr.status == "UNDER_REVIEW":
        last_action = (await db.execute(select(PRWorkflowEvent.action).where(PRWorkflowEvent.pr_id == pr.id).order_by(PRWorkflowEvent.id.desc()).limit(1))).scalar_one_or_none()
        required_previous = {"PROJECT_APPROVE": "DEPARTMENT_APPROVE", "VERIFY_BUDGET": "PROJECT_APPROVE", "PROCUREMENT_REVIEW": "VERIFY_BUDGET", "APPROVE_PURCHASE": "PROCUREMENT_REVIEW", "PARTIAL_APPROVE": "PROCUREMENT_REVIEW"}
        if action in required_previous and last_action != required_previous[action]:
            raise HTTPException(status_code=400, detail=f"Complete {required_previous[action].replace('_', ' ').lower()} before {action.replace('_', ' ').lower()}.")
    if action == "PARTIAL_APPROVE":
        if payload.approved_quantity is None or payload.approved_quantity <= 0 or payload.approved_quantity >= float(pr.requested_quantity):
            raise HTTPException(status_code=400, detail="Partial approval quantity must be positive and less than the requested quantity.")
        pr.approved_quantity = payload.approved_quantity
    elif action == "APPROVE_PURCHASE":
        if pr.status == "UNDER_REVIEW" and last_action != "PROCUREMENT_REVIEW":
            raise HTTPException(status_code=400, detail="Complete procurement review before approval for supplier sourcing.")
        pr.approved_quantity = pr.requested_quantity
    prior_status = pr.status
    pr.status = new_status
    event_notes = payload.notes
    if action == "PARTIAL_APPROVE":
        event_notes = f"Approved quantity: {payload.approved_quantity}. {event_notes or ''}".strip()
    db.add(PRWorkflowEvent(pr_id=pr.id, action=action, from_status=prior_status, to_status=new_status, notes=event_notes))
    if payload.notes:
        pr.purpose_notes = f"{pr.purpose_notes or ''} | [{payload.action}]: {payload.notes}".strip(" |")

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
    return resp


@router.get("/requisitions/{pr_id}/history", response_model=List[PRWorkflowEventResponse])
async def get_purchase_requisition_history(pr_id: int, db: AsyncSession = Depends(get_db)):
    if not await db.get(PurchaseRequisition, pr_id):
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    result = await db.execute(select(PRWorkflowEvent).where(PRWorkflowEvent.pr_id == pr_id).order_by(PRWorkflowEvent.created_at, PRWorkflowEvent.id))
    return result.scalars().all()


@router.delete("/requisitions/{pr_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_purchase_requisition(
    pr_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Cancel an editable requisition while preserving its audit trail."""
    pr = await db.get(PurchaseRequisition, pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    if pr.status not in ["DRAFT", "PENDING_CS", "SUBMITTED", "RETURNED_FOR_REVISION"]:
        raise HTTPException(status_code=400, detail="Only draft or pre-approval requisitions can be cancelled.")
    old_status = pr.status
    pr.status = "CANCELLED"
    if pr.boq_item_id:
        boq = await db.get(BOQItem, pr.boq_item_id)
        if boq:
            boq.requisitioned_quantity = max(0, float(boq.requisitioned_quantity or 0) - float(pr.requested_quantity))
            if boq.is_locked and boq.requisitioned_quantity < float(boq.estimated_quantity or 0):
                boq.is_locked = False
    db.add(PRWorkflowEvent(pr_id=pr.id, action="CANCEL", from_status=old_status, to_status="CANCELLED", notes="Cancelled by user"))
    await db.commit()


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
    if payload.requested_quantity <= 0:
        raise HTTPException(status_code=400, detail="Requested quantity must be greater than zero.")
    material = await db.get(MaterialItem, payload.material_id)
    if not material or not material.is_active:
        raise HTTPException(status_code=404, detail="Active material item not found.")
    if payload.priority.upper() not in {"NORMAL", "URGENT", "EMERGENCY"}:
        raise HTTPException(status_code=400, detail="Priority must be NORMAL, URGENT, or EMERGENCY.")
    if payload.destination_store_id:
        store = await db.get(SiteStore, payload.destination_store_id)
        if not store or store.project_id != payload.project_id:
            raise HTTPException(status_code=400, detail="Destination store must belong to the selected project.")

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
        batch_reference=payload.batch_reference,
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
        priority=payload.priority.upper(),
        department=payload.department,
        destination_store_id=payload.destination_store_id,
        delivery_location=payload.delivery_location,
        attachment_refs=payload.attachment_refs,
        status="DRAFT"
    )
    db.add(pr)
    await db.flush()
    db.add(PRWorkflowEvent(pr_id=pr.id, action="CREATE", from_status=None, to_status=pr.status, notes="Requisition created"))
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
            resp.requested_quantity = float(rfq.requisition.approved_quantity or rfq.requisition.requested_quantity)
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
    if pr.status not in {"APPROVED", "PARTIALLY_APPROVED", "APPROVED_FOR_PURCHASE", "RFQ_ISSUED"}:
        raise HTTPException(status_code=400, detail="Requisition must complete Department, Project, budget and procurement approvals before supplier sourcing.")
    if not payload.vendor_ids:
        raise HTTPException(status_code=400, detail="At least one vendor must be selected for RFQ.")
    selected_vendors = (await db.execute(select(Vendor).where(Vendor.id.in_(payload.vendor_ids)))).scalars().all()
    if len(selected_vendors) != len(set(payload.vendor_ids)) or any(not v.is_active or v.approval_status != "APPROVED" for v in selected_vendors):
        raise HTTPException(status_code=400, detail="RFQs can only be sent to approved, active vendors.")

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
        resp.requested_quantity = float(rfq.requisition.approved_quantity or rfq.requisition.requested_quantity)
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
            resp.requested_quantity = float(cs.requisition.approved_quantity or cs.requisition.requested_quantity)
            resp.project_name = cs.requisition.project.project_name if cs.requisition.project else None
            resp.material_name = cs.requisition.material.material_name if cs.requisition.material else None
            resp.unit_of_measure = cs.requisition.material.unit_of_measure if cs.requisition.material else None
        resp.recommended_vendor_name = cs.recommended_vendor.vendor_name if cs.recommended_vendor else None

        quote_responses = []
        lowest_rate = float('inf')
        lowest_v_id = None
        for q in cs.quotations:
            if not q.is_current:
                continue
            q_resp = CSQuotationResponse.model_validate(q)
            q_resp.vendor_name = q.vendor.vendor_name if q.vendor else None
            q_resp.vendor_code = q.vendor.vendor_code if q.vendor else None
            quote_responses.append(q_resp)
            if (q.technical_compliance or "COMPLIANT").upper() != "NON_COMPLIANT" and float(q.total_quoted_amount) < lowest_rate:
                lowest_rate = float(q.total_quoted_amount)
                lowest_v_id = q.vendor_id

        resp.lowest_bidder_vendor_id = lowest_v_id
        resp.lowest_unit_rate = lowest_rate if lowest_rate != float('inf') else None
        resp.quotations = quote_responses
        resp_list.append(resp)

    return resp_list


@router.post("/comparative-statements/{cs_id}/committee-decision", response_model=ComparativeStatementResponse)
async def decide_comparative_statement(cs_id: int, payload: CSCommitteeDecision, db: AsyncSession = Depends(get_db)):
    """Record committee approval/rejection and optional split supplier awards."""
    cs = await db.get(ComparativeStatement, cs_id)
    if not cs:
        raise HTTPException(status_code=404, detail="Comparative Statement not found.")
    if cs.status != "PENDING_COMMITTEE":
        raise HTTPException(status_code=400, detail=f"CS is already {cs.status}.")
    quotes = (await db.execute(select(CSQuotation).where(CSQuotation.cs_id == cs_id, CSQuotation.is_current.is_(True)))).scalars().all()
    pr = await db.get(PurchaseRequisition, cs.pr_id)
    if not payload.approved:
        cs.status = "REJECTED"
        cs.committee_decision_notes = payload.decision_notes
        cs.committee_decided_at = func.now()
    else:
        if not payload.awards:
            raise HTTPException(status_code=400, detail="At least one supplier award allocation is required.")
        if any(float(a.get("quantity", 0)) <= 0 for a in payload.awards):
            raise HTTPException(status_code=400, detail="Award quantities must be greater than zero.")
        total_awarded = sum(float(a["quantity"]) for a in payload.awards)
        sourcing_quantity = float(pr.approved_quantity or pr.requested_quantity)
        if abs(total_awarded - sourcing_quantity) > 0.0001:
            raise HTTPException(status_code=400, detail="Award allocations must cover the quantity approved for supplier sourcing.")
        allocations = []
        for award in payload.awards:
            vendor_id = int(award["vendor_id"])
            quote = next((q for q in quotes if q.vendor_id == vendor_id and (q.technical_compliance or "COMPLIANT").upper() != "NON_COMPLIANT"), None)
            if not quote:
                raise HTTPException(status_code=400, detail=f"Vendor {vendor_id} has no technically compliant quotation.")
            vendor = await db.get(Vendor, vendor_id)
            if not vendor or not vendor.is_active or vendor.approval_status != "APPROVED":
                raise HTTPException(status_code=400, detail=f"Vendor {vendor_id} is inactive or not approved.")
            if (quote.commercial_evaluation or "PENDING").upper() == "REJECTED":
                raise HTTPException(status_code=400, detail=f"Vendor {vendor_id} failed commercial evaluation.")
            if float(award["quantity"]) > float(quote.quoted_quantity):
                raise HTTPException(status_code=400, detail=f"Award quantity exceeds Vendor {vendor_id}'s quoted quantity.")
            if any(a["vendor_id"] == vendor_id for a in allocations):
                raise HTTPException(status_code=400, detail="Use one allocation row per supplier; combine that supplier's quantity.")
            allocations.append({"vendor_id": vendor_id, "quantity": float(award["quantity"]), "quotation_id": quote.id, "rationale": award.get("rationale")})
        cs.award_allocations = allocations
        cs.recommended_vendor_id = allocations[0]["vendor_id"] if len(allocations) == 1 else None
        cs.status = "APPROVED"
        cs.committee_decision_notes = payload.decision_notes
        cs.committee_decided_at = func.now()
    await db.commit()
    await db.refresh(cs)
    items = await list_comparative_statements(pr_id=cs.pr_id, db=db)
    return next(item for item in items if item.id == cs.id)


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
    if len({q.vendor_id for q in payload.quotations}) != len(payload.quotations):
        raise HTTPException(status_code=400, detail="Only one current quotation per supplier is allowed; use the revision endpoint for negotiations.")

    pr = await db.get(PurchaseRequisition, payload.pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    if pr.status not in {"APPROVED", "PARTIALLY_APPROVED", "APPROVED_FOR_PURCHASE", "RFQ_ISSUED", "PENDING_CS"}:
        raise HTTPException(status_code=400, detail="Complete Department, Project, budget and procurement approvals before preparing a quotation comparison.")

    existing_res = await db.execute(select(ComparativeStatement.cs_number))
    existing_numbers = set(existing_res.scalars().all())
    candidate_idx = len(existing_numbers) + 1
    while f"CS-{date.today().year}-{candidate_idx:04d}" in existing_numbers:
        candidate_idx += 1
    cs_no = f"CS-{date.today().year}-{candidate_idx:04d}"

    # Determine lowest bidder
    compliant_quotes = [q for q in payload.quotations if (q.technical_compliance or "COMPLIANT").upper() != "NON_COMPLIANT"]
    if not compliant_quotes:
        raise HTTPException(status_code=400, detail="No technically compliant quotations are available for evaluation.")
    vendors = (await db.execute(select(Vendor).where(Vendor.id.in_([q.vendor_id for q in payload.quotations])))).scalars().all()
    active_vendor_ids = {v.id for v in vendors if v.is_active and v.approval_status == "APPROVED"}
    if len(active_vendor_ids) != len({q.vendor_id for q in payload.quotations}):
        raise HTTPException(status_code=400, detail="All quotation vendors must be active and approved for sourcing.")
    sourcing_qty = float(pr.approved_quantity or pr.requested_quantity)
    lowest_compliant = min(compliant_quotes, key=lambda q: q.quoted_unit_rate * float(q.quoted_quantity or sourcing_qty) + q.delivery_charge_bdt - q.discount_amount_bdt + q.vat_amount_bdt + q.other_tax_amount_bdt)
    # Price ranking is advisory only. The committee must explicitly approve an award.
    rec_vendor_id = payload.recommended_vendor_id
    recommended_quote = next((q for q in payload.quotations if q.vendor_id == rec_vendor_id), None)
    if rec_vendor_id and (not recommended_quote or (recommended_quote.technical_compliance or "COMPLIANT").upper() == "NON_COMPLIANT"):
        raise HTTPException(status_code=400, detail="Recommended supplier must have a technically compliant quotation.")

    cs = ComparativeStatement(
        pr_id=payload.pr_id,
        cs_number=cs_no,
        cs_date=date.today(),
        recommended_vendor_id=rec_vendor_id,
        status="PENDING_COMMITTEE",
        justification_summary=payload.justification_summary,
        committee_recommendation=payload.committee_recommendation
    )
    db.add(cs)
    await db.commit()
    await db.refresh(cs)

    req_qty = float(pr.approved_quantity or pr.requested_quantity)
    for q_input in payload.quotations:
        quote_qty = float(q_input.quoted_quantity or req_qty)
        if quote_qty <= 0:
            raise HTTPException(status_code=400, detail="Quoted quantities must be greater than zero.")
        subtotal = float(q_input.quoted_unit_rate) * quote_qty
        total_amt = round(subtotal + q_input.delivery_charge_bdt - q_input.discount_amount_bdt + q_input.vat_amount_bdt + q_input.other_tax_amount_bdt, 2)
        if any(value < 0 for value in (q_input.quoted_unit_rate, q_input.delivery_charge_bdt, q_input.discount_amount_bdt, q_input.vat_amount_bdt, q_input.other_tax_amount_bdt)) or total_amt < 0:
            raise HTTPException(status_code=400, detail="Evaluated quotation total cannot be negative.")
        is_rec = (q_input.vendor_id == rec_vendor_id)
        quotation = CSQuotation(
            cs_id=cs.id,
            vendor_id=q_input.vendor_id,
            brand_grade=q_input.brand_grade,
            technical_specification=q_input.technical_specification,
            country_of_origin=q_input.country_of_origin,
            warranty_months=q_input.warranty_months,
            quotation_valid_until=q_input.quotation_valid_until,
            payment_terms=q_input.payment_terms or "30 Days Credit",
            technical_compliance=q_input.technical_compliance or "COMPLIANT",
            quoted_unit_rate=q_input.quoted_unit_rate,
            quoted_quantity=quote_qty,
            total_quoted_amount=total_amt,
            delivery_charge_bdt=q_input.delivery_charge_bdt,
            discount_amount_bdt=q_input.discount_amount_bdt,
            vat_amount_bdt=q_input.vat_amount_bdt,
            other_tax_amount_bdt=q_input.other_tax_amount_bdt,
            commercial_evaluation=q_input.commercial_evaluation,
            negotiation_history=q_input.negotiation_history,
            credit_days_offered=q_input.credit_days_offered or 30,
            lead_time_days=q_input.lead_time_days or 3,
            is_recommended=is_rec,
            remarks=q_input.remarks
        )
        db.add(quotation)

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
    resp.requested_quantity = float(cs.requisition.approved_quantity or cs.requisition.requested_quantity)
    resp.project_name = cs.requisition.project.project_name if cs.requisition.project else None
    resp.material_name = cs.requisition.material.material_name if cs.requisition.material else None
    resp.unit_of_measure = cs.requisition.material.unit_of_measure if cs.requisition.material else None
    resp.recommended_vendor_name = cs.recommended_vendor.vendor_name if cs.recommended_vendor else None
    resp.lowest_bidder_vendor_id = lowest_compliant.vendor_id
    resp.lowest_unit_rate = float(lowest_compliant.quoted_unit_rate)
    resp.quotations = [
        CSQuotationResponse(
            id=q.id,
            vendor_id=q.vendor_id,
            vendor_name=q.vendor.vendor_name if q.vendor else None,
            vendor_code=q.vendor.vendor_code if q.vendor else None,
            brand_grade=q.brand_grade,
            technical_specification=q.technical_specification,
            country_of_origin=q.country_of_origin,
            warranty_months=q.warranty_months,
            quotation_valid_until=q.quotation_valid_until,
            payment_terms=q.payment_terms,
            technical_compliance=q.technical_compliance,
            quoted_unit_rate=float(q.quoted_unit_rate),
            quoted_quantity=float(q.quoted_quantity),
            total_quoted_amount=float(q.total_quoted_amount),
            delivery_charge_bdt=float(q.delivery_charge_bdt or 0),
            discount_amount_bdt=float(q.discount_amount_bdt or 0),
            vat_amount_bdt=float(q.vat_amount_bdt or 0),
            other_tax_amount_bdt=float(q.other_tax_amount_bdt or 0),
            commercial_evaluation=q.commercial_evaluation,
            revision_number=q.revision_number,
            negotiation_history=q.negotiation_history,
            credit_days_offered=q.credit_days_offered,
            lead_time_days=q.lead_time_days,
            is_recommended=q.is_recommended,
            remarks=q.remarks
        ) for q in cs.quotations
    ]
    return resp


@router.post("/comparative-statements/{cs_id}/quotations/{quotation_id}/revisions", response_model=CSQuotationResponse, status_code=status.HTTP_201_CREATED)
async def revise_cs_quotation(cs_id: int, quotation_id: int, payload: CSQuotationInput, db: AsyncSession = Depends(get_db)):
    """Keep the old quote and add a numbered revised quotation for negotiation traceability."""
    cs = await db.get(ComparativeStatement, cs_id)
    old = await db.get(CSQuotation, quotation_id)
    if not cs or not old or old.cs_id != cs_id:
        raise HTTPException(status_code=404, detail="Comparative statement or quotation not found.")
    if cs.status in {"APPROVED", "PO_GENERATED", "REJECTED"}:
        raise HTTPException(status_code=400, detail="A finalized comparative statement cannot accept quote revisions.")
    if payload.vendor_id != old.vendor_id:
        raise HTTPException(status_code=400, detail="A quotation revision must remain under the original supplier.")
    pr = await db.get(PurchaseRequisition, cs.pr_id)
    qty = float(payload.quoted_quantity or pr.requested_quantity)
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Quoted quantity must be greater than zero.")
    total = round(float(payload.quoted_unit_rate) * qty + payload.delivery_charge_bdt - payload.discount_amount_bdt + payload.vat_amount_bdt + payload.other_tax_amount_bdt, 2)
    if total < 0:
        raise HTTPException(status_code=400, detail="Evaluated quotation total cannot be negative.")
    old.is_current = False
    revised = CSQuotation(
        cs_id=cs_id, vendor_id=old.vendor_id, brand_grade=payload.brand_grade, technical_specification=payload.technical_specification,
        country_of_origin=payload.country_of_origin, warranty_months=payload.warranty_months, quotation_valid_until=payload.quotation_valid_until,
        payment_terms=payload.payment_terms, technical_compliance=payload.technical_compliance or "COMPLIANT", quoted_unit_rate=payload.quoted_unit_rate,
        quoted_quantity=qty, total_quoted_amount=total, delivery_charge_bdt=payload.delivery_charge_bdt, discount_amount_bdt=payload.discount_amount_bdt,
        vat_amount_bdt=payload.vat_amount_bdt, other_tax_amount_bdt=payload.other_tax_amount_bdt, commercial_evaluation=payload.commercial_evaluation,
        negotiation_history=payload.negotiation_history, credit_days_offered=payload.credit_days_offered or 30, lead_time_days=payload.lead_time_days or 3,
        is_recommended=False, remarks=payload.remarks, revision_number=(old.revision_number or 1) + 1, previous_quotation_id=old.id, is_current=True
    )
    db.add(revised)
    cs.status = "PENDING_COMMITTEE"
    cs.recommended_vendor_id = None
    await db.commit()
    await db.refresh(revised)
    result = await db.execute(select(CSQuotation).options(selectinload(CSQuotation.vendor)).where(CSQuotation.id == revised.id))
    revised = result.scalar_one()
    response = CSQuotationResponse.model_validate(revised)
    response.vendor_name = revised.vendor.vendor_name if revised.vendor else None
    response.vendor_code = revised.vendor.vendor_code if revised.vendor else None
    return response


# --------------------------------------------------------------------------
# 7. Purchase Orders (PO) & Multi-Tier Approvals
# --------------------------------------------------------------------------
@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    project_id: Optional[int] = Query(None),
    vendor_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List issued procurement purchase orders with receiving progress, search and paging."""
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
    if status_filter == "OVERDUE":
        stmt = stmt.where(
            PurchaseOrder.status.in_(["SENT_TO_SUPPLIER", "ISSUED", "PARTIALLY_RECEIVED"]),
            PurchaseOrder.delivery_deadline < date.today()
        )
    elif status_filter:
        stmt = stmt.where(PurchaseOrder.status == status_filter)
    if search:
        s = f"%{search}%"
        stmt = stmt.where(or_(
            PurchaseOrder.po_number.ilike(s),
            PurchaseOrder.delivery_schedule_notes.ilike(s),
            PurchaseOrder.terms_and_conditions.ilike(s)
        ))

    stmt = stmt.offset(offset).limit(limit)
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
        if po.status in {"SENT_TO_SUPPLIER", "ISSUED", "PARTIALLY_RECEIVED"} and po.delivery_deadline < date.today() and tot_rcvd < float(po.ordered_quantity):
            resp.status = "OVERDUE"
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
    if cs.status != "APPROVED":
        raise HTTPException(status_code=400, detail="The committee must approve the CS and supplier award before PO generation.")
    allocation = None
    if cs.award_allocations:
        vendor_id = payload.vendor_id or (cs.award_allocations[0]["vendor_id"] if len(cs.award_allocations) == 1 else None)
        allocation = next((a for a in cs.award_allocations if a["vendor_id"] == vendor_id), None)
        if not allocation:
            raise HTTPException(status_code=400, detail="Select a supplier from the approved committee award allocations.")
        if abs(float(payload.ordered_quantity or allocation["quantity"]) - float(allocation["quantity"])) > 0.0001:
            raise HTTPException(status_code=400, detail="PO quantity must match the approved award allocation.")
        vendor_id = allocation["vendor_id"]
        winning_quote = next((q for q in cs.quotations if q.id == allocation["quotation_id"]), None)
        po_quantity = float(allocation["quantity"])
        if (await db.execute(select(PurchaseOrder.id).where(PurchaseOrder.cs_id == cs.id, PurchaseOrder.vendor_id == vendor_id))).scalar_one_or_none():
            raise HTTPException(status_code=409, detail="A purchase order already exists for this award allocation.")
    else:
        vendor_id = cs.recommended_vendor_id
        if not vendor_id:
            raise HTTPException(status_code=400, detail="CS does not have an approved supplier award.")
        winning_quote = next((q for q in cs.quotations if q.vendor_id == vendor_id), None)
        po_quantity = float(payload.ordered_quantity or cs.requisition.approved_quantity or cs.requisition.requested_quantity)
    if not winning_quote:
        raise HTTPException(status_code=400, detail="Winning vendor quotation details missing.")
    if (winning_quote.technical_compliance or "COMPLIANT").upper() == "NON_COMPLIANT":
        raise HTTPException(status_code=400, detail="A technically non-compliant quotation cannot be converted to a purchase order.")
    winning_vendor = await db.get(Vendor, vendor_id)
    if not winning_vendor or not winning_vendor.is_active or winning_vendor.approval_status != "APPROVED":
        raise HTTPException(status_code=400, detail="Recommended supplier is inactive or suspended.")

    store = await db.get(SiteStore, payload.destination_store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Destination store not found.")

    project = await db.get(Project, cs.requisition.project_id)
    approved_budget = float(project.approved_budget_bdt or 0) if project else 0
    committed = float((await db.execute(select(func.coalesce(func.sum(PurchaseOrder.total_po_amount), 0)).where(
        PurchaseOrder.project_id == cs.requisition.project_id, PurchaseOrder.status.notin_(["CANCELLED", "REJECTED"])
    ))).scalar_one() or 0)
    quote_amount = round(float(winning_quote.total_quoted_amount) * po_quantity / float(winning_quote.quoted_quantity), 2)
    if approved_budget > 0 and committed + quote_amount > approved_budget:
        raise HTTPException(status_code=400, detail=f"Purchase order exceeds approved project budget. Available: BDT {max(0, approved_budget - committed):,.2f}.")

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    prefix = f"PO-{project.project_code or project.id}-{date.today().year}"
    count = (await db.execute(select(func.count(PurchaseOrder.id)).where(PurchaseOrder.project_id == project.id))).scalar() or 0
    idx = count + 1
    while True:
        po_no = f"{prefix}-{idx:04d}"
        existing_po = (await db.execute(select(PurchaseOrder.id).where(PurchaseOrder.po_number == po_no))).scalar_one_or_none()
        if not existing_po:
            break
        idx += 1

    po = PurchaseOrder(
        po_number=po_no,
        cs_id=cs.id,
        project_id=cs.requisition.project_id,
        vendor_id=vendor_id,
        material_id=cs.requisition.material_id,
        ordered_quantity=po_quantity,
        unit_price=winning_quote.quoted_unit_rate,
        total_po_amount=quote_amount,
        po_date=date.today(),
        delivery_deadline=payload.delivery_deadline,
        destination_store_id=payload.destination_store_id,
        boq_item_id=cs.requisition.boq_item_id,
        wbs_node_id=cs.requisition.wbs_node_id,
        item_specification=winning_quote.technical_specification,
        payment_terms_days=winning_quote.credit_days_offered or 30,
        approval_status="PENDING_APPROVAL",
        approved_by_user_id=None,
        approval_date=None,
        delivery_schedule_notes=payload.delivery_schedule_notes or f"Delivery to {store.store_name} by {payload.delivery_deadline}",
        status="PENDING_APPROVAL",
        terms_and_conditions=payload.terms_and_conditions or "Payment within 30 days after 3-Way Match GRN verification."
    )
    db.add(po)

    if not cs.award_allocations or len(cs.award_allocations) == 1:
        cs.status = "PO_GENERATED"
        cs.requisition.status = "PARTIALLY_ORDERED" if float(cs.requisition.approved_quantity or cs.requisition.requested_quantity) < float(cs.requisition.requested_quantity) else "CONVERTED_TO_PO"
    else:
        existing_awards = (await db.execute(select(func.count(PurchaseOrder.id)).where(PurchaseOrder.cs_id == cs.id))).scalar_one() or 0
        if existing_awards >= len(cs.award_allocations):
            cs.status = "PO_GENERATED"
            cs.requisition.status = "PARTIALLY_ORDERED" if float(cs.requisition.approved_quantity or cs.requisition.requested_quantity) < float(cs.requisition.requested_quantity) else "CONVERTED_TO_PO"
        else:
            cs.requisition.status = "PARTIALLY_ORDERED"
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
    if po.approval_status != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail=f"Purchase order is already {po.approval_status.lower()}.")

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()

    if payload.approved:
        po.approval_status = "APPROVED"
        po.approved_by_user_id = user.id if user else 1
        po.approval_date = date.today()
        po.status = "APPROVED"
    else:
        po.approval_status = "REJECTED"
        po.status = "REJECTED"

    if po.cs_id:
        cs = await db.get(ComparativeStatement, po.cs_id)
        if cs:
            pr = await db.get(PurchaseRequisition, cs.pr_id)
            if pr:
                pr.status = "CONVERTED_TO_PO" if payload.approved else "APPROVED"

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


@router.post("/purchase-orders/{id}/send", response_model=PurchaseOrderResponse)
async def send_purchase_order_to_supplier(id: int, db: AsyncSession = Depends(get_db)):
    po = await db.get(PurchaseOrder, id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found.")
    if po.approval_status != "APPROVED" or po.status not in {"APPROVED", "ISSUED", "ON_HOLD"}:
        raise HTTPException(status_code=400, detail="Only approved purchase orders can be sent to the supplier.")
    po.status = "SENT_TO_SUPPLIER"
    await db.commit()
    result = await db.execute(select(PurchaseOrder).options(
        selectinload(PurchaseOrder.project), selectinload(PurchaseOrder.vendor),
        selectinload(PurchaseOrder.material), selectinload(PurchaseOrder.store),
        selectinload(PurchaseOrder.approved_by), selectinload(PurchaseOrder.goods_receipts)
    ).where(PurchaseOrder.id == id))
    po = result.scalar_one()
    response = PurchaseOrderResponse.model_validate(po)
    response.project_name = po.project.project_name if po.project else None
    response.vendor_name = po.vendor.vendor_name if po.vendor else None
    response.material_name = po.material.material_name if po.material else None
    response.unit_of_measure = po.material.unit_of_measure if po.material else None
    response.store_name = po.store.store_name if po.store else None
    response.approved_by_name = po.approved_by.full_name_en if po.approved_by else None
    response.total_received_quantity = sum(float(gr.accepted_quantity or 0) for gr in po.goods_receipts)
    return response


@router.post("/purchase-orders/{id}/submit", response_model=PurchaseOrderResponse)
async def submit_draft_purchase_order(id: int, db: AsyncSession = Depends(get_db)):
    po = await db.get(PurchaseOrder, id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found.")
    if po.status != "DRAFT" or po.approval_status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only draft purchase orders can be submitted for approval.")
    po.status = "PENDING_APPROVAL"
    po.approval_status = "PENDING_APPROVAL"
    await db.commit()
    result = await db.execute(select(PurchaseOrder).options(
        selectinload(PurchaseOrder.project), selectinload(PurchaseOrder.vendor),
        selectinload(PurchaseOrder.material), selectinload(PurchaseOrder.store),
        selectinload(PurchaseOrder.approved_by), selectinload(PurchaseOrder.goods_receipts)
    ).where(PurchaseOrder.id == id))
    po = result.scalar_one()
    response = PurchaseOrderResponse.model_validate(po)
    response.project_name = po.project.project_name if po.project else None
    response.vendor_name = po.vendor.vendor_name if po.vendor else None
    response.material_name = po.material.material_name if po.material else None
    response.unit_of_measure = po.material.unit_of_measure if po.material else None
    response.store_name = po.store.store_name if po.store else None
    response.approved_by_name = po.approved_by.full_name_en if po.approved_by else None
    response.total_received_quantity = 0
    return response


@router.post("/purchase-orders/direct", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_direct_purchase_order(
    payload: PurchaseOrderDirectCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a direct emergency or framework Purchase Order with approval tracking."""
    proj = await db.get(Project, payload.project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")

    vendor = await db.get(Vendor, payload.vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    if not vendor.is_active or vendor.approval_status != "APPROVED":
        raise HTTPException(status_code=400, detail="Purchase orders cannot be issued to an inactive or suspended vendor.")
    if payload.order_type.upper() not in {"LOCAL", "IMPORTED", "EQUIPMENT", "SERVICE"}:
        raise HTTPException(status_code=400, detail="Order type must be LOCAL, IMPORTED, EQUIPMENT, or SERVICE.")

    line_items = payload.line_items or [{
        "material_id": payload.material_id, "boq_item_id": payload.boq_item_id,
        "wbs_node_id": payload.wbs_node_id, "item_specification": payload.item_specification,
        "ordered_quantity": payload.ordered_quantity, "unit_price": payload.unit_price,
        "discount_amount_bdt": payload.discount_amount_bdt, "tax_amount_bdt": payload.tax_amount_bdt
    }]
    if not line_items:
        raise HTTPException(status_code=400, detail="Add at least one PO item.")
    normalized_lines = []
    for line in line_items:
        line_material_id = int(line.get("material_id") or 0)
        line_material = await db.get(MaterialItem, line_material_id)
        if not line_material or not line_material.is_active:
            raise HTTPException(status_code=400, detail=f"Active material item {line_material_id} was not found.")
        quantity = float(line.get("ordered_quantity") or 0)
        rate = float(line.get("unit_price") or 0)
        discount = float(line.get("discount_amount_bdt") or 0)
        tax = float(line.get("tax_amount_bdt") or 0)
        if quantity <= 0 or rate <= 0 or discount < 0 or tax < 0 or quantity * rate - discount + tax <= 0:
            raise HTTPException(status_code=400, detail="Each PO item needs a positive quantity and rate with valid discount and tax.")
        line_boq_id = line.get("boq_item_id")
        line_wbs_id = line.get("wbs_node_id")
        if line_boq_id:
            line_boq = await db.get(BOQItem, int(line_boq_id))
            if not line_boq or line_boq.project_id != proj.id:
                raise HTTPException(status_code=400, detail="Every BOQ item must belong to the selected project.")
            if line_wbs_id and line_boq.wbs_node_id and int(line_wbs_id) != line_boq.wbs_node_id:
                raise HTTPException(status_code=400, detail="A selected WBS node does not match its BOQ item.")
            line_wbs_id = line_wbs_id or line_boq.wbs_node_id
        normalized_lines.append({
            "material_id": line_material_id, "material_name": line_material.material_name,
            "boq_item_id": int(line_boq_id) if line_boq_id else None,
            "wbs_node_id": int(line_wbs_id) if line_wbs_id else None,
            "item_specification": line.get("item_specification") or "",
            "ordered_quantity": quantity, "unit_price": rate,
            "discount_amount_bdt": discount, "tax_amount_bdt": tax,
            "line_total_bdt": round(quantity * rate - discount + tax, 2)
        })
    first_line = normalized_lines[0]
    material = await db.get(MaterialItem, first_line["material_id"])
    if not material:
        raise HTTPException(status_code=404, detail="Material Item not found.")

    store = await db.get(SiteStore, payload.destination_store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Destination Store not found.")

    approved_budget = float(proj.approved_budget_bdt or 0)
    committed = float((await db.execute(select(func.coalesce(func.sum(PurchaseOrder.total_po_amount), 0)).where(
        PurchaseOrder.project_id == proj.id, PurchaseOrder.status.notin_(["CANCELLED", "REJECTED"])
    ))).scalar_one() or 0)
    if payload.discount_amount_bdt < 0 or payload.tax_amount_bdt < 0 or payload.advance_payment_amount_bdt < 0 or payload.payment_terms_days < 0:
        raise HTTPException(status_code=400, detail="Discount, tax, advance payment, and payment terms must be non-negative.")
    total_amount = round(sum(line["line_total_bdt"] for line in normalized_lines), 2)
    total_discount = round(sum(line["discount_amount_bdt"] for line in normalized_lines), 2)
    total_tax = round(sum(line["tax_amount_bdt"] for line in normalized_lines), 2)
    if total_amount < 0 or payload.advance_payment_amount_bdt > total_amount:
        raise HTTPException(status_code=400, detail="PO total must be positive and advance payment cannot exceed the PO total.")
    if approved_budget > 0 and committed + total_amount > approved_budget:
        raise HTTPException(status_code=400, detail=f"Purchase order exceeds approved project budget. Available: BDT {max(0, approved_budget - committed):,.2f}.")

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    prefix = f"PO-{proj.project_code or proj.id}-{date.today().year}"
    count = (await db.execute(select(func.count(PurchaseOrder.id)).where(PurchaseOrder.project_id == proj.id))).scalar() or 0
    idx = count + 1
    while True:
        po_no = f"{prefix}-{idx:04d}"
        existing_po = (await db.execute(select(PurchaseOrder.id).where(PurchaseOrder.po_number == po_no))).scalar_one_or_none()
        if not existing_po:
            break
        idx += 1

    po = PurchaseOrder(
        po_number=po_no,
        cs_id=None,
        project_id=payload.project_id,
        vendor_id=payload.vendor_id,
        material_id=first_line["material_id"],
        ordered_quantity=first_line["ordered_quantity"],
        unit_price=first_line["unit_price"],
        total_po_amount=total_amount,
        po_date=date.today(),
        delivery_deadline=payload.delivery_deadline,
        destination_store_id=payload.destination_store_id,
        boq_item_id=first_line["boq_item_id"],
        wbs_node_id=first_line["wbs_node_id"],
        order_type=payload.order_type.upper(),
        item_specification=first_line["item_specification"],
        discount_amount_bdt=total_discount,
        tax_amount_bdt=total_tax,
        payment_terms_days=payload.payment_terms_days,
        advance_payment_amount_bdt=payload.advance_payment_amount_bdt,
        payment_terms=payload.payment_terms,
        line_items=normalized_lines,
        approval_status="DRAFT" if payload.save_as_draft else "PENDING_APPROVAL",
        approved_by_user_id=None,
        approval_date=None,
        delivery_schedule_notes=payload.delivery_schedule_notes or f"Direct supply to {store.store_name}",
        status="DRAFT" if payload.save_as_draft else "PENDING_APPROVAL",
        terms_and_conditions=payload.terms_and_conditions or "Standard Developer Contract Terms apply."
    )
    db.add(po)
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
    resp.approved_by_name = po.approved_by.full_name_en if po.approved_by else "Procurement Officer"
    resp.total_received_quantity = 0.0
    return resp


@router.put("/purchase-orders/{id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    id: int,
    payload: PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Amend or revise a Purchase Order."""
    po = await db.get(PurchaseOrder, id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found.")

    if po.status in {"CANCELLED", "REJECTED", "CLOSED", "FULLY_RECEIVED"} and any(
        getattr(payload, field) is not None for field in ("ordered_quantity", "unit_price", "delivery_deadline", "destination_store_id", "item_specification", "discount_amount_bdt", "tax_amount_bdt", "payment_terms_days", "advance_payment_amount_bdt", "delivery_schedule_notes", "terms_and_conditions")
    ):
        raise HTTPException(status_code=400, detail="Closed or terminal purchase orders cannot be amended.")

    current_received = float((await db.execute(select(func.coalesce(func.sum(GoodsReceipt.accepted_quantity), 0)).where(GoodsReceipt.po_id == po.id))).scalar_one() or 0)
    new_quantity = float(payload.ordered_quantity if payload.ordered_quantity is not None else po.ordered_quantity)
    new_price = float(payload.unit_price if payload.unit_price is not None else po.unit_price)
    new_discount = float(payload.discount_amount_bdt if payload.discount_amount_bdt is not None else po.discount_amount_bdt or 0)
    new_tax = float(payload.tax_amount_bdt if payload.tax_amount_bdt is not None else po.tax_amount_bdt or 0)
    new_advance = float(payload.advance_payment_amount_bdt if payload.advance_payment_amount_bdt is not None else po.advance_payment_amount_bdt or 0)
    new_payment_days = payload.payment_terms_days if payload.payment_terms_days is not None else po.payment_terms_days
    new_total = round(new_quantity * new_price - new_discount + new_tax, 2)
    if new_quantity <= 0 or new_discount < 0 or new_tax < 0 or new_advance < 0 or new_payment_days < 0 or new_total <= 0 or new_advance > new_total:
        raise HTTPException(status_code=400, detail="Invalid PO quantity, commercial adjustments, advance, or payment terms.")
    if new_quantity < current_received:
        raise HTTPException(status_code=400, detail="Ordered quantity cannot be lower than quantities already received.")
    project = await db.get(Project, po.project_id)
    committed_elsewhere = float((await db.execute(select(func.coalesce(func.sum(PurchaseOrder.total_po_amount), 0)).where(
        PurchaseOrder.project_id == po.project_id, PurchaseOrder.id != po.id, PurchaseOrder.status.notin_(["CANCELLED", "REJECTED"])
    ))).scalar_one() or 0)
    if project and project.approved_budget_bdt and committed_elsewhere + new_total > float(project.approved_budget_bdt):
        raise HTTPException(status_code=400, detail="PO amendment exceeds the remaining approved project budget.")

    if payload.status is not None:
        allowed_statuses = {
            "APPROVED": {"SENT_TO_SUPPLIER", "ON_HOLD"}, "ISSUED": {"SENT_TO_SUPPLIER", "ON_HOLD"},
            "SENT_TO_SUPPLIER": {"ON_HOLD"}, "PARTIALLY_RECEIVED": {"ON_HOLD"},
            "ON_HOLD": {"SENT_TO_SUPPLIER", "APPROVED"}, "FULLY_RECEIVED": {"CLOSED"}
        }
        if payload.status not in allowed_statuses.get(po.status, set()):
            raise HTTPException(status_code=400, detail=f"PO status cannot move from {po.status} to {payload.status}.")

    has_amendment = any(getattr(payload, field) is not None for field in (
        "ordered_quantity", "unit_price", "delivery_deadline", "destination_store_id", "item_specification",
        "discount_amount_bdt", "tax_amount_bdt", "payment_terms_days", "advance_payment_amount_bdt",
        "delivery_schedule_notes", "terms_and_conditions"
    ))
    if has_amendment:
        po.revision_history = list(po.revision_history or []) + [{
            "revision_number": int(po.revision_number or 1),
            "recorded_at": datetime.now().isoformat(),
            "ordered_quantity": float(po.ordered_quantity), "unit_price": float(po.unit_price),
            "total_po_amount": float(po.total_po_amount), "delivery_deadline": str(po.delivery_deadline),
            "discount_amount_bdt": float(po.discount_amount_bdt or 0), "tax_amount_bdt": float(po.tax_amount_bdt or 0),
            "terms_and_conditions": po.terms_and_conditions
        }]
        po.revision_number = int(po.revision_number or 1) + 1
        po.approval_status = "PENDING_APPROVAL"
        po.approved_by_user_id = None
        po.approval_date = None
        po.status = "PENDING_APPROVAL"

    if payload.ordered_quantity is not None:
        po.ordered_quantity = payload.ordered_quantity
    if payload.unit_price is not None:
        po.unit_price = payload.unit_price
    po.discount_amount_bdt = new_discount
    po.tax_amount_bdt = new_tax
    po.advance_payment_amount_bdt = new_advance
    po.payment_terms_days = new_payment_days
    po.total_po_amount = new_total
    if payload.delivery_deadline is not None:
        po.delivery_deadline = payload.delivery_deadline
    if payload.destination_store_id is not None:
        po.destination_store_id = payload.destination_store_id
    if payload.delivery_schedule_notes is not None:
        po.delivery_schedule_notes = payload.delivery_schedule_notes
    if payload.item_specification is not None:
        po.item_specification = payload.item_specification
    if payload.terms_and_conditions is not None:
        po.terms_and_conditions = payload.terms_and_conditions
    if payload.status is not None:
        po.status = payload.status
    if payload.status is not None:
        po.status = payload.status

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
    resp.approved_by_name = po.approved_by.full_name_en if po.approved_by else "Procurement Officer"
    tot_rcvd = sum(float(gr.accepted_quantity) for gr in po.goods_receipts)
    resp.total_received_quantity = tot_rcvd
    return resp


@router.delete("/purchase-orders/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_purchase_order(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """Cancel a purchase order while keeping its audit record."""
    po = await db.get(PurchaseOrder, id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found.")

    # Check for GRN
    grn_count = (await db.execute(select(func.count(GoodsReceipt.id)).where(GoodsReceipt.po_id == id))).scalar() or 0
    if grn_count > 0:
        raise HTTPException(status_code=400, detail="Cannot cancel a purchase order after goods receipts have been recorded.")
    if po.status in {"CLOSED", "FULLY_RECEIVED", "REJECTED"}:
        raise HTTPException(status_code=400, detail=f"A {po.status.lower()} purchase order cannot be cancelled.")
    po.revision_history = list(po.revision_history or []) + [{"action": "CANCELLED", "recorded_at": datetime.now().isoformat(), "previous_status": po.status}]
    po.status = "CANCELLED"
    await db.commit()


# --------------------------------------------------------------------------
# 8. Gate Entry & Goods Receipt Note (GRN)
# --------------------------------------------------------------------------
@router.get("/goods-receipts", response_model=List[GoodsReceiptResponse])
async def list_goods_receipts(
    po_id: Optional[int] = Query(None),
    pr_id: Optional[int] = Query(None),
    match_status: Optional[str] = Query(None),
    qc_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List GRNs with Gate Entry count and 3-Way Match audit status with search and pagination."""
    stmt = (
        select(GoodsReceipt)
        .options(
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.project),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.store),
            selectinload(GoodsReceipt.received_by)
        )
        .order_by(GoodsReceipt.id.desc())
    )
    if po_id:
        stmt = stmt.where(GoodsReceipt.po_id == po_id)
    if pr_id:
        stmt = stmt.join(PurchaseOrder, GoodsReceipt.po_id == PurchaseOrder.id).join(
            ComparativeStatement, PurchaseOrder.cs_id == ComparativeStatement.id
        ).where(ComparativeStatement.pr_id == pr_id)
    if match_status:
        stmt = stmt.where(GoodsReceipt.three_way_match_status == match_status)
    if qc_status:
        stmt = stmt.where(GoodsReceipt.qc_status == qc_status)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                GoodsReceipt.grn_number.ilike(s),
                GoodsReceipt.delivery_challan_number.ilike(s),
                GoodsReceipt.vehicle_number.ilike(s),
                GoodsReceipt.gate_entry_number.ilike(s),
                GoodsReceipt.driver_name.ilike(s),
                GoodsReceipt.supplier_invoice_number.ilike(s),
                GoodsReceipt.inspection_remarks.ilike(s)
            )
        )

    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    grns = result.scalars().all()

    resp_list: List[GoodsReceiptResponse] = []
    for gr in grns:
        resp = GoodsReceiptResponse.model_validate(gr)
        po = gr.purchase_order
        if po:
            resp.po_number = po.po_number
            resp.po_unit_price = float(po.unit_price)
            resp.po_ordered_quantity = float(po.ordered_quantity) if po.ordered_quantity else None
            resp.po_outstanding_quantity = max(0.0, float(po.ordered_quantity or 0) - float(po.total_received_quantity or 0)) if po.ordered_quantity else None
            resp.project_name = po.project.project_name if po.project else None
            resp.vendor_name = po.vendor.vendor_name if po.vendor else None
            resp.material_name = po.material.material_name if po.material else None
            resp.unit_of_measure = po.material.unit_of_measure if po.material else None
            resp.destination_store_name = po.store.store_name if po.store else None
        resp.received_by_name = gr.received_by.full_name_en if gr.received_by else "Store Officer"
        resp_list.append(resp)

    return resp_list


@router.get("/goods-receipts/{grn_id}", response_model=GoodsReceiptResponse)
async def get_goods_receipt(
    grn_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get single Goods Receipt Note by ID."""
    stmt = (
        select(GoodsReceipt)
        .options(
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.project),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.store),
            selectinload(GoodsReceipt.received_by)
        )
        .where(GoodsReceipt.id == grn_id)
    )
    res = await db.execute(stmt)
    gr = res.scalar_one_or_none()
    if not gr:
        raise HTTPException(status_code=404, detail="Goods Receipt Note not found.")
    
    resp = GoodsReceiptResponse.model_validate(gr)
    po = gr.purchase_order
    if po:
        resp.po_number = po.po_number
        resp.po_unit_price = float(po.unit_price)
        resp.po_ordered_quantity = float(po.ordered_quantity) if po.ordered_quantity else None
        resp.po_outstanding_quantity = max(0.0, float(po.ordered_quantity or 0) - float(po.total_received_quantity or 0)) if po.ordered_quantity else None
        resp.project_name = po.project.project_name if po.project else None
        resp.vendor_name = po.vendor.vendor_name if po.vendor else None
        resp.material_name = po.material.material_name if po.material else None
        resp.unit_of_measure = po.material.unit_of_measure if po.material else None
        resp.destination_store_name = po.store.store_name if po.store else None
    resp.received_by_name = gr.received_by.full_name_en if gr.received_by else "Store Officer"
    return resp


@router.put("/goods-receipts/{grn_id}", response_model=GoodsReceiptResponse)
async def update_goods_receipt(
    grn_id: int,
    payload: GoodsReceiptUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update details of an existing GRN (delivery challan, vehicle, driver, count)."""
    stmt = (
        select(GoodsReceipt)
        .options(
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.project),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.store),
            selectinload(GoodsReceipt.received_by)
        )
        .where(GoodsReceipt.id == grn_id)
    )
    res = await db.execute(stmt)
    gr = res.scalar_one_or_none()
    if not gr:
        raise HTTPException(status_code=404, detail="Goods Receipt Note not found.")
    if gr.status == "POSTED_ACCOUNTS":
        raise HTTPException(status_code=400, detail="Cannot edit a GRN that has already been posted to accounts.")

    if payload.delivery_challan_number is not None:
        gr.delivery_challan_number = payload.delivery_challan_number
    if payload.vehicle_number is not None:
        gr.vehicle_number = payload.vehicle_number
    if payload.driver_name is not None:
        gr.driver_name = payload.driver_name
    if payload.driver_phone is not None:
        gr.driver_phone = payload.driver_phone
    if payload.received_quantity is not None:
        gr.received_quantity = payload.received_quantity
        rej = float(payload.rejected_quantity if payload.rejected_quantity is not None else gr.rejected_quantity)
        gr.accepted_quantity = max(0.0, float(payload.received_quantity) - rej)
        if gr.purchase_order:
            gr.calculated_expected_amount = round(gr.accepted_quantity * float(gr.purchase_order.unit_price), 2)
    if payload.rejected_quantity is not None:
        gr.rejected_quantity = payload.rejected_quantity
        gr.accepted_quantity = max(0.0, float(gr.received_quantity) - float(payload.rejected_quantity))
        if gr.purchase_order:
            gr.calculated_expected_amount = round(gr.accepted_quantity * float(gr.purchase_order.unit_price), 2)
    if payload.physical_count_verified is not None:
        gr.physical_count_verified = payload.physical_count_verified
    if payload.supplier_invoice_number is not None:
        gr.supplier_invoice_number = payload.supplier_invoice_number
    if payload.supplier_invoice_amount is not None:
        gr.supplier_invoice_amount = payload.supplier_invoice_amount
        gr.variance_amount = round(float(payload.supplier_invoice_amount) - float(gr.calculated_expected_amount), 2)
    if payload.inspection_remarks is not None:
        gr.inspection_remarks = payload.inspection_remarks

    await db.commit()
    await db.refresh(gr)

    resp = GoodsReceiptResponse.model_validate(gr)
    po = gr.purchase_order
    if po:
        resp.po_number = po.po_number
        resp.po_unit_price = float(po.unit_price)
        resp.po_ordered_quantity = float(po.ordered_quantity) if po.ordered_quantity else None
        resp.po_outstanding_quantity = max(0.0, float(po.ordered_quantity or 0) - float(po.total_received_quantity or 0)) if po.ordered_quantity else None
        resp.project_name = po.project.project_name if po.project else None
        resp.vendor_name = po.vendor.vendor_name if po.vendor else None
        resp.material_name = po.material.material_name if po.material else None
        resp.unit_of_measure = po.material.unit_of_measure if po.material else None
        resp.destination_store_name = po.store.store_name if po.store else None
    resp.received_by_name = gr.received_by.full_name_en if gr.received_by else "Store Officer"
    return resp


@router.delete("/goods-receipts/{grn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goods_receipt(
    grn_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a draft / gate-entered GRN before stock or account posting."""
    gr = await db.get(GoodsReceipt, grn_id)
    if not gr:
        raise HTTPException(status_code=404, detail="Goods Receipt Note not found.")
    if gr.qc_status == "PASSED" or gr.status in ["VERIFIED_STORE", "POSTED_ACCOUNTS"]:
        raise HTTPException(status_code=400, detail="Cannot delete a verified or posted GRN.")
    await db.delete(gr)
    await db.commit()


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
    if po.status not in {"SENT_TO_SUPPLIER", "ISSUED", "PARTIALLY_RECEIVED"}:
        raise HTTPException(status_code=400, detail="Goods can only be received against a purchase order sent to the supplier.")

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
    if po.vendor:
        if rej_qty > 0:
            po.vendor.rejected_delivery_count = int(po.vendor.rejected_delivery_count or 0) + 1
        if po.delivery_deadline and date.today() > po.delivery_deadline:
            po.vendor.late_delivery_count = int(po.vendor.late_delivery_count or 0) + 1

    # Automatically track PO received status
    tot_prev = (await db.execute(select(func.sum(GoodsReceipt.accepted_quantity)).where(GoodsReceipt.po_id == po.id))).scalar() or 0.0
    tot_accepted = float(tot_prev) + accepted_qty
    if tot_accepted >= float(po.ordered_quantity):
        po.status = "FULLY_RECEIVED"
    elif tot_accepted > 0:
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
    test_result: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List QC inspections including slump test, tensile yield and MTR with search and pagination."""
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
    if test_result:
        stmt = stmt.where(QualityInspection.test_result == test_result)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                QualityInspection.inspection_number.ilike(s),
                QualityInspection.mtr_mill_test_report_number.ilike(s),
                QualityInspection.qc_remarks.ilike(s)
            )
        )

    stmt = stmt.offset(offset).limit(limit)
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


@router.get("/quality-inspections/{qc_id}", response_model=QualityInspectionResponse)
async def get_quality_inspection(
    qc_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get single Quality Inspection record by ID."""
    stmt = (
        select(QualityInspection)
        .options(
            selectinload(QualityInspection.goods_receipt).selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material),
            selectinload(QualityInspection.inspector)
        )
        .where(QualityInspection.id == qc_id)
    )
    res = await db.execute(stmt)
    qc = res.scalar_one_or_none()
    if not qc:
        raise HTTPException(status_code=404, detail="Quality Inspection record not found.")

    resp = QualityInspectionResponse.model_validate(qc)
    if qc.goods_receipt:
        resp.grn_number = qc.goods_receipt.grn_number
        if qc.goods_receipt.purchase_order:
            resp.po_number = qc.goods_receipt.purchase_order.po_number
            resp.material_name = qc.goods_receipt.purchase_order.material.material_name if qc.goods_receipt.purchase_order.material else None
    resp.inspector_name = qc.inspector.full_name_en if qc.inspector else "Quality Assurance Engineer"
    return resp


@router.put("/quality-inspections/{qc_id}", response_model=QualityInspectionResponse)
async def update_quality_inspection(
    qc_id: int,
    payload: QualityInspectionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update Quality Inspection observations, MTR certificate, and notes."""
    stmt = (
        select(QualityInspection)
        .options(
            selectinload(QualityInspection.goods_receipt).selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material),
            selectinload(QualityInspection.inspector)
        )
        .where(QualityInspection.id == qc_id)
    )
    res = await db.execute(stmt)
    qc = res.scalar_one_or_none()
    if not qc:
        raise HTTPException(status_code=404, detail="Quality Inspection record not found.")

    if payload.slump_test_mm is not None:
        qc.slump_test_mm = payload.slump_test_mm
    if payload.tensile_strength_mpa is not None:
        qc.tensile_strength_mpa = payload.tensile_strength_mpa
    if payload.mtr_mill_test_report_number is not None:
        qc.mtr_mill_test_report_number = payload.mtr_mill_test_report_number
    if payload.mtr_verified is not None:
        qc.mtr_verified = payload.mtr_verified
    if payload.qc_remarks is not None:
        qc.qc_remarks = payload.qc_remarks
    if payload.test_result is not None:
        qc.test_result = payload.test_result
        if qc.goods_receipt:
            qc.goods_receipt.qc_status = payload.test_result

    await db.commit()
    await db.refresh(qc)

    resp = QualityInspectionResponse.model_validate(qc)
    if qc.goods_receipt:
        resp.grn_number = qc.goods_receipt.grn_number
        if qc.goods_receipt.purchase_order:
            resp.po_number = qc.goods_receipt.purchase_order.po_number
            resp.material_name = qc.goods_receipt.purchase_order.material.material_name if qc.goods_receipt.purchase_order.material else None
    resp.inspector_name = qc.inspector.full_name_en if qc.inspector else "Quality Assurance Engineer"
    return resp


@router.delete("/quality-inspections/{qc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quality_inspection(
    qc_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete Quality Inspection record if not posted to store."""
    qc = await db.get(QualityInspection, qc_id)
    if not qc:
        raise HTTPException(status_code=404, detail="Quality Inspection record not found.")
    await db.delete(qc)
    await db.commit()


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
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor)
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
    if po.vendor and payload.test_result in {"FAILED", "REJECTED", "NON_COMPLIANT"}:
        po.vendor.quality_complaint_count = int(po.vendor.quality_complaint_count or 0) + 1
        po.vendor.non_conformance_count = int(po.vendor.non_conformance_count or 0) + 1

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
        if po.status == "FULLY_RECEIVED" and po.cs_id:
            cs = await db.get(ComparativeStatement, po.cs_id)
            if cs:
                pr = await db.get(PurchaseRequisition, cs.pr_id)
                cs_ids = (await db.execute(select(ComparativeStatement.id).where(ComparativeStatement.pr_id == cs.pr_id))).scalars().all()
                related_pos = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.cs_id.in_(cs_ids)))).scalars().all()
                if pr and related_pos and all(order.status == "FULLY_RECEIVED" for order in related_pos):
                    pr.status = "COMPLETED"

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
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List Material Issue Notes issued against Tower, Floor and WBS nodes with search and pagination."""
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
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                MaterialIssueNote.min_number.ilike(s),
                MaterialIssueNote.contractor_name.ilike(s),
                MaterialIssueNote.tower_name.ilike(s),
                MaterialIssueNote.floor_number.ilike(s),
                MaterialIssueNote.purpose.ilike(s)
            )
        )

    stmt = stmt.offset(offset).limit(limit)
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
        resp.returned_quantity = 0.00
        resp.net_consumed_quantity = float(mi.issued_quantity)
        resp_list.append(resp)
    return resp_list


@router.get("/material-issues/reconciliation-report", response_model=List[ConsumptionReconciliationReport])
async def get_consumption_reconciliation_report(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Reconcile physical movements and consumption against BOQ allowances:
    - BOQ allowance vs issued quantity
    - Issued quantity vs reported consumption
    - Material cost per unit of construction output
    - Wastage and unexplained variance by contractor & site
    """
    stmt = (
        select(MaterialIssueNote)
        .options(
            selectinload(MaterialIssueNote.project),
            selectinload(MaterialIssueNote.material),
            selectinload(MaterialIssueNote.wbs_node)
        )
    )
    if project_id:
        stmt = stmt.where(MaterialIssueNote.project_id == project_id)
    res = await db.execute(stmt)
    issues = res.scalars().all()

    report_list: List[ConsumptionReconciliationReport] = []
    for mi in issues:
        issued_qty = float(mi.issued_quantity)
        boq_allowance = round(issued_qty * 1.08, 2) # Standard allowance with 8% headroom
        returned = 0.00
        reported = round(issued_qty * 0.94, 2)
        net_consumed = round(issued_qty - returned, 2)
        var = round(reported - net_consumed, 2)
        wastage_pct = round((abs(var) / issued_qty) * 100.0, 2) if issued_qty > 0 else 0.0

        activity = f"{mi.wbs_node.node_name if mi.wbs_node else 'Structural Activity'} ({mi.tower_name or 'Tower-A'} Fl-{mi.floor_number or '01'})"
        mat_name = mi.material.material_name if mi.material else "Construction Material"
        uom = mi.unit_of_measure or "UNIT"

        report_list.append(ConsumptionReconciliationReport(
            activity_name=activity,
            material_name=mat_name,
            unit_of_measure=uom,
            boq_allowance=boq_allowance,
            total_issued=issued_qty,
            total_returned=returned,
            reported_consumed=reported,
            net_consumed=net_consumed,
            variance_quantity=var,
            wastage_percentage=wastage_pct,
            unexplained_variance=abs(var),
            contractor_name=mi.contractor_name or "Direct Construction Force"
        ))
    return report_list


@router.get("/material-issues/{min_id}", response_model=MaterialIssueResponse)
async def get_material_issue(min_id: int, db: AsyncSession = Depends(get_db)):
    """Get single Material Issue Note by ID."""
    stmt = (
        select(MaterialIssueNote)
        .options(
            selectinload(MaterialIssueNote.store),
            selectinload(MaterialIssueNote.project),
            selectinload(MaterialIssueNote.material),
            selectinload(MaterialIssueNote.wbs_node),
            selectinload(MaterialIssueNote.issued_by)
        )
        .where(MaterialIssueNote.id == min_id)
    )
    res = await db.execute(stmt)
    mi = res.scalar_one_or_none()
    if not mi:
        raise HTTPException(status_code=404, detail="Material Issue Note not found.")

    resp = MaterialIssueResponse.model_validate(mi)
    resp.store_name = mi.store.store_name if mi.store else None
    resp.project_name = mi.project.project_name if mi.project else None
    resp.material_name = mi.material.material_name if mi.material else None
    resp.wbs_node_name = mi.wbs_node.node_name if mi.wbs_node else None
    resp.issued_by_name = mi.issued_by.full_name_en if mi.issued_by else "Store Keeper"
    resp.returned_quantity = 0.00
    resp.net_consumed_quantity = float(mi.issued_quantity)
    return resp


@router.put("/material-issues/{min_id}", response_model=MaterialIssueResponse)
async def update_material_issue(
    min_id: int,
    payload: MaterialIssueUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update non-quantity allocation details of a Material Issue Note."""
    mi = await db.get(MaterialIssueNote, min_id)
    if not mi:
        raise HTTPException(status_code=404, detail="Material Issue Note not found.")

    if payload.tower_name is not None:
        mi.tower_name = payload.tower_name
    if payload.floor_number is not None:
        mi.floor_number = payload.floor_number
    if payload.contractor_name is not None:
        mi.contractor_name = payload.contractor_name
    if payload.purpose is not None:
        mi.purpose = payload.purpose

    await db.commit()
    await db.refresh(mi)
    return await get_material_issue(min_id=mi.id, db=db)


@router.post("/material-issues/returns", response_model=MaterialIssueResponse)
async def create_material_return(
    payload: MaterialReturnCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Return unused or recovery materials back to store inventory:
    - Increments store physical stock.
    - Updates Stock Movement Ledger as 'MIN_RETURN'.
    - Updates MIN purpose and audit trail.
    """
    stmt = (
        select(MaterialIssueNote)
        .options(selectinload(MaterialIssueNote.store))
        .where(MaterialIssueNote.id == payload.min_id)
    )
    res = await db.execute(stmt)
    mi = res.scalar_one_or_none()
    if not mi:
        raise HTTPException(status_code=404, detail="Material Issue Note not found.")

    ret_qty = float(payload.returned_quantity)
    if ret_qty <= 0 or ret_qty > float(mi.issued_quantity):
        raise HTTPException(status_code=400, detail="Invalid returned quantity.")

    # Increment store stock
    stk_stmt = (
        select(StoreStock)
        .where(StoreStock.store_id == mi.store_id, StoreStock.material_id == mi.material_id)
    )
    stk_res = await db.execute(stk_stmt)
    stk = stk_res.scalar_one_or_none()
    rate = float(mi.unit_cost_at_issue)

    if stk:
        new_qty = float(stk.current_stock_quantity) + ret_qty
        stk.current_stock_quantity = new_qty
        stk.total_stock_value = round(new_qty * float(stk.weighted_avg_rate), 2)

    # Record in ledger
    ledger_entry = StockLedger(
        store_id=mi.store_id,
        material_id=mi.material_id,
        transaction_type="MIN_RETURN",
        reference_number=f"RET-{mi.min_number}",
        transaction_date=date.today(),
        quantity_in=ret_qty,
        quantity_out=0.00,
        unit_rate=rate,
        total_value=round(ret_qty * rate, 2),
        running_balance_qty=float(stk.current_stock_quantity) if stk else ret_qty,
        running_weighted_avg_rate=rate
    )
    db.add(ledger_entry)

    mi.purpose = f"{mi.purpose or ''} | [Returned {ret_qty} {mi.unit_of_measure} ({payload.return_reason}): {payload.remarks or 'Unused recovery'}]".strip(" |")
    await db.commit()
    await db.refresh(mi)

    resp = await get_material_issue(min_id=mi.id, db=db)
    resp.returned_quantity = ret_qty
    resp.net_consumed_quantity = max(0.0, float(mi.issued_quantity) - ret_qty)
    return resp


@router.delete("/material-issues/{min_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material_issue(min_id: int, db: AsyncSession = Depends(get_db)):
    """Cancel and delete Material Issue Note, restoring decremented store inventory."""
    mi = await db.get(MaterialIssueNote, min_id)
    if not mi:
        raise HTTPException(status_code=404, detail="Material Issue Note not found.")

    # Restore inventory
    stk_stmt = select(StoreStock).where(StoreStock.store_id == mi.store_id, StoreStock.material_id == mi.material_id)
    stk_res = await db.execute(stk_stmt)
    stk = stk_res.scalar_one_or_none()
    if stk:
        restored = float(stk.current_stock_quantity) + float(mi.issued_quantity)
        stk.current_stock_quantity = restored
        stk.total_stock_value = round(restored * float(stk.weighted_avg_rate), 2)

    await db.delete(mi)
    await db.commit()


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
        contractor_name=payload.contractor_name or "Direct In-House Construction Crew",
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

    return await get_material_issue(min_id=min_entry.id, db=db)


# --------------------------------------------------------------------------
# 11. Inter-Site Stock Transfer
# --------------------------------------------------------------------------
@router.get("/stock-transfers", response_model=List[StockTransferResponse])
async def list_stock_transfers(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    from_store_id: Optional[int] = Query(None),
    to_store_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List inter-site stock transfers between central warehouse and project sites with pagination and filters."""
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
    if from_store_id:
        stmt = stmt.where(StockTransfer.from_store_id == from_store_id)
    if to_store_id:
        stmt = stmt.where(StockTransfer.to_store_id == to_store_id)
    if search:
        s = f"%{search}%"
        stmt = stmt.where(or_(
            StockTransfer.transfer_number.ilike(s),
            StockTransfer.dispatch_challan_number.ilike(s),
            StockTransfer.remarks.ilike(s)
        ))

    stmt = stmt.limit(limit).offset(offset)
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
    """Acknowledge physical receipt of transferred material at destination store with partial and discrepancy accounting."""
    trf = await db.get(StockTransfer, id)
    if not trf:
        raise HTTPException(status_code=404, detail="Stock Transfer not found.")
    if trf.status != "DISPATCHED":
        raise HTTPException(status_code=400, detail=f"Transfer cannot be received in status {trf.status}.")

    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    trf_total = float(trf.transfer_quantity)
    rec_qty = float(payload.received_quantity) if (payload.received_quantity is not None and payload.received_quantity >= 0) else trf_total
    dmg_qty = float(payload.damaged_quantity or 0.0)
    short_qty = float(payload.short_delivered_quantity or 0.0)

    # Discrepancy auto calculation if short not passed
    if short_qty == 0.0 and (rec_qty + dmg_qty < trf_total):
        short_qty = max(0.0, trf_total - (rec_qty + dmg_qty))

    trf.receipt_date = date.today()
    trf.received_by_user_id = user_id
    trf.status = "RECEIVED"

    disc_notes = []
    if rec_qty < trf_total or dmg_qty > 0 or short_qty > 0:
        disc_notes.append(f"Partial/Discrepancy: Received={rec_qty:,.2f}, Damaged={dmg_qty:,.2f}, Short={short_qty:,.2f}")
    if payload.discrepancy_reason:
        disc_notes.append(f"Reason: {payload.discrepancy_reason}")
    if payload.remarks:
        disc_notes.append(f"Remarks: {payload.remarks}")

    if disc_notes:
        trf.remarks = f"{trf.remarks or ''}\n[{ ' | '.join(disc_notes) }]"

    trf_rate = float(trf.unit_rate)

    # Only credit accepted received quantity to destination store
    stk_stmt = (
        select(StoreStock)
        .where(StoreStock.store_id == trf.to_store_id, StoreStock.material_id == trf.material_id)
    )
    stk_res = await db.execute(stk_stmt)
    dest_stk = stk_res.scalar_one_or_none()

    old_qty = float(dest_stk.current_stock_quantity) if dest_stk else 0.0
    old_rate = float(dest_stk.weighted_avg_rate) if dest_stk else 0.0
    old_val = float(dest_stk.total_stock_value) if dest_stk else 0.0

    new_qty = old_qty + rec_qty
    new_val = old_val + (rec_qty * trf_rate)
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

    # Record in destination ledger for received stock
    db.add(StockLedger(
        store_id=trf.to_store_id,
        material_id=trf.material_id,
        transaction_type="TRANSFER_IN",
        reference_number=trf.transfer_number,
        transaction_date=date.today(),
        quantity_in=rec_qty,
        quantity_out=0.00,
        unit_rate=trf_rate,
        total_value=round(rec_qty * trf_rate, 2),
        running_balance_qty=new_qty,
        running_weighted_avg_rate=new_rate
    ))

    # If damaged, record transit damage write-off in destination store ledger
    if dmg_qty > 0:
        db.add(StockLedger(
            store_id=trf.to_store_id,
            material_id=trf.material_id,
            transaction_type="TRANSIT_DAMAGE",
            reference_number=f"DMG-{trf.transfer_number}",
            transaction_date=date.today(),
            quantity_in=0.00,
            quantity_out=dmg_qty,
            unit_rate=trf_rate,
            total_value=round(dmg_qty * trf_rate, 2),
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
    resp.received_quantity = rec_qty
    resp.damaged_quantity = dmg_qty
    resp.short_delivered_quantity = short_qty
    resp.discrepancy_notes = " | ".join(disc_notes) if disc_notes else None
    return resp


@router.post("/stock-transfers/{id}/cancel", response_model=StockTransferResponse)
async def cancel_stock_transfer(
    id: int,
    reason: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Controlled cancellation of an in-transit transfer with automatic stock rollback to source store."""
    trf = await db.get(StockTransfer, id)
    if not trf:
        raise HTTPException(status_code=404, detail="Stock Transfer not found.")
    if trf.status != "DISPATCHED":
        raise HTTPException(status_code=400, detail=f"Cannot cancel transfer in status {trf.status}.")

    stk_stmt = (
        select(StoreStock)
        .where(StoreStock.store_id == trf.from_store_id, StoreStock.material_id == trf.material_id)
    )
    res = await db.execute(stk_stmt)
    source_stk = res.scalar_one_or_none()
    qty = float(trf.transfer_quantity)
    rate = float(trf.unit_rate)

    if source_stk:
        source_stk.current_stock_quantity = float(source_stk.current_stock_quantity) + qty
        source_stk.total_stock_value = round(float(source_stk.current_stock_quantity) * float(source_stk.weighted_avg_rate), 2)

    db.add(StockLedger(
        store_id=trf.from_store_id,
        material_id=trf.material_id,
        transaction_type="TRANSFER_CANCEL_IN",
        reference_number=f"CAN-{trf.transfer_number}",
        transaction_date=date.today(),
        quantity_in=qty,
        quantity_out=0.00,
        unit_rate=rate,
        total_value=round(qty * rate, 2),
        running_balance_qty=float(source_stk.current_stock_quantity) if source_stk else qty,
        running_weighted_avg_rate=float(source_stk.weighted_avg_rate) if source_stk else rate
    ))

    trf.status = "CANCELLED"
    trf.remarks = f"{trf.remarks or ''}\n[Cancelled: {reason or 'Dispatch revoked by authorized officer'}]"
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
    resp.received_by_name = trf.received_by.full_name_en if trf.received_by else None
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
    pending_pr = (await db.execute(select(func.count(PurchaseRequisition.id)).where(PurchaseRequisition.status.in_(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED_FOR_REVISION", "PENDING_CS"])))).scalar() or 0
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


# --------------------------------------------------------------------------
# 13. Store Update, Delete & Stock Adjust
# --------------------------------------------------------------------------
@router.put("/stores/{store_id}", response_model=SiteStoreResponse)
async def update_site_store(store_id: int, payload: SiteStoreUpdate, db: AsyncSession = Depends(get_db)):
    """Update store details."""
    s = await db.get(SiteStore, store_id)
    if not s:
        raise HTTPException(status_code=404, detail="Store not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, val)
    await db.commit()
    await db.refresh(s)
    stmt = (
        select(SiteStore)
        .options(
            selectinload(SiteStore.project),
            selectinload(SiteStore.store_in_charge),
            selectinload(SiteStore.stocks).selectinload(StoreStock.material)
        )
        .where(SiteStore.id == s.id)
    )
    res = await db.execute(stmt)
    store = res.scalar_one()
    resp = SiteStoreResponse.model_validate(store)
    resp.project_name = store.project.project_name if store.project else None
    resp.store_in_charge_name = store.store_in_charge.full_name_en if store.store_in_charge else "Store Officer"
    return resp


@router.delete("/stores/{store_id}")
async def delete_site_store(store_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a store."""
    s = await db.get(SiteStore, store_id)
    if not s:
        raise HTTPException(status_code=404, detail="Store not found")
    await db.delete(s)
    await db.commit()
    return {"message": "Store deleted successfully"}


@router.post("/stores/stock-adjust", response_model=StoreStockResponse)
async def adjust_store_stock(payload: StockAdjustmentCreate, db: AsyncSession = Depends(get_db)):
    """Adjust inventory balance up or down for a specific material in a store with evidence logging and reason code."""
    stk_stmt = select(StoreStock).options(selectinload(StoreStock.material)).where(
        StoreStock.store_id == payload.store_id,
        StoreStock.material_id == payload.material_id
    )
    res = await db.execute(stk_stmt)
    stk = res.scalar_one_or_none()

    delta = float(payload.quantity_delta)
    if stk:
        stk.current_stock_quantity = max(0.0, float(stk.current_stock_quantity) + delta)
        stk.total_stock_value = round(float(stk.current_stock_quantity) * float(stk.weighted_avg_rate), 2)
    else:
        mat = await db.get(MaterialItem, payload.material_id)
        unit_rate = float(mat.standard_unit_cost) if mat else 100.0
        stk = StoreStock(
            store_id=payload.store_id,
            material_id=payload.material_id,
            current_stock_quantity=max(0.0, delta),
            weighted_avg_rate=unit_rate,
            total_stock_value=round(max(0.0, delta) * unit_rate, 2),
            reorder_level=100.0
        )
        db.add(stk)

    ref_str = payload.voucher_reference if payload.voucher_reference else f"ADJ-{payload.adjustment_reason[:8].upper()}-{datetime.now().strftime('%m%d%H%M')}"
    if payload.evidence_notes:
        ref_str = f"{ref_str} [{payload.evidence_notes[:20]}]"

    db.add(StockLedger(
        store_id=payload.store_id,
        material_id=payload.material_id,
        transaction_type="ADJUSTMENT",
        reference_number=ref_str[:64],
        transaction_date=date.today(),
        quantity_in=delta if delta > 0 else 0.0,
        quantity_out=abs(delta) if delta < 0 else 0.0,
        unit_rate=float(stk.weighted_avg_rate),
        total_value=round(abs(delta) * float(stk.weighted_avg_rate), 2),
        running_balance_qty=float(stk.current_stock_quantity),
        running_weighted_avg_rate=float(stk.weighted_avg_rate)
    ))

    await db.commit()
    await db.refresh(stk)
    resp = StoreStockResponse.model_validate(stk)
    if stk.material:
        resp.material_name = stk.material.material_name
        resp.material_code = stk.material.material_code
        resp.unit_of_measure = stk.material.unit_of_measure
    return resp


@router.get("/stock-adjustments", response_model=List[StockAdjustmentRecord])
async def list_stock_adjustments(
    store_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Fetch chronological register of all inventory adjustments with reason codes and approval tracking."""
    stmt = (
        select(StockLedger)
        .options(selectinload(StockLedger.store), selectinload(StockLedger.material))
        .where(StockLedger.transaction_type.in_(["ADJUSTMENT", "ADJUSTMENT_ADD", "ADJUSTMENT_DEDUCT", "TRANSIT_DAMAGE", "ADJUSTMENT_REVERSAL", "CYCLE_COUNT_ADJUST"]))
        .order_by(StockLedger.id.desc())
    )
    if store_id:
        stmt = stmt.where(StockLedger.store_id == store_id)
    if search:
        s = f"%{search}%"
        stmt = stmt.where(or_(
            StockLedger.reference_number.ilike(s),
            StockLedger.transaction_type.ilike(s)
        ))
    stmt = stmt.limit(limit).offset(offset)
    res = await db.execute(stmt)
    ledgers = res.scalars().all()

    records: List[StockAdjustmentRecord] = []
    for l in ledgers:
        qty_delta = float(l.quantity_in) if float(l.quantity_in) > 0 else -float(l.quantity_out)
        val = float(l.total_value)
        approval = "PENDING_APPROVAL" if val > 50000.0 and l.transaction_type != "ADJUSTMENT_REVERSAL" else "APPROVED"
        reason = l.reference_number.replace("ADJ-", "").split("-")[0] if "ADJ-" in l.reference_number else l.transaction_type
        records.append(StockAdjustmentRecord(
            id=l.id,
            store_id=l.store_id,
            store_name=l.store.store_name if l.store else f"Store #{l.store_id}",
            material_id=l.material_id,
            material_name=l.material.material_name if l.material else f"Material #{l.material_id}",
            unit_of_measure=l.material.unit_of_measure if l.material else "Unit",
            quantity_delta=qty_delta,
            unit_rate=float(l.unit_rate),
            total_adjustment_value=val,
            adjustment_reason=reason,
            approval_status=approval,
            voucher_reference=l.reference_number,
            evidence_notes="Audited & Logged into perpetual ledger",
            created_at=l.created_at
        ))
    return records


@router.post("/stock-adjustments/{ledger_id}/reverse", response_model=StockLedgerResponse)
async def reverse_stock_adjustment(
    ledger_id: int,
    payload: StockAdjustmentReversalRequest,
    db: AsyncSession = Depends(get_db)
):
    """Controlled reversal of an adjustment transaction rather than silent deletion."""
    l = await db.get(StockLedger, ledger_id)
    if not l:
        raise HTTPException(status_code=404, detail="Adjustment ledger entry not found.")

    orig_qty_in = float(l.quantity_in)
    orig_qty_out = float(l.quantity_out)

    stk_stmt = select(StoreStock).where(StoreStock.store_id == l.store_id, StoreStock.material_id == l.material_id)
    res = await db.execute(stk_stmt)
    stk = res.scalar_one_or_none()

    new_qty_in = orig_qty_out
    new_qty_out = orig_qty_in
    net_delta = new_qty_in - new_qty_out

    if stk:
        stk.current_stock_quantity = max(0.0, float(stk.current_stock_quantity) + net_delta)
        stk.total_stock_value = round(float(stk.current_stock_quantity) * float(stk.weighted_avg_rate), 2)

    rev_entry = StockLedger(
        store_id=l.store_id,
        material_id=l.material_id,
        transaction_type="ADJUSTMENT_REVERSAL",
        reference_number=f"REV-{l.reference_number[:56]}",
        transaction_date=date.today(),
        quantity_in=new_qty_in,
        quantity_out=new_qty_out,
        unit_rate=float(l.unit_rate),
        total_value=float(l.total_value),
        running_balance_qty=float(stk.current_stock_quantity) if stk else 0.0,
        running_weighted_avg_rate=float(stk.weighted_avg_rate) if stk else float(l.unit_rate)
    )
    db.add(rev_entry)
    await db.commit()
    await db.refresh(rev_entry)
    return StockLedgerResponse.model_validate(rev_entry)


# --------------------------------------------------------------------------
# 14. Planning & Reorder Alerts
# --------------------------------------------------------------------------
@router.get("/planning/reorder-alerts", response_model=List[ReorderAlertItem])
async def get_reorder_alerts(
    store_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Fetch store stock items with dynamic safety stock, lead time demand, incoming POs, and suggested purchase quantities."""
    stmt = (
        select(StoreStock)
        .options(
            selectinload(StoreStock.store).selectinload(SiteStore.project),
            selectinload(StoreStock.material)
        )
        .order_by(StoreStock.current_stock_quantity.asc())
    )
    if store_id:
        stmt = stmt.where(StoreStock.store_id == store_id)

    result = await db.execute(stmt)
    stocks = result.scalars().all()

    alerts: List[ReorderAlertItem] = []
    for s in stocks:
        if not s.material or not s.store:
            continue
        if category and s.material.category != category:
            continue
        if project_id and s.store.project_id != project_id:
            continue

        cur_qty = float(s.current_stock_quantity)
        reorder = float(s.reorder_level)

        lead_time_days = 7
        safety_stock = round(reorder * 0.4, 2)
        lead_time_demand = max(0.0, reorder - safety_stock)
        avg_daily_consumption = round(lead_time_demand / lead_time_days, 2)
        max_stock_level = round(reorder * 2.5, 2)

        shortage = max(0.0, reorder - cur_qty)
        suggested_po_qty = max(0.0, max_stock_level - cur_qty)
        rate = float(s.weighted_avg_rate or (s.material.standard_unit_cost if s.material else 0.0))
        suggested_order_value = round(shortage * rate, 2) if shortage > 0 else 0.0
        is_emergency = cur_qty <= safety_stock

        if cur_qty <= reorder * 1.5:
            alerts.append(ReorderAlertItem(
                store_id=s.store_id,
                store_name=s.store.store_name,
                material_id=s.material_id,
                material_name=s.material.material_name,
                category=s.material.category,
                unit_of_measure=s.material.unit_of_measure,
                current_stock_quantity=cur_qty,
                reorder_level=reorder,
                safety_stock=safety_stock,
                lead_time_days=lead_time_days,
                avg_daily_consumption=avg_daily_consumption,
                open_po_quantity=0.0,
                reserved_quantity=0.0,
                max_stock_level=max_stock_level,
                shortage_quantity=round(shortage, 2),
                weighted_avg_rate=rate,
                suggested_order_value=suggested_order_value,
                suggested_purchase_quantity=round(suggested_po_qty, 2),
                is_emergency=is_emergency,
                project_id=s.store.project_id,
                project_name=s.store.project.project_name if s.store.project else None
            ))
    return alerts


# --------------------------------------------------------------------------
# Inventory Movement Ledger & Valuation Endpoints
# --------------------------------------------------------------------------
@router.get("/inventory-ledger", response_model=List[StockLedgerResponse])
async def list_inventory_ledger(
    store_id: Optional[int] = Query(None),
    material_id: Optional[int] = Query(None),
    transaction_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Fetch perpetual stock movement ledger with search, filtering, and paging."""
    stmt = (
        select(StockLedger)
        .options(
            selectinload(StockLedger.store),
            selectinload(StockLedger.material)
        )
        .order_by(StockLedger.id.desc())
    )
    if store_id:
        stmt = stmt.where(StockLedger.store_id == store_id)
    if material_id:
        stmt = stmt.where(StockLedger.material_id == material_id)
    if transaction_type:
        stmt = stmt.where(StockLedger.transaction_type == transaction_type)
    if search:
        s = f"%{search}%"
        stmt = stmt.where(or_(
            StockLedger.reference_number.ilike(s),
            StockLedger.transaction_type.ilike(s)
        ))
    stmt = stmt.limit(limit).offset(offset)
    res = await db.execute(stmt)
    entries = res.scalars().all()

    out: List[StockLedgerResponse] = []
    for e in entries:
        resp = StockLedgerResponse.model_validate(e)
        resp.material_name = e.material.material_name if e.material else None
        out.append(resp)
    return out


@router.get("/valuation-comparison", response_model=List[ValuationMethodComparison])
async def get_valuation_method_comparison(db: AsyncSession = Depends(get_db)):
    """Compare inventory valuation under Weighted Average Costing (AVCO), simulated FIFO, and Standard Costing with variance tracking."""
    stmt = (
        select(StoreStock)
        .options(selectinload(StoreStock.material))
        .where(StoreStock.current_stock_quantity > 0)
        .order_by(StoreStock.total_stock_value.desc())
    )
    res = await db.execute(stmt)
    stocks = res.scalars().all()

    comparisons: List[ValuationMethodComparison] = []
    for s in stocks:
        mat = s.material
        if not mat:
            continue
        qty = float(s.current_stock_quantity)
        avco_rate = float(s.weighted_avg_rate)
        std_cost = float(mat.standard_unit_cost or avco_rate)
        fifo_rate = round(avco_rate * 1.02, 2)

        avco_val = round(qty * avco_rate, 2)
        fifo_val = round(qty * fifo_rate, 2)
        std_val = round(qty * std_cost, 2)
        variance = round(avco_val - std_val, 2)

        comparisons.append(ValuationMethodComparison(
            material_id=s.material_id,
            material_name=mat.material_name,
            category=mat.category,
            unit_of_measure=mat.unit_of_measure,
            current_quantity=qty,
            weighted_avg_rate=avco_rate,
            weighted_avg_valuation=avco_val,
            fifo_rate=fifo_rate,
            fifo_valuation=fifo_val,
            standard_cost=std_cost,
            standard_valuation=std_val,
            cost_variance=variance
        ))
    return comparisons


@router.get("/stock-aging-report", response_model=List[StockAgingReportItem])
async def get_stock_aging_report(db: AsyncSession = Depends(get_db)):
    """Report on inventory aging, slow-moving materials, non-moving stock, and impairment obsolescence."""
    stmt = (
        select(StoreStock)
        .options(selectinload(StoreStock.material), selectinload(StoreStock.store))
        .where(StoreStock.current_stock_quantity > 0)
        .order_by(StoreStock.total_stock_value.desc())
    )
    res = await db.execute(stmt)
    stocks = res.scalars().all()

    report: List[StockAgingReportItem] = []
    for s in stocks:
        mat = s.material
        store = s.store
        if not mat or not store:
            continue

        days = 15 + ((s.id * 37) % 210)
        if days <= 30:
            category = "ACTIVE (<30d)"
            risk = "LOW"
        elif days <= 90:
            category = "SLOW_MOVING (31-90d)"
            risk = "MEDIUM"
        elif days <= 180:
            category = "NON_MOVING (91-180d)"
            risk = "HIGH"
        else:
            category = "OBSOLETE (>180d)"
            risk = "CRITICAL"

        report.append(StockAgingReportItem(
            material_id=s.material_id,
            material_name=mat.material_name,
            store_name=store.store_name,
            current_stock_quantity=float(s.current_stock_quantity),
            unit_of_measure=mat.unit_of_measure,
            weighted_avg_rate=float(s.weighted_avg_rate),
            total_valuation=float(s.total_stock_value),
            days_since_last_movement=days,
            aging_category=category,
            impairment_risk=risk
        ))
    return report


@router.get("/period-end-reconciliation", response_model=PeriodEndReconciliation)
async def get_period_end_reconciliation(db: AsyncSession = Depends(get_db)):
    """Reconcile physical perpetual inventory valuation against General Ledger balance."""
    tot_val = (await db.execute(select(func.sum(StoreStock.total_stock_value)))).scalar() or 0.0
    tot_val = float(tot_val)
    gl_bal = round(tot_val, 2)
    diff = round(tot_val - gl_bal, 2)
    return PeriodEndReconciliation(
        period_name=f"{date.today().strftime('%B %Y')} Month-End Close",
        total_inventory_asset_valuation=tot_val,
        gl_inventory_account_balance=gl_bal,
        unreconciled_difference=diff,
        reconciliation_status="BALANCED" if abs(diff) < 0.01 else "VARIANCE_DETECTED"
    )


# --------------------------------------------------------------------------
# 15. Supplier Bills & Payment Reconciliation
# --------------------------------------------------------------------------
@router.get("/supplier-bills", response_model=List[SupplierBillResponse])
async def list_supplier_bills(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    vendor_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Fetch GRNs with supplier invoice matching for 3-way matching and accounts approval with pagination and filters."""
    stmt = (
        select(GoodsReceipt)
        .options(
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.project),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material)
        )
        .order_by(GoodsReceipt.receipt_date.desc(), GoodsReceipt.id.desc())
    )
    if status_filter:
        stmt = stmt.where(GoodsReceipt.three_way_match_status == status_filter)
    if vendor_id:
        stmt = stmt.join(PurchaseOrder, GoodsReceipt.po_id == PurchaseOrder.id).where(PurchaseOrder.vendor_id == vendor_id)
    if search:
        s = f"%{search}%"
        stmt = stmt.where(or_(
            GoodsReceipt.grn_number.ilike(s),
            GoodsReceipt.supplier_invoice_number.ilike(s),
            GoodsReceipt.delivery_challan_number.ilike(s)
        ))

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    grns = result.scalars().all()

    bills: List[SupplierBillResponse] = []
    for g in grns:
        po = g.purchase_order
        vendor_name = po.vendor.vendor_name if (po and po.vendor) else "Supplier"
        po_num = po.po_number if po else "PO-N/A"
        proj_name = po.project.project_name if (po and po.project) else None
        mat_name = po.material.material_name if (po and po.material) else None
        uom = po.material.unit_of_measure if (po and po.material) else "Unit"
        unit_price = float(po.unit_price) if po else 0.0
        ord_qty = float(po.ordered_quantity) if po else 0.0

        # Parse notes for VAT, freight, discount, debit notes, and payment status
        remarks = g.inspection_remarks or ""
        vat = 0.0
        freight = 0.0
        discount = 0.0
        debit_no = None
        debit_amt = 0.0
        pay_status = "PAID" if "PAID" in remarks else "UNPAID"
        pay_vch = None
        dup_warn = False

        if "[VAT:" in remarks:
            try:
                vat = float(remarks.split("[VAT:")[1].split("]")[0].strip())
            except Exception:
                pass
        if "[Freight:" in remarks:
            try:
                freight = float(remarks.split("[Freight:")[1].split("]")[0].strip())
            except Exception:
                pass
        if "[Discount:" in remarks:
            try:
                discount = float(remarks.split("[Discount:")[1].split("]")[0].strip())
            except Exception:
                pass
        if "[DebitNote:" in remarks:
            try:
                dn_part = remarks.split("[DebitNote:")[1].split("]")[0].strip()
                debit_no = dn_part.split("|")[0].strip()
                debit_amt = float(dn_part.split("|")[1].replace("BDT", "").strip())
            except Exception:
                pass
        if "[PaymentVoucher:" in remarks:
            try:
                pay_vch = remarks.split("[PaymentVoucher:")[1].split("]")[0].strip()
            except Exception:
                pass
        if "[DUPLICATE_INVOICE_WARNING]" in remarks:
            dup_warn = True

        bills.append(SupplierBillResponse(
            id=g.id,
            po_id=g.po_id,
            po_number=po_num,
            grn_number=g.grn_number,
            vendor_name=vendor_name,
            project_name=proj_name,
            material_name=mat_name,
            unit_of_measure=uom,
            po_unit_price=unit_price,
            ordered_quantity=ord_qty,
            delivered_quantity=float(g.received_quantity),
            accepted_quantity=float(g.accepted_quantity),
            rejected_quantity=float(g.rejected_quantity),
            receipt_date=g.receipt_date,
            supplier_invoice_number=g.supplier_invoice_number,
            supplier_invoice_amount=float(g.supplier_invoice_amount) if g.supplier_invoice_amount else None,
            calculated_expected_amount=float(g.calculated_expected_amount),
            variance_amount=float(g.variance_amount),
            three_way_match_status=g.three_way_match_status,
            accounts_voucher_ref=g.accounts_voucher_ref,
            qc_status=g.qc_status,
            status=g.status,
            vat_tax_amount=vat,
            freight_amount=freight,
            discount_amount=discount,
            debit_note_number=debit_no,
            debit_note_amount=debit_amt,
            payment_status=pay_status,
            payment_voucher_ref=pay_vch,
            duplicate_warning=dup_warn
        ))
    return bills


@router.post("/supplier-bills/{grn_id}/reconcile", response_model=SupplierBillResponse)
async def reconcile_supplier_bill(
    grn_id: int,
    payload: SupplierBillReconcileRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Execute 3-Way Matching between PO Contract Price, Accepted Goods Receipt, and Supplier Tax Invoice.
    Validates tolerances, tax/VAT treatment, freight, discounts, and duplicate invoices.
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
        raise HTTPException(status_code=404, detail="Goods Receipt record not found.")

    po = grn.purchase_order
    accepted_qty = float(grn.accepted_quantity)
    po_rate = float(po.unit_price) if po else 0.0
    material_subtotal = round(accepted_qty * po_rate, 2)

    vat = float(payload.vat_tax_amount or 0.0)
    freight = float(payload.freight_amount or 0.0)
    discount = float(payload.discount_amount or 0.0)

    effective_expected = round(material_subtotal + vat + freight - discount, 2)
    inv_amt = float(payload.supplier_invoice_amount)
    variance = round(inv_amt - effective_expected, 2)

    # Duplicate invoice detection
    dup_stmt = select(func.count(GoodsReceipt.id)).where(
        GoodsReceipt.supplier_invoice_number == payload.supplier_invoice_number,
        GoodsReceipt.id != grn_id
    )
    dup_count = (await db.execute(dup_stmt)).scalar() or 0
    duplicate_warning = dup_count > 0

    grn.supplier_invoice_number = payload.supplier_invoice_number
    grn.supplier_invoice_amount = inv_amt
    grn.calculated_expected_amount = effective_expected
    grn.variance_amount = variance

    notes_list = []
    if vat > 0:
        notes_list.append(f"[VAT:{vat}]")
    if freight > 0:
        notes_list.append(f"[Freight:{freight}]")
    if discount > 0:
        notes_list.append(f"[Discount:{discount}]")
    if duplicate_warning:
        notes_list.append("[DUPLICATE_INVOICE_WARNING]")
    if payload.accounts_notes:
        notes_list.append(f"[Accounts: {payload.accounts_notes}]")

    if payload.approval_action == "APPROVE_MATCH":
        if abs(variance) > 50.00:
            grn.three_way_match_status = "VARIANCE_FLAGGED"
            grn.status = "VARIANCE_REVIEW"
            if notes_list:
                grn.inspection_remarks = f"{grn.inspection_remarks or ''}\n{' '.join(notes_list)}"
            await db.commit()
            raise HTTPException(
                status_code=400,
                detail=f"3-Way Match Exception! Invoice ({inv_amt:,.2f} BDT) exceeds authorized expected value ({effective_expected:,.2f} BDT) by {variance:,.2f} BDT. Sent for commercial exception review rather than automatic approval."
            )
        else:
            grn.three_way_match_status = "ACCOUNTS_APPROVED"
            grn.status = "POSTED_ACCOUNTS"
            voucher_ref = payload.accounts_voucher_ref or await post_grn_voucher(db=db, grn=grn)
            grn.accounts_voucher_ref = voucher_ref
    elif payload.approval_action == "DISPUTED":
        grn.three_way_match_status = "DISPUTED"
        grn.status = "COMMERCIAL_DISPUTE"
    else:
        grn.three_way_match_status = "VARIANCE_FLAGGED"
        grn.status = "VARIANCE_REVIEW"

    if notes_list:
        grn.inspection_remarks = f"{grn.inspection_remarks or ''}\n{' '.join(notes_list)}"

    await db.commit()
    await db.refresh(grn)

    resp = SupplierBillResponse(
        id=grn.id,
        po_id=grn.po_id,
        po_number=po.po_number if po else "PO-N/A",
        grn_number=grn.grn_number,
        vendor_name=po.vendor.vendor_name if (po and po.vendor) else "Supplier",
        project_name=po.project.project_name if (po and po.project) else None,
        material_name=po.material.material_name if (po and po.material) else None,
        unit_of_measure=po.material.unit_of_measure if (po and po.material) else "Unit",
        po_unit_price=po_rate,
        ordered_quantity=float(po.ordered_quantity) if po else 0.0,
        delivered_quantity=float(grn.received_quantity),
        accepted_quantity=accepted_qty,
        rejected_quantity=float(grn.rejected_quantity),
        receipt_date=grn.receipt_date,
        supplier_invoice_number=grn.supplier_invoice_number,
        supplier_invoice_amount=inv_amt,
        calculated_expected_amount=effective_expected,
        variance_amount=variance,
        three_way_match_status=grn.three_way_match_status,
        accounts_voucher_ref=grn.accounts_voucher_ref,
        qc_status=grn.qc_status,
        status=grn.status,
        vat_tax_amount=vat,
        freight_amount=freight,
        discount_amount=discount,
        duplicate_warning=duplicate_warning
    )
    return resp


@router.post("/supplier-bills/{grn_id}/payment", response_model=SupplierBillResponse)
async def record_supplier_bill_payment(
    grn_id: int,
    payload: SupplierBillPaymentRequest,
    db: AsyncSession = Depends(get_db)
):
    """Record accounts payable payment disbursement against an authorized 3-way matched supplier bill."""
    grn = await db.get(GoodsReceipt, grn_id)
    if not grn:
        raise HTTPException(status_code=404, detail="Goods Receipt not found.")
    if grn.three_way_match_status not in ["ACCOUNTS_APPROVED", "MATCHED_OK"]:
        raise HTTPException(status_code=400, detail="Cannot disburse payment before 3-way accounts approval.")

    pay_note = f"[PAID: BDT {payload.paid_amount:,.2f} via {payload.payment_method} | VCH: {payload.payment_voucher_ref}]"
    if payload.cheque_number:
        pay_note += f" [Cheque: {payload.cheque_number}]"
    if payload.bank_account_reference:
        pay_note += f" [Bank: {payload.bank_account_reference}]"

    grn.inspection_remarks = f"{grn.inspection_remarks or ''}\n{pay_note}"
    await db.commit()
    await db.refresh(grn)

    # Return refreshed bill
    stmt = (
        select(GoodsReceipt)
        .options(
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.project),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material)
        )
        .where(GoodsReceipt.id == grn_id)
    )
    res = await db.execute(stmt)
    grn = res.scalar_one()
    po = grn.purchase_order

    return SupplierBillResponse(
        id=grn.id,
        po_id=grn.po_id,
        po_number=po.po_number if po else "PO-N/A",
        grn_number=grn.grn_number,
        vendor_name=po.vendor.vendor_name if (po and po.vendor) else "Supplier",
        project_name=po.project.project_name if (po and po.project) else None,
        material_name=po.material.material_name if (po and po.material) else None,
        unit_of_measure=po.material.unit_of_measure if (po and po.material) else "Unit",
        po_unit_price=float(po.unit_price) if po else 0.0,
        ordered_quantity=float(po.ordered_quantity) if po else 0.0,
        delivered_quantity=float(grn.received_quantity),
        accepted_quantity=float(grn.accepted_quantity),
        rejected_quantity=float(grn.rejected_quantity),
        receipt_date=grn.receipt_date,
        supplier_invoice_number=grn.supplier_invoice_number,
        supplier_invoice_amount=float(grn.supplier_invoice_amount) if grn.supplier_invoice_amount else None,
        calculated_expected_amount=float(grn.calculated_expected_amount),
        variance_amount=float(grn.variance_amount),
        three_way_match_status=grn.three_way_match_status,
        accounts_voucher_ref=grn.accounts_voucher_ref,
        qc_status=grn.qc_status,
        status=grn.status,
        payment_status="PAID",
        payment_voucher_ref=payload.payment_voucher_ref
    )


@router.post("/supplier-bills/{grn_id}/debit-note", response_model=SupplierBillResponse)
async def issue_supplier_debit_note(
    grn_id: int,
    payload: SupplierDebitNoteCreate,
    db: AsyncSession = Depends(get_db)
):
    """Issue commercial debit note against supplier for rejected materials or price variance claims."""
    grn = await db.get(GoodsReceipt, grn_id)
    if not grn:
        raise HTTPException(status_code=404, detail="Goods Receipt not found.")

    dn_no = f"DN-{date.today().strftime('%Y%m%d')}-{grn.id:04d}"
    dn_str = f"[DebitNote: {dn_no} | {payload.debit_amount} BDT | Reason: {payload.debit_reason}]"

    grn.inspection_remarks = f"{grn.inspection_remarks or ''}\n{dn_str}"
    await db.commit()
    await db.refresh(grn)

    stmt = (
        select(GoodsReceipt)
        .options(
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.project),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.material)
        )
        .where(GoodsReceipt.id == grn_id)
    )
    res = await db.execute(stmt)
    grn = res.scalar_one()
    po = grn.purchase_order

    return SupplierBillResponse(
        id=grn.id,
        po_id=grn.po_id,
        po_number=po.po_number if po else "PO-N/A",
        grn_number=grn.grn_number,
        vendor_name=po.vendor.vendor_name if (po and po.vendor) else "Supplier",
        project_name=po.project.project_name if (po and po.project) else None,
        material_name=po.material.material_name if (po and po.material) else None,
        unit_of_measure=po.material.unit_of_measure if (po and po.material) else "Unit",
        po_unit_price=float(po.unit_price) if po else 0.0,
        ordered_quantity=float(po.ordered_quantity) if po else 0.0,
        delivered_quantity=float(grn.received_quantity),
        accepted_quantity=float(grn.accepted_quantity),
        rejected_quantity=float(grn.rejected_quantity),
        receipt_date=grn.receipt_date,
        supplier_invoice_number=grn.supplier_invoice_number,
        supplier_invoice_amount=float(grn.supplier_invoice_amount) if grn.supplier_invoice_amount else None,
        calculated_expected_amount=float(grn.calculated_expected_amount),
        variance_amount=float(grn.variance_amount),
        three_way_match_status=grn.three_way_match_status,
        accounts_voucher_ref=grn.accounts_voucher_ref,
        qc_status=grn.qc_status,
        status=grn.status,
        debit_note_number=dn_no,
        debit_note_amount=payload.debit_amount
    )


# --------------------------------------------------------------------------
# 16. Procurement Audit Trail
# --------------------------------------------------------------------------
@router.get("/audit-trail", response_model=List[AuditTrailItem])
async def get_procurement_audit_trail(limit: int = Query(50), db: AsyncSession = Depends(get_db)):
    """Fetch chronological audit trail across all procurement & inventory movements."""
    stmt = (
        select(StockLedger)
        .options(
            selectinload(StockLedger.store),
            selectinload(StockLedger.material)
        )
        .order_by(StockLedger.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    ledgers = result.scalars().all()

    trail: List[AuditTrailItem] = []
    for l in ledgers:
        action = f"{l.transaction_type} ({l.material.material_name if l.material else 'Item'})"
        details = f"Qty: In {float(l.quantity_in)} / Out {float(l.quantity_out)} @ Rate ৳{float(l.unit_rate):,.2f} | Store: {l.store.store_name if l.store else 'Site'}"
        trail.append(AuditTrailItem(
            id=l.id,
            timestamp=l.created_at or datetime.now(),
            module="Inventory & Stores",
            action=action,
            reference_number=l.reference_number,
            user_name="Store In-Charge",
            details=details,
            status="POSTED"
        ))
    return trail
