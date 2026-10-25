import { Routes } from '@angular/router';
import { WorkflowLayoutComponent } from './workflow-layout.component';

export const WORKFLOW_ROUTES: Routes = [
  {
    path: '',
    component: WorkflowLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'matrix',
        pathMatch: 'full'
      },
      {
        path: 'matrix',
        loadComponent: () => import('./matrix/matrix-list.component').then(m => m.WorkflowMatrixListComponent),
        title: 'Approval Matrix Rules | HRMS'
      },
      {
        path: 'matrix/create',
        loadComponent: () => import('./matrix/matrix-form.component').then(m => m.WorkflowMatrixFormComponent),
        title: 'New Approval Matrix Rule | HRMS'
      },
      {
        path: 'matrix/:id/edit',
        loadComponent: () => import('./matrix/matrix-form.component').then(m => m.WorkflowMatrixFormComponent),
        title: 'Edit Approval Matrix Rule | HRMS'
      },
      {
        path: 'leaves',
        loadComponent: () => import('./requests/request-list.component').then(m => m.WorkflowRequestListComponent),
        title: 'Leave Approvals | HRMS'
      },
      {
        path: 'overtime',
        loadComponent: () => import('./requests/request-list.component').then(m => m.WorkflowRequestListComponent),
        title: 'Overtime Approvals | HRMS'
      },
      {
        path: 'attendance',
        loadComponent: () => import('./requests/request-list.component').then(m => m.WorkflowRequestListComponent),
        title: 'Attendance Regularization Approvals | HRMS'
      },
      {
        path: 'recruitment',
        loadComponent: () => import('./requests/request-list.component').then(m => m.WorkflowRequestListComponent),
        title: 'Recruitment & Job Offer Approvals | HRMS'
      },
      {
        path: 'salary-revisions',
        loadComponent: () => import('./requests/request-list.component').then(m => m.WorkflowRequestListComponent),
        title: 'Salary Revision Approvals | HRMS'
      },
      {
        path: 'payroll',
        loadComponent: () => import('./requests/request-list.component').then(m => m.WorkflowRequestListComponent),
        title: 'Payroll Batch Approvals | HRMS'
      },
      {
        path: 'expenses',
        loadComponent: () => import('./requests/request-list.component').then(m => m.WorkflowRequestListComponent),
        title: 'Expense & Claim Approvals | HRMS'
      },
      {
        path: 'requests/create',
        loadComponent: () => import('./requests/request-form.component').then(m => m.WorkflowRequestFormComponent),
        title: 'New Workflow Request | HRMS'
      },
      {
        path: 'requests/:id/edit',
        loadComponent: () => import('./requests/request-form.component').then(m => m.WorkflowRequestFormComponent),
        title: 'Edit Workflow Request | HRMS'
      },
      {
        path: 'delegation',
        loadComponent: () => import('./delegation/delegation-list.component').then(m => m.WorkflowDelegationListComponent),
        title: 'Authority Delegation | HRMS'
      },
      {
        path: 'delegation/create',
        loadComponent: () => import('./delegation/delegation-form.component').then(m => m.WorkflowDelegationFormComponent),
        title: 'New Authority Delegation | HRMS'
      },
      {
        path: 'history',
        loadComponent: () => import('./history/history-list.component').then(m => m.WorkflowHistoryListComponent),
        title: 'Approval History & Audit Trail | HRMS'
      }
    ]
  }
];
