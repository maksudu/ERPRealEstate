import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { APInvoice, ChartOfAccount } from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-payable-view',
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
  templateUrl: './payable-view.component.html'
})
export class PayableViewComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  invoiceId = signal<number | null>(null);
  invoice = signal<APInvoice | null>(null);
  isLoading = signal<boolean>(false);
  isSubmittingPayment = signal<boolean>(false);
  isApproving = signal<boolean>(false);
  showPaymentModal = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  bankAccounts = signal<ChartOfAccount[]>([]);
  bankAccountOptions: { value: any; label: string }[] = [];

  showIssueModal = signal<boolean>(false);
  isSubmittingIssue = signal<boolean>(false);

  issueForm: FormGroup = this.fb.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    issue_date: [new Date().toISOString().split('T')[0], Validators.required],
    issue_ref: ['MIF-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900), Validators.required],
    material_description: ['', Validators.required],
    cost_center: ['Structural Civil Work']
  });

  paymentMethodOptions = [
    { value: 'Bank_Transfer', label: 'Bank Transfer (BEFTN / RTGS / EFT)' },
    { value: 'Bank_Cheque', label: 'Account Payee Cheque' },
    { value: 'Cash', label: 'Petty Cash Voucher' },
    { value: 'Pay_Order', label: 'Bank Pay Order' }
  ];

  paymentForm: FormGroup = this.fb.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    payment_date: [new Date().toISOString().split('T')[0], Validators.required],
    payment_method: ['Bank_Transfer', Validators.required],
    bank_account_id: [null],
    cheque_number: [''],
    cheque_date: [null],
    transaction_reference: [''],
    notes: ['']
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = parseInt(idParam, 10);
        this.invoiceId.set(id);
        this.loadInvoice(id);
      }
    });

    this.loadBankAccounts();
  }

  loadInvoice(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountsService.getAPInvoiceById(id).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.paymentForm.patchValue({ amount: inv.balance_due });
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load AP invoice', err);
        this.errorMessage.set('Invoice not found or network error.');
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
        if (banks.length > 0) {
          this.paymentForm.patchValue({ bank_account_id: banks[0].id });
        }
      },
      error: (err) => console.error('Failed to load bank accounts', err)
    });
  }

  approveInvoice(): void {
    const id = this.invoiceId();
    if (!id) return;

    this.isApproving.set(true);
    this.errorMessage.set(null);

    this.accountsService.approveAPInvoice(id).subscribe({
      next: (updated) => {
        this.isApproving.set(false);
        this.invoice.set(updated);
        this.successMessage.set('Invoice approved and GL accrual voucher successfully posted.');
      },
      error: (err) => {
        console.error('Failed to approve invoice', err);
        this.isApproving.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to approve invoice.');
      }
    });
  }

  openPaymentModal(): void {
    const inv = this.invoice();
    if (!inv) return;
    this.paymentForm.patchValue({
      amount: inv.balance_due,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Bank_Transfer'
    });
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    this.showPaymentModal.set(false);
  }

  submitDisbursement(): void {
    const inv = this.invoice();
    if (!inv) return;

    if (!this.paymentForm.valid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const amt = parseFloat(this.paymentForm.get('amount')?.value) || 0;
    if (amt <= 0 || amt > inv.balance_due + 0.01) {
      alert(`Disbursement amount must be between ৳ 0.01 and ৳ ${inv.balance_due.toLocaleString()}`);
      return;
    }

    this.isSubmittingPayment.set(true);
    const fv = this.paymentForm.value;
    const payload = {
      amount: amt,
      payment_date: fv.payment_date,
      payment_method: fv.payment_method,
      bank_account_id: fv.bank_account_id || null,
      cheque_number: fv.cheque_number ? fv.cheque_number.trim() : null,
      cheque_date: fv.cheque_date || null,
      transaction_reference: fv.transaction_reference ? fv.transaction_reference.trim() : null,
      notes: fv.notes ? fv.notes.trim() : null
    };

    this.accountsService.recordAPPayment(inv.id, payload).subscribe({
      next: () => {
        this.isSubmittingPayment.set(false);
        this.showPaymentModal.set(false);
        this.successMessage.set(`Disbursement of ৳ ${amt.toLocaleString()} recorded and GL Payment Voucher posted.`);
        this.loadInvoice(inv.id);
      },
      error: (err) => {
        console.error('Failed to disburse payment', err);
        this.isSubmittingPayment.set(false);
        alert(err.error?.detail || 'Failed to record payment disbursement.');
      }
    });
  }

  openIssueModal(): void {
    const inv = this.invoice();
    if (!inv) return;
    this.issueForm.patchValue({
      amount: inv.net_payable_amount || inv.gross_amount,
      issue_date: new Date().toISOString().split('T')[0],
      issue_ref: 'MIF-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
      material_description: `Materials from invoice ${inv.invoice_number} (${inv.vendor_name || inv.payee_name || 'Supplier'}) issued to construction`,
      cost_center: 'Tower A Civil Works'
    });
    this.showIssueModal.set(true);
  }

  closeIssueModal(): void {
    this.showIssueModal.set(false);
  }

  submitMaterialIssue(): void {
    const inv = this.invoice();
    if (!inv || !inv.project_id) return;

    if (!this.issueForm.valid) {
      this.issueForm.markAllAsTouched();
      return;
    }

    const amt = parseFloat(this.issueForm.get('amount')?.value) || 0;
    if (amt <= 0) {
      alert('Issue amount must be greater than ৳ 0.');
      return;
    }

    this.isSubmittingIssue.set(true);
    const fv = this.issueForm.value;
    const payload = {
      project_id: inv.project_id,
      amount: amt,
      issue_date: fv.issue_date,
      issue_slip_number: fv.issue_ref ? fv.issue_ref.trim() : null,
      materials_description: fv.material_description.trim()
    };

    this.accountsService.issueMaterialToConstruction(payload).subscribe({
      next: (res) => {
        this.isSubmittingIssue.set(false);
        this.showIssueModal.set(false);
        this.successMessage.set(
          `Success: ৳ ${amt.toLocaleString()} transferred from Project Inventory (1400) to CWIP (1220). Journal Voucher: ${res.voucher_number}`
        );
        this.loadInvoice(inv.id);
      },
      error: (err) => {
        console.error('Failed to issue materials to construction', err);
        this.isSubmittingIssue.set(false);
        alert(err.error?.detail || 'Failed to issue materials to construction.');
      }
    });
  }

  printRemittance(): void {
    window.print();
  }

  backToList(): void {
    this.router.navigate(['/accounts/payables']);
  }
}
