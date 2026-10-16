import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [loginGuard],
    title: 'Sign In - Bangladesh Real Estate ERP Enterprise'
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'settings/lookups',
        pathMatch: 'full'
      },
  {
    path: 'settings/lookups',
    loadComponent: () => import('./features/settings/lookups/lookup-management.component').then(m => m.LookupManagementComponent),
    title: 'Dynamic Lookups & Dropdowns - Bangladesh Real Estate ERP'
  },
  {
    path: 'settings/rbac',
    loadComponent: () => import('./features/settings/rbac/rbac-management.component').then(m => m.RbacManagementComponent),
    title: 'Auth & Project-Scoped RBAC - Bangladesh Real Estate ERP'
  },
  {
    path: 'settings/components',
    redirectTo: 'settings/lookups',
    pathMatch: 'full'
  },
  {
    path: 'land/proposals',
    loadComponent: () => import('./features/land/proposals/proposals.component').then(m => m.ProposalsComponent),
    title: 'Land Bank & Acquisition Proposals - Bangladesh Real Estate ERP'
  },
  {
    path: 'land/surveys',
    loadComponent: () => import('./features/land/surveys/surveys.component').then(m => m.SurveysComponent),
    title: 'Historic Land Surveys (CS/SA/RS/BS) - Bangladesh Real Estate ERP'
  },
  {
    path: 'land/jv-agreements',
    loadComponent: () => import('./features/land/jv-agreements/jv-agreements.component').then(m => m.JVAgreementsComponent),
    title: 'Joint Venture (JV) Agreements - Bangladesh Real Estate ERP'
  },
  {
    path: 'projects/list',
    loadComponent: () => import('./features/projects/projects-list/projects-list.component').then(m => m.ProjectsListComponent),
    title: 'Project Spatial Modeling (FAR & Towers) - Bangladesh Real Estate ERP'
  },
  {
    path: 'projects/clearances',
    loadComponent: () => import('./features/projects/clearances/clearances.component').then(m => m.ClearancesComponent),
    title: 'Statutory Permits & Clearances - Bangladesh Real Estate ERP'
  },
  {
    path: 'projects/boq',
    loadComponent: () => import('./features/projects/boq/boq.component').then(m => m.BOQComponent),
    title: 'BOQ Estimation & IFC Drawings - Bangladesh Real Estate ERP'
  },
  {
    path: 'inventory/matrix',
    loadComponent: () => import('./features/inventory/inventory-matrix/inventory-matrix.component').then(m => m.InventoryMatrixComponent),
    title: 'Property Inventory & 15-Min Mutex Matrix - Bangladesh Real Estate ERP'
  },
  {
    path: 'crm/leads',
    loadComponent: () => import('./features/crm/crm-leads/crm-leads.component').then(m => m.CrmLeadsComponent),
    title: 'Omnichannel CRM Leads & Kanban - Bangladesh Real Estate ERP'
  },
  {
    path: 'crm/customers',
    loadComponent: () => import('./features/crm/crm-customers/crm-customers.component').then(m => m.CrmCustomersComponent),
    title: 'Customer KYC & Nominee Profiles - Bangladesh Real Estate ERP'
  },
  {
    path: 'sales/bookings',
    loadComponent: () => import('./features/sales/sales-bookings/sales-bookings.component').then(m => m.SalesBookingsComponent),
    title: 'Apartment Bookings & Bilingual Deeds - Bangladesh Real Estate ERP'
  },
  {
    path: 'sales/discounts',
    loadComponent: () => import('./features/sales/sales-discounts/sales-discounts.component').then(m => m.SalesDiscountsComponent),
    title: 'Multi-Level Discount Approvals - Bangladesh Real Estate ERP'
  },
  {
    path: 'sales/cancellations',
    loadComponent: () => import('./features/sales/sales-cancellations/sales-cancellations.component').then(m => m.SalesCancellationsComponent),
    title: 'Statutory Allotment Cancellations - Bangladesh Real Estate ERP'
  },
  {
    path: 'installments/schedules',
    loadComponent: () => import('./features/installments/installment-schedules/installment-schedules.component').then(m => m.InstallmentSchedulesComponent),
    title: 'Installment Schedules & Milestone Triggers - Bangladesh Real Estate ERP'
  },
  {
    path: 'installments/pdc-vault',
    loadComponent: () => import('./features/installments/pdc-vault/pdc-vault.component').then(m => m.PDCVaultComponent),
    title: 'PDC Cheque Vault & Safe Deposits - Bangladesh Real Estate ERP'
  },
  {
    path: 'installments/ni138-actions',
    loadComponent: () => import('./features/installments/ni138-actions/ni138-actions.component').then(m => m.NI138ActionsComponent),
    title: 'NI Act 1881 Section 138 Cheque Dishonour Litigation - Bangladesh Real Estate ERP'
  },
  {
    path: 'construction/dpr',
    loadComponent: () => import('./features/construction/construction-dpr/construction-dpr.component').then(m => m.ConstructionDprComponent),
    title: 'Construction Site Diary (DPR) - Bangladesh Real Estate ERP'
  },
  {
    path: 'construction/labor-muster',
    loadComponent: () => import('./features/construction/construction-labor-muster/construction-labor-muster.component').then(m => m.ConstructionLaborMusterComponent),
    title: 'Subcontractor Labor Muster Roll - Bangladesh Real Estate ERP'
  },
  {
    path: 'construction/ra-bills',
    loadComponent: () => import('./features/construction/construction-ra-bills/construction-ra-bills.component').then(m => m.ConstructionRaBillsComponent),
    title: 'Contractor Running Account (RA) Billing - Bangladesh Real Estate ERP'
  },
  {
    path: 'construction/cube-tests',
    loadComponent: () => import('./features/construction/concrete-cube-tests/concrete-cube-tests.component').then(m => m.ConcreteCubeTestsComponent),
    title: 'Concrete Cube Crushing Test Register - Bangladesh Real Estate ERP'
  },
  {
    path: 'construction/safety-ncr',
    loadComponent: () => import('./features/construction/safety-ncr/safety-ncr.component').then(m => m.SafetyNcrComponent),
    title: 'Site Safety & Non-Conformance Reports (NCR) - Bangladesh Real Estate ERP'
  },
  {
    path: 'procurement/stores',
    loadComponent: () => import('./features/procurement/procurement-stores/procurement-stores.component').then(m => m.ProcurementStoresComponent),
    title: 'Site Store Stock Inventory - Bangladesh Real Estate ERP'
  },
  {
    path: 'procurement/comparative-statements',
    loadComponent: () => import('./features/procurement/procurement-cs/procurement-cs.component').then(m => m.ProcurementCsComponent),
    title: 'Comparative Statements (CS) - Bangladesh Real Estate ERP'
  },
  {
    path: 'procurement/grn',
    loadComponent: () => import('./features/procurement/procurement-grn/procurement-grn.component').then(m => m.ProcurementGrnComponent),
    title: 'Goods Receipt Note (GRN) & 3-Way Match - Bangladesh Real Estate ERP'
  },
  {
    path: 'accounts/coa',
    loadComponent: () => import('./features/accounts/accounts-coa/accounts-coa.component').then(m => m.AccountsCoaComponent),
    title: 'Chart of Accounts (COA) - Bangladesh Real Estate ERP'
  },
  {
    path: 'accounts/vouchers',
    loadComponent: () => import('./features/accounts/accounts-vouchers/accounts-vouchers.component').then(m => m.AccountsVouchersComponent),
    title: 'General Ledger Vouchers - Bangladesh Real Estate ERP'
  },
  {
    path: 'accounts/financial-reports',
    loadComponent: () => import('./features/accounts/accounts-financial-reports/accounts-financial-reports.component').then(m => m.AccountsFinancialReportsComponent),
    title: 'Financial Reports & Bank Reconciliation - Bangladesh Real Estate ERP'
  },
  {
    path: 'accounts/vat-mushak',
    loadComponent: () => import('./features/accounts/accounts-vat-mushak/accounts-vat-mushak.component').then(m => m.AccountsVatMushakComponent),
    title: 'Mushak 6.3 VAT Tax Invoices - Bangladesh Real Estate ERP'
  },
  {
    path: 'accounts/tax-withholding',
    loadComponent: () => import('./features/accounts/accounts-tax-withholding/accounts-tax-withholding.component').then(m => m.AccountsTaxWithholdingComponent),
    title: 'TDS & VDS Withholding Tax Register - Bangladesh Real Estate ERP'
  },
  {
    path: 'accounts/sub-registry-calc',
    loadComponent: () => import('./features/accounts/accounts-sub-registry-calc/accounts-sub-registry-calc.component').then(m => m.AccountsSubRegistryCalcComponent),
    title: 'Sub-Registry & Sec 53FF AIT Fee Calculator - Bangladesh Real Estate ERP'
  },
  {
    path: 'handover/snagging',
    loadComponent: () => import('./features/handover/handover-snagging/handover-snagging.component').then(m => m.HandoverSnaggingComponent),
    title: 'Pre-Handover Snagging & DLP Warranty - Bangladesh Real Estate ERP'
  },
  {
    path: 'handover/possession',
    loadComponent: () => import('./features/handover/handover-possession/handover-possession.component').then(m => m.HandoverPossessionComponent),
    title: 'Key Handover & Possession Clearance - Bangladesh Real Estate ERP'
  },
  {
    path: 'handover/association',
    loadComponent: () => import('./features/handover/handover-association/handover-association.component').then(m => m.HandoverAssociationComponent),
    title: 'Building Owners Association & Leasing - Bangladesh Real Estate ERP'
  },
  {
    path: 'brokers/commissions',
    loadComponent: () => import('./features/sales/broker-commissions/broker-commissions.component').then(m => m.BrokerCommissionsComponent),
    title: 'Broker Commissions & Section 53 TDS - Bangladesh Real Estate ERP'
  },
  {
    path: 'settings/legal-cases',
    loadComponent: () => import('./features/settings/legal-cases/legal-cases.component').then(m => m.LegalCasesComponent),
    title: 'Legal Litigation & Court Cases Register - Bangladesh Real Estate ERP'
  },
  {
    path: 'settings/equipment',
    loadComponent: () => import('./features/settings/equipment/equipment.component').then(m => m.EquipmentComponent),
    title: 'Heavy Equipment & Machinery Fleet - Bangladesh Real Estate ERP'
  },
  {
    path: 'settings/data-import',
    loadComponent: () => import('./features/settings/data-import/data-import.component').then(m => m.DataImportComponent),
    title: 'Legacy Excel Data Import & Migration - Bangladesh Real Estate ERP'
  }
    ]
  },
  {
    path: '**',
    redirectTo: 'settings/lookups'
  }
];



