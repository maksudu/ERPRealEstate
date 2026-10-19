import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavTabItem {
  id: string;
  num: string;
  label: string;
  route: string;
  iconSvg: string;
}

@Component({
  selector: 'app-installments-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mb-4 overflow-hidden shadow-xs">
      <div class="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border-b border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Bangladesh Real Estate ERP
              </span>
              <span class="text-xs text-slate-400">BDT (৳) Currency Standard</span>
            </div>
            <h1 class="text-base sm:text-lg font-bold text-white tracking-tight">
              Installment & Collection Management Suite
            </h1>
          </div>
        </div>
        <div class="text-right hidden sm:block">
          <span class="text-xs text-slate-400">12 Submodules Lifecycle Breakdown</span>
          <p class="text-xs font-semibold text-emerald-400">Booking → Down Payment → Amortization → Recovery</p>
        </div>
      </div>

      <!-- Scrollable 12 Submenus Tabs -->
      <div class="overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <nav class="flex items-center min-w-max px-2 py-1 gap-1 text-xs">
          @for (tab of navTabs; track tab.id) {
            <a
              [routerLink]="tab.route"
              routerLinkActive="bg-emerald-600 text-white shadow-xs font-semibold"
              [routerLinkActiveOptions]="{ exact: false }"
              class="px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <span class="text-[10px] opacity-75 font-mono px-1 py-0.2 rounded bg-black/10 dark:bg-white/10">{{ tab.num }}</span>
              <span>{{ tab.label }}</span>
            </a>
          }
        </nav>
      </div>
    </div>
  `,
  styles: [`
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class InstallmentsNavComponent {
  navTabs: NavTabItem[] = [
    { id: 'setup', num: '01', label: 'Payment Setup', route: '/installments/payment-setup', iconSvg: '' },
    { id: 'booking', num: '02', label: 'Booking Money', route: '/installments/booking-money', iconSvg: '' },
    { id: 'dp', num: '03', label: 'Down Payment', route: '/installments/down-payment', iconSvg: '' },
    { id: 'schedule', num: '04', label: 'Installment Schedules', route: '/installments/schedules', iconSvg: '' },
    { id: 'collection', num: '05', label: 'Collections', route: '/installments/collections', iconSvg: '' },
    { id: 'due', num: '06', label: 'Due & Overdue', route: '/installments/due-overdue', iconSvg: '' },
    { id: 'latefee', num: '07', label: 'Late Fee & Rebate', route: '/installments/late-fee-rebate', iconSvg: '' },
    { id: 'reschedule', num: '08', label: 'Rescheduling', route: '/installments/rescheduling', iconSvg: '' },
    { id: 'cheques', num: '09', label: 'Cheque Mgmt', route: '/installments/cheques', iconSvg: '' },
    { id: 'ledger', num: '10', label: 'Customer Ledger', route: '/installments/customer-ledger', iconSvg: '' },
    { id: 'refund', num: '11', label: 'Refund & Adjustment', route: '/installments/refund-adjustment', iconSvg: '' },
    { id: 'reports', num: '12', label: 'Reports & Dashboard', route: '/installments/reports-dashboard', iconSvg: '' },
  ];
}
