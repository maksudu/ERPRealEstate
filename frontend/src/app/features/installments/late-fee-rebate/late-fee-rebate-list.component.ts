import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { LateFeeWaiverItem } from '../../../core/models/installment.model';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-late-fee-rebate-list',
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
        title="07. Late Fee, Rebate & Waiver Approvals"
        subtitle="Manage overdue late fee calculations, grace periods, early payment discounts, and executive waiver governance"
        badge="Submodule 07"
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
            Submit Waiver Request
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

        <!-- Waivers Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            <thead class="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Waiver Code</th>
                <th class="px-4 py-3 text-left">Customer / Booking</th>
                <th class="px-4 py-3 text-left">Installment Milestone</th>
                <th class="px-4 py-3 text-right">Original Late Fee</th>
                <th class="px-4 py-3 text-right">Waived Amount</th>
                <th class="px-4 py-3 text-right">Adjusted Fee</th>
                <th class="px-4 py-3 text-left">Waiver Reason</th>
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
                      <span>Loading waiver records...</span>
                    </div>
                  </td>
                </tr>
              } @else if (items().length === 0) {
                <tr>
                  <td colspan="9" class="text-center py-10 text-slate-500">
                    <p class="font-medium">No late fee waiver applications found.</p>
                  </td>
                </tr>
              } @else {
                @for (w of items(); track w.id) {
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {{ w.waiver_code }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-900 dark:text-white">{{ w.customer_name || 'N/A' }}</div>
                      <div class="text-[11px] text-slate-500">{{ w.booking_reference_no }} • Unit {{ w.unit_number }}</div>
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {{ w.installment_title || 'Installment #' + w.installment_id }}
                    </td>
                    <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                      ৳{{ w.original_late_fee | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{{ w.waived_amount | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      ৳{{ w.adjusted_late_fee | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title="{{ w.reason }}">
                      {{ w.reason }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <app-status-badge
                        [status]="w.status"
                        [labelEn]="w.status"
                        [variant]="w.status === 'APPROVED' ? 'success' : (w.status === 'REJECTED' ? 'danger' : 'warning')"
                      />
                    </td>
                    <td class="px-4 py-3 text-right">
                      @if (w.status === 'PENDING') {
                        <div class="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            (click)="approveWaiver(w.id, 'APPROVED')"
                            class="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            (click)="approveWaiver(w.id, 'REJECTED')"
                            class="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      } @else {
                        <span class="text-[11px] text-slate-400">
                          {{ w.approved_by || 'Decision Logged' }}
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
            <span class="font-semibold text-slate-900 dark:text-slate-100">{{ totalCount() }}</span> records
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
export class LateFeeRebateListComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);

  items = signal<LateFeeWaiverItem[]>([]);
  totalCount = signal<number>(0);
  currentLimit = signal<number>(20);
  currentOffset = signal<number>(0);
  isLoading = signal<boolean>(false);

  selectedStatus = '';
  Math = Math;

  ngOnInit(): void {
    this.loadWaivers();
  }

  loadWaivers(): void {
    this.isLoading.set(true);
    this.installmentService.getLateFeeWaivers({
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
    this.loadWaivers();
  }

  resetFilters(): void {
    this.selectedStatus = '';
    this.currentOffset.set(0);
    this.loadWaivers();
  }

  prevPage(): void {
    if (this.currentOffset() > 0) {
      this.currentOffset.set(Math.max(0, this.currentOffset() - this.currentLimit()));
      this.loadWaivers();
    }
  }

  nextPage(): void {
    if (this.currentOffset() + this.currentLimit() < this.totalCount()) {
      this.currentOffset.set(this.currentOffset() + this.currentLimit());
      this.loadWaivers();
    }
  }

  approveWaiver(id: number, decision: 'APPROVED' | 'REJECTED'): void {
    const notes = prompt(`Enter ${decision} notes for this waiver request:`);
    this.installmentService.approveLateFeeWaiver(id, {
      status: decision,
      approved_by: 'Finance Director',
      notes: notes || undefined
    }).subscribe({
      next: () => {
        this.loadWaivers();
      },
      error: (err) => {
        alert('Failed to process waiver: ' + (err.error?.detail || err.message));
      }
    });
  }

  navigateToCreate(): void {
    this.router.navigate(['/installments/late-fee-rebate/create']);
  }
}
