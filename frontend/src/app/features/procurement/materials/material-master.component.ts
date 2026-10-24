import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialItem } from '../../../core/models/procurement.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-material-master',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProcurementNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    SearchableSelectComponent
  ],
  template: `
    @if (!isFormPage) {
    <app-procurement-nav
      title="Material & Item Master"
      
    >
      <div actions>
        <button
          type="button"
          (click)="openAddModal()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-colors"
        >
          <span>+</span>
          <span>Add Material Item</span>
        </button>
      </div>
    </app-procurement-nav>

    @if (successMessage) { <div class="mb-4 rounded-lg bg-emerald-50 text-emerald-700 p-3 text-sm">{{ successMessage }}</div> }
    @if (errorMessage) { <div class="mb-4 rounded-lg bg-rose-50 text-rose-700 p-3 text-sm">{{ errorMessage }}</div> }
    <!-- 4 Material Categories Quick Filter Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <button
        type="button"
        (click)="filterByCategory('CEMENT')"
        [class]="selectedCategory === 'CEMENT' ? 'p-3 rounded-xl border-2 border-amber-500 bg-amber-500/10 text-left' : 'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 text-left transition-colors'"
      >
        <span class="text-xs">🧱</span>
        <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">Cement & Binder</h4>
        <p class="text-[10px] text-slate-500 dark:text-slate-400">CEM-I, CEM-II, Bag (50kg)</p>
      </button>

      <button
        type="button"
        (click)="filterByCategory('REBAR')"
        [class]="selectedCategory === 'REBAR' ? 'p-3 rounded-xl border-2 border-amber-500 bg-amber-500/10 text-left' : 'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 text-left transition-colors'"
      >
        <span class="text-xs">🏗️</span>
        <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">Steel & Rebar</h4>
        <p class="text-[10px] text-slate-500 dark:text-slate-400">Grade 500W, Ton / Kg, MTR</p>
      </button>

      <button
        type="button"
        (click)="filterByCategory('AGGREGATES')"
        [class]="selectedCategory === 'AGGREGATES' ? 'p-3 rounded-xl border-2 border-amber-500 bg-amber-500/10 text-left' : 'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 text-left transition-colors'"
      >
        <span class="text-xs">🪨</span>
        <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">Bricks & Aggregates</h4>
        <p class="text-[10px] text-slate-500 dark:text-slate-400">Sylhet Sand, Stone Chips, CFT</p>
      </button>

      <button
        type="button"
        (click)="filterByCategory('FINISHING')"
        [class]="selectedCategory === 'FINISHING' ? 'p-3 rounded-xl border-2 border-amber-500 bg-amber-500/10 text-left' : 'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 text-left transition-colors'"
      >
        <span class="text-xs">🚿</span>
        <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">Finishing & MEP</h4>
        <p class="text-[10px] text-slate-500 dark:text-slate-400">Tiles, Fittings, Cables, Pipes</p>
      </button>
    </div>

    <!-- Main Card Container: Material Catalog Table -->
    <app-card-container
      title="Standard Material Catalog Master"
      subtitle="Complete civil, structural and architectural items with standard rate and explicit units"
    >
      <!-- Search and Filter Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-2 w-full sm:w-80">
          <div class="relative w-full">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearch()"
              placeholder="Search material code, name, category..."
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <svg class="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          @if (selectedCategory) {
            <button
              type="button"
              (click)="filterByCategory('')"
              class="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1"
            >
              <span>Reset Category Filter</span>
              <span class="text-xs font-bold">×</span>
            </button>
          }
        </div>
      </div>

      <!-- Paginated Material Items Table -->
      <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold">
              <th class="py-2.5 px-3">Item Code</th>
              <th class="py-2.5 px-3">Material Name & Specification</th>
              <th class="py-2.5 px-3">Category</th>
              <th class="py-2.5 px-3 text-center">Unit of Measure (UOM)</th>
              <th class="py-2.5 px-3 text-right">Standard Reference Rate</th>
              <th class="py-2.5 px-3 text-center">Status</th>
              <th class="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (mat of materials(); track mat.id) {
              <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-2.5 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                  {{ mat.material_code }}
                </td>
                <td class="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                  {{ mat.material_name }}
                </td>
                <td class="py-2.5 px-3">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {{ mat.category }}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                  {{ mat.unit_of_measure }}
                </td>
                <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                  ৳{{ mat.standard_unit_cost | number:'1.2-2' }}
                </td>
                <td class="py-2.5 px-3 text-center">
                  <span [class]="mat.is_active ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'">
                    {{ mat.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      (click)="openEditModal(mat)"
                      class="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Item"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      (click)="deleteMaterial(mat)"
                      class="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete Item"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="py-8 text-center text-slate-400 text-xs">
                  No material catalog items found. Click "+ Add Material Item" above to add.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="flex items-center justify-between pt-4 text-xs text-slate-500 dark:text-slate-400">
        <div>
          Showing <span class="font-bold text-slate-800 dark:text-slate-200">{{ materials().length }}</span> materials
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="previousPage()"
            [disabled]="offset === 0"
            class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <span class="font-mono text-xs">Page {{ (offset / limit) + 1 }}</span>
          <button
            type="button"
            (click)="nextPage()"
            [disabled]="materials().length < limit"
            class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>
    </app-card-container>

    }
    @if (isFormPage) {
    <section class="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 shadow-sm">
      <div class="mb-5"><h2 class="text-lg font-bold">{{ editingMaterialId ? 'Edit Material Catalog Item' : 'Add New Material Catalog Item' }}</h2><p class="text-xs text-slate-500 mt-1">Maintain the material code, category, unit and standard rate.</p></div>
      @if (errorMessage) { <div class="mb-4 rounded-lg bg-rose-50 text-rose-700 p-3 text-sm">{{ errorMessage }}</div> }
      <form [formGroup]="materialForm" (ngSubmit)="saveMaterial()" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Item Code -->
          <div>
            <app-custom-input
              label="Material Code (Unique)"
              placeholder="e.g. MAT-CEM-001 / MAT-STEEL-16MM"
              formControlName="material_code"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Dynamic Category Searchable Select -->
          <div>
            <app-searchable-select
              label="Material Category"
              placeholder="Select or Create Category..."
              categoryCode="MATERIAL_CATEGORY"
              [allowCreateNew]="true"
              [required]="true"
              formControlName="category"
            ></app-searchable-select>
          </div>

          <!-- Material Name -->
          <div class="sm:col-span-2">
            <app-custom-input
              label="Material Full Name & Technical Spec"
              placeholder="e.g. BSRM 500W Deformed Rebar 16mm / Bashundhara CEM-II 42.5N"
              formControlName="material_name"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Dynamic Unit of Measure Searchable Select -->
          <div>
            <app-searchable-select
              label="Base Unit of Measure (UOM)"
              placeholder="Select or Create UOM..."
              categoryCode="UNIT_OF_MEASURE"
              [allowCreateNew]="true"
              [required]="true"
              formControlName="unit_of_measure"
            ></app-searchable-select>
          </div>

          <!-- Standard Reference Cost (BDT) -->
          <div>
            <app-custom-input
              label="Standard Unit Cost (৳ BDT)"
              type="number"
              placeholder="e.g. 520.00 / 92000.00"
              formControlName="standard_unit_cost"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Active Status -->
          <div class="sm:col-span-2 flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="matActive"
              formControlName="is_active"
              class="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
            />
            <label for="matActive" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Active Item (Available for Site Requisitions & POs)
            </label>
          </div>
        </div>

        <!-- Modal Actions Footer -->
        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="closeModal()"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <app-custom-button
            [label]="isSaving() ? 'Saving...' : (editingMaterialId ? 'Update Item' : 'Save Material')"
            type="submit"
            variant="primary"
            [disabled]="materialForm.invalid || isSaving()"
          ></app-custom-button>
        </div>
      </form>
    </section>
    }
  `
})
export class MaterialMasterComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  materials = signal<MaterialItem[]>([]);
  isModalOpen = false;
  editingMaterialId: number | null = null;
  isSaving = signal<boolean>(false);
  isFormPage = false;
  errorMessage = '';
  successMessage = '';

  searchQuery = '';
  selectedCategory = '';
  limit = 20;
  offset = 0;

  materialForm: FormGroup = this.fb.group({
    material_code: ['', Validators.required],
    material_name: ['', Validators.required],
    category: ['', Validators.required],
    unit_of_measure: ['BAG', Validators.required],
    standard_unit_cost: [0.00, [Validators.required, Validators.min(0)]],
    is_active: [true]
  });

  ngOnInit(): void {
    this.isFormPage = this.router.url.includes('/new') || this.router.url.includes('/edit');
    const routeId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.isFormPage && !routeId) this.prepareAddForm();
    this.successMessage = history.state?.procurementNotice || '';
    this.loadMaterials();
  }

  loadMaterials(): void {
    const routeId = Number(this.route.snapshot.paramMap.get('id'));
    this.procurementService.getMaterials(this.searchQuery, undefined, routeId ? 500 : this.limit, routeId ? 0 : this.offset).subscribe({
      next: (response: any) => {
        this.errorMessage = '';
        const data: MaterialItem[] = Array.isArray(response) ? response : response?.items ?? response?.results ?? [];
        if (this.isFormPage && routeId) {
          const item = data.find((row: MaterialItem) => row.id === routeId);
          if (item) this.patchMaterialForm(item);
          else this.errorMessage = 'Material record could not be loaded.';
        }
        let filtered = data;
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          filtered = filtered.filter(m =>
            m.material_name.toLowerCase().includes(q) ||
            m.material_code.toLowerCase().includes(q) ||
            m.category.toLowerCase().includes(q)
          );
        }
        if (this.selectedCategory) {
          filtered = filtered.filter(m => m.category.toUpperCase().includes(this.selectedCategory.toUpperCase()));
        }
        this.materials.set(filtered);
      },
      error: (err) => this.errorMessage = err.error?.detail || 'Unable to load materials.'
    });
  }

  filterByCategory(cat: string): void {
    this.selectedCategory = cat;
    this.offset = 0;
    this.loadMaterials();
  }

  onSearch(): void {
    this.offset = 0;
    this.loadMaterials();
  }

  nextPage(): void {
    this.offset += this.limit;
    this.loadMaterials();
  }

  previousPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadMaterials();
    }
  }

  openAddModal(): void {
    this.router.navigate(['/procurement/materials/new']);
  }

  private prepareAddForm(): void {
    this.editingMaterialId = null;
    const count = this.materials().length + 1;
    this.materialForm.reset({
      material_code: `MAT-${count.toString().padStart(4, '0')}`,
      material_name: '',
      category: 'CEMENT',
      unit_of_measure: 'BAG',
      standard_unit_cost: 0.00,
      is_active: true
    });
    this.isModalOpen = false;
  }

  openEditModal(mat: MaterialItem): void {
    this.router.navigate(['/procurement/materials', mat.id, 'edit']);
  }

  private patchMaterialForm(mat: MaterialItem): void {
    this.editingMaterialId = mat.id;
    this.materialForm.patchValue({
      material_code: mat.material_code,
      material_name: mat.material_name,
      category: mat.category,
      unit_of_measure: mat.unit_of_measure,
      standard_unit_cost: mat.standard_unit_cost,
      is_active: mat.is_active
    });
    this.isModalOpen = false;
  }

  closeModal(): void {
    this.router.navigate(['/procurement/materials']);
  }

  saveMaterial(): void {
    if (this.materialForm.invalid) return;
    this.errorMessage = '';

    this.isSaving.set(true);
    const val = this.materialForm.value;

    if (this.editingMaterialId) {
      this.procurementService.updateMaterial(this.editingMaterialId, val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/procurement/materials'], { state: { procurementNotice: 'Material updated successfully.' } });
        },
        error: (err) => { this.isSaving.set(false); this.errorMessage = err.error?.detail || 'Failed to update material.'; }
      });
    } else {
      this.procurementService.createMaterial(val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/procurement/materials'], { state: { procurementNotice: 'Material saved successfully.' } });
        },
        error: (err) => { this.isSaving.set(false); this.errorMessage = err.error?.detail || 'Failed to save material.'; }
      });
    }
  }

  deleteMaterial(mat: MaterialItem): void {
    if (!confirm(`Are you sure you want to delete material "${mat.material_name}"?`)) return;
    this.procurementService.deleteMaterial(mat.id).subscribe({
      next: () => this.loadMaterials(),
      error: () => {}
    });
  }
}
