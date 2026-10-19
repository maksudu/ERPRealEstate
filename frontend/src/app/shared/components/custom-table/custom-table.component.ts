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
        <div class="p-3 border-b border-border flex items-center justify-between gap-3 bg-muted/50">
          <div class="relative w-full max-w-xs">
            <svg class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              [placeholder]="filterPlaceholder"
              class="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <ng-content select="[table-actions]"></ng-content>
          </div>
        </div>
      }

      <!-- Responsive Table Grid -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-border text-left text-xs">
          <thead class="bg-muted/50 text-foreground font-semibold uppercase tracking-wider">
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
          <tbody class="divide-y divide-border bg-background text-foreground">
            @if (loading) {
              @for (item of [1, 2, 3, 4, 5]; track $index) {
                <tr>
                  @for (col of columns; track col.field) {
                    <td class="px-4 py-3.5">
                      <div class="skeleton-box h-3.5 rounded" [style.width.%]="($index % 2 === 0) ? 80 : 60"></div>
                    </td>
                  }
                </tr>
              }
            } @else {
              <ng-content></ng-content>
            }
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      @if (!loading && totalRecords === 0) {
        <div class="py-12 text-center text-muted-foreground">
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
  @Input() loading: boolean = false;

  @Output() search = new EventEmitter<string>();

  searchQuery: string = '';

  onSearchChange(): void {
    this.search.emit(this.searchQuery);
  }
}
