import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { DownPaymentItem } from '../../../core/models/installment.model';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-down-payment-list',
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
        title="03. Down Payment Management"
        subtitle="Track required down payments, partial payment collections, outstanding balances, and booking adjustments"
        badge="Submodule 03"
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
            Collect Down Payment
          </app-button>
        </div>

        <!-- Filter Bar -->
        <div class="p-3 mb-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Search Customer / Booking</label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              placeholder="Search booking ref, customer..."
              class="erp-input text-xs w-full"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Down Payment Status</label>
            <app-searchable-select
              categoryCode="DOWN_PAYMENT_STATUS"
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

        <!-- Down Payment Table with Paging -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            <thead class="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Booking & Unit</th>
                <th class="px-4 py-3 text-left">Customer</th>
                <th class="px-4 py-3 text-right">Agreed Sale Price</th>
                <th class="px-4 py-3 text-right">Booking Money</th>
                <th class="px-4 py-3 text-right">Required Down Payment</th>
                <th class="px-4 py-3 text-right">Paid Amount</th>
                <th class="px-4 py-3 text-right">Outstanding (BDT)</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-right">Action</th>
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
                      <span>Loading down payments...</span>
                    </div>
                  </td>
                </tr>
              } @else if (items().length === 0) {
                <tr>
                  <td colspan="9" class="text-center py-10 text-slate-500">
                    <p class="font-medium">No down payment records found.</p>
                  </td>
                </tr>
              } @else {
                @for (dp of items(); track dp.booking_id) {
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-4 py-3">
                      <div class="font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ dp.booking_reference_no }}</div>
                      <div class="text-[11px] text-slate-500">{{ dp.project_name }} • Unit {{ dp.unit_number }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-900 dark:text-white">{{ dp.customer_name }}</div>
                      <div class="text-[11px] text-slate-500">{{ dp.customer_phone }}</div>
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      ৳{{ dp.contract_price | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                      ৳{{ dp.booking_money_received | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      ৳{{ dp.required_down_payment | number:'1.2-2' }} ({{ dp.down_payment_percentage }}%)
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{{ dp.paid_down_payment | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-right font-bold" [ngClass]="dp.outstanding_down_payment > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'">
                      ৳{{ dp.outstanding_down_payment | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <app-status-badge
                        [status]="dp.status"
                        [labelEn]="dp.status"
                        [variant]="dp.status === 'PAID' ? 'success' : (dp.status === 'PARTIALLY_PAID' ? 'warning' : 'danger')"
                      />
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button
                        type="button"
                        [routerLink]="['/installments/customer-ledger']"
                        [queryParams]="{ booking_id: dp.booking_id }"
                        class="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 text-xs font-semibold"
                      >
                        Ledger
                      </button>
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
export class DownPaymentListComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);

  items = signal<DownPaymentItem[]>([]);
  totalCount = signal<number>(0);
  currentLimit = signal<number>(20);
  currentOffset = signal<number>(0);
  isLoading = signal<boolean>(false);

  searchQuery = '';
  selectedStatus = '';
  Math = Math;

  ngOnInit(): void {
    this.loadDownPayments();
  }

  loadDownPayments(): void {
    this.isLoading.set(true);
    this.installmentService.getDownPayments({
      search: this.searchQuery || undefined,
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

  onSearchChange(): void {
    this.currentOffset.set(0);
    this.loadDownPayments();
  }

  applyFilters(): void {
    this.currentOffset.set(0);
    this.loadDownPayments();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.currentOffset.set(0);
    this.loadDownPayments();
  }

  prevPage(): void {
    if (this.currentOffset() > 0) {
      this.currentOffset.set(Math.max(0, this.currentOffset() - this.currentLimit()));
      this.loadDownPayments();
    }
  }

  nextPage(): void {
    if (this.currentOffset() + this.currentLimit() < this.totalCount()) {
      this.currentOffset.set(this.currentOffset() + this.currentLimit());
      this.loadDownPayments();
    }
  }

  navigateToCreate(): void {
    this.router.navigate(['/installments/down-payment/create']);
  }
}
