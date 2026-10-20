import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LandService } from '../../../core/services/land.service';
import {
  AcquisitionCosting,
  AcquisitionExpenseItem,
  LandValuation,
  LandParcel,
  ValuationComparisonSummary,
  CostingApprovalRequest,
  ValuationApprovalRequest
} from '../../../core/models/land.model';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input.component';
import { CustomTextareaComponent } from '../../../shared/components/custom-textarea/custom-textarea.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { StatusBadgeComponent, StatusVariant } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-valuation-costing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './valuation-costing.component.html',
  styleUrls: []
})
export class ValuationCostingComponent implements OnInit {
  Math = Math;
  activeTab: 'costings' | 'valuations' | 'comparison' = 'costings';

  // Data lists
  costings: AcquisitionCosting[] = [];
  valuations: LandValuation[] = [];
  parcels: LandParcel[] = [];
  parcelOptions: { value: any; label: string; subLabel?: string }[] = [];

  // Comparison State
  comparisonParcelId: number | null = null;
  comparisonData: ValuationComparisonSummary | null = null;
  isLoadingComparison = false;

  // Filter & Pagination for Costings
  costingSearch = '';
  selectedParcelFilter: string = '';
  selectedCostingStatusFilter: string = '';
  currentCostingPage = 1;
  costingPageSize = 10;
  totalCostings = 0;
  costingPageSizes = [10, 25, 50];
  isLoadingCostings = false;
  costingLoadError = '';

  // Filter & Pagination for Valuations
  valSearch = '';
  selectedValParcelFilter: string = '';
  selectedValSourceFilter: string = '';
  selectedValStatusFilter: string = '';
  currentValPage = 1;
  valPageSize = 10;
  totalValuations = 0;
  valuationPageSizes = [10, 25, 50];
  isLoadingValuations = false;
  valuationLoadError = '';

  // Modals
  isExpenseLedgerModalOpen = false;
  isExpenseItemModalOpen = false;
  isCostingApproveModalOpen = false;
  isValuationApproveModalOpen = false;
  isSubmitting = false;
  successMessage = '';

  // Selected Costing for Expense Items Ledger
  activeCosting: AcquisitionCosting | null = null;

  // Forms Data
  expenseItemFormData: any = {
    expense_category: 'REGISTRATION_FEES',
    item_description: '',
    payee_name: '',
    estimated_amount_bdt: 0,
    actual_amount_bdt: 0,
    payment_status: 'PLANNED',
    accounting_treatment: 'CAPITALIZE_LAND',
    payment_date: '',
    receipt_voucher_ref: '',
    notes: ''
  };
  editingExpenseItemId: number | null = null;

  costingApprovalFormData: CostingApprovalRequest = {
    approved_by: '',
    approval_stage: 'BOARD_APPROVED',
    approval_notes: ''
  };
  approvingCostingId: number | null = null;

  valuationApprovalFormData: ValuationApprovalRequest = {
    approved_by: '',
    approval_status: 'APPROVED',
    approval_remarks: ''
  };
  approvingValuationId: number | null = null;

  constructor(
    private landService: LandService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    const state = this.router.getCurrentNavigation()?.extras.state;
    if (typeof state?.['successMessage'] === 'string') {
      this.successMessage = state['successMessage'];
    }
    if (state?.['activeTab'] === 'costings' || state?.['activeTab'] === 'valuations') {
      this.activeTab = state['activeTab'];
    }
    this.loadParcels();
    this.loadCostings();
    this.loadValuations();
  }

  loadParcels(): void {
    this.landService.getParcels().subscribe({
      next: (res) => {
        this.parcels = Array.isArray(res) ? res : (res as any).items || [];
        this.parcelOptions = this.parcels.map(p => ({
          value: p.id,
          label: `${p.parcel_id || 'Parcel #' + p.id} - ${p.project_name || p.mouza_name || 'Land'} (${p.total_area_decimal || 0} Dec)`
        }));
        if (this.parcels.length > 0 && !this.comparisonParcelId) {
          this.comparisonParcelId = this.parcels[0].id;
          this.loadComparison();
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading parcels', err)
    });
  }

  // --- Costings ---
  loadCostings(): void {
    this.isLoadingCostings = true;
    const skip = (this.currentCostingPage - 1) * this.costingPageSize;
    const params: any = {
      offset: skip,
      limit: this.costingPageSize
    };
    if (this.costingSearch) params.search = this.costingSearch;
    if (this.selectedParcelFilter) params.parcel_id = this.selectedParcelFilter;
    if (this.selectedCostingStatusFilter) params.costing_status = this.selectedCostingStatusFilter;

    this.costingLoadError = '';
    this.landService.getAcquisitionCostings(params).subscribe({
      next: (res) => {
        if (res.items.length === 0 && res.total > 0 && this.currentCostingPage > 1) {
          this.currentCostingPage = Math.max(1, Math.ceil(res.total / this.costingPageSize));
          this.loadCostings();
          return;
        }
        this.costings = res.items;
        this.totalCostings = res.total;
        this.isLoadingCostings = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading costings', err);
        this.costings = [];
        this.totalCostings = 0;
        this.costingLoadError = err.error?.detail || err.message || 'Unable to load acquisition costings.';
        this.isLoadingCostings = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- Valuations ---
  loadValuations(): void {
    this.isLoadingValuations = true;
    const skip = (this.currentValPage - 1) * this.valPageSize;
    const params: any = {
      offset: skip,
      limit: this.valPageSize
    };
    if (this.valSearch) params.search = this.valSearch;
    if (this.selectedValParcelFilter) params.parcel_id = this.selectedValParcelFilter;
    if (this.selectedValSourceFilter) params.valuation_source = this.selectedValSourceFilter;
    if (this.selectedValStatusFilter) params.approval_status = this.selectedValStatusFilter;

    this.valuationLoadError = '';
    this.landService.getLandValuations(params).subscribe({
      next: (res) => {
        if (res.items.length === 0 && res.total > 0 && this.currentValPage > 1) {
          this.currentValPage = Math.max(1, Math.ceil(res.total / this.valPageSize));
          this.loadValuations();
          return;
        }
        this.valuations = res.items;
        this.totalValuations = res.total;
        this.isLoadingValuations = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading valuations', err);
        this.valuations = [];
        this.totalValuations = 0;
        this.valuationLoadError = err.error?.detail || err.message || 'Unable to load land valuations.';
        this.isLoadingValuations = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- Comparison ---
  loadComparison(): void {
    if (!this.comparisonParcelId) return;
    this.isLoadingComparison = true;
    this.landService.getParcelValuationComparison(this.comparisonParcelId).subscribe({
      next: (res) => {
        this.comparisonData = res;
        this.isLoadingComparison = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading comparison', err);
        this.isLoadingComparison = false;
        this.cdr.detectChanges();
      }
    });
  }

  onComparisonParcelChange(): void {
    this.loadComparison();
  }

  openCreateCostingPage(): void {
    this.router.navigateByUrl('/land/valuation-costing/costings/create');
  }

  openEditCostingPage(costing: AcquisitionCosting): void {
    this.router.navigateByUrl(`/land/valuation-costing/costings/${costing.id}/edit`);
  }

  goToCostingPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this.totalCostings / this.costingPageSize));
    if (page >= 1 && page <= totalPages) {
      this.currentCostingPage = page;
      this.loadCostings();
    }
  }

  onCostingPageSizeChange(size: string): void {
    this.costingPageSize = Number(size);
    this.currentCostingPage = 1;
    this.loadCostings();
  }

  onCostingFilterChange(): void {
    this.currentCostingPage = 1;
    this.loadCostings();
  }

  deleteCosting(id: number): void {
    if (!confirm('Are you sure you want to delete this acquisition costing and all its expenses?')) return;
    this.landService.deleteAcquisitionCosting(id).subscribe({
      next: () => {
        this.successMessage = 'Acquisition costing deleted successfully.';
        this.loadCostings();
      },
      error: (err) => alert('Failed to delete: ' + (err.error?.detail || err.message))
    });
  }

  // Costing Approval
  openCostingApproveModal(costing: AcquisitionCosting): void {
    this.approvingCostingId = costing.id;
    this.costingApprovalFormData = {
      approved_by: '',
      approval_stage: 'BOARD_APPROVED',
      approval_notes: ''
    };
    this.isCostingApproveModalOpen = true;
  }

  closeCostingApproveModal(): void {
    this.isCostingApproveModalOpen = false;
    this.approvingCostingId = null;
  }

  submitCostingApproval(): void {
    if (!this.approvingCostingId) return;
    if (!this.costingApprovalFormData.approved_by) {
      alert('Please specify the approving officer / authority.');
      return;
    }
    this.isSubmitting = true;
    this.landService.approveAcquisitionCosting(this.approvingCostingId, this.costingApprovalFormData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isCostingApproveModalOpen = false;
        this.approvingCostingId = null;
        this.loadCostings();
      },
      error: (err) => {
        alert('Failed to approve costing: ' + (err.error?.detail || err.message));
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- Expense Ledger Modal Handlers ---
  openExpenseLedger(costing: AcquisitionCosting): void {
    this.activeCosting = costing;
    this.isExpenseLedgerModalOpen = true;
    this.refreshActiveCosting(costing.id);
  }

  closeExpenseLedger(): void {
    this.isExpenseLedgerModalOpen = false;
    this.activeCosting = null;
    this.loadCostings();
  }

  refreshActiveCosting(costingId: number): void {
    this.landService.getAcquisitionCostingById(costingId).subscribe({
      next: (full) => {
        this.activeCosting = full;
        this.cdr.detectChanges();
      }
    });
  }

  openAddExpenseModal(): void {
    if (!this.activeCosting) return;
    this.editingExpenseItemId = null;
    this.expenseItemFormData = {
      expense_category: 'REGISTRATION_FEES',
      item_description: '',
      payee_name: '',
      estimated_amount_bdt: 0,
      actual_amount_bdt: 0,
      payment_status: 'PLANNED',
      accounting_treatment: 'CAPITALIZE_LAND',
      payment_date: new Date().toISOString().substring(0, 10),
      receipt_voucher_ref: '',
      notes: ''
    };
    this.isExpenseItemModalOpen = true;
  }

  openEditExpenseModal(item: AcquisitionExpenseItem): void {
    this.editingExpenseItemId = item.id;
    this.expenseItemFormData = {
      expense_category: item.expense_category,
      item_description: item.item_description,
      payee_name: item.payee_name || '',
      estimated_amount_bdt: item.estimated_amount_bdt,
      actual_amount_bdt: item.actual_amount_bdt,
      payment_status: item.payment_status,
      accounting_treatment: item.accounting_treatment,
      payment_date: item.payment_date || '',
      receipt_voucher_ref: item.receipt_voucher_ref || '',
      notes: item.notes || ''
    };
    this.isExpenseItemModalOpen = true;
  }

  closeExpenseItemModal(): void {
    this.isExpenseItemModalOpen = false;
    this.editingExpenseItemId = null;
  }

  saveExpenseItem(): void {
    if (!this.activeCosting) return;
    if (!this.expenseItemFormData.item_description) {
      alert('Please enter an item description.');
      return;
    }
    this.isSubmitting = true;

    if (this.editingExpenseItemId) {
      this.landService.updateAcquisitionExpenseItem(this.activeCosting.id, this.editingExpenseItemId, this.expenseItemFormData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isExpenseItemModalOpen = false;
          if (this.activeCosting) this.refreshActiveCosting(this.activeCosting.id);
        },
        error: (err) => {
          alert('Failed to update expense item: ' + (err.error?.detail || err.message));
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.landService.addAcquisitionExpenseItem(this.activeCosting.id, this.expenseItemFormData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isExpenseItemModalOpen = false;
          if (this.activeCosting) this.refreshActiveCosting(this.activeCosting.id);
        },
        error: (err) => {
          alert('Failed to add expense item: ' + (err.error?.detail || err.message));
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteExpenseItem(expenseId: number): void {
    if (!this.activeCosting) return;
    if (!confirm('Are you sure you want to delete this expense entry?')) return;

    this.landService.deleteAcquisitionExpenseItem(this.activeCosting.id, expenseId).subscribe({
      next: () => {
        if (this.activeCosting) this.refreshActiveCosting(this.activeCosting.id);
      },
      error: (err) => alert('Failed to delete expense: ' + (err.error?.detail || err.message))
    });
  }

  openCreateValuationPage(): void {
    this.router.navigateByUrl('/land/valuation-costing/valuations/create');
  }

  openEditValuationPage(valuation: LandValuation): void {
    this.router.navigateByUrl(`/land/valuation-costing/valuations/${valuation.id}/edit`);
  }

  goToValuationPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this.totalValuations / this.valPageSize));
    if (page >= 1 && page <= totalPages) {
      this.currentValPage = page;
      this.loadValuations();
    }
  }

  onValuationPageSizeChange(size: string): void {
    this.valPageSize = Number(size);
    this.currentValPage = 1;
    this.loadValuations();
  }

  onValuationFilterChange(): void {
    this.currentValPage = 1;
    this.loadValuations();
  }

  deleteValuation(id: number): void {
    if (!confirm('Are you sure you want to delete this land valuation report?')) return;
    this.landService.deleteLandValuation(id).subscribe({
      next: () => {
        this.successMessage = 'Land valuation deleted successfully.';
        this.loadValuations();
      },
      error: (err) => alert('Failed to delete valuation: ' + (err.error?.detail || err.message))
    });
  }

  openValuationApproveModal(val: LandValuation): void {
    this.approvingValuationId = val.id;
    this.valuationApprovalFormData = {
      approved_by: '',
      approval_status: 'APPROVED',
      approval_remarks: ''
    };
    this.isValuationApproveModalOpen = true;
  }

  closeValuationApproveModal(): void {
    this.isValuationApproveModalOpen = false;
    this.approvingValuationId = null;
  }

  submitValuationApproval(): void {
    if (!this.approvingValuationId) return;
    if (!this.valuationApprovalFormData.approved_by) {
      alert('Please specify the approving authority.');
      return;
    }
    this.isSubmitting = true;
    this.landService.approveLandValuation(this.approvingValuationId, this.valuationApprovalFormData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isValuationApproveModalOpen = false;
        this.approvingValuationId = null;
        this.loadValuations();
      },
      error: (err) => {
        alert('Failed to approve valuation: ' + (err.error?.detail || err.message));
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Summary Metrics
  getTotalSpent(): number {
    return this.costings.reduce((sum, c) => sum + (c.total_actual_cost_bdt || 0), 0);
  }

  getAverageCostPerSqft(): number {
    const list = this.costings.filter(c => c.cost_per_sqft_bdt > 0);
    if (list.length === 0) return 0;
    return list.reduce((sum, c) => sum + c.cost_per_sqft_bdt, 0) / list.length;
  }

  getTotalCapitalizedLand(): number {
    return this.costings.reduce((sum, c) => sum + (c.capitalized_land_cost_bdt || 0), 0);
  }

  getTotalBudgetVariance(): number {
    return this.costings.reduce((sum, c) => sum + (c.cost_variance_bdt || 0), 0);
  }

  // Helper Badge Formatters
  getStatusVariant(status: string): StatusVariant {
    switch (status) {
      case 'APPROVED':
      case 'BOARD_APPROVED':
      case 'FINALIZED_CLOSED':
      case 'PAID':
        return 'success';
      case 'IN_NEGOTIATION':
      case 'PARTIALLY_SPENT':
      case 'PARTIAL_PAID':
      case 'PENDING_MANAGEMENT_APPROVAL':
      case 'SUBMITTED':
        return 'warning';
      case 'REJECTED':
      case 'CANCELLED':
        return 'danger';
      case 'ESTIMATED':
      case 'PLANNED':
      case 'DRAFT':
        return 'info';
      default:
        return 'neutral';
    }
  }

  getParcelName(parcelId: number): string {
    const p = this.parcels.find(x => x.id === parcelId);
    return p ? `${p.parcel_id || 'Parcel #' + p.id} - ${p.project_name || p.mouza_name || ''}` : `Parcel #${parcelId}`;
  }
}
