import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CustomerPortalOverview,
  ConstructionUpdate,
  CustomerPaymentLedgerItem,
  CustomerInstallmentTimelineItem,
  CustomerServiceTicket,
  OnlinePaymentCheckoutResponse,
  OnlinePaymentVerificationResponse
} from '../models/portal.model';

@Injectable({
  providedIn: 'root'
})
export class PortalService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/portal`;

  // 1. Consolidated Dashboard Overview
  getOverview(customerId?: number, bookingId?: number): Observable<CustomerPortalOverview> {
    let params = new HttpParams();
    if (customerId) params = params.set('customer_id', customerId.toString());
    if (bookingId) params = params.set('booking_id', bookingId.toString());
    return this.http.get<CustomerPortalOverview>(`${this.baseUrl}/overview`, { params });
  }

  // 2. Weekly Construction Progress Photo Gallery
  getConstructionUpdates(projectId?: number): Observable<ConstructionUpdate[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId.toString());
    return this.http.get<ConstructionUpdate[]>(`${this.baseUrl}/updates`, { params });
  }

  createConstructionUpdate(payload: Partial<ConstructionUpdate>, engineerId?: number): Observable<ConstructionUpdate> {
    let params = new HttpParams();
    if (engineerId) params = params.set('engineer_id', engineerId.toString());
    return this.http.post<ConstructionUpdate>(`${this.baseUrl}/updates`, payload, { params });
  }

  // 3. Financial Ledger & Receipts
  getPaymentLedger(bookingId: number): Observable<CustomerPaymentLedgerItem[]> {
    const params = new HttpParams().set('booking_id', bookingId.toString());
    return this.http.get<CustomerPaymentLedgerItem[]>(`${this.baseUrl}/ledger`, { params });
  }

  getInstallmentTimeline(bookingId: number): Observable<CustomerInstallmentTimelineItem[]> {
    const params = new HttpParams().set('booking_id', bookingId.toString());
    return this.http.get<CustomerInstallmentTimelineItem[]>(`${this.baseUrl}/installments`, { params });
  }

  downloadReceiptPdf(receiptId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/receipts/${receiptId}/pdf`, { responseType: 'blob' });
  }

  // 4. Service & Maintenance Tickets
  createTicket(payload: {
    booking_id: number;
    category: string;
    title: string;
    description: string;
    location_in_unit?: string;
    urgency?: string;
    attachment_photo_url?: string;
  }, customerId?: number): Observable<CustomerServiceTicket> {
    let params = new HttpParams();
    if (customerId) params = params.set('customer_id', customerId.toString());
    return this.http.post<CustomerServiceTicket>(`${this.baseUrl}/tickets`, payload, { params });
  }

  getTickets(customerId?: number): Observable<CustomerServiceTicket[]> {
    let params = new HttpParams();
    if (customerId) params = params.set('customer_id', customerId.toString());
    return this.http.get<CustomerServiceTicket[]>(`${this.baseUrl}/tickets`, { params });
  }

  updateTicket(ticketId: number, payload: Partial<CustomerServiceTicket>): Observable<CustomerServiceTicket> {
    return this.http.patch<CustomerServiceTicket>(`${this.baseUrl}/tickets/${ticketId}`, payload);
  }

  // 5. Digital Payment Gateway Integration
  initiateCheckout(payload: {
    booking_id: number;
    installment_id: number;
    payment_gateway: string;
    payer_mobile?: string;
  }, customerId?: number): Observable<OnlinePaymentCheckoutResponse> {
    let params = new HttpParams();
    if (customerId) params = params.set('customer_id', customerId.toString());
    return this.http.post<OnlinePaymentCheckoutResponse>(`${this.baseUrl}/payments/checkout`, payload, { params });
  }

  verifyPayment(payload: {
    transaction_reference: string;
    gateway_transaction_id: string;
    simulated_success: boolean;
  }): Observable<OnlinePaymentVerificationResponse> {
    return this.http.post<OnlinePaymentVerificationResponse>(`${this.baseUrl}/payments/verify`, payload);
  }
}
