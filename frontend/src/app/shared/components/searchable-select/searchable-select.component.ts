import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnChanges,
  ElementRef, 
  HostListener, 
  forwardRef, 
  signal, 
  computed, 
  inject 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LookupService } from '../../../core/services/lookup.service';
import { LookupItem, QuickCreateLookupPayload } from '../../../core/models/lookup.model';

export interface SelectOption {
  value: any;
  label: string;
  subLabel?: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-select.component.html',
  styleUrls: ['./searchable-select.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ]
})
export class SearchableSelectComponent implements OnInit, ControlValueAccessor {
  private lookupService = inject(LookupService);
  private elementRef = inject(ElementRef);

  @Input() categoryCode: string = '';
  @Input() options: SelectOption[] = [];
  @Input() label: string = '';
  @Input() placeholder: string = 'Select an option...';
  @Input() allowCreateNew: boolean = true;
  @Input() searchable: boolean = true;
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() hint: string = '';

  /** One-way value binding alternative to ngModel: [value] + (valueChange) */
  @Input()
  set value(val: any) {
    this.selectedValue.set(val === null || val === undefined || val === '' ? null : String(val));
  }

  /** Alias for allowCreateNew */
  @Input()
  set showAddButton(val: boolean) {
    this.allowCreateNew = val;
  }

  @Output() selectionChange = new EventEmitter<any>();
  @Output() valueChange = new EventEmitter<any>();

  // State Signals
  items = signal<LookupItem[]>([]);
  searchTerm = signal<string>('');
  isOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  selectedValue = signal<string | null>(null);

  // Quick Create Modal State
  isModalOpen = signal<boolean>(false);
  isCreating = signal<boolean>(false);
  newEnglishName = signal<string>('');
  newBanglaName = signal<string>('');
  newColorBadge = signal<string>('#10B981');
  quickCreateError = signal<string | null>(null);

  // Predefined color badges for quick select
  colorPresets = [
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#64748B', // Slate
  ];

  // Filtered Items Computed Signal
  filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(item => 
      item.item_name_en.toLowerCase().includes(term) ||
      (item.item_name_bn && item.item_name_bn.toLowerCase().includes(term)) ||
      String(item.item_code).toLowerCase().includes(term)
    );
  });

  // Selected Item Computed Signal
  selectedItem = computed(() => {
    const val = this.selectedValue();
    if (val === null || val === undefined) return null;
    return this.items().find(i => String(i.item_code) === String(val)) || null;
  });

  // ControlValueAccessor Callbacks
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    if (this.categoryCode) {
      this.loadItems();
    } else if (this.options && this.options.length > 0) {
      this.syncOptionsToItems();
    }
  }

  ngOnChanges(): void {
    if (!this.categoryCode && this.options) {
      this.syncOptionsToItems();
    }
  }

  private syncOptionsToItems(): void {
    const mapped: LookupItem[] = this.options.map((opt, idx) => ({
      id: idx + 1,
      category_id: 0,
      item_code: String(opt.value),
      item_name_en: opt.label,
      item_name_bn: opt.subLabel || opt.label,
      sort_order: idx + 1,
      is_default: false,
      is_active: true
    }));
    this.items.set(mapped);
  }

  loadItems(): void {
    this.isLoading.set(true);
    this.lookupService.getItems(this.categoryCode).subscribe({
      next: (data) => {
        this.items.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(`Failed to load lookup items for category: ${this.categoryCode}`, err);
        this.isLoading.set(false);
      }
    });
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    this.isOpen.update(open => !open);
    if (this.isOpen()) {
      this.searchTerm.set('');
    } else {
      this.onTouched();
    }
  }

  selectOption(item: LookupItem): void {
    this.selectedValue.set(item.item_code);
    this.onChange(item.item_code);
    this.selectionChange.emit(item);
    this.valueChange.emit(item.item_code);
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.onTouched();
  }

  clearSelection(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.selectedValue.set(null);
    this.onChange(null);
    this.selectionChange.emit(null);
    this.valueChange.emit(null);
    this.onTouched();
  }

  // Quick Create Modal Actions
  openQuickCreateModal(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.set(false);
    this.newEnglishName.set(this.searchTerm());
    this.newBanglaName.set('');
    this.newColorBadge.set('#10B981');
    this.quickCreateError.set(null);
    this.isModalOpen.set(true);
  }

  closeQuickCreateModal(): void {
    this.isModalOpen.set(false);
    this.isCreating.set(false);
    this.quickCreateError.set(null);
  }

  submitQuickCreate(): void {
    const enName = this.newEnglishName().trim();
    if (!enName) {
      this.quickCreateError.set('English name is required.');
      return;
    }

    this.isCreating.set(true);
    this.quickCreateError.set(null);

    const payload: QuickCreateLookupPayload = {
      item_name_en: enName,
      item_name_bn: this.newBanglaName().trim() || undefined,
      color_badge: this.newColorBadge()
    };

    this.lookupService.quickCreate(this.categoryCode, payload).subscribe({
      next: (createdItem) => {
        // Append newly created item and auto-select it immediately
        this.items.update(list => [...list, createdItem]);
        this.selectOption(createdItem);
        this.isCreating.set(false);
        this.closeQuickCreateModal();
      },
      error: (err) => {
        console.error('Quick create failed:', err);
        const detail = err?.error?.detail || 'Failed to create item. Please check inputs.';
        this.quickCreateError.set(detail);
        this.isCreating.set(false);
      }
    });
  }

  // Close dropdown on outside click
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  // Close dropdown on Escape
  @HostListener('keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
    this.closeQuickCreateModal();
  }

  // ControlValueAccessor Interface Implementation
  writeValue(value: any): void {
    this.selectedValue.set(value || null);
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
