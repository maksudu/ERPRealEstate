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
    path: 'settings/rbac',
    loadComponent: () => import('./features/settings/rbac/rbac-management.component').then(m => m.RbacManagementComponent),
    title: 'Auth & Project-Scoped RBAC - Bangladesh Real Estate ERP'
  },
  {
    path: 'settings/components',
    loadComponent: () => import('./features/settings/components-gallery/components-gallery.component').then(m => m.ComponentsGalleryComponent),
    title: 'Enterprise Reusable Components - Bangladesh Real Estate ERP'
  },
  {
    path: '**',
    redirectTo: 'settings/lookups'
  }
];
