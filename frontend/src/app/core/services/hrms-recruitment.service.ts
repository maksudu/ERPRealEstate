import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type RecruitmentType =
  | 'requisitions'
  | 'vacancies'
  | 'applicants'
  | 'interviews'
  | 'evaluations'
  | 'selection'
  | 'offer-letters'
  | 'appointment-letters'
  | 'joining-checklist'
  | 'onboarding';

export interface RecruitmentRecord {
  id: number;
  organization_id: number;
  record_type: RecruitmentType;
  code: string;
  title: string;
  department: string | null;
  status: string;
  details: Record<string, string | number | null>;
  created_at: string | null;
  updated_at: string | null;
}

export interface RecruitmentPage {
  items: RecruitmentRecord[];
  total: number;
  limit: number;
  offset: number;
}

export type RecruitmentPayload = Pick<RecruitmentRecord, 'code' | 'title' | 'department' | 'status' | 'details'>;

@Injectable({ providedIn: 'root' })
export class HrmsRecruitmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms/recruitment`;

  list(type: RecruitmentType, options: { limit: number; offset: number; search?: string; status?: string }): Observable<RecruitmentPage> {
    let params = new HttpParams().set('limit', options.limit).set('offset', options.offset);
    if (options.search) params = params.set('search', options.search);
    if (options.status) params = params.set('status', options.status);
    return this.http.get<RecruitmentPage>(`${this.apiUrl}/${type}`, { params });
  }

  create(type: RecruitmentType, payload: RecruitmentPayload): Observable<RecruitmentRecord> {
    return this.http.post<RecruitmentRecord>(`${this.apiUrl}/${type}`, payload);
  }

  update(type: RecruitmentType, id: number, payload: RecruitmentPayload): Observable<RecruitmentRecord> {
    return this.http.put<RecruitmentRecord>(`${this.apiUrl}/${type}/${id}`, payload);
  }

  delete(type: RecruitmentType, id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${type}/${id}`);
  }
}
