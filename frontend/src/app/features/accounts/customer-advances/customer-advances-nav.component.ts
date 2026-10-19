import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-customer-advances-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="mb-6 bg-card border border-border rounded-xl p-2 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Submodule Navigation Tabs -->
        <nav class="flex flex-wrap items-center gap-1.5" aria-label="Section 13 Navigation">
          <a
            routerLink="/accounts/customer-advances"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            [routerLinkActiveOptions]="{ exact: true }"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <i class="ri-hand-coin-line text-sm"></i>
            <span>Advance Receipts (13.1)</span>
          </a>

          <a
            routerLink="/accounts/customer-advances/liability-ledger"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <i class="ri-book-read-line text-sm"></i>
            <span>Liability Ledger (13.1.4)</span>
          </a>

          <a
            routerLink="/accounts/customer-advances/allocations"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <i class="ri-split-cells-vertical text-sm"></i>
            <span>Installment Allocations (13.1.5)</span>
          </a>

          <a
            routerLink="/accounts/customer-advances/adjustments"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <i class="ri-percent-line text-sm"></i>
            <span>Late Charges & Waivers (13.1.6)</span>
          </a>

          <a
            routerLink="/accounts/customer-advances/refunds"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <i class="ri-refund-2-line text-sm"></i>
            <span>Cancellations & Refunds (13.1.7)</span>
          </a>

          <a
            routerLink="/accounts/customer-advances/aging"
            routerLinkActive="bg-primary text-primary-foreground shadow-xs font-semibold"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150">
            <i class="ri-calendar-schedule-line text-sm"></i>
            <span>Aging Reconciliation (13.1.10)</span>
          </a>
        </nav>

        <!-- Right Action Button -->
        <div class="flex items-center gap-2">
          <a
            routerLink="/accounts/customer-advances/create"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs transition-colors">
            <i class="ri-add-line text-sm"></i>
            <span>+ Record Advance</span>
          </a>
        </div>
      </div>
    </div>
  `
})
export class CustomerAdvancesNavComponent {
  @Input() activeSection: string = 'advances';
}
