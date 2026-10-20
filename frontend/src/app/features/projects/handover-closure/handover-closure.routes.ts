import { Routes } from '@angular/router';

export const HANDOVER_CLOSURE_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./handover-closure.component').then(m => m.ProjectHandoverClosureComponent), title: 'Project Handover & Closure' },
  { path: 'create', loadComponent: () => import('./handover-form.component').then(m => m.HandoverFormComponent), title: 'New Property Handover' },
  { path: ':id/edit', loadComponent: () => import('./handover-form.component').then(m => m.HandoverFormComponent), title: 'Edit Property Handover' }
];
