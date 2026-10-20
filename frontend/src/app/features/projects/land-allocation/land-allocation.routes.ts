import { Routes } from '@angular/router';

export const LAND_ALLOCATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./land-allocation.component').then(m => m.ProjectLandAllocationComponent),
    title: 'Project Land Allocation'
  },
  {
    path: 'create',
    loadComponent: () => import('./land-allocation-form.component').then(m => m.ProjectLandAllocationFormComponent),
    title: 'Create Land Allocation'
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./land-allocation-form.component').then(m => m.ProjectLandAllocationFormComponent),
    title: 'Edit Land Allocation'
  }
];
