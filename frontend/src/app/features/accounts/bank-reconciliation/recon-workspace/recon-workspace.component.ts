import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BankReconciliationService } from '../../../../core/services/bank-reconciliation.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import {
  BankReconciliationDetail,
  BankStatementItemDetail,
  ManualMatchRequest,
  SplitMatchRequest,
  PrepareAdjustmentJournalRequest,
  ApproveLockPeriodRequest
} from '../../../../core/models/bank-reconciliation.model';
import { BankReconNavComponent } from '../bank-recon-nav.component';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { StatusBadgeComponent, StatusVariant } from '../../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-recon-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    BankReconNavComponent,
    CardContainerComponent,
    StatusBadgeComponent,
    SearchableSelectComponent
  ],
  templateUrl: './recon-workspace.component.html'
})
export class ReconWorkspaceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reconService = inject(BankReconciliationService);
  private accountsService = inject(AccountsService);

  sessionId: number = 0;
  session: BankReconciliationDetail | null = null;
  loading: boolean = false;
  activeFilter: 'ALL' | 'MATCHED' | 'UNMATCHED' | 'EXCEPTIONS' = 'ALL';
  filteredItems: BankStatementItemDetail[] = [];

  // Account options for adjustment journals
  expenseAccountOptions: SelectOption[] = [
    { value: 25, label: '5090 - Bank Charges, Fees & Commission Expense' },
    { value: 26, label: '4090 - Bank Profit & Escrow Interest Earned (Income)' },
    { value: 16, label: '2100 - Customer Advances (Direct Deposit Clearing)' },
    { value: 2130, label: '2130 - Accrued Site Payables & Clearing' }
  ];

  // 1. Manual 1-to-1 Match Modal
  showManualMatchModal: boolean = false;
  selectedItemForMatch: BankStatementItemDetail | null = null;
  manualVoucherId: number | null = null;
  manualMatchNotes: string = '';
  submittingMatch: boolean = false;
  matchError: string | null = null;

  // 2. Split Match Modal
  showSplitMatchModal: boolean = false;
  selectedItemForSplit: BankStatementItemDetail | null = null;
  splitVoucherId1: number | null = null;
  splitVoucherId2: number | null = null;
  splitNotes: string = '';
  submittingSplit: boolean = false;
  splitError: string | null = null;

  // 3. Adjustment Journal Modal
  showAdjustmentModal: boolean = false;
  selectedItemForAdj: BankStatementItemDetail | null = null;
  adjType: 'BANK_CHARGE' | 'INTEREST_EARNED' | 'DIRECT_DEPOSIT' = 'BANK_CHARGE';
  adjContraAccountId: number = 25;
  adjNarration: string = '';
  submittingAdj: boolean = false;
  adjError: string | null = null;

  // 4. Lock Period Modal
  showLockModal: boolean = false;
  approvedBy: string = 'Financial Controller (CA/CMA)';
  lockNotes: string = 'Reconciled timing differences, charges confirmed, period locked for audit compliance.';
  locking: boolean = false;
  lockError: string | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.sessionId = Number(idParam);
      this.loadSession();
    }
  }

  loadSession(): void {
    this.loading = true;
    this.reconService.getSession(this.sessionId).subscribe({
      next: (res) => {
        this.session = res;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load reconciliation session', err);
        this.loading = false;
      }
    });
  }

  setFilter(filter: 'ALL' | 'MATCHED' | 'UNMATCHED' | 'EXCEPTIONS'): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    if (!this.session) {
      this.filteredItems = [];
      return;
    }
    const all = this.session.items || [];
    if (this.activeFilter === 'MATCHED') {
      this.filteredItems = all.filter(i => i.match_status === 'MATCHED' || i.match_status === 'SPLIT_MATCHED');
    } else if (this.activeFilter === 'UNMATCHED') {
      this.filteredItems = all.filter(i => i.match_status === 'UNMATCHED');
    } else if (this.activeFilter === 'EXCEPTIONS') {
      this.filteredItems = all.filter(i => i.exception_type && i.exception_type !== 'NONE');
    } else {
      this.filteredItems = all;
    }
  }

  // --- Manual Match Dialog ---
  openManualMatch(item: BankStatementItemDetail): void {
    this.selectedItemForMatch = item;
    this.manualVoucherId = null;
    this.manualMatchNotes = `Manual reconciliation against bank line ref ${item.reference_no || item.id}`;
    this.matchError = null;
    this.showManualMatchModal = true;
  }

  closeManualMatch(): void {
    this.showManualMatchModal = false;
    this.selectedItemForMatch = null;
  }

  submitManualMatch(): void {
    if (!this.selectedItemForMatch || !this.manualVoucherId) {
      this.matchError = 'Please enter a valid General Ledger Voucher ID.';
      return;
    }
    this.submittingMatch = true;
    this.matchError = null;

    this.reconService.manualMatch({
      statement_item_id: this.selectedItemForMatch.id,
      voucher_id: Number(this.manualVoucherId),
      notes: this.manualMatchNotes
    }).subscribe({
      next: () => {
        this.submittingMatch = false;
        this.closeManualMatch();
        this.loadSession();
      },
      error: (err) => {
        this.submittingMatch = false;
        this.matchError = err?.error?.detail || 'Failed to match voucher.';
      }
    });
  }

  // --- Split Match Dialog ---
  openSplitMatch(item: BankStatementItemDetail): void {
    this.selectedItemForSplit = item;
    this.splitVoucherId1 = null;
    this.splitVoucherId2 = null;
    this.splitNotes = `Split match for consolidated bank transaction ৳${(item.debit_amount || item.credit_amount)}`;
    this.splitError = null;
    this.showSplitMatchModal = true;
  }

  closeSplitMatch(): void {
    this.showSplitMatchModal = false;
    this.selectedItemForSplit = null;
  }

  submitSplitMatch(): void {
    if (!this.selectedItemForSplit || !this.splitVoucherId1 || !this.splitVoucherId2) {
      this.splitError = 'Please enter at least 2 voucher IDs for split matching.';
      return;
    }
    this.submittingSplit = true;
    this.splitError = null;

    this.reconService.splitMatch({
      statement_item_id: this.selectedItemForSplit.id,
      voucher_ids: [Number(this.splitVoucherId1), Number(this.splitVoucherId2)],
      notes: this.splitNotes
    }).subscribe({
      next: () => {
        this.submittingSplit = false;
        this.closeSplitMatch();
        this.loadSession();
      },
      error: (err) => {
        this.submittingSplit = false;
        this.splitError = err?.error?.detail || 'Failed to apply split match.';
      }
    });
  }

  // --- Adjustment Journal Dialog ---
  openAdjustmentModal(item: BankStatementItemDetail): void {
    this.selectedItemForAdj = item;
    if (item.exception_type === 'BANK_CHARGE') {
      this.adjType = 'BANK_CHARGE';
      this.adjContraAccountId = 25; // 5090 Bank Charges
      this.adjNarration = `Bank Charge & VAT deducted: ${item.description}`;
    } else if (item.exception_type === 'INTEREST_EARNED') {
      this.adjType = 'INTEREST_EARNED';
      this.adjContraAccountId = 26; // 4090 Bank Profit
      this.adjNarration = `Bank Interest / Escrow Profit Credited: ${item.description}`;
    } else {
      this.adjType = 'DIRECT_DEPOSIT';
      this.adjContraAccountId = 16; // 2100 Customer Advances
      this.adjNarration = `Direct Deposit Collection: ${item.description}`;
    }
    this.adjError = null;
    this.showAdjustmentModal = true;
  }

  closeAdjustmentModal(): void {
    this.showAdjustmentModal = false;
    this.selectedItemForAdj = null;
  }

  submitAdjustment(): void {
    if (!this.selectedItemForAdj || !this.adjContraAccountId) {
      this.adjError = 'Please select a valid contra general ledger account.';
      return;
    }
    this.submittingAdj = true;
    this.adjError = null;

    this.reconService.postAdjustmentJournal({
      statement_item_id: this.selectedItemForAdj.id,
      adjustment_type: this.adjType,
      contra_account_id: Number(this.adjContraAccountId),
      narration: this.adjNarration
    }).subscribe({
      next: () => {
        this.submittingAdj = false;
        this.closeAdjustmentModal();
        this.loadSession();
      },
      error: (err) => {
        this.submittingAdj = false;
        this.adjError = err?.error?.detail || 'Failed to prepare adjustment journal voucher.';
      }
    });
  }

  // --- Lock Period Dialog ---
  openLockModal(): void {
    this.lockError = null;
    this.showLockModal = true;
  }

  closeLockModal(): void {
    this.showLockModal = false;
  }

  submitLockPeriod(): void {
    if (!this.session) return;
    this.locking = true;
    this.lockError = null;

    this.reconService.approveAndLockPeriod({
      reconciliation_id: this.session.id,
      approved_by: this.approvedBy,
      lock_notes: this.lockNotes
    }).subscribe({
      next: () => {
        this.locking = false;
        this.closeLockModal();
        this.loadSession();
      },
      error: (err) => {
        this.locking = false;
        this.lockError = err?.error?.detail || 'Failed to lock period.';
      }
    });
  }

  getStatusVariant(status: string): StatusVariant {
    switch (status) {
      case 'LOCKED':
        return 'live-lock';
      case 'APPROVED':
      case 'AUTO_MATCHED':
      case 'MATCHED':
        return 'success';
      case 'SPLIT_MATCHED':
        return 'luxury';
      case 'MANUALLY_REVIEWED':
        return 'info';
      case 'ADJUSTMENT_PENDING':
        return 'amber';
      case 'UNMATCHED':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  getExceptionVariant(exc: string): StatusVariant {
    switch (exc) {
      case 'BANK_CHARGE':
        return 'danger';
      case 'INTEREST_EARNED':
        return 'success';
      case 'DIRECT_DEPOSIT':
        return 'info';
      case 'OUTSTANDING_CHEQUE':
        return 'amber';
      case 'DEPOSIT_IN_TRANSIT':
        return 'purple';
      default:
        return 'neutral';
    }
  }
}
