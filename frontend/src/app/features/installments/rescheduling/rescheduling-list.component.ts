import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { PaymentRescheduleItem } from '../../../core/models/installment.model';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-rescheduling-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    InstallmentsNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    StatusBadgeComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-4">
      <app-installments-nav />

      <app-card-container
        title="08. Payment Rescheduling & Schedule Revision"
        subtitle="Manage customer amortization deferment requests, revised payment plans, cash flow impact assessments, and audit trails"
        badge="Submodule 08"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button
            variant="primary"
            size="sm"
            (btnClick)="navigateToCreate()"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Request Rescheduling
          </app-button>
        </div>

        <!-- Filter Bar -->
        <div class="p-3 mb-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Approval Status</label>
            <app-searchable-select
              categoryCode="APPROVAL_STATUS"
              placeholder="All Statuses"
              [allowCreateNew]="true"
              [(ngModel)]="selectedStatus"
              (selectionChange)="applyFilters()"
            />
          </div>

          <div class="flex items-end gap-2">
            <app-button variant="outline" size="sm" (btnClick)="resetFilters()">
              Reset Filters
            </app-button>
          </div>
        </div>

        <!-- Reschedules Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            <thead class="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Reschedule Code</th>
                <th class="px-4 py-3 text-left">Customer Details</th>
                <th class="px-4 py-3 text-left">Booking & Unit</th>
                <th class="px-4 py-3 text-right">Existing Balance</th>
                <th class="px-4 py-3 text-center">Proposed Plan</th>
                <th class="px-4 py-3 text-center">Deferment</th>
                <th class="px-4 py-3 text-left">Reason</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              @if (isLoading()) {
                <tr>
                  <td colspan="9" class="text-center py-8 text-slate-500">
                    <div class="inline-flex items-center gap-2">
                      <svg class="animate-spin h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Loading reschedule requests...</span>
                    </div>
                  </td>
                </tr>
              } @else if (items().length === 0) {
                <tr>
                  <td colspan="9" class="text-center py-10 text-slate-500">
                    <p class="font-medium">No payment reschedule applications found.</p>
                  </td>
                </tr>
              } @else {
                @for (r of items(); track r.id) {
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {{ r.reschedule_code }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-900 dark:text-white">{{ r.customer_name || 'N/A' }}</div>
                      <div class="text-[11px] text-slate-500">{{ r.customer_phone }}</div>
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{{ r.project_name || 'N/A' }}</div>
                      <div class="text-[11px] text-slate-500">{{ r.booking_reference_no }} • Unit {{ r.unit_number }}</div>
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      ৳{{ r.existing_balance | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {{ r.proposed_installment_count }} installments
                      </span>
                      <div class="text-[10px] text-slate-500 mt-0.5">Start: {{ r.proposed_start_date }}</div>
                    </td>
                    <td class="px-4 py-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                      {{ r.deferment_months }} month(s)
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title="{{ r.reason }}">
                      {{ r.reason }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <app-status-badge
                        [status]="r.status"
                        [labelEn]="r.status"
                        [variant]="r.status === 'APPROVED' ? 'success' : (r.status === 'REJECTED' ? 'danger' : 'warning')"
                      />
                    </td>
                    <td class="px-4 py-3 text-right">
                      @if (r.status === 'PENDING') {
                        <div class="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            (click)="approveReschedule(r.id, 'APPROVED')"
                            class="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            (click)="approveReschedule(r.id, 'REJECTED')"
                            class="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      } @else {
                        <span class="text-[11px] text-slate-400">
                          {{ r.approved_by || 'Decision Logged' }}
                        </span>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Paging Controls -->
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing <span class="font-semibold text-slate-900 dark:text-slate-100">{{ currentOffset() + 1 }}</span> to
            <span class="font-semibold text-slate-900 dark:text-slate-100">{{ Math.min(currentOffset() + currentLimit(), totalCount()) }}</span> of
            <span class="font-semibold text-slate-900 dark:text-slate-100">{{ totalCount() }}</span> requests
          </div>
          <div class="flex items-center gap-2">
            <button
              [disabled]="currentOffset() === 0"
              (click)="prevPage()"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              [disabled]="currentOffset() + currentLimit() >= totalCount()"
              (click)="nextPage()"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </app-card-container>
    </div>
  `
})
export class ReschedulingListComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);

  items = signal<PaymentRescheduleItem[]>([]);
  totalCount = signal<number>(0);
  currentLimit = signal<number>(20);
  currentOffset = signal<number>(0);
  isLoading = signal<boolean>(false);

  selectedStatus = '';
  Math = Math;

  ngOnInit(): void {
    this.loadReschedules();
  }

  loadReschedules(): void {
    this.isLoading.set(true);
    this.installmentService.getRescheduleRequests({
      status: this.selectedStatus || undefined,
      limit: this.currentLimit(),
      offset: this.currentOffset()
    }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.totalCount.set(res.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    this.currentOffset.set(0);
    this.loadReschedules();
  }

  resetFilters(): void {
    this.selectedStatus = '';
    this.currentOffset.set(0);
    this.loadReschedules();
  }

  prevPage(): void {
    if (this.currentOffset() > 0) {
      this.currentOffset.set(Math.max(0, this.currentOffset() - this.currentLimit()));
      this.loadReschedules();
    }
  }

  nextPage(): void {
    if (this.currentOffset() + this.currentLimit() < this.totalCount()) {
      this.currentOffset.set(this.currentOffset() + this.currentLimit());
      this.loadReschedules();
    }
  }

  approveReschedule(id: number, decision: 'APPROVED' | 'REJECTED'): void {
    const notes = prompt(`Enter ${decision} notes for this rescheduling request:`);
    this.installmentService.approveRescheduleRequest(id, {
      status: decision,
      approved_by: 'Managing Director & Head of Credit',
      approval_notes: notes || undefined
    }).subscribe({
      next: () => {
        alert(`Rescheduling ${decision}! Installment schedule versions have been recalculated.`);
        this.loadReschedules();
      },
      error: (err) => {
        alert('Failed to process rescheduling: ' + (err.error?.detail || err.message));
      }
    });
  }

  navigateToCreate(): void {
    this.router.navigate(['/installments/rescheduling/create']);
  }
}
