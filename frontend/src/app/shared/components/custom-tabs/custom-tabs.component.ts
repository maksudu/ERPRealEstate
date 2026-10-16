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
            class="py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2"
            [ngClass]="activeTabId === tab.id ? 'border-emerald-600 text-emerald-700 font-semibold dark:text-emerald-400 dark:border-emerald-400' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'"
          >
            <span>{{ tab.label }}</span>
            @if (tab.count !== undefined) {
              <span 
                class="px-2 py-0.5 text-[10px] rounded-full font-semibold"
                [ngClass]="activeTabId === tab.id ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'"
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
  @Output() tabChange = new EventEmitter<string>();

  selectTab(id: string): void {
    if (this.activeTabId !== id) {
      this.activeTabId = id;
      this.tabChange.emit(id);
    }
  }
}
