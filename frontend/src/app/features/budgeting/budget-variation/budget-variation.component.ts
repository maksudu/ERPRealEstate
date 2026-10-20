import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BudgetingService, BudgetVariation } from '../../../core/services/budgeting.service';
import { CardContainerComponent, SearchableSelectComponent, ModalComponent } from '../../../shared/components';

@Component({
  selector: 'app-budget-variation',
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
      <!-- 5-Stage Variation Workflow Banner -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3">
          Budget Variation & Change Order Workflow
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <div class="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
            <span class="text-[10px] font-bold text-slate-400 uppercase">1. Request</span>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Site Engineer</p>
            <span class="text-[9px] text-slate-500">Revised qty & reason</span>
          </div>
          <div class="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
            <span class="text-[10px] font-bold text-slate-400 uppercase">2. Technical</span>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Quantity Surveyor</p>
            <span class="text-[9px] text-slate-500">BOQ, scope & rate</span>
          </div>
          <div class="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
            <span class="text-[10px] font-bold text-slate-400 uppercase">3. Finance</span>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Finance Lead</p>
            <span class="text-[9px] text-slate-500">Budget impact check</span>
          </div>
          <div class="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
            <span class="text-[10px] font-bold text-slate-400 uppercase">4. Approval</span>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Managing Director</p>
            <span class="text-[9px] text-slate-500">Accept / Reject / Return</span>
          </div>
          <div class="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/40">
            <span class="text-[10px] font-bold text-emerald-600 uppercase">5. Revision</span>
            <p class="text-xs font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">Budget Revision</p>
            <span class="text-[9px] text-emerald-700 dark:text-emerald-400">Baseline updated</span>
          </div>
        </div>
      </div>

      <app-card-container
        title="9.0 Scope Variation & Change Order Approvals"
        subtitle="Manage cost impacts from additional work, revised structural design, material price escalation and unforeseen conditions"
        badge="Change Control"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Submit Variation Request</span>
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div>
            <app-searchable-select
              placeholder="Filter by Stage..."
              categoryCode="VARIATION_STAGE"
              [allowCreateNew]="true"
              (selectionChange)="onStageFilter($event)"
            ></app-searchable-select>
          </div>
          <div>
            <app-searchable-select
              placeholder="Reason Category..."
              categoryCode="VARIATION_REASON"
              [allowCreateNew]="true"
              (selectionChange)="onReasonFilter($event)"
            ></app-searchable-select>
          </div>
          <div>
            <button
              (click)="loadVariations()"
              class="w-full py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
            >
              Filter Variations
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3">Variation Code & Title</th>
                <th class="px-4 py-3">Tower</th>
                <th class="px-4 py-3">Reason Category</th>
                <th class="px-4 py-3">Original Cost</th>
                <th class="px-4 py-3">Revised Cost</th>
                <th class="px-4 py-3">Variation Net (BDT)</th>
                <th class="px-4 py-3">Approval Stage</th>
                <th class="px-4 py-3">Approved By</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (v of variations(); track v.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3">
                    <span class="font-bold text-slate-900 dark:text-slate-100">{{ v.title }}</span>
                    <span class="block text-[10px] text-slate-400 font-mono">{{ v.variation_code }}</span>
                  </td>
                  <td class="px-4 py-3 font-medium">{{ v.tower_name || 'Tower A' }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {{ v.reason_category }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-mono">
                    ৳{{ (v.original_cost_bdt / 100000) | number:'1.2-2' }}L
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ (v.revised_cost_bdt / 100000) | number:'1.2-2' }}L
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                    +৳{{ (v.variation_amount_bdt / 100000) | number:'1.2-2' }}L
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="v.stage === 'MANAGEMENT_APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'"
                    >
                      {{ v.stage }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                    {{ v.approved_by || 'Pending Review' }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    @if (v.stage !== 'MANAGEMENT_APPROVED') {
                      <button
                        (click)="approveVariation(v)"
                        class="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Approve
                      </button>
                    } @else {
                      <span class="text-[10px] text-emerald-600 font-semibold">Locked</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Add Variation Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Submit Budget Variation Request"
        subtitle="Provide technical justification, revised quantities and estimated project cost delta"
        (closeModal)="closeModal()"
      >
        <form [formGroup]="varForm" (ngSubmit)="saveVariation()" class="space-y-4 text-xs">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Variation Title *</label>
            <input
              type="text"
              formControlName="title"
              placeholder="e.g. Additional Substation Capacity & Generator Upgrade"
              class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                label="Reason Category *"
                placeholder="Site Condition Changes"
                categoryCode="VARIATION_REASON"
                [allowCreateNew]="true"
                (selectionChange)="varForm.patchValue({ reason_category: $event })"
              ></app-searchable-select>
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

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Original Baseline Cost (BDT) *</label>
              <input
                type="number"
                formControlName="original_cost_bdt"
                placeholder="8000000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Revised Estimated Cost (BDT) *</label>
              <input
                type="number"
                formControlName="revised_cost_bdt"
                placeholder="9400000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-rose-600"
              />
            </div>
          </div>

          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Engineering Justification & Scope Details *</label>
            <textarea
              formControlName="justification"
              rows="3"
              placeholder="Describe technical reason for change, drawing revisions, and impact on timeline..."
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
              [disabled]="varForm.invalid"
              class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Submit Variation
            </button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class BudgetVariationComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  private fb = inject(FormBuilder);

  variations = signal<BudgetVariation[]>([]);
  totalCount = signal<number>(0);
  stageFilter = '';
  isModalOpen = false;

  varForm: FormGroup = this.fb.group({
    project_id: [1],
    tower_name: ['Tower A'],
    title: ['', Validators.required],
    reason_category: ['Site Condition Changes', Validators.required],
    original_cost_bdt: [8000000, [Validators.required, Validators.min(0)]],
    revised_cost_bdt: [9400000, [Validators.required, Validators.min(0)]],
    justification: ['', Validators.required],
    stage: ['SUBMITTED'],
    created_by: ['Site Engineer']
  });

  ngOnInit() {
    this.loadVariations();
  }

  loadVariations() {
    this.budgetingService.getVariations({
      stage: this.stageFilter || undefined
    }).subscribe({
      next: (res) => {
        this.variations.set(res.items);
        this.totalCount.set(res.total);
      }
    });
  }

  onStageFilter(event: any) {
    this.stageFilter = event ? String(event.value || event) : '';
    this.loadVariations();
  }

  onReasonFilter(event: any) {
    this.loadVariations();
  }

  openAddModal() {
    this.varForm.reset({
      project_id: 1,
      tower_name: 'Tower A',
      title: '',
      reason_category: 'Site Condition Changes',
      original_cost_bdt: 8000000,
      revised_cost_bdt: 9400000,
      justification: '',
      stage: 'SUBMITTED',
      created_by: 'Site Engineer'
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveVariation() {
    if (this.varForm.invalid) return;
    this.budgetingService.createVariation(this.varForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadVariations();
      }
    });
  }

  approveVariation(v: BudgetVariation) {
    if (confirm(`Approve Variation ${v.variation_code}? This will revise the project baseline budget.`)) {
      this.budgetingService.updateVariation(v.id, {
        stage: 'MANAGEMENT_APPROVED',
        approved_by: 'Managing Director'
      }).subscribe({
        next: () => this.loadVariations()
      });
    }
  }
}
