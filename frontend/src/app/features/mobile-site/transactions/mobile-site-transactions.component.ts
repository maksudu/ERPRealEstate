import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSiteService, MobileSiteMaterialTxItem } from '../../../core/services/mobile-site.service';
import { MobileSiteNavComponent } from '../mobile-site-nav/mobile-site-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-site-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSiteNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-site-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Material Receiving, Site Issue & Stock Movement" subtitle="Track gate-entry received materials with vendor challans, record floor consumption issues and inter-site transfers">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
          >
            <span>+</span> Record Stock Movement
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by transaction #, material, challan, vendor..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />

            <select
              [(ngModel)]="selectedTxType"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Transaction Types</option>
              <option value="RECEIVED">Gate Entry (Received)</option>
              <option value="ISSUED">Site Consumption Issue</option>
              <option value="TRANSFER">Inter-Site Transfer</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Movements: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Tx Code</th>
                <th class="p-3">Movement Type</th>
                <th class="p-3">Material Name</th>
                <th class="p-3">Quantity</th>
                <th class="p-3">Vendor / Recipient Contractor</th>
                <th class="p-3">Challan / Vehicle #</th>
                <th class="p-3">Storekeeper In-Charge</th>
                <th class="p-3">Date</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (tx of transactions; track tx.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {{ tx.tx_code }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400': tx.tx_type === 'RECEIVED',
                        'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-400': tx.tx_type === 'ISSUED',
                        'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-400': tx.tx_type === 'TRANSFER'
                      }"
                    >
                      {{ tx.tx_type }}
                    </span>
                  </td>
                  <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                    {{ tx.material_name }}
                  </td>
                  <td class="p-3 font-mono font-bold">
                    {{ tx.quantity | number:'1.0-2' }} {{ tx.unit }}
                  </td>
                  <td class="p-3">
                    <div class="font-medium">{{ tx.vendor_or_receiver || 'Internal Site Custody' }}</div>
                  </td>
                  <td class="p-3 font-mono text-[11px]">
                    <div>{{ tx.challan_number || 'N/A' }}</div>
                    @if (tx.vehicle_number) {
                      <div class="text-[10px] text-slate-400">{{ tx.vehicle_number }}</div>
                    }
                  </td>
                  <td class="p-3 font-medium">
                    {{ tx.recorded_by }}
                  </td>
                  <td class="p-3 font-mono text-[11px]">
                    {{ tx.created_at | date:'mediumDate' }}
                  </td>
                  <td class="p-3 text-right">
                    <button
                      type="button"
                      (click)="deleteTransaction(tx)"
                      class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="p-8 text-center text-slate-400">
                    No material stock transactions recorded yet.
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

      <!-- Modal Dialog for Add Transaction -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Record Site Material Receiving or Consumption Issue"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Transaction Movement Type *</label>
              <select
                [(ngModel)]="formData.tx_type"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="RECEIVED">Gate Entry / Material Received from Supplier</option>
                <option value="ISSUED">Material Issue for On-site Floor Work</option>
                <option value="TRANSFER">Inter-Site Yard Transfer</option>
              </select>
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.project_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="BlueOceans Marina Bay"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2">
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Material Description *</label>
              <input
                type="text"
                [(ngModel)]="formData.material_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="e.g. Seven Rings PCC Cement or BSRM 16mm Rebar"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity *</label>
              <input
                type="number"
                [(ngModel)]="formData.quantity"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-amber-500"
                placeholder="500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unit</label>
              <select
                [(ngModel)]="formData.unit"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="Bags">Bags</option>
                <option value="Tons">Tons</option>
                <option value="Cft">Cft</option>
                <option value="Pcs">Pcs</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor / Receiving Contractor</label>
              <input
                type="text"
                [(ngModel)]="formData.vendor_or_receiver"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="Seven Rings Cement Ltd. / M/S Kashem Builders"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Delivery Challan Number</label>
              <input
                type="text"
                [(ngModel)]="formData.challan_number"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-amber-500"
                placeholder="CH-88219"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Transport Vehicle Number</label>
              <input
                type="text"
                [(ngModel)]="formData.vehicle_number"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-amber-500"
                placeholder="Dhaka Metro-Ta 11-4521"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Storekeeper Recorded By</label>
              <input
                type="text"
                [(ngModel)]="formData.recorded_by"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="Storekeeper Faruk"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Verification Remarks / Notes</label>
            <textarea
              [(ngModel)]="formData.remarks"
              rows="2"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
              placeholder="Physical bag count verified, bags in good condition..."
            ></textarea>
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
              (click)="saveTransaction()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs"
            >
              Post Transaction
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileSiteTransactionsComponent implements OnInit {
  private service = inject(MobileSiteService);
  Math = Math;

  transactions: MobileSiteMaterialTxItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedTxType = 'ALL';

  isModalOpen = false;
  formData: Partial<MobileSiteMaterialTxItem> = {
    tx_type: 'RECEIVED',
    project_name: 'BlueOceans Marina Bay',
    material_name: '',
    quantity: 500,
    unit: 'Bags',
    vendor_or_receiver: 'Seven Rings Cement Ltd.',
    challan_number: '',
    vehicle_number: '',
    recorded_by: 'Storekeeper Faruk',
    remarks: ''
  };

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.service.getTransactions({
      search: this.searchQuery,
      tx_type: this.selectedTxType,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.transactions = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load transactions', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadTransactions();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadTransactions();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadTransactions();
    }
  }

  openCreateModal(): void {
    this.formData = {
      tx_type: 'RECEIVED',
      project_name: 'BlueOceans Marina Bay',
      material_name: '',
      quantity: 500,
      unit: 'Bags',
      vendor_or_receiver: 'Seven Rings Cement Ltd.',
      challan_number: '',
      vehicle_number: '',
      recorded_by: 'Storekeeper Faruk',
      remarks: ''
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveTransaction(): void {
    if (!this.formData.material_name || !this.formData.quantity) {
      alert('Please enter Material Name and Quantity.');
      return;
    }

    this.service.createTransaction(this.formData).subscribe({
      next: () => {
        this.closeModal();
        this.loadTransactions();
      },
      error: (err) => console.error('Failed to post transaction', err)
    });
  }

  deleteTransaction(tx: MobileSiteMaterialTxItem): void {
    if (confirm(`Remove transaction ${tx.tx_code} (${tx.material_name})?`)) {
      this.service.deleteTransaction(tx.id).subscribe({
        next: () => this.loadTransactions(),
        error: (err) => console.error('Failed to delete transaction', err)
      });
    }
  }
}
