import { Component, Input, Output, EventEmitter, OnDestroy, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-input, app-custom-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full">
      @if (label) {
        <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5 tracking-wide">
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
          [value]="_value()"
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
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-medium text-slate-600 dark:text-slate-400">
            {{ suffixText }}
          </div>
        }
      </div>

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
      useExisting: forwardRef(() => CustomInputComponent),
      multi: true
    }
  ]
})
export class CustomInputComponent implements ControlValueAccessor, OnDestroy {
  @Input() label: string = '';
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() hint: string = '';
  @Input() errorMessage: string = '';
  @Input() prefixIcon: string = '';
  @Input() suffixText: string = '';

  /** One-way binding alternative to ngModel: [value] + (valueChange) */
  @Input()
  set value(val: any) {
    this._value.set(val === null || val === undefined ? '' : String(val));
  }
  get value(): string {
    return this._value();
  }

  /** Reactive-forms binding without formControlName: [control]="form.get('x')" */
  @Input()
  set control(ctrl: AbstractControl | null) {
    this.controlSub?.unsubscribe();
    this._control = ctrl;
    if (ctrl) {
      this.writeValue(ctrl.value);
      this.controlSub = ctrl.valueChanges.subscribe(v => this.writeValue(v));
    }
  }

  @Output() valueChange = new EventEmitter<any>();

  _value = signal<string>('');
  private _control: AbstractControl | null = null;
  private controlSub?: Subscription;

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this._value.set(input.value);
    const emitted = this.type === 'number' ? (input.value === '' ? null : Number(input.value)) : input.value;
    this.onChange(input.value); // ngModel behaviour unchanged (raw string)
    this.valueChange.emit(emitted);
    if (this._control) {
      this._control.setValue(emitted);
      this._control.markAsDirty();
    }
  }

  onBlur(): void {
    this.onTouched();
    this._control?.markAsTouched();
  }

  writeValue(val: any): void {
    this._value.set(val === null || val === undefined ? '' : String(val));
  }

  ngOnDestroy(): void {
    this.controlSub?.unsubscribe();
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
