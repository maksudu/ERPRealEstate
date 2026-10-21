import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LandService } from '../../../core/services/land.service';
import { 
  MeasurementConvention, 
  RegionalConversionRequest, 
  RegionalConversionResponse 
} from '../../../core/models/land.model';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({
  selector: 'app-land-conversions',
  standalone: true,
  imports: [
    CommonModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  templateUrl: './conversions.component.html'
})
export class ConversionsComponent implements OnInit {
  private landService = inject(LandService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  Math = Math;
  Number = Number;

  // State Signals
  conventions = signal<MeasurementConvention[]>([]);
  isLoading = signal<boolean>(false);
  loadError = signal<string | null>(null);
  saveSuccess = signal<string | null>(null);
  isCalculating = signal<boolean>(false);
  calculationError = signal<string | null>(null);
  searchTerm = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions = [10, 25, 50];

  // Interactive Live Calculator Signals
  selectedConventionId = signal<number | null>(null);
  inputUnit = signal<string>('DECIMAL');
  inputValue = signal<number>(10);
  conversionResult = signal<RegionalConversionResponse | null>(null);

  // Preset Unit Options for calculator
  unitOptions = [
    { value: 'SQFT', label: 'Square Feet (sq ft) - Base Unit' },
    { value: 'SQM', label: 'Square Metres (m²)' },
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
        c.convention_name?.toLowerCase().includes(term) ||
        c.convention_code?.toLowerCase().includes(term) ||
        c.region_district?.toLowerCase().includes(term)
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
  selectedConvention = computed(() => this.conventions().find(c => c.id === this.selectedConventionId()) || null);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const saved = params.get('saved');
      if (saved === 'created' || saved === 'updated') {
        this.saveSuccess.set(`Regional convention ${saved} successfully.`);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { saved: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });
    this.loadConventions();
  }

  createConvention(): void {
    this.router.navigate(['/land/conversions/create']);
  }

  editConvention(convention: MeasurementConvention): void {
    this.router.navigate(['/land/conversions', convention.id, 'edit']);
  }

  loadConventions(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.landService.getMeasurementConventions().subscribe({
      next: (data) => {
        const response: unknown = data;
        if (!Array.isArray(response) || !response.every(item => this.isMeasurementConvention(item))) {
          this.conventions.set([]);
          this.loadError.set('The conventions endpoint returned invalid data. Refresh the page or contact support.');
          this.isLoading.set(false);
          return;
        }
        this.conventions.set(response);
        this.isLoading.set(false);
        if (this.conventions().length > 0 && !this.selectedConventionId()) {
          const def = this.conventions().find(c => c.is_default) || this.conventions()[0];
          this.selectedConventionId.set(def.id);
          this.runLiveConversion();
        }
        if (this.conventions().length === 0) {
          this.conversionResult.set(null);
          this.selectedConventionId.set(null);
        }
      },
      error: (err) => {
        console.error('Failed to load conventions', err);
        this.loadError.set(this.getErrorMessage(err, 'Could not load measurement conventions. Check your connection and retry.'));
        this.isLoading.set(false);
      }
    });
  }

  runLiveConversion(): void {
    if (!this.selectedConventionId() || this.inputValue() === null || this.inputValue() === undefined) {
      return;
    }
    this.isCalculating.set(true);
    this.calculationError.set(null);
    this.conversionResult.set(null);
    const req: RegionalConversionRequest = {
      convention_id: this.selectedConventionId()!,
      input_unit: this.inputUnit(),
      input_value: Number(this.inputValue()),
      original_registered_unit: this.inputUnit(),
      original_registered_value: Number(this.inputValue())
    };

    this.landService.convertRegional(req).subscribe({
      next: (res) => {
        this.conversionResult.set(res);
        this.isCalculating.set(false);
      },
      error: (err) => {
        console.error('Conversion calculation failed', err);
        this.calculationError.set(this.getErrorMessage(err, 'Conversion failed. Check the selected convention and input, then retry.'));
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

  private getErrorMessage(error: any, fallback: string): string {
    const detail = error?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const messages = detail.map(item => item?.msg).filter(Boolean);
      if (messages.length) return messages.join(' ');
    }
    return error?.error?.message || fallback;
  }

  private isMeasurementConvention(value: unknown): value is MeasurementConvention {
    if (!value || typeof value !== 'object') return false;
    const item = value as Record<string, unknown>;
    const requiredStrings = ['convention_code', 'convention_name', 'region_district'];
    const requiredNumbers = ['id', 'katha_to_sqft', 'decimal_to_sqft', 'bigha_to_katha', 'acre_to_decimal'];
    return requiredStrings.every(key => typeof item[key] === 'string' && Boolean(item[key])) &&
      requiredNumbers.every(key => typeof item[key] === 'number' && Number.isFinite(item[key])) &&
      typeof item['is_default'] === 'boolean';
  }
}
