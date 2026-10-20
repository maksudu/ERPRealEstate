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
    path: 'users/create',
    loadComponent: () =>
      import('./users/user-form/user-form.component').then(
        (m) => m.UserFormComponent
      )
  },
  {
    path: 'users/:id/edit',
    loadComponent: () =>
      import('./users/user-form/user-form.component').then(
        (m) => m.UserFormComponent
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
    path: 'privileged-accounts',
    loadComponent: () =>
      import('./privileged-accounts/privileged-accounts.component').then(
        (m) => m.PrivilegedAccountsComponent
      )
  },
  {
    path: 'threat-analytics/create',
    loadComponent: () =>
      import('./threat-analytics/threat-incident-form.component').then(
        (m) => m.ThreatIncidentFormComponent
      )
  },
  {
    path: 'threat-analytics/:id/edit',
    loadComponent: () =>
      import('./threat-analytics/threat-incident-form.component').then(
        (m) => m.ThreatIncidentFormComponent
      )
  },
  {
    path: 'threat-analytics',
    loadComponent: () =>
      import('./threat-analytics/threat-analytics.component').then(
        (m) => m.ThreatAnalyticsComponent
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
    path: 'audit-logs/create',
    loadComponent: () =>
      import('./audit-logs/audit-log-form/audit-log-form.component').then(
        (m) => m.AuditLogFormComponent
      )
  },
  {
    path: 'audit-logs/:id/edit',
    loadComponent: () =>
      import('./audit-logs/audit-log-form/audit-log-form.component').then(
        (m) => m.AuditLogFormComponent
      )
  },
  {
    path: 'audit-logs/sessions/create',
    loadComponent: () =>
      import('./audit-logs/session-form/session-form.component').then(
        (m) => m.ActiveSessionFormComponent
      )
  },
  {
    path: 'audit-logs/sessions/:sessionId/edit',
    loadComponent: () =>
      import('./audit-logs/session-form/session-form.component').then(
        (m) => m.ActiveSessionFormComponent
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
    path: 'monitoring-reviews/incidents/create',
    loadComponent: () =>
      import('./monitoring-reviews/incident-form/threat-incident-form.component').then(
        (m) => m.ThreatIncidentFormComponent
      )
  },
  {
    path: 'monitoring-reviews/incidents/:id/edit',
    loadComponent: () =>
      import('./monitoring-reviews/incident-form/threat-incident-form.component').then(
        (m) => m.ThreatIncidentFormComponent
      )
  },
  {
    path: 'monitoring-reviews/reviews/create',
    loadComponent: () =>
      import('./monitoring-reviews/review-form/access-review-form.component').then(
        (m) => m.AccessReviewFormComponent
      )
  },
  {
    path: 'monitoring-reviews/reviews/:id/edit',
    loadComponent: () =>
      import('./monitoring-reviews/review-form/access-review-form.component').then(
        (m) => m.AccessReviewFormComponent
      )
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/security-reports.component').then(
        (m) => m.SecurityReportsComponent
      )
  },
  {
    path: 'user-access-matrix',
    loadComponent: () =>
      import('./reports/security-reports.component').then(
        (m) => m.SecurityReportsComponent
      )
  }
];
