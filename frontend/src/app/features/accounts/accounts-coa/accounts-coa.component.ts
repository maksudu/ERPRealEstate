import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsService } from '../../../core/services/accounts.service';
import { ChartOfAccount } from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-coa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './accounts-coa.component.html'
})
export class AccountsCoaComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private fb = inject(FormBuilder);

  coaList = signal<ChartOfAccount[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);

  filterType = signal<string>('');

  createForm: FormGroup = this.fb.group({
    account_code: ['', Validators.required],
    account_name_en: ['', Validators.required],
    account_name_bn: [''],
    account_type: ['Asset', Validators.required],
    is_leaf_account: [true]
  });

  accountTypeOptions = [
    { value: '', label: 'All Account Types' },
    { value: 'Asset', label: '1000 - Assets' },
    { value: 'Liability', label: '2000 - Liabilities' },
    { value: 'Equity', label: '3000 - Equity' },
    { value: 'Revenue', label: '4000 - Revenue' },
    { value: 'Expense', label: '5000 - Expenses' }
  ];

  typeSelectOptions = [
    { value: 'Asset', label: 'Asset (e.g. 1000)' },
    { value: 'Liability', label: 'Liability (e.g. 2000)' },
    { value: 'Equity', label: 'Equity (e.g. 3000)' },
    { value: 'Revenue', label: 'Revenue (e.g. 4000)' },
    { value: 'Expense', label: 'Expense (e.g. 5000)' }
  ];

  ngOnInit(): void {
    this.loadCOA();
  }

  loadCOA(): void {
    this.isLoading.set(true);
    this.accountsService.getCOA(this.filterType() || undefined).subscribe({
      next: (res) => {
        this.coaList.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load COA', err);
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadCOA();
  }

  openCreateModal(): void {
    this.createForm.reset({
      account_code: '',
      account_name_en: '',
      account_name_bn: '',
      account_type: 'Asset',
      is_leaf_account: true
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.accountsService.createAccount(this.createForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadCOA();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to create account');
        this.isSubmitting.set(false);
      }
    });
  }

  getTypeBadge(type: string): { bg: string; textCol: string; border: string } {
    switch (type) {
      case 'Asset':
        return { bg: 'bg-blue-50 dark:bg-blue-950/40', textCol: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' };
      case 'Liability':
        return { bg: 'bg-amber-50 dark:bg-amber-950/40', textCol: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' };
      case 'Equity':
        return { bg: 'bg-purple-50 dark:bg-purple-950/40', textCol: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' };
      case 'Revenue':
        return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', textCol: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' };
      default:
        return { bg: 'bg-rose-50 dark:bg-rose-950/40', textCol: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' };
    }
  }
}
