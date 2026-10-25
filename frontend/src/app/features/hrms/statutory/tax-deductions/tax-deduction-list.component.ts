import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  StatusBadgeComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../../shared/components';
import { HrmsStatutoryService, TaxDeduction } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-tax-deduction-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    StatusBadgeComponent,
    SearchableSelectComponent
  ],
  template: `
    <app-card-container
      title="Monthly Salary Tax Deduction Records (TDS)"
      subtitle="Section 50 Income Tax Act 2023 payroll withholding, treasury challans and deposit reconciliation"
      badge="Compliance 13.2"
      paddingClass="p-0"
    >
      <div card-actions class="flex items-center gap-2">
        <app-custom-button
          variant="primary"
          size="sm"
          label="+ Record Tax Deduction"
          (btnClick)="goToCreate()"
        ></app-custom-button>
      </div>

      <!-- Filters Strip -->
      <div class="p-4 bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-1">
          <app-searchable-select
            label="Deposit Status"
            [options]="statusOptions()"
            [value]="selectedStatus()"
            placeholder="Filter by status..."
            (selectionChange)="onStatusChange($event)"
          ></app-searchable-select>
        </div>
        <div class="sm:col-span-2 flex items-end">
          <div class="w-full">
            <app-custom-input
              placeholder="Search by employee name, challan number, ref..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
            ></app-custom-input>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
            <tr>
              <th class="px-4 py-3">Deduction Ref</th>
              <th class="px-4 py-3">Employee & Department</th>
              <th class="px-4 py-3">Salary Month</th>
              <th class="px-4 py-3">Taxable Salary</th>
              <th class="px-4 py-3">TDS Amount</th>
              <th class="px-4 py-3">Treasury Challan No</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @if (loading()) {
              <tr>
                <td colspan="8" class="text-center py-8 text-slate-500">Loading tax deduction records...</td>
              </tr>
            } @else if (items().length === 0) {
              <tr>
                <td colspan="8" class="text-center py-8 text-slate-500">No tax deduction records found.</td>
              </tr>
            } @else {
              @for (item of items(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ item.deduction_ref }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.employee_name }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.department }}</div>
                  </td>
                  <td class="px-4 py-3">{{ item.tax_month }} ({{ item.fiscal_year }})</td>
                  <td class="px-4 py-3 font-mono">৳ {{ item.taxable_salary | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳ {{ item.tds_amount | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-mono text-slate-700 dark:text-slate-300">{{ item.challan_number || 'Pending Deposit' }}</div>
                    @if (item.challan_date) {
                      <div class="text-[10px] text-slate-400">{{ item.challan_date }}</div>
                    }
                  </td>
                  <td class="px-4 py-3">
                    <app-status-badge [status]="item.status"></app-status-badge>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        (click)="goToEdit(item.id)"
                        class="px-2.5 py-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteItem(item.id)"
                        class="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div>Total: {{ total() }} records</div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            [disabled]="offset() === 0"
            (click)="prevPage()"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <span>Page {{ currentPage() }} of {{ totalPages() }}</span>
          <button
            type="button"
            [disabled]="offset() + limit() >= total()"
            (click)="nextPage()"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>
    </app-card-container>
  `
})
export class TaxDeductionListComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);

  items = signal<TaxDeduction[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  limit = signal<number>(50);
  offset = signal<number>(0);

  selectedStatus = signal<string>('ALL');
  searchQuery = '';

  statusOptions = signal<SelectOption[]>([
    { value: 'ALL', label: 'All Statuses' },
    { value: 'DEPOSITED', label: 'Challan Deposited' },
    { value: 'PENDING', label: 'Pending Deposit' },
    { value: 'RECONCILED', label: 'Reconciled & Filed' }
  ]);

  currentPage = () => Math.floor(this.offset() / this.limit()) + 1;
  totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.service.getTaxDeductions({
      status: this.selectedStatus(),
      search: this.searchQuery || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: res => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onStatusChange(val: string): void {
    this.selectedStatus.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onSearchChange(): void {
    this.offset.set(0);
    this.loadData();
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.update(v => Math.max(0, v - this.limit()));
      this.loadData();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit() < this.total()) {
      this.offset.update(v => v + this.limit());
      this.loadData();
    }
  }

  goToCreate(): void {
    this.router.navigate(['/hrms/statutory/tax-deductions/create']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/hrms/statutory/tax-deductions', id, 'edit']);
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this TDS deduction record?')) {
      this.service.deleteTaxDeduction(id).subscribe(() => this.loadData());
    }
  }
}
