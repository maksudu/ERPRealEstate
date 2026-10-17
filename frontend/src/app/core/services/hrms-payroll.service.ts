import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SalaryComponent,
  SalaryComponentCreate,
  SalaryStructure,
  SalaryStructureCreate,
  EmployeeSalary,
  EmployeeSalaryCreate,
  SalaryRevision,
  SalaryRevisionCreate,
  PayrollPeriod,
  PayrollPeriodCreate,
  PayrollPayslipDetail,
  PayrollPayslipPaginatedResponse,
  StaffLoan,
  StaffLoanCreate,
  SalaryAdvance,
  SalaryAdvanceCreate,
  BonusIncentive,
  BonusIncentiveCreate,
  TaxSlab,
  TaxSlabCreate,
  BenefitPolicy,
  BenefitPolicyCreate,
  PayrollValidationSummary,
  PaginatedResponse
} from '../models/hrms-payroll.model';

@Injectable({
  providedIn: 'root'
})
export class HrmsPayrollService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms`;

  // --- Reactive Signals State ---
  // 3.1 Salary Components
  salaryComponents = signal<SalaryComponent[]>([]);
  totalSalaryComponents = signal<number>(0);
  loadingComponents = signal<boolean>(false);

  // 3.2 Salary Structures
  salaryStructures = signal<SalaryStructure[]>([]);
  totalSalaryStructures = signal<number>(0);
  loadingStructures = signal<boolean>(false);

  // 3.3 Employee Salaries
  employeeSalaries = signal<EmployeeSalary[]>([]);
  totalEmployeeSalaries = signal<number>(0);
  loadingSalaries = signal<boolean>(false);

  // 3.4 Salary Revisions
  salaryRevisions = signal<SalaryRevision[]>([]);
  totalSalaryRevisions = signal<number>(0);
  loadingRevisions = signal<boolean>(false);

  // 3.5 Payroll Periods
  payrollPeriods = signal<PayrollPeriod[]>([]);
  totalPayrollPeriods = signal<number>(0);
  activePeriod = signal<PayrollPeriod | null>(null);
  loadingPeriods = signal<boolean>(false);

  // 3.7 - 3.10 & 3.20 Payslips / Register
  payslips = signal<PayrollPayslipDetail[]>([]);
  totalPayslips = signal<number>(0);
  summaryGross = signal<number>(0);
  summaryDeductions = signal<number>(0);
  summaryNet = signal<number>(0);
  loadingPayslips = signal<boolean>(false);

  // 3.14 Staff Loans
  staffLoans = signal<StaffLoan[]>([]);
  totalStaffLoans = signal<number>(0);
  loadingLoans = signal<boolean>(false);

  // 3.15 Salary Advances
  salaryAdvances = signal<SalaryAdvance[]>([]);
  totalSalaryAdvances = signal<number>(0);
  loadingAdvances = signal<boolean>(false);

  // 3.16 Bonuses & Incentives
  bonusesIncentives = signal<BonusIncentive[]>([]);
  totalBonusesIncentives = signal<number>(0);
  loadingBonuses = signal<boolean>(false);

  // 3.11 Tax Slabs
  taxSlabs = signal<TaxSlab[]>([]);
  loadingTaxSlabs = signal<boolean>(false);

  // 3.12 & 3.13 Benefit & Gratuity Policies
  benefitPolicies = signal<BenefitPolicy[]>([]);
  totalBenefitPolicies = signal<number>(0);
  loadingBenefitPolicies = signal<boolean>(false);

  // 3.17 Payroll Deep Validation
  validationSummary = signal<PayrollValidationSummary | null>(null);
  loadingValidation = signal<boolean>(false);

  // --- 3.1 Salary Components API ---
  loadSalaryComponents(filters: { component_type?: string; is_active?: boolean; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<SalaryComponent>> {
    this.loadingComponents.set(true);
    let params = new HttpParams();
    if (filters.component_type) params = params.set('component_type', filters.component_type);
    if (filters.is_active !== undefined) params = params.set('is_active', String(filters.is_active));
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.offset) params = params.set('offset', String(filters.offset));

    return this.http.get<PaginatedResponse<SalaryComponent>>(`${this.apiUrl}/salary-components`, { params }).pipe(
      tap({
        next: (res) => {
          this.salaryComponents.set(res.items);
          this.totalSalaryComponents.set(res.total);
          this.loadingComponents.set(false);
        },
        error: () => this.loadingComponents.set(false)
      })
    );
  }

  createSalaryComponent(payload: SalaryComponentCreate): Observable<SalaryComponent> {
    return this.http.post<SalaryComponent>(`${this.apiUrl}/salary-components`, payload).pipe(
      tap(() => this.loadSalaryComponents().subscribe())
    );
  }

  updateSalaryComponent(id: number, payload: Partial<SalaryComponentCreate>): Observable<SalaryComponent> {
    return this.http.put<SalaryComponent>(`${this.apiUrl}/salary-components/${id}`, payload).pipe(
      tap(() => this.loadSalaryComponents().subscribe())
    );
  }

  deleteSalaryComponent(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/salary-components/${id}`).pipe(
      tap(() => this.loadSalaryComponents().subscribe())
    );
  }

  // --- 3.2 Salary Structures API ---
  loadSalaryStructures(filters: { limit?: number; offset?: number } = {}): Observable<PaginatedResponse<SalaryStructure>> {
    this.loadingStructures.set(true);
    let params = new HttpParams();
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.offset) params = params.set('offset', String(filters.offset));

    return this.http.get<PaginatedResponse<SalaryStructure>>(`${this.apiUrl}/salary-structures`, { params }).pipe(
      tap({
        next: (res) => {
          this.salaryStructures.set(res.items);
          this.totalSalaryStructures.set(res.total);
          this.loadingStructures.set(false);
        },
        error: () => this.loadingStructures.set(false)
      })
    );
  }

  createSalaryStructure(payload: SalaryStructureCreate): Observable<SalaryStructure> {
    return this.http.post<SalaryStructure>(`${this.apiUrl}/salary-structures`, payload).pipe(
      tap(() => this.loadSalaryStructures().subscribe())
    );
  }

  // --- 3.3 Employee Salaries API ---
  loadEmployeeSalaries(filters: { employee_id?: number; structure_id?: number; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<EmployeeSalary>> {
    this.loadingSalaries.set(true);
    let params = new HttpParams();
    if (filters.employee_id) params = params.set('employee_id', String(filters.employee_id));
    if (filters.structure_id) params = params.set('structure_id', String(filters.structure_id));
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.offset) params = params.set('offset', String(filters.offset));

    return this.http.get<PaginatedResponse<EmployeeSalary>>(`${this.apiUrl}/employee-salaries`, { params }).pipe(
      tap({
        next: (res) => {
          this.employeeSalaries.set(res.items);
          this.totalEmployeeSalaries.set(res.total);
          this.loadingSalaries.set(false);
        },
        error: () => this.loadingSalaries.set(false)
      })
    );
  }

  assignEmployeeSalary(payload: EmployeeSalaryCreate): Observable<EmployeeSalary> {
    return this.http.post<EmployeeSalary>(`${this.apiUrl}/employee-salaries`, payload).pipe(
      tap(() => this.loadEmployeeSalaries().subscribe())
    );
  }

  // --- 3.4 Salary Revisions API ---
  loadSalaryRevisions(filters: { employee_id?: number; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<SalaryRevision>> {
    this.loadingRevisions.set(true);
    let params = new HttpParams();
    if (filters.employee_id) params = params.set('employee_id', String(filters.employee_id));
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.offset) params = params.set('offset', String(filters.offset));

    return this.http.get<PaginatedResponse<SalaryRevision>>(`${this.apiUrl}/salary-revisions`, { params }).pipe(
      tap({
        next: (res) => {
          this.salaryRevisions.set(res.items);
          this.totalSalaryRevisions.set(res.total);
          this.loadingRevisions.set(false);
        },
        error: () => this.loadingRevisions.set(false)
      })
    );
  }

  createSalaryRevision(payload: SalaryRevisionCreate): Observable<SalaryRevision> {
    return this.http.post<SalaryRevision>(`${this.apiUrl}/salary-revisions`, payload).pipe(
      tap(() => {
        this.loadSalaryRevisions().subscribe();
        this.loadEmployeeSalaries().subscribe();
      })
    );
  }

  // --- 3.5 Payroll Periods API ---
  loadPayrollPeriods(year?: number): Observable<PaginatedResponse<PayrollPeriod>> {
    this.loadingPeriods.set(true);
    let params = new HttpParams();
    if (year) params = params.set('year', String(year));

    return this.http.get<PaginatedResponse<PayrollPeriod>>(`${this.apiUrl}/payroll-periods`, { params }).pipe(
      tap({
        next: (res) => {
          this.payrollPeriods.set(res.items);
          this.totalPayrollPeriods.set(res.total);
          if (res.items.length > 0 && !this.activePeriod()) {
            this.activePeriod.set(res.items[0]);
          }
          this.loadingPeriods.set(false);
        },
        error: () => this.loadingPeriods.set(false)
      })
    );
  }

  createPayrollPeriod(payload: PayrollPeriodCreate): Observable<PayrollPeriod> {
    return this.http.post<PayrollPeriod>(`${this.apiUrl}/payroll-periods`, payload).pipe(
      tap((newPeriod) => {
        this.activePeriod.set(newPeriod);
        this.loadPayrollPeriods().subscribe();
      })
    );
  }

  executePayrollWorkflow(periodId: number, action: 'PROCESS' | 'SUBMIT' | 'VERIFY' | 'APPROVE' | 'LOCK' | 'UNLOCK', remarks?: string): Observable<PayrollPeriod> {
    return this.http.post<PayrollPeriod>(`${this.apiUrl}/payroll-periods/${periodId}/workflow`, { action, remarks }).pipe(
      tap((updatedPeriod) => {
        this.activePeriod.set(updatedPeriod);
        this.loadPayrollPeriods().subscribe();
        this.loadPayslips(periodId).subscribe();
      })
    );
  }

  // --- 3.7 - 3.10 & 3.20 Payslips Register API ---
  loadPayslips(periodId: number, filters: { employee_id?: number; search?: string; limit?: number; offset?: number } = {}): Observable<PayrollPayslipPaginatedResponse> {
    this.loadingPayslips.set(true);
    let params = new HttpParams();
    if (filters.employee_id) params = params.set('employee_id', String(filters.employee_id));
    if (filters.search) params = params.set('search', filters.search);
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.offset) params = params.set('offset', String(filters.offset));

    return this.http.get<PayrollPayslipPaginatedResponse>(`${this.apiUrl}/payroll-periods/${periodId}/payslips`, { params }).pipe(
      tap({
        next: (res) => {
          this.payslips.set(res.items);
          this.totalPayslips.set(res.total);
          this.summaryGross.set(res.summary_gross);
          this.summaryDeductions.set(res.summary_deductions);
          this.summaryNet.set(res.summary_net);
          this.loadingPayslips.set(false);
        },
        error: () => this.loadingPayslips.set(false)
      })
    );
  }

  disbursePeriod(periodId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/payroll-periods/${periodId}/disburse`, {}).pipe(
      tap(() => {
        this.loadPayrollPeriods().subscribe();
        this.loadPayslips(periodId).subscribe();
      })
    );
  }

  // --- 3.14 Staff Loans API ---
  loadStaffLoans(filters: { employee_id?: number; status?: string; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<StaffLoan>> {
    this.loadingLoans.set(true);
    let params = new HttpParams();
    if (filters.employee_id) params = params.set('employee_id', String(filters.employee_id));
    if (filters.status) params = params.set('status', filters.status);
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.offset) params = params.set('offset', String(filters.offset));

    return this.http.get<PaginatedResponse<StaffLoan>>(`${this.apiUrl}/staff-loans`, { params }).pipe(
      tap({
        next: (res) => {
          this.staffLoans.set(res.items);
          this.totalStaffLoans.set(res.total);
          this.loadingLoans.set(false);
        },
        error: () => this.loadingLoans.set(false)
      })
    );
  }

  createStaffLoan(payload: StaffLoanCreate): Observable<StaffLoan> {
    return this.http.post<StaffLoan>(`${this.apiUrl}/staff-loans`, payload).pipe(
      tap(() => this.loadStaffLoans().subscribe())
    );
  }

  // --- 3.15 Salary Advances API ---
  loadSalaryAdvances(filters: { employee_id?: number; recovery_period?: string; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<SalaryAdvance>> {
    this.loadingAdvances.set(true);
    let params = new HttpParams();
    if (filters.employee_id) params = params.set('employee_id', String(filters.employee_id));
    if (filters.recovery_period) params = params.set('recovery_period', filters.recovery_period);
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.offset) params = params.set('offset', String(filters.offset));

    return this.http.get<PaginatedResponse<SalaryAdvance>>(`${this.apiUrl}/salary-advances`, { params }).pipe(
      tap({
        next: (res) => {
          this.salaryAdvances.set(res.items);
          this.totalSalaryAdvances.set(res.total);
          this.loadingAdvances.set(false);
        },
        error: () => this.loadingAdvances.set(false)
      })
    );
  }

  createSalaryAdvance(payload: SalaryAdvanceCreate): Observable<SalaryAdvance> {
    return this.http.post<SalaryAdvance>(`${this.apiUrl}/salary-advances`, payload).pipe(
      tap(() => this.loadSalaryAdvances().subscribe())
    );
  }

  // --- 3.16 Bonuses & Incentives API ---
  loadBonusesIncentives(filters: { period_code?: string; bonus_type?: string; limit?: number; offset?: number } = {}): Observable<PaginatedResponse<BonusIncentive>> {
    this.loadingBonuses.set(true);
    let params = new HttpParams();
    if (filters.period_code) params = params.set('period_code', filters.period_code);
    if (filters.bonus_type) params = params.set('bonus_type', filters.bonus_type);
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.offset) params = params.set('offset', String(filters.offset));

    return this.http.get<PaginatedResponse<BonusIncentive>>(`${this.apiUrl}/bonuses-incentives`, { params }).pipe(
      tap({
        next: (res) => {
          this.bonusesIncentives.set(res.items);
          this.totalBonusesIncentives.set(res.total);
          this.loadingBonuses.set(false);
        },
        error: () => this.loadingBonuses.set(false)
      })
    );
  }

  createBonusIncentive(payload: BonusIncentiveCreate): Observable<BonusIncentive> {
    return this.http.post<BonusIncentive>(`${this.apiUrl}/bonuses-incentives`, payload).pipe(
      tap(() => this.loadBonusesIncentives().subscribe())
    );
  }

  // --- 3.11 Tax Slabs API ---
  loadTaxSlabs(taxYear: string = '2025-2026'): Observable<TaxSlab[]> {
    this.loadingTaxSlabs.set(true);
    let params = new HttpParams().set('tax_year', taxYear);
    return this.http.get<TaxSlab[]>(`${this.apiUrl}/tax-slabs`, { params }).pipe(
      tap({
        next: (slabs) => {
          this.taxSlabs.set(slabs);
          this.loadingTaxSlabs.set(false);
        },
        error: () => this.loadingTaxSlabs.set(false)
      })
    );
  }

  createTaxSlab(payload: TaxSlabCreate): Observable<TaxSlab> {
    return this.http.post<TaxSlab>(`${this.apiUrl}/tax-slabs`, payload).pipe(
      tap(() => this.loadTaxSlabs(payload.tax_year).subscribe())
    );
  }

  updateTaxSlab(slabId: number, payload: TaxSlabCreate): Observable<TaxSlab> {
    return this.http.put<TaxSlab>(`${this.apiUrl}/tax-slabs/${slabId}`, payload).pipe(
      tap(() => this.loadTaxSlabs(payload.tax_year).subscribe())
    );
  }

  updateStaffLoan(loanId: number, payload: Partial<StaffLoanCreate>): Observable<StaffLoan> {
    return this.http.put<StaffLoan>(`${this.apiUrl}/staff-loans/${loanId}`, payload).pipe(
      tap(() => this.loadStaffLoans().subscribe())
    );
  }

  updateSalaryAdvance(advanceId: number, payload: Partial<SalaryAdvanceCreate>): Observable<SalaryAdvance> {
    return this.http.put<SalaryAdvance>(`${this.apiUrl}/salary-advances/${advanceId}`, payload).pipe(
      tap(() => this.loadSalaryAdvances().subscribe())
    );
  }

  // --- 3.12 & 3.13 Benefit & Gratuity Policies API ---
  loadBenefitPolicies(policyType?: string, limit: number = 20, offset: number = 0): Observable<PaginatedResponse<BenefitPolicy>> {
    this.loadingBenefitPolicies.set(true);
    let params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));
    if (policyType) params = params.set('policy_type', policyType);

    return this.http.get<PaginatedResponse<BenefitPolicy>>(`${this.apiUrl}/benefit-policies`, { params }).pipe(
      tap({
        next: (res) => {
          this.benefitPolicies.set(res.items);
          this.totalBenefitPolicies.set(res.total);
          this.loadingBenefitPolicies.set(false);
        },
        error: () => this.loadingBenefitPolicies.set(false)
      })
    );
  }

  createBenefitPolicy(payload: BenefitPolicyCreate): Observable<BenefitPolicy> {
    return this.http.post<BenefitPolicy>(`${this.apiUrl}/benefit-policies`, payload).pipe(
      tap(() => this.loadBenefitPolicies().subscribe())
    );
  }

  updateBenefitPolicy(policyId: number, payload: Partial<BenefitPolicyCreate>): Observable<BenefitPolicy> {
    return this.http.put<BenefitPolicy>(`${this.apiUrl}/benefit-policies/${policyId}`, payload).pipe(
      tap(() => this.loadBenefitPolicies().subscribe())
    );
  }

  // --- 3.17 Payroll Deep Validation API ---
  loadPayrollValidation(periodId: number): Observable<PayrollValidationSummary> {
    this.loadingValidation.set(true);
    return this.http.get<PayrollValidationSummary>(`${this.apiUrl}/payroll-periods/${periodId}/validation`).pipe(
      tap({
        next: (summary) => {
          this.validationSummary.set(summary);
          this.loadingValidation.set(false);
        },
        error: () => this.loadingValidation.set(false)
      })
    );
  }
}

