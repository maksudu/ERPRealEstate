import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';

export interface ReportSubView {
  id: string;
  title: string;
  description: string;
  badge: string;
}

@Component({
  selector: 'app-hr-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="space-y-6">
      <app-card-container
        [title]="currentViewMeta().title"
        [subtitle]="currentViewMeta().description"
        [badge]="currentViewMeta().badge"
        paddingClass="p-0"
      >
        <div card-actions class="flex items-center gap-2">
          <app-custom-button
            variant="outline"
            size="sm"
            label="Schedule Recurring Report"
            (btnClick)="scheduleReport()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            size="sm"
            label="Download Excel / PDF"
            (btnClick)="downloadExport()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </app-custom-button>
        </div>

        <!-- Metric KPI Strip -->
        <div class="px-6 py-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Group Headcount</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">342 Active</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Monthly Payroll</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ 18,450,000</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Monthly Overtime Hours</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">1,240 Hours</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Annual Turnover Rate</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">4.2% (Healthy)</div>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="p-6 pb-2">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search report records, staff, project..."
                [(ngModel)]="searchQuery"
              ></app-custom-input>
            </div>
            <div class="flex items-center gap-2">
              <select
                [(ngModel)]="periodFilter"
                class="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="OCT-2026">October 2026</option>
                <option value="SEP-2026">September 2026</option>
                <option value="FY2026">Fiscal Year 2025-2026</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="p-6 pt-2 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">Row / Code</th>
                <th class="px-4 py-3">Category / Department / Project</th>
                <th class="px-4 py-3">Headcount / Volume</th>
                <th class="px-4 py-3">Disbursement / Cost Amount</th>
                <th class="px-4 py-3">Audit Verification</th>
                <th class="px-4 py-3 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">{{ item.code }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.name }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.sub }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold">{{ item.volume }}</div>
                    <div class="text-[10px] text-slate-500">{{ item.extra }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳ {{ item.amount | number }}
                  </td>
                  <td class="px-4 py-3">
                    <app-status-badge [status]="item.status"></app-status-badge>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      (click)="viewReport(item)"
                      class="px-2.5 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-md transition-colors"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>
    </div>
  `
})
export class HrReportsAnalyticsComponent implements OnInit {
  private route = inject(ActivatedRoute);

  currentSubView = signal<string>('employee-register');
  searchQuery = signal<string>('');
  periodFilter = signal<string>('OCT-2026');

  viewsMeta: { [key: string]: ReportSubView } = {
    'employee-register': { id: 'employee-register', title: 'Master Employee Register', description: 'Complete roster of active, probation, and contract personnel with NID, designation and service dates', badge: 'Reports 15.1' },
    'headcount-by-dept': { id: 'headcount-by-dept', title: 'Headcount by Department Report', description: 'Department-wise staffing strength, sanctioned vs actual positions and vacancy variance', badge: 'Reports 15.2' },
    'headcount-dept': { id: 'headcount-dept', title: 'Headcount by Department Report', description: 'Department-wise staffing strength, sanctioned vs actual positions and vacancy variance', badge: 'Reports 15.2' },
    'headcount-by-project': { id: 'headcount-by-project', title: 'Headcount by Real Estate Project', description: 'Active project site deployments, project engineers, supervisors, and labor headcount', badge: 'Reports 15.3' },
    'headcount-project': { id: 'headcount-project', title: 'Headcount by Real Estate Project', description: 'Active project site deployments, project engineers, supervisors, and labor headcount', badge: 'Reports 15.3' },
    'attendance-register': { id: 'attendance-register', title: 'Monthly Attendance Register Report', description: 'Day-by-day attendance grid, present, absent, weekly off, and leave counts', badge: 'Reports 15.4' },
    'leave-report': { id: 'leave-report', title: 'Leave Utilization & Balance Report', description: 'Annual leave consumption, unspent earned balances and leave liability valuation', badge: 'Reports 15.5' },
    'overtime-report': { id: 'overtime-report', title: 'Monthly Overtime & Night Allowance Register', description: 'Total approved overtime hours and billing amounts per employee and site', badge: 'Reports 15.6' },
    'payroll-register': { id: 'payroll-register', title: 'Comprehensive Monthly Payroll Register', description: 'Itemized salary components, gross salary, allowances, statutory deductions and net payout', badge: 'Reports 15.7' },
    'salary-sheet': { id: 'salary-sheet', title: 'Formal Bank Salary Sheet (Bilingual)', description: 'Printable corporate salary sheet for board signoff and accounts auditing', badge: 'Reports 15.8' },
    'bank-disbursement': { id: 'bank-disbursement', title: 'Bank Salary Disbursement Advice (BEFTN/NPSB)', description: 'Electronic bank payment file formatting, employee account numbers and routing codes', badge: 'Reports 15.9' },
    'loan-balance': { id: 'loan-balance', title: 'Staff Loan Balance & Amortization Report', description: 'Outstanding loan principals, cumulative recoveries and upcoming repayment forecasts', badge: 'Reports 15.10' },
    'recruitment-report': { id: 'recruitment-report', title: 'Recruitment Funnel & Cost-Per-Hire Report', description: 'Time-to-fill, candidate pipeline conversion, and recruitment agency expenditure', badge: 'Reports 15.11' },
    'turnover-report': { id: 'turnover-report', title: 'Employee Attrition & Turnover Analytics', description: 'Voluntary vs involuntary separation rates, department-wise turnover and exit interview insights', badge: 'Reports 15.12' },
    'training-report': { id: 'training-report', title: 'Corporate Training & Development Report', description: 'Training man-hours logged, program costs, and post-training competency evaluations', badge: 'Reports 15.13' },
    'project-labour-cost': { id: 'project-labour-cost', title: 'Project-wise Direct Labour Cost Analysis', description: 'Comparison of budgeted vs actual labour cost for ongoing construction projects', badge: 'Reports 15.14' }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['employee-register'];
  });

  items = signal<any[]>([
    { id: 1, code: 'RPT-001', name: 'Civil Engineering & Construction', sub: 'Site Operations', volume: '118 Personnel', extra: '98% Present', amount: 6850000, status: 'COMPLETED' },
    { id: 2, code: 'RPT-002', name: 'Grand Emerald Tower Site', sub: 'Project CC-GET-01', volume: '45 Personnel', extra: 'Active Site', amount: 2420000, status: 'COMPLETED' },
    { id: 3, code: 'RPT-003', name: 'Architecture & Design Planning', sub: 'Head Office', volume: '22 Personnel', extra: '100% Retained', amount: 1650000, status: 'COMPLETED' },
    { id: 4, code: 'RPT-004', name: 'Sales, Marketing & CRM', sub: 'Customer Division', volume: '38 Personnel', extra: 'Target Achievement: 92%', amount: 2890000, status: 'COMPLETED' }
  ]);

  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    return this.items().filter(item => {
      return !q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
    });
  });

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const path = segments[segments.length - 1]?.path;
      if (path && this.viewsMeta[path]) {
        this.currentSubView.set(path);
      }
    });
    this.route.queryParamMap.subscribe(params => {
      const view = params.get('view');
      if (view && this.viewsMeta[view]) {
        this.currentSubView.set(view);
      }
    });
  }

  scheduleReport(): void {
    alert('Recurring automated PDF report delivery scheduled to HR & Management emails.');
  }

  downloadExport(): void {
    alert(`Exporting ${this.currentViewMeta().title} to Excel (.xlsx) and PDF.`);
  }

  viewReport(item: any): void {
    alert(`Opening Detailed View for: ${item.name} (${item.code})\nAmount: ৳ ${item.amount}`);
  }
}
