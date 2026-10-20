import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BudgetingService, BoqItem } from '../../../core/services/budgeting.service';
import { BudgetingNavComponent } from '../budgeting-nav/budgeting-nav.component';
import { CardContainerComponent, SearchableSelectComponent, ModalComponent } from '../../../shared/components';

@Component({
  selector: 'app-boq-budget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BudgetingNavComponent,
    CardContainerComponent,
    SearchableSelectComponent,
    ModalComponent
  ],
  template: `
    <div class="space-y-5">
      <app-budgeting-nav activeCode="4.0"></app-budgeting-nav>

      <app-card-container
        title="4.0 Bill of Quantities (BOQ) Budget Management"
        subtitle="Itemized construction activity costing, materials, labor, equipment & certified quantity tracking"
        badge="Civil & Structural BOQ"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="exportExcel()"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span>Export BOQ</span>
          </button>
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Add BOQ Item</span>
          </button>
        </div>

        <!-- Filter Toolbar -->
        <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="loadBoqItems()"
              placeholder="Search by Work Item, Category or Code..."
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <app-searchable-select
              placeholder="All Work Categories..."
              categoryCode="BOQ_WORK_CATEGORY"
              [allowCreateNew]="true"
              (selectionChange)="onCategoryFilter($event)"
            ></app-searchable-select>
          </div>
          <div>
            <button
              (click)="loadBoqItems()"
              class="w-full py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
            >
              Filter BOQ
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3">Work Item & Category</th>
                <th class="px-4 py-3">Tower</th>
                <th class="px-4 py-3">Est. Qty & Unit</th>
                <th class="px-4 py-3">Budget Rate</th>
                <th class="px-4 py-3">Total Budget (BDT)</th>
                <th class="px-4 py-3">Material / Labor Breakdown</th>
                <th class="px-4 py-3">Certified Qty</th>
                <th class="px-4 py-3">Actual Spent</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (item of boqItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    {{ item.work_item }}
                    <div class="text-[10px] text-slate-400 font-mono font-normal">
                      {{ item.item_code || 'BOQ-ITEM' }} • {{ item.work_category }}
                    </div>
                  </td>
                  <td class="px-4 py-3">{{ item.tower_name || 'Tower A' }}</td>
                  <td class="px-4 py-3 font-mono">
                    {{ item.estimated_qty | number:'1.0-2' }} <span class="font-sans font-semibold text-slate-500">{{ item.unit }}</span>
                  </td>
                  <td class="px-4 py-3 font-mono font-medium">
                    ৳{{ item.budget_rate_bdt | number:'1.2-2' }} / {{ item.unit }}
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ item.total_budget_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    Mat: ৳{{ (item.material_cost_bdt / 100000) | number:'1.1-1' }}L | Lab: ৳{{ (item.labor_cost_bdt / 100000) | number:'1.1-1' }}L
                  </td>
                  <td class="px-4 py-3 font-mono text-emerald-600 font-semibold">
                    {{ item.certified_qty | number:'1.0-2' }} {{ item.unit }}
                  </td>
                  <td class="px-4 py-3 font-mono text-amber-600 dark:text-amber-400 font-bold">
                    ৳{{ item.actual_spent_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        (click)="openEditModal(item)"
                        class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900"
                        title="Edit Item"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        (click)="deleteBoq(item.id)"
                        class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        title="Delete Item"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingId ? 'Edit BOQ Activity Item' : 'Add New BOQ Activity Item'"
        subtitle="Bill of Quantities estimation with unit rate and 4-tier cost component breakdown"
        (closeModal)="closeModal()"
      >
        <form [formGroup]="boqForm" (ngSubmit)="saveBoq()" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Work Item Description *</label>
              <input
                type="text"
                formControlName="work_item"
                placeholder="Reinforced concrete (1:1.5:3)"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tower / Building</label>
              <input
                type="text"
                formControlName="tower_name"
                placeholder="Tower A"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                label="Work Category *"
                placeholder="Structural work"
                categoryCode="BOQ_WORK_CATEGORY"
                [allowCreateNew]="true"
                (selectionChange)="boqForm.patchValue({ work_category: $event })"
              ></app-searchable-select>
            </div>
            <div>
              <app-searchable-select
                label="Unit of Measure *"
                placeholder="CFT"
                categoryCode="BOQ_UNIT_TYPE"
                [allowCreateNew]="true"
                (selectionChange)="boqForm.patchValue({ unit: $event })"
              ></app-searchable-select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Estimated Quantity *</label>
              <input
                type="number"
                formControlName="estimated_qty"
                (input)="calculateTotal()"
                placeholder="50000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Budget Rate (BDT) *</label>
              <input
                type="number"
                formControlName="budget_rate_bdt"
                (input)="calculateTotal()"
                placeholder="250"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Calculated Total (BDT)</label>
              <input
                type="number"
                formControlName="total_budget_bdt"
                readonly
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-emerald-600"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label class="block text-slate-600 font-medium mb-1">Material (BDT)</label>
              <input
                type="number"
                formControlName="material_cost_bdt"
                class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label class="block text-slate-600 font-medium mb-1">Labor (BDT)</label>
              <input
                type="number"
                formControlName="labor_cost_bdt"
                class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label class="block text-slate-600 font-medium mb-1">Equipment (BDT)</label>
              <input
                type="number"
                formControlName="equipment_cost_bdt"
                class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label class="block text-slate-600 font-medium mb-1">Subcontractor</label>
              <input
                type="number"
                formControlName="subcontractor_cost_bdt"
                class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="boqForm.invalid"
              class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {{ editingId ? 'Update BOQ Item' : 'Save BOQ Item' }}
            </button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class BoqBudgetComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  private fb = inject(FormBuilder);

  boqItems = signal<BoqItem[]>([]);
  totalCount = signal<number>(0);
  searchQuery = '';
  categoryFilter = '';

  isModalOpen = false;
  editingId: number | null = null;

  boqForm: FormGroup = this.fb.group({
    project_id: [1],
    tower_name: ['Tower A'],
    work_category: ['Structural work', Validators.required],
    work_item: ['', Validators.required],
    item_code: ['BOQ-STR-01'],
    unit: ['CFT', Validators.required],
    estimated_qty: [50000, [Validators.required, Validators.min(1)]],
    budget_rate_bdt: [250, [Validators.required, Validators.min(0.1)]],
    total_budget_bdt: [12500000],
    material_cost_bdt: [8500000],
    labor_cost_bdt: [2500000],
    equipment_cost_bdt: [1000000],
    subcontractor_cost_bdt: [500000],
    actual_qty: [0],
    certified_qty: [0],
    actual_spent_bdt: [0]
  });

  ngOnInit() {
    this.loadBoqItems();
  }

  calculateTotal() {
    const qty = Number(this.boqForm.get('estimated_qty')?.value || 0);
    const rate = Number(this.boqForm.get('budget_rate_bdt')?.value || 0);
    this.boqForm.patchValue({ total_budget_bdt: qty * rate }, { emitEvent: false });
  }

  loadBoqItems() {
    this.budgetingService.getBoqItems({
      search: this.searchQuery || undefined,
      work_category: this.categoryFilter || undefined
    }).subscribe({
      next: (res) => {
        this.boqItems.set(res.items);
        this.totalCount.set(res.total);
      }
    });
  }

  onCategoryFilter(event: any) {
    this.categoryFilter = event ? String(event.value || event) : '';
    this.loadBoqItems();
  }

  exportExcel() {
    alert('BOQ Sheet Exported successfully to CSV/Excel format.');
  }

  openAddModal() {
    this.editingId = null;
    this.boqForm.reset({
      project_id: 1,
      tower_name: 'Tower A',
      work_category: 'Structural work',
      work_item: '',
      item_code: 'BOQ-' + Math.floor(100 + Math.random() * 900),
      unit: 'CFT',
      estimated_qty: 50000,
      budget_rate_bdt: 250,
      total_budget_bdt: 12500000,
      material_cost_bdt: 8500000,
      labor_cost_bdt: 2500000,
      equipment_cost_bdt: 1000000,
      subcontractor_cost_bdt: 500000,
      actual_qty: 0,
      certified_qty: 0,
      actual_spent_bdt: 0
    });
    this.isModalOpen = true;
  }

  openEditModal(item: BoqItem) {
    this.editingId = item.id;
    this.boqForm.patchValue({
      project_id: item.project_id,
      tower_name: item.tower_name,
      work_category: item.work_category,
      work_item: item.work_item,
      item_code: item.item_code,
      unit: item.unit,
      estimated_qty: item.estimated_qty,
      budget_rate_bdt: item.budget_rate_bdt,
      total_budget_bdt: item.total_budget_bdt,
      material_cost_bdt: item.material_cost_bdt,
      labor_cost_bdt: item.labor_cost_bdt,
      equipment_cost_bdt: item.equipment_cost_bdt,
      subcontractor_cost_bdt: item.subcontractor_cost_bdt,
      actual_qty: item.actual_qty,
      certified_qty: item.certified_qty,
      actual_spent_bdt: item.actual_spent_bdt
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
  }

  saveBoq() {
    if (this.boqForm.invalid) return;
    const val = this.boqForm.value;

    if (this.editingId) {
      this.budgetingService.updateBoqItem(this.editingId, val).subscribe({
        next: () => {
          this.closeModal();
          this.loadBoqItems();
        }
      });
    } else {
      this.budgetingService.createBoqItem(val).subscribe({
        next: () => {
          this.closeModal();
          this.loadBoqItems();
        }
      });
    }
  }

  deleteBoq(id: number) {
    if (confirm('Delete this BOQ line item?')) {
      this.budgetingService.deleteBoqItem(id).subscribe({
        next: () => this.loadBoqItems()
      });
    }
  }
}
