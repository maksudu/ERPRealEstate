import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSalesService, MobileBookingItem } from '../../../core/services/mobile-sales.service';
import { MobileSalesNavComponent } from '../mobile-sales-nav/mobile-sales-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-booking-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSalesNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-sales-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Apartment Reservations & Booking Requests" subtitle="Process initial token bookings, record earnest money payments, configure EMI schedules and upload KYC documents">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition"
          >
            <span>+</span> New Booking Request
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by booking #, client, project, unit..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />

            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Reservations</option>
              <option value="REQUESTED">Requested</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Bookings: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Booking #</th>
                <th class="p-3">Customer Details</th>
                <th class="p-3">Project & Unit</th>
                <th class="p-3">Booking Date</th>
                <th class="p-3">Earnest Money (BDT)</th>
                <th class="p-3">Plan Tenure</th>
                <th class="p-3">KYC Docs</th>
                <th class="p-3">Reservation Status</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (bk of bookings; track bk.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {{ bk.booking_no }}
                  </td>
                  <td class="p-3">
                    <div class="font-medium text-slate-900 dark:text-slate-100">{{ bk.customer_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ bk.customer_phone }}</div>
                  </td>
                  <td class="p-3">
                    <div class="font-medium">{{ bk.project_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono font-bold">{{ bk.unit_number }}</div>
                  </td>
                  <td class="p-3 font-mono">
                    {{ bk.booking_date }}
                  </td>
                  <td class="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{{ bk.booking_amount | number:'1.0-0' }}
                  </td>
                  <td class="p-3 font-mono">
                    {{ bk.installment_plan_months }} Months
                  </td>
                  <td class="p-3 font-mono">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      📎 {{ bk.documents_count }} files
                    </span>
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400': bk.reservation_status === 'CONFIRMED',
                        'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-400': bk.reservation_status === 'REQUESTED',
                        'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400': bk.reservation_status === 'CANCELLED'
                      }"
                    >
                      {{ bk.reservation_status }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openEditModal(bk)"
                        class="px-2 py-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteBooking(bk)"
                        class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="p-8 text-center text-slate-400">
                    No reservations recorded. Click "+ New Booking Request" to initiate one.
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

      <!-- Modal Dialog for Add / Edit Booking Request -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingBookingId ? 'Edit Apartment Reservation Request' : 'Create Apartment Reservation Request'"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Customer / Allottee Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.customer_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. Barrister Kamal Hossain"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Contact Phone *</label>
              <input
                type="text"
                [(ngModel)]="formData.customer_phone"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="+88017XXXXXXXX"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.project_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="BlueOceans Marina Bay"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Number *</label>
              <input
                type="text"
                [(ngModel)]="formData.unit_number"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold focus:ring-1 focus:ring-teal-500"
                placeholder="A-1001"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Booking Date *</label>
              <input
                type="date"
                [(ngModel)]="formData.booking_date"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Token Booking Money (BDT) *</label>
              <input
                type="number"
                [(ngModel)]="formData.booking_amount"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="2000000"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">EMI Installment Tenure</label>
              <select
                [(ngModel)]="formData.installment_plan_months"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option [ngValue]="12">12 Months (1 Year)</option>
                <option [ngValue]="24">24 Months (2 Years)</option>
                <option [ngValue]="36">36 Months (3 Years)</option>
                <option [ngValue]="48">48 Months (4 Years)</option>
                <option [ngValue]="60">60 Months (5 Years)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Reservation Status</label>
              <select
                [(ngModel)]="formData.reservation_status"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="REQUESTED">Requested (Pending Verification)</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Attached KYC Documents Count</label>
              <input
                type="number"
                [(ngModel)]="formData.documents_count"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
                placeholder="4"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method & Reference Notes</label>
            <textarea
              [(ngModel)]="formData.notes"
              rows="2"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
              placeholder="Bank Pay Order details, Cheque number, Joint applicant info..."
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
              (click)="saveBooking()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
            >
              {{ editingBookingId ? 'Update Reservation' : 'Submit Booking Request' }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileBookingManagementComponent implements OnInit {
  private service = inject(MobileSalesService);
  Math = Math;

  bookings: MobileBookingItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedStatus = 'ALL';

  isModalOpen = false;
  editingBookingId: number | null = null;
  formData: Partial<MobileBookingItem> = {
    customer_name: '',
    customer_phone: '',
    project_name: 'BlueOceans Marina Bay',
    unit_number: 'A-1001',
    booking_date: new Date().toISOString().slice(0, 10),
    reservation_status: 'REQUESTED',
    booking_amount: 1000000,
    installment_plan_months: 36,
    documents_count: 3,
    notes: ''
  };

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.service.getBookings({
      search: this.searchQuery,
      status: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.bookings = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load bookings', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadBookings();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadBookings();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadBookings();
    }
  }

  openCreateModal(): void {
    this.editingBookingId = null;
    this.formData = {
      customer_name: '',
      customer_phone: '',
      project_name: 'BlueOceans Marina Bay',
      unit_number: 'A-1001',
      booking_date: new Date().toISOString().slice(0, 10),
      reservation_status: 'REQUESTED',
      booking_amount: 1000000,
      installment_plan_months: 36,
      documents_count: 3,
      notes: ''
    };
    this.isModalOpen = true;
  }

  openEditModal(bk: MobileBookingItem): void {
    this.editingBookingId = bk.id;
    this.formData = { ...bk };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveBooking(): void {
    if (!this.formData.customer_name || !this.formData.project_name || !this.formData.unit_number) {
      alert('Please enter Customer Name, Project Name and Unit Number.');
      return;
    }

    if (this.editingBookingId) {
      this.service.updateBooking(this.editingBookingId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadBookings();
        },
        error: (err) => console.error('Failed to update booking', err)
      });
    } else {
      this.service.createBooking(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadBookings();
        },
        error: (err) => console.error('Failed to create booking', err)
      });
    }
  }

  deleteBooking(bk: MobileBookingItem): void {
    if (confirm(`Remove reservation request ${bk.booking_no} for ${bk.customer_name}?`)) {
      this.service.deleteBooking(bk.id).subscribe({
        next: () => this.loadBookings(),
        error: (err) => console.error('Failed to delete booking', err)
      });
    }
  }
}
