import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Booking,
  BookingCancellation,
  UnitTransfer,
  SalesMetrics
} from '../models/sales.model';

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/sales`;

  // 1. Bookings Master
  getBookings(filters?: { project_id?: number; status?: string; search?: string; discount_status?: string }): Observable<Booking[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.discount_status) params = params.set('discount_status', filters.discount_status);
    return this.http.get<Booking[]>(`${this.baseUrl}/bookings`, { params });
  }

  createBooking(payload: any): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings`, payload);
  }

  // 2. Multi-Level Discount Approvals
  getPendingDiscountApprovals(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.baseUrl}/discounts/pending`);
  }

  processDiscountAction(bookingId: number, payload: { decision: string; approval_notes?: string; biometric_token?: string }): Observable<Booking> {
    return this.http.put<Booking>(`${this.baseUrl}/discounts/${bookingId}/action`, payload);
  }

  // 3. WeasyPrint Bilingual Deed PDF Download
  downloadDeedPdf(bookingId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/bookings/${bookingId}/deed-pdf`, {
      responseType: 'blob'
    });
  }

  // 4. Cancellations
  getCancellations(): Observable<BookingCancellation[]> {
    return this.http.get<BookingCancellation[]>(`${this.baseUrl}/cancellations`);
  }

  createCancellation(payload: any): Observable<BookingCancellation> {
    return this.http.post<BookingCancellation>(`${this.baseUrl}/cancellations`, payload);
  }

  // 5. Unit Transfers
  processTransfer(payload: any): Observable<UnitTransfer> {
    return this.http.post<UnitTransfer>(`${this.baseUrl}/transfers`, payload);
  }

  // 6. Metrics
  getSalesMetrics(): Observable<SalesMetrics> {
    return this.http.get<SalesMetrics>(`${this.baseUrl}/metrics`);
  }
}
