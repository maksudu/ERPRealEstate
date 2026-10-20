import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Project,
  Tower,
  AuthorityClearance,
  BOQItem,
  Drawing,
  DrawingPaginationResponse,
  ProjectFinancialPerformance,
  ProjectFinancialPerformancePaginationResponse,
  ProjectPnLAnalyticsResponse,
  FARCalculationResult
} from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/projects`;

  // 1. FAR Calculator (Dhaka Building Construction Rules 2008)
  calculateFAR(params: { plot_area_sqft: number; road_width_feet: number; occupancy_type?: string }): Observable<FARCalculationResult> {
    let httpParams = new HttpParams()
      .set('plot_area_sqft', params.plot_area_sqft)
      .set('road_width_feet', params.road_width_feet);
    if (params.occupancy_type) {
      httpParams = httpParams.set('occupancy_type', params.occupancy_type);
    }
    return this.http.get<FARCalculationResult>(`${this.baseUrl}/far-calculator`, { params: httpParams });
  }

  // 2. Projects Master
  getProjects(filters?: { authority?: string; status?: string; search?: string }): Observable<Project[]> {
    let params = new HttpParams();
    if (filters?.authority) params = params.set('authority', filters.authority);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<Project[]>(`${this.baseUrl}/list`, { params });
  }

  getProject(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/list/${id}`);
  }

  createProject(payload: any): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/list`, payload);
  }

  updateProject(id: number, payload: any): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/list/${id}`, payload);
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/list/${id}`);
  }

  getMetaOptions(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/meta/options`);
  }

  // Project Feasibility & Investment Analysis
  getFeasibilities(filters?: { project_id?: number; status?: string; search?: string }): Observable<any[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<any[]>(`${this.baseUrl}/feasibilities`, { params });
  }

  createFeasibility(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/feasibilities`, payload);
  }

  updateFeasibility(id: number, action?: string, remarks?: string): Observable<any> {
    let params = new HttpParams();
    if (action) params = params.set('action', action);
    if (remarks) params = params.set('remarks', remarks);
    return this.http.put<any>(`${this.baseUrl}/feasibilities/${id}`, {}, { params });
  }

  simulateFeasibility(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/feasibilities/simulate`, payload);
  }

  // 3. Authority Clearances & Regulatory Approvals (Submodule 2.8)
  getClearances(filters?: {
    project_id?: number;
    authority_name?: string;
    clearance_type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.authority_name) params = params.set('authority_name', filters.authority_name);
    if (filters?.clearance_type) params = params.set('clearance_type', filters.clearance_type);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<any>(`${this.baseUrl}/clearances`, { params });
  }

  getClearanceById(id: number): Observable<AuthorityClearance> {
    return this.http.get<AuthorityClearance>(`${this.baseUrl}/clearances/${id}`);
  }

  createClearance(payload: any): Observable<AuthorityClearance> {
    return this.http.post<AuthorityClearance>(`${this.baseUrl}/clearances`, payload);
  }

  updateClearance(id: number, payload: any): Observable<AuthorityClearance> {
    return this.http.put<AuthorityClearance>(`${this.baseUrl}/clearances/${id}`, payload);
  }

  deleteClearance(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/clearances/${id}`);
  }

  seedStandardClearances(projectId: number): Observable<any> {
    let params = new HttpParams().set('project_id', projectId);
    return this.http.post<any>(`${this.baseUrl}/clearances/seed-standard-clearances`, {}, { params });
  }

  // 4. BOQ Items
  getBOQItems(filters?: { project_id?: number; tower_id?: number; material_category?: string }): Observable<BOQItem[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.material_category) params = params.set('material_category', filters.material_category);
    return this.http.get<BOQItem[]>(`${this.baseUrl}/boq`, { params });
  }

  createBOQItem(payload: any): Observable<BOQItem> {
    return this.http.post<BOQItem>(`${this.baseUrl}/boq`, payload);
  }

  // 5. Drawings & Document Management (Submodule 2.9)
  getDrawings(filters?: {
    project_id?: number;
    tower_id?: number;
    drawing_category_id?: string;
    discipline?: string;
    status?: string;
    floor_level?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<DrawingPaginationResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.drawing_category_id) params = params.set('drawing_category_id', filters.drawing_category_id);
    if (filters?.discipline) params = params.set('discipline', filters.discipline);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.floor_level) params = params.set('floor_level', filters.floor_level);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<DrawingPaginationResponse>(`${this.baseUrl}/drawings`, { params });
  }

  getDrawingById(id: number): Observable<Drawing> {
    return this.http.get<Drawing>(`${this.baseUrl}/drawings/${id}`);
  }

  createDrawing(payload: any): Observable<Drawing> {
    return this.http.post<Drawing>(`${this.baseUrl}/drawings`, payload);
  }

  updateDrawing(id: number, payload: any): Observable<Drawing> {
    return this.http.put<Drawing>(`${this.baseUrl}/drawings/${id}`, payload);
  }

  deleteDrawing(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/drawings/${id}`);
  }

  recordDrawingDownload(id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/drawings/${id}/download`, {});
  }

  createDrawingRevision(payload: any): Observable<Drawing> {
    return this.createDrawing(payload);
  }

  getTowers(projectId?: number): Observable<Tower[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<Tower[]>(`${this.baseUrl}/towers`, { params });
  }

  seedStandardDrawings(projectId: number): Observable<any> {
    let params = new HttpParams().set('project_id', projectId);
    return this.http.post<any>(`${this.baseUrl}/drawings/seed-standard-drawings`, {}, { params });
  }

  // --------------------------------------------------------------------------
  // Submodule 2.6: Estimated Profitability and ROI Methods
  // --------------------------------------------------------------------------
  getProfitabilityList(filters?: {
    project_id?: number;
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<any>(`${this.baseUrl}/profitability`, { params });
  }

  getProfitabilityById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/profitability/${id}`);
  }

  createProfitability(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/profitability`, payload);
  }

  updateProfitability(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/profitability/${id}`, payload);
  }

  deleteProfitability(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/profitability/${id}`);
  }

  simulateProfitability(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/profitability/simulate`, payload);
  }

  // --------------------------------------------------------------------------
  // Submodule 2.7: Project Timeline and Milestone Tracking Methods
  // --------------------------------------------------------------------------
  getMilestones(filters?: {
    project_id?: number;
    search?: string;
    status?: string;
    critical_path_only?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.critical_path_only !== undefined) params = params.set('critical_path_only', filters.critical_path_only);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<any>(`${this.baseUrl}/milestones`, { params });
  }

  getMilestoneById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/milestones/${id}`);
  }

  createMilestone(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/milestones`, payload);
  }

  updateMilestone(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/milestones/${id}`, payload);
  }

  deleteMilestone(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/milestones/${id}`);
  }

  generateStandard15Milestones(projectId: number): Observable<any> {
    let params = new HttpParams().set('project_id', projectId);
    return this.http.post<any>(`${this.baseUrl}/milestones/generate-standard-15`, {}, { params });
  }

  // --------------------------------------------------------------------------
  // Submodule 2.13: Project-wise Profit & Loss (Financial Performance)
  // --------------------------------------------------------------------------
  getFinancialPerformances(filters?: {
    project_id?: number;
    fiscal_year?: string;
    period_type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<ProjectFinancialPerformancePaginationResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.fiscal_year) params = params.set('fiscal_year', filters.fiscal_year);
    if (filters?.period_type) params = params.set('period_type', filters.period_type);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<ProjectFinancialPerformancePaginationResponse>(`${this.baseUrl}/financial-performance`, { params });
  }

  getFinancialPerformanceById(id: number): Observable<ProjectFinancialPerformance> {
    return this.http.get<ProjectFinancialPerformance>(`${this.baseUrl}/financial-performance/${id}`);
  }

  createFinancialPerformance(payload: any): Observable<ProjectFinancialPerformance> {
    return this.http.post<ProjectFinancialPerformance>(`${this.baseUrl}/financial-performance`, payload);
  }

  updateFinancialPerformance(id: number, payload: any): Observable<ProjectFinancialPerformance> {
    return this.http.put<ProjectFinancialPerformance>(`${this.baseUrl}/financial-performance/${id}`, payload);
  }

  deleteFinancialPerformance(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/financial-performance/${id}`);
  }

  seedSamplePnL(projectId: number): Observable<any> {
    let params = new HttpParams().set('project_id', projectId);
    return this.http.post<any>(`${this.baseUrl}/financial-performance/seed-sample-pnl`, {}, { params });
  }

  // --------------------------------------------------------------------------
  // Submodule 2.14: Project BI Reports & Integrated Intelligence Analytics
  // --------------------------------------------------------------------------
  getPnLAnalytics(filters?: {
    project_id?: number;
    period_type?: string;
    fiscal_year?: string;
  }): Observable<ProjectPnLAnalyticsResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.period_type) params = params.set('period_type', filters.period_type);
    if (filters?.fiscal_year) params = params.set('fiscal_year', filters.fiscal_year);
    return this.http.get<ProjectPnLAnalyticsResponse>(`${this.baseUrl}/reports/pnl-analytics`, { params });
  }
}

