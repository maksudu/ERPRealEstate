// =====================================================================
// --- Section 2.11 - 2.20: Enterprise Leave & Overtime Management Models ---
// =====================================================================

// --- 2.11 Leave Type Setup ---
export interface LeaveType {
  id: number;
  type_code: string;
  type_name: string;
  type_name_bn?: string;
  is_paid: boolean;
  requires_attachment: boolean;
  color_code?: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface LeaveTypeCreate {
  type_code: string;
  type_name: string;
  type_name_bn?: string;
  is_paid?: boolean;
  requires_attachment?: boolean;
  color_code?: string;
  description?: string;
  is_active?: boolean;
}

// --- 2.12 Leave Policy ---
export interface LeavePolicy {
  id: number;
  leave_type_id: number;
  leave_type_name?: string;
  leave_type_code?: string;
  is_paid?: boolean;
  policy_name: string;
  effective_year: number;
  annual_entitlement_days: number;
  accrual_frequency: 'YEARLY' | 'MONTHLY' | 'PRO_RATA';
  max_carry_forward_days: number;
  carry_forward_expiry_months: number;
  allow_encashment: boolean;
  max_encashment_days: number;
  min_service_days_required: number;
  gender_applicability: 'ALL' | 'MALE' | 'FEMALE';
  is_active: boolean;
  created_at?: string;
}

export interface LeavePolicyCreate {
  leave_type_id: number;
  policy_name: string;
  effective_year?: number;
  annual_entitlement_days: number;
  accrual_frequency?: 'YEARLY' | 'MONTHLY' | 'PRO_RATA';
  max_carry_forward_days?: number;
  carry_forward_expiry_months?: number;
  allow_encashment?: boolean;
  max_encashment_days?: number;
  min_service_days_required?: number;
  gender_applicability?: 'ALL' | 'MALE' | 'FEMALE';
  is_active?: boolean;
}

// --- 2.13 & 2.16 Leave Balance ---
export interface LeaveBalance {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  leave_type_id: number;
  leave_type_name?: string;
  leave_type_code?: string;
  year: number;
  opening_balance: number;
  carried_forward: number;
  accrued_days: number;
  used_days: number;
  pending_days: number;
  encashed_days: number;
  available_days: number;
  last_updated?: string;
}

export interface LeaveBalanceImport {
  employee_id: number;
  leave_type_id: number;
  year?: number;
  opening_balance?: number;
  carried_forward?: number;
  accrued_days?: number;
  used_days?: number;
  pending_days?: number;
  encashed_days?: number;
}

// --- 2.14 & 2.15 Leave Application & Approval ---
export interface LeaveApplication {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  leave_type_id?: number;
  leave_type?: string;
  leave_type_name?: string;
  leave_type_code?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day?: boolean;
  half_day_session?: string;
  reason?: string;
  emergency_contact?: string;
  document_url?: string;
  status: 'DRAFT' | 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  manager_approver_id?: number;
  manager_approver_name?: string;
  manager_remarks?: string;
  manager_action_at?: string;
  hr_approver_id?: number;
  hr_approver_name?: string;
  hr_remarks?: string;
  hr_action_at?: string;
  is_paid: boolean;
  created_at?: string;
}

export interface LeaveApplicationCreate {
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  is_half_day?: boolean;
  half_day_session?: string;
  reason?: string;
  emergency_contact?: string;
  document_url?: string;
}

export interface LeaveApprovalAction {
  action: 'RECOMMEND' | 'APPROVE' | 'REJECT' | 'CANCEL';
  remarks?: string;
}

export interface LeaveCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  event_type: 'LEAVE' | 'HOLIDAY';
  employee_id?: number;
  employee_name?: string;
  department_name?: string;
  status?: string;
  color?: string;
  is_half_day?: boolean;
}

export interface TeamAvailabilityItem {
  employee_id: number;
  employee_name: string;
  employee_code?: string;
  department_name?: string;
  status: 'AVAILABLE' | 'ON_LEAVE' | 'HALF_DAY_LEAVE' | 'WEEKLY_OFF';
  leave_type?: string;
  shift_name?: string;
}

export interface TeamAvailability {
  date: string;
  total_employees: number;
  available_count: number;
  on_leave_count: number;
  items: TeamAvailabilityItem[];
}

// --- 2.17, 2.18, 2.19 Overtime Request, Verification & Approval ---
export interface OvertimeRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  project_id?: number;
  project_name?: string;
  ot_date: string;
  requested_hours: number;
  verified_hours: number;
  ot_type: 'NORMAL_OT' | 'WEEKEND_OT' | 'HOLIDAY_OT';
  task_description?: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'SYNCED_PAYROLL';
  verified_by?: number;
  verifier_name?: string;
  verified_at?: string;
  verification_remarks?: string;
  approved_by?: number;
  approver_name?: string;
  approved_at?: string;
  approval_remarks?: string;
  hourly_rate_multiplier: number;
  calculated_amount: number;
  created_at?: string;
}

export interface OvertimeRequestCreate {
  employee_id: number;
  project_id?: number;
  ot_date: string;
  requested_hours: number;
  ot_type?: 'NORMAL_OT' | 'WEEKEND_OT' | 'HOLIDAY_OT';
  task_description?: string;
}

export interface OvertimeVerificationAction {
  verified_hours: number;
  remarks?: string;
  action: 'VERIFY' | 'REJECT';
}

export interface OvertimeApprovalAction {
  approved_hours?: number;
  hourly_rate_multiplier?: number;
  remarks?: string;
  action: 'APPROVE' | 'REJECT';
}

// --- 2.20 Payroll Integration ---
export interface PayrollInput {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  salary_month: string; // YYYY-MM
  approved_ot_hours: number;
  calculated_ot_amount: number;
  unpaid_leave_days: number;
  paid_leave_days: number;
  is_processed_in_payroll: boolean;
  payroll_run_id?: number;
  synced_at?: string;
}

export interface PayrollSyncRequest {
  salary_month: string; // YYYY-MM
}

// --- Pagination Generic / Responses ---
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
