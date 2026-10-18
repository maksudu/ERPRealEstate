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
    redirectTo: 'hrms/dashboard/overview',
    pathMatch: 'full'
  },
  // 1. HR Dashboard Routes
  {
    path: 'hrms/dashboard',
    loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
    title: 'HRMS Cockpit & Labour Overview - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/dashboard/overview',
    loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
    title: 'HR Dashboard Overview - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/dashboard/headcount',
    loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
    title: 'Headcount Summary - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/dashboard/attendance-summary',
    loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
    title: 'Attendance Summary - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/dashboard/leave-summary',
    loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
    title: 'Leave Summary - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/dashboard/payroll-summary',
    loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
    title: 'Payroll Summary - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/dashboard/pending-approvals',
    loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
    title: 'Pending Approvals - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/dashboard/alerts',
    loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
    title: 'HR Alerts - Bangladesh Real Estate ERP'
  },

  // 2. Organization Setup Routes
  {
    path: 'hrms/org-structure',
    loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
    title: 'Company Master & Org Structure - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/org/companies',
    loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
    title: 'Company Setup - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/org/legal-entities',
    loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
    title: 'Legal Entity - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/org/branches',
    loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
    title: 'Branch Setup - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/org/project-offices',
    loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
    title: 'Project Office Setup - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/org/cost-centers',
    loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
    title: 'Cost Center - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/departments',
    loadComponent: () => import('./features/hrms/departments/departments.component').then(m => m.DepartmentsComponent),
    title: 'Department Master - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/departments/hierarchy',
    loadComponent: () => import('./features/hrms/departments/departments.component').then(m => m.DepartmentsComponent),
    title: 'Department Hierarchy - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/departments/heads',
    loadComponent: () => import('./features/hrms/departments/departments.component').then(m => m.DepartmentsComponent),
    title: 'Department Head - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/designations',
    loadComponent: () => import('./features/hrms/designations/designations.component').then(m => m.DesignationsComponent),
    title: 'Designation - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/designations/grades',
    loadComponent: () => import('./features/hrms/designations/designations.component').then(m => m.DesignationsComponent),
    title: 'Job Grade - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/positions',
    redirectTo: 'hrms/designations',
    pathMatch: 'full'
  },
  {
    path: 'hrms/companies',
    redirectTo: 'hrms/org/companies',
    pathMatch: 'full'
  },

  // 3. Employee Management Routes
  {
    path: 'hrms/employees',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Employee Directory & 360 Profiles - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/list',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Employee List - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/add',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Add Employee - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/profile',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Employee Profile - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/personal-info',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Personal Information - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/employment-details',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Employment Details - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/documents',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Documents Vault - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/emergency-contacts',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Emergency Contacts - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/bank-details',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Bank Details - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/transfer',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Employee Transfer - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/promotion',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Promotion - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/salary-revision',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Salary Revision - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/contract-renewal',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Contract Renewal - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/employees/history',
    loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
    title: 'Employee History - Bangladesh Real Estate ERP'
  },

  // 4. Recruitment & Onboarding Routes
  {
    path: 'hrms/recruitment',
    redirectTo: 'hrms/recruitment/requisitions',
    pathMatch: 'full'
  },
  {
    path: 'hrms/recruitment/requisitions',
    loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
    title: 'Manpower Requisition - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/recruitment/vacancies',
    loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
    title: 'Job Vacancy - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/recruitment/applicants',
    loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
    title: 'Applicant Database - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/recruitment/interviews',
    loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
    title: 'Interview Schedule - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/recruitment/evaluations',
    loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
    title: 'Interview Evaluation - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/recruitment/selection',
    loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
    title: 'Selection - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/recruitment/offer-letters',
    loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
    title: 'Offer Letter - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/recruitment/appointment-letters',
    loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
    title: 'Appointment Letter - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/recruitment/joining-checklist',
    loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
    title: 'Joining Checklist - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/recruitment/onboarding',
    loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
    title: 'Employee Onboarding - Bangladesh Real Estate ERP'
  },

  // 5. Attendance & Shift Management Routes
  {
    path: 'hrms/attendance',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Attendance & Shift Management - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/shifts',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Shift Master - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/rosters',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Shift Roster - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/logs',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Attendance Logs - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/biometric',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Biometric Integration - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/mobile-checkin',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Mobile Check-in - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/site-attendance',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Site Attendance - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/late-early',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Late/Early Report - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/missing-punches',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Missing Punch - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/corrections',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Attendance Correction - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/overtime',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Overtime - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/holiday-calendar',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Holiday Calendar - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/attendance/monthly-closing',
    loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
    title: 'Monthly Attendance Closing - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/muster-roll',
    loadComponent: () => import('./features/hrms/muster-roll/muster-roll.component').then(m => m.MusterRollComponent),
    title: 'Daily Site Labour Muster Roll - Bangladesh Real Estate ERP'
  },

  // 6. Leave Management Routes
  {
    path: 'hrms/leave',
    redirectTo: 'hrms/leave/applications',
    pathMatch: 'full'
  },
  {
    path: 'hrms/leave-overtime',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave & Overtime Management Engine - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave/types',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave Type - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave/policies',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave Policy - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave/entitlements',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave Entitlement - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave/applications',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave Application - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave/approvals',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave/balances',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave Balance - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave/encashment',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave Encashment - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave/calendar',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave Calendar - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave/history',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Leave History - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/leave/holidays',
    loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
    title: 'Holiday Management - Bangladesh Real Estate ERP'
  },

  // 7. Payroll Management Routes
  {
    path: 'hrms/payroll',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Salary Structure & Payroll Engine - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/structures',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Salary Structure - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/components',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Salary Components - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/assignments',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Employee Salary Assignment - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/periods',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Payroll Period - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/processing',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Payroll Processing - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/attendance-calc',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Attendance-based Calculation - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/allowances',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Allowances - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/deductions',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Deductions - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/bonus',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Bonus - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/increments',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Increment - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/arrears',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Arrears - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/validation',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Payroll Validation - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/approval',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Payroll Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/payslips',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Payslip - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/bank-payment-files',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Bank Payment File - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/posting',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Payroll Posting - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll/reversals',
    loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
    title: 'Payroll Reversal - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/payroll-approvals',
    loadComponent: () => import('./features/hrms/payroll-approvals/payroll-approvals.component').then(m => m.PayrollApprovalsComponent),
    title: 'Deductions, Benefits & Payroll Approvals - Bangladesh Real Estate ERP'
  },

  // 8. Loans, Advances & Benefits Routes
  {
    path: 'hrms/loans-benefits',
    redirectTo: 'hrms/loans-benefits/loans',
    pathMatch: 'full'
  },
  {
    path: 'hrms/loans-benefits/salary-advances',
    loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
    title: 'Salary Advance - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/loans-benefits/loans',
    loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
    title: 'Employee Loan - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/loans-benefits/loan-approvals',
    loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
    title: 'Loan Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/loans-benefits/loan-disbursements',
    loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
    title: 'Loan Disbursement - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/loans-benefits/installment-schedules',
    loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
    title: 'Installment Schedule - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/loans-benefits/loan-recoveries',
    loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
    title: 'Loan Recovery - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/loans-benefits/medical-reimbursements',
    loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
    title: 'Medical Reimbursement - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/loans-benefits/travel-allowances',
    loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
    title: 'Travel Allowance - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/loans-benefits/expense-claims',
    loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
    title: 'Expense Claim - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/loans-benefits/benefits-master',
    loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
    title: 'Employee Benefits - Bangladesh Real Estate ERP'
  },

  // 9. Performance & Development Routes
  {
    path: 'hrms/performance',
    redirectTo: 'hrms/performance/reviews',
    pathMatch: 'full'
  },
  {
    path: 'hrms/performance/kpi-setup',
    loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
    title: 'KPI Setup - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/performance/reviews',
    loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
    title: 'Performance Review - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/performance/cycles',
    loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
    title: 'Appraisal Cycle - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/performance/evaluations',
    loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
    title: 'Manager Evaluation - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/performance/self-assessments',
    loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
    title: 'Employee Self-Assessment - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/performance/training-plans',
    loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
    title: 'Training Plan - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/performance/training-attendance',
    loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
    title: 'Training Attendance - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/performance/skill-matrix',
    loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
    title: 'Skill Matrix - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/performance/promotions',
    loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
    title: 'Promotion Recommendation - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/performance/increments',
    loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
    title: 'Increment Recommendation - Bangladesh Real Estate ERP'
  },

  // 10. Employee Separation Routes
  {
    path: 'hrms/separation',
    redirectTo: 'hrms/separation/resignations',
    pathMatch: 'full'
  },
  {
    path: 'hrms/separation/resignations',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Resignation Request - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/separation/notice-periods',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Notice Period - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/separation/terminations',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Termination - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/separation/exit-interviews',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Exit Interview - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/separation/asset-clearances',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Asset Clearance - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/separation/dept-clearances',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Department Clearance - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/separation/loan-settlements',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Loan Settlement - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/separation/leave-settlements',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Leave Settlement - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/separation/final-salaries',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Final Salary - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/separation/settlement-approvals',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Final Settlement Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/separation/experience-certificates',
    loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
    title: 'Experience Certificate - Bangladesh Real Estate ERP'
  },

  // 11. Employee Self-Service Routes
  {
    path: 'hrms/ess',
    redirectTo: 'hrms/ess/my-profile',
    pathMatch: 'full'
  },
  {
    path: 'hrms/ess/my-profile',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'My Profile - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/ess/my-attendance',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'My Attendance - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/ess/leave-requests',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'Leave Request - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/ess/leave-balances',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'Leave Balance - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/ess/my-payslips',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'Payslips - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/ess/salary-history',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'Salary History - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/ess/loan-requests',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'Loan Request - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/ess/expense-claims',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'Expense Claim - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/ess/my-documents',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'Documents - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/ess/notices',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'Company Notices - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/ess/helpdesk',
    loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
    title: 'HR Helpdesk - Bangladesh Real Estate ERP'
  },

  // 12. Workflow & Approvals Routes
  {
    path: 'hrms/workflow',
    redirectTo: 'hrms/workflow/matrix',
    pathMatch: 'full'
  },
  {
    path: 'hrms/workflow/matrix',
    loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
    title: 'Approval Matrix - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/workflow/leaves',
    loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
    title: 'Leave Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/workflow/overtime',
    loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
    title: 'Overtime Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/workflow/attendance',
    loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
    title: 'Attendance Correction Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/workflow/recruitment',
    loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
    title: 'Recruitment Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/workflow/salary-revisions',
    loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
    title: 'Salary Revision Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/workflow/payroll',
    loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
    title: 'Payroll Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/workflow/expenses',
    loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
    title: 'Expense Approval - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/workflow/delegation',
    loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
    title: 'Delegation - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/workflow/history',
    loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
    title: 'Approval History - Bangladesh Real Estate ERP'
  },

  // 13. Statutory, Tax & Compliance Routes
  {
    path: 'hrms/statutory',
    redirectTo: 'hrms/statutory/tax-config',
    pathMatch: 'full'
  },
  {
    path: 'hrms/statutory/tax-config',
    loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
    title: 'Tax Configuration - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/statutory/tax-deductions',
    loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
    title: 'Tax Deduction Records - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/statutory/tax-certificates',
    loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
    title: 'Tax Certificates - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/statutory/registers',
    loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
    title: 'Statutory Registers - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/statutory/contracts',
    loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
    title: 'Employment Contracts - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/statutory/policies',
    loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
    title: 'Policy Acknowledgment - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/statutory/calendar',
    loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
    title: 'Compliance Calendar - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/statutory/audit-documents',
    loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
    title: 'Audit Documents - Bangladesh Real Estate ERP'
  },

  // 14. Project-wise HR & Cost Allocation Routes
  {
    path: 'hrms/project-hr',
    redirectTo: 'hrms/project-hr/assignments',
    pathMatch: 'full'
  },
  {
    path: 'hrms/project-hr/assignments',
    loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
    title: 'Project Employee Assignment - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/project-hr/rosters',
    loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
    title: 'Site Staff Roster - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/project-hr/labour-allocation',
    loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
    title: 'Labour Allocation - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/project-hr/timesheets',
    loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
    title: 'Timesheets - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/project-hr/overtime',
    loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
    title: 'Project Overtime - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/project-hr/shared-allocation',
    loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
    title: 'Shared Employee Allocation - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/project-hr/payroll-costs',
    loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
    title: 'Project Payroll Cost - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/project-hr/dept-costs',
    loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
    title: 'Department Cost Allocation - Bangladesh Real Estate ERP'
  },

  // 15. HR Reports & Analytics Routes
  {
    path: 'hrms/reports',
    redirectTo: 'hrms/reports/employee-register',
    pathMatch: 'full'
  },
  {
    path: 'hrms/reports/employee-register',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Employee Register - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/headcount-by-dept',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Headcount by Department - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/headcount-by-project',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Headcount by Project - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/attendance-register',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Attendance Register - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/leave-report',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Leave Report - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/overtime-report',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Overtime Report - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/payroll-register',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Payroll Register - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/salary-sheet',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Salary Sheet - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/bank-disbursement',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Bank Disbursement Report - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/loan-balance',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Loan Balance - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/recruitment-report',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Recruitment Report - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/turnover-report',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Turnover Report - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/training-report',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Training Report - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/reports/project-labour-cost',
    loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
    title: 'Project Labour Cost - Bangladesh Real Estate ERP'
  },

  // 16. HR Configuration & Security Routes
  {
    path: 'hrms/config',
    redirectTo: 'hrms/config/settings',
    pathMatch: 'full'
  },
  {
    path: 'hrms/config/settings',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'HR Settings - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/salary-rules',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'Salary Rules - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/leave-rules',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'Leave Rules - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/shift-rules',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'Shift Rules - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/payroll-calendar',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'Payroll Calendar - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/notification-templates',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'Notification Templates - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/communication-settings',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'Email/SMS/Push Settings - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/user-roles',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'User Roles - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/permissions',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'Permissions - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/audit-logs',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'Audit Logs - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/biometric-devices',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'Biometric Devices - Bangladesh Real Estate ERP'
  },
  {
    path: 'hrms/config/api-integrations',
    loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
    title: 'API Integration Settings - Bangladesh Real Estate ERP'
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



