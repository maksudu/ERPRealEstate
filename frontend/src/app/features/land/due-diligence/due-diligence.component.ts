import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import {
  LegalDueDiligence,
  DueDiligenceItem,
  DueDiligenceExceptionApprovalRequest,
  LandParcel
} from '../../../core/models/land.model';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input.component';
import { CustomTextareaComponent } from '../../../shared/components/custom-textarea/custom-textarea.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { StatusBadgeComponent, StatusVariant } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-due-diligence',
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
  templateUrl: './due-diligence.component.html',
  styleUrls: []
})
export class DueDiligenceComponent implements OnInit {
  audits: LegalDueDiligence[] = [];
  parcels: LandParcel[] = [];
  parcelOptions: { value: any; label: string; subLabel?: string }[] = [];

  // Filter & Pagination
  searchTerm = '';
  selectedParcelFilter: string = '';
  selectedRiskFilter: string = '';
  selectedClearanceFilter: string = '';
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  isLoading = false;

  // Selected audit for checklist review
  activeAudit: LegalDueDiligence | null = null;
  auditItems: DueDiligenceItem[] = [];
  isLoadingItems = false;

  // Modals
  isAuditModalOpen = false;
  isChecklistModalOpen = false;
  isItemEditModalOpen = false;
  isExceptionModalOpen = false;
  isSubmitting = false;

  // Create / Edit Audit Form
  auditFormData: any = {
    parcel_id: '',
    lead_legal_counsel: '',
    law_firm_name: '',
    title_search_period_years: 30,
    sub_registry_office_searched: '',
    encumbrance_certificate_no: '',
    overall_risk_level: 'MEDIUM',
    clearance_status: 'UNDER_REVIEW',
    summary_legal_opinion: ''
  };
  editingAuditId: number | null = null;

  // Edit Checklist Item Form
  editingItem: DueDiligenceItem | null = null;
  itemFormData: any = {
    risk_level: 'LOW',
    decision: 'PASSED',
    responsible_officer: '',
    evidence_documents: '',
    remarks: '',
    is_blocking: false
  };

  // Exception Override Form
  exceptionAudit: LegalDueDiligence | null = null;
  exceptionFormData: DueDiligenceExceptionApprovalRequest = {
    approved_by_officer: '',
    exception_justification: '',
    board_resolution_ref: ''
  };

  constructor(
    private landService: LandService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadParcels();
    this.loadAudits();
  }

  loadParcels(): void {
    this.landService.getParcels().subscribe({
      next: (res) => {
        this.parcels = Array.isArray(res) ? res : (res as any).items || [];
        this.parcelOptions = this.parcels.map(p => ({
          value: p.id,
          label: `${p.parcel_id || 'Parcel #' + p.id} - ${p.project_name || p.mouza_name || 'Land'} (${p.total_area_decimal || 0} Dec)`
        }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading parcels', err)
    });
  }

  loadAudits(): void {
    this.isLoading = true;
    const skip = (this.currentPage - 1) * this.pageSize;
    const params: any = {
      skip,
      limit: this.pageSize
    };
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.selectedParcelFilter) params.parcel_id = this.selectedParcelFilter;
    if (this.selectedRiskFilter) params.risk_level = this.selectedRiskFilter;
    if (this.selectedClearanceFilter) params.clearance_status = this.selectedClearanceFilter;

    this.landService.getLegalDueDiligenceList(params).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.audits = res;
          this.totalItems = res.length;
        } else if (res && res.items) {
          this.audits = res.items;
          this.totalItems = res.total || res.items.length;
        } else {
          this.audits = [];
          this.totalItems = 0;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading legal due diligence audits', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadAudits();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedParcelFilter = '';
    this.selectedRiskFilter = '';
    this.selectedClearanceFilter = '';
    this.currentPage = 1;
    this.loadAudits();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize) || 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadAudits();
    }
  }

  // --- Audit Modal (Create / Edit) ---
  openCreateAuditModal(): void {
    this.editingAuditId = null;
    this.auditFormData = {
      parcel_id: this.parcels.length > 0 ? this.parcels[0].id : '',
      lead_legal_counsel: '',
      law_firm_name: '',
      title_search_period_years: 30,
      sub_registry_office_searched: '',
      encumbrance_certificate_no: '',
      overall_risk_level: 'MEDIUM',
      clearance_status: 'UNDER_REVIEW',
      summary_legal_opinion: ''
    };
    this.isAuditModalOpen = true;
  }

  openEditAuditModal(audit: LegalDueDiligence): void {
    this.editingAuditId = audit.id;
    this.auditFormData = {
      parcel_id: audit.parcel_id,
      lead_legal_counsel: audit.lead_legal_counsel || '',
      law_firm_name: audit.law_firm_name || '',
      title_search_period_years: audit.title_search_period_years || 30,
      sub_registry_office_searched: audit.sub_registry_office_searched || '',
      encumbrance_certificate_no: audit.encumbrance_certificate_no || '',
      overall_risk_level: audit.overall_risk_level || 'MEDIUM',
      clearance_status: audit.clearance_status || 'UNDER_REVIEW',
      summary_legal_opinion: audit.summary_legal_opinion || ''
    };
    this.isAuditModalOpen = true;
  }

  closeAuditModal(): void {
    this.isAuditModalOpen = false;
  }

  saveAudit(): void {
    if (!this.auditFormData.parcel_id) {
      alert('Please select a land parcel for due diligence.');
      return;
    }
    this.isSubmitting = true;

    if (this.editingAuditId) {
      this.landService.updateLegalDueDiligence(this.editingAuditId, this.auditFormData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isAuditModalOpen = false;
          this.loadAudits();
        },
        error: (err) => {
          alert('Failed to update due diligence: ' + (err.error?.detail || err.message));
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.landService.createLegalDueDiligence(this.auditFormData).subscribe({
        next: (created) => {
          this.isSubmitting = false;
          this.isAuditModalOpen = false;
          this.loadAudits();
          // Open checklist automatically for the freshly initialized audit
          this.openChecklistModal(created);
        },
        error: (err) => {
          alert('Failed to initialize due diligence: ' + (err.error?.detail || err.message));
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  // --- Checklist Review Modal ---
  openChecklistModal(audit: LegalDueDiligence): void {
    this.activeAudit = audit;
    this.isChecklistModalOpen = true;
    this.loadAuditDetails(audit.id);
  }

  closeChecklistModal(): void {
    this.isChecklistModalOpen = false;
    this.activeAudit = null;
    this.auditItems = [];
    this.loadAudits();
  }

  loadAuditDetails(auditId: number): void {
    this.isLoadingItems = true;
    this.landService.getLegalDueDiligenceById(auditId).subscribe({
      next: (fullAudit) => {
        this.activeAudit = fullAudit;
        this.auditItems = fullAudit.items || [];
        this.isLoadingItems = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching due diligence items', err);
        this.isLoadingItems = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- Item Edit Modal ---
  openEditItemModal(item: DueDiligenceItem): void {
    this.editingItem = item;
    this.itemFormData = {
      risk_level: item.risk_level || 'LOW',
      decision: item.decision || 'PASSED',
      responsible_officer: item.responsible_officer || '',
      evidence_documents: item.evidence_documents || '',
      remarks: item.remarks || '',
      is_blocking: item.is_blocking || false
    };
    this.isItemEditModalOpen = true;
  }

  closeItemEditModal(): void {
    this.isItemEditModalOpen = false;
    this.editingItem = null;
  }

  saveItem(): void {
    if (!this.activeAudit || !this.editingItem) return;
    this.isSubmitting = true;

    // Auto flag is_blocking if risk is HIGH or CRITICAL and decision is not PASSED
    if (
      (this.itemFormData.risk_level === 'HIGH' || this.itemFormData.risk_level === 'CRITICAL') &&
      this.itemFormData.decision !== 'PASSED'
    ) {
      this.itemFormData.is_blocking = true;
    }

    this.landService.updateDueDiligenceItem(this.activeAudit.id, this.editingItem.id, this.itemFormData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isItemEditModalOpen = false;
        this.editingItem = null;
        if (this.activeAudit) {
          this.loadAuditDetails(this.activeAudit.id);
        }
      },
      error: (err) => {
        alert('Failed to update checklist item: ' + (err.error?.detail || err.message));
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- Exception Override Process ---
  openExceptionModal(audit: LegalDueDiligence): void {
    this.exceptionAudit = audit;
    this.exceptionFormData = {
      approved_by_officer: '',
      exception_justification: '',
      board_resolution_ref: ''
    };
    this.isExceptionModalOpen = true;
  }

  closeExceptionModal(): void {
    this.isExceptionModalOpen = false;
    this.exceptionAudit = null;
  }

  submitExceptionApproval(): void {
    if (!this.exceptionAudit) return;
    if (!this.exceptionFormData.approved_by_officer || !this.exceptionFormData.exception_justification) {
      alert('Officer name and documented justification are mandatory for exception approval.');
      return;
    }

    this.isSubmitting = true;
    const payload: DueDiligenceExceptionApprovalRequest = {
      exception_approved_by: this.exceptionFormData.approved_by_officer,
      exception_reason: `${this.exceptionFormData.exception_justification} ${this.exceptionFormData.board_resolution_ref ? '[Resolution: ' + this.exceptionFormData.board_resolution_ref + ']' : ''}`.trim(),
      override_blocked_status: true,
      approved_by_officer: this.exceptionFormData.approved_by_officer,
      exception_justification: this.exceptionFormData.exception_justification,
      board_resolution_ref: this.exceptionFormData.board_resolution_ref
    };

    this.landService.approveDueDiligenceException(this.exceptionAudit.id, payload).subscribe({
      next: () => {
        alert('Exception approval successfully recorded! Acquisition block lifted.');
        this.isSubmitting = false;
        this.isExceptionModalOpen = false;
        this.loadAudits();
        if (this.activeAudit && this.activeAudit.id === this.exceptionAudit?.id) {
          this.loadAuditDetails(this.activeAudit.id);
        }
      },
      error: (err) => {
        alert('Failed to submit exception approval: ' + (err.error?.detail || err.message));
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Helpers
  getRiskBadgeVariant(risk: string): StatusVariant {
    switch (risk) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'neutral';
    }
  }

  getClearanceBadgeVariant(status: string): StatusVariant {
    switch (status) {
      case 'CLEARED': return 'success';
      case 'CONDITIONAL_CLEARANCE': return 'warning';
      case 'BLOCKED': return 'danger';
      case 'UNDER_REVIEW': return 'info';
      default: return 'neutral';
    }
  }

  getDecisionBadgeVariant(dec: string): StatusVariant {
    switch (dec) {
      case 'PASSED': return 'success';
      case 'CONDITIONAL': return 'warning';
      case 'FAILED_BLOCKING': return 'danger';
      case 'IN_PROGRESS': return 'info';
      default: return 'neutral';
    }
  }

  getParcelName(parcelId: number): string {
    const p = this.parcels.find(x => x.id === parcelId);
    return p ? `${p.parcel_id || 'Parcel #' + p.id} - ${p.project_name || p.mouza_name || ''}` : `Parcel #${parcelId}`;
  }

  getCompletedChecksCount(audit: LegalDueDiligence): number {
    if (!audit.items || audit.items.length === 0) return 0;
    return audit.items.filter(i => i.decision === 'PASSED' || i.decision === 'CONDITIONAL').length;
  }

  getClearanceCount(status: string): number {
    return this.audits.filter(a => a.clearance_status === status).length;
  }
}
