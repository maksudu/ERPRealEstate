import { Routes } from '@angular/router';

export const MOBILE_COLLECTION_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/mobile-collection-dashboard.component').then(m => m.MobileCollectionDashboardComponent)
  },
  {
    path: 'customers',
    loadComponent: () => import('./customers/mobile-collection-customers.component').then(m => m.MobileCollectionCustomersComponent)
  },
  {
    path: 'schedules',
    loadComponent: () => import('./schedules/mobile-collection-schedules.component').then(m => m.MobileCollectionSchedulesComponent)
  },
  {
    path: 'due-overdue',
    loadComponent: () => import('./due-overdue/mobile-collection-due-overdue.component').then(m => m.MobileCollectionDueOverdueComponent)
  },
  {
    path: 'payments',
    loadComponent: () => import('./payments/mobile-collection-payments.component').then(m => m.MobileCollectionPaymentsComponent)
  },
  {
    path: 'receipts',
    loadComponent: () => import('./receipts/mobile-collection-receipts.component').then(m => m.MobileCollectionReceiptsComponent)
  },
  {
    path: 'ledger',
    loadComponent: () => import('./ledger/mobile-collection-ledger.component').then(m => m.MobileCollectionLedgerComponent)
  },
  {
    path: 'loans',
    loadComponent: () => import('./loans/mobile-collection-loans.component').then(m => m.MobileCollectionLoansComponent)
  },
  {
    path: 'approvals',
    loadComponent: () => import('./approvals/mobile-collection-approvals.component').then(m => m.MobileCollectionApprovalsComponent)
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/mobile-collection-reports.component').then(m => m.MobileCollectionReportsComponent)
  }
];
