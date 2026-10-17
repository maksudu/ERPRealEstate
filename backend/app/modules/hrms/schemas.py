from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional, List, Dict, Any
from datetime import date, datetime, time
from decimal import Decimal


# --- Department Schemas (Section 2, 3, 4, 5) ---
class DepartmentBase(BaseModel):
    department_code: str
    name_en: str
    name_bn: Optional[str] = None
    company_id: Optional[int] = 1
    parent_department_id: Optional[int] = None
    head_of_dept_id: Optional[int] = None
    branch_id: Optional[int] = None
    cost_center_id: Optional[str] = None
    description: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    status: str = "ACTIVE"
    approval_policies: Optional[Dict[str, Any]] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    department_code: Optional[str] = None
    name_en: Optional[str] = None
    name_bn: Optional[str] = None
    company_id: Optional[int] = None
    parent_department_id: Optional[int] = None
    head_of_dept_id: Optional[int] = None
    branch_id: Optional[int] = None
    cost_center_id: Optional[str] = None
    description: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    status: Optional[str] = None
    approval_policies: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class DepartmentMoveParent(BaseModel):
    parent_department_id: Optional[int] = None
    effective_date: Optional[date] = None
    remarks: Optional[str] = None

class DepartmentHeadAssign(BaseModel):
    employee_id: int
    assignment_type: str = "PERMANENT" # PERMANENT, ACTING, INTERIM
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    permissions_json: Optional[Dict[str, Any]] = None
    remarks: Optional[str] = None

class DepartmentHeadHistoryOut(BaseModel):
    id: int
    department_id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    designation_title: Optional[str] = None
    assignment_type: str
    effective_from: date
    effective_to: Optional[date] = None
    permissions_json: Optional[Dict[str, Any]] = None
    is_current: bool
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class DepartmentProjectMappingCreate(BaseModel):
    project_id: int
    site_lead_employee_id: Optional[int] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    status: str = "ACTIVE"

class DepartmentProjectMappingOut(BaseModel):
    id: int
    department_id: int
    department_name: Optional[str] = None
    project_id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    site_lead_employee_id: Optional[int] = None
    site_lead_name: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    status: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class DepartmentAuditOut(BaseModel):
    id: int
    department_id: int
    action_type: str
    performed_by_name: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class DepartmentOut(DepartmentBase):
    id: int
    company_name: Optional[str] = None
    parent_department_name: Optional[str] = None
    branch_name: Optional[str] = None
    head_of_dept_name: Optional[str] = None
    head_of_dept_code: Optional[str] = None
    employee_count: int = 0
    vacancy_count: int = 0
    child_count: int = 0
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class DepartmentTreeNode(BaseModel):
    id: int
    department_code: str
    name_en: str
    name_bn: Optional[str] = None
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    parent_department_id: Optional[int] = None
    head_id: Optional[int] = None
    head_name: Optional[str] = None
    head_code: Optional[str] = None
    head_title: Optional[str] = None
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None
    cost_center_id: Optional[str] = None
    status: str
    employee_count: int = 0
    children: List['DepartmentTreeNode'] = []


# --- Designation Schemas ---
class DesignationBase(BaseModel):
    department_id: int
    designation_code: str
    title_en: str
    title_bn: Optional[str] = None
    grade_level: str = "GRADE_4"
    min_salary: Decimal = Decimal("0.00")
    max_salary: Decimal = Decimal("0.00")
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
    marital_status: Optional[str] = "SINGLE"
    blood_group: Optional[str] = None
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None

    present_address: Optional[str] = None
    permanent_address: Optional[str] = None

    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    joining_date: date
    confirmation_date: Optional[date] = None
    probation_months: int = 6
    employment_type: str = "PERMANENT" # PERMANENT, PROBATION, CONTRACTUAL, INTERN, DAILY_WAGE
    workforce_category: str = "CORPORATE" # CORPORATE, SITE_ENGINEERING, SITE_SUPERVISION
    status: str = "ACTIVE" # ACTIVE, PROBATION, CONFIRMED, RESIGNED, TERMINATED, ON_LEAVE

    department_id: int
    designation_id: int
    reporting_to_id: Optional[int] = None
    assigned_project_id: Optional[int] = None
    company_id: Optional[int] = None
    branch_id: Optional[int] = None
    project_office_id: Optional[int] = None

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

    education: Optional[List[Dict[str, Any]]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    documents: Optional[List[Dict[str, Any]]] = None

    user_id: Optional[int] = None
    system_role: Optional[str] = "EMPLOYEE" # HR_ADMIN, HR_EXECUTIVE, EMPLOYEE, MANAGER, AUDITOR

class EmployeeCreate(EmployeeBase):
    employee_code: Optional[str] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    official_email: Optional[str] = None
    phone: Optional[str] = None
    personal_phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None

    present_address: Optional[str] = None
    permanent_address: Optional[str] = None

    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    joining_date: Optional[date] = None
    confirmation_date: Optional[date] = None
    probation_months: Optional[int] = None
    employment_type: Optional[str] = None
    workforce_category: Optional[str] = None
    status: Optional[str] = None

    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    reporting_to_id: Optional[int] = None
    assigned_project_id: Optional[int] = None
    company_id: Optional[int] = None
    branch_id: Optional[int] = None
    project_office_id: Optional[int] = None

    bank_account_no: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    routing_no: Optional[str] = None

    basic_salary: Optional[Decimal] = None
    house_rent_allowance: Optional[Decimal] = None
    medical_allowance: Optional[Decimal] = None
    conveyance_allowance: Optional[Decimal] = None
    site_hazard_allowance: Optional[Decimal] = None
    mobile_allowance: Optional[Decimal] = None
    is_pf_eligible: Optional[bool] = None
    is_tax_eligible: Optional[bool] = None

    education: Optional[List[Dict[str, Any]]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    documents: Optional[List[Dict[str, Any]]] = None

    user_id: Optional[int] = None
    system_role: Optional[str] = None

class EmployeeOut(EmployeeBase):
    id: int
    employee_code: str
    department_name: Optional[str] = None
    designation_title: Optional[str] = None
    assigned_project_name: Optional[str] = None
    company_name: Optional[str] = None
    branch_name: Optional[str] = None
    reporting_to_name: Optional[str] = None
    gross_salary: Optional[Decimal] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class EmployeePaginatedOut(BaseModel):
    items: List[EmployeeOut]
    total: int
    limit: int
    offset: int



# --- Site Labour Contractor Schemas ---
class ContractorBase(BaseModel):
    company_name: str
    trade_license: Optional[str] = None
    contact_person: str
    phone: str
    email: Optional[str] = None
    tax_nid: Optional[str] = None
    trade_specialization: str = "CIVIL_CONSTRUCTION"
    daily_rate_default: Decimal = Decimal("0.00")
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
    standard_hours: Decimal = Decimal("0.00")
    overtime_hours: Decimal = Decimal("0.00")
    hourly_rate: Decimal = Decimal("0.00")
    overtime_rate: Decimal = Decimal("0.00")
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


# =====================================================================
# --- Section 2: Enterprise Attendance & Shift Schemas (2.1 - 2.10) ---
# =====================================================================

# --- 2.1 Shift Schemas ---
class ShiftBase(BaseModel):
    shift_name: str
    shift_code: str
    start_time: time
    end_time: time
    break_start_time: Optional[time] = None
    break_end_time: Optional[time] = None
    break_duration_minutes: int = 60
    grace_period_minutes: int = 15
    half_day_minimum_minutes: int = 240
    full_day_minimum_minutes: int = 480
    is_night_shift: bool = False
    is_active: bool = True

class ShiftCreate(ShiftBase):
    pass

class ShiftUpdate(BaseModel):
    shift_name: Optional[str] = None
    shift_code: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    break_start_time: Optional[time] = None
    break_end_time: Optional[time] = None
    break_duration_minutes: Optional[int] = None
    grace_period_minutes: Optional[int] = None
    half_day_minimum_minutes: Optional[int] = None
    full_day_minimum_minutes: Optional[int] = None
    is_night_shift: Optional[bool] = None
    is_active: Optional[bool] = None

class ShiftOut(ShiftBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ShiftPaginatedOut(BaseModel):
    items: List[ShiftOut]
    total: int
    limit: int
    offset: int


# --- 2.2 Shift Assignment Schemas ---
class ShiftAssignmentBase(BaseModel):
    shift_id: int
    assignment_type: str = "EMPLOYEE" # EMPLOYEE, DEPARTMENT, PROJECT_SITE
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    project_id: Optional[int] = None
    effective_from: date
    effective_to: Optional[date] = None
    is_active: bool = True
    remarks: Optional[str] = None

class ShiftAssignmentCreate(ShiftAssignmentBase):
    pass

class ShiftAssignmentUpdate(BaseModel):
    shift_id: Optional[int] = None
    assignment_type: Optional[str] = None
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    project_id: Optional[int] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: Optional[bool] = None
    remarks: Optional[str] = None

class ShiftAssignmentOut(ShiftAssignmentBase):
    id: int
    shift_name: Optional[str] = None
    shift_code: Optional[str] = None
    target_name: Optional[str] = None
    target_code: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ShiftAssignmentPaginatedOut(BaseModel):
    items: List[ShiftAssignmentOut]
    total: int
    limit: int
    offset: int


# --- 2.3 Biometric Device Schemas ---
class BiometricDeviceBase(BaseModel):
    device_name: str
    device_serial: str
    device_model: str
    ip_address: str
    port: int = 4370
    location: str
    assigned_branch_id: Optional[int] = None
    assigned_project_id: Optional[int] = None
    status: str = "ONLINE"
    is_active: bool = True

class BiometricDeviceCreate(BiometricDeviceBase):
    pass

class BiometricDeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    device_serial: Optional[str] = None
    device_model: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    location: Optional[str] = None
    assigned_branch_id: Optional[int] = None
    assigned_project_id: Optional[int] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

class BiometricDeviceOut(BiometricDeviceBase):
    id: int
    branch_name: Optional[str] = None
    project_name: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class BiometricDevicePaginatedOut(BaseModel):
    items: List[BiometricDeviceOut]
    total: int
    limit: int
    offset: int

class BiometricSyncPayload(BaseModel):
    device_id: int
    log_records: Optional[List[Dict[str, Any]]] = None


# --- 2.8 Holiday Calendar Schemas ---
class HolidayCalendarBase(BaseModel):
    holiday_name: str
    holiday_type: str = "PUBLIC_HOLIDAY"
    start_date: date
    end_date: date
    total_days: int = 1
    applicable_branch_id: Optional[int] = None
    applicable_project_id: Optional[int] = None
    is_recurring_yearly: bool = False
    description: Optional[str] = None
    is_active: bool = True

class HolidayCalendarCreate(HolidayCalendarBase):
    pass

class HolidayCalendarUpdate(BaseModel):
    holiday_name: Optional[str] = None
    holiday_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_days: Optional[int] = None
    applicable_branch_id: Optional[int] = None
    applicable_project_id: Optional[int] = None
    is_recurring_yearly: Optional[bool] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class HolidayCalendarOut(HolidayCalendarBase):
    id: int
    branch_name: Optional[str] = None
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class HolidayCalendarPaginatedOut(BaseModel):
    items: List[HolidayCalendarOut]
    total: int
    limit: int
    offset: int


# --- 2.9 Site Geofence Schemas ---
class SiteGeofenceBase(BaseModel):
    project_id: int
    site_name: str
    latitude: Decimal
    longitude: Decimal
    radius_meters: int = 250
    is_active: bool = True

class SiteGeofenceCreate(SiteGeofenceBase):
    pass

class SiteGeofenceUpdate(BaseModel):
    project_id: Optional[int] = None
    site_name: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    radius_meters: Optional[int] = None
    is_active: Optional[bool] = None

class SiteGeofenceOut(SiteGeofenceBase):
    id: int
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class SiteGeofencePaginatedOut(BaseModel):
    items: List[SiteGeofenceOut]
    total: int
    limit: int
    offset: int


# --- 2.7 Attendance Correction Schemas ---
class AttendanceCorrectionCreate(BaseModel):
    employee_id: int
    attendance_id: Optional[int] = None
    request_date: date
    requested_clock_in: datetime
    requested_clock_out: datetime
    reason: str

class AttendanceCorrectionVerify(BaseModel):
    manager_remarks: str
    is_approved: bool

class AttendanceCorrectionApprove(BaseModel):
    hr_remarks: str
    is_approved: bool

class AttendanceCorrectionOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    attendance_id: Optional[int] = None
    request_date: date
    original_clock_in: Optional[datetime] = None
    original_clock_out: Optional[datetime] = None
    requested_clock_in: datetime
    requested_clock_out: datetime
    reason: str
    manager_verifier_id: Optional[int] = None
    manager_verifier_name: Optional[str] = None
    manager_remarks: Optional[str] = None
    manager_verified_at: Optional[datetime] = None
    hr_approver_id: Optional[int] = None
    hr_approver_name: Optional[str] = None
    hr_remarks: Optional[str] = None
    hr_approved_at: Optional[datetime] = None
    status: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AttendanceCorrectionPaginatedOut(BaseModel):
    items: List[AttendanceCorrectionOut]
    total: int
    limit: int
    offset: int


# --- 2.4, 2.5, 2.6 Attendance Capture & Processing Schemas ---
class AttendancePunch(BaseModel):
    employee_id: int
    punch_type: str = "IN" # IN, OUT, PUNCH
    punch_date: Optional[date] = None
    punch_time: Optional[datetime] = None
    source: str = "WEB_PUNCH"
    geofence_lat: Optional[Decimal] = None
    geofence_lng: Optional[Decimal] = None
    site_id: Optional[int] = None
    remarks: Optional[str] = None

class AttendanceProcessRequest(BaseModel):
    process_date: date
    department_id: Optional[int] = None

class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    designation_title: Optional[str] = None
    shift_id: Optional[int] = None
    shift_name: Optional[str] = None
    punch_date: date
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    working_hours: Decimal = Decimal("0.00")
    late_minutes: int = 0
    early_leaving_minutes: int = 0
    overtime_hours: Decimal = Decimal("0.00")
    status: str
    source: str
    is_missing_punch: bool = False
    is_anomaly: bool = False
    geofence_site_name: Optional[str] = None
    is_geofence_verified: bool = True
    remarks: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class AttendancePaginatedOut(BaseModel):
    items: List[AttendanceOut]
    total: int
    limit: int
    offset: int
    present_count: int = 0
    late_count: int = 0
    half_day_count: int = 0
    absent_count: int = 0
    on_leave_count: int = 0
    missing_punch_count: int = 0

class AttendanceDailySummaryOut(BaseModel):
    date: date
    total_employees: int
    present: int
    late: int
    half_day: int
    absent: int
    on_leave: int
    missing_punches: int
    attendance_rate: float


# =====================================================================
# --- Section 2.11 - 2.20: Leave & Overtime Schemas ---
# =====================================================================

# --- 2.11 Leave Type Schemas ---
class LeaveTypeBase(BaseModel):
    leave_type_code: str
    name_en: str
    name_bn: Optional[str] = None
    is_paid: bool = True
    color_code: str = "#3b82f6"
    description: Optional[str] = None
    is_active: bool = True

class LeaveTypeCreate(LeaveTypeBase):
    pass

class LeaveTypeUpdate(BaseModel):
    leave_type_code: Optional[str] = None
    name_en: Optional[str] = None
    name_bn: Optional[str] = None
    is_paid: Optional[bool] = None
    color_code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class LeaveTypeOut(LeaveTypeBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class LeaveTypePaginatedOut(BaseModel):
    items: List[LeaveTypeOut]
    total: int
    limit: int
    offset: int


# --- 2.12 Leave Policy Schemas ---
class LeavePolicyBase(BaseModel):
    leave_type_id: int
    policy_name: str
    annual_entitlement_days: Decimal = Decimal("10.00")
    accrual_frequency: str = "YEARLY" # YEARLY, MONTHLY, PRO_RATA
    max_carry_forward_days: Decimal = Decimal("0.00")
    carry_forward_expiry_months: int = 12
    encashment_allowed: bool = False
    max_encashment_days: Decimal = Decimal("0.00")
    min_service_days_required: int = 90
    gender_applicability: str = "ALL" # ALL, MALE, FEMALE
    is_active: bool = True

class LeavePolicyCreate(LeavePolicyBase):
    pass

class LeavePolicyUpdate(BaseModel):
    leave_type_id: Optional[int] = None
    policy_name: Optional[str] = None
    annual_entitlement_days: Optional[Decimal] = None
    accrual_frequency: Optional[str] = None
    max_carry_forward_days: Optional[Decimal] = None
    carry_forward_expiry_months: Optional[int] = None
    encashment_allowed: Optional[bool] = None
    max_encashment_days: Optional[Decimal] = None
    min_service_days_required: Optional[int] = None
    gender_applicability: Optional[str] = None
    is_active: Optional[bool] = None

class LeavePolicyOut(LeavePolicyBase):
    id: int
    leave_type_code: Optional[str] = None
    leave_type_name: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class LeavePolicyPaginatedOut(BaseModel):
    items: List[LeavePolicyOut]
    total: int
    limit: int
    offset: int


# --- 2.13 & 2.16 Opening & Net Leave Balance Schemas ---
class LeaveBalanceBase(BaseModel):
    employee_id: int
    leave_type_id: int
    year: int = 2026
    opening_balance: Decimal = Decimal("0.00")
    carried_forward: Decimal = Decimal("0.00")
    accrued_days: Decimal = Decimal("0.00")
    used_days: Decimal = Decimal("0.00")
    pending_days: Decimal = Decimal("0.00")
    available_days: Decimal = Decimal("0.00")
    encashed_days: Decimal = Decimal("0.00")

class LeaveBalanceCreate(BaseModel):
    employee_id: int
    leave_type_id: int
    year: int = 2026
    opening_balance: Decimal = Decimal("0.00")
    carried_forward: Decimal = Decimal("0.00")

class LeaveBalanceUpdate(BaseModel):
    opening_balance: Optional[Decimal] = None
    carried_forward: Optional[Decimal] = None
    accrued_days: Optional[Decimal] = None
    used_days: Optional[Decimal] = None
    pending_days: Optional[Decimal] = None
    available_days: Optional[Decimal] = None

class LeaveBalanceOut(LeaveBalanceBase):
    id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    leave_type_code: Optional[str] = None
    leave_type_name: Optional[str] = None
    color_code: Optional[str] = None
    is_paid: bool = True
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class LeaveBalancePaginatedOut(BaseModel):
    items: List[LeaveBalanceOut]
    total: int
    limit: int
    offset: int


# --- 2.14 & 2.15 Leave Application Schemas ---
class LeaveApply(BaseModel):
    employee_id: int
    leave_type_id: Optional[int] = None
    leave_type: str = "CASUAL"
    start_date: date
    end_date: date
    reason: str
    emergency_contact: Optional[str] = None
    document_url: Optional[str] = None

class LeaveUpdate(BaseModel):
    leave_type_id: Optional[int] = None
    leave_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None
    emergency_contact: Optional[str] = None
    document_url: Optional[str] = None

class LeaveManagerReview(BaseModel):
    manager_remarks: str
    is_approved: bool

class LeaveHRReview(BaseModel):
    hr_remarks: str
    is_approved: bool

class LeaveApprove(BaseModel):
    status: str # APPROVED, REJECTED
    approval_remarks: Optional[str] = None

class LeaveOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    leave_type_id: Optional[int] = None
    leave_type: str
    leave_type_name: Optional[str] = None
    color_code: Optional[str] = None
    is_paid: bool = True
    start_date: date
    end_date: date
    total_days: int
    reason: str
    emergency_contact: Optional[str] = None
    document_url: Optional[str] = None
    status: str
    manager_approver_id: Optional[int] = None
    manager_approver_name: Optional[str] = None
    manager_remarks: Optional[str] = None
    manager_action_at: Optional[datetime] = None
    hr_approver_id: Optional[int] = None
    hr_approver_name: Optional[str] = None
    hr_remarks: Optional[str] = None
    hr_action_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class LeavePaginatedOut(BaseModel):
    items: List[LeaveOut]
    total: int
    limit: int
    offset: int
    pending_manager_count: int = 0
    pending_hr_count: int = 0
    approved_count: int = 0
    rejected_count: int = 0


# --- 2.17, 2.18, 2.19 Overtime Request Schemas ---
class OvertimeRequestCreate(BaseModel):
    employee_id: int
    project_id: Optional[int] = None
    ot_date: date
    ot_type: str = "NORMAL_OT" # NORMAL_OT, WEEKEND_OT, HOLIDAY_OT
    start_time: time
    end_time: time
    requested_hours: Decimal = Decimal("2.00")
    task_description: str
    attendance_id: Optional[int] = None

class OvertimeRequestUpdate(BaseModel):
    project_id: Optional[int] = None
    ot_date: Optional[date] = None
    ot_type: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    requested_hours: Optional[Decimal] = None
    task_description: Optional[str] = None

class OvertimeVerify(BaseModel):
    verified_hours: Decimal
    verifier_remarks: str
    is_verified: bool = True

class OvertimeApprove(BaseModel):
    approved_hours: Decimal
    rate_multiplier: Decimal = Decimal("1.50")
    approver_remarks: str
    is_approved: bool = True

class OvertimeRequestOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    ot_date: date
    ot_type: str
    start_time: time
    end_time: time
    requested_hours: Decimal
    task_description: str
    attendance_id: Optional[int] = None
    attendance_working_hours: Optional[Decimal] = None
    verified_hours: Optional[Decimal] = None
    verifier_id: Optional[int] = None
    verifier_name: Optional[str] = None
    verifier_remarks: Optional[str] = None
    verified_at: Optional[datetime] = None
    approved_hours: Optional[Decimal] = None
    approver_id: Optional[int] = None
    approver_name: Optional[str] = None
    approver_remarks: Optional[str] = None
    approved_at: Optional[datetime] = None
    rate_multiplier: Decimal = Decimal("1.50")
    calculated_amount: Decimal = Decimal("0.00")
    is_payroll_processed: bool = False
    payroll_run_id: Optional[int] = None
    status: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class OvertimeRequestPaginatedOut(BaseModel):
    items: List[OvertimeRequestOut]
    total: int
    limit: int
    offset: int
    total_requested_hours: Decimal = Decimal("0.00")
    total_approved_hours: Decimal = Decimal("0.00")
    total_approved_amount: Decimal = Decimal("0.00")


# --- 2.20 Payroll Integration Schemas ---
class PayrollInputOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    month: int
    year: int
    payroll_run_id: Optional[int] = None
    approved_overtime_hours: Decimal
    overtime_amount: Decimal
    unpaid_leave_days: Decimal
    deduction_amount: Decimal
    source_reference: Optional[str] = None
    is_locked: bool
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class PayrollInputPaginatedOut(BaseModel):
    items: List[PayrollInputOut]
    total: int
    limit: int
    offset: int

class PayrollSyncLeaveOTRequest(BaseModel):
    month: int
    year: int
    employee_id: Optional[int] = None



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


# --- 3. Company Master Schemas ---
class CompanyBase(BaseModel):
    company_code: str
    company_name: str
    short_name: str
    company_type: str = "OPERATING_COMPANY"
    parent_company_id: Optional[int] = None
    country: str = "Bangladesh"
    currency: str = "BDT"
    time_zone: str = "Asia/Dhaka"
    logo: Optional[str] = None
    status: str = "ACTIVE"
    default_language: str = "en"
    financial_year_start_month: int = 7
    date_format: str = "DD/MM/YYYY"
    number_format: str = "en-IN"
    employee_code_prefix: str = "BRE-"
    approval_policies: Optional[Dict[str, Any]] = None
    payroll_config: Optional[Dict[str, Any]] = None
    report_access: Optional[Dict[str, Any]] = None
    is_active: bool = True

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    short_name: Optional[str] = None
    company_type: Optional[str] = None
    parent_company_id: Optional[int] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    time_zone: Optional[str] = None
    logo: Optional[str] = None
    status: Optional[str] = None
    default_language: Optional[str] = None
    financial_year_start_month: Optional[int] = None
    date_format: Optional[str] = None
    number_format: Optional[str] = None
    employee_code_prefix: Optional[str] = None
    approval_policies: Optional[Dict[str, Any]] = None
    payroll_config: Optional[Dict[str, Any]] = None
    report_access: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class CompanyOut(CompanyBase):
    id: int
    parent_company_name: Optional[str] = None
    legal_entities_count: int = 0
    branches_count: int = 0
    project_offices_count: int = 0
    employees_count: int = 0
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- 4. Legal Entity Schemas ---
class LegalEntityBase(BaseModel):
    company_id: int
    entity_code: str
    registered_name: str
    registration_number: Optional[str] = None
    registration_date: Optional[date] = None
    legal_form: str = "PVT_LTD"
    registered_office_address: Optional[str] = None
    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    trade_license_number: Optional[str] = None
    trade_license_expiry: Optional[date] = None
    rjsc_registration_details: Optional[str] = None
    authorized_signatory_name: Optional[str] = None
    authorized_signatory_designation: Optional[str] = None
    statutory_documents: Optional[List[Dict[str, Any]]] = None
    effective_date: Optional[date] = None
    is_default: bool = False
    status: str = "ACTIVE"

class LegalEntityCreate(LegalEntityBase):
    pass

class LegalEntityUpdate(BaseModel):
    company_id: Optional[int] = None
    registered_name: Optional[str] = None
    registration_number: Optional[str] = None
    registration_date: Optional[date] = None
    legal_form: Optional[str] = None
    registered_office_address: Optional[str] = None
    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    trade_license_number: Optional[str] = None
    trade_license_expiry: Optional[date] = None
    rjsc_registration_details: Optional[str] = None
    authorized_signatory_name: Optional[str] = None
    authorized_signatory_designation: Optional[str] = None
    statutory_documents: Optional[List[Dict[str, Any]]] = None
    effective_date: Optional[date] = None
    is_default: Optional[bool] = None
    status: Optional[str] = None

class LegalEntityOut(LegalEntityBase):
    id: int
    company_name: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- 5. Branch Schemas ---
class BranchBase(BaseModel):
    company_id: int
    branch_code: str
    branch_name: str
    branch_type: str = "SALES_OFFICE"
    legal_entity_id: Optional[int] = None
    manager_employee_id: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    division: Optional[str] = None
    district: Optional[str] = None
    upazila_thana: Optional[str] = None
    address: Optional[str] = None
    is_head_office: bool = False
    opening_date: Optional[date] = None
    closing_date: Optional[date] = None
    default_cost_center: Optional[str] = None
    status: str = "ACTIVE"

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    company_id: Optional[int] = None
    branch_name: Optional[str] = None
    branch_type: Optional[str] = None
    legal_entity_id: Optional[int] = None
    manager_employee_id: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    division: Optional[str] = None
    district: Optional[str] = None
    upazila_thana: Optional[str] = None
    address: Optional[str] = None
    is_head_office: Optional[bool] = None
    opening_date: Optional[date] = None
    closing_date: Optional[date] = None
    default_cost_center: Optional[str] = None
    status: Optional[str] = None

class BranchOut(BranchBase):
    id: int
    company_name: Optional[str] = None
    legal_entity_name: Optional[str] = None
    manager_name: Optional[str] = None
    employees_count: int = 0
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- 6. Project Office Schemas ---
class ProjectOfficeBase(BaseModel):
    office_code: str
    office_name: str
    company_id: int
    legal_entity_id: Optional[int] = None
    project_id: int
    office_type: str = "CONSTRUCTION_SITE"
    site_in_charge_employee_id: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    division: Optional[str] = None
    district: Optional[str] = None
    upazila_thana: Optional[str] = None
    address: Optional[str] = None
    opening_date: Optional[date] = None
    expected_closing_date: Optional[date] = None
    operational_status: str = "ACTIVE_MOBILIZED"
    default_cost_center: Optional[str] = None
    supporting_documents: Optional[List[Dict[str, Any]]] = None

class ProjectOfficeCreate(ProjectOfficeBase):
    pass

class ProjectOfficeUpdate(BaseModel):
    office_name: Optional[str] = None
    company_id: Optional[int] = None
    legal_entity_id: Optional[int] = None
    project_id: Optional[int] = None
    office_type: Optional[str] = None
    site_in_charge_employee_id: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    division: Optional[str] = None
    district: Optional[str] = None
    upazila_thana: Optional[str] = None
    address: Optional[str] = None
    opening_date: Optional[date] = None
    expected_closing_date: Optional[date] = None
    operational_status: Optional[str] = None
    default_cost_center: Optional[str] = None
    supporting_documents: Optional[List[Dict[str, Any]]] = None

class ProjectOfficeOut(ProjectOfficeBase):
    id: int
    company_name: Optional[str] = None
    legal_entity_name: Optional[str] = None
    project_name: Optional[str] = None
    site_in_charge_name: Optional[str] = None
    employees_count: int = 0
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- Organization Hierarchy Tree Schema ---
class OrgNode(BaseModel):
    id: str
    label: str
    type: str # GROUP, COMPANY, LEGAL_ENTITY, HEAD_OFFICE, BRANCH, PROJECT_OFFICE
    code: str
    subtitle: Optional[str] = None
    badge: Optional[str] = None
    status: str = "ACTIVE"
    metadata: Optional[Dict[str, Any]] = None
    children: List['OrgNode'] = []

class OrgHierarchyResponse(BaseModel):
    root_nodes: List[OrgNode]
    total_companies: int
    total_legal_entities: int
    total_branches: int
    total_project_offices: int


# =====================================================================
# --- Section 1 & 2: Salary Grades & Employee Levels Schemas ---
# =====================================================================
class SalaryGradeBase(BaseModel):
    grade_code: str
    grade_name: str
    employee_level: str = "EXECUTIVE"  # C_SUITE, DIRECTOR, SR_MANAGEMENT, MID_MANAGEMENT, EXECUTIVE, OFFICER, SITE_ENGINEER, SUPPORT_STAFF
    min_salary: Decimal = Decimal("20000.00")
    max_salary: Decimal = Decimal("250000.00")
    default_house_rent_pct: Decimal = Decimal("50.00")
    default_medical_allowance: Decimal = Decimal("2500.00")
    default_conveyance: Decimal = Decimal("3000.00")
    description: Optional[str] = None
    is_active: bool = True

class SalaryGradeCreate(SalaryGradeBase):
    pass

class SalaryGradeUpdate(BaseModel):
    grade_code: Optional[str] = None
    grade_name: Optional[str] = None
    employee_level: Optional[str] = None
    min_salary: Optional[Decimal] = None
    max_salary: Optional[Decimal] = None
    default_house_rent_pct: Optional[Decimal] = None
    default_medical_allowance: Optional[Decimal] = None
    default_conveyance: Optional[Decimal] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SalaryGradeOut(SalaryGradeBase):
    id: int
    organization_id: int
    designations_count: int = 0
    positions_count: int = 0
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class SalaryGradePaginatedOut(BaseModel):
    items: List[SalaryGradeOut]
    total: int
    limit: int
    offset: int


# =====================================================================
# --- Section 1 & 2: Job Titles & Designations Schemas ---
# =====================================================================
class DesignationBase(BaseModel):
    department_id: int
    designation_code: str
    title_en: str
    title_bn: Optional[str] = None
    salary_grade_id: Optional[int] = None
    grade_level: str = "GRADE_4"
    employee_level: str = "EXECUTIVE"
    min_salary: Decimal = Decimal("15000.00")
    max_salary: Decimal = Decimal("300000.00")
    description: Optional[str] = None
    is_active: bool = True

class DesignationCreate(DesignationBase):
    pass

class DesignationUpdate(BaseModel):
    department_id: Optional[int] = None
    designation_code: Optional[str] = None
    title_en: Optional[str] = None
    title_bn: Optional[str] = None
    salary_grade_id: Optional[int] = None
    grade_level: Optional[str] = None
    employee_level: Optional[str] = None
    min_salary: Optional[Decimal] = None
    max_salary: Optional[Decimal] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DesignationOut(DesignationBase):
    id: int
    organization_id: int
    department_name: Optional[str] = None
    salary_grade_name: Optional[str] = None
    employees_count: int = 0
    positions_count: int = 0
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class DesignationPaginatedOut(BaseModel):
    items: List[DesignationOut]
    total: int
    limit: int
    offset: int


# =====================================================================
# --- Section 4, 5, 6: Position Management Schemas ---
# =====================================================================
class PositionBase(BaseModel):
    position_code: str
    position_title: str
    department_id: int
    designation_id: int
    salary_grade_id: Optional[int] = None
    reports_to_position_id: Optional[int] = None
    assigned_branch_id: Optional[int] = None
    assigned_project_id: Optional[int] = None
    position_type: str = "PERMANENT"  # PERMANENT, CONTRACTUAL, PROJECT_SITE
    status: str = "VACANT"  # APPROVED, FILLED, VACANT, ON_HOLD, FROZEN
    budgeted_salary: Decimal = Decimal("0.00")
    target_hire_date: Optional[date] = None
    approved_date: Optional[date] = None
    occupied_employee_id: Optional[int] = None
    remarks: Optional[str] = None

class PositionCreate(PositionBase):
    pass

class PositionUpdate(BaseModel):
    position_code: Optional[str] = None
    position_title: Optional[str] = None
    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    salary_grade_id: Optional[int] = None
    reports_to_position_id: Optional[int] = None
    assigned_branch_id: Optional[int] = None
    assigned_project_id: Optional[int] = None
    position_type: Optional[str] = None
    status: Optional[str] = None
    budgeted_salary: Optional[Decimal] = None
    target_hire_date: Optional[date] = None
    approved_date: Optional[date] = None
    occupied_employee_id: Optional[int] = None
    remarks: Optional[str] = None

class PositionOut(PositionBase):
    id: int
    organization_id: int
    department_name: Optional[str] = None
    designation_title: Optional[str] = None
    salary_grade_name: Optional[str] = None
    reports_to_title: Optional[str] = None
    branch_name: Optional[str] = None
    project_name: Optional[str] = None
    occupied_employee_name: Optional[str] = None
    occupied_employee_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class PositionPaginatedOut(BaseModel):
    items: List[PositionOut]
    total: int
    limit: int
    offset: int

class PositionStatsOut(BaseModel):
    total_approved: int
    total_filled: int
    total_vacant: int
    total_on_hold: int
    total_frozen: int
    budgeted_payroll_total: Decimal

class PositionOccupyPayload(BaseModel):
    employee_id: int
    effective_date: Optional[date] = None
    remarks: Optional[str] = None

