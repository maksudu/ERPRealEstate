import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="erp-card overflow-hidden">
      <!-- Card Header (Optional) -->
      @if (title || subtitle) {
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/70 dark:bg-slate-850/80">
          <div>
            @if (title) {
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                @if (badge) {
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    {{ badge }}
                  </span>
                }
                {{ title }}
              </h2>
            }
            @if (subtitle) {
              <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{{ subtitle }}</p>
            }
          </div>
          <div class="flex items-center gap-2">
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
  @Input() paddingClass: string = 'p-6';
  @Input() variant: string = 'default';
}
