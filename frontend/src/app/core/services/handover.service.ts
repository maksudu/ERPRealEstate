import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  HandoverInspection,
  DLPTicket,
  OwnersAssociation,
  LeaseAgreement
} from '../models/handover.model';

@Injectable({
  providedIn: 'root'
})
export class HandoverService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/handover`;

  // 1. Handover Inspections & Key Possession
  getInspections(filters?: { booking_id?: number; status_filter?: string }): Observable<HandoverInspection[]> {
    let params = new HttpParams();
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    return this.http.get<HandoverInspection[]>(`${this.baseUrl}/inspections`, { params });
  }

  createInspection(payload: any): Observable<HandoverInspection> {
    return this.http.post<HandoverInspection>(`${this.baseUrl}/inspections`, payload);
  }

  executeHandover(inspectionId: number, payload: { possession_handover_date: string; notes?: string }): Observable<HandoverInspection> {
    return this.http.patch<HandoverInspection>(`${this.baseUrl}/inspections/${inspectionId}/handover`, payload);
  }

  // 2. DLP Snagging Warranty Tickets
  getDLPTickets(filters?: { unit_id?: number; status_filter?: string; category_filter?: string }): Observable<DLPTicket[]> {
    let params = new HttpParams();
    if (filters?.unit_id) params = params.set('unit_id', filters.unit_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.category_filter) params = params.set('category_filter', filters.category_filter);
    return this.http.get<DLPTicket[]>(`${this.baseUrl}/dlp-tickets`, { params });
  }

  createDLPTicket(payload: any): Observable<DLPTicket> {
    return this.http.post<DLPTicket>(`${this.baseUrl}/dlp-tickets`, payload);
  }

  updateDLPTicketStatus(ticketId: number, payload: { status: string; rectification_notes?: string; rectified_date?: string }): Observable<DLPTicket> {
    return this.http.patch<DLPTicket>(`${this.baseUrl}/dlp-tickets/${ticketId}/status`, payload);
  }

  // 3. Owners Association (কল্যাণ সমিতি)
  getAssociations(projectId?: number): Observable<OwnersAssociation[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<OwnersAssociation[]>(`${this.baseUrl}/associations`, { params });
  }

  createAssociation(payload: any): Observable<OwnersAssociation> {
    return this.http.post<OwnersAssociation>(`${this.baseUrl}/associations`, payload);
  }

  // 4. Commercial & Residential Leases
  getLeases(unitId?: number): Observable<LeaseAgreement[]> {
    let params = new HttpParams();
    if (unitId) params = params.set('unit_id', unitId);
    return this.http.get<LeaseAgreement[]>(`${this.baseUrl}/leases`, { params });
  }

  createLease(payload: any): Observable<LeaseAgreement> {
    return this.http.post<LeaseAgreement>(`${this.baseUrl}/leases`, payload);
  }
}
