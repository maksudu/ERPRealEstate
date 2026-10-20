import { Routes } from '@angular/router';

export const MOBILE_SITE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/mobile-site-dashboard.component').then(m => m.MobileSiteDashboardComponent)
  },
  {
    path: 'dpr',
    loadComponent: () => import('./dpr/mobile-site-dpr.component').then(m => m.MobileSiteDprComponent)
  },
  {
    path: 'tasks',
    loadComponent: () => import('./tasks/mobile-site-tasks.component').then(m => m.MobileSiteTasksComponent)
  },
  {
    path: 'requisitions',
    loadComponent: () => import('./requisitions/mobile-site-requisitions.component').then(m => m.MobileSiteRequisitionsComponent)
  },
  {
    path: 'transactions',
    loadComponent: () => import('./transactions/mobile-site-transactions.component').then(m => m.MobileSiteTransactionsComponent)
  },
  {
    path: 'photos',
    loadComponent: () => import('./photos/mobile-site-photos.component').then(m => m.MobileSitePhotosComponent)
  },
  {
    path: 'quality',
    loadComponent: () => import('./quality/mobile-site-quality.component').then(m => m.MobileSiteQualityComponent)
  },
  {
    path: 'contractors',
    loadComponent: () => import('./contractors/mobile-site-contractors.component').then(m => m.MobileSiteContractorsComponent)
  },
  {
    path: 'safety',
    loadComponent: () => import('./safety/mobile-site-safety.component').then(m => m.MobileSiteSafetyComponent)
  },
  {
    path: 'offline-sync',
    loadComponent: () => import('./offline-sync/mobile-site-offline-sync.component').then(m => m.MobileSiteOfflineSyncComponent)
  }
];
