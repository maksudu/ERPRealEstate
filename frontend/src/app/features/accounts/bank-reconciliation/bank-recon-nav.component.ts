import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-bank-recon-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- Module Branding Title -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                Section 15 • IFRS-15 & Audit Control
              </span>
              <span class="text-xs font-medium text-slate-400">Bangladesh Real Estate Developer ERP</span>
            </div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Bank Reconciliation & MFS Settlement Engine
            </h2>
          </div>
        </div>

        <!-- Submodule Navigation Tabs -->
        <nav class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <a
            routerLink="/accounts/bank-reconciliation"
            routerLinkActive="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold border-indigo-200 dark:border-indigo-800"
            [routerLinkActiveOptions]="{ exact: true }"
            class="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-transparent transition-all whitespace-nowrap flex items-center gap-1.5">
            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            15.1 Reconciliation Sessions
          </a>

          <a
            routerLink="/accounts/bank-reconciliation/import"
            routerLinkActive="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold border-indigo-200 dark:border-indigo-800"
            class="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-transparent transition-all whitespace-nowrap flex items-center gap-1.5">
            <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            15.1 Import Statement (CSV/Excel)
          </a>

          <a
            routerLink="/accounts/bank-reconciliation/mfs-settlements"
            routerLinkActive="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold border-indigo-200 dark:border-indigo-800"
            class="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-transparent transition-all whitespace-nowrap flex items-center gap-1.5">
            <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            15.1 MFS Settlement Batches
          </a>

          <a
            routerLink="/accounts/bank-reconciliation/reports"
            routerLinkActive="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold border-indigo-200 dark:border-indigo-800"
            class="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-transparent transition-all whitespace-nowrap flex items-center gap-1.5">
            <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            15.1 Official BRS Statements
          </a>
        </nav>
      </div>
    </div>
  `
})
export class BankReconNavComponent {}
