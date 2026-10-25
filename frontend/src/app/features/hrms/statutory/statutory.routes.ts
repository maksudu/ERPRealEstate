import { Routes } from '@angular/router';
import { StatutoryLayoutComponent } from './statutory-layout.component';

export const STATUTORY_ROUTES: Routes = [
  {
    path: '',
    component: StatutoryLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'tax-config',
        pathMatch: 'full'
      },
      // 1. Tax Config
      {
        path: 'tax-config',
        loadComponent: () => import('./tax-config/tax-config-list.component').then(m => m.TaxConfigListComponent),
        title: 'Tax Configuration | HRMS'
      },
      {
        path: 'tax-config/create',
        loadComponent: () => import('./tax-config/tax-config-form.component').then(m => m.TaxConfigFormComponent),
        title: 'New Tax Slab | HRMS'
      },
      {
        path: 'tax-config/:id/edit',
        loadComponent: () => import('./tax-config/tax-config-form.component').then(m => m.TaxConfigFormComponent),
        title: 'Edit Tax Slab | HRMS'
      },

      // 2. Tax Deductions
      {
        path: 'tax-deductions',
        loadComponent: () => import('./tax-deductions/tax-deduction-list.component').then(m => m.TaxDeductionListComponent),
        title: 'Tax Deduction Records | HRMS'
      },
      {
        path: 'tax-deductions/create',
        loadComponent: () => import('./tax-deductions/tax-deduction-form.component').then(m => m.TaxDeductionFormComponent),
        title: 'Record Tax Deduction | HRMS'
      },
      {
        path: 'tax-deductions/:id/edit',
        loadComponent: () => import('./tax-deductions/tax-deduction-form.component').then(m => m.TaxDeductionFormComponent),
        title: 'Edit Tax Deduction | HRMS'
      },

      // 3. Tax Certificates
      {
        path: 'tax-certificates',
        loadComponent: () => import('./tax-certificates/tax-certificate-list.component').then(m => m.TaxCertificateListComponent),
        title: 'Tax Certificates (Form 108) | HRMS'
      },
      {
        path: 'tax-certificates/create',
        loadComponent: () => import('./tax-certificates/tax-certificate-form.component').then(m => m.TaxCertificateFormComponent),
        title: 'Issue Tax Certificate | HRMS'
      },
      {
        path: 'tax-certificates/:id/edit',
        loadComponent: () => import('./tax-certificates/tax-certificate-form.component').then(m => m.TaxCertificateFormComponent),
        title: 'Edit Tax Certificate | HRMS'
      },

      // 4. Statutory Registers
      {
        path: 'registers',
        loadComponent: () => import('./registers/register-list.component').then(m => m.RegisterListComponent),
        title: 'Statutory Registers | HRMS'
      },
      {
        path: 'registers/create',
        loadComponent: () => import('./registers/register-form.component').then(m => m.RegisterFormComponent),
        title: 'New Statutory Register | HRMS'
      },
      {
        path: 'registers/:id/edit',
        loadComponent: () => import('./registers/register-form.component').then(m => m.RegisterFormComponent),
        title: 'Edit Statutory Register | HRMS'
      },

      // 5. Employment Contracts
      {
        path: 'contracts',
        loadComponent: () => import('./contracts/contract-list.component').then(m => m.ContractListComponent),
        title: 'Employment Contracts | HRMS'
      },
      {
        path: 'contracts/create',
        loadComponent: () => import('./contracts/contract-form.component').then(m => m.ContractFormComponent),
        title: 'New Employment Contract | HRMS'
      },
      {
        path: 'contracts/:id/edit',
        loadComponent: () => import('./contracts/contract-form.component').then(m => m.ContractFormComponent),
        title: 'Edit Employment Contract | HRMS'
      },

      // 6. Policy Acknowledgment
      {
        path: 'policies',
        loadComponent: () => import('./policies/policy-list.component').then(m => m.PolicyListComponent),
        title: 'Policy Acknowledgment | HRMS'
      },
      {
        path: 'policies/create',
        loadComponent: () => import('./policies/policy-form.component').then(m => m.PolicyFormComponent),
        title: 'New Statutory Policy | HRMS'
      },
      {
        path: 'policies/:id/edit',
        loadComponent: () => import('./policies/policy-form.component').then(m => m.PolicyFormComponent),
        title: 'Edit Statutory Policy | HRMS'
      },

      // 7. Audit Documents & Compliance
      {
        path: 'audit-documents',
        loadComponent: () => import('./audit-documents/audit-doc-list.component').then(m => m.AuditDocListComponent),
        title: 'Audit Documents | HRMS'
      },
      {
        path: 'audit-documents/create',
        loadComponent: () => import('./audit-documents/audit-doc-form.component').then(m => m.AuditDocFormComponent),
        title: 'Record Audit Document | HRMS'
      },
      {
        path: 'audit-documents/:id/edit',
        loadComponent: () => import('./audit-documents/audit-doc-form.component').then(m => m.AuditDocFormComponent),
        title: 'Edit Audit Document | HRMS'
      },
      {
        path: 'calendar',
        redirectTo: 'audit-documents',
        pathMatch: 'full'
      }
    ]
  }
];
