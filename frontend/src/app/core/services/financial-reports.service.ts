import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  GeneralLedgerReportResponse,
  CashBankBookReportResponse,
  APAgingReportResponse,
  ARAgingReportResponse,
  CustomerAdvanceReportResponse,
  ProjectIncomeExpReportResponse,
  CostToCompleteReportResponse,
  CWIPStatementReportResponse,
  LoanScheduleReportResponse,
  BankReconReportResponse,
  PartyStatementResponse,
  BudgetVsActualReportResponse,
  VoucherRegisterReportResponse,
  ClosingChecklistReportResponse,
  AuditTrailReportResponse
} from '../models/financial-reports.model';

@Injectable({
  providedIn: 'root'
})
export class FinancialReportsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounts/reports-hub`;

  // 1. General Ledger
  getGeneralLedger(params?: {
    account_id?: number | null;
    project_id?: number | null;
    cost_center_id?: number | null;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Observable<GeneralLedgerReportResponse> {
    let p = new HttpParams();
    if (params?.account_id) p = p.set('account_id', params.account_id);
    if (params?.project_id) p = p.set('project_id', params.project_id);
    if (params?.cost_center_id) p = p.set('cost_center_id', params.cost_center_id);
    if (params?.from_date) p = p.set('from_date', params.from_date);
    if (params?.to_date) p = p.set('to_date', params.to_date);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<GeneralLedgerReportResponse>(`${this.baseUrl}/general-ledger`, { params: p });
  }

  // 2. Cashbook & Bankbook
  getCashBankBook(params?: {
    book_type?: string;
    account_id?: number | null;
    project_id?: number | null;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Observable<CashBankBookReportResponse> {
    let p = new HttpParams();
    if (params?.book_type) p = p.set('book_type', params.book_type);
    if (params?.account_id) p = p.set('account_id', params.account_id);
    if (params?.project_id) p = p.set('project_id', params.project_id);
    if (params?.from_date) p = p.set('from_date', params.from_date);
    if (params?.to_date) p = p.set('to_date', params.to_date);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<CashBankBookReportResponse>(`${this.baseUrl}/cashbook-bankbook`, { params: p });
  }

  // 3. AP Aging
  getAPAging(params?: { as_of_date?: string; vendor_id?: number | null }): Observable<APAgingReportResponse> {
    let p = new HttpParams();
    if (params?.as_of_date) p = p.set('as_of_date', params.as_of_date);
    if (params?.vendor_id) p = p.set('vendor_id', params.vendor_id);
    return this.http.get<APAgingReportResponse>(`${this.baseUrl}/ap-aging`, { params: p });
  }

  // 4. AR Aging
  getARAging(params?: { as_of_date?: string; customer_id?: number | null; project_id?: number | null }): Observable<ARAgingReportResponse> {
    let p = new HttpParams();
    if (params?.as_of_date) p = p.set('as_of_date', params.as_of_date);
    if (params?.customer_id) p = p.set('customer_id', params.customer_id);
    if (params?.project_id) p = p.set('project_id', params.project_id);
    return this.http.get<ARAgingReportResponse>(`${this.baseUrl}/ar-aging`, { params: p });
  }

  // 5. Customer Advances
  getCustomerAdvances(params?: {
    customer_id?: number | null;
    project_id?: number | null;
    status_filter?: string;
    limit?: number;
    offset?: number;
  }): Observable<CustomerAdvanceReportResponse> {
    let p = new HttpParams();
    if (params?.customer_id) p = p.set('customer_id', params.customer_id);
    if (params?.project_id) p = p.set('project_id', params.project_id);
    if (params?.status_filter) p = p.set('status_filter', params.status_filter);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<CustomerAdvanceReportResponse>(`${this.baseUrl}/customer-advances`, { params: p });
  }

  // 6. Project Income & Expenditure
  getProjectIncomeExp(params?: { project_id?: number | null; from_date?: string; to_date?: string }): Observable<ProjectIncomeExpReportResponse> {
    let p = new HttpParams();
    if (params?.project_id) p = p.set('project_id', params.project_id);
    if (params?.from_date) p = p.set('from_date', params.from_date);
    if (params?.to_date) p = p.set('to_date', params.to_date);
    return this.http.get<ProjectIncomeExpReportResponse>(`${this.baseUrl}/project-income-expenditure`, { params: p });
  }

  // 7. Project Cost-to-Complete
  getCostToComplete(params?: { project_id?: number | null }): Observable<CostToCompleteReportResponse> {
    let p = new HttpParams();
    if (params?.project_id) p = p.set('project_id', params.project_id);
    return this.http.get<CostToCompleteReportResponse>(`${this.baseUrl}/cost-to-complete`, { params: p });
  }

  // 8. CWIP Statement
  getCWIPStatement(params?: { project_id?: number | null; as_of_date?: string }): Observable<CWIPStatementReportResponse> {
    let p = new HttpParams();
    if (params?.project_id) p = p.set('project_id', params.project_id);
    if (params?.as_of_date) p = p.set('as_of_date', params.as_of_date);
    return this.http.get<CWIPStatementReportResponse>(`${this.baseUrl}/cwip-statement`, { params: p });
  }

  // 9. Loan & Interest Schedule
  getLoanSchedule(params?: { bank_name?: string; status_filter?: string }): Observable<LoanScheduleReportResponse> {
    let p = new HttpParams();
    if (params?.bank_name) p = p.set('bank_name', params.bank_name);
    if (params?.status_filter) p = p.set('status_filter', params.status_filter);
    return this.http.get<LoanScheduleReportResponse>(`${this.baseUrl}/loan-schedule`, { params: p });
  }

  // 10. Bank Reconciliation Report
  getBankReconciliationSummary(params?: { account_id?: number | null; as_of_date?: string }): Observable<BankReconReportResponse> {
    let p = new HttpParams();
    if (params?.account_id) p = p.set('account_id', params.account_id);
    if (params?.as_of_date) p = p.set('as_of_date', params.as_of_date);
    return this.http.get<BankReconReportResponse>(`${this.baseUrl}/bank-reconciliation-summary`, { params: p });
  }

  // 11. Party Statements
  getPartyStatement(params: {
    party_type: 'VENDOR' | 'CUSTOMER';
    party_id: number;
    from_date?: string;
    to_date?: string;
  }): Observable<PartyStatementResponse> {
    let p = new HttpParams()
      .set('party_type', params.party_type)
      .set('party_id', params.party_id);
    if (params.from_date) p = p.set('from_date', params.from_date);
    if (params.to_date) p = p.set('to_date', params.to_date);
    return this.http.get<PartyStatementResponse>(`${this.baseUrl}/party-statement`, { params: p });
  }

  // 12. Budget vs Actual
  getBudgetVsActual(params?: { project_id?: number | null }): Observable<BudgetVsActualReportResponse> {
    let p = new HttpParams();
    if (params?.project_id) p = p.set('project_id', params.project_id);
    return this.http.get<BudgetVsActualReportResponse>(`${this.baseUrl}/budget-vs-actual`, { params: p });
  }

  // 13. Voucher Register
  getVoucherRegister(params?: {
    voucher_type?: string;
    status_filter?: string;
    project_id?: number | null;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Observable<VoucherRegisterReportResponse> {
    let p = new HttpParams();
    if (params?.voucher_type) p = p.set('voucher_type', params.voucher_type);
    if (params?.status_filter) p = p.set('status_filter', params.status_filter);
    if (params?.project_id) p = p.set('project_id', params.project_id);
    if (params?.from_date) p = p.set('from_date', params.from_date);
    if (params?.to_date) p = p.set('to_date', params.to_date);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<VoucherRegisterReportResponse>(`${this.baseUrl}/voucher-register`, { params: p });
  }

  // 14. Closing Checklist
  getClosingChecklist(params?: { fiscal_year_id?: number; period_month?: number }): Observable<ClosingChecklistReportResponse> {
    let p = new HttpParams();
    if (params?.fiscal_year_id) p = p.set('fiscal_year_id', params.fiscal_year_id);
    if (params?.period_month) p = p.set('period_month', params.period_month);
    return this.http.get<ClosingChecklistReportResponse>(`${this.baseUrl}/closing-checklist`, { params: p });
  }

  // 15. Audit Trail
  getAuditTrail(params?: {
    entity_name?: string;
    action_type?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Observable<AuditTrailReportResponse> {
    let p = new HttpParams();
    if (params?.entity_name) p = p.set('entity_name', params.entity_name);
    if (params?.action_type) p = p.set('action_type', params.action_type);
    if (params?.from_date) p = p.set('from_date', params.from_date);
    if (params?.to_date) p = p.set('to_date', params.to_date);
    if (params?.limit) p = p.set('limit', params.limit);
    if (params?.offset !== undefined) p = p.set('offset', params.offset);
    return this.http.get<AuditTrailReportResponse>(`${this.baseUrl}/audit-trail`, { params: p });
  }
}
