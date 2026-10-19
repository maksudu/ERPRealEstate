import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { PaymentRefundAdjustmentItem } from '../../../core/models/installment.model';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-refund-adjustment-list',
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
        title="11. Refund, Payment Reversals & Credit Adjustments"
        subtitle="Manage excess payment refunds, booking cancellation paybacks, receipt adjustments, reversals, and customer credit notes"
        badge="Submodule 11"
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
            Record Refund / Adjustment
          </app-button>
        </div>

        <!-- Filter Bar -->
        <div class="p-3 mb-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Adjustment Type</label>
            <app-searchable-select
              categoryCode="REFUND_ADJUSTMENT_TYPE"
              placeholder="All Types"
              [allowCreateNew]="true"
              [(ngModel)]="selectedType"
              (selectionChange)="applyFilters()"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Status</label>
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

        <!-- Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            <thead class="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Code & Type</th>
                <th class="px-4 py-3 text-left">Customer / Allotment</th>
                <th class="px-4 py-3 text-right">Adjustment Amount (BDT)</th>
                <th class="px-4 py-3 text-left">Payment Mode & Instrument</th>
                <th class="px-4 py-3 text-left">Justification Reason</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              @if (isLoading()) {
                <tr>
                  <td colspan="7" class="text-center py-8 text-slate-500">
                    <div class="inline-flex items-center gap-2">
                      <svg class="animate-spin h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Loading refund & adjustment records...</span>
                    </div>
                  </td>
                </tr>
              } @else if (items().length === 0) {
                <tr>
                  <td colspan="7" class="text-center py-10 text-slate-500">
                    <p class="font-medium">No refund or credit adjustment records found.</p>
                  </td>
                </tr>
              } @else {
                @for (a of items(); track a.id) {
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-900 dark:text-white">{{ a.adjustment_type }}</div>
                      <div class="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{{ a.adjustment_code }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-900 dark:text-white">{{ a.customer_name || 'N/A' }}</div>
                      <div class="text-[11px] text-slate-500">{{ a.booking_reference_no }} • Unit {{ a.unit_number }}</div>
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      ৳{{ a.amount | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{{ a.payment_mode }}</div>
                      <div class="text-[11px] text-slate-500">{{ a.bank_name || 'N/A' }} (Ref: {{ a.cheque_reference || 'N/A' }})</div>
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title="{{ a.reason }}">
                      {{ a.reason }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <app-status-badge
                        [status]="a.status"
                        [labelEn]="a.status"
                        [variant]="a.status === 'PROCESSED' || a.status === 'APPROVED' ? 'success' : (a.status === 'REJECTED' ? 'danger' : 'warning')"
                      />
                    </td>
                    <td class="px-4 py-3 text-right">
                      @if (a.status === 'PENDING') {
                        <button
                          type="button"
                          (click)="processAdjustment(a.id)"
                          class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          Process
                        </button>
                      } @else {
                        <span class="text-[11px] text-slate-400">Settled</span>
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
export class RefundAdjustmentListComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);

  items = signal<PaymentRefundAdjustmentItem[]>([]);
  totalCount = signal<number>(0);
  currentLimit = signal<number>(20);
  currentOffset = signal<number>(0);
  isLoading = signal<boolean>(false);

  selectedType = '';
  selectedStatus = '';
  Math = Math;

  ngOnInit(): void {
    this.loadAdjustments();
  }

  loadAdjustments(): void {
    this.isLoading.set(true);
    this.installmentService.getRefundsAdjustments({
      adjustment_type: this.selectedType || undefined,
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
    this.loadAdjustments();
  }

  resetFilters(): void {
    this.selectedType = '';
    this.selectedStatus = '';
    this.currentOffset.set(0);
    this.loadAdjustments();
  }

  prevPage(): void {
    if (this.currentOffset() > 0) {
      this.currentOffset.set(Math.max(0, this.currentOffset() - this.currentLimit()));
      this.loadAdjustments();
    }
  }

  nextPage(): void {
    if (this.currentOffset() + this.currentLimit() < this.totalCount()) {
      this.currentOffset.set(this.currentOffset() + this.currentLimit());
      this.loadAdjustments();
    }
  }

  processAdjustment(id: number): void {
    if (confirm('Approve and process this refund / credit adjustment?')) {
      this.installmentService.processRefundAdjustment(id, {
        status: 'PROCESSED',
        approved_by: 'Head of Accounts',
        remarks: 'Processed via Bank Transfer'
      }).subscribe({
        next: () => {
          this.loadAdjustments();
        },
        error: (err) => {
          alert('Failed to process adjustment: ' + (err.error?.detail || err.message));
        }
      });
    }
  }

  navigateToCreate(): void {
    this.router.navigate(['/installments/refund-adjustment/create']);
  }
}
