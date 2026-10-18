import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Lead,
  LeadActivity,
  Customer,
  Nominee,
  LeadConversionMetrics,
  LeadScoreBreakdown,
  WebsiteInquiryPayload,
  LeadPaginatedResponse,
  LeadAssignment,
  LeadAssignmentPaginatedResponse,
  LeadAssignmentRule,
  LeadAssignmentRulePaginatedResponse,
  LeadAssignmentQueueStats,
  BulkAssignRequest,
  LeadImportRequest,
  LeadImportBatch,
  LeadImportPaginatedResponse,
  DuplicateCheckResponse,
  LeadQualification,
  LeadQualificationUpdate,
  LeadQualificationPaginatedResponse,
  CustomerPaginatedResponse,
  CustomerDuplicateCheckRequest,
  CustomerDuplicateCheckResponse,
  CustomerMergeRequest,
  CustomerServiceRequest,
  ServiceRequestPaginatedResponse
} from '../models/crm.model';

export interface LeadTableFilters {
  search?: string;
  lead_stage?: string;
  lead_source_id?: string;
  priority?: string;
  property_type?: string;
  sales_rep_id?: number;
  project_id?: number;
  is_unassigned?: boolean;
  is_opted_out?: boolean;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  limit?: number;
  offset?: number;
}

export interface AssignmentFilters {
  search?: string;
  assigned_to_id?: number;
  is_active?: boolean;
  assignment_method?: string;
  is_escalated?: boolean;
  limit?: number;
  offset?: number;
}

export interface RuleFilters {
  search?: string;
  is_active?: boolean;
  method?: string;
  limit?: number;
  offset?: number;
}

export interface QualificationFilters {
  search?: string;
  health_grade?: string;
  lead_stage?: string;
  financing_ready?: boolean;
  decision_maker_available?: boolean;
  min_score?: number;
  max_score?: number;
  sort_by?: string;
  limit?: number;
  offset?: number;
}

export interface CustomerTableFilters {
  search?: string;
  is_nrb?: boolean;
  customer_type?: string;
  is_opted_out?: boolean;
  sort_by?: string;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CrmService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/crm`;

  // Reactive pagination state for the lead capture table
  leadsTable = signal<Lead[]>([]);
  leadsTotal = signal<number>(0);
  leadsLimit = signal<number>(20);
  leadsOffset = signal<number>(0);
  isLoadingLeads = signal<boolean>(false);

  // Reactive pagination state for assignment table
  assignments = signal<LeadAssignment[]>([]);
  assignmentsTotal = signal<number>(0);
  assignmentsLimit = signal<number>(20);
  assignmentsOffset = signal<number>(0);
  isLoadingAssignments = signal<boolean>(false);

  // ============================================================
  // 4.2 Lead Capture & Source Management
  // ============================================================

  /** Paginated + filterable lead table (Spec 4.2 table screen) */
  loadLeadsTable(filters: LeadTableFilters = {}): Observable<LeadPaginatedResponse> {
    this.isLoadingLeads.set(true);
    let params = new HttpParams()
      .set('limit', String(filters.limit ?? this.leadsLimit()))
      .set('offset', String(filters.offset ?? this.leadsOffset()));

    if (filters.search && filters.search.trim()) params = params.set('search', filters.search.trim());
    if (filters.lead_stage) params = params.set('lead_stage', filters.lead_stage);
    if (filters.lead_source_id) params = params.set('lead_source_id', filters.lead_source_id);
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.property_type) params = params.set('property_type', filters.property_type);
    if (filters.sales_rep_id) params = params.set('sales_rep_id', String(filters.sales_rep_id));
    if (filters.project_id) params = params.set('project_id', String(filters.project_id));
    if (filters.is_unassigned !== undefined) params = params.set('is_unassigned', String(filters.is_unassigned));
    if (filters.is_opted_out !== undefined) params = params.set('is_opted_out', String(filters.is_opted_out));
    if (filters.date_from) params = params.set('date_from', filters.date_from);
    if (filters.date_to) params = params.set('date_to', filters.date_to);
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);

    return this.http.get<LeadPaginatedResponse>(`${this.baseUrl}/leads/table`, { params }).pipe(
      tap({
        next: (res) => {
          this.leadsTable.set(res.items || []);
          this.leadsTotal.set(res.total || 0);
          this.leadsLimit.set(res.limit || 20);
          this.leadsOffset.set(res.offset || 0);
          this.isLoadingLeads.set(false);
        },
        error: () => this.isLoadingLeads.set(false)
      })
    );
  }

  /** Kanban-style full list (backwards compatible) */
  getLeads(filters?: { lead_stage?: string; search?: string; sales_rep_id?: number; lead_source_id?: string }): Observable<Lead[]> {
    let params = new HttpParams();
    if (filters?.lead_stage) params = params.set('lead_stage', filters.lead_stage);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.sales_rep_id) params = params.set('sales_rep_id', String(filters.sales_rep_id));
    if (filters?.lead_source_id) params = params.set('lead_source_id', filters.lead_source_id);
    return this.http.get<Lead[]>(`${this.baseUrl}/leads`, { params });
  }

  getLead(leadId: number): Observable<Lead> {
    return this.http.get<Lead>(`${this.baseUrl}/leads/${leadId}`);
  }

  createLead(payload: any): Observable<Lead> {
    return this.http.post<Lead>(`${this.baseUrl}/leads`, payload);
  }

  updateLead(leadId: number, payload: any): Observable<Lead> {
    return this.http.put<Lead>(`${this.baseUrl}/leads/${leadId}`, payload);
  }

  deleteLead(leadId: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/leads/${leadId}`);
  }

  updateLeadStage(leadId: number, stage: string, notes?: string, lostReason?: string): Observable<Lead> {
    return this.http.put<Lead>(`${this.baseUrl}/leads/${leadId}/stage`, {
      lead_stage: stage,
      notes,
      lost_reason: lostReason
    });
  }

  getLeadScoringBreakdown(leadId: number): Observable<LeadScoreBreakdown> {
    return this.http.get<LeadScoreBreakdown>(`${this.baseUrl}/leads/${leadId}/scoring-breakdown`);
  }

  checkDuplicates(payload: { primary_phone?: string; email?: string; exclude_lead_id?: number }): Observable<DuplicateCheckResponse> {
    return this.http.post<DuplicateCheckResponse>(`${this.baseUrl}/leads/check-duplicates`, payload);
  }

  importLeads(payload: LeadImportRequest): Observable<LeadImportBatch> {
    return this.http.post<LeadImportBatch>(`${this.baseUrl}/leads/import`, payload);
  }

  getImportHistory(limit = 20, offset = 0): Observable<LeadImportPaginatedResponse> {
    return this.http.get<LeadImportPaginatedResponse>(`${this.baseUrl}/leads/import/history`, {
      params: { limit: String(limit), offset: String(offset) }
    });
  }

  logLeadActivity(leadId: number, payload: Partial<LeadActivity>): Observable<LeadActivity> {
    return this.http.post<LeadActivity>(`${this.baseUrl}/leads/${leadId}/activities`, {
      ...payload,
      lead_id: leadId
    });
  }

  // ============================================================
  // 4.3 Lead Assignment & Distribution
  // ============================================================

  loadAssignments(filters: AssignmentFilters = {}): Observable<LeadAssignmentPaginatedResponse> {
    this.isLoadingAssignments.set(true);
    let params = new HttpParams()
      .set('limit', String(filters.limit ?? this.assignmentsLimit()))
      .set('offset', String(filters.offset ?? this.assignmentsOffset()));

    if (filters.search && filters.search.trim()) params = params.set('search', filters.search.trim());
    if (filters.assigned_to_id) params = params.set('assigned_to_id', String(filters.assigned_to_id));
    if (filters.is_active !== undefined) params = params.set('is_active', String(filters.is_active));
    if (filters.assignment_method) params = params.set('assignment_method', filters.assignment_method);
    if (filters.is_escalated !== undefined) params = params.set('is_escalated', String(filters.is_escalated));

    return this.http.get<LeadAssignmentPaginatedResponse>(`${this.baseUrl}/assignments`, { params }).pipe(
      tap({
        next: (res) => {
          this.assignments.set(res.items || []);
          this.assignmentsTotal.set(res.total || 0);
          this.assignmentsLimit.set(res.limit || 20);
          this.assignmentsOffset.set(res.offset || 0);
          this.isLoadingAssignments.set(false);
        },
        error: () => this.isLoadingAssignments.set(false)
      })
    );
  }

  assignLead(leadId: number, payload: { assigned_to_id: number; assignment_method?: string; assignment_reason?: string; response_sla_hours?: number; assigned_by_id?: number }): Observable<LeadAssignment> {
    return this.http.post<LeadAssignment>(`${this.baseUrl}/leads/${leadId}/assign`, payload);
  }

  bulkAssign(payload: BulkAssignRequest): Observable<{ message: string; assigned_count: number; skipped_lead_ids: number[] }> {
    return this.http.post<{ message: string; assigned_count: number; skipped_lead_ids: number[] }>(`${this.baseUrl}/leads/bulk-assign`, payload);
  }

  getLeadAssignmentHistory(leadId: number): Observable<LeadAssignment[]> {
    return this.http.get<LeadAssignment[]>(`${this.baseUrl}/leads/${leadId}/assignments`);
  }

  escalateAssignment(assignmentId: number, reason: string): Observable<LeadAssignment> {
    return this.http.post<LeadAssignment>(`${this.baseUrl}/assignments/${assignmentId}/escalate`, null, {
      params: { reason }
    });
  }

  getAssignmentQueueStats(): Observable<LeadAssignmentQueueStats> {
    return this.http.get<LeadAssignmentQueueStats>(`${this.baseUrl}/assignment-queue/stats`);
  }

  getSalesReps(): Observable<{ id: number; full_name_en: string; email?: string | null }[]> {
    return this.http.get<{ id: number; full_name_en: string; email?: string | null }[]>(`${this.baseUrl}/sales-reps`);
  }

  // Assignment Rules CRUD
  loadAssignmentRules(filters: RuleFilters = {}): Observable<LeadAssignmentRulePaginatedResponse> {
    let params = new HttpParams()
      .set('limit', String(filters.limit ?? 50))
      .set('offset', String(filters.offset ?? 0));
    if (filters.search && filters.search.trim()) params = params.set('search', filters.search.trim());
    if (filters.is_active !== undefined) params = params.set('is_active', String(filters.is_active));
    if (filters.method) params = params.set('method', filters.method);
    return this.http.get<LeadAssignmentRulePaginatedResponse>(`${this.baseUrl}/assignment-rules`, { params });
  }

  getAssignmentRule(ruleId: number): Observable<LeadAssignmentRule> {
    return this.http.get<LeadAssignmentRule>(`${this.baseUrl}/assignment-rules/${ruleId}`);
  }

  createAssignmentRule(payload: Partial<LeadAssignmentRule>): Observable<LeadAssignmentRule> {
    return this.http.post<LeadAssignmentRule>(`${this.baseUrl}/assignment-rules`, payload);
  }

  updateAssignmentRule(ruleId: number, payload: Partial<LeadAssignmentRule>): Observable<LeadAssignmentRule> {
    return this.http.put<LeadAssignmentRule>(`${this.baseUrl}/assignment-rules/${ruleId}`, payload);
  }

  deleteAssignmentRule(ruleId: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/assignment-rules/${ruleId}`);
  }

  // ============================================================
  // 4.4 Lead Qualification & Scoring
  // ============================================================

  /** Paginated qualification workbench (Spec 4.4) */
  loadQualificationTable(filters: QualificationFilters = {}): Observable<LeadPaginatedResponse> {
    this.isLoadingLeads.set(true);
    let params = new HttpParams()
      .set('limit', String(filters.limit ?? 20))
      .set('offset', String(filters.offset ?? 0));

    if (filters.search && filters.search.trim()) params = params.set('search', filters.search.trim());
    if (filters.health_grade) params = params.set('health_grade', filters.health_grade);
    if (filters.lead_stage) params = params.set('lead_stage', filters.lead_stage);
    if (filters.financing_ready !== undefined) params = params.set('financing_ready', String(filters.financing_ready));
    if (filters.decision_maker_available !== undefined) params = params.set('decision_maker_available', String(filters.decision_maker_available));
    if (filters.min_score !== undefined && filters.min_score !== null) params = params.set('min_score', String(filters.min_score));
    if (filters.max_score !== undefined && filters.max_score !== null) params = params.set('max_score', String(filters.max_score));
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);

    return this.http.get<LeadPaginatedResponse>(`${this.baseUrl}/leads/qualification/table`, { params }).pipe(
      tap({
        next: (res) => {
          this.leadsTable.set(res.items || []);
          this.leadsTotal.set(res.total || 0);
          this.leadsLimit.set(res.limit || 20);
          this.leadsOffset.set(res.offset || 0);
          this.isLoadingLeads.set(false);
        },
        error: () => this.isLoadingLeads.set(false)
      })
    );
  }

  updateLeadQualification(leadId: number, payload: LeadQualificationUpdate): Observable<Lead> {
    return this.http.put<Lead>(`${this.baseUrl}/leads/${leadId}/qualification`, payload);
  }

  getLeadQualificationHistory(leadId: number, limit = 20, offset = 0): Observable<LeadQualification[]> {
    return this.http.get<LeadQualification[]>(`${this.baseUrl}/leads/${leadId}/qualifications`, {
      params: { limit: String(limit), offset: String(offset) }
    });
  }

  // ============================================================
  // Customers KYC & Nominees (Spec 4.5)
  // ============================================================
  getCustomers(filters?: { search?: string; is_nrb?: boolean }): Observable<Customer[]> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.is_nrb !== undefined) params = params.set('is_nrb', String(filters.is_nrb));
    return this.http.get<Customer[]>(`${this.baseUrl}/customers`, { params });
  }

  /** Server-paged customer directory (Spec 4.5) */
  loadCustomersTable(filters: CustomerTableFilters = {}): Observable<CustomerPaginatedResponse> {
    this.isLoadingLeads.set(true);
    let params = new HttpParams()
      .set('limit', String(filters.limit ?? 20))
      .set('offset', String(filters.offset ?? 0));

    if (filters.search && filters.search.trim()) params = params.set('search', filters.search.trim());
    if (filters.is_nrb !== undefined) params = params.set('is_nrb', String(filters.is_nrb));
    if (filters.customer_type) params = params.set('customer_type', filters.customer_type);
    if (filters.is_opted_out !== undefined) params = params.set('is_opted_out', String(filters.is_opted_out));
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);

    return this.http.get<CustomerPaginatedResponse>(`${this.baseUrl}/customers/table`, { params }).pipe(
      tap({
        next: () => this.isLoadingLeads.set(false),
        error: () => this.isLoadingLeads.set(false)
      })
    );
  }

  getCustomer(customerId: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/customers/${customerId}`);
  }

  createCustomer(payload: any): Observable<Customer> {
    return this.http.post<Customer>(`${this.baseUrl}/customers`, payload);
  }

  updateCustomer(customerId: number, payload: any): Observable<Customer> {
    return this.http.put<Customer>(`${this.baseUrl}/customers/${customerId}`, payload);
  }

  deleteCustomer(customerId: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/customers/${customerId}`);
  }

  checkCustomerDuplicates(payload: CustomerDuplicateCheckRequest): Observable<CustomerDuplicateCheckResponse> {
    return this.http.post<CustomerDuplicateCheckResponse>(`${this.baseUrl}/customers/check-duplicates`, payload);
  }

  mergeCustomers(payload: CustomerMergeRequest): Observable<Customer> {
    return this.http.post<Customer>(`${this.baseUrl}/customers/${payload.target_customer_id}/merge`, payload);
  }

  addNominee(customerId: number, payload: Partial<Nominee>): Observable<Nominee> {
    return this.http.post<Nominee>(`${this.baseUrl}/customers/${customerId}/nominees`, payload);
  }

  updateNominee(customerId: number, nomineeId: number, payload: Partial<Nominee>): Observable<Nominee> {
    return this.http.put<Nominee>(`${this.baseUrl}/customers/${customerId}/nominees/${nomineeId}`, payload);
  }

  deleteNominee(customerId: number, nomineeId: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/customers/${customerId}/nominees/${nomineeId}`);
  }

  // --- Service Requests ---
  getServiceRequests(customerId: number, filters?: { request_type?: string; status?: string; limit?: number; offset?: number }): Observable<ServiceRequestPaginatedResponse> {
    let params = new HttpParams()
      .set('limit', String(filters?.limit ?? 20))
      .set('offset', String(filters?.offset ?? 0));
    if (filters?.request_type) params = params.set('request_type', filters.request_type);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<ServiceRequestPaginatedResponse>(`${this.baseUrl}/customers/${customerId}/service-requests`, { params });
  }

  createServiceRequest(customerId: number, payload: Partial<CustomerServiceRequest>): Observable<CustomerServiceRequest> {
    return this.http.post<CustomerServiceRequest>(`${this.baseUrl}/customers/${customerId}/service-requests`, payload);
  }

  updateServiceRequest(requestId: number, payload: Partial<CustomerServiceRequest>): Observable<CustomerServiceRequest> {
    return this.http.put<CustomerServiceRequest>(`${this.baseUrl}/service-requests/${requestId}`, payload);
  }

  deleteServiceRequest(requestId: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/service-requests/${requestId}`);
  }

  // ============================================================
  // Analytics & Webhooks
  // ============================================================
  getConversionMetrics(): Observable<LeadConversionMetrics> {
    return this.http.get<LeadConversionMetrics>(`${this.baseUrl}/reports/conversion`);
  }

  simulateFacebookLead(payload: { lead_name: string; phone_number: string; email?: string; campaign_name?: string; interested_project_code?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/webhooks/facebook`, payload);
  }

  submitWebsiteInquiry(payload: WebsiteInquiryPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/webhooks/website-inquiry`, payload);
  }
}
