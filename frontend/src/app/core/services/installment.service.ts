import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CustomerInstallment,
  BookingInstallmentSchedule,
  PaginatedInstallmentSchedules,
  InstallmentSchedulePreviewResponse,
  InstallmentInvoiceResponse,
  PDCVaultItem,
  NI138LegalAction,
  InstallmentAlertLog,
  CustomMilestoneItem,
  InstallmentMetrics,
  MoneyReceipt,
  MoneyReceiptAllocation,
  TripartiteLoan,
  LoanTranche
} from '../models/installment.model';

@Injectable({
  providedIn: 'root'
})
export class InstallmentService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/installments`;

  // 1. Installment Schedules
  getInstallments(filters?: { booking_id?: number; status?: string }): Observable<CustomerInstallment[]> {
    let params = new HttpParams();
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<CustomerInstallment[]>(`${this.baseUrl}/schedules`, { params });
  }

  generateSchedule(payload: {
    booking_id: number;
    agreement_reference_no?: string;
    plan_type: string;
    total_installments?: number;
    start_date?: string;
    down_payment_percentage?: number;
    grace_period_days?: number;
    custom_milestones?: CustomMilestoneItem[];
    notes?: string;
  }): Observable<CustomerInstallment[]> {
    return this.http.post<CustomerInstallment[]>(`${this.baseUrl}/schedules/generate`, payload);
  }

  // Spec 5.7: Preview Amortization Schedule
  previewSchedule(payload: {
    booking_id: number;
    plan_type: string;
    total_installments?: number;
    start_date?: string;
    down_payment_percentage?: number;
    grace_period_days?: number;
    custom_milestones?: CustomMilestoneItem[];
  }): Observable<InstallmentSchedulePreviewResponse> {
    return this.http.post<InstallmentSchedulePreviewResponse>(`${this.baseUrl}/schedules/preview`, payload);
  }

  // Spec 5.7: Master Schedule Registry & Paging
  getMasterSchedules(filters?: {
    booking_id?: number;
    status?: string;
    plan_type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<BookingInstallmentSchedule[]> {
    let params = new HttpParams();
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.plan_type) params = params.set('plan_type', filters.plan_type);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<BookingInstallmentSchedule[]>(`${this.baseUrl}/schedules/master`, { params });
  }

  getMasterSchedulesPaged(filters?: {
    booking_id?: number;
    status?: string;
    plan_type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedInstallmentSchedules> {
    let params = new HttpParams();
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.plan_type) params = params.set('plan_type', filters.plan_type);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PaginatedInstallmentSchedules>(`${this.baseUrl}/schedules/paged`, { params });
  }

  getMasterScheduleDetails(scheduleId: number): Observable<BookingInstallmentSchedule> {
    return this.http.get<BookingInstallmentSchedule>(`${this.baseUrl}/schedules/master/${scheduleId}`);
  }

  getActiveScheduleByBooking(bookingId: number): Observable<BookingInstallmentSchedule> {
    return this.http.get<BookingInstallmentSchedule>(`${this.baseUrl}/schedules/master/by-booking/${bookingId}`);
  }

  amendSchedule(scheduleId: number, payload: {
    amendment_reason: string;
    amendment_reference?: string;
    plan_type: string;
    total_installments?: number;
    down_payment_percentage?: number;
    start_date?: string;
    grace_period_days?: number;
    custom_milestones?: CustomMilestoneItem[];
    notes?: string;
  }): Observable<BookingInstallmentSchedule> {
    return this.http.post<BookingInstallmentSchedule>(`${this.baseUrl}/schedules/master/${scheduleId}/amend`, payload);
  }

  generateInstallmentInvoice(installmentId: number, payload: {
    invoice_date?: string;
    due_date?: string;
    notes?: string;
  }): Observable<InstallmentInvoiceResponse> {
    return this.http.post<InstallmentInvoiceResponse>(`${this.baseUrl}/schedules/installments/${installmentId}/generate-invoice`, payload);
  }

  exportSchedulePdf(scheduleId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/schedules/master/${scheduleId}/export-pdf`, { responseType: 'blob' });
  }

  // 2. Surcharge & Late Fee Calculation Engine (Prompt 09)
  calculateOverdueSurcharges(payload?: { surcharge_percentage_monthly?: number }, bookingId?: number): Observable<any> {
    let params = new HttpParams();
    if (bookingId) params = params.set('booking_id', bookingId);
    return this.http.post<any>(`${this.baseUrl}/schedules/calculate-overdue-surcharges`, payload || {}, { params });
  }

  // 3. Multi-Channel Alert Dispatch Engine (Prompt 09)
  dispatchAlerts(payload: { installment_ids: number[]; channels: string[]; custom_message?: string }): Observable<InstallmentAlertLog[]> {
    return this.http.post<InstallmentAlertLog[]>(`${this.baseUrl}/alerts/dispatch`, payload);
  }

  getAlertLogs(filters?: { installment_id?: number; booking_id?: number; channel?: string }): Observable<InstallmentAlertLog[]> {
    let params = new HttpParams();
    if (filters?.installment_id) params = params.set('installment_id', filters.installment_id);
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.channel) params = params.set('channel', filters.channel);
    return this.http.get<InstallmentAlertLog[]>(`${this.baseUrl}/alerts`, { params });
  }

  // 4. PDC Cheque Vault
  getPDCVault(filters?: { status?: string; search?: string }): Observable<PDCVaultItem[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<PDCVaultItem[]>(`${this.baseUrl}/pdc-vault`, { params });
  }

  depositCheque(payload: any): Observable<PDCVaultItem> {
    return this.http.post<PDCVaultItem>(`${this.baseUrl}/pdc-vault`, payload);
  }

  updatePDCStatus(chequeId: number, payload: { status: string; dishonour_memo_date?: string; dishonour_reason?: string }): Observable<PDCVaultItem> {
    return this.http.put<PDCVaultItem>(`${this.baseUrl}/pdc-vault/${chequeId}/status`, payload);
  }

  // 5. NI Act 1881 Section 138 Engine
  getNI138Actions(statusFilter?: string): Observable<NI138LegalAction[]> {
    let params = new HttpParams();
    if (statusFilter) params = params.set('status', statusFilter);
    return this.http.get<NI138LegalAction[]>(`${this.baseUrl}/ni138-actions`, { params });
  }

  serveNotice(actionId: number, payload: { notice_served_to_client_date: string; registered_post_ad_no: string; legal_counsel_name?: string; remarks?: string }): Observable<NI138LegalAction> {
    return this.http.post<NI138LegalAction>(`${this.baseUrl}/ni138-actions/${actionId}/serve-notice`, payload);
  }

  fileCourtCase(actionId: number, payload: { court_case_no: string; legal_counsel_name: string; remarks?: string }): Observable<NI138LegalAction> {
    return this.http.post<NI138LegalAction>(`${this.baseUrl}/ni138-actions/${actionId}/file-court-case`, payload);
  }

  downloadNoticePdf(actionId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/ni138-actions/${actionId}/notice-pdf`, {
      responseType: 'blob'
    });
  }

  // 6. Metrics & Cron Trigger
  getMetrics(): Observable<InstallmentMetrics> {
    return this.http.get<InstallmentMetrics>(`${this.baseUrl}/metrics`);
  }

  triggerPdcSmsReminders(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cron/trigger-pdc-sms-reminders`, {});
  }

  triggerNi138Deadlines(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cron/trigger-ni138-deadlines`, {});
  }

  // 7. Money Receipts & Partial Waterfall Collections (Prompt 10)
  getMoneyReceipts(filters?: { booking_id?: number; customer_id?: number; payment_mode?: string; search?: string }): Observable<MoneyReceipt[]> {
    let params = new HttpParams();
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    if (filters?.payment_mode) params = params.set('payment_mode', filters.payment_mode);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<MoneyReceipt[]>(`${this.baseUrl}/money-receipts`, { params });
  }

  createMoneyReceipt(payload: any): Observable<MoneyReceipt> {
    return this.http.post<MoneyReceipt>(`${this.baseUrl}/money-receipts`, payload);
  }

  getMoneyReceipt(id: number): Observable<MoneyReceipt> {
    return this.http.get<MoneyReceipt>(`${this.baseUrl}/money-receipts/${id}`);
  }

  verifyMoneyReceipt(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/money-receipts/${id}/verify`);
  }

  // 8. Bank Home Loan Tripartite Agreement & Tranche Ledger (Prompt 10)
  getTripartiteLoans(filters?: { booking_id?: number; financial_institution_code?: string; status?: string }): Observable<TripartiteLoan[]> {
    let params = new HttpParams();
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.financial_institution_code) params = params.set('financial_institution_code', filters.financial_institution_code);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<TripartiteLoan[]>(`${this.baseUrl}/tripartite-loans`, { params });
  }

  createTripartiteLoan(payload: any): Observable<TripartiteLoan> {
    return this.http.post<TripartiteLoan>(`${this.baseUrl}/tripartite-loans`, payload);
  }

  issueDeveloperNOC(loanId: number, payload: { developer_noc_ref: string; developer_noc_date: string; remarks?: string }): Observable<TripartiteLoan> {
    return this.http.post<TripartiteLoan>(`${this.baseUrl}/tripartite-loans/${loanId}/noc`, payload);
  }

  recordTrancheInspection(loanId: number, trancheId: number, payload: any): Observable<LoanTranche> {
    return this.http.put<LoanTranche>(`${this.baseUrl}/tripartite-loans/${loanId}/tranches/${trancheId}/inspection`, payload);
  }

  disburseTranche(loanId: number, trancheId: number, payload: any): Observable<LoanTranche> {
    return this.http.post<LoanTranche>(`${this.baseUrl}/tripartite-loans/${loanId}/tranches/${trancheId}/disburse`, payload);
  }
}
