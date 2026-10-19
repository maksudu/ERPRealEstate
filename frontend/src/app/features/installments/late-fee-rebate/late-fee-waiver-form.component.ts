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
  selector: 'app-late-fee-waiver-form',
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
        title="Submit Late Fee Waiver Request"
        subtitle="Request executive or board waiver approval for accrued customer late fees or early payment rebates"
        badge="Waiver Request"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button variant="outline" size="sm" (btnClick)="navigateBack()">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Waivers Registry
          </app-button>
        </div>

        <form (ngSubmit)="submitWaiver()" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Overdue Installment <span class="text-rose-500">*</span>
              </label>
              <app-searchable-select
                categoryCode="OVERDUE_INSTALLMENTS"
                placeholder="Select Overdue Installment"
                [allowCreateNew]="true"
                [(ngModel)]="installmentId"
                name="installment_id"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Waiver Type <span class="text-rose-500">*</span>
              </label>
              <app-searchable-select
                categoryCode="WAIVER_TYPE"
                placeholder="Select Waiver Type"
                [allowCreateNew]="true"
                [(ngModel)]="waiverType"
                name="waiver_type"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Waived Amount (BDT ৳) <span class="text-rose-500">*</span>
              </label>
              <input
                type="number"
                [(ngModel)]="waivedAmount"
                name="waived_amount"
                required
                min="1"
                placeholder="Amount to forgive/discount..."
                class="erp-input text-xs w-full font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Justification & Business Reason <span class="text-rose-500">*</span>
            </label>
            <textarea
              [(ngModel)]="reason"
              name="reason"
              required
              rows="4"
              placeholder="Explain why this waiver should be granted (e.g. buyer faced family bereavement, bank disbursement delay, early upfront settlement, managing director special sanction)..."
              class="erp-input text-xs w-full resize-y"
            ></textarea>
          </div>

          <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <app-button variant="outline" size="md" type="button" (btnClick)="navigateBack()">
              Cancel
            </app-button>
            <app-button variant="primary" size="md" type="submit" [loading]="isSubmitting()">
              Submit for Executive Approval
            </app-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class LateFeeWaiverFormComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);

  installmentId: any = null;
  waiverType = 'PARTIAL';
  waivedAmount: number = 0;
  reason = '';
  isSubmitting = signal<boolean>(false);

  ngOnInit(): void {}

  submitWaiver(): void {
    if (!this.installmentId) {
      alert('Please select an installment to waive');
      return;
    }
    if (!this.waivedAmount || this.waivedAmount <= 0) {
      alert('Please enter a valid waived amount');
      return;
    }
    if (!this.reason) {
      alert('Please provide a justification reason');
      return;
    }

    this.isSubmitting.set(true);

    this.installmentService.createLateFeeWaiver({
      installment_id: Number(this.installmentId),
      waived_amount: Number(this.waivedAmount),
      waiver_type: this.waiverType,
      reason: this.reason
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        alert(`Waiver Request ${res.waiver_code} submitted for review!`);
        this.router.navigate(['/installments/late-fee-rebate']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert('Failed to submit waiver: ' + (err.error?.detail || err.message));
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['/installments/late-fee-rebate']);
  }
}
