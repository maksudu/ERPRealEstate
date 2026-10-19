import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { Booking } from '../../../core/models/sales.model';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-booking-money-list',
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
        title="02. Booking Money Management"
        subtitle="Manage apartment & plot booking applications, earnest money receipts, payment verification, and refund workflows"
        badge="Submodule 02"
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
            Record Booking Receipt
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
              placeholder="Search booking ref, applicant name..."
              class="erp-input text-xs w-full"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Booking Status</label>
            <app-searchable-select
              categoryCode="BOOKING_STATUS"
              placeholder="All Booking Statuses"
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

        <!-- Bookings Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            <thead class="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Booking Reference</th>
                <th class="px-4 py-3 text-left">Customer / Applicant</th>
                <th class="px-4 py-3 text-left">Project & Unit</th>
                <th class="px-4 py-3 text-right">Agreed Sale Price</th>
                <th class="px-4 py-3 text-right">Earnest Money (BDT)</th>
                <th class="px-4 py-3 text-center">Booking Date</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              @if (isLoading()) {
                <tr>
                  <td colspan="8" class="text-center py-8 text-slate-500">
                    <div class="inline-flex items-center gap-2">
                      <svg class="animate-spin h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Loading booking applications...</span>
                    </div>
                  </td>
                </tr>
              } @else if (bookings().length === 0) {
                <tr>
                  <td colspan="8" class="text-center py-10 text-slate-500">
                    <p class="font-medium">No booking records found.</p>
                  </td>
                </tr>
              } @else {
                @for (b of bookings(); track b.id) {
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {{ b.booking_reference_no }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-900 dark:text-white">{{ b.customer_name || 'N/A' }}</div>
                      <div class="text-[11px] text-slate-500">{{ b.customer_phone || 'N/A' }}</div>
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div class="font-medium">{{ b.project_name || 'Project #' + b.project_id }}</div>
                      <div class="text-[11px] text-slate-500">Unit: {{ b.unit_number || 'N/A' }}</div>
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      ৳{{ (b.final_contract_value || 0) | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{{ (b.earnest_money_received || 0) | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3 text-center text-slate-500">
                      {{ b.booking_date }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <app-status-badge
                        [status]="b.status"
                        [labelEn]="b.status"
                        [variant]="b.status === 'ALLOTTED' || b.status === 'CONFIRMED' ? 'success' : (b.status === 'CANCELLED' ? 'danger' : 'warning')"
                      />
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button
                        type="button"
                        [routerLink]="['/installments/customer-ledger']"
                        [queryParams]="{ booking_id: b.id }"
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
      </app-card-container>
    </div>
  `
})
export class BookingMoneyListComponent implements OnInit {
  private salesService = inject(SalesService);
  private router = inject(Router);

  bookings = signal<Booking[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = '';
  selectedStatus = '';

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading.set(true);
    this.salesService.getBookings({
      status: this.selectedStatus || undefined
    }).subscribe({
      next: (res) => {
        let items = res || [];
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          items = items.filter(b =>
            (b.booking_reference_no && b.booking_reference_no.toLowerCase().includes(q)) ||
            (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
            (b.customer_phone && b.customer_phone.toLowerCase().includes(q))
          );
        }
        this.bookings.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.loadBookings();
  }

  applyFilters(): void {
    this.loadBookings();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.loadBookings();
  }

  navigateToCreate(): void {
    this.router.navigate(['/installments/booking-money/create']);
  }
}
