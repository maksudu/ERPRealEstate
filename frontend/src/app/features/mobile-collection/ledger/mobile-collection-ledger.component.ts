import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileCollectionService, CollectionLedgerItem } from '../../../core/services/mobile-collection.service';
import { MobileCollectionNavComponent } from '../mobile-collection-nav/mobile-collection-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-collection-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileCollectionNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-collection-nav activeTab="ledger"></app-mobile-collection-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Customer Financial Ledger</h1>
          <p class="text-sm text-slate-500 mt-1">Audit-ready statement of invoices, realized collections, waivers and running balance</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Record Ledger Adjustment
        </button>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search customer, booking ID, description, MR#..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
        </div>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Ledger Entries: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Transaction Date</th>
                <th class="px-6 py-4">Customer / Booking</th>
                <th class="px-6 py-4">Type</th>
                <th class="px-6 py-4">Description / Ref</th>
                <th class="px-6 py-4 text-right">Debit (BDT)</th>
                <th class="px-6 py-4 text-right">Credit (BDT)</th>
                <th class="px-6 py-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4 text-xs font-mono text-slate-500">{{ row.tx_date }}</td>
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.customer_name }}</div>
                  <div class="text-xs font-mono text-slate-400">{{ row.booking_number }}</div>
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-slate-100 text-slate-700 border-slate-200': row.tx_type === 'INVOICE',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.tx_type === 'PAYMENT',
                    'bg-purple-50 text-purple-700 border-purple-200': row.tx_type === 'ADJUSTMENT' || row.tx_type === 'WAIVER'
                  }" class="px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-block">
                    {{ row.tx_type }}
                  </span>
                </td>
                <td class="px-6 py-4 max-w-xs truncate text-slate-700">
                  {{ row.description }}
                  <span *ngIf="row.receipt_ref" class="text-xs text-amber-600 font-mono block">[{{ row.receipt_ref }}]</span>
                </td>
                <td class="px-6 py-4 text-right font-mono font-medium text-slate-900">
                  <span *ngIf="row.debit > 0">৳ {{ row.debit | number:'1.2-2' }}</span>
                  <span *ngIf="row.debit === 0" class="text-slate-300">-</span>
                </td>
                <td class="px-6 py-4 text-right font-mono font-medium text-emerald-600">
                  <span *ngIf="row.credit > 0">৳ {{ row.credit | number:'1.2-2' }}</span>
                  <span *ngIf="row.credit === 0" class="text-slate-300">-</span>
                </td>
                <td class="px-6 py-4 text-right font-mono font-bold text-slate-900">
                  ৳ {{ row.running_balance | number:'1.2-2' }}
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">No ledger transactions found</td>
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

      <!-- Add Modal (NO static add form beneath table) -->
      <app-modal [isOpen]="isModalOpen" title="Record Manual Ledger Entry / Adjustment" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
              <input type="text" [(ngModel)]="formData.customer_name" name="customer_name" required placeholder="e.g. Dr. Kabir Hossain" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Booking Number *</label>
              <input type="text" [(ngModel)]="formData.booking_number" name="booking_number" required placeholder="e.g. BOK-2026-0042" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Transaction Type *</label>
              <select [(ngModel)]="formData.tx_type" name="tx_type" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
                <option value="ADJUSTMENT">ADJUSTMENT</option>
                <option value="WAIVER">LATE FEE WAIVER</option>
                <option value="INVOICE">INVOICE / BILL</option>
                <option value="REFUND">REFUND</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Transaction Date *</label>
              <input type="date" [(ngModel)]="formData.tx_date" name="tx_date" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Debit Amount (BDT)</label>
              <input type="number" [(ngModel)]="formData.debit" name="debit" placeholder="0" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Credit Amount (BDT)</label>
              <input type="number" [(ngModel)]="formData.credit" name="credit" placeholder="0" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Description / Reason *</label>
            <input type="text" [(ngModel)]="formData.description" name="description" required placeholder="e.g. Special management discount on installment #4" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl">Post Entry</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileCollectionLedgerComponent implements OnInit {
  items: CollectionLedgerItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';

  isModalOpen = false;
  formData: Partial<CollectionLedgerItem> = {};

  constructor(private collectionService: MobileCollectionService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.collectionService.getLedger({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery
    }).subscribe(res => {
      this.items = res.items;
      this.totalCount = res.total;
    });
  }

  onSearchChange() {
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
    this.formData = {
      customer_name: '',
      booking_number: '',
      tx_type: 'ADJUSTMENT',
      tx_date: new Date().toISOString().split('T')[0],
      description: '',
      debit: 0,
      credit: 0,
      running_balance: 0
    };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveItem() {
    this.collectionService.createLedgerEntry(this.formData).subscribe(() => {
      this.closeModal();
      this.loadData();
    });
  }
}
