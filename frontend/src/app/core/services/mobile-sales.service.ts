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

export interface MobileSalesDashboardKpis {
  total_leads: number;
  new_leads: number;
  follow_ups: number;
  site_visits: number;
  total_bookings: number;
  conversions: number;
  conversion_rate_percentage: number;
  total_quotations: number;
  pending_approvals: number;
  active_available_units: number;
}

export interface MobileLeadItem {
  id: number;
  lead_code: string;
  lead_name: string;
  phone: string;
  email?: string;
  lead_source: string;
  status: string;
  assigned_sales_rep_name?: string;
  interested_project?: string;
  budget_bdt?: number;
  notes?: string;
  created_at?: string;
}

export interface MobileCustomerItem {
  id: number;
  customer_code: string;
  full_name: string;
  phone: string;
  email?: string;
  nid_number?: string;
  present_address?: string;
  requirements?: string;
  interaction_history?: string;
  status: string;
  created_at?: string;
}

export interface MobilePropertyItem {
  id: number;
  project_name: string;
  location: string;
  tower_name: string;
  floor_no: string;
  unit_number: string;
  size_sqft: number;
  unit_type: string;
  parking_slots: number;
  price_per_sqft: number;
  total_price: number;
  availability_status: string;
  apartment_plans_url?: string;
}

export interface MobileQuotationItem {
  id: number;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  project_name: string;
  unit_number: string;
  size_sqft: number;
  rate_per_sqft: number;
  base_price: number;
  parking_charge: number;
  utility_charge: number;
  discount_percent: number;
  discount_amount: number;
  net_payable: number;
  validity_date?: string;
  status: string;
  pdf_url?: string;
  created_at?: string;
}

export interface MobileSiteVisitItem {
  id: number;
  visit_code: string;
  customer_name: string;
  customer_phone: string;
  project_name: string;
  unit_number?: string;
  sales_executive: string;
  scheduled_at: string;
  status: string;
  feedback?: string;
  follow_up_date?: string;
  reminder_sent: boolean;
}

export interface MobileBookingItem {
  id: number;
  booking_no: string;
  customer_name: string;
  customer_phone: string;
  project_name: string;
  unit_number: string;
  booking_date: string;
  reservation_status: string;
  booking_amount: number;
  installment_plan_months: number;
  documents_count: number;
  notes?: string;
  created_at?: string;
}

export interface MobileApprovalItem {
  id: number;
  approval_code: string;
  request_type: string;
  reference_code: string;
  requested_by: string;
  amount_involved: number;
  status: string;
  remarks?: string;
  approved_by?: string;
  decided_at?: string;
  created_at?: string;
}

export interface MobileNotificationItem {
  id: number;
  notification_code: string;
  title: string;
  notification_type: string;
  message: string;
  is_read: boolean;
  recipient_name: string;
  created_at?: string;
}

export interface MobileAuthSession {
  user_id: number;
  username: string;
  full_name: string;
  role_code: string;
  role_name: string;
  assigned_projects: string[];
  permissions: string[];
  access_token: string;
  token_type: string;
  expires_in_hours: number;
}

@Injectable({
  providedIn: 'root'
})
export class MobileSalesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/mobile-sales`;

  // 1. Dashboard
  getDashboardKpis(): Observable<MobileSalesDashboardKpis> {
    return this.http.get<MobileSalesDashboardKpis>(`${this.apiUrl}/dashboard/kpis`);
  }

  // 2. Leads
  getLeads(params?: { search?: string; status?: string; lead_source?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileLeadItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.lead_source) p = p.set('lead_source', params.lead_source);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileLeadItem>>(`${this.apiUrl}/leads`, { params: p });
  }

  createLead(data: Partial<MobileLeadItem>): Observable<MobileLeadItem> {
    return this.http.post<MobileLeadItem>(`${this.apiUrl}/leads`, data);
  }

  updateLead(id: number, data: Partial<MobileLeadItem>): Observable<MobileLeadItem> {
    return this.http.put<MobileLeadItem>(`${this.apiUrl}/leads/${id}`, data);
  }

  deleteLead(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/leads/${id}`);
  }

  // 3. Customers
  getCustomers(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileCustomerItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileCustomerItem>>(`${this.apiUrl}/customers`, { params: p });
  }

  createCustomer(data: Partial<MobileCustomerItem>): Observable<MobileCustomerItem> {
    return this.http.post<MobileCustomerItem>(`${this.apiUrl}/customers`, data);
  }

  updateCustomer(id: number, data: Partial<MobileCustomerItem>): Observable<MobileCustomerItem> {
    return this.http.put<MobileCustomerItem>(`${this.apiUrl}/customers/${id}`, data);
  }

  deleteCustomer(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/customers/${id}`);
  }

  // 4. Properties & Real-time availability
  getProperties(params?: { search?: string; availability?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobilePropertyItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.availability) p = p.set('availability', params.availability);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobilePropertyItem>>(`${this.apiUrl}/properties`, { params: p });
  }

  createProperty(data: Partial<MobilePropertyItem>): Observable<MobilePropertyItem> {
    return this.http.post<MobilePropertyItem>(`${this.apiUrl}/properties`, data);
  }

  updateProperty(id: number, data: Partial<MobilePropertyItem>): Observable<MobilePropertyItem> {
    return this.http.put<MobilePropertyItem>(`${this.apiUrl}/properties/${id}`, data);
  }

  deleteProperty(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/properties/${id}`);
  }

  // 5. Quotations
  getQuotations(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileQuotationItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileQuotationItem>>(`${this.apiUrl}/quotations`, { params: p });
  }

  createQuotation(data: Partial<MobileQuotationItem>): Observable<MobileQuotationItem> {
    return this.http.post<MobileQuotationItem>(`${this.apiUrl}/quotations`, data);
  }

  updateQuotation(id: number, data: Partial<MobileQuotationItem>): Observable<MobileQuotationItem> {
    return this.http.put<MobileQuotationItem>(`${this.apiUrl}/quotations/${id}`, data);
  }

  deleteQuotation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/quotations/${id}`);
  }

  // 6. Site Visits
  getSiteVisits(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileSiteVisitItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileSiteVisitItem>>(`${this.apiUrl}/site-visits`, { params: p });
  }

  createSiteVisit(data: Partial<MobileSiteVisitItem>): Observable<MobileSiteVisitItem> {
    return this.http.post<MobileSiteVisitItem>(`${this.apiUrl}/site-visits`, data);
  }

  updateSiteVisit(id: number, data: Partial<MobileSiteVisitItem>): Observable<MobileSiteVisitItem> {
    return this.http.put<MobileSiteVisitItem>(`${this.apiUrl}/site-visits/${id}`, data);
  }

  deleteSiteVisit(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/site-visits/${id}`);
  }

  // 7. Bookings
  getBookings(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileBookingItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileBookingItem>>(`${this.apiUrl}/bookings`, { params: p });
  }

  createBooking(data: Partial<MobileBookingItem>): Observable<MobileBookingItem> {
    return this.http.post<MobileBookingItem>(`${this.apiUrl}/bookings`, data);
  }

  updateBooking(id: number, data: Partial<MobileBookingItem>): Observable<MobileBookingItem> {
    return this.http.put<MobileBookingItem>(`${this.apiUrl}/bookings/${id}`, data);
  }

  deleteBooking(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/bookings/${id}`);
  }

  // 8. Approvals
  getApprovals(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<MobileApprovalItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileApprovalItem>>(`${this.apiUrl}/approvals`, { params: p });
  }

  createApproval(data: Partial<MobileApprovalItem>): Observable<MobileApprovalItem> {
    return this.http.post<MobileApprovalItem>(`${this.apiUrl}/approvals`, data);
  }

  updateApproval(id: number, data: Partial<MobileApprovalItem>): Observable<MobileApprovalItem> {
    return this.http.put<MobileApprovalItem>(`${this.apiUrl}/approvals/${id}`, data);
  }

  deleteApproval(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/approvals/${id}`);
  }

  // 9. Notifications
  getNotifications(params?: { search?: string; is_read?: boolean; limit?: number; offset?: number }): Observable<PaginatedResult<MobileNotificationItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.is_read !== undefined) p = p.set('is_read', params.is_read ? 'true' : 'false');
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<MobileNotificationItem>>(`${this.apiUrl}/notifications`, { params: p });
  }

  createNotification(data: Partial<MobileNotificationItem>): Observable<MobileNotificationItem> {
    return this.http.post<MobileNotificationItem>(`${this.apiUrl}/notifications`, data);
  }

  markNotificationRead(id: number): Observable<MobileNotificationItem> {
    return this.http.put<MobileNotificationItem>(`${this.apiUrl}/notifications/${id}/read`, {});
  }

  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notifications/${id}`);
  }

  // 10. Auth Session
  getAuthSession(): Observable<MobileAuthSession> {
    return this.http.get<MobileAuthSession>(`${this.apiUrl}/auth/session`);
  }
}
