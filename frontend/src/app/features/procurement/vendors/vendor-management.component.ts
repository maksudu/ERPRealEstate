import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Vendor } from '../../../core/models/procurement.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
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
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  template: `
    @if (!isFormPage) {
    <app-procurement-nav
      title="Supplier & Vendor Management"
      
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
    @if (successMessage) { <div class="mb-4 rounded-lg bg-emerald-50 text-emerald-700 p-3 text-sm">{{ successMessage }}</div> }
    @if (errorMessage) { <div class="mb-4 rounded-lg bg-rose-50 text-rose-700 p-3 text-sm">{{ errorMessage }}</div> }
    @if (expiryAlerts().length) {
      <div class="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        {{ expiryAlerts().length }} supplier trade license(s) expired or expiring within 60 days:
        <span *ngFor="let v of expiryAlerts(); let last = last">{{ v.vendor_name }} ({{ expiryDate(v) | date:'mediumDate' }}){{ last ? '' : ', ' }}</span>
      </div>
    }
    @if (historyVendor()) {
      <div class="mb-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-2 flex items-center justify-between text-sm font-bold">Approval history · {{ historyVendor()?.vendor_name }}<button type="button" (click)="historyVendor.set(null)" class="text-slate-500">Close</button></div>
        <div *ngFor="let event of approvalHistory()" class="border-l-2 border-indigo-300 py-1 pl-3 text-xs">
          <b>{{ event.action.replaceAll('_', ' ') }}</b>: {{ event.from_status || 'NEW' }} → {{ event.to_status }}
          <span class="text-slate-500"> · {{ event.created_at | date:'short' }} · {{ event.notes || 'No notes' }}</span>
        </div>
        <div *ngIf="!approvalHistory().length" class="text-xs text-slate-500">No approval events recorded.</div>
      </div>
    }

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
          <app-searchable-select
            placeholder="All Trade Categories"
            [options]="tradeCategoryOptions()"
            [(ngModel)]="selectedCategory"
            (ngModelChange)="onSearch()"
            [allowCreateNew]="false"
          ></app-searchable-select>
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
              <th class="py-2.5 px-3">Approval</th>
              <th class="py-2.5 px-3">Performance / Quality</th>
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
                <td class="py-2.5 px-3">
                  <div class="font-semibold">{{ v.approval_status.replaceAll('_', ' ') }}</div>
                  <div *ngIf="v.trade_license_expiry_date" class="text-[10px] text-amber-700">License expires {{ v.trade_license_expiry_date | date:'mediumDate' }}</div>
                </td>
                <td class="py-2.5 px-3 text-[10px] text-slate-600">
                  Score: {{ v.performance_score ?? '—' }} · Late: {{ v.late_delivery_count || 0 }}<br>
                  Rejected: {{ v.rejected_delivery_count || 0 }} · Quality NC: {{ v.non_conformance_count || 0 }}
                </td>
                <td class="py-2.5 px-3 text-center">
                  <span [class]="v.is_active ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'">
                    {{ v.approval_status === 'BLACKLISTED' ? 'Blacklisted' : (v.is_active ? 'Eligible' : 'Not eligible') }}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button type="button" (click)="viewHistory(v)" class="px-2 py-1 rounded border text-[10px]">History</button>
                    <button *ngIf="workflowAction(v)" type="button" (click)="advanceWorkflow(v)" class="px-2 py-1 rounded bg-indigo-600 text-white text-[10px] font-bold">{{ workflowLabel(v) }}</button>
                    <button *ngIf="['PENDING_PROCUREMENT_REVIEW', 'PENDING_FINANCE_VERIFICATION', 'PENDING_TECHNICAL_REVIEW'].includes(v.approval_status)" type="button" (click)="advanceWorkflow(v, 'RETURN')" class="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Return</button>
                    <button *ngIf="v.approval_status.startsWith('PENDING_')" type="button" (click)="advanceWorkflow(v, 'REJECT')" class="px-2 py-1 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">Reject</button>
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
                <td colspan="11" class="py-8 text-center text-slate-400 text-xs">
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

    }
    @if (isFormPage) {
    <section class="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 shadow-sm">
      <div class="mb-5"><h2 class="text-lg font-bold">{{ editingVendorId ? 'Edit Supplier Profile' : 'Register New Material Supplier' }}</h2><p class="text-xs text-slate-500 mt-1">Supplier registration with trade category, tax IDs and payment terms.</p></div>
      @if (errorMessage) { <div class="mb-4 rounded-lg bg-rose-50 text-rose-700 p-3 text-sm">{{ errorMessage }}</div> }
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

          <div class="sm:col-span-2"><app-custom-textarea label="Registered Business Address" formControlName="business_address" rows="2" placeholder="Registered office / business address"></app-custom-textarea></div>
          <div><app-custom-input label="Business Registration Number" formControlName="business_registration_number"></app-custom-input></div>
          <div><app-custom-input label="Trade License Number" formControlName="trade_license_number"></app-custom-input></div>
          <div><app-custom-input label="Trade License Expiry" type="date" formControlName="trade_license_expiry_date"></app-custom-input></div>
          <div><app-custom-input label="Materials / Services Supplied (comma separated)" formControlName="supplied_categories_text" placeholder="Cement, reinforcement steel"></app-custom-input></div>

          <!-- TIN Number -->
          <div>
            <app-custom-input
              label="e-TIN Number (12 Digits)"
              placeholder="e.g. 542109873421"
              formControlName="tin_number"
            ></app-custom-input>
          </div>

          <div><app-custom-input label="Credit Limit (BDT)" type="number" formControlName="credit_limit_bdt"></app-custom-input></div>
          <div><app-custom-input label="Payment Currency (ISO code)" formControlName="currency" placeholder="BDT"></app-custom-input></div>
          <div><app-custom-input label="Bank Name" formControlName="bank_name"></app-custom-input></div>
          <div><app-custom-input label="Bank Account Name" formControlName="bank_account_name"></app-custom-input></div>
          <div><app-custom-input label="Bank Account Number" formControlName="bank_account_number"></app-custom-input></div>
          <div><app-custom-input label="Bank Branch" formControlName="bank_branch"></app-custom-input></div>
          <div class="sm:col-span-2 text-[11px] text-slate-500">Bank information is excluded from general vendor list responses.</div>
          <div class="sm:col-span-2"><app-custom-textarea label="Supporting Documents: name | URL | expiry date (one per line)" formControlName="document_refs_text" rows="3" placeholder="Trade License | https://... | 2027-06-30"></app-custom-textarea></div>
          <div><app-custom-textarea label="Authorized Representatives (one per line)" formControlName="authorized_representatives_text" rows="2"></app-custom-textarea></div>
          <div><app-custom-textarea label="Business References (one per line)" formControlName="references_text" rows="2"></app-custom-textarea></div>

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

          <div class="sm:col-span-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">New registrations enter procurement review. The supplier becomes purchasable only after all approval stages finish.</div>
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
    </section>
    }
  `
})
export class VendorManagementComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  vendors = signal<Vendor[]>([]);
  expiryAlerts = signal<Vendor[]>([]);
  tradeCategoryOptions = signal<{ label: string; value: string }[]>([{ label: 'All Trade Categories', value: '' }]);
  historyVendor = signal<Vendor | null>(null);
  approvalHistory = signal<any[]>([]);
  isModalOpen = false;
  editingVendorId: number | null = null;
  isSaving = signal<boolean>(false);
  isFormPage = false;
  errorMessage = '';

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
    business_address: [''],
    business_registration_number: [''],
    trade_license_number: [''],
    trade_license_expiry_date: [''],
    supplied_categories_text: [''],
    tin_number: [''],
    bin_number: [''],
    document_refs_text: [''],
    authorized_representatives_text: [''],
    references_text: [''],
    bank_name: [''],
    bank_account_name: [''],
    bank_account_number: [''],
    bank_branch: [''],
    credit_limit_bdt: [0, [Validators.min(0)]],
    currency: ['BDT', Validators.required],
    payment_terms_days: [30, [Validators.required, Validators.min(0)]],
  });


  ngOnInit(): void {
    this.isFormPage = this.router.url.includes('/new') || this.router.url.includes('/edit');
    const routeId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.isFormPage && !routeId) this.prepareAddForm();
    const notice = history.state?.procurementNotice;
    if (notice) this.successMessage = notice;
    this.loadVendors();
  }

  successMessage = '';

  loadVendors(): void {
    const routeId = Number(this.route.snapshot.paramMap.get('id'));
    this.procurementService.getVendors(this.searchQuery, this.selectedCategory, routeId ? 500 : this.limit, routeId ? 0 : this.offset).subscribe({
      next: (data: any) => {
        this.errorMessage = '';
        const rows = Array.isArray(data) ? data : data?.items ?? data?.results ?? [];
        this.vendors.set(rows);
        this.tradeCategoryOptions.set([
          { label: 'All Trade Categories', value: '' },
          ...Array.from(new Set<string>(rows.map((row: Vendor) => String(row.trade_category || '')).filter(Boolean))).map(category => ({ label: category, value: category }))
        ]);
        if (this.isFormPage && routeId) {
          const vendor = rows.find((item: Vendor) => item.id === routeId);
          if (vendor) this.patchVendorForm(vendor);
          else this.errorMessage = 'Supplier record could not be loaded.';
        }
      },
      error: (err) => this.errorMessage = err.error?.detail || 'Unable to load suppliers.'
    });
    this.procurementService.getVendorExpiryAlerts(60).subscribe({ next: rows => this.expiryAlerts.set(rows || []), error: () => this.expiryAlerts.set([]) });
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
    this.router.navigate(['/procurement/vendors/new']);
  }

  private prepareAddForm(): void {
    this.editingVendorId = null;
    this.vendorForm.reset({
      vendor_name: '',
      trade_category: 'STEEL_REBAR',
      contact_person: '',
      phone_number: '',
      email: '',
      business_address: '', business_registration_number: '', trade_license_number: '', trade_license_expiry_date: '', supplied_categories_text: '',
      tin_number: '',
      bin_number: '',
      document_refs_text: '', authorized_representatives_text: '', references_text: '',
      bank_name: '', bank_account_name: '', bank_account_number: '', bank_branch: '', credit_limit_bdt: 0, currency: 'BDT',
      payment_terms_days: 30,
    });
    this.isModalOpen = false;
  }

  openEditModal(vendor: Vendor): void {
    this.router.navigate(['/procurement/vendors', vendor.id, 'edit']);
  }

  private patchVendorForm(vendor: Vendor): void {
    this.editingVendorId = vendor.id;
    this.vendorForm.patchValue({
      vendor_name: vendor.vendor_name,
      trade_category: vendor.trade_category,
      contact_person: vendor.contact_person,
      phone_number: vendor.phone_number,
      email: vendor.email || '',
      business_address: vendor.business_address || '',
      business_registration_number: vendor.business_registration_number || '',
      trade_license_number: vendor.trade_license_number || '',
      trade_license_expiry_date: vendor.trade_license_expiry_date || '',
      supplied_categories_text: (vendor.supplied_categories || []).join(', '),
      tin_number: vendor.tin_number || '',
      bin_number: vendor.bin_number || '',
      document_refs_text: (vendor.document_refs || []).map(doc => `${doc.name || ''} | ${doc.url} | ${doc.expiry_date || ''}`).join('\n'),
      authorized_representatives_text: (vendor.authorized_representatives || []).join('\n'),
      references_text: (vendor.references || []).join('\n'),
      credit_limit_bdt: vendor.credit_limit_bdt || 0,
      currency: vendor.currency || 'BDT',
      payment_terms_days: vendor.payment_terms_days,
    });
    this.isModalOpen = false;
  }

  closeModal(): void {
    this.router.navigate(['/procurement/vendors']);
  }

  saveVendor(): void {
    if (this.vendorForm.invalid) return;
    this.errorMessage = '';

    this.isSaving.set(true);
    const val: any = { ...this.vendorForm.value };
    const lines = (value: string) => String(value || '').split(/\r?\n/).map(row => row.trim()).filter(Boolean);
    val.supplied_categories = String(val.supplied_categories_text || '').split(',').map((row: string) => row.trim()).filter(Boolean);
    val.document_refs = lines(val.document_refs_text).map(line => {
      const [name, url, expiry_date] = line.split('|').map((part: string) => part.trim());
      return { name, url: url || name, expiry_date: expiry_date || null };
    });
    val.authorized_representatives = lines(val.authorized_representatives_text);
    val.references = lines(val.references_text);
    delete val.supplied_categories_text;
    delete val.document_refs_text;
    delete val.authorized_representatives_text;
    delete val.references_text;
    if (this.editingVendorId) {
      delete val.bank_name; delete val.bank_account_name; delete val.bank_account_number; delete val.bank_branch;
    }

    if (this.editingVendorId) {
      this.procurementService.updateVendor(this.editingVendorId, val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/procurement/vendors'], { state: { procurementNotice: 'Supplier updated successfully.' } });
        },
        error: (err) => { this.isSaving.set(false); this.errorMessage = err.error?.detail || 'Failed to update supplier.'; }
      });
    } else {
      this.procurementService.createVendor(val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/procurement/vendors'], { state: { procurementNotice: 'Supplier saved successfully.' } });
        },
        error: (err) => { this.isSaving.set(false); this.errorMessage = err.error?.detail || 'Failed to save supplier.'; }
      });
    }
  }

  workflowAction(vendor: Vendor): string {
    const actions: Record<string, string> = {
      PENDING_PROCUREMENT_REVIEW: 'PROCUREMENT_REVIEW', PENDING_FINANCE_VERIFICATION: 'FINANCE_VERIFY',
      PENDING_TECHNICAL_REVIEW: 'TECHNICAL_APPROVE', PENDING_MANAGEMENT_APPROVAL: 'APPROVE',
      RETURNED_FOR_REVISION: 'RESUBMIT', APPROVED: 'SUSPEND', SUSPENDED: 'REACTIVATE'
    };
    return actions[vendor.approval_status] || '';
  }

  workflowLabel(vendor: Vendor): string {
    return this.workflowAction(vendor).replaceAll('_', ' ');
  }

  expiryDate(vendor: Vendor): string | null {
    const dates = [vendor.trade_license_expiry_date, ...(vendor.document_refs || []).map(doc => doc.expiry_date)]
      .filter((value): value is string => !!value).sort();
    return dates[0] || null;
  }

  advanceWorkflow(vendor: Vendor, action = this.workflowAction(vendor)): void {
    const note = window.prompt(`Notes for ${action.replaceAll('_', ' ').toLowerCase()}:`, '');
    if (note === null) return;
    this.procurementService.vendorWorkflow(vendor.id, { action, notes: note }).subscribe({
      next: updated => {
        this.vendors.update(rows => rows.map(row => row.id === updated.id ? updated : row));
        if (this.historyVendor()?.id === updated.id) this.viewHistory(updated);
      },
      error: err => this.errorMessage = err.error?.detail || 'Vendor approval action failed.'
    });
  }

  viewHistory(vendor: Vendor): void {
    this.historyVendor.set(vendor);
    this.approvalHistory.set([]);
    this.procurementService.getVendorApprovalHistory(vendor.id).subscribe({
      next: rows => this.approvalHistory.set(rows || []),
      error: err => this.errorMessage = err.error?.detail || 'Unable to load vendor approval history.'
    });
  }

  deleteVendor(v: Vendor): void {
    if (!confirm(`Are you sure you want to delete supplier "${v.vendor_name}"?`)) return;
    this.procurementService.deleteVendor(v.id).subscribe({
      next: () => this.loadVendors(),
      error: (err) => this.errorMessage = err.error?.detail || 'Unable to suspend supplier.'
    });
  }
}
