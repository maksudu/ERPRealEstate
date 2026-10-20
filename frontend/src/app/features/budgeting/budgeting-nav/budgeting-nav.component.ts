import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface BudgetingNavTab {
  id: string;
  label: string;
  code: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-budgeting-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-5 shadow-2xs">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2.5 px-1">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
            ৳
          </span>
          <div>
            <h1 class="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
              Budgeting & Cost Control Module
            </h1>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Bangladesh Real Estate ERP — Construction BOQ, Cost Allocation, Approvals, Variations & Cost-to-Complete
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            12 Submodules Active
          </span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Hard Budget Locks Enabled
          </span>
        </div>
      </div>

      <!-- Scrollable Tabs Strip -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        @for (tab of tabs; track tab.id) {
          <a
            [routerLink]="tab.route"
            routerLinkActive="bg-emerald-600 text-white font-medium shadow-xs dark:bg-emerald-600"
            [routerLinkActiveOptions]="{ exact: false }"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-normal whitespace-nowrap transition-colors duration-150 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent"
          >
            <span class="text-[10px] font-bold opacity-80 font-mono">{{ tab.code }}</span>
            <span>{{ tab.label }}</span>
            @if (tab.badge) {
              <span class="ml-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-white/20 text-inherit">
                {{ tab.badge }}
              </span>
            }
          </a>
        }
      </div>
    </div>
  `
})
export class BudgetingNavComponent {
  @Input() activeCode: string = '';

  tabs: BudgetingNavTab[] = [
    { id: 'dash', label: 'Dashboard', code: '1.0', route: '/budgeting/dashboard' },
    { id: 'plan', label: 'Budget Planning', code: '2.0', route: '/budgeting/planning' },
    { id: 'proj-budget', label: 'Project Budget', code: '3.0', route: '/budgeting/project-budget' },
    { id: 'boq', label: 'BOQ Budget', code: '4.0', route: '/budgeting/boq-budget' },
    { id: 'alloc', label: 'Cost Allocation', code: '5.0', route: '/budgeting/cost-allocation' },
    { id: 'approval', label: 'Budget Approval', code: '6.0', route: '/budgeting/budget-approval' },
    { id: 'purchase-ctrl', label: 'Purchase Control', code: '7.0', route: '/budgeting/purchase-control' },
    { id: 'expense-ctrl', label: 'Expense Control', code: '8.0', route: '/budgeting/expense-control' },
    { id: 'variation', label: 'Budget Variation', code: '9.0', route: '/budgeting/budget-variation' },
    { id: 'vs-actual', label: 'Budget vs Actual', code: '10.0', route: '/budgeting/budget-vs-actual' },
    { id: 'forecast', label: 'Forecasting', code: '11.0', route: '/budgeting/forecasting' },
    { id: 'reports', label: 'Reports', code: '12.0', route: '/budgeting/reports', badge: '10' }
  ];
}
