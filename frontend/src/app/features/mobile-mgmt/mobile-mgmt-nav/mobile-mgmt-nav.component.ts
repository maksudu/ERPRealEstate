import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mobile-mgmt-nav',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="w-full bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- Brand / Role Badge -->
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-950/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-lg text-slate-800 tracking-tight">Executive Management App</span>
              <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Board & Directorate Level
              </span>
            </div>
            <div class="text-xs text-slate-400 mt-0.5">
              Director: <strong class="text-slate-700">Engr. Maksudul Islam</strong> (Managing Director) • Online
            </div>
          </div>
        </div>

        <!-- Session Status Badges -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <div class="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-semibold whitespace-nowrap">
            Fiscal Period: FY 2026-27
          </div>
          <div class="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold whitespace-nowrap">
            Live EVM Engine: Active
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs font-medium no-scrollbar">
        <a routerLink="/mobile-mgmt/dashboard" [ngClass]="{'bg-slate-900 text-white font-semibold shadow-sm': activeTab === 'dashboard', 'text-slate-600 hover:bg-slate-100': activeTab !== 'dashboard'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          1. Dashboard
        </a>
        <a routerLink="/mobile-mgmt/projects" [ngClass]="{'bg-slate-900 text-white font-semibold shadow-sm': activeTab === 'projects', 'text-slate-600 hover:bg-slate-100': activeTab !== 'projects'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          2. Project Performance
        </a>
        <a routerLink="/mobile-mgmt/sales-analytics" [ngClass]="{'bg-slate-900 text-white font-semibold shadow-sm': activeTab === 'sales-analytics', 'text-slate-600 hover:bg-slate-100': activeTab !== 'sales-analytics'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          3. Sales Analytics
        </a>
        <a routerLink="/mobile-mgmt/cashflow" [ngClass]="{'bg-slate-900 text-white font-semibold shadow-sm': activeTab === 'cashflow', 'text-slate-600 hover:bg-slate-100': activeTab !== 'cashflow'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          4. Cash Flow
        </a>
        <a routerLink="/mobile-mgmt/approvals" [ngClass]="{'bg-slate-900 text-white font-semibold shadow-sm': activeTab === 'approvals', 'text-slate-600 hover:bg-slate-100': activeTab !== 'approvals'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          5. Approval Center
        </a>
        <a routerLink="/mobile-mgmt/procurement" [ngClass]="{'bg-slate-900 text-white font-semibold shadow-sm': activeTab === 'procurement', 'text-slate-600 hover:bg-slate-100': activeTab !== 'procurement'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          6. Procurement
        </a>
        <a routerLink="/mobile-mgmt/construction" [ngClass]="{'bg-slate-900 text-white font-semibold shadow-sm': activeTab === 'construction', 'text-slate-600 hover:bg-slate-100': activeTab !== 'construction'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          7. Construction Monitoring
        </a>
        <a routerLink="/mobile-mgmt/hr-overview" [ngClass]="{'bg-slate-900 text-white font-semibold shadow-sm': activeTab === 'hr-overview', 'text-slate-600 hover:bg-slate-100': activeTab !== 'hr-overview'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          8. HR Overview
        </a>
        <a routerLink="/mobile-mgmt/compliance" [ngClass]="{'bg-slate-900 text-white font-semibold shadow-sm': activeTab === 'compliance', 'text-slate-600 hover:bg-slate-100': activeTab !== 'compliance'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          9. Compliance Alerts
        </a>
        <a routerLink="/mobile-mgmt/reports" [ngClass]="{'bg-slate-900 text-white font-semibold shadow-sm': activeTab === 'reports', 'text-slate-600 hover:bg-slate-100': activeTab !== 'reports'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          10. Reports & Summaries
        </a>
      </nav>
    </header>
  `
})
export class MobileMgmtNavComponent {
  @Input() activeTab: string = 'dashboard';
}
