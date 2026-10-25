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
import { HrmsStatutoryService, StatutoryRegister } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-register-list',
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
      title="Bangladesh Labour Act Statutory Registers"
      subtitle="Mandatory Form 8 Adult Worker, Form 9 Leave, Form 11 Overtime and Form 15 Fines Inspection Registers"
      badge="Compliance 13.4"
      paddingClass="p-0"
    >
      <div card-actions class="flex items-center gap-2">
        <app-custom-button
          variant="primary"
          size="sm"
          label="+ Add Statutory Register"
          (btnClick)="goToCreate()"
        ></app-custom-button>
      </div>

      <!-- Filters Strip -->
      <div class="p-4 bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-1">
          <app-searchable-select
            label="Register Type"
            [options]="typeOptions()"
            [value]="selectedType()"
            placeholder="Filter by register form..."
            (selectionChange)="onTypeChange($event)"
          ></app-searchable-select>
        </div>
        <div class="sm:col-span-2 flex items-end">
          <div class="w-full">
            <app-custom-input
              placeholder="Search by register code, name, department or site..."
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
              <th class="px-4 py-3">Register Ref</th>
              <th class="px-4 py-3">Statutory Register Name</th>
              <th class="px-4 py-3">Department / Site Scope</th>
              <th class="px-4 py-3">Calendar Year</th>
              <th class="px-4 py-3">Total Entries</th>
              <th class="px-4 py-3">Verified By & Date</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @if (loading()) {
              <tr>
                <td colspan="8" class="text-center py-8 text-slate-500">Loading statutory registers...</td>
              </tr>
            } @else if (items().length === 0) {
              <tr>
                <td colspan="8" class="text-center py-8 text-slate-500">No statutory registers found.</td>
              </tr>
            } @else {
              @for (item of items(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{{ item.register_code }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.register_name }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.register_type }}</div>
                  </td>
                  <td class="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{{ item.department_or_site }}</td>
                  <td class="px-4 py-3">{{ item.calendar_year }}</td>
                  <td class="px-4 py-3 font-mono font-semibold">{{ item.total_entries }} records</td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-900 dark:text-slate-100">{{ item.verified_by }}</div>
                    @if (item.verification_date) {
                      <div class="text-[10px] text-slate-400">{{ item.verification_date }}</div>
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
        <div>Total: {{ total() }} registers</div>
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
export class RegisterListComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);

  items = signal<StatutoryRegister[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  limit = signal<number>(50);
  offset = signal<number>(0);

  selectedType = signal<string>('ALL');
  searchQuery = '';

  typeOptions = signal<SelectOption[]>([
    { value: 'ALL', label: 'All Statutory Forms' },
    { value: 'FORM_8_WORKER', label: 'Form 8: Register of Adult Workers' },
    { value: 'FORM_9_LEAVE', label: 'Form 9: Leave Book & Register' },
    { value: 'FORM_11_OVERTIME', label: 'Form 11: Register of Overtime Work' },
    { value: 'FORM_15_FINE', label: 'Form 15: Register of Fines & Deductions' },
    { value: 'FORM_35_MATERNITY', label: 'Form 35: Maternity Benefit Register' },
    { value: 'FORM_36_ACCIDENT', label: 'Form 36: Notice of Accidents & Injuries' }
  ]);

  currentPage = () => Math.floor(this.offset() / this.limit()) + 1;
  totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.service.getRegisters({
      register_type: this.selectedType(),
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
    this.router.navigate(['/hrms/statutory/registers/create']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/hrms/statutory/registers', id, 'edit']);
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this statutory register?')) {
      this.service.deleteRegister(id).subscribe(() => this.loadData());
    }
  }
}
