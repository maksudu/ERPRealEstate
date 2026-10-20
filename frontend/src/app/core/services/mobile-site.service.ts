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

export interface MobileSiteDashboardKpis {
  project_overall_progress_percent: number;
  active_labour_strength_today: number;
  pending_tasks: number;
  material_requests: number;
  inspection_alerts: number;
  open_safety_incidents: number;
  dpr_submitted_count: number;
  offline_cached_records: number;
  concrete_cube_tests_due: number;
  active_project: string;
}

export interface MobileSiteDprItem {
  id: number;
  dpr_code: string;
  project_name: string;
  dpr_date: string;
  weather_condition: string;
  labour_count: number;
  work_completed: string;
  delays_challenges?: string;
  site_engineer: string;
  status: string;
  created_at?: string;
}

export interface MobileSiteTaskItem {
  id: number;
  task_code: string;
  task_name: string;
  milestone_name: string;
  project_name: string;
  assigned_to: string;
  deadline: string;
  progress_percentage: number;
  priority: string;
  status: string;
  created_at?: string;
}

export interface MobileSiteMaterialReqItem {
  id: number;
  req_code: string;
  project_name: string;
  material_name: string;
  material_category: string;
  quantity: number;
  unit: string;
  urgency: string;
  required_by_date: string;
  status: string;
  requested_by: string;
  created_at?: string;
}

export interface MobileSiteMaterialTxItem {
  id: number;
  tx_code: string;
  tx_type: string;
  project_name: string;
  material_name: string;
  quantity: number;
  unit: string;
  vendor_or_receiver?: string;
  challan_number?: string;
  vehicle_number?: string;
  recorded_by: string;
  remarks?: string;
  created_at?: string;
}

export interface MobileSitePhotoDocItem {
  id: number;
  photo_code: string;
  project_name: string;
  floor_or_location: string;
  photo_url: string;
  gps_latitude: number;
  gps_longitude: number;
  captured_by: string;
  notes?: string;
  created_at?: string;
}

export interface MobileSiteQualityItem {
  id?: number;
  qc_code?: string;
  project_id?: number;
  project_name?: string;
  checklist_name?: string;
  check_item?: string;
  inspection_item?: string;
  inspection_category?: string;
  location_area?: string;
  inspector_name?: string;
  inspected_by?: string;
  result?: string;
  status?: string;
  inspection_date?: string;
  defect_description?: string;
  defect_notes?: string;
  corrective_action?: string;
  created_at?: string;
}
export type MobileSiteQuality = MobileSiteQualityItem;

export interface MobileSiteContractorItem {
  id?: number;
  record_code?: string;
  project_id?: number;
  project_name?: string;
  contractor_name?: string;
  trade_type?: string;
  work_scope?: string;
  work_description?: string;
  measured_qty?: number;
  measured_quantity?: number;
  unit?: string;
  certified_amount?: number;
  verified_bill_amount?: number;
  bill_status?: string;
  verification_status?: string;
  verified_by?: string;
  measurement_date?: string;
  notes?: string;
  created_at?: string;
}
export type MobileSiteContractor = MobileSiteContractorItem;

export interface MobileSiteSafetyItem {
  id?: number;
  incident_code?: string;
  project_id?: number;
  project_name?: string;
  title?: string;
  incident_type?: string;
  severity?: string;
  location?: string;
  reported_by?: string;
  inspector_name?: string;
  status?: string;
  incident_date?: string;
  description?: string;
  corrective_action?: string;
  created_at?: string;
}
export type MobileSiteSafety = MobileSiteSafetyItem;

export interface MobileSiteOfflineSyncItem {
  id?: number;
  sync_code?: string;
  client_generated_id?: string;
  entity_name?: string;
  action?: string;
  payload_json?: string;
  payload_type?: string;
  device_id?: string;
  synced_records_count?: number;
  sync_status?: string;
  status?: string;
  synced_at?: string;
  remarks?: string;
  created_at?: string;
}
export type MobileSiteOfflineSync = MobileSiteOfflineSyncItem;

@Injectable({
  providedIn: 'root'
})
export class MobileSiteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/mobile-site`;

  // 1. Dashboard
  getDashboardKpis(): Observable<MobileSiteDashboardKpis> {
    return this.http.get<MobileSiteDashboardKpis>(`${this.apiUrl}/dashboard/kpis`);
  }

  // 2. DPR
  getDprs(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileSiteDprItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileSiteDprItem>>(`${this.apiUrl}/dpr`, { params: p });
  }

  createDpr(data: Partial<MobileSiteDprItem>): Observable<MobileSiteDprItem> {
    return this.http.post<MobileSiteDprItem>(`${this.apiUrl}/dpr`, data);
  }

  updateDpr(id: number, data: Partial<MobileSiteDprItem>): Observable<MobileSiteDprItem> {
    return this.http.put<MobileSiteDprItem>(`${this.apiUrl}/dpr/${id}`, data);
  }

  deleteDpr(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/dpr/${id}`);
  }

  // 3. Tasks
  getTasks(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileSiteTaskItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileSiteTaskItem>>(`${this.apiUrl}/tasks`, { params: p });
  }

  createTask(data: Partial<MobileSiteTaskItem>): Observable<MobileSiteTaskItem> {
    return this.http.post<MobileSiteTaskItem>(`${this.apiUrl}/tasks`, data);
  }

  updateTask(id: number, data: Partial<MobileSiteTaskItem>): Observable<MobileSiteTaskItem> {
    return this.http.put<MobileSiteTaskItem>(`${this.apiUrl}/tasks/${id}`, data);
  }

  deleteTask(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tasks/${id}`);
  }

  // 4. Material Requisitions
  getRequisitions(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileSiteMaterialReqItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileSiteMaterialReqItem>>(`${this.apiUrl}/requisitions`, { params: p });
  }

  createRequisition(data: Partial<MobileSiteMaterialReqItem>): Observable<MobileSiteMaterialReqItem> {
    return this.http.post<MobileSiteMaterialReqItem>(`${this.apiUrl}/requisitions`, data);
  }

  updateRequisition(id: number, data: Partial<MobileSiteMaterialReqItem>): Observable<MobileSiteMaterialReqItem> {
    return this.http.put<MobileSiteMaterialReqItem>(`${this.apiUrl}/requisitions/${id}`, data);
  }

  deleteRequisition(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/requisitions/${id}`);
  }

  // 5. Material Transactions
  getTransactions(params?: { search?: string; tx_type?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileSiteMaterialTxItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.tx_type) p = p.set('tx_type', params.tx_type);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileSiteMaterialTxItem>>(`${this.apiUrl}/transactions`, { params: p });
  }

  createTransaction(data: Partial<MobileSiteMaterialTxItem>): Observable<MobileSiteMaterialTxItem> {
    return this.http.post<MobileSiteMaterialTxItem>(`${this.apiUrl}/transactions`, data);
  }

  deleteTransaction(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/transactions/${id}`);
  }

  // 6. Photo Docs
  getPhotos(params?: { search?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileSitePhotoDocItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileSitePhotoDocItem>>(`${this.apiUrl}/photos`, { params: p });
  }

  createPhoto(data: Partial<MobileSitePhotoDocItem>): Observable<MobileSitePhotoDocItem> {
    return this.http.post<MobileSitePhotoDocItem>(`${this.apiUrl}/photos`, data);
  }

  deletePhoto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/photos/${id}`);
  }

  // 7. Quality
  getQualityInspections(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileSiteQualityItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileSiteQualityItem>>(`${this.apiUrl}/quality`, { params: p });
  }

  createQualityInspection(data: Partial<MobileSiteQualityItem>): Observable<MobileSiteQualityItem> {
    return this.http.post<MobileSiteQualityItem>(`${this.apiUrl}/quality`, data);
  }

  updateQualityInspection(id: number, data: Partial<MobileSiteQualityItem>): Observable<MobileSiteQualityItem> {
    return this.http.put<MobileSiteQualityItem>(`${this.apiUrl}/quality/${id}`, data);
  }

  deleteQualityInspection(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/quality/${id}`);
  }

  // 8. Contractors
  getContractorRecords(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileSiteContractorItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileSiteContractorItem>>(`${this.apiUrl}/contractors`, { params: p });
  }

  createContractorRecord(data: Partial<MobileSiteContractorItem>): Observable<MobileSiteContractorItem> {
    return this.http.post<MobileSiteContractorItem>(`${this.apiUrl}/contractors`, data);
  }

  updateContractorRecord(id: number, data: Partial<MobileSiteContractorItem>): Observable<MobileSiteContractorItem> {
    return this.http.put<MobileSiteContractorItem>(`${this.apiUrl}/contractors/${id}`, data);
  }

  deleteContractorRecord(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/contractors/${id}`);
  }

  // 9. Safety
  getSafetyIncidents(params?: { search?: string; severity?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileSiteSafetyItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.severity) p = p.set('severity', params.severity);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileSiteSafetyItem>>(`${this.apiUrl}/safety`, { params: p });
  }

  createSafetyIncident(data: Partial<MobileSiteSafetyItem>): Observable<MobileSiteSafetyItem> {
    return this.http.post<MobileSiteSafetyItem>(`${this.apiUrl}/safety`, data);
  }

  updateSafetyIncident(id: number, data: Partial<MobileSiteSafetyItem>): Observable<MobileSiteSafetyItem> {
    return this.http.put<MobileSiteSafetyItem>(`${this.apiUrl}/safety/${id}`, data);
  }

  deleteSafetyIncident(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/safety/${id}`);
  }

  // 10. Offline Sync
  getOfflineSyncs(params?: { sync_status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileSiteOfflineSyncItem>> {
    let p = new HttpParams();
    if (params?.sync_status) p = p.set('sync_status', params.sync_status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileSiteOfflineSyncItem>>(`${this.apiUrl}/offline-sync`, { params: p });
  }

  createOfflineSync(data: Partial<MobileSiteOfflineSyncItem>): Observable<MobileSiteOfflineSyncItem> {
    return this.http.post<MobileSiteOfflineSyncItem>(`${this.apiUrl}/offline-sync`, data);
  }

  updateOfflineSync(id: number, data: Partial<MobileSiteOfflineSyncItem>): Observable<MobileSiteOfflineSyncItem> {
    return this.http.put<MobileSiteOfflineSyncItem>(`${this.apiUrl}/offline-sync/${id}`, data);
  }

  deleteOfflineSync(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/offline-sync/${id}`);
  }

  // Alias methods for components
  getQualityList(params?: { search?: string; status?: string; limit?: number; offset?: number }) {
    return this.getQualityInspections(params);
  }
  createQuality(data: Partial<MobileSiteQualityItem>) {
    return this.createQualityInspection(data);
  }
  updateQuality(id: number, data: Partial<MobileSiteQualityItem>) {
    return this.updateQualityInspection(id, data);
  }
  deleteQuality(id: number) {
    return this.deleteQualityInspection(id);
  }

  getContractorList(params?: { search?: string; bill_status?: string; limit?: number; offset?: number }) {
    return this.getContractorRecords({ search: params?.search, status: params?.bill_status, limit: params?.limit, offset: params?.offset });
  }
  createContractor(data: Partial<MobileSiteContractorItem>) {
    return this.createContractorRecord(data);
  }
  updateContractor(id: number, data: Partial<MobileSiteContractorItem>) {
    return this.updateContractorRecord(id, data);
  }
  deleteContractor(id: number) {
    return this.deleteContractorRecord(id);
  }

  getSafetyList(params?: { search?: string; severity?: string; limit?: number; offset?: number }) {
    return this.getSafetyIncidents(params);
  }
  createSafety(data: Partial<MobileSiteSafetyItem>) {
    return this.createSafetyIncident(data);
  }
  updateSafety(id: number, data: Partial<MobileSiteSafetyItem>) {
    return this.updateSafetyIncident(id, data);
  }
  deleteSafety(id: number) {
    return this.deleteSafetyIncident(id);
  }

  getOfflineQueue(params?: { sync_status?: string; limit?: number; offset?: number }) {
    return this.getOfflineSyncs(params);
  }
  queueOfflineItem(data: Partial<MobileSiteOfflineSyncItem>) {
    return this.createOfflineSync(data);
  }
  updateOfflineItem(id: number, data: Partial<MobileSiteOfflineSyncItem>) {
    return this.updateOfflineSync(id, data);
  }
  deleteOfflineItem(id: number) {
    return this.deleteOfflineSync(id);
  }

  // Auth Session
  getAuthSession(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/session`);
  }
}
