import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileCollectionService, CollectionWorkflowItem } from '../../../core/services/mobile-collection.service';
import { MobileCollectionNavComponent } from '../mobile-collection-nav/mobile-collection-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-collection-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileCollectionNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-collection-nav activeTab="approvals"></app-mobile-collection-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Approval Workflow & Waivers</h1>
          <p class="text-sm text-slate-500 mt-1">Maker-checker approval for payment posting, late fee waivers, refunds & MR cancellations</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Submit Waiver / Refund Request
        </button>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search workflow code, customer, booking number..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
        </div>
        <select [(ngModel)]="statusFilter" (change)="onStatusChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Workflow Items: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Request Code</th>
                <th class="px-6 py-4">Request Type</th>
                <th class="px-6 py-4">Customer / Booking</th>
                <th class="px-6 py-4">Amount (BDT)</th>
                <th class="px-6 py-4">Requester</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4">Notes / Justification</th>
                <th class="px-6 py-4 text-right">Maker-Checker Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <span class="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {{ row.workflow_code }}
                  </span>
                </td>
                <td class="px-6 py-4 font-semibold text-slate-800">
                  {{ row.request_type }}
                </td>
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.customer_name }}</div>
                  <div class="text-xs font-mono text-slate-400">{{ row.booking_number }}</div>
                </td>
                <td class="px-6 py-4 font-mono font-bold text-slate-900">
                  ৳ {{ row.requested_amount | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 text-xs text-slate-600">{{ row.requested_by }}</td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-amber-50 text-amber-700 border-amber-200': row.status === 'PENDING',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.status === 'APPROVED',
                    'bg-rose-50 text-rose-700 border-rose-200': row.status === 'REJECTED'
                  }" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{{ row.notes || 'N/A' }}</td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <div *ngIf="row.status === 'PENDING'" class="flex items-center justify-end gap-2">
                    <button (click)="actionItem(row.id!, 'APPROVED')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                      Approve
                    </button>
                    <button (click)="actionItem(row.id!, 'REJECTED')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200">
                      Reject
                    </button>
                  </div>
                  <div *ngIf="row.status !== 'PENDING'" class="text-xs text-slate-400 font-mono text-right">
                    Reviewed by {{ row.approver_name || 'Approver' }}
                  </div>
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">No approval requests pending</td>
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
      <app-modal [isOpen]="isModalOpen" title="Submit Waiver, Refund or Cancellation Request" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Request Type *</label>
              <select [(ngModel)]="formData.request_type" name="request_type" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
                <option value="PAYMENT_VERIFICATION">Payment Verification (Cash Clearance)</option>
                <option value="WAIVER">Late Fee / Interest Waiver</option>
                <option value="REFUND">Refund / Cancellation Payout</option>
                <option value="RECEIPT_CANCELLATION">Money Receipt Cancellation</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
              <input type="text" [(ngModel)]="formData.customer_name" name="customer_name" required placeholder="e.g. Dr. Kabir Hossain" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Booking Number *</label>
              <input type="text" [(ngModel)]="formData.booking_number" name="booking_number" required placeholder="e.g. BOK-2026-0042" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Requested Amount (BDT) *</label>
              <input type="number" [(ngModel)]="formData.requested_amount" name="requested_amount" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Detailed Justification / Remarks *</label>
            <textarea [(ngModel)]="formData.notes" name="notes" rows="3" required placeholder="State business case or approval justification for management..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl">Submit Request</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileCollectionApprovalsComponent implements OnInit {
  items: CollectionWorkflowItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';
  statusFilter = '';

  isModalOpen = false;
  formData: Partial<CollectionWorkflowItem> = {};

  constructor(private collectionService: MobileCollectionService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.collectionService.getWorkflows({
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
    this.formData = {
      request_type: 'PAYMENT_VERIFICATION',
      customer_name: '',
      booking_number: '',
      requested_amount: 0,
      requested_by: 'Engr. Maksudul',
      notes: ''
    };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveItem() {
    this.collectionService.createWorkflowRequest(this.formData).subscribe(() => {
      this.closeModal();
      this.loadData();
    });
  }

  actionItem(id: number, status: string) {
    this.collectionService.actionWorkflow(id, {
      status,
      approver_name: 'Audit Manager',
      notes: `${status} by Credit Head`
    }).subscribe(() => this.loadData());
  }
}
