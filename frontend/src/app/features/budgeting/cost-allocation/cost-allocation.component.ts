import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BudgetingService, CostAllocation } from '../../../core/services/budgeting.service';
import { CardContainerComponent, SearchableSelectComponent, ModalComponent } from '../../../shared/components';

@Component({
  selector: 'app-cost-allocation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    SearchableSelectComponent,
    ModalComponent
  ],
  template: `
    <div class="space-y-5">
      <!-- Cost Allocation Hierarchy Visualizer -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shadow-2xs">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Level 1</span>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Company</p>
          <span class="text-[9px] text-slate-500">Corporate Overhead</span>
        </div>
        <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shadow-2xs">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Level 2</span>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Project</p>
          <span class="text-[9px] text-slate-500">Residential Complex</span>
        </div>
        <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shadow-2xs">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Level 3</span>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Tower</p>
          <span class="text-[9px] text-slate-500">Tower A / Tower B</span>
        </div>
        <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shadow-2xs">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Level 4</span>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Floor</p>
          <span class="text-[9px] text-slate-500">Floor 01–20</span>
        </div>
        <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shadow-2xs">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Level 5</span>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Unit</p>
          <span class="text-[9px] text-slate-500">Apartment A-101</span>
        </div>
        <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shadow-2xs">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Level 6</span>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Cost Center</p>
          <span class="text-[9px] text-slate-500">Civil / MEP / Finishing</span>
        </div>
        <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shadow-2xs">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Level 7</span>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Category</p>
          <span class="text-[9px] text-slate-500">Material / Labor / Subcon</span>
        </div>
      </div>

      <app-card-container
        title="5.0 Multi-Tier Cost Allocation Engine"
        subtitle="Distribute direct and shared construction overheads using floor area (SFT), unit count or defined ratios"
        badge="Spatial Costing"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>New Cost Allocation</span>
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div class="flex-1">
            <app-searchable-select
              placeholder="Filter by Cost Center..."
              categoryCode="COST_CENTER"
              [allowCreateNew]="true"
              (selectionChange)="onCostCenterFilter($event)"
            ></app-searchable-select>
          </div>
          <button
            (click)="loadAllocations()"
            class="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
          >
            Refresh
          </button>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3">Allocation Code</th>
                <th class="px-4 py-3">Tower & Floor</th>
                <th class="px-4 py-3">Target Unit</th>
                <th class="px-4 py-3">Cost Center & Category</th>
                <th class="px-4 py-3">Allocation Rule</th>
                <th class="px-4 py-3">Ratio / Basis</th>
                <th class="px-4 py-3">Allocated Amount (BDT)</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (alc of allocations(); track alc.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {{ alc.allocation_code }}
                  </td>
                  <td class="px-4 py-3 font-medium">
                    {{ alc.tower_name || 'Tower A' }}
                    <span class="block text-[10px] text-slate-400">{{ alc.floor_level || 'All Floors' }}</span>
                  </td>
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ alc.unit_number || 'Shared / All Units' }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {{ alc.cost_center }}
                    </span>
                    <span class="block text-[10px] text-slate-500 mt-0.5">{{ alc.cost_category }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="font-medium text-slate-800 dark:text-slate-200">{{ alc.allocation_method }}</span>
                  </td>
                  <td class="px-4 py-3 font-mono">
                    {{ alc.allocated_pct }}%
                    <span class="block text-[10px] text-slate-400">{{ alc.basis_value | number }} SFT</span>
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ alc.allocated_amount_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      (click)="deleteAllocation(alc.id)"
                      class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                      title="Delete Allocation"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Add Allocation Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Create Spatial Cost Allocation"
        subtitle="Distribute project expenditures across towers, floors and individual apartment units"
        (closeModal)="closeModal()"
      >
        <form [formGroup]="allocForm" (ngSubmit)="saveAllocation()" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Building Tower</label>
              <input
                type="text"
                formControlName="tower_name"
                placeholder="Tower A"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Floor Level</label>
              <input
                type="text"
                formControlName="floor_level"
                placeholder="Floor 01–20"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Unit Number / Range</label>
              <input
                type="text"
                formControlName="unit_number"
                placeholder="Apartment A-101"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <app-searchable-select
                label="Allocation Rule *"
                placeholder="FLOOR_AREA"
                categoryCode="ALLOCATION_METHOD"
                [allowCreateNew]="true"
                (selectionChange)="allocForm.patchValue({ allocation_method: $event })"
              ></app-searchable-select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                label="Cost Center *"
                placeholder="Civil Works"
                categoryCode="COST_CENTER"
                [allowCreateNew]="true"
                (selectionChange)="allocForm.patchValue({ cost_center: $event })"
              ></app-searchable-select>
            </div>
            <div>
              <app-searchable-select
                label="Cost Category *"
                placeholder="Material"
                categoryCode="COST_CATEGORY"
                [allowCreateNew]="true"
                (selectionChange)="allocForm.patchValue({ cost_category: $event })"
              ></app-searchable-select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Basis Value (SFT/Units)</label>
              <input
                type="number"
                formControlName="basis_value"
                placeholder="185000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Allocated Ratio (%) *</label>
              <input
                type="number"
                formControlName="allocated_pct"
                placeholder="100"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Allocated Amount (BDT) *</label>
              <input
                type="number"
                formControlName="allocated_amount_bdt"
                placeholder="50000000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-emerald-600"
              />
            </div>
          </div>

          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Remarks & Basis Notes</label>
            <textarea
              formControlName="remarks"
              rows="2"
              placeholder="e.g. Distributed by saleable apartment area across Tower A..."
              class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            ></textarea>
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
              [disabled]="allocForm.invalid"
              class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Save Allocation
            </button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class CostAllocationComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  private fb = inject(FormBuilder);

  allocations = signal<CostAllocation[]>([]);
  totalCount = signal<number>(0);
  costCenterFilter = '';
  isModalOpen = false;

  allocForm: FormGroup = this.fb.group({
    project_id: [1],
    tower_name: ['Tower A'],
    floor_level: ['Floor 01–20'],
    unit_number: ['Apartment A-101'],
    cost_center: ['Civil Works', Validators.required],
    cost_category: ['Material', Validators.required],
    allocation_method: ['FLOOR_AREA', Validators.required],
    basis_value: [185000],
    allocated_pct: [100, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    allocated_amount_bdt: [50000000, [Validators.required, Validators.min(1)]],
    remarks: ['']
  });

  ngOnInit() {
    this.loadAllocations();
  }

  loadAllocations() {
    this.budgetingService.getCostAllocations({
      cost_center: this.costCenterFilter || undefined
    }).subscribe({
      next: (res) => {
        this.allocations.set(res.items);
        this.totalCount.set(res.total);
      }
    });
  }

  onCostCenterFilter(event: any) {
    this.costCenterFilter = event ? String(event.value || event) : '';
    this.loadAllocations();
  }

  openAddModal() {
    this.allocForm.reset({
      project_id: 1,
      tower_name: 'Tower A',
      floor_level: 'Floor 01–20',
      unit_number: 'Apartment A-101',
      cost_center: 'Civil Works',
      cost_category: 'Material',
      allocation_method: 'FLOOR_AREA',
      basis_value: 185000,
      allocated_pct: 100,
      allocated_amount_bdt: 50000000,
      remarks: ''
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveAllocation() {
    if (this.allocForm.invalid) return;
    this.budgetingService.createCostAllocation(this.allocForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadAllocations();
      }
    });
  }

  deleteAllocation(id: number) {
    if (confirm('Delete this cost allocation record?')) {
      this.budgetingService.deleteCostAllocation(id).subscribe({
        next: () => this.loadAllocations()
      });
    }
  }
}
