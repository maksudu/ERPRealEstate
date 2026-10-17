import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DataTableColumn {
  field: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  visible?: boolean;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full space-y-3">
      <!-- Toolbar: Multi-Column Search, Column Toggle, Export Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl">
        <!-- Search Input -->
        <div class="relative w-full sm:w-72">
          <svg class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Search all columns..."
            class="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <!-- Actions: Selected count, Column Toggle, Export Button, Custom Action Slot -->
        <div class="flex items-center gap-2 self-end sm:self-auto">
          @if (selectedRows().size > 0) {
            <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950">
              {{ selectedRows().size }} selected
            </span>
          }

          <!-- Column Visibility Dropdown Toggle -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleColMenu()"
              class="erp-button-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
              title="Show/Hide Columns"
            >
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
              </svg>
              <span>Columns</span>
            </button>

            @if (isColMenuOpen()) {
              <div 
                class="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 p-2 space-y-1"
                (click)="$event.stopPropagation()"
              >
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Toggle Columns</div>
                @for (col of allColumns(); track col.field) {
                  <label class="flex items-center gap-2 px-2 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer text-slate-700 dark:text-slate-300">
                    <input 
                      type="checkbox" 
                      [checked]="col.visible !== false"
                      (change)="toggleColumn(col.field)"
                      class="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{{ col.header }}</span>
                  </label>
                }
              </div>
            }
          </div>

          <!-- Export to CSV / Excel Button -->
          <button
            type="button"
            (click)="exportToCSV()"
            class="erp-button-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            title="Export Table Data to CSV/Excel"
          >
            <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span>Export CSV</span>
          </button>

          <ng-content select="[table-actions]"></ng-content>
        </div>
      </div>

      <!-- Data Table Card Container -->
      <div class="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
            <thead class="bg-slate-100/80 dark:bg-slate-850 text-slate-800 dark:text-slate-200 font-semibold uppercase tracking-wider select-none">
              <tr>
                @if (selectable) {
                  <th scope="col" class="w-10 px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      [checked]="isAllSelected()"
                      (change)="toggleSelectAll()"
                      class="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                }

                @for (col of visibleColumns(); track col.field) {
                  <th
                    scope="col"
                    class="px-4 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    [style.width]="col.width"
                    [class.cursor-pointer]="col.sortable !== false"
                    [class.text-left]="!col.align || col.align === 'left'"
                    [class.text-center]="col.align === 'center'"
                    [class.text-right]="col.align === 'right'"
                    (click)="sort(col.field)"
                  >
                    <div class="inline-flex items-center gap-1.5">
                      <span>{{ col.header }}</span>
                      @if (sortField() === col.field) {
                        <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                          {{ sortDirection() === 'asc' ? '▲' : '▼' }}
                        </span>
                      }
                    </div>
                  </th>
                }
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              @if (loading) {
                @for (item of [1, 2, 3, 4, 5]; track $index) {
                  <tr>
                    @if (selectable) {
                      <td class="px-4 py-3.5 text-center">
                        <div class="skeleton-box w-4 h-4 rounded mx-auto"></div>
                      </td>
                    }
                    @for (col of visibleColumns(); track col.field) {
                      <td class="px-4 py-3.5">
                        <div class="skeleton-box h-3.5 rounded" [style.width.%]="($index % 2 === 0) ? 75 : 60"></div>
                      </td>
                    }
                  </tr>
                }
              } @else if (paginatedData().length > 0) {
                @for (row of paginatedData(); track row.id || $index) {
                  <tr 
                    class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                    [class.bg-emerald-50]="isSelected(row)"
                  >
                    @if (selectable) {
                      <td class="px-4 py-3 text-center">
                        <input 
                          type="checkbox" 
                          [checked]="isSelected(row)"
                          (change)="toggleRowSelection(row)"
                          class="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                    }

                    @for (col of visibleColumns(); track col.field) {
                      <td
                        class="px-4 py-3"
                        [class.text-left]="!col.align || col.align === 'left'"
                        [class.text-center]="col.align === 'center'"
                        [class.text-right]="col.align === 'right'"
                      >
                        {{ row[col.field] ?? '—' }}
                      </td>
                    }
                  </tr>
                }
              } @else {
                <tr>
                  <td [attr.colspan]="visibleColumns().length + (selectable ? 1 : 0)" class="py-12 text-center text-slate-400 dark:text-slate-500">
                    <svg class="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p class="text-xs font-medium">No records match your filters</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        <div class="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              [ngModel]="pageSize()"
              (ngModelChange)="setPageSize($event)"
              class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option [ngValue]="10">10</option>
              <option [ngValue]="25">25</option>
              <option [ngValue]="50">50</option>
              <option [ngValue]="100">100</option>
            </select>
            <span>Showing {{ pageStart() }} to {{ pageEnd() }} of {{ filteredData().length }} entries</span>
          </div>

          <!-- Page Navigation Buttons -->
          <div class="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              [disabled]="currentPage() === 1"
              (click)="setPage(currentPage() - 1)"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span class="px-3 py-1 font-semibold text-slate-800 dark:text-slate-200">
              {{ currentPage() }} / {{ totalPages() || 1 }}
            </span>
            <button
              type="button"
              [disabled]="currentPage() >= totalPages()"
              (click)="setPage(currentPage() + 1)"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DataTableComponent {
  @Input({ required: true }) set columns(cols: DataTableColumn[]) {
    this.allColumns.set(cols.map(c => ({ ...c, visible: c.visible !== false })));
  }
  @Input() set data(rows: any[]) {
    this.rawData.set(rows || []);
  }
  @Input() selectable: boolean = false;
  @Input() exportFileName: string = 'export_data';
  @Input() loading: boolean = false;

  @Output() rowSelectionChange = new EventEmitter<any[]>();

  // State Signals
  allColumns = signal<DataTableColumn[]>([]);
  rawData = signal<any[]>([]);
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  sortField = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc'>('asc');
  isColMenuOpen = signal<boolean>(false);
  selectedRows = signal<Set<any>>(new Set());

  // Visible Columns
  visibleColumns = computed(() => this.allColumns().filter(c => c.visible !== false));

  // Filtered Data
  filteredData = computed(() => {
    let rows = this.rawData();
    const query = this.searchQuery().trim().toLowerCase();

    if (query) {
      rows = rows.filter(row => {
        return Object.values(row).some(val => 
          val !== null && val !== undefined && String(val).toLowerCase().includes(query)
        );
      });
    }

    // Sort
    const field = this.sortField();
    const dir = this.sortDirection();
    if (field) {
      rows = [...rows].sort((a, b) => {
        const valA = a[field] ?? '';
        const valB = b[field] ?? '';
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return rows;
  });

  // Total Pages
  totalPages = computed(() => Math.ceil(this.filteredData().length / this.pageSize()));

  // Paginated Slices
  paginatedData = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredData().slice(start, start + this.pageSize());
  });

  pageStart = computed(() => {
    if (this.filteredData().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  pageEnd = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredData().length);
  });

  // Actions
  onSearchChange(): void {
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  sort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  toggleColMenu(): void {
    this.isColMenuOpen.update(v => !v);
  }

  toggleColumn(field: string): void {
    this.allColumns.update(cols =>
      cols.map(c => c.field === field ? { ...c, visible: !c.visible } : c)
    );
  }

  // Row Selection
  isSelected(row: any): boolean {
    return this.selectedRows().has(row);
  }

  toggleRowSelection(row: any): void {
    const updated = new Set(this.selectedRows());
    if (updated.has(row)) {
      updated.delete(row);
    } else {
      updated.add(row);
    }
    this.selectedRows.set(updated);
    this.rowSelectionChange.emit(Array.from(updated));
  }

  isAllSelected(): boolean {
    const pageRows = this.paginatedData();
    if (pageRows.length === 0) return false;
    return pageRows.every(r => this.selectedRows().has(r));
  }

  toggleSelectAll(): void {
    const updated = new Set(this.selectedRows());
    const pageRows = this.paginatedData();
    if (this.isAllSelected()) {
      pageRows.forEach(r => updated.delete(r));
    } else {
      pageRows.forEach(r => updated.add(r));
    }
    this.selectedRows.set(updated);
    this.rowSelectionChange.emit(Array.from(updated));
  }

  // CSV Export
  exportToCSV(): void {
    const cols = this.visibleColumns();
    const rows = this.filteredData();

    const headerRow = cols.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',');
    const dataRows = rows.map(row => {
      return cols.map(c => {
        const val = row[c.field] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [headerRow, ...dataRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.exportFileName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
