from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.modules.auth.models import User
from app.modules.auth.dependencies import get_current_user_optional

from app.modules.hrms.models import (
    Department, Designation, Employee, SiteLabourContractor,
    LabourMusterRoll, Attendance, LeaveApplication, PayrollRun, Payslip
)
from app.modules.hrms.schemas import (
    DepartmentCreate, DepartmentOut,
    DesignationCreate, DesignationOut,
    EmployeeCreate, EmployeeOut,
    ContractorCreate, ContractorOut,
    MusterRollBatchCreate, MusterRollOut,
    AttendancePunch, AttendanceOut,
    LeaveApply, LeaveApprove, LeaveOut,
    PayrollGenerateRequest, PayrollRunOut, PayslipOut,
    HRCockpitStats
)
from app.modules.hrms.services import HRMSService
from app.modules.projects.models import Project

router = APIRouter(prefix="/hrms", tags=["Enterprise HRMS & Labour Management"])


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


# --- 2. Departments Endpoints ---
@router.get("/departments", response_model=List[DepartmentOut])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(Department).where(Department.organization_id == org_id).order_by(Department.name_en)
    res = await db.execute(q)
    return res.scalars().all()

@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    dept = Department(
        organization_id=org_id,
        department_code=payload.department_code,
        name_en=payload.name_en,
        name_bn=payload.name_bn,
        head_of_dept_id=payload.head_of_dept_id,
        is_active=payload.is_active
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


# --- 3. Designations Endpoints ---
@router.get("/designations", response_model=List[DesignationOut])
async def list_designations(
    department_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(Designation).where(Designation.organization_id == org_id)
    if department_id:
        q = q.where(Designation.department_id == department_id)
    q = q.order_by(Designation.title_en)
    res = await db.execute(q)
    items = res.scalars().all()

    out = []
    for d in items:
        out.append(DesignationOut(
            id=d.id,
            department_id=d.department_id,
            designation_code=d.designation_code,
            title_en=d.title_en,
            title_bn=d.title_bn,
            grade_level=d.grade_level,
            min_salary=d.min_salary,
            max_salary=d.max_salary,
            is_active=d.is_active,
            department_name=d.department.name_en if d.department else None
        ))
    return out

@router.post("/designations", response_model=DesignationOut, status_code=status.HTTP_201_CREATED)
async def create_designation(
    payload: DesignationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    desig = Designation(
        organization_id=org_id,
        department_id=payload.department_id,
        designation_code=payload.designation_code,
        title_en=payload.title_en,
        title_bn=payload.title_bn,
        grade_level=payload.grade_level,
        min_salary=payload.min_salary,
        max_salary=payload.max_salary,
        is_active=payload.is_active
    )
    db.add(desig)
    await db.commit()
    await db.refresh(desig)
    return desig


# --- 4. Employees Master Registry ---
@router.get("/employees", response_model=List[EmployeeOut])
async def list_employees(
    category: Optional[str] = None,
    department_id: Optional[int] = None,
    project_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(Employee).where(Employee.organization_id == org_id)

    if category:
        q = q.where(Employee.workforce_category == category)
    if department_id:
        q = q.where(Employee.department_id == department_id)
    if project_id:
        q = q.where(Employee.assigned_project_id == project_id)
    if search:
        s = f"%{search}%"
        q = q.where(
            or_(
                Employee.first_name.ilike(s),
                Employee.last_name.ilike(s),
                Employee.employee_code.ilike(s),
                Employee.phone.ilike(s)
            )
        )

    q = q.order_by(Employee.employee_code)
    res = await db.execute(q)
    employees = res.scalars().all()

    out = []
    for emp in employees:
        gross = (emp.basic_salary or Decimal("0")) + \
                (emp.house_rent_allowance or Decimal("0")) + \
                (emp.medical_allowance or Decimal("0")) + \
                (emp.conveyance_allowance or Decimal("0")) + \
                (emp.site_hazard_allowance or Decimal("0")) + \
                (emp.mobile_allowance or Decimal("0"))

        out.append(EmployeeOut(
            id=emp.id,
            employee_code=emp.employee_code,
            first_name=emp.first_name,
            last_name=emp.last_name,
            official_email=emp.official_email,
            phone=emp.phone,
            personal_phone=emp.personal_phone,
            gender=emp.gender,
            date_of_birth=emp.date_of_birth,
            nid_number=emp.nid_number,
            tin_number=emp.tin_number,
            blood_group=emp.blood_group,
            emergency_contact_name=emp.emergency_contact_name,
            emergency_contact_phone=emp.emergency_contact_phone,
            joining_date=emp.joining_date,
            probation_months=emp.probation_months,
            employment_type=emp.employment_type,
            workforce_category=emp.workforce_category,
            status=emp.status,
            department_id=emp.department_id,
            designation_id=emp.designation_id,
            reporting_to_id=emp.reporting_to_id,
            assigned_project_id=emp.assigned_project_id,
            bank_account_no=emp.bank_account_no,
            bank_name=emp.bank_name,
            bank_branch=emp.bank_branch,
            routing_no=emp.routing_no,
            basic_salary=emp.basic_salary,
            house_rent_allowance=emp.house_rent_allowance,
            medical_allowance=emp.medical_allowance,
            conveyance_allowance=emp.conveyance_allowance,
            site_hazard_allowance=emp.site_hazard_allowance,
            mobile_allowance=emp.mobile_allowance,
            is_pf_eligible=emp.is_pf_eligible,
            is_tax_eligible=emp.is_tax_eligible,
            department_name=emp.department.name_en if emp.department else None,
            designation_title=emp.designation.title_en if emp.designation else None,
            assigned_project_name=emp.assigned_project.project_name if emp.assigned_project else None,
            gross_salary=gross
        ))
    return out

@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)

    # Auto code generation if missing
    code = payload.employee_code
    if not code:
        count_q = select(func.count(Employee.id)).where(Employee.organization_id == org_id)
        c = (await db.execute(count_q)).scalar() or 0
        code = f"EMP-{1000 + c + 1}"

    emp = Employee(
        organization_id=org_id,
        employee_code=code,
        first_name=payload.first_name,
        last_name=payload.last_name,
        official_email=payload.official_email,
        phone=payload.phone,
        personal_phone=payload.personal_phone,
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        nid_number=payload.nid_number,
        tin_number=payload.tin_number,
        blood_group=payload.blood_group,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        joining_date=payload.joining_date,
        probation_months=payload.probation_months,
        employment_type=payload.employment_type,
        workforce_category=payload.workforce_category,
        status="ACTIVE",
        department_id=payload.department_id,
        designation_id=payload.designation_id,
        reporting_to_id=payload.reporting_to_id,
        assigned_project_id=payload.assigned_project_id,
        bank_account_no=payload.bank_account_no,
        bank_name=payload.bank_name,
        bank_branch=payload.bank_branch,
        routing_no=payload.routing_no,
        basic_salary=payload.basic_salary,
        house_rent_allowance=payload.house_rent_allowance,
        medical_allowance=payload.medical_allowance,
        conveyance_allowance=payload.conveyance_allowance,
        site_hazard_allowance=payload.site_hazard_allowance,
        mobile_allowance=payload.mobile_allowance,
        is_pf_eligible=payload.is_pf_eligible,
        is_tax_eligible=payload.is_tax_eligible
    )
    db.add(emp)
    await db.commit()
    await db.refresh(emp)

    gross = payload.basic_salary + payload.house_rent_allowance + payload.medical_allowance + payload.conveyance_allowance + payload.site_hazard_allowance + payload.mobile_allowance

    return EmployeeOut(
        id=emp.id,
        employee_code=emp.employee_code,
        first_name=emp.first_name,
        last_name=emp.last_name,
        official_email=emp.official_email,
        phone=emp.phone,
        personal_phone=emp.personal_phone,
        gender=emp.gender,
        date_of_birth=emp.date_of_birth,
        nid_number=emp.nid_number,
        tin_number=emp.tin_number,
        blood_group=emp.blood_group,
        emergency_contact_name=emp.emergency_contact_name,
        emergency_contact_phone=emp.emergency_contact_phone,
        joining_date=emp.joining_date,
        probation_months=emp.probation_months,
        employment_type=emp.employment_type,
        workforce_category=emp.workforce_category,
        status=emp.status,
        department_id=emp.department_id,
        designation_id=emp.designation_id,
        reporting_to_id=emp.reporting_to_id,
        assigned_project_id=emp.assigned_project_id,
        bank_account_no=emp.bank_account_no,
        bank_name=emp.bank_name,
        bank_branch=emp.bank_branch,
        routing_no=emp.routing_no,
        basic_salary=emp.basic_salary,
        house_rent_allowance=emp.house_rent_allowance,
        medical_allowance=emp.medical_allowance,
        conveyance_allowance=emp.conveyance_allowance,
        site_hazard_allowance=emp.site_hazard_allowance,
        mobile_allowance=emp.mobile_allowance,
        is_pf_eligible=emp.is_pf_eligible,
        is_tax_eligible=emp.is_tax_eligible,
        gross_salary=gross
    )


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


# --- 7. Attendance (Biometric & Mobile GPS Geofencing) ---
@router.post("/attendance/punch", response_model=AttendanceOut)
async def punch_attendance(
    payload: AttendancePunch,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    punch_dt = payload.punch_time or datetime.now()
    punch_d = payload.punch_date or punch_dt.date()

    # Check existing attendance record for today
    q = select(Attendance).where(
        and_(
            Attendance.organization_id == org_id,
            Attendance.employee_id == payload.employee_id,
            Attendance.punch_date == punch_d
        )
    )
    res = await db.execute(q)
    att = res.scalar_one_or_none()

    if not att:
        # First punch (Clock IN)
        late_min = 0
        # Assume official start at 09:30 AM
        if punch_dt.time().hour > 9 or (punch_dt.time().hour == 9 and punch_dt.time().minute > 30):
            late_min = (punch_dt.time().hour - 9) * 60 + (punch_dt.time().minute - 30)

        status_val = "LATE" if late_min > 15 else "PRESENT"

        att = Attendance(
            organization_id=org_id,
            employee_id=payload.employee_id,
            punch_date=punch_d,
            clock_in=punch_dt,
            late_minutes=late_min,
            status=status_val,
            source=payload.source,
            geofence_lat=payload.geofence_lat,
            geofence_lng=payload.geofence_lng,
            remarks=payload.remarks
        )
        db.add(att)
    else:
        # Subsequent punch (Clock OUT)
        att.clock_out = punch_dt
        if payload.remarks:
            att.remarks = (att.remarks or "") + " | " + payload.remarks

    await db.commit()
    await db.refresh(att)

    emp_q = select(Employee).where(Employee.id == att.employee_id)
    emp_res = await db.execute(emp_q)
    emp = emp_res.scalar_one_or_none()

    return AttendanceOut(
        id=att.id,
        employee_id=att.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name_en if emp and emp.department else None,
        punch_date=att.punch_date,
        clock_in=att.clock_in,
        clock_out=att.clock_out,
        late_minutes=att.late_minutes,
        status=att.status,
        source=att.source
    )

@router.get("/attendance", response_model=List[AttendanceOut])
async def list_attendance(
    punch_date: Optional[date] = None,
    employee_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    target_date = punch_date or date.today()

    q = select(Attendance).where(
        and_(
            Attendance.organization_id == org_id,
            Attendance.punch_date == target_date
        )
    )
    if employee_id:
        q = q.where(Attendance.employee_id == employee_id)

    q = q.order_by(desc(Attendance.clock_in))
    res = await db.execute(q)
    items = res.scalars().all()

    out = []
    for att in items:
        emp = att.employee
        out.append(AttendanceOut(
            id=att.id,
            employee_id=att.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name_en if emp and emp.department else None,
            punch_date=att.punch_date,
            clock_in=att.clock_in,
            clock_out=att.clock_out,
            late_minutes=att.late_minutes,
            status=att.status,
            source=att.source
        ))
    return out


# --- 8. Leave Management ---
@router.post("/leave/apply", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
async def apply_leave(
    payload: LeaveApply,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    days = (payload.end_date - payload.start_date).days + 1

    leave = LeaveApplication(
        organization_id=org_id,
        employee_id=payload.employee_id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_days=max(1, days),
        reason=payload.reason,
        document_url=payload.document_url,
        status="PENDING"
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)

    emp = leave.employee
    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        total_days=leave.total_days,
        reason=leave.reason,
        status=leave.status,
        created_at=leave.created_at
    )

@router.put("/leave/{leave_id}/review", response_model=LeaveOut)
async def review_leave(
    leave_id: int,
    payload: LeaveApprove,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    q = select(LeaveApplication).where(LeaveApplication.id == leave_id)
    res = await db.execute(q)
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave application not found")

    leave.status = payload.status
    leave.approval_remarks = payload.approval_remarks
    leave.approved_by_id = current_user.id if current_user else None

    await db.commit()
    await db.refresh(leave)

    emp = leave.employee
    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        total_days=leave.total_days,
        reason=leave.reason,
        status=leave.status,
        approval_remarks=leave.approval_remarks,
        created_at=leave.created_at
    )

@router.get("/leave", response_model=List[LeaveOut])
async def list_leaves(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    org_id = get_org_id(current_user)
    q = select(LeaveApplication).where(LeaveApplication.organization_id == org_id)
    if status_filter:
        q = q.where(LeaveApplication.status == status_filter)
    q = q.order_by(desc(LeaveApplication.created_at))

    res = await db.execute(q)
    items = res.scalars().all()

    out = []
    for l in items:
        emp = l.employee
        out.append(LeaveOut(
            id=l.id,
            employee_id=l.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_code=emp.employee_code if emp else None,
            leave_type=l.leave_type,
            start_date=l.start_date,
            end_date=l.end_date,
            total_days=l.total_days,
            reason=l.reason,
            status=l.status,
            approval_remarks=l.approval_remarks,
            created_at=l.created_at
        ))
    return out


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
