import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChartOfAccount,
  Voucher,
  BankReconciliation,
  TrialBalanceReport,
  ProfitLossReport,
  BalanceSheetReport,
  MushakTaxInvoice,
  TDSDeduction,
  SubRegistryCalculationRequest,
  SubRegistryCalculationResponse
} from '../models/accounts.model';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounts`;

  // 1. Chart of Accounts (COA)
  getCOA(accountType?: string): Observable<ChartOfAccount[]> {
    let params = new HttpParams();
    if (accountType) params = params.set('account_type', accountType);
    return this.http.get<ChartOfAccount[]>(`${this.baseUrl}/coa`, { params });
  }

  createAccount(payload: any): Observable<ChartOfAccount> {
    return this.http.post<ChartOfAccount>(`${this.baseUrl}/coa`, payload);
  }

  // 2. Vouchers & Double-Entry Journal
  getVouchers(filters?: { voucher_type?: string; project_id?: number; status_filter?: string }): Observable<Voucher[]> {
    let params = new HttpParams();
    if (filters?.voucher_type) params = params.set('voucher_type', filters.voucher_type);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    return this.http.get<Voucher[]>(`${this.baseUrl}/vouchers`, { params });
  }

  createVoucher(payload: any): Observable<Voucher> {
    return this.http.post<Voucher>(`${this.baseUrl}/vouchers`, payload);
  }

  reverseVoucher(voucherId: number): Observable<Voucher> {
    return this.http.post<Voucher>(`${this.baseUrl}/vouchers/${voucherId}/reverse`, {});
  }

  // 3. Bank & MFS Reconciliation
  getBankReconciliations(): Observable<BankReconciliation[]> {
    return this.http.get<BankReconciliation[]>(`${this.baseUrl}/bank-reconciliation`);
  }

  createBankReconciliation(payload: any): Observable<BankReconciliation> {
    return this.http.post<BankReconciliation>(`${this.baseUrl}/bank-reconciliation`, payload);
  }

  // 4. Financial Reports
  getTrialBalance(asOfDate?: string): Observable<TrialBalanceReport> {
    let params = new HttpParams();
    if (asOfDate) params = params.set('as_of_date', asOfDate);
    return this.http.get<TrialBalanceReport>(`${this.baseUrl}/reports/trial-balance`, { params });
  }

  getProfitLoss(filters?: { from_date?: string; to_date?: string; project_id?: number }): Observable<ProfitLossReport> {
    let params = new HttpParams();
    if (filters?.from_date) params = params.set('from_date', filters.from_date);
    if (filters?.to_date) params = params.set('to_date', filters.to_date);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    return this.http.get<ProfitLossReport>(`${this.baseUrl}/reports/profit-loss`, { params });
  }

  getBalanceSheet(asOfDate?: string): Observable<BalanceSheetReport> {
    let params = new HttpParams();
    if (asOfDate) params = params.set('as_of_date', asOfDate);
    return this.http.get<BalanceSheetReport>(`${this.baseUrl}/reports/balance-sheet`, { params });
  }

  // 5. Bangladesh VAT & Mushak 6.3 Tax Invoices
  getMushakInvoices(bookingId?: number): Observable<MushakTaxInvoice[]> {
    let params = new HttpParams();
    if (bookingId) params = params.set('booking_id', bookingId);
    return this.http.get<MushakTaxInvoice[]>(`${this.baseUrl}/vat-mushak`, { params });
  }

  generateMushakInvoice(payload: any): Observable<MushakTaxInvoice> {
    return this.http.post<MushakTaxInvoice>(`${this.baseUrl}/vat-mushak`, payload);
  }

  // 6. TDS & VDS Tax Withholding
  getTDSDeductions(filters?: { section_filter?: string; status_filter?: string }): Observable<TDSDeduction[]> {
    let params = new HttpParams();
    if (filters?.section_filter) params = params.set('section_filter', filters.section_filter);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    return this.http.get<TDSDeduction[]>(`${this.baseUrl}/tax-withholding`, { params });
  }

  createTDSDeduction(payload: any): Observable<TDSDeduction> {
    return this.http.post<TDSDeduction>(`${this.baseUrl}/tax-withholding`, payload);
  }

  depositTDSToTreasury(tdsId: number, payload: any): Observable<TDSDeduction> {
    return this.http.patch<TDSDeduction>(`${this.baseUrl}/tax-withholding/${tdsId}/deposit`, payload);
  }

  // 7. Sub-Registry & Section 53FF AIT Calculator
  calculateSubRegistryFees(payload: SubRegistryCalculationRequest): Observable<SubRegistryCalculationResponse> {
    return this.http.post<SubRegistryCalculationResponse>(`${this.baseUrl}/sub-registry-calc`, payload);
  }
}

