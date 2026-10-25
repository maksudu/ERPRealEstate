import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LeaveType,
  LeaveTypeCreate,
  LeavePolicy,
  LeavePolicyCreate,
  LeaveBalance,
  LeaveBalanceImport,
  LeaveApplication,
  LeaveApplicationCreate,
  LeaveApprovalAction,
  LeaveCalendarEvent,
  TeamAvailability,
  OvertimeRequest,
  OvertimeRequestCreate,
  OvertimeVerificationAction,
  OvertimeApprovalAction,
  PayrollInput,
  PayrollSyncRequest,
  PaginatedResponse
} from '../models/hrms-leave.model';

@Injectable({
  providedIn: 'root'
})
export class HrmsLeaveService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms`;

  // --- State Signals ---
  // 2.11 Leave Types
  leaveTypes = signal<LeaveType[]>([]);
  totalLeaveTypes = signal<number>(0);
  loadingTypes = signal<boolean>(false);

  // 2.12 Leave Policies
  leavePolicies = signal<LeavePolicy[]>([]);
  totalLeavePolicies = signal<number>(0);
  loadingPolicies = signal<boolean>(false);

  // 2.13 & 2.16 Leave Balances
  leaveBalances = signal<LeaveBalance[]>([]);
  totalLeaveBalances = signal<number>(0);
  loadingBalances = signal<boolean>(false);

  // 2.14 & 2.15 Leave Applications
  leaveApplications = signal<LeaveApplication[]>([]);
  totalLeaveApplications = signal<number>(0);
  loadingApplications = signal<boolean>(false);

  // 2.17 - 2.19 Overtime Requests
  overtimeRequests = signal<OvertimeRequest[]>([]);
  totalOvertimeRequests = signal<number>(0);
  loadingOvertime = signal<boolean>(false);

  // 2.20 Payroll Inputs
  payrollInputs = signal<PayrollInput[]>([]);
  totalPayrollInputs = signal<number>(0);
  loadingPayroll = signal<boolean>(false);

  // --- 2.11 Leave Types API ---
  loadLeaveTypes(filters: { is_active?: boolean; search?: string; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<LeaveType>> {
    this.loadingTypes.set(true);
    let params = new HttpParams();
    if (filters.is_active !== undefined) params = params.set('is_active', filters.is_active.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedResponse<any>>(`${this.apiUrl}/leave-types`, { params }).pipe(
      map(res => ({ ...res, items: res.items.map(item => this.toLegacyLeaveType(item)) })),
      tap({
        next: (res) => {
          this.leaveTypes.set(res.items);
          this.totalLeaveTypes.set(res.total);
          this.loadingTypes.set(false);
        },
        error: () => this.loadingTypes.set(false)
      })
    );
  }

  createLeaveType(payload: LeaveTypeCreate): Observable<LeaveType> {
    return this.http.post<any>(`${this.apiUrl}/leave-types`, this.leaveTypePayload(payload)).pipe(
      map(item => this.toLegacyLeaveType(item)),
      tap(() => this.loadLeaveTypes().subscribe())
    );
  }

  updateLeaveType(id: number, payload: Partial<LeaveTypeCreate>): Observable<LeaveType> {
    return this.http.put<any>(`${this.apiUrl}/leave-types/${id}`, this.leaveTypePayload(payload)).pipe(
      map(item => this.toLegacyLeaveType(item)),
      tap(() => this.loadLeaveTypes().subscribe())
    );
  }

  deleteLeaveType(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/leave-types/${id}`).pipe(
      tap(() => this.loadLeaveTypes().subscribe())
    );
  }

  // --- 2.12 Leave Policy API ---
  loadLeavePolicies(filters: { leave_type_id?: number; effective_year?: number; is_active?: boolean; search?: string; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<LeavePolicy>> {
    this.loadingPolicies.set(true);
    let params = new HttpParams();
    if (filters.leave_type_id) params = params.set('leave_type_id', filters.leave_type_id.toString());
    if (filters.is_active !== undefined) params = params.set('is_active', filters.is_active.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedResponse<any>>(`${this.apiUrl}/leave-policies`, { params }).pipe(
      map(res => ({ ...res, items: res.items.map(item => this.toLegacyLeavePolicy(item)) })),
      tap({
        next: (res) => {
          this.leavePolicies.set(res.items);
          this.totalLeavePolicies.set(res.total);
          this.loadingPolicies.set(false);
        },
        error: () => this.loadingPolicies.set(false)
      })
    );
  }

  createLeavePolicy(payload: LeavePolicyCreate): Observable<LeavePolicy> {
    return this.http.post<any>(`${this.apiUrl}/leave-policies`, this.leavePolicyPayload(payload)).pipe(
      map(item => this.toLegacyLeavePolicy(item)),
      tap(() => this.loadLeavePolicies().subscribe())
    );
  }

  updateLeavePolicy(id: number, payload: Partial<LeavePolicyCreate>): Observable<LeavePolicy> {
    return this.http.put<any>(`${this.apiUrl}/leave-policies/${id}`, this.leavePolicyPayload(payload)).pipe(
      map(item => this.toLegacyLeavePolicy(item)),
      tap(() => this.loadLeavePolicies().subscribe())
    );
  }

  deleteLeavePolicy(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/leave-policies/${id}`).pipe(
      tap(() => this.loadLeavePolicies().subscribe())
    );
  }

  // --- 2.13 & 2.16 Leave Balances API ---
  loadLeaveBalances(filters: { employee_id?: number; leave_type_id?: number; year?: number; search?: string; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<LeaveBalance>> {
    this.loadingBalances.set(true);
    let params = new HttpParams();
    if (filters.employee_id) params = params.set('employee_id', filters.employee_id.toString());
    if (filters.leave_type_id) params = params.set('leave_type_id', filters.leave_type_id.toString());
    if (filters.year) params = params.set('year', filters.year.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedResponse<LeaveBalance>>(`${this.apiUrl}/leave-balances`, { params }).pipe(
      tap({
        next: (res) => {
          this.leaveBalances.set(res.items);
          this.totalLeaveBalances.set(res.total);
          this.loadingBalances.set(false);
        },
        error: () => this.loadingBalances.set(false)
      })
    );
  }

  importLeaveBalance(payload: LeaveBalanceImport): Observable<LeaveBalance> {
    return this.http.post<LeaveBalance>(`${this.apiUrl}/leave-balances`, {
      employee_id: payload.employee_id,
      leave_type_id: payload.leave_type_id,
      year: payload.year,
      opening_balance: payload.opening_balance,
      carried_forward: payload.carried_forward
    }).pipe(
      tap(() => this.loadLeaveBalances().subscribe())
    );
  }

  // --- 2.14 & 2.15 Leave Applications API ---
  loadLeaveApplications(filters: { employee_id?: number; status?: string; start_date?: string; end_date?: string; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<LeaveApplication>> {
    this.loadingApplications.set(true);
    let params = new HttpParams();
    if (filters.employee_id) params = params.set('employee_id', filters.employee_id.toString());
    if (filters.status) params = params.set('status', filters.status);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedResponse<LeaveApplication>>(`${this.apiUrl}/leave-applications`, { params }).pipe(
      tap({
        next: (res) => {
          this.leaveApplications.set(res.items);
          this.totalLeaveApplications.set(res.total);
          this.loadingApplications.set(false);
        },
        error: () => this.loadingApplications.set(false)
      })
    );
  }

  createLeaveApplication(payload: LeaveApplicationCreate): Observable<LeaveApplication> {
    return this.http.post<LeaveApplication>(`${this.apiUrl}/leave-applications`, payload).pipe(
      tap(() => {
        this.loadLeaveApplications().subscribe();
        this.loadLeaveBalances().subscribe();
      })
    );
  }

  actionLeaveApplication(id: number, payload: LeaveApprovalAction): Observable<LeaveApplication> {
    const application = this.leaveApplications().find(item => item.id === id);
    const endpoint = payload.action === 'CANCEL'
      ? 'cancel'
      : payload.action === 'RECOMMEND'
        ? 'manager-review'
        : payload.action === 'APPROVE' || application?.status === 'PENDING_HR'
          ? 'hr-review'
          : 'manager-review';
    const actionPayload = endpoint === 'manager-review'
      ? { is_approved: payload.action === 'RECOMMEND', manager_remarks: payload.remarks || '' }
      : endpoint === 'hr-review'
        ? { is_approved: payload.action === 'APPROVE', hr_remarks: payload.remarks || '' }
        : {};
    return this.http.post<LeaveApplication>(`${this.apiUrl}/leave-applications/${id}/${endpoint}`, actionPayload).pipe(
      tap(() => {
        this.loadLeaveApplications().subscribe();
        this.loadLeaveBalances().subscribe();
      })
    );
  }

  loadLeaveCalendarEvents(month: number, year: number, departmentId?: number): Observable<LeaveCalendarEvent[]> {
    let params = new HttpParams().set('month', month.toString()).set('year', year.toString());
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<LeaveCalendarEvent[]>(`${this.apiUrl}/leave/calendar-events`, { params });
  }

  loadTeamAvailability(targetDate?: string, departmentId?: number): Observable<TeamAvailability> {
    let params = new HttpParams();
    if (targetDate) params = params.set('target_date', targetDate);
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<TeamAvailability>(`${this.apiUrl}/leave/team-availability`, { params });
  }

  // --- 2.17 - 2.19 Overtime Requests API ---
  loadOvertimeRequests(filters: { employee_id?: number; status?: string; ot_date?: string; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<OvertimeRequest>> {
    this.loadingOvertime.set(true);
    let params = new HttpParams();
    if (filters.employee_id) params = params.set('employee_id', filters.employee_id.toString());
    if (filters.status) params = params.set('status', filters.status);
    if (filters.ot_date) params = params.set('ot_date', filters.ot_date);
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedResponse<OvertimeRequest>>(`${this.apiUrl}/overtime-requests`, { params }).pipe(
      tap({
        next: (res) => {
          this.overtimeRequests.set(res.items);
          this.totalOvertimeRequests.set(res.total);
          this.loadingOvertime.set(false);
        },
        error: () => this.loadingOvertime.set(false)
      })
    );
  }

  createOvertimeRequest(payload: OvertimeRequestCreate): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(`${this.apiUrl}/overtime-requests`, payload).pipe(
      tap(() => this.loadOvertimeRequests().subscribe())
    );
  }

  verifyOvertimeRequest(id: number, payload: OvertimeVerificationAction): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(`${this.apiUrl}/overtime-requests/${id}/verify`, payload).pipe(
      tap(() => this.loadOvertimeRequests().subscribe())
    );
  }

  approveOvertimeRequest(id: number, payload: OvertimeApprovalAction): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(`${this.apiUrl}/overtime-requests/${id}/approve`, payload).pipe(
      tap(() => this.loadOvertimeRequests().subscribe())
    );
  }

  // --- 2.20 Payroll Integration API ---
  loadPayrollInputs(filters: { salary_month?: string; employee_id?: number; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<PayrollInput>> {
    this.loadingPayroll.set(true);
    let params = new HttpParams();
    if (filters.salary_month) params = params.set('salary_month', filters.salary_month);
    if (filters.employee_id) params = params.set('employee_id', filters.employee_id.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedResponse<PayrollInput>>(`${this.apiUrl}/payroll-inputs`, { params }).pipe(
      tap({
        next: (res) => {
          this.payrollInputs.set(res.items);
          this.totalPayrollInputs.set(res.total);
          this.loadingPayroll.set(false);
        },
        error: () => this.loadingPayroll.set(false)
      })
    );
  }

  syncPayrollInputs(payload: PayrollSyncRequest): Observable<{ message: string; salary_month: string; employees_synced: number; total_ot_hours: number; total_ot_amount: number; total_unpaid_leave_days: number }> {
    return this.http.post<{ message: string; salary_month: string; employees_synced: number; total_ot_hours: number; total_ot_amount: number; total_unpaid_leave_days: number }>(`${this.apiUrl}/payroll-inputs/sync`, payload).pipe(
      tap(() => this.loadPayrollInputs({ salary_month: payload.salary_month }).subscribe())
    );
  }

  private toLegacyLeaveType(item: any): LeaveType {
    return {
      ...item,
      type_code: item.leave_type_code,
      type_name: item.name_en,
      type_name_bn: item.name_bn,
      requires_attachment: item.requires_attachment ?? false
    } as LeaveType;
  }

  private leaveTypePayload(payload: Partial<LeaveTypeCreate>): Record<string, unknown> {
    return {
      leave_type_code: payload.type_code,
      name_en: payload.type_name,
      name_bn: payload.type_name_bn,
      is_paid: payload.is_paid,
      color_code: payload.color_code,
      description: payload.description,
      is_active: payload.is_active
    };
  }

  private toLegacyLeavePolicy(item: any): LeavePolicy {
    return {
      ...item,
      allow_encashment: item.encashment_allowed
    } as LeavePolicy;
  }

  private leavePolicyPayload(payload: Partial<LeavePolicyCreate>): Record<string, unknown> {
    const { allow_encashment, ...policy } = payload;
    delete policy.effective_year;
    return { ...policy, encashment_allowed: allow_encashment };
  }
}
