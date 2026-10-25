import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-statutory-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="space-y-4">
      <!-- Top Statutory Header & Sub-Navigation Bar -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                Bangladesh Labour Act 2006 & Income Tax Act 2023
              </span>
              <span class="text-xs text-slate-500 font-medium">Statutory Compliance Cockpit</span>
            </div>
            <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              HRMS Statutory, Tax & Labour Compliance
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated NBR Section 50 TDS remittance, Form 108 salary tax certificates, DIFE inspection registers, and legal employment contracts.
            </p>
          </div>
        </div>

        <!-- 7 Responsive Navigation Tabs -->
        <nav class="flex items-center gap-1 overflow-x-auto pt-3 scrollbar-thin">
          @for (tab of navTabs; track tab.route) {
            <a
              [routerLink]="tab.route"
              routerLinkActive="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border-emerald-500 dark:border-emerald-500"
              [routerLinkActiveOptions]="{ exact: false }"
              class="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center gap-2 border border-transparent"
            >
              <span>{{ tab.label }}</span>
            </a>
          }
        </nav>
      </div>

      <!-- Nested Page Outlet -->
      <router-outlet></router-outlet>
    </div>
  `
})
export class StatutoryLayoutComponent {
  navTabs = [
    { label: 'Tax Configuration', route: '/hrms/statutory/tax-config' },
    { label: 'Tax Deduction Records (TDS)', route: '/hrms/statutory/tax-deductions' },
    { label: 'Tax Certificates (Form 108)', route: '/hrms/statutory/tax-certificates' },
    { label: 'Statutory Registers (BLA)', route: '/hrms/statutory/registers' },
    { label: 'Employment Contracts', route: '/hrms/statutory/contracts' },
    { label: 'Policy Acknowledgment', route: '/hrms/statutory/policies' },
    { label: 'Audit Documents (DIFE/NBR)', route: '/hrms/statutory/audit-documents' }
  ];
}
