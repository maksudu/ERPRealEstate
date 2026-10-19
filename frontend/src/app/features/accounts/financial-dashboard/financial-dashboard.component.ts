import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinancialDashboardService } from '../../../core/services/financial-dashboard.service';
import {
  FilterOptionsResponse,
  DashboardKPIsResponse,
  ProjectFinancialSummaryResponse,
  ProjectFinancialSummaryRow,
  DrilldownResponse,
  DrilldownItem,
  KPIMetric,
  DashboardFilterState
} from '../../../core/models/financial-dashboard.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption,
  ModalComponent
} from '../../../shared/components';

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent
  ],
  templateUrl: './financial-dashboard.component.html'
})
export class FinancialDashboardComponent implements OnInit {
  private finService = inject(FinancialDashboardService);
  private router = inject(Router);

  // Loading States
  loading = signal<boolean>(true);
  loadingProjects = signal<boolean>(false);
  loadingDrilldown = signal<boolean>(false);

  // Filter Data
  filterOptions = signal<FilterOptionsResponse | null>(null);

  // Active Filter State
  selectedCompany = signal<string>('all');
  selectedFiscalYear = signal<string>('all');
  selectedProject = signal<string>('all');
  selectedCostCenter = signal<string>('all');
  selectedAccountGroup = signal<string>('all');
  selectedAccount = signal<string>('all');
  selectedVoucherType = signal<string>('all');
  selectedVoucherStatus = signal<string>('all');
  selectedBankAccount = signal<string>('all');
  selectedPaymentMethod = signal<string>('all');
  selectedCurrency = signal<string>('BDT');
  fromDate = signal<string>('');
  toDate = signal<string>('');
  activeDatePreset = signal<string>('all_time');

  // Dashboard Data
  kpiData = signal<DashboardKPIsResponse | null>(null);
  projectsSummary = signal<ProjectFinancialSummaryResponse | null>(null);

  // Project Table Search & Filter
  projectSearch = signal<string>('');
  projectDistrictFilter = signal<string>('all');
  projectHealthFilter = signal<string>('all');

  // Drilldown Modal State
  drilldownModalOpen = signal<boolean>(false);
  activeDrilldownKPI = signal<string>('');
  drilldownData = signal<DrilldownResponse | null>(null);
  drilldownSearch = signal<string>('');

  // Dropdown Options
  companyOptions = computed<SelectOption[]>(() => {
    const list = this.filterOptions()?.companies || [];
    return [
      { label: 'All Companies / Legal Entities', value: 'all' },
      ...list.map(c => ({ label: `${c.name} (${c.code || 'ORG'})`, value: String(c.id) }))
    ];
  });

  fiscalYearOptions = computed<SelectOption[]>(() => {
    const list = this.filterOptions()?.fiscal_years || [];
    return [
      { label: 'All Financial Years', value: 'all' },
      ...list.map(f => ({ label: f.name, value: String(f.id) }))
    ];
  });

  projectOptions = computed<SelectOption[]>(() => {
    const list = this.filterOptions()?.projects || [];
    return [
      { label: 'All Projects (20+ Portfolio)', value: 'all' },
      ...list.map(p => ({ label: `${p.name} [${p.code}]`, value: String(p.id), sublabel: p.district }))
    ];
  });

  costCenterOptions = computed<SelectOption[]>(() => {
    const list = this.filterOptions()?.cost_centers || [];
    return [
      { label: 'All Cost Centres', value: 'all' },
      ...list.map(cc => ({ label: `${cc.name} (${cc.code})`, value: String(cc.id) }))
    ];
  });

  accountGroupOptions = computed<SelectOption[]>(() => {
    const list = this.filterOptions()?.account_groups || [];
    return [
      { label: 'All Account Groups', value: 'all' },
      ...list.map(g => ({ label: g.replace('_', ' '), value: g }))
    ];
  });

  accountOptions = computed<SelectOption[]>(() => {
    const list = this.filterOptions()?.accounts || [];
    return [
      { label: 'All Accounts / Ledgers', value: 'all' },
      ...list.map(a => ({ label: `${a.code} - ${a.name}`, value: String(a.id) }))
    ];
  });

  voucherTypeOptions = computed<SelectOption[]>(() => {
    const list = this.filterOptions()?.voucher_types || [];
    return [
      { label: 'All Voucher Types', value: 'all' },
      ...list.map(t => ({ label: t.replace('_', ' '), value: t }))
    ];
  });

  voucherStatusOptions = computed<SelectOption[]>(() => {
    const list = this.filterOptions()?.voucher_statuses || [];
    return [
      { label: 'All Voucher Statuses', value: 'all' },
      ...list.map(s => ({ label: s.replace('_', ' '), value: s }))
    ];
  });

  bankAccountOptions = computed<SelectOption[]>(() => {
    const list = this.filterOptions()?.bank_accounts || [];
    return [
      { label: 'All Bank Accounts', value: 'all' },
      ...list.map(b => ({ label: b.name, value: String(b.id) }))
    ];
  });

  paymentMethodOptions = computed<SelectOption[]>(() => {
    const list = this.filterOptions()?.payment_methods || [];
    return [
      { label: 'All Payment Methods', value: 'all' },
      ...list.map(m => ({ label: m, value: m }))
    ];
  });

  currencyOptions = computed<SelectOption[]>(() => [
    { label: 'BDT (৳)', value: 'BDT' },
    { label: 'USD ($)', value: 'USD' },
    { label: 'EUR (€)', value: 'EUR' }
  ]);

  districtOptions = computed<SelectOption[]>(() => {
    const projects = this.projectsSummary()?.projects || [];
    const districts = Array.from(new Set(projects.map(p => p.district).filter(Boolean)));
    return [
      { label: 'All Districts', value: 'all' },
      ...districts.map(d => ({ label: d, value: d }))
    ];
  });

  healthOptions: SelectOption[] = [
    { label: 'All Health Statuses', value: 'all' },
    { label: 'Excellent (<80% Spent)', value: 'EXCELLENT' },
    { label: 'Healthy (80-95% Spent)', value: 'HEALTHY' },
    { label: 'Attention (>95% Spent)', value: 'ATTENTION' }
  ];

  // Filtered Project Rows
  filteredProjects = computed<ProjectFinancialSummaryRow[]>(() => {
    const list = this.projectsSummary()?.projects || [];
    const s = this.projectSearch().toLowerCase().trim();
    const dist = this.projectDistrictFilter();
    const hlth = this.projectHealthFilter();

    return list.filter(p => {
      const matchSearch = !s || p.project_name.toLowerCase().includes(s) || p.project_code.toLowerCase().includes(s) || p.district.toLowerCase().includes(s);
      const matchDist = dist === 'all' || p.district === dist;
      const matchHlth = hlth === 'all' || p.financial_health === hlth;
      return matchSearch && matchDist && matchHlth;
    });
  });

  // Filtered Drilldown Items
  filteredDrilldownItems = computed<DrilldownItem[]>(() => {
    const items = this.drilldownData()?.items || [];
    const s = this.drilldownSearch().toLowerCase().trim();
    if (!s) return items;
    return items.filter(it =>
      it.voucher_number.toLowerCase().includes(s) ||
      it.narration.toLowerCase().includes(s) ||
      (it.account_name && it.account_name.toLowerCase().includes(s)) ||
      (it.project_name && it.project_name.toLowerCase().includes(s)) ||
      (it.reference_no && it.reference_no.toLowerCase().includes(s))
    );
  });

  ngOnInit(): void {
    this.loadFilterOptions();
    this.refreshDashboard();
    this.loadProjectsSummary();
  }

  loadFilterOptions(): void {
    this.finService.getFilterOptions().subscribe({
      next: (opts) => this.filterOptions.set(opts),
      error: (err) => console.error('Error fetching filter options', err)
    });
  }

  refreshDashboard(): void {
    this.loading.set(true);
    const filters = this.buildFilterState();
    this.finService.getDashboardKPIs(filters).subscribe({
      next: (kpis) => {
        this.kpiData.set(kpis);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard KPIs', err);
        this.loading.set(false);
      }
    });
  }

  loadProjectsSummary(): void {
    this.loadingProjects.set(true);
    this.finService.getProjectsFinancialSummary().subscribe({
      next: (summary) => {
        this.projectsSummary.set(summary);
        this.loadingProjects.set(false);
      },
      error: (err) => {
        console.error('Error loading projects summary', err);
        this.loadingProjects.set(false);
      }
    });
  }

  buildFilterState(): DashboardFilterState {
    return {
      organization_id: this.selectedCompany() !== 'all' ? Number(this.selectedCompany()) : null,
      fiscal_year_id: this.selectedFiscalYear() !== 'all' ? Number(this.selectedFiscalYear()) : null,
      project_id: this.selectedProject() !== 'all' ? Number(this.selectedProject()) : null,
      cost_center_id: this.selectedCostCenter() !== 'all' ? Number(this.selectedCostCenter()) : null,
      account_group: this.selectedAccountGroup() !== 'all' ? this.selectedAccountGroup() : null,
      account_id: this.selectedAccount() !== 'all' ? Number(this.selectedAccount()) : null,
      voucher_type: this.selectedVoucherType() !== 'all' ? this.selectedVoucherType() : null,
      voucher_status: this.selectedVoucherStatus() !== 'all' ? this.selectedVoucherStatus() : null,
      bank_account_id: this.selectedBankAccount() !== 'all' ? Number(this.selectedBankAccount()) : null,
      payment_method: this.selectedPaymentMethod() !== 'all' ? this.selectedPaymentMethod() : null,
      currency: this.selectedCurrency(),
      from_date: this.fromDate() || undefined,
      to_date: this.toDate() || undefined
    };
  }

  applyFilters(): void {
    this.refreshDashboard();
  }

  resetFilters(): void {
    this.selectedCompany.set('all');
    this.selectedFiscalYear.set('all');
    this.selectedProject.set('all');
    this.selectedCostCenter.set('all');
    this.selectedAccountGroup.set('all');
    this.selectedAccount.set('all');
    this.selectedVoucherType.set('all');
    this.selectedVoucherStatus.set('all');
    this.selectedBankAccount.set('all');
    this.selectedPaymentMethod.set('all');
    this.selectedCurrency.set('BDT');
    this.fromDate.set('');
    this.toDate.set('');
    this.activeDatePreset.set('all_time');
    this.refreshDashboard();
  }

  setDatePreset(preset: string): void {
    this.activeDatePreset.set(preset);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');

    if (preset === 'today') {
      const dateStr = `${y}-${m}-${d}`;
      this.fromDate.set(dateStr);
      this.toDate.set(dateStr);
    } else if (preset === 'this_month') {
      this.fromDate.set(`${y}-${m}-01`);
      this.toDate.set(`${y}-${m}-${d}`);
    } else if (preset === 'this_fy') {
      // BD Fiscal Year: July 1 to June 30
      const startYear = today.getMonth() >= 6 ? y : y - 1;
      this.fromDate.set(`${startYear}-07-01`);
      this.toDate.set(`${startYear + 1}-06-30`);
    } else {
      this.fromDate.set('');
      this.toDate.set('');
    }
    this.refreshDashboard();
  }

  // Drilldown Modal
  openDrilldown(kpiKey: string): void {
    this.activeDrilldownKPI.set(kpiKey);
    this.drilldownSearch.set('');
    this.drilldownModalOpen.set(true);
    this.loadingDrilldown.set(true);

    const prjId = this.selectedProject() !== 'all' ? Number(this.selectedProject()) : null;
    const ccId = this.selectedCostCenter() !== 'all' ? Number(this.selectedCostCenter()) : null;

    this.finService.getDrilldownTransactions({
      kpi_type: kpiKey,
      project_id: prjId,
      cost_center_id: ccId,
      from_date: this.fromDate() || undefined,
      to_date: this.toDate() || undefined,
      limit: 100
    }).subscribe({
      next: (res) => {
        this.drilldownData.set(res);
        this.loadingDrilldown.set(false);
      },
      error: (err) => {
        console.error('Error loading drilldown', err);
        this.loadingDrilldown.set(false);
      }
    });
  }

  closeDrilldown(): void {
    this.drilldownModalOpen.set(false);
    this.drilldownData.set(null);
  }

  filterToProject(projectId: number): void {
    this.selectedProject.set(String(projectId));
    this.refreshDashboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateToVouchers(): void {
    this.router.navigate(['/accounts/vouchers']);
  }

  navigateToLedger(accountId?: number): void {
    if (accountId) {
      this.router.navigate(['/accounts/ledger'], { queryParams: { account_id: accountId } });
    } else {
      this.router.navigate(['/accounts/ledger']);
    }
  }

  navigateToReport(route: string): void {
    this.router.navigate([`/accounts/reports-hub/${route}`]);
  }

  // Currency & Lakh / Crore BD formatting helper
  formatBDT(val?: number): string {
    if (val === undefined || val === null) return '৳0.00';
    const num = Number(val);
    const abs = Math.abs(num);

    if (abs >= 10000000) {
      const cr = num / 10000000;
      return `৳${cr.toFixed(2)} Cr`;
    } else if (abs >= 100000) {
      const lac = num / 100000;
      return `৳${lac.toFixed(2)} Lac`;
    }
    return `৳${num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatExactBDT(val?: number): string {
    if (val === undefined || val === null) return '৳0.00';
    return `৳${Number(val).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
