import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountsService } from '../../../../core/services/accounts.service';
import { LookupService } from '../../../../core/services/lookup.service';
import { ProjectService } from '../../../../core/services/project.service';
import { CrmService } from '../../../../core/services/crm.service';
import {
  ARInvoice,
  ChartOfAccount
} from '../../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-receipt-form',
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
  templateUrl: './receipt-form.component.html'
})
export class ReceiptFormComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private lookupService = inject(LookupService);
  private projectService = inject(ProjectService);
  private crmService = inject(CrmService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Dynamic Options
  customerOptions: { value: any; label: string }[] = [];
  projectOptions: { value: any; label: string }[] = [];
  bankAccountOptions: { value: any; label: string }[] = [];
  methodOptions: { value: any; label: string }[] = [];

  // Customer's open invoices for multi-allocation
  outstandingInvoices = signal<ARInvoice[]>([]);
  isLoadingInvoices = signal<boolean>(false);

  // Mode: 'split_allocation' or 'advance_only'
  allocationMode: 'split_allocation' | 'advance_only' = 'split_allocation';

  receiptForm: FormGroup = this.fb.group({
    customer_id: [null, [Validators.required]],
    project_id: [null],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    receipt_date: [new Date().toISOString().split('T')[0], [Validators.required]],
    status: ['Cleared', [Validators.required]], // 'Cleared' or 'Recorded'
    collection_method: ['Bank_Transfer', [Validators.required]],
    bank_account_id: [null],
    bank_name: [''],
    cheque_number: [''],
    cheque_date: [''],
    transaction_reference: [''],
    notes: [''],
    allocations: this.fb.array([])
  });

  get allocationsArray(): FormArray {
    return this.receiptForm.get('allocations') as FormArray;
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadProjects();
    this.loadCustomers();
    this.loadBankAccounts();

    // Watch customer change to load open demand notices
    this.receiptForm.get('customer_id')?.valueChanges.subscribe(cid => {
      if (cid) {
        this.loadCustomerInvoices(cid);
      } else {
        this.outstandingInvoices.set([]);
        this.clearAllocations();
      }
    });
  }

  loadLookups(): void {
    this.lookupService.getItems('AR_COLLECTION_METHOD').subscribe({
      next: (items) => {
        this.methodOptions = items.map(i => ({ value: i.item_code, label: i.item_name_en }));
      },
      error: () => {
        this.methodOptions = [
          { value: 'Bank_Transfer', label: 'Bank Transfer (BEFTN/RTGS/NPSB)' },
          { value: 'Bank_Cheque', label: 'Account Payee Cheque / Clearing' },
          { value: 'Pay_Order', label: 'Bank Pay Order' },
          { value: 'Cash', label: 'Cash Deposit' }
        ];
      }
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projects: any) => {
        const list = Array.isArray(projects) ? projects : (projects?.data || []);
        this.projectOptions = [
          { value: null, label: 'Corporate / Unassigned' },
          ...list.map((p: any) => ({ value: p.id, label: p.project_name }))
        ];
      },
      error: err => console.warn('Failed to load projects', err)
    });
  }

  loadCustomers(): void {
    this.crmService.getCustomers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.customerOptions = list.map((c: any) => ({
          value: c.id,
          label: `${c.full_name_en} (${c.phone || c.id})`
        }));
      },
      error: err => console.warn('Failed to load customers', err)
    });
  }

  loadBankAccounts(): void {
    this.accountsService.getCOA({ account_type: 'Asset' }).subscribe({
      next: (accounts) => {
        const banks = accounts.filter(a => a.account_code.startsWith('111') || a.account_code.startsWith('112') || a.is_reconciliation_account);
        this.bankAccountOptions = banks.map(b => ({
          value: b.id,
          label: `${b.account_code} - ${b.account_name_en}`
        }));
        if (banks.length > 0) {
          this.receiptForm.patchValue({ bank_account_id: banks[0].id });
        }
      },
      error: err => console.warn('Failed to load bank accounts', err)
    });
  }

  loadCustomerInvoices(customerId: number): void {
    this.isLoadingInvoices.set(true);
    this.accountsService.getCustomerOutstandingInvoices(customerId).subscribe({
      next: (invoices) => {
        this.outstandingInvoices.set(invoices);
        this.initAllocationsFormArray(invoices);
        this.isLoadingInvoices.set(false);
      },
      error: (err) => {
        console.warn('Failed to load customer open invoices', err);
        this.outstandingInvoices.set([]);
        this.isLoadingInvoices.set(false);
      }
    });
  }

  initAllocationsFormArray(invoices: ARInvoice[]): void {
    this.clearAllocations();
    invoices.forEach(inv => {
      this.allocationsArray.push(this.fb.group({
        invoice_id: [inv.id],
        invoice_number: [inv.invoice_number],
        milestone_title: [inv.description || inv.invoice_type],
        balance_due: [inv.balance_due],
        allocated_amount: [0],
        selected: [false]
      }));
    });
  }

  clearAllocations(): void {
    while (this.allocationsArray.length !== 0) {
      this.allocationsArray.removeAt(0);
    }
  }

  // Toggle invoice row selection
  toggleInvoiceSelection(index: number): void {
    const group = this.allocationsArray.at(index);
    const isSelected = !group.get('selected')?.value;
    group.patchValue({ selected: isSelected });

    if (isSelected) {
      // Auto-fill up to remaining receipt balance or invoice due
      const balDue = group.get('balance_due')?.value || 0;
      const unallocated = this.getRemainingUnallocated();
      const fillAmount = Math.min(balDue, Math.max(unallocated, 0));
      group.patchValue({ allocated_amount: fillAmount });
    } else {
      group.patchValue({ allocated_amount: 0 });
    }
  }

  getTotalAllocated(): number {
    let sum = 0;
    this.allocationsArray.controls.forEach(c => {
      if (c.get('selected')?.value) {
        sum += parseFloat(c.get('allocated_amount')?.value) || 0;
      }
    });
    return roundNumber(sum, 2);
  }

  getRemainingUnallocated(): number {
    const totalAmount = parseFloat(this.receiptForm.get('amount')?.value) || 0;
    const allocated = this.getTotalAllocated();
    return roundNumber(totalAmount - allocated, 2);
  }

  onSubmit(): void {
    if (!this.receiptForm.valid) {
      this.receiptForm.markAllAsTouched();
      return;
    }

    const totalAmt = parseFloat(this.receiptForm.get('amount')?.value) || 0;
    const totalAlloc = this.getTotalAllocated();

    if (this.allocationMode === 'split_allocation' && totalAlloc > totalAmt + 0.009) {
      alert(`Total allocated (৳ ${totalAlloc.toLocaleString()}) cannot exceed receipt amount (৳ ${totalAmt.toLocaleString()})!`);
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const fv = this.receiptForm.value;

    // Build allocation payload
    const allocationPayload = [];
    if (this.allocationMode === 'split_allocation') {
      for (const c of this.allocationsArray.controls) {
        if (c.get('selected')?.value) {
          const amt = parseFloat(c.get('allocated_amount')?.value) || 0;
          if (amt > 0) {
            allocationPayload.push({
              invoice_id: c.get('invoice_id')?.value,
              allocated_amount: amt,
              notes: `Allocated to ${c.get('invoice_number')?.value}`
            });
          }
        }
      }
    }

    const payload = {
      customer_id: fv.customer_id,
      project_id: fv.project_id || null,
      amount: totalAmt,
      receipt_date: fv.receipt_date,
      status: fv.status,
      collection_method: fv.collection_method,
      bank_account_id: fv.bank_account_id || null,
      bank_name: fv.bank_name ? fv.bank_name.trim() : null,
      cheque_number: fv.cheque_number ? fv.cheque_number.trim() : null,
      cheque_date: fv.cheque_date || null,
      transaction_reference: fv.transaction_reference ? fv.transaction_reference.trim() : null,
      notes: fv.notes ? fv.notes.trim() : null,
      allocations: allocationPayload.length > 0 ? allocationPayload : null
    };

    this.accountsService.createCustomerReceipt(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/accounts/receivables/receipts/view', res.id]);
      },
      error: (err) => {
        console.error('Failed to create customer receipt', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to record customer money receipt.');
      }
    });
  }
}

function roundNumber(num: number, decimals: number): number {
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
}
