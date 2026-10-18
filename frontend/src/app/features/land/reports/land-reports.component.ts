import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { LandService } from '../../../core/services/land.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { StatusBadgeComponent, StatusVariant } from '../../../shared/components/status-badge/status-badge.component';

export interface ReportMeta {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
}

export interface SummaryCard {
  label: string;
  value: string;
  subValue?: string;
  badge?: string;
  icon?: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'badge' | 'code' | 'date';
}

@Component({
  selector: 'app-land-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardContainerComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './land-reports.component.html',
  styleUrls: []
})
export class LandReportsComponent implements OnInit {
  private landService = inject(LandService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // 15 Reports Catalog
  reportCatalog: ReportMeta[] = [
    {
      id: 'landowner-master',
      title: '1. Landowner Master & Owner-Wise Landholding',
      category: 'Landowner & Ownership',
      description: 'Comprehensive register of verified landowners, linked parcels, total landholding across districts, and NID verification status.',
      icon: 'users'
    },
    {
      id: 'parcel-register',
      title: '2. Land Parcel Register by District, Mouza, Khatian & Dag',
      category: 'Cadastral & Land Registry',
      description: 'Hierarchical registry of land parcels with linked CS, SA, RS, BS khatians, dags, JL numbers, and acquisition states.',
      icon: 'map-pin'
    },
    {
      id: 'opportunity-pipeline',
      title: '3. Acquisition Opportunity Pipeline',
      category: 'Deal Sourcing & Proposals',
      description: 'Sourcing and feasibility pipeline of potential land proposals, broker channels, indicative costs, and FAR potential.',
      icon: 'trending-up'
    },
    {
      id: 'area-summary',
      title: '4. Land Area Summary in Decimal, Katha, Bigha & SqFt',
      category: 'Survey & Land Metrics',
      description: 'Standardized multi-unit land conversion summary with road frontage verification and mathematical parity checks.',
      icon: 'maximize-2'
    },
    {
      id: 'ownership-discrepancy',
      title: '5. Ownership Share & Discrepancy Report',
      category: 'Landowner & Ownership',
      description: 'Variance audit between recorded landowner fractional shares in title deeds versus field khatiyan claims.',
      icon: 'alert-triangle'
    },
    {
      id: 'unverified-documents',
      title: '6. Missing or Unverified Document Report',
      category: 'Legal & Title Vetting',
      description: 'Detailed checklist of missing, expired, or unverified baya deeds, mutation khatians, DCR, and khajna tax receipts.',
      icon: 'file-warning'
    },
    {
      id: 'due-diligence-encumbrance',
      title: '7. Legal Due-Diligence & Encumbrance Report',
      category: 'Legal & Title Vetting',
      description: 'Audit of legal encumbrances, pending civil litigations, non-encumbrance certificate (NEC) status, and legal risk levels.',
      icon: 'shield-alert'
    },
    {
      id: 'valuation-cost-sqft',
      title: '8. Acquisition Valuation & Cost-per-Square-Foot Report',
      category: 'Commercial & Costing',
      description: 'Comparison of landowner asking price, independent market valuation, and negotiated rate with per-decimal and per-sqft metrics.',
      icon: 'calculator'
    },
    {
      id: 'expenditure-variance',
      title: '9. Approved vs. Actual Acquisition Expenditure',
      category: 'Commercial & Costing',
      description: 'Variance tracking between board-approved acquisition budgets and actual expenditures across registration, duties, and legal fees.',
      icon: 'bar-chart-2'
    },
    {
      id: 'agreement-milestones',
      title: '10. Agreement Expiry & Milestone Report',
      category: 'Agreements & Joint Venture',
      description: 'Lifecycle monitoring of JV and outright agreements, upcoming milestone deliverables, completion deadlines, and renewal alerts.',
      icon: 'clock'
    },
    {
      id: 'payment-schedule-balance',
      title: '11. Owner-Wise Payment Schedule & Outstanding Balance',
      category: 'Treasury & Finance',
      description: 'Disbursement register tracking scheduled installments, actual bank postings, remaining balances, and accounting voucher links.',
      icon: 'credit-card'
    },
    {
      id: 'overdue-installments',
      title: '12. Overdue Installments & Upcoming Payment Obligations',
      category: 'Treasury & Finance',
      description: 'Critical alerts for delinquent acquisition payments, maturity aging, and upcoming 30-day cash flow commitments.',
      icon: 'alert-circle'
    },
    {
      id: 'project-wise-summary',
      title: '13. Project-Wise Acquired Land & Acquisition Costs',
      category: 'Executive Portfolio',
      description: 'Portfolio aggregation summarizing total land bank accumulation, acquisition progress %, and capital expenditure by project.',
      icon: 'pie-chart'
    },
    {
      id: 'approval-exception-history',
      title: '14. Acquisition Approval History & Exception Report',
      category: 'Governance & Compliance',
      description: 'Audit trail of commercial concessions, high-risk legal exception clearances, board overrides, and formal approvals.',
      icon: 'check-circle'
    },
    {
      id: 'acquisition-audit-trail',
      title: '15. Land Acquisition Audit Trail',
      category: 'Governance & Compliance',
      description: 'Immutable chronological system event log tracking parcel creation, term revisions, survey modifications, and payment disbursements.',
      icon: 'history'
    }
  ];

  selectedReportId = 'landowner-master';
  selectedCategory = 'ALL';
  reportSearchQuery = '';

  // Filter Bar State
  startDate = '';
  endDate = '';
  selectedCompany = '';
  selectedProject = '';
  selectedLocation = '';
  selectedStatus = 'ALL';
  searchTerm = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;

  // Dynamic Options (Searchable Dropdowns)
  companyOptions: { value: any; label: string }[] = [];
  projectOptions: { value: any; label: string }[] = [];
  locationOptions: { value: any; label: string }[] = [];
  statusOptions: { value: any; label: string }[] = [];

  // Active Report Data
  isLoading = false;
  activeReport: any = null;
  summaryCards: SummaryCard[] = [];
  columns: ReportColumn[] = [];
  rows: any[] = [];

  // Modals
  isDetailModalOpen = false;
  selectedRowDetail: any = null;
  detailKeys: string[] = [];

  isQuickAddModalOpen = false;
  quickAddType = 'PROJECT';
  quickAddTitle = '';
  quickAddCode = '';
  quickAddLocation = '';

  ngOnInit(): void {
    const d = new Date();
    this.endDate = d.toISOString().substring(0, 10);
    const past = new Date(d.setDate(d.getDate() - 90));
    this.startDate = past.toISOString().substring(0, 10);

    this.loadFilterOptions();

    // Listen to queryParams from sidebar submenu clicks
    this.route.queryParams.subscribe(params => {
      if (params['type'] && params['type'] !== this.selectedReportId) {
        this.selectedReportId = params['type'];
        this.currentPage = 1;
        this.loadReportData();
      } else if (!this.activeReport) {
        this.loadReportData();
      }
    });
  }

  onReportChange(newId: string): void {
    if (this.selectedReportId === newId) return;
    this.selectedReportId = newId;
    this.currentPage = 1;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type: newId },
      queryParamsHandling: 'merge'
    });
    this.loadReportData();
  }

  get filteredCatalog(): ReportMeta[] {
    return this.reportCatalog.filter(r => {
      const matchCat = this.selectedCategory === 'ALL' || r.category === this.selectedCategory;
      const matchQuery = !this.reportSearchQuery ||
        r.title.toLowerCase().includes(this.reportSearchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(this.reportSearchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }

  get currentReportMeta(): ReportMeta {
    return this.reportCatalog.find(r => r.id === this.selectedReportId) || this.reportCatalog[0];
  }

  get categories(): string[] {
    const cats = Array.from(new Set(this.reportCatalog.map(r => r.category)));
    return ['ALL', ...cats];
  }

  loadFilterOptions(): void {
    this.landService.getReportFilterOptions().subscribe({
      next: (res: any) => {
        if (res) {
          this.companyOptions = res.companies || [];
          this.projectOptions = res.projects || [];
          this.locationOptions = res.districts || [];
          this.statusOptions = res.statuses || [];
        }
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback default options
        this.companyOptions = [
          { value: '1', label: 'Blue Oceans Real Estate Holdings Ltd.' },
          { value: '2', label: 'Blue Oceans Land Development Corp.' }
        ];
        this.projectOptions = [
          { value: '1', label: 'PRJ-DHAKA-NORTH - Uttara Sector 18 Extension' },
          { value: '2', label: 'PRJ-PURBACHAL-04 - Purbachal Smart Enclave' },
          { value: '3', label: 'PRJ-KERANIGANJ-01 - Riverview Township' }
        ];
        this.locationOptions = [
          { value: 'Dhaka', label: 'Dhaka' },
          { value: 'Narayanganj', label: 'Narayanganj' },
          { value: 'Gazipur', label: 'Gazipur' },
          { value: 'Chittagong', label: 'Chittagong' }
        ];
        this.statusOptions = [
          { value: 'ALL', label: 'All Acquisition Statuses' },
          { value: 'ACQUIRED', label: 'Fully Acquired & Registered' },
          { value: 'VETTING', label: 'Under Legal Vetting' },
          { value: 'NEGOTIATING', label: 'Commercial Negotiation' }
        ];
        this.cdr.detectChanges();
      }
    });
  }

  selectReport(reportId: string): void {
    if (this.selectedReportId === reportId) return;
    this.selectedReportId = reportId;
    this.currentPage = 1;
    this.loadReportData();
  }

  loadReportData(): void {
    this.isLoading = true;
    const skip = (this.currentPage - 1) * this.pageSize;
    const filters = {
      start_date: this.startDate,
      end_date: this.endDate,
      company_id: this.selectedCompany,
      project_id: this.selectedProject,
      location: this.selectedLocation,
      acquisition_status: this.selectedStatus,
      search: this.searchTerm,
      skip,
      limit: this.pageSize
    };

    this.landService.getLandReport(this.selectedReportId, filters).subscribe({
      next: (res: any) => {
        this.activeReport = res;
        this.summaryCards = res.summary_cards || [];
        this.columns = res.columns || [];
        this.rows = res.items || [];
        this.totalRecords = res.total || this.rows.length;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading report', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadReportData();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCompany = '';
    this.selectedProject = '';
    this.selectedLocation = '';
    this.selectedStatus = 'ALL';
    this.currentPage = 1;
    this.loadReportData();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadReportData();
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize) || 1;
  }

  // --- Modal Drilldown ---
  openRowDetail(row: any): void {
    this.selectedRowDetail = row;
    this.detailKeys = Object.keys(row).filter(k => k !== 'id');
    this.isDetailModalOpen = true;
  }

  closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.selectedRowDetail = null;
  }

  // --- Quick Create Dropdown Options ---
  openQuickAdd(type: 'PROJECT' | 'LOCATION' | 'COMPANY'): void {
    this.quickAddType = type;
    this.quickAddTitle = '';
    this.quickAddCode = '';
    this.quickAddLocation = '';
    this.isQuickAddModalOpen = true;
  }

  saveQuickOption(): void {
    if (!this.quickAddTitle) return;
    const newVal = String(Date.now());
    if (this.quickAddType === 'PROJECT') {
      const opt = { value: newVal, label: `${this.quickAddCode || 'PRJ'} - ${this.quickAddTitle}` };
      this.projectOptions = [opt, ...this.projectOptions];
      this.selectedProject = newVal;
    } else if (this.quickAddType === 'LOCATION') {
      const opt = { value: this.quickAddTitle, label: this.quickAddTitle };
      this.locationOptions = [opt, ...this.locationOptions];
      this.selectedLocation = this.quickAddTitle;
    } else if (this.quickAddType === 'COMPANY') {
      const opt = { value: newVal, label: this.quickAddTitle };
      this.companyOptions = [opt, ...this.companyOptions];
      this.selectedCompany = newVal;
    }
    this.isQuickAddModalOpen = false;
    this.applyFilters();
  }

  // --- Export to Excel ---
  exportToExcel(): void {
    if (!this.rows || this.rows.length === 0) return;
    const headers = this.columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const dataLines = this.rows.map(row => {
      return this.columns.map(c => {
        const val = row[c.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csvContent = '\uFEFF' + [headers, ...dataLines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.selectedReportId}_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // --- Export to PDF / Print ---
  exportToPDF(): void {
    window.print();
  }

  getStatusVariant(val: string): StatusVariant {
    if (!val) return 'info';
    const s = String(val).toUpperCase();
    if (s.includes('VERIFIED') || s.includes('CLEARED') || s.includes('ACQUIRED') || s.includes('APPROVED') || s.includes('ACTIVE') || s.includes('DISBURSED') || s.includes('UNDER_BUDGET')) {
      return 'success';
    }
    if (s.includes('PENDING') || s.includes('REVIEW') || s.includes('CONDITION') || s.includes('EXPIRING') || s.includes('PARTIAL')) {
      return 'warning';
    }
    if (s.includes('DISCREPANCY') || s.includes('MISSING') || s.includes('BLOCKED') || s.includes('OVERDUE') || s.includes('EXCEEDED') || s.includes('EXPIRED') || s.includes('CRITICAL')) {
      return 'danger';
    }
    return 'info';
  }

  formatValue(val: any, type: string): string {
    if (val === null || val === undefined) return '-';
    if (type === 'currency') {
      return 'BDT ' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (type === 'number') {
      return Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    return String(val);
  }
}
