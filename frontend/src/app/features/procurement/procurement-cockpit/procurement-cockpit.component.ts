import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ProjectService } from '../../../core/services/project.service';
import { ConstructionService } from '../../../core/services/construction.service';
import {
  Vendor,
  MaterialItem,
  SiteStore,
  StoreStock,
  PurchaseRequisition,
  RFQ,
  ComparativeStatement,
  PurchaseOrder,
  GoodsReceipt,
  QualityInspection,
  MaterialIssueNote,
  StockTransfer,
  StockLedger,
  StoreValuationResponse,
  ProcurementMetrics
} from '../../../core/models/procurement.model';
import { Project } from '../../../core/models/project.model';
import { BOQItemBudgetLock, WBSNode } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

export type SCMTab = 'pr_rfq' | 'cs' | 'po' | 'grn_qc' | 'valuation_stores' | 'min_transfers';

@Component({
  selector: 'app-procurement-cockpit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './procurement-cockpit.component.html',
  styleUrls: ['./procurement-cockpit.component.css']
})
export class ProcurementCockpitComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private projectService = inject(ProjectService);
  private constructionService = inject(ConstructionService);
  private fb = inject(FormBuilder);

  // Active Tab
  activeTab = signal<SCMTab>('pr_rfq');

  // Master Data Signals
  projects = signal<Project[]>([]);
  vendors = signal<Vendor[]>([]);
  materials = signal<MaterialItem[]>([]);
  stores = signal<SiteStore[]>([]);
  boqItems = signal<BOQItemBudgetLock[]>([]);
  wbsNodes = signal<WBSNode[]>([]);
  metrics = signal<ProcurementMetrics | null>(null);

  // Selected Scope
  selectedProjectId = signal<number | null>(null);

  // Tab Data Signals
  requisitions = signal<PurchaseRequisition[]>([]);
  rfqs = signal<RFQ[]>([]);
  csList = signal<ComparativeStatement[]>([]);
  purchaseOrders = signal<PurchaseOrder[]>([]);
  goodsReceipts = signal<GoodsReceipt[]>([]);
  qualityInspections = signal<QualityInspection[]>([]);
  valuationSummary = signal<StoreValuationResponse[]>([]);
  materialIssues = signal<MaterialIssueNote[]>([]);
  stockTransfers = signal<StockTransfer[]>([]);

  // Loading States
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Modals
  isCreatePRModalOpen = signal<boolean>(false);
  isCreateRFQModalOpen = signal<boolean>(false);
  isCreateCSModalOpen = signal<boolean>(false);
  isGeneratePOModalOpen = signal<boolean>(false);
  isGateEntryModalOpen = signal<boolean>(false);
  isQCModalOpen = signal<boolean>(false);
  isThreeWayMatchModalOpen = signal<boolean>(false);
  isMINModalOpen = signal<boolean>(false);
  isTransferModalOpen = signal<boolean>(false);

  // Selection targets
  selectedPR = signal<PurchaseRequisition | null>(null);
  selectedCS = signal<ComparativeStatement | null>(null);
  selectedGRN = signal<GoodsReceipt | null>(null);

  // Forms
  prForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    material_id: [null, Validators.required],
    requested_quantity: [100, [Validators.required, Validators.min(0.01)]],
    boq_item_id: [null],
    wbs_node_id: [null],
    tower_name: ['Tower A'],
    floor_number: ['Typical Floor 4'],
    required_by_date: [new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]],
    purpose_notes: ['']
  });

  rfqForm: FormGroup = this.fb.group({
    pr_id: [null, Validators.required],
    submission_deadline: [new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], Validators.required],
    vendor_ids: [[], [Validators.required]],
    notes: ['Please submit lowest rate with 30-day payment credit and factory test certificate.']
  });

  csForm: FormGroup = this.fb.group({
    pr_id: [null, Validators.required],
    justification_summary: [''],
    quotations: this.fb.array([])
  });

  poFromCSForm: FormGroup = this.fb.group({
    destination_store_id: [null, Validators.required],
    delivery_deadline: [new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], Validators.required],
    delivery_schedule_notes: ['Deliver in 2 equal lots directly to site yard.'],
    terms_and_conditions: ['Payment within 30 days of 3-Way Match GRN and QC certification.']
  });

  gateEntryForm: FormGroup = this.fb.group({
    po_id: [null, Validators.required],
    delivery_challan_number: ['', Validators.required],
    gate_entry_number: [''],
    vehicle_number: ['Dhaka Metro TA 11-4567', Validators.required],
    driver_name: ['Md. Mizanur Rahman', Validators.required],
    driver_phone: ['01711223344'],
    received_quantity: [100, [Validators.required, Validators.min(0.01)]],
    rejected_quantity: [0, [Validators.min(0)]],
    physical_count_verified: [true],
    supplier_invoice_number: [''],
    supplier_invoice_amount: [null],
    inspection_remarks: ['']
  });

  qcForm: FormGroup = this.fb.group({
    grn_id: [null, Validators.required],
    slump_test_mm: [100, [Validators.required, Validators.min(0)]],
    tensile_strength_mpa: [520, [Validators.min(0)]],
    mtr_mill_test_report_number: ['MTR-BSRM-88912', Validators.required],
    mtr_verified: [true],
    test_result: ['PASSED', Validators.required],
    qc_remarks: ['Slump and tensile yield passed BNBC/ASTM specifications.']
  });

  threeWayMatchForm: FormGroup = this.fb.group({
    supplier_invoice_number: ['', Validators.required],
    supplier_invoice_amount: [0, [Validators.required, Validators.min(1)]],
    approval_action: ['APPROVE_MATCH', Validators.required],
    accounts_notes: ['']
  });

  minForm: FormGroup = this.fb.group({
    store_id: [null, Validators.required],
    project_id: [null, Validators.required],
    material_id: [null, Validators.required],
    issued_quantity: [10, [Validators.required, Validators.min(0.01)]],
    tower_name: ['Tower A'],
    floor_number: ['Floor 3'],
    wbs_node_id: [null],
    contractor_name: ['Bengal Civil Builders Ltd.'],
    purpose: ['Column casting Level 3']
  });

  transferForm: FormGroup = this.fb.group({
    from_store_id: [null, Validators.required],
    to_store_id: [null, Validators.required],
    material_id: [null, Validators.required],
    transfer_quantity: [50, [Validators.required, Validators.min(0.01)]],
    dispatch_challan_number: ['TRF-CH-0481', Validators.required],
    remarks: ['Inter-site stock balance rebalancing.']
  });

  // Dynamic Search Select Options
  projectOptions = computed(() =>
    this.projects().map(p => ({ value: p.id, id: p.id, label: `${p.project_code} - ${p.project_name}` }))
  );

  materialOptions = computed(() =>
    this.materials().map(m => ({ value: m.id, id: m.id, label: `${m.material_code} - ${m.material_name} (${m.unit_of_measure})` }))
  );

  vendorOptions = computed(() =>
    this.vendors().map(v => ({ value: v.id, id: v.id, label: `${v.vendor_name} [${v.trade_category}]` }))
  );

  storeOptions = computed(() =>
    this.stores().map(s => ({
      value: s.id,
      id: s.id,
      label: `${s.store_name} ${s.is_central_warehouse ? '★ [CENTRAL WAREHOUSE]' : '[SITE STORE]'}`
    }))
  );

  boqOptions = computed(() =>
    this.boqItems().map(b => {
      const remaining = (b.allowable_quantity ?? (b.estimated_quantity * (b.hard_lock_percentage || 1.05) + (b.variation_order_quantity || 0))) - (b.requisitioned_quantity || 0);
      return {
        value: b.id,
        id: b.id,
        label: `${b.item_code || ('BOQ-' + b.id)} - ${b.item_description} (Headroom: ${remaining.toFixed(1)} ${b.unit_of_measure_id})`
      };
    })
  );

  wbsOptions = computed(() =>
    this.wbsNodes().map(w => ({
      value: w.id,
      id: w.id,
      label: `${w.node_code} - ${w.node_name} [${w.phase_category}]`
    }))
  );

  prOptions = computed(() =>
    this.requisitions().map(pr => ({
      value: pr.id,
      id: pr.id,
      label: `${pr.pr_number} - ${pr.material_name} (${pr.requested_quantity} ${pr.unit_of_measure})`
    }))
  );

  poOptions = computed(() =>
    this.purchaseOrders().map(po => ({
      value: po.id,
      id: po.id,
      label: `${po.po_number} - ${po.vendor_name} (${po.material_name})`
    }))
  );

  get quotationForms(): FormArray {
    return this.csForm.get('quotations') as FormArray;
  }

  ngOnInit(): void {
    this.loadMasterData();
    this.loadTabCurrentData();
  }

  loadMasterData(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        if (projs.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(projs[0].id);
          this.prForm.patchValue({ project_id: projs[0].id });
          this.minForm.patchValue({ project_id: projs[0].id });
          this.loadProjectDependencies(projs[0].id);
        }
      }
    });

    this.procurementService.getVendors().subscribe({ next: (v) => this.vendors.set(v) });
    this.procurementService.getMaterials().subscribe({ next: (m) => this.materials.set(m) });
    this.procurementService.getSiteStores().subscribe({ next: (s) => this.stores.set(s) });
    this.procurementService.getMetrics().subscribe({ next: (m) => this.metrics.set(m) });
  }

  loadProjectDependencies(projId: number): void {
    this.constructionService.getBOQBudgetLocks({ project_id: projId }).subscribe({ next: (b) => this.boqItems.set(b) });
    this.constructionService.getWBSNodes({ project_id: projId }).subscribe({ next: (w) => this.wbsNodes.set(w) });
  }

  onProjectChange(projId: number): void {
    this.selectedProjectId.set(projId);
    this.prForm.patchValue({ project_id: projId });
    this.minForm.patchValue({ project_id: projId });
    this.loadProjectDependencies(projId);
    this.loadTabCurrentData();
  }

  setTab(tab: SCMTab): void {
    this.activeTab.set(tab);
    this.loadTabCurrentData();
  }

  loadTabCurrentData(): void {
    const projId = this.selectedProjectId() || undefined;
    this.isLoading.set(true);

    switch (this.activeTab()) {
      case 'pr_rfq':
        this.procurementService.getRequisitions({ project_id: projId }).subscribe({
          next: (prs) => {
            this.requisitions.set(prs);
            this.procurementService.getRFQs().subscribe({
              next: (r) => {
                this.rfqs.set(r);
                this.isLoading.set(false);
              },
              error: () => this.isLoading.set(false)
            });
          },
          error: () => this.isLoading.set(false)
        });
        break;

      case 'cs':
        this.procurementService.getComparativeStatements().subscribe({
          next: (cs) => {
            this.csList.set(cs);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false)
        });
        break;

      case 'po':
        this.procurementService.getPurchaseOrders({ project_id: projId }).subscribe({
          next: (pos) => {
            this.purchaseOrders.set(pos);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false)
        });
        break;

      case 'grn_qc':
        this.procurementService.getGoodsReceipts().subscribe({
          next: (grns) => {
            this.goodsReceipts.set(grns);
            this.procurementService.getQualityInspections().subscribe({
              next: (qcs) => {
                this.qualityInspections.set(qcs);
                this.isLoading.set(false);
              },
              error: () => this.isLoading.set(false)
            });
          },
          error: () => this.isLoading.set(false)
        });
        break;

      case 'valuation_stores':
        this.procurementService.getStoreValuationSummary().subscribe({
          next: (val) => {
            this.valuationSummary.set(val);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false)
        });
        break;

      case 'min_transfers':
        this.procurementService.getMaterialIssues({ project_id: projId }).subscribe({
          next: (mi) => {
            this.materialIssues.set(mi);
            this.procurementService.getStockTransfers().subscribe({
              next: (trf) => {
                this.stockTransfers.set(trf);
                this.isLoading.set(false);
              },
              error: () => this.isLoading.set(false)
            });
          },
          error: () => this.isLoading.set(false)
        });
        break;
    }
  }

  // --- PR Operations ---
  openCreatePRModal(): void {
    this.prForm.reset({
      project_id: this.selectedProjectId(),
      requested_quantity: 100,
      required_by_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      tower_name: 'Tower A',
      floor_number: 'Typical Floor 4'
    });
    this.isCreatePRModalOpen.set(true);
  }

  submitPR(): void {
    if (this.prForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.createRequisition(this.prForm.value).subscribe({
      next: (pr) => {
        this.requisitions.update(list => [pr, ...list]);
        this.isSubmitting.set(false);
        this.isCreatePRModalOpen.set(false);
        this.procurementService.getMetrics().subscribe({ next: (m) => this.metrics.set(m) });
      },
      error: (err) => {
        alert(err?.error?.detail || 'Requisition creation failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- RFQ Operations ---
  openCreateRFQModal(pr?: PurchaseRequisition): void {
    if (pr) this.selectedPR.set(pr);
    const prId = pr ? pr.id : (this.requisitions().length > 0 ? this.requisitions()[0].id : null);
    this.rfqForm.reset({
      pr_id: prId,
      submission_deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      vendor_ids: this.vendors().slice(0, 3).map(v => v.id),
      notes: 'Please quote best rates with 30-day payment credit and factory test certificate.'
    });
    this.isCreateRFQModalOpen.set(true);
  }

  submitRFQ(): void {
    if (this.rfqForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.createRFQ(this.rfqForm.value).subscribe({
      next: (rfq) => {
        this.rfqs.update(list => [rfq, ...list]);
        this.isSubmitting.set(false);
        this.isCreateRFQModalOpen.set(false);
        this.loadTabCurrentData();
      },
      error: (err) => {
        alert(err?.error?.detail || 'RFQ creation failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- CS Operations ---
  openCreateCSModal(pr?: PurchaseRequisition): void {
    const prId = pr ? pr.id : (this.requisitions().length > 0 ? this.requisitions()[0].id : null);
    this.csForm.reset({
      pr_id: prId,
      justification_summary: 'Lowest commercial bid selected with full technical compliance.'
    });

    this.quotationForms.clear();
    const activeVendors = this.vendors().slice(0, 2);
    activeVendors.forEach(v => {
      this.quotationForms.push(this.fb.group({
        vendor_id: [v.id, Validators.required],
        brand_grade: ['BSRM 500W Grade 72.5'],
        payment_terms: ['30 Days Credit'],
        technical_compliance: ['COMPLIANT'],
        quoted_unit_rate: [95000, [Validators.required, Validators.min(0.01)]],
        credit_days_offered: [30],
        lead_time_days: [3],
        remarks: ['']
      }));
    });

    this.isCreateCSModalOpen.set(true);
  }

  addQuotationRow(): void {
    this.quotationForms.push(this.fb.group({
      vendor_id: [null, Validators.required],
      brand_grade: [''],
      payment_terms: ['30 Days Credit'],
      technical_compliance: ['COMPLIANT'],
      quoted_unit_rate: [1000, [Validators.required, Validators.min(0.01)]],
      credit_days_offered: [30],
      lead_time_days: [3],
      remarks: ['']
    }));
  }

  removeQuotationRow(index: number): void {
    if (this.quotationForms.length > 2) {
      this.quotationForms.removeAt(index);
    }
  }

  submitCS(): void {
    if (this.csForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.createComparativeStatement(this.csForm.value).subscribe({
      next: (cs) => {
        this.csList.update(list => [cs, ...list]);
        this.isSubmitting.set(false);
        this.isCreateCSModalOpen.set(false);
        this.setTab('cs');
      },
      error: (err) => {
        alert(err?.error?.detail || 'CS creation failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- PO Operations ---
  openGeneratePOModal(cs: ComparativeStatement): void {
    this.selectedCS.set(cs);
    const store = this.stores().length > 0 ? this.stores()[0].id : null;
    this.poFromCSForm.reset({
      destination_store_id: store,
      delivery_deadline: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      delivery_schedule_notes: 'Deliver directly to site material store yard.',
      terms_and_conditions: 'Payment within 30 days of 3-Way Match GRN verification.'
    });
    this.isGeneratePOModalOpen.set(true);
  }

  submitPOFromCS(): void {
    const cs = this.selectedCS();
    if (!cs || this.poFromCSForm.invalid) return;
    this.isSubmitting.set(true);
    const payload = {
      cs_id: cs.id,
      ...this.poFromCSForm.value
    };
    this.procurementService.generatePOFromCS(payload).subscribe({
      next: (po) => {
        this.purchaseOrders.update(list => [po, ...list]);
        this.isSubmitting.set(false);
        this.isGeneratePOModalOpen.set(false);
        this.setTab('po');
      },
      error: (err) => {
        alert(err?.error?.detail || 'PO generation failed');
        this.isSubmitting.set(false);
      }
    });
  }

  approvePO(po: PurchaseOrder): void {
    if (!confirm(`Approve Purchase Order #${po.po_number} for BDT ${po.total_po_amount.toLocaleString()}?`)) return;
    this.procurementService.approvePurchaseOrder(po.id, { approved: true }).subscribe({
      next: (updated) => {
        this.purchaseOrders.update(list => list.map(p => p.id === updated.id ? updated : p));
      },
      error: (err) => alert(err?.error?.detail || 'PO approval failed')
    });
  }

  // --- Gate Entry & GRN Operations ---
  openGateEntryModal(po?: PurchaseOrder): void {
    const poId = po ? po.id : (this.purchaseOrders().length > 0 ? this.purchaseOrders()[0].id : null);
    const poObj = po || this.purchaseOrders().find(p => p.id === poId);
    const qty = poObj ? poObj.ordered_quantity : 100;

    this.gateEntryForm.reset({
      po_id: poId,
      delivery_challan_number: `CH-${Date.now().toString().slice(-6)}`,
      gate_entry_number: `GATE-2026-${Date.now().toString().slice(-4)}`,
      vehicle_number: 'Dhaka Metro TA 11-4567',
      driver_name: 'Md. Al-Amin',
      driver_phone: '01711223344',
      received_quantity: qty,
      rejected_quantity: 0,
      physical_count_verified: true,
      supplier_invoice_number: `INV-VND-${Date.now().toString().slice(-5)}`,
      supplier_invoice_amount: poObj ? roundToTwo(qty * poObj.unit_price) : 0,
      inspection_remarks: 'Consignment verified at main site entry gate.'
    });
    this.isGateEntryModalOpen.set(true);
  }

  submitGateEntry(): void {
    if (this.gateEntryForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.createGoodsReceipt(this.gateEntryForm.value).subscribe({
      next: (grn) => {
        this.goodsReceipts.update(list => [grn, ...list]);
        this.isSubmitting.set(false);
        this.isGateEntryModalOpen.set(false);
        this.setTab('grn_qc');
      },
      error: (err) => {
        alert(err?.error?.detail || 'Gate Entry recording failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Quality Inspection (QC) ---
  openQCModal(grn: GoodsReceipt): void {
    this.selectedGRN.set(grn);
    this.qcForm.reset({
      grn_id: grn.id,
      slump_test_mm: 100,
      tensile_strength_mpa: 520,
      mtr_mill_test_report_number: 'MTR-CERT-ASTM-OK',
      mtr_verified: true,
      test_result: 'PASSED',
      qc_remarks: 'Verified compressive slump / tensile yield against BNBC 2020 standard.'
    });
    this.isQCModalOpen.set(true);
  }

  submitQC(): void {
    if (this.qcForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.createQualityInspection(this.qcForm.value).subscribe({
      next: (qc) => {
        this.qualityInspections.update(list => [qc, ...list]);
        this.goodsReceipts.update(list =>
          list.map(g => g.id === qc.grn_id ? { ...g, qc_status: 'PASSED' as any, status: 'VERIFIED_STORE' as any } : g)
        );
        this.isSubmitting.set(false);
        this.isQCModalOpen.set(false);
        alert(`✓ Quality Inspection #${qc.inspection_number} PASSED!\nStore inventory credited and Weighted Average valuation updated.`);
      },
      error: (err) => {
        alert(err?.error?.detail || 'QC submission failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- 3-Way Match ---
  openThreeWayMatchModal(grn: GoodsReceipt): void {
    this.selectedGRN.set(grn);
    this.threeWayMatchForm.reset({
      supplier_invoice_number: grn.supplier_invoice_number || `INV-${grn.delivery_challan_number}`,
      supplier_invoice_amount: grn.supplier_invoice_amount || grn.calculated_expected_amount,
      approval_action: 'APPROVE_MATCH',
      accounts_notes: 'PO Rate x Certified Received Quantity matches Supplier Invoice.'
    });
    this.isThreeWayMatchModalOpen.set(true);
  }

  submitThreeWayMatch(): void {
    const grn = this.selectedGRN();
    if (!grn || this.threeWayMatchForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.executeThreeWayMatch(grn.id, this.threeWayMatchForm.value).subscribe({
      next: (updated) => {
        this.goodsReceipts.update(list => list.map(g => g.id === updated.id ? updated : g));
        this.isSubmitting.set(false);
        this.isThreeWayMatchModalOpen.set(false);
        alert(`🎉 3-Way Match Verified!\nGeneral Ledger Journal Voucher Created: ${updated.accounts_voucher_ref}`);
      },
      error: (err) => {
        alert(err?.error?.detail || '3-Way Match verification failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- MIN Operations ---
  openMINModal(): void {
    const store = this.stores().length > 0 ? this.stores()[0].id : null;
    const mat = this.materials().length > 0 ? this.materials()[0].id : null;
    this.minForm.reset({
      store_id: store,
      project_id: this.selectedProjectId(),
      material_id: mat,
      issued_quantity: 10,
      tower_name: 'Tower A',
      floor_number: 'Floor 3',
      contractor_name: 'Bengal Civil Builders Ltd.',
      purpose: 'Column casting Level 3'
    });
    this.isMINModalOpen.set(true);
  }

  submitMIN(): void {
    if (this.minForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.createMaterialIssue(this.minForm.value).subscribe({
      next: (mi) => {
        this.materialIssues.update(list => [mi, ...list]);
        this.isSubmitting.set(false);
        this.isMINModalOpen.set(false);
        alert(`✓ Material Issue Note #${mi.min_number} issued for ${mi.issued_quantity} ${mi.unit_of_measure}!\nValued at BDT ${mi.total_issue_cost.toLocaleString()}.`);
      },
      error: (err) => {
        alert(err?.error?.detail || 'MIN issuance failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Inter-Site Stock Transfer ---
  openTransferModal(): void {
    const fromStore = this.stores().find(s => s.is_central_warehouse) || (this.stores().length > 0 ? this.stores()[0] : null);
    const toStore = this.stores().find(s => !s.is_central_warehouse) || (this.stores().length > 1 ? this.stores()[1] : null);
    const mat = this.materials().length > 0 ? this.materials()[0].id : null;

    this.transferForm.reset({
      from_store_id: fromStore ? fromStore.id : null,
      to_store_id: toStore ? toStore.id : null,
      material_id: mat,
      transfer_quantity: 50,
      dispatch_challan_number: `TRF-CH-${Date.now().toString().slice(-4)}`,
      remarks: 'Central Warehouse to Site Store dispatch.'
    });
    this.isTransferModalOpen.set(true);
  }

  submitTransfer(): void {
    if (this.transferForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.dispatchStockTransfer(this.transferForm.value).subscribe({
      next: (trf) => {
        this.stockTransfers.update(list => [trf, ...list]);
        this.isSubmitting.set(false);
        this.isTransferModalOpen.set(false);
        alert(`✓ Stock Transfer #${trf.transfer_number} Dispatched!\nChallan: ${trf.dispatch_challan_number}`);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Stock transfer failed');
        this.isSubmitting.set(false);
      }
    });
  }

  receiveTransfer(trf: StockTransfer): void {
    if (!confirm(`Acknowledge receipt of Transfer #${trf.transfer_number} (${trf.transfer_quantity} ${trf.unit_of_measure})?`)) return;
    this.procurementService.receiveStockTransfer(trf.id, { remarks: 'Received and verified at site yard.' }).subscribe({
      next: (updated) => {
        this.stockTransfers.update(list => list.map(t => t.id === updated.id ? updated : t));
        alert(`✓ Transfer #${updated.transfer_number} received into site store!`);
      },
      error: (err) => alert(err?.error?.detail || 'Transfer receipt failed')
    });
  }

  formatStatus(status: string): string {
    return (status || '').replace(/_/g, ' ');
  }
}

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
