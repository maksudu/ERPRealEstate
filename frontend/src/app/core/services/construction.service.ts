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
  SafetyNCR,
  WBSNode,
  BOQItemBudgetLock,
  VariationOrder,
  JointMeasurementSheet
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

  // 4. RA Bills & Digital Signatures
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

  signRABill(raBillId: number, payload: { role: string; signatory_name: string; action: string; approval_notes?: string }): Observable<RABill> {
    return this.http.post<RABill>(`${this.baseUrl}/ra-bills/${raBillId}/sign`, payload);
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

  // 8. Work Breakdown Structure (WBS) & Activity Master
  getWBSNodes(filters?: { project_id?: number; tower_id?: number; parent_id?: number; as_tree?: boolean }): Observable<WBSNode[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.parent_id !== undefined && filters?.parent_id !== null) params = params.set('parent_id', filters.parent_id);
    if (filters?.as_tree) params = params.set('as_tree', 'true');
    return this.http.get<WBSNode[]>(`${this.baseUrl}/wbs`, { params });
  }

  createWBSNode(payload: any): Observable<WBSNode> {
    return this.http.post<WBSNode>(`${this.baseUrl}/wbs`, payload);
  }

  updateWBSProgress(wbsId: number, payload: { progress_percentage: number; actual_start_date?: string; actual_end_date?: string; status?: string; remarks?: string }): Observable<WBSNode> {
    return this.http.put<WBSNode>(`${this.baseUrl}/wbs/${wbsId}/progress`, payload);
  }

  // 9. BOQ Hard Budget Locks & Variation Orders
  getBOQBudgetLocks(filters?: { project_id?: number; tower_id?: number }): Observable<BOQItemBudgetLock[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    return this.http.get<BOQItemBudgetLock[]>(`${this.baseUrl}/boq/budget-locks`, { params });
  }

  checkBOQBudgetLock(payload: { boq_item_id: number; requested_quantity: number; requisition_memo_no?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/boq/check-budget-lock`, payload);
  }

  processBOQRequisition(payload: { boq_item_id: number; requested_quantity: number; requisition_memo_no?: string }): Observable<BOQItemBudgetLock> {
    return this.http.post<BOQItemBudgetLock>(`${this.baseUrl}/boq/requisition`, payload);
  }

  getVariationOrders(filters?: { project_id?: number; boq_item_id?: number; status?: string }): Observable<VariationOrder[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.boq_item_id) params = params.set('boq_item_id', filters.boq_item_id);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<VariationOrder[]>(`${this.baseUrl}/boq/variation-orders`, { params });
  }

  createVariationOrder(payload: any): Observable<VariationOrder> {
    return this.http.post<VariationOrder>(`${this.baseUrl}/boq/variation-orders`, payload);
  }

  approveVariationOrder(voId: number, payload: { approved_by_pm: string; status: string; approval_notes?: string }): Observable<VariationOrder> {
    return this.http.put<VariationOrder>(`${this.baseUrl}/boq/variation-orders/${voId}/approve`, payload);
  }

  // 10. Joint Measurement Sheet (JMS) Engine
  getJointMeasurements(filters?: { work_order_id?: number; wbs_node_id?: number }): Observable<JointMeasurementSheet[]> {
    let params = new HttpParams();
    if (filters?.work_order_id) params = params.set('work_order_id', filters.work_order_id);
    if (filters?.wbs_node_id) params = params.set('wbs_node_id', filters.wbs_node_id);
    return this.http.get<JointMeasurementSheet[]>(`${this.baseUrl}/jms`, { params });
  }

  createJointMeasurement(payload: any): Observable<JointMeasurementSheet> {
    return this.http.post<JointMeasurementSheet>(`${this.baseUrl}/jms`, payload);
  }
}
