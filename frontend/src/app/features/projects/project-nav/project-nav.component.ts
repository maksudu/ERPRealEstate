import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ProjectNavTab {
  id: string;
  label: string;
  code: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-project-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 mb-5 shadow-2xs">
      <div class="flex items-center justify-between gap-3 mb-2 px-1">
        <div class="flex items-center gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
            2.0
          </span>
          <div>
            <h1 class="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
              Project Development & Spatial Master Suite
            </h1>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Centralized Enterprise Suite for Real Estate Construction, Feasibility, Permitting & Handover
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            15 Integrated Submodules
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
export class ProjectNavComponent {
  @Input() activeCode: string = '2.1';

  tabs: ProjectNavTab[] = [
    { id: 'master', code: '2.1', label: 'Registration & Master', route: '/projects/master' },
    { id: 'feasibility', code: '2.2', label: 'Feasibility & ROI', route: '/projects/feasibility', badge: 'Viability' },
    { id: 'land-alloc', code: '2.3', label: 'Land Allocation', route: '/projects/land-allocation' },
    { id: 'towers-units', code: '2.4', label: 'Towers & Units', route: '/projects/towers-units' },
    { id: 'budget', code: '2.5', label: 'Budget Planning', route: '/projects/budget-planning' },
    { id: 'profit-roi', code: '2.6', label: 'Profitability & EVM', route: '/projects/profitability-roi' },
    { id: 'timeline', code: '2.7', label: 'Timeline & Milestones', route: '/projects/timeline-milestones' },
    { id: 'regulatory', code: '2.8', label: 'Regulatory Approvals', route: '/projects/regulatory-approvals', badge: 'RAJUK' },
    { id: 'drawings', code: '2.9', label: 'Drawings & IFC', route: '/projects/drawings-documents' },
    { id: 'construction', code: '2.10', label: 'Construction Progress', route: '/projects/construction-monitoring' },
    { id: 'risks', code: '2.11', label: 'Risk & Issues', route: '/projects/risk-issues' },
    { id: 'change-orders', code: '2.12', label: 'Change Orders', route: '/projects/change-orders' },
    { id: 'financial', code: '2.13', label: 'Financial Performance', route: '/projects/financial-performance' },
    { id: 'reports', code: '2.14', label: 'Reports & Dashboard', route: '/projects/reports-dashboard' },
    { id: 'handover', code: '2.15', label: 'Handover & Closure', route: '/projects/handover-closure' }
  ];
}
