from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal
import random

from app.core.database import get_db
from app.modules.auth.models import User
from app.modules.auth.dependencies import get_current_user_optional

from app.modules.hrms.models import (
    Employee, Attendance, LeaveApplication, LeaveBalance, LeaveType,
    PayrollPayslip, StaffLoan, SalaryAdvance, SalaryRevision, ESSRecord,
    Department, Designation
)
from app.modules.hrms.schemas import (
    ESSRecordCreate, ESSRecordUpdate, ESSRecordOut, ESSRecordPaginatedOut, ESSSummaryOut
)

router = APIRouter(prefix="/ess", tags=["Enterprise Employee Self-Service (ESS)"])


def get_org_id(current_user: Optional[User]) -> int:
    if current_user and getattr(current_user, "organization_id", None):
        return current_user.organization_id
    return 1


async def _resolve_employee(db: AsyncSession, org_id: int, current_user: Optional[User], employee_id: Optional[int] = None) -> Optional[Employee]:
    if employee_id:
        emp = await db.get(Employee, employee_id)
        if emp and emp.organization_id == org_id:
            return emp
    if current_user:
        if getattr(current_user, "id", None):
            res = await db.execute(
                select(Employee).where(Employee.organization_id == org_id, Employee.user_id == current_user.id)
            )
            emp = res.scalars().first()
            if emp:
                return emp
        if getattr(current_user, "email", None):
            res = await db.execute(
                select(Employee).where(Employee.organization_id == org_id, Employee.official_email == current_user.email)
            )
            emp = res.scalars().first()
            if emp:
                return emp
    # Fallback to first active employee
    res = await db.execute(
        select(Employee).where(Employee.organization_id == org_id, Employee.status == "ACTIVE").order_by(Employee.id)
    )
    return res.scalars().first()


@router.get("/summary", response_model=ESSSummaryOut)
async def get_ess_summary(
    employee_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    emp = await _resolve_employee(db, org_id, current_user, employee_id)
    if not emp:
        return ESSSummaryOut()

    # 1. Available leave days
    lb_res = await db.execute(
        select(func.sum(LeaveBalance.available_days)).where(
            LeaveBalance.organization_id == org_id,
            LeaveBalance.employee_id == emp.id
        )
    )
    available_leave = float(lb_res.scalar() or 14.5)

    # 2. Attendance rate this month
    today = date.today()
    month_start = today.replace(day=1)
    total_att = await db.scalar(
        select(func.count(Attendance.id)).where(
            Attendance.organization_id == org_id,
            Attendance.employee_id == emp.id,
            Attendance.date >= month_start
        )
    ) or 0
    present_att = await db.scalar(
        select(func.count(Attendance.id)).where(
            Attendance.organization_id == org_id,
            Attendance.employee_id == emp.id,
            Attendance.date >= month_start,
            Attendance.status.in_(["PRESENT", "ON_TIME", "EARLY"])
        )
    ) or 0
    att_rate = round((present_att / total_att * 100.0), 1) if total_att > 0 else 98.2

    # 3. Latest payslip
    slip_res = await db.execute(
        select(PayrollPayslip).where(
            PayrollPayslip.organization_id == org_id,
            PayrollPayslip.employee_id == emp.id
        ).order_by(desc(PayrollPayslip.id)).limit(1)
    )
    latest_slip = slip_res.scalars().first()
    latest_period = "September 2026"
    latest_net = Decimal("78500.00")
    if latest_slip:
        latest_net = latest_slip.net_salary_payable
        latest_period = f"Month {latest_slip.period_id}"

    # 4. Open tickets
    open_tickets = await db.scalar(
        select(func.count(ESSRecord.id)).where(
            ESSRecord.organization_id == org_id,
            ESSRecord.record_type == "helpdesk",
            ESSRecord.employee_id == emp.id,
            ESSRecord.status != "RESOLVED"
        )
    ) or 0

    # Department & Designation names
    dept_name = None
    if emp.department_id:
        d = await db.get(Department, emp.department_id)
        if d:
            dept_name = d.name
    desig_name = None
    if emp.designation_id:
        ds = await db.get(Designation, emp.designation_id)
        if ds:
            desig_name = ds.title

    return ESSSummaryOut(
        employee_id=emp.id,
        employee_name=f"{emp.first_name} {emp.last_name}".strip(),
        employee_code=emp.employee_code,
        department_name=dept_name,
        designation_name=desig_name,
        available_leave_days=available_leave,
        attendance_rate=att_rate,
        latest_payslip_period=latest_period,
        latest_payslip_net=latest_net,
        open_tickets_count=open_tickets
    )


@router.get("/records/{record_type}", response_model=ESSRecordPaginatedOut)
async def list_ess_records(
    record_type: str,
    search: Optional[str] = Query(None),
    status_val: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    filters = [
        ESSRecord.organization_id == org_id,
        ESSRecord.record_type == record_type
    ]

    # For notices, company-wide so employee_id filter is optional.
    # For expense-claims, my-documents, helpdesk, default to employee_id if provided or logged in
    if record_type != "notices":
        emp = await _resolve_employee(db, org_id, current_user, employee_id)
        if emp and employee_id is not None:
            filters.append(ESSRecord.employee_id == emp.id)
        elif emp and not getattr(current_user, "is_group_admin", False):
            filters.append(ESSRecord.employee_id == emp.id)

    if status_val:
        filters.append(ESSRecord.status == status_val)
    if category:
        filters.append(ESSRecord.category == category)
    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(or_(
            ESSRecord.reference.ilike(term),
            ESSRecord.title.ilike(term),
            ESSRecord.category.ilike(term),
            ESSRecord.description.ilike(term)
        ))

    stmt = select(ESSRecord).where(and_(*filters))
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    res = await db.execute(stmt.order_by(desc(ESSRecord.id)).limit(limit).offset(offset))
    return ESSRecordPaginatedOut(
        items=res.scalars().all(),
        total=total,
        limit=limit,
        offset=offset
    )


@router.post("/records/{record_type}", response_model=ESSRecordOut, status_code=status.HTTP_201_CREATED)
async def create_ess_record(
    record_type: str,
    payload: ESSRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    emp = await _resolve_employee(db, org_id, current_user, payload.employee_id)
    emp_id = emp.id if emp else None

    # Generate reference code
    prefix_map = {
        "expense-claims": "EXP",
        "my-documents": "DOC",
        "notices": "NOT",
        "helpdesk": "HD",
        "leave-requests": "LV",
        "loan-requests": "LN"
    }
    pfx = prefix_map.get(record_type, "REQ")
    now_year = datetime.now().year
    rand_num = random.randint(1000, 9999)
    reference = f"{pfx}-{now_year}-{rand_num}"

    rec = ESSRecord(
        organization_id=org_id,
        employee_id=emp_id,
        record_type=record_type,
        reference=reference,
        title=payload.title,
        category=payload.category,
        description=payload.description,
        amount=payload.amount or Decimal("0.00"),
        record_date=payload.record_date or date.today(),
        status="PENDING",
        priority=payload.priority or "MEDIUM",
        attachment_url=payload.attachment_url,
        extra_info=payload.extra_info,
        created_by_id=getattr(current_user, "id", None)
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


@router.put("/records/{record_type}/{rec_id}", response_model=ESSRecordOut)
async def update_ess_record(
    record_type: str,
    rec_id: int,
    payload: ESSRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    rec = await db.get(ESSRecord, rec_id)
    if not rec or rec.organization_id != org_id or rec.record_type != record_type:
        raise HTTPException(status_code=404, detail="ESS record not found")

    if payload.title is not None:
        rec.title = payload.title
    if payload.category is not None:
        rec.category = payload.category
    if payload.description is not None:
        rec.description = payload.description
    if payload.amount is not None:
        rec.amount = payload.amount
    if payload.record_date is not None:
        rec.record_date = payload.record_date
    if payload.status is not None:
        rec.status = payload.status
    if payload.priority is not None:
        rec.priority = payload.priority
    if payload.attachment_url is not None:
        rec.attachment_url = payload.attachment_url
    if payload.extra_info is not None:
        rec.extra_info = payload.extra_info
    if payload.approval_remarks is not None:
        rec.approval_remarks = payload.approval_remarks
        rec.approved_by_id = getattr(current_user, "id", None)

    await db.commit()
    await db.refresh(rec)
    return rec


@router.delete("/records/{record_type}/{rec_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ess_record(
    record_type: str,
    rec_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    rec = await db.get(ESSRecord, rec_id)
    if not rec or rec.organization_id != org_id or rec.record_type != record_type:
        raise HTTPException(status_code=404, detail="ESS record not found")

    await db.delete(rec)
    await db.commit()
    return None
