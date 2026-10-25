// =====================================================================
// --- Section Enterprise Attendance & Shift Management Models ---
// =====================================================================

// --- 2.1 Shift Management ---
export interface Shift {
  id: number;
  shift_name: string;
  shift_code: string;
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  shift_type?: 'FIXED' | 'ROTATING' | 'FLEXIBLE' | 'DAY' | 'EVENING' | 'NIGHT';
  break_start_time?: string;
  break_end_time?: string;
  break_duration_minutes: number;
  grace_period_minutes: number;
  half_day_minimum_minutes: number;
  full_day_minimum_minutes: number;
  is_night_shift: boolean;
  is_overtime_eligible?: boolean;
  weekly_off_days?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftCreatePayload {
  shift_name: string;
  shift_code: string;
  start_time: string;
  end_time: string;
  shift_type?: string;
  break_start_time?: string;
  break_end_time?: string;
  break_duration_minutes: number;
  grace_period_minutes: number;
  half_day_minimum_minutes: number;
  full_day_minimum_minutes: number;
  is_night_shift: boolean;
  is_overtime_eligible?: boolean;
  weekly_off_days?: string;
  is_active: boolean;
}

export interface ShiftPaginatedResponse {
  items: Shift[];
  total: number;
  limit: number;
  offset: number;
}

// --- 2.2 Shift Assignment ---
export interface ShiftAssignment {
  id: number;
  shift_id: number;
  shift_name?: string;
  shift_code?: string;
  assignment_type: 'EMPLOYEE' | 'DEPARTMENT' | 'PROJECT_SITE';
  employee_id?: number;
  department_id?: number;
  project_id?: number;
  target_name?: string;
  target_code?: string;
  target_photo_url?: string;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  remarks?: string;
  created_at?: string;
}

export interface ShiftAssignmentCreatePayload {
  shift_id: number;
  assignment_type: 'EMPLOYEE' | 'DEPARTMENT' | 'PROJECT_SITE';
  employee_id?: number;
  employee_ids?: number[];
  department_id?: number;
  project_id?: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  remarks?: string;
}

export interface ShiftAssignmentPaginatedResponse {
  items: ShiftAssignment[];
  total: number;
  limit: number;
  offset: number;
}

// --- 2.2.1 Shift Swap Request ---
export interface ShiftSwapRequest {
  id: number;
  requester_id: number;
  requester_name?: string;
  requester_code?: string;
  target_employee_id: number;
  target_employee_name?: string;
  target_employee_code?: string;
  swap_date: string;
  requester_shift_id?: number;
  requester_shift_name?: string;
  target_shift_id?: number;
  target_shift_name?: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by_id?: number;
  reviewed_by_name?: string;
  review_notes?: string;
  reviewed_at?: string;
  created_at?: string;
}

export interface ShiftSwapRequestCreatePayload {
  requester_id: number;
  target_employee_id: number;
  swap_date: string;
  requester_shift_id?: number;
  target_shift_id?: number;
  reason: string;
}

export interface ShiftSwapRequestReviewPayload {
  status: 'APPROVED' | 'REJECTED';
  review_notes?: string;
}

export interface ShiftSwapRequestPaginatedResponse {
  items: ShiftSwapRequest[];
  total: number;
  limit: number;
  offset: number;
}

// --- 2.3 Biometric Integration ---
export interface BiometricDevice {
  id: number;
  device_name: string;
  device_serial: string;
  device_model: string;
  ip_address: string;
  port: number;
  location: string;
  assigned_branch_id?: number;
  assigned_project_id?: number;
  branch_name?: string;
  project_name?: string;
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';
  is_active: boolean;
  last_sync_at?: string;
  created_at?: string;
}

export interface BiometricDeviceCreatePayload {
  device_name: string;
  device_serial: string;
  device_model: string;
  ip_address: string;
  port: number;
  location: string;
  assigned_branch_id?: number;
  assigned_project_id?: number;
  status?: string;
  is_active?: boolean;
}

export interface BiometricDevicePaginatedResponse {
  items: BiometricDevice[];
  total: number;
  limit: number;
  offset: number;
}

// --- 2.8 Holiday Calendar ---
export interface HolidayCalendar {
  id: number;
  holiday_name: string;
  holiday_type: 'WEEKLY_HOLIDAY' | 'PUBLIC_HOLIDAY' | 'COMPANY_HOLIDAY' | 'RELIGIOUS_HOLIDAY';
  start_date: string;
  end_date: string;
  total_days: number;
  applicable_branch_id?: number;
  applicable_project_id?: number;
  branch_name?: string;
  project_name?: string;
  is_recurring_yearly: boolean;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface HolidayCalendarCreatePayload {
  holiday_name: string;
  holiday_type: string;
  start_date: string;
  end_date: string;
  applicable_branch_id?: number;
  applicable_project_id?: number;
  is_recurring_yearly: boolean;
  description?: string;
  is_active: boolean;
}

export interface HolidayCalendarPaginatedResponse {
  items: HolidayCalendar[];
  total: number;
  limit: number;
  offset: number;
}

// --- 2.9 Site Geofence ---
export interface SiteGeofence {
  id: number;
  project_id: number;
  project_name?: string;
  site_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at?: string;
}

export interface SiteGeofenceCreatePayload {
  project_id: number;
  site_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export interface SiteGeofencePaginatedResponse {
  items: SiteGeofence[];
  total: number;
  limit: number;
  offset: number;
}

// --- 2.7 Attendance Correction ---
export interface AttendanceCorrection {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  attendance_id?: number;
  request_date: string;
  original_clock_in?: string;
  original_clock_out?: string;
  requested_clock_in: string;
  requested_clock_out: string;
  reason: string;
  manager_verifier_id?: number;
  manager_verifier_name?: string;
  manager_remarks?: string;
  manager_verified_at?: string;
  hr_approver_id?: number;
  hr_approver_name?: string;
  hr_remarks?: string;
  hr_approved_at?: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'APPROVED' | 'REJECTED';
  created_at?: string;
}

export interface AttendanceCorrectionCreatePayload {
  employee_id: number;
  attendance_id?: number;
  request_date: string;
  requested_clock_in: string;
  requested_clock_out: string;
  reason: string;
}

export interface AttendanceCorrectionPaginatedResponse {
  items: AttendanceCorrection[];
  total: number;
  limit: number;
  offset: number;
}

// --- 2.4, 2.5, 2.6, 2.10 Live Attendance & Reports ---
export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  designation_title?: string;
  shift_id?: number;
  shift_name?: string;
  punch_date: string;
  clock_in?: string;
  clock_out?: string;
  working_hours: number;
  late_minutes: number;
  early_leaving_minutes: number;
  overtime_hours: number;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE' | 'REST_DAY';
  source: 'BIOMETRIC_DEVICE' | 'WEB_PUNCH' | 'GPS_MOBILE' | 'MANUAL_OVERRIDE';
  is_missing_punch: boolean;
  is_anomaly: boolean;
  geofence_site_name?: string;
  is_geofence_verified: boolean;
  remarks?: string;
}

export interface AttendancePunchPayload {
  employee_id: number;
  punch_type: 'IN' | 'OUT' | 'PUNCH' | 'IN_OUT' | 'BOTH';
  punch_date?: string;
  punch_time?: string;
  in_time?: string;
  out_time?: string;
  source: string;
  geofence_lat?: number;
  geofence_lng?: number;
  site_id?: number;
  remarks?: string;
}

export interface AttendancePaginatedResponse {
  items: AttendanceRecord[];
  total: number;
  limit: number;
  offset: number;
  present_count: number;
  late_count: number;
  half_day_count: number;
  absent_count: number;
  on_leave_count: number;
  missing_punch_count: number;
}

export interface AttendanceDailySummary {
  date: string;
  total_employees: number;
  present: number;
  late: number;
  half_day: number;
  absent: number;
  on_leave: number;
  missing_punches: number;
  attendance_rate: number;
}

export interface AttendanceMonthlyClosingEmployeeItem {
  employee_id: number;
  employee_name: string;
  employee_code?: string;
  department_name?: string;
  designation_title?: string;
  working_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  late_count: number;
  approved_ot_hours: number;
  unpaid_leave_days: number;
  payable_days: number;
}

export interface AttendanceMonthlyClosingSummary {
  year: number;
  month: number;
  total_employees: number;
  total_working_days: number;
  total_present_man_days: number;
  total_absent_days: number;
  total_late_occurrences: number;
  total_unpaid_leave_days: number;
  total_approved_ot_hours: number;
  is_locked: boolean;
  locked_at?: string;
  locked_by?: string;
  items: AttendanceMonthlyClosingEmployeeItem[];
}

