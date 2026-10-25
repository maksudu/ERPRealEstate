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
import { HrmsStatutoryService, TaxConfiguration } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-tax-config-list',
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
      title="Income Tax Slabs & Configuration"
      subtitle="Progressive salary tax brackets under Bangladesh Income Tax Act 2023 with female/senior thresholds"
      badge="Compliance 13.1"
      paddingClass="p-0"
    >
      <div card-actions class="flex items-center gap-2">
        <app-custom-button
          variant="primary"
          size="sm"
          label="+ Add New Tax Slab"
          (btnClick)="goToCreate()"
        ></app-custom-button>
      </div>

      <!-- Filters Strip -->
      <div class="p-4 bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-1">
          <app-searchable-select
            label="Assessment Year"
            [options]="yearOptions()"
            [value]="selectedYear()"
            [allowCreateNew]="true"
            placeholder="Select assessment year..."
            (selectionChange)="onYearChange($event)"
            (itemCreated)="onNewYearCreated($event)"
          ></app-searchable-select>
        </div>
        <div class="sm:col-span-2 flex items-end">
          <div class="w-full">
            <app-custom-input
              placeholder="Search by slab name, exemption bracket..."
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
              <th class="px-4 py-3">Assessment Year</th>
              <th class="px-4 py-3">Slab Title</th>
              <th class="px-4 py-3">Income Range (BDT)</th>
              <th class="px-4 py-3">Tax Rate</th>
              <th class="px-4 py-3">Gender / Category</th>
              <th class="px-4 py-3">Min Tax</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @if (loading()) {
              <tr>
                <td colspan="8" class="text-center py-8 text-slate-500">Loading tax configuration slabs...</td>
              </tr>
            } @else if (items().length === 0) {
              <tr>
                <td colspan="8" class="text-center py-8 text-slate-500">No tax configuration slabs found.</td>
              </tr>
            } @else {
              @for (item of items(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{{ item.assessment_year }}</td>
                  <td class="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{{ item.slab_name }}</td>
                  <td class="px-4 py-3 font-mono">
                    ৳ {{ item.min_amount | number:'1.2-2' }} –
                    @if (item.max_amount >= 90000000) {
                      Balance
                    } @else {
                      ৳ {{ item.max_amount | number:'1.2-2' }}
                    }
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold"
                          [ngClass]="item.tax_rate_percent === 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'">
                      {{ item.tax_rate_percent }}%
                    </span>
                  </td>
                  <td class="px-4 py-3">{{ item.gender_group }}</td>
                  <td class="px-4 py-3 font-mono">৳ {{ item.min_tax_amount | number:'1.2-2' }}</td>
                  <td class="px-4 py-3">
                    <app-status-badge [status]="item.is_active ? 'ACTIVE' : 'INACTIVE'"></app-status-badge>
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
        <div>Total: {{ total() }} slabs</div>
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
export class TaxConfigListComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);

  items = signal<TaxConfiguration[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  limit = signal<number>(50);
  offset = signal<number>(0);

  selectedYear = signal<string>('2026-2027');
  searchQuery = '';

  yearOptions = signal<SelectOption[]>([
    { value: '', label: 'All Assessment Years' },
    { value: '2025-2026', label: 'Assessment Year 2025-2026' },
    { value: '2026-2027', label: 'Assessment Year 2026-2027' },
    { value: '2027-2028', label: 'Assessment Year 2027-2028' }
  ]);

  currentPage = () => Math.floor(this.offset() / this.limit()) + 1;
  totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.service.getTaxConfigs({
      assessment_year: this.selectedYear() || undefined,
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

  onYearChange(val: string): void {
    this.selectedYear.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onNewYearCreated(newYear: string): void {
    this.yearOptions.update(opts => [...opts, { value: newYear, label: newYear }]);
    this.selectedYear.set(newYear);
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
    this.router.navigate(['/hrms/statutory/tax-config/create']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/hrms/statutory/tax-config', id, 'edit']);
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this tax slab?')) {
      this.service.deleteTaxConfig(id).subscribe(() => this.loadData());
    }
  }
}
