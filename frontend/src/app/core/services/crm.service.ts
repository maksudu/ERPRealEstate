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
  ServiceRequestPaginatedResponse,
  CrmDashboardResponse,
  CrmDrilldownResponse,
  CustomerRequirement,
  CustomerRequirementCreate,
  CustomerRequirementUpdate,
  CustomerRequirementPaginatedResponse,
  RequirementAuditLog,
  InventoryMatchUnit,
  InventoryRecommendation,
  InventoryAlert,
  ActivityStatsSummary,
  FollowUpTask,
  DailyTodoSummary,
  CommunicationHistory,
  CustomerTimelineItem,
  Broker,
  BrokerCreate,
  BrokerUpdate,
  BrokerPaginatedResponse,
  BrokerStatsSummary,
  CommissionClaim,
  CommissionClaimCreate,
  CommissionClaimUpdate,
  CommissionClaimApproval,
  CommissionClaimDisburse,
  CommissionClaimPaginatedResponse,
  FunnelStage,
  FunnelStageCreate,
  FunnelStageUpdate,
  LeadStageTransition,
  LeadStageTransitionCreate,
  LeadDisqualifyRequest,
  LeadReopenRequest,
  Opportunity,
  OpportunityCreate,
  OpportunityUpdate,
  OpportunityPaginatedResponse,
  BookingHandover,
  BookingHandoverCreate,
  BookingHandoverUpdate,
  BookingHandoverVerificationUpdate,
  BookingHandoverReview,
  BookingHandoverPaginatedResponse,
  ConversionKpiResponse,
  Campaign,
  CampaignCreate,
  CampaignUpdate,
  CampaignPaginatedResponse,
  MarketingTouchpoint,
  MarketingTouchpointCreate,
  SuppressionEntry,
  SuppressionEntryCreate,
  SuppressionPaginatedResponse,
  CampaignMarketingDashboardKpis,
  OfflineExhibitionImportPayload
} from '../models/crm.model';

export interface OpportunityFilters {
  stage?: string;
  sales_rep_id?: number;
  project_id?: number;
  customer_id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BookingHandoverFilters {
  status?: string;
  sales_rep_id?: number;
  project_id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BrokerFilters {
  search?: string;
  broker_type?: string;
  status?: string;
  service_area?: string;
  page?: number;
  limit?: number;
}

export interface CommissionClaimFilters {
  search?: string;
  broker_id?: number;
  claim_status?: string;
  milestone_achieved?: string;
  is_milestone_verified?: boolean;
  page?: number;
  limit?: number;
}

export interface ActivityFilters {
  search?: string;
  activity_type?: string;
  status?: string;
  lead_id?: number;
  customer_id?: number;
  project_id?: number;
  sales_rep_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface ActivityPaginatedResponse {
  items: LeadActivity[];
  total: number;
  page: number;
  limit: number;
}

export interface TaskFilters {
  search?: string;
  task_category?: string;
  priority?: string;
  status?: string;
  assigned_to_id?: number;
  lead_id?: number;
  customer_id?: number;
  due_filter?: string; // 'overdue' | 'today' | 'upcoming'
  page?: number;
  limit?: number;
}

export interface TaskPaginatedResponse {
  items: FollowUpTask[];
  total: number;
  page: number;
  limit: number;
}

export interface CommunicationFilters {
  search?: string;
  channel?: string;
  direction?: string;
  lead_id?: number;
  customer_id?: number;
  delivery_status?: string;
  page?: number;
  limit?: number;
}

export interface CommunicationPaginatedResponse {
  items: CommunicationHistory[];
  total: number;
  page: number;
  limit: number;
}

export interface RequirementFilters {
  search?: string;
  customer_id?: number;
  project_id?: number;
  status?: string;
  property_type?: string;
  sales_rep_id?: number;
  min_budget?: number;
  max_budget?: number;
  sort_by?: string;
  limit?: number;
  offset?: number;
}

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

  // Reactive pagination state for customer requirements table (Spec 4.6)
  requirementsTable = signal<CustomerRequirement[]>([]);
  requirementsTotal = signal<number>(0);
  requirementsLimit = signal<number>(20);
  requirementsOffset = signal<number>(0);
  isLoadingRequirements = signal<boolean>(false);

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

  // ============================================================
  // 4.1 CRM Dashboard & Sales KPIs
  // ============================================================
  getCrmDashboardKpis(filters?: { project_id?: number; sales_rep_id?: number; date_from?: string; date_to?: string }): Observable<CrmDashboardResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', String(filters.project_id));
    if (filters?.sales_rep_id) params = params.set('sales_rep_id', String(filters.sales_rep_id));
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    return this.http.get<CrmDashboardResponse>(`${this.baseUrl}/dashboard/kpis`, { params });
  }

  getCrmDashboardDrilldown(widgetType: string, filters?: { filter_value?: string; project_id?: number; sales_rep_id?: number; search?: string; limit?: number; offset?: number }): Observable<CrmDrilldownResponse> {
    let params = new HttpParams()
      .set('widget_type', widgetType)
      .set('limit', String(filters?.limit ?? 20))
      .set('offset', String(filters?.offset ?? 0));
    if (filters?.filter_value) params = params.set('filter_value', filters.filter_value);
    if (filters?.project_id) params = params.set('project_id', String(filters.project_id));
    if (filters?.sales_rep_id) params = params.set('sales_rep_id', String(filters.sales_rep_id));
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<CrmDrilldownResponse>(`${this.baseUrl}/dashboard/drilldown`, { params });
  }

  // ============================================================
  // 4.6 Customer Requirements & Budget Tracking
  // ============================================================

  loadRequirements(filters: RequirementFilters = {}): Observable<CustomerRequirementPaginatedResponse> {
    this.isLoadingRequirements.set(true);
    let params = new HttpParams()
      .set('limit', String(filters.limit ?? 20))
      .set('offset', String(filters.offset ?? 0));

    if (filters.search && filters.search.trim()) params = params.set('search', filters.search.trim());
    if (filters.customer_id) params = params.set('customer_id', String(filters.customer_id));
    if (filters.project_id) params = params.set('project_id', String(filters.project_id));
    if (filters.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters.property_type && filters.property_type !== 'ALL') params = params.set('property_type', filters.property_type);
    if (filters.sales_rep_id) params = params.set('sales_rep_id', String(filters.sales_rep_id));
    if (filters.min_budget !== undefined && filters.min_budget !== null) params = params.set('min_budget', String(filters.min_budget));
    if (filters.max_budget !== undefined && filters.max_budget !== null) params = params.set('max_budget', String(filters.max_budget));
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);

    return this.http.get<CustomerRequirementPaginatedResponse>(`${this.baseUrl}/requirements`, { params }).pipe(
      tap({
        next: (res) => {
          this.requirementsTable.set(res.items || []);
          this.requirementsTotal.set(res.total || 0);
          this.requirementsLimit.set(res.limit || 20);
          this.requirementsOffset.set(res.offset || 0);
          this.isLoadingRequirements.set(false);
        },
        error: () => this.isLoadingRequirements.set(false)
      })
    );
  }

  getRequirement(id: number): Observable<CustomerRequirement> {
    return this.http.get<CustomerRequirement>(`${this.baseUrl}/requirements/${id}`);
  }

  createRequirement(payload: CustomerRequirementCreate): Observable<CustomerRequirement> {
    return this.http.post<CustomerRequirement>(`${this.baseUrl}/requirements`, payload);
  }

  updateRequirement(id: number, payload: CustomerRequirementUpdate): Observable<CustomerRequirement> {
    return this.http.put<CustomerRequirement>(`${this.baseUrl}/requirements/${id}`, payload);
  }

  deleteRequirement(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/requirements/${id}`);
  }

  getInventoryMatches(reqId: number): Observable<InventoryMatchUnit[]> {
    return this.http.get<InventoryMatchUnit[]>(`${this.baseUrl}/requirements/${reqId}/matches`);
  }

  recommendUnit(reqId: number, payload: { unit_id: number; match_score_percentage?: number; match_details_json?: string }): Observable<InventoryRecommendation> {
    return this.http.post<InventoryRecommendation>(`${this.baseUrl}/requirements/${reqId}/recommendations`, payload);
  }

  updateRecommendationStatus(recId: number, payload: { status: string; rejection_reason?: string; rejection_notes?: string }): Observable<InventoryRecommendation> {
    return this.http.put<InventoryRecommendation>(`${this.baseUrl}/recommendations/${recId}/status`, payload);
  }

  getRequirementRecommendations(reqId: number): Observable<InventoryRecommendation[]> {
    return this.http.get<InventoryRecommendation[]>(`${this.baseUrl}/requirements/${reqId}/recommendations`);
  }

  getRequirementAuditLogs(reqId: number): Observable<RequirementAuditLog[]> {
    return this.http.get<RequirementAuditLog[]>(`${this.baseUrl}/requirements/${reqId}/audit-logs`);
  }

  getInventoryAlerts(isRead?: boolean, limit = 20, offset = 0): Observable<InventoryAlert[]> {
    let params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset));
    if (isRead !== undefined) params = params.set('is_read', String(isRead));
    return this.http.get<InventoryAlert[]>(`${this.baseUrl}/inventory-alerts`, { params });
  }

  markAlertRead(alertId: number): Observable<{ message: string; id: number }> {
    return this.http.put<{ message: string; id: number }>(`${this.baseUrl}/inventory-alerts/${alertId}/read`, {});
  }

  // =====================================================================
  // Spec 4.7: Sales Interactions & Calendar Activities
  // =====================================================================

  getActivities(filters: ActivityFilters = {}): Observable<ActivityPaginatedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page || 1))
      .set('limit', String(filters.limit || 20));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.activity_type) params = params.set('activity_type', filters.activity_type);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.lead_id) params = params.set('lead_id', String(filters.lead_id));
    if (filters.customer_id) params = params.set('customer_id', String(filters.customer_id));
    if (filters.project_id) params = params.set('project_id', String(filters.project_id));
    if (filters.sales_rep_id) params = params.set('sales_rep_id', String(filters.sales_rep_id));
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);

    return this.http.get<ActivityPaginatedResponse>(`${this.baseUrl}/activities`, { params });
  }

  getActivity(id: number): Observable<LeadActivity> {
    return this.http.get<LeadActivity>(`${this.baseUrl}/activities/${id}`);
  }

  createActivity(payload: Partial<LeadActivity>, checkConflict = true): Observable<LeadActivity> {
    let params = new HttpParams().set('check_conflict', String(checkConflict));
    return this.http.post<LeadActivity>(`${this.baseUrl}/activities`, payload, { params });
  }

  updateActivity(id: number, payload: Partial<LeadActivity>): Observable<LeadActivity> {
    return this.http.put<LeadActivity>(`${this.baseUrl}/activities/${id}`, payload);
  }

  updateActivityStatus(
    id: number,
    payload: {
      status: string;
      attendance_status?: string;
      outcome?: string;
      shortlisted_units_json?: string;
      next_action?: string;
      next_follow_up_date?: string;
    }
  ): Observable<LeadActivity> {
    return this.http.put<LeadActivity>(`${this.baseUrl}/activities/${id}/status`, payload);
  }

  deleteActivity(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/activities/${id}`);
  }

  getActivityStats(projectId?: number, salesRepId?: number): Observable<ActivityStatsSummary> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', String(projectId));
    if (salesRepId) params = params.set('sales_rep_id', String(salesRepId));
    return this.http.get<ActivityStatsSummary>(`${this.baseUrl}/activities/stats/summary`, { params });
  }

  // =====================================================================
  // Spec 4.8: Follow-up Tasks and Reminders
  // =====================================================================

  getTasks(filters: TaskFilters = {}): Observable<TaskPaginatedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page || 1))
      .set('limit', String(filters.limit || 20));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.task_category) params = params.set('task_category', filters.task_category);
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.assigned_to_id) params = params.set('assigned_to_id', String(filters.assigned_to_id));
    if (filters.lead_id) params = params.set('lead_id', String(filters.lead_id));
    if (filters.customer_id) params = params.set('customer_id', String(filters.customer_id));
    if (filters.due_filter) params = params.set('due_filter', filters.due_filter);

    return this.http.get<TaskPaginatedResponse>(`${this.baseUrl}/tasks`, { params });
  }

  getTask(id: number): Observable<FollowUpTask> {
    return this.http.get<FollowUpTask>(`${this.baseUrl}/tasks/${id}`);
  }

  getDailyTodoSummary(userId?: number): Observable<DailyTodoSummary> {
    let params = new HttpParams();
    if (userId) params = params.set('user_id', String(userId));
    return this.http.get<DailyTodoSummary>(`${this.baseUrl}/tasks/daily-todo`, { params });
  }

  createTask(payload: Partial<FollowUpTask>): Observable<FollowUpTask> {
    return this.http.post<FollowUpTask>(`${this.baseUrl}/tasks`, payload);
  }

  updateTask(id: number, payload: Partial<FollowUpTask>): Observable<FollowUpTask> {
    return this.http.put<FollowUpTask>(`${this.baseUrl}/tasks/${id}`, payload);
  }

  completeTask(
    id: number,
    payload: {
      completion_outcome: string;
      completion_notes?: string;
      create_next_task?: boolean;
      next_task_title?: string;
      next_task_category?: string;
      next_task_due_date?: string;
    }
  ): Observable<FollowUpTask> {
    return this.http.put<FollowUpTask>(`${this.baseUrl}/tasks/${id}/complete`, payload);
  }

  escalateTask(id: number, managerId?: number): Observable<FollowUpTask> {
    let params = new HttpParams();
    if (managerId) params = params.set('manager_id', String(managerId));
    return this.http.post<FollowUpTask>(`${this.baseUrl}/tasks/${id}/escalate`, {}, { params });
  }

  deleteTask(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/tasks/${id}`);
  }

  // =====================================================================
  // Spec 4.9: Customer Communication History
  // =====================================================================

  getCommunications(filters: CommunicationFilters = {}): Observable<CommunicationPaginatedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page || 1))
      .set('limit', String(filters.limit || 20));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.channel) params = params.set('channel', filters.channel);
    if (filters.direction) params = params.set('direction', filters.direction);
    if (filters.lead_id) params = params.set('lead_id', String(filters.lead_id));
    if (filters.customer_id) params = params.set('customer_id', String(filters.customer_id));
    if (filters.delivery_status) params = params.set('delivery_status', filters.delivery_status);

    return this.http.get<CommunicationPaginatedResponse>(`${this.baseUrl}/communications`, { params });
  }

  logCommunication(payload: Partial<CommunicationHistory>): Observable<CommunicationHistory> {
    return this.http.post<CommunicationHistory>(`${this.baseUrl}/communications`, payload);
  }

  getCustomerTimeline(leadId?: number, customerId?: number): Observable<CustomerTimelineItem[]> {
    let params = new HttpParams();
    if (leadId) params = params.set('lead_id', String(leadId));
    if (customerId) params = params.set('customer_id', String(customerId));
    return this.http.get<CustomerTimelineItem[]>(`${this.baseUrl}/communications/timeline`, { params });
  }

  // =====================================================================
  // Spec 4.10: Broker and Referral Management
  // =====================================================================

  getBrokers(filters: BrokerFilters = {}): Observable<BrokerPaginatedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page || 1))
      .set('limit', String(filters.limit || 20));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.broker_type) params = params.set('broker_type', filters.broker_type);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.service_area) params = params.set('service_area', filters.service_area);

    return this.http.get<BrokerPaginatedResponse>(`${this.baseUrl}/brokers`, { params });
  }

  getBroker(id: number): Observable<Broker> {
    return this.http.get<Broker>(`${this.baseUrl}/brokers/${id}`);
  }

  createBroker(payload: BrokerCreate): Observable<Broker> {
    return this.http.post<Broker>(`${this.baseUrl}/brokers`, payload);
  }

  updateBroker(id: number, payload: BrokerUpdate): Observable<Broker> {
    return this.http.put<Broker>(`${this.baseUrl}/brokers/${id}`, payload);
  }

  deleteBroker(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/brokers/${id}`);
  }

  getBrokerStats(): Observable<BrokerStatsSummary> {
    return this.http.get<BrokerStatsSummary>(`${this.baseUrl}/brokers/stats/summary`);
  }

  getBrokerPerformance(brokerId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/brokers/${brokerId}/performance`);
  }

  getCommissionClaims(filters: CommissionClaimFilters = {}): Observable<CommissionClaimPaginatedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page || 1))
      .set('limit', String(filters.limit || 20));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.broker_id) params = params.set('broker_id', String(filters.broker_id));
    if (filters.claim_status) params = params.set('claim_status', filters.claim_status);
    if (filters.milestone_achieved) params = params.set('milestone_achieved', filters.milestone_achieved);
    if (filters.is_milestone_verified !== undefined) {
      params = params.set('is_milestone_verified', String(filters.is_milestone_verified));
    }

    return this.http.get<CommissionClaimPaginatedResponse>(`${this.baseUrl}/commission-claims`, { params });
  }

  getCommissionClaim(id: number): Observable<CommissionClaim> {
    return this.http.get<CommissionClaim>(`${this.baseUrl}/commission-claims/${id}`);
  }

  createCommissionClaim(payload: CommissionClaimCreate): Observable<CommissionClaim> {
    return this.http.post<CommissionClaim>(`${this.baseUrl}/commission-claims`, payload);
  }

  updateCommissionClaim(id: number, payload: CommissionClaimUpdate): Observable<CommissionClaim> {
    return this.http.put<CommissionClaim>(`${this.baseUrl}/commission-claims/${id}`, payload);
  }

  verifyClaimMilestone(id: number): Observable<CommissionClaim> {
    return this.http.post<CommissionClaim>(`${this.baseUrl}/commission-claims/${id}/verify-milestone`, {});
  }

  approveCommissionClaim(id: number, payload: CommissionClaimApproval): Observable<CommissionClaim> {
    return this.http.post<CommissionClaim>(`${this.baseUrl}/commission-claims/${id}/approve`, payload);
  }

  disburseCommissionClaim(id: number, payload: CommissionClaimDisburse): Observable<CommissionClaim> {
    return this.http.post<CommissionClaim>(`${this.baseUrl}/commission-claims/${id}/disburse`, payload);
  }

  deleteCommissionClaim(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/commission-claims/${id}`);
  }

  // =====================================================================
  // Spec 4.11: Sales Funnel and Lead Conversion
  // =====================================================================

  getFunnelStages(): Observable<FunnelStage[]> {
    return this.http.get<FunnelStage[]>(`${this.baseUrl}/funnel/stages`);
  }

  createFunnelStage(payload: FunnelStageCreate): Observable<FunnelStage> {
    return this.http.post<FunnelStage>(`${this.baseUrl}/funnel/stages`, payload);
  }

  updateFunnelStage(id: number, payload: FunnelStageUpdate): Observable<FunnelStage> {
    return this.http.put<FunnelStage>(`${this.baseUrl}/funnel/stages/${id}`, payload);
  }

  deleteFunnelStage(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/funnel/stages/${id}`);
  }

  transitionLeadStage(leadId: number, payload: LeadStageTransitionCreate): Observable<LeadStageTransition> {
    return this.http.post<LeadStageTransition>(`${this.baseUrl}/leads/${leadId}/stage-transition`, payload);
  }

  disqualifyLead(leadId: number, payload: LeadDisqualifyRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leads/${leadId}/disqualify`, payload);
  }

  reopenLead(leadId: number, payload: LeadReopenRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leads/${leadId}/reopen`, payload);
  }

  getLeadStageHistory(leadId: number): Observable<LeadStageTransition[]> {
    return this.http.get<LeadStageTransition[]>(`${this.baseUrl}/leads/${leadId}/stage-history`);
  }

  getOpportunities(filters: OpportunityFilters = {}): Observable<OpportunityPaginatedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page || 1))
      .set('limit', String(filters.limit || 20));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.stage) params = params.set('stage', filters.stage);
    if (filters.sales_rep_id) params = params.set('sales_rep_id', String(filters.sales_rep_id));
    if (filters.project_id) params = params.set('project_id', String(filters.project_id));
    if (filters.customer_id) params = params.set('customer_id', String(filters.customer_id));

    return this.http.get<OpportunityPaginatedResponse>(`${this.baseUrl}/opportunities`, { params });
  }

  getOpportunity(id: number): Observable<Opportunity> {
    return this.http.get<Opportunity>(`${this.baseUrl}/opportunities/${id}`);
  }

  createOpportunity(payload: OpportunityCreate): Observable<Opportunity> {
    return this.http.post<Opportunity>(`${this.baseUrl}/opportunities`, payload);
  }

  updateOpportunity(id: number, payload: OpportunityUpdate): Observable<Opportunity> {
    return this.http.put<Opportunity>(`${this.baseUrl}/opportunities/${id}`, payload);
  }

  deleteOpportunity(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/opportunities/${id}`);
  }

  getBookingHandovers(filters: BookingHandoverFilters = {}): Observable<BookingHandoverPaginatedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page || 1))
      .set('limit', String(filters.limit || 20));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.sales_rep_id) params = params.set('sales_rep_id', String(filters.sales_rep_id));
    if (filters.project_id) params = params.set('project_id', String(filters.project_id));

    return this.http.get<BookingHandoverPaginatedResponse>(`${this.baseUrl}/booking-handovers`, { params });
  }

  getBookingHandover(id: number): Observable<BookingHandover> {
    return this.http.get<BookingHandover>(`${this.baseUrl}/booking-handovers/${id}`);
  }

  createBookingHandover(payload: BookingHandoverCreate): Observable<BookingHandover> {
    return this.http.post<BookingHandover>(`${this.baseUrl}/booking-handovers`, payload);
  }

  reviewBookingHandover(id: number, payload: BookingHandoverReview): Observable<BookingHandover> {
    return this.http.post<BookingHandover>(`${this.baseUrl}/booking-handovers/${id}/review`, payload);
  }

  updateBookingHandover(id: number, payload: BookingHandoverUpdate): Observable<BookingHandover> {
    return this.http.put<BookingHandover>(`${this.baseUrl}/booking-handovers/${id}`, payload);
  }

  updateHandoverVerification(id: number, payload: BookingHandoverVerificationUpdate): Observable<BookingHandover> {
    return this.http.put<BookingHandover>(`${this.baseUrl}/booking-handovers/${id}/verification`, payload);
  }

  generateHandoverReservation(id: number): Observable<BookingHandover> {
    return this.http.post<BookingHandover>(`${this.baseUrl}/booking-handovers/${id}/generate-reservation`, {});
  }

  deleteBookingHandover(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/booking-handovers/${id}`);
  }

  // Spec 4.13 Campaign Management
  getCampaigns(filters: { channel?: string; status?: string; project_id?: number; search?: string; page?: number; limit?: number } = {}): Observable<CampaignPaginatedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page || 1))
      .set('limit', String(filters.limit || 20));
    if (filters.channel && filters.channel !== 'ALL') params = params.set('channel', filters.channel);
    if (filters.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters.project_id) params = params.set('project_id', String(filters.project_id));
    if (filters.search) params = params.set('search', filters.search);
    return this.http.get<CampaignPaginatedResponse>(`${this.baseUrl}/campaigns`, { params });
  }

  getCampaign(id: number): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.baseUrl}/campaigns/${id}`);
  }

  createCampaign(payload: CampaignCreate): Observable<Campaign> {
    return this.http.post<Campaign>(`${this.baseUrl}/campaigns`, payload);
  }

  updateCampaign(id: number, payload: CampaignUpdate): Observable<Campaign> {
    return this.http.put<Campaign>(`${this.baseUrl}/campaigns/${id}`, payload);
  }

  deleteCampaign(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/campaigns/${id}`);
  }

  getCampaignDashboardKpis(): Observable<CampaignMarketingDashboardKpis> {
    return this.http.get<CampaignMarketingDashboardKpis>(`${this.baseUrl}/campaigns/dashboard/kpis`);
  }

  getMarketingTouchpoints(leadId?: number, campaignId?: number): Observable<MarketingTouchpoint[]> {
    let params = new HttpParams();
    if (leadId) params = params.set('lead_id', String(leadId));
    if (campaignId) params = params.set('campaign_id', String(campaignId));
    return this.http.get<MarketingTouchpoint[]>(`${this.baseUrl}/campaigns/touchpoints/list`, { params });
  }

  createMarketingTouchpoint(payload: MarketingTouchpointCreate): Observable<MarketingTouchpoint> {
    return this.http.post<MarketingTouchpoint>(`${this.baseUrl}/campaigns/touchpoints`, payload);
  }

  getSuppressionList(filters: { search?: string; reason?: string; page?: number; limit?: number } = {}): Observable<SuppressionPaginatedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page || 1))
      .set('limit', String(filters.limit || 20));
    if (filters.search) params = params.set('search', filters.search);
    if (filters.reason && filters.reason !== 'ALL') params = params.set('reason', filters.reason);
    return this.http.get<SuppressionPaginatedResponse>(`${this.baseUrl}/suppression-list`, { params });
  }

  createSuppressionEntry(payload: SuppressionEntryCreate): Observable<SuppressionEntry> {
    return this.http.post<SuppressionEntry>(`${this.baseUrl}/suppression-list`, payload);
  }

  deleteSuppressionEntry(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/suppression-list/${id}`);
  }

  importOfflineExhibitionLeads(payload: OfflineExhibitionImportPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/campaigns/offline-leads/import`, payload);
  }

  getFunnelAnalytics(projectId?: number, salesRepId?: number, cohortPeriod: string = 'LAST_30_DAYS'): Observable<ConversionKpiResponse> {
    let params = new HttpParams().set('cohort_period', cohortPeriod);
    if (projectId) params = params.set('project_id', String(projectId));
    if (salesRepId) params = params.set('sales_rep_id', String(salesRepId));
    return this.http.get<ConversionKpiResponse>(`${this.baseUrl}/funnel/analytics`, { params });
  }
}


