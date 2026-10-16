import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ProjectService } from '../../../core/services/project.service';
import { SiteStore, MaterialItem, ProcurementMetrics } from '../../../core/models/procurement.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-procurement-stores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './procurement-stores.component.html'
})
export class ProcurementStoresComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  stores = signal<SiteStore[]>([]);
  projects = signal<Project[]>([]);
  materials = signal<MaterialItem[]>([]);
  metrics = signal<ProcurementMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  selectedStore = signal<SiteStore | null>(null);

  isCreateStoreModalOpen = signal<boolean>(false);
  isAdjustStockModalOpen = signal<boolean>(false);

  createStoreForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    store_name: ['', Validators.required],
    location_details: ['']
  });

  adjustStockForm: FormGroup = this.fb.group({
    store_id: [null, Validators.required],
    material_id: [null, Validators.required],
    quantity_delta: [null, [Validators.required]],
    adjustment_reason: ['INITIAL_STOCK', Validators.required]
  });

  adjustmentReasons = [
    { value: 'INITIAL_STOCK', label: 'Initial Stock Take' },
    { value: 'MANUAL_CORRECTION', label: 'Physical Audit Correction' },
    { value: 'DAMAGE_WRITEOFF', label: 'Damage / Spillage Writeoff (-)' }
  ];

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

  ngOnInit(): void {
    this.loadProjects();
    this.loadMaterials();
    this.loadStores();
    this.loadMetrics();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadMaterials(): void {
    this.procurementService.getMaterials().subscribe({
      next: (res) => this.materials.set(res),
      error: (err) => console.error('Failed to load materials', err)
    });
  }

  loadStores(): void {
    this.isLoading.set(true);
    this.procurementService.getSiteStores().subscribe({
      next: (res) => {
        this.stores.set(res);
        if (res.length > 0 && !this.selectedStore()) {
          this.selectedStore.set(res[0]);
        } else if (this.selectedStore()) {
          const updated = res.find(s => s.id === this.selectedStore()?.id);
          if (updated) this.selectedStore.set(updated);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load stores', err);
        this.isLoading.set(false);
      }
    });
  }

  loadMetrics(): void {
    this.procurementService.getMetrics().subscribe({
      next: (res) => this.metrics.set(res),
      error: (err) => console.error('Failed to load procurement metrics', err)
    });
  }

  selectStore(store: SiteStore): void {
    this.selectedStore.set(store);
  }

  openCreateStoreModal(): void {
    this.createStoreForm.reset({
      project_id: this.projects().length ? this.projects()[0].id : null,
      store_name: '',
      location_details: ''
    });
    this.isCreateStoreModalOpen.set(true);
  }

  closeCreateStoreModal(): void {
    this.isCreateStoreModalOpen.set(false);
  }

  submitCreateStore(): void {
    if (this.createStoreForm.invalid) {
      this.createStoreForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.procurementService.createSiteStore(this.createStoreForm.value).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeCreateStoreModal();
        this.loadStores();
        this.selectedStore.set(created);
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Failed to create store', err);
        this.isSubmitting.set(false);
      }
    });
  }

  openAdjustStockModal(): void {
    const s = this.selectedStore();
    if (!s) return;
    this.adjustStockForm.reset({
      store_id: s.id,
      material_id: this.materials().length ? this.materials()[0].id : null,
      quantity_delta: 100,
      adjustment_reason: 'INITIAL_STOCK'
    });
    this.isAdjustStockModalOpen.set(true);
  }

  closeAdjustStockModal(): void {
    this.isAdjustStockModalOpen.set(false);
  }

  submitAdjustStock(): void {
    if (this.adjustStockForm.invalid) return;
    this.isSubmitting.set(true);
    this.procurementService.adjustStoreStock(this.adjustStockForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAdjustStockModal();
        this.loadStores();
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Failed to adjust stock', err);
        this.isSubmitting.set(false);
      }
    });
  }
}
