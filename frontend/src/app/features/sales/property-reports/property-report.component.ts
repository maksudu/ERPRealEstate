import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  PropertyReportItem,
  PropertyReportResponse,
  PropertyReportKPIs,
  PropertyReportFilterParams
} from '../../../core/models/sales.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-property-report',
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
  templateUrl: './property-report.component.html'
})
export class PropertyReportComponent implements OnInit {
  private salesService = inject(SalesService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Data signals
  reportData = signal<PropertyReportResponse | null>(null);
  isLoading = signal<boolean>(true);
  isExportingExcel = signal<boolean>(false);
  isExportingPdf = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Filter signals
  searchQuery = signal<string>('');
  selectedProjectId = signal<string>('');
  selectedUnitType = signal<string>('');
  selectedInventoryStatus = signal<string>('');
  selectedWorkflowStage = signal<string>('');
  selectedPossessionStatus = signal<string>('');
  selectedFacing = signal<string>('');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  minArea = signal<number | null>(null);
  maxArea = signal<number | null>(null);
  showAdvancedFilters = signal<boolean>(false);

  // Pagination signals
  limit = signal<number>(20);
  offset = signal<number>(0);
  readonly Math = Math;

  // Project select options
  projects = signal<Project[]>([]);
  projectOptions = computed<SelectOption[]>(() => {
    const defaultOpt: SelectOption = { label: 'All Projects', value: '' };
    const opts = this.projects().map(p => ({
      label: `${p.project_name || 'Project ' + p.id} (${p.project_code || 'PRJ-' + p.id})`,
      value: String(p.id)
    }));
    return [defaultOpt, ...opts];
  });

  // Filter options
  unitTypeOptions: SelectOption[] = [
    { label: 'All Unit Types', value: '' },
    { label: 'Apartment / Residential', value: 'APARTMENT' },
    { label: 'Commercial Space', value: 'COMMERCIAL' },
    { label: 'Penthouse Suite', value: 'PENTHOUSE' },
    { label: 'Duplex Unit', value: 'DUPLEX' },
    { label: 'Retail / Shop', value: 'SHOP' },
    { label: 'Parking Space', value: 'PARKING' },
    { label: 'Studio Apartment', value: 'STUDIO' }
  ];

  inventoryStatusOptions: SelectOption[] = [
    { label: 'All Inventory Statuses', value: '' },
    { label: 'Available for Sale', value: 'AVAILABLE' },
    { label: 'Booked / Under Agreement', value: 'BOOKED' },
    { label: 'Sold & Finalized', value: 'SOLD' },
    { label: 'Reserved / In Negotiation', value: 'RESERVED' },
    { label: 'Blocked / Legal Hold', value: 'BLOCKED' }
  ];

  workflowStageOptions: SelectOption[] = [
    { label: 'All Workflow Stages', value: '' },
    { label: '01 - Draft Proposal', value: '01_DRAFT' },
    { label: '02 - Price Negotiation', value: '02_PRICE_NEGOTIATION' },
    { label: '03 - Sales Manager Approved', value: '03_SALES_MANAGER_APPROVED' },
    { label: '04 - Director Approved', value: '04_DIRECTOR_APPROVED' },
    { label: '05 - Agreement Prepared', value: '05_AGREEMENT_PREPARED' },
    { label: '06 - Agreement Signed', value: '06_AGREEMENT_SIGNED' },
    { label: '07 - Installment Active', value: '07_INSTALLMENT_ACTIVE' },
    { label: '08 - Registration In Progress', value: '08_REGISTRATION_IN_PROGRESS' },
    { label: '09 - Ready For Handover', value: '09_READY_FOR_HANDOVER' },
    { label: '10 - Handover Complete', value: '10_HANDOVER_COMPLETE' }
  ];

  possessionStatusOptions: SelectOption[] = [
    { label: 'All Possession Statuses', value: '' },
    { label: 'Not Handed Over', value: 'NOT_HANDED_OVER' },
    { label: 'Inspection Scheduled', value: 'INSPECTION_PENDING' },
    { label: 'Snagging Rectification Active', value: 'SNAGGING_ACTIVE' },
    { label: 'Full Physical Possession', value: 'FULL_PHYSICAL_POSSESSION' }
  ];

  facingOptions: SelectOption[] = [
    { label: 'All Facings', value: '' },
    { label: 'North', value: 'NORTH' },
    { label: 'South', value: 'SOUTH' },
    { label: 'East', value: 'EAST' },
    { label: 'West', value: 'WEST' },
    { label: 'North-East', value: 'NORTH_EAST' },
    { label: 'North-West', value: 'NORTH_WEST' },
    { label: 'South-East', value: 'SOUTH_EAST' },
    { label: 'South-West', value: 'SOUTH_WEST' }
  ];

  pageSizeOptions: SelectOption[] = [
    { label: '10 per page', value: '10' },
    { label: '20 per page', value: '20' },
    { label: '50 per page', value: '50' },
    { label: '100 per page', value: '100' }
  ];

  // Computed state
  currentPage = computed(() => {
    return Math.floor(this.offset() / this.limit()) + 1;
  });

  totalPages = computed(() => {
    const tot = this.reportData()?.total || 0;
    return Math.max(1, Math.ceil(tot / this.limit()));
  });

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchQuery()) count++;
    if (this.selectedProjectId()) count++;
    if (this.selectedUnitType()) count++;
    if (this.selectedInventoryStatus()) count++;
    if (this.selectedWorkflowStage()) count++;
    if (this.selectedPossessionStatus()) count++;
    if (this.selectedFacing()) count++;
    if (this.minPrice() !== null) count++;
    if (this.maxPrice() !== null) count++;
    if (this.minArea() !== null) count++;
    if (this.maxArea() !== null) count++;
    return count;
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadReport();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data || []),
      error: (err) => console.error('Failed to load projects list:', err)
    });
  }

  getFilterParams(): PropertyReportFilterParams {
    return {
      search: this.searchQuery() || undefined,
      project_id: this.selectedProjectId() ? Number(this.selectedProjectId()) : undefined,
      unit_type: this.selectedUnitType() || undefined,
      inventory_status: this.selectedInventoryStatus() || undefined,
      workflow_stage: this.selectedWorkflowStage() || undefined,
      possession_status: this.selectedPossessionStatus() || undefined,
      facing: this.selectedFacing() || undefined,
      min_price: this.minPrice() !== null ? Number(this.minPrice()) : undefined,
      max_price: this.maxPrice() !== null ? Number(this.maxPrice()) : undefined,
      min_area: this.minArea() !== null ? Number(this.minArea()) : undefined,
      max_area: this.maxArea() !== null ? Number(this.maxArea()) : undefined,
      limit: this.limit(),
      offset: this.offset()
    };
  }

  loadReport(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    const params = this.getFilterParams();

    this.salesService.getPropertyReportSummary(params).subscribe({
      next: (res) => {
        this.reportData.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching property portfolio report:', err);
        this.errorMessage.set('Failed to load property report data. Please verify filters and try again.');
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.offset.set(0);
    this.loadReport();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.offset.set(0);
    this.loadReport();
  }

  onPageSizeChange(val: string): void {
    this.limit.set(Number(val) || 20);
    this.offset.set(0);
    this.loadReport();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedProjectId.set('');
    this.selectedUnitType.set('');
    this.selectedInventoryStatus.set('');
    this.selectedWorkflowStage.set('');
    this.selectedPossessionStatus.set('');
    this.selectedFacing.set('');
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.minArea.set(null);
    this.maxArea.set(null);
    this.offset.set(0);
    this.loadReport();
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update(v => !v);
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.update(v => Math.max(0, v - this.limit()));
      this.loadReport();
    }
  }

  nextPage(): void {
    const tot = this.reportData()?.total || 0;
    if (this.offset() + this.limit() < tot) {
      this.offset.update(v => v + this.limit());
      this.loadReport();
    }
  }

  // File Download Handlers
  exportExcel(): void {
    this.isExportingExcel.set(true);
    const params = this.getFilterParams();

    this.salesService.downloadPropertyReportExcel(params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `Property_Portfolio_Report_${dateStr}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExportingExcel.set(false);
      },
      error: (err) => {
        console.error('Failed to export Excel report:', err);
        alert('Failed to generate Excel report. Please try again.');
        this.isExportingExcel.set(false);
      }
    });
  }

  exportPdf(): void {
    this.isExportingPdf.set(true);
    const params = this.getFilterParams();

    this.salesService.downloadPropertyReportPdf(params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `Property_Portfolio_Report_${dateStr}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExportingPdf.set(false);
      },
      error: (err) => {
        console.error('Failed to export PDF report:', err);
        alert('Failed to generate PDF report. Please try again.');
        this.isExportingPdf.set(false);
      }
    });
  }

  formatCurrency(num?: number | null): string {
    if (num === null || num === undefined) return '—';
    return '৳' + Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatNumber(num?: number | null): string {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('en-IN');
  }

  getWorkflowBadgeClass(stage?: string | null): string {
    if (!stage) return 'bg-muted text-muted-foreground border-border';
    if (stage.includes('HANDOVER_COMPLETE')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (stage.includes('REGISTRATION')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (stage.includes('INSTALLMENT')) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    if (stage.includes('AGREEMENT')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    if (stage.includes('APPROVED')) return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
    if (stage.includes('NEGOTIATION')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  }

  getInventoryStatusBadgeClass(status?: string | null): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'BOOKED':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'SOLD':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'RESERVED':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'BLOCKED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }

  getPossessionBadgeClass(status?: string | null): string {
    switch (status) {
      case 'FULL_PHYSICAL_POSSESSION':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'INSPECTION_PENDING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'SNAGGING_ACTIVE':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  }
}
