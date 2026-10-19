import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthorityClearance,
  ClearanceCondition,
  ClearanceRenewalCalendarItem,
  CourtCase,
  CourtCaseDocument,
  CourtCaseHearing,
  LegalComplianceMetrics,
  LegalAuditPage,
  LegalDashboard,
  LegalRecord,
  LegalRecordPage
} from '../models/legal.model';

@Injectable({
  providedIn: 'root'
})
export class LegalService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/legal`;

  // 1. Executive Summary Metrics
  getMetrics(): Observable<LegalComplianceMetrics> {
    return this.http.get<LegalComplianceMetrics>(`${this.baseUrl}/metrics`);
  }

  // 2. Statutory Clearances & Building Sanctions
  getPermits(params?: {
    project_id?: number;
    authority_name?: string;
    clearance_type?: string;
    status_filter?: string;
  }): Observable<AuthorityClearance[]> {
    let httpParams = new HttpParams();
    if (params?.project_id) httpParams = httpParams.set('project_id', params.project_id);
    if (params?.authority_name && params.authority_name !== 'ALL') httpParams = httpParams.set('authority_name', params.authority_name);
    if (params?.clearance_type && params.clearance_type !== 'ALL') httpParams = httpParams.set('clearance_type', params.clearance_type);
    if (params?.status_filter && params.status_filter !== 'ALL') httpParams = httpParams.set('status_filter', params.status_filter);

    return this.http.get<AuthorityClearance[]>(`${this.baseUrl}/permits`, { params: httpParams });
  }

  createPermit(payload: Partial<AuthorityClearance>): Observable<AuthorityClearance> {
    return this.http.post<AuthorityClearance>(`${this.baseUrl}/permits`, payload);
  }

  updatePermit(id: number, payload: Partial<AuthorityClearance>): Observable<AuthorityClearance> {
    return this.http.patch<AuthorityClearance>(`${this.baseUrl}/permits/${id}`, payload);
  }

  // 3. Condition Checklist
  getPermitConditions(permitId: number): Observable<ClearanceCondition[]> {
    return this.http.get<ClearanceCondition[]>(`${this.baseUrl}/permits/${permitId}/conditions`);
  }

  addPermitCondition(permitId: number, payload: Partial<ClearanceCondition>): Observable<ClearanceCondition> {
    return this.http.post<ClearanceCondition>(`${this.baseUrl}/permits/${permitId}/conditions`, payload);
  }

  updatePermitCondition(condId: number, payload: Partial<ClearanceCondition>): Observable<ClearanceCondition> {
    return this.http.patch<ClearanceCondition>(`${this.baseUrl}/permits/conditions/${condId}`, payload);
  }

  // 4. Renewal Calendar
  getRenewalCalendar(): Observable<ClearanceRenewalCalendarItem[]> {
    return this.http.get<ClearanceRenewalCalendarItem[]>(`${this.baseUrl}/permits/renewal-calendar`);
  }

  // 5. Litigation & Land Dispute Tracking
  getCases(params?: {
    project_id?: number;
    case_type?: string;
    dispute_category?: string;
    is_stay_active?: boolean;
    status_filter?: string;
  }): Observable<CourtCase[]> {
    let httpParams = new HttpParams();
    if (params?.project_id) httpParams = httpParams.set('project_id', params.project_id);
    if (params?.case_type && params.case_type !== 'ALL') httpParams = httpParams.set('case_type', params.case_type);
    if (params?.dispute_category && params.dispute_category !== 'ALL') httpParams = httpParams.set('dispute_category', params.dispute_category);
    if (params?.is_stay_active !== undefined) httpParams = httpParams.set('is_stay_active', params.is_stay_active);
    if (params?.status_filter && params.status_filter !== 'ALL') httpParams = httpParams.set('status_filter', params.status_filter);

    return this.http.get<CourtCase[]>(`${this.baseUrl}/cases`, { params: httpParams });
  }

  getCase(id: number): Observable<CourtCase> {
    return this.http.get<CourtCase>(`${this.baseUrl}/cases/${id}`);
  }

  createCase(payload: Partial<CourtCase>): Observable<CourtCase> {
    return this.http.post<CourtCase>(`${this.baseUrl}/cases`, payload);
  }

  updateCase(id: number, payload: Partial<CourtCase>): Observable<CourtCase> {
    return this.http.patch<CourtCase>(`${this.baseUrl}/cases/${id}`, payload);
  }

  // 6. Digital Safe Documents Archive
  getCaseDocuments(caseId: number): Observable<CourtCaseDocument[]> {
    return this.http.get<CourtCaseDocument[]>(`${this.baseUrl}/cases/${caseId}/documents`);
  }

  uploadCaseDocument(caseId: number, payload: Partial<CourtCaseDocument>): Observable<CourtCaseDocument> {
    return this.http.post<CourtCaseDocument>(`${this.baseUrl}/cases/${caseId}/documents`, payload);
  }

  // 7. Court Hearing Diary
  getCaseHearings(caseId: number): Observable<CourtCaseHearing[]> {
    return this.http.get<CourtCaseHearing[]>(`${this.baseUrl}/cases/${caseId}/hearings`);
  }

  recordCaseHearing(caseId: number, payload: Partial<CourtCaseHearing>): Observable<CourtCaseHearing> {
    return this.http.post<CourtCaseHearing>(`${this.baseUrl}/cases/${caseId}/hearings`, payload);
  }

  getLegalDashboard(): Observable<LegalDashboard> {
    return this.http.get<LegalDashboard>(`${this.baseUrl}/dashboard`);
  }

  listRecords(params: {
    area: string;
    limit?: number;
    offset?: number;
    q?: string;
    status?: string;
    project_id?: number;
    due_from?: string;
    due_to?: string;
    record_type?: string;
    mutation_application_status?: string;
    mutation_outcome?: string;
    tax_reconciliation_status?: string;
    registration_type?: string;
    registration_authority?: string;
    approval_category?: string;
    approval_authority?: string;
    approval_reference?: string;
    correspondence_direction?: string;
    correspondence_type?: string;
    correspondence_authority?: string;
    correspondence_external_organization?: string;
    thread_reference?: string;
    agreement_type?: string;
    transfer_status?: string;
    case_type?: string;
    risk_level?: string;
    document_type?: string;
    confidentiality?: string;
    reminder_type?: string;
    workflow_type?: string;
    approval_stage?: string;
  }): Observable<LegalRecordPage> {
    let httpParams = new HttpParams().set('area', params.area)
      .set('limit', params.limit ?? 25).set('offset', params.offset ?? 0);
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'area' && value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<LegalRecordPage>(`${this.baseUrl}/records`, { params: httpParams });
  }

  getRecord(id: number): Observable<LegalRecord> {
    return this.http.get<LegalRecord>(`${this.baseUrl}/records/${id}`);
  }

  createRecord(payload: Partial<LegalRecord>): Observable<LegalRecord> {
    return this.http.post<LegalRecord>(`${this.baseUrl}/records`, payload);
  }

  updateRecord(id: number, payload: Partial<LegalRecord>): Observable<LegalRecord> {
    return this.http.patch<LegalRecord>(`${this.baseUrl}/records/${id}`, payload);
  }

  deleteRecord(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/records/${id}`);
  }

  getAuditEvents(params: { area?: string; record_id?: number; limit?: number; offset?: number } = {}): Observable<LegalAuditPage> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') httpParams = httpParams.set(key, value);
    });
    return this.http.get<LegalAuditPage>(`${this.baseUrl}/audit`, { params: httpParams });
  }
}
