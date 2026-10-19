import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Unit, UnitLockResponse, ParkingBay, ParkingSlot,
  TowerStackingResponse, PriceBreakdown, UnitMergePayload,
  UnitSplitPayload, CombinationLog,
  InventoryDashboardResponse, UnitPagedResponse, UnitCreatePayload, UnitUpdatePayload, BulkUnitCreatePayload
} from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/inventory`;

  // Real-Time WebSocket event subject
  private socket?: WebSocket;
  public realTimeUpdates$ = new Subject<any>();

  // 1. Units List & Matrix
  getUnits(filters?: { project_id?: number; tower_id?: number; status_id?: string; facing_id?: string }): Observable<Unit[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.status_id) params = params.set('status_id', filters.status_id);
    if (filters?.facing_id) params = params.set('facing_id', filters.facing_id);
    return this.http.get<Unit[]>(`${this.baseUrl}/units`, { params });
  }

  createUnit(payload: any): Observable<Unit> {
    return this.http.post<Unit>(`${this.baseUrl}/units`, payload);
  }

  // 2. 2D Visual Tower Stacking Elevation
  getStackingPlan(projectId: number, towerId?: number): Observable<TowerStackingResponse> {
    let params = new HttpParams().set('project_id', projectId);
    if (towerId) params = params.set('tower_id', towerId);
    return this.http.get<TowerStackingResponse>(`${this.baseUrl}/stacking-plan`, { params });
  }

  // 3. Dynamic Price Calculator Sheet
  getPriceBreakdown(unitId: number): Observable<PriceBreakdown> {
    return this.http.get<PriceBreakdown>(`${this.baseUrl}/units/${unitId}/pricing-breakdown`);
  }

  // 4. 15-Minute Instant Reserve Mutex Lock
  reserveUnit(unitId: number, userName = 'Current User'): Observable<UnitLockResponse> {
    return this.http.post<UnitLockResponse>(`${this.baseUrl}/units/${unitId}/reserve`, {
      user_id: 1,
      user_name: userName,
      duration_minutes: 15
    });
  }

  lockUnit(unitId: number, userName = 'Current User'): Observable<UnitLockResponse> {
    return this.reserveUnit(unitId, userName);
  }

  // 5. Release Reserve Hold
  releaseUnit(unitId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/units/${unitId}/release`, {});
  }

  unlockUnit(unitId: number): Observable<{ success: boolean; message: string }> {
    return this.releaseUnit(unitId);
  }

  // 6. Unit Combination & Subdivision
  mergeUnits(payload: UnitMergePayload): Observable<Unit> {
    return this.http.post<Unit>(`${this.baseUrl}/units/merge`, payload);
  }

  splitUnit(unitId: number, payload: UnitSplitPayload): Observable<Unit[]> {
    return this.http.post<Unit[]>(`${this.baseUrl}/units/${unitId}/split`, payload);
  }

  getCombinationLogs(projectId?: number, towerId?: number): Observable<CombinationLog[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    if (towerId) params = params.set('tower_id', towerId);
    return this.http.get<CombinationLog[]>(`${this.baseUrl}/combinations`, { params });
  }

  // 7. Basement Parking Slots
  getParkingSlots(filters?: { project_id?: number; tower_id?: number; basement_level?: string; status?: string }): Observable<ParkingSlot[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.basement_level) params = params.set('basement_level', filters.basement_level);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<ParkingSlot[]>(`${this.baseUrl}/parking-slots`, { params });
  }

  createParkingSlot(payload: any): Observable<ParkingSlot> {
    return this.http.post<ParkingSlot>(`${this.baseUrl}/parking-slots`, payload);
  }

  assignParkingSlot(slotId: number, unitId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/parking-slots/assign`, {
      slot_id: slotId,
      unit_id: unitId
    });
  }

  // Legacy parking bays support
  getParkingBays(projectId?: number): Observable<ParkingBay[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<ParkingBay[]>(`${this.baseUrl}/parking-bays`, { params });
  }

  // 3.1 Consolidated Property Inventory Dashboard
  getInventoryDashboard(params?: {
    project_id?: number | null;
    tower_id?: number | null;
    property_type?: string | null;
    status_id?: string | null;
  }): Observable<InventoryDashboardResponse> {
    let p = new HttpParams();
    if (params?.project_id) p = p.set('project_id', params.project_id);
    if (params?.tower_id) p = p.set('tower_id', params.tower_id);
    if (params?.property_type) p = p.set('property_type', params.property_type);
    if (params?.status_id) p = p.set('status_id', params.status_id);
    return this.http.get<InventoryDashboardResponse>(`${this.baseUrl}/dashboard`, { params: p });
  }

  // 3.2 & 3.3 Paginated Unit Directory with Filters
  getUnitsPaged(params: {
    page: number;
    limit: number;
    search?: string;
    project_id?: number | null;
    tower_id?: number | null;
    floor_number?: number | null;
    status_id?: string | null;
    facing_id?: string | null;
    is_landowner_share?: boolean | null;
  }): Observable<UnitPagedResponse> {
    let p = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit);
    if (params.search) p = p.set('search', params.search);
    if (params.project_id) p = p.set('project_id', params.project_id);
    if (params.tower_id) p = p.set('tower_id', params.tower_id);
    if (params.floor_number !== undefined && params.floor_number !== null) p = p.set('floor_number', params.floor_number);
    if (params.status_id) p = p.set('status_id', params.status_id);
    if (params.facing_id) p = p.set('facing_id', params.facing_id);
    if (params.is_landowner_share !== undefined && params.is_landowner_share !== null) p = p.set('is_landowner_share', params.is_landowner_share);

    return this.http.get<UnitPagedResponse>(`${this.baseUrl}/units/paged`, { params: p });
  }

  getUnitById(unitId: number): Observable<Unit> {
    return this.http.get<Unit>(`${this.baseUrl}/units/${unitId}`);
  }

  updateUnit(unitId: number, payload: UnitUpdatePayload): Observable<Unit> {
    return this.http.put<Unit>(`${this.baseUrl}/units/${unitId}`, payload);
  }

  deleteUnit(unitId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/units/${unitId}`);
  }

  bulkCreateUnits(payload: BulkUnitCreatePayload): Observable<{ success: boolean; created_units_count: number; message: string }> {
    return this.http.post<{ success: boolean; created_units_count: number; message: string }>(`${this.baseUrl}/units/bulk`, payload);
  }

  // 8. Connect Real-Time WebSocket
  connectLiveMatrix(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = environment.apiUrl.replace(/^http/, 'ws') + '/inventory/live-matrix';
    try {
      this.socket = new WebSocket(wsUrl);
      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.realTimeUpdates$.next(parsed);
        } catch {
          // Ignore invalid frames
        }
      };

      this.socket.onclose = () => {
        setTimeout(() => this.connectLiveMatrix(), 3000);
      };
    } catch {
      // Graceful fallback
    }
  }

  disconnectLiveMatrix(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }
}
