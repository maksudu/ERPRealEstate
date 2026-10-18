import { Routes } from '@angular/router';

export const CONSTRUCTION_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dpr',
    pathMatch: 'full'
  },
  // 1. Daily Progress Report (DPR)
  {
    path: 'dpr',
    loadComponent: () => import('./construction-dpr/construction-dpr.component').then(m => m.ConstructionDprComponent),
    title: 'Daily Progress Reports (DPR) - Bangladesh Real Estate ERP'
  },
  {
    path: 'dpr/create',
    loadComponent: () => import('./construction-dpr/dpr-form.component').then(m => m.DprFormComponent),
    title: 'Log Daily Progress Report (DPR) - Bangladesh Real Estate ERP'
  },
  {
    path: 'dpr/edit/:id',
    loadComponent: () => import('./construction-dpr/dpr-form.component').then(m => m.DprFormComponent),
    title: 'Edit Daily Progress Report (DPR) - Bangladesh Real Estate ERP'
  },

  // 2. Subcontractor Labor Muster Roll
  {
    path: 'labor-muster',
    loadComponent: () => import('./construction-labor-muster/construction-labor-muster.component').then(m => m.ConstructionLaborMusterComponent),
    title: 'Labor Muster Roll & Subcontractors - Bangladesh Real Estate ERP'
  },
  {
    path: 'labor-muster/create',
    loadComponent: () => import('./construction-labor-muster/labor-muster-form.component').then(m => m.LaborMusterFormComponent),
    title: 'Record Labor Muster Entry - Bangladesh Real Estate ERP'
  },
  {
    path: 'labor-muster/edit/:id',
    loadComponent: () => import('./construction-labor-muster/labor-muster-form.component').then(m => m.LaborMusterFormComponent),
    title: 'Edit Labor Muster Entry - Bangladesh Real Estate ERP'
  },
  {
    path: 'contractors/create',
    loadComponent: () => import('./construction-labor-muster/contractor-form.component').then(m => m.ContractorFormComponent),
    title: 'Enlist Trade Subcontractor - Bangladesh Real Estate ERP'
  },
  {
    path: 'contractors/edit/:id',
    loadComponent: () => import('./construction-labor-muster/contractor-form.component').then(m => m.ContractorFormComponent),
    title: 'Edit Subcontractor - Bangladesh Real Estate ERP'
  },

  // 3. Subcontractor RA Billing Engine
  {
    path: 'ra-bills',
    loadComponent: () => import('./construction-ra-bills/construction-ra-bills.component').then(m => m.ConstructionRaBillsComponent),
    title: 'Contractor RA Billing & Contracts - Bangladesh Real Estate ERP'
  },
  {
    path: 'ra-bills/create',
    loadComponent: () => import('./construction-ra-bills/ra-bill-form.component').then(m => m.RaBillFormComponent),
    title: 'Generate New RA Bill - Bangladesh Real Estate ERP'
  },
  {
    path: 'ra-bills/view/:id',
    loadComponent: () => import('./construction-ra-bills/ra-bill-form.component').then(m => m.RaBillFormComponent),
    title: 'Review RA Bill & Signatures - Bangladesh Real Estate ERP'
  },
  {
    path: 'work-orders/create',
    loadComponent: () => import('./construction-ra-bills/work-order-form.component').then(m => m.WorkOrderFormComponent),
    title: 'Issue Subcontractor Work Order - Bangladesh Real Estate ERP'
  },

  // 4. WBS & BOQ Hard Budget Locks
  {
    path: 'wbs-boq',
    loadComponent: () => import('./construction-wbs-boq/construction-wbs-boq.component').then(m => m.ConstructionWbsBoqComponent),
    title: 'WBS & BOQ Hard Budget Locks - Bangladesh Real Estate ERP'
  },
  {
    path: 'wbs-boq/wbs-create',
    loadComponent: () => import('./construction-wbs-boq/wbs-node-form.component').then(m => m.WbsNodeFormComponent),
    title: 'Add WBS Milestone Node - Bangladesh Real Estate ERP'
  },
  {
    path: 'wbs-boq/vo-create',
    loadComponent: () => import('./construction-wbs-boq/variation-order-form.component').then(m => m.VariationOrderFormComponent),
    title: 'Issue Variation Order (VO) - Bangladesh Real Estate ERP'
  },

  // 5. Concrete Cube Crushing Tests
  {
    path: 'cube-tests',
    loadComponent: () => import('./concrete-cube-tests/concrete-cube-tests.component').then(m => m.ConcreteCubeTestsComponent),
    title: 'Concrete Cube Crushing Tests - Bangladesh Real Estate ERP'
  },
  {
    path: 'cube-tests/create',
    loadComponent: () => import('./concrete-cube-tests/cube-test-form.component').then(m => m.CubeTestFormComponent),
    title: 'Log Concrete Cube Sample - Bangladesh Real Estate ERP'
  },
  {
    path: 'cube-tests/record/:id',
    loadComponent: () => import('./concrete-cube-tests/cube-test-form.component').then(m => m.CubeTestFormComponent),
    title: 'Record Cube Crushing Readings - Bangladesh Real Estate ERP'
  },

  // 6. Site Safety NCR Register
  {
    path: 'safety-ncr',
    loadComponent: () => import('./safety-ncr/safety-ncr.component').then(m => m.SafetyNcrComponent),
    title: 'Site Safety NCR Register - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/create',
    loadComponent: () => import('./safety-ncr/safety-ncr-form.component').then(m => m.SafetyNcrFormComponent),
    title: 'Issue Safety NCR - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/rectify/:id',
    loadComponent: () => import('./safety-ncr/safety-ncr-form.component').then(m => m.SafetyNcrFormComponent),
    title: 'Submit Rectification / Close NCR - Bangladesh Real Estate ERP'
  }
];
