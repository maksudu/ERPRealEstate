import { Component, Input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full">
      @if (label) {
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 tracking-wide">
          {{ label }}
          @if (required) {
            <span class="text-rose-500 font-bold">*</span>
          }
        </label>
      }

      <div class="relative">
        @if (prefixIcon) {
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <span [innerHTML]="prefixIcon"></span>
          </div>
        }

        <input
          [type]="type"
          [value]="value()"
          (input)="onInputChange($event)"
          (blur)="onBlur()"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [class.pl-9]="prefixIcon"
          [class.pr-9]="suffixText"
          [class.border-rose-400]="!!errorMessage"
          class="erp-input text-xs"
        />

        @if (suffixText) {
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-medium text-slate-400 dark:text-slate-500">
            {{ suffixText }}
          </div>
        }
      </div>

      @if (errorMessage) {
        <p class="mt-1 text-xs text-rose-500 font-medium">{{ errorMessage }}</p>
      } @else if (hint) {
        <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">{{ hint }}</p>
      }
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInputComponent),
      multi: true
    }
  ]
})
export class CustomInputComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() hint: string = '';
  @Input() errorMessage: string = '';
  @Input() prefixIcon: string = '';
  @Input() suffixText: string = '';

  value = signal<string>('');

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
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
