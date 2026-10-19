import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService, BrokerFilters, CommissionClaimFilters } from '../../../core/services/crm.service';
import { Broker, CommissionClaim, BrokerStatsSummary } from '../../../core/models/crm.model';

@Component({
  selector: 'app-crm-brokers',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './crm-brokers.component.html'
})
export class CrmBrokersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly Math = Math;

  // Dynamic Lookup Category Codes (Spec 4.10 & Rule 1)
  readonly LOOKUP = {
    brokerType: 'CRM_BROKER_TYPE',
    brokerStatus: 'CRM_BROKER_STATUS',
    commissionType: 'CRM_COMMISSION_TYPE',
    commissionMilestone: 'CRM_COMMISSION_MILESTONE',
    claimStatus: 'CRM_COMMISSION_CLAIM_STATUS'
  };

  // Active Tab: 'brokers' | 'claims' | 'analytics'
  activeTab = signal<'brokers' | 'claims' | 'analytics'>('brokers');

  // Broker Signals
  brokers = signal<Broker[]>([]);
  totalBrokers = signal<number>(0);
  brokerPage = signal<number>(1);
  brokerLimit = signal<number>(15);
  isLoadingBrokers = signal<boolean>(false);

  // Commission Claim Signals
  claims = signal<CommissionClaim[]>([]);
  totalClaims = signal<number>(0);
  claimPage = signal<number>(1);
  claimLimit = signal<number>(15);
  isLoadingClaims = signal<boolean>(false);

  // Stats Summary Signal
  stats = signal<BrokerStatsSummary>({
    total_brokers: 0,
    active_brokers: 0,
    total_leads_referred: 0,
    total_bookings_referred: 0,
    total_sales_value: 0,
    total_commission_earned: 0,
    total_commission_paid: 0,
    pending_commission_payout: 0
  });

  // Filter Forms
  brokerFilterForm: FormGroup = this.fb.group({
    search: [''],
    broker_type: [''],
    status: [''],
    service_area: ['']
  });

  claimFilterForm: FormGroup = this.fb.group({
    search: [''],
    claim_status: [''],
    milestone_achieved: ['']
  });

  // Broker Details Modal
  selectedBroker = signal<Broker | null>(null);
  isBrokerDetailsModalOpen = signal<boolean>(false);
  copiedCode = signal<boolean>(false);
  copiedLink = signal<boolean>(false);

  // Claim Action Modals
  selectedClaim = signal<CommissionClaim | null>(null);
  isApproveModalOpen = signal<boolean>(false);
  isDisburseModalOpen = signal<boolean>(false);
  isActionLoading = signal<boolean>(false);

  approvalForm: FormGroup = this.fb.group({
    decision: ['APPROVE_SALES'],
    rejection_reason: [''],
    notes: ['']
  });

  disburseForm: FormGroup = this.fb.group({
    disbursement_reference: [''],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadStats();
    this.loadBrokers();
    this.loadClaims();

    // Debounced filter listeners
    this.brokerFilterForm.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.brokerPage.set(1);
        this.loadBrokers();
      });

    this.claimFilterForm.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.claimPage.set(1);
        this.loadClaims();
      });
  }

  // --- Data Loaders ---
  loadStats(): void {
    this.crmService.getBrokerStats().subscribe({
      next: (res) => this.stats.set(res),
      error: (err) => console.error('Failed to load broker stats', err)
    });
  }

  loadBrokers(): void {
    this.isLoadingBrokers.set(true);
    const f = this.brokerFilterForm.value;
    const filters: BrokerFilters = {
      search: f.search || undefined,
      broker_type: f.broker_type || undefined,
      status: f.status || undefined,
      service_area: f.service_area || undefined,
      page: this.brokerPage(),
      limit: this.brokerLimit()
    };

    this.crmService.getBrokers(filters).subscribe({
      next: (res) => {
        this.brokers.set(res.items);
        this.totalBrokers.set(res.total);
        this.isLoadingBrokers.set(false);
      },
      error: (err) => {
        console.error('Failed to load brokers', err);
        this.isLoadingBrokers.set(false);
      }
    });
  }

  loadClaims(): void {
    this.isLoadingClaims.set(true);
    const f = this.claimFilterForm.value;
    const filters: CommissionClaimFilters = {
      search: f.search || undefined,
      claim_status: f.claim_status || undefined,
      milestone_achieved: f.milestone_achieved || undefined,
      page: this.claimPage(),
      limit: this.claimLimit()
    };

    this.crmService.getCommissionClaims(filters).subscribe({
      next: (res) => {
        this.claims.set(res.items);
        this.totalClaims.set(res.total);
        this.isLoadingClaims.set(false);
      },
      error: (err) => {
        console.error('Failed to load commission claims', err);
        this.isLoadingClaims.set(false);
      }
    });
  }

  // --- Pagination ---
  onBrokerPageChange(newPage: number): void {
    this.brokerPage.set(newPage);
    this.loadBrokers();
  }

  onClaimPageChange(newPage: number): void {
    this.claimPage.set(newPage);
    this.loadClaims();
  }

  resetBrokerFilters(): void {
    this.brokerFilterForm.reset({
      search: '',
      broker_type: '',
      status: '',
      service_area: ''
    });
  }

  resetClaimFilters(): void {
    this.claimFilterForm.reset({
      search: '',
      claim_status: '',
      milestone_achieved: ''
    });
  }

  // --- Navigation & Creation ---
  createNewBroker(): void {
    this.router.navigate(['/crm/brokers/new']);
  }

  editBroker(broker: Broker): void {
    this.router.navigate(['/crm/brokers', broker.id, 'edit']);
  }

  createNewClaim(): void {
    this.router.navigate(['/crm/brokers/claims/new']);
  }

  // --- Broker Details Modal ---
  openBrokerDetails(broker: Broker): void {
    this.selectedBroker.set(broker);
    this.copiedCode.set(false);
    this.copiedLink.set(false);
    this.isBrokerDetailsModalOpen.set(true);
  }

  closeBrokerDetails(): void {
    this.isBrokerDetailsModalOpen.set(false);
    this.selectedBroker.set(null);
  }

  copyToClipboard(text?: string | null, type: 'code' | 'link' = 'code'): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'code') {
        this.copiedCode.set(true);
        setTimeout(() => this.copiedCode.set(false), 2000);
      } else {
        this.copiedLink.set(true);
        setTimeout(() => this.copiedLink.set(false), 2000);
      }
    });
  }

  deleteBroker(broker: Broker): void {
    if (confirm(`Are you sure you want to remove broker "${broker.broker_name}" (${broker.broker_code})?`)) {
      this.crmService.deleteBroker(broker.id).subscribe({
        next: () => {
          this.loadBrokers();
          this.loadStats();
        },
        error: (err) => alert(err?.error?.detail || 'Failed to delete broker')
      });
    }
  }

  // --- Commission Claim Approvals & Verification ---
  verifyMilestone(claim: CommissionClaim): void {
    if (confirm(`Confirm milestone verification for claim "${claim.claim_code}"? This verifies that required booking/payment has been deposited.`)) {
      this.crmService.verifyClaimMilestone(claim.id).subscribe({
        next: () => {
          this.loadClaims();
          this.loadStats();
        },
        error: (err) => alert(err?.error?.detail || 'Milestone verification failed')
      });
    }
  }

  openApproveModal(claim: CommissionClaim, defaultDecision: 'APPROVE_SALES' | 'APPROVE_FINANCE' = 'APPROVE_SALES'): void {
    this.selectedClaim.set(claim);
    this.approvalForm.reset({
      decision: defaultDecision,
      rejection_reason: '',
      notes: ''
    });
    this.isApproveModalOpen.set(true);
  }

  closeApproveModal(): void {
    this.isApproveModalOpen.set(false);
    this.selectedClaim.set(null);
  }

  submitApproval(): void {
    const claim = this.selectedClaim();
    if (!claim) return;

    this.isActionLoading.set(true);
    const formVal = this.approvalForm.value;

    this.crmService.approveCommissionClaim(claim.id, {
      decision: formVal.decision,
      rejection_reason: formVal.rejection_reason || undefined,
      notes: formVal.notes || undefined
    }).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.closeApproveModal();
        this.loadClaims();
        this.loadStats();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        alert(err?.error?.detail || 'Approval failed');
      }
    });
  }

  openDisburseModal(claim: CommissionClaim): void {
    this.selectedClaim.set(claim);
    this.disburseForm.reset({
      disbursement_reference: '',
      notes: ''
    });
    this.isDisburseModalOpen.set(true);
  }

  closeDisburseModal(): void {
    this.isDisburseModalOpen.set(false);
    this.selectedClaim.set(null);
  }

  submitDisbursement(): void {
    const claim = this.selectedClaim();
    if (!claim) return;

    const formVal = this.disburseForm.value;
    if (!formVal.disbursement_reference?.trim()) {
      alert('Please provide a disbursement reference (e.g., Cheque No, BEFTN Trx, bKash TrxID)');
      return;
    }

    this.isActionLoading.set(true);
    this.crmService.disburseCommissionClaim(claim.id, {
      disbursement_reference: formVal.disbursement_reference.trim(),
      notes: formVal.notes || undefined
    }).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.closeDisburseModal();
        this.loadClaims();
        this.loadStats();
        this.loadBrokers();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        alert(err?.error?.detail || 'Disbursement failed');
      }
    });
  }

  deleteClaim(claim: CommissionClaim): void {
    if (confirm(`Delete commission claim "${claim.claim_code}"?`)) {
      this.crmService.deleteCommissionClaim(claim.id).subscribe({
        next: () => {
          this.loadClaims();
          this.loadStats();
        },
        error: (err) => alert(err?.error?.detail || 'Failed to delete claim')
      });
    }
  }

  // --- Helper Helpers ---
  getBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED_FOR_PAYOUT':
      case 'DISBURSED':
      case 'BOOKING_CONFIRMED':
      case 'DOWN_PAYMENT_CLEARED':
      case 'FULL_PAYMENT_RECEIVED':
        return 'success';
      case 'PROSPECTIVE':
      case 'DRAFT':
      case 'PENDING_MILESTONE_VERIFICATION':
      case 'PENDING_SALES_APPROVAL':
        return 'warning';
      case 'PENDING_FINANCE_APPROVAL':
        return 'info';
      case 'SUSPENDED':
      case 'EXPIRED':
      case 'REJECTED':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  formatBdt(amount: number): string {
    if (!amount) return '৳ 0';
    return '৳ ' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }
}
