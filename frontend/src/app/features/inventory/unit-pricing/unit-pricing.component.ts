import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  PriceList, PriceListPagedResponse,
  PriceOverride, PriceOverridePagedResponse,
  PriceChangeAudit, PriceAuditPagedResponse,
  Quotation, QuotationPagedResponse,
  PricingCalculationResult
} from '../../../core/models/inventory.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption,
  ModalComponent
} from '../../../shared/components';

export type PricingTab = 'calculator' | 'price_lists' | 'overrides' | 'audits' | 'quotations';

@Component({
  selector: 'app-unit-pricing',
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
    ModalComponent
  ],
  templateUrl: './unit-pricing.component.html'
})
export class UnitPricingComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Active Tab
  activeTab = signal<PricingTab>('calculator');

  // Loading States
  loadingLists = signal<boolean>(false);
  loadingOverrides = signal<boolean>(false);
  loadingAudits = signal<boolean>(false);
  loadingQuotations = signal<boolean>(false);
  actionInProgress = signal<boolean>(false);

  // Master Data
  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);

  // 1. Price Lists State
  priceLists = signal<PriceList[]>([]);
  totalPriceLists = signal<number>(0);
  priceListPage = signal<number>(1);
  priceListFilterStatus = signal<string>('all');
  priceListSearch = signal<string>('');

  // 2. Overrides State
  overrides = signal<PriceOverride[]>([]);
  totalOverrides = signal<number>(0);
  overridePage = signal<number>(1);
  overrideFilterStatus = signal<string>('all');
  overrideSearch = signal<string>('');

  // 3. Audits State
  audits = signal<PriceChangeAudit[]>([]);
  totalAudits = signal<number>(0);
  auditPage = signal<number>(1);

  // 4. Quotations State
  quotations = signal<Quotation[]>([]);
  totalQuotations = signal<number>(0);
  quotationPage = signal<number>(1);
  quotationSearch = signal<string>('');

  // Modals
  isPriceListModalOpen = signal<boolean>(false);
  isOverrideModalOpen = signal<boolean>(false);
  isQuotationModalOpen = signal<boolean>(false);
  isQuotationPreviewOpen = signal<boolean>(false);

  // Modal target objects
  editingPriceList = signal<PriceList | null>(null);
  previewQuotation = signal<Quotation | null>(null);

  // Forms
  priceListForm!: FormGroup;
  overrideForm!: FormGroup;
  quotationForm!: FormGroup;

  // -------------------------------------------------------------
  // Illustrative Apartment Price Calculator Signals (Spec 3.5 Example)
  // -------------------------------------------------------------
  calcArea = signal<number>(1500);
  calcRatePerSqft = signal<number>(8500);
  calcParkingPrice = signal<number>(800000); // 0, 800000, 1200000
  calcDiscountPct = signal<number>(0); // 0, 5, 15

  // Reactive Computed Values
  calcApartmentBasePrice = computed(() => {
    return Math.round((Number(this.calcArea()) || 0) * (Number(this.calcRatePerSqft()) || 0));
  });

  calcDiscountAmount = computed(() => {
    const base = this.calcApartmentBasePrice();
    const pct = Number(this.calcDiscountPct()) || 0;
    return Math.round(base * (pct / 100.0));
  });

  calcNetApartmentPrice = computed(() => {
    return this.calcApartmentBasePrice() - this.calcDiscountAmount();
  });

  calcIllustrativeTotalPrice = computed(() => {
    return this.calcNetApartmentPrice() + (Number(this.calcParkingPrice()) || 0);
  });

  // Dynamic Searchable Select Options
  projectOptions = computed<SelectOption[]>(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }));
  });

  projectFilterOptions = computed<SelectOption[]>(() => {
    return [
      { value: 'all', label: 'All Projects (Consolidated)' },
      ...this.projects().map(p => ({
        value: p.id.toString(),
        label: p.project_name
      }))
    ];
  });

  statusFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'APPROVED', label: 'APPROVED' },
    { value: 'DRAFT', label: 'DRAFT' },
    { value: 'ARCHIVED', label: 'ARCHIVED' }
  ];

  overrideStatusFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Decisions' },
    { value: 'PENDING', label: 'PENDING' },
    { value: 'APPROVED', label: 'APPROVED' },
    { value: 'REJECTED', label: 'REJECTED' }
  ];

  authorityOptions: SelectOption[] = [
    { value: 'SALES_EXECUTIVE', label: 'Sales Executive (Max 3%)' },
    { value: 'SALES_MANAGER', label: 'Sales Manager (Max 7%)' },
    { value: 'MANAGING_DIRECTOR', label: 'Managing Director (Max 15%)' },
    { value: 'BOARD', label: 'Board of Directors (> 15%)' }
  ];

  ngOnInit(): void {
    this.initForms();
    this.loadProjects();
    this.loadPriceLists();
    this.loadOverrides();
    this.loadAudits();
    this.loadQuotations();
  }

  private initForms(): void {
    this.priceListForm = this.fb.group({
      project_id: [1, Validators.required],
      tower_id: [null],
      version_code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9\-_]+$/)]],
      title: ['', Validators.required],
      base_rate_per_sqft: [12500.0, [Validators.required, Validators.min(1000)]],
      floor_escalation_rate: [100.0, [Validators.required, Validators.min(0)]],
      facing_premium_lake: [500.0, Validators.min(0)],
      facing_premium_south: [300.0, Validators.min(0)],
      facing_premium_corner: [250.0, Validators.min(0)],
      facing_premium_road: [150.0, Validators.min(0)],
      parking_standard_rate: [800000.0, Validators.min(0)],
      parking_vip_rate: [1200000.0, Validators.min(0)],
      utility_connection_rate: [250000.0, Validators.min(0)],
      min_selling_rate_per_sqft: [11000.0, Validators.required],
      max_discount_pct_exec: [3.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      max_discount_pct_mgr: [7.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      max_discount_pct_dir: [15.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      status: ['DRAFT', Validators.required],
      notes: ['']
    });

    this.overrideForm = this.fb.group({
      project_id: [1, Validators.required],
      unit_id: [1, Validators.required],
      unit_number: ['', Validators.required],
      customer_name: ['', Validators.required],
      standard_price: [23125000.0, Validators.required],
      negotiated_price: [22000000.0, Validators.required],
      discount_amount: [1125000.0, Validators.required],
      discount_pct: [4.86, Validators.required],
      discount_authority_level: ['SALES_MANAGER', Validators.required],
      requested_by: ['Senior Sales Officer', Validators.required],
      justification: ['', Validators.required]
    });

    this.quotationForm = this.fb.group({
      project_id: [1, Validators.required],
      unit_code: ['12A', Validators.required],
      customer_name: ['', Validators.required],
      customer_phone: ['', Validators.required],
      customer_email: [''],
      chargeable_area_sqft: [1500.0, Validators.required],
      rate_per_sqft: [8500.0, Validators.required],
      parking_charge: [800000.0, Validators.required],
      discount_pct: [0.0, Validators.required],
      validity_days: [15, Validators.required],
      prepared_by: ['Senior Sales Officer', Validators.required],
      notes: ['Subject to standard developer sales contract terms and 15-day validity.']
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (list) => {
        this.projects.set(list || []);
        if (list && list.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(list[0].id);
          this.priceListForm.patchValue({ project_id: list[0].id });
          this.overrideForm.patchValue({ project_id: list[0].id });
          this.quotationForm.patchValue({ project_id: list[0].id });
        }
      },
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  // -------------------------------------------------------------
  // Price Lists Methods
  // -------------------------------------------------------------
  loadPriceLists(): void {
    this.loadingLists.set(true);
    const offset = (this.priceListPage() - 1) * 15;
    this.inventoryService.getPriceLists({
      status: this.priceListFilterStatus(),
      search: this.priceListSearch(),
      limit: 15,
      offset
    }).subscribe({
      next: (res) => {
        this.priceLists.set(res.items || []);
        this.totalPriceLists.set(res.total || 0);
        this.loadingLists.set(false);
      },
      error: (err) => {
        console.error('Failed to load price lists', err);
        this.loadingLists.set(false);
      }
    });
  }

  openCreatePriceListModal(): void {
    this.editingPriceList.set(null);
    this.priceListForm.reset({
      project_id: this.projects()[0]?.id || 1,
      tower_id: null,
      version_code: `PL-2026-V${(this.totalPriceLists() || 0) + 1}`,
      title: 'New Project Rate Card',
      base_rate_per_sqft: 12500.0,
      floor_escalation_rate: 100.0,
      facing_premium_lake: 500.0,
      facing_premium_south: 300.0,
      facing_premium_corner: 250.0,
      facing_premium_road: 150.0,
      parking_standard_rate: 800000.0,
      parking_vip_rate: 1200000.0,
      utility_connection_rate: 250000.0,
      min_selling_rate_per_sqft: 11000.0,
      max_discount_pct_exec: 3.0,
      max_discount_pct_mgr: 7.0,
      max_discount_pct_dir: 15.0,
      status: 'DRAFT',
      notes: ''
    });
    this.isPriceListModalOpen.set(true);
  }

  openEditPriceListModal(pl: PriceList): void {
    this.editingPriceList.set(pl);
    this.priceListForm.patchValue({
      project_id: pl.project_id,
      tower_id: pl.tower_id,
      version_code: pl.version_code,
      title: pl.title,
      base_rate_per_sqft: pl.base_rate_per_sqft,
      floor_escalation_rate: pl.floor_escalation_rate,
      facing_premium_lake: pl.facing_premium_lake,
      facing_premium_south: pl.facing_premium_south,
      facing_premium_corner: pl.facing_premium_corner,
      facing_premium_road: pl.facing_premium_road,
      parking_standard_rate: pl.parking_standard_rate,
      parking_vip_rate: pl.parking_vip_rate,
      utility_connection_rate: pl.utility_connection_rate,
      min_selling_rate_per_sqft: pl.min_selling_rate_per_sqft,
      max_discount_pct_exec: pl.max_discount_pct_exec,
      max_discount_pct_mgr: pl.max_discount_pct_mgr,
      max_discount_pct_dir: pl.max_discount_pct_dir,
      status: pl.status,
      notes: pl.notes || ''
    });
    this.isPriceListModalOpen.set(true);
  }

  savePriceList(): void {
    if (this.priceListForm.invalid) {
      this.priceListForm.markAllAsTouched();
      return;
    }
    this.actionInProgress.set(true);
    const val = this.priceListForm.value;
    const editing = this.editingPriceList();

    if (editing) {
      this.inventoryService.updatePriceList(editing.id, val).subscribe({
        next: () => {
          this.actionInProgress.set(false);
          this.isPriceListModalOpen.set(false);
          this.loadPriceLists();
          this.loadAudits();
        },
        error: (err) => {
          this.actionInProgress.set(false);
          alert('Failed to update price list: ' + (err.error?.detail || err.message));
        }
      });
    } else {
      this.inventoryService.createPriceList(val).subscribe({
        next: () => {
          this.actionInProgress.set(false);
          this.isPriceListModalOpen.set(false);
          this.loadPriceLists();
          this.loadAudits();
        },
        error: (err) => {
          this.actionInProgress.set(false);
          alert('Failed to create price list: ' + (err.error?.detail || err.message));
        }
      });
    }
  }

  approvePriceList(pl: PriceList): void {
    if (!confirm(`Are you sure you want to formally approve Rate Card ${pl.version_code}?`)) return;
    this.actionInProgress.set(true);
    this.inventoryService.approvePriceList(pl.id).subscribe({
      next: (res) => {
        this.actionInProgress.set(false);
        alert(res.message);
        this.loadPriceLists();
        this.loadAudits();
      },
      error: (err) => {
        this.actionInProgress.set(false);
        alert('Approval failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  activatePriceList(pl: PriceList): void {
    if (!confirm(`Activate Rate Card ${pl.version_code} as the active pricing version for this project?`)) return;
    this.actionInProgress.set(true);
    this.inventoryService.activatePriceList(pl.id).subscribe({
      next: (res) => {
        this.actionInProgress.set(false);
        alert(res.message);
        this.loadPriceLists();
        this.loadAudits();
      },
      error: (err) => {
        this.actionInProgress.set(false);
        alert('Activation failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  // -------------------------------------------------------------
  // Unit Price Overrides Methods
  // -------------------------------------------------------------
  loadOverrides(): void {
    this.loadingOverrides.set(true);
    const offset = (this.overridePage() - 1) * 15;
    this.inventoryService.getPriceOverrides({
      status: this.overrideFilterStatus(),
      search: this.overrideSearch(),
      limit: 15,
      offset
    }).subscribe({
      next: (res) => {
        this.overrides.set(res.items || []);
        this.totalOverrides.set(res.total || 0);
        this.loadingOverrides.set(false);
      },
      error: (err) => {
        console.error('Failed to load overrides', err);
        this.loadingOverrides.set(false);
      }
    });
  }

  openCreateOverrideModal(): void {
    this.overrideForm.reset({
      project_id: this.projects()[0]?.id || 1,
      unit_id: 1,
      unit_number: '12A',
      customer_name: '',
      standard_price: 23125000.0,
      negotiated_price: 22000000.0,
      discount_amount: 1125000.0,
      discount_pct: 4.86,
      discount_authority_level: 'SALES_MANAGER',
      requested_by: 'Senior Sales Officer',
      justification: ''
    });
    this.isOverrideModalOpen.set(true);
  }

  recalculateOverrideDiscount(): void {
    const std = Number(this.overrideForm.get('standard_price')?.value) || 0;
    const neg = Number(this.overrideForm.get('negotiated_price')?.value) || 0;
    if (std > 0 && neg > 0) {
      const diff = Math.max(0, std - neg);
      const pct = (diff / std) * 100.0;
      this.overrideForm.patchValue({
        discount_amount: Math.round(diff),
        discount_pct: Math.round(pct * 100) / 100
      });
      // Suggest authority level based on percentage
      if (pct <= 3.0) {
        this.overrideForm.patchValue({ discount_authority_level: 'SALES_EXECUTIVE' });
      } else if (pct <= 7.0) {
        this.overrideForm.patchValue({ discount_authority_level: 'SALES_MANAGER' });
      } else if (pct <= 15.0) {
        this.overrideForm.patchValue({ discount_authority_level: 'MANAGING_DIRECTOR' });
      } else {
        this.overrideForm.patchValue({ discount_authority_level: 'BOARD' });
      }
    }
  }

  saveOverride(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }
    this.actionInProgress.set(true);
    const val = this.overrideForm.value;
    this.inventoryService.createPriceOverride(val).subscribe({
      next: () => {
        this.actionInProgress.set(false);
        this.isOverrideModalOpen.set(false);
        alert('Price override request submitted successfully for approval.');
        this.loadOverrides();
        this.loadAudits();
      },
      error: (err) => {
        this.actionInProgress.set(false);
        alert('Failed to submit override: ' + (err.error?.detail || err.message));
      }
    });
  }

  updateOverrideStatus(item: PriceOverride, newStatus: 'APPROVED' | 'REJECTED'): void {
    const approver = prompt(`Enter approver name for ${newStatus}:`, 'Managing Director');
    if (!approver) return;

    this.actionInProgress.set(true);
    this.inventoryService.updatePriceOverrideStatus(item.id, newStatus, approver).subscribe({
      next: (res) => {
        this.actionInProgress.set(false);
        alert(res.message);
        this.loadOverrides();
        this.loadAudits();
      },
      error: (err) => {
        this.actionInProgress.set(false);
        alert('Status update failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  // -------------------------------------------------------------
  // Audits Methods
  // -------------------------------------------------------------
  loadAudits(): void {
    this.loadingAudits.set(true);
    const offset = (this.auditPage() - 1) * 20;
    this.inventoryService.getPriceAudits({
      limit: 20,
      offset
    }).subscribe({
      next: (res) => {
        this.audits.set(res.items || []);
        this.totalAudits.set(res.total || 0);
        this.loadingAudits.set(false);
      },
      error: (err) => {
        console.error('Failed to load audits', err);
        this.loadingAudits.set(false);
      }
    });
  }

  // -------------------------------------------------------------
  // Quotations Methods
  // -------------------------------------------------------------
  loadQuotations(): void {
    this.loadingQuotations.set(true);
    const offset = (this.quotationPage() - 1) * 15;
    this.inventoryService.getQuotations({
      search: this.quotationSearch(),
      limit: 15,
      offset
    }).subscribe({
      next: (res) => {
        this.quotations.set(res.items || []);
        this.totalQuotations.set(res.total || 0);
        this.loadingQuotations.set(false);
      },
      error: (err) => {
        console.error('Failed to load quotations', err);
        this.loadingQuotations.set(false);
      }
    });
  }

  openGenerateQuotationFromCalc(): void {
    this.quotationForm.patchValue({
      project_id: this.projects()[0]?.id || 1,
      unit_code: 'FLAT-12A',
      chargeable_area_sqft: this.calcArea(),
      rate_per_sqft: this.calcRatePerSqft(),
      parking_charge: this.calcParkingPrice(),
      discount_pct: this.calcDiscountPct(),
      validity_days: 15
    });
    this.isQuotationModalOpen.set(true);
  }

  saveQuotation(): void {
    if (this.quotationForm.invalid) {
      this.quotationForm.markAllAsTouched();
      return;
    }
    this.actionInProgress.set(true);
    const val = this.quotationForm.value;
    const basePrice = Math.round(val.chargeable_area_sqft * val.rate_per_sqft);
    const discountAmt = Math.round(basePrice * (val.discount_pct / 100.0));
    const netTotal = Math.round((basePrice - discountAmt) + val.parking_charge);

    const payload = {
      ...val,
      base_apartment_price: basePrice,
      discount_amount: discountAmt,
      net_total_price: netTotal
    };

    this.inventoryService.createQuotation(payload).subscribe({
      next: (q) => {
        this.actionInProgress.set(false);
        this.isQuotationModalOpen.set(false);
        this.previewQuotation.set(q);
        this.isQuotationPreviewOpen.set(true);
        this.loadQuotations();
      },
      error: (err) => {
        this.actionInProgress.set(false);
        alert('Failed to generate quotation: ' + (err.error?.detail || err.message));
      }
    });
  }

  openQuotationView(q: Quotation): void {
    this.previewQuotation.set(q);
    this.isQuotationPreviewOpen.set(true);
  }

  printQuotation(): void {
    window.print();
  }

  // Quick Preset Setters for Calculator
  setAreaPreset(val: number): void {
    this.calcArea.set(val);
  }

  setRatePreset(val: number): void {
    this.calcRatePerSqft.set(val);
  }

  setParkingPreset(val: number): void {
    this.calcParkingPrice.set(val);
  }

  setDiscountPreset(val: number): void {
    this.calcDiscountPct.set(val);
  }

  // Formatting Utilities (Bangladesh Lakh / Crore BDT)
  formatBDT(val: number | null | undefined): string {
    if (!val || isNaN(val)) return '৳0';
    if (Math.abs(val) >= 10000000) {
      return `৳${(val / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(val) >= 100000) {
      return `৳${(val / 100000).toFixed(2)} Lac`;
    }
    return `৳${val.toLocaleString('en-IN')}`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DRAFT':
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'REJECTED':
      case 'ARCHIVED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
}
