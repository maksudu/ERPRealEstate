import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ProjectService } from '../../../core/services/project.service';
import { SiteStore, StoreStock, MaterialItem } from '../../../core/models/procurement.model';
import { Project } from '../../../core/models/project.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  CustomTabsComponent,
  StatusBadgeComponent,
  ModalComponent,
  TabItem
} from '../../../shared/components';

@Component({
  selector: 'app-warehouse-stock',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProcurementNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent,
    CustomTabsComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  templateUrl: './warehouse-stock.component.html'
})
export class WarehouseStockComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Data signals
  stores = signal<SiteStore[]>([]);
  projects = signal<Project[]>([]);
  materials = signal<MaterialItem[]>([]);
  allStocks = signal<StoreStock[]>([]);
  selectedStock = signal<StoreStock | null>(null);
  selectedStore = signal<SiteStore | null>(null);

  // Loading and State signals
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isReserveSaving = signal<boolean>(false);
  isCycleSaving = signal<boolean>(false);

  // Modals
  isStoreModalOpen = false;
  isReserveModalOpen = false;
  isCycleModalOpen = false;
  isQRModalOpen = false;
  isDeleteStoreModalOpen = false;
  editingStoreId: number | null = null;
  deletingStoreId: number | null = null;

  // Filter and Pagination state
  searchQuery = '';
  selectedStoreId = '';
  activeTab = 'ALL_STORES';
  limit = 20;
  offset = 0;
  totalRecords = signal<number>(0);

  // Form for Register / Edit Store Location
  storeForm: FormGroup = this.fb.group({
    project_id: ['', Validators.required],
    store_name: ['', Validators.required],
    store_type: ['PROJECT_WAREHOUSE', Validators.required],
    zone_code: ['Zone-A'],
    rack_code: ['Rack-01'],
    bin_code: ['Bin-101'],
    store_in_charge_name: ['Md. Rafiqul Islam (Senior Storekeeper)', Validators.required],
    contact_phone: ['01711-223344'],
    location_details: ['Plot 42, Block D, Site Central Yard', Validators.required],
    is_central_warehouse: [false]
  });

  // Form for Stock Reservation
  reserveForm: FormGroup = this.fb.group({
    store_id: ['', Validators.required],
    material_id: ['', Validators.required],
    work_order_reference: ['', Validators.required],
    reservation_purpose: ['', Validators.required],
    reserved_quantity: ['', [Validators.required, Validators.min(0.01)]]
  });

  // Form for Physical Cycle Counting Audit
  cycleForm: FormGroup = this.fb.group({
    store_id: ['', Validators.required],
    material_id: ['', Validators.required],
    physical_counted_quantity: ['', [Validators.required, Validators.min(0)]],
    cycle_count_date: [new Date().toISOString().substring(0, 10), Validators.required],
    discrepancy_reason: ['Routine weekly cycle count physical audit.'],
    counter_officer_name: ['Engr. Kamal Hossain (QA & Audit Officer)', Validators.required]
  });

  // Filter tabs
  tabs: TabItem[] = [
    { id: 'ALL_STORES', label: 'All Inventory Balances' },
    { id: 'CENTRAL', label: 'Central Warehouses' },
    { id: 'SITE_STORES', label: 'Project Site Stores' },
    { id: 'RESERVED', label: 'Work-Order Reserved' },
    { id: 'LOW_STOCK', label: 'Low Stock Reorder Alerts' }
  ];

  // Options for Project Selection
  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id.toString(),
      label: p.project_name,
      subLabel: `Code: ${p.project_code || 'PRJ'} | Authority: ${p.development_authority_id || 'RAJUK'}`
    }));
  });

  // Options for Store Selection
  storeOptions = computed(() => {
    return this.stores().map(s => ({
      value: s.id.toString(),
      label: s.store_name,
      subLabel: `${s.is_central_warehouse ? '🏢 Central Warehouse' : '🏗️ Site Store'} | Project: ${s.project_name || 'Central'}`
    }));
  });

  // KPI Metrics
  totalStoresCount = computed(() => this.stores().length);
  totalValuationBDT = computed(() => {
    return this.allStocks().reduce((acc, st) => acc + (Number(st.total_stock_value) || 0), 0);
  });
  totalReservedQty = computed(() => {
    return this.allStocks().reduce((acc, st) => acc + (Number(st.reserved_quantity) || 0), 0);
  });
  lowStockItemsCount = computed(() => {
    return this.allStocks().filter(st => st.is_low_stock).length;
  });

  // Real-time calculation helpers for Reservation Modal
  activeReserveStock = signal<StoreStock | null>(null);
  reservationRemainingAvailable = computed(() => {
    const st = this.activeReserveStock();
    if (!st) return 0;
    const currentOnHands = Number(st.current_stock_quantity) || 0;
    const alreadyReserved = Number(st.reserved_quantity) || 0;
    const newReq = Number(this.reserveForm.get('reserved_quantity')?.value) || 0;
    return Math.max(0, currentOnHands - alreadyReserved - newReq);
  });

  // Real-time calculation helpers for Cycle Count Modal
  activeCycleStock = signal<StoreStock | null>(null);
  cycleVariance = computed(() => {
    const st = this.activeCycleStock();
    if (!st) return 0;
    const book = Number(st.current_stock_quantity) || 0;
    const physical = Number(this.cycleForm.get('physical_counted_quantity')?.value) || 0;
    return physical - book;
  });

  ngOnInit(): void {
    this.loadStores();
    this.loadProjects();
    this.loadMaterials();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data),
      error: () => {}
    });
  }

  loadMaterials(): void {
    this.procurementService.getMaterials().subscribe({
      next: (data) => this.materials.set(data),
      error: () => {}
    });
  }

  loadStores(): void {
    this.isLoading.set(true);
    this.procurementService.getSiteStores().subscribe({
      next: (data) => {
        this.stores.set(data);
        this.flattenAndFilterStocks(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  flattenAndFilterStocks(storeList: SiteStore[]): void {
    const flattened: StoreStock[] = [];
    for (const s of storeList) {
      if (s.stocks) {
        for (const st of s.stocks) {
          const onHand = Number(st.current_stock_quantity) || 0;
          const reserved = Number(st.reserved_quantity) || 0;
          flattened.push({
            ...st,
            store_name: s.store_name,
            store_id: s.id,
            available_quantity: Math.max(0, onHand - reserved),
            reserved_quantity: reserved,
            quarantined_quantity: 0.00,
            zone: s.zone_code || 'Zone-A',
            rack_number: s.rack_code || 'Rack-01',
            bin_location: s.bin_code || 'Bin-101',
            batch_number: 'LOT-2026-ACTIVE'
          });
        }
      }
    }

    let filtered = flattened;
    if (this.selectedStoreId) {
      filtered = filtered.filter(st => st.store_id === Number(this.selectedStoreId));
    }
    if (this.activeTab === 'CENTRAL') {
      const centralIds = storeList.filter(s => s.is_central_warehouse).map(s => s.id);
      filtered = filtered.filter(st => centralIds.includes(st.store_id));
    } else if (this.activeTab === 'SITE_STORES') {
      const siteIds = storeList.filter(s => !s.is_central_warehouse).map(s => s.id);
      filtered = filtered.filter(st => siteIds.includes(st.store_id));
    } else if (this.activeTab === 'RESERVED') {
      filtered = filtered.filter(st => (Number(st.reserved_quantity) || 0) > 0);
    } else if (this.activeTab === 'LOW_STOCK') {
      filtered = filtered.filter(st => st.is_low_stock);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(st =>
        (st.material_name && st.material_name.toLowerCase().includes(q)) ||
        (st.material_code && st.material_code.toLowerCase().includes(q)) ||
        (st.store_name && st.store_name.toLowerCase().includes(q)) ||
        (st.bin_location && st.bin_location.toLowerCase().includes(q))
      );
    }

    this.allStocks.set(filtered);
    this.totalRecords.set(filtered.length);
  }

  onTabChange(tabId: string): void {
    this.activeTab = tabId;
    this.offset = 0;
    this.flattenAndFilterStocks(this.stores());
  }

  onSearch(): void {
    this.offset = 0;
    this.flattenAndFilterStocks(this.stores());
  }

  nextPage(): void {
    this.offset += this.limit;
  }

  previousPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
    }
  }

  // Store Modal Management
  openAddStoreModal(): void {
    this.editingStoreId = null;
    const defaultProj = this.projects().length > 0 ? this.projects()[0].id : '';

    this.storeForm.reset({
      project_id: defaultProj,
      store_name: '',
      store_type: 'PROJECT_WAREHOUSE',
      zone_code: 'Zone-A',
      rack_code: 'Rack-01',
      bin_code: 'Bin-101',
      store_in_charge_name: 'Md. Rafiqul Islam (Storekeeper)',
      contact_phone: '01711-223344',
      location_details: 'Basement-1 North Yard, Plot 42, Gulshan-2, Dhaka',
      is_central_warehouse: false
    });
    this.isStoreModalOpen = true;
  }

  openEditStoreModal(store: SiteStore): void {
    this.editingStoreId = store.id;
    this.storeForm.patchValue({
      project_id: store.project_id,
      store_name: store.store_name,
      store_type: store.is_central_warehouse ? 'CENTRAL_WAREHOUSE' : (store.store_type || 'PROJECT_WAREHOUSE'),
      zone_code: store.zone_code || 'Zone-A',
      rack_code: store.rack_code || 'Rack-01',
      bin_code: store.bin_code || 'Bin-101',
      store_in_charge_name: store.store_in_charge_name || 'Storekeeper',
      contact_phone: store.contact_phone || '01711-223344',
      location_details: store.location_details || '',
      is_central_warehouse: store.is_central_warehouse
    });
    this.isStoreModalOpen = true;
  }

  closeStoreModal(): void {
    this.isStoreModalOpen = false;
    this.editingStoreId = null;
  }

  saveStore(): void {
    if (this.storeForm.invalid) return;

    this.isSaving.set(true);
    const val = this.storeForm.value;

    const formattedLocation = `[Type: ${val.store_type} | Zone: ${val.zone_code} | Rack: ${val.rack_code} | Bin: ${val.bin_code} | In-Charge: ${val.store_in_charge_name} (${val.contact_phone})] ${val.location_details}`;

    const payload: any = {
      project_id: Number(val.project_id),
      store_name: val.store_name,
      location_details: formattedLocation,
      is_central_warehouse: Boolean(val.is_central_warehouse)
    };

    if (this.editingStoreId) {
      this.procurementService.updateSiteStore(this.editingStoreId, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeStoreModal();
          this.loadStores();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.procurementService.createSiteStore(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeStoreModal();
          this.loadStores();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  confirmDeleteStore(store: SiteStore): void {
    this.deletingStoreId = store.id;
    this.selectedStore.set(store);
    this.isDeleteStoreModalOpen = true;
  }

  closeDeleteStoreModal(): void {
    this.isDeleteStoreModalOpen = false;
    this.deletingStoreId = null;
    this.selectedStore.set(null);
  }

  executeDeleteStore(): void {
    if (!this.deletingStoreId) return;
    this.procurementService.deleteSiteStore(this.deletingStoreId).subscribe({
      next: () => {
        this.closeDeleteStoreModal();
        this.loadStores();
      },
      error: () => this.closeDeleteStoreModal()
    });
  }

  // Stock Reservation Modal Management
  openReserveModal(stk: StoreStock): void {
    this.selectedStock.set(stk);
    this.activeReserveStock.set(stk);

    this.reserveForm.reset({
      store_id: stk.store_id,
      material_id: stk.material_id,
      work_order_reference: `WO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      reservation_purpose: 'Structural Slab Casting - 5th Floor Tower-A (Approved WBS Activity)',
      reserved_quantity: Math.min(50, Number(stk.current_stock_quantity) || 10)
    });

    this.isReserveModalOpen = true;
  }

  closeReserveModal(): void {
    this.isReserveModalOpen = false;
    this.selectedStock.set(null);
    this.activeReserveStock.set(null);
  }

  saveReservation(): void {
    if (this.reserveForm.invalid) return;

    this.isReserveSaving.set(true);
    const val = this.reserveForm.value;

    const payload = {
      store_id: Number(val.store_id),
      material_id: Number(val.material_id),
      reserved_quantity: Number(val.reserved_quantity),
      work_order_reference: val.work_order_reference,
      reservation_purpose: val.reservation_purpose
    };

    this.procurementService.reserveStoreStock(payload).subscribe({
      next: () => {
        this.isReserveSaving.set(false);
        this.closeReserveModal();
        this.loadStores();
      },
      error: () => this.isReserveSaving.set(false)
    });
  }

  // Physical Cycle Count Audit Modal Management
  openCycleModal(stk: StoreStock): void {
    this.selectedStock.set(stk);
    this.activeCycleStock.set(stk);

    this.cycleForm.reset({
      store_id: stk.store_id,
      material_id: stk.material_id,
      physical_counted_quantity: Number(stk.current_stock_quantity) || 0,
      cycle_count_date: new Date().toISOString().substring(0, 10),
      discrepancy_reason: 'Routine weekly physical cycle count verification.',
      counter_officer_name: 'Engr. Kamal Hossain (QA & Audit Officer)'
    });

    this.isCycleModalOpen = true;
  }

  closeCycleModal(): void {
    this.isCycleModalOpen = false;
    this.selectedStock.set(null);
    this.activeCycleStock.set(null);
  }

  saveCycleCount(): void {
    if (this.cycleForm.invalid) return;

    this.isCycleSaving.set(true);
    const val = this.cycleForm.value;

    const payload = {
      store_id: Number(val.store_id),
      material_id: Number(val.material_id),
      physical_counted_quantity: Number(val.physical_counted_quantity),
      cycle_count_date: val.cycle_count_date,
      discrepancy_reason: val.discrepancy_reason,
      counter_officer_name: val.counter_officer_name
    };

    this.procurementService.recordCycleCount(payload).subscribe({
      next: () => {
        this.isCycleSaving.set(false);
        this.closeCycleModal();
        this.loadStores();
      },
      error: () => this.isCycleSaving.set(false)
    });
  }

  // Barcode / QR Code Modal
  openQRModal(stk: StoreStock): void {
    this.selectedStock.set(stk);
    this.isQRModalOpen = true;
  }

  closeQRModal(): void {
    this.isQRModalOpen = false;
    this.selectedStock.set(null);
  }
}
