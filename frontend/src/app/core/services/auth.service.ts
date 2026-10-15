import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProjectAssignment {
  project_id: number;
  role_code: string;
  can_view_financials: boolean;
}

export interface OrganizationSummary {
  id: number;
  organization_code: string;
  legal_name_en: string;
  legal_name_bn: string;
  tin_number?: string;
  bin_vat_number?: string;
  rehab_membership_number?: string;
}

export interface UserProfile {
  id: number;
  organization_id: number;
  username: string;
  email: string;
  phone_number?: string;
  full_name_en: string;
  full_name_bn: string;
  is_group_admin: boolean;
  is_active: boolean;
  organization?: OrganizationSummary;
  project_assignments: UserProjectAssignment[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface ProjectOption {
  id: number;
  name: string;
  location: string;
  role: string;
  canViewFinancials: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = `${environment.apiUrl}/auth`;

  // Reactive State Signals
  currentUser = signal<UserProfile | null>(null);
  accessToken = signal<string | null>(null);
  refreshToken = signal<string | null>(null);
  activeProjectId = signal<number>(101); // Default to Project 101

  // Computed Signals
  isAuthenticated = computed(() => !!this.accessToken() && !!this.currentUser());
  isGroupAdmin = computed(() => this.currentUser()?.is_group_admin ?? false);

  // Available Projects for active user
  availableProjects = computed<ProjectOption[]>(() => {
    const user = this.currentUser();
    if (!user) return [];

    // System projects list
    const systemProjects: Record<number, { name: string; location: string }> = {
      101: { name: 'Grand Emerald Tower', location: 'Gulshan-2, Dhaka' },
      102: { name: 'Blue Ocean Horizon', location: 'Bashundhara R/A, Dhaka' },
      103: { name: 'Bay Marina Condominium', location: 'Panchlaish, Chattogram' }
    };

    if (user.is_group_admin) {
      // Group Admins have unrestricted access to all company projects
      return Object.entries(systemProjects).map(([id, info]) => ({
        id: Number(id),
        name: info.name,
        location: info.location,
        role: 'GROUP_ADMIN',
        canViewFinancials: true
      }));
    }

    // Filter by assignments
    return user.project_assignments.map(a => ({
      id: a.project_id,
      name: systemProjects[a.project_id]?.name || `Project #${a.project_id}`,
      location: systemProjects[a.project_id]?.location || 'Bangladesh',
      role: a.role_code,
      canViewFinancials: a.can_view_financials
    }));
  });

  activeProjectDetails = computed(() => {
    const pid = this.activeProjectId();
    return this.availableProjects().find(p => p.id === pid) || null;
  });

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    const token = localStorage.getItem('erp_access_token');
    const refresh = localStorage.getItem('erp_refresh_token');
    const userStr = localStorage.getItem('erp_user_profile');
    const savedPid = localStorage.getItem('erp_active_project_id');

    if (token && userStr) {
      try {
        this.accessToken.set(token);
        this.refreshToken.set(refresh);
        this.currentUser.set(JSON.parse(userStr));
        if (savedPid) {
          this.activeProjectId.set(Number(savedPid));
        }
      } catch {
        this.logout();
      }
    }
  }

  login(credentials: { username: string; password: string }): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(res => {
        this.setSession(res);
      })
    );
  }

  private setSession(res: TokenResponse): void {
    this.accessToken.set(res.access_token);
    this.refreshToken.set(res.refresh_token);
    this.currentUser.set(res.user);

    localStorage.setItem('erp_access_token', res.access_token);
    localStorage.setItem('erp_refresh_token', res.refresh_token);
    localStorage.setItem('erp_user_profile', JSON.stringify(res.user));

    // Auto set first accessible project
    const projects = this.availableProjects();
    if (projects.length > 0) {
      this.setProjectScope(projects[0].id);
    }
  }

  setProjectScope(projectId: number): void {
    this.activeProjectId.set(projectId);
    localStorage.setItem('erp_active_project_id', String(projectId));
  }

  refreshSession(): Observable<TokenResponse> {
    const rToken = this.refreshToken();
    if (!rToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<TokenResponse>(`${this.baseUrl}/refresh`, { refresh_token: rToken }).pipe(
      tap(res => {
        this.setSession(res);
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    if (this.accessToken()) {
      this.http.post(`${this.baseUrl}/logout`, {}).subscribe({ error: () => {} });
    }
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('erp_access_token');
    localStorage.removeItem('erp_refresh_token');
    localStorage.removeItem('erp_user_profile');
    localStorage.removeItem('erp_active_project_id');
  }

  testProjectScope(): Observable<any> {
    return this.http.get(`${this.baseUrl}/test-project-scope`);
  }
}
