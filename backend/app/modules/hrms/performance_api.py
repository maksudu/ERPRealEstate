from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user_optional
from app.modules.auth.models import User
from app.modules.hrms.models import Employee, PerformanceRecord
from app.modules.hrms.schemas import (
    PerformanceRecordCreate,
    PerformanceRecordOut,
    PerformanceRecordPaginatedOut,
    PerformanceRecordUpdate,
    PerformanceTransition,
)


PERFORMANCE_TYPES = {
    "kpi-setup",
    "reviews",
    "cycles",
    "evaluations",
    "self-assessments",
    "training-plans",
    "training-attendance",
    "skill-matrix",
    "promotions",
    "increments",
}

router = APIRouter()


def validate_performance_type(record_type: str) -> None:
    if record_type not in PERFORMANCE_TYPES:
        raise HTTPException(status_code=404, detail="Performance workspace not found")


def resolve_transition(
    current_status: str,
    action: str,
    creator_id: Optional[int],
    actor_id: Optional[int],
) -> str:
    if action == "SUBMIT" and current_status in {"DRAFT", "RETURNED"}:
        return "SUBMITTED"
    if action in {"APPROVE", "REJECT"} and current_status == "SUBMITTED":
        if actor_id is None:
            raise HTTPException(status_code=401, detail="An authenticated approver is required.")
        if creator_id is not None and actor_id == creator_id:
            raise HTTPException(status_code=403, detail="A submitter cannot approve or reject their own record.")
        return "APPROVED" if action == "APPROVE" else "REJECTED"
    if action == "RETURN" and current_status == "SUBMITTED":
        if actor_id is None:
            raise HTTPException(status_code=401, detail="An authenticated reviewer is required.")
        if creator_id is not None and actor_id == creator_id:
            raise HTTPException(status_code=403, detail="A submitter cannot review their own record.")
        return "RETURNED"
    raise HTTPException(status_code=409, detail=f"Cannot {action.lower()} a {current_status.lower()} record.")


def organization_id(current_user: Optional[User]) -> int:
    return current_user.organization_id if current_user and current_user.organization_id else 1


def _record_out(record: PerformanceRecord, employee: Optional[Employee]) -> PerformanceRecordOut:
    return PerformanceRecordOut(
        id=record.id,
        organization_id=record.organization_id,
        record_type=record.record_type,
        reference=record.reference,
        title=record.title,
        employee_id=record.employee_id,
        employee_name=(f"{employee.first_name} {employee.last_name or ''}".strip() if employee else None),
        employee_code=employee.employee_code if employee else None,
        status=record.status,
        fiscal_year=record.fiscal_year,
        period_start=record.period_start,
        period_end=record.period_end,
        due_date=record.due_date,
        score=record.score,
        details=record.details or {},
        created_by_id=record.created_by_id,
        approved_by_id=record.approved_by_id,
        approved_at=record.approved_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


async def _get_record(
    db: AsyncSession, org_id: int, record_type: str, record_id: int, lock: bool = False
) -> tuple[PerformanceRecord, Optional[Employee]]:
    stmt = (
        select(PerformanceRecord, Employee)
        .outerjoin(Employee, and_(
            Employee.id == PerformanceRecord.employee_id,
            Employee.organization_id == PerformanceRecord.organization_id,
        ))
        .where(
            PerformanceRecord.id == record_id,
            PerformanceRecord.organization_id == org_id,
            PerformanceRecord.record_type == record_type,
        )
    )
    if lock:
        stmt = stmt.with_for_update()
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Performance record not found")
    return row[0], row[1]


@router.get("/performance/{record_type}", response_model=PerformanceRecordPaginatedOut)
async def list_performance_records(
    record_type: str,
    search: Optional[str] = Query(None, max_length=120),
    status_value: Optional[str] = Query(None, alias="status", max_length=24),
    fiscal_year: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    employee_id: Optional[int] = Query(None, gt=0),
    department_id: Optional[int] = Query(None, gt=0),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    validate_performance_type(record_type)
    filters = [
        PerformanceRecord.organization_id == organization_id(current_user),
        PerformanceRecord.record_type == record_type,
    ]
    if status_value:
        filters.append(PerformanceRecord.status == status_value.upper())
    if fiscal_year:
        filters.append(PerformanceRecord.fiscal_year == fiscal_year)
    if employee_id:
        filters.append(PerformanceRecord.employee_id == employee_id)
    if department_id:
        filters.append(Employee.department_id == department_id)
    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(or_(
            PerformanceRecord.reference.ilike(term),
            PerformanceRecord.title.ilike(term),
            Employee.first_name.ilike(term),
            Employee.last_name.ilike(term),
            Employee.employee_code.ilike(term),
        ))

    query = select(PerformanceRecord).outerjoin(
        Employee,
        and_(
            Employee.id == PerformanceRecord.employee_id,
            Employee.organization_id == PerformanceRecord.organization_id,
        ),
    ).where(and_(*filters))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()

    rows = await db.execute(
        select(PerformanceRecord, Employee)
        .outerjoin(Employee, and_(
            Employee.id == PerformanceRecord.employee_id,
            Employee.organization_id == PerformanceRecord.organization_id,
        ))
        .where(and_(*filters))
        .order_by(PerformanceRecord.updated_at.desc(), PerformanceRecord.id.desc())
        .limit(limit)
        .offset(offset)
    )
    items = [_record_out(record, employee) for record, employee in rows.all()]
    return PerformanceRecordPaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/performance/{record_type}",
    response_model=PerformanceRecordOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_performance_record(
    record_type: str,
    payload: PerformanceRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    validate_performance_type(record_type)
    org_id = organization_id(current_user)
    if payload.employee_id:
        employee = await db.scalar(select(Employee.id).where(
            Employee.id == payload.employee_id,
            Employee.organization_id == org_id,
        ))
        if employee is None:
            raise HTTPException(status_code=422, detail="Select an employee from your organization.")
    values = payload.model_dump()
    record = PerformanceRecord(
        **values,
        organization_id=org_id,
        record_type=record_type,
        reference=f"PERF-{record_type[:3].upper()}-{uuid4().hex[:12].upper()}",
        status="DRAFT",
        created_by_id=current_user.id if current_user else None,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    employee = await db.get(Employee, record.employee_id) if record.employee_id else None
    return _record_out(record, employee)


@router.get(
    "/performance/{record_type}/{record_id}",
    response_model=PerformanceRecordOut,
)
async def get_performance_record(
    record_type: str,
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    validate_performance_type(record_type)
    record, employee = await _get_record(db, organization_id(current_user), record_type, record_id)
    return _record_out(record, employee)


@router.put(
    "/performance/{record_type}/{record_id}",
    response_model=PerformanceRecordOut,
)
async def update_performance_record(
    record_type: str,
    record_id: int,
    payload: PerformanceRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    validate_performance_type(record_type)
    org_id = organization_id(current_user)
    record, _ = await _get_record(db, org_id, record_type, record_id, lock=True)
    if record.status not in {"DRAFT", "RETURNED"}:
        raise HTTPException(status_code=409, detail="Only draft or returned records can be edited.")
    changes = payload.model_dump(exclude_unset=True)
    merged = {
        "title": record.title,
        "employee_id": record.employee_id,
        "fiscal_year": record.fiscal_year,
        "period_start": record.period_start,
        "period_end": record.period_end,
        "due_date": record.due_date,
        "score": record.score,
        "details": record.details or {},
    }
    merged.update(changes)
    validated = PerformanceRecordCreate.model_validate(merged)
    if validated.employee_id:
        employee = await db.scalar(select(Employee.id).where(
            Employee.id == validated.employee_id,
            Employee.organization_id == org_id,
        ))
        if employee is None:
            raise HTTPException(status_code=422, detail="Select an employee from your organization.")
    for key, value in validated.model_dump().items():
        setattr(record, key, value)
    await db.commit()
    await db.refresh(record)
    employee = await db.get(Employee, record.employee_id) if record.employee_id else None
    return _record_out(record, employee)


@router.delete("/performance/{record_type}/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_performance_record(
    record_type: str,
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    validate_performance_type(record_type)
    record, _ = await _get_record(db, organization_id(current_user), record_type, record_id, lock=True)
    if record.status not in {"DRAFT", "RETURNED"}:
        raise HTTPException(status_code=409, detail="Submitted or decided records cannot be deleted.")
    await db.delete(record)
    await db.commit()


@router.post(
    "/performance/{record_type}/{record_id}/transition",
    response_model=PerformanceRecordOut,
)
async def transition_performance_record(
    record_type: str,
    record_id: int,
    payload: PerformanceTransition,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    validate_performance_type(record_type)
    record, employee = await _get_record(
        db, organization_id(current_user), record_type, record_id, lock=True
    )
    actor_id = current_user.id if current_user else None
    target = resolve_transition(record.status, payload.action, record.created_by_id, actor_id)
    record.status = target
    if payload.action in {"APPROVE", "REJECT", "RETURN"}:
        record.reviewed_by_id = actor_id
        record.reviewed_at = func.now()
        record.review_remarks = payload.remarks
    if payload.action == "APPROVE":
        record.approved_by_id = actor_id
        record.approved_at = func.now()
    await db.commit()
    await db.refresh(record)
    return _record_out(record, employee)
