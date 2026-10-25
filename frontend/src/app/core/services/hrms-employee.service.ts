import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Employee,
  EmployeeCreatePayload,
  EmployeeUpdatePayload,
  EmployeePaginatedResponse
} from '../models/hrms-employee.model';

export interface EmployeeFilterParams {
  limit?: number;
  offset?: number;
  all?: boolean;
  category?: string;
  workforce_category?: string;
  department_id?: number;
  designation_id?: number;
  employment_type?: string;
  status?: string;
  project_id?: number;
  branch_id?: number;
  company_id?: number;
  system_role?: string;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HrmsEmployeeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hrms/employees`;

  // Reactive State Signals
  employees = signal<Employee[]>([]);
  totalEmployees = signal<number>(0);
  limit = signal<number>(10);
  offset = signal<number>(0);
  isLoading = signal<boolean>(false);
  selectedEmployee = signal<Employee | null>(null);

  /**
   * Fetch paginated and filtered employees list from backend
   */
  loadEmployees(filterParams: EmployeeFilterParams = {}): Observable<EmployeePaginatedResponse> {
    this.isLoading.set(true);

    let params = new HttpParams()
      .set('limit', String(filterParams.limit ?? this.limit()))
      .set('offset', String(filterParams.offset ?? this.offset()));

    if (filterParams.all) {
      params = params.set('all', 'true');
    }
    if (filterParams.category) {
      params = params.set('category', filterParams.category);
    }
    if (filterParams.workforce_category) {
      params = params.set('workforce_category', filterParams.workforce_category);
    }
    if (filterParams.department_id) {
      params = params.set('department_id', String(filterParams.department_id));
    }
    if (filterParams.designation_id) {
      params = params.set('designation_id', String(filterParams.designation_id));
    }
    if (filterParams.employment_type) {
      params = params.set('employment_type', filterParams.employment_type);
    }
    if (filterParams.status) {
      params = params.set('status', filterParams.status);
    }
    if (filterParams.project_id) {
      params = params.set('project_id', String(filterParams.project_id));
    }
    if (filterParams.branch_id) {
      params = params.set('branch_id', String(filterParams.branch_id));
    }
    if (filterParams.company_id) {
      params = params.set('company_id', String(filterParams.company_id));
    }
    if (filterParams.system_role) {
      params = params.set('system_role', filterParams.system_role);
    }
    if (filterParams.search && filterParams.search.trim()) {
      params = params.set('search', filterParams.search.trim());
    }

    return this.http.get<EmployeePaginatedResponse>(this.apiUrl, { params }).pipe(
      tap({
        next: (response) => {
          this.employees.set(response.items || []);
          this.totalEmployees.set(response.total || 0);
          this.limit.set(response.limit || 10);
          this.offset.set(response.offset || 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      })
    );
  }

  /**
   * Get employee by ID
   */
  getEmployee(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new employee
   */
  createEmployee(payload: EmployeeCreatePayload): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, payload);
  }

  /**
   * Update existing employee
   */
  updateEmployee(id: number, payload: EmployeeUpdatePayload): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Delete employee
   */
  deleteEmployee(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Quick status change (ACTIVE, PROBATION, CONFIRMED, RESIGNED, TERMINATED, ON_LEAVE)
   */
  updateEmployeeStatus(id: number, status: string): Observable<Employee> {
    return this.http.patch<Employee>(`${this.apiUrl}/${id}/status`, { status }).pipe(
      tap((updated) => {
        const current = this.employees();
        const index = current.findIndex(e => e.id === id);
        if (index !== -1) {
          const next = [...current];
          next[index] = updated;
          this.employees.set(next);
        }
      })
    );
  }

  /**
   * Upload photograph / avatar
   */
  uploadPhoto(file: File): Observable<{ status: string; photo_url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ status: string; photo_url: string; filename: string }>(
      `${this.apiUrl}/upload-photo`,
      formData
    );
  }
}
