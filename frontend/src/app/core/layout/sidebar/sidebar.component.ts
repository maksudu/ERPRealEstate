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
  expandedSubGroupIds = signal<Set<string>>(new Set<string>());
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
        { id: 'org-job-grade', label: 'Salary Grades & Structures', route: '/hrms/payroll/structures' },
        { id: 'org-cost-center', label: 'Cost Center', route: '/hrms/org/cost-centers' }
      ]
    },
    {
      id: 'hr-employee-mgmt',
      title: 'Employee Management',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'emp-list', label: 'Employee List', route: '/hrms/employees/list' },
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
        { id: 'att-logs', label: 'Attendance Logs', route: '/hrms/attendance/logs' },
        { id: 'att-biometric', label: 'Biometric Integration', route: '/hrms/attendance/biometric' },
        { id: 'att-mobile', label: 'Mobile Check-in', route: '/hrms/attendance/mobile-checkin' },
        { id: 'att-missing-punch', label: 'Missing Punch', route: '/hrms/attendance/missing-punches' },
        { id: 'att-calendar', label: 'Holiday Calendar', route: '/hrms/attendance/holiday-calendar' },
        {
          id: 'att-reports-sub',
          label: 'Attendance Reports',
          children: [
            { id: 'att-rep-daily', label: 'Daily Attendance Report', route: '/hrms/reports/attendance-daily' },
            { id: 'att-rep-monthly', label: 'Monthly Attendance Summary', route: '/hrms/reports/attendance-monthly-summary' },
            { id: 'att-rep-history', label: 'Employee Attendance History', route: '/hrms/reports/attendance-history' },
            { id: 'att-rep-late', label: 'Late Arrival Report', route: '/hrms/reports/attendance-late-arrival' },
            { id: 'att-rep-early', label: 'Early Departure Report', route: '/hrms/reports/attendance-early-departure' },
            { id: 'att-rep-absent', label: 'Absenteeism Report', route: '/hrms/reports/attendance-absenteeism' },
            { id: 'att-rep-missing', label: 'Missing Punch Report', route: '/hrms/reports/attendance-missing-punch' },
            { id: 'att-rep-ot', label: 'Overtime Report', route: '/hrms/reports/attendance-overtime' },
            { id: 'att-rep-shift', label: 'Shift-wise Attendance', route: '/hrms/reports/attendance-shift-wise' },
            { id: 'att-rep-bio', label: 'Biometric Attendance Report', route: '/hrms/reports/attendance-biometric' },
            { id: 'att-rep-gps', label: 'Mobile/GPS Attendance Report', route: '/hrms/reports/attendance-mobile-gps' },
            { id: 'att-rep-corr', label: 'Attendance Correction Report', route: '/hrms/reports/attendance-correction' },
            { id: 'att-rep-site', label: 'Site-wise Attendance', route: '/hrms/reports/attendance-site-wise' },
            { id: 'att-rep-exc', label: 'Attendance Exception Report', route: '/hrms/reports/attendance-exception' }
          ]
        }
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
        { id: 'leave-holiday', label: 'Holiday Calendar', route: '/hrms/attendance/holiday-calendar' },
        {
          id: 'leave-reports-sub',
          label: 'Leave Reports',
          children: [
            { id: 'leave-rep-reg', label: 'Leave Application Register', route: '/hrms/reports/leave-register' },
            { id: 'leave-rep-app', label: 'Approved Leave Report', route: '/hrms/reports/leave-approved' },
            { id: 'leave-rep-pen', label: 'Pending Leave Report', route: '/hrms/reports/leave-pending' },
            { id: 'leave-rep-bal', label: 'Leave Balance Report', route: '/hrms/reports/leave-balance' },
            { id: 'leave-rep-type', label: 'Leave Type Summary', route: '/hrms/reports/leave-type-summary' },
            { id: 'leave-rep-hist', label: 'Employee Leave History', route: '/hrms/reports/leave-history' },
            { id: 'leave-rep-dept', label: 'Department-wise Leave Report', route: '/hrms/reports/leave-department-wise' },
            { id: 'leave-rep-proj', label: 'Project-wise Leave Report', route: '/hrms/reports/leave-project-wise' },
            { id: 'leave-rep-unpaid', label: 'Unpaid Leave Report', route: '/hrms/reports/leave-unpaid' },
            { id: 'leave-rep-encash', label: 'Leave Encashment Report', route: '/hrms/reports/leave-encashment' },
            { id: 'leave-rep-cancel', label: 'Leave Cancellation Report', route: '/hrms/reports/leave-cancellation' },
            { id: 'leave-rep-trend', label: 'Leave Trend Analysis', route: '/hrms/reports/leave-trend-analysis' }
          ]
        }
      ]
    },
    {
      id: 'hr-payroll',
      title: 'Payroll Management',
      iconSvg: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      items: [
        { id: 'pay-structure', label: 'Salary Structures & Grades', route: '/hrms/payroll/structures' },
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
        { id: 'pay-reversal', label: 'Payroll Reversal', route: '/hrms/payroll/reversals' },
        {
          id: 'payroll-reports-sub',
          label: 'Payroll Reports',
          children: [
            { id: 'pay-rep-reg', label: 'Monthly Payroll Register', route: '/hrms/reports/payroll-register' },
            { id: 'pay-rep-sheet', label: 'Salary Sheet', route: '/hrms/reports/salary-sheet' },
            { id: 'pay-rep-slip', label: 'Payslip Register', route: '/hrms/reports/payslip-register' },
            { id: 'pay-rep-bank', label: 'Bank Salary Transfer Report', route: '/hrms/reports/bank-disbursement' },
            { id: 'pay-rep-sum', label: 'Payroll Summary', route: '/hrms/reports/payroll-summary' },
            { id: 'pay-rep-dept', label: 'Department-wise Payroll', route: '/hrms/reports/payroll-department-wise' },
            { id: 'pay-rep-proj', label: 'Project-wise Payroll Cost', route: '/hrms/reports/payroll-project-cost' },
            { id: 'pay-rep-comp', label: 'Salary Component Report', route: '/hrms/reports/payroll-salary-component' },
            { id: 'pay-rep-ot', label: 'Overtime Payment Report', route: '/hrms/reports/payroll-overtime-payment' },
            { id: 'pay-rep-bonus', label: 'Bonus Report', route: '/hrms/reports/payroll-bonus' },
            { id: 'pay-rep-arr', label: 'Arrears Report', route: '/hrms/reports/payroll-arrears' },
            { id: 'pay-rep-ded', label: 'Deduction Report', route: '/hrms/reports/payroll-deduction' },
            { id: 'pay-rep-rec', label: 'Employee Loan Recovery', route: '/hrms/reports/payroll-loan-recovery' },
            { id: 'pay-rep-inc', label: 'Salary Increment Report', route: '/hrms/reports/payroll-salary-increment' },
            { id: 'pay-rep-settle', label: 'Final Settlement Report', route: '/hrms/reports/payroll-final-settlement' },
            { id: 'pay-rep-var', label: 'Payroll Variance Report', route: '/hrms/reports/payroll-variance' },
            { id: 'pay-rep-recon', label: 'Payroll Reconciliation Report', route: '/hrms/reports/payroll-reconciliation' }
          ]
        }
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
        { id: 'wf-attendance', label: 'Attendance Approval', route: '/hrms/workflow/attendance' },
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
        { id: 'stat-audit-docs', label: 'Audit Documents', route: '/hrms/statutory/audit-documents' }
      ]
    },
    {
      id: 'hr-project-alloc',
      title: 'Project Wise',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'proj-emp-assign', label: 'Employee Assignment', route: '/hrms/project-hr/assignments' },
        { id: 'proj-staff-roster', label: 'Staff Roster', route: '/hrms/project-hr/rosters' },
        { id: 'proj-labour-alloc', label: 'Labour Allocation', route: '/hrms/project-hr/labour-allocation' },
        { id: 'proj-timesheets', label: 'Timesheets', route: '/hrms/project-hr/timesheets' },
        { id: 'proj-overtime', label: 'Overtime', route: '/hrms/project-hr/overtime' },
        { id: 'proj-shared-alloc', label: 'Employee Allocation', route: '/hrms/project-hr/shared-allocation' },
        { id: 'proj-payroll-cost', label: 'Payroll Cost', route: '/hrms/project-hr/payroll-costs' },
        { id: 'proj-dept-cost', label: 'Department Cost Allocation', route: '/hrms/project-hr/dept-costs' },
        {
          id: 'labour-reports-sub',
          label: 'Project Labour Cost Reports',
          children: [
            { id: 'lab-rep-sal', label: 'Project Salary Allocation', route: '/hrms/reports/labour-project-salary' },
            { id: 'lab-rep-tower', label: 'Tower & Site Labour Cost', route: '/hrms/reports/labour-tower-site' },
            { id: 'lab-rep-wbs', label: 'WBS/Activity Labour Expenses', route: '/hrms/reports/labour-wbs-activity' },
            { id: 'lab-rep-dir', label: 'Direct vs Shared Staff Costs', route: '/hrms/reports/labour-direct-vs-shared' },
            { id: 'lab-rep-time', label: 'Timesheet & Approved Hours', route: '/hrms/reports/labour-timesheet-hours' },
            { id: 'lab-rep-ot', label: 'Overtime Expenditure', route: '/hrms/reports/labour-overtime-project' },
            { id: 'lab-rep-bud', label: 'Budgeted vs Actual Cost', route: '/hrms/reports/labour-budget-vs-actual' },
            { id: 'lab-rep-trend', label: 'Monthly Labour Cost Trend', route: '/hrms/reports/labour-monthly-trend' },
            { id: 'lab-rep-exc', label: 'Cost Allocation Exceptions', route: '/hrms/reports/labour-cost-exceptions' },
            { id: 'lab-rep-multi', label: 'Multi-Project Cost Distribution', route: '/hrms/reports/labour-multi-project-distribution' }
          ]
        }
      ]
    },
    {
      id: 'hr-reports',
      title: 'HR Reports & Analytics',
      iconSvg: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        {
          id: 'hr-sub-hr-reports',
          label: 'HR Reports',
          children: [
            { id: 'rpt-emp-master', label: 'Employee Master Report', route: '/hrms/reports/employee-master' },
            { id: 'rpt-emp-directory', label: 'Employee Directory', route: '/hrms/reports/employee-directory' },
            { id: 'rpt-emp-headcount', label: 'Employee Headcount', route: '/hrms/reports/employee-headcount' },
            { id: 'rpt-new-joining', label: 'New Joining Report', route: '/hrms/reports/new-joining' },
            { id: 'rpt-separation', label: 'Resignation & Separation', route: '/hrms/reports/resignation-separation' },
            { id: 'rpt-transfer', label: 'Employee Transfer Report', route: '/hrms/reports/employee-transfer' },
            { id: 'rpt-promotion-increment', label: 'Promotion & Increment Report', route: '/hrms/reports/promotion-increment' },
            { id: 'rpt-document-expiry', label: 'Employee Document Expiry', route: '/hrms/reports/document-expiry' },
            { id: 'rpt-recruitment', label: 'Recruitment Report', route: '/hrms/reports/recruitment' },
            { id: 'rpt-turnover', label: 'Employee Turnover Report', route: '/hrms/reports/employee-turnover' },
            { id: 'rpt-manpower', label: 'Manpower Allocation Report', route: '/hrms/reports/manpower-allocation' },
            { id: 'rpt-loan-advance', label: 'Employee Loan & Advance Report', route: '/hrms/reports/employee-loan-advance' }
          ]
        },
        {
          id: 'hr-sub-att-reports',
          label: 'Attendance Reports',
          children: [
            { id: 'rpt-att-daily', label: 'Daily Attendance Report', route: '/hrms/reports/attendance-daily' },
            { id: 'rpt-att-monthly', label: 'Monthly Attendance Summary', route: '/hrms/reports/attendance-monthly-summary' },
            { id: 'rpt-att-history', label: 'Employee Attendance History', route: '/hrms/reports/attendance-history' },
            { id: 'rpt-att-late', label: 'Late Arrival Report', route: '/hrms/reports/attendance-late-arrival' },
            { id: 'rpt-att-early', label: 'Early Departure Report', route: '/hrms/reports/attendance-early-departure' },
            { id: 'rpt-att-absent', label: 'Absenteeism Report', route: '/hrms/reports/attendance-absenteeism' },
            { id: 'rpt-att-missing', label: 'Missing Punch Report', route: '/hrms/reports/attendance-missing-punch' },
            { id: 'rpt-att-ot', label: 'Overtime Report', route: '/hrms/reports/attendance-overtime' },
            { id: 'rpt-att-shift', label: 'Shift-wise Attendance', route: '/hrms/reports/attendance-shift-wise' },
            { id: 'rpt-att-bio', label: 'Biometric Attendance Report', route: '/hrms/reports/attendance-biometric' },
            { id: 'rpt-att-gps', label: 'Mobile/GPS Attendance Report', route: '/hrms/reports/attendance-mobile-gps' },
            { id: 'rpt-att-corr', label: 'Attendance Correction Report', route: '/hrms/reports/attendance-correction' },
            { id: 'rpt-att-site', label: 'Site-wise Attendance', route: '/hrms/reports/attendance-site-wise' },
            { id: 'rpt-att-exc', label: 'Attendance Exception Report', route: '/hrms/reports/attendance-exception' }
          ]
        },
        {
          id: 'hr-sub-leave-reports',
          label: 'Leave Reports',
          children: [
            { id: 'rpt-leave-reg', label: 'Leave Application Register', route: '/hrms/reports/leave-register' },
            { id: 'rpt-leave-app', label: 'Approved Leave Report', route: '/hrms/reports/leave-approved' },
            { id: 'rpt-leave-pen', label: 'Pending Leave Report', route: '/hrms/reports/leave-pending' },
            { id: 'rpt-leave-bal', label: 'Leave Balance Report', route: '/hrms/reports/leave-balance' },
            { id: 'rpt-leave-type', label: 'Leave Type Summary', route: '/hrms/reports/leave-type-summary' },
            { id: 'rpt-leave-hist', label: 'Employee Leave History', route: '/hrms/reports/leave-history' },
            { id: 'rpt-leave-dept', label: 'Department-wise Leave Report', route: '/hrms/reports/leave-department-wise' },
            { id: 'rpt-leave-proj', label: 'Project-wise Leave Report', route: '/hrms/reports/leave-project-wise' },
            { id: 'rpt-leave-unpaid', label: 'Unpaid Leave Report', route: '/hrms/reports/leave-unpaid' },
            { id: 'rpt-leave-encash', label: 'Leave Encashment Report', route: '/hrms/reports/leave-encashment' },
            { id: 'rpt-leave-cancel', label: 'Leave Cancellation Report', route: '/hrms/reports/leave-cancellation' },
            { id: 'rpt-leave-trend', label: 'Leave Trend Analysis', route: '/hrms/reports/leave-trend-analysis' }
          ]
        },
        {
          id: 'hr-sub-payroll-reports',
          label: 'Payroll Reports',
          children: [
            { id: 'rpt-pay-reg', label: 'Monthly Payroll Register', route: '/hrms/reports/payroll-register' },
            { id: 'rpt-pay-sheet', label: 'Salary Sheet', route: '/hrms/reports/salary-sheet' },
            { id: 'rpt-pay-slip', label: 'Payslip Register', route: '/hrms/reports/payslip-register' },
            { id: 'rpt-pay-bank', label: 'Bank Salary Transfer Report', route: '/hrms/reports/bank-disbursement' },
            { id: 'rpt-pay-sum', label: 'Payroll Summary', route: '/hrms/reports/payroll-summary' },
            { id: 'rpt-pay-dept', label: 'Department-wise Payroll', route: '/hrms/reports/payroll-department-wise' },
            { id: 'rpt-pay-proj', label: 'Project-wise Payroll Cost', route: '/hrms/reports/payroll-project-cost' },
            { id: 'rpt-pay-comp', label: 'Salary Component Report', route: '/hrms/reports/payroll-salary-component' },
            { id: 'rpt-pay-ot', label: 'Overtime Payment Report', route: '/hrms/reports/payroll-overtime-payment' },
            { id: 'rpt-pay-bonus', label: 'Bonus Report', route: '/hrms/reports/payroll-bonus' },
            { id: 'rpt-pay-arr', label: 'Arrears Report', route: '/hrms/reports/payroll-arrears' },
            { id: 'rpt-pay-ded', label: 'Deduction Report', route: '/hrms/reports/payroll-deduction' },
            { id: 'rpt-pay-rec', label: 'Employee Loan Recovery', route: '/hrms/reports/payroll-loan-recovery' },
            { id: 'rpt-pay-inc', label: 'Salary Increment Report', route: '/hrms/reports/payroll-salary-increment' },
            { id: 'rpt-pay-settle', label: 'Final Settlement Report', route: '/hrms/reports/payroll-final-settlement' },
            { id: 'rpt-pay-var', label: 'Payroll Variance Report', route: '/hrms/reports/payroll-variance' },
            { id: 'rpt-pay-recon', label: 'Payroll Reconciliation Report', route: '/hrms/reports/payroll-reconciliation' }
          ]
        },
        {
          id: 'hr-sub-labour-reports',
          label: 'Project Labour Cost',
          children: [
            { id: 'rpt-lab-sal', label: 'Project Salary Allocation', route: '/hrms/reports/labour-project-salary' },
            { id: 'rpt-lab-tower', label: 'Tower & Site Labour Cost', route: '/hrms/reports/labour-tower-site' },
            { id: 'rpt-lab-wbs', label: 'WBS/Activity Labour Expenses', route: '/hrms/reports/labour-wbs-activity' },
            { id: 'rpt-lab-dir', label: 'Direct vs Shared Staff Costs', route: '/hrms/reports/labour-direct-vs-shared' },
            { id: 'rpt-lab-time', label: 'Timesheet & Approved Hours', route: '/hrms/reports/labour-timesheet-hours' },
            { id: 'rpt-lab-ot', label: 'Overtime Expenditure', route: '/hrms/reports/labour-overtime-project' },
            { id: 'rpt-lab-bud', label: 'Budgeted vs Actual Cost', route: '/hrms/reports/labour-budget-vs-actual' },
            { id: 'rpt-lab-trend', label: 'Monthly Labour Cost Trend', route: '/hrms/reports/labour-monthly-trend' },
            { id: 'rpt-lab-exc', label: 'Cost Allocation Exceptions', route: '/hrms/reports/labour-cost-exceptions' },
            { id: 'rpt-lab-multi', label: 'Multi-Project Cost Distribution', route: '/hrms/reports/labour-multi-project-distribution' }
          ]
        }
      ]
    },
  ];

  // =========================================================================
  // Real Estate Operations & Core ERP Menu Groups
  // =========================================================================
  erpMenuGroups: MenuGroup[] = [
    {
      id: 'bi',
      title: 'Executive Strategy',
      iconSvg: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      items: [
        { id: 'bi-cockpit', label: 'Executive', route: '/bi/cockpit' },
        { id: 'bi-runway', label: 'Cash Runway', route: '/bi/runway' },
        { id: 'bi-evm', label: 'Project', route: '/bi/evm' },
        { id: 'bi-heatmap', label: 'Overdue Collections', route: '/bi/heatmap' }
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      iconSvg: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      items: [
        { id: 'governance', label: 'Maker-Checker Approval', route: '/governance/approvals' },
        { id: 'lookups', label: 'Lookups', route: '/settings/lookups' },
        { id: 'equipment', label: 'Machinery & Equipment', route: '/settings/equipment' },
        { id: 'migration', label: 'Data Import', route: '/settings/data-import' }
      ]
    },
    {
      id: 'security-management',
      title: 'User Management',
      iconSvg: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      items: [
        { id: 'sec-cockpit', label: 'Security', route: '/security/dashboard' },
        { id: 'sec-users', label: 'Users', route: '/security/users' },
        { id: 'sec-roles', label: 'Roles', route: '/security/roles' },
        { id: 'sec-permissions', label: 'Permissions', route: '/security/permissions' },
        { id: 'sec-scopes', label: 'Project Access', route: '/security/project-access' },
        { id: 'sec-workflow', label: 'Maker-Checker', route: '/security/workflow-security' },
        { id: 'sec-auth-policies', label: 'Authentication', route: '/security/auth-security' },
        { id: 'sec-api-mobile', label: 'API Keys', route: '/security/api-mobile-security' },
        {
          id: 'sec-audit-suite',
          label: 'Audit & Sessions',
          children: [
            { id: 'sec-audit-trails', label: 'Audit Trail Logs', route: '/security/audit-logs', queryParams: { tab: 'audit_trail' } },
            { id: 'sec-active-sessions', label: 'Active User Sessions', route: '/security/audit-logs', queryParams: { tab: 'active_sessions' } }
          ]
        },
        {
          id: 'sec-monitoring-suite',
          label: 'Monitoring & Reviews',
          children: [
            { id: 'sec-threat-incidents', label: 'Threat Incidents', route: '/security/monitoring-reviews', queryParams: { tab: 'threat_incidents' } },
            { id: 'sec-access-reviews', label: 'Access Reviews', route: '/security/monitoring-reviews', queryParams: { tab: 'access_reviews' } },
            { id: 'sec-privacy-dr', label: 'Privacy & DR Rules', route: '/security/monitoring-reviews', queryParams: { tab: 'privacy_rules' } }
          ]
        },
        {
          id: 'sec-reports-suite',
          label: 'Security Reports',
          children: [
            { id: 'rep-sec-matrix', label: 'Access Matrix', route: '/security/reports', queryParams: { tab: 'user_access_matrix' } },
            { id: 'rep-sec-priv', label: 'Privileged Access', route: '/security/privileged-accounts' },
            { id: 'rep-sec-threats', label: 'Threat Analytics', route: '/security/threat-analytics' }
          ]
        }
      ]
    },
    {
      id: 'legal-compliance',
      title: 'Legal Statutory',
      iconSvg: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
      items: [
        { id: 'leg-dashboard', label: 'Legal', route: '/legal/dashboard' },
        { id: 'leg-deeds', label: 'Deeds & Mutation', route: '/legal/records/registered_record' },
        { id: 'leg-developer-reg', label: 'Developer Licences', route: '/legal/records/developer_registration' },
        { id: 'leg-land-clearances', label: 'Building Approvals', route: '/legal/records/land_use_clearance' },
        { id: 'leg-conditions', label: 'Approval Conditions', route: '/legal/records/approval_condition' },
        { id: 'leg-noc', label: 'NOCs & Authority', route: '/legal/records/noc_correspondence' },
        { id: 'leg-agreements', label: 'Agreements', route: '/legal/records/sale_transfer' },
        { id: 'leg-litigation', label: 'Litigation', route: '/legal/records/litigation_notice' },
        { id: 'leg-vault', label: 'Document', route: '/legal/records/document_archive' },
        { id: 'leg-calendar', label: 'Compliance', route: '/legal/records/calendar_reminder' },
        { id: 'leg-workflows', label: 'Maker-Checker Approvals', route: '/legal/records/approval_workflow' },
        { id: 'leg-reports', label: 'Reports', route: '/legal/records/compliance_report' },
        { id: 'leg-audit', label: 'Audit Trail', route: '/legal/audit' },
        { id: 'leg-statutory-vault', label: 'Statutory Permits', route: '/legal/compliance-vault' }
      ]
    },
    {
      id: 'land',
      title: 'Land Acquisition',
      iconSvg: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
      items: [
        { id: 'land-dashboard', label: 'Dashboard', route: '/land/dashboard' },
        { id: 'landowners-registry', label: 'Landowners', route: '/land/landowners' },
        { id: 'land-proposals', label: 'Land Acquisition', route: '/land/proposals' },
        { id: 'land-parcels', label: 'Land Registry', route: '/land/parcels' },
        { id: 'land-conversions', label: 'Area', route: '/land/conversions' },
        { id: 'joint-ownership', label: 'Joint Agreements', route: '/land/joint-ownership' },
        { id: 'due-diligence', label: 'Due Diligence', route: '/land/due-diligence' },
        { id: 'valuation-costing', label: 'Valuation', route: '/land/valuation-costing' },
        { id: 'negotiation-agreements', label: 'Negotiation', route: '/land/negotiation' },
        { id: 'payment-schedules', label: 'Payment Schedules', route: '/land/payment-schedules' },
        { id: 'khatian', label: 'Historic Surveys (CS/SA/RS/BS)', route: '/land/surveys' },
        { id: 'joint-venture', label: 'JV Agreements & Allocation', route: '/land/jv-agreements' },
        {
          id: 'land-reports-sub',
          label: 'Land Bank Reports',
          children: [
            { id: 'rep-1', label: 'Land Bank Register', route: '/land/reports', queryParams: { type: 'land-bank-register' } },
            { id: 'rep-2', label: 'Proposed & Acquired Land', route: '/land/reports', queryParams: { type: 'proposed-acquired-land' } },
            { id: 'rep-3', label: 'Landowner & Joint-Owner', route: '/land/reports', queryParams: { type: 'landowner-joint-owner' } },
            { id: 'rep-4', label: 'Mouza, Khatian & Dag', route: '/land/reports', queryParams: { type: 'mouza-khatian-dag' } },
            { id: 'rep-5', label: 'Deed & Mutation Status', route: '/land/reports', queryParams: { type: 'deed-mutation-status' } },
            { id: 'rep-6', label: 'Area Reconciliation', route: '/land/reports', queryParams: { type: 'land-area-reconciliation' } },
            { id: 'rep-7', label: 'Valuation & Cost', route: '/land/reports', queryParams: { type: 'valuation-acquisition-cost' } },
            { id: 'rep-8', label: 'Owner Payment & Due', route: '/land/reports', queryParams: { type: 'owner-payment-outstanding' } },
            { id: 'rep-9', label: 'JV Entitlement & Agreement', route: '/land/reports', queryParams: { type: 'jv-entitlement-agreement' } },
            { id: 'rep-10', label: 'Legal Risk & Litigation', route: '/land/reports', queryParams: { type: 'legal-risk-litigation' } },
            { id: 'rep-11', label: 'Missing Docs & Compliance', route: '/land/reports', queryParams: { type: 'missing-docs-compliance' } },
            { id: 'rep-12', label: 'Future Projects Available', route: '/land/reports', queryParams: { type: 'future-projects-available' } },
            { id: 'rep-13', label: 'Project Land Allocation', route: '/land/reports', queryParams: { type: 'project-land-allocation' } },
            { id: 'rep-14', label: 'Budget vs Actual', route: '/land/reports', queryParams: { type: 'budget-vs-actual' } }
          ]
        }
      ]
    },
    {
      id: 'projects',
      title: 'Project Development',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'prj-search', label: 'Project Search', route: '/projects/search' },
        { id: 'prj-master', label: 'Master Setup', route: '/projects/master' },
        { id: 'prj-feasibility', label: 'Feasibility', route: '/projects/feasibility' },
        { id: 'prj-land-alloc', label: 'Land Allocation', route: '/projects/land-allocation' },
        { id: 'prj-building-setup', label: 'Building Setup', route: '/projects/towers-units' },
        { id: 'prj-budget-planning', label: 'Budget & Cost Planning', route: '/budgeting/planning' },
        { id: 'prj-profitability-roi', label: 'Profitability & ROI', route: '/projects/profitability-roi' },
        { id: 'prj-timeline-milestones', label: 'Timeline & Milestones', route: '/projects/timeline-milestones' },
        { id: 'prj-regulatory-approvals', label: 'Regulatory Approvals & Compliance', route: '/projects/regulatory-approvals' },
        { id: 'prj-drawings-docs', label: 'Drawings & Documents', route: '/projects/drawings-documents' },
        { id: 'prj-construction-monitoring', label: 'Construction Progress', route: '/projects/construction-monitoring' },
        { id: 'prj-risk-issues', label: 'Risk & Issue Management', route: '/projects/risk-issues' },
        { id: 'prj-change-orders', label: 'Change Orders', route: '/projects/change-orders' },
        { id: 'prj-fin-perf', label: 'Financial Performance', route: '/projects/financial-performance' },
        { id: 'prj-handover-closure', label: 'Handover', route: '/projects/handover-closure' },
        {
          id: 'prj-reports-dash',
          label: 'Project Reports',
          children: [
            { id: 'prj-rep-1', label: 'Project Statement', route: '/projects/reports-dashboard', queryParams: { type: 'pnl-summary' } },
            { id: 'prj-rep-2', label: 'Budget Actual', route: '/projects/reports-dashboard', queryParams: { type: 'budget-vs-actual' } },
            { id: 'prj-rep-3', label: 'Revenue Collections', route: '/projects/reports-dashboard', queryParams: { type: 'revenue-vs-collections' } },
            { id: 'prj-rep-4', label: 'Direct Cost Overheads', route: '/projects/reports-dashboard', queryParams: { type: 'direct-cost-breakdown' } },
            { id: 'prj-rep-5', label: 'Committed Cost EAC', route: '/projects/reports-dashboard', queryParams: { type: 'committed-vs-forecast' } },
            { id: 'prj-rep-6', label: 'Margin Return Metrics', route: '/projects/reports-dashboard', queryParams: { type: 'margin-metrics' } },
            { id: 'prj-rep-7', label: 'Tower Unit Profitability', route: '/projects/reports-dashboard', queryParams: { type: 'tower-unit-profitability' } },
            { id: 'prj-rep-8', label: 'JV Sharing Summary', route: '/projects/reports-dashboard', queryParams: { type: 'jv-sharing-summary' } },
            { id: 'prj-rep-9', label: 'Actual vs Feasibility', route: '/projects/reports-dashboard', queryParams: { type: 'actual-vs-feasibility' } }
          ]
        },
      ]
    },
    {
      id: 'construction',
      title: 'Construction Operations',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'wbs-boq', label: 'WBS & BOQ', route: '/construction/wbs-boq' },
        { id: 'work-orders', label: 'Work Orders', route: '/construction/work-orders' },
        { id: 'contractors', label: 'Contractor', route: '/construction/contractors' },
        { id: 'dpr', label: 'Daily Progress', route: '/construction/dpr' },
        { id: 'labor-muster', label: 'Labor Muster Roll', route: '/construction/labor-muster' },
        { id: 'ra-bills', label: 'Contractor RA Billing', route: '/construction/ra-bills' },
        { id: 'cube-tests', label: 'Concrete Cube Crushing Tests', route: '/construction/cube-tests' },
        { id: 'safety-ncr', label: 'Health, Safety & NCR', route: '/construction/safety-ncr' },
        { id: 'mat-requisitions', label: 'Material Requisition', route: '/construction/material-requisitions' },
        { id: 'project-completion', label: 'Project Completion', route: '/construction/project-completion' },
        {
          id: 'construction-reports',
          label: 'Reports',
          children: [
            { id: 'construction-report-progress', label: 'Progress & Schedule · Project Progress', route: '/construction/reports', queryParams: { type: 'PROJECT_PROGRESS' } },
            { id: 'construction-report-wbs-delay', label: 'Progress & Schedule · WBS Delay', route: '/construction/reports', queryParams: { type: 'WBS_DELAY' } },
            { id: 'construction-report-boq-actual', label: 'Cost & Budget · BOQ vs Actual', route: '/construction/reports', queryParams: { type: 'BOQ_VS_ACTUAL' } },
            { id: 'construction-report-budget-actual', label: 'Cost & Budget · Budget vs Actual', route: '/construction/reports', queryParams: { type: 'BUDGET_COMMITTED_ACTUAL' } },
            { id: 'construction-report-material', label: 'Materials & Store · Consumption & Wastage', route: '/construction/reports', queryParams: { type: 'MATERIAL_CONSUMPTION' } },
            { id: 'construction-report-work-order', label: 'Contractor & Contracts · Work Orders', route: '/construction/reports', queryParams: { type: 'CONTRACTOR_WORK_ORDER' } },
            { id: 'construction-report-bill-ageing', label: 'Billing & Payments · Bill Ageing', route: '/construction/reports', queryParams: { type: 'BILL_CERTIFICATION_AGEING' } },
            { id: 'construction-report-retention', label: 'Billing & Payments · Advance & Retention', route: '/construction/reports', queryParams: { type: 'ADVANCE_RETENTION_LIABILITY' } },
            { id: 'construction-report-labour', label: 'Workforce & Site Ops · Labour Productivity', route: '/construction/reports', queryParams: { type: 'LABOUR_PRODUCTIVITY' } },
            { id: 'construction-report-quality', label: 'Quality & Safety · NCR & Defect Closure', route: '/construction/reports', queryParams: { type: 'QUALITY_NCR_CLOSURE' } },
            { id: 'construction-report-safety', label: 'Quality & Safety · Safety Incidents', route: '/construction/reports', queryParams: { type: 'SAFETY_INCIDENTS_CAPA' } },
            { id: 'construction-report-completion', label: 'Closeout & Handover · Completion Checklist', route: '/construction/reports', queryParams: { type: 'COMPLETION_CHECKLIST' } },
            { id: 'construction-report-eac', label: 'Cost & Budget · EAC & Cost Variance', route: '/construction/reports', queryParams: { type: 'EAC_COST_VARIANCE' } },
            { id: 'construction-report-wip', label: 'Cost & Budget · Construction WIP', route: '/construction/reports', queryParams: { type: 'CONSTRUCTION_WIP_ALLOCATION' } }
          ]
        }
      ]
    },
    {
      id: 'budgeting-cost-control',
      title: 'Budgeting',
      iconSvg: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        { id: 'bcc-dashboard', label: 'Dashboard', route: '/budgeting/dashboard' },
        { id: 'bcc-planning', label: 'Planning', route: '/budgeting/planning' },
        { id: 'bcc-project-budget', label: 'Project Budget', route: '/budgeting/project-budget' },
        { id: 'bcc-boq', label: 'BOQ', route: '/budgeting/boq-budget' },
        { id: 'bcc-allocation', label: 'Allocation', route: '/budgeting/cost-allocation' },
        { id: 'bcc-approval', label: 'Approval', route: '/budgeting/budget-approval' },
        { id: 'bcc-purchase-control', label: 'Purchase Control', route: '/budgeting/purchase-control' },
        { id: 'bcc-expense-control', label: 'Expense Control', route: '/budgeting/expense-control' },
        { id: 'bcc-variation', label: 'Variation', route: '/budgeting/budget-variation' },
        { id: 'bcc-vs-actual', label: 'Actual', route: '/budgeting/budget-vs-actual' },
        { id: 'bcc-forecasting', label: 'Forecasting', route: '/budgeting/forecasting' },
        {
          id: 'bcc-reports-suite',
          label: 'Budget Reports',
          children: [
            { id: 'rep-bcc-1', label: 'Approved & Spent', route: '/budgeting/reports', queryParams: { type: 'project_expenditure' } },
            { id: 'rep-bcc-2', label: 'BOQ Budget vs Actual Cost', route: '/budgeting/reports', queryParams: { type: 'boq_vs_actual' } },
            { id: 'rep-bcc-3', label: 'Tower & Floor Cost Analysis', route: '/budgeting/reports', queryParams: { type: 'tower_floor_cost' } },
            { id: 'rep-bcc-4', label: 'Material & Rebar Wastage', route: '/budgeting/reports', queryParams: { type: 'material_consumption' } },
            { id: 'rep-bcc-5', label: 'Purchase Commitments', route: '/budgeting/reports', queryParams: { type: 'purchase_commitments' } },
            { id: 'rep-bcc-6', label: 'Contractor Bill', route: '/budgeting/reports', queryParams: { type: 'contractor_retention' } },
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
      items: [
        { id: 'fa-dash', label: 'Dashboard', route: '/fixed-assets/dashboard' },
        { id: 'fa-register', label: 'Asset Register', route: '/fixed-assets/asset-register' },
        { id: 'fa-depreciation', label: 'Depreciation Schedule', route: '/fixed-assets/depreciation' },
        { id: 'fa-transfers', label: 'Transfers', route: '/fixed-assets/transfers' },
        { id: 'fa-maintenance', label: 'Maintenance', route: '/fixed-assets/maintenance' },
        { id: 'fa-disposals', label: 'Disposals & Gain/Loss', route: '/fixed-assets/disposals' },
        { id: 'fa-verification', label: 'Physical Verification', route: '/fixed-assets/verification' },
        { id: 'fa-reconciliation', label: 'GL Reconciliation', route: '/fixed-assets/gl-reconciliation' },
        {
          id: 'fa-reports-suite',
          label: 'Fixed Asset Reports',
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
      items: [
        { id: 'proc-dash', label: 'Dashboard', route: '/procurement/dashboard' },
        { id: 'proc-vendor', label: 'Vendors', route: '/procurement/vendors' },
        { id: 'proc-mat', label: 'Materials', route: '/procurement/materials' },
        { id: 'proc-pr', label: 'Purchase Requisitions', route: '/procurement/requisitions' },
        { id: 'proc-rfq', label: 'RFQ', route: '/procurement/rfq-comparison' },
        { id: 'proc-po', label: 'Purchase Orders', route: '/procurement/purchase-orders' },
        { id: 'proc-grn', label: 'Goods Receipt Notes', route: '/procurement/grn' },
        { id: 'proc-qc', label: 'Quality Inspections', route: '/procurement/inspections' },
        { id: 'proc-stock', label: 'Warehouse Stock', route: '/procurement/warehouse-stock' },
        { id: 'proc-min', label: 'Material Issues', route: '/procurement/material-issues' },
        { id: 'proc-transfer', label: 'Stock Transfers', route: '/procurement/stock-transfers' },
        { id: 'proc-planning', label: 'Material Planning', route: '/procurement/material-planning' },
        { id: 'proc-ledger', label: 'Inventory Ledger', route: '/procurement/inventory-ledger' },
        { id: 'proc-bills', label: 'Supplier Bills', route: '/procurement/supplier-bills' },
        {
          id: 'proc-reports-suite',
          label: 'Procurement Reports',
          children: [
            { id: 'rep-pr-1', label: 'PR Register & Approval', route: '/procurement/reports-audit', queryParams: { report: 'pr_register' } },
            { id: 'rep-pr-2', label: 'PR Approval Aging', route: '/procurement/reports-audit', queryParams: { report: 'approval_aging' } },
            { id: 'rep-pr-3', label: 'RFQ & Quotation Comparison', route: '/procurement/reports-audit', queryParams: { report: 'rfq_comparison' } },
            { id: 'rep-pr-4', label: 'Approved Supplier & Vendor', route: '/procurement/reports-audit', queryParams: { report: 'vendor_performance' } },
            { id: 'rep-pr-5', label: 'Purchase Order Register', route: '/procurement/reports-audit', queryParams: { report: 'po_register' } },
            { id: 'rep-pr-6', label: 'Outstanding Order Quantities', route: '/procurement/reports-audit', queryParams: { report: 'outstanding_orders' } },
            { id: 'rep-pr-7', label: 'Delayed Deliveries & Lead Time', route: '/procurement/reports-audit', queryParams: { report: 'delayed_deliveries' } },
            { id: 'rep-pr-8', label: 'Price Variance & Savings', route: '/procurement/reports-audit', queryParams: { report: 'price_variance' } },
            { id: 'rep-pr-9', label: 'Budget vs Commitments', route: '/procurement/reports-audit', queryParams: { report: 'budget_commitments' } },
            { id: 'rep-pr-10', label: 'Emergency Purchases', route: '/procurement/reports-audit', queryParams: { report: 'emergency_purchases' } }
          ]
        },
        {
          id: 'inv-reports-suite',
          label: 'Inventory Reports',
          children: [
            { id: 'rep-inv-1', label: 'Stock by Warehouse & Item', route: '/procurement/reports-audit', queryParams: { report: 'stock_by_location' } },
            { id: 'rep-inv-2', label: 'Stock Ledger & Movement', route: '/procurement/reports-audit', queryParams: { report: 'stock_ledger' } },
            { id: 'rep-inv-3', label: 'GRN & Material Issue Register', route: '/procurement/reports-audit', queryParams: { report: 'grn_issue_register' } },
            { id: 'rep-inv-4', label: 'Material Transfer & In-Transit', route: '/procurement/reports-audit', queryParams: { report: 'transfer_transit' } },
            { id: 'rep-inv-5', label: 'Stock Valuation & Reconciliation', route: '/procurement/reports-audit', queryParams: { report: 'stock_valuation' } },
            { id: 'rep-inv-6', label: 'Reorder Alerts & Stockout Risk', route: '/procurement/reports-audit', queryParams: { report: 'reorder_risk' } },
            { id: 'rep-inv-7', label: 'Slow-Moving & Obsolete Stock', route: '/procurement/reports-audit', queryParams: { report: 'slow_obsolete' } },
            { id: 'rep-inv-8', label: 'Physical Count Variance', route: '/procurement/reports-audit', queryParams: { report: 'physical_variance' } },
            { id: 'rep-inv-9', label: 'Material Consumption vs BOQ', route: '/procurement/reports-audit', queryParams: { report: 'consumption_boq' } },
            { id: 'rep-inv-10', label: 'Project Wastage & Loss', route: '/procurement/reports-audit', queryParams: { report: 'project_wastage' } }
          ]
        },
        {
          id: 'ap-reports-suite',
          label: 'Accounts Payable & Audit',
          children: [
            { id: 'rep-ap-1', label: 'Supplier Invoice Register', route: '/procurement/reports-audit', queryParams: { report: 'invoice_register' } },
            { id: 'rep-ap-2', label: 'Unpaid & Overdue Bills', route: '/procurement/reports-audit', queryParams: { report: 'unpaid_overdue' } },
            { id: 'rep-ap-3', label: 'Supplier Balances & Aging', route: '/procurement/reports-audit', queryParams: { report: 'supplier_balances' } },
            { id: 'rep-ap-4', label: 'Payment History & Disbursements', route: '/procurement/reports-audit', queryParams: { report: 'payment_history' } },
            { id: 'rep-ap-5', label: 'Purchase Returns & Debit Notes', route: '/procurement/reports-audit', queryParams: { report: 'returns_credit_notes' } },
            { id: 'rep-ap-6', label: 'Tax & VAT Deduction Summary', route: '/procurement/reports-audit', queryParams: { report: 'tax_summary' } },
            { id: 'rep-ap-7', label: 'GRN vs Invoice Discrepancies', route: '/procurement/reports-audit', queryParams: { report: 'grn_discrepancies' } },
            { id: 'rep-ap-8', label: 'System Audit Trail', route: '/procurement/reports-audit', queryParams: { report: 'audit_trail' } }
          ]
        }
      ]
    },
    {
      id: 'units',
      title: 'Property Inventory',
      iconSvg: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      items: [
        { id: 'inv-dashboard', label: 'Inventory Dashboard', route: '/inventory', queryParams: { tab: 'dashboard' } },
        { id: 'inv-search', label: 'Property Search', route: '/inventory', queryParams: { tab: 'search' } },
        { id: 'inv-matrix', label: 'Floo-wise Unit Matrix', route: '/inventory', queryParams: { tab: 'matrix' } },
        { id: 'inv-units', label: 'Unit Directory & Configuration', route: '/inventory', queryParams: { tab: 'units' } },
        { id: 'inv-pricing', label: 'Area & Pricing Formula', route: '/inventory', queryParams: { tab: 'area_calc' } },
        { id: 'inv-parking', label: 'Basement Parking Bays', route: '/inventory', queryParams: { tab: 'parking' } },
        { id: 'unit-combinations', label: 'Combination', route: '/inventory/combinations' },
        { id: 'property-documents', label: 'Documents', route: '/inventory/documents' }
      ]
    },
    {
      id: 'crm',
      title: 'CRM & Prospects',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'crm-dashboard', label: 'Dashboard', route: '/crm' },
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
        { id: 'bookings', label: 'Bookings', route: '/sales/bookings' },
        { id: 'discounts', label: 'Discounts', route: '/sales/discounts' },
        { id: 'collections', label: 'Collections', route: '/sales/collections' },
        { id: 'documents', label: 'Documents', route: '/sales/documents' },
        { id: 'schedules', label: 'Schedules', route: '/sales/schedules' },
        { id: 'sales-ledger', label: 'Sales Ledger', route: '/sales/ledger' },
        { id: 'cancellations', label: 'Cancellations', route: '/sales/cancellations' },
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
        { id: 'inst-setup', label: 'Payment Setup', route: '/installments/payment-setup' },
        { id: 'inst-booking', label: 'Booking Money', route: '/installments/booking-money' },
        { id: 'inst-downpayment', label: 'Down Payment', route: '/installments/down-payment' },
        { id: 'inst-schedule', label: 'Schedule', route: '/installments/schedules' },
        { id: 'inst-collections', label: 'Collection', route: '/installments/collections' },
        { id: 'inst-due-overdue', label: 'Due & Overdue', route: '/installments/due-overdue' },
        { id: 'inst-late-fee', label: 'Late Fee & Rebate', route: '/installments/late-fee-rebate' },
        { id: 'inst-reschedule', label: 'Rescheduling', route: '/installments/rescheduling' },
        { id: 'inst-cheques', label: 'Cheque & PDC', route: '/installments/cheques' },
        { id: 'inst-ledger', label: 'Customer Ledger', route: '/installments/customer-ledger' },
        { id: 'inst-refund', label: 'Refund & Adjustment', route: '/installments/refund-adjustment' },
        {
          id: 'inst-reports-suite',
          label: 'Installment & Collection Reports',
          children: [
            { id: 'rep-inst-cockpit', label: 'Executive Cockpit', route: '/installments/reports-dashboard' },
            { id: 'rep-inst-collections', label: 'Collection Summary Report', route: '/installments/collections' },
            { id: 'rep-inst-overdue', label: 'Overdue Recovery', route: '/installments/due-overdue' },
            { id: 'rep-inst-ledger', label: 'Customer Outstanding Ledger', route: '/installments/customer-ledger' },
            { id: 'rep-inst-plan-audit', label: 'Payment Plan Audit Report', route: '/installments/payment-setup' },
            { id: 'rep-inst-pdc', label: 'PDC Safe', route: '/installments/cheques' },
            { id: 'rep-inst-downpayment', label: 'Down Payment Report', route: '/installments/down-payment' }
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
          label: 'Cash Management',
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
          label: 'Loans Financing',
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
          label: 'Financial Reports',
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
            { id: 'rep-voucher-register', label: 'Voucher Register', route: '/accounts/financial-reports', queryParams: { tab: 'voucher-register' } },
            { id: 'rep-closing-checklist', label: 'Period Closing Checklist', route: '/accounts/financial-reports', queryParams: { tab: 'closing-checklist' } },
            { id: 'rep-audit-trail', label: 'Audit Trail', route: '/accounts/financial-reports', queryParams: { tab: 'audit-trail' } }
          ]
        }
      ]
    },
    {
      id: 'tax',
      title: 'NBR Tax VAT',
      iconSvg: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        { id: 'tax-cockpit', label: 'NBR Tax & VAT', route: '/tax/cockpit' },
        { id: 'tax-mushak63', label: 'Mushak 6.3', route: '/tax/mushak63' },
        { id: 'tax-mushak65', label: 'Mushak 6.5', route: '/tax/mushak65' },
        { id: 'tax-tds', label: 'TDS & VDS', route: '/tax/tds' },
        { id: 'tax-53ff', label: 'Section 53FF AIT', route: '/tax/53ff' }
      ]
    },
    {
      id: 'hrms-suite',
      title: 'Human Resources',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [],
      subGroups: []
    },
    {
      id: 'handover',
      title: 'Handover Facilities',
      iconSvg: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
      items: [
        { id: 'snagging', label: 'Snagging Warranty', route: '/handover/snagging' },
        { id: 'possession', label: 'Handover Possession', route: '/handover/possession' },
        { id: 'association', label: 'Building Association', route: '/handover/association' }
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
                item.label.toLowerCase().includes(q) ||
                (item.children && item.children.some(c => c.label.toLowerCase().includes(q)))
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
    this.autoExpandActiveGroup(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.autoExpandActiveGroup(event.urlAfterRedirects || event.url);
    });
  }

  private autoExpandActiveGroup(url: string): void {
    if (!url) return;
    const cleanUrl = url.split('?')[0];
    for (const group of this.menuGroups()) {
      // Check direct items and their children
      let matchedSubItemId: string | null = null;
      const matchItem = group.items?.some(item => {
        if (item.route && (cleanUrl === item.route || cleanUrl.startsWith(item.route + '/'))) return true;
        if (item.children?.some(c => c.route && (cleanUrl === c.route || cleanUrl.startsWith(c.route + '/')))) {
          matchedSubItemId = item.id;
          return true;
        }
        return false;
      });

      if (matchItem) {
        const current = new Set(this.expandedGroupIds());
        current.add(group.id);
        this.expandedGroupIds.set(current);
        if (matchedSubItemId) {
          const currentSub = new Set(this.expandedSubItemIds());
          currentSub.add(matchedSubItemId);
          this.expandedSubItemIds.set(currentSub);
        }
        break;
      }

      // Check nested subGroups (e.g. HRMS suite)
      if (group.subGroups && group.subGroups.length > 0) {
        for (const subGroup of group.subGroups) {
          let matchedSubItemId: string | null = null;
          const matchSub = subGroup.items?.some(item => {
            if (item.route && (cleanUrl === item.route || cleanUrl.startsWith(item.route + '/'))) return true;
            if (item.children?.some(c => c.route && (cleanUrl === c.route || cleanUrl.startsWith(c.route + '/')))) {
              matchedSubItemId = item.id;
              return true;
            }
            return false;
          });

          if (matchSub) {
            const currentGroups = new Set(this.expandedGroupIds());
            currentGroups.add(group.id);
            this.expandedGroupIds.set(currentGroups);

            const currentSubGroups = new Set(this.expandedSubGroupIds());
            currentSubGroups.add(subGroup.id);
            this.expandedSubGroupIds.set(currentSubGroups);

            if (matchedSubItemId) {
              const currentSubItems = new Set(this.expandedSubItemIds());
              currentSubItems.add(matchedSubItemId);
              this.expandedSubItemIds.set(currentSubItems);
            }
            break;
          }
        }
      }
    }
  }

  setSuite(suite: 'hrms' | 'erp'): void {
    this.activeSuite.set(suite);
    this.expandedGroupIds.set(new Set<string>());
    this.expandedSubGroupIds.set(new Set<string>());
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

  isSubGroupExpanded(subGroupId: string): boolean {
    if (this.filterQuery().trim()) {
      return true;
    }
    return this.expandedSubGroupIds().has(subGroupId);
  }

  toggleSubGroup(subGroupId: string): void {
    const current = new Set(this.expandedSubGroupIds());
    if (current.has(subGroupId)) {
      current.delete(subGroupId);
    } else {
      current.add(subGroupId);
    }
    this.expandedSubGroupIds.set(current);
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
