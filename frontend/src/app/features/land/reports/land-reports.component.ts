import { Component, OnInit, ChangeDetectorRef, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LandService } from '../../../core/services/land.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { StatusBadgeComponent, StatusVariant } from '../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';

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
    StatusBadgeComponent,
    SearchableSelectComponent,
    CustomInputComponent,
    CustomButtonComponent
  ],
  templateUrl: './land-reports.component.html',
  styleUrls: []
})
export class LandReportsComponent implements OnInit {
  private landService = inject(LandService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Exact 14 Land Bank Reports matching user specification
  reportCatalog: ReportMeta[] = [
    {
      id: 'land-bank-register',
      title: '1. Land Bank Register',
      category: 'Land Bank & Portfolio',
      description: 'Comprehensive master register of all land bank holdings, zoning, acquisition models, total acreage, and status.',
      icon: 'layers'
    },
    {
      id: 'proposed-acquired-land',
      title: '2. Proposed & Acquired Land Report',
      category: 'Acquisition & Proposals',
      description: 'Comparative audit of proposed land proposals versus actually acquired land area, balance to acquire, and acquisition velocity.',
      icon: 'trending-up'
    },
    {
      id: 'landowner-joint-owner',
      title: '3. Landowner & Joint-Owner Register',
      category: 'Landowner & Ownership',
      description: 'Complete register of landowners, joint-owners, fractional title ownership shares, NID verification, and linked parcels.',
      icon: 'users'
    },
    {
      id: 'mouza-khatian-dag',
      title: '4. Mouza, Khatian & Dag Register',
      category: 'Cadastral & Land Registry',
      description: 'Hierarchical cadastral registry linking district, upazila, mouza JL numbers, CS/SA/RS/BS khatians, and dag records.',
      icon: 'map-pin'
    },
    {
      id: 'deed-mutation-status',
      title: '5. Deed & Mutation Status Report',
      category: 'Title & Mutation Vetting',
      description: 'Lifecycle tracking of registered title deeds, Sub-Registry endorsements, mutation case status, DCR, and khajna tax receipts.',
      icon: 'file-check'
    },
    {
      id: 'land-area-reconciliation',
      title: '6. Land Area Reconciliation Report',
      category: 'Survey & Area Reconciliation',
      description: 'Mathematical reconciliation across title deed area, physical boundary survey area, and AC Land mutation records.',
      icon: 'maximize-2'
    },
    {
      id: 'valuation-acquisition-cost',
      title: '7. Land Valuation & Acquisition Cost Report',
      category: 'Commercial & Valuation',
      description: 'Independent market valuation, Sub-Registry government mouza rates, owner asking prices, and negotiated acquisition cost per decimal.',
      icon: 'calculator'
    },
    {
      id: 'owner-payment-outstanding',
      title: '8. Owner-Wise Payment & Outstanding Report',
      category: 'Treasury & Payments',
      description: 'Landowner-wise financial ledger displaying total agreed consideration, advance paid, milestone installments, and net outstanding balance.',
      icon: 'credit-card'
    },
    {
      id: 'jv-entitlement-agreement',
      title: '9. JV Entitlement & Agreement Report',
      category: 'Agreements & Joint Venture',
      description: 'Joint Venture commercial agreement terms, developer vs. landowner allocation ratios, signing money, and delivery milestones.',
      icon: 'clock'
    },
    {
      id: 'legal-risk-litigation',
      title: '10. Legal Risk & Litigation Report',
      category: 'Legal & Due-Diligence',
      description: 'Due diligence assessment of pending civil litigations, non-encumbrance certificate (NEC) status, court injunctions, and risk ratings.',
      icon: 'shield-alert'
    },
    {
      id: 'missing-docs-compliance',
      title: '11. Missing Documents & Compliance Report',
      category: 'Compliance & Documentation',
      description: 'Statutory audit checklist of missing baya deeds, uncertified khatian copies, delayed DCR receipts, and compliance flags.',
      icon: 'file-warning'
    },
    {
      id: 'future-projects-available',
      title: '12. Land Available for Future Projects',
      category: 'Land Bank & Portfolio',
      description: 'Strategic inventory of uncommitted land bank reserves available for upcoming residential, commercial, and township developments.',
      icon: 'pie-chart'
    },
    {
      id: 'project-land-allocation',
      title: '13. Project-Wise Land Allocation Report',
      category: 'Development & Allocation',
      description: 'Allocation of acquired land bank parcels to active real estate projects, tower footprints, infrastructure setbacks, and achieved FAR.',
      icon: 'map'
    },
    {
      id: 'budget-vs-actual',
      title: '14. Acquisition Budget Versus Actual Report',
      category: 'Commercial & Budgeting',
      description: 'Variance analysis comparing board-approved capital budgets with actual expenditures across purchase price, duties, survey, and legal fees.',
      icon: 'bar-chart-2'
    }
  ];

  selectedReportId = 'land-bank-register';
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
  pageSizeOptions = [10, 25, 50, 100];

  // Dynamic Options (Searchable Dropdowns)
  companyOptions: SelectOption[] = [];
  projectOptions: SelectOption[] = [];
  locationOptions: SelectOption[] = [];
  statusOptions: SelectOption[] = [];

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
  quickAddType: 'PROJECT' | 'LOCATION' | 'COMPANY' = 'PROJECT';
  quickAddTitle = '';
  quickAddCode = '';
  quickAddLocation = '';
  isSavingQuickOption = false;

  get reportOptions(): SelectOption[] {
    return this.reportCatalog.map(r => ({
      value: r.id,
      label: r.title,
      subLabel: r.category
    }));
  }

  get currentReportMeta(): ReportMeta {
    return this.reportCatalog.find(r => r.id === this.selectedReportId) || this.reportCatalog[0];
  }

  get categories(): string[] {
    const cats = Array.from(new Set(this.reportCatalog.map(r => r.category)));
    return ['ALL', ...cats];
  }

  ngOnInit(): void {
    const d = new Date();
    this.endDate = d.toISOString().substring(0, 10);
    const past = new Date();
    past.setDate(d.getDate() - 90);
    this.startDate = past.toISOString().substring(0, 10);

    this.loadFilterOptions();

    // Listen to queryParams from sidebar clicks
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        const found = this.reportCatalog.find(r => r.id === params['type']);
        if (found) {
          this.selectedReportId = found.id;
        } else {
          // Backward compatibility alias check
          const aliasMap: Record<string, string> = {
            'landowner-master': 'landowner-joint-owner',
            'parcel-register': 'mouza-khatian-dag',
            'opportunity-pipeline': 'proposed-acquired-land',
            'area-summary': 'land-area-reconciliation',
            'unverified-documents': 'missing-docs-compliance',
            'due-diligence-encumbrance': 'legal-risk-litigation',
            'valuation-cost-sqft': 'valuation-acquisition-cost',
            'expenditure-variance': 'budget-vs-actual',
            'agreement-milestones': 'jv-entitlement-agreement',
            'payment-schedule-balance': 'owner-payment-outstanding',
            'project-wise-summary': 'project-land-allocation'
          };
          this.selectedReportId = aliasMap[params['type']] || 'land-bank-register';
        }
        this.currentPage = 1;
        this.loadReportData();
      } else if (!this.activeReport) {
        this.loadReportData();
      }
    });
  }

  onReportChange(newId: any): void {
    const idStr = String(newId || '');
    if (!idStr || this.selectedReportId === idStr) return;
    this.selectedReportId = idStr;
    this.currentPage = 1;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type: idStr },
      queryParamsHandling: 'merge'
    });
    this.loadReportData();
  }

  loadFilterOptions(): void {
    this.landService.getReportFilterOptions().subscribe({
      next: (res: any) => {
        if (res) {
          this.companyOptions = (res.companies || []).map((c: any) => ({ value: String(c.value), label: c.label }));
          this.projectOptions = (res.projects || []).map((p: any) => ({ value: String(p.value), label: p.label, subLabel: p.district }));
          this.locationOptions = (res.districts || []).map((d: any) => ({ value: String(d.value), label: d.label }));
          this.statusOptions = (res.statuses || []).map((s: any) => ({ value: String(s.value), label: s.label }));
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.companyOptions = [
          { value: '1', label: 'Blue Oceans Real Estate Holdings Ltd.' },
          { value: '2', label: 'Blue Oceans Land Development Corp.' }
        ];
        this.projectOptions = [
          { value: '1', label: 'PRJ-DHAKA-NORTH - Uttara Sector 18 Extension', subLabel: 'Dhaka' },
          { value: '2', label: 'PRJ-PURBACHAL-04 - Purbachal Smart Enclave', subLabel: 'Narayanganj' },
          { value: '3', label: 'PRJ-KERANIGANJ-01 - Riverview Township', subLabel: 'Dhaka' }
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
        console.error('Error loading land report', err);
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

  onPageSizeChange(newSize: number): void {
    this.pageSize = Number(newSize);
    this.currentPage = 1;
    this.loadReportData();
  }

  readonly Math = Math;

  get currentEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
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

  // --- Dynamic Quick Add for Dropdowns ---
  openQuickAdd(type: 'PROJECT' | 'LOCATION' | 'COMPANY'): void {
    this.quickAddType = type;
    this.quickAddTitle = '';
    this.quickAddCode = '';
    this.quickAddLocation = '';
    this.isQuickAddModalOpen = true;
  }

  saveQuickOption(): void {
    if (!this.quickAddTitle.trim()) return;
    this.isSavingQuickOption = true;

    const payload = {
      type: this.quickAddType,
      title: this.quickAddTitle.trim(),
      code: this.quickAddCode.trim(),
      location: this.quickAddLocation.trim() || 'Dhaka'
    };

    this.http.post<any>('/api/v1/land/reports/filter-options/quick-create', payload).subscribe({
      next: (res) => {
        const newVal = String(res.value || Date.now());
        const newLabel = res.label || this.quickAddTitle;
        if (this.quickAddType === 'PROJECT') {
          const opt: SelectOption = { value: newVal, label: newLabel, subLabel: res.district };
          this.projectOptions = [opt, ...this.projectOptions];
          this.selectedProject = newVal;
        } else if (this.quickAddType === 'LOCATION') {
          const opt: SelectOption = { value: res.value || this.quickAddTitle, label: newLabel };
          this.locationOptions = [opt, ...this.locationOptions];
          this.selectedLocation = String(res.value || this.quickAddTitle);
        } else if (this.quickAddType === 'COMPANY') {
          const opt: SelectOption = { value: newVal, label: newLabel };
          this.companyOptions = [opt, ...this.companyOptions];
          this.selectedCompany = newVal;
        }
        this.isSavingQuickOption = false;
        this.isQuickAddModalOpen = false;
        this.applyFilters();
      },
      error: () => {
        // Fallback local addition if network fails
        const fallbackVal = String(Date.now());
        if (this.quickAddType === 'PROJECT') {
          const opt: SelectOption = { value: fallbackVal, label: `${this.quickAddCode || 'PRJ'} - ${this.quickAddTitle}` };
          this.projectOptions = [opt, ...this.projectOptions];
          this.selectedProject = fallbackVal;
        } else if (this.quickAddType === 'LOCATION') {
          const opt: SelectOption = { value: this.quickAddTitle, label: this.quickAddTitle };
          this.locationOptions = [opt, ...this.locationOptions];
          this.selectedLocation = this.quickAddTitle;
        } else if (this.quickAddType === 'COMPANY') {
          const opt: SelectOption = { value: fallbackVal, label: this.quickAddTitle };
          this.companyOptions = [opt, ...this.companyOptions];
          this.selectedCompany = fallbackVal;
        }
        this.isSavingQuickOption = false;
        this.isQuickAddModalOpen = false;
        this.applyFilters();
      }
    });
  }

  // --- Export to Excel (CSV) ---
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
    if (s.includes('VERIFIED') || s.includes('CLEARED') || s.includes('ACQUIRED') || s.includes('APPROVED') || s.includes('ACTIVE') || s.includes('DISBURSED') || s.includes('COMPLETED')) {
      return 'success';
    }
    if (s.includes('PENDING') || s.includes('REVIEW') || s.includes('CONDITION') || s.includes('EXPIRING') || s.includes('PARTIAL') || s.includes('NEGOTIATING') || s.includes('MUTATION')) {
      return 'warning';
    }
    if (s.includes('DISCREPANCY') || s.includes('MISSING') || s.includes('BLOCKED') || s.includes('OVERDUE') || s.includes('EXCEEDED') || s.includes('EXPIRED') || s.includes('CRITICAL') || s.includes('DISPUTED')) {
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

