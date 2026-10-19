import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-refund-adjustment-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    InstallmentsNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-4">
      <app-installments-nav />

      <app-card-container
        title="Record Refund or Credit Adjustment"
        subtitle="Process customer payback, cancelation refund, receipt reversal, or credit note with double-entry audit linkage"
        badge="Refund / Adjustment"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button variant="outline" size="sm" (btnClick)="navigateBack()">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Adjustments List
          </app-button>
        </div>

        <form (ngSubmit)="submitAdjustment()" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Booking / Allotment <span class="text-rose-500">*</span>
              </label>
              <app-searchable-select
                categoryCode="BOOKING_APPLICATIONS"
                placeholder="Select Booking / Customer"
                [allowCreateNew]="true"
                [(ngModel)]="bookingId"
                name="booking_id"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Adjustment Type <span class="text-rose-500">*</span>
              </label>
              <app-searchable-select
                categoryCode="REFUND_ADJUSTMENT_TYPE"
                placeholder="Select Adjustment Type"
                [allowCreateNew]="true"
                [(ngModel)]="adjustmentType"
                name="adjustment_type"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Adjustment Amount (BDT ৳) <span class="text-rose-500">*</span>
              </label>
              <input
                type="number"
                [(ngModel)]="amount"
                name="amount"
                required
                min="100"
                placeholder="Amount in BDT..."
                class="erp-input text-xs w-full font-bold text-rose-600 dark:text-rose-400"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Disbursement Payment Mode <span class="text-rose-500">*</span>
              </label>
              <app-searchable-select
                categoryCode="PAYMENT_MODE"
                placeholder="Select Payment Mode"
                [allowCreateNew]="true"
                [(ngModel)]="paymentMode"
                name="payment_mode"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Bank / Branch Name
              </label>
              <input
                type="text"
                [(ngModel)]="bankName"
                name="bank_name"
                placeholder="e.g. Dhaka Bank (Principal Branch)"
                class="erp-input text-xs w-full"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Cheque / BEFTN / Voucher Reference
              </label>
              <input
                type="text"
                [(ngModel)]="chequeRef"
                name="cheque_ref"
                placeholder="e.g. CQ-190281 or BEFTN Trx Ref"
                class="erp-input text-xs w-full"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason for Refund or Credit Adjustment <span class="text-rose-500">*</span>
            </label>
            <textarea
              [(ngModel)]="reason"
              name="reason"
              required
              rows="4"
              placeholder="Detailed justification (e.g. customer deposited excess advance payment, mutual cancellation agreed with 10% statutory deduction under BD real estate act, misposted money receipt correction)..."
              class="erp-input text-xs w-full resize-y"
            ></textarea>
          </div>

          <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <app-button variant="outline" size="md" type="button" (btnClick)="navigateBack()">
              Cancel
            </app-button>
            <app-button variant="primary" size="md" type="submit" [loading]="isSubmitting()">
              Submit Refund & Post General Ledger Adjustment
            </app-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class RefundAdjustmentFormComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);

  bookingId: any = null;
  adjustmentType = 'EXCESS_PAYMENT_REFUND';
  amount: number = 0;
  paymentMode = 'BANK_TRANSFER';
  bankName = '';
  chequeRef = '';
  reason = '';
  isSubmitting = signal<boolean>(false);

  ngOnInit(): void {}

  submitAdjustment(): void {
    if (!this.bookingId) {
      alert('Please select a booking allotment');
      return;
    }
    if (!this.amount || this.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!this.reason) {
      alert('Please provide a justification reason');
      return;
    }

    this.isSubmitting.set(true);

    this.installmentService.createRefundAdjustment({
      booking_id: Number(this.bookingId),
      adjustment_type: this.adjustmentType,
      amount: Number(this.amount),
      payment_mode: this.paymentMode,
      bank_name: this.bankName || undefined,
      cheque_reference: this.chequeRef || undefined,
      reason: this.reason
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        alert(`Adjustment Record ${res.adjustment_code} logged successfully!`);
        this.router.navigate(['/installments/refund-adjustment']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert('Failed to log adjustment: ' + (err.error?.detail || err.message));
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['/installments/refund-adjustment']);
  }
}
