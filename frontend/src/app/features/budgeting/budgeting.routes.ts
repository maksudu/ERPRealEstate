import { Routes } from '@angular/router';

export const BUDGETING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./budgeting-dashboard/budgeting-dashboard.component').then(m => m.BudgetingDashboardComponent),
    title: 'Budgeting & Cost Control Dashboard - Bangladesh Real Estate ERP'
  },
  {
    path: 'planning/create',
    loadComponent: () => import('./budget-planning/budget-plan-form.component').then(m => m.BudgetPlanFormComponent),
    title: 'Create Budget Plan - Bangladesh Real Estate ERP'
  },
  {
    path: 'planning/edit/:id',
    loadComponent: () => import('./budget-planning/budget-plan-form.component').then(m => m.BudgetPlanFormComponent),
    title: 'Edit Budget Plan - Bangladesh Real Estate ERP'
  },
  {
    path: 'planning',
    loadComponent: () => import('./budget-planning/budget-planning.component').then(m => m.BudgetPlanningComponent),
    title: 'Budget Planning Master - Bangladesh Real Estate ERP'
  },
  {
    path: 'project-budget',
    loadComponent: () => import('./project-budget/project-budget.component').then(m => m.ProjectBudgetComponent),
    title: 'Project Budget Management - Bangladesh Real Estate ERP'
  },
  {
    path: 'boq-budget',
    loadComponent: () => import('./boq-budget/boq-budget.component').then(m => m.BoqBudgetComponent),
    title: 'BOQ Budget Management - Bangladesh Real Estate ERP'
  },
  {
    path: 'cost-allocation',
    loadComponent: () => import('./cost-allocation/cost-allocation.component').then(m => m.CostAllocationComponent),
    title: 'Cost Allocation Hierarchy - Bangladesh Real Estate ERP'
  },
  {
    path: 'budget-approval',
    loadComponent: () => import('./budget-approval/budget-approval.component').then(m => m.BudgetApprovalComponent),
    title: 'Budget Approval Workflow - Bangladesh Real Estate ERP'
  },
  {
    path: 'purchase-control',
    loadComponent: () => import('./purchase-control/purchase-control.component').then(m => m.PurchaseControlComponent),
    title: 'Purchase Budget Control - Bangladesh Real Estate ERP'
  },
  {
    path: 'expense-control',
    loadComponent: () => import('./expense-control/expense-control.component').then(m => m.ExpenseControlComponent),
    title: 'Expense Control & Contractor Billing - Bangladesh Real Estate ERP'
  },
  {
    path: 'budget-variation',
    loadComponent: () => import('./budget-variation/budget-variation.component').then(m => m.BudgetVariationComponent),
    title: 'Budget Variation & Change Order Approvals - Bangladesh Real Estate ERP'
  },
  {
    path: 'budget-vs-actual',
    loadComponent: () => import('./budget-vs-actual/budget-vs-actual.component').then(m => m.BudgetVsActualComponent),
    title: 'Budget vs Actual Cost Control - Bangladesh Real Estate ERP'
  },
  {
    path: 'forecasting',
    loadComponent: () => import('./forecasting/forecasting.component').then(m => m.ForecastingComponent),
    title: 'Predictive Cost-to-Complete Forecasting - Bangladesh Real Estate ERP'
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/budget-reports.component').then(m => m.BudgetReportsComponent),
    title: 'Budgeting & Cost Control Reports - Bangladesh Real Estate ERP'
  }
];
