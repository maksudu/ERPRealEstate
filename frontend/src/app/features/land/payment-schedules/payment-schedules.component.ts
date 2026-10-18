import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import {
  LandPaymentSchedule,
  LandPaymentTransaction,
  PaymentApprovalRequest,
  PaymentDisbursementRequest,
  PaymentReversalRequest,
  PaymentScheduleAutoGenerateRequest,
  PaymentReconciliationSummary,
  LandParcel,
  Landowner
} from '../../../core/models/land.model';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input.component';
import { CustomTextareaComponent } from '../../../shared/components/custom-textarea/custom-textarea.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { StatusBadgeComponent, StatusVariant } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-payment-schedules',
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
  templateUrl: './payment-schedules.component.html',
  styleUrls: []
})
export class PaymentSchedulesComponent implements OnInit {
  private landService = inject(LandService);
  private cdr = inject(ChangeDetectorRef);

  activeTab: 'schedules' | 'disbursements' | 'approvals' | 'overdue' = 'schedules';

  // Data
  schedules: LandPaymentSchedule[] = [];
  parcels: LandParcel[] = [];
  landowners: Landowner[] = [];
  parcelOptions: { value: any; label: string; subLabel?: string }[] = [];
  landownerOptions: { value: any; label: string; subLabel?: string }[] = [];

  // Summary Metrics
  reconciliation: PaymentReconciliationSummary | null = null;
  isLoadingReconciliation = false;

  // Selected schedule for detail / transactions
  activeSchedule: LandPaymentSchedule | null = null;
  reversingTransaction: LandPaymentTransaction | null = null;

  // Filters & Pagination
  searchTerm = '';
  selectedParcelFilter: string = '';
  selectedTypeFilter: string = '';
  selectedStatusFilter: string = '';
  onlyOverdueFilter = false;
  currentPage = 1;
  pageSize = 10;
  isLoading = false;

  // Modals
  isCreateEditModalOpen = false;
  isAutoGenerateModalOpen = false;
  isApproveModalOpen = false;
  isDisburseModalOpen = false;
  isReversalModalOpen = false;
  isSubmitting = false;

  // Form State
  editingScheduleId: number | null = null;
  scheduleFormData: any = {
    parcel_id: '',
    landowner_id: null,
    negotiation_id: null,
    installment_number: 1,
    installment_title: '',
    payment_type: 'ADVANCE_PAYMENT',
    due_date: new Date().toISOString().substring(0, 10),
    due_amount_bdt: 0,
    payment_method: 'BANK_TRANSFER',
    beneficiary_name: '',
    beneficiary_bank_name: '',
    beneficiary_bank_branch: '',
    beneficiary_account_no: '',
    beneficiary_routing_no: '',
    transaction_reference: '',
    accounting_voucher_no: '',
    gl_account_code: '1120-LAND-ACQ-CAPEX',
    notes: ''
  };

  autoGenerateFormData: PaymentScheduleAutoGenerateRequest = {
    parcel_id: 0,
    landowner_id: null,
    total_agreed_amount_bdt: 0,
    earnest_money_percent: 10,
    advance_bayna_percent: 30,
    interim_milestone_percent: 30,
    final_settlement_percent: 30,
    start_date: new Date().toISOString().substring(0, 10),
    days_interval_between_stages: 30
  };

  approvalFormData: PaymentApprovalRequest = {
    approved_by: 'Head of Treasury & Commercial Finance',
    approval_status: 'APPROVED_FOR_PAYMENT',
    approved_variation_amount: 0,
    approval_notes: 'Verified against title deeds and milestone compliance.'
  };

  disburseFormData: PaymentDisbursementRequest = {
    transaction_date: new Date().toISOString().substring(0, 10),
    amount_bdt: 0,
    payment_method: 'BANK_TRANSFER',
    bank_name: '',
    account_no: '',
    instrument_no: '',
    accounting_voucher_no: '',
    posted_by: 'Senior Treasury Officer',
    notes: ''
  };

  reversalFormData: PaymentReversalRequest = {
    reversal_reason: '',
    posted_by: 'Internal Audit & Treasury Controller',
    notes: ''
  };

  ngOnInit(): void {
    this.loadParcels();
    this.loadLandowners();
    this.loadSchedules();
    this.loadReconciliation();
  }

  // --- Data Loading ---
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

  loadLandowners(): void {
    this.landService.getLandowners().subscribe({
      next: (res) => {
        this.landowners = Array.isArray(res) ? res : [];
        this.landownerOptions = this.landowners.map(l => ({
          value: l.id,
          label: `${l.landowner_code} - ${l.full_name_en} (${l.phone_number || 'No Phone'})`
        }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading landowners', err)
    });
  }

  loadSchedules(): void {
    this.isLoading = true;
    const skip = (this.currentPage - 1) * this.pageSize;
    const params: any = {
      skip,
      limit: this.pageSize
    };
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.selectedParcelFilter) params.parcel_id = this.selectedParcelFilter;
    if (this.selectedTypeFilter) params.payment_type = this.selectedTypeFilter;
    if (this.selectedStatusFilter) params.approval_status = this.selectedStatusFilter;
    if (this.onlyOverdueFilter) params.is_overdue = true;

    this.landService.getPaymentSchedules(params).subscribe({
      next: (res) => {
        this.schedules = Array.isArray(res) ? res : [];
        if (this.schedules.length > 0 && !this.activeSchedule) {
          this.activeSchedule = this.schedules[0];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading payment schedules', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadReconciliation(): void {
    this.isLoadingReconciliation = true;
    const parcelId = this.selectedParcelFilter ? Number(this.selectedParcelFilter) : undefined;
    this.landService.getPaymentReconciliationSummary(parcelId).subscribe({
      next: (res) => {
        this.reconciliation = res;
        this.isLoadingReconciliation = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading reconciliation', err);
        this.isLoadingReconciliation = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- Tab Selection ---
  selectTab(tab: 'schedules' | 'disbursements' | 'approvals' | 'overdue'): void {
    this.activeTab = tab;
    if (tab === 'approvals') {
      this.selectedStatusFilter = 'PENDING_APPROVAL';
      this.applyFilters();
    } else if (tab === 'overdue') {
      this.onlyOverdueFilter = true;
      this.applyFilters();
    } else if (tab === 'schedules') {
      this.selectedStatusFilter = '';
      this.onlyOverdueFilter = false;
      this.applyFilters();
    }
  }

  // --- Filtering & Pagination ---
  applyFilters(): void {
    this.currentPage = 1;
    this.loadSchedules();
    this.loadReconciliation();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedParcelFilter = '';
    this.selectedTypeFilter = '';
    this.selectedStatusFilter = '';
    this.onlyOverdueFilter = false;
    this.currentPage = 1;
    this.loadSchedules();
    this.loadReconciliation();
  }

  nextPage(): void {
    this.currentPage++;
    this.loadSchedules();
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadSchedules();
    }
  }

  selectSchedule(sched: LandPaymentSchedule): void {
    this.activeSchedule = sched;
  }

  // --- Modal Operations ---
  openCreateModal(): void {
    this.editingScheduleId = null;
    const defaultParcelId = this.parcels.length > 0 ? this.parcels[0].id : '';
    const defaultOwnerId = this.landowners.length > 0 ? this.landowners[0].id : null;
    const owner = this.landowners.find(l => l.id === defaultOwnerId);

    this.scheduleFormData = {
      parcel_id: defaultParcelId,
      landowner_id: defaultOwnerId,
      negotiation_id: null,
      installment_number: (this.schedules.length + 1),
      installment_title: '',
      payment_type: 'ADVANCE_PAYMENT',
      due_date: new Date().toISOString().substring(0, 10),
      due_amount_bdt: 0,
      payment_method: 'BANK_TRANSFER',
      beneficiary_name: owner?.full_name_en || '',
      beneficiary_bank_name: owner?.bank_name || '',
      beneficiary_bank_branch: owner?.bank_branch || '',
      beneficiary_account_no: owner?.bank_account_no || '',
      beneficiary_routing_no: owner?.bank_routing_no || '',
      transaction_reference: '',
      accounting_voucher_no: '',
      gl_account_code: '1120-LAND-ACQ-CAPEX',
      notes: ''
    };
    this.isCreateEditModalOpen = true;
  }

  openEditModal(sched: LandPaymentSchedule): void {
    this.editingScheduleId = sched.id;
    this.scheduleFormData = {
      parcel_id: sched.parcel_id,
      landowner_id: sched.landowner_id,
      negotiation_id: sched.negotiation_id,
      installment_number: sched.installment_number,
      installment_title: sched.installment_title,
      payment_type: sched.payment_type,
      due_date: sched.due_date,
      due_amount_bdt: sched.due_amount_bdt,
      payment_method: sched.payment_method,
      beneficiary_name: sched.beneficiary_name || '',
      beneficiary_bank_name: sched.beneficiary_bank_name || '',
      beneficiary_bank_branch: sched.beneficiary_bank_branch || '',
      beneficiary_account_no: sched.beneficiary_account_no || '',
      beneficiary_routing_no: sched.beneficiary_routing_no || '',
      transaction_reference: sched.transaction_reference || '',
      accounting_voucher_no: sched.accounting_voucher_no || '',
      gl_account_code: sched.gl_account_code || '1120-LAND-ACQ-CAPEX',
      notes: sched.notes || ''
    };
    this.isCreateEditModalOpen = true;
  }

  saveSchedule(): void {
    if (!this.scheduleFormData.parcel_id || !this.scheduleFormData.installment_title || !this.scheduleFormData.due_amount_bdt) {
      alert('Please fill in Parcel, Installment Title, and Due Amount.');
      return;
    }

    this.isSubmitting = true;
    if (this.editingScheduleId) {
      this.landService.updatePaymentSchedule(this.editingScheduleId, this.scheduleFormData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isCreateEditModalOpen = false;
          this.loadSchedules();
          this.loadReconciliation();
        },
        error: (err) => {
          console.error('Error updating schedule', err);
          alert('Failed to update schedule');
          this.isSubmitting = false;
        }
      });
    } else {
      this.landService.createPaymentSchedule(this.scheduleFormData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isCreateEditModalOpen = false;
          this.loadSchedules();
          this.loadReconciliation();
        },
        error: (err) => {
          console.error('Error creating schedule', err);
          alert('Failed to create payment schedule');
          this.isSubmitting = false;
        }
      });
    }
  }

  deleteSchedule(id: number): void {
    if (confirm('Are you sure you want to delete this payment schedule?')) {
      this.landService.deletePaymentSchedule(id).subscribe({
        next: () => {
          if (this.activeSchedule?.id === id) {
            this.activeSchedule = null;
          }
          this.loadSchedules();
          this.loadReconciliation();
        },
        error: (err) => {
          console.error('Error deleting schedule', err);
          alert(err.error?.detail || 'Failed to delete schedule');
        }
      });
    }
  }

  // --- Auto-Generate Schedule Modal ---
  openAutoGenerateModal(): void {
    const defaultParcelId = this.parcels.length > 0 ? this.parcels[0].id : 0;
    const defaultOwnerId = this.landowners.length > 0 ? this.landowners[0].id : null;

    this.autoGenerateFormData = {
      parcel_id: defaultParcelId,
      landowner_id: defaultOwnerId,
      total_agreed_amount_bdt: 50000000.0,
      earnest_money_percent: 10,
      advance_bayna_percent: 30,
      interim_milestone_percent: 30,
      final_settlement_percent: 30,
      start_date: new Date().toISOString().substring(0, 10),
      days_interval_between_stages: 30
    };
    this.isAutoGenerateModalOpen = true;
  }

  submitAutoGenerate(): void {
    if (!this.autoGenerateFormData.parcel_id || !this.autoGenerateFormData.total_agreed_amount_bdt) {
      alert('Please specify Parcel and Total Agreed Purchase Consideration.');
      return;
    }

    const totalPct = (this.autoGenerateFormData.earnest_money_percent || 0) +
                     (this.autoGenerateFormData.advance_bayna_percent || 0) +
                     (this.autoGenerateFormData.interim_milestone_percent || 0) +
                     (this.autoGenerateFormData.final_settlement_percent || 0);

    if (Math.abs(totalPct - 100) > 0.1) {
      alert(`The sum of percentage allocations must equal 100%. Current sum: ${totalPct}%`);
      return;
    }

    this.isSubmitting = true;
    this.landService.autoGeneratePaymentSchedules(this.autoGenerateFormData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isAutoGenerateModalOpen = false;
        this.loadSchedules();
        this.loadReconciliation();
      },
      error: (err) => {
        console.error('Error auto-generating schedules', err);
        alert(err.error?.detail || 'Failed to auto-generate payment schedules');
        this.isSubmitting = false;
      }
    });
  }

  // --- Approval Modal ---
  openApproveModal(sched: LandPaymentSchedule): void {
    this.activeSchedule = sched;
    this.approvalFormData = {
      approved_by: 'Head of Treasury & Land Finance',
      approval_status: 'APPROVED_FOR_PAYMENT',
      approved_variation_amount: 0,
      approval_notes: `Contractual installment verified against milestone completion.`
    };
    this.isApproveModalOpen = true;
  }

  saveApproval(): void {
    if (!this.activeSchedule) return;
    if (!this.approvalFormData.approved_by) {
      alert('Please enter the name of the authorizing officer.');
      return;
    }

    this.isSubmitting = true;
    this.landService.approvePaymentSchedule(this.activeSchedule.id, this.approvalFormData).subscribe({
      next: (res) => {
        this.activeSchedule = res;
        this.isSubmitting = false;
        this.isApproveModalOpen = false;
        this.loadSchedules();
        this.loadReconciliation();
      },
      error: (err) => {
        console.error('Error approving schedule', err);
        alert(err.error?.detail || 'Failed to approve payment schedule');
        this.isSubmitting = false;
      }
    });
  }

  // --- Disbursement Modal ---
  openDisburseModal(sched: LandPaymentSchedule): void {
    this.activeSchedule = sched;
    const remaining = sched.outstanding_amount_bdt > 0 ? sched.outstanding_amount_bdt : sched.due_amount_bdt;
    this.disburseFormData = {
      transaction_date: new Date().toISOString().substring(0, 10),
      amount_bdt: remaining,
      payment_method: sched.payment_method || 'BANK_TRANSFER',
      bank_name: sched.beneficiary_bank_name || '',
      account_no: sched.beneficiary_account_no || '',
      instrument_no: sched.transaction_reference || 'BEFTN-REF-2026',
      accounting_voucher_no: `PV-LAND-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      posted_by: 'Senior Treasury Officer',
      notes: `Settlement for ${sched.installment_title}`
    };
    this.isDisburseModalOpen = true;
  }

  saveDisbursement(): void {
    if (!this.activeSchedule) return;
    if (!this.disburseFormData.amount_bdt || this.disburseFormData.amount_bdt <= 0) {
      alert('Please enter a valid disbursement amount.');
      return;
    }
    if (!this.disburseFormData.accounting_voucher_no) {
      alert('Accounting Voucher Reference is required to link payment with General Ledger.');
      return;
    }

    this.isSubmitting = true;
    this.landService.disbursePayment(this.activeSchedule.id, this.disburseFormData).subscribe({
      next: (res) => {
        this.activeSchedule = res;
        this.isSubmitting = false;
        this.isDisburseModalOpen = false;
        this.loadSchedules();
        this.loadReconciliation();
      },
      error: (err) => {
        console.error('Error disbursing payment', err);
        alert(err.error?.detail || 'Failed to post payment disbursement');
        this.isSubmitting = false;
      }
    });
  }

  // --- Reversal Modal ---
  openReversalModal(txn: LandPaymentTransaction, sched: LandPaymentSchedule): void {
    this.activeSchedule = sched;
    this.reversingTransaction = txn;
    this.reversalFormData = {
      reversal_reason: '',
      posted_by: 'Internal Audit & Treasury Controller',
      notes: ''
    };
    this.isReversalModalOpen = true;
  }

  saveReversal(): void {
    if (!this.activeSchedule || !this.reversingTransaction?.id) return;
    if (!this.reversalFormData.reversal_reason) {
      alert('Please state the audit justification / reason for reversing this payment.');
      return;
    }

    this.isSubmitting = true;
    this.landService.reversePaymentTransaction(this.activeSchedule.id, this.reversingTransaction.id, this.reversalFormData).subscribe({
      next: (res) => {
        this.activeSchedule = res;
        this.isSubmitting = false;
        this.isReversalModalOpen = false;
        this.reversingTransaction = null;
        this.loadSchedules();
        this.loadReconciliation();
      },
      error: (err) => {
        console.error('Error reversing transaction', err);
        alert(err.error?.detail || 'Failed to reverse payment transaction');
        this.isSubmitting = false;
      }
    });
  }

  // --- Helpers ---
  getParcelName(parcelId: number): string {
    const p = this.parcels.find(x => x.id === parcelId);
    return p ? `${p.parcel_id || 'Parcel #' + p.id} - ${p.project_name || p.mouza_name || ''}` : `Parcel #${parcelId}`;
  }

  getLandownerName(landownerId?: number | null): string {
    if (!landownerId) return 'Not Assigned';
    const l = this.landowners.find(x => x.id === landownerId);
    return l ? `${l.full_name_en} (${l.landowner_code})` : `Landowner #${landownerId}`;
  }

  getStatusVariant(status: string): StatusVariant {
    switch (status) {
      case 'POSTED_PAID':
        return 'success';
      case 'APPROVED_FOR_PAYMENT':
        return 'info';
      case 'PENDING_APPROVAL':
        return 'warning';
      case 'REJECTED':
      case 'REVERSED':
        return 'danger';
      case 'DRAFT':
      default:
        return 'neutral';
    }
  }

  getAllDisbursements(): { txn: LandPaymentTransaction; sched: LandPaymentSchedule }[] {
    const list: { txn: LandPaymentTransaction; sched: LandPaymentSchedule }[] = [];
    for (const s of this.schedules) {
      if (s.transactions) {
        for (const t of s.transactions) {
          list.push({ txn: t, sched: s });
        }
      }
    }
    return list.sort((a, b) => new Date(b.txn.transaction_date).getTime() - new Date(a.txn.transaction_date).getTime());
  }

  getOverdueSchedules(): LandPaymentSchedule[] {
    return this.schedules.filter(s => s.is_overdue || (new Date(s.due_date) < new Date() && s.approval_status !== 'POSTED_PAID'));
  }

  getPendingApprovalSchedules(): LandPaymentSchedule[] {
    return this.schedules.filter(s => s.approval_status === 'PENDING_APPROVAL' || s.approval_status === 'DRAFT');
  }
}
