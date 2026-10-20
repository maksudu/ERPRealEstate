import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface MobileSiteNavTab {
  id: string;
  label: string;
  code: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-mobile-site-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-5 shadow-2xs">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2.5 px-1">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white font-bold text-xs shadow-xs">
            🏗️
          </span>
          <div>
            <h1 class="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
              Site Engineer & Construction Mobile App
            </h1>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Bangladesh Real Estate ERP — Field DPR, Requisitions, Geotagged Photos, QC, Contractors & HSE
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Offline Cache Ready
          </span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Field Geotagged
          </span>
        </div>
      </div>

      <!-- Scrollable Tabs Strip -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        @for (tab of tabs; track tab.id) {
          <a
            [routerLink]="tab.route"
            routerLinkActive="bg-amber-600 text-white font-medium shadow-xs dark:bg-amber-600"
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
export class MobileSiteNavComponent {
  tabs: MobileSiteNavTab[] = [
    { id: 'dashboard', label: 'Site Dashboard', code: 'SITE-01', route: '/mobile-site/dashboard' },
    { id: 'dpr', label: 'Daily Progress (DPR)', code: 'SITE-02', route: '/mobile-site/dpr' },
    { id: 'tasks', label: 'Tasks & Milestones', code: 'SITE-03', route: '/mobile-site/tasks' },
    { id: 'requisitions', label: 'Material Requisitions', code: 'SITE-04', route: '/mobile-site/requisitions' },
    { id: 'transactions', label: 'Receiving & Issue', code: 'SITE-05', route: '/mobile-site/transactions' },
    { id: 'photos', label: 'Geotagged Photos', code: 'SITE-06', route: '/mobile-site/photos' },
    { id: 'quality', label: 'Quality Control', code: 'SITE-07', route: '/mobile-site/quality' },
    { id: 'contractors', label: 'Contractor Bills', code: 'SITE-08', route: '/mobile-site/contractors' },
    { id: 'safety', label: 'Safety (HSE)', code: 'SITE-09', route: '/mobile-site/safety' },
    { id: 'offline-sync', label: 'Offline Sync Queue', code: 'SITE-10', route: '/mobile-site/offline-sync' }
  ];
}
