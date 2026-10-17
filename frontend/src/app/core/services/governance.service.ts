import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApprovalPolicy,
  ApprovalRequest,
  GovernanceNotification,
  GovernanceMetrics
} from '../models/governance.model';

@Injectable({
  providedIn: 'root'
})
export class GovernanceService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/governance`;

  // 1. Approval Policy Chains
  getPolicies(filters?: { document_type?: string; project_id?: number; is_active?: boolean }): Observable<ApprovalPolicy[]> {
    let params = new HttpParams();
    if (filters?.document_type) params = params.set('document_type', filters.document_type);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.is_active !== undefined) params = params.set('is_active', String(filters.is_active));
    return this.http.get<ApprovalPolicy[]>(`${this.baseUrl}/policies`, { params });
  }

  createPolicy(payload: any): Observable<ApprovalPolicy> {
    return this.http.post<ApprovalPolicy>(`${this.baseUrl}/policies`, payload);
  }

  // 2. Approval Requests (Maker-Checker Inbox)
  getRequests(filters?: { status?: string; document_type?: string; project_id?: number; search?: string }): Observable<ApprovalRequest[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.document_type) params = params.set('document_type', filters.document_type);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<ApprovalRequest[]>(`${this.baseUrl}/requests`, { params });
  }

  getRequestDetail(id: number): Observable<ApprovalRequest> {
    return this.http.get<ApprovalRequest>(`${this.baseUrl}/requests/${id}`);
  }

  createRequest(payload: any): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(`${this.baseUrl}/requests`, payload);
  }

  processStepAction(
    requestId: number,
    stepId: number,
    payload: { action: string; comments?: string; approver_name: string; ip_address?: string }
  ): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(
      `${this.baseUrl}/requests/${requestId}/steps/${stepId}/action`,
      payload
    );
  }

  // 3. Multi-Channel Notifications
  getNotifications(filters?: { user_id?: number; status?: string }): Observable<GovernanceNotification[]> {
    let params = new HttpParams();
    if (filters?.user_id) params = params.set('user_id', filters.user_id);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<GovernanceNotification[]>(`${this.baseUrl}/notifications`, { params });
  }

  markNotificationRead(id: number): Observable<GovernanceNotification> {
    return this.http.put<GovernanceNotification>(`${this.baseUrl}/notifications/${id}/read`, {});
  }

  // 4. Executive Metrics
  getMetrics(): Observable<GovernanceMetrics> {
    return this.http.get<GovernanceMetrics>(`${this.baseUrl}/metrics`);
  }
}
