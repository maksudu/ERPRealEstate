import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface WorkflowNavTab {
  id: string;
  label: string;
  route: string;
  badge?: string;
  iconSvg: string;
}

@Component({
  selector: 'app-workflow-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="space-y-4">
      <!-- Workflow Module Top Bar & Sub-Navigation Header -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                HR Workflow & Multi-Tier Approvals
                <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Maker-Checker SLA Engine
                </span>
              </h1>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Automated multi-level sanctioning, authority delegations, audit trails, and financial threshold governance.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <a
              routerLink="/hrms/workflow/requests/create"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
            >
              <span>+ New Approval Request</span>
            </a>
            <a
              routerLink="/hrms/workflow/matrix/create"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <span>Configure Rule</span>
            </a>
          </div>
        </div>

        <!-- 10 Responsive Navigation Tabs matching sidebar 100% -->
        <div class="flex items-center gap-1 overflow-x-auto pt-2.5 custom-scrollbar text-xs">
          @for (tab of tabs; track tab.id) {
            <a
              [routerLink]="tab.route"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-bold border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 shadow-2xs"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shrink-0 whitespace-nowrap cursor-pointer"
            >
              <svg class="w-3.5 h-3.5 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="tab.iconSvg"/>
              </svg>
              <span>{{ tab.label }}</span>
              @if (tab.badge) {
                <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {{ tab.badge }}
                </span>
              }
            </a>
          }
        </div>
      </div>

      <!-- Nested Active Page Outlet -->
      <router-outlet></router-outlet>
    </div>
  `
})
export class WorkflowLayoutComponent {
  tabs: WorkflowNavTab[] = [
    {
      id: 'matrix',
      label: 'Approval Matrix',
      route: '/hrms/workflow/matrix',
      iconSvg: 'M4 6h16M4 12h16M4 18h7'
    },
    {
      id: 'leaves',
      label: 'Leave Approval',
      route: '/hrms/workflow/leaves',
      iconSvg: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    {
      id: 'overtime',
      label: 'Overtime Approval',
      route: '/hrms/workflow/overtime',
      iconSvg: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      id: 'attendance',
      label: 'Attendance Approval',
      route: '/hrms/workflow/attendance',
      iconSvg: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
    },
    {
      id: 'recruitment',
      label: 'Recruitment Approval',
      route: '/hrms/workflow/recruitment',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      id: 'salary-revisions',
      label: 'Salary Revision',
      route: '/hrms/workflow/salary-revisions',
      iconSvg: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
    },
    {
      id: 'payroll',
      label: 'Payroll Approval',
      route: '/hrms/workflow/payroll',
      iconSvg: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      id: 'expenses',
      label: 'Expense Approval',
      route: '/hrms/workflow/expenses',
      iconSvg: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z'
    },
    {
      id: 'delegation',
      label: 'Delegation',
      route: '/hrms/workflow/delegation',
      iconSvg: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'
    },
    {
      id: 'history',
      label: 'Approval History',
      route: '/hrms/workflow/history',
      iconSvg: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  ];
}
