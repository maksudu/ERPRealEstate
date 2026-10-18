import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import { 
  MeasurementConvention, 
  RegionalConversionRequest, 
  RegionalConversionResponse 
} from '../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';

@Component({
  selector: 'app-land-conversions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './conversions.component.html'
})
export class ConversionsComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  Math = Math;
  Number = Number;

  // State Signals
  conventions = signal<MeasurementConvention[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isCalculating = signal<boolean>(false);
  searchTerm = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions = [10, 25, 50];

  // Interactive Live Calculator Signals
  selectedConventionId = signal<number | null>(null);
  inputUnit = signal<string>('DECIMAL');
  inputValue = signal<number>(10);
  recordedDeedText = signal<string>('দলিলে লিখিত: ১০ শতাংশ নাল জমি (মৌজা বাড্ডা)');
  conversionResult = signal<RegionalConversionResponse | null>(null);

  // Modal State: Create / Edit Convention
  isModalOpen = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingConventionId = signal<number | null>(null);
  conventionForm!: FormGroup;

  // Preset Unit Options for calculator
  unitOptions = [
    { value: 'SQFT', label: 'Square Feet (sq ft) - Base Unit' },
    { value: 'DECIMAL', label: 'Decimal / Shatangsho (শতাংশ) - 435.6 sq ft' },
    { value: 'KATHA', label: 'Katha (কাঠা) - Regional Convention' },
    { value: 'BIGHA', label: 'Bigha (বিঘা) - 20 Katha / Regional' },
    { value: 'ACRE', label: 'Acre (একর) - 100 Decimal / 43,560 sq ft' },
    { value: 'KANI', label: 'Kani (কানি) - Chittagong Convention' },
    { value: 'GONDA', label: 'Gonda (গণ্ডা) - Chittagong Convention' }
  ];

  // Computed Properties
  filteredConventions = computed(() => {
    let list = this.conventions();
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      list = list.filter(c => 
        c.convention_name.toLowerCase().includes(term) ||
        c.convention_code.toLowerCase().includes(term) ||
        c.region_district.toLowerCase().includes(term)
      );
    }
    return list;
  });

  paginatedConventions = computed(() => {
    const list = this.filteredConventions();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredConventions().length / this.pageSize()) || 1);

  defaultConvention = computed(() => this.conventions().find(c => c.is_default) || this.conventions()[0]);

  ngOnInit(): void {
    this.initForm();
    this.loadConventions();
  }

  private initForm(): void {
    this.conventionForm = this.fb.group({
      convention_code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
      convention_name: ['', Validators.required],
      region_district: ['', Validators.required],
      katha_to_sqft: [720, [Validators.required, Validators.min(1)]],
      decimal_to_sqft: [435.60, [Validators.required, Validators.min(1)]],
      bigha_to_katha: [20, [Validators.required, Validators.min(1)]],
      acre_to_decimal: [100, [Validators.required, Validators.min(1)]],
      kani_to_sqft: [null],
      gonda_to_sqft: [null],
      is_default: [false],
      notes: ['']
    });
  }

  loadConventions(): void {
    this.isLoading.set(true);
    this.landService.getMeasurementConventions().subscribe({
      next: (data) => {
        this.conventions.set(data);
        this.isLoading.set(false);
        if (data.length > 0 && !this.selectedConventionId()) {
          const def = data.find(c => c.is_default) || data[0];
          this.selectedConventionId.set(def.id);
          this.runLiveConversion();
        }
      },
      error: (err) => {
        console.error('Failed to load conventions', err);
        this.isLoading.set(false);
      }
    });
  }

  runLiveConversion(): void {
    if (!this.selectedConventionId() || this.inputValue() === null || this.inputValue() === undefined) {
      return;
    }
    this.isCalculating.set(true);
    const req: RegionalConversionRequest = {
      convention_id: this.selectedConventionId()!,
      input_unit: this.inputUnit(),
      input_value: Number(this.inputValue()),
      recorded_deed_text: this.recordedDeedText()
    };

    this.landService.convertRegional(req).subscribe({
      next: (res) => {
        this.conversionResult.set(res);
        this.isCalculating.set(false);
      },
      error: (err) => {
        console.error('Conversion calculation failed', err);
        this.isCalculating.set(false);
      }
    });
  }

  onConventionSelect(id: any): void {
    this.selectedConventionId.set(Number(id));
    this.runLiveConversion();
  }

  onUnitChange(unit: string): void {
    this.inputUnit.set(unit);
    this.runLiveConversion();
  }

  onInputValueChange(val: any): void {
    this.inputValue.set(Number(val));
    this.runLiveConversion();
  }

  onDeedTextChange(text: string): void {
    this.recordedDeedText.set(text);
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.editingConventionId.set(null);
    this.conventionForm.reset({
      convention_code: '',
      convention_name: '',
      region_district: 'Dhaka',
      katha_to_sqft: 720,
      decimal_to_sqft: 435.60,
      bigha_to_katha: 20,
      acre_to_decimal: 100,
      kani_to_sqft: null,
      gonda_to_sqft: null,
      is_default: false,
      notes: ''
    });
    this.isModalOpen.set(true);
  }

  openEditModal(conv: MeasurementConvention): void {
    this.isEditMode.set(true);
    this.editingConventionId.set(conv.id);
    this.conventionForm.patchValue({
      convention_code: conv.convention_code,
      convention_name: conv.convention_name,
      region_district: conv.region_district,
      katha_to_sqft: conv.katha_to_sqft,
      decimal_to_sqft: conv.decimal_to_sqft,
      bigha_to_katha: conv.bigha_to_katha,
      acre_to_decimal: conv.acre_to_decimal,
      kani_to_sqft: conv.kani_to_sqft,
      gonda_to_sqft: conv.gonda_to_sqft,
      is_default: conv.is_default,
      notes: conv.notes || ''
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveConvention(): void {
    if (this.conventionForm.invalid) {
      this.conventionForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.conventionForm.value;

    if (this.isEditMode() && this.editingConventionId()) {
      this.landService.updateMeasurementConvention(this.editingConventionId()!, formVal).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadConventions();
        },
        error: (err) => {
          console.error('Failed to update convention', err);
          this.isSaving.set(false);
        }
      });
    } else {
      this.landService.createMeasurementConvention(formVal).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadConventions();
        },
        error: (err) => {
          console.error('Failed to create convention', err);
          this.isSaving.set(false);
        }
      });
    }
  }

  testInCalculator(conv: MeasurementConvention): void {
    this.selectedConventionId.set(conv.id);
    this.runLiveConversion();
    // Smooth scroll up to calculator
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(Number(select.value));
    this.currentPage.set(1);
  }
}
