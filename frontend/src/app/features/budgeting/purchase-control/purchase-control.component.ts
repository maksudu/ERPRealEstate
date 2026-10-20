import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BudgetingService, PurchaseBudgetCheck } from '../../../core/services/budgeting.service';
import { CardContainerComponent, SearchableSelectComponent, ModalComponent } from '../../../shared/components';

@Component({
  selector: 'app-purchase-control',
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
      <!-- Automated Control Warning Banner -->
      <div class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
        <div class="p-1.5 rounded-lg bg-amber-500 text-white shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <div>
          <h4 class="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
            Automated Purchase Hard Budget Enforcement
          </h4>
          <p class="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
            Purchase Requisitions (PR) and Purchase Orders (PO) are checked against uncommitted available budget in real-time. Requisitions that exceed available budget thresholds are automatically locked and routed for Special Executive Approval.
          </p>
        </div>
      </div>

      <app-card-container
        title="7.0 Purchase Budget Control & Commitment Verification"
        subtitle="Validate requisitions, purchase orders and committed obligations prior to procurement release"
        badge="Hard Budget Locks"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Verify New PO / Requisition</span>
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div>
            <app-searchable-select
              placeholder="All Document Types..."
              categoryCode="PROC_DOC_TYPE"
              [allowCreateNew]="true"
              (selectionChange)="onDocTypeFilter($event)"
            ></app-searchable-select>
          </div>
          <div>
            <app-searchable-select
              placeholder="All Verification Statuses..."
              categoryCode="PURCHASE_BUDGET_STATUS"
              [allowCreateNew]="true"
              (selectionChange)="onStatusFilter($event)"
            ></app-searchable-select>
          </div>
          <div>
            <button
              (click)="loadChecks()"
              class="w-full py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
            >
              Filter Checks
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3">Check Code & Document Ref</th>
                <th class="px-4 py-3">Vendor / Supplier</th>
                <th class="px-4 py-3">Category & Cost Center</th>
                <th class="px-4 py-3">Requested Amount (BDT)</th>
                <th class="px-4 py-3">Available Budget</th>
                <th class="px-4 py-3">System Gatekeeper Decision</th>
                <th class="px-4 py-3">Audit Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (c of checks(); track c.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3">
                    <span class="font-bold text-slate-900 dark:text-slate-100">{{ c.document_ref }}</span>
                    <span class="block text-[10px] text-slate-400 font-mono">{{ c.check_code }} • {{ c.document_type }}</span>
                  </td>
                  <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {{ c.vendor_name || 'Generic Procurement' }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="font-semibold text-slate-800 dark:text-slate-200">{{ c.cost_category }}</span>
                    <span class="block text-[10px] text-slate-500">{{ c.cost_center }}</span>
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ c.requested_amount_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    ৳{{ c.available_budget_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="c.status === 'APPROVED_WITHIN_BUDGET' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'"
                    >
                      {{ c.status === 'APPROVED_WITHIN_BUDGET' ? 'PASSED WITHIN BUDGET' : 'OVER-BUDGET HELD' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate">
                    {{ c.action_notes }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Verification Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Real-Time Purchase Budget Verification Check"
        subtitle="Test PO / Requisition against available headroom and trigger automated hard budget locks"
        (closeModal)="closeModal()"
      >
        <form [formGroup]="checkForm" (ngSubmit)="submitCheck()" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                label="Document Type *"
                placeholder="PURCHASE_ORDER"
                categoryCode="PROC_DOC_TYPE"
                [allowCreateNew]="true"
                (selectionChange)="checkForm.patchValue({ document_type: $event })"
              ></app-searchable-select>
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Document Reference *</label>
              <input
                type="text"
                formControlName="document_ref"
                placeholder="PO-2025-099 (Holcim Cement)"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Supplier / Vendor Name</label>
              <input
                type="text"
                formControlName="vendor_name"
                placeholder="LafargeHolcim Bangladesh Ltd"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <app-searchable-select
                label="Cost Category *"
                placeholder="Civil construction"
                categoryCode="COST_CATEGORY"
                [allowCreateNew]="true"
                (selectionChange)="checkForm.patchValue({ cost_category: $event })"
              ></app-searchable-select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Requested PO Amount (BDT) *</label>
              <input
                type="number"
                formControlName="requested_amount_bdt"
                placeholder="4500000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-blue-600"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Current Available Headroom (BDT) *</label>
              <input
                type="number"
                formControlName="available_budget_bdt"
                placeholder="18000000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-emerald-600"
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
              [disabled]="checkForm.invalid"
              class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Run Budget Verification
            </button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class PurchaseControlComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  private fb = inject(FormBuilder);

  checks = signal<PurchaseBudgetCheck[]>([]);
  totalCount = signal<number>(0);
  docTypeFilter = '';
  statusFilter = '';
  isModalOpen = false;

  checkForm: FormGroup = this.fb.group({
    project_id: [1],
    document_type: ['PURCHASE_ORDER', Validators.required],
    document_ref: ['', Validators.required],
    vendor_name: [''],
    cost_category: ['Civil construction', Validators.required],
    cost_center: ['Civil Works'],
    requested_amount_bdt: [4500000, [Validators.required, Validators.min(1)]],
    current_budget_bdt: [50000000],
    already_committed_bdt: [12000000],
    available_budget_bdt: [18000000, [Validators.required, Validators.min(0)]]
  });

  ngOnInit() {
    this.loadChecks();
  }

  loadChecks() {
    this.budgetingService.getPurchaseControls({
      document_type: this.docTypeFilter || undefined,
      status_filter: this.statusFilter || undefined
    }).subscribe({
      next: (res) => {
        this.checks.set(res.items);
        this.totalCount.set(res.total);
      }
    });
  }

  onDocTypeFilter(event: any) {
    this.docTypeFilter = event ? String(event.value || event) : '';
    this.loadChecks();
  }

  onStatusFilter(event: any) {
    this.statusFilter = event ? String(event.value || event) : '';
    this.loadChecks();
  }

  openAddModal() {
    this.checkForm.reset({
      project_id: 1,
      document_type: 'PURCHASE_ORDER',
      document_ref: 'PO-2025-' + Math.floor(100 + Math.random() * 900),
      vendor_name: '',
      cost_category: 'Civil construction',
      cost_center: 'Civil Works',
      requested_amount_bdt: 4500000,
      current_budget_bdt: 50000000,
      already_committed_bdt: 12000000,
      available_budget_bdt: 18000000
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  submitCheck() {
    if (this.checkForm.invalid) return;
    this.budgetingService.checkPurchaseBudget(this.checkForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadChecks();
      }
    });
  }
}
