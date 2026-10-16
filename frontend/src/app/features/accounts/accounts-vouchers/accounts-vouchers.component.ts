import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import { Voucher, ChartOfAccount } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-vouchers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './accounts-vouchers.component.html'
})
export class AccountsVouchersComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  vouchers = signal<Voucher[]>([]);
  coaList = signal<ChartOfAccount[]>([]);
  projects = signal<Project[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);

  // Filters
  filterType = signal<string>('');
  filterStatus = signal<string>('');

  createForm: FormGroup = this.fb.group({
    voucher_type: ['Journal', Validators.required],
    project_id: [null],
    voucher_date: [new Date().toISOString().split('T')[0], Validators.required],
    narration: ['', Validators.required],
    entries: this.fb.array([])
  });

  get entriesArray(): FormArray {
    return this.createForm.get('entries') as FormArray;
  }

  voucherTypeOptions = [
    { value: '', label: 'All Voucher Types' },
    { value: 'Journal', label: 'Journal Voucher (JV)' },
    { value: 'Cash_Payment', label: 'Cash Payment (CP)' },
    { value: 'Cash_Receipt', label: 'Cash Receipt (CR)' },
    { value: 'Bank_Payment', label: 'Bank Payment (BP)' },
    { value: 'Bank_Receipt', label: 'Bank Receipt (BR)' },
    { value: 'Contra', label: 'Contra Voucher (CV)' }
  ];

  typeCreateOptions = [
    { value: 'Journal', label: 'Journal Voucher (JV)' },
    { value: 'Cash_Payment', label: 'Cash Payment (CP)' },
    { value: 'Cash_Receipt', label: 'Cash Receipt (CR)' },
    { value: 'Bank_Payment', label: 'Bank Payment (BP)' },
    { value: 'Bank_Receipt', label: 'Bank Receipt (BR)' },
    { value: 'Contra', label: 'Contra Voucher (CV)' }
  ];

  statusFilterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Posted', label: 'Posted' },
    { value: 'Reversed', label: 'Reversed' }
  ];

  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  );

  accountOptions = computed(() =>
    this.coaList().map(a => ({
      value: a.id,
      label: `${a.account_code} - ${a.account_name_en} (${a.account_type})`
    }))
  );

  computedTotalDebit = computed(() => {
    // dynamically compute from form array values
    const entries = this.createForm.get('entries')?.value || [];
    return entries.reduce((sum: number, e: any) => sum + (parseFloat(e.debit_amount) || 0), 0);
  });

  computedTotalCredit = computed(() => {
    const entries = this.createForm.get('entries')?.value || [];
    return entries.reduce((sum: number, e: any) => sum + (parseFloat(e.credit_amount) || 0), 0);
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadCOA();
    this.loadVouchers();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadCOA(): void {
    this.accountsService.getCOA().subscribe({
      next: (res) => this.coaList.set(res),
      error: (err) => console.error('Failed to load COA', err)
    });
  }

  loadVouchers(): void {
    this.isLoading.set(true);
    const filter: any = {};
    if (this.filterType()) filter.voucher_type = this.filterType();
    if (this.filterStatus()) filter.status_filter = this.filterStatus();

    this.accountsService.getVouchers(filter).subscribe({
      next: (res) => {
        this.vouchers.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load vouchers', err);
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadVouchers();
  }

  openCreateModal(): void {
    this.entriesArray.clear();
    this.createForm.reset({
      voucher_type: 'Journal',
      project_id: this.projects().length ? this.projects()[0].id : null,
      voucher_date: new Date().toISOString().split('T')[0],
      narration: ''
    });

    // Seed 2 initial balanced lines
    this.addEntryLine(0, 0);
    this.addEntryLine(0, 0);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  addEntryLine(defaultDebit: number = 0, defaultCredit: number = 0): void {
    const defaultAccId = this.coaList().length > this.entriesArray.length ? this.coaList()[this.entriesArray.length].id : (this.coaList().length ? this.coaList()[0].id : null);
    const group = this.fb.group({
      account_id: [defaultAccId, Validators.required],
      debit_amount: [defaultDebit, [Validators.min(0)]],
      credit_amount: [defaultCredit, [Validators.min(0)]],
      narration: ['']
    });
    this.entriesArray.push(group);
  }

  removeEntryLine(index: number): void {
    if (this.entriesArray.length > 2) {
      this.entriesArray.removeAt(index);
    }
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const val = this.createForm.value;
    const dr = val.entries.reduce((sum: number, e: any) => sum + (parseFloat(e.debit_amount) || 0), 0);
    const cr = val.entries.reduce((sum: number, e: any) => sum + (parseFloat(e.credit_amount) || 0), 0);

    if (Math.abs(dr - cr) > 0.01) {
      alert(`Double-entry balance violation! Total Debit (৳${dr.toFixed(2)}) must equal Total Credit (৳${cr.toFixed(2)}).`);
      return;
    }

    this.isSubmitting.set(true);
    this.accountsService.createVoucher(val).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadVouchers();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to post voucher');
        this.isSubmitting.set(false);
      }
    });
  }

  reverseVoucher(v: Voucher): void {
    if (!confirm(`Are you sure you want to reverse voucher ${v.voucher_number}? This will post an exact offsetting reversal voucher.`)) {
      return;
    }
    this.accountsService.reverseVoucher(v.id).subscribe({
      next: () => {
        this.loadVouchers();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to reverse voucher');
      }
    });
  }

  getStatusBadge(status: string): { bg: string; textCol: string; border: string } {
    switch (status) {
      case 'Posted':
        return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', textCol: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300' };
      case 'Reversed':
        return { bg: 'bg-rose-50 dark:bg-rose-950/40', textCol: 'text-rose-700 dark:text-rose-300 font-semibold', border: 'border-rose-300' };
      default:
        return { bg: 'bg-blue-50 dark:bg-blue-950/40', textCol: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300' };
    }
  }
}
