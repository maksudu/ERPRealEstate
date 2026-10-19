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
  selector: 'app-reschedule-request-form',
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
        title="Propose Payment Rescheduling Plan"
        subtitle="Submit a revised payment timeline, request installment deferment, and preserve original schedule audit history"
        badge="Reschedule Request"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button variant="outline" size="sm" (btnClick)="navigateBack()">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Reschedules List
          </app-button>
        </div>

        <form (ngSubmit)="submitReschedule()" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Booking Allotment <span class="text-rose-500">*</span>
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
                Proposed Installment Count <span class="text-rose-500">*</span>
              </label>
              <input
                type="number"
                [(ngModel)]="proposedCount"
                name="proposed_count"
                required
                min="1"
                max="120"
                placeholder="e.g. 36 installments"
                class="erp-input text-xs w-full"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Proposed Revised Start Date <span class="text-rose-500">*</span>
              </label>
              <input
                type="date"
                [(ngModel)]="proposedStartDate"
                name="proposed_start_date"
                required
                class="erp-input text-xs w-full"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Installment Deferment (Grace Months)
              </label>
              <input
                type="number"
                [(ngModel)]="defermentMonths"
                name="deferment_months"
                min="0"
                max="12"
                placeholder="0 for immediate start, or 1-6 months pause"
                class="erp-input text-xs w-full"
              />
              <span class="text-[10px] text-slate-500 mt-1 block">Number of months to pause billing during hardship</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Financial Impact & Cash Flow Assessment
              </label>
              <input
                type="text"
                [(ngModel)]="financialNotes"
                name="financial_notes"
                placeholder="e.g. Projects 2-month cash collection delay with 0% interest increase..."
                class="erp-input text-xs w-full"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason for Rescheduling Request <span class="text-rose-500">*</span>
            </label>
            <textarea
              [(ngModel)]="reason"
              name="reason"
              required
              rows="4"
              placeholder="Detailed explanation of buyer request (e.g. temporary overseas remittance delay, business restructuring, restructuring to match construction pace)..."
              class="erp-input text-xs w-full resize-y"
            ></textarea>
          </div>

          <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <app-button variant="outline" size="md" type="button" (btnClick)="navigateBack()">
              Cancel
            </app-button>
            <app-button variant="primary" size="md" type="submit" [loading]="isSubmitting()">
              Submit Reschedule Request for Board Review
            </app-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class RescheduleRequestFormComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);

  bookingId: any = null;
  proposedCount = 36;
  proposedStartDate = new Date().toISOString().substring(0, 10);
  defermentMonths = 0;
  financialNotes = '';
  reason = '';
  isSubmitting = signal<boolean>(false);

  ngOnInit(): void {}

  submitReschedule(): void {
    if (!this.bookingId) {
      alert('Please select a booking allotment');
      return;
    }
    if (!this.proposedCount || this.proposedCount <= 0) {
      alert('Please enter a valid proposed installment count');
      return;
    }
    if (!this.reason) {
      alert('Please provide a reason for rescheduling');
      return;
    }

    this.isSubmitting.set(true);

    this.installmentService.createRescheduleRequest({
      booking_id: Number(this.bookingId),
      proposed_installment_count: Number(this.proposedCount),
      proposed_start_date: this.proposedStartDate,
      deferment_months: Number(this.defermentMonths || 0),
      financial_impact_notes: this.financialNotes,
      reason: this.reason
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        alert(`Reschedule Request ${res.reschedule_code} registered successfully!`);
        this.router.navigate(['/installments/rescheduling']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert('Failed to submit reschedule request: ' + (err.error?.detail || err.message));
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['/installments/rescheduling']);
  }
}
