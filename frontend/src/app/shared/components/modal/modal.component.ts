import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
        (click)="onBackdropClick()"
      >
        <div 
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-[96vw] overflow-hidden animate-scaleUp flex flex-col max-h-[92vh] sm:max-h-[90vh]"
          [ngClass]="computedModalClass"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/80 flex items-center justify-between shrink-0">
            <div>
              <h3 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                @if (badge) {
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {{ badge }}
                  </span>
                }
                {{ title }}
              </h3>
              @if (subtitle) {
                <p class="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5">{{ subtitle }}</p>
              }
            </div>
            
            <button 
              type="button" 
              (click)="close()"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              title="Close (Esc)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-3.5 sm:p-6 overflow-y-auto flex-1">
            <ng-content></ng-content>
          </div>

          <!-- Footer (Optional) -->
          @if (showFooter) {
            <div class="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-end gap-2 shrink-0">
              <ng-content select="[modal-footer]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fadeIn { animation: fadeIn 0.15s ease-out forwards; }
    .animate-scaleUp { animation: scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `]
})
export class ModalComponent {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() badge: string = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'md';
  @Input() maxWidth: string = '';
  @Input() maxWidthClass: string = '';
  @Input() modalClass: string = '';
  @Input() closeOnBackdrop: boolean = true;
  @Input() showFooter: boolean = true;

  @Output() closed = new EventEmitter<void>();
  @Output() closeModal = new EventEmitter<void>();

  get computedModalClass(): string {
    if (this.modalClass) {
      return this.modalClass;
    }
    if (this.maxWidth) {
      return this.maxWidth;
    }
    if (this.maxWidthClass) {
      return this.maxWidthClass;
    }
    const map = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      '2xl': 'max-w-5xl'
    };
    return map[this.size] || map.md;
  }

  close(): void {
    this.isOpen = false;
    this.closed.emit();
    this.closeModal.emit();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }
}
