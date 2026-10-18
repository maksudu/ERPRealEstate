import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProcurementService } from '../../../core/services/procurement.service';
import { QualityInspection, GoodsReceipt } from '../../../core/models/procurement.model';
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
  selector: 'app-quality-inspections',
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
  templateUrl: './quality-inspections.component.html'
})
export class QualityInspectionsComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  // Data signals
  qualityInspections = signal<QualityInspection[]>([]);
  allGRNs = signal<GoodsReceipt[]>([]);
  pendingGRNs = signal<GoodsReceipt[]>([]);
  selectedQC = signal<QualityInspection | null>(null);

  // Loading and State signals
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Modals
  isModalOpen = false;
  isViewModalOpen = false;
  isDeleteModalOpen = false;
  isEditMode = false;
  editingId: number | null = null;
  deletingId: number | null = null;

  // Filters & Tabs
  searchQuery = '';
  selectedResult = '';
  activeTab = 'ALL';
  limit = 20;
  offset = 0;
  totalRecords = signal<number>(0);

  // Selected Category for Dynamic Checklist
  selectedCategory = signal<string>('STEEL_REBAR');

  // Form for Quality Inspection
  qcForm: FormGroup = this.fb.group({
    grn_id: ['', Validators.required],
    material_category: ['STEEL_REBAR', Validators.required],
    inspection_date: [new Date().toISOString().substring(0, 10), Validators.required],
    test_result: ['PASSED', Validators.required],
    // Steel Rebar fields
    tensile_strength_mpa: [520],
    mtr_mill_test_report_number: ['MTR-MILL-CERT-2026-9012'],
    mtr_verified: [true],
    // Cement fields
    slump_test_mm: [''],
    cement_batch_number: [''],
    bag_condition_ok: [true],
    // Bricks fields
    brick_strength_psi: [''],
    dimensions_checked: [true],
    // Aggregates & Sand fields
    silt_content_pct: [''],
    fm_fineness_modulus: [''],
    // Finishing fields
    sample_approved: [true],
    // NCR & Corrective Action
    ncr_number: [''],
    ncr_action: ['NONE'],
    debit_note_tracking: [''],
    qc_remarks: ['']
  });

  // Category filter tabs
  tabs: TabItem[] = [
    { id: 'ALL', label: 'All Inspections' },
    { id: 'PASSED', label: 'Passed & Stocked' },
    { id: 'CONDITIONAL_PASS', label: 'Conditional Releases' },
    { id: 'FAILED', label: 'Rejected / NCR' },
    { id: 'CEMENT', label: 'Cement Tests' },
    { id: 'STEEL', label: 'Steel Rebar / MTR' }
  ];

  // Options for GRN Select
  grnOptions = computed(() => {
    return this.allGRNs().map(g => ({
      value: g.id.toString(),
      label: `${g.grn_number} - ${g.material_name || 'Material'} (Challan: ${g.delivery_challan_number})`,
      subLabel: `Delivered: ${g.received_quantity} ${g.unit_of_measure || ''} | Supplier: ${g.vendor_name || 'Vendor'} | QC: ${g.qc_status}`
    }));
  });

  // KPI Metrics
  totalQCCount = computed(() => this.qualityInspections().length);
  passedCount = computed(() => this.qualityInspections().filter(q => q.test_result === 'PASSED').length);
  failedCount = computed(() => this.qualityInspections().filter(q => q.test_result === 'FAILED').length);
  conditionalCount = computed(() => this.qualityInspections().filter(q => q.test_result === 'CONDITIONAL_PASS').length);

  ngOnInit(): void {
    this.loadGRNs();
    this.loadQCs();

    // Check query params if directed from GRN list with a specific grn_id
    this.route.queryParams.subscribe(params => {
      if (params['grn_id']) {
        const targetGRNId = Number(params['grn_id']);
        setTimeout(() => {
          this.openAddQCModal(targetGRNId);
        }, 500);
      }
    });
  }

  loadGRNs(): void {
    this.procurementService.getGoodsReceipts({ limit: 100 }).subscribe({
      next: (data) => {
        this.allGRNs.set(data);
        this.pendingGRNs.set(data.filter(g => g.qc_status === 'PENDING'));
      },
      error: () => {}
    });
  }

  loadQCs(): void {
    this.isLoading.set(true);
    const filters: any = {
      limit: this.limit,
      offset: this.offset
    };

    if (this.searchQuery) {
      filters.search = this.searchQuery;
    }

    if (this.activeTab === 'PASSED') {
      filters.test_result = 'PASSED';
    } else if (this.activeTab === 'CONDITIONAL_PASS') {
      filters.test_result = 'CONDITIONAL_PASS';
    } else if (this.activeTab === 'FAILED') {
      filters.test_result = 'FAILED';
    } else if (this.selectedResult) {
      filters.test_result = this.selectedResult;
    }

    this.procurementService.getQualityInspections(filters).subscribe({
      next: (data) => {
        let filtered = data;
        if (this.activeTab === 'CEMENT') {
          filtered = filtered.filter(q => q.slump_test_mm != null || (q.qc_remarks && q.qc_remarks.toLowerCase().includes('cement')));
        } else if (this.activeTab === 'STEEL') {
          filtered = filtered.filter(q => q.tensile_strength_mpa != null || (q.qc_remarks && q.qc_remarks.toLowerCase().includes('steel')) || (q.mtr_mill_test_report_number != null));
        }
        this.qualityInspections.set(filtered);
        this.totalRecords.set(filtered.length);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onTabChange(tabId: string): void {
    this.activeTab = tabId;
    this.offset = 0;
    this.loadQCs();
  }

  onSearch(): void {
    this.offset = 0;
    this.loadQCs();
  }

  nextPage(): void {
    this.offset += this.limit;
    this.loadQCs();
  }

  previousPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadQCs();
    }
  }

  onCategoryChange(cat: string): void {
    this.selectedCategory.set(cat);
    this.qcForm.patchValue({ material_category: cat });

    // Set sensible lab standards per category
    if (cat === 'CEMENT') {
      this.qcForm.patchValue({
        slump_test_mm: 100,
        cement_batch_number: 'CEM-LOT-2026-98',
        qc_remarks: 'Cement bags dry, no lumps. Setting time and standard slump verified per BDS EN 197-1.'
      });
    } else if (cat === 'STEEL_REBAR') {
      this.qcForm.patchValue({
        tensile_strength_mpa: 520,
        mtr_mill_test_report_number: 'BSRM-MTR-2026-9012',
        qc_remarks: 'Grade 500W rebar tensile yield strength 520 MPa. 180-degree cold bend test passed with no surface cracks.'
      });
    } else if (cat === 'BRICKS') {
      this.qcForm.patchValue({
        brick_strength_psi: 2800,
        qc_remarks: 'First-class auto-kiln bricks. Standard size 9.5x4.5x2.75 inches verified. Compressive strength 2,800 PSI exceeds BNBC code.'
      });
    } else if (cat === 'AGGREGATES_SAND') {
      this.qcForm.patchValue({
        silt_content_pct: 2.1,
        fm_fineness_modulus: 2.6,
        qc_remarks: 'Coarse sand FM 2.6. Silt content 2.1% is well below 5% allowable ceiling.'
      });
    } else {
      this.qcForm.patchValue({
        sample_approved: true,
        qc_remarks: 'Sample board matches approved architect mock-up specification and color tone.'
      });
    }
  }

  onGRNSelected(grnIdStr: any): void {
    const grnId = Number(grnIdStr);
    this.qcForm.patchValue({ grn_id: grnId });
    const grn = this.allGRNs().find(g => g.id === grnId);
    if (grn && grn.material_name) {
      const mat = grn.material_name.toUpperCase();
      if (mat.includes('CEMENT')) {
        this.onCategoryChange('CEMENT');
      } else if (mat.includes('ROD') || mat.includes('STEEL') || mat.includes('REBAR')) {
        this.onCategoryChange('STEEL_REBAR');
      } else if (mat.includes('BRICK')) {
        this.onCategoryChange('BRICKS');
      } else if (mat.includes('SAND') || mat.includes('STONE') || mat.includes('AGGREGATE')) {
        this.onCategoryChange('AGGREGATES_SAND');
      } else {
        this.onCategoryChange('FINISHING_MEP');
      }
    }
  }

  openAddQCModal(preselectedGRNId?: number): void {
    this.isEditMode = false;
    this.editingId = null;

    const initialGRNId = preselectedGRNId || (this.pendingGRNs().length > 0 ? this.pendingGRNs()[0].id : (this.allGRNs().length > 0 ? this.allGRNs()[0].id : ''));

    this.qcForm.reset({
      grn_id: initialGRNId,
      material_category: 'STEEL_REBAR',
      inspection_date: new Date().toISOString().substring(0, 10),
      test_result: 'PASSED',
      tensile_strength_mpa: 520,
      mtr_mill_test_report_number: `MTR-MILL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      mtr_verified: true,
      slump_test_mm: 100,
      cement_batch_number: 'CEM-LOT-2026-98',
      bag_condition_ok: true,
      brick_strength_psi: 2800,
      dimensions_checked: true,
      silt_content_pct: 2.1,
      fm_fineness_modulus: 2.6,
      sample_approved: true,
      ncr_number: '',
      ncr_action: 'NONE',
      debit_note_tracking: '',
      qc_remarks: 'Consignment certified per BNBC 2020 / ASTM C150 standards. Cleared for store stock posting.'
    });

    if (initialGRNId) {
      this.onGRNSelected(initialGRNId);
    } else {
      this.selectedCategory.set('STEEL_REBAR');
    }

    this.isModalOpen = true;
  }

  openEditQCModal(qc: QualityInspection): void {
    this.isEditMode = true;
    this.editingId = qc.id;

    let cat = 'STEEL_REBAR';
    if (qc.slump_test_mm) cat = 'CEMENT';
    else if (qc.tensile_strength_mpa) cat = 'STEEL_REBAR';
    this.selectedCategory.set(cat);

    this.qcForm.patchValue({
      grn_id: qc.grn_id,
      material_category: cat,
      inspection_date: qc.inspection_date || new Date().toISOString().substring(0, 10),
      test_result: qc.test_result,
      tensile_strength_mpa: qc.tensile_strength_mpa || '',
      mtr_mill_test_report_number: qc.mtr_mill_test_report_number || '',
      mtr_verified: qc.mtr_verified,
      slump_test_mm: qc.slump_test_mm || '',
      qc_remarks: qc.qc_remarks || ''
    });

    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveQC(): void {
    if (this.qcForm.invalid) return;

    this.isSaving.set(true);
    const val = this.qcForm.value;

    let detailedRemarks = val.qc_remarks || '';
    if (val.test_result === 'FAILED' && val.ncr_number) {
      detailedRemarks = `[NCR: ${val.ncr_number} | Action: ${val.ncr_action} | Debit Note: ${val.debit_note_tracking || 'PENDING'}] ${detailedRemarks}`;
    }

    const payload: any = {
      grn_id: Number(val.grn_id),
      slump_test_mm: val.slump_test_mm ? Number(val.slump_test_mm) : null,
      tensile_strength_mpa: val.tensile_strength_mpa ? Number(val.tensile_strength_mpa) : null,
      mtr_mill_test_report_number: val.mtr_mill_test_report_number || 'MTR-CERT-OK',
      mtr_verified: Boolean(val.mtr_verified),
      test_result: val.test_result,
      qc_remarks: detailedRemarks
    };

    if (this.isEditMode && this.editingId) {
      this.procurementService.updateQualityInspection(this.editingId, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadQCs();
          this.loadGRNs();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.procurementService.createQualityInspection(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadQCs();
          this.loadGRNs();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  viewQCDetails(qc: QualityInspection): void {
    this.selectedQC.set(qc);
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.selectedQC.set(null);
  }

  confirmDeleteQC(qc: QualityInspection): void {
    this.deletingId = qc.id;
    this.selectedQC.set(qc);
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.deletingId = null;
    this.selectedQC.set(null);
  }

  executeDelete(): void {
    if (!this.deletingId) return;
    this.procurementService.deleteQualityInspection(this.deletingId).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadQCs();
        this.loadGRNs();
      },
      error: () => this.closeDeleteModal()
    });
  }
}
