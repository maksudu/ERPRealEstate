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
import { HrmsStatutoryService, StatutoryAuditDoc } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-audit-doc-list',
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
      title="Compliance & Labour Audit Vault"
      subtitle="Regulatory clearance records for DIFE, Fire Safety, NBR withholding statements and RJSC statutory filings"
      badge="Compliance 13.7"
      paddingClass="p-0"
    >
      <div card-actions class="flex items-center gap-2">
        <app-custom-button
          variant="primary"
          size="sm"
          label="+ Record Compliance Document"
          (btnClick)="goToCreate()"
        ></app-custom-button>
      </div>

      <!-- Filters Strip -->
      <div class="p-4 bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="sm:col-span-1">
          <app-searchable-select
            label="Regulatory Authority"
            [options]="authorityOptions()"
            [value]="selectedAuthority()"
            placeholder="Filter by authority..."
            (selectionChange)="onAuthorityChange($event)"
          ></app-searchable-select>
        </div>
        <div class="sm:col-span-1">
          <app-searchable-select
            label="Document Status"
            [options]="statusOptions"
            [value]="selectedStatus()"
            placeholder="Filter by status..."
            (selectionChange)="onStatusChange($event)"
          ></app-searchable-select>
        </div>
        <div class="sm:col-span-2 flex items-end">
          <div class="w-full">
            <app-custom-input
              placeholder="Search by title, reference number, document type..."
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
              <th class="px-4 py-3">Doc Code</th>
              <th class="px-4 py-3">Statutory Clearance Title</th>
              <th class="px-4 py-3">Regulatory Body</th>
              <th class="px-4 py-3">Reference / License No</th>
              <th class="px-4 py-3">Validity Period</th>
              <th class="px-4 py-3">Audit Rating</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @if (loading()) {
              <tr>
                <td colspan="8" class="text-center py-8 text-slate-500">Loading audit documents...</td>
              </tr>
            } @else if (items().length === 0) {
              <tr>
                <td colspan="8" class="text-center py-8 text-slate-500">No audit documents found.</td>
              </tr>
            } @else {
              @for (item of items(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-bold text-teal-600 dark:text-teal-400">{{ item.audit_code }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.document_type }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                      {{ item.regulatory_authority }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{{ item.reference_number }}</td>
                  <td class="px-4 py-3">
                    <div>From {{ item.issue_date }}</div>
                    @if (item.expiry_date) {
                      <div class="text-[10px] text-slate-400">To {{ item.expiry_date }}</div>
                    } @else {
                      <div class="text-[10px] text-emerald-600">Perpetual</div>
                    }
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                      {{ item.compliance_rating }}
                    </span>
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
        <div>Total: {{ total() }} documents</div>
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
export class AuditDocListComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);

  items = signal<StatutoryAuditDoc[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  limit = signal<number>(50);
  offset = signal<number>(0);

  selectedAuthority = signal<string>('ALL');
  selectedStatus = signal<string>('ALL');
  searchQuery = '';

  authorityOptions = signal<SelectOption[]>([
    { value: 'ALL', label: 'All Authorities' },
    { value: 'DIFE', label: 'Dept of Inspection for Factories (DIFE)' },
    { value: 'NBR', label: 'National Board of Revenue (NBR)' },
    { value: 'RJSC', label: 'Registrar of Joint Stock Companies (RJSC)' },
    { value: 'FIRE_SERVICE', label: 'Fire Service & Civil Defence' },
    { value: 'RAJUK', label: 'Rajdhani Unnayan Kartripakkha (RAJUK)' },
    { value: 'CITY_CORP', label: 'City Corporation' }
  ]);

  statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'VALID', label: 'Valid & In Effect' },
    { value: 'RENEWAL_DUE', label: 'Renewal Due' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'UNDER_INSPECTION', label: 'Under Inspection' }
  ];

  currentPage = () => Math.floor(this.offset() / this.limit()) + 1;
  totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.service.getAuditDocuments({
      authority: this.selectedAuthority(),
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

  onAuthorityChange(val: string): void {
    this.selectedAuthority.set(val);
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
    this.router.navigate(['/hrms/statutory/audit-documents/create']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/hrms/statutory/audit-documents', id, 'edit']);
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this compliance document?')) {
      this.service.deleteAuditDocument(id).subscribe(() => this.loadData());
    }
  }
}
