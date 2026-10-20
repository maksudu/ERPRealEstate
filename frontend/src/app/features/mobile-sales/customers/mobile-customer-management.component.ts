import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSalesService, MobileCustomerItem } from '../../../core/services/mobile-sales.service';
import { MobileSalesNavComponent } from '../mobile-sales-nav/mobile-sales-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSalesNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-sales-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Customer Profiles & Relationship Management" subtitle="Manage buyer profiles, contact channels, property requirements and omnichannel interaction logs">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition"
          >
            <span>+</span> Add New Customer
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by name, phone, NID, customer code..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />

            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Buyers</option>
              <option value="INACTIVE">Archived</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Customers: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Customer Code</th>
                <th class="p-3">Full Name</th>
                <th class="p-3">Contact</th>
                <th class="p-3">NID / Smart Card</th>
                <th class="p-3">Specific Requirements</th>
                <th class="p-3">Status</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (cust of customers; track cust.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {{ cust.customer_code }}
                  </td>
                  <td class="p-3 font-medium text-slate-900 dark:text-slate-100">
                    {{ cust.full_name }}
                  </td>
                  <td class="p-3 font-mono">
                    <div>{{ cust.phone }}</div>
                    @if (cust.email) {
                      <div class="text-[10px] text-slate-400 font-sans">{{ cust.email }}</div>
                    }
                  </td>
                  <td class="p-3 font-mono text-[11px]">
                    {{ cust.nid_number || 'Pending KYC' }}
                  </td>
                  <td class="p-3 max-w-xs truncate" [title]="cust.requirements || ''">
                    {{ cust.requirements || 'Standard 3/4 BHK' }}
                  </td>
                  <td class="p-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400">
                      {{ cust.status }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openEditModal(cust)"
                        class="px-2 py-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteCustomer(cust)"
                        class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="p-8 text-center text-slate-400">
                    No customers found matching your search.
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

      <!-- Modal Dialog for Add / Edit Customer -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingCustomerId ? 'Edit Customer Profile' : 'Register New Buyer Profile'"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Legal Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.full_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. Dr. Nuzhat Fatema"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Mobile Phone *</label>
              <input
                type="text"
                [(ngModel)]="formData.phone"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="+88018XXXXXXXX"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                [(ngModel)]="formData.email"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="customer@domain.com"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">NID / Smart Card Number</label>
              <input
                type="text"
                [(ngModel)]="formData.nid_number"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="10 or 17 digit NID"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Present / Mailing Address</label>
            <textarea
              [(ngModel)]="formData.present_address"
              rows="2"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
              placeholder="House, Road, Area, Dhaka"
            ></textarea>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Apartment Requirements & Preferences</label>
            <textarea
              [(ngModel)]="formData.requirements"
              rows="2"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
              placeholder="Area sqft, bedroom count, preferred floor, lake facing, parking slots..."
            ></textarea>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Interaction History & Follow-up Notes</label>
            <textarea
              [(ngModel)]="formData.interaction_history"
              rows="2"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
              placeholder="Call logs, site visit feedback, objections, payment preferences..."
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
              (click)="saveCustomer()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
            >
              {{ editingCustomerId ? 'Update Customer' : 'Save Customer' }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileCustomerManagementComponent implements OnInit {
  private service = inject(MobileSalesService);
  Math = Math;

  customers: MobileCustomerItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedStatus = 'ALL';

  isModalOpen = false;
  editingCustomerId: number | null = null;
  formData: Partial<MobileCustomerItem> = {
    full_name: '',
    phone: '',
    email: '',
    nid_number: '',
    present_address: '',
    requirements: '',
    interaction_history: '',
    status: 'ACTIVE'
  };

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.service.getCustomers({
      search: this.searchQuery,
      status: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.customers = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load customers', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadCustomers();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadCustomers();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadCustomers();
    }
  }

  openCreateModal(): void {
    this.editingCustomerId = null;
    this.formData = {
      full_name: '',
      phone: '',
      email: '',
      nid_number: '',
      present_address: '',
      requirements: '',
      interaction_history: '',
      status: 'ACTIVE'
    };
    this.isModalOpen = true;
  }

  openEditModal(cust: MobileCustomerItem): void {
    this.editingCustomerId = cust.id;
    this.formData = { ...cust };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveCustomer(): void {
    if (!this.formData.full_name || !this.formData.phone) {
      alert('Please enter Customer Name and Phone number.');
      return;
    }

    if (this.editingCustomerId) {
      this.service.updateCustomer(this.editingCustomerId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadCustomers();
        },
        error: (err) => console.error('Failed to update customer', err)
      });
    } else {
      this.service.createCustomer(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadCustomers();
        },
        error: (err) => console.error('Failed to create customer', err)
      });
    }
  }

  deleteCustomer(cust: MobileCustomerItem): void {
    if (confirm(`Delete customer profile ${cust.customer_code} (${cust.full_name})?`)) {
      this.service.deleteCustomer(cust.id).subscribe({
        next: () => this.loadCustomers(),
        error: (err) => console.error('Failed to delete customer', err)
      });
    }
  }
}
