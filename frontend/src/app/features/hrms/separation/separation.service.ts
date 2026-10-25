import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type SeparationSectionType =
  | 'resignations'
  | 'notice-periods'
  | 'terminations'
  | 'exit-interviews'
  | 'asset-clearances'
  | 'dept-clearances'
  | 'loan-settlements'
  | 'leave-settlements'
  | 'final-salaries'
  | 'settlement-approvals'
  | 'experience-certificates';

export interface EmployeeSeparationRecord {
  id: number;
  organization_id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  designation_title?: string;
  separation_ref: string;
  section_type: SeparationSectionType;
  submission_date: string;
  notice_start_date?: string;
  notice_end_date?: string;
  notice_days: number;
  last_working_day?: string;
  separation_type: string;
  reason?: string;
  exit_interview_notes?: string;
  asset_clearance_status: string;
  dept_clearance_status: string;
  final_salary_amount: number;
  leave_encashment_amount: number;
  gratuity_amount: number;
  provident_fund_settlement: number;
  loan_deduction: number;
  other_deductions: number;
  net_payable_amount: number;
  approval_status: string;
  certificate_number?: string;
  certificate_issued: boolean;
  certificate_issue_date?: string;
  status: string;
  notes?: string;
  created_at?: string;
}

export interface EmployeeSeparationPaginated {
  items: EmployeeSeparationRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface EmployeeSeparationPayload {
  employee_id: number;
  separation_ref?: string;
  section_type: string;
  submission_date: string;
  notice_start_date?: string;
  notice_end_date?: string;
  notice_days: number;
  last_working_day?: string;
  separation_type: string;
  reason?: string;
  exit_interview_notes?: string;
  asset_clearance_status: string;
  dept_clearance_status: string;
  final_salary_amount: number;
  leave_encashment_amount: number;
  gratuity_amount: number;
  provident_fund_settlement: number;
  loan_deduction: number;
  other_deductions: number;
  approval_status: string;
  certificate_number?: string;
  certificate_issued: boolean;
  certificate_issue_date?: string;
  status: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class SeparationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms`;

  listSeparations(params: {
    section_type?: string;
    employee_id?: number;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<EmployeeSeparationPaginated> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        httpParams = httpParams.set(key, String(val));
      }
    });
    return this.http.get<EmployeeSeparationPaginated>(`${this.apiUrl}/separations`, { params: httpParams });
  }

  getSeparation(id: number): Observable<EmployeeSeparationRecord> {
    return this.http.get<EmployeeSeparationRecord>(`${this.apiUrl}/separations/${id}`);
  }

  createSeparation(payload: EmployeeSeparationPayload): Observable<EmployeeSeparationRecord> {
    return this.http.post<EmployeeSeparationRecord>(`${this.apiUrl}/separations`, payload);
  }

  updateSeparation(id: number, payload: Partial<EmployeeSeparationPayload>): Observable<EmployeeSeparationRecord> {
    return this.http.put<EmployeeSeparationRecord>(`${this.apiUrl}/separations/${id}`, payload);
  }

  deleteSeparation(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/separations/${id}`);
  }

  getEmployees(): Observable<{ items: Array<{ id: number; employee_code: string; first_name: string; last_name: string; department?: { name_en: string } }> }> {
    return this.http.get<any>(`${this.apiUrl}/employees`, { params: new HttpParams().set('limit', '100') });
  }
}
