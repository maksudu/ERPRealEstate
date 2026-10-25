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
import { HrmsStatutoryService, PolicyAcknowledgment } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-policy-list',
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
      title="Corporate HR Policy Acknowledgment & Governance"
      subtitle="Mandatory employee sign-offs for Code of Conduct, Anti-Harassment, OHS Site Safety and Confidentiality"
      badge="Compliance 13.6"
      paddingClass="p-0"
    >
      <div card-actions class="flex items-center gap-2">
        <app-custom-button
          variant="primary"
          size="sm"
          label="+ Define Statutory Policy"
          (btnClick)="goToCreate()"
        ></app-custom-button>
      </div>

      <!-- Filters Strip -->
      <div class="p-4 bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-1">
          <app-searchable-select
            label="Policy Category"
            [options]="categoryOptions()"
            [value]="selectedCategory()"
            placeholder="Filter by category..."
            (selectionChange)="onCategoryChange($event)"
          ></app-searchable-select>
        </div>
        <div class="sm:col-span-2 flex items-end">
          <div class="w-full">
            <app-custom-input
              placeholder="Search by policy title, code, description..."
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
              <th class="px-4 py-3">Policy Code</th>
              <th class="px-4 py-3">Statutory Policy Title</th>
              <th class="px-4 py-3">Category</th>
              <th class="px-4 py-3">Applicable Scope</th>
              <th class="px-4 py-3">Version & Date</th>
              <th class="px-4 py-3">Compliance Sign-off Rate</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @if (loading()) {
              <tr>
                <td colspan="8" class="text-center py-8 text-slate-500">Loading policy records...</td>
              </tr>
            } @else if (items().length === 0) {
              <tr>
                <td colspan="8" class="text-center py-8 text-slate-500">No policy records found.</td>
              </tr>
            } @else {
              @for (item of items(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-bold text-purple-600 dark:text-purple-400">{{ item.policy_code }}</td>
                  <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{{ item.policy_title }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                      {{ item.category }}
                    </span>
                  </td>
                  <td class="px-4 py-3">{{ item.mandatory_for }}</td>
                  <td class="px-4 py-3">
                    <div>v{{ item.version }}</div>
                    <div class="text-[10px] text-slate-400">{{ item.effective_date }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <div class="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          class="bg-emerald-500 h-2 rounded-full"
                          [style.width.%]="calcPercentage(item.acknowledged_count, item.required_signoffs)"
                        ></div>
                      </div>
                      <span class="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {{ calcPercentage(item.acknowledged_count, item.required_signoffs) }}%
                      </span>
                    </div>
                    <div class="text-[10px] text-slate-400 mt-0.5">{{ item.acknowledged_count }} of {{ item.required_signoffs }} Signed</div>
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
        <div>Total: {{ total() }} policies</div>
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
export class PolicyListComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);

  items = signal<PolicyAcknowledgment[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  limit = signal<number>(50);
  offset = signal<number>(0);

  selectedCategory = signal<string>('ALL');
  searchQuery = '';

  categoryOptions = signal<SelectOption[]>([
    { value: 'ALL', label: 'All Policy Categories' },
    { value: 'CONDUCT', label: 'Corporate Code of Conduct' },
    { value: 'SAFETY_OHS', label: 'Occupational Health & Site Safety (OHS)' },
    { value: 'ANTI_HARASSMENT', label: 'Anti-Harassment & Workplace Respect' },
    { value: 'PRIVACY', label: 'Data Privacy & Confidentiality' },
    { value: 'WHISTLEBLOWER', label: 'Whistleblower Protection Policy' }
  ]);

  currentPage = () => Math.floor(this.offset() / this.limit()) + 1;
  totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.service.getPolicies({
      category: this.selectedCategory(),
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

  calcPercentage(ack: number, req: number): number {
    if (!req) return 100;
    return Math.min(100, Math.round((ack / req) * 100));
  }

  onCategoryChange(val: string): void {
    this.selectedCategory.set(val);
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
    this.router.navigate(['/hrms/statutory/policies/create']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/hrms/statutory/policies', id, 'edit']);
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this statutory policy?')) {
      this.service.deletePolicy(id).subscribe(() => this.loadData());
    }
  }
}
