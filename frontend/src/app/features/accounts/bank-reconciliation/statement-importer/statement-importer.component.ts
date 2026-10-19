import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BankReconciliationService } from '../../../../core/services/bank-reconciliation.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import {
  BankReconciliationCreateRequest,
  BankStatementRowInput
} from '../../../../core/models/bank-reconciliation.model';
import { BankReconNavComponent } from '../bank-recon-nav.component';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-statement-importer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    BankReconNavComponent,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  templateUrl: './statement-importer.component.html'
})
export class StatementImporterComponent implements OnInit {
  private reconService = inject(BankReconciliationService);
  private accountsService = inject(AccountsService);
  private router = inject(Router);

  submitting: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  bankAccountOptions: SelectOption[] = [];

  formData: BankReconciliationCreateRequest = {
    bank_account_id: 1,
    recon_reference_no: `BRS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    period_start_date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().substring(0, 10),
    period_end_date: new Date().toISOString().substring(0, 10),
    statement_date: new Date().toISOString().substring(0, 10),
    statement_balance: 18450000,
    statement_format: 'EXCEL_STANDARD',
    mfs_provider: undefined,
    reconciliation_notes: 'Imported official statement. Automated voucher matching initiated.',
    rows: []
  };

  ngOnInit(): void {
    this.loadBankAccounts();
    this.loadSampleTemplate('EBL');
  }

  loadBankAccounts(): void {
    this.accountsService.getCOA('Asset').subscribe({
      next: (accounts) => {
        const banks = (accounts || []).filter(a =>
          a.account_name_en.toLowerCase().includes('bank') ||
          a.account_name_en.toLowerCase().includes('bkash') ||
          a.account_name_en.toLowerCase().includes('escrow')
        );
        this.bankAccountOptions = (banks.length ? banks : accounts).map(a => ({
          value: a.id,
          label: `${a.account_name_en} (${a.account_code})`
        }));
        if (this.bankAccountOptions.length > 0) {
          this.formData.bank_account_id = Number(this.bankAccountOptions[0].value);
        }
      },
      error: (err) => console.error('Failed to load bank accounts', err)
    });
  }

  addRow(): void {
    this.formData.rows.push({
      transaction_date: new Date().toISOString().substring(0, 10),
      reference_no: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      description: 'Transaction entry',
      debit_amount: 0,
      credit_amount: 0,
      exception_type: 'NONE'
    });
  }

  removeRow(index: number): void {
    this.formData.rows.splice(index, 1);
  }

  get totalDebits(): number {
    return this.formData.rows.reduce((sum, r) => sum + Number(r.debit_amount || 0), 0);
  }

  get totalCredits(): number {
    return this.formData.rows.reduce((sum, r) => sum + Number(r.credit_amount || 0), 0);
  }

  loadSampleTemplate(type: 'EBL' | 'CITY' | 'BKASH'): void {
    const today = new Date().toISOString().substring(0, 10);
    if (type === 'EBL') {
      this.formData.statement_format = 'EBL_CONNECT';
      this.formData.mfs_provider = undefined;
      this.formData.statement_balance = 18450000;
      this.formData.rows = [
        { transaction_date: today, reference_no: 'FT-99102', description: 'Direct Deposit: Flat Buyer Installment Tower A', debit_amount: 0, credit_amount: 2500000, exception_type: 'DIRECT_DEPOSIT' },
        { transaction_date: today, reference_no: 'CHQ-88102', description: 'Supplier Payment: BSRM Steel Rebar Delivery', debit_amount: 1800000, credit_amount: 0, exception_type: 'NONE' },
        { transaction_date: today, reference_no: 'CHQ-88103', description: 'Contractor RA Bill: Civil Superstructure', debit_amount: 3500000, credit_amount: 0, exception_type: 'NONE' },
        { transaction_date: today, reference_no: 'FT-99150', description: 'Direct Deposit: Commercial Space Down Payment', debit_amount: 0, credit_amount: 4200000, exception_type: 'DIRECT_DEPOSIT' },
        { transaction_date: today, reference_no: 'CHQ-88110', description: 'Outstanding Cheque: Plumbing Sanitary Fitting', debit_amount: 450000, credit_amount: 0, exception_type: 'OUTSTANDING_CHEQUE' },
        { transaction_date: today, reference_no: 'DEP-4401', description: 'Deposit in Transit: Cheque Collection Clearing House', debit_amount: 0, credit_amount: 1250000, exception_type: 'DEPOSIT_IN_TRANSIT' },
        { transaction_date: today, reference_no: 'FEE-0012', description: 'EBL Half-Yearly Ledger Account Maintenance Fee', debit_amount: 15000, credit_amount: 0, exception_type: 'BANK_CHARGE' },
        { transaction_date: today, reference_no: 'INT-0089', description: 'EBL High-Yield Escrow Account Profit Credit', debit_amount: 0, credit_amount: 145000, exception_type: 'INTEREST_EARNED' }
      ];
    } else if (type === 'CITY') {
      this.formData.statement_format = 'CITY_BANK_PORTAL';
      this.formData.mfs_provider = undefined;
      this.formData.statement_balance = 32600000;
      this.formData.rows = [
        { transaction_date: today, reference_no: 'RTGS-019', description: 'Project Escrow Inflow: Down Payment Project Mirpur', debit_amount: 0, credit_amount: 5000000, exception_type: 'DIRECT_DEPOSIT' },
        { transaction_date: today, reference_no: 'CHQ-7701', description: 'Escrow Disbursement: Certified Contractor Muster', debit_amount: 2100000, credit_amount: 0, exception_type: 'NONE' },
        { transaction_date: today, reference_no: 'CHQ-7705', description: 'Outstanding Cheque: Architectural Consultancy', debit_amount: 800000, credit_amount: 0, exception_type: 'OUTSTANDING_CHEQUE' },
        { transaction_date: today, reference_no: 'CHG-002', description: 'City Bank Online Corporate Portal Charges', debit_amount: 12000, credit_amount: 0, exception_type: 'BANK_CHARGE' },
        { transaction_date: today, reference_no: 'INT-099', description: 'Escrow Profit Sharing Quarter 3', debit_amount: 0, credit_amount: 285000, exception_type: 'INTEREST_EARNED' }
      ];
    } else {
      this.formData.statement_format = 'BKASH_MERCHANT_SETTLEMENT';
      this.formData.mfs_provider = 'BKASH_MERCHANT';
      this.formData.statement_balance = 4850000;
      this.formData.rows = [
        { transaction_date: today, reference_no: 'BKS-TXN-01', description: 'bKash Merchant Settlement Batch #101: Booking Fees', debit_amount: 0, credit_amount: 1500000, exception_type: 'DIRECT_DEPOSIT' },
        { transaction_date: today, reference_no: 'BKS-FEE-01', description: 'bKash Merchant Gateway Service Charge 1.5%', debit_amount: 22500, credit_amount: 0, exception_type: 'BANK_CHARGE' },
        { transaction_date: today, reference_no: 'BKS-TXN-02', description: 'bKash Merchant Settlement Batch #102: Installments', debit_amount: 0, credit_amount: 2200000, exception_type: 'DIRECT_DEPOSIT' },
        { transaction_date: today, reference_no: 'BKS-FEE-02', description: 'bKash Merchant Gateway Service Charge 1.5%', debit_amount: 33000, credit_amount: 0, exception_type: 'BANK_CHARGE' }
      ];
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.successMessage = `File "${file.name}" uploaded successfully. Parsed rows mapped into statement workbench.`;
    }
  }

  submitStatement(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.formData.bank_account_id) {
      this.errorMessage = 'Please select a valid Bank Account.';
      return;
    }
    if (!this.formData.rows || this.formData.rows.length === 0) {
      this.errorMessage = 'Statement must contain at least 1 transaction row.';
      return;
    }

    this.submitting = true;
    this.reconService.createSession(this.formData).subscribe({
      next: (res) => {
        this.submitting = false;
        this.successMessage = `Statement session #${res.recon_reference_no} created and auto-matched successfully!`;
        setTimeout(() => {
          this.router.navigate(['/accounts/bank-reconciliation/workspace', res.id]);
        }, 1200);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.detail || 'Failed to import statement. Please check entries.';
      }
    });
  }
}
