import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ReorderAlertItem, SiteStore, MaterialItem } from '../../../core/models/procurement.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  StatusBadgeComponent,
  ModalComponent
} from '../../../shared/components';

@Component({
  selector: 'app-material-planning',
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
    StatusBadgeComponent,
    ModalComponent
  ],
  template: `
    <app-procurement-nav
      title="9.12 Reorder Levels & Material Planning"
      subtitle="Safety Stock Thresholds, Automated Depletion Warnings & Instant Purchase Indents"
    >
      <div actions class="flex items-center gap-2">
        <button
          type="button"
          (click)="loadAlerts()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <span>🔄</span>
          <span>Refresh Scan</span>
        </button>
        <button
          type="button"
          (click)="openBulkIndentModal()"
          [disabled]="selectedItems().length === 0"
          class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 shadow-xs transition-colors"
        >
          <span>📋</span>
          <span>Generate Indent ({{ selectedItems().length }})</span>
        </button>
      </div>
    </app-procurement-nav>

    <!-- KPI Summary Row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Critical Stockouts</span>
          <span class="p-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold">⚠️ High</span>
        </div>
        <div class="text-2xl font-black text-red-800 dark:text-red-400 mt-2">{{ criticalCount() }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Below safety reorder threshold</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Total Material Deficit</span>
          <span class="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">📦 Units</span>
        </div>
        <div class="text-2xl font-black text-amber-800 dark:text-amber-400 mt-2">{{ totalDeficitQuantity() | number:'1.0-2' }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Quantity required to reach buffer</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Est. Replenishment Cost</span>
          <span class="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">৳ BDT</span>
        </div>
        <div class="text-2xl font-black text-emerald-800 dark:text-emerald-400 mt-2">৳{{ totalEstimatedOrderValue() | number:'1.2-2' }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Weighted avg cost valuation</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Active Warehouses</span>
          <span class="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">🏢 Sites</span>
        </div>
        <div class="text-2xl font-black text-blue-800 dark:text-blue-400 mt-2">{{ stores().length }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Central & project site stores</p>
      </div>
    </div>

    <!-- Main Card Container: Reorder Alerts & Replenishment Planning -->
    <app-card-container
      title="Material Reorder & Replenishment Matrix"
      subtitle="Materials at or below minimum operating stock levels requiring immediate purchase indents"
    >
      <!-- Filters and Search Toolbar -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
        <div class="flex flex-wrap items-center gap-2 flex-1">
          <div class="w-64">
            <app-custom-input
              placeholder="Search material or warehouse..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
            ></app-custom-input>
          </div>

          <div class="w-48">
            <app-searchable-select
              placeholder="Filter by Category"
              categoryCode="MATERIAL_CATEGORY"
              [allowCreateNew]="true"
              [(ngModel)]="selectedCategory"
              (ngModelChange)="applyFilters()"
            ></app-searchable-select>
          </div>

          <div class="w-64">
            <app-searchable-select
              placeholder="All Warehouses / Sites"
              [options]="storeOptions()"
              [(ngModel)]="selectedStoreId"
              (ngModelChange)="applyFilters()"
            ></app-searchable-select>
          </div>

          <button
            *ngIf="searchQuery || selectedCategory || selectedStoreId !== null"
            (click)="clearFilters()"
            class="text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-700 dark:text-slate-300">
            Showing {{ pagedAlerts().length }} of {{ filteredAlerts().length }} alerts
          </span>
        </div>
      </div>

      <!-- Alerts Data Table (No inline add form below table - strictly modals!) -->
      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
              <th class="p-3 w-8">
                <input
                  type="checkbox"
                  (change)="toggleSelectAll($event)"
                  [checked]="isAllSelected()"
                  class="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
              </th>
              <th class="p-3">Store / Site</th>
              <th class="p-3">Material & Category</th>
              <th class="p-3 text-right">Current Stock</th>
              <th class="p-3 text-right">Reorder Level</th>
              <th class="p-3 text-right">Shortage Deficit</th>
              <th class="p-3 text-right">Unit Rate (৳)</th>
              <th class="p-3 text-right">Est. Order Value (৳)</th>
              <th class="p-3 text-center">Status</th>
              <th class="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              *ngFor="let a of pagedAlerts()"
              class="hover:bg-amber-500/5 transition-colors text-slate-700 dark:text-slate-200"
            >
              <td class="p-3">
                <input
                  type="checkbox"
                  [checked]="isSelected(a)"
                  (change)="toggleSelectItem(a)"
                  class="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
              </td>
              <td class="p-3">
                <div class="font-bold text-slate-900 dark:text-slate-100">{{ a.store_name }}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400">Store ID: #{{ a.store_id }}</div>
              </td>
              <td class="p-3">
                <div class="font-bold text-slate-900 dark:text-slate-100">{{ a.material_name }}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400">
                  <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">{{ a.category }}</span>
                  <span class="ml-1 text-slate-600 dark:text-slate-400">({{ a.unit_of_measure }})</span>
                </div>
              </td>
              <td class="p-3 text-right font-black" [ngClass]="a.current_stock_quantity <= 0 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'">
                {{ a.current_stock_quantity | number:'1.2-2' }}
              </td>
              <td class="p-3 text-right font-medium text-slate-700 dark:text-slate-300">
                {{ a.reorder_level | number:'1.2-2' }}
              </td>
              <td class="p-3 text-right font-black text-red-700 dark:text-red-400">
                -{{ a.shortage_quantity | number:'1.2-2' }}
              </td>
              <td class="p-3 text-right text-slate-700 dark:text-slate-300">
                ৳{{ a.weighted_avg_rate | number:'1.2-2' }}
              </td>
              <td class="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                ৳{{ a.suggested_order_value | number:'1.2-2' }}
              </td>
              <td class="p-3 text-center">
                <span
                  *ngIf="a.current_stock_quantity <= 0"
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800"
                >
                  OUT OF STOCK
                </span>
                <span
                  *ngIf="a.current_stock_quantity > 0 && a.current_stock_quantity <= a.reorder_level"
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                >
                  CRITICAL LOW
                </span>
              </td>
              <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    (click)="openSingleIndentModal(a)"
                    class="px-2.5 py-1 text-[11px] font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                    title="Generate Purchase Requisition (Indent)"
                  >
                    + PR Indent
                  </button>
                  <button
                    type="button"
                    (click)="openThresholdModal(a)"
                    class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    title="Adjust Reorder Minimum"
                  >
                    ⚙️
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="pagedAlerts().length === 0">
              <td colspan="10" class="p-8 text-center text-slate-600 dark:text-slate-400">
                <div class="text-3xl mb-2">🎉</div>
                <div class="text-sm font-semibold">All inventory levels are healthy!</div>
                <div class="text-xs text-slate-600 dark:text-slate-400 mt-1">No items are currently below safety reorder levels.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Toolbar -->
      <div class="flex items-center justify-between mt-4 text-xs text-slate-700 dark:text-slate-300">
        <div>
          Showing page {{ currentPage() }} of {{ totalPages() }} ({{ filteredAlerts().length }} total alerts)
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="setPage(currentPage() - 1)"
            [disabled]="currentPage() === 1"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Prev
          </button>
          <button
            *ngFor="let p of getPages()"
            type="button"
            (click)="setPage(p)"
            [class.bg-amber-500]="currentPage() === p"
            [class.text-slate-950]="currentPage() === p"
            [class.font-bold]="currentPage() === p"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {{ p }}
          </button>
          <button
            type="button"
            (click)="setPage(currentPage() + 1)"
            [disabled]="currentPage() >= totalPages()"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </app-card-container>

    <!-- Modal: Raise Purchase Requisition Indent -->
    <app-modal
      [isOpen]="isIndentModalOpen()"
      [title]="indentTargetItem ? 'Raise PR Indent: ' + indentTargetItem.material_name : 'Raise Bulk Purchase Indents'"
      (close)="isIndentModalOpen.set(false)"
    >
      <form [formGroup]="indentForm" (ngSubmit)="submitIndent()" class="space-y-4">
        <div *ngIf="indentTargetItem" class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Material:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ indentTargetItem.material_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Warehouse / Store:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ indentTargetItem.store_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Deficit Shortage:</span>
            <span class="font-bold text-red-700 dark:text-red-400">{{ indentTargetItem.shortage_quantity }} {{ indentTargetItem.unit_of_measure }}</span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Project ID / Cost Center *</label>
          <app-custom-input
            formControlName="project_id"
            type="number"
            placeholder="e.g. 1 (Gulshan Grand Tower)"
          ></app-custom-input>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Indent Requisition Quantity *</label>
          <app-custom-input
            formControlName="requested_quantity"
            type="number"
            placeholder="Quantity to requisition"
          ></app-custom-input>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Required Delivery Date *</label>
          <app-custom-input
            formControlName="required_by_date"
            type="date"
          ></app-custom-input>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority / Urgency *</label>
          <app-searchable-select
            formControlName="priority"
            placeholder="Select Priority"
            categoryCode="PR_PRIORITY"
            [allowCreateNew]="true"
          ></app-searchable-select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Indenter Justification Notes</label>
          <app-custom-textarea
            formControlName="remarks"
            placeholder="Safety stock replenishment justified by material consumption rate..."
            rows="3"
          ></app-custom-textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isIndentModalOpen.set(false)"
            label="Cancel"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="indentForm.invalid"
            label="Confirm Indent PR"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>

    <!-- Modal: Adjust Reorder Minimum Threshold -->
    <app-modal
      [isOpen]="isThresholdModalOpen()"
      title="Adjust Reorder Minimum Threshold"
      (close)="isThresholdModalOpen.set(false)"
    >
      <form [formGroup]="thresholdForm" (ngSubmit)="submitThreshold()" class="space-y-4">
        <div *ngIf="indentTargetItem" class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
          <div class="font-bold text-slate-900 dark:text-slate-100">{{ indentTargetItem.material_name }}</div>
          <div class="text-slate-600 dark:text-slate-400">Warehouse: {{ indentTargetItem.store_name }}</div>
          <div class="text-slate-600 dark:text-slate-400">Current Stock: {{ indentTargetItem.current_stock_quantity }} {{ indentTargetItem.unit_of_measure }}</div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Reorder Minimum Level *</label>
          <app-custom-input
            formControlName="reorder_level"
            type="number"
            placeholder="Enter new threshold level"
          ></app-custom-input>
          <span class="text-[10px] text-slate-600 dark:text-slate-400 mt-1 block">When current balance drops below this number, procurement alerts will trigger.</span>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Threshold Modification</label>
          <app-custom-textarea
            formControlName="reason"
            placeholder="e.g. Foundation piling phase requires higher cement safety reserve..."
            rows="2"
          ></app-custom-textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isThresholdModalOpen.set(false)"
            label="Cancel"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="thresholdForm.invalid"
            label="Save Threshold"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>
  `
})
export class MaterialPlanningComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private fb = inject(FormBuilder);

  alerts = signal<ReorderAlertItem[]>([]);
  stores = signal<SiteStore[]>([]);
  materials = signal<MaterialItem[]>([]);

  storeOptions = computed(() => [
    ...this.stores().map(s => ({
      label: `${s.store_name} (${s.is_central_warehouse ? 'Central' : 'Site'})`,
      value: s.id
    }))
  ]);

  // Selection
  selectedItems = signal<ReorderAlertItem[]>([]);

  // Filter state
  searchQuery = '';
  selectedCategory = '';
  selectedStoreId: number | null = null;

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  // Modal state
  isIndentModalOpen = signal(false);
  isThresholdModalOpen = signal(false);
  indentTargetItem: ReorderAlertItem | null = null;

  indentForm: FormGroup = this.fb.group({
    project_id: [1, [Validators.required]],
    material_id: [null, [Validators.required]],
    requested_quantity: [null, [Validators.required, Validators.min(0.01)]],
    required_by_date: [new Date().toISOString().substring(0, 10), [Validators.required]],
    priority: ['HIGH', [Validators.required]],
    remarks: ['']
  });

  thresholdForm: FormGroup = this.fb.group({
    store_id: [null, [Validators.required]],
    material_id: [null, [Validators.required]],
    reorder_level: [null, [Validators.required, Validators.min(0)]],
    reason: ['']
  });

  // KPIs
  criticalCount = computed(() => this.alerts().filter(a => a.current_stock_quantity <= 0).length);
  totalDeficitQuantity = computed(() => this.alerts().reduce((sum, a) => sum + a.shortage_quantity, 0));
  totalEstimatedOrderValue = computed(() => this.alerts().reduce((sum, a) => sum + a.suggested_order_value, 0));

  // Filtered
  filteredAlerts = computed(() => {
    let list = this.alerts();
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(a =>
        a.material_name.toLowerCase().includes(q) ||
        a.store_name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    if (this.selectedCategory) {
      list = list.filter(a => a.category.toLowerCase() === this.selectedCategory.toLowerCase());
    }
    if (this.selectedStoreId !== null) {
      list = list.filter(a => a.store_id === this.selectedStoreId);
    }
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredAlerts().length / this.pageSize())));

  pagedAlerts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredAlerts().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadAlerts();
    this.loadStores();
  }

  loadAlerts(): void {
    this.procurementService.getReorderAlerts().subscribe({
      next: (data) => {
        this.alerts.set(data || []);
        this.currentPage.set(1);
      },
      error: (err) => console.error('Failed to load reorder alerts:', err)
    });
  }

  loadStores(): void {
    this.procurementService.getSiteStores().subscribe({
      next: (data) => this.stores.set(data || []),
      error: (err) => console.error('Failed to load stores:', err)
    });
  }

  onSearchChange(): void {
    this.currentPage.set(1);
  }

  applyFilters(): void {
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedStoreId = null;
    this.currentPage.set(1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }

  getPages(): number[] {
    const total = this.totalPages();
    const cur = this.currentPage();
    const pages: number[] = [];
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  isSelected(item: ReorderAlertItem): boolean {
    return this.selectedItems().some(i => i.store_id === item.store_id && i.material_id === item.material_id);
  }

  toggleSelectItem(item: ReorderAlertItem): void {
    const cur = this.selectedItems();
    if (this.isSelected(item)) {
      this.selectedItems.set(cur.filter(i => !(i.store_id === item.store_id && i.material_id === item.material_id)));
    } else {
      this.selectedItems.set([...cur, item]);
    }
  }

  isAllSelected(): boolean {
    const current = this.pagedAlerts();
    return current.length > 0 && current.every(i => this.isSelected(i));
  }

  toggleSelectAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    const current = this.pagedAlerts();
    if (checked) {
      const merged = [...this.selectedItems()];
      for (const item of current) {
        if (!merged.some(i => i.store_id === item.store_id && i.material_id === item.material_id)) {
          merged.push(item);
        }
      }
      this.selectedItems.set(merged);
    } else {
      const currentKeys = new Set(current.map(i => `${i.store_id}-${i.material_id}`));
      this.selectedItems.set(this.selectedItems().filter(i => !currentKeys.has(`${i.store_id}-${i.material_id}`)));
    }
  }

  openSingleIndentModal(item: ReorderAlertItem): void {
    this.indentTargetItem = item;
    this.indentForm.patchValue({
      material_id: item.material_id,
      requested_quantity: item.shortage_quantity,
      required_by_date: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
      priority: 'HIGH',
      remarks: `Automated reorder indent for ${item.material_name} at ${item.store_name}. Current balance: ${item.current_stock_quantity}.`
    });
    this.isIndentModalOpen.set(true);
  }

  openBulkIndentModal(): void {
    const items = this.selectedItems();
    if (items.length === 0) return;
    this.indentTargetItem = null;
    const first = items[0];
    this.indentForm.patchValue({
      material_id: first.material_id,
      requested_quantity: items.reduce((sum, i) => sum + i.shortage_quantity, 0),
      required_by_date: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
      priority: 'HIGH',
      remarks: `Bulk replenishment indent for ${items.length} low-stock material items.`
    });
    this.isIndentModalOpen.set(true);
  }

  submitIndent(): void {
    if (this.indentForm.invalid) return;
    const val = this.indentForm.value;
    this.procurementService.createRequisition(val).subscribe({
      next: (res) => {
        alert(`Purchase Requisition ${res.pr_number} raised successfully!`);
        this.isIndentModalOpen.set(false);
        this.selectedItems.set([]);
        this.loadAlerts();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to create purchase requisition.');
      }
    });
  }

  openThresholdModal(item: ReorderAlertItem): void {
    this.indentTargetItem = item;
    this.thresholdForm.patchValue({
      store_id: item.store_id,
      material_id: item.material_id,
      reorder_level: item.reorder_level,
      reason: ''
    });
    this.isThresholdModalOpen.set(true);
  }

  submitThreshold(): void {
    if (this.thresholdForm.invalid) return;
    const val = this.thresholdForm.value;
    this.procurementService.adjustStoreStock({
      store_id: val.store_id,
      material_id: val.material_id,
      adjustment_quantity: 0,
      new_reorder_level: val.reorder_level,
      reason: val.reason || 'Safety reorder threshold update'
    }).subscribe({
      next: () => {
        alert('Reorder minimum threshold updated successfully!');
        this.isThresholdModalOpen.set(false);
        this.loadAlerts();
      },
      error: (err) => alert(err.error?.detail || 'Failed to update reorder threshold.')
    });
  }
}
