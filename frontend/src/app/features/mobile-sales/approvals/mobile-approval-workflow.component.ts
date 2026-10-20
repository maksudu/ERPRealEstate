import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSalesService, MobileApprovalItem } from '../../../core/services/mobile-sales.service';
import { MobileSalesNavComponent } from '../mobile-sales-nav/mobile-sales-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-approval-workflow',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSalesNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-sales-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Sales Governance & Multi-Tier Approvals" subtitle="Review special price discount concessions, booking allotments and cancellation refunds authorization">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition"
          >
            <span>+</span> Submit Approval Request
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by code, ref #, requester, type..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />

            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Authorized / Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Requests: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Approval Code</th>
                <th class="p-3">Request Category</th>
                <th class="p-3">Reference Record</th>
                <th class="p-3">Requested By</th>
                <th class="p-3">Amount Involved (BDT)</th>
                <th class="p-3">Remarks / Justification</th>
                <th class="p-3">Decision</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (appr of approvals; track appr.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {{ appr.approval_code }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                      [ngClass]="{
                        'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400': appr.request_type === 'DISCOUNT_APPROVAL',
                        'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400': appr.request_type === 'BOOKING_APPROVAL',
                        'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400': appr.request_type === 'CANCELLATION_REQUEST'
                      }"
                    >
                      {{ appr.request_type }}
                    </span>
                  </td>
                  <td class="p-3 font-mono font-medium">
                    {{ appr.reference_code }}
                  </td>
                  <td class="p-3">
                    <div class="font-medium text-slate-900 dark:text-slate-100">{{ appr.requested_by }}</div>
                  </td>
                  <td class="p-3 font-mono font-semibold">
                    ৳{{ appr.amount_involved | number:'1.0-0' }}
                  </td>
                  <td class="p-3 max-w-xs truncate" [title]="appr.remarks || ''">
                    {{ appr.remarks || 'Standard approval flow' }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400': appr.status === 'APPROVED',
                        'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400': appr.status === 'PENDING',
                        'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400': appr.status === 'REJECTED'
                      }"
                    >
                      {{ appr.status }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      @if (appr.status === 'PENDING') {
                        <button
                          type="button"
                          (click)="quickDecision(appr, 'APPROVED')"
                          class="px-2 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          (click)="quickDecision(appr, 'REJECTED')"
                          class="px-2 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                        >
                          Reject
                        </button>
                      }
                      <button
                        type="button"
                        (click)="deleteApproval(appr)"
                        class="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-400">
                    No approval requests found.
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

      <!-- Modal Dialog for Submitting Approval Request -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Submit Maker-Checker Approval Request"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Approval Category *</label>
              <select
                [(ngModel)]="formData.request_type"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="DISCOUNT_APPROVAL">Special Price Discount Concession</option>
                <option value="BOOKING_APPROVAL">Apartment Booking Allotment</option>
                <option value="CANCELLATION_REQUEST">Unit Booking Cancellation & Refund</option>
              </select>
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Reference Code *</label>
              <input
                type="text"
                [(ngModel)]="formData.reference_code"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. QTN-2026-0001 or MOB-BK-2026-0001"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Requested By (Sales Maker) *</label>
              <input
                type="text"
                [(ngModel)]="formData.requested_by"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="Ashraful Alam"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Amount Involved (BDT)</label>
              <input
                type="number"
                [(ngModel)]="formData.amount_involved"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="750000"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Justification & Commercial Rationale *</label>
            <textarea
              [(ngModel)]="formData.remarks"
              rows="3"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
              placeholder="Explain business justification, client background, payment terms or exception basis..."
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
              (click)="saveApproval()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
            >
              Submit Request
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileApprovalWorkflowComponent implements OnInit {
  private service = inject(MobileSalesService);
  Math = Math;

  approvals: MobileApprovalItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedStatus = 'ALL';

  isModalOpen = false;
  formData: Partial<MobileApprovalItem> = {
    request_type: 'DISCOUNT_APPROVAL',
    reference_code: '',
    requested_by: 'Ashraful Alam',
    amount_involved: 500000,
    status: 'PENDING',
    remarks: ''
  };

  ngOnInit(): void {
    this.loadApprovals();
  }

  loadApprovals(): void {
    this.service.getApprovals({
      search: this.searchQuery,
      status: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.approvals = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load approvals', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadApprovals();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadApprovals();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadApprovals();
    }
  }

  openCreateModal(): void {
    this.formData = {
      request_type: 'DISCOUNT_APPROVAL',
      reference_code: '',
      requested_by: 'Ashraful Alam',
      amount_involved: 500000,
      status: 'PENDING',
      remarks: ''
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveApproval(): void {
    if (!this.formData.reference_code || !this.formData.remarks) {
      alert('Please enter Reference Code and Commercial Rationale.');
      return;
    }

    this.service.createApproval(this.formData).subscribe({
      next: () => {
        this.closeModal();
        this.loadApprovals();
      },
      error: (err) => console.error('Failed to submit approval request', err)
    });
  }

  quickDecision(appr: MobileApprovalItem, status: 'APPROVED' | 'REJECTED'): void {
    const reason = prompt(`Enter notes for ${status.toLowerCase()} of ${appr.approval_code}:`, 'Authorized by Management');
    if (reason === null) return;

    this.service.updateApproval(appr.id, {
      status: status,
      remarks: reason,
      approved_by: 'Sales Director'
    }).subscribe({
      next: () => this.loadApprovals(),
      error: (err) => console.error('Failed to update decision', err)
    });
  }

  deleteApproval(appr: MobileApprovalItem): void {
    if (confirm(`Remove approval record ${appr.approval_code}?`)) {
      this.service.deleteApproval(appr.id).subscribe({
        next: () => this.loadApprovals(),
        error: (err) => console.error('Failed to delete approval', err)
      });
    }
  }
}
