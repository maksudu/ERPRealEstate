import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ChartOfAccount } from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-coa-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './coa-form.component.html'
})
export class CoaFormComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  accountId = signal<number | null>(null);
  isEditMode = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  existingAccounts = signal<ChartOfAccount[]>([]);
  parentAccountOptions: { value: any; label: string }[] = [];

  accountGroupOptions = [
    { value: 'Asset', label: '1000 - Assets (Cash, Bank, Receivables, WIP, Fixed Assets)' },
    { value: 'Liability', label: '2000 - Liabilities (Supplier Payables, Customer Advances, Loans)' },
    { value: 'Equity', label: '3000 - Equity (Share Capital, Retained Earnings, Reserves)' },
    { value: 'Revenue', label: '4000 - Revenue (Property Sales, Rental Income, Service Income)' },
    { value: 'Cost_of_Sales', label: '5000 - Cost of Sales (Cost of Properties & Units Sold)' },
    { value: 'Project_Expense', label: '6100 - Project Expenses (Construction, Design, Site Costs)' },
    { value: 'Operating_Expense', label: '6200 - Operating Expenses (Salaries, Office, Admin)' },
    { value: 'Finance_Cost', label: '6400 - Finance Costs (Interest, Bank Charges)' },
    { value: 'Other_Income_Expense', label: '6500 - Other Income / Expenses (Gains, Losses, Misc)' }
  ];

  normalBalanceOptions = [
    { value: 'Debit', label: 'Debit (Dr.) - Normal for Assets & Expenses' },
    { value: 'Credit', label: 'Credit (Cr.) - Normal for Liabilities, Equity & Revenue' }
  ];

  statementMappingOptions = [
    { value: 'Balance Sheet', label: 'Balance Sheet (Statement of Financial Position)' },
    { value: 'Income Statement', label: 'Income Statement (Profit & Loss / Comprehensive Income)' },
    { value: 'Cash Flow', label: 'Statement of Cash Flows' },
    { value: 'Notes to Accounts', label: 'Disclosures & Notes to Accounts' }
  ];

  accountForm: FormGroup = this.fb.group({
    account_code: ['', [Validators.required, Validators.pattern(/^[0-9A-Za-z\-_]+$/)]],
    account_name_en: ['', Validators.required],
    account_name_bn: [''],
    account_type: ['Asset', Validators.required],
    parent_account_id: [null],
    normal_balance: ['Debit', Validators.required],
    statement_mapping: ['Balance Sheet', Validators.required],
    currency: ['BDT', Validators.required],
    opening_balance: [0, [Validators.min(0)]],
    migration_reference: [''],
    is_leaf_account: [true],
    is_control_account: [false],
    is_reconciliation_account: [false],
    requires_project: [false],
    requires_cost_center: [false],
    is_active: [true]
  });

  ngOnInit(): void {
    this.loadParentAccounts();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.accountId.set(Number(idParam));
      this.isEditMode.set(true);
      this.loadAccountData(Number(idParam));
    } else {
      // Check for parent query param from COA tree
      const parentParam = this.route.snapshot.queryParamMap.get('parent_id');
      const typeParam = this.route.snapshot.queryParamMap.get('type');
      if (parentParam) {
        this.accountForm.patchValue({
          parent_account_id: Number(parentParam),
          account_type: typeParam || 'Asset'
        });
        this.onTypeChange(typeParam || 'Asset');
      }
    }
  }

  loadParentAccounts(): void {
    this.accountsService.getCOA({ is_leaf_account: false }).subscribe({
      next: (list) => {
        this.existingAccounts.set(list);
        this.parentAccountOptions = [
          { value: null, label: 'None (Top-Level Head of Account)' },
          ...list.map(a => ({
            value: a.id,
            label: `${a.account_code} - ${a.account_name_en} (${a.account_type})`
          }))
        ];
      }
    });
  }

  loadAccountData(id: number): void {
    this.isLoading.set(true);
    this.accountsService.getAccountById(id).subscribe({
      next: (acc) => {
        this.accountForm.patchValue({
          account_code: acc.account_code,
          account_name_en: acc.account_name_en,
          account_name_bn: acc.account_name_bn || '',
          account_type: acc.account_type,
          parent_account_id: acc.parent_account_id,
          normal_balance: acc.normal_balance || 'Debit',
          statement_mapping: acc.statement_mapping || 'Balance Sheet',
          currency: acc.currency || 'BDT',
          opening_balance: acc.opening_balance || 0,
          migration_reference: acc.migration_reference || '',
          is_leaf_account: acc.is_leaf_account,
          is_control_account: acc.is_control_account || false,
          is_reconciliation_account: acc.is_reconciliation_account || false,
          requires_project: acc.requires_project || false,
          requires_cost_center: acc.requires_cost_center || false,
          is_active: acc.is_active
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Failed to load account head details.');
        this.isLoading.set(false);
      }
    });
  }

  onTypeChange(type: string): void {
    if (['Asset', 'Expense', 'Project_Expense', 'Cost_of_Sales', 'Operating_Expense', 'Finance_Cost'].includes(type)) {
      this.accountForm.patchValue({ normal_balance: 'Debit' });
    } else {
      this.accountForm.patchValue({ normal_balance: 'Credit' });
    }

    if (['Asset', 'Liability', 'Equity'].includes(type)) {
      this.accountForm.patchValue({ statement_mapping: 'Balance Sheet' });
    } else {
      this.accountForm.patchValue({ statement_mapping: 'Income Statement' });
    }
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = this.accountForm.value;

    if (this.isEditMode() && this.accountId()) {
      this.accountsService.updateAccount(this.accountId()!, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/accounts/coa']);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Failed to update account head.');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.accountsService.createAccount(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/accounts/coa']);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Failed to create account head.');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/accounts/coa']);
  }
}
