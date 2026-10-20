import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileCollectionService, CollectionBankLoanItem } from '../../../core/services/mobile-collection.service';
import { MobileCollectionNavComponent } from '../mobile-collection-nav/mobile-collection-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-collection-loans',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileCollectionNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-collection-nav activeTab="loans"></app-mobile-collection-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Bank Loan Tracking & Disbursements</h1>
          <p class="text-sm text-slate-500 mt-1">Bank sanction limits, multi-tranche disbursements, construction certificates & pending releases</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Record Bank Loan Sanction
        </button>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search bank, customer, booking number..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <select [(ngModel)]="statusFilter" (change)="onStatusChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Disbursement Statuses</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PARTIALLY_DISBURSED">PARTIALLY_DISBURSED</option>
          <option value="FULLY_DISBURSED">FULLY_DISBURSED</option>
          <option value="PENDING">PENDING</option>
        </select>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Total Loans: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Customer / Booking</th>
                <th class="px-6 py-4">Bank Name</th>
                <th class="px-6 py-4">Sanction Amount</th>
                <th class="px-6 py-4">Disbursed (BDT)</th>
                <th class="px-6 py-4">Pending (BDT)</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4">Loan Officer</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.customer_name }}</div>
                  <div class="text-xs font-mono text-slate-400">{{ row.booking_number }} • {{ row.unit_number }}</div>
                </td>
                <td class="px-6 py-4 font-semibold text-slate-800">{{ row.bank_name }}</td>
                <td class="px-6 py-4 font-mono font-medium text-slate-900">
                  ৳ {{ row.sanction_amount | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 font-mono font-bold text-emerald-600">
                  ৳ {{ row.disbursed_amount | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 font-mono font-semibold text-amber-600">
                  ৳ {{ row.pending_disbursement | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-slate-100 text-slate-700 border-slate-200': row.disbursement_status === 'PENDING',
                    'bg-amber-50 text-amber-700 border-amber-200': row.disbursement_status === 'PARTIALLY_DISBURSED',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.disbursement_status === 'FULLY_DISBURSED',
                    'bg-blue-50 text-blue-700 border-blue-200': row.disbursement_status === 'APPROVED'
                  }" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.disbursement_status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600">{{ row.officer_name }}</td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-2">
                    <button (click)="openEditModal(row)" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button (click)="deleteItem(row.id!)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">No bank loan records found</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs text-slate-500">
            Showing {{ offset + 1 }} to {{ getEndIndex() }} of {{ totalCount }} records
          </span>
          <div class="flex items-center gap-2">
            <button [disabled]="offset === 0" (click)="prevPage()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold rounded-lg text-slate-700">Prev</button>
            <button [disabled]="offset + limit >= totalCount" (click)="nextPage()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold rounded-lg text-slate-700">Next</button>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal (NO static add form beneath table) -->
      <app-modal [isOpen]="isModalOpen" [title]="editingId ? 'Edit Bank Loan Record' : 'Record Customer Bank Loan Sanction'" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
              <input type="text" [(ngModel)]="formData.customer_name" name="customer_name" required placeholder="e.g. Dr. Kabir Hossain" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input type="text" [(ngModel)]="formData.phone" name="phone" required placeholder="e.g. +880 1711-234567" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
              <input type="text" [(ngModel)]="formData.project_name" name="project_name" required placeholder="e.g. BlueOceans Marina Bay" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Unit Number *</label>
              <input type="text" [(ngModel)]="formData.unit_number" name="unit_number" required placeholder="e.g. A-502" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Booking Number *</label>
              <input type="text" [(ngModel)]="formData.booking_number" name="booking_number" required placeholder="e.g. BOK-2026-0042" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Financing Bank Name *</label>
              <input type="text" [(ngModel)]="formData.bank_name" name="bank_name" required placeholder="e.g. DBBL Home Loan Division" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Sanction Amount (BDT) *</label>
              <input type="number" [(ngModel)]="formData.sanction_amount" name="sanction_amount" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Disbursed Amount (BDT)</label>
              <input type="number" [(ngModel)]="formData.disbursed_amount" name="disbursed_amount" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Disbursement Status</label>
              <select [(ngModel)]="formData.disbursement_status" name="disbursement_status" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
                <option value="APPROVED">APPROVED</option>
                <option value="PARTIALLY_DISBURSED">PARTIALLY_DISBURSED</option>
                <option value="FULLY_DISBURSED">FULLY_DISBURSED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Loan Desk Officer</label>
              <input type="text" [(ngModel)]="formData.officer_name" name="officer_name" placeholder="Officer name" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Tranche Conditions / Remarks</label>
            <textarea [(ngModel)]="formData.remarks" name="remarks" rows="2" placeholder="Inspection certificate required for release..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">Save Loan Record</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileCollectionLoansComponent implements OnInit {
  items: CollectionBankLoanItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';
  statusFilter = '';

  isModalOpen = false;
  editingId: number | null = null;
  formData: Partial<CollectionBankLoanItem> = {};

  constructor(private collectionService: MobileCollectionService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.collectionService.getBankLoans({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery,
      status: this.statusFilter
    }).subscribe(res => {
      this.items = res.items;
      this.totalCount = res.total;
    });
  }

  onSearchChange() {
    this.offset = 0;
    this.loadData();
  }

  onStatusChange() {
    this.offset = 0;
    this.loadData();
  }

  prevPage() {
    if (this.offset > 0) {
      this.offset = Math.max(0, this.offset - this.limit);
      this.loadData();
    }
  }

  nextPage() {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadData();
    }
  }

  getEndIndex(): number {
    return Math.min(this.offset + this.limit, this.totalCount);
  }

  openAddModal() {
    this.editingId = null;
    this.formData = {
      customer_name: '',
      phone: '',
      project_name: 'BlueOceans Marina Bay',
      unit_number: '',
      booking_number: '',
      bank_name: '',
      sanction_amount: 0,
      disbursed_amount: 0,
      pending_disbursement: 0,
      disbursement_status: 'APPROVED',
      officer_name: 'Loan Desk'
    };
    this.isModalOpen = true;
  }

  openEditModal(row: CollectionBankLoanItem) {
    this.editingId = row.id!;
    this.formData = { ...row };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
  }

  saveItem() {
    if (this.formData.sanction_amount && this.formData.disbursed_amount) {
      this.formData.pending_disbursement = Math.max(0, this.formData.sanction_amount - this.formData.disbursed_amount);
    }
    if (this.editingId) {
      this.collectionService.updateBankLoan(this.editingId, this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    } else {
      this.collectionService.createBankLoan(this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Delete this bank loan record?')) {
      this.collectionService.deleteBankLoan(id).subscribe(() => this.loadData());
    }
  }
}
