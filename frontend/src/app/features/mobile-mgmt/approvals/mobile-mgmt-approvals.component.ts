import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileMgmtService, MgmtApprovalItem } from '../../../core/services/mobile-mgmt.service';
import { MobileMgmtNavComponent } from '../mobile-mgmt-nav/mobile-mgmt-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-mgmt-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileMgmtNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-mgmt-nav activeTab="approvals"></app-mobile-mgmt-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Executive Approval Center</h1>
          <p class="text-sm text-slate-500 mt-1">High-value Purchase Orders, BOQ budget revisions, corporate discounts & payment clearances</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Create Board Agenda Item
        </button>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search approval code, title, project, requester..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
        </div>
        <select [(ngModel)]="categoryFilter" (change)="onCategoryChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900">
          <option value="">All Categories</option>
          <option value="PURCHASE_ORDER">Purchase Orders</option>
          <option value="BUDGET_REVISION">Budget Revisions</option>
          <option value="SPECIAL_DISCOUNT">Special Discounts</option>
          <option value="REFUND">Refunds & Adjustments</option>
          <option value="HIGH_VALUE_PAYMENT">High-Value Payments</option>
        </select>
        <select [(ngModel)]="statusFilter" (change)="onStatusChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900">
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Approvals: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Approval Code</th>
                <th class="px-6 py-4">Title & Description</th>
                <th class="px-6 py-4">Project</th>
                <th class="px-6 py-4">Amount (BDT)</th>
                <th class="px-6 py-4">Priority</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Director Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {{ row.approval_code }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.title }}</div>
                  <div class="text-xs text-slate-400">By: {{ row.requested_by }} ({{ row.request_category }})</div>
                </td>
                <td class="px-6 py-4 font-medium text-slate-800">{{ row.project_name }}</td>
                <td class="px-6 py-4 font-mono font-bold text-slate-900">
                  ৳ {{ row.requested_amount | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-rose-50 text-rose-700 border-rose-200': row.priority === 'URGENT',
                    'bg-amber-50 text-amber-700 border-amber-200': row.priority === 'HIGH',
                    'bg-slate-100 text-slate-700 border-slate-200': row.priority === 'MEDIUM' || row.priority === 'LOW'
                  }" class="px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-block">
                    {{ row.priority }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-amber-50 text-amber-700 border-amber-200': row.status === 'PENDING',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.status === 'APPROVED',
                    'bg-rose-50 text-rose-700 border-rose-200': row.status === 'REJECTED'
                  }" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <div *ngIf="row.status === 'PENDING'" class="flex items-center justify-end gap-2">
                    <button (click)="actionItem(row.id!, 'APPROVED')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm">
                      Approve
                    </button>
                    <button (click)="actionItem(row.id!, 'REJECTED')" class="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm">
                      Reject
                    </button>
                  </div>
                  <div *ngIf="row.status !== 'PENDING'" class="text-xs text-slate-400 font-mono text-right">
                    Resolved
                  </div>
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">No executive approvals found</td>
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
      <app-modal [isOpen]="isModalOpen" title="Submit Executive Board Approval Request" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Request Category *</label>
              <select [(ngModel)]="formData.request_category" name="request_category" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
                <option value="PURCHASE_ORDER">Purchase Order Approval</option>
                <option value="BUDGET_REVISION">BOQ Budget Revision</option>
                <option value="SPECIAL_DISCOUNT">Special Commercial Discount</option>
                <option value="REFUND">Refund or Cancellation Settlement</option>
                <option value="HIGH_VALUE_PAYMENT">High-Value Payment Clearance</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
              <input type="text" [(ngModel)]="formData.project_name" name="project_name" required placeholder="e.g. BlueOceans Marina Bay" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Approval Title *</label>
              <input type="text" [(ngModel)]="formData.title" name="title" required placeholder="e.g. 500 MT BSRM 500W Deformed Steel Bar Procurement" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Requested Amount (BDT) *</label>
              <input type="number" [(ngModel)]="formData.requested_amount" name="requested_amount" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select [(ngModel)]="formData.priority" name="priority" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Requester Designation / Name *</label>
              <input type="text" [(ngModel)]="formData.requested_by" name="requested_by" required placeholder="e.g. Project Director / Procurement Head" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Business Justification / Executive Notes</label>
            <textarea [(ngModel)]="formData.executive_notes" name="executive_notes" rows="3" placeholder="Provide background justification for Board review..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900"></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl">Submit for Review</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileMgmtApprovalsComponent implements OnInit {
  items: MgmtApprovalItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';
  categoryFilter = '';
  statusFilter = '';

  isModalOpen = false;
  formData: Partial<MgmtApprovalItem> = {};

  constructor(private mgmtService: MobileMgmtService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.mgmtService.getApprovals({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery,
      category: this.categoryFilter,
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

  onCategoryChange() {
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
      request_category: 'PURCHASE_ORDER',
      title: '',
      project_name: 'BlueOceans Marina Bay',
      requested_amount: 0,
      requested_by: 'Engr. Maksudul (Project Director)',
      priority: 'HIGH',
      executive_notes: ''
    };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveItem() {
    this.mgmtService.createApproval(this.formData).subscribe(() => {
      this.closeModal();
      this.loadData();
    });
  }

  actionItem(id: number, status: string) {
    this.mgmtService.actionApproval(id, {
      status,
      executive_notes: `${status} by Managing Director`
    }).subscribe(() => this.loadData());
  }
}
