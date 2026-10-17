import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
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
  loadLeaveTypes(filters: { is_active?: boolean; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<LeaveType>> {
    this.loadingTypes.set(true);
    let params = new HttpParams();
    if (filters.is_active !== undefined) params = params.set('is_active', filters.is_active.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedResponse<LeaveType>>(`${this.apiUrl}/leave-types`, { params }).pipe(
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
    return this.http.post<LeaveType>(`${this.apiUrl}/leave-types`, payload).pipe(
      tap(() => this.loadLeaveTypes().subscribe())
    );
  }

  updateLeaveType(id: number, payload: Partial<LeaveTypeCreate>): Observable<LeaveType> {
    return this.http.put<LeaveType>(`${this.apiUrl}/leave-types/${id}`, payload).pipe(
      tap(() => this.loadLeaveTypes().subscribe())
    );
  }

  deleteLeaveType(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/leave-types/${id}`).pipe(
      tap(() => this.loadLeaveTypes().subscribe())
    );
  }

  // --- 2.12 Leave Policy API ---
  loadLeavePolicies(filters: { leave_type_id?: number; effective_year?: number; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<LeavePolicy>> {
    this.loadingPolicies.set(true);
    let params = new HttpParams();
    if (filters.leave_type_id) params = params.set('leave_type_id', filters.leave_type_id.toString());
    if (filters.effective_year) params = params.set('effective_year', filters.effective_year.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedResponse<LeavePolicy>>(`${this.apiUrl}/leave-policies`, { params }).pipe(
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
    return this.http.post<LeavePolicy>(`${this.apiUrl}/leave-policies`, payload).pipe(
      tap(() => this.loadLeavePolicies().subscribe())
    );
  }

  updateLeavePolicy(id: number, payload: Partial<LeavePolicyCreate>): Observable<LeavePolicy> {
    return this.http.put<LeavePolicy>(`${this.apiUrl}/leave-policies/${id}`, payload).pipe(
      tap(() => this.loadLeavePolicies().subscribe())
    );
  }

  deleteLeavePolicy(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/leave-policies/${id}`).pipe(
      tap(() => this.loadLeavePolicies().subscribe())
    );
  }

  // --- 2.13 & 2.16 Leave Balances API ---
  loadLeaveBalances(filters: { employee_id?: number; leave_type_id?: number; year?: number; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<LeaveBalance>> {
    this.loadingBalances.set(true);
    let params = new HttpParams();
    if (filters.employee_id) params = params.set('employee_id', filters.employee_id.toString());
    if (filters.leave_type_id) params = params.set('leave_type_id', filters.leave_type_id.toString());
    if (filters.year) params = params.set('year', filters.year.toString());
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
    return this.http.post<LeaveBalance>(`${this.apiUrl}/leave-balances/import`, payload).pipe(
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
    return this.http.post<LeaveApplication>(`${this.apiUrl}/leave-applications/${id}/action`, payload).pipe(
      tap(() => {
        this.loadLeaveApplications().subscribe();
        this.loadLeaveBalances().subscribe();
      })
    );
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
}
