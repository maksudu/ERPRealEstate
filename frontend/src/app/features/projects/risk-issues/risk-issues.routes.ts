import { Routes } from '@angular/router';

export const RISK_ISSUES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./risk-issues.component').then(m => m.ProjectRiskIssuesComponent), title: 'Project Risks & Issues' },
  { path: 'create', loadComponent: () => import('./risk-issue-form.component').then(m => m.RiskIssueFormComponent), title: 'New Project Risk' },
  { path: ':id/edit', loadComponent: () => import('./risk-issue-form.component').then(m => m.RiskIssueFormComponent), title: 'Edit Project Risk' }
];
