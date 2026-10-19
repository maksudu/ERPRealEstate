import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import {
  PaymentVoucher,
  PaymentVoucherWorkflowAction
} from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent
} from '../../../shared/components';

@Component({
  selector: 'app-payment-voucher-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent
  ],
  templateUrl: './payment-voucher-view.component.html'
})
export class PaymentVoucherViewComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  voucherId = signal<number>(0);
  voucher = signal<PaymentVoucher | null>(null);
  isLoading = signal<boolean>(false);
  isActionLoading = signal<boolean>(false);

  // Workflow Dialog / Input State
  showActionModal = signal<boolean>(false);
  currentAction = signal<string>('');
  actionNotes = signal<string>('');
  actionSettlementRef = signal<string>('');
  actionChequeStatus = signal<string>('Cleared');

  // Flash Notifications
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // 7-Stage Workflow Definition
  readonly workflowStages = [
    { key: 'Draft', label: '1. Draft', icon: 'ri-file-edit-line' },
    { key: 'Submitted', label: '2. Submitted', icon: 'ri-send-plane-line' },
    { key: 'Checked', label: '3. Checked', icon: 'ri-checkbox-circle-line' },
    { key: 'Approved', label: '4. Approved', icon: 'ri-thumb-up-line' },
    { key: 'Disbursed', label: '5. Disbursed / Posted', icon: 'ri-hand-coin-line' },
    { key: 'Reconciled', label: '6. Reconciled', icon: 'ri-shield-check-line' }
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.voucherId.set(id);
      this.loadVoucher(id);
    }
  }

  loadVoucher(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountsService.getPaymentVoucherById(id).subscribe({
      next: (v) => {
        this.voucher.set(v);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to load payment voucher details.');
      }
    });
  }

  getStageIndex(status: string): number {
    const map: Record<string, number> = {
      Draft: 0,
      Submitted: 1,
      Checked: 2,
      Approved: 3,
      Disbursed: 4,
      Reconciled: 5
    };
    return map[status] ?? 0;
  }

  isStageCompleted(stageKey: string, currentStatus: string): boolean {
    const stageIdx = this.getStageIndex(stageKey);
    const currIdx = this.getStageIndex(currentStatus);
    return currIdx >= stageIdx && currentStatus !== 'Cancelled';
  }

  isCurrentStage(stageKey: string, currentStatus: string): boolean {
    return stageKey === currentStatus;
  }

  openWorkflowPrompt(action: string): void {
    this.currentAction.set(action);
    this.actionNotes.set('');
    this.actionSettlementRef.set('');
    if (this.voucher()?.payment_method === 'Cheque') {
      this.actionChequeStatus.set(action === 'reconcile' ? 'Cleared' : 'Issued');
    }
    this.showActionModal.set(true);
  }

  confirmWorkflowAction(): void {
    const v = this.voucher();
    if (!v) return;

    this.isActionLoading.set(true);
    const payload: PaymentVoucherWorkflowAction = {
      action: this.currentAction(),
      notes: this.actionNotes() || undefined,
      settlement_reference: this.actionSettlementRef() || undefined,
      cheque_status: v.payment_method === 'Cheque' ? this.actionChequeStatus() : undefined
    };

    this.accountsService.executePaymentVoucherWorkflow(v.id, payload).subscribe({
      next: (updated) => {
        this.isActionLoading.set(false);
        this.showActionModal.set(false);
        this.voucher.set(updated);
        this.successMessage.set(`Voucher ${updated.voucher_number} successfully transitioned to ${updated.status}.`);
      },
      error: (err) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err.error?.detail || `Failed to transition voucher to ${this.currentAction()}.`);
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      case 'Submitted':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Checked':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Approved':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'Disbursed':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Reconciled':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-300 dark:border-teal-800';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-secondary text-foreground border-border';
    }
  }

  printVoucher(): void {
    window.print();
  }
}
