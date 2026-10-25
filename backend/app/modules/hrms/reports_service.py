from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime
from enum import Enum
from typing import Any

from sqlalchemy import String, and_, case, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hrms.models import (
    Branch,
    Company,
    Department,
    Designation,
    Employee,
    EmployeeSeparation,
    EmployeeTransferHistory,
    HRReportExportAudit,
    PayrollPayslip,
    PayrollPeriod,
    ProjectSalaryCostAllocation,
    RecruitmentApplication,
    RecruitmentRecord,
    SalaryAdvance,
    SalaryRevision,
    StaffLoan,
    Attendance,
    AttendanceCorrection,
    Shift,
    ShiftAssignment,
    BiometricDevice,
    SiteGeofence,
    OvertimeRequest,
    LeaveApplication,
    LeaveType,
    LeaveBalance,
    LeaveEncashment,
    BonusIncentive,
)
from app.modules.projects.models import Project, Tower

e = Employee.__table__.c
d = Department.__table__.c
ds = Designation.__table__.c
co = Company.__table__.c
b = Branch.__table__.c
sep = EmployeeSeparation.__table__.c
transfer = EmployeeTransferHistory.__table__.c
revision = SalaryRevision.__table__.c
loan = StaffLoan.__table__.c
advance = SalaryAdvance.__table__.c
payslip = PayrollPayslip.__table__.c
period = PayrollPeriod.__table__.c
allocation = ProjectSalaryCostAllocation.__table__.c
application = RecruitmentApplication.__table__.c
recruitment = RecruitmentRecord.__table__.c
project = Project.__table__.c
tower = Tower.__table__.c
att = Attendance.__table__.c
att_corr = AttendanceCorrection.__table__.c
shift_tbl = Shift.__table__.c
l_app = LeaveApplication.__table__.c
l_bal = LeaveBalance.__table__.c
l_typ = LeaveType.__table__.c
l_enc = LeaveEncashment.__table__.c
ot_req = OvertimeRequest.__table__.c
bonus_inc = BonusIncentive.__table__.c


class ReportId(str, Enum):
    # 1. HR Reports
    EMPLOYEE_MASTER = "employee-master"
    EMPLOYEE_DIRECTORY = "employee-directory"
    EMPLOYEE_HEADCOUNT = "employee-headcount"
    NEW_JOINING = "new-joining"
    RESIGNATION_SEPARATION = "resignation-separation"
    EMPLOYEE_TRANSFER = "employee-transfer"
    PROMOTION_INCREMENT = "promotion-increment"
    DOCUMENT_EXPIRY = "document-expiry"
    RECRUITMENT = "recruitment"
    EMPLOYEE_TURNOVER = "employee-turnover"
    MANPOWER_ALLOCATION = "manpower-allocation"
    EMPLOYEE_LOAN_ADVANCE = "employee-loan-advance"

    # 2. Attendance Reports
    ATTENDANCE_DAILY = "attendance-daily"
    ATTENDANCE_MONTHLY_SUMMARY = "attendance-monthly-summary"
    ATTENDANCE_HISTORY = "attendance-history"
    ATTENDANCE_LATE_ARRIVAL = "attendance-late-arrival"
    ATTENDANCE_EARLY_DEPARTURE = "attendance-early-departure"
    ATTENDANCE_ABSENTEEISM = "attendance-absenteeism"
    ATTENDANCE_MISSING_PUNCH = "attendance-missing-punch"
    ATTENDANCE_OVERTIME = "attendance-overtime"
    ATTENDANCE_SHIFT_WISE = "attendance-shift-wise"
    ATTENDANCE_BIOMETRIC = "attendance-biometric"
    ATTENDANCE_MOBILE_GPS = "attendance-mobile-gps"
    ATTENDANCE_CORRECTION = "attendance-correction"
    ATTENDANCE_SITE_WISE = "attendance-site-wise"
    ATTENDANCE_EXCEPTION = "attendance-exception"

    # 3. Leave Reports
    LEAVE_REGISTER = "leave-register"
    LEAVE_APPROVED = "leave-approved"
    LEAVE_PENDING = "leave-pending"
    LEAVE_BALANCE = "leave-balance"
    LEAVE_TYPE_SUMMARY = "leave-type-summary"
    LEAVE_HISTORY = "leave-history"
    LEAVE_DEPARTMENT_WISE = "leave-department-wise"
    LEAVE_PROJECT_WISE = "leave-project-wise"
    LEAVE_UNPAID = "leave-unpaid"
    LEAVE_ENCASHMENT = "leave-encashment"
    LEAVE_CANCELLATION = "leave-cancellation"
    LEAVE_TREND_ANALYSIS = "leave-trend-analysis"

    # 4. Payroll Reports
    PAYROLL_REGISTER = "payroll-register"
    PAYROLL_MONTHLY_REGISTER = "payroll-monthly-register"
    SALARY_SHEET = "salary-sheet"
    PAYSLIP_REGISTER = "payslip-register"
    BANK_DISBURSEMENT = "bank-disbursement"
    BANK_SALARY_TRANSFER = "bank-salary-transfer"
    PAYROLL_SUMMARY = "payroll-summary"
    PAYROLL_DEPARTMENT_WISE = "payroll-department-wise"
    PAYROLL_PROJECT_COST = "payroll-project-cost"
    PAYROLL_SALARY_COMPONENT = "payroll-salary-component"
    PAYROLL_OVERTIME_PAYMENT = "payroll-overtime-payment"
    PAYROLL_BONUS = "payroll-bonus"
    PAYROLL_ARREARS = "payroll-arrears"
    PAYROLL_DEDUCTION = "payroll-deduction"
    PAYROLL_LOAN_RECOVERY = "payroll-loan-recovery"
    PAYROLL_SALARY_INCREMENT = "payroll-salary-increment"
    PAYROLL_FINAL_SETTLEMENT = "payroll-final-settlement"
    PAYROLL_VARIANCE = "payroll-variance"
    PAYROLL_POSTING = "payroll-posting"
    PAYROLL_RECONCILIATION = "payroll-reconciliation"

    # 5. Project-wise Labour Cost Reports
    LABOUR_PROJECT_SALARY = "labour-project-salary"
    LABOUR_TOWER_SITE = "labour-tower-site"
    LABOUR_WBS_ACTIVITY = "labour-wbs-activity"
    LABOUR_DIRECT_VS_SHARED = "labour-direct-vs-shared"
    LABOUR_TIMESHEET_HOURS = "labour-timesheet-hours"
    LABOUR_OVERTIME_PROJECT = "labour-overtime-project"
    LABOUR_BUDGET_VS_ACTUAL = "labour-budget-vs-actual"
    LABOUR_MONTHLY_TREND = "labour-monthly-trend"
    LABOUR_COST_EXCEPTIONS = "labour-cost-exceptions"
    LABOUR_MULTI_PROJECT_DISTRIBUTION = "labour-multi-project-distribution"


SENSITIVE_REPORTS = {
    ReportId.EMPLOYEE_DIRECTORY,
    ReportId.PROMOTION_INCREMENT,
    ReportId.MANPOWER_ALLOCATION,
    ReportId.EMPLOYEE_LOAN_ADVANCE,
    ReportId.PAYROLL_REGISTER,
    ReportId.PAYROLL_MONTHLY_REGISTER,
    ReportId.SALARY_SHEET,
    ReportId.PAYSLIP_REGISTER,
    ReportId.BANK_DISBURSEMENT,
    ReportId.BANK_SALARY_TRANSFER,
    ReportId.PAYROLL_SUMMARY,
    ReportId.PAYROLL_DEPARTMENT_WISE,
    ReportId.PAYROLL_PROJECT_COST,
    ReportId.PAYROLL_SALARY_COMPONENT,
    ReportId.PAYROLL_OVERTIME_PAYMENT,
    ReportId.PAYROLL_BONUS,
    ReportId.PAYROLL_ARREARS,
    ReportId.PAYROLL_DEDUCTION,
    ReportId.PAYROLL_LOAN_RECOVERY,
    ReportId.PAYROLL_SALARY_INCREMENT,
    ReportId.PAYROLL_FINAL_SETTLEMENT,
    ReportId.PAYROLL_VARIANCE,
    ReportId.PAYROLL_POSTING,
    ReportId.PAYROLL_RECONCILIATION,
    ReportId.LABOUR_PROJECT_SALARY,
    ReportId.LABOUR_TOWER_SITE,
    ReportId.LABOUR_WBS_ACTIVITY,
    ReportId.LABOUR_DIRECT_VS_SHARED,
    ReportId.LABOUR_TIMESHEET_HOURS,
    ReportId.LABOUR_OVERTIME_PROJECT,
    ReportId.LABOUR_BUDGET_VS_ACTUAL,
    ReportId.LABOUR_MONTHLY_TREND,
    ReportId.LABOUR_COST_EXCEPTIONS,
    ReportId.LABOUR_MULTI_PROJECT_DISTRIBUTION,
}

REPORT_TITLES = {
    # HR Reports
    ReportId.EMPLOYEE_MASTER: "Employee Master Report",
    ReportId.EMPLOYEE_DIRECTORY: "Employee Directory",
    ReportId.EMPLOYEE_HEADCOUNT: "Employee Headcount",
    ReportId.NEW_JOINING: "New Joining Report",
    ReportId.RESIGNATION_SEPARATION: "Resignation & Separation",
    ReportId.EMPLOYEE_TRANSFER: "Employee Transfer Report",
    ReportId.PROMOTION_INCREMENT: "Promotion & Increment Report",
    ReportId.DOCUMENT_EXPIRY: "Employee Document Expiry",
    ReportId.RECRUITMENT: "Recruitment Report",
    ReportId.EMPLOYEE_TURNOVER: "Employee Turnover Report",
    ReportId.MANPOWER_ALLOCATION: "Manpower Allocation Report",
    ReportId.EMPLOYEE_LOAN_ADVANCE: "Employee Loan & Advance Report",

    # Attendance Reports
    ReportId.ATTENDANCE_DAILY: "Daily Attendance Report",
    ReportId.ATTENDANCE_MONTHLY_SUMMARY: "Monthly Attendance Summary",
    ReportId.ATTENDANCE_HISTORY: "Employee Attendance History",
    ReportId.ATTENDANCE_LATE_ARRIVAL: "Late Arrival Report",
    ReportId.ATTENDANCE_EARLY_DEPARTURE: "Early Departure Report",
    ReportId.ATTENDANCE_ABSENTEEISM: "Absenteeism Report",
    ReportId.ATTENDANCE_MISSING_PUNCH: "Missing Punch Report",
    ReportId.ATTENDANCE_OVERTIME: "Overtime Report",
    ReportId.ATTENDANCE_SHIFT_WISE: "Shift-wise Attendance",
    ReportId.ATTENDANCE_BIOMETRIC: "Biometric Attendance Report",
    ReportId.ATTENDANCE_MOBILE_GPS: "Mobile/GPS Attendance Report",
    ReportId.ATTENDANCE_CORRECTION: "Attendance Correction Report",
    ReportId.ATTENDANCE_SITE_WISE: "Site-wise Attendance",
    ReportId.ATTENDANCE_EXCEPTION: "Attendance Exception Report",

    # Leave Reports
    ReportId.LEAVE_REGISTER: "Leave Application Register",
    ReportId.LEAVE_APPROVED: "Approved Leave Report",
    ReportId.LEAVE_PENDING: "Pending Leave Report",
    ReportId.LEAVE_BALANCE: "Leave Balance Report",
    ReportId.LEAVE_TYPE_SUMMARY: "Leave Type Summary",
    ReportId.LEAVE_HISTORY: "Employee Leave History",
    ReportId.LEAVE_DEPARTMENT_WISE: "Department-wise Leave Report",
    ReportId.LEAVE_PROJECT_WISE: "Project-wise Leave Report",
    ReportId.LEAVE_UNPAID: "Unpaid Leave Report",
    ReportId.LEAVE_ENCASHMENT: "Leave Encashment Report",
    ReportId.LEAVE_CANCELLATION: "Leave Cancellation Report",
    ReportId.LEAVE_TREND_ANALYSIS: "Leave Trend Analysis",

    # Payroll Reports
    ReportId.PAYROLL_REGISTER: "Monthly Payroll Register",
    ReportId.PAYROLL_MONTHLY_REGISTER: "Monthly Payroll Register",
    ReportId.SALARY_SHEET: "Salary Sheet",
    ReportId.PAYSLIP_REGISTER: "Payslip Register",
    ReportId.BANK_DISBURSEMENT: "Bank Salary Transfer Report",
    ReportId.BANK_SALARY_TRANSFER: "Bank Salary Transfer Report",
    ReportId.PAYROLL_SUMMARY: "Payroll Summary",
    ReportId.PAYROLL_DEPARTMENT_WISE: "Department-wise Payroll",
    ReportId.PAYROLL_PROJECT_COST: "Project-wise Payroll Cost",
    ReportId.PAYROLL_SALARY_COMPONENT: "Salary Component Report",
    ReportId.PAYROLL_OVERTIME_PAYMENT: "Overtime Payment Report",
    ReportId.PAYROLL_BONUS: "Bonus Report",
    ReportId.PAYROLL_ARREARS: "Arrears Report",
    ReportId.PAYROLL_DEDUCTION: "Deduction Report",
    ReportId.PAYROLL_LOAN_RECOVERY: "Employee Loan Recovery",
    ReportId.PAYROLL_SALARY_INCREMENT: "Salary Increment Report",
    ReportId.PAYROLL_FINAL_SETTLEMENT: "Final Settlement Report",
    ReportId.PAYROLL_VARIANCE: "Payroll Variance Report",
    ReportId.PAYROLL_POSTING: "Payroll Posting Report",
    ReportId.PAYROLL_RECONCILIATION: "Payroll Reconciliation Report",

    # Project Labour Cost Reports
    ReportId.LABOUR_PROJECT_SALARY: "Project-wise Employee Salary Allocation",
    ReportId.LABOUR_TOWER_SITE: "Tower-wise and Site-wise Labour Cost",
    ReportId.LABOUR_WBS_ACTIVITY: "WBS/Activity-wise Labour Expenses",
    ReportId.LABOUR_DIRECT_VS_SHARED: "Direct Labour versus Shared Staff Costs",
    ReportId.LABOUR_TIMESHEET_HOURS: "Employee Timesheet and Approved Working Hours",
    ReportId.LABOUR_OVERTIME_PROJECT: "Overtime Expenditure by Project",
    ReportId.LABOUR_BUDGET_VS_ACTUAL: "Budgeted versus Actual Manpower Cost",
    ReportId.LABOUR_MONTHLY_TREND: "Monthly Labour Cost Trend by Project",
    ReportId.LABOUR_COST_EXCEPTIONS: "Cost Allocation Exceptions and Unallocated Payroll",
    ReportId.LABOUR_MULTI_PROJECT_DISTRIBUTION: "Employee Cost Distribution across Multiple Projects",
}

REPORT_DESCRIPTIONS = {
    # HR Reports
    ReportId.EMPLOYEE_MASTER: "Employee ID, name, designation, department, joining date, status.",
    ReportId.EMPLOYEE_DIRECTORY: "Contact details, reporting manager, branch, work location.",
    ReportId.EMPLOYEE_HEADCOUNT: "Total employees by company, branch, department, and project.",
    ReportId.NEW_JOINING: "Newly joined employees by date range.",
    ReportId.RESIGNATION_SEPARATION: "Resignations, terminations, exit dates, and clearance status.",
    ReportId.EMPLOYEE_TRANSFER: "Department, branch, designation, and project transfers.",
    ReportId.PROMOTION_INCREMENT: "Salary revisions, promotions, and effective dates.",
    ReportId.DOCUMENT_EXPIRY: "Expiring contracts, certificates, and authorized identity documents.",
    ReportId.RECRUITMENT: "Vacancies, candidates, interviews, offers, and hiring status.",
    ReportId.EMPLOYEE_TURNOVER: "Employee exits and turnover trends.",
    ReportId.MANPOWER_ALLOCATION: "Employee allocation by project, site, and department.",
    ReportId.EMPLOYEE_LOAN_ADVANCE: "Approved amounts, repayments, and outstanding balances.",

    # Attendance Reports
    ReportId.ATTENDANCE_DAILY: "Present, absent, late, half-day, and leave status.",
    ReportId.ATTENDANCE_MONTHLY_SUMMARY: "Employee-wise attendance totals for the month.",
    ReportId.ATTENDANCE_HISTORY: "Daily check-in, check-out, and attendance status.",
    ReportId.ATTENDANCE_LATE_ARRIVAL: "Late arrivals and minutes late.",
    ReportId.ATTENDANCE_EARLY_DEPARTURE: "Employees leaving before scheduled time.",
    ReportId.ATTENDANCE_ABSENTEEISM: "Absences by employee, department, or project.",
    ReportId.ATTENDANCE_MISSING_PUNCH: "Missing check-in/check-out records.",
    ReportId.ATTENDANCE_OVERTIME: "Approved overtime hours and payable amounts.",
    ReportId.ATTENDANCE_SHIFT_WISE: "Attendance by shift, location, and date.",
    ReportId.ATTENDANCE_BIOMETRIC: "Device punch records and synchronization exceptions.",
    ReportId.ATTENDANCE_MOBILE_GPS: "Authorized location-based attendance records.",
    ReportId.ATTENDANCE_CORRECTION: "Correction requests, approvers, and outcomes.",
    ReportId.ATTENDANCE_SITE_WISE: "Attendance by construction project, tower, or site.",
    ReportId.ATTENDANCE_EXCEPTION: "Unusual punches, duplicate records, and unresolved exceptions.",

    # Leave Reports
    ReportId.LEAVE_REGISTER: "Applications, dates, leave type, and status.",
    ReportId.LEAVE_APPROVED: "Approved leave by employee and period.",
    ReportId.LEAVE_PENDING: "Requests awaiting approval.",
    ReportId.LEAVE_BALANCE: "Opening balance, earned, used, adjusted, and remaining leave.",
    ReportId.LEAVE_TYPE_SUMMARY: "Annual, casual, sick, unpaid, and other configured leave types.",
    ReportId.LEAVE_HISTORY: "Individual employee leave transactions.",
    ReportId.LEAVE_DEPARTMENT_WISE: "Leave usage across departments.",
    ReportId.LEAVE_PROJECT_WISE: "Leave affecting construction and project teams.",
    ReportId.LEAVE_UNPAID: "Approved unpaid leave and payroll impact.",
    ReportId.LEAVE_ENCASHMENT: "Eligible, approved, and paid leave encashment.",
    ReportId.LEAVE_CANCELLATION: "Cancelled applications and balance adjustments.",
    ReportId.LEAVE_TREND_ANALYSIS: "Monthly and yearly leave patterns.",

    # Payroll Reports
    ReportId.PAYROLL_REGISTER: "Employee-wise earnings, deductions, and net pay.",
    ReportId.PAYROLL_MONTHLY_REGISTER: "Employee-wise earnings, deductions, and net pay.",
    ReportId.SALARY_SHEET: "Basic salary, allowances, overtime, bonuses, and deductions.",
    ReportId.PAYSLIP_REGISTER: "Payslip generation and publication status.",
    ReportId.BANK_DISBURSEMENT: "Employee payment details and transfer amounts.",
    ReportId.BANK_SALARY_TRANSFER: "Employee payment details and transfer amounts.",
    ReportId.PAYROLL_SUMMARY: "Total gross earnings, deductions, and net payable.",
    ReportId.PAYROLL_DEPARTMENT_WISE: "Salary expenses by department.",
    ReportId.PAYROLL_PROJECT_COST: "Salary and labour costs allocated to projects.",
    ReportId.PAYROLL_SALARY_COMPONENT: "Basic salary and allowance breakdown.",
    ReportId.PAYROLL_OVERTIME_PAYMENT: "Approved overtime hours and amounts.",
    ReportId.PAYROLL_BONUS: "Festival, performance, and other approved bonuses.",
    ReportId.PAYROLL_ARREARS: "Prior-period salary adjustments.",
    ReportId.PAYROLL_DEDUCTION: "Loans, advances, tax, and other authorized deductions.",
    ReportId.PAYROLL_LOAN_RECOVERY: "Installments deducted and outstanding balances.",
    ReportId.PAYROLL_SALARY_INCREMENT: "Previous salary, revised salary, and effective date.",
    ReportId.PAYROLL_FINAL_SETTLEMENT: "Outstanding salary, approved benefits, recoveries, and net settlement.",
    ReportId.PAYROLL_VARIANCE: "Comparison with previous payroll periods.",
    ReportId.PAYROLL_POSTING: "Payroll journal entries and accounting references.",
    ReportId.PAYROLL_RECONCILIATION: "Payroll register versus salary payments and accounting balances.",

    # Project Labour Cost Reports
    ReportId.LABOUR_PROJECT_SALARY: "Project-wise employee salary allocation.",
    ReportId.LABOUR_TOWER_SITE: "Tower-wise and site-wise labour cost.",
    ReportId.LABOUR_WBS_ACTIVITY: "WBS/activity-wise labour expenses.",
    ReportId.LABOUR_DIRECT_VS_SHARED: "Direct labour versus shared staff costs.",
    ReportId.LABOUR_TIMESHEET_HOURS: "Employee timesheet and approved working hours.",
    ReportId.LABOUR_OVERTIME_PROJECT: "Overtime expenditure by project.",
    ReportId.LABOUR_BUDGET_VS_ACTUAL: "Budgeted versus actual manpower cost.",
    ReportId.LABOUR_MONTHLY_TREND: "Monthly labour cost trend by project.",
    ReportId.LABOUR_COST_EXCEPTIONS: "Cost allocation exceptions and unallocated payroll.",
    ReportId.LABOUR_MULTI_PROJECT_DISTRIBUTION: "Employee cost distribution across multiple projects.",
}


def turnover_rate(exit_count: int, average_headcount: float | None) -> float | None:
    if average_headcount is None or average_headcount <= 0:
        return None
    return round(exit_count / average_headcount * 100, 2)


def _date_filters(expression: Any, filters: Any) -> list[Any]:
    clauses = []
    if filters.start_date:
        clauses.append(expression >= filters.start_date)
    if filters.end_date:
        clauses.append(expression <= filters.end_date)
    return clauses


def _employee_clauses(org_id: int, filters: Any, date_expr: Any | None = None) -> list[Any]:
    clauses = [e.organization_id == org_id]
    if filters.company_id is not None:
        clauses.append(e.company_id == filters.company_id)
    if filters.branch_id is not None:
        clauses.append(e.branch_id == filters.branch_id)
    if filters.department_id is not None:
        clauses.append(e.department_id == filters.department_id)
    if filters.designation_id is not None:
        clauses.append(e.designation_id == filters.designation_id)
    if filters.project_id is not None:
        clauses.append(e.assigned_project_id == filters.project_id)
    if filters.employee_id is not None:
        clauses.append(e.id == filters.employee_id)
    if filters.status:
        clauses.append(e.status == filters.status)
    if filters.employment_type:
        clauses.append(e.employment_type == filters.employment_type)
    if date_expr is not None:
        clauses.extend(_date_filters(date_expr, filters))
    if filters.search:
        term = f"%{filters.search.strip()}%"
        clauses.append(or_(
            e.employee_code.ilike(term),
            e.first_name.ilike(term),
            e.last_name.ilike(term),
            func.concat(e.first_name, " ", e.last_name).ilike(term),
        ))
    return clauses


def _employee_from():
    dept = Department.__table__.alias("rpt_employee_department")
    designation = Designation.__table__.alias("rpt_employee_designation")
    company = Company.__table__.alias("rpt_employee_company")
    branch = Branch.__table__.alias("rpt_employee_branch")
    branch_company = Company.__table__.alias("rpt_employee_branch_company")
    project = Project.__table__.alias("rpt_employee_project")
    manager = Employee.__table__.alias("rpt_employee_manager")
    org_company_ids = select(co.id).where(co.organization_id == e.organization_id).correlate(Employee.__table__)
    from_clause = (
        Employee.__table__
        .outerjoin(dept, and_(e.department_id == dept.c.id, dept.c.organization_id == e.organization_id))
        .outerjoin(designation, and_(e.designation_id == designation.c.id, designation.c.organization_id == e.organization_id))
        .outerjoin(company, and_(e.company_id == company.c.id, company.c.organization_id == e.organization_id))
        .outerjoin(branch, and_(e.branch_id == branch.c.id, branch.c.company_id.in_(org_company_ids)))
        .outerjoin(branch_company, and_(branch.c.company_id == branch_company.c.id, branch_company.c.organization_id == e.organization_id))
        .outerjoin(project, e.assigned_project_id == project.c.id)
        .outerjoin(manager, and_(e.reporting_to_id == manager.c.id, manager.c.organization_id == e.organization_id))
    )
    return from_clause, dept, designation, company, branch, branch_company, project, manager


async def _fetch(
    db: AsyncSession,
    statement: Any,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, Any]], int]:
    count_statement = select(func.count()).select_from(statement.order_by(None).subquery())
    total = int((await db.execute(count_statement)).scalar_one())
    result = await db.execute(statement.limit(limit).offset(offset))
    return [dict(row) for row in result.mappings().all()], total


def _columns(*items: tuple[str, str]) -> list[dict[str, str]]:
    return [{"key": key, "label": label} for key, label in items]


async def get_report_rows(
    db: AsyncSession,
    report: ReportId,
    org_id: int,
    filters: Any,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, str]], list[dict[str, Any]], int]:
    base, dept, designation, company, branch, branch_company, project, manager = _employee_from()
    employee_date = e.joining_date
    if report in {ReportId.EMPLOYEE_MASTER, ReportId.EMPLOYEE_DIRECTORY, ReportId.NEW_JOINING}:
        columns = [
            ("employee_code", "Employee ID"),
            ("employee_name", "Employee name"),
            ("designation", "Designation"),
            ("department", "Department"),
            ("joining_date", "Joining date"),
            ("employment_type", "Employment type"),
            ("status", "Status"),
        ]
        selected = [
            e.employee_code.label("employee_code"),
            (e.first_name + " " + e.last_name).label("employee_name"),
            designation.c.title_en.label("designation"),
            dept.c.name_en.label("department"),
            e.joining_date.label("joining_date"),
            e.employment_type.label("employment_type"),
            e.status.label("status"),
        ]
        if report == ReportId.EMPLOYEE_DIRECTORY:
            columns = [
                ("employee_name", "Employee name"), ("employee_code", "Employee ID"),
                ("official_email", "Work email"), ("phone", "Work phone"),
                ("manager", "Manager"), ("branch", "Branch"), ("work_location", "Work location"),
            ]
            selected = [
                (e.first_name + " " + e.last_name).label("employee_name"),
                e.employee_code.label("employee_code"),
                e.official_email.label("official_email"),
                e.phone.label("phone"),
                (manager.c.first_name + " " + manager.c.last_name).label("manager"),
                branch.c.branch_name.label("branch"),
                e.work_location.label("work_location"),
            ]
        clauses = _employee_clauses(org_id, filters, employee_date)
        if report == ReportId.NEW_JOINING and not (filters.start_date or filters.end_date):
            clauses.append(e.joining_date >= date(date.today().year, 1, 1))
        stmt = select(*selected).select_from(base).where(*clauses).order_by(e.joining_date.desc(), e.id)
        rows, total = await _fetch(db, stmt, limit, offset)
        return _columns(*columns), rows, total

    if report == ReportId.EMPLOYEE_HEADCOUNT:
        clauses = _employee_clauses(org_id, filters)
        if not filters.status:
            clauses.append(e.status.not_in(("RESIGNED", "TERMINATED", "RETIRED", "INACTIVE")))
        stmt = (
            select(
                company.c.company_name.label("company"),
                branch.c.branch_name.label("branch"),
                dept.c.name_en.label("department"),
                project.c.project_name.label("project"),
                func.count(e.id).label("headcount"),
            )
            .select_from(base)
            .where(*clauses)
            .group_by(company.c.company_name, branch.c.branch_name, dept.c.name_en, project.c.project_name)
            .order_by(company.c.company_name, branch.c.branch_name, dept.c.name_en, project.c.project_name)
        )
        rows, total = await _fetch(db, stmt, limit, offset)
        return _columns(("company", "Company"), ("branch", "Branch"), ("department", "Department"), ("project", "Project"), ("headcount", "Headcount")), rows, total

    if report == ReportId.RESIGNATION_SEPARATION:
        clauses = [
            sep.organization_id == org_id,
            e.organization_id == org_id,
        ]
        if filters.employee_id:
            clauses.append(e.id == filters.employee_id)
        if filters.department_id:
            clauses.append(e.department_id == filters.department_id)
        if filters.separation_type:
            clauses.append(sep.separation_type == filters.separation_type)
        if filters.status:
            clauses.append(sep.status == filters.status)
        clauses.extend(_date_filters(sep.submission_date, filters))
        if filters.search:
            term = f"%{filters.search.strip()}%"
            clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term), sep.separation_ref.ilike(term)))
        stmt = (
            select(
                e.employee_code.label("employee_code"),
                (e.first_name + " " + e.last_name).label("employee_name"),
                sep.separation_ref.label("reference"),
                sep.separation_type.label("separation_type"),
                sep.submission_date.label("submission_date"),
                sep.notice_start_date.label("notice_start_date"),
                sep.notice_end_date.label("notice_end_date"),
                sep.last_working_day.label("last_working_day"),
                sep.asset_clearance_status.label("asset_clearance"),
                sep.dept_clearance_status.label("department_clearance"),
                sep.approval_status.label("approval_status"),
            )
            .join(Employee.__table__, and_(sep.employee_id == e.id, e.organization_id == org_id))
            .where(*clauses)
            .order_by(sep.submission_date.desc(), sep.id)
        )
        rows, total = await _fetch(db, stmt, limit, offset)
        return _columns(("employee_code", "Employee ID"), ("employee_name", "Employee name"), ("reference", "Reference"), ("separation_type", "Type"), ("submission_date", "Submitted"), ("notice_start_date", "Notice start"), ("notice_end_date", "Notice end"), ("last_working_day", "Last working day"), ("asset_clearance", "Asset clearance"), ("department_clearance", "Department clearance"), ("approval_status", "Approval")), rows, total

    if report == ReportId.EMPLOYEE_TRANSFER:
        old_dept, new_dept = Department.__table__.alias("rpt_transfer_old_department"), Department.__table__.alias("rpt_transfer_new_department")
        old_designation, new_designation = Designation.__table__.alias("rpt_transfer_old_designation"), Designation.__table__.alias("rpt_transfer_new_designation")
        clauses = [transfer.organization_id == org_id, e.organization_id == org_id]
        if filters.employee_id:
            clauses.append(e.id == filters.employee_id)
        if filters.department_id:
            clauses.append(or_(transfer.old_department_id == filters.department_id, transfer.new_department_id == filters.department_id))
        clauses.extend(_date_filters(transfer.effective_date, filters))
        if filters.search:
            term = f"%{filters.search.strip()}%"
            clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term)))
        stmt = (
            select(
                e.employee_code.label("employee_code"),
                (e.first_name + " " + e.last_name).label("employee_name"),
                transfer.effective_date.label("effective_date"),
                transfer.old_branch_id.label("from_branch_id"),
                transfer.new_branch_id.label("to_branch_id"),
                old_dept.c.name_en.label("from_department"),
                new_dept.c.name_en.label("to_department"),
                old_designation.c.title_en.label("from_designation"),
                new_designation.c.title_en.label("to_designation"),
                transfer.old_project_id.label("from_project_id"),
                transfer.new_project_id.label("to_project_id"),
                transfer.reason.label("reason"),
            )
            .join(Employee.__table__, and_(transfer.employee_id == e.id, e.organization_id == org_id))
            .outerjoin(old_dept, and_(transfer.old_department_id == old_dept.c.id, old_dept.c.organization_id == org_id))
            .outerjoin(new_dept, and_(transfer.new_department_id == new_dept.c.id, new_dept.c.organization_id == org_id))
            .outerjoin(old_designation, and_(transfer.old_designation_id == old_designation.c.id, old_designation.c.organization_id == org_id))
            .outerjoin(new_designation, and_(transfer.new_designation_id == new_designation.c.id, new_designation.c.organization_id == org_id))
            .where(*clauses)
            .order_by(transfer.effective_date.desc(), transfer.id)
        )
        rows, total = await _fetch(db, stmt, limit, offset)
        return _columns(("employee_code", "Employee ID"), ("employee_name", "Employee name"), ("effective_date", "Effective date"), ("from_branch_id", "From branch ID"), ("to_branch_id", "To branch ID"), ("from_department", "From department"), ("to_department", "To department"), ("from_designation", "From designation"), ("to_designation", "To designation"), ("from_project_id", "From project ID"), ("to_project_id", "To project ID"), ("reason", "Reason")), rows, total

    if report == ReportId.PROMOTION_INCREMENT:
        clauses = [revision.organization_id == org_id, e.organization_id == org_id]
        if filters.employee_id:
            clauses.append(e.id == filters.employee_id)
        if filters.department_id:
            clauses.append(e.department_id == filters.department_id)
        if filters.revision_type:
            clauses.append(revision.revision_type == filters.revision_type)
        if filters.status:
            clauses.append(revision.status == filters.status)
        clauses.extend(_date_filters(revision.effective_date, filters))
        if filters.search:
            term = f"%{filters.search.strip()}%"
            clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term)))
        stmt = (
            select(
                e.employee_code.label("employee_code"),
                (e.first_name + " " + e.last_name).label("employee_name"),
                revision.revision_type.label("revision_type"),
                revision.effective_date.label("effective_date"),
                revision.previous_gross.label("previous_gross"),
                revision.new_gross.label("new_gross"),
                revision.status.label("status"),
            )
            .join(Employee.__table__, and_(revision.employee_id == e.id, e.organization_id == org_id))
            .where(*clauses)
            .order_by(revision.effective_date.desc(), revision.id)
        )
        rows, total = await _fetch(db, stmt, limit, offset)
        return _columns(("employee_code", "Employee ID"), ("employee_name", "Employee name"), ("revision_type", "Revision type"), ("effective_date", "Effective date"), ("previous_gross", "Previous gross (BDT)"), ("new_gross", "New gross (BDT)"), ("status", "Status")), rows, total

    if report == ReportId.DOCUMENT_EXPIRY:
        stmt = select(*Employee.__table__.columns).where(*_employee_clauses(org_id, filters)).order_by(e.employee_code)
        employees = (await db.execute(stmt)).mappings().all()
        docs = []
        today = date.today()
        for employee in employees:
            name = f"{employee.first_name} {employee.last_name}".strip()
            items = list(employee.documents or [])
            if employee.passport_expiry_date:
                items.append({"document_type": "Passport", "expiry_date": employee.passport_expiry_date.isoformat()})
            for doc in items:
                if not isinstance(doc, dict) or not doc.get("expiry_date"):
                    continue
                try:
                    expiry = date.fromisoformat(str(doc["expiry_date"])[:10])
                except ValueError:
                    continue
                if filters.start_date and expiry < filters.start_date:
                    continue
                if filters.end_date and expiry > filters.end_date:
                    continue
                if filters.document_type and str(doc.get("document_type", "")) != filters.document_type:
                    continue
                if filters.search and filters.search.lower() not in f"{employee.employee_code} {name} {doc.get('document_type', '')}".lower():
                    continue
                docs.append({
                    "employee_code": employee.employee_code,
                    "employee_name": name,
                    "document_type": str(doc.get("document_type", "Document")),
                    "expiry_date": expiry,
                    "expiry_status": "EXPIRED" if expiry < today else "DUE SOON" if (expiry - today).days <= 90 else "CURRENT",
                })
        docs.sort(key=lambda item: (item["expiry_date"], item["employee_code"]))
        return _columns(("employee_code", "Employee ID"), ("employee_name", "Employee name"), ("document_type", "Document type"), ("expiry_date", "Expiry date"), ("expiry_status", "Expiry status")), docs[offset:offset + limit], len(docs)

    if report == ReportId.RECRUITMENT:
        req = RecruitmentRecord.__table__.alias("rpt_recruitment_requisition")
        cand = RecruitmentRecord.__table__.alias("rpt_recruitment_candidate")
        clauses = [recruitment.organization_id == org_id]
        if filters.status:
            clauses.append(recruitment.status == filters.status)
        if filters.recruitment_type:
            clauses.append(recruitment.record_type == filters.recruitment_type)
        clauses.extend(_date_filters(recruitment.created_at, filters))
        if filters.search:
            term = f"%{filters.search.strip()}%"
            clauses.append(or_(recruitment.code.ilike(term), recruitment.title.ilike(term), recruitment.department.ilike(term)))
        record_stmt = (
            select(
                recruitment.code.label("reference"),
                recruitment.record_type.label("record_type"),
                recruitment.title.label("title"),
                recruitment.department.label("department"),
                recruitment.status.label("status"),
                recruitment.created_at.label("created_at"),
            )
            .where(*clauses)
        )
        fetch_count = min(max(limit + offset, limit), 10_000)
        record_rows, record_total = await _fetch(db, record_stmt.order_by(recruitment.created_at.desc()), fetch_count, 0)
        app_stmt = (
            select(
                cand.c.code.label("reference"),
                literal("application").label("record_type"),
                cand.c.title.label("title"),
                req.c.department.label("department"),
                application.stage.label("status"),
                application.created_at.label("created_at"),
            )
            .join(req, and_(application.requisition_id == req.c.id, req.c.organization_id == org_id))
            .join(cand, and_(application.candidate_id == cand.c.id, cand.c.organization_id == org_id))
            .where(application.organization_id == org_id)
        )
        if filters.status:
            app_stmt = app_stmt.where(application.stage == filters.status)
        if filters.search:
            term = f"%{filters.search.strip()}%"
            app_stmt = app_stmt.where(or_(cand.c.code.ilike(term), cand.c.title.ilike(term), req.c.title.ilike(term)))
        app_stmt = app_stmt.where(*_date_filters(application.created_at, filters))
        app_rows, app_total = await _fetch(db, app_stmt.order_by(application.created_at.desc()), fetch_count, 0)
        all_rows = sorted(record_rows + app_rows, key=lambda item: str(item.get("created_at") or ""), reverse=True)
        return _columns(("reference", "Reference"), ("record_type", "Pipeline record"), ("title", "Title / candidate"), ("department", "Department"), ("status", "Status / stage"), ("created_at", "Created")), all_rows[offset:offset + limit], record_total + app_total

    if report == ReportId.EMPLOYEE_TURNOVER:
        start = filters.start_date or date(date.today().year, 1, 1)
        end = filters.end_date or date.today()
        employee_stmt = select(e.id, e.joining_date, e.status, e.department_id, e.designation_id, e.employment_type).where(e.organization_id == org_id)
        if filters.company_id:
            employee_stmt = employee_stmt.where(e.company_id == filters.company_id)
        if filters.branch_id:
            employee_stmt = employee_stmt.where(e.branch_id == filters.branch_id)
        if filters.department_id:
            employee_stmt = employee_stmt.where(e.department_id == filters.department_id)
        if filters.designation_id:
            employee_stmt = employee_stmt.where(e.designation_id == filters.designation_id)
        if filters.status:
            employee_stmt = employee_stmt.where(e.status == filters.status)
        if filters.employment_type:
            employee_stmt = employee_stmt.where(e.employment_type == filters.employment_type)
        employees = (await db.execute(employee_stmt)).all()
        separation_stmt = (
            select(sep.employee_id, sep.last_working_day, sep.submission_date, e.company_id)
            .select_from(EmployeeSeparation.__table__)
            .join(Employee.__table__, and_(sep.employee_id == e.id, e.organization_id == org_id))
            .where(sep.organization_id == org_id)
        )
        if filters.company_id:
            separation_stmt = separation_stmt.where(e.company_id == filters.company_id)
        separations = (await db.execute(separation_stmt)).all()
        exit_dates = {}
        for employee_id, last_day, submitted, _company_id in separations:
            exit_dates[employee_id] = last_day or submitted
        missing_separation_dates = any(
            status in {"RESIGNED", "TERMINATED", "RETIRED"} and employee_id not in exit_dates
            for employee_id, _joining_date, status, _department_id, _designation_id, _employment_type in employees
        )
        output = []
        cursor = date(start.year, start.month, 1)
        while cursor <= end:
            month_end = date(cursor.year, cursor.month, monthrange(cursor.year, cursor.month)[1])
            period_start, period_end = max(cursor, start), min(month_end, end)
            exits = sum(
                1 for employee_id, exit_date in exit_dates.items()
                if period_start <= exit_date <= period_end
            )
            start_count = 0
            end_count = 0
            for employee_id, joining_date, status, _department_id, _designation_id, _employment_type in employees:
                exit_date = exit_dates.get(employee_id)
                if status in {"RESIGNED", "TERMINATED", "RETIRED"} and exit_date is None:
                    continue
                if joining_date < period_start and (exit_date is None or exit_date >= period_start):
                    start_count += 1
                if joining_date <= period_end and (exit_date is None or exit_date > period_end):
                    end_count += 1
            average = None if missing_separation_dates else (start_count + end_count) / 2
            output.append({
                "period": cursor.strftime("%Y-%m"),
                "separations": exits,
                "opening_headcount": start_count,
                "closing_headcount": end_count,
                "average_headcount": average,
                "turnover_rate": turnover_rate(exits, average),
                "method": "Incomplete separation history" if missing_separation_dates else "Reconstructed from employee joining dates and persisted separation dates",
            })
            cursor = date(cursor.year + (cursor.month == 12), 1 if cursor.month == 12 else cursor.month + 1, 1)
        output = [row for row in output if (not filters.search or filters.search.lower() in row["period"].lower())]
        return _columns(("period", "Month"), ("separations", "Exits"), ("opening_headcount", "Opening headcount"), ("closing_headcount", "Closing headcount"), ("average_headcount", "Average headcount"), ("turnover_rate", "Turnover rate (%)"), ("method", "Calculation basis")), output[offset:offset + limit], len(output)

    if report == ReportId.MANPOWER_ALLOCATION:
        clauses = [allocation.organization_id == org_id, e.organization_id == org_id]
        if filters.employee_id:
            clauses.append(e.id == filters.employee_id)
        if filters.project_id:
            clauses.append(allocation.project_id == filters.project_id)
        if filters.cost_center:
            clauses.append(allocation.cost_center == filters.cost_center)
        if filters.department_id:
            clauses.append(e.department_id == filters.department_id)
        if filters.period_code:
            clauses.append(period.period_code == filters.period_code)
        if filters.status:
            clauses.append(allocation.status == filters.status)
        if filters.search:
            term = f"%{filters.search.strip()}%"
            clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term), project.c.project_name.ilike(term)))
        stmt = (
            select(
                period.period_code.label("period"),
                e.employee_code.label("employee_code"),
                (e.first_name + " " + e.last_name).label("employee_name"),
                project.c.project_name.label("project"),
                tower.tower_name.label("tower"),
                allocation.cost_center.label("cost_center"),
                allocation.allocation_percent.label("allocation_percent"),
                allocation.allocated_amount.label("allocated_amount"),
                allocation.status.label("status"),
            )
            .join(Employee.__table__, and_(allocation.employee_id == e.id, e.organization_id == org_id))
            .join(project, allocation.project_id == project.c.id)
            .outerjoin(Tower.__table__, and_(allocation.tower_id == tower.id, tower.project_id == project.c.id))
            .join(PayrollPeriod.__table__, and_(allocation.payroll_period_id == period.id, period.organization_id == org_id))
            .where(*clauses)
            .order_by(period.period_code.desc(), e.employee_code)
        )
        rows, total = await _fetch(db, stmt, limit, offset)
        return _columns(("period", "Payroll period"), ("employee_code", "Employee ID"), ("employee_name", "Employee name"), ("project", "Project"), ("tower", "Tower / site"), ("cost_center", "Cost centre"), ("allocation_percent", "Allocation (%)"), ("allocated_amount", "Allocated (BDT)"), ("status", "Status")), rows, total

    if report == ReportId.EMPLOYEE_LOAN_ADVANCE:
        loan_stmt = (
            select(
                e.employee_code.label("employee_code"),
                func.concat(e.first_name, " ", e.last_name).label("employee_name"),
                loan.loan_code.label("reference"),
                loan.loan_type.label("type"),
                loan.principal_amount.label("approved_amount"),
                loan.recovered_amount.label("recovered_amount"),
                loan.remaining_balance.label("outstanding_balance"),
                loan.disbursement_date.label("date"),
                loan.status.label("status"),
            )
            .join(Employee.__table__, and_(loan.employee_id == e.id, e.organization_id == org_id))
            .where(loan.organization_id == org_id)
        )
        advance_stmt = (
            select(
                e.employee_code.label("employee_code"),
                (e.first_name + " " + e.last_name).label("employee_name"),
                (literal("ADV-") + func.cast(advance.id, String)).label("reference"),
                literal("SALARY_ADVANCE").label("type"),
                advance.advance_amount.label("approved_amount"),
                advance.recovered_amount.label("recovered_amount"),
                case(
                    (advance.advance_amount > advance.recovered_amount, advance.advance_amount - advance.recovered_amount),
                    else_=0,
                ).label("outstanding_balance"),
                advance.requested_date.label("date"),
                advance.status.label("status"),
            )
            .join(Employee.__table__, and_(advance.employee_id == e.id, e.organization_id == org_id))
            .where(advance.organization_id == org_id, advance.status.in_(("APPROVED", "RECOVERED")))
        )
        if filters.employee_id:
            loan_stmt = loan_stmt.where(e.id == filters.employee_id)
            advance_stmt = advance_stmt.where(e.id == filters.employee_id)
        if filters.status:
            loan_stmt = loan_stmt.where(loan.status == filters.status)
            advance_stmt = advance_stmt.where(advance.status == filters.status)
        if filters.search:
            term = f"%{filters.search.strip()}%"
            loan_stmt = loan_stmt.where(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term), loan.loan_code.ilike(term)))
            advance_stmt = advance_stmt.where(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term)))
        loan_stmt = loan_stmt.where(*_date_filters(loan.disbursement_date, filters))
        advance_stmt = advance_stmt.where(*_date_filters(advance.requested_date, filters))
        loan_rows = [dict(row) for row in (await db.execute(loan_stmt)).mappings().all()]
        advance_rows = [dict(row) for row in (await db.execute(advance_stmt)).mappings().all()]
        combined = sorted(loan_rows + advance_rows, key=lambda row: str(row["date"]), reverse=True)
        return _columns(("employee_code", "Employee ID"), ("employee_name", "Employee name"), ("reference", "Reference"), ("type", "Type"), ("approved_amount", "Approved (BDT)"), ("recovered_amount", "Recovered (BDT)"), ("outstanding_balance", "Outstanding (BDT)"), ("date", "Date"), ("status", "Status")), combined[offset:offset + limit], len(combined)

    # 2. ATTENDANCE REPORTS
    if str(report.value).startswith("attendance-"):
        clauses = [att.organization_id == org_id, e.organization_id == org_id]
        if filters.employee_id:
            clauses.append(e.id == filters.employee_id)
        if filters.department_id:
            clauses.append(e.department_id == filters.department_id)
        if filters.project_id:
            clauses.append(or_(att.geofence_site_id == filters.project_id, e.assigned_project_id == filters.project_id))
        if filters.shift_id:
            clauses.append(att.shift_id == filters.shift_id)
        if filters.status:
            clauses.append(att.status == filters.status)
        if filters.search:
            term = f"%{filters.search.strip()}%"
            clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term)))
        clauses.extend(_date_filters(att.punch_date, filters))

        if report == ReportId.ATTENDANCE_LATE_ARRIVAL:
            clauses.append(or_(att.late_minutes > 0, att.status == "LATE"))
        elif report == ReportId.ATTENDANCE_EARLY_DEPARTURE:
            clauses.append(att.early_leaving_minutes > 0)
        elif report == ReportId.ATTENDANCE_ABSENTEEISM:
            clauses.append(att.status == "ABSENT")
        elif report == ReportId.ATTENDANCE_MISSING_PUNCH:
            clauses.append(or_(att.is_missing_punch.is_(True), att.clock_in.is_(None), att.clock_out.is_(None)))
        elif report == ReportId.ATTENDANCE_OVERTIME:
            clauses.append(att.overtime_hours > 0)
        elif report == ReportId.ATTENDANCE_BIOMETRIC:
            clauses.append(att.source.in_(("BIOMETRIC_DEVICE", "DEVICE")))
        elif report == ReportId.ATTENDANCE_MOBILE_GPS:
            clauses.append(att.source == "GPS_MOBILE")
        elif report == ReportId.ATTENDANCE_EXCEPTION:
            clauses.append(or_(att.is_anomaly.is_(True), att.is_missing_punch.is_(True), att.late_minutes >= 60))

        if report == ReportId.ATTENDANCE_CORRECTION:
            c_clauses = [att_corr.organization_id == org_id, e.organization_id == org_id]
            if filters.employee_id:
                c_clauses.append(e.id == filters.employee_id)
            if filters.status:
                c_clauses.append(att_corr.status == filters.status)
            if filters.search:
                term = f"%{filters.search.strip()}%"
                c_clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term)))
            c_clauses.extend(_date_filters(att_corr.punch_date, filters))
            stmt = (
                select(
                    att_corr.punch_date.label("punch_date"),
                    e.employee_code.label("employee_code"),
                    (e.first_name + " " + e.last_name).label("employee_name"),
                    func.date_format(att_corr.requested_clock_in, "%H:%i").label("requested_clock_in"),
                    func.date_format(att_corr.requested_clock_out, "%H:%i").label("requested_clock_out"),
                    att_corr.reason.label("reason"),
                    att_corr.status.label("status"),
                )
                .join(Employee.__table__, and_(att_corr.employee_id == e.id, e.organization_id == org_id))
                .where(*c_clauses)
                .order_by(att_corr.punch_date.desc(), e.employee_code)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("punch_date", "Date"),
                ("employee_code", "Employee ID"),
                ("employee_name", "Employee Name"),
                ("requested_clock_in", "Requested In"),
                ("requested_clock_out", "Requested Out"),
                ("reason", "Reason"),
                ("status", "Status"),
            ), rows, total

        if report == ReportId.ATTENDANCE_MONTHLY_SUMMARY:
            month_expr = func.date_format(att.punch_date, "%Y-%m")
            stmt = (
                select(
                    month_expr.label("period"),
                    e.employee_code.label("employee_code"),
                    (e.first_name + " " + e.last_name).label("employee_name"),
                    d.c.name_en.label("department"),
                    func.sum(case((att.status == "PRESENT", 1), else_=0)).label("present_days"),
                    func.sum(case((att.status == "LATE", 1), else_=0)).label("late_days"),
                    func.sum(case((att.status == "ABSENT", 1), else_=0)).label("absent_days"),
                    func.sum(case((att.status == "ON_LEAVE", 1), else_=0)).label("leave_days"),
                    func.coalesce(func.sum(att.working_hours), 0).label("total_working_hours"),
                    func.coalesce(func.sum(att.overtime_hours), 0).label("total_ot_hours"),
                )
                .join(Employee.__table__, and_(att.employee_id == e.id, e.organization_id == org_id))
                .outerjoin(d, e.department_id == d.c.id)
                .where(*clauses)
                .group_by(month_expr, e.employee_code, e.first_name, e.last_name, d.c.name_en)
                .order_by(month_expr.desc(), e.employee_code)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("period", "Month"),
                ("employee_code", "Employee ID"),
                ("employee_name", "Employee Name"),
                ("department", "Department"),
                ("present_days", "Present Days"),
                ("late_days", "Late Days"),
                ("absent_days", "Absent Days"),
                ("leave_days", "Leave Days"),
                ("total_working_hours", "Working Hours"),
                ("total_ot_hours", "OT Hours"),
            ), rows, total

        selected = [
            att.punch_date.label("punch_date"),
            e.employee_code.label("employee_code"),
            (e.first_name + " " + e.last_name).label("employee_name"),
            d.c.name_en.label("department"),
            shift_tbl.shift_name.label("shift_name"),
            func.date_format(att.clock_in, "%H:%i").label("clock_in"),
            func.date_format(att.clock_out, "%H:%i").label("clock_out"),
            att.working_hours.label("working_hours"),
            att.late_minutes.label("late_minutes"),
            att.early_leaving_minutes.label("early_leaving_minutes"),
            att.overtime_hours.label("overtime_hours"),
            att.status.label("status"),
            att.source.label("source"),
            att.is_missing_punch.label("is_missing_punch"),
            project.c.project_name.label("site_project"),
        ]
        stmt = (
            select(*selected)
            .join(Employee.__table__, and_(att.employee_id == e.id, e.organization_id == org_id))
            .outerjoin(d, e.department_id == d.c.id)
            .outerjoin(shift_tbl, att.shift_id == shift_tbl.id)
            .outerjoin(project, or_(att.geofence_site_id == project.c.id, e.assigned_project_id == project.c.id))
            .where(*clauses)
            .order_by(att.punch_date.desc(), e.employee_code)
        )
        rows, total = await _fetch(db, stmt, limit, offset)
        return _columns(
            ("punch_date", "Date"),
            ("employee_code", "Employee ID"),
            ("employee_name", "Employee Name"),
            ("department", "Department"),
            ("shift_name", "Shift"),
            ("clock_in", "Clock In"),
            ("clock_out", "Clock Out"),
            ("working_hours", "Work (Hrs)"),
            ("late_minutes", "Late (Mins)"),
            ("early_leaving_minutes", "Early (Mins)"),
            ("overtime_hours", "OT (Hrs)"),
            ("status", "Status"),
            ("source", "Source"),
            ("site_project", "Project / Site"),
        ), rows, total

    # 3. LEAVE REPORTS
    if str(report.value).startswith("leave-"):
        if report == ReportId.LEAVE_BALANCE:
            b_clauses = [l_bal.organization_id == org_id, e.organization_id == org_id]
            if filters.employee_id:
                b_clauses.append(e.id == filters.employee_id)
            if filters.department_id:
                b_clauses.append(e.department_id == filters.department_id)
            if filters.leave_type_id:
                b_clauses.append(l_bal.leave_type_id == filters.leave_type_id)
            if filters.search:
                term = f"%{filters.search.strip()}%"
                b_clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term)))
            stmt = (
                select(
                    l_bal.year.label("year"),
                    e.employee_code.label("employee_code"),
                    (e.first_name + " " + e.last_name).label("employee_name"),
                    d.c.name_en.label("department"),
                    l_typ.name_en.label("leave_type"),
                    l_bal.opening_balance.label("opening_balance"),
                    l_bal.carried_forward.label("carried_forward"),
                    l_bal.accrued_days.label("accrued_days"),
                    l_bal.used_days.label("used_days"),
                    l_bal.pending_days.label("pending_days"),
                    l_bal.available_days.label("available_days"),
                    l_bal.encashed_days.label("encashed_days"),
                )
                .join(Employee.__table__, and_(l_bal.employee_id == e.id, e.organization_id == org_id))
                .outerjoin(d, e.department_id == d.c.id)
                .join(LeaveType.__table__, l_bal.leave_type_id == l_typ.id)
                .where(*b_clauses)
                .order_by(l_bal.year.desc(), e.employee_code)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("year", "Year"),
                ("employee_code", "Employee ID"),
                ("employee_name", "Employee Name"),
                ("department", "Department"),
                ("leave_type", "Leave Type"),
                ("opening_balance", "Opening"),
                ("carried_forward", "Carried Fwd"),
                ("accrued_days", "Accrued"),
                ("used_days", "Used"),
                ("pending_days", "Pending"),
                ("available_days", "Available"),
                ("encashed_days", "Encashed"),
            ), rows, total

        if report == ReportId.LEAVE_ENCASHMENT:
            enc_clauses = [l_enc.organization_id == org_id, e.organization_id == org_id]
            if filters.employee_id:
                enc_clauses.append(e.id == filters.employee_id)
            if filters.status:
                enc_clauses.append(l_enc.status == filters.status)
            if filters.search:
                term = f"%{filters.search.strip()}%"
                enc_clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term)))
            stmt = (
                select(
                    e.employee_code.label("employee_code"),
                    (e.first_name + " " + e.last_name).label("employee_name"),
                    d.c.name_en.label("department"),
                    l_typ.name_en.label("leave_type"),
                    l_enc.encashment_days.label("encashment_days"),
                    l_enc.daily_rate.label("daily_rate"),
                    l_enc.total_amount.label("total_amount"),
                    l_enc.status.label("status"),
                )
                .join(Employee.__table__, and_(l_enc.employee_id == e.id, e.organization_id == org_id))
                .outerjoin(d, e.department_id == d.c.id)
                .join(LeaveType.__table__, l_enc.leave_type_id == l_typ.id)
                .where(*enc_clauses)
                .order_by(e.employee_code)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("employee_code", "Employee ID"),
                ("employee_name", "Employee Name"),
                ("department", "Department"),
                ("leave_type", "Leave Type"),
                ("encashment_days", "Encashed Days"),
                ("daily_rate", "Daily Rate (BDT)"),
                ("total_amount", "Total Paid (BDT)"),
                ("status", "Status"),
            ), rows, total

        l_clauses = [l_app.organization_id == org_id, e.organization_id == org_id]
        if filters.employee_id:
            l_clauses.append(e.id == filters.employee_id)
        if filters.department_id:
            l_clauses.append(e.department_id == filters.department_id)
        if filters.project_id:
            l_clauses.append(e.assigned_project_id == filters.project_id)
        if filters.status:
            l_clauses.append(l_app.status == filters.status)
        if filters.search:
            term = f"%{filters.search.strip()}%"
            l_clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term), l_app.leave_type.ilike(term)))
        l_clauses.extend(_date_filters(l_app.start_date, filters))

        if report == ReportId.LEAVE_APPROVED:
            l_clauses.append(l_app.status == "APPROVED")
        elif report == ReportId.LEAVE_PENDING:
            l_clauses.append(l_app.status == "PENDING")
        elif report == ReportId.LEAVE_UNPAID:
            l_clauses.append(or_(l_app.leave_type == "UNPAID", l_app.leave_type.ilike("%UNPAID%")))
        elif report == ReportId.LEAVE_CANCELLATION:
            l_clauses.append(l_app.status == "CANCELLED")

        stmt = (
            select(
                l_app.id.label("application_id"),
                e.employee_code.label("employee_code"),
                (e.first_name + " " + e.last_name).label("employee_name"),
                d.c.name_en.label("department"),
                project.c.project_name.label("project_name"),
                l_app.leave_type.label("leave_type"),
                l_app.start_date.label("start_date"),
                l_app.end_date.label("end_date"),
                l_app.total_days.label("total_days"),
                l_app.reason.label("reason"),
                l_app.status.label("status"),
            )
            .join(Employee.__table__, and_(l_app.employee_id == e.id, e.organization_id == org_id))
            .outerjoin(d, e.department_id == d.c.id)
            .outerjoin(project, e.assigned_project_id == project.c.id)
            .where(*l_clauses)
            .order_by(l_app.start_date.desc(), e.employee_code)
        )
        rows, total = await _fetch(db, stmt, limit, offset)
        return _columns(
            ("application_id", "App Ref"),
            ("employee_code", "Employee ID"),
            ("employee_name", "Employee Name"),
            ("department", "Department"),
            ("project_name", "Project"),
            ("leave_type", "Leave Type"),
            ("start_date", "From Date"),
            ("end_date", "To Date"),
            ("total_days", "Days"),
            ("reason", "Reason"),
            ("status", "Status"),
        ), rows, total

    # 4. PAYROLL REPORTS
    if str(report.value).startswith("payroll-") or report in {
        ReportId.PAYROLL_REGISTER,
        ReportId.PAYROLL_MONTHLY_REGISTER,
        ReportId.SALARY_SHEET,
        ReportId.PAYSLIP_REGISTER,
        ReportId.BANK_DISBURSEMENT,
        ReportId.BANK_SALARY_TRANSFER,
    }:
        clauses = [payslip.organization_id == org_id, e.organization_id == org_id, period.organization_id == org_id]
        if filters.employee_id:
            clauses.append(e.id == filters.employee_id)
        if filters.department_id:
            clauses.append(e.department_id == filters.department_id)
        if filters.period_code:
            clauses.append(period.period_code == filters.period_code)
        if filters.status:
            clauses.append(payslip.status == filters.status)
        if filters.search:
            term = f"%{filters.search.strip()}%"
            clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term)))
        clauses.extend(_date_filters(period.start_date, filters))

        if report in {ReportId.BANK_DISBURSEMENT, ReportId.BANK_SALARY_TRANSFER}:
            selected = [
                period.period_code.label("period"),
                e.employee_code.label("employee_code"),
                (e.first_name + " " + e.last_name).label("employee_name"),
                d.c.name_en.label("department"),
                payslip.bank_name.label("bank_name"),
                payslip.bank_account_no.label("bank_account_no"),
                payslip.net_salary_payable.label("net_salary"),
                payslip.payment_method.label("payment_method"),
                payslip.is_disbursed.label("is_disbursed"),
                payslip.status.label("status"),
            ]
            stmt = (
                select(*selected)
                .join(Employee.__table__, and_(payslip.employee_id == e.id, e.organization_id == org_id))
                .outerjoin(d, e.department_id == d.c.id)
                .join(PayrollPeriod.__table__, and_(payslip.period_id == period.id, period.organization_id == org_id))
                .where(*clauses)
                .order_by(period.start_date.desc(), e.employee_code)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("period", "Payroll Period"),
                ("employee_code", "Employee ID"),
                ("employee_name", "Employee Name"),
                ("department", "Department"),
                ("bank_name", "Bank"),
                ("bank_account_no", "Account No"),
                ("net_salary", "Net Pay (BDT)"),
                ("payment_method", "Payment Method"),
                ("is_disbursed", "Disbursed"),
                ("status", "Status"),
            ), rows, total

        if report == ReportId.PAYROLL_SUMMARY:
            stmt = (
                select(
                    period.period_code.label("period"),
                    period.period_name.label("period_name"),
                    func.count(payslip.id).label("employee_count"),
                    func.sum(payslip.basic_salary).label("total_basic"),
                    func.sum(payslip.overtime_amount).label("total_ot"),
                    func.sum(payslip.bonus_amount).label("total_bonus"),
                    func.sum(payslip.gross_salary).label("total_gross"),
                    func.sum(payslip.total_deductions).label("total_deductions"),
                    func.sum(payslip.net_salary_payable).label("total_net"),
                )
                .join(PayrollPeriod.__table__, and_(payslip.period_id == period.id, period.organization_id == org_id))
                .join(Employee.__table__, and_(payslip.employee_id == e.id, e.organization_id == org_id))
                .where(*clauses)
                .group_by(period.period_code, period.period_name)
                .order_by(period.period_code.desc())
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("period", "Period Code"),
                ("period_name", "Period Name"),
                ("employee_count", "Employees"),
                ("total_basic", "Total Basic (BDT)"),
                ("total_ot", "Total OT (BDT)"),
                ("total_bonus", "Total Bonus (BDT)"),
                ("total_gross", "Gross Salary (BDT)"),
                ("total_deductions", "Deductions (BDT)"),
                ("total_net", "Net Payable (BDT)"),
            ), rows, total

        if report == ReportId.PAYROLL_DEPARTMENT_WISE:
            stmt = (
                select(
                    period.period_code.label("period"),
                    d.c.name_en.label("department"),
                    func.count(payslip.id).label("employee_count"),
                    func.sum(payslip.gross_salary).label("total_gross"),
                    func.sum(payslip.total_deductions).label("total_deductions"),
                    func.sum(payslip.net_salary_payable).label("total_net"),
                )
                .join(Employee.__table__, and_(payslip.employee_id == e.id, e.organization_id == org_id))
                .outerjoin(d, e.department_id == d.c.id)
                .join(PayrollPeriod.__table__, and_(payslip.period_id == period.id, period.organization_id == org_id))
                .where(*clauses)
                .group_by(period.period_code, d.c.name_en)
                .order_by(period.period_code.desc(), d.c.name_en)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("period", "Period"),
                ("department", "Department"),
                ("employee_count", "Employees"),
                ("total_gross", "Gross Salary (BDT)"),
                ("total_deductions", "Total Deductions (BDT)"),
                ("total_net", "Net Payable (BDT)"),
            ), rows, total

        if report == ReportId.PAYROLL_BONUS:
            b_clauses = [bonus_inc.organization_id == org_id, e.organization_id == org_id]
            if filters.employee_id:
                b_clauses.append(e.id == filters.employee_id)
            if filters.period_code:
                b_clauses.append(bonus_inc.period_code == filters.period_code)
            if filters.status:
                b_clauses.append(bonus_inc.status == filters.status)
            if filters.search:
                term = f"%{filters.search.strip()}%"
                b_clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term)))
            stmt = (
                select(
                    bonus_inc.period_code.label("period"),
                    e.employee_code.label("employee_code"),
                    (e.first_name + " " + e.last_name).label("employee_name"),
                    d.c.name_en.label("department"),
                    bonus_inc.bonus_type.label("bonus_type"),
                    bonus_inc.bonus_amount.label("bonus_amount"),
                    bonus_inc.is_taxable.label("is_taxable"),
                    bonus_inc.status.label("status"),
                )
                .join(Employee.__table__, and_(bonus_inc.employee_id == e.id, e.organization_id == org_id))
                .outerjoin(d, e.department_id == d.c.id)
                .where(*b_clauses)
                .order_by(bonus_inc.period_code.desc(), e.employee_code)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("period", "Payroll Period"),
                ("employee_code", "Employee ID"),
                ("employee_name", "Employee Name"),
                ("department", "Department"),
                ("bonus_type", "Bonus Type"),
                ("bonus_amount", "Bonus Amount (BDT)"),
                ("is_taxable", "Taxable"),
                ("status", "Status"),
            ), rows, total

        if report == ReportId.PAYROLL_OVERTIME_PAYMENT:
            ot_clauses = [ot_req.organization_id == org_id, e.organization_id == org_id]
            if filters.employee_id:
                ot_clauses.append(e.id == filters.employee_id)
            if filters.project_id:
                ot_clauses.append(ot_req.project_id == filters.project_id)
            if filters.status:
                ot_clauses.append(ot_req.status == filters.status)
            if filters.search:
                term = f"%{filters.search.strip()}%"
                ot_clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term)))
            ot_clauses.extend(_date_filters(ot_req.ot_date, filters))
            stmt = (
                select(
                    ot_req.ot_date.label("ot_date"),
                    e.employee_code.label("employee_code"),
                    (e.first_name + " " + e.last_name).label("employee_name"),
                    project.c.project_name.label("project_name"),
                    ot_req.ot_type.label("ot_type"),
                    ot_req.requested_hours.label("requested_hours"),
                    ot_req.approved_hours.label("approved_hours"),
                    ot_req.calculated_amount.label("calculated_amount"),
                    ot_req.status.label("status"),
                )
                .join(Employee.__table__, and_(ot_req.employee_id == e.id, e.organization_id == org_id))
                .outerjoin(project, ot_req.project_id == project.c.id)
                .where(*ot_clauses)
                .order_by(ot_req.ot_date.desc(), e.employee_code)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("ot_date", "OT Date"),
                ("employee_code", "Employee ID"),
                ("employee_name", "Employee Name"),
                ("project_name", "Project"),
                ("ot_type", "OT Type"),
                ("requested_hours", "Requested (Hrs)"),
                ("approved_hours", "Approved (Hrs)"),
                ("calculated_amount", "Payable Amount (BDT)"),
                ("status", "Status"),
            ), rows, total

        if report == ReportId.PAYROLL_DEDUCTION:
            selected = [
                period.period_code.label("period"),
                e.employee_code.label("employee_code"),
                (e.first_name + " " + e.last_name).label("employee_name"),
                payslip.tax_deduction.label("tax_deduction"),
                payslip.provident_fund_deduction.label("pf_deduction"),
                payslip.loan_deduction.label("loan_deduction"),
                payslip.salary_advance_deduction.label("advance_deduction"),
                payslip.total_deductions.label("total_deductions"),
                payslip.status.label("status"),
            ]
            stmt = (
                select(*selected)
                .join(Employee.__table__, and_(payslip.employee_id == e.id, e.organization_id == org_id))
                .join(PayrollPeriod.__table__, and_(payslip.period_id == period.id, period.organization_id == org_id))
                .where(*clauses)
                .order_by(period.start_date.desc(), e.employee_code)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("period", "Payroll Period"),
                ("employee_code", "Employee ID"),
                ("employee_name", "Employee Name"),
                ("tax_deduction", "Tax (BDT)"),
                ("pf_deduction", "Provident Fund (BDT)"),
                ("loan_deduction", "Loan Recovery (BDT)"),
                ("advance_deduction", "Salary Advance (BDT)"),
                ("total_deductions", "Total Deductions (BDT)"),
                ("status", "Status"),
            ), rows, total

        selected = [
            period.period_code.label("period"),
            e.employee_code.label("employee_code"),
            (e.first_name + " " + e.last_name).label("employee_name"),
            ds.c.title_en.label("designation"),
            d.c.name_en.label("department"),
            payslip.basic_salary.label("basic_salary"),
            payslip.house_rent_allowance.label("house_rent"),
            payslip.medical_allowance.label("medical"),
            payslip.conveyance_allowance.label("conveyance"),
            payslip.overtime_amount.label("overtime"),
            payslip.bonus_amount.label("bonus"),
            payslip.gross_salary.label("gross_salary"),
            payslip.total_deductions.label("total_deductions"),
            payslip.net_salary_payable.label("net_salary"),
            payslip.status.label("status"),
        ]
        stmt = (
            select(*selected)
            .join(Employee.__table__, and_(payslip.employee_id == e.id, e.organization_id == org_id))
            .outerjoin(ds, e.designation_id == ds.c.id)
            .outerjoin(d, e.department_id == d.c.id)
            .join(PayrollPeriod.__table__, and_(payslip.period_id == period.id, period.organization_id == org_id))
            .where(*clauses)
            .order_by(period.start_date.desc(), e.employee_code)
        )
        rows, total = await _fetch(db, stmt, limit, offset)
        return _columns(
            ("period", "Payroll Period"),
            ("employee_code", "Employee ID"),
            ("employee_name", "Employee Name"),
            ("designation", "Designation"),
            ("department", "Department"),
            ("basic_salary", "Basic (BDT)"),
            ("house_rent", "House Rent (BDT)"),
            ("medical", "Medical (BDT)"),
            ("conveyance", "Conveyance (BDT)"),
            ("overtime", "Overtime (BDT)"),
            ("bonus", "Bonus (BDT)"),
            ("gross_salary", "Gross (BDT)"),
            ("total_deductions", "Deductions (BDT)"),
            ("net_salary", "Net Pay (BDT)"),
            ("status", "Status"),
        ), rows, total

    # 5. PROJECT-WISE LABOUR COST REPORTS
    if str(report.value).startswith("labour-"):
        clauses = [allocation.organization_id == org_id, e.organization_id == org_id]
        if filters.employee_id:
            clauses.append(e.id == filters.employee_id)
        if filters.project_id:
            clauses.append(allocation.project_id == filters.project_id)
        if filters.tower_id:
            clauses.append(allocation.tower_id == filters.tower_id)
        if filters.cost_center:
            clauses.append(allocation.cost_center == filters.cost_center)
        if filters.period_code:
            clauses.append(period.period_code == filters.period_code)
        if filters.status:
            clauses.append(allocation.status == filters.status)
        if filters.search:
            term = f"%{filters.search.strip()}%"
            clauses.append(or_(e.employee_code.ilike(term), e.first_name.ilike(term), e.last_name.ilike(term), project.c.project_name.ilike(term)))

        if report == ReportId.LABOUR_TOWER_SITE:
            stmt = (
                select(
                    period.period_code.label("period"),
                    project.c.project_name.label("project_name"),
                    func.coalesce(tower.tower_name, "General Site").label("tower_name"),
                    func.count(allocation.id).label("allocated_staff"),
                    func.sum(allocation.allocated_amount).label("total_labour_cost"),
                    allocation.status.label("status"),
                )
                .join(Employee.__table__, and_(allocation.employee_id == e.id, e.organization_id == org_id))
                .join(project, allocation.project_id == project.c.id)
                .outerjoin(Tower.__table__, and_(allocation.tower_id == tower.id, tower.project_id == project.c.id))
                .join(PayrollPeriod.__table__, and_(allocation.payroll_period_id == period.id, period.organization_id == org_id))
                .where(*clauses)
                .group_by(period.period_code, project.c.project_name, tower.tower_name, allocation.status)
                .order_by(period.period_code.desc(), project.c.project_name)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("period", "Payroll Period"),
                ("project_name", "Project"),
                ("tower_name", "Tower / Sub-site"),
                ("allocated_staff", "Allocated Staff"),
                ("total_labour_cost", "Labour Cost (BDT)"),
                ("status", "Status"),
            ), rows, total

        if report == ReportId.LABOUR_WBS_ACTIVITY:
            stmt = (
                select(
                    period.period_code.label("period"),
                    project.c.project_name.label("project_name"),
                    func.coalesce(allocation.cost_center, "Main Work Package").label("wbs_activity"),
                    func.count(allocation.id).label("allocated_count"),
                    func.sum(allocation.allocated_amount).label("total_cost"),
                )
                .join(Employee.__table__, and_(allocation.employee_id == e.id, e.organization_id == org_id))
                .join(project, allocation.project_id == project.c.id)
                .join(PayrollPeriod.__table__, and_(allocation.payroll_period_id == period.id, period.organization_id == org_id))
                .where(*clauses)
                .group_by(period.period_code, project.c.project_name, allocation.cost_center)
                .order_by(period.period_code.desc(), project.c.project_name)
            )
            rows, total = await _fetch(db, stmt, limit, offset)
            return _columns(
                ("period", "Payroll Period"),
                ("project_name", "Project"),
                ("wbs_activity", "WBS / Cost Centre"),
                ("allocated_count", "Headcount"),
                ("total_cost", "Total Labour Expenses (BDT)"),
            ), rows, total

        stmt = (
            select(
                period.period_code.label("period"),
                project.c.project_name.label("project_name"),
                tower.tower_name.label("tower_name"),
                e.employee_code.label("employee_code"),
                (e.first_name + " " + e.last_name).label("employee_name"),
                ds.c.title_en.label("designation"),
                allocation.cost_center.label("cost_center"),
                allocation.allocation_percent.label("allocation_percent"),
                allocation.allocated_amount.label("allocated_amount"),
                allocation.status.label("status"),
            )
            .join(Employee.__table__, and_(allocation.employee_id == e.id, e.organization_id == org_id))
            .outerjoin(ds, e.designation_id == ds.c.id)
            .join(project, allocation.project_id == project.c.id)
            .outerjoin(Tower.__table__, and_(allocation.tower_id == tower.id, tower.project_id == project.c.id))
            .join(PayrollPeriod.__table__, and_(allocation.payroll_period_id == period.id, period.organization_id == org_id))
            .where(*clauses)
            .order_by(period.period_code.desc(), project.c.project_name, e.employee_code)
        )
        rows, total = await _fetch(db, stmt, limit, offset)
        return _columns(
            ("period", "Payroll Period"),
            ("project_name", "Project"),
            ("tower_name", "Tower / Site"),
            ("employee_code", "Employee ID"),
            ("employee_name", "Employee Name"),
            ("designation", "Designation"),
            ("cost_center", "Cost Centre / WBS"),
            ("allocation_percent", "Allocation (%)"),
            ("allocated_amount", "Allocated (BDT)"),
            ("status", "Status"),
        ), rows, total

    return [], [], 0


async def get_filter_options(db: AsyncSession, org_id: int) -> dict[str, list[dict[str, Any]]]:
    async def options(stmt: Any, value: Any, label: Any) -> list[dict[str, Any]]:
        result = await db.execute(stmt)
        return [{"value": row[0], "label": str(row[1])} for row in result.all() if row[0] is not None and row[1] is not None]

    status_values = set()
    status_queries = (
        select(e.status).where(e.organization_id == org_id),
        select(sep.status).where(sep.organization_id == org_id),
        select(sep.approval_status).where(sep.organization_id == org_id),
        select(revision.status).where(revision.organization_id == org_id),
        select(loan.status).where(loan.organization_id == org_id),
        select(advance.status).where(advance.organization_id == org_id),
        select(allocation.status).where(allocation.organization_id == org_id),
        select(recruitment.status).where(recruitment.organization_id == org_id),
        select(application.stage).where(application.organization_id == org_id),
        select(payslip.status).where(payslip.organization_id == org_id),
    )
    for stmt in status_queries:
        status_values.update(value for value in (await db.execute(stmt.distinct())).scalars().all() if value)
    document_types = set()
    document_records = await db.execute(
        select(e.documents).where(e.organization_id == org_id, e.documents.is_not(None))
    )
    for document_list in document_records.scalars().all():
        if isinstance(document_list, list):
            document_types.update(
                str(item.get("document_type"))
                for item in document_list
                if isinstance(item, dict) and item.get("document_type")
            )
    fiscal_year_values = set()
    date_queries = (
        select(e.joining_date).where(e.organization_id == org_id),
        select(period.start_date).where(period.organization_id == org_id),
    )
    for stmt in date_queries:
        for value in (await db.execute(stmt)).scalars().all():
            if value:
                fiscal_start = value.year if value.month >= 7 else value.year - 1
                fiscal_year_values.add(f"{fiscal_start}-{fiscal_start + 1}")
    output = {
        "companies": await options(
            select(co.id, co.company_name).where(co.organization_id == org_id, co.is_active.is_(True)).order_by(co.company_name),
            co.id, co.company_name,
        ),
        "branches": await options(
            select(b.id, b.branch_name).join(Company.__table__, co.id == b.company_id).where(co.organization_id == org_id, b.status == "ACTIVE").order_by(b.branch_name),
            b.id, b.branch_name,
        ),
        "departments": await options(
            select(d.id, d.name_en).where(d.organization_id == org_id, d.is_active.is_(True)).order_by(d.name_en),
            d.id, d.name_en,
        ),
        "designations": await options(
            select(ds.id, ds.title_en).where(ds.organization_id == org_id, ds.is_active.is_(True)).order_by(ds.title_en),
            ds.id, ds.title_en,
        ),
        "projects": await options(
            select(project.id, project.project_name).join(Employee.__table__, e.assigned_project_id == project.id).where(e.organization_id == org_id).distinct().order_by(project.project_name),
            project.id, project.project_name,
        ),
        "statuses": [{"value": value, "label": value.replace("_", " ").title()} for value in sorted(status_values)],
        "employment_types": await options(
            select(e.employment_type, e.employment_type).where(e.organization_id == org_id).distinct().order_by(e.employment_type),
            e.employment_type, e.employment_type,
        ),
        "separation_types": await options(
            select(sep.separation_type, sep.separation_type).where(sep.organization_id == org_id).distinct().order_by(sep.separation_type),
            sep.separation_type, sep.separation_type,
        ),
        "revision_types": await options(
            select(revision.revision_type, revision.revision_type).where(revision.organization_id == org_id).distinct().order_by(revision.revision_type),
            revision.revision_type, revision.revision_type,
        ),
        "document_types": [{"value": value, "label": value} for value in sorted(document_types)],
        "recruitment_types": await options(
            select(recruitment.record_type, recruitment.record_type).where(recruitment.organization_id == org_id).distinct().order_by(recruitment.record_type),
            recruitment.record_type, recruitment.record_type,
        ),
        "periods": await options(
            select(period.period_code, period.period_name).where(period.organization_id == org_id).distinct().order_by(period.period_code.desc()),
            period.period_code, period.period_name,
        ),
        "cost_centres": await options(
            select(allocation.cost_center, allocation.cost_center).where(allocation.organization_id == org_id).distinct().order_by(allocation.cost_center),
            allocation.cost_center, allocation.cost_center,
        ),
        "financial_years": [{"value": value, "label": f"FY {value}"} for value in sorted(fiscal_year_values, reverse=True)],
    }
    return output


async def has_report_access(db: AsyncSession, user: Any) -> bool:
    if bool(getattr(user, "is_group_admin", False)):
        return True
    org_id = getattr(user, "organization_id", None)
    user_id = getattr(user, "id", None)
    if not org_id or not user_id:
        return False
    result = await db.execute(
        select(e.id).where(
            e.organization_id == org_id,
            e.user_id == user_id,
            e.system_role.in_(("HR_ADMIN", "HR_EXECUTIVE", "AUDITOR")),
        ).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def audit_export(
    db: AsyncSession,
    org_id: int,
    user_id: int,
    report: ReportId,
    filters: Any,
    export_format: str,
    allowed: bool,
    row_count: int = 0,
    reason: str | None = None,
) -> None:
    safe_filters = {
        key: value.isoformat() if isinstance(value, (date, datetime)) else value
        for key, value in filters.model_dump(exclude_none=True).items()
        if key != "search"
    }
    if filters.search:
        safe_filters["search_used"] = True
    if reason:
        safe_filters["denial_reason"] = reason
    db.add(HRReportExportAudit(
        organization_id=org_id,
        user_id=user_id,
        report_type=report.value,
        filters=safe_filters,
        export_format=export_format.upper(),
        row_count=row_count,
        allowed=allowed,
        outcome="SUCCESS" if allowed else ("DENIED" if reason != "export_generation_failed" else "FAILED"),
        reason=reason,
    ))
