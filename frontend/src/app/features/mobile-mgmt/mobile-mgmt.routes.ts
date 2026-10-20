import { Routes } from '@angular/router';

export const MOBILE_MGMT_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/mobile-mgmt-dashboard.component').then(m => m.MobileMgmtDashboardComponent)
  },
  {
    path: 'projects',
    loadComponent: () => import('./projects/mobile-mgmt-projects.component').then(m => m.MobileMgmtProjectsComponent)
  },
  {
    path: 'sales-analytics',
    loadComponent: () => import('./sales-analytics/mobile-mgmt-sales-analytics.component').then(m => m.MobileMgmtSalesAnalyticsComponent)
  },
  {
    path: 'cashflow',
    loadComponent: () => import('./cashflow/mobile-mgmt-cashflow.component').then(m => m.MobileMgmtCashFlowComponent)
  },
  {
    path: 'approvals',
    loadComponent: () => import('./approvals/mobile-mgmt-approvals.component').then(m => m.MobileMgmtApprovalsComponent)
  },
  {
    path: 'procurement',
    loadComponent: () => import('./procurement/mobile-mgmt-procurement.component').then(m => m.MobileMgmtProcurementComponent)
  },
  {
    path: 'construction',
    loadComponent: () => import('./construction/mobile-mgmt-construction.component').then(m => m.MobileMgmtConstructionComponent)
  },
  {
    path: 'hr-overview',
    loadComponent: () => import('./hr-overview/mobile-mgmt-hr-overview.component').then(m => m.MobileMgmtHrOverviewComponent)
  },
  {
    path: 'compliance',
    loadComponent: () => import('./compliance/mobile-mgmt-compliance.component').then(m => m.MobileMgmtComplianceComponent)
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/mobile-mgmt-reports.component').then(m => m.MobileMgmtReportsComponent)
  }
];
