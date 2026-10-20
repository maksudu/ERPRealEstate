import { Routes } from '@angular/router';

export const MOBILE_SALES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/mobile-sales-dashboard.component').then(
        (m) => m.MobileSalesDashboardComponent
      ),
    title: 'Mobile Sales App — Executive Dashboard'
  },
  {
    path: 'leads',
    loadComponent: () =>
      import('./leads/mobile-lead-management.component').then(
        (m) => m.MobileLeadManagementComponent
      ),
    title: 'Mobile Sales App — Lead Management'
  },
  {
    path: 'customers',
    loadComponent: () =>
      import('./customers/mobile-customer-management.component').then(
        (m) => m.MobileCustomerManagementComponent
      ),
    title: 'Mobile Sales App — Customer Profiles'
  },
  {
    path: 'properties',
    loadComponent: () =>
      import('./properties/mobile-property-management.component').then(
        (m) => m.MobilePropertyManagementComponent
      ),
    title: 'Mobile Sales App — Projects & Property Units'
  },
  {
    path: 'quotations',
    loadComponent: () =>
      import('./quotations/mobile-quotation-management.component').then(
        (m) => m.MobileQuotationManagementComponent
      ),
    title: 'Mobile Sales App — Quotation Management'
  },
  {
    path: 'site-visits',
    loadComponent: () =>
      import('./site-visits/mobile-site-visit-management.component').then(
        (m) => m.MobileSiteVisitManagementComponent
      ),
    title: 'Mobile Sales App — Site Visit Appointments'
  },
  {
    path: 'bookings',
    loadComponent: () =>
      import('./bookings/mobile-booking-management.component').then(
        (m) => m.MobileBookingManagementComponent
      ),
    title: 'Mobile Sales App — Booking & Reservations'
  },
  {
    path: 'approvals',
    loadComponent: () =>
      import('./approvals/mobile-approval-workflow.component').then(
        (m) => m.MobileApprovalWorkflowComponent
      ),
    title: 'Mobile Sales App — Approval Workflow'
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./notifications/mobile-notifications.component').then(
        (m) => m.MobileNotificationsComponent
      ),
    title: 'Mobile Sales App — Notifications'
  }
];
