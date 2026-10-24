import { Routes } from '@angular/router';

export const FIXED_ASSETS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/fixed-assets-dashboard.component').then(
        (m) => m.FixedAssetsDashboardComponent
      )
  },
  {
    path: 'asset-register/new',
    loadComponent: () =>
      import('./asset-register/asset-register.component').then(
        (m) => m.AssetRegisterComponent
      )
  },
  {
    path: 'asset-register/:id/edit',
    loadComponent: () =>
      import('./asset-register/asset-register.component').then(
        (m) => m.AssetRegisterComponent
      )
  },
  {
    path: 'asset-register',
    loadComponent: () =>
      import('./asset-register/asset-register.component').then(
        (m) => m.AssetRegisterComponent
      )
  },
  {
    path: 'depreciation',
    loadComponent: () =>
      import('./depreciation/depreciation-schedule.component').then(
        (m) => m.DepreciationScheduleComponent
      )
  },
  {
    path: 'transfers',
    loadComponent: () =>
      import('./transfers/asset-transfers.component').then(
        (m) => m.AssetTransfersComponent
      )
  },
  {
    path: 'maintenance',
    loadComponent: () =>
      import('./maintenance/asset-maintenance.component').then(
        (m) => m.AssetMaintenanceComponent
      )
  },
  {
    path: 'disposals',
    loadComponent: () =>
      import('./disposals/asset-disposals.component').then(
        (m) => m.AssetDisposalsComponent
      )
  },
  {
    path: 'verification',
    loadComponent: () =>
      import('./verification/asset-verification.component').then(
        (m) => m.AssetVerificationComponent
      )
  },
  {
    path: 'gl-reconciliation',
    loadComponent: () =>
      import('./gl-reconciliation/asset-gl-reconciliation.component').then(
        (m) => m.AssetGlReconciliationComponent
      )
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/asset-reports.component').then(
        (m) => m.AssetReportsComponent
      )
  }
];
