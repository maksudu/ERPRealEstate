import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import { ProcurementService } from '../../../core/services/procurement.service';
import { CrmService } from '../../../core/services/crm.service';
import { FinancialReportsService } from '../../../core/services/financial-reports.service';
import {
  GeneralLedgerReportResponse,
  CashBankBookReportResponse,
  APAgingReportResponse,
  ARAgingReportResponse,
  CustomerAdvanceReportResponse,
  ProjectIncomeExpReportResponse,
  CostToCompleteReportResponse,
  CWIPStatementReportResponse,
  LoanScheduleReportResponse,
  BankReconReportResponse,
  PartyStatementResponse,
  BudgetVsActualReportResponse,
  VoucherRegisterReportResponse,
  ClosingChecklistReportResponse,
  AuditTrailReportResponse
} from '../../../core/models/financial-reports.model';
import { ChartOfAccount } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import { Vendor } from '../../../core/models/procurement.model';
import { Customer } from '../../../core/models/crm.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

export type ReportTab =
  | 'gl'
  | 'cashbook'
  | 'ap-aging'
  | 'ar-aging'
  | 'advances'
  | 'project-pnl'
  | 'cost-to-complete'
  | 'cwip'
  | 'loan-schedule'
  | 'brs'
  | 'party-statement'
  | 'budget-variance'
  | 'voucher-register'
  | 'closing-checklist'
  | 'audit-trail';

@Component({
  selector: 'app-accounts-financial-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './accounts-financial-reports.component.html'
})
export class AccountsFinancialReportsComponent implements OnInit {
  private reportsService = inject(FinancialReportsService);
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private procurementService = inject(ProcurementService);
  private crmService = inject(CrmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Active Tab
  activeTab = signal<ReportTab>('gl');
  isLoading = signal<boolean>(false);

  currentReportInfo = computed(() => {
    const tab = this.activeTab();
    return this.tabsList.find(t => t.id === tab) || this.tabsList[0];
  });

  // Dynamic Lookup Signals (100% Dynamic, no hardcoded selects)
  projects = signal<Project[]>([]);
  accounts = signal<ChartOfAccount[]>([]);
  vendors = signal<Vendor[]>([]);
  customers = signal<Customer[]>([]);

  // Filter Signals
  selectedAccountId = signal<number | null>(null);
  selectedProjectId = signal<number | null>(null);
  selectedVendorId = signal<number | null>(null);
  selectedCustomerId = signal<number | null>(null);
  fromDate = signal<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  toDate = signal<string>(new Date().toISOString().split('T')[0]);
  asOfDate = signal<string>(new Date().toISOString().split('T')[0]);
  bookType = signal<string>('ALL');
  partyType = signal<'VENDOR' | 'CUSTOMER'>('VENDOR');
  voucherType = signal<string>('ALL');
  searchQuery = signal<string>('');
  limit = signal<number>(25);
  offset = signal<number>(0);

  // Report Data Signals for 15 Reports
  glReport = signal<GeneralLedgerReportResponse | null>(null);
  cashBankReport = signal<CashBankBookReportResponse | null>(null);
  apAgingReport = signal<APAgingReportResponse | null>(null);
  arAgingReport = signal<ARAgingReportResponse | null>(null);
  advancesReport = signal<CustomerAdvanceReportResponse | null>(null);
  projectIncomeExpReport = signal<ProjectIncomeExpReportResponse | null>(null);
  costToCompleteReport = signal<CostToCompleteReportResponse | null>(null);
  cwipReport = signal<CWIPStatementReportResponse | null>(null);
  loanScheduleReport = signal<LoanScheduleReportResponse | null>(null);
  bankReconReport = signal<BankReconReportResponse | null>(null);
  partyStatementReport = signal<PartyStatementResponse | null>(null);
  budgetVarianceReport = signal<BudgetVsActualReportResponse | null>(null);
  voucherRegisterReport = signal<VoucherRegisterReportResponse | null>(null);
  closingChecklistReport = signal<ClosingChecklistReportResponse | null>(null);
  auditTrailReport = signal<AuditTrailReportResponse | null>(null);

  // Dynamic Select Options with Searchable and "+ Add New" Capability
  projectOptions = computed(() => [
    { value: null, label: 'All Projects (Consolidated)' },
    ...this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  ]);

  accountOptions = computed(() => [
    { value: null, label: 'All General Accounts' },
    ...this.accounts().map(a => ({
      value: a.id,
      label: `${a.account_code} - ${a.account_name_en} (${a.account_type})`
    }))
  ]);

  vendorOptions = computed(() => [
    { value: null, label: 'Select Vendor / Contractor' },
    ...this.vendors().map(v => ({
      value: v.id,
      label: `${v.vendor_name || v.contact_person} (${v.vendor_code || 'VEN'})`
    }))
  ]);

  customerOptions = computed(() => [
    { value: null, label: 'Select Customer / Buyer' },
    ...this.customers().map(c => ({
      value: c.id,
      label: `${c.full_name_en} (${c.customer_code || 'CUST'})`
    }))
  ]);

  bookTypeOptions = [
    { value: 'ALL', label: 'All Cash & Bank Accounts' },
    { value: 'CASH', label: 'Cash In Hand Ledgers' },
    { value: 'BANK', label: 'Bank, Escrow & MFS Ledgers' }
  ];

  partyTypeOptions = [
    { value: 'VENDOR', label: 'Vendor / Subcontractor' },
    { value: 'CUSTOMER', label: 'Customer / Flat Buyer' }
  ];

  voucherTypeOptions = [
    { value: 'ALL', label: 'All Voucher Types' },
    { value: 'Journal', label: 'Journal Voucher (JV)' },
    { value: 'Cash_Payment', label: 'Cash Payment (CP)' },
    { value: 'Cash_Receipt', label: 'Cash Receipt (CR)' },
    { value: 'Bank_Payment', label: 'Bank Payment (BP)' },
    { value: 'Bank_Receipt', label: 'Bank Receipt (BR)' },
    { value: 'Contra', label: 'Contra Voucher (CV)' }
  ];

  pageSizeOptions = [
    { value: 15, label: '15 items / page' },
    { value: 25, label: '25 items / page' },
    { value: 50, label: '50 items / page' },
    { value: 100, label: '100 items / page' }
  ];

  tabsList = [
    { id: 'gl' as ReportTab, label: 'General Ledger', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'cashbook' as ReportTab, label: 'Cash & Bank Book', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'ap-aging' as ReportTab, label: 'AP Aging', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'ar-aging' as ReportTab, label: 'AR Aging', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'advances' as ReportTab, label: 'Customer Advances', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { id: 'project-pnl' as ReportTab, label: 'Project Income & Exp', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
    { id: 'cost-to-complete' as ReportTab, label: 'Cost-to-Complete', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'cwip' as ReportTab, label: 'CWIP Statement', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'loan-schedule' as ReportTab, label: 'Loan & Financing', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'brs' as ReportTab, label: 'Bank Reconciliation', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'party-statement' as ReportTab, label: 'Party Statements', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'budget-variance' as ReportTab, label: 'Budget vs Actual', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z' },
    { id: 'voucher-register' as ReportTab, label: 'Voucher Register', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'closing-checklist' as ReportTab, label: 'Closing Checklist', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'audit-trail' as ReportTab, label: 'Audit Trail', icon: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4' }
  ];

  ngOnInit(): void {
    this.loadLookups();
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] as ReportTab;
      if (tab && this.tabsList.some(t => t.id === tab)) {
        this.activeTab.set(tab);
      }
      this.offset.set(0);
      this.loadCurrentTabReport();
    });
  }

  setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
    this.offset.set(0);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  loadLookups(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res || []),
      error: (err) => console.error('Failed to load projects', err)
    });

    this.accountsService.getCOA().subscribe({
      next: (res) => this.accounts.set(res || []),
      error: (err) => console.error('Failed to load chart of accounts', err)
    });

    this.procurementService.getVendors().subscribe({
      next: (res) => this.vendors.set(res || []),
      error: (err) => console.error('Failed to load vendors', err)
    });

    this.crmService.getCustomers().subscribe({
      next: (res) => this.customers.set(res || []),
      error: (err) => console.error('Failed to load customers', err)
    });
  }


  onFilterChange(): void {
    this.offset.set(0);
    this.loadCurrentTabReport();
  }

  resetFilters(): void {
    this.selectedAccountId.set(null);
    this.selectedProjectId.set(null);
    this.selectedVendorId.set(null);
    this.selectedCustomerId.set(null);
    this.fromDate.set(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    this.toDate.set(new Date().toISOString().split('T')[0]);
    this.asOfDate.set(new Date().toISOString().split('T')[0]);
    this.bookType.set('ALL');
    this.voucherType.set('ALL');
    this.searchQuery.set('');
    this.offset.set(0);
    this.loadCurrentTabReport();
  }

  loadCurrentTabReport(): void {
    const tab = this.activeTab();
    this.isLoading.set(true);

    switch (tab) {
      case 'gl':
        this.reportsService.getGeneralLedger({
          account_id: this.selectedAccountId(),
          project_id: this.selectedProjectId(),
          from_date: this.fromDate(),
          to_date: this.toDate(),
          limit: this.limit(),
          offset: this.offset()
        }).subscribe({
          next: (res) => { this.glReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'cashbook':
        this.reportsService.getCashBankBook({
          book_type: this.bookType(),
          account_id: this.selectedAccountId(),
          project_id: this.selectedProjectId(),
          from_date: this.fromDate(),
          to_date: this.toDate(),
          limit: this.limit(),
          offset: this.offset()
        }).subscribe({
          next: (res) => { this.cashBankReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'ap-aging':
        this.reportsService.getAPAging({
          as_of_date: this.asOfDate(),
          vendor_id: this.selectedVendorId()
        }).subscribe({
          next: (res) => { this.apAgingReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'ar-aging':
        this.reportsService.getARAging({
          as_of_date: this.asOfDate(),
          customer_id: this.selectedCustomerId(),
          project_id: this.selectedProjectId()
        }).subscribe({
          next: (res) => { this.arAgingReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'advances':
        this.reportsService.getCustomerAdvances({
          customer_id: this.selectedCustomerId(),
          project_id: this.selectedProjectId(),
          limit: this.limit(),
          offset: this.offset()
        }).subscribe({
          next: (res) => { this.advancesReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'project-pnl':
        this.reportsService.getProjectIncomeExp({
          project_id: this.selectedProjectId(),
          from_date: this.fromDate(),
          to_date: this.toDate()
        }).subscribe({
          next: (res) => { this.projectIncomeExpReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'cost-to-complete':
        this.reportsService.getCostToComplete({
          project_id: this.selectedProjectId()
        }).subscribe({
          next: (res) => { this.costToCompleteReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'cwip':
        this.reportsService.getCWIPStatement({
          project_id: this.selectedProjectId(),
          as_of_date: this.asOfDate()
        }).subscribe({
          next: (res) => { this.cwipReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'loan-schedule':
        this.reportsService.getLoanSchedule().subscribe({
          next: (res) => { this.loanScheduleReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'brs':
        this.reportsService.getBankReconciliationSummary({
          account_id: this.selectedAccountId(),
          as_of_date: this.asOfDate()
        }).subscribe({
          next: (res) => { this.bankReconReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'party-statement':
        const partyId = this.partyType() === 'VENDOR'
          ? (this.selectedVendorId() || (this.vendors()[0]?.id || 1))
          : (this.selectedCustomerId() || (this.customers()[0]?.id || 1));

        this.reportsService.getPartyStatement({
          party_type: this.partyType(),
          party_id: partyId,
          from_date: this.fromDate(),
          to_date: this.toDate()
        }).subscribe({
          next: (res) => { this.partyStatementReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'budget-variance':
        this.reportsService.getBudgetVsActual({
          project_id: this.selectedProjectId()
        }).subscribe({
          next: (res) => { this.budgetVarianceReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'voucher-register':
        this.reportsService.getVoucherRegister({
          voucher_type: this.voucherType(),
          project_id: this.selectedProjectId(),
          from_date: this.fromDate(),
          to_date: this.toDate(),
          limit: this.limit(),
          offset: this.offset()
        }).subscribe({
          next: (res) => { this.voucherRegisterReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'closing-checklist':
        this.reportsService.getClosingChecklist().subscribe({
          next: (res) => { this.closingChecklistReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;

      case 'audit-trail':
        this.reportsService.getAuditTrail({
          from_date: this.fromDate(),
          to_date: this.toDate(),
          limit: this.limit(),
          offset: this.offset()
        }).subscribe({
          next: (res) => { this.auditTrailReport.set(res); this.isLoading.set(false); },
          error: (err) => { console.error(err); this.isLoading.set(false); }
        });
        break;
    }
  }

  // Pagination Controls
  nextPage(): void {
    this.offset.update(v => v + this.limit());
    this.loadCurrentTabReport();
  }

  prevPage(): void {
    this.offset.update(v => Math.max(0, v - this.limit()));
    this.loadCurrentTabReport();
  }

  printReport(): void {
    window.print();
  }

  exportCSV(): void {
    let rows: any[] = [];
    let filename = `report_${this.activeTab()}_${new Date().toISOString().slice(0, 10)}.csv`;

    switch (this.activeTab()) {
      case 'gl':
        rows = this.glReport()?.rows || [];
        break;
      case 'cashbook':
        rows = this.cashBankReport()?.rows || [];
        break;
      case 'ap-aging':
        rows = this.apAgingReport()?.rows || [];
        break;
      case 'ar-aging':
        rows = this.arAgingReport()?.rows || [];
        break;
      case 'advances':
        rows = this.advancesReport()?.rows || [];
        break;
      case 'project-pnl':
        rows = this.projectIncomeExpReport()?.rows || [];
        break;
      case 'cost-to-complete':
        rows = this.costToCompleteReport()?.rows || [];
        break;
      case 'cwip':
        rows = this.cwipReport()?.rows || [];
        break;
      case 'loan-schedule':
        rows = this.loanScheduleReport()?.rows || [];
        break;
      case 'brs':
        rows = this.bankReconReport()?.rows || [];
        break;
      case 'party-statement':
        rows = this.partyStatementReport()?.rows || [];
        break;
      case 'budget-variance':
        rows = this.budgetVarianceReport()?.rows || [];
        break;
      case 'voucher-register':
        rows = this.voucherRegisterReport()?.rows || [];
        break;
      case 'closing-checklist':
        rows = this.closingChecklistReport()?.items || [];
        break;
      case 'audit-trail':
        rows = this.auditTrailReport()?.rows || [];
        break;
    }

    if (!rows.length) {
      alert('No data available to export.');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] ?? '')).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
