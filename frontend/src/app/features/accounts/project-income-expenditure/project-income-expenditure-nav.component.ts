import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface Section11NavTab {
  id: string;
  code: string;
  label: string;
  route: string;
  badge?: string;
  iconSvg: string;
}

@Component({
  selector: 'app-project-income-expenditure-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="bg-card border border-border rounded-xl p-3 mb-6 shadow-2xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-1">
        <div class="flex items-center gap-3">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
            11.0
          </span>
          <div>
            <h1 class="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider font-display">
              Project-Wise Income & Expenditure
            </h1>
            <p class="text-[11px] sm:text-xs text-muted-foreground">
              Multi-Project Dimension Tagging, Revenue Recognition, Cost Allocation & 20+ Project Profitability Report
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            20+ Project Portfolio Ready
          </span>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            IFRS 15 & Accrual Reconciled
          </span>
        </div>
      </div>

      <!-- Navigation Tabs Strip -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border">
        @for (tab of tabs; track tab.id) {
          <a
            [routerLink]="tab.route"
            routerLinkActive="bg-emerald-600 text-white font-semibold shadow-xs"
            [routerLinkActiveOptions]="{ exact: false }"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="tab.iconSvg"/>
            </svg>
            <span class="text-[10px] font-bold opacity-80 font-mono">{{ tab.code }}</span>
            <span>{{ tab.label }}</span>
            @if (tab.badge) {
              <span class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/20 text-inherit">
                {{ tab.badge }}
              </span>
            }
          </a>
        }
      </div>
    </div>
  `
})
export class ProjectIncomeExpenditureNavComponent {
  tabs: Section11NavTab[] = [
    {
      id: 'dimensions',
      code: '11.1',
      label: 'Financial Dimensions & Mandatory Rules',
      route: '/accounts/project-income-expenditure/dimensions',
      badge: 'Rules Config',
      iconSvg: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4'
    },
    {
      id: 'income',
      code: '11.2',
      label: 'Project Income Registry',
      route: '/accounts/project-income-expenditure/income',
      badge: 'Revenue Policy',
      iconSvg: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      id: 'expenditure',
      code: '11.3',
      label: 'Project Expenditure Registry',
      route: '/accounts/project-income-expenditure/expenditure',
      badge: 'Cost Breakdown',
      iconSvg: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      id: 'profitability',
      code: '11.4',
      label: 'Project Profitability & Variance Report',
      route: '/accounts/project-income-expenditure/profitability',
      badge: 'PO Reconciled',
      iconSvg: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    }
  ];
}
