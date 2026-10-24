import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [loginGuard],
    title: 'Sign In  Enterprise'
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/executive-dashboard.component').then(m => m.ExecutiveDashboardComponent),
        title: 'Executive Dashboard | REALBIZ ERP'
      },
      {
        path: 'construction',
        loadChildren: () => import('./features/construction/construction.routes').then(m => m.CONSTRUCTION_ROUTES)
      },
      {
        path: 'budgeting',
        loadChildren: () => import('./features/budgeting/budgeting.routes').then(m => m.BUDGETING_ROUTES)
      },
      {
        path: 'fixed-assets',
        loadChildren: () => import('./features/fixed-assets/fixed-assets.routes').then(m => m.FIXED_ASSETS_ROUTES)
      },
      {
        path: 'security',
        loadChildren: () => import('./features/security/security.routes').then(m => m.SECURITY_ROUTES)
      },

      {
        path: 'settings/lookups',
        loadComponent: () => import('./features/settings/lookups/lookup-management.component').then(m => m.LookupManagementComponent),
        title: 'Dynamic Lookups & Dropdowns '
      },
      {
        path: 'settings/rbac',
        loadComponent: () => import('./features/settings/rbac/rbac-management.component').then(m => m.RbacManagementComponent),
        title: 'Auth & Project-Scoped RBAC '
      },
      {
        path: 'settings/components',
        redirectTo: 'settings/lookups',
        pathMatch: 'full'
      },
      {
        path: 'land',
        redirectTo: 'land/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'land/dashboard',
        loadComponent: () => import('./features/land/dashboard/land-dashboard.component').then(m => m.LandDashboardComponent),
        title: 'Oxland — Land Management & Intelligence Dashboard '
      },
      {
        path: 'land/landowners',
        loadComponent: () => import('./features/land/landowners/landowners.component').then(m => m.LandownersComponent),
        title: 'Landowner and Seller Registry'
      },
      {
        path: 'land/landowners/create',
        loadComponent: () => import('./features/land/landowners/landowner-form/landowner-form.component').then(m => m.LandownerFormComponent),
        title: 'Register Landowner '
      },
      {
        path: 'land/landowners/:id/edit',
        loadComponent: () => import('./features/land/landowners/landowner-form/landowner-form.component').then(m => m.LandownerFormComponent),
        title: 'Edit Landowner Profile'
      },
      {
        path: 'land/search',
        loadComponent: () => import('./features/land/acquisition-search/acquisition-search.component').then(m => m.AcquisitionSearchComponent),
        title: 'Land Acquisition Search'
      },
      {
        path: 'land/proposals',
        loadComponent: () => import('./features/land/proposals/proposals.component').then(m => m.ProposalsComponent),
        title: 'Land Search & Acquisition Proposals'
      },
      {
        path: 'land/proposals/create',
        loadComponent: () => import('./features/land/proposals/proposal-form/proposal-form.component').then(m => m.ProposalFormComponent),
        title: 'Register Land Opportunity'
      },
      {
        path: 'land/proposals/:id/edit',
        loadComponent: () => import('./features/land/proposals/proposal-form/proposal-form.component').then(m => m.ProposalFormComponent),
        title: 'Edit Land Opportunity'
      },
      {
        path: 'land/parcels',
        loadComponent: () => import('./features/land/parcels/parcels.component').then(m => m.ParcelsComponent),
        title: 'Land Parcel and Location Registry'
      },
      {
        path: 'land/parcels/create',
        loadComponent: () => import('./features/land/parcels/parcel-form/parcel-form.component').then(m => m.ParcelFormComponent),
        title: 'Register Land Parcel '
      },
      {
        path: 'land/parcels/:id/edit',
        loadComponent: () => import('./features/land/parcels/parcel-form/parcel-form.component').then(m => m.ParcelFormComponent),
        title: 'Edit Land Parcel '
      },
      {
        path: 'land/conversions',
        loadComponent: () => import('./features/land/conversions/conversions.component').then(m => m.ConversionsComponent),
        title: 'Land Area & Measurement Conversion'
      },
      {
        path: 'land/conversions/create',
        loadComponent: () => import('./features/land/conversions/convention-form/convention-form.component').then(m => m.ConventionFormComponent),
        title: 'Create Measurement Convention'
      },
      {
        path: 'land/conversions/:id/edit',
        loadComponent: () => import('./features/land/conversions/convention-form/convention-form.component').then(m => m.ConventionFormComponent),
        title: 'Edit Measurement Convention'
      },
      {
        path: 'land/documents',
        loadComponent: () => import('./features/land/documents/documents.component').then(m => m.DocumentsComponent),
        title: 'Deed, Mutation, Survey & Ownership Documents'
      },
      {
        path: 'land/joint-ownership',
        loadComponent: () => import('./features/land/joint-ownership/joint-ownership.component').then(m => m.JointOwnershipComponent),
        title: 'Joint Ownership & Landowner Agreements'
      },
      {
        path: 'land/joint-ownership/create',
        loadComponent: () => import('./features/land/joint-ownership/joint-ownership.component').then(m => m.JointOwnershipComponent),
        title: 'Register Developer-Landowner Agreement'
      },
      {
        path: 'land/joint-ownership/agreements/create',
        loadComponent: () => import('./features/land/joint-ownership/joint-ownership.component').then(m => m.JointOwnershipComponent),
        title: 'Register Developer-Landowner Agreement'
      },
      {
        path: 'land/joint-ownership/shares/create',
        loadComponent: () => import('./features/land/joint-ownership/joint-ownership.component').then(m => m.JointOwnershipComponent),
        title: 'Register Co-Owner Share'
      },
      {
        path: 'land/due-diligence',
        loadComponent: () => import('./features/land/due-diligence/due-diligence.component').then(m => m.DueDiligenceComponent),
        title: 'Legal Due Diligence & Encumbrance Tracking'
      },
      {
        path: 'land/valuation-costing',
        loadComponent: () => import('./features/land/valuation-costing/valuation-costing.component').then(m => m.ValuationCostingComponent),
        title: 'Land Valuation & Acquisition Costing'
      },
      {
        path: 'land/valuation-costing/costings/create',
        loadComponent: () => import('./features/land/valuation-costing/valuation-costing-form.component').then(m => m.ValuationCostingFormComponent),
        data: { recordType: 'costing' },
        title: 'Create Acquisition Costing'
      },
      {
        path: 'land/valuation-costing/costings/:id/edit',
        loadComponent: () => import('./features/land/valuation-costing/valuation-costing-form.component').then(m => m.ValuationCostingFormComponent),
        data: { recordType: 'costing' },
        title: 'Edit Acquisition Costing'
      },
      {
        path: 'land/valuation-costing/valuations/create',
        loadComponent: () => import('./features/land/valuation-costing/valuation-costing-form.component').then(m => m.ValuationCostingFormComponent),
        data: { recordType: 'valuation' },
        title: 'Create Land Valuation'
      },
      {
        path: 'land/valuation-costing/valuations/:id/edit',
        loadComponent: () => import('./features/land/valuation-costing/valuation-costing-form.component').then(m => m.ValuationCostingFormComponent),
        data: { recordType: 'valuation' },
        title: 'Edit Land Valuation'
      },
      {
        path: 'land/negotiation',
        loadComponent: () => import('./features/land/negotiation/negotiation.component').then(m => m.NegotiationComponent),
        title: 'Landowner Negotiation & Agreement Management'
      },
      {
        path: 'land/negotiation/create',
        loadComponent: () => import('./features/land/negotiation/negotiation-form/negotiation-form.component').then(m => m.NegotiationFormComponent),
        title: 'New Commercial Negotiation '
      },
      {
        path: 'land/negotiation/:id/edit',
        loadComponent: () => import('./features/land/negotiation/negotiation-form/negotiation-form.component').then(m => m.NegotiationFormComponent),
        title: 'Edit Commercial Negotiation '
      },
      {
        path: 'land/payment-schedules',
        loadComponent: () => import('./features/land/payment-schedules/payment-schedules.component').then(m => m.PaymentSchedulesComponent),
        title: 'Land Payment Schedules & Outstanding Balances'
      },
      {
        path: 'land/reports',
        loadComponent: () => import('./features/land/reports/land-reports.component').then(m => m.LandReportsComponent),
        title: 'Land Acquisition & Bank Intelligence Reports (15)'
      },
      {
        path: 'land/surveys',
        loadComponent: () => import('./features/land/surveys/surveys.component').then(m => m.SurveysComponent),
        title: 'Historic Land Surveys (CS/SA/RS/BS) '
      },
      {
        path: 'land/jv-agreements',
        loadComponent: () => import('./features/land/jv-agreements/jv-agreements.component').then(m => m.JVAgreementsComponent),
        title: 'Joint Venture (JV) Agreements '
      },
      {
        path: 'projects',
        redirectTo: 'projects/master',
        pathMatch: 'full'
      },
      {
        path: 'projects/master',
        loadComponent: () => import('./features/projects/project-master/project-master.component').then(m => m.ProjectMasterComponent),
        title: 'Project Registration & Master Setup '
      },
      {
        path: 'projects/search',
        loadComponent: () => import('./features/projects/project-search/project-search.component').then(m => m.ProjectSearchComponent),
        title: 'Project Search'
      },
      {
        path: 'projects/feasibility',
        loadComponent: () => import('./features/projects/feasibility/feasibility.component').then(m => m.ProjectFeasibilityComponent),
        title: 'Project Feasibility & Investment Analysis '
      },
      {
        path: 'projects/land-allocation',
        loadChildren: () => import('./features/projects/land-allocation/land-allocation.routes').then(m => m.LAND_ALLOCATION_ROUTES),
        title: 'Project-wise Land Allocation '
      },
      {
        path: 'projects/towers-units',
        loadChildren: () => import('./features/projects/towers-units/towers-units.routes').then(m => m.TOWERS_UNITS_ROUTES),
        title: '2.4 Building, Tower, Floor & Unit Setup '
      },
      {
        path: 'projects/budget-planning',
        redirectTo: '/budgeting/planning',
        pathMatch: 'full'
      },
      {
        path: 'projects/profitability-roi',
        loadComponent: () => import('./features/projects/profitability-roi/profitability-roi.component').then(m => m.ProjectProfitabilityRoiComponent),
        title: 'Estimated Profitability & ROI '
      },
      {
        path: 'projects/profitability-roi/create',
        loadComponent: () => import('./features/projects/profitability-roi/profitability-form.component').then(m => m.ProfitabilityFormComponent),
        title: 'Create Profitability & ROI Forecast '
      },
      {
        path: 'projects/profitability-roi/edit/:id',
        loadComponent: () => import('./features/projects/profitability-roi/profitability-form.component').then(m => m.ProfitabilityFormComponent),
        title: 'Edit Profitability & ROI Forecast '
      },
      {
        path: 'projects/timeline-milestones',
        loadComponent: () => import('./features/projects/timeline-milestones/timeline-milestones.component').then(m => m.ProjectTimelineMilestonesComponent),
        title: 'Project Timeline & Milestones '
      },
      {
        path: 'projects/timeline-milestones/create',
        loadComponent: () => import('./features/projects/timeline-milestones/milestone-form.component').then(m => m.MilestoneFormComponent),
        title: 'Add Project Milestone '
      },
      {
        path: 'projects/timeline-milestones/edit/:id',
        loadComponent: () => import('./features/projects/timeline-milestones/milestone-form.component').then(m => m.MilestoneFormComponent),
        title: 'Edit Project Milestone '
      },
      {
        path: 'projects/regulatory-approvals',
        loadComponent: () => import('./features/projects/regulatory-approvals/regulatory-approvals.component').then(m => m.ProjectRegulatoryApprovalsComponent),
        title: '2.8 Regulatory Approvals & Compliance '
      },
      {
        path: 'projects/regulatory-approvals/create',
        loadComponent: () => import('./features/projects/regulatory-approvals/approval-form.component').then(m => m.ApprovalFormComponent),
        title: 'Record Regulatory Approval '
      },
      {
        path: 'projects/regulatory-approvals/edit/:id',
        loadComponent: () => import('./features/projects/regulatory-approvals/approval-form.component').then(m => m.ApprovalFormComponent),
        title: 'Edit Regulatory Approval '
      },
      {
        path: 'projects/drawings-documents',
        loadComponent: () => import('./features/projects/drawings-documents/drawings-documents.component').then(m => m.ProjectDrawingsDocumentsComponent),
        title: '2.9 Architectural Drawings & Documents '
      },
      {
        path: 'projects/drawings-documents/create',
        loadComponent: () => import('./features/projects/drawings-documents/drawing-form.component').then(m => m.DrawingFormComponent),
        title: 'Register Drawing & Document '
      },
      {
        path: 'projects/drawings-documents/edit/:id',
        loadComponent: () => import('./features/projects/drawings-documents/drawing-form.component').then(m => m.DrawingFormComponent),
        title: 'Edit Drawing & Document '
      },
      {
        path: 'projects/construction-monitoring',
        loadChildren: () => import('./features/projects/construction-monitoring/construction-monitoring.routes').then(m => m.CONSTRUCTION_MONITORING_ROUTES),
        title: '2.10 Construction Progress Monitoring '
      },
      {
        path: 'projects/risk-issues',
        loadChildren: () => import('./features/projects/risk-issues/risk-issues.routes').then(m => m.RISK_ISSUES_ROUTES),
        title: '2.11 Project Risk & Issue Management '
      },
      {
        path: 'projects/change-orders',
        loadChildren: () => import('./features/projects/change-orders/change-orders.routes').then(m => m.CHANGE_ORDERS_ROUTES),
        title: '2.12 Project Change Orders & Variations '
      },
      {
        path: 'projects/financial-performance',
        loadComponent: () => import('./features/projects/financial-performance/financial-performance.component').then(m => m.ProjectFinancialPerformanceComponent),
        title: '2.13 Project-wise Financial Performance '
      },
      {
        path: 'projects/financial-performance/create',
        loadComponent: () => import('./features/projects/financial-performance/financial-form.component').then(m => m.FinancialFormComponent),
        title: 'Record Project Financial P&L '
      },
      {
        path: 'projects/financial-performance/edit/:id',
        loadComponent: () => import('./features/projects/financial-performance/financial-form.component').then(m => m.FinancialFormComponent),
        title: 'Edit Project Financial P&L '
      },
      {
        path: 'projects/reports-dashboard',
        loadComponent: () => import('./features/projects/reports-dashboard/reports-dashboard.component').then(m => m.ProjectReportsDashboardComponent),
        title: '2.14 Project Reports & Executive Dashboard '
      },
      {
        path: 'projects/handover-closure',
        loadChildren: () => import('./features/projects/handover-closure/handover-closure.routes').then(m => m.HANDOVER_CLOSURE_ROUTES),
        title: '2.15 Project Handover & Closure '
      },
      {
        path: 'projects/list',
        loadComponent: () => import('./features/projects/projects-list/projects-list.component').then(m => m.ProjectsListComponent),
        title: 'Project Spatial Modeling (FAR & Towers) '
      },
      {
        path: 'projects/clearances',
        loadComponent: () => import('./features/projects/clearances/clearances.component').then(m => m.ClearancesComponent),
        title: 'Statutory Permits & Clearances '
      },
      {
        path: 'projects/boq',
        loadComponent: () => import('./features/projects/boq/boq.component').then(m => m.BOQComponent),
        title: 'BOQ Estimation & IFC Drawings '
      },
      {
        path: 'inventory/stacking-plan',
        loadComponent: () => import('./features/inventory/tower-stacking/tower-stacking.component').then(m => m.TowerStackingComponent),
        title: 'Visual 2D Tower Stacking Plan & Unit Matrix '
      },
      {
        path: 'inventory/matrix',
        loadComponent: () => import('./features/inventory/inventory-matrix/inventory-matrix.component').then(m => m.InventoryMatrixComponent),
        title: 'Property Inventory & 15-Min Mutex Matrix '
      },
      {
        path: 'inventory/facilities',
        loadComponent: () => import('./features/inventory/facility-management/facility-management.component').then(m => m.FacilityManagementComponent),
        title: '3.7 Parking & Additional Facility Allocation '
      },
      {
        path: 'inventory/combinations',
        loadComponent: () => import('./features/inventory/facility-management/facility-management.component').then(m => m.FacilityManagementComponent),
        title: '3.8 Unit Combination and Subdivision Engine '
      },
      {
        path: 'inventory/documents',
        loadComponent: () => import('./features/inventory/property-documents/property-documents.component').then(m => m.PropertyDocumentsComponent),
        title: '3.6 Floor Plans, Property Images & Technical Documents '
      },
      {
        path: 'inventory/subdivision',
        redirectTo: 'inventory/combinations',
        pathMatch: 'full'
      },
      {
        path: 'inventory/parking',
        redirectTo: 'inventory/facilities',
        pathMatch: 'full'
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/inventory/property-inventory/property-inventory.component').then(m => m.PropertyInventoryComponent),
        title: 'Property Inventory Cockpit & Stacking '
      },
      {
        path: 'inventory/dashboard',
        redirectTo: 'inventory',
        pathMatch: 'full'
      },
      {
        path: 'inventory/stacking-plan',
        loadComponent: () => import('./features/inventory/property-inventory/property-inventory.component').then(m => m.PropertyInventoryComponent),
        title: 'Tower Stacking Elevation '
      },
      {
        path: 'inventory/matrix',
        loadComponent: () => import('./features/inventory/property-inventory/property-inventory.component').then(m => m.PropertyInventoryComponent),
        title: 'Floor-wise Unit Matrix '
      },
      {
        path: 'inventory/units/new',
        loadComponent: () => import('./features/inventory/property-inventory/property-unit-form.component').then(m => m.PropertyUnitFormComponent),
        title: 'Register Property Unit'
      },
      {
        path: 'inventory/units/:id',
        loadComponent: () => import('./features/inventory/property-inventory/property-unit-detail.component').then(m => m.PropertyUnitDetailComponent),
        title: 'Complete Property Record'
      },
      {
        path: 'inventory/units/:id/edit',
        loadComponent: () => import('./features/inventory/property-inventory/property-unit-form.component').then(m => m.PropertyUnitFormComponent),
        title: 'Edit Property Unit'
      },
      {
        path: 'inventory/units',
        loadComponent: () => import('./features/inventory/property-inventory/property-inventory.component').then(m => m.PropertyInventoryComponent),
        title: 'Property Units Directory'
      },
      {
        path: 'inventory/parking',
        loadComponent: () => import('./features/inventory/property-inventory/property-inventory.component').then(m => m.PropertyInventoryComponent),
        title: 'Basement Parking Bays '
      },
      {
        path: 'inventory/pricing',
        loadComponent: () => import('./features/inventory/unit-pricing/unit-pricing.component').then(m => m.UnitPricingComponent),
        title: 'Unit Pricing & Price List Management '
      },
      {
        path: 'inventory/price-lists',
        redirectTo: 'inventory/pricing',
        pathMatch: 'full'
      },
      {
        path: 'inventory/availability',
        loadComponent: () => import('./features/inventory/unit-availability/unit-availability.component').then(m => m.UnitAvailabilityComponent),
        title: 'Real-Time Unit Availability & Reservation State Machine '
      },
      {
        path: 'inventory/reservations',
        redirectTo: 'inventory/availability',
        pathMatch: 'full'
      },
      {
        path: 'crm',
        loadComponent: () => import('./features/crm/crm-dashboard/crm-dashboard.component').then(m => m.CrmDashboardComponent),
        title: 'CRM Dashboard & Sales KPIs '
      },
      {
        path: 'crm/dashboard',
        redirectTo: 'crm',
        pathMatch: 'full'
      },
      {
        path: 'crm/leads',
        loadComponent: () => import('./features/crm/crm-leads/crm-leads.component').then(m => m.CrmLeadsComponent),
        title: 'Omnichannel CRM Leads & Kanban '
      },
      {
        path: 'crm/lead-capture',
        loadComponent: () => import('./features/crm/crm-lead-capture/crm-lead-capture.component').then(m => m.CrmLeadCaptureComponent),
        title: 'Lead Capture & Source Management '
      },
      {
        path: 'crm/lead-capture/new',
        loadComponent: () => import('./features/crm/crm-lead-capture/lead-capture-form.component').then(m => m.LeadCaptureFormComponent),
        title: 'Capture New Lead '
      },
      {
        path: 'crm/lead-capture/import',
        loadComponent: () => import('./features/crm/crm-lead-capture/lead-import.component').then(m => m.LeadImportComponent),
        title: 'Lead Bulk Import & History '
      },
      {
        path: 'crm/lead-capture/:id/edit',
        loadComponent: () => import('./features/crm/crm-lead-capture/lead-capture-form.component').then(m => m.LeadCaptureFormComponent),
        title: 'Edit Lead '
      },
      {
        path: 'crm/lead-assignments',
        loadComponent: () => import('./features/crm/crm-lead-assignments/crm-lead-assignments.component').then(m => m.CrmLeadAssignmentsComponent),
        title: 'Lead Assignment & Distribution '
      },
      {
        path: 'crm/lead-assignments/rules/new',
        loadComponent: () => import('./features/crm/crm-lead-assignments/assignment-rule-form.component').then(m => m.AssignmentRuleFormComponent),
        title: 'Create Assignment Rule '
      },
      {
        path: 'crm/lead-assignments/rules/:id/edit',
        loadComponent: () => import('./features/crm/crm-lead-assignments/assignment-rule-form.component').then(m => m.AssignmentRuleFormComponent),
        title: 'Edit Assignment Rule '
      },
      {
        path: 'crm/lead-qualification',
        loadComponent: () => import('./features/crm/crm-lead-qualification/crm-lead-qualification.component').then(m => m.CrmLeadQualificationComponent),
        title: 'Lead Qualification & Scoring '
      },
      {
        path: 'crm/customers',
        loadComponent: () => import('./features/crm/crm-customers/crm-customers.component').then(m => m.CrmCustomersComponent),
        title: 'Customer KYC & Nominee Profiles '
      },
      {
        path: 'crm/customers/new',
        loadComponent: () => import('./features/crm/crm-customers/customer-form.component').then(m => m.CustomerFormComponent),
        title: 'Register New Customer '
      },
      {
        path: 'crm/customers/:id',
        loadComponent: () => import('./features/crm/crm-customers/customer-dossier.component').then(m => m.CustomerDossierComponent),
        title: 'Customer Dossier '
      },
      {
        path: 'crm/customers/:id/edit',
        loadComponent: () => import('./features/crm/crm-customers/customer-form.component').then(m => m.CustomerFormComponent),
        title: 'Edit Customer KYC '
      },
      {
        path: 'crm/requirements',
        loadComponent: () => import('./features/crm/crm-requirements/crm-requirements.component').then(m => m.CrmRequirementsComponent),
        title: 'Customer Requirements & Budget Tracking '
      },
      {
        path: 'crm/requirements/new',
        loadComponent: () => import('./features/crm/crm-requirements/requirement-form.component').then(m => m.RequirementFormComponent),
        title: 'Capture Customer Requirement '
      },
      {
        path: 'crm/requirements/:id',
        loadComponent: () => import('./features/crm/crm-requirements/requirement-detail.component').then(m => m.RequirementDetailComponent),
        title: 'Requirement & Inventory Matching '
      },
      {
        path: 'crm/requirements/:id/edit',
        loadComponent: () => import('./features/crm/crm-requirements/requirement-form.component').then(m => m.RequirementFormComponent),
        title: 'Edit Requirement Profile '
      },
      {
        path: 'crm/activities',
        loadComponent: () => import('./features/crm/crm-activities/crm-activities.component').then(m => m.CrmActivitiesComponent),
        title: 'Sales Interactions & Activity Calendar '
      },
      {
        path: 'crm/activities/new',
        loadComponent: () => import('./features/crm/crm-activities/activity-form.component').then(m => m.ActivityFormComponent),
        title: 'Schedule Sales Interaction '
      },
      {
        path: 'crm/activities/:id/edit',
        loadComponent: () => import('./features/crm/crm-activities/activity-form.component').then(m => m.ActivityFormComponent),
        title: 'Edit Scheduled Interaction '
      },
      {
        path: 'crm/tasks',
        loadComponent: () => import('./features/crm/crm-tasks/crm-tasks.component').then(m => m.CrmTasksComponent),
        title: 'Follow-up Tasks & Reminders '
      },
      {
        path: 'crm/tasks/new',
        loadComponent: () => import('./features/crm/crm-tasks/task-form.component').then(m => m.TaskFormComponent),
        title: 'Create Follow-up Task '
      },
      {
        path: 'crm/tasks/:id/edit',
        loadComponent: () => import('./features/crm/crm-tasks/task-form.component').then(m => m.TaskFormComponent),
        title: 'Edit Follow-up Task '
      },
      {
        path: 'crm/communications',
        loadComponent: () => import('./features/crm/crm-communications/crm-communications.component').then(m => m.CrmCommunicationsComponent),
        title: 'Customer Communication History '
      },
      {
        path: 'crm/brokers',
        loadComponent: () => import('./features/crm/crm-brokers/crm-brokers.component').then(m => m.CrmBrokersComponent),
        title: '4.10 Broker & Referral Management '
      },
      {
        path: 'crm/brokers/new',
        loadComponent: () => import('./features/crm/crm-brokers/broker-form.component').then(m => m.BrokerFormComponent),
        title: 'Onboard Broker / Referral Partner '
      },
      {
        path: 'crm/brokers/:id/edit',
        loadComponent: () => import('./features/crm/crm-brokers/broker-form.component').then(m => m.BrokerFormComponent),
        title: 'Edit Partner Agreement '
      },
      {
        path: 'crm/brokers/claims/new',
        loadComponent: () => import('./features/crm/crm-brokers/commission-claim-form.component').then(m => m.CommissionClaimFormComponent),
        title: 'Submit Commission Claim '
      },
      {
        path: 'crm/funnel',
        loadComponent: () => import('./features/crm/crm-funnel/crm-funnel.component').then(m => m.CrmFunnelComponent),
        title: '4.11 Sales Funnel & Lead Conversion '
      },
      {
        path: 'crm/funnel/opportunities/new',
        loadComponent: () => import('./features/crm/crm-funnel/opportunity-form.component').then(m => m.OpportunityFormComponent),
        title: 'Create Sales Opportunity '
      },
      {
        path: 'crm/funnel/opportunities/:id/edit',
        loadComponent: () => import('./features/crm/crm-funnel/opportunity-form.component').then(m => m.OpportunityFormComponent),
        title: 'Edit Sales Opportunity '
      },
      {
        path: 'crm/funnel/handovers/new',
        loadComponent: () => import('./features/crm/crm-funnel/booking-handover-form.component').then(m => m.BookingHandoverFormComponent),
        title: 'Create Booking Handover Dossier '
      },
      {
        path: 'crm/handovers',
        loadComponent: () => import('./features/crm/crm-handovers/crm-handovers.component').then(m => m.CrmHandoversComponent),
        title: '4.12 Lead-to-Booking Handover '
      },
      {
        path: 'crm/handovers/:id',
        loadComponent: () => import('./features/crm/crm-handovers/handover-dossier.component').then(m => m.HandoverDossierComponent),
        title: '10-Step Handover Dossier '
      },
      {
        path: 'crm/campaigns',
        loadComponent: () => import('./features/crm/crm-campaigns/crm-campaigns.component').then(m => m.CrmCampaignsComponent),
        title: '4.13 Campaign & Marketing Management '
      },
      {
        path: 'crm/campaigns/new',
        loadComponent: () => import('./features/crm/crm-campaigns/campaign-form.component').then(m => m.CampaignFormComponent),
        title: 'Launch Marketing Campaign '
      },
      {
        path: 'crm/campaigns/:id/edit',
        loadComponent: () => import('./features/crm/crm-campaigns/campaign-form.component').then(m => m.CampaignFormComponent),
        title: 'Edit Marketing Campaign '
      },
      {
        path: 'crm/campaigns/import',
        loadComponent: () => import('./features/crm/crm-campaigns/campaign-import.component').then(m => m.CampaignImportComponent),
        title: 'Import Exhibition & Offline Leads '
      },
      {
        path: 'sales/bookings',
        loadComponent: () => import('./features/sales/sales-bookings/sales-bookings.component').then(m => m.SalesBookingsComponent),
        title: 'Apartment Bookings & Sales Workflow '
      },
      {
        path: 'sales/bookings/create',
        loadComponent: () => import('./features/sales/sales-bookings/booking-form.component').then(m => m.BookingFormComponent),
        title: 'Execute Apartment Booking & Reservation '
      },
      {
        path: 'sales/bookings/:id/edit',
        loadComponent: () => import('./features/sales/sales-bookings/booking-form.component').then(m => m.BookingFormComponent),
        title: 'Edit Apartment Booking & Pricing '
      },
      {
        path: 'sales/bookings/:id',
        loadComponent: () => import('./features/sales/sales-bookings/booking-details.component').then(m => m.BookingDetailsComponent),
        title: 'Booking Details & 10-Stage Lifecycle '
      },
      {
        path: 'sales/discounts',
        loadComponent: () => import('./features/sales/sales-discounts/sales-discounts.component').then(m => m.SalesDiscountsComponent),
        title: '5.4 Price Negotiation & Discount Approvals '
      },
      {
        path: 'sales/discounts/create',
        loadComponent: () => import('./features/sales/sales-discounts/discount-proposal-form.component').then(m => m.DiscountProposalFormComponent),
        title: 'Submit Price Negotiation & Concession '
      },
      {
        path: 'sales/discounts/:id',
        loadComponent: () => import('./features/sales/sales-discounts/discount-proposal-details.component').then(m => m.DiscountProposalDetailsComponent),
        title: 'Commercial Proposal Dossier & Authorization '
      },
      {
        path: 'sales/collections',
        loadComponent: () => import('./features/sales/sales-collections/sales-collections.component').then(m => m.SalesCollectionsComponent),
        title: '5.5 Booking Money & Down Payment Collection '
      },
      {
        path: 'sales/collections/create',
        loadComponent: () => import('./features/sales/sales-collections/collection-form.component').then(m => m.CollectionFormComponent),
        title: 'Record Commercial Payment Collection '
      },
      {
        path: 'sales/collections/:id',
        loadComponent: () => import('./features/sales/sales-collections/collection-details.component').then(m => m.CollectionDetailsComponent),
        title: 'Money Receipt Dossier & Accounting Control '
      },
      {
        path: 'sales/documents',
        loadComponent: () => import('./features/sales/sales-documents/sales-documents.component').then(m => m.SalesDocumentsComponent),
        title: '5.6 Sales Agreements & Deed Preparation '
      },
      {
        path: 'sales/documents/create',
        loadComponent: () => import('./features/sales/sales-documents/document-form.component').then(m => m.DocumentFormComponent),
        title: 'Generate Legal Document & Agreement '
      },
      {
        path: 'sales/documents/:id',
        loadComponent: () => import('./features/sales/sales-documents/document-details.component').then(m => m.DocumentDetailsComponent),
        title: 'Legal Instrument Dossier & Execution '
      },
      {
        path: 'sales/schedules',
        loadComponent: () => import('./features/sales/sales-schedules/sales-schedules.component').then(m => m.SalesSchedulesComponent),
        title: '5.7 Installment Schedule Generation & Amortization '
      },
      {
        path: 'sales/schedules/create',
        loadComponent: () => import('./features/sales/sales-schedules/schedule-form.component').then(m => m.ScheduleFormComponent),
        title: 'Generate Installment Schedule '
      },
      {
        path: 'sales/schedules/:id/amend',
        loadComponent: () => import('./features/sales/sales-schedules/schedule-amend.component').then(m => m.ScheduleAmendComponent),
        title: 'Restructure & Amend Installment Schedule '
      },
      {
        path: 'sales/schedules/:id',
        loadComponent: () => import('./features/sales/sales-schedules/schedule-details.component').then(m => m.ScheduleDetailsComponent),
        title: 'Installment Schedule Dossier & Milestones '
      },
      {
        path: 'sales/ledger',
        loadComponent: () => import('./features/sales/sales-ledger/sales-ledger.component').then(m => m.SalesLedgerComponent),
        title: '5.8 Customer Sales Ledger & Subledger Statements '
      },
      {
        path: 'sales/ledger/customers/:id',
        loadComponent: () => import('./features/sales/sales-ledger/statement-details.component').then(m => m.StatementDetailsComponent),
        title: 'Customer Sales Statement Dossier '
      },
      {
        path: 'sales/ledger/adjustments/create',
        loadComponent: () => import('./features/sales/sales-ledger/adjustment-form.component').then(m => m.AdjustmentFormComponent),
        title: 'Post Commercial Adjustment & Credit Note '
      },
      {
        path: 'sales/cancellations',
        loadComponent: () => import('./features/sales/sales-cancellations/sales-cancellations.component').then(m => m.SalesCancellationsComponent),
        title: '5.9 Cancellation & Refund Management '
      },
      {
        path: 'sales/cancellations/create',
        loadComponent: () => import('./features/sales/sales-cancellations/cancellation-form.component').then(m => m.CancellationFormComponent),
        title: 'Initiate Booking Cancellation & Refund '
      },
      {
        path: 'sales/cancellations/:id',
        loadComponent: () => import('./features/sales/sales-cancellations/cancellation-details.component').then(m => m.CancellationDetailsComponent),
        title: 'Cancellation Dossier & Multi-Tier Approvals '
      },
      {
        path: 'sales/transfers',
        loadComponent: () => import('./features/sales/sales-transfers/sales-transfers.component').then(m => m.SalesTransfersComponent),
        title: '5.10 Property Transfer & Buyer Change '
      },
      {
        path: 'sales/transfers/create',
        loadComponent: () => import('./features/sales/sales-transfers/transfer-form.component').then(m => m.TransferFormComponent),
        title: 'Initiate Property Transfer & Mutation '
      },
      {
        path: 'sales/transfers/:id',
        loadComponent: () => import('./features/sales/sales-transfers/transfer-details.component').then(m => m.TransferDetailsComponent),
        title: 'Ownership Transfer Dossier & Mutation '
      },
      {
        path: 'sales/registrations',
        loadComponent: () => import('./features/sales/sales-registrations/sales-registrations.component').then(m => m.SalesRegistrationsComponent),
        title: '5.11 Registration & Deed Tracking '
      },
      {
        path: 'sales/registrations/create',
        loadComponent: () => import('./features/sales/sales-registrations/registration-form.component').then(m => m.RegistrationFormComponent),
        title: 'Initialize Deed Registration Dossier '
      },
      {
        path: 'sales/registrations/:id',
        loadComponent: () => import('./features/sales/sales-registrations/registration-details.component').then(m => m.RegistrationDetailsComponent),
        title: 'Registration Dossier & Deed Tracking '
      },
      {
        path: 'sales/handovers',
        loadComponent: () => import('./features/sales/sales-handovers/sales-handovers.component').then(m => m.SalesHandoversComponent),
        title: '5.12 Property Handover Management '
      },
      {
        path: 'sales/handovers/create',
        loadComponent: () => import('./features/sales/sales-handovers/handover-form.component').then(m => m.HandoverFormComponent),
        title: 'Initiate Property Handover Dossier '
      },
      {
        path: 'sales/handovers/:id',
        loadComponent: () => import('./features/sales/sales-handovers/handover-details.component').then(m => m.HandoverDetailsComponent),
        title: 'Property Handover Dossier & Possession '
      },
      {
        path: 'sales/reports/property-report',
        loadComponent: () => import('./features/sales/property-reports/property-report.component').then(m => m.PropertyReportComponent),
        title: 'Property & Portfolio Intelligence Report '
      },
      {
        path: 'sales/reports',
        redirectTo: 'sales/reports/property-report',
        pathMatch: 'full'
      },
      {
        path: 'installments/schedules',
        loadComponent: () => import('./features/installments/installment-schedules/installment-schedules.component').then(m => m.InstallmentSchedulesComponent),
        title: 'Installment Schedules & Milestone Triggers '
      },
      {
        path: 'installments/money-receipts',
        loadComponent: () => import('./features/installments/money-receipts/money-receipts.component').then(m => m.MoneyReceiptsComponent),
        title: 'Money Receipts & Waterfall Collections '
      },
      {
        path: 'installments/tripartite-loans',
        loadComponent: () => import('./features/installments/tripartite-loans/tripartite-loans.component').then(m => m.TripartiteLoansComponent),
        title: 'Bank Home Loan Tripartite Ledger '
      },
      {
        path: 'installments/pdc-vault',
        loadComponent: () => import('./features/installments/pdc-vault/pdc-vault.component').then(m => m.PDCVaultComponent),
        title: 'PDC Cheque Vault & Safe Deposits '
      },
      {
        path: 'installments/ni138-actions',
        loadComponent: () => import('./features/installments/ni138-actions/ni138-actions.component').then(m => m.NI138ActionsComponent),
        title: 'NI Act 1881 Section 138 Cheque Dishonour Litigation '
      },
      {
        path: 'construction/wbs-boq',
        loadComponent: () => import('./features/construction/construction-wbs-boq/construction-wbs-boq.component').then(m => m.ConstructionWbsBoqComponent),
        title: 'Construction WBS & BOQ Hard Budget Locks '
      },
      {
        path: 'construction/dpr',
        loadComponent: () => import('./features/construction/construction-dpr/construction-dpr.component').then(m => m.ConstructionDprComponent),
        title: 'Construction Site Diary (DPR) '
      },
      {
        path: 'construction/labor-muster',
        loadComponent: () => import('./features/construction/construction-labor-muster/construction-labor-muster.component').then(m => m.ConstructionLaborMusterComponent),
        title: 'Subcontractor Labor Muster Roll '
      },
      {
        path: 'construction/ra-bills',
        loadComponent: () => import('./features/construction/construction-ra-bills/construction-ra-bills.component').then(m => m.ConstructionRaBillsComponent),
        title: 'Contractor Running Account (RA) Billing '
      },
      {
        path: 'construction/cube-tests',
        loadComponent: () => import('./features/construction/concrete-cube-tests/concrete-cube-tests.component').then(m => m.ConcreteCubeTestsComponent),
        title: 'Concrete Cube Crushing Test Register '
      },
      {
        path: 'construction/safety-ncr',
        loadComponent: () => import('./features/construction/safety-ncr/safety-ncr.component').then(m => m.SafetyNcrComponent),
        title: 'Site Safety & Non-Conformance Reports (NCR) '
      },
      {
        path: 'procurement',
        redirectTo: 'procurement/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'procurement/dashboard',
        loadComponent: () => import('./features/procurement/dashboard/procurement-dashboard.component').then(m => m.ProcurementDashboardComponent),
        title: 'Procurement & Inventory Dashboard '
      },
      {
        path: 'procurement/vendors/new',
        loadComponent: () => import('./features/procurement/vendors/vendor-management.component').then(m => m.VendorManagementComponent),
        title: 'Register Supplier'
      },
      {
        path: 'procurement/vendors/:id/edit',
        loadComponent: () => import('./features/procurement/vendors/vendor-management.component').then(m => m.VendorManagementComponent),
        title: 'Edit Supplier'
      },
      {
        path: 'procurement/vendors',
        loadComponent: () => import('./features/procurement/vendors/vendor-management.component').then(m => m.VendorManagementComponent),
        title: 'Supplier & Vendor Management '
      },
      {
        path: 'procurement/materials/new',
        loadComponent: () => import('./features/procurement/materials/material-master.component').then(m => m.MaterialMasterComponent),
        title: 'Add Material'
      },
      {
        path: 'procurement/materials/:id/edit',
        loadComponent: () => import('./features/procurement/materials/material-master.component').then(m => m.MaterialMasterComponent),
        title: 'Edit Material'
      },
      {
        path: 'procurement/materials',
        loadComponent: () => import('./features/procurement/materials/material-master.component').then(m => m.MaterialMasterComponent),
        title: 'Material & Item Master '
      },
      {
        path: 'procurement/requisitions/new',
        loadComponent: () => import('./features/procurement/requisitions/purchase-requisitions.component').then(m => m.PurchaseRequisitionsComponent),
        title: 'Raise Purchase Requisition'
      },
      {
        path: 'procurement/requisitions/:id/edit',
        loadComponent: () => import('./features/procurement/requisitions/purchase-requisitions.component').then(m => m.PurchaseRequisitionsComponent),
        title: 'Edit Purchase Requisition'
      },
      {
        path: 'procurement/requisitions',
        loadComponent: () => import('./features/procurement/requisitions/purchase-requisitions.component').then(m => m.PurchaseRequisitionsComponent),
        title: 'Purchase Requisition (PR) '
      },
      {
        path: 'procurement/rfq-comparison/new',
        loadComponent: () => import('./features/procurement/rfq-comparison/rfq-comparison.component').then(m => m.RfqComparisonComponent),
        title: 'New RFQ / Supplier Quotation Comparison'
      },
      {
        path: 'procurement/rfq-comparison',
        loadComponent: () => import('./features/procurement/rfq-comparison/rfq-comparison.component').then(m => m.RfqComparisonComponent),
        title: 'RFQ & Supplier Quotation Comparison '
      },
      {
        path: 'procurement/purchase-orders/new',
        loadComponent: () => import('./features/procurement/purchase-orders/purchase-orders.component').then(m => m.PurchaseOrdersComponent),
        title: 'Create Purchase Order'
      },
      {
        path: 'procurement/purchase-orders',
        loadComponent: () => import('./features/procurement/purchase-orders/purchase-orders.component').then(m => m.PurchaseOrdersComponent),
        title: 'Purchase Order (PO) Management '
      },
      {
        path: 'procurement/grn',
        loadComponent: () => import('./features/procurement/grn/goods-receipts.component').then(m => m.GoodsReceiptsComponent),
        title: 'Goods Receipt Note (GRN) '
      },
      {
        path: 'procurement/inspections',
        loadComponent: () => import('./features/procurement/inspections/quality-inspections.component').then(m => m.QualityInspectionsComponent),
        title: 'Quality Inspection & Rejection '
      },
      {
        path: 'procurement/warehouse-stock',
        loadComponent: () => import('./features/procurement/warehouse-stock/warehouse-stock.component').then(m => m.WarehouseStockComponent),
        title: 'Warehouse & Project-Site Stock '
      },
      {
        path: 'procurement/material-issues',
        loadComponent: () => import('./features/procurement/material-issues/material-issues.component').then(m => m.MaterialIssuesComponent),
        title: 'Material Issue & Consumption '
      },
      {
        path: 'procurement/stock-transfers',
        loadComponent: () => import('./features/procurement/stock-transfers/stock-transfers.component').then(m => m.StockTransfersComponent),
        title: 'Stock Transfer & Adjustment '
      },
      {
        path: 'procurement/material-planning',
        loadComponent: () => import('./features/procurement/material-planning/material-planning.component').then(m => m.MaterialPlanningComponent),
        title: 'Reorder Levels & Material Planning '
      },
      {
        path: 'procurement/inventory-ledger',
        loadComponent: () => import('./features/procurement/inventory-ledger/inventory-ledger.component').then(m => m.InventoryLedgerComponent),
        title: 'Stock Valuation & Inventory Ledger '
      },
      {
        path: 'procurement/supplier-bills',
        loadComponent: () => import('./features/procurement/supplier-bills/supplier-bills.component').then(m => m.SupplierBillsComponent),
        title: 'Supplier Bills & Payment Reconciliation '
      },
      {
        path: 'procurement/reports-audit',
        loadComponent: () => import('./features/procurement/reports-audit/reports-audit.component').then(m => m.ReportsAuditComponent),
        title: 'Procurement Reports & Audit Trail '
      },
      {
        path: 'procurement/cockpit',
        redirectTo: 'procurement/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'procurement/stores',
        redirectTo: 'procurement/warehouse-stock',
        pathMatch: 'full'
      },
      {
        path: 'procurement/comparative-statements',
        redirectTo: 'procurement/rfq-comparison',
        pathMatch: 'full'
      },
      {
        path: 'accounts',
        redirectTo: 'accounts/financial-dashboard',
        pathMatch: 'full'
      },
      {
        path: 'accounts/financial-dashboard',
        loadComponent: () => import('./features/accounts/financial-dashboard/financial-dashboard.component').then(m => m.FinancialDashboardComponent),
        title: 'Executive Financial Dashboard across 20+ Projects '
      },
      {
        path: 'accounts/coa',
        loadComponent: () => import('./features/accounts/accounts-coa/accounts-coa.component').then(m => m.AccountsCoaComponent),
        title: 'Chart of Accounts (COA) '
      },
      {
        path: 'accounts/coa/create',
        loadComponent: () => import('./features/accounts/accounts-coa/coa-form.component').then(m => m.CoaFormComponent),
        title: 'New Account Head - Chart of Accounts (COA)'
      },
      {
        path: 'accounts/coa/edit/:id',
        loadComponent: () => import('./features/accounts/accounts-coa/coa-form.component').then(m => m.CoaFormComponent),
        title: 'Edit Account Head - Chart of Accounts (COA)'
      },
      {
        path: 'accounts/vouchers',
        loadComponent: () => import('./features/accounts/accounts-vouchers/accounts-vouchers.component').then(m => m.AccountsVouchersComponent),
        title: 'General Ledger Vouchers '
      },
      {
        path: 'accounts/vouchers/create',
        loadComponent: () => import('./features/accounts/accounts-vouchers/voucher-form.component').then(m => m.VoucherFormComponent),
        title: 'Post New Journal Voucher - General Ledger'
      },
      {
        path: 'accounts/vouchers/view/:id',
        loadComponent: () => import('./features/accounts/accounts-vouchers/voucher-view.component').then(m => m.VoucherViewComponent),
        title: 'Voucher Audit Trail - General Ledger'
      },
      {
        path: 'accounts/ledger',
        loadComponent: () => import('./features/accounts/accounts-ledger/accounts-ledger.component').then(m => m.AccountsLedgerComponent),
        title: 'General Ledger Inquiry & Statements '
      },
      {
        path: 'accounts/payables',
        loadComponent: () => import('./features/accounts/accounts-payables/accounts-payables.component').then(m => m.AccountsPayablesComponent),
        title: '5.1 Accounts Payable (AP) & Supplier Bills '
      },
      {
        path: 'accounts/payables/create',
        loadComponent: () => import('./features/accounts/accounts-payables/payable-form.component').then(m => m.PayableFormComponent),
        title: 'Register Supplier Invoice / Contractor Bill - Accounts Payable'
      },
      {
        path: 'accounts/payables/view/:id',
        loadComponent: () => import('./features/accounts/accounts-payables/payable-view.component').then(m => m.PayableViewComponent),
        title: 'AP Invoice Audit & Payment Disbursement - Accounts Payable'
      },
      {
        path: 'accounts/payables/ledger',
        loadComponent: () => import('./features/accounts/accounts-payables/payable-ledger.component').then(m => m.PayableLedgerComponent),
        title: 'Supplier & Contractor Account Ledger & Aging - Accounts Payable'
      },
      {
        path: 'accounts/receivables',
        loadComponent: () => import('./features/accounts/accounts-receivables/accounts-receivables.component').then(m => m.AccountsReceivablesComponent),
        title: '5.2 Accounts Receivable (AR) & Demand Notices '
      },
      {
        path: 'accounts/receivables/create',
        loadComponent: () => import('./features/accounts/accounts-receivables/receivable-form.component').then(m => m.ReceivableFormComponent),
        title: 'Generate Demand Notice & Milestone Billing - Accounts Receivable'
      },
      {
        path: 'accounts/receivables/view/:id',
        loadComponent: () => import('./features/accounts/accounts-receivables/receivable-view.component').then(m => m.ReceivableViewComponent),
        title: 'AR Demand Notice Audit & Money Receipt - Accounts Receivable'
      },
      {
        path: 'accounts/receivables/ledger',
        loadComponent: () => import('./features/accounts/accounts-receivables/receivable-ledger.component').then(m => m.ReceivableLedgerComponent),
        title: 'Customer Ledger, Aging Analysis & Advance Receipts - Accounts Receivable'
      },
      {
        path: 'accounts/receivables/receipts',
        loadComponent: () => import('./features/accounts/accounts-receivables/receipts/receipt-list.component').then(m => m.ReceiptListComponent),
        title: '5.2.1 Customer Money Receipts & Multi-Invoice Allocation - Accounts Receivable'
      },
      {
        path: 'accounts/receivables/receipts/create',
        loadComponent: () => import('./features/accounts/accounts-receivables/receipts/receipt-form.component').then(m => m.ReceiptFormComponent),
        title: 'Register Money Receipt & Split Allocation - Accounts Receivable'
      },
      {
        path: 'accounts/receivables/receipts/view/:id',
        loadComponent: () => import('./features/accounts/accounts-receivables/receipts/receipt-view.component').then(m => m.ReceiptViewComponent),
        title: 'Money Receipt Audit, Clearance & Multi-Invoice Allocation Hub'
      },
      {
        path: 'accounts/cash-bank',
        loadComponent: () => import('./features/accounts/cash-bank-mfs/cash-bank-dashboard.component').then(m => m.CashBankDashboardComponent),
        title: '5.3 Cash, Bank & Mobile Financial Services (MFS) '
      },
      {
        path: 'accounts/cash-bank/boxes',
        redirectTo: 'accounts/cash-bank?tab=cash',
        pathMatch: 'full'
      },
      {
        path: 'accounts/cash-bank/accounts',
        redirectTo: 'accounts/cash-bank?tab=bank',
        pathMatch: 'full'
      },
      {
        path: 'accounts/cash-bank/mfs',
        redirectTo: 'accounts/cash-bank?tab=mfs',
        pathMatch: 'full'
      },
      {
        path: 'accounts/payment-vouchers',
        loadComponent: () => import('./features/accounts/payment-vouchers/payment-vouchers-list.component').then(m => m.PaymentVouchersListComponent),
        title: '8. Payment Vouchers Register - Approved Outgoing Payments'
      },
      {
        path: 'accounts/payment-vouchers/create',
        loadComponent: () => import('./features/accounts/payment-vouchers/payment-voucher-form.component').then(m => m.PaymentVoucherFormComponent),
        title: '8.1 Create Outgoing Payment Voucher - Double-Entry Outflow'
      },
      {
        path: 'accounts/payment-vouchers/edit/:id',
        loadComponent: () => import('./features/accounts/payment-vouchers/payment-voucher-form.component').then(m => m.PaymentVoucherFormComponent),
        title: '8.1 Edit Outgoing Payment Voucher - Accounts Outflow'
      },
      {
        path: 'accounts/payment-vouchers/view/:id',
        loadComponent: () => import('./features/accounts/payment-vouchers/payment-voucher-view.component').then(m => m.PaymentVoucherViewComponent),
        title: '8.2 Payment Voucher Audit Trail & 7-Stage Workflow Governance'
      },
      {
        path: 'accounts/financial-reports',
        loadComponent: () => import('./features/accounts/accounts-financial-reports/accounts-financial-reports.component').then(m => m.AccountsFinancialReportsComponent),
        title: 'Financial Reports & Bank Reconciliation '
      },
      {
        path: 'accounts/cwip-cockpit',
        loadComponent: () => import('./features/accounts/accounts-cwip-cockpit/accounts-cwip-cockpit.component').then(m => m.AccountsCwipCockpitComponent),
        title: 'CWIP Capitalization & IFRS-15 Cockpit '
      },
      {
        path: 'accounts/pdc-kanban',
        loadComponent: () => import('./features/accounts/accounts-pdc-vault/accounts-pdc-vault.component').then(m => m.AccountsPdcVaultComponent),
        title: 'PDC Cheque Vault & Kanban '
      },
      {
        path: 'accounts/bank-recon-wizard',
        redirectTo: 'accounts/bank-reconciliation',
        pathMatch: 'full'
      },
      // Section 15: Bank Reconciliation & MFS Settlement Engine
      {
        path: 'accounts/bank-reconciliation',
        loadComponent: () => import('./features/accounts/bank-reconciliation/recon-sessions-list/recon-sessions-list.component').then(m => m.ReconSessionsListComponent),
        title: '15.1 Bank & MFS Reconciliation Master - Real Estate ERP'
      },
      {
        path: 'accounts/bank-reconciliation/import',
        loadComponent: () => import('./features/accounts/bank-reconciliation/statement-importer/statement-importer.component').then(m => m.StatementImporterComponent),
        title: '15.1 Import Bank Statement - Real Estate ERP'
      },
      {
        path: 'accounts/bank-reconciliation/workspace/:id',
        loadComponent: () => import('./features/accounts/bank-reconciliation/recon-workspace/recon-workspace.component').then(m => m.ReconWorkspaceComponent),
        title: '15.2 Reconciliation Interactive Workbench - Real Estate ERP'
      },
      {
        path: 'accounts/bank-reconciliation/mfs-settlements',
        loadComponent: () => import('./features/accounts/bank-reconciliation/recon-sessions-list/recon-sessions-list.component').then(m => m.ReconSessionsListComponent),
        title: '15.1 MFS Settlement Batches - Real Estate ERP'
      },
      {
        path: 'accounts/bank-reconciliation/reports',
        loadComponent: () => import('./features/accounts/bank-reconciliation/brs-report/brs-report.component').then(m => m.BRSReportComponent),
        title: '15.1 Official Bank Reconciliation Statement - Real Estate ERP'
      },
      {
        path: 'accounts/bank-reconciliation/brs-report/:id',
        loadComponent: () => import('./features/accounts/bank-reconciliation/brs-report/brs-report.component').then(m => m.BRSReportComponent),
        title: '15.1 Official Bank Reconciliation Statement - Real Estate ERP'
      },
      {
        path: 'accounts/vat-mushak',
        loadComponent: () => import('./features/accounts/accounts-vat-mushak/accounts-vat-mushak.component').then(m => m.AccountsVatMushakComponent),
        title: 'Mushak 6.3 VAT Tax Invoices '
      },
      {
        path: 'accounts/tax-withholding',
        loadComponent: () => import('./features/accounts/accounts-tax-withholding/accounts-tax-withholding.component').then(m => m.AccountsTaxWithholdingComponent),
        title: 'TDS & VDS Withholding Tax Register '
      },
      {
        path: 'accounts/sub-registry-calc',
        loadComponent: () => import('./features/accounts/accounts-sub-registry-calc/accounts-sub-registry-calc.component').then(m => m.AccountsSubRegistryCalcComponent),
        title: 'Sub-Registry & Sec 53FF AIT Fee Calculator '
      },
      // =========================================================================
      // Section 11: Project-wise Income & Expenditure
      // =========================================================================
      {
        path: 'accounts/project-income-expenditure',
        redirectTo: 'accounts/project-income-expenditure/profitability',
        pathMatch: 'full'
      },
      {
        path: 'accounts/project-income-expenditure/dimensions',
        loadComponent: () => import('./features/accounts/project-income-expenditure/dimensions/dimension-config-list.component').then(m => m.DimensionConfigListComponent),
        title: '11.1 Project Financial Dimensions Mandatory Configuration - Real Estate ERP'
      },
      {
        path: 'accounts/project-income-expenditure/dimensions/create',
        loadComponent: () => import('./features/accounts/project-income-expenditure/dimensions/dimension-config-form.component').then(m => m.DimensionConfigFormComponent),
        title: '11.1 Add Project Financial Dimension Rule - Real Estate ERP'
      },
      {
        path: 'accounts/project-income-expenditure/dimensions/edit/:id',
        loadComponent: () => import('./features/accounts/project-income-expenditure/dimensions/dimension-config-form.component').then(m => m.DimensionConfigFormComponent),
        title: '11.1 Edit Project Financial Dimension Rule - Real Estate ERP'
      },
      {
        path: 'accounts/project-income-expenditure/income',
        loadComponent: () => import('./features/accounts/project-income-expenditure/income/project-income-list.component').then(m => m.ProjectIncomeListComponent),
        title: '11.2 Project Income Registry & Revenue Recognition - Real Estate ERP'
      },
      {
        path: 'accounts/project-income-expenditure/income/create',
        loadComponent: () => import('./features/accounts/project-income-expenditure/income/project-income-form.component').then(m => m.ProjectIncomeFormComponent),
        title: '11.2 Record Project Income Transaction - Real Estate ERP'
      },
      {
        path: 'accounts/project-income-expenditure/income/edit/:id',
        loadComponent: () => import('./features/accounts/project-income-expenditure/income/project-income-form.component').then(m => m.ProjectIncomeFormComponent),
        title: '11.2 Edit Project Income Transaction - Real Estate ERP'
      },
      {
        path: 'accounts/project-income-expenditure/expenditure',
        loadComponent: () => import('./features/accounts/project-income-expenditure/expenditure/project-expenditure-list.component').then(m => m.ProjectExpenditureListComponent),
        title: '11.3 Project Expenditure Registry & Cost Accounting - Real Estate ERP'
      },
      {
        path: 'accounts/project-income-expenditure/expenditure/create',
        loadComponent: () => import('./features/accounts/project-income-expenditure/expenditure/project-expenditure-form.component').then(m => m.ProjectExpenditureFormComponent),
        title: '11.3 Record Project Expenditure Transaction - Real Estate ERP'
      },
      {
        path: 'accounts/project-income-expenditure/expenditure/edit/:id',
        loadComponent: () => import('./features/accounts/project-income-expenditure/expenditure/project-expenditure-form.component').then(m => m.ProjectExpenditureFormComponent),
        title: '11.3 Edit Project Expenditure Transaction - Real Estate ERP'
      },
      {
        path: 'accounts/project-income-expenditure/profitability',
        loadComponent: () => import('./features/accounts/project-income-expenditure/profitability/project-profitability-report.component').then(m => m.ProjectProfitabilityReportComponent),
        title: '11.4 Project Profitability & Multi-Project Report - Real Estate ERP'
      },
      // Section 13: Customer Advance & Installment Accounting
      {
        path: 'accounts/customer-advances',
        loadComponent: () => import('./features/accounts/customer-advances/advances-list/advances-list.component').then(m => m.AdvancesListComponent),
        title: '13.1 Customer Advance Receipts & Accounting - Real Estate ERP'
      },
      {
        path: 'accounts/customer-advances/create',
        loadComponent: () => import('./features/accounts/customer-advances/advance-form/advance-form.component').then(m => m.AdvanceFormComponent),
        title: '13.1 Record Customer Advance Receipt - Real Estate ERP'
      },
      {
        path: 'accounts/customer-advances/edit/:id',
        loadComponent: () => import('./features/accounts/customer-advances/advance-form/advance-form.component').then(m => m.AdvanceFormComponent),
        title: '13.1 Edit Customer Advance Transaction - Real Estate ERP'
      },
      {
        path: 'accounts/customer-advances/liability-ledger',
        loadComponent: () => import('./features/accounts/customer-advances/liability-ledger/customer-liability-ledger.component').then(m => m.CustomerLiabilityLedgerComponent),
        title: '13.1.4 Customer Liability Ledger - Real Estate ERP'
      },
      {
        path: 'accounts/customer-advances/allocations',
        loadComponent: () => import('./features/accounts/customer-advances/allocations/advance-allocations.component').then(m => m.AdvanceAllocationsComponent),
        title: '13.1.5 Installment Demands & Allocations - Real Estate ERP'
      },
      {
        path: 'accounts/customer-advances/adjustments',
        loadComponent: () => import('./features/accounts/customer-advances/adjustments/advance-adjustments.component').then(m => m.AdvanceAdjustmentsComponent),
        title: '13.1.6 Late Charges & Adjustments - Real Estate ERP'
      },
      {
        path: 'accounts/customer-advances/refunds',
        loadComponent: () => import('./features/accounts/customer-advances/cancellations-refunds/cancellations-refunds.component').then(m => m.CancellationsRefundsComponent),
        title: '13.1.7 Cancellation & Refund Accounting - Real Estate ERP'
      },
      {
        path: 'accounts/customer-advances/aging',
        loadComponent: () => import('./features/accounts/customer-advances/aging-reconciliation/aging-reconciliation.component').then(m => m.AgingReconciliationComponent),
        title: '13.1.10 Receivable Aging & Collection Reconciliation - Real Estate ERP'
      },
      // Section 14: Loans, Interest & Financing
      {
        path: 'accounts/loans-financing',
        loadComponent: () => import('./features/accounts/loans-financing/loans-list/loans-list.component').then(m => m.LoansListComponent),
        title: '14.1 Loan Management & Credit Facilities - Real Estate ERP'
      },
      {
        path: 'accounts/loans-financing/create',
        loadComponent: () => import('./features/accounts/loans-financing/loan-form/loan-form.component').then(m => m.LoanFormComponent),
        title: '14.1 Register Loan Facility - Real Estate ERP'
      },
      {
        path: 'accounts/loans-financing/:id/edit',
        loadComponent: () => import('./features/accounts/loans-financing/loan-form/loan-form.component').then(m => m.LoanFormComponent),
        title: '14.1 Edit Loan Facility - Real Estate ERP'
      },
      {
        path: 'accounts/loans-financing/edit/:id',
        loadComponent: () => import('./features/accounts/loans-financing/loan-form/loan-form.component').then(m => m.LoanFormComponent),
        title: '14.1 Edit Loan Facility - Real Estate ERP'
      },
      {
        path: 'accounts/loans-financing/disbursements',
        loadComponent: () => import('./features/accounts/loans-financing/loan-disbursements/loan-disbursements.component').then(m => m.LoanDisbursementsComponent),
        title: '14.2 Loan Disbursement Accounting & Vouchers - Real Estate ERP'
      },
      {
        path: 'accounts/loans-financing/repayments',
        loadComponent: () => import('./features/accounts/loans-financing/loan-repayments/loan-repayments.component').then(m => m.LoanRepaymentsComponent),
        title: '14.3 Loan Repayments & Debt Service Waterfall - Real Estate ERP'
      },
      {
        path: 'accounts/loans-financing/interest-cwip',
        loadComponent: () => import('./features/accounts/loans-financing/loan-interest-cwip/loan-interest-cwip.component').then(m => m.LoanInterestCWIPComponent),
        title: '14.3 Interest Accruals & IAS 23 CWIP Capitalization - Real Estate ERP'
      },
      // Section 12: Construction Cost Allocation & Work in Progress (CWIP)
      {
        path: 'accounts/construction-cwip',
        loadComponent: () => import('./features/accounts/construction-cost-allocation/allocations-list/allocations-list.component').then(m => m.CWIPAllocationsListComponent),
        title: '12.1 & 12.2 Construction Cost Allocation & CWIP - Real Estate ERP'
      },
      {
        path: 'accounts/construction-cwip/create',
        loadComponent: () => import('./features/accounts/construction-cost-allocation/allocation-form/allocation-form.component').then(m => m.CWIPAllocationFormComponent),
        title: '12.1 New Construction Cost Allocation - Real Estate ERP'
      },
      {
        path: 'accounts/construction-cwip/material-issues',
        loadComponent: () => import('./features/accounts/construction-cost-allocation/material-issues/cwip-material-issues.component').then(m => m.CWIPMaterialIssuesComponent),
        title: '12.3 Material Issues to Construction Ledger - Real Estate ERP'
      },
      {
        path: 'accounts/construction-cwip/budget-tracking',
        loadComponent: () => import('./features/accounts/construction-cost-allocation/budget-tracking/cwip-budget-tracking.component').then(m => m.CWIPBudgetTrackingComponent),
        title: '12.1 Budget vs Actual Construction Cost & Forecasts - Real Estate ERP'
      },


      {
        path: 'tax/cockpit',
        loadComponent: () => import('./features/tax/tax-cockpit/tax-cockpit.component').then(m => m.TaxCockpitComponent),
        title: 'NBR VAT (Mushak 6.3/6.5), TDS/VDS & Sec 53FF AIT Engine '
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
        title: 'Pre-Handover Snagging & DLP Warranty '
      },
      {
        path: 'handover/possession',
        loadComponent: () => import('./features/handover/handover-possession/handover-possession.component').then(m => m.HandoverPossessionComponent),
        title: 'Key Handover & Possession Clearance '
      },
      {
        path: 'handover/association',
        loadComponent: () => import('./features/handover/handover-association/handover-association.component').then(m => m.HandoverAssociationComponent),
        title: 'Building Owners Association & Leasing '
      },
      {
        path: 'brokers/commissions',
        loadComponent: () => import('./features/sales/broker-commissions/broker-commissions.component').then(m => m.BrokerCommissionsComponent),
        title: 'Broker Commissions & Section 53 TDS '
      },
      {
        path: 'legal',
        redirectTo: 'legal/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'legal/dashboard',
        loadComponent: () => import('./features/legal/legal-dashboard.component').then(m => m.LegalDashboardComponent),
        title: 'Legal & Compliance Dashboard '
      },
      {
        path: 'legal/records/:area/new',
        loadComponent: () => import('./features/legal/legal-record-form.component').then(m => m.LegalRecordFormComponent),
        title: 'Create Legal Compliance Record '
      },
      {
        path: 'legal/records/:area/:id/edit',
        loadComponent: () => import('./features/legal/legal-record-form.component').then(m => m.LegalRecordFormComponent),
        title: 'Edit Legal Compliance Record '
      },
      {
        path: 'legal/records/:area/:id',
        loadComponent: () => import('./features/legal/legal-record-form.component').then(m => m.LegalRecordFormComponent),
        title: 'Legal Compliance Record '
      },
      {
        path: 'legal/records/:area',
        loadComponent: () => import('./features/legal/legal-records.component').then(m => m.LegalRecordsComponent),
        title: 'Legal Compliance Register '
      },
      {
        path: 'legal/audit',
        loadComponent: () => import('./features/legal/legal-audit.component').then(m => m.LegalAuditComponent),
        title: 'Legal Compliance Audit Trail '
      },
      {
        path: 'legal/compliance-vault',
        loadComponent: () => import('./features/legal/compliance-vault/compliance-vault.component').then(m => m.ComplianceVaultComponent),
        title: 'Legal & Statutory Compliance Vault, Land Dispute Tracking & RAJUK/CDA Approvals '
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
        title: 'Heavy Equipment & Machinery Fleet '
      },
      {
        path: 'settings/data-import',
        loadComponent: () => import('./features/settings/data-import/data-import.component').then(m => m.DataImportComponent),
        title: 'Legacy Excel Data Import & Migration '
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
        title: 'HRMS Cockpit & Labour Overview '
      },
      {
        path: 'hrms/dashboard/overview',
        loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
        title: 'HR Dashboard Overview '
      },
      {
        path: 'hrms/dashboard/headcount',
        loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
        title: 'Headcount Summary '
      },
      {
        path: 'hrms/dashboard/attendance-summary',
        loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
        title: 'Attendance Summary '
      },
      {
        path: 'hrms/dashboard/leave-summary',
        loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
        title: 'Leave Summary '
      },
      {
        path: 'hrms/dashboard/payroll-summary',
        loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
        title: 'Payroll Summary '
      },
      {
        path: 'hrms/dashboard/pending-approvals',
        loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
        title: 'Pending Approvals '
      },
      {
        path: 'hrms/dashboard/alerts',
        loadComponent: () => import('./features/hrms/dashboard/hrms-dashboard.component').then(m => m.HrmsDashboardComponent),
        title: 'HR Alerts '
      },

      // 2. Organization Setup Routes
      {
        path: 'hrms/org/:entity/new',
        loadComponent: () => import('./features/hrms/org-structure/org-master-form.component').then(m => m.OrgMasterFormComponent),
        title: 'Create Organization Master'
      },
      {
        path: 'hrms/org/:entity/:id/edit',
        loadComponent: () => import('./features/hrms/org-structure/org-master-form.component').then(m => m.OrgMasterFormComponent),
        title: 'Edit Organization Master'
      },
      {
        path: 'hrms/departments/new',
        loadComponent: () => import('./features/hrms/org-structure/org-master-form.component').then(m => m.OrgMasterFormComponent),
        data: { entity: 'departments' },
        title: 'Create Department'
      },
      {
        path: 'hrms/departments/:id/edit',
        loadComponent: () => import('./features/hrms/org-structure/org-master-form.component').then(m => m.OrgMasterFormComponent),
        data: { entity: 'departments' },
        title: 'Edit Department'
      },
      {
        path: 'hrms/org-structure',
        loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
        title: 'Company Master & Org Structure '
      },
      {
        path: 'hrms/org/companies',
        loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
        title: 'Company Setup '
      },
      {
        path: 'hrms/org/legal-entities',
        loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
        title: 'Legal Entity '
      },
      {
        path: 'hrms/org/branches',
        loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
        title: 'Branch Setup '
      },
      {
        path: 'hrms/org/project-offices',
        loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
        title: 'Project Office Setup '
      },
      {
        path: 'hrms/org/cost-centers',
        loadComponent: () => import('./features/hrms/org-structure/org-structure.component').then(m => m.OrgStructureComponent),
        title: 'Cost Center '
      },
      {
        path: 'hrms/departments',
        loadComponent: () => import('./features/hrms/departments/departments.component').then(m => m.DepartmentsComponent),
        title: 'Department Master '
      },
      {
        path: 'hrms/departments/heads/new',
        loadComponent: () => import('./features/hrms/hrms-master-form.component').then(m => m.HrmsMasterFormComponent),
        data: { formKind: 'head' },
        title: 'Assign Department Head'
      },
      {
        path: 'hrms/departments/hierarchy/:id/edit',
        loadComponent: () => import('./features/hrms/hrms-master-form.component').then(m => m.HrmsMasterFormComponent),
        data: { formKind: 'hierarchy' },
        title: 'Change Department Hierarchy'
      },
      {
        path: 'hrms/departments/heads/:id/edit',
        loadComponent: () => import('./features/hrms/hrms-master-form.component').then(m => m.HrmsMasterFormComponent),
        data: { formKind: 'head' },
        title: 'Assign Department Head'
      },
      {
        path: 'hrms/designations/grades/new',
        loadComponent: () => import('./features/hrms/hrms-master-form.component').then(m => m.HrmsMasterFormComponent),
        data: { formKind: 'grade' },
        title: 'Create Salary Grade'
      },
      {
        path: 'hrms/designations/grades/:id/edit',
        loadComponent: () => import('./features/hrms/hrms-master-form.component').then(m => m.HrmsMasterFormComponent),
        data: { formKind: 'grade' },
        title: 'Edit Salary Grade'
      },
      {
        path: 'hrms/designations/new',
        loadComponent: () => import('./features/hrms/hrms-master-form.component').then(m => m.HrmsMasterFormComponent),
        data: { formKind: 'designation' },
        title: 'Create Designation'
      },
      {
        path: 'hrms/designations/:id/edit',
        loadComponent: () => import('./features/hrms/hrms-master-form.component').then(m => m.HrmsMasterFormComponent),
        data: { formKind: 'designation' },
        title: 'Edit Designation'
      },
      {
        path: 'hrms/departments/hierarchy',
        loadComponent: () => import('./features/hrms/departments/departments.component').then(m => m.DepartmentsComponent),
        title: 'Department Hierarchy '
      },
      {
        path: 'hrms/departments/heads',
        loadComponent: () => import('./features/hrms/departments/departments.component').then(m => m.DepartmentsComponent),
        title: 'Department Head '
      },
      {
        path: 'hrms/designations',
        loadComponent: () => import('./features/hrms/designations/designations.component').then(m => m.DesignationsComponent),
        title: 'Designation '
      },
      {
        path: 'hrms/designations/grades',
        loadComponent: () => import('./features/hrms/designations/designations.component').then(m => m.DesignationsComponent),
        title: 'Job Grade '
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
        title: 'Employee Directory & 360 Profiles '
      },
      {
        path: 'hrms/employees/list',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Employee List '
      },
      {
        path: 'hrms/employees/add',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Add Employee '
      },
      {
        path: 'hrms/employees/profile',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Employee Profile '
      },
      {
        path: 'hrms/employees/personal-info',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Personal Information '
      },
      {
        path: 'hrms/employees/employment-details',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Employment Details '
      },
      {
        path: 'hrms/employees/documents',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Documents Vault '
      },
      {
        path: 'hrms/employees/emergency-contacts/new',
        loadComponent: () => import('./features/hrms/employees/employee-emergency-contacts.component').then(m => m.EmployeeEmergencyContactsComponent),
        title: 'Add Emergency Contact'
      },
      {
        path: 'hrms/employees/emergency-contacts/:id/edit',
        loadComponent: () => import('./features/hrms/employees/employee-emergency-contacts.component').then(m => m.EmployeeEmergencyContactsComponent),
        title: 'Edit Emergency Contact'
      },
      {
        path: 'hrms/employees/emergency-contacts',
        loadComponent: () => import('./features/hrms/employees/employee-emergency-contacts.component').then(m => m.EmployeeEmergencyContactsComponent),
        title: 'Emergency Contacts '
      },
      {
        path: 'hrms/employees/bank-details',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Bank Details '
      },
      {
        path: 'hrms/employees/transfer',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Employee Transfer '
      },
      {
        path: 'hrms/employees/promotion',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Promotion '
      },
      {
        path: 'hrms/employees/salary-revision',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Salary Revision '
      },
      {
        path: 'hrms/employees/contract-renewal',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Contract Renewal '
      },
      {
        path: 'hrms/employees/history',
        loadComponent: () => import('./features/hrms/employees/employee-list.component').then(m => m.EmployeeListComponent),
        title: 'Employee History '
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
        title: 'Manpower Requisition '
      },
      {
        path: 'hrms/recruitment/vacancies',
        loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
        title: 'Job Vacancy '
      },
      {
        path: 'hrms/recruitment/applicants',
        loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
        title: 'Applicant Database '
      },
      {
        path: 'hrms/recruitment/interviews',
        loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
        title: 'Interview Schedule '
      },
      {
        path: 'hrms/recruitment/evaluations',
        loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
        title: 'Interview Evaluation '
      },
      {
        path: 'hrms/recruitment/selection',
        loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
        title: 'Selection '
      },
      {
        path: 'hrms/recruitment/offer-letters',
        loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
        title: 'Offer Letter '
      },
      {
        path: 'hrms/recruitment/appointment-letters',
        loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
        title: 'Appointment Letter '
      },
      {
        path: 'hrms/recruitment/joining-checklist',
        loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
        title: 'Joining Checklist '
      },
      {
        path: 'hrms/recruitment/onboarding',
        loadComponent: () => import('./features/hrms/recruitment/recruitment-onboarding.component').then(m => m.RecruitmentOnboardingComponent),
        title: 'Employee Onboarding '
      },

      // 5. Attendance & Shift Management Routes
      {
        path: 'hrms/attendance',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Attendance & Shift Management '
      },
      {
        path: 'hrms/attendance/shifts',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Shift Master '
      },
      {
        path: 'hrms/attendance/rosters',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Shift Roster '
      },
      {
        path: 'hrms/attendance/logs',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Attendance Logs '
      },
      {
        path: 'hrms/attendance/biometric',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Biometric Integration '
      },
      {
        path: 'hrms/attendance/mobile-checkin',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Mobile Check-in '
      },
      {
        path: 'hrms/attendance/site-attendance',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Site Attendance '
      },
      {
        path: 'hrms/attendance/late-early',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Late/Early Report '
      },
      {
        path: 'hrms/attendance/missing-punches',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Missing Punch '
      },
      {
        path: 'hrms/attendance/corrections',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Attendance Correction '
      },
      {
        path: 'hrms/attendance/overtime',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Overtime '
      },
      {
        path: 'hrms/attendance/holiday-calendar',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Holiday Calendar '
      },
      {
        path: 'hrms/attendance/monthly-closing',
        loadComponent: () => import('./features/hrms/attendance/attendance-management.component').then(m => m.AttendanceManagementComponent),
        title: 'Monthly Attendance Closing '
      },
      {
        path: 'hrms/muster-roll',
        loadComponent: () => import('./features/hrms/muster-roll/muster-roll.component').then(m => m.MusterRollComponent),
        title: 'Daily Site Labour Muster Roll '
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
        title: 'Leave & Overtime Management Engine '
      },
      {
        path: 'hrms/leave/types',
        loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
        title: 'Leave Type '
      },
      {
        path: 'hrms/leave/policies',
        loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
        title: 'Leave Policy '
      },
      {
        path: 'hrms/leave/entitlements',
        loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
        title: 'Leave Entitlement '
      },
      {
        path: 'hrms/leave/applications',
        loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
        title: 'Leave Application '
      },
      {
        path: 'hrms/leave/approvals',
        loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
        title: 'Leave Approval '
      },
      {
        path: 'hrms/leave/balances',
        loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
        title: 'Leave Balance '
      },
      {
        path: 'hrms/leave/encashment',
        loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
        title: 'Leave Encashment '
      },
      {
        path: 'hrms/leave/calendar',
        loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
        title: 'Leave Calendar '
      },
      {
        path: 'hrms/leave/history',
        loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
        title: 'Leave History '
      },
      {
        path: 'hrms/leave/holidays',
        loadComponent: () => import('./features/hrms/leave/leave-overtime.component').then(m => m.LeaveOvertimeComponent),
        title: 'Holiday Management '
      },

      // 7. Payroll Management Routes
      {
        path: 'hrms/payroll',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Salary Structure & Payroll Engine '
      },
      {
        path: 'hrms/payroll/structures',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Salary Structure '
      },
      {
        path: 'hrms/payroll/components',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Salary Components '
      },
      {
        path: 'hrms/payroll/assignments',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Employee Salary Assignment '
      },
      {
        path: 'hrms/payroll/periods',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Payroll Period '
      },
      {
        path: 'hrms/payroll/processing',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Payroll Processing '
      },
      {
        path: 'hrms/payroll/attendance-calc',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Attendance-based Calculation '
      },
      {
        path: 'hrms/payroll/allowances',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Allowances '
      },
      {
        path: 'hrms/payroll/deductions',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Deductions '
      },
      {
        path: 'hrms/payroll/bonus',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Bonus '
      },
      {
        path: 'hrms/payroll/increments',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Increment '
      },
      {
        path: 'hrms/payroll/arrears',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Arrears '
      },
      {
        path: 'hrms/payroll/validation',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Payroll Validation '
      },
      {
        path: 'hrms/payroll/approval',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Payroll Approval '
      },
      {
        path: 'hrms/payroll/payslips',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Payslip '
      },
      {
        path: 'hrms/payroll/bank-payment-files',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Bank Payment File '
      },
      {
        path: 'hrms/payroll/posting',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Payroll Posting '
      },
      {
        path: 'hrms/payroll/reversals',
        loadComponent: () => import('./features/hrms/payroll/payroll-management.component').then(m => m.PayrollManagementComponent),
        title: 'Payroll Reversal '
      },
      {
        path: 'hrms/payroll-approvals',
        loadComponent: () => import('./features/hrms/payroll-approvals/payroll-approvals.component').then(m => m.PayrollApprovalsComponent),
        title: 'Deductions, Benefits & Payroll Approvals '
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
        title: 'Salary Advance '
      },
      {
        path: 'hrms/loans-benefits/loans',
        loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
        title: 'Employee Loan '
      },
      {
        path: 'hrms/loans-benefits/loan-approvals',
        loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
        title: 'Loan Approval '
      },
      {
        path: 'hrms/loans-benefits/loan-disbursements',
        loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
        title: 'Loan Disbursement '
      },
      {
        path: 'hrms/loans-benefits/installment-schedules',
        loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
        title: 'Installment Schedule '
      },
      {
        path: 'hrms/loans-benefits/loan-recoveries',
        loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
        title: 'Loan Recovery '
      },
      {
        path: 'hrms/loans-benefits/medical-reimbursements',
        loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
        title: 'Medical Reimbursement '
      },
      {
        path: 'hrms/loans-benefits/travel-allowances',
        loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
        title: 'Travel Allowance '
      },
      {
        path: 'hrms/loans-benefits/expense-claims',
        loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
        title: 'Expense Claim '
      },
      {
        path: 'hrms/loans-benefits/benefits-master',
        loadComponent: () => import('./features/hrms/loans-benefits/loans-benefits.component').then(m => m.LoansBenefitsComponent),
        title: 'Employee Benefits '
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
        title: 'KPI Setup '
      },
      {
        path: 'hrms/performance/reviews',
        loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
        title: 'Performance Review '
      },
      {
        path: 'hrms/performance/cycles',
        loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
        title: 'Appraisal Cycle '
      },
      {
        path: 'hrms/performance/evaluations',
        loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
        title: 'Manager Evaluation '
      },
      {
        path: 'hrms/performance/self-assessments',
        loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
        title: 'Employee Self-Assessment '
      },
      {
        path: 'hrms/performance/training-plans',
        loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
        title: 'Training Plan '
      },
      {
        path: 'hrms/performance/training-attendance',
        loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
        title: 'Training Attendance '
      },
      {
        path: 'hrms/performance/skill-matrix',
        loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
        title: 'Skill Matrix '
      },
      {
        path: 'hrms/performance/promotions',
        loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
        title: 'Promotion Recommendation '
      },
      {
        path: 'hrms/performance/increments',
        loadComponent: () => import('./features/hrms/performance/performance-development.component').then(m => m.PerformanceDevelopmentComponent),
        title: 'Increment Recommendation '
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
        title: 'Resignation Request '
      },
      {
        path: 'hrms/separation/notice-periods',
        loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
        title: 'Notice Period '
      },
      {
        path: 'hrms/separation/terminations',
        loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
        title: 'Termination '
      },
      {
        path: 'hrms/separation/exit-interviews',
        loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
        title: 'Exit Interview '
      },
      {
        path: 'hrms/separation/asset-clearances',
        loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
        title: 'Asset Clearance '
      },
      {
        path: 'hrms/separation/dept-clearances',
        loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
        title: 'Department Clearance '
      },
      {
        path: 'hrms/separation/loan-settlements',
        loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
        title: 'Loan Settlement '
      },
      {
        path: 'hrms/separation/leave-settlements',
        loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
        title: 'Leave Settlement '
      },
      {
        path: 'hrms/separation/final-salaries',
        loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
        title: 'Final Salary '
      },
      {
        path: 'hrms/separation/settlement-approvals',
        loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
        title: 'Final Settlement Approval '
      },
      {
        path: 'hrms/separation/experience-certificates',
        loadComponent: () => import('./features/hrms/separation/employee-separation.component').then(m => m.EmployeeSeparationComponent),
        title: 'Experience Certificate '
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
        title: 'My Profile '
      },
      {
        path: 'hrms/ess/my-attendance',
        loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
        title: 'My Attendance '
      },
      {
        path: 'hrms/ess/leave-requests',
        loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
        title: 'Leave Request '
      },
      {
        path: 'hrms/ess/leave-balances',
        loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
        title: 'Leave Balance '
      },
      {
        path: 'hrms/ess/my-payslips',
        loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
        title: 'Payslips '
      },
      {
        path: 'hrms/ess/salary-history',
        loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
        title: 'Salary History '
      },
      {
        path: 'hrms/ess/loan-requests',
        loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
        title: 'Loan Request '
      },
      {
        path: 'hrms/ess/expense-claims',
        loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
        title: 'Expense Claim '
      },
      {
        path: 'hrms/ess/my-documents',
        loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
        title: 'Documents '
      },
      {
        path: 'hrms/ess/notices',
        loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
        title: 'Company Notices '
      },
      {
        path: 'hrms/ess/helpdesk',
        loadComponent: () => import('./features/hrms/ess/employee-self-service.component').then(m => m.EmployeeSelfServiceComponent),
        title: 'HR Helpdesk '
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
        title: 'Approval Matrix '
      },
      {
        path: 'hrms/workflow/leaves',
        loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
        title: 'Leave Approval '
      },
      {
        path: 'hrms/workflow/overtime',
        loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
        title: 'Overtime Approval '
      },
      {
        path: 'hrms/workflow/attendance',
        loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
        title: 'Attendance Correction Approval '
      },
      {
        path: 'hrms/workflow/recruitment',
        loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
        title: 'Recruitment Approval '
      },
      {
        path: 'hrms/workflow/salary-revisions',
        loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
        title: 'Salary Revision Approval '
      },
      {
        path: 'hrms/workflow/payroll',
        loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
        title: 'Payroll Approval '
      },
      {
        path: 'hrms/workflow/expenses',
        loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
        title: 'Expense Approval '
      },
      {
        path: 'hrms/workflow/delegation',
        loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
        title: 'Delegation '
      },
      {
        path: 'hrms/workflow/history',
        loadComponent: () => import('./features/hrms/workflow/workflow-approvals.component').then(m => m.WorkflowApprovalsComponent),
        title: 'Approval History '
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
        title: 'Tax Configuration '
      },
      {
        path: 'hrms/statutory/tax-deductions',
        loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
        title: 'Tax Deduction Records '
      },
      {
        path: 'hrms/statutory/tax-certificates',
        loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
        title: 'Tax Certificates '
      },
      {
        path: 'hrms/statutory/registers',
        loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
        title: 'Statutory Registers '
      },
      {
        path: 'hrms/statutory/contracts',
        loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
        title: 'Employment Contracts '
      },
      {
        path: 'hrms/statutory/policies',
        loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
        title: 'Policy Acknowledgment '
      },
      {
        path: 'hrms/statutory/calendar',
        loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
        title: 'Compliance Calendar '
      },
      {
        path: 'hrms/statutory/audit-documents',
        loadComponent: () => import('./features/hrms/statutory/statutory-compliance.component').then(m => m.StatutoryComplianceComponent),
        title: 'Audit Documents '
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
        title: 'Project Employee Assignment '
      },
      {
        path: 'hrms/project-hr/rosters',
        loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
        title: 'Site Staff Roster '
      },
      {
        path: 'hrms/project-hr/labour-allocation',
        loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
        title: 'Labour Allocation '
      },
      {
        path: 'hrms/project-hr/timesheets',
        loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
        title: 'Timesheets '
      },
      {
        path: 'hrms/project-hr/overtime',
        loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
        title: 'Project Overtime '
      },
      {
        path: 'hrms/project-hr/shared-allocation',
        loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
        title: 'Shared Employee Allocation '
      },
      {
        path: 'hrms/project-hr/payroll-costs',
        loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
        title: 'Project Payroll Cost '
      },
      {
        path: 'hrms/project-hr/dept-costs',
        loadComponent: () => import('./features/hrms/project-hr/project-hr.component').then(m => m.ProjectHrAllocationComponent),
        title: 'Department Cost Allocation '
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
        title: 'Employee Register '
      },
      {
        path: 'hrms/reports/headcount-by-dept',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Headcount by Department '
      },
      {
        path: 'hrms/reports/headcount-by-project',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Headcount by Project '
      },
      {
        path: 'hrms/reports/attendance-register',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Attendance Register '
      },
      {
        path: 'hrms/reports/leave-report',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Leave Report '
      },
      {
        path: 'hrms/reports/overtime-report',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Overtime Report '
      },
      {
        path: 'hrms/reports/payroll-register',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Payroll Register '
      },
      {
        path: 'hrms/reports/salary-sheet',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Salary Sheet '
      },
      {
        path: 'hrms/reports/bank-disbursement',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Bank Disbursement Report '
      },
      {
        path: 'hrms/reports/loan-balance',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Loan Balance '
      },
      {
        path: 'hrms/reports/recruitment-report',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Recruitment Report '
      },
      {
        path: 'hrms/reports/turnover-report',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Turnover Report '
      },
      {
        path: 'hrms/reports/training-report',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Training Report '
      },
      {
        path: 'hrms/reports/project-labour-cost',
        loadComponent: () => import('./features/hrms/reports/hr-reports.component').then(m => m.HrReportsAnalyticsComponent),
        title: 'Project Labour Cost '
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
        title: 'HR Settings '
      },
      {
        path: 'hrms/config/salary-rules',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'Salary Rules '
      },
      {
        path: 'hrms/config/leave-rules',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'Leave Rules '
      },
      {
        path: 'hrms/config/shift-rules',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'Shift Rules '
      },
      {
        path: 'hrms/config/payroll-calendar',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'Payroll Calendar '
      },
      {
        path: 'hrms/config/notification-templates',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'Notification Templates '
      },
      {
        path: 'hrms/config/communication-settings',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'Email/SMS/Push Settings '
      },
      {
        path: 'hrms/config/user-roles',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'User Roles '
      },
      {
        path: 'hrms/config/permissions',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'Permissions '
      },
      {
        path: 'hrms/config/audit-logs',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'Audit Logs '
      },
      {
        path: 'hrms/config/biometric-devices',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'Biometric Devices '
      },
      {
        path: 'hrms/config/api-integrations',
        loadComponent: () => import('./features/hrms/config/hr-configuration.component').then(m => m.HrConfigurationSecurityComponent),
        title: 'API Integration Settings '
      },
      {
        path: 'governance/approvals',
        loadComponent: () => import('./features/governance/governance-cockpit/governance-cockpit.component').then(m => m.GovernanceCockpitComponent),
        title: 'Maker-Checker Governance & Approvals '
      },
      {
        path: 'governance/cockpit',
        redirectTo: 'governance/approvals',
        pathMatch: 'full'
      },
      {
        path: 'bi/cockpit',
        loadComponent: () => import('./features/bi/executive-cockpit/executive-cockpit.component').then(m => m.ExecutiveCockpitComponent),
        title: 'Executive Management BI Cockpit, Cash Runway & EVM '
      },
      {
        path: 'bi/runway',
        loadComponent: () => import('./features/bi/executive-cockpit/executive-cockpit.component').then(m => m.ExecutiveCockpitComponent),
        title: 'Cash Runway Simulator '
      },
      {
        path: 'bi/evm',
        loadComponent: () => import('./features/bi/executive-cockpit/executive-cockpit.component').then(m => m.ExecutiveCockpitComponent),
        title: 'Project EVM & Profitability '
      },
      {
        path: 'bi/heatmap',
        loadComponent: () => import('./features/bi/executive-cockpit/executive-cockpit.component').then(m => m.ExecutiveCockpitComponent),
        title: 'Overdue Collections Heatmap '
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
        title: 'Customer Self-Service Portal & Flat Owner Transparency '
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
      },
      {
        path: 'installments',
        redirectTo: 'installments/reports-dashboard',
        pathMatch: 'full'
      },
      {
        path: 'installments/payment-setup',
        loadComponent: () => import('./features/installments/payment-setup/payment-setup-list.component').then(m => m.PaymentSetupListComponent),
        title: 'Customer Payment Plan Configuration '
      },
      {
        path: 'installments/payment-setup/create',
        loadComponent: () => import('./features/installments/payment-setup/payment-setup-form.component').then(m => m.PaymentSetupFormComponent),
        title: 'Create Payment Plan '
      },
      {
        path: 'installments/payment-setup/edit/:id',
        loadComponent: () => import('./features/installments/payment-setup/payment-setup-form.component').then(m => m.PaymentSetupFormComponent),
        title: 'Edit Payment Plan '
      },
      {
        path: 'installments/booking-money',
        loadComponent: () => import('./features/installments/booking-money/booking-money-list.component').then(m => m.BookingMoneyListComponent),
        title: 'Booking Money Management '
      },
      {
        path: 'installments/booking-money/create',
        loadComponent: () => import('./features/installments/booking-money/booking-money-form.component').then(m => m.BookingMoneyFormComponent),
        title: 'Record Booking Money Receipt '
      },
      {
        path: 'installments/down-payment',
        loadComponent: () => import('./features/installments/down-payment/down-payment-list.component').then(m => m.DownPaymentListComponent),
        title: 'Down Payment Management '
      },
      {
        path: 'installments/down-payment/create',
        loadComponent: () => import('./features/installments/down-payment/down-payment-form.component').then(m => m.DownPaymentFormComponent),
        title: 'Collect Down Payment '
      },
      {
        path: 'installments/schedules',
        loadComponent: () => import('./features/installments/installment-schedules/installment-schedules.component').then(m => m.InstallmentSchedulesComponent),
        title: 'Customer Installment Schedules & Milestones '
      },
      {
        path: 'installments/collections',
        loadComponent: () => import('./features/installments/money-receipts/money-receipts.component').then(m => m.MoneyReceiptsComponent),
        title: 'Customer Collection Receipts '
      },
      {
        path: 'installments/money-receipts',
        loadComponent: () => import('./features/installments/money-receipts/money-receipts.component').then(m => m.MoneyReceiptsComponent),
        title: 'Money Receipts '
      },
      {
        path: 'installments/due-overdue',
        loadComponent: () => import('./features/installments/due-overdue/due-overdue-cockpit.component').then(m => m.DueOverdueCockpitComponent),
        title: 'Due & Overdue Aging Management '
      },
      {
        path: 'installments/late-fee-rebate',
        loadComponent: () => import('./features/installments/late-fee-rebate/late-fee-rebate-list.component').then(m => m.LateFeeRebateListComponent),
        title: 'Late Fee, Rebate & Waiver Approvals '
      },
      {
        path: 'installments/late-fee-rebate/create',
        loadComponent: () => import('./features/installments/late-fee-rebate/late-fee-waiver-form.component').then(m => m.LateFeeWaiverFormComponent),
        title: 'Submit Late Fee Waiver '
      },
      {
        path: 'installments/rescheduling',
        loadComponent: () => import('./features/installments/rescheduling/rescheduling-list.component').then(m => m.ReschedulingListComponent),
        title: 'Payment Rescheduling & Plan Revision '
      },
      {
        path: 'installments/rescheduling/create',
        loadComponent: () => import('./features/installments/rescheduling/reschedule-request-form.component').then(m => m.RescheduleRequestFormComponent),
        title: 'Propose Payment Rescheduling '
      },
      {
        path: 'installments/cheques',
        loadComponent: () => import('./features/installments/pdc-vault/pdc-vault.component').then(m => m.PDCVaultComponent),
        title: 'Cheque Management & PDC Safe Vault '
      },
      {
        path: 'installments/pdc-vault',
        loadComponent: () => import('./features/installments/pdc-vault/pdc-vault.component').then(m => m.PDCVaultComponent),
        title: 'PDC Vault & NI Act 138 '
      },
      {
        path: 'installments/customer-ledger',
        loadComponent: () => import('./features/installments/customer-ledger/customer-ledger-view.component').then(m => m.CustomerLedgerViewComponent),
        title: 'Customer Financial Ledger & Statement '
      },
      {
        path: 'installments/refund-adjustment',
        loadComponent: () => import('./features/installments/refund-adjustment/refund-adjustment-list.component').then(m => m.RefundAdjustmentListComponent),
        title: 'Refund & Credit Adjustment Management '
      },
      {
        path: 'installments/refund-adjustment/create',
        loadComponent: () => import('./features/installments/refund-adjustment/refund-adjustment-form.component').then(m => m.RefundAdjustmentFormComponent),
        title: 'Record Refund or Credit Adjustment '
      },
      {
        path: 'installments/reports-dashboard',
        loadComponent: () => import('./features/installments/reports-dashboard/reports-dashboard.component').then(m => m.InstallmentReportsDashboardComponent),
        title: 'Installment & Collection Reports & Executive Dashboard '
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'settings/lookups'
  }
];
