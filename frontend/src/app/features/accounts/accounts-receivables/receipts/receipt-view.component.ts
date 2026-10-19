import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../../core/services/accounts.service';
import {
  ARReceipt,
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
  selector: 'app-receipt-view',
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
  templateUrl: './receipt-view.component.html'
})
export class ReceiptViewComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  receiptId = signal<number | null>(null);
  receipt = signal<ARReceipt | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Modals
  showAllocateModal = signal<boolean>(false);
  isSubmittingAllocation = signal<boolean>(false);
  customerOutstandingInvoices = signal<ARInvoice[]>([]);
  isLoadingOpenInvoices = signal<boolean>(false);

  showVerifyModal = signal<boolean>(false);
  isSubmittingVerify = signal<boolean>(false);

  showReverseModal = signal<boolean>(false);
  isSubmittingReverse = signal<boolean>(false);

  showRefundModal = signal<boolean>(false);
  isSubmittingRefund = signal<boolean>(false);

  bankAccounts = signal<ChartOfAccount[]>([]);
  bankAccountOptions: { value: any; label: string }[] = [];

  // Form for Multi-Invoice Allocation
  allocationForm: FormGroup = this.fb.group({
    allocation_date: [new Date().toISOString().split('T')[0], Validators.required],
    allocations: this.fb.array([])
  });

  // Form for Verify Funds
  verifyForm: FormGroup = this.fb.group({
    cleared_date: [new Date().toISOString().split('T')[0], Validators.required],
    bank_account_id: [null],
    transaction_reference: [''],
    notes: ['']
  });

  // Form for Reversal
  reverseForm: FormGroup = this.fb.group({
    reversal_reason: ['', Validators.required],
    reversal_date: [new Date().toISOString().split('T')[0], Validators.required],
    notes: ['']
  });

  // Form for Refund
  refundForm: FormGroup = this.fb.group({
    refund_amount: [0, [Validators.required, Validators.min(0.01)]],
    bank_account_id: [null],
    refund_reason: ['', Validators.required],
    refund_date: [new Date().toISOString().split('T')[0], Validators.required],
    cheque_or_ref: ['']
  });

  get allocationLinesArray(): FormArray {
    return this.allocationForm.get('allocations') as FormArray;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = parseInt(idParam, 10);
        this.receiptId.set(id);
        this.loadReceipt(id);
      }
    });

    this.loadBankAccounts();
  }

  loadReceipt(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountsService.getARReceiptById(id).subscribe({
      next: (rcpt) => {
        this.receipt.set(rcpt);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load money receipt', err);
        this.errorMessage.set('Money Receipt not found or network error.');
        this.isLoading.set(false);
      }
    });
  }

  loadBankAccounts(): void {
    this.accountsService.getCOA({ account_type: 'Asset' }).subscribe({
      next: (accounts) => {
        const banks = accounts.filter(a => a.account_code.startsWith('111') || a.account_code.startsWith('112') || a.is_reconciliation_account);
        this.bankAccounts.set(banks);
        this.bankAccountOptions = banks.map(b => ({
          value: b.id,
          label: `${b.account_code} - ${b.account_name_en}`
        }));
      },
      error: err => console.warn('Failed to load banks', err)
    });
  }

  // --- Modal Openers ---

  openAllocateModal(): void {
    const rcpt = this.receipt();
    if (!rcpt || !rcpt.customer_id) return;

    this.isLoadingOpenInvoices.set(true);
    this.accountsService.getCustomerOutstandingInvoices(rcpt.customer_id).subscribe({
      next: (invoices) => {
        this.customerOutstandingInvoices.set(invoices);
        this.initAllocationModalArray(invoices);
        this.isLoadingOpenInvoices.set(false);
        this.showAllocateModal.set(true);
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to fetch customer outstanding invoices.');
        this.isLoadingOpenInvoices.set(false);
      }
    });
  }

  initAllocationModalArray(invoices: ARInvoice[]): void {
    while (this.allocationLinesArray.length !== 0) {
      this.allocationLinesArray.removeAt(0);
    }

    invoices.forEach(inv => {
      this.allocationLinesArray.push(this.fb.group({
        invoice_id: [inv.id],
        invoice_number: [inv.invoice_number],
        milestone_title: [inv.description || inv.invoice_type],
        balance_due: [inv.balance_due],
        allocated_amount: [0],
        selected: [false]
      }));
    });
  }

  toggleModalInvoiceSelection(index: number): void {
    const group = this.allocationLinesArray.at(index);
    const isSelected = !group.get('selected')?.value;
    group.patchValue({ selected: isSelected });

    const rcpt = this.receipt();
    if (!rcpt) return;

    if (isSelected) {
      const balDue = group.get('balance_due')?.value || 0;
      const unallocated = this.getModalRemainingUnallocated();
      const fillAmount = Math.min(balDue, Math.max(unallocated, 0));
      group.patchValue({ allocated_amount: fillAmount });
    } else {
      group.patchValue({ allocated_amount: 0 });
    }
  }

  getModalTotalAllocated(): number {
    let sum = 0;
    this.allocationLinesArray.controls.forEach(c => {
      if (c.get('selected')?.value) {
        sum += parseFloat(c.get('allocated_amount')?.value) || 0;
      }
    });
    return roundNumber(sum, 2);
  }

  getModalRemainingUnallocated(): number {
    const rcpt = this.receipt();
    const currentUnalloc = rcpt ? rcpt.unallocated_amount : 0;
    const allocated = this.getModalTotalAllocated();
    return roundNumber(currentUnalloc - allocated, 2);
  }

  submitAllocation(): void {
    const rcpt = this.receipt();
    if (!rcpt) return;

    const totalAlloc = this.getModalTotalAllocated();
    if (totalAlloc <= 0) {
      alert('Please select at least one invoice and specify allocation amount.');
      return;
    }

    if (totalAlloc > rcpt.unallocated_amount + 0.009) {
      alert(`Total allocation (৳ ${totalAlloc.toLocaleString()}) exceeds unallocated balance (৳ ${rcpt.unallocated_amount.toLocaleString()})!`);
      return;
    }

    this.isSubmittingAllocation.set(true);

    const allocationsPayload = [];
    for (const c of this.allocationLinesArray.controls) {
      if (c.get('selected')?.value) {
        const amt = parseFloat(c.get('allocated_amount')?.value) || 0;
        if (amt > 0) {
          allocationsPayload.push({
            invoice_id: c.get('invoice_id')?.value,
            allocated_amount: amt,
            notes: `Allocated to ${c.get('invoice_number')?.value}`
          });
        }
      }
    }

    this.accountsService.allocateARReceipt(rcpt.id, {
      allocation_date: this.allocationForm.get('allocation_date')?.value,
      allocations: allocationsPayload
    }).subscribe({
      next: (updated) => {
        this.isSubmittingAllocation.set(false);
        this.showAllocateModal.set(false);
        this.receipt.set(updated);
        this.successMessage.set(`Successfully allocated ৳ ${totalAlloc.toLocaleString()} across ${allocationsPayload.length} invoice(s). Advance Clearing JV posted.`);
      },
      error: (err) => {
        console.error('Failed to allocate receipt', err);
        this.isSubmittingAllocation.set(false);
        alert(err.error?.detail || 'Failed to allocate receipt.');
      }
    });
  }

  // Verify modal
  openVerifyModal(): void {
    const rcpt = this.receipt();
    if (!rcpt) return;
    this.verifyForm.patchValue({
      cleared_date: new Date().toISOString().split('T')[0],
      bank_account_id: rcpt.bank_account_id,
      transaction_reference: rcpt.transaction_reference || ''
    });
    this.showVerifyModal.set(true);
  }

  submitVerify(): void {
    const rcpt = this.receipt();
    if (!rcpt) return;

    this.isSubmittingVerify.set(true);
    this.accountsService.verifyAndClearARReceipt(rcpt.id, this.verifyForm.value).subscribe({
      next: (updated) => {
        this.isSubmittingVerify.set(false);
        this.showVerifyModal.set(false);
        this.receipt.set(updated);
        this.successMessage.set(`Receipt #${rcpt.receipt_number} verified and cleared. GL Receipt Voucher successfully posted.`);
      },
      error: (err) => {
        console.error('Failed to verify receipt', err);
        this.isSubmittingVerify.set(false);
        alert(err.error?.detail || 'Failed to verify receipt.');
      }
    });
  }

  // Reverse modal
  openReverseModal(): void {
    this.reverseForm.reset({
      reversal_date: new Date().toISOString().split('T')[0],
      reversal_reason: '',
      notes: ''
    });
    this.showReverseModal.set(true);
  }

  submitReverse(): void {
    const rcpt = this.receipt();
    if (!rcpt) return;

    if (!this.reverseForm.valid) {
      this.reverseForm.markAllAsTouched();
      return;
    }

    if (!confirm(`Warning: Are you sure you want to REVERSE Money Receipt ${rcpt.receipt_number}? All invoice allocations will be restored and a Reversal JV posted.`)) {
      return;
    }

    this.isSubmittingReverse.set(true);
    this.accountsService.reverseARReceipt(rcpt.id, this.reverseForm.value).subscribe({
      next: (updated) => {
        this.isSubmittingReverse.set(false);
        this.showReverseModal.set(false);
        this.receipt.set(updated);
        this.successMessage.set(`Receipt #${rcpt.receipt_number} reversed. Invoice balances restored and Reversal JV posted.`);
      },
      error: (err) => {
        console.error('Failed to reverse receipt', err);
        this.isSubmittingReverse.set(false);
        alert(err.error?.detail || 'Failed to reverse receipt.');
      }
    });
  }

  // Refund modal
  openRefundModal(): void {
    const rcpt = this.receipt();
    if (!rcpt) return;
    this.refundForm.patchValue({
      refund_amount: rcpt.unallocated_amount,
      refund_date: new Date().toISOString().split('T')[0],
      refund_reason: 'Customer advance cash refund'
    });
    this.showRefundModal.set(true);
  }

  submitRefund(): void {
    const rcpt = this.receipt();
    if (!rcpt) return;

    if (!this.refundForm.valid) {
      this.refundForm.markAllAsTouched();
      return;
    }

    this.isSubmittingRefund.set(true);
    this.accountsService.refundARReceipt(rcpt.id, this.refundForm.value).subscribe({
      next: (updated) => {
        this.isSubmittingRefund.set(false);
        this.showRefundModal.set(false);
        this.receipt.set(updated);
        this.successMessage.set(`Advance refund recorded and GL Payment Voucher posted.`);
      },
      error: (err) => {
        console.error('Failed to refund receipt', err);
        this.isSubmittingRefund.set(false);
        alert(err.error?.detail || 'Failed to refund advance.');
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Recorded':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'Cleared':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'Allocated':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'Partially_Allocated':
        return 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20';
      case 'Unallocated':
        return 'bg-purple-500/10 text-purple-600 border border-purple-500/20';
      case 'Reversed':
        return 'bg-destructive/10 text-destructive border border-destructive/20';
      case 'Refunded':
        return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
      default:
        return 'bg-secondary text-secondary-foreground border border-border';
    }
  }

  printReceipt(): void {
    window.print();
  }

  backToList(): void {
    this.router.navigate(['/accounts/receivables/receipts']);
  }
}

function roundNumber(num: number, decimals: number): number {
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
}
