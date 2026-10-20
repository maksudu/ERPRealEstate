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
  exact?: boolean;
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

  // Expanded menu groups state (All closed/off by default; opens only upon user click)
  expandedGroupIds = signal<Set<string>>(new Set<string>());
  expandedSubItemIds = signal<Set<string>>(new Set<string>());

  // =========================================================================
  // 16 Full Enterprise HRMS Main Menus matching user specification exactly
  // =========================================================================
  hrMenuGroups: MenuGroup[] = [
    {
      id: 'hr-dashboard',
      title: 'HR Dashboard',
      iconSvg: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      items: [
        { id: 'hr-dash-overview', label: 'Overview', route: '/hrms/dashboard/overview' },
        { id: 'hr-dash-headcount', label: 'Headcount Summary', route: '/hrms/dashboard/headcount' },
        { id: 'hr-dash-attendance', label: 'Attendance Summary', route: '/hrms/dashboard/attendance-summary' },
        { id: 'hr-dash-leave', label: 'Leave Summary', route: '/hrms/dashboard/leave-summary' },
        { id: 'hr-dash-payroll', label: 'Payroll Summary', route: '/hrms/dashboard/payroll-summary' },
        { id: 'hr-dash-approvals', label: 'Pending Approvals', route: '/hrms/dashboard/pending-approvals' },
        { id: 'hr-dash-alerts', label: 'HR Alerts', route: '/hrms/dashboard/alerts' }
      ]
    },
    {
      id: 'hr-org-setup',
      title: 'Organization Setup',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'org-company', label: 'Company Setup', route: '/hrms/org/companies' },
        { id: 'org-legal', label: 'Legal Entity', route: '/hrms/org/legal-entities' },
        { id: 'org-branch', label: 'Branch Setup', route: '/hrms/org/branches' },
        { id: 'org-project-office', label: 'Project Office Setup', route: '/hrms/org/project-offices' },
        { id: 'org-dept-master', label: 'Department Master', route: '/hrms/departments' },
        { id: 'org-dept-hierarchy', label: 'Department Hierarchy', route: '/hrms/departments/hierarchy' },
        { id: 'org-dept-head', label: 'Department Head', route: '/hrms/departments/heads' },
        { id: 'org-designation', label: 'Designation', route: '/hrms/designations' },
        { id: 'org-job-grade', label: 'Job Grade', route: '/hrms/designations/grades' },
        { id: 'org-cost-center', label: 'Cost Center', route: '/hrms/org/cost-centers' }
      ]
    },
    {
      id: 'hr-employee-mgmt',
      title: 'Employee Management',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'emp-list', label: 'Employee List', route: '/hrms/employees/list' },
        { id: 'emp-add', label: 'Add Employee', route: '/hrms/employees/add' },
        { id: 'emp-profile', label: 'Employee Profile', route: '/hrms/employees/profile' },
        { id: 'emp-personal', label: 'Personal Information', route: '/hrms/employees/personal-info' },
        { id: 'emp-employment', label: 'Employment Details', route: '/hrms/employees/employment-details' },
        { id: 'emp-documents', label: 'Documents', route: '/hrms/employees/documents' },
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
      title: 'Recruitment & Onboarding',
      iconSvg: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      items: [
        { id: 'rec-requisition', label: 'Manpower Requisition', route: '/hrms/recruitment/requisitions' },
        { id: 'rec-vacancy', label: 'Job Vacancy', route: '/hrms/recruitment/vacancies' },
        { id: 'rec-applicants', label: 'Applicant Database', route: '/hrms/recruitment/applicants' },
        { id: 'rec-interview-sched', label: 'Interview Schedule', route: '/hrms/recruitment/interviews' },
        { id: 'rec-evaluation', label: 'Interview Evaluation', route: '/hrms/recruitment/evaluations' },
        { id: 'rec-selection', label: 'Selection', route: '/hrms/recruitment/selection' },
        { id: 'rec-offer', label: 'Offer Letter', route: '/hrms/recruitment/offer-letters' },
        { id: 'rec-appointment', label: 'Appointment Letter', route: '/hrms/recruitment/appointment-letters' },
        { id: 'rec-checklist', label: 'Joining Checklist', route: '/hrms/recruitment/joining-checklist' },
        { id: 'rec-onboarding', label: 'Employee Onboarding', route: '/hrms/recruitment/onboarding' }
      ]
    },
    {
      id: 'hr-attendance',
      title: 'Attendance & Shift Management',
      iconSvg: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        { id: 'att-shift-master', label: 'Shift Master', route: '/hrms/attendance/shifts' },
        { id: 'att-shift-roster', label: 'Shift Roster', route: '/hrms/attendance/rosters' },
        { id: 'att-logs', label: 'Attendance Logs', route: '/hrms/attendance/logs' },
        { id: 'att-biometric', label: 'Biometric Integration', route: '/hrms/attendance/biometric' },
        { id: 'att-mobile', label: 'Mobile Check-in', route: '/hrms/attendance/mobile-checkin' },
        { id: 'att-site', label: 'Site Attendance', route: '/hrms/attendance/site-attendance' },
        { id: 'att-late-early', label: 'Late/Early Report', route: '/hrms/attendance/late-early' },
        { id: 'att-missing-punch', label: 'Missing Punch', route: '/hrms/attendance/missing-punches' },
        { id: 'att-correction', label: 'Attendance Correction', route: '/hrms/attendance/corrections' },
        { id: 'att-overtime', label: 'Overtime', route: '/hrms/attendance/overtime' },
        { id: 'att-calendar', label: 'Holiday Calendar', route: '/hrms/attendance/holiday-calendar' },
        { id: 'att-monthly-closing', label: 'Monthly Attendance Closing', route: '/hrms/attendance/monthly-closing' }
      ]
    },
    {
      id: 'hr-leave',
      title: 'Leave Management',
      iconSvg: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      items: [
        { id: 'leave-type', label: 'Leave Type', route: '/hrms/leave/types' },
        { id: 'leave-policy', label: 'Leave Policy', route: '/hrms/leave/policies' },
        { id: 'leave-entitlement', label: 'Leave Entitlement', route: '/hrms/leave/entitlements' },
        { id: 'leave-application', label: 'Leave Application', route: '/hrms/leave/applications' },
        { id: 'leave-approval', label: 'Leave Approval', route: '/hrms/leave/approvals' },
        { id: 'leave-balance', label: 'Leave Balance', route: '/hrms/leave/balances' },
        { id: 'leave-encashment', label: 'Leave Encashment', route: '/hrms/leave/encashment' },
        { id: 'leave-calendar', label: 'Leave Calendar', route: '/hrms/leave/calendar' },
        { id: 'leave-history', label: 'Leave History', route: '/hrms/leave/history' },
        { id: 'leave-holiday', label: 'Holiday Management', route: '/hrms/leave/holidays' }
      ]
    },
    {
      id: 'hr-payroll',
      title: 'Payroll Management',
      iconSvg: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      items: [
        { id: 'pay-structure', label: 'Salary Structure', route: '/hrms/payroll/structures' },
        { id: 'pay-components', label: 'Salary Components', route: '/hrms/payroll/components' },
        { id: 'pay-assignment', label: 'Employee Salary Assignment', route: '/hrms/payroll/assignments' },
        { id: 'pay-period', label: 'Payroll Period', route: '/hrms/payroll/periods' },
        { id: 'pay-processing', label: 'Payroll Processing', route: '/hrms/payroll/processing' },
        { id: 'pay-attendance-calc', label: 'Attendance-based Calculation', route: '/hrms/payroll/attendance-calc' },
        { id: 'pay-allowances', label: 'Allowances', route: '/hrms/payroll/allowances' },
        { id: 'pay-deductions', label: 'Deductions', route: '/hrms/payroll/deductions' },
        { id: 'pay-bonus', label: 'Bonus', route: '/hrms/payroll/bonus' },
        { id: 'pay-increment', label: 'Increment', route: '/hrms/payroll/increments' },
        { id: 'pay-arrears', label: 'Arrears', route: '/hrms/payroll/arrears' },
        { id: 'pay-validation', label: 'Payroll Validation', route: '/hrms/payroll/validation' },
        { id: 'pay-approval', label: 'Payroll Approval', route: '/hrms/payroll/approval' },
        { id: 'pay-payslip', label: 'Payslip', route: '/hrms/payroll/payslips' },
        { id: 'pay-bank-file', label: 'Bank Payment File', route: '/hrms/payroll/bank-payment-files' },
        { id: 'pay-posting', label: 'Payroll Posting', route: '/hrms/payroll/posting' },
        { id: 'pay-reversal', label: 'Payroll Reversal', route: '/hrms/payroll/reversals' }
      ]
    },
    {
      id: 'hr-loans-benefits',
      title: 'Loans, Advances & Benefits',
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
        { id: 'loan-benefits', label: 'Employee Benefits', route: '/hrms/loans-benefits/benefits-master' }
      ]
    },
    {
      id: 'hr-performance',
      title: 'Performance & Development',
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
      title: 'Employee Separation',
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
        { id: 'sep-final-settlement', label: 'Final Settlement Approval', route: '/hrms/separation/settlement-approvals' },
        { id: 'sep-experience-cert', label: 'Experience Certificate', route: '/hrms/separation/experience-certificates' }
      ]
    },
    {
      id: 'hr-ess',
      title: 'Employee Self-Service',
      iconSvg: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        { id: 'ess-profile', label: 'My Profile', route: '/hrms/ess/my-profile' },
        { id: 'ess-attendance', label: 'Attendance', route: '/hrms/ess/my-attendance' },
        { id: 'ess-leave-request', label: 'Leave Request', route: '/hrms/ess/leave-requests' },
        { id: 'ess-leave-balance', label: 'Leave Balance', route: '/hrms/ess/leave-balances' },
        { id: 'ess-payslips', label: 'Payslips', route: '/hrms/ess/my-payslips' },
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
      title: 'Workflow & Approvals',
      iconSvg: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      items: [
        { id: 'wf-matrix', label: 'Approval Matrix', route: '/hrms/workflow/matrix' },
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
      title: 'Statutory, Tax & Compliance',
      iconSvg: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        { id: 'stat-tax-config', label: 'Tax Configuration', route: '/hrms/statutory/tax-config' },
        { id: 'stat-tax-deductions', label: 'Tax Deduction Records', route: '/hrms/statutory/tax-deductions' },
        { id: 'stat-tax-certs', label: 'Tax Certificates', route: '/hrms/statutory/tax-certificates' },
        { id: 'stat-registers', label: 'Statutory Registers', route: '/hrms/statutory/registers' },
        { id: 'stat-contracts', label: 'Employment Contracts', route: '/hrms/statutory/contracts' },
        { id: 'stat-policy-ack', label: 'Policy Acknowledgment', route: '/hrms/statutory/policies' },
        { id: 'stat-calendar', label: 'Compliance Calendar', route: '/hrms/statutory/calendar' },
        { id: 'stat-audit-docs', label: 'Audit Documents', route: '/hrms/statutory/audit-documents' }
      ]
    },
    {
      id: 'hr-project-alloc',
      title: 'Project-wise HR & Cost Allocation',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'proj-emp-assign', label: 'Project Employee Assignment', route: '/hrms/project-hr/assignments' },
        { id: 'proj-staff-roster', label: 'Site Staff Roster', route: '/hrms/project-hr/rosters' },
        { id: 'proj-labour-alloc', label: 'Labour Allocation', route: '/hrms/project-hr/labour-allocation' },
        { id: 'proj-timesheets', label: 'Timesheets', route: '/hrms/project-hr/timesheets' },
        { id: 'proj-overtime', label: 'Project Overtime', route: '/hrms/project-hr/overtime' },
        { id: 'proj-shared-alloc', label: 'Shared Employee Allocation', route: '/hrms/project-hr/shared-allocation' },
        { id: 'proj-payroll-cost', label: 'Project Payroll Cost', route: '/hrms/project-hr/payroll-costs' },
        { id: 'proj-dept-cost', label: 'Department Cost Allocation', route: '/hrms/project-hr/dept-costs' }
      ]
    },
    {
      id: 'hr-reports',
      title: 'HR Reports & Analytics',
      iconSvg: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        { id: 'rpt-emp-register', label: 'Employee Register', route: '/hrms/reports/employee-register' },
        { id: 'rpt-dept-headcount', label: 'Headcount by Department', route: '/hrms/reports/headcount-by-dept' },
        { id: 'rpt-proj-headcount', label: 'Headcount by Project', route: '/hrms/reports/headcount-by-project' },
        { id: 'rpt-att-register', label: 'Attendance Register', route: '/hrms/reports/attendance-register' },
        { id: 'rpt-leave', label: 'Leave Report', route: '/hrms/reports/leave-report' },
        { id: 'rpt-overtime', label: 'Overtime Report', route: '/hrms/reports/overtime-report' },
        { id: 'rpt-payroll-register', label: 'Payroll Register', route: '/hrms/reports/payroll-register' },
        { id: 'rpt-salary-sheet', label: 'Salary Sheet', route: '/hrms/reports/salary-sheet' },
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
      title: 'HR Configuration & Security',
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
        { id: 'cfg-biometric-dev', label: 'Biometric Devices', route: '/hrms/config/biometric-devices' },
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
        { id: 'bi-cockpit', label: 'Executive BI Cockpit', route: '/bi/cockpit' },
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
        { id: 'governance', label: 'Maker-Checker Approval Engine', route: '/governance/approvals' },
        { id: 'lookups', label: 'Dynamic Dropdowns', route: '/settings/lookups' },
        { id: 'equipment', label: 'Machinery & Equipment Fleet', route: '/settings/equipment' },
        { id: 'migration', label: 'Legacy Data Migration', route: '/settings/data-import' }
      ]
    },
    {
      id: 'security-management',
      title: 'User, Role & Security',
      iconSvg: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      badge: '18',
      items: [
        { id: 'sec-cockpit', label: 'Security Cockpit & KPIs', route: '/security/dashboard' },
        { id: 'sec-users', label: 'User Accounts & Lifecycle', route: '/security/users' },
        { id: 'sec-roles', label: 'Role Management (25 Roles)', route: '/security/roles' },
        { id: 'sec-permissions', label: 'Permission Matrix (16 Modules)', route: '/security/permissions' },
        { id: 'sec-scopes', label: 'Project & Scope Access', route: '/security/project-access' },
        { id: 'sec-workflow', label: 'Maker-Checker Separation', route: '/security/workflow-security' },
        { id: 'sec-auth-policies', label: 'Auth & Password Policies', route: '/security/auth-security' },
        { id: 'sec-api-mobile', label: 'API Keys & Mobile Policies', route: '/security/api-mobile-security' },
        { id: 'sec-audit-trails', label: 'Audit Trail & Sessions', route: '/security/audit-logs' },
        { id: 'sec-monitoring', label: 'Threat Monitoring & Reviews', route: '/security/monitoring-reviews' },
        {
          id: 'sec-reports-suite',
          label: 'Security & Access Reports',
          badge: '3',
          children: [
            { id: 'rep-sec-matrix', label: 'User Access Matrix', route: '/security/reports', queryParams: { tab: 'user_access_matrix' } },
            { id: 'rep-sec-priv', label: 'Privileged Accounts Audit', route: '/security/reports', queryParams: { tab: 'privileged_accounts' } },
            { id: 'rep-sec-threats', label: 'Failed Logins & Threat Statement', route: '/security/reports', queryParams: { tab: 'threat_analytics' } }
          ]
        }
      ]
    },
    {
      id: 'legal-compliance',
      title: 'Legal & Statutory Compliance',
      iconSvg: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
      badge: '12',
      items: [
        { id: 'leg-dashboard', label: 'Legal Cockpit & Dashboard', route: '/legal/dashboard' },
        { id: 'leg-deeds', label: 'Deed, Khatian, Mutation & Tax', route: '/legal/records/registered_record' },
        { id: 'leg-developer-reg', label: 'Developer Licences & Renewals', route: '/legal/records/developer_registration' },
        { id: 'leg-land-clearances', label: 'Land-Use & Building Approvals', route: '/legal/records/land_use_clearance' },
        { id: 'leg-conditions', label: 'Approval Conditions Register', route: '/legal/records/approval_condition' },
        { id: 'leg-noc', label: 'NOCs & Authority Correspondence', route: '/legal/records/noc_correspondence' },
        { id: 'leg-agreements', label: 'Customer Agreements & Transfers', route: '/legal/records/sale_transfer' },
        { id: 'leg-litigation', label: 'Litigation, Disputes & Notices', route: '/legal/records/litigation_notice' },
        { id: 'leg-vault', label: 'Document Versioning & Archive', route: '/legal/records/document_archive' },
        { id: 'leg-calendar', label: 'Compliance Calendar & Reminders', route: '/legal/records/calendar_reminder' },
        { id: 'leg-workflows', label: 'Maker-Checker Approvals', route: '/legal/records/approval_workflow' },
        { id: 'leg-reports', label: 'Compliance Reports', route: '/legal/records/compliance_report' },
        { id: 'leg-audit', label: 'Compliance Audit Trail', route: '/legal/audit' },
        { id: 'leg-statutory-vault', label: 'Statutory Permits & Court Hearings', route: '/legal/compliance-vault' }
      ]
    },
    {
      id: 'land',
      title: 'Land Bank & Acquisition',
      iconSvg: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
      items: [
        { id: 'land-dashboard', label: 'Land Intelligence Cockpit', route: '/land/dashboard' },
        { id: 'landowners-registry', label: 'Landowners & Sellers', route: '/land/landowners' },
        { id: 'land-proposals', label: 'Land Search & Proposals', route: '/land/proposals' },
        { id: 'land-parcels', label: 'Land Parcel Registry', route: '/land/parcels' },
        { id: 'land-conversions', label: 'Area & Regional Conversions', route: '/land/conversions' },
        { id: 'joint-ownership', label: 'Joint Ownership & Agreements', route: '/land/joint-ownership' },
        { id: 'due-diligence', label: 'Legal Due Diligence & Encumbrance', route: '/land/due-diligence' },
        { id: 'valuation-costing', label: 'Valuation & Acquisition Costing', route: '/land/valuation-costing' },
        { id: 'negotiation-agreements', label: 'Negotiation & Agreement Register', route: '/land/negotiation' },
        { id: 'payment-schedules', label: 'Payment Schedules & Treasury', route: '/land/payment-schedules' },
        {
          id: 'land-reports-sub',
          label: 'Land Reports',
          badge: 'Reports',
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
            { id: 'rep-12', label: 'Overdue Installments', route: '/land/reports', queryParams: { type: 'overdue-installments' } },
            { id: 'rep-13', label: 'Project Acquired Land', route: '/land/reports', queryParams: { type: 'project-wise-summary' } },
            { id: 'rep-14', label: 'Approval & Exceptions', route: '/land/reports', queryParams: { type: 'approval-exception-history' } },
            { id: 'rep-15', label: 'Acquisition Audit Trail', route: '/land/reports', queryParams: { type: 'acquisition-audit-trail' } }
          ]
        },
        { id: 'khatian', label: 'Historic Surveys (CS/SA/RS/BS)', route: '/land/surveys' },
        { id: 'joint-venture', label: 'JV Agreements & Allocation', route: '/land/jv-agreements' }
      ]
    },
    {
      id: 'projects',
      title: 'Project Development & Management',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'prj-master', label: 'Project Registration & Master Setup', route: '/projects/master' },
        { id: 'prj-feasibility', label: 'Project Feasibility & Investment Analysis', route: '/projects/feasibility' },
        { id: 'prj-land-alloc', label: 'Project-wise Land Allocation', route: '/projects/land-allocation' },
        { id: 'prj-building-setup', label: 'Building, Tower, Floor & Unit Setup', route: '/projects/towers-units' },
        { id: 'prj-budget-planning', label: 'Project Budget & Cost Planning', route: '/projects/budget-planning' },
        { id: 'prj-profitability-roi', label: 'Estimated Profitability & ROI', route: '/projects/profitability-roi' },
        { id: 'prj-timeline-milestones', label: 'Project Timeline & Milestones', route: '/projects/timeline-milestones' },
        { id: 'prj-regulatory-approvals', label: 'Regulatory Approvals & Compliance', route: '/projects/regulatory-approvals' },
        { id: 'prj-drawings-docs', label: 'Architectural Drawings & Documents', route: '/projects/drawings-documents' },
        { id: 'prj-construction-monitoring', label: 'Construction Progress Monitoring', route: '/projects/construction-monitoring' },
        { id: 'prj-risk-issues', label: 'Project Risk & Issue Management', route: '/projects/risk-issues' },
        { id: 'prj-change-orders', label: 'Project Change Orders & Variations', route: '/projects/change-orders' },
        { id: 'prj-fin-perf', label: 'Project-wise Financial Performance', route: '/projects/financial-performance' },
        { id: 'prj-reports-dash', label: 'Project Reports & Executive Dashboard', route: '/projects/reports-dashboard' },
        { id: 'prj-handover-closure', label: 'Project Handover & Closure', route: '/projects/handover-closure' }
      ]
    },
    {
      id: 'construction',
      title: 'Construction Operations',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'wbs-boq', label: 'WBS & BOQ Hard Budget Locks', route: '/construction/wbs-boq' },
        { id: 'work-orders', label: 'Work Orders & Contracts', route: '/construction/work-orders' },
        { id: 'contractors', label: 'Contractor & Subcontractor Registry', route: '/construction/contractors' },
        { id: 'dpr', label: 'Site Diary & Daily Progress (DPR)', route: '/construction/dpr' },
        { id: 'labor-muster', label: 'Subcontractor Labor Muster Roll', route: '/construction/labor-muster' },
        { id: 'ra-bills', label: 'Contractor RA Billing', route: '/construction/ra-bills' },
        { id: 'cube-tests', label: 'Concrete Cube Crushing Tests', route: '/construction/cube-tests' },
        { id: 'safety-ncr', label: 'Health, Safety (HSE) & Defect NCR', route: '/construction/safety-ncr' },
        { id: 'mat-requisitions', label: 'Material Requisition & Consumption', route: '/construction/material-requisitions' },
        { id: 'project-completion', label: 'Project Completion & Handover', route: '/construction/project-completion' },
        { id: 'construction-reports', label: 'Construction Management Reports', route: '/construction/reports' }
      ]
    },
    {
      id: 'budgeting-cost-control',
      title: 'Budgeting & Cost Control',
      iconSvg: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      badge: '12',
      items: [
        { id: 'bcc-dashboard', label: 'Dashboard', route: '/budgeting/dashboard' },
        { id: 'bcc-planning', label: 'Budget Planning', route: '/budgeting/planning' },
        { id: 'bcc-project-budget', label: 'Project Budget', route: '/budgeting/project-budget' },
        { id: 'bcc-boq', label: 'BOQ Budget', route: '/budgeting/boq-budget' },
        { id: 'bcc-allocation', label: 'Cost Allocation', route: '/budgeting/cost-allocation' },
        { id: 'bcc-approval', label: 'Budget Approval', route: '/budgeting/budget-approval' },
        { id: 'bcc-purchase-control', label: 'Purchase Budget Control', route: '/budgeting/purchase-control' },
        { id: 'bcc-expense-control', label: 'Expense Control', route: '/budgeting/expense-control' },
        { id: 'bcc-variation', label: 'Budget Variation', route: '/budgeting/budget-variation' },
        { id: 'bcc-vs-actual', label: 'Budget vs Actual', route: '/budgeting/budget-vs-actual' },
        { id: 'bcc-forecasting', label: 'Forecasting', route: '/budgeting/forecasting' },
        {
          id: 'bcc-reports-suite',
          label: 'Key Budget Reports',
          badge: '10',
          children: [
            { id: 'rep-bcc-1', label: 'Project Approved & Spent', route: '/budgeting/reports', queryParams: { type: 'project_expenditure' } },
            { id: 'rep-bcc-2', label: 'BOQ Budget vs Actual Cost', route: '/budgeting/reports', queryParams: { type: 'boq_vs_actual' } },
            { id: 'rep-bcc-3', label: 'Tower & Floor Cost Analysis', route: '/budgeting/reports', queryParams: { type: 'tower_floor_cost' } },
            { id: 'rep-bcc-4', label: 'Material & Rebar Wastage', route: '/budgeting/reports', queryParams: { type: 'material_consumption' } },
            { id: 'rep-bcc-5', label: 'Purchase Commitments & Headroom', route: '/budgeting/reports', queryParams: { type: 'purchase_commitments' } },
            { id: 'rep-bcc-6', label: 'Contractor Bill & Retention', route: '/budgeting/reports', queryParams: { type: 'contractor_retention' } },
            { id: 'rep-bcc-7', label: 'Budget Variation & Revisions', route: '/budgeting/reports', queryParams: { type: 'variation_history' } },
            { id: 'rep-bcc-8', label: 'Cost Overrun Alerts', route: '/budgeting/reports', queryParams: { type: 'overrun_alerts' } },
            { id: 'rep-bcc-9', label: 'Estimated Cost to Complete', route: '/budgeting/reports', queryParams: { type: 'cost_to_complete' } },
            { id: 'rep-bcc-10', label: 'Profitability & Cost Per SqFt', route: '/budgeting/reports', queryParams: { type: 'profitability_sqft' } }
          ]
        }
      ]
    },
    {
      id: 'fixed-assets',
      title: 'Fixed Asset Management',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      badge: '10',
      items: [
        { id: 'fa-dash', label: 'Executive Dashboard', route: '/fixed-assets/dashboard' },
        { id: 'fa-register', label: 'Asset Register', route: '/fixed-assets/asset-register' },
        { id: 'fa-depreciation', label: 'Depreciation Schedule', route: '/fixed-assets/depreciation' },
        { id: 'fa-transfers', label: 'Inter-Site Transfers', route: '/fixed-assets/transfers' },
        { id: 'fa-maintenance', label: 'Maintenance & Downtime', route: '/fixed-assets/maintenance' },
        { id: 'fa-disposals', label: 'Disposals & Gain/Loss', route: '/fixed-assets/disposals' },
        { id: 'fa-verification', label: 'Physical Verification', route: '/fixed-assets/verification' },
        { id: 'fa-reconciliation', label: 'GL Reconciliation', route: '/fixed-assets/gl-reconciliation' },
        {
          id: 'fa-reports-suite',
          label: 'Fixed Asset Reports',
          badge: '10',
          children: [
            { id: 'rep-fa-1', label: 'Asset Register & Acquisition', route: '/fixed-assets/reports', queryParams: { tab: 'asset_register' } },
            { id: 'rep-fa-2', label: 'Accumulated Depreciation & NBV', route: '/fixed-assets/reports', queryParams: { tab: 'accumulated_depreciation' } },
            { id: 'rep-fa-3', label: 'Additions & Disposals Audit', route: '/fixed-assets/reports', queryParams: { tab: 'additions_disposals' } },
            { id: 'rep-fa-4', label: 'Monthly Depreciation Schedule', route: '/fixed-assets/reports', queryParams: { tab: 'depreciation_schedule' } },
            { id: 'rep-fa-5', label: 'Maintenance & Equipment Downtime', route: '/fixed-assets/reports', queryParams: { tab: 'maintenance_downtime' } },
            { id: 'rep-fa-6', label: 'Warranty & Insurance Expiry', route: '/fixed-assets/reports', queryParams: { tab: 'warranty_insurance' } },
            { id: 'rep-fa-7', label: 'Physical Count Discrepancies', route: '/fixed-assets/reports', queryParams: { tab: 'physical_verification' } },
            { id: 'rep-fa-8', label: 'Asset Transfer History', route: '/fixed-assets/reports', queryParams: { tab: 'transfer_history' } },
            { id: 'rep-fa-9', label: 'Gain / Loss on Disposal', route: '/fixed-assets/reports', queryParams: { tab: 'gain_loss_disposal' } },
            { id: 'rep-fa-10', label: 'GL Reconciliation Statement', route: '/fixed-assets/reports', queryParams: { tab: 'gl_reconciliation' } }
          ]
        }
      ]
    },
    {
      id: 'procurement',
      title: 'Procurement & Inventory',
      iconSvg: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      badge: '15',
      items: [
        { id: 'proc-dash', label: 'Procurement Dashboard', route: '/procurement/dashboard' },
        { id: 'proc-vendor', label: 'Supplier & Vendor Management', route: '/procurement/vendors' },
        { id: 'proc-mat', label: 'Material & Item Master', route: '/procurement/materials' },
        { id: 'proc-pr', label: 'Purchase Requisitions (PR)', route: '/procurement/requisitions' },
        { id: 'proc-rfq', label: 'RFQ & Quotation Comparison', route: '/procurement/rfq-comparison' },
        { id: 'proc-po', label: 'Purchase Order (PO) Mgmt', route: '/procurement/purchase-orders' },
        { id: 'proc-grn', label: 'Goods Receipt Note (GRN)', route: '/procurement/grn' },
        { id: 'proc-qc', label: 'Quality Inspection & Gate Entry', route: '/procurement/inspections' },
        { id: 'proc-stock', label: 'Warehouse & Project-Site Stock', route: '/procurement/warehouse-stock' },
        { id: 'proc-min', label: 'Material Issue & Consumption', route: '/procurement/material-issues' },
        { id: 'proc-transfer', label: 'Stock Transfers & Adjustments', route: '/procurement/stock-transfers' },
        { id: 'proc-planning', label: 'Reorder & Material Planning', route: '/procurement/material-planning' },
        { id: 'proc-ledger', label: 'Perpetual Valuation & Ledger', route: '/procurement/inventory-ledger' },
        { id: 'proc-bills', label: 'Supplier Bills & 3-Way Match', route: '/procurement/supplier-bills' },
        { id: 'proc-audit', label: 'Audit Trail & Reports', route: '/procurement/reports-audit' }
      ]
    },
    {
      id: 'units',
      title: 'Property Inventory',
      iconSvg: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      items: [
        { id: 'inv-dashboard', label: 'Inventory Dashboard', route: '/inventory' },
        { id: 'tower-stacking', label: 'Floor Matrix & Stacking', route: '/inventory/matrix' },
        { id: 'units-matrix', label: 'Unit Directory & Specs', route: '/inventory/units' },
        { id: 'inv-pricing', label: 'Unit Pricing & Price Lists', route: '/inventory/pricing' },
        { id: 'inv-availability', label: 'Unit Availability & State Machine', route: '/inventory/availability' },
        { id: 'facilities-allocation', label: 'Parking & Facility Allocation', route: '/inventory/facilities' },
        { id: 'unit-combinations', label: 'Combination & Subdivision', route: '/inventory/combinations' },
        { id: 'property-documents', label: 'Floor Plans & Documents', route: '/inventory/documents' }
      ]
    },
    {
      id: 'crm',
      title: 'CRM & Prospects',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'crm-dashboard', label: 'CRM Dashboard', route: '/crm' },
        { id: 'lead-capture', label: 'Lead Capture', route: '/crm/lead-capture' },
        { id: 'lead-assignments', label: 'Lead Assignment', route: '/crm/lead-assignments' },
        { id: 'lead-qualification', label: 'Lead Qualification', route: '/crm/lead-qualification' },
        { id: 'leads', label: 'Leads & Pipeline', route: '/crm/leads' },
        { id: 'customers', label: 'Buyer Profiles & KYC', route: '/crm/customers' },
        { id: 'customer-requirements', label: 'Requirements & Budget Match', route: '/crm/requirements' },
        { id: 'crm-activities', label: 'Activities & Site Visits', route: '/crm/activities' },
        { id: 'crm-tasks', label: 'Follow-up Tasks & Reminders', route: '/crm/tasks' },
        { id: 'crm-communications', label: 'Communication History & Timeline', route: '/crm/communications' },
        { id: 'crm-brokers', label: 'Brokers & Referrals', route: '/crm/brokers' },
        { id: 'crm-funnel', label: 'Sales Funnel & Conversion', route: '/crm/funnel' },
        { id: 'crm-handovers', label: 'Lead-to-Booking Handover', route: '/crm/handovers' },
        { id: 'crm-campaigns', label: 'Campaigns & Marketing', route: '/crm/campaigns' },
        { id: 'customer-portal', label: 'Flat Owner Self-Service Portal', route: '/portal/customer' }
      ]
    },
    {
      id: 'sales',
      title: 'Sales & Allotments',
      iconSvg: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        { id: 'bookings', label: 'Apartment Bookings', route: '/sales/bookings' },
        { id: 'discounts', label: 'Discount Level Approvals', route: '/sales/discounts' },
        { id: 'collections', label: 'Booking & Down Payments', route: '/sales/collections' },
        { id: 'documents', label: 'Sales Agreements & Deeds', route: '/sales/documents' },
        { id: 'schedules', label: 'Installment Schedules', route: '/sales/schedules' },
        { id: 'sales-ledger', label: 'Customer Sales Ledger', route: '/sales/ledger' },
        { id: 'cancellations', label: 'Cancellations & Refunds', route: '/sales/cancellations' },
        { id: 'transfers', label: 'Property Transfers & Mutation', route: '/sales/transfers' },
        { id: 'registrations', label: 'Registration & Deed Tracking', route: '/sales/registrations' },
        { id: 'handovers', label: 'Handover & Possession', route: '/sales/handovers' },
        { id: 'property-report', label: 'Property Portfolio Report', route: '/sales/reports/property-report' },
        { id: 'brokers', label: 'Broker Commissions & TDS', route: '/brokers/commissions' }
      ]
    },
    {
      id: 'installment-collection',
      title: 'Installment & Collection',
      iconSvg: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'inst-setup', label: 'Customer Payment Setup', route: '/installments/payment-setup' },
        { id: 'inst-booking', label: 'Booking Money Management', route: '/installments/booking-money' },
        { id: 'inst-downpayment', label: 'Down Payment Management', route: '/installments/down-payment' },
        { id: 'inst-schedule', label: 'Installment Schedule', route: '/installments/schedules' },
        { id: 'inst-collections', label: 'Collection Management', route: '/installments/collections' },
        { id: 'inst-due-overdue', label: 'Due & Overdue Management', route: '/installments/due-overdue' },
        { id: 'inst-late-fee', label: 'Late Fee & Rebate', route: '/installments/late-fee-rebate' },
        { id: 'inst-reschedule', label: 'Payment Rescheduling', route: '/installments/rescheduling' },
        { id: 'inst-cheques', label: 'Cheque Management & PDC', route: '/installments/cheques' },
        { id: 'inst-ledger', label: 'Customer Ledger', route: '/installments/customer-ledger' },
        { id: 'inst-refund', label: 'Refund & Adjustment', route: '/installments/refund-adjustment' },
        {
          id: 'inst-reports-suite',
          label: 'Installment & Collection Reports',
          badge: '7',
          children: [
            { id: 'rep-inst-cockpit', label: 'Executive Cockpit & Forecast (12)', route: '/installments/reports-dashboard' },
            { id: 'rep-inst-collections', label: 'Collection Summary Report', route: '/installments/collections' },
            { id: 'rep-inst-overdue', label: 'Overdue Recovery & Aging', route: '/installments/due-overdue' },
            { id: 'rep-inst-ledger', label: 'Customer Outstanding Ledger', route: '/installments/customer-ledger' },
            { id: 'rep-inst-plan-audit', label: 'Payment Plan Audit Report', route: '/installments/payment-setup' },
            { id: 'rep-inst-pdc', label: 'PDC Safe & Bounced Cheques', route: '/installments/cheques' },
            { id: 'rep-inst-downpayment', label: 'Down Payment Realization', route: '/installments/down-payment' }
          ]
        }
      ]
    },
    {
      id: 'accounts',
      title: 'Finance & Accounts',
      iconSvg: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      items: [
        { id: 'fin-dashboard', label: 'Financial Executive Dashboard', route: '/accounts/financial-dashboard' },
        { id: 'coa', label: 'Chart of Accounts', route: '/accounts/coa' },
        { id: 'vouchers', label: 'General Ledger Vouchers', route: '/accounts/vouchers' },
        { id: 'ledger-inquiry', label: 'Ledger Inquiry & Statements', route: '/accounts/ledger' },
        {
          id: 'payables-menu',
          label: 'Accounts Payable (AP)',
          children: [
            { id: 'ap-bills', label: 'Accounts Payable (AP)', route: '/accounts/payables' },
            { id: 'ap-ledger', label: 'Supplier Ledger & Aging', route: '/accounts/payables/ledger' }
          ]
        },
        {
          id: 'receivables-menu',
          label: 'Accounts Receivable (AR)',
          children: [
            { id: 'ar-demands', label: 'Accounts Receivable (AR)', route: '/accounts/receivables' },
            { id: 'ar-receipts', label: 'Receipts & Allocations', route: '/accounts/receivables/receipts' },
            { id: 'ar-ledger', label: 'Customer Ledger & Aging', route: '/accounts/receivables/ledger' }
          ]
        },
        {
          id: 'cash-bank-menu',
          label: 'Cash & Bank Management',
          children: [
            { id: 'cb-overview', label: 'Overview Cockpit', route: '/accounts/cash-bank', queryParams: { tab: 'overview' } },
            { id: 'cb-cash', label: 'Cash Management', route: '/accounts/cash-bank', queryParams: { tab: 'cash' } },
            { id: 'cb-bank', label: 'Bank Accounts & Cheques', route: '/accounts/cash-bank', queryParams: { tab: 'bank' } },
            { id: 'cb-mfs', label: 'Mobile Financial Services (MFS)', route: '/accounts/cash-bank', queryParams: { tab: 'mfs' } }
          ]
        },
        { id: 'payment-vouchers', label: 'Payment Vouchers Workflow', route: '/accounts/payment-vouchers' },
        { id: 'bank-recon-wizard', label: 'Bank Reconciliation & BRS', route: '/accounts/bank-reconciliation' },
        {
          id: 'construction-cwip-menu',
          label: 'Construction Cost & CWIP',
          children: [
            { id: 'cwip-allocations', label: 'Cost Allocations', route: '/accounts/construction-cwip', exact: true },
            { id: 'cwip-materials', label: 'Material Issues to CWIP', route: '/accounts/construction-cwip/material-issues' },
            { id: 'cwip-budget', label: 'Budget vs Actual & Forecasts', route: '/accounts/construction-cwip/budget-tracking' }
          ]
        },
        {
          id: 'cust-advances-menu',
          label: 'Customer Advances',
          children: [
            { id: 'adv-receipts', label: 'Advance Receipts', route: '/accounts/customer-advances', exact: true },
            { id: 'adv-liability', label: 'Liability Ledger', route: '/accounts/customer-advances/liability-ledger' },
            { id: 'adv-allocations', label: 'Installment Allocations', route: '/accounts/customer-advances/allocations' },
            { id: 'adv-adjustments', label: 'Late Charges & Waivers', route: '/accounts/customer-advances/adjustments' },
            { id: 'adv-refunds', label: 'Cancellations & Refunds', route: '/accounts/customer-advances/refunds' },
            { id: 'adv-aging', label: 'Aging Reconciliation', route: '/accounts/customer-advances/aging' }
          ]
        },
        {
          id: 'loans-financing-menu',
          label: 'Loans & Financing',
          children: [
            { id: 'loan-facilities', label: 'Facilities Portfolio', route: '/accounts/loans-financing', exact: true },
            { id: 'loan-disbursements', label: 'Disbursements & Vouchers', route: '/accounts/loans-financing/disbursements' },
            { id: 'loan-repayments', label: 'Repayments & Waterfall', route: '/accounts/loans-financing/repayments' },
            { id: 'loan-interest-cwip', label: 'Interest Accruals & IAS 23 CWIP', route: '/accounts/loans-financing/interest-cwip' }
          ]
        },
        { id: 'pdc-kanban', label: 'PDC Vault', route: '/accounts/pdc-kanban' },
        {
          id: 'financial-reports-suite',
          label: 'Financial & Audit Reports',
          badge: '15',
          children: [
            { id: 'rep-gl', label: 'General Ledger', route: '/accounts/financial-reports', queryParams: { tab: 'gl' } },
            { id: 'rep-cashbook', label: 'Cash & Bank Book', route: '/accounts/financial-reports', queryParams: { tab: 'cashbook' } },
            { id: 'rep-ap-aging', label: 'AP Aging (Payables)', route: '/accounts/financial-reports', queryParams: { tab: 'ap-aging' } },
            { id: 'rep-ar-aging', label: 'AR Aging (Receivables)', route: '/accounts/financial-reports', queryParams: { tab: 'ar-aging' } },
            { id: 'rep-advances', label: 'Customer Advances', route: '/accounts/financial-reports', queryParams: { tab: 'advances' } },
            { id: 'rep-project-pnl', label: 'Project Income & Expenditure', route: '/accounts/financial-reports', queryParams: { tab: 'project-pnl' } },
            { id: 'rep-cost-to-complete', label: 'Project Cost-to-Complete', route: '/accounts/financial-reports', queryParams: { tab: 'cost-to-complete' } },
            { id: 'rep-cwip', label: 'Construction WIP Statement', route: '/accounts/financial-reports', queryParams: { tab: 'cwip' } },
            { id: 'rep-loan-schedule', label: 'Loan & Interest Schedule', route: '/accounts/financial-reports', queryParams: { tab: 'loan-schedule' } },
            { id: 'rep-brs', label: 'Bank Reconciliation (BRS)', route: '/accounts/financial-reports', queryParams: { tab: 'brs' } },
            { id: 'rep-party-statement', label: 'Party Statements', route: '/accounts/financial-reports', queryParams: { tab: 'party-statement' } },
            { id: 'rep-budget-variance', label: 'Budget vs Actual Variance', route: '/accounts/financial-reports', queryParams: { tab: 'budget-variance' } },
            { id: 'rep-voucher-register', label: 'Journal & Voucher Register', route: '/accounts/financial-reports', queryParams: { tab: 'voucher-register' } },
            { id: 'rep-closing-checklist', label: 'Period Closing Checklist', route: '/accounts/financial-reports', queryParams: { tab: 'closing-checklist' } },
            { id: 'rep-audit-trail', label: 'Audit Trail & Approvals', route: '/accounts/financial-reports', queryParams: { tab: 'audit-trail' } }
          ]
        }
      ]
    },
    {
      id: 'tax',
      title: 'NBR Tax & Statutory VAT',
      iconSvg: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        { id: 'tax-cockpit', label: 'NBR Tax & VAT Cockpit', route: '/tax/cockpit' },
        { id: 'tax-mushak63', label: 'Mushak 6.3 VAT Invoices', route: '/tax/cockpit' },
        { id: 'tax-mushak65', label: 'Mushak 6.5 Transfer Challan', route: '/tax/cockpit' },
        { id: 'tax-tds', label: 'TDS & VDS Withholding Register', route: '/tax/cockpit' },
        { id: 'tax-53ff', label: 'Section 53FF AIT Calculator', route: '/tax/cockpit' }
      ]
    },
    {
      id: 'hrms-suite',
      title: 'Human Resources',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      badge: '16',
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
    // Menus remain off/closed by default until explicitly clicked by user
  }

  setSuite(suite: 'hrms' | 'erp'): void {
    this.activeSuite.set(suite);
    this.expandedGroupIds.set(new Set<string>());
    this.expandedSubItemIds.set(new Set<string>());
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
      current.delete(groupId); // Closes current menu
    } else {
      current.clear(); // Accordion mode: closes other menus so only clicked menu is ON
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
