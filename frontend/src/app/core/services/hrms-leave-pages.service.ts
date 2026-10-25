import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeavePageResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export type LeavePageSection = 'types' | 'policies' | 'entitlements' | 'applications' | 'approvals';

@Injectable({ providedIn: 'root' })
export class HrmsLeavePagesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms`;

  private params(filters: Record<string, string | number | boolean | null | undefined>): HttpParams {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }

  list(section: LeavePageSection, filters: Record<string, string | number | boolean | null | undefined>): Observable<LeavePageResult<any>> {
    const endpoint = section === 'types' ? 'leave-types'
      : section === 'policies' ? 'leave-policies'
        : section === 'entitlements' ? 'leave-balances'
          : 'leave-applications';
    return this.http.get<LeavePageResult<any>>(`${this.apiUrl}/${endpoint}`, { params: this.params(filters) });
  }

  get(section: LeavePageSection, id: number): Observable<any> {
    const endpoint = section === 'types' ? 'leave-types'
      : section === 'policies' ? 'leave-policies'
        : section === 'entitlements' ? 'leave-balances'
          : 'leave-applications';
    return this.http.get<any>(`${this.apiUrl}/${endpoint}/${id}`);
  }

  create(section: LeavePageSection, payload: Record<string, any>): Observable<any> {
    const endpoint = section === 'types' ? 'leave-types'
      : section === 'policies' ? 'leave-policies'
        : section === 'entitlements' ? 'leave-balances'
          : 'leave-applications';
    return this.http.post<any>(`${this.apiUrl}/${endpoint}`, payload);
  }

  update(section: LeavePageSection, id: number, payload: Record<string, any>): Observable<any> {
    const endpoint = section === 'types' ? 'leave-types'
      : section === 'policies' ? 'leave-policies'
        : section === 'entitlements' ? 'leave-balances'
          : 'leave-applications';
    return this.http.put<any>(`${this.apiUrl}/${endpoint}/${id}`, payload);
  }

  delete(section: LeavePageSection, id: number): Observable<void> {
    const endpoint = section === 'types' ? 'leave-types'
      : section === 'policies' ? 'leave-policies'
        : section === 'entitlements' ? 'leave-balances'
          : 'leave-applications';
    return this.http.delete<void>(`${this.apiUrl}/${endpoint}/${id}`);
  }

  review(id: number, tier: 'manager' | 'hr', approved: boolean, remarks: string): Observable<any> {
    const endpoint = tier === 'manager' ? 'manager-review' : 'hr-review';
    const payload = tier === 'manager'
      ? { is_approved: approved, manager_remarks: remarks }
      : { is_approved: approved, hr_remarks: remarks };
    return this.http.post<any>(`${this.apiUrl}/leave-applications/${id}/${endpoint}`, payload);
  }

  cancel(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/leave-applications/${id}/cancel`, {});
  }

  listHolidays(filters: Record<string, string | number | boolean | null | undefined>): Observable<LeavePageResult<any>> {
    return this.http.get<LeavePageResult<any>>(`${this.apiUrl}/holidays`, { params: this.params(filters) });
  }

  getHoliday(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/holidays/${id}`);
  }

  saveHoliday(payload: Record<string, any>, id?: number): Observable<any> {
    return id
      ? this.http.put<any>(`${this.apiUrl}/holidays/${id}`, payload)
      : this.http.post<any>(`${this.apiUrl}/holidays`, payload);
  }

  deleteHoliday(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/holidays/${id}`);
  }

  listEncashments(filters: Record<string, string | number | boolean | null | undefined>): Observable<LeavePageResult<any>> {
    return this.http.get<LeavePageResult<any>>(`${this.apiUrl}/leave-encashments`, { params: this.params(filters) });
  }

  getEncashment(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/leave-encashments/${id}`);
  }

  saveEncashment(payload: Record<string, any>, id?: number): Observable<any> {
    return id
      ? this.http.put<any>(`${this.apiUrl}/leave-encashments/${id}`, payload)
      : this.http.post<any>(`${this.apiUrl}/leave-encashments`, payload);
  }

  deleteEncashment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/leave-encashments/${id}`);
  }

  encashmentAction(id: number, action: 'approve' | 'archive' | 'reverse'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/leave-encashments/${id}/${action}`, {});
  }
}
