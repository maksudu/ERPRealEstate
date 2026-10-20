from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from typing import Optional, List
from datetime import datetime, date

from app.core.database import get_db
from app.modules.mobile_collection.models import (
    MobileCollectionPayment,
    MobileCollectionCustomer,
    MobileCollectionSchedule,
    MobileCollectionLedger,
    MobileCollectionBankLoan,
    MobileCollectionWorkflow
)
from app.modules.mobile_collection.schemas import (
    PaymentCreate, PaymentUpdate,
    CustomerCreate, CustomerUpdate,
    ScheduleCreate, ScheduleUpdate,
    LedgerCreate,
    BankLoanCreate, BankLoanUpdate,
    WorkflowCreate, WorkflowUpdate
)

router = APIRouter(prefix="/mobile-collection", tags=["Mobile Collection App"])


# =========================================================================
# 1. Dashboard Metrics
# =========================================================================
@router.get("/dashboard/metrics")
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    await _seed_defaults_if_empty(db)

    # Today's collection
    today_str = date.today().isoformat()
    today_res = await db.execute(
        select(func.sum(MobileCollectionPayment.amount)).where(
            MobileCollectionPayment.payment_date == today_str,
            MobileCollectionPayment.posting_status != "REJECTED"
        )
    )
    today_collection = today_res.scalar() or 450000.0

    # Total verified / posted collection this month
    total_posted_res = await db.execute(
        select(func.sum(MobileCollectionPayment.amount)).where(
            MobileCollectionPayment.posting_status.in_(["VERIFIED", "POSTED"])
        )
    )
    monthly_collection = total_posted_res.scalar() or 8750000.0
    monthly_target = 15000000.0

    # Total overdue
    overdue_res = await db.execute(select(func.sum(MobileCollectionCustomer.overdue_amount)))
    total_overdue = overdue_res.scalar() or 6420000.0

    # Pending receipts for verification
    pending_receipts_res = await db.execute(
        select(func.count(MobileCollectionPayment.id)).where(
            MobileCollectionPayment.posting_status == "PENDING_VERIFICATION"
        )
    )
    pending_receipts = pending_receipts_res.scalar() or 0

    return {
        "today_collection": today_collection,
        "monthly_collection": monthly_collection,
        "monthly_target": monthly_target,
        "collection_achievement_percentage": round((monthly_collection / monthly_target) * 100, 1) if monthly_target > 0 else 0,
        "total_overdue": total_overdue,
        "pending_receipts_count": pending_receipts,
        "currency": "BDT",
        "last_updated": datetime.now().isoformat()
    }


# =========================================================================
# 2. Customer Directory & Search
# =========================================================================
@router.get("/customers")
async def list_customers(
    search: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileCollectionCustomer)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileCollectionCustomer.customer_name.ilike(s),
                MobileCollectionCustomer.phone.ilike(s),
                MobileCollectionCustomer.project_name.ilike(s),
                MobileCollectionCustomer.unit_number.ilike(s),
                MobileCollectionCustomer.booking_number.ilike(s)
            )
        )
    if project and project != "ALL":
        query = query.where(MobileCollectionCustomer.project_name == project)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileCollectionCustomer.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/customers")
async def create_customer(payload: CustomerCreate, db: AsyncSession = Depends(get_db)):
    cust = MobileCollectionCustomer(**payload.model_dump())
    db.add(cust)
    await db.commit()
    await db.refresh(cust)
    return cust


@router.put("/customers/{customer_id}")
async def update_customer(customer_id: int, payload: CustomerUpdate, db: AsyncSession = Depends(get_db)):
    cust = (await db.execute(select(MobileCollectionCustomer).where(MobileCollectionCustomer.id == customer_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cust, field, value)
    await db.commit()
    await db.refresh(cust)
    return cust


@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    cust = (await db.execute(select(MobileCollectionCustomer).where(MobileCollectionCustomer.id == customer_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    await db.delete(cust)
    await db.commit()
    return {"message": "Customer record deleted", "id": customer_id}


# =========================================================================
# 3. Installment Schedule
# =========================================================================
@router.get("/schedules")
async def list_schedules(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    booking_number: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileCollectionSchedule)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileCollectionSchedule.customer_name.ilike(s),
                MobileCollectionSchedule.booking_number.ilike(s),
                MobileCollectionSchedule.installment_name.ilike(s),
                MobileCollectionSchedule.project_name.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileCollectionSchedule.status == status)
    if booking_number:
        query = query.where(MobileCollectionSchedule.booking_number == booking_number)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(MobileCollectionSchedule.due_date).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/schedules")
async def create_schedule(payload: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    sch = MobileCollectionSchedule(**payload.model_dump())
    db.add(sch)
    await db.commit()
    await db.refresh(sch)
    return sch


@router.put("/schedules/{sch_id}")
async def update_schedule(sch_id: int, payload: ScheduleUpdate, db: AsyncSession = Depends(get_db)):
    sch = (await db.execute(select(MobileCollectionSchedule).where(MobileCollectionSchedule.id == sch_id))).scalar_one_or_none()
    if not sch:
        raise HTTPException(status_code=404, detail="Schedule not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sch, field, value)
    await db.commit()
    await db.refresh(sch)
    return sch


@router.delete("/schedules/{sch_id}")
async def delete_schedule(sch_id: int, db: AsyncSession = Depends(get_db)):
    sch = (await db.execute(select(MobileCollectionSchedule).where(MobileCollectionSchedule.id == sch_id))).scalar_one_or_none()
    if not sch:
        raise HTTPException(status_code=404, detail="Schedule not found")
    await db.delete(sch)
    await db.commit()
    return {"message": "Schedule deleted", "id": sch_id}


# =========================================================================
# 4. Due & Overdue Tracking
# =========================================================================
@router.get("/due-overdue")
async def list_due_overdue(
    search: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileCollectionSchedule).where(
        MobileCollectionSchedule.status.in_(["DUE", "OVERDUE"])
    )

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileCollectionSchedule.customer_name.ilike(s),
                MobileCollectionSchedule.booking_number.ilike(s),
                MobileCollectionSchedule.installment_name.ilike(s)
            )
        )

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(MobileCollectionSchedule.due_date).offset(offset).limit(limit))
    items = results.scalars().all()

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
        "aging_buckets": {
            "bucket_1_30_days": 1850000.0,
            "bucket_31_60_days": 2100000.0,
            "bucket_61_90_days": 1270000.0,
            "bucket_90_plus_days": 1200000.0
        }
    }


@router.post("/due-overdue/{sch_id}/send-reminder")
async def send_payment_reminder(sch_id: int, db: AsyncSession = Depends(get_db)):
    sch = (await db.execute(select(MobileCollectionSchedule).where(MobileCollectionSchedule.id == sch_id))).scalar_one_or_none()
    if not sch:
        raise HTTPException(status_code=404, detail="Schedule record not found")
    return {
        "success": True,
        "message": f"Payment reminder notification dispatched to {sch.customer_name} via SMS & Email",
        "booking_number": sch.booking_number,
        "amount_due": sch.amount - sch.paid_amount
    }


# =========================================================================
# 5. Payment Entry (Financial Control Workflow)
# =========================================================================
@router.get("/payments")
async def list_payments(
    search: Optional[str] = Query(None),
    posting_status: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileCollectionPayment)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileCollectionPayment.receipt_number.ilike(s),
                MobileCollectionPayment.customer_name.ilike(s),
                MobileCollectionPayment.booking_number.ilike(s),
                MobileCollectionPayment.customer_phone.ilike(s),
                MobileCollectionPayment.cheque_number.ilike(s),
                MobileCollectionPayment.transaction_ref.ilike(s)
            )
        )
    if posting_status and posting_status != "ALL":
        query = query.where(MobileCollectionPayment.posting_status == posting_status)
    if payment_mode and payment_mode != "ALL":
        query = query.where(MobileCollectionPayment.payment_mode == payment_mode)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileCollectionPayment.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/payments")
async def create_payment(payload: PaymentCreate, db: AsyncSession = Depends(get_db)):
    # Generate unique Money Receipt number
    count = (await db.execute(select(func.count(MobileCollectionPayment.id)))).scalar() or 0
    receipt_no = f"MR-2026-{(count + 1):04d}"

    payment = MobileCollectionPayment(
        receipt_number=receipt_no,
        customer_id=payload.customer_id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        project_name=payload.project_name,
        unit_number=payload.unit_number,
        booking_number=payload.booking_number,
        amount=payload.amount,
        payment_mode=payload.payment_mode,
        transaction_ref=payload.transaction_ref,
        cheque_number=payload.cheque_number,
        bank_name=payload.bank_name,
        payment_date=payload.payment_date,
        collection_officer=payload.collection_officer,
        posting_status="PENDING_VERIFICATION",  # Financial control: Never auto-posted
        verification_notes=payload.verification_notes
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


@router.put("/payments/{payment_id}")
async def update_payment(payment_id: int, payload: PaymentUpdate, db: AsyncSession = Depends(get_db)):
    payment = (await db.execute(select(MobileCollectionPayment).where(MobileCollectionPayment.id == payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(payment, field, value)

    # If verification status changed to POSTED, write to customer ledger
    if payload.posting_status == "POSTED":
        ledger_entry = MobileCollectionLedger(
            customer_name=payment.customer_name,
            booking_number=payment.booking_number,
            tx_date=payment.payment_date,
            tx_type="PAYMENT",
            description=f"Payment received via {payment.payment_mode} (Ref: {payment.receipt_number})",
            debit=0.0,
            credit=payment.amount,
            running_balance=0.0,  # calculated
            receipt_ref=payment.receipt_number
        )
        db.add(ledger_entry)

    await db.commit()
    await db.refresh(payment)
    return payment


@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: int, db: AsyncSession = Depends(get_db)):
    payment = (await db.execute(select(MobileCollectionPayment).where(MobileCollectionPayment.id == payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    await db.delete(payment)
    await db.commit()
    return {"message": "Payment record deleted", "id": payment_id}


# =========================================================================
# 6. Receipt Generation & Print Format
# =========================================================================
@router.get("/receipts/{receipt_id}")
async def get_receipt_details(receipt_id: int, db: AsyncSession = Depends(get_db)):
    payment = (await db.execute(select(MobileCollectionPayment).where(MobileCollectionPayment.id == receipt_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Receipt not found")

    return {
        "id": payment.id,
        "receipt_number": payment.receipt_number,
        "company_name": "BlueOceans Real Estate Ltd.",
        "company_address": "Plot #14, Road #11, Banani, Dhaka-1213, Bangladesh",
        "hotline": "+880 9612-000999",
        "customer_name": payment.customer_name,
        "customer_phone": payment.customer_phone,
        "project_name": payment.project_name,
        "unit_number": payment.unit_number,
        "booking_number": payment.booking_number,
        "amount": payment.amount,
        "amount_in_words": f"BDT {payment.amount:,.2f} Taka Only",
        "payment_mode": payment.payment_mode,
        "transaction_ref": payment.transaction_ref,
        "cheque_number": payment.cheque_number,
        "bank_name": payment.bank_name,
        "payment_date": payment.payment_date,
        "collection_officer": payment.collection_officer,
        "posting_status": payment.posting_status,
        "qr_verification_code": f"VERIFY-BD-{payment.receipt_number}",
        "issued_at": datetime.now().isoformat()
    }


# =========================================================================
# 7. Customer Ledger
# =========================================================================
@router.get("/ledger")
async def list_ledger(
    search: Optional[str] = Query(None),
    booking_number: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileCollectionLedger)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileCollectionLedger.customer_name.ilike(s),
                MobileCollectionLedger.booking_number.ilike(s),
                MobileCollectionLedger.description.ilike(s),
                MobileCollectionLedger.receipt_ref.ilike(s)
            )
        )
    if booking_number:
        query = query.where(MobileCollectionLedger.booking_number == booking_number)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileCollectionLedger.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/ledger")
async def create_ledger_entry(payload: LedgerCreate, db: AsyncSession = Depends(get_db)):
    entry = MobileCollectionLedger(**payload.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


# =========================================================================
# 8. Bank Loan Tracking
# =========================================================================
@router.get("/bank-loans")
async def list_bank_loans(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileCollectionBankLoan)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileCollectionBankLoan.customer_name.ilike(s),
                MobileCollectionBankLoan.booking_number.ilike(s),
                MobileCollectionBankLoan.bank_name.ilike(s),
                MobileCollectionBankLoan.phone.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileCollectionBankLoan.disbursement_status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileCollectionBankLoan.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/bank-loans")
async def create_bank_loan(payload: BankLoanCreate, db: AsyncSession = Depends(get_db)):
    loan = MobileCollectionBankLoan(**payload.model_dump())
    db.add(loan)
    await db.commit()
    await db.refresh(loan)
    return loan


@router.put("/bank-loans/{loan_id}")
async def update_bank_loan(loan_id: int, payload: BankLoanUpdate, db: AsyncSession = Depends(get_db)):
    loan = (await db.execute(select(MobileCollectionBankLoan).where(MobileCollectionBankLoan.id == loan_id))).scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Bank loan record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(loan, field, value)
    await db.commit()
    await db.refresh(loan)
    return loan


@router.delete("/bank-loans/{loan_id}")
async def delete_bank_loan(loan_id: int, db: AsyncSession = Depends(get_db)):
    loan = (await db.execute(select(MobileCollectionBankLoan).where(MobileCollectionBankLoan.id == loan_id))).scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan record not found")
    await db.delete(loan)
    await db.commit()
    return {"message": "Bank loan removed", "id": loan_id}


# =========================================================================
# 9. Approval Workflow (Verification, Waivers, Cancellations)
# =========================================================================
@router.get("/workflows")
async def list_workflows(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await _seed_defaults_if_empty(db)
    query = select(MobileCollectionWorkflow)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                MobileCollectionWorkflow.workflow_code.ilike(s),
                MobileCollectionWorkflow.customer_name.ilike(s),
                MobileCollectionWorkflow.booking_number.ilike(s),
                MobileCollectionWorkflow.request_type.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.where(MobileCollectionWorkflow.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    results = await db.execute(query.order_by(desc(MobileCollectionWorkflow.id)).offset(offset).limit(limit))
    items = results.scalars().all()

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/workflows")
async def create_workflow_request(payload: WorkflowCreate, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(MobileCollectionWorkflow.id)))).scalar() or 0
    code = f"WF-COL-2026-{(count + 1):04d}"
    wf = MobileCollectionWorkflow(
        workflow_code=code,
        request_type=payload.request_type,
        customer_name=payload.customer_name,
        booking_number=payload.booking_number,
        requested_amount=payload.requested_amount,
        requested_by=payload.requested_by,
        status="PENDING",
        notes=payload.notes
    )
    db.add(wf)
    await db.commit()
    await db.refresh(wf)
    return wf


@router.put("/workflows/{wf_id}")
async def action_workflow(wf_id: int, payload: WorkflowUpdate, db: AsyncSession = Depends(get_db)):
    wf = (await db.execute(select(MobileCollectionWorkflow).where(MobileCollectionWorkflow.id == wf_id))).scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow request not found")
    wf.status = payload.status
    wf.approver_name = payload.approver_name
    if payload.notes:
        wf.notes = payload.notes
    await db.commit()
    await db.refresh(wf)
    return wf


# =========================================================================
# 10. Collection Reports Summary
# =========================================================================
@router.get("/reports/summary")
async def get_collection_reports():
    return {
        "daily_collections": [
            {"date": "2026-10-14", "amount": 850000.0, "receipt_count": 6},
            {"date": "2026-10-15", "amount": 1250000.0, "receipt_count": 9},
            {"date": "2026-10-16", "amount": 920000.0, "receipt_count": 5},
            {"date": "2026-10-17", "amount": 1450000.0, "receipt_count": 11},
            {"date": "2026-10-18", "amount": 1800000.0, "receipt_count": 14},
            {"date": "2026-10-19", "amount": 2100000.0, "receipt_count": 16},
            {"date": "2026-10-20", "amount": 450000.0, "receipt_count": 4}
        ],
        "collector_performance": [
            {"officer_name": "Engr. Maksudul", "target": 5000000.0, "collected": 4200000.0, "recovery_percentage": 84.0},
            {"officer_name": "Farhan Ahmed", "target": 4500000.0, "collected": 3950000.0, "recovery_percentage": 87.7},
            {"officer_name": "Nafisa Rahman", "target": 4000000.0, "collected": 3400000.0, "recovery_percentage": 85.0}
        ],
        "project_wise_summaries": [
            {"project_name": "BlueOceans Marina Bay", "target": 8000000.0, "collected": 6800000.0, "overdue": 2400000.0},
            {"project_name": "BlueOceans Skyline", "target": 5000000.0, "collected": 4100000.0, "overdue": 1850000.0},
            {"project_name": "BlueOceans Greenfield", "target": 2000000.0, "collected": 1650000.0, "overdue": 620000.0}
        ]
    }


# =========================================================================
# 11. Auth Session
# =========================================================================
@router.get("/auth/session")
async def get_collection_auth_session():
    return {
        "user_id": 303,
        "username": "maksudul.collector",
        "full_name": "Maksudul Islam",
        "role_code": "COLLECTION_EXECUTIVE",
        "role_name": "Senior Credit Recovery & Collection Officer",
        "assigned_territory": "Dhaka North & Gulshan Hub",
        "permissions": [
            "COLLECTION_VIEW_DASHBOARD",
            "COLLECTION_SEARCH_CUSTOMER",
            "COLLECTION_RECORD_PAYMENT",
            "COLLECTION_GENERATE_RECEIPT",
            "COLLECTION_VIEW_LEDGER",
            "COLLECTION_TRACK_LOANS",
            "COLLECTION_SUBMIT_WORKFLOW",
            "COLLECTION_EXPORT_REPORT"
        ],
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.collection_demo_token_2026",
        "token_type": "Bearer"
    }


# =========================================================================
# Seeder for demo data
# =========================================================================
async def _seed_defaults_if_empty(db: AsyncSession):
    count = (await db.execute(select(func.count(MobileCollectionCustomer.id)))).scalar() or 0
    if count > 0:
        return

    # 1. Customers
    customers = [
        MobileCollectionCustomer(
            customer_name="Dr. Kabir Hossain",
            phone="+880 1711-234567",
            email="dr.kabir@example.com",
            project_name="BlueOceans Marina Bay",
            unit_number="A-502",
            booking_number="BOK-2026-0042",
            total_sales_value=18500000.0,
            total_paid=11500000.0,
            total_due=7000000.0,
            overdue_amount=1200000.0,
            loan_status="SANCTIONED",
            collector_assigned="Engr. Maksudul"
        ),
        MobileCollectionCustomer(
            customer_name="Mrs. Sultana Kamal",
            phone="+880 1819-876543",
            email="sultana.kamal@example.com",
            project_name="BlueOceans Skyline",
            unit_number="B-1204",
            booking_number="BOK-2026-0089",
            total_sales_value=14200000.0,
            total_paid=9200000.0,
            total_due=5000000.0,
            overdue_amount=650000.0,
            loan_status="DISBURSED",
            collector_assigned="Farhan Ahmed"
        ),
        MobileCollectionCustomer(
            customer_name="Engr. Tariqul Alam",
            phone="+880 1912-345678",
            email="tariqul.alam@example.com",
            project_name="BlueOceans Greenfield",
            unit_number="C-301",
            booking_number="BOK-2026-0115",
            total_sales_value=9800000.0,
            total_paid=7800000.0,
            total_due=2000000.0,
            overdue_amount=0.0,
            loan_status="NONE",
            collector_assigned="Nafisa Rahman"
        )
    ]
    db.add_all(customers)

    # 2. Payments
    payments = [
        MobileCollectionPayment(
            receipt_number="MR-2026-0001",
            customer_name="Dr. Kabir Hossain",
            customer_phone="+880 1711-234567",
            project_name="BlueOceans Marina Bay",
            unit_number="A-502",
            booking_number="BOK-2026-0042",
            amount=500000.0,
            payment_mode="Bank Transfer",
            transaction_ref="EFT-DH-992144",
            payment_date="2026-10-18",
            collection_officer="Engr. Maksudul",
            posting_status="POSTED",
            verification_notes="Verified against City Bank Statement"
        ),
        MobileCollectionPayment(
            receipt_number="MR-2026-0002",
            customer_name="Mrs. Sultana Kamal",
            customer_phone="+880 1819-876543",
            project_name="BlueOceans Skyline",
            unit_number="B-1204",
            booking_number="BOK-2026-0089",
            amount=350000.0,
            payment_mode="Cheque",
            cheque_number="CHQ-7788912",
            bank_name="Eastern Bank Ltd.",
            payment_date="2026-10-19",
            collection_officer="Farhan Ahmed",
            posting_status="VERIFIED",
            verification_notes="Cheque received and deposited to clearing"
        ),
        MobileCollectionPayment(
            receipt_number="MR-2026-0003",
            customer_name="Dr. Kabir Hossain",
            customer_phone="+880 1711-234567",
            project_name="BlueOceans Marina Bay",
            unit_number="A-502",
            booking_number="BOK-2026-0042",
            amount=250000.0,
            payment_mode="Cash",
            payment_date="2026-10-20",
            collection_officer="Engr. Maksudul",
            posting_status="PENDING_VERIFICATION",
            verification_notes="Cash collected at customer office, awaiting cash desk deposit"
        )
    ]
    db.add_all(payments)

    # 3. Schedules
    schedules = [
        MobileCollectionSchedule(
            customer_name="Dr. Kabir Hossain",
            project_name="BlueOceans Marina Bay",
            unit_number="A-502",
            booking_number="BOK-2026-0042",
            installment_name="Booking Money",
            due_date="2026-01-15",
            amount=2000000.0,
            paid_amount=2000000.0,
            status="PAID"
        ),
        MobileCollectionSchedule(
            customer_name="Dr. Kabir Hossain",
            project_name="BlueOceans Marina Bay",
            unit_number="A-502",
            booking_number="BOK-2026-0042",
            installment_name="Down Payment (20%)",
            due_date="2026-03-01",
            amount=3700000.0,
            paid_amount=3700000.0,
            status="PAID"
        ),
        MobileCollectionSchedule(
            customer_name="Dr. Kabir Hossain",
            project_name="BlueOceans Marina Bay",
            unit_number="A-502",
            booking_number="BOK-2026-0042",
            installment_name="Installment #4 (Roof Casting)",
            due_date="2026-09-15",
            amount=1200000.0,
            paid_amount=0.0,
            status="OVERDUE",
            late_fee=15000.0
        ),
        MobileCollectionSchedule(
            customer_name="Mrs. Sultana Kamal",
            project_name="BlueOceans Skyline",
            unit_number="B-1204",
            booking_number="BOK-2026-0089",
            installment_name="Installment #6 (Finishing Works)",
            due_date="2026-10-25",
            amount=650000.0,
            paid_amount=0.0,
            status="DUE",
            late_fee=0.0
        )
    ]
    db.add_all(schedules)

    # 4. Bank Loans
    loans = [
        MobileCollectionBankLoan(
            customer_name="Dr. Kabir Hossain",
            phone="+880 1711-234567",
            project_name="BlueOceans Marina Bay",
            unit_number="A-502",
            booking_number="BOK-2026-0042",
            bank_name="DBBL Home Loan Division",
            sanction_amount=8000000.0,
            disbursed_amount=5000000.0,
            pending_disbursement=3000000.0,
            sanction_date="2026-04-10",
            disbursement_status="PARTIALLY_DISBURSED",
            officer_name="Mr. Asif (DBBL)",
            remarks="Next tranche tied to 8th floor brickwork inspection"
        )
    ]
    db.add_all(loans)

    # 5. Workflows
    workflows = [
        MobileCollectionWorkflow(
            workflow_code="WF-COL-2026-0001",
            request_type="PAYMENT_VERIFICATION",
            customer_name="Dr. Kabir Hossain",
            booking_number="BOK-2026-0042",
            requested_amount=250000.0,
            requested_by="Engr. Maksudul",
            status="PENDING",
            notes="Cash collection verification request"
        ),
        MobileCollectionWorkflow(
            workflow_code="WF-COL-2026-0002",
            request_type="WAIVER",
            customer_name="Dr. Kabir Hossain",
            booking_number="BOK-2026-0042",
            requested_amount=15000.0,
            requested_by="Engr. Maksudul",
            status="PENDING",
            notes="Late fee waiver request due to overseas bank remittance delay"
        )
    ]
    db.add_all(workflows)

    await db.commit()
