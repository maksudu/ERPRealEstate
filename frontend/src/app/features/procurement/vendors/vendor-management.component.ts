import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { Vendor } from '../../../core/models/procurement.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  ModalComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';

@Component({
  selector: 'app-vendor-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProcurementNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    ModalComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  template: `
    <app-procurement-nav
      title="9.2 Supplier & Vendor Management"
      subtitle="Centralized Supplier Master, Trade Categories, Tax IDs, and Performance Monitoring"
    >
      <div actions>
        <button
          type="button"
          (click)="openAddModal()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-colors"
        >
          <span>+</span>
          <span>Register New Supplier</span>
        </button>
      </div>
    </app-procurement-nav>

    <!-- Main Card Container: Supplier Master List -->
    <app-card-container
      title="Registered Suppliers & Material Vendors"
      subtitle="Complete supplier directory with trade categories, tax registrations & payment terms"
    >
      <!-- Search & Category Filters -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-2 w-full sm:w-80">
          <div class="relative w-full">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearch()"
              placeholder="Search vendor name, code, contact..."
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <svg class="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <select
            [(ngModel)]="selectedCategory"
            (ngModelChange)="onSearch()"
            class="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Trade Categories</option>
            <option value="STEEL_REBAR">Steel & Rebar</option>
            <option value="CEMENT">Cement Brands</option>
            <option value="BRICKS_AGGREGATES">Bricks, Sand & Aggregates</option>
            <option value="TILES_SANITARY">Tiles & Sanitary</option>
            <option value="ELECTRICAL_MEP">Electrical & MEP</option>
            <option value="EQUIPMENT_FLEET">Machinery & Equipment</option>
          </select>
        </div>
      </div>

      <!-- Paginated Vendor Table -->
      <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold">
              <th class="py-2.5 px-3">Vendor Code</th>
              <th class="py-2.5 px-3">Supplier Name</th>
              <th class="py-2.5 px-3">Trade Category</th>
              <th class="py-2.5 px-3">Contact Person</th>
              <th class="py-2.5 px-3">Phone & Email</th>
              <th class="py-2.5 px-3">TIN / BIN</th>
              <th class="py-2.5 px-3 text-right">Payment Terms</th>
              <th class="py-2.5 px-3 text-center">Status</th>
              <th class="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (v of vendors(); track v.id) {
              <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-2.5 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                  {{ v.vendor_code }}
                </td>
                <td class="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                  {{ v.vendor_name }}
                </td>
                <td class="py-2.5 px-3">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {{ v.trade_category }}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                  {{ v.contact_person }}
                </td>
                <td class="py-2.5 px-3">
                  <div class="text-slate-800 dark:text-slate-200">{{ v.phone_number }}</div>
                  <div class="text-[10px] text-slate-400">{{ v.email || '—' }}</div>
                </td>
                <td class="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  <div>TIN: {{ v.tin_number || '—' }}</div>
                  <div>BIN: {{ v.bin_number || '—' }}</div>
                </td>
                <td class="py-2.5 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                  {{ v.payment_terms_days }} Days
                </td>
                <td class="py-2.5 px-3 text-center">
                  <span [class]="v.is_active ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'">
                    {{ v.is_active ? 'Active' : 'Suspended' }}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      (click)="openEditModal(v)"
                      class="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Vendor"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      (click)="deleteVendor(v)"
                      class="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete / Deactivate"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="9" class="py-8 text-center text-slate-400 text-xs">
                  No suppliers matching search criteria. Click "+ Register New Supplier" above to add.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="flex items-center justify-between pt-4 text-xs text-slate-500 dark:text-slate-400">
        <div>
          Showing <span class="font-bold text-slate-800 dark:text-slate-200">{{ vendors().length }}</span> suppliers
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="previousPage()"
            [disabled]="offset === 0"
            class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <span class="font-mono text-xs">Page {{ (offset / limit) + 1 }}</span>
          <button
            type="button"
            (click)="nextPage()"
            [disabled]="vendors().length < limit"
            class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>
    </app-card-container>

    <!-- Dedicated Add / Edit Supplier Modal (NOT showing under table) -->
    <app-modal
      [isOpen]="isModalOpen"
      [title]="editingVendorId ? 'Edit Supplier Profile' : 'Register New Material Supplier'"
      [subtitle]="'Central supplier registration with NBR Tax/BIN, Trade Category and Payment Terms'"
      [maxWidth]="'max-w-2xl'"
      (closeModal)="closeModal()"
    >
      <form [formGroup]="vendorForm" (ngSubmit)="saveVendor()" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Registered Business Name -->
          <div class="sm:col-span-2">
            <app-custom-input
              label="Supplier Business Name (Company/Firm)"
              placeholder="e.g. BSRM Steels Ltd. / Bashundhara Cement Mills"
              formControlName="vendor_name"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Dynamic Trade Category Searchable Select -->
          <div>
            <app-searchable-select
              label="Trade Category"
              placeholder="Select or Create Trade Category..."
              categoryCode="VENDOR_TRADE_CATEGORY"
              [allowCreateNew]="true"
              [required]="true"
              formControlName="trade_category"
            ></app-searchable-select>
          </div>

          <!-- Contact Person -->
          <div>
            <app-custom-input
              label="Contact Person Name"
              placeholder="e.g. Engr. Rafiqul Islam (DGM Sales)"
              formControlName="contact_person"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Phone Number -->
          <div>
            <app-custom-input
              label="Official Phone / Mobile"
              placeholder="e.g. +880 1711-000000"
              formControlName="phone_number"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Email -->
          <div>
            <app-custom-input
              label="Official Email Address"
              type="email"
              placeholder="e.g. sales@bsrm.com"
              formControlName="email"
            ></app-custom-input>
          </div>

          <!-- TIN Number -->
          <div>
            <app-custom-input
              label="e-TIN Number (12 Digits)"
              placeholder="e.g. 542109873421"
              formControlName="tin_number"
            ></app-custom-input>
          </div>

          <!-- BIN / VAT Number -->
          <div>
            <app-custom-input
              label="13-Digit VAT BIN Number"
              placeholder="e.g. 002134567-0101"
              formControlName="bin_number"
            ></app-custom-input>
          </div>

          <!-- Payment Terms Days -->
          <div>
            <app-custom-input
              label="Credit Payment Terms (Days)"
              type="number"
              placeholder="30"
              formControlName="payment_terms_days"
            ></app-custom-input>
          </div>

          <!-- Active Switch -->
          <div class="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="vendorActive"
              formControlName="is_active"
              class="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
            />
            <label for="vendorActive" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Active Supplier (Approved for PO issuance)
            </label>
          </div>
        </div>

        <!-- Modal Actions Footer -->
        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="closeModal()"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <app-custom-button
            [label]="isSaving() ? 'Saving...' : (editingVendorId ? 'Update Supplier' : 'Save Supplier')"
            type="submit"
            variant="primary"
            [disabled]="vendorForm.invalid || isSaving()"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>
  `
})
export class VendorManagementComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private fb = inject(FormBuilder);

  vendors = signal<Vendor[]>([]);
  isModalOpen = false;
  editingVendorId: number | null = null;
  isSaving = signal<boolean>(false);

  searchQuery = '';
  selectedCategory = '';
  limit = 20;
  offset = 0;

  vendorForm: FormGroup = this.fb.group({
    vendor_name: ['', Validators.required],
    trade_category: ['', Validators.required],
    contact_person: ['', Validators.required],
    phone_number: ['', Validators.required],
    email: [''],
    tin_number: [''],
    bin_number: [''],
    payment_terms_days: [30, [Validators.required, Validators.min(0)]],
    is_active: [true]
  });

  ngOnInit(): void {
    this.loadVendors();
  }

  loadVendors(): void {
    this.procurementService.getVendors(this.searchQuery, this.selectedCategory).subscribe({
      next: (data) => this.vendors.set(data),
      error: () => {}
    });
  }

  onSearch(): void {
    this.offset = 0;
    this.loadVendors();
  }

  nextPage(): void {
    this.offset += this.limit;
    this.loadVendors();
  }

  previousPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadVendors();
    }
  }

  openAddModal(): void {
    this.editingVendorId = null;
    this.vendorForm.reset({
      vendor_name: '',
      trade_category: 'STEEL_REBAR',
      contact_person: '',
      phone_number: '',
      email: '',
      tin_number: '',
      bin_number: '',
      payment_terms_days: 30,
      is_active: true
    });
    this.isModalOpen = true;
  }

  openEditModal(vendor: Vendor): void {
    this.editingVendorId = vendor.id;
    this.vendorForm.patchValue({
      vendor_name: vendor.vendor_name,
      trade_category: vendor.trade_category,
      contact_person: vendor.contact_person,
      phone_number: vendor.phone_number,
      email: vendor.email || '',
      tin_number: vendor.tin_number || '',
      bin_number: vendor.bin_number || '',
      payment_terms_days: vendor.payment_terms_days,
      is_active: vendor.is_active
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingVendorId = null;
  }

  saveVendor(): void {
    if (this.vendorForm.invalid) return;

    this.isSaving.set(true);
    const val = this.vendorForm.value;

    if (this.editingVendorId) {
      this.procurementService.updateVendor(this.editingVendorId, val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadVendors();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.procurementService.createVendor(val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadVendors();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  deleteVendor(v: Vendor): void {
    if (!confirm(`Are you sure you want to delete supplier "${v.vendor_name}"?`)) return;
    this.procurementService.deleteVendor(v.id).subscribe({
      next: () => this.loadVendors(),
      error: () => {}
    });
  }
}
