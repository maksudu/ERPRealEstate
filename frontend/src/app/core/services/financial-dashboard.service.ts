import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FilterOptionsResponse,
  DashboardKPIsResponse,
  ProjectFinancialSummaryResponse,
  DrilldownResponse,
  DashboardFilterState
} from '../models/financial-dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class FinancialDashboardService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounts/financial-dashboard`;

  getFilterOptions(): Observable<FilterOptionsResponse> {
    return this.http.get<FilterOptionsResponse>(`${this.baseUrl}/filters`);
  }

  getDashboardKPIs(filters?: DashboardFilterState): Observable<DashboardKPIsResponse> {
    let p = new HttpParams();
    if (filters?.organization_id) p = p.set('organization_id', filters.organization_id);
    if (filters?.fiscal_year_id) p = p.set('fiscal_year_id', filters.fiscal_year_id);
    if (filters?.project_id) p = p.set('project_id', filters.project_id);
    if (filters?.cost_center_id) p = p.set('cost_center_id', filters.cost_center_id);
    if (filters?.account_group) p = p.set('account_group', filters.account_group);
    if (filters?.account_id) p = p.set('account_id', filters.account_id);
    if (filters?.voucher_type) p = p.set('voucher_type', filters.voucher_type);
    if (filters?.voucher_status) p = p.set('voucher_status', filters.voucher_status);
    if (filters?.bank_account_id) p = p.set('bank_account_id', filters.bank_account_id);
    if (filters?.currency) p = p.set('currency', filters.currency);
    if (filters?.from_date) p = p.set('from_date', filters.from_date);
    if (filters?.to_date) p = p.set('to_date', filters.to_date);

    return this.http.get<DashboardKPIsResponse>(`${this.baseUrl}/kpis`, { params: p });
  }

  getProjectsFinancialSummary(district?: string, status_filter?: string): Observable<ProjectFinancialSummaryResponse> {
    let p = new HttpParams();
    if (district) p = p.set('district', district);
    if (status_filter) p = p.set('status_filter', status_filter);
    return this.http.get<ProjectFinancialSummaryResponse>(`${this.baseUrl}/projects-summary`, { params: p });
  }

  getDrilldownTransactions(params: {
    kpi_type: string;
    project_id?: number | null;
    cost_center_id?: number | null;
    from_date?: string;
    to_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<DrilldownResponse> {
    let p = new HttpParams().set('kpi_type', params.kpi_type);
    if (params.project_id) p = p.set('project_id', params.project_id);
    if (params.cost_center_id) p = p.set('cost_center_id', params.cost_center_id);
    if (params.from_date) p = p.set('from_date', params.from_date);
    if (params.to_date) p = p.set('to_date', params.to_date);
    if (params.search) p = p.set('search', params.search);
    if (params.limit) p = p.set('limit', params.limit);
    if (params.offset !== undefined) p = p.set('offset', params.offset);

    return this.http.get<DrilldownResponse>(`${this.baseUrl}/drilldown`, { params: p });
  }
}
