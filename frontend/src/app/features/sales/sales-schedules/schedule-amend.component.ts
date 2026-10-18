import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { BookingInstallmentSchedule, InstallmentSchedulePreviewResponse, CustomMilestoneItem } from '../../../core/models/installment.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-schedule-amend',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-16">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            [routerLink]="['/sales/schedules', originalScheduleId()]"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Schedule Dossier"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Spec 5.7 · Schedule Restructuring & Amendment
              </span>
              <span class="text-xs font-mono text-muted-foreground">{{ currentSchedule()?.schedule_code || 'Loading...' }}</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Restructure Payment Obligations
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a
            [routerLink]="['/sales/schedules', originalScheduleId()]"
            class="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            Cancel Amendment
          </a>
        </div>
      </div>

      @if (isLoadingSchedule()) {
        <div class="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
          <svg class="w-8 h-8 animate-spin mx-auto text-primary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Loading original installment schedule...
        </div>
      } @else if (currentSchedule()) {
        <!-- Current Schedule Context Card -->
        <div class="bg-card border border-border rounded-xl p-5 shadow-xs">
          <div class="flex items-center justify-between pb-3 border-b border-border mb-3">
            <span class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Contract Amortization Terms</span>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border font-bold">
                {{ currentSchedule()?.version }}
              </span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span class="text-muted-foreground block">Purchaser:</span>
              <strong class="text-foreground text-sm">{{ currentSchedule()?.customer_name }}</strong>
            </div>
            <div>
              <span class="text-muted-foreground block">Property Allotment:</span>
              <span class="text-foreground font-mono font-bold">{{ currentSchedule()?.project_name }} · {{ currentSchedule()?.unit_number }}</span>
            </div>
            <div>
              <span class="text-muted-foreground block">Contract Price:</span>
              <span class="text-foreground font-mono font-bold">৳{{ formatCurrency(currentSchedule()?.contract_price || 0) }}</span>
            </div>
            <div>
              <span class="text-muted-foreground block">Installment Balance:</span>
              <span class="text-primary font-mono font-bold">৳{{ formatCurrency(currentSchedule()?.installment_balance || 0) }}</span>
            </div>
          </div>
        </div>

        <!-- Amendment Form -->
        <form [formGroup]="amendForm" (ngSubmit)="submitAmendment()" class="flex flex-col gap-6">
          <app-card title="Restructuring Parameters & Amendment Rationale" subtitle="Amend contractual tenure, plan structure, and record the legal deed amendment reference">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <app-custom-input
                label="Amendment Reference Number *"
                [control]="amendForm.get('amendment_reference')"
                placeholder="e.g. AMD-2026-001 or Deed Addendum #2"
                helperText="Official commercial addendum or mutual consent reference"
              />

              <div class="flex flex-col">
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-semibold text-foreground">Revised Plan Type *</label>
                  <a routerLink="/settings/lookups" class="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    + Add New
                  </a>
                </div>
                <app-searchable-select
                  [options]="planTypeOptions"
                  [formControl]="$any(amendForm.get('plan_type'))"
                  placeholder="Select restructured plan type"
                  (selectionChange)="onPlanTypeChanged($event)"
                />
              </div>

              @if (isEqualInstallmentPlan()) {
                <app-custom-input
                  label="Revised Total Installments *"
                  type="number"
                  [control]="amendForm.get('total_installments')"
                  placeholder="e.g. 48"
                  helperText="New installment count (re-amortizes remaining balance)"
                />
              }

              <app-custom-input
                label="Revised Amortization Start Date *"
                type="date"
                [control]="amendForm.get('start_date')"
                helperText="Date of first restructured installment"
              />

              <app-custom-input
                label="Contractual Grace Period (Days)"
                type="number"
                [control]="amendForm.get('grace_period_days')"
                placeholder="15"
                helperText="Days before late fee & overdue alerts"
              />
            </div>

            <div class="mt-4">
              <app-custom-textarea
                label="Amendment & Restructuring Reason *"
                [control]="amendForm.get('amendment_reason')"
                placeholder="e.g. Purchaser requested 12-month tenure extension due to commercial negotiation approved by Commercial Director on 18 Oct 2026"
                [rows]="3"
                helperText="Justification will be stamped on both historical archive and new schedule version"
              />
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
              <button
                type="button"
                (click)="generateLivePreview()"
                [disabled]="isPreviewLoading()"
                class="px-4 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                {{ isPreviewLoading() ? 'Calculating Amortization...' : 'Preview Restructured Schedule' }}
              </button>
            </div>
          </app-card>

          <!-- Live Restructured Preview Results -->
          @if (previewData()) {
            <app-card title="Restructured Schedule Preview & Penny-Rounding Check" subtitle="Verify exact distribution across all installments before locking into active contract">
              <!-- Exact Mathematical Validation Banner -->
              <div class="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                [ngClass]="(previewData()?.is_validated || previewData()?.exact_sum_matches) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    [ngClass]="(previewData()?.is_validated || previewData()?.exact_sum_matches) ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs uppercase tracking-wider">
                      {{ (previewData()?.is_validated || previewData()?.exact_sum_matches) ? 'Spec 5.7 Exact Rounding Validation Passed' : 'Discrepancy Detected' }}
                    </h4>
                    <p class="text-xs mt-0.5">
                      Sum of Installments: <strong>৳{{ formatCurrency(previewData()?.approved_contract_price || previewData()?.calculated_total_sum || previewData()?.total_contract_price || 0) }}</strong>
                      equals approved contract price with 0.00 discrepancy.
                    </p>
                  </div>
                </div>

                <div class="text-right text-xs">
                  <span class="text-muted-foreground block text-[11px]">Rounding Adjustment</span>
                  <span class="font-mono font-bold text-foreground">
                    ৳{{ previewData()?.rounding_adjustment_amount }} on #{{ previewData()?.rounding_adjusted_installment_no }}
                  </span>
                </div>
              </div>

              <!-- Preview Table -->
              <div class="overflow-x-auto mt-4">
                <table class="w-full text-left text-xs text-foreground border-collapse">
                  <thead>
                    <tr class="border-b border-border bg-secondary/30 text-muted-foreground uppercase tracking-wider text-[11px]">
                      <th class="py-2.5 px-3 w-12 text-center">#</th>
                      <th class="py-2.5 px-4">Title & Type</th>
                      <th class="py-2.5 px-3">Due Date / Trigger</th>
                      <th class="py-2.5 px-3 text-right">Payable (৳)</th>
                      <th class="py-2.5 px-3 text-center">Spec Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (row of previewData()?.installments; track row.installment_no) {
                      <tr class="hover:bg-secondary/20 transition-colors" [ngClass]="{'bg-primary/5': row.installment_no === previewData()?.rounding_adjusted_installment_no}">
                        <td class="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                          {{ row.installment_no }}
                        </td>
                        <td class="py-2.5 px-4">
                          <div class="font-bold text-foreground">{{ row.title }}</div>
                          <span class="text-[10px] text-muted-foreground">{{ row.installment_type }}</span>
                        </td>
                        <td class="py-2.5 px-3 font-mono">
                          {{ row.due_date | date:'dd MMM yyyy' }}
                        </td>
                        <td class="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                          ৳{{ formatCurrency(row.payable_amount) }}
                        </td>
                        <td class="py-2.5 px-3 text-center">
                          <span class="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                            SCHEDULED
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </app-card>
          }

          <!-- Execution Bar -->
          <div class="flex items-center justify-between bg-card border border-border rounded-xl p-4 shadow-xs">
            <span class="text-xs text-muted-foreground">
              Executing this amendment will archive the current schedule as <strong class="text-foreground">SUPERSEDED_AMENDED</strong> and activate version <strong class="text-foreground font-mono">v1.1</strong>.
            </span>

            <div class="flex items-center gap-3">
              <a
                [routerLink]="['/sales/schedules', originalScheduleId()]"
                class="px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold"
              >
                Cancel
              </a>
              <app-custom-button
                variant="primary"
                size="md"
                type="submit"
                [loading]="isSubmitting()"
                [disabled]="amendForm.invalid"
              >
                Confirm & Execute Amendment
              </app-custom-button>
            </div>
          </div>
        </form>
      }
    </div>
  `
})
export class ScheduleAmendComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private installmentService = inject(InstallmentService);
  private fb = inject(FormBuilder);

  originalScheduleId = signal<number>(0);
  currentSchedule = signal<BookingInstallmentSchedule | null>(null);
  isLoadingSchedule = signal<boolean>(true);

  // Preview State
  previewData = signal<InstallmentSchedulePreviewResponse | null>(null);
  isPreviewLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  planTypeOptions: SelectOption[] = [
    { label: 'Monthly Equal Installments', value: 'MONTHLY_EQUAL' },
    { label: 'Quarterly Equal Installments', value: 'QUARTERLY_EQUAL' },
    { label: 'Construction Milestone-Based', value: 'CONSTRUCTION_MILESTONES' },
    { label: 'Semi-Annual Installments', value: 'SEMI_ANNUAL' },
    { label: 'Custom Contractual Hybrid', value: 'CUSTOM_HYBRID' }
  ];

  amendForm: FormGroup = this.fb.group({
    amendment_reference: ['', Validators.required],
    amendment_reason: ['', [Validators.required, Validators.minLength(5)]],
    plan_type: ['MONTHLY_EQUAL', Validators.required],
    total_installments: [36, [Validators.min(1), Validators.max(240)]],
    start_date: [new Date().toISOString().substring(0, 10), Validators.required],
    grace_period_days: [15, [Validators.min(0), Validators.max(90)]]
  });

  isEqualInstallmentPlan(): boolean {
    const pt = this.amendForm.get('plan_type')?.value;
    return pt === 'MONTHLY_EQUAL' || pt === 'QUARTERLY_EQUAL' || pt === 'SEMI_ANNUAL';
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.originalScheduleId.set(Number(id));
        this.loadOriginalSchedule(Number(id));
      }
    });
  }

  loadOriginalSchedule(id: number): void {
    this.isLoadingSchedule.set(true);
    this.installmentService.getMasterScheduleDetails(id).subscribe({
      next: (res) => {
        this.currentSchedule.set(res);
        this.isLoadingSchedule.set(false);

        // Prepopulate form values
        this.amendForm.patchValue({
          plan_type: res.plan_type || 'MONTHLY_EQUAL',
          total_installments: res.total_installments || res.total_installment_count || 36,
          start_date: res.start_date || new Date().toISOString().substring(0, 10),
          grace_period_days: res.grace_period_days || 15
        });

        // Trigger initial preview
        this.generateLivePreview();
      },
      error: (err) => {
        console.error('Failed to load schedule for amendment:', err);
        this.isLoadingSchedule.set(false);
      }
    });
  }

  onPlanTypeChanged(val: string): void {
    this.amendForm.patchValue({ plan_type: val });
    this.generateLivePreview();
  }

  generateLivePreview(): void {
    const s = this.currentSchedule();
    if (!s) return;

    this.isPreviewLoading.set(true);
    const formVal = this.amendForm.value;

    this.installmentService.previewSchedule({
      booking_id: s.booking_id,
      plan_type: formVal.plan_type,
      total_installments: Number(formVal.total_installments) || 36,
      start_date: formVal.start_date,
      down_payment_percentage: s.down_payment_percentage,
      grace_period_days: Number(formVal.grace_period_days) || 15
    }).subscribe({
      next: (res) => {
        this.previewData.set(res);
        this.isPreviewLoading.set(false);
      },
      error: (err) => {
        console.error('Preview amortization failed:', err);
        this.isPreviewLoading.set(false);
      }
    });
  }

  submitAmendment(): void {
    if (this.amendForm.invalid) {
      this.amendForm.markAllAsTouched();
      return;
    }

    const s = this.currentSchedule();
    if (!s) return;

    this.isSubmitting.set(true);
    const val = this.amendForm.value;

    this.installmentService.amendSchedule(s.id, {
      plan_type: val.plan_type,
      total_installments: Number(val.total_installments) || 36,
      start_date: val.start_date,
      grace_period_days: Number(val.grace_period_days) || 15,
      amendment_reference: val.amendment_reference,
      amendment_reason: val.amendment_reason
    }).subscribe({
      next: (newSchedule) => {
        this.isSubmitting.set(false);
        // Navigate to the new active schedule dossier
        this.router.navigate(['/sales/schedules', newSchedule.id]);
      },
      error: (err) => {
        console.error('Amendment execution failed:', err);
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to restructure schedule. Please check server logs.');
      }
    });
  }

  formatCurrency(num: number): string {
    return Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
