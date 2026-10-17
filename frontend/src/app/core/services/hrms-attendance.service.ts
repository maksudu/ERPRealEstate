import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Shift,
  ShiftCreatePayload,
  ShiftPaginatedResponse,
  ShiftAssignment,
  ShiftAssignmentCreatePayload,
  ShiftAssignmentPaginatedResponse,
  BiometricDevice,
  BiometricDeviceCreatePayload,
  BiometricDevicePaginatedResponse,
  HolidayCalendar,
  HolidayCalendarCreatePayload,
  HolidayCalendarPaginatedResponse,
  SiteGeofence,
  SiteGeofenceCreatePayload,
  SiteGeofencePaginatedResponse,
  AttendanceCorrection,
  AttendanceCorrectionCreatePayload,
  AttendanceCorrectionPaginatedResponse,
  AttendanceRecord,
  AttendancePunchPayload,
  AttendancePaginatedResponse,
  AttendanceDailySummary
} from '../models/hrms-attendance.model';

@Injectable({
  providedIn: 'root'
})
export class HrmsAttendanceService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms`;

  // --- State Signals ---
  // Shifts
  shifts = signal<Shift[]>([]);
  totalShifts = signal<number>(0);

  // Shift Assignments
  shiftAssignments = signal<ShiftAssignment[]>([]);
  totalShiftAssignments = signal<number>(0);

  // Biometric Devices
  biometricDevices = signal<BiometricDevice[]>([]);
  totalBiometricDevices = signal<number>(0);

  // Holidays
  holidays = signal<HolidayCalendar[]>([]);
  totalHolidays = signal<number>(0);

  // Geofences
  siteGeofences = signal<SiteGeofence[]>([]);
  totalSiteGeofences = signal<number>(0);

  // Corrections
  attendanceCorrections = signal<AttendanceCorrection[]>([]);
  totalCorrections = signal<number>(0);

  // Live Daily Attendance
  attendanceRecords = signal<AttendanceRecord[]>([]);
  totalAttendance = signal<number>(0);
  dailySummary = signal<AttendanceDailySummary | null>(null);
  missingPunches = signal<AttendanceRecord[]>([]);

  // Stats Counters
  presentCount = signal<number>(0);
  lateCount = signal<number>(0);
  halfDayCount = signal<number>(0);
  absentCount = signal<number>(0);
  onLeaveCount = signal<number>(0);
  missingPunchCount = signal<number>(0);

  isLoading = signal<boolean>(false);

  // =====================================================================
  // --- 2.1 Shift Management ---
  // =====================================================================
  loadShifts(params: { search?: string; is_active?: boolean; limit?: number; offset?: number } = {}): Observable<ShiftPaginatedResponse> {
    this.isLoading.set(true);
    let p = new HttpParams()
      .set('limit', String(params.limit ?? 20))
      .set('offset', String(params.offset ?? 0));
    if (params.search) p = p.set('search', params.search);
    if (params.is_active !== undefined) p = p.set('is_active', String(params.is_active));

    return this.http.get<ShiftPaginatedResponse>(`${this.apiUrl}/shifts`, { params: p }).pipe(
      tap({
        next: (res) => {
          this.shifts.set(res.items);
          this.totalShifts.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  createShift(payload: ShiftCreatePayload): Observable<Shift> {
    return this.http.post<Shift>(`${this.apiUrl}/shifts`, payload);
  }

  updateShift(id: number, payload: Partial<ShiftCreatePayload>): Observable<Shift> {
    return this.http.put<Shift>(`${this.apiUrl}/shifts/${id}`, payload);
  }

  deleteShift(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/shifts/${id}`);
  }

  // =====================================================================
  // --- 2.2 Shift Assignment ---
  // =====================================================================
  loadShiftAssignments(params: {
    shift_id?: number;
    assignment_type?: string;
    employee_id?: number;
    department_id?: number;
    limit?: number;
    offset?: number;
  } = {}): Observable<ShiftAssignmentPaginatedResponse> {
    this.isLoading.set(true);
    let p = new HttpParams()
      .set('limit', String(params.limit ?? 20))
      .set('offset', String(params.offset ?? 0));
    if (params.shift_id) p = p.set('shift_id', String(params.shift_id));
    if (params.assignment_type) p = p.set('assignment_type', params.assignment_type);
    if (params.employee_id) p = p.set('employee_id', String(params.employee_id));
    if (params.department_id) p = p.set('department_id', String(params.department_id));

    return this.http.get<ShiftAssignmentPaginatedResponse>(`${this.apiUrl}/shift-assignments`, { params: p }).pipe(
      tap({
        next: (res) => {
          this.shiftAssignments.set(res.items);
          this.totalShiftAssignments.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  createShiftAssignment(payload: ShiftAssignmentCreatePayload): Observable<ShiftAssignment> {
    return this.http.post<ShiftAssignment>(`${this.apiUrl}/shift-assignments`, payload);
  }

  deleteShiftAssignment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/shift-assignments/${id}`);
  }

  // =====================================================================
  // --- 2.3 Biometric Integration ---
  // =====================================================================
  loadBiometricDevices(params: { search?: string; status?: string; limit?: number; offset?: number } = {}): Observable<BiometricDevicePaginatedResponse> {
    this.isLoading.set(true);
    let p = new HttpParams()
      .set('limit', String(params.limit ?? 20))
      .set('offset', String(params.offset ?? 0));
    if (params.search) p = p.set('search', params.search);
    if (params.status) p = p.set('status', params.status);

    return this.http.get<BiometricDevicePaginatedResponse>(`${this.apiUrl}/biometric-devices`, { params: p }).pipe(
      tap({
        next: (res) => {
          this.biometricDevices.set(res.items);
          this.totalBiometricDevices.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  createBiometricDevice(payload: BiometricDeviceCreatePayload): Observable<BiometricDevice> {
    return this.http.post<BiometricDevice>(`${this.apiUrl}/biometric-devices`, payload);
  }

  updateBiometricDevice(id: number, payload: Partial<BiometricDeviceCreatePayload>): Observable<BiometricDevice> {
    return this.http.put<BiometricDevice>(`${this.apiUrl}/biometric-devices/${id}`, payload);
  }

  deleteBiometricDevice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/biometric-devices/${id}`);
  }

  testDeviceConnection(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/biometric-devices/${id}/test-connection`, {});
  }

  syncBiometricDevice(id: number, logRecords?: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/biometric-devices/${id}/sync`, {
      device_id: id,
      log_records: logRecords
    });
  }

  // =====================================================================
  // --- 2.8 Holiday Calendar ---
  // =====================================================================
  loadHolidays(params: { year?: number; holiday_type?: string; is_active?: boolean; limit?: number; offset?: number } = {}): Observable<HolidayCalendarPaginatedResponse> {
    this.isLoading.set(true);
    let p = new HttpParams()
      .set('limit', String(params.limit ?? 50))
      .set('offset', String(params.offset ?? 0));
    if (params.year) p = p.set('year', String(params.year));
    if (params.holiday_type) p = p.set('holiday_type', params.holiday_type);
    if (params.is_active !== undefined) p = p.set('is_active', String(params.is_active));

    return this.http.get<HolidayCalendarPaginatedResponse>(`${this.apiUrl}/holidays`, { params: p }).pipe(
      tap({
        next: (res) => {
          this.holidays.set(res.items);
          this.totalHolidays.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  createHoliday(payload: HolidayCalendarCreatePayload): Observable<HolidayCalendar> {
    return this.http.post<HolidayCalendar>(`${this.apiUrl}/holidays`, payload);
  }

  updateHoliday(id: number, payload: Partial<HolidayCalendarCreatePayload>): Observable<HolidayCalendar> {
    return this.http.put<HolidayCalendar>(`${this.apiUrl}/holidays/${id}`, payload);
  }

  deleteHoliday(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/holidays/${id}`);
  }

  // =====================================================================
  // --- 2.9 Site Geofence ---
  // =====================================================================
  loadSiteGeofences(params: { project_id?: number; limit?: number; offset?: number } = {}): Observable<SiteGeofencePaginatedResponse> {
    this.isLoading.set(true);
    let p = new HttpParams()
      .set('limit', String(params.limit ?? 20))
      .set('offset', String(params.offset ?? 0));
    if (params.project_id) p = p.set('project_id', String(params.project_id));

    return this.http.get<SiteGeofencePaginatedResponse>(`${this.apiUrl}/site-geofences`, { params: p }).pipe(
      tap({
        next: (res) => {
          this.siteGeofences.set(res.items);
          this.totalSiteGeofences.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  createSiteGeofence(payload: SiteGeofenceCreatePayload): Observable<SiteGeofence> {
    return this.http.post<SiteGeofence>(`${this.apiUrl}/site-geofences`, payload);
  }

  updateSiteGeofence(id: number, payload: Partial<SiteGeofenceCreatePayload>): Observable<SiteGeofence> {
    return this.http.put<SiteGeofence>(`${this.apiUrl}/site-geofences/${id}`, payload);
  }

  deleteSiteGeofence(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/site-geofences/${id}`);
  }

  // =====================================================================
  // --- 2.7 Attendance Correction ---
  // =====================================================================
  loadAttendanceCorrections(params: { status?: string; employee_id?: number; limit?: number; offset?: number } = {}): Observable<AttendanceCorrectionPaginatedResponse> {
    this.isLoading.set(true);
    let p = new HttpParams()
      .set('limit', String(params.limit ?? 20))
      .set('offset', String(params.offset ?? 0));
    if (params.status) p = p.set('status', params.status);
    if (params.employee_id) p = p.set('employee_id', String(params.employee_id));

    return this.http.get<AttendanceCorrectionPaginatedResponse>(`${this.apiUrl}/attendance-corrections`, { params: p }).pipe(
      tap({
        next: (res) => {
          this.attendanceCorrections.set(res.items);
          this.totalCorrections.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  requestCorrection(payload: AttendanceCorrectionCreatePayload): Observable<AttendanceCorrection> {
    return this.http.post<AttendanceCorrection>(`${this.apiUrl}/attendance-corrections`, payload);
  }

  verifyCorrection(id: number, managerRemarks: string, isApproved: boolean): Observable<AttendanceCorrection> {
    return this.http.post<AttendanceCorrection>(`${this.apiUrl}/attendance-corrections/${id}/verify`, {
      manager_remarks: managerRemarks,
      is_approved: isApproved
    });
  }

  approveCorrection(id: number, hrRemarks: string, isApproved: boolean): Observable<AttendanceCorrection> {
    return this.http.post<AttendanceCorrection>(`${this.apiUrl}/attendance-corrections/${id}/approve`, {
      hr_remarks: hrRemarks,
      is_approved: isApproved
    });
  }

  // =====================================================================
  // --- 2.4, 2.5, 2.6, 2.10 Live Attendance & Reports ---
  // =====================================================================
  loadAttendance(params: {
    punch_date?: string;
    employee_id?: number;
    department_id?: number;
    shift_id?: number;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Observable<AttendancePaginatedResponse> {
    this.isLoading.set(true);
    let p = new HttpParams()
      .set('limit', String(params.limit ?? 20))
      .set('offset', String(params.offset ?? 0));
    if (params.punch_date) p = p.set('punch_date', params.punch_date);
    if (params.employee_id) p = p.set('employee_id', String(params.employee_id));
    if (params.department_id) p = p.set('department_id', String(params.department_id));
    if (params.shift_id) p = p.set('shift_id', String(params.shift_id));
    if (params.status) p = p.set('status', params.status);
    if (params.search) p = p.set('search', params.search);

    return this.http.get<AttendancePaginatedResponse>(`${this.apiUrl}/attendance`, { params: p }).pipe(
      tap({
        next: (res) => {
          this.attendanceRecords.set(res.items);
          this.totalAttendance.set(res.total);
          this.presentCount.set(res.present_count);
          this.lateCount.set(res.late_count);
          this.halfDayCount.set(res.half_day_count);
          this.absentCount.set(res.absent_count);
          this.onLeaveCount.set(res.on_leave_count);
          this.missingPunchCount.set(res.missing_punch_count);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  punchAttendance(payload: AttendancePunchPayload): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.apiUrl}/attendance/punch`, payload);
  }

  processDailyAttendance(processDate: string, departmentId?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/attendance/process`, {
      process_date: processDate,
      department_id: departmentId
    });
  }

  loadMissingPunches(dateFrom?: string, dateTo?: string, departmentId?: number): Observable<AttendanceRecord[]> {
    let p = new HttpParams();
    if (dateFrom) p = p.set('date_from', dateFrom);
    if (dateTo) p = p.set('date_to', dateTo);
    if (departmentId) p = p.set('department_id', String(departmentId));

    return this.http.get<AttendanceRecord[]>(`${this.apiUrl}/attendance/missing-punches`, { params: p }).pipe(
      tap((items) => this.missingPunches.set(items))
    );
  }

  loadDailySummary(targetDate?: string): Observable<AttendanceDailySummary> {
    let p = new HttpParams();
    if (targetDate) p = p.set('target_date', targetDate);

    return this.http.get<AttendanceDailySummary>(`${this.apiUrl}/attendance/daily-summary`, { params: p }).pipe(
      tap((summary) => this.dailySummary.set(summary))
    );
  }
}
