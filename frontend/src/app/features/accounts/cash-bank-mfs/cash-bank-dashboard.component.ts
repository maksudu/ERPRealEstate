import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { LookupService } from '../../../core/services/lookup.service';
import { ProjectService } from '../../../core/services/project.service';
import { CrmService } from '../../../core/services/crm.service';
import {
  CashBankPositionKPIs,
  CashBox,
  PettyCashVoucher,
  BankAccount,
  BankTransaction,
  ChequeLeafItem,
  MFSProvider,
  MFSTransaction
} from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  CustomTextareaComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-cash-bank-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    CustomTextareaComponent,
    SearchableSelectComponent
  ],
  templateUrl: './cash-bank-dashboard.component.html'
})
export class CashBankDashboardComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private lookupService = inject(LookupService);
  private projectService = inject(ProjectService);
  private crmService = inject(CrmService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Active Tab
  activeTab = signal<'overview' | 'cash' | 'bank' | 'mfs'>('overview');

  // Reactive State
  kpis = signal<CashBankPositionKPIs | null>(null);
  cashBoxes = signal<CashBox[]>([]);
  cashVouchers = signal<PettyCashVoucher[]>([]);
  bankAccounts = signal<BankAccount[]>([]);
  bankTransactions = signal<BankTransaction[]>([]);
  chequeLeaves = signal<ChequeLeafItem[]>([]);
  mfsProviders = signal<MFSProvider[]>([]);
  mfsTransactions = signal<MFSTransaction[]>([]);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Dynamic Lookup Options (Zero hardcoded values)
  cashboxTypeOptions = signal<{ label: string; value: string }[]>([]);
  bankAccountTypeOptions = signal<{ label: string; value: string }[]>([]);
  bankTxTypeOptions = signal<{ label: string; value: string }[]>([]);
  mfsProviderCodeLookupOptions = signal<{ label: string; value: string }[]>([]);
  mfsAccountTypeOptions = signal<{ label: string; value: string }[]>([]);
  projectOptions = signal<{ label: string; value: number }[]>([]);
  customerOptions = signal<{ label: string; value: number }[]>([]);

  // Search & Filter States
  cashSearch = '';
  selectedCashProject: number | null = null;
  bankSearch = '';
  selectedBankProject: number | null = null;
  mfsSearch = '';
  selectedMfsProvider: number | null = null;

  // Pre-computed select options to avoid parser errors in templates
  cashBoxOptions = computed(() =>
    this.cashBoxes().map(b => ({
      label: b.box_name + ' (Bal: ৳ ' + Number(b.current_balance || 0).toLocaleString() + ')',
      value: b.id
    }))
  );

  cashBoxSimpleOptions = computed(() =>
    this.cashBoxes().map(b => ({ label: b.box_name, value: b.id }))
  );

  bankAccountOptions = computed(() =>
    this.bankAccounts().map(b => ({
      label: b.bank_name + ' (' + (b.account_number_masked || '') + ')',
      value: b.id
    }))
  );

  mfsProviderAccountOptions = computed(() =>
    this.mfsProviders().map(p => ({
      label: p.provider_name + ' (' + p.fee_percentage + '% fee)',
      value: p.id
    }))
  );

  // Selected Bank for Cheque Book Register
  selectedBankForCheques = signal<BankAccount | null>(null);

  // Modals Visibility
  showAddCashBoxModal = signal<boolean>(false);
  showCashDisbursementModal = signal<boolean>(false);
  showCashAuditCountModal = signal<boolean>(false);
  showCashTransferModal = signal<boolean>(false);
  showAddBankAccountModal = signal<boolean>(false);
  showBankTxModal = signal<boolean>(false);
  showBankTransferModal = signal<boolean>(false);
  showChequeRegisterModal = signal<boolean>(false);
  showAddMFSProviderModal = signal<boolean>(false);
  showMFSTransactionModal = signal<boolean>(false);
  showMFSCallbackSimulatorModal = signal<boolean>(false);
  showVoucherDetailModal = signal<boolean>(false);
  selectedVoucherData = signal<any>(null);

  // Form State: Add Cash Box
  newCashBox = {
    box_code: '',
    box_name: '',
    cashbox_type: 'Head_Office',
    project_id: null as number | null,
    imprest_limit: 50000,
    replenishment_threshold: 10000,
    current_balance: 0,
    notes: ''
  };

  // Form State: Cash Disbursement / Claim
  newCashDisbursement = {
    cash_box_id: null as number | null,
    project_id: null as number | null,
    transaction_date: new Date().toISOString().substring(0, 10),
    transaction_type: 'Disbursement',
    amount: null as number | null,
    payee_name: '',
    purpose: '',
    supporting_receipt_ref: ''
  };

  // Form State: Cash Count Audit
  cashAudit = {
    cash_box_id: null as number | null,
    audit_date: new Date().toISOString().substring(0, 10),
    physical_count_amount: null as number | null,
    supporting_receipt_ref: '',
    purpose: 'Physical cash count closing balance audit',
    auto_post_adjustment_gl: true
  };

  // Form State: Cash Fund Transfer
  cashTransfer = {
    from_cash_box_id: null as number | null,
    to_cash_box_id: null as number | null,
    amount: null as number | null,
    transfer_date: new Date().toISOString().substring(0, 10),
    particulars: 'Inter-fund cash replenishment',
    reference_number: ''
  };

  // Form State: Add Bank Account
  newBankAccount = {
    bank_name: '',
    branch_name: '',
    account_name: '',
    account_number: '',
    routing_number: '',
    swift_code: '',
    account_type: 'Current_Account',
    currency: 'BDT',
    project_id: null as number | null,
    opening_balance: 0,
    is_escrow: false,
    cheque_prefix: 'CQ-',
    active_cheque_start: 1001,
    active_cheque_end: 1100,
    notes: ''
  };

  // Form State: Bank Transaction
  newBankTx = {
    bank_account_id: null as number | null,
    project_id: null as number | null,
    transaction_date: new Date().toISOString().substring(0, 10),
    transaction_type: 'Deposit',
    amount: null as number | null,
    cheque_number: '',
    cheque_date: '',
    reference_number: '',
    particulars: ''
  };

  // Form State: Bank Transfer
  bankTransfer = {
    from_bank_account_id: null as number | null,
    to_bank_account_id: null as number | null,
    amount: null as number | null,
    transfer_date: new Date().toISOString().substring(0, 10),
    cheque_number: '',
    particulars: 'Inter-bank funds transfer',
    reference_number: ''
  };

  // Form State: Add MFS Provider
  newMFSProvider = {
    provider_code: 'BKASH',
    provider_name: '',
    merchant_number: '',
    account_type: 'Merchant_Wallet',
    fee_percentage: 1.5,
    fee_flat_charge: 0,
    settlement_bank_account_id: null as number | null,
    daily_limit: 5000000,
    notes: ''
  };

  // Form State: MFS Transaction (with Live Math Preview)
  newMFSTx = {
    mfs_provider_id: null as number | null,
    project_id: null as number | null,
    customer_id: null as number | null,
    transaction_id: '',
    payment_reference: '',
    customer_phone: '',
    gross_amount: 100000,
    fee_deducted: 1500,
    net_settlement_amount: 98500
  };

  // Form State: MFS Callback Simulation
  mfsCallbackSim = {
    provider_code: 'BKASH',
    transaction_id: `TRX-${Date.now().toString().slice(-6)}`,
    customer_phone: '01711002233',
    gross_amount: 100000,
    payment_reference: 'Apt 4B Down Payment',
    project_id: null as number | null,
    customer_id: null as number | null
  };

  ngOnInit(): void {
    // Check query params for active tab
    this.route.queryParams.subscribe(params => {
      if (params['tab'] && ['overview', 'cash', 'bank', 'mfs'].includes(params['tab'])) {
        this.activeTab.set(params['tab']);
      }
    });

    this.loadLookups();
    this.loadKPIs();
    this.loadAllData();
  }

  setTab(tab: 'overview' | 'cash' | 'bank' | 'mfs'): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  // -------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------
  loadLookups(): void {
    // Dynamic Cashbox Types
    this.lookupService.getItems('CASHBOX_TYPE').subscribe({
      next: (items: any[]) => {
        if (items && items.length) {
          this.cashboxTypeOptions.set(items.map((i: any) => ({ label: i.item_name_en, value: i.item_code })));
        } else {
          this.cashboxTypeOptions.set([
            { label: 'Head Office Central Cash', value: 'Head_Office' },
            { label: 'Project Site Imprest Fund', value: 'Project_Site_Imprest' },
            { label: 'Petty Cash Register', value: 'Petty_Cash' },
            { label: 'Sales Pavilion Cash', value: 'Sales_Pavilion' }
          ]);
        }
      },
      error: () => {
        this.cashboxTypeOptions.set([
          { label: 'Head Office Central Cash', value: 'Head_Office' },
          { label: 'Project Site Imprest Fund', value: 'Project_Site_Imprest' },
          { label: 'Petty Cash Register', value: 'Petty_Cash' },
          { label: 'Sales Pavilion Cash', value: 'Sales_Pavilion' }
        ]);
      }
    });

    // Bank Account Types
    this.lookupService.getItems('BANK_ACCOUNT_TYPE').subscribe({
      next: (items: any[]) => {
        if (items && items.length) {
          this.bankAccountTypeOptions.set(items.map((i: any) => ({ label: i.item_name_en, value: i.item_code })));
        } else {
          this.bankAccountTypeOptions.set([
            { label: 'Current Account (CD)', value: 'Current_Account' },
            { label: 'Savings Account (SB)', value: 'Savings_Account' },
            { label: 'Escrow Account', value: 'Escrow_Account' },
            { label: 'Special Notice Deposit (SND)', value: 'SND_Account' },
            { label: 'Fixed Deposit (FDR)', value: 'Fixed_Deposit' }
          ]);
        }
      }
    });

    // Bank Transaction Types
    this.lookupService.getItems('BANK_TRANSACTION_TYPE').subscribe({
      next: (items: any[]) => {
        if (items && items.length) {
          this.bankTxTypeOptions.set(items.map((i: any) => ({ label: i.item_name_en, value: i.item_code })));
        } else {
          this.bankTxTypeOptions.set([
            { label: 'Bank Deposit', value: 'Deposit' },
            { label: 'Withdrawal', value: 'Withdrawal' },
            { label: 'Cheque Issue', value: 'Cheque_Issue' },
            { label: 'Bank Charges & Excise Duty', value: 'Bank_Charge' },
            { label: 'Interest & SND Income', value: 'Interest_Income' }
          ]);
        }
      }
    });

    // MFS Providers
    this.lookupService.getItems('MFS_PROVIDER_CODE').subscribe({
      next: (items: any[]) => {
        if (items && items.length) {
          this.mfsProviderCodeLookupOptions.set(items.map((i: any) => ({ label: i.item_name_en, value: i.item_code })));
        } else {
          this.mfsProviderCodeLookupOptions.set([
            { label: 'bKash Merchant Gateway', value: 'BKASH' },
            { label: 'Nagad Business Gateway', value: 'NAGAD' },
            { label: 'Rocket (Dutch-Bangla Bank)', value: 'ROCKET' },
            { label: 'Upay Merchant Gateway', value: 'UPAY' }
          ]);
        }
      }
    });

    // Projects
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.projectOptions.set(list.map((p: any) => ({ label: p.project_name, value: p.id })));
      }
    });

    // Customers
    this.crmService.getCustomers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.customerOptions.set(list.map((c: any) => ({ label: `${c.full_name_en} (${c.phone || ''})`, value: c.id })));
      }
    });
  }

  loadKPIs(): void {
    this.accountsService.getCashBankPositionKPIs().subscribe({
      next: (k) => this.kpis.set(k),
      error: (err) => console.error('Failed to load Cash & Bank KPIs', err)
    });
  }

  loadAllData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // 1. Cash Boxes
    this.accountsService.getCashBoxes().subscribe({
      next: (boxes) => {
        this.cashBoxes.set(boxes);
        if (boxes.length > 0 && !this.newCashDisbursement.cash_box_id) {
          this.newCashDisbursement.cash_box_id = boxes[0].id;
          this.cashAudit.cash_box_id = boxes[0].id;
          this.cashTransfer.from_cash_box_id = boxes[0].id;
          if (boxes.length > 1) this.cashTransfer.to_cash_box_id = boxes[1].id;
        }
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to load cashboxes')
    });

    // 2. Cash Vouchers
    this.accountsService.getPettyCashVouchers().subscribe({
      next: (vouchers) => this.cashVouchers.set(vouchers),
      error: (err) => console.error(err)
    });

    // 3. Bank Accounts
    this.accountsService.getBankAccounts().subscribe({
      next: (banks) => {
        this.bankAccounts.set(banks);
        if (banks.length > 0) {
          if (!this.newBankTx.bank_account_id) this.newBankTx.bank_account_id = banks[0].id;
          if (!this.bankTransfer.from_bank_account_id) this.bankTransfer.from_bank_account_id = banks[0].id;
          if (banks.length > 1 && !this.bankTransfer.to_bank_account_id) this.bankTransfer.to_bank_account_id = banks[1].id;
          if (!this.newMFSProvider.settlement_bank_account_id) this.newMFSProvider.settlement_bank_account_id = banks[0].id;
        }
      },
      error: (err) => console.error(err)
    });

    // 4. Bank Transactions
    this.accountsService.getBankTransactions().subscribe({
      next: (txs) => this.bankTransactions.set(txs),
      error: (err) => console.error(err)
    });

    // 5. MFS Providers
    this.accountsService.getMFSProviders().subscribe({
      next: (providers) => {
        this.mfsProviders.set(providers);
        if (providers.length > 0 && !this.newMFSTx.mfs_provider_id) {
          this.newMFSTx.mfs_provider_id = providers[0].id;
          this.onMfsGrossChange();
        }
      },
      error: (err) => console.error(err)
    });

    // 6. MFS Transactions
    this.accountsService.getMFSTransactions().subscribe({
      next: (txs) => {
        this.mfsTransactions.set(txs);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error(err);
      }
    });
  }

  // -------------------------------------------------------------
  // Cash Actions
  // -------------------------------------------------------------
  submitCreateCashBox(): void {
    if (!this.newCashBox.box_code || !this.newCashBox.box_name) {
      alert('Please fill out box code and name.');
      return;
    }
    this.isLoading.set(true);
    this.accountsService.createCashBox(this.newCashBox).subscribe({
      next: () => {
        this.showSuccess('Cash box created successfully!');
        this.showAddCashBoxModal.set(false);
        this.loadKPIs();
        this.loadAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err?.error?.detail || 'Failed to create cash box');
      }
    });
  }

  submitCashDisbursement(): void {
    if (!this.newCashDisbursement.cash_box_id || !this.newCashDisbursement.amount || !this.newCashDisbursement.payee_name) {
      alert('Please enter cash box, amount, and payee.');
      return;
    }
    this.isLoading.set(true);
    this.accountsService.createPettyCashVoucher(this.newCashDisbursement).subscribe({
      next: () => {
        this.showSuccess('Cash voucher disbursed and double-entry voucher posted!');
        this.showCashDisbursementModal.set(false);
        this.loadKPIs();
        this.loadAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err?.error?.detail || 'Failed to disburse cash voucher');
      }
    });
  }

  submitCashCountAudit(): void {
    if (!this.cashAudit.cash_box_id || this.cashAudit.physical_count_amount === null) {
      alert('Please select cash box and enter physical count amount.');
      return;
    }
    this.isLoading.set(true);
    this.accountsService.performCashCountAudit(this.cashAudit as any).subscribe({
      next: (v) => {
        const varAmt = v.variance_amount || 0;
        const msg = varAmt === 0
          ? 'Physical count verified! Closing balance matches system balance perfectly (Zero variance).'
          : `Cash audit completed! Variance of ৳ ${varAmt.toLocaleString()} automatically adjusted in GL.`;
        this.showSuccess(msg);
        this.showCashAuditCountModal.set(false);
        this.loadKPIs();
        this.loadAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err?.error?.detail || 'Cash count audit failed');
      }
    });
  }

  submitCashTransfer(): void {
    if (!this.cashTransfer.from_cash_box_id || !this.cashTransfer.to_cash_box_id || !this.cashTransfer.amount) {
      alert('Please select source, destination, and amount.');
      return;
    }
    this.isLoading.set(true);
    this.accountsService.transferCash(this.cashTransfer as any).subscribe({
      next: () => {
        this.showSuccess('Cash transfer executed and Contra GL voucher posted!');
        this.showCashTransferModal.set(false);
        this.loadKPIs();
        this.loadAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err?.error?.detail || 'Cash transfer failed');
      }
    });
  }

  // -------------------------------------------------------------
  // Bank Actions
  // -------------------------------------------------------------
  submitCreateBankAccount(): void {
    if (!this.newBankAccount.bank_name || !this.newBankAccount.account_number || !this.newBankAccount.routing_number) {
      alert('Please enter bank name, account number, and routing number.');
      return;
    }
    this.isLoading.set(true);
    this.accountsService.createBankAccount(this.newBankAccount).subscribe({
      next: () => {
        this.showSuccess('Bank account created with encrypted & masked security protection!');
        this.showAddBankAccountModal.set(false);
        this.loadKPIs();
        this.loadAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err?.error?.detail || 'Failed to create bank account');
      }
    });
  }

  submitBankTransaction(): void {
    if (!this.newBankTx.bank_account_id || !this.newBankTx.amount || !this.newBankTx.particulars) {
      alert('Please enter bank account, amount, and particulars.');
      return;
    }
    this.isLoading.set(true);
    this.accountsService.createBankTransaction(this.newBankTx).subscribe({
      next: () => {
        this.showSuccess('Bank transaction recorded and GL voucher posted!');
        this.showBankTxModal.set(false);
        this.loadKPIs();
        this.loadAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err?.error?.detail || 'Failed to record bank transaction');
      }
    });
  }

  submitBankTransfer(): void {
    if (!this.bankTransfer.from_bank_account_id || !this.bankTransfer.to_bank_account_id || !this.bankTransfer.amount) {
      alert('Please select source, destination, and amount.');
      return;
    }
    this.isLoading.set(true);
    this.accountsService.transferBankFunds(this.bankTransfer as any).subscribe({
      next: () => {
        this.showSuccess('Inter-bank funds transfer executed and Contra GL voucher posted!');
        this.showBankTransferModal.set(false);
        this.loadKPIs();
        this.loadAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err?.error?.detail || 'Inter-bank transfer failed');
      }
    });
  }

  openChequeBookRegister(ba: BankAccount): void {
    this.selectedBankForCheques.set(ba);
    this.accountsService.getChequeBookRegister(ba.id).subscribe({
      next: (leaves) => {
        this.chequeLeaves.set(leaves);
        this.showChequeRegisterModal.set(true);
      },
      error: (err) => alert(err?.error?.detail || 'Failed to load cheque book register')
    });
  }

  // -------------------------------------------------------------
  // MFS Actions & Live Accounting Math
  // -------------------------------------------------------------
  onMfsGrossChange(): void {
    const p = this.mfsProviders().find(prov => prov.id === this.newMFSTx.mfs_provider_id);
    const gross = Number(this.newMFSTx.gross_amount) || 0;
    const feePct = p ? Number(p.fee_percentage) : 1.5;
    const flatFee = p ? Number(p.fee_flat_charge) : 0;

    const fee = Math.round((gross * (feePct / 100) + flatFee) * 100) / 100;
    const net = Math.round((gross - fee) * 100) / 100;

    this.newMFSTx.fee_deducted = fee;
    this.newMFSTx.net_settlement_amount = net;
  }

  submitCreateMFSProvider(): void {
    if (!this.newMFSProvider.provider_code || !this.newMFSProvider.merchant_number) {
      alert('Please enter provider code and merchant wallet number.');
      return;
    }
    this.isLoading.set(true);
    this.accountsService.createMFSProvider(this.newMFSProvider).subscribe({
      next: () => {
        this.showSuccess('MFS merchant provider configured successfully!');
        this.showAddMFSProviderModal.set(false);
        this.loadKPIs();
        this.loadAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err?.error?.detail || 'Failed to configure MFS provider');
      }
    });
  }

  submitMFSTransaction(): void {
    if (!this.newMFSTx.mfs_provider_id || !this.newMFSTx.transaction_id || !this.newMFSTx.customer_phone) {
      alert('Please fill out provider, TrxID, and customer phone.');
      return;
    }
    this.isLoading.set(true);
    this.accountsService.createMFSTransaction(this.newMFSTx).subscribe({
      next: (res) => {
        this.showSuccess(`MFS transaction ${res.transaction_id} recorded! Fee: ৳ ${res.fee_deducted}, Net Settlement: ৳ ${res.net_settlement_amount}.`);
        this.showMFSTransactionModal.set(false);
        this.loadKPIs();
        this.loadAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err?.error?.detail || 'MFS transaction submission failed');
      }
    });
  }

  submitMFSCallbackSimulation(): void {
    if (!this.mfsCallbackSim.transaction_id || !this.mfsCallbackSim.customer_phone) {
      alert('Please enter transaction ID and phone.');
      return;
    }
    this.isLoading.set(true);
    this.accountsService.simulateMFSCallback(this.mfsCallbackSim).subscribe({
      next: (res) => {
        this.showSuccess(`Callback webhook simulated successfully! TrxID ${res.transaction_id} cleared with 3-line balanced GL voucher.`);
        this.showMFSCallbackSimulatorModal.set(false);
        // Refresh simulation trx ID
        this.mfsCallbackSim.transaction_id = `TRX-${Date.now().toString().slice(-6)}`;
        this.loadKPIs();
        this.loadAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert(err?.error?.detail || 'Callback simulation failed');
      }
    });
  }

  showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 6000);
  }
}
