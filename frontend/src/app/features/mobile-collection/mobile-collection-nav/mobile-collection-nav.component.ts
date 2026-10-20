import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mobile-collection-nav',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="w-full bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- Brand / Role Badge -->
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-amber-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-lg text-slate-800 tracking-tight">Collection App Suite</span>
              <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Recovery & Financial Control
              </span>
            </div>
            <div class="text-xs text-slate-400 mt-0.5">
              Collector: <strong class="text-slate-600">Maksudul Islam</strong> (Dhaka North Hub) • Online
            </div>
          </div>
        </div>

        <!-- Session / Quick Status -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <div class="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 whitespace-nowrap">
            Verification: <strong class="text-amber-600">Maker-Checker Active</strong>
          </div>
          <div class="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-xs text-emerald-700 font-semibold whitespace-nowrap">
            Auto-Sync: Connected
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs font-medium no-scrollbar">
        <a routerLink="/mobile-collection/dashboard" [ngClass]="{'bg-amber-600 text-white font-semibold shadow-sm': activeTab === 'dashboard', 'text-slate-600 hover:bg-slate-100': activeTab !== 'dashboard'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          1. Dashboard
        </a>
        <a routerLink="/mobile-collection/customers" [ngClass]="{'bg-amber-600 text-white font-semibold shadow-sm': activeTab === 'customers', 'text-slate-600 hover:bg-slate-100': activeTab !== 'customers'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          2. Customer Search
        </a>
        <a routerLink="/mobile-collection/schedules" [ngClass]="{'bg-amber-600 text-white font-semibold shadow-sm': activeTab === 'schedules', 'text-slate-600 hover:bg-slate-100': activeTab !== 'schedules'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          3. Installment Schedule
        </a>
        <a routerLink="/mobile-collection/due-overdue" [ngClass]="{'bg-amber-600 text-white font-semibold shadow-sm': activeTab === 'due-overdue', 'text-slate-600 hover:bg-slate-100': activeTab !== 'due-overdue'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          4. Due & Overdue
        </a>
        <a routerLink="/mobile-collection/payments" [ngClass]="{'bg-amber-600 text-white font-semibold shadow-sm': activeTab === 'payments', 'text-slate-600 hover:bg-slate-100': activeTab !== 'payments'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          5. Payment Entry
        </a>
        <a routerLink="/mobile-collection/receipts" [ngClass]="{'bg-amber-600 text-white font-semibold shadow-sm': activeTab === 'receipts', 'text-slate-600 hover:bg-slate-100': activeTab !== 'receipts'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          6. Receipt Generator
        </a>
        <a routerLink="/mobile-collection/ledger" [ngClass]="{'bg-amber-600 text-white font-semibold shadow-sm': activeTab === 'ledger', 'text-slate-600 hover:bg-slate-100': activeTab !== 'ledger'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          7. Customer Ledger
        </a>
        <a routerLink="/mobile-collection/loans" [ngClass]="{'bg-amber-600 text-white font-semibold shadow-sm': activeTab === 'loans', 'text-slate-600 hover:bg-slate-100': activeTab !== 'loans'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          8. Bank Loan Tracking
        </a>
        <a routerLink="/mobile-collection/approvals" [ngClass]="{'bg-amber-600 text-white font-semibold shadow-sm': activeTab === 'approvals', 'text-slate-600 hover:bg-slate-100': activeTab !== 'approvals'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          9. Approval Workflow
        </a>
        <a routerLink="/mobile-collection/reports" [ngClass]="{'bg-amber-600 text-white font-semibold shadow-sm': activeTab === 'reports', 'text-slate-600 hover:bg-slate-100': activeTab !== 'reports'}" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap">
          10. Collection Reports
        </a>
      </nav>
    </header>
  `
})
export class MobileCollectionNavComponent {
  @Input() activeTab: string = 'dashboard';
}
