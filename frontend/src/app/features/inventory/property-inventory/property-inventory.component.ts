import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  Unit,
  UnitTile,
  InventoryDashboardResponse,
  UnitPagedResponse,
  UnitCreatePayload,
  UnitUpdatePayload,
  BulkUnitCreatePayload,
  ParkingSlot,
  TowerStackingResponse
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

export type InventoryTab = 'dashboard' | 'matrix' | 'units' | 'area_calc' | 'parking';

@Component({
  selector: 'app-property-inventory',
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
  templateUrl: './property-inventory.component.html'
})
export class PropertyInventoryComponent implements OnInit, OnDestroy {
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Active workspace tab
  activeTab = signal<InventoryTab>('dashboard');

  // Loading States
  loadingDashboard = signal<boolean>(true);
  loadingUnits = signal<boolean>(false);
  loadingMatrix = signal<boolean>(false);
  loadingParking = signal<boolean>(false);
  actionInProgress = signal<boolean>(false);

  // Master lookup data
  projects = signal<Project[]>([]);
  dashboardData = signal<InventoryDashboardResponse | null>(null);
  stackingData = signal<TowerStackingResponse | null>(null);
  parkingSlots = signal<ParkingSlot[]>([]);

  // Filter state for dashboard & matrix
  selectedProjectFilter = signal<string>('all');
  selectedTowerFilter = signal<string>('all');
  selectedStatusFilter = signal<string>('all');
  selectedFacingFilter = signal<string>('all');
  selectedPropertyTypeFilter = signal<string>('all');
  selectedAllocationFilter = signal<string>('all');

  // Paged Unit Directory state
  pagedUnits = signal<Unit[]>([]);
  totalUnitsCount = signal<number>(0);
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);
  unitSearchTerm = signal<string>('');

  // Modals state
  isUnitModalOpen = signal<boolean>(false);
  isBulkModalOpen = signal<boolean>(false);
  isDetailModalOpen = signal<boolean>(false);
  isPricingModalOpen = signal<boolean>(false);
  isParkingAssignModalOpen = signal<boolean>(false);

  // Active item in modal
  editingUnit = signal<Unit | null>(null);
  inspectingUnit = signal<Unit | null>(null);
  selectedParkingForAssign = signal<ParkingSlot | null>(null);

  // Forms
  unitForm!: FormGroup;
  bulkForm!: FormGroup;
  parkingAssignForm!: FormGroup;

  // Real-time updates subscription
  private wsSubscription?: Subscription;
  private timerSubscription?: Subscription;

  // Area & Price Calculator interactive state
  calcChargeableArea = signal<number>(1850);
  calcRatePerSqft = signal<number>(12500);
  calcFloorRise = signal<number>(100);
  calcFloorNumber = signal<number>(10);
  calcFacingPremium = signal<number>(500);
  calcUtilityFee = signal<number>(250000);
  calcParkingPrice = signal<number>(500000);
  calcMaxDiscount = signal<number>(150000);

  // Computed Pricing calculation
  computedEffectiveRate = computed(() => {
    const base = Number(this.calcRatePerSqft()) || 0;
    const flRise = (Number(this.calcFloorRise()) || 0) * Math.max(0, (Number(this.calcFloorNumber()) || 1) - 1);
    const facing = Number(this.calcFacingPremium()) || 0;
    return base + flRise + facing;
  });

  computedBaseUnitPrice = computed(() => {
    const area = Number(this.calcChargeableArea()) || 0;
    return Math.round(area * this.computedEffectiveRate());
  });

  computedTotalContractualPrice = computed(() => {
    const base = this.computedBaseUnitPrice();
    const utility = Number(this.calcUtilityFee()) || 0;
    const parking = Number(this.calcParkingPrice()) || 0;
    return base + utility + parking;
  });

  computedMinAllowedPrice = computed(() => {
    return Math.max(0, this.computedTotalContractualPrice() - (Number(this.calcMaxDiscount()) || 0));
  });

  // Dropdown Options
  projectOptions = computed<SelectOption[]>(() => {
    const list = this.projects();
    return [
      { label: 'All Projects (Portfolio)', value: 'all' },
      ...list.map(p => ({
        label: `${p.project_code} - ${p.project_name}`,
        value: String(p.id),
        sublabel: p.district || 'Dhaka'
      }))
    ];
  });

  projectSelectOptions = computed<SelectOption[]>(() => {
    return this.projects().map(p => ({
      label: `${p.project_code} - ${p.project_name}`,
      value: String(p.id)
    }));
  });

  towerOptions: SelectOption[] = [
    { label: 'All Towers / Blocks', value: 'all' },
    { label: 'Tower A (North Wing)', value: '1' },
    { label: 'Tower B (South Wing)', value: '2' },
    { label: 'Commercial Podium', value: '3' }
  ];

  statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Available (Open for Sale)', value: 'AVAILABLE' },
    { label: 'Reserved (Temporary Hold)', value: 'RESERVED' },
    { label: 'On Hold (15-Min Lock)', value: 'ON_HOLD' },
    { label: 'Booked (Booking Confirmed)', value: 'BOOKED' },
    { label: 'Sold (Sale Registered)', value: 'SOLD' },
    { label: 'Landowner Share (JV Quota)', value: 'LANDOWNER_SHARE' },
    { label: 'Blocked / Restricted', value: 'BLOCKED' }
  ];

  facingOptions: SelectOption[] = [
    { label: 'All Facings / Views', value: 'all' },
    { label: 'South Facing (Optimal Light)', value: 'SOUTH_FACING' },
    { label: 'Lake View (Premium View)', value: 'LAKE_VIEW' },
    { label: 'Corner Plot (Dual Road View)', value: 'CORNER_PLOT' },
    { label: 'North Facing', value: 'NORTH_FACING' },
    { label: 'Road Facing', value: 'ROAD_FACING' }
  ];

  propertyTypeOptions: SelectOption[] = [
    { label: 'All Property Types', value: 'all' },
    { label: 'Apartment (Residential)', value: 'TYPE_3BHK' },
    { label: 'Luxury Apartment (4BHK)', value: 'TYPE_4BHK' },
    { label: 'Penthouse Suite', value: 'PENTHOUSE' },
    { label: 'Duplex Apartment', value: 'DUPLEX' },
    { label: 'Commercial Retail Shop', value: 'COMMERCIAL_SHOP' },
    { label: 'Corporate Office Space', value: 'CORPORATE_OFFICE' }
  ];

  unitCategoryOptions: SelectOption[] = [
    { label: 'Standard Category', value: 'Standard' },
    { label: 'Premium Lakefront', value: 'Premium' },
    { label: 'Corner Unit', value: 'Corner' },
    { label: 'Duplex Residence', value: 'Duplex' },
    { label: 'Top-Floor Penthouse', value: 'Penthouse' }
  ];

  allocationTypeOptions: SelectOption[] = [
    { label: 'All Allocation Shares', value: 'all' },
    { label: 'Developer Inventory (Saleable)', value: 'DEVELOPER' },
    { label: 'Landowner Share (JV Agreement)', value: 'LANDOWNER' }
  ];

  ngOnInit(): void {
    this.initForms();
    this.loadProjects();
    this.loadDashboardData();
    this.loadUnitsPaged();
    this.loadParkingSlots();
    this.initRealTimeListeners();
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
    if (this.timerSubscription) this.timerSubscription.unsubscribe();
    this.inventoryService.disconnectLiveMatrix();
  }

  private initForms(): void {
    this.unitForm = this.fb.group({
      project_id: [null, Validators.required],
      tower_id: [1, Validators.required],
      floor_number: [1, [Validators.required, Validators.min(1)]],
      unit_number: ['', [Validators.required, Validators.maxLength(32)]],
      unit_type_id: ['TYPE_3BHK', Validators.required],
      facing_id: ['SOUTH_FACING', Validators.required],
      net_carpet_area_sqft: [1450.0, [Validators.required, Validators.min(100)]],
      gross_saleable_area_sqft: [1850.0, [Validators.required, Validators.min(100)]],
      bed_count: [3, [Validators.required, Validators.min(0)]],
      bath_count: [3, [Validators.required, Validators.min(0)]],
      balcony_count: [2, [Validators.required, Validators.min(0)]],
      base_rate_per_sqft: [12500.0, [Validators.required, Validators.min(1000)]],
      floor_escalation_rate: [100.0, Validators.min(0)],
      facing_premium_rate: [0.0, Validators.min(0)],
      utility_connection_fee: [250000.0, Validators.min(0)],
      parking_charge: [0.0, Validators.min(0)],
      max_discount_amount: [150000.0, Validators.min(0)],
      status_id: ['AVAILABLE', Validators.required],
      is_landowner_share: [false],
      floor_plan_image_url: ['']
    });

    this.bulkForm = this.fb.group({
      project_id: [null, Validators.required],
      tower_id: [1, Validators.required],
      start_floor: [1, [Validators.required, Validators.min(1)]],
      end_floor: [14, [Validators.required, Validators.min(1)]],
      units_per_floor: [4, [Validators.required, Validators.min(1), Validators.max(8)]],
      unit_prefix: ['FLAT', Validators.required],
      unit_type_id: ['TYPE_3BHK', Validators.required],
      facing_id: ['SOUTH_FACING', Validators.required],
      net_carpet_area_sqft: [1450.0, Validators.required],
      gross_saleable_area_sqft: [1850.0, Validators.required],
      base_rate_per_sqft: [12500.0, Validators.required],
      floor_escalation_rate: [100.0, Validators.required],
      facing_premium_rate: [0.0],
      is_landowner_share_pattern: ['NONE']
    });

    this.parkingAssignForm = this.fb.group({
      unit_id: [null, Validators.required]
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (list) => {
        this.projects.set(list || []);
        if (list && list.length > 0 && !this.unitForm.get('project_id')?.value) {
          this.unitForm.patchValue({ project_id: list[0].id });
          this.bulkForm.patchValue({ project_id: list[0].id });
        }
      },
      error: (err) => console.error('Error loading projects', err)
    });
  }

  loadDashboardData(): void {
    this.loadingDashboard.set(true);
    const prjId = this.selectedProjectFilter() !== 'all' ? Number(this.selectedProjectFilter()) : null;
    const twrId = this.selectedTowerFilter() !== 'all' ? Number(this.selectedTowerFilter()) : null;
    const pType = this.selectedPropertyTypeFilter() !== 'all' ? this.selectedPropertyTypeFilter() : null;
    const stId = this.selectedStatusFilter() !== 'all' ? this.selectedStatusFilter() : null;

    this.inventoryService.getInventoryDashboard({
      project_id: prjId,
      tower_id: twrId,
      property_type: pType,
      status_id: stId
    }).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.loadingDashboard.set(false);
      },
      error: (err) => {
        console.error('Error loading inventory dashboard', err);
        this.loadingDashboard.set(false);
      }
    });
  }

  loadUnitsPaged(): void {
    this.loadingUnits.set(true);
    const prjId = this.selectedProjectFilter() !== 'all' ? Number(this.selectedProjectFilter()) : null;
    const twrId = this.selectedTowerFilter() !== 'all' ? Number(this.selectedTowerFilter()) : null;
    const stId = this.selectedStatusFilter() !== 'all' ? this.selectedStatusFilter() : null;
    const fcId = this.selectedFacingFilter() !== 'all' ? this.selectedFacingFilter() : null;
    const isLand = this.selectedAllocationFilter() === 'LANDOWNER' ? true : (this.selectedAllocationFilter() === 'DEVELOPER' ? false : null);

    this.inventoryService.getUnitsPaged({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.unitSearchTerm() || undefined,
      project_id: prjId,
      tower_id: twrId,
      status_id: stId,
      facing_id: fcId,
      is_landowner_share: isLand
    }).subscribe({
      next: (res) => {
        this.pagedUnits.set(res.items || []);
        this.totalUnitsCount.set(res.total || 0);
        this.loadingUnits.set(false);
      },
      error: (err) => {
        console.error('Error fetching paged units', err);
        this.loadingUnits.set(false);
      }
    });
  }

  loadStackingPlan(): void {
    const prjId = this.selectedProjectFilter() !== 'all' ? Number(this.selectedProjectFilter()) : (this.projects()[0]?.id || 1);
    this.loadingMatrix.set(true);
    this.inventoryService.getStackingPlan(prjId).subscribe({
      next: (data) => {
        this.stackingData.set(data);
        this.loadingMatrix.set(false);
      },
      error: (err) => {
        console.error('Error loading stacking plan', err);
        this.loadingMatrix.set(false);
      }
    });
  }

  loadParkingSlots(): void {
    this.loadingParking.set(true);
    const prjId = this.selectedProjectFilter() !== 'all' ? Number(this.selectedProjectFilter()) : null;
    this.inventoryService.getParkingSlots({ project_id: prjId || undefined }).subscribe({
      next: (slots) => {
        this.parkingSlots.set(slots || []);
        this.loadingParking.set(false);
      },
      error: (err) => {
        console.error('Error loading parking slots', err);
        this.loadingParking.set(false);
      }
    });
  }

  setTab(tab: InventoryTab): void {
    this.activeTab.set(tab);
    if (tab === 'matrix' && !this.stackingData()) {
      this.loadStackingPlan();
    } else if (tab === 'units') {
      this.loadUnitsPaged();
    } else if (tab === 'parking') {
      this.loadParkingSlots();
    } else if (tab === 'dashboard') {
      this.loadDashboardData();
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadDashboardData();
    this.loadUnitsPaged();
    if (this.activeTab() === 'matrix') {
      this.loadStackingPlan();
    }
  }

  resetFilters(): void {
    this.selectedProjectFilter.set('all');
    this.selectedTowerFilter.set('all');
    this.selectedStatusFilter.set('all');
    this.selectedFacingFilter.set('all');
    this.selectedPropertyTypeFilter.set('all');
    this.selectedAllocationFilter.set('all');
    this.unitSearchTerm.set('');
    this.currentPage.set(1);
    this.loadDashboardData();
    this.loadUnitsPaged();
  }

  // Unit CRUD Modals
  openCreateUnitModal(): void {
    this.editingUnit.set(null);
    this.unitForm.reset({
      project_id: this.projects()[0]?.id || 1,
      tower_id: 1,
      floor_number: 1,
      unit_number: '',
      unit_type_id: 'TYPE_3BHK',
      facing_id: 'SOUTH_FACING',
      net_carpet_area_sqft: 1450.0,
      gross_saleable_area_sqft: 1850.0,
      bed_count: 3,
      bath_count: 3,
      balcony_count: 2,
      base_rate_per_sqft: 12500.0,
      floor_escalation_rate: 100.0,
      facing_premium_rate: 0.0,
      utility_connection_fee: 250000.0,
      parking_charge: 0.0,
      max_discount_amount: 150000.0,
      status_id: 'AVAILABLE',
      is_landowner_share: false
    });
    this.isUnitModalOpen.set(true);
  }

  openEditUnitModal(unit: Unit): void {
    this.editingUnit.set(unit);
    this.unitForm.patchValue({
      project_id: unit.project_id,
      tower_id: unit.tower_id,
      floor_number: unit.floor_number,
      unit_number: unit.unit_number,
      unit_type_id: unit.unit_type_id,
      facing_id: unit.facing_id,
      net_carpet_area_sqft: unit.net_carpet_area_sqft,
      gross_saleable_area_sqft: unit.gross_saleable_area_sqft,
      bed_count: unit.bed_count || 3,
      bath_count: unit.bath_count || 3,
      balcony_count: unit.balcony_count || 2,
      base_rate_per_sqft: unit.base_rate_per_sqft,
      floor_escalation_rate: unit.floor_escalation_rate,
      facing_premium_rate: unit.facing_premium_rate,
      utility_connection_fee: unit.utility_connection_fee || 250000.0,
      parking_charge: unit.parking_charge || 0.0,
      max_discount_amount: unit.max_discount_amount || 150000.0,
      status_id: unit.status_id,
      is_landowner_share: unit.is_landowner_share,
      floor_plan_image_url: unit.floor_plan_image_url || ''
    });
    this.isUnitModalOpen.set(true);
  }

  saveUnit(): void {
    if (this.unitForm.invalid) {
      this.unitForm.markAllAsTouched();
      return;
    }
    this.actionInProgress.set(true);
    const val = this.unitForm.value;
    const editing = this.editingUnit();

    if (editing) {
      this.inventoryService.updateUnit(editing.id, val).subscribe({
        next: () => {
          this.actionInProgress.set(false);
          this.isUnitModalOpen.set(false);
          this.loadUnitsPaged();
          this.loadDashboardData();
        },
        error: (err) => {
          console.error('Error updating unit', err);
          this.actionInProgress.set(false);
        }
      });
    } else {
      this.inventoryService.createUnit(val).subscribe({
        next: () => {
          this.actionInProgress.set(false);
          this.isUnitModalOpen.set(false);
          this.loadUnitsPaged();
          this.loadDashboardData();
        },
        error: (err) => {
          console.error('Error creating unit', err);
          this.actionInProgress.set(false);
        }
      });
    }
  }

  deleteUnit(unit: Unit): void {
    if (confirm(`Are you sure you want to delete unit ${unit.unit_number}? This action cannot be undone.`)) {
      this.inventoryService.deleteUnit(unit.id).subscribe({
        next: () => {
          this.loadUnitsPaged();
          this.loadDashboardData();
        },
        error: (err) => {
          alert(err.error?.detail || 'Failed to delete unit.');
        }
      });
    }
  }

  // Bulk Creator
  openBulkModal(): void {
    this.isBulkModalOpen.set(true);
  }

  submitBulkCreate(): void {
    if (this.bulkForm.invalid) {
      this.bulkForm.markAllAsTouched();
      return;
    }
    this.actionInProgress.set(true);
    const val: BulkUnitCreatePayload = this.bulkForm.value;
    this.inventoryService.bulkCreateUnits(val).subscribe({
      next: (res) => {
        this.actionInProgress.set(false);
        this.isBulkModalOpen.set(false);
        alert(res.message);
        this.loadUnitsPaged();
        this.loadDashboardData();
      },
      error: (err) => {
        console.error('Bulk creation error', err);
        this.actionInProgress.set(false);
        alert('Bulk creation failed: ' + (err.error?.detail || 'Unknown error'));
      }
    });
  }

  // Unit Detail Inspection
  viewUnitDetails(unit: Unit | UnitTile): void {
    if ('unit_type_id' in unit) {
      this.inspectingUnit.set(unit);
    } else {
      const mapped: Unit = {
        id: unit.id,
        project_id: unit.project_id,
        tower_id: unit.tower_id,
        floor_number: unit.floor_number,
        unit_number: unit.unit_number,
        unit_type_id: unit.unit_type,
        facing_id: unit.facing,
        net_carpet_area_sqft: unit.net_carpet_sft,
        gross_saleable_area_sqft: unit.gross_sft,
        bed_count: unit.bed_count,
        bath_count: unit.bath_count,
        balcony_count: unit.balcony_count,
        base_rate_per_sqft: unit.base_price_per_sft,
        floor_escalation_rate: 0,
        facing_premium_rate: 0,
        effective_rate_per_sqft: unit.base_price_per_sft,
        total_unit_price: unit.total_base_price,
        status_id: (unit.status || 'AVAILABLE') as any,
        is_landowner_share: unit.is_landowner_share || false
      };
      this.inspectingUnit.set(mapped);
    }
    this.isDetailModalOpen.set(true);
  }

  // 15-Minute Instant Mutex Lock
  lockUnit(unit: Unit | UnitTile): void {
    this.inventoryService.reserveUnit(unit.id, 'Senior Sales Executive').subscribe({
      next: (res) => {
        alert(res.message);
        this.loadUnitsPaged();
        this.loadDashboardData();
      },
      error: (err) => {
        alert(err.error?.detail || 'Unit is already locked or unavailable.');
      }
    });
  }

  unlockUnit(unit: Unit | UnitTile): void {
    this.inventoryService.releaseUnit(unit.id).subscribe({
      next: (res) => {
        alert(res.message);
        this.loadUnitsPaged();
        this.loadDashboardData();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to unlock unit.');
      }
    });
  }

  // Parking Allocation Modal
  openAssignParking(slot: ParkingSlot): void {
    this.selectedParkingForAssign.set(slot);
    this.parkingAssignForm.reset();
    this.isParkingAssignModalOpen.set(true);
  }

  submitParkingAssignment(): void {
    const slot = this.selectedParkingForAssign();
    const unitId = this.parkingAssignForm.get('unit_id')?.value;
    if (!slot || !unitId) return;

    this.actionInProgress.set(true);
    this.inventoryService.assignParkingSlot(slot.id, Number(unitId)).subscribe({
      next: (res) => {
        this.actionInProgress.set(false);
        this.isParkingAssignModalOpen.set(false);
        alert(res.message);
        this.loadParkingSlots();
      },
      error: (err) => {
        this.actionInProgress.set(false);
        alert(err.error?.detail || 'Failed to allocate parking slot.');
      }
    });
  }

  // Pagination navigation
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadUnitsPaged();
  }

  totalPages = computed(() => {
    return Math.ceil(this.totalUnitsCount() / this.pageSize()) || 1;
  });

  // Real-time WebSocket connection
  private initRealTimeListeners(): void {
    this.inventoryService.connectLiveMatrix();
    this.wsSubscription = this.inventoryService.realTimeUpdates$.subscribe({
      next: (msg) => {
        console.log('Real-Time Inventory Broadcast:', msg);
        // Refresh live figures
        this.loadDashboardData();
        this.loadUnitsPaged();
      }
    });

    // Tick countdown timer every 10 seconds
    this.timerSubscription = interval(10000).subscribe(() => {
      const units = this.pagedUnits();
      if (units.some(u => u.status_id === 'ON_HOLD')) {
        this.loadUnitsPaged();
      }
    });
  }

  // Helpers
  formatBDT(val?: number): string {
    if (val === undefined || val === null) return '৳0.00';
    const num = Number(val);
    const abs = Math.abs(num);
    if (abs >= 10000000) {
      return `৳${(num / 10000000).toFixed(2)} Cr`;
    } else if (abs >= 100000) {
      return `৳${(num / 100000).toFixed(2)} Lac`;
    }
    return `৳${num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RESERVED':
      case 'ON_HOLD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'BOOKED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SOLD':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'LANDOWNER_SHARE':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'BLOCKED':
      case 'RETAINED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  exportExcel(): void {
    alert('Generating consolidated Inventory Schedule report (Excel & PDF)... Download starting shortly.');
  }
}
