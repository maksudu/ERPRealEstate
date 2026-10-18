import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { UnitTransfer, UnitTransferApprovalAction } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent
} from '../../../shared/components';

@Component({
  selector: 'app-transfer-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent
  ],
  templateUrl: './transfer-details.component.html'
})
export class TransferDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);

  transferId = signal<number>(0);
  transfer = signal<UnitTransfer | null>(null);
  isLoading = signal<boolean>(true);
  isActionLoading = signal<boolean>(false);
  feedbackMessage = signal<string>('');
  errorMessage = signal<string>('');

  // Approval modal state
  isApprovalModalOpen = signal<boolean>(false);
  approvalDecision = signal<'LEGAL_APPROVED' | 'MANAGEMENT_APPROVED' | 'REJECTED'>('LEGAL_APPROVED');
  approvalNotes = signal<string>('');

  // Execution modal state
  isExecuteModalOpen = signal<boolean>(false);
  transferFeeReceiptNo = signal<string>('');
  revisedAgreementReference = signal<string>('');
  executionNotes = signal<string>('');

  isFullyApproved = computed(() => {
    const t = this.transfer();
    if (!t) return false;
    return t.approval_status === 'MANAGEMENT_APPROVED' || t.approval_status === 'EXECUTED_COMPLETED';
  });

  isExecuted = computed(() => {
    return this.transfer()?.approval_status === 'EXECUTED_COMPLETED';
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.transferId.set(id);
      this.loadDossier();
    }
  }

  loadDossier(): void {
    this.isLoading.set(true);
    this.salesService.getTransferDossier(this.transferId()).subscribe({
      next: (res) => {
        this.transfer.set(res);
        this.transferFeeReceiptNo.set(res.transfer_fee_receipt_no || `MR-TRF-${res.id}`);
        this.revisedAgreementReference.set(res.revised_agreement_reference || `AGR-REV-${res.booking_reference_no}`);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load transfer dossier.');
      }
    });
  }

  openApprovalModal(decision: 'LEGAL_APPROVED' | 'MANAGEMENT_APPROVED' | 'REJECTED'): void {
    this.approvalDecision.set(decision);
    this.approvalNotes.set('');
    this.isApprovalModalOpen.set(true);
  }

  submitApproval(): void {
    this.isActionLoading.set(true);
    const payload: UnitTransferApprovalAction = {
      decision: this.approvalDecision(),
      approved_by: 'Authorized Reviewer',
      notes: this.approvalNotes() || undefined
    };

    this.salesService.approveTransfer(this.transferId(), payload).subscribe({
      next: (updated) => {
        this.transfer.set(updated);
        this.isActionLoading.set(false);
        this.isApprovalModalOpen.set(false);
        this.feedbackMessage.set(`Transfer decision successfully updated to ${this.approvalDecision()}.`);
      },
      error: (err) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Approval action failed.');
      }
    });
  }

  openExecuteModal(): void {
    this.isExecuteModalOpen.set(true);
  }

  submitExecution(): void {
    if (!this.transferFeeReceiptNo().trim()) {
      this.errorMessage.set('Transfer fee receipt number is mandatory to execute mutation.');
      return;
    }

    this.isActionLoading.set(true);
    const payload: UnitTransferApprovalAction = {
      decision: 'EXECUTED_COMPLETED',
      approved_by: 'Managing Director / Corporate Legal',
      transfer_fee_receipt_no: this.transferFeeReceiptNo().trim(),
      revised_agreement_reference: this.revisedAgreementReference().trim() || undefined,
      notes: this.executionNotes() || undefined
    };

    this.salesService.approveTransfer(this.transferId(), payload).subscribe({
      next: (updated) => {
        this.transfer.set(updated);
        this.isActionLoading.set(false);
        this.isExecuteModalOpen.set(false);
        this.feedbackMessage.set('Ownership mutation executed! Customer ledger linked, revised agreement logged, and original payments preserved.');
      },
      error: (err) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Mutation execution failed.');
      }
    });
  }
}
