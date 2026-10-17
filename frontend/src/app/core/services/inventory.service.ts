import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Unit, UnitLockResponse, ParkingBay, ParkingSlot,
  TowerStackingResponse, PriceBreakdown, UnitMergePayload,
  UnitSplitPayload, CombinationLog
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
