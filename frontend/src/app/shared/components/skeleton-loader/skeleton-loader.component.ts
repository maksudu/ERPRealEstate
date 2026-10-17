import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonType = 'table' | 'cards' | 'chart' | 'detail' | 'form';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-4 animate-fade-in" [class]="containerClass">
      <!-- TABLE SKELETON -->
      @if (type === 'table') {
        <div class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
          <!-- Table Header Skeleton -->
          <div class="p-3.5 bg-slate-50/80 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div class="skeleton-box h-4 w-48 rounded"></div>
            <div class="flex items-center gap-2">
              <div class="skeleton-box h-8 w-24 rounded-lg"></div>
              <div class="skeleton-box h-8 w-28 rounded-lg"></div>
            </div>
          </div>
          <!-- Table Columns Header -->
          <div class="grid grid-cols-6 gap-4 px-4 py-3 bg-slate-100/50 dark:bg-slate-850/40 border-b border-slate-200/80 dark:border-slate-800/80">
            @for (col of getArray(columns); track $index) {
              <div class="skeleton-box h-3 rounded" [class.col-span-2]="$index === 0"></div>
            }
          </div>
          <!-- Table Rows Skeleton -->
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (row of getArray(rows); track $index) {
              <div class="grid grid-cols-6 gap-4 px-4 py-3.5 items-center">
                @for (col of getArray(columns); track $index) {
                  <div 
                    class="skeleton-box h-3.5 rounded"
                    [class.col-span-2]="$index === 0"
                    [style.width.%]="$index === 0 ? 80 : 65"
                  ></div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- KPI METRIC CARDS SKELETON -->
      @if (type === 'cards') {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          @for (card of getArray(count); track $index) {
            <div class="erp-card p-5 space-y-3">
              <div class="flex items-center justify-between">
                <div class="skeleton-box h-3.5 w-24 rounded"></div>
                <div class="skeleton-box h-8 w-8 rounded-lg"></div>
              </div>
              <div class="skeleton-box h-7 w-32 rounded"></div>
              <div class="flex items-center gap-2 pt-1">
                <div class="skeleton-box h-3 w-16 rounded-full"></div>
                <div class="skeleton-box h-3 w-28 rounded"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- CHART SKELETON -->
      @if (type === 'chart') {
        <div class="erp-card p-5 space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-1.5">
              <div class="skeleton-box h-4 w-40 rounded"></div>
              <div class="skeleton-box h-3 w-56 rounded"></div>
            </div>
            <div class="flex items-center gap-2">
              <div class="skeleton-box h-7 w-16 rounded-lg"></div>
              <div class="skeleton-box h-7 w-16 rounded-lg"></div>
            </div>
          </div>
          <!-- Bar/Chart Area Placeholder -->
          <div class="h-64 flex items-end justify-between gap-3 pt-6 px-2">
            @for (bar of [45, 68, 32, 85, 92, 55, 76, 60, 88, 42]; track $index) {
              <div class="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div class="skeleton-box w-full rounded-t" [style.height.%]="bar"></div>
                <div class="skeleton-box h-2.5 w-6 rounded"></div>
              </div>
            }
          </div>
        </div>
      }

      <!-- DETAIL VIEW SKELETON -->
      @if (type === 'detail') {
        <div class="erp-card p-6 space-y-6">
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="skeleton-box h-12 w-12 rounded-xl"></div>
              <div class="space-y-2">
                <div class="skeleton-box h-5 w-48 rounded"></div>
                <div class="skeleton-box h-3.5 w-32 rounded"></div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="skeleton-box h-8 w-20 rounded-lg"></div>
              <div class="skeleton-box h-8 w-24 rounded-lg"></div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (item of getArray(6); track $index) {
              <div class="space-y-2">
                <div class="skeleton-box h-3 w-20 rounded"></div>
                <div class="skeleton-box h-4 w-36 rounded"></div>
              </div>
            }
          </div>
        </div>
      }

      <!-- FORM SKELETON -->
      @if (type === 'form') {
        <div class="erp-card p-6 space-y-5">
          <div class="skeleton-box h-5 w-44 rounded mb-2"></div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (input of getArray(rows); track $index) {
              <div class="space-y-1.5">
                <div class="skeleton-box h-3 w-24 rounded"></div>
                <div class="skeleton-box h-9 w-full rounded-lg"></div>
              </div>
            }
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div class="skeleton-box h-9 w-20 rounded-lg"></div>
            <div class="skeleton-box h-9 w-28 rounded-lg"></div>
          </div>
        </div>
      }
    </div>
  `
})
export class SkeletonLoaderComponent {
  @Input() type: SkeletonType = 'table';
  @Input() rows: number = 5;
  @Input() columns: number = 4;
  @Input() count: number = 4;
  @Input() containerClass: string = '';

  getArray(length: number): number[] {
    return Array.from({ length }, (_, i) => i);
  }
}
