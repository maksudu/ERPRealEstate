import { Component, Input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-textarea, app-custom-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full">
      @if (label) {
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">
            {{ label }}
            @if (required) {
              <span class="text-rose-500 font-bold">*</span>
            }
          </label>
          @if (maxLength) {
            <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {{ value().length }} / {{ maxLength }}
            </span>
          }
        </div>
      }

      <textarea
        [rows]="rows"
        [value]="value()"
        (input)="onInputChange($event)"
        (blur)="onBlur()"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [maxLength]="maxLength || 5000"
        [class.border-rose-400]="errorMessage"
        class="erp-input text-xs resize-y"
      ></textarea>

      @if (errorMessage) {
        <p class="mt-1 text-xs text-rose-500 font-medium">{{ errorMessage }}</p>
      } @else if (hint) {
        <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">{{ hint }}</p>
      }
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomTextareaComponent),
      multi: true
    }
  ]
})
export class CustomTextareaComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() rows: number = 3;
  @Input() maxLength?: number;
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() hint: string = '';
  @Input() errorMessage: string = '';

  value = signal<string>('');

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  onInputChange(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.value.set(input.value);
    this.onChange(input.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  writeValue(val: any): void {
    this.value.set(val || '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
