import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TableColumn {
  field: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

@Component({
  selector: 'app-custom-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full">
      <!-- Table Filter Bar (Optional) -->
      @if (showFilter) {
        <div class="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850">
          <div class="relative w-full max-w-xs">
            <svg class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              [placeholder]="filterPlaceholder"
              class="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <ng-content select="[table-actions]"></ng-content>
          </div>
        </div>
      }

      <!-- Responsive Table Grid -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
          <thead class="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              @for (col of columns; track col.field) {
                <th
                  scope="col"
                  class="px-4 py-3"
                  [style.width]="col.width"
                  [class.text-left]="!col.align || col.align === 'left'"
                  [class.text-center]="col.align === 'center'"
                  [class.text-right]="col.align === 'right'"
                >
                  {{ col.header }}
                </th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
            <ng-content></ng-content>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      @if (totalRecords === 0) {
        <div class="py-12 text-center text-slate-400 dark:text-slate-500">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
          <p class="text-sm font-medium">{{ emptyMessage }}</p>
        </div>
      }
    </div>
  `
})
export class CustomTableComponent {
  @Input({ required: true }) columns: TableColumn[] = [];
  @Input() totalRecords: number = 0;
  @Input() emptyMessage: string = 'No records found';
  @Input() showFilter: boolean = false;
  @Input() filterPlaceholder: string = 'Search...';

  @Output() search = new EventEmitter<string>();

  searchQuery: string = '';

  onSearchChange(): void {
    this.search.emit(this.searchQuery);
  }
}
