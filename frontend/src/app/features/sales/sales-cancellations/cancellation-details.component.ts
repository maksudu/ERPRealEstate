import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { BookingCancellation, BookingCancellationApprovalAction, BookingCancellationDisburseRefund } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-cancellation-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './cancellation-details.component.html'
})
export class CancellationDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);

  cancellationId = signal<number>(0);
  cancellation = signal<BookingCancellation | null>(null);
  isLoading = signal<boolean>(true);
  isActionLoading = signal<boolean>(false);
  feedbackMessage = signal<string>('');
  errorMessage = signal<string>('');

  // Approval modal/action state
  selectedApprovalTier = signal<'LEGAL' | 'SALES' | 'FINANCE'>('LEGAL');
  approvalDecision = signal<'APPROVED' | 'REJECTED'>('APPROVED');
  approvalNotes = signal<string>('');
  isApprovalModalOpen = signal<boolean>(false);

  // Refund disbursement modal state
  isRefundModalOpen = signal<boolean>(false);
  refundAmount = signal<number>(0);
  refundPaymentReference = signal<string>('');
  refundPaymentMode = signal<string>('BANK_TRANSFER');
  revertInventory = signal<boolean>(true);
  refundNotes = signal<string>('');

  // Remaining eligible balance
  remainingRefundBalance = computed(() => {
    const c = this.cancellation();
    if (!c) return 0;
    return Math.max(0, Number(c.net_refund_amount || 0) - Number(c.amount_refunded_so_far || 0));
  });

  isFullyApproved = computed(() => {
    const c = this.cancellation();
    if (!c) return false;
    return c.legal_approval_status === 'APPROVED' &&
           c.sales_approval_status === 'APPROVED' &&
           c.finance_approval_status === 'APPROVED';
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.cancellationId.set(id);
      this.loadDossier();
    }
  }

  loadDossier(): void {
    this.isLoading.set(true);
    this.salesService.getCancellationDossier(this.cancellationId()).subscribe({
      next: (res) => {
        this.cancellation.set(res);
        this.refundAmount.set(Math.max(0, Number(res.net_refund_amount) - Number(res.amount_refunded_so_far)));
        this.refundPaymentMode.set(res.refund_payment_mode || 'BANK_TRANSFER');
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load cancellation dossier.');
      }
    });
  }

  openApprovalModal(tier: 'LEGAL' | 'SALES' | 'FINANCE', decision: 'APPROVED' | 'REJECTED'): void {
    this.selectedApprovalTier.set(tier);
    this.approvalDecision.set(decision);
    this.approvalNotes.set('');
    this.isApprovalModalOpen.set(true);
  }

  submitApproval(): void {
    this.isActionLoading.set(true);
    const payload: BookingCancellationApprovalAction = {
      tier: this.selectedApprovalTier(),
      decision: this.approvalDecision(),
      approved_by: 'Authorized Reviewer',
      notes: this.approvalNotes() || undefined
    };

    this.salesService.approveCancellation(this.cancellationId(), payload).subscribe({
      next: (updated) => {
        this.cancellation.set(updated);
        this.isActionLoading.set(false);
        this.isApprovalModalOpen.set(false);
        this.feedbackMessage.set(`${this.selectedApprovalTier()} review decision recorded as ${this.approvalDecision()}.`);
      },
      error: (err) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Approval action failed.');
      }
    });
  }

  openRefundModal(): void {
    const rem = this.remainingRefundBalance();
    if (rem <= 0) {
      this.errorMessage.set('Eligible refund has already been completely disbursed. Duplicate refunds are prevented.');
      return;
    }
    this.refundAmount.set(rem);
    this.refundPaymentReference.set(`EFT-${Date.now().toString().slice(-6)}`);
    this.isRefundModalOpen.set(true);
  }

  submitDisbursement(): void {
    const rem = this.remainingRefundBalance();
    const amt = Number(this.refundAmount());
    if (amt <= 0 || amt > rem) {
      this.errorMessage.set(`Refund amount must be greater than 0 and cannot exceed the remaining eligible balance of ৳${rem.toLocaleString()}.`);
      return;
    }

    if (!this.refundPaymentReference()) {
      this.errorMessage.set('Payment reference / cheque number is required for restricted bank reconciliation.');
      return;
    }

    this.isActionLoading.set(true);
    const payload: BookingCancellationDisburseRefund = {
      amount_to_disburse: amt,
      refund_payment_reference: this.refundPaymentReference(),
      refund_payment_mode: this.refundPaymentMode(),
      revert_inventory: this.revertInventory(),
      notes: this.refundNotes() || undefined
    };

    this.salesService.disburseCancellationRefund(this.cancellationId(), payload).subscribe({
      next: (updated) => {
        this.cancellation.set(updated);
        this.isActionLoading.set(false);
        this.isRefundModalOpen.set(false);
        this.feedbackMessage.set(`Disbursed refund of ৳${amt.toLocaleString()} via ${this.refundPaymentMode()}. Unit status released to AVAILABLE.`);
      },
      error: (err) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Refund disbursement failed.');
      }
    });
  }

  notifyCustomer(): void {
    this.isActionLoading.set(true);
    this.salesService.notifyCancellationCustomer(this.cancellationId()).subscribe({
      next: (updated) => {
        this.cancellation.set(updated);
        this.isActionLoading.set(false);
        this.feedbackMessage.set('Customer notified of approved cancellation decision via SMS and official email.');
      },
      error: (err) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Customer notification failed.');
      }
    });
  }
}
