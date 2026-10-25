import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

export type HrReportId =
  // 1. HR Reports
  | 'employee-master'
  | 'employee-directory'
  | 'employee-headcount'
  | 'new-joining'
  | 'resignation-separation'
  | 'employee-transfer'
  | 'promotion-increment'
  | 'document-expiry'
  | 'recruitment'
  | 'employee-turnover'
  | 'manpower-allocation'
  | 'employee-loan-advance'
  // 2. Attendance Reports
  | 'attendance-daily'
  | 'attendance-monthly-summary'
  | 'attendance-history'
  | 'attendance-late-arrival'
  | 'attendance-early-departure'
  | 'attendance-absenteeism'
  | 'attendance-missing-punch'
  | 'attendance-overtime'
  | 'attendance-shift-wise'
  | 'attendance-biometric'
  | 'attendance-mobile-gps'
  | 'attendance-correction'
  | 'attendance-site-wise'
  | 'attendance-exception'
  // 3. Leave Reports
  | 'leave-register'
  | 'leave-approved'
  | 'leave-pending'
  | 'leave-balance'
  | 'leave-type-summary'
  | 'leave-history'
  | 'leave-department-wise'
  | 'leave-project-wise'
  | 'leave-unpaid'
  | 'leave-encashment'
  | 'leave-cancellation'
  | 'leave-trend-analysis'
  // 4. Payroll Reports
  | 'payroll-register'
  | 'payroll-monthly-register'
  | 'salary-sheet'
  | 'payslip-register'
  | 'bank-disbursement'
  | 'bank-salary-transfer'
  | 'payroll-summary'
  | 'payroll-department-wise'
  | 'payroll-project-cost'
  | 'payroll-salary-component'
  | 'payroll-overtime-payment'
  | 'payroll-bonus'
  | 'payroll-arrears'
  | 'payroll-deduction'
  | 'payroll-loan-recovery'
  | 'payroll-salary-increment'
  | 'payroll-final-settlement'
  | 'payroll-variance'
  | 'payroll-posting'
  | 'payroll-reconciliation'
  // 5. Project-wise Labour Cost Reports
  | 'labour-project-salary'
  | 'labour-tower-site'
  | 'labour-wbs-activity'
  | 'labour-direct-vs-shared'
  | 'labour-timesheet-hours'
  | 'labour-overtime-project'
  | 'labour-budget-vs-actual'
  | 'labour-monthly-trend'
  | 'labour-cost-exceptions'
  | 'labour-multi-project-distribution'
  | (string & {});

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportPage {
  report_id: HrReportId;
  title: string;
  description: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
}

export interface ReportMetadata {
  id: HrReportId;
  title: string;
  description: string;
  filters: string[];
  sensitive: boolean;
  source_note?: string | null;
}

export interface ReportOption {
  value: number | string;
  label: string;
}

export interface ReportFilterOptions {
  companies: ReportOption[];
  branches: ReportOption[];
  departments: ReportOption[];
  designations: ReportOption[];
  projects: ReportOption[];
  statuses: ReportOption[];
  employment_types: ReportOption[];
  separation_types: ReportOption[];
  revision_types: ReportOption[];
  document_types: ReportOption[];
  recruitment_types: ReportOption[];
  periods: ReportOption[];
  cost_centres: ReportOption[];
  financial_years: ReportOption[];
}

export type ReportFilters = Record<string, string | number | undefined>;

@Injectable({ providedIn: 'root' })
export class HrReportsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/hrms/reports`;

  metadata(): Observable<ReportMetadata[]> {
    return this.http.get<ReportMetadata[]>(`${this.url}/metadata`);
  }

  filterOptions(): Observable<ReportFilterOptions> {
    return this.http.get<ReportFilterOptions>(`${this.url}/filter-options`);
  }

  rows(reportId: HrReportId, filters: ReportFilters, limit: number, offset: number): Observable<ReportPage> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ReportPage>(`${this.url}/${reportId}/rows`, { params });
  }

  export(reportId: HrReportId, filters: ReportFilters, format: 'xlsx' | 'csv' | 'pdf' | 'print'): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get(`${this.url}/${reportId}/export`, { params, responseType: 'blob' });
  }
}
