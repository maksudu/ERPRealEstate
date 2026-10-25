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
  ModalComponent,
  SelectOption
} from '../../../../shared/components';
import { HrmsStatutoryService, TaxCertificate } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-tax-certificate-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    StatusBadgeComponent,
    SearchableSelectComponent,
    ModalComponent
  ],
  template: `
    <app-card-container
      title="Employee Tax Deduction Certificates (Form 108)"
      subtitle="Annual salary withholding certificates under Section 102/108 Income Tax Act 2023 with verified e-TIN"
      badge="Compliance 13.3"
      paddingClass="p-0"
    >
      <div card-actions class="flex items-center gap-2">
        <app-custom-button
          variant="primary"
          size="sm"
          label="+ Issue Tax Certificate"
          (btnClick)="goToCreate()"
        ></app-custom-button>
      </div>

      <!-- Filters Strip -->
      <div class="p-4 bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-1">
          <app-searchable-select
            label="Certificate Status"
            [options]="statusOptions()"
            [value]="selectedStatus()"
            placeholder="Filter by status..."
            (selectionChange)="onStatusChange($event)"
          ></app-searchable-select>
        </div>
        <div class="sm:col-span-2 flex items-end">
          <div class="w-full">
            <app-custom-input
              placeholder="Search by employee name, e-TIN, certificate number..."
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
              <th class="px-4 py-3">Certificate No</th>
              <th class="px-4 py-3">Employee Name</th>
              <th class="px-4 py-3">e-TIN Number</th>
              <th class="px-4 py-3">Assessment Year</th>
              <th class="px-4 py-3">Gross Earnings</th>
              <th class="px-4 py-3">Total Tax Deducted</th>
              <th class="px-4 py-3">Issue Date</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @if (loading()) {
              <tr>
                <td colspan="9" class="text-center py-8 text-slate-500">Loading tax certificates...</td>
              </tr>
            } @else if (items().length === 0) {
              <tr>
                <td colspan="9" class="text-center py-8 text-slate-500">No tax certificates found.</td>
              </tr>
            } @else {
              @for (item of items(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">{{ item.certificate_number }}</td>
                  <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{{ item.employee_name }}</td>
                  <td class="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{{ item.etin }}</td>
                  <td class="px-4 py-3">{{ item.assessment_year }}</td>
                  <td class="px-4 py-3 font-mono">৳ {{ item.gross_earnings | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳ {{ item.total_tax_deducted | number:'1.2-2' }}
                  </td>
                  <td class="px-4 py-3">{{ item.issue_date }}</td>
                  <td class="px-4 py-3">
                    <app-status-badge [status]="item.status"></app-status-badge>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        (click)="previewCert(item)"
                        class="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors"
                      >
                        Print Form 108
                      </button>
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
        <div>Total: {{ total() }} certificates</div>
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

    <!-- Certificate Preview Modal -->
    <app-modal
      [isOpen]="showModal()"
      title="National Board of Revenue - Form 108 Certificate Preview"
      (closeModal)="showModal.set(false)"
    >
      @if (activeCert()) {
        <div class="space-y-4 p-2 text-xs">
          <div class="text-center pb-3 border-b border-slate-200 dark:border-slate-700">
            <div class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">National Board of Revenue, Bangladesh</div>
            <div class="text-[11px] text-slate-500">Certificate of Tax Deduction at Source under Section 102/108, Income Tax Act 2023</div>
            <div class="mt-2 font-mono font-bold text-blue-600">Ref: {{ activeCert()?.certificate_number }}</div>
          </div>

          <div class="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <span class="text-slate-400 block">Employee Assessee:</span>
              <span class="font-bold text-slate-900 dark:text-slate-100">{{ activeCert()?.employee_name }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">12-Digit e-TIN:</span>
              <span class="font-mono font-bold text-slate-900 dark:text-slate-100">{{ activeCert()?.etin }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Assessment Year:</span>
              <span>{{ activeCert()?.assessment_year }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Tax Jurisdiction:</span>
              <span>{{ activeCert()?.tax_circle }}, {{ activeCert()?.tax_zone }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Gross Salary Earnings:</span>
              <span class="font-mono font-semibold">৳ {{ activeCert()?.gross_earnings | number:'1.2-2' }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Total TDS Deposited:</span>
              <span class="font-mono font-bold text-emerald-600">৳ {{ activeCert()?.total_tax_deducted | number:'1.2-2' }}</span>
            </div>
          </div>

          <div class="pt-2 text-[11px] text-slate-500 italic">
            Certified that the tax deducted has been remitted directly to the credit of Bangladesh Government Treasury via official Sonali Bank challans.
          </div>

          <div class="flex justify-between items-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <div class="text-[10px] text-slate-400">Date of Issue: {{ activeCert()?.issue_date }}</div>
              <div class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Authorized Officer: {{ activeCert()?.authorized_signatory }}</div>
            </div>
            <app-custom-button
              variant="primary"
              size="sm"
              label="Download Signed PDF"
              (btnClick)="showModal.set(false)"
            ></app-custom-button>
          </div>
        </div>
      }
    </app-modal>
  `
})
export class TaxCertificateListComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);

  items = signal<TaxCertificate[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  limit = signal<number>(50);
  offset = signal<number>(0);

  selectedStatus = signal<string>('ALL');
  searchQuery = '';

  showModal = signal<boolean>(false);
  activeCert = signal<TaxCertificate | null>(null);

  statusOptions = signal<SelectOption[]>([
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ISSUED', label: 'Official Certificate Issued' },
    { value: 'DRAFT', label: 'Draft Pending Verification' },
    { value: 'SUBMITTED', label: 'Submitted with NBR' }
  ]);

  currentPage = () => Math.floor(this.offset() / this.limit()) + 1;
  totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.service.getTaxCertificates({
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

  previewCert(cert: TaxCertificate): void {
    this.activeCert.set(cert);
    this.showModal.set(true);
  }

  goToCreate(): void {
    this.router.navigate(['/hrms/statutory/tax-certificates/create']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/hrms/statutory/tax-certificates', id, 'edit']);
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this tax certificate?')) {
      this.service.deleteTaxCertificate(id).subscribe(() => this.loadData());
    }
  }
}
