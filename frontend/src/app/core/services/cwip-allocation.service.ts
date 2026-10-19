import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CWIPAllocation,
  CWIPAllocationListResponse,
  CWIPMaterialIssue,
  CWIPMaterialIssueListResponse,
  CWIPUnitCOGSTransfer,
  CWIPBudgetTrackingResponse,
  CWIPPortfolioSummaryKPIs,
  CWIPAllocationCreatePayload,
  CWIPMaterialIssueCreatePayload,
  CWIPUnitCOGSTransferPayload
} from '../models/cwip-allocation.model';

@Injectable({
  providedIn: 'root'
})
export class CWIPAllocationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounts/cwip-allocations`;

  // 12.1 Portfolio KPIs
  getKPIs(): Observable<CWIPPortfolioSummaryKPIs> {
    return this.http.get<CWIPPortfolioSummaryKPIs>(`${this.baseUrl}/kpis`);
  }

  // 12.1 & 12.2 List Allocations
  getAllocations(params?: {
    search?: string;
    cost_category?: string;
    allocation_method?: string;
    project_id?: number;
    limit?: number;
    offset?: number;
  }): Observable<CWIPAllocationListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.cost_category && params.cost_category !== 'ALL') httpParams = httpParams.set('cost_category', params.cost_category);
      if (params.allocation_method && params.allocation_method !== 'ALL') httpParams = httpParams.set('allocation_method', params.allocation_method);
      if (params.project_id) httpParams = httpParams.set('project_id', params.project_id.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.offset !== undefined) httpParams = httpParams.set('offset', params.offset.toString());
    }
    return this.http.get<CWIPAllocationListResponse>(`${this.baseUrl}/allocations`, { params: httpParams });
  }

  // Create Cost Allocation
  createAllocation(payload: CWIPAllocationCreatePayload): Observable<CWIPAllocation> {
    return this.http.post<CWIPAllocation>(`${this.baseUrl}/allocations`, payload);
  }

  // 12.3 List Material Issues to Construction
  getMaterialIssues(params?: {
    search?: string;
    project_id?: number;
    limit?: number;
    offset?: number;
  }): Observable<CWIPMaterialIssueListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.project_id) httpParams = httpParams.set('project_id', params.project_id.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.offset !== undefined) httpParams = httpParams.set('offset', params.offset.toString());
    }
    return this.http.get<CWIPMaterialIssueListResponse>(`${this.baseUrl}/material-issues`, { params: httpParams });
  }

  // 12.3 Post Material Issue
  createMaterialIssue(payload: CWIPMaterialIssueCreatePayload): Observable<CWIPMaterialIssue> {
    return this.http.post<CWIPMaterialIssue>(`${this.baseUrl}/material-issues`, payload);
  }

  // 12.3 Transfer CWIP to COGS upon sale
  transferToCOGS(payload: CWIPUnitCOGSTransferPayload): Observable<CWIPUnitCOGSTransfer> {
    return this.http.post<CWIPUnitCOGSTransfer>(`${this.baseUrl}/cogs-transfers`, payload);
  }

  // 12.1 Budget vs Actual & Cost-to-Complete Forecast
  getBudgetTracking(): Observable<CWIPBudgetTrackingResponse> {
    return this.http.get<CWIPBudgetTrackingResponse>(`${this.baseUrl}/budget-vs-actual`);
  }

  // Seed Demo Data
  seedDemoData(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/seed-demo-data`, {});
  }
}
