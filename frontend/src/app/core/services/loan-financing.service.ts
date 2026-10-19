import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Loan,
  LoanListResponse,
  LoanPortfolioKPIs,
  LoanDisbursement,
  LoanRepayment,
  LoanInterestAccrual,
  LoanCreatePayload,
  LoanDisbursementCreatePayload,
  LoanRepaymentCreatePayload,
  LoanInterestAccrualCreatePayload,
  LoanIAS23CapitalizePayload
} from '../models/loan-financing.model';

@Injectable({
  providedIn: 'root'
})
export class LoanFinancingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounts/loans`;

  // 14.1 Portfolio KPIs
  getPortfolioKPIs(): Observable<LoanPortfolioKPIs> {
    return this.http.get<LoanPortfolioKPIs>(`${this.baseUrl}/summary/kpis`);
  }

  // 14.1 List Facilities
  getLoans(params?: {
    search?: string;
    status?: string;
    facility_type?: string;
    project_id?: number;
    limit?: number;
    offset?: number;
  }): Observable<LoanListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.status && params.status !== 'ALL') httpParams = httpParams.set('status', params.status);
      if (params.facility_type && params.facility_type !== 'ALL') httpParams = httpParams.set('facility_type', params.facility_type);
      if (params.project_id) httpParams = httpParams.set('project_id', params.project_id.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.offset !== undefined) httpParams = httpParams.set('offset', params.offset.toString());
    }
    return this.http.get<LoanListResponse>(this.baseUrl, { params: httpParams });
  }

  // Single Loan Details
  getLoan(id: number): Observable<Loan> {
    return this.http.get<Loan>(`${this.baseUrl}/${id}`);
  }

  // Create Loan
  createLoan(payload: LoanCreatePayload): Observable<Loan> {
    return this.http.post<Loan>(this.baseUrl, payload);
  }

  // Update Loan
  updateLoan(id: number, payload: Partial<LoanCreatePayload>): Observable<Loan> {
    return this.http.put<Loan>(`${this.baseUrl}/${id}`, payload);
  }

  // Delete Loan
  deleteLoan(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // 14.2 Record Disbursement
  recordDisbursement(loanId: number, payload: LoanDisbursementCreatePayload): Observable<LoanDisbursement> {
    return this.http.post<LoanDisbursement>(`${this.baseUrl}/${loanId}/disbursements`, payload);
  }

  // 14.3 Record Repayment Waterfall
  recordRepayment(loanId: number, payload: LoanRepaymentCreatePayload): Observable<LoanRepayment> {
    return this.http.post<LoanRepayment>(`${this.baseUrl}/${loanId}/repayments`, payload);
  }

  // 14.3 Record Interest Accrual
  recordInterestAccrual(loanId: number, payload: LoanInterestAccrualCreatePayload): Observable<LoanInterestAccrual> {
    return this.http.post<LoanInterestAccrual>(`${this.baseUrl}/${loanId}/accrue-interest`, payload);
  }

  // 14.3 Capitalize Borrowing Costs into CWIP (IAS 23)
  capitalizeIAS23(loanId: number, payload: LoanIAS23CapitalizePayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${loanId}/capitalize-ias23`, payload);
  }

  // Seed Demo Data
  seedDemoData(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/seed-demo-data`, {});
  }
}
