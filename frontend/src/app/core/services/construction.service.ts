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
  WBSMetrics,
  ProjectCalendar,
  ActivityDependency,
  BOQItemBudgetLock,
  BOQMetrics,
  VariationOrder,
  JointMeasurementSheet,
  SiteMaterialRequisition,
  MaterialConsumption,
  MaterialReturn,
  MaterialRequisitionMetrics,
  SiteMaterialRequisitionFilter,
  SubcontractorListResponse,
  ContractorMetrics,
  ContractorRate,
  ContractorDispute,
  ContractorFilter,
  WorkOrderItem,
  WorkOrderMilestone,
  WorkOrderListResponse,
  WorkOrderMetrics,
  WorkOrderFilter,
  RABillItem,
  RABillListResponse,
  RABillMetrics,
  RABillFilter,
  RABillWorkflowActionPayload,
  DPRReportListResponse,
  DPRMetrics,
  DPRFilter,
  WeeklyMonthlyProgressReport,
  LaborWorker,
  LaborWorkerListResponse,
  LaborAttendance,
  LaborAttendanceListResponse,
  LaborAttendanceMetrics,
  GangAttendanceBatchCreate,
  SubcontractorPayment,
  SubcontractorPaymentListResponse,
  QualityInspection,
  QualityInspectionListResponse,
  QualityDefectMetrics,
  QualityChecklistItem,
  SafetyIncident,
  SafetyIncidentListResponse,
  SafetyIncidentFilter,
  HSESafetyMetrics,
  SafetyTraining,
  SafetyTrainingListResponse,
  SafetyTrainingFilter,
  PermitToWork,
  PermitToWorkListResponse,
  PermitToWorkFilter,
  ProjectCompletion,
  ProjectCompletionListResponse,
  ProjectCompletionFilter,
  ProjectCompletionMetrics,
  PunchlistItem,
  PunchlistListResponse,
  PunchlistFilter,
  ConstructionReportMeta,
  ConstructionReportSummaryKPIs,
  ConstructionReportResponse,
  ConstructionReportFilter
} from '../models/construction.model';

@Injectable({
  providedIn: 'root'
})
export class ConstructionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/construction`;

  // 1. Contractors & Subcontractors Central Registry
  getContractors(filters?: { search?: string; contractor_type?: string; trade_category?: string; limit?: number }): Observable<Subcontractor[]> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.contractor_type) params = params.set('contractor_type', filters.contractor_type);
    if (filters?.trade_category) params = params.set('trade_category', filters.trade_category);
    if (filters?.limit) params = params.set('limit', filters.limit);
    return this.http.get<Subcontractor[]>(`${this.baseUrl}/contractors`, { params });
  }

  getContractorsPaged(filters?: ContractorFilter): Observable<SubcontractorListResponse> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.contractor_type) params = params.set('contractor_type', filters.contractor_type);
    if (filters?.trade_category) params = params.set('trade_category', filters.trade_category);
    if (filters?.onboarding_status) params = params.set('onboarding_status', filters.onboarding_status);
    if (filters?.completion_status) params = params.set('completion_status', filters.completion_status);
    if (filters?.has_disputes !== undefined) params = params.set('has_disputes', filters.has_disputes.toString());
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<SubcontractorListResponse>(`${this.baseUrl}/contractors/paged`, { params });
  }

  getContractorMetrics(): Observable<ContractorMetrics> {
    return this.http.get<ContractorMetrics>(`${this.baseUrl}/contractors/metrics`);
  }

  getContractorById(id: number): Observable<Subcontractor> {
    return this.http.get<Subcontractor>(`${this.baseUrl}/contractors/${id}`);
  }

  createContractor(payload: any): Observable<Subcontractor> {
    return this.http.post<Subcontractor>(`${this.baseUrl}/contractors`, payload);
  }

  updateContractor(id: number, payload: any): Observable<Subcontractor> {
    return this.http.put<Subcontractor>(`${this.baseUrl}/contractors/${id}`, payload);
  }

  deleteContractor(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/contractors/${id}`);
  }

  updateContractorOnboardingStatus(id: number, newStatus: string, remarks?: string): Observable<Subcontractor> {
    let params = new HttpParams().set('new_status', newStatus);
    if (remarks) params = params.set('remarks', remarks);
    return this.http.put<Subcontractor>(`${this.baseUrl}/contractors/${id}/onboarding-status`, null, { params });
  }

  // Rate Cards
  getContractorRates(contractorId: number): Observable<ContractorRate[]> {
    return this.http.get<ContractorRate[]>(`${this.baseUrl}/contractors/${contractorId}/rates`);
  }

  addContractorRate(contractorId: number, payload: any): Observable<ContractorRate> {
    return this.http.post<ContractorRate>(`${this.baseUrl}/contractors/${contractorId}/rates`, payload);
  }

  deleteContractorRate(rateId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/contractor-rates/${rateId}`);
  }

  // Disputes
  getContractorDisputes(filters?: { contractor_id?: number; project_id?: number; status_filter?: string; limit?: number; offset?: number }): Observable<ContractorDispute[]> {
    let params = new HttpParams();
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<ContractorDispute[]>(`${this.baseUrl}/contractor-disputes/paged`, { params });
  }

  createContractorDispute(payload: any): Observable<ContractorDispute> {
    return this.http.post<ContractorDispute>(`${this.baseUrl}/contractor-disputes`, payload);
  }

  resolveContractorDispute(disputeId: number, payload: any): Observable<ContractorDispute> {
    return this.http.put<ContractorDispute>(`${this.baseUrl}/contractor-disputes/${disputeId}/resolve`, payload);
  }

  // 2. DPR Site Diary & Progress Reports Engine
  getDPRReportsPaged(filters?: DPRFilter): Observable<DPRReportListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.report_date) params = params.set('report_date', filters.report_date);
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    if (filters?.sync_status) params = params.set('sync_status', filters.sync_status);
    if (filters?.supervisor_approval_status) params = params.set('supervisor_approval_status', filters.supervisor_approval_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<DPRReportListResponse>(`${this.baseUrl}/dpr/paged`, { params });
  }

  getDPRReports(filters?: { project_id?: number; report_date?: string; search?: string; limit?: number; offset?: number }): Observable<DPRReport[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.report_date) params = params.set('report_date', filters.report_date);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<DPRReport[]>(`${this.baseUrl}/dpr`, { params });
  }

  getDPRMetrics(projectId: number = 0): Observable<DPRMetrics> {
    return this.http.get<DPRMetrics>(`${this.baseUrl}/dpr/metrics/${projectId}`);
  }

  getWeeklyMonthlyProgressSummary(projectId: number, periodType: 'WEEKLY' | 'MONTHLY' = 'WEEKLY', referenceDate?: string): Observable<WeeklyMonthlyProgressReport> {
    let params = new HttpParams().set('project_id', projectId).set('period_type', periodType);
    if (referenceDate) params = params.set('reference_date', referenceDate);
    return this.http.get<WeeklyMonthlyProgressReport>(`${this.baseUrl}/dpr/progress-summary`, { params });
  }

  getDPRReportById(id: number): Observable<DPRReport> {
    return this.http.get<DPRReport>(`${this.baseUrl}/dpr/${id}`);
  }

  createDPRReport(payload: Partial<DPRReport>): Observable<DPRReport> {
    return this.http.post<DPRReport>(`${this.baseUrl}/dpr`, payload);
  }

  updateDPRReport(id: number, payload: Partial<DPRReport>): Observable<DPRReport> {
    return this.http.put<DPRReport>(`${this.baseUrl}/dpr/${id}`, payload);
  }

  executeDPRApprovalAction(dprId: number, payload: { action: string; supervisor_name: string; supervisor_role: string; comments?: string; signature_data?: string }): Observable<DPRReport> {
    return this.http.post<DPRReport>(`${this.baseUrl}/dpr/${dprId}/approval-action`, payload);
  }

  syncOfflineDPRBatch(reports: Partial<DPRReport>[]): Observable<{ status: string; synced_count: number; synced_reports: string[]; conflicts_count: number; conflicts: any[] }> {
    return this.http.post<{ status: string; synced_count: number; synced_reports: string[]; conflicts_count: number; conflicts: any[] }>(`${this.baseUrl}/dpr/sync-offline-batch`, { reports });
  }

  deleteDPRReport(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/dpr/${id}`);
  }

  // 2.1 Subcontractor Labor Muster Roll
  getLaborMusterList(filters?: { dpr_id?: number; contractor_id?: number; search?: string; limit?: number; offset?: number }): Observable<LaborMuster[]> {
    let params = new HttpParams();
    if (filters?.dpr_id) params = params.set('dpr_id', filters.dpr_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<LaborMuster[]>(`${this.baseUrl}/labor-muster`, { params });
  }

  getLaborMusterById(id: number): Observable<LaborMuster> {
    return this.http.get<LaborMuster>(`${this.baseUrl}/labor-muster/${id}`);
  }

  createLaborMuster(payload: any): Observable<LaborMuster> {
    return this.http.post<LaborMuster>(`${this.baseUrl}/labor-muster`, payload);
  }

  updateLaborMuster(id: number, payload: any): Observable<LaborMuster> {
    return this.http.put<LaborMuster>(`${this.baseUrl}/labor-muster/${id}`, payload);
  }

  deleteLaborMuster(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/labor-muster/${id}`);
  }

  // 3. Work Orders
  getWorkOrders(projectId?: number): Observable<WorkOrder[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<WorkOrder[]>(`${this.baseUrl}/work-orders`, { params });
  }

  // 4. RA Bills & Digital Signatures
  getRABills(filters?: { workOrderId?: number; search?: string; limit?: number; offset?: number }): Observable<RABill[]> {
    let params = new HttpParams();
    if (filters?.workOrderId) params = params.set('work_order_id', filters.workOrderId);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<RABill[]>(`${this.baseUrl}/ra-bills`, { params });
  }

  // 5. Operations Metrics
  getMetrics(): Observable<ConstructionMetrics> {
    return this.http.get<ConstructionMetrics>(`${this.baseUrl}/metrics`);
  }

  // 6. Concrete Cube Crushing Tests
  getCubeTests(filters?: { project_id?: number; verdict?: string; search?: string; limit?: number; offset?: number }): Observable<ConcreteCubeTest[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.verdict) params = params.set('verdict', filters.verdict);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<ConcreteCubeTest[]>(`${this.baseUrl}/cube-tests`, { params });
  }

  getCubeTestById(id: number): Observable<ConcreteCubeTest> {
    return this.http.get<ConcreteCubeTest>(`${this.baseUrl}/cube-tests/${id}`);
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
  getSafetyNCRs(filters?: { project_id?: number; status_filter?: string; category_filter?: string; search?: string; limit?: number; offset?: number }): Observable<SafetyNCR[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.category_filter) params = params.set('category_filter', filters.category_filter);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<SafetyNCR[]>(`${this.baseUrl}/safety-ncrs`, { params });
  }

  getSafetyNCRById(id: number): Observable<SafetyNCR> {
    return this.http.get<SafetyNCR>(`${this.baseUrl}/safety-ncrs/${id}`);
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

  getWBSNodesPaged(filters?: {
    project_id?: number;
    tower_id?: number;
    phase_category?: string;
    wbs_tier?: string;
    status?: string;
    is_critical_path?: boolean;
    is_milestone?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<{ items: WBSNode[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.phase_category) params = params.set('phase_category', filters.phase_category);
    if (filters?.wbs_tier) params = params.set('wbs_tier', filters.wbs_tier);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.is_critical_path !== undefined) params = params.set('is_critical_path', String(filters.is_critical_path));
    if (filters?.is_milestone !== undefined) params = params.set('is_milestone', String(filters.is_milestone));
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<{ items: WBSNode[]; total: number; limit: number; offset: number }>(`${this.baseUrl}/wbs/paged`, { params });
  }

  getWBSMetrics(projectId: number): Observable<WBSMetrics> {
    return this.http.get<WBSMetrics>(`${this.baseUrl}/wbs/metrics/${projectId}`);
  }

  getWBSNodeById(wbsId: number): Observable<WBSNode> {
    return this.http.get<WBSNode>(`${this.baseUrl}/wbs/${wbsId}`);
  }

  createWBSNode(payload: any): Observable<WBSNode> {
    return this.http.post<WBSNode>(`${this.baseUrl}/wbs`, payload);
  }

  updateWBSNode(wbsId: number, payload: any): Observable<WBSNode> {
    return this.http.put<WBSNode>(`${this.baseUrl}/wbs/${wbsId}`, payload);
  }

  deleteWBSNode(wbsId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/wbs/${wbsId}`);
  }

  updateWBSProgress(wbsId: number, payload: any): Observable<WBSNode> {
    return this.http.put<WBSNode>(`${this.baseUrl}/wbs/${wbsId}/progress`, payload);
  }

  // 8.1 Project Calendar & Shifts
  getProjectCalendar(projectId: number): Observable<ProjectCalendar> {
    return this.http.get<ProjectCalendar>(`${this.baseUrl}/calendar/${projectId}`);
  }

  updateProjectCalendar(projectId: number, payload: any): Observable<ProjectCalendar> {
    return this.http.post<ProjectCalendar>(`${this.baseUrl}/calendar/${projectId}`, payload);
  }

  // 8.2 Activity Dependencies
  getActivityDependencies(wbsId: number): Observable<ActivityDependency[]> {
    return this.http.get<ActivityDependency[]>(`${this.baseUrl}/dependencies/${wbsId}`);
  }

  addActivityDependency(payload: any): Observable<ActivityDependency> {
    return this.http.post<ActivityDependency>(`${this.baseUrl}/dependencies`, payload);
  }

  deleteActivityDependency(depId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/dependencies/${depId}`);
  }

  // 9. BOQ Master Management, Rate Analysis & Hard Budget Locks
  getBOQItemsPaged(filters?: {
    project_id?: number;
    tower_id?: number;
    wbs_node_id?: number;
    wbs_phase_id?: string;
    material_category_id?: string;
    stage?: string;
    is_locked?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<{ items: BOQItemBudgetLock[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.wbs_node_id) params = params.set('wbs_node_id', filters.wbs_node_id);
    if (filters?.wbs_phase_id) params = params.set('wbs_phase_id', filters.wbs_phase_id);
    if (filters?.material_category_id) params = params.set('material_category_id', filters.material_category_id);
    if (filters?.stage) params = params.set('stage', filters.stage);
    if (filters?.is_locked !== undefined) params = params.set('is_locked', String(filters.is_locked));
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<{ items: BOQItemBudgetLock[]; total: number; limit: number; offset: number }>(`${this.baseUrl}/boq/paged`, { params });
  }

  getBOQMetrics(projectId: number): Observable<BOQMetrics> {
    return this.http.get<BOQMetrics>(`${this.baseUrl}/boq/metrics/${projectId}`);
  }

  getBOQItemById(id: number): Observable<BOQItemBudgetLock> {
    return this.http.get<BOQItemBudgetLock>(`${this.baseUrl}/boq/${id}`);
  }

  createBOQItem(payload: any): Observable<BOQItemBudgetLock> {
    return this.http.post<BOQItemBudgetLock>(`${this.baseUrl}/boq`, payload);
  }

  updateBOQItem(id: number, payload: any): Observable<BOQItemBudgetLock> {
    return this.http.put<BOQItemBudgetLock>(`${this.baseUrl}/boq/${id}`, payload);
  }

  deleteBOQItem(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/boq/${id}`);
  }

  lockBOQItem(id: number, approvedBy?: string): Observable<BOQItemBudgetLock> {
    let params = new HttpParams();
    if (approvedBy) params = params.set('approved_by', approvedBy);
    return this.http.put<BOQItemBudgetLock>(`${this.baseUrl}/boq/${id}/lock`, {}, { params });
  }

  unlockBOQItem(id: number): Observable<BOQItemBudgetLock> {
    return this.http.put<BOQItemBudgetLock>(`${this.baseUrl}/boq/${id}/unlock`, {});
  }

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

  // 11. Site Material Requisition & Consumption Engine
  getMaterialRequisitionsPaged(filters?: SiteMaterialRequisitionFilter): Observable<{ items: SiteMaterialRequisition[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.wbs_node_id) params = params.set('wbs_node_id', filters.wbs_node_id);
    if (filters?.work_package) params = params.set('work_package', filters.work_package);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.priority) params = params.set('priority', filters.priority);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<{ items: SiteMaterialRequisition[]; total: number; limit: number; offset: number }>(`${this.baseUrl}/material-requisitions/paged`, { params });
  }

  getMaterialRequisitionById(id: number): Observable<SiteMaterialRequisition> {
    return this.http.get<SiteMaterialRequisition>(`${this.baseUrl}/material-requisitions/${id}`);
  }

  getMaterialRequisitionMetrics(projectId: number): Observable<MaterialRequisitionMetrics> {
    return this.http.get<MaterialRequisitionMetrics>(`${this.baseUrl}/material-requisitions/metrics/${projectId}`);
  }

  createMaterialRequisition(payload: any): Observable<SiteMaterialRequisition> {
    return this.http.post<SiteMaterialRequisition>(`${this.baseUrl}/material-requisitions`, payload);
  }

  updateMaterialRequisition(id: number, payload: any): Observable<SiteMaterialRequisition> {
    return this.http.put<SiteMaterialRequisition>(`${this.baseUrl}/material-requisitions/${id}`, payload);
  }

  deleteMaterialRequisition(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/material-requisitions/${id}`);
  }

  approveMaterialRequisition(id: number, payload: { action: string; approved_quantity?: number; rejection_reason?: string; create_purchase_requisition_for_shortage?: boolean }): Observable<SiteMaterialRequisition> {
    return this.http.put<SiteMaterialRequisition>(`${this.baseUrl}/material-requisitions/${id}/approve`, payload);
  }

  issueMaterialRequisition(id: number, payload: { issued_quantity: number; store_id?: number; batch_lot_number?: string; unit_cost?: number; contractor_id?: number; notes?: string }): Observable<SiteMaterialRequisition> {
    return this.http.post<SiteMaterialRequisition>(`${this.baseUrl}/material-requisitions/${id}/issue`, payload);
  }

  receiveMaterialRequisition(id: number, payload: { received_quantity: number; received_date?: string; remarks?: string }): Observable<SiteMaterialRequisition> {
    return this.http.post<SiteMaterialRequisition>(`${this.baseUrl}/material-requisitions/${id}/receive`, payload);
  }

  recordMaterialConsumption(id: number, payload: any): Observable<MaterialConsumption> {
    return this.http.post<MaterialConsumption>(`${this.baseUrl}/material-requisitions/${id}/consume`, payload);
  }

  returnMaterialToStore(id: number, payload: any): Observable<MaterialReturn> {
    return this.http.post<MaterialReturn>(`${this.baseUrl}/material-requisitions/${id}/return`, payload);
  }

  getMaterialConsumptionsPaged(filters?: { project_id?: number; requisition_id?: number; wbs_node_id?: number; material_id?: number; limit?: number; offset?: number }): Observable<{ items: MaterialConsumption[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.requisition_id) params = params.set('requisition_id', filters.requisition_id);
    if (filters?.wbs_node_id) params = params.set('wbs_node_id', filters.wbs_node_id);
    if (filters?.material_id) params = params.set('material_id', filters.material_id);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<{ items: MaterialConsumption[]; total: number; limit: number; offset: number }>(`${this.baseUrl}/material-consumptions/paged`, { params });
  }

  getMaterialReturnsPaged(filters?: { project_id?: number; requisition_id?: number; store_id?: number; limit?: number; offset?: number }): Observable<{ items: MaterialReturn[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.requisition_id) params = params.set('requisition_id', filters.requisition_id);
    if (filters?.store_id) params = params.set('store_id', filters.store_id);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<{ items: MaterialReturn[]; total: number; limit: number; offset: number }>(`${this.baseUrl}/material-returns/paged`, { params });
  }

  // -------------------------------------------------------------
  // Work Orders & Contract Management
  // -------------------------------------------------------------
  getWorkOrdersPaged(filters?: WorkOrderFilter): Observable<WorkOrderListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.contract_type) params = params.set('contract_type', filters.contract_type);
    if (filters?.contract_model) params = params.set('contract_model', filters.contract_model);
    if (filters?.approval_status) params = params.set('approval_status', filters.approval_status);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<WorkOrderListResponse>(`${this.baseUrl}/work-orders/paged`, { params });
  }

  getWorkOrderMetrics(projectId: number = 0): Observable<WorkOrderMetrics> {
    return this.http.get<WorkOrderMetrics>(`${this.baseUrl}/work-orders/metrics/${projectId}`);
  }

  getWorkOrderById(id: number): Observable<WorkOrder> {
    return this.http.get<WorkOrder>(`${this.baseUrl}/work-orders/${id}`);
  }

  createWorkOrder(payload: Partial<WorkOrder>): Observable<WorkOrder> {
    return this.http.post<WorkOrder>(`${this.baseUrl}/work-orders`, payload);
  }

  updateWorkOrder(id: number, payload: Partial<WorkOrder>): Observable<WorkOrder> {
    return this.http.put<WorkOrder>(`${this.baseUrl}/work-orders/${id}`, payload);
  }

  deleteWorkOrder(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/work-orders/${id}`);
  }

  addWorkOrderMilestone(id: number, milestone: Partial<WorkOrderMilestone>): Observable<WorkOrderMilestone> {
    return this.http.post<WorkOrderMilestone>(`${this.baseUrl}/work-orders/${id}/milestones`, milestone);
  }

  // --------------------------------------------------------------------------
  // 12. Measurement-Based RA Billing & Payment Certification Engine
  // --------------------------------------------------------------------------
  getRABillsPaged(filters?: RABillFilter): Observable<RABillListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.work_order_id) params = params.set('work_order_id', filters.work_order_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.workflow_stage) params = params.set('workflow_stage', filters.workflow_stage);
    if (filters?.payment_status) params = params.set('payment_status', filters.payment_status);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.is_on_hold !== undefined && filters?.is_on_hold !== null) params = params.set('is_on_hold', filters.is_on_hold);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<RABillListResponse>(`${this.baseUrl}/ra-bills/paged`, { params });
  }

  getRABillMetrics(projectId: number = 0): Observable<RABillMetrics> {
    return this.http.get<RABillMetrics>(`${this.baseUrl}/ra-bills/metrics/${projectId}`);
  }

  getRABillById(id: number): Observable<RABill> {
    return this.http.get<RABill>(`${this.baseUrl}/ra-bills/${id}`);
  }

  createRABill(payload: Partial<RABill>): Observable<RABill> {
    return this.http.post<RABill>(`${this.baseUrl}/ra-bills`, payload);
  }

  updateRABill(id: number, payload: Partial<RABill>): Observable<RABill> {
    return this.http.put<RABill>(`${this.baseUrl}/ra-bills/${id}`, payload);
  }

  executeRABillWorkflowAction(id: number, payload: RABillWorkflowActionPayload): Observable<RABill> {
    return this.http.post<RABill>(`${this.baseUrl}/ra-bills/${id}/workflow-action`, payload);
  }

  deleteRABill(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/ra-bills/${id}`);
  }

  // -------------------------------------------------------------
  // 13. Workforce Registry & Worker Management
  // -------------------------------------------------------------
  getWorkersPaged(filters?: { project_id?: number; contractor_id?: number; worker_type?: string; trade_category?: string; is_active?: boolean; search?: string; limit?: number; offset?: number }): Observable<LaborWorkerListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.worker_type) params = params.set('worker_type', filters.worker_type);
    if (filters?.trade_category) params = params.set('trade_category', filters.trade_category);
    if (filters?.is_active !== undefined) params = params.set('is_active', filters.is_active);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<LaborWorkerListResponse>(`${this.baseUrl}/workers/paged`, { params });
  }

  getWorkerById(id: number): Observable<LaborWorker> {
    return this.http.get<LaborWorker>(`${this.baseUrl}/workers/${id}`);
  }

  createWorker(payload: Partial<LaborWorker>): Observable<LaborWorker> {
    return this.http.post<LaborWorker>(`${this.baseUrl}/workers`, payload);
  }

  updateWorker(id: number, payload: Partial<LaborWorker>): Observable<LaborWorker> {
    return this.http.put<LaborWorker>(`${this.baseUrl}/workers/${id}`, payload);
  }

  deleteWorker(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/workers/${id}`);
  }

  // -------------------------------------------------------------
  // 14. Labor Attendance & Gang/Crew Verification
  // -------------------------------------------------------------
  getAttendancePaged(filters?: { project_id?: number; contractor_id?: number; worker_id?: number; attendance_date?: string; shift_type?: string; attendance_status?: string; supervisor_approved?: boolean; search?: string; limit?: number; offset?: number }): Observable<LaborAttendanceListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.worker_id) params = params.set('worker_id', filters.worker_id);
    if (filters?.attendance_date) params = params.set('attendance_date', filters.attendance_date);
    if (filters?.shift_type) params = params.set('shift_type', filters.shift_type);
    if (filters?.attendance_status) params = params.set('attendance_status', filters.attendance_status);
    if (filters?.supervisor_approved !== undefined) params = params.set('supervisor_approved', filters.supervisor_approved);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<LaborAttendanceListResponse>(`${this.baseUrl}/attendance/paged`, { params });
  }

  getAttendanceMetrics(projectId: number = 0): Observable<LaborAttendanceMetrics> {
    return this.http.get<LaborAttendanceMetrics>(`${this.baseUrl}/attendance/metrics/${projectId}`);
  }

  recordAttendance(payload: Partial<LaborAttendance>): Observable<LaborAttendance> {
    return this.http.post<LaborAttendance>(`${this.baseUrl}/attendance`, payload);
  }

  recordGangAttendanceBatch(payload: GangAttendanceBatchCreate): Observable<{ message: string; count: number; items: LaborAttendance[] }> {
    return this.http.post<{ message: string; count: number; items: LaborAttendance[] }>(`${this.baseUrl}/attendance/gang-batch`, payload);
  }

  approveAttendance(id: number, payload: { supervisor_approved: boolean; supervisor_id?: number; supervisor_name?: string }): Observable<LaborAttendance> {
    return this.http.post<LaborAttendance>(`${this.baseUrl}/attendance/${id}/approve`, payload);
  }

  deleteAttendance(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/attendance/${id}`);
  }

  // -------------------------------------------------------------
  // 15. Subcontractor Payments & Direct Payroll Vouchers
  // -------------------------------------------------------------
  getSubcontractorPaymentsPaged(filters?: { project_id?: number; contractor_id?: number; worker_id?: number; payment_type?: string; certification_status?: string; search?: string; limit?: number; offset?: number }): Observable<SubcontractorPaymentListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.worker_id) params = params.set('worker_id', filters.worker_id);
    if (filters?.payment_type) params = params.set('payment_type', filters.payment_type);
    if (filters?.certification_status) params = params.set('certification_status', filters.certification_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<SubcontractorPaymentListResponse>(`${this.baseUrl}/subcontractor-payments/paged`, { params });
  }

  getSubcontractorPaymentById(id: number): Observable<SubcontractorPayment> {
    return this.http.get<SubcontractorPayment>(`${this.baseUrl}/subcontractor-payments/${id}`);
  }

  createSubcontractorPayment(payload: Partial<SubcontractorPayment>): Observable<SubcontractorPayment> {
    return this.http.post<SubcontractorPayment>(`${this.baseUrl}/subcontractor-payments`, payload);
  }

  certifySubcontractorPayment(id: number, payload: { certification_status: string; certified_by_name: string; payment_method?: string; payment_reference?: string; payment_date?: string }): Observable<SubcontractorPayment> {
    return this.http.post<SubcontractorPayment>(`${this.baseUrl}/subcontractor-payments/${id}/certify`, payload);
  }

  deleteSubcontractorPayment(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/subcontractor-payments/${id}`);
  }

  // -------------------------------------------------------------
  // 16. Quality Assurance, ITP Work-Stage Inspections & Defect Tracking
  // -------------------------------------------------------------
  getQualityInspectionsPaged(filters?: { project_id?: number; contractor_id?: number; stage_category?: string; verdict?: string; mandatory_checks_passed?: boolean; search?: string; limit?: number; offset?: number }): Observable<QualityInspectionListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.stage_category) params = params.set('stage_category', filters.stage_category);
    if (filters?.verdict) params = params.set('verdict', filters.verdict);
    if (filters?.mandatory_checks_passed !== undefined) params = params.set('mandatory_checks_passed', filters.mandatory_checks_passed);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<QualityInspectionListResponse>(`${this.baseUrl}/inspections/paged`, { params });
  }

  getQualityDefectMetrics(projectId: number = 0): Observable<QualityDefectMetrics> {
    return this.http.get<QualityDefectMetrics>(`${this.baseUrl}/inspections/metrics/${projectId}`);
  }

  getQualityInspectionById(id: number): Observable<QualityInspection> {
    return this.http.get<QualityInspection>(`${this.baseUrl}/inspections/${id}`);
  }

  createQualityInspection(payload: Partial<QualityInspection>): Observable<QualityInspection> {
    return this.http.post<QualityInspection>(`${this.baseUrl}/inspections`, payload);
  }

  updateQualityInspection(id: number, payload: Partial<QualityInspection>): Observable<QualityInspection> {
    return this.http.put<QualityInspection>(`${this.baseUrl}/inspections/${id}`, payload);
  }

  submitInspectionVerdict(id: number, payload: { verdict: string; inspector_name: string; mandatory_checks_passed: boolean; checklist_items: QualityChecklistItem[]; cube_test_strength_psi?: number; laboratory_report_ref?: string; remarks?: string }): Observable<QualityInspection> {
    return this.http.post<QualityInspection>(`${this.baseUrl}/inspections/${id}/verdict`, payload);
  }

  deleteQualityInspection(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/inspections/${id}`);
  }

  submitDefectCapa(id: number, payload: { corrective_action: string; preventive_action: string; capa_submitted_by_name: string; rectification_photo_url?: string }): Observable<SafetyNCR> {
    return this.http.post<SafetyNCR>(`${this.baseUrl}/safety-ncrs/${id}/submit-capa`, payload);
  }

  reinspectDefect(id: number, payload: { reinspected_by_name: string; reinspection_verdict: string; reinspection_remarks?: string }): Observable<SafetyNCR> {
    return this.http.post<SafetyNCR>(`${this.baseUrl}/safety-ncrs/${id}/reinspect`, payload);
  }

  approveDefectClosure(id: number, payload: { closure_approved_by_name: string; closure_approval_remarks?: string }): Observable<SafetyNCR> {
    return this.http.post<SafetyNCR>(`${this.baseUrl}/safety-ncrs/${id}/approve-closure`, payload);
  }

  escalateDefect(id: number, payload: { escalation_level: string; escalated_to_name: string }): Observable<SafetyNCR> {
    return this.http.post<SafetyNCR>(`${this.baseUrl}/safety-ncrs/${id}/escalate`, payload);
  }

  // -------------------------------------------------------------
  // HSE Safety Incidents, CAPA & Investigations
  // -------------------------------------------------------------
  getSafetyIncidentsPaged(filters?: SafetyIncidentFilter): Observable<SafetyIncidentListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.incident_type) params = params.set('incident_type', filters.incident_type);
    if (filters?.severity_level) params = params.set('severity_level', filters.severity_level);
    if (filters?.investigation_status) params = params.set('investigation_status', filters.investigation_status);
    if (filters?.include_confidential !== undefined) params = params.set('include_confidential', filters.include_confidential);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<SafetyIncidentListResponse>(`${this.baseUrl}/safety-incidents/paged`, { params });
  }

  getHSESafetyMetrics(projectId: number = 0): Observable<HSESafetyMetrics> {
    return this.http.get<HSESafetyMetrics>(`${this.baseUrl}/safety-incidents/metrics/${projectId}`);
  }

  getSafetyIncidentById(id: number): Observable<SafetyIncident> {
    return this.http.get<SafetyIncident>(`${this.baseUrl}/safety-incidents/${id}`);
  }

  createSafetyIncident(payload: Partial<SafetyIncident>): Observable<SafetyIncident> {
    return this.http.post<SafetyIncident>(`${this.baseUrl}/safety-incidents`, payload);
  }

  updateSafetyIncident(id: number, payload: Partial<SafetyIncident>): Observable<SafetyIncident> {
    return this.http.put<SafetyIncident>(`${this.baseUrl}/safety-incidents/${id}`, payload);
  }

  investigateSafetyIncident(id: number, payload: { root_cause_analysis: string; corrective_preventive_action: string; responsible_person_name: string; capa_due_date: string; investigated_by_name: string; investigation_status?: string; days_lost_count?: number }): Observable<SafetyIncident> {
    return this.http.post<SafetyIncident>(`${this.baseUrl}/safety-incidents/${id}/investigate`, payload);
  }

  escalateSafetyIncident(id: number, payload: { notification_recipients: string[]; escalation_severity?: string; remarks?: string }): Observable<{ message: string; incident_code: string; escalated_to_count: number }> {
    return this.http.post<{ message: string; incident_code: string; escalated_to_count: number }>(`${this.baseUrl}/safety-incidents/${id}/escalate`, payload);
  }

  deleteSafetyIncident(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/safety-incidents/${id}`);
  }

  // -------------------------------------------------------------
  // Site Safety Inductions & Training Sessions
  // -------------------------------------------------------------
  getSafetyTrainingsPaged(filters?: SafetyTrainingFilter): Observable<SafetyTrainingListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.training_type) params = params.set('training_type', filters.training_type);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<SafetyTrainingListResponse>(`${this.baseUrl}/safety-trainings/paged`, { params });
  }

  getSafetyTrainingById(id: number): Observable<SafetyTraining> {
    return this.http.get<SafetyTraining>(`${this.baseUrl}/safety-trainings/${id}`);
  }

  createSafetyTraining(payload: Partial<SafetyTraining>): Observable<SafetyTraining> {
    return this.http.post<SafetyTraining>(`${this.baseUrl}/safety-trainings`, payload);
  }

  deleteSafetyTraining(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/safety-trainings/${id}`);
  }

  // -------------------------------------------------------------
  // Permits-To-Work (PTW) for Controlled High-Risk Activities
  // -------------------------------------------------------------
  getPermitsToWorkPaged(filters?: PermitToWorkFilter): Observable<PermitToWorkListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.permit_type) params = params.set('permit_type', filters.permit_type);
    if (filters?.permit_status) params = params.set('permit_status', filters.permit_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PermitToWorkListResponse>(`${this.baseUrl}/permits-to-work/paged`, { params });
  }

  getPermitToWorkById(id: number): Observable<PermitToWork> {
    return this.http.get<PermitToWork>(`${this.baseUrl}/permits-to-work/${id}`);
  }

  createPermitToWork(payload: Partial<PermitToWork>): Observable<PermitToWork> {
    return this.http.post<PermitToWork>(`${this.baseUrl}/permits-to-work`, payload);
  }

  approvePermitToWork(id: number, payload: { permit_status: string; safety_officer_name: string; safety_officer_verified: boolean; project_manager_approved: boolean; approved_by_name: string; closure_inspection_notes?: string }): Observable<PermitToWork> {
    return this.http.post<PermitToWork>(`${this.baseUrl}/permits-to-work/${id}/approve`, payload);
  }

  deletePermitToWork(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/permits-to-work/${id}`);
  }

  // -------------------------------------------------------------
  // Project Completion & Handover Management
  // -------------------------------------------------------------
  getProjectCompletionsPaged(filters?: ProjectCompletionFilter): Observable<ProjectCompletionListResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.stage_status) params = params.set('stage_status', filters.stage_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<ProjectCompletionListResponse>(`${this.baseUrl}/project-completions/paged`, { params });
  }

  getProjectCompletionMetrics(): Observable<ProjectCompletionMetrics> {
    return this.http.get<ProjectCompletionMetrics>(`${this.baseUrl}/project-completions/metrics`);
  }

  getProjectCompletionById(id: number): Observable<ProjectCompletion> {
    return this.http.get<ProjectCompletion>(`${this.baseUrl}/project-completions/${id}`);
  }

  getProjectCompletionByProjectId(projectId: number): Observable<ProjectCompletion> {
    return this.http.get<ProjectCompletion>(`${this.baseUrl}/project-completions/by-project/${projectId}`);
  }

  createProjectCompletion(payload: Partial<ProjectCompletion>): Observable<ProjectCompletion> {
    return this.http.post<ProjectCompletion>(`${this.baseUrl}/project-completions`, payload);
  }

  updateProjectCompletion(id: number, payload: Partial<ProjectCompletion>): Observable<ProjectCompletion> {
    return this.http.put<ProjectCompletion>(`${this.baseUrl}/project-completions/${id}`, payload);
  }

  signoffProjectCompletion(id: number, payload: { signoff_role: string; signer_name: string; remarks?: string; force_allow_minor_snags?: boolean }): Observable<ProjectCompletion> {
    return this.http.post<ProjectCompletion>(`${this.baseUrl}/project-completions/${id}/signoff`, payload);
  }

  deleteProjectCompletion(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/project-completions/${id}`);
  }

  // -------------------------------------------------------------
  // Punchlist Snag Register
  // -------------------------------------------------------------
  getPunchlistItemsPaged(filters?: PunchlistFilter): Observable<PunchlistListResponse> {
    let params = new HttpParams();
    if (filters?.completion_id) params = params.set('completion_id', filters.completion_id);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.assigned_contractor_id) params = params.set('assigned_contractor_id', filters.assigned_contractor_id);
    if (filters?.severity) params = params.set('severity', filters.severity);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PunchlistListResponse>(`${this.baseUrl}/punchlist-items/paged`, { params });
  }

  getPunchlistItemById(id: number): Observable<PunchlistItem> {
    return this.http.get<PunchlistItem>(`${this.baseUrl}/punchlist-items/${id}`);
  }

  createPunchlistItem(payload: Partial<PunchlistItem>): Observable<PunchlistItem> {
    return this.http.post<PunchlistItem>(`${this.baseUrl}/punchlist-items`, payload);
  }

  updatePunchlistItem(id: number, payload: Partial<PunchlistItem>): Observable<PunchlistItem> {
    return this.http.put<PunchlistItem>(`${this.baseUrl}/punchlist-items/${id}`, payload);
  }

  deletePunchlistItem(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.baseUrl}/punchlist-items/${id}`);
  }

  // -------------------------------------------------------------
  // Standard Management Reports Engine (14 Reports)
  // -------------------------------------------------------------
  getConstructionReportTypes(): Observable<ConstructionReportMeta[]> {
    return this.http.get<ConstructionReportMeta[]>(`${this.baseUrl}/reports/meta`);
  }

  getConstructionReportSummaryKPIs(): Observable<ConstructionReportSummaryKPIs> {
    return this.http.get<ConstructionReportSummaryKPIs>(`${this.baseUrl}/reports/kpis`);
  }

  getConstructionReportData(reportType: string, filters?: ConstructionReportFilter): Observable<ConstructionReportResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.wbs_node_id) params = params.set('wbs_node_id', filters.wbs_node_id);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<ConstructionReportResponse>(`${this.baseUrl}/reports/data/${reportType}`, { params });
  }
}


