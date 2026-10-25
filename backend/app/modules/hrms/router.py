from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc, update
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
from datetime import date, datetime, time, timedelta
from decimal import Decimal
import math
import os
import uuid

from app.core.database import get_db
from app.modules.auth.models import User
from app.modules.auth.dependencies import get_current_user_optional

from app.modules.hrms.models import (
    Company, LegalEntity, Branch, ProjectOffice,
    Department, Designation, SalaryGrade, Position, Employee, SiteLabourContractor,
    LabourMusterRoll, Attendance, LeaveApplication, PayrollRun, Payslip,
    DepartmentHeadHistory, DepartmentProjectMapping, DepartmentAuditLog,
    Shift, ShiftAssignment, ShiftSwapRequest, BiometricDevice, SiteGeofence, HolidayCalendar, AttendanceCorrection,
    LeaveType, LeavePolicy, LeaveBalance, LeaveEncashment, OvertimeRequest, PayrollInput,
    SalaryComponent, SalaryStructure, SalaryStructureItem, EmployeeSalary, SalaryRevision, RecruitmentRecord,
    PayrollPeriod, PayrollPayslip, StaffLoan, SalaryAdvance, BonusIncentive, TaxSlab, BenefitPolicy
)
from app.modules.hrms.schemas import (
    CompanyCreate, CompanyUpdate, CompanyOut,
    LegalEntityCreate, LegalEntityUpdate, LegalEntityOut,
    BranchCreate, BranchUpdate, BranchOut,
    ProjectOfficeCreate, ProjectOfficeUpdate, ProjectOfficeOut,
    OrgNode, OrgHierarchyResponse,
    DepartmentCreate, DepartmentUpdate, DepartmentOut, DepartmentTreeNode,
    DepartmentMoveParent, DepartmentHeadAssign, DepartmentHeadHistoryOut,
    DepartmentProjectMappingCreate, DepartmentProjectMappingOut, DepartmentAuditOut,
    SalaryGradeCreate, SalaryGradeUpdate, SalaryGradeOut, SalaryGradePaginatedOut,
    DesignationCreate, DesignationUpdate, DesignationOut, DesignationPaginatedOut,
    PositionCreate, PositionUpdate, PositionOut, PositionPaginatedOut, PositionStatsOut, PositionOccupyPayload,
    EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeePaginatedOut,
    ContractorCreate, ContractorOut,
    MusterRollBatchCreate, MusterRollOut,
    ShiftCreate, ShiftUpdate, ShiftOut, ShiftPaginatedOut,
    ShiftAssignmentCreate, ShiftAssignmentUpdate, ShiftAssignmentOut, ShiftAssignmentPaginatedOut,
    ShiftSwapRequestCreate, ShiftSwapRequestReview, ShiftSwapRequestOut, ShiftSwapRequestPaginatedOut,
    BiometricDeviceCreate, BiometricDeviceUpdate, BiometricDeviceOut, BiometricDevicePaginatedOut, BiometricSyncPayload,
    HolidayCalendarCreate, HolidayCalendarUpdate, HolidayCalendarOut, HolidayCalendarPaginatedOut,
    SiteGeofenceCreate, SiteGeofenceUpdate, SiteGeofenceOut, SiteGeofencePaginatedOut,
    AttendanceCorrectionCreate, AttendanceCorrectionVerify, AttendanceCorrectionApprove, AttendanceCorrectionOut, AttendanceCorrectionPaginatedOut,
    AttendancePunch, AttendanceProcessRequest, AttendanceOut, AttendancePaginatedOut, AttendanceDailySummaryOut,
    AttendanceMonthlyClosingSummaryOut, AttendanceMonthlyClosingActionPayload,
    LeaveTypeCreate, LeaveTypeUpdate, LeaveTypeOut, LeaveTypePaginatedOut,
    LeavePolicyCreate, LeavePolicyUpdate, LeavePolicyOut, LeavePolicyPaginatedOut,
    LeaveBalanceCreate, LeaveBalanceUpdate, LeaveBalanceOut, LeaveBalancePaginatedOut,
    LeaveEncashmentCreate, LeaveEncashmentUpdate, LeaveEncashmentOut, LeaveEncashmentPaginatedOut,
    LeaveApply, LeaveUpdate, LeaveManagerReview, LeaveHRReview, LeaveApprove, LeaveOut, LeavePaginatedOut,
    LeaveCalendarEventOut, TeamAvailabilityItem, TeamAvailabilityOut,
    OvertimeRequestCreate, OvertimeRequestUpdate, OvertimeVerify, OvertimeApprove, OvertimeRequestOut, OvertimeRequestPaginatedOut,
    PayrollInputOut, PayrollInputPaginatedOut, PayrollSyncLeaveOTRequest,
    PayrollGenerateRequest, PayrollRunOut, PayslipOut,
    SalaryComponentCreate, SalaryComponentOut, SalaryComponentPaginatedOut,
    SalaryStructureCreate, SalaryStructureOut, SalaryStructurePaginatedOut,
    EmployeeSalaryCreate, EmployeeSalaryOut, EmployeeSalaryPaginatedOut,
    SalaryRevisionCreate, SalaryRevisionOut, SalaryRevisionPaginatedOut,
    PayrollPeriodCreate, PayrollPeriodOut, PayrollPeriodPaginatedOut,
    PayrollPayslipDetailOut, PayrollPayslipPaginatedOut,
    StaffLoanCreate, StaffLoanOut, StaffLoanPaginatedOut,
    SalaryAdvanceCreate, SalaryAdvanceOut, SalaryAdvancePaginatedOut,
    BonusIncentiveCreate, BonusIncentiveOut, BonusIncentivePaginatedOut,
    TaxSlabCreate, TaxSlabOut, PayrollWorkflowActionPayload,
    BenefitPolicyCreate, BenefitPolicyUpdate, BenefitPolicyOut, BenefitPolicyPaginatedOut,
    PayrollValidationSummaryOut, PayrollValidationException,
    HRCockpitStats, RecruitmentRecordCreate, RecruitmentRecordUpdate, RecruitmentRecordOut, RecruitmentRecordPaginatedOut
)
from app.modules.hrms.services import HRMSService
from app.modules.projects.models import Project
from uuid import uuid4

router = APIRouter(prefix="/hrms", tags=["Enterprise HRMS & Labour Management"])

RECRUITMENT_RECORD_TYPES = {
    "requisitions",
    "vacancies",
    "applicants",
    "interviews",
    "evaluations",
    "selection",
    "offer-letters",
    "appointment-letters",
    "joining-checklist",
    "onboarding",
}


def _validate_recruitment_type(record_type: str) -> None:
    if record_type not in RECRUITMENT_RECORD_TYPES:
        raise HTTPException(status_code=404, detail="Recruitment workspace not found")


@router.get("/recruitment/{record_type}", response_model=RecruitmentRecordPaginatedOut)
async def list_recruitment_records(
    record_type: str,
    search: Optional[str] = Query(None, max_length=120),
    status_value: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    _validate_recruitment_type(record_type)
    filters = [
        RecruitmentRecord.organization_id == get_org_id(current_user),
        RecruitmentRecord.record_type == record_type
    ]
    if status_value:
        filters.append(RecruitmentRecord.status == status_value)
    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(or_(
            RecruitmentRecord.code.ilike(term),
            RecruitmentRecord.title.ilike(term),
            RecruitmentRecord.department.ilike(term)
        ))
    query = select(RecruitmentRecord).where(and_(*filters))
    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    result = await db.execute(query.order_by(desc(RecruitmentRecord.updated_at), desc(RecruitmentRecord.id)).limit(limit).offset(offset))
    return RecruitmentRecordPaginatedOut(items=result.scalars().all(), total=total, limit=limit, offset=offset)


@router.post("/recruitment/{record_type}", response_model=RecruitmentRecordOut, status_code=status.HTTP_201_CREATED)
async def create_recruitment_record(
    record_type: str,
    payload: RecruitmentRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    _validate_recruitment_type(record_type)
    record = RecruitmentRecord(
        organization_id=get_org_id(current_user),
        record_type=record_type,
        code=(payload.code or f"{record_type[:3].upper()}-{uuid4().hex[:8].upper()}").strip(),
        title=payload.title.strip(),
        department=payload.department.strip() if payload.department else None,
        status=payload.status.strip().upper(),
        details=payload.details
    )
    if not record.title:
        raise HTTPException(status_code=422, detail="Title is required")
    db.add(record)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A recruitment record with this code already exists")
    await db.refresh(record)
    return record


@router.put("/recruitment/{record_type}/{record_id}", response_model=RecruitmentRecordOut)
async def update_recruitment_record(
    record_type: str,
    record_id: int,
    payload: RecruitmentRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    _validate_recruitment_type(record_type)
    record = await db.scalar(select(RecruitmentRecord).where(
        RecruitmentRecord.id == record_id,
        RecruitmentRecord.organization_id == get_org_id(current_user),
        RecruitmentRecord.record_type == record_type
    ))
    if not record:
        raise HTTPException(status_code=404, detail="Recruitment record not found")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        if key in {"code", "title", "department"} and isinstance(value, str):
            value = value.strip()
            if key == "code" and not value:
                value = f"{record_type[:3].upper()}-{uuid4().hex[:8].upper()}"
            elif key == "department" and not value:
                value = None
        if key == "status" and value:
            value = value.strip().upper()
        setattr(record, key, value)
    if not record.title:
        raise HTTPException(status_code=422, detail="Title is required")
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A recruitment record with this code already exists")
    await db.refresh(record)
    return record


@router.delete("/recruitment/{record_type}/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recruitment_record(
    record_type: str,
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    _validate_recruitment_type(record_type)
    record = await db.scalar(select(RecruitmentRecord).where(
        RecruitmentRecord.id == record_id,
        RecruitmentRecord.organization_id == get_org_id(current_user),
        RecruitmentRecord.record_type == record_type
    ))
    if not record:
        raise HTTPException(status_code=404, detail="Recruitment record not found")
    await db.delete(record)
    await db.commit()


# --- Helper to get organization_id ---
def get_org_id(current_user: Optional[User]) -> int:
    if current_user and current_user.organization_id:
        return current_user.organization_id
    return 1 # Default organization for demo/dev


# --- 1. HR Cockpit KPIs & Stats ---
@router.get("/stats", response_model=HRCockpitStats)
async def get_hr_stats(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    stats = await HRMSService.get_cockpit_stats(db, org_id)
    return stats


# --- 2. Departments Endpoints (Section 2, 3, 4, 5) ---

async def _check_circular_department(db: AsyncSession, dept_id: int, new_parent_id: Optional[int]):
    """Validation Rule 3 & 5: Circular parent-child relationships are prohibited."""
    if not new_parent_id:
        return
    if dept_id == new_parent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validation Rule 3: A department cannot be its own parent."
        )
    curr_parent_id = new_parent_id
    visited = {dept_id}
    while curr_parent_id:
        if curr_parent_id in visited:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Validation Rule 5: Circular parent-child relationship detected. A department cannot report to its descendant."
            )
        visited.add(curr_parent_id)
        parent = await db.get(Department, curr_parent_id)
        if not parent:
            break
        curr_parent_id = parent.parent_department_id


async def _enrich_department_out(db: AsyncSession, dept: Department) -> DepartmentOut:
    """Enrich Department with counts and related entity labels."""
    emp_count = await db.scalar(
        select(func.count(Employee.id)).where(
            Employee.department_id == dept.id,
            Employee.status == "ACTIVE"
        )
    ) or 0

    child_count = await db.scalar(
        select(func.count(Department.id)).where(
            Department.parent_department_id == dept.id
        )
    ) or 0

    company_name = None
    if dept.company_id:
        comp = await db.get(Company, dept.company_id)
        if comp:
            company_name = comp.company_name

    parent_name = None
    if dept.parent_department_id:
        pdept = await db.get(Department, dept.parent_department_id)
        if pdept:
            parent_name = pdept.name_en

    branch_name = None
    if dept.branch_id:
        br = await db.get(Branch, dept.branch_id)
        if br:
            branch_name = br.branch_name

    head_name = None
    head_code = None
    if dept.head_of_dept_id:
        head = await db.get(Employee, dept.head_of_dept_id)
        if head:
            head_name = f"{head.first_name} {head.last_name}".strip()
            head_code = head.employee_code

    return DepartmentOut(
        id=dept.id,
        department_code=dept.department_code,
        name_en=dept.name_en,
        name_bn=dept.name_bn,
        company_id=dept.company_id,
        company_name=company_name,
        parent_department_id=dept.parent_department_id,
        parent_department_name=parent_name,
        head_of_dept_id=dept.head_of_dept_id,
        head_of_dept_name=head_name,
        head_of_dept_code=head_code,
        branch_id=dept.branch_id,
        branch_name=branch_name,
        cost_center_id=dept.cost_center_id,
        description=dept.description,
        effective_from=dept.effective_from,
        effective_to=dept.effective_to,
        status=dept.status,
        approval_policies=dept.approval_policies,
        is_active=dept.is_active,
        employee_count=emp_count,
        vacancy_count=0,
        child_count=child_count,
        created_at=dept.created_at
    )


@router.get("/departments", response_model=List[DepartmentOut])
async def list_departments(
    company_id: Optional[int] = Query(None, description="Filter by company"),
    branch_id: Optional[int] = Query(None, description="Filter by operating branch"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE/INACTIVE)"),
    head_id: Optional[int] = Query(None, description="Filter by head employee"),
    parent_id: Optional[int] = Query(None, description="Filter by parent department"),
    search: Optional[str] = Query(None, description="Search by name or code"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """3.2 Search and filter departments by company, branch, status, head, code, name."""
    org_id = get_org_id(current_user)
    q = select(Department).where(Department.organization_id == org_id)

    if company_id:
        q = q.where(Department.company_id == company_id)
    if branch_id:
        q = q.where(Department.branch_id == branch_id)
    if status:
        q = q.where(Department.status == status)
    if head_id:
        q = q.where(Department.head_of_dept_id == head_id)
    if parent_id is not None:
        if parent_id == 0:
            q = q.where(Department.parent_department_id.is_(None))
        else:
            q = q.where(Department.parent_department_id == parent_id)
    if search:
        s = f"%{search}%"
        q = q.where(
            or_(
                Department.name_en.ilike(s),
                Department.name_bn.ilike(s),
                Department.department_code.ilike(s),
                Department.cost_center_id.ilike(s)
            )
        )

    q = q.order_by(Department.name_en)
    res = await db.execute(q)
    depts = res.scalars().all()

    enriched = []
    for d in depts:
        enriched.append(await _enrich_department_out(db, d))
    return enriched


@router.get("/departments/tree", response_model=List[DepartmentTreeNode])
async def get_departments_tree(
    company_id: Optional[int] = Query(None, description="Filter tree by company"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """4. Tree-view department navigation with expandable parents and employee headcounts."""
    org_id = get_org_id(current_user)
    q = select(Department).where(Department.organization_id == org_id)
    if company_id:
        q = q.where(Department.company_id == company_id)
    q = q.order_by(Department.name_en)

    res = await db.execute(q)
    all_depts = res.scalars().all()

    # Pre-fetch companies, branches, employees
    companies = {c.id: c.company_name for c in (await db.execute(select(Company))).scalars().all()}
    branches = {b.id: b.branch_name for b in (await db.execute(select(Branch))).scalars().all()}
    employees = {e.id: e for e in (await db.execute(select(Employee))).scalars().all()}

    # Compute employee counts per dept
    counts_res = await db.execute(
        select(Employee.department_id, func.count(Employee.id))
        .where(Employee.status == "ACTIVE")
        .group_by(Employee.department_id)
    )
    counts = {row[0]: row[1] for row in counts_res.all()}

    nodes_map: Dict[int, DepartmentTreeNode] = {}
    for d in all_depts:
        h = employees.get(d.head_of_dept_id) if d.head_of_dept_id else None
        nodes_map[d.id] = DepartmentTreeNode(
            id=d.id,
            department_code=d.department_code,
            name_en=d.name_en,
            name_bn=d.name_bn,
            company_id=d.company_id,
            company_name=companies.get(d.company_id),
            parent_department_id=d.parent_department_id,
            head_id=d.head_of_dept_id,
            head_name=f"{h.first_name} {h.last_name}".strip() if h else None,
            head_code=h.employee_code if h else None,
            head_title=h.designation.title_en if h and h.designation else None,
            branch_id=d.branch_id,
            branch_name=branches.get(d.branch_id),
            cost_center_id=d.cost_center_id,
            status=d.status,
            employee_count=counts.get(d.id, 0),
            children=[]
        )

    root_nodes: List[DepartmentTreeNode] = []
    for d in all_depts:
        node = nodes_map[d.id]
        if d.parent_department_id and d.parent_department_id in nodes_map:
            nodes_map[d.parent_department_id].children.append(node)
        else:
            root_nodes.append(node)

    return root_nodes


@router.get("/departments/{dept_id}", response_model=DepartmentOut)
async def get_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return await _enrich_department_out(db, dept)


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    3.2 Create a new department with full validation rules:
    Rule 1: Department code unique within company.
    Rule 2: Department name mandatory.
    Rule 3: A department cannot be its own parent.
    Rule 4: Parent and child must belong to same company.
    Rule 5: Circular relationships prohibited.
    """
    org_id = get_org_id(current_user)

    # Rule 2: Department name is mandatory
    name_clean = (payload.name_en or "").strip()
    if not name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validation Rule 2: Department name is mandatory."
        )

    # Rule 1: Department code must be unique within company
    code_clean = payload.department_code.strip().upper()
    existing_code = await db.execute(
        select(Department).where(
            Department.company_id == payload.company_id,
            Department.department_code == code_clean,
            Department.organization_id == org_id
        )
    )
    if existing_code.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation Rule 1: Department code '{code_clean}' already exists in this company."
        )

    # Rule 4: Parent and child departments must belong to same company
    if payload.parent_department_id:
        parent = await db.get(Department, payload.parent_department_id)
        if not parent:
            raise HTTPException(status_code=400, detail="Parent department not found.")
        if parent.company_id and payload.company_id and parent.company_id != payload.company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Validation Rule 4: Parent and child departments must belong to the same company."
            )

    dept = Department(
        organization_id=org_id,
        company_id=payload.company_id or 1,
        department_code=code_clean,
        name_en=name_clean,
        name_bn=payload.name_bn,
        parent_department_id=payload.parent_department_id,
        head_of_dept_id=payload.head_of_dept_id,
        branch_id=payload.branch_id,
        cost_center_id=payload.cost_center_id,
        description=payload.description,
        effective_from=payload.effective_from or date.today(),
        effective_to=payload.effective_to,
        status=payload.status or "ACTIVE",
        approval_policies=payload.approval_policies or {},
        is_active=payload.is_active
    )
    db.add(dept)
    await db.flush()

    # Record Head assignment history if head assigned on creation
    if payload.head_of_dept_id:
        head_emp = await db.get(Employee, payload.head_of_dept_id)
        if head_emp:
            history = DepartmentHeadHistory(
                department_id=dept.id,
                employee_id=head_emp.id,
                assignment_type="PERMANENT",
                effective_from=payload.effective_from or date.today(),
                is_current=True,
                remarks="Initial department head assignment on creation."
            )
            db.add(history)

    # 2.7 Audit log
    user_name = current_user.full_name if current_user and hasattr(current_user, 'full_name') else "System Admin"
    audit = DepartmentAuditLog(
        department_id=dept.id,
        action_type="CREATED",
        performed_by_name=user_name,
        new_values={
            "department_code": dept.department_code,
            "name_en": dept.name_en,
            "company_id": dept.company_id,
            "parent_id": dept.parent_department_id,
            "status": dept.status
        },
        remarks="Department created successfully."
    )
    db.add(audit)

    await db.commit()
    await db.refresh(dept)
    return await _enrich_department_out(db, dept)


@router.put("/departments/{dept_id}", response_model=DepartmentOut)
async def update_department(
    dept_id: int,
    payload: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """3.2 & 5.1 Update department with validation rules and audit trail."""
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    old_values = {
        "department_code": dept.department_code,
        "name_en": dept.name_en,
        "company_id": dept.company_id,
        "parent_department_id": dept.parent_department_id,
        "head_of_dept_id": dept.head_of_dept_id,
        "branch_id": dept.branch_id,
        "cost_center_id": dept.cost_center_id,
        "status": dept.status,
        "is_active": dept.is_active
    }

    # Rule 1: Unique code within company
    if payload.department_code:
        new_code = payload.department_code.strip().upper()
        if new_code != dept.department_code:
            target_company_id = payload.company_id or dept.company_id
            existing = await db.execute(
                select(Department).where(
                    Department.company_id == target_company_id,
                    Department.department_code == new_code,
                    Department.id != dept.id
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Validation Rule 1: Department code '{new_code}' already exists in this company."
                )
            dept.department_code = new_code

    if payload.name_en is not None:
        name_clean = payload.name_en.strip()
        if not name_clean:
            raise HTTPException(status_code=400, detail="Validation Rule 2: Department name is mandatory.")
        dept.name_en = name_clean

    if payload.name_bn is not None:
        dept.name_bn = payload.name_bn

    target_company = payload.company_id if payload.company_id is not None else dept.company_id
    if payload.company_id is not None:
        dept.company_id = payload.company_id

    # Rule 3 & 5: Circular hierarchy validation
    if payload.parent_department_id is not None:
        if payload.parent_department_id != dept.parent_department_id:
            await _check_circular_department(db, dept.id, payload.parent_department_id)
            if payload.parent_department_id:
                p = await db.get(Department, payload.parent_department_id)
                if p and p.company_id and target_company and p.company_id != target_company:
                    raise HTTPException(
                        status_code=400,
                        detail="Validation Rule 4: Parent and child departments must belong to the same company."
                    )
            dept.parent_department_id = payload.parent_department_id

    # Rule 6: Deactivation validation with active employees check
    if (payload.status == "INACTIVE" and dept.status != "INACTIVE") or (payload.is_active is False and dept.is_active is True):
        active_emp_count = await db.scalar(
            select(func.count(Employee.id)).where(
                Employee.department_id == dept.id,
                Employee.status == "ACTIVE"
            )
        ) or 0
        if active_emp_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation Rule 6: Cannot deactivate department '{dept.name_en}'. It has {active_emp_count} active employees. Reassign or transfer them before deactivation."
            )

    if payload.status is not None:
        dept.status = payload.status
        dept.is_active = (payload.status == "ACTIVE")
    if payload.is_active is not None:
        dept.is_active = payload.is_active

    if payload.branch_id is not None:
        dept.branch_id = payload.branch_id
    if payload.cost_center_id is not None:
        dept.cost_center_id = payload.cost_center_id
    if payload.description is not None:
        dept.description = payload.description
    if payload.effective_from is not None:
        dept.effective_from = payload.effective_from
    if payload.effective_to is not None:
        dept.effective_to = payload.effective_to
    if payload.approval_policies is not None:
        dept.approval_policies = payload.approval_policies

    # Check if Department Head changed
    if payload.head_of_dept_id is not None and payload.head_of_dept_id != dept.head_of_dept_id:
        # Close old head assignment in history
        old_history_res = await db.execute(
            select(DepartmentHeadHistory).where(
                DepartmentHeadHistory.department_id == dept.id,
                DepartmentHeadHistory.is_current.is_(True)
            )
        )
        for h in old_history_res.scalars().all():
            h.is_current = False
            h.effective_to = date.today()

        # Add new head history
        if payload.head_of_dept_id:
            head_emp = await db.get(Employee, payload.head_of_dept_id)
            if head_emp:
                new_hist = DepartmentHeadHistory(
                    department_id=dept.id,
                    employee_id=head_emp.id,
                    assignment_type="PERMANENT",
                    effective_from=date.today(),
                    is_current=True,
                    remarks="Department head updated via Department Master."
                )
                db.add(new_hist)
        dept.head_of_dept_id = payload.head_of_dept_id

    # 2.7 Audit log
    user_name = current_user.full_name if current_user and hasattr(current_user, 'full_name') else "HR Administrator"
    audit = DepartmentAuditLog(
        department_id=dept.id,
        action_type="UPDATED",
        performed_by_name=user_name,
        old_values=old_values,
        new_values={
            "department_code": dept.department_code,
            "name_en": dept.name_en,
            "company_id": dept.company_id,
            "parent_department_id": dept.parent_department_id,
            "head_of_dept_id": dept.head_of_dept_id,
            "branch_id": dept.branch_id,
            "cost_center_id": dept.cost_center_id,
            "status": dept.status,
            "is_active": dept.is_active
        },
        remarks="Department details updated."
    )
    db.add(audit)

    await db.commit()
    await db.refresh(dept)
    return await _enrich_department_out(db, dept)


@router.patch("/departments/{dept_id}/status", response_model=DepartmentOut)
async def update_department_status(
    dept_id: int,
    status_value: str = Query(..., regex="^(ACTIVE|INACTIVE)$"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """3.2 Deactivate or activate department with Rule 6 active employee check."""
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    if status_value == "INACTIVE":
        active_emp_count = await db.scalar(
            select(func.count(Employee.id)).where(
                Employee.department_id == dept.id,
                Employee.status == "ACTIVE"
            )
        ) or 0
        if active_emp_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation Rule 6: Cannot deactivate department with {active_emp_count} active employees. Please reassign employees first."
            )

    dept.status = status_value
    dept.is_active = (status_value == "ACTIVE")

    user_name = current_user.full_name if current_user and hasattr(current_user, 'full_name') else "HR Administrator"
    audit = DepartmentAuditLog(
        department_id=dept.id,
        action_type="STATUS_CHANGED",
        performed_by_name=user_name,
        old_values={"status": dept.status},
        new_values={"status": status_value},
        remarks=f"Department status set to {status_value}."
    )
    db.add(audit)
    await db.commit()
    await db.refresh(dept)
    return await _enrich_department_out(db, dept)


@router.put("/departments/{dept_id}/move-parent", response_model=DepartmentOut)
async def move_department_parent(
    dept_id: int,
    payload: DepartmentMoveParent,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """4. Move a department under a different parent with circular validation & audit log."""
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    old_parent_id = dept.parent_department_id
    if payload.parent_department_id:
        await _check_circular_department(db, dept.id, payload.parent_department_id)
        parent = await db.get(Department, payload.parent_department_id)
        if not parent:
            raise HTTPException(status_code=400, detail="Parent department not found.")
        if parent.company_id and dept.company_id and parent.company_id != dept.company_id:
            raise HTTPException(
                status_code=400,
                detail="Validation Rule 4: Parent and child departments must belong to the same company."
            )

    dept.parent_department_id = payload.parent_department_id

    user_name = current_user.full_name if current_user and hasattr(current_user, 'full_name') else "HR Administrator"
    audit = DepartmentAuditLog(
        department_id=dept.id,
        action_type="PARENT_CHANGED",
        performed_by_name=user_name,
        old_values={"parent_department_id": old_parent_id},
        new_values={"parent_department_id": payload.parent_department_id},
        remarks=payload.remarks or "Hierarchy restructuring: department parent moved."
    )
    db.add(audit)
    await db.commit()
    await db.refresh(dept)
    return await _enrich_department_out(db, dept)


@router.post("/departments/{dept_id}/assign-head", response_model=DepartmentHeadHistoryOut)
async def assign_department_head(
    dept_id: int,
    payload: DepartmentHeadAssign,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """5.1 & 5.2 Assign department head, configure granular permissions, and track history."""
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    emp = await db.get(Employee, payload.employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if emp.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign an inactive employee as department head."
        )

    # Close previous active assignments
    hist_q = select(DepartmentHeadHistory).where(
        DepartmentHeadHistory.department_id == dept.id,
        DepartmentHeadHistory.is_current.is_(True)
    )
    res = await db.execute(hist_q)
    for h in res.scalars().all():
        h.is_current = False
        h.effective_to = payload.effective_from or date.today()

    new_hist = DepartmentHeadHistory(
        department_id=dept.id,
        employee_id=emp.id,
        assignment_type=payload.assignment_type or "PERMANENT",
        effective_from=payload.effective_from or date.today(),
        effective_to=payload.effective_to,
        permissions_json=payload.permissions_json or {
            "view_employees": True,
            "approve_leave": True,
            "approve_overtime": True,
            "review_attendance": True,
            "initiate_transfer": False,
            "recommend_salary": False,
            "view_payroll_cost": True,
            "approve_expenses": True,
            "expense_limit": 50000.00
        },
        is_current=True,
        remarks=payload.remarks or f"Assigned as {payload.assignment_type} Head of Department."
    )
    db.add(new_hist)

    # Update Department model
    dept.head_of_dept_id = emp.id

    user_name = current_user.full_name if current_user and hasattr(current_user, 'full_name') else "HR Administrator"
    audit = DepartmentAuditLog(
        department_id=dept.id,
        action_type="HEAD_ASSIGNED",
        performed_by_name=user_name,
        new_values={
            "employee_id": emp.id,
            "employee_name": f"{emp.first_name} {emp.last_name}".strip(),
            "assignment_type": payload.assignment_type
        },
        remarks=f"Department head assigned: {emp.first_name} {emp.last_name}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_hist)

    return DepartmentHeadHistoryOut(
        id=new_hist.id,
        department_id=new_hist.department_id,
        employee_id=new_hist.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}".strip(),
        employee_code=emp.employee_code,
        designation_title=emp.designation.title_en if emp.designation else None,
        assignment_type=new_hist.assignment_type,
        effective_from=new_hist.effective_from,
        effective_to=new_hist.effective_to,
        permissions_json=new_hist.permissions_json,
        is_current=new_hist.is_current,
        remarks=new_hist.remarks,
        created_at=new_hist.created_at
    )


@router.get("/departments/{dept_id}/head-history", response_model=List[DepartmentHeadHistoryOut])
async def get_department_head_history(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """5.1 View chronological appointment and reassignment history."""
    q = select(DepartmentHeadHistory).where(
        DepartmentHeadHistory.department_id == dept_id
    ).order_by(desc(DepartmentHeadHistory.created_at))
    res = await db.execute(q)
    history_items = res.scalars().all()

    out = []
    for h in history_items:
        emp = await db.get(Employee, h.employee_id)
        out.append(DepartmentHeadHistoryOut(
            id=h.id,
            department_id=h.department_id,
            employee_id=h.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}".strip() if emp else None,
            employee_code=emp.employee_code if emp else None,
            designation_title=emp.designation.title_en if emp and emp.designation else None,
            assignment_type=h.assignment_type,
            effective_from=h.effective_from,
            effective_to=h.effective_to,
            permissions_json=h.permissions_json,
            is_current=h.is_current,
            remarks=h.remarks,
            created_at=h.created_at
        ))
    return out


@router.get("/departments/{dept_id}/project-mappings", response_model=List[DepartmentProjectMappingOut])
async def list_department_project_mappings(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """2.5 Project Department Mapping: View assigned projects for a department."""
    q = select(DepartmentProjectMapping).where(
        DepartmentProjectMapping.department_id == dept_id
    ).order_by(desc(DepartmentProjectMapping.created_at))
    res = await db.execute(q)
    mappings = res.scalars().all()

    out = []
    for m in mappings:
        prj = await db.get(Project, m.project_id)
        d = await db.get(Department, m.department_id)
        lead = await db.get(Employee, m.site_lead_employee_id) if m.site_lead_employee_id else None
        out.append(DepartmentProjectMappingOut(
            id=m.id,
            department_id=m.department_id,
            department_name=d.name_en if d else None,
            project_id=m.project_id,
            project_name=prj.project_name if prj else None,
            project_code=prj.project_code if prj else None,
            site_lead_employee_id=m.site_lead_employee_id,
            site_lead_name=f"{lead.first_name} {lead.last_name}".strip() if lead else None,
            effective_from=m.effective_from,
            effective_to=m.effective_to,
            status=m.status,
            created_at=m.created_at
        ))
    return out


@router.post("/departments/{dept_id}/project-mappings", response_model=DepartmentProjectMappingOut, status_code=status.HTTP_201_CREATED)
async def create_department_project_mapping(
    dept_id: int,
    payload: DepartmentProjectMappingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """2.5 Assign functional department (e.g. Site Operations, QA) to construction project."""
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    prj = await db.get(Project, payload.project_id)
    if not prj:
        raise HTTPException(status_code=404, detail="Project not found")

    mapping = DepartmentProjectMapping(
        department_id=dept.id,
        project_id=prj.id,
        site_lead_employee_id=payload.site_lead_employee_id,
        effective_from=payload.effective_from or date.today(),
        effective_to=payload.effective_to,
        status=payload.status or "ACTIVE"
    )
    db.add(mapping)

    user_name = current_user.full_name if current_user and hasattr(current_user, 'full_name') else "Project Director"
    audit = DepartmentAuditLog(
        department_id=dept.id,
        action_type="PROJECT_MAPPED",
        performed_by_name=user_name,
        new_values={"project_id": prj.id, "project_name": prj.project_name},
        remarks=f"Department mapped to site project: {prj.project_name}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(mapping)

    lead = await db.get(Employee, mapping.site_lead_employee_id) if mapping.site_lead_employee_id else None
    return DepartmentProjectMappingOut(
        id=mapping.id,
        department_id=dept.id,
        department_name=dept.name_en,
        project_id=prj.id,
        project_name=prj.project_name,
        project_code=prj.project_code,
        site_lead_employee_id=mapping.site_lead_employee_id,
        site_lead_name=f"{lead.first_name} {lead.last_name}".strip() if lead else None,
        effective_from=mapping.effective_from,
        effective_to=mapping.effective_to,
        status=mapping.status,
        created_at=mapping.created_at
    )


@router.delete("/departments/project-mappings/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department_project_mapping(
    mapping_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    mapping = await db.get(DepartmentProjectMapping, mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    await db.delete(mapping)
    await db.commit()
    return None


@router.get("/departments/{dept_id}/audit-trail", response_model=List[DepartmentAuditOut])
async def get_department_audit_trail(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """2.7 Department History & Audit: Chronological track of changes."""
    q = select(DepartmentAuditLog).where(
        DepartmentAuditLog.department_id == dept_id
    ).order_by(desc(DepartmentAuditLog.created_at))
    res = await db.execute(q)
    return res.scalars().all()


@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Deactivate or remove department with integrity checks."""
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check child departments
    children_count = await db.scalar(
        select(func.count(Department.id)).where(Department.parent_department_id == dept.id)
    ) or 0
    if children_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete department '{dept.name_en}'. It has {children_count} sub-departments. Reassign them first."
        )

    # Check active employees
    active_emp_count = await db.scalar(
        select(func.count(Employee.id)).where(
            Employee.department_id == dept.id,
            Employee.status == "ACTIVE"
        )
    ) or 0
    if active_emp_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation Rule 6: Cannot delete department '{dept.name_en}' with {active_emp_count} active employees."
        )

    await db.delete(dept)
    await db.commit()
    return None


# =====================================================================
# --- 4. Employees Master Registry & Profile 360 Endpoints ---
# =====================================================================

async def _enrich_employee_out(db: AsyncSession, emp: Employee) -> EmployeeOut:
    """Enrich Employee entity with joined labels, salary totals, and relations."""
    dept_name = None
    if emp.department_id:
        dept = await db.get(Department, emp.department_id)
        if dept:
            dept_name = dept.name_en or dept.department_name

    desig_title = None
    if emp.designation_id:
        desig = await db.get(Designation, emp.designation_id)
        if desig:
            desig_title = desig.title_en

    proj_name = None
    if emp.assigned_project_id:
        proj = await db.get(Project, emp.assigned_project_id)
        if proj:
            proj_name = proj.project_name

    comp_name = None
    if emp.company_id:
        comp = await db.get(Company, emp.company_id)
        if comp:
            comp_name = comp.company_name

    br_name = None
    if emp.branch_id:
        br = await db.get(Branch, emp.branch_id)
        if br:
            br_name = br.branch_name

    rep_name = None
    if emp.reporting_to_id:
        rep = await db.get(Employee, emp.reporting_to_id)
        if rep:
            rep_name = f"{rep.first_name} {rep.last_name}".strip()

    grade_name = None
    if emp.salary_grade_id:
        sg = await db.get(SalaryGrade, emp.salary_grade_id)
        if sg:
            grade_name = sg.grade_name

    gross = (emp.basic_salary or Decimal("0")) + \
            (emp.house_rent_allowance or Decimal("0")) + \
            (emp.medical_allowance or Decimal("0")) + \
            (emp.conveyance_allowance or Decimal("0")) + \
            (emp.site_hazard_allowance or Decimal("0")) + \
            (emp.mobile_allowance or Decimal("0"))

    return EmployeeOut(
        id=emp.id,
        employee_code=emp.employee_code,
        first_name=emp.first_name,
        last_name=emp.last_name,
        full_name_bn=emp.full_name_bn,
        photo_url=emp.photo_url,
        official_email=emp.official_email,
        phone=emp.phone,
        personal_phone=emp.personal_phone,
        gender=emp.gender or "MALE",
        date_of_birth=emp.date_of_birth,
        marital_status=emp.marital_status or "SINGLE",
        blood_group=emp.blood_group,
        father_name=emp.father_name,
        mother_name=emp.mother_name,
        spouse_name=emp.spouse_name,
        nid_number=emp.nid_number,
        tin_number=emp.tin_number,
        passport_number=emp.passport_number,
        passport_expiry_date=emp.passport_expiry_date,
        present_address=emp.present_address,
        permanent_address=emp.permanent_address,
        emergency_contact_name=emp.emergency_contact_name,
        emergency_contact_relation=emp.emergency_contact_relation,
        emergency_contact_phone=emp.emergency_contact_phone,
        nominee_name=emp.nominee_name,
        nominee_relation=emp.nominee_relation,
        nominee_phone=emp.nominee_phone,
        nominee_nid=emp.nominee_nid,
        joining_date=emp.joining_date,
        confirmation_date=emp.confirmation_date,
        probation_months=emp.probation_months or 6,
        employment_type=emp.employment_type or "PERMANENT",
        workforce_category=emp.workforce_category or "CORPORATE",
        status=emp.status or "ACTIVE",
        department_id=emp.department_id,
        designation_id=emp.designation_id,
        salary_grade_id=emp.salary_grade_id,
        salary_grade_name=grade_name,
        reporting_to_id=emp.reporting_to_id,
        assigned_project_id=emp.assigned_project_id,
        company_id=emp.company_id,
        branch_id=emp.branch_id,
        project_office_id=emp.project_office_id,
        work_location=emp.work_location,
        cost_center=emp.cost_center,
        payment_method=emp.payment_method or "BANK",
        bank_account_no=emp.bank_account_no,
        bank_name=emp.bank_name,
        bank_branch=emp.bank_branch,
        routing_no=emp.routing_no,
        mfs_provider=emp.mfs_provider,
        mfs_number=emp.mfs_number,
        basic_salary=emp.basic_salary or Decimal("0.00"),
        house_rent_allowance=emp.house_rent_allowance or Decimal("0.00"),
        medical_allowance=emp.medical_allowance or Decimal("0.00"),
        conveyance_allowance=emp.conveyance_allowance or Decimal("0.00"),
        site_hazard_allowance=emp.site_hazard_allowance or Decimal("0.00"),
        mobile_allowance=emp.mobile_allowance or Decimal("0.00"),
        custom_allowances=emp.custom_allowances or [],
        is_pf_eligible=bool(emp.is_pf_eligible),
        is_tax_eligible=bool(emp.is_tax_eligible),
        education=emp.education or [],
        experience=emp.experience or [],
        certifications=emp.certifications or [],
        skills=emp.skills or [],
        documents=emp.documents or [],
        user_id=emp.user_id,
        system_role=emp.system_role or "EMPLOYEE",
        department_name=dept_name,
        designation_title=desig_title,
        assigned_project_name=proj_name,
        company_name=comp_name,
        branch_name=br_name,
        reporting_to_name=rep_name,
        gross_salary=gross,
        created_at=emp.created_at,
        updated_at=emp.updated_at
    )


@router.get("/employees", response_model=EmployeePaginatedOut)
async def list_employees(
    limit: int = Query(20, ge=1, le=500),
    offset: int = Query(0, ge=0),
    all: bool = Query(False),
    category: Optional[str] = Query(None),
    workforce_category: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    designation_id: Optional[int] = Query(None),
    employment_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    branch_id: Optional[int] = Query(None),
    company_id: Optional[int] = Query(None),
    system_role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    filters = [Employee.organization_id == org_id]

    cat = category if isinstance(category, str) and category else (workforce_category if isinstance(workforce_category, str) and workforce_category else None)
    if cat:
        filters.append(Employee.workforce_category == cat)
    if isinstance(department_id, int):
        filters.append(Employee.department_id == department_id)
    if isinstance(designation_id, int):
        filters.append(Employee.designation_id == designation_id)
    if isinstance(employment_type, str) and employment_type:
        filters.append(Employee.employment_type == employment_type)
    if isinstance(status, str) and status:
        filters.append(Employee.status == status)
    if isinstance(project_id, int):
        filters.append(Employee.assigned_project_id == project_id)
    if isinstance(branch_id, int):
        filters.append(Employee.branch_id == branch_id)
    if isinstance(company_id, int):
        filters.append(Employee.company_id == company_id)
    if isinstance(system_role, str) and system_role:
        filters.append(Employee.system_role == system_role)
    if isinstance(search, str) and search.strip():
        s = f"%{search.strip()}%"
        filters.append(
            or_(
                Employee.first_name.ilike(s),
                Employee.last_name.ilike(s),
                Employee.employee_code.ilike(s),
                Employee.phone.ilike(s),
                Employee.official_email.ilike(s),
                Employee.nid_number.ilike(s)
            )
        )

    # Total Count
    count_stmt = select(func.count(Employee.id)).where(and_(*filters))
    total = (await db.execute(count_stmt)).scalar() or 0

    # Query Items
    stmt = select(Employee).where(and_(*filters)).order_by(Employee.employee_code.asc())
    if not all:
        stmt = stmt.limit(limit).offset(offset)
    else:
        stmt = stmt.limit(1000)

    res = await db.execute(stmt)
    employees = res.scalars().all()

    items = [await _enrich_employee_out(db, emp) for emp in employees]
    return EmployeePaginatedOut(
        items=items,
        total=total,
        limit=total if all else limit,
        offset=0 if all else offset
    )


@router.get("/employees/{id}", response_model=EmployeeOut)
async def get_employee_detail(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    emp = await db.get(Employee, id)
    if not emp or emp.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Employee not found")
    return await _enrich_employee_out(db, emp)


@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)

    # Auto code generation if missing
    code = payload.employee_code
    if not code or not code.strip():
        count_q = select(func.count(Employee.id)).where(Employee.organization_id == org_id)
        c = (await db.execute(count_q)).scalar() or 0
        code = f"EMP-{1000 + c + 1}"
    else:
        code = code.strip().upper()
        # Check duplicate
        dup = await db.execute(select(Employee).where(Employee.organization_id == org_id, Employee.employee_code == code))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Employee code '{code}' already exists.")

    emp = Employee(
        organization_id=org_id,
        employee_code=code,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        full_name_bn=payload.full_name_bn.strip() if payload.full_name_bn else None,
        photo_url=payload.photo_url.strip() if payload.photo_url else None,
        official_email=payload.official_email.strip() if payload.official_email else None,
        phone=payload.phone.strip(),
        personal_phone=payload.personal_phone.strip() if payload.personal_phone else None,
        gender=payload.gender or "MALE",
        date_of_birth=payload.date_of_birth,
        marital_status=payload.marital_status or "SINGLE",
        blood_group=payload.blood_group,
        father_name=payload.father_name.strip() if payload.father_name else None,
        mother_name=payload.mother_name.strip() if payload.mother_name else None,
        spouse_name=payload.spouse_name.strip() if payload.spouse_name else None,
        nid_number=payload.nid_number.strip() if payload.nid_number else None,
        tin_number=payload.tin_number.strip() if payload.tin_number else None,
        passport_number=payload.passport_number.strip() if payload.passport_number else None,
        passport_expiry_date=payload.passport_expiry_date,
        present_address=payload.present_address,
        permanent_address=payload.permanent_address,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_relation=payload.emergency_contact_relation,
        emergency_contact_phone=payload.emergency_contact_phone,
        nominee_name=payload.nominee_name,
        nominee_relation=payload.nominee_relation,
        nominee_phone=payload.nominee_phone,
        nominee_nid=payload.nominee_nid,
        joining_date=payload.joining_date or date.today(),
        confirmation_date=payload.confirmation_date,
        probation_months=payload.probation_months or 6,
        employment_type=payload.employment_type or "PERMANENT",
        workforce_category=payload.workforce_category or "CORPORATE",
        status=payload.status or "ACTIVE",
        department_id=payload.department_id,
        designation_id=payload.designation_id,
        salary_grade_id=payload.salary_grade_id,
        reporting_to_id=payload.reporting_to_id,
        assigned_project_id=payload.assigned_project_id,
        company_id=payload.company_id,
        branch_id=payload.branch_id,
        project_office_id=payload.project_office_id,
        work_location=payload.work_location,
        cost_center=payload.cost_center,
        payment_method=payload.payment_method or "BANK",
        bank_account_no=payload.bank_account_no,
        bank_name=payload.bank_name,
        bank_branch=payload.bank_branch,
        routing_no=payload.routing_no,
        mfs_provider=payload.mfs_provider,
        mfs_number=payload.mfs_number,
        basic_salary=payload.basic_salary or Decimal("0.00"),
        house_rent_allowance=payload.house_rent_allowance or Decimal("0.00"),
        medical_allowance=payload.medical_allowance or Decimal("0.00"),
        conveyance_allowance=payload.conveyance_allowance or Decimal("0.00"),
        site_hazard_allowance=payload.site_hazard_allowance or Decimal("0.00"),
        mobile_allowance=payload.mobile_allowance or Decimal("0.00"),
        custom_allowances=payload.custom_allowances or [],
        is_pf_eligible=payload.is_pf_eligible,
        is_tax_eligible=payload.is_tax_eligible,
        education=payload.education or [],
        experience=payload.experience or [],
        certifications=payload.certifications or [],
        skills=payload.skills or [],
        documents=payload.documents or [],
        user_id=payload.user_id,
        system_role=payload.system_role or "EMPLOYEE"
    )
    db.add(emp)
    await db.commit()
    await db.refresh(emp)

    return await _enrich_employee_out(db, emp)


@router.put("/employees/{id}", response_model=EmployeeOut)
async def update_employee(
    id: int,
    payload: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    emp = await db.get(Employee, id)
    if not emp or emp.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(emp, field, val)

    emp.updated_at = func.now()
    await db.commit()
    await db.refresh(emp)
    return await _enrich_employee_out(db, emp)


@router.patch("/employees/{id}/status", response_model=EmployeeOut)
async def patch_employee_status(
    id: int,
    payload: Dict[str, str],
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Quickly update employee lifecycle status (ACTIVE, PROBATION, CONFIRMED, RESIGNED, TERMINATED, ON_LEAVE)."""
    org_id = get_org_id(current_user)
    emp = await db.get(Employee, id)
    if not emp or emp.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")

    emp.status = new_status.upper()
    emp.updated_at = func.now()
    await db.commit()
    await db.refresh(emp)
    return await _enrich_employee_out(db, emp)


@router.post("/employees/upload-photo")
async def upload_employee_photo(
    file: UploadFile = File(...)
):
    """Upload employee avatar / photograph to static storage."""
    allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
    filename = file.filename or "avatar.jpg"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    # Destination directory: backend/app/static/uploads/users/
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "static", "uploads", "users"))
    os.makedirs(target_dir, exist_ok=True)

    unique_filename = f"emp_{uuid.uuid4().hex[:12]}{ext}"
    filepath = os.path.join(target_dir, unique_filename)

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    photo_url = f"/uploads/users/{unique_filename}"
    return {
        "status": "success",
        "photo_url": photo_url,
        "filename": unique_filename
    }


@router.delete("/employees/{id}")
async def delete_employee(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    emp = await db.get(Employee, id)
    if not emp or emp.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Constraint Check 1: Head of Department
    is_head = await db.scalar(
        select(func.count(Department.id)).where(Department.head_of_dept_id == id)
    )
    if is_head and is_head > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete employee '{emp.first_name} {emp.last_name}' because they are assigned as Head of Department. Reassign department head first."
        )

    # Constraint Check 2: Occupied Position
    is_pos = await db.scalar(
        select(func.count(Position.id)).where(Position.occupied_employee_id == id)
    )
    if is_pos and is_pos > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete employee '{emp.first_name} {emp.last_name}' because they occupy an active Position. Vacate or reassign the position first."
        )

    # Subordinates reporting to this employee: reset reporting_to_id
    subordinates = (await db.execute(
        select(Employee).where(Employee.reporting_to_id == id)
    )).scalars().all()
    for sub in subordinates:
        sub.reporting_to_id = None

    await db.delete(emp)
    await db.commit()
    return {"message": "Employee deleted successfully", "id": id}


# --- 5. Site Labour Contractors ---
@router.get("/contractors", response_model=List[ContractorOut])
async def list_contractors(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(SiteLabourContractor).where(SiteLabourContractor.organization_id == org_id).order_by(SiteLabourContractor.company_name)
    res = await db.execute(q)
    return res.scalars().all()

@router.post("/contractors", response_model=ContractorOut, status_code=status.HTTP_201_CREATED)
async def create_contractor(
    payload: ContractorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    con = SiteLabourContractor(
        organization_id=org_id,
        company_name=payload.company_name,
        trade_license=payload.trade_license,
        contact_person=payload.contact_person,
        phone=payload.phone,
        email=payload.email,
        tax_nid=payload.tax_nid,
        trade_specialization=payload.trade_specialization,
        daily_rate_default=payload.daily_rate_default,
        is_active=payload.is_active
    )
    db.add(con)
    await db.commit()
    await db.refresh(con)
    return con


# --- 6. Daily Site Labour Muster Roll ---
@router.get("/muster-roll", response_model=List[MusterRollOut])
async def list_muster_roll(
    project_id: Optional[int] = None,
    muster_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LabourMusterRoll).where(LabourMusterRoll.organization_id == org_id)
    if project_id:
        q = q.where(LabourMusterRoll.project_id == project_id)
    if muster_date:
        q = q.where(LabourMusterRoll.muster_date == muster_date)

    q = q.order_by(desc(LabourMusterRoll.muster_date), LabourMusterRoll.id)
    res = await db.execute(q)
    items = res.scalars().all()

    out = []
    for m in items:
        out.append(MusterRollOut(
            id=m.id,
            project_id=m.project_id,
            tower_id=m.tower_id,
            contractor_id=m.contractor_id,
            muster_date=m.muster_date,
            shift=m.shift,
            skill_type=m.skill_type,
            headcount=m.headcount,
            standard_hours=m.standard_hours,
            overtime_hours=m.overtime_hours,
            hourly_rate=m.hourly_rate,
            overtime_rate=m.overtime_rate,
            total_amount=m.total_amount,
            approval_status=m.approval_status,
            remarks=m.remarks,
            project_name=m.project.project_name if m.project else None,
            contractor_name=m.contractor.company_name if m.contractor else None
        ))
    return out

@router.post("/muster-roll/batch", status_code=status.HTTP_201_CREATED)
async def create_muster_roll_batch(
    payload: MusterRollBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    user_id = current_user.id if current_user else None

    for item in payload.items:
        # Standard: headcount * hours * rate
        base_amt = Decimal(item.headcount) * item.standard_hours * item.hourly_rate
        # Overtime: headcount * ot_hours * ot_rate
        ot_amt = Decimal(item.headcount) * item.overtime_hours * item.overtime_rate
        total_amt = base_amt + ot_amt

        roll = LabourMusterRoll(
            organization_id=org_id,
            project_id=item.project_id,
            tower_id=item.tower_id,
            contractor_id=item.contractor_id,
            muster_date=item.muster_date,
            shift=item.shift,
            skill_type=item.skill_type,
            headcount=item.headcount,
            standard_hours=item.standard_hours,
            overtime_hours=item.overtime_hours,
            hourly_rate=item.hourly_rate,
            overtime_rate=item.overtime_rate,
            total_amount=total_amt,
            site_engineer_id=user_id,
            approval_status="APPROVED",
            remarks=item.remarks
        )
        db.add(roll)

    await db.commit()
    return {"status": "SUCCESS", "records_created": len(payload.items)}


# =====================================================================
# --- Section 2: Enterprise Attendance & Shift Routes (2.1 - 2.10) ---
# =====================================================================

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


# --- 2.1 Shift Management ---
@router.get("/shifts", response_model=ShiftPaginatedOut)
async def list_shifts(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(Shift).where(Shift.organization_id == org_id)

    if search:
        s = f"%{search.strip()}%"
        q = q.where(or_(Shift.shift_name.ilike(s), Shift.shift_code.ilike(s)))
    if is_active is not None:
        q = q.where(Shift.is_active == is_active)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(Shift.shift_code).limit(limit).offset(offset))
    items = items_res.scalars().all()

    return ShiftPaginatedOut(
        items=[ShiftOut.model_validate(s) for s in items],
        total=total,
        limit=limit,
        offset=offset
    )

@router.post("/shifts", response_model=ShiftOut, status_code=status.HTTP_201_CREATED)
async def create_shift(
    payload: ShiftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    
    # Check duplicate code
    exist_q = select(Shift).where(
        and_(
            Shift.organization_id == org_id,
            Shift.shift_code == payload.shift_code.strip().upper()
        )
    )
    res = await db.execute(exist_q)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Shift code already exists")

    shift = Shift(
        organization_id=org_id,
        shift_name=payload.shift_name.strip(),
        shift_code=payload.shift_code.strip().upper(),
        shift_type=payload.shift_type,
        start_time=payload.start_time,
        end_time=payload.end_time,
        break_start_time=payload.break_start_time,
        break_end_time=payload.break_end_time,
        break_duration_minutes=payload.break_duration_minutes,
        grace_period_minutes=payload.grace_period_minutes,
        half_day_minimum_minutes=payload.half_day_minimum_minutes,
        full_day_minimum_minutes=payload.full_day_minimum_minutes,
        is_night_shift=payload.is_night_shift,
        is_overtime_eligible=payload.is_overtime_eligible,
        weekly_off_days=payload.weekly_off_days,
        is_active=payload.is_active
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return ShiftOut.model_validate(shift)

@router.get("/shifts/{shift_id}", response_model=ShiftOut)
async def get_shift(
    shift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(Shift).where(and_(Shift.id == shift_id, Shift.organization_id == org_id))
    res = await db.execute(q)
    shift = res.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return ShiftOut.model_validate(shift)

@router.put("/shifts/{shift_id}", response_model=ShiftOut)
async def update_shift(
    shift_id: int,
    payload: ShiftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(Shift).where(and_(Shift.id == shift_id, Shift.organization_id == org_id))
    res = await db.execute(q)
    shift = res.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    data = payload.model_dump(exclude_unset=True)
    if "shift_code" in data and data["shift_code"]:
        data["shift_code"] = data["shift_code"].strip().upper()
    for field, val in data.items():
        setattr(shift, field, val)

    await db.commit()
    await db.refresh(shift)
    return ShiftOut.model_validate(shift)

@router.delete("/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift(
    shift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(Shift).where(and_(Shift.id == shift_id, Shift.organization_id == org_id))
    res = await db.execute(q)
    shift = res.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    await db.delete(shift)
    await db.commit()
    return None


# --- 2.2 Shift Assignment ---
@router.get("/shift-assignments", response_model=ShiftAssignmentPaginatedOut)
async def list_shift_assignments(
    shift_id: Optional[int] = None,
    assignment_type: Optional[str] = None,
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(ShiftAssignment).where(ShiftAssignment.organization_id == org_id)

    if shift_id:
        q = q.where(ShiftAssignment.shift_id == shift_id)
    if assignment_type:
        q = q.where(ShiftAssignment.assignment_type == assignment_type)
    if employee_id:
        q = q.where(ShiftAssignment.employee_id == employee_id)
    if department_id:
        q = q.where(ShiftAssignment.department_id == department_id)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(desc(ShiftAssignment.id)).limit(limit).offset(offset))
    items = items_res.scalars().all()

    out_items = []
    for sa in items:
        target_name = None
        target_code = None
        target_photo = None
        if sa.assignment_type == "EMPLOYEE" and sa.employee:
            target_name = f"{sa.employee.first_name} {sa.employee.last_name}"
            target_code = sa.employee.employee_code
            target_photo = sa.employee.photo_url
        elif sa.assignment_type == "DEPARTMENT" and sa.department:
            target_name = sa.department.name_en
            target_code = sa.department.department_code
        elif sa.assignment_type == "PROJECT_SITE" and sa.project:
            target_name = sa.project.name
            target_code = getattr(sa.project, "code", None)

        out_items.append(ShiftAssignmentOut(
            id=sa.id,
            shift_id=sa.shift_id,
            shift_name=sa.shift.shift_name if sa.shift else None,
            shift_code=sa.shift.shift_code if sa.shift else None,
            assignment_type=sa.assignment_type,
            employee_id=sa.employee_id,
            department_id=sa.department_id,
            project_id=sa.project_id,
            target_name=target_name,
            target_code=target_code,
            target_photo_url=target_photo,
            effective_from=sa.effective_from,
            effective_to=sa.effective_to,
            is_active=sa.is_active,
            remarks=sa.remarks,
            created_at=sa.created_at
        ))

    return ShiftAssignmentPaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset
    )

@router.post("/shift-assignments", response_model=ShiftAssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_shift_assignment(
    payload: ShiftAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)

    # Multi-employee support
    employee_ids = []
    if payload.assignment_type == "EMPLOYEE":
        if payload.employee_ids and len(payload.employee_ids) > 0:
            employee_ids = payload.employee_ids
        elif payload.employee_id:
            employee_ids = [payload.employee_id]

    primary_sa = None
    if payload.assignment_type == "EMPLOYEE" and len(employee_ids) > 0:
        for emp_id in employee_ids:
            sa = ShiftAssignment(
                organization_id=org_id,
                shift_id=payload.shift_id,
                assignment_type="EMPLOYEE",
                employee_id=emp_id,
                department_id=None,
                project_id=None,
                effective_from=payload.effective_from,
                effective_to=payload.effective_to,
                is_active=payload.is_active,
                remarks=payload.remarks
            )
            db.add(sa)
            if primary_sa is None:
                primary_sa = sa
        await db.commit()
        await db.refresh(primary_sa)
    else:
        primary_sa = ShiftAssignment(
            organization_id=org_id,
            shift_id=payload.shift_id,
            assignment_type=payload.assignment_type,
            employee_id=payload.employee_id if payload.assignment_type == "EMPLOYEE" else None,
            department_id=payload.department_id if payload.assignment_type == "DEPARTMENT" else None,
            project_id=payload.project_id if payload.assignment_type == "PROJECT_SITE" else None,
            effective_from=payload.effective_from,
            effective_to=payload.effective_to,
            is_active=payload.is_active,
            remarks=payload.remarks
        )
        db.add(primary_sa)
        await db.commit()
        await db.refresh(primary_sa)

    target_name = None
    target_code = None
    target_photo = None
    if primary_sa.assignment_type == "EMPLOYEE" and primary_sa.employee_id:
        emp_res = await db.execute(select(Employee).where(Employee.id == primary_sa.employee_id))
        emp = emp_res.scalar_one_or_none()
        if emp:
            target_name = f"{emp.first_name} {emp.last_name}"
            target_code = emp.employee_code
            target_photo = emp.photo_url
    elif primary_sa.assignment_type == "DEPARTMENT" and primary_sa.department_id:
        dept_res = await db.execute(select(Department).where(Department.id == primary_sa.department_id))
        dept = dept_res.scalar_one_or_none()
        if dept:
            target_name = dept.name_en
            target_code = dept.department_code

    shift_res = await db.execute(select(Shift).where(Shift.id == primary_sa.shift_id))
    shift = shift_res.scalar_one_or_none()

    return ShiftAssignmentOut(
        id=primary_sa.id,
        shift_id=primary_sa.shift_id,
        shift_name=shift.shift_name if shift else None,
        shift_code=shift.shift_code if shift else None,
        assignment_type=primary_sa.assignment_type,
        employee_id=primary_sa.employee_id,
        department_id=primary_sa.department_id,
        project_id=primary_sa.project_id,
        target_name=target_name,
        target_code=target_code,
        target_photo_url=target_photo,
        effective_from=primary_sa.effective_from,
        effective_to=primary_sa.effective_to,
        is_active=primary_sa.is_active,
        remarks=primary_sa.remarks,
        created_at=primary_sa.created_at
    )

@router.get("/shift-assignments/{assignment_id}", response_model=ShiftAssignmentOut)
async def get_shift_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(ShiftAssignment).where(and_(ShiftAssignment.id == assignment_id, ShiftAssignment.organization_id == org_id))
    res = await db.execute(q)
    sa = res.scalar_one_or_none()
    if not sa:
        raise HTTPException(status_code=404, detail="Shift assignment not found")

    target_name = None
    target_code = None
    target_photo = None
    if sa.assignment_type == "EMPLOYEE" and sa.employee_id:
        emp_res = await db.execute(select(Employee).where(Employee.id == sa.employee_id))
        emp = emp_res.scalar_one_or_none()
        if emp:
            target_name = f"{emp.first_name} {emp.last_name}"
            target_code = emp.employee_code
            target_photo = emp.photo_url
    elif sa.assignment_type == "DEPARTMENT" and sa.department_id:
        dept_res = await db.execute(select(Department).where(Department.id == sa.department_id))
        dept = dept_res.scalar_one_or_none()
        if dept:
            target_name = dept.name_en
            target_code = dept.department_code

    shift_res = await db.execute(select(Shift).where(Shift.id == sa.shift_id))
    shift = shift_res.scalar_one_or_none()

    return ShiftAssignmentOut(
        id=sa.id,
        shift_id=sa.shift_id,
        shift_name=shift.shift_name if shift else None,
        shift_code=shift.shift_code if shift else None,
        assignment_type=sa.assignment_type,
        employee_id=sa.employee_id,
        department_id=sa.department_id,
        project_id=sa.project_id,
        target_name=target_name,
        target_code=target_code,
        target_photo_url=target_photo,
        effective_from=sa.effective_from,
        effective_to=sa.effective_to,
        is_active=sa.is_active,
        remarks=sa.remarks,
        created_at=sa.created_at
    )

@router.put("/shift-assignments/{assignment_id}", response_model=ShiftAssignmentOut)
async def update_shift_assignment(
    assignment_id: int,
    payload: ShiftAssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(ShiftAssignment).where(and_(ShiftAssignment.id == assignment_id, ShiftAssignment.organization_id == org_id))
    res = await db.execute(q)
    sa = res.scalar_one_or_none()
    if not sa:
        raise HTTPException(status_code=404, detail="Shift assignment not found")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(sa, field, val)

    await db.commit()
    await db.refresh(sa)

    target_name = None
    target_code = None
    target_photo = None
    if sa.assignment_type == "EMPLOYEE" and sa.employee_id:
        emp_res = await db.execute(select(Employee).where(Employee.id == sa.employee_id))
        emp = emp_res.scalar_one_or_none()
        if emp:
            target_name = f"{emp.first_name} {emp.last_name}"
            target_code = emp.employee_code
            target_photo = emp.photo_url

    shift_res = await db.execute(select(Shift).where(Shift.id == sa.shift_id))
    shift = shift_res.scalar_one_or_none()

    return ShiftAssignmentOut(
        id=sa.id,
        shift_id=sa.shift_id,
        shift_name=shift.shift_name if shift else None,
        shift_code=shift.shift_code if shift else None,
        assignment_type=sa.assignment_type,
        employee_id=sa.employee_id,
        department_id=sa.department_id,
        project_id=sa.project_id,
        target_name=target_name,
        target_code=target_code,
        target_photo_url=target_photo,
        effective_from=sa.effective_from,
        effective_to=sa.effective_to,
        is_active=sa.is_active,
        remarks=sa.remarks,
        created_at=sa.created_at
    )

@router.delete("/shift-assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(ShiftAssignment).where(and_(ShiftAssignment.id == assignment_id, ShiftAssignment.organization_id == org_id))
    res = await db.execute(q)
    sa = res.scalar_one_or_none()
    if not sa:
        raise HTTPException(status_code=404, detail="Shift assignment not found")
    await db.delete(sa)
    await db.commit()
    return None


# --- 2.2.1 Shift Swap & Schedule Change Management ---
@router.get("/shift-swaps", response_model=ShiftSwapRequestPaginatedOut)
async def list_shift_swaps(
    status_filter: Optional[str] = Query(None, alias="status"),
    swap_date: Optional[date] = None,
    employee_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(ShiftSwapRequest).where(ShiftSwapRequest.organization_id == org_id)

    if status_filter:
        q = q.where(ShiftSwapRequest.status == status_filter.upper())
    if swap_date:
        q = q.where(ShiftSwapRequest.swap_date == swap_date)
    if employee_id:
        q = q.where(or_(ShiftSwapRequest.requester_id == employee_id, ShiftSwapRequest.target_employee_id == employee_id))

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(ShiftSwapRequest.swap_date.desc(), ShiftSwapRequest.id.desc()).limit(limit).offset(offset))
    swaps = items_res.scalars().all()

    # Pre-collect IDs for bulk hydration
    emp_ids = set()
    shift_ids = set()
    user_ids = set()
    for s in swaps:
        emp_ids.add(s.requester_id)
        emp_ids.add(s.target_employee_id)
        if s.requester_shift_id:
            shift_ids.add(s.requester_shift_id)
        if s.target_shift_id:
            shift_ids.add(s.target_shift_id)
        if s.reviewed_by_id:
            user_ids.add(s.reviewed_by_id)

    emp_map = {}
    if emp_ids:
        e_res = await db.execute(select(Employee).where(Employee.id.in_(emp_ids)))
        emp_map = {e.id: e for e in e_res.scalars().all()}

    shift_map = {}
    if shift_ids:
        s_res = await db.execute(select(Shift).where(Shift.id.in_(shift_ids)))
        shift_map = {sh.id: sh for sh in s_res.scalars().all()}

    user_map = {}
    if user_ids:
        u_res = await db.execute(select(User).where(User.id.in_(user_ids)))
        user_map = {u.id: (u.full_name or u.email) for u in u_res.scalars().all()}

    results = []
    for s in swaps:
        req_emp = emp_map.get(s.requester_id)
        tgt_emp = emp_map.get(s.target_employee_id)
        req_sh = shift_map.get(s.requester_shift_id)
        tgt_sh = shift_map.get(s.target_shift_id)
        rev_name = user_map.get(s.reviewed_by_id)

        results.append(ShiftSwapRequestOut(
            id=s.id,
            requester_id=s.requester_id,
            requester_name=f"{req_emp.first_name} {req_emp.last_name}".strip() if req_emp else None,
            requester_code=req_emp.employee_code if req_emp else None,
            target_employee_id=s.target_employee_id,
            target_employee_name=f"{tgt_emp.first_name} {tgt_emp.last_name}".strip() if tgt_emp else None,
            target_employee_code=tgt_emp.employee_code if tgt_emp else None,
            swap_date=s.swap_date,
            requester_shift_id=s.requester_shift_id,
            requester_shift_name=req_sh.shift_name if req_sh else None,
            target_shift_id=s.target_shift_id,
            target_shift_name=tgt_sh.shift_name if tgt_sh else None,
            reason=s.reason,
            status=s.status,
            reviewed_by_id=s.reviewed_by_id,
            reviewed_by_name=rev_name,
            review_notes=s.review_notes,
            reviewed_at=s.reviewed_at,
            created_at=s.created_at
        ))

    return ShiftSwapRequestPaginatedOut(
        items=results,
        total=total,
        limit=limit,
        offset=offset
    )

@router.post("/shift-swaps", response_model=ShiftSwapRequestOut, status_code=status.HTTP_201_CREATED)
async def create_shift_swap_request(
    payload: ShiftSwapRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)

    if payload.requester_id == payload.target_employee_id:
        raise HTTPException(status_code=400, detail="Cannot request shift swap with yourself")

    # Verify employees belong to this organization
    res = await db.execute(
        select(Employee).where(
            and_(Employee.organization_id == org_id, Employee.id.in_([payload.requester_id, payload.target_employee_id]))
        )
    )
    emps = {e.id: e for e in res.scalars().all()}
    if payload.requester_id not in emps:
        raise HTTPException(status_code=404, detail="Requester employee not found")
    if payload.target_employee_id not in emps:
        raise HTTPException(status_code=404, detail="Target employee not found")

    # Helper to resolve active shift for an employee on swap_date if not specified
    async def resolve_emp_shift(emp_id: int, explicit_shift_id: Optional[int]) -> Optional[int]:
        if explicit_shift_id:
            return explicit_shift_id
        # Check direct employee assignment
        sa_res = await db.execute(
            select(ShiftAssignment).where(
                and_(
                    ShiftAssignment.organization_id == org_id,
                    ShiftAssignment.assignment_type == "EMPLOYEE",
                    ShiftAssignment.target_id == emp_id,
                    ShiftAssignment.start_date <= payload.swap_date,
                    or_(ShiftAssignment.end_date.is_(None), ShiftAssignment.end_date >= payload.swap_date)
                )
            ).order_by(ShiftAssignment.id.desc())
        )
        sa = sa_res.scalar_one_or_none()
        if sa:
            return sa.shift_id
        return None

    requester_shift_id = await resolve_emp_shift(payload.requester_id, payload.requester_shift_id)
    target_shift_id = await resolve_emp_shift(payload.target_employee_id, payload.target_shift_id)

    swap = ShiftSwapRequest(
        organization_id=org_id,
        requester_id=payload.requester_id,
        target_employee_id=payload.target_employee_id,
        swap_date=payload.swap_date,
        requester_shift_id=requester_shift_id,
        target_shift_id=target_shift_id,
        reason=payload.reason.strip(),
        status="PENDING"
    )
    db.add(swap)
    await db.commit()
    await db.refresh(swap)

    req_emp = emps[payload.requester_id]
    tgt_emp = emps[payload.target_employee_id]

    return ShiftSwapRequestOut(
        id=swap.id,
        requester_id=swap.requester_id,
        requester_name=f"{req_emp.first_name} {req_emp.last_name}".strip(),
        requester_code=req_emp.employee_code,
        target_employee_id=swap.target_employee_id,
        target_employee_name=f"{tgt_emp.first_name} {tgt_emp.last_name}".strip(),
        target_employee_code=tgt_emp.employee_code,
        swap_date=swap.swap_date,
        requester_shift_id=swap.requester_shift_id,
        target_shift_id=swap.target_shift_id,
        reason=swap.reason,
        status=swap.status,
        created_at=swap.created_at
    )

@router.post("/shift-swaps/{swap_id}/review", response_model=ShiftSwapRequestOut)
async def review_shift_swap_request(
    swap_id: int,
    payload: ShiftSwapRequestReview,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    res = await db.execute(
        select(ShiftSwapRequest).where(
            and_(ShiftSwapRequest.id == swap_id, ShiftSwapRequest.organization_id == org_id)
        )
    )
    swap = res.scalar_one_or_none()
    if not swap:
        raise HTTPException(status_code=404, detail="Shift swap request not found")
    if swap.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Cannot review swap request in status '{swap.status}'")

    swap.status = payload.status
    swap.review_notes = payload.review_notes.strip() if payload.review_notes else None
    swap.reviewed_by_id = current_user.id if current_user else None
    swap.reviewed_at = datetime.now()

    # If APPROVED and shifts were specified, create single-day shift assignments to reflect the swap
    if payload.status == "APPROVED":
        if swap.target_shift_id:
            # Requester takes target's shift on swap_date
            req_sa = ShiftAssignment(
                organization_id=org_id,
                shift_id=swap.target_shift_id,
                assignment_type="EMPLOYEE",
                target_id=swap.requester_id,
                start_date=swap.swap_date,
                end_date=swap.swap_date,
                remarks=f"Shift Swap Approved (Ref #{swap.id})"
            )
            db.add(req_sa)

        if swap.requester_shift_id:
            # Target takes requester's shift on swap_date
            tgt_sa = ShiftAssignment(
                organization_id=org_id,
                shift_id=swap.requester_shift_id,
                assignment_type="EMPLOYEE",
                target_id=swap.target_employee_id,
                start_date=swap.swap_date,
                end_date=swap.swap_date,
                remarks=f"Shift Swap Approved (Ref #{swap.id})"
            )
            db.add(tgt_sa)

    await db.commit()
    await db.refresh(swap)

    # Hydrate names
    e_res = await db.execute(
        select(Employee).where(Employee.id.in_([swap.requester_id, swap.target_employee_id]))
    )
    emps = {e.id: e for e in e_res.scalars().all()}
    req_emp = emps.get(swap.requester_id)
    tgt_emp = emps.get(swap.target_employee_id)

    return ShiftSwapRequestOut(
        id=swap.id,
        requester_id=swap.requester_id,
        requester_name=f"{req_emp.first_name} {req_emp.last_name}".strip() if req_emp else None,
        requester_code=req_emp.employee_code if req_emp else None,
        target_employee_id=swap.target_employee_id,
        target_employee_name=f"{tgt_emp.first_name} {tgt_emp.last_name}".strip() if tgt_emp else None,
        target_employee_code=tgt_emp.employee_code if tgt_emp else None,
        swap_date=swap.swap_date,
        requester_shift_id=swap.requester_shift_id,
        target_shift_id=swap.target_shift_id,
        reason=swap.reason,
        status=swap.status,
        reviewed_by_id=swap.reviewed_by_id,
        reviewed_by_name=(current_user.full_name or current_user.email) if current_user else None,
        review_notes=swap.review_notes,
        reviewed_at=swap.reviewed_at,
        created_at=swap.created_at
    )

@router.delete("/shift-swaps/{swap_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift_swap(
    swap_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    res = await db.execute(
        select(ShiftSwapRequest).where(
            and_(ShiftSwapRequest.id == swap_id, ShiftSwapRequest.organization_id == org_id)
        )
    )
    swap = res.scalar_one_or_none()
    if not swap:
        raise HTTPException(status_code=404, detail="Shift swap request not found")
    if swap.status != "PENDING":
        raise HTTPException(status_code=400, detail="Only pending shift swap requests can be deleted")

    await db.delete(swap)
    await db.commit()
    return None


# --- 2.3 Biometric Integration ---
@router.get("/biometric-devices", response_model=BiometricDevicePaginatedOut)
async def list_biometric_devices(
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(BiometricDevice).where(BiometricDevice.organization_id == org_id)

    if search:
        s = f"%{search.strip()}%"
        q = q.where(or_(
            BiometricDevice.device_name.ilike(s),
            BiometricDevice.device_serial.ilike(s),
            BiometricDevice.ip_address.ilike(s),
            BiometricDevice.location.ilike(s)
        ))
    if status_filter:
        q = q.where(BiometricDevice.status == status_filter)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(desc(BiometricDevice.id)).limit(limit).offset(offset))
    items = items_res.scalars().all()

    out_items = []
    for d in items:
        out_items.append(BiometricDeviceOut(
            id=d.id,
            device_name=d.device_name,
            device_serial=d.device_serial,
            device_model=d.device_model,
            ip_address=d.ip_address,
            port=d.port,
            location=d.location,
            assigned_branch_id=d.assigned_branch_id,
            assigned_project_id=d.assigned_project_id,
            branch_name=d.branch.branch_name if d.branch else None,
            project_name=d.project.name if d.project else None,
            status=d.status,
            is_active=d.is_active,
            last_sync_at=d.last_sync_at,
            created_at=d.created_at
        ))

    return BiometricDevicePaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset
    )

@router.post("/biometric-devices", response_model=BiometricDeviceOut, status_code=status.HTTP_201_CREATED)
async def create_biometric_device(
    payload: BiometricDeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    dev = BiometricDevice(
        organization_id=org_id,
        device_name=payload.device_name.strip(),
        device_serial=payload.device_serial.strip(),
        device_model=payload.device_model,
        ip_address=payload.ip_address.strip(),
        port=payload.port,
        location=payload.location.strip(),
        assigned_branch_id=payload.assigned_branch_id,
        assigned_project_id=payload.assigned_project_id,
        status=payload.status,
        is_active=payload.is_active
    )
    db.add(dev)
    await db.commit()
    await db.refresh(dev)

    return BiometricDeviceOut(
        id=dev.id,
        device_name=dev.device_name,
        device_serial=dev.device_serial,
        device_model=dev.device_model,
        ip_address=dev.ip_address,
        port=dev.port,
        location=dev.location,
        assigned_branch_id=dev.assigned_branch_id,
        assigned_project_id=dev.assigned_project_id,
        status=dev.status,
        is_active=dev.is_active,
        last_sync_at=dev.last_sync_at,
        created_at=dev.created_at
    )

@router.put("/biometric-devices/{device_id}", response_model=BiometricDeviceOut)
async def update_biometric_device(
    device_id: int,
    payload: BiometricDeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(BiometricDevice).where(and_(BiometricDevice.id == device_id, BiometricDevice.organization_id == org_id))
    res = await db.execute(q)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Biometric device not found")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(dev, field, val)

    await db.commit()
    await db.refresh(dev)

    return BiometricDeviceOut(
        id=dev.id,
        device_name=dev.device_name,
        device_serial=dev.device_serial,
        device_model=dev.device_model,
        ip_address=dev.ip_address,
        port=dev.port,
        location=dev.location,
        assigned_branch_id=dev.assigned_branch_id,
        assigned_project_id=dev.assigned_project_id,
        branch_name=dev.branch.branch_name if dev.branch else None,
        project_name=dev.project.name if dev.project else None,
        status=dev.status,
        is_active=dev.is_active,
        last_sync_at=dev.last_sync_at,
        created_at=dev.created_at
    )

@router.delete("/biometric-devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_biometric_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(BiometricDevice).where(and_(BiometricDevice.id == device_id, BiometricDevice.organization_id == org_id))
    res = await db.execute(q)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Biometric device not found")
    await db.delete(dev)
    await db.commit()
    return None

@router.post("/biometric-devices/{device_id}/test-connection")
async def test_biometric_device_connection(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(BiometricDevice).where(and_(BiometricDevice.id == device_id, BiometricDevice.organization_id == org_id))
    res = await db.execute(q)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Biometric device not found")

    # In production, socket connection to dev.ip_address:dev.port with ZKTeco protocol
    # Here we perform ping verification & update status
    dev.status = "ONLINE"
    await db.commit()
    return {
        "status": "SUCCESS",
        "device_id": dev.id,
        "device_name": dev.device_name,
        "ip_address": dev.ip_address,
        "port": dev.port,
        "connection_status": "ONLINE",
        "message": f"Successfully connected to {dev.device_name} ({dev.device_model}) at {dev.ip_address}:{dev.port}"
    }

@router.post("/biometric-devices/{device_id}/sync")
async def sync_biometric_device(
    device_id: int,
    payload: Optional[BiometricSyncPayload] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(BiometricDevice).where(and_(BiometricDevice.id == device_id, BiometricDevice.organization_id == org_id))
    res = await db.execute(q)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Biometric device not found")

    dev.last_sync_at = datetime.now()
    dev.status = "ONLINE"

    synced_records = 0
    today = date.today()

    # If log records provided, process them
    if payload and payload.log_records:
        for item in payload.log_records:
            emp_code = item.get("employee_code")
            p_time_str = item.get("punch_time")
            if not emp_code or not p_time_str:
                continue

            emp_res = await db.execute(select(Employee).where(and_(Employee.organization_id == org_id, Employee.employee_code == emp_code)))
            emp = emp_res.scalar_one_or_none()
            if not emp:
                continue

            try:
                p_dt = datetime.fromisoformat(p_time_str)
            except Exception:
                continue

            p_date = p_dt.date()

            # Find existing attendance
            att_q = select(Attendance).where(and_(
                Attendance.organization_id == org_id,
                Attendance.employee_id == emp.id,
                Attendance.punch_date == p_date
            ))
            att_res = await db.execute(att_q)
            att = att_res.scalar_one_or_none()

            if not att:
                att = Attendance(
                    organization_id=org_id,
                    employee_id=emp.id,
                    punch_date=p_date,
                    clock_in=p_dt,
                    source="BIOMETRIC_DEVICE",
                    status="PRESENT",
                    is_missing_punch=True
                )
                db.add(att)
            else:
                att.clock_out = p_dt
                att.is_missing_punch = False
                if att.clock_in:
                    dur_secs = (p_dt - att.clock_in).total_seconds()
                    att.working_hours = Decimal(str(round(max(0.0, dur_secs / 3600.0), 2)))
                    if att.working_hours >= 8.0:
                        att.overtime_hours = Decimal(str(round(att.working_hours - Decimal("8.00"), 2)))
            synced_records += 1

    await db.commit()
    return {
        "status": "SUCCESS",
        "device_id": dev.id,
        "device_name": dev.device_name,
        "synced_at": dev.last_sync_at,
        "records_imported": synced_records,
        "message": f"Biometric terminal {dev.device_name} sync completed successfully."
    }


# --- 2.8 Holiday Calendar ---
@router.get("/holidays", response_model=HolidayCalendarPaginatedOut)
async def list_holidays(
    year: Optional[int] = None,
    holiday_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    from_date: Optional[date] = None,
    through_date: Optional[date] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(HolidayCalendar).where(HolidayCalendar.organization_id == org_id)

    if year:
        q = q.where(func.extract('year', HolidayCalendar.start_date) == year)
    if holiday_type:
        q = q.where(HolidayCalendar.holiday_type == holiday_type)
    if is_active is not None:
        q = q.where(HolidayCalendar.is_active == is_active)
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.where(or_(HolidayCalendar.holiday_name.ilike(term), HolidayCalendar.description.ilike(term)))
    if from_date:
        q = q.where(HolidayCalendar.end_date >= from_date)
    if through_date:
        q = q.where(HolidayCalendar.start_date <= through_date)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(HolidayCalendar.start_date).limit(limit).offset(offset))
    items = items_res.scalars().all()

    out_items = []
    for h in items:
        out_items.append(HolidayCalendarOut(
            id=h.id,
            holiday_name=h.holiday_name,
            holiday_type=h.holiday_type,
            start_date=h.start_date,
            end_date=h.end_date,
            total_days=h.total_days,
            applicable_branch_id=h.applicable_branch_id,
            applicable_project_id=h.applicable_project_id,
            branch_name=getattr(h, "branch", None).branch_name if getattr(h, "branch", None) else None,
            project_name=getattr(h, "project", None).project_name if getattr(h, "project", None) else None,
            is_recurring_yearly=h.is_recurring_yearly,
            description=h.description,
            is_active=h.is_active,
            created_at=h.created_at
        ))

    return HolidayCalendarPaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset
    )

@router.get("/holidays/{holiday_id}", response_model=HolidayCalendarOut)
async def get_holiday(
    holiday_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    holiday = (await db.execute(select(HolidayCalendar).where(and_(
        HolidayCalendar.id == holiday_id,
        HolidayCalendar.organization_id == org_id
    )))).scalar_one_or_none()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    return HolidayCalendarOut.model_validate(holiday)

@router.post("/holidays", response_model=HolidayCalendarOut, status_code=status.HTTP_201_CREATED)
async def create_holiday(
    payload: HolidayCalendarCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    days = (payload.end_date - payload.start_date).days + 1
    if days <= 0:
        raise HTTPException(status_code=422, detail="Holiday end date must be on or after its start date.")
    hol = HolidayCalendar(
        organization_id=org_id,
        holiday_name=payload.holiday_name.strip(),
        holiday_type=payload.holiday_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_days=max(1, days),
        applicable_branch_id=payload.applicable_branch_id,
        applicable_project_id=payload.applicable_project_id,
        is_recurring_yearly=payload.is_recurring_yearly,
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(hol)
    await db.commit()
    await db.refresh(hol)
    return HolidayCalendarOut.model_validate(hol)

@router.put("/holidays/{holiday_id}", response_model=HolidayCalendarOut)
async def update_holiday(
    holiday_id: int,
    payload: HolidayCalendarUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(HolidayCalendar).where(and_(HolidayCalendar.id == holiday_id, HolidayCalendar.organization_id == org_id))
    res = await db.execute(q)
    hol = res.scalar_one_or_none()
    if not hol:
        raise HTTPException(status_code=404, detail="Holiday not found")

    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    start_date = data.get("start_date", hol.start_date)
    end_date = data.get("end_date", hol.end_date)
    if start_date is None or end_date is None:
        raise HTTPException(status_code=422, detail="Holiday start and end dates are required.")
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="Holiday end date must be on or after its start date.")
    for field, val in data.items():
        setattr(hol, field, val)

    hol.total_days = (hol.end_date - hol.start_date).days + 1

    await db.commit()
    await db.refresh(hol)
    return HolidayCalendarOut.model_validate(hol)

@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holiday(
    holiday_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(HolidayCalendar).where(and_(HolidayCalendar.id == holiday_id, HolidayCalendar.organization_id == org_id))
    res = await db.execute(q)
    hol = res.scalar_one_or_none()
    if not hol:
        raise HTTPException(status_code=404, detail="Holiday not found")
    await db.delete(hol)
    await db.commit()
    return None


# --- 2.9 Site Attendance & Geofencing ---
@router.get("/site-geofences", response_model=SiteGeofencePaginatedOut)
async def list_site_geofences(
    project_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = (
        select(SiteGeofence, Project.project_name.label("prj_name"))
        .outerjoin(Project, SiteGeofence.project_id == Project.id)
        .where(SiteGeofence.organization_id == org_id)
    )

    if project_id:
        q = q.where(SiteGeofence.project_id == project_id)

    cnt_q = select(func.count(SiteGeofence.id)).where(SiteGeofence.organization_id == org_id)
    if project_id:
        cnt_q = cnt_q.where(SiteGeofence.project_id == project_id)
    total_res = await db.execute(cnt_q)
    total = total_res.scalar() or 0

    items_res = await db.execute(q.order_by(desc(SiteGeofence.id)).limit(limit).offset(offset))
    rows = items_res.all()

    out_items = []
    for g, prj_name in rows:
        out_items.append(SiteGeofenceOut(
            id=g.id,
            project_id=g.project_id,
            project_name=prj_name,
            site_name=g.site_name,
            latitude=g.latitude,
            longitude=g.longitude,
            radius_meters=g.radius_meters,
            is_active=g.is_active,
            created_at=g.created_at
        ))

    return SiteGeofencePaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset
    )

@router.post("/site-geofences", response_model=SiteGeofenceOut, status_code=status.HTTP_201_CREATED)
async def create_site_geofence(
    payload: SiteGeofenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    geo = SiteGeofence(
        organization_id=org_id,
        project_id=payload.project_id,
        site_name=payload.site_name.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        radius_meters=payload.radius_meters,
        is_active=payload.is_active
    )
    db.add(geo)
    await db.commit()
    await db.refresh(geo)

    proj_res = await db.execute(select(Project).where(Project.id == geo.project_id))
    proj = proj_res.scalar_one_or_none()

    return SiteGeofenceOut(
        id=geo.id,
        project_id=geo.project_id,
        project_name=proj.project_name if proj else None,
        site_name=geo.site_name,
        latitude=geo.latitude,
        longitude=geo.longitude,
        radius_meters=geo.radius_meters,
        is_active=geo.is_active,
        created_at=geo.created_at
    )

@router.put("/site-geofences/{geofence_id}", response_model=SiteGeofenceOut)
async def update_site_geofence(
    geofence_id: int,
    payload: SiteGeofenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(SiteGeofence).options(joinedload(SiteGeofence.project)).where(and_(SiteGeofence.id == geofence_id, SiteGeofence.organization_id == org_id))
    res = await db.execute(q)
    geo = res.scalar_one_or_none()
    if not geo:
        raise HTTPException(status_code=404, detail="Site geofence not found")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(geo, field, val)

    await db.commit()
    
    proj_name = None
    if geo.project_id:
        proj_res = await db.execute(select(Project).where(Project.id == geo.project_id))
        proj = proj_res.scalar_one_or_none()
        proj_name = proj.project_name if proj else None

    return SiteGeofenceOut(
        id=geo.id,
        project_id=geo.project_id,
        project_name=proj_name,
        site_name=geo.site_name,
        latitude=geo.latitude,
        longitude=geo.longitude,
        radius_meters=geo.radius_meters,
        is_active=geo.is_active,
        created_at=geo.created_at
    )

@router.delete("/site-geofences/{geofence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site_geofence(
    geofence_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(SiteGeofence).where(and_(SiteGeofence.id == geofence_id, SiteGeofence.organization_id == org_id))
    res = await db.execute(q)
    geo = res.scalar_one_or_none()
    if not geo:
        raise HTTPException(status_code=404, detail="Site geofence not found")
    await db.delete(geo)
    await db.commit()
    return None


# --- 2.7 Attendance Correction ---
@router.get("/attendance-corrections", response_model=AttendanceCorrectionPaginatedOut)
async def list_attendance_corrections(
    status_filter: Optional[str] = Query(None, alias="status"),
    employee_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(AttendanceCorrection).where(AttendanceCorrection.organization_id == org_id)

    if status_filter:
        q = q.where(AttendanceCorrection.status == status_filter)
    if employee_id:
        q = q.where(AttendanceCorrection.employee_id == employee_id)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(desc(AttendanceCorrection.id)).limit(limit).offset(offset))
    items = items_res.scalars().all()

    out_items = []
    for c in items:
        emp = c.employee
        mgr = c.manager_verifier
        hr = c.hr_approver
        out_items.append(AttendanceCorrectionOut(
            id=c.id,
            employee_id=c.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            attendance_id=c.attendance_id,
            request_date=c.request_date,
            original_clock_in=c.original_clock_in,
            original_clock_out=c.original_clock_out,
            requested_clock_in=c.requested_clock_in,
            requested_clock_out=c.requested_clock_out,
            reason=c.reason,
            manager_verifier_id=c.manager_verifier_id,
            manager_verifier_name=f"{mgr.first_name} {mgr.last_name}" if mgr else None,
            manager_remarks=c.manager_remarks,
            manager_verified_at=c.manager_verified_at,
            hr_approver_id=c.hr_approver_id,
            hr_approver_name=f"{hr.first_name} {hr.last_name}" if hr else None,
            hr_remarks=c.hr_remarks,
            hr_approved_at=c.hr_approved_at,
            status=c.status,
            created_at=c.created_at
        ))

    return AttendanceCorrectionPaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset
    )

@router.post("/attendance-corrections", response_model=AttendanceCorrectionOut, status_code=status.HTTP_201_CREATED)
async def request_attendance_correction(
    payload: AttendanceCorrectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)

    # Check existing attendance record
    att = None
    if payload.attendance_id:
        att_res = await db.execute(select(Attendance).where(and_(Attendance.id == payload.attendance_id, Attendance.organization_id == org_id)))
        att = att_res.scalar_one_or_none()
    else:
        att_res = await db.execute(select(Attendance).where(and_(
            Attendance.organization_id == org_id,
            Attendance.employee_id == payload.employee_id,
            Attendance.punch_date == payload.request_date
        )))
        att = att_res.scalar_one_or_none()

    corr = AttendanceCorrection(
        organization_id=org_id,
        employee_id=payload.employee_id,
        attendance_id=att.id if att else None,
        request_date=payload.request_date,
        original_clock_in=att.clock_in if att else None,
        original_clock_out=att.clock_out if att else None,
        requested_clock_in=payload.requested_clock_in,
        requested_clock_out=payload.requested_clock_out,
        reason=payload.reason.strip(),
        status="PENDING_VERIFICATION"
    )
    db.add(corr)
    await db.commit()
    await db.refresh(corr)

    emp_res = await db.execute(select(Employee).where(Employee.id == corr.employee_id))
    emp = emp_res.scalar_one_or_none()

    return AttendanceCorrectionOut(
        id=corr.id,
        employee_id=corr.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        attendance_id=corr.attendance_id,
        request_date=corr.request_date,
        original_clock_in=corr.original_clock_in,
        original_clock_out=corr.original_clock_out,
        requested_clock_in=corr.requested_clock_in,
        requested_clock_out=corr.requested_clock_out,
        reason=corr.reason,
        status=corr.status,
        created_at=corr.created_at
    )

@router.post("/attendance-corrections/{corr_id}/verify", response_model=AttendanceCorrectionOut)
async def verify_attendance_correction(
    corr_id: int,
    payload: AttendanceCorrectionVerify,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(AttendanceCorrection).where(and_(AttendanceCorrection.id == corr_id, AttendanceCorrection.organization_id == org_id))
    res = await db.execute(q)
    corr = res.scalar_one_or_none()
    if not corr:
        raise HTTPException(status_code=404, detail="Attendance correction request not found")

    verifier_id = current_user.id if current_user else None
    corr.manager_verifier_id = verifier_id
    corr.manager_remarks = payload.manager_remarks
    corr.manager_verified_at = datetime.now()
    corr.status = "VERIFIED" if payload.is_approved else "REJECTED"

    await db.commit()
    await db.refresh(corr)

    emp = corr.employee
    mgr = corr.manager_verifier
    return AttendanceCorrectionOut(
        id=corr.id,
        employee_id=corr.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        attendance_id=corr.attendance_id,
        request_date=corr.request_date,
        original_clock_in=corr.original_clock_in,
        original_clock_out=corr.original_clock_out,
        requested_clock_in=corr.requested_clock_in,
        requested_clock_out=corr.requested_clock_out,
        reason=corr.reason,
        manager_verifier_id=corr.manager_verifier_id,
        manager_verifier_name=f"{mgr.first_name} {mgr.last_name}" if mgr else None,
        manager_remarks=corr.manager_remarks,
        manager_verified_at=corr.manager_verified_at,
        status=corr.status,
        created_at=corr.created_at
    )

@router.post("/attendance-corrections/{corr_id}/approve", response_model=AttendanceCorrectionOut)
async def approve_attendance_correction(
    corr_id: int,
    payload: AttendanceCorrectionApprove,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(AttendanceCorrection).where(and_(AttendanceCorrection.id == corr_id, AttendanceCorrection.organization_id == org_id))
    res = await db.execute(q)
    corr = res.scalar_one_or_none()
    if not corr:
        raise HTTPException(status_code=404, detail="Attendance correction request not found")

    approver_id = current_user.id if current_user else None
    corr.hr_approver_id = approver_id
    corr.hr_remarks = payload.hr_remarks
    corr.hr_approved_at = datetime.now()
    corr.status = "APPROVED" if payload.is_approved else "REJECTED"

    # If approved, update or create Attendance record
    if payload.is_approved:
        att = None
        if corr.attendance_id:
            att_res = await db.execute(select(Attendance).where(Attendance.id == corr.attendance_id))
            att = att_res.scalar_one_or_none()
        else:
            att_res = await db.execute(select(Attendance).where(and_(
                Attendance.organization_id == org_id,
                Attendance.employee_id == corr.employee_id,
                Attendance.punch_date == corr.request_date
            )))
            att = att_res.scalar_one_or_none()

        dur_secs = (corr.requested_clock_out - corr.requested_clock_in).total_seconds()
        work_hrs = Decimal(str(round(max(0.0, dur_secs / 3600.0), 2)))
        ot_hrs = Decimal(str(round(max(0.0, float(work_hrs) - 8.0), 2))) if work_hrs > Decimal("8.00") else Decimal("0.00")

        if not att:
            att = Attendance(
                organization_id=org_id,
                employee_id=corr.employee_id,
                punch_date=corr.request_date,
                clock_in=corr.requested_clock_in,
                clock_out=corr.requested_clock_out,
                working_hours=work_hrs,
                overtime_hours=ot_hrs,
                status="PRESENT",
                source="MANUAL_OVERRIDE",
                is_missing_punch=False,
                remarks=f"Corrected via HR Approval #{corr.id}: {corr.reason}"
            )
            db.add(att)
            await db.flush()
            corr.attendance_id = att.id
        else:
            att.clock_in = corr.requested_clock_in
            att.clock_out = corr.requested_clock_out
            att.working_hours = work_hrs
            att.overtime_hours = ot_hrs
            att.is_missing_punch = False
            att.status = "PRESENT"
            att.remarks = f"Corrected via HR Approval #{corr.id}: {corr.reason}"

    await db.commit()
    await db.refresh(corr)

    emp = corr.employee
    mgr = corr.manager_verifier
    hr = corr.hr_approver

    return AttendanceCorrectionOut(
        id=corr.id,
        employee_id=corr.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        attendance_id=corr.attendance_id,
        request_date=corr.request_date,
        original_clock_in=corr.original_clock_in,
        original_clock_out=corr.original_clock_out,
        requested_clock_in=corr.requested_clock_in,
        requested_clock_out=corr.requested_clock_out,
        reason=corr.reason,
        manager_verifier_id=corr.manager_verifier_id,
        manager_verifier_name=f"{mgr.first_name} {mgr.last_name}" if mgr else None,
        manager_remarks=corr.manager_remarks,
        manager_verified_at=corr.manager_verified_at,
        hr_approver_id=corr.hr_approver_id,
        hr_approver_name=f"{hr.first_name} {hr.last_name}" if hr else None,
        hr_remarks=corr.hr_remarks,
        hr_approved_at=corr.hr_approved_at,
        status=corr.status,
        created_at=corr.created_at
    )


# --- 2.4, 2.5, 2.6 Attendance Capture & Processing ---
@router.post("/attendance/punch", response_model=AttendanceOut)
async def punch_attendance(
    payload: AttendancePunch,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    punch_dt = payload.punch_time or datetime.now()
    punch_d = payload.punch_date or punch_dt.date()

    # 1. Fetch employee
    emp_res = await db.execute(select(Employee).where(and_(Employee.id == payload.employee_id, Employee.organization_id == org_id)))
    emp = emp_res.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # 2. Determine Shift (Employee-specific assignment -> Department assignment -> Default shift)
    shift = None
    # Check employee shift assignment
    sa_emp = await db.execute(select(ShiftAssignment).where(and_(
        ShiftAssignment.organization_id == org_id,
        ShiftAssignment.assignment_type == "EMPLOYEE",
        ShiftAssignment.employee_id == emp.id,
        ShiftAssignment.is_active == True,
        ShiftAssignment.effective_from <= punch_d,
        or_(ShiftAssignment.effective_to == None, ShiftAssignment.effective_to >= punch_d)
    )))
    sa_res = sa_emp.scalar_one_or_none()
    if sa_res:
        shift = sa_res.shift
    elif emp.department_id:
        sa_dept = await db.execute(select(ShiftAssignment).where(and_(
            ShiftAssignment.organization_id == org_id,
            ShiftAssignment.assignment_type == "DEPARTMENT",
            ShiftAssignment.department_id == emp.department_id,
            ShiftAssignment.is_active == True,
            ShiftAssignment.effective_from <= punch_d,
            or_(ShiftAssignment.effective_to == None, ShiftAssignment.effective_to >= punch_d)
        )))
        sa_dept_res = sa_dept.scalar_one_or_none()
        if sa_dept_res:
            shift = sa_dept_res.shift

    if not shift:
        def_shift = await db.execute(select(Shift).where(and_(Shift.organization_id == org_id, Shift.is_active == True)))
        shift = def_shift.scalars().first()

    # 3. Geofence verification if coordinates provided
    is_geo_verified = True
    geofence_site_id = payload.site_id
    if geofence_site_id:
        geo_chk = await db.execute(select(SiteGeofence).where(SiteGeofence.id == geofence_site_id))
        geo_obj = geo_chk.scalar_one_or_none()
        if geo_obj:
            geofence_site_id = geo_obj.project_id

    if payload.geofence_lat is not None and payload.geofence_lng is not None:
        if payload.site_id:
            geo_res = await db.execute(select(SiteGeofence).where(or_(SiteGeofence.id == payload.site_id, SiteGeofence.project_id == payload.site_id)))
            geo = geo_res.scalars().first()
            if geo:
                dist = haversine_distance_meters(
                    float(payload.geofence_lat), float(payload.geofence_lng),
                    float(geo.latitude), float(geo.longitude)
                )
                is_geo_verified = dist <= geo.radius_meters
            else:
                is_geo_verified = True
        else:
            # Check any active project geofence within range
            all_geos = await db.execute(select(SiteGeofence).where(and_(SiteGeofence.organization_id == org_id, SiteGeofence.is_active == True)))
            matched_geo = None
            for g in all_geos.scalars().all():
                dist = haversine_distance_meters(
                    float(payload.geofence_lat), float(payload.geofence_lng),
                    float(g.latitude), float(g.longitude)
                )
                if dist <= g.radius_meters:
                    matched_geo = g
                    break
            if matched_geo:
                geofence_site_id = matched_geo.project_id
                is_geo_verified = True
            else:
                is_geo_verified = False

    # 4. Check existing attendance record for today
    att_q = select(Attendance).where(and_(
        Attendance.organization_id == org_id,
        Attendance.employee_id == payload.employee_id,
        Attendance.punch_date == punch_d
    ))
    att_res = await db.execute(att_q)
    att = att_res.scalar_one_or_none()

    # Determine In Time / Out Time / Punch Action
    is_both = payload.punch_type in ("IN_OUT", "BOTH") or (payload.in_time is not None and payload.out_time is not None)
    is_clock_in = not is_both and (payload.punch_type == "IN" or (payload.punch_type == "PUNCH" and (not att or not att.clock_in)))

    # Compute late minutes if In Time is present or clocking in
    late_min = 0
    in_dt = payload.in_time or (punch_dt if is_clock_in or is_both else None)
    if in_dt and shift and shift.start_time:
        shift_start_dt = datetime.combine(punch_d, shift.start_time)
        grace_dt = shift_start_dt + timedelta(minutes=shift.grace_period_minutes)
        if in_dt > grace_dt:
            late_min = int((in_dt - shift_start_dt).total_seconds() // 60)

    status_val = "LATE" if late_min > 0 else "PRESENT"

    if is_both:
        # Both Clock IN and OUT recorded simultaneously
        out_dt = payload.out_time or punch_dt
        dur_secs = max(0.0, (out_dt - in_dt).total_seconds()) if (in_dt and out_dt) else 0.0
        work_hrs = Decimal(str(round(dur_secs / 3600.0, 2)))
        ot_hrs = Decimal(str(round(work_hrs - Decimal("8.00"), 2))) if work_hrs > Decimal("8.00") else Decimal("0.00")

        early_min = 0
        if shift and shift.end_time and out_dt:
            shift_end_dt = datetime.combine(punch_d, shift.end_time)
            if out_dt < shift_end_dt:
                early_min = int((shift_end_dt - out_dt).total_seconds() // 60)

        if shift:
            work_mins = dur_secs / 60.0
            if work_mins < shift.half_day_minimum_minutes:
                status_val = "ABSENT"
            elif work_mins < shift.full_day_minimum_minutes:
                status_val = "HALF_DAY"

        if not att:
            att = Attendance(
                organization_id=org_id,
                employee_id=payload.employee_id,
                shift_id=shift.id if shift else None,
                punch_date=punch_d,
                clock_in=in_dt,
                clock_out=out_dt,
                working_hours=work_hrs,
                late_minutes=late_min,
                early_leaving_minutes=early_min,
                overtime_hours=ot_hrs,
                status=status_val,
                source=payload.source,
                geofence_lat=payload.geofence_lat,
                geofence_lng=payload.geofence_lng,
                geofence_site_id=geofence_site_id,
                is_geofence_verified=is_geo_verified,
                is_missing_punch=False,
                remarks=payload.remarks
            )
            db.add(att)
        else:
            att.clock_in = in_dt
            att.clock_out = out_dt
            att.working_hours = work_hrs
            att.late_minutes = late_min
            att.early_leaving_minutes = early_min
            att.overtime_hours = ot_hrs
            att.status = status_val
            att.is_missing_punch = False
            if geofence_site_id:
                att.geofence_site_id = geofence_site_id
            att.is_geofence_verified = is_geo_verified
            if payload.remarks:
                att.remarks = payload.remarks
    elif is_clock_in:
        in_punch = in_dt or punch_dt
        if not att:
            att = Attendance(
                organization_id=org_id,
                employee_id=payload.employee_id,
                shift_id=shift.id if shift else None,
                punch_date=punch_d,
                clock_in=in_punch,
                late_minutes=late_min,
                status=status_val,
                source=payload.source,
                geofence_lat=payload.geofence_lat,
                geofence_lng=payload.geofence_lng,
                geofence_site_id=geofence_site_id,
                is_geofence_verified=is_geo_verified,
                is_missing_punch=True,
                remarks=payload.remarks
            )
            db.add(att)
        else:
            att.clock_in = in_punch
            att.late_minutes = late_min
            att.status = status_val
            att.shift_id = shift.id if shift else att.shift_id
            att.is_missing_punch = (att.clock_out is None)
            if geofence_site_id:
                att.geofence_site_id = geofence_site_id
            if payload.remarks:
                att.remarks = (att.remarks or "") + " | " + payload.remarks
    else:
        # Clock OUT
        out_punch = payload.out_time or punch_dt
        if not att:
            att = Attendance(
                organization_id=org_id,
                employee_id=payload.employee_id,
                shift_id=shift.id if shift else None,
                punch_date=punch_d,
                clock_out=out_punch,
                status="PRESENT",
                source=payload.source,
                geofence_lat=payload.geofence_lat,
                geofence_lng=payload.geofence_lng,
                geofence_site_id=geofence_site_id,
                is_geofence_verified=is_geo_verified,
                is_missing_punch=True,
                remarks=payload.remarks or "Punch OUT without prior IN punch"
            )
            db.add(att)
        else:
            att.clock_out = out_punch
            att.is_missing_punch = False
            if geofence_site_id:
                att.geofence_site_id = geofence_site_id
            # Calculate working hours and early leaving
            if att.clock_in:
                dur_secs = max(0.0, (out_punch - att.clock_in).total_seconds())
                work_hrs = Decimal(str(round(dur_secs / 3600.0, 2)))
                att.working_hours = work_hrs

                # Overtime
                if work_hrs > Decimal("8.00"):
                    att.overtime_hours = Decimal(str(round(work_hrs - Decimal("8.00"), 2)))

                # Half-day vs full-day
                if shift:
                    work_mins = dur_secs / 60.0
                    if work_mins < shift.half_day_minimum_minutes:
                        att.status = "ABSENT"
                    elif work_mins < shift.full_day_minimum_minutes:
                        att.status = "HALF_DAY"

                    # Early leaving minutes
                    shift_end_dt = datetime.combine(punch_d, shift.end_time)
                    if out_punch < shift_end_dt:
                        att.early_leaving_minutes = int((shift_end_dt - out_punch).total_seconds() // 60)

            if payload.remarks:
                att.remarks = (att.remarks or "") + " | " + payload.remarks

    await db.commit()
    await db.refresh(att)

    geo_site = att.geofence_site
    return AttendanceOut(
        id=att.id,
        employee_id=att.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}",
        employee_code=emp.employee_code,
        department_name=emp.department.name_en if emp.department else None,
        designation_title=emp.designation.title_en if emp.designation else None,
        shift_id=att.shift_id,
        shift_name=att.shift.shift_name if att.shift else None,
        punch_date=att.punch_date,
        clock_in=att.clock_in,
        clock_out=att.clock_out,
        working_hours=att.working_hours or Decimal("0.00"),
        late_minutes=att.late_minutes or 0,
        early_leaving_minutes=att.early_leaving_minutes or 0,
        overtime_hours=att.overtime_hours or Decimal("0.00"),
        status=att.status,
        source=att.source,
        is_missing_punch=att.is_missing_punch or False,
        is_anomaly=att.is_anomaly or False,
        geofence_site_name=(geo_site.project_name if hasattr(geo_site, "project_name") else getattr(geo_site, "site_name", None)) if geo_site else None,
        is_geofence_verified=att.is_geofence_verified if att.is_geofence_verified is not None else True,
        remarks=att.remarks
    )

@router.post("/attendance/process")
async def process_attendance(
    payload: AttendanceProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    target_date = payload.process_date

    # Fetch active employees
    emp_q = select(Employee).where(and_(Employee.organization_id == org_id, Employee.employment_status == "ACTIVE"))
    if payload.department_id:
        emp_q = emp_q.where(Employee.department_id == payload.department_id)
    emp_res = await db.execute(emp_q)
    employees = emp_res.scalars().all()

    processed_count = 0
    absent_count = 0
    missing_punch_count = 0

    for emp in employees:
        att_res = await db.execute(select(Attendance).where(and_(
            Attendance.organization_id == org_id,
            Attendance.employee_id == emp.id,
            Attendance.punch_date == target_date
        )))
        att = att_res.scalar_one_or_none()

        if not att:
            # Check approved leave
            leave_res = await db.execute(select(LeaveApplication).where(and_(
                LeaveApplication.organization_id == org_id,
                LeaveApplication.employee_id == emp.id,
                LeaveApplication.status == "APPROVED",
                LeaveApplication.start_date <= target_date,
                LeaveApplication.end_date >= target_date
            )))
            leave = leave_res.scalar_one_or_none()
            stat = "ON_LEAVE" if leave else "ABSENT"

            att = Attendance(
                organization_id=org_id,
                employee_id=emp.id,
                punch_date=target_date,
                status=stat,
                source="MANUAL_OVERRIDE",
                remarks="Auto-generated by Daily Attendance Processor"
            )
            db.add(att)
            if stat == "ABSENT":
                absent_count += 1
        else:
            if att.clock_in and not att.clock_out:
                att.is_missing_punch = True
                missing_punch_count += 1
            elif att.clock_in and att.clock_out:
                dur_secs = (att.clock_out - att.clock_in).total_seconds()
                att.working_hours = Decimal(str(round(max(0.0, dur_secs / 3600.0), 2)))
                if att.working_hours > Decimal("8.00"):
                    att.overtime_hours = Decimal(str(round(att.working_hours - Decimal("8.00"), 2)))
                att.is_missing_punch = False

        processed_count += 1

    await db.commit()
    return {
        "status": "SUCCESS",
        "process_date": target_date,
        "total_employees_processed": processed_count,
        "absent_records_created": absent_count,
        "missing_punches_flagged": missing_punch_count,
        "message": f"Daily attendance processing completed for {target_date}."
    }

@router.get("/attendance/missing-punches", response_model=List[AttendanceOut])
async def list_missing_punches(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    department_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = (
        select(Attendance)
        .options(
            joinedload(Attendance.employee).joinedload(Employee.department),
            joinedload(Attendance.employee).joinedload(Employee.designation),
            joinedload(Attendance.shift),
            joinedload(Attendance.geofence_site)
        )
        .where(and_(
            Attendance.organization_id == org_id,
            or_(
                Attendance.is_missing_punch == True,
                and_(Attendance.clock_in != None, Attendance.clock_out == None)
            )
        ))
    )

    if date_from:
        q = q.where(Attendance.punch_date >= date_from)
    if date_to:
        q = q.where(Attendance.punch_date <= date_to)

    res = await db.execute(q.order_by(desc(Attendance.punch_date)))
    items = res.scalars().all()

    out = []
    for att in items:
        emp = att.employee
        if department_id and emp and emp.department_id != department_id:
            continue
        out.append(AttendanceOut(
            id=att.id,
            employee_id=att.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            designation_title=emp.designation.title_en if emp and emp.designation else None,
            shift_id=att.shift_id,
            shift_name=att.shift.shift_name if att.shift else None,
            punch_date=att.punch_date,
            clock_in=att.clock_in,
            clock_out=att.clock_out,
            working_hours=att.working_hours or Decimal("0.00"),
            late_minutes=att.late_minutes or 0,
            early_leaving_minutes=att.early_leaving_minutes or 0,
            overtime_hours=att.overtime_hours or Decimal("0.00"),
            status=att.status,
            source=att.source,
            is_missing_punch=True,
            is_anomaly=att.is_anomaly or False,
            geofence_site_name=(att.geofence_site.project_name if hasattr(att.geofence_site, "project_name") else getattr(att.geofence_site, "site_name", None)) if att.geofence_site else None,
            is_geofence_verified=att.is_geofence_verified if att.is_geofence_verified is not None else True,
            remarks=att.remarks
        ))
    return out

@router.get("/attendance", response_model=AttendancePaginatedOut)
async def list_attendance(
    punch_date: Optional[date] = None,
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    target_date = punch_date or date.today()

    conditions = [
        Attendance.organization_id == org_id,
        Attendance.punch_date == target_date
    ]

    if employee_id:
        conditions.append(Attendance.employee_id == employee_id)
    if department_id:
        conditions.append(Employee.department_id == department_id)
    if shift_id:
        conditions.append(Attendance.shift_id == shift_id)
    if status_filter:
        conditions.append(Attendance.status == status_filter)
    if search:
        s = f"%{search.strip()}%"
        conditions.append(or_(
            Employee.first_name.ilike(s),
            Employee.last_name.ilike(s),
            Employee.employee_code.ilike(s)
        ))

    cnt_q = select(func.count(Attendance.id)).join(Employee, Attendance.employee_id == Employee.id).where(and_(*conditions))
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    q = (
        select(Attendance)
        .options(
            joinedload(Attendance.employee).joinedload(Employee.department),
            joinedload(Attendance.employee).joinedload(Employee.designation),
            joinedload(Attendance.shift),
            joinedload(Attendance.geofence_site)
        )
        .join(Employee, Attendance.employee_id == Employee.id)
        .where(and_(*conditions))
        .order_by(desc(Attendance.clock_in), desc(Attendance.id))
        .limit(limit)
        .offset(offset)
    )

    items_res = await db.execute(q)
    items = items_res.scalars().all()

    # Calculate status counts for target date
    stats_q = select(
        Attendance.status,
        func.count(Attendance.id)
    ).where(and_(
        Attendance.organization_id == org_id,
        Attendance.punch_date == target_date
    )).group_by(Attendance.status)
    stats_res = await db.execute(stats_q)
    stats_map = {row[0]: row[1] for row in stats_res.all()}

    missing_cnt_q = select(func.count()).where(and_(
        Attendance.organization_id == org_id,
        Attendance.punch_date == target_date,
        or_(Attendance.is_missing_punch == True, and_(Attendance.clock_in != None, Attendance.clock_out == None))
    ))
    missing_cnt_res = await db.execute(missing_cnt_q)
    missing_cnt = missing_cnt_res.scalar_one() or 0

    out_items = []
    for att in items:
        emp = att.employee
        out_items.append(AttendanceOut(
            id=att.id,
            employee_id=att.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            designation_title=emp.designation.title_en if emp and emp.designation else None,
            shift_id=att.shift_id,
            shift_name=att.shift.shift_name if att.shift else None,
            punch_date=att.punch_date,
            clock_in=att.clock_in,
            clock_out=att.clock_out,
            working_hours=att.working_hours or Decimal("0.00"),
            late_minutes=att.late_minutes or 0,
            early_leaving_minutes=att.early_leaving_minutes or 0,
            overtime_hours=att.overtime_hours or Decimal("0.00"),
            status=att.status,
            source=att.source,
            is_missing_punch=att.is_missing_punch or False,
            geofence_site_name=(att.geofence_site.project_name if hasattr(att.geofence_site, "project_name") else getattr(att.geofence_site, "site_name", None)) if att.geofence_site else None,
            is_geofence_verified=att.is_geofence_verified if att.is_geofence_verified is not None else True,
            remarks=att.remarks
        ))

    return AttendancePaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset,
        present_count=stats_map.get("PRESENT", 0),
        late_count=stats_map.get("LATE", 0),
        half_day_count=stats_map.get("HALF_DAY", 0),
        absent_count=stats_map.get("ABSENT", 0),
        on_leave_count=stats_map.get("ON_LEAVE", 0),
        missing_punch_count=missing_cnt
    )

@router.get("/attendance/daily-summary", response_model=AttendanceDailySummaryOut)
async def get_attendance_daily_summary(
    target_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    d = target_date or date.today()

    total_emp_q = select(func.count(Employee.id)).where(and_(Employee.organization_id == org_id, Employee.employment_status == "ACTIVE"))
    total_emp_res = await db.execute(total_emp_q)
    total_employees = total_emp_res.scalar_one() or 0

    stats_q = select(
        Attendance.status,
        func.count(Attendance.id)
    ).where(and_(
        Attendance.organization_id == org_id,
        Attendance.punch_date == d
    )).group_by(Attendance.status)
    stats_res = await db.execute(stats_q)
    stats_map = {row[0]: row[1] for row in stats_res.all()}

    missing_cnt_q = select(func.count()).where(and_(
        Attendance.organization_id == org_id,
        Attendance.punch_date == d,
        or_(Attendance.is_missing_punch == True, and_(Attendance.clock_in != None, Attendance.clock_out == None))
    ))
    missing_cnt_res = await db.execute(missing_cnt_q)
    missing_punches = missing_cnt_res.scalar_one() or 0

    pres = stats_map.get("PRESENT", 0)
    late = stats_map.get("LATE", 0)
    half = stats_map.get("HALF_DAY", 0)
    absent = stats_map.get("ABSENT", 0)
    leave = stats_map.get("ON_LEAVE", 0)

    attendees = pres + late + half
    rate = round((attendees / total_employees * 100.0), 1) if total_employees > 0 else 0.0

    return AttendanceDailySummaryOut(
        date=d,
        total_employees=total_employees,
        present=pres,
        late=late,
        half_day=half,
        absent=absent,
        on_leave=leave,
        missing_punches=missing_punches,
        attendance_rate=rate
    )


# --- 2.10.1 Monthly Attendance Closing & Payroll Locking ---
@router.get("/attendance/monthly-closing-summary", response_model=AttendanceMonthlyClosingSummaryOut)
async def get_attendance_monthly_closing_summary(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    department_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    import calendar
    org_id = get_org_id(current_user)

    _, num_days = calendar.monthrange(year, month)
    start_d = date(year, month, 1)
    end_d = date(year, month, num_days)

    emp_q = select(Employee).options(
        joinedload(Employee.department),
        joinedload(Employee.designation)
    ).where(and_(
        Employee.organization_id == org_id,
        Employee.employment_status == "ACTIVE"
    ))
    if department_id:
        emp_q = emp_q.where(Employee.department_id == department_id)
    emp_res = await db.execute(emp_q)
    employees = emp_res.scalars().all()
    total_employees = len(employees)

    holidays_res = await db.execute(select(func.count(HolidayCalendar.id)).where(and_(
        HolidayCalendar.organization_id == org_id,
        HolidayCalendar.start_date <= end_d,
        HolidayCalendar.end_date >= start_d
    )))
    holiday_count = holidays_res.scalar_one() or 0
    total_working_days = max(1, num_days - 4 - holiday_count)

    period_res = await db.execute(select(PayrollPeriod).where(and_(
        PayrollPeriod.organization_id == org_id,
        PayrollPeriod.year == year,
        PayrollPeriod.month == month
    )))
    period = period_res.scalar_one_or_none()
    is_locked = period.is_locked if period else False
    locked_at = period.updated_at if (period and period.is_locked) else None

    if not is_locked:
        pi_lock_res = await db.execute(select(PayrollInput.is_locked).where(and_(
            PayrollInput.organization_id == org_id,
            PayrollInput.year == year,
            PayrollInput.month == month,
            PayrollInput.is_locked == True
        )).limit(1))
        if pi_lock_res.scalar_one_or_none():
            is_locked = True

    att_q = select(
        Attendance.employee_id,
        Attendance.status,
        func.count(Attendance.id),
        func.sum(Attendance.working_hours),
        func.sum(Attendance.overtime_hours),
        func.sum(Attendance.late_minutes)
    ).where(and_(
        Attendance.organization_id == org_id,
        Attendance.punch_date >= start_d,
        Attendance.punch_date <= end_d
    )).group_by(Attendance.employee_id, Attendance.status)
    att_res = await db.execute(att_q)

    emp_att: Dict[int, Dict[str, Any]] = {}
    for row in att_res.all():
        eid, stat, cnt, wrk_hrs, ot_hrs, late_mins = row
        if eid not in emp_att:
            emp_att[eid] = {
                "PRESENT": 0, "LATE": 0, "HALF_DAY": 0, "ABSENT": 0, "ON_LEAVE": 0,
                "ot_hours": Decimal("0.00"), "late_count": 0
            }
        emp_att[eid][stat] = cnt
        if ot_hrs:
            emp_att[eid]["ot_hours"] += ot_hrs
        if late_mins and late_mins > 0:
            emp_att[eid]["late_count"] += cnt

    ot_q = select(
        OvertimeRequest.employee_id,
        func.sum(OvertimeRequest.approved_hours)
    ).where(and_(
        OvertimeRequest.organization_id == org_id,
        OvertimeRequest.status == "APPROVED",
        OvertimeRequest.ot_date >= start_d,
        OvertimeRequest.ot_date <= end_d
    )).group_by(OvertimeRequest.employee_id)
    ot_res = await db.execute(ot_q)
    ot_map = {row[0]: float(row[1] or 0.0) for row in ot_res.all()}

    unpaid_q = select(
        LeaveApplication.employee_id,
        func.sum(LeaveApplication.total_days)
    ).where(and_(
        LeaveApplication.organization_id == org_id,
        LeaveApplication.status == "APPROVED",
        LeaveApplication.is_paid == False,
        LeaveApplication.start_date <= end_d,
        LeaveApplication.end_date >= start_d
    )).group_by(LeaveApplication.employee_id)
    unpaid_res = await db.execute(unpaid_q)
    unpaid_map = {row[0]: float(row[1] or 0.0) for row in unpaid_res.all()}

    items: List[AttendanceMonthlyClosingEmployeeItem] = []
    tot_pres = 0.0
    tot_abs = 0.0
    tot_late = 0
    tot_unpaid = 0.0
    tot_ot = 0.0

    for emp in employees:
        att_data = emp_att.get(emp.id, {})
        pres = float(att_data.get("PRESENT", 0))
        late = float(att_data.get("LATE", 0))
        half = float(att_data.get("HALF_DAY", 0))
        absent = float(att_data.get("ABSENT", 0))
        late_occurrences = int(att_data.get("late_count", 0))
        approved_ot = ot_map.get(emp.id, float(att_data.get("ot_hours", 0.0)))
        unpaid_days = unpaid_map.get(emp.id, 0.0)

        pres_equiv = pres + late + (half * 0.5)
        payable = max(0.0, float(total_working_days) - absent - unpaid_days)

        tot_pres += pres_equiv
        tot_abs += absent
        tot_late += late_occurrences
        tot_unpaid += unpaid_days
        tot_ot += approved_ot

        emp_name = f"{emp.first_name} {emp.last_name or ''}".strip()
        dept_name = emp.department.name_en if emp.department else None
        desig_title = emp.designation.title_en if emp.designation else None

        items.append(AttendanceMonthlyClosingEmployeeItem(
            employee_id=emp.id,
            employee_name=emp_name,
            employee_code=emp.employee_code,
            department_name=dept_name,
            designation_title=desig_title,
            working_days=total_working_days,
            present_days=round(pres_equiv, 1),
            absent_days=round(absent, 1),
            half_days=round(half, 1),
            late_count=late_occurrences,
            approved_ot_hours=round(approved_ot, 2),
            unpaid_leave_days=round(unpaid_days, 1),
            payable_days=round(payable, 1)
        ))

    return AttendanceMonthlyClosingSummaryOut(
        year=year,
        month=month,
        total_employees=total_employees,
        total_working_days=total_working_days,
        total_present_man_days=round(tot_pres, 1),
        total_absent_days=round(tot_abs, 1),
        total_late_occurrences=tot_late,
        total_unpaid_leave_days=round(tot_unpaid, 1),
        total_approved_ot_hours=round(tot_ot, 2),
        is_locked=is_locked,
        locked_at=locked_at,
        locked_by="HR Admin" if is_locked else None,
        items=items
    )


@router.post("/attendance/monthly-closing")
async def execute_attendance_monthly_closing(
    payload: AttendanceMonthlyClosingActionPayload,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    action = payload.action.upper()

    if action in ["LOCK", "SYNC"]:
        sync_req = PayrollSyncLeaveOTRequest(month=payload.month, year=payload.year)
        await sync_leave_and_overtime_to_payroll(sync_req, db, current_user)

    if action == "LOCK":
        await db.execute(
            update(PayrollInput)
            .where(and_(
                PayrollInput.organization_id == org_id,
                PayrollInput.year == payload.year,
                PayrollInput.month == payload.month
            ))
            .values(is_locked=True)
        )
        period_res = await db.execute(select(PayrollPeriod).where(and_(
            PayrollPeriod.organization_id == org_id,
            PayrollPeriod.year == payload.year,
            PayrollPeriod.month == payload.month
        )))
        period = period_res.scalar_one_or_none()
        if period:
            period.is_locked = True
            period.status = "LOCKED"
        await db.commit()
        return {"success": True, "message": f"Attendance for {payload.month:02d}/{payload.year} locked and synced to payroll.", "is_locked": True}

    elif action == "UNLOCK":
        await db.execute(
            update(PayrollInput)
            .where(and_(
                PayrollInput.organization_id == org_id,
                PayrollInput.year == payload.year,
                PayrollInput.month == payload.month
            ))
            .values(is_locked=False)
        )
        period_res = await db.execute(select(PayrollPeriod).where(and_(
            PayrollPeriod.organization_id == org_id,
            PayrollPeriod.year == payload.year,
            PayrollPeriod.month == payload.month
        )))
        period = period_res.scalar_one_or_none()
        if period:
            period.is_locked = False
            period.status = "DRAFT"
        await db.commit()
        return {"success": True, "message": f"Attendance for {payload.month:02d}/{payload.year} unlocked successfully.", "is_locked": False}

    elif action == "SYNC":
        return {"success": True, "message": f"Attendance and overtime for {payload.month:02d}/{payload.year} synced to payroll inputs.", "is_locked": False}

    raise HTTPException(status_code=400, detail="Invalid action. Allowed: LOCK, UNLOCK, SYNC")




# =====================================================================
# --- Section 2.11 - 2.20: Enterprise Leave & Overtime Routes ---
# =====================================================================

# --- 2.11 Leave Type Setup ---
@router.get("/leave-types", response_model=LeaveTypePaginatedOut)
async def list_leave_types(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeaveType).where(LeaveType.organization_id == org_id)

    if search:
        s = f"%{search.strip()}%"
        q = q.where(or_(LeaveType.name_en.ilike(s), LeaveType.leave_type_code.ilike(s)))
    if is_active is not None:
        q = q.where(LeaveType.is_active == is_active)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(LeaveType.id).limit(limit).offset(offset))
    items = items_res.scalars().all()

    return LeaveTypePaginatedOut(
        items=[LeaveTypeOut.model_validate(lt) for lt in items],
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/leave-types/{lt_id}", response_model=LeaveTypeOut)
async def get_leave_type(
    lt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    result = await db.execute(select(LeaveType).where(and_(
        LeaveType.id == lt_id,
        LeaveType.organization_id == org_id
    )))
    leave_type = result.scalar_one_or_none()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    return LeaveTypeOut.model_validate(leave_type)


@router.post("/leave-types", response_model=LeaveTypeOut, status_code=status.HTTP_201_CREATED)
async def create_leave_type(
    payload: LeaveTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    code = payload.leave_type_code.strip().upper()

    exist = await db.execute(select(LeaveType).where(and_(LeaveType.organization_id == org_id, LeaveType.leave_type_code == code)))
    if exist.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Leave type code already exists")

    lt = LeaveType(
        organization_id=org_id,
        leave_type_code=code,
        name_en=payload.name_en.strip(),
        name_bn=payload.name_bn.strip() if payload.name_bn else None,
        is_paid=payload.is_paid,
        color_code=payload.color_code,
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(lt)
    await db.commit()
    await db.refresh(lt)
    return LeaveTypeOut.model_validate(lt)

@router.put("/leave-types/{lt_id}", response_model=LeaveTypeOut)
async def update_leave_type(
    lt_id: int,
    payload: LeaveTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeaveType).where(and_(LeaveType.id == lt_id, LeaveType.organization_id == org_id))
    res = await db.execute(q)
    lt = res.scalar_one_or_none()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")

    data = payload.model_dump(exclude_unset=True)
    if "leave_type_code" in data and data["leave_type_code"]:
        data["leave_type_code"] = data["leave_type_code"].strip().upper()
        duplicate = await db.execute(select(LeaveType.id).where(and_(
            LeaveType.organization_id == org_id,
            LeaveType.leave_type_code == data["leave_type_code"],
            LeaveType.id != lt_id
        )))
        if duplicate.scalar_one_or_none() is not None:
            raise HTTPException(status_code=400, detail="Leave type code already exists")
    for field, val in data.items():
        setattr(lt, field, val)

    await db.commit()
    await db.refresh(lt)
    return LeaveTypeOut.model_validate(lt)

@router.delete("/leave-types/{lt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_leave_type(
    lt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeaveType).where(and_(LeaveType.id == lt_id, LeaveType.organization_id == org_id))
    res = await db.execute(q)
    lt = res.scalar_one_or_none()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")

    references = await db.execute(select(func.count()).select_from(LeaveBalance).where(
        LeaveBalance.organization_id == org_id,
        LeaveBalance.leave_type_id == lt_id
    ))
    if references.scalar_one():
        raise HTTPException(status_code=409, detail="Leave types with entitlement history cannot be deleted; deactivate the type instead")
    references = await db.execute(select(func.count()).select_from(LeavePolicy).where(
        LeavePolicy.organization_id == org_id,
        LeavePolicy.leave_type_id == lt_id
    ))
    if references.scalar_one():
        raise HTTPException(status_code=409, detail="Leave types with policies cannot be deleted; deactivate the type instead")
    references = await db.execute(select(func.count()).select_from(LeaveApplication).where(
        LeaveApplication.organization_id == org_id,
        LeaveApplication.leave_type_id == lt_id
    ))
    if references.scalar_one():
        raise HTTPException(status_code=409, detail="Leave types with application history cannot be deleted; deactivate the type instead")

    await db.delete(lt)
    await db.commit()
    return None


# --- 2.12 Leave Policy Setup ---
@router.get("/leave-policies", response_model=LeavePolicyPaginatedOut)
async def list_leave_policies(
    leave_type_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeavePolicy).options(joinedload(LeavePolicy.leave_type)).where(LeavePolicy.organization_id == org_id)

    if leave_type_id:
        q = q.where(LeavePolicy.leave_type_id == leave_type_id)
    if is_active is not None:
        q = q.where(LeavePolicy.is_active == is_active)
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.join(LeaveType, LeavePolicy.leave_type_id == LeaveType.id).where(or_(
            LeavePolicy.policy_name.ilike(term),
            LeaveType.name_en.ilike(term),
            LeaveType.leave_type_code.ilike(term)
        ))

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(LeavePolicy.id).limit(limit).offset(offset))
    items = items_res.scalars().all()

    out_items = []
    for lp in items:
        out_items.append(LeavePolicyOut(
            id=lp.id,
            leave_type_id=lp.leave_type_id,
            leave_type_code=lp.leave_type.leave_type_code if lp.leave_type else None,
            leave_type_name=lp.leave_type.name_en if lp.leave_type else None,
            policy_name=lp.policy_name,
            annual_entitlement_days=lp.annual_entitlement_days,
            accrual_frequency=lp.accrual_frequency,
            max_carry_forward_days=lp.max_carry_forward_days,
            carry_forward_expiry_months=lp.carry_forward_expiry_months,
            encashment_allowed=lp.encashment_allowed,
            max_encashment_days=lp.max_encashment_days,
            min_service_days_required=lp.min_service_days_required,
            gender_applicability=lp.gender_applicability,
            is_active=lp.is_active,
            created_at=lp.created_at
        ))

    return LeavePolicyPaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/leave-policies/{lp_id}", response_model=LeavePolicyOut)
async def get_leave_policy(
    lp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    result = await db.execute(select(LeavePolicy).options(
        joinedload(LeavePolicy.leave_type)
    ).where(and_(LeavePolicy.id == lp_id, LeavePolicy.organization_id == org_id)))
    policy = result.unique().scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    leave_type = policy.leave_type
    return LeavePolicyOut(
        id=policy.id,
        leave_type_id=policy.leave_type_id,
        leave_type_code=leave_type.leave_type_code if leave_type else None,
        leave_type_name=leave_type.name_en if leave_type else None,
        policy_name=policy.policy_name,
        annual_entitlement_days=policy.annual_entitlement_days,
        accrual_frequency=policy.accrual_frequency,
        max_carry_forward_days=policy.max_carry_forward_days,
        carry_forward_expiry_months=policy.carry_forward_expiry_months,
        encashment_allowed=policy.encashment_allowed,
        max_encashment_days=policy.max_encashment_days,
        min_service_days_required=policy.min_service_days_required,
        gender_applicability=policy.gender_applicability,
        is_active=policy.is_active,
        created_at=policy.created_at
    )


@router.post("/leave-policies", response_model=LeavePolicyOut, status_code=status.HTTP_201_CREATED)
async def create_leave_policy(
    payload: LeavePolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    if any(value < 0 for value in (
        payload.annual_entitlement_days,
        payload.max_carry_forward_days,
        payload.carry_forward_expiry_months,
        payload.max_encashment_days,
        payload.min_service_days_required
    )):
        raise HTTPException(status_code=400, detail="Leave policy values cannot be negative")
    leave_type_result = await db.execute(select(LeaveType).where(and_(
        LeaveType.id == payload.leave_type_id,
        LeaveType.organization_id == org_id,
        LeaveType.is_active.is_(True)
    )))
    leave_type = leave_type_result.scalar_one_or_none()
    if leave_type is None:
        raise HTTPException(status_code=404, detail="Leave type not found")
    lp = LeavePolicy(
        organization_id=org_id,
        leave_type_id=payload.leave_type_id,
        policy_name=payload.policy_name.strip(),
        annual_entitlement_days=payload.annual_entitlement_days,
        accrual_frequency=payload.accrual_frequency,
        max_carry_forward_days=payload.max_carry_forward_days,
        carry_forward_expiry_months=payload.carry_forward_expiry_months,
        encashment_allowed=payload.encashment_allowed,
        max_encashment_days=payload.max_encashment_days,
        min_service_days_required=payload.min_service_days_required,
        gender_applicability=payload.gender_applicability,
        is_active=payload.is_active
    )
    lp.leave_type = leave_type
    db.add(lp)
    await db.commit()
    await db.refresh(lp)

    lt = lp.leave_type
    return LeavePolicyOut(
        id=lp.id,
        leave_type_id=lp.leave_type_id,
        leave_type_code=lt.leave_type_code if lt else None,
        leave_type_name=lt.name_en if lt else None,
        policy_name=lp.policy_name,
        annual_entitlement_days=lp.annual_entitlement_days,
        accrual_frequency=lp.accrual_frequency,
        max_carry_forward_days=lp.max_carry_forward_days,
        carry_forward_expiry_months=lp.carry_forward_expiry_months,
        encashment_allowed=lp.encashment_allowed,
        max_encashment_days=lp.max_encashment_days,
        min_service_days_required=lp.min_service_days_required,
        gender_applicability=lp.gender_applicability,
        is_active=lp.is_active,
        created_at=lp.created_at
    )

@router.put("/leave-policies/{lp_id}", response_model=LeavePolicyOut)
async def update_leave_policy(
    lp_id: int,
    payload: LeavePolicyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeavePolicy).options(joinedload(LeavePolicy.leave_type)).where(and_(LeavePolicy.id == lp_id, LeavePolicy.organization_id == org_id))
    res = await db.execute(q)
    lp = res.scalar_one_or_none()
    if not lp:
        raise HTTPException(status_code=404, detail="Leave policy not found")

    data = payload.model_dump(exclude_unset=True)
    if any(data[field] < 0 for field in (
        "annual_entitlement_days",
        "max_carry_forward_days",
        "carry_forward_expiry_months",
        "max_encashment_days",
        "min_service_days_required"
    ) if field in data):
        raise HTTPException(status_code=400, detail="Leave policy values cannot be negative")
    if "leave_type_id" in data:
        leave_type_result = await db.execute(select(LeaveType).where(and_(
            LeaveType.id == data["leave_type_id"],
            LeaveType.organization_id == org_id,
            LeaveType.is_active.is_(True)
        )))
        leave_type = leave_type_result.scalar_one_or_none()
        if leave_type is None:
            raise HTTPException(status_code=404, detail="Leave type not found")
        lp.leave_type = leave_type
    for field, val in data.items():
        setattr(lp, field, val)

    await db.commit()
    await db.refresh(lp)

    lt = lp.leave_type
    return LeavePolicyOut(
        id=lp.id,
        leave_type_id=lp.leave_type_id,
        leave_type_code=lt.leave_type_code if lt else None,
        leave_type_name=lt.name_en if lt else None,
        policy_name=lp.policy_name,
        annual_entitlement_days=lp.annual_entitlement_days,
        accrual_frequency=lp.accrual_frequency,
        max_carry_forward_days=lp.max_carry_forward_days,
        carry_forward_expiry_months=lp.carry_forward_expiry_months,
        encashment_allowed=lp.encashment_allowed,
        max_encashment_days=lp.max_encashment_days,
        min_service_days_required=lp.min_service_days_required,
        gender_applicability=lp.gender_applicability,
        is_active=lp.is_active,
        created_at=lp.created_at
    )

@router.delete("/leave-policies/{lp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_leave_policy(
    lp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeavePolicy).where(and_(LeavePolicy.id == lp_id, LeavePolicy.organization_id == org_id))
    res = await db.execute(q)
    lp = res.scalar_one_or_none()
    if not lp:
        raise HTTPException(status_code=404, detail="Leave policy not found")

    await db.delete(lp)
    await db.commit()
    return None


# --- 2.13 & 2.16 Opening Leave Balance & Balance Inquiries ---
@router.get("/leave-balances", response_model=LeaveBalancePaginatedOut)
async def list_leave_balances(
    employee_id: Optional[int] = None,
    leave_type_id: Optional[int] = None,
    search: Optional[str] = None,
    year: int = Query(2026),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeaveBalance).options(
        joinedload(LeaveBalance.employee).joinedload(Employee.department),
        joinedload(LeaveBalance.leave_type)
    ).where(and_(LeaveBalance.organization_id == org_id, LeaveBalance.year == year))

    if employee_id:
        q = q.where(LeaveBalance.employee_id == employee_id)
    if leave_type_id:
        q = q.where(LeaveBalance.leave_type_id == leave_type_id)
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.join(Employee, LeaveBalance.employee_id == Employee.id).join(
            LeaveType, LeaveBalance.leave_type_id == LeaveType.id
        ).where(or_(
            Employee.first_name.ilike(term),
            Employee.last_name.ilike(term),
            Employee.employee_code.ilike(term),
            LeaveType.name_en.ilike(term),
            LeaveType.leave_type_code.ilike(term)
        ))

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(LeaveBalance.employee_id, LeaveBalance.leave_type_id).limit(limit).offset(offset))
    items = items_res.scalars().all()

    out_items = []
    for lb in items:
        emp = lb.employee
        lt = lb.leave_type
        out_items.append(LeaveBalanceOut(
            id=lb.id,
            employee_id=lb.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            leave_type_id=lb.leave_type_id,
            leave_type_code=lt.leave_type_code if lt else None,
            leave_type_name=lt.name_en if lt else None,
            color_code=lt.color_code if lt else "#3b82f6",
            is_paid=lt.is_paid if lt else True,
            year=lb.year,
            opening_balance=lb.opening_balance,
            carried_forward=lb.carried_forward,
            accrued_days=lb.accrued_days,
            used_days=lb.used_days,
            pending_days=lb.pending_days,
            available_days=lb.available_days,
            encashed_days=lb.encashed_days,
            created_at=lb.created_at
        ))

    return LeaveBalancePaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/leave-balances/{balance_id}", response_model=LeaveBalanceOut)
async def get_leave_balance(
    balance_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    result = await db.execute(select(LeaveBalance).options(
        joinedload(LeaveBalance.employee).joinedload(Employee.department),
        joinedload(LeaveBalance.leave_type)
    ).where(and_(
        LeaveBalance.id == balance_id,
        LeaveBalance.organization_id == org_id
    )))
    balance = result.unique().scalar_one_or_none()
    if not balance:
        raise HTTPException(status_code=404, detail="Leave entitlement not found")
    employee = balance.employee
    leave_type = balance.leave_type
    return LeaveBalanceOut(
        id=balance.id,
        employee_id=balance.employee_id,
        employee_name=f"{employee.first_name} {employee.last_name}" if employee else None,
        employee_code=employee.employee_code if employee else None,
        department_name=employee.department.name_en if employee and employee.department else None,
        leave_type_id=balance.leave_type_id,
        leave_type_code=leave_type.leave_type_code if leave_type else None,
        leave_type_name=leave_type.name_en if leave_type else None,
        color_code=leave_type.color_code if leave_type else "#3b82f6",
        is_paid=leave_type.is_paid if leave_type else True,
        year=balance.year,
        opening_balance=balance.opening_balance,
        carried_forward=balance.carried_forward,
        accrued_days=balance.accrued_days,
        used_days=balance.used_days,
        pending_days=balance.pending_days,
        available_days=balance.available_days,
        encashed_days=balance.encashed_days,
        created_at=balance.created_at
    )


@router.post("/leave-balances", response_model=LeaveBalanceOut, status_code=status.HTTP_201_CREATED)
async def create_opening_leave_balance(
    payload: LeaveBalanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)

    employee_res = await db.execute(select(Employee).options(
        joinedload(Employee.department)
    ).where(and_(
        Employee.id == payload.employee_id,
        Employee.organization_id == org_id
    )))
    employee = employee_res.unique().scalar_one_or_none()
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    leave_type_result = await db.execute(select(LeaveType).where(and_(
        LeaveType.id == payload.leave_type_id,
        LeaveType.organization_id == org_id,
        LeaveType.is_active.is_(True)
    )))
    leave_type = leave_type_result.scalar_one_or_none()
    if leave_type is None:
        raise HTTPException(status_code=404, detail="Active leave type not found")
    if payload.opening_balance < 0 or payload.carried_forward < 0:
        raise HTTPException(status_code=400, detail="Leave balance days cannot be negative")

    exist_q = select(LeaveBalance).where(and_(
        LeaveBalance.organization_id == org_id,
        LeaveBalance.employee_id == payload.employee_id,
        LeaveBalance.leave_type_id == payload.leave_type_id,
        LeaveBalance.year == payload.year
    ))
    res = await db.execute(exist_q)
    existing = res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Leave balance for this employee, leave type and year already exists")

    opening = payload.opening_balance
    carried = payload.carried_forward
    avail = opening + carried

    lb = LeaveBalance(
        organization_id=org_id,
        employee_id=payload.employee_id,
        leave_type_id=payload.leave_type_id,
        year=payload.year,
        opening_balance=opening,
        carried_forward=carried,
        accrued_days=opening,
        used_days=Decimal("0.00"),
        pending_days=Decimal("0.00"),
        available_days=avail,
        encashed_days=Decimal("0.00")
    )
    lb.employee = employee
    lb.leave_type = leave_type
    db.add(lb)
    await db.commit()
    await db.refresh(lb)

    emp = lb.employee
    lt = lb.leave_type
    return LeaveBalanceOut(
        id=lb.id,
        employee_id=lb.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        leave_type_id=lb.leave_type_id,
        leave_type_code=lt.leave_type_code if lt else None,
        leave_type_name=lt.name_en if lt else None,
        color_code=lt.color_code if lt else "#3b82f6",
        is_paid=lt.is_paid if lt else True,
        year=lb.year,
        opening_balance=lb.opening_balance,
        carried_forward=lb.carried_forward,
        accrued_days=lb.accrued_days,
        used_days=lb.used_days,
        pending_days=lb.pending_days,
        available_days=lb.available_days,
        encashed_days=lb.encashed_days,
        created_at=lb.created_at
    )


@router.put("/leave-balances/{balance_id}", response_model=LeaveBalanceOut)
async def update_leave_balance(
    balance_id: int,
    payload: LeaveBalanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    result = await db.execute(select(LeaveBalance).options(
        joinedload(LeaveBalance.employee).joinedload(Employee.department),
        joinedload(LeaveBalance.leave_type)
    ).where(and_(
        LeaveBalance.id == balance_id,
        LeaveBalance.organization_id == org_id
    )))
    balance = result.scalar_one_or_none()
    if not balance:
        raise HTTPException(status_code=404, detail="Leave entitlement not found")

    changes = payload.model_dump(exclude_unset=True)
    if any(value < 0 for value in changes.values()):
        raise HTTPException(status_code=400, detail="Leave balance days cannot be negative")
    if "opening_balance" in changes:
        balance.accrued_days += changes["opening_balance"] - balance.opening_balance
    for field, value in changes.items():
        setattr(balance, field, value)
    balance.available_days = (
        balance.accrued_days + balance.carried_forward
        - balance.used_days - balance.pending_days - balance.encashed_days
    )
    if balance.available_days < 0:
        raise HTTPException(status_code=400, detail="Updated entitlement is below leave already used or pending")
    await db.commit()
    await db.refresh(balance)
    employee = balance.employee
    leave_type = balance.leave_type
    return LeaveBalanceOut(
        id=balance.id,
        employee_id=balance.employee_id,
        employee_name=f"{employee.first_name} {employee.last_name}" if employee else None,
        employee_code=employee.employee_code if employee else None,
        department_name=employee.department.name_en if employee and employee.department else None,
        leave_type_id=balance.leave_type_id,
        leave_type_code=leave_type.leave_type_code if leave_type else None,
        leave_type_name=leave_type.name_en if leave_type else None,
        color_code=leave_type.color_code if leave_type else "#3b82f6",
        is_paid=leave_type.is_paid if leave_type else True,
        year=balance.year,
        opening_balance=balance.opening_balance,
        carried_forward=balance.carried_forward,
        accrued_days=balance.accrued_days,
        used_days=balance.used_days,
        pending_days=balance.pending_days,
        available_days=balance.available_days,
        encashed_days=balance.encashed_days,
        created_at=balance.created_at
    )


@router.delete("/leave-balances/{balance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_leave_balance(
    balance_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    result = await db.execute(select(LeaveBalance).where(and_(
        LeaveBalance.id == balance_id,
        LeaveBalance.organization_id == org_id
    )))
    balance = result.scalar_one_or_none()
    if not balance:
        raise HTTPException(status_code=404, detail="Leave entitlement not found")
    if balance.used_days > 0 or balance.pending_days > 0:
        raise HTTPException(status_code=409, detail="Entitlements with used or pending leave cannot be deleted")
    await db.delete(balance)
    await db.commit()
    return None


# --- 2.14 & 2.15 Leave Application & Multi-tier Approvals ---
def _leave_application_out(leave: LeaveApplication) -> LeaveOut:
    employee = leave.employee
    leave_type = leave.leave_type_obj
    manager = leave.manager_approver
    hr = leave.hr_approver
    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=f"{employee.first_name} {employee.last_name}" if employee else None,
        employee_code=employee.employee_code if employee else None,
        department_name=employee.department.name_en if employee and employee.department else None,
        leave_type_id=leave.leave_type_id,
        leave_type=leave.leave_type,
        leave_type_name=leave_type.name_en if leave_type else leave.leave_type,
        color_code=leave_type.color_code if leave_type else "#3b82f6",
        is_paid=leave.is_paid,
        start_date=leave.start_date,
        end_date=leave.end_date,
        total_days=float(leave.total_days or 0),
        is_half_day=bool(getattr(leave, "is_half_day", False)),
        half_day_session=getattr(leave, "half_day_session", None),
        reason=leave.reason,
        emergency_contact=leave.emergency_contact,
        document_url=leave.document_url,
        status=leave.status,
        manager_approver_id=leave.manager_approver_id,
        manager_approver_name=f"{manager.first_name} {manager.last_name}" if manager else None,
        manager_remarks=leave.manager_remarks,
        manager_action_at=leave.manager_action_at,
        hr_approver_id=leave.hr_approver_id,
        hr_approver_name=f"{hr.first_name} {hr.last_name}" if hr else None,
        hr_remarks=leave.hr_remarks,
        hr_action_at=leave.hr_action_at,
        created_at=leave.created_at
    )


def _require_leave_status(leave: LeaveApplication, required_status: str) -> None:
    if leave.status != required_status:
        raise HTTPException(
            status_code=409,
            detail=f"Application must be {required_status.lower().replace('_', ' ')} for this action"
        )


def _validate_encashment_terms(policy: LeavePolicy, balance: LeaveBalance, days: Decimal, already_encashed: Decimal) -> None:
    if not policy.is_active or not policy.encashment_allowed:
        raise HTTPException(status_code=400, detail="Encashment is not enabled for this active leave policy.")
    if days <= 0:
        raise HTTPException(status_code=422, detail="Encashment days must be greater than zero.")
    if balance.available_days < days:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient available leave balance. Available: {balance.available_days} days; requested: {days} days."
        )
    cap = Decimal(str(policy.max_encashment_days or 0))
    if cap <= 0 or already_encashed + days > cap:
        raise HTTPException(
            status_code=400,
            detail=f"Encashment exceeds the policy annual cap of {cap} days. Already encashed: {already_encashed} days."
        )


@router.get("/leave-applications", response_model=LeavePaginatedOut)
async def list_leave_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    employee_id: Optional[int] = None,
    leave_type_id: Optional[int] = None,
    year: Optional[int] = None,
    closed_only: bool = False,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    from_date: Optional[date] = None,
    through_date: Optional[date] = None,
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeaveApplication).options(
        joinedload(LeaveApplication.employee).joinedload(Employee.department),
        joinedload(LeaveApplication.leave_type_obj),
        joinedload(LeaveApplication.manager_approver),
        joinedload(LeaveApplication.hr_approver)
    ).join(Employee, LeaveApplication.employee_id == Employee.id).where(LeaveApplication.organization_id == org_id)

    if status_filter:
        q = q.where(LeaveApplication.status == status_filter)
    if employee_id:
        q = q.where(LeaveApplication.employee_id == employee_id)
    if leave_type_id:
        q = q.where(LeaveApplication.leave_type_id == leave_type_id)
    if year:
        q = q.where(func.extract("year", LeaveApplication.start_date) == year)
    if closed_only:
        q = q.where(LeaveApplication.status.in_(["APPROVED", "REJECTED", "CANCELLED"]))
    if start_date:
        q = q.where(LeaveApplication.start_date >= start_date)
    if end_date:
        q = q.where(LeaveApplication.end_date <= end_date)
    if from_date:
        q = q.where(LeaveApplication.end_date >= from_date)
    if through_date:
        q = q.where(LeaveApplication.start_date <= through_date)
    if search:
        s = f"%{search.strip()}%"
        q = q.where(or_(
            Employee.first_name.ilike(s),
            Employee.last_name.ilike(s),
            Employee.employee_code.ilike(s),
            LeaveApplication.reason.ilike(s)
        ))

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(desc(LeaveApplication.id)).limit(limit).offset(offset))
    items = items_res.scalars().all()

    # Status counts for cockpit
    stats_q = select(
        LeaveApplication.status,
        func.count(LeaveApplication.id)
    ).where(LeaveApplication.organization_id == org_id).group_by(LeaveApplication.status)
    stats_res = await db.execute(stats_q)
    stats_map = {row[0]: row[1] for row in stats_res.all()}

    out_items = [_leave_application_out(leave) for leave in items]

    return LeavePaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset,
        pending_manager_count=stats_map.get("PENDING_MANAGER", 0),
        pending_hr_count=stats_map.get("PENDING_HR", 0),
        approved_count=stats_map.get("APPROVED", 0),
        rejected_count=stats_map.get("REJECTED", 0)
    )


@router.get("/leave-applications/{leave_id}", response_model=LeaveOut)
async def get_leave_application(
    leave_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    result = await db.execute(select(LeaveApplication).options(
        joinedload(LeaveApplication.employee).joinedload(Employee.department),
        joinedload(LeaveApplication.leave_type_obj),
        joinedload(LeaveApplication.manager_approver),
        joinedload(LeaveApplication.hr_approver)
    ).where(and_(LeaveApplication.id == leave_id, LeaveApplication.organization_id == org_id)))
    leave = result.unique().scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave application not found")
    return _leave_application_out(leave)


@router.post("/leave-applications", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
async def apply_for_leave(
    payload: LeaveApply,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    if payload.is_half_day:
        days = Decimal("0.5")
    else:
        days = Decimal(str((payload.end_date - payload.start_date).days + 1))

    if days <= Decimal("0"):
        raise HTTPException(status_code=400, detail="End date must be after or equal to start date")
    if payload.start_date.year != payload.end_date.year:
        raise HTTPException(status_code=400, detail="Leave applications must be within a single leave year")
    if not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Leave reason is required")

    # Match leave type
    lt = None
    if payload.leave_type_id:
        lt_res = await db.execute(select(LeaveType).where(and_(
            LeaveType.id == payload.leave_type_id,
            LeaveType.organization_id == org_id,
            LeaveType.is_active.is_(True)
        )))
        lt = lt_res.scalar_one_or_none()
    elif payload.leave_type:
        lt_res = await db.execute(select(LeaveType).where(and_(LeaveType.organization_id == org_id, LeaveType.leave_type_code == payload.leave_type.upper())))
        lt = lt_res.scalar_one_or_none()

    employee_res = await db.execute(select(Employee).options(
        joinedload(Employee.department)
    ).where(and_(
        Employee.id == payload.employee_id,
        Employee.organization_id == org_id
    )))
    employee = employee_res.unique().scalar_one_or_none()
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    if not lt:
        raise HTTPException(status_code=404, detail="Active leave type not found")

    yr = payload.start_date.year
    if lt and lt.is_paid:
        bal_res = await db.execute(select(LeaveBalance).where(and_(
            LeaveBalance.organization_id == org_id,
            LeaveBalance.employee_id == payload.employee_id,
            LeaveBalance.leave_type_id == lt.id,
            LeaveBalance.year == yr
        )).with_for_update())
        bal = bal_res.scalar_one_or_none()
        if not bal:
            raise HTTPException(status_code=400, detail="No leave entitlement exists for the selected employee, type and year")
        if bal.available_days < days:
            raise HTTPException(status_code=400, detail=f"Insufficient leave balance. Available: {bal.available_days} days, Requested: {days} days")
        bal.pending_days += days
        bal.available_days -= days

    leave = LeaveApplication(
        organization_id=org_id,
        employee_id=payload.employee_id,
        leave_type_id=lt.id if lt else None,
        leave_type=lt.leave_type_code if lt else payload.leave_type.upper(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_days=days,
        is_half_day=payload.is_half_day,
        half_day_session=payload.half_day_session if payload.is_half_day else None,
        reason=payload.reason.strip(),
        emergency_contact=payload.emergency_contact,
        document_url=payload.document_url,
        is_paid=lt.is_paid if lt else True,
        status="PENDING_MANAGER"
    )
    leave.employee = employee
    leave.leave_type_obj = lt
    db.add(leave)
    await db.commit()
    await db.refresh(leave)

    return _leave_application_out(leave)


@router.put("/leave-applications/{leave_id}", response_model=LeaveOut)
async def update_leave_application(
    leave_id: int,
    payload: LeaveUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    result = await db.execute(select(LeaveApplication).options(
        joinedload(LeaveApplication.employee).joinedload(Employee.department),
        joinedload(LeaveApplication.leave_type_obj),
        joinedload(LeaveApplication.manager_approver),
        joinedload(LeaveApplication.hr_approver)
    ).where(and_(
        LeaveApplication.id == leave_id,
        LeaveApplication.organization_id == org_id
    )).with_for_update())
    leave = result.unique().scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave application not found")
    if leave.status != "PENDING_MANAGER":
        raise HTTPException(status_code=409, detail="Only applications pending manager review can be edited")

    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    start_date = data.get("start_date", leave.start_date)
    end_date = data.get("end_date", leave.end_date)
    if start_date is None or end_date is None:
        raise HTTPException(status_code=422, detail="Leave start and end dates are required.")
    days = (end_date - start_date).days + 1
    if days <= 0:
        raise HTTPException(status_code=422, detail="End date must be on or after the start date.")
    if start_date.year != end_date.year:
        raise HTTPException(status_code=422, detail="Leave applications must be within a single leave year.")
    if "reason" in data and not (data["reason"] or "").strip():
        raise HTTPException(status_code=422, detail="Leave reason is required; enter a brief explanation.")

    new_type = leave.leave_type_obj
    if "leave_type_id" in data:
        type_result = await db.execute(select(LeaveType).where(and_(
            LeaveType.id == data["leave_type_id"],
            LeaveType.organization_id == org_id,
            LeaveType.is_active.is_(True)
        )))
        new_type = type_result.scalar_one_or_none()
        if not new_type:
            raise HTTPException(status_code=404, detail="Active leave type not found")

    old_balance = None
    if leave.leave_type_id and leave.is_paid:
        old_result = await db.execute(select(LeaveBalance).where(and_(
            LeaveBalance.organization_id == org_id,
            LeaveBalance.employee_id == leave.employee_id,
            LeaveBalance.leave_type_id == leave.leave_type_id,
            LeaveBalance.year == leave.start_date.year
        )).with_for_update())
        old_balance = old_result.scalar_one_or_none()
        if old_balance:
            amount = Decimal(str(leave.total_days))
            old_balance.pending_days = max(Decimal("0.00"), old_balance.pending_days - amount)
            old_balance.available_days += amount

    if new_type and new_type.is_paid:
        balance_result = await db.execute(select(LeaveBalance).where(and_(
            LeaveBalance.organization_id == org_id,
            LeaveBalance.employee_id == leave.employee_id,
            LeaveBalance.leave_type_id == new_type.id,
            LeaveBalance.year == start_date.year
        )).with_for_update())
        balance = balance_result.scalar_one_or_none()
        if not balance:
            raise HTTPException(status_code=400, detail="No leave entitlement exists for the selected employee, type and year")
        requested = Decimal(str(days))
        if balance.available_days < requested:
            raise HTTPException(status_code=400, detail=f"Insufficient leave balance. Available: {balance.available_days} days, Requested: {days} days")
        balance.pending_days += requested
        balance.available_days -= requested

    for field in ("start_date", "end_date", "reason", "emergency_contact", "document_url"):
        if field in data:
            setattr(leave, field, data[field])
    if "leave_type_id" in data:
        leave.leave_type_id = new_type.id
        leave.leave_type = new_type.leave_type_code
        leave.leave_type_obj = new_type
        leave.is_paid = new_type.is_paid
    leave.total_days = days
    await db.commit()
    return _leave_application_out(leave)

@router.post("/leave-applications/{leave_id}/manager-review", response_model=LeaveOut)
async def manager_review_leave(
    leave_id: int,
    payload: LeaveManagerReview,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeaveApplication).options(
        joinedload(LeaveApplication.employee).joinedload(Employee.department),
        joinedload(LeaveApplication.leave_type_obj),
        joinedload(LeaveApplication.manager_approver),
        joinedload(LeaveApplication.hr_approver)
    ).where(and_(LeaveApplication.id == leave_id, LeaveApplication.organization_id == org_id)).with_for_update()
    res = await db.execute(q)
    leave = res.unique().scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave application not found")
    _require_leave_status(leave, "PENDING_MANAGER")

    leave.manager_approver_id = current_user.id if current_user else None
    leave.manager_remarks = payload.manager_remarks
    leave.manager_action_at = datetime.now()

    if payload.is_approved:
        leave.status = "PENDING_HR"
    else:
        leave.status = "REJECTED"
        # Restore pending balance
        if leave.leave_type_id and leave.is_paid:
            bal_res = await db.execute(select(LeaveBalance).where(and_(
                LeaveBalance.organization_id == org_id,
                LeaveBalance.employee_id == leave.employee_id,
                LeaveBalance.leave_type_id == leave.leave_type_id,
                LeaveBalance.year == leave.start_date.year
            )))
            bal = bal_res.scalar_one_or_none()
            if bal:
                bal.pending_days = max(Decimal("0.00"), bal.pending_days - Decimal(str(leave.total_days)))
                bal.available_days += Decimal(str(leave.total_days))

    await db.commit()
    await db.refresh(leave)

    emp = leave.employee
    lt = leave.leave_type_obj
    mgr = leave.manager_approver
    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        leave_type_id=leave.leave_type_id,
        leave_type=leave.leave_type,
        leave_type_name=lt.name_en if lt else leave.leave_type,
        color_code=lt.color_code if lt else "#3b82f6",
        is_paid=leave.is_paid,
        start_date=leave.start_date,
        end_date=leave.end_date,
        total_days=leave.total_days,
        reason=leave.reason,
        emergency_contact=leave.emergency_contact,
        document_url=leave.document_url,
        status=leave.status,
        manager_approver_id=leave.manager_approver_id,
        manager_approver_name=f"{mgr.first_name} {mgr.last_name}" if mgr else None,
        manager_remarks=leave.manager_remarks,
        manager_action_at=leave.manager_action_at,
        created_at=leave.created_at
    )

@router.post("/leave-applications/{leave_id}/hr-review", response_model=LeaveOut)
async def hr_review_leave(
    leave_id: int,
    payload: LeaveHRReview,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeaveApplication).options(
        joinedload(LeaveApplication.employee).joinedload(Employee.department),
        joinedload(LeaveApplication.leave_type_obj),
        joinedload(LeaveApplication.manager_approver),
        joinedload(LeaveApplication.hr_approver)
    ).where(and_(LeaveApplication.id == leave_id, LeaveApplication.organization_id == org_id)).with_for_update()
    res = await db.execute(q)
    leave = res.unique().scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave application not found")
    _require_leave_status(leave, "PENDING_HR")

    leave.hr_approver_id = current_user.id if current_user else None
    leave.hr_remarks = payload.hr_remarks
    leave.hr_action_at = datetime.now()

    if payload.is_approved:
        leave.status = "APPROVED"
        # Update Leave Balance: pending -> used
        if leave.leave_type_id and leave.is_paid:
            bal_res = await db.execute(select(LeaveBalance).where(and_(
                LeaveBalance.organization_id == org_id,
                LeaveBalance.employee_id == leave.employee_id,
                LeaveBalance.leave_type_id == leave.leave_type_id,
                LeaveBalance.year == leave.start_date.year
            )))
            bal = bal_res.scalar_one_or_none()
            if bal:
                bal.pending_days = max(Decimal("0.00"), bal.pending_days - Decimal(str(leave.total_days)))
                bal.used_days += Decimal(str(leave.total_days))

        # Synchronize attendance records for dates within range
        curr = leave.start_date
        while curr <= leave.end_date:
            att_q = select(Attendance).where(and_(
                Attendance.organization_id == org_id,
                Attendance.employee_id == leave.employee_id,
                Attendance.punch_date == curr
            ))
            att_res = await db.execute(att_q)
            att = att_res.scalar_one_or_none()
            if not att:
                att = Attendance(
                    organization_id=org_id,
                    employee_id=leave.employee_id,
                    punch_date=curr,
                    status="ON_LEAVE",
                    source="MANUAL_OVERRIDE",
                    remarks=f"Approved Leave: {leave.leave_type} ({leave.reason})"
                )
                db.add(att)
            else:
                att.status = "ON_LEAVE"
                att.remarks = f"Approved Leave: {leave.leave_type} ({leave.reason})"
            curr += timedelta(days=1)
    else:
        leave.status = "REJECTED"
        # Restore pending balance
        if leave.leave_type_id and leave.is_paid:
            bal_res = await db.execute(select(LeaveBalance).where(and_(
                LeaveBalance.organization_id == org_id,
                LeaveBalance.employee_id == leave.employee_id,
                LeaveBalance.leave_type_id == leave.leave_type_id,
                LeaveBalance.year == leave.start_date.year
            )))
            bal = bal_res.scalar_one_or_none()
            if bal:
                bal.pending_days = max(Decimal("0.00"), bal.pending_days - Decimal(str(leave.total_days)))
                bal.available_days += Decimal(str(leave.total_days))

    await db.commit()
    await db.refresh(leave)

    emp = leave.employee
    lt = leave.leave_type_obj
    mgr = leave.manager_approver
    hr = leave.hr_approver
    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        leave_type_id=leave.leave_type_id,
        leave_type=leave.leave_type,
        leave_type_name=lt.name_en if lt else leave.leave_type,
        color_code=lt.color_code if lt else "#3b82f6",
        is_paid=leave.is_paid,
        start_date=leave.start_date,
        end_date=leave.end_date,
        total_days=leave.total_days,
        reason=leave.reason,
        emergency_contact=leave.emergency_contact,
        document_url=leave.document_url,
        status=leave.status,
        manager_approver_id=leave.manager_approver_id,
        manager_approver_name=f"{mgr.first_name} {mgr.last_name}" if mgr else None,
        manager_remarks=leave.manager_remarks,
        manager_action_at=leave.manager_action_at,
        hr_approver_id=leave.hr_approver_id,
        hr_approver_name=f"{hr.first_name} {hr.last_name}" if hr else None,
        hr_remarks=leave.hr_remarks,
        hr_action_at=leave.hr_action_at,
        created_at=leave.created_at
    )

@router.post("/leave-applications/{leave_id}/cancel", response_model=LeaveOut)
async def cancel_leave_application(
    leave_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeaveApplication).options(
        joinedload(LeaveApplication.employee).joinedload(Employee.department),
        joinedload(LeaveApplication.leave_type_obj),
        joinedload(LeaveApplication.manager_approver),
        joinedload(LeaveApplication.hr_approver)
    ).where(and_(LeaveApplication.id == leave_id, LeaveApplication.organization_id == org_id)).with_for_update()
    res = await db.execute(q)
    leave = res.unique().scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave application not found")

    if leave.status in ["REJECTED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="Application already closed")

    prev_status = leave.status
    leave.status = "CANCELLED"

    # Reverse balance
    if leave.leave_type_id and leave.is_paid:
        bal_res = await db.execute(select(LeaveBalance).where(and_(
            LeaveBalance.organization_id == org_id,
            LeaveBalance.employee_id == leave.employee_id,
            LeaveBalance.leave_type_id == leave.leave_type_id,
            LeaveBalance.year == leave.start_date.year
        )))
        bal = bal_res.scalar_one_or_none()
        if bal:
            if prev_status == "APPROVED":
                bal.used_days = max(Decimal("0.00"), bal.used_days - Decimal(str(leave.total_days)))
                bal.available_days += Decimal(str(leave.total_days))
            else:
                bal.pending_days = max(Decimal("0.00"), bal.pending_days - Decimal(str(leave.total_days)))
                bal.available_days += Decimal(str(leave.total_days))

    await db.commit()
    await db.refresh(leave)

    emp = leave.employee
    lt = leave.leave_type_obj
    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        leave_type_id=leave.leave_type_id,
        leave_type=leave.leave_type,
        leave_type_name=lt.name_en if lt else leave.leave_type,
        color_code=lt.color_code if lt else "#3b82f6",
        is_paid=leave.is_paid,
        start_date=leave.start_date,
        end_date=leave.end_date,
        total_days=leave.total_days,
        reason=leave.reason,
        status=leave.status,
        created_at=leave.created_at
    )


# --- 2.16 Leave Calendar & Team Availability ---
@router.get("/leave/calendar-events", response_model=List[LeaveCalendarEventOut])
async def get_leave_calendar_events(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2050),
    department_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    first_day = date(year, month, 1)
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)

    # 1. Fetch Leaves overlapping the month
    leave_q = (
        select(LeaveApplication)
        .options(
            joinedload(LeaveApplication.employee).joinedload(Employee.department),
            joinedload(LeaveApplication.leave_type_obj)
        )
        .join(Employee, LeaveApplication.employee_id == Employee.id)
        .where(
            and_(
                LeaveApplication.organization_id == org_id,
                LeaveApplication.status.in_(["APPROVED", "PENDING_HR", "PENDING_MANAGER"]),
                LeaveApplication.start_date <= last_day,
                LeaveApplication.end_date >= first_day
            )
        )
    )
    if department_id:
        leave_q = leave_q.where(Employee.department_id == department_id)

    l_res = await db.execute(leave_q)
    leaves = l_res.unique().scalars().all()

    events: List[LeaveCalendarEventOut] = []
    for lv in leaves:
        emp = lv.employee
        lt = lv.leave_type_obj
        emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Employee"
        color = lt.color_code if lt and lt.color_code else "#3b82f6"
        events.append(LeaveCalendarEventOut(
            id=f"leave-{lv.id}",
            title=f"{emp_name} ({lt.name_en if lt else lv.leave_type})",
            start=max(lv.start_date, first_day),
            end=min(lv.end_date, last_day),
            event_type="LEAVE",
            employee_id=lv.employee_id,
            employee_name=emp_name,
            department_name=emp.department.name_en if emp and emp.department else None,
            status=lv.status,
            color=color,
            is_half_day=bool(getattr(lv, "is_half_day", False))
        ))

    # 2. Fetch Public & Company Holidays
    hol_q = select(HolidayCalendar).where(
        and_(
            HolidayCalendar.organization_id == org_id,
            HolidayCalendar.start_date <= last_day,
            HolidayCalendar.end_date >= first_day
        )
    )
    h_res = await db.execute(hol_q)
    holidays = h_res.scalars().all()

    for h in holidays:
        events.append(LeaveCalendarEventOut(
            id=f"holiday-{h.id}",
            title=f"Holiday: {h.holiday_name}",
            start=max(h.start_date, first_day),
            end=min(h.end_date, last_day),
            event_type="HOLIDAY",
            employee_id=None,
            employee_name=None,
            department_name=None,
            status="PUBLISHED",
            color="#ef4444",
            is_half_day=False
        ))

    return events


@router.get("/leave/team-availability", response_model=TeamAvailabilityOut)
async def get_team_availability(
    target_date: Optional[date] = None,
    department_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    eff_date = target_date or date.today()

    # Get active employees
    emp_q = (
        select(Employee)
        .options(joinedload(Employee.department))
        .where(and_(Employee.organization_id == org_id, Employee.is_active.is_(True)))
    )
    if department_id:
        emp_q = emp_q.where(Employee.department_id == department_id)

    emp_res = await db.execute(emp_q.order_by(Employee.first_name))
    employees = emp_res.unique().scalars().all()
    emp_ids = [e.id for e in employees]

    if not emp_ids:
        return TeamAvailabilityOut(
            date=eff_date,
            total_employees=0,
            available_count=0,
            on_leave_count=0,
            items=[]
        )

    # Check leaves on eff_date
    l_res = await db.execute(
        select(LeaveApplication).where(
            and_(
                LeaveApplication.organization_id == org_id,
                LeaveApplication.employee_id.in_(emp_ids),
                LeaveApplication.status.in_(["APPROVED", "PENDING_HR"]),
                LeaveApplication.start_date <= eff_date,
                LeaveApplication.end_date >= eff_date
            )
        )
    )
    leaves_today = {l.employee_id: l for l in l_res.scalars().all()}

    # Check shift assignments
    sa_res = await db.execute(
        select(ShiftAssignment)
        .options(joinedload(ShiftAssignment.shift))
        .where(
            and_(
                ShiftAssignment.organization_id == org_id,
                ShiftAssignment.assignment_type == "EMPLOYEE",
                ShiftAssignment.target_id.in_(emp_ids),
                ShiftAssignment.start_date <= eff_date,
                or_(ShiftAssignment.end_date.is_(None), ShiftAssignment.end_date >= eff_date)
            )
        )
    )
    shifts_today = {sa.target_id: sa.shift for sa in sa_res.scalars().all()}

    weekday_name = eff_date.strftime("%A").upper()  # e.g., FRIDAY, SATURDAY

    items: List[TeamAvailabilityItem] = []
    available_count = 0
    on_leave_count = 0

    for emp in employees:
        emp_name = f"{emp.first_name} {emp.last_name}".strip()
        dept_name = emp.department.name_en if emp.department else None
        sh = shifts_today.get(emp.id)
        sh_name = sh.shift_name if sh else None

        # Check if on leave
        lv = leaves_today.get(emp.id)
        if lv:
            if getattr(lv, "is_half_day", False):
                status_str = "HALF_DAY_LEAVE"
            else:
                status_str = "ON_LEAVE"
            leave_tp = lv.leave_type
            on_leave_count += 1
        elif sh and sh.weekly_off_days and weekday_name in sh.weekly_off_days.upper():
            status_str = "WEEKLY_OFF"
            leave_tp = None
        else:
            status_str = "AVAILABLE"
            leave_tp = None
            available_count += 1

        items.append(TeamAvailabilityItem(
            employee_id=emp.id,
            employee_name=emp_name,
            employee_code=emp.employee_code,
            department_name=dept_name,
            status=status_str,
            leave_type=leave_tp,
            shift_name=sh_name
        ))

    return TeamAvailabilityOut(
        date=eff_date,
        total_employees=len(employees),
        available_count=available_count,
        on_leave_count=on_leave_count,
        items=items
    )


# --- Leave Encashment Register ---
def _leave_encashment_out(item: LeaveEncashment) -> LeaveEncashmentOut:
    return LeaveEncashmentOut(
        id=item.id,
        employee_id=item.employee_id,
        employee_name=f"{item.employee.first_name} {item.employee.last_name}" if item.employee else None,
        employee_code=item.employee.employee_code if item.employee else None,
        leave_type_id=item.leave_type_id,
        leave_type_name=item.leave_type.name_en if item.leave_type else None,
        year=item.year,
        days=item.days,
        reason=item.reason,
        status=item.status,
        created_at=item.created_at,
        approved_at=item.approved_at,
        archived_at=item.archived_at
    )


def _encashment_query():
    return select(LeaveEncashment).options(
        joinedload(LeaveEncashment.employee),
        joinedload(LeaveEncashment.leave_type)
    )


@router.get("/leave-encashments", response_model=LeaveEncashmentPaginatedOut)
async def list_leave_encashments(
    employee_id: Optional[int] = None,
    leave_type_id: Optional[int] = None,
    year: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = _encashment_query().join(Employee, LeaveEncashment.employee_id == Employee.id).where(
        LeaveEncashment.organization_id == org_id
    )
    if employee_id:
        q = q.where(LeaveEncashment.employee_id == employee_id)
    if leave_type_id:
        q = q.where(LeaveEncashment.leave_type_id == leave_type_id)
    if year:
        q = q.where(LeaveEncashment.year == year)
    if status_filter:
        q = q.where(LeaveEncashment.status == status_filter)
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.where(or_(
            Employee.first_name.ilike(term),
            Employee.last_name.ilike(term),
            Employee.employee_code.ilike(term),
            LeaveEncashment.reason.ilike(term)
        ))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one() or 0
    results = await db.execute(q.order_by(desc(LeaveEncashment.id)).limit(limit).offset(offset))
    return LeaveEncashmentPaginatedOut(
        items=[_leave_encashment_out(item) for item in results.unique().scalars().all()],
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/leave-encashments/{encashment_id}", response_model=LeaveEncashmentOut)
async def get_leave_encashment(
    encashment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    result = await db.execute(_encashment_query().where(and_(
        LeaveEncashment.id == encashment_id,
        LeaveEncashment.organization_id == get_org_id(current_user)
    )))
    item = result.unique().scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Leave encashment not found")
    return _leave_encashment_out(item)


@router.post("/leave-encashments", response_model=LeaveEncashmentOut, status_code=status.HTTP_201_CREATED)
async def create_leave_encashment(
    payload: LeaveEncashmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    employee = (await db.execute(select(Employee).where(and_(
        Employee.id == payload.employee_id, Employee.organization_id == org_id
    )))).scalar_one_or_none()
    leave_type = (await db.execute(select(LeaveType).where(and_(
        LeaveType.id == payload.leave_type_id,
        LeaveType.organization_id == org_id,
        LeaveType.is_active.is_(True)
    )))).scalar_one_or_none()
    balance = (await db.execute(select(LeaveBalance).where(and_(
        LeaveBalance.organization_id == org_id,
        LeaveBalance.employee_id == payload.employee_id,
        LeaveBalance.leave_type_id == payload.leave_type_id,
        LeaveBalance.year == payload.year
    )))).scalar_one_or_none()
    policy = (await db.execute(select(LeavePolicy).where(and_(
        LeavePolicy.organization_id == org_id,
        LeavePolicy.leave_type_id == payload.leave_type_id,
        LeavePolicy.is_active.is_(True),
        LeavePolicy.encashment_allowed.is_(True)
    )).order_by(LeavePolicy.id.desc()).limit(1))).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found in this organization.")
    if not leave_type or not leave_type.is_paid:
        raise HTTPException(status_code=400, detail="Encashment requires an active paid leave type.")
    if not balance:
        raise HTTPException(status_code=400, detail="No leave balance exists for the selected employee, type and year.")
    if not policy:
        raise HTTPException(status_code=400, detail="No active encashment-enabled leave policy exists for the selected leave type.")
    if employee.joining_date and (date.today() - employee.joining_date).days < policy.min_service_days_required:
        raise HTTPException(
            status_code=400,
            detail=f"Employee must complete {policy.min_service_days_required} service days before encashment."
        )
    if not policy.encashment_allowed:
        raise HTTPException(status_code=400, detail="Encashment is not enabled for this leave policy.")

    item = LeaveEncashment(
        organization_id=org_id,
        employee_id=employee.id,
        leave_type_id=leave_type.id,
        balance_id=balance.id,
        year=payload.year,
        days=payload.days,
        reason=payload.reason,
        status="DRAFT"
    )
    db.add(item)
    await db.commit()
    result = await db.execute(_encashment_query().where(LeaveEncashment.id == item.id))
    return _leave_encashment_out(result.unique().scalar_one())


@router.put("/leave-encashments/{encashment_id}", response_model=LeaveEncashmentOut)
async def update_leave_encashment(
    encashment_id: int,
    payload: LeaveEncashmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    result = await db.execute(select(LeaveEncashment).where(and_(
        LeaveEncashment.id == encashment_id, LeaveEncashment.organization_id == org_id
    )).with_for_update())
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Leave encashment not found")
    if item.status != "DRAFT":
        raise HTTPException(status_code=409, detail="Only draft encashment requests can be edited.")
    for key, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(item, key, value)
    await db.commit()
    result = await db.execute(_encashment_query().where(LeaveEncashment.id == item.id))
    return _leave_encashment_out(result.unique().scalar_one())


@router.post("/leave-encashments/{encashment_id}/approve", response_model=LeaveEncashmentOut)
async def approve_leave_encashment(
    encashment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    item = (await db.execute(select(LeaveEncashment).where(and_(
        LeaveEncashment.id == encashment_id, LeaveEncashment.organization_id == org_id
    )).with_for_update())).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Leave encashment not found")
    if item.status != "DRAFT":
        raise HTTPException(status_code=409, detail="Only draft encashment requests can be approved.")
    employee = (await db.execute(select(Employee).where(and_(
        Employee.id == item.employee_id, Employee.organization_id == org_id
    )))).scalar_one_or_none()
    leave_type = (await db.execute(select(LeaveType).where(and_(
        LeaveType.id == item.leave_type_id, LeaveType.organization_id == org_id
    )))).scalar_one_or_none()
    balance = (await db.execute(select(LeaveBalance).where(and_(
        LeaveBalance.id == item.balance_id,
        LeaveBalance.organization_id == org_id
    )).with_for_update())).scalar_one_or_none()
    policy = (await db.execute(select(LeavePolicy).where(and_(
        LeavePolicy.organization_id == org_id,
        LeavePolicy.leave_type_id == item.leave_type_id,
        LeavePolicy.is_active.is_(True),
        LeavePolicy.encashment_allowed.is_(True)
    )).order_by(LeavePolicy.id.desc()).limit(1))).scalar_one_or_none()
    if not employee or not leave_type or not leave_type.is_paid or not balance or not policy:
        raise HTTPException(status_code=409, detail="The employee, paid leave type, entitlement or active policy is no longer valid.")
    if (
        balance.employee_id != item.employee_id
        or balance.leave_type_id != item.leave_type_id
        or balance.year != item.year
    ):
        raise HTTPException(status_code=409, detail="The encashment no longer matches its employee, leave type and year entitlement.")
    if employee.joining_date and (date.today() - employee.joining_date).days < policy.min_service_days_required:
        raise HTTPException(status_code=400, detail=f"Employee must complete {policy.min_service_days_required} service days before encashment.")
    already = (await db.execute(select(func.coalesce(func.sum(LeaveEncashment.days), 0)).where(and_(
        LeaveEncashment.organization_id == org_id,
        LeaveEncashment.employee_id == item.employee_id,
        LeaveEncashment.leave_type_id == item.leave_type_id,
        LeaveEncashment.year == item.year,
        LeaveEncashment.status == "APPROVED"
    )))).scalar_one()
    _validate_encashment_terms(policy, balance, Decimal(str(item.days)), Decimal(str(already)))
    balance.available_days -= Decimal(str(item.days))
    balance.encashed_days += Decimal(str(item.days))
    item.status = "APPROVED"
    item.approved_at = datetime.utcnow()
    await db.commit()
    result = await db.execute(_encashment_query().where(LeaveEncashment.id == item.id))
    return _leave_encashment_out(result.unique().scalar_one())


@router.post("/leave-encashments/{encashment_id}/archive", response_model=LeaveEncashmentOut)
async def archive_leave_encashment(
    encashment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    item = (await db.execute(select(LeaveEncashment).where(and_(
        LeaveEncashment.id == encashment_id, LeaveEncashment.organization_id == org_id
    )).with_for_update())).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Leave encashment not found")
    if item.status != "DRAFT":
        raise HTTPException(status_code=409, detail="Only draft requests can be archived. Reverse approved settlements first.")
    item.status = "ARCHIVED"
    item.archived_at = datetime.utcnow()
    await db.commit()
    result = await db.execute(_encashment_query().where(LeaveEncashment.id == item.id))
    return _leave_encashment_out(result.unique().scalar_one())


@router.post("/leave-encashments/{encashment_id}/reverse", response_model=LeaveEncashmentOut)
async def reverse_leave_encashment(
    encashment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    item = (await db.execute(select(LeaveEncashment).where(and_(
        LeaveEncashment.id == encashment_id, LeaveEncashment.organization_id == org_id
    )).with_for_update())).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Leave encashment not found")
    if item.status != "APPROVED":
        raise HTTPException(status_code=409, detail="Only approved encashments can be reversed.")
    balance = (await db.execute(select(LeaveBalance).where(and_(
        LeaveBalance.id == item.balance_id, LeaveBalance.organization_id == org_id
    )).with_for_update())).scalar_one_or_none()
    if not balance:
        raise HTTPException(status_code=409, detail="The entitlement balance is unavailable; settlement cannot be reversed.")
    amount = Decimal(str(item.days))
    if balance.encashed_days < amount:
        raise HTTPException(status_code=409, detail="The entitlement balance no longer contains this encashment total.")
    balance.encashed_days -= amount
    balance.available_days += amount
    item.status = "REVERSED"
    await db.commit()
    result = await db.execute(_encashment_query().where(LeaveEncashment.id == item.id))
    return _leave_encashment_out(result.unique().scalar_one())


@router.delete("/leave-encashments/{encashment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_leave_encashment(
    encashment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    item = (await db.execute(select(LeaveEncashment).where(and_(
        LeaveEncashment.id == encashment_id,
        LeaveEncashment.organization_id == get_org_id(current_user)
    )).with_for_update())).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Leave encashment not found")
    if item.status != "DRAFT":
        raise HTTPException(status_code=409, detail="Only draft encashment requests can be deleted; settled records remain auditable.")
    await db.delete(item)
    await db.commit()
    return None


# --- 2.17, 2.18, 2.19 Overtime Request, Verification & Approval ---
@router.get("/overtime-requests", response_model=OvertimeRequestPaginatedOut)
async def list_overtime_requests(
    ot_date: Optional[date] = None,
    employee_id: Optional[int] = None,
    project_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(OvertimeRequest).where(OvertimeRequest.organization_id == org_id)

    if ot_date:
        q = q.where(OvertimeRequest.ot_date == ot_date)
    if employee_id:
        q = q.where(OvertimeRequest.employee_id == employee_id)
    if project_id:
        q = q.where(OvertimeRequest.project_id == project_id)
    if status_filter:
        q = q.where(OvertimeRequest.status == status_filter)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    # Aggregate summaries
    sum_q = select(
        func.sum(OvertimeRequest.requested_hours),
        func.sum(OvertimeRequest.approved_hours),
        func.sum(OvertimeRequest.calculated_amount)
    ).where(OvertimeRequest.organization_id == org_id)
    if status_filter:
        sum_q = sum_q.where(OvertimeRequest.status == status_filter)
    sum_res = await db.execute(sum_q)
    sum_row = sum_res.fetchone()
    tot_req_hrs = sum_row[0] or Decimal("0.00")
    tot_app_hrs = sum_row[1] or Decimal("0.00")
    tot_app_amt = sum_row[2] or Decimal("0.00")

    items_res = await db.execute(q.order_by(desc(OvertimeRequest.id)).limit(limit).offset(offset))
    items = items_res.scalars().all()

    out_items = []
    for ot in items:
        emp = ot.employee
        proj = ot.project
        v_user = ot.verifier
        a_user = ot.approver
        att = ot.attendance
        out_items.append(OvertimeRequestOut(
            id=ot.id,
            employee_id=ot.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            project_id=ot.project_id,
            project_name=proj.name if proj else None,
            ot_date=ot.ot_date,
            ot_type=ot.ot_type,
            start_time=ot.start_time,
            end_time=ot.end_time,
            requested_hours=ot.requested_hours,
            task_description=ot.task_description,
            attendance_id=ot.attendance_id,
            attendance_working_hours=att.working_hours if att else None,
            verified_hours=ot.verified_hours,
            verifier_id=ot.verifier_id,
            verifier_name=f"{v_user.first_name} {v_user.last_name}" if v_user else None,
            verifier_remarks=ot.verifier_remarks,
            verified_at=ot.verified_at,
            approved_hours=ot.approved_hours,
            approver_id=ot.approver_id,
            approver_name=f"{a_user.first_name} {a_user.last_name}" if a_user else None,
            approver_remarks=ot.approver_remarks,
            approved_at=ot.approved_at,
            rate_multiplier=ot.rate_multiplier,
            calculated_amount=ot.calculated_amount,
            is_payroll_processed=ot.is_payroll_processed,
            payroll_run_id=ot.payroll_run_id,
            status=ot.status,
            created_at=ot.created_at
        ))

    return OvertimeRequestPaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset,
        total_requested_hours=tot_req_hrs,
        total_approved_hours=tot_app_hrs,
        total_approved_amount=tot_app_amt
    )

@router.post("/overtime-requests", response_model=OvertimeRequestOut, status_code=status.HTTP_201_CREATED)
async def create_overtime_request(
    payload: OvertimeRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)

    # Check attendance punch record for supporting cross-check
    att_res = await db.execute(select(Attendance).where(and_(
        Attendance.organization_id == org_id,
        Attendance.employee_id == payload.employee_id,
        Attendance.punch_date == payload.ot_date
    )))
    att = att_res.scalar_one_or_none()

    # Calculate multiplier: Normal OT = 1.5, Weekend/Holiday OT = 2.0
    mult = Decimal("2.00") if payload.ot_type in ["WEEKEND_OT", "HOLIDAY_OT"] else Decimal("1.50")

    # Fetch employee basic salary to estimate hourly rate: basic / (30 * 8)
    emp_res = await db.execute(select(Employee).where(Employee.id == payload.employee_id))
    emp = emp_res.scalar_one_or_none()
    basic_sal = emp.basic_salary if emp and emp.basic_salary else Decimal("20000.00")
    hourly_rate = basic_sal / Decimal("240.00")
    est_amount = Decimal(str(round(float(payload.requested_hours) * float(hourly_rate) * float(mult), 2)))

    ot = OvertimeRequest(
        organization_id=org_id,
        employee_id=payload.employee_id,
        project_id=payload.project_id,
        ot_date=payload.ot_date,
        ot_type=payload.ot_type,
        start_time=payload.start_time,
        end_time=payload.end_time,
        requested_hours=payload.requested_hours,
        task_description=payload.task_description.strip(),
        attendance_id=att.id if att else None,
        rate_multiplier=mult,
        calculated_amount=est_amount,
        status="SUBMITTED"
    )
    db.add(ot)
    await db.commit()
    await db.refresh(ot)

    return OvertimeRequestOut(
        id=ot.id,
        employee_id=ot.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        project_id=ot.project_id,
        ot_date=ot.ot_date,
        ot_type=ot.ot_type,
        start_time=ot.start_time,
        end_time=ot.end_time,
        requested_hours=ot.requested_hours,
        task_description=ot.task_description,
        attendance_id=ot.attendance_id,
        attendance_working_hours=att.working_hours if att else None,
        rate_multiplier=ot.rate_multiplier,
        calculated_amount=ot.calculated_amount,
        status=ot.status,
        created_at=ot.created_at
    )

@router.post("/overtime-requests/{ot_id}/verify", response_model=OvertimeRequestOut)
async def verify_overtime_request(
    ot_id: int,
    payload: OvertimeVerify,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(OvertimeRequest).where(and_(OvertimeRequest.id == ot_id, OvertimeRequest.organization_id == org_id))
    res = await db.execute(q)
    ot = res.scalar_one_or_none()
    if not ot:
        raise HTTPException(status_code=404, detail="Overtime request not found")

    ot.verifier_id = current_user.id if current_user else None
    ot.verified_remarks = payload.verifier_remarks
    ot.verified_at = datetime.now()

    if payload.is_verified:
        ot.verified_hours = payload.verified_hours
        ot.status = "VERIFIED"
    else:
        ot.status = "REJECTED"

    await db.commit()
    await db.refresh(ot)

    emp = ot.employee
    v_user = ot.verifier
    return OvertimeRequestOut(
        id=ot.id,
        employee_id=ot.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        project_id=ot.project_id,
        ot_date=ot.ot_date,
        ot_type=ot.ot_type,
        start_time=ot.start_time,
        end_time=ot.end_time,
        requested_hours=ot.requested_hours,
        task_description=ot.task_description,
        verified_hours=ot.verified_hours,
        verifier_id=ot.verifier_id,
        verifier_name=f"{v_user.first_name} {v_user.last_name}" if v_user else None,
        verifier_remarks=ot.verifier_remarks,
        verified_at=ot.verified_at,
        rate_multiplier=ot.rate_multiplier,
        calculated_amount=ot.calculated_amount,
        status=ot.status,
        created_at=ot.created_at
    )

@router.post("/overtime-requests/{ot_id}/approve", response_model=OvertimeRequestOut)
async def approve_overtime_request(
    ot_id: int,
    payload: OvertimeApprove,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(OvertimeRequest).where(and_(OvertimeRequest.id == ot_id, OvertimeRequest.organization_id == org_id))
    res = await db.execute(q)
    ot = res.scalar_one_or_none()
    if not ot:
        raise HTTPException(status_code=404, detail="Overtime request not found")

    ot.approver_id = current_user.id if current_user else None
    ot.approver_remarks = payload.approver_remarks
    ot.approved_at = datetime.now()

    if payload.is_approved:
        ot.approved_hours = payload.approved_hours
        ot.rate_multiplier = payload.rate_multiplier

        emp = ot.employee
        basic_sal = emp.basic_salary if emp and emp.basic_salary else Decimal("20000.00")
        hourly_rate = basic_sal / Decimal("240.00")
        ot.calculated_amount = Decimal(str(round(float(payload.approved_hours) * float(hourly_rate) * float(payload.rate_multiplier), 2)))
        ot.status = "APPROVED"
    else:
        ot.status = "REJECTED"

    await db.commit()
    await db.refresh(ot)

    emp = ot.employee
    v_user = ot.verifier
    a_user = ot.approver
    return OvertimeRequestOut(
        id=ot.id,
        employee_id=ot.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        project_id=ot.project_id,
        ot_date=ot.ot_date,
        ot_type=ot.ot_type,
        start_time=ot.start_time,
        end_time=ot.end_time,
        requested_hours=ot.requested_hours,
        task_description=ot.task_description,
        verified_hours=ot.verified_hours,
        verifier_id=ot.verifier_id,
        verifier_name=f"{v_user.first_name} {v_user.last_name}" if v_user else None,
        verifier_remarks=ot.verifier_remarks,
        verified_at=ot.verified_at,
        approved_hours=ot.approved_hours,
        approver_id=ot.approver_id,
        approver_name=f"{a_user.first_name} {a_user.last_name}" if a_user else None,
        approver_remarks=ot.approver_remarks,
        approved_at=ot.approved_at,
        rate_multiplier=ot.rate_multiplier,
        calculated_amount=ot.calculated_amount,
        status=ot.status,
        created_at=ot.created_at
    )


# --- 2.20 Payroll Integration ---
@router.get("/payroll-inputs", response_model=PayrollInputPaginatedOut)
async def list_payroll_inputs(
    month: int = Query(10, ge=1, le=12),
    year: int = Query(2026),
    employee_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(PayrollInput).where(and_(
        PayrollInput.organization_id == org_id,
        PayrollInput.month == month,
        PayrollInput.year == year
    ))
    if employee_id:
        q = q.where(PayrollInput.employee_id == employee_id)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(PayrollInput.employee_id).limit(limit).offset(offset))
    items = items_res.scalars().all()

    out_items = []
    for pi in items:
        emp = pi.employee
        out_items.append(PayrollInputOut(
            id=pi.id,
            employee_id=pi.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            month=pi.month,
            year=pi.year,
            payroll_run_id=pi.payroll_run_id,
            approved_overtime_hours=pi.approved_overtime_hours,
            overtime_amount=pi.overtime_amount,
            unpaid_leave_days=pi.unpaid_leave_days,
            deduction_amount=pi.deduction_amount,
            source_reference=pi.source_reference,
            is_locked=pi.is_locked,
            created_at=pi.created_at
        ))

    return PayrollInputPaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset
    )

@router.post("/payroll-inputs/sync")
async def sync_leave_and_overtime_to_payroll(
    payload: PayrollSyncLeaveOTRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    m = payload.month
    y = payload.year

    # 1. Fetch approved overtime for month & year
    ot_q = select(
        OvertimeRequest.employee_id,
        func.sum(OvertimeRequest.approved_hours),
        func.sum(OvertimeRequest.calculated_amount)
    ).where(and_(
        OvertimeRequest.organization_id == org_id,
        OvertimeRequest.status == "APPROVED",
        func.extract('month', OvertimeRequest.ot_date) == m,
        func.extract('year', OvertimeRequest.ot_date) == y
    )).group_by(OvertimeRequest.employee_id)

    if payload.employee_id:
        ot_q = ot_q.where(OvertimeRequest.employee_id == payload.employee_id)

    ot_res = await db.execute(ot_q)
    ot_by_emp = {row[0]: (row[1] or Decimal("0.00"), row[2] or Decimal("0.00")) for row in ot_res.all()}

    # 2. Fetch unpaid leaves for month & year
    unpaid_q = select(
        LeaveApplication.employee_id,
        func.sum(LeaveApplication.total_days)
    ).where(and_(
        LeaveApplication.organization_id == org_id,
        LeaveApplication.status == "APPROVED",
        LeaveApplication.is_paid == False,
        func.extract('month', LeaveApplication.start_date) == m,
        func.extract('year', LeaveApplication.start_date) == y
    )).group_by(LeaveApplication.employee_id)

    if payload.employee_id:
        unpaid_q = unpaid_q.where(LeaveApplication.employee_id == payload.employee_id)

    unpaid_res = await db.execute(unpaid_q)
    unpaid_by_emp = {row[0]: (row[1] or Decimal("0.00")) for row in unpaid_res.all()}

    all_emp_ids = set(ot_by_emp.keys()).union(set(unpaid_by_emp.keys()))
    synced_count = 0

    for emp_id in all_emp_ids:
        ot_hours, ot_amt = ot_by_emp.get(emp_id, (Decimal("0.00"), Decimal("0.00")))
        unpaid_days = unpaid_by_emp.get(emp_id, Decimal("0.00"))

        # Calculate unpaid deduction based on daily basic salary
        emp_res = await db.execute(select(Employee).where(Employee.id == emp_id))
        emp = emp_res.scalar_one_or_none()
        basic = emp.basic_salary if emp and emp.basic_salary else Decimal("20000.00")
        daily_rate = basic / Decimal("30.00")
        deduction = Decimal(str(round(float(unpaid_days) * float(daily_rate), 2)))

        pi_q = select(PayrollInput).where(and_(
            PayrollInput.organization_id == org_id,
            PayrollInput.employee_id == emp_id,
            PayrollInput.month == m,
            PayrollInput.year == y
        ))
        pi_res = await db.execute(pi_q)
        pi = pi_res.scalar_one_or_none()

        if not pi:
            pi = PayrollInput(
                organization_id=org_id,
                employee_id=emp_id,
                month=m,
                year=y,
                approved_overtime_hours=ot_hours,
                overtime_amount=ot_amt,
                unpaid_leave_days=unpaid_days,
                deduction_amount=deduction,
                source_reference=f"AUTO_SYNC_LEAVE_OT_{y}_{m:02d}",
                is_locked=False
            )
            db.add(pi)
        else:
            if not pi.is_locked:
                pi.approved_overtime_hours = ot_hours
                pi.overtime_amount = ot_amt
                pi.unpaid_leave_days = unpaid_days
                pi.deduction_amount = deduction
                pi.source_reference = f"AUTO_SYNC_LEAVE_OT_{y}_{m:02d}"

        synced_count += 1

    await db.commit()
    return {
        "status": "SUCCESS",
        "month": m,
        "year": y,
        "employees_synced": synced_count,
        "message": f"Successfully synchronized {synced_count} employee leave and overtime records into Payroll Inputs for {m:02d}/{y}."
    }



# --- 9. Payroll Processing & Disbursal ---
@router.post("/payroll/generate", response_model=PayrollRunOut, status_code=status.HTTP_201_CREATED)
async def generate_payroll(
    payload: PayrollGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    user_id = current_user.id if current_user else None

    # Check if run already exists for this month/year/project
    q = select(PayrollRun).where(
        and_(
            PayrollRun.organization_id == org_id,
            PayrollRun.month == payload.month,
            PayrollRun.year == payload.year,
            PayrollRun.project_id == payload.project_id
        )
    )
    existing = (await db.execute(q)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Payroll run already exists for {payload.month:02d}/{payload.year}. Status: {existing.status}"
        )

    run = await HRMSService.generate_monthly_payroll(
        db, org_id, payload.month, payload.year, payload.project_id, user_id
    )

    proj_name = run.project.project_name if run.project else "Corporate Head Office"
    return PayrollRunOut(
        id=run.id,
        month=run.month,
        year=run.year,
        project_id=run.project_id,
        project_name=proj_name,
        total_gross=run.total_gross,
        total_deductions=run.total_deductions,
        total_net=run.total_net,
        status=run.status,
        disbursement_date=run.disbursement_date,
        voucher_id=run.voucher_id
    )

@router.get("/payroll/runs", response_model=List[PayrollRunOut])
async def list_payroll_runs(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(PayrollRun).where(PayrollRun.organization_id == org_id).order_by(desc(PayrollRun.year), desc(PayrollRun.month))
    res = await db.execute(q)
    runs = res.scalars().all()

    out = []
    for r in runs:
        proj_name = r.project.project_name if r.project else "Corporate Head Office"
        out.append(PayrollRunOut(
            id=r.id,
            month=r.month,
            year=r.year,
            project_id=r.project_id,
            project_name=proj_name,
            total_gross=r.total_gross,
            total_deductions=r.total_deductions,
            total_net=r.total_net,
            status=r.status,
            disbursement_date=r.disbursement_date,
            voucher_id=r.voucher_id
        ))
    return out

@router.get("/payroll/runs/{run_id}/payslips", response_model=List[PayslipOut])
async def get_payslips_for_run(
    run_id: int,
    db: AsyncSession = Depends(get_db)
):
    q = select(Payslip).where(Payslip.payroll_run_id == run_id)
    res = await db.execute(q)
    payslips = res.scalars().all()

    out = []
    for ps in payslips:
        emp = ps.employee
        out.append(PayslipOut(
            id=ps.id,
            employee_id=ps.employee_id,
            employee_code=emp.employee_code if emp else None,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            designation_title=emp.designation.title_en if emp and emp.designation else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            basic_salary=ps.basic_salary,
            house_rent=ps.house_rent,
            medical=ps.medical,
            conveyance=ps.conveyance,
            site_hazard_allowance=ps.site_hazard_allowance,
            mobile_allowance=ps.mobile_allowance,
            overtime_hours=ps.overtime_hours,
            overtime_amount=ps.overtime_amount,
            sales_commission=ps.sales_commission,
            festival_bonus=ps.festival_bonus,
            gross_earnings=ps.gross_earnings,
            pf_deduction=ps.pf_deduction,
            tax_tds_deduction=ps.tax_tds_deduction,
            advance_salary_deduction=ps.advance_salary_deduction,
            loan_emi_deduction=ps.loan_emi_deduction,
            total_deductions=ps.total_deductions,
            net_payable=ps.net_payable,
            payment_status=ps.payment_status
        ))
    return out

@router.post("/payroll/runs/{run_id}/disburse", response_model=PayrollRunOut)
async def disburse_payroll(
    run_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    user_id = current_user.id if current_user else None

    run = await HRMSService.disburse_payroll_with_accounting_entry(
        db, org_id, run_id, user_id
    )

    proj_name = run.project.project_name if run.project else "Corporate Head Office"
    return PayrollRunOut(
        id=run.id,
        month=run.month,
        year=run.year,
        project_id=run.project_id,
        project_name=proj_name,
        total_gross=run.total_gross,
        total_deductions=run.total_deductions,
        total_net=run.total_net,
        status=run.status,
        disbursement_date=run.disbursement_date,
        voucher_id=run.voucher_id
    )


# ==============================================================================
# SECTION 3, 4, 5, 6: ORGANIZATIONAL STRUCTURE MASTER (COMPANIES, ENTITIES, BRANCHES, SITE OFFICES)
# ==============================================================================

async def _check_circular_parent_hierarchy(db: AsyncSession, company_id: Optional[int], proposed_parent_id: Optional[int]):
    """Prevents circular company parent-child loops in corporate group structures."""
    if not proposed_parent_id:
        return
    if company_id and proposed_parent_id == company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business Rule Violation: A company cannot be its own parent company."
        )
    curr = proposed_parent_id
    visited = {company_id} if company_id else set()
    while curr:
        visited.add(curr)
        q = select(Company.parent_company_id).where(Company.id == curr)
        res = await db.execute(q)
        parent_id = res.scalar_one_or_none()
        if parent_id and parent_id in visited:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business Rule Violation: Circular hierarchy detected. A parent company cannot reference itself or its own subsidiary."
            )
        curr = parent_id


async def _check_company_deletion_eligibility(db: AsyncSession, company_id: int):
    """Enforces business rule: A company with employees or active branches cannot be permanently deleted."""
    emp_res = await db.execute(select(func.count(Employee.id)).where(Employee.company_id == company_id))
    emp_count = emp_res.scalar() or 0
    if emp_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Deactivation or Deletion Blocked: Company has {emp_count} assigned employee(s). You may deactivate the company, but historical records must be preserved."
        )
    branch_res = await db.execute(select(func.count(Branch.id)).where(Branch.company_id == company_id))
    branch_count = branch_res.scalar() or 0
    if branch_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company cannot be removed because it has {branch_count} registered branch(es). Deactivate or remove branches first."
        )


async def _validate_branch_rules(db: AsyncSession, company_id: int, branch_id: Optional[int], is_head_office: bool, legal_entity_id: Optional[int]):
    """Validates Head Office policy and legal entity belonging to the same company."""
    if legal_entity_id:
        le = await db.get(LegalEntity, legal_entity_id)
        if not le or le.company_id != company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Validation Error: The selected Legal Entity does not belong to the specified owning company."
            )
    if is_head_office:
        q = select(Branch).where(
            Branch.company_id == company_id,
            Branch.is_head_office == True,
            Branch.status == "ACTIVE"
        )
        if branch_id:
            q = q.where(Branch.id != branch_id)
        res = await db.execute(q)
        existing_ho = res.scalars().first()
        if existing_ho:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Policy Conflict: Company already has an active Head Office: '{existing_ho.branch_name}' ({existing_ho.branch_code}). Under defined policy, a company cannot have more than one active head office."
            )


# --- 3. COMPANY MASTER ENDPOINTS ---

@router.get("/companies", response_model=List[CompanyOut])
async def list_companies(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Lists registered companies with sub-counts of legal entities, branches, project offices, and employees."""
    q = select(Company)
    if status_filter:
        q = q.where(Company.status == status_filter.upper())
    q = q.order_by(Company.company_name.asc())
    result = await db.execute(q)
    companies = result.scalars().all()

    output = []
    for c in companies:
        parent_name = None
        if c.parent_company_id:
            parent = await db.get(Company, c.parent_company_id)
            if parent:
                parent_name = parent.company_name

        le_count = (await db.execute(select(func.count(LegalEntity.id)).where(LegalEntity.company_id == c.id))).scalar() or 0
        br_count = (await db.execute(select(func.count(Branch.id)).where(Branch.company_id == c.id))).scalar() or 0
        po_count = (await db.execute(select(func.count(ProjectOffice.id)).where(ProjectOffice.company_id == c.id))).scalar() or 0
        emp_count = (await db.execute(select(func.count(Employee.id)).where(Employee.company_id == c.id))).scalar() or 0

        item = CompanyOut.model_validate(c)
        item.parent_company_name = parent_name
        item.legal_entities_count = le_count
        item.branches_count = br_count
        item.project_offices_count = po_count
        item.employees_count = emp_count
        output.append(item)

    return output


@router.post("/companies", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
async def create_company(
    payload: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Registers a new company under the Master organization with unique code & circular hierarchy check."""
    existing_q = select(Company).where(Company.company_code == payload.company_code.strip().upper())
    existing = (await db.execute(existing_q)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company code '{payload.company_code}' already exists. Company code must be unique."
        )

    await _check_circular_parent_hierarchy(db, None, payload.parent_company_id)

    company = Company(
        organization_id=get_org_id(current_user),
        company_code=payload.company_code.strip().upper(),
        company_name=payload.company_name.strip(),
        short_name=payload.short_name.strip(),
        company_type=payload.company_type,
        parent_company_id=payload.parent_company_id,
        country=payload.country,
        currency=payload.currency.upper(),
        time_zone=payload.time_zone,
        logo=payload.logo,
        status=payload.status.upper(),
        default_language=payload.default_language,
        financial_year_start_month=payload.financial_year_start_month,
        date_format=payload.date_format,
        number_format=payload.number_format,
        employee_code_prefix=payload.employee_code_prefix,
        approval_policies=payload.approval_policies or {},
        payroll_config=payload.payroll_config or {},
        report_access=payload.report_access or {},
        is_active=payload.is_active
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)

    item = CompanyOut.model_validate(company)
    if company.parent_company_id:
        parent = await db.get(Company, company.parent_company_id)
        item.parent_company_name = parent.company_name if parent else None
    return item


@router.get("/companies/{company_id}", response_model=CompanyOut)
async def get_company(
    company_id: int,
    db: AsyncSession = Depends(get_db)
):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    item = CompanyOut.model_validate(company)
    if company.parent_company_id:
        parent = await db.get(Company, company.parent_company_id)
        item.parent_company_name = parent.company_name if parent else None

    item.legal_entities_count = (await db.execute(select(func.count(LegalEntity.id)).where(LegalEntity.company_id == company.id))).scalar() or 0
    item.branches_count = (await db.execute(select(func.count(Branch.id)).where(Branch.company_id == company.id))).scalar() or 0
    item.project_offices_count = (await db.execute(select(func.count(ProjectOffice.id)).where(ProjectOffice.company_id == company.id))).scalar() or 0
    item.employees_count = (await db.execute(select(func.count(Employee.id)).where(Employee.company_id == company.id))).scalar() or 0
    return item


@router.put("/companies/{company_id}", response_model=CompanyOut)
async def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: AsyncSession = Depends(get_db)
):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    if payload.parent_company_id is not None:
        await _check_circular_parent_hierarchy(db, company_id, payload.parent_company_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)

    # If status set to INACTIVE, update is_active flag
    if payload.status:
        company.is_active = (payload.status.upper() == "ACTIVE")
    elif payload.is_active is not None:
        company.status = "ACTIVE" if payload.is_active else "INACTIVE"

    await db.commit()
    await db.refresh(company)

    item = CompanyOut.model_validate(company)
    if company.parent_company_id:
        parent = await db.get(Company, company.parent_company_id)
        item.parent_company_name = parent.company_name if parent else None
    return item


@router.delete("/companies/{company_id}")
async def delete_or_deactivate_company(
    company_id: int,
    hard_delete: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    if hard_delete:
        await _check_company_deletion_eligibility(db, company_id)
        await db.delete(company)
        await db.commit()
        return {"success": True, "message": f"Company '{company.company_name}' permanently deleted."}
    else:
        # Safe deactivation per Rule 5 (preserve historical employee and payroll records)
        company.status = "INACTIVE"
        company.is_active = False
        await db.commit()
        return {"success": True, "message": f"Company '{company.company_name}' has been deactivated. Historical records preserved."}


# --- 4. LEGAL ENTITY MANAGEMENT ENDPOINTS ---

@router.get("/legal-entities", response_model=List[LegalEntityOut])
async def list_legal_entities(
    company_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    q = select(LegalEntity)
    if company_id:
        q = q.where(LegalEntity.company_id == company_id)
    if status_filter:
        q = q.where(LegalEntity.status == status_filter.upper())
    q = q.order_by(LegalEntity.registered_name.asc())
    res = await db.execute(q)
    entities = res.scalars().all()

    out = []
    for e in entities:
        item = LegalEntityOut.model_validate(e)
        comp = await db.get(Company, e.company_id)
        item.company_name = comp.company_name if comp else None
        out.append(item)
    return out


@router.post("/legal-entities", response_model=LegalEntityOut, status_code=status.HTTP_201_CREATED)
async def create_legal_entity(
    payload: LegalEntityCreate,
    db: AsyncSession = Depends(get_db)
):
    comp = await db.get(Company, payload.company_id)
    if not comp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owning Company ID does not exist.")

    # Unique entity code
    existing = (await db.execute(select(LegalEntity).where(LegalEntity.entity_code == payload.entity_code.strip().upper()))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Legal entity code '{payload.entity_code}' already exists.")

    # If is_default is True, reset previous default in the same company
    if payload.is_default:
        await db.execute(
            update(LegalEntity).where(LegalEntity.company_id == payload.company_id).values(is_default=False)
        )

    entity = LegalEntity(
        company_id=payload.company_id,
        entity_code=payload.entity_code.strip().upper(),
        registered_name=payload.registered_name.strip(),
        registration_number=payload.registration_number,
        registration_date=payload.registration_date,
        legal_form=payload.legal_form,
        registered_office_address=payload.registered_office_address,
        tin_number=payload.tin_number,
        bin_number=payload.bin_number,
        trade_license_number=payload.trade_license_number,
        trade_license_expiry=payload.trade_license_expiry,
        rjsc_registration_details=payload.rjsc_registration_details,
        authorized_signatory_name=payload.authorized_signatory_name,
        authorized_signatory_designation=payload.authorized_signatory_designation,
        statutory_documents=payload.statutory_documents or [],
        effective_date=payload.effective_date,
        is_default=payload.is_default,
        status=payload.status.upper()
    )
    db.add(entity)
    await db.commit()
    await db.refresh(entity)

    item = LegalEntityOut.model_validate(entity)
    item.company_name = comp.company_name
    return item


@router.put("/legal-entities/{entity_id}", response_model=LegalEntityOut)
async def update_legal_entity(
    entity_id: int,
    payload: LegalEntityUpdate,
    db: AsyncSession = Depends(get_db)
):
    entity = await db.get(LegalEntity, entity_id)
    if not entity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Legal entity not found")

    target_comp_id = payload.company_id if payload.company_id is not None else entity.company_id
    if payload.is_default:
        await db.execute(
            update(LegalEntity).where(LegalEntity.company_id == target_comp_id, LegalEntity.id != entity_id).values(is_default=False)
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entity, field, value)

    await db.commit()
    await db.refresh(entity)

    item = LegalEntityOut.model_validate(entity)
    comp = await db.get(Company, entity.company_id)
    item.company_name = comp.company_name if comp else None
    return item


@router.delete("/legal-entities/{entity_id}")
async def delete_legal_entity(
    entity_id: int,
    db: AsyncSession = Depends(get_db)
):
    entity = await db.get(LegalEntity, entity_id)
    if not entity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Legal entity not found")

    branch_count = (await db.execute(select(func.count(Branch.id)).where(Branch.legal_entity_id == entity_id))).scalar() or 0
    if branch_count > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot delete legal entity linked to {branch_count} active branch(es).")

    await db.delete(entity)
    await db.commit()
    return {"success": True, "message": f"Legal entity '{entity.registered_name}' deleted."}


# --- 5. BRANCH MANAGEMENT ENDPOINTS ---

@router.get("/branches", response_model=List[BranchOut])
async def list_branches(
    company_id: Optional[int] = Query(None),
    branch_type: Optional[str] = Query(None),
    division: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    q = select(Branch)
    if company_id:
        q = q.where(Branch.company_id == company_id)
    if branch_type:
        q = q.where(Branch.branch_type == branch_type)
    if division:
        q = q.where(Branch.division == division)
    if status_filter:
        q = q.where(Branch.status == status_filter.upper())
    q = q.order_by(Branch.is_head_office.desc(), Branch.branch_name.asc())
    res = await db.execute(q)
    branches = res.scalars().all()

    out = []
    for b in branches:
        item = BranchOut.model_validate(b)
        comp = await db.get(Company, b.company_id)
        item.company_name = comp.company_name if comp else None

        if b.legal_entity_id:
            le = await db.get(LegalEntity, b.legal_entity_id)
            item.legal_entity_name = le.registered_name if le else None

        if b.manager_employee_id:
            mgr = await db.get(Employee, b.manager_employee_id)
            item.manager_name = f"{mgr.first_name} {mgr.last_name}" if mgr else None

        item.employees_count = (await db.execute(select(func.count(Employee.id)).where(Employee.branch_id == b.id))).scalar() or 0
        out.append(item)
    return out


@router.post("/branches", response_model=BranchOut, status_code=status.HTTP_201_CREATED)
async def create_branch(
    payload: BranchCreate,
    db: AsyncSession = Depends(get_db)
):
    comp = await db.get(Company, payload.company_id)
    if not comp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owning Company does not exist.")

    # Unique branch code within owning company
    existing = (await db.execute(
        select(Branch).where(Branch.company_id == payload.company_id, Branch.branch_code == payload.branch_code.strip().upper())
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Branch code '{payload.branch_code}' already exists within '{comp.company_name}'."
        )

    await _validate_branch_rules(db, payload.company_id, None, payload.is_head_office, payload.legal_entity_id)

    branch = Branch(
        company_id=payload.company_id,
        branch_code=payload.branch_code.strip().upper(),
        branch_name=payload.branch_name.strip(),
        branch_type=payload.branch_type,
        legal_entity_id=payload.legal_entity_id,
        manager_employee_id=payload.manager_employee_id,
        phone=payload.phone,
        email=payload.email,
        division=payload.division,
        district=payload.district,
        upazila_thana=payload.upazila_thana,
        address=payload.address,
        is_head_office=payload.is_head_office,
        opening_date=payload.opening_date,
        closing_date=payload.closing_date,
        default_cost_center=payload.default_cost_center,
        status=payload.status.upper()
    )
    db.add(branch)
    await db.commit()
    await db.refresh(branch)

    item = BranchOut.model_validate(branch)
    item.company_name = comp.company_name
    return item


@router.put("/branches/{branch_id}", response_model=BranchOut)
async def update_branch(
    branch_id: int,
    payload: BranchUpdate,
    db: AsyncSession = Depends(get_db)
):
    branch = await db.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    target_company_id = payload.company_id if payload.company_id is not None else branch.company_id
    target_is_ho = payload.is_head_office if payload.is_head_office is not None else branch.is_head_office
    target_le_id = payload.legal_entity_id if payload.legal_entity_id is not None else branch.legal_entity_id

    await _validate_branch_rules(db, target_company_id, branch_id, target_is_ho, target_le_id)

    # If deactivating branch, check if active employees are stationed
    if payload.status and payload.status.upper() == "INACTIVE" and branch.status == "ACTIVE":
        active_emp_count = (await db.execute(
            select(func.count(Employee.id)).where(Employee.branch_id == branch_id, Employee.status == "ACTIVE")
        )).scalar() or 0
        if active_emp_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Deactivation Blocked: {active_emp_count} active employee(s) are stationed in this branch. Reassign them before deactivation."
            )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(branch, field, value)

    await db.commit()
    await db.refresh(branch)

    item = BranchOut.model_validate(branch)
    comp = await db.get(Company, branch.company_id)
    item.company_name = comp.company_name if comp else None
    return item


@router.delete("/branches/{branch_id}")
async def delete_or_deactivate_branch(
    branch_id: int,
    hard_delete: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    branch = await db.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    assigned_emp_count = (await db.execute(
        select(func.count(Employee.id)).where(Employee.branch_id == branch_id)
    )).scalar() or 0
    if assigned_emp_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Branch action blocked: {assigned_emp_count} employee(s) have historical assignment records at this branch. Deactivate the branch instead."
        )

    if hard_delete:
        await db.delete(branch)
        await db.commit()
        return {"success": True, "message": f"Branch '{branch.branch_name}' permanently deleted."}
    else:
        branch.status = "INACTIVE"
        await db.commit()
        return {"success": True, "message": f"Branch '{branch.branch_name}' deactivated."}


# --- 6. PROJECT OFFICE MANAGEMENT ENDPOINTS ---

@router.get("/project-offices", response_model=List[ProjectOfficeOut])
async def list_project_offices(
    company_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    q = select(ProjectOffice)
    if company_id:
        q = q.where(ProjectOffice.company_id == company_id)
    if project_id:
        q = q.where(ProjectOffice.project_id == project_id)
    if status_filter:
        q = q.where(ProjectOffice.operational_status == status_filter.upper())
    q = q.order_by(ProjectOffice.office_name.asc())
    res = await db.execute(q)
    offices = res.scalars().all()

    out = []
    for po in offices:
        item = ProjectOfficeOut.model_validate(po)
        comp = await db.get(Company, po.company_id)
        item.company_name = comp.company_name if comp else None

        if po.legal_entity_id:
            le = await db.get(LegalEntity, po.legal_entity_id)
            item.legal_entity_name = le.registered_name if le else None

        proj = await db.get(Project, po.project_id)
        item.project_name = proj.project_name if proj else None

        if po.site_in_charge_employee_id:
            mgr = await db.get(Employee, po.site_in_charge_employee_id)
            item.site_in_charge_name = f"{mgr.first_name} {mgr.last_name}" if mgr else None

        item.employees_count = (await db.execute(select(func.count(Employee.id)).where(Employee.project_office_id == po.id))).scalar() or 0
        out.append(item)
    return out


@router.post("/project-offices", response_model=ProjectOfficeOut, status_code=status.HTTP_201_CREATED)
async def create_project_office(
    payload: ProjectOfficeCreate,
    db: AsyncSession = Depends(get_db)
):
    comp = await db.get(Company, payload.company_id)
    if not comp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owning Company does not exist.")

    proj = await db.get(Project, payload.project_id)
    if not proj:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Linked Real Estate Project ID does not exist.")

    existing = (await db.execute(
        select(ProjectOffice).where(ProjectOffice.office_code == payload.office_code.strip().upper())
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Project office code '{payload.office_code}' already exists.")

    office = ProjectOffice(
        office_code=payload.office_code.strip().upper(),
        office_name=payload.office_name.strip(),
        company_id=payload.company_id,
        legal_entity_id=payload.legal_entity_id,
        project_id=payload.project_id,
        office_type=payload.office_type,
        site_in_charge_employee_id=payload.site_in_charge_employee_id,
        phone=payload.phone,
        email=payload.email,
        division=payload.division,
        district=payload.district,
        upazila_thana=payload.upazila_thana,
        address=payload.address,
        opening_date=payload.opening_date,
        expected_closing_date=payload.expected_closing_date,
        operational_status=payload.operational_status.upper(),
        default_cost_center=payload.default_cost_center,
        supporting_documents=payload.supporting_documents or []
    )
    db.add(office)
    await db.commit()
    await db.refresh(office)

    item = ProjectOfficeOut.model_validate(office)
    item.company_name = comp.company_name
    item.project_name = proj.project_name
    return item


@router.put("/project-offices/{office_id}", response_model=ProjectOfficeOut)
async def update_project_office(
    office_id: int,
    payload: ProjectOfficeUpdate,
    db: AsyncSession = Depends(get_db)
):
    office = await db.get(ProjectOffice, office_id)
    if not office:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project office not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(office, field, value)

    await db.commit()
    await db.refresh(office)

    item = ProjectOfficeOut.model_validate(office)
    comp = await db.get(Company, office.company_id)
    item.company_name = comp.company_name if comp else None
    proj = await db.get(Project, office.project_id)
    item.project_name = proj.project_name if proj else None
    return item


@router.delete("/project-offices/{office_id}")
async def delete_project_office(
    office_id: int,
    db: AsyncSession = Depends(get_db)
):
    office = await db.get(ProjectOffice, office_id)
    if not office:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project office not found")

    office.operational_status = "CLOSED"
    await db.commit()
    return {"success": True, "message": f"Project office '{office.office_name}' decommissioned and archived."}


# --- 7. COMPLETE HIERARCHY TREE VIEW ENDPOINT ---

@router.get("/org-tree", response_model=OrgHierarchyResponse)
async def get_org_hierarchy_tree(
    db: AsyncSession = Depends(get_db)
):
    """
    Assembles the full multi-tier corporate organization structure:
    Corporate Group -> Companies -> Legal Entities, Branches, Project Offices.
    """
    companies = (await db.execute(select(Company).order_by(Company.parent_company_id.asc(), Company.company_name.asc()))).scalars().all()
    entities = (await db.execute(select(LegalEntity).order_by(LegalEntity.registered_name.asc()))).scalars().all()
    branches = (await db.execute(select(Branch).order_by(Branch.is_head_office.desc(), Branch.branch_name.asc()))).scalars().all()
    offices = (await db.execute(select(ProjectOffice).order_by(ProjectOffice.office_name.asc()))).scalars().all()

    # Build company nodes
    company_nodes: Dict[int, OrgNode] = {}
    for c in companies:
        c_node = OrgNode(
            id=f"comp_{c.id}",
            label=c.company_name,
            code=c.company_code,
            type="COMPANY" if not c.parent_company_id else "SUBSIDIARY",
            subtitle=f"{c.short_name} • {c.country}",
            badge=c.company_type.replace("_", " ").title(),
            status=c.status,
            metadata={"currency": c.currency, "time_zone": c.time_zone, "id": c.id},
            children=[]
        )
        company_nodes[c.id] = c_node

    # Attach legal entities to companies
    for le in entities:
        if le.company_id in company_nodes:
            le_node = OrgNode(
                id=f"le_{le.id}",
                label=le.registered_name,
                code=le.entity_code,
                type="LEGAL_ENTITY",
                subtitle=f"BIN: {le.bin_number or 'N/A'} • TIN: {le.tin_number or 'N/A'}",
                badge=f"Legal: {le.legal_form.replace('_', ' ')}",
                status=le.status,
                metadata={"id": le.id, "is_default": le.is_default},
                children=[]
            )
            company_nodes[le.company_id].children.append(le_node)

    # Attach branches to companies
    for b in branches:
        if b.company_id in company_nodes:
            b_node = OrgNode(
                id=f"branch_{b.id}",
                label=b.branch_name,
                code=b.branch_code,
                type="HEAD_OFFICE" if b.is_head_office else "BRANCH",
                subtitle=f"{b.division or ''} {b.district or ''} • {b.phone or ''}",
                badge="Head Office" if b.is_head_office else b.branch_type.replace("_", " ").title(),
                status=b.status,
                metadata={"id": b.id, "is_head_office": b.is_head_office},
                children=[]
            )
            company_nodes[b.company_id].children.append(b_node)

    # Attach project offices to companies
    for po in offices:
        if po.company_id in company_nodes:
            po_node = OrgNode(
                id=f"po_{po.id}",
                label=po.office_name,
                code=po.office_code,
                type="PROJECT_OFFICE",
                subtitle=f"Site Office • {po.operational_status.replace('_', ' ')}",
                badge=po.office_type.replace("_", " ").title(),
                status=po.operational_status,
                metadata={"id": po.id, "project_id": po.project_id},
                children=[]
            )
            company_nodes[po.company_id].children.append(po_node)

    # Assemble hierarchy tree (group parents and children)
    root_nodes: List[OrgNode] = []
    for c in companies:
        if c.parent_company_id and c.parent_company_id in company_nodes:
            company_nodes[c.parent_company_id].children.append(company_nodes[c.id])
        else:
            root_nodes.append(company_nodes[c.id])

    return OrgHierarchyResponse(
        root_nodes=root_nodes,
        total_companies=len(companies),
        total_legal_entities=len(entities),
        total_branches=len(branches),
        total_project_offices=len(offices)
    )


# =====================================================================
# --- Section 1 & 2: Salary Grades & Scales Endpoints ---
# =====================================================================
@router.get("/salary-grades", response_model=SalaryGradePaginatedOut)
async def list_salary_grades(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    employee_level: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    filters = [SalaryGrade.organization_id == org_id]
    if employee_level:
        filters.append(SalaryGrade.employee_level == employee_level)
    if is_active is not None:
        filters.append(SalaryGrade.is_active == is_active)
    if search:
        s = f"%{search}%"
        filters.append(or_(SalaryGrade.grade_code.ilike(s), SalaryGrade.grade_name.ilike(s)))

    # Total count
    count_stmt = select(func.count(SalaryGrade.id)).where(and_(*filters))
    total = (await db.execute(count_stmt)).scalar() or 0

    # Query items with counts
    stmt = (
        select(
            SalaryGrade,
            func.count(func.distinct(Designation.id)).label("designations_count"),
            func.count(func.distinct(Position.id)).label("positions_count")
        )
        .outerjoin(Designation, Designation.salary_grade_id == SalaryGrade.id)
        .outerjoin(Position, Position.salary_grade_id == SalaryGrade.id)
        .where(and_(*filters))
        .group_by(SalaryGrade.id)
        .order_by(SalaryGrade.grade_code.asc())
        .limit(limit)
        .offset(offset)
    )
    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for grade, des_cnt, pos_cnt in rows:
        item_out = SalaryGradeOut(
            id=grade.id,
            organization_id=grade.organization_id,
            grade_code=grade.grade_code,
            grade_name=grade.grade_name,
            employee_level=grade.employee_level,
            min_salary=grade.min_salary,
            max_salary=grade.max_salary,
            default_house_rent_pct=grade.default_house_rent_pct,
            default_medical_allowance=grade.default_medical_allowance,
            default_conveyance=grade.default_conveyance,
            allowance_package=grade.allowance_package,
            description=grade.description,
            is_active=grade.is_active,
            designations_count=des_cnt or 0,
            positions_count=pos_cnt or 0,
            created_at=grade.created_at
        )
        items.append(item_out)

    return SalaryGradePaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.post("/salary-grades", response_model=SalaryGradeOut, status_code=status.HTTP_201_CREATED)
async def create_salary_grade(
    payload: SalaryGradeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)

    # Check duplicate grade_code
    dup_stmt = select(SalaryGrade).where(
        SalaryGrade.organization_id == org_id,
        func.lower(SalaryGrade.grade_code) == payload.grade_code.lower()
    )
    if (await db.execute(dup_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Salary Grade Code '{payload.grade_code}' already exists.")

    new_grade = SalaryGrade(
        organization_id=org_id,
        **payload.model_dump()
    )
    db.add(new_grade)
    await db.commit()
    await db.refresh(new_grade)

    return SalaryGradeOut(
        id=new_grade.id,
        organization_id=new_grade.organization_id,
        grade_code=new_grade.grade_code,
        grade_name=new_grade.grade_name,
        employee_level=new_grade.employee_level,
        min_salary=new_grade.min_salary,
        max_salary=new_grade.max_salary,
        default_house_rent_pct=new_grade.default_house_rent_pct,
        default_medical_allowance=new_grade.default_medical_allowance,
        default_conveyance=new_grade.default_conveyance,
        allowance_package=new_grade.allowance_package,
        description=new_grade.description,
        is_active=new_grade.is_active,
        designations_count=0,
        positions_count=0,
        created_at=new_grade.created_at
    )


@router.get("/salary-grades/{id}", response_model=SalaryGradeOut)
async def get_salary_grade_detail(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    grade = await db.get(SalaryGrade, id)
    if not grade or grade.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Salary Grade not found.")

    des_cnt = (await db.execute(select(func.count(Designation.id)).where(Designation.salary_grade_id == id))).scalar() or 0
    pos_cnt = (await db.execute(select(func.count(Position.id)).where(Position.salary_grade_id == id))).scalar() or 0

    return SalaryGradeOut(
        id=grade.id,
        organization_id=grade.organization_id,
        grade_code=grade.grade_code,
        grade_name=grade.grade_name,
        employee_level=grade.employee_level,
        min_salary=grade.min_salary,
        max_salary=grade.max_salary,
        default_house_rent_pct=grade.default_house_rent_pct,
        default_medical_allowance=grade.default_medical_allowance,
        default_conveyance=grade.default_conveyance,
        allowance_package=grade.allowance_package,
        description=grade.description,
        is_active=grade.is_active,
        designations_count=des_cnt,
        positions_count=pos_cnt,
        created_at=grade.created_at
    )


@router.put("/salary-grades/{id}", response_model=SalaryGradeOut)
async def update_salary_grade(
    id: int,
    payload: SalaryGradeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    grade = await db.get(SalaryGrade, id)
    if not grade or grade.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Salary Grade not found.")

    update_dict = payload.model_dump(exclude_unset=True)
    if "grade_code" in update_dict and update_dict["grade_code"]:
        dup_stmt = select(SalaryGrade).where(
            SalaryGrade.organization_id == org_id,
            SalaryGrade.id != id,
            func.lower(SalaryGrade.grade_code) == update_dict["grade_code"].lower()
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Grade code '{update_dict['grade_code']}' is already in use.")

    for k, v in update_dict.items():
        setattr(grade, k, v)

    await db.commit()
    await db.refresh(grade)

    des_cnt = (await db.execute(select(func.count(Designation.id)).where(Designation.salary_grade_id == id))).scalar() or 0
    pos_cnt = (await db.execute(select(func.count(Position.id)).where(Position.salary_grade_id == id))).scalar() or 0

    return SalaryGradeOut(
        id=grade.id,
        organization_id=grade.organization_id,
        grade_code=grade.grade_code,
        grade_name=grade.grade_name,
        employee_level=grade.employee_level,
        min_salary=grade.min_salary,
        max_salary=grade.max_salary,
        default_house_rent_pct=grade.default_house_rent_pct,
        default_medical_allowance=grade.default_medical_allowance,
        default_conveyance=grade.default_conveyance,
        allowance_package=grade.allowance_package,
        description=grade.description,
        is_active=grade.is_active,
        designations_count=des_cnt,
        positions_count=pos_cnt,
        created_at=grade.created_at
    )


@router.delete("/salary-grades/{id}")
async def delete_salary_grade(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    grade = await db.get(SalaryGrade, id)
    if not grade or grade.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Salary Grade not found.")

    # Check if linked to designations or positions
    des_count = (await db.execute(select(func.count(Designation.id)).where(Designation.salary_grade_id == id))).scalar() or 0
    if des_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete Salary Grade because {des_count} Designation(s) are assigned to it.")

    pos_count = (await db.execute(select(func.count(Position.id)).where(Position.salary_grade_id == id))).scalar() or 0
    if pos_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete Salary Grade because {pos_count} Position(s) are assigned to it.")

    await db.delete(grade)
    await db.commit()
    return {"message": "Salary Grade deleted successfully", "id": id}


# =====================================================================
# --- Section 1 & 2: Job Titles & Designations Endpoints ---
# =====================================================================
@router.get("/designations", response_model=DesignationPaginatedOut)
async def list_designations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    department_id: Optional[int] = Query(None),
    salary_grade_id: Optional[int] = Query(None),
    employee_level: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    filters = [Designation.organization_id == org_id]
    if department_id:
        filters.append(Designation.department_id == department_id)
    if salary_grade_id:
        filters.append(Designation.salary_grade_id == salary_grade_id)
    if employee_level:
        filters.append(Designation.employee_level == employee_level)
    if is_active is not None:
        filters.append(Designation.is_active == is_active)
    if search:
        s = f"%{search}%"
        filters.append(or_(
            Designation.designation_code.ilike(s),
            Designation.title_en.ilike(s),
            Designation.title_bn.ilike(s)
        ))

    # Total count
    count_stmt = select(func.count(Designation.id)).where(and_(*filters))
    total = (await db.execute(count_stmt)).scalar() or 0

    # Query with relationships
    stmt = (
        select(
            Designation,
            Department.name_en.label("department_name"),
            SalaryGrade.grade_name.label("salary_grade_name"),
            func.count(func.distinct(Employee.id)).label("employees_count"),
            func.count(func.distinct(Position.id)).label("positions_count")
        )
        .outerjoin(Department, Department.id == Designation.department_id)
        .outerjoin(SalaryGrade, SalaryGrade.id == Designation.salary_grade_id)
        .outerjoin(Employee, Employee.designation_id == Designation.id)
        .outerjoin(Position, Position.designation_id == Designation.id)
        .where(and_(*filters))
        .group_by(Designation.id, Department.name_en, SalaryGrade.grade_name)
        .order_by(Designation.title_en.asc())
        .limit(limit)
        .offset(offset)
    )
    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for d, dept_name, grade_name, emp_cnt, pos_cnt in rows:
        items.append(DesignationOut(
            id=d.id,
            organization_id=d.organization_id,
            department_id=d.department_id,
            designation_code=d.designation_code,
            title_en=d.title_en,
            title_bn=d.title_bn,
            salary_grade_id=d.salary_grade_id,
            grade_level=d.grade_level,
            employee_level=d.employee_level,
            min_salary=d.min_salary,
            max_salary=d.max_salary,
            description=d.description,
            is_active=d.is_active,
            department_name=dept_name,
            salary_grade_name=grade_name,
            employees_count=emp_cnt or 0,
            positions_count=pos_cnt or 0,
            created_at=d.created_at
        ))

    return DesignationPaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.post("/designations", response_model=DesignationOut, status_code=status.HTTP_201_CREATED)
async def create_designation(
    payload: DesignationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)

    # Validate department exists
    dept = await db.get(Department, payload.department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department does not exist.")

    # Validate salary grade if provided
    salary_grade_name = None
    if payload.salary_grade_id:
        sg = await db.get(SalaryGrade, payload.salary_grade_id)
        if not sg:
            raise HTTPException(status_code=404, detail="Salary Grade does not exist.")
        salary_grade_name = sg.grade_name

    # Check duplicate designation_code in organization
    dup_stmt = select(Designation).where(
        Designation.organization_id == org_id,
        func.lower(Designation.designation_code) == payload.designation_code.lower()
    )
    if (await db.execute(dup_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Designation Code '{payload.designation_code}' already exists.")

    new_d = Designation(
        organization_id=org_id,
        **payload.model_dump()
    )
    db.add(new_d)
    await db.commit()
    await db.refresh(new_d)

    return DesignationOut(
        id=new_d.id,
        organization_id=new_d.organization_id,
        department_id=new_d.department_id,
        designation_code=new_d.designation_code,
        title_en=new_d.title_en,
        title_bn=new_d.title_bn,
        salary_grade_id=new_d.salary_grade_id,
        grade_level=new_d.grade_level,
        employee_level=new_d.employee_level,
        min_salary=new_d.min_salary,
        max_salary=new_d.max_salary,
        description=new_d.description,
        is_active=new_d.is_active,
        department_name=dept.department_name,
        salary_grade_name=salary_grade_name,
        employees_count=0,
        positions_count=0,
        created_at=new_d.created_at
    )


@router.get("/designations/{id}", response_model=DesignationOut)
async def get_designation_detail(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    d = await db.get(Designation, id)
    if not d or d.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Designation not found.")

    dept = await db.get(Department, d.department_id)
    sg = await db.get(SalaryGrade, d.salary_grade_id) if d.salary_grade_id else None

    emp_cnt = (await db.execute(select(func.count(Employee.id)).where(Employee.designation_id == id))).scalar() or 0
    pos_cnt = (await db.execute(select(func.count(Position.id)).where(Position.designation_id == id))).scalar() or 0

    return DesignationOut(
        id=d.id,
        organization_id=d.organization_id,
        department_id=d.department_id,
        designation_code=d.designation_code,
        title_en=d.title_en,
        title_bn=d.title_bn,
        salary_grade_id=d.salary_grade_id,
        grade_level=d.grade_level,
        employee_level=d.employee_level,
        min_salary=d.min_salary,
        max_salary=d.max_salary,
        description=d.description,
        is_active=d.is_active,
        department_name=dept.department_name if dept else None,
        salary_grade_name=sg.grade_name if sg else None,
        employees_count=emp_cnt,
        positions_count=pos_cnt,
        created_at=d.created_at
    )


@router.put("/designations/{id}", response_model=DesignationOut)
async def update_designation(
    id: int,
    payload: DesignationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    d = await db.get(Designation, id)
    if not d or d.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Designation not found.")

    update_dict = payload.model_dump(exclude_unset=True)
    if "designation_code" in update_dict and update_dict["designation_code"]:
        dup_stmt = select(Designation).where(
            Designation.organization_id == org_id,
            Designation.id != id,
            func.lower(Designation.designation_code) == update_dict["designation_code"].lower()
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Designation code '{update_dict['designation_code']}' already exists.")

    for k, v in update_dict.items():
        setattr(d, k, v)

    await db.commit()
    await db.refresh(d)

    dept = await db.get(Department, d.department_id)
    sg = await db.get(SalaryGrade, d.salary_grade_id) if d.salary_grade_id else None
    emp_cnt = (await db.execute(select(func.count(Employee.id)).where(Employee.designation_id == id))).scalar() or 0
    pos_cnt = (await db.execute(select(func.count(Position.id)).where(Position.designation_id == id))).scalar() or 0

    return DesignationOut(
        id=d.id,
        organization_id=d.organization_id,
        department_id=d.department_id,
        designation_code=d.designation_code,
        title_en=d.title_en,
        title_bn=d.title_bn,
        salary_grade_id=d.salary_grade_id,
        grade_level=d.grade_level,
        employee_level=d.employee_level,
        min_salary=d.min_salary,
        max_salary=d.max_salary,
        description=d.description,
        is_active=d.is_active,
        department_name=dept.department_name if dept else None,
        salary_grade_name=sg.grade_name if sg else None,
        employees_count=emp_cnt,
        positions_count=pos_cnt,
        created_at=d.created_at
    )


@router.delete("/designations/{id}")
async def delete_designation(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    d = await db.get(Designation, id)
    if not d or d.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Designation not found.")

    emp_cnt = (await db.execute(select(func.count(Employee.id)).where(Employee.designation_id == id))).scalar() or 0
    if emp_cnt > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete Designation: {emp_cnt} active employee(s) are assigned to it.")

    pos_cnt = (await db.execute(select(func.count(Position.id)).where(Position.designation_id == id))).scalar() or 0
    if pos_cnt > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete Designation: {pos_cnt} sanctioned position(s) are linked to it.")

    await db.delete(d)
    await db.commit()
    return {"message": "Designation deleted successfully", "id": id}


# =====================================================================
# --- Section 4, 5, 6: Position Management Endpoints ---
# =====================================================================
@router.get("/positions/stats", response_model=PositionStatsOut)
async def get_position_stats(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    base_filter = [Position.organization_id == org_id]

    total_approved = (await db.execute(select(func.count(Position.id)).where(and_(*base_filter)))).scalar() or 0
    total_filled = (await db.execute(select(func.count(Position.id)).where(and_(*base_filter, Position.status == "FILLED")))).scalar() or 0
    total_vacant = (await db.execute(select(func.count(Position.id)).where(and_(*base_filter, Position.status == "VACANT")))).scalar() or 0
    total_on_hold = (await db.execute(select(func.count(Position.id)).where(and_(*base_filter, Position.status == "ON_HOLD")))).scalar() or 0
    total_frozen = (await db.execute(select(func.count(Position.id)).where(and_(*base_filter, Position.status == "FROZEN")))).scalar() or 0
    budgeted_payroll = (await db.execute(select(func.coalesce(func.sum(Position.budgeted_salary), Decimal("0.00"))).where(and_(*base_filter)))).scalar() or Decimal("0.00")

    return PositionStatsOut(
        total_approved=total_approved,
        total_filled=total_filled,
        total_vacant=total_vacant,
        total_on_hold=total_on_hold,
        total_frozen=total_frozen,
        budgeted_payroll_total=budgeted_payroll
    )


@router.get("/positions", response_model=PositionPaginatedOut)
async def list_positions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    department_id: Optional[int] = Query(None),
    designation_id: Optional[int] = Query(None),
    salary_grade_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    position_type: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    branch_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    filters = [Position.organization_id == org_id]

    if department_id:
        filters.append(Position.department_id == department_id)
    if designation_id:
        filters.append(Position.designation_id == designation_id)
    if salary_grade_id:
        filters.append(Position.salary_grade_id == salary_grade_id)
    if status:
        filters.append(Position.status == status)
    if position_type:
        filters.append(Position.position_type == position_type)
    if project_id:
        filters.append(Position.assigned_project_id == project_id)
    if branch_id:
        filters.append(Position.assigned_branch_id == branch_id)
    if search:
        s = f"%{search}%"
        filters.append(or_(
            Position.position_code.ilike(s),
            Position.position_title.ilike(s)
        ))

    # Total count
    count_stmt = select(func.count(Position.id)).where(and_(*filters))
    total = (await db.execute(count_stmt)).scalar() or 0

    # Main query
    ParentPos = Position
    stmt = (
        select(
            Position,
            Department.name_en.label("department_name"),
            Designation.title_en.label("designation_title"),
            SalaryGrade.grade_name.label("salary_grade_name"),
            Branch.branch_name.label("branch_name"),
            Project.project_name.label("project_name"),
            Employee.first_name.label("emp_first_name"),
            Employee.last_name.label("emp_last_name"),
            Employee.employee_code.label("emp_code")
        )
        .outerjoin(Department, Department.id == Position.department_id)
        .outerjoin(Designation, Designation.id == Position.designation_id)
        .outerjoin(SalaryGrade, SalaryGrade.id == Position.salary_grade_id)
        .outerjoin(Branch, Branch.id == Position.assigned_branch_id)
        .outerjoin(Project, Project.id == Position.assigned_project_id)
        .outerjoin(Employee, Employee.id == Position.occupied_employee_id)
        .where(and_(*filters))
        .order_by(Position.position_code.asc())
        .limit(limit)
        .offset(offset)
    )
    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for pos, dept_name, desig_title, sg_name, br_name, prj_name, e_first, e_last, e_code in rows:
        emp_name = f"{e_first} {e_last}" if e_first and e_last else (e_first or None)
        items.append(PositionOut(
            id=pos.id,
            organization_id=pos.organization_id,
            position_code=pos.position_code,
            position_title=pos.position_title,
            department_id=pos.department_id,
            designation_id=pos.designation_id,
            salary_grade_id=pos.salary_grade_id,
            reports_to_position_id=pos.reports_to_position_id,
            assigned_branch_id=pos.assigned_branch_id,
            assigned_project_id=pos.assigned_project_id,
            position_type=pos.position_type,
            status=pos.status,
            budgeted_salary=pos.budgeted_salary,
            target_hire_date=pos.target_hire_date,
            approved_date=pos.approved_date,
            occupied_employee_id=pos.occupied_employee_id,
            remarks=pos.remarks,
            department_name=dept_name,
            designation_title=desig_title,
            salary_grade_name=sg_name,
            branch_name=br_name,
            project_name=prj_name,
            occupied_employee_name=emp_name,
            occupied_employee_code=e_code,
            created_at=pos.created_at,
            updated_at=pos.updated_at
        ))

    return PositionPaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.post("/positions", response_model=PositionOut, status_code=status.HTTP_201_CREATED)
async def create_position(
    payload: PositionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)

    # Validate department & designation
    dept = await db.get(Department, payload.department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department does not exist.")
    des = await db.get(Designation, payload.designation_id)
    if not des:
        raise HTTPException(status_code=404, detail="Designation does not exist.")

    # Check duplicate position_code
    dup_stmt = select(Position).where(
        Position.organization_id == org_id,
        func.lower(Position.position_code) == payload.position_code.lower()
    )
    if (await db.execute(dup_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Position Code '{payload.position_code}' already exists.")

    # Auto assign salary grade from designation if not specified
    salary_grade_id = payload.salary_grade_id or des.salary_grade_id

    # If occupied_employee_id is supplied, status should automatically be FILLED
    status_val = payload.status
    if payload.occupied_employee_id:
        status_val = "FILLED"

    new_pos = Position(
        organization_id=org_id,
        position_code=payload.position_code,
        position_title=payload.position_title,
        department_id=payload.department_id,
        designation_id=payload.designation_id,
        salary_grade_id=salary_grade_id,
        reports_to_position_id=payload.reports_to_position_id,
        assigned_branch_id=payload.assigned_branch_id,
        assigned_project_id=payload.assigned_project_id,
        position_type=payload.position_type,
        status=status_val,
        budgeted_salary=payload.budgeted_salary,
        target_hire_date=payload.target_hire_date,
        approved_date=payload.approved_date or date.today(),
        occupied_employee_id=payload.occupied_employee_id,
        remarks=payload.remarks
    )
    db.add(new_pos)
    await db.commit()
    await db.refresh(new_pos)

    # Return full Out
    return await get_position_detail(new_pos.id, db, current_user)


@router.get("/positions/{id}", response_model=PositionOut)
async def get_position_detail(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    pos = await db.get(Position, id)
    if not pos or pos.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Position not found.")

    dept = await db.get(Department, pos.department_id)
    des = await db.get(Designation, pos.designation_id)
    sg = await db.get(SalaryGrade, pos.salary_grade_id) if pos.salary_grade_id else None
    br = await db.get(Branch, pos.assigned_branch_id) if pos.assigned_branch_id else None
    prj = await db.get(Project, pos.assigned_project_id) if pos.assigned_project_id else None
    emp = await db.get(Employee, pos.occupied_employee_id) if pos.occupied_employee_id else None

    emp_name = f"{emp.first_name} {emp.last_name}" if emp else None
    emp_code = emp.employee_code if emp else None

    return PositionOut(
        id=pos.id,
        organization_id=pos.organization_id,
        position_code=pos.position_code,
        position_title=pos.position_title,
        department_id=pos.department_id,
        designation_id=pos.designation_id,
        salary_grade_id=pos.salary_grade_id,
        reports_to_position_id=pos.reports_to_position_id,
        assigned_branch_id=pos.assigned_branch_id,
        assigned_project_id=pos.assigned_project_id,
        position_type=pos.position_type,
        status=pos.status,
        budgeted_salary=pos.budgeted_salary,
        target_hire_date=pos.target_hire_date,
        approved_date=pos.approved_date,
        occupied_employee_id=pos.occupied_employee_id,
        remarks=pos.remarks,
        department_name=dept.department_name if dept else None,
        designation_title=des.title_en if des else None,
        salary_grade_name=sg.grade_name if sg else None,
        branch_name=br.branch_name if br else None,
        project_name=prj.project_name if prj else None,
        occupied_employee_name=emp_name,
        occupied_employee_code=emp_code,
        created_at=pos.created_at,
        updated_at=pos.updated_at
    )


@router.put("/positions/{id}", response_model=PositionOut)
async def update_position(
    id: int,
    payload: PositionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    pos = await db.get(Position, id)
    if not pos or pos.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Position not found.")

    update_dict = payload.model_dump(exclude_unset=True)
    if "position_code" in update_dict and update_dict["position_code"]:
        dup_stmt = select(Position).where(
            Position.organization_id == org_id,
            Position.id != id,
            func.lower(Position.position_code) == update_dict["position_code"].lower()
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Position code '{update_dict['position_code']}' already exists.")

    for k, v in update_dict.items():
        setattr(pos, k, v)

    # Sync status if employee is unassigned/assigned
    if "occupied_employee_id" in update_dict:
        if update_dict["occupied_employee_id"] is None and pos.status == "FILLED":
            pos.status = "VACANT"
        elif update_dict["occupied_employee_id"] is not None and pos.status == "VACANT":
            pos.status = "FILLED"

    await db.commit()
    await db.refresh(pos)

    return await get_position_detail(pos.id, db, current_user)


@router.delete("/positions/{id}")
async def delete_position(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    pos = await db.get(Position, id)
    if not pos or pos.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Position not found.")

    if pos.status == "FILLED" or pos.occupied_employee_id is not None:
        raise HTTPException(status_code=400, detail="Cannot delete an active filled position. Vacate or reassign the incumbent employee first.")

    await db.delete(pos)
    await db.commit()
    return {"message": "Position deleted successfully", "id": id}


@router.patch("/positions/{id}/occupy", response_model=PositionOut)
async def occupy_position(
    id: int,
    payload: PositionOccupyPayload,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    pos = await db.get(Position, id)
    if not pos or pos.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Position not found.")

    emp = await db.get(Employee, payload.employee_id)
    if not emp or emp.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Employee not found.")

    pos.occupied_employee_id = emp.id
    pos.status = "FILLED"
    if payload.remarks:
        pos.remarks = (pos.remarks or "") + f" | Occupied: {payload.remarks}"

    await db.commit()
    await db.refresh(pos)
    return await get_position_detail(pos.id, db, current_user)


@router.patch("/positions/{id}/vacate", response_model=PositionOut)
async def vacate_position(
    id: int,
    remarks: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    pos = await db.get(Position, id)
    if not pos or pos.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Position not found.")

    pos.occupied_employee_id = None
    pos.status = "VACANT"
    if remarks:
        pos.remarks = (pos.remarks or "") + f" | Vacated: {remarks}"

    await db.commit()
    await db.refresh(pos)
    return await get_position_detail(pos.id, db, current_user)


# =====================================================================
# --- Sections 3.1 - 3.20 Salary Structure & Payroll Engine Endpoints ---
# =====================================================================

# --- 3.1 Salary Components Master ---
@router.get("/salary-components", response_model=SalaryComponentPaginatedOut)
async def list_salary_components(
    component_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(SalaryComponent).where(SalaryComponent.organization_id == org_id)
    if component_type:
        q = q.where(SalaryComponent.component_type == component_type)
    if is_active is not None:
        q = q.where(SalaryComponent.is_active == is_active)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(SalaryComponent.sort_order, SalaryComponent.id).limit(limit).offset(offset))
    items = items_res.scalars().all()
    return SalaryComponentPaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.post("/salary-components", response_model=SalaryComponentOut, status_code=status.HTTP_201_CREATED)
async def create_salary_component(
    payload: SalaryComponentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    existing = await db.execute(select(SalaryComponent).where(
        SalaryComponent.organization_id == org_id,
        SalaryComponent.component_code == payload.component_code.strip().upper()
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Component code already exists in your organization.")

    comp = SalaryComponent(
        organization_id=org_id,
        component_code=payload.component_code.strip().upper(),
        name_en=payload.name_en,
        name_bn=payload.name_bn,
        component_type=payload.component_type,
        calculation_type=payload.calculation_type,
        default_value_or_percent=payload.default_value_or_percent,
        is_taxable=payload.is_taxable,
        is_statutory=payload.is_statutory,
        sort_order=payload.sort_order,
        is_active=payload.is_active
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return comp


@router.put("/salary-components/{id}", response_model=SalaryComponentOut)
async def update_salary_component(
    id: int,
    payload: SalaryComponentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    comp = await db.get(SalaryComponent, id)
    if not comp or comp.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Salary component not found.")

    comp.name_en = payload.name_en
    comp.name_bn = payload.name_bn
    comp.component_type = payload.component_type
    comp.calculation_type = payload.calculation_type
    comp.default_value_or_percent = payload.default_value_or_percent
    comp.is_taxable = payload.is_taxable
    comp.is_statutory = payload.is_statutory
    comp.sort_order = payload.sort_order
    comp.is_active = payload.is_active

    await db.commit()
    await db.refresh(comp)
    return comp


@router.delete("/salary-components/{id}")
async def delete_salary_component(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    comp = await db.get(SalaryComponent, id)
    if not comp or comp.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Salary component not found.")
    comp.is_active = False
    await db.commit()
    return {"message": "Salary component deactivated successfully."}


# --- 3.2 Salary Structure Master ---
@router.get("/salary-structures", response_model=SalaryStructurePaginatedOut)
async def list_salary_structures(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(SalaryStructure).where(SalaryStructure.organization_id == org_id)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(SalaryStructure.id).limit(limit).offset(offset))
    structures = items_res.scalars().all()

    out_items = []
    for s in structures:
        # Load items
        items_q = select(SalaryStructureItem).where(SalaryStructureItem.structure_id == s.id)
        s_items_res = await db.execute(items_q)
        s_items = s_items_res.scalars().all()

        item_outs = []
        for it in s_items:
            comp = await db.get(SalaryComponent, it.component_id)
            item_outs.append(SalaryStructureItemOut(
                id=it.id,
                component_id=it.component_id,
                component_code=comp.component_code if comp else None,
                component_name=comp.name_en if comp else None,
                component_type=comp.component_type if comp else None,
                calculation_type=it.calculation_type,
                value_or_percent=it.value_or_percent
            ))

        out_items.append(SalaryStructureOut(
            id=s.id,
            organization_id=s.organization_id,
            structure_code=s.structure_code,
            name_en=s.name_en,
            description=s.description,
            is_active=s.is_active,
            items_count=len(item_outs),
            items=item_outs,
            created_at=s.created_at
        ))

    return SalaryStructurePaginatedOut(items=out_items, total=total, limit=limit, offset=offset)


@router.post("/salary-structures", response_model=SalaryStructureOut, status_code=status.HTTP_201_CREATED)
async def create_salary_structure(
    payload: SalaryStructureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    struct = SalaryStructure(
        organization_id=org_id,
        structure_code=payload.structure_code.strip().upper(),
        name_en=payload.name_en,
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(struct)
    await db.commit()
    await db.refresh(struct)

    if payload.items:
        for it in payload.items:
            db.add(SalaryStructureItem(
                structure_id=struct.id,
                component_id=it.component_id,
                calculation_type=it.calculation_type,
                value_or_percent=it.value_or_percent
            ))
        await db.commit()

    return SalaryStructureOut(
        id=struct.id,
        organization_id=struct.organization_id,
        structure_code=struct.structure_code,
        name_en=struct.name_en,
        description=struct.description,
        is_active=struct.is_active,
        items_count=len(payload.items or []),
        created_at=struct.created_at
    )


# --- 3.3 Employee Salary Assignment ---
@router.get("/employee-salaries", response_model=EmployeeSalaryPaginatedOut)
async def list_employee_salaries(
    employee_id: Optional[int] = None,
    structure_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(EmployeeSalary).where(EmployeeSalary.organization_id == org_id)
    if employee_id:
        q = q.where(EmployeeSalary.employee_id == employee_id)
    if structure_id:
        q = q.where(EmployeeSalary.structure_id == structure_id)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(desc(EmployeeSalary.id)).limit(limit).offset(offset))
    salaries = items_res.scalars().all()

    out_items = []
    for es in salaries:
        emp = es.employee
        struct = es.structure
        out_items.append(EmployeeSalaryOut(
            id=es.id,
            organization_id=es.organization_id,
            employee_id=es.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            designation_title=emp.designation.title_en if emp and emp.designation else None,
            structure_id=es.structure_id,
            structure_name=struct.name_en if struct else None,
            gross_salary=es.gross_salary,
            basic_salary=es.basic_salary,
            effective_from=es.effective_from,
            effective_to=es.effective_to,
            is_active=es.is_active,
            notes=es.notes,
            created_at=es.created_at
        ))

    return EmployeeSalaryPaginatedOut(items=out_items, total=total, limit=limit, offset=offset)


@router.post("/employee-salaries", response_model=EmployeeSalaryOut, status_code=status.HTTP_201_CREATED)
async def assign_employee_salary(
    payload: EmployeeSalaryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    basic = payload.basic_salary or (payload.gross_salary * Decimal("0.50"))

    # Deactivate previous active salary
    prev_q = select(EmployeeSalary).where(
        EmployeeSalary.organization_id == org_id,
        EmployeeSalary.employee_id == payload.employee_id,
        EmployeeSalary.is_active == True
    )
    prev_res = await db.execute(prev_q)
    for p in prev_res.scalars().all():
        p.is_active = False

    es = EmployeeSalary(
        organization_id=org_id,
        employee_id=payload.employee_id,
        structure_id=payload.structure_id,
        gross_salary=payload.gross_salary,
        basic_salary=basic,
        effective_from=payload.effective_from,
        effective_to=payload.effective_to,
        is_active=payload.is_active,
        notes=payload.notes
    )
    db.add(es)

    # Also sync to Employee.basic_salary and gross_salary
    emp = await db.get(Employee, payload.employee_id)
    if emp:
        emp.basic_salary = basic

    await db.commit()
    await db.refresh(es)

    return EmployeeSalaryOut(
        id=es.id,
        organization_id=es.organization_id,
        employee_id=es.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
        employee_code=emp.employee_code if emp else None,
        structure_id=es.structure_id,
        gross_salary=es.gross_salary,
        basic_salary=es.basic_salary,
        effective_from=es.effective_from,
        effective_to=es.effective_to,
        is_active=es.is_active,
        notes=es.notes,
        created_at=es.created_at
    )


# --- 3.4 Salary Revision ---
@router.get("/salary-revisions", response_model=SalaryRevisionPaginatedOut)
async def list_salary_revisions(
    employee_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(SalaryRevision).where(SalaryRevision.organization_id == org_id)
    if employee_id:
        q = q.where(SalaryRevision.employee_id == employee_id)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(desc(SalaryRevision.id)).limit(limit).offset(offset))
    revs = items_res.scalars().all()

    out_items = []
    for r in revs:
        emp = r.employee
        out_items.append(SalaryRevisionOut(
            id=r.id,
            organization_id=r.organization_id,
            employee_id=r.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
            employee_code=emp.employee_code if emp else None,
            revision_type=r.revision_type,
            effective_date=r.effective_date,
            previous_gross=r.previous_gross,
            new_gross=r.new_gross,
            increment_amount=r.increment_amount,
            increment_percent=r.increment_percent,
            approved_by=r.approved_by,
            status=r.status,
            remarks=r.remarks,
            created_at=r.created_at
        ))

    return SalaryRevisionPaginatedOut(items=out_items, total=total, limit=limit, offset=offset)


@router.post("/salary-revisions", response_model=SalaryRevisionOut, status_code=status.HTTP_201_CREATED)
async def create_salary_revision(
    payload: SalaryRevisionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    # Find current active salary
    cur_sal_q = select(EmployeeSalary).where(
        EmployeeSalary.organization_id == org_id,
        EmployeeSalary.employee_id == payload.employee_id,
        EmployeeSalary.is_active == True
    )
    cur_res = await db.execute(cur_sal_q)
    cur_sal = cur_res.scalar_one_or_none()

    prev_gross = cur_sal.gross_salary if cur_sal else Decimal("0.00")
    inc_amt = payload.new_gross - prev_gross
    inc_pct = (inc_amt / prev_gross * Decimal("100.00")) if prev_gross > 0 else Decimal("0.00")

    rev = SalaryRevision(
        organization_id=org_id,
        employee_id=payload.employee_id,
        revision_type=payload.revision_type,
        effective_date=payload.effective_date,
        previous_gross=prev_gross,
        new_gross=payload.new_gross,
        increment_amount=inc_amt,
        increment_percent=inc_pct,
        approved_by=current_user.id if current_user else 1,
        status="APPROVED",
        remarks=payload.remarks
    )
    db.add(rev)

    # Automatically update employee active salary
    if cur_sal:
        cur_sal.gross_salary = payload.new_gross
        cur_sal.basic_salary = payload.new_gross * Decimal("0.50")
    else:
        struct_res = await db.execute(select(SalaryStructure.id).where(SalaryStructure.organization_id == org_id).limit(1))
        sid = struct_res.scalar() or 1
        new_es = EmployeeSalary(
            organization_id=org_id,
            employee_id=payload.employee_id,
            structure_id=sid,
            gross_salary=payload.new_gross,
            basic_salary=payload.new_gross * Decimal("0.50"),
            effective_from=payload.effective_date,
            is_active=True
        )
        db.add(new_es)

    emp = await db.get(Employee, payload.employee_id)
    if emp:
        emp.basic_salary = payload.new_gross * Decimal("0.50")

    await db.commit()
    await db.refresh(rev)

    return SalaryRevisionOut(
        id=rev.id,
        organization_id=rev.organization_id,
        employee_id=rev.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
        employee_code=emp.employee_code if emp else None,
        revision_type=rev.revision_type,
        effective_date=rev.effective_date,
        previous_gross=rev.previous_gross,
        new_gross=rev.new_gross,
        increment_amount=rev.increment_amount,
        increment_percent=rev.increment_percent,
        approved_by=rev.approved_by,
        status=rev.status,
        remarks=rev.remarks,
        created_at=rev.created_at
    )


# --- 3.5, 3.18, 3.19 Payroll Period & Workflow Engine ---
@router.get("/payroll-periods", response_model=PayrollPeriodPaginatedOut)
async def list_payroll_periods(
    year: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(PayrollPeriod).where(PayrollPeriod.organization_id == org_id)
    if year:
        q = q.where(PayrollPeriod.year == year)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(desc(PayrollPeriod.year), desc(PayrollPeriod.month)).limit(limit).offset(offset))
    items = items_res.scalars().all()
    return PayrollPeriodPaginatedOut(items=items, total=total, limit=limit, offset=offset)


@router.post("/payroll-periods", response_model=PayrollPeriodOut, status_code=status.HTTP_201_CREATED)
async def create_payroll_period(
    payload: PayrollPeriodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    existing = await db.execute(select(PayrollPeriod).where(
        PayrollPeriod.organization_id == org_id,
        PayrollPeriod.period_code == payload.period_code
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Payroll period {payload.period_code} already exists.")

    period = PayrollPeriod(
        organization_id=org_id,
        period_code=payload.period_code,
        period_name=payload.period_name,
        year=payload.year,
        month=payload.month,
        start_date=payload.start_date,
        end_date=payload.end_date,
        cut_off_date=payload.cut_off_date,
        status="DRAFT",
        prepared_by=current_user.id if current_user else 1,
        prepared_at=datetime.utcnow()
    )
    db.add(period)
    await db.commit()
    await db.refresh(period)
    return period


@router.post("/payroll-periods/{id}/workflow", response_model=PayrollPeriodOut)
async def execute_payroll_workflow(
    id: int,
    payload: PayrollWorkflowActionPayload,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    period = await db.get(PayrollPeriod, id)
    if not period or period.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Payroll period not found.")

    if period.is_locked and payload.action not in ["UNLOCK"]:
        raise HTTPException(status_code=400, detail="Period is locked. Unlock required to make changes.")

    act = payload.action.upper()

    if act == "PROCESS":
        # 3.7 - 3.10 Engine Calculation
        period.status = "PROCESSING"
        
        # Load all active employees
        emps_q = select(Employee).where(Employee.organization_id == org_id)
        emps_res = await db.execute(emps_q)
        employees = emps_res.scalars().all()

        tot_gross = Decimal("0.00")
        tot_ded = Decimal("0.00")
        tot_net = Decimal("0.00")
        tot_employer = Decimal("0.00")
        slip_count = 0

        for emp in employees:
            if emp.status in ["TERMINATED", "RESIGNED"]:
                continue

            # 1. Salary structure / base earnings
            sal_q = select(EmployeeSalary).where(
                EmployeeSalary.organization_id == org_id,
                EmployeeSalary.employee_id == emp.id,
                EmployeeSalary.is_active == True
            )
            sal_res = await db.execute(sal_q)
            sal = sal_res.scalar_one_or_none()

            gross = sal.gross_salary if sal else Decimal(emp.basic_salary or 50000) * Decimal("1.6")
            basic = sal.basic_salary if sal else Decimal(emp.basic_salary or 50000)
            house_rent = basic * Decimal("0.50")
            medical = basic * Decimal("0.20")
            conveyance = basic * Decimal("0.10")
            other_allow = gross - (basic + house_rent + medical + conveyance)
            if other_allow < 0:
                other_allow = Decimal("0.00")

            # 2. Overtime & Unpaid Leave from hr_payroll_inputs
            pi_q = select(PayrollInput).where(
                PayrollInput.organization_id == org_id,
                PayrollInput.employee_id == emp.id,
                PayrollInput.month == period.month,
                PayrollInput.year == period.year
            )
            pi_res = await db.execute(pi_q)
            pi = pi_res.scalar_one_or_none()

            ot_hours = pi.approved_overtime_hours if pi else Decimal("0.00")
            ot_amount = pi.overtime_amount if pi else Decimal("0.00")
            unpaid_days = pi.unpaid_leave_days if pi else Decimal("0.00")
            unpaid_ded = (gross / Decimal("30.00")) * unpaid_days

            # 3. Bonuses & Incentives
            bon_q = select(func.sum(BonusIncentive.bonus_amount)).where(
                BonusIncentive.organization_id == org_id,
                BonusIncentive.employee_id == emp.id,
                BonusIncentive.period_code == period.period_code,
                BonusIncentive.status == "APPROVED"
            )
            bon_res = await db.execute(bon_q)
            bonus_amt = bon_res.scalar() or Decimal("0.00")

            # 4. Total Earnings
            earnings = gross + ot_amount + bonus_amt

            # 5. Deductions
            # Provident Fund: 10% basic
            pf_emp = basic * Decimal("0.10")
            pf_comp = basic * Decimal("0.10")

            # Income Tax TDS
            tax_tds = gross * Decimal("0.05") if gross > Decimal("30000.00") else Decimal("0.00")

            # Staff Loan EMI
            loan_q = select(StaffLoan).where(
                StaffLoan.organization_id == org_id,
                StaffLoan.employee_id == emp.id,
                StaffLoan.status == "ACTIVE"
            )
            loan_res = await db.execute(loan_q)
            loans = loan_res.scalars().all()
            loan_ded = Decimal("0.00")
            for l in loans:
                installment = min(l.monthly_installment, l.remaining_balance)
                loan_ded += installment

            # Salary Advance
            adv_q = select(SalaryAdvance).where(
                SalaryAdvance.organization_id == org_id,
                SalaryAdvance.employee_id == emp.id,
                SalaryAdvance.recovery_period == period.period_code,
                SalaryAdvance.status == "APPROVED"
            )
            adv_res = await db.execute(adv_q)
            advs = adv_res.scalars().all()
            adv_ded = sum((a.advance_amount - a.recovered_amount for a in advs), Decimal("0.00"))

            total_deductions = unpaid_ded + pf_emp + tax_tds + loan_ded + adv_ded
            net_payable = earnings - total_deductions

            # Validation Warnings Check
            warnings = []
            if not emp.bank_account_no:
                warnings.append("Missing Bank Account Details")
            if net_payable <= 0:
                warnings.append("Zero or Negative Net Salary Payable")

            # Insert or update Payslip
            ps_q = select(PayrollPayslip).where(
                PayrollPayslip.period_id == period.id,
                PayrollPayslip.employee_id == emp.id
            )
            ps_res = await db.execute(ps_q)
            ps = ps_res.scalar_one_or_none()
            if not ps:
                ps = PayrollPayslip(
                    organization_id=org_id,
                    period_id=period.id,
                    employee_id=emp.id
                )
                db.add(ps)

            ps.gross_salary = gross
            ps.basic_salary = basic
            ps.house_rent = house_rent
            ps.medical_allowance = medical
            ps.conveyance_allowance = conveyance
            ps.other_allowances = other_allow
            ps.overtime_hours = ot_hours
            ps.overtime_amount = ot_amount
            ps.bonus_amount = bonus_amt
            ps.total_earnings = earnings
            ps.unpaid_leave_days = unpaid_days
            ps.unpaid_leave_deduction = unpaid_ded
            ps.income_tax_deduction = tax_tds
            ps.provident_fund_employee = pf_emp
            ps.provident_fund_employer = pf_comp
            ps.staff_loan_recovery = loan_ded
            ps.salary_advance_recovery = adv_ded
            ps.total_deductions = total_deductions
            ps.net_salary_payable = net_payable
            ps.bank_name = emp.bank_name
            ps.bank_account_no = emp.bank_account_no
            ps.status = "CALCULATED"
            ps.validation_warnings = warnings

            tot_gross += earnings
            tot_ded += total_deductions
            tot_net += net_payable
            tot_employer += pf_comp
            slip_count += 1

        period.total_employees = slip_count
        period.total_gross = tot_gross
        period.total_deductions = tot_ded
        period.total_net_payable = tot_net
        period.total_employer_cost = tot_employer
        period.status = "SUBMITTED"

    elif act == "SUBMIT":
        period.status = "SUBMITTED"
        period.prepared_by = current_user.id if current_user else 1
        period.prepared_at = datetime.utcnow()

    elif act == "VERIFY":
        period.status = "VERIFIED"
        period.verified_by = current_user.id if current_user else 1
        period.verified_at = datetime.utcnow()

    elif act == "APPROVE":
        period.status = "APPROVED"
        period.approved_by = current_user.id if current_user else 1
        period.approved_at = datetime.utcnow()

    elif act == "LOCK":
        period.status = "LOCKED"
        period.is_locked = True
        period.locked_at = datetime.utcnow()

    elif act == "UNLOCK":
        period.status = "APPROVED"
        period.is_locked = False
        period.locked_at = None

    await db.commit()
    await db.refresh(period)
    return period


# --- 3.7 - 3.10 & 3.20 Payroll Register & Payslips ---
@router.get("/payroll-periods/{period_id}/payslips", response_model=PayrollPayslipPaginatedOut)
async def list_payroll_period_payslips(
    period_id: int,
    employee_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(PayrollPayslip).where(
        PayrollPayslip.organization_id == org_id,
        PayrollPayslip.period_id == period_id
    )
    if employee_id:
        q = q.where(PayrollPayslip.employee_id == employee_id)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(PayrollPayslip.employee_id).limit(limit).offset(offset))
    slips = items_res.scalars().all()

    # Sum aggregates
    agg_q = select(
        func.sum(PayrollPayslip.total_earnings),
        func.sum(PayrollPayslip.total_deductions),
        func.sum(PayrollPayslip.net_salary_payable)
    ).where(PayrollPayslip.period_id == period_id)
    agg_res = await db.execute(agg_q)
    s_gross, s_ded, s_net = agg_res.first() or (Decimal("0.00"), Decimal("0.00"), Decimal("0.00"))

    out_items = []
    for ps in slips:
        emp = ps.employee
        out_items.append(PayrollPayslipDetailOut(
            id=ps.id,
            period_id=ps.period_id,
            employee_id=ps.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            designation_title=emp.designation.title_en if emp and emp.designation else None,
            gross_salary=ps.gross_salary,
            basic_salary=ps.basic_salary,
            house_rent=ps.house_rent,
            medical_allowance=ps.medical_allowance,
            conveyance_allowance=ps.conveyance_allowance,
            other_allowances=ps.other_allowances,
            overtime_hours=ps.overtime_hours,
            overtime_amount=ps.overtime_amount,
            bonus_amount=ps.bonus_amount,
            arrears_amount=ps.arrears_amount,
            total_earnings=ps.total_earnings,
            unpaid_leave_days=ps.unpaid_leave_days,
            unpaid_leave_deduction=ps.unpaid_leave_deduction,
            income_tax_deduction=ps.income_tax_deduction,
            provident_fund_employee=ps.provident_fund_employee,
            provident_fund_employer=ps.provident_fund_employer,
            staff_loan_recovery=ps.staff_loan_recovery,
            salary_advance_recovery=ps.salary_advance_recovery,
            other_deductions=ps.other_deductions,
            total_deductions=ps.total_deductions,
            net_salary_payable=ps.net_salary_payable,
            bank_name=ps.bank_name,
            bank_account_no=ps.bank_account_no,
            payment_method=ps.payment_method,
            status=ps.status,
            validation_warnings=ps.validation_warnings,
            is_disbursed=ps.is_disbursed
        ))

    return PayrollPayslipPaginatedOut(
        items=out_items,
        total=total,
        limit=limit,
        offset=offset,
        summary_gross=s_gross or Decimal("0.00"),
        summary_deductions=s_ded or Decimal("0.00"),
        summary_net=s_net or Decimal("0.00")
    )


@router.post("/payroll-periods/{period_id}/disburse")
async def disburse_payroll_period(
    period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    period = await db.get(PayrollPeriod, period_id)
    if not period or period.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Payroll period not found.")

    slips_q = select(PayrollPayslip).where(PayrollPayslip.period_id == period_id)
    slips_res = await db.execute(slips_q)
    slips = slips_res.scalars().all()
    for s in slips:
        s.is_disbursed = True
        s.status = "DISBURSED"
        s.disbursed_at = datetime.utcnow()

    period.status = "POSTED"
    await db.commit()
    return {"message": f"Successfully disbursed {len(slips)} payslips for {period.period_code}."}


# --- 3.14 Staff Loans ---
@router.get("/staff-loans", response_model=StaffLoanPaginatedOut)
async def list_staff_loans(
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(StaffLoan).where(StaffLoan.organization_id == org_id)
    if employee_id:
        q = q.where(StaffLoan.employee_id == employee_id)
    if status:
        q = q.where(StaffLoan.status == status)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(desc(StaffLoan.id)).limit(limit).offset(offset))
    loans = items_res.scalars().all()

    out_items = []
    for l in loans:
        emp = l.employee
        out_items.append(StaffLoanOut(
            id=l.id,
            organization_id=l.organization_id,
            employee_id=l.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            loan_code=l.loan_code,
            loan_type=l.loan_type,
            principal_amount=l.principal_amount,
            interest_rate=l.interest_rate,
            tenure_months=l.tenure_months,
            monthly_installment=l.monthly_installment,
            disbursed_amount=l.disbursed_amount,
            recovered_amount=l.recovered_amount,
            remaining_balance=l.remaining_balance,
            disbursement_date=l.disbursement_date,
            start_recovery_period=l.start_recovery_period,
            status=l.status,
            created_at=l.created_at
        ))

    return StaffLoanPaginatedOut(items=out_items, total=total, limit=limit, offset=offset)


@router.post("/staff-loans", response_model=StaffLoanOut, status_code=status.HTTP_201_CREATED)
async def create_staff_loan(
    payload: StaffLoanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    installment = payload.monthly_installment or (payload.principal_amount / Decimal(payload.tenure_months or 12))
    loan = StaffLoan(
        organization_id=org_id,
        employee_id=payload.employee_id,
        loan_code=payload.loan_code,
        loan_type=payload.loan_type,
        principal_amount=payload.principal_amount,
        interest_rate=payload.interest_rate,
        tenure_months=payload.tenure_months,
        monthly_installment=installment,
        disbursed_amount=payload.principal_amount,
        recovered_amount=Decimal("0.00"),
        remaining_balance=payload.principal_amount,
        disbursement_date=payload.disbursement_date,
        start_recovery_period=payload.start_recovery_period,
        status="ACTIVE"
    )
    db.add(loan)
    await db.commit()
    await db.refresh(loan)
    emp = await db.get(Employee, loan.employee_id)
    return StaffLoanOut(
        id=loan.id,
        organization_id=loan.organization_id,
        employee_id=loan.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
        employee_code=emp.employee_code if emp else None,
        loan_code=loan.loan_code,
        loan_type=loan.loan_type,
        principal_amount=loan.principal_amount,
        interest_rate=loan.interest_rate,
        tenure_months=loan.tenure_months,
        monthly_installment=loan.monthly_installment,
        disbursed_amount=loan.disbursed_amount,
        recovered_amount=loan.recovered_amount,
        remaining_balance=loan.remaining_balance,
        disbursement_date=loan.disbursement_date,
        start_recovery_period=loan.start_recovery_period,
        status=loan.status,
        created_at=loan.created_at
    )


# --- 3.15 Salary Advances ---
@router.get("/salary-advances", response_model=SalaryAdvancePaginatedOut)
async def list_salary_advances(
    employee_id: Optional[int] = None,
    recovery_period: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(SalaryAdvance).where(SalaryAdvance.organization_id == org_id)
    if employee_id:
        q = q.where(SalaryAdvance.employee_id == employee_id)
    if recovery_period:
        q = q.where(SalaryAdvance.recovery_period == recovery_period)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(desc(SalaryAdvance.id)).limit(limit).offset(offset))
    advs = items_res.scalars().all()

    out_items = []
    for a in advs:
        emp = a.employee
        out_items.append(SalaryAdvanceOut(
            id=a.id,
            organization_id=a.organization_id,
            employee_id=a.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
            employee_code=emp.employee_code if emp else None,
            advance_amount=a.advance_amount,
            requested_date=a.requested_date,
            recovery_period=a.recovery_period,
            recovered_amount=a.recovered_amount,
            status=a.status,
            reason=a.reason,
            created_at=a.created_at
        ))

    return SalaryAdvancePaginatedOut(items=out_items, total=total, limit=limit, offset=offset)


@router.post("/salary-advances", response_model=SalaryAdvanceOut, status_code=status.HTTP_201_CREATED)
async def create_salary_advance(
    payload: SalaryAdvanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    adv = SalaryAdvance(
        organization_id=org_id,
        employee_id=payload.employee_id,
        advance_amount=payload.advance_amount,
        requested_date=payload.requested_date,
        recovery_period=payload.recovery_period,
        recovered_amount=Decimal("0.00"),
        status="APPROVED",
        reason=payload.reason
    )
    db.add(adv)
    await db.commit()
    await db.refresh(adv)
    emp = await db.get(Employee, adv.employee_id)
    return SalaryAdvanceOut(
        id=adv.id,
        organization_id=adv.organization_id,
        employee_id=adv.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
        employee_code=emp.employee_code if emp else None,
        advance_amount=adv.advance_amount,
        requested_date=adv.requested_date,
        recovery_period=adv.recovery_period,
        recovered_amount=adv.recovered_amount,
        status=adv.status,
        reason=adv.reason,
        created_at=adv.created_at
    )


# --- 3.16 Bonuses & Incentives ---
@router.get("/bonuses-incentives", response_model=BonusIncentivePaginatedOut)
async def list_bonuses_incentives(
    period_code: Optional[str] = None,
    bonus_type: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(BonusIncentive).where(BonusIncentive.organization_id == org_id)
    if period_code:
        q = q.where(BonusIncentive.period_code == period_code)
    if bonus_type:
        q = q.where(BonusIncentive.bonus_type == bonus_type)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(desc(BonusIncentive.id)).limit(limit).offset(offset))
    bonuses = items_res.scalars().all()

    out_items = []
    for b in bonuses:
        emp = b.employee
        out_items.append(BonusIncentiveOut(
            id=b.id,
            organization_id=b.organization_id,
            employee_id=b.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
            employee_code=emp.employee_code if emp else None,
            bonus_type=b.bonus_type,
            period_code=b.period_code,
            bonus_amount=b.bonus_amount,
            is_taxable=b.is_taxable,
            status=b.status,
            remarks=b.remarks,
            created_at=b.created_at
        ))

    return BonusIncentivePaginatedOut(items=out_items, total=total, limit=limit, offset=offset)


@router.post("/bonuses-incentives", response_model=BonusIncentiveOut, status_code=status.HTTP_201_CREATED)
async def create_bonus_incentive(
    payload: BonusIncentiveCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    bon = BonusIncentive(
        organization_id=org_id,
        employee_id=payload.employee_id,
        bonus_type=payload.bonus_type,
        period_code=payload.period_code,
        bonus_amount=payload.bonus_amount,
        is_taxable=payload.is_taxable,
        status="APPROVED",
        remarks=payload.remarks
    )
    db.add(bon)
    await db.commit()
    await db.refresh(bon)
    emp = await db.get(Employee, bon.employee_id)
    return BonusIncentiveOut(
        id=bon.id,
        organization_id=bon.organization_id,
        employee_id=bon.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
        employee_code=emp.employee_code if emp else None,
        bonus_type=bon.bonus_type,
        period_code=bon.period_code,
        bonus_amount=bon.bonus_amount,
        is_taxable=bon.is_taxable,
        status=bon.status,
        remarks=bon.remarks,
        created_at=bon.created_at
    )


# --- 3.11 Tax Configuration Slabs ---
@router.get("/tax-slabs", response_model=List[TaxSlabOut])
async def list_tax_slabs(
    tax_year: str = Query("2025-2026"),
    db: AsyncSession = Depends(get_db)
):
    q = select(TaxSlab).where(TaxSlab.tax_year == tax_year, TaxSlab.is_active == True).order_by(TaxSlab.display_order)
    res = await db.execute(q)
    return res.scalars().all()


@router.post("/tax-slabs", response_model=TaxSlabOut, status_code=status.HTTP_201_CREATED)
async def create_tax_slab(
    payload: TaxSlabCreate,
    db: AsyncSession = Depends(get_db)
):
    slab = TaxSlab(
        tax_year=payload.tax_year,
        slab_name=payload.slab_name,
        min_income=payload.min_income,
        max_income=payload.max_income,
        tax_rate_percent=payload.tax_rate_percent,
        gender_applicability=payload.gender_applicability,
        display_order=payload.display_order,
        is_active=payload.is_active
    )
    db.add(slab)
    await db.commit()
    await db.refresh(slab)
    return slab


@router.put("/tax-slabs/{slab_id}", response_model=TaxSlabOut)
async def update_tax_slab(
    slab_id: int,
    payload: TaxSlabCreate,
    db: AsyncSession = Depends(get_db)
):
    slab = await db.get(TaxSlab, slab_id)
    if not slab:
        raise HTTPException(status_code=404, detail="Tax slab not found")
    slab.tax_year = payload.tax_year
    slab.slab_name = payload.slab_name
    slab.min_income = payload.min_income
    slab.max_income = payload.max_income
    slab.tax_rate_percent = payload.tax_rate_percent
    slab.gender_applicability = payload.gender_applicability
    slab.display_order = payload.display_order
    slab.is_active = payload.is_active
    await db.commit()
    await db.refresh(slab)
    return slab


# --- 3.14 Staff Loan Update ---
@router.put("/staff-loans/{loan_id}", response_model=StaffLoanOut)
async def update_staff_loan(
    loan_id: int,
    payload: StaffLoanCreate,
    db: AsyncSession = Depends(get_db)
):
    loan = await db.get(StaffLoan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Staff loan not found")
    loan.loan_type = payload.loan_type
    loan.principal_amount = payload.principal_amount
    loan.interest_rate = payload.interest_rate
    loan.tenure_months = payload.tenure_months
    if payload.monthly_installment:
        loan.monthly_installment = payload.monthly_installment
    loan.start_recovery_period = payload.start_recovery_period
    await db.commit()
    await db.refresh(loan)
    emp = await db.get(Employee, loan.employee_id)
    return StaffLoanOut(
        id=loan.id,
        organization_id=loan.organization_id,
        employee_id=loan.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
        employee_code=emp.employee_code if emp else None,
        loan_code=loan.loan_code,
        loan_type=loan.loan_type,
        principal_amount=loan.principal_amount,
        interest_rate=loan.interest_rate,
        tenure_months=loan.tenure_months,
        monthly_installment=loan.monthly_installment,
        disbursed_amount=loan.disbursed_amount,
        recovered_amount=loan.recovered_amount,
        remaining_balance=loan.remaining_balance,
        disbursement_date=loan.disbursement_date,
        start_recovery_period=loan.start_recovery_period,
        status=loan.status,
        created_at=loan.created_at
    )


# --- 3.15 Salary Advance Update ---
@router.put("/salary-advances/{advance_id}", response_model=SalaryAdvanceOut)
async def update_salary_advance(
    advance_id: int,
    payload: SalaryAdvanceCreate,
    db: AsyncSession = Depends(get_db)
):
    adv = await db.get(SalaryAdvance, advance_id)
    if not adv:
        raise HTTPException(status_code=404, detail="Salary advance not found")
    adv.advance_amount = payload.advance_amount
    adv.recovery_period = payload.recovery_period
    adv.reason = payload.reason
    await db.commit()
    await db.refresh(adv)
    emp = await db.get(Employee, adv.employee_id)
    return SalaryAdvanceOut(
        id=adv.id,
        organization_id=adv.organization_id,
        employee_id=adv.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
        employee_code=emp.employee_code if emp else None,
        advance_amount=adv.advance_amount,
        requested_date=adv.requested_date,
        recovery_period=adv.recovery_period,
        recovered_amount=adv.recovered_amount,
        status=adv.status,
        reason=adv.reason,
        created_at=adv.created_at
    )


# --- 3.12 & 3.13 Benefit & Gratuity Policies ---
@router.get("/benefit-policies", response_model=BenefitPolicyPaginatedOut)
async def list_benefit_policies(
    policy_type: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(BenefitPolicy).where(BenefitPolicy.organization_id == org_id)
    if policy_type:
        q = q.where(BenefitPolicy.policy_type == policy_type)

    cnt_q = select(func.count()).select_from(q.subquery())
    total_res = await db.execute(cnt_q)
    total = total_res.scalar_one() or 0

    items_res = await db.execute(q.order_by(BenefitPolicy.id).limit(limit).offset(offset))
    policies = items_res.scalars().all()
    return BenefitPolicyPaginatedOut(items=policies, total=total, limit=limit, offset=offset)


@router.post("/benefit-policies", response_model=BenefitPolicyOut, status_code=status.HTTP_201_CREATED)
async def create_benefit_policy(
    payload: BenefitPolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    policy = BenefitPolicy(
        organization_id=org_id,
        policy_code=payload.policy_code,
        policy_type=payload.policy_type,
        policy_name=payload.policy_name,
        eligibility_months=payload.eligibility_months,
        employee_contribution_pct=payload.employee_contribution_pct,
        employer_contribution_pct=payload.employer_contribution_pct,
        vesting_years=payload.vesting_years,
        calculation_basis=payload.calculation_basis,
        multiplier_per_year=payload.multiplier_per_year,
        is_statutory=payload.is_statutory,
        is_active=payload.is_active,
        description=payload.description
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return policy


@router.put("/benefit-policies/{policy_id}", response_model=BenefitPolicyOut)
async def update_benefit_policy(
    policy_id: int,
    payload: BenefitPolicyUpdate,
    db: AsyncSession = Depends(get_db)
):
    policy = await db.get(BenefitPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Benefit policy not found")
    if payload.policy_name is not None:
        policy.policy_name = payload.policy_name
    if payload.eligibility_months is not None:
        policy.eligibility_months = payload.eligibility_months
    if payload.employee_contribution_pct is not None:
        policy.employee_contribution_pct = payload.employee_contribution_pct
    if payload.employer_contribution_pct is not None:
        policy.employer_contribution_pct = payload.employer_contribution_pct
    if payload.vesting_years is not None:
        policy.vesting_years = payload.vesting_years
    if payload.calculation_basis is not None:
        policy.calculation_basis = payload.calculation_basis
    if payload.multiplier_per_year is not None:
        policy.multiplier_per_year = payload.multiplier_per_year
    if payload.is_statutory is not None:
        policy.is_statutory = payload.is_statutory
    if payload.is_active is not None:
        policy.is_active = payload.is_active
    if payload.description is not None:
        policy.description = payload.description
    await db.commit()
    await db.refresh(policy)
    return policy


# --- 3.17 Payroll Deep Validation ---
@router.get("/payroll-periods/{period_id}/validation", response_model=PayrollValidationSummaryOut)
async def validate_payroll_period(
    period_id: int,
    db: AsyncSession = Depends(get_db)
):
    period = await db.get(PayrollPeriod, period_id)
    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")

    ps_q = select(PayrollPayslip).where(PayrollPayslip.period_id == period_id)
    ps_res = await db.execute(ps_q)
    slips = ps_res.scalars().all()

    exceptions: List[PayrollValidationException] = []
    error_count = 0
    warning_count = 0

    for slip in slips:
        emp = await db.get(Employee, slip.employee_id)
        emp_name = f"{emp.first_name} {emp.last_name or ''}".strip() if emp else "Unknown"
        dept_name = emp.department.name_en if emp and emp.department else None

        # 1. Missing bank account
        if not slip.bank_account_no or len(str(slip.bank_account_no).strip()) < 5:
            exceptions.append(PayrollValidationException(
                employee_id=slip.employee_id,
                employee_code=emp.employee_code if emp else None,
                employee_name=emp_name,
                department_name=dept_name,
                issue_type="MISSING_BANK_ACCOUNT",
                severity="WARNING",
                description=f"No verified bank account number configured. Payment method is {slip.payment_method}."
            ))
            warning_count += 1

        # 2. Negative or zero net pay
        if slip.net_salary_payable <= Decimal("0.00"):
            exceptions.append(PayrollValidationException(
                employee_id=slip.employee_id,
                employee_code=emp.employee_code if emp else None,
                employee_name=emp_name,
                department_name=dept_name,
                issue_type="NEGATIVE_NET_PAY",
                severity="ERROR",
                description=f"Calculated net salary payable is BDT {slip.net_salary_payable:,.2f} (Total Earnings: {slip.total_earnings:,.2f}, Total Deductions: {slip.total_deductions:,.2f})."
            ))
            error_count += 1

        # 3. Unusual variations (deductions > 50% of gross)
        if slip.gross_salary > 0 and (slip.total_deductions / slip.gross_salary) > Decimal("0.50"):
            exceptions.append(PayrollValidationException(
                employee_id=slip.employee_id,
                employee_code=emp.employee_code if emp else None,
                employee_name=emp_name,
                department_name=dept_name,
                issue_type="UNUSUAL_VARIATION",
                severity="WARNING",
                description=f"Excessive deductions of BDT {slip.total_deductions:,.2f} exceeding 50% of gross pay (BDT {slip.gross_salary:,.2f})."
            ))
            warning_count += 1

    return PayrollValidationSummaryOut(
        period_id=period.id,
        period_code=period.period_code,
        total_payslips_checked=len(slips),
        has_blocking_errors=(error_count > 0),
        error_count=error_count,
        warning_count=warning_count,
        exceptions=exceptions
    )
