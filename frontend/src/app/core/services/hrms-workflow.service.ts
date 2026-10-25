import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WorkflowMatrixRule {
  id: number;
  rule_code: string;
  rule_title: string;
  module_category: string;
  department_name?: string | null;
  tier_level: number;
  step_name: string;
  approver_designation: string;
  approver_role: string;
  approver_user_id?: number | null;
  approver_name?: string | null;
  min_threshold: number;
  max_threshold?: number | null;
  sla_hours: number;
  auto_escalate: boolean;
  is_mandatory: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowStep {
  id: number;
  tier_level: number;
  step_name: string;
  required_role: string;
  approver_name?: string | null;
  status: string;
  action_date?: string | null;
  action_by?: string | null;
  comments?: string | null;
}

export interface WorkflowRequest {
  id: number;
  request_number: string;
  module_category: string;
  applicant_employee_id?: number | null;
  applicant_code?: string | null;
  applicant_name: string;
  department_name: string;
  designation: string;
  subject: string;
  details_json?: any;
  financial_amount: number;
  days_count: number;
  current_tier: number;
  total_tiers: number;
  current_approver_role?: string | null;
  current_approver_name?: string | null;
  status: string;
  priority: string;
  submission_date?: string | null;
  final_action_date?: string | null;
  final_action_by?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  steps?: WorkflowStep[];
}

export interface WorkflowDelegation {
  id: number;
  delegation_code: string;
  delegator_name: string;
  delegator_designation: string;
  delegatee_name: string;
  delegatee_designation: string;
  module_scope: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowAuditLog {
  id: number;
  audit_ref: string;
  request_number: string;
  event_type: string;
  actor_name: string;
  actor_role: string;
  tier_level?: number | null;
  comments?: string | null;
  ip_address: string;
  timestamp?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface WorkflowMetadata {
  categories: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
  roles: { value: string; label: string }[];
  departments: { value: string; label: string }[];
  designations: { value: string; label: string }[];
  priorities: { value: string; label: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class HrmsWorkflowService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms/workflow`;

  // 1. Matrix Rules CRUD
  getMatrixRules(filter?: {
    search?: string;
    category?: string;
    department?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<WorkflowMatrixRule>> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.category) params = params.set('category', filter.category);
    if (filter?.department) params = params.set('department', filter.department);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<WorkflowMatrixRule>>(`${this.apiUrl}/matrix`, { params });
  }

  getMatrixRuleById(id: number): Observable<WorkflowMatrixRule> {
    return this.http.get<WorkflowMatrixRule>(`${this.apiUrl}/matrix/${id}`);
  }

  createMatrixRule(data: Partial<WorkflowMatrixRule>): Observable<WorkflowMatrixRule> {
    return this.http.post<WorkflowMatrixRule>(`${this.apiUrl}/matrix`, data);
  }

  updateMatrixRule(id: number, data: Partial<WorkflowMatrixRule>): Observable<WorkflowMatrixRule> {
    return this.http.put<WorkflowMatrixRule>(`${this.apiUrl}/matrix/${id}`, data);
  }

  deleteMatrixRule(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/matrix/${id}`);
  }

  // 2. Workflow Requests & Approvals
  getWorkflowRequests(filter?: {
    category?: string;
    status_filter?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<WorkflowRequest>> {
    let params = new HttpParams();
    if (filter?.category) params = params.set('category', filter.category);
    if (filter?.status_filter) params = params.set('status_filter', filter.status_filter);
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<WorkflowRequest>>(`${this.apiUrl}/requests`, { params });
  }

  getWorkflowRequestById(id: number): Observable<WorkflowRequest> {
    return this.http.get<WorkflowRequest>(`${this.apiUrl}/requests/${id}`);
  }

  createWorkflowRequest(data: Partial<WorkflowRequest>): Observable<WorkflowRequest> {
    return this.http.post<WorkflowRequest>(`${this.apiUrl}/requests`, data);
  }

  updateWorkflowRequest(id: number, data: Partial<WorkflowRequest>): Observable<WorkflowRequest> {
    return this.http.put<WorkflowRequest>(`${this.apiUrl}/requests/${id}`, data);
  }

  processWorkflowAction(
    id: number,
    payload: { action: string; comments?: string; approver_name?: string; approver_role?: string }
  ): Observable<WorkflowRequest> {
    return this.http.post<WorkflowRequest>(`${this.apiUrl}/requests/${id}/action`, payload);
  }

  // 3. Delegations CRUD
  getDelegations(filter?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<WorkflowDelegation>> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<WorkflowDelegation>>(`${this.apiUrl}/delegations`, { params });
  }

  getDelegationById(id: number): Observable<WorkflowDelegation> {
    return this.http.get<WorkflowDelegation>(`${this.apiUrl}/delegations/${id}`);
  }

  createDelegation(data: Partial<WorkflowDelegation>): Observable<WorkflowDelegation> {
    return this.http.post<WorkflowDelegation>(`${this.apiUrl}/delegations`, data);
  }

  updateDelegation(id: number, data: Partial<WorkflowDelegation>): Observable<WorkflowDelegation> {
    return this.http.put<WorkflowDelegation>(`${this.apiUrl}/delegations/${id}`, data);
  }

  deleteDelegation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delegations/${id}`);
  }

  // 4. Audit History
  getAuditHistory(filter?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<WorkflowAuditLog>> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<WorkflowAuditLog>>(`${this.apiUrl}/history`, { params });
  }

  // 5. Metadata for Dynamic Searchable Selects
  getWorkflowMetadata(): Observable<WorkflowMetadata> {
    return this.http.get<WorkflowMetadata>(`${this.apiUrl}/metadata`);
  }
}
