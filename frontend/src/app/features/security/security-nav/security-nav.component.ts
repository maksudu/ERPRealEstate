import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SecurityNavTab {
  id: string;
  label: string;
  code: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-security-nav',
  standalone: true,
  imports: [CommonModule],
  template: ''
})
export class SecurityNavComponent {
  tabs: SecurityNavTab[] = [
    { id: 'dashboard', label: 'Executive Cockpit', code: 'SEC-01', route: '/security/dashboard' },
    { id: 'users', label: 'User Accounts & Lifecycle', code: 'SEC-02', route: '/security/users' },
    { id: 'roles', label: 'Role Management (25 Roles)', code: 'SEC-03', route: '/security/roles' },
    { id: 'permissions', label: 'Permission Matrix', code: 'SEC-04', route: '/security/permissions' },
    { id: 'project-access', label: 'Project & Scope Access', code: 'SEC-05', route: '/security/project-access' },
    { id: 'workflow-security', label: 'Maker-Checker Approval', code: 'SEC-06', route: '/security/workflow-security' },
    { id: 'auth-security', label: 'Auth & Password Policy', code: 'SEC-07', route: '/security/auth-security' },
    { id: 'api-mobile-security', label: 'API & Mobile Security', code: 'SEC-08', route: '/security/api-mobile-security' },
    { id: 'audit-logs', label: 'Audit Trail & Sessions', code: 'SEC-09', route: '/security/audit-logs' },
    { id: 'monitoring-reviews', label: 'Incidents & Reviews', code: 'SEC-10', route: '/security/monitoring-reviews' },
    { id: 'reports', label: 'Security Reports Suite', code: 'SEC-11', route: '/security/reports' }
  ];
}
