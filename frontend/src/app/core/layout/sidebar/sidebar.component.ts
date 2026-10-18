import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SubMenuItem {
  id: string;
  label: string;
  route?: string;
  queryParams?: { [key: string]: any };
  badge?: string;
  children?: SubMenuItem[];
}

export interface MenuGroup {
  id: string;
  title: string;
  iconSvg: string;
  badge?: string;
  expanded?: boolean;
  items: SubMenuItem[];
  subGroups?: MenuGroup[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);

  // Active ERP Suite Switcher: Defaults to 16-Module HRMS Suite as requested
  activeSuite = signal<'hrms' | 'erp'>('hrms');

  // In-Sidebar Quick Filter Query
  filterQuery = signal<string>('');

  // Expanded menu groups state (persisted as Set of IDs, auto-expands active route)
  expandedGroupIds = signal<Set<string>>(new Set(['land', 'procurement', 'projects']));
  expandedSubItemIds = signal<Set<string>>(new Set(['land-reports-sub']));

  // =========================================================================
  // 16 Full Enterprise HRMS Main Menus matching user specification exactly
  // =========================================================================
  hrMenuGroups: MenuGroup[] = [
    {
      id: 'hr-dashboard',
      title: '1. HR Dashboard',
      iconSvg: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      items: [
        { id: 'hr-dash-overview', label: 'Overview', route: '/hrms/dashboard/overview', badge: 'Live' },
        { id: 'hr-dash-headcount', label: 'Headcount Summary', route: '/hrms/dashboard/headcount' },
        { id: 'hr-dash-attendance', label: 'Attendance Summary', route: '/hrms/dashboard/attendance-summary' },
        { id: 'hr-dash-leave', label: 'Leave Summary', route: '/hrms/dashboard/leave-summary' },
        { id: 'hr-dash-payroll', label: 'Payroll Summary', route: '/hrms/dashboard/payroll-summary' },
        { id: 'hr-dash-approvals', label: 'Pending Approvals', route: '/hrms/dashboard/pending-approvals', badge: 'Action' },
        { id: 'hr-dash-alerts', label: 'HR Alerts', route: '/hrms/dashboard/alerts' }
      ]
    },
    {
      id: 'hr-org-setup',
      title: '2. Organization Setup',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'org-company', label: 'Company Setup', route: '/hrms/org/companies', badge: 'Holding' },
        { id: 'org-legal', label: 'Legal Entity', route: '/hrms/org/legal-entities', badge: 'RJSC' },
        { id: 'org-branch', label: 'Branch Setup', route: '/hrms/org/branches', badge: 'HO' },
        { id: 'org-project-office', label: 'Project Office Setup', route: '/hrms/org/project-offices', badge: 'Sites' },
        { id: 'org-dept-master', label: 'Department Master', route: '/hrms/departments', badge: 'Core' },
        { id: 'org-dept-hierarchy', label: 'Department Hierarchy', route: '/hrms/departments/hierarchy', badge: 'Tree' },
        { id: 'org-dept-head', label: 'Department Head', route: '/hrms/departments/heads' },
        { id: 'org-designation', label: 'Designation', route: '/hrms/designations' },
        { id: 'org-job-grade', label: 'Job Grade', route: '/hrms/designations/grades' },
        { id: 'org-cost-center', label: 'Cost Center', route: '/hrms/org/cost-centers' }
      ]
    },
    {
      id: 'hr-employee-mgmt',
      title: '3. Employee Management',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'emp-list', label: 'Employee List', route: '/hrms/employees/list', badge: '360°' },
        { id: 'emp-add', label: 'Add Employee', route: '/hrms/employees/add', badge: 'New' },
        { id: 'emp-profile', label: 'Employee Profile', route: '/hrms/employees/profile' },
        { id: 'emp-personal', label: 'Personal Information', route: '/hrms/employees/personal-info' },
        { id: 'emp-employment', label: 'Employment Details', route: '/hrms/employees/employment-details' },
        { id: 'emp-documents', label: 'Documents', route: '/hrms/employees/documents', badge: 'Vault' },
        { id: 'emp-emergency', label: 'Emergency Contacts', route: '/hrms/employees/emergency-contacts' },
        { id: 'emp-bank', label: 'Bank Details', route: '/hrms/employees/bank-details' },
        { id: 'emp-transfer', label: 'Employee Transfer', route: '/hrms/employees/transfer' },
        { id: 'emp-promotion', label: 'Promotion', route: '/hrms/employees/promotion' },
        { id: 'emp-salary-rev', label: 'Salary Revision', route: '/hrms/employees/salary-revision' },
        { id: 'emp-renewal', label: 'Contract Renewal', route: '/hrms/employees/contract-renewal' },
        { id: 'emp-history', label: 'Employee History', route: '/hrms/employees/history' }
      ]
    },
    {
      id: 'hr-recruitment',
      title: '4. Recruitment & Onboarding',
      iconSvg: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      items: [
        { id: 'rec-requisition', label: 'Manpower Requisition', route: '/hrms/recruitment/requisitions', badge: 'MR' },
        { id: 'rec-vacancy', label: 'Job Vacancy', route: '/hrms/recruitment/vacancies' },
        { id: 'rec-applicants', label: 'Applicant Database', route: '/hrms/recruitment/applicants' },
        { id: 'rec-interview-sched', label: 'Interview Schedule', route: '/hrms/recruitment/interviews' },
        { id: 'rec-evaluation', label: 'Interview Evaluation', route: '/hrms/recruitment/evaluations' },
        { id: 'rec-selection', label: 'Selection', route: '/hrms/recruitment/selection' },
        { id: 'rec-offer', label: 'Offer Letter', route: '/hrms/recruitment/offer-letters' },
        { id: 'rec-appointment', label: 'Appointment Letter', route: '/hrms/recruitment/appointment-letters' },
        { id: 'rec-checklist', label: 'Joining Checklist', route: '/hrms/recruitment/joining-checklist' },
        { id: 'rec-onboarding', label: 'Employee Onboarding', route: '/hrms/recruitment/onboarding', badge: 'Induction' }
      ]
    },
    {
      id: 'hr-attendance',
      title: '5. Attendance & Shift Management',
      iconSvg: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        { id: 'att-shift-master', label: 'Shift Master', route: '/hrms/attendance/shifts' },
        { id: 'att-shift-roster', label: 'Shift Roster', route: '/hrms/attendance/rosters' },
        { id: 'att-logs', label: 'Attendance Logs', route: '/hrms/attendance/logs', badge: 'Live' },
        { id: 'att-biometric', label: 'Biometric Integration', route: '/hrms/attendance/biometric', badge: 'ZKTeco' },
        { id: 'att-mobile', label: 'Mobile Check-in', route: '/hrms/attendance/mobile-checkin', badge: 'GPS' },
        { id: 'att-site', label: 'Site Attendance', route: '/hrms/attendance/site-attendance' },
        { id: 'att-late-early', label: 'Late/Early Report', route: '/hrms/attendance/late-early' },
        { id: 'att-missing-punch', label: 'Missing Punch', route: '/hrms/attendance/missing-punches' },
        { id: 'att-correction', label: 'Attendance Correction', route: '/hrms/attendance/corrections' },
        { id: 'att-overtime', label: 'Overtime', route: '/hrms/attendance/overtime' },
        { id: 'att-calendar', label: 'Holiday Calendar', route: '/hrms/attendance/holiday-calendar' },
        { id: 'att-monthly-closing', label: 'Monthly Attendance Closing', route: '/hrms/attendance/monthly-closing', badge: 'Cutoff' }
      ]
    },
    {
      id: 'hr-leave',
      title: '6. Leave Management',
      iconSvg: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      items: [
        { id: 'leave-type', label: 'Leave Type', route: '/hrms/leave/types' },
        { id: 'leave-policy', label: 'Leave Policy', route: '/hrms/leave/policies' },
        { id: 'leave-entitlement', label: 'Leave Entitlement', route: '/hrms/leave/entitlements' },
        { id: 'leave-application', label: 'Leave Application', route: '/hrms/leave/applications', badge: 'Apply' },
        { id: 'leave-approval', label: 'Leave Approval', route: '/hrms/leave/approvals', badge: 'Workflow' },
        { id: 'leave-balance', label: 'Leave Balance', route: '/hrms/leave/balances' },
        { id: 'leave-encashment', label: 'Leave Encashment', route: '/hrms/leave/encashment' },
        { id: 'leave-calendar', label: 'Leave Calendar', route: '/hrms/leave/calendar' },
        { id: 'leave-history', label: 'Leave History', route: '/hrms/leave/history' },
        { id: 'leave-holiday', label: 'Holiday Management', route: '/hrms/leave/holidays' }
      ]
    },
    {
      id: 'hr-payroll',
      title: '7. Payroll Management',
      iconSvg: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      items: [
        { id: 'pay-structure', label: 'Salary Structure', route: '/hrms/payroll/structures' },
        { id: 'pay-components', label: 'Salary Components', route: '/hrms/payroll/components' },
        { id: 'pay-assignment', label: 'Employee Salary Assignment', route: '/hrms/payroll/assignments' },
        { id: 'pay-period', label: 'Payroll Period', route: '/hrms/payroll/periods' },
        { id: 'pay-processing', label: 'Payroll Processing', route: '/hrms/payroll/processing', badge: 'Run' },
        { id: 'pay-attendance-calc', label: 'Attendance-based Calculation', route: '/hrms/payroll/attendance-calc' },
        { id: 'pay-allowances', label: 'Allowances', route: '/hrms/payroll/allowances' },
        { id: 'pay-deductions', label: 'Deductions', route: '/hrms/payroll/deductions' },
        { id: 'pay-bonus', label: 'Bonus', route: '/hrms/payroll/bonus' },
        { id: 'pay-increment', label: 'Increment', route: '/hrms/payroll/increments' },
        { id: 'pay-arrears', label: 'Arrears', route: '/hrms/payroll/arrears' },
        { id: 'pay-validation', label: 'Payroll Validation', route: '/hrms/payroll/validation' },
        { id: 'pay-approval', label: 'Payroll Approval', route: '/hrms/payroll/approval', badge: 'Tier-4' },
        { id: 'pay-payslip', label: 'Payslip', route: '/hrms/payroll/payslips' },
        { id: 'pay-bank-file', label: 'Bank Payment File', route: '/hrms/payroll/bank-payment-files', badge: 'BEFTN' },
        { id: 'pay-posting', label: 'Payroll Posting', route: '/hrms/payroll/posting' },
        { id: 'pay-reversal', label: 'Payroll Reversal', route: '/hrms/payroll/reversals' }
      ]
    },
    {
      id: 'hr-loans-benefits',
      title: '8. Loans, Advances & Benefits',
      iconSvg: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        { id: 'loan-advance', label: 'Salary Advance', route: '/hrms/loans-benefits/salary-advances' },
        { id: 'loan-emp', label: 'Employee Loan', route: '/hrms/loans-benefits/loans' },
        { id: 'loan-approval', label: 'Loan Approval', route: '/hrms/loans-benefits/loan-approvals' },
        { id: 'loan-disbursement', label: 'Loan Disbursement', route: '/hrms/loans-benefits/loan-disbursements' },
        { id: 'loan-schedule', label: 'Installment Schedule', route: '/hrms/loans-benefits/installment-schedules' },
        { id: 'loan-recovery', label: 'Loan Recovery', route: '/hrms/loans-benefits/loan-recoveries' },
        { id: 'loan-medical', label: 'Medical Reimbursement', route: '/hrms/loans-benefits/medical-reimbursements' },
        { id: 'loan-travel', label: 'Travel Allowance', route: '/hrms/loans-benefits/travel-allowances' },
        { id: 'loan-expense', label: 'Expense Claim', route: '/hrms/loans-benefits/expense-claims' },
        { id: 'loan-benefits', label: 'Employee Benefits', route: '/hrms/loans-benefits/benefits-master', badge: 'PF/Gratuity' }
      ]
    },
    {
      id: 'hr-performance',
      title: '9. Performance & Development',
      iconSvg: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      items: [
        { id: 'perf-kpi', label: 'KPI Setup', route: '/hrms/performance/kpi-setup' },
        { id: 'perf-review', label: 'Performance Review', route: '/hrms/performance/reviews' },
        { id: 'perf-cycle', label: 'Appraisal Cycle', route: '/hrms/performance/cycles' },
        { id: 'perf-manager-eval', label: 'Manager Evaluation', route: '/hrms/performance/evaluations' },
        { id: 'perf-self-assess', label: 'Employee Self-Assessment', route: '/hrms/performance/self-assessments' },
        { id: 'perf-training-plan', label: 'Training Plan', route: '/hrms/performance/training-plans' },
        { id: 'perf-training-att', label: 'Training Attendance', route: '/hrms/performance/training-attendance' },
        { id: 'perf-skill-matrix', label: 'Skill Matrix', route: '/hrms/performance/skill-matrix' },
        { id: 'perf-promotion-rec', label: 'Promotion Recommendation', route: '/hrms/performance/promotions' },
        { id: 'perf-increment-rec', label: 'Increment Recommendation', route: '/hrms/performance/increments' }
      ]
    },
    {
      id: 'hr-separation',
      title: '10. Employee Separation',
      iconSvg: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
      items: [
        { id: 'sep-resignation', label: 'Resignation Request', route: '/hrms/separation/resignations' },
        { id: 'sep-notice', label: 'Notice Period', route: '/hrms/separation/notice-periods' },
        { id: 'sep-termination', label: 'Termination', route: '/hrms/separation/terminations' },
        { id: 'sep-exit-interview', label: 'Exit Interview', route: '/hrms/separation/exit-interviews' },
        { id: 'sep-asset-clearance', label: 'Asset Clearance', route: '/hrms/separation/asset-clearances' },
        { id: 'sep-dept-clearance', label: 'Department Clearance', route: '/hrms/separation/dept-clearances' },
        { id: 'sep-loan-settlement', label: 'Loan Settlement', route: '/hrms/separation/loan-settlements' },
        { id: 'sep-leave-settlement', label: 'Leave Settlement', route: '/hrms/separation/leave-settlements' },
        { id: 'sep-final-salary', label: 'Final Salary', route: '/hrms/separation/final-salaries' },
        { id: 'sep-final-settlement', label: 'Final Settlement Approval', route: '/hrms/separation/settlement-approvals', badge: 'FnF' },
        { id: 'sep-experience-cert', label: 'Experience Certificate', route: '/hrms/separation/experience-certificates' }
      ]
    },
    {
      id: 'hr-ess',
      title: '11. Employee Self-Service',
      iconSvg: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        { id: 'ess-profile', label: 'My Profile', route: '/hrms/ess/my-profile' },
        { id: 'ess-attendance', label: 'Attendance', route: '/hrms/ess/my-attendance' },
        { id: 'ess-leave-request', label: 'Leave Request', route: '/hrms/ess/leave-requests' },
        { id: 'ess-leave-balance', label: 'Leave Balance', route: '/hrms/ess/leave-balances' },
        { id: 'ess-payslips', label: 'Payslips', route: '/hrms/ess/my-payslips', badge: 'PDF' },
        { id: 'ess-salary-history', label: 'Salary History', route: '/hrms/ess/salary-history' },
        { id: 'ess-loan-request', label: 'Loan Request', route: '/hrms/ess/loan-requests' },
        { id: 'ess-expense-claim', label: 'Expense Claim', route: '/hrms/ess/expense-claims' },
        { id: 'ess-documents', label: 'Documents', route: '/hrms/ess/my-documents' },
        { id: 'ess-notices', label: 'Company Notices', route: '/hrms/ess/notices' },
        { id: 'ess-helpdesk', label: 'HR Helpdesk', route: '/hrms/ess/helpdesk' }
      ]
    },
    {
      id: 'hr-workflow',
      title: '12. Workflow & Approvals',
      iconSvg: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      items: [
        { id: 'wf-matrix', label: 'Approval Matrix', route: '/hrms/workflow/matrix', badge: 'Tier-1' },
        { id: 'wf-leave', label: 'Leave Approval', route: '/hrms/workflow/leaves' },
        { id: 'wf-overtime', label: 'Overtime Approval', route: '/hrms/workflow/overtime' },
        { id: 'wf-attendance', label: 'Attendance Correction Approval', route: '/hrms/workflow/attendance' },
        { id: 'wf-recruitment', label: 'Recruitment Approval', route: '/hrms/workflow/recruitment' },
        { id: 'wf-salary-rev', label: 'Salary Revision Approval', route: '/hrms/workflow/salary-revisions' },
        { id: 'wf-payroll', label: 'Payroll Approval', route: '/hrms/workflow/payroll' },
        { id: 'wf-expense', label: 'Expense Approval', route: '/hrms/workflow/expenses' },
        { id: 'wf-delegation', label: 'Delegation', route: '/hrms/workflow/delegation' },
        { id: 'wf-history', label: 'Approval History', route: '/hrms/workflow/history' }
      ]
    },
    {
      id: 'hr-compliance',
      title: '13. Statutory, Tax & Compliance',
      iconSvg: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        { id: 'stat-tax-config', label: 'Tax Configuration', route: '/hrms/statutory/tax-config', badge: 'NBR' },
        { id: 'stat-tax-deductions', label: 'Tax Deduction Records', route: '/hrms/statutory/tax-deductions' },
        { id: 'stat-tax-certs', label: 'Tax Certificates', route: '/hrms/statutory/tax-certificates', badge: '108' },
        { id: 'stat-registers', label: 'Statutory Registers', route: '/hrms/statutory/registers', badge: 'DIFE' },
        { id: 'stat-contracts', label: 'Employment Contracts', route: '/hrms/statutory/contracts' },
        { id: 'stat-policy-ack', label: 'Policy Acknowledgment', route: '/hrms/statutory/policies' },
        { id: 'stat-calendar', label: 'Compliance Calendar', route: '/hrms/statutory/calendar' },
        { id: 'stat-audit-docs', label: 'Audit Documents', route: '/hrms/statutory/audit-documents' }
      ]
    },
    {
      id: 'hr-project-alloc',
      title: '14. Project-wise HR & Cost Allocation',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'proj-emp-assign', label: 'Project Employee Assignment', route: '/hrms/project-hr/assignments', badge: 'Site' },
        { id: 'proj-staff-roster', label: 'Site Staff Roster', route: '/hrms/project-hr/rosters' },
        { id: 'proj-labour-alloc', label: 'Labour Allocation', route: '/hrms/project-hr/labour-allocation' },
        { id: 'proj-timesheets', label: 'Timesheets', route: '/hrms/project-hr/timesheets' },
        { id: 'proj-overtime', label: 'Project Overtime', route: '/hrms/project-hr/overtime' },
        { id: 'proj-shared-alloc', label: 'Shared Employee Allocation', route: '/hrms/project-hr/shared-allocation' },
        { id: 'proj-payroll-cost', label: 'Project Payroll Cost', route: '/hrms/project-hr/payroll-costs', badge: 'WIP' },
        { id: 'proj-dept-cost', label: 'Department Cost Allocation', route: '/hrms/project-hr/dept-costs' }
      ]
    },
    {
      id: 'hr-reports',
      title: '15. HR Reports & Analytics',
      iconSvg: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        { id: 'rpt-emp-register', label: 'Employee Register', route: '/hrms/reports/employee-register' },
        { id: 'rpt-dept-headcount', label: 'Headcount by Department', route: '/hrms/reports/headcount-by-dept' },
        { id: 'rpt-proj-headcount', label: 'Headcount by Project', route: '/hrms/reports/headcount-by-project' },
        { id: 'rpt-att-register', label: 'Attendance Register', route: '/hrms/reports/attendance-register' },
        { id: 'rpt-leave', label: 'Leave Report', route: '/hrms/reports/leave-report' },
        { id: 'rpt-overtime', label: 'Overtime Report', route: '/hrms/reports/overtime-report' },
        { id: 'rpt-payroll-register', label: 'Payroll Register', route: '/hrms/reports/payroll-register' },
        { id: 'rpt-salary-sheet', label: 'Salary Sheet', route: '/hrms/reports/salary-sheet', badge: 'Bank' },
        { id: 'rpt-bank-disburse', label: 'Bank Disbursement Report', route: '/hrms/reports/bank-disbursement' },
        { id: 'rpt-loan-bal', label: 'Loan Balance', route: '/hrms/reports/loan-balance' },
        { id: 'rpt-recruitment', label: 'Recruitment Report', route: '/hrms/reports/recruitment-report' },
        { id: 'rpt-turnover', label: 'Turnover Report', route: '/hrms/reports/turnover-report' },
        { id: 'rpt-training', label: 'Training Report', route: '/hrms/reports/training-report' },
        { id: 'rpt-labour-cost', label: 'Project Labour Cost', route: '/hrms/reports/project-labour-cost' }
      ]
    },
    {
      id: 'hr-config-sec',
      title: '16. HR Configuration & Security',
      iconSvg: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      items: [
        { id: 'cfg-settings', label: 'HR Settings', route: '/hrms/config/settings' },
        { id: 'cfg-salary-rules', label: 'Salary Rules', route: '/hrms/config/salary-rules' },
        { id: 'cfg-leave-rules', label: 'Leave Rules', route: '/hrms/config/leave-rules' },
        { id: 'cfg-shift-rules', label: 'Shift Rules', route: '/hrms/config/shift-rules' },
        { id: 'cfg-payroll-cal', label: 'Payroll Calendar', route: '/hrms/config/payroll-calendar' },
        { id: 'cfg-notify-templates', label: 'Notification Templates', route: '/hrms/config/notification-templates' },
        { id: 'cfg-comm-settings', label: 'Email/SMS/Push Settings', route: '/hrms/config/communication-settings' },
        { id: 'cfg-user-roles', label: 'User Roles', route: '/hrms/config/user-roles' },
        { id: 'cfg-permissions', label: 'Permissions', route: '/hrms/config/permissions' },
        { id: 'cfg-audit-logs', label: 'Audit Logs', route: '/hrms/config/audit-logs' },
        { id: 'cfg-biometric-dev', label: 'Biometric Devices', route: '/hrms/config/biometric-devices', badge: 'IoT' },
        { id: 'cfg-api-settings', label: 'API Integration Settings', route: '/hrms/config/api-integrations' }
      ]
    }
  ];

  // =========================================================================
  // Real Estate Operations & Core ERP Menu Groups
  // =========================================================================
  erpMenuGroups: MenuGroup[] = [
    {
      id: 'bi',
      title: 'Executive BI & Strategy',
      iconSvg: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      items: [
        { id: 'bi-cockpit', label: 'Executive BI Cockpit', route: '/bi/cockpit', badge: 'Board' },
        { id: 'bi-runway', label: 'Cash Runway Simulator', route: '/bi/cockpit' },
        { id: 'bi-evm', label: 'Project EVM & Profitability', route: '/bi/cockpit' },
        { id: 'bi-heatmap', label: 'Overdue Collections Heatmap', route: '/bi/cockpit' }
      ]
    },
    {
      id: 'settings',
      title: 'Settings & Core',
      iconSvg: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      items: [
        { id: 'governance', label: 'Maker-Checker Approval Engine', route: '/governance/approvals', badge: 'Tier-1' },
        { id: 'lookups', label: 'Dynamic Dropdowns', route: '/settings/lookups' },
        { id: 'legal', label: 'Legal & Compliance Vault', route: '/legal/compliance-vault', badge: 'Vault' },
        { id: 'equipment', label: 'Machinery & Equipment Fleet', route: '/settings/equipment' },
        { id: 'migration', label: 'Legacy Data Migration', route: '/settings/data-import' }
      ]
    },
    {
      id: 'land',
      title: 'Land Bank & Acquisition',
      iconSvg: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
      items: [
        { id: 'land-dashboard', label: 'Land Intelligence Cockpit', route: '/land/dashboard', badge: 'AI Live' },
        { id: 'landowners-registry', label: 'Landowners & Sellers', route: '/land/landowners' },
        { id: 'land-proposals', label: 'Land Search & Proposals', route: '/land/proposals' },
        { id: 'land-parcels', label: 'Land Parcel Registry', route: '/land/parcels' },
        { id: 'land-conversions', label: 'Area & Regional Conversions', route: '/land/conversions', badge: 'Live' },
        { id: 'land-documents', label: 'Legal Documents Register', route: '/land/documents', badge: 'Vetting' },
        { id: 'joint-ownership', label: 'Joint Ownership & Agreements', route: '/land/joint-ownership', badge: '100% Audit' },
        { id: 'due-diligence', label: 'Legal Due Diligence & Encumbrance', route: '/land/due-diligence', badge: 'Compliance' },
        { id: 'valuation-costing', label: 'Valuation & Acquisition Costing', route: '/land/valuation-costing', badge: 'Financial' },
        { id: 'negotiation-agreements', label: 'Negotiation & Agreement Register', route: '/land/negotiation', badge: 'Commercial' },
        { id: 'payment-schedules', label: 'Payment Schedules & Treasury', route: '/land/payment-schedules', badge: 'Treasury' },
        {
          id: 'land-reports-sub',
          label: 'Land Reports (15)',
          badge: '15 Reports',
          children: [
            { id: 'rep-1', label: 'Landowner Master', route: '/land/reports', queryParams: { type: 'landowner-master' } },
            { id: 'rep-2', label: 'Parcel Register', route: '/land/reports', queryParams: { type: 'parcel-register' } },
            { id: 'rep-3', label: 'Acquisition Pipeline', route: '/land/reports', queryParams: { type: 'opportunity-pipeline' } },
            { id: 'rep-4', label: 'Area Summary', route: '/land/reports', queryParams: { type: 'area-summary' } },
            { id: 'rep-5', label: 'Ownership Discrepancy', route: '/land/reports', queryParams: { type: 'ownership-discrepancy' } },
            { id: 'rep-6', label: 'Unverified Documents', route: '/land/reports', queryParams: { type: 'unverified-documents' } },
            { id: 'rep-7', label: 'Due Diligence & Encumbrance', route: '/land/reports', queryParams: { type: 'due-diligence-encumbrance' } },
            { id: 'rep-8', label: 'Valuation & Cost-per-SqFt', route: '/land/reports', queryParams: { type: 'valuation-cost-sqft' } },
            { id: 'rep-9', label: 'Approved vs Actual Spend', route: '/land/reports', queryParams: { type: 'expenditure-variance' } },
            { id: 'rep-10', label: 'Agreement Milestones', route: '/land/reports', queryParams: { type: 'agreement-milestones' } },
            { id: 'rep-11', label: 'Payment Schedule & Balance', route: '/land/reports', queryParams: { type: 'payment-schedule-balance' } },
            { id: 'rep-12', label: 'Overdue Installments', route: '/land/reports', queryParams: { type: 'overdue-installments' }, badge: 'Alert' },
            { id: 'rep-13', label: 'Project Acquired Land', route: '/land/reports', queryParams: { type: 'project-wise-summary' } },
            { id: 'rep-14', label: 'Approval & Exceptions', route: '/land/reports', queryParams: { type: 'approval-exception-history' } },
            { id: 'rep-15', label: 'Acquisition Audit Trail', route: '/land/reports', queryParams: { type: 'acquisition-audit-trail' }, badge: 'Audit' }
          ]
        },
        { id: 'khatian', label: 'Historic Surveys (CS/SA/RS/BS)', route: '/land/surveys' },
        { id: 'joint-venture', label: 'JV Agreements & Allocation', route: '/land/jv-agreements' }
      ]
    },
    {
      id: 'projects',
      title: '2. Project Development & Management',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      badge: '15 Modules',
      items: [
        { id: 'prj-master', label: 'Project Registration & Master Setup', route: '/projects/master', badge: 'Core' },
        { id: 'prj-feasibility', label: 'Project Feasibility & Investment Analysis', route: '/projects/feasibility', badge: 'Viability' },
        { id: 'prj-land-alloc', label: 'Project-wise Land Allocation', route: '/projects/land-allocation', badge: 'Parcel' },
        { id: 'prj-building-setup', label: 'Building, Tower, Floor & Unit Setup', route: '/projects/towers-units', badge: 'Towers' },
        { id: 'prj-budget-planning', label: 'Project Budget & Cost Planning', route: '/projects/budget-planning', badge: 'Cost' },
        { id: 'prj-profitability-roi', label: 'Estimated Profitability & ROI', route: '/projects/profitability-roi', badge: 'ROI' },
        { id: 'prj-timeline-milestones', label: 'Project Timeline & Milestones', route: '/projects/timeline-milestones', badge: 'Gantt' },
        { id: 'prj-regulatory-approvals', label: 'Regulatory Approvals & Compliance', route: '/projects/regulatory-approvals', badge: 'RAJUK' },
        { id: 'prj-drawings-docs', label: 'Architectural Drawings & Documents', route: '/projects/drawings-documents', badge: 'IFC' },
        { id: 'prj-construction-monitoring', label: 'Construction Progress Monitoring', route: '/projects/construction-monitoring', badge: 'Site' },
        { id: 'prj-risk-issues', label: 'Project Risk & Issue Management', route: '/projects/risk-issues', badge: 'Risk' },
        { id: 'prj-change-orders', label: 'Project Change Orders & Variations', route: '/projects/change-orders', badge: 'Change' },
        { id: 'prj-fin-perf', label: 'Project-wise Financial Performance', route: '/projects/financial-performance', badge: 'Finance' },
        { id: 'prj-reports-dash', label: 'Project Reports & Executive Dashboard', route: '/projects/reports-dashboard', badge: 'KPIs' },
        { id: 'prj-handover-closure', label: 'Project Handover & Closure', route: '/projects/handover-closure', badge: 'Closure' }
      ]
    },
    {
      id: 'construction',
      title: 'Construction Operations',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'wbs-boq', label: 'WBS & BOQ Hard Budget Locks', route: '/construction/wbs-boq' },
        { id: 'dpr', label: 'Site Diary & Daily Progress (DPR)', route: '/construction/dpr' },
        { id: 'labor-muster', label: 'Subcontractor Labor Muster Roll', route: '/construction/labor-muster' },
        { id: 'ra-bills', label: 'Contractor RA Billing', route: '/construction/ra-bills' },
        { id: 'cube-tests', label: 'Concrete Cube Crushing Tests', route: '/construction/cube-tests' },
        { id: 'safety-ncr', label: 'Site Safety NCR Register', route: '/construction/safety-ncr' }
      ]
    },
    {
      id: 'procurement',
      title: '9. Procurement & Inventory',
      iconSvg: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      badge: '15 Modules',
      items: [
        { id: 'proc-dash', label: '9.1 Procurement Dashboard', route: '/procurement/dashboard', badge: 'Live' },
        { id: 'proc-vendor', label: '9.2 Supplier & Vendor Management', route: '/procurement/vendors', badge: 'Enlist' },
        { id: 'proc-mat', label: '9.3 Material & Item Master', route: '/procurement/materials', badge: 'SKU' },
        { id: 'proc-pr', label: '9.4 Purchase Requisitions (PR)', route: '/procurement/requisitions', badge: 'BOQ Lock' },
        { id: 'proc-rfq', label: '9.5 RFQ & Quotation Comparison', route: '/procurement/rfq-comparison', badge: 'CS' },
        { id: 'proc-po', label: '9.6 Purchase Order (PO) Mgmt', route: '/procurement/purchase-orders', badge: 'PO' },
        { id: 'proc-grn', label: '9.7 Goods Receipt Note (GRN)', route: '/procurement/grn', badge: 'Gate' },
        { id: 'proc-qc', label: '9.8 Quality Inspection & Gate Entry', route: '/procurement/inspections', badge: 'QC' },
        { id: 'proc-stock', label: '9.9 Warehouse & Project-Site Stock', route: '/procurement/warehouse-stock', badge: 'Stock' },
        { id: 'proc-min', label: '9.10 Material Issue & Consumption', route: '/procurement/material-issues', badge: 'MIN' },
        { id: 'proc-transfer', label: '9.11 Stock Transfers & Adjustments', route: '/procurement/stock-transfers', badge: 'Challan' },
        { id: 'proc-planning', label: '9.12 Reorder & Material Planning', route: '/procurement/material-planning', badge: 'Indent' },
        { id: 'proc-ledger', label: '9.13 Perpetual Valuation & Ledger', route: '/procurement/inventory-ledger', badge: 'Costing' },
        { id: 'proc-bills', label: '9.14 Supplier Bills & 3-Way Match', route: '/procurement/supplier-bills', badge: '3-Way' },
        { id: 'proc-audit', label: '9.15 Audit Trail & Reports', route: '/procurement/reports-audit', badge: 'Audit' }
      ]
    },
    {
      id: 'units',
      title: 'Property Inventory',
      iconSvg: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      items: [
        { id: 'tower-stacking', label: '2D Tower Stacking Elevation', route: '/inventory/stacking-plan', badge: '2D Stacking' },
        { id: 'units-matrix', label: '15-Minute Lock Matrix', route: '/inventory/matrix', badge: 'Live' },
        { id: 'subdivision', label: 'Unit Merge & Subdivision', route: '/inventory/subdivision' },
        { id: 'parking-bays', label: 'Basement Parking Bays', route: '/inventory/parking' }
      ]
    },
    {
      id: 'crm',
      title: 'CRM & Prospects',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'lead-capture', label: 'Lead Capture & Sources', route: '/crm/lead-capture', badge: '4.2' },
        { id: 'lead-assignments', label: 'Lead Assignment & Distribution', route: '/crm/lead-assignments', badge: '4.3' },
        { id: 'lead-qualification', label: 'Lead Qualification & Scoring', route: '/crm/lead-qualification', badge: '4.4' },
        { id: 'leads', label: 'Omnichannel Leads & Pipeline', route: '/crm/leads' },
        { id: 'customers', label: 'Buyer Profiles & KYC', route: '/crm/customers', badge: '4.5' },
        { id: 'customer-portal', label: 'Flat Owner Self-Service Portal', route: '/portal/customer', badge: 'Portal' }
      ]
    },
    {
      id: 'sales',
      title: 'Sales & Allotments',
      iconSvg: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        { id: 'bookings', label: 'Apartment Bookings', route: '/sales/bookings' },
        { id: 'discounts', label: 'Discount Level Approvals', route: '/sales/discounts' },
        { id: 'collections', label: 'Booking & Down Payments', route: '/sales/collections', badge: 'Spec' },
        { id: 'documents', label: 'Sales Agreements & Deeds', route: '/sales/documents', badge: 'Spec' },
        { id: 'schedules', label: 'Installment Schedules', route: '/sales/schedules', badge: 'Spec' },
        { id: 'sales-ledger', label: 'Customer Sales Ledger', route: '/sales/ledger', badge: 'Spec' },
        { id: 'cancellations', label: 'Cancellations & Refunds', route: '/sales/cancellations', badge: 'Spec' },
        { id: 'transfers', label: 'Property Transfers & Mutation', route: '/sales/transfers', badge: 'Spec' },
        { id: 'registrations', label: 'Registration & Deed Tracking', route: '/sales/registrations', badge: '5.11' },
        { id: 'handovers', label: 'Handover & Possession', route: '/sales/handovers', badge: '5.12' },
        { id: 'property-report', label: 'Property Portfolio Report', route: '/sales/reports/property-report', badge: 'Excel/PDF' },
        { id: 'brokers', label: 'Broker Commissions & TDS', route: '/brokers/commissions' }
      ]
    },
    {
      id: 'collection',
      title: 'Collections & PDC Vault',
      iconSvg: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'money-receipts', label: 'Money Receipts & Waterfall', route: '/installments/money-receipts', badge: 'Smart MR' },
        { id: 'tripartite-loans', label: 'Bank Loan Tripartite Ledger', route: '/installments/tripartite-loans', badge: 'Tripartite' },
        { id: 'schedules', label: 'Installment Schedules & MR', route: '/installments/schedules' },
        { id: 'pdc', label: 'PDC Cheque Vault & Safe', route: '/installments/pdc-vault' },
        { id: 'ni138', label: 'NI Act 138 Legal Recovery', route: '/installments/ni138-actions' }
      ]
    },
    {
      id: 'accounts',
      title: 'Finance & Accounts',
      iconSvg: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      items: [
        { id: 'coa', label: '5-Tier Chart of Accounts', route: '/accounts/coa' },
        { id: 'vouchers', label: 'General Ledger & Vouchers', route: '/accounts/vouchers' },
        { id: 'cwip-cockpit', label: 'CWIP & IFRS-15 Cockpit', route: '/accounts/cwip-cockpit', badge: 'Tier-1' },
        { id: 'pdc-kanban', label: 'PDC Vault & Kanban Safe', route: '/accounts/pdc-kanban', badge: 'Safe' },
        { id: 'bank-recon-wizard', label: 'Smart Bank Statement Recon', route: '/accounts/bank-recon-wizard' },
        { id: 'reports', label: 'Financial Reports & P&L', route: '/accounts/financial-reports' }
      ]
    },
    {
      id: 'tax',
      title: 'NBR Tax & Statutory VAT',
      iconSvg: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        { id: 'tax-cockpit', label: 'NBR Tax & VAT Cockpit', route: '/tax/cockpit', badge: 'NBR' },
        { id: 'tax-mushak63', label: 'Mushak 6.3 VAT Invoices', route: '/tax/cockpit' },
        { id: 'tax-mushak65', label: 'Mushak 6.5 Transfer Challan', route: '/tax/cockpit' },
        { id: 'tax-tds', label: 'TDS & VDS Withholding Register', route: '/tax/cockpit' },
        { id: 'tax-53ff', label: 'Section 53FF AIT Calculator', route: '/tax/cockpit' }
      ]
    },
    {
      id: 'hrms-suite',
      title: 'Human Resources (HRMS)',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      badge: '16 Modules',
      items: [],
      subGroups: []
    },
    {
      id: 'handover',
      title: 'Handover & Facilities',
      iconSvg: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
      items: [
        { id: 'snagging', label: 'Snagging & DLP Warranty', route: '/handover/snagging' },
        { id: 'possession', label: 'Key Handover & Possession', route: '/handover/possession' },
        { id: 'association', label: 'Building Association & Leasing', route: '/handover/association' }
      ]
    }
  ];

  constructor() {
    const hrmsGroup = this.erpMenuGroups.find(g => g.id === 'hrms-suite');
    if (hrmsGroup) {
      hrmsGroup.subGroups = this.hrMenuGroups;
    }
  }

  // Active Menu Groups (Unified Real Estate ERP containing all core and HRMS modules)
  menuGroups = computed(() => {
    return this.erpMenuGroups;
  });

  // Real-time filtered groups based on in-sidebar search input
  filteredGroups = computed(() => {
    const q = this.filterQuery().trim().toLowerCase();
    const currentList = this.menuGroups();

    if (!q) return currentList;

    return currentList
      .map((group): MenuGroup | null => {
        // Nested parent group (HRMS suite with 16 sub-modules)
        if (group.subGroups && group.subGroups.length > 0) {
          const parentMatches = group.title.toLowerCase().includes(q);
          const matchingSubGroups = group.subGroups
            .map((sub): MenuGroup | null => {
              const subMatches = sub.title.toLowerCase().includes(q);
              const matchingItems = sub.items.filter(item =>
                item.label.toLowerCase().includes(q)
              );

              if (subMatches || matchingItems.length > 0) {
                return {
                  ...sub,
                  items: subMatches ? sub.items : matchingItems
                };
              }
              return null;
            })
            .filter((s): s is MenuGroup => s !== null);

          if (parentMatches || matchingSubGroups.length > 0) {
            return {
              ...group,
              subGroups: parentMatches ? group.subGroups : matchingSubGroups
            };
          }
          return null;
        }

        // Standard single-level menu group
        const matchesGroup = group.title.toLowerCase().includes(q);
        const matchingItems = group.items.filter(item =>
          item.label.toLowerCase().includes(q) ||
          (item.children && item.children.some(c => c.label.toLowerCase().includes(q)))
        );

        if (matchesGroup || matchingItems.length > 0) {
          return {
            ...group,
            items: matchesGroup ? group.items : matchingItems
          };
        }
        return null;
      })
      .filter((g): g is MenuGroup => g !== null);
  });

  ngOnInit(): void {
    this.autoExpandActiveRoute();
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.autoExpandActiveRoute();
    });
  }

  setSuite(suite: 'hrms' | 'erp'): void {
    this.activeSuite.set(suite);
    this.autoExpandActiveRoute();
  }

  private autoExpandActiveRoute(): void {
    const currentUrl = this.router.url;
    for (const group of this.erpMenuGroups) {
      if (group.items) {
        for (const item of group.items) {
          if (item.route && currentUrl.startsWith(item.route)) {
            this.expandedGroupIds.update(set => new Set(set).add(group.id));
          }
          if (item.children && item.children.some(c => c.route && currentUrl.startsWith(c.route))) {
            this.expandedGroupIds.update(set => new Set(set).add(group.id));
            this.expandedSubItemIds.update(set => new Set(set).add(item.id));
          }
        }
      }
      if (group.subGroups) {
        for (const sub of group.subGroups) {
          if (sub.items && sub.items.some(item => item.route && currentUrl.startsWith(item.route))) {
            this.expandedGroupIds.update(set => {
              const newSet = new Set(set);
              newSet.add(group.id);
              newSet.add(sub.id);
              return newSet;
            });
          }
        }
      }
    }
  }

  isGroupExpanded(groupId: string): boolean {
    if (this.filterQuery().trim()) {
      return true;
    }
    return this.expandedGroupIds().has(groupId);
  }

  toggleGroup(groupId: string): void {
    const current = new Set(this.expandedGroupIds());
    if (current.has(groupId)) {
      current.delete(groupId);
    } else {
      current.add(groupId);
    }
    this.expandedGroupIds.set(current);
  }

  isSubItemExpanded(itemId: string): boolean {
    if (this.filterQuery().trim()) {
      return true;
    }
    return this.expandedSubItemIds().has(itemId);
  }

  toggleSubItem(itemId: string): void {
    const current = new Set(this.expandedSubItemIds());
    if (current.has(itemId)) {
      current.delete(itemId);
    } else {
      current.add(itemId);
    }
    this.expandedSubItemIds.set(current);
  }
}

