import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { LookupService } from '../../../core/services/lookup.service';
import { ProjectService } from '../../../core/services/project.service';
import { ProcurementService } from '../../../core/services/procurement.service';
import {
  PaymentVoucher,
  BankAccount,
  CashBox,
  MFSProvider,
  ChartOfAccount
} from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-payment-voucher-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent
  ],
  templateUrl: './payment-voucher-form.component.html'
})
export class PaymentVoucherFormComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private lookupService = inject(LookupService);
  private projectService = inject(ProjectService);
  private procurementService = inject(ProcurementService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  voucherId = signal<number | null>(null);
  isEditMode = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Form Fields
  voucher_date = signal<string>(new Date().toISOString().split('T')[0]);
  project_id = signal<number | null>(null);
  payee_type = signal<string>('Vendor');
  payee_vendor_id = signal<number | null>(null);
  payee_name_direct = signal<string>('');
  payment_method = signal<string>('Bank_Transfer');
  source_cashbox_id = signal<number | null>(null);
  source_bank_account_id = signal<number | null>(null);
  source_mfs_provider_id = signal<number | null>(null);
  cheque_number = signal<string>('');
  cheque_date = signal<string>('');
  settlement_reference = signal<string>('');
  amount = signal<number>(25000);
  currency = signal<string>('BDT');
  debit_category = signal<string>('Expense');
  debit_account_id = signal<number | null>(null);
  credit_account_id = signal<number | null>(null);
  ap_invoice_id = signal<number | null>(null);
  supporting_invoice_ref = signal<string>('');
  purpose = signal<string>('Office Utility & Administrative Expense');
  narration = signal<string>('Payment for valid office expense via designated bank account.');
  attachment_url = signal<string>('');

  // Dropdown Lists
  projectOptions = signal<SelectOption[]>([]);
  vendorOptions = signal<SelectOption[]>([]);
  methodOptions = signal<SelectOption[]>([
    { value: 'Bank_Transfer', label: 'Bank Transfer (EFT/BEFTN/RTGS)', subLabel: 'Electronic bank settlement' },
    { value: 'Cheque', label: 'Cheque Payment', subLabel: 'Cheque issue & clearing lifecycle' },
    { value: 'Cash', label: 'Cash Payment', subLabel: 'Imprest Cashbox outflow' },
    { value: 'MFS', label: 'Mobile Financial Services', subLabel: 'bKash / Nagad / Rocket' },
    { value: 'Card', label: 'Corporate Card', subLabel: 'Debit / Credit card outflow' }
  ]);
  categoryOptions = signal<SelectOption[]>([
    { value: 'Expense', label: 'Administrative & Office Expense', subLabel: 'Direct Dr. Expense / Cr. Bank' },
    { value: 'Payable', label: 'Supplier / Subcontractor Payable', subLabel: 'Liquidates AP Bill (No duplicate expense)' },
    { value: 'Asset_CWIP', label: 'Construction CWIP / Fixed Asset', subLabel: 'Capitalizable development outflow' },
    { value: 'Advance', label: 'Advance / Security Deposit', subLabel: 'Supplier advance / prepayments' },
    { value: 'Inventory', label: 'Direct Site Inventory Material', subLabel: 'Stores inventory purchase' }
  ]);
  payeeTypeOptions = signal<SelectOption[]>([
    { value: 'Vendor', label: 'Registered Vendor / Supplier', subLabel: 'Select from Vendor Master' },
    { value: 'Subcontractor', label: 'Civil / MEP Subcontractor', subLabel: 'Contractor ledger claim' },
    { value: 'Employee', label: 'Employee / Staff Member', subLabel: 'Reimbursement / Imprest replenishment' },
    { value: 'Direct', label: 'Direct Payee / Landlord / Utility', subLabel: 'Enter payee name directly' },
    { value: 'Other', label: 'Other Authorized Beneficiary', subLabel: 'General outgoing' }
  ]);
  cashboxOptions = signal<SelectOption[]>([]);
  bankAccountOptions = signal<SelectOption[]>([]);
  mfsOptions = signal<SelectOption[]>([]);
  coaOptions = signal<SelectOption[]>([]);
  apInvoiceOptions = signal<SelectOption[]>([]);

  // Notifications
  errorMessage = signal<string | null>(null);

  // Live Double-Entry Computation
  previewDebitAccountLabel = computed(() => {
    if (this.debit_account_id()) {
      const match = this.coaOptions().find(c => c.value === this.debit_account_id());
      if (match) return match.label;
    }
    if (this.debit_category() === 'Payable') {
      return '[2100] Accounts Payable (Vendors) — Liquidates Liability';
    } else if (this.debit_category() === 'Asset_CWIP') {
      return '[1500] Construction Work-in-Progress (CWIP)';
    } else if (this.debit_category() === 'Advance') {
      return '[1300] Advances & Prepayments (Asset)';
    } else {
      return '[5200] Office & Administrative Expenses (Direct Expense)';
    }
  });

  previewCreditAccountLabel = computed(() => {
    if (this.credit_account_id()) {
      const match = this.coaOptions().find(c => c.value === this.credit_account_id());
      if (match) return match.label;
    }
    if (this.payment_method() === 'Cash') {
      if (this.source_cashbox_id()) {
        const box = this.cashboxOptions().find(b => b.value === this.source_cashbox_id());
        return `[1100] Cash in Hand — ${box?.label || 'Cashbox'}`;
      }
      return '[1100] Cash in Hand (Asset)';
    } else if (this.payment_method() === 'MFS') {
      if (this.source_mfs_provider_id()) {
        const mfs = this.mfsOptions().find(m => m.value === this.source_mfs_provider_id());
        return `[1120] MFS Wallet — ${mfs?.label || 'Provider'}`;
      }
      return '[1120] Mobile Financial Services (Asset)';
    } else {
      if (this.source_bank_account_id()) {
        const b = this.bankAccountOptions().find(x => x.value === this.source_bank_account_id());
        return `[1110] Bank Account — ${b?.label || 'Corporate Bank'}`;
      }
      return '[1110] Corporate Bank Account (Asset)';
    }
  });

  ngOnInit(): void {
    this.loadAllLookupSources();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.voucherId.set(Number(idParam));
      this.isEditMode.set(true);
      this.loadExistingVoucher(Number(idParam));
    }
  }

  loadAllLookupSources(): void {
    // 1. Projects
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projectOptions.set(projects.map(p => ({
          value: p.id,
          label: p.project_name,
          subLabel: p.site_address || `Code: ${p.project_code || p.id}`
        })));
      },
      error: () => {}
    });

    // 2. Vendors
    this.procurementService.getVendors().subscribe({
      next: (vendors) => {
        this.vendorOptions.set(vendors.map(v => ({
          value: v.id,
          label: v.vendor_name,
          subLabel: v.trade_category || v.phone_number || undefined
        })));
      },
      error: () => {}
    });

    // 3. Bank Accounts
    this.accountsService.getBankAccounts({ is_active: true }).subscribe({
      next: (banks) => {
        this.bankAccountOptions.set(banks.map(b => ({
          value: b.id,
          label: `${b.bank_name} (${b.branch_name || 'Main'})`,
          subLabel: `A/C: ${b.account_number_masked || b.account_number} | Bal: ৳${(b.current_balance || 0).toLocaleString()}`
        })));
        if (!this.isEditMode() && banks.length > 0 && !this.source_bank_account_id()) {
          this.source_bank_account_id.set(banks[0].id);
        }
      },
      error: () => {}
    });

    // 4. Cashboxes
    this.accountsService.getCashBoxes().subscribe({
      next: (boxes) => {
        this.cashboxOptions.set(boxes.map(bx => ({
          value: bx.id,
          label: bx.box_name,
          subLabel: `Custodian: ${bx.custodian_name || 'Site Office'} | Bal: ৳${(bx.current_balance || 0).toLocaleString()}`
        })));
        if (!this.isEditMode() && boxes.length > 0 && !this.source_cashbox_id()) {
          this.source_cashbox_id.set(boxes[0].id);
        }
      },
      error: () => {}
    });

    // 5. MFS Providers
    this.accountsService.getMFSProviders(true).subscribe({
      next: (mfsList) => {
        this.mfsOptions.set(mfsList.map(m => ({
          value: m.id,
          label: `${m.provider_name} (${m.provider_code})`,
          subLabel: `Merchant A/C: ${m.merchant_number || 'Merchant'} | Vol: ৳${(m.total_gross_volume || 0).toLocaleString()}`
        })));
        if (!this.isEditMode() && mfsList.length > 0 && !this.source_mfs_provider_id()) {
          this.source_mfs_provider_id.set(mfsList[0].id);
        }
      },
      error: () => {}
    });

    // 6. Chart of Accounts (COA)
    this.accountsService.getCOA({ is_leaf_account: true, limit: 300 }).subscribe({
      next: (accounts) => {
        this.coaOptions.set(accounts.map(acc => ({
          value: acc.id,
          label: `[${acc.account_code}] ${acc.account_name_en}`,
          subLabel: `${acc.account_type} | Bal: ৳${(acc.current_balance || 0).toLocaleString()}`
        })));
      },
      error: () => {}
    });

    // 7. Dynamic Lookups
    this.lookupService.getItems('PAYMENT_METHOD').subscribe({
      next: (items) => {
        if (items?.length) {
          this.methodOptions.set(items.map(it => ({
            value: it.item_code,
            label: it.item_name_en,
            subLabel: it.item_name_bn || undefined
          })));
        }
      },
      error: () => {}
    });

    this.lookupService.getItems('PAYMENT_DEBIT_CATEGORY').subscribe({
      next: (items) => {
        if (items?.length) {
          this.categoryOptions.set(items.map(it => ({
            value: it.item_code,
            label: it.item_name_en,
            subLabel: it.item_name_bn || undefined
          })));
        }
      },
      error: () => {}
    });

    this.lookupService.getItems('PAYEE_TYPE').subscribe({
      next: (items) => {
        if (items?.length) {
          this.payeeTypeOptions.set(items.map(it => ({
            value: it.item_code,
            label: it.item_name_en,
            subLabel: it.item_name_bn || undefined
          })));
        }
      },
      error: () => {}
    });

    // 8. Load AP Invoices
    this.loadAPInvoices();
  }

  loadAPInvoices(): void {
    this.accountsService.getAPInvoices({ limit: 100 }).subscribe({
      next: (invoices) => {
        this.apInvoiceOptions.set(invoices.map(inv => ({
          value: inv.id,
          label: `${inv.invoice_number} — ${inv.payee_name || 'Vendor'} (Total: ৳${(inv.net_payable_amount || inv.gross_amount || 0).toLocaleString()})`,
          subLabel: `Status: ${inv.status} | Paid: ৳${(inv.paid_amount || 0).toLocaleString()}`
        })));
      },
      error: () => {}
    });
  }

  loadExistingVoucher(id: number): void {
    this.isLoading.set(true);
    this.accountsService.getPaymentVoucherById(id).subscribe({
      next: (v) => {
        this.voucher_date.set(v.voucher_date);
        this.project_id.set(v.project_id || null);
        this.payee_type.set(v.payee_type);
        this.payee_vendor_id.set(v.payee_vendor_id || null);
        this.payee_name_direct.set(v.payee_name_direct || '');
        this.payment_method.set(v.payment_method);
        this.source_cashbox_id.set(v.source_cashbox_id || null);
        this.source_bank_account_id.set(v.source_bank_account_id || null);
        this.source_mfs_provider_id.set(v.source_mfs_provider_id || null);
        this.cheque_number.set(v.cheque_number || '');
        this.cheque_date.set(v.cheque_date || '');
        this.settlement_reference.set(v.settlement_reference || '');
        this.amount.set(v.amount);
        this.currency.set(v.currency || 'BDT');
        this.debit_category.set(v.debit_category);
        this.debit_account_id.set(v.debit_account_id || null);
        this.credit_account_id.set(v.credit_account_id || null);
        this.ap_invoice_id.set(v.ap_invoice_id || null);
        this.supporting_invoice_ref.set(v.supporting_invoice_ref || '');
        this.purpose.set(v.purpose || '');
        this.narration.set(v.narration || '');
        this.attachment_url.set(v.attachment_url || '');
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to load existing voucher for editing.');
      }
    });
  }

  // Pre-load prompt example: "Office Expense ৳25,000 paid by Bank"
  loadOfficeExpenseExample(): void {
    this.debit_category.set('Expense');
    this.amount.set(25000);
    this.payment_method.set('Bank_Transfer');
    this.payee_type.set('Direct');
    this.payee_name_direct.set('Metropolitan Utility & Office Admin');
    this.purpose.set('Office Administrative & Utility Expense');
    this.narration.set('Payment for monthly office administrative expenses paid directly from corporate bank account.');
    this.supporting_invoice_ref.set('BILL-OFFICE-2026/04');
    this.ap_invoice_id.set(null);
  }

  // Pre-load prompt example: "Supplier Payable Settlement ৳150,000"
  loadSupplierPayableExample(): void {
    this.debit_category.set('Payable');
    this.amount.set(150000);
    this.payment_method.set('Cheque');
    this.payee_type.set('Vendor');
    this.cheque_number.set('CHQ-884920');
    this.cheque_date.set(new Date().toISOString().split('T')[0]);
    this.purpose.set('Settlement of Vendor AP Bill (Prevents Duplicate Expense)');
    this.narration.set('Payment to vendor against verified AP invoice. Debiting Payable liability to avoid double recognition.');
    this.supporting_invoice_ref.set('INV-STEEL-5591');
    if (this.vendorOptions().length > 0) {
      this.payee_vendor_id.set(this.vendorOptions()[0].value);
    }
    if (this.apInvoiceOptions().length > 0) {
      this.ap_invoice_id.set(this.apInvoiceOptions()[0].value);
    }
  }

  onPayeeVendorSelected(vendorId: number): void {
    this.payee_vendor_id.set(vendorId);
    const vendor = this.vendorOptions().find(v => v.value === vendorId);
    if (vendor && !this.payee_name_direct()) {
      this.payee_name_direct.set(vendor.label);
    }
  }

  onAPInvoiceSelected(invoiceId: number): void {
    this.ap_invoice_id.set(invoiceId);
    const invoice = this.apInvoiceOptions().find(i => i.value === invoiceId);
    if (invoice && !this.supporting_invoice_ref()) {
      this.supporting_invoice_ref.set(invoice.label.split('—')[0].trim());
    }
  }

  saveVoucher(): void {
    this.errorMessage.set(null);

    // Basic Validations
    if (!this.amount() || this.amount() <= 0) {
      this.errorMessage.set('Amount must be greater than ৳0.00.');
      return;
    }

    if (this.payee_type() === 'Vendor' && !this.payee_vendor_id() && !this.payee_name_direct()) {
      this.errorMessage.set('Please select a Vendor or provide Payee Name.');
      return;
    }

    if (this.payment_method() === 'Cash' && !this.source_cashbox_id()) {
      this.errorMessage.set('Please select a source Cashbox for Cash payments.');
      return;
    }

    if (['Bank_Transfer', 'Cheque', 'Card'].includes(this.payment_method()) && !this.source_bank_account_id()) {
      this.errorMessage.set('Please select a source Bank Account.');
      return;
    }

    if (this.payment_method() === 'MFS' && !this.source_mfs_provider_id()) {
      this.errorMessage.set('Please select a source MFS Provider.');
      return;
    }

    this.isSaving.set(true);

    const payload: any = {
      voucher_date: this.voucher_date(),
      project_id: this.project_id() || null,
      payee_type: this.payee_type(),
      payee_vendor_id: this.payee_vendor_id() || null,
      payee_name_direct: this.payee_name_direct() || null,
      payment_method: this.payment_method(),
      source_cashbox_id: this.payment_method() === 'Cash' ? this.source_cashbox_id() : null,
      source_bank_account_id: ['Bank_Transfer', 'Cheque', 'Card'].includes(this.payment_method()) ? this.source_bank_account_id() : null,
      source_mfs_provider_id: this.payment_method() === 'MFS' ? this.source_mfs_provider_id() : null,
      cheque_number: this.cheque_number() || null,
      cheque_date: this.cheque_date() || null,
      settlement_reference: this.settlement_reference() || null,
      amount: this.amount(),
      currency: this.currency() || 'BDT',
      debit_category: this.debit_category(),
      debit_account_id: this.debit_account_id() || null,
      credit_account_id: this.credit_account_id() || null,
      ap_invoice_id: this.debit_category() === 'Payable' ? (this.ap_invoice_id() || null) : null,
      supporting_invoice_ref: this.supporting_invoice_ref() || null,
      purpose: this.purpose() || null,
      narration: this.narration() || null,
      attachment_url: this.attachment_url() || null
    };

    if (this.isEditMode() && this.voucherId()) {
      this.accountsService.updatePaymentVoucher(this.voucherId()!, payload).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.router.navigate(['/accounts/payment-vouchers/view', updated.id]);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.detail || 'Failed to update payment voucher.');
        }
      });
    } else {
      this.accountsService.createPaymentVoucher(payload).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.router.navigate(['/accounts/payment-vouchers/view', created.id]);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.detail || 'Failed to create payment voucher.');
        }
      });
    }
  }
}
