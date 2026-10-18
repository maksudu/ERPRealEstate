import { Component, Input, Output, EventEmitter, OnDestroy, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl } from '@angular/forms';
import { Subscription } from 'rxjs';

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
              {{ _value().length }} / {{ maxLength }}
            </span>
          }
        </div>
      }

      <textarea
        [rows]="rows"
        [value]="_value()"
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
export class CustomTextareaComponent implements ControlValueAccessor, OnDestroy {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() rows: number | string = 3;
  @Input() maxLength?: number;
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() hint: string = '';
  @Input() errorMessage: string = '';

  @Input()
  set value(val: string) {
    this._value.set(val || '');
  }
  get value(): string {
    return this._value();
  }

  @Output() valueChange = new EventEmitter<string>();

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

  _value = signal<string>('');
  private _control: AbstractControl | null = null;
  private controlSub?: Subscription;

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  onInputChange(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this._value.set(input.value);
    this.onChange(input.value);
    this.valueChange.emit(input.value);
    if (this._control) {
      this._control.setValue(input.value);
      this._control.markAsDirty();
    }
  }

  onBlur(): void {
    this.onTouched();
    this._control?.markAsTouched();
  }

  ngOnDestroy(): void {
    this.controlSub?.unsubscribe();
  }

  writeValue(val: any): void {
    this._value.set(val || '');
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
