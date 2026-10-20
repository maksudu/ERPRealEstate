import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface MobileNavTab {
  id: string;
  label: string;
  code: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-mobile-sales-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-5 shadow-2xs">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2.5 px-1">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-xs shadow-xs">
            📱
          </span>
          <div>
            <h1 class="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
              Real Estate Sales Mobile App Suite
            </h1>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Bangladesh Real Estate ERP — Field CRM, Units Availability, Quotes, Site Visits, Bookings & Approvals
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            Real-time Lock Sync
          </span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            Field Force Ready
          </span>
        </div>
      </div>

      <!-- Scrollable Tabs Strip -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        @for (tab of tabs; track tab.id) {
          <a
            [routerLink]="tab.route"
            routerLinkActive="bg-teal-600 text-white font-medium shadow-xs dark:bg-teal-600"
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
export class MobileSalesNavComponent {
  tabs: MobileNavTab[] = [
    { id: 'dashboard', label: 'Sales Dashboard', code: 'MOB-01', route: '/mobile-sales/dashboard' },
    { id: 'leads', label: 'Lead Management', code: 'MOB-02', route: '/mobile-sales/leads' },
    { id: 'customers', label: 'Customer Management', code: 'MOB-03', route: '/mobile-sales/customers' },
    { id: 'properties', label: 'Project & Property', code: 'MOB-04', route: '/mobile-sales/properties' },
    { id: 'quotations', label: 'Quotation Management', code: 'MOB-05', route: '/mobile-sales/quotations' },
    { id: 'site-visits', label: 'Site Visit Management', code: 'MOB-06', route: '/mobile-sales/site-visits' },
    { id: 'bookings', label: 'Booking Management', code: 'MOB-07', route: '/mobile-sales/bookings' },
    { id: 'approvals', label: 'Approval Workflow', code: 'MOB-08', route: '/mobile-sales/approvals' },
    { id: 'notifications', label: 'Notifications', code: 'MOB-09', route: '/mobile-sales/notifications' }
  ];
}
