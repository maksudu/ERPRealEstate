import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  selectedApprovalFilter: string = '';
  currentCostingPage = 1;
  costingPageSize = 10;
  isLoadingCostings = false;

  // Filter & Pagination for Valuations
  valSearch = '';
  selectedValParcelFilter: string = '';
  selectedValSourceFilter: string = '';
  selectedValStatusFilter: string = '';
  currentValPage = 1;
  valPageSize = 10;
  isLoadingValuations = false;

  // Modals
  isCostingModalOpen = false;
  isExpenseLedgerModalOpen = false;
  isExpenseItemModalOpen = false;
  isCostingApproveModalOpen = false;
  isValuationModalOpen = false;
  isValuationApproveModalOpen = false;
  isSubmitting = false;

  // Selected Costing for Expense Items Ledger
  activeCosting: AcquisitionCosting | null = null;

  // Forms Data
  costingFormData: any = {
    parcel_id: '',
    valuation_id: null,
    costing_date: new Date().toISOString().substring(0, 10),
    costing_status: 'ESTIMATED',
    agreed_purchase_price_bdt: 0,
    budget_allocated_bdt: 0,
    remarks: ''
  };
  editingCostingId: number | null = null;

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

  valuationFormData: any = {
    parcel_id: '',
    valuation_date: new Date().toISOString().substring(0, 10),
    valuation_source: 'INTERNAL_ESTIMATE',
    assessor_name: '',
    assessor_company: '',
    assessor_license_no: '',
    asking_price_total_bdt: 0,
    market_valuation_total_bdt: 0,
    govt_mouza_rate_per_decimal_bdt: 0,
    govt_mouza_valuation_total_bdt: 0,
    recommended_offer_price_bdt: 0,
    notes_and_methodology: '',
    approval_status: 'DRAFT'
  };
  editingValuationId: number | null = null;

  valuationApprovalFormData: ValuationApprovalRequest = {
    approved_by: '',
    approval_status: 'APPROVED',
    approval_remarks: ''
  };
  approvingValuationId: number | null = null;

  constructor(
    private landService: LandService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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
      skip,
      limit: this.costingPageSize
    };
    if (this.costingSearch) params.search = this.costingSearch;
    if (this.selectedParcelFilter) params.parcel_id = this.selectedParcelFilter;
    if (this.selectedCostingStatusFilter) params.costing_status = this.selectedCostingStatusFilter;
    if (this.selectedApprovalFilter) params.approval_stage = this.selectedApprovalFilter;

    this.landService.getAcquisitionCostings(params).subscribe({
      next: (res) => {
        this.costings = Array.isArray(res) ? res : [];
        this.isLoadingCostings = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading costings', err);
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
      skip,
      limit: this.valPageSize
    };
    if (this.valSearch) params.search = this.valSearch;
    if (this.selectedValParcelFilter) params.parcel_id = this.selectedValParcelFilter;
    if (this.selectedValSourceFilter) params.valuation_source = this.selectedValSourceFilter;
    if (this.selectedValStatusFilter) params.approval_status = this.selectedValStatusFilter;

    this.landService.getLandValuations(params).subscribe({
      next: (res) => {
        this.valuations = Array.isArray(res) ? res : [];
        this.isLoadingValuations = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading valuations', err);
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

  // Costing Modal Handlers
  openCreateCostingModal(): void {
    this.editingCostingId = null;
    this.costingFormData = {
      parcel_id: this.parcels.length > 0 ? this.parcels[0].id : '',
      valuation_id: null,
      costing_date: new Date().toISOString().substring(0, 10),
      costing_status: 'ESTIMATED',
      agreed_purchase_price_bdt: 0,
      budget_allocated_bdt: 0,
      remarks: ''
    };
    this.isCostingModalOpen = true;
  }

  openEditCostingModal(costing: AcquisitionCosting): void {
    this.editingCostingId = costing.id;
    this.costingFormData = {
      parcel_id: costing.parcel_id,
      valuation_id: costing.valuation_id,
      costing_date: costing.costing_date,
      costing_status: costing.costing_status,
      agreed_purchase_price_bdt: costing.agreed_purchase_price_bdt,
      budget_allocated_bdt: costing.budget_allocated_bdt,
      remarks: costing.remarks || ''
    };
    this.isCostingModalOpen = true;
  }

  closeCostingModal(): void {
    this.isCostingModalOpen = false;
  }

  saveCosting(): void {
    if (!this.costingFormData.parcel_id) {
      alert('Please select a target land parcel.');
      return;
    }
    this.isSubmitting = true;
    if (this.editingCostingId) {
      this.landService.updateAcquisitionCosting(this.editingCostingId, this.costingFormData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isCostingModalOpen = false;
          this.loadCostings();
        },
        error: (err) => {
          alert('Failed to update costing: ' + (err.error?.detail || err.message));
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.landService.createAcquisitionCosting(this.costingFormData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isCostingModalOpen = false;
          this.loadCostings();
        },
        error: (err) => {
          alert('Failed to create costing: ' + (err.error?.detail || err.message));
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteCosting(id: number): void {
    if (!confirm('Are you sure you want to delete this acquisition costing and all its expenses?')) return;
    this.landService.deleteAcquisitionCosting(id).subscribe({
      next: () => {
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

  // --- Valuation Modal Handlers ---
  openCreateValuationModal(): void {
    this.editingValuationId = null;
    this.valuationFormData = {
      parcel_id: this.parcels.length > 0 ? this.parcels[0].id : '',
      valuation_date: new Date().toISOString().substring(0, 10),
      valuation_source: 'INTERNAL_ESTIMATE',
      assessor_name: '',
      assessor_company: '',
      assessor_license_no: '',
      asking_price_total_bdt: 0,
      market_valuation_total_bdt: 0,
      govt_mouza_rate_per_decimal_bdt: 0,
      govt_mouza_valuation_total_bdt: 0,
      recommended_offer_price_bdt: 0,
      notes_and_methodology: '',
      approval_status: 'DRAFT'
    };
    this.isValuationModalOpen = true;
  }

  openEditValuationModal(val: LandValuation): void {
    this.editingValuationId = val.id;
    this.valuationFormData = {
      parcel_id: val.parcel_id,
      valuation_date: val.valuation_date,
      valuation_source: val.valuation_source,
      assessor_name: val.assessor_name,
      assessor_company: val.assessor_company || '',
      assessor_license_no: val.assessor_license_no || '',
      asking_price_total_bdt: val.asking_price_total_bdt,
      market_valuation_total_bdt: val.market_valuation_total_bdt,
      govt_mouza_rate_per_decimal_bdt: val.govt_mouza_rate_per_decimal_bdt,
      govt_mouza_valuation_total_bdt: val.govt_mouza_valuation_total_bdt,
      recommended_offer_price_bdt: val.recommended_offer_price_bdt,
      notes_and_methodology: val.notes_and_methodology || '',
      approval_status: val.approval_status
    };
    this.isValuationModalOpen = true;
  }

  closeValuationModal(): void {
    this.isValuationModalOpen = false;
  }

  onGovtMouzaRateChange(): void {
    const selectedParcel = this.parcels.find(p => p.id === Number(this.valuationFormData.parcel_id));
    if (selectedParcel && this.valuationFormData.govt_mouza_rate_per_decimal_bdt) {
      this.valuationFormData.govt_mouza_valuation_total_bdt = 
        Number(this.valuationFormData.govt_mouza_rate_per_decimal_bdt) * Number(selectedParcel.total_area_decimal || 0);
    }
  }

  saveValuation(): void {
    if (!this.valuationFormData.parcel_id || !this.valuationFormData.assessor_name) {
      alert('Please fill in target parcel and assessor name.');
      return;
    }
    this.isSubmitting = true;
    if (this.editingValuationId) {
      this.landService.updateLandValuation(this.editingValuationId, this.valuationFormData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isValuationModalOpen = false;
          this.loadValuations();
        },
        error: (err) => {
          alert('Failed to update valuation: ' + (err.error?.detail || err.message));
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.landService.createLandValuation(this.valuationFormData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isValuationModalOpen = false;
          this.loadValuations();
        },
        error: (err) => {
          alert('Failed to create valuation: ' + (err.error?.detail || err.message));
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteValuation(id: number): void {
    if (!confirm('Are you sure you want to delete this land valuation report?')) return;
    this.landService.deleteLandValuation(id).subscribe({
      next: () => {
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
