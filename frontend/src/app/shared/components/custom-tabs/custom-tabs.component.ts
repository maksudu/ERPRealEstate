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
            [class.border-emerald-600]="activeTabId === tab.id"
            [class.text-emerald-600]="activeTabId === tab.id"
            [class.dark:text-emerald-400]="activeTabId === tab.id"
            [class.dark:border-emerald-400]="activeTabId === tab.id"
            [class.border-transparent]="activeTabId !== tab.id"
            [class.text-slate-500]="activeTabId !== tab.id"
            [class.hover:text-slate-700]="activeTabId !== tab.id"
            [class.dark:hover:text-slate-300]="activeTabId !== tab.id"
          >
            <span>{{ tab.label }}</span>
            @if (tab.count !== undefined) {
              <span 
                class="px-2 py-0.5 text-[10px] rounded-full font-semibold"
                [class.bg-emerald-100]="activeTabId === tab.id"
                [class.text-emerald-800]="activeTabId === tab.id"
                [class.dark:bg-emerald-950]="activeTabId === tab.id"
                [class.dark:text-emerald-300]="activeTabId === tab.id"
                [class.bg-slate-100]="activeTabId !== tab.id"
                [class.text-slate-600]="activeTabId !== tab.id"
                [class.dark:bg-slate-800]="activeTabId !== tab.id"
                [class.dark:text-slate-400]="activeTabId !== tab.id"
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
