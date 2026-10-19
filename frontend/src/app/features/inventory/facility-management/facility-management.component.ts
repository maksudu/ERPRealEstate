import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import {
  Unit,
  FacilityItem,
  FacilitySummary,
  FacilityTransferLog,
  CombinationLogItem,
  FacilityCategory,
  FacilityType,
  ProposedUnitMergePayload,
  ProposedUnitSplitPayload
} from '../../../core/models/inventory.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  ModalComponent
} from '../../../shared/components';

@Component({
  selector: 'app-facility-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    CustomTextareaComponent,
    SearchableSelectComponent,
    ModalComponent
  ],
  templateUrl: './facility-management.component.html'
})
export class FacilityManagementComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Active Navigation Tab
  activeTab = signal<'facilities' | 'transfers' | 'combinations' | 'subdivisions' | 'logs'>('facilities');

  // Master Data Signals
  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);
  units = signal<Unit[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Summary Metrics
  facilitySummary = signal<FacilitySummary | null>(null);

  // Paged Facilities Signals
  facilities = signal<FacilityItem[]>([]);
  facilitiesTotal = signal<number>(0);
  facilitiesLimit = signal<number>(10);
  facilitiesOffset = signal<number>(0);
  categoryFilter = signal<string>('ALL');
  typeFilter = signal<string>('ALL');
  statusFilter = signal<string>('ALL');
  facilitySearch = signal<string>('');

  // Paged Transfers Signals
  transfers = signal<FacilityTransferLog[]>([]);
  transfersTotal = signal<number>(0);
  transfersLimit = signal<number>(10);
  transfersOffset = signal<number>(0);
  transferSearch = signal<string>('');

  // Paged Combination Logs Signals
  combinationLogs = signal<CombinationLogItem[]>([]);
  combinationTotal = signal<number>(0);
  combinationLimit = signal<number>(10);
  combinationOffset = signal<number>(0);
  combinationTypeFilter = signal<string>('ALL');

  // Modal Visibility Signals
  isCreateModalOpen = signal<boolean>(false);
  isAssignModalOpen = signal<boolean>(false);
  isTransferModalOpen = signal<boolean>(false);
  isReleaseModalOpen = signal<boolean>(false);
  selectedFacility = signal<FacilityItem | null>(null);
  releaseReason = signal<string>('');

  // Combination State
  selectedUnitsForMerge = signal<number[]>([]);
  mergeForm!: FormGroup;

  // Subdivision State
  selectedParentUnit = signal<Unit | null>(null);
  splitForm!: FormGroup;

  // Facility Forms
  createFacilityForm!: FormGroup;
  assignFacilityForm!: FormGroup;
  transferFacilityForm!: FormGroup;

  // Feedback Toast
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');

  // Dropdown Options
  projectOptions = computed(() => [
    { value: null, label: 'All Projects (Consolidated)' },
    ...this.projects().map(p => ({
      value: p.id,
      label: `${p.project_code} - ${p.project_name}`
    }))
  ]);

  facilityCategoryOptions = [
    { value: 'SEPARATELY_SALEABLE', label: 'Separately Saleable Asset' },
    { value: 'COMMON_FACILITY', label: 'Common Facility (Non-Saleable)' }
  ];

  facilityTypeOptions = [
    { value: 'PARKING_BASEMENT', label: 'Basement Parking (B1/B2/B3)' },
    { value: 'PARKING_GROUND', label: 'Ground Floor Parking' },
    { value: 'PARKING_COVERED', label: 'Covered Parking Bay' },
    { value: 'PARKING_OPEN', label: 'Open Driveway Parking' },
    { value: 'MOTORCYCLE_BAY', label: 'Motorcycle / Two-Wheeler Bay' },
    { value: 'STORAGE_ROOM', label: 'Storage Room / Driver Locker' },
    { value: 'ROOFTOP_FACILITY', label: 'Rooftop Facility / Terrace Bay' },
    { value: 'COMMUNITY_SPACE', label: 'Community Hall / Club Facility' },
    { value: 'COMMERCIAL_SIGNAGE', label: 'Commercial Signage / Ancillary Space' },
    { value: 'OTHER', label: 'Other Ancillary Utility Space' }
  ];

  filterFacilityTypeOptions = [
    { value: 'ALL', label: 'All Types' },
    ...this.facilityTypeOptions
  ];

  allocationTypeOptions = [
    { value: 'DEVELOPER_SALE', label: 'Developer Sale (Commercial Allotment)' },
    { value: 'LANDOWNER_ENTITLEMENT', label: 'Landowner Entitlement (JV Agreement)' },
    { value: 'TENANT_ALLOCATION', label: 'Tenant / Lease Allocation' },
    { value: 'COMMON_AMENITY', label: 'Common Resident Amenity' }
  ];

  unitTypeOptions = [
    { value: 'TYPE_3BHK', label: 'Standard 3-Bedroom (3BHK)' },
    { value: 'TYPE_4BHK', label: 'Luxury 4-Bedroom (4BHK)' },
    { value: 'PENTHOUSE', label: 'Exclusive Penthouse' },
    { value: 'DUPLEX', label: 'Duplex Suite' },
    { value: 'COMMERCIAL_SHOP', label: 'Commercial / Retail Shop' },
    { value: 'OFFICE_SPACE', label: 'Corporate Office Space' }
  ];

  facingOptions = [
    { value: 'SOUTH_FACING', label: 'South Facing (Optimal Light/Air)' },
    { value: 'NORTH_FACING', label: 'North Facing' },
    { value: 'LAKE_VIEW', label: 'Lake / Water View Front' },
    { value: 'CORNER_PLOT', label: 'Corner Plot (Double Road View)' },
    { value: 'ROAD_FACING', label: 'Main Boulevard Facing' }
  ];

  unitOptions = computed(() =>
    this.units().map(u => ({
      value: u.id,
      label: `Unit ${u.unit_number} (Floor ${u.floor_number} - ${u.status_id} - ${u.gross_saleable_area_sqft || 0} sft)`
    }))
  );

  // Computed helper for eligible adjacent units for merge
  eligibleMergeUnits = computed(() =>
    this.units().filter(u => u.status_id !== 'SOLD' && u.status_id !== 'BOOKED')
  );

  // Computed totals for proposed child units during split
  splitAreaSum = computed(() => {
    if (!this.splitForm) return 0;
    const children = this.splitForm.get('child_units')?.value as any[] || [];
    return children.reduce((sum, c) => sum + (Number(c.gross_saleable_area_sqft) || 0), 0);
  });

  splitAreaVariance = computed(() => {
    const parentArea = this.selectedParentUnit()?.gross_saleable_area_sqft || 0;
    return this.splitAreaSum() - parentArea;
  });

  ngOnInit(): void {
    this.initForms();
    this.loadProjects();
    this.loadFacilities();
    this.loadFacilitySummary();
  }

  private initForms(): void {
    // 1. Create Facility Form
    this.createFacilityForm = this.fb.group({
      project_id: [null, [Validators.required]],
      slot_number: ['', [Validators.required, Validators.maxLength(50)]],
      facility_category: ['SEPARATELY_SALEABLE', [Validators.required]],
      facility_type: ['PARKING_BASEMENT', [Validators.required]],
      floor_level: ['Basement 1', [Validators.required]],
      size_sqft: [150, [Validators.required, Validators.min(1)]],
      location_description: [''],
      price: [500000, [Validators.required, Validators.min(0)]],
      allows_shared_entitlement: [false],
      remarks: ['']
    });

    // 2. Assign Facility Form
    this.assignFacilityForm = this.fb.group({
      unit_id: [null],
      allocated_customer_name: ['', [Validators.required]],
      contract_reference: ['', [Validators.required]],
      allocation_type: ['DEVELOPER_SALE', [Validators.required]],
      package_price: [null],
      remarks: ['']
    });

    // 3. Transfer Facility Form
    this.transferFacilityForm = this.fb.group({
      to_customer_name: ['', [Validators.required]],
      to_contract_ref: ['', [Validators.required]],
      transfer_fee: [25000, [Validators.required, Validators.min(0)]],
      reason: ['', [Validators.required, Validators.minLength(5)]]
    });

    // 4. Unit Merge Proposal Form
    this.mergeForm = this.fb.group({
      combined_unit_number: ['', [Validators.required]],
      combined_floor_number: [1, [Validators.required]],
      combined_gross_sft: [0, [Validators.required, Validators.min(10)]],
      combined_net_sft: [0, [Validators.required, Validators.min(10)]],
      revised_price: [0, [Validators.required, Validators.min(0)]],
      technical_approval_by: ['', [Validators.required]],
      commercial_approval_by: ['', [Validators.required]],
      legal_approval_by: ['', [Validators.required]],
      drawing_attachment_url: [''],
      remarks: ['']
    });

    // 5. Unit Split Proposal Form
    this.splitForm = this.fb.group({
      child_units: this.fb.array([]),
      regulatory_approval_ref: ['', [Validators.required]],
      measurement_tolerance_notes: [''],
      technical_approval_by: ['', [Validators.required]],
      commercial_approval_by: ['', [Validators.required]],
      legal_approval_by: ['', [Validators.required]],
      drawing_attachment_url: ['']
    });
  }

  get childUnitsFormArray(): FormArray {
    return this.splitForm.get('child_units') as FormArray;
  }

  addChildUnitRow(): void {
    const parent = this.selectedParentUnit();
    const count = this.childUnitsFormArray.length + 1;
    const defaultCode = parent ? `${parent.unit_number}-${String.fromCharCode(64 + count)}` : `U-${count}`;
    const row = this.fb.group({
      unit_number: [defaultCode, [Validators.required]],
      gross_saleable_area_sqft: [parent ? Math.floor(parent.gross_saleable_area_sqft / 2) : 600, [Validators.required, Validators.min(10)]],
      net_carpet_area_sqft: [parent ? Math.floor(parent.net_carpet_area_sqft / 2) : 480, [Validators.required, Validators.min(10)]],
      unit_type_id: ['TYPE_3BHK', [Validators.required]],
      facing_id: ['SOUTH_FACING', [Validators.required]],
      bed_count: [2, [Validators.required, Validators.min(1)]],
      bath_count: [2, [Validators.required, Validators.min(1)]],
      balcony_count: [1, [Validators.required, Validators.min(0)]],
      base_rate_per_sqft: [parent ? parent.base_rate_per_sqft : 7500, [Validators.required, Validators.min(0)]],
      total_unit_price: [0, [Validators.required, Validators.min(0)]]
    });

    // Auto-calculate total price on area or rate change
    row.get('gross_saleable_area_sqft')?.valueChanges.subscribe(() => this.recalculateChildPrice(row));
    row.get('base_rate_per_sqft')?.valueChanges.subscribe(() => this.recalculateChildPrice(row));
    this.recalculateChildPrice(row);

    this.childUnitsFormArray.push(row);
  }

  removeChildUnitRow(index: number): void {
    if (this.childUnitsFormArray.length > 2) {
      this.childUnitsFormArray.removeAt(index);
    } else {
      this.showToast('Unit subdivision must produce at least 2 child units.', 'warning');
    }
  }

  private recalculateChildPrice(row: FormGroup): void {
    const area = Number(row.get('gross_saleable_area_sqft')?.value) || 0;
    const rate = Number(row.get('base_rate_per_sqft')?.value) || 0;
    row.patchValue({ total_unit_price: area * rate }, { emitEvent: false });
  }

  // ==========================================
  // Data Fetching
  // ==========================================
  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (data.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(data[0].id);
          this.loadUnits(data[0].id);
        }
      },
      error: () => this.showToast('Failed to load project list.', 'error')
    });
  }

  loadUnits(projectId: number): void {
    this.inventoryService.getUnits({ project_id: projectId }).subscribe({
      next: (data) => this.units.set(data),
      error: () => this.showToast('Failed to load project units.', 'error')
    });
  }

  onProjectChange(projectId: number | null): void {
    this.selectedProjectId.set(projectId);
    this.facilitiesOffset.set(0);
    this.loadFacilities();
    this.loadFacilitySummary();
    if (projectId) {
      this.loadUnits(projectId);
    }
  }

  loadFacilitySummary(): void {
    this.inventoryService.getFacilitySummary(this.selectedProjectId() || undefined).subscribe({
      next: (data) => this.facilitySummary.set(data),
      error: () => {}
    });
  }

  loadFacilities(): void {
    this.isLoading.set(true);
    this.inventoryService.getFacilitiesPaged({
      project_id: this.selectedProjectId() || undefined,
      facility_category: this.categoryFilter(),
      facility_type: this.typeFilter(),
      status: this.statusFilter(),
      search: this.facilitySearch() || undefined,
      limit: this.facilitiesLimit(),
      offset: this.facilitiesOffset()
    }).subscribe({
      next: (res) => {
        this.facilities.set(res.items);
        this.facilitiesTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error loading facility records.', 'error');
      }
    });
  }

  loadTransfers(): void {
    this.isLoading.set(true);
    this.inventoryService.getFacilityTransfers({
      search: this.transferSearch() || undefined,
      limit: this.transfersLimit(),
      offset: this.transfersOffset()
    }).subscribe({
      next: (res) => {
        this.transfers.set(res.items);
        this.transfersTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error loading transfer records.', 'error');
      }
    });
  }

  loadCombinationLogs(): void {
    this.isLoading.set(true);
    this.inventoryService.getCombinationAuditLogs({
      project_id: this.selectedProjectId() || undefined,
      action_type: this.combinationTypeFilter(),
      limit: this.combinationLimit(),
      offset: this.combinationOffset()
    }).subscribe({
      next: (res) => {
        this.combinationLogs.set(res.items);
        this.combinationTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error loading combination audit records.', 'error');
      }
    });
  }

  switchTab(tab: 'facilities' | 'transfers' | 'combinations' | 'subdivisions' | 'logs'): void {
    this.activeTab.set(tab);
    if (tab === 'facilities') {
      this.loadFacilities();
      this.loadFacilitySummary();
    } else if (tab === 'transfers') {
      this.loadTransfers();
    } else if (tab === 'logs') {
      this.loadCombinationLogs();
    }
  }

  // ==========================================
  // Facilities Actions (Create, Assign, Release, Transfer)
  // ==========================================
  openCreateFacilityModal(): void {
    this.createFacilityForm.patchValue({
      project_id: this.selectedProjectId() || (this.projects().length ? this.projects()[0].id : null),
      slot_number: '',
      facility_category: 'SEPARATELY_SALEABLE',
      facility_type: 'PARKING_BASEMENT',
      floor_level: 'Basement 1',
      size_sqft: 150,
      price: 500000,
      allows_shared_entitlement: false,
      remarks: ''
    });
    this.isCreateModalOpen.set(true);
  }

  submitCreateFacility(): void {
    if (this.createFacilityForm.invalid) {
      this.createFacilityForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.inventoryService.createFacility(this.createFacilityForm.value).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isCreateModalOpen.set(false);
        this.showToast(res.message || 'Facility asset created successfully.', 'success');
        this.loadFacilities();
        this.loadFacilitySummary();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Failed to create facility.', 'error');
      }
    });
  }

  openAssignModal(facility: FacilityItem): void {
    this.selectedFacility.set(facility);
    this.assignFacilityForm.reset({
      unit_id: facility.unit_id || null,
      allocated_customer_name: facility.allocated_customer_name || '',
      contract_reference: facility.contract_reference || '',
      allocation_type: facility.allocation_type || 'DEVELOPER_SALE',
      package_price: facility.package_price || facility.price,
      remarks: facility.remarks || ''
    });
    this.isAssignModalOpen.set(true);
  }

  submitAssignFacility(): void {
    const facility = this.selectedFacility();
    if (!facility || this.assignFacilityForm.invalid) {
      this.assignFacilityForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.inventoryService.assignFacility(facility.id, this.assignFacilityForm.value).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isAssignModalOpen.set(false);
        this.showToast(res.message || 'Facility assigned successfully.', 'success');
        this.loadFacilities();
        this.loadFacilitySummary();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Failed to assign facility.', 'error');
      }
    });
  }

  openReleaseModal(facility: FacilityItem): void {
    this.selectedFacility.set(facility);
    this.releaseReason.set('');
    this.isReleaseModalOpen.set(true);
  }

  submitReleaseFacility(): void {
    const facility = this.selectedFacility();
    if (!facility) return;
    this.isSubmitting.set(true);
    this.inventoryService.releaseFacility(facility.id, this.releaseReason()).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isReleaseModalOpen.set(false);
        this.showToast(res.message || 'Facility released back to inventory.', 'success');
        this.loadFacilities();
        this.loadFacilitySummary();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Failed to release facility.', 'error');
      }
    });
  }

  openTransferModal(facility: FacilityItem): void {
    this.selectedFacility.set(facility);
    this.transferFacilityForm.reset({
      to_customer_name: '',
      to_contract_ref: '',
      transfer_fee: 25000,
      reason: ''
    });
    this.isTransferModalOpen.set(true);
  }

  submitTransferFacility(): void {
    const facility = this.selectedFacility();
    if (!facility || this.transferFacilityForm.invalid) {
      this.transferFacilityForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const payload = {
      facility_id: facility.id,
      ...this.transferFacilityForm.value
    };
    this.inventoryService.transferFacility(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isTransferModalOpen.set(false);
        this.showToast(res.message || 'Facility ownership transferred successfully.', 'success');
        this.loadFacilities();
        this.loadTransfers();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Failed to transfer facility.', 'error');
      }
    });
  }

  // ==========================================
  // Unit Combination Actions (Spec 3.8)
  // ==========================================
  toggleUnitForMerge(unitId: number): void {
    const current = this.selectedUnitsForMerge();
    if (current.includes(unitId)) {
      this.selectedUnitsForMerge.set(current.filter(id => id !== unitId));
    } else {
      this.selectedUnitsForMerge.set([...current, unitId]);
    }
    this.recalculateMergeValues();
  }

  private recalculateMergeValues(): void {
    const selected = this.units().filter(u => this.selectedUnitsForMerge().includes(u.id));
    if (selected.length === 0) return;

    const totalGross = selected.reduce((sum, u) => sum + (u.gross_saleable_area_sqft || 0), 0);
    const totalNet = selected.reduce((sum, u) => sum + (u.net_carpet_area_sqft || 0), 0);
    const totalPrice = selected.reduce((sum, u) => sum + (u.total_unit_price || 0), 0);
    const combinedCode = selected.map(u => u.unit_number).join('+');
    const floor = selected[0].floor_number;

    this.mergeForm.patchValue({
      combined_unit_number: `COMB-${combinedCode}`,
      combined_floor_number: floor,
      combined_gross_sft: totalGross,
      combined_net_sft: totalNet,
      revised_price: totalPrice
    });
  }

  submitUnitMergeProposal(): void {
    if (!this.selectedProjectId() || this.selectedUnitsForMerge().length < 2) {
      this.showToast('Select at least 2 eligible adjacent units to merge.', 'warning');
      return;
    }
    if (this.mergeForm.invalid) {
      this.mergeForm.markAllAsTouched();
      return;
    }

    // Safeguard check: ensure no selected unit is sold or booked
    const selected = this.units().filter(u => this.selectedUnitsForMerge().includes(u.id));
    const committedUnit = selected.find(u => u.status_id === 'SOLD' || u.status_id === 'BOOKED');
    if (committedUnit) {
      this.showToast(`Unit ${committedUnit.unit_number} is ${committedUnit.status_id}. Contractually committed units cannot be merged via routine edits.`, 'error');
      return;
    }

    this.isSubmitting.set(true);
    const payload: ProposedUnitMergePayload = {
      project_id: this.selectedProjectId()!,
      source_unit_ids: this.selectedUnitsForMerge(),
      ...this.mergeForm.value
    };

    this.inventoryService.executeUnitMergeProposal(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast(res.message || 'Units merged successfully into new combined unit.', 'success');
        this.selectedUnitsForMerge.set([]);
        this.loadUnits(this.selectedProjectId()!);
        this.switchTab('logs');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Failed to merge units.', 'error');
      }
    });
  }

  // ==========================================
  // Unit Subdivision Actions (Spec 3.8)
  // ==========================================
  onParentUnitSelect(unitId: number | null): void {
    if (!unitId) {
      this.selectedParentUnit.set(null);
      this.childUnitsFormArray.clear();
      return;
    }
    const unit = this.units().find(u => u.id === unitId) || null;
    if (unit && (unit.status_id === 'SOLD' || unit.status_id === 'BOOKED')) {
      this.showToast(`Unit ${unit.unit_number} is ${unit.status_id}. Sold units require legal novation before subdivision.`, 'error');
      this.selectedParentUnit.set(null);
      return;
    }
    this.selectedParentUnit.set(unit);
    this.childUnitsFormArray.clear();
    // Add 2 initial child units
    this.addChildUnitRow();
    this.addChildUnitRow();
  }

  submitUnitSplitProposal(): void {
    const parent = this.selectedParentUnit();
    if (!parent) {
      this.showToast('Please select an eligible parent unit to subdivide.', 'warning');
      return;
    }
    if (this.childUnitsFormArray.length < 2) {
      this.showToast('Subdivision requires at least 2 child units.', 'warning');
      return;
    }
    if (this.splitForm.invalid) {
      this.splitForm.markAllAsTouched();
      return;
    }

    // Tolerance check: if variance exceeds 2%, warn user to document reason
    const parentArea = parent.gross_saleable_area_sqft || 1;
    const diffPct = Math.abs(this.splitAreaVariance()) / parentArea * 100;
    if (diffPct > 2.0 && !this.splitForm.get('measurement_tolerance_notes')?.value) {
      this.showToast(`Area variance is ${this.splitAreaVariance()} sft (${diffPct.toFixed(1)}%). Please document reconciliation notes before proceeding.`, 'warning');
      return;
    }

    this.isSubmitting.set(true);
    const payload: ProposedUnitSplitPayload = {
      parent_unit_id: parent.id,
      child_units: this.childUnitsFormArray.value,
      regulatory_approval_ref: this.splitForm.get('regulatory_approval_ref')?.value,
      measurement_tolerance_notes: this.splitForm.get('measurement_tolerance_notes')?.value,
      technical_approval_by: this.splitForm.get('technical_approval_by')?.value,
      commercial_approval_by: this.splitForm.get('commercial_approval_by')?.value,
      legal_approval_by: this.splitForm.get('legal_approval_by')?.value,
      drawing_attachment_url: this.splitForm.get('drawing_attachment_url')?.value
    };

    this.inventoryService.executeUnitSplitProposal(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast(res.message || 'Parent unit subdivided into child units successfully.', 'success');
        this.selectedParentUnit.set(null);
        this.childUnitsFormArray.clear();
        this.loadUnits(this.selectedProjectId()!);
        this.switchTab('logs');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Failed to subdivide unit.', 'error');
      }
    });
  }

  // ==========================================
  // Pagination Handlers
  // ==========================================
  nextFacilityPage(): void {
    if (this.facilitiesOffset() + this.facilitiesLimit() < this.facilitiesTotal()) {
      this.facilitiesOffset.update(v => v + this.facilitiesLimit());
      this.loadFacilities();
    }
  }

  prevFacilityPage(): void {
    if (this.facilitiesOffset() > 0) {
      this.facilitiesOffset.update(v => Math.max(0, v - this.facilitiesLimit()));
      this.loadFacilities();
    }
  }

  nextTransferPage(): void {
    if (this.transfersOffset() + this.transfersLimit() < this.transfersTotal()) {
      this.transfersOffset.update(v => v + this.transfersLimit());
      this.loadTransfers();
    }
  }

  prevTransferPage(): void {
    if (this.transfersOffset() > 0) {
      this.transfersOffset.update(v => Math.max(0, v - this.transfersLimit()));
      this.loadTransfers();
    }
  }

  nextCombinationPage(): void {
    if (this.combinationOffset() + this.combinationLimit() < this.combinationTotal()) {
      this.combinationOffset.update(v => v + this.combinationLimit());
      this.loadCombinationLogs();
    }
  }

  prevCombinationPage(): void {
    if (this.combinationOffset() > 0) {
      this.combinationOffset.update(v => Math.max(0, v - this.combinationLimit()));
      this.loadCombinationLogs();
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 5000);
  }
}
