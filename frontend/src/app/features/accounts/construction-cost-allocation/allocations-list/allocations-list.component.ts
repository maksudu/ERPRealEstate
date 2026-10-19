import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CWIPAllocationService } from '../../../../core/services/cwip-allocation.service';
import { ProjectService } from '../../../../core/services/project.service';
import {
  CWIPAllocation,
  CWIPPortfolioSummaryKPIs,
  CWIPUnitCOGSTransferPayload
} from '../../../../core/models/cwip-allocation.model';
import { CWIPAllocationNavComponent } from '../cwip-allocation-nav.component';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-cwip-allocations-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CWIPAllocationNavComponent,
    CardContainerComponent,
    StatusBadgeComponent,
    SearchableSelectComponent,
    ModalComponent
  ],
  templateUrl: './allocations-list.component.html'
})
export class CWIPAllocationsListComponent implements OnInit {
  private cwipService = inject(CWIPAllocationService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  allocations: CWIPAllocation[] = [];
  kpis: CWIPPortfolioSummaryKPIs | null = null;
  loading: boolean = false;
  kpiLoading: boolean = false;

  // Filters
  searchQuery: string = '';
  selectedMethod: string = 'ALL';
  selectedCostCategory: string = 'ALL';
  selectedProjectId: number | null = null;

  // Pagination
  page: number = 1;
  limit: number = 10;
  total: number = 0;
  totalPages: number = 1;

  // Dynamic Options
  projectOptions: SelectOption[] = [];

  // Origin Audit & COGS Transfer Modals
  selectedAllocation: CWIPAllocation | null = null;
  showAuditModal: boolean = false;
  showCOGSModal: boolean = false;
  submittingCOGS: boolean = false;

  cogsForm: CWIPUnitCOGSTransferPayload = {
    transfer_date: new Date().toISOString().substring(0, 10),
    project_id: 1,
    unit_number: 'Flat 4B (Tower 1)',
    customer_name: 'Tareq Mahmud',
    sale_agreement_ref: 'AGR-2024-88',
    unit_floor_area_sft: 1850,
    cwip_cost_per_sft: 2450,
    transferred_cogs_amount: 4532500,
    accounting_policy_basis: 'Unit completed and handed over; accumulated development cost derecognized and transferred to Cost of Property Sold (5100).',
    approved_by: 'Head of Accounts / CFO'
  };

  feedbackMessage: string | null = null;
  feedbackType: 'success' | 'error' = 'success';

  ngOnInit(): void {
    this.loadKPIs();
    this.loadProjects();
    this.loadAllocations();
  }

  loadKPIs(): void {
    this.kpiLoading = true;
    this.cwipService.getKPIs().subscribe({
      next: (data) => {
        this.kpis = data;
        this.kpiLoading = false;
      },
      error: () => {
        this.kpiLoading = false;
      }
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.projectOptions = [
          { value: 'ALL', label: 'All Target Projects' },
          ...list.map((p: any) => ({
            value: p.id,
            label: p.project_name || p.name || `Project #${p.id}`
          }))
        ];
      }
    });
  }

  loadAllocations(): void {
    this.loading = true;
    const offset = (this.page - 1) * this.limit;
    this.cwipService.getAllocations({
      search: this.searchQuery,
      allocation_method: this.selectedMethod,
      cost_category: this.selectedCostCategory,
      project_id: this.selectedProjectId || undefined,
      limit: this.limit,
      offset: offset
    }).subscribe({
      next: (res) => {
        this.allocations = res.items || [];
        this.total = res.total;
        this.totalPages = res.total_pages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.page = 1;
    this.loadAllocations();
  }

  onProjectChange(val: any): void {
    this.selectedProjectId = val === 'ALL' || !val ? null : Number(val);
    this.page = 1;
    this.loadAllocations();
  }

  onMethodChange(val: any): void {
    this.selectedMethod = val || 'ALL';
    this.page = 1;
    this.loadAllocations();
  }

  onCostCategoryChange(val: any): void {
    this.selectedCostCategory = val || 'ALL';
    this.page = 1;
    this.loadAllocations();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
      this.loadAllocations();
    }
  }

  onLimitChange(newLimit: number): void {
    this.limit = Number(newLimit);
    this.page = 1;
    this.loadAllocations();
  }

  viewOriginAudit(alloc: CWIPAllocation): void {
    this.selectedAllocation = alloc;
    this.showAuditModal = true;
  }

  openTransferCOGSModal(alloc: CWIPAllocation): void {
    this.selectedAllocation = alloc;
    this.cogsForm = {
      transfer_date: new Date().toISOString().substring(0, 10),
      project_id: alloc.target_project_id,
      unit_number: 'Flat 6A',
      customer_name: 'Buyer Name',
      sale_agreement_ref: `AGR-${alloc.target_project_id}-99`,
      unit_floor_area_sft: 1650,
      cwip_cost_per_sft: 2500,
      transferred_cogs_amount: Math.min(alloc.allocated_amount, 4125000),
      accounting_policy_basis: `Unit sold under developer accounting policy; transferred accumulated development cost of ${alloc.work_package_name} to Cost of Property Sold (5100).`,
      approved_by: 'CFO / Audit Committee'
    };
    this.showCOGSModal = true;
  }

  submitCOGSTransfer(): void {
    this.submittingCOGS = true;
    this.cwipService.transferToCOGS(this.cogsForm).subscribe({
      next: (res) => {
        this.submittingCOGS = false;
        this.showCOGSModal = false;
        this.showNotification(`৳${res.transferred_cogs_amount.toLocaleString()} transferred to COPS (5100) with GL voucher!`, 'success');
        this.loadAllocations();
        this.loadKPIs();
      },
      error: (err) => {
        this.submittingCOGS = false;
        this.showNotification(err?.error?.detail || 'Failed to transfer to COGS', 'error');
      }
    });
  }

  showNotification(msg: string, type: 'success' | 'error'): void {
    this.feedbackMessage = msg;
    this.feedbackType = type;
    setTimeout(() => {
      this.feedbackMessage = null;
    }, 4500);
  }

  getMethodBadgeVariant(method: string): 'success' | 'warning' | 'info' | 'purple' | 'neutral' {
    switch (method) {
      case 'DIRECT': return 'success';
      case 'AREA_BASED': return 'info';
      case 'USAGE_BASED': return 'purple';
      case 'QUANTITY_BASED': return 'warning';
      case 'PERCENTAGE': return 'neutral';
      default: return 'neutral';
    }
  }

  formatMethod(method: string): string {
    switch (method) {
      case 'DIRECT': return 'Direct Allocation';
      case 'AREA_BASED': return 'Floor Area Ratio';
      case 'USAGE_BASED': return 'Equipment Log Usage';
      case 'QUANTITY_BASED': return 'Measured Quantity';
      case 'PERCENTAGE': return 'Percentage Ratio';
      default: return method;
    }
  }

  formatCategory(cat: string): string {
    switch (cat) {
      case 'DIRECT_MATERIAL': return 'Direct Material';
      case 'DIRECT_LABOUR': return 'Site Labour';
      case 'CONTRACTOR_CERTIFIED_WORK': return 'Contractor RA Bill';
      case 'ENGINEERING_CONSULTANCY': return 'Design & Consultancy';
      case 'SITE_OVERHEAD': return 'Site Overhead';
      case 'EQUIPMENT_USAGE_DEPRECIATION': return 'Heavy Equipment';
      case 'SHARED_PROJECT_COST': return 'Shared Common Cost';
      default: return cat;
    }
  }
}
