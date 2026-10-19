import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Unit, UnitLockResponse, ParkingBay, ParkingSlot,
  TowerStackingResponse, PriceBreakdown, UnitMergePayload,
  UnitSplitPayload, CombinationLog,
  InventoryDashboardResponse, UnitPagedResponse, UnitCreatePayload, UnitUpdatePayload, BulkUnitCreatePayload,
  PriceList, PriceListPagedResponse, PriceOverride, PriceOverridePagedResponse,
  PriceChangeAudit, PriceAuditPagedResponse, Quotation, QuotationPagedResponse, PricingCalculationResult,
  UnitReservation, ReservationPagedResponse, UnitStatusHistory, StatusHistoryPagedResponse, AvailabilitySummary,
  FacilityItem, FacilitySummary, FacilityPagedResponse, FacilityTransferLog, FacilityTransferPagedResponse,
  FacilityAssignmentPayload, FacilityTransferPayload, ProposedUnitMergePayload, ProposedUnitSplitPayload,
  CombinationLogPagedResponse,
  PropertyDocumentItem, PropertyDocumentPagedResponse, PropertyDocumentSummary,
  PropertyDocumentCreatePayload, PropertyDocumentUpdatePayload, PropertyDocumentSupersedePayload,
  PropertyDocumentApprovePayload
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

  // =============================================================
  // Spec 3.5: Unit Pricing & Price List Management APIs
  // =============================================================

  // 1. Master Price Lists
  getPriceLists(filters?: { project_id?: number; status?: string; search?: string; limit?: number; offset?: number }): Observable<PriceListPagedResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PriceListPagedResponse>(`${this.baseUrl}/pricing/price-lists`, { params });
  }

  createPriceList(payload: Partial<PriceList>): Observable<PriceList> {
    return this.http.post<PriceList>(`${this.baseUrl}/pricing/price-lists`, payload);
  }

  updatePriceList(id: number, payload: Partial<PriceList>): Observable<PriceList> {
    return this.http.put<PriceList>(`${this.baseUrl}/pricing/price-lists/${id}`, payload);
  }

  approvePriceList(id: number, approverName: string = 'Managing Director'): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/pricing/price-lists/${id}/approve`, {}, {
      params: new HttpParams().set('approver_name', approverName)
    });
  }

  activatePriceList(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/pricing/price-lists/${id}/activate`, {});
  }

  // 2. Unit-Level Negotiated Price Overrides
  getPriceOverrides(filters?: { project_id?: number; status?: string; search?: string; limit?: number; offset?: number }): Observable<PriceOverridePagedResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PriceOverridePagedResponse>(`${this.baseUrl}/pricing/overrides`, { params });
  }

  createPriceOverride(payload: Partial<PriceOverride>): Observable<PriceOverride> {
    return this.http.post<PriceOverride>(`${this.baseUrl}/pricing/overrides`, payload);
  }

  updatePriceOverrideStatus(id: number, status: 'APPROVED' | 'REJECTED', approvedBy: string, remarks?: string): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/pricing/overrides/${id}/status`, {
      status,
      approved_by: approvedBy,
      remarks
    });
  }

  // 3. Historical Price Records & Audit Logs
  getPriceAudits(filters?: { project_id?: number; unit_id?: number; limit?: number; offset?: number }): Observable<PriceAuditPagedResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.unit_id) params = params.set('unit_id', filters.unit_id);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PriceAuditPagedResponse>(`${this.baseUrl}/pricing/audits`, { params });
  }

  // 4. Illustrative Apartment Calculator API
  calculatePrice(payload: { chargeable_area_sqft: number; price_per_sqft: number; parking_price: number; discount_pct: number; utility_fee?: number }): Observable<PricingCalculationResult> {
    return this.http.post<PricingCalculationResult>(`${this.baseUrl}/pricing/calculate`, payload);
  }

  // 5. Formal Quotation Generation
  getQuotations(filters?: { project_id?: number; search?: string; limit?: number; offset?: number }): Observable<QuotationPagedResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<QuotationPagedResponse>(`${this.baseUrl}/pricing/quotations`, { params });
  }

  createQuotation(payload: Partial<Quotation> & { validity_days?: number }): Observable<Quotation> {
    return this.http.post<Quotation>(`${this.baseUrl}/pricing/quotations`, payload);
  }

  // =============================================================
  // Spec 3.6: Real-Time Unit Availability & State Machine APIs
  // =============================================================

  // 1. Consolidated State Machine KPI Summary
  getAvailabilitySummary(projectId?: number): Observable<AvailabilitySummary> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<AvailabilitySummary>(`${this.baseUrl}/availability/summary`, { params });
  }

  // 2. Concurrency-Controlled Unit Reservation (Row-Level Lock)
  createAvailabilityReservation(payload: {
    unit_id: number;
    customer_name: string;
    customer_phone: string;
    customer_nid_passport?: string;
    sales_agent_name?: string;
    duration_minutes: number;
    hold_deposit_amount?: number;
    conditions?: string;
  }): Observable<UnitReservation> {
    return this.http.post<UnitReservation>(`${this.baseUrl}/availability/reserve`, payload);
  }

  // 3. Authorized Release Workflow
  releaseAvailabilityReservation(reservationId: number, payload: { reason: string; released_by?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/availability/reservations/${reservationId}/release`, payload);
  }

  // 4. Batch Auto-Release Expired Holds
  releaseExpiredReservations(): Observable<{ success: boolean; released_count: number; message: string }> {
    return this.http.post<{ success: boolean; released_count: number; message: string }>(`${this.baseUrl}/availability/release-expired`, {});
  }

  // 5. Controlled State Machine Transition
  transitionUnitStatus(payload: {
    unit_id: number;
    to_status: string;
    transition_type?: string;
    initiated_by: string;
    authorized_by?: string;
    reason?: string;
  }): Observable<{ success: boolean; unit_id: number; unit_number: string; previous_status: string; current_status: string; message: string }> {
    return this.http.post<{ success: boolean; unit_id: number; unit_number: string; previous_status: string; current_status: string; message: string }>(`${this.baseUrl}/availability/transition`, payload);
  }

  // 6. Paged Active & Historical Reservations
  getReservations(filters?: { project_id?: number; status?: string; search?: string; limit?: number; offset?: number }): Observable<ReservationPagedResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<ReservationPagedResponse>(`${this.baseUrl}/availability/reservations`, { params });
  }

  // 7. Immutable State Transition History Log
  getStatusHistory(filters?: { project_id?: number; unit_id?: number; search?: string; limit?: number; offset?: number }): Observable<StatusHistoryPagedResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.unit_id) params = params.set('unit_id', filters.unit_id);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<StatusHistoryPagedResponse>(`${this.baseUrl}/availability/history`, { params });
  }

  // 8. Facilities & Parking Allocation API (Spec 3.7)
  getFacilitySummary(projectId?: number): Observable<FacilitySummary> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<FacilitySummary>(`${this.baseUrl}/facilities/summary`, { params });
  }

  getFacilitiesPaged(filters?: {
    project_id?: number;
    facility_category?: string;
    facility_type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<FacilityPagedResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.facility_category && filters.facility_category !== 'ALL') params = params.set('facility_category', filters.facility_category);
    if (filters?.facility_type && filters.facility_type !== 'ALL') params = params.set('facility_type', filters.facility_type);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<FacilityPagedResponse>(`${this.baseUrl}/facilities`, { params });
  }

  createFacility(payload: Partial<FacilityItem>): Observable<{ success: boolean; message: string; facility_id: number }> {
    return this.http.post<{ success: boolean; message: string; facility_id: number }>(`${this.baseUrl}/facilities`, payload);
  }

  assignFacility(facilityId: number, payload: FacilityAssignmentPayload): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/facilities/${facilityId}/assign`, payload);
  }

  releaseFacility(facilityId: number, reason?: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/facilities/${facilityId}/release`, { reason });
  }

  transferFacility(payload: FacilityTransferPayload): Observable<{ success: boolean; message: string; transfer_id: number }> {
    return this.http.post<{ success: boolean; message: string; transfer_id: number }>(`${this.baseUrl}/facilities/transfer`, payload);
  }

  getFacilityTransfers(filters?: {
    facility_id?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<FacilityTransferPagedResponse> {
    let params = new HttpParams();
    if (filters?.facility_id) params = params.set('facility_id', filters.facility_id);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<FacilityTransferPagedResponse>(`${this.baseUrl}/facilities/transfers`, { params });
  }

  // 9. Unit Combination & Subdivision Engine (Spec 3.8)
  executeUnitMergeProposal(payload: ProposedUnitMergePayload): Observable<{ success: boolean; message: string; combined_unit_id: number; combination_log_id: number }> {
    return this.http.post<{ success: boolean; message: string; combined_unit_id: number; combination_log_id: number }>(`${this.baseUrl}/facilities/combinations/merge`, payload);
  }

  executeUnitSplitProposal(payload: ProposedUnitSplitPayload): Observable<{ success: boolean; message: string; child_unit_ids: number[]; combination_log_id: number }> {
    return this.http.post<{ success: boolean; message: string; child_unit_ids: number[]; combination_log_id: number }>(`${this.baseUrl}/facilities/combinations/split`, payload);
  }

  getCombinationAuditLogs(filters?: {
    project_id?: number;
    action_type?: string;
    limit?: number;
    offset?: number;
  }): Observable<CombinationLogPagedResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.action_type && filters.action_type !== 'ALL') params = params.set('action_type', filters.action_type);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<CombinationLogPagedResponse>(`${this.baseUrl}/facilities/combinations`, { params });
  }

  // 10. Floor Plans, Property Images & Technical Documentation (Spec 3.6)
  getPropertyDocumentSummary(projectId?: number): Observable<PropertyDocumentSummary> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<PropertyDocumentSummary>(`${this.baseUrl}/documents/summary`, { params });
  }

  getPropertyDocumentsPaged(filters?: {
    project_id?: number;
    tower_id?: number;
    floor_number?: number;
    unit_id?: number;
    document_type?: string;
    visibility?: string;
    approval_status?: string;
    is_superseded?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PropertyDocumentPagedResponse> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.floor_number !== undefined && filters.floor_number !== null) params = params.set('floor_number', filters.floor_number);
    if (filters?.unit_id) params = params.set('unit_id', filters.unit_id);
    if (filters?.document_type && filters.document_type !== 'ALL') params = params.set('document_type', filters.document_type);
    if (filters?.visibility && filters.visibility !== 'ALL') params = params.set('visibility', filters.visibility);
    if (filters?.approval_status && filters.approval_status !== 'ALL') params = params.set('approval_status', filters.approval_status);
    if (filters?.is_superseded !== undefined) params = params.set('is_superseded', filters.is_superseded);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PropertyDocumentPagedResponse>(`${this.baseUrl}/documents`, { params });
  }

  createPropertyDocument(payload: PropertyDocumentCreatePayload): Observable<PropertyDocumentItem> {
    return this.http.post<PropertyDocumentItem>(`${this.baseUrl}/documents`, payload);
  }

  uploadPropertyDocument(formData: FormData): Observable<PropertyDocumentItem> {
    return this.http.post<PropertyDocumentItem>(`${this.baseUrl}/documents/upload`, formData);
  }

  updatePropertyDocument(id: number, payload: PropertyDocumentUpdatePayload): Observable<PropertyDocumentItem> {
    return this.http.put<PropertyDocumentItem>(`${this.baseUrl}/documents/${id}`, payload);
  }

  approvePropertyDocument(id: number, payload: PropertyDocumentApprovePayload): Observable<PropertyDocumentItem> {
    return this.http.post<PropertyDocumentItem>(`${this.baseUrl}/documents/${id}/approve`, payload);
  }

  supersedePropertyDocument(id: number, payload: PropertyDocumentSupersedePayload): Observable<PropertyDocumentItem> {
    return this.http.post<PropertyDocumentItem>(`${this.baseUrl}/documents/${id}/supersede`, payload);
  }

  deletePropertyDocument(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/documents/${id}`);
  }
}


