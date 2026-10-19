import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { CustomerInstallment, DueOverdueAgingSummary } from '../../../core/models/installment.model';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-due-overdue-cockpit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    InstallmentsNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="space-y-4">
      <app-installments-nav />

      <app-card-container
        title="06. Due & Overdue Management & Aging Recovery Cockpit"
        subtitle="Track upcoming dues, installments due today, multi-tier aging analysis (1-30, 31-60, 61-90, 90+ days), and automated recovery reminders"
        badge="Submodule 06"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button
            variant="danger"
            size="sm"
            (btnClick)="openBulkAlertModal()"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            Send Overdue Reminders
          </app-button>
        </div>

        <!-- Aging Bucket KPI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <!-- Upcoming -->
          <button
            type="button"
            (click)="selectBucket('UPCOMING')"
            class="text-left p-3 rounded-xl border transition-all"
            [ngClass]="activeBucket === 'UPCOMING' ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/40' : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-850 dark:border-slate-800'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Upcoming Due</span>
            <div class="text-base font-bold text-slate-900 dark:text-white mt-1">৳{{ (summary()?.upcoming_due_amount || 0) | number:'1.0-0' }}</div>
            <div class="text-[10px] text-slate-500">{{ summary()?.upcoming_due_count || 0 }} installments</div>
          </button>

          <!-- Due Today -->
          <button
            type="button"
            (click)="selectBucket('DUE_TODAY')"
            class="text-left p-3 rounded-xl border transition-all"
            [ngClass]="activeBucket === 'DUE_TODAY' ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 dark:bg-amber-950/40' : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-850 dark:border-slate-800'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Due Today</span>
            <div class="text-base font-bold text-slate-900 dark:text-white mt-1">৳{{ (summary()?.due_today_amount || 0) | number:'1.0-0' }}</div>
            <div class="text-[10px] text-slate-500">{{ summary()?.due_today_count || 0 }} installments</div>
          </button>

          <!-- 1-30 Days -->
          <button
            type="button"
            (click)="selectBucket('OVERDUE_1_30')"
            class="text-left p-3 rounded-xl border transition-all"
            [ngClass]="activeBucket === 'OVERDUE_1_30' ? 'bg-orange-50/80 border-orange-500 ring-2 ring-orange-500/20 dark:bg-orange-950/40' : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-850 dark:border-slate-800'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">1-30 Days</span>
            <div class="text-base font-bold text-slate-900 dark:text-white mt-1">৳{{ (summary()?.overdue_1_30_amount || 0) | number:'1.0-0' }}</div>
            <div class="text-[10px] text-slate-500">{{ summary()?.overdue_1_30_count || 0 }} overdue</div>
          </button>

          <!-- 31-60 Days -->
          <button
            type="button"
            (click)="selectBucket('OVERDUE_31_60')"
            class="text-left p-3 rounded-xl border transition-all"
            [ngClass]="activeBucket === 'OVERDUE_31_60' ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 dark:bg-rose-950/40' : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-850 dark:border-slate-800'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">31-60 Days</span>
            <div class="text-base font-bold text-slate-900 dark:text-white mt-1">৳{{ (summary()?.overdue_31_60_amount || 0) | number:'1.0-0' }}</div>
            <div class="text-[10px] text-slate-500">{{ summary()?.overdue_31_60_count || 0 }} overdue</div>
          </button>

          <!-- 61-90 Days -->
          <button
            type="button"
            (click)="selectBucket('OVERDUE_61_90')"
            class="text-left p-3 rounded-xl border transition-all"
            [ngClass]="activeBucket === 'OVERDUE_61_90' ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 dark:bg-purple-950/40' : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-850 dark:border-slate-800'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">61-90 Days</span>
            <div class="text-base font-bold text-slate-900 dark:text-white mt-1">৳{{ (summary()?.overdue_61_90_amount || 0) | number:'1.0-0' }}</div>
            <div class="text-[10px] text-slate-500">{{ summary()?.overdue_61_90_count || 0 }} overdue</div>
          </button>

          <!-- 90+ Days (Legal Action Risk) -->
          <button
            type="button"
            (click)="selectBucket('OVERDUE_90_PLUS')"
            class="text-left p-3 rounded-xl border transition-all"
            [ngClass]="activeBucket === 'OVERDUE_90_PLUS' ? 'bg-red-50/80 border-red-500 ring-2 ring-red-500/20 dark:bg-red-950/40' : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-850 dark:border-slate-800'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">90+ Days (High Risk)</span>
            <div class="text-base font-bold text-red-600 dark:text-red-400 mt-1">৳{{ (summary()?.overdue_90_plus_amount || 0) | number:'1.0-0' }}</div>
            <div class="text-[10px] text-slate-500">{{ summary()?.overdue_90_plus_count || 0 }} critical</div>
          </button>
        </div>

        <!-- Search Bar & Active Filter Display -->
        <div class="p-3 mb-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="relative w-full sm:max-w-xs">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              placeholder="Search customer, booking, installment..."
              class="erp-input text-xs w-full"
            />
          </div>

          <div class="flex items-center gap-2">
            @if (activeBucket) {
              <span class="text-xs text-slate-600 dark:text-slate-400">
                Filtered by: <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ activeBucket }}</span>
              </span>
              <button
                type="button"
                (click)="clearBucket()"
                class="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline ml-1"
              >
                Clear
              </button>
            }
          </div>
        </div>

        <!-- Overdue Installments Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            <thead class="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Installment # & Milestone</th>
                <th class="px-4 py-3 text-left">Customer Details</th>
                <th class="px-4 py-3 text-left">Project & Unit</th>
                <th class="px-4 py-3 text-center">Due Date</th>
                <th class="px-4 py-3 text-right">Payable Amount</th>
                <th class="px-4 py-3 text-right">Paid Amount</th>
                <th class="px-4 py-3 text-right">Balance Due (BDT)</th>
                <th class="px-4 py-3 text-right">Late Surcharge</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              @if (isLoading()) {
                <tr>
                  <td colspan="10" class="text-center py-8 text-slate-500">
                    <div class="inline-flex items-center gap-2">
                      <svg class="animate-spin h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Loading aging analysis...</span>
                    </div>
                  </td>
                </tr>
              } @else if (items().length === 0) {
                <tr>
                  <td colspan="10" class="text-center py-10 text-slate-500">
                    <p class="font-medium">No dues or overdue records found for this criteria.</p>
                  </td>
                </tr>
              } @else {
                @for (inst of items(); track inst.id) {
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-900 dark:text-white">Inst #{{ inst.installment_no }}: {{ inst.title }}</div>
                      <div class="text-[10px] text-slate-500 font-mono">Ref: {{ inst.booking_reference_no }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-900 dark:text-white">{{ inst.customer_name || 'N/A' }}</div>
                      <div class="text-[11px] text-slate-500">{{ inst.customer_phone }}</div>
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{{ inst.project_name || 'N/A' }}</div>
                      <div class="text-[11px] text-slate-500">Unit: {{ inst.unit_number || 'N/A' }}</div>
                    </td>
                    <td class="px-4 py-3 text-center font-medium" [ngClass]="isPastDue(inst.due_date) ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-400'">
                      {{ inst.due_date }}
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      ৳{{ inst.payable_amount | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                      ৳{{ (inst.paid_amount || 0) | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      ৳{{ (inst.payable_amount - (inst.paid_amount || 0)) | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                      ৳{{ (inst.late_fee_accrued || 0) | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <app-status-badge
                        [status]="inst.status"
                        [labelEn]="inst.status"
                        [variant]="inst.status === 'PAID' ? 'success' : (inst.status === 'OVERDUE' ? 'danger' : 'warning')"
                      />
                    </td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="sendSingleAlert(inst)"
                          class="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 text-xs font-semibold"
                          title="Send SMS/WhatsApp Alert"
                        >
                          Remind
                        </button>
                        <button
                          type="button"
                          [routerLink]="['/installments/customer-ledger']"
                          [queryParams]="{ booking_id: inst.booking_id }"
                          class="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 text-xs font-semibold"
                          title="View Ledger"
                        >
                          Ledger
                        </button>
                      </div>
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
            <span class="font-semibold text-slate-900 dark:text-slate-100">{{ totalCount() }}</span> due records
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
export class DueOverdueCockpitComponent implements OnInit {
  private installmentService = inject(InstallmentService);

  items = signal<CustomerInstallment[]>([]);
  summary = signal<DueOverdueAgingSummary | null>(null);
  totalCount = signal<number>(0);
  currentLimit = signal<number>(20);
  currentOffset = signal<number>(0);
  isLoading = signal<boolean>(false);

  searchQuery = '';
  activeBucket = '';
  Math = Math;

  ngOnInit(): void {
    this.loadDues();
  }

  loadDues(): void {
    this.isLoading.set(true);
    this.installmentService.getDueOverdueInstallments({
      bucket: this.activeBucket || undefined,
      search: this.searchQuery || undefined,
      limit: this.currentLimit(),
      offset: this.currentOffset()
    }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.totalCount.set(res.total);
        if (res.summary) {
          this.summary.set(res.summary);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  selectBucket(b: string): void {
    if (this.activeBucket === b) {
      this.activeBucket = '';
    } else {
      this.activeBucket = b;
    }
    this.currentOffset.set(0);
    this.loadDues();
  }

  clearBucket(): void {
    this.activeBucket = '';
    this.currentOffset.set(0);
    this.loadDues();
  }

  onSearchChange(): void {
    this.currentOffset.set(0);
    this.loadDues();
  }

  isPastDue(dueDateStr?: string): boolean {
    if (!dueDateStr) return false;
    return new Date(dueDateStr) < new Date();
  }

  prevPage(): void {
    if (this.currentOffset() > 0) {
      this.currentOffset.set(Math.max(0, this.currentOffset() - this.currentLimit()));
      this.loadDues();
    }
  }

  nextPage(): void {
    if (this.currentOffset() + this.currentLimit() < this.totalCount()) {
      this.currentOffset.set(this.currentOffset() + this.currentLimit());
      this.loadDues();
    }
  }

  sendSingleAlert(inst: CustomerInstallment): void {
    const confirmSend = confirm(`Dispatch SMS & WhatsApp payment reminder to ${inst.customer_name || 'Buyer'} (${inst.customer_phone || 'N/A'}) for ৳${(inst.payable_amount - (inst.paid_amount || 0)).toLocaleString()}?`);
    if (confirmSend) {
      this.installmentService.dispatchAlerts({
        installment_ids: [inst.id],
        channels: ['SMS', 'WHATSAPP']
      }).subscribe({
        next: () => {
          alert('Reminder alert dispatched successfully!');
        },
        error: (err) => {
          alert('Failed to send alert: ' + (err.error?.detail || err.message));
        }
      });
    }
  }

  openBulkAlertModal(): void {
    const overdueIds = this.items().map(i => i.id);
    if (overdueIds.length === 0) {
      alert('No overdue installments in the current view to alert.');
      return;
    }
    const confirmSend = confirm(`Dispatch multi-channel reminders to ${overdueIds.length} customer(s) in this list?`);
    if (confirmSend) {
      this.installmentService.dispatchAlerts({
        installment_ids: overdueIds,
        channels: ['SMS', 'WHATSAPP']
      }).subscribe({
        next: () => {
          alert(`Successfully dispatched reminders to ${overdueIds.length} overdue installments!`);
        },
        error: (err) => {
          alert('Failed to dispatch bulk alerts: ' + (err.error?.detail || err.message));
        }
      });
    }
  }
}
