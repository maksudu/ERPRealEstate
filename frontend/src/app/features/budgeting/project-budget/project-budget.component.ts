import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BudgetingService, ProjectBudgetLine } from '../../../core/services/budgeting.service';
import { BudgetingNavComponent } from '../budgeting-nav/budgeting-nav.component';
import { CardContainerComponent, SearchableSelectComponent, ModalComponent } from '../../../shared/components';

@Component({
  selector: 'app-project-budget',
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
      <app-budgeting-nav activeCode="3.0"></app-budgeting-nav>

      <app-card-container
        title="3.0 Project Budget Management"
        subtitle="Manage detailed cost categories for land acquisition, civil, structural, MEP, interior finishing, administrative and marketing"
        badge="Category Cost Master"
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

        <!-- Filter Bar -->
        <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="loadBudgets()"
              placeholder="Search by line code or item name..."
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <app-searchable-select
              placeholder="All Cost Categories..."
              categoryCode="COST_CATEGORY"
              [allowCreateNew]="true"
              (selectionChange)="onCategoryFilter($event)"
            ></app-searchable-select>
          </div>
          <div>
            <button
              (click)="loadBudgets()"
              class="w-full py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
            >
              Search & Filter
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3">Code & Description</th>
                <th class="px-4 py-3">Category & Cost Center</th>
                <th class="px-4 py-3">Tower</th>
                <th class="px-4 py-3">Baseline Budget</th>
                <th class="px-4 py-3">Committed PO</th>
                <th class="px-4 py-3">Actual Spent</th>
                <th class="px-4 py-3">Variance Headroom</th>
                <th class="px-4 py-3">Lock Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (b of budgets(); track b.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3">
                    <span class="font-bold text-slate-900 dark:text-slate-100">{{ b.item_name }}</span>
                    <span class="block text-[10px] text-slate-400 font-mono">{{ b.line_code }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {{ b.cost_category }}
                    </span>
                    <span class="block text-[10px] text-slate-500 mt-0.5">{{ b.cost_center }}</span>
                  </td>
                  <td class="px-4 py-3 font-medium">{{ b.tower_name || 'Common' }}</td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ (b.baseline_amount_bdt / 100000) | number:'1.2-2' }}L
                  </td>
                  <td class="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                    ৳{{ (b.committed_amount_bdt / 100000) | number:'1.2-2' }}L
                  </td>
                  <td class="px-4 py-3 font-mono text-amber-600 dark:text-amber-400 font-medium">
                    ৳{{ (b.actual_spent_bdt / 100000) | number:'1.2-2' }}L
                  </td>
                  <td class="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    ৳{{ (b.variance_bdt / 100000) | number:'1.2-2' }}L
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="b.is_locked ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'"
                    >
                      {{ b.is_locked ? 'HARD LOCKED' : 'OPEN' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        (click)="openEditModal(b)"
                        class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900"
                        title="Edit Line"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        (click)="deleteBudgetLine(b.id)"
                        class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        title="Delete Line"
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

      <!-- Add/Edit Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingId ? 'Edit Project Budget Line' : 'Add Project Budget Line'"
        subtitle="Specify category breakdown, baseline allocation and hard budget locks"
        (closeModal)="closeModal()"
      >
        <form [formGroup]="budgetForm" (ngSubmit)="saveBudget()" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Line Code *</label>
              <input
                type="text"
                formControlName="line_code"
                placeholder="CIV-002"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tower / Phase</label>
              <input
                type="text"
                formControlName="tower_name"
                placeholder="Tower A"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Item Name / Work Package *</label>
            <input
              type="text"
              formControlName="item_name"
              placeholder="e.g. Electrical Substation & Transformer Installation"
              class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                label="Cost Category *"
                placeholder="Civil construction"
                categoryCode="COST_CATEGORY"
                [allowCreateNew]="true"
                (selectionChange)="budgetForm.patchValue({ cost_category: $event })"
              ></app-searchable-select>
            </div>
            <div>
              <app-searchable-select
                label="Cost Center *"
                placeholder="Civil Works"
                categoryCode="COST_CENTER"
                [allowCreateNew]="true"
                (selectionChange)="budgetForm.patchValue({ cost_center: $event })"
              ></app-searchable-select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Baseline Amount (BDT) *</label>
              <input
                type="number"
                formControlName="baseline_amount_bdt"
                placeholder="5000000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Actual Spent (BDT)</label>
              <input
                type="number"
                formControlName="actual_spent_bdt"
                placeholder="0"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="lockCheck"
              formControlName="is_locked"
              class="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label for="lockCheck" class="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
              Enforce Hard Budget Baseline Lock (Prevents unapproved POs)
            </label>
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
              [disabled]="budgetForm.invalid"
              class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {{ editingId ? 'Update Line' : 'Add Line' }}
            </button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class ProjectBudgetComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  private fb = inject(FormBuilder);

  budgets = signal<ProjectBudgetLine[]>([]);
  totalCount = signal<number>(0);
  searchQuery = '';
  categoryFilter = '';

  isModalOpen = false;
  editingId: number | null = null;

  budgetForm: FormGroup = this.fb.group({
    budget_plan_id: [1],
    project_id: [1],
    tower_name: ['Tower A'],
    cost_category: ['Civil construction', Validators.required],
    cost_center: ['Civil Works', Validators.required],
    line_code: ['', Validators.required],
    item_name: ['', Validators.required],
    description: [''],
    baseline_amount_bdt: [5000000, [Validators.required, Validators.min(0)]],
    actual_spent_bdt: [0],
    is_locked: [false]
  });

  ngOnInit() {
    this.loadBudgets();
  }

  loadBudgets() {
    this.budgetingService.getProjectBudgets({
      search: this.searchQuery || undefined,
      cost_category: this.categoryFilter || undefined
    }).subscribe({
      next: (res) => {
        this.budgets.set(res.items);
        this.totalCount.set(res.total);
      }
    });
  }

  onCategoryFilter(event: any) {
    this.categoryFilter = event ? String(event.value || event) : '';
    this.loadBudgets();
  }

  openAddModal() {
    this.editingId = null;
    this.budgetForm.reset({
      budget_plan_id: 1,
      project_id: 1,
      tower_name: 'Tower A',
      cost_category: 'Civil construction',
      cost_center: 'Civil Works',
      line_code: 'CIV-' + Math.floor(100 + Math.random() * 900),
      item_name: '',
      description: '',
      baseline_amount_bdt: 5000000,
      actual_spent_bdt: 0,
      is_locked: false
    });
    this.isModalOpen = true;
  }

  openEditModal(b: ProjectBudgetLine) {
    this.editingId = b.id;
    this.budgetForm.patchValue({
      budget_plan_id: b.budget_plan_id,
      project_id: b.project_id,
      tower_name: b.tower_name,
      cost_category: b.cost_category,
      cost_center: b.cost_center,
      line_code: b.line_code,
      item_name: b.item_name,
      description: b.description,
      baseline_amount_bdt: b.baseline_amount_bdt,
      actual_spent_bdt: b.actual_spent_bdt,
      is_locked: b.is_locked
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
  }

  saveBudget() {
    if (this.budgetForm.invalid) return;
    const val = this.budgetForm.value;

    if (this.editingId) {
      this.budgetingService.updateProjectBudget(this.editingId, val).subscribe({
        next: () => {
          this.closeModal();
          this.loadBudgets();
        }
      });
    } else {
      this.budgetingService.createProjectBudget(val).subscribe({
        next: () => {
          this.closeModal();
          this.loadBudgets();
        }
      });
    }
  }

  deleteBudgetLine(id: number) {
    if (confirm('Delete this budget line item?')) {
      this.budgetingService.deleteProjectBudget(id).subscribe({
        next: () => this.loadBudgets()
      });
    }
  }
}
