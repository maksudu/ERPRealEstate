import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-container, app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="[variant === 'glass' ? 'glass-card' : 'erp-card', customClass]" class="overflow-hidden">
      <!-- Card Header (Optional) -->
      @if (hasHeader && (title || subtitle)) {
        <div class="px-3.5 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-slate-50/70 dark:bg-slate-850/80">
          <div class="min-w-0 flex-1">
            @if (title) {
              <div class="flex items-center flex-wrap gap-2">
                @if (badge) {
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300/80 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 shrink-0 shadow-2xs">
                    {{ badge }}
                  </span>
                }
                <h2 class="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight leading-normal">
                  {{ title }}
                </h2>
              </div>
            }
            @if (subtitle) {
              <p class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">{{ subtitle }}</p>
            }
          </div>
          <div class="flex items-center gap-2 shrink-0 max-w-full">
            <ng-content select="[card-actions]"></ng-content>
          </div>
        </div>
      }

      <!-- Card Body Content -->
      <div [class]="paddingClass">
        <ng-content></ng-content>
      </div>

      <!-- Card Footer (Optional) -->
      <ng-content select="[card-footer]"></ng-content>
    </div>
  `
})
export class CardContainerComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() badge: string = '';
  @Input() paddingClass: string = 'p-3.5 sm:p-6';
  @Input() variant: string = 'default';
  @Input() hasHeader: boolean = true;
  @Input() customClass: string = '';
}
