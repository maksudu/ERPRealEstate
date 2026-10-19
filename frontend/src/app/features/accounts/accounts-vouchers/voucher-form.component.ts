import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import { ChartOfAccount, CostCenter } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-voucher-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './voucher-form.component.html'
})
export class VoucherFormComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  coaList = signal<ChartOfAccount[]>([]);
  projects = signal<Project[]>([]);
  costCenters = signal<CostCenter[]>([]);

  voucherForm: FormGroup = this.fb.group({
    voucher_type: ['Journal', Validators.required],
    voucher_date: [new Date().toISOString().split('T')[0], Validators.required],
    project_id: [null],
    source_document_type: ['Manual'],
    source_document_id: [null],
    narration: ['', [Validators.required, Validators.minLength(5)]],
    entries: this.fb.array([])
  });

  voucherTypeOptions = [
    { value: 'Journal', label: 'Journal Voucher (JV) - Non-cash adjustments & accruals' },
    { value: 'Cash_Payment', label: 'Cash Payment Voucher (CP) - Direct cash disbursements' },
    { value: 'Cash_Receipt', label: 'Cash Receipt Voucher (CR) - Cash collections & sales' },
    { value: 'Bank_Payment', label: 'Bank Payment Voucher (BP) - Cheque / BEFTN / RTGS / EFT' },
    { value: 'Bank_Receipt', label: 'Bank Receipt Voucher (BR) - Bank deposit / transfer received' },
    { value: 'Contra', label: 'Contra Voucher (CV) - Bank-to-Cash / Inter-bank fund transfers' }
  ];

  sourceDocTypeOptions = [
    { value: 'Manual', label: 'Manual Direct Journal Entry' },
    { value: 'Supplier_Bill', label: 'Procurement / Supplier Bill' },
    { value: 'Contractor_Bill', label: 'Contractor RA / Work Order Bill' },
    { value: 'Customer_Booking', label: 'CRM Customer Booking & Installment' },
    { value: 'Land_Installment', label: 'Land Acquisition Agreement Payment' },
    { value: 'Payroll', label: 'Monthly Staff Salary & Wages Payroll' },
    { value: 'Fixed_Asset', label: 'Fixed Asset Capitalization & Depreciation' }
  ];

  projectOptions: { value: any; label: string }[] = [];
  costCenterOptions: { value: any; label: string }[] = [];
  accountOptions: { value: any; label: string }[] = [];

  get entries(): FormArray {
    return this.voucherForm.get('entries') as FormArray;
  }

  // Live computed double-entry totals
  totalDebit = signal<number>(0);
  totalCredit = signal<number>(0);
  difference = signal<number>(0);
  isBalanced = signal<boolean>(false);

  ngOnInit(): void {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.isLoading.set(true);

    // 1. Load Chart of Accounts
    this.accountsService.getCOA().subscribe({
      next: (accounts) => {
        this.coaList.set(accounts);
        // Map leaf accounts into options
        this.accountOptions = accounts
          .filter(a => a.is_leaf_account)
          .map(a => ({
            value: a.id,
            label: `${a.account_code} - ${a.account_name_en} (${a.account_type})`
          }));
        this.isLoading.set(false);

        // Ensure at least 2 default rows exist
        if (this.entries.length === 0) {
          this.addEntryLine();
          this.addEntryLine();
        }
      },
      error: (err) => {
        console.error('Failed to load COA', err);
        this.errorMessage.set('Failed to load Chart of Accounts.');
        this.isLoading.set(false);
      }
    });

    // 2. Load Projects
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = [
          { value: null, label: 'General / Head Office Corporate' },
          ...projs.map(p => ({
            value: p.id,
            label: `${p.project_name} (${p.project_code || 'PRJ'})`
          }))
        ];
      },
      error: (err) => console.error('Failed to load projects', err)
    });

    // 3. Load Cost Centers
    this.accountsService.getCostCenters().subscribe({
      next: (ccs) => {
        this.costCenters.set(ccs);
        this.costCenterOptions = [
          { value: null, label: 'No Specific Cost Center' },
          ...ccs.map(c => ({
            value: c.id,
            label: `${c.cost_center_code} - ${c.name}`
          }))
        ];
      },
      error: (err) => console.error('Failed to load cost centers', err)
    });

    // Subscribe to form value changes for live calculation
    this.voucherForm.valueChanges.subscribe(() => {
      this.recalculateTotals();
    });
  }

  createEntryGroup(initialDebit: number = 0, initialCredit: number = 0): FormGroup {
    return this.fb.group({
      account_id: [null, Validators.required],
      debit_amount: [initialDebit, [Validators.min(0)]],
      credit_amount: [initialCredit, [Validators.min(0)]],
      project_id: [null],
      cost_center_id: [null],
      cheque_no: [''],
      cheque_date: [null],
      bill_reference: [''],
      narration: ['']
    });
  }

  addEntryLine(debit: number = 0, credit: number = 0): void {
    const group = this.createEntryGroup(debit, credit);
    this.entries.push(group);
    this.recalculateTotals();
  }

  removeEntryLine(index: number): void {
    if (this.entries.length <= 2) {
      alert('A double-entry voucher requires at least two lines.');
      return;
    }
    this.entries.removeAt(index);
    this.recalculateTotals();
  }

  recalculateTotals(): void {
    let dr = 0;
    let cr = 0;

    for (let i = 0; i < this.entries.length; i++) {
      const line = this.entries.at(i).value;
      const d = parseFloat(line.debit_amount) || 0;
      const c = parseFloat(line.credit_amount) || 0;
      dr += d;
      cr += c;
    }

    this.totalDebit.set(Math.round(dr * 100) / 100);
    this.totalCredit.set(Math.round(cr * 100) / 100);
    const diff = Math.round(Math.abs(dr - cr) * 100) / 100;
    this.difference.set(diff);
    this.isBalanced.set(diff === 0 && dr > 0);
  }

  autoBalanceLine(): void {
    const dr = this.totalDebit();
    const cr = this.totalCredit();
    const diff = Math.round(Math.abs(dr - cr) * 100) / 100;

    if (diff === 0) return;

    if (dr > cr) {
      // Need credit
      this.addEntryLine(0, diff);
    } else {
      // Need debit
      this.addEntryLine(diff, 0);
    }
  }

  onSubmit(): void {
    this.recalculateTotals();

    if (!this.voucherForm.valid) {
      this.voucherForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all mandatory fields.');
      return;
    }

    if (this.entries.length < 2) {
      this.errorMessage.set('A double-entry voucher must contain at least 2 line items.');
      return;
    }

    if (!this.isBalanced()) {
      this.errorMessage.set(
        `Debits (৳ ${this.totalDebit().toLocaleString()}) must exactly equal Credits (৳ ${this.totalCredit().toLocaleString()}). Difference: ৳ ${this.difference().toLocaleString()}`
      );
      return;
    }

    // Verify all entries have account_id and non-zero amount
    const rawEntries = this.entries.value;
    for (let i = 0; i < rawEntries.length; i++) {
      const line = rawEntries[i];
      if (!line.account_id) {
        this.errorMessage.set(`Row #${i + 1} is missing an account.`);
        return;
      }
      const d = parseFloat(line.debit_amount) || 0;
      const c = parseFloat(line.credit_amount) || 0;
      if (d === 0 && c === 0) {
        this.errorMessage.set(`Row #${i + 1} must have either a Debit or a Credit amount.`);
        return;
      }
      if (d > 0 && c > 0) {
        this.errorMessage.set(`Row #${i + 1} cannot have both Debit and Credit amounts simultaneously.`);
        return;
      }
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const fv = this.voucherForm.value;
    const payload = {
      voucher_type: fv.voucher_type,
      voucher_date: fv.voucher_date,
      project_id: fv.project_id || null,
      source_document_type: fv.source_document_type || null,
      source_document_id: fv.source_document_id ? parseInt(fv.source_document_id, 10) : null,
      narration: fv.narration.trim(),
      entries: rawEntries.map((e: any) => ({
        account_id: parseInt(e.account_id, 10),
        debit_amount: parseFloat(e.debit_amount) || 0,
        credit_amount: parseFloat(e.credit_amount) || 0,
        project_id: e.project_id ? parseInt(e.project_id, 10) : null,
        cost_center_id: e.cost_center_id ? parseInt(e.cost_center_id, 10) : null,
        cheque_no: e.cheque_no ? e.cheque_no.trim() : null,
        cheque_date: e.cheque_date || null,
        bill_reference: e.bill_reference ? e.bill_reference.trim() : null,
        narration: e.narration ? e.narration.trim() : null
      }))
    };

    this.accountsService.createVoucher(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/accounts/vouchers/view', created.id]);
      },
      error: (err) => {
        console.error('Error creating voucher', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err.error?.detail || 'Failed to post voucher. Please ensure period is open and account balances are valid.'
        );
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/accounts/vouchers']);
  }
}
