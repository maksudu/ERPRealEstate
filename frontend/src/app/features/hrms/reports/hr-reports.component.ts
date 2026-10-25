import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import {
  HrReportId,
  HrReportsService,
  ReportColumn,
  ReportFilterOptions,
  ReportFilters,
  ReportMetadata,
  ReportPage
} from './hr-reports.service';

export interface ReportCategory {
  id: 'hr' | 'attendance' | 'leave' | 'payroll' | 'labour';
  label: string;
  badge: string;
}

export interface ReportLink {
  id: HrReportId;
  path: string;
  title: string;
  short: string;
  category: 'hr' | 'attendance' | 'leave' | 'payroll' | 'labour';
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  { id: 'hr', label: '1. HR Reports', badge: '12 Reports' },
  { id: 'attendance', label: '2. Attendance Reports', badge: '14 Reports' },
  { id: 'leave', label: '3. Leave Reports', badge: '12 Reports' },
  { id: 'payroll', label: '4. Payroll Reports', badge: '17 Reports' },
  { id: 'labour', label: '5. Project Labour Cost', badge: '10 Reports' }
];

const REPORT_LINKS: ReportLink[] = [
  // 1. HR Reports (12)
  { id: 'employee-master', path: 'employee-master', title: 'Employee Master Report', short: 'Employee ID, name, designation, department, joining date, status', category: 'hr' },
  { id: 'employee-directory', path: 'employee-directory', title: 'Employee Directory', short: 'Contact details, reporting manager, branch, work location', category: 'hr' },
  { id: 'employee-headcount', path: 'employee-headcount', title: 'Employee Headcount', short: 'Total employees by company, branch, department, and project', category: 'hr' },
  { id: 'new-joining', path: 'new-joining', title: 'New Joining Report', short: 'Newly joined employees by date range', category: 'hr' },
  { id: 'resignation-separation', path: 'resignation-separation', title: 'Resignation & Separation', short: 'Resignations, terminations, exit dates, and clearance status', category: 'hr' },
  { id: 'employee-transfer', path: 'employee-transfer', title: 'Employee Transfer Report', short: 'Department, branch, designation, and project transfers', category: 'hr' },
  { id: 'promotion-increment', path: 'promotion-increment', title: 'Promotion & Increment Report', short: 'Salary revisions, promotions, and effective dates', category: 'hr' },
  { id: 'document-expiry', path: 'document-expiry', title: 'Employee Document Expiry', short: 'Expiring contracts, certificates, and authorized identity documents', category: 'hr' },
  { id: 'recruitment', path: 'recruitment', title: 'Recruitment Report', short: 'Vacancies, candidates, interviews, offers, and hiring status', category: 'hr' },
  { id: 'employee-turnover', path: 'employee-turnover', title: 'Employee Turnover Report', short: 'Employee exits and turnover trends', category: 'hr' },
  { id: 'manpower-allocation', path: 'manpower-allocation', title: 'Manpower Allocation Report', short: 'Employee allocation by project, site, and department', category: 'hr' },
  { id: 'employee-loan-advance', path: 'employee-loan-advance', title: 'Employee Loan & Advance Report', short: 'Approved amounts, repayments, and outstanding balances', category: 'hr' },

  // 2. Attendance Reports (14)
  { id: 'attendance-daily', path: 'attendance-daily', title: 'Daily Attendance Report', short: 'Present, absent, late, half-day, and leave status', category: 'attendance' },
  { id: 'attendance-monthly-summary', path: 'attendance-monthly-summary', title: 'Monthly Attendance Summary', short: 'Employee-wise attendance totals for the month', category: 'attendance' },
  { id: 'attendance-history', path: 'attendance-history', title: 'Employee Attendance History', short: 'Daily check-in, check-out, and attendance status', category: 'attendance' },
  { id: 'attendance-late-arrival', path: 'attendance-late-arrival', title: 'Late Arrival Report', short: 'Late arrivals and minutes late', category: 'attendance' },
  { id: 'attendance-early-departure', path: 'attendance-early-departure', title: 'Early Departure Report', short: 'Employees leaving before scheduled time', category: 'attendance' },
  { id: 'attendance-absenteeism', path: 'attendance-absenteeism', title: 'Absenteeism Report', short: 'Absences by employee, department, or project', category: 'attendance' },
  { id: 'attendance-missing-punch', path: 'attendance-missing-punch', title: 'Missing Punch Report', short: 'Missing check-in/check-out records', category: 'attendance' },
  { id: 'attendance-overtime', path: 'attendance-overtime', title: 'Overtime Report', short: 'Approved overtime hours and payable amounts', category: 'attendance' },
  { id: 'attendance-shift-wise', path: 'attendance-shift-wise', title: 'Shift-wise Attendance', short: 'Attendance by shift, location, and date', category: 'attendance' },
  { id: 'attendance-biometric', path: 'attendance-biometric', title: 'Biometric Attendance Report', short: 'Device punch records and synchronization exceptions', category: 'attendance' },
  { id: 'attendance-mobile-gps', path: 'attendance-mobile-gps', title: 'Mobile/GPS Attendance Report', short: 'Authorized location-based attendance records', category: 'attendance' },
  { id: 'attendance-correction', path: 'attendance-correction', title: 'Attendance Correction Report', short: 'Correction requests, approvers, and outcomes', category: 'attendance' },
  { id: 'attendance-site-wise', path: 'attendance-site-wise', title: 'Site-wise Attendance', short: 'Attendance by construction project, tower, or site', category: 'attendance' },
  { id: 'attendance-exception', path: 'attendance-exception', title: 'Attendance Exception Report', short: 'Unusual punches, duplicate records, and unresolved exceptions', category: 'attendance' },

  // 3. Leave Reports (12)
  { id: 'leave-register', path: 'leave-register', title: 'Leave Application Register', short: 'Applications, dates, leave type, and status', category: 'leave' },
  { id: 'leave-approved', path: 'leave-approved', title: 'Approved Leave Report', short: 'Approved leave by employee and period', category: 'leave' },
  { id: 'leave-pending', path: 'leave-pending', title: 'Pending Leave Report', short: 'Requests awaiting approval', category: 'leave' },
  { id: 'leave-balance', path: 'leave-balance', title: 'Leave Balance Report', short: 'Opening balance, earned, used, adjusted, and remaining leave', category: 'leave' },
  { id: 'leave-type-summary', path: 'leave-type-summary', title: 'Leave Type Summary', short: 'Annual, casual, sick, unpaid, and other configured leave types', category: 'leave' },
  { id: 'leave-history', path: 'leave-history', title: 'Employee Leave History', short: 'Individual employee leave transactions', category: 'leave' },
  { id: 'leave-department-wise', path: 'leave-department-wise', title: 'Department-wise Leave Report', short: 'Leave usage across departments', category: 'leave' },
  { id: 'leave-project-wise', path: 'leave-project-wise', title: 'Project-wise Leave Report', short: 'Leave affecting construction and project teams', category: 'leave' },
  { id: 'leave-unpaid', path: 'leave-unpaid', title: 'Unpaid Leave Report', short: 'Approved unpaid leave and payroll impact', category: 'leave' },
  { id: 'leave-encashment', path: 'leave-encashment', title: 'Leave Encashment Report', short: 'Eligible, approved, and paid leave encashment', category: 'leave' },
  { id: 'leave-cancellation', path: 'leave-cancellation', title: 'Leave Cancellation Report', short: 'Cancelled applications and balance adjustments', category: 'leave' },
  { id: 'leave-trend-analysis', path: 'leave-trend-analysis', title: 'Leave Trend Analysis', short: 'Monthly and yearly leave patterns', category: 'leave' },

  // 4. Payroll Reports (17)
  { id: 'payroll-register', path: 'payroll-register', title: 'Monthly Payroll Register', short: 'Employee-wise earnings, deductions, and net pay', category: 'payroll' },
  { id: 'salary-sheet', path: 'salary-sheet', title: 'Salary Sheet', short: 'Basic salary, allowances, overtime, bonuses, and deductions', category: 'payroll' },
  { id: 'payslip-register', path: 'payslip-register', title: 'Payslip Register', short: 'Payslip generation and publication status', category: 'payroll' },
  { id: 'bank-disbursement', path: 'bank-disbursement', title: 'Bank Salary Transfer Report', short: 'Employee payment details and transfer amounts', category: 'payroll' },
  { id: 'payroll-summary', path: 'payroll-summary', title: 'Payroll Summary', short: 'Total gross earnings, deductions, and net payable', category: 'payroll' },
  { id: 'payroll-department-wise', path: 'payroll-department-wise', title: 'Department-wise Payroll', short: 'Salary expenses by department', category: 'payroll' },
  { id: 'payroll-project-cost', path: 'payroll-project-cost', title: 'Project-wise Payroll Cost', short: 'Salary and labour costs allocated to projects', category: 'payroll' },
  { id: 'payroll-salary-component', path: 'payroll-salary-component', title: 'Salary Component Report', short: 'Basic salary and allowance breakdown', category: 'payroll' },
  { id: 'payroll-overtime-payment', path: 'payroll-overtime-payment', title: 'Overtime Payment Report', short: 'Approved overtime hours and amounts', category: 'payroll' },
  { id: 'payroll-bonus', path: 'payroll-bonus', title: 'Bonus Report', short: 'Festival, performance, and other approved bonuses', category: 'payroll' },
  { id: 'payroll-arrears', path: 'payroll-arrears', title: 'Arrears Report', short: 'Prior-period salary adjustments', category: 'payroll' },
  { id: 'payroll-deduction', path: 'payroll-deduction', title: 'Deduction Report', short: 'Loans, advances, tax, and other authorized deductions', category: 'payroll' },
  { id: 'payroll-loan-recovery', path: 'payroll-loan-recovery', title: 'Employee Loan Recovery', short: 'Installments deducted and outstanding balances', category: 'payroll' },
  { id: 'payroll-salary-increment', path: 'payroll-salary-increment', title: 'Salary Increment Report', short: 'Previous salary, revised salary, and effective date', category: 'payroll' },
  { id: 'payroll-final-settlement', path: 'payroll-final-settlement', title: 'Final Settlement Report', short: 'Outstanding salary, approved benefits, recoveries, and net settlement', category: 'payroll' },
  { id: 'payroll-variance', path: 'payroll-variance', title: 'Payroll Variance Report', short: 'Comparison with previous payroll periods', category: 'payroll' },
  { id: 'payroll-reconciliation', path: 'payroll-reconciliation', title: 'Payroll Reconciliation Report', short: 'Payroll register versus salary payments and accounting balances', category: 'payroll' },

  // 5. Project-wise Labour Cost Reports (10)
  { id: 'labour-project-salary', path: 'labour-project-salary', title: 'Project-wise Employee Salary Allocation', short: 'Project-wise employee salary allocation', category: 'labour' },
  { id: 'labour-tower-site', path: 'labour-tower-site', title: 'Tower-wise and Site-wise Labour Cost', short: 'Tower-wise and site-wise labour cost', category: 'labour' },
  { id: 'labour-wbs-activity', path: 'labour-wbs-activity', title: 'WBS/Activity-wise Labour Expenses', short: 'WBS/activity-wise labour expenses', category: 'labour' },
  { id: 'labour-direct-vs-shared', path: 'labour-direct-vs-shared', title: 'Direct Labour versus Shared Staff Costs', short: 'Direct labour versus shared staff costs', category: 'labour' },
  { id: 'labour-timesheet-hours', path: 'labour-timesheet-hours', title: 'Employee Timesheet and Approved Working Hours', short: 'Employee timesheet and approved working hours', category: 'labour' },
  { id: 'labour-overtime-project', path: 'labour-overtime-project', title: 'Overtime Expenditure by Project', short: 'Overtime expenditure by project', category: 'labour' },
  { id: 'labour-budget-vs-actual', path: 'labour-budget-vs-actual', title: 'Budgeted versus Actual Manpower Cost', short: 'Budgeted versus actual manpower cost', category: 'labour' },
  { id: 'labour-monthly-trend', path: 'labour-monthly-trend', title: 'Monthly Labour Cost Trend by Project', short: 'Monthly labour cost trend by project', category: 'labour' },
  { id: 'labour-cost-exceptions', path: 'labour-cost-exceptions', title: 'Cost Allocation Exceptions and Unallocated Payroll', short: 'Cost allocation exceptions and unallocated payroll', category: 'labour' },
  { id: 'labour-multi-project-distribution', path: 'labour-multi-project-distribution', title: 'Employee Cost Distribution across Multiple Projects', short: 'Employee cost distribution across multiple projects', category: 'labour' }
];

const LEGACY_REPORTS: Record<string, HrReportId> = {
  'employee-register': 'employee-master',
  'headcount-by-dept': 'employee-headcount',
  'headcount-by-project': 'employee-headcount',
  'recruitment-report': 'recruitment',
  'turnover-report': 'employee-turnover',
  'loan-balance': 'employee-loan-advance',
  'project-labour-cost': 'manpower-allocation',
  'payroll-monthly-register': 'payroll-register',
  'bank-salary-transfer': 'bank-disbursement'
};

const FILTER_LABELS: Record<string, string> = {
  company_id: 'Company',
  branch_id: 'Branch',
  department_id: 'Department',
  designation_id: 'Designation',
  project_id: 'Project / Site',
  tower_id: 'Tower / Site',
  shift_id: 'Shift',
  leave_type_id: 'Leave Type',
  status: 'Status',
  employment_type: 'Employment Type',
  separation_type: 'Separation Type',
  revision_type: 'Revision Type',
  document_type: 'Document Type',
  recruitment_type: 'Recruitment Record',
  period_code: 'Payroll Period',
  cost_center: 'Cost Centre / WBS',
  financial_year: 'Financial Year',
  start_date: 'From Date',
  end_date: 'To Date'
};

@Component({
  selector: 'app-hr-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent, CardContainerComponent],
  template: `
    <div class="p-3 sm:p-5 xl:p-6 space-y-4 max-w-[1780px] mx-auto min-h-[calc(100vh-4.5rem)]">
      <!-- Main Unified Card Container -->
      <app-card-container
        [title]="activeReport().title"
        [subtitle]="activeMetadata()?.description || activeReport().short"
        [badge]="categoryLabel(activeCategory())"
        paddingClass="p-0"
        variant="default">

        <!-- Card Header Actions -->
        <div card-actions class="flex flex-wrap items-center gap-2">
          @if (activeMetadata()?.sensitive) {
            <span class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              Restricted · Audited
            </span>
          }
          <div class="w-72 sm:w-96">
            <app-searchable-select
              [ngModel]="activeReport().id"
              (ngModelChange)="onReportChange($event)"
              [ngModelOptions]="{standalone: true}"
              [options]="allReportOptions()"
              placeholder="Search or select report (65 available)"
              [allowCreateNew]="false"
              [showAddButton]="false"
              [searchable]="true">
            </app-searchable-select>
          </div>
        </div>

        <!-- Filter & Action Strip -->
        <div class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 sm:p-5 space-y-3">
          <form (ngSubmit)="applyFilters()">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Report Filters</span>
                <span class="text-xs text-slate-400">·</span>
                <span class="text-xs text-slate-500 font-mono">{{ activeReport().id }}</span>
              </div>
              <button
                type="button"
                (click)="clearFilters()"
                class="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer">
                Reset Filters
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
              @if (activeMetadata()?.filters?.includes('search')) {
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Search Keywords</label>
                  <input
                    type="search"
                    [ngModel]="filters()['search']"
                    (ngModelChange)="setSearch($event)"
                    name="search"
                    placeholder="Search by ID, name, code..."
                    class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              }
              @for (key of filterKeys(); track key) {
                @if (key !== 'search') {
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">{{ filterLabel(key) }}</label>
                    @if (isSelectFilter(key)) {
                      <app-searchable-select
                        [ngModel]="filters()[key]"
                        (ngModelChange)="setFilter(key, $event)"
                        [ngModelOptions]="{standalone: true}"
                        [options]="optionSet(key)"
                        [placeholder]="'All ' + filterLabel(key)"
                        [allowCreateNew]="false"
                        [showAddButton]="false"
                        [searchable]="true">
                      </app-searchable-select>
                    } @else {
                      <input
                        type="date"
                        [name]="key"
                        [ngModel]="filters()[key]"
                        (ngModelChange)="setFilter(key, $event)"
                        class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    }
                  </div>
                }
              }
            </div>

            <div class="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <button
                  type="submit"
                  [disabled]="loading() || !dateRangeValid()"
                  class="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50">
                  Apply Filters
                </button>
                @if (!dateRangeValid()) {
                  <span class="text-xs text-rose-600 font-medium">From date must be before To date.</span>
                }
                @if (exporting()) {
                  <span class="text-xs text-teal-700 animate-pulse font-medium">Exporting {{ exporting() }}…</span>
                }
              </div>

              <!-- Export Controls -->
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  (click)="download('xlsx')"
                  [disabled]="exporting() || loading()"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  (click)="download('pdf')"
                  [disabled]="exporting() || loading()"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  PDF
                </button>
                <button
                  type="button"
                  (click)="download('csv')"
                  [disabled]="exporting() || loading()"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50">
                  CSV
                </button>
                <button
                  type="button"
                  (click)="download('print')"
                  [disabled]="exporting() || loading()"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                  Print
                </button>
                <button
                  type="button"
                  (click)="refresh()"
                  [disabled]="loading()"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer">
                  Refresh
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Table Viewport -->
        <div class="relative min-h-[380px]">
          @if (loading()) {
            <div class="absolute inset-0 bg-white/75 dark:bg-slate-900/75 z-10 flex items-center justify-center gap-2.5">
              <span class="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Loading records…</span>
            </div>
          }

          @if (error()) {
            <div class="p-8 text-center text-rose-600 space-y-2">
              <p class="font-bold text-sm">{{ error() }}</p>
              <button type="button" (click)="refresh()" class="text-xs font-semibold underline text-teal-700">Retry Loading</button>
            </div>
          } @else if (!columns().length || !page()?.total) {
            <div class="py-16 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <svg class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">No records found</p>
              <p class="text-xs max-w-md mx-auto">No data match the selected filter criteria. Try adjusting your date range or clearing filters.</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-100/80 dark:bg-slate-800/80 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    @for (column of columns(); track column.key) {
                      <th scope="col" class="px-4 py-3 whitespace-nowrap">{{ column.label }}</th>
                    }
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  @for (row of page()?.rows || []; track $index) {
                    <tr class="hover:bg-teal-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      @for (column of columns(); track column.key) {
                        <td
                          class="px-4 py-2.5 max-w-[340px]"
                          [class.font-mono]="isCode(column.key)"
                          [class.font-semibold]="isCode(column.key)"
                          [class.whitespace-nowrap]="isCompact(column.key)">
                          @if (column.key === 'status') {
                            <span [class]="statusBadgeClass(row[column.key])" class="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
                              {{ formatCell(row[column.key], column.key) }}
                            </span>
                          } @else {
                            {{ formatCell(row[column.key], column.key) }}
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Server Pagination Controls -->
            <div class="p-3.5 sm:px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div class="flex items-center gap-2">
                <span>Showing <strong>{{ pageStart() }}</strong>–<strong>{{ pageEnd() }}</strong> of <strong>{{ page()?.total | number }}</strong> records</span>
                <span class="text-slate-400">·</span>
                <div class="flex items-center gap-1">
                  <span>Page size:</span>
                  @for (size of pageSizes; track size) {
                    <button
                      type="button"
                      (click)="setPageSize(size)"
                      [class]="pageSize() === size
                        ? 'bg-teal-700 text-white font-bold'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'"
                      class="px-2 py-0.5 rounded text-[11px] cursor-pointer">
                      {{ size }}
                    </button>
                  }
                </div>
              </div>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  (click)="changePage(-1)"
                  [disabled]="offset() === 0 || loading()"
                  class="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer font-medium hover:bg-slate-100 dark:hover:bg-slate-700">
                  Previous
                </button>
                <span class="px-2 font-semibold">Page {{ currentPage() }} of {{ pageCount() }}</span>
                <button
                  type="button"
                  (click)="changePage(1)"
                  [disabled]="pageEnd() >= (page()?.total || 0) || loading()"
                  class="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer font-medium hover:bg-slate-100 dark:hover:bg-slate-700">
                  Next
                </button>
              </div>
            </div>
          }
        </div>
      </app-card-container>
    </div>
  `
})
export class HrReportsAnalyticsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(HrReportsService);
  private routeSubscription?: Subscription;
  private metadataSubscription?: Subscription;
  private optionsSubscription?: Subscription;
  private rowsSubscription?: Subscription;
  private searchTimer?: ReturnType<typeof setTimeout>;

  readonly categories = REPORT_CATEGORIES;
  readonly reports = REPORT_LINKS;
  readonly pageSizes = [10, 25, 50, 100];

  readonly activeCategory = signal<'hr' | 'attendance' | 'leave' | 'payroll' | 'labour'>('hr');
  readonly reportId = signal<HrReportId>('employee-master');
  readonly metadata = signal<ReportMetadata[]>([]);
  readonly page = signal<ReportPage | null>(null);
  readonly options = signal<ReportFilterOptions | null>(null);
  readonly filters = signal<ReportFilters>({});
  readonly pageSize = signal(25);
  readonly offset = signal(0);
  readonly loading = signal(false);
  readonly exporting = signal('');
  readonly error = signal('');
  readonly exportError = signal('');
  readonly exportWarning = signal('');

  readonly allReportOptions = computed(() => {
    return this.reports.map(r => ({
      value: r.id,
      label: `[${this.categoryLabelShort(r.category)}] ${r.title}`
    }));
  });

  categoryLabelShort(cat: string): string {
    switch (cat) {
      case 'hr': return 'HR';
      case 'attendance': return 'Attendance';
      case 'leave': return 'Leave';
      case 'payroll': return 'Payroll';
      case 'labour': return 'Labour';
      default: return 'Report';
    }
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.url.subscribe(segments => {
      const slug = segments[segments.length - 1]?.path || 'employee-master';
      const targetId = LEGACY_REPORTS[slug] || this.asReportId(slug) || 'employee-master';
      this.selectReport(targetId);
    });
    this.metadataSubscription = this.service.metadata().subscribe({
      next: metadata => this.metadata.set(metadata),
      error: () => this.error.set('Unable to load report catalog. Please retry.')
    });
    this.optionsSubscription = this.service.filterOptions().subscribe({
      next: options => this.options.set(options),
      error: () => this.error.set('Unable to load organization report filters. Please retry.')
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.metadataSubscription?.unsubscribe();
    this.optionsSubscription?.unsubscribe();
    this.rowsSubscription?.unsubscribe();
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  selectCategory(cat: 'hr' | 'attendance' | 'leave' | 'payroll' | 'labour'): void {
    this.activeCategory.set(cat);
    const firstInCat = this.reports.find(r => r.category === cat);
    if (firstInCat && firstInCat.id !== this.reportId()) {
      this.navigate(firstInCat);
    }
  }

  categoryLabel(cat: string): string {
    return this.categories.find(c => c.id === cat)?.label || 'Reports';
  }

  activeReport(): ReportLink {
    return this.reports.find(report => report.id === this.reportId()) || this.reports[0];
  }

  onReportChange(reportId: string): void {
    const report = this.reports.find(item => item.id === reportId);
    if (report) {
      this.activeCategory.set(report.category);
      this.navigate(report);
    }
  }

  activeMetadata(): ReportMetadata | undefined {
    return this.metadata().find(item => item.id === this.reportId());
  }

  columns(): ReportColumn[] { return this.page()?.columns || []; }

  filterKeys(): string[] {
    return (this.activeMetadata()?.filters || []).filter(key => key !== 'search');
  }

  filterLabel(key: string): string { return FILTER_LABELS[key] || key.replace(/_/g, ' '); }

  isSelectFilter(key: string): boolean {
    return !['start_date', 'end_date'].includes(key);
  }

  optionSet(key: string): Array<{ value: number | string; label: string }> {
    const values = this.options();
    if (!values) return [];
    const source: Record<string, Array<{ value: number | string; label: string }>> = {
      company_id: values.companies,
      branch_id: values.branches,
      department_id: values.departments,
      designation_id: values.designations,
      project_id: values.projects,
      tower_id: values.projects,
      shift_id: values.statuses,
      leave_type_id: values.document_types,
      status: values.statuses,
      employment_type: values.employment_types,
      separation_type: values.separation_types,
      revision_type: values.revision_types,
      document_type: values.document_types,
      recruitment_type: values.recruitment_types,
      period_code: values.periods,
      cost_center: values.cost_centres,
      financial_year: values.financial_years
    };
    return source[key] || [];
  }

  setFilter(key: string, value: unknown): void {
    const normalized = value === null || value === undefined ? '' : String(value);
    this.filters.update(current => {
      const next = { ...current };
      if (normalized.trim()) next[key] = normalized;
      else delete next[key];
      return next;
    });
  }

  setSearch(value: string): void {
    this.setFilter('search', value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 350);
  }

  dateRangeValid(): boolean {
    const filters = this.filters();
    return !filters['start_date'] || !filters['end_date'] ||
      String(filters['start_date']) <= String(filters['end_date']);
  }

  applyFilters(): void {
    if (!this.dateRangeValid()) return;
    this.offset.set(0);
    this.loadRows();
  }

  clearFilters(): void {
    this.filters.set({});
    this.offset.set(0);
    this.loadRows();
  }

  refresh(): void { this.loadRows(); }

  navigate(report: ReportLink): void {
    this.router.navigate(['/hrms/reports', report.path]);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.offset.set(0);
    this.loadRows();
  }

  changePage(direction: -1 | 1): void {
    this.offset.update(value => Math.max(0, value + direction * this.pageSize()));
    this.loadRows();
  }

  currentPage(): number { return Math.floor(this.offset() / this.pageSize()) + 1; }
  pageCount(): number { return Math.max(1, Math.ceil((this.page()?.total || 0) / this.pageSize())); }
  pageStart(): number { return this.page()?.total ? this.offset() + 1 : 0; }
  pageEnd(): number { return Math.min(this.offset() + this.pageSize(), this.page()?.total || 0); }

  isCode(key: string): boolean { return /code|reference|period|id|ref/i.test(key); }
  isCompact(key: string): boolean { return /date|status|type|percent|rate|count|amount|salary|balance|headcount|hours|approval|clearance/i.test(key); }

  statusBadgeClass(value: unknown): string {
    const s = String(value || '').toUpperCase();
    if (/ACTIVE|APPROVED|PRESENT|PAID|SUCCESS|VERIFIED/.test(s)) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
    }
    if (/PENDING|DRAFT|SUBMITTED|IN_REVIEW/.test(s)) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
    }
    if (/REJECTED|CANCELLED|ABSENT|TERMINATED|INACTIVE/.test(s)) {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800';
    }
    if (/LATE|HALF_DAY|ON_LEAVE/.test(s)) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800';
    }
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700';
  }

  formatCell(value: unknown, key: string): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number' && /amount|salary|balance|gross|deduction|net|basic|bonus|overtime|total_cost|labour_cost/i.test(key)) {
      return `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(value)}`;
    }
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const parsed = new Date(`${text}T12:00:00+06:00`);
      return new Intl.DateTimeFormat('en-BD', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(parsed);
    }
    if (typeof value === 'number' && /rate|percent|turnover_rate/i.test(key)) return `${value}%`;
    return text;
  }

  download(format: 'xlsx' | 'csv' | 'pdf' | 'print'): void {
    this.exportError.set('');
    this.exportWarning.set('');
    this.exporting.set(format.toUpperCase());
    this.service.export(this.reportId(), this.filters(), format).subscribe({
      next: blob => {
        if (format === 'print') {
          const url = URL.createObjectURL(blob);
          const printWindow = window.open(url, '_blank');
          if (!printWindow) {
            URL.revokeObjectURL(url);
            this.exportError.set('The print view was blocked. Allow pop-ups for this site and try again.');
          } else {
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
          }
        } else {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `${this.reportId()}-${new Date().toISOString().slice(0, 10)}.${format}`;
          anchor.click();
          URL.revokeObjectURL(url);
        }
        this.exporting.set('');
      },
      error: (error: any) => {
        this.exporting.set('');
        this.exportError.set(error?.status === 403
          ? 'Access denied. Ask your HR administrator to grant report access.'
          : error?.status === 401
            ? 'Your session has expired. Sign in again before exporting.'
            : 'The export could not be created. Review filters and retry.');
      }
    });
  }

  private selectReport(report: HrReportId): void {
    const found = this.reports.find(r => r.id === report);
    if (found) {
      this.activeCategory.set(found.category);
    }
    if (report === this.reportId() && this.page()) return;
    this.reportId.set(report);
    this.offset.set(0);
    this.filters.set({});
    this.loadRows();
  }

  private loadRows(): void {
    this.rowsSubscription?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.rowsSubscription = this.service.rows(this.reportId(), this.filters(), this.pageSize(), this.offset()).subscribe({
      next: page => {
        this.page.set(page);
        this.loading.set(false);
      },
      error: (error: any) => {
        this.page.set(null);
        this.loading.set(false);
        this.error.set(error?.status === 403
          ? 'Access denied. This report contains restricted HR information.'
          : error?.status === 401
            ? 'Your session has expired. Sign in to access HR reports.'
            : 'The report could not be loaded. Check your connection and try again.');
      }
    });
  }

  private asReportId(value: string): HrReportId | null {
    const found = this.reports.find(r => r.id === value || r.path === value);
    return found ? found.id : null;
  }
}
