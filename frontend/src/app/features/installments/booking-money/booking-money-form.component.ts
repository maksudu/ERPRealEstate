import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { SalesService } from '../../../core/services/sales.service';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-booking-money-form',
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
        title="Record Booking Money Receipt"
        subtitle="Collect and issue official BDT earnest money receipt for an apartment or plot booking"
        badge="Booking Money"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button variant="outline" size="sm" (btnClick)="navigateBack()">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Booking List
          </app-button>
        </div>

        <form (ngSubmit)="submitReceipt()" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Booking Application <span class="text-rose-500">*</span>
              </label>
              <app-searchable-select
                categoryCode="BOOKING_APPLICATIONS"
                placeholder="Select Booking Reference"
                [allowCreateNew]="true"
                [(ngModel)]="bookingId"
                name="booking_id"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Receipt Date <span class="text-rose-500">*</span>
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
                Booking Money Amount (BDT ৳) <span class="text-rose-500">*</span>
              </label>
              <input
                type="number"
                [(ngModel)]="amountReceived"
                name="amount_received"
                required
                min="1000"
                placeholder="e.g. 500000"
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
                placeholder="e.g. CQ-99281 or bKash TrxID"
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
                placeholder="e.g. BRAC Bank (Gulshan Branch)"
                class="erp-input text-xs w-full"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Remarks & Verification Notes</label>
            <textarea
              [(ngModel)]="remarks"
              name="remarks"
              rows="3"
              placeholder="Received against apartment booking confirmation..."
              class="erp-input text-xs w-full resize-y"
            ></textarea>
          </div>

          <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <app-button variant="outline" size="md" type="button" (btnClick)="navigateBack()">
              Cancel
            </app-button>
            <app-button variant="primary" size="md" type="submit" [loading]="isSubmitting()">
              Generate Official Money Receipt
            </app-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class BookingMoneyFormComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);

  bookingId: any = null;
  receiptDate = new Date().toISOString().substring(0, 10);
  paymentMode = 'CASH';
  amountReceived: number = 0;
  instrumentNo = '';
  bankName = '';
  remarks = '';
  isSubmitting = signal<boolean>(false);

  ngOnInit(): void {}

  submitReceipt(): void {
    if (!this.bookingId) {
      alert('Please select a booking application');
      return;
    }
    if (!this.amountReceived || this.amountReceived <= 0) {
      alert('Please enter a valid booking money amount');
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
      remarks: this.remarks || 'Booking Money Realization',
      send_sms_notification: true
    };

    this.installmentService.createMoneyReceipt(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        alert(`Money Receipt ${res.mr_number} issued successfully!`);
        this.router.navigate(['/installments/booking-money']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert('Failed to issue receipt: ' + (err.error?.detail || err.message));
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['/installments/booking-money']);
  }
}
