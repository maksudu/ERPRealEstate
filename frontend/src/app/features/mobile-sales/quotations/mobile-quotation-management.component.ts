import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSalesService, MobileQuotationItem } from '../../../core/services/mobile-sales.service';
import { MobileSalesNavComponent } from '../mobile-sales-nav/mobile-sales-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-quotation-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSalesNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-sales-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Sales Quotations & Price Calculations" subtitle="Configure rate per square foot, calculate parking and utility charges, apply discounts and generate instant PDF quotes">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition"
          >
            <span>+</span> Generate Quotation
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by quote #, client, project, unit..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />

            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="OFFERED">Offered</option>
              <option value="ACCEPTED">Accepted by Client</option>
              <option value="REVISED">Revised</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Quotes: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Quotation #</th>
                <th class="p-3">Client Details</th>
                <th class="p-3">Project & Unit</th>
                <th class="p-3">Size & Rate / SqFt</th>
                <th class="p-3">Charges (Park+Util)</th>
                <th class="p-3">Discount</th>
                <th class="p-3">Net Payable (BDT)</th>
                <th class="p-3">Status</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (q of quotations; track q.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {{ q.quotation_no }}
                  </td>
                  <td class="p-3">
                    <div class="font-medium text-slate-900 dark:text-slate-100">{{ q.customer_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ q.customer_phone }}</div>
                  </td>
                  <td class="p-3">
                    <div class="font-medium">{{ q.project_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono font-bold">{{ q.unit_number }}</div>
                  </td>
                  <td class="p-3 font-mono">
                    <div>{{ q.size_sqft | number:'1.0-0' }} SqFt</div>
                    <div class="text-[10px] text-slate-400">৳{{ q.rate_per_sqft | number:'1.0-0' }}/sqft</div>
                  </td>
                  <td class="p-3 font-mono text-[11px]">
                    ৳{{ (q.parking_charge + q.utility_charge) | number:'1.0-0' }}
                  </td>
                  <td class="p-3 font-mono">
                    <span class="text-rose-600 dark:text-rose-400 font-semibold">-৳{{ q.discount_amount | number:'1.0-0' }}</span>
                    <span class="text-[10px] text-slate-400 block">({{ q.discount_percent }}%)</span>
                  </td>
                  <td class="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    ৳{{ q.net_payable | number:'1.0-0' }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400': q.status === 'ACCEPTED',
                        'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-400': q.status === 'OFFERED',
                        'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400': q.status === 'REVISED',
                        'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-400': q.status === 'EXPIRED'
                      }"
                    >
                      {{ q.status }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="printQuotation(q)"
                        class="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                        title="Download / Print PDF"
                      >
                        📄 PDF
                      </button>
                      <button
                        type="button"
                        (click)="openEditModal(q)"
                        class="px-2 py-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteQuotation(q)"
                        class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="p-8 text-center text-slate-400">
                    No quotations generated yet.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="flex items-center justify-between mt-4 text-xs text-slate-500">
          <div>
            Showing {{ Math.min(offset + 1, totalCount) }} to {{ Math.min(offset + limit, totalCount) }} of {{ totalCount }} records
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              (click)="prevPage()"
              [disabled]="offset === 0"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Previous
            </button>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="offset + limit >= totalCount"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Next
            </button>
          </div>
        </div>
      </app-card>

      <!-- Modal Dialog for Add / Edit Quotation -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingQuotationId ? 'Edit Quotation Terms' : 'Generate Formal Quotation & PDF'"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Customer / Buyer Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.customer_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. Engr. Mahfuzur Rahman"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Phone *</label>
              <input
                type="text"
                [(ngModel)]="formData.customer_phone"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="+88017XXXXXXXX"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.project_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="BlueOceans Marina Bay"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Number *</label>
              <input
                type="text"
                [(ngModel)]="formData.unit_number"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold focus:ring-1 focus:ring-teal-500"
                placeholder="A-1402"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Apartment Size (SqFt) *</label>
              <input
                type="number"
                [(ngModel)]="formData.size_sqft"
                (ngModelChange)="recalcPricing()"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="2450"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Rate per SqFt (BDT) *</label>
              <input
                type="number"
                [(ngModel)]="formData.rate_per_sqft"
                (ngModelChange)="recalcPricing()"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="15500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Base Price (BDT)</label>
              <input
                type="number"
                [(ngModel)]="formData.base_price"
                readonly
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono text-xs font-semibold"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Car Parking Charge (BDT)</label>
              <input
                type="number"
                [(ngModel)]="formData.parking_charge"
                (ngModelChange)="recalcPricing()"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="1000000"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Utility Connection Charge (BDT)</label>
              <input
                type="number"
                [(ngModel)]="formData.utility_charge"
                (ngModelChange)="recalcPricing()"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="500000"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Discount (% Rate)</label>
              <input
                type="number"
                [(ngModel)]="formData.discount_percent"
                (ngModelChange)="recalcPricing()"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono text-rose-600 focus:ring-1 focus:ring-teal-500"
                placeholder="2.0"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span class="text-[11px] text-slate-500 block">Calculated Discount Amount</span>
              <span class="text-sm font-bold font-mono text-rose-600">-৳{{ formData.discount_amount | number:'1.0-0' }}</span>
            </div>
            <div>
              <span class="text-[11px] text-slate-500 block">Final Net Payable Contract Value</span>
              <span class="text-base font-bold font-mono text-emerald-600">৳{{ formData.net_payable | number:'1.0-0' }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Quotation Status</label>
              <select
                [(ngModel)]="formData.status"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="OFFERED">Offered to Client</option>
                <option value="ACCEPTED">Accepted by Client</option>
                <option value="REVISED">Revised</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Validity Date</label>
              <input
                type="date"
                [(ngModel)]="formData.validity_date"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              (click)="closeModal()"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="saveQuotation()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
            >
              {{ editingQuotationId ? 'Update Quotation' : 'Create Quotation' }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileQuotationManagementComponent implements OnInit {
  private service = inject(MobileSalesService);
  Math = Math;

  quotations: MobileQuotationItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedStatus = 'ALL';

  isModalOpen = false;
  editingQuotationId: number | null = null;
  formData: Partial<MobileQuotationItem> = {
    customer_name: '',
    customer_phone: '',
    project_name: 'BlueOceans Marina Bay',
    unit_number: 'A-1402',
    size_sqft: 2450,
    rate_per_sqft: 15500,
    base_price: 37975000,
    parking_charge: 1500000,
    utility_charge: 600000,
    discount_percent: 2.0,
    discount_amount: 759500,
    net_payable: 39315500,
    status: 'OFFERED'
  };

  ngOnInit(): void {
    this.loadQuotations();
  }

  loadQuotations(): void {
    this.service.getQuotations({
      search: this.searchQuery,
      status: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.quotations = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load quotations', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadQuotations();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadQuotations();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadQuotations();
    }
  }

  recalcPricing(): void {
    const size = Number(this.formData.size_sqft) || 0;
    const rate = Number(this.formData.rate_per_sqft) || 0;
    const base = size * rate;
    const park = Number(this.formData.parking_charge) || 0;
    const util = Number(this.formData.utility_charge) || 0;
    const discPct = Number(this.formData.discount_percent) || 0;
    const discAmt = (base * discPct) / 100;
    const net = (base + park + util) - discAmt;

    this.formData.base_price = base;
    this.formData.discount_amount = discAmt;
    this.formData.net_payable = net;
  }

  openCreateModal(): void {
    this.editingQuotationId = null;
    this.formData = {
      customer_name: '',
      customer_phone: '',
      project_name: 'BlueOceans Marina Bay',
      unit_number: 'A-1402',
      size_sqft: 2450,
      rate_per_sqft: 15500,
      base_price: 37975000,
      parking_charge: 1500000,
      utility_charge: 600000,
      discount_percent: 2.0,
      discount_amount: 759500,
      net_payable: 39315500,
      status: 'OFFERED'
    };
    this.isModalOpen = true;
  }

  openEditModal(q: MobileQuotationItem): void {
    this.editingQuotationId = q.id;
    this.formData = { ...q };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveQuotation(): void {
    if (!this.formData.customer_name || !this.formData.project_name || !this.formData.unit_number) {
      alert('Please enter Customer Name, Project Name and Unit Number.');
      return;
    }

    this.recalcPricing();

    if (this.editingQuotationId) {
      this.service.updateQuotation(this.editingQuotationId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadQuotations();
        },
        error: (err) => console.error('Failed to update quotation', err)
      });
    } else {
      this.service.createQuotation(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadQuotations();
        },
        error: (err) => console.error('Failed to create quotation', err)
      });
    }
  }

  deleteQuotation(q: MobileQuotationItem): void {
    if (confirm(`Delete quotation ${q.quotation_no} for ${q.customer_name}?`)) {
      this.service.deleteQuotation(q.id).subscribe({
        next: () => this.loadQuotations(),
        error: (err) => console.error('Failed to delete quotation', err)
      });
    }
  }

  printQuotation(q: MobileQuotationItem): void {
    window.print();
  }
}
