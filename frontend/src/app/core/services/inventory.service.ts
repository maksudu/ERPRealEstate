import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Unit, UnitLockResponse, ParkingBay } from '../models/inventory.model';

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

  // 2. 15-Minute Distributed Mutex Lock
  lockUnit(unitId: number, user_name = 'Current User'): Observable<UnitLockResponse> {
    return this.http.post<UnitLockResponse>(`${this.baseUrl}/units/${unitId}/lock`, {
      user_id: 1,
      user_name: user_name
    });
  }

  // 3. Unlock Unit
  unlockUnit(unitId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/units/${unitId}/unlock`, {});
  }

  // 4. Parking Bays
  getParkingBays(projectId?: number): Observable<ParkingBay[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<ParkingBay[]>(`${this.baseUrl}/parking-bays`, { params });
  }

  // 5. Connect Real-Time WebSocket
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
        // Automatic reconnection retry after 3 seconds
        setTimeout(() => this.connectLiveMatrix(), 3000);
      };
    } catch {
      // Graceful fallback if WS endpoint not available
    }
  }

  disconnectLiveMatrix(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }
}
