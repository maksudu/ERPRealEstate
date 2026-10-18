import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProcurementService } from '../../../core/services/procurement.service';
import { GoodsReceipt, PurchaseOrder } from '../../../core/models/procurement.model';
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
  selector: 'app-goods-receipts',
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
  templateUrl: './goods-receipts.component.html'
})
export class GoodsReceiptsComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Data signals
  goodsReceipts = signal<GoodsReceipt[]>([]);
  activePOs = signal<PurchaseOrder[]>([]);
  selectedGRN = signal<GoodsReceipt | null>(null);

  // Loading and State signals
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  is3WaySaving = signal<boolean>(false);

  // Modals
  isModalOpen = false;
  isViewModalOpen = false;
  is3WayModalOpen = false;
  isDeleteModalOpen = false;
  isEditMode = false;
  editingId: number | null = null;
  deletingId: number | null = null;

  // Filter and Pagination state
  searchQuery = '';
  selectedStatus = '';
  activeTab = 'ALL';
  limit = 20;
  offset = 0;
  totalRecords = signal<number>(0);

  // Quantities for interactive calculation
  selectedPO = signal<PurchaseOrder | null>(null);
  deliveredQty = signal<number>(0);
  rejectedQty = signal<number>(0);

  // Form for GRN Gate Entry
  grnForm: FormGroup = this.fb.group({
    po_id: ['', Validators.required],
    receipt_date: [new Date().toISOString().substring(0, 10), Validators.required],
    receiving_location: ['Central Site Store', Validators.required],
    delivery_challan_number: ['', Validators.required],
    gate_entry_number: [''],
    vehicle_number: ['', Validators.required],
    driver_name: [''],
    driver_phone: [''],
    batch_number: [''],
    physical_count_verified: [true],
    received_quantity: ['', [Validators.required, Validators.min(0.01)]],
    rejected_quantity: [0, [Validators.required, Validators.min(0)]],
    supplier_invoice_number: [''],
    supplier_invoice_amount: [''],
    inspection_remarks: ['']
  });

  // Form for 3-Way Match Verification
  matchForm: FormGroup = this.fb.group({
    supplier_invoice_number: ['', Validators.required],
    supplier_invoice_amount: ['', [Validators.required, Validators.min(0.01)]],
    approval_action: ['APPROVE_MATCH', Validators.required],
    accounts_notes: ['']
  });

  // Tabs for Quick Status Filtering
  tabs: TabItem[] = [
    { id: 'ALL', label: 'All Gate Receipts' },
    { id: 'PENDING', label: 'Pending Inspection' },
    { id: 'PASSED', label: 'QC Certified & Stocked' },
    { id: 'FAILED', label: 'Rejected / Quarantined' },
    { id: 'VARIANCE', label: 'Commercial Variance' }
  ];

  // Options for searchable PO select
  poOptions = computed(() => {
    return this.activePOs().map(po => ({
      value: po.id.toString(),
      label: `${po.po_number} - ${po.vendor_name || 'Vendor'} (${po.material_name || 'Item'})`,
      subLabel: `Ordered: ${po.ordered_quantity} ${po.unit_of_measure || ''} | Store: ${po.store_name || 'Site Store'}`
    }));
  });

  // Computed Quantities
  acceptedQty = computed(() => {
    return Math.max(0, this.deliveredQty() - this.rejectedQty());
  });

  shortDeliveredQty = computed(() => {
    const po = this.selectedPO();
    if (!po) return 0;
    const ordered = Number(po.ordered_quantity) || 0;
    return Math.max(0, ordered - this.deliveredQty());
  });

  poOutstandingQty = computed(() => {
    const po = this.selectedPO();
    if (!po) return 0;
    const ordered = Number(po.ordered_quantity) || 0;
    return Math.max(0, ordered - this.acceptedQty());
  });

  // Metrics KPI counters
  totalReceiptsCount = computed(() => this.goodsReceipts().length);
  pendingQCCount = computed(() => this.goodsReceipts().filter(g => g.qc_status === 'PENDING').length);
  passedQCCount = computed(() => this.goodsReceipts().filter(g => g.qc_status === 'PASSED').length);
  rejectedCount = computed(() => this.goodsReceipts().filter(g => g.qc_status === 'FAILED' || Number(g.rejected_quantity) > 0).length);
  varianceCount = computed(() => this.goodsReceipts().filter(g => g.three_way_match_status === 'VARIANCE_FLAGGED').length);

  ngOnInit(): void {
    this.loadGRNs();
    this.loadPOs();
  }

  loadPOs(): void {
    this.procurementService.getPurchaseOrders({ limit: 100 }).subscribe({
      next: (data) => this.activePOs.set(data),
      error: () => {}
    });
  }

  loadGRNs(): void {
    this.isLoading.set(true);
    const filters: any = {
      limit: this.limit,
      offset: this.offset
    };

    if (this.searchQuery) {
      filters.search = this.searchQuery;
    }

    if (this.activeTab === 'PENDING') {
      filters.qc_status = 'PENDING';
    } else if (this.activeTab === 'PASSED') {
      filters.qc_status = 'PASSED';
    } else if (this.activeTab === 'FAILED') {
      filters.qc_status = 'FAILED';
    } else if (this.activeTab === 'VARIANCE') {
      filters.match_status = 'VARIANCE_FLAGGED';
    } else if (this.selectedStatus) {
      filters.qc_status = this.selectedStatus;
    }

    this.procurementService.getGoodsReceipts(filters).subscribe({
      next: (data) => {
        this.goodsReceipts.set(data);
        this.totalRecords.set(data.length);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onTabChange(tabId: string): void {
    this.activeTab = tabId;
    this.offset = 0;
    this.loadGRNs();
  }

  onSearch(): void {
    this.offset = 0;
    this.loadGRNs();
  }

  nextPage(): void {
    this.offset += this.limit;
    this.loadGRNs();
  }

  previousPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadGRNs();
    }
  }

  onPOSelected(poIdStr: any): void {
    const poId = Number(poIdStr);
    const po = this.activePOs().find(p => p.id === poId);
    this.selectedPO.set(po || null);
    this.grnForm.patchValue({ po_id: poId });

    if (po) {
      // Pre-fill default received quantity from PO ordered quantity
      const defaultQty = Number(po.ordered_quantity) || 100;
      this.grnForm.patchValue({
        received_quantity: defaultQty,
        rejected_quantity: 0
      });
      this.deliveredQty.set(defaultQty);
      this.rejectedQty.set(0);
    }
  }

  onDeliveredInput(val: any): void {
    this.deliveredQty.set(Number(val) || 0);
  }

  onRejectedInput(val: any): void {
    this.rejectedQty.set(Number(val) || 0);
  }

  openAddGRNModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    const defaultPO = this.activePOs().length > 0 ? this.activePOs()[0] : null;

    this.grnForm.reset({
      po_id: defaultPO ? defaultPO.id : '',
      receipt_date: new Date().toISOString().substring(0, 10),
      receiving_location: 'Central Site Store',
      delivery_challan_number: `CH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      gate_entry_number: `GATE-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      vehicle_number: 'Dhaka Metro TA 11-2098',
      driver_name: '',
      driver_phone: '',
      batch_number: `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
      physical_count_verified: true,
      received_quantity: defaultPO ? Number(defaultPO.ordered_quantity) : 100,
      rejected_quantity: 0,
      supplier_invoice_number: '',
      supplier_invoice_amount: '',
      inspection_remarks: 'Consignment intact at gate. Bag seals verified dry and undamaged.'
    });

    if (defaultPO) {
      this.selectedPO.set(defaultPO);
      this.deliveredQty.set(Number(defaultPO.ordered_quantity));
      this.rejectedQty.set(0);
    }

    this.isModalOpen = true;
  }

  openEditGRNModal(grn: GoodsReceipt): void {
    this.isEditMode = true;
    this.editingId = grn.id;
    const po = this.activePOs().find(p => p.id === grn.po_id);
    this.selectedPO.set(po || null);
    this.deliveredQty.set(Number(grn.received_quantity));
    this.rejectedQty.set(Number(grn.rejected_quantity));

    this.grnForm.patchValue({
      po_id: grn.po_id,
      receipt_date: grn.receipt_date || new Date().toISOString().substring(0, 10),
      receiving_location: 'Central Site Store',
      delivery_challan_number: grn.delivery_challan_number,
      gate_entry_number: grn.gate_entry_number || '',
      vehicle_number: grn.vehicle_number || '',
      driver_name: grn.driver_name || '',
      driver_phone: grn.driver_phone || '',
      batch_number: 'LOT-BATCH-VERIFIED',
      physical_count_verified: grn.physical_count_verified,
      received_quantity: grn.received_quantity,
      rejected_quantity: grn.rejected_quantity,
      supplier_invoice_number: grn.supplier_invoice_number || '',
      supplier_invoice_amount: grn.supplier_invoice_amount || '',
      inspection_remarks: grn.inspection_remarks || ''
    });

    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveGRN(): void {
    if (this.grnForm.invalid) return;

    this.isSaving.set(true);
    const val = this.grnForm.value;

    const payload: any = {
      po_id: Number(val.po_id),
      delivery_challan_number: val.delivery_challan_number,
      gate_entry_number: val.gate_entry_number,
      vehicle_number: val.vehicle_number,
      driver_name: val.driver_name,
      driver_phone: val.driver_phone,
      physical_count_verified: Boolean(val.physical_count_verified),
      received_quantity: Number(val.received_quantity),
      rejected_quantity: Number(val.rejected_quantity || 0),
      supplier_invoice_number: val.supplier_invoice_number || null,
      supplier_invoice_amount: val.supplier_invoice_amount ? Number(val.supplier_invoice_amount) : null,
      inspection_remarks: `[Location: ${val.receiving_location} | Batch: ${val.batch_number || 'N/A'}] ${val.inspection_remarks || ''}`
    };

    if (this.isEditMode && this.editingId) {
      this.procurementService.updateGoodsReceipt(this.editingId, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadGRNs();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.procurementService.createGoodsReceipt(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadGRNs();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  viewGRNDetails(grn: GoodsReceipt): void {
    this.selectedGRN.set(grn);
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.selectedGRN.set(null);
  }

  open3WayMatchModal(grn: GoodsReceipt): void {
    this.selectedGRN.set(grn);
    const expected = Number(grn.calculated_expected_amount || (grn.accepted_quantity * (grn.po_unit_price || 0)));
    this.matchForm.reset({
      supplier_invoice_number: grn.supplier_invoice_number || `INV-${grn.delivery_challan_number}`,
      supplier_invoice_amount: grn.supplier_invoice_amount || expected,
      approval_action: 'APPROVE_MATCH',
      accounts_notes: '3-Way invoice match verified with Gate Challan physical count & PO unit rate.'
    });
    this.is3WayModalOpen = true;
  }

  close3WayModal(): void {
    this.is3WayModalOpen = false;
    this.selectedGRN.set(null);
  }

  save3WayMatch(): void {
    if (this.matchForm.invalid || !this.selectedGRN()) return;

    this.is3WaySaving.set(true);
    const val = this.matchForm.value;
    const payload = {
      supplier_invoice_number: val.supplier_invoice_number,
      supplier_invoice_amount: Number(val.supplier_invoice_amount),
      approval_action: val.approval_action,
      accounts_notes: val.accounts_notes
    };

    this.procurementService.executeThreeWayMatch(this.selectedGRN()!.id, payload).subscribe({
      next: () => {
        this.is3WaySaving.set(false);
        this.close3WayModal();
        this.loadGRNs();
      },
      error: () => this.is3WaySaving.set(false)
    });
  }

  confirmDeleteGRN(grn: GoodsReceipt): void {
    this.deletingId = grn.id;
    this.selectedGRN.set(grn);
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.deletingId = null;
    this.selectedGRN.set(null);
  }

  executeDelete(): void {
    if (!this.deletingId) return;
    this.procurementService.deleteGoodsReceipt(this.deletingId).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadGRNs();
      },
      error: () => this.closeDeleteModal()
    });
  }

  navigateToQC(grnId: number): void {
    this.router.navigate(['/procurement/inspections'], { queryParams: { grn_id: grnId } });
  }
}
