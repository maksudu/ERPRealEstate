import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  MaterialIssueNote,
  MaterialItem,
  SiteStore
} from '../../../core/models/procurement.model';
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
  selector: 'app-material-issues',
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
  templateUrl: './material-issues.component.html'
})
export class MaterialIssuesComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Data signals
  materialIssues = signal<MaterialIssueNote[]>([]);
  reconciliationReports = signal<any[]>([]);
  stores = signal<SiteStore[]>([]);
  projects = signal<Project[]>([]);
  materials = signal<MaterialItem[]>([]);
  selectedMIN = signal<MaterialIssueNote | null>(null);

  // Loading and State signals
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isReturnSaving = signal<boolean>(false);

  // Modals
  isModalOpen = false;
  isReturnModalOpen = false;
  isViewModalOpen = false;
  isDeleteModalOpen = false;
  isEditMode = false;
  editingId: number | null = null;
  deletingId: number | null = null;

  // Filter and Pagination state
  searchQuery = '';
  selectedProjectId = '';
  selectedStoreId = '';
  activeTab = 'ALL_ISSUES';
  limit = 20;
  offset = 0;
  totalRecords = signal<number>(0);

  // Selected Store & Material for real-time stock balance & cost preview
  selectedStoreObj = signal<SiteStore | null>(null);
  selectedMaterialObj = signal<MaterialItem | null>(null);
  currentAvailableStock = signal<number>(0);
  currentUnitRate = signal<number>(0);
  issuedQtyInput = signal<number>(0);

  // Form for New / Edit Material Issue (MIN)
  minForm: FormGroup = this.fb.group({
    store_id: ['', Validators.required],
    project_id: ['', Validators.required],
    material_id: ['', Validators.required],
    tower_name: ['Tower-A', Validators.required],
    floor_number: ['05', Validators.required],
    wbs_node_name: ['Super-Structure Slab Casting', Validators.required],
    contractor_name: ['In-House Construction Crew / Structural Team', Validators.required],
    receiving_person: ['Engr. Tanvir Ahmed (Site Engineer)', Validators.required],
    batch_number: ['LOT-2026-ACTIVE'],
    issued_quantity: ['', [Validators.required, Validators.min(0.01)]],
    purpose: ['Structural concrete casting for 5th floor slab per approved BBS & BOQ.', Validators.required]
  });

  // Form for Returning Unused Materials
  returnForm: FormGroup = this.fb.group({
    returned_quantity: ['', [Validators.required, Validators.min(0.01)]],
    return_reason: ['UNUSED_RECOVERY', Validators.required],
    returning_person: ['Engr. Tanvir Ahmed (Site Engineer)', Validators.required],
    remarks: ['Surplus bags recovered following slab casting completion. Restored to store.']
  });

  // Filter tabs
  tabs: TabItem[] = [
    { id: 'ALL_ISSUES', label: 'All Material Issues (MIN)' },
    { id: 'RECONCILIATION', label: 'BOQ Consumption & Wastage Audit' },
    { id: 'STRUCTURAL', label: 'Structural Works' },
    { id: 'FINISHING', label: 'Finishing & MEP' },
    { id: 'RETURNS', label: 'Returns & Recoveries' }
  ];

  // Options for Store Select
  storeOptions = computed(() => {
    return this.stores().map(s => ({
      value: s.id.toString(),
      label: s.store_name,
      subLabel: `${s.is_central_warehouse ? '🏢 Central Warehouse' : '🏗️ Site Store'} | ${s.project_name || 'Project Site'}`
    }));
  });

  // Options for Project Select
  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id.toString(),
      label: p.project_name,
      subLabel: `Code: ${p.project_code || 'PRJ'} | Authority: ${p.development_authority_id || 'RAJUK'}`
    }));
  });

  // Options for Material Select
  materialOptions = computed(() => {
    return this.materials().map(m => ({
      value: m.id.toString(),
      label: `${m.material_name} (${m.material_code})`,
      subLabel: `Category: ${m.category} | UOM: ${m.unit_of_measure} | Standard: ৳${m.standard_unit_cost || 0}`
    }));
  });

  // Computed total cost preview
  estimatedIssueCost = computed(() => {
    return roundToTwo(this.issuedQtyInput() * this.currentUnitRate());
  });

  // KPI Metrics
  totalMINCount = computed(() => this.materialIssues().length);
  totalConsumptionCostBDT = computed(() => {
    return this.materialIssues().reduce((acc, mi) => acc + (Number(mi.total_issue_cost) || 0), 0);
  });
  totalReturnedQty = computed(() => {
    return this.materialIssues().reduce((acc, mi) => acc + (Number(mi.returned_quantity) || 0), 0);
  });
  avgWastagePct = computed(() => {
    const list = this.reconciliationReports();
    if (!list || list.length === 0) return 2.4;
    const sum = list.reduce((acc, r) => acc + (Number(r.wastage_percentage) || 0), 0);
    return roundToTwo(sum / list.length);
  });

  ngOnInit(): void {
    this.loadMINs();
    this.loadStores();
    this.loadProjects();
    this.loadMaterials();
    this.loadReconciliation();
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
    this.procurementService.getSiteStores().subscribe({
      next: (data) => this.stores.set(data),
      error: () => {}
    });
  }

  loadMINs(): void {
    this.isLoading.set(true);
    const filters: any = {
      limit: this.limit,
      offset: this.offset
    };

    if (this.searchQuery) {
      filters.search = this.searchQuery;
    }
    if (this.selectedProjectId) {
      filters.project_id = Number(this.selectedProjectId);
    }
    if (this.selectedStoreId) {
      filters.store_id = Number(this.selectedStoreId);
    }

    this.procurementService.getMaterialIssues(filters).subscribe({
      next: (data) => {
        let filtered = data;
        if (this.activeTab === 'STRUCTURAL') {
          filtered = filtered.filter(mi =>
            mi.material_name?.toLowerCase().includes('rod') ||
            mi.material_name?.toLowerCase().includes('steel') ||
            mi.material_name?.toLowerCase().includes('cement') ||
            mi.material_name?.toLowerCase().includes('sand') ||
            mi.material_name?.toLowerCase().includes('brick')
          );
        } else if (this.activeTab === 'FINISHING') {
          filtered = filtered.filter(mi =>
            !mi.material_name?.toLowerCase().includes('rod') &&
            !mi.material_name?.toLowerCase().includes('steel') &&
            !mi.material_name?.toLowerCase().includes('cement')
          );
        } else if (this.activeTab === 'RETURNS') {
          filtered = filtered.filter(mi => (Number(mi.returned_quantity) || 0) > 0 || (mi.purpose && mi.purpose.includes('Returned')));
        }

        this.materialIssues.set(filtered);
        this.totalRecords.set(filtered.length);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadReconciliation(): void {
    this.procurementService.getConsumptionReconciliationReport().subscribe({
      next: (data) => this.reconciliationReports.set(data),
      error: () => {}
    });
  }

  onTabChange(tabId: string): void {
    this.activeTab = tabId;
    this.offset = 0;
    if (tabId === 'RECONCILIATION') {
      this.loadReconciliation();
    } else {
      this.loadMINs();
    }
  }

  onSearch(): void {
    this.offset = 0;
    this.loadMINs();
  }

  nextPage(): void {
    this.offset += this.limit;
    this.loadMINs();
  }

  previousPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadMINs();
    }
  }

  onStoreSelected(storeIdStr: any): void {
    const sId = Number(storeIdStr);
    const s = this.stores().find(st => st.id === sId) || null;
    this.selectedStoreObj.set(s);
    this.minForm.patchValue({ store_id: sId });
    if (s && s.project_id) {
      this.minForm.patchValue({ project_id: s.project_id });
    }
    this.updateStockRatePreview();
  }

  onMaterialSelected(matIdStr: any): void {
    const mId = Number(matIdStr);
    const m = this.materials().find(mat => mat.id === mId) || null;
    this.selectedMaterialObj.set(m);
    this.minForm.patchValue({ material_id: mId });
    this.updateStockRatePreview();
  }

  onQtyInput(val: any): void {
    this.issuedQtyInput.set(Number(val) || 0);
  }

  updateStockRatePreview(): void {
    const s = this.selectedStoreObj();
    const m = this.selectedMaterialObj();
    if (!s || !m) {
      this.currentAvailableStock.set(0);
      this.currentUnitRate.set(m ? Number(m.standard_unit_cost) || 0 : 0);
      return;
    }

    const matchedStock = s.stocks?.find(stk => stk.material_id === m.id);
    if (matchedStock) {
      this.currentAvailableStock.set(Number(matchedStock.current_stock_quantity) || 0);
      this.currentUnitRate.set(Number(matchedStock.weighted_avg_rate) || Number(m.standard_unit_cost) || 0);
    } else {
      this.currentAvailableStock.set(0);
      this.currentUnitRate.set(Number(m.standard_unit_cost) || 0);
    }
  }

  openAddMINModal(): void {
    this.isEditMode = false;
    this.editingId = null;

    const defaultStore = this.stores().length > 0 ? this.stores()[0] : null;
    const defaultProj = this.projects().length > 0 ? this.projects()[0].id : '';
    const defaultMat = this.materials().length > 0 ? this.materials()[0] : null;

    this.minForm.reset({
      store_id: defaultStore ? defaultStore.id : '',
      project_id: defaultStore ? defaultStore.project_id : defaultProj,
      material_id: defaultMat ? defaultMat.id : '',
      tower_name: 'Tower-A',
      floor_number: '05',
      wbs_node_name: 'Super-Structure Slab Casting',
      contractor_name: 'In-House Construction Crew / Structural Team',
      receiving_person: 'Engr. Tanvir Ahmed (Site Engineer)',
      batch_number: 'LOT-2026-ACTIVE',
      issued_quantity: 50,
      purpose: 'Structural concrete casting for 5th floor slab per approved BBS & BOQ.'
    });

    this.selectedStoreObj.set(defaultStore);
    this.selectedMaterialObj.set(defaultMat);
    this.issuedQtyInput.set(50);
    this.updateStockRatePreview();

    this.isModalOpen = true;
  }

  openEditMINModal(min: MaterialIssueNote): void {
    this.isEditMode = true;
    this.editingId = min.id;

    this.minForm.patchValue({
      store_id: min.store_id,
      project_id: min.project_id,
      material_id: min.material_id,
      tower_name: min.tower_name || 'Tower-A',
      floor_number: min.floor_number || '01',
      wbs_node_name: min.wbs_node_name || 'WBS Activity',
      contractor_name: min.contractor_name || '',
      receiving_person: min.receiving_person || 'Site Engineer',
      batch_number: min.batch_number || 'LOT-2026-ACTIVE',
      issued_quantity: min.issued_quantity,
      purpose: min.purpose || ''
    });

    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingId = null;
  }

  saveMIN(): void {
    if (this.minForm.invalid) return;

    this.isSaving.set(true);
    const val = this.minForm.value;

    const payload: any = {
      store_id: Number(val.store_id),
      project_id: Number(val.project_id),
      material_id: Number(val.material_id),
      issued_quantity: Number(val.issued_quantity),
      tower_name: val.tower_name,
      floor_number: val.floor_number,
      contractor_name: val.contractor_name,
      receiving_person: val.receiving_person,
      purpose: `[Spatial: ${val.tower_name} Fl-${val.floor_number} | Activity: ${val.wbs_node_name} | Received By: ${val.receiving_person}] ${val.purpose}`
    };

    if (this.isEditMode && this.editingId) {
      this.procurementService.updateMaterialIssue(this.editingId, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadMINs();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.procurementService.createMaterialIssue(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadMINs();
          this.loadStores();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  // Material Return Modal
  openReturnModal(min: MaterialIssueNote): void {
    this.selectedMIN.set(min);
    this.returnForm.reset({
      returned_quantity: 10,
      return_reason: 'UNUSED_RECOVERY',
      returning_person: min.receiving_person || 'Site Engineer',
      remarks: 'Surplus unused materials recovered and returned to store following activity completion.'
    });
    this.isReturnModalOpen = true;
  }

  closeReturnModal(): void {
    this.isReturnModalOpen = false;
    this.selectedMIN.set(null);
  }

  saveReturn(): void {
    if (this.returnForm.invalid || !this.selectedMIN()) return;

    this.isReturnSaving.set(true);
    const val = this.returnForm.value;
    const payload = {
      min_id: this.selectedMIN()!.id,
      returned_quantity: Number(val.returned_quantity),
      return_reason: val.return_reason,
      returning_person: val.returning_person,
      remarks: val.remarks
    };

    this.procurementService.createMaterialReturn(payload).subscribe({
      next: () => {
        this.isReturnSaving.set(false);
        this.closeReturnModal();
        this.loadMINs();
        this.loadStores();
      },
      error: () => this.isReturnSaving.set(false)
    });
  }

  // View Issue Pass
  viewMINDetails(min: MaterialIssueNote): void {
    this.selectedMIN.set(min);
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.selectedMIN.set(null);
  }

  // Delete / Cancel MIN
  confirmDeleteMIN(min: MaterialIssueNote): void {
    this.deletingId = min.id;
    this.selectedMIN.set(min);
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.deletingId = null;
    this.selectedMIN.set(null);
  }

  executeDeleteMIN(): void {
    if (!this.deletingId) return;
    this.procurementService.deleteMaterialIssue(this.deletingId).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadMINs();
        this.loadStores();
      },
      error: () => this.closeDeleteModal()
    });
  }
}

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
