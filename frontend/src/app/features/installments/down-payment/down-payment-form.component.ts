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
  selector: 'app-down-payment-form',
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
        title="Collect Down Payment"
        subtitle="Record down payment receipt, apply booking earnest money adjustment, and update customer allotment balance"
        badge="Down Payment"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button variant="outline" size="sm" (btnClick)="navigateBack()">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Down Payment List
          </app-button>
        </div>

        <form (ngSubmit)="submitDownPayment()" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Booking Allotment <span class="text-rose-500">*</span>
              </label>
              <app-searchable-select
                categoryCode="BOOKING_APPLICATIONS"
                placeholder="Select Booking / Allotment"
                [allowCreateNew]="true"
                [(ngModel)]="bookingId"
                name="booking_id"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Collection Date <span class="text-rose-500">*</span>
              </label>
              <input
                type="date"
                [(ngModel)]="receiptDate"
                name="receipt_date"
                required
                class="erp-input text-xs w-full"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Instrument Mode <span class="text-rose-500">*</span>
              </label>
              <app-searchable-select
                categoryCode="PAYMENT_MODE"
                placeholder="Select Payment Mode"
                [allowCreateNew]="true"
                [(ngModel)]="paymentMode"
                name="payment_mode"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Down Payment Amount (BDT ৳) <span class="text-rose-500">*</span>
              </label>
              <input
                type="number"
                [(ngModel)]="amountReceived"
                name="amount_received"
                required
                min="1000"
                placeholder="e.g. 1000000"
                class="erp-input text-xs w-full font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Instrument / Cheque / Trx No
              </label>
              <input
                type="text"
                [(ngModel)]="instrumentNo"
                name="instrument_no"
                placeholder="e.g. PO-88192 or Cheque No"
                class="erp-input text-xs w-full"
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
                placeholder="e.g. Standard Chartered Bank (Dhanmondi)"
                class="erp-input text-xs w-full"
              />
            </div>
          </div>

          <div class="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3">
            <input
              type="checkbox"
              id="adjustBooking"
              [(ngModel)]="adjustBookingMoney"
              name="adjust_booking_money"
              class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label for="adjustBooking" class="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <span class="font-bold text-slate-900 dark:text-white">Adjust previously credited booking earnest money</span>
              (Automatically marks the booking portion as settled within total down payment)
            </label>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Collection Remarks</label>
            <textarea
              [(ngModel)]="remarks"
              name="remarks"
              rows="3"
              placeholder="Received against down payment agreement milestone..."
              class="erp-input text-xs w-full resize-y"
            ></textarea>
          </div>

          <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <app-button variant="outline" size="md" type="button" (btnClick)="navigateBack()">
              Cancel
            </app-button>
            <app-button variant="primary" size="md" type="submit" [loading]="isSubmitting()">
              Record Down Payment & Post Voucher
            </app-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class DownPaymentFormComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);

  bookingId: any = null;
  receiptDate = new Date().toISOString().substring(0, 10);
  paymentMode = 'BANK_TRANSFER';
  amountReceived: number = 0;
  instrumentNo = '';
  bankName = '';
  adjustBookingMoney = true;
  remarks = '';
  isSubmitting = signal<boolean>(false);

  ngOnInit(): void {}

  submitDownPayment(): void {
    if (!this.bookingId) {
      alert('Please select a booking allotment');
      return;
    }
    if (!this.amountReceived || this.amountReceived <= 0) {
      alert('Please enter a valid down payment amount');
      return;
    }

    this.isSubmitting.set(true);

    const payload = {
      booking_id: Number(this.bookingId),
      receipt_date: this.receiptDate,
      payment_mode: this.paymentMode,
      amount_received: Number(this.amountReceived),
      instrument_no: this.instrumentNo || null,
      bank_name: this.bankName || null,
      remarks: this.remarks || 'Down Payment Realization',
      send_sms_notification: true
    };

    this.installmentService.createMoneyReceipt(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        alert(`Down Payment Receipt ${res.mr_number} recorded successfully!`);
        this.router.navigate(['/installments/down-payment']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert('Failed to record down payment: ' + (err.error?.detail || err.message));
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['/installments/down-payment']);
  }
}
