import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type PerformanceType =
  | 'kpi-setup'
  | 'reviews'
  | 'cycles'
  | 'evaluations'
  | 'self-assessments'
  | 'training-plans'
  | 'training-attendance'
  | 'skill-matrix'
  | 'promotions'
  | 'increments';

export interface PerformanceRecord {
  id: number;
  organization_id: number;
  record_type: PerformanceType;
  reference: string;
  title: string;
  employee_id: number | null;
  employee_name: string | null;
  employee_code: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RETURNED';
  fiscal_year: string | null;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  score: number | null;
  details: Record<string, string | number | boolean | null>;
  created_by_id: number | null;
  approved_by_id: number | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PerformancePage {
  items: PerformanceRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface PerformancePayload {
  title: string;
  employee_id: number | null;
  fiscal_year: string | null;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  score: number | null;
  details: Record<string, string | number | boolean | null>;
}

export interface EmployeeOption {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  department_name?: string;
}

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms`;

  list(type: PerformanceType, options: {
    limit: number;
    offset: number;
    search?: string;
    status?: string;
    fiscal_year?: string;
  }): Observable<PerformancePage> {
    let params = new HttpParams()
      .set('limit', options.limit)
      .set('offset', options.offset);
    if (options.search) params = params.set('search', options.search);
    if (options.status) params = params.set('status', options.status);
    if (options.fiscal_year) params = params.set('fiscal_year', options.fiscal_year);
    return this.http.get<PerformancePage>(`${this.apiUrl}/performance/${type}`, { params });
  }

  get(type: PerformanceType, id: number): Observable<PerformanceRecord> {
    return this.http.get<PerformanceRecord>(`${this.apiUrl}/performance/${type}/${id}`);
  }

  create(type: PerformanceType, payload: PerformancePayload): Observable<PerformanceRecord> {
    return this.http.post<PerformanceRecord>(`${this.apiUrl}/performance/${type}`, payload);
  }

  update(type: PerformanceType, id: number, payload: PerformancePayload): Observable<PerformanceRecord> {
    return this.http.put<PerformanceRecord>(`${this.apiUrl}/performance/${type}/${id}`, payload);
  }

  transition(type: PerformanceType, id: number, action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'RETURN', remarks?: string): Observable<PerformanceRecord> {
    return this.http.post<PerformanceRecord>(
      `${this.apiUrl}/performance/${type}/${id}/transition`,
      { action, remarks: remarks || null },
    );
  }

  delete(type: PerformanceType, id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/performance/${type}/${id}`);
  }

  employees(): Observable<{ items: EmployeeOption[] }> {
    const params = new HttpParams().set('limit', 500).set('offset', 0).set('status', 'ACTIVE');
    return this.http.get<{ items: EmployeeOption[] }>(`${this.apiUrl}/employees`, { params });
  }
}
