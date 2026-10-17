import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  TrialBalanceReport,
  ProfitLossReport,
  BalanceSheetReport,
  BankReconciliation,
  ChartOfAccount
} from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-financial-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './accounts-financial-reports.component.html'
})
export class AccountsFinancialReportsComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  activeTab = signal<'trial-balance' | 'profit-loss' | 'balance-sheet' | 'bank-reconciliation'>('trial-balance');

  trialBalance = signal<TrialBalanceReport | null>(null);
  profitLoss = signal<ProfitLossReport | null>(null);
  balanceSheet = signal<BalanceSheetReport | null>(null);
  reconciliations = signal<BankReconciliation[]>([]);
  coaList = signal<ChartOfAccount[]>([]);
  projects = signal<Project[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isReconModalOpen = signal<boolean>(false);

  // Filter signals
  reportAsOfDate = signal<string>(new Date().toISOString().split('T')[0]);
  plFromDate = signal<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  plToDate = signal<string>(new Date().toISOString().split('T')[0]);
  plProjectId = signal<number | null>(null);

  reconForm: FormGroup = this.fb.group({
    bank_account_id: [null, Validators.required],
    statement_date: [new Date().toISOString().split('T')[0], Validators.required],
    statement_balance: [null, [Validators.required]],
    reconciliation_notes: ['']
  });

  projectOptions = computed(() => [
    { value: null, label: 'All Projects (Consolidated)' },
    ...this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  ]);

  bankAccountOptions = computed(() =>
    this.coaList()
      .filter(a => a.account_type === 'Asset' && (a.account_name_en.toLowerCase().includes('bank') || a.account_name_en.toLowerCase().includes('bkash') || a.account_name_en.toLowerCase().includes('cash')))
      .map(a => ({
        value: a.id,
        label: `${a.account_code} - ${a.account_name_en}`
      }))
  );

  ngOnInit(): void {
    this.loadProjects();
    this.loadCOA();
    this.loadTrialBalance();
    this.loadProfitLoss();
    this.loadBalanceSheet();
    this.loadReconciliations();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadCOA(): void {
    this.accountsService.getCOA().subscribe({
      next: (res) => this.coaList.set(res),
      error: (err) => console.error('Failed to load COA', err)
    });
  }

  loadTrialBalance(): void {
    this.isLoading.set(true);
    this.accountsService.getTrialBalance(this.reportAsOfDate()).subscribe({
      next: (res) => {
        this.trialBalance.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load Trial Balance', err);
        this.isLoading.set(false);
      }
    });
  }

  costCenterVariance = signal<any>(null);

  loadProfitLoss(): void {
    const filter: any = {
      from_date: this.plFromDate(),
      to_date: this.plToDate()
    };
    if (this.plProjectId()) filter.project_id = this.plProjectId();

    this.accountsService.getProfitLoss(filter).subscribe({
      next: (res) => this.profitLoss.set(res),
      error: (err) => console.error('Failed to load P&L', err)
    });

    this.accountsService.getCostCenterVarianceReport(this.plProjectId() || undefined).subscribe({
      next: (res) => this.costCenterVariance.set(res),
      error: (err) => console.error('Failed to load cost center variance', err)
    });
  }

  loadBalanceSheet(): void {
    this.accountsService.getBalanceSheet(this.reportAsOfDate()).subscribe({
      next: (res) => this.balanceSheet.set(res),
      error: (err) => console.error('Failed to load Balance Sheet', err)
    });
  }

  loadReconciliations(): void {
    this.accountsService.getBankReconciliations().subscribe({
      next: (res) => this.reconciliations.set(res),
      error: (err) => console.error('Failed to load reconciliations', err)
    });
  }

  openReconModal(): void {
    const banks = this.bankAccountOptions();
    this.reconForm.reset({
      bank_account_id: banks.length ? banks[0].value : null,
      statement_date: new Date().toISOString().split('T')[0],
      statement_balance: 0,
      reconciliation_notes: ''
    });
    this.isReconModalOpen.set(true);
  }

  closeReconModal(): void {
    this.isReconModalOpen.set(false);
  }

  submitRecon(): void {
    if (this.reconForm.invalid) return;
    this.isSubmitting.set(true);
    this.accountsService.createBankReconciliation(this.reconForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeReconModal();
        this.loadReconciliations();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to submit reconciliation audit');
        this.isSubmitting.set(false);
      }
    });
  }
}
