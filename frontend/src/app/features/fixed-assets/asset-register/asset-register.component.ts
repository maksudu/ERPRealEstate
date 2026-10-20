import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FixedAssetsService, FixedAsset } from '../../../core/services/fixed-assets.service';
import { FixedAssetsNavComponent } from '../fixed-assets-nav/fixed-assets-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-asset-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FixedAssetsNavComponent,
    CardContainerComponent,
    ModalComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <app-fixed-assets-nav />

      <!-- Top Filter & Search Bar -->
      <app-card title="Fixed Asset Register & Inventory" subtitle="Complete capital asset directory with valuation, depreciation, custodian and project tracking">
        <div card-actions>
          <button
            type="button"
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition"
          >
            <span>+</span> Register New Asset
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label class="block text-[11px] font-medium text-slate-500 mb-1">Search Asset</label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="loadAssets()"
              placeholder="Tag, Name or Serial No..."
              class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <app-searchable-select
              categoryCode="ASSET_CATEGORY"
              label="Asset Category"
              placeholder="All Categories"
              [(ngModel)]="selectedCategory"
              (ngModelChange)="loadAssets()"
              [options]="categoryOptions"
              [allowCreateNew]="true"
            />
          </div>

          <div>
            <app-searchable-select
              categoryCode="PROJECT_LOCATION"
              label="Project / Site"
              placeholder="All Projects"
              [(ngModel)]="selectedProject"
              (ngModelChange)="loadAssets()"
              [options]="projectOptions"
              [allowCreateNew]="true"
            />
          </div>

          <div>
            <app-searchable-select
              categoryCode="ASSET_STATUS"
              label="Status Filter"
              placeholder="All Statuses"
              [(ngModel)]="selectedStatus"
              (ngModelChange)="loadAssets()"
              [options]="statusOptions"
              [allowCreateNew]="false"
            />
          </div>
        </div>

        <!-- Table Listing -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Asset Tag</th>
                <th class="p-3">Asset Name & Model</th>
                <th class="p-3">Category</th>
                <th class="p-3">Project / Location</th>
                <th class="p-3 text-right">Acquisition Cost</th>
                <th class="p-3 text-right">Acc. Depreciation</th>
                <th class="p-3 text-right">Net Book Value</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="9" class="p-6 text-center text-slate-400">Loading asset register...</td>
                </tr>
              } @else if (assets.length === 0) {
                <tr>
                  <td colspan="9" class="p-6 text-center text-slate-400">No fixed assets found matching criteria.</td>
                </tr>
              } @else {
                @for (item of assets; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {{ item.asset_tag }}
                    </td>
                    <td class="p-3">
                      <div class="font-semibold text-slate-900 dark:text-slate-100">{{ item.asset_name }}</div>
                      <div class="text-[10px] text-slate-400">{{ item.brand_model || 'N/A' }} • S/N: {{ item.serial_number || 'N/A' }}</div>
                    </td>
                    <td class="p-3">
                      <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {{ item.category }}
                      </span>
                    </td>
                    <td class="p-3">
                      <div class="font-medium text-slate-800 dark:text-slate-200">{{ item.project_name || 'Central Warehouse' }}</div>
                      <div class="text-[10px] text-slate-400">{{ item.location || 'Dhaka Yard' }}</div>
                    </td>
                    <td class="p-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      ৳ {{ item.acquisition_cost_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right text-amber-600 font-medium">
                      ৳ {{ item.accumulated_depreciation_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ৳ {{ item.net_book_value_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-center">
                      <span
                        [ngClass]="{
                          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800': item.status === 'ACTIVE',
                          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800': item.status === 'UNDER_MAINTENANCE',
                          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800': item.status === 'DISPOSED'
                        }"
                        class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                      >
                        {{ item.status }}
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          (click)="openEditModal(item)"
                          class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                          title="Edit Asset"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          (click)="deleteAsset(item.id)"
                          class="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600"
                          title="Delete Asset"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>Showing {{ offset + 1 }} to {{ Math.min(offset + limit, totalRecords) }} of {{ totalRecords }} assets</div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              [disabled]="offset === 0"
              (click)="prevPage()"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <span>Page {{ currentPage }} of {{ totalPages || 1 }}</span>
            <button
              type="button"
              [disabled]="offset + limit >= totalRecords"
              (click)="nextPage()"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </app-card>

      <!-- Reusable Modal for Add / Edit Asset -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="isEditMode ? 'Edit Fixed Asset Record' : 'Register New Fixed Asset'"
        [subtitle]="'Asset will be categorized and mapped to General Ledger code with auto-depreciation'"
        badge="Fixed Asset Management"
        size="2xl"
        (close)="closeModal()"
      >
        <div class="space-y-4 p-4 text-xs">
          <!-- Row 1: Name & Category -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Asset Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.asset_name"
                placeholder="e.g. Tower Crane Zoomlion 6013"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <app-searchable-select
                categoryCode="ASSET_CATEGORY"
                label="Asset Category *"
                placeholder="Select category..."
                [(ngModel)]="formData.category"
                [options]="categoryOptions"
                [allowCreateNew]="true"
              />
            </div>
          </div>

          <!-- Row 2: Brand/Model & Serial Number -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Brand & Model</label>
              <input
                type="text"
                [(ngModel)]="formData.brand_model"
                placeholder="e.g. Zoomlion TC6013A-6"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Serial Number</label>
              <input
                type="text"
                [(ngModel)]="formData.serial_number"
                placeholder="e.g. SN-ZL-2024-8841"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <!-- Row 3: Project & Location -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                categoryCode="PROJECT_LOCATION"
                label="Project Deployment Site"
                placeholder="Select site..."
                [(ngModel)]="formData.project_name"
                [options]="projectOptions"
                [allowCreateNew]="true"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Specific Location / Zone</label>
              <input
                type="text"
                [(ngModel)]="formData.location"
                placeholder="e.g. Tower-B Foundation Site"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <!-- Row 4: Purchase Date & Acquisition Cost -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Date *</label>
              <input
                type="date"
                [(ngModel)]="formData.purchase_date"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Acquisition Cost (BDT) *</label>
              <input
                type="number"
                [(ngModel)]="formData.acquisition_cost_bdt"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Useful Life (Years)</label>
              <input
                type="number"
                [(ngModel)]="formData.useful_life_years"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <!-- Row 5: Depreciation Method & GL Mapping -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <app-searchable-select
                categoryCode="DEPRECIATION_METHOD"
                label="Depreciation Method"
                placeholder="Method..."
                [(ngModel)]="formData.depreciation_method"
                [options]="methodOptions"
                [allowCreateNew]="false"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Annual Rate (%)</label>
              <input
                type="number"
                [(ngModel)]="formData.depreciation_rate_percent"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <app-searchable-select
                categoryCode="GL_ASSET_ACCOUNT"
                label="GL Account Mapping"
                placeholder="GL Code..."
                [(ngModel)]="formData.gl_account_code"
                [options]="glAccountOptions"
                [allowCreateNew]="true"
              />
            </div>
          </div>
        </div>

        <div modal-actions class="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="closeModal()"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="saveAsset()"
            [disabled]="!formData.asset_name || !formData.acquisition_cost_bdt"
            class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            {{ isEditMode ? 'Update Asset' : 'Save Asset' }}
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class AssetRegisterComponent implements OnInit {
  private service = inject(FixedAssetsService);

  Math = Math;
  assets: FixedAsset[] = [];
  totalRecords = 0;
  limit = 20;
  offset = 0;
  loading = false;

  // Filter models
  searchQuery = '';
  selectedCategory = '';
  selectedProject = '';
  selectedStatus = '';

  // Modal State
  isModalOpen = false;
  isEditMode = false;
  editingId: number | null = null;
  formData: any = this.initFormData();

  // Searchable Select Options
  categoryOptions: SelectOption[] = [
    { value: 'Heavy Plant & Construction Machinery', label: 'Heavy Plant & Construction Machinery' },
    { value: 'Commercial Vehicles & Transit Mixers', label: 'Commercial Vehicles & Transit Mixers' },
    { value: 'Electrical Power & Generators', label: 'Electrical Power & Generators' },
    { value: 'IT Hardware & Server Cluster', label: 'IT Hardware & Server Cluster' },
    { value: 'Office Furniture & Fixtures', label: 'Office Furniture & Fixtures' }
  ];

  projectOptions: SelectOption[] = [
    { value: 'Ocean Heights Luxury Tower', label: 'Ocean Heights Luxury Tower' },
    { value: 'BlueOceans Commercial Plaza', label: 'BlueOceans Commercial Plaza' },
    { value: 'Bay View Residential Enclave', label: 'Bay View Residential Enclave' },
    { value: 'Central Plant Yard', label: 'Central Plant Yard' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'UNDER_MAINTENANCE', label: 'UNDER_MAINTENANCE' },
    { value: 'DISPOSED', label: 'DISPOSED' }
  ];

  methodOptions: SelectOption[] = [
    { value: 'STRAIGHT_LINE', label: 'Straight Line Method (SLM)' },
    { value: 'WRITTEN_DOWN_VALUE', label: 'Written Down Value (WDV)' }
  ];

  glAccountOptions: SelectOption[] = [
    { value: '1201-PLANT-HEAVY-MACHINERY', label: '1201 - Heavy Machinery & Plant Fleet' },
    { value: '1203-ELECTRICAL-POWER-ASSETS', label: '1203 - Electrical & Generator Assets' },
    { value: '1204-MOTOR-VEHICLES-FLEET', label: '1204 - Commercial Vehicles & Mixers' },
    { value: '1205-IT-COMPUTER-EQUIPMENT', label: '1205 - IT, Computers & Servers' }
  ];

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.limit);
  }

  ngOnInit(): void {
    this.loadAssets();
  }

  loadAssets(): void {
    this.loading = true;
    this.service.getAssets({
      search: this.searchQuery,
      category: this.selectedCategory,
      status_filter: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.assets = res.items;
        this.totalRecords = res.total;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load assets', err);
        this.loading = false;
      }
    });
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadAssets();
    }
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalRecords) {
      this.offset += this.limit;
      this.loadAssets();
    }
  }

  initFormData(): any {
    return {
      asset_name: '',
      category: 'Heavy Plant & Construction Machinery',
      brand_model: '',
      serial_number: '',
      project_name: 'Central Plant Yard',
      location: 'Dhaka Central Yard',
      purchase_date: new Date().toISOString().substring(0, 10),
      acquisition_cost_bdt: 0,
      useful_life_years: 10,
      depreciation_method: 'STRAIGHT_LINE',
      depreciation_rate_percent: 10,
      accumulated_depreciation_bdt: 0,
      gl_account_code: '1201-PLANT-HEAVY-MACHINERY',
      status: 'ACTIVE'
    };
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.formData = this.initFormData();
    this.isModalOpen = true;
  }

  openEditModal(item: FixedAsset): void {
    this.isEditMode = true;
    this.editingId = item.id;
    this.formData = { ...item };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveAsset(): void {
    if (this.isEditMode && this.editingId) {
      this.service.updateAsset(this.editingId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadAssets();
        },
        error: (err) => console.error('Failed to update asset', err)
      });
    } else {
      this.service.createAsset(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadAssets();
        },
        error: (err) => console.error('Failed to create asset', err)
      });
    }
  }

  deleteAsset(id: number): void {
    if (confirm('Are you sure you want to delete this asset from the register?')) {
      this.service.deleteAsset(id).subscribe({
        next: () => this.loadAssets(),
        error: (err) => console.error('Failed to delete asset', err)
      });
    }
  }
}
