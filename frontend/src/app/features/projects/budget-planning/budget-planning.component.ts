import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

export interface BudgetLineItem {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  wbs_category: string;
  item_description: string;
  unit_of_measure: string;
  estimated_quantity: number;
  unit_rate_bdt: number;
  total_budget_bdt: number;
  committed_cost_bdt: number;
  actual_spent_bdt: number;
  cost_variance_bdt: number;
  lock_status: 'LOCKED' | 'OPEN';
}

@Component({
  selector: 'app-project-budget-planning',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-5">

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Baseline Approved Budget</p>
          <p class="text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">৳{{ (totalBudget() / 10000000) | number:'1.2-2' }} Cr</p>
          <p class="text-[10px] text-slate-400">Total Approved Civil & MEP BOQ</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Committed PO / Contracts</p>
          <p class="text-xl font-bold font-display text-blue-600 dark:text-blue-400 mt-1">৳{{ (totalCommitted() / 10000000) | number:'1.2-2' }} Cr</p>
          <p class="text-[10px] text-slate-400">Locked via Purchase Orders</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Actual Spend Posted</p>
          <p class="text-xl font-bold font-display text-amber-600 dark:text-amber-400 mt-1">৳{{ (totalSpent() / 10000000) | number:'1.2-2' }} Cr</p>
          <p class="text-[10px] text-slate-400">Vendor Bills & Labor Incurred</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Remaining Cost Variance</p>
          <p class="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">৳{{ ((totalBudget() - totalSpent()) / 10000000) | number:'1.2-2' }} Cr</p>
          <p class="text-[10px] text-emerald-500 font-semibold">Under Hard Budget Lock</p>
        </div>
      </div>

      <!-- Main Card Container -->
      <app-card-container
        title="2.5 Project Budget & Cost Planning"
        subtitle="Work Breakdown Structure (WBS) cost allocation, material rate master, and hard budget baseline locks"
        badge="Cost Control"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Add Budget Line</span>
          </button>
        </div>

        <!-- Filter Toolbar -->
        <div class="mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div class="relative flex-1">
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Search by Item Description, WBS Category, or Project..."
              class="w-full pl-3 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              <tr>
                <th class="px-4 py-3">WBS Category & Item</th>
                <th class="px-4 py-3">Project Link</th>
                <th class="px-4 py-3">Quantity & Unit Rate</th>
                <th class="px-4 py-3">Approved Budget (BDT)</th>
                <th class="px-4 py-3">Actual Spent (BDT)</th>
                <th class="px-4 py-3">Lock Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (b of filteredBudget(); track b.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    {{ b.item_description }}
                    <div class="text-[10px] text-slate-400 font-normal uppercase">{{ b.wbs_category }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-800 dark:text-slate-200">{{ b.project_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ b.project_code }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono">
                    {{ b.estimated_quantity | number:'1.0-0' }} {{ b.unit_of_measure }} &#64; ৳{{ b.unit_rate_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 font-mono">
                    ৳{{ b.total_budget_bdt | number:'1.0-0' }}
                  </td>
                  <td class="px-4 py-3 font-bold text-amber-600 font-mono">
                    ৳{{ b.actual_spent_bdt | number:'1.0-0' }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      [ngClass]="b.lock_status === 'LOCKED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'">
                      {{ b.lock_status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="removeItem(b.id)" class="text-rose-600 hover:text-rose-800 font-semibold text-xs">Remove</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Add Budget Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Add WBS Budget Line Item</h2>
            <form [formGroup]="budgetForm" (ngSubmit)="saveBudgetLine()" class="space-y-3">
              <div>
                <app-searchable-select
                  label="Select Project"
                  [required]="true"
                  [options]="projectOptions()"
                  formControlName="project_id"
                  placeholder="Select project..."
                  [allowCreateNew]="false"
                ></app-searchable-select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">WBS Phase Category</label>
                  <select formControlName="wbs_category" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <option value="SUBSTRUCTURE_PILING">Piling & Foundation</option>
                    <option value="SUPERSTRUCTURE_RCC">Superstructure RCC</option>
                    <option value="MASONRY_PLASTER">Brickwork & Plaster</option>
                    <option value="MEP_ELECTRICAL">Electrical & Substation</option>
                    <option value="MEP_PLUMBING">Plumbing & Sanitation</option>
                    <option value="ARCHITECTURAL_FINISH">Flooring & Tiles</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Unit of Measure</label>
                  <select formControlName="unit_of_measure" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <option value="CFT">CFT (Cubic Feet)</option>
                    <option value="TON">TON (Metric Ton)</option>
                    <option value="BAG">BAG (50kg)</option>
                    <option value="SQFT">SQFT</option>
                    <option value="NOS">NOS (Pieces)</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1">Item Description <span class="text-rose-500">*</span></label>
                <input type="text" formControlName="item_description" placeholder="e.g. 500W TMT Rebar Reinforcement Piling" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Estimated Quantity</label>
                  <input type="number" formControlName="estimated_quantity" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Unit Rate (BDT)</label>
                  <input type="number" formControlName="unit_rate_bdt" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-3">
                <button type="button" (click)="isModalOpen.set(false)" class="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-xs">Save Budget Item</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ProjectBudgetPlanningComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  isModalOpen = signal<boolean>(false);
  searchQuery = signal<string>('');

  budgetItems = signal<BudgetLineItem[]>([
    {
      id: 1,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      wbs_category: 'SUBSTRUCTURE_PILING',
      item_description: 'Pre-Cast Cast-in-Situ Cast Piles (1000mm Dia)',
      unit_of_measure: 'CFT',
      estimated_quantity: 45000,
      unit_rate_bdt: 420.0,
      total_budget_bdt: 18900000,
      committed_cost_bdt: 18900000,
      actual_spent_bdt: 15400000,
      cost_variance_bdt: 3500000,
      lock_status: 'LOCKED'
    },
    {
      id: 2,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      wbs_category: 'SUPERSTRUCTURE_RCC',
      item_description: '500W Deformed Rebar Steel Reinforcement',
      unit_of_measure: 'TON',
      estimated_quantity: 650,
      unit_rate_bdt: 98000.0,
      total_budget_bdt: 63700000,
      committed_cost_bdt: 60000000,
      actual_spent_bdt: 24500000,
      cost_variance_bdt: 39200000,
      lock_status: 'LOCKED'
    },
    {
      id: 3,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      project_code: 'PRJ-2026-001',
      wbs_category: 'SUPERSTRUCTURE_RCC',
      item_description: 'Ready-Mix Concrete C-30/37 Grade with Micro-Silica',
      unit_of_measure: 'CFT',
      estimated_quantity: 110000,
      unit_rate_bdt: 330.0,
      total_budget_bdt: 36300000,
      committed_cost_bdt: 36300000,
      actual_spent_bdt: 14200000,
      cost_variance_bdt: 22100000,
      lock_status: 'LOCKED'
    }
  ]);

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `[${p.project_code}] ${p.project_name}`,
      subLabel: `${p.thana_upazila}, ${p.district}`
    }));
  });

  totalBudget = computed(() => this.budgetItems().reduce((acc, b) => acc + b.total_budget_bdt, 0));
  totalCommitted = computed(() => this.budgetItems().reduce((acc, b) => acc + b.committed_cost_bdt, 0));
  totalSpent = computed(() => this.budgetItems().reduce((acc, b) => acc + b.actual_spent_bdt, 0));

  filteredBudget = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.budgetItems();
    return this.budgetItems().filter(b => 
      b.item_description.toLowerCase().includes(q) ||
      b.wbs_category.toLowerCase().includes(q) ||
      b.project_name.toLowerCase().includes(q)
    );
  });

  budgetForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    wbs_category: ['SUPERSTRUCTURE_RCC', Validators.required],
    item_description: ['', Validators.required],
    unit_of_measure: ['TON', Validators.required],
    estimated_quantity: [100, Validators.required],
    unit_rate_bdt: [98000, Validators.required]
  });

  ngOnInit(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p || []));
  }

  openAddModal(): void {
    this.budgetForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      wbs_category: 'SUPERSTRUCTURE_RCC',
      item_description: 'Portland Composite Cement (PCC 50kg Bags)',
      unit_of_measure: 'BAG',
      estimated_quantity: 20000,
      unit_rate_bdt: 560
    });
    this.isModalOpen.set(true);
  }

  saveBudgetLine(): void {
    if (this.budgetForm.invalid) return;
    const v = this.budgetForm.value;
    const proj = this.projects().find(p => p.id === Number(v.project_id));
    const qty = Number(v.estimated_quantity);
    const rate = Number(v.unit_rate_bdt);
    const total = qty * rate;

    const newItem: BudgetLineItem = {
      id: Date.now(),
      project_id: Number(v.project_id),
      project_name: proj?.project_name || 'Selected Project',
      project_code: proj?.project_code || 'PRJ-2026',
      wbs_category: v.wbs_category,
      item_description: v.item_description,
      unit_of_measure: v.unit_of_measure,
      estimated_quantity: qty,
      unit_rate_bdt: rate,
      total_budget_bdt: total,
      committed_cost_bdt: 0,
      actual_spent_bdt: 0,
      cost_variance_bdt: total,
      lock_status: 'OPEN'
    };

    this.budgetItems.update(items => [newItem, ...items]);
    this.isModalOpen.set(false);
  }

  removeItem(id: number): void {
    this.budgetItems.update(items => items.filter(b => b.id !== id));
  }
}
