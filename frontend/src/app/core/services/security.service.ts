import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SecurityUser {
  id: number;
  user_code: string;
  username: string;
  email: string;
  full_name_en: string;
  full_name_bn?: string;
  phone_number?: string;
  employee_id?: string;
  company_name: string;
  branch_name: string;
  department_name: string;
  designation: string;
  reporting_manager?: string;
  primary_role: string;
  assigned_roles?: string[];
  account_status: string;
  preferred_language: string;
  is_mfa_enabled: boolean;
  failed_login_count: number;
  last_login_at?: string;
  created_at?: string;
}

export interface SecurityRole {
  id: number;
  role_code: string;
  role_name: string;
  department?: string;
  description?: string;
  is_system_role: boolean;
  is_active: boolean;
  assigned_users_count: number;
  created_at?: string;
}

export interface RolePermissionItem {
  id: number;
  role_code: string;
  module_code: string;
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
  can_print: boolean;
  data_scope: string;
  restricted_fields?: string[];
}

export interface UserProjectScope {
  id: number;
  user_id: number;
  user_name: string;
  project_id: number;
  project_name: string;
  tower_names?: string[];
  can_view_financials: boolean;
  can_view_customers: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface WorkflowRule {
  id: number;
  module_name: string;
  maker_role: string;
  checker_role: string;
  approver_role: string;
  threshold_limit_bdt: number;
  prevent_self_approval: boolean;
  is_active: boolean;
}

export interface SecurityPolicyConfig {
  id: number;
  policy_name: string;
  min_password_length: number;
  require_special_char: boolean;
  require_numbers: boolean;
  require_uppercase: boolean;
  max_failed_attempts: number;
  lockout_duration_minutes: number;
  session_idle_timeout_minutes: number;
  enforce_mfa_roles?: string[];
  ip_allowlist_enabled: boolean;
  allowed_ip_ranges: string;
}

export interface ApiKeyItem {
  id: number;
  app_name: string;
  client_id: string;
  api_key_masked: string;
  allowed_scopes?: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  created_at?: string;
}

export interface MobilePolicyItem {
  id: number;
  app_name: string;
  min_supported_version: string;
  allow_offline_cache: boolean;
  require_biometrics: boolean;
  restrict_document_download: boolean;
  session_lifetime_hours: number;
  is_active: boolean;
}

export interface AuditLogItem {
  id: number;
  audit_ref: string;
  user_name: string;
  event_type: string;
  module_name: string;
  record_ref?: string;
  ip_address?: string;
  device_session?: string;
  result_status: string;
  reason_notes?: string;
  created_at?: string;
}

export interface ActiveSessionItem {
  id: number;
  session_id: string;
  username: string;
  device_name: string;
  browser: string;
  ip_address: string;
  location: string;
  status: string;
  login_at?: string;
  last_activity_at?: string;
}

export interface SecurityIncidentItem {
  id: number;
  incident_code: string;
  severity: string;
  incident_type: string;
  source_ip?: string;
  affected_user?: string;
  description: string;
  status: string;
  created_at?: string;
}

export interface AccessReviewItem {
  id: number;
  review_code: string;
  cycle_name: string;
  department: string;
  reviewer_name: string;
  total_users_reviewed: number;
  certified_count: number;
  revoked_count: number;
  status: string;
  review_date?: string;
}

export interface SecurityDashboardSummary {
  total_users_count: number;
  active_users_count: number;
  suspended_users_count: number;
  inactive_users_count: number;
  total_roles_count: number;
  failed_logins_today: number;
  active_sessions_count: number;
  open_security_incidents: number;
  pending_access_reviews: number;
  mfa_enabled_percent: number;
  recent_role_changes: { user: string; action: string; record: string; time: string }[];
  logins_by_role: { role: string; count: number }[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/security`;

  // 1. Dashboard
  getDashboardSummary(): Observable<SecurityDashboardSummary> {
    return this.http.get<SecurityDashboardSummary>(`${this.apiUrl}/dashboard/summary`);
  }

  // 2. Users
  getUsers(filter?: {
    search?: string;
    department?: string;
    status_filter?: string;
    role?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<SecurityUser>> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.department) params = params.set('department', filter.department);
    if (filter?.status_filter) params = params.set('status_filter', filter.status_filter);
    if (filter?.role) params = params.set('role', filter.role);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<SecurityUser>>(`${this.apiUrl}/users`, { params });
  }

  createUser(data: Partial<SecurityUser>): Observable<SecurityUser> {
    return this.http.post<SecurityUser>(`${this.apiUrl}/users`, data);
  }

  updateUser(id: number, data: Partial<SecurityUser>): Observable<SecurityUser> {
    return this.http.put<SecurityUser>(`${this.apiUrl}/users/${id}`, data);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }

  updateUserStatus(id: number, status: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${id}/status?new_status=${status}`, {});
  }

  // 3. Roles
  getRoles(filter?: {
    search?: string;
    department?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<SecurityRole>> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.department) params = params.set('department', filter.department);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<SecurityRole>>(`${this.apiUrl}/roles`, { params });
  }

  createRole(data: Partial<SecurityRole>): Observable<SecurityRole> {
    return this.http.post<SecurityRole>(`${this.apiUrl}/roles`, data);
  }

  updateRole(id: number, data: Partial<SecurityRole>): Observable<SecurityRole> {
    return this.http.put<SecurityRole>(`${this.apiUrl}/roles/${id}`, data);
  }

  deleteRole(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/roles/${id}`);
  }

  // 4. Permissions
  getRolePermissions(roleCode: string = 'PROJECT_MGR'): Observable<RolePermissionItem[]> {
    return this.http.get<RolePermissionItem[]>(`${this.apiUrl}/permissions?role_code=${roleCode}`);
  }

  // 5. Project Scopes
  getProjectScopes(filter?: {
    user_id?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<UserProjectScope>> {
    let params = new HttpParams();
    if (filter?.user_id) params = params.set('user_id', filter.user_id);
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<UserProjectScope>>(`${this.apiUrl}/project-scopes`, { params });
  }

  assignProjectScope(data: Partial<UserProjectScope>): Observable<UserProjectScope> {
    return this.http.post<UserProjectScope>(`${this.apiUrl}/project-scopes`, data);
  }

  updateProjectScope(id: number, data: Partial<UserProjectScope>): Observable<UserProjectScope> {
    return this.http.put<UserProjectScope>(`${this.apiUrl}/project-scopes/${id}`, data);
  }

  revokeProjectScope(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/project-scopes/${id}`);
  }

  // 6. Workflow Rules
  getWorkflowRules(filter?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<WorkflowRule>> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<WorkflowRule>>(`${this.apiUrl}/workflow-rules`, { params });
  }

  createWorkflowRule(data: Partial<WorkflowRule>): Observable<WorkflowRule> {
    return this.http.post<WorkflowRule>(`${this.apiUrl}/workflow-rules`, data);
  }

  updateWorkflowRule(id: number, data: Partial<WorkflowRule>): Observable<WorkflowRule> {
    return this.http.put<WorkflowRule>(`${this.apiUrl}/workflow-rules/${id}`, data);
  }

  deleteWorkflowRule(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/workflow-rules/${id}`);
  }

  // 7. Policies
  getPolicies(): Observable<SecurityPolicyConfig> {
    return this.http.get<SecurityPolicyConfig>(`${this.apiUrl}/policies`);
  }

  updatePolicies(data: Partial<SecurityPolicyConfig>): Observable<any> {
    return this.http.put(`${this.apiUrl}/policies`, data);
  }

  // 8. API Keys
  getApiKeys(filter?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<ApiKeyItem>> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<ApiKeyItem>>(`${this.apiUrl}/api-keys`, { params });
  }

  generateApiKey(data: { app_name: string; allowed_scopes?: string[]; rate_limit_per_minute?: number }): Observable<ApiKeyItem> {
    return this.http.post<ApiKeyItem>(`${this.apiUrl}/api-keys`, data);
  }

  updateApiKey(id: number, data: Partial<ApiKeyItem>): Observable<ApiKeyItem> {
    return this.http.put<ApiKeyItem>(`${this.apiUrl}/api-keys/${id}`, data);
  }

  revokeApiKey(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api-keys/${id}`);
  }

  // 9. Mobile Policies
  getMobilePolicies(): Observable<MobilePolicyItem[]> {
    return this.http.get<MobilePolicyItem[]>(`${this.apiUrl}/mobile-policies`);
  }

  // 10. Audit Logs
  getAuditLogs(filter?: {
    user_name?: string;
    module_name?: string;
    event_type?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<AuditLogItem>> {
    let params = new HttpParams();
    if (filter?.user_name) params = params.set('user_name', filter.user_name);
    if (filter?.module_name) params = params.set('module_name', filter.module_name);
    if (filter?.event_type) params = params.set('event_type', filter.event_type);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<AuditLogItem>>(`${this.apiUrl}/audit-logs`, { params });
  }

  // 11. Active Sessions
  getActiveSessions(filter?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<ActiveSessionItem>> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<ActiveSessionItem>>(`${this.apiUrl}/active-sessions`, { params });
  }

  revokeSession(sessionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/active-sessions/${sessionId}/revoke`, {});
  }

  // 12. Incidents & Monitoring
  getIncidents(filter?: {
    search?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<SecurityIncidentItem>> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.severity) params = params.set('severity', filter.severity);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<SecurityIncidentItem>>(`${this.apiUrl}/incidents`, { params });
  }

  createIncident(data: Partial<SecurityIncidentItem>): Observable<SecurityIncidentItem> {
    return this.http.post<SecurityIncidentItem>(`${this.apiUrl}/incidents`, data);
  }

  updateIncident(id: number, data: Partial<SecurityIncidentItem>): Observable<SecurityIncidentItem> {
    return this.http.put<SecurityIncidentItem>(`${this.apiUrl}/incidents/${id}`, data);
  }

  deleteIncident(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/incidents/${id}`);
  }

  // 13. Access Reviews
  getAccessReviews(filter?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<AccessReviewItem>> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<PaginatedResult<AccessReviewItem>>(`${this.apiUrl}/access-reviews`, { params });
  }

  createAccessReview(data: Partial<AccessReviewItem>): Observable<AccessReviewItem> {
    return this.http.post<AccessReviewItem>(`${this.apiUrl}/access-reviews`, data);
  }

  updateAccessReview(id: number, data: Partial<AccessReviewItem>): Observable<AccessReviewItem> {
    return this.http.put<AccessReviewItem>(`${this.apiUrl}/access-reviews/${id}`, data);
  }

  // 14. Reports
  getReports(reportType: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reports?report_type=${reportType}`);
  }
}
