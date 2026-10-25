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
import { HrmsStatutoryService, EmploymentContract } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-contract-list',
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
      title="Statutory Employment Contracts & Service Books"
      subtitle="Formal employment agreements under Bangladesh Labour Act 2006 Section 5 with probation & notice clauses"
      badge="Compliance 13.5"
      paddingClass="p-0"
    >
      <div card-actions class="flex items-center gap-2">
        <app-custom-button
          variant="primary"
          size="sm"
          label="+ New Employment Contract"
          (btnClick)="goToCreate()"
        ></app-custom-button>
      </div>

      <!-- Filters Strip -->
      <div class="p-4 bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="sm:col-span-1">
          <app-searchable-select
            label="Contract Type"
            [options]="contractTypeOptions()"
            [value]="selectedType()"
            placeholder="Filter by contract type..."
            (selectionChange)="onTypeChange($event)"
          ></app-searchable-select>
        </div>
        <div class="sm:col-span-1">
          <app-searchable-select
            label="Contract Status"
            [options]="statusOptions"
            [value]="selectedStatus()"
            placeholder="Filter by status..."
            (selectionChange)="onStatusChange($event)"
          ></app-searchable-select>
        </div>
        <div class="sm:col-span-2 flex items-end">
          <div class="w-full">
            <app-custom-input
              placeholder="Search by employee name, contract code, designation..."
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
              <th class="px-4 py-3">Contract Ref</th>
              <th class="px-4 py-3">Employee & Designation</th>
              <th class="px-4 py-3">Department</th>
              <th class="px-4 py-3">Contract Type</th>
              <th class="px-4 py-3">Start / End Date</th>
              <th class="px-4 py-3">Probation / Notice</th>
              <th class="px-4 py-3">Base Salary</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @if (loading()) {
              <tr>
                <td colspan="9" class="text-center py-8 text-slate-500">Loading employment contracts...</td>
              </tr>
            } @else if (items().length === 0) {
              <tr>
                <td colspan="9" class="text-center py-8 text-slate-500">No employment contracts found.</td>
              </tr>
            } @else {
              @for (item of items(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{{ item.contract_code }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.employee_name }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.designation }}</div>
                  </td>
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ item.department }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {{ item.contract_type }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.start_date }}</div>
                    @if (item.end_date) {
                      <div class="text-[10px] text-slate-400">To {{ item.end_date }}</div>
                    } @else {
                      <div class="text-[10px] text-emerald-600 font-medium">Permanent Tenured</div>
                    }
                  </td>
                  <td class="px-4 py-3 text-slate-600 dark:text-slate-400">
                    <div>{{ item.probation_months }}m probation</div>
                    <div class="text-[10px]">{{ item.notice_period_days }}d notice period</div>
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳ {{ item.base_salary | number:'1.2-2' }}
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
        <div>Total: {{ total() }} contracts</div>
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
export class ContractListComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);

  items = signal<EmploymentContract[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  limit = signal<number>(50);
  offset = signal<number>(0);

  selectedType = signal<string>('ALL');
  selectedStatus = signal<string>('ALL');
  searchQuery = '';

  contractTypeOptions = signal<SelectOption[]>([
    { value: 'ALL', label: 'All Contract Types' },
    { value: 'PERMANENT', label: 'Permanent Employment Contract' },
    { value: 'PROBATION', label: 'Probationary Service Agreement' },
    { value: 'CONTRACTUAL', label: 'Fixed-Term Contractual Appointment' },
    { value: 'PROJECT_BASED', label: 'Project-Specific Construction Contract' },
    { value: 'CONSULTANT', label: 'Professional Retainer / Consultant' }
  ]);

  statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active & In Effect' },
    { value: 'EXPIRED', label: 'Expired Term' },
    { value: 'TERMINATED', label: 'Terminated / Released' },
    { value: 'RENEWED', label: 'Renewed Extension' }
  ];

  currentPage = () => Math.floor(this.offset() / this.limit()) + 1;
  totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.service.getContracts({
      contract_type: this.selectedType(),
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

  onTypeChange(val: string): void {
    this.selectedType.set(val);
    this.offset.set(0);
    this.loadData();
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
    this.router.navigate(['/hrms/statutory/contracts/create']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/hrms/statutory/contracts', id, 'edit']);
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this employment contract?')) {
      this.service.deleteContract(id).subscribe(() => this.loadData());
    }
  }
}
