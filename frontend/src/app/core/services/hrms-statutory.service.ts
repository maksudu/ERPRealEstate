import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface DropdownOption {
  value: string;
  label: string;
}

export interface StatutoryMetadata {
  assessment_years: DropdownOption[];
  gender_groups: DropdownOption[];
  regulatory_authorities: DropdownOption[];
  register_types: DropdownOption[];
  contract_types: DropdownOption[];
  policy_categories: DropdownOption[];
  departments: DropdownOption[];
  designations: DropdownOption[];
  compliance_ratings: DropdownOption[];
  statuses: DropdownOption[];
}

export interface TaxConfiguration {
  id: number;
  assessment_year: string;
  slab_name: string;
  min_amount: number;
  max_amount: number;
  tax_rate_percent: number;
  gender_group: string;
  special_exemption_limit: number;
  min_tax_amount: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export interface TaxDeduction {
  id: number;
  deduction_ref: string;
  employee_id?: number;
  employee_name: string;
  department: string;
  fiscal_year: string;
  tax_month: string;
  gross_salary: number;
  taxable_salary: number;
  tds_amount: number;
  challan_number?: string;
  challan_date?: string;
  bank_name: string;
  bank_branch: string;
  status: string;
  remarks?: string;
  created_at?: string;
}

export interface TaxCertificate {
  id: number;
  certificate_number: string;
  employee_id?: number;
  employee_name: string;
  etin: string;
  tax_circle: string;
  tax_zone: string;
  assessment_year: string;
  gross_earnings: number;
  total_tax_deducted: number;
  issue_date: string;
  authorized_signatory: string;
  status: string;
  remarks?: string;
}

export interface StatutoryRegister {
  id: number;
  register_code: string;
  register_type: string;
  register_name: string;
  department_or_site: string;
  calendar_year: string;
  total_entries: number;
  verified_by: string;
  verification_date?: string;
  status: string;
  remarks?: string;
}

export interface EmploymentContract {
  id: number;
  contract_code: string;
  employee_id?: number;
  employee_name: string;
  designation: string;
  department: string;
  contract_type: string;
  start_date: string;
  end_date?: string;
  probation_months: number;
  notice_period_days: number;
  base_salary: number;
  status: string;
  terms_summary?: string;
}

export interface PolicyAcknowledgment {
  id: number;
  policy_code: string;
  policy_title: string;
  category: string;
  mandatory_for: string;
  version: string;
  effective_date: string;
  required_signoffs: number;
  acknowledged_count: number;
  status: string;
  description?: string;
}

export interface StatutoryAuditDoc {
  id: number;
  audit_code: string;
  regulatory_authority: string;
  document_type: string;
  title: string;
  reference_number: string;
  issue_date: string;
  expiry_date?: string;
  responsible_officer: string;
  compliance_rating: string;
  status: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HrmsStatutoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms/statutory`;

  getMetadata(): Observable<StatutoryMetadata> {
    return this.http.get<StatutoryMetadata>(`${this.apiUrl}/metadata`);
  }

  // 1. Tax Config
  getTaxConfigs(params?: { assessment_year?: string; search?: string; limit?: number; offset?: number }): Observable<PaginatedResponse<TaxConfiguration>> {
    let httpParams = new HttpParams();
    if (params?.assessment_year) httpParams = httpParams.set('assessment_year', params.assessment_year);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', params.offset);
    return this.http.get<PaginatedResponse<TaxConfiguration>>(`${this.apiUrl}/tax-config`, { params: httpParams });
  }

  getTaxConfig(id: number): Observable<TaxConfiguration> {
    return this.http.get<TaxConfiguration>(`${this.apiUrl}/tax-config/${id}`);
  }

  createTaxConfig(data: Partial<TaxConfiguration>): Observable<TaxConfiguration> {
    return this.http.post<TaxConfiguration>(`${this.apiUrl}/tax-config`, data);
  }

  updateTaxConfig(id: number, data: Partial<TaxConfiguration>): Observable<TaxConfiguration> {
    return this.http.put<TaxConfiguration>(`${this.apiUrl}/tax-config/${id}`, data);
  }

  deleteTaxConfig(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tax-config/${id}`);
  }

  // 2. Tax Deductions (TDS)
  getTaxDeductions(params?: { status?: string; search?: string; limit?: number; offset?: number }): Observable<PaginatedResponse<TaxDeduction>> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', params.offset);
    return this.http.get<PaginatedResponse<TaxDeduction>>(`${this.apiUrl}/tax-deductions`, { params: httpParams });
  }

  getTaxDeduction(id: number): Observable<TaxDeduction> {
    return this.http.get<TaxDeduction>(`${this.apiUrl}/tax-deductions/${id}`);
  }

  createTaxDeduction(data: Partial<TaxDeduction>): Observable<TaxDeduction> {
    return this.http.post<TaxDeduction>(`${this.apiUrl}/tax-deductions`, data);
  }

  updateTaxDeduction(id: number, data: Partial<TaxDeduction>): Observable<TaxDeduction> {
    return this.http.put<TaxDeduction>(`${this.apiUrl}/tax-deductions/${id}`, data);
  }

  deleteTaxDeduction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tax-deductions/${id}`);
  }

  // 3. Tax Certificates (Form 108)
  getTaxCertificates(params?: { status?: string; search?: string; limit?: number; offset?: number }): Observable<PaginatedResponse<TaxCertificate>> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', params.offset);
    return this.http.get<PaginatedResponse<TaxCertificate>>(`${this.apiUrl}/tax-certificates`, { params: httpParams });
  }

  getTaxCertificate(id: number): Observable<TaxCertificate> {
    return this.http.get<TaxCertificate>(`${this.apiUrl}/tax-certificates/${id}`);
  }

  createTaxCertificate(data: Partial<TaxCertificate>): Observable<TaxCertificate> {
    return this.http.post<TaxCertificate>(`${this.apiUrl}/tax-certificates`, data);
  }

  updateTaxCertificate(id: number, data: Partial<TaxCertificate>): Observable<TaxCertificate> {
    return this.http.put<TaxCertificate>(`${this.apiUrl}/tax-certificates/${id}`, data);
  }

  deleteTaxCertificate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tax-certificates/${id}`);
  }

  // 4. Statutory Registers
  getRegisters(params?: { register_type?: string; search?: string; limit?: number; offset?: number }): Observable<PaginatedResponse<StatutoryRegister>> {
    let httpParams = new HttpParams();
    if (params?.register_type) httpParams = httpParams.set('register_type', params.register_type);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', params.offset);
    return this.http.get<PaginatedResponse<StatutoryRegister>>(`${this.apiUrl}/registers`, { params: httpParams });
  }

  getRegister(id: number): Observable<StatutoryRegister> {
    return this.http.get<StatutoryRegister>(`${this.apiUrl}/registers/${id}`);
  }

  createRegister(data: Partial<StatutoryRegister>): Observable<StatutoryRegister> {
    return this.http.post<StatutoryRegister>(`${this.apiUrl}/registers`, data);
  }

  updateRegister(id: number, data: Partial<StatutoryRegister>): Observable<StatutoryRegister> {
    return this.http.put<StatutoryRegister>(`${this.apiUrl}/registers/${id}`, data);
  }

  deleteRegister(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/registers/${id}`);
  }

  // 5. Employment Contracts
  getContracts(params?: { contract_type?: string; status?: string; search?: string; limit?: number; offset?: number }): Observable<PaginatedResponse<EmploymentContract>> {
    let httpParams = new HttpParams();
    if (params?.contract_type) httpParams = httpParams.set('contract_type', params.contract_type);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', params.offset);
    return this.http.get<PaginatedResponse<EmploymentContract>>(`${this.apiUrl}/contracts`, { params: httpParams });
  }

  getContract(id: number): Observable<EmploymentContract> {
    return this.http.get<EmploymentContract>(`${this.apiUrl}/contracts/${id}`);
  }

  createContract(data: Partial<EmploymentContract>): Observable<EmploymentContract> {
    return this.http.post<EmploymentContract>(`${this.apiUrl}/contracts`, data);
  }

  updateContract(id: number, data: Partial<EmploymentContract>): Observable<EmploymentContract> {
    return this.http.put<EmploymentContract>(`${this.apiUrl}/contracts/${id}`, data);
  }

  deleteContract(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/contracts/${id}`);
  }

  // 6. Policy Acknowledgments
  getPolicies(params?: { category?: string; search?: string; limit?: number; offset?: number }): Observable<PaginatedResponse<PolicyAcknowledgment>> {
    let httpParams = new HttpParams();
    if (params?.category) httpParams = httpParams.set('category', params.category);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', params.offset);
    return this.http.get<PaginatedResponse<PolicyAcknowledgment>>(`${this.apiUrl}/policies`, { params: httpParams });
  }

  getPolicy(id: number): Observable<PolicyAcknowledgment> {
    return this.http.get<PolicyAcknowledgment>(`${this.apiUrl}/policies/${id}`);
  }

  createPolicy(data: Partial<PolicyAcknowledgment>): Observable<PolicyAcknowledgment> {
    return this.http.post<PolicyAcknowledgment>(`${this.apiUrl}/policies`, data);
  }

  updatePolicy(id: number, data: Partial<PolicyAcknowledgment>): Observable<PolicyAcknowledgment> {
    return this.http.put<PolicyAcknowledgment>(`${this.apiUrl}/policies/${id}`, data);
  }

  deletePolicy(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/policies/${id}`);
  }

  // 7. Statutory Audit Documents
  getAuditDocuments(params?: { authority?: string; status?: string; search?: string; limit?: number; offset?: number }): Observable<PaginatedResponse<StatutoryAuditDoc>> {
    let httpParams = new HttpParams();
    if (params?.authority) httpParams = httpParams.set('authority', params.authority);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.offset !== undefined) httpParams = httpParams.set('offset', params.offset);
    return this.http.get<PaginatedResponse<StatutoryAuditDoc>>(`${this.apiUrl}/audit-documents`, { params: httpParams });
  }

  getAuditDocument(id: number): Observable<StatutoryAuditDoc> {
    return this.http.get<StatutoryAuditDoc>(`${this.apiUrl}/audit-documents/${id}`);
  }

  createAuditDocument(data: Partial<StatutoryAuditDoc>): Observable<StatutoryAuditDoc> {
    return this.http.post<StatutoryAuditDoc>(`${this.apiUrl}/audit-documents`, data);
  }

  updateAuditDocument(id: number, data: Partial<StatutoryAuditDoc>): Observable<StatutoryAuditDoc> {
    return this.http.put<StatutoryAuditDoc>(`${this.apiUrl}/audit-documents/${id}`, data);
  }

  deleteAuditDocument(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/audit-documents/${id}`);
  }
}
