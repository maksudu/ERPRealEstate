import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AccountsService } from '../../../core/services/accounts.service';
import { ChartOfAccount, BankReconciliationFullResponse, BankStatementRow } from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-bank-reconciliation',
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
  templateUrl: './accounts-bank-reconciliation.component.html'
})
export class AccountsBankReconciliationComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private fb = inject(FormBuilder);

  bankAccounts = signal<ChartOfAccount[]>([]);
  reconciliationResult = signal<BankReconciliationFullResponse | null>(null);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  reconForm: FormGroup = this.fb.group({
    bank_account_id: [null, Validators.required],
    statement_date: [new Date().toISOString().split('T')[0], Validators.required],
    statement_balance: [null, [Validators.required]],
    rows: this.fb.array([])
  });

  get rowsArray(): FormArray {
    return this.reconForm.get('rows') as FormArray;
  }

  bankAccountOptions = computed(() =>
    this.bankAccounts().map(b => ({
      value: b.id,
      label: `${b.account_code} - ${b.account_name_en} (Current Book: ৳${Number(b.current_balance || 0).toLocaleString()})`
    }))
  );

  selectedBankBalance = computed(() => {
    const id = this.reconForm.get('bank_account_id')?.value;
    const acc = this.bankAccounts().find(a => a.id === id);
    return acc ? acc.current_balance : 0.00;
  });

  ngOnInit(): void {
    this.loadBankAccounts();
    this.loadSampleStatementRows();
  }

  loadBankAccounts(): void {
    this.accountsService.getCOA('Asset').subscribe({
      next: (res) => {
        const banks = res.filter(a =>
          a.account_name_en.toLowerCase().includes('bank') ||
          a.account_name_en.toLowerCase().includes('escrow') ||
          a.account_name_en.toLowerCase().includes('bkash')
        );
        this.bankAccounts.set(banks.length ? banks : res);
        if (banks.length) {
          this.reconForm.patchValue({ bank_account_id: banks[0].id });
        }
      },
      error: (err) => console.error('Failed to load bank accounts', err)
    });
  }

  addRow(dateStr?: string, ref?: string, desc?: string, dr: number = 0, cr: number = 0): void {
    const group = this.fb.group({
      transaction_date: [dateStr || new Date().toISOString().split('T')[0], Validators.required],
      reference_no: [ref || ''],
      description: [desc || '', Validators.required],
      debit_amount: [dr, [Validators.min(0)]],
      credit_amount: [cr, [Validators.min(0)]]
    });
    this.rowsArray.push(group);
  }

  removeRow(index: number): void {
    if (this.rowsArray.length > 1) {
      this.rowsArray.removeAt(index);
    }
  }

  loadSampleStatementRows(): void {
    this.rowsArray.clear();
    const today = new Date().toISOString().split('T')[0];
    this.addRow(today, 'RTGS-2026-991', 'Customer Apartment Installment RTGS', 0.00, 2500000.00);
    this.addRow(today, 'CHQ-8821', 'Steel Vendor Cheque Clearing (BSRM Ltd)', 850000.00, 0.00);
    this.addRow(today, 'NPSB-4412', 'Site Petty Cash replenishment ATM', 50000.00, 0.00);
    this.addRow(today, 'INT-CREDIT', 'Quarterly Escrow Deposit Interest Yield', 0.00, 42150.00);
  }

  runAutoMatch(): void {
    if (this.reconForm.invalid) {
      this.reconForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.reconForm.value;
    const payload = {
      bank_account_id: Number(formVal.bank_account_id),
      statement_date: formVal.statement_date,
      statement_balance: Number(formVal.statement_balance || 0),
      rows: formVal.rows as BankStatementRow[]
    };

    this.accountsService.autoMatchBankStatement(payload).subscribe({
      next: (res) => {
        this.reconciliationResult.set(res);
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Failed to auto-match bank statement', err);
        this.isSubmitting.set(false);
      }
    });
  }
}
