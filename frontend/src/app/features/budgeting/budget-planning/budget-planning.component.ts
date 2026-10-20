import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BudgetingService, BudgetPlan } from '../../../core/services/budgeting.service';
import { BudgetingNavComponent } from '../budgeting-nav/budgeting-nav.component';
import { CardContainerComponent, SearchableSelectComponent, ModalComponent } from '../../../shared/components';

@Component({
  selector: 'app-budget-planning',
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
      <app-budgeting-nav activeCode="2.0"></app-budgeting-nav>

      <app-card-container
        title="2.0 Budget Planning Master"
        subtitle="Annual, multi-year, project phase, building tower and corporate department budget allocations"
        badge="Master Planning"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Create Budget Plan</span>
          </button>
        </div>

        <!-- Filter Strip -->
        <div class="mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div class="flex-1">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="loadPlans()"
              placeholder="Search by Plan Code, Project or Title..."
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div class="w-full md:w-48">
            <app-searchable-select
              placeholder="All Scopes..."
              categoryCode="BUDGET_SCOPE_LEVEL"
              [allowCreateNew]="true"
              (selectionChange)="onScopeFilter($event)"
            ></app-searchable-select>
          </div>
          <button
            (click)="loadPlans()"
            class="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium rounded-lg hover:bg-slate-900 transition-colors"
          >
            Filter
          </button>
        </div>

        <!-- Plans Table with Pagination -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3">Plan Code & Title</th>
                <th class="px-4 py-3">Scope & Fiscal Year</th>
                <th class="px-4 py-3">Total Budget</th>
                <th class="px-4 py-3">Actual Spent</th>
                <th class="px-4 py-3">Committed PO</th>
                <th class="px-4 py-3">Available Headroom</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (plan of plans(); track plan.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3">
                    <span class="font-bold text-slate-900 dark:text-slate-100">{{ plan.title }}</span>
                    <span class="block text-[10px] text-slate-400 font-mono">{{ plan.plan_code }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {{ plan.scope_level }}
                    </span>
                    <span class="block text-[10px] text-slate-500 mt-0.5">{{ plan.fiscal_year }}</span>
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ plan.total_budget_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 font-mono text-amber-600 dark:text-amber-400 font-medium">
                    ৳{{ plan.actual_expenditure_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                    ৳{{ plan.committed_amount_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    ৳{{ plan.available_budget_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      [ngClass]="{
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300': plan.status === 'APPROVED',
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300': plan.status === 'UNDER_REVIEW' || plan.status === 'DRAFT',
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300': plan.status === 'REJECTED'
                      }"
                    >
                      {{ plan.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        (click)="openEditModal(plan)"
                        class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        title="Edit Plan"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        (click)="deletePlan(plan.id)"
                        class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Plan"
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

        <!-- Pagination Controls -->
        <div class="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {{ plans().length }} of {{ totalCount() }} budget plans</span>
          <div class="flex items-center gap-2">
            <button
              [disabled]="pageOffset === 0"
              (click)="prevPage()"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              [disabled]="pageOffset + pageLimit >= totalCount()"
              (click)="nextPage()"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </app-card-container>

      <!-- Full-Screen/Clean Isolated Modal for Create/Edit -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingId ? 'Edit Budget Plan' : 'Create New Budget Plan'"
        [subtitle]="'Define multi-year or project-scoped baseline budget allocation'"
        (closeModal)="closeModal()"
      >
        <form [formGroup]="planForm" (ngSubmit)="savePlan()" class="space-y-4 text-xs">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Plan Title *</label>
            <input
              type="text"
              formControlName="title"
              placeholder="e.g. Twin Tower Phase 1 Master Budget"
              class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                label="Scope Level *"
                placeholder="PROJECT"
                categoryCode="BUDGET_SCOPE_LEVEL"
                [allowCreateNew]="true"
                (selectionChange)="planForm.patchValue({ scope_level: $event })"
              ></app-searchable-select>
            </div>
            <div>
              <app-searchable-select
                label="Fiscal Year *"
                placeholder="2025-2026"
                categoryCode="FISCAL_YEAR"
                [allowCreateNew]="true"
                (selectionChange)="planForm.patchValue({ fiscal_year: $event })"
              ></app-searchable-select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                label="Link Project"
                placeholder="Twin Tower Residential..."
                categoryCode="REAL_ESTATE_PROJECT"
                [allowCreateNew]="true"
                (selectionChange)="planForm.patchValue({ project_id: $event?.id || 1 })"
              ></app-searchable-select>
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Total Baseline Budget (BDT) *</label>
              <input
                type="number"
                formControlName="total_budget_bdt"
                placeholder="120000000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Prepared By</label>
              <input
                type="text"
                formControlName="prepared_by"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <app-searchable-select
                label="Initial Status"
                placeholder="DRAFT"
                categoryCode="BUDGET_STATUS"
                [allowCreateNew]="true"
                (selectionChange)="planForm.patchValue({ status: $event })"
              ></app-searchable-select>
            </div>
          </div>

          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Approval Notes</label>
            <textarea
              formControlName="approval_notes"
              rows="2"
              placeholder="Board approval reference, scope details or QS remarks..."
              class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="planForm.invalid"
              class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {{ editingId ? 'Update Plan' : 'Save Plan' }}
            </button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class BudgetPlanningComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  private fb = inject(FormBuilder);

  plans = signal<BudgetPlan[]>([]);
  totalCount = signal<number>(0);
  searchQuery = '';
  scopeFilter = '';
  pageLimit = 20;
  pageOffset = 0;

  isModalOpen = false;
  editingId: number | null = null;

  planForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    scope_level: ['PROJECT', Validators.required],
    fiscal_year: ['2025-2026', Validators.required],
    period_type: ['MULTI_YEAR'],
    project_id: [1],
    total_budget_bdt: [120000000, [Validators.required, Validators.min(0)]],
    prepared_by: ['Project Lead QS'],
    status: ['DRAFT'],
    approval_notes: ['']
  });

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.budgetingService.getPlans({
      search: this.searchQuery || undefined,
      scope_level: this.scopeFilter || undefined,
      limit: this.pageLimit,
      offset: this.pageOffset
    }).subscribe({
      next: (res) => {
        this.plans.set(res.items);
        this.totalCount.set(res.total);
      },
      error: (err) => console.error('Failed to load budget plans', err)
    });
  }

  onScopeFilter(event: any) {
    this.scopeFilter = event ? String(event.value || event) : '';
    this.pageOffset = 0;
    this.loadPlans();
  }

  prevPage() {
    if (this.pageOffset >= this.pageLimit) {
      this.pageOffset -= this.pageLimit;
      this.loadPlans();
    }
  }

  nextPage() {
    if (this.pageOffset + this.pageLimit < this.totalCount()) {
      this.pageOffset += this.pageLimit;
      this.loadPlans();
    }
  }

  openCreateModal() {
    this.editingId = null;
    this.planForm.reset({
      title: '',
      scope_level: 'PROJECT',
      fiscal_year: '2025-2026',
      period_type: 'MULTI_YEAR',
      project_id: 1,
      total_budget_bdt: 120000000,
      prepared_by: 'Project Lead QS',
      status: 'DRAFT',
      approval_notes: ''
    });
    this.isModalOpen = true;
  }

  openEditModal(plan: BudgetPlan) {
    this.editingId = plan.id;
    this.planForm.patchValue({
      title: plan.title,
      scope_level: plan.scope_level,
      fiscal_year: plan.fiscal_year,
      period_type: plan.period_type,
      project_id: plan.project_id || 1,
      total_budget_bdt: plan.total_budget_bdt,
      prepared_by: plan.prepared_by,
      status: plan.status,
      approval_notes: plan.approval_notes
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
  }

  savePlan() {
    if (this.planForm.invalid) return;
    const formVal = this.planForm.value;

    if (this.editingId) {
      this.budgetingService.updatePlan(this.editingId, formVal).subscribe({
        next: () => {
          this.closeModal();
          this.loadPlans();
        }
      });
    } else {
      this.budgetingService.createPlan(formVal).subscribe({
        next: () => {
          this.closeModal();
          this.loadPlans();
        }
      });
    }
  }

  deletePlan(id: number) {
    if (confirm('Are you sure you want to delete this budget plan?')) {
      this.budgetingService.deletePlan(id).subscribe({
        next: () => this.loadPlans()
      });
    }
  }
}
