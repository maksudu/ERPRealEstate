import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  aging_buckets?: {
    bucket_1_30_days: number;
    bucket_31_60_days: number;
    bucket_61_90_days: number;
    bucket_90_plus_days: number;
  };
}

export interface CollectionDashboardMetrics {
  today_collection: number;
  monthly_collection: number;
  monthly_target: number;
  collection_achievement_percentage: number;
  total_overdue: number;
  pending_receipts_count: number;
  currency: string;
  last_updated: string;
}

export interface CollectionPaymentItem {
  id?: number;
  receipt_number?: string;
  customer_id?: number;
  customer_name: string;
  customer_phone: string;
  project_name: string;
  unit_number: string;
  booking_number: string;
  amount: number;
  payment_mode: string;
  transaction_ref?: string;
  cheque_number?: string;
  bank_name?: string;
  payment_date: string;
  collection_officer: string;
  posting_status?: string;
  verification_notes?: string;
  verified_by?: string;
  created_at?: string;
}

export interface CollectionCustomerItem {
  id?: number;
  customer_name: string;
  phone: string;
  email?: string;
  project_name: string;
  unit_number: string;
  booking_number: string;
  total_sales_value: number;
  total_paid: number;
  total_due: number;
  overdue_amount: number;
  loan_status: string;
  collector_assigned: string;
  created_at?: string;
}

export interface CollectionScheduleItem {
  id?: number;
  customer_id?: number;
  customer_name: string;
  project_name: string;
  unit_number: string;
  booking_number: string;
  installment_name: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
  late_fee: number;
  created_at?: string;
}

export interface CollectionLedgerItem {
  id?: number;
  customer_id?: number;
  customer_name: string;
  booking_number: string;
  tx_date: string;
  tx_type: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  receipt_ref?: string;
  created_at?: string;
}

export interface CollectionBankLoanItem {
  id?: number;
  customer_id?: number;
  customer_name: string;
  phone: string;
  project_name: string;
  unit_number: string;
  booking_number: string;
  bank_name: string;
  sanction_amount: number;
  disbursed_amount: number;
  pending_disbursement: number;
  sanction_date?: string;
  disbursement_status: string;
  officer_name: string;
  remarks?: string;
  created_at?: string;
}

export interface CollectionWorkflowItem {
  id?: number;
  workflow_code?: string;
  request_type: string;
  customer_name: string;
  booking_number: string;
  requested_amount: number;
  requested_by: string;
  approver_name?: string;
  status?: string;
  notes?: string;
  created_at?: string;
}

export interface CollectionReceiptDetail {
  id: number;
  receipt_number: string;
  company_name: string;
  company_address: string;
  hotline: string;
  customer_name: string;
  customer_phone: string;
  project_name: string;
  unit_number: string;
  booking_number: string;
  amount: number;
  amount_in_words: string;
  payment_mode: string;
  transaction_ref?: string;
  cheque_number?: string;
  bank_name?: string;
  payment_date: string;
  collection_officer: string;
  posting_status: string;
  qr_verification_code: string;
  issued_at: string;
}

export interface CollectionReportsData {
  daily_collections: { date: string; amount: number; receipt_count: number }[];
  collector_performance: { officer_name: string; target: number; collected: number; recovery_percentage: number }[];
  project_wise_summaries: { project_name: string; target: number; collected: number; overdue: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class MobileCollectionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/mobile-collection`;

  // 1. Dashboard Metrics
  getDashboardMetrics(): Observable<CollectionDashboardMetrics> {
    return this.http.get<CollectionDashboardMetrics>(`${this.apiUrl}/dashboard/metrics`);
  }

  // 2. Customers
  getCustomers(params?: { search?: string; project?: string; limit?: number; offset?: number }): Observable<PaginatedResult<CollectionCustomerItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.project) p = p.set('project', params.project);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<CollectionCustomerItem>>(`${this.apiUrl}/customers`, { params: p });
  }

  createCustomer(data: Partial<CollectionCustomerItem>): Observable<CollectionCustomerItem> {
    return this.http.post<CollectionCustomerItem>(`${this.apiUrl}/customers`, data);
  }

  updateCustomer(id: number, data: Partial<CollectionCustomerItem>): Observable<CollectionCustomerItem> {
    return this.http.put<CollectionCustomerItem>(`${this.apiUrl}/customers/${id}`, data);
  }

  deleteCustomer(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/customers/${id}`);
  }

  // 3. Installment Schedules
  getSchedules(params?: { search?: string; status?: string; booking_number?: string; limit?: number; offset?: number }): Observable<PaginatedResult<CollectionScheduleItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.booking_number) p = p.set('booking_number', params.booking_number);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<CollectionScheduleItem>>(`${this.apiUrl}/schedules`, { params: p });
  }

  createSchedule(data: Partial<CollectionScheduleItem>): Observable<CollectionScheduleItem> {
    return this.http.post<CollectionScheduleItem>(`${this.apiUrl}/schedules`, data);
  }

  updateSchedule(id: number, data: Partial<CollectionScheduleItem>): Observable<CollectionScheduleItem> {
    return this.http.put<CollectionScheduleItem>(`${this.apiUrl}/schedules/${id}`, data);
  }

  deleteSchedule(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/schedules/${id}`);
  }

  // 4. Due & Overdue
  getDueOverdue(params?: { search?: string; limit?: number; offset?: number }): Observable<PaginatedResult<CollectionScheduleItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<CollectionScheduleItem>>(`${this.apiUrl}/due-overdue`, { params: p });
  }

  sendPaymentReminder(scheduleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/due-overdue/${scheduleId}/send-reminder`, {});
  }

  // 5. Payment Entry
  getPayments(params?: { search?: string; posting_status?: string; payment_mode?: string; limit?: number; offset?: number }): Observable<PaginatedResult<CollectionPaymentItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.posting_status) p = p.set('posting_status', params.posting_status);
    if (params?.payment_mode) p = p.set('payment_mode', params.payment_mode);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<CollectionPaymentItem>>(`${this.apiUrl}/payments`, { params: p });
  }

  createPayment(data: Partial<CollectionPaymentItem>): Observable<CollectionPaymentItem> {
    return this.http.post<CollectionPaymentItem>(`${this.apiUrl}/payments`, data);
  }

  updatePayment(id: number, data: Partial<CollectionPaymentItem>): Observable<CollectionPaymentItem> {
    return this.http.put<CollectionPaymentItem>(`${this.apiUrl}/payments/${id}`, data);
  }

  deletePayment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/payments/${id}`);
  }

  // 6. Receipts
  getReceiptDetails(id: number): Observable<CollectionReceiptDetail> {
    return this.http.get<CollectionReceiptDetail>(`${this.apiUrl}/receipts/${id}`);
  }

  // 7. Customer Ledger
  getLedger(params?: { search?: string; booking_number?: string; limit?: number; offset?: number }): Observable<PaginatedResult<CollectionLedgerItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.booking_number) p = p.set('booking_number', params.booking_number);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<CollectionLedgerItem>>(`${this.apiUrl}/ledger`, { params: p });
  }

  createLedgerEntry(data: Partial<CollectionLedgerItem>): Observable<CollectionLedgerItem> {
    return this.http.post<CollectionLedgerItem>(`${this.apiUrl}/ledger`, data);
  }

  // 8. Bank Loans
  getBankLoans(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<CollectionBankLoanItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<CollectionBankLoanItem>>(`${this.apiUrl}/bank-loans`, { params: p });
  }

  createBankLoan(data: Partial<CollectionBankLoanItem>): Observable<CollectionBankLoanItem> {
    return this.http.post<CollectionBankLoanItem>(`${this.apiUrl}/bank-loans`, data);
  }

  updateBankLoan(id: number, data: Partial<CollectionBankLoanItem>): Observable<CollectionBankLoanItem> {
    return this.http.put<CollectionBankLoanItem>(`${this.apiUrl}/bank-loans/${id}`, data);
  }

  deleteBankLoan(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/bank-loans/${id}`);
  }

  // 9. Workflows (Approvals, Waivers, Refunds)
  getWorkflows(params?: { search?: string; status?: string; limit?: number; offset?: number }): Observable<PaginatedResult<CollectionWorkflowItem>> {
    let p = new HttpParams();
    if (params?.search) p = p.set('search', params.search);
    if (params?.status) p = p.set('status', params.status);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<PaginatedResult<CollectionWorkflowItem>>(`${this.apiUrl}/workflows`, { params: p });
  }

  createWorkflowRequest(data: Partial<CollectionWorkflowItem>): Observable<CollectionWorkflowItem> {
    return this.http.post<CollectionWorkflowItem>(`${this.apiUrl}/workflows`, data);
  }

  actionWorkflow(id: number, actionData: { status: string; approver_name: string; notes?: string }): Observable<CollectionWorkflowItem> {
    return this.http.put<CollectionWorkflowItem>(`${this.apiUrl}/workflows/${id}`, actionData);
  }

  // 10. Reports Summary
  getReportsSummary(): Observable<CollectionReportsData> {
    return this.http.get<CollectionReportsData>(`${this.apiUrl}/reports/summary`);
  }

  // 11. Auth Session
  getAuthSession(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/session`);
  }
}
