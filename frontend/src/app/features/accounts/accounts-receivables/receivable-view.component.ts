import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ARInvoice, ChartOfAccount } from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-receivable-view',
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
  templateUrl: './receivable-view.component.html'
})
export class ReceivableViewComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  invoiceId = signal<number | null>(null);
  invoice = signal<ARInvoice | null>(null);
  isLoading = signal<boolean>(false);
  isSubmittingReceipt = signal<boolean>(false);
  isSubmittingAdjustment = signal<boolean>(false);
  isUpdatingFollowup = signal<boolean>(false);

  showReceiptModal = signal<boolean>(false);
  showAdjustmentModal = signal<boolean>(false);
  showFollowupModal = signal<boolean>(false);

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  bankAccounts = signal<ChartOfAccount[]>([]);
  bankAccountOptions: { value: any; label: string }[] = [];

  collectionMethodOptions = [
    { value: 'Bank_Transfer', label: 'Bank Transfer (BEFTN / RTGS / NPSB)' },
    { value: 'Bank_Cheque', label: 'Account Payee Cheque / Clearing' },
    { value: 'Pay_Order', label: 'Bank Pay Order' },
    { value: 'Cash', label: 'Cash Deposit' },
    { value: 'Card_POS', label: 'Credit / Debit Card POS' },
    { value: 'Digital_Wallet', label: 'MFS (bKash / Nagad)' }
  ];

  adjustmentTypeOptions = [
    { value: 'Credit_Note', label: 'Credit Note (Contractual Concession / Rebate)' },
    { value: 'Late_Fee_Waiver', label: 'Late Fee / Interest Penalty Waiver' },
    { value: 'Debit_Note_Penalty', label: 'Debit Note (Additional Late Surcharge)' },
    { value: 'Dispute_Settlement', label: 'Dispute Resolution Settlement' },
    { value: 'Write_Off', label: 'Bad Debt Write-Off' }
  ];

  receiptForm: FormGroup = this.fb.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    receipt_date: [new Date().toISOString().split('T')[0], Validators.required],
    collection_method: ['Bank_Transfer', Validators.required],
    bank_account_id: [null],
    bank_name: [''],
    cheque_number: [''],
    cheque_date: [''],
    transaction_reference: [''],
    notes: ['']
  });

  adjustmentForm: FormGroup = this.fb.group({
    adjustment_type: ['Credit_Note', Validators.required],
    adjustment_date: [new Date().toISOString().split('T')[0], Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    reason: ['', [Validators.required, Validators.minLength(3)]]
  });

  followupForm: FormGroup = this.fb.group({
    collection_followup_status: ['Reminder_Sent', Validators.required],
    followup_notes: ['']
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        this.invoiceId.set(Number(idStr));
        this.loadInvoiceDetails();
        this.loadBankAccounts();
      }
    });
  }

  loadInvoiceDetails(): void {
    const id = this.invoiceId();
    if (!id) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountsService.getARInvoiceById(id).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.receiptForm.patchValue({
          amount: inv.balance_due > 0 ? inv.balance_due : 0
        });
        this.followupForm.patchValue({
          collection_followup_status: inv.collection_followup_status || 'Reminder_Sent',
          followup_notes: inv.followup_notes || ''
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load AR Invoice:', err);
        this.errorMessage.set(err.error?.detail || 'Failed to load Demand Notice.');
        this.isLoading.set(false);
      }
    });
  }

  loadBankAccounts(): void {
    this.accountsService.getCOAHierarchy().subscribe({
      next: (tree) => {
        const banks: ChartOfAccount[] = [];
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (node.is_leaf_account && (node.is_reconciliation_account || node.account_code.startsWith('1110') || node.account_code.startsWith('1120') || node.account_name_en.toLowerCase().includes('bank') || node.account_name_en.toLowerCase().includes('cash'))) {
              banks.push(node);
            }
            if (node.children) traverse(node.children);
          }
        };
        traverse(tree);
        this.bankAccounts.set(banks);
        this.bankAccountOptions = banks.map(b => ({
          value: b.id,
          label: `${b.account_code} - ${b.account_name_en}`
        }));

        if (banks.length > 0) {
          this.receiptForm.patchValue({ bank_account_id: banks[0].id });
        }
      },
      error: (err) => console.warn('Failed to load bank accounts:', err)
    });
  }

  openReceiptModal(): void {
    const inv = this.invoice();
    if (!inv) return;
    this.receiptForm.patchValue({
      amount: inv.balance_due > 0 ? inv.balance_due : 0,
      receipt_date: new Date().toISOString().split('T')[0]
    });
    this.showReceiptModal.set(true);
  }

  submitReceipt(): void {
    if (this.receiptForm.invalid) {
      this.receiptForm.markAllAsTouched();
      return;
    }

    const id = this.invoiceId();
    if (!id) return;

    this.isSubmittingReceipt.set(true);
    const val = this.receiptForm.value;
    const payload = {
      amount: parseFloat(val.amount),
      receipt_date: val.receipt_date,
      collection_method: val.collection_method,
      bank_account_id: val.bank_account_id ? Number(val.bank_account_id) : null,
      bank_name: val.bank_name?.trim() || null,
      cheque_number: val.cheque_number?.trim() || null,
      cheque_date: val.cheque_date || null,
      transaction_reference: val.transaction_reference?.trim() || null,
      notes: val.notes?.trim() || null
    };

    this.accountsService.recordARReceipt(id, payload).subscribe({
      next: () => {
        this.isSubmittingReceipt.set(false);
        this.showReceiptModal.set(false);
        this.successMessage.set('Money Receipt recorded and GL receipt voucher posted successfully.');
        setTimeout(() => this.successMessage.set(null), 4000);
        this.loadInvoiceDetails();
      },
      error: (err) => {
        console.error('Failed to record receipt:', err);
        alert(err.error?.detail || 'Failed to record receipt.');
        this.isSubmittingReceipt.set(false);
      }
    });
  }

  submitAdjustment(): void {
    if (this.adjustmentForm.invalid) {
      this.adjustmentForm.markAllAsTouched();
      return;
    }

    const id = this.invoiceId();
    if (!id) return;

    this.isSubmittingAdjustment.set(true);
    const val = this.adjustmentForm.value;
    const payload = {
      adjustment_type: val.adjustment_type,
      adjustment_date: val.adjustment_date,
      customer_id: this.invoice()?.customer_id || 1,
      amount: parseFloat(val.amount),
      reason: val.reason.trim()
    };

    this.accountsService.recordARAdjustment(id, payload).subscribe({
      next: () => {
        this.isSubmittingAdjustment.set(false);
        this.showAdjustmentModal.set(false);
        this.successMessage.set('Adjustment recorded and invoice balance updated.');
        setTimeout(() => this.successMessage.set(null), 4000);
        this.loadInvoiceDetails();
      },
      error: (err) => {
        console.error('Failed to record adjustment:', err);
        alert(err.error?.detail || 'Failed to record adjustment.');
        this.isSubmittingAdjustment.set(false);
      }
    });
  }

  submitFollowup(): void {
    const id = this.invoiceId();
    if (!id) return;

    this.isUpdatingFollowup.set(true);
    const val = this.followupForm.value;

    this.accountsService.updateARInvoice(id, {
      collection_followup_status: val.collection_followup_status,
      followup_notes: val.followup_notes
    }).subscribe({
      next: () => {
        this.isUpdatingFollowup.set(false);
        this.showFollowupModal.set(false);
        this.successMessage.set('Follow-up status updated successfully.');
        setTimeout(() => this.successMessage.set(null), 4000);
        this.loadInvoiceDetails();
      },
      error: (err) => {
        console.error('Failed to update follow-up:', err);
        alert(err.error?.detail || 'Failed to update follow-up status.');
        this.isUpdatingFollowup.set(false);
      }
    });
  }

  printDemandNotice(): void {
    window.print();
  }
}
