import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FixedAsset {
  id: number;
  asset_tag: string;
  asset_name: string;
  category: string;
  brand_model?: string;
  serial_number?: string;
  project_id?: number;
  project_name?: string;
  location?: string;
  custodian_employee_id?: number;
  custodian_name?: string;
  purchase_date: string;
  acquisition_cost_bdt: number;
  useful_life_years: number;
  depreciation_method: string;
  depreciation_rate_percent: number;
  accumulated_depreciation_bdt: number;
  net_book_value_bdt: number;
  salvage_value_bdt: number;
  status: string;
  warranty_expiry_date?: string;
  insurance_policy_no?: string;
  insurance_expiry_date?: string;
  gl_account_code?: string;
  created_at?: string;
}

export interface AssetDepreciationScheduleItem {
  asset_id: number;
  asset_tag: string;
  asset_name: string;
  category: string;
  depreciation_method: string;
  annual_rate_percent: number;
  monthly_depreciation_bdt: number;
  annual_depreciation_bdt: number;
  accumulated_depreciation_bdt: number;
  net_book_value_bdt: number;
  gl_account_code: string;
  is_posted_gl: boolean;
}

export interface AssetTransfer {
  id: number;
  transfer_ref: string;
  asset_id: number;
  from_project_id?: number;
  from_project_name?: string;
  from_location?: string;
  to_project_id?: number;
  to_project_name?: string;
  to_location: string;
  transfer_date: string;
  reason?: string;
  transferred_by?: string;
  received_by?: string;
  status: string;
  created_at?: string;
}

export interface AssetMaintenance {
  id: number;
  maintenance_code: string;
  asset_id: number;
  service_type: string;
  vendor_name: string;
  service_date: string;
  maintenance_cost_bdt: number;
  downtime_hours: number;
  description: string;
  parts_replaced?: string;
  voucher_ref?: string;
  technician_name?: string;
  meter_reading?: number;
  is_scheduled: boolean;
  created_at?: string;
}

export interface AssetDisposal {
  id: number;
  disposal_ref: string;
  asset_id: number;
  disposal_date: string;
  disposal_type: string;
  sale_proceeds_bdt: number;
  original_cost_bdt: number;
  accumulated_depreciation_bdt: number;
  nbv_at_disposal_bdt: number;
  gain_loss_amount_bdt: number;
  buyer_name?: string;
  reason?: string;
  approved_by?: string;
  journal_voucher_ref?: string;
  created_at?: string;
}

export interface AssetPhysicalVerification {
  id: number;
  audit_code: string;
  verification_date: string;
  location: string;
  project_id?: number;
  project_name?: string;
  total_assets_registered: number;
  total_assets_found: number;
  discrepancy_qty: number;
  condition_status: string;
  discrepancy_notes?: string;
  action_taken?: string;
  verified_by: string;
  created_at?: string;
}

export interface AssetDashboardSummary {
  total_asset_acquisition_cost_bdt: number;
  accumulated_depreciation_bdt: number;
  current_net_book_value_bdt: number;
  total_active_assets_count: number;
  total_additions_this_year_bdt: number;
  total_disposals_this_year_bdt: number;
  total_maintenance_expenses_bdt: number;
  total_equipment_downtime_hours: number;
  expiring_warranties_count: number;
  expiring_insurance_count: number;
  unreconciled_gl_difference_bdt: number;
  category_distribution: {
    category: string;
    count: number;
    acquisition_cost_bdt: number;
    nbv_bdt: number;
  }[];
  monthly_depreciation_trend: {
    month: string;
    depreciation_bdt: number;
  }[];
}

export interface GlReconciliationAccount {
  gl_account_code: string;
  gl_account_name: string;
  gl_ledger_balance_bdt: number;
  asset_sub_ledger_balance_bdt: number;
  unreconciled_difference_bdt: number;
  status: string;
}

export interface GlReconciliationResult {
  reconciliation_date: string;
  total_general_ledger_bdt: number;
  total_asset_sub_ledger_bdt: number;
  total_difference_bdt: number;
  reconciliation_status: string;
  accounts: GlReconciliationAccount[];
}

@Injectable({
  providedIn: 'root'
})
export class FixedAssetsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/fixed-assets`;

  // 1. Dashboard Summary
  getDashboardSummary(projectId?: number, category?: string): Observable<AssetDashboardSummary> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    if (category) params = params.set('category', category);
    return this.http.get<AssetDashboardSummary>(`${this.apiUrl}/dashboard/summary`, { params });
  }

  // 2. Asset Register CRUD & Paging
  getAssets(filter?: {
    search?: string;
    category?: string;
    project_id?: number;
    status_filter?: string;
    limit?: number;
    offset?: number;
  }): Observable<{ items: FixedAsset[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.category) params = params.set('category', filter.category);
    if (filter?.project_id) params = params.set('project_id', filter.project_id);
    if (filter?.status_filter) params = params.set('status_filter', filter.status_filter);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: FixedAsset[]; total: number; limit: number; offset: number }>(`${this.apiUrl}/assets`, { params });
  }

  createAsset(data: Partial<FixedAsset>): Observable<FixedAsset> {
    return this.http.post<FixedAsset>(`${this.apiUrl}/assets`, data);
  }

  updateAsset(id: number, data: Partial<FixedAsset>): Observable<FixedAsset> {
    return this.http.put<FixedAsset>(`${this.apiUrl}/assets/${id}`, data);
  }

  deleteAsset(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/assets/${id}`);
  }

  // 3. Depreciation Schedule
  getDepreciationSchedule(fiscalYear: string = '2025-2026', assetId?: number): Observable<AssetDepreciationScheduleItem[]> {
    let params = new HttpParams().set('fiscal_year', fiscalYear);
    if (assetId) params = params.set('asset_id', assetId);
    return this.http.get<AssetDepreciationScheduleItem[]>(`${this.apiUrl}/depreciation`, { params });
  }

  // 4. Transfers
  getTransfers(filter?: { asset_id?: number; search?: string; limit?: number; offset?: number }): Observable<{ items: AssetTransfer[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    if (filter?.asset_id) params = params.set('asset_id', filter.asset_id);
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: AssetTransfer[]; total: number; limit: number; offset: number }>(`${this.apiUrl}/transfers`, { params });
  }

  createTransfer(data: Partial<AssetTransfer>): Observable<AssetTransfer> {
    return this.http.post<AssetTransfer>(`${this.apiUrl}/transfers`, data);
  }

  updateTransfer(id: number, data: Partial<AssetTransfer>): Observable<AssetTransfer> {
    return this.http.put<AssetTransfer>(`${this.apiUrl}/transfers/${id}`, data);
  }

  deleteTransfer(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/transfers/${id}`);
  }

  // 5. Maintenances
  getMaintenances(filter?: { asset_id?: number; search?: string; limit?: number; offset?: number }): Observable<{ items: AssetMaintenance[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    if (filter?.asset_id) params = params.set('asset_id', filter.asset_id);
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: AssetMaintenance[]; total: number; limit: number; offset: number }>(`${this.apiUrl}/maintenances`, { params });
  }

  createMaintenance(data: Partial<AssetMaintenance>): Observable<AssetMaintenance> {
    return this.http.post<AssetMaintenance>(`${this.apiUrl}/maintenances`, data);
  }

  updateMaintenance(id: number, data: Partial<AssetMaintenance>): Observable<AssetMaintenance> {
    return this.http.put<AssetMaintenance>(`${this.apiUrl}/maintenances/${id}`, data);
  }

  deleteMaintenance(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/maintenances/${id}`);
  }

  // 6. Disposals
  getDisposals(filter?: { search?: string; limit?: number; offset?: number }): Observable<{ items: AssetDisposal[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: AssetDisposal[]; total: number; limit: number; offset: number }>(`${this.apiUrl}/disposals`, { params });
  }

  createDisposal(data: Partial<AssetDisposal>): Observable<AssetDisposal> {
    return this.http.post<AssetDisposal>(`${this.apiUrl}/disposals`, data);
  }

  updateDisposal(id: number, data: Partial<AssetDisposal>): Observable<AssetDisposal> {
    return this.http.put<AssetDisposal>(`${this.apiUrl}/disposals/${id}`, data);
  }

  deleteDisposal(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/disposals/${id}`);
  }

  // 7. Physical Verifications
  getVerifications(filter?: { search?: string; limit?: number; offset?: number }): Observable<{ items: AssetPhysicalVerification[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.limit) params = params.set('limit', filter.limit);
    if (filter?.offset) params = params.set('offset', filter.offset);
    return this.http.get<{ items: AssetPhysicalVerification[]; total: number; limit: number; offset: number }>(`${this.apiUrl}/verifications`, { params });
  }

  createVerification(data: Partial<AssetPhysicalVerification>): Observable<AssetPhysicalVerification> {
    return this.http.post<AssetPhysicalVerification>(`${this.apiUrl}/verifications`, data);
  }

  updateVerification(id: number, data: Partial<AssetPhysicalVerification>): Observable<AssetPhysicalVerification> {
    return this.http.put<AssetPhysicalVerification>(`${this.apiUrl}/verifications/${id}`, data);
  }

  deleteVerification(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/verifications/${id}`);
  }

  // 8. GL Reconciliation
  getGlReconciliation(): Observable<GlReconciliationResult> {
    return this.http.get<GlReconciliationResult>(`${this.apiUrl}/gl-reconciliation`);
  }

  // 9. All 10 Key Reports
  getReports(reportType: string, category?: string, projectId?: number): Observable<any> {
    let params = new HttpParams().set('report_type', reportType);
    if (category) params = params.set('category', category);
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<any>(`${this.apiUrl}/reports`, { params });
  }
}
