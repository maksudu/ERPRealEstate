import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  HandoverInspection,
  SnagItem,
  DLPTicket,
  OwnersAssociation,
  LeaseAgreement,
  CAMBill,
  UtilitySubMeterReading,
  HandoverDashboardMetrics
} from '../models/handover.model';

@Injectable({
  providedIn: 'root'
})
export class HandoverService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/handover`;

  // 0. Dashboard Metrics
  getMetrics(): Observable<HandoverDashboardMetrics> {
    return this.http.get<HandoverDashboardMetrics>(`${this.baseUrl}/metrics`);
  }

  // 1. Digital Snag List
  getSnags(filters?: {
    inspection_id?: number;
    unit_id?: number;
    category?: string;
    status_filter?: string;
    severity?: string;
  }): Observable<SnagItem[]> {
    let params = new HttpParams();
    if (filters?.inspection_id) params = params.set('inspection_id', filters.inspection_id);
    if (filters?.unit_id) params = params.set('unit_id', filters.unit_id);
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.severity) params = params.set('severity', filters.severity);
    return this.http.get<SnagItem[]>(`${this.baseUrl}/snags`, { params });
  }

  createSnag(payload: any): Observable<SnagItem> {
    return this.http.post<SnagItem>(`${this.baseUrl}/snags`, payload);
  }

  updateSnag(snagId: number, payload: any): Observable<SnagItem> {
    return this.http.patch<SnagItem>(`${this.baseUrl}/snags/${snagId}`, payload);
  }

  // 2. Handover Inspections & Key Possession
  getInspections(filters?: { booking_id?: number; status_filter?: string }): Observable<HandoverInspection[]> {
    let params = new HttpParams();
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    return this.http.get<HandoverInspection[]>(`${this.baseUrl}/inspections`, { params });
  }

  createInspection(payload: any): Observable<HandoverInspection> {
    return this.http.post<HandoverInspection>(`${this.baseUrl}/inspections`, payload);
  }

  executeHandover(
    inspectionId: number,
    payload: {
      possession_handover_date: string;
      key_sets_count?: number;
      joint_customer_signoff?: boolean;
      notes?: string;
    }
  ): Observable<HandoverInspection> {
    return this.http.patch<HandoverInspection>(`${this.baseUrl}/inspections/${inspectionId}/handover`, payload);
  }

  getPossessionLetterUrl(inspectionId: number): string {
    return `${this.baseUrl}/inspections/${inspectionId}/possession-letter`;
  }

  // 3. DLP Snagging Warranty Tickets
  getDLPTickets(filters?: {
    unit_id?: number;
    status_filter?: string;
    category_filter?: string;
    severity_filter?: string;
  }): Observable<DLPTicket[]> {
    let params = new HttpParams();
    if (filters?.unit_id) params = params.set('unit_id', filters.unit_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.category_filter) params = params.set('category_filter', filters.category_filter);
    if (filters?.severity_filter) params = params.set('severity_filter', filters.severity_filter);
    return this.http.get<DLPTicket[]>(`${this.baseUrl}/dlp-tickets`, { params });
  }

  createDLPTicket(payload: any): Observable<DLPTicket> {
    return this.http.post<DLPTicket>(`${this.baseUrl}/dlp-tickets`, payload);
  }

  updateDLPTicketStatus(
    ticketId: number,
    payload: {
      status: string;
      rectification_notes?: string;
      rectified_date?: string;
      resolution_cost_bdt?: number;
      sla_breach_status?: string;
    }
  ): Observable<DLPTicket> {
    return this.http.patch<DLPTicket>(`${this.baseUrl}/dlp-tickets/${ticketId}/status`, payload);
  }

  // 4. Commercial Space & Shop Rental/Leasing Engine
  getLeases(filters?: {
    unit_id?: number;
    status_filter?: string;
    space_type?: string;
  }): Observable<LeaseAgreement[]> {
    let params = new HttpParams();
    if (filters?.unit_id) params = params.set('unit_id', filters.unit_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.space_type) params = params.set('space_type', filters.space_type);
    return this.http.get<LeaseAgreement[]>(`${this.baseUrl}/leases`, { params });
  }

  createLease(payload: any): Observable<LeaseAgreement> {
    return this.http.post<LeaseAgreement>(`${this.baseUrl}/leases`, payload);
  }

  // 5. Monthly CAM Service Charge Billing
  getCAMBills(filters?: {
    lease_id?: number;
    bill_month?: string;
    payment_status?: string;
  }): Observable<CAMBill[]> {
    let params = new HttpParams();
    if (filters?.lease_id) params = params.set('lease_id', filters.lease_id);
    if (filters?.bill_month) params = params.set('bill_month', filters.bill_month);
    if (filters?.payment_status) params = params.set('payment_status', filters.payment_status);
    return this.http.get<CAMBill[]>(`${this.baseUrl}/cam-bills`, { params });
  }

  generateCAMBill(payload: any): Observable<CAMBill> {
    return this.http.post<CAMBill>(`${this.baseUrl}/cam-bills`, payload);
  }

  payCAMBill(billId: number, payload: any): Observable<CAMBill> {
    return this.http.post<CAMBill>(`${this.baseUrl}/cam-bills/${billId}/pay`, payload);
  }

  // 6. Utility Sub-Meter Readings
  getUtilityReadings(filters?: {
    lease_id?: number;
    meter_type?: string;
  }): Observable<UtilitySubMeterReading[]> {
    let params = new HttpParams();
    if (filters?.lease_id) params = params.set('lease_id', filters.lease_id);
    if (filters?.meter_type) params = params.set('meter_type', filters.meter_type);
    return this.http.get<UtilitySubMeterReading[]>(`${this.baseUrl}/utility-readings`, { params });
  }

  recordUtilityReading(payload: any): Observable<UtilitySubMeterReading> {
    return this.http.post<UtilitySubMeterReading>(`${this.baseUrl}/utility-readings`, payload);
  }

  // 7. Owners Association (কল্যাণ সমিতি)
  getAssociations(projectId?: number): Observable<OwnersAssociation[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<OwnersAssociation[]>(`${this.baseUrl}/associations`, { params });
  }

  createAssociation(payload: any): Observable<OwnersAssociation> {
    return this.http.post<OwnersAssociation>(`${this.baseUrl}/associations`, payload);
  }
}
