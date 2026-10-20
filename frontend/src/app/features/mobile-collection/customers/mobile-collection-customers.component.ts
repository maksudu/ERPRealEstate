import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MobileCollectionService, CollectionCustomerItem } from '../../../core/services/mobile-collection.service';
import { MobileCollectionNavComponent } from '../mobile-collection-nav/mobile-collection-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-collection-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MobileCollectionNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-collection-nav activeTab="customers"></app-mobile-collection-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Customer Search & Directory</h1>
          <p class="text-sm text-slate-500 mt-1">Search buyers by name, phone, booking number, project or unit with quick recovery actions</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
          </svg>
          Register Customer Index
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[260px]">
          <div class="relative">
            <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search customer name, phone, unit, booking ID..." class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
        <select [(ngModel)]="projectFilter" (change)="onProjectChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All Projects</option>
          <option value="BlueOceans Marina Bay">BlueOceans Marina Bay</option>
          <option value="BlueOceans Skyline">BlueOceans Skyline</option>
          <option value="BlueOceans Greenfield">BlueOceans Greenfield</option>
        </select>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Total: {{ totalCount }}
        </span>
      </div>

      <!-- Customers Table -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Customer Name</th>
                <th class="px-6 py-4">Phone / Contact</th>
                <th class="px-6 py-4">Project & Unit</th>
                <th class="px-6 py-4">Booking ID</th>
                <th class="px-6 py-4">Total Paid (BDT)</th>
                <th class="px-6 py-4">Overdue (BDT)</th>
                <th class="px-6 py-4">Bank Loan</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.customer_name }}</div>
                  <div class="text-xs text-slate-400">{{ row.email || 'No email' }}</div>
                </td>
                <td class="px-6 py-4 font-mono text-slate-700">{{ row.phone }}</td>
                <td class="px-6 py-4">
                  <div class="font-medium text-slate-900">{{ row.project_name }}</div>
                  <div class="text-xs text-amber-600 font-semibold">Unit: {{ row.unit_number }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {{ row.booking_number }}
                  </span>
                </td>
                <td class="px-6 py-4 font-mono font-medium text-emerald-600">
                  ৳ {{ row.total_paid | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 font-mono font-semibold" [ngClass]="row.overdue_amount > 0 ? 'text-rose-600' : 'text-slate-500'">
                  ৳ {{ row.overdue_amount | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-slate-100 text-slate-700 border-slate-200': row.loan_status === 'NONE',
                    'bg-amber-50 text-amber-700 border-amber-200': row.loan_status === 'SANCTIONED',
                    'bg-blue-50 text-blue-700 border-blue-200': row.loan_status === 'DISBURSED'
                  }" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.loan_status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-2">
                    <button (click)="openEditModal(row)" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button (click)="deleteItem(row.id!)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">No customers found matching search criteria</td>
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

      <!-- Add/Edit Modal (NO static add forms beneath table) -->
      <app-modal [isOpen]="isModalOpen" [title]="editingId ? 'Edit Customer Information' : 'Register Customer Profile'" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Customer Full Name *</label>
              <input type="text" [(ngModel)]="formData.customer_name" name="customer_name" required placeholder="e.g. Dr. Kabir Hossain" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input type="text" [(ngModel)]="formData.phone" name="phone" required placeholder="e.g. +880 1711-234567" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input type="email" [(ngModel)]="formData.email" name="email" placeholder="customer@example.com" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
              <input type="text" [(ngModel)]="formData.project_name" name="project_name" required placeholder="e.g. BlueOceans Marina Bay" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Unit Number *</label>
              <input type="text" [(ngModel)]="formData.unit_number" name="unit_number" required placeholder="e.g. A-502" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Booking Number *</label>
              <input type="text" [(ngModel)]="formData.booking_number" name="booking_number" required placeholder="e.g. BOK-2026-0042" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Total Sales Value (BDT)</label>
              <input type="number" [(ngModel)]="formData.total_sales_value" name="total_sales_value" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Overdue Amount (BDT)</label>
              <input type="number" [(ngModel)]="formData.overdue_amount" name="overdue_amount" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Bank Loan Status</label>
              <select [(ngModel)]="formData.loan_status" name="loan_status" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
                <option value="NONE">NONE</option>
                <option value="APPLIED">APPLIED</option>
                <option value="SANCTIONED">SANCTIONED</option>
                <option value="DISBURSED">DISBURSED</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Collector Assigned</label>
              <input type="text" [(ngModel)]="formData.collector_assigned" name="collector_assigned" placeholder="Officer name" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500">
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl">Save Customer</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileCollectionCustomersComponent implements OnInit {
  items: CollectionCustomerItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';
  projectFilter = '';

  isModalOpen = false;
  editingId: number | null = null;
  formData: Partial<CollectionCustomerItem> = {};

  constructor(private collectionService: MobileCollectionService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.collectionService.getCustomers({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery,
      project: this.projectFilter
    }).subscribe(res => {
      this.items = res.items;
      this.totalCount = res.total;
    });
  }

  onSearchChange() {
    this.offset = 0;
    this.loadData();
  }

  onProjectChange() {
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
    this.editingId = null;
    this.formData = {
      customer_name: '',
      phone: '',
      email: '',
      project_name: 'BlueOceans Marina Bay',
      unit_number: '',
      booking_number: '',
      total_sales_value: 0,
      total_paid: 0,
      total_due: 0,
      overdue_amount: 0,
      loan_status: 'NONE',
      collector_assigned: 'Engr. Maksudul'
    };
    this.isModalOpen = true;
  }

  openEditModal(row: CollectionCustomerItem) {
    this.editingId = row.id!;
    this.formData = { ...row };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
  }

  saveItem() {
    if (this.editingId) {
      this.collectionService.updateCustomer(this.editingId, this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    } else {
      this.collectionService.createCustomer(this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Are you sure you want to delete this customer record?')) {
      this.collectionService.deleteCustomer(id).subscribe(() => this.loadData());
    }
  }
}
