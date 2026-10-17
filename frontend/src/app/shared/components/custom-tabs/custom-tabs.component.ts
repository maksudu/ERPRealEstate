import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: string;
}

@Component({
  selector: 'app-custom-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="border-b border-slate-200 dark:border-slate-800">
      <nav class="flex space-x-1 sm:space-x-4" aria-label="Tabs">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            (click)="selectTab(tab.id)"
            class="py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2"
            [ngClass]="activeTabId === tab.id ? activeTabClass : inactiveTabClass"
          >
            <span>{{ tab.label }}</span>
            @if (tab.count !== undefined) {
              <span 
                class="px-2 py-0.5 text-[10px] rounded-full font-bold shadow-2xs"
                [ngClass]="activeTabId === tab.id ? activeBadgeClass : inactiveBadgeClass"
              >
                {{ tab.count }}
              </span>
            }
          </button>
        }
      </nav>
    </div>
  `
})
export class CustomTabsComponent {
  @Input({ required: true }) tabs: TabItem[] = [];
  @Input() activeTabId: string = '';
  @Input() variant: 'emerald' | 'gold' | 'luxury' = 'gold';
  @Output() tabChange = new EventEmitter<string>();

  get activeTabClass(): string {
    if (this.variant === 'emerald') {
      return 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-400 font-bold';
    }
    return 'border-amber-500 text-amber-700 dark:text-amber-400 dark:border-amber-400 font-bold';
  }

  get inactiveTabClass(): string {
    return 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium';
  }

  get activeBadgeClass(): string {
    if (this.variant === 'emerald') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    }
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60';
  }

  get inactiveBadgeClass(): string {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }

  selectTab(id: string): void {
    if (this.activeTabId !== id) {
      this.activeTabId = id;
      this.tabChange.emit(id);
    }
  }
}
