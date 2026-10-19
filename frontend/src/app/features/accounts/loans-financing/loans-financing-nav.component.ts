import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-loans-financing-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="mb-6 bg-card border border-border rounded-xl p-2 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Submodule Navigation Tabs -->
        <nav class="flex flex-wrap items-center gap-1.5" aria-label="Section 14 Loans Navigation">
          <a
            routerLink="/accounts/loans-financing"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            [routerLinkActiveOptions]="{ exact: true }"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Facilities Portfolio (14.1)</span>
          </a>

          <a
            routerLink="/accounts/loans-financing/disbursements"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            <span>Disbursements & Vouchers (14.2)</span>
          </a>

          <a
            routerLink="/accounts/loans-financing/repayments"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
            <span>Repayments & Waterfall (14.3)</span>
          </a>

          <a
            routerLink="/accounts/loans-financing/interest-cwip"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
            <span>Interest Accruals & IAS 23 CWIP (14.3)</span>
          </a>
        </nav>

        <!-- Right Action Button -->
        <div class="flex items-center gap-2">
          <a
            routerLink="/accounts/loans-financing/create"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ New Facility</span>
          </a>
        </div>
      </div>
    </div>
  `
})
export class LoansFinancingNavComponent {}
