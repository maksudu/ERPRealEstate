import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BankReconciliationService } from '../../../../core/services/bank-reconciliation.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import {
  BankReconciliationDetail,
  BankReconciliationKPIs
} from '../../../../core/models/bank-reconciliation.model';
import { ChartOfAccount } from '../../../../core/models/accounts.model';
import { BankReconNavComponent } from '../bank-recon-nav.component';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { StatusBadgeComponent, StatusVariant } from '../../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-recon-sessions-list',
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
  templateUrl: './recon-sessions-list.component.html'
})
export class ReconSessionsListComponent implements OnInit {
  private reconService = inject(BankReconciliationService);
  private accountsService = inject(AccountsService);
  private router = inject(Router);

  sessions: BankReconciliationDetail[] = [];
  kpis: BankReconciliationKPIs | null = null;
  loading: boolean = false;
  total: number = 0;
  limit: number = 10;
  offset: number = 0;

  searchTerm: string = '';
  selectedStatus: string = 'ALL';
  selectedBankAccountId: number | null = null;

  bankAccountOptions: SelectOption[] = [];

  // Lock Confirmation Modal
  showLockModal: boolean = false;
  selectedSessionForLock: BankReconciliationDetail | null = null;
  approvedByInput: string = 'Financial Controller (CA/CMA)';
  lockNotesInput: string = 'Reconciled timing differences, charges confirmed, period locked for audit compliance.';
  locking: boolean = false;
  lockError: string | null = null;

  ngOnInit(): void {
    this.loadBankAccounts();
    this.loadKPIs();
    this.loadSessions();
  }

  loadKPIs(): void {
    this.reconService.getKPIs().subscribe({
      next: (k) => this.kpis = k,
      error: (err) => console.error('Failed to load reconciliation KPIs', err)
    });
  }

  loadBankAccounts(): void {
    this.accountsService.getCOA('Asset').subscribe({
      next: (accounts) => {
        const banks = (accounts || []).filter(a =>
          a.account_name_en.toLowerCase().includes('bank') ||
          a.account_name_en.toLowerCase().includes('bkash') ||
          a.account_name_en.toLowerCase().includes('escrow')
        );
        this.bankAccountOptions = (banks.length ? banks : accounts).map(a => ({
          value: a.id,
          label: `${a.account_name_en} (${a.account_code})`
        }));
      },
      error: (err) => console.error('Failed to load bank accounts', err)
    });
  }

  loadSessions(): void {
    this.loading = true;
    this.reconService.getSessions({
      search: this.searchTerm || undefined,
      status: this.selectedStatus,
      bank_account_id: this.selectedBankAccountId || undefined,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.sessions = res.items || [];
        this.total = res.total;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load reconciliation sessions', err);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.offset = 0;
    this.loadSessions();
  }

  onStatusFilterChange(status: any): void {
    this.selectedStatus = status || 'ALL';
    this.offset = 0;
    this.loadSessions();
  }

  onBankAccountFilterChange(accId: any): void {
    this.selectedBankAccountId = accId ? Number(accId) : null;
    this.offset = 0;
    this.loadSessions();
  }

  openLockModal(session: BankReconciliationDetail): void {
    this.selectedSessionForLock = session;
    this.lockError = null;
    this.showLockModal = true;
  }

  closeLockModal(): void {
    this.showLockModal = false;
    this.selectedSessionForLock = null;
  }

  confirmApproveAndLock(): void {
    if (!this.selectedSessionForLock) return;
    this.locking = true;
    this.lockError = null;

    this.reconService.approveAndLockPeriod({
      reconciliation_id: this.selectedSessionForLock.id,
      approved_by: this.approvedByInput,
      lock_notes: this.lockNotesInput
    }).subscribe({
      next: (updated) => {
        this.locking = false;
        this.closeLockModal();
        this.loadSessions();
        this.loadKPIs();
      },
      error: (err) => {
        this.locking = false;
        this.lockError = err?.error?.detail || 'Failed to lock reconciliation period.';
      }
    });
  }

  getStatusVariant(status: string): StatusVariant {
    switch (status) {
      case 'LOCKED':
        return 'live-lock';
      case 'APPROVED':
      case 'AUTO_MATCHED':
        return 'success';
      case 'MANUALLY_REVIEWED':
        return 'info';
      case 'ADJUSTMENT_PENDING':
        return 'amber';
      case 'DRAFT':
        return 'neutral';
      default:
        return 'info';
    }
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit) || 1;
  }

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadSessions();
    }
  }

  nextPage(): void {
    if (this.offset + this.limit < this.total) {
      this.offset += this.limit;
      this.loadSessions();
    }
  }

  onLimitChange(limit: number): void {
    this.limit = Number(limit);
    this.offset = 0;
    this.loadSessions();
  }
}
