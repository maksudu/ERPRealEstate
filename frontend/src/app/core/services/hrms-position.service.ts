import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SalaryGrade,
  SalaryGradeCreatePayload,
  SalaryGradePaginatedResponse,
  Designation,
  DesignationCreatePayload,
  DesignationPaginatedResponse,
  Position,
  PositionCreatePayload,
  PositionPaginatedResponse,
  PositionStats
} from '../models/hrms-position.model';

@Injectable({
  providedIn: 'root'
})
export class HrmsPositionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms`;

  // Signals
  salaryGrades = signal<SalaryGrade[]>([]);
  salaryGradesTotal = signal<number>(0);

  designations = signal<Designation[]>([]);
  designationsTotal = signal<number>(0);

  positions = signal<Position[]>([]);
  positionsTotal = signal<number>(0);

  positionStats = signal<PositionStats | null>(null);
  isLoading = signal<boolean>(false);

  // =======================================================
  // 1. Salary Grades API
  // =======================================================
  loadSalaryGrades(params?: {
    limit?: number;
    offset?: number;
    employee_level?: string | null;
    is_active?: boolean | null;
    search?: string | null;
  }): Observable<SalaryGradePaginatedResponse> {
    this.isLoading.set(true);
    let httpParams = new HttpParams();
    if (params?.limit !== undefined) httpParams = httpParams.set('limit', params.limit);
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', params.offset);
    if (params?.employee_level) httpParams = httpParams.set('employee_level', params.employee_level);
    if (params?.is_active !== undefined && params?.is_active !== null) httpParams = httpParams.set('is_active', params.is_active);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<SalaryGradePaginatedResponse>(`${this.apiUrl}/salary-grades`, { params: httpParams }).pipe(
      tap({
        next: (res) => {
          this.salaryGrades.set(res.items);
          this.salaryGradesTotal.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  createSalaryGrade(payload: SalaryGradeCreatePayload): Observable<SalaryGrade> {
    return this.http.post<SalaryGrade>(`${this.apiUrl}/salary-grades`, payload).pipe(
      tap(() => this.loadSalaryGrades().subscribe())
    );
  }

  updateSalaryGrade(id: number, payload: Partial<SalaryGradeCreatePayload>): Observable<SalaryGrade> {
    return this.http.put<SalaryGrade>(`${this.apiUrl}/salary-grades/${id}`, payload).pipe(
      tap(() => this.loadSalaryGrades().subscribe())
    );
  }

  deleteSalaryGrade(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/salary-grades/${id}`).pipe(
      tap(() => this.loadSalaryGrades().subscribe())
    );
  }

  // =======================================================
  // 2. Designations API
  // =======================================================
  loadDesignations(params?: {
    limit?: number;
    offset?: number;
    department_id?: number | null;
    salary_grade_id?: number | null;
    employee_level?: string | null;
    is_active?: boolean | null;
    search?: string | null;
  }): Observable<DesignationPaginatedResponse> {
    this.isLoading.set(true);
    let httpParams = new HttpParams();
    if (params?.limit !== undefined) httpParams = httpParams.set('limit', params.limit);
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', params.offset);
    if (params?.department_id) httpParams = httpParams.set('department_id', params.department_id);
    if (params?.salary_grade_id) httpParams = httpParams.set('salary_grade_id', params.salary_grade_id);
    if (params?.employee_level) httpParams = httpParams.set('employee_level', params.employee_level);
    if (params?.is_active !== undefined && params?.is_active !== null) httpParams = httpParams.set('is_active', params.is_active);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<DesignationPaginatedResponse>(`${this.apiUrl}/designations`, { params: httpParams }).pipe(
      tap({
        next: (res) => {
          this.designations.set(res.items);
          this.designationsTotal.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  createDesignation(payload: DesignationCreatePayload): Observable<Designation> {
    return this.http.post<Designation>(`${this.apiUrl}/designations`, payload).pipe(
      tap(() => this.loadDesignations().subscribe())
    );
  }

  updateDesignation(id: number, payload: Partial<DesignationCreatePayload>): Observable<Designation> {
    return this.http.put<Designation>(`${this.apiUrl}/designations/${id}`, payload).pipe(
      tap(() => this.loadDesignations().subscribe())
    );
  }

  deleteDesignation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/designations/${id}`).pipe(
      tap(() => this.loadDesignations().subscribe())
    );
  }

  // =======================================================
  // 3. Position Management API
  // =======================================================
  loadPositionStats(): Observable<PositionStats> {
    return this.http.get<PositionStats>(`${this.apiUrl}/positions/stats`).pipe(
      tap(stats => this.positionStats.set(stats))
    );
  }

  loadPositions(params?: {
    limit?: number;
    offset?: number;
    department_id?: number | null;
    designation_id?: number | null;
    salary_grade_id?: number | null;
    status?: string | null;
    position_type?: string | null;
    project_id?: number | null;
    branch_id?: number | null;
    search?: string | null;
  }): Observable<PositionPaginatedResponse> {
    this.isLoading.set(true);
    let httpParams = new HttpParams();
    if (params?.limit !== undefined) httpParams = httpParams.set('limit', params.limit);
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', params.offset);
    if (params?.department_id) httpParams = httpParams.set('department_id', params.department_id);
    if (params?.designation_id) httpParams = httpParams.set('designation_id', params.designation_id);
    if (params?.salary_grade_id) httpParams = httpParams.set('salary_grade_id', params.salary_grade_id);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.position_type) httpParams = httpParams.set('position_type', params.position_type);
    if (params?.project_id) httpParams = httpParams.set('project_id', params.project_id);
    if (params?.branch_id) httpParams = httpParams.set('branch_id', params.branch_id);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<PositionPaginatedResponse>(`${this.apiUrl}/positions`, { params: httpParams }).pipe(
      tap({
        next: (res) => {
          this.positions.set(res.items);
          this.positionsTotal.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  createPosition(payload: PositionCreatePayload): Observable<Position> {
    return this.http.post<Position>(`${this.apiUrl}/positions`, payload).pipe(
      tap(() => {
        this.loadPositions().subscribe();
        this.loadPositionStats().subscribe();
      })
    );
  }

  updatePosition(id: number, payload: Partial<PositionCreatePayload>): Observable<Position> {
    return this.http.put<Position>(`${this.apiUrl}/positions/${id}`, payload).pipe(
      tap(() => {
        this.loadPositions().subscribe();
        this.loadPositionStats().subscribe();
      })
    );
  }

  deletePosition(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/positions/${id}`).pipe(
      tap(() => {
        this.loadPositions().subscribe();
        this.loadPositionStats().subscribe();
      })
    );
  }

  occupyPosition(id: number, payload: { employee_id: number; remarks?: string }): Observable<Position> {
    return this.http.patch<Position>(`${this.apiUrl}/positions/${id}/occupy`, payload).pipe(
      tap(() => {
        this.loadPositions().subscribe();
        this.loadPositionStats().subscribe();
      })
    );
  }

  vacatePosition(id: number, remarks?: string): Observable<Position> {
    let httpParams = new HttpParams();
    if (remarks) httpParams = httpParams.set('remarks', remarks);
    return this.http.patch<Position>(`${this.apiUrl}/positions/${id}/vacate`, null, { params: httpParams }).pipe(
      tap(() => {
        this.loadPositions().subscribe();
        this.loadPositionStats().subscribe();
      })
    );
  }
}
