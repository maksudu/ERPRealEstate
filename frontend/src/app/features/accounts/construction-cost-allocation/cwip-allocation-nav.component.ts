import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-cwip-allocation-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="mb-6 bg-card border border-border rounded-xl p-2 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Submodule Navigation Tabs -->
        <nav class="flex flex-wrap items-center gap-1.5" aria-label="Section 12 Navigation">
          <a
            routerLink="/accounts/construction-cwip"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            [routerLinkActiveOptions]="{ exact: true }"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Cost Allocations (12.1 & 12.2)</span>
          </a>

          <a
            routerLink="/accounts/construction-cwip/material-issues"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Material Issues to CWIP (12.3)</span>
          </a>

          <a
            routerLink="/accounts/construction-cwip/budget-tracking"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Budget vs Actual & Forecasts (12.1)</span>
          </a>
        </nav>

        <!-- Right Action Button -->
        <div class="flex items-center gap-2">
          <a
            routerLink="/accounts/construction-cwip/create"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ New Cost Allocation</span>
          </a>
        </div>
      </div>
    </div>
  `
})
export class CWIPAllocationNavComponent {}
