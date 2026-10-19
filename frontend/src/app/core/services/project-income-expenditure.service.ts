import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ProjectFinancialDimensionConfig,
  DimensionConfigPaginationResponse,
  ProjectIncomeTransaction,
  ProjectIncomePaginationResponse,
  ProjectExpenditureTransaction,
  ProjectExpenditurePaginationResponse,
  MultiProjectProfitabilityReportResponse
} from '../models/project-income-expenditure.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectIncomeExpenditureService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounts`;

  // ==========================================================================
  // 11.1 Project Financial Dimensions Configuration
  // ==========================================================================

  getDimensionConfigs(params?: {
    search?: string;
    transaction_type?: string;
    account_type?: string;
    limit?: number;
    offset?: number;
  }): Observable<DimensionConfigPaginationResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.transaction_type && params.transaction_type !== 'ALL') {
        httpParams = httpParams.set('transaction_type', params.transaction_type);
      }
      if (params.account_type) httpParams = httpParams.set('account_type', params.account_type);
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.offset !== undefined) httpParams = httpParams.set('offset', params.offset.toString());
    }
    return this.http.get<DimensionConfigPaginationResponse>(`${this.baseUrl}/project-dimensions/configs`, { params: httpParams });
  }

  getDimensionConfig(id: number): Observable<ProjectFinancialDimensionConfig> {
    return this.http.get<ProjectFinancialDimensionConfig>(`${this.baseUrl}/project-dimensions/configs/${id}`);
  }

  createDimensionConfig(payload: ProjectFinancialDimensionConfig): Observable<ProjectFinancialDimensionConfig> {
    return this.http.post<ProjectFinancialDimensionConfig>(`${this.baseUrl}/project-dimensions/configs`, payload);
  }

  updateDimensionConfig(id: number, payload: Partial<ProjectFinancialDimensionConfig>): Observable<ProjectFinancialDimensionConfig> {
    return this.http.put<ProjectFinancialDimensionConfig>(`${this.baseUrl}/project-dimensions/configs/${id}`, payload);
  }

  deleteDimensionConfig(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/project-dimensions/configs/${id}`);
  }

  validateDimensions(payload: any): Observable<{ valid: boolean; missing_dimensions: string[]; applied_rule_id?: number }> {
    return this.http.post<{ valid: boolean; missing_dimensions: string[]; applied_rule_id?: number }>(
      `${this.baseUrl}/project-dimensions/validate`,
      payload
    );
  }

  // ==========================================================================
  // 11.2 Project Income
  // ==========================================================================

  getIncomes(params?: {
    project_id?: number;
    cost_category?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<ProjectIncomePaginationResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.project_id) httpParams = httpParams.set('project_id', params.project_id.toString());
      if (params.cost_category) httpParams = httpParams.set('cost_category', params.cost_category);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.offset !== undefined) httpParams = httpParams.set('offset', params.offset.toString());
    }
    return this.http.get<ProjectIncomePaginationResponse>(`${this.baseUrl}/project-income`, { params: httpParams });
  }

  getIncome(id: number): Observable<ProjectIncomeTransaction> {
    return this.http.get<ProjectIncomeTransaction>(`${this.baseUrl}/project-income/${id}`);
  }

  createIncome(payload: ProjectIncomeTransaction): Observable<ProjectIncomeTransaction> {
    return this.http.post<ProjectIncomeTransaction>(`${this.baseUrl}/project-income`, payload);
  }

  updateIncome(id: number, payload: Partial<ProjectIncomeTransaction>): Observable<ProjectIncomeTransaction> {
    return this.http.put<ProjectIncomeTransaction>(`${this.baseUrl}/project-income/${id}`, payload);
  }

  deleteIncome(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/project-income/${id}`);
  }

  // ==========================================================================
  // 11.3 Project Expenditure
  // ==========================================================================

  getExpenditures(params?: {
    project_id?: number;
    cost_category?: string;
    construction_phase?: string;
    expenditure_type?: string;
    payment_status?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<ProjectExpenditurePaginationResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.project_id) httpParams = httpParams.set('project_id', params.project_id.toString());
      if (params.cost_category) httpParams = httpParams.set('cost_category', params.cost_category);
      if (params.construction_phase) httpParams = httpParams.set('construction_phase', params.construction_phase);
      if (params.expenditure_type) httpParams = httpParams.set('expenditure_type', params.expenditure_type);
      if (params.payment_status) httpParams = httpParams.set('payment_status', params.payment_status);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.offset !== undefined) httpParams = httpParams.set('offset', params.offset.toString());
    }
    return this.http.get<ProjectExpenditurePaginationResponse>(`${this.baseUrl}/project-expenditure`, { params: httpParams });
  }

  getExpenditure(id: number): Observable<ProjectExpenditureTransaction> {
    return this.http.get<ProjectExpenditureTransaction>(`${this.baseUrl}/project-expenditure/${id}`);
  }

  createExpenditure(payload: ProjectExpenditureTransaction): Observable<ProjectExpenditureTransaction> {
    return this.http.post<ProjectExpenditureTransaction>(`${this.baseUrl}/project-expenditure`, payload);
  }

  updateExpenditure(id: number, payload: Partial<ProjectExpenditureTransaction>): Observable<ProjectExpenditureTransaction> {
    return this.http.put<ProjectExpenditureTransaction>(`${this.baseUrl}/project-expenditure/${id}`, payload);
  }

  deleteExpenditure(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/project-expenditure/${id}`);
  }

  // ==========================================================================
  // 11.4 Project Profitability & Multi-Project Report
  // ==========================================================================

  getProfitabilityReport(params?: {
    project_id?: number;
    status_filter?: string;
    search?: string;
  }): Observable<MultiProjectProfitabilityReportResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.project_id) httpParams = httpParams.set('project_id', params.project_id.toString());
      if (params.status_filter) httpParams = httpParams.set('status_filter', params.status_filter);
      if (params.search) httpParams = httpParams.set('search', params.search);
    }
    return this.http.get<MultiProjectProfitabilityReportResponse>(`${this.baseUrl}/project-profitability/report`, { params: httpParams });
  }

  seedDemoData(targetProjectCount = 22): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/project-profitability/seed-demo-data`, null, {
      params: { target_project_count: targetProjectCount.toString() }
    });
  }
}
