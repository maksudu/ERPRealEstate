import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Subcontractor,
  DPRReport,
  LaborMuster,
  WorkOrder,
  RABill,
  ConstructionMetrics,
  ConcreteCubeTest,
  CubeTestNotificationAlert,
  SafetyNCR
} from '../models/construction.model';

@Injectable({
  providedIn: 'root'
})
export class ConstructionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/construction`;

  // 1. Subcontractors Master
  getContractors(): Observable<Subcontractor[]> {
    return this.http.get<Subcontractor[]>(`${this.baseUrl}/contractors`);
  }

  createContractor(payload: any): Observable<Subcontractor> {
    return this.http.post<Subcontractor>(`${this.baseUrl}/contractors`, payload);
  }

  // 2. DPR Site Diary
  getDPRReports(filters?: { project_id?: number; report_date?: string }): Observable<DPRReport[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.report_date) params = params.set('report_date', filters.report_date);
    return this.http.get<DPRReport[]>(`${this.baseUrl}/dpr`, { params });
  }

  createDPRReport(payload: any): Observable<DPRReport> {
    return this.http.post<DPRReport>(`${this.baseUrl}/dpr`, payload);
  }

  // 3. Work Orders
  getWorkOrders(projectId?: number): Observable<WorkOrder[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<WorkOrder[]>(`${this.baseUrl}/work-orders`, { params });
  }

  createWorkOrder(payload: any): Observable<WorkOrder> {
    return this.http.post<WorkOrder>(`${this.baseUrl}/work-orders`, payload);
  }

  // 4. RA Bills
  getRABills(workOrderId?: number): Observable<RABill[]> {
    let params = new HttpParams();
    if (workOrderId) params = params.set('work_order_id', workOrderId);
    return this.http.get<RABill[]>(`${this.baseUrl}/ra-bills`, { params });
  }

  createRABill(payload: any): Observable<RABill> {
    return this.http.post<RABill>(`${this.baseUrl}/ra-bills`, payload);
  }

  approveRABill(raBillId: number, payload: { action: string; approval_notes?: string }): Observable<RABill> {
    return this.http.put<RABill>(`${this.baseUrl}/ra-bills/${raBillId}/approval`, payload);
  }

  // 5. Operations Metrics
  getMetrics(): Observable<ConstructionMetrics> {
    return this.http.get<ConstructionMetrics>(`${this.baseUrl}/metrics`);
  }

  // 6. Concrete Cube Crushing Tests
  getCubeTests(filters?: { project_id?: number; verdict?: string }): Observable<ConcreteCubeTest[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.verdict) params = params.set('verdict', filters.verdict);
    return this.http.get<ConcreteCubeTest[]>(`${this.baseUrl}/cube-tests`, { params });
  }

  createCubeTest(payload: any): Observable<ConcreteCubeTest> {
    return this.http.post<ConcreteCubeTest>(`${this.baseUrl}/cube-tests`, payload);
  }

  recordCubeTestStrength(testId: number, payload: any): Observable<ConcreteCubeTest> {
    return this.http.patch<ConcreteCubeTest>(`${this.baseUrl}/cube-tests/${testId}/record`, payload);
  }

  getCubeTestAlerts(): Observable<CubeTestNotificationAlert[]> {
    return this.http.get<CubeTestNotificationAlert[]>(`${this.baseUrl}/cube-tests/alerts`);
  }

  // 7. Safety NCRs
  getSafetyNCRs(filters?: { project_id?: number; status_filter?: string; category_filter?: string }): Observable<SafetyNCR[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.category_filter) params = params.set('category_filter', filters.category_filter);
    return this.http.get<SafetyNCR[]>(`${this.baseUrl}/safety-ncrs`, { params });
  }

  createSafetyNCR(payload: any): Observable<SafetyNCR> {
    return this.http.post<SafetyNCR>(`${this.baseUrl}/safety-ncrs`, payload);
  }

  rectifySafetyNCR(ncrId: number, payload: { rectification_notes: string; rectification_photo_url?: string }): Observable<SafetyNCR> {
    return this.http.patch<SafetyNCR>(`${this.baseUrl}/safety-ncrs/${ncrId}/rectify`, payload);
  }

  verifySafetyNCR(ncrId: number, payload: { verdict: string; verification_notes?: string }): Observable<SafetyNCR> {
    return this.http.patch<SafetyNCR>(`${this.baseUrl}/safety-ncrs/${ncrId}/verify`, payload);
  }
}

