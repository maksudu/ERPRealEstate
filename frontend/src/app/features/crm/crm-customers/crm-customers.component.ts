import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService, CustomerTableFilters } from '../../../core/services/crm.service';
import { Customer } from '../../../core/models/crm.model';

@Component({
  selector: 'app-crm-customers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './crm-customers.component.html'
})
export class CrmCustomersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  customers = signal<Customer[]>([]);
  total = signal(0);
  limit = signal(20);
  offset = signal(0);
  isLoading = signal(false);
  isDeleting = signal<number | null>(null);

  // Merge modal
  mergeModalOpen = signal(false);
  mergeSource = signal<Customer | null>(null);
  mergeTargetId = signal<number | null>(null);
  mergeReason = signal('');
  mergeError = signal<string | null>(null);
  isMerging = signal(false);

  deleteModalOpen = signal(false);
  deleteTarget = signal<Customer | null>(null);

  readonly LOOKUP = {
    customerType: 'CRM_CUSTOMER_TYPE',
    language: 'CRM_LANGUAGE',
    contactMethod: 'CRM_CONTACT_METHOD'
  };

  readonly typeOptions = [
    { value: 'ALL', label: 'All Customer Types' },
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'COMPANY', label: 'Company' },
    { value: 'INVESTOR', label: 'Investor' },
    { value: 'NRB', label: 'NRB' },
    { value: 'OTHER', label: 'Other' }
  ];

  readonly nrbOptions = [
    { value: 'ALL', label: 'All Residencies' },
    { value: 'true', label: 'NRB (Non-Resident)' },
    { value: 'false', label: 'Resident Bangladeshi' }
  ];

  readonly sortOptions = [
    { value: 'created_at_desc', label: 'Newest Registered' },
    { value: 'created_at_asc', label: 'Oldest Registered' },
    { value: 'full_name_en_asc', label: 'Name (A to Z)' },
    { value: 'customer_code_asc', label: 'Code (A to Z)' }
  ];

  filterForm: FormGroup = this.fb.group({
    search: [''],
    customer_type: ['ALL'],
    is_nrb: ['ALL'],
    sort_by: ['created_at_desc']
  });

  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
  fromRow = computed(() => (this.total() === 0 ? 0 : this.offset() + 1));
  toRow = computed(() => Math.min(this.offset() + this.limit(), this.total()));

  mergeTargets = computed(() => this.customers().filter(c => c.id !== this.mergeSource()?.id));
  mergeTargetOptions = computed(() =>
    this.mergeTargets().map(c => ({
      value: String(c.id),
      label: `${c.full_name_en} (${c.customer_code} · ${c.primary_phone})`
    }))
  );
  mergeTargetValue = computed(() => (this.mergeTargetId() ? String(this.mergeTargetId()) : null));

  ngOnInit(): void {
    this.loadTable();

    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.applyFilters());

    this.filterForm.get('search')!.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.applyFilters());
  }

  private buildFilters(): CustomerTableFilters {
    const v = this.filterForm.value;
    const filters: CustomerTableFilters = {
      limit: this.limit(),
      offset: this.offset(),
      sort_by: v.sort_by || 'created_at_desc'
    };
    if (v.search?.trim()) filters.search = v.search.trim();
    if (v.customer_type && v.customer_type !== 'ALL') filters.customer_type = v.customer_type;
    if (v.is_nrb === 'true') filters.is_nrb = true;
    else if (v.is_nrb === 'false') filters.is_nrb = false;
    return filters;
  }

  loadTable(): void {
    this.isLoading.set(true);
    this.crmService.loadCustomersTable(this.buildFilters()).subscribe({
      next: (res) => {
        this.customers.set(res.items || []);
        this.total.set(res.total || 0);
        this.limit.set(res.limit || 20);
        this.offset.set(res.offset || 0);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  applyFilters(): void {
    this.offset.set(0);
    this.loadTable();
  }

  setPage(page: number): void {
    const newOffset = (page - 1) * this.limit();
    if (newOffset < 0 || newOffset >= this.total()) return;
    this.offset.set(newOffset);
    this.loadTable();
  }

  createCustomer(): void {
    this.router.navigate(['/crm/customers/new']);
  }

  viewDossier(c: Customer): void {
    this.router.navigate(['/crm/customers', c.id]);
  }

  editCustomer(c: Customer): void {
    this.router.navigate(['/crm/customers', c.id, 'edit']);
  }

  openDelete(c: Customer): void {
    this.deleteTarget.set(c);
    this.deleteModalOpen.set(true);
  }

  confirmDelete(): void {
    const c = this.deleteTarget();
    if (!c) return;
    this.isDeleting.set(c.id);
    this.crmService.deleteCustomer(c.id).subscribe({
      next: () => {
        this.isDeleting.set(null);
        this.deleteModalOpen.set(false);
        this.deleteTarget.set(null);
        this.loadTable();
      },
      error: () => this.isDeleting.set(null)
    });
  }

  openMerge(c: Customer): void {
    this.mergeSource.set(c);
    this.mergeTargetId.set(null);
    this.mergeReason.set('');
    this.mergeError.set(null);
    this.mergeModalOpen.set(true);
  }

  confirmMerge(): void {
    const src = this.mergeSource();
    const tgt = this.mergeTargetId();
    if (!src || !tgt) {
      this.mergeError.set('Select a target (survivor) customer.');
      return;
    }
    this.isMerging.set(true);
    this.mergeError.set(null);
    this.crmService.mergeCustomers({
      source_customer_id: src.id,
      target_customer_id: tgt,
      merge_reason: this.mergeReason() || undefined
    }).subscribe({
      next: () => {
        this.isMerging.set(false);
        this.mergeModalOpen.set(false);
        this.loadTable();
      },
      error: (err) => {
        this.isMerging.set(false);
        this.mergeError.set(err?.error?.detail || 'Merge failed.');
      }
    });
  }

  refresh(): void {
    this.loadTable();
  }

  nomineeShareTotal(c: Customer): number {
    return (c.nominees || []).reduce((sum, n) => sum + (Number(n.share_percentage) || 0), 0);
  }
}
