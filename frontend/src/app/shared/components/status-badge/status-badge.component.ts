import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'amber';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide shadow-xs border transition-colors"
      [ngClass]="badgeClasses"
      [style.borderColor]="customColor ? customColor + '40' : null"
      [style.backgroundColor]="customColor ? customColor + '15' : null"
      [style.color]="customColor || null"
    >
      @if (showDot) {
        <span 
          class="w-1.5 h-1.5 rounded-full shrink-0"
          [style.backgroundColor]="customColor || dotColor"
          [class.animate-pulse]="pulse"
        ></span>
      }
      <span class="truncate">
        {{ labelEn }}
        @if (labelBn) {
          <span class="text-[10px] opacity-80 ml-0.5">({{ labelBn }})</span>
        }
      </span>
    </span>
  `
})
export class StatusBadgeComponent {
  @Input() labelEn: string = '';
  @Input() labelBn: string = '';
  @Input() variant: StatusVariant = 'neutral';
  @Input() customColor: string | null = null;
  @Input() showDot: boolean = true;
  @Input() pulse: boolean = false;

  get badgeClasses(): string {
    if (this.customColor) {
      return '';
    }
    const variants: Record<StatusVariant, string> = {
      success: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      warning: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      danger: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
      info: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
      purple: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      amber: 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
      neutral: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
    };
    return variants[this.variant] || variants.neutral;
  }

  get dotColor(): string {
    const dots: Record<StatusVariant, string> = {
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
      purple: '#8B5CF6',
      amber: '#F97316',
      neutral: '#64748B'
    };
    return dots[this.variant] || '#64748B';
  }
}
