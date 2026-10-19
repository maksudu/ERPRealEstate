import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  ChartOfAccount,
  GeneralLedgerInquiryResponse,
  GeneralLedgerLineItem
} from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './accounts-ledger.component.html'
})
export class AccountsLedgerComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  coaList = signal<ChartOfAccount[]>([]);
  projects = signal<Project[]>([]);
  ledgerData = signal<GeneralLedgerInquiryResponse | null>(null);

  // Filters
  selectedAccountId = signal<number | null>(null);
  selectedProjectId = signal<number | null>(null);
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  searchQuery = signal<string>('');

  accountOptions = computed(() =>
    this.coaList()
      .filter(a => a.is_leaf_account)
      .map(a => ({
        value: a.id,
        label: `${a.account_code} - ${a.account_name_en} (${a.account_type})`
      }))
  );

  projectOptions = computed(() => [
    { value: null, label: 'All Projects & Corporate' },
    ...this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  ]);

  currentAccount = computed(() => {
    const id = this.selectedAccountId();
    if (!id) return null;
    return this.coaList().find(a => a.id === id) || null;
  });

  ngOnInit(): void {
    // Default date range: start of fiscal year / month to today
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    this.dateFrom.set(firstDay);
    this.dateTo.set(today);

    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading.set(true);

    this.accountsService.getCOA().subscribe({
      next: (accounts) => {
        this.coaList.set(accounts);
        this.isLoading.set(false);

        // Check query params if account_id is passed
        this.route.queryParams.subscribe(params => {
          if (params['account_id']) {
            this.selectedAccountId.set(parseInt(params['account_id'], 10));
          } else if (this.accountOptions().length > 0 && !this.selectedAccountId()) {
            this.selectedAccountId.set(this.accountOptions()[0].value);
          }

          if (params['project_id']) {
            this.selectedProjectId.set(parseInt(params['project_id'], 10));
          }

          if (this.selectedAccountId()) {
            this.fetchLedger();
          }
        });
      },
      error: (err) => {
        console.error('Failed to load COA', err);
        this.errorMessage.set('Failed to load Chart of Accounts.');
        this.isLoading.set(false);
      }
    });

    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  fetchLedger(): void {
    const accId = this.selectedAccountId();
    if (!accId) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filters: any = {
      account_id: accId
    };

    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.dateFrom()) filters.date_from = this.dateFrom();
    if (this.dateTo()) filters.date_to = this.dateTo();
    if (this.searchQuery()) filters.search = this.searchQuery().trim();

    this.accountsService.getGeneralLedger(filters).subscribe({
      next: (data) => {
        this.ledgerData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch general ledger', err);
        this.errorMessage.set(err.error?.detail || 'Failed to fetch ledger statement.');
        this.isLoading.set(false);
      }
    });
  }

  onAccountChange(accId: number | null): void {
    this.selectedAccountId.set(accId);
    if (accId) this.fetchLedger();
  }

  onFilterChange(): void {
    if (this.selectedAccountId()) this.fetchLedger();
  }

  printStatement(): void {
    window.print();
  }

  exportCSV(): void {
    const data = this.ledgerData();
    if (!data || !data.entries || data.entries.length === 0) {
      alert('No ledger records available to export.');
      return;
    }

    const headers = [
      'Date',
      'Voucher No',
      'Type',
      'Project',
      'Cost Center',
      'Cheque / Ref',
      'Narration',
      'Debit (Tk)',
      'Credit (Tk)',
      'Running Balance (Tk)'
    ];

    const rows = [
      [
        `"${data.date_from || ''}"`,
        '"---"',
        '"Opening Balance"',
        '""',
        '""',
        '""',
        '"Opening Balance as of period start"',
        '',
        '',
        data.opening_balance
      ],
      ...data.entries.map((e: GeneralLedgerLineItem) => [
        `"${e.voucher_date}"`,
        `"${e.voucher_number}"`,
        `"${e.voucher_type}"`,
        `"${(e.project_name || 'Corporate').replace(/"/g, '""')}"`,
        `"${(e.cost_center_name || '').replace(/"/g, '""')}"`,
        `"${(e.cheque_no || e.bill_reference || '').replace(/"/g, '""')}"`,
        `"${(e.narration || '').replace(/"/g, '""')}"`,
        e.debit_amount || 0,
        e.credit_amount || 0,
        e.running_balance
      ]),
      [
        `"${data.date_to || ''}"`,
        '"---"',
        '"Closing Balance"',
        '""',
        '""',
        '""',
        '"Cumulative Balance at period end"',
        data.total_debit,
        data.total_credit,
        data.closing_balance
      ]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GL_Statement_${data.account_code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
