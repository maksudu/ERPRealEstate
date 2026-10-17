import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Company, CompanyCreatePayload,
  LegalEntity, LegalEntityCreatePayload,
  Branch, BranchCreatePayload,
  ProjectOffice, ProjectOfficeCreatePayload,
  OrgHierarchyResponse
} from '../models/hrms-org.model';

@Injectable({
  providedIn: 'root'
})
export class HrmsOrgService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/hrms`;

  // Reactive signals
  companies = signal<Company[]>([]);
  legalEntities = signal<LegalEntity[]>([]);
  branches = signal<Branch[]>([]);
  projectOffices = signal<ProjectOffice[]>([]);
  orgHierarchy = signal<OrgHierarchyResponse | null>(null);
  isLoading = signal<boolean>(false);

  // --- Company Master ---
  loadCompanies(status?: string): Observable<Company[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    this.isLoading.set(true);
    return this.http.get<Company[]>(`${this.baseUrl}/companies`, { params }).pipe(
      tap({
        next: (res) => {
          this.companies.set(res);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  createCompany(payload: CompanyCreatePayload): Observable<Company> {
    return this.http.post<Company>(`${this.baseUrl}/companies`, payload).pipe(
      tap(() => {
        this.loadCompanies().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  updateCompany(id: number, payload: Partial<CompanyCreatePayload>): Observable<Company> {
    return this.http.put<Company>(`${this.baseUrl}/companies/${id}`, payload).pipe(
      tap(() => {
        this.loadCompanies().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  deleteCompany(id: number, hardDelete = false): Observable<{ success: boolean; message: string }> {
    const params = new HttpParams().set('hard_delete', hardDelete);
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/companies/${id}`, { params }).pipe(
      tap(() => {
        this.loadCompanies().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  // --- Legal Entity Master ---
  loadLegalEntities(companyId?: number, status?: string): Observable<LegalEntity[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('company_id', companyId);
    if (status) params = params.set('status', status);
    return this.http.get<LegalEntity[]>(`${this.baseUrl}/legal-entities`, { params }).pipe(
      tap((res) => this.legalEntities.set(res))
    );
  }

  createLegalEntity(payload: LegalEntityCreatePayload): Observable<LegalEntity> {
    return this.http.post<LegalEntity>(`${this.baseUrl}/legal-entities`, payload).pipe(
      tap(() => {
        this.loadLegalEntities().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  updateLegalEntity(id: number, payload: Partial<LegalEntityCreatePayload>): Observable<LegalEntity> {
    return this.http.put<LegalEntity>(`${this.baseUrl}/legal-entities/${id}`, payload).pipe(
      tap(() => {
        this.loadLegalEntities().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  deleteLegalEntity(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/legal-entities/${id}`).pipe(
      tap(() => {
        this.loadLegalEntities().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  // --- Branch Master ---
  loadBranches(companyId?: number, branchType?: string, division?: string, status?: string): Observable<Branch[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('company_id', companyId);
    if (branchType) params = params.set('branch_type', branchType);
    if (division) params = params.set('division', division);
    if (status) params = params.set('status', status);
    return this.http.get<Branch[]>(`${this.baseUrl}/branches`, { params }).pipe(
      tap((res) => this.branches.set(res))
    );
  }

  createBranch(payload: BranchCreatePayload): Observable<Branch> {
    return this.http.post<Branch>(`${this.baseUrl}/branches`, payload).pipe(
      tap(() => {
        this.loadBranches().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  updateBranch(id: number, payload: Partial<BranchCreatePayload>): Observable<Branch> {
    return this.http.put<Branch>(`${this.baseUrl}/branches/${id}`, payload).pipe(
      tap(() => {
        this.loadBranches().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  deleteBranch(id: number, hardDelete = false): Observable<{ success: boolean; message: string }> {
    const params = new HttpParams().set('hard_delete', hardDelete);
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/branches/${id}`, { params }).pipe(
      tap(() => {
        this.loadBranches().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  // --- Project Office Master ---
  loadProjectOffices(companyId?: number, projectId?: number, status?: string): Observable<ProjectOffice[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('company_id', companyId);
    if (projectId) params = params.set('project_id', projectId);
    if (status) params = params.set('status', status);
    return this.http.get<ProjectOffice[]>(`${this.baseUrl}/project-offices`, { params }).pipe(
      tap((res) => this.projectOffices.set(res))
    );
  }

  createProjectOffice(payload: ProjectOfficeCreatePayload): Observable<ProjectOffice> {
    return this.http.post<ProjectOffice>(`${this.baseUrl}/project-offices`, payload).pipe(
      tap(() => {
        this.loadProjectOffices().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  updateProjectOffice(id: number, payload: Partial<ProjectOfficeCreatePayload>): Observable<ProjectOffice> {
    return this.http.put<ProjectOffice>(`${this.baseUrl}/project-offices/${id}`, payload).pipe(
      tap(() => {
        this.loadProjectOffices().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  deleteProjectOffice(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/project-offices/${id}`).pipe(
      tap(() => {
        this.loadProjectOffices().subscribe();
        this.loadOrgTree().subscribe();
      })
    );
  }

  // --- Visual Hierarchy Tree ---
  loadOrgTree(): Observable<OrgHierarchyResponse> {
    return this.http.get<OrgHierarchyResponse>(`${this.baseUrl}/org-tree`).pipe(
      tap((res) => this.orgHierarchy.set(res))
    );
  }
}
