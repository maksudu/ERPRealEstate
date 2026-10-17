from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# --- Department Schemas ---
class DepartmentBase(BaseModel):
    department_code: str
    name_en: str
    name_bn: Optional[str] = None
    head_of_dept_id: Optional[int] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- Designation Schemas ---
class DesignationBase(BaseModel):
    department_id: int
    designation_code: str
    title_en: str
    title_bn: Optional[str] = None
    grade_level: str = "GRADE_4"
    min_salary: Decimal = Decimal("15000.00")
    max_salary: Decimal = Decimal("300000.00")
    is_active: bool = True

class DesignationCreate(DesignationBase):
    pass

class DesignationOut(DesignationBase):
    id: int
    department_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# --- Employee Schemas ---
class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    official_email: Optional[str] = None
    phone: str
    personal_phone: Optional[str] = None
    gender: str = "MALE"
    date_of_birth: Optional[date] = None
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    joining_date: date
    probation_months: int = 6
    employment_type: str = "PERMANENT" # PERMANENT, PROBATION, CONTRACTUAL
    workforce_category: str = "CORPORATE" # CORPORATE, SITE_ENGINEERING, SITE_SUPERVISION
    department_id: int
    designation_id: int
    reporting_to_id: Optional[int] = None
    assigned_project_id: Optional[int] = None
    bank_account_no: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    routing_no: Optional[str] = None
    basic_salary: Decimal = Decimal("0.00")
    house_rent_allowance: Decimal = Decimal("0.00")
    medical_allowance: Decimal = Decimal("0.00")
    conveyance_allowance: Decimal = Decimal("0.00")
    site_hazard_allowance: Decimal = Decimal("0.00")
    mobile_allowance: Decimal = Decimal("0.00")
    is_pf_eligible: bool = True
    is_tax_eligible: bool = True

class EmployeeCreate(EmployeeBase):
    employee_code: Optional[str] = None

class EmployeeOut(EmployeeBase):
    id: int
    employee_code: str
    status: str
    department_name: Optional[str] = None
    designation_title: Optional[str] = None
    assigned_project_name: Optional[str] = None
    gross_salary: Optional[Decimal] = None
    model_config = ConfigDict(from_attributes=True)


# --- Site Labour Contractor Schemas ---
class ContractorBase(BaseModel):
    company_name: str
    trade_license: Optional[str] = None
    contact_person: str
    phone: str
    email: Optional[str] = None
    tax_nid: Optional[str] = None
    trade_specialization: str = "CIVIL_CONSTRUCTION"
    daily_rate_default: Decimal = Decimal("800.00")
    is_active: bool = True

class ContractorCreate(ContractorBase):
    pass

class ContractorOut(ContractorBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Labour Muster Roll Schemas ---
class MusterRollItem(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    contractor_id: int
    muster_date: date
    shift: str = "DAY"
    skill_type: str # MASON, ROD_BINDER, CARPENTER, HELPER, PLUMBER, ELECTRICIAN
    headcount: int = 1
    standard_hours: Decimal = Decimal("8.00")
    overtime_hours: Decimal = Decimal("0.00")
    hourly_rate: Decimal = Decimal("100.00")
    overtime_rate: Decimal = Decimal("150.00")
    remarks: Optional[str] = None

class MusterRollBatchCreate(BaseModel):
    items: List[MusterRollItem]

class MusterRollOut(MusterRollItem):
    id: int
    total_amount: Decimal
    approval_status: str
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# --- Attendance Schemas ---
class AttendancePunch(BaseModel):
    employee_id: int
    punch_type: str = "IN" # IN, OUT
    punch_date: Optional[date] = None
    punch_time: Optional[datetime] = None
    source: str = "GPS_MOBILE"
    geofence_lat: Optional[Decimal] = None
    geofence_lng: Optional[Decimal] = None
    remarks: Optional[str] = None

class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    punch_date: date
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    late_minutes: int
    status: str
    source: str
    model_config = ConfigDict(from_attributes=True)


# --- Leave Application Schemas ---
class LeaveApply(BaseModel):
    employee_id: int
    leave_type: str # CASUAL, SICK, EARNED, MATERNITY
    start_date: date
    end_date: date
    reason: str
    document_url: Optional[str] = None

class LeaveApprove(BaseModel):
    status: str # APPROVED, REJECTED
    approval_remarks: Optional[str] = None

class LeaveOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    total_days: int
    reason: str
    status: str
    approval_remarks: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- Payroll Schemas ---
class PayrollGenerateRequest(BaseModel):
    month: int
    year: int
    project_id: Optional[int] = None # None for corporate payroll

class PayslipOut(BaseModel):
    id: int
    employee_id: int
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    designation_title: Optional[str] = None
    department_name: Optional[str] = None
    basic_salary: Decimal
    house_rent: Decimal
    medical: Decimal
    conveyance: Decimal
    site_hazard_allowance: Decimal
    mobile_allowance: Decimal
    overtime_hours: Decimal
    overtime_amount: Decimal
    sales_commission: Decimal
    festival_bonus: Decimal
    gross_earnings: Decimal
    pf_deduction: Decimal
    tax_tds_deduction: Decimal
    advance_salary_deduction: Decimal
    loan_emi_deduction: Decimal
    total_deductions: Decimal
    net_payable: Decimal
    payment_status: str
    model_config = ConfigDict(from_attributes=True)

class PayrollRunOut(BaseModel):
    id: int
    month: int
    year: int
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    total_gross: Decimal
    total_deductions: Decimal
    total_net: Decimal
    status: str
    disbursement_date: Optional[date] = None
    voucher_id: Optional[int] = None
    payslips_count: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# --- HR Cockpit Stats ---
class HRCockpitStats(BaseModel):
    total_employees: int
    corporate_headcount: int
    site_engineering_headcount: int
    today_present: int
    today_late: int
    today_absent: int
    today_on_leave: int
    attendance_rate_percent: float
    active_labour_contractors: int
    today_site_labour_count: int
    today_site_labour_expense: Decimal
    monthly_payroll_liability: Decimal
