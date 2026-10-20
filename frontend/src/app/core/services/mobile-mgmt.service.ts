import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface MgmtDashboardMetrics {
  fiscal_period: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin_percentage: number;
  total_collections: number;
  outstanding_receivables: number;
  active_projects_count: number;
  total_workforce: number;
  pending_executive_approvals: number;
  currency: string;
  last_synced: string;
}

export interface MgmtProjectItem {
  id?: number;
  project_name: string;
  location: string;
  total_budget: number;
  actual_cost: number;
  cost_variance: number;
  progress_percentage: number;
  estimated_revenue: number;
  projected_profitability_percentage: number;
  status: string;
  created_at?: string;
}

export interface MgmtSalesAnalyticsItem {
  id?: number;
  project_name: string;
  total_units: number;
  booked_units: number;
  available_units: number;
  sales_target: number;
  actual_sales: number;
  conversion_rate_percentage: number;
  average_price_per_sqft: number;
  created_at?: string;
}

export interface MgmtCashFlowItem {
  id?: number;
  period_month: string;
  receivables_due: number;
  payables_due: number;
  net_cash_position: number;
  projected_collections: number;
  actual_surplus_deficit: number;
  created_at?: string;
}

export interface MgmtApprovalItem {
  id?: number;
  approval_code?: string;
  request_category: string;
  title: string;
  project_name: string;
  requested_amount: number;
  requested_by: string;
  priority: string;
  status?: string;
  executive_notes?: string;
  created_at?: string;
}

export interface MgmtProcurementItem {
  id?: number;
  pr_code?: string;
  project_name: string;
  material_description: string;
  estimated_cost: number;
  lowest_quotation_cost: number;
  vendor_selected?: string;
  po_status: string;
  created_at?: string;
}

export interface MgmtConstructionItem {
  id?: number;
  milestone_code?: string;
  project_name: string;
  milestone_name: string;
  target_completion_date: string;
  delay_days: number;
  contractor_name: string;
  contractor_performance_score: number;
  status: string;
  critical_issues?: string;
  created_at?: string;
}

export interface MgmtHrOverviewItem {
  id?: number;
  department_name: string;
  total_headcount: number;
  present_today: number;
  on_leave: number;
  monthly_payroll_cost: number;
  pending_leave_requests: number;
  created_at?: string;
}

export interface MgmtComplianceItem {
  id?: number;
  alert_code?: string;
  compliance_type?: string;
  authority_name?: string;
  authority?: string;
  document_type?: string;
  reference_number?: string;
  project_name: string;
  issue_date?: string;
  expiry_date: string;
  days_remaining: number;
  risk_level: string;
  status: string;
  responsible_person?: string;
  created_at?: string;
}

export interface MgmtReportItem {
  id?: number;
  report_code?: string;
  title: string;
  category: string;
  format?: string;
  file_format?: string;
  generation_date?: string;
  period?: string;
  generated_by: string;
  file_size: string;
  download_url?: string;
  download_count?: number;
  created_at?: string;
}

export type MobileMgmtCompliance = MgmtComplianceItem;
export type MobileMgmtReport = MgmtReportItem;


@Injectable({
  providedIn: 'root'
})
export class MobileMgmtService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/mobile-mgmt`;

  // 1. Dashboard
  getDashboardMetrics(): Observable<MgmtDashboardMetrics> {
    return this.http.get<MgmtDashboardMetrics>(`${this.apiUrl}/dashboard/metrics`);
  }

  // 2. Projects
  getProjects(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MgmtProjectItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MgmtProjectItem>>(`${this.apiUrl}/projects`, { params: p });
  }

  createProject(data: Partial<MgmtProjectItem>): Observable<MgmtProjectItem> {
    return this.http.post<MgmtProjectItem>(`${this.apiUrl}/projects`, data);
  }

  updateProject(id: number, data: Partial<MgmtProjectItem>): Observable<MgmtProjectItem> {
    return this.http.put<MgmtProjectItem>(`${this.apiUrl}/projects/${id}`, data);
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/projects/${id}`);
  }

  // 3. Sales Analytics
  getSalesAnalytics(params?: { search?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MgmtSalesAnalyticsItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MgmtSalesAnalyticsItem>>(`${this.apiUrl}/sales-analytics`, { params: p });
  }

  createSalesAnalytics(data: Partial<MgmtSalesAnalyticsItem>): Observable<MgmtSalesAnalyticsItem> {
    return this.http.post<MgmtSalesAnalyticsItem>(`${this.apiUrl}/sales-analytics`, data);
  }

  updateSalesAnalytics(id: number, data: Partial<MgmtSalesAnalyticsItem>): Observable<MgmtSalesAnalyticsItem> {
    return this.http.put<MgmtSalesAnalyticsItem>(`${this.apiUrl}/sales-analytics/${id}`, data);
  }

  deleteSalesAnalytics(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sales-analytics/${id}`);
  }

  // 4. Cash Flow
  getCashFlows(params?: { limit?: number; offset?: number }): Observable<PaginatedResult<MgmtCashFlowItem>> {
    let p = new HttpParams();
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MgmtCashFlowItem>>(`${this.apiUrl}/cashflow`, { params: p });
  }

  createCashFlow(data: Partial<MgmtCashFlowItem>): Observable<MgmtCashFlowItem> {
    return this.http.post<MgmtCashFlowItem>(`${this.apiUrl}/cashflow`, data);
  }

  updateCashFlow(id: number, data: Partial<MgmtCashFlowItem>): Observable<MgmtCashFlowItem> {
    return this.http.put<MgmtCashFlowItem>(`${this.apiUrl}/cashflow/${id}`, data);
  }

  deleteCashFlow(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/cashflow/${id}`);
  }

  // 5. Approvals
  getApprovals(params?: { search?: string; category?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MgmtApprovalItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.category) p = p.set('category', params.category);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MgmtApprovalItem>>(`${this.apiUrl}/approvals`, { params: p });
  }

  createApproval(data: Partial<MgmtApprovalItem>): Observable<MgmtApprovalItem> {
    return this.http.post<MgmtApprovalItem>(`${this.apiUrl}/approvals`, data);
  }

  actionApproval(id: number, payload: { status: string; executive_notes?: string }): Observable<MgmtApprovalItem> {
    return this.http.put<MgmtApprovalItem>(`${this.apiUrl}/approvals/${id}/action`, payload);
  }

  deleteApproval(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/approvals/${id}`);
  }

  // 6. Procurement
  getProcurements(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MgmtProcurementItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MgmtProcurementItem>>(`${this.apiUrl}/procurement`, { params: p });
  }

  createProcurement(data: Partial<MgmtProcurementItem>): Observable<MgmtProcurementItem> {
    return this.http.post<MgmtProcurementItem>(`${this.apiUrl}/procurement`, data);
  }

  updateProcurement(id: number, data: Partial<MgmtProcurementItem>): Observable<MgmtProcurementItem> {
    return this.http.put<MgmtProcurementItem>(`${this.apiUrl}/procurement/${id}`, data);
  }

  deleteProcurement(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/procurement/${id}`);
  }

  // 7. Construction
  getConstructions(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MgmtConstructionItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MgmtConstructionItem>>(`${this.apiUrl}/construction`, { params: p });
  }

  createConstruction(data: Partial<MgmtConstructionItem>): Observable<MgmtConstructionItem> {
    return this.http.post<MgmtConstructionItem>(`${this.apiUrl}/construction`, data);
  }

  updateConstruction(id: number, data: Partial<MgmtConstructionItem>): Observable<MgmtConstructionItem> {
    return this.http.put<MgmtConstructionItem>(`${this.apiUrl}/construction/${id}`, data);
  }

  deleteConstruction(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/construction/${id}`);
  }

  // 8. HR Overview
  getHrOverviews(params?: { search?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MgmtHrOverviewItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MgmtHrOverviewItem>>(`${this.apiUrl}/hr-overview`, { params: p });
  }

  createHrOverview(data: Partial<MgmtHrOverviewItem>): Observable<MgmtHrOverviewItem> {
    return this.http.post<MgmtHrOverviewItem>(`${this.apiUrl}/hr-overview`, data);
  }

  updateHrOverview(id: number, data: Partial<MgmtHrOverviewItem>): Observable<MgmtHrOverviewItem> {
    return this.http.put<MgmtHrOverviewItem>(`${this.apiUrl}/hr-overview/${id}`, data);
  }

  deleteHrOverview(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/hr-overview/${id}`);
  }

  // 9. Compliance
  getCompliances(params?: { search?: string; risk_level?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MgmtComplianceItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.risk_level) p = p.set('risk_level', params.risk_level);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MgmtComplianceItem>>(`${this.apiUrl}/compliance`, { params: p });
  }

  getCompliance(params?: any): Observable<PaginatedResult<MgmtComplianceItem>> {
    return this.getCompliances(params);
  }

  createCompliance(data: Partial<MgmtComplianceItem>): Observable<MgmtComplianceItem> {
    return this.http.post<MgmtComplianceItem>(`${this.apiUrl}/compliance`, data);
  }

  updateCompliance(id: number, data: Partial<MgmtComplianceItem>): Observable<MgmtComplianceItem> {
    return this.http.put<MgmtComplianceItem>(`${this.apiUrl}/compliance/${id}`, data);
  }

  deleteCompliance(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/compliance/${id}`);
  }

  // 10. Reports
  getReports(params?: { search?: string; category?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MgmtReportItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.category) p = p.set('category', params.category);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MgmtReportItem>>(`${this.apiUrl}/reports`, { params: p });
  }

  createReport(data: Partial<MgmtReportItem>): Observable<MgmtReportItem> {
    return this.http.post<MgmtReportItem>(`${this.apiUrl}/reports`, data);
  }

  updateReport(id: number, data: Partial<MgmtReportItem>): Observable<MgmtReportItem> {
    return this.http.put<MgmtReportItem>(`${this.apiUrl}/reports/${id}`, data);
  }

  deleteReport(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reports/${id}`);
  }

  // 11. Auth Session
  getAuthSession(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/session`);
  }
}
