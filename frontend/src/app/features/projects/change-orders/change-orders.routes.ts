import { Routes } from '@angular/router';

export const CHANGE_ORDERS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./change-orders.component').then(m => m.ProjectChangeOrdersComponent), title: 'Project Change Orders' },
  { path: 'create', loadComponent: () => import('./change-order-form.component').then(m => m.ChangeOrderFormComponent), title: 'New Change Order' },
  { path: ':id/edit', loadComponent: () => import('./change-order-form.component').then(m => m.ChangeOrderFormComponent), title: 'Edit Change Order' }
];
