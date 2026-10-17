import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Department,
  DepartmentCreatePayload,
  DepartmentTreeNode,
  DepartmentHeadHistory,
  DepartmentHeadAssignPayload,
  DepartmentProjectMapping,
  DepartmentProjectMappingCreatePayload,
  DepartmentMoveParentPayload,
  DepartmentAuditLog
} from '../models/hrms-department.model';

@Injectable({
  providedIn: 'root'
})
export class HrmsDepartmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms`;

  // Reactive state signals
  departments = signal<Department[]>([]);
  departmentTree = signal<DepartmentTreeNode[]>([]);
  headHistory = signal<DepartmentHeadHistory[]>([]);
  projectMappings = signal<DepartmentProjectMapping[]>([]);
  auditLogs = signal<DepartmentAuditLog[]>([]);
  isLoading = signal<boolean>(false);

  // 1. Load Departments with filter support
  loadDepartments(filters?: {
    company_id?: number | null;
    branch_id?: number | null;
    status?: string | null;
    head_id?: number | null;
    parent_id?: number | null;
    search?: string | null;
  }): Observable<Department[]> {
    this.isLoading.set(true);
    let params = new HttpParams();

    if (filters?.company_id) params = params.set('company_id', filters.company_id.toString());
    if (filters?.branch_id) params = params.set('branch_id', filters.branch_id.toString());
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.head_id) params = params.set('head_id', filters.head_id.toString());
    if (filters?.parent_id !== undefined && filters?.parent_id !== null) {
      params = params.set('parent_id', filters.parent_id.toString());
    }
    if (filters?.search) params = params.set('search', filters.search);

    return this.http.get<Department[]>(`${this.apiUrl}/departments`, { params }).pipe(
      tap({
        next: (items) => {
          this.departments.set(items);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  // 2. Load Department Hierarchy Tree
  loadDepartmentTree(companyId?: number | null): Observable<DepartmentTreeNode[]> {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (companyId) params = params.set('company_id', companyId.toString());

    return this.http.get<DepartmentTreeNode[]>(`${this.apiUrl}/departments/tree`, { params }).pipe(
      tap({
        next: (nodes) => {
          this.departmentTree.set(nodes);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  // 3. Create Department
  createDepartment(payload: DepartmentCreatePayload): Observable<Department> {
    return this.http.post<Department>(`${this.apiUrl}/departments`, payload).pipe(
      tap((created) => {
        this.departments.update(list => [...list, created]);
        this.loadDepartmentTree().subscribe();
      })
    );
  }

  // 4. Update Department
  updateDepartment(id: number, payload: Partial<DepartmentCreatePayload>): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/departments/${id}`, payload).pipe(
      tap((updated) => {
        this.departments.update(list => list.map(item => item.id === id ? updated : item));
        this.loadDepartmentTree().subscribe();
      })
    );
  }

  // 5. Deactivate / Activate Department (Status Patch)
  updateDepartmentStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Observable<Department> {
    const params = new HttpParams().set('status_value', status);
    return this.http.patch<Department>(`${this.apiUrl}/departments/${id}/status`, null, { params }).pipe(
      tap((updated) => {
        this.departments.update(list => list.map(item => item.id === id ? updated : item));
        this.loadDepartmentTree().subscribe();
      })
    );
  }

  // 6. Move Department Parent with Circular Check
  moveDepartmentParent(id: number, payload: DepartmentMoveParentPayload): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/departments/${id}/move-parent`, payload).pipe(
      tap((updated) => {
        this.departments.update(list => list.map(item => item.id === id ? updated : item));
        this.loadDepartmentTree().subscribe();
      })
    );
  }

  // 7. Assign Department Head
  assignDepartmentHead(id: number, payload: DepartmentHeadAssignPayload): Observable<DepartmentHeadHistory> {
    return this.http.post<DepartmentHeadHistory>(`${this.apiUrl}/departments/${id}/assign-head`, payload).pipe(
      tap(() => {
        this.loadDepartments().subscribe();
        this.loadDepartmentTree().subscribe();
      })
    );
  }

  // 8. Load Head Assignment History
  loadHeadHistory(deptId: number): Observable<DepartmentHeadHistory[]> {
    return this.http.get<DepartmentHeadHistory[]>(`${this.apiUrl}/departments/${deptId}/head-history`).pipe(
      tap((items) => this.headHistory.set(items))
    );
  }

  // 9. Load Project Mappings
  loadProjectMappings(deptId: number): Observable<DepartmentProjectMapping[]> {
    return this.http.get<DepartmentProjectMapping[]>(`${this.apiUrl}/departments/${deptId}/project-mappings`).pipe(
      tap((items) => this.projectMappings.set(items))
    );
  }

  // 10. Create Project Mapping
  createProjectMapping(deptId: number, payload: DepartmentProjectMappingCreatePayload): Observable<DepartmentProjectMapping> {
    return this.http.post<DepartmentProjectMapping>(`${this.apiUrl}/departments/${deptId}/project-mappings`, payload).pipe(
      tap((created) => {
        this.projectMappings.update(list => [created, ...list]);
      })
    );
  }

  // 11. Delete Project Mapping
  deleteProjectMapping(mappingId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/departments/project-mappings/${mappingId}`).pipe(
      tap(() => {
        this.projectMappings.update(list => list.filter(m => m.id !== mappingId));
      })
    );
  }

  // 12. Load Audit Trail
  loadAuditTrail(deptId: number): Observable<DepartmentAuditLog[]> {
    return this.http.get<DepartmentAuditLog[]>(`${this.apiUrl}/departments/${deptId}/audit-trail`).pipe(
      tap((items) => this.auditLogs.set(items))
    );
  }

  // 13. Delete Department
  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/departments/${id}`).pipe(
      tap(() => {
        this.departments.update(list => list.filter(d => d.id !== id));
        this.loadDepartmentTree().subscribe();
      })
    );
  }
}
