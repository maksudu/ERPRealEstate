import { Routes } from '@angular/router';

export const CONSTRUCTION_MONITORING_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./construction-monitoring.component').then(m => m.ProjectConstructionMonitoringComponent), title: 'Construction Monitoring' },
  { path: 'create', loadComponent: () => import('./construction-report-form.component').then(m => m.ConstructionReportFormComponent), title: 'New Daily Report' },
  { path: ':id/edit', loadComponent: () => import('./construction-report-form.component').then(m => m.ConstructionReportFormComponent), title: 'Edit Daily Report' }
];
