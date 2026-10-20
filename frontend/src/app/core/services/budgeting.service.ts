import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BudgetPlan {
  id: number;
  plan_code: string;
  title: string;
  fiscal_year: string;
  scope_level: string;
  period_type: string;
  project_id?: number;
  project_name?: string;
  tower_name?: string;
  department_name?: string;
  total_budget_bdt: number;
  committed_amount_bdt: number;
  actual_expenditure_bdt: number;
  available_budget_bdt: number;
  version: number;
  status: string;
  approval_notes?: string;
  prepared_by?: string;
  approved_by?: string;
  created_at?: string;
}

export interface ProjectBudgetLine {
  id: number;
  budget_plan_id: number;
  project_id: number;
  project_name?: string;
  tower_name?: string;
  cost_category: string;
  cost_center: string;
  line_code: string;
  item_name: string;
  description?: string;
  baseline_amount_bdt: number;
  revised_amount_bdt: number;
  committed_amount_bdt: number;
  actual_spent_bdt: number;
  variance_bdt: number;
  is_locked: boolean;
}

export interface BoqItem {
  id: number;
  project_id: number;
  tower_name?: string;
  work_category: string;
  work_item: string;
  item_code?: string;
  unit: string;
  estimated_qty: number;
  budget_rate_bdt: number;
  total_budget_bdt: number;
  material_cost_bdt: number;
  labor_cost_bdt: number;
  equipment_cost_bdt: number;
  subcontractor_cost_bdt: number;
  actual_qty: number;
  certified_qty: number;
  actual_spent_bdt: number;
  version: number;
  is_approved: boolean;
  notes?: string;
}

export interface CostAllocation {
  id: number;
  allocation_code: string;
  project_id: number;
  tower_name?: string;
  floor_level?: string;
  unit_number?: string;
  cost_center: string;
  cost_category: string;
  allocation_method: string;
  basis_value: number;
  allocated_pct: number;
  allocated_amount_bdt: number;
  remarks?: string;
}

export interface ApprovalWorkflowStep {
  id: number;
  budget_plan_id: number;
  step_sequence: number;
  step_name: string;
  assigned_role: string;
  status: string;
  action_taken?: string;
  comments?: string;
  action_by?: string;
  action_at?: string;
}

export interface PurchaseBudgetCheck {
  id: number;
  check_code: string;
  project_id: number;
  document_type: string;
  document_ref: string;
  vendor_name?: string;
  cost_category: string;
  cost_center: string;
  requested_amount_bdt: number;
  current_budget_bdt: number;
  already_committed_bdt: number;
  available_budget_bdt: number;
  status: string;
  action_notes?: string;
  verified_by?: string;
  verified_at?: string;
}

export interface ExpenseControl {
  id: number;
  expense_ref: string;
  project_id: number;
  tower_name?: string;
  cost_category: string;
  party_type: string;
  party_name: string;
  bill_number?: string;
  bill_amount_bdt: number;
  certified_amount_bdt: number;
  tax_vat_deducted_bdt: number;
  retention_amount_bdt: number;
  net_payable_bdt: number;
  paid_amount_bdt: number;
  balance_payable_bdt: number;
  payment_status: string;
  voucher_ref?: string;
  bill_date?: string;
}

export interface BudgetVariation {
  id: number;
  variation_code: string;
  project_id: number;
  project_name?: string;
  tower_name?: string;
  title: string;
  reason_category: string;
  justification?: string;
  original_qty: number;
  revised_qty: number;
  original_cost_bdt: number;
  revised_cost_bdt: number;
  variation_amount_bdt: number;
  stage: string;
  approved_by?: string;
  created_by?: string;
  created_at?: string;
}

export interface BudgetReportFilter {
  project_id?: number;
  tower_name?: string;
  floor_level?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BudgetingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/budgeting`;

  // 1. Dashboard
  getDashboardSummary(projectId?: number): Observable<any> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<any>(`${this.apiUrl}/dashboard/summary`, { params });
  }

  // 2. Budget Plans
  getPlans(filter?: { search?: string; fiscal_year?: string; scope_level?: string; limit?: number; offset?: number }): Observable<{ items: BudgetPlan[]; total: number }> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.fiscal_year) params = params.set('fiscal_year', filter.fiscal_year);
    if (filter?.scope_level) params = params.set('scope_level', filter.scope_level);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: BudgetPlan[]; total: number }>(`${this.apiUrl}/plans`, { params });
  }

  getPlan(id: number): Observable<BudgetPlan> {
    return this.http.get<BudgetPlan>(`${this.apiUrl}/plans/${id}`);
  }

  createPlan(data: Partial<BudgetPlan>): Observable<BudgetPlan> {
    return this.http.post<BudgetPlan>(`${this.apiUrl}/plans`, data);
  }

  updatePlan(id: number, data: Partial<BudgetPlan>): Observable<BudgetPlan> {
    return this.http.put<BudgetPlan>(`${this.apiUrl}/plans/${id}`, data);
  }

  deletePlan(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/plans/${id}`);
  }

  // 3. Project Budgets
  getProjectBudgets(filter?: { project_id?: number; cost_category?: string; search?: string; limit?: number; offset?: number }): Observable<{ items: ProjectBudgetLine[]; total: number }> {
    let params = new HttpParams();
    if (filter?.project_id) params = params.set('project_id', filter.project_id);
    if (filter?.cost_category) params = params.set('cost_category', filter.cost_category);
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: ProjectBudgetLine[]; total: number }>(`${this.apiUrl}/project-budgets`, { params });
  }

  createProjectBudget(data: Partial<ProjectBudgetLine>): Observable<ProjectBudgetLine> {
    return this.http.post<ProjectBudgetLine>(`${this.apiUrl}/project-budgets`, data);
  }

  updateProjectBudget(id: number, data: Partial<ProjectBudgetLine>): Observable<ProjectBudgetLine> {
    return this.http.put<ProjectBudgetLine>(`${this.apiUrl}/project-budgets/${id}`, data);
  }

  deleteProjectBudget(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/project-budgets/${id}`);
  }

  // 4. BOQ Items
  getBoqItems(filter?: { project_id?: number; work_category?: string; search?: string; limit?: number; offset?: number }): Observable<{ items: BoqItem[]; total: number }> {
    let params = new HttpParams();
    if (filter?.project_id) params = params.set('project_id', filter.project_id);
    if (filter?.work_category) params = params.set('work_category', filter.work_category);
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: BoqItem[]; total: number }>(`${this.apiUrl}/boq`, { params });
  }

  createBoqItem(data: Partial<BoqItem>): Observable<BoqItem> {
    return this.http.post<BoqItem>(`${this.apiUrl}/boq`, data);
  }

  updateBoqItem(id: number, data: Partial<BoqItem>): Observable<BoqItem> {
    return this.http.put<BoqItem>(`${this.apiUrl}/boq/${id}`, data);
  }

  deleteBoqItem(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/boq/${id}`);
  }

  // 5. Cost Allocation
  getCostAllocations(filter?: { project_id?: number; cost_center?: string; limit?: number; offset?: number }): Observable<{ items: CostAllocation[]; total: number }> {
    let params = new HttpParams();
    if (filter?.project_id) params = params.set('project_id', filter.project_id);
    if (filter?.cost_center) params = params.set('cost_center', filter.cost_center);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: CostAllocation[]; total: number }>(`${this.apiUrl}/cost-allocations`, { params });
  }

  createCostAllocation(data: Partial<CostAllocation>): Observable<CostAllocation> {
    return this.http.post<CostAllocation>(`${this.apiUrl}/cost-allocations`, data);
  }

  deleteCostAllocation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/cost-allocations/${id}`);
  }

  // 6. Approval Workflow
  getApprovalWorkflows(planId?: number): Observable<ApprovalWorkflowStep[]> {
    let params = new HttpParams();
    if (planId) params = params.set('plan_id', planId);
    return this.http.get<ApprovalWorkflowStep[]>(`${this.apiUrl}/approval-workflows`, { params });
  }

  processApprovalAction(data: { workflow_id: number; action: string; comments?: string; action_by?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/approval-workflows/action`, data);
  }

  // 7. Purchase Budget Control
  getPurchaseControls(filter?: { project_id?: number; document_type?: string; status_filter?: string; limit?: number; offset?: number }): Observable<{ items: PurchaseBudgetCheck[]; total: number }> {
    let params = new HttpParams();
    if (filter?.project_id) params = params.set('project_id', filter.project_id);
    if (filter?.document_type) params = params.set('document_type', filter.document_type);
    if (filter?.status_filter) params = params.set('status_filter', filter.status_filter);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: PurchaseBudgetCheck[]; total: number }>(`${this.apiUrl}/purchase-controls`, { params });
  }

  checkPurchaseBudget(data: Partial<PurchaseBudgetCheck>): Observable<PurchaseBudgetCheck> {
    return this.http.post<PurchaseBudgetCheck>(`${this.apiUrl}/purchase-controls`, data);
  }

  // 8. Expense Controls
  getExpenseControls(filter?: { project_id?: number; payment_status?: string; search?: string; limit?: number; offset?: number }): Observable<{ items: ExpenseControl[]; total: number }> {
    let params = new HttpParams();
    if (filter?.project_id) params = params.set('project_id', filter.project_id);
    if (filter?.payment_status) params = params.set('payment_status', filter.payment_status);
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: ExpenseControl[]; total: number }>(`${this.apiUrl}/expense-controls`, { params });
  }

  createExpenseControl(data: Partial<ExpenseControl>): Observable<ExpenseControl> {
    return this.http.post<ExpenseControl>(`${this.apiUrl}/expense-controls`, data);
  }

  updateExpenseControl(id: number, data: Partial<ExpenseControl>): Observable<ExpenseControl> {
    return this.http.put<ExpenseControl>(`${this.apiUrl}/expense-controls/${id}`, data);
  }

  deleteExpenseControl(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/expense-controls/${id}`);
  }

  // 9. Budget Variation
  getVariations(filter?: { project_id?: number; stage?: string; search?: string; limit?: number; offset?: number }): Observable<{ items: BudgetVariation[]; total: number }> {
    let params = new HttpParams();
    if (filter?.project_id) params = params.set('project_id', filter.project_id);
    if (filter?.stage) params = params.set('stage', filter.stage);
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: BudgetVariation[]; total: number }>(`${this.apiUrl}/variations`, { params });
  }

  createVariation(data: Partial<BudgetVariation>): Observable<BudgetVariation> {
    return this.http.post<BudgetVariation>(`${this.apiUrl}/variations`, data);
  }

  getVariation(id: number): Observable<BudgetVariation> {
    return this.http.get<BudgetVariation>(`${this.apiUrl}/variations/${id}`);
  }

  updateVariation(id: number, data: Partial<BudgetVariation>): Observable<BudgetVariation> {
    return this.http.put<BudgetVariation>(`${this.apiUrl}/variations/${id}`, data);
  }

  deleteVariation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/variations/${id}`);
  }

  // 10. Budget vs Actual
  getBudgetVsActual(projectId?: number): Observable<any> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<any>(`${this.apiUrl}/budget-vs-actual`, { params });
  }

  // 11. Forecasting
  getForecasting(projectId?: number): Observable<any[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<any[]>(`${this.apiUrl}/forecasting`, { params });
  }

  // 12. Reports
  getReports(reportType: string, filter?: BudgetReportFilter): Observable<any>;
  getReports(filter?: BudgetReportFilter): Observable<any>;
  getReports(reportTypeOrFilter?: string | BudgetReportFilter, filter?: BudgetReportFilter): Observable<any> {
    const reportType = typeof reportTypeOrFilter === 'string' ? reportTypeOrFilter : 'project_expenditure';
    const normalizedFilter = typeof reportTypeOrFilter === 'string' ? filter : reportTypeOrFilter;

    let params = new HttpParams().set('report_type', reportType);
    if (normalizedFilter?.project_id) params = params.set('project_id', normalizedFilter.project_id);
    if (normalizedFilter?.tower_name) params = params.set('tower_name', normalizedFilter.tower_name);
    if (normalizedFilter?.floor_level) params = params.set('floor_level', normalizedFilter.floor_level);
    return this.http.get<any>(`${this.apiUrl}/reports`, { params });
  }
}
