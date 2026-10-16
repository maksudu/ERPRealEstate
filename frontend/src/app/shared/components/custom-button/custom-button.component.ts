import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dashed' | 'outline' | 'ghost';

@Component({
  selector: 'app-button, app-custom-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      (click)="onClick($event)"
      [ngClass]="buttonClasses"
    >
      @if (loading) {
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      }
      <ng-content></ng-content>
    </button>
  `
})
export class CustomButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() fullWidth: boolean = false;

  @Output() btnClick = new EventEmitter<MouseEvent>();
  @Output() clicked = new EventEmitter<MouseEvent>();
  @Output() buttonClick = new EventEmitter<MouseEvent>();

  get buttonClasses(): string {
    const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-lg transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';
    
    // Size tokens with consistent heights
    const sizeMap = {
      sm: 'px-3 py-1.5 text-xs h-8',
      md: 'px-4 py-2 text-sm h-9',
      lg: 'px-5 py-2.5 text-base h-10'
    };

    // Variant tokens
    const variantMap: Record<ButtonVariant, string> = {
      primary: 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500/30 shadow-sm',
      secondary: 'text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 focus:ring-slate-400/20 shadow-sm',
      outline: 'text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-slate-400/20 shadow-sm',
      ghost: 'text-slate-700 dark:text-slate-300 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-400/20',
      danger: 'text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500/30 shadow-sm',
      dashed: 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/80 border border-dashed border-emerald-300 dark:border-emerald-700'
    };

    const widthClass = this.fullWidth ? 'w-full' : '';
    return `${baseClasses} ${sizeMap[this.size]} ${variantMap[this.variant]} ${widthClass}`.trim();
  }

  onClick(event: MouseEvent): void {
    if (!this.disabled && !this.loading) {
      this.btnClick.emit(event);
      this.clicked.emit(event);
      this.buttonClick.emit(event);

      const hasCustomListener = this.btnClick.observed || this.clicked.observed || this.buttonClick.observed;
      if (this.type === 'submit' || !hasCustomListener) {
        const target = (event.currentTarget as HTMLElement) || (event.target as HTMLElement);
        const form = target?.closest('form');
        if (form && this.type !== 'reset') {
          // Native <button type="submit"> will submit automatically; if type is 'button' and no custom listener was attached, requestSubmit
          if (this.type !== 'submit') {
            form.requestSubmit();
          }
        }
      }
    } else {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
