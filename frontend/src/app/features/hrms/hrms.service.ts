import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Department {
  id: number;
  department_code: string;
  name_en: string;
  name_bn?: string;
  head_of_dept_id?: number;
  is_active: boolean;
}

export interface Designation {
  id: number;
  department_id: number;
  designation_code: string;
  title_en: string;
  title_bn?: string;
  grade_level: string;
  min_salary: number;
  max_salary: number;
  is_active: boolean;
  department_name?: string;
}

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  official_email?: string;
  phone: string;
  personal_phone?: string;
  gender: string;
  date_of_birth?: string;
  nid_number?: string;
  tin_number?: string;
  blood_group?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  joining_date: string;
  probation_months: number;
  employment_type: string;
  workforce_category: string;
  status: string;
  department_id: number;
  designation_id: number;
  reporting_to_id?: number;
  assigned_project_id?: number;
  bank_account_no?: string;
  bank_name?: string;
  bank_branch?: string;
  routing_no?: string;
  basic_salary: number;
  house_rent_allowance: number;
  medical_allowance: number;
  conveyance_allowance: number;
  site_hazard_allowance: number;
  mobile_allowance: number;
  is_pf_eligible: boolean;
  is_tax_eligible: boolean;
  department_name?: string;
  designation_title?: string;
  assigned_project_name?: string;
  gross_salary?: number;
}

export interface Contractor {
  id: number;
  company_name: string;
  trade_license?: string;
  contact_person: string;
  phone: string;
  email?: string;
  tax_nid?: string;
  trade_specialization: string;
  daily_rate_default: number;
  is_active: boolean;
}

export interface MusterRollItem {
  id?: number;
  project_id: number;
  tower_id?: number;
  contractor_id: number;
  muster_date: string;
  shift: string;
  skill_type: string;
  headcount: number;
  standard_hours: number;
  overtime_hours: number;
  hourly_rate: number;
  overtime_rate: number;
  total_amount?: number;
  approval_status?: string;
  remarks?: string;
  project_name?: string;
  contractor_name?: string;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  punch_date: string;
  clock_in?: string;
  clock_out?: string;
  late_minutes: number;
  status: string;
  source: string;
}

export interface LeaveRecord {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  approval_remarks?: string;
  created_at?: string;
}

export interface PayrollRun {
  id: number;
  month: number;
  year: number;
  project_id?: number;
  project_name?: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: string;
  disbursement_date?: string;
  voucher_id?: number;
}

export interface Payslip {
  id: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  designation_title?: string;
  department_name?: string;
  basic_salary: number;
  house_rent: number;
  medical: number;
  conveyance: number;
  site_hazard_allowance: number;
  mobile_allowance: number;
  overtime_hours: number;
  overtime_amount: number;
  sales_commission: number;
  festival_bonus: number;
  gross_earnings: number;
  pf_deduction: number;
  tax_tds_deduction: number;
  advance_salary_deduction: number;
  loan_emi_deduction: number;
  total_deductions: number;
  net_payable: number;
  payment_status: string;
}

export interface HRCockpitStats {
  total_employees: number;
  corporate_headcount: number;
  site_engineering_headcount: number;
  today_present: number;
  today_late: number;
  today_absent: number;
  today_on_leave: number;
  attendance_rate_percent: number;
  active_labour_contractors: number;
  today_site_labour_count: number;
  today_site_labour_expense: number;
  monthly_payroll_liability: number;
}

@Injectable({
  providedIn: 'root'
})
export class HrmsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms`;

  // Reactive State Signals
  stats = signal<HRCockpitStats | null>(null);
  employees = signal<Employee[]>([]);
  departments = signal<Department[]>([]);
  designations = signal<Designation[]>([]);
  contractors = signal<Contractor[]>([]);
  musterRolls = signal<MusterRollItem[]>([]);
  attendances = signal<AttendanceRecord[]>([]);
  leaves = signal<LeaveRecord[]>([]);
  payrollRuns = signal<PayrollRun[]>([]);

  // Cockpit Stats
  loadStats(): Observable<HRCockpitStats> {
    return this.http.get<HRCockpitStats>(`${this.apiUrl}/stats`).pipe(
      tap(data => this.stats.set(data))
    );
  }

  // Departments
  loadDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.apiUrl}/departments`).pipe(
      tap(data => this.departments.set(data))
    );
  }

  // Designations
  loadDesignations(departmentId?: number): Observable<Designation[]> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId);
    return this.http.get<Designation[]>(`${this.apiUrl}/designations`, { params }).pipe(
      tap(data => this.designations.set(data))
    );
  }

  // Employees
  loadEmployees(category?: string, departmentId?: number, search?: string): Observable<Employee[]> {
    let params = new HttpParams().set('all', 'true');
    if (category) params = params.set('category', category);
    if (departmentId) params = params.set('department_id', departmentId);
    if (search) params = params.set('search', search);

    return this.http.get<any>(`${this.apiUrl}/employees`, { params }).pipe(
      map(res => (Array.isArray(res) ? res : (res?.items || [])) as Employee[]),
      tap(data => this.employees.set(data))
    );
  }

  createEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(`${this.apiUrl}/employees`, employee);
  }

  // Contractors
  loadContractors(): Observable<Contractor[]> {
    return this.http.get<Contractor[]>(`${this.apiUrl}/contractors`).pipe(
      tap(data => this.contractors.set(data))
    );
  }

  createContractor(contractor: Partial<Contractor>): Observable<Contractor> {
    return this.http.post<Contractor>(`${this.apiUrl}/contractors`, contractor);
  }

  // Labour Muster Roll
  loadMusterRoll(projectId?: number, musterDate?: string): Observable<MusterRollItem[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    if (musterDate) params = params.set('muster_date', musterDate);

    return this.http.get<MusterRollItem[]>(`${this.apiUrl}/muster-roll`, { params }).pipe(
      tap(data => this.musterRolls.set(data))
    );
  }

  createMusterBatch(items: MusterRollItem[]): Observable<{ status: string; records_created: number }> {
    return this.http.post<{ status: string; records_created: number }>(`${this.apiUrl}/muster-roll/batch`, { items });
  }

  // Attendance
  loadAttendance(punchDate?: string, employeeId?: number): Observable<AttendanceRecord[]> {
    let params = new HttpParams();
    if (punchDate) params = params.set('punch_date', punchDate);
    if (employeeId) params = params.set('employee_id', employeeId);

    return this.http.get<AttendanceRecord[]>(`${this.apiUrl}/attendance`, { params }).pipe(
      tap(data => this.attendances.set(data))
    );
  }

  punchAttendance(payload: { employee_id: number; punch_type: string; source: string; geofence_lat?: number; geofence_lng?: number; remarks?: string }): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.apiUrl}/attendance/punch`, payload);
  }

  // Leave
  loadLeaves(statusFilter?: string): Observable<LeaveRecord[]> {
    let params = new HttpParams();
    if (statusFilter) params = params.set('status_filter', statusFilter);

    return this.http.get<LeaveRecord[]>(`${this.apiUrl}/leave`, { params }).pipe(
      tap(data => this.leaves.set(data))
    );
  }

  applyLeave(payload: { employee_id: number; leave_type: string; start_date: string; end_date: string; reason: string }): Observable<LeaveRecord> {
    return this.http.post<LeaveRecord>(`${this.apiUrl}/leave/apply`, payload);
  }

  reviewLeave(leaveId: number, status: string, remarks?: string): Observable<LeaveRecord> {
    return this.http.put<LeaveRecord>(`${this.apiUrl}/leave/${leaveId}/review`, { status, approval_remarks: remarks });
  }

  // Payroll
  loadPayrollRuns(): Observable<PayrollRun[]> {
    return this.http.get<PayrollRun[]>(`${this.apiUrl}/payroll/runs`).pipe(
      tap(data => this.payrollRuns.set(data))
    );
  }

  generatePayroll(month: number, year: number, projectId?: number): Observable<PayrollRun> {
    return this.http.post<PayrollRun>(`${this.apiUrl}/payroll/generate`, {
      month,
      year,
      project_id: projectId || null
    });
  }

  getPayslips(runId: number): Observable<Payslip[]> {
    return this.http.get<Payslip[]>(`${this.apiUrl}/payroll/runs/${runId}/payslips`);
  }

  disbursePayroll(runId: number): Observable<PayrollRun> {
    return this.http.post<PayrollRun>(`${this.apiUrl}/payroll/runs/${runId}/disburse`, {});
  }
}
