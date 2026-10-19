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
  {
    path: 'dpr/view/:id',
    loadComponent: () => import('./construction-dpr/dpr-form.component').then(m => m.DprFormComponent),
    title: 'View Daily Progress Report (DPR) - Bangladesh Real Estate ERP'
  },

  // 2. Subcontractor Labor Muster Roll & Workforce Management
  {
    path: 'labor-muster',
    loadComponent: () => import('./construction-labor-muster/construction-labor-muster.component').then(m => m.ConstructionLaborMusterComponent),
    title: 'Workforce Management & Subcontractor Payments - Bangladesh Real Estate ERP'
  },
  {
    path: 'labor-muster/create',
    loadComponent: () => import('./construction-labor-muster/labor-muster-form.component').then(m => m.LaborMusterFormComponent),
    title: 'Log Daily Attendance - Bangladesh Real Estate ERP'
  },
  {
    path: 'labor-muster/edit/:id',
    loadComponent: () => import('./construction-labor-muster/labor-muster-form.component').then(m => m.LaborMusterFormComponent),
    title: 'Edit Attendance Shift Record - Bangladesh Real Estate ERP'
  },
  {
    path: 'labor-muster/workers/create',
    loadComponent: () => import('./construction-labor-muster/worker-form.component').then(m => m.WorkerFormComponent),
    title: 'Onboard Construction Worker - Bangladesh Real Estate ERP'
  },
  {
    path: 'labor-muster/workers/edit/:id',
    loadComponent: () => import('./construction-labor-muster/worker-form.component').then(m => m.WorkerFormComponent),
    title: 'Edit Worker Profile & Rates - Bangladesh Real Estate ERP'
  },
  {
    path: 'labor-muster/payments/create',
    loadComponent: () => import('./construction-labor-muster/payment-voucher-form.component').then(m => m.PaymentVoucherFormComponent),
    title: 'Issue Subcontractor Payment Voucher / Direct Payroll - Bangladesh Real Estate ERP'
  },
  {
    path: 'labor-muster/payments/view/:id',
    loadComponent: () => import('./construction-labor-muster/payment-voucher-form.component').then(m => m.PaymentVoucherFormComponent),
    title: 'Review Certified Payment Voucher - Bangladesh Real Estate ERP'
  },
  // 3. Central Contractor & Subcontractor Registry
  {
    path: 'contractors',
    loadComponent: () => import('./contractors/contractors.component').then(m => m.ContractorsComponent),
    title: 'Contractor & Subcontractor Management - Bangladesh Real Estate ERP'
  },
  {
    path: 'contractors/create',
    loadComponent: () => import('./contractors/contractor-form.component').then(m => m.ContractorFormComponent),
    title: 'Onboard Contractor or Subcontractor - Bangladesh Real Estate ERP'
  },
  {
    path: 'contractors/edit/:id',
    loadComponent: () => import('./contractors/contractor-form.component').then(m => m.ContractorFormComponent),
    title: 'Edit Contractor Profile & Agreement - Bangladesh Real Estate ERP'
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
    path: 'ra-bills/edit/:id',
    loadComponent: () => import('./construction-ra-bills/ra-bill-form.component').then(m => m.RaBillFormComponent),
    title: 'Edit RA Bill & Measurement Quantities - Bangladesh Real Estate ERP'
  },
  {
    path: 'ra-bills/view/:id',
    loadComponent: () => import('./construction-ra-bills/ra-bill-form.component').then(m => m.RaBillFormComponent),
    title: 'Review RA Bill & Signatures - Bangladesh Real Estate ERP'
  },
  // Work Orders & Contract Management
  {
    path: 'work-orders',
    loadComponent: () => import('./work-orders/work-orders.component').then(m => m.WorkOrdersComponent),
    title: 'Work Orders & Contract Management - Bangladesh Real Estate ERP'
  },
  {
    path: 'work-orders/create',
    loadComponent: () => import('./work-orders/work-order-form.component').then(m => m.WorkOrderFormComponent),
    title: 'Create Approved Work Order - Bangladesh Real Estate ERP'
  },
  {
    path: 'work-orders/edit/:id',
    loadComponent: () => import('./work-orders/work-order-form.component').then(m => m.WorkOrderFormComponent),
    title: 'Edit Work Order & Contract Provisions - Bangladesh Real Estate ERP'
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
    path: 'wbs-boq/wbs-edit/:id',
    loadComponent: () => import('./construction-wbs-boq/wbs-node-form.component').then(m => m.WbsNodeFormComponent),
    title: 'Edit WBS Activity Node - Bangladesh Real Estate ERP'
  },
  {
    path: 'wbs-boq/vo-create',
    loadComponent: () => import('./construction-wbs-boq/variation-order-form.component').then(m => m.VariationOrderFormComponent),
    title: 'Issue Variation Order (VO) - Bangladesh Real Estate ERP'
  },
  {
    path: 'wbs-boq/boq-create',
    loadComponent: () => import('./construction-wbs-boq/boq-item-form.component').then(m => m.BoqItemFormComponent),
    title: 'Add New BOQ Line Item - Bangladesh Real Estate ERP'
  },
  {
    path: 'wbs-boq/boq-edit/:id',
    loadComponent: () => import('./construction-wbs-boq/boq-item-form.component').then(m => m.BoqItemFormComponent),
    title: 'Edit BOQ Item & Rate Analysis - Bangladesh Real Estate ERP'
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

  // 6. Site Safety NCR Register & Quality Assurance
  {
    path: 'safety-ncr',
    loadComponent: () => import('./safety-ncr/safety-ncr.component').then(m => m.SafetyNcrComponent),
    title: 'Health, Safety (HSE) & Defect NCR Register - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/create',
    loadComponent: () => import('./safety-ncr/safety-ncr-form.component').then(m => m.SafetyNcrFormComponent),
    title: 'Log Defect / Issue Safety NCR - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/rectify/:id',
    loadComponent: () => import('./safety-ncr/safety-ncr-form.component').then(m => m.SafetyNcrFormComponent),
    title: 'Submit Rectification / Close NCR - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/inspections/create',
    loadComponent: () => import('./safety-ncr/inspection-form.component').then(m => m.InspectionFormComponent),
    title: 'New Work Inspection Request (WIR/ITP) - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/inspections/edit/:id',
    loadComponent: () => import('./safety-ncr/inspection-form.component').then(m => m.InspectionFormComponent),
    title: 'Edit Stage Inspection Checklist & Verdict - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/incidents/create',
    loadComponent: () => import('./safety-ncr/safety-incident-form.component').then(m => m.SafetyIncidentFormComponent),
    title: 'Report Safety Incident or Near-Miss - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/incidents/edit/:id',
    loadComponent: () => import('./safety-ncr/safety-incident-form.component').then(m => m.SafetyIncidentFormComponent),
    title: 'Edit Safety Incident & Investigation - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/permits/create',
    loadComponent: () => import('./safety-ncr/permit-to-work-form.component').then(m => m.PermitToWorkFormComponent),
    title: 'Issue Permit to Work (PTW) - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/permits/edit/:id',
    loadComponent: () => import('./safety-ncr/permit-to-work-form.component').then(m => m.PermitToWorkFormComponent),
    title: 'Approve & Verify Permit to Work (PTW) - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/trainings/create',
    loadComponent: () => import('./safety-ncr/safety-training-form.component').then(m => m.SafetyTrainingFormComponent),
    title: 'Log Safety Induction / Toolbox Talk (TBT) - Bangladesh Real Estate ERP'
  },
  {
    path: 'safety-ncr/trainings/edit/:id',
    loadComponent: () => import('./safety-ncr/safety-training-form.component').then(m => m.SafetyTrainingFormComponent),
    title: 'Edit Training & Induction Session - Bangladesh Real Estate ERP'
  },

  // 7. Site Material Requisition & Consumption
  {
    path: 'material-requisitions',
    loadComponent: () => import('./construction-material-requisitions/construction-material-requisitions.component').then(m => m.ConstructionMaterialRequisitionsComponent),
    title: 'Site Material Requisitions & Consumption - Bangladesh Real Estate ERP'
  },
  {
    path: 'material-requisitions/create',
    loadComponent: () => import('./construction-material-requisitions/material-requisition-form.component').then(m => m.MaterialRequisitionFormComponent),
    title: 'Create Material Requisition & Indent - Bangladesh Real Estate ERP'
  },
  {
    path: 'material-requisitions/edit/:id',
    loadComponent: () => import('./construction-material-requisitions/material-requisition-form.component').then(m => m.MaterialRequisitionFormComponent),
    title: 'Edit Material Requisition - Bangladesh Real Estate ERP'
  },

  // 8. Project Completion & Handover Closeout Management
  {
    path: 'project-completion',
    loadComponent: () => import('./project-completion/project-completion.component').then(m => m.ProjectCompletionComponent),
    title: 'Project Completion, Handover & Snag Register - Bangladesh Real Estate ERP'
  },
  {
    path: 'project-completion/create',
    loadComponent: () => import('./project-completion/project-completion-form.component').then(m => m.ProjectCompletionFormComponent),
    title: 'Initiate Project Closeout Dossier - Bangladesh Real Estate ERP'
  },
  {
    path: 'project-completion/edit/:id',
    loadComponent: () => import('./project-completion/project-completion-form.component').then(m => m.ProjectCompletionFormComponent),
    title: 'Edit Project Handover Dossier & Sign-Offs - Bangladesh Real Estate ERP'
  },
  {
    path: 'project-completion/punchlist/create',
    loadComponent: () => import('./project-completion/punchlist-form.component').then(m => m.PunchlistFormComponent),
    title: 'Log Punchlist Snag Item - Bangladesh Real Estate ERP'
  },
  {
    path: 'project-completion/punchlist/edit/:id',
    loadComponent: () => import('./project-completion/punchlist-form.component').then(m => m.PunchlistFormComponent),
    title: 'Edit Punchlist Snag & Rectification - Bangladesh Real Estate ERP'
  },

  // 9. Standard Management Reports Engine (14 Reports)
  {
    path: 'reports',
    loadComponent: () => import('./construction-reports/construction-reports.component').then(m => m.ConstructionReportsComponent),
    title: 'Construction Management Reports & Analytics - Bangladesh Real Estate ERP'
  }
];



