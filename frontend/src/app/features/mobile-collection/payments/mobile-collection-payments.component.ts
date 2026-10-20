import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MobileCollectionService, CollectionPaymentItem } from '../../../core/services/mobile-collection.service';
import { MobileCollectionNavComponent } from '../mobile-collection-nav/mobile-collection-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-collection-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MobileCollectionNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-collection-nav activeTab="payments"></app-mobile-collection-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Payment Entry & Money Receipts</h1>
          <p class="text-sm text-slate-500 mt-1">Record on-the-spot collections with dual maker-checker audit and posting controls</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Record New Payment
        </button>
      </div>

      <!-- Financial Control Notice -->
      <div class="w-full bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <div class="text-xs text-amber-900 leading-relaxed">
          <strong>Financial Control Policy:</strong> All collections entered by field officers default to <span class="font-bold underline">PENDING_VERIFICATION</span>. Payments are not automatically bank-confirmed or posted to general ledger until bank clearance or cash desk reconciliation.
        </div>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search receipt MR#, customer, cheque, ref..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
        </div>
        <select [(ngModel)]="statusFilter" (change)="onStatusChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All Posting Statuses</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="VERIFIED">Verified (Bank Clearing)</option>
          <option value="POSTED">Posted (Accounts Confirmed)</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select [(ngModel)]="modeFilter" (change)="onModeChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All Payment Modes</option>
          <option value="Cash">Cash</option>
          <option value="Cheque">Cheque</option>
          <option value="Bank Transfer">Bank Transfer (BEFTN/RTGS/NPSB)</option>
          <option value="Digital Payment">Digital (bKash/Nagad/Cards)</option>
        </select>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Total: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Receipt No.</th>
                <th class="px-6 py-4">Customer / Booking</th>
                <th class="px-6 py-4">Amount (BDT)</th>
                <th class="px-6 py-4">Mode & Instrument</th>
                <th class="px-6 py-4">Payment Date</th>
                <th class="px-6 py-4">Collector</th>
                <th class="px-6 py-4">Posting Status</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <span class="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {{ row.receipt_number }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.customer_name }}</div>
                  <div class="text-xs text-slate-400 font-mono">{{ row.booking_number }} • {{ row.unit_number }}</div>
                </td>
                <td class="px-6 py-4 font-mono font-bold text-emerald-600 text-base">
                  ৳ {{ row.amount | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4">
                  <span class="font-semibold text-slate-800">{{ row.payment_mode }}</span>
                  <div *ngIf="row.cheque_number" class="text-xs text-slate-400 font-mono">Chq: {{ row.cheque_number }} ({{ row.bank_name }})</div>
                  <div *ngIf="row.transaction_ref" class="text-xs text-slate-400 font-mono">Ref: {{ row.transaction_ref }}</div>
                </td>
                <td class="px-6 py-4 text-xs font-mono text-slate-500">{{ row.payment_date }}</td>
                <td class="px-6 py-4 text-xs text-slate-600">{{ row.collection_officer }}</td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-amber-50 text-amber-700 border-amber-200': row.posting_status === 'PENDING_VERIFICATION',
                    'bg-blue-50 text-blue-700 border-blue-200': row.posting_status === 'VERIFIED',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.posting_status === 'POSTED',
                    'bg-rose-50 text-rose-700 border-rose-200': row.posting_status === 'REJECTED'
                  }" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.posting_status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-2">
                    <button (click)="openEditModal(row)" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit/Verify">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button (click)="deleteItem(row.id!)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">No payment receipts recorded</td>
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
      <app-modal [isOpen]="isModalOpen" [title]="editingId ? 'Audit / Verify Payment Entry' : 'Record New On-the-spot Payment'" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
              <input type="text" [(ngModel)]="formData.customer_name" name="customer_name" required placeholder="e.g. Dr. Kabir Hossain" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Customer Phone *</label>
              <input type="text" [(ngModel)]="formData.customer_phone" name="customer_phone" required placeholder="e.g. +880 1711-234567" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
              <input type="text" [(ngModel)]="formData.project_name" name="project_name" required placeholder="e.g. BlueOceans Marina Bay" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Unit Number *</label>
              <input type="text" [(ngModel)]="formData.unit_number" name="unit_number" required placeholder="e.g. A-502" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Booking Number *</label>
              <input type="text" [(ngModel)]="formData.booking_number" name="booking_number" required placeholder="e.g. BOK-2026-0042" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (BDT) *</label>
              <input type="number" [(ngModel)]="formData.amount" name="amount" required placeholder="e.g. 500000" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Payment Mode *</label>
              <select [(ngModel)]="formData.payment_mode" name="payment_mode" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer (BEFTN/RTGS/NPSB)</option>
                <option value="Digital Payment">Digital Payment (bKash/Nagad/Cards)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input type="date" [(ngModel)]="formData.payment_date" name="payment_date" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Cheque Number (if cheque)</label>
              <input type="text" [(ngModel)]="formData.cheque_number" name="cheque_number" placeholder="CHQ-XXXXXX" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Drawee Bank Name</label>
              <input type="text" [(ngModel)]="formData.bank_name" name="bank_name" placeholder="Bank name" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Transaction Reference</label>
              <input type="text" [(ngModel)]="formData.transaction_ref" name="transaction_ref" placeholder="EFT/Trx ID" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div *ngIf="editingId">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Verification / Posting Status</label>
              <select [(ngModel)]="formData.posting_status" name="posting_status" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
                <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                <option value="VERIFIED">VERIFIED (Bank Clearing)</option>
                <option value="POSTED">POSTED (Confirmed to GL)</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Verification / Collector Remarks</label>
            <textarea [(ngModel)]="formData.verification_notes" name="verification_notes" rows="2" placeholder="Audit remarks or bank confirmation notes..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl">
              {{ editingId ? 'Update & Post Payment' : 'Save Payment Entry' }}
            </button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileCollectionPaymentsComponent implements OnInit {
  items: CollectionPaymentItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';
  statusFilter = '';
  modeFilter = '';

  isModalOpen = false;
  editingId: number | null = null;
  formData: Partial<CollectionPaymentItem> = {};

  constructor(private collectionService: MobileCollectionService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.collectionService.getPayments({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery,
      posting_status: this.statusFilter,
      payment_mode: this.modeFilter
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

  onModeChange() {
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
      customer_phone: '',
      project_name: 'BlueOceans Marina Bay',
      unit_number: '',
      booking_number: '',
      amount: 0,
      payment_mode: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      collection_officer: 'Engr. Maksudul',
      posting_status: 'PENDING_VERIFICATION'
    };
    this.isModalOpen = true;
  }

  openEditModal(row: CollectionPaymentItem) {
    this.editingId = row.id!;
    this.formData = { ...row };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
  }

  saveItem() {
    if (this.editingId) {
      this.collectionService.updatePayment(this.editingId, this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    } else {
      this.collectionService.createPayment(this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Delete this payment entry?')) {
      this.collectionService.deletePayment(id).subscribe(() => this.loadData());
    }
  }
}
