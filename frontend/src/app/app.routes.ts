import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'settings/lookups',
    pathMatch: 'full'
  },
  {
    path: 'settings/lookups',
    loadComponent: () => import('./features/settings/lookups/lookup-management.component').then(m => m.LookupManagementComponent),
    title: 'Dynamic Lookups & Dropdowns - Bangladesh Real Estate ERP'
  },
  {
    path: '**',
    redirectTo: 'settings/lookups'
  }
];
