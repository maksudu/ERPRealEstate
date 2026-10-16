import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  ComparativeStatement,
  PurchaseRequisition,
  Vendor,
  MaterialItem,
  SiteStore
} from '../../../core/models/procurement.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-procurement-cs',
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
  templateUrl: './procurement-cs.component.html'
})
export class ProcurementCsComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  csList = signal<ComparativeStatement[]>([]);
  requisitions = signal<PurchaseRequisition[]>([]);
  vendors = signal<Vendor[]>([]);
  stores = signal<SiteStore[]>([]);
  projects = signal<Project[]>([]);
  materials = signal<MaterialItem[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Modals
  isCreatePrModalOpen = signal<boolean>(false);
  isCreateCsModalOpen = signal<boolean>(false);
  isGeneratePoModalOpen = signal<boolean>(false);
  selectedCsForPo = signal<ComparativeStatement | null>(null);

  createPrForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    material_id: [null, Validators.required],
    requested_quantity: [null, [Validators.required, Validators.min(1)]],
    required_by_date: [new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]],
    purpose_notes: ['']
  });

  createCsForm: FormGroup = this.fb.group({
    pr_id: [null, Validators.required],
    recommended_vendor_id: [null],
    justification_summary: [''],
    quotations: this.fb.array([])
  });

  generatePoForm: FormGroup = this.fb.group({
    cs_id: [null, Validators.required],
    destination_store_id: [null, Validators.required],
    delivery_deadline: [new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], Validators.required],
    terms_and_conditions: ['Payment within 30 days after 3-Way Match GRN verification.']
  });

  get quotationsArray(): FormArray {
    return this.createCsForm.get('quotations') as FormArray;
  }

  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  );

  materialOptions = computed(() =>
    this.materials().map(m => ({
      value: m.id,
      label: `${m.material_name} (${m.unit_of_measure})`
    }))
  );

  vendorOptions = computed(() =>
    this.vendors().map(v => ({
      value: v.id,
      label: `${v.vendor_name} (${v.trade_category})`
    }))
  );

  storeOptions = computed(() =>
    this.stores().map(s => ({
      value: s.id,
      label: `${s.store_name} (${s.project_name || 'Site'})`
    }))
  );

  pendingPrOptions = computed(() =>
    this.requisitions()
      .filter(pr => pr.status === 'PENDING_CS')
      .map(pr => ({
        value: pr.id,
        label: `${pr.pr_number} - ${pr.material_name} (${pr.requested_quantity} ${pr.unit_of_measure})`
      }))
  );

  ngOnInit(): void {
    this.loadProjects();
    this.loadVendors();
    this.loadMaterials();
    this.loadStores();
    this.loadRequisitions();
    this.loadCSList();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadVendors(): void {
    this.procurementService.getVendors().subscribe({
      next: (res) => this.vendors.set(res),
      error: (err) => console.error('Failed to load vendors', err)
    });
  }

  loadMaterials(): void {
    this.procurementService.getMaterials().subscribe({
      next: (res) => this.materials.set(res),
      error: (err) => console.error('Failed to load materials', err)
    });
  }

  loadStores(): void {
    this.procurementService.getSiteStores().subscribe({
      next: (res) => this.stores.set(res),
      error: (err) => console.error('Failed to load stores', err)
    });
  }

  loadRequisitions(): void {
    this.procurementService.getRequisitions().subscribe({
      next: (res) => this.requisitions.set(res),
      error: (err) => console.error('Failed to load requisitions', err)
    });
  }

  loadCSList(): void {
    this.isLoading.set(true);
    this.procurementService.getComparativeStatements().subscribe({
      next: (res) => {
        this.csList.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load CS statements', err);
        this.isLoading.set(false);
      }
    });
  }

  // --- Purchase Requisition (PR) Workflow ---
  openCreatePrModal(): void {
    this.createPrForm.reset({
      project_id: this.projects().length ? this.projects()[0].id : null,
      material_id: this.materials().length ? this.materials()[0].id : null,
      requested_quantity: 500,
      required_by_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      purpose_notes: ''
    });
    this.isCreatePrModalOpen.set(true);
  }

  closeCreatePrModal(): void {
    this.isCreatePrModalOpen.set(false);
  }

  submitCreatePr(): void {
    if (this.createPrForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.createRequisition(this.createPrForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreatePrModal();
        this.loadRequisitions();
      },
      error: (err) => {
        console.error('Failed to create PR', err);
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Comparative Statement (CS) Workflow ---
  openCreateCsModal(): void {
    this.quotationsArray.clear();
    const pending = this.requisitions().filter(r => r.status === 'PENDING_CS');
    const firstPrId = pending.length ? pending[0].id : null;

    this.createCsForm.reset({
      pr_id: firstPrId,
      recommended_vendor_id: null,
      justification_summary: ''
    });

    // Seed 2 default quotation rows
    this.addQuotationRow();
    this.addQuotationRow();
    this.isCreateCsModalOpen.set(true);
  }

  closeCreateCsModal(): void {
    this.isCreateCsModalOpen.set(false);
  }

  addQuotationRow(): void {
    const vList = this.vendors();
    const vId = vList.length > this.quotationsArray.length ? vList[this.quotationsArray.length].id : (vList.length ? vList[0].id : null);
    const row = this.fb.group({
      vendor_id: [vId, Validators.required],
      quoted_unit_rate: [null, [Validators.required, Validators.min(0.01)]],
      credit_days_offered: [30],
      lead_time_days: [3],
      remarks: ['']
    });
    this.quotationsArray.push(row);
  }

  removeQuotationRow(index: number): void {
    if (this.quotationsArray.length > 2) {
      this.quotationsArray.removeAt(index);
    }
  }

  submitCreateCs(): void {
    if (this.createCsForm.invalid) {
      this.createCsForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.procurementService.createComparativeStatement(this.createCsForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateCsModal();
        this.loadCSList();
        this.loadRequisitions();
      },
      error: (err) => {
        console.error('Failed to create CS', err);
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Generate PO Workflow ---
  openGeneratePoModal(cs: ComparativeStatement): void {
    this.selectedCsForPo.set(cs);
    this.generatePoForm.reset({
      cs_id: cs.id,
      destination_store_id: this.stores().length ? this.stores()[0].id : null,
      delivery_deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      terms_and_conditions: 'Payment within 30 days after 3-Way Match GRN verification.'
    });
    this.isGeneratePoModalOpen.set(true);
  }

  closeGeneratePoModal(): void {
    this.isGeneratePoModalOpen.set(false);
    this.selectedCsForPo.set(null);
  }

  submitGeneratePo(): void {
    if (this.generatePoForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.generatePOFromCS(this.generatePoForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeGeneratePoModal();
        this.loadCSList();
        this.loadRequisitions();
      },
      error: (err) => {
        console.error('Failed to generate PO', err);
        this.isSubmitting.set(false);
      }
    });
  }
}
