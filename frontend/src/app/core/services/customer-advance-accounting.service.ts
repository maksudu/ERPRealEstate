import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CustomerAdvanceInstallment,
  CustomerAdvancePaginationResponse,
  CustomerAdvanceAllocation,
  CustomerLiabilityLedgerSummaryResponse,
  ReceivableAgingReconciliationResponse
} from '../models/customer-advance-accounting.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerAdvanceAccountingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounts/customer-advances`;

  // 13.1 Transactions List & Filter
  getTransactions(params?: {
    search?: string;
    project_id?: number;
    customer_id?: number;
    transaction_type?: string;
    accounting_status?: string;
    revenue_recognition_status?: string;
    payment_mode?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }): Observable<CustomerAdvancePaginationResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.project_id) httpParams = httpParams.set('project_id', params.project_id.toString());
      if (params.customer_id) httpParams = httpParams.set('customer_id', params.customer_id.toString());
      if (params.transaction_type && params.transaction_type !== 'ALL') {
        httpParams = httpParams.set('transaction_type', params.transaction_type);
      }
      if (params.accounting_status && params.accounting_status !== 'ALL') {
        httpParams = httpParams.set('accounting_status', params.accounting_status);
      }
      if (params.revenue_recognition_status && params.revenue_recognition_status !== 'ALL') {
        httpParams = httpParams.set('revenue_recognition_status', params.revenue_recognition_status);
      }
      if (params.payment_mode && params.payment_mode !== 'ALL') {
        httpParams = httpParams.set('payment_mode', params.payment_mode);
      }
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.offset !== undefined) httpParams = httpParams.set('offset', params.offset.toString());
    }
    return this.http.get<CustomerAdvancePaginationResponse>(`${this.baseUrl}/transactions`, { params: httpParams });
  }

  getTransaction(id: number): Observable<CustomerAdvanceInstallment> {
    return this.http.get<CustomerAdvanceInstallment>(`${this.baseUrl}/transactions/${id}`);
  }

  createTransaction(payload: any): Observable<CustomerAdvanceInstallment> {
    return this.http.post<CustomerAdvanceInstallment>(`${this.baseUrl}/transactions`, payload);
  }

  updateTransaction(id: number, payload: any): Observable<CustomerAdvanceInstallment> {
    return this.http.put<CustomerAdvanceInstallment>(`${this.baseUrl}/transactions/${id}`, payload);
  }

  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/transactions/${id}`);
  }

  // 13.1.4 Payment Allocation by Unit & Installment
  allocateAdvance(payload: {
    advance_id: number;
    installment_id?: number | null;
    unit_id?: number | null;
    allocated_amount: number;
    allocation_date?: string;
    allocation_type?: string;
    notes?: string;
  }): Observable<CustomerAdvanceAllocation> {
    return this.http.post<CustomerAdvanceAllocation>(`${this.baseUrl}/allocate`, payload);
  }

  // 13.2 Revenue Recognition Transfer (IFRS 15)
  recognizeRevenue(payload: {
    advance_id: number;
    recognized_amount: number;
    recognition_policy?: string;
    revenue_account_id?: number | null;
    notes?: string;
  }): Observable<CustomerAdvanceInstallment> {
    return this.http.post<CustomerAdvanceInstallment>(`${this.baseUrl}/recognize-revenue`, payload);
  }

  // 13.1.7 Cancellation & Refund Accounting
  processRefund(payload: {
    advance_id: number;
    refund_amount: number;
    forfeiture_amount?: number;
    forfeiture_account_id?: number | null;
    refund_mode?: string;
    bank_account_id?: number | null;
    reason: string;
    notes?: string;
  }): Observable<CustomerAdvanceInstallment> {
    return this.http.post<CustomerAdvanceInstallment>(`${this.baseUrl}/process-refund`, payload);
  }

  // 13.1.6 Late Charges & Approved Adjustments
  adjustLateCharges(payload: {
    advance_id?: number | null;
    booking_id: number;
    customer_id: number;
    adjustment_type: string; // LATE_CHARGE_ASSESSMENT, LATE_CHARGE_WAIVER
    amount: number;
    approved_by?: string;
    approval_reference?: string;
    reason: string;
  }): Observable<CustomerAdvanceInstallment> {
    return this.http.post<CustomerAdvanceInstallment>(`${this.baseUrl}/adjust-late-charges`, payload);
  }

  // 13.1.4 Customer Liability Ledger
  getLiabilityLedger(params?: {
    search?: string;
    project_id?: number;
  }): Observable<CustomerLiabilityLedgerSummaryResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.project_id) httpParams = httpParams.set('project_id', params.project_id.toString());
    }
    return this.http.get<CustomerLiabilityLedgerSummaryResponse>(`${this.baseUrl}/ledger`, { params: httpParams });
  }

  // 13.1.10 Receivable Aging & Collection Reconciliation
  getAgingReconciliation(projectId?: number): Observable<ReceivableAgingReconciliationResponse> {
    let httpParams = new HttpParams();
    if (projectId) httpParams = httpParams.set('project_id', projectId.toString());
    return this.http.get<ReceivableAgingReconciliationResponse>(`${this.baseUrl}/aging-reconciliation`, { params: httpParams });
  }

  // Demo Seeder
  seedDemoData(targetCount = 45): Observable<any> {
    let httpParams = new HttpParams().set('target_count', targetCount.toString());
    return this.http.post<any>(`${this.baseUrl}/seed-demo-data`, null, { params: httpParams });
  }
}
