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
    path: 'inventory/stacking-plan',
    loadComponent: () => import('./features/inventory/tower-stacking/tower-stacking.component').then(m => m.TowerStackingComponent),
    title: 'Visual 2D Tower Stacking Plan & Unit Matrix - Bangladesh Real Estate ERP'
  },
  {
    path: 'inventory/matrix',
    loadComponent: () => import('./features/inventory/inventory-matrix/inventory-matrix.component').then(m => m.InventoryMatrixComponent),
    title: 'Property Inventory & 15-Min Mutex Matrix - Bangladesh Real Estate ERP'
  },
  {
    path: 'inventory/subdivision',
    loadComponent: () => import('./features/inventory/unit-subdivision/unit-subdivision.component').then(m => m.UnitSubdivisionComponent),
    title: 'Unit Subdivision & Duplex Combination - Bangladesh Real Estate ERP'
  },
  {
    path: 'inventory/parking',
    loadComponent: () => import('./features/inventory/parking-management/parking-management.component').then(m => m.ParkingManagementComponent),
    title: 'Basement Parking Bays Management - Bangladesh Real Estate ERP'
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
    path: 'installments/money-receipts',
    loadComponent: () => import('./features/installments/money-receipts/money-receipts.component').then(m => m.MoneyReceiptsComponent),
    title: 'Money Receipts & Waterfall Collections - Bangladesh Real Estate ERP'
  },
  {
    path: 'installments/tripartite-loans',
    loadComponent: () => import('./features/installments/tripartite-loans/tripartite-loans.component').then(m => m.TripartiteLoansComponent),
    title: 'Bank Home Loan Tripartite Ledger - Bangladesh Real Estate ERP'
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
    path: 'construction/wbs-boq',
    loadComponent: () => import('./features/construction/construction-wbs-boq/construction-wbs-boq.component').then(m => m.ConstructionWbsBoqComponent),
    title: 'Construction WBS & BOQ Hard Budget Locks - Bangladesh Real Estate ERP'
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
    path: 'procurement/cockpit',
    loadComponent: () => import('./features/procurement/procurement-cockpit/procurement-cockpit.component').then(m => m.ProcurementCockpitComponent),
    title: 'Supply Chain & Procurement Cockpit (PR → RFQ → CS → PO → GRN → QC → Store Issue) - Bangladesh Real Estate ERP'
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
    path: 'accounts/cwip-cockpit',
    loadComponent: () => import('./features/accounts/accounts-cwip-cockpit/accounts-cwip-cockpit.component').then(m => m.AccountsCwipCockpitComponent),
    title: 'CWIP Capitalization & IFRS-15 Cockpit - Bangladesh Real Estate ERP'
  },
  {
    path: 'accounts/pdc-kanban',
    loadComponent: () => import('./features/accounts/accounts-pdc-vault/accounts-pdc-vault.component').then(m => m.AccountsPdcVaultComponent),
    title: 'PDC Cheque Vault & Kanban - Bangladesh Real Estate ERP'
  },
  {
    path: 'accounts/bank-recon-wizard',
    loadComponent: () => import('./features/accounts/accounts-bank-reconciliation/accounts-bank-reconciliation.component').then(m => m.AccountsBankReconciliationComponent),
    title: 'Bank Statement Reconciliation Wizard - Bangladesh Real Estate ERP'
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
    path: 'tax/cockpit',
    loadComponent: () => import('./features/tax/tax-cockpit/tax-cockpit.component').then(m => m.TaxCockpitComponent),
    title: 'NBR VAT (Mushak 6.3/6.5), TDS/VDS & Sec 53FF AIT Engine - Bangladesh Real Estate ERP'
  },
  {
    path: 'tax/mushak-6-3',
    redirectTo: 'tax/cockpit',
    pathMatch: 'full'
  },
  {
    path: 'tax/mushak-6-5',
    redirectTo: 'tax/cockpit',
    pathMatch: 'full'
  },
  {
    path: 'tax/tds-vds',
    redirectTo: 'tax/cockpit',
    pathMatch: 'full'
  },
  {
    path: 'tax/section-53ff',
    redirectTo: 'tax/cockpit',
    pathMatch: 'full'
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
    path: 'legal/compliance-vault',
    loadComponent: () => import('./features/legal/compliance-vault/compliance-vault.component').then(m => m.ComplianceVaultComponent),
    title: 'Legal & Statutory Compliance Vault, Land Dispute Tracking & RAJUK/CDA Approvals - Bangladesh Real Estate ERP'
  },
  {
    path: 'legal/vault',
    redirectTo: 'legal/compliance-vault',
    pathMatch: 'full'
  },
  {
    path: 'settings/legal-cases',
    redirectTo: 'legal/compliance-vault',
    pathMatch: 'full'
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
  },
  {
    path: 'hrms',
    redirectTo: 'hrms/org-structure',
    pathMatch: 'full'
  },
  {
    path: 'hrms/org-structure',
    loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
    title: 'Company Master & Org Structure - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/departments',
    loadComponent: () => import('./features/hrms/departments/departments.component').then(m => m.DepartmentsComponent),
    title: 'Department Master & Corporate Hierarchy - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/designations',
    loadComponent: () => import('./features/hrms/designations/designations.component').then(m => m.DesignationsComponent),
    title: 'Designations, Salary Grades & Position Management - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/positions',
    redirectTo: 'hrms/designations',
    pathMatch: 'full'
  },
  {
    path: 'hrms/companies',
    redirectTo: 'hrms/org-structure',
    pathMatch: 'full'
  },

  {
    path: 'hrms/dashboard',
    loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
    title: 'HRMS Cockpit & Labour Overview - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Employee Directory & 360 Profiles - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/muster-roll',
    loadComponent: () => import('./features/hrms/muster-roll/muster-roll.component').then(m => m.MusterRollComponent),
    title: 'Daily Site Labour Muster Roll - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Salary Structure & Payroll Engine (3.1-3.10) - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll-approvals',
    loadComponent: () => import('./features/hrms/payroll-approvals/payroll-approvals.component').then(m => m.PayrollApprovalsComponent),
    title: 'Deductions, Benefits & Payroll Approvals (3.11-3.20) - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Attendance Punches & Shift Management - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave-overtime',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave & Overtime Management Engine - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave',
    redirectTo: 'hrms/leave-overtime',
    pathMatch: 'full'
  },
  {
    path: 'governance/approvals',
    loadComponent: () => import('./features/governance/governance-cockpit/governance-cockpit.component').then(m => m.GovernanceCockpitComponent),
    title: 'Maker-Checker Governance & Approvals - Bangladesh Real Estate ERP'
  },
  {
    path: 'governance/cockpit',
    redirectTo: 'governance/approvals',
    pathMatch: 'full'
  },
  {
    path: 'bi/cockpit',
    loadComponent: () => import('./features/bi/executive-cockpit/executive-cockpit.component').then(m => m.ExecutiveCockpitComponent),
    title: 'Executive Management BI Cockpit, Cash Runway & EVM - Bangladesh Real Estate ERP'
  },
  {
    path: 'bi/dashboard',
    redirectTo: 'bi/cockpit',
    pathMatch: 'full'
  },
  {
    path: 'executive/cockpit',
    redirectTo: 'bi/cockpit',
    pathMatch: 'full'
  },
  {
    path: 'portal/customer',
    loadComponent: () => import('./features/portal/customer-portal/customer-portal.component').then(m => m.CustomerPortalComponent),
    title: 'Customer Self-Service Portal & Flat Owner Transparency - Bangladesh Real Estate ERP'
  },
  {
    path: 'portal/dashboard',
    redirectTo: 'portal/customer',
    pathMatch: 'full'
  },
  {
    path: 'portal',
    redirectTo: 'portal/customer',
    pathMatch: 'full'
  }
    ]
  },
  {
    path: '**',
    redirectTo: 'settings/lookups'
  }
];



