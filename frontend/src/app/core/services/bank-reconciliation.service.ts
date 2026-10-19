import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BankReconciliationDetail,
  BankReconciliationListResponse,
  BankReconciliationCreateRequest,
  BankStatementItemDetail,
  ManualMatchRequest,
  SplitMatchRequest,
  PrepareAdjustmentJournalRequest,
  ApproveLockPeriodRequest,
  BankReconciliationStatementReport,
  BankReconciliationKPIs
} from '../models/bank-reconciliation.model';

@Injectable({
  providedIn: 'root'
})
export class BankReconciliationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounts/bank-reconciliation`;

  // 15.1 KPIs
  getKPIs(): Observable<BankReconciliationKPIs> {
    return this.http.get<BankReconciliationKPIs>(`${this.baseUrl}/kpis`);
  }

  // 15.1 & 15.2 List Sessions
  getSessions(params?: {
    search?: string;
    status?: string;
    bank_account_id?: number;
    limit?: number;
    offset?: number;
  }): Observable<BankReconciliationListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.status && params.status !== 'ALL') httpParams = httpParams.set('status', params.status);
      if (params.bank_account_id) httpParams = httpParams.set('bank_account_id', params.bank_account_id.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.offset !== undefined) httpParams = httpParams.set('offset', params.offset.toString());
    }
    return this.http.get<BankReconciliationListResponse>(`${this.baseUrl}/sessions`, { params: httpParams });
  }

  // Session details with statement items
  getSession(id: number): Observable<BankReconciliationDetail> {
    return this.http.get<BankReconciliationDetail>(`${this.baseUrl}/sessions/${id}`);
  }

  // Ingest Statement & Run Auto Match
  createSession(payload: BankReconciliationCreateRequest): Observable<BankReconciliationDetail> {
    return this.http.post<BankReconciliationDetail>(`${this.baseUrl}/sessions`, payload);
  }

  // 15.2 Manual Review & 1-to-1 Match
  manualMatch(payload: ManualMatchRequest): Observable<BankStatementItemDetail> {
    return this.http.post<BankStatementItemDetail>(`${this.baseUrl}/manual-match`, payload);
  }

  // 15.1 Split Match (1 Bank Line to Multiple Vouchers)
  splitMatch(payload: SplitMatchRequest): Observable<BankStatementItemDetail> {
    return this.http.post<BankStatementItemDetail>(`${this.baseUrl}/split-match`, payload);
  }

  // 15.1 Prepare Authorized Adjustment Journal
  postAdjustmentJournal(payload: PrepareAdjustmentJournalRequest): Observable<BankStatementItemDetail> {
    return this.http.post<BankStatementItemDetail>(`${this.baseUrl}/adjustment-journal`, payload);
  }

  // 15.1 & 15.3 Approve and Lock Period
  approveAndLockPeriod(payload: ApproveLockPeriodRequest): Observable<BankReconciliationDetail> {
    return this.http.post<BankReconciliationDetail>(`${this.baseUrl}/approve-lock`, payload);
  }

  // 15.1 Bank Reconciliation Statement (BRS) Report
  getBRSReport(id: number): Observable<BankReconciliationStatementReport> {
    return this.http.get<BankReconciliationStatementReport>(`${this.baseUrl}/sessions/${id}/brs-report`);
  }

  // Seed Demo Data
  seedDemoData(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/seed-demo-data`, {});
  }
}
