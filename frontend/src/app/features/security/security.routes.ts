import { Routes } from '@angular/router';

export const SECURITY_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/security-dashboard.component').then(
        (m) => m.SecurityDashboardComponent
      )
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./users/user-management.component').then(
        (m) => m.UserManagementComponent
      )
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('./roles/role-management.component').then(
        (m) => m.RoleManagementComponent
      )
  },
  {
    path: 'permissions',
    loadComponent: () =>
      import('./permissions/permission-management.component').then(
        (m) => m.PermissionManagementComponent
      )
  },
  {
    path: 'project-access',
    loadComponent: () =>
      import('./project-access/project-access.component').then(
        (m) => m.ProjectAccessComponent
      )
  },
  {
    path: 'workflow-security',
    loadComponent: () =>
      import('./workflow-security/workflow-security.component').then(
        (m) => m.WorkflowSecurityComponent
      )
  },
  {
    path: 'auth-security',
    loadComponent: () =>
      import('./auth-security/auth-security.component').then(
        (m) => m.AuthSecurityComponent
      )
  },
  {
    path: 'api-mobile-security',
    loadComponent: () =>
      import('./api-mobile-security/api-mobile-security.component').then(
        (m) => m.ApiMobileSecurityComponent
      )
  },
  {
    path: 'audit-logs',
    loadComponent: () =>
      import('./audit-logs/audit-logs.component').then(
        (m) => m.AuditLogsComponent
      )
  },
  {
    path: 'monitoring-reviews',
    loadComponent: () =>
      import('./monitoring-reviews/monitoring-reviews.component').then(
        (m) => m.MonitoringReviewsComponent
      )
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/security-reports.component').then(
        (m) => m.SecurityReportsComponent
      )
  }
];
