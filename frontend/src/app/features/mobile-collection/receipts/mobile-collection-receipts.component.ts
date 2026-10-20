import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileCollectionService, CollectionPaymentItem, CollectionReceiptDetail } from '../../../core/services/mobile-collection.service';
import { MobileCollectionNavComponent } from '../mobile-collection-nav/mobile-collection-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-collection-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileCollectionNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-collection-nav activeTab="receipts"></app-mobile-collection-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Receipt Generation & Dispatch</h1>
          <p class="text-sm text-slate-500 mt-1">Official Money Receipts (MR) with QR verification, multi-copy PDF printing & SMS dispatch</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search receipt number, customer, booking ID..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
        </div>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Generated Receipts: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Receipt No.</th>
                <th class="px-6 py-4">Customer</th>
                <th class="px-6 py-4">Booking / Unit</th>
                <th class="px-6 py-4">Amount (BDT)</th>
                <th class="px-6 py-4">Payment Mode</th>
                <th class="px-6 py-4">Date</th>
                <th class="px-6 py-4">Posting Status</th>
                <th class="px-6 py-4 text-right">View & Print</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <span class="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {{ row.receipt_number }}
                  </span>
                </td>
                <td class="px-6 py-4 font-bold text-slate-900">{{ row.customer_name }}</td>
                <td class="px-6 py-4 font-mono text-slate-600">{{ row.booking_number }} • {{ row.unit_number }}</td>
                <td class="px-6 py-4 font-mono font-bold text-emerald-600">
                  ৳ {{ row.amount | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 text-slate-700">{{ row.payment_mode }}</td>
                <td class="px-6 py-4 text-xs font-mono text-slate-500">{{ row.payment_date }}</td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-amber-50 text-amber-700 border-amber-200': row.posting_status === 'PENDING_VERIFICATION',
                    'bg-blue-50 text-blue-700 border-blue-200': row.posting_status === 'VERIFIED',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.posting_status === 'POSTED'
                  }" class="px-2 py-0.5 rounded-full text-xs font-semibold border inline-block">
                    {{ row.posting_status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <button (click)="openReceiptModal(row.id!)" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 transition-colors flex items-center gap-1.5 ml-auto">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    Print Receipt
                  </button>
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">No receipts found</td>
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

      <!-- Printable Receipt Modal -->
      <app-modal [isOpen]="isReceiptModalOpen" title="Official Money Receipt (PDF / Print)" (close)="closeReceiptModal()">
        <div *ngIf="selectedReceipt" class="space-y-6 p-2 text-slate-800">
          <!-- Receipt Header -->
          <div class="text-center border-b pb-4 border-slate-200">
            <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">{{ selectedReceipt.company_name }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ selectedReceipt.company_address }} • Hotline: {{ selectedReceipt.hotline }}</p>
            <div class="inline-block mt-3 px-4 py-1 bg-amber-500 text-white font-bold text-xs uppercase tracking-widest rounded-full">
              Money Receipt (Customer Copy)
            </div>
          </div>

          <!-- Meta Grid -->
          <div class="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span class="text-slate-400">Receipt No:</span>
              <strong class="font-mono text-amber-700 ml-1">{{ selectedReceipt.receipt_number }}</strong>
            </div>
            <div class="text-right">
              <span class="text-slate-400">Date:</span>
              <strong class="ml-1 font-mono">{{ selectedReceipt.payment_date }}</strong>
            </div>
            <div>
              <span class="text-slate-400">Customer Name:</span>
              <strong class="text-slate-900 ml-1">{{ selectedReceipt.customer_name }}</strong>
            </div>
            <div class="text-right">
              <span class="text-slate-400">Contact:</span>
              <strong class="ml-1 font-mono">{{ selectedReceipt.customer_phone }}</strong>
            </div>
            <div>
              <span class="text-slate-400">Project & Unit:</span>
              <strong class="text-slate-900 ml-1">{{ selectedReceipt.project_name }} ({{ selectedReceipt.unit_number }})</strong>
            </div>
            <div class="text-right">
              <span class="text-slate-400">Booking Ref:</span>
              <strong class="ml-1 font-mono">{{ selectedReceipt.booking_number }}</strong>
            </div>
          </div>

          <!-- Amount Box -->
          <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500 font-semibold uppercase">Amount Received:</span>
              <span class="text-xl font-bold font-mono text-emerald-600">৳ {{ selectedReceipt.amount | number:'1.2-2' }}</span>
            </div>
            <div class="text-xs text-slate-600 mt-1 italic">
              In Words: {{ selectedReceipt.amount_in_words }}
            </div>
            <div class="text-xs text-slate-500 mt-2">
              Payment Instrument: <strong class="text-slate-700">{{ selectedReceipt.payment_mode }}</strong>
              <span *ngIf="selectedReceipt.cheque_number"> | Cheque: {{ selectedReceipt.cheque_number }} ({{ selectedReceipt.bank_name }})</span>
              <span *ngIf="selectedReceipt.transaction_ref"> | Ref: {{ selectedReceipt.transaction_ref }}</span>
            </div>
          </div>

          <!-- Signatures & Verification -->
          <div class="pt-6 border-t border-slate-200 flex items-end justify-between text-xs">
            <div>
              <div class="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400 text-center border font-mono">
                [QR Verify]<br>{{ selectedReceipt.qr_verification_code }}
              </div>
            </div>
            <div class="text-center">
              <div class="w-36 border-b border-slate-400 pb-1 font-medium text-slate-700">{{ selectedReceipt.collection_officer }}</div>
              <div class="text-[10px] text-slate-400 mt-1">Collecting Officer</div>
            </div>
            <div class="text-center">
              <div class="w-36 border-b border-slate-400 pb-1 font-medium text-slate-700">Audit / Accounts</div>
              <div class="text-[10px] text-slate-400 mt-1">Authorized Signatory</div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button (click)="closeReceiptModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Close</button>
            <button (click)="printDocument()" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              Print / Save PDF
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileCollectionReceiptsComponent implements OnInit {
  items: CollectionPaymentItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';

  isReceiptModalOpen = false;
  selectedReceipt: CollectionReceiptDetail | null = null;

  constructor(private collectionService: MobileCollectionService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.collectionService.getPayments({
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

  openReceiptModal(id: number) {
    this.collectionService.getReceiptDetails(id).subscribe(data => {
      this.selectedReceipt = data;
      this.isReceiptModalOpen = true;
    });
  }

  closeReceiptModal() {
    this.isReceiptModalOpen = false;
    this.selectedReceipt = null;
  }

  printDocument() {
    window.print();
  }
}
