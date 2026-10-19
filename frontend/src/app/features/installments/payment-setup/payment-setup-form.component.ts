import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { PaymentPlanConfig } from '../../../core/models/installment.model';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input.component';
import { CustomTextareaComponent } from '../../../shared/components/custom-textarea/custom-textarea.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-payment-setup-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    InstallmentsNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-4">
      <app-installments-nav />

      <app-card-container
        [title]="isEditMode ? 'Edit Customer Payment Plan' : 'Define New Customer Payment Plan'"
        [subtitle]="isEditMode ? 'Update amortization structure, milestones, late fee caps, and rebate rules' : 'Configure payment structure for apartment, plot, or commercial real estate projects in Bangladesh'"
        badge="Payment Setup"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button variant="outline" size="sm" (btnClick)="navigateBack()">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Plan Registry
          </app-button>
        </div>

        <form (ngSubmit)="savePlan()" class="space-y-6">
          <!-- Step 1: Basic Plan Identification -->
          <div>
            <div class="flex items-center gap-2 pb-2 mb-4 border-b border-slate-200 dark:border-slate-800">
              <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center justify-center">1</span>
              <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Plan Identification & Property Scope</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Plan Name <span class="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="formData.plan_name"
                  name="plan_name"
                  required
                  placeholder="e.g. Standard 36-Month Amortization"
                  class="erp-input text-xs w-full"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Real Estate Project (Dynamic)
                </label>
                <app-searchable-select
                  categoryCode="PROJECT_LIST"
                  placeholder="Select Project or Leave General"
                  [allowCreateNew]="true"
                  [(ngModel)]="formData.project_id"
                  name="project_id"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Property / Unit Type <span class="text-rose-500">*</span>
                </label>
                <app-searchable-select
                  categoryCode="PROPERTY_TYPE"
                  placeholder="Select Property Type"
                  [allowCreateNew]="true"
                  [(ngModel)]="formData.property_type"
                  name="property_type"
                />
              </div>
            </div>
          </div>

          <!-- Step 2: Payment Plan Components & Ratio Validation -->
          <div>
            <div class="flex items-center justify-between pb-2 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center justify-center">2</span>
                <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Amortization Split & Schedule Generation</h3>
              </div>
              <div class="text-xs">
                Total Allocated:
                <span
                  class="font-bold px-2 py-0.5 rounded text-xs"
                  [ngClass]="totalPercentage() === 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'"
                >
                  {{ totalPercentage() }}% (Target: 100%)
                </span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Booking Money (%) <span class="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  [(ngModel)]="formData.booking_percent"
                  name="booking_percent"
                  min="0"
                  max="100"
                  step="0.5"
                  class="erp-input text-xs w-full"
                />
                <span class="text-[10px] text-slate-500 mt-1 block">Usually 10% in Bangladesh</span>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Down Payment (%) <span class="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  [(ngModel)]="formData.down_payment_percent"
                  name="down_payment_percent"
                  min="0"
                  max="100"
                  step="0.5"
                  class="erp-input text-xs w-full"
                />
                <span class="text-[10px] text-slate-500 mt-1 block">Usually 15% - 25% of sale price</span>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Installment Frequency <span class="text-rose-500">*</span>
                </label>
                <app-searchable-select
                  categoryCode="INSTALLMENT_FREQUENCY"
                  placeholder="Select Frequency"
                  [allowCreateNew]="true"
                  [(ngModel)]="formData.installment_frequency"
                  name="installment_frequency"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Installment Count (Number) <span class="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  [(ngModel)]="formData.installment_count"
                  name="installment_count"
                  min="1"
                  max="120"
                  class="erp-input text-xs w-full"
                />
                <span class="text-[10px] text-slate-500 mt-1 block">e.g. 24, 36 or 48 installments</span>
              </div>
            </div>
          </div>

          <!-- Step 3: Late Fee & Rebate Rules -->
          <div>
            <div class="flex items-center gap-2 pb-2 mb-4 border-b border-slate-200 dark:border-slate-800">
              <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center justify-center">3</span>
              <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Late Fee, Grace Period & Rebate Rules</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Grace Period (Days)
                </label>
                <input
                  type="number"
                  [(ngModel)]="formData.grace_period_days"
                  name="grace_period_days"
                  min="0"
                  max="60"
                  class="erp-input text-xs w-full"
                />
                <span class="text-[10px] text-slate-500 mt-1 block">Default 15 days in Bangladesh</span>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Late Fee Rule Type
                </label>
                <app-searchable-select
                  categoryCode="LATE_FEE_RULE"
                  placeholder="Percentage or Fixed"
                  [allowCreateNew]="true"
                  [(ngModel)]="formData.late_fee_type"
                  name="late_fee_type"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Late Fee Rate
                </label>
                <input
                  type="number"
                  [(ngModel)]="formData.late_fee_rate"
                  name="late_fee_rate"
                  min="0"
                  step="0.1"
                  class="erp-input text-xs w-full"
                />
                <span class="text-[10px] text-slate-500 mt-1 block">e.g. 2% monthly surcharge</span>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Early Payment Discount / Rebate (%)
                </label>
                <input
                  type="number"
                  [(ngModel)]="formData.early_discount_rate"
                  name="early_discount_rate"
                  min="0"
                  step="0.5"
                  class="erp-input text-xs w-full"
                />
                <span class="text-[10px] text-slate-500 mt-1 block">e.g. 5% rebate for upfront lump-sum</span>
              </div>
            </div>
          </div>

          <!-- Step 4: Terms, Conditions & Description -->
          <div>
            <div class="flex items-center gap-2 pb-2 mb-4 border-b border-slate-200 dark:border-slate-800">
              <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center justify-center">4</span>
              <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Terms, Conditions & Bangladesh Regulatory Notes</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description & Purpose</label>
                <textarea
                  [(ngModel)]="formData.description"
                  name="description"
                  rows="3"
                  placeholder="Detailed notes on who this payment plan applies to..."
                  class="erp-input text-xs w-full resize-y"
                ></textarea>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Terms & Default Conditions</label>
                <textarea
                  [(ngModel)]="formData.terms_conditions"
                  name="terms_conditions"
                  rows="3"
                  placeholder="Terms regarding dishonoured cheques, handover clearance, and statutory notices..."
                  class="erp-input text-xs w-full resize-y"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <app-button variant="outline" size="md" type="button" (btnClick)="navigateBack()">
              Cancel
            </app-button>
            <app-button variant="primary" size="md" type="submit" [loading]="isSubmitting()">
              {{ isEditMode ? 'Update Payment Plan' : 'Save & Activate Payment Plan' }}
            </app-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class PaymentSetupFormComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = false;
  planId: number | null = null;
  isSubmitting = signal<boolean>(false);

  formData: Partial<PaymentPlanConfig> = {
    plan_name: '',
    project_id: undefined,
    property_type: 'APARTMENT',
    description: '',
    booking_percent: 10.0,
    down_payment_percent: 20.0,
    installment_frequency: 'MONTHLY',
    installment_count: 36,
    grace_period_days: 15,
    late_fee_type: 'PERCENTAGE',
    late_fee_rate: 2.0,
    rebate_type: 'PERCENTAGE',
    rebate_rate: 0.0,
    early_discount_rate: 0.0,
    terms_conditions: 'All payments subject to clearing. Late surcharges apply after grace period under Bangladesh real estate standard contract.',
    approval_status: 'APPROVED',
    is_active: true
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.planId = Number(idParam);
      this.loadPlan(this.planId);
    }
  }

  loadPlan(id: number): void {
    this.installmentService.getPaymentPlan(id).subscribe({
      next: (plan) => {
        this.formData = { ...plan };
      }
    });
  }

  totalPercentage(): number {
    const booking = Number(this.formData.booking_percent || 0);
    const dp = Number(this.formData.down_payment_percent || 0);
    // installments make up the remaining percentage
    const remaining = 100 - (booking + dp);
    return Math.round((booking + dp + remaining) * 10) / 10;
  }

  savePlan(): void {
    if (!this.formData.plan_name) {
      alert('Please enter a plan name');
      return;
    }

    this.isSubmitting.set(true);

    if (this.isEditMode && this.planId) {
      this.installmentService.updatePaymentPlan(this.planId, this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.navigateBack();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          alert('Failed to update plan: ' + (err.error?.detail || err.message));
        }
      });
    } else {
      this.installmentService.createPaymentPlan(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.navigateBack();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          alert('Failed to create plan: ' + (err.error?.detail || err.message));
        }
      });
    }
  }

  navigateBack(): void {
    this.router.navigate(['/installments/payment-setup']);
  }
}
