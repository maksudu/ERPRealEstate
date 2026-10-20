import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BudgetingService, ExpenseControl } from '../../../core/services/budgeting.service';
import { BudgetingNavComponent } from '../budgeting-nav/budgeting-nav.component';
import { CardContainerComponent, SearchableSelectComponent, ModalComponent } from '../../../shared/components';

@Component({
  selector: 'app-expense-control',
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
      <app-budgeting-nav activeCode="8.0"></app-budgeting-nav>

      <app-card-container
        title="8.0 Construction Expense & Contractor Billing Control"
        subtitle="Track running account (RA) contractor bills, certified amounts, retention, statutory tax/VAT withholding and settlement"
        badge="Billings & Settlements"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Record Contractor Bill</span>
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="loadExpenses()"
              placeholder="Search by Contractor, Bill # or Expense Ref..."
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <app-searchable-select
              placeholder="All Payment Statuses..."
              categoryCode="PAYMENT_STATUS"
              [allowCreateNew]="true"
              (selectionChange)="onStatusFilter($event)"
            ></app-searchable-select>
          </div>
          <div>
            <button
              (click)="loadExpenses()"
              class="w-full py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
            >
              Filter Expenses
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3">Expense Ref & Bill #</th>
                <th class="px-4 py-3">Contractor / Vendor</th>
                <th class="px-4 py-3">Category</th>
                <th class="px-4 py-3">Bill Amount</th>
                <th class="px-4 py-3">Certified Amount</th>
                <th class="px-4 py-3">Tax/VAT & Retention</th>
                <th class="px-4 py-3">Net Payable</th>
                <th class="px-4 py-3">Paid Amount</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (exp of expenses(); track exp.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3">
                    <span class="font-bold text-slate-900 dark:text-slate-100">{{ exp.expense_ref }}</span>
                    <span class="block text-[10px] text-slate-400 font-mono">{{ exp.bill_number || 'RA-BILL' }}</span>
                  </td>
                  <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                    {{ exp.party_name }}
                    <span class="block text-[10px] text-slate-400 font-normal">{{ exp.party_type }}</span>
                  </td>
                  <td class="px-4 py-3">{{ exp.cost_category }}</td>
                  <td class="px-4 py-3 font-mono font-medium">
                    ৳{{ exp.bill_amount_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ exp.certified_amount_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 text-[10px] font-mono text-slate-500">
                    <div>Tax/VAT: ৳{{ exp.tax_vat_deducted_bdt | number:'1.0-0' }}</div>
                    <div>Ret: ৳{{ exp.retention_amount_bdt | number:'1.0-0' }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{{ exp.net_payable_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                    ৳{{ exp.paid_amount_bdt | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300': exp.payment_status === 'PAID',
                        'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300': exp.payment_status === 'PARTIAL',
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300': exp.payment_status === 'PENDING'
                      }"
                    >
                      {{ exp.payment_status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      (click)="deleteExpense(exp.id)"
                      class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                      title="Delete Record"
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

      <!-- Add Expense Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Record Contractor Bill & Certified Expenditure"
        subtitle="Enter RA bill values with automated retention and Bangladesh statutory tax/VAT deduction calculation"
        (closeModal)="closeModal()"
      >
        <form [formGroup]="expenseForm" (ngSubmit)="saveExpense()" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Contractor / Vendor Name *</label>
              <input
                type="text"
                formControlName="party_name"
                placeholder="Spectra Engineering & Construction Ltd"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Bill Reference # *</label>
              <input
                type="text"
                formControlName="bill_number"
                placeholder="RA-BILL-09"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                label="Cost Category *"
                placeholder="Civil construction"
                categoryCode="COST_CATEGORY"
                [allowCreateNew]="true"
                (selectionChange)="expenseForm.patchValue({ cost_category: $event })"
              ></app-searchable-select>
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Claimed Bill Amount (BDT) *</label>
              <input
                type="number"
                formControlName="bill_amount_bdt"
                (input)="calculateDeductions()"
                placeholder="3500000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Certified Amount (BDT) *</label>
              <input
                type="number"
                formControlName="certified_amount_bdt"
                (input)="calculateDeductions()"
                placeholder="3350000"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tax/VAT Withholding (BDT)</label>
              <input
                type="number"
                formControlName="tax_vat_deducted_bdt"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-amber-600"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Retention Money (5%)</label>
              <input
                type="number"
                formControlName="retention_amount_bdt"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-amber-600"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Paid Amount (BDT)</label>
              <input
                type="number"
                formControlName="paid_amount_bdt"
                placeholder="0"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-blue-600"
              />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Payment Voucher Ref</label>
              <input
                type="text"
                formControlName="voucher_ref"
                placeholder="BPV-2025-5022"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
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
              [disabled]="expenseForm.invalid"
              class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Save Contractor Bill
            </button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class ExpenseControlComponent implements OnInit {
  private budgetingService = inject(BudgetingService);
  private fb = inject(FormBuilder);

  expenses = signal<ExpenseControl[]>([]);
  totalCount = signal<number>(0);
  searchQuery = '';
  statusFilter = '';
  isModalOpen = false;

  expenseForm: FormGroup = this.fb.group({
    project_id: [1],
    tower_name: ['Tower A'],
    cost_category: ['Civil construction', Validators.required],
    party_type: ['CONTRACTOR'],
    party_name: ['', Validators.required],
    bill_number: ['', Validators.required],
    bill_amount_bdt: [3500000, [Validators.required, Validators.min(1)]],
    certified_amount_bdt: [3350000, [Validators.required, Validators.min(1)]],
    tax_vat_deducted_bdt: [251250],
    retention_amount_bdt: [167500],
    paid_amount_bdt: [0],
    voucher_ref: ['']
  });

  ngOnInit() {
    this.loadExpenses();
  }

  calculateDeductions() {
    const cert = Number(this.expenseForm.get('certified_amount_bdt')?.value || 0);
    // Typical BD tax/vat 7.5% and 5% retention
    const taxVat = Math.round(cert * 0.075);
    const retention = Math.round(cert * 0.05);
    this.expenseForm.patchValue({
      tax_vat_deducted_bdt: taxVat,
      retention_amount_bdt: retention
    }, { emitEvent: false });
  }

  loadExpenses() {
    this.budgetingService.getExpenseControls({
      search: this.searchQuery || undefined,
      payment_status: this.statusFilter || undefined
    }).subscribe({
      next: (res) => {
        this.expenses.set(res.items);
        this.totalCount.set(res.total);
      }
    });
  }

  onStatusFilter(event: any) {
    this.statusFilter = event ? String(event.value || event) : '';
    this.loadExpenses();
  }

  openAddModal() {
    this.expenseForm.reset({
      project_id: 1,
      tower_name: 'Tower A',
      cost_category: 'Civil construction',
      party_type: 'CONTRACTOR',
      party_name: '',
      bill_number: 'RA-BILL-' + Math.floor(10 + Math.random() * 90),
      bill_amount_bdt: 3500000,
      certified_amount_bdt: 3350000,
      tax_vat_deducted_bdt: 251250,
      retention_amount_bdt: 167500,
      paid_amount_bdt: 0,
      voucher_ref: ''
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveExpense() {
    if (this.expenseForm.invalid) return;
    this.budgetingService.createExpenseControl(this.expenseForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadExpenses();
      }
    });
  }

  deleteExpense(id: number) {
    if (confirm('Delete this expense billing record?')) {
      this.budgetingService.deleteExpenseControl(id).subscribe({
        next: () => this.loadExpenses()
      });
    }
  }
}
